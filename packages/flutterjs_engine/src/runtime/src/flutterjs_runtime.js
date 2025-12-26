/**
 * ============================================================================
 * FlutterJS Complete Runtime Integration (FIXED - ACTUALLY USING IMPORTS)
 * ============================================================================
 * 
 * NOW PROPERLY USES:
 * - VNodeRenderer: To render VNode to actual DOM elements
 * - VNodeBuilder: To build VNode tree and manage rendering
 * - Hydrator: To hydrate SSR content to CSR
 * 
 * Location: cli/runtime/flutterjs_runtime.js
 */

import { VNodeRenderer } from '@flutterjs/vdom/vnode_renderer';
import { Hydrator } from '@flutterjs/vdom/hydrator';
import { VNodeBuilder } from '@flutterjs/vdom/vnode_builder';


// ============================================================================
// UTILITIES
// ============================================================================

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isSSR() {
  return typeof window === 'undefined';
}

// ============================================================================
// MAIN RUNTIME CLASS
// ============================================================================

export class FlutterJSRuntime {
  constructor(options = {}) {
    // Configuration
    this.config = {
      debugMode: options.debugMode || false,
      enableHotReload: options.enableHotReload !== false,
      enableStateTracking: options.enableStateTracking !== false,
      enablePerformanceTracking: options.enablePerformanceTracking !== false,
      mode: options.mode || 'csr',
      target: options.target || 'web',
      isBrowser: isBrowser(),
      isSSR: isSSR(),
      ...options
    };

    // State
    this.initialized = false;
    this.mounted = false;
    this.rootElement = null;
    this.rootWidget = null;
    this.rootVNode = null;
    this.currentDOMElement = null;

    // Component instances
    this.appBuilder = null;
    this.vNodeBuilder = null;      // ✅ ADD: VNodeBuilder instance
    this.vNodeRenderer = null;     // ✅ ADD: VNodeRenderer instance
    this.hydrator = null;          // ✅ ADD: Hydrator instance

    // Performance metrics
    this.stats = {
      initTime: 0,
      mountTime: 0,
      renderTime: 0,
      updateCount: 0,
      totalUpdateTime: 0,
      averageUpdateTime: 0,
      lastUpdateTime: 0
    };

    // Lifecycle hooks
    this.hooks = {
      beforeInit: [],
      afterInit: [],
      beforeMount: [],
      afterMount: [],
      beforeUpdate: [],
      afterUpdate: [],
      beforeUnmount: [],
      afterUnmount: []
    };

    // Error handlers
    this.errorHandlers = [];
    this.setupErrorHandling();

    if (this.config.debugMode) {
      console.log('[Runtime] ✅ Instance created', {
        environment: this.config.isBrowser ? 'browser' : 'server',
        mode: this.config.mode
      });
    }
  }

  /**
   * Initialize runtime
   * ✅ NOW CREATES VNodeBuilder, VNodeRenderer instances
   */
  initialize(options = {}) {
    if (this.initialized) {
      console.warn('[Runtime] Already initialized');
      return this;
    }

    const startTime = performance.now();

    try {
      this.runHooks('beforeInit');

      if (this.config.debugMode) {
        console.log('[Runtime] Initializing...');
      }

      // Store root element
      this.rootElement = options.rootElement;

      if (this.config.isBrowser && !this.rootElement) {
        throw new Error('[Runtime] rootElement required in browser mode');
      }

      // ✅ INITIALIZE VNODE BUILDER
      if (this.config.debugMode) {
        console.log('[Runtime] 🟣 Creating VNodeBuilder...');
      }
      this.vNodeBuilder = new VNodeBuilder({
        debugMode: this.config.debugMode
      });

      // ✅ INITIALIZE VNODE RENDERER
      if (this.config.isBrowser) {
        if (this.config.debugMode) {
          console.log('[Runtime] 🟠 Creating VNodeRenderer...');
        }
        this.vNodeRenderer = new VNodeRenderer({
          rootElement: this.rootElement,
          debugMode: this.config.debugMode
        });
      }

      // ✅ INITIALIZE HYDRATOR
      if (this.config.mode === 'hydrate' || options.hydrateFromSSR) {
        if (this.config.debugMode) {
          console.log('[Runtime] 💧 Creating Hydrator...');
        }
        this.hydrator = new Hydrator({
          rootElement: this.rootElement,
          debugMode: this.config.debugMode
        });
      }

      this.initialized = true;
      this.stats.initTime = performance.now() - startTime;

      this.runHooks('afterInit');

      if (this.config.debugMode) {
        console.log('[Runtime] ✅ Initialized in', this.stats.initTime.toFixed(2), 'ms');
        console.log('[Runtime] 📊 Components ready:', {
          vNodeBuilder: !!this.vNodeBuilder,
          vNodeRenderer: !!this.vNodeRenderer,
          hydrator: !!this.hydrator
        });
      }

      return this;
    } catch (error) {
      this.handleError('initialization', error);
      throw error;
    }
  }

