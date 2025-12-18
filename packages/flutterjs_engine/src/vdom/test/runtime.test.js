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
} from '../src/vnode/runtime_index.js';


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

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    if (error.stack) {
      console.log(`  ${error.stack.split('\n')[1]}`);
    }
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected "${expected}", got "${actual}"`
    );
  }
}

function assertIncludes(haystack, needle, message) {
  if (!haystack || !haystack.includes(needle)) {
    throw new Error(
      message || `Expected to include "${needle}"`
    );
  }
}

// Mock widgets
class SimpleWidget {
  build(context) {
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
  }

  build(context) {
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
    Object.assign(this.state, newState);
    if (this.context && this.context.runtime) {
      this.context.runtime.update();
    }
  }
}

// Helper to reset runtime between tests
function resetRuntime() {
  const runtime = getRuntime();
  if (runtime) {
    runtime.destroy();
  }
  document.getElementById('root').innerHTML = '';
}

// ============================================================================
// TEST SUITE 1: Runtime Initialization
// ============================================================================

console.log('TEST SUITE 1: Runtime Initialization\n');

test('Create runtime instance', () => {
  const runtime = new FlutterJSRuntime();
  assert(runtime !== null, 'Should create runtime');
  assert(runtime.app === null, 'Should start with no app');
  assert(runtime.stateRegistry instanceof Map, 'Should have state registry');
});

test('Runtime has performance metrics', () => {
  const runtime = new FlutterJSRuntime();
  assert(runtime.performanceMetrics !== undefined, 'Should have metrics');
  assert(runtime.performanceMetrics.initialRender === 0, 'Should start at 0');
  assert(runtime.performanceMetrics.updates === 0, 'Should start at 0');
});

console.log('');

// ============================================================================
// TEST SUITE 2: runApp - Client-Side Rendering
// ============================================================================

console.log('TEST SUITE 2: runApp - Client-Side Rendering\n');

test('Run simple app', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  const root = document.getElementById('root');
  assert(root.querySelector('.simple-widget') !== null, 'Should render widget');
  assertEquals(root.textContent, 'Simple Widget', 'Should have content');
});

test('Run app with custom target', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#alt-root' });
  
  const altRoot = document.getElementById('alt-root');
  assert(altRoot.querySelector('.simple-widget') !== null, 'Should render to alt root');
});

test('Run app with HTMLElement target', () => {
  resetRuntime();
  
  const container = document.createElement('div');
  const app = new SimpleWidget();
  runApp(app, { target: container });
  
  assert(container.querySelector('.simple-widget') !== null, 'Should render to element');
});

test('Track initial render time', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  const metrics = getMetrics();
  assert(metrics.initialRender > 0, 'Should track render time');
});

test('Get runtime instance', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  const runtime = getRuntime();
  assert(runtime !== null, 'Should get runtime');
  assert(runtime instanceof FlutterJSRuntime, 'Should be FlutterJSRuntime');
});

test('Throw error for invalid target', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  
  try {
    runApp(app, { target: '#nonexistent' });
    throw new Error('Should have thrown');
  } catch (error) {
    assertIncludes(error.message, 'not found', 'Should mention target not found');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 3: State Management
// ============================================================================

console.log('TEST SUITE 3: State Management\n');

test('Register state', () => {
  resetRuntime();
  
  const runtime = new FlutterJSRuntime();
  const stateObj = {
    state: { value: 0 },
    setState: (updater) => {
      Object.assign(stateObj.state, updater);
    }
  };
  
  runtime.registerState('widget-1', stateObj);
  
  assert(runtime.stateRegistry.has('widget-1'), 'Should register state');
  assertEquals(runtime.stateRegistry.get('widget-1'), stateObj, 'Should store state object');
});

test('Unregister state', () => {
  resetRuntime();
  
  const runtime = new FlutterJSRuntime();
  const stateObj = { setState: () => {} };
  
  runtime.registerState('widget-1', stateObj);
  assert(runtime.stateRegistry.has('widget-1'), 'Should register');
  
  runtime.unregisterState('widget-1');
  assert(!runtime.stateRegistry.has('widget-1'), 'Should unregister');
});

test('Get state by ID', () => {
  resetRuntime();
  
  const runtime = new FlutterJSRuntime();
  const stateObj = { setState: () => {} };
  
  runtime.registerState('widget-1', stateObj);
  
  const retrieved = runtime.getState('widget-1');
  assertEquals(retrieved, stateObj, 'Should retrieve state');
});

test('Get nonexistent state returns null', () => {
  resetRuntime();
  
  const runtime = new FlutterJSRuntime();
  const state = runtime.getState('nonexistent');
  
  assertEquals(state, null, 'Should return null');
});

console.log('');

// ============================================================================
// TEST SUITE 4: Application Updates
// ============================================================================

console.log('TEST SUITE 4: Application Updates\n');

test('Update app', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  let updateCalled = false;
  updateApp(() => {
    updateCalled = true;
  });
  
  assert(updateCalled === true, 'Should call update function');
});

test('Update tracks metrics', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  updateApp(() => {});
  
  const metrics = getMetrics();
  assertEquals(metrics.updates, 1, 'Should track update count');
  assert(metrics.averageRenderTime > 0, 'Should track average time');
});

test('Update without app throws error', () => {
  resetRuntime();
  
  try {
    updateApp(() => {});
    throw new Error('Should have thrown');
  } catch (error) {
    assertIncludes(error.message, 'runApp', 'Should mention runApp');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 5: Build Context
// ============================================================================

console.log('TEST SUITE 5: Build Context\n');

test('Create build context', () => {
  resetRuntime();
  
  const runtime = new FlutterJSRuntime();
  const context = runtime.createBuildContext();
  
  assert(context.runtime === runtime, 'Should include runtime');
  assert(context.mediaQuery !== undefined, 'Should have mediaQuery');
  assert(context.theme !== undefined, 'Should have theme');
  assert(context.navigator !== undefined, 'Should have navigator');
});

test('Build context includes media query', () => {
  resetRuntime();
  
  const runtime = new FlutterJSRuntime();
  const context = runtime.createBuildContext();
  
  assert(context.mediaQuery.width !== undefined, 'Should have width');
  assert(context.mediaQuery.height !== undefined, 'Should have height');
  assert(context.mediaQuery.devicePixelRatio !== undefined, 'Should have DPR');
});

test('Build context includes theme', () => {
  resetRuntime();
  
  const runtime = new FlutterJSRuntime();
  const context = runtime.createBuildContext();
  
  assert(context.theme.primaryColor !== undefined, 'Should have primaryColor');
  assert(context.theme.surface !== undefined, 'Should have surface color');
});

test('Custom theme in context', () => {
  resetRuntime();
  
  const runtime = new FlutterJSRuntime();
  const customTheme = { primaryColor: '#ff0000' };
  const context = runtime.createBuildContext({ theme: customTheme });
  
  assertEquals(context.theme.primaryColor, '#ff0000', 'Should use custom theme');
});

console.log('');

// ============================================================================
// TEST SUITE 6: Performance Metrics
// ============================================================================

console.log('TEST SUITE 6: Performance Metrics\n');

test('Get metrics', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  const metrics = getMetrics();
  
  assert(metrics !== null, 'Should return metrics');
  assert(metrics.initialRender !== undefined, 'Should have initialRender');
  assert(metrics.updates !== undefined, 'Should have updates');
  assert(metrics.isHydrated !== undefined, 'Should have isHydrated');
  assert(metrics.stateCount !== undefined, 'Should have stateCount');
});

test('Get metrics without app', () => {
  resetRuntime();
  
  const metrics = getMetrics();
  assertEquals(metrics, null, 'Should return null');
});

test('Metrics include VNode stats', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  const metrics = getMetrics();
  assert(metrics.vnodeStats !== null, 'Should have VNode stats');
});

console.log('');

// ============================================================================
// TEST SUITE 7: Hot Reload
// ============================================================================

console.log('TEST SUITE 7: Hot Reload\n');

test('Enable hot reload', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root', enableHotReload: true });
  
  const runtime = getRuntime();
  assert(runtime.hotReloadEnabled === true, 'Should enable hot reload');
});

test('Hot reload updates app', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root', enableHotReload: true });
  
  const beforeUpdates = getMetrics().updates;
  hotReload();
  const afterUpdates = getMetrics().updates;
  
  assert(afterUpdates > beforeUpdates, 'Should increment updates');
});

test('Hot reload without app warns', () => {
  resetRuntime();
  
  // Should not throw, just warn
  hotReload();
});

test('Hot reload disabled by default', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  const runtime = getRuntime();
  assert(runtime.hotReloadEnabled === false, 'Should be disabled by default');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Server-Side Rendering
// ============================================================================

console.log('TEST SUITE 8: Server-Side Rendering\n');

test('Render to string', () => {
  const app = new SimpleWidget();
  const html = renderToString(app);
  
  assert(typeof html === 'string', 'Should return string');
  assertIncludes(html, '<!DOCTYPE html>', 'Should have doctype');
  assertIncludes(html, 'Simple Widget', 'Should have content');
});

test('Render to string with title', () => {
  const app = new SimpleWidget();
  const html = renderToString(app, { title: 'Test App' });
  
  assertIncludes(html, '<title>Test App</title>', 'Should have title');
});

test('Render to string with meta', () => {
  const app = new SimpleWidget();
  const html = renderToString(app, {
    meta: { description: 'Test description' }
  });
  
  assertIncludes(html, 'description', 'Should have meta tag');
});

test('Render to string includes hydration data', () => {
  const app = new SimpleWidget();
  const html = renderToString(app);
  
  assertIncludes(html, '__FLUTTERJS_HYDRATION_DATA__', 'Should include hydration data');
});

test('Render to string without hydration', () => {
  const app = new SimpleWidget();
  const html = renderToString(app, { includeHydration: false });
  
  assert(!html.includes('__FLUTTERJS_HYDRATION_DATA__'), 'Should not include hydration data');
});

console.log('');

// ============================================================================
// TEST SUITE 9: Hydration
// ============================================================================

console.log('TEST SUITE 9: Hydration\n');

test('Hydrate SSR content', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  const html = renderToString(app);
  
  // Parse HTML and inject into DOM
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const htmlContent = tempDiv.querySelector('#root').innerHTML;
  
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
  document.body.appendChild(script);
  
  hydrate(app, { target: '#root' });
  
  const runtime = getRuntime();
  assert(runtime.isHydrated === true, 'Should be hydrated');
  
  // Cleanup
  script.remove();
});

test('Hydrate requires target', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  
  try {
    hydrate(app, { target: '#nonexistent' });
    throw new Error('Should have thrown');
  } catch (error) {
    assertIncludes(error.message, 'not found', 'Should mention target');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 10: Runtime Cleanup
// ============================================================================

console.log('TEST SUITE 10: Runtime Cleanup\n');

test('Destroy runtime', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  const runtime = getRuntime();
  runtime.destroy();
  
  assert(runtime.app === null, 'Should clear app');
  assert(runtime.rootElement === null, 'Should clear root');
  assert(runtime.stateRegistry.size === 0, 'Should clear state');
});

test('Destroy cleans up event listeners', () => {
  resetRuntime();
  
  const app = new VNode({
    tag: 'button',
    events: { click: () => {} },
    children: ['Click']
  });
  
  const runtime = new FlutterJSRuntime();
  runtime.runApp({ build: () => app }, { target: '#root' });
  
  const button = document.querySelector('button');
  assert(button._eventListeners !== undefined, 'Should have listeners');
  
  runtime.destroy();
  
  // Event listeners should be cleaned up
});

console.log('');

// ============================================================================
// TEST SUITE 11: Error Handling
// ============================================================================

console.log('TEST SUITE 11: Error Handling\n');

test('Handle render error with callback', () => {
  resetRuntime();
  
  let errorCaught = false;
  const badApp = {
    build: () => {
      throw new Error('Build error');
    }
  };
  
  try {
    runApp(badApp, {
      target: '#root',
      onError: (error) => {
        errorCaught = true;
      }
    });
  } catch (error) {
    // Expected
  }
  
  assert(errorCaught === true, 'Should call error callback');
});

test('Update before runApp throws error', () => {
  resetRuntime();
  
  try {
    const runtime = new FlutterJSRuntime();
    runtime.update();
    throw new Error('Should have thrown');
  } catch (error) {
    assertIncludes(error.message, 'not initialized', 'Should mention initialization');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 12: Integration Scenarios
// ============================================================================

console.log('TEST SUITE 12: Integration Scenarios\n');

test('Complete CSR flow', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  
  // Run app
  runApp(app, { target: '#root' });
  
  // Verify render
  const root = document.getElementById('root');
  assert(root.querySelector('.simple-widget') !== null, 'Should render');
  
  // Update
  updateApp(() => {});
  
  // Get metrics
  const metrics = getMetrics();
  assert(metrics.updates === 1, 'Should track update');
  
  // Destroy
  const runtime = getRuntime();
  runtime.destroy();
  assert(runtime.app === null, 'Should cleanup');
});

test('Complete SSR + Hydration flow', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  
  // SSR
  const html = renderToString(app);
  assert(html.includes('Simple Widget'), 'Should render to HTML');
  
  // Setup for hydration
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const root = document.getElementById('root');
  root.innerHTML = tempDiv.querySelector('#root').innerHTML;
  
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
  document.body.appendChild(script);
  
  // Hydrate
  hydrate(app, { target: '#root' });
  
  const runtime = getRuntime();
  assert(runtime.isHydrated === true, 'Should be hydrated');
  
  // Cleanup
  script.remove();
  runtime.destroy();
});

test('State registry integration', () => {
  resetRuntime();
  
  const app = new SimpleWidget();
  runApp(app, { target: '#root' });
  
  const runtime = getRuntime();
  
  // Register multiple states
  runtime.registerState('widget-1', { setState: () => {} });
  runtime.registerState('widget-2', { setState: () => {} });
  
  const metrics = getMetrics();
  assertEquals(metrics.stateCount, 2, 'Should track state count');
  
  // Unregister
  runtime.unregisterState('widget-1');
  
  const metricsAfter = getMetrics();
  assertEquals(metricsAfter.stateCount, 1, 'Should update count');
});

console.log('');

// ============================================================================
// TEST SUITE 13: Browser Global API
// ============================================================================

console.log('TEST SUITE 13: Browser Global API\n');

test('FlutterJS global exists', () => {
  assert(window.FlutterJS !== undefined, 'Should have global');
  assert(typeof window.FlutterJS.runApp === 'function', 'Should have runApp');
  assert(typeof window.FlutterJS.getMetrics === 'function', 'Should have getMetrics');
});

test('Global API functions work', () => {
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
  console.log('❌ Some tests failed.\n');
  process.exit(1);
}