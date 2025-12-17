/**
 * RenderEngine & SSRRenderer Tests
 * Comprehensive testing for universal rendering and SSR
 */

import { RenderEngine } from '../src/vnode/render_engine.js';
import { SSRRenderer } from '../src/vnode/ssr_renderer.js';
import { VNode } from '../src/vnode/vnode.js';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.performance = { now: () => Date.now() };

console.log('\n' + '='.repeat(80));
console.log('🧪 RENDER ENGINE & SSR TESTS');
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

// ============================================================================
// TEST SUITE 1: Environment Detection
// ============================================================================

console.log('TEST SUITE 1: Environment Detection\n');

test('Detect client environment', () => {
  const env = RenderEngine.detectEnvironment();
  assertEquals(env, 'client', 'Should detect client (window exists)');
});

test('Detect environment with window', () => {
  // Window exists in our test environment
  assert(typeof window !== 'undefined', 'Window should exist');
  const env = RenderEngine.detectEnvironment();
  assertEquals(env, 'client', 'Should be client');
});

console.log('');

// ============================================================================
// TEST SUITE 2: SSRRenderer - Basic Rendering
// ============================================================================

console.log('TEST SUITE 2: SSRRenderer - Basic Rendering\n');

test('Render simple text to HTML', () => {
  const html = SSRRenderer.render('Hello World');
  assertEquals(html, 'Hello World', 'Should render text');
});

test('Render simple element to HTML', () => {
  const vnode = new VNode({ tag: 'div', children: ['Content'] });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, '<div>', 'Should have opening tag');
  assertIncludes(html, 'Content', 'Should have content');
  assertIncludes(html, '</div>', 'Should have closing tag');
});

test('Render element with props', () => {
  const vnode = new VNode({
    tag: 'button',
    props: { className: 'btn', id: 'my-btn', disabled: true },
    children: ['Click']
  });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, 'class="btn"', 'Should have class');
  assertIncludes(html, 'id="my-btn"', 'Should have id');
  assertIncludes(html, 'disabled', 'Should have disabled');
  assertIncludes(html, 'Click', 'Should have content');
});

test('Render element with styles', () => {
  const vnode = new VNode({
    tag: 'div',
    style: { color: 'red', fontSize: '18px' }
  });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, 'style=', 'Should have style attribute');
  assertIncludes(html, 'color: red', 'Should have color');
  assertIncludes(html, 'font-size: 18px', 'Should convert camelCase');
});

test('Render nested elements', () => {
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({ tag: 'h1', children: ['Title'] }),
      new VNode({ tag: 'p', children: ['Paragraph'] })
    ]
  });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, '<h1>Title</h1>', 'Should have h1');
  assertIncludes(html, '<p>Paragraph</p>', 'Should have p');
});

test('Render null/undefined', () => {
  assertEquals(SSRRenderer.render(null), '', 'Should render empty');
  assertEquals(SSRRenderer.render(undefined), '', 'Should render empty');
});

test('Render number', () => {
  const html = SSRRenderer.render(42);
  assertEquals(html, '42', 'Should convert to string');
});

test('Render boolean', () => {
  assertEquals(SSRRenderer.render(true), '', 'Should render empty');
  assertEquals(SSRRenderer.render(false), '', 'Should render empty');
});

console.log('');

// ============================================================================
// TEST SUITE 3: SSRRenderer - Special Cases
// ============================================================================

console.log('TEST SUITE 3: SSRRenderer - Special Cases\n');

test('Render void tags (self-closing)', () => {
  const vnode = new VNode({
    tag: 'img',
    props: { src: 'image.jpg', alt: 'Test' }
  });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, '<img', 'Should have img tag');
  assert(!html.includes('</img>'), 'Should not have closing tag');
});

test('Escape HTML in text', () => {
  const html = SSRRenderer.render('<script>alert("xss")</script>');
  
  assertIncludes(html, '&lt;script&gt;', 'Should escape <');
  assertIncludes(html, '&lt;/script&gt;', 'Should escape </');
  assert(!html.includes('<script>'), 'Should not have raw script tag');
});

