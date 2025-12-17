# Step 5: Runtime System & State Management - Production Plan

## Overview

Step 5 builds the **runtime execution environment** that powers FlutterJS applications. This includes state management (setState, lifecycle), BuildContext system, event handling, and the core runtime engine that orchestrates everything.

**Current Status:**
- ✅ Step 1-3: Analyzer complete (metadata extraction)
- ✅ Step 4: VNode system complete (rendering, diffing, hydration)
- ❌ Step 5: Runtime system needs implementation

**Goal:** Complete a production-ready runtime system that:
1. Manages widget lifecycle (mount, update, unmount)
2. Implements setState and reactive updates
3. Provides BuildContext for accessing framework services
4. Handles event delegation and propagation
5. Manages global state (Provider pattern)
6. Orchestrates the entire application execution

---

## Step 5 Breakdown (4 Major Phases)

```
Step 5: Runtime System & State Management
│
├── Phase 5.1: Core Runtime Engine (Weeks 1-2)
│   ├── Runtime initialization
│   ├── Widget tree mounting
│   ├── Element tree management
│   ├── Update scheduling
│   └── Memory management
│
├── Phase 5.2: State Management System (Weeks 3-4)
│   ├── setState implementation
│   ├── State reactivity tracking
│   ├── Lifecycle hooks (initState, dispose, etc.)
│   ├── Update batching & optimization
│   └── State debugging tools
│
├── Phase 5.3: BuildContext & Services (Weeks 5-6)
│   ├── BuildContext implementation
│   ├── Service registration (Theme, Navigator, MediaQuery)
│   ├── InheritedWidget support
│   ├── Dependency injection
│   └── Context propagation
│
└── Phase 5.4: Event System & Integration (Weeks 7-8)
    ├── Event delegation system
    ├── Event bubbling & capturing
    ├── Gesture recognizers
    ├── Focus management
    └── Full system integration
```

---

## Phase 5.1: Core Runtime Engine (Weeks 1-2)

### Objective
Build the foundational runtime that manages widget lifecycle, element tree, and coordinates all system operations.

### 5.1.1 Runtime Architecture

**File:** `src/runtime/runtime-engine.js`

**Core Concepts:**

```
Widget Tree (Immutable)          Element Tree (Mutable)          DOM Tree
     MyApp                            AppElement                    <div>
       ↓                                  ↓                           ↓
  MaterialApp                      MaterialAppElement              <div>
       ↓                                  ↓                           ↓
   HomePage                          HomePageElement                <div>
       ↓                                  ↓                           ↓
   Scaffold                          ScaffoldElement                <div>
```

**Key Principle:** 
- **Widgets** are configuration objects (immutable)
- **Elements** are live instances that own state and DOM references (mutable)
- **VNodes** are the bridge between Elements and DOM

**Runtime Structure:**

```javascript
class RuntimeEngine {
  constructor() {
    this.rootElement = null;           // Root DOM element
    this.rootWidget = null;            // Root widget (MyApp)
    this.elementTree = null;           // Root element
    
    this.dirtyElements = new Set();    // Elements needing rebuild
    this.updateScheduled = false;      // Update queued?
    
    this.buildContext = null;          // Global context
    this.serviceRegistry = new Map();  // Framework services
    
    // Performance tracking
    this.frameCounter = 0;
    this.buildTime = 0;
    this.renderTime = 0;
  }
  
  // Initialize and mount application
  mount(rootWidget, containerElement) {
    this.rootWidget = rootWidget;
    this.rootElement = containerElement;
    
    // Create root element
    this.elementTree = this.createElement(rootWidget, null);
    
    // Build initial tree
    const vnode = this.elementTree.build();
    
    // Render to DOM
    VNodeRenderer.render(vnode, containerElement);
    
    // Mount complete - call lifecycle hooks
    this.elementTree.mount();
    
    return this;
  }
  
  // Create element from widget
  createElement(widget, parent) {
    if (widget instanceof StatelessWidget) {
      return new StatelessElement(widget, parent, this);
    } else if (widget instanceof StatefulWidget) {
      return new StatefulElement(widget, parent, this);
    } else if (widget instanceof InheritedWidget) {
      return new InheritedElement(widget, parent, this);
    }
    throw new Error(`Unknown widget type: ${widget.constructor.name}`);
  }
  
  // Schedule element for rebuild
  markNeedsBuild(element) {
    this.dirtyElements.add(element);
    this.scheduleUpdate();
  }
  
  // Schedule update on next frame
  scheduleUpdate() {
    if (this.updateScheduled) return;
    this.updateScheduled = true;
    
    requestAnimationFrame(() => {
      this.performUpdate();
    });
  }
  
  // Rebuild dirty elements
  performUpdate() {
    this.updateScheduled = false;
    
    const startTime = performance.now();
    
    // Sort by depth (parents before children)
    const sortedElements = Array.from(this.dirtyElements)
      .sort((a, b) => a.depth - b.depth);
    
    // Rebuild each dirty element
    sortedElements.forEach(element => {
      if (element.mounted) {
        element.rebuild();
      }
    });
    
    this.dirtyElements.clear();
    
    this.buildTime = performance.now() - startTime;
    this.frameCounter++;
  }
  
  // Unmount entire tree
  unmount() {
    if (this.elementTree) {
      this.elementTree.unmount();
      this.elementTree = null;
    }
    
    this.dirtyElements.clear();
    this.serviceRegistry.clear();
  }
}
```

**Validation:**
- ✅ Runtime initializes correctly
- ✅ Root widget mounts
- ✅ Element tree created
- ✅ Initial render works
- ✅ Update scheduling works
- ✅ Cleanup on unmount

---

### 5.1.2 Element System

**File:** `src/runtime/element.js`

Elements are the **live instances** that bridge widgets and DOM.

**Base Element Class:**

