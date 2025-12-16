/**
 * UpdateScheduler - Batches and schedules DOM updates
 * 
 * Coordinates multiple concurrent updates to minimize DOM thrashing and
 * repaints. Automatically batches updates and applies them during
 * requestAnimationFrame for optimal performance.
 * 
 * Features:
 * - Update batching (group multiple updates)
 * - Automatic frame scheduling (requestAnimationFrame)
 * - Priority levels (immediate, normal, deferred)
 * - Concurrent update management
 * - Callback hooks (before/after)
 * - Update queuing and flushing
 * - Performance monitoring
 */

/**
 * Update priority levels
 */
const UpdatePriority = {
  IMMEDIATE: 'immediate',  // Execute immediately (no batching)
  HIGH: 'high',            // Execute in next frame
  NORMAL: 'normal',        // Execute in current or next frame
  LOW: 'low'               // Execute when idle
};

/**
 * Update request object
 */
class UpdateRequest {
  constructor(callback, priority = UpdatePriority.NORMAL, id = null) {
    this.callback = callback;
    this.priority = priority;
    this.id = id || `update-${Date.now()}-${Math.random()}`;
    this.timestamp = Date.now();
    this.attempts = 0;
    this.lastError = null;
  }
}

/**
 * Update batch - groups related updates
 */
class UpdateBatch {
  constructor(batchId = null) {
    this.id = batchId || `batch-${Date.now()}-${Math.random()}`;
    this.updates = [];
    this.createdAt = Date.now();
    this.status = 'pending'; // pending, processing, completed, failed
  }

  add(update) {
    if (!(update instanceof UpdateRequest)) {
      throw new Error('Must add UpdateRequest to batch');
    }
    this.updates.push(update);
  }

  size() {
    return this.updates.length;
  }

  clear() {
    this.updates = [];
  }
}

/**
 * UpdateScheduler - Manages batching and scheduling of updates
 */
class UpdateScheduler {
  constructor(options = {}) {
    // Configuration
    this.maxBatchSize = options.maxBatchSize || 50;
    this.frameDeadline = options.frameDeadline || 5; // ms remaining in frame
    this.enableAutoFlushing = options.enableAutoFlushing !== false;
    this.enablePrioritization = options.enablePrioritization !== false;
    this.enableMetrics = options.enableMetrics !== false;

    // State
    this.queues = new Map([
      [UpdatePriority.IMMEDIATE, []],
      [UpdatePriority.HIGH, []],
      [UpdatePriority.NORMAL, []],
      [UpdatePriority.LOW, []]
    ]);

    this.currentBatch = new UpdateBatch('current');
    this.pendingBatches = [];
    this.isProcessing = false;
    this.frameScheduled = false;

    // Callbacks
    this.onBeforeFlushed = options.onBeforeFlushed || null;
    this.onAfterFlushed = options.onAfterFlushed || null;
    this.onError = options.onError || null;

    // Metrics
    this.metrics = {
      totalUpdates: 0,
      totalBatches: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      skipped: 0
    };

    // Bind methods
    this.flush = this.flush.bind(this);
    this.scheduleFrame = this.scheduleFrame.bind(this);
  }

  /**
   * Schedule an update to be processed
   * @param {Function} callback - Function to execute
   * @param {string} priority - Update priority level
   * @param {string} id - Optional update ID
   * @returns {string} Update ID
   */
  schedule(callback, priority = UpdatePriority.NORMAL, id = null) {
    if (typeof callback !== 'function') {
      throw new Error('Update callback must be a function');
    }

    const update = new UpdateRequest(callback, priority, id);
    const queue = this.queues.get(priority);

    if (!queue) {
      throw new Error(`Invalid priority: ${priority}`);
    }

    // Add to appropriate queue
    queue.push(update);

    // Handle based on priority
    if (priority === UpdatePriority.IMMEDIATE) {
      this.flush([update]);
    } else if (this.enableAutoFlushing && !this.frameScheduled) {
      this.scheduleFrame();
    }

    return update.id;
  }

  /**
   * Schedule multiple updates as a batch
   * @param {Function[]} callbacks - Array of callbacks
   * @param {string} priority - Priority for all updates
   * @returns {string} Batch ID
   */
  scheduleBatch(callbacks, priority = UpdatePriority.NORMAL) {
    if (!Array.isArray(callbacks)) {
      throw new Error('Batch callbacks must be an array');
    }

    const batch = new UpdateBatch();
    callbacks.forEach((callback, index) => {
      const update = new UpdateRequest(callback, priority, `batch-${index}`);
      batch.add(update);
    });

    this.pendingBatches.push(batch);

    if (this.enableAutoFlushing && !this.frameScheduled) {
      this.scheduleFrame();
    }

    return batch.id;
  }

