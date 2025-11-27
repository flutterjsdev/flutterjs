import { Element } from './widget.js';
class ProxyElement extends Element {
  constructor(widget) {
    super(widget);
    this._child = null;
  }

  performRebuild() {
    const childWidget = this.widget.child;
    this._child = this._inflateWidget(childWidget);
    return this._child;
  }

  _inflateWidget(widget) {
    if (!widget) return null;

    const element = widget.createElement();
    element.mount(this);
    return element.performRebuild();
  }

  visitChildren(visitor) {
    if (this._child) {
      visitor(this._child);
    }
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'hasChild', value: !!this._child });
  }
}

class InheritedElement extends ProxyElement {
  constructor(widget) {
    super(widget);
    this._dependents = new Map();
  }

  addDependent(element) {
    this._dependents.set(element, true);
  }

  removeDependent(element) {
    this._dependents.delete(element);
  }

  notifyDependents() {
    const oldWidget = this.widget;

    for (const dependent of this._dependents.keys()) {
      if (dependent._mounted && !dependent._deactivated) {
        dependent.didChangeDependencies();
      }
    }
  }


  performRebuild() {
    const result = super.performRebuild();   // <-- child is rebuilt here

    // this._child now holds the *new* child element
    if (this._child && this.widget.updateShouldNotify?.(this._child.widget)) {
      this.notifyDependents();
    }

    return result;
  }
}

class NotificationListenerElement extends ProxyElement {
  performRebuild() {
    const result = super.performRebuild();
    // Notification handling setup
    return result;
  }
}

export {  ProxyElement, InheritedElement, NotificationListenerElement };