  /**
   * MAIN METHOD: Run application
   * ✅ NOW USES VNodeBuilder + VNodeRenderer
   */
  runApp(widgetOrVNode, options = {}) {
    if (!this.initialized) {
      throw new Error('[Runtime] Must call initialize() first');
    }

    const startTime = performance.now();

    try {
      this.runHooks('beforeMount');

      if (this.config.debugMode) {
        console.log('[Runtime] Mounting application...');
      }

      // Determine input type
      const isVNode = widgetOrVNode && widgetOrVNode.tag !== undefined;
      const isWidget = widgetOrVNode && typeof widgetOrVNode.build === 'function';

      if (isVNode) {
        // Already a VNode from AppBuilder
        this.rootVNode = widgetOrVNode;
        if (this.config.debugMode) {
          console.log('[Runtime] 📦 Using VNode from AppBuilder');
        }
      } else if (isWidget) {
        // Need to build VNode from widget using VNodeBuilder
        if (this.config.debugMode) {
          console.log('[Runtime] 🏗️  Building VNode from Widget class...');
        }

        // ✅ USE VNODE BUILDER TO CONVERT WIDGET TO VNODE
        if (!this.vNodeBuilder) {
          this.vNodeBuilder = new VNodeBuilder({ debugMode: this.config.debugMode });
        }

        this.rootVNode = this.vNodeBuilder.build(widgetOrVNode, {
          context: options.buildContext || {}
        });

        if (this.config.debugMode) {
          console.log('[Runtime] ✅ VNode built successfully');
        }
      } else {
        throw new Error('[Runtime] Invalid input: expected VNode or Widget');
      }

      // Store AppBuilder reference if provided
      if (options.appBuilder) {
        this.appBuilder = options.appBuilder;
      }

      // ✅ RENDER TO APPROPRIATE TARGET
      if (this.config.isBrowser && this.rootElement) {
        this.renderToDOM();
      } else if (this.config.isSSR) {
        this.renderToString();
      }

      this.mounted = true;
      this.stats.mountTime = performance.now() - startTime;

      this.runHooks('afterMount');

      if (this.config.debugMode) {
        console.log('[Runtime] ✅ Mounted in', this.stats.mountTime.toFixed(2), 'ms');
        this.logStats();
      }

      return this;
    } catch (error) {
      this.handleError('mount', error);
      throw error;
    }
  }

  /**
   * Render VNode to DOM
   * ✅ NOW USES VNodeRenderer
   */
  renderToDOM() {
    if (!this.config.isBrowser) {
      throw new Error('[Runtime] Cannot render to DOM in SSR mode');
    }

    if (!this.rootElement) {
      throw new Error('[Runtime] No root element');
    }

    if (!this.rootVNode) {
      throw new Error('[Runtime] No VNode tree to render');
    }

    try {
      const startTime = performance.now();

      if (this.config.debugMode) {
        console.log('[Runtime] 🎨 Rendering VNode to DOM...');
        console.log('[Runtime] 📦 VNode structure:', JSON.stringify(this.rootVNode, null, 2).substring(0, 200) + '...');
      }

      // ✅ USE VNODE RENDERER TO CREATE ACTUAL DOM
      if (!this.vNodeRenderer) {
        this.vNodeRenderer = new VNodeRenderer({
          rootElement: this.rootElement,
          debugMode: this.config.debugMode
        });
      }

      this.currentDOMElement = this.vNodeRenderer.render(
        this.rootVNode,
        this.rootElement,
        { clear: true }
      );

      this.stats.renderTime = performance.now() - startTime;

      if (this.config.debugMode) {
        console.log('[Runtime] ✅ Rendered to DOM in', this.stats.renderTime.toFixed(2), 'ms');
        console.log('[Runtime] 🌳 DOM Element:', this.currentDOMElement.tagName || 'Fragment');
      }
    } catch (error) {
      console.error('[Runtime] ❌ DOM rendering failed:', error);
      throw error;
    }
  }

