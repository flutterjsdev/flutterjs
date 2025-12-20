/**
 * State Integration Tests
 * 
 * Real-world scenarios testing complete state management workflows
 */


import { State,StateManager,ReactiveState,StateObserver } from '../src/state.js';

// Test Runtime
class TestRuntime {
  constructor() {
    this.stateManager = new StateManager(this);
    this.dirtyElements = new Set();
  }
  
  markNeedsBuild(element) {
    this.dirtyElements.add(element);
  }
  
  performUpdate() {
    this.stateManager.updateBatcher.flush();
    
    this.dirtyElements.forEach(el => {
      if (el.mounted && el.state) {
        el.rebuild();
      }
    });
    
    this.dirtyElements.clear();
  }
}

// Test Element
class TestElement {
  constructor(id, runtime) {
    this.id = id;
    this.runtime = runtime;
    this.mounted = true;
    this.state = null;
    this.dirty = false;
    this.buildCount = 0;
  }
  
  buildContext() {
    return {
      element: this,
      runtime: this.runtime
    };
  }
  
  markNeedsBuild() {
    this.dirty = true;
    this.runtime.markNeedsBuild(this);
  }
  
  rebuild() {
    if (!this.mounted || !this.state) return;
    
    this.state._markBuilding(true);
    
    try {
      const vnode = this.state.build(this.buildContext());
      this.state._buildCount++;
      this.buildCount++;
    } finally {
      this.state._markBuilding(false);
    }
    
    this.dirty = false;
  }
  
  unmount() {
    this.mounted = false;
  }
}

// Real-world State Examples

// Counter State
class CounterState extends State {
  constructor() {
    super();
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
  
  decrement() {
    this.setState(() => {
      this.count--;
    });
  }
  
  reset() {
    this.setState({ count: 0 });
  }
  
  build(context) {
    return {
      tag: 'div',
      children: [`Count: ${this.count}`]
    };
  }
  
  dispose() {
    console.log('Counter disposed');
  }
}

// Form State
class FormState extends State {
  constructor() {
    super();
    this.name = '';
    this.email = '';
    this.message = '';
    this.errors = {};
    this.submitting = false;
  }
  
  updateField(field, value) {
    this.setState(() => {
      this[field] = value;
      // Clear error when user types
      if (this.errors[field]) {
        delete this.errors[field];
      }
    });
  }
  
  validate() {
    const errors = {};
    
    if (!this.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!this.email.includes('@')) {
      errors.email = 'Valid email is required';
    }
    
    if (this.message.length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }
    
    this.setState({ errors });
    
    return Object.keys(errors).length === 0;
  }
  
  submit() {
    if (!this.validate()) {
      return;
    }
    
    this.setState({ submitting: true });
    
    // Simulate async submission
    setTimeout(() => {
      this.setState({ 
        submitting: false,
        name: '',
        email: '',
        message: ''
      });
    }, 1000);
  }
  
  build(context) {
    return {
      tag: 'form',
      children: [
        `Name: ${this.name}`,
        `Email: ${this.email}`,
        `Submitting: ${this.submitting}`
      ]
    };
  }
}

// Todo List State
class TodoListState extends State {
  constructor() {
    super();
    this.todos = [];
    this.filter = 'all'; // all, active, completed
    this.nextId = 1;
  }
  
  addTodo(text) {
    if (!text.trim()) return;
    
    this.setState(() => {
      this.todos.push({
        id: this.nextId++,
        text: text.trim(),
        completed: false,
        createdAt: Date.now()
      });
    });
  }
  