```javascript
class Element {
  constructor(widget, parent, runtime) {
    this.widget = widget;              // Configuration
    this.parent = parent;              // Parent element
    this.runtime = runtime;            // Runtime engine
    
    this.children = [];                // Child elements
    this.vnode = null;                 // Current VNode
    this.domNode = null;               // DOM reference
    
    this.mounted = false;              // Lifecycle state
    this.dirty = false;                // Needs rebuild?
    this.depth = parent ? parent.depth + 1 : 0;
    
    this.key = widget.key;             // For reconciliation
    this.id = Element.generateId();    // Unique ID
  }
  
  // Build VNode from widget
  build() {
    // Subclasses override
    throw new Error('build() must be implemented');
  }
  
  // Mount element (first time)
  mount() {
    this.mounted = true;
    this.vnode = this.build();
    this.children.forEach(child => child.mount());
  }
  
  // Update element (widget changed)
  update(newWidget) {
    const oldWidget = this.widget;
    this.widget = newWidget;
    
    // Check if rebuild needed
    if (this.shouldRebuild(oldWidget, newWidget)) {
      this.markNeedsBuild();
    }
  }
  
  // Rebuild VNode
  rebuild() {
    if (!this.mounted) return;
    
    const oldVNode = this.vnode;
    this.vnode = this.build();
    
    // Diff and patch
    const patches = VNodeDiffer.diff(oldVNode, this.vnode);
    if (patches.length > 0) {
      PatchApplier.apply(this.domNode, patches);
    }
    
    this.dirty = false;
  }
  
  // Mark as needing rebuild
  markNeedsBuild() {
    if (this.dirty) return;
    this.dirty = true;
    this.runtime.markNeedsBuild(this);
  }
  
  // Unmount element
  unmount() {
    this.children.forEach(child => child.unmount());
    this.children = [];
    this.mounted = false;
    this.domNode = null;
  }
  
  // Should widget update trigger rebuild?
  shouldRebuild(oldWidget, newWidget) {
    // Deep comparison of props
    return !this.areWidgetsEqual(oldWidget, newWidget);
  }
  
  areWidgetsEqual(w1, w2) {
    // Compare widget properties
    if (w1.constructor !== w2.constructor) return false;
    
    // Compare all enumerable properties
    const keys1 = Object.keys(w1);
    const keys2 = Object.keys(w2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => {
      if (typeof w1[key] === 'function') return true; // Skip functions
      return w1[key] === w2[key];
    });
  }
  
  static generateId() {
    return `el_${++Element._counter}`;
  }
}

Element._counter = 0;
```

**StatelessElement:**

```javascript
class StatelessElement extends Element {
  build() {
    // Call widget's build method
    const builtWidget = this.widget.build(this.buildContext());
    
    // Convert to VNode
    return VNodeBuilder.build(builtWidget, this.buildContext());
  }
  
  buildContext() {
    return new BuildContext(this, this.runtime);
  }
}
```

**StatefulElement:**

```javascript
class StatefulElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
    
    // Create state instance
    this.state = widget.createState();
    this.state._element = this;
    this.state._widget = widget;
  }
  
  build() {
    // Call state's build method
    const builtWidget = this.state.build(this.buildContext());
    
    // Convert to VNode
    return VNodeBuilder.build(builtWidget, this.buildContext());
  }
  
  mount() {
    // Call initState
    if (this.state.initState) {
      this.state.initState();
    }
    
    super.mount();
    
    // Call didMount (custom lifecycle)
    if (this.state.didMount) {
      this.state.didMount();
    }
  }
  
  update(newWidget) {
    const oldWidget = this.widget;
    super.update(newWidget);
    
    // Update state's widget reference
    this.state._widget = newWidget;
    
    // Call didUpdateWidget
    if (this.state.didUpdateWidget) {
      this.state.didUpdateWidget(oldWidget);
    }
  }
  
  unmount() {
    // Call dispose
    if (this.state.dispose) {
      this.state.dispose();
    }
    
    super.unmount();
  }
  
  buildContext() {
    return new BuildContext(this, this.runtime, this.state);
  }
}
```

**Validation:**
- ✅ StatelessElement builds correctly
- ✅ StatefulElement creates state
- ✅ Lifecycle hooks called in order
- ✅ Updates propagate correctly
- ✅ Children managed properly
- ✅ Unmount cleans up

---

### 5.1.3 Memory Management

**File:** `src/runtime/memory-manager.js`

Prevent memory leaks by tracking and cleaning references.

```javascript
class MemoryManager {
  constructor() {
    this.elementRegistry = new WeakMap(); // Element → metadata
    this.vnodeRegistry = new WeakMap();   // VNode → element
    this.listeners = new WeakMap();       // Element → event listeners
  }
  
  // Register element
  register(element) {
    this.elementRegistry.set(element, {
      id: element.id,
      type: element.constructor.name,
      createdAt: Date.now()
    });
  }
  
  // Cleanup element
  cleanup(element) {
    // Remove event listeners
    const listeners = this.listeners.get(element);
    if (listeners) {
      listeners.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
      this.listeners.delete(element);
    }
    
    // Clear references
    element.vnode = null;
    element.domNode = null;
    element.children = [];
    
    this.elementRegistry.delete(element);
  }
  
  // Track event listener
  trackListener(element, target, event, handler) {
    if (!this.listeners.has(element)) {
      this.listeners.set(element, []);
    }
    this.listeners.get(element).push({ target, event, handler });
  }
  
  // Get memory stats
  getStats() {
    return {
      elements: this.elementRegistry.size,
      vnodes: this.vnodeRegistry.size,
      listeners: Array.from(this.listeners.values())
        .reduce((sum, list) => sum + list.length, 0)
    };
  }
}
```

**Validation:**
- ✅ Elements registered on creation
- ✅ Cleanup removes all references
- ✅ No memory leaks over long sessions
- ✅ Event listeners properly removed

---

## Phase 5.2: State Management System (Weeks 3-4)

### Objective
Implement reactive state management with setState, lifecycle hooks, and efficient updates.

### 5.2.1 State Class & setState

**File:** `src/runtime/state.js`

