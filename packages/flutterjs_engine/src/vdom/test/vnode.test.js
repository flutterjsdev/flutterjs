/**
 * VNode Tests - Comprehensive Integration Testing
 * Tests VNode creation, rendering (DOM/SSR), hydration, and Flutter widget integration
 */

import { VNode } from '../src/vnode/vnode.js';
import { JSDOM } from 'jsdom';

// Setup DOM environment for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.Node = dom.window.Node;
global.HTMLElement = dom.window.HTMLElement;

console.log('\n' + '='.repeat(80));
console.log('🧪 VNODE INTEGRATION TESTS');
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
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(
      message || `Expected "${haystack}" to include "${needle}"`
    );
  }
}

// ============================================================================
// TEST SUITE 1: VNode Creation & Basic Properties
// ============================================================================

console.log('TEST SUITE 1: VNode Creation & Basic Properties\n');

test('Create empty VNode', () => {
  const vnode = new VNode();
  assert(vnode.tag === 'div', 'Should default to div tag');
  assert(Array.isArray(vnode.children), 'Should have children array');
  assert(typeof vnode.props === 'object', 'Should have props object');
});

test('Create VNode with tag', () => {
  const vnode = new VNode({ tag: 'span' });
  assertEquals(vnode.tag, 'span', 'Should set tag');
});

test('Create VNode with props', () => {
  const vnode = new VNode({
    tag: 'button',
    props: { className: 'btn-primary', id: 'my-button' }
  });
  
  assertEquals(vnode.props.className, 'btn-primary', 'Should set className');
  assertEquals(vnode.props.id, 'my-button', 'Should set id');
});

test('Create VNode with styles', () => {
  const vnode = new VNode({
    tag: 'div',
    style: { color: 'red', fontSize: '16px', padding: '10px' }
  });
  
  assertEquals(vnode.style.color, 'red', 'Should set color');
  assertEquals(vnode.style.fontSize, '16px', 'Should set fontSize');
  assertEquals(vnode.style.padding, '10px', 'Should set padding');
});

test('Create VNode with children', () => {
  const child1 = new VNode({ tag: 'span', children: ['Child 1'] });
  const child2 = new VNode({ tag: 'span', children: ['Child 2'] });
  
  const parent = new VNode({
    tag: 'div',
    children: [child1, child2, 'Text node']
  });
  
  assertEquals(parent.children.length, 3, 'Should have 3 children');
  assert(parent.children[0] instanceof VNode, 'First child is VNode');
  assert(parent.children[1] instanceof VNode, 'Second child is VNode');
  assertEquals(parent.children[2], 'Text node', 'Third child is text');
});

test('Create VNode with key', () => {
  const vnode = new VNode({ tag: 'li', key: 'item-1' });
  assertEquals(vnode.key, 'item-1', 'Should set key');
});

test('Create VNode with events', () => {
  const clickHandler = () => console.log('clicked');
  const vnode = new VNode({
    tag: 'button',
    events: { click: clickHandler }
  });
  
  assertEquals(vnode.events.click, clickHandler, 'Should set event handler');
});

test('Create VNode with state binding', () => {
  const vnode = new VNode({
    tag: 'span',
    statefulWidgetId: 'counter-1',
    stateProperty: 'count',
    isStateBinding: true
  });
  
  assertEquals(vnode.statefulWidgetId, 'counter-1', 'Should set widget ID');
  assertEquals(vnode.stateProperty, 'count', 'Should set property');
  assert(vnode.isStateBinding === true, 'Should mark as state binding');
});

test('Create VNode with metadata', () => {
  const vnode = new VNode({
    tag: 'div',
    metadata: { widgetType: 'Container', flutterProps: { padding: 16 } }
  });
  
  assertEquals(vnode.metadata.widgetType, 'Container', 'Should set widget type');
  assert(vnode.metadata.flutterProps !== undefined, 'Should store Flutter props');
});

console.log('');

// ============================================================================
// TEST SUITE 2: HTML Rendering (SSR)
// ============================================================================

