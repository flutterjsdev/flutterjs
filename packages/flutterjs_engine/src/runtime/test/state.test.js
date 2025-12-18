/**
 * State Test Suite
 * 
 * Comprehensive tests for FlutterJS State Management
 */

const {
  State,
  StateManager,
  UpdateBatcher,
  StateTracker,
  ReactiveState,
  StateObserver
} = require('../src/state');

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

describe('State', () => {
  let state;
  let element;
  
  beforeEach(() => {
    state = new TestState();
    element = new MockElement('el_1');
    state._element = element;
    element.state = state;
  });
  
  describe('Construction', () => {
    test('should create state with default properties', () => {
      const s = new State();
      
      expect(s._element).toBe(null);
      expect(s._widget).toBe(null);
      expect(s._mounted).toBe(false);
      expect(s._buildCount).toBe(0);
    });
    
    test('should throw error if build not implemented', () => {
      const s = new State();
      
      expect(() => {
        s.build({});
      }).toThrow('must be implemented');
    });
  });
  
  describe('Lifecycle', () => {
    test('should call initState', () => {
      let initCalled = false;
      
      state.initState = () => {
        initCalled = true;
      };
      
      state._init();
      
      expect(initCalled).toBe(true);
      expect(state._initStateCalled).toBe(true);
      expect(state._mounted).toBe(true);
    });
    
    test('should not call initState twice', () => {
      let callCount = 0;
      
      state.initState = () => {
        callCount++;
      };
      
      state._init();
      state._init();
      
      expect(callCount).toBe(1);
    });
    
    test('should call dispose', () => {
      let disposeCalled = false;
      
      state.dispose = () => {
        disposeCalled = true;
      };
      
      state._mounted = true;
      state._dispose();
      
      expect(disposeCalled).toBe(true);
      expect(state._disposeCalled).toBe(true);
      expect(state._mounted).toBe(false);
    });
    
    test('should not call dispose twice', () => {
      let callCount = 0;
      
      state.dispose = () => {
        callCount++;
      };
      
      state._mounted = true;
      state._dispose();
      state._dispose();
      
      expect(callCount).toBe(1);
    });
    
    test('should handle didUpdateWidget', () => {
      const oldWidget = { type: 'old' };
      let widgetReceived = null;
      
      state.didUpdateWidget = (oldW) => {
        widgetReceived = oldW;
      };
      
      state.didUpdateWidget(oldWidget);
      
      expect(widgetReceived).toBe(oldWidget);
    });
  });
  
  describe('setState', () => {
    beforeEach(() => {
      state._mounted = true;
    });
    
    test('should update state with function', () => {
      state.setState(() => {
        state.count = 42;
      });
      
      expect(state.count).toBe(42);
      expect(element.dirty).toBe(true);
    });
    
    test('should update state with object', () => {
      state.setState({ count: 99, message: 'updated' });
      
      expect(state.count).toBe(99);
      expect(state.message).toBe('updated');
      expect(element.dirty).toBe(true);
    });
    
    test('should warn on unmounted setState', () => {
      state._mounted = false;
      
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      state.setState(() => {
        state.count++;
      });
      
      expect(warnSpy).toHaveBeenCalled();
      expect(element.dirty).toBe(false);
      
      warnSpy.mockRestore();
    });
    
    test('should warn on setState during build', () => {
      state._building = true;
      
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      state.setState(() => {
        state.count++;
      });
      
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });
    
    test('should throw error on invalid setState param', () => {
      expect(() => {
        state.setState('invalid');
      }).toThrow('setState accepts function or object');
    });
    
    test('should handle setState with undefined', () => {
      expect(() => {
        state.setState(undefined);
      }).not.toThrow();
    });
    
    test('should mark element for rebuild', () => {
      element.dirty = false;
      
      state.setState(() => {
        state.count++;
      });
      
      expect(element.dirty).toBe(true);
    });
    
    test('should handle setState error gracefully', () => {
      expect(() => {
        state.setState(() => {
          throw new Error('Update failed');
        });
      }).toThrow('Update failed');
    });
  });
  
  describe('Getters', () => {
    test('should get context', () => {
      const context = state.context;
      
      expect(context).toBeDefined();
      expect(context.element).toBe(element);
    });
    
    test('should return null context if no element', () => {
      state._element = null;
      
      expect(state.context).toBe(null);
    });
    
    test('should get mounted status', () => {
      state._mounted = true;
      element.mounted = true;
      
      expect(state.mounted).toBe(true);
      
      element.mounted = false;
      
      expect(state.mounted).toBe(false);
    });
    
    test('should get widget', () => {
      const widget = { type: 'test' };
      state._widget = widget;
      
      expect(state.widget).toBe(widget);
    });
  });
  
  describe('Statistics', () => {
    test('should provide state stats', () => {
      state._mounted = true;
      state._buildCount = 5;
      state._initStateCalled = true;
      
      const stats = state.getStats();
      
      expect(stats.mounted).toBe(true);
      expect(stats.buildCount).toBe(5);
      expect(stats.initStateCalled).toBe(true);
      expect(stats.disposeCalled).toBe(false);
    });
  });
});

