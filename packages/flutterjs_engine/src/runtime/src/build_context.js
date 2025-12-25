/**
 * FlutterJS BuildContext
 * 
 * BuildContext is the bridge between widgets and the framework.
 * It provides access to:
 * - Ancestor widgets and state
 * - Framework services (Theme, Navigator, MediaQuery)
 * - Inherited values (InheritedWidget data)
 * - Element and state references
 * 
 * Key methods:
 * - findAncestorWidgetOfExactType(Type)
 * - findAncestorStateOfType(Type)
 * - dependOnInheritedWidgetOfExactType(Type)
 * - getService(name)
 * 
 * Usage:
 * class MyWidget extends StatelessWidget {
 *   build(context) {
 *     final theme = Theme.of(context);
 *     final mediaQuery = MediaQuery.of(context);
 *     return Container(...);
 *   }
 * }
 */

class BuildContext {
  /**
   * Create a new BuildContext
   * @param {Element} element - Element that owns this context
   * @param {RuntimeEngine} runtime - Runtime engine reference
   * @param {State} state - State object (optional, for StatefulWidget)
   */
  constructor(element, runtime, state = null) {
    if (!element) {
      throw new Error('Element is required for BuildContext');
    }
    
    if (!runtime) {
      throw new Error('Runtime is required for BuildContext');
    }
    
    // Core references
    this._element = element;
    this._runtime = runtime;
    this._state = state;
    
    // Cache for inherited widgets
    this._inheritedCache = new Map();
    
    // Tracking
    this._visited = new Set();      // For cycle detection
    this._dependencies = new Set(); // For memory tracking
  }
  
  /**
   * Get the current widget
   * @returns {Widget}
   */
  get widget() {
    return this._element ? this._element.widget : null;
  }
  
  /**
   * Get the current state (StatefulWidget only)
   * @returns {State|null}
   */
  get state() {
    return this._state;
  }
  
  /**
   * Get the owning element
   * @returns {Element}
   */
  get element() {
    return this._element;
  }
  
  /**
   * Check if mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._element ? this._element.mounted : false;
  }
  
  /**
   * Find ancestor widget of exact type
   * Searches up the element tree for widget of specific type
   * 
   * @param {Function} Type - Widget class to find
   * @returns {Widget|null} - Found widget or null
   * 
   * @example
   * const appBar = context.findAncestorWidgetOfExactType(AppBar);
   */
  findAncestorWidgetOfExactType(Type) {
    if (!Type) {
      throw new Error('Widget type is required');
    }
    
    let current = this._element.parent;
    
    while (current) {
      const widget = current.widget;
      
      // Check exact type match
      if (widget && widget.constructor === Type) {
        return widget;
      }
      
      current = current.parent;
    }
    
    return null;
  }
  
  /**
   * Find ancestor widget of exact type (deprecated name variant)
   * Alias for findAncestorWidgetOfExactType
   */
  findAncestorWidgetOfType(Type) {
    return this.findAncestorWidgetOfExactType(Type);
  }
  
  /**
   * Find ancestor state of exact type
   * Searches up the element tree for StatefulElement with state of specific type
   * 
   * @param {Function} Type - State class to find
   * @returns {State|null} - Found state or null
   * 
   * @example
   * const counterState = context.findAncestorStateOfType(CounterState);
   */
  findAncestorStateOfType(Type) {
    if (!Type) {
      throw new Error('State type is required');
    }
    
    let current = this._element.parent;
    
    while (current) {
      // Check if element has state
      if (current.state) {
        // Check exact type match
        if (current.state.constructor === Type) {
          return current.state;
        }
      }
      
      current = current.parent;
    }
    
    return null;
  }
  
  /**
   * Find ancestor render object (DOM node)
   * Gets the DOM reference for ancestor element
   * 
   * @returns {HTMLElement|null} - DOM node or null
   */
  findRenderObject() {
    let current = this._element.parent;
    
    while (current) {
      if (current.domNode) {
        return current.domNode;
      }
      current = current.parent;
    }
    
    return null;
  }
  
  /**
   * Depend on InheritedWidget of exact type
   * Finds and registers dependency on InheritedWidget
   * This element will rebuild when InheritedWidget updates
   * 
   * @param {Function} Type - InheritedWidget class to find
   * @returns {InheritedWidget|null} - Found widget or null
   * 
   * @example
   * const theme = context.dependOnInheritedWidgetOfExactType(Theme);
   * if (theme) {
   *   return Container({ color: theme.data.primaryColor });
   * }
   */
  dependOnInheritedWidgetOfExactType(Type) {
    if (!Type) {
      throw new Error('InheritedWidget type is required');
    }
    
    // Check cache first
    const cached = this._inheritedCache.get(Type);
    if (cached !== undefined) {
      return cached;
    }
    
    let current = this._element.parent;
    
    while (current) {
      // Check if this element is InheritedElement
      if (this._isInheritedElement(current)) {
        const widget = current.widget;
        
        if (widget && widget.constructor === Type) {
          // Register dependency
          if (current.addDependent) {
            current.addDependent(this._element);
          }
          
          // Cache result
          this._inheritedCache.set(Type, widget);
          this._dependencies.add(current);
          
          return widget;
        }
      }
      
      current = current.parent;
    }
    
    // Cache null result too
    this._inheritedCache.set(Type, null);
    
    return null;
  }
  
  /**
   * Convenience: Get Theme
   * Shorthand for Theme.of(context)
   * 
   * @returns {ThemeData|null}
   * 
   * @example
   * const theme = context.theme();
   * if (theme) {
   *   console.log(theme.primaryColor);
   * }
   */
  theme() {
    const themeWidget = this.dependOnInheritedWidgetOfExactType(
      this._getThemeClass()
    );
    return themeWidget ? themeWidget.data : null;
  }
  
