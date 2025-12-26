
/**
 * AppBridge - The central orchestrator
 * 
 * Coordinates the entire widget lifecycle:
 * 1. Load analysis metadata
 * 2. Import user widget classes
 * 3. Instantiate root widget
 * 4. Create BuildContext
 * 5. Call widget.build(context)
 * 6. Convert output to VNode tree
 * 7. Render VNodes to DOM
 * 8. Handle state updates
 */
class AppBridge {
  constructor(analysisMetadata, runtimeOptions = {}) {
    if (!analysisMetadata) {
      throw new Error('AppBridge requires analysis metadata');
    }

    this.metadata = analysisMetadata;
    this.options = {
      debugMode: runtimeOptions.debugMode || false,
      enableHotReload: runtimeOptions.enableHotReload !== false,
      mode: runtimeOptions.mode || 'csr',
      target: runtimeOptions.target || 'web',
      ...runtimeOptions
    };

    // Core systems
    this.stateManager = new StateManager(this);
    this.widgetClasses = new Map();
    this.stateInstances = new Map();

    // Build state
    this.buildContext = null;
    this.rootWidget = null;
    this.rootVNode = null;
    this.rootElement = null;

    // Services
    this.services = new Map();
    this.setupServices();

    if (this.options.debugMode) {
      console.log('[AppBridge] ✓ Created');
    }
  }

  /**
   * Setup framework services (Theme, Navigator, MediaQuery)
   */
  setupServices() {
    // Material Design 3 Theme
    this.services.set('theme', {
      primaryColor: '#6750a4',
      onPrimary: '#ffffff',
      primaryContainer: '#eaddff',
      onPrimaryContainer: '#21005e',
      secondary: '#625b71',
      onSecondary: '#ffffff',
      secondaryContainer: '#e8def8',
      tertiary: '#7d5260',
      onTertiary: '#ffffff',
      error: '#b3261e',
      onError: '#ffffff',
      outline: '#79747e',
      background: '#fffbfe',
      onBackground: '#1c1b1f',
      surface: '#fffbfe',
      onSurface: '#1c1b1f',
      inversePrimary: '#d0bcff'
    });

    // MediaQuery service
    this.services.set('mediaQuery', {
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1
    });

    // Navigator service
    this.services.set('navigator', {
      push: (route) => {
        if (this.options.debugMode) {
          console.log('[AppBridge] Navigation to:', route);
        }
      },
      pop: () => {
        if (this.options.debugMode) {
          console.log('[AppBridge] Navigation back');
        }
      }
    });

    if (this.options.debugMode) {
      console.log('[AppBridge] ✓ Services initialized');
    }
  }

  /**
   * Register widget classes from main.js
   */
  registerWidgets(widgetExports) {
    if (!widgetExports || typeof widgetExports !== 'object') {
      throw new Error('Widget exports must be an object');
    }

    let count = 0;
    for (const [className, WidgetClass] of Object.entries(widgetExports)) {
      if (typeof WidgetClass === 'function' && className !== 'listCast' && className !== 'mapCast' && className !== 'typeAssertion') {
        this.widgetClasses.set(className, WidgetClass);
        count++;

        if (this.options.debugMode) {
          console.log(`[AppBridge] ✓ Registered: ${className}`);
        }
      }
    }

    if (this.options.debugMode) {
      console.log(`[AppBridge] ✓ Total widgets registered: ${count}`);
    }
  }

