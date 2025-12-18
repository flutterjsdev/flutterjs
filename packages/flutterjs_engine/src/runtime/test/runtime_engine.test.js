/**
 * RuntimeEngine Test Suite
 * 
 * Comprehensive tests for the FlutterJS Runtime Engine
 */

const {
  RuntimeEngine,
  Element,
  StatelessElement,
  StatefulElement,
  InheritedElement
} = require('../src/runtime_engine');

// Test utilities
class TestWidget {
  constructor(key) {
    this.key = key;
  }
}

class StatelessWidget extends TestWidget {
  build(context) {
    return { tag: 'div', children: ['Stateless'] };
  }
}

class StatefulWidget extends TestWidget {
  createState() {
    return new State();
  }
}

class State {
  constructor() {
    this._element = null;
    this._widget = null;
    this.mounted = false;
  }
  
  initState() {
    this.mounted = true;
  }
  
  build(context) {
    return { tag: 'div', children: ['Stateful'] };
  }
  
  dispose() {
    this.mounted = false;
  }
}

class InheritedWidget extends TestWidget {
  constructor(key, child) {
    super(key);
    this.child = child;
  }
}

// Mock DOM for Node.js environment
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => ({
      tag,
      className: '',
      style: {},
      setAttribute: function(key, value) { this[key] = value; },
      appendChild: () => {},
      textContent: ''
    }),
    createTextNode: (text) => ({ nodeValue: text })
  };
  
  global.HTMLElement = class {};
  
  global.performance = {
    now: () => Date.now()
  };
  
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

