/**
 * FlutterJS Memory Manager
 * 
 * Manages memory lifecycle, prevents leaks, and tracks resource usage.
 * 
 * Responsibilities:
 * - Track element references
 * - Manage event listener lifecycle
 * - Monitor VNode references
 * - Detect memory leaks
 * - Provide memory statistics
 * - Cleanup on element disposal
 */

/**
 * MemoryManager Class
 * 
 * Central memory management system for FlutterJS runtime
 */
class MemoryManager {
  constructor(config = {}) {
    // Configuration
    this.config = {
      enableLeakDetection: config.enableLeakDetection !== false,
      leakDetectionInterval: config.leakDetectionInterval || 30000, // 30s
      maxRetainedObjects: config.maxRetainedObjects || 10000,
      warnThreshold: config.warnThreshold || 5000,
      enableProfiling: config.enableProfiling || false,
      debugMode: config.debugMode || false
    };
    
    // Core registries
    this.elementRegistry = new WeakMap();     // Element → metadata
    this.vnodeRegistry = new WeakMap();       // VNode → element
    this.listenerRegistry = new WeakMap();    // Element → listeners[]
    this.stateRegistry = new WeakMap();       // State → element
    this.disposableRegistry = new Map();      // ID → cleanup function
    
    // Strong references for leak detection
    this.elementRefs = new Map();             // ID → element (for tracking)
    this.vnodeRefs = new Map();               // ID → vnode
    this.listenerRefs = new Map();            // ID → listener info
    
    // Statistics
    this.stats = {
      elementsCreated: 0,
      elementsDisposed: 0,
      vnodeCreated: 0,
      vnodeDisposed: 0,
      listenersAttached: 0,
      listenersRemoved: 0,
      cleanupCallsTotal: 0,
      memoryLeaksDetected: 0,
      peakElementCount: 0,
      peakVNodeCount: 0
    };
    
    // Lifecycle tracking
    this.disposalQueue = new Set();
    this.cleanupScheduled = false;
    
    // Leak detection
    this.leakDetectionTimer = null;
    
    // Start leak detection if enabled
    if (this.config.enableLeakDetection) {
      this.startLeakDetection();
    }
  }
  
  /**
   * Register an element
   * @param {Element} element - Element to register
   * @param {Object} metadata - Additional metadata
   */
  register(element) {
    if (!element) {
      throw new Error('Element is required for registration');
    }
    
    // Store metadata in WeakMap (auto garbage collected)
    const metadata = {
      id: element.id,
      type: element.constructor.name,
      depth: element.depth,
      createdAt: Date.now(),
      mounted: element.mounted,
      hasChildren: element.children.length > 0,
      hasState: !!element.state,
      parentId: element.parent ? element.parent.id : null
    };
    
    this.elementRegistry.set(element, metadata);
    
    // Store strong reference for leak detection (with ID)
    if (this.config.enableLeakDetection) {
      this.elementRefs.set(element.id, {
        element: element,
        registeredAt: Date.now(),
        type: element.constructor.name
      });
    }
    
    // Update stats
    this.stats.elementsCreated++;
    
    if (this.elementRefs.size > this.stats.peakElementCount) {
      this.stats.peakElementCount = this.elementRefs.size;
    }
    
    // Check threshold
    if (this.elementRefs.size > this.config.warnThreshold) {
      this.logWarning(`Element count (${this.elementRefs.size}) exceeds threshold (${this.config.warnThreshold})`);
    }
    
    if (this.config.debugMode) {
      this.logDebug(`Registered element ${element.id} (${element.constructor.name})`);
    }
  }
  
  /**
   * Unregister an element
   * @param {Element} element - Element to unregister
   */
  unregister(element) {
    if (!element) {
      return;
    }
    
    // Schedule cleanup instead of immediate execution
    this.disposalQueue.add(element);
    this.scheduleCleanup();
  }
  
  /**
   * Schedule cleanup batch
   */
  scheduleCleanup() {
    if (this.cleanupScheduled) {
      return;
    }
    
    this.cleanupScheduled = true;
    
    // Use microtask for fast cleanup
    Promise.resolve().then(() => {
      this.performBatchCleanup();
    });
  }
  
  /**
   * Perform batch cleanup
   */
  performBatchCleanup() {
    this.cleanupScheduled = false;
    
    const elements = Array.from(this.disposalQueue);
    this.disposalQueue.clear();
    
    elements.forEach(element => {
      this.cleanupElement(element);
    });
    
    if (this.config.debugMode) {
      this.logDebug(`Batch cleanup: ${elements.length} elements`);
    }
  }
  
