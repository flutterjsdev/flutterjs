/**
 * FlutterJS Runtime v1.0
 * Core engine for Flutter-to-Web transpiled apps
 * Size target: <15KB minified
 */

(function(global) {
  'use strict';

  // ===========================================
  // 1. CORE NAMESPACE
  // ===========================================
  
  const FlutterJS = {
    version: '1.0.0',
    _widgets: new Map(),      // Widget registry
    _state: new Map(),         // State storage
    _dependencies: new Map(),  // Reactivity graph
    _updateQueue: new Set(),   // Pending updates
    _isUpdating: false,
  };

  // ===========================================
  // 2. REACTIVITY SYSTEM
  // ===========================================
  
  FlutterJS.reactivity = {
    /**
     * Register a widget with its dependencies
     */
    register(widgetId, element, dependencies = []) {
      FlutterJS._widgets.set(widgetId, {
        element,
        dependencies,
        updateFn: null
      });
      
      // Track reverse dependencies (what depends on this widget)
      dependencies.forEach(depId => {
        if (!FlutterJS._dependencies.has(depId)) {
          FlutterJS._dependencies.set(depId, new Set());
        }
        FlutterJS._dependencies.get(depId).add(widgetId);
      });
    },

    /**
     * Set update function for a widget
     */
    setUpdateFn(widgetId, updateFn) {
      const widget = FlutterJS._widgets.get(widgetId);
      if (widget) {
        widget.updateFn = updateFn;
      }
    },

    /**
     * Schedule widget for update
     */
    scheduleUpdate(widgetId) {
      FlutterJS._updateQueue.add(widgetId);
      
      // Also schedule dependent widgets
      const dependents = FlutterJS._dependencies.get(widgetId);
      if (dependents) {
        dependents.forEach(depId => FlutterJS._updateQueue.add(depId));
      }
      
      // Batch updates using requestAnimationFrame
      if (!FlutterJS._isUpdating) {
        FlutterJS._isUpdating = true;
        requestAnimationFrame(() => this.flushUpdates());
      }
    },

    /**
     * Execute all pending updates
     */
    flushUpdates() {
      FlutterJS._updateQueue.forEach(widgetId => {
        const widget = FlutterJS._widgets.get(widgetId);
        if (widget && widget.updateFn) {
          try {
            widget.updateFn();
          } catch (error) {
            console.error(`[FlutterJS] Update failed for ${widgetId}:`, error);
          }
        }
      });
      
      FlutterJS._updateQueue.clear();
      FlutterJS._isUpdating = false;
    }
  };

  // ===========================================
  // 3. STATE MANAGEMENT (like setState)
  // ===========================================
  
  FlutterJS.state = {
    /**
     * Create state for a StatefulWidget
     */
    create(widgetId, initialState = {}) {
      const stateProxy = new Proxy(initialState, {
        set: (target, property, value) => {
          const oldValue = target[property];
          target[property] = value;
          
          // Trigger update if value changed
          if (oldValue !== value) {
            console.log(`[FlutterJS] State changed: ${widgetId}.${String(property)}`);
            FlutterJS.reactivity.scheduleUpdate(widgetId);
          }
          
          return true;
        }
      });
      
      FlutterJS._state.set(widgetId, stateProxy);
      return stateProxy;
    },

    /**
     * Get state for a widget
     */
    get(widgetId) {
      return FlutterJS._state.get(widgetId);
    },

    /**
     * Update state (like Flutter's setState)
     */
    setState(widgetId, updater) {
      const state = this.get(widgetId);
      if (!state) {
        console.warn(`[FlutterJS] No state found for widget: ${widgetId}`);
        return;
      }
      
      // Call updater function with current state
      if (typeof updater === 'function') {
        updater(state);
      } else {
        // Direct state update
        Object.assign(state, updater);
      }
      
      // Update is automatically triggered by Proxy
    }
  };

  // ===========================================
  // 4. EVENT SYSTEM
  // ===========================================
  
  FlutterJS.events = {
    /**
     * Attach event listener (Flutter callback -> DOM event)
     */
    on(element, eventType, callback, widgetId = null) {
      if (!element) return;
      
      const wrappedCallback = (event) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`[FlutterJS] Event handler error:`, error);
        }
      };
      
      element.addEventListener(eventType, wrappedCallback);
    },

    /**
     * Handle button press (onPressed -> onclick)
     */
    onPressed(element, callback, widgetId) {
      this.on(element, 'click', callback, widgetId);
    },

    /**
     * Handle text field changes (onChanged)
     */
    onChanged(element, callback, widgetId) {
      this.on(element, 'input', (e) => callback(e.target.value), widgetId);
    },

    /**
     * GestureDetector: tap
     */
    onTap(element, callback, widgetId) {
      this.on(element, 'click', callback, widgetId);
    },

    /**
     * GestureDetector: long press
     */
    onLongPress(element, callback, widgetId) {
      let pressTimer;
      
      element.addEventListener('mousedown', () => {
        pressTimer = setTimeout(() => callback(), 500);
      });
      
      element.addEventListener('mouseup', () => {
        clearTimeout(pressTimer);
      });
      
      element.addEventListener('mouseleave', () => {
        clearTimeout(pressTimer);
      });
    }
  };

  // ===========================================
  // 5. NAVIGATION SYSTEM
  // ===========================================
  
  FlutterJS.navigation = {
    _history: [],
    _currentRoute: '/',

    /**
     * Navigate to a new route (Navigator.push)
     */
    push(routeName, params = {}) {
      console.log(`[FlutterJS] Navigating to: ${routeName}`);
      
      this._history.push({
        route: this._currentRoute,
        params: params
      });
      
      this._currentRoute = routeName;
      
      // Update browser URL
      window.history.pushState({ route: routeName }, '', `#${routeName}`);
      
      // Trigger route change
      this._loadRoute(routeName, params);
    },

    /**
     * Go back (Navigator.pop)
     */
    pop() {
      if (this._history.length === 0) {
        console.warn('[FlutterJS] Cannot pop: no history');
        return;
      }
      
      const previous = this._history.pop();
      this._currentRoute = previous.route;
      
      window.history.back();
      this._loadRoute(previous.route, previous.params);
    },

    /**
     * Load route content
     */
    _loadRoute(routeName, params) {
      // Emit custom event that components can listen to
      const event = new CustomEvent('flutterjs:route', {
        detail: { route: routeName, params }
      });
      window.dispatchEvent(event);
    },

    /**
     * Setup browser back/forward button handling
     */
    setupHistoryListener() {
      window.addEventListener('popstate', (event) => {
        if (event.state && event.state.route) {
          this._currentRoute = event.state.route;
          this._loadRoute(event.state.route, {});
        }
      });
    }
  };

  // ===========================================
  // 6. THEME & CONTEXT SYSTEM
  // ===========================================
  
  FlutterJS.context = {
    _theme: null,

    /**
     * Initialize theme from CSS variables
     */
    initTheme() {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      this._theme = {
        primaryColor: computedStyle.getPropertyValue('--md-sys-color-primary').trim(),
        backgroundColor: computedStyle.getPropertyValue('--md-sys-color-background').trim(),
        textTheme: {
          bodyLarge: computedStyle.getPropertyValue('--md-sys-typescale-body-large').trim()
        }
      };
    },

    /**
     * Get theme (Theme.of(context))
     */
    theme() {
      if (!this._theme) this.initTheme();
      return this._theme;
    },

    /**
     * Get MediaQuery data
     */
    mediaQuery() {
      return {
        size: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        devicePixelRatio: window.devicePixelRatio,
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      };
    },

    /**
     * Get CSS custom property value
     */
    getCSSVar(varName) {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(varName).trim();
    }
  };

  // ===========================================
  // 7. UTILITY FUNCTIONS
  // ===========================================
  
  FlutterJS.utils = {
    /**
     * Create element with Flutter-style properties
     */
    createElement(tag, props = {}, children = []) {
      const element = document.createElement(tag);
      
      // Apply properties
      Object.entries(props).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'style') {
          Object.assign(element.style, value);
        } else if (key.startsWith('on')) {
          // Event handler
          const eventName = key.slice(2).toLowerCase();
          element.addEventListener(eventName, value);
        } else {
          element.setAttribute(key, value);
        }
      });
      
      // Append children
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
          element.appendChild(child);
        }
      });
      
      return element;
    },

    /**
     * Mount widget to DOM
     */
    mount(widgetId, element, container) {
      if (typeof container === 'string') {
        container = document.querySelector(container);
      }
      
      if (!container) {
        console.error('[FlutterJS] Mount container not found');
        return;
      }
      
      container.appendChild(element);
      console.log(`[FlutterJS] Mounted widget: ${widgetId}`);
    }
  };

  // ===========================================
  // 8. INITIALIZATION
  // ===========================================
  
  FlutterJS.onReady = function() {
    console.log('[FlutterJS] Runtime initialized');
    
    // Initialize theme
    this.context.initTheme();
    
    // Setup navigation
    this.navigation.setupHistoryListener();
    
    // Emit ready event
    const event = new CustomEvent('flutterjs:ready');
    window.dispatchEvent(event);
  };

  // ===========================================
  // 9. EXPOSE GLOBALLY
  // ===========================================
  
  global.FlutterJS = FlutterJS;
  
  console.log('[FlutterJS] Runtime loaded (v' + FlutterJS.version + ')');

})(window);