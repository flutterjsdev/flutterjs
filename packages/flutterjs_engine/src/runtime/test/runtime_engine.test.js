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
} = require('../src/runtime_engine.js');

// Mock DOM for Node.js environment
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => ({
      tag,
      className: '',
      style: {},
      textContent: '',
      setAttribute: function(key, value) { this[key] = value; },
      appendChild: function(child) {
        if (!this.children) this.children = [];
        this.children.push(child);
      },
      createTextNode: (text) => ({ nodeValue: text, isTextNode: true }),
      firstChild: null
    }),
    createTextNode: (text) => ({ nodeValue: text, isTextNode: true })
  };
  
  global.HTMLElement = class {};
  
  global.performance = {
    now: () => Date.now()
  };
  
  global.requestAnimationFrame = (cb) => {
    setTimeout(cb, 0);
    return Date.now();
  };
}

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
    this._mounted = false;
  }
  
  initState() {
    this._mounted = true;
  }
  
  build(context) {
    return { tag: 'div', children: ['Stateful'] };
  }
  
  dispose() {
    this._mounted = false;
  }
}

class InheritedWidget extends TestWidget {
  constructor(key, child) {
    super(key);
    this.child = child;
  }
  
  updateShouldNotify(oldWidget) {
    return true;
  }
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
      fn.call(this);
      this.passed++;
      console.log(`  ✓ ${testName}`);
    } catch (error) {
      this.failed++;
      console.error(`  ✗ ${testName}`);
      console.error(`    ${error.message}`);
      console.error(`    ${error.stack}`);
    }
  }
  
  assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
  }
  
  assertNotEqual(actual, expected, message = '') {
    if (actual === expected) {
      throw new Error(`${message}\nExpected NOT equal: ${expected}\nActual: ${actual}`);
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
  
  assertGreaterThan(actual, expected, message = '') {
    if (actual <= expected) {
      throw new Error(`${message}\nExpected > ${expected}\nActual: ${actual}`);
    }
  }
  
  assertGreaterThanOrEqual(actual, expected, message = '') {
    if (actual < expected) {
      throw new Error(`${message}\nExpected >= ${expected}\nActual: ${actual}`);
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

// Test Suite 1: RuntimeEngine Initialization
const suite1 = new TestSuite('RuntimeEngine Initialization');
suites.push(suite1);

suite1.test('should create runtime with default state', function() {
  const runtime = new RuntimeEngine();
  
  this.assertFalse(runtime.mounted);
  this.assertFalse(runtime.disposed);
  this.assertEqual(runtime.dirtyElements.size, 0);
  this.assertEqual(runtime.frameCounter, 0);
});

suite1.test('should have configuration options', function() {
  const runtime = new RuntimeEngine();
  
  this.assertNotNull(runtime.config);
  this.assertTrue(runtime.config.batchUpdates);
  this.assertFalse(runtime.config.debugMode);
});

suite1.test('should allow debug mode configuration', function() {
  const runtime = new RuntimeEngine();
  
  runtime.setDebugMode(true);
  
  this.assertTrue(runtime.config.debugMode);
});

// Test Suite 2: Mount
const suite2 = new TestSuite('RuntimeEngine Mount');
suites.push(suite2);

suite2.test('should mount simple stateless widget', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  this.assertTrue(runtime.mounted);
  this.assertEqual(runtime.rootWidget, widget);
  this.assertEqual(runtime.rootElement, container);
  this.assertNotNull(runtime.elementTree);
});

suite2.test('should mount stateful widget', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatefulWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  this.assertTrue(runtime.mounted);
  this.assertTrue(runtime.elementTree instanceof StatefulElement);
});

suite2.test('should throw error if already mounted', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  this.assertThrows(() => {
    runtime.mount(widget, container);
  });
});

suite2.test('should throw error if widget is null', function() {
  const runtime = new RuntimeEngine();
  const container = document.createElement('div');
  
  this.assertThrows(() => {
    runtime.mount(null, container);
  });
});

suite2.test('should throw error if container is invalid', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  
  this.assertThrows(() => {
    runtime.mount(widget, null);
  });
});