  /**
   * Flush (execute) all scheduled updates
   * @param {UpdateRequest[]} updates - Specific updates to flush (or all)
   * @returns {Object} Flush result
   */
  flush(updates = null) {
    if (this.isProcessing) {
      return { success: false, reason: 'Already processing' };
    }

    const startTime = performance.now();

    try {
      this.isProcessing = true;
      this.frameScheduled = false;

      // Get updates to process
      let toProcess = updates;
      if (!toProcess) {
        toProcess = this.getNextUpdates();
      }

      if (toProcess.length === 0) {
        return { success: true, processed: 0, time: 0 };
      }

      // Call before hook
      if (typeof this.onBeforeFlushed === 'function') {
        try {
          this.onBeforeFlushed(toProcess);
        } catch (error) {
          console.warn('onBeforeFlushed error:', error);
        }
      }

      // Execute updates
      const results = [];
      toProcess.forEach((update) => {
        try {
          update.attempts++;
          update.callback();
          results.push({ id: update.id, success: true });
          this.metrics.totalUpdates++;
        } catch (error) {
          update.lastError = error;
          results.push({ id: update.id, success: false, error });
          this.metrics.errors++;

          // Call error handler
          if (typeof this.onError === 'function') {
            try {
              this.onError(error, update);
            } catch (e) {
              console.error('onError handler error:', e);
            }
          } else {
            console.error('Update error:', error);
          }
        }
      });

      // Call after hook
      if (typeof this.onAfterFlushed === 'function') {
        try {
          this.onAfterFlushed(results);
        } catch (error) {
          console.warn('onAfterFlushed error:', error);
        }
      }

      // Update metrics
      const elapsedTime = performance.now() - startTime;
      this.metrics.totalTime += elapsedTime;
      this.metrics.minTime = Math.min(this.metrics.minTime, elapsedTime);
      this.metrics.maxTime = Math.max(this.metrics.maxTime, elapsedTime);
      this.metrics.averageTime = this.metrics.totalTime / Math.max(1, this.metrics.totalUpdates);
      this.metrics.totalBatches++;

      return {
        success: true,
        processed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        time: elapsedTime
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Schedule flush in next frame
   */
  scheduleFrame() {
    if (this.frameScheduled) {
      return;
    }

    this.frameScheduled = true;

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        this.flush();
      });
    } else {
      // Fallback for non-browser environments
      setTimeout(() => {
        this.flush();
      }, 16); // ~60fps
    }
  }

  /**
   * Get next batch of updates to process
   * @private
   */
  getNextUpdates() {
    const updates = [];

    // Process queues in priority order
    if (this.enablePrioritization) {
      // Process in order: IMMEDIATE, HIGH, NORMAL, LOW
      for (const priority of [
        UpdatePriority.IMMEDIATE,
        UpdatePriority.HIGH,
        UpdatePriority.NORMAL,
        UpdatePriority.LOW
      ]) {
        const queue = this.queues.get(priority);
        while (queue.length > 0 && updates.length < this.maxBatchSize) {
          updates.push(queue.shift());
        }
      }
    } else {
      // Process FIFO across all queues
      while (updates.length < this.maxBatchSize) {
        let found = false;

        for (const queue of this.queues.values()) {
          if (queue.length > 0) {
            updates.push(queue.shift());
            found = true;
            break;
          }
        }

        if (!found) break;
      }
    }

    // Process pending batches
    while (this.pendingBatches.length > 0 && updates.length < this.maxBatchSize) {
      const batch = this.pendingBatches.shift();
      batch.status = 'processing';

      while (batch.updates.length > 0 && updates.length < this.maxBatchSize) {
        updates.push(batch.updates.shift());
      }

      if (batch.updates.length === 0) {
        batch.status = 'completed';
      }
    }

    return updates;
  }

  /**
   * Cancel a scheduled update
   * @param {string} updateId - Update ID to cancel
   * @returns {boolean} Whether update was found and cancelled
   */
  cancel(updateId) {
    for (const queue of this.queues.values()) {
      const index = queue.findIndex(u => u.id === updateId);
      if (index !== -1) {
        queue.splice(index, 1);
        this.metrics.skipped++;
        return true;
      }
    }

    // Try in pending batches
    for (const batch of this.pendingBatches) {
      const index = batch.updates.findIndex(u => u.id === updateId);
      if (index !== -1) {
        batch.updates.splice(index, 1);
        this.metrics.skipped++;
        return true;
      }
    }

    return false;
  }

