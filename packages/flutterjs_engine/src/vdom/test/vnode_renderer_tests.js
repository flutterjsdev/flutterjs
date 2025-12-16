/**
 * VNodeRenderer Tests - Comprehensive CSR Testing
 * Tests DOM rendering, event handling, updates, and memory management
 */

import { VNodeRenderer } from '../src/vnode/vnode-renderer.js';
import { VNode } from '../src/vnode/vnode.js';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;

console.log('\n' + '='.repeat(80));
console.log('🧪 VNODE RENDERER TESTS');
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

// Helper to get fresh container
function getContainer() {
  const container = document.createElement('div');
  container.id = 'test-container';
  return container;
}

// ============================================================================
// TEST SUITE 1: Basic Rendering
// ============================================================================

console.log('TEST SUITE 1: Basic Rendering\n');

test('Render simple text VNode', () => {
  const container = getContainer();
  const vnode = 'Hello World';
  
  VNodeRenderer.render(vnode, container);
  
  assertEquals(container.textContent, 'Hello World', 'Should render text');
});

test('Render simple element VNode', () => {
  const container = getContainer();
  const vnode = new VNode({ tag: 'div', children: ['Content'] });
  
  VNodeRenderer.render(vnode, container);
  
  assertEquals(container.children.length, 1, 'Should have 1 child');
  assertEquals(container.children[0].tagName, 'DIV', 'Should be div');
  assertEquals(container.textContent, 'Content', 'Should have content');
});

test('Render VNode with props', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'button',
    props: { className: 'btn', id: 'my-btn', disabled: true },
    children: ['Click']
  });
  
  VNodeRenderer.render(vnode, container);
  
  const button = container.querySelector('button');
  assertEquals(button.className, 'btn', 'Should have className');
  assertEquals(button.id, 'my-btn', 'Should have id');
  assert(button.disabled === true, 'Should be disabled');
});

test('Render VNode with styles', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'div',
    style: { color: 'red', fontSize: '18px', padding: '10px' }
  });
  
  VNodeRenderer.render(vnode, container);
  
  const div = container.querySelector('div');
  assertEquals(div.style.color, 'red', 'Should have color');
  assertEquals(div.style.fontSize, '18px', 'Should have fontSize');
  assertEquals(div.style.padding, '10px', 'Should have padding');
});

test('Render nested VNodes', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({ tag: 'h1', children: ['Title'] }),
      new VNode({ tag: 'p', children: ['Paragraph'] })
    ]
  });
  
  VNodeRenderer.render(vnode, container);
  
  assertEquals(container.querySelector('h1').textContent, 'Title', 'Should have h1');
  assertEquals(container.querySelector('p').textContent, 'Paragraph', 'Should have p');
});

test('Render null/undefined returns empty text node', () => {
  const result1 = VNodeRenderer.createDOMNode(null);
  assertEquals(result1.nodeType, Node.TEXT_NODE, 'Should be text node');
  
  const result2 = VNodeRenderer.createDOMNode(undefined);
  assertEquals(result2.nodeType, Node.TEXT_NODE, 'Should be text node');
});

test('Render number as text', () => {
  const container = getContainer();
  VNodeRenderer.render(42, container);
  assertEquals(container.textContent, '42', 'Should render number as text');
});

test('Render boolean as empty text', () => {
  const container = getContainer();
  VNodeRenderer.render(true, container);
  assertEquals(container.textContent, '', 'Should render empty');
});

console.log('');

// ============================================================================
// TEST SUITE 2: Event Handling
// ============================================================================

console.log('TEST SUITE 2: Event Handling\n');

test('Attach click event', () => {
  const container = getContainer();
  let clicked = false;
  
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => { clicked = true; } },
    children: ['Click Me']
  });
  
  VNodeRenderer.render(vnode, container);
  
  const button = container.querySelector('button');
  button.click();
  
  assert(clicked === true, 'Should call click handler');
});

test('Normalize event names', () => {
  const container = getContainer();
  let inputValue = '';
  
  const vnode = new VNode({
    tag: 'input',
    events: { onInput: (e) => { inputValue = e.target.value; } }
  });
  
  VNodeRenderer.render(vnode, container);
  
  const input = container.querySelector('input');
  input.value = 'test';
  input.dispatchEvent(new window.Event('input'));
  
  assertEquals(inputValue, 'test', 'Should handle onInput event');
});

