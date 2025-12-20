/**
 * State Test Suite
 * 
 * Comprehensive tests for FlutterJS State Management
 */

import {
  State,
  StateManager,
  UpdateBatcher,
  StateTracker,
  ReactiveState,
  StateObserver
} from "../src/state.js";

// Mock Element
class MockElement {
  constructor(id) {
    this.id = id;
    this.mounted = true;
    this.dirty = false;
    this.state = null;
    this.buildContext = () => ({ element: this });
  }
  
  markNeedsBuild() {
    this.dirty = true;
  }
}

// Mock Runtime
class MockRuntime {
  constructor() {
    this.stateManager = new StateManager(this);
  }
}

// Test State Implementation
class TestState extends State {
  constructor() {
    super();
    this.count = 0;
    this.message = 'hello';
  }
  
  build(context) {
    return { tag: 'div', children: [`Count: ${this.count}`] };
  }
  
  increment() {
    this.setState(() => {
      this.count++;
    });
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

  test.describe('State: Construction', () => {
    test.it('should create state with default properties', () => {
      const s = new State();
      
      test.assertNull(s._element);
      test.assertNull(s._widget);
      test.assertFalse(s._mounted);
      test.assertEqual(s._buildCount, 0);
    });
    
    test.it('should throw error if build not implemented', () => {
      const s = new State();
      
      test.assertThrows(() => {
        s.build({});
      });
    });
  });

  test.describe('State: Lifecycle', () => {
    test.it('should call initState', () => {
      const state = new TestState();
      let initCalled = false;
      
      state.initState = () => {
        initCalled = true;
      };
      
      state._init();
      
      test.assertTrue(initCalled);
      test.assertTrue(state._initStateCalled);
      test.assertTrue(state._mounted);
    });
    
    test.it('should not call initState twice', () => {
      const state = new TestState();
      let callCount = 0;
      
      state.initState = () => {
        callCount++;
      };
      
      state._init();
      state._init();
      
      test.assertEqual(callCount, 1);
    });
    
    test.it('should call dispose', () => {
      const state = new TestState();
      let disposeCalled = false;
      
      state.dispose = () => {
        disposeCalled = true;
      };
      
      state._mounted = true;
      state._dispose();
      
      test.assertTrue(disposeCalled);
      test.assertTrue(state._disposeCalled);
      test.assertFalse(state._mounted);
    });
    
    test.it('should not call dispose twice', () => {
      const state = new TestState();
      let callCount = 0;
      
      state.dispose = () => {
        callCount++;
      };
      
      state._mounted = true;
      state._dispose();
      state._dispose();
      
      test.assertEqual(callCount, 1);
    });
    
    test.it('should handle didUpdateWidget', () => {
      const state = new TestState();
      const oldWidget = { type: 'old' };
      let widgetReceived = null;
      
      state.didUpdateWidget = (oldW) => {
        widgetReceived = oldW;
      };
      
      state.didUpdateWidget(oldWidget);
      
      test.assertEqual(widgetReceived, oldWidget);
    });
  });

  test.describe('State: setState', () => {
    test.it('should update state with function', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      state._element = element;
      state._mounted = true;
      element.state = state;
      
      state.setState(() => {
        state.count = 42;
      });
      
      test.assertEqual(state.count, 42);
      test.assertTrue(element.dirty);
    });
    
    test.it('should update state with object', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      state._element = element;
      state._mounted = true;
      element.state = state;
      
      state.setState({ count: 99, message: 'updated' });
      
      test.assertEqual(state.count, 99);
      test.assertEqual(state.message, 'updated');
      test.assertTrue(element.dirty);
    });
    
    test.it('should warn on unmounted setState', () => {
      const state = new TestState();
      state._mounted = false;
      
      // Should not throw, just warn
      state.setState(() => {
        state.count++;
      });
      
      test.assertEqual(state.count, 0); // State should not update
    });
    
    test.it('should throw error on invalid setState param', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      state._element = element;
      state._mounted = true;
      element.state = state;
      
      test.assertThrows(() => {
        state.setState('invalid');
      });
    });
    
