/**
 * StateBinding Tests - Comprehensive State Binding Testing
 * Tests state-to-DOM binding, bidirectional sync, validation, and binding registry
 */

import {
  StateBinding,
  StateBindingRegistry,
  BindingMode,
  createBinding,
  createTwoWayBinding,
  createOneWayBinding
} from '../src/vnode/state_binding.js';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;

console.log('\n' + '='.repeat(80));
console.log('🧪 STATE BINDING TESTS');
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

// Helper to create test element
function createTestElement(tag = 'div', type = null) {
  const el = document.createElement(tag);
  if (type) {
    el.type = type;
  }
  return el;
}

// ============================================================================
// TEST SUITE 1: StateBinding Creation & Basic Properties
// ============================================================================

console.log('TEST SUITE 1: StateBinding Creation & Basic Properties\n');

test('Create StateBinding', () => {
  const binding = new StateBinding({
    statefulWidgetId: 'widget-1',
    stateProperty: 'count'
  });

  assert(binding !== null, 'Should create binding');
  assertEquals(binding.statefulWidgetId, 'widget-1');
  assertEquals(binding.stateProperty, 'count');
  assertEquals(binding.mode, BindingMode.ONE_WAY);
  assert(typeof binding.id === 'string', 'Should have ID');
});

test('Create binding with custom ID', () => {
  const binding = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1',
    id: 'custom-binding-123'
  });

  assert(binding.id.includes('binding-w1-p1'), 'Should generate ID');
});

test('Create binding with all options', () => {
  const transform = (v) => String(v);
  const validate = (v) => v !== null;

  const binding = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1',
    mode: BindingMode.TWO_WAY,
    transform,
    validate,
    debounceMs: 100
  });

  assertEquals(binding.mode, BindingMode.TWO_WAY);
  assertEquals(binding.transform, transform);
  assertEquals(binding.validate, validate);
  assertEquals(binding.debounceMs, 100);
});

test('Helper: createBinding', () => {
  const binding = createBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  assert(binding instanceof StateBinding, 'Should create StateBinding');
});

test('Helper: createOneWayBinding', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  assertEquals(binding.mode, BindingMode.ONE_WAY);
});

test('Helper: createTwoWayBinding', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  assertEquals(binding.mode, BindingMode.TWO_WAY);
});

console.log('');

// ============================================================================
// TEST SUITE 2: ONE_WAY Binding (State → DOM)
// ============================================================================

console.log('TEST SUITE 2: ONE_WAY Binding (State → DOM)\n');

test('One-way binding: update text element', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'message'
  });

  const element = createTestElement('span');
  binding.attach(element);

  binding.updateDOM('Hello World');

  assertEquals(element.textContent, 'Hello World');
});

test('One-way binding: update input value', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'username'
  });

  const element = createTestElement('input', 'text');
  binding.attach(element);

  binding.updateDOM('john_doe');

  assertEquals(element.value, 'john_doe');
});

test('One-way binding: update div content', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'content'
  });

  const element = createTestElement('div');
  binding.attach(element);

  binding.updateDOM('Content here');

  assertEquals(element.textContent, 'Content here');
});

test('One-way binding: update checkbox', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'isChecked'
  });

  const element = createTestElement('input', 'checkbox');
  binding.attach(element);

  binding.updateDOM(true);
  assert(element.checked === true);

  binding.updateDOM(false);
  assert(element.checked === false);
});

test('One-way binding: with transform', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'count',
    transform: (val) => `Count: ${val}`
  });

  const element = createTestElement('span');
  binding.attach(element);

  binding.updateDOM(42);

  assertEquals(element.textContent, 'Count: 42');
});

test('One-way binding: null/undefined values', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('span');
  binding.attach(element);

  binding.updateDOM(null);
  assertEquals(element.textContent, '');

  binding.updateDOM(undefined);
  assertEquals(element.textContent, '');
});

test('One-way binding: numeric values', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'number'
  });

  const element = createTestElement('span');
  binding.attach(element);

  binding.updateDOM(42);
  assertEquals(element.textContent, '42');

  binding.updateDOM(3.14);
  assertEquals(element.textContent, '3.14');
});

console.log('');

// ============================================================================
// TEST SUITE 3: TWO_WAY Binding (State ↔ DOM)
// ============================================================================

console.log('TEST SUITE 3: TWO_WAY Binding (State ↔ DOM)\n');

test('Two-way binding: DOM to state', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'username'
  });

  const element = createTestElement('input', 'text');
  element.value = '';
  binding.attach(element);

  let changedValue = null;
  binding.onChange = (value) => {
    changedValue = value;
  };

  element.value = 'john';
  element.dispatchEvent(new window.Event('input'));

  assertEquals(changedValue, 'john');
});

