/**
 * FlutterJS Element System - FIXED VERSION
 * 
 * ✅ CRITICAL FIX: StatefulElement.mount() now calls state._mount()
 * This ensures this.widget is properly initialized in State
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


// ✅ Helper function to check if something is a REAL VNode
function isRealVNode(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check for VNode properties AND structure
  const hasTag = typeof obj.tag === 'string';  // ✅ tag must be STRING (HTML tag name)
  const hasChildren = Array.isArray(obj.children) || obj.children === null || obj.children === undefined;
  const hasProps = obj.props === null || obj.props === undefined || typeof obj.props === 'object';

  // VNode should NOT have build() or createState() methods
  const isNotWidget = typeof obj.build !== 'function' && typeof obj.createState !== 'function';

  // All conditions must be true
  return hasTag && hasChildren && hasProps && isNotWidget;
}

// ✅ Helper function to check if something is a Widget
function isWidget(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  return (
    typeof obj.build === 'function' ||
    typeof obj.createState === 'function' ||
    typeof obj.render === 'function'
  );
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

  getElementId() {
    return this._id;
  }

  getWidgetPath() {
    if (this._widgetPath) return this._widgetPath;

    const name = this.widget?.constructor?.name || 'Unknown';
    const parentPath = this.parent?.getWidgetPath ? this.parent.getWidgetPath() : '';

    this._widgetPath = parentPath ? `${parentPath}/${name}` : name;
    return this._widgetPath;
  }

  getIdentificationStrategy() {
    return this.key ? 'key' : 'id';
  }

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
 * ✅ KEY FIX: Returns result from widget.build(), NOT the Element
 */
class StatelessElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
  }

  /**
   * Build the widget and return the result
   * ✅ CRITICAL: Use strict VNode detection
   */
  build() {
    console.log('📦 StatelessElement.build() START', {
      widgetType: this.widget?.constructor.name,
      widgetInstance: this.widget
    });

    const context = this.buildContext();

    try {
      // STEP 1: Call widget's build method
      console.log('🔨 Calling widget.build(context)...');
      const result = this.widget.build(context);

      console.log('✓ widget.build() returned:', {
        resultType: typeof result,
        resultConstructor: result?.constructor?.name,
        hasTag: result?.tag !== undefined,
        isString: typeof result === 'string',
        isNull: result === null,
      });

      if (!result) {
        console.warn('⚠️ Result is null/undefined');
        throw new Error('StatelessWidget.build() returned null');
      }

      // ✅ STRICT CHECK: Use isRealVNode() instead of just checking .tag
      if (isRealVNode(result)) {
        console.log('✅ Result is a REAL VNode, returning it directly');
        return result;
      }

      // ✅ Check if it's a string/number/primitive
      if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
        console.log('✅ Result is a primitive:', result);
        return result;
      }

      // ✅ Check if it's a Widget (has build method or createState)
      if (isWidget(result)) {
        console.log('🔄 Result is a Widget, need to build recursively:', result.constructor.name);

        // Create element for this widget
        const childElement = this._createElementForWidget(result);

        console.log('✅ Created child element:', childElement.constructor.name);

        // Set parent before building
        childElement._parent = this;
        childElement._depth = this._depth + 1;
        childElement._mounted = true;

        console.log('✅ Set up child element parent/depth');

        // Recursively build the child element to get VNode
        const childVNode = childElement.build();

        console.log('✅ Child element.build() returned:', {
          hasTag: childVNode?.tag !== undefined,
          type: typeof childVNode,
          isRealVNode: isRealVNode(childVNode)
        });

        if (!childVNode) {
          throw new Error('Child element.build() returned null');
        }

        return childVNode;
      }

      // If we get here, it's an unknown type
      console.warn('⚠️ Unknown result type from build():', result);
      console.warn('   Constructor:', result?.constructor?.name);
      console.warn('   Type:', typeof result);
      console.warn('   Has .tag:', result?.tag);
      console.warn('   Has .build:', typeof result?.build);

      throw new Error(
        `Invalid build() return type from ${this.widget.constructor.name}. ` +
        `Expected: Widget, VNode, string, number, or null. ` +
        `Got: ${result?.constructor?.name} with tag="${result?.tag}"`
      );

    } catch (error) {
      console.error('❌ Build error:', error.message);
      console.error('   Widget:', this.widget?.constructor.name);
      throw new Error(`StatelessWidget build failed: ${error.message}`);
    }
  }

  /**
   * Helper to create appropriate element type for a widget
   * @private
   */
  _createElementForWidget(widget) {
    // ✅ Use widget's createElement if available
    if (widget && typeof widget.createElement === 'function') {
      console.log('  Using widget.createElement() for:', widget.constructor.name);
      return widget.createElement(this, this.runtime);
    }

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

  /**
   * ✅ CRITICAL: Implement performRebuild() to satisfy Element.mount() contract
   * This method is called by Element.mount() and must return a VNode
   */
  performRebuild() {
    return this.build();
  }
}

