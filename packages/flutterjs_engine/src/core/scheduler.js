const getGlobal = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof global !== 'undefined') return global;
  if (typeof window !== 'undefined') return window;
  return {};
};

const GLOBAL = getGlobal();

const requestAnimationFrame = (() => {
  if (GLOBAL.requestAnimationFrame) {
    return GLOBAL.requestAnimationFrame.bind(GLOBAL);
  }
  
  let lastTime = 0;
  return (callback) => {
    const currentTime = Date.now();
    const delay = Math.max(0, 16 - (currentTime - lastTime));
    lastTime = currentTime + delay;
    return setTimeout(callback, delay);
  };
})();

const cancelAnimationFrame = (() => {
  if (GLOBAL.cancelAnimationFrame) {
    return GLOBAL.cancelAnimationFrame.bind(GLOBAL);
  }
  return clearTimeout;
})();

class FrameworkScheduler {
  static {
    this._dirtyBuildElements = new Set();
    this._dirtyLayoutElements = new Set();
    this._frameScheduled = false;
    this._updating = false;
    this._microtaskScheduled = false;
    
    this._metrics = {
      totalFrames: 0,
      totalBuilds: 0,
      totalLayouts: 0,
      maxBuildsPerFrame: 0,
      maxLayoutsPerFrame: 0,
      frameTimings: []
    };
    
    this._config = {
      debugMode: false,
      maxFrameTime: 16.67,
      batchMicrotasks: true,
      debugElements: new Map()
    };
  }

  static markNeedsBuild(element) {
    if (!element || !element._mounted) {
      return;
    }

    if (this._dirtyBuildElements.has(element)) {
      return;
    }

    this._dirtyBuildElements.add(element);

    if (this._config.debugMode) {
      const info = this._config.debugElements.get(element.widget.constructor.name) || { builds: 0 };
      info.builds = (info.builds || 0) + 1;
      this._config.debugElements.set(element.widget.constructor.name, info);
    }

    this._scheduleBuild();
  }

  static markNeedsLayout(element) {
    if (!element || !element._mounted) {
      return;
    }

    if (this._dirtyLayoutElements.has(element)) {
      return;
    }

    this._dirtyLayoutElements.add(element);
    this._scheduleFrame();
  }

  static _scheduleFrame() {
    if (!this._frameScheduled) {
      this._frameScheduled = true;
      requestAnimationFrame((timestamp) => this._processFrame(timestamp));
    }
  }

  static _scheduleBuild() {
    if (!this._microtaskScheduled && this._config.batchMicrotasks) {
      this._microtaskScheduled = true;
      Promise.resolve().then(() => this._processBuild());
    } else {
      this._scheduleFrame();
    }
  }

  static _processBuild() {
    this._microtaskScheduled = false;

    if (this._dirtyBuildElements.size === 0) {
      return;
    }

    this._updating = true;

    try {
      const elements = Array.from(this._dirtyBuildElements);
      this._dirtyBuildElements.clear();

      elements.sort((a, b) => a._depth - b._depth);

      for (const element of elements) {
        try {
          if (element._mounted) {
            element.context._markBuildStart();
            element.performRebuild();
            element.context._markBuildEnd();
          }
        } catch (error) {
          element.context._markBuildEnd();
          console.error(
            `Build error in ${element.widget?.constructor?.name || 'Unknown'}:`,
            error
          );
        }
      }

      this._metrics.totalBuilds += elements.length;
      this._metrics.maxBuildsPerFrame = Math.max(
        this._metrics.maxBuildsPerFrame,
        elements.length
      );

    } finally {
      this._updating = false;
    }
  }