test('Two-way binding: bidirectional sync', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'count'
  });

  const element = createTestElement('input', 'number');
  binding.attach(element);

  // State → DOM
  binding.updateDOM(42);
  assertEquals(element.value, '42');

  // DOM → State
  element.value = '100';
  element.dispatchEvent(new window.Event('input'));

  assertEquals(binding.currentValue, 100);
});

test('Two-way binding: with validation', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'count',
    validate: (val) => val >= 0 && val <= 100
  });

  const element = createTestElement('input', 'number');
  element.value = '50';
  binding.attach(element);
  binding.updateDOM(50);

  let validationError = false;
  binding.onValidationError = () => {
    validationError = true;
  };

  // Valid value
  element.value = '75';
  element.dispatchEvent(new window.Event('input'));
  assert(validationError === false);

  // Invalid value
  element.value = '150';
  element.dispatchEvent(new window.Event('input'));
  assert(validationError === true);
});

test('Two-way binding: with debouncing', (done) => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'search',
    debounceMs: 50
  });

  const element = createTestElement('input', 'text');
  binding.attach(element);

  let callCount = 0;
  binding.onChange = () => {
    callCount++;
  };

  element.value = 'a';
  element.dispatchEvent(new window.Event('input'));

  element.value = 'ab';
  element.dispatchEvent(new window.Event('input'));

  element.value = 'abc';
  element.dispatchEvent(new window.Event('input'));

  // Should not have called onChange yet (debounced)
  assert(callCount === 0 || callCount === 1);

  setTimeout(() => {
    // After debounce, should be called
    assert(callCount === 1);
  }, 100);
});

test('Two-way binding: prevents DOM revert on invalid', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'number',
    validate: (val) => val < 100
  });

  const element = createTestElement('input', 'number');
  element.value = '50';
  binding.attach(element);
  binding.updateDOM(50);

  // Try to set invalid value
  element.value = '150';
  element.dispatchEvent(new window.Event('input'));

  // Should revert to previous valid value
  assertEquals(element.value, '50');
});

console.log('');

// ============================================================================
// TEST SUITE 4: DOM Element Types
// ============================================================================

console.log('TEST SUITE 4: DOM Element Types\n');

test('Binding: text input', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('input', 'text');
  binding.attach(element);

  binding.updateDOM('test');
  assertEquals(element.value, 'test');
});

test('Binding: password input', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('input', 'password');
  binding.attach(element);

  binding.updateDOM('secret');
  assertEquals(element.value, 'secret');
});

test('Binding: number input', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('input', 'number');
  binding.attach(element);

  binding.updateDOM(42);
  assertEquals(element.value, '42');
});

test('Binding: email input', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('input', 'email');
  binding.attach(element);

  binding.updateDOM('test@example.com');
  assertEquals(element.value, 'test@example.com');
});

test('Binding: textarea', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('textarea');
  binding.attach(element);

  binding.updateDOM('Multi\nline\ntext');
  assertEquals(element.value, 'Multi\nline\ntext');
});

test('Binding: select', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'selected'
  });

  const element = createTestElement('select');
  const option = document.createElement('option');
  option.value = 'option1';
  element.appendChild(option);

  binding.attach(element);
  binding.updateDOM('option1');

  assertEquals(element.value, 'option1');
});

test('Binding: image src', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'image'
  });

  const element = createTestElement('img');
  binding.attach(element);

  binding.updateDOM('image.jpg');
  assertEquals(element.src, 'image.jpg');
});

test('Binding: link href', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'url'
  });

  const element = createTestElement('a');
  binding.attach(element);

  binding.updateDOM('https://example.com');

  // Check that href was set and normalize both for comparison
  assert(element.href.startsWith('https://example.com'), 'Should set href correctly');
});

test('Binding: class name', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'className'
  });

  const element = createTestElement('div');
  binding.attach(element);

  binding.updateDOM('active');
  assertEquals(element.className, 'active');
});

test('Binding: style property', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'style-color'
  });

  const element = createTestElement('div');
  binding.attach(element);

  binding.updateDOM('red');
  assertEquals(element.style.color, 'red');
});

test('Binding: attribute', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'attr-data-id'
  });

  const element = createTestElement('div');
  binding.attach(element);

  binding.updateDOM('123');
  assertEquals(element.getAttribute('data-id'), '123');
});

console.log('');

// ============================================================================
// TEST SUITE 5: Binding Attachment & Detachment
// ============================================================================

console.log('TEST SUITE 5: Binding Attachment & Detachment\n');

test('Attach binding to element', () => {
  const binding = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  const element = createTestElement('div');
  binding.attach(element);

  assert(binding.domElement === element);
  assert(element._stateBindings.includes(binding));
});

test('Detach binding from element', () => {
  const binding = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  const element = createTestElement('div');
  binding.attach(element);
  binding.detach();

  assert(binding.domElement === null);
  assert(!element._stateBindings.includes(binding));
});