describe('StateManager', () => {
  let runtime;
  let stateManager;
  
  beforeEach(() => {
    runtime = new MockRuntime();
    stateManager = runtime.stateManager;
  });
  
  afterEach(() => {
    stateManager.dispose();
  });
  
  describe('Registration', () => {
    test('should register state', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      
      stateManager.register(state, element);
      
      expect(stateManager.stats.statesCreated).toBe(1);
      expect(stateManager.states.size).toBe(1);
      expect(state._element).toBe(element);
    });
    
    test('should throw error without state or element', () => {
      expect(() => {
        stateManager.register(null, new MockElement('el_1'));
      }).toThrow('State and element are required');
      
      expect(() => {
        stateManager.register(new TestState(), null);
      }).toThrow('State and element are required');
    });
    
    test('should generate unique state ID', () => {
      const state1 = new TestState();
      const state2 = new TestState();
      
      const id1 = stateManager.generateStateId(state1);
      const id2 = stateManager.generateStateId(state2);
      
      expect(id1).not.toBe(id2);
      expect(state1._stateId).toBe(id1);
    });
    
    test('should track multiple states', () => {
      for (let i = 0; i < 5; i++) {
        const state = new TestState();
        const element = new MockElement(`el_${i}`);
        stateManager.register(state, element);
      }
      
      expect(stateManager.states.size).toBe(5);
      expect(stateManager.stats.statesCreated).toBe(5);
    });
  });
  
  describe('Unregistration', () => {
    test('should unregister state', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      
      stateManager.register(state, element);
      stateManager.unregister(state);
      
      expect(stateManager.stats.statesDisposed).toBe(1);
      expect(state._element).toBe(null);
      expect(state._disposeCalled).toBe(true);
    });
    
    test('should handle unregister of null state', () => {
      expect(() => {
        stateManager.unregister(null);
      }).not.toThrow();
    });
    
    test('should call dispose on unregister', () => {
      const state = new TestState();
      const element = new MockElement('el_1');
      
      let disposeCalled = false;
      state.dispose = () => {
        disposeCalled = true;
      };
      
      stateManager.register(state, element);
      stateManager.unregister(state);
      
      expect(disposeCalled).toBe(true);
    });
  });
  
  describe('setState Handling', () => {
    test('should handle setState with batching enabled', () => {
      stateManager.config.enableBatching = true;
      
      const state = new TestState();
      const element = new MockElement('el_1');
      state._element = element;
      state._mounted = true;
      
      stateManager.register(state, element);
      
      const updateFn = jest.fn();
      stateManager.handleSetState(state, updateFn);
      
      expect(stateManager.stats.setStateCalls).toBe(1);
      expect(stateManager.updateBatcher.pendingUpdates.size).toBeGreaterThan(0);
    });
    
    test('should handle setState with batching disabled', () => {
      stateManager.config.enableBatching = false;
      
      const state = new TestState();
      const element = new MockElement('el_1');
      state._element = element;
      state._mounted = true;
      
      stateManager.register(state, element);
      
      const updateFn = jest.fn();
      stateManager.handleSetState(state, updateFn);
      
      expect(updateFn).toHaveBeenCalled();
      expect(element.dirty).toBe(true);
    });
    
    test('should not handle setState for unmounted state', () => {
      const state = new TestState();
      state._mounted = false;
      
      const updateFn = jest.fn();
      stateManager.handleSetState(state, updateFn);
      
      expect(updateFn).not.toHaveBeenCalled();
    });
  });
  
  describe('Statistics', () => {
    test('should provide accurate stats', () => {
      for (let i = 0; i < 3; i++) {
        const state = new TestState();
        const element = new MockElement(`el_${i}`);
        stateManager.register(state, element);
      }
      
      const stats = stateManager.getStats();
      
      expect(stats.statesCreated).toBe(3);
      expect(stats.currentStates).toBe(3);
      expect(stats.batcher).toBeDefined();
      expect(stats.tracker).toBeDefined();
    });
  });
  
  describe('Clear and Dispose', () => {
    test('should clear all states', () => {
      for (let i = 0; i < 3; i++) {
        stateManager.register(new TestState(), new MockElement(`el_${i}`));
      }
      
      stateManager.clear();
      
      expect(stateManager.states.size).toBe(0);
    });
    
    test('should dispose state manager', () => {
      stateManager.register(new TestState(), new MockElement('el_1'));
      
      stateManager.dispose();
      
      expect(stateManager.states.size).toBe(0);
    });
  });
});

