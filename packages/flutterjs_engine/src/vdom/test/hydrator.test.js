/**
 * Hydrator Tests - Comprehensive Hydration Testing
 * Tests SSR → CSR transition and hydration correctness
 */

import { Hydrator } from '../src/vnode/hydrator.js';
import { VNode } from '../src/vnode/vnode.js';
import { SSRRenderer } from '../src/vnode/ssr-renderer.js';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;

console.log('\n' + '='.repeat(80));
console.log('🧪 HYDRATOR TESTS');
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

// Helper to create SSR HTML from VNode
function createSSRHTML(vnode) {
  const html = SSRRenderer.render(vnode);
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.firstChild;
}

// ============================================================================
// TEST SUITE 1: Basic Hydration
// ============================================================================

console.log('TEST SUITE 1: Basic Hydration\n');

test('Hydrate simple element', () => {
  const vnode = new VNode({ tag: 'div', children: ['Hello'] });
  const ssrElement = createSSRHTML(vnode);
  
  const hydrated = Hydrator.hydrate(ssrElement, vnode);
  
  assert(hydrated !== null, 'Should return element');
  assert(Hydrator.isHydrated(hydrated), 'Should be marked as hydrated');
  assertEquals(hydrated.textContent, 'Hello', 'Should preserve content');
});

test('Store VNode references after hydration', () => {
  const vnode = new VNode({ tag: 'div', children: ['Content'] });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(ssrElement._vnode === vnode, 'Should store vnode on element');
  assert(vnode._element === ssrElement, 'Should store element on vnode');
});

test('Hydrate nested structure', () => {
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({ tag: 'h1', children: ['Title'] }),
      new VNode({ tag: 'p', children: ['Paragraph'] })
    ]
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  const h1 = ssrElement.querySelector('h1');
  const p = ssrElement.querySelector('p');
  
  assert(h1._vnode === vnode.children[0], 'Should hydrate h1');
  assert(p._vnode === vnode.children[1], 'Should hydrate p');
});

test('Require root element', () => {
  const vnode = new VNode({ tag: 'div' });
  
  try {
    Hydrator.hydrate(null, vnode);
    throw new Error('Should have thrown');
  } catch (error) {
    assertIncludes(error.message, 'Root element', 'Should mention root element');
  }
});

