import { BuildContext } from './build_context.js';
import { FrameworkScheduler } from './scheduler.js';
import { ElementIdentifier } from './element_identifier.js';
import { BuildOwner } from './build_owner.js';

// ============================================================================
// DIAGNOSTIC LEVELS - Mirror Dart's DiagnosticLevel
// ============================================================================

const DiagnosticLevel = {
  hidden: 'hidden',
  fine: 'fine',
  debug: 'debug',
  info: 'info',
  warning: 'warning',
  hint: 'hint',
  summary: 'summary',
  error: 'error',
  off: 'off'
};

const DiagnosticsTreeStyle = {
  none: 'none',
  sparse: 'sparse',
  offstage: 'offstage',
  dense: 'dense',
  transition: 'transition',
  error: 'error',
  whitespace: 'whitespace',
  flat: 'flat',
  singleLine: 'singleLine',
  errorProperty: 'errorProperty',
  shallow: 'shallow',
  truncateChildren: 'truncateChildren'
};

// ============================================================================
// DIAGNOSTICABLE MIXIN - Minimal debug support
// ============================================================================

class Diagnosticable {
  /**
   * Short one-line description of the object
   * Usually: ClassName(key: keyValue) or ClassName(unkeyed)
   */
  toStringShort() {
    return `${this.constructor.name}${this.key ? `(key: ${this.key})` : '(unkeyed)'}`;
  }

  /**
   * Get diagnostics node for this object
   * Used by debugging tools and toStringDeep
   */
  toDiagnosticsNode(name = null, style = DiagnosticsTreeStyle.sparse) {
    return {
      name: name || this.constructor.name,
      value: this,
      style: style,
      toString: () => this.toStringShort()
    };
  }

  /**
   * Fill in properties for debugging
   * Override in subclasses to add custom properties
   * 
   * Example:
   * debugFillProperties(props) {
   *   props.push({ name: 'enabled', value: this.enabled });
   *   props.push({ name: 'count', value: this.count });
   * }
   */
  debugFillProperties(properties) {
    // Base implementation: add key if present
    if (this.key !== null && this.key !== undefined) {
      properties.push({ name: 'key', value: this.key });
    }
  }

  /**
   * Get all debug info for this object
   * Returns: { type, key, properties, style }
   */
  debugInfo() {
    const properties = [];
    this.debugFillProperties(properties);
    
    return {
      type: this.constructor.name,
      key: this.key || null,
      properties: properties,
      style: this.style || DiagnosticsTreeStyle.sparse,
      description: this.toStringShort()
    };
  }

  /**
   * Development-only string representation
   * In production (NODE_ENV !== 'development'), returns short version
   */
  toString() {
    if (process.env.NODE_ENV === 'development') {
      const info = this.debugInfo();
      if (info.properties.length === 0) {
        return this.toStringShort();
      }
      const propsStr = info.properties
        .map(p => `${p.name}: ${p.value}`)
        .join(', ');
      return `${this.toStringShort()} { ${propsStr} }`;
    }
    return this.toStringShort();
  }
}

// ============================================================================
// 4. WIDGET CLASS - With Diagnosticable
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
// 5. ELEMENT CLASS - Base element with debug support
// ============================================================================

/**
 * Element - Represents an instance of a widget in the widget tree
 */
class Element extends Diagnosticable {
  constructor(widget) {
    super();
    if (!widget) {
      throw new Error('Element requires a widget');
    }

    this.widget = widget;
    this._parent = null;
    this._children = [];
    this._mounted = false;
    this._depth = 0;
    this._deactivated = false;
    this._elementId = null;
    this._identificationStrategy = null;  // 'keyed' or 'unkeyed'
    
    // Global identifier generator
    if (!Element._identifier) {
      Element._identifier = new ElementIdentifier();
    }
    
    // Performance tracking
    this._debugLabel = widget.constructor.name;
    this.key = widget.key; // For diagnostic purposes

    // Create context
    this.context = new BuildContext(this);
  }

  /**
   * Mount this element into the tree
   */
  mount(parent = null) {
    this._parent = parent;
    this._mounted = true;

    // Calculate depth for scheduler optimization
    if (parent) {
      this._depth = parent._depth + 1;
    } else {
      this._depth = 0;
    }

    // Generate element ID based on identification strategy
    this._generateElementId();

    if (FrameworkScheduler._config.debugMode) {
      const path = Element._identifier.getWidgetPath(this);
      console.log(`ðŸ" Mount: ${this._debugLabel} (depth: ${this._depth})`);
      console.log(`   Path: ${path}`);
      console.log(`   ID: ${this._elementId}`);
      console.log(`   Debug Info:`, this.debugInfo());
    }
  }