suite2.test('should track build and render time', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  this.assertGreaterThanOrEqual(runtime.buildTime, 0);
  this.assertGreaterThanOrEqual(runtime.renderTime, 0);
});

// Test Suite 3: Element Creation
const suite3 = new TestSuite('RuntimeEngine Element Creation');
suites.push(suite3);

suite3.test('should create StatelessElement for StatelessWidget', function() {
  const runtime = new RuntimeEngine();
  Element.resetCounter();
  
  const widget = new StatelessWidget();
  const element = runtime.createElement(widget, null);
  
  this.assertTrue(element instanceof StatelessElement);
  this.assertEqual(element.widget, widget);
  this.assertNull(element.parent);
  this.assertEqual(element.runtime, runtime);
});

suite3.test('should create StatefulElement for StatefulWidget', function() {
  const runtime = new RuntimeEngine();
  Element.resetCounter();
  
  const widget = new StatefulWidget();
  const element = runtime.createElement(widget, null);
  
  this.assertTrue(element instanceof StatefulElement);
  this.assertNotNull(element.state);
});

suite3.test('should create InheritedElement for InheritedWidget', function() {
  const runtime = new RuntimeEngine();
  Element.resetCounter();
  
  const widget = new InheritedWidget();
  const element = runtime.createElement(widget, null);
  
  this.assertTrue(element instanceof InheritedElement);
});

suite3.test('should throw error for unknown widget type', function() {
  const runtime = new RuntimeEngine();
  Element.resetCounter();
  
  const widget = { unknown: true };
  
  this.assertThrows(() => {
    runtime.createElement(widget, null);
  });
});

suite3.test('should set parent reference', function() {
  const runtime = new RuntimeEngine();
  Element.resetCounter();
  
  const parentWidget = new StatelessWidget();
  const parent = runtime.createElement(parentWidget, null);
  
  const childWidget = new StatelessWidget();
  const child = runtime.createElement(childWidget, parent);
  
  this.assertEqual(child.parent, parent);
});

// Test Suite 4: Update Scheduling
const suite4 = new TestSuite('RuntimeEngine Update Scheduling');
suites.push(suite4);

suite4.test('should mark element dirty', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  const element = runtime.elementTree;
  
  this.assertFalse(runtime.updateScheduled);
  
  runtime.markNeedsBuild(element);
  
  this.assertTrue(runtime.dirtyElements.has(element));
});

suite4.test('should not schedule duplicate updates', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  const element = runtime.elementTree;
  
  runtime.markNeedsBuild(element);
  const firstScheduled = runtime.updateScheduled;
  
  runtime.markNeedsBuild(element);
  
  this.assertEqual(runtime.updateScheduled, firstScheduled);
});

suite4.test('should handle markNeedsBuild with null element', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  this.assertThrows(() => {
    runtime.markNeedsBuild(null);
  }, false); // Should not throw, just warn
});

suite4.test('should not schedule updates when not mounted', function() {
  const runtime = new RuntimeEngine();
  Element.resetCounter();
  
  const element = new Element({}, null, runtime);
  
  runtime.markNeedsBuild(element);
  
  this.assertFalse(runtime.updateScheduled);
});

// Test Suite 5: Services
const suite5 = new TestSuite('RuntimeEngine Services');
suites.push(suite5);

suite5.test('should register service', function() {
  const runtime = new RuntimeEngine();
  const service = { name: 'TestService', value: 42 };
  
  runtime.registerService('test', service);
  
  this.assertEqual(runtime.getService('test'), service);
});

suite5.test('should retrieve registered service', function() {
  const runtime = new RuntimeEngine();
  
  runtime.registerService('theme', { color: 'blue' });
  
  const theme = runtime.getService('theme');
  
  this.assertEqual(theme.color, 'blue');
});

suite5.test('should return undefined for unknown service', function() {
  const runtime = new RuntimeEngine();
  
  const service = runtime.getService('unknown');
  
  this.assertEqual(service, undefined);
});

