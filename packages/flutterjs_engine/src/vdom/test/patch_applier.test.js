/**
 * PatchApplier Tests - WITH DEBUGGING
 * Comprehensive logging to identify failures
 */

import { PatchApplier } from '../src/patch_applier.js';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

console.log('\n' + '='.repeat(80));
console.log('🧪 PATCH APPLIER TESTS WITH DEBUG LOGGING');
console.log('='.repeat(80) + '\n');

let passed = 0;
let failed = 0;

function logDOM(element, label) {
  console.log(`\n  [DOM] ${label}:`);
  console.log(`    Tag: ${element.tagName}`);
  console.log(`    Children: ${element.childNodes.length}`);
  if (element.childNodes.length > 0) {
    Array.from(element.childNodes).forEach((child, i) => {
      console.log(`      [${i}] ${child.nodeType === 3 ? 'TEXT' : child.tagName} ${child.textContent ? `"${child.textContent}"` : ''}`);
    });
  }
  console.log(`    className: ${element.className}`);
  console.log(`    id: ${element.id}`);
  if (element.style.color) console.log(`    style.color: ${element.style.color}`);
  if (element.style.padding) console.log(`    style.padding: ${element.style.padding}`);
  if (element.value) console.log(`    value: ${element.value}`);
}

function test(name, fn) {
  console.log(`\n▶ Testing: ${name}`);
  try {
    fn();
    console.log(`✓ PASSED`);
    passed++;
  } catch (error) {
    console.log(`✗ FAILED`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected "${expected}", got "${actual}"`);
  }
}

class VNode {
  constructor({ tag, props = {}, style = {}, children = [], events = {} }) {
    this.tag = tag;
    this.props = props;
    this.style = style;
    this.children = children;
    this.events = events;
  }
}

class Patch {
  constructor(type, index, oldNode = null, newNode = null) {
    this.type = type;
    this.index = index;
    this.oldNode = oldNode;
    this.newNode = newNode;
    this.value = null;
  }
}

// ============================================================================
// TEST SUITE: UPDATE_PROPS
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('TEST SUITE: UPDATE_PROPS');
console.log('='.repeat(80));

test('UPDATE_PROPS changes className', () => {
  const parent = document.createElement('div');
  
  const element = document.createElement('button');
  element.className = 'btn-old';
  parent.appendChild(element);

  logDOM(parent, 'BEFORE patch');
  console.log(`  Index to find: '0'`);
  console.log(`  Will find element: parent.childNodes[0] (the button)`);

  const patch = new Patch('UPDATE_PROPS', '0');
  patch.value = {
    changes: {
      added: {},
      updated: { className: 'btn-new' },
      removed: {}
    }
  };

  console.log(`  Patch:`, patch);
  
  const result = PatchApplier.apply(parent, [patch]);
  console.log(`  Apply result:`, result);

  logDOM(parent, 'AFTER patch');
  console.log(`  Expected className: 'btn-new'`);
  console.log(`  Actual className: '${parent.childNodes[0].className}'`);

  assertEquals(parent.childNodes[0].className, 'btn-new');
});

test('UPDATE_STYLE changes color', () => {
  const parent = document.createElement('div');
  
  const element = document.createElement('div');
  element.style.color = 'red';
  parent.appendChild(element);

  logDOM(parent, 'BEFORE patch');
  console.log(`  Index to find: '0'`);

  const patch = new Patch('UPDATE_STYLE', '0');
  patch.value = {
    changes: {
      added: {},
      updated: { color: 'blue' },
      removed: {}
    }
  };

  console.log(`  Patch:`, patch);

  const result = PatchApplier.apply(parent, [patch]);
  console.log(`  Apply result:`, result);

  logDOM(parent, 'AFTER patch');
  console.log(`  Expected style.color: 'blue'`);
  console.log(`  Actual style.color: '${parent.childNodes[0].style.color}'`);

  assertEquals(parent.childNodes[0].style.color, 'blue');
});

test('UPDATE_PROPS input value', () => {
  const parent = document.createElement('div');
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = 'old';
  parent.appendChild(input);

  logDOM(parent, 'BEFORE patch');

  const patch = new Patch('UPDATE_PROPS', '0');
  patch.value = {
    changes: {
      added: {},
      updated: { value: 'new' },
      removed: {}
    }
  };

  console.log(`  Patch:`, patch);

  const result = PatchApplier.apply(parent, [patch]);
  console.log(`  Apply result:`, result);

  logDOM(parent, 'AFTER patch');
  console.log(`  Expected value: 'new'`);
  console.log(`  Actual value: '${parent.childNodes[0].value}'`);

  assertEquals(parent.childNodes[0].value, 'new');
});

test('UPDATE_TEXT on element', () => {
  const parent = document.createElement('div');
  
  const element = document.createElement('span');
  element.textContent = 'Old text';
  parent.appendChild(element);

  logDOM(parent, 'BEFORE patch');

  const patch = new Patch('UPDATE_TEXT', '0');
  patch.value = 'New text';

  console.log(`  Patch:`, patch);

  const result = PatchApplier.apply(parent, [patch]);
  console.log(`  Apply result:`, result);

  logDOM(parent, 'AFTER patch');
  console.log(`  Expected textContent: 'New text'`);
  console.log(`  Actual textContent: '${parent.childNodes[0].textContent}'`);

  assertEquals(parent.childNodes[0].textContent, 'New text');
});

// ============================================================================
// TEST SUITE: REPLACE
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('TEST SUITE: REPLACE');
console.log('='.repeat(80));

test('REPLACE element with new one', () => {
  const parent = document.createElement('div');

  const oldChild = document.createElement('span');
  oldChild.textContent = 'Old';
  parent.appendChild(oldChild);

  logDOM(parent, 'BEFORE patch');
  console.log(`  Old element tag: ${oldChild.tagName}`);

  const newVNode = new VNode({ tag: 'p', children: ['New'] });
  const patch = new Patch('REPLACE', '0', null, newVNode);

  console.log(`  Patch:`, patch);
  console.log(`  newVNode:`, newVNode);

  const result = PatchApplier.apply(parent, [patch]);
  console.log(`  Apply result:`, result);

  logDOM(parent, 'AFTER patch');
  console.log(`  Expected tag: 'P'`);
  console.log(`  Actual tag: '${parent.childNodes[0].tagName}'`);
  console.log(`  Expected text: 'New'`);
  console.log(`  Actual text: '${parent.childNodes[0].textContent}'`);

  assertEquals(parent.childNodes[0].tagName, 'P');
  assertEquals(parent.childNodes[0].textContent, 'New');
});

// ============================================================================
// TEST SUITE: CREATE
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('TEST SUITE: CREATE');
console.log('='.repeat(80));

test('CREATE adds element to parent', () => {
  const parent = document.createElement('div');

  logDOM(parent, 'BEFORE patch (empty)');
  console.log(`  Parent has ${parent.childNodes.length} children`);

  const newVNode = new VNode({ tag: 'span', children: ['New'] });
  const patch = new Patch('CREATE', '0', null, newVNode);

  console.log(`  Patch:`, patch);
  console.log(`  newVNode:`, newVNode);

  const result = PatchApplier.apply(parent, [patch]);
  console.log(`  Apply result:`, result);

  logDOM(parent, 'AFTER patch');
  console.log(`  Expected children: 1`);
  console.log(`  Actual children: ${parent.childNodes.length}`);
  console.log(`  Expected text: 'New'`);
  console.log(`  Actual text: '${parent.childNodes[0]?.textContent || 'N/A'}'`);

  assertEquals(parent.childNodes.length, 1);
  assertEquals(parent.childNodes[0].textContent, 'New');
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log('='.repeat(80) + '\n');

if (failed === 0) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log(`❌ ${failed} test(s) failed.\n`);
  process.exit(1);
}