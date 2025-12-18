/**
 * MemoryManager Integration Tests
 * 
 * Real-world scenarios testing memory management with complete workflows
 */

const {
  MemoryManager,
  MemoryProfiler
} = require('./memory-manager');

// More realistic element simulation
class TestElement {
  constructor(id, type = 'StatelessElement') {
    this.id = id;
    this.type = type;
    this.mounted = false;
    this.children = [];
    this.parent = null;
    this.depth = 0;
    this.vnode = null;
    this.domNode = null;
    this.state = null;
  }
  
  mount() {
    this.mounted = true;
  }
  
  unmount() {
    this.mounted = false;
    this.children.forEach(child => child.unmount());
  }
  
  addChild(child) {
    this.children.push(child);
    child.parent = this;
    child.depth = this.depth + 1;
  }
}

class TestState {
  constructor() {
    this.values = {};
    this.listeners = [];
  }
  
  dispose() {
    this.listeners = [];
  }
}

// Mock DOM with realistic behavior
class TestDOMNode {
  constructor(tag) {
    this.tag = tag;
    this.eventListeners = new Map();
    this.children = [];
  }
  
  addEventListener(event, handler, options) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push({ handler, options });
  }
  
  removeEventListener(event, handler) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.findIndex(l => l.handler === handler);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  appendChild(child) {
    this.children.push(child);
  }
}

