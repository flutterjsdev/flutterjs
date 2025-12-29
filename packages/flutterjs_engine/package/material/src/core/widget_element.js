import { Diagnosticable, Element } from "@flutterjs/runtime/element";
import { VNode } from "@flutterjs/vdom/vnode";

// ============================================================================
// 1. WIDGET CLASS - With Diagnosticable
// ============================================================================

/**
 * Widget - Abstract base class for all widgets
 */
class Widget extends Diagnosticable {
  constructor(key = null) {
    super();
    if (new.target === Widget) {
      throw new Error('Widget is abstract and cannot be instantiated');
    }
    this.key = key;
  }

  /**
   * Create an Element for this widget
   * Must be implemented in subclasses
   */
  createElement() {
    throw new Error(
      `${this.constructor.name}.createElement() must be implemented`
    );
  }

  /**
   * Get short description of widget
   */
  toStringShort() {
    return `${this.constructor.name}${this.key ? `(key: ${this.key})` : '(unkeyed)'}`;
  }

  /**
   * Add widget-specific debug properties
   * Override in subclasses for custom properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    // Subclasses add their own properties here
  }
}

// ============================================================================
// 2. PROXY WIDGET - Base for wrapping widgets
// ============================================================================

class ProxyWidget extends Widget {
  constructor({ key = null, child = null } = {}) {
    super(key);
    if (new.target === ProxyWidget) {
      throw new Error('ProxyWidget is abstract');
    }
    this.child = child;
  }

  createElement() {
    return new ProxyElement(this);
  }
}

// ============================================================================
// 3. INHERITED WIDGET - Ambient state propagation
// ============================================================================

class InheritedWidget extends ProxyWidget {
  constructor({ key = null, child = null } = {}) {
    super({ key, child });
  }

  /**
   * Override to return true when dependent widgets should rebuild
   */
  updateShouldNotify(oldWidget) {
    throw new Error(
      `${this.constructor.name}.updateShouldNotify() must be implemented`
    );
  }

  createElement() {
    return new InheritedElement(this);
  }

  static of(context, widgetType) {
    return context.dependOnInheritedWidgetOfExactType(widgetType);
  }
}

// ============================================================================
// 4. KEY CLASSES
// ============================================================================

class Key {
  constructor() {
    if (new.target === Key) {
      throw new Error('Key is abstract');
    }
  }
}

class ValueKey extends Key {
  constructor(value) {
    super();
    this.value = value;
  }

  equals(other) {
    return other instanceof ValueKey && this.value === other.value;
  }

  toString() {
    return `ValueKey(${this.value})`;
  }
}

class ObjectKey extends Key {
  constructor(value) {
    super();
    this.value = value;
  }

  equals(other) {
    return other instanceof ObjectKey && this.value === other.value;
  }

  toString() {
    return `ObjectKey(${this.value})`;
  }
}

class GlobalKey extends Key {
  constructor(debugLabel = null) {
    super();
    this.debugLabel = debugLabel;
    this._currentElement = null;
  }

  get currentContext() {
    return this._currentElement?.context || null;
  }

  get currentWidget() {
    return this._currentElement?.widget || null;
  }

  get currentState() {
    return this._currentElement?.state || null;
  }

  equals(other) {
    return other instanceof GlobalKey && this === other;
  }

  toString() {
    return `GlobalKey${this.debugLabel ? `(${this.debugLabel})` : ''}`;
  }
}

// ============================================================================
// 5. NOTIFICATION CLASSES
// ============================================================================

class Notification {
  constructor() {
    if (new.target === Notification) {
      throw new Error('Notification is abstract');
    }
  }

  dispatch(context) {
    context.dispatchNotification(this);
  }
}

class NotificationListener extends ProxyWidget {
  constructor({ key = null, child = null, onNotification = null } = {}) {
    super({ key, child });
    this.onNotification = onNotification;
  }

  createElement() {
    return new NotificationListenerElement(this);
  }
}

// ============================================================================
// 6. STATELESS WIDGET & ELEMENT
// ============================================================================

/**
 * StatelessWidget - Immutable widget that depends only on props/configuration
 */
class StatelessWidget extends Widget {
  constructor(key = null) {
    super(key);
  }

  /**
   * Build the widget UI
   */
  build(context) {
    throw new Error(`${this.constructor.name}.build() must be implemented`);
  }

  /**
   * Create element for this widget
   */
  createElement() {
    return new StatelessElement(this);
  }

  reassemble() { }
}

/**
 * StatelessElement - Element for stateless widget
 */
class StatelessElement extends Element {
  constructor(widget) {
    super(widget);
  }

  /**
   * Mount the element
   */
  mount(parent = null) {
    super.mount(parent);
  }

  reassemble() {
    this.widget.reassemble?.();
    super.reassemble();
  }

  /**
   * Perform rebuild
   */
  performRebuild() {
    try {
      return this.widget.build(this.context);
    } catch (error) {
      console.error(`build error: ${error}`);
      return new ErrorWidget({ message: error.toString() });
    }
  }
}

