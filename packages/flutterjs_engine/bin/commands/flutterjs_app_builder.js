/**
 * ============================================================================
 * FlutterJS App Builder - Runtime Application Construction
 * ============================================================================
 * 
 * Bridges gap between:
 * 1. Analyzer output (widget registry, imports, metadata)
 * 2. Transformed code (rewritten imports, injected metadata)
 * 3. Runtime execution (VNode building, state management)
 * 
 * Responsibilities:
 * - Load and validate widget definitions
 * - Create build context with services
 * - Execute widget.build() methods safely
 * - Manage state lifecycle
 * - Handle hydration (SSR → CSR)
 * - Convert Flutter widgets to VNodes
 * - Inject runtime hooks for hot reload
 * 
 * Location: cli/runtime/app_builder.js
 * 
 * Usage:
 * ```javascript
 * import { AppBuilder } from './app_builder.js';
 * 
 * const builder = new AppBuilder(analysisMetadata);
 * const app = await builder.build();
 * ```
 */

import { VNodeBuilder } from './vnode_builder.js';
import { StyleConverter } from './style_converter.js';

// ============================================================================
// WIDGET REGISTRY & DEFINITIONS
// ============================================================================

/**
 * Registry of all available widgets and their implementations
 */
class WidgetRegistry {
  constructor() {
    this.widgets = new Map();
    this.stateManagers = new Map();
    this.converters = new Map();
  }

  /**
   * Register a widget class
   */
  registerWidget(name, WidgetClass) {
    if (!WidgetClass) {
      throw new Error(`Cannot register widget "${name}": class is null/undefined`);
    }

    this.widgets.set(name, {
      name,
      WidgetClass,
      isStateful: this.isStatefulWidget(WidgetClass),
      isMaterial: name.startsWith('Material') || name.startsWith('Cupertino'),
      registeredAt: new Date().toISOString()
    });

    console.log(`[Registry] âœ" Registered widget: ${name}`);
  }

  /**
   * Register a state manager for StatefulWidget
   */
  registerStateManager(widgetName, StateClass) {
    this.stateManagers.set(widgetName, StateClass);
  }

  /**
   * Register a value converter (Dart type → JS)
   */
  registerConverter(dartType, converterFn) {
    this.converters.set(dartType, converterFn);
  }

  /**
   * Get widget definition
   */
  getWidget(name) {
    if (!this.widgets.has(name)) {
      throw new Error(`Widget not found: ${name}\n` +
        `Available: ${Array.from(this.widgets.keys()).slice(0, 5).join(', ')}...`);
    }
    return this.widgets.get(name);
  }

  /**
   * Get state manager for widget
   */
  getStateManager(widgetName) {
    return this.stateManagers.get(widgetName);
  }

  /**
   * Check if widget is stateful
   */
  isStatefulWidget(WidgetClass) {
    return WidgetClass.prototype.createState !== undefined ||
           WidgetClass.prototype.state !== undefined;
  }

  /**
   * List all registered widgets
   */
  listWidgets() {
    return Array.from(this.widgets.values());
  }

  /**
   * Get registry stats
   */
  getStats() {
    return {
      totalWidgets: this.widgets.size,
      statefulWidgets: Array.from(this.widgets.values())
        .filter(w => w.isStateful).length,
      stateManagers: this.stateManagers.size,
      converters: this.converters.size
    };
  }
}

// ============================================================================
// BUILD CONTEXT - Runtime Environment for Widgets
// ============================================================================

/**
 * Build context provided to widget.build() methods
 * Equivalent to Flutter's BuildContext
 */
class BuildContext {
  constructor(options = {}) {
    this.widgetTree = options.widgetTree || [];
    this.services = options.services || new Map();
    this.stateManager = options.stateManager;
    this.eventBus = options.eventBus;
    this.mediaQuery = options.mediaQuery || this.getDefaultMediaQuery();
    this.theme = options.theme || this.getDefaultTheme();
    this.navigator = options.navigator;
    this.locale = options.locale || 'en-US';
    this.mounted = true;
    this._dependentWidgets = new Set();
  }

  /**
   * Get default media query
   */
  getDefaultMediaQuery() {
    if (typeof window === 'undefined') {
      // Server-side defaults
      return {
        size: { width: 1920, height: 1080 },
        devicePixelRatio: 1,
        orientation: 'portrait',
        isLandscape: false,
        isPortrait: true
      };
    }

    // Browser
    const isLandscape = window.innerWidth > window.innerHeight;
    return {
      size: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: isLandscape ? 'landscape' : 'portrait',
      isLandscape,
      isPortrait: !isLandscape
    };
  }

