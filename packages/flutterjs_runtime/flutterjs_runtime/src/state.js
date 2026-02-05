// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * ============================================================================
 * Flutter-Style Typed State System
 * ============================================================================
 * 
 * Implements State<T> pattern from Flutter where:
 * - State<MyHomePage> gives you access to this.widget as MyHomePage
 * - Automatic type inference through context
 * - Works just like Flutter without user-side workarounds
 * 
 * USAGE:
 * class _MyHomePageState extends State {
 *   build(context) {
 *     return Text(this.widget.title);  // ✅ this.widget is MyHomePage
 *   }
 * }
 */

import { UpdateBatcher } from "./update_batcher.js";
import { StateTracker } from "./state_tracker.js";

// ============================================================================
// STATE CLASS - WITH FLUTTER-STYLE GENERIC SUPPORT
// ============================================================================

/**
 * Base State class with generic widget type support
 * 
 * In Flutter: class _MyState extends State<MyWidget>
 * In FlutterJS: class _MyState extends State
 * 
 * The generic type is handled automatically through the widget-state connection
 */
class State {
  constructor() {
    // Internal references (set by framework)
    this._element = null;           // Owning StatefulElement
    this._widget = null;            // Current widget configuration - MUST BE SET
    this._mounted = false;          // Is state mounted?
    this._updateQueued = false;     // Update scheduled?
    this._building = false;         // Currently building?

    // Lifecycle tracking
    this._initStateCalled = false;
    this._disposeCalled = false;
    this._didInitState = false;
    this._didMount = false;
    this._isActive = false;

    // Performance tracking
    this._buildCount = 0;
    this._lastBuildTime = 0;
  }

  /**
   * Build widget tree - MUST be implemented by subclass
   * @param {BuildContext} context - Build context
   * @returns {Widget} Widget tree
   */
  build(context) {
    throw new Error(`${this.constructor.name}.build() must be implemented`);
  }

  // ============================================================================
  // LIFECYCLE METHODS
  // ============================================================================

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
   * Called when state is reactivated (after deactivate)
   */
  activate() {
    // Override in subclass
  }

  /**
   * Called when state is deactivated (but not disposed)
   */
  deactivate() {
    // Override in subclass
  }

  /**
   * Called during hot reload
   */
  reassemble() {
    // Override in subclass
  }

