/**
 * ============================================================================
 * FlutterJS Complete Runtime Integration (UPDATED)
 * ============================================================================
 * 
 * NOW USES AppBuilder's VNode OUTPUT
 * 
 * This runtime:
 * - Receives VNode tree from AppBuilder
 * - Renders to browser DOM or SSR HTML
 * - Manages state updates and re-renders
 * - Handles hydration (SSR → CSR)
 * - Provides lifecycle hooks
 * - Tracks performance metrics
 * 
 * Location: cli/runtime/flutterjs_runtime.js
 * 
 * Usage:
 * ```javascript
 * import { FlutterJSRuntime } from './flutterjs_runtime.js';
 * 
 * const runtime = new FlutterJSRuntime({debugMode: true});
 * runtime.initialize({rootElement: document.getElementById('root')});
 * runtime.runApp(MyApp, {rootElement});
 * ```
 */

import { VNodeRenderer } from '@flutterjs/vdom/vnode_renderer';
import { Hydrator } from '@flutterjs/vdom/hydrator';


// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if code is running in browser environment
 */
function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if running in SSR mode (Node.js)
 */
function isSSR() {
  return typeof window === 'undefined';
}

// ============================================================================
// VNODE RENDERER IMPLEMENTATION
// ============================================================================

/**
 * Renders VNode tree to actual DOM elements
 */
class SimpleVNodeRenderer {
  /**
   * Render VNode to DOM element
   */
  static render(vnode, container, options = {}) {
    if (!isBrowser()) {
      throw new Error('[Runtime] Cannot render to DOM in SSR mode');
    }

    try {
      const element = this.createDOMElement(vnode);
      
      if (options.clear) {
        container.innerHTML = '';
      }
      
      container.appendChild(element);
      
      return element;
    } catch (error) {
      console.error('[Runtime] Rendering failed:', error);
      throw error;
    }
  }

  /**
   * Create actual DOM element from VNode
   */
  static createDOMElement(vnode) {
    if (vnode === null || vnode === undefined) {
      return document.createTextNode('');
    }

    // Text node
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return document.createTextNode(String(vnode));
    }

    // Element node
    if (vnode.tag) {
      const element = document.createElement(vnode.tag);

      // Set attributes
      if (vnode.props) {
        Object.entries(vnode.props).forEach(([key, value]) => {
          if (key === 'className') {
            element.className = value;
          } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
          } else if (key !== 'children' && value !== null && value !== undefined) {
            try {
              element.setAttribute(key, String(value));
            } catch (e) {
              console.warn(`[Runtime] Could not set attribute ${key}:`, e.message);
            }
          }
        });
      }

      // Set inline styles
      if (vnode.style && typeof vnode.style === 'object') {
        Object.assign(element.style, vnode.style);
      }

      // Attach event handlers
      if (vnode.events && typeof vnode.events === 'object') {
        Object.entries(vnode.events).forEach(([eventName, handler]) => {
          if (typeof handler === 'function') {
            const eventType = eventName.toLowerCase();
            element.addEventListener(eventType, handler);
          }
        });
      }

      // Add children
      if (vnode.children && Array.isArray(vnode.children)) {
        vnode.children.forEach(child => {
          const childElement = this.createDOMElement(child);
          if (childElement) {
            element.appendChild(childElement);
          }
        });
      }

      // Store reference in VNode
      vnode.ref = element;