```javascript
class State {
  constructor() {
    this._element = null;       // Owning element
    this._widget = null;        // Widget configuration
    this._mounted = false;      // Lifecycle state
    this._updateQueued = false; // Update scheduled?
    
    // User-defined state properties go here
    // Example: this.counter = 0;
  }
  
  // User implements this
  build(context) {
    throw new Error('build() must be implemented');
  }
  
  // Lifecycle: called once on first mount
  initState() {
    // Override in subclass
  }
  
  // Lifecycle: called when widget props change
  didUpdateWidget(oldWidget) {
    // Override in subclass
  }
  
  // Lifecycle: called when dependencies change
  didChangeDependencies() {
    // Override in subclass
  }
  
  // Lifecycle: called before unmount
  dispose() {
    // Override in subclass
  }
  
  // Update state and schedule rebuild
  setState(updateFn) {
    if (!this._mounted) {
      console.warn('setState called on unmounted state');
      return;
    }
    
    // Call update function
    if (typeof updateFn === 'function') {
      updateFn.call(this);
    } else if (typeof updateFn === 'object') {
      Object.assign(this, updateFn);
    }
    
    // Mark element for rebuild
    if (this._element) {
      this._element.markNeedsBuild();
    }
  }
  
  // Get BuildContext
  get context() {
    return this._element ? this._element.buildContext() : null;
  }
  
  // Check if mounted
  get mounted() {
    return this._mounted && this._element && this._element.mounted;
  }
  
  // Get current widget
  get widget() {
    return this._widget;
  }
}
```

**Usage Example:**

```javascript
class CounterState extends State {
  constructor() {
    super();
    this.count = 0;
  }
  
  initState() {
    console.log('Counter initialized');
  }
  
  increment() {
    this.setState(() => {
      this.count++;
    });
  }
  
  build(context) {
    return Column({
      children: [
        Text(`Count: ${this.count}`),
        ElevatedButton({
          onPressed: () => this.increment(),
          child: Text('Increment')
        })
      ]
    });
  }
  
  dispose() {
    console.log('Counter disposed');
  }
}
```

**Validation:**
- ✅ setState updates state properties
- ✅ setState triggers rebuild
- ✅ State changes reflected in UI
- ✅ Multiple setState calls batched
- ✅ setState on unmounted state warned

---

### 5.2.2 Reactive State Tracking

**File:** `src/runtime/state-tracker.js`

Track which parts of UI depend on which state properties.

```javascript
class StateTracker {
  constructor() {
    this.dependencies = new Map(); // stateProperty → [elements]
    this.tracking = false;
    this.currentElement = null;
  }
  
  // Start tracking dependencies for build
  startTracking(element) {
    this.tracking = true;
    this.currentElement = element;
  }
  
  // Stop tracking
  stopTracking() {
    this.tracking = false;
    this.currentElement = null;
  }
  
  // Record dependency: element depends on stateProperty
  recordDependency(state, property) {
    if (!this.tracking || !this.currentElement) return;
    
    const key = `${state._element.id}.${property}`;
    
    if (!this.dependencies.has(key)) {
      this.dependencies.set(key, new Set());
    }
    
    this.dependencies.get(key).add(this.currentElement);
  }
  
  // Get elements that depend on state property
  getDependents(state, property) {
    const key = `${state._element.id}.${property}`;
    return this.dependencies.get(key) || new Set();
  }
  
  // Clear dependencies for element
  clearDependencies(element) {
    for (const [key, elements] of this.dependencies.entries()) {
      elements.delete(element);
      if (elements.size === 0) {
        this.dependencies.delete(key);
      }
    }
  }
}
```

**Integration with State:**

```javascript
// Wrap state properties with getters to track access
class ReactiveState extends State {
  constructor() {
    super();
    this._reactiveProperties = new Set();
    this._tracker = new StateTracker();
  }
  
  // Make property reactive
  makeReactive(property, initialValue) {
    const key = `_${property}`;
    this[key] = initialValue;
    
    Object.defineProperty(this, property, {
      get() {
        // Track access
        this._tracker.recordDependency(this, property);
        return this[key];
      },
      set(value) {
        if (this[key] !== value) {
          this[key] = value;
          
          // Only rebuild dependents
          const dependents = this._tracker.getDependents(this, property);
          dependents.forEach(el => el.markNeedsBuild());
        }
      }
    });
    
    this._reactiveProperties.add(property);
  }
}
```

**Validation:**
- ✅ Dependencies tracked correctly
- ✅ Only dependent elements rebuild
- ✅ Multiple properties tracked
- ✅ Dependencies cleared on unmount

---

### 5.2.3 Update Batching & Optimization

**File:** `src/runtime/update-batcher.js`

Batch multiple setState calls into single update.

```javascript
class UpdateBatcher {
  constructor(runtime) {
    this.runtime = runtime;
    this.pendingUpdates = new Map(); // element → updates[]
    this.updateScheduled = false;
  }
  
  // Queue state update
  queueUpdate(element, updateFn) {
    if (!this.pendingUpdates.has(element)) {
      this.pendingUpdates.set(element, []);
    }
    
    this.pendingUpdates.get(element).push(updateFn);
    
    this.scheduleFlush();
  }
  
  // Schedule flush on next microtask
  scheduleFlush() {
    if (this.updateScheduled) return;
    this.updateScheduled = true;
    
    Promise.resolve().then(() => {
      this.flush();
    });
  }
  
  // Apply all pending updates
  flush() {
    this.updateScheduled = false;
    
    // Apply updates in order
    for (const [element, updates] of this.pendingUpdates.entries()) {
      if (!element.mounted) continue;
      
      // Apply all updates to state
      updates.forEach(updateFn => updateFn());
      
      // Rebuild once
      element.markNeedsBuild();
    }
    
    this.pendingUpdates.clear();
    
    // Trigger runtime update
    this.runtime.performUpdate();
  }
  
  // Clear pending updates for element
  clear(element) {
    this.pendingUpdates.delete(element);
  }
}
```

**Optimization: Skip Unnecessary Rebuilds:**

```javascript
class RebuildOptimizer {
  static shouldRebuild(element, oldVNode, newVNode) {
    // Skip if VNodes are identical
    if (oldVNode === newVNode) return false;
    
    // Check if props actually changed
    if (oldVNode && newVNode) {
      if (this.areVNodesEqual(oldVNode, newVNode)) {
        return false;
      }
    }
    
    return true;
  }
  
  static areVNodesEqual(v1, v2) {
    if (v1.tag !== v2.tag) return false;
    if (v1.children?.length !== v2.children?.length) return false;
    
    // Compare props (shallow)
    const props1 = v1.props || {};
    const props2 = v2.props || {};
    
    const keys1 = Object.keys(props1);
    const keys2 = Object.keys(props2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => props1[key] === props2[key]);
  }
}
```

