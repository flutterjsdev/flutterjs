/**
 * Element Test Suite
 * 
 * Comprehensive tests for the FlutterJS Element system
 */

const {
  Element,
  StatelessElement,
  StatefulElement,
  InheritedElement,
  ComponentElement
} = require('./element');

// Mock runtime
class MockRuntime {
  constructor() {
    this.dirtyElements = new Set();
    this.config = { debugMode: false };
  }
  
  markNeedsBuild(element) {
    this.dirtyElements.add(element);
  }
}

// Mock widgets
class MockWidget {
  constructor(key) {
    this.key = key;
  }
  
  build(context) {
    return { tag: 'div', children: ['Mock'] };
  }
}

class MockStatefulWidget {
  constructor(key) {
    this.key = key;
  }
  
  createState() {
    return new MockState();
  }
}

class MockState {
  constructor() {
    this._element = null;
    this._widget = null;
    this._mounted = false;
    this.initStateCalled = false;
    this.disposeCalled = false;
    this.didUpdateWidgetCalled = false;
  }
  
  initState() {
    this.initStateCalled = true;
  }
  
  build(context) {
    return { tag: 'div', children: ['Stateful'] };
  }
  
  didUpdateWidget(oldWidget) {
    this.didUpdateWidgetCalled = true;
  }
  
  dispose() {
    this.disposeCalled = true;
  }
  
  setState(updateFn) {
    if (updateFn) updateFn();
    if (this._element) {
      this._element.markNeedsBuild();
    }
  }
}

class MockInheritedWidget {
  constructor(key, child) {
    this.key = key;
    this.child = child || new MockWidget();
  }
  
  updateShouldNotify(oldWidget) {
    return true;
  }
}

// Mock performance
if (typeof performance === 'undefined') {
  global.performance = { now: () => Date.now() };
}