console.log('TEST SUITE 2: HTML Rendering (SSR)\n');

test('Render simple VNode to HTML', () => {
  const vnode = new VNode({
    tag: 'div',
    children: ['Hello World']
  });
  
  const html = vnode.toHTML();
  assertIncludes(html, '<div>', 'Should have opening tag');
  assertIncludes(html, 'Hello World', 'Should have content');
  assertIncludes(html, '</div>', 'Should have closing tag');
});

test('Render VNode with props to HTML', () => {
  const vnode = new VNode({
    tag: 'button',
    props: { className: 'btn', id: 'submit' },
    children: ['Submit']
  });
  
  const html = vnode.toHTML();
  assertIncludes(html, 'class="btn"', 'Should render className');
  assertIncludes(html, 'id="submit"', 'Should render id');
  assertIncludes(html, 'Submit', 'Should render content');
});

test('Render VNode with styles to HTML', () => {
  const vnode = new VNode({
    tag: 'div',
    style: { color: 'blue', fontSize: '18px' },
    children: ['Styled text']
  });
  
  const html = vnode.toHTML();
  assertIncludes(html, 'style="', 'Should have style attribute');
  assertIncludes(html, 'color: blue', 'Should include color');
  assertIncludes(html, 'font-size: 18px', 'Should convert camelCase to kebab-case');
});

test('Render nested VNodes to HTML', () => {
  const child = new VNode({
    tag: 'span',
    children: ['Inner text']
  });
  
  const parent = new VNode({
    tag: 'div',
    props: { className: 'container' },
    children: [child]
  });
  
  const html = parent.toHTML();
  assertIncludes(html, '<div', 'Should have parent tag');
  assertIncludes(html, '<span>', 'Should have child tag');
  assertIncludes(html, 'Inner text', 'Should have nested content');
  assertIncludes(html, '</span>', 'Should close child');
  assertIncludes(html, '</div>', 'Should close parent');
});

test('Render void tags correctly', () => {
  const vnode = new VNode({
    tag: 'img',
    props: { src: 'image.jpg', alt: 'Test' }
  });
  
  const html = vnode.toHTML();
  assertIncludes(html, '<img', 'Should have img tag');
  assertIncludes(html, 'src="image.jpg"', 'Should have src');
  assert(!html.includes('</img>'), 'Should not have closing tag');
});

test('Escape HTML special characters', () => {
  const vnode = new VNode({
    tag: 'div',
    children: ['<script>alert("xss")</script>']
  });
  
  const html = vnode.toHTML();
  assertIncludes(html, '&lt;script&gt;', 'Should escape <');
  assertIncludes(html, '&lt;/script&gt;', 'Should escape </');
  assert(!html.includes('<script>'), 'Should not have unescaped script tag');
});

test('Render boolean attributes', () => {
  const vnode = new VNode({
    tag: 'input',
    props: { type: 'checkbox', checked: true, disabled: false }
  });
  
  const html = vnode.toHTML();
  assertIncludes(html, 'checked', 'Should include true boolean');
  assert(!html.includes('disabled'), 'Should omit false boolean');
});

test('Render data attributes', () => {
  const vnode = new VNode({
    tag: 'div',
    props: { 'data-widget-id': '123', 'data-type': 'container' }
  });
  
  const html = vnode.toHTML();
  assertIncludes(html, 'data-widget-id="123"', 'Should render data attribute');
  assertIncludes(html, 'data-type="container"', 'Should render data attribute');
});

console.log('');

// ============================================================================
// TEST SUITE 3: DOM Rendering (CSR)
// ============================================================================

console.log('TEST SUITE 3: DOM Rendering (CSR)\n');

test('Render simple VNode to DOM', () => {
  const vnode = new VNode({
    tag: 'div',
    children: ['Hello DOM']
  });
  
  const element = vnode.toDOM();
  assertEquals(element.tagName, 'DIV', 'Should create div element');
  assertEquals(element.textContent, 'Hello DOM', 'Should have text content');
});