  /**
   * Get default Material Design 3 theme
   */
  getDefaultTheme() {
    return {
      primaryColor: '#6750a4',
      onPrimary: '#ffffff',
      primaryContainer: '#eaddff',
      onPrimaryContainer: '#21005e',
      secondaryColor: '#625b71',
      onSecondary: '#ffffff',
      tertiaryColor: '#7d5260',
      onTertiary: '#ffffff',
      errorColor: '#b3261e',
      onError: '#ffffff',
      backgroundColor: '#fffbfe',
      onBackground: '#1c1b1f',
      surfaceColor: '#fffbfe',
      onSurface: '#1c1b1f',
      outlineColor: '#79747e',
      outlineVariantColor: '#cac7cf',
      scrimColor: '#000000',
      brightness: 'light'
    };
  }

  /**
   * Get service by name
   */
  getService(serviceName) {
    return this.services.get(serviceName);
  }

  /**
   * Register service dependency
   */
  registerService(name, service) {
    this.services.set(name, service);
  }

  /**
   * Inherited widget pattern - find ancestor of type
   */
  findAncestorWidgetOfExactType(WidgetType) {
    for (const widget of this.widgetTree) {
      if (widget.constructor === WidgetType) {
        return widget;
      }
    }
    return null;
  }

  /**
   * Mark widget as dependent (for inherited widget changes)
   */
  dependOnInheritedWidgetOfExactType(WidgetType) {
    this._dependentWidgets.add(WidgetType);
    return this.findAncestorWidgetOfExactType(WidgetType);
  }

  /**
   * Check if mounted
   */
  isMounted() {
    return this.mounted;
  }

  /**
   * Unmount context
   */
  unmount() {
    this.mounted = false;
  }
}

// ============================================================================
// STATE LIFECYCLE MANAGER
// ============================================================================

/**
 * Manages stateful widget lifecycle and state updates
 */
class StateLifecycleManager {
  constructor(stateInstance, context) {
    this.state = stateInstance;
    this.context = context;
    this.mounted = false;
    this.dirty = false;
    this.didUpdateWidget = false;
    this.frameToken = null;
  }

  /**
   * Initialize state (call initState)
   */
  async initState() {
    if (this.mounted) {
      console.warn('[Lifecycle] initState called on already initialized state');
      return;
    }

    console.log('[Lifecycle] Calling initState()');

    if (typeof this.state.initState === 'function') {
      try {
        await this.state.initState();
      } catch (error) {
        console.error('[Lifecycle] Error in initState:', error);
        throw error;
      }
    }

    this.mounted = true;
  }

  /**
   * Handle widget property changes (call didUpdateWidget)
   */
  async didUpdateWidget(oldWidget) {
    console.log('[Lifecycle] Calling didUpdateWidget()');

    if (typeof this.state.didUpdateWidget === 'function') {
      try {
        await this.state.didUpdateWidget(oldWidget);
      } catch (error) {
        console.error('[Lifecycle] Error in didUpdateWidget:', error);
        throw error;
      }
    }

    this.didUpdateWidget = true;
  }

  /**
   * Call build method
   */
  build(context) {
    if (!this.mounted) {
      throw new Error('Cannot build: state not initialized');
    }

    console.log('[Lifecycle] Calling build()');

    if (typeof this.state.build !== 'function') {
      throw new Error('State must implement build() method');
    }

    try {
      const widget = this.state.build(context);
      this.dirty = false;
      return widget;
    } catch (error) {
      console.error('[Lifecycle] Error in build:', error);
      throw error;
    }
  }

  /**
   * Mark as needing rebuild
   */
  markNeedsBuild() {
    this.dirty = true;
  }

  /**
   * Clean up (call dispose)
   */
  async dispose() {
    console.log('[Lifecycle] Calling dispose()');

    if (typeof this.state.dispose === 'function') {
      try {
        await this.state.dispose();
      } catch (error) {
        console.error('[Lifecycle] Error in dispose:', error);
        throw error;
      }
    }

    this.mounted = false;
  }
}

// ============================================================================
// MAIN APP BUILDER CLASS
// ============================================================================