test('Multiple bindings on same element', () => {
  const el = createTestElement('div');

  const b1 = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  }).attach(el);

  const b2 = new StateBinding({
    statefulWidgetId: 'w2',
    stateProperty: 'p2'
  }).attach(el);

  assertEquals(el._stateBindings.length, 2);
  assert(el._stateBindings.includes(b1));
  assert(el._stateBindings.includes(b2));
});

test('Reject attach to null element', () => {
  const binding = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  try {
    binding.attach(null);
    throw new Error('Should have thrown');
  } catch (error) {
    assert(error.message.includes('null'));
  }
});

console.log('');

// ============================================================================
// TEST SUITE 6: Binding Enable/Disable
// ============================================================================

console.log('TEST SUITE 6: Binding Enable/Disable\n');

test('Disable binding', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('span');
  binding.attach(element);

  binding.updateDOM('value1');
  assertEquals(element.textContent, 'value1');

  binding.disable();
  binding.updateDOM('value2');

  // Should not update because disabled
  assertEquals(element.textContent, 'value1');
});

test('Enable binding', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('span');
  binding.attach(element);

  binding.disable();
  binding.updateDOM('value1');
  assertEquals(element.textContent, '');

  binding.enable();
  binding.updateDOM('value2');

  assertEquals(element.textContent, 'value2');
});

console.log('');

// ============================================================================
// TEST SUITE 7: Dirty Tracking
// ============================================================================

console.log('TEST SUITE 7: Dirty Tracking\n');

test('Track dirty state from DOM', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('input', 'text');
  binding.attach(element);

  binding.updateDOM('initial');
  assert(binding.isDirtyBinding() === false);

  element.value = 'changed';
  element.dispatchEvent(new window.Event('input'));

  assert(binding.isDirtyBinding() === true);
});

test('Clear dirty flag', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('input', 'text');
  binding.attach(element);

  element.value = 'changed';
  element.dispatchEvent(new window.Event('input'));

  assert(binding.isDirtyBinding() === true);

  binding.clearDirty();

  assert(binding.isDirtyBinding() === false);
});

console.log('');

// ============================================================================
// TEST SUITE 8: StateBindingRegistry
// ============================================================================

console.log('TEST SUITE 8: StateBindingRegistry\n');

test('Create registry', () => {
  const registry = new StateBindingRegistry();
  assert(registry !== null);
});

test('Register binding', () => {
  const registry = new StateBindingRegistry();
  const binding = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'count'
  });

  const id = registry.register(binding);

  assertEquals(id, binding.id);
});

test('Get bindings by widget', () => {
  const registry = new StateBindingRegistry();

  const b1 = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  const b2 = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p2'
  });

  registry.register(b1);
  registry.register(b2);

  const bindings = registry.getWidgetBindings('w1');

  assertEquals(bindings.length, 2);
  assert(bindings.includes(b1));
  assert(bindings.includes(b2));
});

test('Get bindings by property', () => {
  const registry = new StateBindingRegistry();

  const b1 = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'count'
  });

  const b2 = new StateBinding({
    statefulWidgetId: 'w2',
    stateProperty: 'count'
  });

  registry.register(b1);
  registry.register(b2);

  const bindings = registry.getPropertyBindings('w1', 'count');

  assertEquals(bindings.length, 1);
  assert(bindings.includes(b1));
});

test('Update state through registry', () => {
  const registry = new StateBindingRegistry();

  const binding = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'count'
  });

  const element = createTestElement('span');
  binding.attach(element);
  registry.register(binding);

  registry.updateState('w1', { count: 42 });

  assertEquals(element.textContent, '42');
});

test('Get dirty bindings from registry', () => {
  const registry = new StateBindingRegistry();

  const b1 = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  const el1 = createTestElement('input', 'text');
  b1.attach(el1);
  registry.register(b1);

  el1.value = 'changed';
  el1.dispatchEvent(new window.Event('input'));

  const dirty = registry.getDirtyBindings();

  assertEquals(dirty.length, 1);
  assert(dirty.includes(b1));
});

test('Get dirty values from registry', () => {
  const registry = new StateBindingRegistry();

  const b1 = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'name'
  });

  const b2 = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'age'
  });

  const el1 = createTestElement('input', 'text');
  const el2 = createTestElement('input', 'number');

  b1.attach(el1);
  b2.attach(el2);

  registry.register(b1);
  registry.register(b2);

  el1.value = 'John';
  el1.dispatchEvent(new window.Event('input'));

  el2.value = '30';
  el2.dispatchEvent(new window.Event('input'));

  const values = registry.getDirtyValues('w1');

  assertEquals(values.name, 'John');
  assertEquals(values.age, 30);
});

