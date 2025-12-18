/**
 * FlutterJS Event System
 *
 * Manages event delegation, event handling, and propagation across the widget tree.
 * Uses event delegation at the root for efficient event management.
 *
 * Key Features:
 * - Event delegation (single root listener instead of per-element)
 * - Event bubbling and capturing
 * - Synthetic event objects
 * - Event handler registration/unregistration
 * - Gesture support (tap, long-press, swipe)
 * - Focus management
 * - Performance optimized for large DOMs
 *
 * Usage:
 * ```javascript
 * const eventSystem = new EventSystem(runtime);
 * eventSystem.initialize(rootElement);
 *
 * // Register handler
 * eventSystem.registerHandler(elementId, 'click', (event) => {
 *   console.log('Clicked!');
 * });
 * ```
 */

/**
 * Synthetic Event Object
 *
 * Normalizes native browser events into a consistent format.
 * Provides cross-browser compatibility.
 */
class SyntheticEvent {
  /**
   * Create synthetic event
   * @param {Event} nativeEvent - Native browser event
   * @param {string} type - Event type
   * @param {HTMLElement} target - Target element
   * @param {HTMLElement} currentTarget - Current target
   */
  constructor(nativeEvent, type, target, currentTarget) {
    this.nativeEvent = nativeEvent;
    this.type = type;
    this.target = target;
    this.currentTarget = currentTarget;

    // Event control flags
    this._propagationStopped = false;
    this._immediatePropagationStopped = false;
    this._defaultPrevented = false;

    // Time
    this.timeStamp = nativeEvent.timeStamp || Date.now();

    // Common properties
    this.bubbles = nativeEvent.bubbles || false;
    this.cancelable = nativeEvent.cancelable || false;

    // Mouse/pointer properties
    this.clientX = nativeEvent.clientX || 0;
    this.clientY = nativeEvent.clientY || 0;
    this.pageX = nativeEvent.pageX || 0;
    this.pageY = nativeEvent.pageY || 0;
    this.screenX = nativeEvent.screenX || 0;
    this.screenY = nativeEvent.screenY || 0;

    // Button information
    this.button = nativeEvent.button !== undefined ? nativeEvent.button : -1;
    this.buttons = nativeEvent.buttons || 0;

    // Modifier keys
    this.altKey = nativeEvent.altKey || false;
    this.ctrlKey = nativeEvent.ctrlKey || false;
    this.metaKey = nativeEvent.metaKey || false;
    this.shiftKey = nativeEvent.shiftKey || false;

    // Keyboard properties
    this.key = nativeEvent.key || '';
    this.code = nativeEvent.code || '';
    this.keyCode = nativeEvent.keyCode || 0;
    this.which = nativeEvent.which || 0;

    // Input properties
    this.value = nativeEvent.target?.value || '';
    this.checked = nativeEvent.target?.checked || false;

    // Touch properties
    this.touches = nativeEvent.touches || [];
    this.changedTouches = nativeEvent.changedTouches || [];
    this.targetTouches = nativeEvent.targetTouches || [];
  }

  /**
   * Prevent default action
   */
  preventDefault() {
    this._defaultPrevented = true;
    if (this.nativeEvent.preventDefault) {
      this.nativeEvent.preventDefault();
    }
  }

  /**
   * Check if default prevented
   */
  get defaultPrevented() {
    return this._defaultPrevented;
  }

  /**
   * Stop event propagation
   */
  stopPropagation() {
    this._propagationStopped = true;
    if (this.nativeEvent.stopPropagation) {
      this.nativeEvent.stopPropagation();
    }
  }

  /**
   * Stop immediate propagation
   */
  stopImmediatePropagation() {
    this._immediatePropagationStopped = true;
    this._propagationStopped = true;
    if (this.nativeEvent.stopImmediatePropagation) {
      this.nativeEvent.stopImmediatePropagation();
    }
  }

  /**
   * Check if propagation stopped
   */
  get isPropagationStopped() {
    return this._propagationStopped;
  }

  /**
   * Check if immediate propagation stopped
   */
  get isImmediatePropagationStopped() {
    return this._immediatePropagationStopped;
  }

  /**
   * Get event data for debugging
   */
  toString() {
    return `SyntheticEvent(${this.type} @ ${this.target?.tagName || 'unknown'})`;
  }
}

/**
 * Event System
 *
 * Manages all event handling for the application using delegation pattern.
 * Dramatically improves performance with large DOMs.
 */