test('Render VNode with props to DOM', () => {
  const vnode = new VNode({
    tag: 'button',
    props: { className: 'btn-primary', id: 'action-btn', disabled: true }
  });
  
  const element = vnode.toDOM();
  assertEquals(element.className, 'btn-primary', 'Should set className');
  assertEquals(element.id, 'action-btn', 'Should set id');
  assert(element.disabled === true, 'Should set disabled');
});

test('Render VNode with styles to DOM', () => {
  const vnode = new VNode({
    tag: 'div',
    style: { color: 'red', fontSize: '20px', display: 'flex' }
  });
  
  const element = vnode.toDOM();
  assertEquals(element.style.color, 'red', 'Should set color');
  assertEquals(element.style.fontSize, '20px', 'Should set fontSize');
  assertEquals(element.style.display, 'flex', 'Should set display');
});

test('Render nested VNodes to DOM', () => {
  const child1 = new VNode({ tag: 'span', children: ['Child 1'] });
  const child2 = new VNode({ tag: 'span', children: ['Child 2'] });
  
  const parent = new VNode({
    tag: 'div',
    children: [child1, child2, 'Text node']
  });
  
  const element = parent.toDOM();
  assertEquals(element.childNodes.length, 3, 'Should have 3 children');
  assertEquals(element.childNodes[0].tagName, 'SPAN', 'First is span');
  assertEquals(element.childNodes[1].tagName, 'SPAN', 'Second is span');
  assertEquals(element.childNodes[2].nodeType, Node.TEXT_NODE, 'Third is text');
});

test('Attach event listeners to DOM', () => {
  let clicked = false;
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => { clicked = true; } }
  });
  
  const element = vnode.toDOM();
  element.click();
  assert(clicked === true, 'Should call click handler');
});

test('Store VNode reference on DOM element', () => {
  const vnode = new VNode({ tag: 'div' });
  const element = vnode.toDOM();
  
  assert(element._vnode === vnode, 'Should store vnode reference');
  assert(vnode._element === element, 'Should store element reference');
});

test('Call ref callback on DOM creation', () => {
  let refElement = null;
  const vnode = new VNode({
    tag: 'div',
    ref: (el) => { refElement = el; }
  });
  
  const element = vnode.toDOM();
  assert(refElement === element, 'Should call ref with element');
});

test('Handle input value correctly', () => {
  const vnode = new VNode({
    tag: 'input',
    props: { type: 'text', value: 'Initial value' }
  });
  
  const element = vnode.toDOM();
  assertEquals(element.value, 'Initial value', 'Should set input value');
});

test('Handle checkbox checked state', () => {
  const vnode = new VNode({
    tag: 'input',
    props: { type: 'checkbox', checked: true }
  });
  
  const element = vnode.toDOM();
  assert(element.checked === true, 'Should set checked state');
});

console.log('');

// ============================================================================
// TEST SUITE 4: Hydration (SSR → CSR)
// ============================================================================

console.log('TEST SUITE 4: Hydration (SSR → CSR)\n');

test('Hydrate simple VNode', () => {
  const vnode = new VNode({
    tag: 'div',
    children: ['Hello']
  });
  
  // Create SSR HTML
  const html = vnode.toHTML();
  const container = document.createElement('div');
  container.innerHTML = html;
  const ssrElement = container.firstChild;
  
  // Hydrate
  const hydrated = vnode.hydrate(ssrElement);
  assert(hydrated === ssrElement, 'Should return same element');
  assert(vnode._element === ssrElement, 'Should store reference');
});

test('Hydrate with events', () => {
  let clicked = false;
  const vnode = new VNode({
    tag: 'button',
    children: ['Click me'],
    events: { click: () => { clicked = true; } }
  });
  
  // SSR HTML (no events)
  const container = document.createElement('div');
  container.innerHTML = '<button>Click me</button>';
  const ssrElement = container.firstChild;
  
  // Hydrate (attaches events)
  vnode.hydrate(ssrElement);
  ssrElement.click();
  
  assert(clicked === true, 'Should attach event handler');
});

