import { BuildContext } from '../context/build_context.js';
import { FrameworkScheduler } from '../scheduler/framework_scheduler.js';
class Widget {
  constructor(key = null) {
    if (new.target === Widget) {
      throw new Error('Widget is abstract');
    }
    this.key = key;
  }

  createElement() {
    throw new Error(`${this.constructor.name}.createElement() must be implemented`);
  }

  toStringShort() {
    const type = this.constructor.name;
    return this.key ? `${type}-${this.key}` : type;
  }
}

class Element {
  constructor(widget) {
    this.widget = widget;
    this._parent = null;
    this._children = [];
    this._mounted = false;
    this._depth = 0;
    this.context = new BuildContext(this);
  }

  mount(parent = null) {
    this._parent = parent;
    this._mounted = true;

    // Calculate depth for scheduler optimization
    if (parent) {
      this._depth = (parent._depth || 0) + 1;
    }
  }

  unmount() {
    this._mounted = false;
    this._children.forEach(child => child.unmount());
    this._children = [];
  }

  markNeedsBuild() {
    if (this._mounted && !FrameworkScheduler.isUpdating()) {
      FrameworkScheduler.markDirty(this);
    }
  }

  performRebuild() {
    // Override in subclasses
  }

  dispose() {
    this.unmount();
  }

  static canUpdate(oldWidget, newWidget) {
    return oldWidget?.constructor === newWidget?.constructor &&
      oldWidget?.key === newWidget?.key;
  }
}


class StatefulWidget extends Widget {
  constructor(key = null) {
    super(key);
  }

  createElement() {
    return new StatefulElement(this);
  }

  createState() {
    throw new Error(`${this.constructor.name}.createState() must be implemented`);
  }
}

class StatefulElement extends Element {
  constructor(widget) {
    super(widget);
    this.state = widget.createState();
    this.state._element = this;
  }

  mount(parent = null) {
    super.mount(parent);
    this.state._mounted = true;

    if (!this.state._didInitState) {
      this.state._didInitState = true;
      this.state.initState();
    }

    this.state.didChangeDependencies();
  }

  unmount() {
    this.state.dispose();
    this.state._mounted = false;
    super.unmount();
  }

  performRebuild() {
    this.state.didUpdateWidget(this.widget);
    return this.state.build(this.context);
  }

  updateWidget(newWidget) {
    this.widget = newWidget;
    this.state.widget = newWidget;
    this.markNeedsBuild();
  }
}

class StatelessWidget extends Widget {
  constructor(key = null) {
    super(key);
  }

  createElement() {
    return new StatelessElement(this);
  }

  build(context) {
    throw new Error(`${this.constructor.name}.build() must be implemented`);
  }
}

class StatelessElement extends Element {
  mount(parent = null) {
    super.mount(parent);
  }

  performRebuild() {
    return this.widget.build(this.context);
  }
}

export {
  Widget,
  Element,
  StatefulWidget,
  StatefulElement,
  StatelessWidget,
  StatelessElement
};