  /**
   * Main build process - Transform widgets to VNode tree
   */
  async build(RootWidgetClass = null) {
    if (this.options.debugMode) {
      console.log('[AppBridge] Starting build...');
    }

    try {
      // Step 1: Get root widget class
      if (!RootWidgetClass) {
        const rootName = this.metadata.rootWidget || 'MyApp';
        RootWidgetClass = this.widgetClasses.get(rootName);

        if (!RootWidgetClass) {
          throw new Error(
            `Root widget "${rootName}" not found. Available: ${Array.from(this.widgetClasses.keys()).join(', ')}`
          );
        }
      }

      if (this.options.debugMode) {
        console.log(`[AppBridge] Root widget: ${RootWidgetClass.name}`);
      }

      // Step 2: Instantiate root widget
      this.rootWidget = new RootWidgetClass();

      // Step 3: Create BuildContext
      this.buildContext = new BuildContext(
        null,
        this,
        {
          theme: this.services.get('theme'),
          mediaQuery: this.services.get('mediaQuery'),
          navigator: this.services.get('navigator')
        }
      );

      if (this.options.debugMode) {
        console.log('[AppBridge] ✓ BuildContext created');
      }

      // Step 4: Build widget tree
      const widgetTree = this.buildWidget(this.rootWidget, this.buildContext);

      // Step 5: Convert to VNode
      this.rootVNode = VNodeBuilder.build(widgetTree, this.buildContext);

      // Count stats
      const vnodeCount = this.countVNodes(this.rootVNode);
      const vnodeDepth = this.getVNodeDepth(this.rootVNode);

      if (this.options.debugMode) {
        console.log('[AppBridge] ✓ Build complete');
        console.log(`[AppBridge] VNodes: ${vnodeCount}, Depth: ${vnodeDepth}`);
      }

      return {
        success: true,
        rootWidget: this.rootWidget,
        rootVNode: this.rootVNode,
        stats: {
          widgetsInstantiated: 1,
          statesCreated: this.stateInstances.size,
          vnodeCount,
          vnodeDepth
        }
      };

    } catch (error) {
      console.error('[AppBridge] ✗ Build failed:', error.message);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Build a single widget (handles Stateless & Stateful)
   */
  buildWidget(widget, context) {
    if (!widget) return null;

    // StatefulWidget - create state
    if (typeof widget.createState === 'function') {
      const state = widget.createState();

      if (!state) {
        throw new Error(`${widget.constructor.name}.createState() returned null`);
      }

      // Link state to widget
      state._widget = widget;
      state._mounted = true;

      // Initialize state
      if (typeof state.initState === 'function') {
        try {
          state.initState();
        } catch (error) {
          console.warn('[AppBridge] initState error:', error.message);
        }
      }

      // Register state
      const stateId = `state_${this.stateInstances.size}`;
      this.stateInstances.set(stateId, state);
      this.stateManager.register(state, { id: stateId });

      // Store bridge reference for setState
      state._bridge = this;

      // Build using state
      if (typeof state.build === 'function') {
        return state.build(context);
      }
    }

    // StatelessWidget - just build
    if (typeof widget.build === 'function') {
      return widget.build(context);
    }

    return widget;
  }

  /**
   * Render VNode tree to DOM
   */
  async renderToDOM(rootElement) {
    if (!rootElement) {
      throw new Error('Root element required for rendering');
    }

    if (!this.rootVNode) {
      throw new Error('Must call build() before rendering');
    }

    if (this.options.debugMode) {
      console.log('[AppBridge] Rendering to DOM...');
    }

    try {
      this.rootElement = rootElement;

      // Render VNode tree
      VNodeRenderer.render(this.rootVNode, rootElement, { clear: true });

      // Mark as ready
      rootElement.setAttribute('data-app-ready', 'true');

      if (this.options.debugMode) {
        console.log('[AppBridge] ✓ Rendered to DOM');
      }

      return { success: true };

    } catch (error) {
      console.error('[AppBridge] ✗ Rendering failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Full pipeline: Build + Render
   */
  async initialize(rootElement, RootWidgetClass = null) {
    if (this.options.debugMode) {
      console.log('[AppBridge] ====== INITIALIZATION START ======');
    }

    const startTime = performance.now();

    try {
      // Build widget tree
      const buildResult = await this.build(RootWidgetClass);
      if (!buildResult.success) {
        throw new Error(buildResult.error);
      }

      // Render to DOM
      const renderResult = await this.renderToDOM(rootElement);
      if (!renderResult.success) {
        throw new Error(renderResult.error);
      }

      const duration = performance.now() - startTime;

      const result = {
        success: true,
        duration: duration.toFixed(2),
        stats: {
          ...buildResult.stats,
          renderTime: duration
        }
      };

      if (this.options.debugMode) {
        console.log('[AppBridge] ====== INITIALIZATION COMPLETE ======');
        console.log(`[AppBridge] Total time: ${duration.toFixed(2)}ms`);
      }

      return result;

    } catch (error) {
      console.error('[AppBridge] ✗ Initialization failed:', error.message);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Handle state updates (called from setState)
   */
  async handleStateUpdate(state) {
    if (this.options.debugMode) {
      console.log('[AppBridge] State updated, rebuilding...');
    }

    try {
      // Rebuild widget tree
      const widgetTree = this.buildWidget(this.rootWidget, this.buildContext);

      // Convert to new VNode
      const newVNode = VNodeBuilder.build(widgetTree, this.buildContext);
      this.rootVNode = newVNode;

      // Re-render
      if (this.rootElement) {
        VNodeRenderer.render(newVNode, this.rootElement, { clear: true });
      }

      if (this.options.debugMode) {
        console.log('[AppBridge] ✓ State update rendered');
      }

      return { success: true };

    } catch (error) {
      console.error('[AppBridge] ✗ State update failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Count VNodes in tree
   */
  countVNodes(vnode, count = 0) {
    if (!vnode) return count;

    if (Array.isArray(vnode)) {
      return vnode.reduce((c, v) => this.countVNodes(v, c), count);
    }

    if (vnode && vnode.tag) {
      count++;
      if (vnode.children) {
        count = vnode.children.reduce((c, v) => this.countVNodes(v, c), count);
      }
    }

    return count;
  }

  /**
   * Helper: Get VNode tree depth
   */
  getVNodeDepth(vnode, depth = 0) {
    if (!vnode || !vnode.tag) return depth;

    if (!vnode.children || vnode.children.length === 0) {
      return depth + 1;
    }

    const childDepths = vnode.children
      .filter(child => child && typeof child === 'object')
      .map(child => this.getVNodeDepth(child, depth + 1));

    return Math.max(...childDepths, depth + 1);
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stateManager.clear();
    this.widgetClasses.clear();
    this.stateInstances.clear();
    this.services.clear();

    this.rootWidget = null;
    this.rootVNode = null;
    this.rootElement = null;
  }
}

/**
 * Global initialization function
 * Called from app.js
 */
async function initializeApp(analysisMetadata, widgetExports, options = {}) {
  if (!analysisMetadata) {
    throw new Error('Analysis metadata required');
  }

  if (!widgetExports) {
    throw new Error('Widget exports required');
  }

  console.log('[initializeApp] Starting app initialization...');

  // Create bridge
  const bridge = new AppBridge(analysisMetadata, options);

  // Register widgets
  bridge.registerWidgets(widgetExports);

  // Get root element
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element #root not found');
  }

  // Initialize
  const result = await bridge.initialize(rootElement);

  // Store globally
  window.__flutterjs_app_bridge__ = bridge;

  return result;
}

// Export
export { AppBridge, initializeApp, VNodeBuilder, VNodeRenderer, BuildContext, StateManager };