test('Escape HTML in attributes', () => {
  const vnode = new VNode({
    tag: 'div',
    props: { title: '<script>alert("xss")</script>' }
  });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, '&lt;script&gt;', 'Should escape attribute value');
});

test('Handle array of VNodes', () => {
  const vnodes = [
    new VNode({ tag: 'div', children: ['One'] }),
    new VNode({ tag: 'div', children: ['Two'] })
  ];
  const html = SSRRenderer.render(vnodes);
  
  assertIncludes(html, '>One<', 'Should have first');
  assertIncludes(html, '>Two<', 'Should have second');
});

test('Render boolean attributes', () => {
  const vnode = new VNode({
    tag: 'input',
    props: { disabled: true, checked: false }
  });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, 'disabled', 'Should include true boolean');
  assert(!html.includes('checked'), 'Should omit false boolean');
});

test('Convert className to class', () => {
  const vnode = new VNode({
    tag: 'div',
    props: { className: 'my-class' }
  });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, 'class="my-class"', 'Should convert className');
  assert(!html.includes('className'), 'Should not have className');
});

console.log('');

// ============================================================================
// TEST SUITE 4: SSRRenderer - Complete Documents
// ============================================================================

console.log('TEST SUITE 4: SSRRenderer - Complete Documents\n');

test('Render complete HTML document', () => {
  const vnode = new VNode({ tag: 'div', children: ['Content'] });
  const html = SSRRenderer.renderDocument(vnode, {
    title: 'Test App'
  });
  
  assertIncludes(html, '<!DOCTYPE html>', 'Should have doctype');
  assertIncludes(html, '<html', 'Should have html tag');
  assertIncludes(html, '<head>', 'Should have head');
  assertIncludes(html, '<title>Test App</title>', 'Should have title');
  assertIncludes(html, '<body>', 'Should have body');
  assertIncludes(html, 'Content', 'Should have content');
});

test('Include meta tags', () => {
  const vnode = new VNode({ tag: 'div' });
  const html = SSRRenderer.renderDocument(vnode, {
    meta: {
      description: 'Test description',
      'og:title': 'OG Title'
    }
  });
  
  assertIncludes(html, 'name="description"', 'Should have meta tag');
  assertIncludes(html, 'property="og:title"', 'Should have OG tag');
});

test('Include style links', () => {
  const vnode = new VNode({ tag: 'div' });
  const html = SSRRenderer.renderDocument(vnode, {
    styles: ['styles.css', 'theme.css']
  });
  
  assertIncludes(html, 'href="styles.css"', 'Should have first style');
  assertIncludes(html, 'href="theme.css"', 'Should have second style');
});

test('Include script tags', () => {
  const vnode = new VNode({ tag: 'div' });
  const html = SSRRenderer.renderDocument(vnode, {
    scripts: ['app.js', 'vendor.js']
  });
  
  assertIncludes(html, 'src="app.js"', 'Should have first script');
  assertIncludes(html, 'src="vendor.js"', 'Should have second script');
  assertIncludes(html, 'defer', 'Should defer scripts');
});

console.log('');

// ============================================================================
// TEST SUITE 5: RenderEngine - Server Rendering
// ============================================================================

console.log('TEST SUITE 5: RenderEngine - Server Rendering\n');

test('Generate hydration data', () => {
  const vnode = new VNode({
    tag: 'div',
    props: { className: 'test' },
    metadata: { widgetType: 'Container' },
    children: [
      new VNode({
        tag: 'button',
        events: { click: () => {} },
        children: ['Click']
      })
    ]
  });
  
  const data = RenderEngine.generateHydrationData(vnode);
  
  assert(data.version !== undefined, 'Should have version');
  assert(data.timestamp !== undefined, 'Should have timestamp');
  assert(Array.isArray(data.widgets), 'Should have widgets array');
  assert(Array.isArray(data.events), 'Should have events array');
});

test('Extract critical CSS', () => {
  const vnode = new VNode({
    tag: 'div',
    props: { className: 'fjs-column fjs-center' },
    children: [
      new VNode({
        tag: 'span',
        props: { className: 'fjs-text' }
      })
    ]
  });
  
  const css = RenderEngine.extractCriticalCSS(vnode);
  
  assert(typeof css === 'string', 'Should return CSS string');
  // Should contain FlutterJS widget styles
});