  /**
   * Cleanup a single element
   * @param {Element} element - Element to cleanup
   */
  cleanupElement(element) {
    const elementId = element.id;
    
    try {
      // Remove event listeners
      this.removeAllListeners(element);
      
      // Cleanup VNode references
      if (element.vnode) {
        this.unregisterVNode(element.vnode);
      }
      
      // Cleanup state references
      if (element.state) {
        this.stateRegistry.delete(element.state);
      }
      
      // Cleanup disposables
      if (this.disposableRegistry.has(elementId)) {
        const cleanup = this.disposableRegistry.get(elementId);
        try {
          cleanup();
        } catch (error) {
          this.logError(`Cleanup function failed for ${elementId}:`, error);
        }
        this.disposableRegistry.delete(elementId);
      }
      
      // Clear element references
      element.vnode = null;
      element.domNode = null;
      element.children = [];
      
      // Remove from registries
      this.elementRegistry.delete(element);
      this.listenerRegistry.delete(element);
      this.elementRefs.delete(elementId);
      
      // Update stats
      this.stats.elementsDisposed++;
      this.stats.cleanupCallsTotal++;
      
      if (this.config.debugMode) {
        this.logDebug(`Cleaned up element ${elementId}`);
      }
    } catch (error) {
      this.logError(`Cleanup failed for element ${elementId}:`, error);
    }
  }
  
  /**
   * Register a VNode
   * @param {Object} vnode - VNode to register
   * @param {Element} element - Owning element
   */
  registerVNode(vnode, element) {
    if (!vnode || !element) {
      return;
    }
    
    // Link VNode to element
    this.vnodeRegistry.set(vnode, element);
    
    // Track for leak detection
    if (this.config.enableLeakDetection) {
      const vnodeId = this.generateVNodeId(vnode);
      this.vnodeRefs.set(vnodeId, {
        vnode: vnode,
        elementId: element.id,
        createdAt: Date.now()
      });
    }
    
    this.stats.vnodeCreated++;
    
    if (this.vnodeRefs.size > this.stats.peakVNodeCount) {
      this.stats.peakVNodeCount = this.vnodeRefs.size;
    }
  }
  
  /**
   * Unregister a VNode
   * @param {Object} vnode - VNode to unregister
   */
  unregisterVNode(vnode) {
    if (!vnode) {
      return;
    }
    
    this.vnodeRegistry.delete(vnode);
    
    // Remove from tracking
    const vnodeId = this.generateVNodeId(vnode);
    this.vnodeRefs.delete(vnodeId);
    
    this.stats.vnodeDisposed++;
  }
  
  /**
   * Generate VNode ID
   */
  generateVNodeId(vnode) {
    if (!vnode._memoryId) {
      vnode._memoryId = `vnode_${++MemoryManager._vnodeIdCounter}`;
    }
    return vnode._memoryId;
  }
  
  /**
   * Track event listener
   * @param {Element} element - Element owning the listener
   * @param {HTMLElement} target - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   */
  trackListener(element, target, event, handler, options = {}) {
    if (!element || !target || !event || !handler) {
      throw new Error('All listener parameters are required');
    }
    
    // Get or create listener list for element
    if (!this.listenerRegistry.has(element)) {
      this.listenerRegistry.set(element, []);
    }
    
    const listeners = this.listenerRegistry.get(element);
    
    const listenerInfo = {
      target: target,
      event: event,
      handler: handler,
      options: options,
      attachedAt: Date.now()
    };
    
    listeners.push(listenerInfo);
    
    // Track for leak detection
    if (this.config.enableLeakDetection) {
      const listenerId = `${element.id}_${event}_${listeners.length}`;
      this.listenerRefs.set(listenerId, {
        elementId: element.id,
        event: event,
        attachedAt: Date.now()
      });
    }
    
    this.stats.listenersAttached++;
    
    if (this.config.debugMode) {
      this.logDebug(`Tracked listener: ${element.id} → ${event}`);
    }
  }
  