test('Handle multiple events', () => {
  const container = getContainer();
  let focused = false;
  let blurred = false;
  
  const vnode = new VNode({
    tag: 'input',
    events: {
      focus: () => { focused = true; },
      blur: () => { blurred = true; }
    }
  });
  
  VNodeRenderer.render(vnode, container);
  
  const input = container.querySelector('input');
  input.dispatchEvent(new window.Event('focus'));
  input.dispatchEvent(new window.Event('blur'));
  
  assert(focused === true, 'Should handle focus');
  assert(blurred === true, 'Should handle blur');
});

test('Store event listeners on element', () => {
  const container = getContainer();
  const handler = () => {};
  
  const vnode = new VNode({
    tag: 'button',
    events: { click: handler }
  });
  
  VNodeRenderer.render(vnode, container);
  
  const button = container.querySelector('button');
  assert(button._eventListeners !== undefined, 'Should store listeners');
  assert(button._eventListeners.click === handler, 'Should store handler');
});

console.log('');

// ============================================================================
// TEST SUITE 3: Props Application
// ============================================================================

console.log('TEST SUITE 3: Props Application\n');

test('Apply className prop', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'div',
    props: { className: 'test-class' }
  });
  
  VNodeRenderer.render(vnode, container);
  assertEquals(container.querySelector('div').className, 'test-class');
});

test('Apply value to input', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'input',
    props: { type: 'text', value: 'initial' }
  });
  
  VNodeRenderer.render(vnode, container);
  assertEquals(container.querySelector('input').value, 'initial');
});

test('Apply checked to checkbox', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'input',
    props: { type: 'checkbox', checked: true }
  });
  
  VNodeRenderer.render(vnode, container);
  assert(container.querySelector('input').checked === true);
});

test('Apply data attributes', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'div',
    props: { 'data-id': '123', 'data-type': 'test' }
  });
  
  VNodeRenderer.render(vnode, container);
  const div = container.querySelector('div');
  assertEquals(div.getAttribute('data-id'), '123');
  assertEquals(div.getAttribute('data-type'), 'test');
});

test('Apply aria attributes', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'button',
    props: { 'aria-label': 'Close', 'aria-hidden': 'false' }
  });
  
  VNodeRenderer.render(vnode, container);
  const button = container.querySelector('button');
  assertEquals(button.getAttribute('aria-label'), 'Close');
});

test('Handle boolean attributes', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'input',
    props: { disabled: true, readonly: false }
  });
  
  VNodeRenderer.render(vnode, container);
  const input = container.querySelector('input');
  assert(input.disabled === true, 'Should be disabled');
  assert(input.hasAttribute('readonly') === false, 'Should not have readonly');
});

console.log('');

// ============================================================================
// TEST SUITE 4: Style Application
// ============================================================================

console.log('TEST SUITE 4: Style Application\n');

test('Apply multiple styles', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'div',
    style: {
      color: 'blue',
      backgroundColor: 'yellow',
      padding: '20px',
      margin: '10px'
    }
  });
  
  VNodeRenderer.render(vnode, container);
  const div = container.querySelector('div');
  
  assertEquals(div.style.color, 'blue');
  assertEquals(div.style.backgroundColor, 'yellow');
  assertEquals(div.style.padding, '20px');
  assertEquals(div.style.margin, '10px');
});

test('Apply CSS custom properties', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'div',
    style: { '--custom-color': '#ff0000' }
  });
  
  VNodeRenderer.render(vnode, container);
  const div = container.querySelector('div');
  assertEquals(div.style.getPropertyValue('--custom-color'), '#ff0000');
});

test('Ignore null/undefined styles', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'div',
    style: { color: 'red', backgroundColor: null, padding: undefined }
  });
  
  VNodeRenderer.render(vnode, container);
  const div = container.querySelector('div');
  assertEquals(div.style.color, 'red');
  assertEquals(div.style.backgroundColor, '');
});

console.log('');

// ============================================================================
// TEST SUITE 5: Ref Callbacks
// ============================================================================

console.log('TEST SUITE 5: Ref Callbacks\n');

test('Call ref callback on render', () => {
  const container = getContainer();
  let refElement = null;
  
  const vnode = new VNode({
    tag: 'div',
    ref: (el) => { refElement = el; }
  });
  
  VNodeRenderer.render(vnode, container);
  
  assert(refElement !== null, 'Should call ref');
  assertEquals(refElement.tagName, 'DIV', 'Should be div element');
});

test('Ref callback receives correct element', () => {
  const container = getContainer();
  let refElement = null;
  
  const vnode = new VNode({
    tag: 'button',
    props: { id: 'test-btn' },
    ref: (el) => { refElement = el; }
  });
  
  VNodeRenderer.render(vnode, container);
  
  assertEquals(refElement.id, 'test-btn', 'Should be correct element');
});

console.log('');

// ============================================================================
// TEST SUITE 6: VNode References
// ============================================================================