describe('MemoryManager Integration Tests', () => {
  let memoryManager;
  
  beforeEach(() => {
    memoryManager = new MemoryManager({
      enableLeakDetection: false,
      debugMode: false
    });
  });
  
  afterEach(() => {
    memoryManager.dispose();
  });
  
  describe('Application Lifecycle', () => {
    test('should handle complete app mount and unmount', () => {
      // Simulate app tree
      const root = new TestElement('root', 'StatelessElement');
      const page = new TestElement('page', 'StatefulElement');
      const header = new TestElement('header', 'StatelessElement');
      const body = new TestElement('body', 'StatelessElement');
      
      root.addChild(page);
      page.addChild(header);
      page.addChild(body);
      
      // Mount app
      [root, page, header, body].forEach(el => {
        el.mount();
        memoryManager.register(el);
      });
      
      expect(memoryManager.stats.elementsCreated).toBe(4);
      expect(memoryManager.elementRefs.size).toBe(4);
      
      // Unmount app
      [root, page, header, body].forEach(el => {
        el.unmount();
        memoryManager.unregister(el);
      });
      
      memoryManager.performBatchCleanup();
      
      expect(memoryManager.stats.elementsDisposed).toBe(4);
      expect(memoryManager.elementRefs.size).toBe(0);
    });
    
    test('should handle page navigation', () => {
      const app = new TestElement('app', 'StatelessElement');
      memoryManager.register(app);
      app.mount();
      
      // Page 1
      const page1 = new TestElement('page1', 'StatefulElement');
      app.addChild(page1);
      page1.mount();
      memoryManager.register(page1);
      
      const page1Children = [];
      for (let i = 0; i < 5; i++) {
        const child = new TestElement(`page1_child_${i}`, 'StatelessElement');
        page1.addChild(child);
        child.mount();
        memoryManager.register(child);
        page1Children.push(child);
      }
      
      expect(memoryManager.elementRefs.size).toBe(7); // app + page1 + 5 children
      
      // Navigate away - unmount page1
      page1.unmount();
      memoryManager.unregister(page1);
      page1Children.forEach(child => {
        child.unmount();
        memoryManager.unregister(child);
      });
      
      memoryManager.performBatchCleanup();
      
      expect(memoryManager.elementRefs.size).toBe(1); // Only app remains
      
      // Page 2
      const page2 = new TestElement('page2', 'StatefulElement');
      app.addChild(page2);
      page2.mount();
      memoryManager.register(page2);
      
      expect(memoryManager.elementRefs.size).toBe(2); // app + page2
    });
    
    test('should handle rapid mount/unmount cycles', () => {
      const app = new TestElement('app', 'StatelessElement');
      memoryManager.register(app);
      app.mount();
      
      // Simulate rapid component mounting/unmounting
      for (let cycle = 0; cycle < 10; cycle++) {
        const component = new TestElement(`component_${cycle}`, 'StatefulElement');
        app.addChild(component);
        component.mount();
        memoryManager.register(component);
        
        // Immediate unmount
        component.unmount();
        memoryManager.unregister(component);
      }
      
      memoryManager.performBatchCleanup();
      
      expect(memoryManager.stats.elementsCreated).toBe(11); // app + 10 components
      expect(memoryManager.stats.elementsDisposed).toBe(10);
      expect(memoryManager.elementRefs.size).toBe(1); // Only app
    });
  });
  
  describe('State Management', () => {
    test('should track stateful components with state', () => {
      const component = new TestElement('stateful', 'StatefulElement');
      const state = new TestState();
      state.values = { count: 0 };
      
      component.state = state;
      component.mount();
      
      memoryManager.register(component);
      memoryManager.trackState(state, component);
      
      expect(memoryManager.stateRegistry.get(state)).toBe(component);
      
      // Cleanup
      component.unmount();
      memoryManager.cleanupElement(component);
      
      expect(memoryManager.stateRegistry.has(state)).toBe(false);
    });
    
    test('should cleanup state on component disposal', () => {
      const components = [];
      const states = [];
      
      for (let i = 0; i < 5; i++) {
        const component = new TestElement(`comp_${i}`, 'StatefulElement');
        const state = new TestState();
        
        component.state = state;
        component.mount();
        
        memoryManager.register(component);
        memoryManager.trackState(state, component);
        
        components.push(component);
        states.push(state);
      }
      
      // Cleanup all
      components.forEach(comp => {
        comp.unmount();
        memoryManager.cleanupElement(comp);
      });
      
      // All states should be cleaned
      states.forEach(state => {
        expect(memoryManager.stateRegistry.has(state)).toBe(false);
      });
    });
  });
  
  describe('Event Listener Management', () => {
    test('should track and cleanup listeners in component lifecycle', () => {
      const component = new TestElement('interactive', 'StatelessElement');
      const button = new TestDOMNode('button');
      
      component.mount();
      memoryManager.register(component);
      
      // Attach listeners
      const onClick = () => console.log('clicked');
      const onMouseEnter = () => console.log('entered');
      const onMouseLeave = () => console.log('left');
      
      button.addEventListener('click', onClick);
      button.addEventListener('mouseenter', onMouseEnter);
      button.addEventListener('mouseleave', onMouseLeave);
      
      memoryManager.trackListener(component, button, 'click', onClick);
      memoryManager.trackListener(component, button, 'mouseenter', onMouseEnter);
      memoryManager.trackListener(component, button, 'mouseleave', onMouseLeave);
      
      expect(memoryManager.stats.listenersAttached).toBe(3);
      expect(button.eventListeners.get('click').length).toBe(1);
      
      // Cleanup component
      memoryManager.removeAllListeners(component);
      
      expect(memoryManager.stats.listenersRemoved).toBe(3);
      expect(button.eventListeners.get('click').length).toBe(0);
      expect(button.eventListeners.get('mouseenter').length).toBe(0);
    });
    
    test('should handle multiple components with listeners', () => {
      const components = [];
      const buttons = [];
      
      for (let i = 0; i < 5; i++) {
        const component = new TestElement(`comp_${i}`, 'StatelessElement');
        const button = new TestDOMNode('button');
        
        component.mount();
        memoryManager.register(component);
        
        const handler = () => {};
        button.addEventListener('click', handler);
        memoryManager.trackListener(component, button, 'click', handler);
        
        components.push(component);
        buttons.push(button);
      }
      
      expect(memoryManager.stats.listenersAttached).toBe(5);
      
      // Cleanup odd components
      components.forEach((comp, index) => {
        if (index % 2 === 1) {
          memoryManager.removeAllListeners(comp);
        }
      });
      
      expect(memoryManager.stats.listenersRemoved).toBe(2);
    });
  });
  
  describe('Memory Leak Scenarios', () => {
    test('should detect leaked components after navigation', (done) => {
      const mm = new MemoryManager({
        enableLeakDetection: true,
        leakDetectionInterval: 100
      });
      
      // Create and mount page
      const page = new TestElement('old_page', 'StatefulElement');
      page.mount();
      mm.register(page);
      
      // Simulate navigation - unmount but forget to cleanup
      page.unmount();
      
      // Make it appear old
      mm.elementRefs.get('old_page').registeredAt = Date.now() - 70000;
      
      setTimeout(() => {
        const leaks = mm.detectLeaks();
        
        expect(leaks.length).toBeGreaterThan(0);
        const elementLeaks = leaks.filter(l => l.type === 'element');
        expect(elementLeaks.length).toBeGreaterThan(0);
        
        mm.dispose();
        done();
      }, 150);
    });
    
    test('should detect leaked event listeners', () => {
      const mm = new MemoryManager({
        enableLeakDetection: true
      });
      
      const component = new TestElement('comp', 'StatelessElement');
      const button = new TestDOMNode('button');
      
      mm.register(component);
      component.mount();
      
      const handler = () => {};
      button.addEventListener('click', handler);
      mm.trackListener(component, button, 'click', handler);
      
      // Simulate old listener
      const listenerId = 'comp_click_1';
      mm.listenerRefs.set(listenerId, {
        elementId: 'comp',
        event: 'click',
        attachedAt: Date.now() - 70000
      });
      
      const leaks = mm.detectLeaks();
      
      const listenerLeaks = leaks.filter(l => l.type === 'listener');
      expect(listenerLeaks.length).toBeGreaterThan(0);
      
      mm.dispose();
    });
    
    test('should cleanup leaked components with force cleanup', () => {
      // Create many components
      for (let i = 0; i < 20; i++) {
        const comp = new TestElement(`comp_${i}`, 'StatelessElement');
        comp.mount();
        memoryManager.register(comp);
      }
      
      expect(memoryManager.elementRefs.size).toBe(20);
      
      // Unmount half without cleanup
      let index = 0;
      memoryManager.elementRefs.forEach((ref) => {
        if (index % 2 === 0) {
          ref.element.unmount();
        }
        index++;
      });
      
      // Force cleanup
      const cleaned = memoryManager.forceCleanupUnmounted();
      
      expect(cleaned).toBe(10);
      expect(memoryManager.elementRefs.size).toBe(10);
    });
  });
  
  describe('VNode Lifecycle', () => {
    test('should track VNodes through render cycles', () => {
      const component = new TestElement('comp', 'StatefulElement');
      memoryManager.register(component);
      component.mount();
      
      // First render
      const vnode1 = { id: 'v1', tag: 'div', children: [] };
      component.vnode = vnode1;
      memoryManager.registerVNode(vnode1, component);
      
      expect(memoryManager.stats.vnodeCreated).toBe(1);
      
      // Re-render (new VNode)
      memoryManager.unregisterVNode(vnode1);
      
      const vnode2 = { id: 'v2', tag: 'div', children: [] };
      component.vnode = vnode2;
      memoryManager.registerVNode(vnode2, component);
      
      expect(memoryManager.stats.vnodeCreated).toBe(2);
      expect(memoryManager.stats.vnodeDisposed).toBe(1);
      
      // Cleanup
      memoryManager.unregisterVNode(vnode2);
      
      expect(memoryManager.stats.vnodeDisposed).toBe(2);
    });
    
    test('should handle complex VNode trees', () => {
      const root = new TestElement('root', 'StatelessElement');
      memoryManager.register(root);
      
      const rootVNode = {
        id: 'root',
        tag: 'div',
        children: []
      };
      
      // Create 10 child VNodes
      for (let i = 0; i < 10; i++) {
        const childVNode = {
          id: `child_${i}`,
          tag: 'span',
          children: []
        };
        rootVNode.children.push(childVNode);
        memoryManager.registerVNode(childVNode, root);
      }
      
      memoryManager.registerVNode(rootVNode, root);
      
      expect(memoryManager.stats.vnodeCreated).toBe(11);
      
      // Cleanup all
      rootVNode.children.forEach(child => {
        memoryManager.unregisterVNode(child);
      });
      memoryManager.unregisterVNode(rootVNode);
      
      expect(memoryManager.stats.vnodeDisposed).toBe(11);
    });
  });
  
  describe('Performance Monitoring', () => {
    test('should track performance under load', () => {
      const profiler = new MemoryProfiler(memoryManager);
      
      profiler.takeSnapshot();
      
      // Simulate heavy load
      for (let i = 0; i < 100; i++) {
        const comp = new TestElement(`comp_${i}`, 'StatelessElement');
        comp.mount();
        memoryManager.register(comp);
        
        const vnode = { id: `v${i}`, tag: 'div' };
        memoryManager.registerVNode(vnode, comp);
      }
      
      profiler.takeSnapshot();
      
      // Cleanup half
      let index = 0;
      memoryManager.elementRefs.forEach((ref) => {
        if (index < 50) {
          ref.element.unmount();
          memoryManager.cleanupElement(ref.element);
        }
        index++;
      });
      
      profiler.takeSnapshot();
      
      const trend = profiler.getTrend();
      
      expect(trend.elementsCreated).toBe(100);
      expect(trend.elementsDisposed).toBe(50);
      expect(profiler.snapshots.length).toBe(3);
    });
    
    test('should monitor memory growth over time', () => {
      const profiler = new MemoryProfiler(memoryManager);
      const snapshots = [];
      
      // Take snapshots over multiple cycles
      for (let cycle = 0; cycle < 5; cycle++) {
        // Create components
        for (let i = 0; i < 10; i++) {
          const comp = new TestElement(`cycle${cycle}_comp${i}`, 'StatelessElement');
          comp.mount();
          memoryManager.register(comp);
        }
        
        snapshots.push(profiler.takeSnapshot());
        
        // Cleanup some
        if (cycle > 0) {
          const toClean = Array.from(memoryManager.elementRefs.values()).slice(0, 5);
          toClean.forEach(ref => {
            ref.element.unmount();
            memoryManager.cleanupElement(ref.element);
          });
        }
      }
      
      // Check growth pattern
      expect(snapshots.length).toBe(5);
      expect(snapshots[4].stats.elementsCreated).toBeGreaterThan(snapshots[0].stats.elementsCreated);
    });
  });
  
  describe('Real-world Scenarios', () => {
    test('should handle todo app lifecycle', () => {
      // Root app
      const app = new TestElement('TodoApp', 'StatefulElement');
      app.state = new TestState();
      app.mount();
      memoryManager.register(app);
      memoryManager.trackState(app.state, app);
      
      // Todo list
      const todoList = new TestElement('TodoList', 'StatelessElement');
      app.addChild(todoList);
      todoList.mount();
      memoryManager.register(todoList);
      
      // Create 10 todo items
      const todos = [];
      for (let i = 0; i < 10; i++) {
        const todo = new TestElement(`Todo_${i}`, 'StatelessElement');
        const button = new TestDOMNode('button');
        
        todoList.addChild(todo);
        todo.mount();
        memoryManager.register(todo);
        
        // Add delete button listener
        const onDelete = () => console.log(`Delete ${i}`);
        button.addEventListener('click', onDelete);
        memoryManager.trackListener(todo, button, 'click', onDelete);
        
        todos.push(todo);
      }
      
      expect(memoryManager.stats.elementsCreated).toBe(12); // app + list + 10 todos
      expect(memoryManager.stats.listenersAttached).toBe(10);
      
      // Delete 5 todos
      for (let i = 0; i < 5; i++) {
        todos[i].unmount();
        memoryManager.removeAllListeners(todos[i]);
        memoryManager.unregister(todos[i]);
      }
      
      memoryManager.performBatchCleanup();
      
      expect(memoryManager.stats.elementsDisposed).toBe(5);
      expect(memoryManager.stats.listenersRemoved).toBe(5);
      expect(memoryManager.elementRefs.size).toBe(7); // app + list + 5 todos
    });
    
    test('should handle form with multiple inputs', () => {
      const form = new TestElement('Form', 'StatefulElement');
      form.state = new TestState();
      form.mount();
      memoryManager.register(form);
      
      const inputs = [];
      const inputDOMs = [];
      
      // Create 5 input fields
      for (let i = 0; i < 5; i++) {
        const input = new TestElement(`Input_${i}`, 'StatelessElement');
        const inputDOM = new TestDOMNode('input');
        
        form.addChild(input);
        input.mount();
        memoryManager.register(input);
        
        // onChange listener
        const onChange = () => console.log(`Input ${i} changed`);
        inputDOM.addEventListener('change', onChange);
        memoryManager.trackListener(input, inputDOM, 'change', onChange);
        
        // onFocus listener
        const onFocus = () => console.log(`Input ${i} focused`);
        inputDOM.addEventListener('focus', onFocus);
        memoryManager.trackListener(input, inputDOM, 'focus', onFocus);
        
        inputs.push(input);
        inputDOMs.push(inputDOM);
      }
      
      expect(memoryManager.stats.listenersAttached).toBe(10); // 2 per input
      
      // Form submit (cleanup all)
      inputs.forEach(input => {
        input.unmount();
        memoryManager.removeAllListeners(input);
        memoryManager.unregister(input);
      });
      
      memoryManager.performBatchCleanup();
      
      expect(memoryManager.stats.listenersRemoved).toBe(10);
      expect(memoryManager.elementRefs.size).toBe(1); // Only form
    });
  });
  
  describe('Edge Cases and Stress Tests', () => {
    test('should handle thousands of elements', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const comp = new TestElement(`comp_${i}`, 'StatelessElement');
        comp.mount();
        memoryManager.register(comp);
      }
      
      const duration = Date.now() - start;
      
      expect(memoryManager.elementRefs.size).toBe(1000);
      expect(duration).toBeLessThan(1000); // Should be fast
      
      // Cleanup all
      memoryManager.clear();
      
      expect(memoryManager.elementRefs.size).toBe(0);
    });
    
    test('should handle cleanup during iteration', () => {
      for (let i = 0; i < 10; i++) {
        memoryManager.register(new TestElement(`comp_${i}`, 'StatelessElement'));
      }
      
      // Cleanup while iterating
      memoryManager.elementRefs.forEach((ref, id) => {
        if (parseInt(id.split('_')[1]) % 2 === 0) {
          memoryManager.cleanupElement(ref.element);
        }
      });
      
      expect(memoryManager.stats.elementsDisposed).toBeGreaterThan(0);
    });
  });
});

// Run tests
if (typeof module !== 'undefined' && require.main === module) {
  console.log('Running MemoryManager integration tests...');
}