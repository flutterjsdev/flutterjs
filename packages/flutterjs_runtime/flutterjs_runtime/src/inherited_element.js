/**
 * FlutterJS InheritedElement
 *
 * Element for InheritedWidget. Manages dependency propagation down the widget tree.
 * InheritedWidget allows efficient value passing without prop drilling.
 *
 * Key Features:
 * - Track dependent elements
 * - Notify dependents on value changes
 * - Automatic rebuilds only for affected descendants
 * - Memory efficient cleanup
 *
 * Usage:
 * ```javascript
 * class Theme extends InheritedWidget {
 *   constructor({ data, child, key }) {
 *     super({ child, key });
 *     this.data = data;
 *   }
 *
 *   updateShouldNotify(oldWidget) {
 *     return this.data !== oldWidget.data;
 *   }
 *
 *   static of(context) {
 *     return context.dependOnInheritedWidgetOfExactType(Theme);
 *   }
 * }
 * ```
 */

import { Element } from './element.js';

/**
 * InheritedElement Class
 *
 * Represents a live instance of an InheritedWidget in the element tree.
 * Manages which elements depend on this InheritedWidget's value.
 */
class InheritedElement extends Element {
  /**
   * Create InheritedElement
   * @param {InheritedWidget} widget - The widget
   * @param {Element|null} parent - Parent element
   * @param {RuntimeEngine} runtime - Runtime engine
   */
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);

    // Track elements that depend on this InheritedWidget's value
    this.dependents = new Set();

    // Cache the inherited value for quick access
    this._inheritedValue = widget.data || widget.value || null;

    // Track if we're in process of notifying dependents
    this._notifying = false;

    if (this.runtime?.debugMode) {
      console.log(`[InheritedElement] Created ${widget.constructor.name}`);
    }
  }

  /**
   * Build the InheritedWidget's child
   * InheritedWidget typically just wraps a child without additional rendering
   *
   * @returns {VNode} VNode for the child widget
   */
  build() {
    if (!this.widget.child) {
      throw new Error('InheritedWidget must have a child widget');
    }

    // ✅ FIX: Convert child widget to element and build it
    const childWidget = this.widget.child;

    // Check if child is already a VNode
    if (childWidget && typeof childWidget === 'object' && childWidget.tag) {
      // Already a VNode
      return {
        tag: 'div',
        props: {
          'data-widget': this.widget.constructor.name,
          'data-element-id': this.id,
          class: 'fjs-inherited-widget-wrapper',
          style: { display: 'contents' }
        },
        children: [childWidget],
        metadata: {
          isInheritedWidget: true,
          widgetType: this.widget.constructor.name
        }
      };
    }

    // ✅ CRITICAL: If it's a widget, convert to element and build
    if (childWidget && typeof childWidget === 'object' &&
      (childWidget.build || childWidget.createState || childWidget.render)) {

      // Reuse existing element if possible
      if (this._childElement) {
        if (this._childElement.shouldRebuild(this._childElement.widget, childWidget)) {
          this._childElement.updateWidget(childWidget);
        } else {
          this._childElement.widget = childWidget;
          this._childElement.markNeedsBuild();
        }
      } else {
        // Create new element
        this._childElement = this.runtime.createElement(childWidget, this);
        if (!this._childElement) {
          throw new Error('Failed to create element from child widget');
        }

        // Register properly
        this.addChild(this._childElement);

        // Mount
        if (!this._childElement.mounted) {
          this._childElement.mount();
        }
      }

      // Return the child's VNode (from the stable element)
      const childVNode = this._childElement.vnode || this._childElement.build();

      return {
        tag: 'div',
        props: {
          'data-widget': this.widget.constructor.name,
          'data-element-id': this.id,
          class: 'fjs-inherited-widget-wrapper',
          style: { display: 'contents' }
        },
        children: [childVNode],
        metadata: {
          isInheritedWidget: true,
          widgetType: this.widget.constructor.name
        }
      };
    }

    // String or primitive
    return {
      tag: 'div',
      props: {
        'data-widget': this.widget.constructor.name,
        'data-element-id': this.id,
        class: 'fjs-inherited-widget-wrapper',
        style: { display: 'contents' }
      },
      children: [childWidget],
      metadata: {
        isInheritedWidget: true,
        widgetType: this.widget.constructor.name
      }
    };
  }

  /**
   * Perform rebuild - required by Element base class
   * @returns {VNode} VNode for the child widget
   */
  performRebuild() {
    return this.build();
  }

  /**
   * Register a dependent element
   * Called when an element calls dependOnInheritedWidgetOfExactType
   *
   * @param {Element} element - Element that depends on this InheritedWidget
   * @throws {Error} If element is null
   */
  addDependent(element) {
    if (!element) {
      throw new Error('Cannot add null element as dependent');
    }

    if (this.dependents.has(element)) {
      if (this.runtime?.debugMode) {
        console.warn(
          `[InheritedElement] Element ${element.id} already registered as dependent`
        );
      }
      return;
    }

    this.dependents.add(element);

    if (this.runtime?.debugMode) {
      console.log(
        `[InheritedElement] Added dependent ${element.id} ` +
        `(total: ${this.dependents.size})`
      );
    }
  }

  /**
   * Remove a dependent element
   * Called during cleanup
   *
   * @param {Element} element - Element to remove
   */
  removeDependent(element) {
    if (!element) return;

    const removed = this.dependents.delete(element);

    if (removed && this.runtime?.debugMode) {
      console.log(
        `[InheritedElement] Removed dependent ${element.id} ` +
        `(remaining: ${this.dependents.size})`
      );
    }
  }

  /**
   * Check if element is a dependent
   *
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is dependent
   */
  hasDependent(element) {
    return this.dependents.has(element);
  }

  /**
   * Get number of dependents
   *
   * @returns {number} Count of dependent elements
   */
  get dependentCount() {
    return this.dependents.size;
  }

  /**
   * Update the InheritedWidget with new widget
   * Checks if value changed, notifies dependents if needed
   *
   * @param {InheritedWidget} newWidget - New widget with potentially new data
   */
  update(newWidget) {
    const oldWidget = this.widget;

    // Call parent update
    super.update(newWidget);

    // Cache new value
    const newValue = newWidget.data || newWidget.value || null;
    const oldValue = this._inheritedValue;

    this._inheritedValue = newValue;

    // Check if we should notify dependents
    if (this.widget.updateShouldNotify) {
      try {
        const shouldNotify = this.widget.updateShouldNotify(oldWidget);

        if (shouldNotify) {
          if (this.runtime?.debugMode) {
            console.log(
              `[InheritedElement] Value changed, notifying ${this.dependents.size} dependents`
            );
          }

          this.notifyDependents();
        } else if (this.runtime?.debugMode) {
          console.log(
            `[InheritedElement] Value changed but updateShouldNotify returned false`
          );
        }
      } catch (error) {
        console.error(
          `[InheritedElement] Error in updateShouldNotify: ${error.message}`
        );
      }
    }
  }

  /**
   * Notify all dependent elements to rebuild
   * Only notifies elements that are still mounted
   */
  notifyDependents() {
    // Prevent recursive notifications
    if (this._notifying) {
      if (this.runtime?.debugMode) {
        console.warn('[InheritedElement] Recursive notification detected, skipping');
      }
      return;
    }

    this._notifying = true;

    try {
      const startTime = this.runtime?.debugMode ? performance.now() : 0;
      let notifiedCount = 0;

      // Notify each dependent
      for (const element of this.dependents) {
        if (element.mounted && !element.dirty) {
          element.markNeedsBuild();
          notifiedCount++;
        } else if (!element.mounted && this.runtime?.debugMode) {
          console.warn(
            `[InheritedElement] Dependent ${element.id} is not mounted, skipping`
          );
        }
      }

      if (this.runtime?.debugMode) {
        const duration = performance.now() - startTime;
        console.log(
          `[InheritedElement] Notified ${notifiedCount} dependents in ${duration.toFixed(2)}ms`
        );
      }
    } finally {
      this._notifying = false;
    }
  }

  /**
   * Notify specific dependents (optimization)
   * Use when you know only certain dependents need rebuild
   *
   * @param {Set<Element>} elements - Elements to notify
   */
  notifySpecificDependents(elements) {
    if (this._notifying) return;

    this._notifying = true;

    try {
      for (const element of elements) {
        if (this.dependents.has(element) && element.mounted && !element.dirty) {
          element.markNeedsBuild();
        }
      }
    } finally {
      this._notifying = false;
    }
  }

  /**
   * Mount element - initialize dependent tracking
   */
  mount() {
    super.mount();

    if (this.runtime?.debugMode) {
      console.log(
        `[InheritedElement] Mounted ${this.widget.constructor.name} ` +
        `with ${this.dependents.size} dependents`
      );
    }
  }

  /**
   * Unmount element - cleanup all dependent tracking
   */
  unmount() {
    // Clear all dependent references
    const dependentCount = this.dependents.size;

    this.dependents.forEach(element => {
      if (element.mounted) {
        // Don't rebuild, just remove from tracking
        element._inheritedDependencies?.delete(this.id);
      }
    });

    this.dependents.clear();

    if (this.runtime?.debugMode) {
      console.log(
        `[InheritedElement] Unmounted ${this.widget.constructor.name} ` +
        `(cleaned up ${dependentCount} dependents)`
      );
    }

    super.unmount();
  }

  /**
   * Get statistics about this InheritedElement
   *
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = super.getStats();

    return {
      ...stats,
      type: 'InheritedElement',
      inheritedValue: this._inheritedValue,
      dependentCount: this.dependents.size,
      dependents: Array.from(this.dependents).map(el => ({
        id: el.id,
        type: el.constructor.name,
        mounted: el.mounted
      }))
    };
  }
}

/**
 * Base InheritedWidget Class
 *
 * Widgets that provide values to their descendants.
 * Descendants access the value via context.dependOnInheritedWidgetOfExactType()
 */
