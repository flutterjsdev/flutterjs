import { BuildContext } from './build_context.js';
import { FrameworkScheduler } from './scheduler.js';
import { ElementIdentifier } from './element_identifier.js';
// ============================================================================
// 4. WIDGET CLASS - Abstract base
// ============================================================================

/**
 * Widget - Abstract base class for all widgets
 */
class Widget {
  constructor(key = null) {
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
    return `${this.constructor.name}${this.key ? `-${this.key}` : ''}`;
  }

  toString() {
    return this.toStringShort();
  }
}

// ============================================================================
// 5. ELEMENT CLASS - Base element
// ============================================================================

/**
 * Element - Represents an instance of a widget in the widget tree
 */
class Element {
  constructor(widget) {
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
      console.log(`📍 Mount: ${this._debugLabel} (depth: ${this._depth})`);
      console.log(`   Path: ${path}`);
      console.log(`   ID: ${this._elementId}`);
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
      console.log(`🗑️  Unmount: ${this._debugLabel}`);
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

  /**
   * Perform rebuild
   */
  performRebuild() {
    const builtWidget = this.widget.build(this.context);
    return builtWidget;
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
}

// ============================================================================
// EXPORTS
// ============================================================================

export {


  Widget,
  Element,
  StatelessWidget,
  StatelessElement,
  StatefulWidget,
  StatefulElement
};