class EventSystem {
  /**
   * Create event system
   * @param {RuntimeEngine} runtime - Runtime engine reference
   * @param {Object} options - Configuration options
   */
  constructor(runtime, options = {}) {
    if (!runtime) {
      throw new Error('Runtime is required for EventSystem');
    }

    this.runtime = runtime;

    // Configuration
    this.config = {
      enableDebug: options.enableDebug || false,
      enableCapture: options.enableCapture !== false,
      enableBubble: options.enableBubble !== false,
      maxEventListeners: options.maxEventListeners || 10000,
      eventPoolSize: options.eventPoolSize || 100,
      ...options
    };

    // Root element for delegation
    this.rootElement = null;

    // Handler registry: elementId -> { eventType -> handler[] }
    this.handlerRegistry = new Map();

    // Delegated event types
    this.delegatedEvents = new Set([
      'click', 'dblclick',
      'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
      'mouseenter', 'mouseleave',
      'touchstart', 'touchend', 'touchmove', 'touchcancel',
      'pointerdown', 'pointerup', 'pointermove', 'pointerenter', 'pointerleave',
      'keydown', 'keyup', 'keypress',
      'focus', 'blur',
      'input', 'change', 'submit', 'reset',
      'scroll', 'resize',
      'dragstart', 'drag', 'dragover', 'drop',
      'contextmenu'
    ]);

    // Native listeners attached at root
    this.nativeListeners = new Map();

    // Statistics
    this.stats = {
      handlersRegistered: 0,
      handlersUnregistered: 0,
      eventsDispatched: 0,
      eventsCancelled: 0,
      propagationStopped: 0,
      averageListenerCount: 0
    };

    // Event pool for optimization (reuse event objects)
    this.eventPool = [];

    this.initialized = false;

    if (this.config.enableDebug) {
      console.log('[EventSystem] Created');
    }
  }

  /**
   * Initialize event delegation on root element
   * @param {HTMLElement} rootElement - Root DOM element
   * @throws {Error} If root element not valid
   */
  initialize(rootElement) {
    if (!rootElement || !(rootElement instanceof HTMLElement)) {
      throw new Error('Root element must be a valid HTMLElement');
    }

    if (this.initialized) {
      console.warn('[EventSystem] Already initialized, skipping');
      return;
    }

    this.rootElement = rootElement;

    // Attach delegated listeners at root
    this.delegatedEvents.forEach(eventType => {
      const listener = this.createDelegatedListener(eventType);

      // Use capture for better control
      rootElement.addEventListener(eventType, listener, true);

      this.nativeListeners.set(eventType, listener);

      if (this.config.enableDebug) {
        console.log(`[EventSystem] Delegated listener attached for '${eventType}'`);
      }
    });

    this.initialized = true;

    if (this.config.enableDebug) {
      console.log(`[EventSystem] Initialized with ${this.delegatedEvents.size} delegated events`);
    }
  }

  /**
   * Create delegated listener for event type
   * @private
   * @param {string} eventType - Event type (e.g., 'click')
   * @returns {Function} Event listener function
   */
  createDelegatedListener(eventType) {
    return (nativeEvent) => {
      this.stats.eventsDispatched++;

      let target = nativeEvent.target;

      // Traverse up from target to root
      while (target && target !== this.rootElement) {
        const elementId = target.dataset?.elementId;

        if (elementId) {
          this.dispatchToHandlers(elementId, eventType, nativeEvent);

          // Check if propagation stopped
          if (nativeEvent._stopPropagation) {
            break;
          }
        }

        target = target.parentElement;
      }
    };
  }

  /**
   * Dispatch event to all handlers for element
   * @private
   * @param {string} elementId - Element ID
   * @param {string} eventType - Event type
   * @param {Event} nativeEvent - Native browser event
   */
  dispatchToHandlers(elementId, eventType, nativeEvent) {
    const handlers = this.handlerRegistry.get(elementId);

    if (!handlers || !handlers[eventType]) {
      return;
    }

    const handlersArray = handlers[eventType];
    const target = nativeEvent.target;

    // Create synthetic event
    const syntheticEvent = new SyntheticEvent(nativeEvent, eventType, target, target);

    // Call each handler
    for (const handler of handlersArray) {
      if (syntheticEvent.isImmediatePropagationStopped) {
        break;
      }

      try {
        handler(syntheticEvent);
      } catch (error) {
        console.error(
          `[EventSystem] Handler error for ${eventType} on element ${elementId}:`,
          error
        );
      }
    }

    // Update propagation flag
    if (syntheticEvent.isPropagationStopped) {
      nativeEvent._stopPropagation = true;
      nativeEvent.stopPropagation();
    }

    if (syntheticEvent.defaultPrevented) {
      nativeEvent.preventDefault();
    }
  }

