import { Diagnosticable } from './widget.js';

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
  }

  get widget() {
    if (!this._widget) {
      throw new Error(`${this._debugLabel}.widget accessed before initialization`);
    }
    return this._widget;
  }

  get context() {
    if (!this._element) {
      throw new Error(
        `${this._debugLabel} context accessed after dispose. ` +
        `Check mounted property before using context.`
      );
    }
    return this._element.context;
  }

  get mounted() {
    if (!this._element) {
      return false;
    }
    return this._mounted && !this._deactivated;
  }

  get debugLifecycleState() {
    return this._debugLifecycleState;
  }

  initState() {}

  didChangeDependencies() {}

  didUpdateWidget(oldWidget) {}

  deactivate() {}

  activate() {}

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
  }

  build(context) {
    throw new Error(`${this._debugLabel}.build() must be implemented`);
  }

  setState(fn) {
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
      if (!this.mounted) {
        return;
      }
    }

    if (typeof fn !== 'function') {
      throw new Error('setState callback must be a function');
    }

    try {
      fn.call(this);
    } catch (error) {
      console.error(`Error in setState callback for ${this._debugLabel}:`, error);
      throw error;
    }

    if (this._element) {
      this._element.markNeedsBuild();
    }
  }

  _mount(element) {
    this._element = element;
    this._mounted = true;
    this._debugLifecycleState = StateLifecycle.ready;
  }

  _unmount() {
    this._mounted = false;
    this._deactivated = false;
  }

  _deactivate() {
    this._deactivated = true;
  }

  _reactivate() {
    this._deactivated = false;
  }

  _updateWidget(newWidget) {
    this._widget = newWidget;
  }

  toStringShort() {
    return `${this._debugLabel}#${this._hashCode()}`;
  }

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
    }
  }

  _hashCode() {
    return Math.abs(this.constructor.name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)).toString(16).slice(0, 5);
  }

  debugInfo() {
    const info = super.debugInfo();
    return {
      ...info,
      lifecycle: this._debugLifecycleState,
      mounted: this.mounted,
      widget: this._widget?.constructor?.name,
      depth: this._element?._depth
    };
  }
}

export { State, StateLifecycle };