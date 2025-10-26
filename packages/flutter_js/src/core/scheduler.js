class FrameworkScheduler {
  static {
    this._dirty = new Set();
    this._frameScheduled = false;
    this._updating = false;
    this._buildOrder = []; // Cache for depth-first rebuilds
    this._metrics = {
      rebuildsPerFrame: 0,
      totalFrames: 0,
      maxElementsPerFrame: 0
    };
  }

  static markDirty(element) {
    // Don't re-add if already scheduling
    if (this._dirty.has(element)) {
      return;
    }

    this._dirty.add(element);
    this._scheduleFrame();
  }

  static _scheduleFrame() {
    if (!this._frameScheduled) {
      this._frameScheduled = true;
      requestAnimationFrame((timestamp) => this._processFrame(timestamp));
    }
  }

  static _processFrame(timestamp) {
    this._frameScheduled = false;
    this._updating = true;

    try {
      // Build rebuild order - breadth-first traversal by depth
      const elements = Array.from(this._dirty);
      
      // Sort by depth for efficient rebuilds (parents before children)
      elements.sort((a, b) => {
        const depthA = this._calculateDepth(a);
        const depthB = this._calculateDepth(b);
        return depthA - depthB;
      });

      const count = this._dirty.size;
      this._dirty.clear();

      // Process all dirty elements
      elements.forEach(element => {
        try {
          if (element._mounted) {
            element.performRebuild();
          }
        } catch (error) {
          console.error(`Rebuild failed for ${element.widget?.constructor.name}:`, error);
          // Continue processing other elements on error
        }
      });

      // Update metrics
      this._metrics.rebuildsPerFrame = count;
      this._metrics.totalFrames++;
      this._metrics.maxElementsPerFrame = Math.max(
        this._metrics.maxElementsPerFrame,
        count
      );

    } finally {
      this._updating = false;
    }
  }

  static _calculateDepth(element) {
    // Traverse up to root and count depth
    let depth = 0;
    let current = element._parent;
    
    while (current) {
      depth++;
      current = current._parent;
    }
    
    return depth;
  }

  static isUpdating() {
    return this._updating;
  }

  // Debug/Performance utilities
  static getMetrics() {
    return { ...this._metrics };
  }

  static resetMetrics() {
    this._metrics = {
      rebuildsPerFrame: 0,
      totalFrames: 0,
      maxElementsPerFrame: 0
    };
  }

  static getPendingUpdates() {
    return this._dirty.size;
  }

  static flush() {
    // Immediately process all pending updates (for testing)
    if (this._frameScheduled) {
      cancelAnimationFrame(this._frameScheduled);
      this._frameScheduled = false;
      this._processFrame(performance.now());
    }
  }
}

export { FrameworkScheduler };