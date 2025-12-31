/**
 * FlutterJS Element System - FIXED VERSION
 * 
 * Elements are the live instances that bridge widgets and DOM.
 * They manage the lifecycle, state, and rendering of widgets.
 */

import { BuildContext } from './build_context.js';

// ============================================================================
// DIAGNOSTIC LEVELS
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
// DIAGNOSTICABLE MIXIN
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

    this._widget = widget;
    this._parent = parent;
    this.runtime = runtime;

    this._children = [];
    this._childMap = new Map();

    this._vnode = null;
    this._domNode = null;

    this._mounted = false;
    this._dirty = false;
    this._building = false;

    this._depth = parent ? (parent._depth || 0) + 1 : 0;

    this.key = widget.key;
    this._id = Element.generateId();

    this._buildCount = 0;
    this._lastBuildTime = 0;
    this._lastBuildDuration = 0;

    this._context = null;
  }

  // ============================================================================
  // PROPERTIES
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

  performRebuild() {
    throw new Error(`${this.constructor.name}.performRebuild() must be implemented by subclass`);
  }

  mount(parent = null) {
    if (this._mounted) {
      console.warn(`[Element] ${this._id} already mounted`);
      return;
    }

    try {
      this._mounted = true;

      if (parent) {
        this._parent = parent;
        this._depth = (parent._depth || 0) + 1;
      }

      this._vnode = this.performRebuild();

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

      this._vnode = this.performRebuild();

      this.applyChanges(oldVNode, this._vnode);

      this._dirty = false;
    } catch (error) {
      console.error(`[Element] Rebuild failed for ${this._id}:`, error);
      throw error;
    } finally {
      this._building = false;
    }
  }

  applyChanges(oldVNode, newVNode) {
    if (this.runtime.config && this.runtime.config.debugMode) {
      console.log(`[Element] Applied changes to ${this._id}`);
    }
  }

  markNeedsBuild() {
    if (this._dirty) {
      return;
    }

    if (!this._mounted) {
      console.warn(`[Element] Cannot mark unmounted element ${this._id} dirty`);
      return;
    }

    this._dirty = true;

    if (this.runtime && this.runtime.markNeedsBuild) {
      this.runtime.markNeedsBuild(this);
    }
  }

  unmount() {
    if (!this._mounted) {
      return;
    }

    try {
      this.willUnmount();

      this._children.forEach(child => {
        if (child._mounted) {
          child.unmount();
        }
      });

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

  shouldRebuild(oldWidget, newWidget) {
    if (oldWidget === newWidget) {
      return false;
    }

    if (oldWidget.constructor !== newWidget.constructor) {
      return true;
    }

    return !this.areWidgetsEqual(oldWidget, newWidget);
  }

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

  findChildByKey(key) {
    return this._childMap.get(key);
  }

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

Element._counter = 0;

/**
 * StatelessElement - FIXED VERSION
 * 
 * ✅ KEY FIX: Properly handle recursive widget building
 * When widget.build() returns another widget (not a VNode),
 * we need to mount and build that widget recursively.
 */
class StatelessElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
  }

  /**
   * ✅ FIXED: Recursive widget-to-VNode building
   * This method properly handles the case where widget.build()
   * returns another Widget instead of a VNode
   */
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
        isVNode: result?.tag !== undefined,
        isString: typeof result === 'string',
        isNull: result === null,
      });

      if (!result) {
        console.warn('⚠️ Result is null/undefined');
        throw new Error('StatelessWidget.build() returned null');
      }

      // STEP 2: Check if result is an HTMLElement (error case)
      if (result instanceof HTMLElement) {
        console.error('❌ CRITICAL: Widget returned an HTMLElement instead of Widget/VNode');
        throw new Error(
          `${this.widget.constructor.name}.build() returned an HTMLElement (${result.tagName}). ` +
          `build() must return a Widget or VNode, not a DOM element!`
        );
      }

      // STEP 3: ✅ Check if it's already a VNode
      if (result && typeof result === 'object' && result.tag) {
        console.log('✅ Result is a VNode, returning');
        return result;
      }

      // STEP 4: ✅ Check if it's a string/number/primitive
      if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
        console.log('✅ Result is a primitive:', result);
        return result;
      }

      // STEP 5: ✅ Check if it's a Widget (has build method or createState)
      const isWidget = result &&
        typeof result === 'object' &&
        (typeof result.build === 'function' || typeof result.createState === 'function');

      if (isWidget) {
        console.log('🔄 Result is a Widget, need to build recursively:', result.constructor.name);
        
        // ✅ FIX: Create element for this widget
        const childElement = this._createElementForWidget(result);

        console.log('✅ Created child element:', childElement.constructor.name);

        // ✅ FIX: Set parent before building (don't call mount yet)
        childElement._parent = this;
        childElement._depth = this._depth + 1;
        childElement._mounted = true;  // Mark as mounted for build context

        console.log('✅ Set up child element parent/depth');

        // ✅ FIX: Recursively build the child element to get VNode
        const childVNode = childElement.build();

        console.log('✅ Child element.build() returned:', {
          hasTag: childVNode?.tag !== undefined,
          type: typeof childVNode
        });

        if (!childVNode) {
          throw new Error('Child element.build() returned null');
        }

        return childVNode;
      }

      // If we get here, it's an unknown type
      console.warn('⚠️ Unknown result type from build():', result);
      return result;

    } catch (error) {
      console.error('❌ Build error:', error.message);
      console.error('   Widget:', this.widget?.constructor.name);
      throw new Error(`StatelessWidget build failed: ${error.message}`);
    }
  }

  /**
   * ✅ Helper to create appropriate element type for a widget
   * @private
   */
  _createElementForWidget(widget) {
    if (typeof widget.createState === 'function') {
      console.log('  Creating StatefulElement for:', widget.constructor.name);
      return new StatefulElement(widget, this, this.runtime);
    } else if (widget.updateShouldNotify && typeof widget.updateShouldNotify === 'function') {
      console.log('  Creating InheritedElement for:', widget.constructor.name);
      const { InheritedElement } = require('./inherited_element.js');
      return new InheritedElement(widget, this, this.runtime);
    } else {
      console.log('  Creating StatelessElement for:', widget.constructor.name);
      return new StatelessElement(widget, this, this.runtime);
    }
  }

  buildContext() {
    return new BuildContext(this, this.runtime);
  }
}

