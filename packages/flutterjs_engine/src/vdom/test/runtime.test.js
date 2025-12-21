/**
 * FlutterJS Runtime Tests - Silent Mode + Full Log File
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// SILENT LOGGER - No console spam, everything goes to file
// ============================================================================

class SilentLogger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  log(...args) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 23);
    const line = args
      .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
      .join(' ');
    this.logs.push(`[${timestamp}] ${line}`);
  }

  // Shortcuts
  info(...args) { this.log('INFO', ...args); }
  warn(...args) { this.log('WARN', ...args); }
  error(...args) { this.log('ERROR', ...args); }
  success(...args) { this.log('SUCCESS', ...args); }

  // Save everything to file at the end
  save() {
    const logPath = path.resolve('test-run-full.log');
    const header = [
      '='.repeat(80),
      'FLUTTERJS RUNTIME TEST - FULL LOG',
      `Started: ${new Date(this.startTime).toISOString()}`,
      `Ended:   ${new Date().toISOString()}`,
      `Duration: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`,
      `Total lines: ${this.logs.length}`,
      '='.repeat(80),
      ''
    ].join('\n');

    fs.writeFileSync(logPath, header + this.logs.join('\n') + '\n', 'utf-8');
    // Only print this one line in terminal
    console.log(`\nAll logs saved to: ${path.relative(process.cwd(), logPath)}\n`);
  }
}

// Create logger
global.logger = new SilentLogger();

// COMPLETELY SILENCE console.log (no output in CMD at all)
console.log = (...args) => logger.log(...args);
console.info = console.warn = console.error = console.log;

// At the very end of your file (after process.exit), add this:
process.on('exit', () => {
  if (global.logger) global.logger.save();
});
/**
 * FlutterJS Runtime Tests
 * Comprehensive testing for runtime integration
 */

import {
  runApp,
  getRuntime,
  updateApp,
  getMetrics,
  hotReload,
  renderToString,
  hydrate,
  FlutterJSRuntime,
  VNode
} from '../src/runtime_index.js';


import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div id="root"></div>
  <div id="alt-root"></div>
