/**
 * FlutterJS Element System - FIXED VERSION
 * 
 * Elements are the live instances that bridge widgets and DOM.
 * They manage the lifecycle, state, and rendering of widgets.
 */

import { BuildContext } from './build_context.js';

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

export class Diagnosticable {
  toStringShort() {
    return `${this.constructor.name}${this.key ? `(key: ${this.key})` : '(unkeyed)'}`;
  }

  toDiagnosticsNode(name = null, style = DiagnosticsTreeStyle.sparse) {
    return {
      name: name || this.constructor.name,
      value: this,
      style: style,
      toString: () => this.toStringShort()
    };
  }

  debugFillProperties(properties) {
    if (this.key !== null && this.key !== undefined) {
      properties.push({ name: 'key', value: this.key });
    }
  }

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

/**
 * Base Element Class
 * 
 * Represents a node in the element tree. Elements are created from widgets
 * and manage the actual rendering and lifecycle.
 */
class Element extends Diagnosticable {
  constructor(widget, parent = null, runtime = null) {
    super();

    if (!widget) {
      throw new Error('Widget is required for Element creation');
    }

    if (!runtime) {
      throw new Error('RUNTIME IS UNDEFINED! Runtime is required for Element creation');
    }

    // ✅ Use private property for widget storage
    this._widget = widget;
    this._parent = parent;
    this.runtime = runtime;

    // Element tree structure
    this._children = [];
    this._childMap = new Map();

    // Rendering state
    this._vnode = null;
    this._domNode = null;

    // Lifecycle state
    this._mounted = false;
    this._dirty = false;
    this._building = false;

    // Tree position
    this._depth = parent ? (parent._depth || 0) + 1 : 0;

    // Identity
    this.key = widget.key;
    this._id = Element.generateId();

    // Metadata
    this._buildCount = 0;
    this._lastBuildTime = 0;
    this._lastBuildDuration = 0;

    // Build context
    this._context = null;
  }

  // ============================================================================
  // PROPERTIES - Getter/Setter pattern
  // ============================================================================

  get widget() {
    return this._widget;
  }

  set widget(newWidget) {
    this._widget = newWidget;
  }

  get parent() {
    return this._parent;
  }

  set parent(p) {
    this._parent = p;
  }

  get children() {
    return this._children;
  }

  get depth() {
    return this._depth;
  }

  get id() {
    return this._id;
  }

  get mounted() {
    return this._mounted;
  }

  get dirty() {
    return this._dirty;
  }

  get building() {
    return this._building;
  }

  get vnode() {
    return this._vnode;
  }

  set vnode(v) {
    this._vnode = v;
  }

  get domNode() {
    return this._domNode;
  }

  set domNode(d) {
    this._domNode = d;
  }

  get context() {
    if (!this._context) {
      this._context = new BuildContext(this, this.runtime);
    }
    return this._context;
  }

  // ============================================================================
  // CORE METHODS
  // ============================================================================

  /**
   * Perform rebuild - must be overridden by subclasses
   */
  performRebuild() {
    throw new Error(`${this.constructor.name}.performRebuild() must be implemented by subclass`);
  }

  /**
   * Mount element (first time attachment to tree)
   */
  mount(parent = null) {
    if (this._mounted) {
      console.warn(`[Element] ${this._id} already mounted`);
      return;
    }

    try {
      this._mounted = true;

      // Update parent if provided
      if (parent) {
        this._parent = parent;
        this._depth = (parent._depth || 0) + 1;
      }

      // Perform initial rebuild
      this._vnode = this.performRebuild();

      // Mount children
      this._children.forEach(child => {
        if (!child._mounted) {
          child.mount(this);
        }
      });

      this.didMount();
    } catch (error) {
      this._mounted = false;
      throw new Error(`Failed to mount ${this.constructor.name}: ${error.message}`);
    }
  }

