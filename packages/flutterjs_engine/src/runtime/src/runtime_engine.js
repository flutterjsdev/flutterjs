/**
 * FlutterJS Runtime Engine
 * 
 * Core runtime that manages widget lifecycle, element tree, and coordinates
 * all system operations. This is the heart of the FlutterJS framework.
 * 
 * Responsibilities:
 * - Mount and unmount applications
 * - Create and manage element tree
 * - Schedule and perform updates
 * - Track dirty elements
 * - Coordinate with service registry
 * - Memory management
 */

class RuntimeEngine {
  constructor() {
    // Root references
    this.rootElement = null;           // Root DOM element
    this.rootWidget = null;            // Root widget (e.g., MyApp)
    this.elementTree = null;           // Root element instance
    
    // Update management
    this.dirtyElements = new Set();    // Elements needing rebuild
    this.updateScheduled = false;      // Update queued?
    this.isUpdating = false;           // Currently performing update?
    
    // Context and services
    this.buildContext = null;          // Global context
    this.serviceRegistry = new Map();  // Framework services
    
    // Performance tracking
    this.frameCounter = 0;
    this.buildTime = 0;
    this.renderTime = 0;
    this.lastUpdateTime = 0;
    
    // State
    this.mounted = false;
    this.disposed = false;
    
    // Configuration
    this.config = {
      batchUpdates: true,
      debugMode: false,
      performanceMonitoring: true
    };
  }
  