  /**
   * Remove all listeners for an element
   * @param {Element} element - Element to remove listeners from
   */
  removeAllListeners(element) {
    if (!element) {
      return;
    }
    
    const listeners = this.listenerRegistry.get(element);
    
    if (!listeners || listeners.length === 0) {
      return;
    }
    
    // Remove each listener
    listeners.forEach(({ target, event, handler, options }) => {
      try {
        if (target && target.removeEventListener) {
          target.removeEventListener(event, handler, options);
        }
        this.stats.listenersRemoved++;
      } catch (error) {
        this.logError(`Failed to remove listener ${event}:`, error);
      }
    });
    
    // Clear listener list
    this.listenerRegistry.delete(element);
    
    // Remove from tracking
    if (this.config.enableLeakDetection) {
      listeners.forEach((_, index) => {
        const listenerId = `${element.id}_${listeners[index].event}_${index + 1}`;
        this.listenerRefs.delete(listenerId);
      });
    }
    
    if (this.config.debugMode) {
      this.logDebug(`Removed ${listeners.length} listeners from ${element.id}`);
    }
  }
  
  /**
   * Register a disposable cleanup function
   * @param {string} id - Unique identifier
   * @param {Function} cleanup - Cleanup function
   */
  registerDisposable(id, cleanup) {
    if (!id || typeof cleanup !== 'function') {
      throw new Error('Valid ID and cleanup function required');
    }
    
    this.disposableRegistry.set(id, cleanup);
  }
  
  /**
   * Track state object
   * @param {Object} state - State object
   * @param {Element} element - Owning element
   */
  trackState(state, element) {
    if (!state || !element) {
      return;
    }
    
    this.stateRegistry.set(state, element);
  }
  
  /**
   * Get element by ID (for debugging)
   * @param {string} elementId - Element ID
   * @returns {Element|null}
   */
  getElementById(elementId) {
    const ref = this.elementRefs.get(elementId);
    return ref ? ref.element : null;
  }
  
  /**
   * Get element metadata
   * @param {Element} element - Element
   * @returns {Object|null}
   */
  getElementMetadata(element) {
    return this.elementRegistry.get(element) || null;
  }
  
  /**
   * Get element owning a VNode
   * @param {Object} vnode - VNode
   * @returns {Element|null}
   */
  getElementForVNode(vnode) {
    return this.vnodeRegistry.get(vnode) || null;
  }
  
  /**
   * Get listeners for an element
   * @param {Element} element - Element
   * @returns {Array}
   */
  getListenersForElement(element) {
    return this.listenerRegistry.get(element) || [];
  }
  
  /**
   * Start leak detection
   */
  startLeakDetection() {
    if (this.leakDetectionTimer) {
      return;
    }
    
    this.leakDetectionTimer = setInterval(() => {
      this.detectLeaks();
    }, this.config.leakDetectionInterval);
    
    if (this.config.debugMode) {
      this.logDebug('Leak detection started');
    }
  }
  
