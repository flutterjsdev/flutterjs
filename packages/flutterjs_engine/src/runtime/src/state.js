/**
 * FlutterJS State Management System
 * 
 * Provides reactive state management for StatefulWidget.
 * 
 * Key Components:
 * - State: Base class for widget state
 * - StateManager: Coordinates state updates and rebuilds
 * - StateTracker: Tracks dependencies and reactivity
 * - UpdateBatcher: Batches multiple setState calls
 * 
 * Lifecycle:
 * 1. initState() - Called once on creation
 * 2. didChangeDependencies() - When inherited values change
 * 3. build() - Build widget tree
 * 4. didUpdateWidget() - When parent widget changes
 * 5. setState() - Trigger rebuild
 * 6. dispose() - Cleanup
 */

/**
 * State Base Class
 * 
 * Base class for all stateful widget state.
 * Subclasses must implement build() method.
 */
class State {
  constructor() {
    // Internal references (set by framework)
    this._element = null;           // Owning StatefulElement
    this._widget = null;            // Current widget configuration
    this._mounted = false;          // Is state mounted?
    this._updateQueued = false;     // Update scheduled?
    this._building = false;         // Currently building?
    
    // Lifecycle tracking
    this._initStateCalled = false;
    this._disposeCalled = false;
    
    // Performance tracking
    this._buildCount = 0;
    this._lastBuildTime = 0;
    
    // State properties (defined by subclass)
    // Example: this.count = 0;
  }
  
  /**
   * Build widget tree
   * Must be implemented by subclass
   * @param {BuildContext} context - Build context
   * @returns {Widget} - Widget tree
   */
  build(context) {
    throw new Error(`${this.constructor.name}.build() must be implemented`);
  }
  
  /**
   * Called once when state is first created
   * Override to initialize state
   */
  initState() {
    // Override in subclass
  }
  
  /**
   * Called when widget configuration changes
   * @param {Widget} oldWidget - Previous widget
   */
  didUpdateWidget(oldWidget) {
    // Override in subclass
  }
  
  /**
   * Called when inherited dependencies change
   */
  didChangeDependencies() {
    // Override in subclass
  }
  
  /**
   * Called when state is about to be permanently removed
   * Override to cleanup resources (timers, listeners, etc.)
   */
  dispose() {
    // Override in subclass
  }
  
  /**
   * Called after first build completes
   */
  didMount() {
    // Override in subclass
  }
  
  /**
   * Update state and schedule rebuild
   * @param {Function|Object} updateFn - Update function or object
   */
  setState(updateFn) {
    // Check if mounted
    if (!this.mounted) {
      console.warn(`[State] setState called on unmounted state (${this.constructor.name})`);
      return;
    }
    
    // Check if building
    if (this._building) {
      console.warn(`[State] setState called during build in ${this.constructor.name}`);
    }
    
    // Apply state update
    if (typeof updateFn === 'function') {
      try {
        updateFn.call(this);
      } catch (error) {
        console.error(`[State] setState update function failed:`, error);
        throw error;
      }
    } else if (typeof updateFn === 'object' && updateFn !== null) {
      // Direct object merge
      Object.assign(this, updateFn);
    } else if (updateFn !== undefined && updateFn !== null) {
      throw new Error('setState accepts function or object');
    }
    
    // Mark element for rebuild
    if (this._element && this._element.markNeedsBuild) {
      this._element.markNeedsBuild();
    }
  }
  
  /**
   * Get BuildContext
   * @returns {BuildContext|null}
   */
  get context() {
    return this._element ? this._element.buildContext() : null;
  }
  
  /**
   * Check if state is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted && this._element && this._element.mounted;
  }
  
  /**
   * Get current widget
   * @returns {Widget|null}
   */
  get widget() {
    return this._widget;
  }
  
  /**
   * Mark state as building
   */
  _markBuilding(building) {
    this._building = building;
  }
  