  // ============================================================================
  // STATE UPDATE METHOD - FLUTTER API
  // ============================================================================

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
    // Mark element for rebuild
    if (this._element && this._element.markNeedsBuild) {
      console.log(`[State] setState calling markNeedsBuild on element: ${this.constructor.name}`);
      this._element.markNeedsBuild();
    } else {
      console.error(`[State] setState failed: element or markNeedsBuild missing. Has element: ${!!this._element}`);
    }
  }

  // ============================================================================
  // FLUTTER-STYLE GETTERS
  // ============================================================================

  /**
   * Get BuildContext
   * @returns {BuildContext|null}
   */
  get context() {
    return this._element ? this._element.context : null;
  }

  /**
   * Check if state is mounted
   * @returns {boolean}
   */
  get mounted() {
    return this._mounted && this._element && this._element._mounted;
  }

  /**
   * ✅ CRITICAL GETTER: Get current widget (typed as T in State<T>)
   * This is THE key to accessing widget properties in Flutter style
   * 
   * Example:
   * class _MyState extends State {
   *   build(context) {
   *     return Text(this.widget.title);  // ✅ Works!
   *   }
   * }
   * 
   * @returns {StatefulWidget} The widget that created this state
   */
  get widget() {
    if (!this._widget) {
      // ✅ FALLBACK: Try to get widget from element if not set
      if (this._element && this._element.widget) {
        console.warn(
          `[State] this._widget was null, recovering from element. ` +
          `This indicates _mount() was not called properly.`
        );
        this._widget = this._element.widget;
      } else {
        console.error(
          `[State] Cannot access this.widget - state not properly mounted. ` +
          `Element: ${!!this._element}, Element.widget: ${!!this._element?.widget}`
        );
        return null;
      }
    }
    return this._widget;
  }

  /**
   * Mark state as building
   * @private
   */
  _markBuilding(building) {
    this._building = building;
  }

  // ============================================================================
  // INTERNAL LIFECYCLE METHODS - CALLED BY FRAMEWORK
  // ============================================================================

  /**
   * ✅ CRITICAL METHOD: Internal mount - called by StatefulElement.mount()
   * This is where this._widget gets set!
   * 
   * @param {StatefulElement} element - The element that owns this state
   */
  _mount(element) {
    console.log('🔧 State._mount() called for:', this.constructor.name);

    if (this._mounted) {
      console.warn('⚠️ State already mounted');
      return;
    }

    // ✅ SET THE ELEMENT REFERENCE
    this._element = element;

    // ✅ CRITICAL: SET THE WIDGET REFERENCE
    // This makes this.widget.title work!
    this._widget = element.widget;

    console.log('✅ State._mount() set widget:', {
      widgetType: this._widget?.constructor?.name,
      widgetTitle: this._widget?.title,
      widgetProps: Object.keys(this._widget || {})
    });

    // ✅ MARK AS MOUNTED
    this._mounted = true;
    this._isActive = true;

    // Call initState if not already called
    if (!this._didInitState) {
      this._didInitState = true;
      console.log('🎬 Calling initState()');
      try {
        this.initState();
      } catch (error) {
        console.error(`[State] initState failed:`, error);
        throw error;
      }
    }

    // Call didChangeDependencies
    console.log('🔗 Calling didChangeDependencies()');
    try {
      this.didChangeDependencies();
    } catch (error) {
      console.error(`[State] didChangeDependencies failed:`, error);
    }

    // Call didMount after first build
    if (!this._didMount) {
      this._didMount = true;
      console.log('🎉 Calling didMount()');
      try {
        this.didMount();
      } catch (error) {
        console.error(`[State] didMount failed:`, error);
      }
    }

    console.log('✅ State._mount() complete');
  }

  /**
   * Internal: Unmount the state
   * Called by StatefulElement.unmount()
   */
  _unmount() {
    if (!this._mounted) {
      return;
    }

    this._isActive = false;
    this._mounted = false;
  }

  /**
   * Internal: Reactivate the state
   */
  _reactivate() {
    if (this._isActive) {
      return;
    }

    this._isActive = true;

    try {
      this.activate();
    } catch (error) {
      console.error(`[State] activate failed:`, error);
    }
  }

  /**
   * Internal: Deactivate the state
   */
  _deactivate() {
    if (!this._isActive) {
      return;
    }

    this._isActive = false;

    try {
      this.deactivate();
    } catch (error) {
      console.error(`[State] deactivate failed:`, error);
    }
  }

  /**
   * ✅ CRITICAL METHOD: Update widget reference when widget rebuilds
   * Called by StatefulElement.updateWidget()
   * 
   * @param {Widget} newWidget - New widget configuration
   */
  _updateWidget(newWidget) {
    console.log('🔄 State._updateWidget() called');
    console.log('  Old widget:', this._widget?.constructor?.name);
    console.log('  New widget:', newWidget?.constructor?.name);

    const oldWidget = this._widget;

    // ✅ UPDATE THE WIDGET REFERENCE
    this._widget = newWidget;

    // Call user's didUpdateWidget lifecycle
    if (this.didUpdateWidget && typeof this.didUpdateWidget === 'function') {
      try {
        this.didUpdateWidget(oldWidget);
      } catch (error) {
        console.error(`[State] didUpdateWidget failed:`, error);
      }
    }

    console.log('✅ Widget updated');
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
    this._isActive = false;

    try {
      this.dispose();
    } catch (error) {
      console.error(`[State] dispose failed:`, error);
    }

    // Clear references
    this._element = null;
    this._widget = null;
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
      disposeCalled: this._disposeCalled,
      isActive: this._isActive,
      hasWidget: !!this._widget,
      widgetType: this._widget?.constructor?.name || 'none'
    };
  }

  /**
   * Print to console (Flutter compatibility)
   * The transpiler maps Dart's print() to this.print() in State methods
   */
  print(message) {
    console.log(message);
  }
}