**Validation:**
- ✅ Multiple setState calls batched
- ✅ Single rebuild per batch
- ✅ Unnecessary rebuilds skipped
- ✅ Performance improved

---

## Phase 5.3: BuildContext & Services (Weeks 5-6)

### Objective
Implement BuildContext system for accessing framework services and inherited values.

### 5.3.1 BuildContext Implementation

**File:** `src/runtime/build-context.js`

```javascript
class BuildContext {
  constructor(element, runtime, state = null) {
    this._element = element;
    this._runtime = runtime;
    this._state = state;
  }
  
  // Get current widget
  get widget() {
    return this._element.widget;
  }
  
  // Check if mounted
  get mounted() {
    return this._element.mounted;
  }
  
  // Find ancestor widget of type
  findAncestorWidgetOfExactType(Type) {
    let parent = this._element.parent;
    
    while (parent) {
      if (parent.widget instanceof Type) {
        return parent.widget;
      }
      parent = parent.parent;
    }
    
    return null;
  }
  
  // Find ancestor state of type
  findAncestorStateOfType(Type) {
    let parent = this._element.parent;
    
    while (parent) {
      if (parent instanceof StatefulElement) {
        if (parent.state instanceof Type) {
          return parent.state;
        }
      }
      parent = parent.parent;
    }
    
    return null;
  }
  
  // Find ancestor render object (for layout)
  findRenderObject() {
    return this._element.domNode;
  }
  
  // Get inherited widget value
  dependOnInheritedWidgetOfExactType(Type) {
    let parent = this._element.parent;
    
    while (parent) {
      if (parent instanceof InheritedElement) {
        if (parent.widget instanceof Type) {
          // Register dependency
          parent.addDependent(this._element);
          return parent.widget;
        }
      }
      parent = parent.parent;
    }
    
    return null;
  }
  
  // Access framework services
  getService(serviceName) {
    return this._runtime.serviceRegistry.get(serviceName);
  }
  
  // Convenience methods for common services
  theme() {
    const themeData = this.dependOnInheritedWidgetOfExactType(Theme);
    return themeData ? themeData.data : null;
  }
  
  mediaQuery() {
    const mediaQueryData = this.dependOnInheritedWidgetOfExactType(MediaQuery);
    return mediaQueryData ? mediaQueryData.data : null;
  }
  
  navigator() {
    return this.getService('navigator');
  }
  
  // Visit ancestors
  visitAncestorElements(visitor) {
    let parent = this._element.parent;
    
    while (parent) {
      const shouldContinue = visitor(parent);
      if (shouldContinue === false) break;
      parent = parent.parent;
    }
  }
  
  // Get size (for layout)
  get size() {
    const domNode = this._element.domNode;
    if (!domNode) return null;
    
    return {
      width: domNode.offsetWidth,
      height: domNode.offsetHeight
    };
  }
}
```

**Validation:**
- ✅ Find ancestor widgets
- ✅ Find ancestor state
- ✅ Access services
- ✅ Inherited widget dependencies work

---

### 5.3.2 Service Registration System

**File:** `src/runtime/service-registry.js`

```javascript
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.providers = new Map(); // lazy providers
  }
  
  // Register service instance
  register(name, service) {
    if (this.services.has(name)) {
      console.warn(`Service '${name}' already registered`);
    }
    this.services.set(name, service);
  }
  
  // Register lazy provider
  registerProvider(name, provider) {
    this.providers.set(name, provider);
  }
  
  // Get service (create if lazy)
  get(name) {
    if (this.services.has(name)) {
      return this.services.get(name);
    }
    
    if (this.providers.has(name)) {
      const provider = this.providers.get(name);
      const service = provider();
      this.services.set(name, service);
      return service;
    }
    
    return null;
  }
  
  // Check if service exists
  has(name) {
    return this.services.has(name) || this.providers.has(name);
  }
  
  // Remove service
  unregister(name) {
    this.services.delete(name);
    this.providers.delete(name);
  }
  
  // Clear all services
  clear() {
    this.services.clear();
    this.providers.clear();
  }
}
```

**Built-in Services:**

```javascript
// Theme service
class ThemeService {
  constructor(themeData) {
    this.currentTheme = themeData;
    this.listeners = new Set();
  }
  
  setTheme(themeData) {
    this.currentTheme = themeData;
    this.notifyListeners();
  }
  
  addListener(callback) {
    this.listeners.add(callback);
  }
  
  removeListener(callback) {
    this.listeners.delete(callback);
  }
  
  notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentTheme));
  }
}

// MediaQuery service
class MediaQueryService {
  constructor() {
    this.data = this.getCurrentData();
    this.listeners = new Set();
    
    // Listen to window resize
    window.addEventListener('resize', () => this.update());
  }
  
  getCurrentData() {
    return {
      size: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      devicePixelRatio: window.devicePixelRatio,
      orientation: window.innerWidth > window.innerHeight 
        ? 'landscape' 
        : 'portrait'
    };
  }
  
  update() {
    this.data = this.getCurrentData();
    this.notifyListeners();
  }
  
  addListener(callback) {
    this.listeners.add(callback);
  }
  
  removeListener(callback) {
    this.listeners.delete(callback);
  }
  
  notifyListeners() {
    this.listeners.forEach(cb => cb(this.data));
  }
}
```

**Validation:**
- ✅ Services registered correctly
- ✅ Lazy services created on demand
- ✅ Services accessible via context
- ✅ Service listeners work

---

### 5.3.3 InheritedWidget Support

**File:** `src/runtime/inherited-element.js`

```javascript
class InheritedElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
    this.dependents = new Set(); // Elements depending on this
  }
  
  build() {
    // InheritedWidget just passes through child
    const child = this.widget.child;
    return VNodeBuilder.build(child, this.buildContext());
  }
  
  // Register dependent
  addDependent(element) {
    this.dependents.add(element);
  }
  
  // Remove dependent
  removeDependent(element) {
    this.dependents.delete(element);
  }
  
  // Update: notify all dependents
  update(newWidget) {
    const oldWidget = this.widget;
    super.update(newWidget);
    
    // Check if value changed
    if (this.widget.updateShouldNotify(oldWidget)) {
      this.notifyDependents();
    }
  }
  
  // Notify all dependents to rebuild
  notifyDependents() {
    this.dependents.forEach(element => {
      if (element.mounted) {
        element.markNeedsBuild();
      }
    });
  }
  
  unmount() {
    this.dependents.clear();
    super.unmount();
  }
}

// Base InheritedWidget class
class InheritedWidget extends Widget {
  constructor({ child, key }) {
    super({ key });
    this.child = child;
  }
  
  // Subclasses override to determine if update needed
  updateShouldNotify(oldWidget) {
    return true;
  }
  
  // Static helper: Theme.of(context)
  static of(context) {
    return context.dependOnInheritedWidgetOfExactType(this);
  }
}
```