  /**
   * Internal: Initialize state
   */
  _init() {
    if (this._initStateCalled) {
      return;
    }
    
    this._initStateCalled = true;
    this._mounted = true;
    
    try {
      this.initState();
    } catch (error) {
      console.error(`[State] initState failed:`, error);
      throw error;
    }
  }
  
  /**
   * Internal: Dispose state
   */
  _dispose() {
    if (this._disposeCalled) {
      return;
    }
    
    this._disposeCalled = true;
    this._mounted = false;
    
    try {
      this.dispose();
    } catch (error) {
      console.error(`[State] dispose failed:`, error);
    }
  }
  
  /**
   * Get state statistics
   */
  getStats() {
    return {
      mounted: this.mounted,
      buildCount: this._buildCount,
      lastBuildTime: this._lastBuildTime,
      initStateCalled: this._initStateCalled,
      disposeCalled: this._disposeCalled
    };
  }
}

/**
 * StateManager
 * 
 * Manages state lifecycle and coordinates updates
 */
class StateManager {
  constructor(runtime) {
    this.runtime = runtime;
    
    // State registry
    this.states = new Map();              // stateId → state
    this.stateElements = new WeakMap();   // state → element
    
    // Update batching
    this.updateBatcher = new UpdateBatcher(this);
    
    // State tracking
    this.stateTracker = new StateTracker();
    
    // Configuration
    this.config = {
      enableBatching: true,
      enableTracking: true,
      warnOnSetStateDuringBuild: true,
      debugMode: false
    };
    
    // Statistics
    this.stats = {
      statesCreated: 0,
      statesDisposed: 0,
      setStateCalls: 0,
      batchedUpdates: 0
    };
  }
  
  /**
   * Register a state
   * @param {State} state - State to register
   * @param {Element} element - Owning element
   */
  register(state, element) {
    if (!state || !element) {
      throw new Error('State and element are required');
    }
    
    const stateId = this.generateStateId(state);
    
    this.states.set(stateId, state);
    this.stateElements.set(state, element);
    
    // Link state to element
    state._element = element;
    
    this.stats.statesCreated++;
    
    if (this.config.debugMode) {
      console.log(`[StateManager] Registered state ${stateId}`);
    }
  }
  
  /**
   * Unregister a state
   * @param {State} state - State to unregister
   */
  unregister(state) {
    if (!state) {
      return;
    }
    
    const stateId = this.generateStateId(state);
    
    // Dispose state
    if (!state._disposeCalled) {
      state._dispose();
    }
    
    // Clear references
    this.states.delete(stateId);
    this.stateElements.delete(state);
    
    state._element = null;
    state._widget = null;
    
    this.stats.statesDisposed++;
    
    if (this.config.debugMode) {
      console.log(`[StateManager] Unregistered state ${stateId}`);
    }
  }
  
  /**
   * Handle setState call
   * @param {State} state - State being updated
   * @param {Function} updateFn - Update function
   */
  handleSetState(state, updateFn) {
    if (!state || !state.mounted) {
      return;
    }
    
    this.stats.setStateCalls++;
    
    if (this.config.enableBatching) {
      this.updateBatcher.queueUpdate(state._element, updateFn);
    } else {
      // Immediate update
      updateFn();
      state._element.markNeedsBuild();
    }
  }
  
  /**
   * Generate unique state ID
   */
  generateStateId(state) {
    if (!state._stateId) {
      state._stateId = `state_${++StateManager._stateIdCounter}`;
    }
    return state._stateId;
  }
  
  /**
   * Get element for state
   */
  getElement(state) {
    return this.stateElements.get(state);
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      currentStates: this.states.size,
      batcher: this.updateBatcher.getStats(),
      tracker: this.stateTracker.getStats()
    };
  }
  
  /**
   * Clear all states
   */
  clear() {
    this.states.forEach(state => {
      if (!state._disposeCalled) {
        state._dispose();
      }
    });
    
    this.states.clear();
    this.updateBatcher.clear();
    this.stateTracker.clear();
  }
  
  /**
   * Dispose state manager
   */
  dispose() {
    this.clear();
  }
}

