/**
 * StateTracker Comprehensive Test Suite
 * 
 * Tests all functionality including:
 * - Basic tracking operations
 * - Dependency recording and retrieval
 * - Element cleanup
 * - Nested tracking
 * - Performance monitoring
 * - Real-world scenarios
 */

import { StateTracker } from '../src/state_tracker.js';

// Mock Element
class MockElement {
  constructor(id) {
    this.id = id;
    this.mounted = true;
    this.dirty = false;
  }
  
  markNeedsBuild() {
    this.dirty = true;
  }
}

// Mock State
class MockState {
  constructor(id) {
    this._stateId = id;
    this.count = 0;
    this.message = 'hello';
  }
}

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
  }

  it(name, fn) {
    try {
      fn();
      console.log(`  ✅ ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`  ❌ ${name}`);
      console.log(`     ${error.message}`);
      this.failed++;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected} but got ${actual}`
      );
    }
  }

  assertNull(value, message) {
    if (value !== null) {
      throw new Error(message || `Expected null but got ${value}`);
    }
  }

  assertNotNull(value, message) {
    if (value === null) {
      throw new Error(message || 'Expected value to not be null');
    }
  }

  assertTrue(value, message) {
    if (value !== true) {
      throw new Error(message || `Expected true but got ${value}`);
    }
  }

  assertFalse(value, message) {
    if (value !== false) {
      throw new Error(message || `Expected false but got ${value}`);
    }
  }

  assertThrows(fn, shouldThrow = true) {
    let threw = false;
    try {
      fn();
    } catch (error) {
      threw = true;
    }
    
    if (shouldThrow && !threw) {
      throw new Error('Expected function to throw');
    }
  }

  assertGreaterThan(actual, threshold, message) {
    if (actual <= threshold) {
      throw new Error(
        message || `Expected ${actual} to be greater than ${threshold}`
      );
    }
  }

  summary() {
    const total = this.passed + this.failed;
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tests: ${total} | ✅ Passed: ${this.passed} | ❌ Failed: ${this.failed}`);
    console.log(`${'='.repeat(50)}\n`);

    return this.failed === 0;
  }
}

// Run tests
function runTests() {
  const test = new TestRunner();

  test.describe('StateTracker: Initialization & Configuration', () => {
    test.it('should create tracker with default config', () => {
      const tracker = new StateTracker();
      
      test.assertTrue(tracker.config.enableTracking);
      test.assertTrue(tracker.config.enableWeakRefs);
      test.assertFalse(tracker.tracking);
      test.assertNull(tracker.currentElement);
      
      tracker.clear();
    });
    
    test.it('should create tracker with custom config', () => {
      const customTracker = new StateTracker({
        enableTracking: false,
        maxDependenciesPerProperty: 500,
        enableDebugLogging: true
      });
      
      test.assertFalse(customTracker.config.enableTracking);
      test.assertEqual(customTracker.config.maxDependenciesPerProperty, 500);
      test.assertTrue(customTracker.config.enableDebugLogging);
      
      customTracker.clear();
    });
    
    test.it('should initialize with empty dependencies', () => {
      const tracker = new StateTracker();
      
      test.assertEqual(tracker.dependencies.size, 0);
      test.assertEqual(tracker.elementDependencies.size, 0);
      test.assertEqual(tracker.getTotalDependencies(), 0);
      
      tracker.clear();
    });
    
    test.it('should initialize statistics', () => {
      const tracker = new StateTracker();
      const stats = tracker.getStats();
      
      test.assertEqual(stats.dependenciesTracked, 0);
      test.assertEqual(stats.dependenciesCleared, 0);
      test.assertEqual(stats.rebuildsTriggered, 0);
      test.assertEqual(stats.trackingSessionsStarted, 0);
      
      tracker.clear();
    });
  });

  test.describe('StateTracker: Basic Tracking Operations', () => {
    test.it('should start tracking', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      
      tracker.startTracking(element);
      
      test.assertTrue(tracker.tracking);
      test.assertEqual(tracker.currentElement, element);
      test.assertEqual(tracker.stats.trackingSessionsStarted, 1);
      
      tracker.clear();
    });
    
    test.it('should throw error when starting tracking without element', () => {
      const tracker = new StateTracker();
      
      test.assertThrows(() => {
        tracker.startTracking(null);
      });
      
      tracker.clear();
    });
    
    test.it('should stop tracking', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      
      tracker.startTracking(element);
      tracker.stopTracking();
      
      test.assertFalse(tracker.tracking);
      test.assertNull(tracker.currentElement);
      test.assertEqual(tracker.stats.trackingSessionsEnded, 1);
      
      tracker.clear();
    });
    
    test.it('should handle stop tracking without active tracking', () => {
      const tracker = new StateTracker();
      
      test.assertThrows(() => {
        tracker.stopTracking();
      }, false);
      
      test.assertFalse(tracker.tracking);
      tracker.clear();
    });
    
    test.it('should check if tracking is active', () => {
      const tracker = new StateTracker();
      
      test.assertFalse(tracker.isTracking());
      
      tracker.startTracking(new MockElement('el_1'));
      test.assertTrue(tracker.isTracking());
      
      tracker.stopTracking();
      test.assertFalse(tracker.isTracking());
      
      tracker.clear();
    });
    
    test.it('should get current tracking element', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      
      test.assertNull(tracker.getCurrentElement());
      
      tracker.startTracking(element);
      test.assertEqual(tracker.getCurrentElement(), element);
      
      tracker.clear();
    });
  });

  test.describe('StateTracker: Dependency Recording', () => {
    test.it('should record dependency', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      test.assertEqual(tracker.stats.dependenciesTracked, 1);
      test.assertEqual(tracker.getTotalDependencies(), 1);
      
      tracker.clear();
    });
    
    test.it('should not record dependency when not tracking', () => {
      const tracker = new StateTracker();
      const state = new MockState('state_1');
      
      tracker.recordDependency(state, 'count');
      
      test.assertEqual(tracker.stats.dependenciesTracked, 0);
      test.assertEqual(tracker.getTotalDependencies(), 0);
      
      tracker.clear();
    });
    
    test.it('should record multiple dependencies for same element', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.recordDependency(state, 'message');
      tracker.stopTracking();
      
      test.assertEqual(tracker.stats.dependenciesTracked, 2);
      
      const elementDeps = tracker.getElementDependencies(element);
      test.assertEqual(elementDeps.size, 2);
      test.assertTrue(elementDeps.has('state_1.count'));
      test.assertTrue(elementDeps.has('state_1.message'));
      
      tracker.clear();
    });
    
    test.it('should record same property for multiple elements', () => {
      const tracker = new StateTracker();
      const element1 = new MockElement('el_1');
      const element2 = new MockElement('el_2');
      const state = new MockState('state_1');
      
      tracker.startTracking(element1);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.startTracking(element2);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      const dependents = tracker.getDependents(state, 'count');
      
      test.assertEqual(dependents.size, 2);
      test.assertTrue(dependents.has(element1));
      test.assertTrue(dependents.has(element2));
      
      tracker.clear();
    });
    
    test.it('should handle invalid dependency recording', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      
      tracker.startTracking(element);
      
      tracker.recordDependency(null, 'property');
      tracker.recordDependency(new MockState('state_1'), null);
      
      test.assertEqual(tracker.getTotalDependencies(), 0);
      
      tracker.clear();
    });
    
    test.it('should track peak dependencies', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      
      for (let i = 0; i < 5; i++) {
        tracker.recordDependency(state, `prop_${i}`);
      }
      
      tracker.stopTracking();
      
      test.assertEqual(tracker.stats.peakDependencies, 5);
      
      tracker.clear();
    });
  });

  test.describe('StateTracker: Dependency Retrieval', () => {
    test.it('should get dependents for property', () => {
      const tracker = new StateTracker();
      const element1 = new MockElement('el_1');
      const element2 = new MockElement('el_2');
      const state = new MockState('state_1');
      
      tracker.startTracking(element1);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.startTracking(element2);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      const dependents = tracker.getDependents(state, 'count');
      
      test.assertEqual(dependents.size, 2);
      test.assertTrue(dependents.has(element1));
      test.assertTrue(dependents.has(element2));
      
      tracker.clear();
    });
    
    test.it('should return empty set for non-existent dependency', () => {
      const tracker = new StateTracker();
      const state = new MockState('state_1');
      
      const dependents = tracker.getDependents(state, 'nonExistent');
      
      test.assertEqual(dependents.size, 0);
      
      tracker.clear();
    });
    
    test.it('should filter out unmounted elements', () => {
      const tracker = new StateTracker();
      const element1 = new MockElement('el_1');
      const element2 = new MockElement('el_2');
      const state = new MockState('state_1');
      
      tracker.startTracking(element1);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.startTracking(element2);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      element1.mounted = false;
      
      const dependents = tracker.getDependents(state, 'count');
      
      test.assertEqual(dependents.size, 1);
      test.assertTrue(dependents.has(element2));
      test.assertFalse(dependents.has(element1));
      
      tracker.clear();
    });
    
    test.it('should get element dependencies', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.recordDependency(state, 'message');
      tracker.stopTracking();
      
      const deps = tracker.getElementDependencies(element);
      
      test.assertEqual(deps.size, 2);
      test.assertTrue(deps.has('state_1.count'));
      test.assertTrue(deps.has('state_1.message'));
      
      tracker.clear();
    });
  });

  test.describe('StateTracker: Dependency Notifications', () => {
    test.it('should notify dependents of property change', () => {
      const tracker = new StateTracker();
      const element1 = new MockElement('el_1');
      const element2 = new MockElement('el_2');
      const state = new MockState('state_1');
      
      tracker.startTracking(element1);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.startTracking(element2);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      const notified = tracker.notifyPropertyChange(state, 'count');
      
      test.assertEqual(notified, 2);
      test.assertTrue(element1.dirty);
      test.assertTrue(element2.dirty);
      test.assertEqual(tracker.stats.rebuildsTriggered, 1);
      test.assertEqual(tracker.stats.selectiveRebuilds, 2);
      
      tracker.clear();
    });
    
    test.it('should not notify already dirty elements', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      element.dirty = true;
      
      tracker.notifyPropertyChange(state, 'count');
      
      test.assertEqual(tracker.stats.selectiveRebuilds, 0);
      
      tracker.clear();
    });
    
    test.it('should not notify unmounted elements', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      element.mounted = false;
      
      const notified = tracker.notifyPropertyChange(state, 'count');
      
      test.assertEqual(notified, 0);
      test.assertFalse(element.dirty);
      
      tracker.clear();
    });
    
    test.it('should notify multiple property changes', () => {
      const tracker = new StateTracker();
      const element1 = new MockElement('el_1');
      const element2 = new MockElement('el_2');
      const state = new MockState('state_1');
      
      tracker.startTracking(element1);
      tracker.recordDependency(state, 'count');
      tracker.recordDependency(state, 'message');
      tracker.stopTracking();
      
      tracker.startTracking(element2);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      const notified = tracker.notifyMultipleChanges(state, ['count', 'message']);
      
      test.assertEqual(notified, 2);
      test.assertTrue(element1.dirty);
      test.assertTrue(element2.dirty);
      
      tracker.clear();
    });
    
    test.it('should return 0 for empty property array', () => {
      const tracker = new StateTracker();
      const state = new MockState('state_1');
      
      const notified = tracker.notifyMultipleChanges(state, []);
      
      test.assertEqual(notified, 0);
      
      tracker.clear();
    });
  });

  test.describe('StateTracker: Dependency Cleanup', () => {
    test.it('should clear dependencies for element', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.recordDependency(state, 'message');
      tracker.stopTracking();
      
      test.assertEqual(tracker.getTotalDependencies(), 2);
      
      tracker.clearDependencies(element);
      
      test.assertEqual(tracker.getTotalDependencies(), 0);
      test.assertEqual(tracker.getElementDependencies(element).size, 0);
      test.assertEqual(tracker.stats.dependenciesCleared, 2);
      
      tracker.clear();
    });
    
    test.it('should handle clearing non-existent element', () => {
      const tracker = new StateTracker();
      
      test.assertThrows(() => {
        tracker.clearDependencies(new MockElement('nonExistent'));
      }, false);
      
      tracker.clear();
    });
    
    test.it('should clear property dependencies', () => {
      const tracker = new StateTracker();
      const element1 = new MockElement('el_1');
      const element2 = new MockElement('el_2');
      const state = new MockState('state_1');
      
      tracker.startTracking(element1);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.startTracking(element2);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.clearPropertyDependencies(state, 'count');
      
      const dependents = tracker.getDependents(state, 'count');
      test.assertEqual(dependents.size, 0);
      
      tracker.clear();
    });
    
    test.it('should clear all state dependencies', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.recordDependency(state, 'message');
      tracker.recordDependency(state, 'value');
      tracker.stopTracking();
      
      tracker.clearStateDependencies(state);
      
      test.assertEqual(tracker.getDependents(state, 'count').size, 0);
      test.assertEqual(tracker.getDependents(state, 'message').size, 0);
      test.assertEqual(tracker.getDependents(state, 'value').size, 0);
      
      tracker.clear();
    });
    
    test.it('should clear all dependencies', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.clear();
      
      test.assertEqual(tracker.dependencies.size, 0);
      test.assertEqual(tracker.elementDependencies.size, 0);
      test.assertFalse(tracker.tracking);
      test.assertNull(tracker.currentElement);
    });
  });

  test.describe('StateTracker: Nested Tracking', () => {
    test.it('should support nested tracking', () => {
      const tracker = new StateTracker();
      const element1 = new MockElement('el_1');
      const element2 = new MockElement('el_2');
      const state = new MockState('state_1');
      
      tracker.startTracking(element1);
      test.assertEqual(tracker.currentElement, element1);
      
      tracker.startTracking(element2);
      test.assertEqual(tracker.currentElement, element2);
      
      tracker.recordDependency(state, 'count');
      
      tracker.stopTracking();
      test.assertEqual(tracker.currentElement, element1);
      
      tracker.stopTracking();
      test.assertNull(tracker.currentElement);
      
      const dependents = tracker.getDependents(state, 'count');
      test.assertTrue(dependents.has(element2));
      test.assertFalse(dependents.has(element1));
      
      tracker.clear();
    });
    
    test.it('should maintain tracking stack correctly', () => {
      const tracker = new StateTracker();
      
      tracker.startTracking(new MockElement('el_1'));
      tracker.startTracking(new MockElement('el_2'));
      tracker.startTracking(new MockElement('el_3'));
      
      test.assertEqual(tracker.trackingStack.length, 2);
      
      tracker.stopTracking();
      test.assertEqual(tracker.trackingStack.length, 1);
      
      tracker.stopTracking();
      test.assertEqual(tracker.trackingStack.length, 0);
      
      tracker.stopTracking();
      test.assertEqual(tracker.trackingStack.length, 0);
      
      tracker.clear();
    });
  });

  test.describe('StateTracker: Statistics & Reporting', () => {
    test.it('should provide accurate statistics', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.recordDependency(state, 'message');
      tracker.stopTracking();
      
      const stats = tracker.getStats();
      
      test.assertEqual(stats.dependenciesTracked, 2);
      test.assertEqual(stats.totalDependencies, 2);
      test.assertEqual(stats.uniqueDependencyKeys, 2);
      test.assertEqual(stats.trackedElements, 1);
      test.assertEqual(stats.trackingSessionsStarted, 1);
      test.assertEqual(stats.trackingSessionsEnded, 1);
      
      tracker.clear();
    });
    
    test.it('should get dependency tree', () => {
      const tracker = new StateTracker();
      const element1 = new MockElement('el_1');
      const element2 = new MockElement('el_2');
      const state = new MockState('state_1');
      
      tracker.startTracking(element1);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.startTracking(element2);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      const tree = tracker.getDependencyTree();
      
      test.assertNotNull(tree['state_1.count']);
      test.assertEqual(tree['state_1.count'].length, 2);
      test.assertEqual(tree['state_1.count'][0].id, 'el_1');
      test.assertEqual(tree['state_1.count'][1].id, 'el_2');
      
      tracker.clear();
    });
    
    test.it('should get element dependency map', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.recordDependency(state, 'message');
      tracker.stopTracking();
      
      const map = tracker.getElementDependencyMap();
      
      test.assertNotNull(map['el_1']);
      test.assertEqual(map['el_1'].length, 2);
      test.assertTrue(map['el_1'].includes('state_1.count'));
      test.assertTrue(map['el_1'].includes('state_1.message'));
      
      tracker.clear();
    });
    
    test.it('should get detailed report', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      const report = tracker.getDetailedReport();
      
      test.assertNotNull(report.stats);
      test.assertNotNull(report.dependencyTree);
      test.assertNotNull(report.elementDependencies);
      test.assertNotNull(report.config);
      test.assertNotNull(report.timestamp);
      
      tracker.clear();
    });
    
    test.it('should reset statistics', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new MockState('state_1');
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.resetStats();
      
      const stats = tracker.getStats();
      
      test.assertEqual(stats.dependenciesTracked, 0);
      test.assertEqual(stats.trackingSessionsStarted, 0);
      test.assertEqual(stats.totalDependencies, 1);
      
      tracker.clear();
    });
  });

  test.describe('StateTracker: Configuration & Debug', () => {
    test.it('should enable/disable tracking', () => {
      const tracker = new StateTracker();
      
      tracker.setTrackingEnabled(false);
      
      test.assertFalse(tracker.config.enableTracking);
      
      const element = new MockElement('el_1');
      tracker.startTracking(element);
      
      test.assertFalse(tracker.tracking);
      
      tracker.clear();
    });
    
    test.it('should maintain debug log', () => {
      const debugTracker = new StateTracker({
        enableDebugLogging: true
      });
      
      const element = new MockElement('el_1');
      debugTracker.startTracking(element);
      debugTracker.stopTracking();
      
      const log = debugTracker.getDebugLog();
      
      test.assertGreaterThan(log.length, 0);
      test.assertNotNull(log[0].message);
      test.assertNotNull(log[0].timestamp);
      
      debugTracker.clear();
    });
    
    test.it('should clear debug log', () => {
      const debugTracker = new StateTracker({
        enableDebugLogging: true
      });
      
      debugTracker.startTracking(new MockElement('el_1'));
      
      test.assertGreaterThan(debugTracker.getDebugLog().length, 0);
      
      debugTracker.clearDebugLog();
      
      test.assertEqual(debugTracker.getDebugLog().length, 0);
      
      debugTracker.clear();
    });
  });

  test.describe('StateTracker: Real-World Scenarios', () => {
    test.it('should handle counter app scenario', () => {
      const tracker = new StateTracker();
      const counterElement = new MockElement('counter');
      const counterState = new MockState('counter_state');
      
      tracker.startTracking(counterElement);
      tracker.recordDependency(counterState, 'count');
      tracker.stopTracking();
      
      const notified = tracker.notifyPropertyChange(counterState, 'count');
      
      test.assertEqual(notified, 1);
      test.assertTrue(counterElement.dirty);
      
      tracker.clear();
    });
    
    test.it('should handle form with multiple fields', () => {
      const tracker = new StateTracker();
      const nameElement = new MockElement('name_field');
      const emailElement = new MockElement('email_field');
      const formElement = new MockElement('form');
      const formState = new MockState('form_state');
      
      tracker.startTracking(nameElement);
      tracker.recordDependency(formState, 'name');
      tracker.stopTracking();
      
      tracker.startTracking(emailElement);
      tracker.recordDependency(formState, 'email');
      tracker.stopTracking();
      
      tracker.startTracking(formElement);
      tracker.recordDependency(formState, 'name');
      tracker.recordDependency(formState, 'email');
      tracker.stopTracking();
      
      const nameNotified = tracker.notifyPropertyChange(formState, 'name');
      
      test.assertEqual(nameNotified, 2);
      test.assertTrue(nameElement.dirty);
      test.assertTrue(formElement.dirty);
      test.assertFalse(emailElement.dirty);
      
      tracker.clear();
    });
    
    test.it('should handle todo list filtering', () => {
      const tracker = new StateTracker();
      const listElement = new MockElement('todo_list');
      const filterElement = new MockElement('filter_controls');
      const todosState = new MockState('todos_state');
      
      tracker.startTracking(listElement);
      tracker.recordDependency(todosState, 'todos');
      tracker.recordDependency(todosState, 'filter');
      tracker.stopTracking();
      
      tracker.startTracking(filterElement);
      tracker.recordDependency(todosState, 'filter');
      tracker.stopTracking();
      
      tracker.notifyPropertyChange(todosState, 'todos');
      
      test.assertTrue(listElement.dirty);
      test.assertFalse(filterElement.dirty);
      
      listElement.dirty = false;
      
      tracker.notifyPropertyChange(todosState, 'filter');
      
      test.assertTrue(listElement.dirty);
      test.assertTrue(filterElement.dirty);
      
      tracker.clear();
    });
    
    test.it('should handle complex widget tree', () => {
      const tracker = new StateTracker();
      const headerElement = new MockElement('header');
      const bodyElement = new MockElement('body');
      const footerElement = new MockElement('footer');
      const appState = new MockState('app_state');
      
      tracker.startTracking(headerElement);
      tracker.recordDependency(appState, 'user');
      tracker.stopTracking();
      
      tracker.startTracking(bodyElement);
      tracker.recordDependency(appState, 'content');
      tracker.stopTracking();
      
      tracker.startTracking(footerElement);
      tracker.recordDependency(appState, 'meta');
      tracker.stopTracking();
      
      tracker.notifyPropertyChange(appState, 'content');
      
      test.assertFalse(headerElement.dirty);
      test.assertTrue(bodyElement.dirty);
      test.assertFalse(footerElement.dirty);
      
      tracker.clear();
    });
    
    test.it('should handle performance with many dependencies', () => {
      const tracker = new StateTracker();
      const state = new MockState('state_1');
      const elements = [];
      
      for (let i = 0; i < 100; i++) {
        const element = new MockElement(`el_${i}`);
        elements.push(element);
        
        tracker.startTracking(element);
        for (let j = 0; j < 10; j++) {
          tracker.recordDependency(state, `prop_${j}`);
        }
        tracker.stopTracking();
      }
      
      test.assertEqual(tracker.getTotalDependencies(), 1000);
      
      const notified = tracker.notifyPropertyChange(state, 'prop_0');
      
      test.assertEqual(notified, 100);
      
      tracker.clear();
    });
  });

  return test.summary();
}

// Run
runTests();