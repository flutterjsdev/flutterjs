class BuildContext {
  constructor(element) {
    this.element = element;
  }

  get widget() {
    return this.element.widget;
  }

  findAncestorWidgetOfExactType(widgetType) {
    let current = this.element._parent;
    while (current) {
      if (current.widget instanceof widgetType) {
        return current.widget;
      }
      current = current._parent;
    }
    return null;
  }
}
export { BuildContext };