test('Build HTML document', () => {
  const vnode = new VNode({ tag: 'div', children: ['Test'] });
  const html = RenderEngine.buildHTMLDocument({
    title: 'Test App',
    meta: { description: 'Test' },
    criticalCSS: '.test { color: red; }',
    bodyHTML: '<div>Test</div>',
    hydrationData: { version: '1.0.0' },
    scripts: [],
    styles: [],
    includeRuntime: true
  });
  
  assertIncludes(html, '<!DOCTYPE html>', 'Should have doctype');
  assertIncludes(html, '<title>Test App</title>', 'Should have title');
  assertIncludes(html, '.test { color: red; }', 'Should have critical CSS');
  assertIncludes(html, '__FLUTTERJS_HYDRATION_DATA__', 'Should have hydration script');
});

console.log('');

// ============================================================================
// TEST SUITE 6: RenderEngine - Client Rendering
// ============================================================================

console.log('TEST SUITE 6: RenderEngine - Client Rendering\n');

test('Render on client', () => {
  const container = document.createElement('div');
  const vnode = new VNode({ tag: 'div', children: ['Client content'] });
  
  const element = RenderEngine.renderClient(vnode, container);
  
  assert(element !== null, 'Should return element');
  assertEquals(container.querySelector('div').textContent, 'Client content');
});

test('Client render requires target', () => {
  const vnode = new VNode({ tag: 'div' });
  
  try {
    RenderEngine.renderClient(vnode, null);
    throw new Error('Should have thrown');
  } catch (error) {
    assertIncludes(error.message, 'Target element', 'Should mention target');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 7: RenderEngine - Universal Render
// ============================================================================

console.log('TEST SUITE 7: RenderEngine - Universal Render\n');

test('Universal render in client mode', () => {
  const container = document.createElement('div');
  const vnode = new VNode({ tag: 'div', children: ['Universal'] });
  
  // Will use client rendering since window exists
  const result = RenderEngine.render(vnode, container);
  
  assert(result !== null, 'Should render');
});

console.log('');

// ============================================================================
// TEST SUITE 8: RenderEngine - Hydration
// ============================================================================

console.log('TEST SUITE 8: RenderEngine - Hydration\n');

test('Generate hydration data with widgets', () => {
  const vnode = new VNode({
    tag: 'div',
    metadata: { widgetType: 'Container', flutterProps: { padding: 16 } },
    key: 'container-1',
    children: [
      new VNode({
        tag: 'span',
        metadata: { widgetType: 'Text' },
        children: ['Text']
      })
    ]
  });
  
  const data = RenderEngine.generateHydrationData(vnode);
  
  assert(data.widgets.length >= 1, 'Should have widgets');
  assertEquals(data.widgets[0].type, 'Container', 'Should have correct type');
  assertEquals(data.widgets[0].key, 'container-1', 'Should have key');
});

test('Generate hydration data with state bindings', () => {
  const vnode = new VNode({
    tag: 'span',
    isStateBinding: true,
    statefulWidgetId: 'counter',
    stateProperty: 'count',
    children: ['0']
  });
  
  const data = RenderEngine.generateHydrationData(vnode);
  
  assert(data.stateBindings.length === 1, 'Should have state binding');
  assertEquals(data.stateBindings[0].widgetId, 'counter');
  assertEquals(data.stateBindings[0].property, 'count');
});

test('Generate hydration data with events', () => {
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => {}, hover: () => {} },
    children: ['Click']
  });
  
  const data = RenderEngine.generateHydrationData(vnode);
  
  assert(data.events.length === 1, 'Should have events entry');
  assert(data.events[0].events.includes('click'), 'Should have click');
  assert(data.events[0].events.includes('hover'), 'Should have hover');
});

test('Generate hydration data with refs', () => {
  const vnode = new VNode({
    tag: 'div',
    ref: (el) => {},
    children: ['Content']
  });
  
  const data = RenderEngine.generateHydrationData(vnode);
  
  assert(data.refs.length === 1, 'Should have ref entry');
  assert(data.refs[0].hasRef === true, 'Should mark has ref');
});

console.log('');

