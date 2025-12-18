/**
 * FlutterJS Update Batcher
 * 
 * Batches multiple setState calls into single update cycle.
 * Improves performance by:
 * - Preventing redundant rebuilds
 * - Batching DOM updates
 * - Reducing layout thrashing
 * 
 * Strategy:
 * 1. Collect setState calls into queue
 * 2. Flush on microtask (Promise.resolve)
 * 3. Apply all updates to state
 * 4. Trigger single rebuild per element
 * 5. Merge all patches before DOM update
 */


class UpdateBatcher {
  constructor(runtime) {
    if (!runtime) {
      throw new Error('Runtime instance is required for UpdateBatcher');
    }
    
    this.runtime = runtime;
    
    // Pending updates queue
    this.pendingUpdates = new Map();    // element → updateFn[]
    this.updateScheduled = false;       // Is flush scheduled?
    
    // Configuration
    this.config = {
      enableBatching: true,
      flushOnMicrotask: true,
      maxBatchSize: 100,
      debugMode: false
    };
    
    // Statistics
    this.stats = {
      totalBatches: 0,
      totalUpdates: 0,
      updatesInLastBatch: 0,
      averageUpdatesPerBatch: 0,
      batchesSinceStart: 0,
      largestBatchSize: 0,
      flushScheduledCount: 0
    };
    
    // Timing
    this.lastFlushTime = 0;
    this.lastFlushDuration = 0;
  }
  
  /**
   * Queue a state update
   * @param {Element} element - Element being updated
   * @param {Function} updateFn - State update function
   * @throws {Error} If element or updateFn invalid
   */
  queueUpdate(element, updateFn) {
    // Validation
    if (!element) {
      throw new Error('Element is required for queueUpdate');
    }
    
    if (typeof updateFn !== 'function') {
      throw new Error('Update function must be a function');
    }
    
    // Check if batching disabled
    if (!this.config.enableBatching) {
      // Execute immediately
      try {
        updateFn.call(element.state);
      } catch (error) {
        console.error('[UpdateBatcher] Immediate update failed:', error);
      }
      element.markNeedsBuild();
      return;
    }
    
    // Initialize update list for element if needed
    if (!this.pendingUpdates.has(element)) {
      this.pendingUpdates.set(element, []);
    }
    
    const updates = this.pendingUpdates.get(element);
    
    // Check batch size limit
    if (updates.length >= this.config.maxBatchSize) {
      if (this.config.debugMode) {
        console.warn(
          `[UpdateBatcher] Max batch size (${this.config.maxBatchSize}) ` +
          `reached for element ${element.id}`
        );
      }
    }
    
    // Add update to queue
    updates.push(updateFn);
    
    // Schedule flush if not already scheduled
    if (!this.updateScheduled) {
      this.scheduleFlush();
    }
    
    if (this.config.debugMode) {
      console.log(
        `[UpdateBatcher] Queued update for ${element.id} ` +
        `(${updates.length} pending)`
      );
    }
  }
  
  /**
   * Schedule flush on next microtask
   * Uses Promise for fast microtask execution
   */
  scheduleFlush() {
    if (this.updateScheduled) {
      return;
    }
    
    this.updateScheduled = true;
    this.stats.flushScheduledCount++;
    
    // Use microtask queue (faster than requestAnimationFrame)
    Promise.resolve().then(() => {
      this.flush();
    });
    
    if (this.config.debugMode) {
      console.log('[UpdateBatcher] Flush scheduled');
    }
  }
  
  /**
   * Flush all pending updates
   * Process all queued setState calls
   */
  flush() {
    if (!this.updateScheduled) {
      return; // Already flushed
    }
    
    this.updateScheduled = false;
    
    const startTime = performance.now();
    
    try {
      // Get all pending updates
      const entries = Array.from(this.pendingUpdates.entries());
      
      if (entries.length === 0) {
        if (this.config.debugMode) {
          console.log('[UpdateBatcher] Flush called but no pending updates');
        }
        return;
      }
      
      let totalUpdates = 0;
      
      // Process each element's updates
      for (const [element, updateFns] of entries) {
        // Skip unmounted elements
        if (!element.mounted) {
          if (this.config.debugMode) {
            console.warn(
              `[UpdateBatcher] Skipping unmounted element ${element.id}`
            );
          }
          this.pendingUpdates.delete(element);
          continue;
        }
        
        // Skip elements without state
        if (!element.state) {
          if (this.config.debugMode) {
            console.warn(
              `[UpdateBatcher] Skipping element without state: ${element.id}`
            );
          }
          this.pendingUpdates.delete(element);
          continue;
        }
        
        // Apply all updates to state
        for (const updateFn of updateFns) {
          try {
            updateFn.call(element.state);
            totalUpdates++;
          } catch (error) {
            console.error(
              `[UpdateBatcher] Update function failed for ${element.id}:`,
              error
            );
            // Continue with next update
          }
        }
        
        // Mark element for rebuild (only once per element)
        if (!element.dirty) {
          element.markNeedsBuild();
        }
      }
      
      // Clear pending updates
      this.pendingUpdates.clear();
      
      // Update statistics
      this.recordFlush(totalUpdates, entries.length);
      
      const flushDuration = performance.now() - startTime;
      this.lastFlushDuration = flushDuration;
      this.lastFlushTime = Date.now();
      
      if (this.config.debugMode) {
        console.log(
          `[UpdateBatcher] Flushed ${totalUpdates} updates ` +
          `(${entries.length} elements) in ${flushDuration.toFixed(2)}ms`
        );
      }
      
      // Warn if flush took too long
      if (flushDuration > 16.67) { // 60 FPS target
        console.warn(
          `[UpdateBatcher] Slow flush: ${flushDuration.toFixed(2)}ms ` +
          `(${totalUpdates} updates, ${entries.length} elements)`
        );
      }
    } catch (error) {
      console.error('[UpdateBatcher] Flush failed:', error);
    }
  }
  