describe('Element Base Class', () => {
  let runtime;
  let widget;
  let element;
  
  beforeEach(() => {
    runtime = new MockRuntime();
    widget = new MockWidget('test-key');
    Element.resetCounter();
  });
  
  describe('Construction', () => {
    test('should create element with required parameters', () => {
      element = new Element(widget, null, runtime);
      
      expect(element.widget).toBe(widget);
      expect(element.parent).toBe(null);
      expect(element.runtime).toBe(runtime);
    });
    
    test('should throw error without widget', () => {
      expect(() => {
        new Element(null, null, runtime);
      }).toThrow('Widget is required');
    });
    
    test('should throw error without runtime', () => {
      expect(() => {
        new Element(widget, null, null);
      }).toThrow('Runtime is required');
    });
    
    test('should initialize with default state', () => {
      element = new Element(widget, null, runtime);
      
      expect(element.mounted).toBe(false);
      expect(element.dirty).toBe(false);
      expect(element.building).toBe(false);
      expect(element.children).toEqual([]);
      expect(element.vnode).toBe(null);
      expect(element.domNode).toBe(null);
    });
    
    test('should set correct depth', () => {
      const parent = new Element(widget, null, runtime);
      const child = new Element(widget, parent, runtime);
      const grandchild = new Element(widget, child, runtime);
      
      expect(parent.depth).toBe(0);
      expect(child.depth).toBe(1);
      expect(grandchild.depth).toBe(2);
    });
    
    test('should generate unique IDs', () => {
      const el1 = new Element(widget, null, runtime);
      const el2 = new Element(widget, null, runtime);
      const el3 = new Element(widget, null, runtime);
      
      expect(el1.id).toBe('el_1');
      expect(el2.id).toBe('el_2');
      expect(el3.id).toBe('el_3');
    });
    
    test('should store widget key', () => {
      element = new Element(widget, null, runtime);
      
      expect(element.key).toBe('test-key');
    });
  });
  
  describe('Build', () => {
    test('should throw error if build not implemented', () => {
      element = new Element(widget, null, runtime);
      
      expect(() => {
        element.build();
      }).toThrow('must be implemented by subclass');
    });
    
    test('should track build count', () => {
      element = new StatelessElement(widget, null, runtime);
      
      expect(element.buildCount).toBe(0);
      
      element.performBuild();
      expect(element.buildCount).toBe(1);
      
      element.performBuild();
      expect(element.buildCount).toBe(2);
    });
    
    test('should track build duration', () => {
      element = new StatelessElement(widget, null, runtime);
      
      element.performBuild();
      
      expect(element.lastBuildDuration).toBeGreaterThanOrEqual(0);
      expect(element.lastBuildTime).toBeGreaterThan(0);
    });
    
    test('should throw error if build returns null', () => {
      widget.build = () => null;
      element = new StatelessElement(widget, null, runtime);
      
      expect(() => {
        element.performBuild();
      }).toThrow('returned null');
    });
  });
  
  describe('Mounting', () => {
    test('should mount element', () => {
      element = new StatelessElement(widget, null, runtime);
      
      element.mount();
      
      expect(element.mounted).toBe(true);
      expect(element.vnode).toBeDefined();
    });
    
    test('should not mount twice', () => {
      element = new StatelessElement(widget, null, runtime);
      
      element.mount();
      element.mount(); // Should warn but not fail
      
      expect(element.mounted).toBe(true);
    });
    
    test('should mount children', () => {
      const parent = new StatelessElement(widget, null, runtime);
      const child1 = new StatelessElement(widget, parent, runtime);
      const child2 = new StatelessElement(widget, parent, runtime);
      
      parent.children = [child1, child2];
      
      parent.mount();
      
      expect(parent.mounted).toBe(true);
      expect(child1.mounted).toBe(true);
      expect(child2.mounted).toBe(true);
    });
    
    test('should call didMount lifecycle hook', () => {
      element = new StatelessElement(widget, null, runtime);
      
      let didMountCalled = false;
      element.didMount = () => { didMountCalled = true; };
      
      element.mount();
      
      expect(didMountCalled).toBe(true);
    });
  });
  
  describe('Update', () => {
    test('should update widget', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      const newWidget = new MockWidget('new-key');
      
      element.update(newWidget);
      
      expect(element.widget).toBe(newWidget);
    });
    
    test('should mark dirty if widget changed', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      const newWidget = new MockWidget('different');
      
      element.update(newWidget);
      
      expect(element.dirty).toBe(true);
      expect(runtime.dirtyElements.has(element)).toBe(true);
    });
    
    test('should not mark dirty if widget unchanged', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      element.update(widget); // Same widget
      
      expect(element.dirty).toBe(false);
    });
    
    test('should call didUpdateWidget lifecycle hook', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      let hookCalled = false;
      let oldWidgetReceived = null;
      
      element.didUpdateWidget = (oldWidget, newWidget) => {
        hookCalled = true;
        oldWidgetReceived = oldWidget;
      };
      
      const newWidget = new MockWidget('new');
      element.update(newWidget);
      
      expect(hookCalled).toBe(true);
      expect(oldWidgetReceived).toBe(widget);
    });
    
    test('should throw error if newWidget is null', () => {
      element = new StatelessElement(widget, null, runtime);
      
      expect(() => {
        element.update(null);
      }).toThrow('New widget is required');
    });
  });
  
  describe('Rebuild', () => {
    test('should rebuild element', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      const oldVNode = element.vnode;
      
      element.rebuild();
      
      expect(element.vnode).toBeDefined();
      expect(element.dirty).toBe(false);
    });
    
    test('should not rebuild unmounted element', () => {
      element = new StatelessElement(widget, null, runtime);
      
      element.rebuild(); // Should warn but not fail
      
      expect(element.vnode).toBe(null);
    });
    
    test('should prevent recursive rebuilds', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      // Make build trigger another rebuild
      const originalBuild = element.build;
      let buildCallCount = 0;
      
      element.build = function() {
        buildCallCount++;
        if (buildCallCount === 1) {
          this.rebuild(); // Should be prevented
        }
        return originalBuild.call(this);
      };
      
      element.rebuild();
      
      expect(buildCallCount).toBe(1);
    });
  });
  
  describe('Mark Dirty', () => {
    test('should mark element dirty', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      element.markNeedsBuild();
      
      expect(element.dirty).toBe(true);
      expect(runtime.dirtyElements.has(element)).toBe(true);
    });
    
    test('should not mark dirty twice', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      element.markNeedsBuild();
      const firstSize = runtime.dirtyElements.size;
      
      element.markNeedsBuild();
      
      expect(runtime.dirtyElements.size).toBe(firstSize);
    });
    
    test('should not mark unmounted element dirty', () => {
      element = new StatelessElement(widget, null, runtime);
      
      element.markNeedsBuild();
      
      expect(element.dirty).toBe(false);
      expect(runtime.dirtyElements.size).toBe(0);
    });
  });
  
  describe('Unmount', () => {
    test('should unmount element', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      element.unmount();
      
      expect(element.mounted).toBe(false);
      expect(element.children).toEqual([]);
      expect(element.vnode).toBe(null);
      expect(element.domNode).toBe(null);
    });
    
    test('should unmount children first', () => {
      const parent = new StatelessElement(widget, null, runtime);
      const child = new StatelessElement(widget, parent, runtime);
      
      parent.children = [child];
      parent.mount();
      child.mount();
      
      parent.unmount();
      
      expect(child.mounted).toBe(false);
      expect(parent.mounted).toBe(false);
    });
    
    test('should call lifecycle hooks', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      let willUnmountCalled = false;
      let didUnmountCalled = false;
      
      element.willUnmount = () => { willUnmountCalled = true; };
      element.didUnmount = () => { didUnmountCalled = true; };
      
      element.unmount();
      
      expect(willUnmountCalled).toBe(true);
      expect(didUnmountCalled).toBe(true);
    });
    
    test('should be idempotent', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      element.unmount();
      element.unmount(); // Should not fail
      
      expect(element.mounted).toBe(false);
    });
  });
  
  describe('Children Management', () => {
    test('should add child', () => {
      const parent = new StatelessElement(widget, null, runtime);
      const child = new StatelessElement(widget, null, runtime);
      
      parent.addChild(child);
      
      expect(parent.children).toContain(child);
      expect(child.parent).toBe(parent);
    });
    
    test('should track child by key', () => {
      const parent = new StatelessElement(widget, null, runtime);
      const child = new StatelessElement(new MockWidget('child-key'), null, runtime);
      
      parent.addChild(child);
      
      expect(parent.findChildByKey('child-key')).toBe(child);
    });
    
    test('should remove child', () => {
      const parent = new StatelessElement(widget, null, runtime);
      const child = new StatelessElement(widget, null, runtime);
      
      parent.addChild(child);
      parent.removeChild(child);
      
      expect(parent.children).not.toContain(child);
      expect(child.parent).toBe(null);
    });
    
    test('should throw error when adding null child', () => {
      element = new StatelessElement(widget, null, runtime);
      
      expect(() => {
        element.addChild(null);
      }).toThrow('Child element is required');
    });
  });
  
  describe('Ancestor Methods', () => {
    test('should find ancestor of type', () => {
      const grandparent = new StatelessElement(widget, null, runtime);
      const parent = new StatefulElement(new MockStatefulWidget(), grandparent, runtime);
      const child = new StatelessElement(widget, parent, runtime);
      
      const found = child.findAncestorOfType(StatefulElement);
      
      expect(found).toBe(parent);
    });
    
    test('should return null if ancestor not found', () => {
      const parent = new StatelessElement(widget, null, runtime);
      const child = new StatelessElement(widget, parent, runtime);
      
      const found = child.findAncestorOfType(StatefulElement);
      
      expect(found).toBe(null);
    });
    
    test('should visit ancestors', () => {
      const grandparent = new StatelessElement(widget, null, runtime);
      const parent = new StatelessElement(widget, grandparent, runtime);
      const child = new StatelessElement(widget, parent, runtime);
      
      const visited = [];
      
      child.visitAncestors((element) => {
        visited.push(element);
        return true; // Continue
      });
      
      expect(visited).toEqual([parent, grandparent]);
    });
    
    test('should stop visiting when visitor returns false', () => {
      const grandparent = new StatelessElement(widget, null, runtime);
      const parent = new StatelessElement(widget, grandparent, runtime);
      const child = new StatelessElement(widget, parent, runtime);
      
      const visited = [];
      
      child.visitAncestors((element) => {
        visited.push(element);
        return false; // Stop
      });
      
      expect(visited).toEqual([parent]);
    });
  });
  
  describe('Widget Comparison', () => {
    test('should detect identical widgets', () => {
      element = new StatelessElement(widget, null, runtime);
      
      expect(element.shouldRebuild(widget, widget)).toBe(false);
    });
    
    test('should detect different types', () => {
      element = new StatelessElement(widget, null, runtime);
      
      const differentWidget = new MockStatefulWidget();
      
      expect(element.shouldRebuild(widget, differentWidget)).toBe(true);
    });
    
    test('should compare widget properties', () => {
      const widget1 = { type: 'test', value: 1, key: 'a' };
      const widget2 = { type: 'test', value: 1, key: 'a' };
      const widget3 = { type: 'test', value: 2, key: 'a' };
      
      element = new Element(widget1, null, runtime);
      
      expect(element.areWidgetsEqual(widget1, widget2)).toBe(true);
      expect(element.areWidgetsEqual(widget1, widget3)).toBe(false);
    });
    
    test('should handle different property counts', () => {
      const widget1 = { a: 1, b: 2 };
      const widget2 = { a: 1 };
      
      element = new Element(widget1, null, runtime);
      
      expect(element.areWidgetsEqual(widget1, widget2)).toBe(false);
    });
  });
  
  describe('Statistics', () => {
    test('should provide element stats', () => {
      element = new StatelessElement(widget, null, runtime);
      element.mount();
      
      const stats = element.getStats();
      
      expect(stats.id).toBeDefined();
      expect(stats.type).toBe('StatelessElement');
      expect(stats.mounted).toBe(true);
      expect(stats.depth).toBe(0);
      expect(stats.buildCount).toBeGreaterThan(0);
    });
  });
});

