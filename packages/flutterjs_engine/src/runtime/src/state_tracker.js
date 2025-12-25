/**
 * FlutterJS State Tracker
 * 
 * Tracks dependencies between state properties and UI elements.
 * Enables fine-grained reactivity by only rebuilding elements
 * that depend on changed state properties.
 * 
 * Key Features:
 * - Track which elements depend on which state properties
 * - Automatic dependency recording during build
 * - Selective rebuilds (only affected elements)
 * - Memory-efficient weak references
 * - Performance monitoring
 * 
 * Usage:
 * 1. Start tracking before build
 * 2. Record dependencies during property access
 * 3. Stop tracking after build
 * 4. Rebuild only dependents when property changes
 */

/**
 * StateTracker Class
 * 
 * Manages dependency relationships between state and elements
 */
class StateTracker {
  constructor(config = {}) {
    // Configuration
    this.config = {
      enableTracking: config.enableTracking !== false,
      enableWeakRefs: config.enableWeakRefs !== false,
      maxDependenciesPerProperty: config.maxDependenciesPerProperty || 1000,
      enableDebugLogging: config.enableDebugLogging || false,
      warnOnThreshold: config.warnOnThreshold !== false,
      dependencyThreshold: config.dependencyThreshold || 500
    };
    
    // Core tracking
    this.dependencies = new Map();          // "stateId.property" → Set<element>
    this.elementDependencies = new Map();   // elementId → Set<"stateId.property">
    
    // Weak references for automatic cleanup
    this.weakElementRefs = new WeakMap();   // element → metadata
    
    // Current tracking state
    this.tracking = false;
    this.currentElement = null;
    this.trackingStack = [];                // Support nested tracking
    
    // Performance tracking
    this.stats = {
      dependenciesTracked: 0,
      dependenciesCleared: 0,
      rebuildsTriggered: 0,
      selectiveRebuilds: 0,
      fullRebuilds: 0,
      trackingSessionsStarted: 0,
      trackingSessionsEnded: 0,
      peakDependencies: 0
    };
    
    // Debug tracking
    this.debugLog = [];
    this.maxDebugLogSize = 1000;
  }
  
  /**
   * Start tracking dependencies for build
   * @param {Element} element - Element being built
   */
  startTracking(element) {
    if (!this.config.enableTracking) {
      return;
    }
    
    if (!element) {
      throw new Error('Element is required for tracking');
    }
    
    // Support nested tracking (push to stack)
    if (this.tracking && this.currentElement) {
      this.trackingStack.push({
        element: this.currentElement,
        tracking: this.tracking
      });
    }
    
    this.tracking = true;
    this.currentElement = element;
    
    this.stats.trackingSessionsStarted++;
    
    this.log(`Started tracking for element ${element.id}`);
  }
  
  /**
   * Stop tracking dependencies
   */
  stopTracking() {
    if (!this.config.enableTracking) {
      return;
    }
    
    if (this.currentElement) {
      this.log(`Stopped tracking for element ${this.currentElement.id}`);
    }
    
    // Restore previous tracking state from stack
    if (this.trackingStack.length > 0) {
      const previous = this.trackingStack.pop();
      this.currentElement = previous.element;
      this.tracking = previous.tracking;
    } else {
      this.tracking = false;
      this.currentElement = null;
    }
    
    this.stats.trackingSessionsEnded++;
  }
  
  /**
   * Record dependency: element depends on state property
   * @param {State} state - State object
   * @param {string} property - Property name
   */
  recordDependency(state, property) {
    if (!this.config.enableTracking || !this.tracking || !this.currentElement) {
      return;
    }
    
    if (!state || !property) {
      if (this.config.enableDebugLogging) {
        console.warn('[StateTracker] Invalid dependency recording attempt');
      }
      return;
    }
    
    // Generate dependency key
    const stateId = this.getStateId(state);
    const dependencyKey = `${stateId}.${property}`;
    
    // Add to main dependencies map
    if (!this.dependencies.has(dependencyKey)) {
      this.dependencies.set(dependencyKey, new Set());
    }
    
    const dependents = this.dependencies.get(dependencyKey);
    
    // Check threshold
    if (dependents.size >= this.config.maxDependenciesPerProperty) {
      console.warn(
        `[StateTracker] Max dependencies reached for ${dependencyKey} ` +
        `(${dependents.size}/${this.config.maxDependenciesPerProperty})`
      );
      return;
    }
    
    dependents.add(this.currentElement);
    
    // Track reverse dependency (element → dependencies)
    const elementId = this.currentElement.id;
    if (!this.elementDependencies.has(elementId)) {
      this.elementDependencies.set(elementId, new Set());
    }
    this.elementDependencies.get(elementId).add(dependencyKey);
    
    // Store weak reference for cleanup
    if (this.config.enableWeakRefs) {
      this.weakElementRefs.set(this.currentElement, {
        id: elementId,
        stateId: stateId,
        property: property,
        trackedAt: Date.now()
      });
    }
    
    this.stats.dependenciesTracked++;
    
    // Track peak
    const totalDeps = this.getTotalDependencies();
    if (totalDeps > this.stats.peakDependencies) {
      this.stats.peakDependencies = totalDeps;
    }
    
    // Warn on threshold
    if (this.config.warnOnThreshold && 
        totalDeps > this.config.dependencyThreshold) {
      console.warn(
        `[StateTracker] Dependency count (${totalDeps}) exceeds threshold ` +
        `(${this.config.dependencyThreshold})`
      );
    }
    
    this.log(
      `Recorded dependency: ${this.currentElement.id} → ${dependencyKey}`
    );
  }
  
