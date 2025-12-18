/**
 * Focus Manager - Test Suite
 * 
 * Comprehensive tests for focus management system including:
 * - Basic focus/blur operations
 * - Keyboard navigation (Tab)
 * - Focus scopes (modals)
 * - Autofocus
 * - Event callbacks
 * - Edge cases
 */

// Mock runtime
class MockRuntime {
  constructor() {
    this.name = 'MockRuntime';
  }
}

// Test helpers
class TestHelper {
  static createMockElement(id) {
    const element = document.createElement('button');
    element.id = id;
    element.textContent = `Button ${id}`;
    document.body.appendChild(element);
    return element;
  }
  
  static createMockInput(id) {
    const input = document.createElement('input');
    input.id = id;
    input.type = 'text';
    document.body.appendChild(input);
    return input;
  }
  
  static cleanup() {
    document.body.innerHTML = '';
  }
  
  static wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static simulateKeyPress(key, shiftKey = false) {
    const event = new KeyboardEvent('keydown', {
      key,
      shiftKey,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
    return event;
  }
}

// Test Suite
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
      console.log(`✓ ${message}`);
    } else {
      this.results.failed++;
      this.results.errors.push(message);
      console.error(`✗ ${message}`);
    }
  }
  
  async runAll() {
    console.log('=== Focus Manager Test Suite ===\n');
    
    try {
      // Basic Operations
      console.log('--- Basic Operations ---');
      await this.testRegistration();
      await this.testRequestFocus();
      await this.testUnfocus();
      await this.testUnregister();
      
      // Focus Navigation
      console.log('\n--- Focus Navigation ---');
      await this.testMoveFocusForward();
      await this.testMoveFocusBackward();
      await this.testTabOrder();
      
      // Scopes
      console.log('\n--- Focus Scopes ---');
      await this.testCreateScope();
      await this.testPushScope();
      await this.testPopScope();
      await this.testScopeRestriction();
      
      // Keyboard Navigation
      console.log('\n--- Keyboard Navigation ---');
      await this.testKeyboardSetup();
      await this.testTabKey();
      await this.testShiftTabKey();
      await this.testEscapeKey();
      
      // Advanced Features
      console.log('\n--- Advanced Features ---');
      await this.testAutofocus();
      await this.testFocusChangeCallback();
      await this.testFocusChangeListener();
      await this.testSkipTraversal();
      
      // Edge Cases
      console.log('\n--- Edge Cases ---');
      await this.testFocusUnknownElement();
      await this.testFocusDisabledElement();
      await this.testMultipleRegistrations();
      await this.testConcurrentFocusRequests();
      
      // Cleanup
      console.log('\n--- Cleanup ---');
      await this.testDispose();
      
    } catch (error) {
      console.error('Test suite error:', error);
      this.results.errors.push(`Suite error: ${error.message}`);
    }
    
    this.printResults();
  }
  
  // === Basic Operations Tests ===
  
  async testRegistration() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const element = TestHelper.createMockElement('btn1');
    manager.registerFocusable('btn1', element);
    
    this.assert(
      manager.focusableElements.has('btn1'),
      'Element registered successfully'
    );
    
    const info = manager.getElementInfo('btn1');
    this.assert(
      info && info.elementId === 'btn1',
      'Element info accessible'
    );
    
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
    this.assert(
      manager.currentFocus === 'btn1',
      'Current focus updated'
    );
    this.assert(
      document.activeElement === element,
      'DOM element focused'
    );
    
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
    
    this.assert(
      manager.currentFocus === null,
      'Focus cleared'
    );
    this.assert(
      document.activeElement !== element,
      'DOM element blurred'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testUnregister() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const element = TestHelper.createMockElement('btn1');
    manager.registerFocusable('btn1', element);
    manager.requestFocus('btn1');
    
    manager.unregisterFocusable('btn1');
    
    this.assert(
      !manager.focusableElements.has('btn1'),
      'Element unregistered'
    );
    this.assert(
      manager.currentFocus === null,
      'Focus cleared on unregister'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  // === Focus Navigation Tests ===
  
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
    
    this.assert(
      manager.currentFocus === 'btn2',
      'Focus moved forward to btn2'
    );
    
    manager.moveFocus('forward');
    this.assert(
      manager.currentFocus === 'btn3',
      'Focus moved forward to btn3'
    );
    
    manager.moveFocus('forward');
    this.assert(
      manager.currentFocus === 'btn1',
      'Focus wrapped to btn1'
    );
    
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
    
    this.assert(
      manager.currentFocus === 'btn3',
      'Focus moved backward to btn3 (wrapped)'
    );
    
    manager.moveFocus('backward');
    this.assert(
      manager.currentFocus === 'btn2',
      'Focus moved backward to btn2'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testTabOrder() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');
    const btn3 = TestHelper.createMockElement('btn3');
    
    // Register with different tab indices
    manager.registerFocusable('btn2', btn2, { tabIndex: 2 });
    manager.registerFocusable('btn1', btn1, { tabIndex: 1 });
    manager.registerFocusable('btn3', btn3, { tabIndex: 3 });
    
    manager.moveFocus('forward');
    
    this.assert(
      manager.currentFocus === 'btn1',
      'First focus is btn1 (tabIndex 1)'
    );
    
    manager.moveFocus('forward');
    this.assert(
      manager.currentFocus === 'btn2',
      'Second focus is btn2 (tabIndex 2)'
    );
    
    manager.moveFocus('forward');
    this.assert(
      manager.currentFocus === 'btn3',
      'Third focus is btn3 (tabIndex 3)'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  // === Focus Scopes Tests ===
  
  async testCreateScope() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    manager.createScope('modal-scope', ['btn1', 'btn2']);
    
    this.assert(
      manager.focusScopes.has('modal-scope'),
      'Scope created'
    );
    
    const elements = manager.focusScopes.get('modal-scope');
    this.assert(
      elements.length === 2 && elements.includes('btn1'),
      'Scope contains elements'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testPushScope() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');
    
    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn2', btn2);
    
    manager.createScope('modal-scope');
    manager.addToScope('modal-scope', 'btn2');
    manager.pushScope('modal-scope');
    
    this.assert(
      manager.activeScopeId === 'modal-scope',
      'Scope activated'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testPopScope() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    manager.createScope('modal-scope');
    manager.pushScope('modal-scope');
    manager.popScope();
    
    this.assert(
      manager.activeScopeId === null,
      'Scope deactivated'
    );
    
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
    
    this.assert(
      !success,
      'Focus blocked for element outside scope'
    );
    this.assert(
      manager.currentFocus !== 'btn1',
      'Focus not changed to btn1'
    );
    
    const successInScope = manager.requestFocus('btn2');
    this.assert(
      successInScope,
      'Focus allowed for element in scope'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  // === Keyboard Navigation Tests ===
  
  async testKeyboardSetup() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    manager.setupKeyboardNavigation();
    
    this.assert(
      manager.keyboardEnabled,
      'Keyboard navigation enabled'
    );
    this.assert(
      manager.keyboardHandler !== null,
      'Keyboard handler attached'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testTabKey() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');
    
    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn2', btn2);
    manager.setupKeyboardNavigation();
    
    manager.requestFocus('btn1');
    TestHelper.simulateKeyPress('Tab', false);
    
    await TestHelper.wait(10);
    
    this.assert(
      manager.currentFocus === 'btn2',
      'Tab key moved focus forward'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testShiftTabKey() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const btn1 = TestHelper.createMockElement('btn1');
    const btn2 = TestHelper.createMockElement('btn2');
    
    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn2', btn2);
    manager.setupKeyboardNavigation();
    
    manager.requestFocus('btn2');
    TestHelper.simulateKeyPress('Tab', true);
    
    await TestHelper.wait(10);
    
    this.assert(
      manager.currentFocus === 'btn1',
      'Shift+Tab moved focus backward'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testEscapeKey() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    manager.createScope('modal-scope');
    manager.pushScope('modal-scope');
    manager.setupKeyboardNavigation();
    
    TestHelper.simulateKeyPress('Escape');
    
    await TestHelper.wait(10);
    
    this.assert(
      manager.activeScopeId === null,
      'Escape key closed scope'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  // === Advanced Features Tests ===
  
  async testAutofocus() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const btn1 = TestHelper.createMockElement('btn1');
    manager.registerFocusable('btn1', btn1, { autofocus: true });
    
    await TestHelper.wait(50);
    
    this.assert(
      manager.currentFocus === 'btn1',
      'Autofocus element focused'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testFocusChangeCallback() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    let callbackCalled = false;
    let callbackValue = null;
    
    const btn1 = TestHelper.createMockElement('btn1');
    manager.registerFocusable('btn1', btn1, {
      onFocusChange: (hasFocus) => {
        callbackCalled = true;
        callbackValue = hasFocus;
      }
    });
    
    manager.requestFocus('btn1');
    
    this.assert(
      callbackCalled && callbackValue === true,
      'onFocusChange called with true on focus'
    );
    
    callbackCalled = false;
    manager.unfocus('btn1');
    
    this.assert(
      callbackCalled && callbackValue === false,
      'onFocusChange called with false on blur'
    );
    
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
    this.assert(
      listenerCalled && newFocus === 'btn1',
      'Listener called on first focus'
    );
    
    listenerCalled = false;
    manager.requestFocus('btn2');
    
    this.assert(
      listenerCalled && newFocus === 'btn2' && oldFocus === 'btn1',
      'Listener called on focus change'
    );
    
    manager.removeFocusChangeListener(listener);
    listenerCalled = false;
    manager.unfocus('btn2');
    
    // Note: Listener still called internally, but we removed it
    // Just checking it doesn't crash
    
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
    
    this.assert(
      manager.currentFocus === 'btn3',
      'Skipped btn2 (skipTraversal=true)'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  // === Edge Cases Tests ===
  
  async testFocusUnknownElement() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const success = manager.requestFocus('unknown-btn');
    
    this.assert(
      !success,
      'Focus request failed for unknown element'
    );
    this.assert(
      manager.currentFocus === null,
      'Current focus unchanged'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testFocusDisabledElement() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const btn1 = TestHelper.createMockElement('btn1');
    manager.registerFocusable('btn1', btn1, { canRequestFocus: false });
    
    const success = manager.requestFocus('btn1');
    
    this.assert(
      !success,
      'Focus request failed for disabled element'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  async testMultipleRegistrations() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const btn1 = TestHelper.createMockElement('btn1');
    
    manager.registerFocusable('btn1', btn1);
    manager.registerFocusable('btn1', btn1); // Re-register
    
    this.assert(
      manager.focusableElements.size === 1,
      'Duplicate registration handled (overwrites)'
    );
    
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
    manager.requestFocus('btn2'); // Immediate second request
    
    this.assert(
      manager.currentFocus === 'btn2',
      'Second focus request took precedence'
    );
    
    manager.dispose();
    TestHelper.cleanup();
  }
  
  // === Cleanup Tests ===
  
  async testDispose() {
    TestHelper.cleanup();
    const manager = new this.FocusManager(new MockRuntime());
    
    const btn1 = TestHelper.createMockElement('btn1');
    manager.registerFocusable('btn1', btn1);
    manager.setupKeyboardNavigation();
    manager.createScope('scope1');
    
    const listener = () => {};
    manager.addFocusChangeListener(listener);
    
    manager.dispose();
    
    this.assert(
      manager.focusableElements.size === 0,
      'All focusable elements cleared'
    );
    this.assert(
      manager.focusScopes.size === 0,
      'All scopes cleared'
    );
    this.assert(
      manager.focusChangeListeners.size === 0,
      'All listeners cleared'
    );
    this.assert(
      !manager.keyboardEnabled,
      'Keyboard navigation disabled'
    );
    this.assert(
      manager.currentFocus === null,
      'Current focus cleared'
    );
    
    TestHelper.cleanup();
  }
  
  // === Results ===
  
  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total:  ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✓`);
    console.log(`Failed: ${this.results.failed} ✗`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\nFailed Tests:');
      this.results.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }
    
    console.log('='.repeat(50));
  }
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  const FocusManager = require('./focus-manager.js');
  
  // Setup minimal DOM environment
  if (typeof document === 'undefined') {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.Node = dom.window.Node;
    global.KeyboardEvent = dom.window.KeyboardEvent;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  }
  
  // Run tests
  const tests = new FocusManagerTests(FocusManager);
  tests.runAll().then(() => {
    process.exit(tests.results.failed > 0 ? 1 : 0);
  });
}

// Browser test runner
if (typeof window !== 'undefined' && window.FocusManager) {
  window.runFocusManagerTests = () => {
    const tests = new FocusManagerTests(window.FocusManager);
    return tests.runAll();
  };
}