describe('StatelessElement', () => {
  let runtime;
  let widget;
  let element;
  
  beforeEach(() => {
    runtime = new MockRuntime();
    widget = new MockWidget('test');
    Element.resetCounter();
  });
  
  test('should create StatelessElement', () => {
    element = new StatelessElement(widget, null, runtime);
    
    expect(element).toBeInstanceOf(StatelessElement);
    expect(element).toBeInstanceOf(Element);
  });
  
  test('should build from widget', () => {
    element = new StatelessElement(widget, null, runtime);
    
    const vnode = element.build();
    
    expect(vnode).toBeDefined();
    expect(vnode.tag).toBe('div');
  });
  
  test('should provide BuildContext', () => {
    element = new StatelessElement(widget, null, runtime);
    
    const context = element.buildContext();
    
    expect(context.element).toBe(element);
    expect(context.runtime).toBe(runtime);
    expect(context.widget).toBe(widget);
    expect(context.findAncestorWidgetOfExactType).toBeInstanceOf(Function);
  });
  
  test('should find ancestor widget via context', () => {
    const parentWidget = new MockStatefulWidget();
    const parent = new StatefulElement(parentWidget, null, runtime);
    const child = new StatelessElement(widget, parent, runtime);
    
    const context = child.buildContext();
    const found = context.findAncestorWidgetOfExactType(StatefulElement);
    
    expect(found).toBe(parentWidget);
  });
});