  /**
   * Render VNode to HTML string (SSR)
   * ✅ NOW USES VNodeRenderer
   */
  renderToString() {
    if (!this.config.isSSR) {
      console.warn('[Runtime] renderToString called in browser mode');
      return '';
    }

    if (!this.rootVNode) {
      throw new Error('[Runtime] No VNode tree to render');
    }

    try {
      const startTime = performance.now();

      if (this.config.debugMode) {
        console.log('[Runtime] 📝 Rendering VNode to HTML string (SSR)...');
      }

      // ✅ USE VNODE RENDERER TO CREATE HTML STRING
      if (!this.vNodeRenderer) {
        this.vNodeRenderer = new VNodeRenderer({
          debugMode: this.config.debugMode
        });
      }

      const html = this.vNodeRenderer.renderToString(this.rootVNode);

      this.stats.renderTime = performance.now() - startTime;

      if (this.config.debugMode) {
        console.log('[Runtime] ✅ Generated SSR HTML:', html.length, 'bytes in', this.stats.renderTime.toFixed(2), 'ms');
      }

      return html;
    } catch (error) {
      console.error('[Runtime] ❌ SSR rendering failed:', error);
      throw error;
    }
  }

  /**
   * Update application (after state change)
   * ✅ NOW USES VNodeRenderer FOR RECONCILIATION
   */
  update(options = {}) {
    if (!this.mounted) {
      console.warn('[Runtime] ❌ Cannot update: app not mounted');
      return this;
    }

    const startTime = performance.now();

    try {
      this.runHooks('beforeUpdate');

      if (this.config.debugMode) {
        console.log('[Runtime] 🔄 Updating application...');
      }

      // If AppBuilder is available, rebuild VNode tree
      if (this.appBuilder && options.rebuild !== false) {
        if (this.config.debugMode) {
          console.log('[Runtime] 🏗️  Rebuilding widget tree with AppBuilder...');
        }

        // Get new VNode from AppBuilder
        const newVNode = this.appBuilder.build();
        
        // ✅ USE VNODE RENDERER FOR RECONCILIATION
        if (this.config.isBrowser && this.vNodeRenderer && this.currentDOMElement) {
          if (this.config.debugMode) {
            console.log('[Runtime] 🔍 Running VNode reconciliation...');
          }

          // Use renderer to update/reconcile DOM
          this.currentDOMElement = this.vNodeRenderer.reconcile(
            this.currentDOMElement,
            this.rootVNode,
            newVNode
          );

          this.rootVNode = newVNode;
        }
      } else if (this.config.isBrowser && this.rootVNode && options.forceRender) {
        // Force full re-render
        if (this.config.debugMode) {
          console.log('[Runtime] 💥 Force rendering...');
        }

        if (this.currentDOMElement) {
          this.vNodeRenderer.cleanup(this.currentDOMElement);
        }

        this.renderToDOM();
      }

      const updateTime = performance.now() - startTime;
      this.stats.updateCount++;
      this.stats.totalUpdateTime += updateTime;
      this.stats.averageUpdateTime = this.stats.totalUpdateTime / this.stats.updateCount;
      this.stats.lastUpdateTime = updateTime;

      this.runHooks('afterUpdate');

      if (this.config.debugMode) {
        console.log('[Runtime] ✅ Updated in', updateTime.toFixed(2), 'ms');
      }

      return this;
    } catch (error) {
      this.handleError('update', error);
      throw error;
    }
  }