// Test Suite 6: Statistics
const suite6 = new TestSuite('RuntimeEngine Statistics');
suites.push(suite6);

suite6.test('should provide performance stats', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  const stats = runtime.getStats();
  
  this.assertTrue(stats.mounted);
  this.assertNotNull(stats.frameCount);
  this.assertNotNull(stats.buildTime);
  this.assertNotNull(stats.renderTime);
});

suite6.test('should track dirty elements count', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  runtime.markNeedsBuild(runtime.elementTree);
  
  const stats = runtime.getStats();
  
  this.assertGreaterThan(stats.dirtyElements, 0);
});

// Test Suite 7: Unmount
const suite7 = new TestSuite('RuntimeEngine Unmount');
suites.push(suite7);

suite7.test('should unmount application', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  runtime.unmount();
  
  this.assertFalse(runtime.mounted);
  this.assertNull(runtime.elementTree);
  this.assertEqual(runtime.dirtyElements.size, 0);
});

suite7.test('should handle unmount when not mounted', function() {
  const runtime = new RuntimeEngine();
  
  this.assertThrows(() => {
    runtime.unmount();
  }, false); // Should not throw, just warn
});

suite7.test('should clean up services', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  runtime.registerService('test', { value: 123 });
  this.assertGreaterThan(runtime.serviceRegistry.size, 0);
  
  runtime.unmount();
  
  this.assertEqual(runtime.serviceRegistry.size, 0);
});

// Test Suite 8: Lifecycle
const suite8 = new TestSuite('RuntimeEngine Lifecycle');
suites.push(suite8);

suite8.test('should call initState on StatefulWidget mount', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatefulWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  const state = runtime.elementTree.state;
  this.assertTrue(state._mounted);
});

suite8.test('should call dispose on unmount', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatefulWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  const state = runtime.elementTree.state;
  this.assertTrue(state._mounted);
  
  runtime.unmount();
  
  this.assertFalse(state._mounted);
});

// Test Suite 9: Dispose
const suite9 = new TestSuite('RuntimeEngine Dispose');
suites.push(suite9);

suite9.test('should dispose runtime', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  const container = document.createElement('div');
  
  runtime.mount(widget, container);
  
  runtime.dispose();
  
  this.assertTrue(runtime.disposed);
  this.assertFalse(runtime.mounted);
  this.assertNull(runtime.rootWidget);
  this.assertNull(runtime.rootElement);
});

suite9.test('should not allow operations after dispose', function() {
  const runtime = new RuntimeEngine();
  Element.resetCounter();
  
  runtime.dispose();
  
  const element = new Element({}, null, runtime);
  
  runtime.markNeedsBuild(element);
  
  // Should not schedule update
  this.assertFalse(runtime.updateScheduled);
});

// Test Suite 10: Widget Type Detection
const suite10 = new TestSuite('RuntimeEngine Widget Type Detection');
suites.push(suite10);

suite10.test('should detect StatelessWidget', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatelessWidget();
  
  this.assertTrue(runtime.isStatelessWidget(widget));
  this.assertFalse(runtime.isStatefulWidget(widget));
  this.assertFalse(runtime.isInheritedWidget(widget));
});

suite10.test('should detect StatefulWidget', function() {
  const runtime = new RuntimeEngine();
  const widget = new StatefulWidget();
  
  this.assertFalse(runtime.isStatelessWidget(widget));
  this.assertTrue(runtime.isStatefulWidget(widget));
  this.assertFalse(runtime.isInheritedWidget(widget));
});

suite10.test('should detect InheritedWidget', function() {
  const runtime = new RuntimeEngine();
  const widget = new InheritedWidget();
  
  this.assertFalse(runtime.isStatelessWidget(widget));
  this.assertFalse(runtime.isStatefulWidget(widget));
  this.assertTrue(runtime.isInheritedWidget(widget));
});

// Print summary
console.log('\n' + '='.repeat(60));
console.log('RUNTIME ENGINE TEST SUITE');
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
console.log(`SUCCESS RATE: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (totalFailed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`✗ ${totalFailed} test(s) failed`);
  process.exit(1);
}