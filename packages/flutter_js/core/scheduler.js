class FrameworkScheduler {
  static {
    this._dirty = new Set();
    this._frameScheduled = false;
    this._updating = false;
  }

  static markDirty(element) {
    this._dirty.add(element);
    this._scheduleFrame();
  }

  static _scheduleFrame() {
    if (!this._frameScheduled) {
      this._frameScheduled = true;
      requestAnimationFrame(() => this._processFrame());
    }
  }

  static _processFrame() {
    this._frameScheduled = false;
    this._updating = true;

    // Rebuild dirty elements
    const elements = Array.from(this._dirty).sort((a, b) => {
      return (a._depth || 0) - (b._depth || 0); // Breadth-first
    });

    this._dirty.clear();

    elements.forEach(element => {
      try {
        element.performRebuild();
      } catch (error) {
        console.error('Rebuild failed:', error);
      }
    });

    this._updating = false;
  }

  static isUpdating() {
    return this._updating;
  }
}