console.log('TEST SUITE 6: VNode References\n');

test('Store VNode reference on element', () => {
  const container = getContainer();
  const vnode = new VNode({ tag: 'div' });
  
  VNodeRenderer.render(vnode, container);
  
  const element = container.querySelector('div');
  assert(element._vnode === vnode, 'Should store vnode on element');
});

test('Store element reference on VNode', () => {
  const container = getContainer();
  const vnode = new VNode({ tag: 'div' });
  
  VNodeRenderer.render(vnode, container);
  
  const element = container.querySelector('div');
  assert(vnode._element === element, 'Should store element on vnode');
});

console.log('');

// ============================================================================
// TEST SUITE 7: Cleanup & Memory Management
// ============================================================================

console.log('TEST SUITE 7: Cleanup & Memory Management\n');

test('Clear element removes children', () => {
  const container = getContainer();
  container.innerHTML = '<div>Child 1</div><div>Child 2</div>';
  
  VNodeRenderer.clearElement(container);
  
  assertEquals(container.children.length, 0, 'Should remove all children');
});

test('Cleanup removes event listeners', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => {} }
  });
  
  VNodeRenderer.render(vnode, container);
  const button = container.querySelector('button');
  
  assert(button._eventListeners !== undefined, 'Should have listeners');
  
  VNodeRenderer.cleanupEventListeners(button);
  
  assert(button._eventListeners === null, 'Should remove listeners');
});

test('Cleanup removes VNode references', () => {
  const container = getContainer();
  const vnode = new VNode({ tag: 'div' });
  
  VNodeRenderer.render(vnode, container);
  const element = container.querySelector('div');
  
  VNodeRenderer.cleanupEventListeners(element);
  
  assert(element._vnode === null, 'Should remove vnode ref');
  assert(vnode._element === null, 'Should remove element ref');
});

test('Remove element from DOM', () => {
  const container = getContainer();
  const vnode = new VNode({ tag: 'div' });
  
  VNodeRenderer.render(vnode, container);
  const element = container.querySelector('div');
  
  VNodeRenderer.removeElement(element);
  
  assertEquals(container.children.length, 0, 'Should remove from DOM');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Update Operations
// ============================================================================

console.log('TEST SUITE 8: Update Operations\n');

test('Update props', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'div',
    props: { className: 'old', id: 'test' }
  });
  
  VNodeRenderer.render(vnode, container);
  const element = container.querySelector('div');
  
  VNodeRenderer.updateProps(element, 
    { className: 'old', id: 'test' },
    { className: 'new', id: 'test', 'data-new': 'value' }
  );
  
  assertEquals(element.className, 'new', 'Should update className');
  assertEquals(element.getAttribute('data-new'), 'value', 'Should add new prop');
});

test('Update styles', () => {
  const container = getContainer();
  const vnode = new VNode({
    tag: 'div',
    style: { color: 'red', fontSize: '14px' }
  });
  
  VNodeRenderer.render(vnode, container);
  const element = container.querySelector('div');
  
  VNodeRenderer.updateStyles(element,
    { color: 'red', fontSize: '14px' },
    { color: 'blue', padding: '10px' }
  );
  
  assertEquals(element.style.color, 'blue', 'Should update color');
  assertEquals(element.style.fontSize, '', 'Should remove old fontSize');
  assertEquals(element.style.padding, '10px', 'Should add padding');
});

test('Update events', () => {
  const container = getContainer();
  let count = 0;
  
  const vnode = new VNode({
    tag: 'button',
    events: { click: () => { count++; } }
  });
  
  VNodeRenderer.render(vnode, container);
  const button = container.querySelector('button');
  
  button.click();
  assertEquals(count, 1, 'Should call old handler');
  
  VNodeRenderer.updateEvents(button,
    { click: () => { count++; } },
    { click: () => { count += 10; } }
  );
  
  button.click();
  assertEquals(count, 11, 'Should call new handler');
});

test('Replace element', () => {
  const container = getContainer();
  const oldVNode = new VNode({ tag: 'div', children: ['Old'] });
  
  VNodeRenderer.render(oldVNode, container);
  const oldElement = container.querySelector('div');
  
  const newVNode = new VNode({ tag: 'span', children: ['New'] });
  VNodeRenderer.replaceElement(oldElement, newVNode);
  
  assert(container.querySelector('div') === null, 'Should remove old');
  assertEquals(container.querySelector('span').textContent, 'New', 'Should add new');
});

console.log('');

// ============================================================================
// TEST SUITE 9: Array/Fragment Rendering
// ============================================================================

console.log('TEST SUITE 9: Array/Fragment Rendering\n');