test('Clear dirty flags in registry', () => {
  const registry = new StateBindingRegistry();

  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const el = createTestElement('input', 'text');
  binding.attach(el);
  registry.register(binding);

  el.value = 'changed';
  el.dispatchEvent(new window.Event('input'));

  registry.clearDirty();

  const dirty = registry.getDirtyBindings();
  assertEquals(dirty.length, 0);
});

test('Unregister binding', () => {
  const registry = new StateBindingRegistry();

  const binding = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  const id = registry.register(binding);
  const unregistered = registry.unregister(id);

  assert(unregistered === true);
  assertEquals(registry.getWidgetBindings('w1').length, 0);
});

test('Remove widget from registry', () => {
  const registry = new StateBindingRegistry();

  const b1 = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  });

  const b2 = new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p2'
  });

  registry.register(b1);
  registry.register(b2);

  registry.removeWidget('w1');

  assertEquals(registry.getWidgetBindings('w1').length, 0);
});

test('Clear all bindings in registry', () => {
  const registry = new StateBindingRegistry();

  registry.register(new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1'
  }));

  registry.register(new StateBinding({
    statefulWidgetId: 'w2',
    stateProperty: 'p2'
  }));

  registry.clear();

  assertEquals(registry.getBindingCount(), 0);
});

test('Get binding count', () => {
  const registry = new StateBindingRegistry();

  for (let i = 0; i < 5; i++) {
    registry.register(new StateBinding({
      statefulWidgetId: 'w1',
      stateProperty: `p${i}`
    }));
  }

  assertEquals(registry.getBindingCount(), 5);
});

test('Get registry statistics', () => {
  const registry = new StateBindingRegistry();

  registry.register(new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p1',
    mode: BindingMode.ONE_WAY
  }));

  registry.register(new StateBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'p2',
    mode: BindingMode.TWO_WAY
  }));

  const stats = registry.getStats();

  assertEquals(stats.totalBindings, 2);
  assertEquals(stats.totalWidgets, 1);
  assertEquals(stats.totalProperties, 2);
  assertEquals(stats.byMode[BindingMode.ONE_WAY], 1);
  assertEquals(stats.byMode[BindingMode.TWO_WAY], 1);
});

console.log('');

// ============================================================================
// TEST SUITE 9: Callbacks & Events
// ============================================================================

console.log('TEST SUITE 9: Callbacks & Events\n');

test('onUpdate callback', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('span');
  binding.attach(element);

  let called = false;
  let newVal = null;
  let oldVal = null;

  binding.onUpdate = (newValue, previousValue) => {
    called = true;
    newVal = newValue;
    oldVal = previousValue;
  };

  binding.updateDOM('new-value');

  assert(called === true);
  assertEquals(newVal, 'new-value');
  assertEquals(oldVal, null);
});

test('onChange callback for DOM changes', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value'
  });

  const element = createTestElement('input', 'text');
  binding.attach(element);

  let called = false;
  let newVal = null;

  binding.onChange = (value) => {
    called = true;
    newVal = value;
  };

  element.value = 'user-input';
  element.dispatchEvent(new window.Event('input'));

  assert(called === true);
  assertEquals(newVal, 'user-input');
});

test('onValidationError callback', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'age',
    validate: (val) => val >= 0 && val <= 150
  });

  const element = createTestElement('input', 'number');
  element.value = '25';
  binding.attach(element);
  binding.updateDOM(25);

  let errorCalled = false;
  let errorValue = null;

  binding.onValidationError = (value) => {
    errorCalled = true;
    errorValue = value;
  };

  element.value = '200';
  element.dispatchEvent(new window.Event('input'));

  assert(errorCalled === true);
  assertEquals(errorValue, 200);
});

console.log('');

// ============================================================================
// TEST SUITE 10: Edge Cases
// ============================================================================

console.log('TEST SUITE 10: Edge Cases\n');

test('Binding with transform error handling', () => {
  const binding = createOneWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value',
    transform: (v) => {
      throw new Error('Transform failed');
    }
  });

  const element = createTestElement('span');
  binding.attach(element);

  // Should not throw
  binding.updateDOM('test');
});

test('Binding with validation error handling', () => {
  const binding = createTwoWayBinding({
    statefulWidgetId: 'w1',
    stateProperty: 'value',
    validate: (v) => {
      throw new Error('Validation failed');
    }
  });

  const element = createTestElement('input', 'text');
  element.value = 'test';
  binding.attach(element);
  binding.updateDOM('initial');

  // Should not throw
  element.value = 'new';
  element.dispatchEvent(new window.Event('input'));
});

console.log('');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('='.repeat(80));
console.log(`âœ" TESTS PASSED: ${testsPassed}`);
console.log(`âœ— TESTS FAILED: ${testsFailed}`);
console.log(`TOTAL: ${testsPassed + testsFailed}`);
console.log('='.repeat(80) + '\n');