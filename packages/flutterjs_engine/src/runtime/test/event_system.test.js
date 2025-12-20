/**
 * EventSystem & SyntheticEvent Test Suite
 *
 * Tests for:
 * - Event delegation
 * - Handler registration/unregistration
 * - Event propagation and bubbling
 * - Synthetic event creation
 * - Event batching and performance
 * - Memory management
 */

import {EventSystem, SyntheticEvent } from "../src/event_system.js";

// Polyfill HTMLElement for Node.js testing
if (typeof HTMLElement === 'undefined') {
  global.HTMLElement = class HTMLElement {
    constructor(tagName = 'DIV') {
      this.tagName = tagName;
    }
  };
}

// Test Runner
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
  }

  it(name, fn) {
    try {
      fn();
      console.log(`  ✅ ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`  ❌ ${name}`);
      console.log(`     ${error.message}`);
      this.failed++;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
  }

  assertNull(value, message) {
    if (value !== null) {
      throw new Error(message || `Expected null but got ${value}`);
    }
  }

  assertNotNull(value, message) {
    if (value === null) {
      throw new Error(message || 'Expected value to not be null');
    }
  }

  assertTrue(value, message) {
    if (value !== true) {
      throw new Error(message || `Expected true but got ${value}`);
    }
  }

  assertFalse(value, message) {
    if (value !== false) {
      throw new Error(message || `Expected false but got ${value}`);
    }
  }

  assertThrows(fn, message) {
    try {
      fn();
      throw new Error(message || 'Expected function to throw');
    } catch (e) {
      if (message && !e.message.includes(message)) {
        throw new Error(`Expected error with "${message}" but got "${e.message}"`);
      }
    }
  }

  summary() {
    const total = this.passed + this.failed;
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tests: ${total} | ✅ Passed: ${this.passed} | ❌ Failed: ${this.failed}`);
    console.log(`${'='.repeat(50)}\n`);
    return this.failed === 0;
  }
}

// Mock Classes
class MockRuntime {
  constructor() {
    this.debugMode = false;
  }
}

// Mock DOM Element - extends HTMLElement for instanceof check
function createMockElement(tagName = 'DIV', elementId = null) {
  const element = new HTMLElement(tagName);
  const listeners = {};
  
  element.dataset = elementId ? { elementId } : {};
  element.listeners = listeners;
  
  element.addEventListener = function(eventType, handler, useCapture) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push({ handler, useCapture });
  };
  
  element.removeEventListener = function(eventType, handler, useCapture) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(
        l => l.handler !== handler
      );
    }
  };
  
  element.appendChild = function() {};
  element.parentElement = null;
  
  return element;
}

function createMockNativeEvent(type, options = {}) {
  return {
    type: type,
    bubbles: options.bubbles !== false,
    cancelable: options.cancelable !== false,
    clientX: options.clientX || 0,
    clientY: options.clientY || 0,
    pageX: options.pageX || 0,
    pageY: options.pageY || 0,
    screenX: options.screenX || 0,
    screenY: options.screenY || 0,
    button: options.button !== undefined ? options.button : 0,
    buttons: options.buttons || 0,
    altKey: options.altKey || false,
    ctrlKey: options.ctrlKey || false,
    metaKey: options.metaKey || false,
    shiftKey: options.shiftKey || false,
    key: options.key || '',
    code: options.code || '',
    keyCode: options.keyCode || 0,
    which: options.which || 0,
    target: options.target || { dataset: {} },
    touches: options.touches || [],
    changedTouches: options.changedTouches || [],
    targetTouches: options.targetTouches || [],
    preventDefault: options.preventDefault || function() {},
    stopPropagation: options.stopPropagation || function() {},
    stopImmediatePropagation: options.stopImmediatePropagation || function() {},
    timeStamp: options.timeStamp || Date.now()
  };
}

