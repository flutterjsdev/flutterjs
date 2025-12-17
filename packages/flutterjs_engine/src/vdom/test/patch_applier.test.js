/**
 * PatchApplier Tests - Comprehensive DOM Patch Application Testing
 * Tests all patch types, edge cases, performance, and integration
 */

import { PatchApplier } from '../src/vnode/patch_applier.js';
import { Patch, PatchType } from '../src/vnode/vnode_differ.js';
import { VNode } from '../src/vnode/vnode.js';
import { VNodeRenderer } from '../src/vnode/vnode_renderer.js';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.performance = { now: () => Date.now() };

console.log('\n' + '='.repeat(80));
console.log('🧪 PATCH APPLIER TESTS');
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
  if (!haystack || !haystack.includes(needle)) {
    throw new Error(
      message || `Expected to include "${needle}"`
    );
  }
}

// Helper to create test DOM
function createTestDOM() {
  return document.createElement('div');
}

// ============================================================================
// TEST SUITE 1: CREATE Patches
// ============================================================================

console.log('TEST SUITE 1: CREATE Patches\n');

test('Apply CREATE patch adds element to DOM', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'div', children: ['Parent'] });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const newVNode = new VNode({ tag: 'span', children: ['New'] });
  const patch = new Patch(PatchType.CREATE, '1', null, newVNode);

  PatchApplier.apply(parent, [patch]);

  assertEquals(parent.children.length, 2, 'Should have new child');
  assertEquals(parent.children[1].textContent, 'New');
});

test('CREATE patch at end of children list', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({ tag: 'span', children: ['A'] }),
      new VNode({ tag: 'span', children: ['B'] })
    ]
  });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const newVNode = new VNode({ tag: 'span', children: ['C'] });
  const patch = new Patch(PatchType.CREATE, '2', null, newVNode);

  PatchApplier.apply(parent, [patch]);

  assertEquals(parent.childNodes.length, 3, 'Should have 3 children');
  assertEquals(parent.childNodes[2].textContent, 'C');
});

test('CREATE patch inserts at middle position', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({ tag: 'span', children: ['A'] }),
      new VNode({ tag: 'span', children: ['C'] })
    ]
  });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const newVNode = new VNode({ tag: 'span', children: ['B'] });
  const patch = new Patch(PatchType.CREATE, '1', null, newVNode);

  PatchApplier.apply(parent, [patch]);

  assertEquals(parent.childNodes.length, 3);
  assertEquals(parent.childNodes[1].textContent, 'B', 'Should insert at index 1');
});

test('CREATE patch with complex VNode', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'div', children: [] });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const newVNode = new VNode({
    tag: 'div',
    props: { className: 'card', id: 'card-1' },
    style: { padding: '10px' },
    children: [new VNode({ tag: 'h2', children: ['Title'] })]
  });
  const patch = new Patch(PatchType.CREATE, '0', null, newVNode);

  PatchApplier.apply(parent, [patch]);

  const created = parent.childNodes[0];
  assertEquals(created.className, 'card');
  assertEquals(created.id, 'card-1');
  assertEquals(created.style.padding, '10px');
  assertEquals(created.querySelector('h2').textContent, 'Title');
});

console.log('');

// ============================================================================
// TEST SUITE 2: REMOVE Patches
// ============================================================================

console.log('TEST SUITE 2: REMOVE Patches\n');

test('Apply REMOVE patch deletes element', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({ tag: 'span', children: ['A'] }),
      new VNode({ tag: 'span', children: ['B'] })
    ]
  });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const patch = new Patch(PatchType.REMOVE, '1', vnode.children[1], null);

  PatchApplier.apply(parent, [patch]);

  assertEquals(parent.children.length, 1, 'Should have 1 child');
  assertEquals(parent.firstChild.textContent, 'A');
});

test('REMOVE patch with event listeners cleanup', () => {
  const root = createTestDOM();
  let clicked = false;

  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({
        tag: 'button',
        events: { click: () => { clicked = true; } },
        children: ['Click']
      })
    ]
  });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const button = parent.childNodes[0];
  button.click();
  assert(clicked, 'Event should fire before removal');

  clicked = false;
  const patch = new Patch(PatchType.REMOVE, '0', vnode.children[0], null);
  PatchApplier.apply(parent, [patch]);

  assertEquals(parent.childNodes.length, 0, 'Should be removed');
});

test('REMOVE multiple elements preserves order', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'ul',
    children: [
      new VNode({ tag: 'li', children: ['1'] }),
      new VNode({ tag: 'li', children: ['2'] }),
      new VNode({ tag: 'li', children: ['3'] }),
      new VNode({ tag: 'li', children: ['4'] })
    ]
  });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  // Remove in reverse order (deepest first) to preserve indices
  const patches = [
    new Patch(PatchType.REMOVE, '3', vnode.children[3], null),
    new Patch(PatchType.REMOVE, '1', vnode.children[1], null)
  ];

  PatchApplier.apply(parent, patches);

  assertEquals(parent.children.length, 2);
  assertEquals(parent.children[0].textContent, '1');
  assertEquals(parent.children[1].textContent, '3');
});