test('Require VNode tree', () => {
  const element = document.createElement('div');
  
  try {
    Hydrator.hydrate(element, null);
    throw new Error('Should have thrown');
  } catch (error) {
    assertIncludes(error.message, 'VNode tree', 'Should mention VNode tree');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 2: Event Listener Attachment
// ============================================================================

console.log('TEST SUITE 2: Event Listener Attachment\n');

test('Attach click event during hydration', () => {
  let clicked = false;
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => { clicked = true; } },
    children: ['Click Me']
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  ssrElement.click();
  assert(clicked === true, 'Should call click handler');
});

test('Attach multiple events', () => {
  let focused = false;
  let blurred = false;
  
  const vnode = new VNode({
    tag: 'input',
    events: {
      focus: () => { focused = true; },
      blur: () => { blurred = true; }
    }
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  ssrElement.dispatchEvent(new window.Event('focus'));
  ssrElement.dispatchEvent(new window.Event('blur'));
  
  assert(focused === true, 'Should handle focus');
  assert(blurred === true, 'Should handle blur');
});

test('Attach events on nested elements', () => {
  let button1Clicked = false;
  let button2Clicked = false;
  
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({
        tag: 'button',
        events: { click: () => { button1Clicked = true; } },
        children: ['Button 1']
      }),
      new VNode({
        tag: 'button',
        events: { click: () => { button2Clicked = true; } },
        children: ['Button 2']
      })
    ]
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  const buttons = ssrElement.querySelectorAll('button');
  buttons[0].click();
  buttons[1].click();
  
  assert(button1Clicked === true, 'Should handle button 1');
  assert(button2Clicked === true, 'Should handle button 2');
});

test('Store event listeners on element', () => {
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => {} },
    children: ['Button']
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(ssrElement._eventListeners !== undefined, 'Should have _eventListeners');
  assert(ssrElement._eventListeners.click !== undefined, 'Should store click handler');
});

console.log('');

// ============================================================================
// TEST SUITE 3: Ref Callbacks
// ============================================================================

console.log('TEST SUITE 3: Ref Callbacks\n');

test('Call ref callback during hydration', () => {
  let refElement = null;
  const vnode = new VNode({
    tag: 'div',
    ref: (el) => { refElement = el; },
    children: ['Content']
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(refElement !== null, 'Should call ref');
  assert(refElement === ssrElement, 'Should pass correct element');
});

test('Call refs on nested elements', () => {
  let ref1 = null;
  let ref2 = null;
  
  const vnode = new VNode({
    tag: 'div',
    ref: (el) => { ref1 = el; },
    children: [
      new VNode({
        tag: 'span',
        ref: (el) => { ref2 = el; },
        children: ['Nested']
      })
    ]
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(ref1 !== null, 'Should call parent ref');
  assert(ref2 !== null, 'Should call child ref');
  assertEquals(ref2.tagName, 'SPAN', 'Child ref should be span');
});

test('Handle ref callback errors gracefully', () => {
  const vnode = new VNode({
    tag: 'div',
    ref: () => { throw new Error('Ref error'); },
    children: ['Content']
  });
  const ssrElement = createSSRHTML(vnode);
  
  // Should not throw
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(Hydrator.isHydrated(ssrElement), 'Should still complete hydration');
});

console.log('');

// ============================================================================
// TEST SUITE 4: State Bindings
// ============================================================================

console.log('TEST SUITE 4: State Bindings\n');

test('Initialize state bindings', () => {
  const vnode = new VNode({
    tag: 'span',
    isStateBinding: true,
    statefulWidgetId: 'counter',
    stateProperty: 'count',
    children: ['0']
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(ssrElement._stateBindings !== undefined, 'Should have state bindings');
  assertEquals(ssrElement._stateBindings.length, 1, 'Should have 1 binding');
  assertEquals(ssrElement._stateBindings[0].widgetId, 'counter', 'Should store widget ID');
  assertEquals(ssrElement._stateBindings[0].property, 'count', 'Should store property');
});

test('Initialize multiple state bindings', () => {
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({
        tag: 'span',
        isStateBinding: true,
        statefulWidgetId: 'widget1',
        stateProperty: 'prop1',
        children: ['Value 1']
      }),
      new VNode({
        tag: 'span',
        isStateBinding: true,
        statefulWidgetId: 'widget2',
        stateProperty: 'prop2',
        children: ['Value 2']
      })
    ]
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(ssrElement._stateBindings.length === 2, 'Should have 2 bindings');
});

console.log('');

// ============================================================================
// TEST SUITE 5: Hydration Data
// ============================================================================

console.log('TEST SUITE 5: Hydration Data\n');

test('Generate hydration data', () => {
  const vnode = new VNode({
    tag: 'div',
    metadata: { widgetType: 'Container' },
    key: 'container-1',
    children: [
      new VNode({
        tag: 'button',
        events: { click: () => {} },
        children: ['Click']
      })
    ]
  });
  
  const data = Hydrator.generateHydrationData(vnode);
  
  assert(data.version !== undefined, 'Should have version');
  assert(data.timestamp !== undefined, 'Should have timestamp');
  assert(Array.isArray(data.widgets), 'Should have widgets array');
  assert(Array.isArray(data.events), 'Should have events array');
});

test('Collect widget metadata', () => {
  const vnode = new VNode({
    tag: 'div',
    metadata: { 
      widgetType: 'Container',
      flutterProps: { padding: 16 }
    },
    key: 'test-key',
    children: []
  });
  
  const data = Hydrator.generateHydrationData(vnode);
  
  assertEquals(data.widgets.length, 1, 'Should have 1 widget');
  assertEquals(data.widgets[0].type, 'Container', 'Should have type');
  assertEquals(data.widgets[0].key, 'test-key', 'Should have key');
  assertEquals(data.widgets[0].props.padding, 16, 'Should have props');
});

test('Collect event handlers', () => {
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => {}, hover: () => {} },
    children: ['Button']
  });
  
  const data = Hydrator.generateHydrationData(vnode);
  
  assertEquals(data.events.length, 1, 'Should have 1 event entry');
  assert(data.events[0].events.includes('click'), 'Should include click');
  assert(data.events[0].events.includes('hover'), 'Should include hover');
});

test('Collect state bindings', () => {
  const vnode = new VNode({
    tag: 'span',
    isStateBinding: true,
    statefulWidgetId: 'counter',
    stateProperty: 'count',
    children: ['0']
  });
  
  const data = Hydrator.generateHydrationData(vnode);
  
  assertEquals(data.stateBindings.length, 1, 'Should have 1 binding');
  assertEquals(data.stateBindings[0].widgetId, 'counter', 'Should have widget ID');
  assertEquals(data.stateBindings[0].property, 'count', 'Should have property');
});

test('Collect refs', () => {
  const vnode = new VNode({
    tag: 'div',
    ref: (el) => {},
    children: ['Content']
  });
  
  const data = Hydrator.generateHydrationData(vnode);
  
  assertEquals(data.refs.length, 1, 'Should have 1 ref');
  assert(data.refs[0].hasRef === true, 'Should mark has ref');
});

test('Validate hydration data', () => {
  const validData = {
    version: '1.0.0',
    widgets: [],
    stateBindings: [],
    events: [],
    refs: []
  };
  
  assert(Hydrator.validateHydrationData(validData), 'Should validate correct data');
  
  const invalidData1 = { version: '1.0.0' };
  assert(!Hydrator.validateHydrationData(invalidData1), 'Should reject missing arrays');
  
  const invalidData2 = null;
  assert(!Hydrator.validateHydrationData(invalidData2), 'Should reject null');
});

console.log('');

// ============================================================================
// TEST SUITE 6: Hydration Markers
// ============================================================================

console.log('TEST SUITE 6: Hydration Markers\n');

test('Mark element as hydrated', () => {
  const vnode = new VNode({ tag: 'div', children: ['Content'] });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(ssrElement.hasAttribute('data-hydrated'), 'Should have data-hydrated attribute');
  assert(ssrElement._hydrated === true, 'Should have _hydrated property');
});

test('Check if element is hydrated', () => {
  const vnode = new VNode({ tag: 'div' });
  const ssrElement = createSSRHTML(vnode);
  
  assert(!Hydrator.isHydrated(ssrElement), 'Should not be hydrated initially');
  
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(Hydrator.isHydrated(ssrElement), 'Should be hydrated after hydration');
});

console.log('');

// ============================================================================
// TEST SUITE 7: Partial Hydration
// ============================================================================

console.log('TEST SUITE 7: Partial Hydration\n');

test('Partially hydrate subtree', () => {
  let clicked = false;
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => { clicked = true; } },
    children: ['Click']
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydratePartial(ssrElement, vnode);
  
  assert(Hydrator.isHydrated(ssrElement), 'Should be hydrated');
  ssrElement.click();
  assert(clicked === true, 'Should attach events');
});

test('Partial hydration requires both arguments', () => {
  try {
    Hydrator.hydratePartial(null, new VNode({ tag: 'div' }));
    throw new Error('Should have thrown');
  } catch (error) {
    assertIncludes(error.message, 'required', 'Should mention requirements');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 8: Dehydration
// ============================================================================

console.log('TEST SUITE 8: Dehydration\n');

test('Dehydrate element', () => {
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => {} },
    children: ['Button']
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  assert(Hydrator.isHydrated(ssrElement), 'Should be hydrated');
  
  Hydrator.dehydrate(ssrElement);
  
  assert(!Hydrator.isHydrated(ssrElement), 'Should not be hydrated');
  assert(ssrElement._eventListeners === null || ssrElement._eventListeners === undefined, 'Should remove event listeners');
});

test('Dehydrate recursively', () => {
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({
        tag: 'button',
        events: { click: () => {} },
        children: ['Button']
      })
    ]
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  const button = ssrElement.querySelector('button');
  assert(button._eventListeners !== undefined, 'Button should have events');
  
  Hydrator.dehydrate(ssrElement);
  
  assert(!Hydrator.isHydrated(button), 'Button should be dehydrated');
});

console.log('');

// ============================================================================
// TEST SUITE 9: Hydration Verification
// ============================================================================

console.log('TEST SUITE 9: Hydration Verification\n');

test('Verify successful hydration', () => {
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({ tag: 'span', children: ['Text'] })
    ]
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  const report = Hydrator.verifyHydration(ssrElement, vnode);
  
  assert(report.success === true, 'Should succeed');
  assertEquals(report.mismatches.length, 0, 'Should have no mismatches');
  assert(report.stats.nodesMatched > 0, 'Should match nodes');
});

test('Detect tag mismatches', () => {
  const vnode = new VNode({ tag: 'div', children: ['Content'] });
  const ssrElement = document.createElement('span'); // Wrong tag!
  ssrElement.textContent = 'Content';
  
  Hydrator.hydrate(ssrElement, vnode);
  
  const report = Hydrator.verifyHydration(ssrElement, vnode);
  
  assert(report.success === false, 'Should fail');
  assert(report.mismatches.length > 0, 'Should have mismatches');
  assertEquals(report.mismatches[0].type, 'tag-mismatch', 'Should detect tag mismatch');
});

test('Report verification statistics', () => {
  const vnode = new VNode({
    tag: 'div',
    events: { click: () => {} },
    ref: (el) => {},
    isStateBinding: true,
    statefulWidgetId: 'test',
    stateProperty: 'value',
    children: ['Content']
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  const report = Hydrator.verifyHydration(ssrElement, vnode);
  
  assert(report.stats.nodesChecked > 0, 'Should check nodes');
  assert(report.stats.eventListenersAttached > 0, 'Should attach events');
  assert(report.stats.refsRestored > 0, 'Should restore refs');
  assert(report.stats.stateBindings > 0, 'Should count state bindings');
});

console.log('');

// ============================================================================
// TEST SUITE 10: Hydration Statistics
// ============================================================================

console.log('TEST SUITE 10: Hydration Statistics\n');

test('Get hydration statistics', () => {
  const vnode = new VNode({
    tag: 'div',
    events: { click: () => {} },
    ref: (el) => {},
    children: [
      new VNode({ tag: 'span', children: ['Child'] })
    ]
  });
  const ssrElement = createSSRHTML(vnode);
  
  Hydrator.hydrate(ssrElement, vnode);
  
  const stats = Hydrator.getStats(ssrElement);
  
  assert(stats.isHydrated === true, 'Should be hydrated');
  assert(stats.totalElements > 0, 'Should count elements');
  assert(stats.elementsWithEvents > 0, 'Should count elements with events');
  assert(stats.elementsWithRefs > 0, 'Should count elements with refs');
});

console.log('');

// ============================================================================
// TEST SUITE 11: Complex Scenarios
// ============================================================================

console.log('TEST SUITE 11: Complex Scenarios\n');

test('Hydrate deeply nested structure', () => {
  let current = new VNode({ tag: 'span', children: ['Deep'] });
  for (let i = 0; i < 5; i++) {
    current = new VNode({ tag: 'div', children: [current] });
  }
  
  const ssrElement = createSSRHTML(current);
  Hydrator.hydrate(ssrElement, current);
  
  assert(Hydrator.isHydrated(ssrElement), 'Should hydrate deep structure');
  assertIncludes(ssrElement.textContent, 'Deep', 'Should preserve content');
});

test('Hydrate list with events', () => {
  const clickCounts = [0, 0, 0];
  const items = ['Item 1', 'Item 2', 'Item 3'];
  
  const vnode = new VNode({
    tag: 'ul',
    children: items.map((item, i) => new VNode({
      tag: 'li',
      key: `item-${i}`,
      events: { click: () => { clickCounts[i]++; } },
      children: [item]
    }))
  });
  
  const ssrElement = createSSRHTML(vnode);
  Hydrator.hydrate(ssrElement, vnode);
  
  const lis = ssrElement.querySelectorAll('li');
  lis[0].click();
  lis[1].click();
  lis[2].click();
  
  assertEquals(clickCounts[0], 1, 'Should handle first item');
  assertEquals(clickCounts[1], 1, 'Should handle second item');
  assertEquals(clickCounts[2], 1, 'Should handle third item');
});

test('Hydrate complete app structure', () => {
  let fabClicked = false;
  
  const vnode = new VNode({
    tag: 'div',
    props: { className: 'fjs-scaffold' },
    children: [
      new VNode({
        tag: 'header',
        props: { className: 'fjs-app-bar' },
        children: ['App Title']
      }),
      new VNode({
        tag: 'main',
        children: [
          new VNode({
            tag: 'div',
            children: [
              new VNode({ tag: 'span', children: ['Count: '] }),
              new VNode({
                tag: 'span',
                isStateBinding: true,
                statefulWidgetId: 'counter',
                stateProperty: 'count',
                children: ['0']
              })
            ]
          })
        ]
      }),
      new VNode({
        tag: 'button',
        props: { className: 'fjs-fab' },
        events: { click: () => { fabClicked = true; } },
        children: ['+']
      })
    ]
  });
  
  const ssrElement = createSSRHTML(vnode);
  Hydrator.hydrate(ssrElement, vnode);
  
  // Verify structure
  assert(ssrElement.querySelector('header') !== null, 'Should have header');
  assert(ssrElement.querySelector('main') !== null, 'Should have main');
  
  // Verify events work
  const fab = ssrElement.querySelector('.fjs-fab');
  fab.click();
  assert(fabClicked === true, 'Should handle FAB click');
  
  // Verify state bindings
  assert(ssrElement._stateBindings.length === 1, 'Should have state binding');
});

console.log('');

// ============================================================================
// TEST SUITE 12: Error Handling
// ============================================================================

console.log('TEST SUITE 12: Error Handling\n');

test('Handle missing DOM nodes gracefully', () => {
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({ tag: 'span', children: ['Child'] })
    ]
  });
  const ssrElement = document.createElement('div'); // Empty, no children
  
  // Should not throw
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(Hydrator.isHydrated(ssrElement), 'Should complete hydration');
});

test('Handle text content mismatches', () => {
  const vnode = new VNode({ tag: 'div', children: ['Expected text'] });
  const ssrElement = document.createElement('div');
  ssrElement.textContent = 'Different text'; // Mismatch
  
  // Should not throw, but may warn
  Hydrator.hydrate(ssrElement, vnode);
  
  assert(Hydrator.isHydrated(ssrElement), 'Should complete hydration');
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