test('Hydrate nested structure', () => {
  const child = new VNode({
    tag: 'span',
    children: ['Inner']
  });
  
  const parent = new VNode({
    tag: 'div',
    children: [child]
  });
  
  // Create SSR HTML
  const container = document.createElement('div');
  container.innerHTML = '<div><span>Inner</span></div>';
  const ssrElement = container.firstChild;
  
  // Hydrate
  parent.hydrate(ssrElement);
  
  assert(parent._element === ssrElement, 'Parent should be hydrated');
  assert(child._element === ssrElement.firstChild, 'Child should be hydrated');
});

test('Hydrate with ref callback', () => {
  let refElement = null;
  const vnode = new VNode({
    tag: 'div',
    ref: (el) => { refElement = el; }
  });
  
  const container = document.createElement('div');
  container.innerHTML = '<div></div>';
  const ssrElement = container.firstChild;
  
  vnode.hydrate(ssrElement);
  assert(refElement === ssrElement, 'Should call ref during hydration');
});

console.log('');

// ============================================================================
// TEST SUITE 5: Flutter Widget Integration
// ============================================================================

console.log('TEST SUITE 5: Flutter Widget Integration\n');

test('Represent Flutter Text widget', () => {
  const textVNode = new VNode({
    tag: 'span',
    props: { className: 'fjs-text' },
    style: { fontSize: '16px', color: '#000000' },
    children: ['Hello Flutter'],
    metadata: { widgetType: 'Text', flutterProps: { data: 'Hello Flutter' } }
  });
  
  const html = textVNode.toHTML();
  assertIncludes(html, 'Hello Flutter', 'Should render text');
  assertIncludes(html, 'data-widget-type="Text"', 'Should include widget type');
});

test('Represent Flutter Container widget', () => {
  const containerVNode = new VNode({
    tag: 'div',
    props: { className: 'fjs-container' },
    style: {
      padding: '16px',
      backgroundColor: '#ffffff',
      borderRadius: '8px'
    },
    children: [
      new VNode({ tag: 'span', children: ['Content'] })
    ],
    metadata: { widgetType: 'Container' }
  });
  
  const element = containerVNode.toDOM();
  assertEquals(element.style.padding, '16px', 'Should apply padding');
 // Check that background color was applied (browser may convert format)
assert(element.style.backgroundColor === '#ffffff' || element.style.backgroundColor === 'rgb(255, 255, 255)', 'Should apply background');
});

test('Represent Flutter Column widget', () => {
  const columnVNode = new VNode({
    tag: 'div',
    props: { className: 'fjs-column' },
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start'
    },
    children: [
      new VNode({ tag: 'span', children: ['Item 1'] }),
      new VNode({ tag: 'span', children: ['Item 2'] })
    ],
    metadata: { widgetType: 'Column' }
  });
  
  const element = columnVNode.toDOM();
  assertEquals(element.style.display, 'flex', 'Should use flexbox');
  assertEquals(element.style.flexDirection, 'column', 'Should be column');
  assertEquals(element.childNodes.length, 2, 'Should have 2 children');
});

test('Represent Flutter Row widget', () => {
  const rowVNode = new VNode({
    tag: 'div',
    props: { className: 'fjs-row' },
    style: {
      display: 'flex',
      flexDirection: 'row',
      gap: '8px'
    },
    children: [
      new VNode({ tag: 'span', children: ['A'] }),
      new VNode({ tag: 'span', children: ['B'] }),
      new VNode({ tag: 'span', children: ['C'] })
    ],
    metadata: { widgetType: 'Row' }
  });
  
  const element = rowVNode.toDOM();
  assertEquals(element.style.flexDirection, 'row', 'Should be row');
  assertEquals(element.childNodes.length, 3, 'Should have 3 children');
});

test('Represent Flutter Button widget', () => {
  let pressed = false;
  const buttonVNode = new VNode({
    tag: 'button',
    props: { className: 'fjs-elevated-button' },
    style: {
      padding: '12px 24px',
      backgroundColor: '#6750a4',
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px'
    },
    children: ['Press Me'],
    events: { click: () => { pressed = true; } },
    metadata: { widgetType: 'ElevatedButton' }
  });
  
  const element = buttonVNode.toDOM();
  element.click();
  assert(pressed === true, 'Should handle onPressed');
});

