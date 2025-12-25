/**
 * FlutterJS Element System
 * 
 * Elements are the live instances that bridge widgets and DOM.
 * They manage the lifecycle, state, and rendering of widgets.
 * 
 * Element Hierarchy:
 * - Element (base class)
 *   - StatelessElement (for StatelessWidget)
 *   - StatefulElement (for StatefulWidget)
 *   - InheritedElement (for InheritedWidget)
 *   - ComponentElement (for custom components)
 * 
 * Key Concepts:
 * - Widgets are immutable configuration objects
 * - Elements are mutable live instances
 * - Elements own the DOM references and state
 */

// Import BuildContext
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



/**
 * Base Element Class
 * 
 * Represents a node in the element tree. Elements are created from widgets
 * and manage the actual rendering and lifecycle.
 */
class Element  extends Diagnosticable{
  constructor(widget, parent, runtime) {
    if (!widget) {
      throw new Error('Widget is required for Element creation');
    }
    
    if (!runtime) {
      throw new Error('Runtime is required for Element creation');
    }
    
    this.widget = widget;              // Widget configuration (immutable)
    this.parent = parent;              // Parent element
    this.runtime = runtime;            // Runtime engine reference
    
    // Element tree structure
    this.children = [];                // Child elements
    this.childMap = new Map();         // key → child element mapping
    
    // Rendering state
    this.vnode = null;                 // Current virtual node
    this.domNode = null;               // DOM reference
    
    // Lifecycle state
    this.mounted = false;              // Is element mounted?
    this.dirty = false;                // Needs rebuild?
    this.building = false;             // Currently building?
    
    // Tree position
    this.depth = parent ? parent.depth + 1 : 0;
    
    // Identity
    this.key = widget.key;             // For reconciliation
    this.id = Element.generateId();    // Unique ID
    
    // Metadata
    this.buildCount = 0;               // Number of times built
    this.lastBuildTime = 0;            // Last build timestamp
    this.lastBuildDuration = 0;        // Last build duration (ms)
  }
  
  /**
   * Build VNode from widget
   * Subclasses must override this method
   */
  build() {
    throw new Error(`${this.constructor.name}.build() must be implemented by subclass`);
  }
  
  /**
   * Mount element (first time attachment to tree)
   * Called when element is first added to the tree
   */
  mount() {
    if (this.mounted) {
      console.warn(`[Element] ${this.id} already mounted`);
      return;
    }
    
    try {
      // Mark as mounted
      this.mounted = true;
      
      // Build initial VNode
      this.vnode = this.performBuild();
      
      // Mount children
      this.children.forEach(child => {
        if (!child.mounted) {
          child.mount();
        }
      });
      
      // Call didMount lifecycle hook
      this.didMount();
    } catch (error) {
      this.mounted = false;
      throw new Error(`Failed to mount ${this.constructor.name}: ${error.message}`);
    }
  }
  
  /**
   * Update element with new widget
   * Called when parent rebuilds with new widget configuration
   */
  update(newWidget) {
    if (!newWidget) {
      throw new Error('New widget is required for update');
    }
    
    const oldWidget = this.widget;
    
    // Update widget reference
    this.widget = newWidget;
    
    // Check if rebuild needed
    if (this.shouldRebuild(oldWidget, newWidget)) {
      this.markNeedsBuild();
    }
    
    // Call lifecycle hook
    this.didUpdateWidget(oldWidget, newWidget);
  }
  
  /**
   * Rebuild element
   * Called when element is marked dirty
   */
  rebuild() {
    if (!this.mounted) {
      console.warn(`[Element] Cannot rebuild unmounted element ${this.id}`);
      return;
    }
    
    if (this.building) {
      console.warn(`[Element] Recursive rebuild detected for ${this.id}`);
      return;
    }
    
    try {
      this.building = true;
      
      const oldVNode = this.vnode;
      
      // Perform build
      this.vnode = this.performBuild();
      
      // Apply changes (diffing happens here in full implementation)
      this.applyChanges(oldVNode, this.vnode);
      
      // Clear dirty flag
      this.dirty = false;
    } catch (error) {
      console.error(`[Element] Rebuild failed for ${this.id}:`, error);
      throw error;
    } finally {
      this.building = false;
    }
  }
  