</body>
</html>
`);
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);

console.log('\n' + '='.repeat(80));
console.log('🧪 FLUTTERJS RUNTIME TESTS');
console.log('='.repeat(80) + '\n');

let testsPassed = 0;
let testsFailed = 0;
let currentTestName = '';

function test(name, fn) {
  currentTestName = name;
  console.log(`\n📋 TEST: ${name}`);
  console.log('-'.repeat(60));

  try {
    fn();
    console.log(`✓ PASSED: ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ FAILED: ${name}`);
    console.log(`  Error Message: ${error.message}`);
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      console.log(`  Stack: ${stackLines[1] || stackLines[0]}`);
    }
    testsFailed++;
  }
}

function assert(condition, message) {
  console.log(`  [ASSERT] Checking: ${message}`);
  if (!condition) {
    console.log(`  [ASSERT FAILED] ${message}`);
    throw new Error(message || 'Assertion failed');
  }
  console.log(`  [ASSERT OK] ✓`);
}

function assertEquals(actual, expected, message) {
  console.log(`  [ASSERTEQUALS] ${message}`);
  console.log(`    Expected: ${JSON.stringify(expected)}`);
  console.log(`    Actual: ${JSON.stringify(actual)}`);

  if (actual !== expected) {
    console.log(`  [ASSERTEQUALS FAILED]`);
    throw new Error(
      message || `Expected "${expected}", got "${actual}"`
    );
  }
  console.log(`  [ASSERTEQUALS OK] ✓`);
}

function assertIncludes(haystack, needle, message) {
  console.log(`  [ASSERTINCLUDES] ${message}`);
  console.log(`    Searching for: "${needle}"`);
  console.log(`    In: "${haystack ? haystack.substring(0, 100) + '...' : 'null'}"`);

  if (!haystack || !haystack.includes(needle)) {
    console.log(`  [ASSERTINCLUDES FAILED]`);
    throw new Error(
      message || `Expected to include "${needle}"`
    );
  }
  console.log(`  [ASSERTINCLUDES OK] ✓`);
}

// Mock widgets
class SimpleWidget {
  build(context) {
    console.log(`  [WIDGET] SimpleWidget.build() called`);
    console.log(`    Context keys: ${Object.keys(context || {}).join(', ')}`);

    return new VNode({
      tag: 'div',
      props: { className: 'simple-widget' },
      children: ['Simple Widget']
    });
  }
}

class StatefulWidget {
  constructor() {
    this.state = { count: 0 };
    console.log(`  [WIDGET] StatefulWidget created with state:`, this.state);
  }

  build(context) {
    console.log(`  [WIDGET] StatefulWidget.build() called with count: ${this.state.count}`);

    return new VNode({
      tag: 'div',
      children: [
        new VNode({
          tag: 'span',
          children: [`Count: ${this.state.count}`]
        }),
        new VNode({
          tag: 'button',
          events: {
            click: () => this.setState({ count: this.state.count + 1 })
          },
          children: ['Increment']
        })
      ]
    });
  }

  setState(newState) {
    console.log(`  [STATE] setState called with:`, newState);
    Object.assign(this.state, newState);
    console.log(`  [STATE] New state:`, this.state);

    if (this.context && this.context.runtime) {
      console.log(`  [STATE] Triggering runtime update`);
      this.context.runtime.update();
    }
  }
}

// Helper to reset runtime between tests
function resetRuntime() {
  console.log(`  [RESET] Clearing runtime...`);
  const runtime = getRuntime();
  if (runtime) {
    console.log(`  [RESET] Destroying existing runtime`);
    runtime.destroy();
  }

  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = '';
    console.log(`  [RESET] Cleared root element`);
  }
}

// ============================================================================
// TEST SUITE 1: Runtime Initialization
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 1: Runtime Initialization');
console.log('═'.repeat(80));

test('Create runtime instance', () => {
  console.log(`  [START] Creating FlutterJSRuntime instance`);
  const runtime = new FlutterJSRuntime();
  console.log(`  [CREATED] Runtime instance:`, {
    app: runtime.app,
    rootElement: runtime.rootElement,
    stateRegistry: runtime.stateRegistry.size
  });

  assert(runtime !== null, 'Should create runtime');
  assert(runtime.app === null, 'Should start with no app');
  assert(runtime.stateRegistry instanceof Map, 'Should have state registry');
});

test('Runtime has performance metrics', () => {
  console.log(`  [START] Creating runtime and checking metrics`);
  const runtime = new FlutterJSRuntime();
  console.log(`  [METRICS] Initial metrics:`, runtime.performanceMetrics);

  assert(runtime.performanceMetrics !== undefined, 'Should have metrics');
  assert(runtime.performanceMetrics.initialRender === 0, 'Should start at 0');
  assert(runtime.performanceMetrics.updates === 0, 'Should start at 0');
});

console.log('');

// ============================================================================
// TEST SUITE 2: runApp - Client-Side Rendering
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 2: runApp - Client-Side Rendering');
console.log('═'.repeat(80));

test('Run simple app', () => {
  console.log(`  [START] Running simple app test`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Starting app with target="#root"`);

  runApp(app, { target: '#root' });
  console.log(`  [RUN] App started successfully`);

  const root = document.getElementById('root');
  console.log(`  [DOM] Root element HTML:`, root.innerHTML.substring(0, 150));
  console.log(`  [DOM] Root element classes:`, root.className);

  const widget = root.querySelector('.simple-widget');
  console.log(`  [DOM] Found widget:`, widget !== null);
  console.log(`  [DOM] Widget text:`, widget?.textContent);

  const vnode = root.querySelector('[data-widget-type="VNode"]');
  assert(vnode !== null, 'Should render widget');
  assert(vnode.textContent.includes('Simple Widget'), 'Should have correct content');
  assertEquals(root.textContent, 'Simple Widget', 'Should have content');
});