class InheritedWidget {
  /**
   * Create InheritedWidget
   * @param {Object} options - Widget options
   * @param {Widget} options.child - Child widget to wrap
   * @param {*} options.data - Value to provide (alternative to override in subclass)
   * @param {*} options.value - Value to provide (preferred)
   * @param {string} options.key - Widget key for reconciliation
   */
  constructor({ child, data, value, key } = {}) {
    if (!child) {
      throw new Error('InheritedWidget requires a child widget');
    }

    this.child = child;
    this.data = data || value || null;
    this.key = key;
    this.type = 'InheritedWidget';
  }

  /**
   * Determine if dependents should be notified of update
   * Override in subclasses to optimize notifications
   *
   * @param {InheritedWidget} oldWidget - Previous widget
   * @returns {boolean} True if dependents should rebuild
   *
   * @example
   * updateShouldNotify(oldWidget) {
   *   return this.data.theme !== oldWidget.data.theme;
   * }
   */
  updateShouldNotify(oldWidget) {
    // Default: always notify on any change
    return this.data !== oldWidget.data;
  }

  /**
   * Static helper to access this InheritedWidget from descendant
   * Subclasses should override this
   *
   * @param {BuildContext} context - Build context
   * @returns {InheritedWidget|null} This widget instance or null
   *
   * @example
   * class Theme extends InheritedWidget {
   *   static of(context) {
   *     return context.dependOnInheritedWidgetOfExactType(Theme);
   *   }
   * }
   *
   * // Usage
   * const theme = Theme.of(context);
   */
  static of(context) {
    return context.dependOnInheritedWidgetOfExactType(this);
  }

