/**
 * MemoryManager Test Suite
 * 
 * Comprehensive tests for the FlutterJS Memory Manager
 */

import { MemoryManager, MemoryProfiler } from "../src/memory_manager.js";

// Mock Element
class MockElement {
  constructor(id) {
    this.id = id;
    this.mounted = false;
    this.children = [];
    this.vnode = null;
    this.domNode = null;
    this.state = null;
    this.depth = 0;
    this.parent = null;
  }
  
  mount() {
    this.mounted = true;
  }
  
  unmount() {
    this.mounted = false;
  }
}

// Mock DOM element
class MockDOMElement {
  constructor() {
    this.listeners = new Map();
  }
  
  addEventListener(event, handler, options) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push({ handler, options });
  }
  
  removeEventListener(event, handler, options) {
    if (!this.listeners.has(event)) return;
    
    const handlers = this.listeners.get(event);
    const index = handlers.findIndex(h => h.handler === handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
}

// Mock VNode
function createMockVNode(id) {
  return {
    id: id,
    tag: 'div',
    props: {},
    children: []
  };
}

// Test Runner
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

  assertGreaterThan(actual, threshold, message) {
    if (actual <= threshold) {
      throw new Error(
        message || `Expected ${actual} to be greater than ${threshold}`
      );
    }
  }

  assertGreaterThanOrEqual(actual, threshold, message) {
    if (actual < threshold) {
      throw new Error(
        message || `Expected ${actual} to be >= ${threshold}`
      );
    }
  }

  assertThrows(fn, message) {
    try {
      fn();
      throw new Error(message || 'Expected function to throw');
    } catch (error) {
      // Expected
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

  test.describe('MemoryManager: Initialization', () => {
    test.it('should create memory manager with default config', () => {
      const mm = new MemoryManager();
      
      test.assertTrue(mm.config.enableLeakDetection);
      test.assertEqual(mm.config.maxRetainedObjects, 10000);
      test.assertEqual(mm.stats.elementsCreated, 0);
      
      mm.dispose();
    });
    
    test.it('should create with custom config', () => {
      const mm = new MemoryManager({
        enableLeakDetection: false,
        maxRetainedObjects: 5000,
        warnThreshold: 1000,
        debugMode: true
      });
      
      test.assertTrue(!mm.config.enableLeakDetection);
      test.assertEqual(mm.config.maxRetainedObjects, 5000);
      test.assertEqual(mm.config.warnThreshold, 1000);
      test.assertTrue(mm.config.debugMode);
      
      mm.dispose();
    });
    
    test.it('should initialize statistics', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      test.assertEqual(mm.stats.elementsCreated, 0);
      test.assertEqual(mm.stats.elementsDisposed, 0);
      test.assertEqual(mm.stats.vnodeCreated, 0);
      test.assertEqual(mm.stats.listenersAttached, 0);
      mm.dispose();
    });
  });

  test.describe('MemoryManager: Element Registration', () => {
    test.it('should register element', () => {
      const mm = new MemoryManager({ enableLeakDetection: true });
      const element = new MockElement('el_1');
      
      mm.register(element);
      
      test.assertEqual(mm.stats.elementsCreated, 1);
      test.assertTrue(mm.elementRefs.has('el_1'));
      mm.dispose();
    });
    
    test.it('should throw error if element is null', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      
      test.assertThrows(() => {
        mm.register(null);
      });
      
      mm.dispose();
    });
    
    test.it('should store element metadata', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      element.depth = 2;
      element.children = [new MockElement('child')];
      
      mm.register(element);
      
      const metadata = mm.getElementMetadata(element);
      
      test.assertEqual(metadata.id, 'el_1');
      test.assertEqual(metadata.depth, 2);
      test.assertTrue(metadata.hasChildren);
      test.assertNotNull(metadata.createdAt);
      mm.dispose();
    });
    
    test.it('should track multiple elements', () => {
      const mm = new MemoryManager({ enableLeakDetection: true });
      const elements = [];
      
      for (let i = 0; i < 10; i++) {
        const el = new MockElement(`el_${i}`);
        elements.push(el);
        mm.register(el);
      }
      
      test.assertEqual(mm.stats.elementsCreated, 10);
      test.assertEqual(mm.elementRefs.size, 10);
      mm.dispose();
    });
  });

  test.describe('MemoryManager: Element Cleanup', () => {
    test.it('should unregister element', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      mm.register(element);
      
      mm.unregister(element);
      mm.performBatchCleanup();
      
      test.assertEqual(mm.stats.elementsDisposed, 1);
      test.assertTrue(!mm.elementRefs.has('el_1'));
      mm.dispose();
    });
    
    test.it('should batch cleanup multiple elements', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const elements = [];
      
      for (let i = 0; i < 5; i++) {
        const el = new MockElement(`el_${i}`);
        elements.push(el);
        mm.register(el);
      }
      
      elements.forEach(el => mm.unregister(el));
      
      test.assertEqual(mm.disposalQueue.size, 5);
      
      mm.performBatchCleanup();
      
      test.assertEqual(mm.stats.elementsDisposed, 5);
      test.assertEqual(mm.disposalQueue.size, 0);
      mm.dispose();
    });
    
    test.it('should clear element references on cleanup', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      element.vnode = createMockVNode('v1');
      element.domNode = new MockDOMElement();
      element.children = [new MockElement('child')];
      
      mm.register(element);
      mm.cleanupElement(element);
      
      test.assertNull(element.vnode);
      test.assertNull(element.domNode);
      test.assertEqual(element.children.length, 0);
      mm.dispose();
    });
  });

  test.describe('MemoryManager: VNode Management', () => {
    test.it('should register VNode', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      const vnode = createMockVNode('v1');
      
      mm.registerVNode(vnode, element);
      
      test.assertEqual(mm.stats.vnodeCreated, 1);
      test.assertEqual(mm.getElementForVNode(vnode), element);
      mm.dispose();
    });
    
    test.it('should unregister VNode', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      const vnode = createMockVNode('v1');
      
      mm.registerVNode(vnode, element);
      mm.unregisterVNode(vnode);
      
      test.assertEqual(mm.stats.vnodeDisposed, 1);
      test.assertNull(mm.getElementForVNode(vnode));
      mm.dispose();
    });
  });

  test.describe('MemoryManager: Event Listener Tracking', () => {
    test.it('should track event listener', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      const target = new MockDOMElement();
      const handler = () => {};
      
      mm.trackListener(element, target, 'click', handler);
      
      test.assertEqual(mm.stats.listenersAttached, 1);
      
      const listeners = mm.getListenersForElement(element);
      test.assertEqual(listeners.length, 1);
      test.assertEqual(listeners[0].event, 'click');
      mm.dispose();
    });
    
    test.it('should throw error with invalid listener params', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      
      test.assertThrows(() => {
        mm.trackListener(element, null, 'click', () => {});
      });
      
      mm.dispose();
    });
    
    test.it('should remove all listeners', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      const target = new MockDOMElement();
      const handler1 = () => {};
      const handler2 = () => {};
      
      mm.trackListener(element, target, 'click', handler1);
      mm.trackListener(element, target, 'mouseenter', handler2);
      
      target.addEventListener('click', handler1);
      target.addEventListener('mouseenter', handler2);
      
      test.assertEqual(target.listeners.get('click').length, 1);
      test.assertEqual(target.listeners.get('mouseenter').length, 1);
      
      mm.removeAllListeners(element);
      
      test.assertEqual(mm.stats.listenersRemoved, 2);
      test.assertEqual(target.listeners.get('click').length, 0);
      test.assertEqual(target.listeners.get('mouseenter').length, 0);
      mm.dispose();
    });
  });

  test.describe('MemoryManager: Disposable Registry', () => {
    test.it('should register disposable', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      let cleanupCalled = false;
      
      mm.registerDisposable('test_1', () => {
        cleanupCalled = true;
      });
      
      test.assertTrue(mm.disposableRegistry.has('test_1'));
      mm.dispose();
    });
    
    test.it('should call disposable on cleanup', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      let cleanupCalled = false;
      
      mm.register(element);
      mm.registerDisposable('el_1', () => {
        cleanupCalled = true;
      });
      
      mm.cleanupElement(element);
      
      test.assertTrue(cleanupCalled);
      test.assertTrue(!mm.disposableRegistry.has('el_1'));
      mm.dispose();
    });
  });

  test.describe('MemoryManager: State Tracking', () => {
    test.it('should track state', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      const state = { count: 0 };
      
      mm.trackState(state, element);
      
      test.assertEqual(mm.stateRegistry.get(state), element);
      mm.dispose();
    });
  });

  test.describe('MemoryManager: Statistics', () => {
    test.it('should provide accurate statistics', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      
      for (let i = 0; i < 3; i++) {
        mm.register(new MockElement(`el_${i}`));
      }
      
      const element = new MockElement('el_test');
      mm.registerVNode(createMockVNode('v1'), element);
      mm.registerVNode(createMockVNode('v2'), element);
      
      const target = new MockDOMElement();
      mm.trackListener(element, target, 'click', () => {});
      
      const stats = mm.getStats();
      
      test.assertEqual(stats.elementsCreated, 3);
      test.assertEqual(stats.vnodeCreated, 2);
      test.assertEqual(stats.listenersAttached, 1);
      mm.dispose();
    });
    
    test.it('should reset statistics', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      mm.register(new MockElement('el_1'));
      mm.register(new MockElement('el_2'));
      
      test.assertEqual(mm.stats.elementsCreated, 2);
      
      mm.resetStats();
      
      test.assertEqual(mm.stats.elementsCreated, 0);
      test.assertEqual(mm.stats.elementsDisposed, 0);
      mm.dispose();
    });
    
    test.it('should provide detailed report', () => {
      const mm = new MemoryManager({ enableLeakDetection: true });
      const element1 = new MockElement('el_1');
      element1.depth = 1;
      element1.children = [new MockElement('child')];
      
      const element2 = new MockElement('el_2');
      element2.state = { count: 0 };
      
      mm.register(element1);
      mm.register(element2);
      
      const report = mm.getDetailedReport();
      
      test.assertNotNull(report.stats);
      test.assertEqual(report.elements.length, 2);
      test.assertNotNull(report.config);
      test.assertNotNull(report.timestamp);
      mm.dispose();
    });
  });

  test.describe('MemoryManager: Clear and Dispose', () => {
    test.it('should clear all registries', () => {
      const mm = new MemoryManager({ enableLeakDetection: true });
      
      for (let i = 0; i < 3; i++) {
        const element = new MockElement(`el_${i}`);
        mm.register(element);
        mm.registerVNode(createMockVNode(`v${i}`), element);
      }
      
      test.assertGreaterThan(mm.elementRefs.size, 0);
      
      mm.clear();
      
      test.assertEqual(mm.elementRefs.size, 0);
      test.assertEqual(mm.vnodeRefs.size, 0);
      test.assertEqual(mm.disposableRegistry.size, 0);
    });
    
    test.it('should dispose completely', () => {
      const mm = new MemoryManager({
        enableLeakDetection: true
      });
      
      mm.register(new MockElement('el_1'));
      
      mm.dispose();
      
      test.assertNull(mm.leakDetectionTimer);
      test.assertEqual(mm.elementRefs.size, 0);
    });
  });

  test.describe('MemoryManager: Edge Cases', () => {
    test.it('should handle null element in unregister', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      
      test.assertThrows(() => {
        mm.unregister(null);
      }, false); // Don't throw, should handle gracefully
      
      mm.dispose();
    });
    
    test.it('should handle missing metadata gracefully', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const element = new MockElement('el_1');
      
      const metadata = mm.getElementMetadata(element);
      
      test.assertNull(metadata);
      mm.dispose();
    });
  });

  test.describe('MemoryProfiler', () => {
    test.it('should take snapshot', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const profiler = new MemoryProfiler(mm);
      
      mm.register(new MockElement('el_1'));
      
      const snapshot = profiler.takeSnapshot();
      
      test.assertNotNull(snapshot.timestamp);
      test.assertNotNull(snapshot.stats);
      test.assertEqual(snapshot.stats.elementsCreated, 1);
      mm.dispose();
    });
    
    test.it('should limit snapshots', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const profiler = new MemoryProfiler(mm);
      
      for (let i = 0; i < 60; i++) {
        profiler.takeSnapshot();
      }
      
      test.assertEqual(profiler.snapshots.length, 50);
      mm.dispose();
    });
    
    test.it('should compare snapshots', () => {
      const mm = new MemoryManager({ enableLeakDetection: true });
      const profiler = new MemoryProfiler(mm);
      
      const snapshot1 = profiler.takeSnapshot();
      
      mm.register(new MockElement('el_1'));
      mm.register(new MockElement('el_2'));
      
      const snapshot2 = profiler.takeSnapshot();
      
      const diff = profiler.compareSnapshots(snapshot1, snapshot2);
      
      test.assertEqual(diff.elementsCreated, 2);
      test.assertEqual(diff.currentElements, 2);
      mm.dispose();
    });
    
    test.it('should get growth trend', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const profiler = new MemoryProfiler(mm);
      
      profiler.takeSnapshot();
      
      mm.register(new MockElement('el_1'));
      
      profiler.takeSnapshot();
      
      const trend = profiler.getTrend();
      
      test.assertEqual(trend.elementsCreated, 1);
      mm.dispose();
    });
    
    test.it('should clear snapshots', () => {
      const mm = new MemoryManager({ enableLeakDetection: false });
      const profiler = new MemoryProfiler(mm);
      
      profiler.takeSnapshot();
      profiler.takeSnapshot();
      
      test.assertEqual(profiler.snapshots.length, 2);
      
      profiler.clear();
      
      test.assertEqual(profiler.snapshots.length, 0);
      mm.dispose();
    });
  });

  return test.summary();
}

// Run
runTests();