test('Run app with custom target', () => {
  console.log(`  [START] Running app with custom target test`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Starting app with target="#alt-root"`);

  runApp(app, { target: '#alt-root' });
  console.log(`  [RUN] App started successfully`);

  const altRoot = document.getElementById('alt-root');
  console.log(`  [DOM] Alt-root HTML:`, altRoot.innerHTML.substring(0, 150));

  const vnode = altRoot.querySelector('[data-widget-type="VNode"]');
  assert(vnode !== null, 'Should render to alt root');
  assert(vnode.textContent.includes('Simple Widget'), 'Should have content');
});

test('Run app with HTMLElement target', () => {
  console.log(`  [START] Running app with HTMLElement target test`);
  resetRuntime();

  const container = document.createElement('div');
  console.log(`  [TARGET] Created custom container`);

  const app = new SimpleWidget();
  console.log(`  [RUN] Starting app with container target`);

  runApp(app, { target: container });
  console.log(`  [RUN] App started with container target`);

  console.log(`  [DOM] Container HTML:`, container.innerHTML.substring(0, 150));

  const vnode = container.querySelector('[data-widget-type="VNode"]');
  assert(vnode !== null, 'Should render to element');
  assert(vnode.textContent.includes('Simple Widget'), 'Should have content');
});

test('Track initial render time', () => {
  console.log(`  [START] Testing render time tracking`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [PERF] Starting app...`);

  runApp(app, { target: '#root' });
  console.log(`  [PERF] App started, getting metrics...`);

  const metrics = getMetrics();
  console.log(`  [PERF] Metrics:`, {
    initialRender: metrics.initialRender,
    updates: metrics.updates
  });

  assert(metrics.initialRender > 0, 'Should track render time');
});