describe('UpdateBatcher', () => {
  let stateManager;
  let batcher;
  
  beforeEach(() => {
    stateManager = new StateManager(new MockRuntime());
    batcher = stateManager.updateBatcher;
  });
  
  describe('Update Batching', () => {
    test('should queue update', () => {
      const element = new MockElement('el_1');
      const updateFn = jest.fn();
      
      batcher.queueUpdate(element, updateFn);
      
      expect(batcher.pendingUpdates.size).toBe(1);
      expect(batcher.updateScheduled).toBe(true);
    });
    
    test('should batch multiple updates for same element', () => {
      const element = new MockElement('el_1');
      
      batcher.queueUpdate(element, jest.fn());
      batcher.queueUpdate(element, jest.fn());
      batcher.queueUpdate(element, jest.fn());
      
      const updates = batcher.pendingUpdates.get(element);
      expect(updates.length).toBe(3);
    });
    
    test('should flush updates', (done) => {
      const element = new MockElement('el_1');
      const state = new TestState();
      state._element = element;
      state._mounted = true;
      element.state = state;
      
      const updateFn = () => {
        state.count++;
      };
      
      batcher.queueUpdate(element, updateFn);
      
      setTimeout(() => {
        expect(state.count).toBe(1);
        expect(element.dirty).toBe(true);
        expect(batcher.pendingUpdates.size).toBe(0);
        done();
      }, 10);
    });
    
    test('should apply all updates in batch', (done) => {
      const element = new MockElement('el_1');
      const state = new TestState();
      state._element = element;
      state._mounted = true;
      element.state = state;
      
      batcher.queueUpdate(element, () => state.count++);
      batcher.queueUpdate(element, () => state.count++);
      batcher.queueUpdate(element, () => state.count++);
      
      setTimeout(() => {
        expect(state.count).toBe(3);
        expect(batcher.stats.updatesInLastBatch).toBe(3);
        done();
      }, 10);
    });
    
    test('should handle errors in update functions', (done) => {
      const element = new MockElement('el_1');
      const state = new TestState();
      state._element = element;
      state._mounted = true;
      element.state = state;
      
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      batcher.queueUpdate(element, () => {
        throw new Error('Update failed');
      });
      
      setTimeout(() => {
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
        done();
      }, 10);
    });
    
    test('should not update unmounted elements', (done) => {
      const element = new MockElement('el_1');
      element.mounted = false;
      
      batcher.queueUpdate(element, jest.fn());
      
      setTimeout(() => {
        expect(element.dirty).toBe(false);
        done();
      }, 10);
    });
  });
  
  describe('Statistics', () => {
    test('should track batch statistics', () => {
      const stats = batcher.getStats();
      
      expect(stats.batchesExecuted).toBeDefined();
      expect(stats.pendingElements).toBeDefined();
      expect(stats.updateScheduled).toBeDefined();
    });
  });
  
  describe('Clear', () => {
    test('should clear pending updates for element', () => {
      const element = new MockElement('el_1');
      
      batcher.queueUpdate(element, jest.fn());
      batcher.clear(element);
      
      expect(batcher.pendingUpdates.has(element)).toBe(false);
    });
    
    test('should clear all pending updates', () => {
      batcher.queueUpdate(new MockElement('el_1'), jest.fn());
      batcher.queueUpdate(new MockElement('el_2'), jest.fn());
      
      batcher.clear();
      
      expect(batcher.pendingUpdates.size).toBe(0);
    });
  });
});

