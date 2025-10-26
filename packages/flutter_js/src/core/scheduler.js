// ============================================================================
// 0. POLYFILLS - Browser API compatibility
// ============================================================================

/**
 * Get global object (works in browser and Node.js)
 */
const getGlobal = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof global !== 'undefined') return global;
  if (typeof window !== 'undefined') return window;
  return {};
};

const GLOBAL = getGlobal();

/**
 * requestAnimationFrame polyfill
 */
const requestAnimationFrame = (() => {
  if (GLOBAL.requestAnimationFrame) {
    return GLOBAL.requestAnimationFrame.bind(GLOBAL);
  }
  
  // Node.js fallback
  let lastTime = 0;
  return (callback) => {
    const currentTime = Date.now();
    const delay = Math.max(0, 16 - (currentTime - lastTime));
    lastTime = currentTime + delay;
    return setTimeout(callback, delay);
  };
})();

/**
 * cancelAnimationFrame polyfill
 */
const cancelAnimationFrame = (() => {
  if (GLOBAL.cancelAnimationFrame) {
    return GLOBAL.cancelAnimationFrame.bind(GLOBAL);
  }
  return clearTimeout;
})();
// ============================================================================
// 7. FRAMEWORK SCHEDULER - Manages element updates (layout, paint, rebuild)
// ============================================================================
class FrameworkScheduler {
  static {
    this._dirtyElements = new Set();
    this._dirtyBuildElements = new Set();
    this._frameScheduled = false;
    this._updating = false;
    this._microtaskScheduled = false;
    
    // Performance metrics
    this._metrics = {
      totalFrames: 0,
      totalUpdates: 0,
      maxUpdatesPerFrame: 0,
      averageUpdatesPerFrame: 0,
      frameTimings: [],
      lastFrameTime: 0
    };
    
    // Configuration
    this._config = {
      debugMode: false,
      maxFrameTime: 16.67, // 60 FPS target
      batchMicrotasks: true
    };
  }

  /**
   * Mark an element as needing rebuild
   */
  static markNeedsBuild(element) {
    if (!element || !element._mounted) {
      return;
    }

    // Avoid duplicates
    if (this._dirtyBuildElements.has(element)) {
      return;
    }

    this._dirtyBuildElements.add(element);
    this._scheduleBuild();
  }

  /**
   * Mark an element as needing layout
   */
  static markNeedsLayout(element) {
    if (!element || !element._mounted) {
      return;
    }

    if (this._dirtyElements.has(element)) {
      return;
    }

    this._dirtyElements.add(element);
    this._scheduleFrame();
  }

  /**
   * Schedule a frame using requestAnimationFrame
   */
  static _scheduleFrame() {
    if (!this._frameScheduled) {
      this._frameScheduled = true;
      requestAnimationFrame((timestamp) => this._processFrame(timestamp));
    }
  }

  /**
   * Schedule builds using microtasks for better batching
   */
  static _scheduleBuild() {
    if (!this._microtaskScheduled && this._config.batchMicrotasks) {
      this._microtaskScheduled = true;
      Promise.resolve().then(() => this._processBuild());
    } else {
      this._scheduleFrame();
    }
  }

  /**
   * Process builds (runs before frame)
   */
  static _processBuild() {
    this._microtaskScheduled = false;

    if (this._dirtyBuildElements.size === 0) {
      return;
    }

    this._updating = true;

    try {
      const elements = Array.from(this._dirtyBuildElements);
      this._dirtyBuildElements.clear();

      // Sort by depth (parents before children)
      elements.sort((a, b) => a._depth - b._depth);

      // Rebuild all elements
      for (const element of elements) {
        try {
          if (element._mounted) {
            element.performRebuild();
          }
        } catch (error) {
          console.error(
            `Rebuild error in ${element.widget?.constructor?.name || 'Unknown'}:`,
            error
          );
        }
      }
    } finally {
      this._updating = false;
    }
  }

