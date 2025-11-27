// ============================================================================
// STATE CLASS - FIXED VERSION with Reactive Updates
// Properly triggers rebuild when state changes (like Flutter)
// ============================================================================

import { Diagnosticable } from './widget.js';
import { FrameworkScheduler } from './scheduler.js';

const StateLifecycle = {
  created: 'created',
  ready: 'ready',
  defunct: 'defunct'
};

class State extends Diagnosticable {
  constructor() {
    super();

    this._widget = null;
    this._element = null;
    this._mounted = false;

    this._debugLifecycleState = StateLifecycle.created;
    this._didInitState = false;
    this._deactivated = false;

    this._debugLabel = this.constructor.name;

    // ✅ FIXED: Reactive state object
    this._state = {};
    this._stateUpdateQueue = [];
    this._isUpdating = false;
  }

  /**
   * Access the widget associated with this state
   */
  get widget() {
    if (!this._widget) {
      throw new Error(`${this._debugLabel}.widget accessed before initialization`);
    }
    return this._widget;
  }

  /**
   * Access BuildContext for this state
   */
  get context() {
    if (!this._element) {
      throw new Error(
        `${this._debugLabel} context accessed after dispose. ` +
        `Check mounted property before using context.`
      );
    }
    return this._element.context;
  }

  /**
   * Check if state is currently mounted in widget tree
   */
  get mounted() {
    if (!this._element) {
      return false;
    }
    return this._mounted && !this._deactivated;
  }

  /**
   * Get current lifecycle state
   */
  get debugLifecycleState() {
    return this._debugLifecycleState;
  }

  // =========================================================================
  // LIFECYCLE METHODS (Override in subclasses)
  // =========================================================================

  /**
   * Called once when state is first created
   * Initialize variables, set up listeners, etc.
   */
  initState() { }

  /**
   * Called when this widget's dependency changes
   * Also called after initState() on first mount
   */
  didChangeDependencies() { }

  /**
   * Called when widget configuration changes
   * oldWidget is the previous configuration
   */
  didUpdateWidget(oldWidget) { }

  /**
   * Called when widget is deactivated
   * Pause expensive operations
   */
  deactivate() { }

  /**
   * Called when widget is reactivated after deactivation
   */
  activate() { }

  /**
   * Called when widget is removed from tree
   * Clean up resources, cancel timers, unsubscribe, etc.
   */
  dispose() {
    if (process.env.NODE_ENV === 'development') {
      if (this._debugLifecycleState !== StateLifecycle.ready) {
        console.warn(
          `${this._debugLabel}.dispose() called in wrong lifecycle state: ` +
          `${this._debugLifecycleState}`
        );
      }
    }

    this._debugLifecycleState = StateLifecycle.defunct;
    this._element = null;
    this._stateUpdateQueue = [];
  }

  /**
   * Build the widget UI from current state
   * Must be overridden in subclasses
   */
  build(context) {
    throw new Error(`${this._debugLabel}.build() must be implemented`);
  }

  // =========================================================================
  // STATE MANAGEMENT (Core fix for reactive updates)
  // =========================================================================

  /**
   * ✅ FIXED: Properly update state and trigger rebuild
   *
   * Usage:
   * this.setState(() => {
   *   this.count++;
   *   this.name = 'New Name';
   * });
   *
   * Or with object:
   * this.setState({ count: this.count + 1 });
   *
   * Or with async callback:
   * this.setState(async () => {
   *   const data = await fetchData();
   *   this.data = data;
   * });
   */
  setState(updateFn, callback) {
    // Validate state is mounted
    if (process.env.NODE_ENV === 'development') {
      if (this._debugLifecycleState === StateLifecycle.defunct) {
        throw new Error(
          `setState() called after dispose() on ${this._debugLabel}\n` +
          `Cancel timers/animations in dispose() and check mounted before setState()`
        );
      }

      if (this._debugLifecycleState === StateLifecycle.created && !this.mounted) {
        throw new Error(
          `setState() called in constructor: ${this._debugLabel}\n` +
          `Don't call setState() in constructor`
        );
      }

      if (!this.mounted) {
        throw new Error(
          `setState() called on unmounted ${this._debugLabel}\n` +
          `Check mounted property before calling setState()`
        );
      }
    } else {
      // Production: silently ignore if not mounted
      if (!this.mounted) {
        return;
      }
    }

    if (typeof updateFn !== 'function' && typeof updateFn !== 'object') {
      throw new Error('setState requires a function or object');
    }

    // Queue the update
    this._stateUpdateQueue.push({
      update: updateFn,
      callback: callback
    });

    // Process updates in batch
    this._processStateUpdates();
  }