  /**
   * Cancel all updates in a batch
   * @param {string} batchId - Batch ID to cancel
   * @returns {number} Number of updates cancelled
   */
  cancelBatch(batchId) {
    let cancelled = 0;

    for (const queue of this.queues.values()) {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].id.startsWith(batchId)) {
          queue.splice(i, 1);
          cancelled++;
        }
      }
    }

    for (const batch of this.pendingBatches) {
      for (let i = batch.updates.length - 1; i >= 0; i--) {
        if (batch.updates[i].id.startsWith(batchId)) {
          batch.updates.splice(i, 1);
          cancelled++;
        }
      }
    }

    return cancelled;
  }

  /**
   * Flush all pending updates synchronously
   * @returns {Object} Flush result
   */
  flushAll() {
    let totalResult = {
      success: true,
      totalProcessed: 0,
      totalFailed: 0,
      iterations: 0,
      time: 0
    };

    const startTime = performance.now();

    // Keep flushing until all queues are empty
    while (this.hasUpdates()) {
      const result = this.flush();
      if (!result.success) {
        totalResult.success = false;
        break;
      }

      totalResult.totalProcessed += result.processed;
      totalResult.totalFailed += result.failed;
      totalResult.iterations++;

      // Prevent infinite loops
      if (totalResult.iterations > 1000) {
        totalResult.success = false;
        totalResult.warning = 'Iteration limit reached';
        break;
      }
    }

    totalResult.time = performance.now() - startTime;
    return totalResult;
  }

  /**
   * Check if there are pending updates
   * @returns {boolean}
   */
  hasUpdates() {
    // Check all priority queues
    for (const queue of this.queues.values()) {
      if (queue.length > 0) return true;
    }

    // Check pending batches
    if (this.pendingBatches.length > 0) return true;

    // Check current batch
    if (this.currentBatch.size() > 0) return true;

    return false;
  }

  /**
   * Get number of pending updates
   * @returns {number}
   */
  getPendingCount() {
    let count = 0;

    for (const queue of this.queues.values()) {
      count += queue.length;
    }

    for (const batch of this.pendingBatches) {
      count += batch.size();
    }

    count += this.currentBatch.size();
    return count;
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue stats
   */
  getQueueStats() {
    const stats = {
      total: 0,
      byPriority: {},
      batches: 0
    };

    for (const [priority, queue] of this.queues) {
      stats.byPriority[priority] = queue.length;
      stats.total += queue.length;
    }

    stats.batches = this.pendingBatches.reduce((sum, b) => sum + b.size(), 0);
    stats.total += stats.batches;

    return stats;
  }

  /**
   * Get performance metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      pending: this.getPendingCount(),
      isProcessing: this.isProcessing
    };
  }

  /**
   * Reset all state
   */
  reset() {
    this.queues.forEach(queue => queue.length = 0);
    this.pendingBatches.length = 0;
    this.currentBatch.clear();
    this.isProcessing = false;
    this.frameScheduled = false;

    // Reset metrics
    this.metrics = {
      totalUpdates: 0,
      totalBatches: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      skipped: 0
    };
  }

  /**
   * Clear metrics only
   */
  clearMetrics() {
    this.metrics = {
      totalUpdates: 0,
      totalBatches: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0,
      skipped: 0
    };
  }

  /**
   * Drain all updates and return them without executing
   * @returns {UpdateRequest[]}
   */
  drain() {
    const updates = [];

    for (const queue of this.queues.values()) {
      updates.push(...queue.splice(0));
    }

    for (const batch of this.pendingBatches) {
      updates.push(...batch.updates.splice(0));
    }

    updates.push(...this.currentBatch.updates.splice(0));

    return updates;
  }

  /**
   * Wait for all updates to complete
   * @returns {Promise}
   */
  waitForFlush() {
    return new Promise((resolve) => {
      if (!this.hasUpdates() && !this.isProcessing) {
        resolve(true);
        return;
      }

      const checkComplete = () => {
        if (!this.hasUpdates() && !this.isProcessing) {
          resolve(true);
        } else {
          requestAnimationFrame(checkComplete);
        }
      };

      checkComplete();
    });
  }

  /**
   * Create a priority-based updater
   * Returns a function to easily schedule updates at a specific priority
   * @param {string} priority - Default priority
   * @returns {Function}
   */
  createUpdater(priority = UpdatePriority.NORMAL) {
    return (callback, id = null) => this.schedule(callback, priority, id);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UpdateScheduler,
    UpdateRequest,
    UpdateBatch,
    UpdatePriority
  };
}
if (typeof window !== 'undefined') {
  window.UpdateScheduler = UpdateScheduler;
  window.UpdatePriority = UpdatePriority;
}