  /**
   * Process frame (layout and paint)
   */
  static _processFrame(timestamp) {
    this._frameScheduled = false;
    const frameStart = performance.now();

    try {
      this._updating = true;

      // Process layout updates
      const layoutElements = Array.from(this._dirtyElements);
      this._dirtyElements.clear();

      // Sort by depth
      layoutElements.sort((a, b) => a._depth - b._depth);

      // Perform layout
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

      // Update metrics
      const frameTime = performance.now() - frameStart;
      const updateCount = layoutElements.length;
      
      this._metrics.totalFrames++;
      this._metrics.totalUpdates += updateCount;
      this._metrics.maxUpdatesPerFrame = Math.max(
        this._metrics.maxUpdatesPerFrame,
        updateCount
      );
      this._metrics.averageUpdatesPerFrame = 
        this._metrics.totalUpdates / this._metrics.totalFrames;
      this._metrics.frameTimings.push(frameTime);
      this._metrics.lastFrameTime = frameTime;

      // Keep last 100 frame timings
      if (this._metrics.frameTimings.length > 100) {
        this._metrics.frameTimings.shift();
      }

      if (this._config.debugMode && frameTime > this._config.maxFrameTime) {
        console.warn(
          `⚠️ Frame took ${frameTime.toFixed(2)}ms (${updateCount} updates) - exceeds 60fps target`
        );
      }

    } finally {
      this._updating = false;
    }

    // Schedule next frame if there are pending updates
    if (this._dirtyElements.size > 0 || this._dirtyBuildElements.size > 0) {
      this._scheduleFrame();
    }
  }

  /**
   * Check if scheduler is currently updating
   */
  static isUpdating() {
    return this._updating;
  }

  /**
   * Check if there are pending updates
   */
  static hasPendingUpdates() {
    return this._dirtyElements.size > 0 || this._dirtyBuildElements.size > 0;
  }

  /**
   * Get pending build count
   */
  static getPendingBuildCount() {
    return this._dirtyBuildElements.size;
  }

  /**
   * Get pending layout count
   */
  static getPendingLayoutCount() {
    return this._dirtyElements.size;
  }

  /**
   * Get performance metrics
   */
  static getMetrics() {
    return {
      ...this._metrics,
      averageFrameTime: this._metrics.frameTimings.length > 0
        ? this._metrics.frameTimings.reduce((a, b) => a + b, 0) / this._metrics.frameTimings.length
        : 0
    };
  }

  /**
   * Reset metrics
   */
  static resetMetrics() {
    this._metrics = {
      totalFrames: 0,
      totalUpdates: 0,
      maxUpdatesPerFrame: 0,
      averageUpdatesPerFrame: 0,
      frameTimings: [],
      lastFrameTime: 0
    };
  }

  /**
   * Flush all pending updates synchronously (for testing)
   */
  static flush() {
    while (this.hasPendingUpdates()) {
      if (this._dirtyBuildElements.size > 0) {
        this._processBuild();
      }
      if (this._dirtyElements.size > 0) {
        this._processFrame(performance.now());
      }
    }
  }

  /**
   * Set debug mode
   */
  static setDebugMode(enabled) {
    this._config.debugMode = enabled;
  }

  /**
   * Print debug info
   */
  static debugPrint() {
    const metrics = this.getMetrics();
    console.group('🔧 FrameworkScheduler Metrics');
    console.table({
      'Total Frames': metrics.totalFrames,
      'Total Updates': metrics.totalUpdates,
      'Max Updates/Frame': metrics.maxUpdatesPerFrame,
      'Avg Updates/Frame': metrics.averageUpdatesPerFrame.toFixed(2),
      'Avg Frame Time (ms)': metrics.averageFrameTime.toFixed(2),
      'Last Frame Time (ms)': metrics.lastFrameTime.toFixed(2),
      'Pending Updates': this.getPendingBuildCount() + this.getPendingLayoutCount()
    });
    console.groupEnd();
  }
}

export { FrameworkScheduler };