  /**
   * Stop leak detection
   */
  stopLeakDetection() {
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
      this.leakDetectionTimer = null;
      
      if (this.config.debugMode) {
        this.logDebug('Leak detection stopped');
      }
    }
  }
  
  /**
   * Detect memory leaks
   */
  detectLeaks() {
    const now = Date.now();
    const leakThreshold = 60000; // 60 seconds
    
    const potentialLeaks = [];
    
    // Check for old unmounted elements still in memory
    this.elementRefs.forEach((ref, id) => {
      const element = ref.element;
      const age = now - ref.registeredAt;
      
      // If element is old and unmounted, it might be leaked
      if (!element.mounted && age > leakThreshold) {
        potentialLeaks.push({
          type: 'element',
          id: id,
          elementType: ref.type,
          age: age,
          mounted: element.mounted
        });
      }
    });
    
    // Check for orphaned VNodes
    this.vnodeRefs.forEach((ref, id) => {
      const age = now - ref.createdAt;
      
      // If VNode is very old, might be leaked
      if (age > leakThreshold * 2) {
        potentialLeaks.push({
          type: 'vnode',
          id: id,
          elementId: ref.elementId,
          age: age
        });
      }
    });
    
    // Check for orphaned listeners
    this.listenerRefs.forEach((ref, id) => {
      const age = now - ref.attachedAt;
      
      if (age > leakThreshold) {
        potentialLeaks.push({
          type: 'listener',
          id: id,
          elementId: ref.elementId,
          event: ref.event,
          age: age
        });
      }
    });
    
    if (potentialLeaks.length > 0) {
      this.stats.memoryLeaksDetected += potentialLeaks.length;
      
      this.logWarning(`Potential memory leaks detected: ${potentialLeaks.length}`);
      
      if (this.config.debugMode) {
        potentialLeaks.forEach(leak => {
          this.logDebug(`Leak: ${leak.type} ${leak.id} (age: ${Math.round(leak.age / 1000)}s)`);
        });
      }
    }
    
    return potentialLeaks;
  }
  
  /**
   * Force cleanup of all unmounted elements
   */
  forceCleanupUnmounted() {
    const cleanedElements = [];
    
    this.elementRefs.forEach((ref, id) => {
      if (!ref.element.mounted) {
        this.cleanupElement(ref.element);
        cleanedElements.push(id);
      }
    });
    
    if (this.config.debugMode) {
      this.logDebug(`Force cleanup: ${cleanedElements.length} elements`);
    }
    
    return cleanedElements.length;
  }
  
  /**
   * Get memory statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      currentElements: this.elementRefs.size,
      currentVNodes: this.vnodeRefs.size,
      currentListeners: this.listenerRefs.size,
      disposablesRegistered: this.disposableRegistry.size,
      elementsInQueue: this.disposalQueue.size,
      leakDetectionEnabled: this.config.enableLeakDetection
    };
  }
  
  /**
   * Get detailed report
   * @returns {Object}
   */
  getDetailedReport() {
    const elements = [];
    
    this.elementRefs.forEach((ref, id) => {
      const element = ref.element;
      elements.push({
        id: id,
        type: ref.type,
        mounted: element.mounted,
        depth: element.depth,
        childCount: element.children.length,
        hasState: !!element.state,
        age: Date.now() - ref.registeredAt
      });
    });
    
    return {
      stats: this.getStats(),
      elements: elements,
      config: this.config,
      timestamp: Date.now()
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      elementsCreated: 0,
      elementsDisposed: 0,
      vnodeCreated: 0,
      vnodeDisposed: 0,
      listenersAttached: 0,
      listenersRemoved: 0,
      cleanupCallsTotal: 0,
      memoryLeaksDetected: 0,
      peakElementCount: 0,
      peakVNodeCount: 0
    };
  }
  
  /**
   * Clear all registries (for testing/reset)
   */
  clear() {
    // Perform cleanup on all elements
    this.elementRefs.forEach((ref) => {
      this.cleanupElement(ref.element);
    });
    
    // Clear all registries
    this.elementRefs.clear();
    this.vnodeRefs.clear();
    this.listenerRefs.clear();
    this.disposableRegistry.clear();
    this.disposalQueue.clear();
    
    if (this.config.debugMode) {
      this.logDebug('Memory manager cleared');
    }
  }
  
  /**
   * Dispose memory manager
   */
  dispose() {
    this.stopLeakDetection();
    this.clear();
    
    if (this.config.debugMode) {
      this.logDebug('Memory manager disposed');
    }
  }
  
  // Logging helpers
  
  logDebug(message) {
    if (this.config.debugMode) {
      console.log(`[MemoryManager] ${message}`);
    }
  }
  
  logWarning(message) {
    console.warn(`[MemoryManager] ⚠️  ${message}`);
  }
  
  logError(message, error) {
    console.error(`[MemoryManager] ❌ ${message}`, error);
  }
}

// Static counter for VNode IDs
MemoryManager._vnodeIdCounter = 0;

/**
 * Memory profiler for detailed analysis
 */
class MemoryProfiler {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
    this.snapshots = [];
    this.maxSnapshots = 50;
  }
  
  /**
   * Take a memory snapshot
   */
  takeSnapshot() {
    const stats = this.memoryManager.getStats();
    
    const snapshot = {
      timestamp: Date.now(),
      stats: { ...stats },
      heapUsage: this.getHeapUsage()
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
    
    return snapshot;
  }
  
  /**
   * Get heap usage (if available)
   */
  getHeapUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
  
  /**
   * Compare two snapshots
   */
  compareSnapshots(snapshot1, snapshot2) {
    const diff = {};
    
    Object.keys(snapshot1.stats).forEach(key => {
      diff[key] = snapshot2.stats[key] - snapshot1.stats[key];
    });
    
    return diff;
  }
  
  /**
   * Get growth trend
   */
  getTrend() {
    if (this.snapshots.length < 2) {
      return null;
    }
    
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    
    return this.compareSnapshots(first, last);
  }
  
  /**
   * Clear snapshots
   */
  clear() {
    this.snapshots = [];
  }
}


export { MemoryManager,
    MemoryProfiler};