  /**
   * Convenience: Get MediaQuery
   * Shorthand for MediaQuery.of(context)
   * 
   * @returns {MediaQueryData|null}
   * 
   * @example
   * const mq = context.mediaQuery();
   * if (mq) {
   *   console.log(mq.size.width);
   * }
   */
  mediaQuery() {
    const mq = this.dependOnInheritedWidgetOfExactType(
      this._getMediaQueryClass()
    );
    return mq ? mq.data : null;
  }
  
  /**
   * Convenience: Get Navigator
   * 
   * @returns {NavigatorService|null}
   */
  navigator() {
    return this.getService('navigator');
  }
  
  /**
   * Get framework service
   * Accesses registered services from runtime
   * 
   * @param {string} serviceName - Name of service
   * @returns {*} - Service instance or null
   * 
   * @example
   * const navigator = context.getService('navigator');
   * const theme = context.getService('theme');
   */
  getService(serviceName) {
    if (!serviceName) {
      throw new Error('Service name is required');
    }
    
    if (!this._runtime || !this._runtime.serviceRegistry) {
      return null;
    }
    
    return this._runtime.serviceRegistry.get(serviceName) || null;
  }
  
  /**
   * Visit all ancestor elements
   * Calls visitor function for each ancestor
   * 
   * @param {Function} visitor - Callback function
   *        Receives: element
   *        Return false to stop traversal
   * 
   * @example
   * context.visitAncestorElements((element) => {
   *   console.log(element.constructor.name);
   *   // Return false to stop
   * });
   */
  visitAncestorElements(visitor) {
    if (typeof visitor !== 'function') {
      throw new Error('Visitor must be a function');
    }
    
    let current = this._element.parent;
    
    while (current) {
      const shouldContinue = visitor(current);
      
      if (shouldContinue === false) {
        break;
      }
      
      current = current.parent;
    }
  }
  
  /**
   * Get size of element
   * Returns width and height of DOM element
   * 
   * @returns {Object|null} - { width, height } or null
   * 
   * @example
   * const size = context.size;
   * if (size) {
   *   console.log(`${size.width}x${size.height}`);
   * }
   */
  get size() {
    const domNode = this._element ? this._element.domNode : null;
    
    if (!domNode) {
      return null;
    }
    
    return {
      width: domNode.offsetWidth,
      height: domNode.offsetHeight
    };
  }
  
  /**
   * Get position of element
   * Returns x, y offset from document
   * 
   * @returns {Object|null} - { x, y } or null
   */
  get position() {
    const domNode = this._element ? this._element.domNode : null;
    
    if (!domNode) {
      return null;
    }
    
    return {
      x: domNode.offsetLeft,
      y: domNode.offsetTop
    };
  }
  
  /**
   * Get bounds of element
   * Returns position and size
   * 
   * @returns {Object|null} - { x, y, width, height } or null
   */
  get bounds() {
    const size = this.size;
    const position = this.position;
    
    if (!size || !position) {
      return null;
    }
    
    return {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height
    };
  }
  
  /**
   * Dispatch a custom event
   * For communicating with other widgets
   * 
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   * 
   * @example
   * context.dispatch('theme-changed', { theme: 'dark' });
   */
  dispatch(eventName, data) {
    if (!eventName) {
      throw new Error('Event name is required');
    }
    
    // Dispatch to runtime or element
    if (this._element && this._element.dispatch) {
      this._element.dispatch(eventName, data);
    }
  }
  
  /**
   * Get dependency information
   * For debugging
   * 
   * @returns {Object}
   */
  getDependencyInfo() {
    return {
      dependenciesCount: this._dependencies.size,
      cachedInheritedWidgets: this._inheritedCache.size,
      inheritedWidgetTypes: Array.from(this._inheritedCache.keys())
        .map(Type => Type.name)
    };
  }
  
  /**
   * Check if element is InheritedElement
   * @private
   */
  _isInheritedElement(element) {
    if (!element) return false;
    
    // Check by dependents property (MockInheritedElement has this)
    return element.dependents !== undefined;
  }
  
  /**
   * Get Theme class
   * @private
   */
  _getThemeClass() {
    // Try to get from runtime or return a placeholder
    if (this._runtime && this._runtime._ThemeClass) {
      return this._runtime._ThemeClass;
    }
    
    // Return a class that won't be found (graceful fallback)
    return class ThemeClass {};
  }
  
  /**
   * Get MediaQuery class
   * @private
   */
  _getMediaQueryClass() {
    if (this._runtime && this._runtime._MediaQueryClass) {
      return this._runtime._MediaQueryClass;
    }
    
    return class MediaQueryClass {};
  }
  
  /**
   * Clear cache (for cleanup)
   * @private
   */
  _clearCache() {
    this._inheritedCache.clear();
    this._dependencies.clear();
    this._visited.clear();
  }
  
  /**
   * Dispose context
   */
  dispose() {
    this._clearCache();
    this._element = null;
    this._runtime = null;
    this._state = null;
  }
  
  /**
   * Get context information (for debugging)
   * @returns {Object}
   */
  getInfo() {
    return {
      mounted: this.mounted,
      widgetType: this.widget ? this.widget.constructor.name : null,
      stateType: this.state ? this.state.constructor.name : null,
      elementId: this._element ? this._element.id : null,
      elementDepth: this._element ? this._element.depth : null,
      size: this.size,
      position: this.position,
      dependencies: this.getDependencyInfo()
    };
  }
}


export {BuildContext};
