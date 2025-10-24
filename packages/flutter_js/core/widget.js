class Widget {
  constructor(key = null) {
    this.key = key;
    this._context = null;
    this._element = null;
    this._mounted = false;
  }

  createElement() {
    throw new Error('createElement() must be implemented');
  }

  build(context) {
    throw new Error('build(context) must be implemented');
  }

  // Lifecycle hooks
  initState() {}
  didChangeDependencies() {}
  didUpdateWidget(oldWidget) {}
  dispose() {}

  // Internal
  _mount(context) {
    this._context = context;
    this._mounted = true;
    this.initState();
  }

  _unmount() {
    this.dispose();
    this._mounted = false;
  }
}

class StatelessWidget extends Widget {
  // Pure function of props
  // Re-renders when parent triggers rebuild or props change
  render(context) {
    const vnode = this.build(context);
    return vnode;
  }
}

class StatefulWidget extends Widget {
  constructor(props = {}) {
    super(props.key);
    this.props = props;
    this._state = null;
  }

  createElement() {
    const element = new StatefulElement(this);
    return element;
  }

  createState() {
    throw new Error('createState() must be implemented');
  }
}

class State {
  constructor() {
    this.widget = null;
    this._context = null;
    this._mounted = false;
    this._updateScheduled = false;
  }

  // THE setState - Flutter's signature API
  setState(updater) {
    if (!this._mounted) {
      console.warn('setState() called on unmounted widget');
      return;
    }

    if (typeof updater === 'function') {
      updater();
    }

    this._scheduleRebuild();
  }

  _scheduleRebuild() {
    if (!this._updateScheduled) {
      this._updateScheduled = true;
      FrameworkScheduler.scheduleRebuild(this);
    }
  }

  initState() {}
  didChangeDependencies() {}
  didUpdateWidget(oldWidget) {}
  dispose() {}

  build(context) {
    throw new Error('State.build(context) must be implemented');
  }
}

class StatefulElement extends Element {
  constructor(widget) {
    super(widget);
    this.state = widget.createState();
    this.state.widget = widget;
    this.state._context = this.context;
  }

  performRebuild() {
    const vnode = this.state.build(this.state._context);
    this._updateChild(vnode);
  }

  dispose() {
    this.state.dispose();
    super.dispose();
  }
}