    test.it('should mark element for rebuild', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      element.dirty = false;
      state._element = element;
      state._mounted = true;
      element.state = state;
      
      state.setState(() => {
        state.count++;
      });
      
      test.assertTrue(element.dirty);
    });
  });

  test.describe('State: Getters', () => {
    test.it('should get context', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      state._element = element;
      
      const context = state.context;
      
      test.assertNotNull(context);
      test.assertEqual(context.element, element);
    });
    
    test.it('should return null context if no element', () => {
      const state = new TestState();
      state._element = null;
      
      test.assertNull(state.context);
    });
    
    test.it('should get mounted status', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      state._element = element;
      state._mounted = true;
      element.mounted = true;
      
      test.assertTrue(state.mounted);
      
      element.mounted = false;
      
      test.assertFalse(state.mounted);
    });
    
    test.it('should get widget', () => {
      const state = new TestState();
      const widget = { type: 'test' };
      state._widget = widget;
      
      test.assertEqual(state.widget, widget);
    });
  });

  test.describe('State: Statistics', () => {
    test.it('should provide state stats', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      state._element = element;
      state._mounted = true;
      element.mounted = true;
      state._buildCount = 5;
      state._initStateCalled = true;
      
      const stats = state.getStats();
      
      test.assertNotNull(stats);
      test.assertTrue(stats.mounted);
      test.assertEqual(stats.buildCount, 5);
      test.assertTrue(stats.initStateCalled);
      test.assertFalse(stats.disposeCalled);
    });
  });

  test.describe('StateManager: Registration', () => {
    test.it('should register state', () => {
      const runtime = new MockRuntime();
      const stateManager = runtime.stateManager;
      const state = new TestState();
      const element = new MockElement('el_1');
      
      stateManager.register(state, element);
      
      test.assertEqual(stateManager.stats.statesCreated, 1);
      test.assertEqual(stateManager.states.size, 1);
      test.assertEqual(state._element, element);
      
      stateManager.dispose();
    });
    
    test.it('should throw error without state or element', () => {
      const runtime = new MockRuntime();
      const stateManager = runtime.stateManager;
      
      test.assertThrows(() => {
        stateManager.register(null, new MockElement('el_1'));
      });
      
      test.assertThrows(() => {
        stateManager.register(new TestState(), null);
      });
      
      stateManager.dispose();
    });
    
    test.it('should track multiple states', () => {
      const runtime = new MockRuntime();
      const stateManager = runtime.stateManager;
      
      for (let i = 0; i < 5; i++) {
        const state = new TestState();
        const element = new MockElement(`el_${i}`);
        stateManager.register(state, element);
      }
      
      test.assertEqual(stateManager.states.size, 5);
      test.assertEqual(stateManager.stats.statesCreated, 5);
      
      stateManager.dispose();
    });
  });

  test.describe('StateManager: Unregistration', () => {
    test.it('should unregister state', () => {
      const runtime = new MockRuntime();
      const stateManager = runtime.stateManager;
      const state = new TestState();
      const element = new MockElement('el_1');
      
      stateManager.register(state, element);
      stateManager.unregister(state);
      
      test.assertEqual(stateManager.stats.statesDisposed, 1);
      test.assertNull(state._element);
      test.assertTrue(state._disposeCalled);
      
      stateManager.dispose();
    });
    
    test.it('should handle unregister of null state', () => {
      const runtime = new MockRuntime();
      const stateManager = runtime.stateManager;
      
      // Should not throw or error
      stateManager.unregister(null);
      
      test.assertEqual(stateManager.states.size, 0);
      
      stateManager.dispose();
    });
  });

  test.describe('StateManager: Statistics', () => {
    test.it('should provide accurate stats', () => {
      const runtime = new MockRuntime();
      const stateManager = runtime.stateManager;
      
      for (let i = 0; i < 3; i++) {
        const state = new TestState();
        const element = new MockElement(`el_${i}`);
        stateManager.register(state, element);
      }
      
      const stats = stateManager.getStats();
      
      test.assertEqual(stats.statesCreated, 3);
      test.assertEqual(stats.currentStates, 3);
      test.assertNotNull(stats.batcher);
      test.assertNotNull(stats.tracker);
      
      stateManager.dispose();
    });
  });

  test.describe('StateManager: Clear and Dispose', () => {
    test.it('should clear all states', () => {
      const runtime = new MockRuntime();
      const stateManager = runtime.stateManager;
      
      for (let i = 0; i < 3; i++) {
        stateManager.register(new TestState(), new MockElement(`el_${i}`));
      }
      
      stateManager.clear();
      
      test.assertEqual(stateManager.states.size, 0);
      stateManager.dispose();
    });
    
    test.it('should dispose state manager', () => {
      const runtime = new MockRuntime();
      const stateManager = runtime.stateManager;
      
      stateManager.register(new TestState(), new MockElement('el_1'));
      stateManager.dispose();
      
      test.assertEqual(stateManager.states.size, 0);
    });
  });

  test.describe('StateTracker: Dependency Tracking', () => {
    test.it('should start tracking', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      
      tracker.startTracking(element);
      
      test.assertTrue(tracker.tracking);
      test.assertEqual(tracker.currentElement, element);
    });
    
    test.it('should stop tracking', () => {
      const tracker = new StateTracker();
      tracker.startTracking(new MockElement('el_1'));
      tracker.stopTracking();
      
      test.assertFalse(tracker.tracking);
      test.assertNull(tracker.currentElement);
    });
    
    test.it('should record dependency', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new TestState();
      state._stateId = 'state_1';
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      
      const deps = tracker.getDependents(state, 'count');
      
      test.assertTrue(deps.has(element));
      test.assertEqual(tracker.stats.dependenciesTracked, 1);
    });
  });

  test.describe('StateTracker: Clear Dependencies', () => {
    test.it('should clear dependencies for element', () => {
      const tracker = new StateTracker();
      const element = new MockElement('el_1');
      const state = new TestState();
      state._stateId = 'state_1';
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.recordDependency(state, 'message');
      tracker.stopTracking();
      
      tracker.clearDependencies(element);
      
      test.assertEqual(tracker.getDependents(state, 'count').size, 0);
      test.assertEqual(tracker.getDependents(state, 'message').size, 0);
    });
  });

  test.describe('ReactiveState: Reactive Properties', () => {
    test.it('should make property reactive', () => {
      const state = new ReactiveState();
      
      state.makeReactive('count', 0);
      
      test.assertEqual(state.count, 0);
      test.assertTrue(state._reactiveProperties.has('count'));
    });
    
    test.it('should get and set reactive values', () => {
      const state = new ReactiveState();
      
      state.makeReactive('message', 'hello');
      
      test.assertEqual(state.getValue('message'), 'hello');
      
      state.setValue('message', 'world');
      
      test.assertEqual(state.getValue('message'), 'world');
    });
  });

  test.describe('StateObserver: Observation', () => {
    test.it('should observe state', () => {
      const observer = new StateObserver();
      const state = new TestState();
      state._stateId = 'state_1';
      const callback = () => {};
      
      observer.observe(state, callback);
      
      test.assertTrue(observer.observers.has('state_1'));
    });
    
    test.it('should notify observers', () => {
      const observer = new StateObserver();
      const state = new TestState();
      state._stateId = 'state_1';
      let notified = false;
      
      observer.observe(state, () => {
        notified = true;
      });
      observer.notify(state, 'count', 0, 1);
      
      test.assertTrue(notified);
    });
    
    test.it('should unobserve specific callback', () => {
      const observer = new StateObserver();
      const state = new TestState();
      state._stateId = 'state_1';
      let notified = false;
      
      const callback = () => {
        notified = true;
      };
      
      observer.observe(state, callback);
      observer.unobserve(state, callback);
      
      observer.notify(state, 'count', 0, 1);
      
      test.assertFalse(notified);
    });
    
    test.it('should clear all observers', () => {
      const observer = new StateObserver();
      const state = new TestState();
      state._stateId = 'state_1';
      
      observer.observe(state, () => {});
      observer.observe(new TestState(), () => {});
      
      observer.clear();
      
      test.assertEqual(observer.observers.size, 0);
    });
  });

  return test.summary();
}

// Run
runTests();