  /**
   * Hot reload (development mode)
   * ✅ NOW USES VNodeRenderer
   */
  hotReload(newVNode) {
    if (!this.config.enableHotReload) {
      console.warn('[Runtime] Hot reload disabled');
      return this;
    }

    if (!this.config.isBrowser) {
      console.warn('[Runtime] Hot reload not supported in SSR mode');
      return this;
    }

    try {
      if (this.config.debugMode) {
        console.log('[Runtime] 🔥 Hot reloading...');
      }

      // ✅ USE VNODE RENDERER FOR HOT RELOAD
      if (this.vNodeRenderer && this.currentDOMElement) {
        this.currentDOMElement = this.vNodeRenderer.reconcile(
          this.currentDOMElement,
          this.rootVNode,
          newVNode
        );
      }

      this.rootVNode = newVNode;

      if (this.config.debugMode) {
        console.log('[Runtime] ✅ Hot reload complete');
      }

      return this;
    } catch (error) {
      this.handleError('hotReload', error);
      throw error;
    }
  }

  /**
   * Hydrate (SSR → CSR bridge)
   * ✅ NOW USES HYDRATOR
   */
  hydrate(hydrationData, options = {}) {
    if (!this.config.isBrowser) {
      console.warn('[Runtime] Cannot hydrate in SSR mode');
      return this;
    }

    try {
      if (this.config.debugMode) {
        console.log('[Runtime] 💧 Hydrating SSR content...');
      }

      // ✅ USE HYDRATOR TO ATTACH LISTENERS TO SSR HTML
      if (!this.hydrator) {
        this.hydrator = new Hydrator({
          rootElement: this.rootElement,
          debugMode: this.config.debugMode
        });
      }

      this.hydrator.hydrate(
        this.rootElement,
        this.rootVNode,
        hydrationData || {}
      );

      this.mounted = true;

      if (this.config.debugMode) {
        console.log('[Runtime] ✅ Hydration complete');
      }

      return this;
    } catch (error) {
      this.handleError('hydrate', error);
      throw error;
    }
  }

  /**
   * Unmount application
   * ✅ NOW USES VNodeRenderer FOR CLEANUP
   */
  unmount() {
    if (!this.mounted) {
      console.warn('[Runtime] ❌ Not mounted');
      return this;
    }

    try {
      this.runHooks('beforeUnmount');

      if (this.config.debugMode) {
        console.log('[Runtime] 🗑️  Unmounting...');
      }

      // ✅ USE VNODE RENDERER FOR CLEANUP
      if (this.vNodeRenderer && this.currentDOMElement) {
        this.vNodeRenderer.cleanup(this.currentDOMElement);
      }

      // Clear DOM
      if (this.rootElement) {
        this.rootElement.innerHTML = '';
      }

      // Clear references
      this.currentDOMElement = null;
      this.rootVNode = null;
      this.appBuilder = null;

      this.mounted = false;

      this.runHooks('afterUnmount');

      if (this.config.debugMode) {
        console.log('[Runtime] ✅ Unmounted');
      }

      return this;
    } catch (error) {
      this.handleError('unmount', error);
      throw error;
    }
  }

