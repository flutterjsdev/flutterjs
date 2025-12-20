/**
 * Element Test Suite
 * 
 * Comprehensive tests for the FlutterJS Element system
 */


import { Element,StatefulElement,StatelessElement,InheritedElement,ComponentElement } from '../src/element.js';

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

// Mock performance if needed
if (typeof performance === 'undefined') {
  global.performance = { now: () => Date.now() };
}

// Simple test framework
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(testName, fn) {
    try {
      fn();
      this.passed++;
      console.log(`  ✓ ${testName}`);
    } catch (error) {
      this.failed++;
      console.error(`  ✗ ${testName}`);
      console.error(`    ${error.message}`);
    }
  }

  assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
  }

  assertTrue(value, message = 'Expected true') {
    if (value !== true) throw new Error(message);
  }

  assertFalse(value, message = 'Expected false') {
    if (value !== false) throw new Error(message);
  }

  assertNull(value, message = 'Expected null') {
    if (value !== null) throw new Error(message);
  }

  assertNotNull(value, message = 'Expected non-null') {
    if (value === null || value === undefined) throw new Error(message);
  }

  assertThrows(fn, message = 'Expected throw') {
    let thrown = false;
    try {
      fn();
    } catch (e) {
      thrown = true;
    }
    if (!thrown) throw new Error(message);
  }

  assertContains(array, value) {
    if (!array.includes(value)) {
      throw new Error(`Array does not contain ${value}`);
    }
  }

  assertNotContains(array, value) {
    if (array.includes(value)) {
      throw new Error(`Array contains ${value}`);
    }
  }

  report() {
    console.log(`\n${this.name}`);
    console.log(`${this.passed + this.failed} tests: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

const suites = [];

// Test Suite 1: Element Base Class
const suite1 = new TestSuite('Element Base Class');
suites.push(suite1);

suite1.test('should create element with required parameters', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget('test-key');
  Element.resetCounter();

  const element = new Element(widget, null, runtime);

  this.assertEqual(element.widget, widget);
  this.assertEqual(element.parent, null);
  this.assertEqual(element.runtime, runtime);
});

suite1.test('should throw error without widget', function () {
  const runtime = new MockRuntime();

  this.assertThrows(() => {
    new Element(null, null, runtime);
  }, 'Expected error for null widget');
});

suite1.test('should throw error without runtime', function () {
  const widget = new MockWidget();

  this.assertThrows(() => {
    new Element(widget, null, null);
  }, 'Expected error for null runtime');
});

suite1.test('should initialize with default state', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new Element(widget, null, runtime);

  this.assertFalse(element.mounted);
  this.assertFalse(element.dirty);
  this.assertFalse(element.building);
  this.assertEqual(element.children.length, 0);
  this.assertNull(element.vnode);
  this.assertNull(element.domNode);
});

suite1.test('should set correct depth', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const parent = new Element(widget, null, runtime);
  const child = new Element(widget, parent, runtime);
  const grandchild = new Element(widget, child, runtime);

  this.assertEqual(parent.depth, 0);
  this.assertEqual(child.depth, 1);
  this.assertEqual(grandchild.depth, 2);
});

suite1.test('should generate unique IDs', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const el1 = new Element(widget, null, runtime);
  const el2 = new Element(widget, null, runtime);
  const el3 = new Element(widget, null, runtime);

  this.assertEqual(el1.id, 'el_1');
  this.assertEqual(el2.id, 'el_2');
  this.assertEqual(el3.id, 'el_3');
});

suite1.test('should store widget key', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget('test-key');
  Element.resetCounter();

  const element = new Element(widget, null, runtime);

  this.assertEqual(element.key, 'test-key');
});

// Test Suite 2: Build
const suite2 = new TestSuite('Element Build');
suites.push(suite2);

suite2.test('should throw error if build not implemented', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new Element(widget, null, runtime);

  this.assertThrows(() => {
    element.build();
  });
});

suite2.test('should track build count', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);

  this.assertEqual(element.buildCount, 0);

  element.performBuild();
  this.assertEqual(element.buildCount, 1);

  element.performBuild();
  this.assertEqual(element.buildCount, 2);
});

suite2.test('should track build duration', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);

  element.performBuild();

  this.assertTrue(element.lastBuildDuration >= 0);
  this.assertTrue(element.lastBuildTime > 0);
});

// Test Suite 3: Mounting
const suite3 = new TestSuite('Element Mounting');
suites.push(suite3);

suite3.test('should mount element', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);

  element.mount();

  this.assertTrue(element.mounted);
  this.assertNotNull(element.vnode);
});

suite3.test('should not mount twice', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);

  element.mount();
  element.mount(); // Should warn but not fail

  this.assertTrue(element.mounted);
});

suite3.test('should mount children', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const parent = new StatelessElement(widget, null, runtime);
  const child1 = new StatelessElement(widget, parent, runtime);
  const child2 = new StatelessElement(widget, parent, runtime);

  parent.children = [child1, child2];

  parent.mount();

  this.assertTrue(parent.mounted);
  this.assertTrue(child1.mounted);
  this.assertTrue(child2.mounted);
});

// Test Suite 4: Update
const suite4 = new TestSuite('Element Update');
suites.push(suite4);

suite4.test('should update widget', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);
  element.mount();

  const newWidget = new MockWidget('new-key');

  element.update(newWidget);

  this.assertEqual(element.widget, newWidget);
});

suite4.test('should mark dirty if widget changed', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);
  element.mount();

  const newWidget = new MockWidget('different');

  element.update(newWidget);

  this.assertTrue(element.dirty);
  this.assertTrue(runtime.dirtyElements.has(element));
});

suite4.test('should throw error if newWidget is null', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);

  this.assertThrows(() => {
    element.update(null);
  });
});

// Test Suite 5: Unmount
const suite5 = new TestSuite('Element Unmount');
suites.push(suite5);

suite5.test('should unmount element', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);
  element.mount();

  element.unmount();

  this.assertFalse(element.mounted);
  this.assertEqual(element.children.length, 0);
  this.assertNull(element.vnode);
  this.assertNull(element.domNode);
});

suite5.test('should unmount children first', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const parent = new StatelessElement(widget, null, runtime);
  const child = new StatelessElement(widget, parent, runtime);

  parent.children = [child];
  parent.mount();
  child.mount();

  parent.unmount();

  this.assertFalse(child.mounted);
  this.assertFalse(parent.mounted);
});

// Test Suite 6: Children Management
const suite6 = new TestSuite('Element Children Management');
suites.push(suite6);

suite6.test('should add child', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const parent = new StatelessElement(widget, null, runtime);
  const child = new StatelessElement(widget, null, runtime);

  parent.addChild(child);

  this.assertContains(parent.children, child);
  this.assertEqual(child.parent, parent);
});

suite6.test('should track child by key', function () {
  const runtime = new MockRuntime();
  Element.resetCounter();

  const parent = new StatelessElement(new MockWidget(), null, runtime);
  const child = new StatelessElement(new MockWidget('child-key'), null, runtime);

  parent.addChild(child);

  this.assertEqual(parent.findChildByKey('child-key'), child);
});

suite6.test('should remove child', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const parent = new StatelessElement(widget, null, runtime);
  const child = new StatelessElement(widget, null, runtime);

  parent.addChild(child);
  parent.removeChild(child);

  this.assertNotContains(parent.children, child);
  this.assertNull(child.parent);
});

suite6.test('should throw error when adding null child', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);

  this.assertThrows(() => {
    element.addChild(null);
  });
});

// Test Suite 7: Ancestor Methods
const suite7 = new TestSuite('Element Ancestor Methods');
suites.push(suite7);

suite7.test('should find ancestor of type', function () {
  const runtime = new MockRuntime();
  Element.resetCounter();

  const grandparent = new StatelessElement(new MockWidget(), null, runtime);
  const parent = new StatefulElement(new MockStatefulWidget(), grandparent, runtime);
  const child = new StatelessElement(new MockWidget(), parent, runtime);

  const found = child.findAncestorOfType(StatefulElement);

  this.assertEqual(found, parent);
});

suite7.test('should return null if ancestor not found', function () {
  const runtime = new MockRuntime();
  Element.resetCounter();

  const parent = new StatelessElement(new MockWidget(), null, runtime);
  const child = new StatelessElement(new MockWidget(), parent, runtime);

  const found = child.findAncestorOfType(StatefulElement);

  this.assertNull(found);
});

suite7.test('should visit ancestors', function () {
  const runtime = new MockRuntime();
  Element.resetCounter();

  const grandparent = new StatelessElement(new MockWidget(), null, runtime);
  const parent = new StatelessElement(new MockWidget(), grandparent, runtime);
  const child = new StatelessElement(new MockWidget(), parent, runtime);

  const visited = [];

  child.visitAncestors((element) => {
    visited.push(element);
    return true;
  });

  this.assertEqual(visited.length, 2);
  this.assertEqual(visited[0], parent);
  this.assertEqual(visited[1], grandparent);
});

// Test Suite 8: StatelessElement
const suite8 = new TestSuite('StatelessElement');
suites.push(suite8);

suite8.test('should create StatelessElement', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);

  this.assertTrue(element instanceof StatelessElement);
  this.assertTrue(element instanceof Element);
});

suite8.test('should build from widget', function () {
  const runtime = new MockRuntime();
  const widget = new MockWidget();
  Element.resetCounter();

  const element = new StatelessElement(widget, null, runtime);

  const vnode = element.build();

  this.assertNotNull(vnode);
  this.assertEqual(vnode.tag, 'div');
});

// Test Suite 9: StatefulElement
const suite9 = new TestSuite('StatefulElement');
suites.push(suite9);

suite9.test('should create StatefulElement', function () {
  const runtime = new MockRuntime();
  const widget = new MockStatefulWidget();
  Element.resetCounter();

  const element = new StatefulElement(widget, null, runtime);

  this.assertTrue(element instanceof StatefulElement);
  this.assertNotNull(element.state);
});

suite9.test('should throw error if createState missing', function () {
  const runtime = new MockRuntime();
  const widget = new MockStatefulWidget();
  widget.createState = null;
  Element.resetCounter();

  this.assertThrows(() => {
    new StatefulElement(widget, null, runtime);
  });
});

suite9.test('should link state to element', function () {
  const runtime = new MockRuntime();
  const widget = new MockStatefulWidget();
  Element.resetCounter();

  const element = new StatefulElement(widget, null, runtime);

  this.assertEqual(element.state._element, element);
  this.assertEqual(element.state._widget, widget);
});

suite9.test('should call initState on mount', function () {
  const runtime = new MockRuntime();
  const widget = new MockStatefulWidget();
  Element.resetCounter();

  const element = new StatefulElement(widget, null, runtime);

  element.mount();

  this.assertTrue(element.state.initStateCalled);
  this.assertTrue(element.state._mounted);
});

suite9.test('should call dispose on unmount', function () {
  const runtime = new MockRuntime();
  const widget = new MockStatefulWidget();
  Element.resetCounter();

  const element = new StatefulElement(widget, null, runtime);
  element.mount();

  element.unmount();

  this.assertTrue(element.state.disposeCalled);
  this.assertFalse(element.state._mounted);
});

// Test Suite 10: InheritedElement
const suite10 = new TestSuite('InheritedElement');
suites.push(suite10);

suite10.test('should create InheritedElement', function () {
  const runtime = new MockRuntime();
  const widget = new MockInheritedWidget();
  Element.resetCounter();

  const element = new InheritedElement(widget, null, runtime);

  this.assertTrue(element instanceof InheritedElement);
  this.assertNotNull(element.dependents);
});

suite10.test('should add dependent', function () {
  const runtime = new MockRuntime();
  Element.resetCounter();

  const element = new InheritedElement(new MockInheritedWidget(), null, runtime);
  const dependent = new StatelessElement(new MockWidget(), null, runtime);

  element.addDependent(dependent);

  this.assertTrue(element.hasDependent(dependent));
  this.assertEqual(element.dependents.size, 1);
});

suite10.test('should throw error when adding null dependent', function () {
  const runtime = new MockRuntime();
  Element.resetCounter();

  const element = new InheritedElement(new MockInheritedWidget(), null, runtime);

  this.assertThrows(() => {
    element.addDependent(null);
  });
});

// Print summary
console.log('\n' + '='.repeat(60));
console.log('ELEMENT TEST SUITE');
console.log('='.repeat(60));

let totalPassed = 0;
let totalFailed = 0;

suites.forEach(suite => {
  const passed = suite.report();
  totalPassed += suite.passed;
  totalFailed += suite.failed;
});

console.log('\n' + '='.repeat(60));
console.log(`TOTAL: ${totalPassed + totalFailed} tests`);
console.log(`PASSED: ${totalPassed}`);
console.log(`FAILED: ${totalFailed}`);
console.log('='.repeat(60));

if (totalFailed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`✗ ${totalFailed} test(s) failed`);
  process.exit(1);
}