  /**
   * Initialize and mount application
   * @param {Widget} rootWidget - Root widget of the application
   * @param {HTMLElement} containerElement - DOM container to mount into
   * @returns {RuntimeEngine} this instance for chaining
   */
  mount(rootWidget, containerElement) {
    if (this.mounted) {
      throw new Error('Runtime already mounted. Call unmount() first.');
    }
    
    if (!rootWidget) {
      throw new Error('Root widget is required');
    }
    
    if (!containerElement || !(containerElement instanceof HTMLElement)) {
      throw new Error('Valid container element is required');
    }
    
    try {
      this.rootWidget = rootWidget;
      this.rootElement = containerElement;
      
      // Create root element from widget
      this.elementTree = this.createElement(rootWidget, null);
      
      if (!this.elementTree) {
        throw new Error('Failed to create root element');
      }
      
      // Build initial VNode tree
      const startBuild = performance.now();
      const vnode = this.elementTree.build();
      this.buildTime = performance.now() - startBuild;
      
      if (!vnode) {
        throw new Error('Root element build() returned null');
      }
      
      // Render to DOM
      const startRender = performance.now();
      this.renderVNode(vnode, containerElement);
      this.renderTime = performance.now() - startRender;
      
      // Store DOM reference in element
      this.elementTree.domNode = containerElement.firstChild;
      
      // Mount element tree (calls lifecycle hooks)
      this.elementTree.mount();
      
      this.mounted = true;
      
      if (this.config.debugMode) {
        console.log(`[RuntimeEngine] Mounted in ${(this.buildTime + this.renderTime).toFixed(2)}ms`);
        console.log(`  - Build: ${this.buildTime.toFixed(2)}ms`);
        console.log(`  - Render: ${this.renderTime.toFixed(2)}ms`);
      }
      
      return this;
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to mount application: ${error.message}`);
    }
  }
  
  /**
   * Create element from widget
   * @param {Widget} widget - Widget to create element for
   * @param {Element|null} parent - Parent element
   * @returns {Element} Created element instance
   */
  createElement(widget, parent) {
    if (!widget) {
      throw new Error('Widget is required');
    }
    
    // Determine element type based on widget type
    const widgetType = widget.constructor.name;
    
    // Check if widget has custom element creation
    if (typeof widget.createElement === 'function') {
      return widget.createElement(parent, this);
    }
    
    // Default element creation based on widget class
    if (this.isStatelessWidget(widget)) {
      return new StatelessElement(widget, parent, this);
    } else if (this.isStatefulWidget(widget)) {
      return new StatefulElement(widget, parent, this);
    } else if (this.isInheritedWidget(widget)) {
      return new InheritedElement(widget, parent, this);
    }
    
    throw new Error(`Unknown widget type: ${widgetType}. Widget must extend StatelessWidget, StatefulWidget, or InheritedWidget.`);
  }
  
  /**
   * Check if widget is StatelessWidget
   */
  isStatelessWidget(widget) {
    return widget.constructor.name === 'StatelessWidget' || 
           (widget.__proto__ && widget.__proto__.constructor.name === 'StatelessWidget');
  }
  
  /**
   * Check if widget is StatefulWidget
   */
  isStatefulWidget(widget) {
    return widget.constructor.name === 'StatefulWidget' ||
           (widget.__proto__ && widget.__proto__.constructor.name === 'StatefulWidget');
  }
  
  /**
   * Check if widget is InheritedWidget
   */
  isInheritedWidget(widget) {
    return widget.constructor.name === 'InheritedWidget' ||
           (widget.__proto__ && widget.__proto__.constructor.name === 'InheritedWidget');
  }
  
  /**
   * Render VNode to DOM (simple implementation for now)
   */
  renderVNode(vnode, container) {
    if (!vnode) return;
    
    if (typeof vnode === 'string') {
      container.textContent = vnode;
      return;
    }
    
    const element = document.createElement(vnode.tag || 'div');
    
    // Apply props
    if (vnode.props) {
      Object.entries(vnode.props).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else {
          element.setAttribute(key, value);
        }
      });
    }
    
    // Apply inline style
    if (vnode.style) {
      Object.assign(element.style, vnode.style);
    }
    
    // Render children
    if (vnode.children) {
      vnode.children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          const childContainer = document.createElement('div');
          this.renderVNode(child, childContainer);
          if (childContainer.firstChild) {
            element.appendChild(childContainer.firstChild);
          }
        }
      });
    }
    
    container.appendChild(element);
  }
  
  /**
   * Schedule element for rebuild
   * @param {Element} element - Element that needs rebuild
   */
  markNeedsBuild(element) {
    if (!element) {
      console.warn('[RuntimeEngine] markNeedsBuild called with null element');
      return;
    }
    
    if (!this.mounted) {
      if (this.config.debugMode) {
        console.warn('[RuntimeEngine] markNeedsBuild called but runtime not mounted');
      }
      return;
    }
    
    this.dirtyElements.add(element);
    this.scheduleUpdate();
  }
  
  /**
   * Schedule update on next frame
   */
  scheduleUpdate() {
    if (this.updateScheduled) return;
    if (this.disposed) return;
    
    this.updateScheduled = true;
    
    requestAnimationFrame(() => {
      this.performUpdate();
    });
  }
  
  /**
   * Perform update - rebuild dirty elements
   */
  performUpdate() {
    if (this.disposed) return;
    if (this.isUpdating) {
      // Already updating, reschedule
      this.updateScheduled = true;
      return;
    }
    
    this.updateScheduled = false;
    this.isUpdating = true;
    
    try {
      const startTime = performance.now();
      
      // Get elements to rebuild
      const elements = Array.from(this.dirtyElements);
      
      if (elements.length === 0) {
        this.isUpdating = false;
        return;
      }
      
      // Sort by depth (parents before children)
      elements.sort((a, b) => a.depth - b.depth);
      
      // Rebuild each dirty element
      for (const element of elements) {
        if (element.mounted && this.dirtyElements.has(element)) {
          try {
            element.rebuild();
          } catch (error) {
            console.error(`[RuntimeEngine] Error rebuilding element:`, error);
            // Continue with other elements
          }
        }
      }
      
      // Clear dirty elements
      this.dirtyElements.clear();
      
      // Track performance
      this.buildTime = performance.now() - startTime;
      this.lastUpdateTime = Date.now();
      this.frameCounter++;
      
      if (this.config.performanceMonitoring && this.buildTime > 16) {
        console.warn(`[RuntimeEngine] Slow update: ${this.buildTime.toFixed(2)}ms (${elements.length} elements)`);
      }
      
      if (this.config.debugMode) {
        console.log(`[RuntimeEngine] Updated ${elements.length} elements in ${this.buildTime.toFixed(2)}ms`);
      }
    } finally {
      this.isUpdating = false;
      
      // If more updates were scheduled during update, process them
      if (this.updateScheduled && this.dirtyElements.size > 0) {
        this.scheduleUpdate();
      }
    }
  }
  
  /**
   * Unmount entire application
   */
  unmount() {
    if (!this.mounted) {
      console.warn('[RuntimeEngine] unmount called but not mounted');
      return;
    }
    
    try {
      if (this.elementTree) {
        this.elementTree.unmount();
        this.elementTree = null;
      }
      
      this.cleanup();
      
      if (this.config.debugMode) {
        console.log('[RuntimeEngine] Unmounted');
      }
    } catch (error) {
      console.error('[RuntimeEngine] Error during unmount:', error);
    }
  }
  
  /**
   * Cleanup internal state
   */
  cleanup() {
    this.dirtyElements.clear();
    this.serviceRegistry.clear();
    this.mounted = false;
    this.updateScheduled = false;
    this.isUpdating = false;
  }
  
  /**
   * Dispose runtime (cannot be used after this)
   */
  dispose() {
    if (this.disposed) return;
    
    this.unmount();
    
    this.rootElement = null;
    this.rootWidget = null;
    this.buildContext = null;
    
    this.disposed = true;
    
    if (this.config.debugMode) {
      console.log('[RuntimeEngine] Disposed');
    }
  }
  
  /**
   * Get performance statistics
   */
  getStats() {
    return {
      mounted: this.mounted,
      frameCount: this.frameCounter,
      buildTime: this.buildTime,
      renderTime: this.renderTime,
      lastUpdateTime: this.lastUpdateTime,
      dirtyElements: this.dirtyElements.size,
      updateScheduled: this.updateScheduled
    };
  }
  
  /**
   * Register a service
   */
  registerService(name, service) {
    this.serviceRegistry.set(name, service);
  }
  
  /**
   * Get a service
   */
  getService(name) {
    return this.serviceRegistry.get(name);
  }
  
  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled) {
    this.config.debugMode = enabled;
  }
}

// Base Element class (simplified for testing)
class Element {
  constructor(widget, parent, runtime) {
    this.widget = widget;
    this.parent = parent;
    this.runtime = runtime;
    
    this.children = [];
    this.vnode = null;
    this.domNode = null;
    
    this.mounted = false;
    this.dirty = false;
    this.depth = parent ? parent.depth + 1 : 0;
    
    this.key = widget.key;
    this.id = Element.generateId();
  }
  
  build() {
    throw new Error('build() must be implemented by subclass');
  }
  
  mount() {
    this.mounted = true;
    this.vnode = this.build();
    this.children.forEach(child => child.mount());
  }
  
  update(newWidget) {
    const oldWidget = this.widget;
    this.widget = newWidget;
    
    if (this.shouldRebuild(oldWidget, newWidget)) {
      this.markNeedsBuild();
    }
  }
  
  rebuild() {
    if (!this.mounted) return;
    
    this.vnode = this.build();
    this.dirty = false;
  }
  
  markNeedsBuild() {
    if (this.dirty) return;
    this.dirty = true;
    this.runtime.markNeedsBuild(this);
  }
  
  unmount() {
    this.children.forEach(child => child.unmount());
    this.children = [];
    this.mounted = false;
    this.domNode = null;
  }
  
  shouldRebuild(oldWidget, newWidget) {
    return oldWidget !== newWidget;
  }
  
  static generateId() {
    return `el_${++Element._counter}`;
  }
}

Element._counter = 0;

// StatelessElement
class StatelessElement extends Element {
  build() {
    // Simple mock build
    return {
      tag: 'div',
      props: { 'data-widget': this.widget.constructor.name },
      children: ['StatelessWidget']
    };
  }
}

// StatefulElement
class StatefulElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
    
    this.state = widget.createState ? widget.createState() : null;
    if (this.state) {
      this.state._element = this;
      this.state._widget = widget;
    }
  }
  
  build() {
    if (this.state && this.state.build) {
      return this.state.build(this.buildContext());
    }
    
    return {
      tag: 'div',
      props: { 'data-widget': this.widget.constructor.name },
      children: ['StatefulWidget']
    };
  }
  
  mount() {
    if (this.state && this.state.initState) {
      this.state.initState();
    }
    
    super.mount();
    
    if (this.state && this.state.didMount) {
      this.state.didMount();
    }
  }
  
  update(newWidget) {
    const oldWidget = this.widget;
    super.update(newWidget);
    
    if (this.state) {
      this.state._widget = newWidget;
      
      if (this.state.didUpdateWidget) {
        this.state.didUpdateWidget(oldWidget);
      }
    }
  }
  
  unmount() {
    if (this.state && this.state.dispose) {
      this.state.dispose();
    }
    
    super.unmount();
  }
  
  buildContext() {
    return { element: this, runtime: this.runtime };
  }
}

// InheritedElement
class InheritedElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
    this.dependents = new Set();
  }
  
  build() {
    return {
      tag: 'div',
      props: { 'data-widget': this.widget.constructor.name },
      children: ['InheritedWidget']
    };
  }
  
  addDependent(element) {
    this.dependents.add(element);
  }
  
  removeDependent(element) {
    this.dependents.delete(element);
  }
  
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

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RuntimeEngine,
    Element,
    StatelessElement,
    StatefulElement,
    InheritedElement
  };
}