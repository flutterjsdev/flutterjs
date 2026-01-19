/**
 * FlutterJS Runtime - Complete Integration Layer
 * 
 * FIXED: All 3 VNodeRenderer.render() calls now properly instantiate the class
 */

import { VNode } from './vnode.js';
import { VNodeBuilder } from './vnode_builder.js';
import { StyleConverter } from './style_converter.js';
import { VNodeRenderer } from './vnode_renderer.js';
import { SSRRenderer } from './ssr_renderer.js';
import { RenderEngine } from './render_engine.js';
import { Hydrator } from './hydrator.js';

export class VNodeRuntime {
  constructor() {
    this.app = null;
    this.rootElement = null;
    this.rootVNode = null;
    this.isHydrated = false;
    this.hotReloadEnabled = false;
    this.renderer = null;  // ✅ ADD: Store renderer instance
    this.stateRegistry = new Map();
    this.performanceMetrics = {
      initialRender: 0,
      updates: 0,
      totalRenderTime: 0,
      averageRenderTime: 0
    };
  }

  clearMetrics() {
    this.performanceMetrics = {
      initialRender: 0,
      updates: 0,
      totalRenderTime: 0,
      averageRenderTime: 0
    };
  }

  /**
   * Start the application
   * @param {Widget} app - Root widget
   * @param {Object} options - Runtime options
   */
  runApp(app, options = {}) {
    const {
      target = '#root',
      mode = 'auto', // 'csr', 'ssr', 'auto'
      enableHotReload = false,
      enablePerformanceTracking = true,
      onError = null
    } = options;

    try {
      console.log(`  [RUNTIME] runApp called with target: ${target}`);
      this.app = app;
      this.hotReloadEnabled = enableHotReload;

      // Get target element
      this.rootElement = this.getTargetElement(target);

      // CREATE RENDERER INSTANCE HERE
      this.renderer = new VNodeRenderer({ debugMode: true });

      // Check if SSR content exists
      const hasSSRContent = this.hasSSRContent(this.rootElement);
      console.log(`  [RUNTIME] Has SSR content: ${hasSSRContent}`);

      if (hasSSRContent) {
        // Hydration mode
        console.log(`  [RUNTIME] Entering hydration mode`);
        this.hydrateApp(app, options);
      } else {
        // Client-side render mode
        console.log(`  [RUNTIME] Entering CSR mode`);
        this.renderApp(app, options);
      }

      // Setup hot reload if enabled
      if (enableHotReload) {
        console.log(`  [RUNTIME] Setting up hot reload`);
        this.setupHotReload();
      }

      // Track performance
      if (enablePerformanceTracking) {
        console.log(`  [RUNTIME] Starting performance tracking`);
        this.startPerformanceTracking();
      }

      return this;
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error('FlutterJS Runtime Error:', error);
      }
      throw error;
    }
  }

  /**
   * Client-side render the app
   * @private
   */
  renderApp(app, options = {}) {
    console.log(`  [RENDERAPP] Starting client-side render`);
    const startTime = performance.now();

    // Build widget tree
    const context = this.createBuildContext(options);
    console.log(`  [RENDERAPP] Build context created`);

    const widgetTree = app.build ? app.build(context) : app;
    console.log(`  [RENDERAPP] Widget tree built`);
    console.log(`  [RENDERAPP] Widget tree:`, JSON.stringify(widgetTree, null, 2).substring(0, 200));

    // Convert to VNode
    const vNodeBuilder = new VNodeBuilder({
      debugMode: this.flutterConfig?.debugMode || false,
      runtime: this  // ← CRITICAL: Pass runtime
    });
    this.rootVNode = vNodeBuilder.build(widgetTree, context,);
    console.log(`  [RENDERAPP] VNode created`);
    console.log(`  [RENDERAPP] VNode tag: ${this.rootVNode.tag}`);
    console.log(`  [RENDERAPP] VNode children count: ${this.rootVNode.children ? this.rootVNode.children.length : 0}`);
    console.log(`  [RENDERAPP] VNode props:`, this.rootVNode.props);
    console.log(`  [RENDERAPP] Full VNode:`, JSON.stringify(this.rootVNode, null, 2).substring(0, 300));

    // Render to DOM
    console.log(`  [RENDERAPP] Root element before render:`, this.rootElement.innerHTML.substring(0, 100));
    console.log(`  [RENDERAPP] Root element classes:`, this.rootElement.className);

    // ✅ FIX #1: Use instance instead of static call
    if (!this.renderer) {
      this.renderer = new VNodeRenderer({ debugMode: true });
    }

    this.renderer.render(this.rootVNode, this.rootElement, {
      clear: true
    });
    console.log(`  [RENDERAPP] Rendered to DOM`);

    console.log(`  [RENDERAPP] Root element after render:`, this.rootElement.innerHTML.substring(0, 200));
    console.log(`  [RENDERAPP] Root element child count:`, this.rootElement.children.length);
    console.log(`  [RENDERAPP] Root element children:`, Array.from(this.rootElement.children).map(c => ({ tag: c.tagName, class: c.className, text: c.textContent.substring(0, 50) })));

    const endTime = performance.now();
    this.performanceMetrics.initialRender = endTime - startTime;

    console.log(`✓ App rendered in ${this.performanceMetrics.initialRender.toFixed(2)}ms`);
  }

  /**
   * Hydrate server-rendered app
   * @private
   */
  hydrateApp(app, options = {}) {
    console.log(`  [HYDRATEAPP] Starting hydration`);
    const startTime = performance.now();

    // Build widget tree
    const context = this.createBuildContext(options);
    console.log(`  [HYDRATEAPP] Build context created`);

    const widgetTree = app.build ? app.build(context) : app;
    console.log(`  [HYDRATEAPP] Widget tree built`);
    const vNodeBuilder = new VNodeBuilder({
      debugMode: this.flutterConfig?.debugMode || false,
      runtime: this  // ← CRITICAL: Pass runtime
    });
    // Convert to VNode
    this.rootVNode = vNodeBuilder.build(widgetTree, context);
    console.log(`  [HYDRATEAPP] VNode created`);

    // Hydrate
    const hydrationData = Hydrator.loadHydrationData();
    console.log(`  [HYDRATEAPP] Hydration data loaded`);

    Hydrator.hydrate(this.rootElement, this.rootVNode, hydrationData);
    console.log(`  [HYDRATEAPP] Hydration complete`);

    this.isHydrated = true;

    const endTime = performance.now();
    this.performanceMetrics.initialRender = endTime - startTime;

    console.log(`✓ App hydrated in ${this.performanceMetrics.initialRender.toFixed(2)}ms`);
  }

  /**
   * Update the application (e.g., after state change)
   * @param {Function} updateFn - Function that updates state
   */
  update(updateFn) {
    console.log(`  [UPDATE] Update called`);

    if (!this.app || !this.rootElement) {
      console.log(`  [UPDATE] ERROR: App not initialized`);
      throw new Error('App not initialized. Call runApp() first.');
    }

    const startTime = performance.now();

    // Execute update function
    if (updateFn) {
      console.log(`  [UPDATE] Executing update function`);
      updateFn();
    }

    // Rebuild widget tree
    const context = this.createBuildContext();
    console.log(`  [UPDATE] Build context created`);

    const widgetTree = this.app.build ? this.app.build(context) : this.app;
    console.log(`  [UPDATE] Widget tree rebuilt`);

    const vNodeBuilder = new VNodeBuilder({
      debugMode: this.flutterConfig?.debugMode || false,
      runtime: this  // ← CRITICAL: Pass runtime
    });

    // Convert to VNode
    const newVNode = vNodeBuilder.build(widgetTree, context);
    console.log(`  [UPDATE] New VNode created`);

    // ✅ FIX #2 & #3: Use instance instead of static calls
    if (!this.renderer) {
      this.renderer = new VNodeRenderer({ debugMode: true });
    }

    this.renderer.render(newVNode, this.rootElement, { clear: true });

    this.rootVNode = newVNode;

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Ensure at least 0.01ms is recorded if time was measured
    const recordedTime = renderTime > 0 ? renderTime : 0.01;

    this.performanceMetrics.updates++;
    this.performanceMetrics.totalRenderTime += recordedTime;
    this.performanceMetrics.averageRenderTime =
      this.performanceMetrics.totalRenderTime / this.performanceMetrics.updates;

    console.log(`  [UPDATE] Update metrics: updates=${this.performanceMetrics.updates}, renderTime=${renderTime.toFixed(2)}ms`);

    if (this.hotReloadEnabled) {
      console.log(`♻ Updated in ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Register a stateful widget
   * @param {string} widgetId - Unique widget identifier
   * @param {Object} stateObject - State object with setState method
   */
  registerState(widgetId, stateObject) {
    console.log(`  [REGISTRY] Registering state for ${widgetId}`);
    this.stateRegistry.set(widgetId, stateObject);

    // Wrap setState to trigger runtime update
    const originalSetState = stateObject.setState.bind(stateObject);
    stateObject.setState = (updater) => {
      console.log(`  [REGISTRY] setState called for ${widgetId}`);
      originalSetState(updater);
      this.update();
    };
  }

  /**
   * Unregister a stateful widget
   * @param {string} widgetId - Widget identifier
   */
  unregisterState(widgetId) {
    console.log(`  [REGISTRY] Unregistering state for ${widgetId}`);
    this.stateRegistry.delete(widgetId);
  }

  /**
   * Get state object by widget ID
   * @param {string} widgetId - Widget identifier
   * @returns {Object|null} State object
   */
  getState(widgetId) {
    console.log(`  [REGISTRY] Getting state for ${widgetId}`);
    return this.stateRegistry.get(widgetId) || null;
  }

  /**
   * Hot reload the application
   */
  hotReload() {
    console.log(`  [HOTRELOAD] hotReload called`);

    if (!this.hotReloadEnabled) {
      console.warn('Hot reload is not enabled');
      return;
    }

    console.log('🔥 Hot reloading...');

    if (!this.app || !this.rootElement) {
      console.warn('No app running. Cannot hot reload.');
      return;
    }

    this.update();
  }

  /**
   * Create build context
   * @private
   */
  createBuildContext(options = {}) {
    console.log(`  [CONTEXT] Creating build context`);

    return {
      runtime: this,
      mediaQuery: this.getMediaQuery(),
      theme: options.theme || this.getDefaultTheme(),
      navigator: this.createNavigator(),
      ...options.context
    };
  }

  /**
   * Get media query information
   * @private
   */
  getMediaQuery() {
    if (typeof window === 'undefined') {
      console.log(`  [MEDIAQUERY] Server-side - returning default`);
      return {
        width: 1920,
        height: 1080,
        devicePixelRatio: 1
      };
    }

    const mq = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };

    return mq;
  }

  /**
   * Get default Material Design theme
   * @private
   */
  getDefaultTheme() {
    console.log(`  [THEME] Creating default Material Design theme`);

    return {
      primaryColor: '#6750a4',
      onPrimary: '#ffffff',
      primaryContainer: '#eaddff',
      onPrimaryContainer: '#21005e',
      surface: '#fffbfe',
      onSurface: '#1c1b1f',
      outline: '#79747e',
      outlineVariant: '#cac7cf'
    };
  }

  /**
   * Create navigator for routing
   * @private
   */
  createNavigator() {
    console.log(`  [NAVIGATOR] Creating navigator`);

    return {
      push: (route) => {
        console.log('Navigation not yet implemented:', route);
      },
      pop: () => {
        console.log('Navigation not yet implemented');
      }
    };
  }

  /**
   * Get target element
   * @private
   */
  getTargetElement(target) {
    console.log(`  [TARGET] Getting target element: ${target}`);

    if (typeof target === 'string') {
      const element = document.querySelector(target);
      if (!element) {
        console.log(`  [TARGET] ERROR: Element not found for selector: ${target}`);
        throw new Error(`Target element "${target}" not found`);
      }
      console.log(`  [TARGET] Found element by selector`);
      return element;
    }

    if (target instanceof HTMLElement) {
      console.log(`  [TARGET] Using HTMLElement target`);
      return target;
    }

    console.log(`  [TARGET] ERROR: Invalid target type`);
    throw new Error('Invalid target: must be a selector string or HTMLElement');
  }

  /**
   * Check if element has SSR content
   * @private
   */
  hasSSRContent(element) {
    console.log(`  [SSRCHECK] Checking for SSR content`);

    // Check for hydration data script
    const hydrationScript = document.getElementById('__FLUTTERJS_HYDRATION_DATA__');

    // Check if element has children (SSR content)
    const hasContent = hydrationScript && element.children.length > 0;
    console.log(`  [SSRCHECK] Hydration script found: ${hydrationScript !== null}, Element has children: ${element.children.length > 0}`);

    return hasContent;
  }

  /**
   * Setup hot reload listener
   * @private
   */
  setupHotReload() {
    if (typeof window === 'undefined') {
      console.log(`  [HOTRELOAD] Server-side environment, skipping`);
      return;
    }

    console.log(`  [HOTRELOAD] Setting up hot reload listeners`);

    // Listen for custom hot reload event
    window.addEventListener('flutterjs:hotreload', () => {
      console.log(`  [HOTRELOAD] Received hot reload event`);
      this.hotReload();
    });

    // Expose hot reload globally
    window.__flutterjs_hot_reload = () => {
      console.log(`  [HOTRELOAD] Called via global function`);
      this.hotReload();
    };

    console.log('🔥 Hot reload enabled');
  }

  /**
   * Start performance tracking
   * @private
   */
  startPerformanceTracking() {
    if (typeof window === 'undefined') {
      console.log(`  [PERFTRACK] Server-side environment, skipping`);
      return;
    }

    console.log(`  [PERFTRACK] Starting FPS tracking`);

    // Track FPS
    let lastTime = performance.now();
    let frames = 0;

    const trackFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.performanceMetrics.fps = fps;
        console.log(`  [PERFTRACK] FPS: ${fps}`);
        frames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(trackFPS);
    };

    requestAnimationFrame(trackFPS);
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    console.log(`  [METRICS] Getting metrics - app exists: ${this.app !== null}`);

    if (!this.app) {
      console.log(`  [METRICS] No app, returning null`);
      return null;
    }

    const metrics = {
      ...this.performanceMetrics,
      isHydrated: this.isHydrated,
      stateCount: this.stateRegistry.size,
      vnodeStats: this.rootVNode ? RenderEngine.getStats(this.rootVNode) : null
    };

    console.log(`  [METRICS] Returning metrics:`, metrics);
    return metrics;
  }

  /**
   * Destroy the runtime and cleanup
   */
  destroy() {
    console.log(`  [DESTROY] Destroying runtime`);

    // Cleanup event listeners
    if (this.rootElement && this.renderer) {
      console.log(`  [DESTROY] Cleaning up event listeners`);
      this.renderer.cleanupEventListeners(this.rootElement);
    }

    // Clear state registry
    console.log(`  [DESTROY] Clearing state registry (size: ${this.stateRegistry.size})`);
    this.stateRegistry.clear();

    // Remove hot reload listener
    if (typeof window !== 'undefined') {
      console.log(`  [DESTROY] Removing hot reload listener`);
      window.removeEventListener('flutterjs:hotreload', this.hotReload);
      delete window.__flutterjs_hot_reload;
    }

    // Clear references
    this.app = null;
    this.rootElement = null;
    this.rootVNode = null;
    this.renderer = null;

    console.log('✓ Runtime destroyed');
  }
}

// ============================================================================
// Global API
// ============================================================================

let globalRuntime = null;

/**
 * Start FlutterJS application
 * @param {Widget} app - Root widget
 * @param {Object} options - Runtime options
 */
export function runApp(app, options = {}) {
  console.log(`[GLOBAL] runApp called`);

  if (!globalRuntime) {
    console.log(`[GLOBAL] Creating new global runtime`);
    globalRuntime = new VNodeRuntime();
  }
  return globalRuntime.runApp(app, options);
}

/**
 * Get the global runtime instance
 * @returns {VNodeRuntime} Runtime instance
 */
export function getRuntime() {
  console.log(`[GLOBAL] getRuntime called, exists: ${globalRuntime !== null}`);
  return globalRuntime;
}

/**
 * Update the application
 * @param {Function} updateFn - Update function
 */
export function updateApp(updateFn) {
  console.log(`[GLOBAL] updateApp called`);

  if (!globalRuntime) {
    console.log(`[GLOBAL] ERROR: No runtime`);
    throw new Error('No app running. Call runApp() first.');
  }
  globalRuntime.update(updateFn);
}

/**
 * Get performance metrics
 * @returns {Object} Metrics
 */
export function getMetrics() {
  console.log(`[GLOBAL] getMetrics called`);

  if (!globalRuntime) {
    console.log(`[GLOBAL] No runtime, returning null`);
    return null;
  }
  return globalRuntime.getMetrics();
}

/**
 * Trigger hot reload
 */
export function hotReload() {
  console.log(`[GLOBAL] hotReload called`);

  if (!globalRuntime) {
    console.warn('No app running');
    return;
  }
  globalRuntime.hotReload();
}

/**
 * Server-side render to HTML
 * @param {Widget} app - Root widget
 * @param {Object} options - SSR options
 * @returns {string} HTML string
 */
export function renderToString(app, options = {}) {
  console.log(`[GLOBAL] renderToString called`);

  const context = {
    mediaQuery: { width: 1920, height: 1080, devicePixelRatio: 1 },
    theme: options.theme || {},
    ...options.context
  };

  console.log(`[GLOBAL] SSR: Creating build context`);
  const widgetTree = app.build ? app.build(context) : app;

  console.log(`[GLOBAL] SSR: Building VNode`);
  // ✅ Create instance with runtime
  const vNodeBuilder = new VNodeBuilder({
    debugMode: this.flutterConfig?.debugMode || false,
    runtime: this  // ← CRITICAL: Pass runtime
  });
  this.rootVNode = vNodeBuilder.build(widgetTree, context);
  console.log(`[GLOBAL] SSR: Rendering to string`);
  return RenderEngine.renderServer(vnode, {
    title: options.title || 'FlutterJS App',
    meta: options.meta || {},
    styles: options.styles || [],
    scripts: options.scripts || [],
    includeHydration: options.includeHydration !== false,
    includeCriticalCSS: options.includeCriticalCSS !== false,
    includeRuntime: options.includeRuntime !== false
  });
}

/**
 * Hydrate server-rendered content
 * @param {Widget} app - Root widget
 * @param {Object} options - Hydration options
 */
export function hydrate(app, options = {}) {
  console.log(`[GLOBAL] hydrate called`);

  if (!globalRuntime) {
    console.log(`[GLOBAL] Creating new global runtime for hydration`);
    globalRuntime = new VNodeRuntime();
  }

  const target = options.target || '#root';
  console.log(`[GLOBAL] Getting target: ${target}`);

  const rootElement = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!rootElement) {
    console.log(`[GLOBAL] ERROR: Target not found`);
    throw new Error(`Target element "${target}" not found`);
  }

  console.log(`[GLOBAL] Setting up hydration`);
  globalRuntime.rootElement = rootElement;
  globalRuntime.app = app;
  globalRuntime.hydrateApp(app, options);

  return globalRuntime;
}

// Default export
export default {
  runApp,
  getRuntime,
  updateApp,
  getMetrics,
  hotReload,
  renderToString,
  hydrate,

  VNodeRuntime
};

// Browser global
if (typeof window !== 'undefined') {
  console.log(`[GLOBAL] Setting up window.FlutterJS`);
  window.FlutterJS = {
    runApp,
    getRuntime,
    updateApp,
    getMetrics,
    hotReload,
    renderToString,
    hydrate
  };
  console.log(`[GLOBAL] window.FlutterJS ready`);
}

export function clearMetrics() {
  if (!globalRuntime) return;
  globalRuntime.clearMetrics();
}