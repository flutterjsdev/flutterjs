/**
 * RuntimeEngine Integration Tests
 * 
 * Real-world scenarios testing the complete runtime system
 */

const {
  RuntimeEngine,
  StatelessElement,
  StatefulElement
} = require('./runtime-engine');

// Mock DOM
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => ({
      tag,
      className: '',
      style: {},
      children: [],
      setAttribute: function(key, value) { this[key] = value; },
      appendChild: function(child) { this.children.push(child); },
      get firstChild() { return this.children[0]; },
      textContent: ''
    }),
    createTextNode: (text) => ({ nodeValue: text })
  };
  
  global.HTMLElement = class {};
  global.performance = { now: () => Date.now() };
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

// Real-world Widget Examples
class Text {
  constructor(text, { key, style } = {}) {
    this.text = text;
    this.key = key;
    this.style = style;
  }
  
  build(context) {
    return {
      tag: 'span',
      props: { className: 'fjs-text' },
      style: this.style,
      children: [this.text]
    };
  }
}

class Container {
  constructor({ child, padding, backgroundColor, key }) {
    this.child = child;
    this.padding = padding;
    this.backgroundColor = backgroundColor;
    this.key = key;
  }
  
  build(context) {
    return {
      tag: 'div',
      props: { className: 'fjs-container' },
      style: {
        padding: this.padding,
        backgroundColor: this.backgroundColor
      },
      children: this.child ? [this.child.build(context)] : []
    };
  }
}

class Column {
  constructor({ children, key }) {
    this.children = children || [];
    this.key = key;
  }
  
  build(context) {
    return {
      tag: 'div',
      props: { className: 'fjs-column' },
      style: {
        display: 'flex',
        flexDirection: 'column'
      },
      children: this.children.map(child => child.build(context))
    };
  }
}

// StatelessWidget Example
class MyApp {
  constructor() {
    this.key = 'app';
  }
  
  build(context) {
    return new Container({
      padding: '16px',
      backgroundColor: '#ffffff',
      child: new Column({
        children: [
          new Text('Hello World', { style: { fontSize: '24px' } }),
          new Text('FlutterJS Runtime', { style: { fontSize: '16px' } })
        ]
      })
    }).build(context);
  }
}

MyApp.prototype.constructor.name = 'StatelessWidget';

// StatefulWidget Example
class Counter {
  constructor() {
    this.key = 'counter';
  }
  
  createState() {
    return new CounterState();
  }
}

Counter.prototype.constructor.name = 'StatefulWidget';

class CounterState {
  constructor() {
    this._element = null;
    this._widget = null;
    this.count = 0;
  }
  
  initState() {
    console.log('Counter initialized');
  }
  
  increment() {
    this.setState(() => {
      this.count++;
    });
  }
  
  setState(updateFn) {
    if (updateFn) {
      updateFn();
    }
    if (this._element) {
      this._element.markNeedsBuild();
    }
  }
  
  build(context) {
    return new Column({
      children: [
        new Text(`Count: ${this.count}`, { style: { fontSize: '48px' } }),
        new Text('Click to increment', { style: { fontSize: '14px' } })
      ]
    }).build(context);
  }
  
  dispose() {
    console.log('Counter disposed');
  }
}