StateManager._stateIdCounter = 0;

/**
 * UpdateBatcher
 * 
 * Batches multiple setState calls into single update
 */
class UpdateBatcher {
  constructor(stateManager) {
    this.stateManager = stateManager;
    
    this.pendingUpdates = new Map();    // element → updates[]
    this.updateScheduled = false;
    
    this.stats = {
      batchesExecuted: 0,
      updatesInLastBatch: 0,
      totalUpdatesBatched: 0
    };
  }
  
  /**
   * Queue state update
   * @param {Element} element - Element to update
   * @param {Function} updateFn - Update function
   */
  queueUpdate(element, updateFn) {
    if (!element) {
      return;
    }
    
    if (!this.pendingUpdates.has(element)) {
      this.pendingUpdates.set(element, []);
    }
    
    this.pendingUpdates.get(element).push(updateFn);
    
    this.scheduleFlush();
  }
  
  /**
   * Schedule flush on next microtask
   */
  scheduleFlush() {
    if (this.updateScheduled) {
      return;
    }
    
    this.updateScheduled = true;
    
    // Use microtask for fast batching
    Promise.resolve().then(() => {
      this.flush();
    });
  }
  
  /**
   * Apply all pending updates
   */
  flush() {
    this.updateScheduled = false;
    
    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();
    
    let totalUpdates = 0;
    
    // Apply all updates to each element's state
    updates.forEach(([element, updateFns]) => {
      if (!element.mounted || !element.state) {
        return;
      }
      
      // Apply all updates to state
      updateFns.forEach(updateFn => {
        try {
          if (typeof updateFn === 'function') {
            updateFn.call(element.state);
          }
        } catch (error) {
          console.error(`[UpdateBatcher] Update failed:`, error);
        }
      });
      
      totalUpdates += updateFns.length;
      
      // Rebuild once
      element.markNeedsBuild();
    });
    
    // Update stats
    this.stats.batchesExecuted++;
    this.stats.updatesInLastBatch = totalUpdates;
    this.stats.totalUpdatesBatched += totalUpdates;
  }
  
  /**
   * Clear pending updates for element
   */
  clear(element) {
    if (element) {
      this.pendingUpdates.delete(element);
    } else {
      this.pendingUpdates.clear();
    }
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      pendingElements: this.pendingUpdates.size,
      updateScheduled: this.updateScheduled
    };
  }
}

/**
 * StateTracker
 * 
 * Tracks which parts of UI depend on which state properties
 */
class StateTracker {
  constructor() {
    this.dependencies = new Map();    // stateProperty → Set<element>
    this.tracking = false;
    this.currentElement = null;
    
    this.stats = {
      dependenciesTracked: 0,
      dependenciesCleared: 0
    };
  }
  
  /**
   * Start tracking dependencies for build
   * @param {Element} element - Element being built
   */
  startTracking(element) {
    this.tracking = true;
    this.currentElement = element;
  }
  
  /**
   * Stop tracking
   */
  stopTracking() {
    this.tracking = false;
    this.currentElement = null;
  }
  
  /**
   * Record dependency: element depends on state property
   * @param {State} state - State object
   * @param {string} property - Property name
   */
  recordDependency(state, property) {
    if (!this.tracking || !this.currentElement) {
      return;
    }
    
    const stateId = state._stateId || 'unknown';
    const key = `${stateId}.${property}`;
    
    if (!this.dependencies.has(key)) {
      this.dependencies.set(key, new Set());
    }
    
    this.dependencies.get(key).add(this.currentElement);
    this.stats.dependenciesTracked++;
  }
  
  /**
   * Get elements that depend on state property
   * @param {State} state - State object
   * @param {string} property - Property name
   * @returns {Set<Element>}
   */
  getDependents(state, property) {
    const stateId = state._stateId || 'unknown';
    const key = `${stateId}.${property}`;
    return this.dependencies.get(key) || new Set();
  }
  