  /**
  * Generate element ID using Flutter-style identification
  */
  _generateElementId() {
    this._elementId = Element._identifier.getElementId(this);

    // Determine strategy for debugging
    if (this.widget.key) {
      this._identificationStrategy = 'keyed';
    } else {
      this._identificationStrategy = 'unkeyed';
    }
  }

  /**
   * Get unique element ID
   */
  getElementId() {
    return this._elementId;
  }

  /**
  * Get identification strategy (for debugging)
  */
  getIdentificationStrategy() {
    return this._identificationStrategy;
  }

  /**
   * Get complete widget path in tree
   */
  getWidgetPath() {
    return Element._identifier.getWidgetPath(this);
  }

  /**
   * Unmount this element from the tree
   */
  unmount() {
    this._mounted = false;

    // Unmount all children
    for (const child of this._children) {
      child.unmount();
    }

    this._children = [];

    if (FrameworkScheduler._config.debugMode) {
      console.log(`ðŸ—'ï¸  Unmount: ${this._debugLabel}`);
    }
  }

  /**
   * Deactivate this element
   */
  deactivate() {
    this._deactivated = true;
    for (const child of this._children) {
      child.deactivate();
    }
  }

  /**
   * Mark this element as needing rebuild
   */
  markNeedsBuild() {
    if (!this._mounted || this._deactivated) {
      return;
    }
    FrameworkScheduler.markNeedsBuild(this);
  }

  /**
   * Mark this element as needing layout
   */
  markNeedsLayout() {
    if (!this._mounted || this._deactivated) {
      return;
    }
    FrameworkScheduler.markNeedsLayout(this);
  }

  /**
   * Perform rebuild
   */
  performRebuild() {
    // Override in subclasses
  }

  /**
   * Perform layout
   */
  performLayout() {
    // Override in subclasses
  }

  /**
   * Add child element
   */
  addChild(child) {
    this._children.push(child);
    // Invalidate ID cache when tree structure changes
    Element._identifier.invalidateCache();
  }

  /**
   * Remove child element
   */
  removeChild(child) {
    const index = this._children.indexOf(child);
    if (index > -1) {
      this._children.splice(index, 1);
      Element._identifier.invalidateCache();
    }
  }

  /**
   * Check if this element can update with new widget
   */
  static canUpdate(oldElement, newWidget) {
    // 1. Check if widget types match
    if (oldElement?.widget.constructor !== newWidget?.constructor) {
      return false;
    }

    // 2. If both have keys, they must match
    if (oldElement?.widget.key && newWidget?.key) {
      return oldElement.widget.key === newWidget.key;
    }

    // 3. If both are keyless, they can update (position-based)
    if (!oldElement?.widget.key && !newWidget?.key) {
      return true;
    }

    // 4. Mismatch: one keyed, one keyless
    return false;
  }

  /**
   * Debug properties for Element
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'mounted', value: this._mounted });
    properties.push({ name: 'depth', value: this._depth });
    properties.push({ name: 'childCount', value: this._children.length });
    if (this._identificationStrategy) {
      properties.push({ name: 'identificationStrategy', value: this._identificationStrategy });
    }
  }

  /**
   * Get debug label
   */
  get debugLabel() {
    return this._debugLabel;
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

   reassemble() {}
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


  // New: Called during hot reload
  reassemble() {}
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
    super.mount(parent);

    this.state._mounted = true;

    // Initialize state (call only once)
    if (!this.state._didInitState) {
      this.state._didInitState = true;
      try {
        this.state.initState();
      } catch (error) {
        console.error(`initState error in ${this._debugLabel}:`, error);
      }
    }

    // Notify of dependencies
    try {
      this.state.didChangeDependencies();
    } catch (error) {
      console.error(`didChangeDependencies error in ${this._debugLabel}:`, error);
    }
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

    this.state._mounted = false;
    super.unmount();
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

    super.deactivate();
  }

  /**
   * Update widget
   */
  updateWidget(newWidget) {
    const oldWidget = this.widget;
    this.widget = newWidget;
    this.state.widget = newWidget;

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
// EXPORTS
// ============================================================================

export {
  GlobalKey,
  ValueKey,
  ObjectKey,
  Key,
  ProxyWidget,
  InheritedWidget,
  Notification,
  NotificationListener,
  ErrorWidget,
  DiagnosticLevel,
  DiagnosticsTreeStyle,
  Diagnosticable,
  Widget,
  Element,
  StatelessWidget,
  StatelessElement,
  StatefulWidget,
  StatefulElement
};