  static _processFrame(timestamp) {
    this._frameScheduled = false;
    const frameStart = performance.now();

    try {
      this._updating = true;

      const layoutElements = Array.from(this._dirtyLayoutElements);
      this._dirtyLayoutElements.clear();

      layoutElements.sort((a, b) => a._depth - b._depth);

      for (const element of layoutElements) {
        try {
          if (element._mounted && element.performLayout) {
            element.performLayout();
          }
        } catch (error) {
          console.error(
            `Layout error in ${element.widget?.constructor?.name || 'Unknown'}:`,
            error
          );
        }
      }

      const frameTime = performance.now() - frameStart;
      
      this._metrics.totalFrames++;
      this._metrics.totalLayouts += layoutElements.length;
      this._metrics.maxLayoutsPerFrame = Math.max(
        this._metrics.maxLayoutsPerFrame,
        layoutElements.length
      );
      this._metrics.frameTimings.push(frameTime);

      if (this._metrics.frameTimings.length > 100) {
        this._metrics.frameTimings.shift();
      }

      if (this._config.debugMode && frameTime > this._config.maxFrameTime) {
        console.warn(
          `⚠️ Frame took ${frameTime.toFixed(2)}ms (${layoutElements.length} layouts)`
        );
      }

    } finally {
      this._updating = false;
    }

    if (this._dirtyLayoutElements.size > 0 || this._dirtyBuildElements.size > 0) {
      this._scheduleFrame();
    }
  }

  static isUpdating() {
    return this._updating;
  }

  static hasPendingUpdates() {
    return this._dirtyLayoutElements.size > 0 || this._dirtyBuildElements.size > 0;
  }

  static getPendingBuildCount() {
    return this._dirtyBuildElements.size;
  }

  static getPendingLayoutCount() {
    return this._dirtyLayoutElements.size;
  }

  static getMetrics() {
    const timings = this._metrics.frameTimings;
    return {
      ...this._metrics,
      averageFrameTime: timings.length > 0
        ? timings.reduce((a, b) => a + b, 0) / timings.length
        : 0,
      averageBuildsPerFrame: this._metrics.totalFrames > 0
        ? this._metrics.totalBuilds / this._metrics.totalFrames
        : 0,
      averageLayoutsPerFrame: this._metrics.totalFrames > 0
        ? this._metrics.totalLayouts / this._metrics.totalFrames
        : 0
    };
  }

  static resetMetrics() {
    this._metrics = {
      totalFrames: 0,
      totalBuilds: 0,
      totalLayouts: 0,
      maxBuildsPerFrame: 0,
      maxLayoutsPerFrame: 0,
      frameTimings: []
    };
    this._config.debugElements.clear();
  }

  static flush() {
    while (this.hasPendingUpdates()) {
      if (this._dirtyBuildElements.size > 0) {
        this._processBuild();
      }
      if (this._dirtyLayoutElements.size > 0) {
        this._processFrame(performance.now());
      }
    }
  }

  static setDebugMode(enabled) {
    this._config.debugMode = enabled;
  }

  static getDebugElements() {
    return Array.from(this._config.debugElements.entries()).map(([name, info]) => ({
      name,
      ...info
    }));
  }

  static debugPrint() {
    const metrics = this.getMetrics();
    console.group('🔧 FrameworkScheduler');
    console.table({
      'Total Frames': metrics.totalFrames,
      'Total Builds': metrics.totalBuilds,
      'Total Layouts': metrics.totalLayouts,
      'Avg Builds/Frame': metrics.averageBuildsPerFrame.toFixed(2),
      'Avg Layouts/Frame': metrics.averageLayoutsPerFrame.toFixed(2),
      'Max Builds/Frame': metrics.maxBuildsPerFrame,
      'Max Layouts/Frame': metrics.maxLayoutsPerFrame,
      'Avg Frame Time (ms)': metrics.averageFrameTime.toFixed(2),
      'Pending Updates': this.getPendingBuildCount() + this.getPendingLayoutCount()
    });

    if (this._config.debugMode && this._config.debugElements.size > 0) {
      console.log('Element Updates:');
      console.table(this.getDebugElements());
    }

    console.groupEnd();
  }
}

export { FrameworkScheduler };