test('Represent Flutter TextField widget', () => {
  const textFieldVNode = new VNode({
    tag: 'input',
    props: {
      type: 'text',
      className: 'fjs-text-field',
      placeholder: 'Enter text'
    },
    style: {
      padding: '8px 12px',
      border: '1px solid #ccc',
      borderRadius: '4px'
    },
    metadata: { widgetType: 'TextField' }
  });
  
  const element = textFieldVNode.toDOM();
  assertEquals(element.placeholder, 'Enter text', 'Should set placeholder');
  assertEquals(element.tagName, 'INPUT', 'Should be input element');
});

test('Represent Flutter Image widget', () => {
  const imageVNode = new VNode({
    tag: 'img',
    props: {
      src: 'https://example.com/image.jpg',
      alt: 'Example image',
      className: 'fjs-image'
    },
    style: {
      width: '200px',
      height: '200px',
      objectFit: 'cover'
    },
    metadata: { widgetType: 'Image' }
  });
  
  const element = imageVNode.toDOM();
  assertEquals(element.src, 'https://example.com/image.jpg', 'Should set src');
  assertEquals(element.alt, 'Example image', 'Should set alt');
});

test('Represent Flutter Scaffold widget', () => {
  const scaffoldVNode = new VNode({
    tag: 'div',
    props: { className: 'fjs-scaffold' },
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    },
    children: [
      new VNode({
        tag: 'header',
        props: { className: 'fjs-app-bar' },
        children: ['App Title']
      }),
      new VNode({
        tag: 'main',
        props: { className: 'fjs-body' },
        style: { flex: '1' },
        children: ['Body content']
      })
    ],
    metadata: { widgetType: 'Scaffold' }
  });
  
  const element = scaffoldVNode.toDOM();
  assertEquals(element.childNodes.length, 2, 'Should have header and body');
  assertEquals(element.childNodes[0].tagName, 'HEADER', 'First should be header');
  assertEquals(element.childNodes[1].tagName, 'MAIN', 'Second should be main');
});

console.log('');

// ============================================================================
// TEST SUITE 6: State Binding Integration
// ============================================================================

console.log('TEST SUITE 6: State Binding Integration\n');

test('Create VNode with state binding metadata', () => {
  const vnode = new VNode({
    tag: 'span',
    statefulWidgetId: 'counter-widget',
    stateProperty: 'count',
    isStateBinding: true,
    children: ['0']
  });
  
  assert(vnode.isStateBinding === true, 'Should be marked as state binding');
  assertEquals(vnode.statefulWidgetId, 'counter-widget', 'Should store widget ID');
  assertEquals(vnode.stateProperty, 'count', 'Should store property name');
});

test('VNode supports update callback', () => {
  let updateCalled = false;
  const vnode = new VNode({
    tag: 'span',
    updateFn: (newValue) => { updateCalled = true; }
  });
  
  if (vnode.updateFn) {
    vnode.updateFn(42);
  }
  assert(updateCalled === true, 'Should support update callback');
});

test('Simulate state update on VNode', () => {
  const vnode = new VNode({
    tag: 'span',
    children: ['0'],
    statefulWidgetId: 'counter',
    stateProperty: 'count',
    isStateBinding: true
  });
  
  const element = vnode.toDOM();
  assertEquals(element.textContent, '0', 'Initial value should be 0');
  
  // Simulate state update
  element.textContent = '5';
  assertEquals(element.textContent, '5', 'Should update to 5');
});

console.log('');

// ============================================================================
// TEST SUITE 7: Complex Scenarios
// ============================================================================

console.log('TEST SUITE 7: Complex Scenarios\n');