  /**
   * Rebuild element when dirty
   */
  rebuild() {
    if (!this._mounted) {
      console.warn(`[Element] Cannot rebuild unmounted element ${this._id}`);
      return;
    }

    if (this._building) {
      console.warn(`[Element] Recursive rebuild detected for ${this._id}`);
      return;
    }

    try {
      this._building = true;

      const oldVNode = this._vnode;

      // Perform rebuild
      this._vnode = this.performRebuild();

      // Apply changes
      this.applyChanges(oldVNode, this._vnode);

      this._dirty = false;
    } catch (error) {
      console.error(`[Element] Rebuild failed for ${this._id}:`, error);
      throw error;
    } finally {
      this._building = false;
    }
  }

  /**
   * Apply changes from VNode diff
   */
  applyChanges(oldVNode, newVNode) {
    if (this.runtime.config && this.runtime.config.debugMode) {
      console.log(`[Element] Applied changes to ${this._id}`);
    }
  }

  /**
   * Mark element as needing rebuild
   */
  markNeedsBuild() {
    if (this._dirty) {
      return;
    }

    if (!this._mounted) {
      console.warn(`[Element] Cannot mark unmounted element ${this._id} dirty`);
      return;
    }

    this._dirty = true;

    // Notify runtime if available
    if (this.runtime && this.runtime.markNeedsBuild) {
      this.runtime.markNeedsBuild(this);
    }
  }

  /**
   * Unmount element
   */
  unmount() {
    if (!this._mounted) {
      return;
    }

    try {
      this.willUnmount();

      // Unmount children first
      this._children.forEach(child => {
        if (child._mounted) {
          child.unmount();
        }
      });

      // Clear references
      this._children = [];
      this._childMap.clear();
      this._vnode = null;
      this._domNode = null;

      this._mounted = false;
      this._dirty = false;

      this.didUnmount();
    } catch (error) {
      console.error(`[Element] Unmount failed for ${this._id}:`, error);
    }
  }

  /**
   * Update element with new widget
   */
  updateWidget(newWidget) {
    if (!newWidget) {
      throw new Error('New widget is required for update');
    }

    const oldWidget = this._widget;
    this.widget = newWidget;

    if (this.shouldRebuild(oldWidget, newWidget)) {
      this.markNeedsBuild();
    }

    this.didUpdateWidget(oldWidget, newWidget);
  }

  /**
   * Determine if rebuild is needed
   */
  shouldRebuild(oldWidget, newWidget) {
    if (oldWidget === newWidget) {
      return false;
    }

    if (oldWidget.constructor !== newWidget.constructor) {
      return true;
    }

    return !this.areWidgetsEqual(oldWidget, newWidget);
  }