**Usage Example:**

```javascript
class Theme extends InheritedWidget {
  constructor({ data, child, key }) {
    super({ child, key });
    this.data = data;
  }
  
  updateShouldNotify(oldWidget) {
    return this.data !== oldWidget.data;
  }
  
  static of(context) {
    const theme = context.dependOnInheritedWidgetOfExactType(Theme);
    return theme ? theme.data : null;}
}

// Usage in app
class MyApp extends StatelessWidget {
  build(context) {
    return Theme({
      data: new ThemeData({ primaryColor: '#6750a4' }),
      child: MaterialApp({
        home: HomePage()
      })
    });
  }
}

class HomePage extends StatelessWidget {
  build(context) {
    const theme = Theme.of(context);
    return Container({
      color: theme.primaryColor,
      child: Text('Hello')
    });
  }
}
```

**Validation:**
- ✅ InheritedWidget passes value down tree
- ✅ Dependents registered correctly
- ✅ Updates propagate to dependents
- ✅ Theme.of(context) works
- ✅ Multiple inherited widgets stack

---

## Phase 5.4: Event System & Integration (Weeks 7-8)

### Objective
Build robust event handling system with delegation, bubbling, and gesture support.

### 5.4.1 Event Delegation System

**File:** `src/runtime/event-system.js`

Use event delegation for efficient event handling.

```javascript
class EventSystem {
  constructor(runtime) {
    this.runtime = runtime;
    this.rootElement = null;
    this.eventHandlers = new Map(); // elementId → { event → handler }
    
    // Delegated event types
    this.delegatedEvents = new Set([
      'click', 'dblclick',
      'mousedown', 'mouseup', 'mousemove',
      'mouseenter', 'mouseleave',
      'touchstart', 'touchend', 'touchmove',
      'keydown', 'keyup', 'keypress',
      'focus', 'blur',
      'input', 'change', 'submit'
    ]);
  }
  
  // Initialize event delegation
  initialize(rootElement) {
    this.rootElement = rootElement;
    
    // Attach delegated listeners at root
    this.delegatedEvents.forEach(eventType => {
      rootElement.addEventListener(eventType, (e) => {
        this.handleDelegatedEvent(eventType, e);
      }, true); // Use capture phase
    });
  }
  
  // Handle delegated event
  handleDelegatedEvent(eventType, nativeEvent) {
    let target = nativeEvent.target;
    
    // Traverse up from target to root
    while (target && target !== this.rootElement) {
      const elementId = target.dataset?.elementId;
      
      if (elementId) {
        const handlers = this.eventHandlers.get(elementId);
        
        if (handlers && handlers[eventType]) {
          const handler = handlers[eventType];
          
          // Create synthetic event
          const syntheticEvent = this.createSyntheticEvent(nativeEvent);
          
          // Call handler
          try {
            handler(syntheticEvent);
          } catch (error) {
            console.error(`Error in ${eventType} handler:`, error);
          }
          
          // Stop if propagation stopped
          if (syntheticEvent._stopPropagation) {
            break;
          }
        }
      }
      
      target = target.parentElement;
    }
  }
  
  // Register event handler for element
  registerHandler(elementId, eventType, handler) {
    if (!this.eventHandlers.has(elementId)) {
      this.eventHandlers.set(elementId, {});
    }
    
    this.eventHandlers.get(elementId)[eventType] = handler;
  }
  
  // Unregister handlers for element
  unregisterHandlers(elementId) {
    this.eventHandlers.delete(elementId);
  }
  
  // Create synthetic event
  createSyntheticEvent(nativeEvent) {
    return {
      type: nativeEvent.type,
      target: nativeEvent.target,
      currentTarget: nativeEvent.currentTarget,
      
      // Prevent defaults
      preventDefault() {
        nativeEvent.preventDefault();
      },
      
      // Stop propagation
      stopPropagation() {
        this._stopPropagation = true;
        nativeEvent.stopPropagation();
      },
      
      // Mouse/touch position
      clientX: nativeEvent.clientX,
      clientY: nativeEvent.clientY,
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
      
      // Keyboard
      key: nativeEvent.key,
      keyCode: nativeEvent.keyCode,
      altKey: nativeEvent.altKey,
      ctrlKey: nativeEvent.ctrlKey,
      shiftKey: nativeEvent.shiftKey,
      metaKey: nativeEvent.metaKey,
      
      // Touch
      touches: nativeEvent.touches,
      changedTouches: nativeEvent.changedTouches,
      
      // Input
      value: nativeEvent.target?.value,
      checked: nativeEvent.target?.checked,
      
      // Native event
      nativeEvent: nativeEvent,
      
      _stopPropagation: false
    };
  }
  
  // Cleanup
  dispose() {
    this.eventHandlers.clear();
    this.rootElement = null;
  }
}
```

**Integration with VNode Rendering:**

```javascript
// In VNodeRenderer
static applyEvents(element, events, elementId) {
  if (!events) return;
  
  // Register with event system instead of direct attachment
  Object.entries(events).forEach(([eventName, handler]) => {
    if (typeof handler !== 'function') return;
    
    const eventType = eventName.replace(/^on/, '').toLowerCase();
    
    // Store element ID for delegation
    element.dataset.elementId = elementId;
    
    // Register handler
    this.runtime.eventSystem.registerHandler(elementId, eventType, handler);
  });
}
```

**Validation:**
- ✅ Events delegated at root
- ✅ Handlers called correctly
- ✅ Event bubbling works
- ✅ stopPropagation works
- ✅ Performance better than direct attachment

---

### 5.4.2 Gesture Recognizers

**File:** `src/runtime/gesture-recognizer.js`

Handle complex gestures (tap, long-press, swipe, etc.).