// Test Suite
describe('RuntimeEngine', () => {
  let runtime;
  let container;
  
  beforeEach(() => {
    runtime = new RuntimeEngine();
    container = document.createElement('div');
    Element._counter = 0; // Reset counter
  });
  
  afterEach(() => {
    if (runtime.mounted) {
      runtime.unmount();
    }
    runtime.dispose();
  });
  
  describe('Initialization', () => {
    test('should create runtime with default state', () => {
      expect(runtime.mounted).toBe(false);
      expect(runtime.disposed).toBe(false);
      expect(runtime.dirtyElements.size).toBe(0);
      expect(runtime.frameCounter).toBe(0);
    });
    
    test('should have configuration options', () => {
      expect(runtime.config).toBeDefined();
      expect(runtime.config.batchUpdates).toBe(true);
      expect(runtime.config.debugMode).toBe(false);
    });
    
    test('should allow debug mode configuration', () => {
      runtime.setDebugMode(true);
      expect(runtime.config.debugMode).toBe(true);
    });
  });
  
  describe('Mount', () => {
    test('should mount simple stateless widget', () => {
      const widget = new StatelessWidget();
      
      runtime.mount(widget, container);
      
      expect(runtime.mounted).toBe(true);
      expect(runtime.rootWidget).toBe(widget);
      expect(runtime.rootElement).toBe(container);
      expect(runtime.elementTree).toBeDefined();
    });
    
    test('should mount stateful widget', () => {
      const widget = new StatefulWidget();
      
      runtime.mount(widget, container);
      
      expect(runtime.mounted).toBe(true);
      expect(runtime.elementTree).toBeInstanceOf(StatefulElement);
    });
    
    test('should throw error if already mounted', () => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      expect(() => {
        runtime.mount(widget, container);
      }).toThrow('Runtime already mounted');
    });
    
    test('should throw error if widget is null', () => {
      expect(() => {
        runtime.mount(null, container);
      }).toThrow('Root widget is required');
    });
    
    test('should throw error if container is invalid', () => {
      const widget = new StatelessWidget();
      
      expect(() => {
        runtime.mount(widget, null);
      }).toThrow('Valid container element is required');
    });
    
    test('should track build and render time', () => {
      const widget = new StatelessWidget();
      
      runtime.mount(widget, container);
      
      expect(runtime.buildTime).toBeGreaterThan(0);
      expect(runtime.renderTime).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Element Creation', () => {
    test('should create StatelessElement for StatelessWidget', () => {
      const widget = new StatelessWidget();
      const element = runtime.createElement(widget, null);
      
      expect(element).toBeInstanceOf(StatelessElement);
      expect(element.widget).toBe(widget);
      expect(element.parent).toBe(null);
      expect(element.runtime).toBe(runtime);
    });
    
    test('should create StatefulElement for StatefulWidget', () => {
      const widget = new StatefulWidget();
      const element = runtime.createElement(widget, null);
      
      expect(element).toBeInstanceOf(StatefulElement);
      expect(element.state).toBeDefined();
    });
    
    test('should create InheritedElement for InheritedWidget', () => {
      const widget = new InheritedWidget();
      const element = runtime.createElement(widget, null);
      
      expect(element).toBeInstanceOf(InheritedElement);
    });
    
    test('should throw error for unknown widget type', () => {
      const widget = { unknown: true };
      
      expect(() => {
        runtime.createElement(widget, null);
      }).toThrow('Unknown widget type');
    });
    
    test('should set parent reference', () => {
      const parentWidget = new StatelessWidget();
      const parent = runtime.createElement(parentWidget, null);
      
      const childWidget = new StatelessWidget();
      const child = runtime.createElement(childWidget, parent);
      
      expect(child.parent).toBe(parent);
    });
  });
  
  describe('Update Scheduling', () => {
    test('should schedule update when element marked dirty', (done) => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      const element = runtime.elementTree;
      
      expect(runtime.updateScheduled).toBe(false);
      
      runtime.markNeedsBuild(element);
      
      expect(runtime.updateScheduled).toBe(true);
      expect(runtime.dirtyElements.has(element)).toBe(true);
      
      setTimeout(() => {
        expect(runtime.updateScheduled).toBe(false);
        expect(runtime.dirtyElements.size).toBe(0);
        done();
      }, 20);
    });
    
    test('should not schedule duplicate updates', () => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      const element = runtime.elementTree;
      
      runtime.markNeedsBuild(element);
      const firstScheduled = runtime.updateScheduled;
      
      runtime.markNeedsBuild(element);
      
      expect(runtime.updateScheduled).toBe(firstScheduled);
    });
    
    test('should handle markNeedsBuild with null element', () => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      expect(() => {
        runtime.markNeedsBuild(null);
      }).not.toThrow();
    });
    
    test('should not schedule updates when not mounted', () => {
      runtime.markNeedsBuild(new Element({}, null, runtime));
      
      expect(runtime.updateScheduled).toBe(false);
    });
  });
  
  describe('Update Performance', () => {
    test('should rebuild dirty elements in order', (done) => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      const parent = runtime.elementTree;
      const child1 = runtime.createElement(new StatelessWidget(), parent);
      const child2 = runtime.createElement(new StatelessWidget(), parent);
      
      parent.children = [child1, child2];
      child1.mounted = true;
      child2.mounted = true;
      
      const rebuiltOrder = [];
      
      parent.rebuild = function() {
        rebuiltOrder.push('parent');
        Element.prototype.rebuild.call(this);
      };
      
      child1.rebuild = function() {
        rebuiltOrder.push('child1');
        Element.prototype.rebuild.call(this);
      };
      
      child2.rebuild = function() {
        rebuiltOrder.push('child2');
        Element.prototype.rebuild.call(this);
      };
      
      runtime.markNeedsBuild(child1);
      runtime.markNeedsBuild(parent);
      runtime.markNeedsBuild(child2);
      
      setTimeout(() => {
        // Parent should be rebuilt before children (sorted by depth)
        expect(rebuiltOrder[0]).toBe('parent');
        done();
      }, 20);
    });
    
    test('should track frame counter', (done) => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      const initialCount = runtime.frameCounter;
      
      runtime.markNeedsBuild(runtime.elementTree);
      
      setTimeout(() => {
        expect(runtime.frameCounter).toBe(initialCount + 1);
        done();
      }, 20);
    });
    
    test('should clear dirty elements after update', (done) => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      runtime.markNeedsBuild(runtime.elementTree);
      
      expect(runtime.dirtyElements.size).toBeGreaterThan(0);
      
      setTimeout(() => {
        expect(runtime.dirtyElements.size).toBe(0);
        done();
      }, 20);
    });
  });
  
  describe('Unmount', () => {
    test('should unmount application', () => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      runtime.unmount();
      
      expect(runtime.mounted).toBe(false);
      expect(runtime.elementTree).toBe(null);
      expect(runtime.dirtyElements.size).toBe(0);
    });
    
    test('should call element unmount', () => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      const element = runtime.elementTree;
      let unmountCalled = false;
      
      const originalUnmount = element.unmount;
      element.unmount = function() {
        unmountCalled = true;
        originalUnmount.call(this);
      };
      
      runtime.unmount();
      
      expect(unmountCalled).toBe(true);
    });
    
    test('should handle unmount when not mounted', () => {
      expect(() => {
        runtime.unmount();
      }).not.toThrow();
    });
    
    test('should clean up services', () => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      runtime.registerService('test', { value: 123 });
      expect(runtime.serviceRegistry.size).toBeGreaterThan(0);
      
      runtime.unmount();
      
      expect(runtime.serviceRegistry.size).toBe(0);
    });
  });
  
  describe('Lifecycle', () => {
    test('should call initState on StatefulWidget mount', () => {
      const widget = new StatefulWidget();
      let initStateCalled = false;
      
      const originalCreateState = widget.createState;
      widget.createState = function() {
        const state = originalCreateState.call(this);
        const originalInitState = state.initState;
        state.initState = function() {
          initStateCalled = true;
          originalInitState.call(this);
        };
        return state;
      };
      
      runtime.mount(widget, container);
      
      expect(initStateCalled).toBe(true);
    });
    
    test('should call dispose on unmount', () => {
      const widget = new StatefulWidget();
      runtime.mount(widget, container);
      
      const state = runtime.elementTree.state;
      expect(state.mounted).toBe(true);
      
      runtime.unmount();
      
      expect(state.mounted).toBe(false);
    });
  });
  
  describe('Services', () => {
    test('should register service', () => {
      const service = { name: 'TestService', value: 42 };
      
      runtime.registerService('test', service);
      
      expect(runtime.getService('test')).toBe(service);
    });
    
    test('should retrieve registered service', () => {
      runtime.registerService('theme', { color: 'blue' });
      
      const theme = runtime.getService('theme');
      
      expect(theme).toEqual({ color: 'blue' });
    });
    
    test('should return undefined for unknown service', () => {
      const service = runtime.getService('unknown');
      
      expect(service).toBeUndefined();
    });
  });
  
  describe('Statistics', () => {
    test('should provide performance stats', () => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      const stats = runtime.getStats();
      
      expect(stats.mounted).toBe(true);
      expect(stats.frameCount).toBeDefined();
      expect(stats.buildTime).toBeDefined();
      expect(stats.renderTime).toBeDefined();
    });
    
    test('should track dirty elements count', () => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      runtime.markNeedsBuild(runtime.elementTree);
      
      const stats = runtime.getStats();
      
      expect(stats.dirtyElements).toBeGreaterThan(0);
    });
  });
  
  describe('Dispose', () => {
    test('should dispose runtime', () => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      runtime.dispose();
      
      expect(runtime.disposed).toBe(true);
      expect(runtime.mounted).toBe(false);
      expect(runtime.rootWidget).toBe(null);
      expect(runtime.rootElement).toBe(null);
    });
    
    test('should not allow operations after dispose', () => {
      runtime.dispose();
      
      runtime.markNeedsBuild(new Element({}, null, runtime));
      
      // Should not schedule update
      expect(runtime.updateScheduled).toBe(false);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle errors during element rebuild', (done) => {
      const widget = new StatelessWidget();
      runtime.mount(widget, container);
      
      const element = runtime.elementTree;
      
      // Make rebuild throw error
      element.rebuild = () => {
        throw new Error('Rebuild failed');
      };
      
      runtime.markNeedsBuild(element);
      
      // Should not crash runtime
      setTimeout(() => {
        expect(runtime.mounted).toBe(true);
        done();
      }, 20);
    });
    
    test('should cleanup on mount failure', () => {
      const widget = {
        constructor: { name: 'InvalidWidget' }
      };
      
      expect(() => {
        runtime.mount(widget, container);
      }).toThrow();
      
      expect(runtime.mounted).toBe(false);
      expect(runtime.dirtyElements.size).toBe(0);
    });
  });
});