  /**
   * Compare two widgets for equality
   */
  areWidgetsEqual(w1, w2) {
    if (w1.constructor !== w2.constructor) {
      return false;
    }

    const keys1 = Object.keys(w1);
    const keys2 = Object.keys(w2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    return keys1.every(key => {
      const val1 = w1[key];
      const val2 = w2[key];

      if (typeof val1 === 'function' && typeof val2 === 'function') {
        return true;
      }

      if (typeof val1 === 'object' && typeof val2 === 'object') {
        try {
          return JSON.stringify(val1) === JSON.stringify(val2);
        } catch {
          return false;
        }
      }

      return val1 === val2;
    });
  }

  /**
   * Add child element
   */
  addChild(child) {
    if (!child) {
      throw new Error('Child element is required');
    }

    this._children.push(child);

    if (child.key) {
      this._childMap.set(child.key, child);
    }

    child.parent = this;
  }

  /**
   * Remove child element
   */
  removeChild(child) {
    const index = this._children.indexOf(child);

    if (index !== -1) {
      this._children.splice(index, 1);
    }

    if (child.key) {
      this._childMap.delete(child.key);
    }

    child.parent = null;
  }

  /**
   * Find child by key
   */
  findChildByKey(key) {
    return this._childMap.get(key);
  }

  /**
   * Find ancestor of type
   */
  findAncestorOfType(ElementType) {
    let current = this._parent;

    while (current) {
      if (current instanceof ElementType) {
        return current;
      }
      current = current._parent;
    }

    return null;
  }

  /**
   * Visit all ancestors
   */
  visitAncestors(visitor) {
    let current = this._parent;

    while (current) {
      const shouldContinue = visitor(current);
      if (shouldContinue === false) {
        break;
      }
      current = current._parent;
    }
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  didMount() {
    // Override in subclasses
  }

  didUpdateWidget(oldWidget, newWidget) {
    // Override in subclasses
  }

  willUnmount() {
    // Override in subclasses
  }

  didUnmount() {
    // Override in subclasses
  }

  reassemble() {
    // Override in subclasses
  }

  activate() {
    // Override in subclasses
  }

  deactivate() {
    // Override in subclasses
  }

  didChangeDependencies() {
    // Override in subclasses
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  getStats() {
    return {
      id: this._id,
      type: this.constructor.name,
      mounted: this._mounted,
      dirty: this._dirty,
      depth: this._depth,
      childCount: this._children.length,
      buildCount: this._buildCount,
      lastBuildDuration: this._lastBuildDuration,
      hasKey: !!this.key
    };
  }

  static generateId() {
    return `el_${++Element._counter}`;
  }

  static resetCounter() {
    Element._counter = 0;
  }
}




// Initialize counter
Element._counter = 0;

/**
 * StatelessElement
 * 
 * Element for StatelessWidget. These elements don't have state,
 * they just build based on their widget's configuration.
 */
class StatelessElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
  }

  build() {
    console.log('📦 StatelessElement.build() START', {
      widgetType: this.widget?.constructor.name,
      widgetInstance: this.widget,
      hasBuildMethod: typeof this.widget?.build === 'function'
    });

    const context = this.buildContext();

    try {
      // STEP 1: Call widget's build method
      console.log('📝 Calling widget.build(context)...');
      const result = this.widget.build(context);

      console.log('✓ widget.build() returned:', {
        resultType: typeof result,
        resultConstructor: result?.constructor?.name,
        resultKeys: result ? Object.keys(result).slice(0, 5) : null,
        isVNode: result?.tag !== undefined,
        isString: typeof result === 'string',
        isNull: result === null,
        result: result
      });

      if (!result) {
        console.warn('⚠️ Result is null/undefined');
        throw new Error('StatelessWidget.build() returned null');
      }

      // STEP 2: Check if result is a DOM element (the culprit!)
      if (result instanceof HTMLElement) {
        console.error('❌ FOUND THE ISSUE!');
        console.error('   Widget returned an HTMLElement instead of a Widget/VNode');
        console.error('   Element type:', result.tagName);
        console.error('   Element:', result);
        console.error('   Widget class:', this.widget.constructor.name);
        console.error('   This means widget.build() is directly manipulating the DOM');
        throw new Error(
          `❌ CRITICAL: ${this.widget.constructor.name}.build() returned an HTMLElement (${result.tagName}). ` +
          `build() must return a Widget or VNode, not a DOM element!`
        );
      }

      // STEP 3: Check if result is a widget (not a VNode)
      const isWidget = result &&
        typeof result === 'object' &&
        result.constructor.name &&
        !result.tag;

      if (isWidget) {
        console.log('🔄 Result is a Widget, recursively building...');
        const childElement = this.runtime.createElement(result, this);

        if (!childElement) {
          throw new Error('Failed to create element from child widget');
        }

        return childElement.build();
      }

      // STEP 4: Check if it's a VNode
      if (result?.tag) {
        console.log('✓ Result is a VNode');
        return result;
      }

      // STEP 5: Check if it's a string/primitive
      if (typeof result === 'string' || typeof result === 'number') {
        console.log('✓ Result is a primitive:', result);
        return result;
      }

      console.warn('⚠️ Unknown result type:', result);
      return result;

    } catch (error) {
      console.error('❌ Build error:', error);
      console.error('   Widget:', this.widget?.constructor.name);
      console.error('   Error message:', error.message);
      throw new Error(`StatelessWidget build failed: ${error.message}`);
    }
  }

  buildContext() {
    return new BuildContext(this, this.runtime);
  }
}


/**
 * StatefulElement
 * 
 * Element for StatefulWidget. These elements own a State object
 * that persists across rebuilds.
 */
class StatefulElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);

