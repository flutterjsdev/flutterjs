/**
 * FlutterJS Runtime - Complete Integration Layer
 * 
 * Brings together all VNode system components:
 * - VNode creation and management
 * - Widget building
 * - Style conversion
 * - Rendering (CSR/SSR)
 * - Hydration
 * - State management
 * 
 * Provides high-level API for:
 * - runApp() - Start application
 * - Hot reload
 * - State updates
 * - Performance monitoring
 */

import { VNode } from '../vnode/vnode.js';
import { VNodeBuilder } from '../vnode/vnode-builder.js';
import { StyleConverter } from '../vnode/style-converter.js';
import { VNodeRenderer } from '../vnode/vnode-renderer.js';
import { SSRRenderer } from '../vnode/ssr-renderer.js';
import { RenderEngine } from '../vnode/render-engine.js';
import { Hydrator } from '../vnode/hydrator.js';

class FlutterJSRuntime {
  constructor() {
    this.app = null;
    this.rootElement = null;
    this.rootVNode = null;
    this.isHydrated = false;
    this.hotReloadEnabled = false;
    this.stateRegistry = new Map();
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
      this.app = app;
      this.hotReloadEnabled = enableHotReload;

      // Get target element
      this.rootElement = this.getTargetElement(target);

      // Check if SSR content exists
      const hasSSRContent = this.hasSSRContent(this.rootElement);

      if (hasSSRContent) {
        // Hydration mode
        this.hydrateApp(app, options);
      } else {
        // Client-side render mode
        this.renderApp(app, options);
      }

      // Setup hot reload if enabled
      if (enableHotReload) {
        this.setupHotReload();
      }

      // Track performance
      if (enablePerformanceTracking) {
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
    const startTime = performance.now();

    // Build widget tree
    const context = this.createBuildContext(options);
    const widgetTree = app.build ? app.build(context) : app;

    // Convert to VNode
    this.rootVNode = VNodeBuilder.build(widgetTree, context);

    // Render to DOM
    VNodeRenderer.render(this.rootVNode, this.rootElement, {
      clear: true
    });

    const endTime = performance.now();
    this.performanceMetrics.initialRender = endTime - startTime;

    console.log(`✓ App rendered in ${this.performanceMetrics.initialRender.toFixed(2)}ms`);
  }

  /**
   * Hydrate server-rendered app
   * @private
   */
  hydrateApp(app, options = {}) {
    const startTime = performance.now();

    // Build widget tree
    const context = this.createBuildContext(options);
    const widgetTree = app.build ? app.build(context) : app;

    // Convert to VNode
    this.rootVNode = VNodeBuilder.build(widgetTree, context);

    // Hydrate
    const hydrationData = Hydrator.loadHydrationData();
    Hydrator.hydrate(this.rootElement, this.rootVNode, hydrationData);

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
    if (!this.app || !this.rootElement) {
      throw new Error('App not initialized. Call runApp() first.');
    }

    const startTime = performance.now();

    // Execute update function
    if (updateFn) {
      updateFn();
    }

    // Rebuild widget tree
    const context = this.createBuildContext();
    const widgetTree = this.app.build ? this.app.build(context) : this.app;

    // Convert to VNode
    const newVNode = VNodeBuilder.build(widgetTree, context);

    // Update DOM (smart diffing happens in renderer)
    if (this.rootVNode) {
      // For now, simple replacement
      // In production, use VNodeDiffer for efficient updates
      VNodeRenderer.render(newVNode, this.rootElement, { clear: true });
    } else {
      VNodeRenderer.render(newVNode, this.rootElement, { clear: true });
    }

    this.rootVNode = newVNode;

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    this.performanceMetrics.updates++;
    this.performanceMetrics.totalRenderTime += renderTime;
    this.performanceMetrics.averageRenderTime = 
      this.performanceMetrics.totalRenderTime / this.performanceMetrics.updates;

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
    this.stateRegistry.set(widgetId, stateObject);

    // Wrap setState to trigger runtime update
    const originalSetState = stateObject.setState.bind(stateObject);
    stateObject.setState = (updater) => {
      originalSetState(updater);
      this.update();
    };
  }

  /**
   * Unregister a stateful widget
   * @param {string} widgetId - Widget identifier
   */
  unregisterState(widgetId) {
    this.stateRegistry.delete(widgetId);
  }

  /**
   * Get state object by widget ID
   * @param {string} widgetId - Widget identifier
   * @returns {Object|null} State object
   */
  getState(widgetId) {
    return this.stateRegistry.get(widgetId) || null;
  }

  /**
   * Hot reload the application
   */
  hotReload() {
    if (!this.hotReloadEnabled) {
      console.warn('Hot reload is not enabled');
      return;
    }

    console.log('🔥 Hot reloading...');
    this.update();
  }

  /**
   * Create build context
   * @private
   */
  createBuildContext(options = {}) {
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
      return {
        width: 0,
        height: 0,
        devicePixelRatio: 1
      };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
  }

  /**
   * Get default Material Design theme
   * @private
   */
  getDefaultTheme() {
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
    if (typeof target === 'string') {
      const element = document.querySelector(target);
      if (!element) {
        throw new Error(`Target element "${target}" not found`);
      }
      return element;
    }

    if (target instanceof HTMLElement) {
      return target;
    }

    throw new Error('Invalid target: must be a selector string or HTMLElement');
  }

  /**
   * Check if element has SSR content
   * @private
   */
  hasSSRContent(element) {
    // Check for hydration data script
    const hydrationScript = document.getElementById('__FLUTTERJS_HYDRATION_DATA__');
    
    // Check if element has children (SSR content)
    return hydrationScript && element.children.length > 0;
  }

  /**
   * Setup hot reload listener
   * @private
   */
  setupHotReload() {
    if (typeof window === 'undefined') return;

    // Listen for custom hot reload event
    window.addEventListener('flutterjs:hotreload', () => {
      this.hotReload();
    });

    // Expose hot reload globally
    window.__flutterjs_hot_reload = () => this.hotReload();

    console.log('🔥 Hot reload enabled');
  }

  /**
   * Start performance tracking
   * @private
   */
  startPerformanceTracking() {
    if (typeof window === 'undefined') return;

    // Track FPS
    let lastTime = performance.now();
    let frames = 0;

    const trackFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.performanceMetrics.fps = fps;
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
    return {
      ...this.performanceMetrics,
      isHydrated: this.isHydrated,
      stateCount: this.stateRegistry.size,
      vnodeStats: this.rootVNode ? RenderEngine.getStats(this.rootVNode) : null
    };
  }

  /**
   * Destroy the runtime and cleanup
   */
  destroy() {
    // Cleanup event listeners
    if (this.rootElement) {
      VNodeRenderer.cleanupEventListeners(this.rootElement);
    }

    // Clear state registry
    this.stateRegistry.clear();

    // Remove hot reload listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('flutterjs:hotreload', this.hotReload);
      delete window.__flutterjs_hot_reload;
    }

    // Clear references
    this.app = null;
    this.rootElement = null;
    this.rootVNode = null;

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
  if (!globalRuntime) {
    globalRuntime = new FlutterJSRuntime();
  }
  return globalRuntime.runApp(app, options);
}

/**
 * Get the global runtime instance
 * @returns {FlutterJSRuntime} Runtime instance
 */
export function getRuntime() {
  return globalRuntime;
}

/**
 * Update the application
 * @param {Function} updateFn - Update function
 */
export function updateApp(updateFn) {
  if (!globalRuntime) {
    throw new Error('No app running. Call runApp() first.');
  }
  globalRuntime.update(updateFn);
}

/**
 * Get performance metrics
 * @returns {Object} Metrics
 */
export function getMetrics() {
  if (!globalRuntime) {
    return null;
  }
  return globalRuntime.getMetrics();
}

/**
 * Trigger hot reload
 */
export function hotReload() {
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
  const context = {
    mediaQuery: { width: 1920, height: 1080, devicePixelRatio: 1 },
    theme: options.theme || {},
    ...options.context
  };

  const widgetTree = app.build ? app.build(context) : app;
  const vnode = VNodeBuilder.build(widgetTree, context);

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
  if (!globalRuntime) {
    globalRuntime = new FlutterJSRuntime();
  }

  const target = options.target || '#root';
  const rootElement = typeof target === 'string' 
    ? document.querySelector(target)
    : target;

  if (!rootElement) {
    throw new Error(`Target element "${target}" not found`);
  }

  globalRuntime.rootElement = rootElement;
  globalRuntime.app = app;
  globalRuntime.hydrateApp(app, options);

  return globalRuntime;
}

// Export all components for advanced usage
export {
  FlutterJSRuntime,
  VNode,
  VNodeBuilder,
  StyleConverter,
  VNodeRenderer,
  SSRRenderer,
  RenderEngine,
  Hydrator
};

// Default export
export default {
  runApp,
  getRuntime,
  updateApp,
  getMetrics,
  hotReload,
  renderToString,
  hydrate,
  FlutterJSRuntime,
  VNode,
  VNodeBuilder,
  StyleConverter,
  VNodeRenderer,
  SSRRenderer,
  RenderEngine,
  Hydrator
};

// Browser global
if (typeof window !== 'undefined') {
  window.FlutterJS = {
    runApp,
    getRuntime,
    updateApp,
    getMetrics,
    hotReload,
    renderToString,
    hydrate
  };
}