test('Render complete Flutter Counter app structure', () => {
  const counterApp = new VNode({
    tag: 'div',
    props: { className: 'fjs-scaffold' },
    children: [
      // AppBar
      new VNode({
        tag: 'header',
        props: { className: 'fjs-app-bar' },
        style: { backgroundColor: '#6750a4', color: '#ffffff', padding: '16px' },
        children: ['Counter App']
      }),
      // Body
      new VNode({
        tag: 'main',
        props: { className: 'fjs-body' },
        style: { flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' },
        children: [
          new VNode({
            tag: 'div',
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
            children: [
              new VNode({
                tag: 'span',
                style: { fontSize: '24px' },
                children: ['You have pushed the button this many times:']
              }),
              new VNode({
                tag: 'span',
                style: { fontSize: '48px', fontWeight: 'bold' },
                statefulWidgetId: 'counter',
                stateProperty: 'count',
                isStateBinding: true,
                children: ['0']
              })
            ]
          })
        ]
      }),
      // FAB
      new VNode({
        tag: 'button',
        props: { className: 'fjs-fab' },
        style: {
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#6750a4',
          color: '#ffffff',
          border: 'none'
        },
        events: { click: () => console.log('Increment') },
        children: ['+']
      })
    ],
    metadata: { widgetType: 'Scaffold' }
  });
  
  const element = counterApp.toDOM();
  assert(element !== null, 'Should create element');
  assert(element.childNodes.length === 3, 'Should have header, body, and FAB');
  
  const html = counterApp.toHTML();
  assertIncludes(html, 'Counter App', 'Should include title');
  assertIncludes(html, 'You have pushed', 'Should include text');
});

test('Render list with keys', () => {
  const items = ['Apple', 'Banana', 'Cherry'];
  const listVNode = new VNode({
    tag: 'ul',
    children: items.map((item, i) => new VNode({
      tag: 'li',
      key: `item-${i}`,
      children: [item]
    }))
  });
  
  const element = listVNode.toDOM();
  assertEquals(element.childNodes.length, 3, 'Should have 3 items');
  assertEquals(element.childNodes[0].textContent, 'Apple', 'First item correct');
  assertEquals(element.childNodes[1].textContent, 'Banana', 'Second item correct');
  assertEquals(element.childNodes[2].textContent, 'Cherry', 'Third item correct');
  
  // Check keys in HTML
  const html = listVNode.toHTML();
  assertIncludes(html, 'data-key="item-0"', 'Should include first key');
  assertIncludes(html, 'data-key="item-1"', 'Should include second key');
  assertIncludes(html, 'data-key="item-2"', 'Should include third key');
});

test('Clone VNode', () => {
  const original = new VNode({
    tag: 'div',
    props: { className: 'test' },
    style: { color: 'red' },
    children: [
      new VNode({ tag: 'span', children: ['Child'] })
    ],
    key: 'original'
  });
  
  const cloned = original.clone();
  
  assertEquals(cloned.tag, original.tag, 'Should clone tag');
  assertEquals(cloned.props.className, original.props.className, 'Should clone props');
  assertEquals(cloned.style.color, original.style.color, 'Should clone styles');
  assertEquals(cloned.children.length, original.children.length, 'Should clone children');
  assertEquals(cloned.key, original.key, 'Should clone key');
  
  // Verify deep clone (not same reference)
  assert(cloned !== original, 'Should be different instance');
  assert(cloned.props !== original.props, 'Props should be different object');
});

test('toString debug representation', () => {
  const vnode = new VNode({
    tag: 'button',
    key: 'submit-btn',
    children: ['Submit']
  });
  
  const str = vnode.toString();
  assertIncludes(str, 'button', 'Should include tag');
  assertIncludes(str, 'submit-btn', 'Should include key');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Edge Cases & Error Handling
// ============================================================================

console.log('TEST SUITE 8: Edge Cases & Error Handling\n');

test('Handle null children', () => {
  const vnode = new VNode({
    tag: 'div',
    children: [null, undefined, '', 'Valid']
  });
  
  const element = vnode.toDOM();
  // Should handle gracefully
  assert(element !== null, 'Should create element');
});

// test('Handle empty style object', () => {
//   const vnode = new VNode({
//     tag: 'div',
//     style: {}
//   });
  
//   const html = vnode.