    if (!widget.createState || typeof widget.createState !== 'function') {
      throw new Error('StatefulWidget must implement createState()');
    }

    this.state = widget.createState();

    if (!this.state) {
      throw new Error('createState() returned null or undefined');
    }

    this.state._element = this;
    this.state._widget = widget;
    this.state._mounted = false;
  }

  build() {
    const context = this.buildContext();

    try {
      if (!this.state.build || typeof this.state.build !== 'function') {
        throw new Error('State must implement build() method');
      }

      const result = this.state.build(context);

      if (!result) {
        throw new Error('State.build() returned null');
      }

      // ✅ FIX: If result is a widget (not a VNode), convert to element and build
      if (result && typeof result === 'object' && result.constructor.name && !result.tag) {
        // This is a widget, not a VNode
        const childElement = this.runtime.createElement(result, this);

        if (!childElement) {
          throw new Error('Failed to create element from child widget');
        }

        // Recursively build the child element
        return childElement.build();
      }

      return result;
    } catch (error) {
      throw new Error(`StatefulWidget build failed: ${error.message}`);
    }
  }

  mount() {
    if (this.state.initState && typeof this.state.initState === 'function') {
      try {
        this.state.initState();
      } catch (error) {
        console.error(`[StatefulElement] initState failed:`, error);
      }
    }

    this.state._mounted = true;
    super.mount();
  }

  update(newWidget) {
    const oldWidget = this.widget;

    // ✅ FIX: Use setter
    this.widget = newWidget;
    this.state._widget = newWidget;

    if (this.state.didUpdateWidget && typeof this.state.didUpdateWidget === 'function') {
      try {
        this.state.didUpdateWidget(oldWidget);
      } catch (error) {
        console.error(`[StatefulElement] didUpdateWidget failed:`, error);
      }
    }

    if (this.shouldRebuild(oldWidget, newWidget)) {
      this.markNeedsBuild();
    }
  }

  unmount() {
    if (this.state.dispose && typeof this.state.dispose === 'function') {
      try {
        this.state.dispose();
      } catch (error) {
        console.error(`[StatefulElement] dispose failed:`, error);
      }
    }

    this.state._mounted = false;
    super.unmount();
  }

  buildContext() {
    return new BuildContext(this, this.runtime, this.state);
  }

  getStats() {
    const stats = super.getStats();
    return {
      ...stats,
      hasState: !!this.state,
      stateMounted: this.state ? this.state._mounted : false
    };
  }
}

/**
 * ComponentElement
 * 
 * Generic element for custom components that don't fit
 * the standard widget patterns.
 */
class ComponentElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
    this.componentState = {};
  }

  build() {
    const method = this.widget.render || this.widget.build;

    if (!method || typeof method !== 'function') {
      throw new Error('ComponentElement widget must have render() or build() method');
    }

    const context = this.buildContext();

    try {
      const result = method.call(this.widget, context);

      // ✅ FIX: If result is a widget (not a VNode), convert to element and build
      if (result && typeof result === 'object' && result.constructor.name && !result.tag) {
        const childElement = this.runtime.createElement(result, this);

        if (!childElement) {
          throw new Error('Failed to create element from child widget');
        }

        return childElement.build();
      }

      return result;
    } catch (error) {
      throw new Error(`Component build failed: ${error.message}`);
    }
  }

  buildContext() {
    return {
      element: this,
      runtime: this.runtime,
      widget: this.widget,
      state: this.componentState,

      setState: (updates) => {
        Object.assign(this.componentState, updates);
        this.markNeedsBuild();
      }
    };
  }
}

export {
  Element,
  StatelessElement,
  StatefulElement,
  ComponentElement,
  DiagnosticLevel
};