/**
 * StatefulElement - FIXED VERSION
 * 
 * ✅ CRITICAL FIX: mount() now calls state._mount(this)
 * This properly initializes state._widget so this.widget works
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

    // ✅ Set initial references (but _mount will do the proper initialization)
    this.state._element = this;
    this.state._widget = widget;
    this.state._mounted = false;
  }

  build() {
    console.log('📦 StatefulElement.build() START', {
      widgetType: this.widget?.constructor.name,
      stateType: this.state?.constructor.name
    });

    const context = this.buildContext();

    try {
      if (!this.state.build || typeof this.state.build !== 'function') {
        throw new Error('State must implement build() method');
      }

      console.log('🔨 Calling state.build(context)...');
      const result = this.state.build(context);

      console.log('✓ state.build() returned:', {
        resultType: typeof result,
        resultConstructor: result?.constructor?.name,
        isVNode: result?.tag !== undefined
      });

      if (!result) {
        throw new Error('State.build() returned null');
      }

      // ✅ STRICT CHECK: Use isRealVNode()
      if (isRealVNode(result)) {
        console.log('✅ Result is a REAL VNode, returning');
        return result;
      }

      // ✅ Check if it's a primitive
      if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
        console.log('✅ Result is a primitive');
        return result;
      }

      // ✅ Check if it's a widget and build recursively
      if (isWidget(result)) {
        console.log('🔄 State.build() returned a Widget, building recursively:', result.constructor.name);

        const childElement = this._createElementForWidget(result);

        // Set up parent/depth without calling mount
        childElement._parent = this;
        childElement._depth = this._depth + 1;
        childElement._mounted = true;

        const childVNode = childElement.build();

        if (!childVNode) {
          throw new Error('Child element.build() returned null');
        }

        return childVNode;
      }

      throw new Error(
        `Invalid build() return type from ${this.widget.constructor.name} state. ` +
        `Expected: Widget, VNode, string, number, or null.`
      );

    } catch (error) {
      throw new Error(`StatefulWidget build failed: ${error.message}`);
    }
  }

  _createElementForWidget(widget) {
    // ✅ Use widget's createElement if available
    if (widget && typeof widget.createElement === 'function') {
      return widget.createElement(this, this.runtime);
    }

    if (typeof widget.createState === 'function') {
      return new StatefulElement(widget, this, this.runtime);
    } else if (widget.updateShouldNotify && typeof widget.updateShouldNotify === 'function') {
      const { InheritedElement } = require('./inherited_element.js');
      return new InheritedElement(widget, this, this.runtime);
    } else {
      return new StatelessElement(widget, this, this.runtime);
    }
  }

  /**
   * ✅✅✅ CRITICAL FIX: Call state._mount() to properly initialize state
   * This ensures this.widget is available in State
   */
  mount() {
    console.log('🚀 StatefulElement.mount() called');
    console.log('   Widget:', this.widget?.constructor?.name);
    console.log('   State:', this.state?.constructor?.name);
    console.log('   State has _mount:', typeof this.state._mount === 'function');

    // ✅ CRITICAL: Call state._mount() if available
    if (this.state._mount && typeof this.state._mount === 'function') {
      console.log('✅ Calling state._mount(this)...');
      this.state._mount(this);
      console.log('✅ state._mount() complete');
    } else {
      // Fallback for old State implementations that don't have _mount()
      console.log('⚠️ State does not have _mount(), using fallback initialization');

      // Manually set state properties
      this.state._element = this;
      this.state._widget = this.widget;
      this.state._mounted = true;

      // Call initState manually
      if (this.state.initState && typeof this.state.initState === 'function') {
        try {
          console.log('🎬 Calling initState()...');
          this.state.initState();
        } catch (error) {
          console.error(`[StatefulElement] initState failed:`, error);
        }
      }
    }

    // Verify state is properly initialized
    console.log('🔍 State after mount:', {
      hasMounted: this.state._mounted,
      hasElement: !!this.state._element,
      hasWidget: !!this.state._widget,
      widgetType: this.state._widget?.constructor?.name,
      widgetTitle: this.state._widget?.title
    });

    // Call parent mount
    super.mount();

    console.log('✅ StatefulElement.mount() complete');
  }

  buildContext() {
    return new BuildContext(this, this.runtime, this.state);
  }

  /**
   * ✅ Update widget reference when widget changes
   */
  updateWidget(newWidget) {
    console.log('🔄 StatefulElement.updateWidget() called');

    const oldWidget = this._widget;

    // Update element's widget
    super.updateWidget(newWidget);

    // ✅ Update state's widget reference
    if (this.state._updateWidget && typeof this.state._updateWidget === 'function') {
      console.log('✅ Calling state._updateWidget()');
      this.state._updateWidget(newWidget);
    } else {
      // Fallback
      console.log('⚠️ State does not have _updateWidget(), updating directly');
      this.state._widget = newWidget;
    }

    // Call state's didUpdateWidget
    if (this.state.didUpdateWidget && typeof this.state.didUpdateWidget === 'function') {
      try {
        this.state.didUpdateWidget(oldWidget);
      } catch (error) {
        console.error('[StatefulElement] didUpdateWidget failed:', error);
      }
    }
  }

  /**
   * ✅ Properly unmount state
   */
  unmount() {
    console.log('🛑 StatefulElement.unmount() called');

    // Call state._unmount if available
    if (this.state._unmount && typeof this.state._unmount === 'function') {
      this.state._unmount();
    }

    // Call state.dispose
    if (this.state._dispose && typeof this.state._dispose === 'function') {
      this.state._dispose();
    }

    super.unmount();
  }

  /**
   * ✅ CRITICAL: Implement performRebuild() to satisfy Element.mount() contract
   * This method is called by Element.mount() and must return a VNode
   */
  performRebuild() {
    return this.build();
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

      // ✅ Check if VNode
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
    // ✅ Use widget's createElement if available
    if (widget && typeof widget.createElement === 'function') {
      return widget.createElement(this, this.runtime);
    }

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

  /**
   * ✅ CRITICAL: Implement performRebuild() to satisfy Element.mount() contract
   * This method is called by Element.mount() and must return a VNode
   */
  performRebuild() {
    return this.build();
  }
}

export {
  Element,
  StatelessElement,
  StatefulElement,
  ComponentElement,
  DiagnosticLevel,
  isRealVNode, isWidget
};