// Integration Tests
describe('RuntimeEngine Integration', () => {
  let runtime;
  let container;
  
  beforeEach(() => {
    runtime = new RuntimeEngine();
    container = document.createElement('div');
  });
  
  afterEach(() => {
    if (runtime.mounted) {
      runtime.unmount();
    }
    runtime.dispose();
  });
  
  describe('Simple App Scenario', () => {
    test('should mount and render simple app', () => {
      const app = new MyApp();
      
      runtime.mount(app, container);
      
      expect(runtime.mounted).toBe(true);
      expect(runtime.elementTree).toBeDefined();
      expect(runtime.getStats().buildTime).toBeGreaterThan(0);
    });
    
    test('should build widget hierarchy correctly', () => {
      const app = new MyApp();
      
      runtime.mount(app, container);
      
      const element = runtime.elementTree;
      expect(element.mounted).toBe(true);
      expect(element.vnode).toBeDefined();
      expect(element.vnode.tag).toBe('div');
    });
    
    test('should handle multiple widgets', () => {
      const app = new MyApp();
      
      const startTime = performance.now();
      runtime.mount(app, container);
      const mountTime = performance.now() - startTime;
      
      expect(mountTime).toBeLessThan(100); // Should be fast
      expect(runtime.getStats().frameCount).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Stateful Widget Scenario', () => {
    test('should mount counter widget', () => {
      const counter = new Counter();
      
      runtime.mount(counter, container);
      
      expect(runtime.mounted).toBe(true);
      expect(runtime.elementTree).toBeInstanceOf(StatefulElement);
      expect(runtime.elementTree.state).toBeDefined();
    });
    
    test('should initialize state correctly', () => {
      const counter = new Counter();
      
      runtime.mount(counter, container);
      
      const state = runtime.elementTree.state;
      expect(state.count).toBe(0);
      expect(state._element).toBe(runtime.elementTree);
      expect(state._widget).toBe(counter);
    });
    
    test('should handle state updates', (done) => {
      const counter = new Counter();
      runtime.mount(counter, container);
      
      const state = runtime.elementTree.state;
      const initialBuildTime = runtime.getStats().buildTime;
      
      // Trigger state update
      state.increment();
      
      expect(state.count).toBe(1);
      expect(runtime.dirtyElements.size).toBeGreaterThan(0);
      
      setTimeout(() => {
        expect(runtime.dirtyElements.size).toBe(0);
        expect(runtime.getStats().frameCount).toBeGreaterThan(0);
        done();
      }, 20);
    });
    
    test('should handle multiple state updates', (done) => {
      const counter = new Counter();
      runtime.mount(counter, container);
      
      const state = runtime.elementTree.state;
      
      // Multiple rapid updates
      state.increment();
      state.increment();
      state.increment();
      
      expect(state.count).toBe(3);
      
      setTimeout(() => {
        // Should batch updates
        expect(runtime.dirtyElements.size).toBe(0);
        expect(runtime.getStats().frameCount).toBe(1); // Single batch
        done();
      }, 20);
    });
    
    test('should call dispose on unmount', () => {
      const counter = new Counter();
      runtime.mount(counter, container);
      
      const state = runtime.elementTree.state;
      let disposeCalled = false;
      
      const originalDispose = state.dispose;
      state.dispose = function() {
        disposeCalled = true;
        originalDispose.call(this);
      };
      
      runtime.unmount();
      
      expect(disposeCalled).toBe(true);
    });
  });
  
  describe('Performance Testing', () => {
    test('should mount within performance budget', () => {
      const app = new MyApp();
      
      const start = performance.now();
      runtime.mount(app, container);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // < 100ms
    });
    
    test('should handle rapid updates efficiently', (done) => {
      const counter = new Counter();
      runtime.mount(counter, container);
      
      const state = runtime.elementTree.state;
      
      // Simulate 100 rapid updates
      for (let i = 0; i < 100; i++) {
        state.increment();
      }
      
      expect(state.count).toBe(100);
      
      setTimeout(() => {
        const stats = runtime.getStats();
        
        // Should batch efficiently (not 100 separate rebuilds)
        expect(stats.frameCount).toBeLessThan(10);
        expect(stats.buildTime).toBeLessThan(100);
        
        done();
      }, 50);
    });
    
    test('should track performance metrics', () => {
      const app = new MyApp();
      runtime.mount(app, container);
      
      const stats = runtime.getStats();
      
      expect(stats.buildTime).toBeGreaterThan(0);
      expect(stats.renderTime).toBeGreaterThanOrEqual(0);
      expect(stats.mounted).toBe(true);
    });
  });
  
  describe('Error Recovery', () => {
    test('should handle build errors gracefully', (done) => {
      const counter = new Counter();
      runtime.mount(counter, container);
      
      const element = runtime.elementTree;
      
      // Make build throw error
      const originalBuild = element.build;
      element.build = function() {
        throw new Error('Build failed');
      };
      
      element.markNeedsBuild();
      
      setTimeout(() => {
        // Runtime should still be operational
        expect(runtime.mounted).toBe(true);
        
        // Restore build
        element.build = originalBuild;
        element.markNeedsBuild();
        
        setTimeout(() => {
          expect(runtime.dirtyElements.size).toBe(0);
          done();
        }, 20);
      }, 20);
    });
    
    test('should cleanup on mount failure', () => {
      const invalidWidget = { invalid: true };
      
      expect(() => {
        runtime.mount(invalidWidget, container);
      }).toThrow();
      
      expect(runtime.mounted).toBe(false);
      expect(runtime.elementTree).toBe(null);
    });
  });
  
  describe('Service Integration', () => {
    test('should provide services to widgets', () => {
      const app = new MyApp();
      
      // Register service before mount
      runtime.registerService('theme', {
        primaryColor: '#6750a4',
        textColor: '#1c1b1f'
      });
      
      runtime.mount(app, container);
      
      const theme = runtime.getService('theme');
      expect(theme.primaryColor).toBe('#6750a4');
    });
    
    test('should access services during build', () => {
      class ThemedApp {
        constructor() {
          this.key = 'themed-app';
        }
        
        build(context) {
          const theme = context.runtime.getService('theme');
          
          return new Container({
            backgroundColor: theme ? theme.primaryColor : '#ffffff',
            child: new Text('Themed App')
          }).build(context);
        }
      }
      
      ThemedApp.prototype.constructor.name = 'StatelessWidget';
      
      runtime.registerService('theme', { primaryColor: '#ff0000' });
      
      const app = new ThemedApp();
      runtime.mount(app, container);
      
      expect(runtime.elementTree.vnode.style.backgroundColor).toBe('#ff0000');
    });
  });
  
  describe('Memory Management', () => {
    test('should cleanup references on unmount', () => {
      const app = new MyApp();
      runtime.mount(app, container);
      
      const element = runtime.elementTree;
      const elementId = element.id;
      
      runtime.unmount();
      
      expect(element.mounted).toBe(false);
      expect(element.domNode).toBe(null);
      expect(runtime.elementTree).toBe(null);
    });
    
    test('should not leak memory on multiple mount/unmount cycles', () => {
      const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      
      for (let i = 0; i < 10; i++) {
        const app = new MyApp();
        runtime.mount(app, container);
        runtime.unmount();
        
        // Reset runtime for next mount
        runtime = new RuntimeEngine();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      
      // Memory should not grow significantly (allow 5MB growth for test overhead)
      if (process.memoryUsage) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);
      }
    });
  });
  
  describe('Complex Widget Trees', () => {
    test('should handle deeply nested widgets', () => {
      class DeepApp {
        constructor(depth = 0) {
          this.depth = depth;
          this.key = `deep-${depth}`;
        }
        
        build(context) {
          if (this.depth >= 10) {
            return new Text(`Depth ${this.depth}`).build(context);
          }
          
          return new Container({
            child: new DeepApp(this.depth + 1)
          }).build(context);
        }
      }
      
      DeepApp.prototype.constructor.name = 'StatelessWidget';
      
      const app = new DeepApp();
      runtime.mount(app, container);
      
      expect(runtime.mounted).toBe(true);
      expect(runtime.elementTree).toBeDefined();
    });
    
    test('should handle many sibling widgets', () => {
      class WideApp {
        constructor() {
          this.key = 'wide-app';
        }
        
        build(context) {
          const children = [];
          for (let i = 0; i < 50; i++) {
            children.push(new Text(`Item ${i}`));
          }
          
          return new Column({ children }).build(context);
        }
      }
      
      WideApp.prototype.constructor.name = 'StatelessWidget';
      
      const app = new WideApp();
      
      const start = performance.now();
      runtime.mount(app, container);
      const duration = performance.now() - start;
      
      expect(runtime.mounted).toBe(true);
      expect(duration).toBeLessThan(200); // Should still be fast
    });
  });
});

// Run tests
if (typeof module !== 'undefined' && require.main === module) {
  console.log('Running RuntimeEngine integration tests...');
}