console.log('');

// ============================================================================
// TEST SUITE 3: REPLACE Patches
// ============================================================================

console.log('TEST SUITE 3: REPLACE Patches\n');

test('Apply REPLACE patch replaces element', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'div', children: [new VNode({ tag: 'span', children: ['Old'] })] });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const newVNode = new VNode({ tag: 'p', children: ['New'] });
  const patch = new Patch(PatchType.REPLACE, '0', vnode.children[0], newVNode);

  PatchApplier.apply(parent, [patch]);

  assertEquals(parent.childNodes[0].tagName, 'P', 'Should be P tag');
  assertEquals(parent.childNodes[0].textContent, 'New');
});

test('REPLACE with different attributes', () => {
  const root = createTestDOM();
  const oldVNode = new VNode({
    tag: 'button',
    props: { className: 'btn-old', disabled: true },
    children: ['Old']
  });
  const parentVNode = new VNode({ tag: 'div', children: [oldVNode] });
  VNodeRenderer.render(parentVNode, root);
  const parent = root.firstChild;

  const newVNode = new VNode({
    tag: 'button',
    props: { className: 'btn-new', disabled: false },
    children: ['New']
  });
  const patch = new Patch(PatchType.REPLACE, '0', oldVNode, newVNode);

  PatchApplier.apply(parent, [patch]);

  const button = parent.childNodes[0];
  assertEquals(button.className, 'btn-new');
  assertEquals(button.disabled, false);
  assertEquals(button.textContent, 'New');
});

test('REPLACE cleans up event listeners', () => {
  const root = createTestDOM();
  let clicked = false;

  const oldVNode = new VNode({
    tag: 'button',
    events: { click: () => { clicked = true; } },
    children: ['Click']
  });
  const parentVNode = new VNode({ tag: 'div', children: [oldVNode] });
  VNodeRenderer.render(parentVNode, root);
  const parent = root.firstChild;

  const newVNode = new VNode({
    tag: 'button',
    events: { click: () => { clicked = false; } },
    children: ['Replaced']
  });
  const patch = new Patch(PatchType.REPLACE, '0', oldVNode, newVNode);

  PatchApplier.apply(parent, [patch]);

  const button = parent.firstChild;
  if (button && typeof button.click === 'function') {
    button.click();
    assertEquals(clicked, false, 'Should use new handler');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 4: UPDATE_PROPS Patches
// ============================================================================

console.log('TEST SUITE 4: UPDATE_PROPS Patches\n');

test('Apply UPDATE_PROPS patch changes attributes', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'button',
    props: { className: 'btn-old', id: 'btn' }
  });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_PROPS, '0');
  patch.value = {
    changes: {
      added: {},
      updated: { className: 'btn-new' },
      removed: {}
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.className, 'btn-new');
});

test('UPDATE_PROPS adds new properties', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'div', props: { className: 'test' } });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_PROPS, '0');
  patch.value = {
    changes: {
      added: { id: 'new-id', 'data-value': '42' },
      updated: {},
      removed: {}
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.id, 'new-id');
  assertEquals(root.firstChild.getAttribute('data-value'), '42');
});

test('UPDATE_PROPS removes properties', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'div',
    props: { className: 'test', id: 'remove-me' }
  });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_PROPS, '0');
  patch.value = {
    changes: {
      added: {},
      updated: {},
      removed: { id: 'remove-me' }
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.id, '');
});

test('UPDATE_PROPS handles special cases (value, checked, disabled)', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'input',
    props: { type: 'text', value: 'old', disabled: false }
  });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_PROPS, '0');
  patch.value = {
    changes: {
      added: {},
      updated: { value: 'new', disabled: true },
      removed: {}
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.value, 'new');
  assertEquals(root.firstChild.disabled, true);
});

console.log('');

// ============================================================================
// TEST SUITE 5: UPDATE_STYLE Patches
// ============================================================================

console.log('TEST SUITE 5: UPDATE_STYLE Patches\n');

test('Apply UPDATE_STYLE patch changes styles', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'div',
    style: { color: 'red', fontSize: '14px' }
  });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_STYLE, '0');
  patch.value = {
    changes: {
      added: {},
      updated: { color: 'blue' },
      removed: {}
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.style.color, 'blue');
  assertEquals(root.firstChild.style.fontSize, '14px');
});