export class AppBuilder {
  constructor(analysisMetadata = {}, runtimeConfig = {}) {
    // Analysis metadata from analyzer
    this.metadata = {
      widgets: analysisMetadata.widgets || [],
      imports: analysisMetadata.imports || [],
      stateClasses: analysisMetadata.stateClasses || [],
      runtimeRequirements: analysisMetadata.runtimeRequirements || {},
      ...analysisMetadata
    };

    // Runtime configuration
    this.config = {
      debugMode: runtimeConfig.debugMode || false,
      enableHotReload: runtimeConfig.enableHotReload !== false,
      enableStateTracking: runtimeConfig.enableStateTracking !== false,
      enablePerformanceTracking: runtimeConfig.enablePerformanceTracking !== false,
      mode: runtimeConfig.mode || 'csr', // csr, ssr, hybrid
      target: runtimeConfig.target || 'web',
      ...runtimeConfig
    };

    // Core components
    this.registry = new WidgetRegistry();
    this.stateInstances = new Map();
    this.buildContexts = new Map();
    this.lifecycleManagers = new Map();
    this.importedModules = new Map();

    // Root widget
    this.rootWidget = null;
    this.rootVNode = null;

    // Performance tracking
    this.stats = {
      widgetsInstantiated: 0,
      statesCreated: 0,
      buildsExecuted: 0,
      vnodeConversions: 0,
      totalBuildTime: 0,
      averageBuildTime: 0
    };

    // Error handling
    this.errors = [];
    this.warnings = [];

    if (this.config.debugMode) {
      console.log('[AppBuilder] Initialized', {
        widgets: this.metadata.widgets.length,
        imports: this.metadata.imports.length,
        mode: this.config.mode
      });
    }
  }

  /**
   * Load widget modules (imported from packages)
   */
  async loadModules(moduleMap) {
    console.log('[AppBuilder] Loading modules...');

    try {
      for (const [moduleName, moduleData] of Object.entries(moduleMap || {})) {
        // Import module dynamically
        try {
          const module = await import(moduleData.path);
          this.importedModules.set(moduleName, module);

          // Register widgets from module
          if (module.widgets) {
            for (const [widgetName, WidgetClass] of Object.entries(module.widgets)) {
              this.registry.registerWidget(widgetName, WidgetClass);
            }
          }

          console.log(`[AppBuilder] âœ" Loaded module: ${moduleName}`);
        } catch (error) {
          this.warnings.push(`Could not load module ${moduleName}: ${error.message}`);
          console.warn(`[AppBuilder] âš  Failed to load ${moduleName}: ${error.message}`);
        }
      }

      if (this.config.debugMode) {
        console.log('[AppBuilder] Module loading complete', this.registry.getStats());
      }
    } catch (error) {
      this.errors.push(`Module loading failed: ${error.message}`);
      throw new Error(`Failed to load modules: ${error.message}`);
    }
  }

  /**
   * Register built-in Flutter widgets
   */
  registerBuiltInWidgets() {
    console.log('[AppBuilder] Registering built-in widgets...');

    // These would come from @flutterjs/material and @flutterjs/core packages
    const builtInWidgets = {
      // Base widgets
      'Widget': class Widget { },
      'StatelessWidget': class StatelessWidget { },
      'StatefulWidget': class StatefulWidget { },
      'State': class State { },

      // Material widgets
      'Container': class Container {
        constructor(props = {}) {
          this.props = props;
        }
        build(context) {
          return this; // Would convert to VNode
        }
      },
      'Text': class Text {
        constructor(text, props = {}) {
          this.text = text;
          this.props = props;
        }
        build(context) {
          return this;
        }
      },
      'Column': class Column {
        constructor(props = {}) {
          this.props = props;
          this.children = props.children || [];
        }
        build(context) {
          return this;
        }
      },
      'Row': class Row {
        constructor(props = {}) {
          this.props = props;
          this.children = props.children || [];
        }
        build(context) {
          return this;
        }
      },
      'Center': class Center {
        constructor(props = {}) {
          this.props = props;
          this.child = props.child;
        }
        build(context) {
          return this;
        }
      },
      'ElevatedButton': class ElevatedButton {
        constructor(props = {}) {
          this.props = props;
          this.onPressed = props.onPressed;
          this.child = props.child;
        }
        build(context) {
          return this;
        }
      },
      'Scaffold': class Scaffold {
        constructor(props = {}) {
          this.props = props;
          this.appBar = props.appBar;
          this.body = props.body;
          this.floatingActionButton = props.floatingActionButton;
        }
        build(context) {
          return this;
        }
      },
      'AppBar': class AppBar {
        constructor(props = {}) {
          this.props = props;
          this.title = props.title;
          this.actions = props.actions || [];
        }
        build(context) {
          return this;
        }
      },
      'Icon': class Icon {
        constructor(iconData, props = {}) {
          this.iconData = iconData;
          this.props = props;
        }
        build(context) {
          return this;
        }
      }
    };

    // Register all built-in widgets
    for (const [name, WidgetClass] of Object.entries(builtInWidgets)) {
      try {
        this.registry.registerWidget(name, WidgetClass);
      } catch (error) {
        console.warn(`[AppBuilder] Failed to register ${name}: ${error.message}`);
      }
    }

    if (this.config.debugMode) {
      console.log('[AppBuilder]', this.registry.getStats());
    }
  }

