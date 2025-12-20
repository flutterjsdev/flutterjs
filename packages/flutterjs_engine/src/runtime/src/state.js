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
import { UpdateBatcher } from "./update_batcher.js";
import { StateTracker } from "./state_tracker.js";

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
    ReactiveState,
    StateObserver
  };
}

export {
  State,
  StateManager,

  ReactiveState,
  StateObserver
};