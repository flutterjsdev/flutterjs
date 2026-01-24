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
import { VNodeDiffer } from '@flutterjs/vdom/vnode_differ';
import { PatchApplier } from '@flutterjs/vdom/patch_applier';
// NOTE: InheritedElement is NOT imported here to avoid circular dependency.
// InheritedWidget provides its own createElement() method that returns InheritedElement.

// Debug flag - set to true to enable verbose logging
const DEBUG = false;

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

  // VNode should NOT have build() or createState() or createElement() methods
  const isNotWidget = typeof obj.build !== 'function' &&
    typeof obj.createState !== 'function' &&
    typeof obj.createElement !== 'function';

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
    typeof obj.render === 'function' ||
    typeof obj.createElement === 'function' // ✅ Added for ProxyWidgets (SizedBox, ConstrainedBox)
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
    this._shouldPatch = true; // Default to true, subclasses/build will disable if delegating

    this._depth = parent ? (parent._depth || 0) + 1 : 0;

    this.key = widget.key;
    this._id = `el_${Element._nextId++}`;

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

  // ✅ BuildContext Interface Implementation (Delegation)
  dependOnInheritedWidgetOfExactType(Type) {
    return this.context.dependOnInheritedWidgetOfExactType(Type);
  }

  findAncestorWidgetOfExactType(Type) {
    return this.context.findAncestorWidgetOfExactType(Type);
  }

  findAncestorStateOfType(Type) {
    return this.context.findAncestorStateOfType(Type);
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

      // Register with GlobalKey if widget has one
      if (this._widget && this._widget.key && this._widget.key._currentElement !== undefined) {
        this._widget.key._currentElement = this;
      }

      this._vnode = this.performRebuild();

      this._children.forEach(child => {
        if (!child._mounted) {
          child.mount(this);
        }
      });

      this.didMount();

      // Mark that initial mount is complete
      // This prevents applyChanges from running on the first rebuild after mount
      this._initialMountComplete = true;
    } catch (error) {
      this._mounted = false;
      throw new Error(`Failed to mount ${this.constructor.name}: ${error.message}`);
    }
  }

  rebuild() {
    if (!this._mounted) {
      if (DEBUG) console.warn(`[Element] Cannot rebuild unmounted element ${this._id}`);
      return;
    }

    if (this._building) {
      if (DEBUG) console.warn(`[Element] Recursive rebuild detected for ${this._id}`);
      return;
    }

    try {
      this._building = true;

      const oldVNode = this._vnode;
      this._vnode = this.performRebuild();

      // Only apply changes if this element is responsible for patching
      // AND this is not the first rebuild after mount
      if (this._shouldPatch && this._initialMountComplete) {
        this.applyChanges(oldVNode, this._vnode);
      } else {
        // If delegating, we still need to update our DOM reference from the child's result
        if (this._vnode && this._vnode._element) {
          this._domNode = this._vnode._element;
        }
      }

      this._dirty = false; // Mark clean regardless
    } catch (error) {
      console.error(`[Element] Rebuild failed for ${this._id}:`, error);
      throw error;
    } finally {
      this._building = false;
    }
  }

  applyChanges(oldVNode, newVNode) {
    // Handle case where BOTH VNodes have no DOM elements
    if (this._hasAppliedChanges && oldVNode && newVNode && !oldVNode?._element && !newVNode?._element && this.runtime.renderer) {
      const childrenChanged = oldVNode.children?.length !== newVNode.children?.length;

      if (childrenChanged) {
        try {
          let targetElement = this._domNode;

          if (!targetElement && this._parent) {
            targetElement = this._parent._domNode;
          }

          if (!targetElement) {
            const rootElement = document.getElementById('root');
            if (rootElement && rootElement.firstChild) {
              targetElement = rootElement.firstChild;
            }
          }

          if (targetElement) {
            targetElement.innerHTML = '';
            this.runtime.renderer.render(newVNode, targetElement);

            newVNode._element = targetElement.firstChild;
            if (newVNode._element) {
              newVNode._element._vnode = newVNode;
              this._domNode = newVNode._element;
            }
            return;
          }
        } catch (error) {
          console.error(`[Element] Failed to re-render:`, error);
        }
      }
    }

    // Handle case where widget type changes
    if (this._mounted && oldVNode && oldVNode._element && !newVNode._element && this.runtime.renderer) {
      if (oldVNode.tag !== newVNode.tag) {
        try {
          const oldDomNode = oldVNode._element;
          const parentNode = oldDomNode.parentNode;

          if (parentNode) {
            const tempContainer = document.createElement('div');
            this.runtime.renderer.render(newVNode, tempContainer);
            const newDomNode = tempContainer.firstChild;

            if (newDomNode) {
              parentNode.replaceChild(newDomNode, oldDomNode);
              newVNode._element = newDomNode;
              newDomNode._vnode = newVNode;

              if (this._domNode === oldDomNode) {
                this._domNode = newDomNode;
              }
              return;
            }
          }
        } catch (error) {
          console.error(`[Element] Failed to replace DOM:`, error);
        }
      }
    }

    // DIRECT DOM PATCHING to preserve state
    if (oldVNode && oldVNode._element && this.runtime.renderer) {
      if (oldVNode._element.parentNode) {
        try {
          const domNode = oldVNode._element;
          const parent = domNode.parentNode;
          const index = Array.from(parent.childNodes).indexOf(domNode);

          if (index !== -1) {
            const patches = VNodeDiffer.diff(oldVNode, newVNode, index);

            if (patches.length > 0) {
              // Pass the renderer to PatchApplier so it can create SVGs correctly
              const result = PatchApplier.apply(parent, patches, {
                renderer: this.runtime.renderer
              });

              if (!result.success) {
                console.error('[Element] PatchApplier failed:', result.errors);
              }

              if (!newVNode._element) {
                newVNode._element = oldVNode._element;
              }

              if (this._domNode === domNode) {
                this._domNode = newVNode._element;
              }
            } else {
              newVNode._element = oldVNode._element;
              if (newVNode._element) {
                newVNode._element._vnode = newVNode;
              }
            }
            return;
          }
        } catch (e) {
          if (DEBUG) console.warn('[Element] Diffing failed, falling back to replace', e);
        }
      }

      // FALLBACK: Coarse-grained update
      try {
        const newDomNode = this.runtime.renderer.replaceElement(oldVNode._element, newVNode);

        if (this._domNode === oldVNode._element) {
          this._domNode = newDomNode;
        }
      } catch (e) {
        console.error(`[Element] Failed to patch DOM for ${this._id}:`, e);
      }
    }

    this._hasAppliedChanges = true;
  }

  markNeedsBuild() {
    if (this._dirty) {
      return;
    }

    if (!this._mounted) {
      if (DEBUG) console.warn(`[Element] Cannot mark unmounted element ${this._id} dirty`);
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

      // Unregister from GlobalKey if present
      if (this._widget && this._widget.key && this._widget.key._currentElement === this) {
        this._widget.key._currentElement = null;
      }

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
        // Avoid JSON.stringify on potential circular structures (like Widgets with parent refs or DOM nodes)
        if (val1 === val2) return true;

        // Shallow compare keys for simple objects
        if (!val1 || !val2) return val1 === val2;
        const k1 = Object.keys(val1);
        const k2 = Object.keys(val2);
        if (k1.length !== k2.length) return false;

        // Only compare first level to avoid recursion/circles
        // return k1.every(k => val1[k] === val2[k]);
        return false; // Conservatively return false for complex objects to force rebuild if not strictly equal
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
    const context = this.buildContext();

    try {
      const result = this.widget.build(context);

      if (!result) {
        throw new Error('StatelessWidget.build() returned null');
      }

      // STRICT CHECK: Use isRealVNode() instead of just checking .tag
      if (isRealVNode(result)) {
        this._shouldPatch = true;
        return result;
      }

      // Check if it's a string/number/primitive
      if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
        this._shouldPatch = true;
        return result;
      }

      // Check if it's a Widget (has build method or createState)
      if (isWidget(result)) {
        let childElement = this._children[0];

        // RECONCILIATION: Check if we can reuse the existing element
        if (childElement && childElement.widget.constructor === result.constructor && childElement.widget.key === result.key) {
          childElement.updateWidget(result);

          if (childElement.dirty) {
            childElement.rebuild();
          }

          return childElement.vnode;
        }

        // Cannot reuse: Unmount old child if exists
        if (childElement) {
          childElement.unmount();
          this._children = [];
        }

        this._shouldPatch = true;

        // Create element for this widget
        childElement = this._createElementForWidget(result);

        // Add to children array so unmount() works
        this._children = [childElement];

        // Use mount() to properly initialize the child element
        childElement.mount(this);

        const childVNode = childElement.vnode;

        if (!childVNode) {
          throw new Error('Child element.build() returned null');
        }

        return childVNode;
      }

      // If we get here, it's an unknown type
      throw new Error(
        `Invalid build() return type from ${this.widget.constructor.name}. ` +
        `Expected: Widget, VNode, string, number, or null. ` +
        `Got: ${result?.constructor?.name} with tag="${result?.tag}"`
      );

    } catch (error) {
      throw new Error(`StatelessWidget build failed: ${error.message}`);
    }
  }

  /**
   * Helper to create appropriate element type for a widget
   * @private
   */
  _createElementForWidget(widget) {
    // Use widget's createElement if available (InheritedWidget uses this)
    if (widget && typeof widget.createElement === 'function') {
      return widget.createElement(this, this.runtime);
    }

    if (typeof widget.createState === 'function') {
      return new StatefulElement(widget, this, this.runtime);
    } else if (widget.updateShouldNotify && typeof widget.updateShouldNotify === 'function') {
      throw new Error(
        `InheritedWidget "${widget.constructor.name}" must define createElement() method. ` +
        `Extend InheritedWidget class properly.`
      );
    } else {
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
    const context = this.buildContext();

    try {
      if (!this.state.build || typeof this.state.build !== 'function') {
        throw new Error('State must implement build() method');
      }

      const result = this.state.build(context);

      if (!result) {
        throw new Error('State.build() returned null');
      }

      // STRICT CHECK: Use isRealVNode()
      if (isRealVNode(result)) {
        this._shouldPatch = true;
        return result;
      }

      // Check if it's a primitive
      if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
        this._shouldPatch = true;
        return result;
      }

      // Check if it's a widget and build recursively
      let childElement = this._children[0];

      if (isWidget(result)) {
        // RECONCILIATION: Check if we can reuse the existing element
        if (childElement && childElement.widget.constructor === result.constructor && childElement.widget.key === result.key) {
          childElement.updateWidget(result);

          if (childElement.dirty) {
            childElement.rebuild();
          }

          this._shouldPatch = false;
          return childElement.vnode;
        }

        // Cannot reuse: Unmount old child if exists
        if (childElement) {
          childElement.unmount();
          this._children = [];
        }

        this._shouldPatch = true;

        childElement = this._createElementForWidget(result);

        // Add to children array so unmount() works
        this._children = [childElement];

        // Use mount() to properly initialize the child element
        childElement.mount(this);

        const childVNode = childElement.vnode;

        if (!childVNode) {
          throw new Error('Child element.build() returned null');
        }

        return childVNode;
      }

      this._shouldPatch = false;
      return childElement ? childElement.vnode : result;

    } catch (error) {
      throw new Error(`StatefulWidget build failed: ${error.message}`);
    }
  }

  _createElementForWidget(widget) {
    // Use widget's createElement if available
    if (widget && typeof widget.createElement === 'function') {
      return widget.createElement(this, this.runtime);
    }

    if (typeof widget.createState === 'function') {
      return new StatefulElement(widget, this, this.runtime);
    } else if (widget.updateShouldNotify && typeof widget.updateShouldNotify === 'function') {
      return new InheritedElement(widget, this, this.runtime);
    } else {
      return new StatelessElement(widget, this, this.runtime);
    }
  }

  /**
   * CRITICAL FIX: Call state._mount() to properly initialize state
   */
  mount() {
    if (this._mounted) {
      return;
    }

    // Call state._mount() if available
    if (this.state._mount && typeof this.state._mount === 'function') {
      this.state._mount(this);
    } else {
      // Fallback for old State implementations that don't have _mount()
      this.state._element = this;
      this.state._widget = this.widget;
      this.state._mounted = true;

      // Call initState manually
      if (this.state.initState && typeof this.state.initState === 'function') {
        try {
          this.state.initState();
        } catch (error) {
          console.error(`[StatefulElement] initState failed:`, error);
        }
      }
    }

    // Call parent mount
    super.mount();
  }

  buildContext() {
    return new BuildContext(this, this.runtime, this.state);
  }

  /**
   * Update widget reference when widget changes
   */
  updateWidget(newWidget) {
    const oldWidget = this._widget;

    // Update element's widget
    super.updateWidget(newWidget);

    // Update state's widget reference
    if (this.state._updateWidget && typeof this.state._updateWidget === 'function') {
      this.state._updateWidget(newWidget);
    } else {
      // Fallback
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
   * Properly unmount state
   */
  unmount() {
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
   * CRITICAL: Implement performRebuild() to satisfy Element.mount() contract
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

// Initialize static ID counter
Element._nextId = 0;

export {
  Element,
  StatelessElement,
  StatefulElement,
  ComponentElement,
  DiagnosticLevel,
  isRealVNode, isWidget
};