describe('StateTracker', () => {
  let tracker;
  
  beforeEach(() => {
    tracker = new StateTracker();
  });
  
  describe('Dependency Tracking', () => {
    test('should start tracking', () => {
      const element = new MockElement('el_1');
      
      tracker.startTracking(element);
      
      expect(tracker.tracking).toBe(true);
      expect(tracker.currentElement).toBe(element);
    });
    
    test('should stop tracking', () => {
      tracker.startTracking(new MockElement('el_1'));
      tracker.stopTracking();
      
      expect(tracker.tracking).toBe(false);
      expect(tracker.currentElement).toBe(null);
    });
    
    test('should record dependency', () => {
      const element = new MockElement('el_1');
      const state = new TestState();
      state._stateId = 'state_1';
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      
      const deps = tracker.getDependents(state, 'count');
      
      expect(deps.has(element)).toBe(true);
      expect(tracker.stats.dependenciesTracked).toBe(1);
    });
    
    test('should not record dependency when not tracking', () => {
      const state = new TestState();
      state._stateId = 'state_1';
      
      tracker.recordDependency(state, 'count');
      
      const deps = tracker.getDependents(state, 'count');
      
      expect(deps.size).toBe(0);
    });
    
    test('should get dependents for property', () => {
      const element1 = new MockElement('el_1');
      const element2 = new MockElement('el_2');
      const state = new TestState();
      state._stateId = 'state_1';
      
      tracker.startTracking(element1);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      tracker.startTracking(element2);
      tracker.recordDependency(state, 'count');
      tracker.stopTracking();
      
      const deps = tracker.getDependents(state, 'count');
      
      expect(deps.size).toBe(2);
      expect(deps.has(element1)).toBe(true);
      expect(deps.has(element2)).toBe(true);
    });
  });
  
  describe('Clear Dependencies', () => {
    test('should clear dependencies for element', () => {
      const element = new MockElement('el_1');
      const state = new TestState();
      state._stateId = 'state_1';
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      tracker.recordDependency(state, 'message');
      tracker.stopTracking();
      
      tracker.clearDependencies(element);
      
      expect(tracker.getDependents(state, 'count').size).toBe(0);
      expect(tracker.getDependents(state, 'message').size).toBe(0);
    });
    
    test('should clear all dependencies', () => {
      const element = new MockElement('el_1');
      const state = new TestState();
      state._stateId = 'state_1';
      
      tracker.startTracking(element);
      tracker.recordDependency(state, 'count');
      
      tracker.clear();
      
      expect(tracker.dependencies.size).toBe(0);
      expect(tracker.tracking).toBe(false);
    });
  });
  
  describe('Statistics', () => {
    test('should provide tracking stats', () => {
      const stats = tracker.getStats();
      
      expect(stats.dependenciesTracked).toBeDefined();
      expect(stats.totalDependencies).toBeDefined();
      expect(stats.isTracking).toBeDefined();
    });
  });
});

describe('ReactiveState', () => {
  let state;
  let element;
  let runtime;
  
  beforeEach(() => {
    state = new ReactiveState();
    element = new MockElement('el_1');
    runtime = new MockRuntime();
    
    state._element = element;
    element.state = state;
    element.runtime = runtime;
  });
  
  describe('Reactive Properties', () => {
    test('should make property reactive', () => {
      state.makeReactive('count', 0);
      
      expect(state.count).toBe(0);
      expect(state._reactiveProperties.has('count')).toBe(true);
    });
    
    test('should track property access', () => {
      state.makeReactive('count', 0);
      
      runtime.stateManager.stateTracker.startTracking(element);
      
      const value = state.count; // Access triggers tracking
      
      expect(value).toBe(0);
    });
    
    test('should trigger updates on property change', () => {
      state.makeReactive('count', 0);
      
      state.count = 5;
      
      expect(state.count).toBe(5);
    });
    
    test('should get and set reactive values', () => {
      state.makeReactive('message', 'hello');
      
      expect(state.getValue('message')).toBe('hello');
      
      state.setValue('message', 'world');
      
      expect(state.getValue('message')).toBe('world');
    });
  });
});

describe('StateObserver', () => {
  let observer;
  let state;
  
  beforeEach(() => {
    observer = new StateObserver();
    state = new TestState();
    state._stateId = 'state_1';
  });
  
  describe('Observation', () => {
    test('should observe state', () => {
      const callback = jest.fn();
      
      observer.observe(state, callback);
      
      expect(observer.observers.has('state_1')).toBe(true);
    });
    
    test('should notify observers', () => {
      const callback = jest.fn();
      
      observer.observe(state, callback);
      observer.notify(state, 'count', 0, 1);
      
      expect(callback).toHaveBeenCalledWith(state, 'count', 0, 1);
    });
    
    test('should handle multiple observers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      observer.observe(state, callback1);
      observer.observe(state, callback2);
      
      observer.notify(state, 'count', 0, 1);
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
    
    test('should unobserve specific callback', () => {
      const callback = jest.fn();
      
      observer.observe(state, callback);
      observer.unobserve(state, callback);
      
      observer.notify(state, 'count', 0, 1);
      
      expect(callback).not.toHaveBeenCalled();
    });
    
    test('should unobserve all callbacks for state', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      observer.observe(state, callback1);
      observer.observe(state, callback2);
      
      observer.unobserve(state);
      
      observer.notify(state, 'count', 0, 1);
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
    
    test('should clear all observers', () => {
      observer.observe(state, jest.fn());
      observer.observe(new TestState(), jest.fn());
      
      observer.clear();
      
      expect(observer.observers.size).toBe(0);
    });
    
    test('should handle observer callback errors', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const callback = () => {
        throw new Error('Observer failed');
      };
      
      observer.observe(state, callback);
      observer.notify(state, 'count', 0, 1);
      
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});

// Run tests
if (typeof module !== 'undefined' && require.main === module) {
  console.log('Running State tests...');
}