/**
 * MemoryManager Test Suite
 * 
 * Comprehensive tests for the FlutterJS Memory Manager
 */


import {  MemoryManager,
  MemoryProfiler} from "../src/memory_manager.js";

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

describe('MemoryManager', () => {
  let memoryManager;
  
  beforeEach(() => {
    memoryManager = new MemoryManager({
      enableLeakDetection: false, // Disable for most tests
      debugMode: false
    });
  });
  
  afterEach(() => {
    memoryManager.dispose();
  });
  
  describe('Initialization', () => {
    test('should create memory manager with default config', () => {
      const mm = new MemoryManager();
      
      expect(mm.config.enableLeakDetection).toBe(true);
      expect(mm.config.maxRetainedObjects).toBe(10000);
      expect(mm.stats.elementsCreated).toBe(0);
      
      mm.dispose();
    });
    
    test('should create with custom config', () => {
      const mm = new MemoryManager({
        enableLeakDetection: false,
        maxRetainedObjects: 5000,
        warnThreshold: 1000,
        debugMode: true
      });
      
      expect(mm.config.enableLeakDetection).toBe(false);
      expect(mm.config.maxRetainedObjects).toBe(5000);
      expect(mm.config.warnThreshold).toBe(1000);
      expect(mm.config.debugMode).toBe(true);
      
      mm.dispose();
    });
    
    test('should initialize statistics', () => {
      expect(memoryManager.stats.elementsCreated).toBe(0);
      expect(memoryManager.stats.elementsDisposed).toBe(0);
      expect(memoryManager.stats.vnodeCreated).toBe(0);
      expect(memoryManager.stats.listenersAttached).toBe(0);
    });
  });
  
  describe('Element Registration', () => {
    test('should register element', () => {
      const element = new MockElement('el_1');
      
      memoryManager.register(element);
      
      expect(memoryManager.stats.elementsCreated).toBe(1);
      expect(memoryManager.elementRefs.has('el_1')).toBe(true);
    });
    
    test('should throw error if element is null', () => {
      expect(() => {
        memoryManager.register(null);
      }).toThrow('Element is required');
    });
    
    test('should store element metadata', () => {
      const element = new MockElement('el_1');
      element.depth = 2;
      element.children = [new MockElement('child')];
      
      memoryManager.register(element);
      
      const metadata = memoryManager.getElementMetadata(element);
      
      expect(metadata.id).toBe('el_1');
      expect(metadata.depth).toBe(2);
      expect(metadata.hasChildren).toBe(true);
      expect(metadata.createdAt).toBeDefined();
    });
    
    test('should track multiple elements', () => {
      const elements = [];
      
      for (let i = 0; i < 10; i++) {
        const el = new MockElement(`el_${i}`);
        elements.push(el);
        memoryManager.register(el);
      }
      
      expect(memoryManager.stats.elementsCreated).toBe(10);
      expect(memoryManager.elementRefs.size).toBe(10);
    });
    
    test('should track peak element count', () => {
      for (let i = 0; i < 5; i++) {
        memoryManager.register(new MockElement(`el_${i}`));
      }
      
      expect(memoryManager.stats.peakElementCount).toBe(5);
      
      // Cleanup some
      const el = memoryManager.getElementById('el_0');
      memoryManager.unregister(el);
      memoryManager.performBatchCleanup();
      
      // Register more
      for (let i = 5; i < 8; i++) {
        memoryManager.register(new MockElement(`el_${i}`));
      }
      
      // Peak should still be tracked
      expect(memoryManager.stats.peakElementCount).toBeGreaterThanOrEqual(5);
    });
  });
  
  describe('Element Cleanup', () => {
    test('should unregister element', () => {
      const element = new MockElement('el_1');
      memoryManager.register(element);
      
      memoryManager.unregister(element);
      memoryManager.performBatchCleanup();
      
      expect(memoryManager.stats.elementsDisposed).toBe(1);
      expect(memoryManager.elementRefs.has('el_1')).toBe(false);
    });
    
    test('should batch cleanup multiple elements', () => {
      const elements = [];
      
      for (let i = 0; i < 5; i++) {
        const el = new MockElement(`el_${i}`);
        elements.push(el);
        memoryManager.register(el);
      }
      
      // Queue all for disposal
      elements.forEach(el => memoryManager.unregister(el));
      
      // Should be queued but not yet cleaned
      expect(memoryManager.disposalQueue.size).toBe(5);
      
      // Perform batch cleanup
      memoryManager.performBatchCleanup();
      
      expect(memoryManager.stats.elementsDisposed).toBe(5);
      expect(memoryManager.disposalQueue.size).toBe(0);
    });
    
    test('should clear element references on cleanup', () => {
      const element = new MockElement('el_1');
      element.vnode = createMockVNode('v1');
      element.domNode = new MockDOMElement();
      element.children = [new MockElement('child')];
      
      memoryManager.register(element);
      memoryManager.cleanupElement(element);
      
      expect(element.vnode).toBe(null);
      expect(element.domNode).toBe(null);
      expect(element.children).toEqual([]);
    });
    
    test('should handle cleanup errors gracefully', () => {
      const element = new MockElement('el_1');
      
      // Register with faulty disposable
      memoryManager.register(element);
      memoryManager.registerDisposable('el_1', () => {
        throw new Error('Cleanup failed');
      });
      
      // Should not throw
      expect(() => {
        memoryManager.cleanupElement(element);
      }).not.toThrow();
      
      expect(memoryManager.stats.elementsDisposed).toBe(1);
    });
  });
  
  describe('VNode Management', () => {
    test('should register VNode', () => {
      const element = new MockElement('el_1');
      const vnode = createMockVNode('v1');
      
      memoryManager.registerVNode(vnode, element);
      
      expect(memoryManager.stats.vnodeCreated).toBe(1);
      expect(memoryManager.getElementForVNode(vnode)).toBe(element);
    });
    
    test('should unregister VNode', () => {
      const element = new MockElement('el_1');
      const vnode = createMockVNode('v1');
      
      memoryManager.registerVNode(vnode, element);
      memoryManager.unregisterVNode(vnode);
      
      expect(memoryManager.stats.vnodeDisposed).toBe(1);
      expect(memoryManager.getElementForVNode(vnode)).toBe(null);
    });
    
    test('should generate unique VNode IDs', () => {
      const vnode1 = createMockVNode('v1');
      const vnode2 = createMockVNode('v2');
      
      const id1 = memoryManager.generateVNodeId(vnode1);
      const id2 = memoryManager.generateVNodeId(vnode2);
      
      expect(id1).not.toBe(id2);
      expect(vnode1._memoryId).toBe(id1);
      expect(vnode2._memoryId).toBe(id2);
    });
    
    test('should track peak VNode count', () => {
      const element = new MockElement('el_1');
      
      for (let i = 0; i < 3; i++) {
        memoryManager.registerVNode(createMockVNode(`v${i}`), element);
      }
      
      expect(memoryManager.stats.peakVNodeCount).toBeGreaterThanOrEqual(3);
    });
  });
  
  describe('Event Listener Tracking', () => {
    test('should track event listener', () => {
      const element = new MockElement('el_1');
      const target = new MockDOMElement();
      const handler = () => {};
      
      memoryManager.trackListener(element, target, 'click', handler);
      
      expect(memoryManager.stats.listenersAttached).toBe(1);
      
      const listeners = memoryManager.getListenersForElement(element);
      expect(listeners.length).toBe(1);
      expect(listeners[0].event).toBe('click');
    });
    
    test('should throw error with invalid listener params', () => {
      const element = new MockElement('el_1');
      
      expect(() => {
        memoryManager.trackListener(element, null, 'click', () => {});
      }).toThrow('All listener parameters are required');
    });
    
    test('should track multiple listeners', () => {
      const element = new MockElement('el_1');
      const target = new MockDOMElement();
      
      memoryManager.trackListener(element, target, 'click', () => {});
      memoryManager.trackListener(element, target, 'mouseenter', () => {});
      memoryManager.trackListener(element, target, 'mouseleave', () => {});
      
      const listeners = memoryManager.getListenersForElement(element);
      expect(listeners.length).toBe(3);
    });
    
    test('should remove all listeners', () => {
      const element = new MockElement('el_1');
      const target = new MockDOMElement();
      const handler1 = () => {};
      const handler2 = () => {};
      
      memoryManager.trackListener(element, target, 'click', handler1);
      memoryManager.trackListener(element, target, 'mouseenter', handler2);
      
      target.addEventListener('click', handler1);
      target.addEventListener('mouseenter', handler2);
      
      expect(target.listeners.get('click').length).toBe(1);
      expect(target.listeners.get('mouseenter').length).toBe(1);
      
      memoryManager.removeAllListeners(element);
      
      expect(memoryManager.stats.listenersRemoved).toBe(2);
      expect(target.listeners.get('click').length).toBe(0);
      expect(target.listeners.get('mouseenter').length).toBe(0);
    });
    
    test('should handle remove listeners gracefully if none exist', () => {
      const element = new MockElement('el_1');
      
      expect(() => {
        memoryManager.removeAllListeners(element);
      }).not.toThrow();
    });
  });
  
  describe('Disposable Registry', () => {
    test('should register disposable', () => {
      let cleanupCalled = false;
      
      memoryManager.registerDisposable('test_1', () => {
        cleanupCalled = true;
      });
      
      expect(memoryManager.disposableRegistry.has('test_1')).toBe(true);
    });
    
    test('should throw error with invalid disposable', () => {
      expect(() => {
        memoryManager.registerDisposable(null, () => {});
      }).toThrow('Valid ID and cleanup function required');
      
      expect(() => {
        memoryManager.registerDisposable('test', 'not a function');
      }).toThrow('Valid ID and cleanup function required');
    });
    
    test('should call disposable on cleanup', () => {
      const element = new MockElement('el_1');
      let cleanupCalled = false;
      
      memoryManager.register(element);
      memoryManager.registerDisposable('el_1', () => {
        cleanupCalled = true;
      });
      
      memoryManager.cleanupElement(element);
      
      expect(cleanupCalled).toBe(true);
      expect(memoryManager.disposableRegistry.has('el_1')).toBe(false);
    });
  });
  
  describe('State Tracking', () => {
    test('should track state', () => {
      const element = new MockElement('el_1');
      const state = { count: 0 };
      
      memoryManager.trackState(state, element);
      
      expect(memoryManager.stateRegistry.get(state)).toBe(element);
    });
    
    test('should cleanup state on element cleanup', () => {
      const element = new MockElement('el_1');
      const state = { count: 0 };
      
      element.state = state;
      memoryManager.register(element);
      memoryManager.trackState(state, element);
      
      memoryManager.cleanupElement(element);
      
      expect(memoryManager.stateRegistry.has(state)).toBe(false);
    });
  });
  
  describe('Leak Detection', () => {
    test('should start leak detection', () => {
      const mm = new MemoryManager({
        enableLeakDetection: true,
        leakDetectionInterval: 100
      });
      
      expect(mm.leakDetectionTimer).not.toBe(null);
      
      mm.dispose();
    });
    
    test('should stop leak detection', () => {
      const mm = new MemoryManager({
        enableLeakDetection: true
      });
      
      mm.stopLeakDetection();
      
      expect(mm.leakDetectionTimer).toBe(null);
      
      mm.dispose();
    });
    
    test('should detect unmounted elements as leaks', (done) => {
      const mm = new MemoryManager({
        enableLeakDetection: true,
        leakDetectionInterval: 100
      });
      
      // Create and register element
      const element = new MockElement('el_1');
      element.mount();
      mm.register(element);
      
      // Unmount but don't cleanup
      element.unmount();
      
      // Manually set old timestamp to simulate leak
      mm.elementRefs.get('el_1').registeredAt = Date.now() - 70000; // 70s ago
      
      // Wait for leak detection
      setTimeout(() => {
        const leaks = mm.detectLeaks();
        
        expect(leaks.length).toBeGreaterThan(0);
        expect(leaks[0].type).toBe('element');
        
        mm.dispose();
        done();
      }, 150);
    });
    
    test('should detect orphaned VNodes', () => {
      const mm = new MemoryManager({
        enableLeakDetection: true
      });
      
      const element = new MockElement('el_1');
      const vnode = createMockVNode('v1');
      
      mm.registerVNode(vnode, element);
      
      // Simulate old VNode
      const vnodeId = mm.generateVNodeId(vnode);
      mm.vnodeRefs.get(vnodeId).createdAt = Date.now() - 150000; // 150s ago
      
      const leaks = mm.detectLeaks();
      
      const vnodeLeaks = leaks.filter(l => l.type === 'vnode');
      expect(vnodeLeaks.length).toBeGreaterThan(0);
      
      mm.dispose();
    });
  });
  
  describe('Force Cleanup', () => {
    test('should force cleanup unmounted elements', () => {
      const elements = [];
      
      for (let i = 0; i < 5; i++) {
        const el = new MockElement(`el_${i}`);
        el.mount();
        elements.push(el);
        memoryManager.register(el);
      }
      
      // Unmount some
      elements[0].unmount();
      elements[2].unmount();
      elements[4].unmount();
      
      const cleaned = memoryManager.forceCleanupUnmounted();
      
      expect(cleaned).toBe(3);
      expect(memoryManager.elementRefs.size).toBe(2);
    });
  });
  
  describe('Statistics', () => {
    test('should provide accurate statistics', () => {
      // Create elements
      for (let i = 0; i < 3; i++) {
        memoryManager.register(new MockElement(`el_${i}`));
      }
      
      // Create VNodes
      const element = new MockElement('el_test');
      memoryManager.registerVNode(createMockVNode('v1'), element);
      memoryManager.registerVNode(createMockVNode('v2'), element);
      
      // Add listeners
      const target = new MockDOMElement();
      memoryManager.trackListener(element, target, 'click', () => {});
      
      const stats = memoryManager.getStats();
      
      expect(stats.elementsCreated).toBe(3);
      expect(stats.currentElements).toBe(3);
      expect(stats.vnodeCreated).toBe(2);
      expect(stats.listenersAttached).toBe(1);
    });
    
    test('should reset statistics', () => {
      memoryManager.register(new MockElement('el_1'));
      memoryManager.register(new MockElement('el_2'));
      
      expect(memoryManager.stats.elementsCreated).toBe(2);
      
      memoryManager.resetStats();
      
      expect(memoryManager.stats.elementsCreated).toBe(0);
      expect(memoryManager.stats.elementsDisposed).toBe(0);
    });
    
    test('should provide detailed report', () => {
      const element1 = new MockElement('el_1');
      element1.depth = 1;
      element1.children = [new MockElement('child')];
      
      const element2 = new MockElement('el_2');
      element2.state = { count: 0 };
      
      memoryManager.register(element1);
      memoryManager.register(element2);
      
      const report = memoryManager.getDetailedReport();
      
      expect(report.stats).toBeDefined();
      expect(report.elements.length).toBe(2);
      expect(report.config).toBeDefined();
      expect(report.timestamp).toBeDefined();
      
      const el1Report = report.elements.find(e => e.id === 'el_1');
      expect(el1Report.depth).toBe(1);
      expect(el1Report.childCount).toBe(1);
    });
  });
  
  describe('Clear and Dispose', () => {
    test('should clear all registries', () => {
      // Register multiple items
      for (let i = 0; i < 3; i++) {
        const element = new MockElement(`el_${i}`);
        memoryManager.register(element);
        memoryManager.registerVNode(createMockVNode(`v${i}`), element);
      }
      
      expect(memoryManager.elementRefs.size).toBeGreaterThan(0);
      
      memoryManager.clear();
      
      expect(memoryManager.elementRefs.size).toBe(0);
      expect(memoryManager.vnodeRefs.size).toBe(0);
      expect(memoryManager.disposableRegistry.size).toBe(0);
    });
    
    test('should dispose completely', () => {
      const mm = new MemoryManager({
        enableLeakDetection: true
      });
      
      mm.register(new MockElement('el_1'));
      
      mm.dispose();
      
      expect(mm.leakDetectionTimer).toBe(null);
      expect(mm.elementRefs.size).toBe(0);
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle null element in unregister', () => {
      expect(() => {
        memoryManager.unregister(null);
      }).not.toThrow();
    });
    
    test('should handle cleanup of already cleaned element', () => {
      const element = new MockElement('el_1');
      memoryManager.register(element);
      
      memoryManager.cleanupElement(element);
      memoryManager.cleanupElement(element); // Second time
      
      expect(memoryManager.stats.elementsDisposed).toBe(2); // Both calls counted
    });
    
    test('should handle missing metadata gracefully', () => {
      const element = new MockElement('el_1');
      
      const metadata = memoryManager.getElementMetadata(element);
      
      expect(metadata).toBe(null);
    });
  });
});