describe('Element', () => {
  let runtime;
  
  beforeEach(() => {
    runtime = new RuntimeEngine();
    Element._counter = 0;
  });
  
  describe('Creation', () => {
    test('should create element with properties', () => {
      const widget = new StatelessWidget('key1');
      const element = new Element(widget, null, runtime);
      
      expect(element.widget).toBe(widget);
      expect(element.parent).toBe(null);
      expect(element.runtime).toBe(runtime);
      expect(element.key).toBe('key1');
    });
    
    test('should calculate depth from parent', () => {
      const widget1 = new StatelessWidget();
      const parent = new Element(widget1, null, runtime);
      
      const widget2 = new StatelessWidget();
      const child = new Element(widget2, parent, runtime);
      
      expect(parent.depth).toBe(0);
      expect(child.depth).toBe(1);
    });
    
    test('should generate unique IDs', () => {
      const widget1 = new StatelessWidget();
      const element1 = new Element(widget1, null, runtime);
      
      const widget2 = new StatelessWidget();
      const element2 = new Element(widget2, null, runtime);
      
      expect(element1.id).not.toBe(element2.id);
    });
  });
  
  describe('Lifecycle', () => {
    test('should mount element', () => {
      const widget = new StatelessWidget();
      const element = new StatelessElement(widget, null, runtime);
      
      element.mount();
      
      expect(element.mounted).toBe(true);
      expect(element.vnode).toBeDefined();
    });
    
    test('should unmount element and children', () => {
      const widget = new StatelessWidget();
      const element = new StatelessElement(widget, null, runtime);
      
      const childWidget = new StatelessWidget();
      const child = new StatelessElement(childWidget, element, runtime);
      
      element.children = [child];
      element.mount();
      child.mount();
      
      element.unmount();
      
      expect(element.mounted).toBe(false);
      expect(element.children.length).toBe(0);
      expect(element.domNode).toBe(null);
    });
  });
});

// Run tests if in Node.js
if (typeof module !== 'undefined' && require.main === module) {
  console.log('Running RuntimeEngine tests...');
  // You would integrate with a test runner like Jest here
}