  /**
   * Dispose and cleanup completely
   */
  dispose() {
    if (this.mounted) {
      this.unmount();
    }

    // Clear hooks
    for (const hookName in this.hooks) {
      this.hooks[hookName] = [];
    }

    // Clear error handlers
    this.errorHandlers = [];

    // Clear component instances
    this.vNodeBuilder = null;
    this.vNodeRenderer = null;
    this.hydrator = null;

    this.initialized = false;

    if (this.config.debugMode) {
      console.log('[Runtime] ✅ Disposed');
    }
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    if (!this.config.isBrowser) return;

    window.addEventListener('error', (event) => {
      this.handleError('uncaught', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('promise', event.reason);
    });
  }

  /**
   * Handle error
   */
  handleError(source, error) {
    console.error(`[Runtime] ❌ Error in ${source}:`, error);

    this.errorHandlers.forEach(handler => {
      try {
        handler(source, error);
      } catch (e) {
        console.error('[Runtime] Error handler failed:', e);
      }
    });

    if (this.config.debugMode && this.config.isBrowser) {
      this.showErrorOverlay(source, error);
    }
  }

  /**
   * Show error overlay
   */
  showErrorOverlay(source, error) {
    if (typeof document === 'undefined') return;

    const overlay = document.getElementById('__flutterjs_error_overlay__');
    if (overlay) {
      overlay.remove();
    }

    const div = document.createElement('div');
    div.id = '__flutterjs_error_overlay__';
    div.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: monospace;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 8px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    `;

    box.innerHTML = `
      <h2 style="color: #d32f2f; margin: 0 0 20px 0;">⚠️ Runtime Error</h2>
      <p style="color: #666; margin: 0 0 10px 0;">
        <strong>Source:</strong> ${source}
      </p>
      <pre style="
        background: #f5f5f5;
        padding: 15px;
        border-radius: 4px;
        margin: 0;
        color: #c62828;
        overflow-x: auto;
      ">${error.message}</pre>
    `;

    div.appendChild(box);
    document.body.appendChild(div);
  }

  /**
   * Register lifecycle hook
   */
  on(hookName, callback) {
    if (this.hooks[hookName] && typeof callback === 'function') {
      this.hooks[hookName].push(callback);
    }
    return this;
  }

  /**
   * Run lifecycle hooks
   */
  runHooks(hookName) {
    const hooks = this.hooks[hookName] || [];
    hooks.forEach(hook => {
      try {
        hook(this);
      } catch (error) {
        console.error(`[Runtime] Hook ${hookName} failed:`, error);
      }
    });
  }

  /**
   * Register error handler
   */
  onError(handler) {
    if (typeof handler === 'function') {
      this.errorHandlers.push(handler);
    }
    return this;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      initialized: this.initialized,
      mounted: this.mounted,
      environment: this.config.isBrowser ? 'browser' : 'server',
      vnodeSize: this.rootVNode ? JSON.stringify(this.rootVNode).length : 0
    };
  }

  /**
   * Log statistics
   */
  logStats() {
    if (!this.config.debugMode) return;

    const stats = this.getStats();

    console.group('[Runtime] 📊 Statistics');
    console.log('Environment:', stats.environment);
    console.log('Mount Time:', `${stats.mountTime.toFixed(2)}ms`);
    console.log('Render Time:', `${stats.renderTime.toFixed(2)}ms`);
    console.log('Updates:', stats.updateCount);
    console.log('Avg Update Time:', `${stats.averageUpdateTime.toFixed(2)}ms`);
    console.log('VNode Size:', `${stats.vnodeSize} bytes`);
    console.groupEnd();
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.config };
  }

  isInitialized() {
    return this.initialized;
  }

  isMounted() {
    return this.mounted;
  }
}

// ============================================================================
// GLOBAL API
// ============================================================================

let globalRuntime = null;

/**
 * Create and start runtime
 */
export function runApp(rootWidgetOrVNode, options = {}) {
  if (!globalRuntime) {
    globalRuntime = new FlutterJSRuntime({
      debugMode: options.debugMode || false,
      enableHotReload: true,
      enablePerformanceTracking: true,
      mode: options.mode || 'csr'
    });
  }

  const container = options.container || 
                   options.rootElement ||
                   (isBrowser() ? document.getElementById('root') : null);

  globalRuntime.initialize({ rootElement: container });
  globalRuntime.runApp(rootWidgetOrVNode, options);

  return globalRuntime;
}

/**
 * Get global runtime instance
 */
export function getRuntime() {
  return globalRuntime;
}

/**
 * Trigger update
 */
export function updateApp(updateFn) {
  if (!globalRuntime) {
    throw new Error('No runtime instance');
  }

  if (updateFn && typeof updateFn === 'function') {
    updateFn();
  }

  globalRuntime.update({ rebuild: true, forceRender: false });
}

/**
 * Hot reload
 */
export function hotReload(newVNode) {
  if (!globalRuntime) {
    console.warn('No runtime instance');
    return;
  }

  globalRuntime.hotReload(newVNode);
}

/**
 * Dispose
 */
export function dispose() {
  if (globalRuntime) {
    globalRuntime.dispose();
    globalRuntime = null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  FlutterJSRuntime,
  runApp,
  getRuntime,
  updateApp,
  hotReload,
  dispose,
  isBrowser,
  isSSR
};