  /**
   * Perform build with timing and error handling
   */
  performBuild() {
    const startTime = performance.now();
    
    try {
      const vnode = this.build();
      
      if (!vnode) {
        throw new Error('build() returned null or undefined');
      }
      
      this.buildCount++;
      this.lastBuildTime = Date.now();
      this.lastBuildDuration = performance.now() - startTime;
      
      return vnode;
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }
  
  /**
   * Apply changes from VNode diff
   * (Simplified for now, full diffing in Phase 5.2)
   */
  applyChanges(oldVNode, newVNode) {
    // In full implementation, this would:
    // 1. Diff oldVNode vs newVNode
    // 2. Generate patches
    // 3. Apply patches to DOM
    
    // For now, just track the change
    if (this.runtime.config && this.runtime.config.debugMode) {
      console.log(`[Element] Applied changes to ${this.id}`);
    }
  }
  
  /**
   * Mark element as needing rebuild
   */
  markNeedsBuild() {
    if (this.dirty) {
      return; // Already marked
    }
    
    if (!this.mounted) {
      console.warn(`[Element] Cannot mark unmounted element ${this.id} dirty`);
      return;
    }
    
    this.dirty = true;
    
    // Notify runtime
    if (this.runtime && this.runtime.markNeedsBuild) {
      this.runtime.markNeedsBuild(this);
    }
  }
  
  /**
   * Unmount element
   * Called when element is removed from tree
   */
  unmount() {
    if (!this.mounted) {
      return;
    }
    
    try {
      // Call lifecycle hook
      this.willUnmount();
      
      // Unmount children first
      this.children.forEach(child => {
        if (child.mounted) {
          child.unmount();
        }
      });
      
      // Clear references
      this.children = [];
      this.childMap.clear();
      this.vnode = null;
      this.domNode = null;
      
      // Mark as unmounted
      this.mounted = false;
      this.dirty = false;
      
      // Call lifecycle hook
      this.didUnmount();
    } catch (error) {
      console.error(`[Element] Unmount failed for ${this.id}:`, error);
    }
  }
  
  /**
   * Determine if widget update should trigger rebuild
   */
  shouldRebuild(oldWidget, newWidget) {
    // If same reference, no rebuild needed
    if (oldWidget === newWidget) {
      return false;
    }
    
    // If different types, rebuild needed
    if (oldWidget.constructor !== newWidget.constructor) {
      return true;
    }
    
    // Deep comparison of widget properties
    return !this.areWidgetsEqual(oldWidget, newWidget);
  }
  
  /**
   * Compare two widgets for equality
   */
  areWidgetsEqual(w1, w2) {
    // Check constructor
    if (w1.constructor !== w2.constructor) {
      return false;
    }
    
    // Get all enumerable properties
    const keys1 = Object.keys(w1);
    const keys2 = Object.keys(w2);
    
    // Check property count
    if (keys1.length !== keys2.length) {
      return false;
    }
    
    // Compare each property
    return keys1.every(key => {
      const val1 = w1[key];
      const val2 = w2[key];
      
      // Skip functions (they're usually event handlers)
      if (typeof val1 === 'function' && typeof val2 === 'function') {
        return true;
      }
      
      // Deep comparison for objects
      if (typeof val1 === 'object' && typeof val2 === 'object') {
        return JSON.stringify(val1) === JSON.stringify(val2);
      }
      
      // Primitive comparison
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
    
    this.children.push(child);
    
    // Track by key if available
    if (child.key) {
      this.childMap.set(child.key, child);
    }
    
    child.parent = this;
  }
  
  /**
   * Remove child element
   */
  removeChild(child) {
    const index = this.children.indexOf(child);
    
    if (index !== -1) {
      this.children.splice(index, 1);
    }
    
    if (child.key) {
      this.childMap.delete(child.key);
    }
    
    child.parent = null;
  }
  
  /**
   * Find child by key
   */
  findChildByKey(key) {
    return this.childMap.get(key);
  }
  
  /**
   * Get ancestor element of specific type
   */
  findAncestorOfType(ElementType) {
    let current = this.parent;
    
    while (current) {
      if (current instanceof ElementType) {
        return current;
      }
      current = current.parent;
    }
    
    return null;
  }
  
  /**
   * Visit all ancestors
   */
  visitAncestors(visitor) {
    let current = this.parent;
    
    while (current) {
      const shouldContinue = visitor(current);
      if (shouldContinue === false) {
        break;
      }
      current = current.parent;
    }
  }
  
  // Lifecycle Hooks (override in subclasses)
  
  didMount() {
    // Called after first mount
  }
  
  didUpdateWidget(oldWidget, newWidget) {
    // Called after widget update
  }
  
  willUnmount() {
    // Called before unmount
  }
  
  didUnmount() {
    // Called after unmount
  }
  
  /**
   * Get element statistics
   */
  getStats() {
    return {
      id: this.id,
      type: this.constructor.name,
      mounted: this.mounted,
      dirty: this.dirty,
      depth: this.depth,
      childCount: this.children.length,
      buildCount: this.buildCount,
      lastBuildDuration: this.lastBuildDuration,
      hasKey: !!this.key
    };
  }
  
  /**
   * Generate unique element ID
   */
  static generateId() {
    return `el_${++Element._counter}`;
  }
  
  /**
   * Reset ID counter (for testing)
   */
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
    // Call widget's build method
    const context = this.buildContext();
    
    try {
      const result = this.widget.build(context);
      
      if (!result) {
        throw new Error('StatelessWidget.build() returned null');
      }
      
      return result;
    } catch (error) {
      throw new Error(`StatelessWidget build failed: ${error.message}`);
    }
  }
  
  /**
   * Create BuildContext for this element
   */
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
    
    // Create state instance
    if (!widget.createState || typeof widget.createState !== 'function') {
      throw new Error('StatefulWidget must implement createState()');
    }
    
    this.state = widget.createState();
    
    if (!this.state) {
      throw new Error('createState() returned null or undefined');
    }
    
    // Link state to element and widget
    this.state._element = this;
    this.state._widget = widget;
    this.state._mounted = false;
  }
  
  build() {
    // Call state's build method
    const context = this.buildContext();
    
    try {
      if (!this.state.build || typeof this.state.build !== 'function') {
        throw new Error('State must implement build() method');
      }
      
      const result = this.state.build(context);
      
      if (!result) {
        throw new Error('State.build() returned null');
      }
      
      return result;
    } catch (error) {
      throw new Error(`StatefulWidget build failed: ${error.message}`);
    }
  }
  
  mount() {
    // Call state's initState
    if (this.state.initState && typeof this.state.initState === 'function') {
      try {
        this.state.initState();
      } catch (error) {
        console.error(`[StatefulElement] initState failed:`, error);
      }
    }
    
    // Mark state as mounted
    this.state._mounted = true;
    
    // Call parent mount
    super.mount();
  }
  
  update(newWidget) {
    const oldWidget = this.widget;
    
    // Update widget reference
    this.widget = newWidget;
    this.state._widget = newWidget;
    
    // Call state's didUpdateWidget
    if (this.state.didUpdateWidget && typeof this.state.didUpdateWidget === 'function') {
      try {
        this.state.didUpdateWidget(oldWidget);
      } catch (error) {
        console.error(`[StatefulElement] didUpdateWidget failed:`, error);
      }
    }
    
    // Check if rebuild needed
    if (this.shouldRebuild(oldWidget, newWidget)) {
      this.markNeedsBuild();
    }
  }
  
  unmount() {
    // Call state's dispose
    if (this.state.dispose && typeof this.state.dispose === 'function') {
      try {
        this.state.dispose();
      } catch (error) {
        console.error(`[StatefulElement] dispose failed:`, error);
      }
    }
    
    // Mark state as unmounted
    this.state._mounted = false;
    
    // Call parent unmount
    super.unmount();
  }
  
  /**
   * Create BuildContext for this element
   */
  buildContext() {
    return new BuildContext(this, this.runtime, this.state);
  }
  
  /**
   * Get state statistics
   */
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
 * InheritedElement
 * 
 * Element for InheritedWidget. These elements provide values
 * down the tree and notify dependents when values change.
 */
class InheritedElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
    
    // Track dependent elements
    this.dependents = new Set();
  }
  