  /**
   * Create an instance of a widget
   */
  createWidgetInstance(widgetName, props = {}) {
    const startTime = performance.now();

    try {
      const widgetDef = this.registry.getWidget(widgetName);

      // Instantiate widget class
      const widget = new widgetDef.WidgetClass(props);
      this.stats.widgetsInstantiated++;

      if (this.config.debugMode) {
        console.log(`[AppBuilder] âœ" Created widget: ${widgetName}`);
      }

      return widget;
    } catch (error) {
      this.errors.push(`Cannot instantiate widget ${widgetName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create state instance for StatefulWidget
   */
  createState(statefulWidget) {
    const startTime = performance.now();

    try {
      let stateInstance;

      // Call createState() method if available
      if (typeof statefulWidget.createState === 'function') {
        stateInstance = statefulWidget.createState();
      } else {
        // Fallback: create generic state
        stateInstance = {
          widget: statefulWidget,
          state: {},
          setState: (updates) => {
            Object.assign(this.state, updates);
          },
          build: (context) => {
            return statefulWidget;
          }
        };
      }

      // Store state instance
      const stateId = `state_${Date.now()}_${Math.random()}`;
      this.stateInstances.set(stateId, stateInstance);
      this.stats.statesCreated++;

      if (this.config.debugMode) {
        console.log(`[AppBuilder] âœ" Created state: ${stateId}`);
      }

      return { stateId, stateInstance };
    } catch (error) {
      this.errors.push(`Cannot create state: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build widget tree with lifecycle management
   */
  async buildWidget(widget, context = null) {
    const startTime = performance.now();

    try {
      // Create context if not provided
      if (!context) {
        context = new BuildContext({
          services: this.getDefaultServices(),
          stateManager: this
        });
      }

      // Check if stateful
      const isStateful = this.registry.isStatefulWidget(widget.constructor);

      if (isStateful) {
        // Create state and manage lifecycle
        const { stateId, stateInstance } = this.createState(widget);

        // Create lifecycle manager
        const lifecycleManager = new StateLifecycleManager(stateInstance, context);
        this.lifecycleManagers.set(stateId, lifecycleManager);

        // Initialize state
        await lifecycleManager.initState();

        // Build widget from state
        const builtWidget = lifecycleManager.build(context);
        this.stats.buildsExecuted++;

        return builtWidget;
      } else {
        // Stateless widget - just call build
        if (typeof widget.build !== 'function') {
          throw new Error(`Widget ${widget.constructor.name} must implement build(context)`);
        }

        const builtWidget = widget.build(context);
        this.stats.buildsExecuted++;

        return builtWidget;
      }
    } catch (error) {
      this.errors.push(`Build failed: ${error.message}`);
      throw error;
    } finally {
      const buildTime = performance.now() - startTime;
      this.stats.totalBuildTime += buildTime;
      this.stats.averageBuildTime = this.stats.totalBuildTime / this.stats.buildsExecuted;
    }
  }

  /**
   * Convert Flutter widget tree to VNode tree
   */
  async buildVNodeTree(widget, context = null) {
    console.log('[AppBuilder] Building VNode tree...');

    try {
      // First build the widget tree with proper lifecycle
      const builtWidget = await this.buildWidget(widget, context);

      // Then convert to VNode
      const vnode = await VNodeBuilder.build(builtWidget, context);
      this.stats.vnodeConversions++;

      this.rootVNode = vnode;

      if (this.config.debugMode) {
        console.log('[AppBuilder] âœ" VNode tree created');
      }

      return vnode;
    } catch (error) {
      this.errors.push(`VNode conversion failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Main build method - orchestrates entire process
   */
  async build(rootWidgetClass) {
    console.log('[AppBuilder] Starting application build...');

    try {
      // Step 1: Register built-in widgets
      this.registerBuiltInWidgets();

      // Step 2: Create root widget instance
      console.log('[AppBuilder] Creating root widget...');
      this.rootWidget = new rootWidgetClass();

      // Step 3: Create build context
      const context = new BuildContext({
        services: this.getDefaultServices()
      });

      // Step 4: Build full widget tree to VNodes
      console.log('[AppBuilder] Converting to VNode tree...');
      await this.buildVNodeTree(this.rootWidget, context);

      // Step 5: Handle hydration if needed
      if (this.config.mode === 'hybrid' || this.config.mode === 'ssr') {
        await this.prepareForHydration();
      }

      if (this.config.debugMode) {
        this.printStats();
      }

      return {
        success: true,
        rootWidget: this.rootWidget,
        rootVNode: this.rootVNode,
        stats: this.stats,
        context
      };
    } catch (error) {
      console.error('[AppBuilder] Build failed:', error);
      throw error;
    }
  }

  /**
   * Get default services for build context
   */
  getDefaultServices() {
    return new Map([
      ['theme', {
        primaryColor: '#6750a4',
        backgroundColor: '#fffbfe',
        textColor: '#1c1b1f'
      }],
      ['mediaQuery', {
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080
      }],
      ['logger', {
        log: (msg) => console.log(msg),
        warn: (msg) => console.warn(msg),
        error: (msg) => console.error(msg)
      }]
    ]);
  }

  /**
   * Prepare for SSR → CSR hydration
   */
  async prepareForHydration() {
    console.log('[AppBuilder] Preparing hydration metadata...');

    const hydrationData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      rootVNodeHash: this.rootVNode ? this.hashVNode(this.rootVNode) : null,
      stateSnapshots: this.captureStateSnapshots(),
      widgetRegistry: this.registry.getStats()
    };

    // Store in window for client to pick up
    if (typeof window !== 'undefined') {
      window.__FLUTTERJS_HYDRATION_DATA__ = hydrationData;
    }

    return hydrationData;
  }

  /**
   * Hash VNode for integrity checking
   */
  hashVNode(vnode) {
    const json = JSON.stringify(vnode);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Capture state snapshots for hydration
   */
  captureStateSnapshots() {
    const snapshots = {};

    for (const [stateId, stateInstance] of this.stateInstances) {
      snapshots[stateId] = {
        state: stateInstance.state || {},
        props: stateInstance.widget?.props || {}
      };
    }

    return snapshots;
  }

  /**
   * Print build statistics
   */
  printStats() {
    console.log('\n[AppBuilder] Build Statistics:');
    console.log(`  Widgets Instantiated: ${this.stats.widgetsInstantiated}`);
    console.log(`  States Created: ${this.stats.statesCreated}`);
    console.log(`  Builds Executed: ${this.stats.buildsExecuted}`);
    console.log(`  VNode Conversions: ${this.stats.vnodeConversions}`);
    console.log(`  Total Build Time: ${this.stats.totalBuildTime.toFixed(2)}ms`);
    console.log(`  Average Build Time: ${this.stats.averageBuildTime.toFixed(2)}ms`);

    if (this.errors.length > 0) {
      console.log(`\n  ⚠ Errors: ${this.errors.length}`);
      this.errors.forEach(err => console.log(`    - ${err}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n  ⚠ Warnings: ${this.warnings.length}`);
      this.warnings.forEach(warn => console.log(`    - ${warn}`));
    }

    console.log();
  }

  /**
   * Get build result
   */
  getResult() {
    return {
      rootVNode: this.rootVNode,
      stats: this.stats,
      errors: this.errors,
      warnings: this.warnings,
      isSuccess: this.errors.length === 0
    };
  }

  /**
   * Dispose and cleanup
   */
  async dispose() {
    console.log('[AppBuilder] Cleaning up...');

    // Dispose all lifecycle managers
    for (const [stateId, manager] of this.lifecycleManagers) {
      await manager.dispose();
    }

    this.stateInstances.clear();
    this.lifecycleManagers.clear();
    this.buildContexts.clear();
    this.importedModules.clear();

    this.rootWidget = null;
    this.rootVNode = null;

    console.log('[AppBuilder] âœ" Cleanup complete');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { BuildContext, StateLifecycleManager, WidgetRegistry };