  /**
   * Get elements that depend on state property
   * @param {State} state - State object
   * @param {string} property - Property name
   * @returns {Set<Element>}
   */
  getDependents(state, property) {
    if (!state || !property) {
      return new Set();
    }
    
    const stateId = this.getStateId(state);
    const dependencyKey = `${stateId}.${property}`;
    
    const dependents = this.dependencies.get(dependencyKey);
    
    if (!dependents) {
      return new Set();
    }
    
    // Filter out unmounted elements
    const validDependents = new Set();
    
    dependents.forEach(element => {
      if (element && element.mounted) {
        validDependents.add(element);
      }
    });
    
    return validDependents;
  }
  
  /**
   * Get all dependencies for an element
   * @param {Element} element - Element
   * @returns {Set<string>} Set of dependency keys
   */
  getElementDependencies(element) {
    if (!element) {
      return new Set();
    }
    
    return this.elementDependencies.get(element.id) || new Set();
  }
  
  /**
   * Notify dependents of property change
   * @param {State} state - State object
   * @param {string} property - Property name
   * @returns {number} Number of elements rebuilt
   */
  notifyPropertyChange(state, property) {
    const dependents = this.getDependents(state, property);
    
    if (dependents.size === 0) {
      return 0;
    }
    
    dependents.forEach(element => {
      if (element.mounted && !element.dirty) {
        element.markNeedsBuild();
        this.stats.selectiveRebuilds++;
      }
    });
    
    this.stats.rebuildsTriggered++;
    
    this.log(
      `Notified ${dependents.size} dependents of ${this.getStateId(state)}.${property} change`
    );
    
    return dependents.size;
  }
  
  /**
   * Notify dependents of multiple property changes
   * @param {State} state - State object
   * @param {Array<string>} properties - Property names
   * @returns {number} Number of unique elements rebuilt
   */
  notifyMultipleChanges(state, properties) {
    if (!properties || properties.length === 0) {
      return 0;
    }
    
    const allDependents = new Set();
    
    properties.forEach(property => {
      const dependents = this.getDependents(state, property);
      dependents.forEach(el => allDependents.add(el));
    });
    
    allDependents.forEach(element => {
      if (element.mounted && !element.dirty) {
        element.markNeedsBuild();
        this.stats.selectiveRebuilds++;
      }
    });
    
    this.stats.rebuildsTriggered++;
    
    return allDependents.size;
  }
  
  /**
   * Clear dependencies for element
   * @param {Element} element - Element to clear
   */
  clearDependencies(element) {
    if (!element) {
      return;
    }
    
    const elementId = element.id;
    
    // Get all dependencies for this element
    const elementDeps = this.elementDependencies.get(elementId);
    
    if (!elementDeps) {
      return;
    }
    
    let clearedCount = 0;
    
    // Remove element from each dependency set
    elementDeps.forEach(dependencyKey => {
      const dependents = this.dependencies.get(dependencyKey);
      
      if (dependents && dependents.has(element)) {
        dependents.delete(element);
        clearedCount++;
        
        // Remove empty dependency sets
        if (dependents.size === 0) {
          this.dependencies.delete(dependencyKey);
        }
      }
    });
    
    // Remove element's dependency tracking
    this.elementDependencies.delete(elementId);
    
    // Remove weak reference
    this.weakElementRefs.delete(element);
    
    this.stats.dependenciesCleared += clearedCount;
    
    this.log(`Cleared ${clearedCount} dependencies for element ${elementId}`);
  }
  
  /**
   * Clear dependencies for a specific state property
   * @param {State} state - State object
   * @param {string} property - Property name
   */
  clearPropertyDependencies(state, property) {
    const stateId = this.getStateId(state);
    const dependencyKey = `${stateId}.${property}`;
    
    const dependents = this.dependencies.get(dependencyKey);
    
    if (!dependents) {
      return;
    }
    
    const count = dependents.size;
    
    // Remove from element dependencies
    dependents.forEach(element => {
      const elementDeps = this.elementDependencies.get(element.id);
      if (elementDeps) {
        elementDeps.delete(dependencyKey);
      }
    });
    
    // Remove dependency
    this.dependencies.delete(dependencyKey);
    
    this.stats.dependenciesCleared += count;
  }
  