  /**
   * Create element for this widget
   * Override to customize element type
   *
   * @param {Element} parent - Parent element
   * @param {RuntimeEngine} runtime - Runtime engine
   * @returns {Element} Element instance
   */
  createElement(parent, runtime) {
    return new InheritedElement(this, parent, runtime);
  }
}

/**
 * ChangeNotifier - Allows imperative value updates
 *
 * Subclass this to create data classes that notify listeners of changes.
 * More efficient than InheritedWidget for frequently changing values.
 */
class ChangeNotifier {
  constructor() {
    this.listeners = new Set();
  }

  /**
   * Add listener
   * @param {Function} listener - Callback called on change
   */
  addListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }
    this.listeners.add(listener);
  }

  /**
   * Remove listener
   * @param {Function} listener - Listener to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners.clear();
  }

  /**
   * Notify all listeners of change
   * Call this when data changes
   */
  notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error('[ChangeNotifier] Listener error:', error);
      }
    }
  }

  /**
   * Check if has listeners
   * @returns {boolean} True if any listeners registered
   */
  hasListeners() {
    return this.listeners.size > 0;
  }

  /**
   * Get listener count
   * @returns {number} Number of listeners
   */
  get listenerCount() {
    return this.listeners.size;
  }

  /**
   * Dispose - cleanup all listeners
   */
  dispose() {
    this.listeners.clear();
  }
}

