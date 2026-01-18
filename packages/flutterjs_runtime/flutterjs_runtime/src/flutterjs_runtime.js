/**
 * FlutterJS Runtime - Complete Production Version
 * 
 * FIXED: Handles both Widget and VNode inputs correctly
 */

import {
  VNodeRuntime,
  runApp as coreRunApp,
  getRuntime as coreGetRuntime,
  updateApp as coreUpdateApp,
  getMetrics as coreGetMetrics,
  hotReload as coreHotReload,
  renderToString as coreRenderToString,
  hydrate as coreHydrate
} from '@flutterjs/vdom/runtime_index';

import {
  StatelessElement,
  StatefulElement,
  ComponentElement
} from '@flutterjs/runtime/element';
import { InheritedElement } from '@flutterjs/runtime/inherited_element';
import { VNodeBuilder } from '@flutterjs/vdom/vnode_builder';
import { VNodeRenderer } from '@flutterjs/vdom/vnode_renderer';

// ============================================================================
// UTILITIES
// ============================================================================

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isSSR() {
  return typeof window === 'undefined';
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function generateId() {
  return `fjs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function deepMerge(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Check if input is a VNode (already built)
 */
function isVNode(obj) {
  return obj && (
    // Must have a tag property (HTML element name)
    obj.tag !== undefined &&
    // Should have props and/or children (VNode structure)
    (obj.props !== undefined || obj.children !== undefined) &&
    // Should NOT have widget-specific properties
    obj.build === undefined &&
    obj.createState === undefined &&
    obj.createElement === undefined
  );
}

/**
 * Check if input is a Widget (needs building)
 */
function isWidget(obj) {
  return obj && (
    typeof obj.build === 'function' ||
    typeof obj.createState === 'function' ||
    typeof obj.render === 'function' ||
    typeof obj.createElement === 'function'
  );
}

// ============================================================================
// ENHANCED RUNTIME CLASS
// ============================================================================

export class FlutterJSRuntime extends VNodeRuntime {
  constructor(options = {}) {
    super();

    // ✅ Polyfill global print if implicit
    if (typeof window !== 'undefined' && !window.dartPrint) {
      window.dartPrint = (msg) => console.log(msg);
      // Also map standard print if not native
      if (!window.print || window.print === window.constructor.prototype.print) {
        console.log("[FlutterJSRuntime] Polyfilling window.print for Dart");
        window.print = window.dartPrint;
      }
    }

    // Additional Flutter-specific configuration
    this.flutterConfig = {
      debugMode: options.debugMode || false,
      enableHotReload: options.enableHotReload !== false,
      enableStateTracking: options.enableStateTracking !== false,
      enablePerformanceTracking: options.enablePerformanceTracking !== false,
      enableErrorBoundaries: options.enableErrorBoundaries !== false,
      target: options.target || 'web',
      isBrowser: isBrowser(),
      isSSR: isSSR(),
      strictMode: options.strictMode || false,
      ...options
    };

    // Track initialization state
    this.initialized = false;
    this.mounted = false;

    // Store original input for rebuilds
    this.originalInput = null;
    this.inputType = null; // 'widget' or 'vnode'

    // Element registry for tracking all created elements
    this.elementRegistry = new Map();

    // Widget instance cache
    this.widgetCache = new WeakMap();

    // Error boundary stack
    this.errorBoundaries = [];

    // Lifecycle callbacks
    this.lifecycleCallbacks = {
      onElementCreated: [],
      onElementMounted: [],
      onElementUpdated: [],
      onElementUnmounted: [],
      onError: [],
      onStateChange: []
    };

    // Performance tracking
    this.performanceMarks = new Map();

    // Setup error handling
    this.setupErrorHandling();

    if (this.flutterConfig.debugMode) {
      console.log('[FlutterJSRuntime] ✅ Enhanced runtime created', {
        environment: this.flutterConfig.isBrowser ? 'browser' : 'server',
        hotReload: this.flutterConfig.enableHotReload,
        strictMode: this.flutterConfig.strictMode
      });
    }
  }

  // ============================================================================
  // INITIALIZE METHOD
  // ============================================================================

  initialize(options = {}) {
    if (this.initialized) {
      if (this.flutterConfig.debugMode) {
        console.log('[FlutterJSRuntime] ⚠️  Already initialized, skipping');
      }
      return this;
    }

    const startTime = performance.now();

    try {
      // Initialize dirty elements set
      this.dirtyElements = new Set();
      this.isBatchSchedulled = false;

      if (this.flutterConfig.debugMode) {
        console.log('[FlutterJSRuntime] 🔧 Initializing runtime...');
      }

      // Store root element if provided
      if (options.rootElement) {
        this.rootElement = options.rootElement;

        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime] 📍 Root element set:', this.rootElement.id || this.rootElement.tagName);
        }
      }

      // Validate browser environment if root element expected
      if (this.flutterConfig.isBrowser && !this.rootElement) {
        console.warn('[FlutterJSRuntime] ⚠️  No root element provided in browser mode');
      }

      // Mark as initialized
      this.initialized = true;

      const initTime = performance.now() - startTime;

      if (this.flutterConfig.debugMode) {
        console.log(`[FlutterJSRuntime] ✅ Initialized in ${initTime.toFixed(2)}ms`);
      }

      return this;

    } catch (error) {
      this.handleError('initialize', error, { options });
      throw error;
    }
  }

  // ============================================================================
  // CORE FLUTTER WIDGET SYSTEM METHODS
  // ============================================================================

  createElement(widget, parent = null) {
    if (!widget) {
      throw new Error('[FlutterJSRuntime.createElement] Widget is required');
    }

    const startTime = this.flutterConfig.enablePerformanceTracking
      ? performance.now()
      : 0;

    try {
      if (this.flutterConfig.debugMode) {
        console.log('[FlutterJSRuntime.createElement] Creating element for:', widget.constructor.name);
      }

      let element = null;

      // Check widget cache first
      if (this.widgetCache.has(widget)) {
        const cachedElement = this.widgetCache.get(widget);
        if (cachedElement && !cachedElement.unmounted) {
          if (this.flutterConfig.debugMode) {
            console.log('[FlutterJSRuntime.createElement] Using cached element');
          }
          return cachedElement;
        }
      }

      // Determine widget type and create appropriate element

      if (this.isStatelessWidget(widget)) {
        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime.createElement] → StatelessElement');
        }
        element = new StatelessElement(widget, parent, this);
      }
      else if (this.isStatefulWidget(widget)) {
        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime.createElement] → StatefulElement');
        }
        element = new StatefulElement(widget, parent, this);
      }
      else if (this.isInheritedWidget(widget)) {
        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime.createElement] → InheritedElement');
        }
        element = new InheritedElement(widget, parent, this);
      }
      else if (this.isComponentWidget(widget)) {
        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime.createElement] → ComponentElement');
        }
        element = new ComponentElement(widget, parent, this);
      }
      else if (typeof widget.createElement === 'function') {
        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime.createElement] → Custom createElement');
        }
        element = widget.createElement(parent, this);
      }
      else {
        throw new Error(
          `[FlutterJSRuntime.createElement] Unknown widget type: ${widget.constructor.name}. ` +
          `Widget must be StatelessWidget, StatefulWidget, InheritedWidget, or implement createElement().`
        );
      }

      // Register element
      if (element) {
        const elementId = generateId();
        element._id = elementId;
        this.elementRegistry.set(elementId, element);

        // Cache element
        this.widgetCache.set(widget, element);

        // Trigger lifecycle callback
        this.triggerLifecycleCallback('onElementCreated', element);
      }

      // Performance tracking
      if (this.flutterConfig.enablePerformanceTracking) {
        const duration = performance.now() - startTime;
        this.recordPerformance('createElement', widget.constructor.name, duration);
      }

      return element;

    } catch (error) {
      this.handleError('createElement', error, { widget, parent });
      throw error;
    }
  }

  isStatelessWidget(widget) {
    if (!widget) return false;
    if (widget.constructor.name === 'StatelessWidget') return true;
    if (widget.constructor.prototype &&
      widget.constructor.prototype.constructor.name === 'StatelessWidget') {
      return true;
    }
    return typeof widget.build === 'function' &&
      !widget.createState &&
      !widget.child &&
      !widget.updateShouldNotify;
  }

  isStatefulWidget(widget) {
    if (!widget) return false;
    if (widget.constructor.name === 'StatefulWidget') return true;
    if (widget.constructor.prototype &&
      widget.constructor.prototype.constructor.name === 'StatefulWidget') {
      return true;
    }
    return typeof widget.createState === 'function';
  }

  isInheritedWidget(widget) {
    if (!widget) return false;
    if (widget.constructor.name === 'InheritedWidget') return true;
    if (widget.constructor.prototype &&
      widget.constructor.prototype.constructor.name === 'InheritedWidget') {
      return true;
    }
    return widget.child !== undefined &&
      typeof widget.updateShouldNotify === 'function';
  }

  isComponentWidget(widget) {
    if (!widget) return false;
    if (typeof widget.render === 'function') return true;
    return typeof widget.build === 'function' &&
      typeof widget.createState !== 'function' &&
      !widget.updateShouldNotify;
  }

  // ============================================================================
  // ENHANCED RUNTIME METHODS - KEY FIX HERE
  // ============================================================================

  /**
   * ✅ FIXED: runApp now handles both Widget and VNode inputs
   */
  runApp(input, options = {}) {
    try {
      // Ensure we're initialized first
      if (!this.initialized) {
        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime] Auto-initializing before runApp');
        }
        this.initialize({ rootElement: this.rootElement || options.rootElement });
      }

      if (this.flutterConfig.debugMode) {
        console.log('[FlutterJSRuntime] 🚀 Starting Flutter app...');
      }

      // Store original input for rebuilds
      this.originalInput = input;

      // Detect input type
      const inputIsVNode = isVNode(input);
      const inputIsWidget = isWidget(input);

      if (this.flutterConfig.debugMode) {
        console.log('[FlutterJSRuntime] Input type:', {
          isVNode: inputIsVNode,
          isWidget: inputIsWidget,
          constructorName: input?.constructor?.name,
          hasTag: input?.tag !== undefined,
          hasBuild: typeof input?.build === 'function'
        });
      }

      if (inputIsVNode) {
        // ✅ CASE 1: Already a VNode - render directly
        this.inputType = 'vnode';

        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime] 📦 Input is VNode, rendering directly');
        }

        // ✅ FIX: Set this.app so getMetrics() works
        this.app = input;
        this.rootVNode = input;

        // Render to DOM if in browser
        if (this.flutterConfig.isBrowser && this.rootElement) {
          if (!this.renderer) {
            this.renderer = new VNodeRenderer({ debugMode: this.flutterConfig.debugMode });
          }
          this.renderer.render(this.rootVNode, this.rootElement, { clear: true });
        }

        this.mounted = true;

        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime] ✅ VNode rendered directly');
        }

        return this;

      } else if (inputIsWidget) {
        // ✅ CASE 2: Widget - build to VNode first, then render
        this.inputType = 'widget';

        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime] 🔧 Input is Widget, building VNode...');
        }

        // ✅ FIX: Set this.app so getMetrics() works
        this.app = input;

        // Create enhanced context with runtime
        const context = this.createBuildContext({
          ...options,
          runtime: this,
          flutterConfig: this.flutterConfig
        });

        // Build widget to VNode
        const vNodeBuilder = new VNodeBuilder({
          debugMode: this.flutterConfig.debugMode,
          runtime: this
        });

        this.rootVNode = vNodeBuilder.build(input, context);

        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime] ✅ VNode built from Widget');
        }

        // Render to DOM if in browser
        if (this.flutterConfig.isBrowser && this.rootElement) {
          if (!this.renderer) {
            this.renderer = new VNodeRenderer({ debugMode: this.flutterConfig.debugMode });
          }
          this.renderer.render(this.rootVNode, this.rootElement, { clear: true });
        }

        this.mounted = true;

        if (this.flutterConfig.debugMode) {
          console.log('[FlutterJSRuntime] ✅ Widget rendered to DOM');
        }

        return this;

      } else {
        // ✅ CASE 3: Unknown type - error
        throw new Error(
          `[FlutterJSRuntime] Invalid input type. Expected Widget or VNode, got: ${typeof input}. ` +
          `Constructor: ${input?.constructor?.name || 'unknown'}`
        );
      }

    } catch (error) {
      this.handleError('runApp', error, { input, options });
      throw error;
    }
  }

  /**
   * Override update to handle both Widget and VNode rebuilds
   */
  update(updateFn) {
    try {
      if (this.flutterConfig.debugMode) {
        console.log('[FlutterJSRuntime] 🔄 Updating application...');
      }

      // Execute update function if provided
      if (updateFn && typeof updateFn === 'function') {
        updateFn();
      }

      // Rebuild based on input type
      if (this.inputType === 'widget' && this.originalInput) {
        // Rebuild from widget
        const context = this.createBuildContext({
          runtime: this,
          flutterConfig: this.flutterConfig
        });

        const vNodeBuilder = new VNodeBuilder({
          debugMode: this.flutterConfig.debugMode,
          runtime: this
        });

        const newVNode = vNodeBuilder.build(this.originalInput, context);

        if (this.renderer && this.rootElement) {
          this.renderer.render(newVNode, this.rootElement, { clear: true });
        }

        this.rootVNode = newVNode;

      } else if (this.inputType === 'vnode') {
        // For VNode input, user must provide new VNode
        console.warn('[FlutterJSRuntime] Cannot auto-rebuild from VNode. Provide new VNode to update().');
      }

      this.triggerLifecycleCallback('onStateChange', {
        timestamp: Date.now(),
        updateFn: updateFn ? updateFn.name : 'anonymous'
      });

      if (this.flutterConfig.debugMode) {
        console.log('[FlutterJSRuntime] ✅ Update complete');
      }

    } catch (error) {
      this.handleError('update', error, { updateFn });
      throw error;
    }
  }

  /**
   * Mark an element as needing a rebuild
   * @param {Element} element - The element to rebuild
   */
  markNeedsBuild(element) {
    if (this.flutterConfig.debugMode) {
      console.log(`[FlutterJSRuntime] 🏗️ markNeedsBuild called for ${element.widget?.constructor.name}`);
    }

    if (!this.dirtyElements) {
      this.dirtyElements = new Set();
    }

    // ✅ Add to dirty set
    this.dirtyElements.add(element);

    // ✅ Schedule batch update (microtask)
    if (!this.isBatchSchedulled) {
      this.isBatchSchedulled = true;
      Promise.resolve().then(() => this.processBuildQueue());
    }
  }

  /**
   * Process the build queue and rebuild only dirty elements
   */
  processBuildQueue() {
    if (this.flutterConfig.debugMode) {
      console.log(`[FlutterJSRuntime] 🔄 Processing build queue (size: ${this.dirtyElements.size})`);
    }

    this.isBatchSchedulled = false;

    // Snapshot of elements to rebuild
    const elements = Array.from(this.dirtyElements);
    this.dirtyElements.clear(); // Clear immediately so new updates can be queued

    // Sort by depth (parents before children) to avoid redundant rebuilds
    elements.sort((a, b) => (a.depth || 0) - (b.depth || 0));

    for (const element of elements) {
      // Check if element is still mounted and marked dirty
      // (It might have been unmounted by a parent rebuild)
      if (element.mounted && element.dirty) {
        try {
          if (this.flutterConfig.debugMode) {
            console.log(`[FlutterJSRuntime] 🔨 Rebuilding dirty element: ${element.widget?.constructor.name}`);
          }

          // ✅ Targeted Rebuild:
          // element.rebuild() calls performRebuild() -> gets new VNode
          // AND calls applyChanges() -> patches the DOM specifically for this element
          element.rebuild();

        } catch (e) {
          console.error(`[FlutterJSRuntime] Error rebuilding element ${element.widget?.constructor.name}:`, e);
          this.handleError('rebuild', e, { element: element.toString() });
        }
      }
    }

    // Check if more updates were queued during processing
    if (this.dirtyElements.size > 0) {
      if (this.flutterConfig.debugMode) {
        console.log(`[FlutterJSRuntime] 🔄 More updates queued during batch, scheduling next batch...`);
      }
      Promise.resolve().then(() => this.processBuildQueue());
    }
  }

  onElementMounted(element) {
    if (!element) return;
    if (this.flutterConfig.debugMode) {
      console.log('[FlutterJSRuntime] 🔌 Element mounted:', element.widget?.constructor.name);
    }
    this.triggerLifecycleCallback('onElementMounted', element);
  }

  onElementUpdated(element) {
    if (!element) return;
    if (this.flutterConfig.debugMode) {
      console.log('[FlutterJSRuntime] 🔄 Element updated:', element.widget?.constructor.name);
    }
    this.triggerLifecycleCallback('onElementUpdated', element);
  }

  onElementUnmounted(element) {
    if (!element) return;
    if (this.flutterConfig.debugMode) {
      console.log('[FlutterJSRuntime] 🗑️ Element unmounted:', element.widget?.constructor.name);
    }
    if (element._id) {
      this.elementRegistry.delete(element._id);
    }
    if (element.widget) {
      this.widgetCache.delete(element.widget);
    }
    this.triggerLifecycleCallback('onElementUnmounted', element);
  }

  // ============================================================================
  // LIFECYCLE CALLBACKS
  // ============================================================================

  on(eventName, callback) {
    if (this.lifecycleCallbacks[eventName] && typeof callback === 'function') {
      this.lifecycleCallbacks[eventName].push(callback);
      if (this.flutterConfig.debugMode) {
        console.log(`[FlutterJSRuntime] 📝 Registered callback for: ${eventName}`);
      }
    } else {
      console.warn(`[FlutterJSRuntime] Unknown event: ${eventName}`);
    }
    return this;
  }

  off(eventName, callback) {
    if (this.lifecycleCallbacks[eventName]) {
      const index = this.lifecycleCallbacks[eventName].indexOf(callback);
      if (index > -1) {
        this.lifecycleCallbacks[eventName].splice(index, 1);
      }
    }
    return this;
  }

  triggerLifecycleCallback(eventName, data) {
    const callbacks = this.lifecycleCallbacks[eventName] || [];
    callbacks.forEach(callback => {
      try {
        callback(data, this);
      } catch (error) {
        console.error(`[FlutterJSRuntime] Callback error (${eventName}):`, error);
      }
    });
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  setupErrorHandling() {
    if (!this.flutterConfig.isBrowser) return;
    if (this._errorHandlingSetup) return;
    this._errorHandlingSetup = true;

    const errorHandler = (event) => {
      this.handleError('uncaught', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const rejectionHandler = (event) => {
      this.handleError('promise', event.reason, {
        promise: event.promise
      });
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    this._errorHandlers = { errorHandler, rejectionHandler };
  }

  handleError(source, error, context = {}) {
    const errorInfo = {
      source,
      error,
      context,
      timestamp: Date.now(),
      stack: error instanceof Error ? error.stack : null
    };

    console.error(`[FlutterJSRuntime] ❌ Error in ${source}:`, error);

    if (this.flutterConfig.debugMode && error instanceof Error && error.stack) {
      console.error('[FlutterJSRuntime] Stack trace:', error.stack);
    }

    this.triggerLifecycleCallback('onError', errorInfo);

    if (this.flutterConfig.debugMode && this.flutterConfig.isBrowser) {
      this.showErrorOverlay(source, error, context);
    }
  }

  showErrorOverlay(source, error, context) {
    try {
      if (typeof document === 'undefined') return;

      const existing = document.getElementById('__flutterjs_error_overlay__');
      if (existing) existing.remove();

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error && error.stack
        ? error.stack.split('\n').slice(0, 10).join('\n')
        : 'No stack trace available';

      const overlay = document.createElement('div');
      overlay.id = '__flutterjs_error_overlay__';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.9); color: white; z-index: 999999;
        overflow-y: auto; font-family: 'Monaco', 'Menlo', monospace;
        font-size: 13px; padding: 20px;
      `;

      overlay.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
            padding: 20px; border-radius: 8px 8px 0 0; display: flex;
            align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2);
                border-radius: 50%; display: flex; align-items: center;
                justify-content: center; font-size: 24px;">⚠</div>
              <div>
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">
                  ${escapeHtml(source.charAt(0).toUpperCase() + source.slice(1))} Error
                </h2>
                <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 12px;">
                  FlutterJS Runtime Error
                </p>
              </div>
            </div>
            <button onclick="this.parentElement.parentElement.parentElement.remove()"
              style="background: rgba(255,255,255,0.2); border: none; color: white;
              width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
              font-size: 18px;">×</button>
          </div>
          <div style="background: #1e1e1e; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="margin-bottom: 20px;">
              <h3 style="color: #ff6b6b; margin: 0 0 12px 0; font-size: 14px;
                font-weight: 600; text-transform: uppercase;">Error Message</h3>
              <pre style="background: #2d2d2d; padding: 16px; border-radius: 6px;
                border-left: 4px solid #d32f2f; margin: 0; overflow-x: auto;
                color: #ff8a80; line-height: 1.5;">${escapeHtml(errorMessage)}</pre>
            </div>
            ${errorStack && errorStack !== 'No stack trace available' ? `
              <div style="margin-bottom: 20px;">
                <h3 style="color: #64b5f6; margin: 0 0 12px 0; font-size: 14px;
                  font-weight: 600; text-transform: uppercase;">Stack Trace</h3>
                <pre style="background: #2d2d2d; padding: 16px; border-radius: 6px;
                  border-left: 4px solid #1976d2; margin: 0; overflow-x: auto;
                  color: #90caf9; line-height: 1.6; font-size: 12px;">${escapeHtml(errorStack)}</pre>
              </div>
            ` : ''}
            ${Object.keys(context).length > 0 ? `
              <div>
                <h3 style="color: #81c784; margin: 0 0 12px 0; font-size: 14px;
                  font-weight: 600; text-transform: uppercase;">Context</h3>
                <pre style="background: #2d2d2d; padding: 16px; border-radius: 6px;
                  border-left: 4px solid #388e3c; margin: 0; overflow-x: auto;
                  color: #a5d6a7; line-height: 1.6; font-size: 12px;">${escapeHtml(JSON.stringify(context, null, 2))}</pre>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
    } catch (e) {
      console.error('[FlutterJSRuntime] Failed to show error overlay:', e);
    }
  }

  // ============================================================================
  // PERFORMANCE & UTILITIES
  // ============================================================================

  recordPerformance(operation, identifier, duration) {
    if (!this.flutterConfig.enablePerformanceTracking) return;
    const key = `${operation}:${identifier}`;
    if (!this.performanceMarks.has(key)) {
      this.performanceMarks.set(key, {
        count: 0, totalTime: 0, avgTime: 0,
        minTime: Infinity, maxTime: 0
      });
    }
    const mark = this.performanceMarks.get(key);
    mark.count++;
    mark.totalTime += duration;
    mark.avgTime = mark.totalTime / mark.count;
    mark.minTime = Math.min(mark.minTime, duration);
    mark.maxTime = Math.max(mark.maxTime, duration);
  }

  getPerformanceReport() {
    const report = {};
    this.performanceMarks.forEach((data, key) => {
      report[key] = {
        calls: data.count,
        total: `${data.totalTime.toFixed(2)}ms`,
        average: `${data.avgTime.toFixed(2)}ms`,
        min: `${data.minTime.toFixed(2)}ms`,
        max: `${data.maxTime.toFixed(2)}ms`
      };
    });
    return report;
  }

  clearPerformanceMarks() {
    this.performanceMarks.clear();
  }

  getFlutterConfig() {
    return { ...this.flutterConfig };
  }

  getElementById(elementId) {
    return this.elementRegistry.get(elementId);
  }

  getAllElements() {
    return Array.from(this.elementRegistry.values());
  }

  getElementCount() {
    return this.elementRegistry.size;
  }

  isInitialized() {
    return this.initialized;
  }

  isMounted() {
    return this.mounted;
  }

  getStats() {
    const baseMetrics = this.getMetrics();

    // ✅ FIX: Handle null baseMetrics
    if (!baseMetrics) {
      return {
        flutter: {
          elements: this.elementRegistry.size,
          cachedWidgets: this.widgetCache ? 'enabled' : 'disabled',
          inputType: this.inputType,
          initialized: this.initialized,
          mounted: this.mounted,
          hasApp: this.app !== null,
          lifecycleCallbacks: Object.keys(this.lifecycleCallbacks).reduce((acc, key) => {
            acc[key] = this.lifecycleCallbacks[key].length;
            return acc;
          }, {})
        }
      };
    }

    return {
      ...baseMetrics,
      flutter: {
        elements: this.elementRegistry.size,
        cachedWidgets: this.widgetCache ? 'enabled' : 'disabled',
        inputType: this.inputType,
        lifecycleCallbacks: Object.keys(this.lifecycleCallbacks).reduce((acc, key) => {
          acc[key] = this.lifecycleCallbacks[key].length;
          return acc;
        }, {})
      }
    };
  }

  destroy() {
    if (this.flutterConfig.debugMode) {
      console.log('[FlutterJSRuntime] 🗑️ Destroying...');
    }
    if (this._errorHandlers && this.flutterConfig.isBrowser) {
      window.removeEventListener('error', this._errorHandlers.errorHandler);
      window.removeEventListener('unhandledrejection', this._errorHandlers.rejectionHandler);
    }
    this.elementRegistry.clear();
    this.widgetCache = new WeakMap();
    Object.keys(this.lifecycleCallbacks).forEach(key => {
      this.lifecycleCallbacks[key] = [];
    });
    this.performanceMarks.clear();
    super.destroy();
    this.initialized = false;
    this.mounted = false;
    if (this.flutterConfig.debugMode) {
      console.log('[FlutterJSRuntime] ✅ Destroyed');
    }
  }
}

// ============================================================================
// GLOBAL API
// ============================================================================


let globalFlutterRuntime = null;

export function runApp(rootWidgetOrVNode, options = {}) {
  try {
    if (globalFlutterRuntime) {
      if (options.debugMode) {
        console.log('[FlutterJS] ♻️ Reusing existing runtime');
      }
    } else {
      if (options.debugMode) {
        console.log('[FlutterJS] 🆕 Creating new Flutter runtime');
      }
      globalFlutterRuntime = new FlutterJSRuntime({
        debugMode: options.debugMode || false,
        enableHotReload: options.enableHotReload !== false,
        enablePerformanceTracking: options.enablePerformanceTracking !== false,
        enableStateTracking: options.enableStateTracking !== false,
        enableErrorBoundaries: options.enableErrorBoundaries !== false,
        strictMode: options.strictMode || false,
        mode: options.mode || 'csr'
      });
    }

    const enhancedOptions = {
      ...options,
      context: {
        ...options.context,
        runtime: globalFlutterRuntime
      }
    };

    return globalFlutterRuntime.runApp(rootWidgetOrVNode, enhancedOptions);

  } catch (error) {
    console.error('[FlutterJS] ❌ Failed to run app:', error);
    throw error;
  }
}

export function getRuntime() {
  return globalFlutterRuntime;
}

export function updateApp(updateFn) {
  if (!globalFlutterRuntime) {
    throw new Error('[FlutterJS] No runtime instance. Call runApp() first.');
  }

  if (updateFn && typeof updateFn === 'function') {
    updateFn();
  }

  globalFlutterRuntime.update();
}

export function hotReload() {
  if (!globalFlutterRuntime) {
    console.warn('[FlutterJS] No runtime instance');
    return;
  }

  globalFlutterRuntime.hotReload();
}

/**
 * Server-side render to HTML string
 * 
 * This renders a Flutter app to an HTML string for server-side rendering.
 * The resulting HTML can be sent to the client and hydrated.
 * 
 * @param {Widget} app - Root widget
 * @param {Object} options - SSR options
 * @param {string} options.title - Page title
 * @param {Object} options.meta - Meta tags
 * @param {Array} options.styles - External stylesheets
 * @param {Array} options.scripts - External scripts
 * @param {boolean} options.includeHydration - Include hydration data (default: true)
 * @param {boolean} options.includeCriticalCSS - Include critical CSS (default: true)
 * @param {boolean} options.includeRuntime - Include runtime script (default: true)
 * @returns {string} HTML string
 */
export function renderToString(app, options = {}) {
  try {
    if (options.debugMode) {
      console.log('[FlutterJS] ðŸ“„ SSR: Creating temporary runtime for rendering');
    }

    // Create temporary Flutter runtime for SSR
    const ssrRuntime = new FlutterJSRuntime({
      debugMode: options.debugMode || false,
      mode: 'ssr'
    });

    // Enhanced context with Flutter runtime
    const enhancedOptions = {
      ...options,
      context: {
        ...options.context,
        runtime: ssrRuntime // âœ… Pass Flutter runtime with createElement
      }
    };

    // Use core renderToString with enhanced context
    const html = coreRenderToString(app, enhancedOptions);

    // Cleanup SSR runtime
    ssrRuntime.destroy();

    return html;

  } catch (error) {
    console.error('[FlutterJS] âŒ SSR failed:', error);
    throw error;
  }
}

/**
 * Hydrate server-rendered content
 * 
 * This attaches event listeners and makes a server-rendered app interactive.
 * Should be called on the client after receiving SSR HTML.
 * 
 * @param {Widget} app - Root widget (must match SSR widget)
 * @param {Object} options - Hydration options
 * @param {string} options.target - CSS selector for root element (default: '#root')
 * @param {boolean} options.debugMode - Enable debug logging
 * @returns {FlutterJSRuntime} Runtime instance
 */
export function hydrate(app, options = {}) {
  try {
    if (options.debugMode) {
      console.log('[FlutterJS] ðŸ’§ Starting hydration...');
    }

    if (!globalFlutterRuntime) {
      globalFlutterRuntime = new FlutterJSRuntime({
        debugMode: options.debugMode || false,
        enableHotReload: options.enableHotReload !== false,
        mode: 'hydrate'
      });
    }

    // Enhanced options with Flutter runtime
    const enhancedOptions = {
      ...options,
      context: {
        ...options.context,
        runtime: globalFlutterRuntime // âœ… Pass Flutter runtime with createElement
      }
    };

    return coreHydrate(app, enhancedOptions);

  } catch (error) {
    console.error('[FlutterJS] âŒ Hydration failed:', error);
    throw error;
  }
}

/**
 * Get performance metrics
 * 
 * Returns detailed performance metrics including render times,
 * update counts, and Flutter-specific statistics.
 * 
 * @returns {Object|null} Performance metrics or null if no runtime
 */
export function getMetrics() {
  if (!globalFlutterRuntime) {
    return null;
  }
  return globalFlutterRuntime.getStats();
}

/**
 * Get performance report
 * 
 * Returns a detailed report of all performance measurements.
 * 
 * @returns {Object|null} Performance report or null if no runtime
 */
export function getPerformanceReport() {
  if (!globalFlutterRuntime) {
    return null;
  }
  return globalFlutterRuntime.getPerformanceReport();
}

/**
 * Clear performance metrics
 * 
 * Resets all performance tracking data.
 */
export function clearMetrics() {
  if (!globalFlutterRuntime) {
    return;
  }
  globalFlutterRuntime.clearMetrics();
  globalFlutterRuntime.clearPerformanceMarks();
}

/**
 * Register lifecycle callback
 * 
 * Available events:
 * - onElementCreated: When an element is created
 * - onElementMounted: When an element is mounted to DOM
 * - onElementUpdated: When an element is updated
 * - onElementUnmounted: When an element is unmounted
 * - onError: When an error occurs
 * - onStateChange: When state changes
 * 
 * @param {string} eventName - Event name
 * @param {Function} callback - Callback function
 */
export function on(eventName, callback) {
  if (!globalFlutterRuntime) {
    console.warn('[FlutterJS] No runtime instance. Call runApp() first.');
    return;
  }
  globalFlutterRuntime.on(eventName, callback);
}

/**
 * Unregister lifecycle callback
 * 
 * @param {string} eventName - Event name
 * @param {Function} callback - Callback function to remove
 */
export function off(eventName, callback) {
  if (!globalFlutterRuntime) {
    return;
  }
  globalFlutterRuntime.off(eventName, callback);
}

/**
 * Get Flutter configuration
 * 
 * @returns {Object|null} Flutter config or null if no runtime
 */
export function getConfig() {
  if (!globalFlutterRuntime) {
    return null;
  }
  return globalFlutterRuntime.getFlutterConfig();
}

/**
 * Dispose runtime and cleanup
 * 
 * This completely destroys the runtime and cleans up all resources.
 * After calling this, you need to call runApp() again to start a new app.
 */
export function dispose() {
  if (globalFlutterRuntime) {
    globalFlutterRuntime.destroy();
    globalFlutterRuntime = null;
  }
}

/**
 * Check if runtime is initialized
 * 
 * @returns {boolean} True if runtime exists and is initialized
 */
export function isInitialized() {
  return globalFlutterRuntime !== null && globalFlutterRuntime.isInitialized();
}

/**
 * Check if app is mounted
 * 
 * @returns {boolean} True if app is mounted to DOM
 */
export function isMounted() {
  return globalFlutterRuntime !== null && globalFlutterRuntime.isMounted();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Classes
  FlutterJSRuntime,
  VNodeRuntime,

  // Core API
  runApp,
  getRuntime,
  updateApp,
  hotReload,
  renderToString,
  hydrate,

  // Metrics
  getMetrics,
  getPerformanceReport,
  clearMetrics,

  // Lifecycle
  on,
  off,

  // Utilities
  getConfig,
  dispose,
  isInitialized,
  isMounted,
  isBrowser,
  isSSR
};

// ============================================================================
// BROWSER GLOBAL API
// ============================================================================

if (typeof window !== 'undefined') {
  console.log('[FlutterJS] ðŸŒ Setting up window.FlutterJS');

  window.FlutterJS = {
    // Core
    runApp,
    getRuntime,
    updateApp,
    hotReload,
    renderToString,
    hydrate,

    // Metrics
    getMetrics,
    getPerformanceReport,
    clearMetrics,

    // Lifecycle
    on,
    off,

    // Utilities
    getConfig,
    dispose,
    isInitialized,
    isMounted,

    // Version info
    version: '1.0.0',
    environment: 'browser'
  };

  console.log('[FlutterJS] âœ… window.FlutterJS ready');
  console.log('[FlutterJS] ðŸ“š Available methods:', Object.keys(window.FlutterJS).join(', '));
}