describe('MemoryProfiler', () => {
  let memoryManager;
  let profiler;
  
  beforeEach(() => {
    memoryManager = new MemoryManager({ enableLeakDetection: false });
    profiler = new MemoryProfiler(memoryManager);
  });
  
  afterEach(() => {
    memoryManager.dispose();
  });
  
  test('should take snapshot', () => {
    memoryManager.register(new MockElement('el_1'));
    
    const snapshot = profiler.takeSnapshot();
    
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.stats).toBeDefined();
    expect(snapshot.stats.elementsCreated).toBe(1);
  });
  
  test('should limit snapshots', () => {
    for (let i = 0; i < 60; i++) {
      profiler.takeSnapshot();
    }
    
    expect(profiler.snapshots.length).toBe(50);
  });
  
  test('should compare snapshots', () => {
    const snapshot1 = profiler.takeSnapshot();
    
    memoryManager.register(new MockElement('el_1'));
    memoryManager.register(new MockElement('el_2'));
    
    const snapshot2 = profiler.takeSnapshot();
    
    const diff = profiler.compareSnapshots(snapshot1, snapshot2);
    
    expect(diff.elementsCreated).toBe(2);
    expect(diff.currentElements).toBe(2);
  });
  
  test('should get growth trend', () => {
    profiler.takeSnapshot();
    
    memoryManager.register(new MockElement('el_1'));
    
    profiler.takeSnapshot();
    
    const trend = profiler.getTrend();
    
    expect(trend.elementsCreated).toBe(1);
  });
  
  test('should return null trend with insufficient snapshots', () => {
    const trend = profiler.getTrend();
    
    expect(trend).toBe(null);
  });
  
  test('should clear snapshots', () => {
    profiler.takeSnapshot();
    profiler.takeSnapshot();
    
    expect(profiler.snapshots.length).toBe(2);
    
    profiler.clear();
    
    expect(profiler.snapshots.length).toBe(0);
  });
});

// Run tests
if (typeof module !== 'undefined' && require.main === module) {
  console.log('Running MemoryManager tests...');
}