  /**
   * Clear all dependencies for a state
   * @param {State} state - State object
   */
  clearStateDependencies(state) {
    const stateId = this.getStateId(state);
    
    // Find all dependencies for this state
    const keysToDelete = [];
    
    this.dependencies.forEach((dependents, key) => {
      if (key.startsWith(`${stateId}.`)) {
        keysToDelete.push(key);
        
        // Remove from element dependencies
        dependents.forEach(element => {
          const elementDeps = this.elementDependencies.get(element.id);
          if (elementDeps) {
            elementDeps.delete(key);
          }
        });
      }
    });
    
    keysToDelete.forEach(key => {
      this.dependencies.delete(key);
    });
    
    this.log(`Cleared all dependencies for state ${stateId}`);
  }
  
  /**
   * Clear all dependencies
   */
  clear() {
    this.dependencies.clear();
    this.elementDependencies.clear();
    this.tracking = false;
    this.currentElement = null;
    this.trackingStack = [];
    
    this.log('Cleared all dependencies');
  }
  
  /**
   * Get state ID
   * @param {State} state - State object
   * @returns {string}
   */
  getStateId(state) {
    if (!state) {
      return 'unknown';
    }
    
    // Use existing ID or generate one
    if (!state._stateId) {
      state._stateId = `state_${++StateTracker._stateIdCounter}`;
    }
    
    return state._stateId;
  }
  
  /**
   * Get total number of dependencies
   * @returns {number}
   */
  getTotalDependencies() {
    let total = 0;
    this.dependencies.forEach(dependents => {
      total += dependents.size;
    });
    return total;
  }
  
  /**
   * Get dependency tree for debugging
   * @returns {Object}
   */
  getDependencyTree() {
    const tree = {};
    
    this.dependencies.forEach((dependents, key) => {
      tree[key] = Array.from(dependents).map(el => ({
        id: el.id,
        type: el.constructor.name,
        mounted: el.mounted
      }));
    });
    
    return tree;
  }
  
  /**
   * Get element dependency map
   * @returns {Object}
   */
  getElementDependencyMap() {
    const map = {};
    
    this.elementDependencies.forEach((deps, elementId) => {
      map[elementId] = Array.from(deps);
    });
    
    return map;
  }
  
  /**
   * Check if tracking is active
   * @returns {boolean}
   */
  isTracking() {
    return this.tracking && this.currentElement !== null;
  }
  
  /**
   * Get current tracking element
   * @returns {Element|null}
   */
  getCurrentElement() {
    return this.currentElement;
  }
  
  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      totalDependencies: this.getTotalDependencies(),
      uniqueDependencyKeys: this.dependencies.size,
      trackedElements: this.elementDependencies.size,
      isTracking: this.tracking,
      trackingStackDepth: this.trackingStack.length
    };
  }
  
  /**
   * Get detailed report
   * @returns {Object}
   */
  getDetailedReport() {
    return {
      stats: this.getStats(),
      dependencyTree: this.getDependencyTree(),
      elementDependencies: this.getElementDependencyMap(),
      config: this.config,
      timestamp: Date.now()
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      dependenciesTracked: 0,
      dependenciesCleared: 0,
      rebuildsTriggered: 0,
      selectiveRebuilds: 0,
      fullRebuilds: 0,
      trackingSessionsStarted: 0,
      trackingSessionsEnded: 0,
      peakDependencies: 0
    };
  }
  
  /**
   * Enable/disable tracking
   * @param {boolean} enabled - Enable tracking
   */
  setTrackingEnabled(enabled) {
    this.config.enableTracking = enabled;
    
    if (!enabled) {
      this.stopTracking();
    }
  }
  
  /**
   * Log debug message
   * @param {string} message - Message to log
   */
  log(message) {
    if (!this.config.enableDebugLogging) {
      return;
    }
    
    const logEntry = {
      timestamp: Date.now(),
      message: message
    };
    
    this.debugLog.push(logEntry);
    
    // Keep log size manageable
    if (this.debugLog.length > this.maxDebugLogSize) {
      this.debugLog.shift();
    }
    
    console.log(`[StateTracker] ${message}`);
  }
  
  /**
   * Get debug log
   * @returns {Array}
   */
  getDebugLog() {
    return [...this.debugLog];
  }
  
  /**
   * Clear debug log
   */
  clearDebugLog() {
    this.debugLog = [];
  }
}

// Static counter for state IDs
StateTracker._stateIdCounter = 0;


export {StateTracker};