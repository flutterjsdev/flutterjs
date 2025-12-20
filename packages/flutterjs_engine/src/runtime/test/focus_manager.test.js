/**
 * Focus Manager - Test Suite (ES Module Version)
 * Works with "type": "module" in package.json
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { FocusManager } from '../src/focus_manager.js';

// Get __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📋 Starting diagnostic checks...\n');

// Check 1: Node.js environment
console.log('✓ Check 1: Node.js environment detected');
console.log(`  - Node version: ${process.version}`);
console.log(`  - Current directory: ${process.cwd()}`);
console.log(`  - Test file location: ${__filename}\n`);

// Check 2: FocusManager import
console.log('✓ Check 2: FocusManager loaded successfully');
console.log(`  - FocusManager type: ${typeof FocusManager}`);
console.log(`  - FocusManager is class: ${FocusManager.toString().includes('class')}\n`);

// Check 3: Setup Mock DOM
console.log('✓ Check 3: Setting up mock DOM environment...');

const createMockDOM = () => {
  const mockElements = new Map();

  return {
    activeElement: null,
    body: {
      innerHTML: '',
      appendChild() { },
      removeChild() { },
      children: []
    },

    createElement(tag) {
      const element = {
        tag,
        id: '',
        textContent: '',
        className: '',
        style: {},
        tabIndex: 0,
        children: [],
        _focused: false,
        _listeners: {},

        focus() {
          this._focused = true;
          mockElements.set(this.id || 'unknown', this);
        },

        blur() {
          this._focused = false;
        },

        addEventListener(event, handler) {
          if (!this._listeners[event]) {
            this._listeners[event] = [];
          }
          this._listeners[event].push(handler);
        },

        removeEventListener(event, handler) {
          if (!this._listeners[event]) return;
          const index = this._listeners[event].indexOf(handler);
          if (index > -1) {
            this._listeners[event].splice(index, 1);
          }
        },

        compareDocumentPosition(other) {
          if (this.id < other.id) return 4;
          if (this.id > other.id) return 2;
          return 0;
        },

        appendChild(child) {
          this.children.push(child);
        }
      };

      return element;
    },

    getElementById(id) {
      return mockElements.get(id) || null;
    },

    addEventListener(event, handler) {
      if (!this._eventListeners) this._eventListeners = {};
      if (!this._eventListeners[event]) {
        this._eventListeners[event] = [];
      }
      this._eventListeners[event].push(handler);
    },

    removeEventListener(event, handler) {
      if (!this._eventListeners || !this._eventListeners[event]) return;
      const index = this._eventListeners[event].indexOf(handler);
      if (index > -1) {
        this._eventListeners[event].splice(index, 1);
      }
    },

    dispatchEvent(event) {
      return true;
    }
  };
};

if (typeof document === 'undefined') {
  global.document = createMockDOM();
  console.log('  - document object: ✓ Created');
}

if (typeof Node === 'undefined') {
  global.Node = {
    DOCUMENT_POSITION_FOLLOWING: 4,
    DOCUMENT_POSITION_PRECEDING: 2
  };
  console.log('  - Node object: ✓ Created');
}

if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  console.log('  - requestAnimationFrame: ✓ Polyfilled');
}

console.log('');

// Check 4: Create test instance
console.log('✓ Check 4: Creating FocusManager test instance...');
try {
  class MockRuntime {
    constructor() {
      this.name = 'MockRuntime';
    }
  }

  const runtime = new MockRuntime();
  const manager = new FocusManager(runtime);
  console.log(`  - FocusManager instance: ✓ Created`);
  console.log(`  - Instance methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(manager)).length}`);
  console.log('');
} catch (error) {
  console.log(`  ✗ Error creating instance: ${error.message}`);
  console.log(`  Stack: ${error.stack}`);
  process.exit(1);
}

// Check 5: Test a simple operation
console.log('✓ Check 5: Running simple test operation...');
try {
  class MockRuntime {
    constructor() {
      this.name = 'MockRuntime';
    }
  }

  const runtime = new MockRuntime();
  const manager = new FocusManager(runtime);

  const element = document.createElement('button');
  element.id = 'test-btn';

  manager.registerFocusable('test-btn', element);
  console.log(`  - Register focusable: ✓ Success`);

  const success = manager.requestFocus('test-btn');
  console.log(`  - Request focus: ${success ? '✓ Success' : '✗ Failed'}`);

  const currentFocus = manager.currentFocus;
  console.log(`  - Current focus: ${currentFocus === 'test-btn' ? '✓ test-btn' : `✗ ${currentFocus}`}`);

  manager.dispose();
  console.log(`  - Dispose: ✓ Success`);
  console.log('');
} catch (error) {
  console.log(`  ✗ Error during test: ${error.message}`);
  console.log(`  Stack: ${error.stack}`);
  process.exit(1);
}

// All checks passed
console.log('='.repeat(60));
console.log('✅ ALL DIAGNOSTIC CHECKS PASSED!');
console.log('='.repeat(60));
console.log('\n🚀 Ready to run full test suite. Starting tests...\n');

// ============================================================================
// NOW RUN THE ACTUAL TESTS
// ============================================================================

class MockRuntime {
  constructor() {
    this.name = 'MockRuntime';
  }
}

class TestHelper {
  static createMockElement(id) {
    const element = document.createElement('button');
    element.id = id;
    element.textContent = `Button ${id}`;
    return element;
  }

  static cleanup() {
    if (document.body) {
      document.body.innerHTML = '';
      document.body.children = [];
    }
  }

  static wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class FocusManagerTests {
  constructor(FocusManager) {
    this.FocusManager = FocusManager;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  assert(condition, message) {
    this.results.total++;
    if (condition) {
      this.results.passed++;
      console.log(`  ✓ ${message}`);
    } else {
      this.results.failed++;
      this.results.errors.push(message);
      console.error(`  ✗ ${message}`);
    }
  }

  async runAll() {
    console.log('--- Test 1: Basic Registration ---');
    await this.testRegistration();

    console.log('\n--- Test 2: Basic Focus ---');
    await this.testRequestFocus();

    console.log('\n--- Test 3: Basic Unfocus ---');
    await this.testUnfocus();

    console.log('\n--- Test 4: Focus Navigation (Forward) ---');
    await this.testMoveFocusForward();

    console.log('\n--- Test 5: Focus Navigation (Backward) ---');
    await this.testMoveFocusBackward();

    console.log('\n--- Test 6: Tab Order ---');
    await this.testTabOrder();

    console.log('\n--- Test 7: Focus Scopes ---');
    await this.testCreateScope();

    console.log('\n--- Test 8: Push/Pop Scope ---');
    await this.testPushPopScope();

    console.log('\n--- Test 9: Scope Restriction ---');
    await this.testScopeRestriction();

    console.log('\n--- Test 10: Focus Change Listener ---');
    await this.testFocusChangeListener();

    console.log('\n--- Test 11: Skip Traversal ---');
    await this.testSkipTraversal();

    console.log('\n--- Test 12: Unknown Element ---');
    await this.testFocusUnknownElement();

    console.log('\n--- Test 13: Disabled Element ---');
    await this.testFocusDisabledElement();

    console.log('\n--- Test 14: Concurrent Requests ---');
    await this.testConcurrentFocusRequests();

    console.log('\n--- Test 15: Cleanup/Dispose ---');
    await this.testDispose();

    this.printResults();
  }

  async testRegistration() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const element = TestHelper.createMockElement('btn1');

    manager.registerFocusable('btn1', element);
    this.assert(manager.focusableElements.has('btn1'), 'Element registered');

    const info = manager.getElementInfo('btn1');
    this.assert(info && info.elementId === 'btn1', 'Element info accessible');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testRequestFocus() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const element = TestHelper.createMockElement('btn1');

    manager.registerFocusable('btn1', element);
    const success = manager.requestFocus('btn1');

    this.assert(success, 'Focus request succeeded');
    this.assert(manager.currentFocus === 'btn1', 'Current focus updated');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testUnfocus() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const element = TestHelper.createMockElement('btn1');

    manager.registerFocusable('btn1', element);
    manager.requestFocus('btn1');
    manager.unfocus('btn1');

    this.assert(manager.currentFocus === null, 'Focus cleared');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testMoveFocusForward() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');
    const btn3 = TestHelper.createMockElement('btn3');

    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn2', btn2);
    manager.registerFocusable('btn3', btn3);

    manager.requestFocus('btn1');
    manager.moveFocus('forward');

    this.assert(manager.currentFocus === 'btn2', 'Moved forward to btn2');

    manager.moveFocus('forward');
    this.assert(manager.currentFocus === 'btn3', 'Moved forward to btn3');

    manager.moveFocus('forward');
    this.assert(manager.currentFocus === 'btn1', 'Wrapped to btn1');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testMoveFocusBackward() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');
    const btn3 = TestHelper.createMockElement('btn3');

    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn2', btn2);
    manager.registerFocusable('btn3', btn3);

    manager.requestFocus('btn1');
    manager.moveFocus('backward');

    this.assert(manager.currentFocus === 'btn3', 'Moved backward to btn3 (wrapped)');

    manager.moveFocus('backward');
    this.assert(manager.currentFocus === 'btn2', 'Moved backward to btn2');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testTabOrder() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');
    const btn3 = TestHelper.createMockElement('btn3');

    manager.registerFocusable('btn2', btn2, { tabIndex: 2 });
    manager.registerFocusable('btn1', btn1, { tabIndex: 1 });
    manager.registerFocusable('btn3', btn3, { tabIndex: 3 });

    manager.moveFocus('forward');
    this.assert(manager.currentFocus === 'btn1', 'First focus is btn1 (tabIndex 1)');

    manager.moveFocus('forward');
    this.assert(manager.currentFocus === 'btn2', 'Second focus is btn2 (tabIndex 2)');

    manager.moveFocus('forward');
    this.assert(manager.currentFocus === 'btn3', 'Third focus is btn3 (tabIndex 3)');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testCreateScope() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());

    manager.createScope('modal-scope', ['btn1', 'btn2']);

    this.assert(manager.focusScopes.has('modal-scope'), 'Scope created');

    const elements = manager.focusScopes.get('modal-scope');
    this.assert(elements.length === 2 && elements.includes('btn1'), 'Scope contains elements');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testPushPopScope() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());

    manager.createScope('modal-scope');
    manager.pushScope('modal-scope');

    this.assert(manager.activeScopeId === 'modal-scope', 'Scope pushed');

    manager.popScope();
    this.assert(manager.activeScopeId === null, 'Scope popped');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testScopeRestriction() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');

    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn2', btn2);

    manager.createScope('modal-scope');
    manager.addToScope('modal-scope', 'btn2');
    manager.pushScope('modal-scope');

    const success = manager.requestFocus('btn1');

    this.assert(!success, 'Focus blocked outside scope');
    this.assert(manager.currentFocus !== 'btn1', 'Focus not changed');

    const successInScope = manager.requestFocus('btn2');
    this.assert(successInScope, 'Focus allowed in scope');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testFocusChangeListener() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());

    let listenerCalled = false;
    let newFocus = null;
    let oldFocus = null;

    const listener = (newF, oldF) => {
      listenerCalled = true;
      newFocus = newF;
      oldFocus = oldF;
    };

    manager.addFocusChangeListener(listener);

    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');

    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn2', btn2);

    manager.requestFocus('btn1');
    this.assert(listenerCalled && newFocus === 'btn1', 'Listener called on focus');

    listenerCalled = false;
    manager.requestFocus('btn2');
    this.assert(listenerCalled && newFocus === 'btn2' && oldFocus === 'btn1', 'Listener called on change');

    manager.removeFocusChangeListener(listener);
    manager.dispose();
    TestHelper.cleanup();
  }

  async testSkipTraversal() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');
    const btn3 = TestHelper.createMockElement('btn3');

    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn2', btn2, { skipTraversal: true });
    manager.registerFocusable('btn3', btn3);

    manager.requestFocus('btn1');
    manager.moveFocus('forward');

    this.assert(manager.currentFocus === 'btn3', 'Skipped btn2 (skipTraversal=true)');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testFocusUnknownElement() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());

    const success = manager.requestFocus('unknown-btn');

    this.assert(!success, 'Focus failed for unknown element');
    this.assert(manager.currentFocus === null, 'Focus unchanged');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testFocusDisabledElement() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const btn1 = TestHelper.createMockElement('btn1');

    manager.registerFocusable('btn1', btn1, { canRequestFocus: false });
    const success = manager.requestFocus('btn1');

    this.assert(!success, 'Focus failed for disabled element');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testConcurrentFocusRequests() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');

    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn2', btn2);

    manager.requestFocus('btn1');
    manager.requestFocus('btn2');

    this.assert(manager.currentFocus === 'btn2', 'Second request took precedence');

    manager.dispose();
    TestHelper.cleanup();
  }

  async testDispose() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    const element = TestHelper.createMockElement('btn1');

    manager.registerFocusable('btn1', element);
    manager.setupKeyboardNavigation();
    manager.createScope('scope1');

    const listener = () => { };
    manager.addFocusChangeListener(listener);

    manager.dispose();

    this.assert(manager.focusableElements.size === 0, 'Elements cleared');
    this.assert(manager.focusScopes.size === 0, 'Scopes cleared');
    this.assert(manager.focusChangeListeners.size === 0, 'Listeners cleared');
    this.assert(!manager.keyboardEnabled, 'Keyboard disabled');
    this.assert(manager.currentFocus === null, 'Focus cleared');

    TestHelper.cleanup();
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total:  ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✓`);
    console.log(`Failed: ${this.results.failed} ✗`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\nFailed Tests:');
      this.results.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }

    console.log('='.repeat(60));
  }
}

// Run the tests
const tests = new FocusManagerTests(FocusManager);
tests.runAll().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});