```javascript
class GestureRecognizer {
  constructor() {
    this.recognizers = new Map(); // elementId → recognizers
  }
  
  // Register tap gesture
  registerTap(elementId, callback, options = {}) {
    const recognizer = new TapRecognizer(callback, options);
    this.addRecognizer(elementId, 'tap', recognizer);
  }
  
  // Register long-press gesture
  registerLongPress(elementId, callback, options = {}) {
    const recognizer = new LongPressRecognizer(callback, options);
    this.addRecognizer(elementId, 'longpress', recognizer);
  }
  
  // Register swipe gesture
  registerSwipe(elementId, callback, options = {}) {
    const recognizer = new SwipeRecognizer(callback, options);
    this.addRecognizer(elementId, 'swipe', recognizer);
  }
  
  // Add recognizer
  addRecognizer(elementId, type, recognizer) {
    if (!this.recognizers.has(elementId)) {
      this.recognizers.set(elementId, new Map());
    }
    this.recognizers.get(elementId).set(type, recognizer);
  }
  
  // Handle pointer event
  handlePointerEvent(elementId, eventType, event) {
    const recognizers = this.recognizers.get(elementId);
    if (!recognizers) return;
    
    recognizers.forEach(recognizer => {
      recognizer.handleEvent(eventType, event);
    });
  }
  
  // Cleanup
  unregisterAll(elementId) {
    const recognizers = this.recognizers.get(elementId);
    if (recognizers) {
      recognizers.forEach(r => r.dispose());
      this.recognizers.delete(elementId);
    }
  }
}

// Tap recognizer
class TapRecognizer {
  constructor(callback, options) {
    this.callback = callback;
    this.maxDuration = options.maxDuration || 300; // ms
    this.maxMovement = options.maxMovement || 10; // px
    
    this.startTime = null;
    this.startX = null;
    this.startY = null;
  }
  
  handleEvent(eventType, event) {
    if (eventType === 'pointerdown' || eventType === 'touchstart') {
      this.startTime = Date.now();
      this.startX = event.clientX || event.touches?.[0]?.clientX;
      this.startY = event.clientY || event.touches?.[0]?.clientY;
    }
    
    if (eventType === 'pointerup' || eventType === 'touchend') {
      const duration = Date.now() - this.startTime;
      const endX = event.clientX || event.changedTouches?.[0]?.clientX;
      const endY = event.clientY || event.changedTouches?.[0]?.clientY;
      
      const dx = Math.abs(endX - this.startX);
      const dy = Math.abs(endY - this.startY);
      const movement = Math.sqrt(dx * dx + dy * dy);
      
      if (duration <= this.maxDuration && movement <= this.maxMovement) {
        this.callback(event);
      }
    }
  }
  
  dispose() {
    this.callback = null;
  }
}

// Long-press recognizer
class LongPressRecognizer {
  constructor(callback, options) {
    this.callback = callback;
    this.duration = options.duration || 500; // ms
    this.maxMovement = options.maxMovement || 10; // px
    
    this.timer = null;
    this.startX = null;
    this.startY = null;
  }
  
  handleEvent(eventType, event) {
    if (eventType === 'pointerdown' || eventType === 'touchstart') {
      this.startX = event.clientX || event.touches?.[0]?.clientX;
      this.startY = event.clientY || event.touches?.[0]?.clientY;
      
      this.timer = setTimeout(() => {
        this.callback(event);
        this.timer = null;
      }, this.duration);
    }
    
    if (eventType === 'pointermove' || eventType === 'touchmove') {
      const x = event.clientX || event.touches?.[0]?.clientX;
      const y = event.clientY || event.touches?.[0]?.clientY;
      
      const dx = Math.abs(x - this.startX);
      const dy = Math.abs(y - this.startY);
      const movement = Math.sqrt(dx * dx + dy * dy);
      
      if (movement > this.maxMovement) {
        this.cancel();
      }
    }
    
    if (eventType === 'pointerup' || eventType === 'touchend' || 
        eventType === 'pointercancel' || eventType === 'touchcancel') {
      this.cancel();
    }
  }
  
  cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  
  dispose() {
    this.cancel();
    this.callback = null;
  }
}

// Swipe recognizer
class SwipeRecognizer {
  constructor(callback, options) {
    this.callback = callback;
    this.minDistance = options.minDistance || 50; // px
    this.maxDuration = options.maxDuration || 300; // ms
    
    this.startTime = null;
    this.startX = null;
    this.startY = null;
  }
  
  handleEvent(eventType, event) {
    if (eventType === 'pointerdown' || eventType === 'touchstart') {
      this.startTime = Date.now();
      this.startX = event.clientX || event.touches?.[0]?.clientX;
      this.startY = event.clientY || event.touches?.[0]?.clientY;
    }
    
    if (eventType === 'pointerup' || eventType === 'touchend') {
      const duration = Date.now() - this.startTime;
      const endX = event.clientX || event.changedTouches?.[0]?.clientX;
      const endY = event.clientY || event.changedTouches?.[0]?.clientY;
      
      const dx = endX - this.startX;
      const dy = endY - this.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (duration <= this.maxDuration && distance >= this.minDistance) {
        const direction = this.getDirection(dx, dy);
        this.callback({ direction, dx, dy, distance });
      }
    }
  }
  
  getDirection(dx, dy) {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    if (angle >= -45 && angle < 45) return 'right';
    if (angle >= 45 && angle < 135) return 'down';
    if (angle >= -135 && angle < -45) return 'up';
    return 'left';
  }
  
  dispose() {
    this.callback = null;
  }
}
```

**GestureDetector Widget:**

```javascript
class GestureDetector extends StatelessWidget {
  constructor({ child, onTap, onLongPress, onSwipe, key }) {
    super({ key });
    this.child = child;
    this.onTap = onTap;
    this.onLongPress = onLongPress;
    this.onSwipe = onSwipe;
  }
  
  build(context) {
    // Build child widget
    const childWidget = this.child;
    
    // Wrap with gesture handlers
    return Container({
      child: childWidget,
      _gestureHandlers: {
        onTap: this.onTap,
        onLongPress: this.onLongPress,
        onSwipe: this.onSwipe
      }
    });
  }
}

// Usage
GestureDetector({
  onTap: () => console.log('Tapped!'),
  onLongPress: () => console.log('Long pressed!'),
  onSwipe: ({ direction }) => console.log(`Swiped ${direction}`),
  child: Container({
    width: 100,
    height: 100,
    color: Colors.blue
  })
})
```