// ============================================================================
// 7. STATEFUL WIDGET & ELEMENT
// ============================================================================

/**
 * StatefulWidget - Widget that holds mutable state
 */
class StatefulWidget extends Widget {
  constructor(key = null) {
    super(key);
  }

  /**
   * Create the state object
   */
  createState() {
    throw new Error(`${this.constructor.name}.createState() must be implemented`);
  }

  /**
   * Create element for this widget
   */
  createElement() {
    return new StatefulElement(this);
  }

  // Called during hot reload
  reassemble() { }
}

/**
 * StatefulElement - Element for stateful widget
 */
class StatefulElement extends Element {
  constructor(widget) {
    super(widget);
    this.state = widget.createState();
    this.state._element = this;
    this.state.widget = widget;
  }

  /**
   * Mount the element
   */
  mount(parent = null) {
    super.mount(parent);        // sets _parent, _depth, creates BuildContext, etc
    this.state._mount(this);    // Initialize state and call initState + didChangeDependencies
  }

  /**
   * Unmount the element
   */
  unmount() {
    try {
      this.state.dispose();
    } catch (error) {
      console.error(`dispose error in ${this._debugLabel}:`, error);
    }

    this.state._unmount();
    super.unmount();
  }

  activate() {
    this.state._reactivate();          // Use hook
    super.activate?.();                // optional if base has it
  }

  /**
   * Deactivate the element
   */
  deactivate() {
    try {
      this.state.deactivate();
    } catch (error) {
      console.error(`deactivate error in ${this._debugLabel}:`, error);
    }
    this.state._deactivate();
    super.deactivate();
  }

  /**
   * Update widget
   */
  updateWidget(newWidget) {
    const oldWidget = this.widget;
    this.widget = newWidget;
    this.state._updateWidget(newWidget);   // Use internal hook

    try {
      this.state.didUpdateWidget(oldWidget);
    } catch (error) {
      console.error(`didUpdateWidget error in ${this._debugLabel}:`, error);
    }

    this.markNeedsBuild();
  }

  /**
   * Perform rebuild
   */
  performRebuild() {
    try {
      return this.state.build(this.context);
    } catch (error) {
      console.error(`build error in ${this._debugLabel}:`, error);
      throw error;
    }
  }

  reassemble() {
    try {
      this.state.reassemble();
    } catch (error) {
      console.error(`reassemble error: ${error}`);
    }
    super.reassemble();
  }

  didChangeDependencies() {
    try {
      this.state.didChangeDependencies();
    } catch (error) {
      console.error(`didChangeDependencies error: ${error}`);
    }
  }

  /**
   * Debug properties for StatefulElement
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'stateType', value: this.state.constructor.name });
    properties.push({ name: 'stateInitialized', value: this.state._didInitState });
  }
}

// ============================================================================
// 8. ERROR WIDGET
// ============================================================================

class ErrorWidget extends StatelessWidget {
  constructor({ message = 'Error', error = null } = {}) {
    super();
    this.message = message;
    this.error = error;
  }

  build(context) {
    return new VNode({
      tag: 'div',
      props: {
        style: {
          backgroundColor: '#ff1744',
          color: 'white',
          padding: '16px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }
      },
      children: [this.message]
    });
  }
}

// ============================================================================
// 9. PROXY ELEMENT (for ProxyWidget)
// ============================================================================

class ProxyElement extends Element {
  constructor(widget) {
    super(widget);
  }

  mount(parent = null) {
    super.mount(parent);
  }

  performRebuild() {
    // ProxyWidget typically renders child directly
    if (this.widget.child) {
      const childElement = this.widget.child.createElement?.();
      if (childElement && childElement.mount) {
        childElement.mount(this);
      }
      return childElement?.performRebuild?.() || null;
    }
    return null;
  }
}

// ============================================================================
// 10. INHERITED ELEMENT (for InheritedWidget)
// ============================================================================

class InheritedElement extends ProxyElement {
  constructor(widget) {
    super(widget);
    this._dependents = new Set();
  }

  performRebuild() {
    // Render child
    if (this.widget.child) {
      const childElement = this.widget.child.createElement?.();
      if (childElement && childElement.mount) {
        childElement.mount(this);
      }
      return childElement?.performRebuild?.() || null;
    }
    return null;
  }
}

// ============================================================================
// 11. NOTIFICATION LISTENER ELEMENT
// ============================================================================

class NotificationListenerElement extends ProxyElement {
  constructor(widget) {
    super(widget);
  }

  performRebuild() {
    if (this.widget.child) {
      const childElement = this.widget.child.createElement?.();
      if (childElement && childElement.mount) {
        childElement.mount(this);
      }
      return childElement?.performRebuild?.() || null;
    }
    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GlobalKey,
  ValueKey,
  ObjectKey,
  Key,
  ProxyWidget,
  ProxyElement,
  InheritedWidget,
  InheritedElement,
  Notification,
  NotificationListener,
  NotificationListenerElement,
  ErrorWidget,
  Diagnosticable,
  Widget,
  Element,
  StatelessWidget,
  StatelessElement,
  StatefulWidget,
  StatefulElement
};