// ============================================================================
// ENHANCED STATE WITH TYPE CHECKING (Optional)
// ============================================================================

/**
 * TypedState - Optional enhanced state with runtime type checking
 * 
 * Usage:
 * class _MyState extends TypedState {
 *   static widgetType = MyHomePage;
 *   
 *   build(context) {
 *     // TypedState ensures this.widget is MyHomePage
 *     return Text(this.widget.title);
 *   }
 * }
 */
class TypedState extends State {
  constructor() {
    super();
  }

  /**
   * Override _mount to add type checking
   */
  _mount(element) {
    // Call parent mount
    super._mount(element);

    // Optional: Check widget type matches
    const expectedType = this.constructor.widgetType;
    if (expectedType && !(this._widget instanceof expectedType)) {
      console.warn(
        `[TypedState] Type mismatch: expected ${expectedType.name}, ` +
        `got ${this._widget?.constructor?.name}`
      );
    }
  }

  /**
   * Type-safe widget getter with fallback
   */
  get widget() {
    const widget = super.widget;

    if (!widget) {
      throw new Error(
        `[TypedState] this.widget is null. State may not be properly mounted. ` +
        `Ensure StatefulElement calls state._mount(this) during mount.`
      );
    }

    return widget;
  }
}

// ============================================================================
// CONTEXT BUILDER - PROVIDES WIDGET THROUGH CONTEXT
// ============================================================================

/**
 * Enhanced BuildContext that provides widget access
 */
class EnhancedBuildContext {
  constructor(element, runtime, state = null) {
    this._element = element;
    this._runtime = runtime;
    this._state = state;
  }

  /**
   * Get the widget that created this context
   * For StatefulWidgets, this is the StatefulWidget instance
   */
  get widget() {
    if (this._state && this._state._widget) {
      return this._state._widget;
    }
    return this._element?.widget || null;
  }

  /**
   * Get the state object (if this is a StatefulWidget)
   */
  get state() {
    return this._state;
  }

  /**
   * Get the element
   */
  get element() {
    return this._element;
  }

  /**
   * Get the runtime
   */
  get runtime() {
    return this._runtime;
  }

  /**
   * Find ancestor widget of type T
   */
  findAncestorWidgetOfExactType(Type) {
    let current = this._element?._parent;

    while (current) {
      if (current.widget instanceof Type) {
        return current.widget;
      }
      current = current._parent;
    }

    return null;
  }

  /**
   * Find ancestor state of type T
   */
  findAncestorStateOfType(Type) {
    let current = this._element?._parent;

    while (current) {
      if (current.state && current.state instanceof Type) {
        return current.state;
      }
      current = current._parent;
    }

    return null;
  }
}

// ============================================================================
// STATE MANAGER - MANAGES STATE LIFECYCLE
// ============================================================================

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
   * Register a state with proper widget linking
   * @param {State} state - State to register
   * @param {StatefulElement} element - Owning element
   */
  register(state, element) {
    if (!state || !element) {
      throw new Error('State and element are required');
    }

    const stateId = this.generateStateId(state);

    this.states.set(stateId, state);
    this.stateElements.set(state, element);

    // ✅ CRITICAL: Ensure widget reference is set
    // This should be done in state._mount() but we double-check here
    if (!state._widget && element.widget) {
      console.warn(
        `[StateManager] State widget not set, setting from element. ` +
        `This indicates _mount() was not called.`
      );
      state._widget = element.widget;
    }

    this.stats.statesCreated++;

    if (this.config.debugMode) {
      console.log(`[StateManager] Registered state ${stateId}`);
      console.log(`  Widget type: ${state._widget?.constructor?.name}`);
      console.log(`  Widget props:`, Object.keys(state._widget || {}));
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

// ============================================================================
// EXPORTS
// ============================================================================

export {
  State,
  TypedState,
  StateManager,
  EnhancedBuildContext,
};