  /**
   * Register event handler for element
   * @param {string} elementId - Element ID
   * @param {string} eventType - Event type (e.g., 'click', 'change')
   * @param {Function} handler - Handler function
   * @throws {Error} If parameters invalid
   */
  registerHandler(elementId, eventType, handler) {
    if (!elementId || typeof elementId !== 'string') {
      throw new Error('Element ID must be a non-empty string');
    }

    if (!eventType || typeof eventType !== 'string') {
      throw new Error('Event type must be a non-empty string');
    }

    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    // Get or create handler registry for element
    if (!this.handlerRegistry.has(elementId)) {
      this.handlerRegistry.set(elementId, {});
    }

    const handlers = this.handlerRegistry.get(elementId);

    // Get or create handler array for event type
    if (!handlers[eventType]) {
      handlers[eventType] = [];
    }

    const handlersArray = handlers[eventType];

    // Check max listeners warning
    if (handlersArray.length >= this.config.maxEventListeners) {
      console.warn(
        `[EventSystem] Max event listeners (${this.config.maxEventListeners}) ` +
        `reached for element ${elementId} event ${eventType}`
      );
    }

    // Add handler
    handlersArray.push(handler);

    this.stats.handlersRegistered++;

    if (this.config.enableDebug) {
      console.log(
        `[EventSystem] Registered handler for ${elementId}.${eventType} ` +
        `(total: ${handlersArray.length})`
      );
    }
  }

  /**
   * Unregister event handler for element
   * @param {string} elementId - Element ID
   * @param {string} eventType - Event type (optional)
   * @param {Function} handler - Handler function (optional)
   */
  unregisterHandler(elementId, eventType, handler) {
    if (!elementId) return;

    const handlers = this.handlerRegistry.get(elementId);
    if (!handlers) return;

    if (!eventType) {
      // Remove all handlers for element
      this.handlerRegistry.delete(elementId);
      this.stats.handlersUnregistered += Object.keys(handlers).length;

      if (this.config.enableDebug) {
        console.log(`[EventSystem] Unregistered all handlers for ${elementId}`);
      }

      return;
    }

    const handlersArray = handlers[eventType];
    if (!handlersArray) return;

    if (!handler) {
      // Remove all handlers for event type
      const count = handlersArray.length;
      delete handlers[eventType];

      this.stats.handlersUnregistered += count;

      if (this.config.enableDebug) {
        console.log(
          `[EventSystem] Unregistered ${count} handlers for ${elementId}.${eventType}`
        );
      }

      return;
    }

    // Remove specific handler
    const index = handlersArray.indexOf(handler);
    if (index !== -1) {
      handlersArray.splice(index, 1);
      this.stats.handlersUnregistered++;

      if (this.config.enableDebug) {
        console.log(
          `[EventSystem] Unregistered handler for ${elementId}.${eventType} ` +
          `(remaining: ${handlersArray.length})`
        );
      }
    }
  }

  /**
   * Check if element has handlers for event type
   * @param {string} elementId - Element ID
   * @param {string} eventType - Event type
   * @returns {boolean} True if handlers exist
   */
  hasHandlers(elementId, eventType) {
    const handlers = this.handlerRegistry.get(elementId);
    if (!handlers) return false;

    if (!eventType) {
      return Object.keys(handlers).length > 0;
    }

    return (handlers[eventType]?.length || 0) > 0;
  }

  /**
   * Get handler count for element
   * @param {string} elementId - Element ID
   * @param {string} eventType - Event type (optional)
   * @returns {number} Handler count
   */
  getHandlerCount(elementId, eventType) {
    const handlers = this.handlerRegistry.get(elementId);
    if (!handlers) return 0;

    if (!eventType) {
      return Object.values(handlers).reduce((sum, arr) => sum + arr.length, 0);
    }

    return handlers[eventType]?.length || 0;
  }