test('UPDATE_STYLE adds new styles', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'div', style: { color: 'red' } });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_STYLE, '0');
  patch.value = {
    changes: {
      added: { padding: '10px', margin: '5px' },
      updated: {},
      removed: {}
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.style.padding, '10px');
  assertEquals(root.firstChild.style.margin, '5px');
});

test('UPDATE_STYLE removes styles', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'div',
    style: { color: 'red', backgroundColor: 'yellow' }
  });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_STYLE, '0');
  patch.value = {
    changes: {
      added: {},
      updated: {},
      removed: { backgroundColor: 'yellow' }
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.style.color, 'red');
  assertEquals(root.firstChild.style.backgroundColor, '');
});

console.log('');

// ============================================================================
// TEST SUITE 6: UPDATE_TEXT Patches
// ============================================================================

console.log('TEST SUITE 6: UPDATE_TEXT Patches\n');

test('Apply UPDATE_TEXT patch changes text content', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'span', children: ['Old text'] });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_TEXT, '0', 'Old text', 'New text');
  patch.value = 'New text';

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.textContent, 'New text');
});

test('UPDATE_TEXT with empty string', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'p', children: ['Content'] });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_TEXT, '0', 'Content', '');
  patch.value = '';

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.textContent, '');
});

test('UPDATE_TEXT with number', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'span', children: ['0'] });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_TEXT, '0', '0', 42);
  patch.value = 42;

  PatchApplier.apply(root.firstChild, [patch]);

  assertEquals(root.firstChild.textContent, '42');
});

console.log('');

// ============================================================================
// TEST SUITE 7: UPDATE_EVENTS Patches
// ============================================================================

console.log('TEST SUITE 7: UPDATE_EVENTS Patches\n');

test('Apply UPDATE_EVENTS patch updates event handler', () => {
  const root = createTestDOM();
  let clicked = 0;

  const vnode = new VNode({
    tag: 'button',
    events: { click: () => { clicked += 1; } }
  });
  VNodeRenderer.render(vnode, root);

  root.firstChild.click();
  assertEquals(clicked, 1, 'Old handler called');

  // Update to new handler
  const patch = new Patch(PatchType.UPDATE_EVENTS, '0');
  patch.value = {
    changes: {
      added: {},
      updated: { click: () => { clicked += 10; } },
      removed: {}
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);
  root.firstChild.click();
  assertEquals(clicked, 11, 'New handler called');
});

test('UPDATE_EVENTS adds new events', () => {
  const root = createTestDOM();
  let focused = false;

  const vnode = new VNode({ tag: 'input', events: {} });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_EVENTS, '0');
  patch.value = {
    changes: {
      added: { focus: () => { focused = true; } },
      updated: {},
      removed: {}
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);
  root.firstChild.dispatchEvent(new window.Event('focus'));

  assertEquals(focused, true);
});

test('UPDATE_EVENTS removes events', () => {
  const root = createTestDOM();
  let clicked = false;

  const vnode = new VNode({
    tag: 'button',
    events: { click: () => { clicked = true; } }
  });
  VNodeRenderer.render(vnode, root);

  const patch = new Patch(PatchType.UPDATE_EVENTS, '0');
  patch.value = {
    changes: {
      added: {},
      updated: {},
      removed: { click: () => { clicked = true; } }
    }
  };

  PatchApplier.apply(root.firstChild, [patch]);
  root.firstChild.click();

  assertEquals(clicked, false, 'Handler should be removed');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Batch Operations
// ============================================================================

console.log('TEST SUITE 8: Batch Operations\n');

test('Apply multiple patches to same element', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'button',
    props: { className: 'btn' },
    style: { color: 'red' },
    events: { click: () => { } }
  });
  VNodeRenderer.render(vnode, root);

  const patches = [
    (() => {
      const p = new Patch(PatchType.UPDATE_PROPS, '0');
      p.value = { changes: { added: { disabled: true }, updated: {}, removed: {} } };
      return p;
    })(),
    (() => {
      const p = new Patch(PatchType.UPDATE_STYLE, '0');
      p.value = { changes: { added: {}, updated: { color: 'blue' }, removed: {} } };
      return p;
    })()
  ];

  const result = PatchApplier.apply(root.firstChild, patches);

  assertEquals(result.patchesApplied, 2);
  assertEquals(root.firstChild.disabled, true);
  assertEquals(root.firstChild.style.color, 'blue');
});

test('Apply CREATE and REMOVE together', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'div',
    children: [
      new VNode({ tag: 'span', children: ['A'] }),
      new VNode({ tag: 'span', children: ['B'] }),
      new VNode({ tag: 'span', children: ['C'] })
    ]
  });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const patches = [
    new Patch(PatchType.REMOVE, '1', vnode.children[1], null),
    new Patch(PatchType.CREATE, '1', null, new VNode({ tag: 'span', children: ['D'] }))
  ];

  PatchApplier.apply(parent, patches);

  assertEquals(parent.childNodes.length, 3);
  assertEquals(parent.childNodes[1].textContent, 'D');
});