  /**
   * Record flush statistics
   * @param {number} updateCount - Number of updates applied
   * @param {number} elementCount - Number of elements updated
   */
  recordFlush(updateCount, elementCount) {
    this.stats.totalBatches++;
    this.stats.batchesSinceStart++;
    this.stats.totalUpdates += updateCount;
    this.stats.updatesInLastBatch = updateCount;
    
    if (updateCount > this.stats.largestBatchSize) {
      this.stats.largestBatchSize = updateCount;
    }
    
    // Calculate average
    if (this.stats.totalBatches > 0) {
      this.stats.averageUpdatesPerBatch =
        this.stats.totalUpdates / this.stats.totalBatches;
    }
  }
  
  /**
   * Clear pending updates for specific element
   * @param {Element} element - Element to clear (optional)
   */
  clear(element) {
    if (element) {
      // Clear specific element
      this.pendingUpdates.delete(element);
      
      if (this.config.debugMode) {
        console.log(`[UpdateBatcher] Cleared updates for ${element.id}`);
      }
    } else {
      // Clear all
      const count = this.pendingUpdates.size;
      this.pendingUpdates.clear();
      
      if (this.config.debugMode) {
        console.log(`[UpdateBatcher] Cleared all pending updates (${count})`);
      }
    }
  }
  
  /**
   * Get pending update count
   * @param {Element} element - Optional, get count for specific element
   * @returns {number}
   */
  getPendingCount(element) {
    if (element) {
      const updates = this.pendingUpdates.get(element);
      return updates ? updates.length : 0;
    }
    
    let total = 0;
    this.pendingUpdates.forEach(updates => {
      total += updates.length;
    });
    return total;
  }
  
  /**
   * Check if update scheduled
   * @returns {boolean}
   */
  isScheduled() {
    return this.updateScheduled;
  }
  
  /**
   * Get batched elements
   * @returns {Element[]}
   */
  getBatchedElements() {
    return Array.from(this.pendingUpdates.keys());
  }
  
  /**
   * Force immediate flush
   * Used for testing or critical updates
   */
  forceFlush() {
    if (this.config.debugMode) {
      console.log('[UpdateBatcher] Force flush triggered');
    }
    
    this.flush();
  }
  
  /**
   * Enable/disable batching
   * @param {boolean} enabled
   */
  setBatchingEnabled(enabled) {
    this.config.enableBatching = enabled;
    
    if (!enabled && this.updateScheduled) {
      // Flush immediately if batching disabled
      this.forceFlush();
    }
  }
  
  /**
   * Set debug mode
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this.config.debugMode = enabled;
  }
  
  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      pendingElements: this.pendingUpdates.size,
      totalPendingUpdates: this.getPendingCount(),
      updateScheduled: this.updateScheduled,
      lastFlushTime: this.lastFlushTime,
      lastFlushDuration: this.lastFlushDuration
    };
  }
  
  /**
   * Get detailed report
   * @returns {Object}
   */
  getDetailedReport() {
    const elements = this.getBatchedElements();
    const elementDetails = elements.map(el => ({
      id: el.id,
      type: el.constructor.name,
      pendingUpdates: this.getPendingCount(el),
      mounted: el.mounted,
      depth: el.depth
    }));
    
    return {
      stats: this.getStats(),
      batchedElements: elementDetails,
      config: this.config,
      timestamp: Date.now()
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalBatches: 0,
      totalUpdates: 0,
      updatesInLastBatch: 0,
      averageUpdatesPerBatch: 0,
      batchesSinceStart: 0,
      largestBatchSize: 0,
      flushScheduledCount: 0
    };
  }
  
  /**
   * Dispose batcher
   */
  dispose() {
    // Force final flush
    if (this.updateScheduled) {
      this.forceFlush();
    }
    
    this.clear();
    this.runtime = null;
    
    if (this.config.debugMode) {
      console.log('[UpdateBatcher] Disposed');
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpdateBatcher };
}
