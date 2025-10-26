

// ============================================================================
// 6. STATE CLASS - Base class for stateful widget state
// ============================================================================
class State {
  constructor() {
    this.widget = null;
    this._element = null;
    this._mounted = false;
    this._didInitState = false;
    this._deactivated = false;
  }

  get mounted() {
    return this._mounted && !this._deactivated;
  }

  get context() {
    if (!this._element) {
      throw new Error('State context accessed before mount');
    }
    return this._element.context;
  }

  /**
   * Initialize state - called once when widget is first created
   */
  initState() {}

  /**
   * Called when widget configuration changes
   */
  didUpdateWidget(oldWidget) {}

  /**
   * Called when dependencies change
   */
  didChangeDependencies() {}

  /**
   * Called when widget is removed from tree
   */
  deactivate() {}

  /**
   * Called when widget is permanently removed
   */
  dispose() {}

  /**
   * Build the widget
   */
  build(context) {
    throw new Error(`${this.constructor.name}.build() must be implemented`);
  }

  /**
   * Update state and trigger rebuild
   */
  setState(fn) {
    if (!this.mounted) {
      throw new Error(
        `setState() called on unmounted ${this.widget?.constructor?.name ?? 'Unknown'}`
      );
    }

    // Execute updater synchronously
    if (typeof fn === 'function') {
      fn.call(this);
    }

    // Mark element as needing rebuild
    this._element?.markNeedsBuild();
  }
}

 export default { State };