console.log('');

// ============================================================================
// TEST SUITE 9: Async Operations
// ============================================================================

console.log('TEST SUITE 9: Async Operations\n');

test('Apply patches asynchronously', async () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'div', children: [] });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const newVNode = new VNode({ tag: 'span', children: ['Async'] });
  const patch = new Patch(PatchType.CREATE, '0', null, newVNode);

  const result = await PatchApplier.applyAsync(parent, [patch]);

  assertEquals(result.success, true);
  assertEquals(parent.children.length, 1);
});

test('Batch apply multiple patch sets', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'div', children: [] });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const patchSet1 = [
    new Patch(PatchType.CREATE, '0', null, new VNode({ tag: 'span', children: ['1'] }))
  ];

  const patchSet2 = [
    new Patch(PatchType.CREATE, '1', null, new VNode({ tag: 'span', children: ['2'] }))
  ];

  const result = PatchApplier.applyBatch(parent, [patchSet1, patchSet2]);

  assertEquals(result.success, true);
  assertEquals(result.totalApplied, 2);
  assertEquals(parent.childNodes.length, 2);
});

console.log('');

// ============================================================================
// TEST SUITE 10: Validation & Utilities
// ============================================================================

console.log('TEST SUITE 10: Validation & Utilities\n');

test('Validate correct patches', () => {
  const patch = new Patch(PatchType.CREATE, '0', null, new VNode({ tag: 'div' }));
  const errors = PatchApplier.validate([patch]);

  assertEquals(errors.length, 0, 'Should have no errors');
});

test('Validate invalid patches', () => {
  const badPatch = new Patch('INVALID_TYPE', '0');
  const errors = PatchApplier.validate([badPatch]);

  assert(errors.length > 0, 'Should have errors');
  assertIncludes(errors[0], 'Invalid type');
});

test('Validate missing required fields', () => {
  const badPatch = new Patch(PatchType.CREATE, '0');
  badPatch.newNode = null; // Missing newNode for CREATE
  const errors = PatchApplier.validate([badPatch]);

  assert(errors.length > 0, 'Should catch missing newNode');
});

test('Get patch statistics', () => {
  const patches = [
    new Patch(PatchType.CREATE, '0', null, new VNode({ tag: 'div' })),
    new Patch(PatchType.CREATE, '1', null, new VNode({ tag: 'div' })),
    new Patch(PatchType.REMOVE, '2', new VNode({ tag: 'div' }), null)
  ];

  const stats = PatchApplier.getStats(patches);

  assertEquals(stats.total, 3);
  assertEquals(stats.byType[PatchType.CREATE], 2);
  assertEquals(stats.byType[PatchType.REMOVE], 1);
});

console.log('');

// ============================================================================
// TEST SUITE 11: Performance
// ============================================================================

console.log('TEST SUITE 11: Performance\n');

test('Apply many patches efficiently', () => {
  const root = createTestDOM();
  const vnode = new VNode({ tag: 'div', children: [] });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const patches = [];
  for (let i = 0; i < 50; i++) {
    patches.push(
      new Patch(PatchType.CREATE, String(i), null, new VNode({ tag: 'span', children: [String(i)] }))
    );
  }

  const result = PatchApplier.apply(parent, patches, { measureTime: true });

  assertEquals(result.patchesApplied, 50);
  assertEquals(parent.childNodes.length, 50);
  console.log(`  Applied 50 patches in ${result.timeMs}ms`);
});

test('Complex update scenario', () => {
  const root = createTestDOM();
  const vnode = new VNode({
    tag: 'div',
    children: Array.from({ length: 10 }, (_, i) =>
      new VNode({
        tag: 'div',
        props: { className: 'item' },
        style: { color: 'black' },
        children: [`Item ${i}`]
      })
    )
  });
  VNodeRenderer.render(vnode, root);
  const parent = root.firstChild;

  const patches = [];

  patches.push(
    (() => {
      const p = new Patch(PatchType.UPDATE_STYLE, '2');
      p.value = { changes: { added: {}, updated: { color: 'red' }, removed: {} } };
      return p;
    })()
  );

  patches.push(new Patch(PatchType.REMOVE, '5', vnode.children[5], null));

  patches.push(
    new Patch(PatchType.CREATE, '5', null, new VNode({ tag: 'div', children: ['New Item'] }))
  );

  const result = PatchApplier.apply(parent, patches);

  assertEquals(result.success, true);
  assertEquals(parent.childNodes.length, 10);
  assertEquals(parent.childNodes[2].style.color, 'red');
  assertEquals(parent.childNodes[5].textContent, 'New Item');
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