/**
 * ValueNotifier - Simple ChangeNotifier for single values
 *
 * Efficient way to manage a single reactive value.
 */
class ValueNotifier extends ChangeNotifier {
  /**
   * Create ValueNotifier
   * @param {*} initialValue - Initial value
   */
  constructor(initialValue) {
    super();
    this._value = initialValue;
  }

  /**
   * Get current value
   */
  get value() {
    return this._value;
  }

  /**
   * Set value and notify listeners
   */
  set value(newValue) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.notifyListeners();
    }
  }

  /**
   * Get value
   * @returns {*} Current value
   */
  getValue() {
    return this._value;
  }

  /**
   * Set value with optional notification
   * @param {*} newValue - New value
   * @param {boolean} notify - Whether to notify listeners (default: true)
   */
  setValue(newValue, notify = true) {
    if (this._value !== newValue) {
      this._value = newValue;
      if (notify) {
        this.notifyListeners();
      }
    }
  }
}

/**
 * Provider Widget - Helper for dependency injection
 *
 * Combines InheritedWidget with ChangeNotifier for reactive data.
 */
class Provider extends InheritedWidget {
  /**
   * Create Provider
   * @param {Object} options
   * @param {ChangeNotifier} options.notifier - ChangeNotifier instance
   * @param {*} options.value - Static value (if not using notifier)
   * @param {Widget} options.child - Child widget
   * @param {string} options.key - Widget key
   */
  constructor({ notifier, value, child, key } = {}) {
    super({ child, data: value, key });

    if (notifier && !(notifier instanceof ChangeNotifier)) {
      throw new Error('Provider requires a ChangeNotifier instance');
    }

    this.notifier = notifier;
    this.listeners = [];
  }

  /**
   * Only notify if notifier value actually changed
   * @param {Provider} oldWidget - Previous widget
   * @returns {boolean} Whether to notify
   */
  updateShouldNotify(oldWidget) {
    // If using notifier, let it handle notifications
    if (this.notifier && oldWidget.notifier === this.notifier) {
      return false;
    }

    // If values are different, notify
    return this.data !== oldWidget.data;
  }

  /**
   * Get current provided value
   * @returns {*} The value being provided
   */
  getValue() {
    return this.notifier ? this.notifier.value : this.data;
  }

  /**
   * Static helper to access provider
   * @param {BuildContext} context
   * @returns {Provider|null}
   */
  static of(context) {
    return context.dependOnInheritedWidgetOfExactType(Provider);
  }
}


export {
  InheritedElement,
  InheritedWidget,
  ChangeNotifier,
  ValueNotifier,
  Provider
};