**Validation:**
- ✅ Tap detected correctly
- ✅ Long-press works
- ✅ Swipe detects direction
- ✅ Multiple gestures on same element
- ✅ Gestures work on touch and mouse

---

### 5.4.3 Focus Management

**File:** `src/runtime/focus-manager.js`

Manage keyboard focus and navigation.

```javascript
class FocusManager {
  constructor(runtime) {
    this.runtime = runtime;
    this.focusedElement = null;
    this.focusableElements = new Map(); // elementId → element
    this.focusScopes = new Map(); // scopeId → [elementIds]
  }
  
  // Register focusable element
  registerFocusable(elementId, domElement, options = {}) {
    this.focusableElements.set(elementId, {
      element: domElement,
      canRequestFocus: options.canRequestFocus !== false,
      skipTraversal: options.skipTraversal === true,
      autofocus: options.autofocus === true
    });
    
    // Autofocus if requested
    if (options.autofocus) {
      this.requestFocus(elementId);
    }
  }
  
  // Unregister focusable element
  unregisterFocusable(elementId) {
    if (this.focusedElement === elementId) {
      this.focusedElement = null;
    }
    this.focusableElements.delete(elementId);
  }
  
  // Request focus
  requestFocus(elementId) {
    const info = this.focusableElements.get(elementId);
    if (!info || !info.canRequestFocus) return;
    
    // Blur previous
    if (this.focusedElement && this.focusedElement !== elementId) {
      const prevInfo = this.focusableElements.get(this.focusedElement);
      if (prevInfo) {
        prevInfo.element.blur();
      }
    }
    
    // Focus new
    info.element.focus();
    this.focusedElement = elementId;
  }
  
  // Move focus (Tab navigation)
  moveFocus(direction) {
    const focusable = Array.from(this.focusableElements.entries())
      .filter(([id, info]) => !info.skipTraversal)
      .sort((a, b) => {
        // Sort by DOM position
        return a[1].element.compareDocumentPosition(b[1].element) & 2 ? 1 : -1;
      });
    
    if (focusable.length === 0) return;
    
    const currentIndex = focusable.findIndex(([id]) => id === this.focusedElement);
    
    let nextIndex;
    if (direction === 'forward') {
      nextIndex = (currentIndex + 1) % focusable.length;
    } else {
      nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
    }
    
    const [nextId] = focusable[nextIndex];
    this.requestFocus(nextId);
  }
  
  // Setup keyboard navigation
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.moveFocus(e.shiftKey ? 'backward' : 'forward');
      }
    });
  }
  
  // Create focus scope
  createScope(scopeId, elementIds) {
    this.focusScopes.set(scopeId, elementIds);
  }
  
  // Remove focus scope
  removeScope(scopeId) {
    this.focusScopes.delete(scopeId);
  }
  
  // Get current focus
  get currentFocus() {
    return this.focusedElement;
  }
  
  // Dispose
  dispose() {
    this.focusableElements.clear();
    this.focusScopes.clear();
    this.focusedElement = null;
  }
}
```

**Focus Widget:**

```javascript
class Focus extends StatefulWidget {
  constructor({ child, autofocus, onFocusChange, key }) {
    super({ key });
    this.child = child;
    this.autofocus = autofocus || false;
    this.onFocusChange = onFocusChange;
  }
  
  createState() {
    return new _FocusState();
  }
}

class _FocusState extends State {
  constructor() {
    super();
    this.hasFocus = false;
  }
  
  initState() {
    // Register with focus manager
    const runtime = this.context._runtime;
    const elementId = this.context._element.id;
    
    runtime.focusManager.registerFocusable(elementId, null, {
      autofocus: this.widget.autofocus
    });
  }
  
  dispose() {
    const runtime = this.context._runtime;
    const elementId = this.context._element.id;
    
    runtime.focusManager.unregisterFocusable(elementId);
  }
  
  build(context) {
    return this.widget.child;
  }
}
```

**Validation:**
- ✅ Focus management works
- ✅ Tab navigation works
- ✅ Autofocus works
- ✅ Focus scopes isolate navigation
- ✅ onFocusChange callbacks fire

---

### 5.4.4 Complete Runtime Integration

**File:** `src/runtime/index.js`

Bring everything together.

```javascript
class FlutterJSRuntime {
  constructor() {
    this.engine = new RuntimeEngine();
    this.eventSystem = new EventSystem(this.engine);
    this.gestureRecognizer = new GestureRecognizer();
    this.focusManager = new FocusManager(this.engine);
    this.memoryManager = new MemoryManager();
    this.serviceRegistry = new ServiceRegistry();
    
    this.initialized = false;
  }
  
  // Initialize runtime
  initialize(options = {}) {
    if (this.initialized) {
      console.warn('Runtime already initialized');
      return;
    }
    
    // Register built-in services
    this.registerBuiltInServices();
    
    // Setup event system
    if (options.rootElement) {
      this.eventSystem.initialize(options.rootElement);
    }
    
    // Setup focus management
    this.focusManager.setupKeyboardNavigation();
    
    this.initialized = true;
  }
  
  // Register built-in services
  registerBuiltInServices() {
    // Theme service
    this.serviceRegistry.registerProvider('theme', () => {
      return new ThemeService(new ThemeData());
    });
    
    // MediaQuery service
    this.serviceRegistry.registerProvider('mediaQuery', () => {
      return new MediaQueryService();
    });
    
    // Navigator service (if routing enabled)
    if (this.options?.routing) {
      this.serviceRegistry.registerProvider('navigator', () => {
        return new NavigatorService();
      });
    }
  }
  
  // Run application
  runApp(rootWidget, containerElement) {
    if (!this.initialized) {
      this.initialize({ rootElement: containerElement });
    }
    
    // Mount app
    this.engine.mount(rootWidget, containerElement);
    
    return this;
  }
  
  // Hot reload (for development)
  hotReload(newRootWidget) {
    if (!this.engine.elementTree) {
      console.warn('No app mounted');
      return;
    }
    
    // Update root widget
    this.engine.elementTree.update(newRootWidget);
    this.engine.elementTree.markNeedsBuild();
    this.engine.performUpdate();
  }
  
  // Dispose runtime
  dispose() {
    this.engine.unmount();
    this.eventSystem.dispose();
    this.focusManager.dispose();
    this.memoryManager.cleanup();
    this.serviceRegistry.clear();
    
    this.initialized = false;
  }
  
  // Get performance stats
  getStats() {
    return {
      frameCount: this.engine.frameCounter,
      buildTime: this.engine.buildTime,
      renderTime: this.engine.renderTime,
      memory: this.memoryManager.getStats()
    };
  }
}

// Global runtime instance
let _runtime = null;

// Public API
export function runApp(widget) {
  const container = document.getElementById('root') || document.body;
  
  _runtime = new FlutterJSRuntime();
  _runtime.runApp(widget, container);
  
  return _runtime;
}

export function hotReload(widget) {
  if (_runtime) {
    _runtime.hotReload(widget);
  }
}

export function getRuntime() {
  return _runtime;
}
```