// ============================================================================
// TEST SUITE 9: RenderEngine - Statistics
// ============================================================================

console.log('TEST SUITE 9: RenderEngine - Statistics\n');

test('Get rendering statistics', () => {
  const vnode = new VNode({
    tag: 'div',
    props: { className: 'container main' },
    events: { click: () => {} },
    children: [
      new VNode({
        tag: 'h1',
        props: { className: 'title' },
        children: ['Title']
      }),
      new VNode({
        tag: 'p',
        children: ['Paragraph']
      })
    ]
  });
  
  const stats = RenderEngine.getStats(vnode);
  
  assert(stats.totalNodes > 0, 'Should count total nodes');
  assert(stats.elementNodes > 0, 'Should count element nodes');
  assert(stats.depth >= 1, 'Should calculate depth');
  assert(stats.classes >= 2, 'Should count unique classes');
  assert(stats.events > 0, 'Should count events');
});

test('Calculate correct depth', () => {
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({
        tag: 'div',
        children: [
          new VNode({
            tag: 'div',
            children: ['Deep']
          })
        ]
      })
    ]
  });
  
  const stats = RenderEngine.getStats(vnode);
  assert(stats.depth >= 3, 'Should calculate correct depth');
});

console.log('');

// ============================================================================
// TEST SUITE 10: Edge Cases
// ============================================================================

console.log('TEST SUITE 10: Edge Cases\n');

test('Handle deeply nested structure in SSR', () => {
  let current = new VNode({ tag: 'span', children: ['Deep'] });
  for (let i = 0; i < 10; i++) {
    current = new VNode({ tag: 'div', children: [current] });
  }
  
  const html = SSRRenderer.render(current);
  
  assertIncludes(html, 'Deep', 'Should render deep content');
  assert(html.includes('<div>'), 'Should have div tags');
});

test('Handle empty VNode tree', () => {
  const vnode = new VNode({ tag: 'div', children: [] });
  const html = SSRRenderer.render(vnode);
  
  assertEquals(html, '<div></div>', 'Should render empty div');
});

test('Handle VNode with null children', () => {
  const vnode = new VNode({
    tag: 'div',
    children: [null, 'text', undefined, new VNode({ tag: 'span' })]
  });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, 'text', 'Should include valid content');
  assertIncludes(html, '<span>', 'Should include span');
});

test('Escape special characters in styles', () => {
  const vnode = new VNode({
    tag: 'div',
    style: { content: '"quoted"' }
  });
  const html = SSRRenderer.render(vnode);
  
  assertIncludes(html, 'style=', 'Should have style');
  assertIncludes(html, '&quot;', 'Should escape quotes');
});

console.log('');

// ============================================================================
// TEST SUITE 11: Meta Tag Generation
// ============================================================================

console.log('TEST SUITE 11: Meta Tag Generation\n');

test('Generate description meta tag', () => {
  const tags = RenderEngine.generateMetaTags({
    description: 'Test description'
  });
  
  assertIncludes(tags, 'name="description"', 'Should have description');
  assertIncludes(tags, 'Test description', 'Should have content');
});

test('Generate Open Graph tags', () => {
  const tags = RenderEngine.generateMetaTags({
    ogTitle: 'OG Title',
    ogDescription: 'OG Description',
    ogImage: 'https://example.com/image.jpg'
  });
  
  assertIncludes(tags, 'property="og:title"', 'Should have og:title');
  assertIncludes(tags, 'property="og:description"', 'Should have og:description');
  assertIncludes(tags, 'property="og:image"', 'Should have og:image');
});

test('Generate Twitter Card tags', () => {
  const tags = RenderEngine.generateMetaTags({
    twitterCard: 'summary_large_image'
  });
  
  assertIncludes(tags, 'name="twitter:card"', 'Should have twitter card');
});

test('Generate custom meta tags', () => {
  const tags = RenderEngine.generateMetaTags({
    custom: [
      { name: 'custom-tag', content: 'custom-value' },
      { property: 'og:custom', content: 'custom-og' }
    ]
  });
  
  assertIncludes(tags, 'name="custom-tag"', 'Should have custom name tag');
  assertIncludes(tags, 'property="og:custom"', 'Should have custom property tag');
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