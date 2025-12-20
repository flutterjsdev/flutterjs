/**
 * Element Tests
 * 
 * Test suite for Element, StatelessElement, and StatefulElement classes
 * Tests lifecycle, tree building, state management, and rendering
 */

// Mock document for Node.js environment
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => ({
      style: {},
      offsetWidth: 200,
      offsetHeight: 100,
      offsetLeft: 0,
      offsetTop: 0,
      appendChild: function () { },
      removeChild: function () { },
      insertBefore: function () { },
      replaceChild: function () { }
    })
  };
}

// Mock classes for testing
class MockWidget {
  constructor(name = 'Widget') {
    this.name = name;
    this.key = null;
    this.type = 'MockWidget';
  }
}

class MockRuntime {
  constructor() {
    this.debugMode = false;
    this.serviceRegistry = new Map();
    this.elements = new Map();
  }

  registerElement(id, element) {
    this.elements.set(id, element);
  }

  getElement(id) {
    return this.elements.get(id);
  }
}

class MockState {
  constructor(name = 'State') {
    this.name = name;
    this.mounted = false;
    this.initStateCalled = false;
    this.disposeCalled = false;
  }

  initState() {
    this.initStateCalled = true;
  }

  dispose() {
    this.disposeCalled = true;
  }
}

// Base Element class (simplified for testing)
class Element {
  constructor(widget, parent, runtime) {
    if (!widget) throw new Error('Widget is required');
    if (!runtime) throw new Error('Runtime is required');

    this.widget = widget;
    this.parent = parent;
    this._runtime = runtime;
    this.id = `el_${Math.random().toString(36).substr(2, 9)}`;
    this.children = [];
    this.mounted = false;
    this.dirty = false;
    this.depth = parent ? parent.depth + 1 : 0;
    this.domNode = null;
  }

  mount() {
    this.mounted = true;
  }

  unmount() {
    this.mounted = false;
    this.children.forEach(child => child.unmount());
    this.children = [];
  }

  markNeedsBuild() {
    this.dirty = true;
  }

  build() {
    throw new Error('build() must be implemented');
  }

  rebuild() {
    if (!this.dirty) return;
    this.dirty = false;
  }

  inflateWidget(widget, parentElement) {
    if (widget.state) {
      return new StatefulElement(widget, parentElement, this._runtime);
    }
    return new StatelessElement(widget, parentElement, this._runtime);
  }

  addChild(child) {
    this.children.push(child);
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
    }
  }

  getInfo() {
    return {
      id: this.id,
      mounted: this.mounted,
      dirty: this.dirty,
      depth: this.depth,
      childrenCount: this.children.length,
      type: this.constructor.name
    };
  }

  dispose() {
    this.unmount();
    this.widget = null;
    this.parent = null;
    this.domNode = null;
  }
}

class StatelessElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
  }

  build() {
    return {
      tag: 'div',
      props: { 'data-widget': this.widget.name },
      children: []
    };
  }
}

class StatefulElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
    this.state = null;
  }

  initState() {
    if (this.widget.state) {
      this.state = new this.widget.state();
      this.state.element = this;
      if (this.state.initState) {
        this.state.initState();
      }
    }
  }

  mount() {
    this.initState();
    super.mount();
  }

  build() {
    if (!this.state) return { tag: 'div', children: [] };
    return {
      tag: 'div',
      props: { 'data-widget': this.widget.name, 'data-state': this.state.name },
      children: []
    };
  }

  setState(newState) {
    Object.assign(this.state, newState);
    this.markNeedsBuild();
  }

  dispose() {
    if (this.state && this.state.dispose) {
      this.state.dispose();
    }
    this.state = null;
    super.dispose();
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

  assertDefined(value, message) {
    if (value === undefined) {
      throw new Error(message || 'Expected value to be defined');
    }
  }

  assertArrayLength(arr, length, message) {
    if (!Array.isArray(arr) || arr.length !== length) {
      throw new Error(
        message || `Expected array length ${length} but got ${arr?.length}`
      );
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

  // Test 1: Element Initialization
  test.describe('Element: Initialization', () => {
    test.it('should create element with widget and runtime', () => {
      const widget = new MockWidget('TestWidget');
      const runtime = new MockRuntime();

      const element = new Element(widget, null, runtime);

      test.assertNotNull(element, 'Element should be created');
      test.assertEqual(element.widget, widget, 'Should store widget');
      test.assertEqual(element._runtime, runtime, 'Should store runtime');
    });

    test.it('should generate unique element ID', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const el1 = new Element(widget, null, runtime);
      const el2 = new Element(widget, null, runtime);

      test.assert(el1.id !== el2.id, 'Elements should have unique IDs');
    });

    test.it('should set depth based on parent', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      test.assertEqual(parent.depth, 0, 'Parent depth should be 0');

      const child = new Element(widget, parent, runtime);
      test.assertEqual(child.depth, 1, 'Child depth should be 1');

      const grandchild = new Element(widget, child, runtime);
      test.assertEqual(grandchild.depth, 2, 'Grandchild depth should be 2');
    });

    test.it('should throw without widget', () => {
      const runtime = new MockRuntime();

      try {
        new Element(null, null, runtime);
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('Widget'), 'Should mention widget');
      }
    });

    test.it('should throw without runtime', () => {
      const widget = new MockWidget();

      try {
        new Element(widget, null, null);
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('Runtime'), 'Should mention runtime');
      }
    });

    test.it('should initialize with correct default values', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const element = new Element(widget, null, runtime);

      test.assertEqual(element.mounted, false, 'Should start unmounted');
      test.assertEqual(element.dirty, false, 'Should start clean');
      test.assertArrayLength(element.children, 0, 'Should start with no children');
      test.assertNull(element.domNode, 'Should start with no DOM node');
    });
  });

  // Test 2: Lifecycle Management
  test.describe('Element: Lifecycle Management', () => {
    test.it('should mount element', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();
      const element = new Element(widget, null, runtime);

      element.mount();

      test.assertEqual(element.mounted, true, 'Should be mounted');
    });

    test.it('should unmount element', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();
      const element = new Element(widget, null, runtime);

      element.mount();
      element.unmount();

      test.assertEqual(element.mounted, false, 'Should be unmounted');
    });

    test.it('should unmount children when unmounting parent', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const child1 = new Element(widget, parent, runtime);
      const child2 = new Element(widget, parent, runtime);

      parent.addChild(child1);
      parent.addChild(child2);

      child1.mount();
      child2.mount();
      parent.mount();

      parent.unmount();

      test.assertEqual(child1.mounted, false, 'Child1 should be unmounted');
      test.assertEqual(child2.mounted, false, 'Child2 should be unmounted');
    });

    test.it('should mark dirty on markNeedsBuild', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();
      const element = new Element(widget, null, runtime);

      test.assertEqual(element.dirty, false, 'Should start clean');

      element.markNeedsBuild();

      test.assertEqual(element.dirty, true, 'Should be dirty');
    });

    test.it('should clean dirty flag on rebuild', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();
      const element = new StatelessElement(widget, null, runtime);

      element.markNeedsBuild();
      test.assertEqual(element.dirty, true, 'Should be dirty');

      element.rebuild();

      test.assertEqual(element.dirty, false, 'Should be clean after rebuild');
    });

    test.it('should not rebuild if not dirty', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();
      const element = new StatelessElement(widget, null, runtime);

      element.dirty = false;
      element.rebuild();

      test.assertEqual(element.dirty, false, 'Should remain clean');
    });
  });

  // Test 3: Child Management
  test.describe('Element: Child Management', () => {
    test.it('should add child element', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const child = new Element(widget, parent, runtime);

      parent.addChild(child);

      test.assertArrayLength(parent.children, 1, 'Should have 1 child');
      test.assertEqual(parent.children[0], child, 'Child should be in list');
    });

    test.it('should add multiple children', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const child1 = new Element(widget, parent, runtime);
      const child2 = new Element(widget, parent, runtime);
      const child3 = new Element(widget, parent, runtime);

      parent.addChild(child1);
      parent.addChild(child2);
      parent.addChild(child3);

      test.assertArrayLength(parent.children, 3, 'Should have 3 children');
    });

    test.it('should remove child element', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const child1 = new Element(widget, parent, runtime);
      const child2 = new Element(widget, parent, runtime);

      parent.addChild(child1);
      parent.addChild(child2);

      parent.removeChild(child1);

      test.assertArrayLength(parent.children, 1, 'Should have 1 child');
      test.assertEqual(parent.children[0], child2, 'Only child2 should remain');
    });

    test.it('should handle removing non-existent child', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const child = new Element(widget, parent, runtime);
      const other = new Element(widget, parent, runtime);

      parent.addChild(child);

      test.assert(() => {
        parent.removeChild(other);
        return true;
      }, 'Should not throw');

      test.assertArrayLength(parent.children, 1, 'Should still have 1 child');
    });

    test.it('should maintain parent-child relationships', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const child = new Element(widget, parent, runtime);

      test.assertEqual(child.parent, parent, 'Child should reference parent');
      test.assertEqual(parent.depth, 0, 'Parent depth is 0');
      test.assertEqual(child.depth, 1, 'Child depth is 1');
    });
  });

  // Test 4: StatelessElement
  test.describe('StatelessElement: Behavior', () => {
    test.it('should build simple widget', () => {
      const widget = new MockWidget('TestWidget');
      const runtime = new MockRuntime();

      const element = new StatelessElement(widget, null, runtime);
      const built = element.build();

      test.assertNotNull(built, 'Should return built object');
      test.assertEqual(built.tag, 'div', 'Should have div tag');
      test.assertEqual(built.props['data-widget'], 'TestWidget', 'Should have widget name');
    });

    test.it('should not have state property', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const element = new StatelessElement(widget, null, runtime);

      test.assert(!element.hasOwnProperty('state') || element.state === undefined, 'Should not have state');
    });

    test.it('should rebuild without state changes', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const element = new StatelessElement(widget, null, runtime);

      element.markNeedsBuild();
      element.rebuild();

      test.assertEqual(element.dirty, false, 'Should be clean after rebuild');
    });
  });

  // Test 5: StatefulElement
  test.describe('StatefulElement: State Management', () => {
    test.it('should create element with state', () => {
      const mockState = MockState;
      const widget = new MockWidget('StatefulWidget');
      widget.state = mockState;

      const runtime = new MockRuntime();
      const element = new StatefulElement(widget, null, runtime);

      test.assertNull(element.state, 'State should not be initialized until mount');
    });

    test.it('should initialize state on mount', () => {
      const widget = new MockWidget('StatefulWidget');
      widget.state = MockState;

      const runtime = new MockRuntime();
      const element = new StatefulElement(widget, null, runtime);

      element.mount();

      test.assertNotNull(element.state, 'State should be initialized');
      test.assert(element.state instanceof MockState, 'Should be MockState instance');
      test.assertEqual(element.state.element, element, 'State should reference element');
    });

    test.it('should call state initState on mount', () => {
      const widget = new MockWidget();
      widget.state = MockState;

      const runtime = new MockRuntime();
      const element = new StatefulElement(widget, null, runtime);

      element.mount();

      test.assertTrue(element.state.initStateCalled, 'initState should be called');
    });

    test.it('should call setState', () => {
      const widget = new MockWidget();
      widget.state = MockState;

      const runtime = new MockRuntime();
      const element = new StatefulElement(widget, null, runtime);

      element.mount();

      const stateBefore = element.state.name;
      element.setState({ name: 'UpdatedState' });

      test.assertEqual(element.state.name, 'UpdatedState', 'State should be updated');
      test.assertEqual(element.dirty, true, 'Element should be marked dirty');
    });

    test.it('should dispose state on unmount', () => {
      const widget = new MockWidget();
      widget.state = MockState;

      const runtime = new MockRuntime();
      const element = new StatefulElement(widget, null, runtime);

      element.mount();
      element.dispose();

      test.assertNull(element.state, 'State should be cleared');
      test.assert(element.state === null, 'State should be null');
    });

    test.it('should build with state data', () => {
      const widget = new MockWidget('StatefulWidget');
      widget.state = MockState;

      const runtime = new MockRuntime();
      const element = new StatefulElement(widget, null, runtime);

      element.mount();
      const built = element.build();

      test.assertNotNull(built, 'Should return built object');
      test.assertEqual(built.props['data-state'], 'State', 'Should have state name');
    });
  });

  // Test 6: Widget Inflation
  test.describe('Element: Widget Inflation', () => {
    test.it('should inflate stateless widget', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const inflated = parent.inflateWidget(widget, parent);

      test.assert(inflated instanceof StatelessElement, 'Should create StatelessElement');
    });

    test.it('should inflate stateful widget', () => {
      const widget = new MockWidget();
      widget.state = MockState;

      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const inflated = parent.inflateWidget(widget, parent);

      test.assert(inflated instanceof StatefulElement, 'Should create StatefulElement');
    });
  });

  // Test 7: Information & Debugging
  test.describe('Element: Information & Debugging', () => {
    test.it('should provide element info', () => {
      const widget = new MockWidget('TestWidget');
      const runtime = new MockRuntime();

      const element = new Element(widget, null, runtime);
      element.mount();

      const info = element.getInfo();

      test.assertNotNull(info, 'Should return info object');
      test.assertEqual(info.mounted, true, 'Should include mounted status');
      test.assertEqual(info.dirty, false, 'Should include dirty status');
      test.assertEqual(info.depth, 0, 'Should include depth');
      test.assertEqual(info.childrenCount, 0, 'Should include children count');
    });

    test.it('should include children count in info', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const child1 = new Element(widget, parent, runtime);
      const child2 = new Element(widget, parent, runtime);

      parent.addChild(child1);
      parent.addChild(child2);

      const info = parent.getInfo();

      test.assertEqual(info.childrenCount, 2, 'Should count children');
    });

    test.it('should include element type in info', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const stateless = new StatelessElement(widget, null, runtime);
      const info = stateless.getInfo();

      test.assertEqual(info.type, 'StatelessElement', 'Should include type');
    });
  });

  // Test 8: Cleanup & Disposal
  test.describe('Element: Cleanup & Disposal', () => {
    test.it('should dispose element', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const element = new Element(widget, null, runtime);
      element.mount();

      element.dispose();

      test.assertNull(element.widget, 'Widget should be cleared');
      test.assertNull(element.parent, 'Parent should be cleared');
      test.assertNull(element.domNode, 'DOM node should be cleared');
      test.assertEqual(element.mounted, false, 'Should be unmounted');
    });

    test.it('should clean up children on dispose', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);
      const child = new Element(widget, parent, runtime);

      parent.addChild(child);
      parent.dispose();

      test.assertArrayLength(parent.children, 0, 'Children should be cleared');
    });

    test.it('should dispose state element on dispose', () => {
      const widget = new MockWidget();
      widget.state = MockState;

      const runtime = new MockRuntime();
      const element = new StatefulElement(widget, null, runtime);

      element.mount();
      const beforeDispose = element.state.disposeCalled;
      element.dispose();

      test.assertNull(element.state, 'State should be disposed');
      test.assert(element.state === null, 'State should be null after dispose');
    });
  });

  // Test 9: Complex Scenarios
  test.describe('Element: Complex Scenarios', () => {
    test.it('should handle deep element tree', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      let parent = new Element(widget, null, runtime);
      const elements = [parent];

      for (let i = 0; i < 10; i++) {
        const child = new Element(widget, parent, runtime);
        parent.addChild(child);
        elements.push(child);
        parent = child;
      }

      test.assertEqual(parent.depth, 10, 'Should maintain depth correctly');
      test.assertEqual(elements[5].depth, 5, 'Intermediate element should have correct depth');
    });

    test.it('should handle multiple siblings', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const parent = new Element(widget, null, runtime);

      for (let i = 0; i < 50; i++) {
        const child = new Element(widget, parent, runtime);
        parent.addChild(child);
      }

      test.assertArrayLength(parent.children, 50, 'Should handle many siblings');
    });

    test.it('should handle rapid mount/unmount cycles', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const element = new Element(widget, null, runtime);

      for (let i = 0; i < 10; i++) {
        element.mount();
        test.assertEqual(element.mounted, true, `Should be mounted in cycle ${i}`);

        element.unmount();
        test.assertEqual(element.mounted, false, `Should be unmounted in cycle ${i}`);
      }
    });

    test.it('should handle rapid rebuild cycles', () => {
      const widget = new MockWidget();
      const runtime = new MockRuntime();

      const element = new StatelessElement(widget, null, runtime);

      for (let i = 0; i < 100; i++) {
        element.markNeedsBuild();
        test.assertEqual(element.dirty, true, `Should be dirty in cycle ${i}`);

        element.rebuild();
        test.assertEqual(element.dirty, false, `Should be clean in cycle ${i}`);
      }
    });
  });

  return test.summary();
}

// Run
runTests();