/**
 * BuildContext Tests
 * 
 * Test suite for BuildContext class
 * Tests ancestor finding, inherited widgets, services, and element access
 */

// Mock document for Node.js environment
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => ({
      style: {},
      offsetWidth: 200,
      offsetHeight: 100,
      offsetLeft: 0,
      offsetTop: 0
    })
  };
}

import { BuildContext } from '../src/build_context.js';

// Mock classes
class MockWidget {
  constructor(name) {
    this.name = name;
  }
}

class MockState {
  constructor(name) {
    this.name = name;
  }
}

class MockElement {
  constructor(id = 'el_1', widget = null, state = null) {
    this.id = id;
    this.widget = widget || new MockWidget('Widget');
    this.state = state;
    this.parent = null;
    this.children = [];
    this.mounted = true;
    this.depth = 0;
    this.domNode = null;
  }
}

class MockRuntime {
  constructor() {
    this.serviceRegistry = new Map();
    this._ThemeClass = null;
    this._MediaQueryClass = null;
  }

  registerService(name, service) {
    this.serviceRegistry.set(name, service);
  }
}

class MockInheritedElement extends MockElement {
  constructor(id, widget) {
    super(id, widget);
    this.dependents = new Set();
  }

  addDependent(element) {
    this.dependents.add(element);
  }
}

class MockTheme extends MockWidget {
  constructor() {
    super('Theme');
    this.data = { primaryColor: '#6750a4' };
  }
}

class MockMediaQuery extends MockWidget {
  constructor() {
    super('MediaQuery');
    this.data = {
      size: { width: 1024, height: 768 },
      orientation: 'landscape'
    };
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

  // Test 1: Initialization
  test.describe('BuildContext: Initialization', () => {
    test.it('should create with element and runtime', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      test.assert(context !== null, 'Context should be created');
      test.assertEqual(context.element, element, 'Should store element');
      test.assertEqual(context._runtime, runtime, 'Should store runtime');
    });

    test.it('should create with state', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();
      const state = new MockState('TestState');

      const context = new BuildContext(element, runtime, state);

      test.assertEqual(context.state, state, 'Should store state');
    });

    test.it('should throw without element', () => {
      const runtime = new MockRuntime();

      try {
        new BuildContext(null, runtime);
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('Element'), 'Should mention element');
      }
    });