  /**
   * Clear dependencies for element
   * @param {Element} element - Element to clear
   */
  clearDependencies(element) {
    for (const [key, elements] of this.dependencies.entries()) {
      if (elements.has(element)) {
        elements.delete(element);
        this.stats.dependenciesCleared++;
      }
      
      if (elements.size === 0) {
        this.dependencies.delete(key);
      }
    }
  }
  
  /**
   * Clear all dependencies
   */
  clear() {
    this.dependencies.clear();
    this.tracking = false;
    this.currentElement = null;
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalDependencies: this.dependencies.size,
      isTracking: this.tracking
    };
  }
}

/**
 * ReactiveState
 * 
 * Enhanced state with automatic property tracking
 * (Optional extension of State)
 */
class ReactiveState extends State {
  constructor() {
    super();
    this._reactiveProperties = new Set();
    this._propertyValues = new Map();
  }
  
  /**
   * Make property reactive
   * @param {string} property - Property name
   * @param {*} initialValue - Initial value
   */
  makeReactive(property, initialValue) {
    const key = `_${property}`;
    this._propertyValues.set(property, initialValue);
    
    Object.defineProperty(this, property, {
      get() {
        // Track access if tracking enabled
        if (this._element && this._element.runtime) {
          const stateManager = this._element.runtime.stateManager;
          if (stateManager && stateManager.stateTracker.tracking) {
            stateManager.stateTracker.recordDependency(this, property);
          }
        }
        
        return this._propertyValues.get(property);
      },
      set(value) {
        const oldValue = this._propertyValues.get(property);
        
        if (oldValue !== value) {
          this._propertyValues.set(property, value);
          
          // Trigger update for this property's dependents
          if (this._element && this._element.runtime) {
            const stateManager = this._element.runtime.stateManager;
            if (stateManager) {
              const dependents = stateManager.stateTracker.getDependents(this, property);
              dependents.forEach(el => {
                if (el.mounted) {
                  el.markNeedsBuild();
                }
              });
            }
          }
        }
      },
      enumerable: true,
      configurable: true
    });
    
    this._reactiveProperties.add(property);
  }
  
  /**
   * Get reactive property value
   */
  getValue(property) {
    return this._propertyValues.get(property);
  }
  
  /**
   * Set reactive property value
   */
  setValue(property, value) {
    this[property] = value;
  }
}

/**
 * StateObserver
 * 
 * Observes state changes for debugging/logging
 */
class StateObserver {
  constructor() {
    this.observers = new Map();    // stateId → callbacks[]
  }
  
  /**
   * Observe state
   * @param {State} state - State to observe
   * @param {Function} callback - Callback on state change
   */
  observe(state, callback) {
    if (!state || typeof callback !== 'function') {
      return;
    }
    
    const stateId = state._stateId || 'unknown';
    
    if (!this.observers.has(stateId)) {
      this.observers.set(stateId, []);
    }
    
    this.observers.get(stateId).push(callback);
  }
  
  /**
   * Notify observers of state change
   * @param {State} state - State that changed
   * @param {string} property - Property that changed
   * @param {*} oldValue - Old value
   * @param {*} newValue - New value
   */
  notify(state, property, oldValue, newValue) {
    const stateId = state._stateId || 'unknown';
    const callbacks = this.observers.get(stateId);
    
    if (!callbacks) {
      return;
    }
    
    callbacks.forEach(callback => {
      try {
        callback(state, property, oldValue, newValue);
      } catch (error) {
        console.error('[StateObserver] Observer callback failed:', error);
      }
    });
  }
  
  /**
   * Stop observing state
   */
  unobserve(state, callback) {
    const stateId = state._stateId || 'unknown';
    const callbacks = this.observers.get(stateId);
    
    if (!callbacks) {
      return;
    }
    
    if (callback) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.observers.delete(stateId);
    }
  }
  
  /**
   * Clear all observers
   */
  clear() {
    this.observers.clear();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    State,
    StateManager,
    UpdateBatcher,
    StateTracker,
    ReactiveState,
    StateObserver
  };
}