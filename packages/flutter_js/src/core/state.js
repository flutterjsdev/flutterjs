class State {
  constructor() {
    this.widget = null;
    this._element = null;
    this._mounted = false;
    this._didInitState = false;
  }

  get mounted() {
    return this._mounted;
  }

  get context() {
    return this._element?.context;
  }

  setState(fn) {
    if (!this._mounted) {
      console.warn(`setState() called on unmounted ${this.widget?.constructor.name}`);
      return;
    }

    // Execute updater immediately (synchronously)
    if (typeof fn === 'function') {
      fn();
    }

    // Schedule rebuild through scheduler
    this._element?.markNeedsBuild();
  }

  initState() {}
  didChangeDependencies() {}
  didUpdateWidget(oldWidget) {}
  dispose() {}
  build(context) {
    throw new Error(`${this.constructor.name}.build() must be implemented`);
  }
}
