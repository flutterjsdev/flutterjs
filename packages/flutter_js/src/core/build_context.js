import { E } from "./math";

class BuildContext {
  constructor(element) {
    this._element = element;
    this._inherited = new Map();
    this._widgets = new Map();
    this._services = new Map();
  }

  get element() {
    return this._element;
  }

  get widget() {
    return this._element?.widget;
  }

  get mounted() {
    return this._element?._mounted ?? false;
  }

  /**
   * Find ancestor widget of exact type
   */
  findAncestorWidgetOfExactType(widgetType) {
    if (!widgetType) {
      throw new Error('widgetType cannot be null');
    }

    let current = this._element._parent;
    while (current) {
      if (current.widget?.constructor === widgetType) {
        return current.widget;
      }
      current = current._parent;
    }
    return null;
  }

  /**
   * Find ancestor widget of type (including subclasses)
   */
  findAncestorWidgetOfType(widgetType) {
    if (!widgetType) {
      throw new Error('widgetType cannot be null');
    }

    let current = this._element._parent;
    while (current) {
      if (current.widget instanceof widgetType) {
        return current.widget;
      }
      current = current._parent;
    }
    return null;
  }

  /**
   * Find ancestor state
   */
  findAncestorStateOfType(stateType) {
    if (!stateType) {
      throw new Error('stateType cannot be null');
    }

    let current = this._element._parent;
    while (current) {
      if (current instanceof StatefulElement && current.state instanceof stateType) {
        return current.state;
      }
      current = current._parent;
    }
    return null;
  }

  /**
   * Request rebuild of this widget
   */
  requestRebuild() {
    this._element?.markNeedsBuild();
  }

  /**
   * Visit ancestor elements
   */
  visitAncestorElements(visitor) {
    let current = this._element._parent;
    while (current) {
      const context = new BuildContext(current);
      if (!visitor(context)) break;
      current = current._parent;
    }
  }

  /**
   * Get widget tree path (debugging)
   */
  getWidgetPath() {
    const path = [];
    let current = this._element;
    while (current) {
      path.unshift(current.widget?.constructor?.name ?? 'Root');
      current = current._parent;
    }
    return path.join(' > ');
  }
}

  export { BuildContext };