  /**
   * ✅ FIXED: Batch and process state updates
   * Groups multiple setState calls together for efficiency
   */
  _processStateUpdates() {
    if (this._isUpdating) {
      return; // Already processing
    }

    this._isUpdating = true;

    // Use microtask to batch updates
    Promise.resolve().then(() => {
      const updates = [...this._stateUpdateQueue];
      this._stateUpdateQueue = [];

      try {
        // Apply all updates
        updates.forEach(({ update }) => {
          if (typeof update === 'function') {
            update.call(this);
          } else if (typeof update === 'object') {
            Object.assign(this, update);
          }
        });

        // ✅ KEY FIX: Mark element for rebuild after state change
        if (this._element && this.mounted) {
          this._element.markNeedsBuild();
        }

        // Call callbacks after update
        updates.forEach(({ callback }) => {
          if (typeof callback === 'function') {
            callback.call(this);
          }
        });
      } catch (error) {
        console.error(`Error in setState callback for ${this._debugLabel}:`, error);
        throw error;
      } finally {
        this._isUpdating = false;

        // Process any queued updates from callbacks
        if (this._stateUpdateQueue.length)
          this._processStateUpdates();

      }
    });
  }

  /**
   * Get current state value (immutable access)
   * Prevents accidental mutations outside setState
   */
  getState() {
    return Object.freeze({ ...this });
  }

  // =========================================================================
  // INTERNAL LIFECYCLE HOOKS (Called by framework)
  // =========================================================================

  /**
   * Mount state to element
   * @internal Called by framework
   */
  _mount(element) {


    this._element = element;
    this._widget = element.widget;           // <-- set widget *before* initState
    this._mounted = true;
    this._debugLifecycleState = StateLifecycle.ready;

    // initState can now safely use this.context
    if (!this._didInitState) {
      this._didInitState = true;
      this.initState();
    }
    this.didChangeDependencies();
  }

  /**
   * Unmount state from element
   * @internal Called by framework
   */
  _unmount() {
    this._mounted = false;
    this._deactivated = false;
  }

  /**
   * Deactivate state
   * @internal Called by framework
   */
  _deactivate() {
    this._deactivated = true;
  }

  /**
   * Reactivate state
   * @internal Called by framework
   */
  _reactivate() {
    this._deactivated = false;
  }

  /**
   * Update widget reference
   * @internal Called by framework
   */
  get widget() { return this._widget; }


  reassemble() { }

  /**
   * Mark state lifecycle as ready after initState
   * @internal Called by framework
   */
  _markInitStateComplete() {
    this._didInitState = true;
  }

  // =========================================================================
  // DEBUGGING & DIAGNOSTICS
  // =========================================================================

  /**
   * Short string representation
   */
  toStringShort() {
    return `${this._debugLabel}#${this._hashCode()}`;
  }

  /**
   * Fill debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);

    if (process.env.NODE_ENV === 'development') {
      properties.push({ name: 'lifecycle', value: this._debugLifecycleState });
      properties.push({ name: 'mounted', value: this.mounted });

      if (this._widget) {
        properties.push({ name: 'widget', value: this._widget.constructor.name });
      }

      if (this._element) {
        properties.push({ name: 'depth', value: this._element._depth });
      }

      properties.push({
        name: 'queuedUpdates',
        value: this._stateUpdateQueue.length
      });
    }
  }

  /**
   * Hash code for debugging
   */
  _hashCode() {
    return Math.abs(
      this.constructor.name
        .split('')
        .reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0)
    )
      .toString(16)
      .slice(0, 5);
  }

  /**
   * Get complete debug info
   */
  debugInfo() {
    const info = super.debugInfo();
    return {
      ...info,
      lifecycle: this._debugLifecycleState,
      mounted: this.mounted,
      widget: this._widget?.constructor?.name,
      depth: this._element?._depth,
      hasQueuedUpdates: this._stateUpdateQueue.length > 0
    };
  }
}



export function StateOf(WidgetClass) {
  class TypedState extends State {
    constructor() {
      super();
      // runtime check – useful for dev tools
      this._expectedWidgetType = WidgetClass;
    }
    // override widget getter to enforce type (dev only)
    get widget() {
      const w = super.widget;
      if (process.env.NODE_ENV === 'development' && w?.constructor !== this._expectedWidgetType) {
        console.warn(`State expected ${this._expectedWidgetType.name} but got ${w?.constructor.name}`);
      }
      return w;
    }
  }
  TypedState._widgetType = WidgetClass;
  return TypedState;
}

export { State, StateLifecycle };