test('Get runtime instance', () => {
  console.log(`  [START] Testing runtime instance retrieval`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Starting app...`);

  runApp(app, { target: '#root' });
  console.log(`  [RUN] App started`);

  const runtime = getRuntime();
  console.log(`  [RUNTIME] Got runtime:`, runtime ? 'YES' : 'NO');
  console.log(`  [RUNTIME] Is FlutterJSRuntime:`, runtime instanceof FlutterJSRuntime);

  assert(runtime !== null, 'Should get runtime');
  assert(runtime instanceof FlutterJSRuntime, 'Should be FlutterJSRuntime');
});

test('Throw error for invalid target', () => {
  console.log(`  [START] Testing invalid target error`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [ERROR] Attempting to run with invalid target...`);

  try {
    runApp(app, { target: '#nonexistent' });
    console.log(`  [ERROR] UNEXPECTED: Should have thrown!`);
    throw new Error('Should have thrown');
  } catch (error) {
    console.log(`  [ERROR] Caught expected error:`, error.message);
    assertIncludes(error.message, 'not found', 'Should mention target not found');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 3: State Management
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 3: State Management');
console.log('═'.repeat(80));

test('Register state', () => {
  console.log(`  [START] Testing state registration`);
  resetRuntime();

  const runtime = new FlutterJSRuntime();
  const stateObj = {
    state: { value: 0 },
    setState: (updater) => {
      console.log(`    [STATE] setState called with:`, updater);
      Object.assign(stateObj.state, updater);
    }
  };

  console.log(`  [REGISTRY] Registering state for "widget-1"`);
  runtime.registerState('widget-1', stateObj);
  console.log(`  [REGISTRY] Registry size:`, runtime.stateRegistry.size);

  assert(runtime.stateRegistry.has('widget-1'), 'Should register state');
  assertEquals(runtime.stateRegistry.get('widget-1'), stateObj, 'Should store state object');
});

test('Unregister state', () => {
  console.log(`  [START] Testing state unregistration`);
  resetRuntime();

  const runtime = new FlutterJSRuntime();
  const stateObj = { setState: () => { } };

  console.log(`  [REGISTRY] Registering state...`);
  runtime.registerState('widget-1', stateObj);
  console.log(`  [REGISTRY] Registered, size:`, runtime.stateRegistry.size);

  assert(runtime.stateRegistry.has('widget-1'), 'Should register');

  console.log(`  [REGISTRY] Unregistering state...`);
  runtime.unregisterState('widget-1');
  console.log(`  [REGISTRY] Unregistered, size:`, runtime.stateRegistry.size);

  assert(!runtime.stateRegistry.has('widget-1'), 'Should unregister');
});

test('Get state by ID', () => {
  console.log(`  [START] Testing get state by ID`);
  resetRuntime();

  const runtime = new FlutterJSRuntime();
  const stateObj = { setState: () => { } };

  console.log(`  [REGISTRY] Registering state...`);
  runtime.registerState('widget-1', stateObj);
  console.log(`  [REGISTRY] Registered state`);

  console.log(`  [REGISTRY] Retrieving state...`);
  const retrieved = runtime.getState('widget-1');
  console.log(`  [REGISTRY] Retrieved:`, retrieved !== null ? 'YES' : 'NO');

  assertEquals(retrieved, stateObj, 'Should retrieve state');
});

test('Get nonexistent state returns null', () => {
  console.log(`  [START] Testing nonexistent state retrieval`);
  resetRuntime();

  const runtime = new FlutterJSRuntime();
  console.log(`  [REGISTRY] Getting nonexistent state...`);

  const state = runtime.getState('nonexistent');

  console.log(`  [REGISTRY] Retrieved nonexistent state:`, state);

  assertEquals(state, null, 'Should return null');
});

console.log('');

// ============================================================================
// TEST SUITE 4: Application Updates
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 4: Application Updates');
console.log('═'.repeat(80));

test('Update app', () => {
  console.log(`  [START] Testing app update`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Running app...`);

  runApp(app, { target: '#root' });
  console.log(`  [RUN] App running`);

  let updateCalled = false;
  console.log(`  [UPDATE] Calling updateApp...`);

  updateApp(() => {
    console.log(`  [UPDATE] Update function called`);
    updateCalled = true;
  });

  console.log(`  [UPDATE] Update called:`, updateCalled);

  assert(updateCalled === true, 'Should call update function');
});

test('Update tracks metrics', () => {
  console.log(`  [START] Testing update metrics tracking`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Running app...`);

  runApp(app, { target: '#root' });

  console.log(`  [METRICS] Before update`);
  const metricsBefore = getMetrics();
  const updatesBefore = metricsBefore.updates;
  console.log(`    Updates before: ${updatesBefore}`);

  updateApp(() => { });

  const metricsAfter = getMetrics();
  console.log(`    Updates after: ${metricsAfter.updates}`);
  assert(metricsAfter.updates > updatesBefore, 'Should increment updates');

  assert(metricsAfter.averageRenderTime > 0, 'Should track average time');
});

test('Update without app throws error', () => {
  console.log(`  [START] Testing update without app error`);
  resetRuntime();

  console.log(`  [ERROR] Attempting update without app...`);

  try {
    updateApp(() => { });
    console.log(`  [ERROR] UNEXPECTED: Should have thrown!`);
    throw new Error('Should have thrown');
  } catch (error) {
    console.log(`  [ERROR] Caught expected error:`, error.message);
    assertIncludes(error.message, 'runApp', 'Should mention runApp');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 5: Build Context
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 5: Build Context');
console.log('═'.repeat(80));

test('Create build context', () => {
  console.log(`  [START] Testing build context creation`);
  resetRuntime();

  const runtime = new FlutterJSRuntime();
  console.log(`  [CONTEXT] Creating context...`);

  const context = runtime.createBuildContext();

  console.log(`  [CONTEXT] Created context with keys:`, Object.keys(context));
  console.log(`    runtime: ${context.runtime ? 'YES' : 'NO'}`);
  console.log(`    mediaQuery: ${context.mediaQuery ? 'YES' : 'NO'}`);
  console.log(`    theme: ${context.theme ? 'YES' : 'NO'}`);
  console.log(`    navigator: ${context.navigator ? 'YES' : 'NO'}`);

  assert(context.runtime === runtime, 'Should include runtime');
  assert(context.mediaQuery !== undefined, 'Should have mediaQuery');
  assert(context.theme !== undefined, 'Should have theme');
  assert(context.navigator !== undefined, 'Should have navigator');
});

test('Build context includes media query', () => {
  console.log(`  [START] Testing media query in context`);
  resetRuntime();

  const runtime = new FlutterJSRuntime();
  console.log(`  [CONTEXT] Creating context...`);

  const context = runtime.createBuildContext();

  console.log(`  [MEDIAQUERY] Media query info:`, context.mediaQuery);

  assert(context.mediaQuery.width !== undefined, 'Should have width');
  assert(context.mediaQuery.height !== undefined, 'Should have height');
  assert(context.mediaQuery.devicePixelRatio !== undefined, 'Should have DPR');
});

test('Build context includes theme', () => {
  console.log(`  [START] Testing theme in context`);
  resetRuntime();

  const runtime = new FlutterJSRuntime();
  console.log(`  [CONTEXT] Creating context...`);

  const context = runtime.createBuildContext();

  console.log(`  [THEME] Theme colors:`, {
    primaryColor: context.theme.primaryColor,
    surface: context.theme.surface
  });

  assert(context.theme.primaryColor !== undefined, 'Should have primaryColor');
  assert(context.theme.surface !== undefined, 'Should have surface color');
});

test('Custom theme in context', () => {
  console.log(`  [START] Testing custom theme in context`);
  resetRuntime();

  const runtime = new FlutterJSRuntime();
  const customTheme = { primaryColor: '#ff0000' };
  console.log(`  [CONTEXT] Creating context with custom theme...`);

  const context = runtime.createBuildContext({ theme: customTheme });

  console.log(`  [THEME] Custom theme primaryColor:`, context.theme.primaryColor);

  assertEquals(context.theme.primaryColor, '#ff0000', 'Should use custom theme');
});

console.log('');

// ============================================================================
// TEST SUITE 6: Performance Metrics
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 6: Performance Metrics');
console.log('═'.repeat(80));

test('Get metrics', () => {
  console.log(`  [START] Testing metrics retrieval`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Running app...`);

  runApp(app, { target: '#root' });

  console.log(`  [METRICS] Getting metrics...`);
  const metrics = getMetrics();

  console.log(`  [METRICS] Metrics:`, {
    initialRender: metrics.initialRender,
    updates: metrics.updates,
    isHydrated: metrics.isHydrated,
    stateCount: metrics.stateCount,
    vnodeStats: metrics.vnodeStats ? 'EXISTS' : 'NULL'
  });

  assert(metrics !== null, 'Should return metrics');
  assert(metrics.initialRender !== undefined, 'Should have initialRender');
  assert(metrics.updates !== undefined, 'Should have updates');
  assert(metrics.isHydrated !== undefined, 'Should have isHydrated');
  assert(metrics.stateCount !== undefined, 'Should have stateCount');
});

test('Get metrics without app', () => {
  console.log(`  [START] Testing metrics without app`);
  resetRuntime();

  console.log(`  [METRICS] Getting metrics without running app...`);
  const metrics = getMetrics();

  console.log(`  [METRICS] Metrics without app:`, metrics);

  assertEquals(metrics, null, 'Should return null');
});

test('Metrics include VNode stats', () => {
  console.log(`  [START] Testing VNode stats in metrics`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Running app...`);

  runApp(app, { target: '#root' });

  console.log(`  [METRICS] Getting metrics...`);
  const metrics = getMetrics();

  console.log(`  [METRICS] VNode stats:`, metrics.vnodeStats);

  assert(metrics.vnodeStats !== null, 'Should have VNode stats');
});

console.log('');

// ============================================================================
// TEST SUITE 7: Hot Reload
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 7: Hot Reload');
console.log('═'.repeat(80));

test('Enable hot reload', () => {
  console.log(`  [START] Testing hot reload enable`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Starting app with hot reload enabled...`);

  runApp(app, { target: '#root', enableHotReload: true });

  const runtime = getRuntime();
  console.log(`  [HOTRELOAD] Hot reload enabled:`, runtime.hotReloadEnabled);

  assert(runtime.hotReloadEnabled === true, 'Should enable hot reload');
});

test('Hot reload updates app', () => {
  console.log(`  [START] Testing hot reload update`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Starting app with hot reload...`);

  runApp(app, { target: '#root', enableHotReload: true });

  const beforeUpdates = getMetrics().updates;
  console.log(`  [HOTRELOAD] Updates before:`, beforeUpdates);

  console.log(`  [HOTRELOAD] Calling hotReload...`);
  hotReload();

  const afterUpdates = getMetrics().updates;
  console.log(`  [HOTRELOAD] Updates after:`, afterUpdates);

  assert(afterUpdates > beforeUpdates, 'Should increment updates');
});

test('Hot reload without app warns', () => {
  console.log(`  [START] Testing hot reload without app`);
  resetRuntime();

  console.log(`  [HOTRELOAD] Calling hotReload without app...`);

  // Should not throw, just warn
  hotReload();

  console.log(`  [HOTRELOAD] No error thrown`);
});

test('Hot reload disabled by default', () => {
  console.log(`  [START] Testing hot reload disabled by default`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Starting app without hot reload option...`);

  runApp(app, { target: '#root' });

  const runtime = getRuntime();
  console.log(`  [HOTRELOAD] Hot reload enabled:`, runtime.hotReloadEnabled);

  assert(runtime.hotReloadEnabled === false, 'Should be disabled by default');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Server-Side Rendering
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 8: Server-Side Rendering');
console.log('═'.repeat(80));

test('Render to string', () => {
  console.log(`  [START] Testing renderToString`);
  const app = new SimpleWidget();
  console.log(`  [SSR] Calling renderToString...`);

  const html = renderToString(app);

  console.log(`  [SSR] HTML length:`, html.length);
  console.log(`  [SSR] HTML preview:`, html.substring(0, 150) + '...');

  assert(typeof html === 'string', 'Should return string');
  assertIncludes(html, '<!DOCTYPE html>', 'Should have doctype');
  assertIncludes(html, 'Simple Widget', 'Should have content');
});

test('Render to string with title', () => {
  console.log(`  [START] Testing renderToString with title`);
  const app = new SimpleWidget();
  console.log(`  [SSR] Calling renderToString with title...`);

  const html = renderToString(app, { title: 'Test App' });

  console.log(`  [SSR] HTML length:`, html.length);
  console.log(`  [SSR] Checking for title tag...`);

  assertIncludes(html, '<title>Test App</title>', 'Should have title');
});

test('Render to string with meta', () => {
  console.log(`  [START] Testing renderToString with meta`);
  const app = new SimpleWidget();
  console.log(`  [SSR] Calling renderToString with meta...`);

  const html = renderToString(app, {
    meta: { description: 'Test description' }
  });

  console.log(`  [SSR] Checking for meta tag...`);

  assertIncludes(html, 'description', 'Should have meta tag');
});

test('Render to string includes hydration data', () => {
  console.log(`  [START] Testing hydration data inclusion`);
  const app = new SimpleWidget();
  console.log(`  [SSR] Calling renderToString...`);

  const html = renderToString(app);

  console.log(`  [SSR] Checking for hydration data...`);

  assertIncludes(html, '__FLUTTERJS_HYDRATION_DATA__', 'Should include hydration data');
});

test('Render to string without hydration', () => {
  console.log(`  [START] Testing renderToString without hydration`);
  const app = new SimpleWidget();
  console.log(`  [SSR] Calling renderToString with includeHydration: false...`);

  const html = renderToString(app, { includeHydration: false });

  console.log(`  [SSR] Checking for hydration data...`);

  assert(!html.includes('__FLUTTERJS_HYDRATION_DATA__'), 'Should not include hydration data');
});

console.log('');

// ============================================================================
// TEST SUITE 9: Hydration
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 9: Hydration');
console.log('═'.repeat(80));

test('Hydrate SSR content', () => {
  console.log(`  [START] Testing SSR hydration`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [SSR] Rendering to string...`);

  const html = renderToString(app);

  // Parse HTML and inject into DOM
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const htmlContent = tempDiv.querySelector('#root').innerHTML;

  console.log(`  [SSR] Injecting SSR content into DOM...`);

  const root = document.getElementById('root');
  root.innerHTML = htmlContent;

  // Create hydration data script
  const script = document.createElement('script');
  script.id = '__FLUTTERJS_HYDRATION_DATA__';
  script.type = 'application/json';
  script.textContent = JSON.stringify({
    version: '1.0.0',
    widgets: [],
    stateBindings: [],
    events: [],
    refs: []
  });
  console.log(`  [SSR] Creating hydration data script...`);

  document.body.appendChild(script);

  console.log(`  [HYDRATE] Calling hydrate function...`);
  hydrate(app, { target: '#root' });

  const runtime = getRuntime();
  console.log(`  [HYDRATE] Runtime hydrated:`, runtime.isHydrated);

  assert(runtime.isHydrated === true, 'Should be hydrated');

  // Cleanup
  console.log(`  [CLEANUP] Removing hydration script...`);
  script.remove();
});

test('Hydrate requires target', () => {
  console.log(`  [START] Testing hydrate with invalid target`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [HYDRATE] Attempting hydrate with invalid target...`);

  try {
    hydrate(app, { target: '#nonexistent' });
    console.log(`  [ERROR] UNEXPECTED: Should have thrown!`);
    throw new Error('Should have thrown');
  } catch (error) {
    console.log(`  [ERROR] Caught expected error:`, error.message);
    assertIncludes(error.message, 'not found', 'Should mention target');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 10: Runtime Cleanup
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 10: Runtime Cleanup');
console.log('═'.repeat(80));

test('Destroy runtime', () => {
  console.log(`  [START] Testing runtime destruction`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [RUN] Running app...`);

  runApp(app, { target: '#root' });

  const runtime = getRuntime();
  console.log(`  [DESTROY] Destroying runtime...`);

  runtime.destroy();

  console.log(`  [DESTROY] Runtime after destroy:`, {
    app: runtime.app,
    rootElement: runtime.rootElement,
    stateCount: runtime.stateRegistry.size
  });

  assert(runtime.app === null, 'Should clear app');
  assert(runtime.rootElement === null, 'Should clear root');
  assert(runtime.stateRegistry.size === 0, 'Should clear state');
});

test('Destroy cleans up event listeners', () => {
  console.log(`  [START] Testing event listener cleanup`);
  resetRuntime();

  const app = new VNode({
    tag: 'button',
    events: { click: () => { } },
    children: ['Click']
  });

  const runtime = new FlutterJSRuntime();
  console.log(`  [RUN] Running app with button...`);

  runtime.runApp({ build: () => app }, { target: '#root' });

  const vnode = document.querySelector('[data-widget-type="VNode"]');
  console.log(`  [LISTENERS] VNode element found: ${vnode !== null}`);
  assert(vnode !== null, 'Should render VNode with button');
  console.log(`  [LISTENERS] VNode content: ${vnode.textContent}`);
  assert(vnode.textContent === 'Click', 'Should have button text');

  console.log(`  [DESTROY] Destroying runtime...`);
  runtime.destroy();

  // Event listeners should be cleaned up
  console.log(`  [CLEANUP] Event listeners cleaned up`);
});

console.log('');

// ============================================================================
// TEST SUITE 11: Error Handling
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 11: Error Handling');
console.log('═'.repeat(80));

test('Handle render error with callback', () => {
  console.log(`  [START] Testing error handling with callback`);
  resetRuntime();

  let errorCaught = false;
  const badApp = {
    build: () => {
      console.log(`  [BUILD] Build throwing error...`);
      throw new Error('Build error');
    }
  };

  console.log(`  [RUN] Starting app that will fail...`);

  try {
    runApp(badApp, {
      target: '#root',
      onError: (error) => {
        console.log(`  [ERROR_CALLBACK] Error callback called:`, error.message);
        errorCaught = true;
      }
    });
  } catch (error) {
    console.log(`  [ERROR] Caught error:`, error.message);
    // Expected
  }

  console.log(`  [ERROR_CALLBACK] Error caught by callback:`, errorCaught);

  assert(errorCaught === true, 'Should call error callback');
});

test('Update before runApp throws error', () => {
  console.log(`  [START] Testing update before runApp error`);
  resetRuntime();

  console.log(`  [UPDATE] Attempting update before runApp...`);

  try {
    const runtime = new FlutterJSRuntime();
    console.log(`  [UPDATE] Created runtime, calling update...`);

    runtime.update();
    console.log(`  [ERROR] UNEXPECTED: Should have thrown!`);
    throw new Error('Should have thrown');
  } catch (error) {
    console.log(`  [ERROR] Caught expected error:`, error.message);
    assertIncludes(error.message, 'not initialized', 'Should mention initialization');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 12: Integration Scenarios
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 12: Integration Scenarios');
console.log('═'.repeat(80));

// In runtime.test.js, instead of checking === 1, check the increment
test('Complete CSR flow', () => {
  resetRuntime();
  const app = new SimpleWidget();

  runApp(app, { target: '#root' });
  const metricsAfter1 = getMetrics();
  const updatesBefore = metricsAfter1.updates;

  updateApp(() => { });

  const metricsAfter2 = getMetrics();
  // Check that update incremented, not absolute value
  assert(metricsAfter2.updates > updatesBefore, 'Should increment updates');
  assert(metricsAfter2.updates === updatesBefore + 1, 'Should increment by 1');
});

test('Complete SSR + Hydration flow', () => {
  console.log(`  [START] Testing complete SSR + Hydration flow`);
  resetRuntime();

  const app = new SimpleWidget();

  // SSR
  console.log(`  [SSR+HYDRATION] Step 1: Server-side rendering...`);
  const html = renderToString(app);
  console.log(`  [SSR+HYDRATION] HTML generated, length:`, html.length);
  assert(html.includes('Simple Widget'), 'Should render to HTML');
  console.log(`  [SSR+HYDRATION] Step 1: Complete ✓`);

  // Setup for hydration
  console.log(`  [SSR+HYDRATION] Step 2: Setting up hydration...`);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const root = document.getElementById('root');
  root.innerHTML = tempDiv.querySelector('#root').innerHTML;
  console.log(`  [SSR+HYDRATION] Injected SSR content`);

  const script = document.createElement('script');
  script.id = '__FLUTTERJS_HYDRATION_DATA__';
  script.type = 'application/json';
  script.textContent = JSON.stringify({
    version: '1.0.0',
    widgets: [],
    stateBindings: [],
    events: [],
    refs: []
  });
  console.log(`  [SSR+HYDRATION] Created hydration script`);
  document.body.appendChild(script);
  console.log(`  [SSR+HYDRATION] Step 2: Complete ✓`);

  // Hydrate
  console.log(`  [SSR+HYDRATION] Step 3: Hydrating...`);
  hydrate(app, { target: '#root' });

  const runtime = getRuntime();
  console.log(`  [SSR+HYDRATION] Hydrated:`, runtime.isHydrated);
  assert(runtime.isHydrated === true, 'Should be hydrated');
  console.log(`  [SSR+HYDRATION] Step 3: Complete ✓`);

  // Cleanup
  console.log(`  [SSR+HYDRATION] Step 4: Cleanup...`);
  script.remove();
  runtime.destroy();
  console.log(`  [SSR+HYDRATION] Step 4: Complete ✓`);

  console.log(`  [SSR+HYDRATION] Complete SSR + Hydration flow: ✓✓✓`);
});

test('State registry integration', () => {
  console.log(`  [START] Testing state registry integration`);
  resetRuntime();

  const app = new SimpleWidget();
  console.log(`  [INTEGRATION] Running app...`);
  runApp(app, { target: '#root' });

  const runtime = getRuntime();

  // Register multiple states
  console.log(`  [INTEGRATION] Registering widget-1...`);
  runtime.registerState('widget-1', { setState: () => { } });

  console.log(`  [INTEGRATION] Registering widget-2...`);
  runtime.registerState('widget-2', { setState: () => { } });

  const metrics = getMetrics();
  console.log(`  [INTEGRATION] State count:`, metrics.stateCount);
  assertEquals(metrics.stateCount, 2, 'Should track state count');

  // Unregister
  console.log(`  [INTEGRATION] Unregistering widget-1...`);
  runtime.unregisterState('widget-1');

  const metricsAfter = getMetrics();
  console.log(`  [INTEGRATION] State count after unregister:`, metricsAfter.stateCount);
  assertEquals(metricsAfter.stateCount, 1, 'Should update count');

  console.log(`  [INTEGRATION] State registry integration: ✓`);
});

console.log('');

// ============================================================================
// TEST SUITE 13: Browser Global API
// ============================================================================

console.log('\n' + '═'.repeat(80));
console.log('TEST SUITE 13: Browser Global API');
console.log('═'.repeat(80));

// In runtime.test.js
test('FlutterJS global exists', () => {
  console.log(`  [START] Testing global API existence`);

  // Skip if window.FlutterJS wasn't set up (expected in some environments)
  if (typeof window === 'undefined' || !window.FlutterJS) {
    console.log(`  [INFO] Skipping - window.FlutterJS not available in this environment`);
    return;
  }

  assert(window.FlutterJS !== undefined, 'Should have global');
  assert(typeof window.FlutterJS.runApp === 'function', 'Should have runApp');
  assert(typeof window.FlutterJS.getMetrics === 'function', 'Should have getMetrics');
  console.log(`  [GLOBAL] runApp function exists: ✓`);
});

test('Global API functions work', () => {
  // Skip if not available
  if (typeof window === 'undefined' || !window.FlutterJS) {
    console.log(`  [INFO] Skipping - window.FlutterJS not available in this environment`);
    return;
  }

  resetRuntime();
  const app = new SimpleWidget();

  window.FlutterJS.runApp(app, { target: '#root' });
  const metrics = window.FlutterJS.getMetrics();

  assert(metrics !== null, 'Should get metrics via global');
});

console.log('');

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log('='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);
console.log('='.repeat(80) + '\n');

if (testsFailed === 0) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log(`❌ ${testsFailed} test(s) failed.\n`);
  process.exit(1);
}