describe('StatefulElement', () => {
  let runtime;
  let widget;
  let element;
  
  beforeEach(() => {
    runtime = new MockRuntime();
    widget = new MockStatefulWidget('test');
    Element.resetCounter();
  });
  
  test('should create StatefulElement', () => {
    element = new StatefulElement(widget, null, runtime);
    
    expect(element).toBeInstanceOf(StatefulElement);
    expect(element.state).toBeDefined();
  });
  
  test('should throw error if createState missing', () => {
    widget.createState = null;
    
    expect(() => {
      new StatefulElement(widget, null, runtime);
    }).toThrow('must implement createState');
  });
  
  test('should link state to element', () => {
    element = new StatefulElement(widget, null, runtime);
    
    expect(element.state._element).toBe(element);
    expect(element.state._widget).toBe(widget);
  });
  
  test('should call initState on mount', () => {
    element = new StatefulElement(widget, null, runtime);
    
    element.mount();
    
    expect(element.state.initStateCalled).toBe(true);
    expect(element.state._mounted).toBe(true);
  });
  
  test('should call dispose on unmount', () => {
    element = new StatefulElement(widget, null, runtime);
    element.mount();
    
    element.unmount();
    
    expect(element.state.disposeCalled).toBe(true);
    expect(element.state._mounted).toBe(false);
  });
  
  test('should call didUpdateWidget on update', () => {
    element = new StatefulElement(widget, null, runtime);
    element.mount();
    
    const newWidget = new MockStatefulWidget('new');
    
    element.update(newWidget);
    
    expect(element.state.didUpdateWidgetCalled).toBe(true);
    expect(element.state._widget).toBe(newWidget);
  });
  
  test('should build from state', () => {
    element = new StatefulElement(widget, null, runtime);
    
    const vnode = element.build();
    
    expect(vnode).toBeDefined();
    expect(vnode.children).toContain('Stateful');
  });
  
  test('should provide BuildContext with setState', () => {
    element = new StatefulElement(widget, null, runtime);
    element.mount();
    
    const context = element.buildContext();
    
    expect(context.state).toBe(element.state);
    expect(context.setState).toBeInstanceOf(Function);
  });
  
  test('should track state mounted status', () => {
    element = new StatefulElement(widget, null, runtime);
    
    const stats = element.getStats();
    
    expect(stats.hasState).toBe(true);
    expect(stats.stateMounted).toBe(false);
    
    element.mount();
    
    const mountedStats = element.getStats();
    expect(mountedStats.stateMounted).toBe(true);
  });
});