      return element;
    }

    // Fallback
    return document.createTextNode(String(vnode));
  }

  /**
   * Render VNode tree to HTML string (SSR)
   */
  static renderToString(vnode, options = {}) {
    if (isBrowser()) {
      console.warn('[Runtime] renderToString should be called in SSR context');
    }

    try {
      return this.vnodeToString(vnode);
    } catch (error) {
      console.error('[Runtime] SSR rendering failed:', error);
      throw error;
    }
  }

  /**
   * Convert VNode to HTML string
   */
  static vnodeToString(vnode) {
    if (vnode === null || vnode === undefined) {
      return '';
    }

    // Text node
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return this.escapeHtml(String(vnode));
    }

    // Element node
    if (vnode.tag) {
      let html = `<${vnode.tag}`;

      // Add attributes
      if (vnode.props) {
        Object.entries(vnode.props).forEach(([key, value]) => {
          if (key !== 'children' && value !== null && value !== undefined) {
            html += ` ${key}="${this.escapeHtml(String(value))}"`;
          }
        });
      }

      // Add inline styles
      if (vnode.style && typeof vnode.style === 'object') {
        const styleStr = Object.entries(vnode.style)
          .map(([k, v]) => `${k}:${v}`)
          .join(';');
        html += ` style="${styleStr}"`;
      }

      html += '>';

      // Add children
      if (vnode.children && Array.isArray(vnode.children)) {
        vnode.children.forEach(child => {
          html += this.vnodeToString(child);
        });
      }

      // Close tag
      html += `</${vnode.tag}>`;

      return html;
    }

    return '';
  }

  /**
   * Escape HTML special characters
   */
  static escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Update DOM with new VNode tree (diff/patch)
   */
  static update(oldElement, newVNode) {
    if (!isBrowser()) {
      throw new Error('[Runtime] Cannot update DOM in SSR mode');
    }

    // Simple approach: rebuild entire element
    // In production, would use sophisticated diffing algorithm
    const parent = oldElement.parentElement;
    if (parent) {
      const newElement = this.createDOMElement(newVNode);
      parent.replaceChild(newElement, oldElement);
      return newElement;
    }

    return oldElement;
  }

  /**
   * Cleanup event listeners and references
   */
  static cleanup(element) {
    if (!element) return;

    // Remove event listeners
    if (element._vnodeEvents) {
      Object.entries(element._vnodeEvents).forEach(([eventName, handler]) => {
        element.removeEventListener(eventName, handler);
      });
      delete element._vnodeEvents;
    }

    // Recursively cleanup children
    Array.from(element.children).forEach(child => {
      this.cleanup(child);
    });

    // Clear references
    if (element._vnode) {
      element._vnode.ref = null;
    }
  }
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

    // AppBuilder reference
    this.appBuilder = null;

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
      console.log('[Runtime] âœ" Instance created', {
        environment: this.config.isBrowser ? 'browser' : 'server',
        mode: this.config.mode
      });
    }
  }

  /**
   * Initialize runtime
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

      this.initialized = true;
      this.stats.initTime = performance.now() - startTime;

      this.runHooks('afterInit');

      if (this.config.debugMode) {
        console.log('[Runtime] âœ" Initialized in', this.stats.initTime.toFixed(2), 'ms');
      }

      return this;
    } catch (error) {
      this.handleError('initialization', error);
      throw error;
    }
  }

  /**
   * MAIN METHOD: Run application
   * 
   * Receives VNode tree from AppBuilder and renders it
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

      // Determine if we have a VNode or a Widget class
      const isVNode = widgetOrVNode && widgetOrVNode.tag !== undefined;
      const isWidget = widgetOrVNode && widgetOrVNode.build !== undefined;

      if (isVNode) {
        // Use VNode directly from AppBuilder
        this.rootVNode = widgetOrVNode;
        if (this.config.debugMode) {
          console.log('[Runtime] Using VNode from AppBuilder');
        }
      } else if (isWidget) {
        // Build VNode from widget (fallback)
        console.warn('[Runtime] Received widget instead of VNode - building VNode');
        if (typeof widgetOrVNode.build === 'function') {
          this.rootVNode = widgetOrVNode.build({});
        } else {
          this.rootVNode = widgetOrVNode;
        }
      } else {
        throw new Error('[Runtime] Invalid input: expected VNode or Widget');
      }

      // Store reference to AppBuilder if provided
      if (options.appBuilder) {
        this.appBuilder = options.appBuilder;
      }

      // Render to DOM
      if (this.config.isBrowser && this.rootElement) {
        this.renderToDOM();
      } else if (this.config.isSSR) {
        this.renderToString();
      }

      this.mounted = true;
      this.stats.mountTime = performance.now() - startTime;

      this.runHooks('afterMount');

      if (this.config.debugMode) {
        console.log('[Runtime] âœ" Mounted in', this.stats.mountTime.toFixed(2), 'ms');
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

      // Use VNodeRenderer to convert VNode to DOM
      this.currentDOMElement = SimpleVNodeRenderer.render(
        this.rootVNode,
        this.rootElement,
        { clear: true }
      );

      this.stats.renderTime = performance.now() - startTime;

      if (this.config.debugMode) {
        console.log('[Runtime] âœ" Rendered to DOM in', this.stats.renderTime.toFixed(2), 'ms');
      }
    } catch (error) {
      console.error('[Runtime] DOM rendering failed:', error);
      throw error;
    }
  }

  /**
   * Render VNode to HTML string (SSR)
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
      const html = SimpleVNodeRenderer.renderToString(this.rootVNode);

      if (this.config.debugMode) {
        console.log('[Runtime] âœ" Generated SSR HTML:', html.length, 'bytes');
      }

      return html;
    } catch (error) {
      console.error('[Runtime] SSR rendering failed:', error);
      throw error;
    }
  }

  /**
   * Update application (after state change)
   */
  update(options = {}) {
    if (!this.mounted) {
      console.warn('[Runtime] Cannot update: app not mounted');
      return this;
    }

    const startTime = performance.now();

    try {
      this.runHooks('beforeUpdate');

      if (this.config.debugMode) {
        console.log('[Runtime] Updating...');
      }

      // If AppBuilder is available, rebuild VNode tree
      if (this.appBuilder && options.rebuild !== false) {
        if (this.config.debugMode) {
          console.log('[Runtime] Rebuilding widget tree with AppBuilder...');
        }

        // Rebuild should be done by AppBuilder when state changes
        // This is just a placeholder
      }

      // Re-render if in browser
      if (this.config.isBrowser && this.rootVNode) {
        if (this.currentDOMElement) {
          this.currentDOMElement = SimpleVNodeRenderer.update(
            this.currentDOMElement,
            this.rootVNode
          );
        } else {
          this.renderToDOM();
        }
      }

      const updateTime = performance.now() - startTime;
      this.stats.updateCount++;
      this.stats.totalUpdateTime += updateTime;
      this.stats.averageUpdateTime = this.stats.totalUpdateTime / this.stats.updateCount;
      this.stats.lastUpdateTime = updateTime;

      this.runHooks('afterUpdate');

      if (this.config.debugMode) {
        console.log('[Runtime] âœ" Updated in', updateTime.toFixed(2), 'ms');
      }

      return this;
    } catch (error) {
      this.handleError('update', error);
      throw error;
    }
  }

  /**
   * Hot reload (development mode)
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
        console.log('[Runtime] ðŸ"¥ Hot reloading...');
      }

      // Update VNode tree
      this.rootVNode = newVNode;

      // Re-render
      if (this.currentDOMElement && this.rootElement) {
        SimpleVNodeRenderer.cleanup(this.currentDOMElement);
        this.renderToDOM();
      }

      if (this.config.debugMode) {
        console.log('[Runtime] âœ" Hot reload complete');
      }

      return this;
    } catch (error) {
      this.handleError('hotReload', error);
      throw error;
    }
  }

  /**
   * Hydrate (SSR → CSR bridge)
   */
  hydrate(hydrationData, options = {}) {
    if (!this.config.isBrowser) {
      console.warn('[Runtime] Cannot hydrate in SSR mode');
      return this;
    }

    try {
      if (this.config.debugMode) {
        console.log('[Runtime] Hydrating SSR content...');
      }

      // Use hydrator to attach listeners to SSR-rendered HTML
      if (Hydrator && typeof Hydrator.hydrate === 'function') {
        Hydrator.hydrate(
          this.rootElement,
          this.rootVNode,
          hydrationData
        );
      }

      this.mounted = true;

      if (this.config.debugMode) {
        console.log('[Runtime] âœ" Hydration complete');
      }

      return this;
    } catch (error) {
      this.handleError('hydrate', error);
      throw error;
    }
  }

  /**
   * Unmount application
   */
  unmount() {
    if (!this.mounted) {
      console.warn('[Runtime] Not mounted');
      return this;
    }

    try {
      this.runHooks('beforeUnmount');

      if (this.config.debugMode) {
        console.log('[Runtime] Unmounting...');
      }

      // Cleanup DOM
      if (this.currentDOMElement) {
        SimpleVNodeRenderer.cleanup(this.currentDOMElement);
      }

      // Clear references
      this.rootElement.innerHTML = '';
      this.currentDOMElement = null;
      this.rootVNode = null;
      this.appBuilder = null;

      this.mounted = false;

      this.runHooks('afterUnmount');

      if (this.config.debugMode) {
        console.log('[Runtime] âœ" Unmounted');
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

    this.initialized = false;

    if (this.config.debugMode) {
      console.log('[Runtime] âœ" Disposed');
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
    console.error(`[Runtime] Error in ${source}:`, error);

    this.errorHandlers.forEach(handler => {
      try {
        handler(source, error);
      } catch (e) {
        console.error('[Runtime] Error handler failed:', e);
      }
    });

    // Show error overlay in development mode
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
      <h2 style="color: #d32f2f; margin: 0 0 20px 0;">
        ðŸ'¥ Runtime Error
      </h2>
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

    console.group('[Runtime] Statistics');
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

  globalRuntime.update({ rebuild: false });
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