**Usage:**

```javascript
// main.js
import { runApp } from '@flutterjs/runtime';
import { MyApp } from './app';

runApp(new MyApp());
```

**Validation:**
- ✅ Full app runs end-to-end
- ✅ State updates work
- ✅ Events fire correctly
- ✅ Services accessible
- ✅ Memory managed correctly
- ✅ Performance acceptable

---

## Implementation Checklist

### Phase 5.1: Core Runtime Engine
- [ ] RuntimeEngine class with mount/unmount
- [ ] Element base class
- [ ] StatelessElement implementation
- [ ] StatefulElement implementation
- [ ] Element tree management
- [ ] Update scheduling with RAF
- [ ] MemoryManager with cleanup
- [ ] Unit tests (40+ test cases)
- [ ] Integration test (simple app mounts)

### Phase 5.2: State Management
- [ ] State base class
- [ ] setState implementation
- [ ] Lifecycle hooks (initState, dispose, etc.)
- [ ] StateTracker for dependencies
- [ ] UpdateBatcher for optimization
- [ ] RebuildOptimizer
- [ ] Unit tests (50+ test cases)
- [ ] Integration test (counter app)

### Phase 5.3: BuildContext & Services
- [ ] BuildContext implementation
- [ ] findAncestor methods
- [ ] ServiceRegistry
- [ ] Built-in services (Theme, MediaQuery)
- [ ] InheritedElement
- [ ] InheritedWidget base class
- [ ] Unit tests (40+ test cases)
- [ ] Integration test (Theme.of works)

### Phase 5.4: Event System
- [ ] EventSystem with delegation
- [ ] Synthetic event creation
- [ ] GestureRecognizer system
- [ ] Tap, LongPress, Swipe recognizers
- [ ] FocusManager
- [ ] Focus widget
- [ ] Complete runtime integration
- [ ] Unit tests (50+ test cases)
- [ ] End-to-end test (full app with events)

---

## Success Criteria

**By end of Week 2 (Phase 5.1):**
- ✅ Simple app mounts and renders
- ✅ Element tree builds correctly
- ✅ Update scheduling works
- ✅ Memory doesn't leak

**By end of Week 4 (Phase 5.2):**
- ✅ Counter app works (setState triggers updates)
- ✅ Multiple setState calls batched
- ✅ Lifecycle hooks called in correct order
- ✅ Only affected widgets rebuild

**By end of Week 6 (Phase 5.3):**
- ✅ BuildContext provides services
- ✅ Theme.of(context) works
- ✅ InheritedWidget propagates values
- ✅ Services lazy-loaded correctly

**By end of Week 8 (Phase 5.4):**
- ✅ All events work (click, input, focus, etc.)
- ✅ Event delegation performs well
- ✅ Gestures detected correctly
- ✅ Focus navigation works
- ✅ Full end-to-end app functional

---

## Testing Strategy

**Unit Tests:** 180+ test cases
- RuntimeEngine initialization
- Element lifecycle
- setState behavior
- BuildContext methods
- Service registration
- Event delegation
- Gesture recognition
- Focus management

**Integration Tests:** 30+ scenarios
- Simple stateless app
- Counter app (stateful)
- Theme provider app
- Event-heavy app
- Gesture app
- Focus navigation

**E2E Tests:** Full application flows
- Mount → interact → unmount
- State updates → UI changes
- Service access → values correct
- Events → handlers called
- Memory → no leaks

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Initial mount** | < 100ms | Time to first render |
| **setState latency** | < 16ms | State change → DOM update |
| **Frame rate** | 60 FPS | During animations/updates |
| **Memory overhead** | < 5MB | Runtime + element tree |
| **Event handling** | < 1ms | Event → handler execution |
| **Update batching** | 5+ updates/batch | Average batch size |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Memory leaks | Growing footprint | Comprehensive cleanup, testing |
| Performance regression | Jank | Benchmark each phase, optimize |
| Event conflicts | Wrong handlers fired | Clear delegation strategy |
| State race conditions | Inconsistent UI | Batching, single update queue |
| Context pollution | Wrong services | Scoped providers, isolation |

---

## Output Artifacts

By end of Step 5, you'll have:

1. **src/runtime/** - Complete runtime system
   - runtime-engine.js
   - element.js
   - state.js
   - build-context.js
   - event-system.js
   - gesture-recognizer.js
   - focus-manager.js
   - memory-manager.js
   - service-registry.js
   - index.js

2. **tests/runtime/** - 180+ unit tests

3. **examples/runtime/** - Working examples
   - Simple stateless app
   - Counter (stateful)
   - Theme provider
   - Event handling
   - Gesture detection

4. **docs/runtime-guide.md** - Implementation guide

5. **Performance benchmarks** - Metrics for each phase

---

## Next Steps (After Step 5)

Once Step 5 is complete, you'll have a **fully functional runtime**. The remaining steps will be:

- **Step 6:** Build System & CLI (bundling, optimization)
- **Step 7:** Material Design Widgets (complete widget library)
- **Step 8:** Routing & Navigation
- **Step 9:** Production Polish (error handling, DevTools)

The runtime built in Step 5 is the **foundation** for everything else. Take time to test thoroughly and optimize performance before moving on.