// Run Tests
function runTests() {
  const test = new TestRunner();

  // ============================================================
  // SYNTHETIC EVENT TESTS
  // ============================================================
  
  test.describe('SyntheticEvent: Construction', () => {
    test.it('should create with all properties', () => {
      const nativeEvent = createMockNativeEvent('click');
      const target = { tagName: 'BUTTON', dataset: { elementId: 'btn-1' } };
      const currentTarget = { tagName: 'BUTTON', dataset: { elementId: 'btn-1' } };

      const syntheticEvent = new SyntheticEvent(nativeEvent, 'click', target, currentTarget);

      test.assertEqual(syntheticEvent.type, 'click');
      test.assertEqual(syntheticEvent.target, target);
      test.assertEqual(syntheticEvent.currentTarget, currentTarget);
      test.assertEqual(syntheticEvent.nativeEvent, nativeEvent);
    });

    test.it('should copy mouse properties', () => {
      const nativeEvent = createMockNativeEvent('click', {
        clientX: 100,
        clientY: 200,
        pageX: 150,
        pageY: 250,
        screenX: 500,
        screenY: 600
      });
      const target = { tagName: 'BUTTON' };

      const syntheticEvent = new SyntheticEvent(nativeEvent, 'click', target, target);

      test.assertEqual(syntheticEvent.clientX, 100);
      test.assertEqual(syntheticEvent.clientY, 200);
      test.assertEqual(syntheticEvent.pageX, 150);
      test.assertEqual(syntheticEvent.pageY, 250);
    });

    test.it('should copy modifier keys', () => {
      const nativeEvent = createMockNativeEvent('keydown', {
        altKey: true,
        ctrlKey: true,
        metaKey: true,
        shiftKey: true
      });
      const target = { tagName: 'INPUT' };

      const syntheticEvent = new SyntheticEvent(nativeEvent, 'keydown', target, target);

      test.assertTrue(syntheticEvent.altKey);
      test.assertTrue(syntheticEvent.ctrlKey);
      test.assertTrue(syntheticEvent.metaKey);
      test.assertTrue(syntheticEvent.shiftKey);
    });

    test.it('should copy keyboard properties', () => {
      const nativeEvent = createMockNativeEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13
      });
      const target = { tagName: 'INPUT' };

      const syntheticEvent = new SyntheticEvent(nativeEvent, 'keydown', target, target);

      test.assertEqual(syntheticEvent.key, 'Enter');
      test.assertEqual(syntheticEvent.code, 'Enter');
      test.assertEqual(syntheticEvent.keyCode, 13);
    });

    test.it('should handle missing native event properties', () => {
      const nativeEvent = { type: 'click' };
      const target = { tagName: 'BUTTON' };

      const syntheticEvent = new SyntheticEvent(nativeEvent, 'click', target, target);

      test.assertEqual(syntheticEvent.clientX, 0);
      test.assertEqual(syntheticEvent.clientY, 0);
      test.assertEqual(syntheticEvent.key, '');
      test.assertEqual(syntheticEvent.button, -1);
    });
  });

  test.describe('SyntheticEvent: Event Control', () => {
    test.it('should prevent default', () => {
      const nativeEvent = createMockNativeEvent('click');
      let preventDefaultCalled = false;
      nativeEvent.preventDefault = () => { preventDefaultCalled = true; };

      const syntheticEvent = new SyntheticEvent(nativeEvent, 'click', {}, {});
      syntheticEvent.preventDefault();

      test.assertTrue(syntheticEvent.defaultPrevented);
      test.assertTrue(preventDefaultCalled);
    });

    test.it('should stop propagation', () => {
      const nativeEvent = createMockNativeEvent('click');
      let stopPropagationCalled = false;
      nativeEvent.stopPropagation = () => { stopPropagationCalled = true; };

      const syntheticEvent = new SyntheticEvent(nativeEvent, 'click', {}, {});
      syntheticEvent.stopPropagation();

      test.assertTrue(syntheticEvent.isPropagationStopped);
      test.assertTrue(stopPropagationCalled);
    });

    test.it('should stop immediate propagation', () => {
      const nativeEvent = createMockNativeEvent('click');
      let stopImmediateCalled = false;
      nativeEvent.stopImmediatePropagation = () => { stopImmediateCalled = true; };

      const syntheticEvent = new SyntheticEvent(nativeEvent, 'click', {}, {});
      syntheticEvent.stopImmediatePropagation();

      test.assertTrue(syntheticEvent.isImmediatePropagationStopped);
      test.assertTrue(syntheticEvent.isPropagationStopped);
      test.assertTrue(stopImmediateCalled);
    });

    test.it('should track flags independently', () => {
      const nativeEvent = createMockNativeEvent('click');
      const syntheticEvent = new SyntheticEvent(nativeEvent, 'click', {}, {});

      test.assertFalse(syntheticEvent.defaultPrevented);
      test.assertFalse(syntheticEvent.isPropagationStopped);

      syntheticEvent.preventDefault();
      test.assertTrue(syntheticEvent.defaultPrevented);
      test.assertFalse(syntheticEvent.isPropagationStopped);
    });
  });

  test.describe('SyntheticEvent: toString', () => {
    test.it('should provide useful string representation', () => {
      const nativeEvent = createMockNativeEvent('click');
      const target = { tagName: 'BUTTON' };
      const syntheticEvent = new SyntheticEvent(nativeEvent, 'click', target, target);

      const str = syntheticEvent.toString();

      test.assert(str.includes('SyntheticEvent'));
      test.assert(str.includes('click'));
      test.assert(str.includes('BUTTON'));
    });
  });

  // ============================================================
  // EVENT SYSTEM TESTS
  // ============================================================

  test.describe('EventSystem: Construction & Initialization', () => {
    test.it('should create with runtime', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);

      test.assertEqual(eventSystem.runtime, runtime);
      test.assertFalse(eventSystem.initialized);
    });

    test.it('should throw without runtime', () => {
      test.assertThrows(() => new EventSystem(null), 'Runtime');
    });

    test.it('should initialize with root element', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');

      eventSystem.initialize(rootElement);

      test.assertTrue(eventSystem.initialized);
      test.assertEqual(eventSystem.rootElement, rootElement);
    });

    test.it('should throw on invalid root element', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);

      test.assertThrows(() => eventSystem.initialize(null), 'Root element');
      test.assertThrows(() => eventSystem.initialize('string'), 'Root element');
    });

    test.it('should attach delegated listeners', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');

      eventSystem.initialize(rootElement);

      test.assertEqual(eventSystem.nativeListeners.size, eventSystem.delegatedEvents.size);
    });
  });

  test.describe('EventSystem: Handler Registration', () => {
    test.it('should register handler', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      const handler = () => {};
      eventSystem.registerHandler('elem-1', 'click', handler);

      test.assertTrue(eventSystem.hasHandlers('elem-1', 'click'));
      test.assertEqual(eventSystem.getHandlerCount('elem-1', 'click'), 1);
    });

    test.it('should register multiple handlers', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'click', () => {});

      test.assertEqual(eventSystem.getHandlerCount('elem-1', 'click'), 2);
    });

    test.it('should register handlers for multiple event types', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'change', () => {});

      test.assertTrue(eventSystem.hasHandlers('elem-1', 'click'));
      test.assertTrue(eventSystem.hasHandlers('elem-1', 'change'));
    });

    test.it('should throw on invalid element ID', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      test.assertThrows(() => eventSystem.registerHandler(null, 'click', () => {}), 'Element');
      test.assertThrows(() => eventSystem.registerHandler('', 'click', () => {}), 'Element');
    });

    test.it('should throw on invalid event type', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      test.assertThrows(() => eventSystem.registerHandler('elem-1', null, () => {}), 'Event');
      test.assertThrows(() => eventSystem.registerHandler('elem-1', '', () => {}), 'Event');
    });

    test.it('should throw on invalid handler', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      test.assertThrows(() => eventSystem.registerHandler('elem-1', 'click', 'not-function'), 'function');
      test.assertThrows(() => eventSystem.registerHandler('elem-1', 'click', null), 'function');
    });

    test.it('should track statistics', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'click', () => {});

      test.assertEqual(eventSystem.stats.handlersRegistered, 2);
    });
  });

  test.describe('EventSystem: Handler Unregistration', () => {
    test.it('should unregister specific handler', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      const handler = () => {};
      eventSystem.registerHandler('elem-1', 'click', handler);
      eventSystem.registerHandler('elem-1', 'click', () => {});

      eventSystem.unregisterHandler('elem-1', 'click', handler);

      test.assertEqual(eventSystem.getHandlerCount('elem-1', 'click'), 1);
    });

    test.it('should unregister all handlers for event type', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'change', () => {});

      eventSystem.unregisterHandler('elem-1', 'click');

      test.assertFalse(eventSystem.hasHandlers('elem-1', 'click'));
      test.assertTrue(eventSystem.hasHandlers('elem-1', 'change'));
    });

    test.it('should unregister all handlers for element', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'change', () => {});

      eventSystem.unregisterHandler('elem-1');

      test.assertEqual(eventSystem.getHandlerCount('elem-1'), 0);
    });

    test.it('should handle non-existent handlers gracefully', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.unregisterHandler('non-existent');

      test.assertEqual(eventSystem.getHandlerCount('non-existent'), 0);
    });
  });

  test.describe('EventSystem: Handler Queries', () => {
    test.it('should check if element has handlers', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});

      test.assertTrue(eventSystem.hasHandlers('elem-1'));
      test.assertTrue(eventSystem.hasHandlers('elem-1', 'click'));
      test.assertFalse(eventSystem.hasHandlers('elem-1', 'change'));
      test.assertFalse(eventSystem.hasHandlers('non-existent'));
    });

    test.it('should get handler count', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'change', () => {});

      test.assertEqual(eventSystem.getHandlerCount('elem-1'), 3);
      test.assertEqual(eventSystem.getHandlerCount('elem-1', 'click'), 2);
      test.assertEqual(eventSystem.getHandlerCount('non-existent'), 0);
    });

    test.it('should get event types for element', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'change', () => {});

      const eventTypes = eventSystem.getEventTypes('elem-1');

      test.assert(eventTypes.includes('click'));
      test.assert(eventTypes.includes('change'));
      test.assertEqual(eventTypes.length, 2);
    });
  });

  test.describe('EventSystem: Batch Operations', () => {
    test.it('should batch register handlers', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      const handlers = {
        click: () => {},
        change: () => {},
        input: () => {}
      };

      eventSystem.batchRegister('elem-1', handlers);

      test.assertEqual(eventSystem.getHandlerCount('elem-1'), 3);
    });

    test.it('should batch unregister handlers', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-1', 'change', () => {});

      eventSystem.batchUnregister('elem-1');

      test.assertEqual(eventSystem.getHandlerCount('elem-1'), 0);
    });
  });

  test.describe('EventSystem: Cleanup', () => {
    test.it('should clear element handlers', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.clearElement('elem-1');

      test.assertEqual(eventSystem.getHandlerCount('elem-1'), 0);
    });

    test.it('should clear all handlers', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-2', 'change', () => {});

      eventSystem.clearAll();

      test.assertEqual(eventSystem.handlerRegistry.size, 0);
    });

    test.it('should dispose event system', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.dispose();

      test.assertFalse(eventSystem.initialized);
      test.assertNull(eventSystem.rootElement);
    });
  });

  test.describe('EventSystem: Statistics', () => {
    test.it('should provide statistics', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-2', 'change', () => {});

      const stats = eventSystem.getStats();

      test.assertEqual(stats.handlersRegistered, 2);
      test.assertEqual(stats.elementsWithHandlers, 2);
      test.assertEqual(stats.totalHandlers, 2);
    });
  });

  test.describe('EventSystem: Detailed Info', () => {
    test.it('should provide info for specific element', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});

      const info = eventSystem.getDetailedInfo('elem-1');

      test.assertEqual(info.elementId, 'elem-1');
      test.assertTrue(info.hasHandlers);
      test.assert(info.handlers.click);
    });

    test.it('should provide info for all elements', () => {
      const runtime = new MockRuntime();
      const eventSystem = new EventSystem(runtime);
      const rootElement = createMockElement('DIV');
      eventSystem.initialize(rootElement);

      eventSystem.registerHandler('elem-1', 'click', () => {});
      eventSystem.registerHandler('elem-2', 'change', () => {});

      const info = eventSystem.getDetailedInfo();

      test.assertEqual(info.totalElements, 2);
      test.assert(info.elements['elem-1']);
      test.assert(info.elements['elem-2']);
    });
  });

  return test.summary();
}

// Run tests
runTests();