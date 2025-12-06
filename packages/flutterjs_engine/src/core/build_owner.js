class BuildOwner {
  constructor() {
    this._globalKeyRegistry = new Map();
    this._dirtyElements = new Set();
    this._inactiveElements = new Set();
    this._buildScheduled = false;
    this._building = false;
    this._focusManager = new FocusManager();
  }

  get focusManager() {
    return this._focusManager;
  }

  registerGlobalKey(key, element) {
    if (this._globalKeyRegistry.has(key)) {
      const oldElement = this._globalKeyRegistry.get(key);
      if (oldElement !== element) {
        throw new Error(
          `Multiple widgets used the same GlobalKey: ${key}\n` +
          `First element: ${oldElement.widget.constructor.name}\n` +
          `Second element: ${element.widget.constructor.name}`
        );
      }
    }
    this._globalKeyRegistry.set(key, element);
  }

  unregisterGlobalKey(key) {
    this._globalKeyRegistry.delete(key);
  }

  getElementByGlobalKey(key) {
    return this._globalKeyRegistry.get(key) || null;
  }

  scheduleBuildFor(element) {
    this._dirtyElements.add(element);
    this._scheduleBuild();
  }

  _scheduleBuild() {
    if (this._buildScheduled) return;

    this._buildScheduled = true;

    Promise.resolve().then(() => {
      this._buildScheduled = false;
      this._processDirtyElements();
    });
  }

  _processDirtyElements() {
    if (this._dirtyElements.size === 0) return;

    this._building = true;

    try {
      const elements = Array.from(this._dirtyElements);
      this._dirtyElements.clear();

      // Sort by depth to build ancestors first
      elements.sort((a, b) => a._depth - b._depth);

      for (const element of elements) {
        if (element._mounted && !element._deactivated) {
          try {
            element.context._markBuildStart();
            element.performRebuild();
            element.context._markBuildEnd();
          } catch (error) {
            console.error(
              `Build error in ${element.widget.constructor.name}:`,
              error
            );
          }
        }
      }
    } finally {
      this._building = false;
    }
  }

  finalizeTree() {
    // Clean up inactive elements
    for (const element of this._inactiveElements) {
      try {
        element.unmount();
      } catch (error) {
        console.error('Error unmounting element:', error);
      }
    }
    this._inactiveElements.clear();
  }

  dispose() {
    this._dirtyElements.clear();
    this._inactiveElements.clear();
    this._globalKeyRegistry.clear();
    this._focusManager.dispose();
  }
}

export {BuildOwner};