test('Render array of VNodes', () => {
  const container = getContainer();
  const vnodes = [
    new VNode({ tag: 'div', children: ['One'] }),
    new VNode({ tag: 'div', children: ['Two'] }),
    new VNode({ tag: 'div', children: ['Three'] })
  ];
  
  VNodeRenderer.render(vnodes, container);
  
  assertEquals(container.children.length, 3, 'Should render all');
  assertEquals(container.children[0].textContent, 'One');
  assertEquals(container.children[1].textContent, 'Two');
  assertEquals(container.children[2].textContent, 'Three');
});

test('Render fragment with mixed types', () => {
  const container = getContainer();
  const vnodes = [
    'Text',
    new VNode({ tag: 'span', children: ['Span'] }),
    42
  ];
  
  VNodeRenderer.render(vnodes, container);
  
  assert(container.childNodes.length >= 3, 'Should render all types');
});

console.log('');

// ============================================================================
// TEST SUITE 10: Batch Rendering
// ============================================================================

console.log('TEST SUITE 10: Batch Rendering\n');

test('Batch render multiple VNodes', () => {
  const container = getContainer();
  const vnodes = [];
  
  for (let i = 0; i < 100; i++) {
    vnodes.push(new VNode({
      tag: 'div',
      children: [`Item ${i}`]
    }));
  }
  
  VNodeRenderer.batchRender(vnodes, container);
  
  assertEquals(container.children.length, 100, 'Should render all');
  assertEquals(container.children[0].textContent, 'Item 0');
  assertEquals(container.children[99].textContent, 'Item 99');
});

console.log('');

// ============================================================================
// TEST SUITE 11: Element Path Operations
// ============================================================================

console.log('TEST SUITE 11: Element Path Operations\n');

test('Insert at specific index', () => {
  const container = getContainer();
  container.innerHTML = '<div>1</div><div>3</div>';
  
  const vnode = new VNode({ tag: 'div', children: ['2'] });
  VNodeRenderer.insertAt(container, vnode, 1);
  
  assertEquals(container.children.length, 3, 'Should have 3 children');
  assertEquals(container.children[1].textContent, '2', 'Should insert at index 1');
});

test('Insert at end when index too large', () => {
  const container = getContainer();
  container.innerHTML = '<div>1</div>';
  
  const vnode = new VNode({ tag: 'div', children: ['2'] });
  VNodeRenderer.insertAt(container, vnode, 100);
  
  assertEquals(container.children.length, 2, 'Should append');
  assertEquals(container.children[1].textContent, '2', 'Should be at end');
});

console.log('');

// ============================================================================
// TEST SUITE 12: Special Cases
// ============================================================================

console.log('TEST SUITE 12: Special Cases\n');

test('Handle VNode without tag', () => {
  const container = getContainer();
  const vnode = { props: {}, style: {} }; // Invalid VNode
  
  VNodeRenderer.render(vnode, container);
  
  // Should render empty text node instead of throwing
  assertEquals(container.textContent, '', 'Should handle gracefully');
});

test('Handle deeply nested structure', () => {
  const container = getContainer();
  
  let current = new VNode({ tag: 'div', children: ['Deep'] });
  for (let i = 0; i < 10; i++) {
    current = new VNode({ tag: 'div', children: [current] });
  }
  
  VNodeRenderer.render(current, container);
  
  assert(container.querySelector('div') !== null, 'Should render');
  assertIncludes(container.textContent, 'Deep', 'Should have deep content');
});

test('Handle empty children array', () => {
  const container = getContainer();
  const vnode = new VNode({ tag: 'div', children: [] });
  
  VNodeRenderer.render(vnode, container);
  
  const div = container.querySelector('div');
  assertEquals(div.children.length, 0, 'Should have no children');
});

test('Render without target throws error', () => {
  const vnode = new VNode({ tag: 'div' });
  
  try {
    VNodeRenderer.render(vnode, null);
    throw new Error('Should have thrown');
  } catch (error) {
    assertIncludes(error.message, 'Target element', 'Should mention target');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 13: Performance
// ============================================================================

console.log('TEST SUITE 13: Performance\n');

test('Render 1000 elements efficiently', () => {
  const container = getContainer();
  const start = Date.now();
  
  const vnodes = [];
  for (let i = 0; i < 1000; i++) {
    vnodes.push(new VNode({
      tag: 'div',
      props: { className: 'item' },
      children: [`Item ${i}`]
    }));
  }
  
  VNodeRenderer.batchRender(vnodes, container);
  
  const elapsed = Date.now() - start;
  assert(elapsed < 1000, `Should render quickly (${elapsed}ms)`);
  assertEquals(container.children.length, 1000, 'Should render all');
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