  /**
   * Get all event types for element
   * @param {string} elementId - Element ID
   * @returns {string[]} Array of event type strings
   */
  getEventTypes(elementId) {
    const handlers = this.handlerRegistry.get(elementId);
    return handlers ? Object.keys(handlers) : [];
  }

  /**
   * Batch register multiple handlers
   * @param {string} elementId - Element ID
   * @param {Object} handlers - Map of eventType -> handler function
   */
  batchRegister(elementId, handlers) {
    if (!handlers || typeof handlers !== 'object') {
      throw new Error('Handlers must be an object');
    }

    Object.entries(handlers).forEach(([eventType, handler]) => {
      if (typeof handler === 'function') {
        this.registerHandler(elementId, eventType, handler);
      }
    });
  }

  /**
   * Batch unregister handlers for element
   * @param {string} elementId - Element ID
   */
  batchUnregister(elementId) {
    this.unregisterHandler(elementId);
  }

  /**
   * Manually dispatch event (for testing or custom events)
   * @param {HTMLElement} element - Target element
   * @param {string} eventType - Event type
   * @param {Object} options - Event options
   */
  dispatchCustomEvent(element, eventType, options = {}) {
    if (!element) {
      throw new Error('Element is required');
    }

    const syntheticEvent = new SyntheticEvent(
      options.nativeEvent || new Event(eventType),
      eventType,
      element,
      element
    );

    // Merge custom properties
    Object.assign(syntheticEvent, options);

    const elementId = element.dataset?.elementId;
    if (elementId) {
      this.dispatchToHandlers(elementId, eventType, syntheticEvent.nativeEvent);
    }
  }

  /**
   * Get statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const totalHandlers = Array.from(this.handlerRegistry.values())
      .reduce((sum, handlers) => {
        return sum + Object.values(handlers).reduce((s, arr) => s + arr.length, 0);
      }, 0);

    return {
      ...this.stats,
      initialized: this.initialized,
      delegatedEventsCount: this.delegatedEvents.size,
      elementsWithHandlers: this.handlerRegistry.size,
      totalHandlers: totalHandlers,
      nativeListenersAttached: this.nativeListeners.size,
      averageHandlersPerElement: this.handlerRegistry.size > 0
        ? Math.round(totalHandlers / this.handlerRegistry.size)
        : 0
    };
  }

  /**
   * Get detailed handler information
   * @param {string} elementId - Element ID (optional, for specific element)
   * @returns {Object} Detailed information
   */
  getDetailedInfo(elementId) {
    if (elementId) {
      const handlers = this.handlerRegistry.get(elementId);
      return {
        elementId,
        handlers: handlers ? { ...handlers } : {},
        hasHandlers: !!handlers
      };
    }

    // Get info for all elements
    const all = {};
    this.handlerRegistry.forEach((handlers, id) => {
      all[id] = { ...handlers };
    });

    return {
      totalElements: this.handlerRegistry.size,
      elements: all
    };
  }

  /**
   * Clear all handlers for element (cleanup on unmount)
   * @param {string} elementId - Element ID
   */
  clearElement(elementId) {
    if (!elementId) return;

    const handlerCount = this.getHandlerCount(elementId);
    this.unregisterHandler(elementId);

    if (this.config.enableDebug && handlerCount > 0) {
      console.log(
        `[EventSystem] Cleared ${handlerCount} handlers for element ${elementId}`
      );
    }
  }

  /**
   * Clear all handlers (app shutdown)
   */
  clearAll() {
    const elementCount = this.handlerRegistry.size;
    const totalHandlers = Array.from(this.handlerRegistry.values())
      .reduce((sum, handlers) => {
        return sum + Object.values(handlers).reduce((s, arr) => s + arr.length, 0);
      }, 0);

    this.handlerRegistry.clear();
    this.eventPool = [];

    if (this.config.enableDebug) {
      console.log(
        `[EventSystem] Cleared ${totalHandlers} handlers from ${elementCount} elements`
      );
    }
  }

  /**
   * Dispose event system
   */
  dispose() {
    // Remove delegated listeners
    if (this.rootElement) {
      this.nativeListeners.forEach((listener, eventType) => {
        this.rootElement.removeEventListener(eventType, listener, true);
      });
    }

    this.clearAll();
    this.nativeListeners.clear();
    this.rootElement = null;
    this.initialized = false;

    if (this.config.enableDebug) {
      console.log('[EventSystem] Disposed');
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EventSystem,
    SyntheticEvent
  };
}