  toggleTodo(id) {
    this.setState(() => {
      const todo = this.todos.find(t => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    });
  }
  
  deleteTodo(id) {
    this.setState(() => {
      this.todos = this.todos.filter(t => t.id !== id);
    });
  }
  
  setFilter(filter) {
    this.setState({ filter });
  }
  
  clearCompleted() {
    this.setState(() => {
      this.todos = this.todos.filter(t => !t.completed);
    });
  }
  
  get filteredTodos() {
    switch (this.filter) {
      case 'active':
        return this.todos.filter(t => !t.completed);
      case 'completed':
        return this.todos.filter(t => t.completed);
      default:
        return this.todos;
    }
  }
  
  get stats() {
    return {
      total: this.todos.length,
      active: this.todos.filter(t => !t.completed).length,
      completed: this.todos.filter(t => t.completed).length
    };
  }
  
  build(context) {
    return {
      tag: 'div',
      children: [`Todos: ${this.todos.length}`]
    };
  }
}

describe('State Integration Tests', () => {
  let runtime;
  
  beforeEach(() => {
    runtime = new TestRuntime();
  });
  
  afterEach(() => {
    runtime.stateManager.dispose();
  });
  
  describe('Counter Application', () => {
    test('should handle increment operations', (done) => {
      const element = new TestElement('counter', runtime);
      const state = new CounterState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      expect(state.count).toBe(0);
      
      state.increment();
      
      setTimeout(() => {
        runtime.performUpdate();
        
        expect(state.count).toBe(1);
        expect(element.buildCount).toBeGreaterThan(0);
        
        done();
      }, 10);
    });
    
    test('should handle multiple rapid increments', (done) => {
      const element = new TestElement('counter', runtime);
      const state = new CounterState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      // Rapid increments
      state.increment();
      state.increment();
      state.increment();
      
      setTimeout(() => {
        runtime.performUpdate();
        
        expect(state.count).toBe(3);
        // Should only rebuild once due to batching
        expect(element.buildCount).toBe(1);
        
        done();
      }, 10);
    });
    
    test('should handle increment and decrement', (done) => {
      const element = new TestElement('counter', runtime);
      const state = new CounterState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      state.increment();
      state.increment();
      state.decrement();
      
      setTimeout(() => {
        runtime.performUpdate();
        
        expect(state.count).toBe(1);
        
        done();
      }, 10);
    });
    
    test('should handle reset', (done) => {
      const element = new TestElement('counter', runtime);
      const state = new CounterState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      state.increment();
      state.increment();
      state.increment();
      
      setTimeout(() => {
        runtime.performUpdate();
        
        expect(state.count).toBe(3);
        
        state.reset();
        
        setTimeout(() => {
          runtime.performUpdate();
          
          expect(state.count).toBe(0);
          
          done();
        }, 10);
      }, 10);
    });
  });
  
  describe('Form Application', () => {
    test('should handle field updates', (done) => {
      const element = new TestElement('form', runtime);
      const state = new FormState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      state.updateField('name', 'John Doe');
      state.updateField('email', 'john@example.com');
      
      setTimeout(() => {
        runtime.performUpdate();
        
        expect(state.name).toBe('John Doe');
        expect(state.email).toBe('john@example.com');
        
        done();
      }, 10);
    });
    
    test('should handle validation', () => {
      const element = new TestElement('form', runtime);
      const state = new FormState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      // Invalid form
      const isValid = state.validate();
      
      expect(isValid).toBe(false);
      expect(Object.keys(state.errors).length).toBeGreaterThan(0);
      
      // Valid form
      state.name = 'John Doe';
      state.email = 'john@example.com';
      state.message = 'This is a valid message';
      
      const isValidNow = state.validate();
      
      expect(isValidNow).toBe(true);
      expect(Object.keys(state.errors).length).toBe(0);
    });
    
    test('should clear errors on field update', (done) => {
      const element = new TestElement('form', runtime);
      const state = new FormState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      state.validate();
      
      expect(state.errors.name).toBeDefined();
      
      state.updateField('name', 'John');
      
      setTimeout(() => {
        runtime.performUpdate();
        
        expect(state.errors.name).toBeUndefined();
        
        done();
      }, 10);
    });
    
    test('should handle form submission', (done) => {
      const element = new TestElement('form', runtime);
      const state = new FormState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      // Fill form
      state.name = 'John Doe';
      state.email = 'john@example.com';
      state.message = 'This is a test message';
      
      state.submit();
      
      expect(state.submitting).toBe(true);
      
      setTimeout(() => {
        expect(state.submitting).toBe(false);
        expect(state.name).toBe('');
        
        done();
      }, 1100);
    });
  });
  
  describe('Todo List Application', () => {
    test('should add todos', (done) => {
      const element = new TestElement('todos', runtime);
      const state = new TodoListState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      state.addTodo('Buy groceries');
      state.addTodo('Write code');
      state.addTodo('Exercise');
      
      setTimeout(() => {
        runtime.performUpdate();
        
        expect(state.todos.length).toBe(3);
        expect(state.stats.active).toBe(3);
        expect(state.stats.completed).toBe(0);
        
        done();
      }, 10);
    });
    
    test('should toggle todos', (done) => {
      const element = new TestElement('todos', runtime);
      const state = new TodoListState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      state.addTodo('Task 1');
      state.addTodo('Task 2');
      
      setTimeout(() => {
        runtime.performUpdate();
        
        const todoId = state.todos[0].id;
        state.toggleTodo(todoId);
        
        setTimeout(() => {
          runtime.performUpdate();
          
          expect(state.todos[0].completed).toBe(true);
          expect(state.stats.active).toBe(1);
          expect(state.stats.completed).toBe(1);
          
          done();
        }, 10);
      }, 10);
    });
    
    test('should delete todos', (done) => {
      const element = new TestElement('todos', runtime);
      const state = new TodoListState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      state.addTodo('Task 1');
      state.addTodo('Task 2');
      state.addTodo('Task 3');
      
      setTimeout(() => {
        runtime.performUpdate();
        
        const todoId = state.todos[1].id;
        state.deleteTodo(todoId);
        
        setTimeout(() => {
          runtime.performUpdate();
          
          expect(state.todos.length).toBe(2);
          expect(state.todos.find(t => t.id === todoId)).toBeUndefined();
          
          done();
        }, 10);
      }, 10);
    });
    
    test('should filter todos', (done) => {
      const element = new TestElement('todos', runtime);
      const state = new TodoListState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      state.addTodo('Task 1');
      state.addTodo('Task 2');
      state.addTodo('Task 3');
      
      setTimeout(() => {
        runtime.performUpdate();
        
        // Complete first two
        state.toggleTodo(state.todos[0].id);
        state.toggleTodo(state.todos[1].id);
        
        setTimeout(() => {
          runtime.performUpdate();
          
          // Filter active
          state.setFilter('active');
          expect(state.filteredTodos.length).toBe(1);
          
          // Filter completed
          state.setFilter('completed');
          expect(state.filteredTodos.length).toBe(2);
          
          // Filter all
          state.setFilter('all');
          expect(state.filteredTodos.length).toBe(3);
          
          done();
        }, 10);
      }, 10);
    });
    
    test('should clear completed todos', (done) => {
      const element = new TestElement('todos', runtime);
      const state = new TodoListState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      state.addTodo('Task 1');
      state.addTodo('Task 2');
      state.addTodo('Task 3');
      
      setTimeout(() => {
        runtime.performUpdate();
        
        // Complete some
        state.toggleTodo(state.todos[0].id);
        state.toggleTodo(state.todos[2].id);
        
        setTimeout(() => {
          runtime.performUpdate();
          
          expect(state.stats.completed).toBe(2);
          
          state.clearCompleted();
          
          setTimeout(() => {
            runtime.performUpdate();
            
            expect(state.todos.length).toBe(1);
            expect(state.stats.completed).toBe(0);
            
            done();
          }, 10);
        }, 10);
      }, 10);
    });
  });
  
  describe('Reactive State', () => {
    test('should track reactive properties', (done) => {
      const element = new TestElement('reactive', runtime);
      const state = new ReactiveState();
      
      state.makeReactive('count', 0);
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      // Track access
      runtime.stateManager.stateTracker.startTracking(element);
      const value = state.count;
      runtime.stateManager.stateTracker.stopTracking();
      
      expect(value).toBe(0);
      
      // Update should trigger rebuild
      state.count = 5;
      
      setTimeout(() => {
        runtime.performUpdate();
        
        expect(element.dirty).toBe(false); // Rebuilt
        expect(state.count).toBe(5);
        
        done();
      }, 10);
    });
  });
  
  describe('State Observer', () => {
    test('should observe state changes', (done) => {
      const element = new TestElement('observed', runtime);
      const state = new CounterState();
      const observer = new StateObserver();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      let observed = false;
      
      observer.observe(state, (s, property, oldVal, newVal) => {
        observed = true;
        expect(property).toBe('count');
        expect(oldVal).toBe(0);
        expect(newVal).toBe(1);
      });
      
      state.increment();
      
      setTimeout(() => {
        runtime.performUpdate();
        
        observer.notify(state, 'count', 0, 1);
        
        expect(observed).toBe(true);
        
        done();
      }, 10);
    });
  });
  
  describe('Performance', () => {
    test('should handle many state updates efficiently', (done) => {
      const element = new TestElement('perf', runtime);
      const state = new CounterState();
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      state._init();
      
      const start = Date.now();
      
      // 100 rapid updates
      for (let i = 0; i < 100; i++) {
        state.increment();
      }
      
      setTimeout(() => {
        runtime.performUpdate();
        
        const duration = Date.now() - start;
        
        expect(state.count).toBe(100);
        expect(element.buildCount).toBe(1); // Only one rebuild
        expect(duration).toBeLessThan(100); // Fast
        
        done();
      }, 10);
    });
    
    test('should handle multiple components with state', (done) => {
      const elements = [];
      const states = [];
      
      for (let i = 0; i < 10; i++) {
        const element = new TestElement(`comp_${i}`, runtime);
        const state = new CounterState();
        
        element.state = state;
        state._element = element;
        
        runtime.stateManager.register(state, element);
        state._init();
        
        elements.push(element);
        states.push(state);
      }
      
      // Update all
      states.forEach(state => state.increment());
      
      setTimeout(() => {
        runtime.performUpdate();
        
        states.forEach(state => {
          expect(state.count).toBe(1);
        });
        
        elements.forEach(element => {
          expect(element.buildCount).toBe(1);
        });
        
        done();
      }, 10);
    });
  });
  
  describe('Lifecycle', () => {
    test('should call all lifecycle methods', () => {
      const element = new TestElement('lifecycle', runtime);
      const state = new CounterState();
      
      const calls = [];
      
      state.initState = () => calls.push('initState');
      state.didMount = () => calls.push('didMount');
      state.didUpdateWidget = (old) => calls.push('didUpdateWidget');
      state.dispose = () => calls.push('dispose');
      
      element.state = state;
      state._element = element;
      
      runtime.stateManager.register(state, element);
      
      state._init();
      expect(calls).toContain('initState');
      
      state.didMount();
      expect(calls).toContain('didMount');
      
      state.didUpdateWidget({});
      expect(calls).toContain('didUpdateWidget');
      
      runtime.stateManager.unregister(state);
      expect(calls).toContain('dispose');
    });
  });
});

// Run tests
if (typeof module !== 'undefined' && require.main === module) {
  console.log('Running State integration tests...');
}