/**
 * StatefulElement - FIXED VERSION
 * 
 * ✅ Same recursive building logic as StatelessElement
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

  /**
   * ✅ FIXED: Same recursive building as StatelessElement
   */
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

      // ✅ FIX: Check if it's a VNode first
      if (result && typeof result === 'object' && result.tag) {
        return result;
      }

      // ✅ FIX: Check if it's a primitive
      if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
        return result;
      }

      // ✅ FIX: Check if it's a widget and build recursively
      const isWidget = result &&
        typeof result === 'object' &&
        (typeof result.build === 'function' || typeof result.createState === 'function');

      if (isWidget) {
        console.log('🔄 State.build() returned a Widget, building recursively:', result.constructor.name);
        
        const childElement = this._createElementForWidget(result);
        
        // ✅ FIX: Set up parent/depth without calling mount
        childElement._parent = this;
        childElement._depth = this._depth + 1;
        childElement._mounted = true;
        
        const childVNode = childElement.build();

        if (!childVNode) {
          throw new Error('Child element.build() returned null');
        }

        return childVNode;
      }

      return result;
    } catch (error) {
      throw new Error(`StatefulWidget build failed: ${error.message}`);
    }
  }

  /**
   * ✅ Helper to create appropriate element type for a widget
   * @private
   */
  _createElementForWidget(widget) {
    if (typeof widget.createState === 'function') {
      return new StatefulElement(widget, this, this.runtime);
    } else if (widget.updateShouldNotify && typeof widget.updateShouldNotify === 'function') {
      const { InheritedElement } = require('./inherited_element.js');
      return new InheritedElement(widget, this, this.runtime);
    } else {
      return new StatelessElement(widget, this, this.runtime);
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
 * ComponentElement - Custom components
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

      // ✅ FIX: Recursive building
      if (result && typeof result === 'object' && result.tag) {
        return result;
      }

      if (typeof result === 'string' || typeof result === 'number') {
        return result;
      }

      const isWidget = result &&
        typeof result === 'object' &&
        (typeof result.build === 'function' || typeof result.createState === 'function');

      if (isWidget) {
        const childElement = this._createElementForWidget(result);
        
        // ✅ FIX: Set up parent/depth without calling mount
        childElement._parent = this;
        childElement._depth = this._depth + 1;
        childElement._mounted = true;
        
        return childElement.build();
      }

      return result;
    } catch (error) {
      throw new Error(`Component build failed: ${error.message}`);
    }
  }

  _createElementForWidget(widget) {
    if (typeof widget.createState === 'function') {
      return new StatefulElement(widget, this, this.runtime);
    } else {
      return new StatelessElement(widget, this, this.runtime);
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