describe('InheritedElement', () => {
  let runtime;
  let widget;
  let element;
  
  beforeEach(() => {
    runtime = new MockRuntime();
    widget = new MockInheritedWidget('test');
    Element.resetCounter();
  });
  
  test('should create InheritedElement', () => {
    element = new InheritedElement(widget, null, runtime);
    
    expect(element).toBeInstanceOf(InheritedElement);
    expect(element.dependents).toBeDefined();
  });
  
  test('should add dependent', () => {
    element = new InheritedElement(widget, null, runtime);
    const dependent = new StatelessElement(new MockWidget(), null, runtime);
    
    element.addDependent(dependent);
    
    expect(element.hasDependent(dependent)).toBe(true);
    expect(element.dependents.size).toBe(1);
  });
  
  test('should remove dependent', () => {
    element = new InheritedElement(widget, null, runtime);
    const dependent = new StatelessElement(new MockWidget(), null, runtime);
    
    element.addDependent(dependent);
    element.removeDependent(dependent);
    
    expect(element.hasDependent(dependent)).toBe(false);
    expect(element.dependents.size).toBe(0);
  });
  
  test('should notify dependents on update', () => {
    element = new InheritedElement(widget, null, runtime);
    element.mount();
    
    const dependent = new StatelessElement(new MockWidget(), null, runtime);
    dependent.mount();
    
    element.addDependent(dependent);
    
    const newWidget = new MockInheritedWidget('new');
    element.update(newWidget);
    
    expect(dependent.dirty).toBe(true);
  });
  
  test('should clear dependents on unmount', () => {
    element = new InheritedElement(widget, null, runtime);
    element.mount();
    
    const dependent = new StatelessElement(new MockWidget(), null, runtime);
    element.addDependent(dependent);
    
    element.unmount();
    
    expect(element.dependents.size).toBe(0);
  });
  
  test('should provide dependent count in stats', () => {
    element = new InheritedElement(widget, null, runtime);
    
    element.addDependent(new StatelessElement(new MockWidget(), null, runtime));
    element.addDependent(new StatelessElement(new MockWidget(), null, runtime));
    
    const stats = element.getStats();
    
    expect(stats.dependentCount).toBe(2);
  });
  
  test('should throw error when adding null dependent', () => {
    element = new InheritedElement(widget, null, runtime);
    
    expect(() => {
      element.addDependent(null);
    }).toThrow('Element is required');
  });
});

describe('ComponentElement', () => {
  let runtime;
  
  beforeEach(() => {
    runtime = new MockRuntime();
    Element.resetCounter();
  });
  
  test('should create ComponentElement', () => {
    const widget = {
      render: () => ({ tag: 'div', children: ['Component'] })
    };
    
    const element = new ComponentElement(widget, null, runtime);
    
    expect(element).toBeInstanceOf(ComponentElement);
    expect(element.componentState).toBeDefined();
  });
  
  test('should build using render method', () => {
    const widget = {
      render: () => ({ tag: 'span', children: ['Rendered'] })
    };
    
    const element = new ComponentElement(widget, null, runtime);
    const vnode = element.build();
    
    expect(vnode.tag).toBe('span');
    expect(vnode.children).toContain('Rendered');
  });
  
  test('should support setState in context', () => {
    const widget = {
      render: (context) => {
        context.setState({ value: 42 });
        return { tag: 'div', children: ['Component'] };
      }
    };
    
    const element = new ComponentElement(widget, null, runtime);
    element.mount();
    
    expect(element.componentState.value).toBe(42);
  });
});

// Run tests
if (typeof module !== 'undefined' && require.main === module) {
  console.log('Running Element tests...');
}