  build() {
    // InheritedWidget typically wraps a child
    if (!this.widget.child) {
      throw new Error('InheritedWidget must have a child');
    }
    
    // For now, just return a simple representation
    // In full implementation, this would build the child
    return {
      tag: 'div',
      props: {
        'data-widget': 'InheritedWidget',
        'data-type': this.widget.constructor.name
      },
      children: []
    };
  }
  
  /**
   * Register dependent element
   */
  addDependent(element) {
    if (!element) {
      throw new Error('Element is required');
    }
    
    this.dependents.add(element);
  }
  
  /**
   * Unregister dependent element
   */
  removeDependent(element) {
    this.dependents.delete(element);
  }
  
  /**
   * Check if has dependent
   */
  hasDependent(element) {
    return this.dependents.has(element);
  }
  
  update(newWidget) {
    const oldWidget = this.widget;
    
    // Update widget
    super.update(newWidget);
    
    // Check if should notify dependents
    if (this.widget.updateShouldNotify && 
        typeof this.widget.updateShouldNotify === 'function') {
      try {
        const shouldNotify = this.widget.updateShouldNotify(oldWidget);
        
        if (shouldNotify) {
          this.notifyDependents();
        }
      } catch (error) {
        console.error(`[InheritedElement] updateShouldNotify failed:`, error);
      }
    }
  }
  
  /**
   * Notify all dependents to rebuild
   */
  notifyDependents() {
    this.dependents.forEach(element => {
      if (element.mounted && !element.dirty) {
        element.markNeedsBuild();
      }
    });
  }
  
  unmount() {
    // Clear dependents
    this.dependents.clear();
    
    // Call parent unmount
    super.unmount();
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const stats = super.getStats();
    return {
      ...stats,
      dependentCount: this.dependents.size
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
    // Call widget's render or build method
    const method = this.widget.render || this.widget.build;
    
    if (!method || typeof method !== 'function') {
      throw new Error('ComponentElement widget must have render() or build() method');
    }
    
    const context = this.buildContext();
    
    try {
      return method.call(this.widget, context);
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
    InheritedElement,
    ComponentElement
};