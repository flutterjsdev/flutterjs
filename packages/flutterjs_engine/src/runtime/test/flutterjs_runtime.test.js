/**
 * FlutterJS Runtime Integration Tests
 * 
 * Comprehensive test suite covering:
 * - Runtime initialization
 * - Application mounting
 * - Hot reload
 * - Service registration
 * - Event system integration
 * - State management
 * - Memory management
 * - Error handling
 * - Lifecycle hooks
 * - Performance monitoring
 * 
 * Run with: node runtime-integration.test.js
 */

const {
  FlutterJSRuntime,
  runApp,
  hotReload,
  getRuntime,
  dispose
} = require('../src/flutterjs_runtime.js');

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
      getElementById: (id) => null,
      createTextNode: (text) => ({ nodeValue: text, isTextNode: true }),
      firstChild: null
    }),
    getElementById: (id) => null,
    body: {
      tag: 'body',
      appendChild: function() { },
      children: []
    },
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

// Simple test framework
class TestSuite {
  constructor(name) {
    this.name = name;
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
    }
  }

  assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(
        `${message}\nExpected: ${expected}\nActual: ${actual}`
      );
    }
  }

  assertNotNull(value, message = 'Expected non-null value') {
    if (value === null || value === undefined) {
      throw new Error(message);
    }
  }

  assertTrue(value, message = 'Expected true') {
    if (value !== true) {
      throw new Error(message);
    }
  }

  assertFalse(value, message = 'Expected false') {
    if (value !== false) {
      throw new Error(message);
    }
  }

  assertThrows(fn, message = 'Expected function to throw') {
    let thrown = false;
    try {
      fn();
    } catch (error) {
      thrown = true;
    }
    if (!thrown) {
      throw new Error(message);
    }
  }

  report() {
    console.log(`\n${this.name}`);
    console.log(`${this.passed + this.failed} tests: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Test widgets
class Widget {
  constructor(options = {}) {
    this.key = options.key;
  }
}

class StatelessWidget extends Widget {
  build(context) {
    return { tag: 'div', children: ['Test Widget'] };
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

const suites = [];

// Test Suite 1: Runtime Initialization
const suite1 = new TestSuite('FlutterJS Runtime Initialization');
suites.push(suite1);

suite1.test('should create runtime instance', function() {
  const runtime = new FlutterJSRuntime();
  this.assertNotNull(runtime);
  this.assertFalse(runtime.isInitialized());
});

suite1.test('should initialize with default config', function() {
  const runtime = new FlutterJSRuntime();
  runtime.initialize();
  this.assertTrue(runtime.isInitialized());
  
  runtime.dispose();
});

suite1.test('should initialize with custom config', function() {
  const runtime = new FlutterJSRuntime({
    debugMode: true,
    routing: true
  });
  runtime.initialize();
  this.assertTrue(runtime.isInitialized());
  this.assertTrue(runtime.config.debugMode);
  this.assertTrue(runtime.config.routing);
  
  runtime.dispose();
});

suite1.test('should prevent double initialization', function() {
  const runtime = new FlutterJSRuntime();
  runtime.initialize();
  runtime.initialize(); // Should be no-op
  this.assertTrue(runtime.isInitialized());
  
  runtime.dispose();
});

suite1.test('should initialize all subsystems', function() {
  const runtime = new FlutterJSRuntime();
  runtime.initialize({ rootElement: document.createElement('div') });

  this.assertNotNull(runtime.engine);
  this.assertNotNull(runtime.eventSystem);
  this.assertNotNull(runtime.gestureRecognizer);
  this.assertNotNull(runtime.focusManager);
  this.assertNotNull(runtime.memoryManager);
  this.assertNotNull(runtime.serviceRegistry);
  this.assertNotNull(runtime.stateManager);

  runtime.dispose();
});

suite1.test('should register built-in services', function() {
  const runtime = new FlutterJSRuntime();
  runtime.initialize();

  this.assertTrue(runtime.serviceRegistry.has('theme'));
  this.assertTrue(runtime.serviceRegistry.has('mediaQuery'));
  this.assertTrue(runtime.serviceRegistry.has('logger'));

  runtime.dispose();
});

suite1.test('should track initialization time', function() {
  const runtime = new FlutterJSRuntime();
  runtime.initialize();

  this.assertTrue(runtime.stats.initTime > 0);

  runtime.dispose();
});

// Test Suite 2: Application Mounting
const suite2 = new TestSuite('FlutterJS Application Mounting');
suites.push(suite2);

suite2.test('should mount application', function() {
  const runtime = new FlutterJSRuntime();
  const widget = new StatelessWidget();
  const container = document.createElement('div');

  runtime.runApp(widget, container);

  this.assertTrue(runtime.isMounted());
  this.assertEqual(runtime.rootWidget, widget);
  this.assertEqual(runtime.containerElement, container);

  runtime.dispose();
});

suite2.test('should auto-initialize on mount', function() {
  const runtime = new FlutterJSRuntime();
  const widget = new StatelessWidget();

  runtime.runApp(widget, document.createElement('div'));

  this.assertTrue(runtime.isInitialized());
  this.assertTrue(runtime.isMounted());

  runtime.dispose();
});

suite2.test('should track mount time', function() {
  const runtime = new FlutterJSRuntime();
  runtime.runApp(new StatelessWidget(), document.createElement('div'));

  this.assertTrue(runtime.stats.mountTime > 0);

  runtime.dispose();
});

suite2.test('should call mount lifecycle hooks', function() {
  const runtime = new FlutterJSRuntime();
  let beforeMountCalled = false;
  let afterMountCalled = false;

  runtime.on('beforeMount', () => { beforeMountCalled = true; });
  runtime.on('afterMount', () => { afterMountCalled = true; });

  runtime.runApp(new StatelessWidget(), document.createElement('div'));

  this.assertTrue(beforeMountCalled);
  this.assertTrue(afterMountCalled);

  runtime.dispose();
});

suite2.test('should require root widget', function() {
  const runtime = new FlutterJSRuntime();

  this.assertThrows(() => {
    runtime.runApp(null, document.createElement('div'));
  });
});

// Test Suite 3: Hot Reload
const suite3 = new TestSuite('FlutterJS Hot Reload');
suites.push(suite3);

suite3.test('should hot reload application', function() {
  const runtime = new FlutterJSRuntime({ enableHotReload: true });
  const widget1 = new StatelessWidget();
  const widget2 = new StatelessWidget();

  runtime.runApp(widget1, document.createElement('div'));
  const frameCount1 = runtime.engine.frameCounter;

  runtime.hotReload(widget2);
  const frameCount2 = runtime.engine.frameCounter;

  this.assertEqual(runtime.rootWidget, widget2);
  this.assertTrue(frameCount2 >= frameCount1);

  runtime.dispose();
});

suite3.test('should skip hot reload if disabled', function() {
  const runtime = new FlutterJSRuntime({ enableHotReload: false });
  const widget1 = new StatelessWidget();
  const widget2 = new StatelessWidget();

  runtime.runApp(widget1, document.createElement('div'));
  runtime.hotReload(widget2);

  this.assertEqual(runtime.rootWidget, widget1); // Should not change

  runtime.dispose();
});

suite3.test('should skip hot reload if not mounted', function() {
  const runtime = new FlutterJSRuntime({ enableHotReload: true });
  const widget = new StatelessWidget();

  runtime.hotReload(widget); // Should be no-op

  this.assertFalse(runtime.isMounted());
});

// Test Suite 4: Service Registry
const suite4 = new TestSuite('FlutterJS Service Registry');
suites.push(suite4);

suite4.test('should access registered services', function() {
  const runtime = new FlutterJSRuntime();
  runtime.initialize();

  const theme = runtime.serviceRegistry.get('theme');
  this.assertNotNull(theme);

  runtime.dispose();
});

suite4.test('should lazy-load services', function() {
  const runtime = new FlutterJSRuntime();
  runtime.initialize();

  const theme1 = runtime.serviceRegistry.get('theme');
  const theme2 = runtime.serviceRegistry.get('theme');

  this.assertEqual(theme1, theme2); // Should be same instance

  runtime.dispose();
});

suite4.test('should register routing service when enabled', function() {
  const runtime = new FlutterJSRuntime({ routing: true });
  runtime.initialize();

  this.assertTrue(runtime.serviceRegistry.has('navigator'));

  runtime.dispose();
});

suite4.test('should not register routing service when disabled', function() {
  const runtime = new FlutterJSRuntime({ routing: false });
  runtime.initialize();

  this.assertFalse(runtime.serviceRegistry.has('navigator'));

  runtime.dispose();
});

// Test Suite 5: Unmounting & Cleanup
const suite5 = new TestSuite('FlutterJS Unmounting & Cleanup');
suites.push(suite5);

suite5.test('should unmount application', function() {
  const runtime = new FlutterJSRuntime();
  runtime.runApp(new StatelessWidget(), document.createElement('div'));

  runtime.unmount();

  this.assertFalse(runtime.isMounted());
  this.assertFalse(runtime.engine.mounted);
});

suite5.test('should call unmount lifecycle hooks', function() {
  const runtime = new FlutterJSRuntime();
  let beforeUnmountCalled = false;
  let afterUnmountCalled = false;

  runtime.on('beforeUnmount', () => { beforeUnmountCalled = true; });
  runtime.on('afterUnmount', () => { afterUnmountCalled = true; });

  runtime.runApp(new StatelessWidget(), document.createElement('div'));
  runtime.unmount();

  this.assertTrue(beforeUnmountCalled);
  this.assertTrue(afterUnmountCalled);
});

suite5.test('should dispose all subsystems on unmount', function() {
  const runtime = new FlutterJSRuntime();
  runtime.runApp(new StatelessWidget(), document.createElement('div'));

  runtime.unmount();

  this.assertFalse(runtime.engine.mounted);

  runtime.dispose();
});

suite5.test('should dispose runtime completely', function() {
  const runtime = new FlutterJSRuntime();
  runtime.runApp(new StatelessWidget(), document.createElement('div'));

  runtime.dispose();

  this.assertFalse(runtime.isInitialized());
  this.assertFalse(runtime.isMounted());
});

// Test Suite 6: Lifecycle Hooks
const suite6 = new TestSuite('FlutterJS Lifecycle Hooks');
suites.push(suite6);

suite6.test('should register lifecycle hooks', function() {
  const runtime = new FlutterJSRuntime();
  let called = false;

  runtime.on('afterInit', () => { called = true; });
  runtime.initialize();

  this.assertTrue(called);

  runtime.dispose();
});

suite6.test('should call multiple hooks in order', function() {
  const runtime = new FlutterJSRuntime();
  const order = [];

  runtime.on('beforeInit', () => { order.push('before1'); });
  runtime.on('beforeInit', () => { order.push('before2'); });
  runtime.on('afterInit', () => { order.push('after1'); });
  runtime.on('afterInit', () => { order.push('after2'); });

  runtime.initialize();

  this.assertEqual(order[0], 'before1');
  this.assertEqual(order[1], 'before2');
  this.assertEqual(order[2], 'after1');
  this.assertEqual(order[3], 'after2');

  runtime.dispose();
});

suite6.test('should handle hook errors gracefully', function() {
  const runtime = new FlutterJSRuntime();
  let secondHookCalled = false;

  runtime.on('afterInit', () => {
    throw new Error('Hook error');
  });
  runtime.on('afterInit', () => {
    secondHookCalled = true;
  });

  runtime.initialize();

  this.assertTrue(secondHookCalled); // Should still call other hooks

  runtime.dispose();
});

// Test Suite 7: Statistics & Monitoring
const suite7 = new TestSuite('FlutterJS Statistics & Monitoring');
suites.push(suite7);

suite7.test('should provide runtime statistics', function() {
  const runtime = new FlutterJSRuntime();
  runtime.runApp(new StatelessWidget(), document.createElement('div'));

  const stats = runtime.getStats();

  this.assertNotNull(stats);
  this.assertTrue(stats.initTime > 0);
  this.assertTrue(stats.mountTime > 0);
  this.assertEqual(stats.initialized, true);
  this.assertEqual(stats.mounted, true);

  runtime.dispose();
});

suite7.test('should provide subsystem statistics', function() {
  const runtime = new FlutterJSRuntime();
  runtime.runApp(new StatelessWidget(), document.createElement('div'));

  const stats = runtime.getStats();

  this.assertNotNull(stats.engine);
  this.assertNotNull(stats.memory);
  this.assertNotNull(stats.services);

  runtime.dispose();
});

// Test Suite 8: Error Handling
const suite8 = new TestSuite('FlutterJS Error Handling');
suites.push(suite8);

suite8.test('should register error handlers', function() {
  const runtime = new FlutterJSRuntime();
  let errorCaught = false;

  runtime.onError(() => {
    errorCaught = true;
  });

  this.assertTrue(runtime.errorHandlers.length > 0);

  runtime.dispose();
});

suite8.test('should support method chaining', function() {
  const runtime = new FlutterJSRuntime();

  const result = runtime
    .initialize()
    .on('afterInit', () => { })
    .onError(() => { });

  this.assertEqual(result, runtime);

  runtime.dispose();
});

// Test Suite 9: Public API
const suite9 = new TestSuite('FlutterJS Public API');
suites.push(suite9);

suite9.test('should expose runApp function', function() {
  this.assertNotNull(runApp);
  this.assertEqual(typeof runApp, 'function');
});

suite9.test('should expose getRuntime function', function() {
  this.assertNotNull(getRuntime);
  this.assertEqual(typeof getRuntime, 'function');
});

suite9.test('should expose hotReload function', function() {
  this.assertNotNull(hotReload);
  this.assertEqual(typeof hotReload, 'function');
});

suite9.test('should expose dispose function', function() {
  this.assertNotNull(dispose);
  this.assertEqual(typeof dispose, 'function');
});

suite9.test('should create runtime with runApp', function() {
  const widget = new StatelessWidget();
  const container = document.createElement('div');

  const runtime = runApp(widget, container);

  this.assertNotNull(runtime);
  this.assertTrue(runtime.isMounted());
  this.assertEqual(getRuntime(), runtime);

  dispose();
});

// ============================================================================
// TEST RESULTS
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('FLUTTERJS RUNTIME TEST SUITE');
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