    test.it('should throw without runtime', () => {
      const element = new MockElement();

      try {
        new BuildContext(element, null);
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('Runtime'), 'Should mention runtime');
      }
    });
  });

  // Test 2: Basic getters
  test.describe('BuildContext: Basic Getters', () => {
    test.it('should return widget', () => {
      const widget = new MockWidget('TestWidget');
      const element = new MockElement('el_1', widget);
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      test.assertEqual(context.widget, widget, 'Should return widget');
    });

    test.it('should return state', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();
      const state = new MockState('TestState');

      const context = new BuildContext(element, runtime, state);

      test.assertEqual(context.state, state, 'Should return state');
    });

    test.it('should return null state when not provided', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      test.assertNull(context.state, 'Should return null for state');
    });

    test.it('should return element', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      test.assertEqual(context.element, element, 'Should return element');
    });

    test.it('should return mounted status', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      test.assert(context.mounted === true, 'Should be mounted');

      element.mounted = false;
      test.assert(context.mounted === false, 'Should be unmounted');
    });
  });

  // Test 3: Find ancestor widget
  test.describe('BuildContext: Find Ancestor Widget', () => {
    test.it('should find direct parent widget', () => {
      const parentWidget = new MockWidget('Parent');
      const parentElement = new MockElement('el_1', parentWidget);

      const childWidget = new MockWidget('Child');
      const childElement = new MockElement('el_2', childWidget);
      childElement.parent = parentElement;

      const runtime = new MockRuntime();
      const context = new BuildContext(childElement, runtime);

      const found = context.findAncestorWidgetOfExactType(MockWidget);

      test.assertEqual(found, parentWidget, 'Should find parent widget');
    });

    test.it('should find distant ancestor widget', () => {
      class GrandparentWidget extends MockWidget { }
      class ParentWidget extends MockWidget { }

      const grandparentWidget = new GrandparentWidget('Grandparent');
      const grandparentElement = new MockElement('el_1', grandparentWidget);

      const parentElement = new MockElement('el_2', new ParentWidget('Parent'));
      parentElement.parent = grandparentElement;

      const childElement = new MockElement('el_3', new MockWidget('Child'));
      childElement.parent = parentElement;

      const runtime = new MockRuntime();
      const context = new BuildContext(childElement, runtime);

      const found = context.findAncestorWidgetOfExactType(GrandparentWidget);

      test.assertEqual(found, grandparentWidget, 'Should find grandparent');
    });

    test.it('should return null if not found', () => {
      class OtherWidget { }

      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      const found = context.findAncestorWidgetOfExactType(OtherWidget);

      test.assertNull(found, 'Should return null');
    });

    test.it('should throw without type', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      try {
        context.findAncestorWidgetOfExactType(null);
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('type'), 'Should mention type');
      }
    });

    test.it('should require exact type match', () => {
      class Widget1 extends MockWidget { }
      class Widget2 extends MockWidget { }

      const widget1 = new Widget1();
      const element1 = new MockElement('el_1', widget1);

      const element2 = new MockElement('el_2');
      element2.parent = element1;

      const runtime = new MockRuntime();
      const context = new BuildContext(element2, runtime);

      const found = context.findAncestorWidgetOfExactType(Widget2);

      test.assertNull(found, 'Should not find different type');
    });
  });

  // Test 4: Find ancestor state
  test.describe('BuildContext: Find Ancestor State', () => {
    test.it('should find parent state', () => {
      const parentState = new MockState('ParentState');
      const parentElement = new MockElement('el_1', new MockWidget(), parentState);

      const childElement = new MockElement('el_2');
      childElement.parent = parentElement;

      const runtime = new MockRuntime();
      const context = new BuildContext(childElement, runtime);

      const found = context.findAncestorStateOfType(MockState);

      test.assertEqual(found, parentState, 'Should find parent state');
    });

    test.it('should find distant ancestor state', () => {
      const grandparentState = new MockState('GrandparentState');
      const grandparentElement = new MockElement('el_1', new MockWidget(), grandparentState);

      const parentElement = new MockElement('el_2');
      parentElement.parent = grandparentElement;

      const childElement = new MockElement('el_3');
      childElement.parent = parentElement;

      const runtime = new MockRuntime();
      const context = new BuildContext(childElement, runtime);

      const found = context.findAncestorStateOfType(MockState);

      test.assertEqual(found, grandparentState, 'Should find grandparent state');
    });

    test.it('should return null if state not found', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      const found = context.findAncestorStateOfType(MockState);

      test.assertNull(found, 'Should return null');
    });

    test.it('should skip elements without state', () => {
      const stateElement = new MockElement('el_1', new MockWidget(), new MockState());

      const skipElement = new MockElement('el_2'); // No state
      skipElement.parent = stateElement;

      const searchElement = new MockElement('el_3');
      searchElement.parent = skipElement;

      const runtime = new MockRuntime();
      const context = new BuildContext(searchElement, runtime);

      const found = context.findAncestorStateOfType(MockState);

      test.assertNotNull(found, 'Should find state through elements without state');
    });
  });

  // Test 5: Find render object (DOM)
  test.describe('BuildContext: Find Render Object', () => {
    test.it('should find parent DOM node', () => {
      const domNode = document.createElement('div');
      const parentElement = new MockElement('el_1');
      parentElement.domNode = domNode;

      const childElement = new MockElement('el_2');
      childElement.parent = parentElement;

      const runtime = new MockRuntime();
      const context = new BuildContext(childElement, runtime);

      const found = context.findRenderObject();

      test.assertEqual(found, domNode, 'Should find DOM node');
    });

    test.it('should return null if no DOM node', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      const found = context.findRenderObject();

      test.assertNull(found, 'Should return null');
    });
  });

  // Test 6: Inherited widgets
  test.describe('BuildContext: Inherited Widgets', () => {
    test.it('should find and depend on InheritedWidget', () => {
      const themeWidget = new MockTheme();
      const inheritedElement = new MockInheritedElement('el_1', themeWidget);

      const childElement = new MockElement('el_2');
      childElement.parent = inheritedElement;

      const runtime = new MockRuntime();
      const context = new BuildContext(childElement, runtime);

      const found = context.dependOnInheritedWidgetOfExactType(MockTheme);

      test.assertEqual(found, themeWidget, 'Should find inherited widget');
      test.assert(
        inheritedElement.dependents.has(childElement),
        'Should register dependency'
      );
    });

    test.it('should cache inherited widget', () => {
      const themeWidget = new MockTheme();
      const inheritedElement = new MockInheritedElement('el_1', themeWidget);

      const childElement = new MockElement('el_2');
      childElement.parent = inheritedElement;

      const runtime = new MockRuntime();
      const context = new BuildContext(childElement, runtime);

      const found1 = context.dependOnInheritedWidgetOfExactType(MockTheme);
      const found2 = context.dependOnInheritedWidgetOfExactType(MockTheme);

      test.assertEqual(found1, found2, 'Should return cached value');
    });

    test.it('should cache null for not found', () => {
      class OtherWidget { }

      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      const found1 = context.dependOnInheritedWidgetOfExactType(OtherWidget);
      const found2 = context.dependOnInheritedWidgetOfExactType(OtherWidget);

      test.assertNull(found1, 'Should return null');
      test.assertNull(found2, 'Should return cached null');
    });
  });

  // Test 7: Services
  test.describe('BuildContext: Services', () => {
    test.it('should get registered service', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const service = { name: 'TestService' };
      runtime.registerService('testService', service);

      const context = new BuildContext(element, runtime);

      const found = context.getService('testService');

      test.assertEqual(found, service, 'Should return service');
    });

    test.it('should return null for unregistered service', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      const found = context.getService('unknownService');

      test.assertNull(found, 'Should return null');
    });

    test.it('should throw without service name', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      try {
        context.getService(null);
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('name'), 'Should mention name');
      }
    });
  });

  // Test 8: Convenience methods
  test.describe('BuildContext: Convenience Methods', () => {
    test.it('should get theme', () => {
      const themeWidget = new MockTheme();
      const inheritedElement = new MockInheritedElement('el_1', themeWidget);
      inheritedElement.widget = themeWidget;

      const childElement = new MockElement('el_2');
      childElement.parent = inheritedElement;

      const runtime = new MockRuntime();
      runtime._ThemeClass = MockTheme;

      const context = new BuildContext(childElement, runtime);

      const theme = context.theme();

      test.assertNotNull(theme, 'Should return theme data');
      test.assertEqual(theme.primaryColor, '#6750a4', 'Should have theme data');
    });

    test.it('should get media query', () => {
      const mqWidget = new MockMediaQuery();
      const inheritedElement = new MockInheritedElement('el_1', mqWidget);
      inheritedElement.widget = mqWidget;

      const childElement = new MockElement('el_2');
      childElement.parent = inheritedElement;

      const runtime = new MockRuntime();
      runtime._MediaQueryClass = MockMediaQuery;

      const context = new BuildContext(childElement, runtime);

      const mq = context.mediaQuery();

      test.assertNotNull(mq, 'Should return MediaQuery data');
      test.assertEqual(mq.size.width, 1024, 'Should have width');
    });
  });

  // Test 9: Element visitor
  test.describe('BuildContext: Visitor', () => {
    test.it('should visit all ancestors', () => {
      const el1 = new MockElement('el_1');
      const el2 = new MockElement('el_2');
      el2.parent = el1;
      const el3 = new MockElement('el_3');
      el3.parent = el2;

      const runtime = new MockRuntime();
      const context = new BuildContext(el3, runtime);

      const visited = [];
      context.visitAncestorElements((el) => {
        visited.push(el.id);
      });

      test.assertEqual(visited.length, 2, 'Should visit 2 ancestors');
      test.assertEqual(visited[0], 'el_2', 'Should visit el_2 first');
      test.assertEqual(visited[1], 'el_1', 'Should visit el_1 second');
    });

    test.it('should stop on false return', () => {
      const el1 = new MockElement('el_1');
      const el2 = new MockElement('el_2');
      el2.parent = el1;
      const el3 = new MockElement('el_3');
      el3.parent = el2;

      const runtime = new MockRuntime();
      const context = new BuildContext(el3, runtime);

      const visited = [];
      context.visitAncestorElements((el) => {
        visited.push(el.id);
        return visited.length < 1; // Stop after first
      });

      test.assertEqual(visited.length, 1, 'Should stop after first');
    });
  });

  // Test 10: Size and position
  test.describe('BuildContext: Size and Position', () => {
    test.it('should get size', () => {
      const domNode = document.createElement('div');
      domNode.style.width = '200px';
      domNode.style.height = '100px';

      const element = new MockElement();
      element.domNode = domNode;

      const runtime = new MockRuntime();
      const context = new BuildContext(element, runtime);

      const size = context.size;

      test.assertNotNull(size, 'Should return size');
      test.assertEqual(size.width, 200, 'Should have width');
      test.assertEqual(size.height, 100, 'Should have height');
    });

    test.it('should return null for size without DOM', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      const size = context.size;

      test.assertNull(size, 'Should return null');
    });

    test.it('should get bounds', () => {
      const domNode = document.createElement('div');
      domNode.style.width = '200px';
      domNode.style.height = '100px';

      const element = new MockElement();
      element.domNode = domNode;

      const runtime = new MockRuntime();
      const context = new BuildContext(element, runtime);

      const bounds = context.bounds;

      test.assertNotNull(bounds, 'Should return bounds');
      test.assert('x' in bounds, 'Should have x');
      test.assert('y' in bounds, 'Should have y');
      test.assert('width' in bounds, 'Should have width');
      test.assert('height' in bounds, 'Should have height');
    });
  });
  // Test 11: Info and debugging
  test.describe('BuildContext: Info and Debugging', () => {
    test.it('should get context info', () => {
      const element = new MockElement('el_1', new MockWidget('Test'));
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      const info = context.getInfo();

      test.assert(info.mounted === true, 'Should have mounted');
      test.assertEqual(info.widgetType, 'MockWidget', 'Should have widget type');
      test.assertEqual(info.elementId, 'el_1', 'Should have element ID');
    });

    test.it('should get dependency info', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      const depInfo = context.getDependencyInfo();

      test.assertEqual(depInfo.dependenciesCount, 0, 'Should start with 0');
      test.assertEqual(depInfo.cachedInheritedWidgets, 0, 'Should cache 0 initially');
    });
  });

  // Test 12: Cleanup
  test.describe('BuildContext: Cleanup', () => {
    test.it('should dispose context', () => {
      const element = new MockElement();
      const runtime = new MockRuntime();

      const context = new BuildContext(element, runtime);

      context.dispose();

      test.assertNull(context._element, 'Should clear element');
      test.assertNull(context._runtime, 'Should clear runtime');
    });
  });

  return test.summary();
}

// Run
runTests();
