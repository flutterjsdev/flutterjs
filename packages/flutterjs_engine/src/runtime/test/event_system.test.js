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

import {
  EventSystem,
  SyntheticEvent
} from '../src/event_system.js';

// Mock classes
class MockRuntime {
  constructor() {
    this.debugMode = false;
  }
}

describe('SyntheticEvent', () => {
  let nativeEvent;
  let target;
  let currentTarget;
  let syntheticEvent;

  beforeEach(() => {
    target = {
      tagName: 'BUTTON',
      value: 'test-value',
      checked: false,
      dataset: { elementId: 'btn-1' }
    };

    currentTarget = {
      tagName: 'BUTTON',
      dataset: { elementId: 'btn-1' }
    };

    nativeEvent = {
      type: 'click',
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 200,
      pageX: 150,
      pageY: 250,
      screenX: 500,
      screenY: 600,
      button: 0,
      buttons: 1,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      key: '',
      keyCode: 0,
      target: target,
      touches: [],
      changedTouches: [],
      targetTouches: [],
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      stopImmediatePropagation: jest.fn(),
      timeStamp: Date.now()
    };

    syntheticEvent = new SyntheticEvent(nativeEvent, 'click', target, currentTarget);
  });

  describe('Construction', () => {
    it('should create SyntheticEvent with properties', () => {
      expect(syntheticEvent.type).toBe('click');
      expect(syntheticEvent.target).toBe(target);
      expect(syntheticEvent.currentTarget).toBe(currentTarget);
      expect(syntheticEvent.nativeEvent).toBe(nativeEvent);
    });

    it('should copy mouse properties', () => {
      expect(syntheticEvent.clientX).toBe(100);
      expect(syntheticEvent.clientY).toBe(200);
      expect(syntheticEvent.pageX).toBe(150);
      expect(syntheticEvent.pageY).toBe(250);
      expect(syntheticEvent.screenX).toBe(500);
      expect(syntheticEvent.screenY).toBe(600);
      expect(syntheticEvent.button).toBe(0);
      expect(syntheticEvent.buttons).toBe(1);
    });

    it('should copy modifier keys', () => {
      const eventWithModifiers = new SyntheticEvent(
        {
          ...nativeEvent,
          altKey: true,
          ctrlKey: true,
          metaKey: true,
          shiftKey: true
        },
        'keydown',
        target,
        currentTarget
      );

      expect(eventWithModifiers.altKey).toBe(true);
      expect(eventWithModifiers.ctrlKey).toBe(true);
      expect(eventWithModifiers.metaKey).toBe(true);
      expect(eventWithModifiers.shiftKey).toBe(true);
    });

    it('should copy keyboard properties', () => {
      const keyEvent = new SyntheticEvent(
        {
          ...nativeEvent,
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13
        },
        'keydown',
        target,
        currentTarget
      );

      expect(keyEvent.key).toBe('Enter');
      expect(keyEvent.code).toBe('Enter');
      expect(keyEvent.keyCode).toBe(13);
      expect(keyEvent.which).toBe(13);
    });

    it('should copy input properties', () => {
      const inputTarget = {
        ...target,
        value: 'input-value',
        checked: true
      };

      const inputEvent = new SyntheticEvent(
        { ...nativeEvent, target: inputTarget },
        'change',
        inputTarget,
        inputTarget
      );

      expect(inputEvent.value).toBe('input-value');
      expect(inputEvent.checked).toBe(true);
    });

    it('should copy touch properties', () => {
      const touchEvent = new SyntheticEvent(
        {
          ...nativeEvent,
          touches: [{ clientX: 100, clientY: 200 }],
          changedTouches: [{ clientX: 110, clientY: 210 }],
          targetTouches: [{ clientX: 100, clientY: 200 }]
        },
        'touchstart',
        target,
        currentTarget
      );

      expect(touchEvent.touches.length).toBe(1);
      expect(touchEvent.changedTouches.length).toBe(1);
      expect(touchEvent.targetTouches.length).toBe(1);
    });
  });

  describe('Event Control', () => {
    it('should prevent default', () => {
      syntheticEvent.preventDefault();

      expect(syntheticEvent.defaultPrevented).toBe(true);
      expect(nativeEvent.preventDefault).toHaveBeenCalled();
    });

    it('should stop propagation', () => {
      syntheticEvent.stopPropagation();

      expect(syntheticEvent.isPropagationStopped).toBe(true);
      expect(nativeEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should stop immediate propagation', () => {
      syntheticEvent.stopImmediatePropagation();

      expect(syntheticEvent.isImmediatePropagationStopped).toBe(true);
      expect(syntheticEvent.isPropagationStopped).toBe(true);
      expect(nativeEvent.stopImmediatePropagation).toHaveBeenCalled();
    });

    it('should track all control flags independently', () => {
      expect(syntheticEvent.defaultPrevented).toBe(false);
      expect(syntheticEvent.isPropagationStopped).toBe(false);
      expect(syntheticEvent.isImmediatePropagationStopped).toBe(false);

      syntheticEvent.preventDefault();
      expect(syntheticEvent.defaultPrevented).toBe(true);
      expect(syntheticEvent.isPropagationStopped).toBe(false);

      syntheticEvent.stopPropagation();
      expect(syntheticEvent.isPropagationStopped).toBe(true);
      expect(syntheticEvent.isImmediatePropagationStopped).toBe(false);
    });
  });

  describe('toString', () => {
    it('should provide useful string representation', () => {
      const str = syntheticEvent.toString();

      expect(str).toContain('SyntheticEvent');
      expect(str).toContain('click');
      expect(str).toContain('BUTTON');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing native event properties', () => {
      const minimalEvent = {
        type: 'click'
      };

      const event = new SyntheticEvent(minimalEvent, 'click', target, currentTarget);

      expect(event.clientX).toBe(0);
      expect(event.clientY).toBe(0);
      expect(event.key).toBe('');
      expect(event.button).toBe(-1);
    });

    it('should handle null native event methods', () => {
      const eventNoMethods = {
        type: 'click',
        target: target
      };

      expect(() => {
        const event = new SyntheticEvent(eventNoMethods, 'click', target, currentTarget);
        event.preventDefault();
        event.stopPropagation();
      }).not.toThrow();
    });
  });
});

describe('EventSystem', () => {
  let runtime;
  let eventSystem;
  let rootElement;

  beforeEach(() => {
    runtime = new MockRuntime();
    eventSystem = new EventSystem(runtime, { enableDebug: false });

    // Create mock DOM structure
    rootElement = {
      tagName: 'DIV',
      dataset: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      parentElement: null
    };
  });

  describe('Construction & Initialization', () => {
    it('should create EventSystem with runtime', () => {
      expect(eventSystem.runtime).toBe(runtime);
      expect(eventSystem.initialized).toBe(false);
    });

    it('should throw error without runtime', () => {
      expect(() => new EventSystem(null)).toThrow();
    });

    it('should initialize with root element', () => {
      eventSystem.initialize(rootElement);

      expect(eventSystem.initialized).toBe(true);
      expect(eventSystem.rootElement).toBe(rootElement);
      expect(rootElement.addEventListener).toHaveBeenCalled();
    });

    it('should throw error on invalid root element', () => {
      expect(() => eventSystem.initialize(null)).toThrow();
      expect(() => eventSystem.initialize('not-element')).toThrow();
    });

    it('should warn if already initialized', () => {
      eventSystem.initialize(rootElement);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      eventSystem.initialize(rootElement);

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should attach delegated listeners for all event types', () => {
      eventSystem.initialize(rootElement);

      expect(rootElement.addEventListener).toHaveBeenCalledTimes(
        eventSystem.delegatedEvents.size
      );
    });
  });

  describe('Handler Registration', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
    });

    it('should register handler', () => {
      const handler = jest.fn();
      eventSystem.registerHandler('elem-1', 'click', handler);

      expect(eventSystem.hasHandlers('elem-1', 'click')).toBe(true);
      expect(eventSystem.getHandlerCount('elem-1', 'click')).toBe(1);
    });

    it('should register multiple handlers for same element', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventSystem.registerHandler('elem-1', 'click', handler1);
      eventSystem.registerHandler('elem-1', 'click', handler2);

      expect(eventSystem.getHandlerCount('elem-1', 'click')).toBe(2);
    });

    it('should register handlers for multiple event types', () => {
      const clickHandler = jest.fn();
      const changeHandler = jest.fn();

      eventSystem.registerHandler('elem-1', 'click', clickHandler);
      eventSystem.registerHandler('elem-1', 'change', changeHandler);

      expect(eventSystem.hasHandlers('elem-1', 'click')).toBe(true);
      expect(eventSystem.hasHandlers('elem-1', 'change')).toBe(true);
    });

    it('should throw on invalid element ID', () => {
      expect(() => eventSystem.registerHandler(null, 'click', () => {})).toThrow();
      expect(() => eventSystem.registerHandler('', 'click', () => {})).toThrow();
    });

    it('should throw on invalid event type', () => {
      expect(() => eventSystem.registerHandler('elem-1', null, () => {})).toThrow();
      expect(() => eventSystem.registerHandler('elem-1', '', () => {})).toThrow();
    });

    it('should throw on invalid handler', () => {
      expect(() => eventSystem.registerHandler('elem-1', 'click', 'not-function')).toThrow();
      expect(() => eventSystem.registerHandler('elem-1', 'click', null)).toThrow();
    });

    it('should track statistics', () => {
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'click', jest.fn());

      expect(eventSystem.stats.handlersRegistered).toBe(2);
    });
  });

  describe('Handler Unregistration', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'change', jest.fn());
    });

    it('should unregister specific handler', () => {
      const handlers = eventSystem.handlerRegistry.get('elem-1')['click'];
      const handler = handlers[0];

      eventSystem.unregisterHandler('elem-1', 'click', handler);

      expect(eventSystem.getHandlerCount('elem-1', 'click')).toBe(1);
    });

    it('should unregister all handlers for event type', () => {
      eventSystem.unregisterHandler('elem-1', 'click');

      expect(eventSystem.hasHandlers('elem-1', 'click')).toBe(false);
      expect(eventSystem.hasHandlers('elem-1', 'change')).toBe(true);
    });

    it('should unregister all handlers for element', () => {
      eventSystem.unregisterHandler('elem-1');

      expect(eventSystem.hasHandlers('elem-1', 'click')).toBe(false);
      expect(eventSystem.hasHandlers('elem-1', 'change')).toBe(false);
      expect(eventSystem.getHandlerCount('elem-1')).toBe(0);
    });

    it('should track unregistration statistics', () => {
      eventSystem.unregisterHandler('elem-1');

      expect(eventSystem.stats.handlersUnregistered).toBeGreaterThan(0);
    });

    it('should handle unregistering non-existent handlers gracefully', () => {
      expect(() => eventSystem.unregisterHandler('non-existent')).not.toThrow();
      expect(() => eventSystem.unregisterHandler('elem-1', 'non-existent')).not.toThrow();
    });
  });

  describe('Handler Queries', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'change', jest.fn());
      eventSystem.registerHandler('elem-2', 'click', jest.fn());
    });

    it('should check if element has handlers', () => {
      expect(eventSystem.hasHandlers('elem-1')).toBe(true);
      expect(eventSystem.hasHandlers('elem-1', 'click')).toBe(true);
      expect(eventSystem.hasHandlers('elem-1', 'change')).toBe(true);
      expect(eventSystem.hasHandlers('elem-1', 'input')).toBe(false);
      expect(eventSystem.hasHandlers('non-existent')).toBe(false);
    });

    it('should get handler count', () => {
      expect(eventSystem.getHandlerCount('elem-1')).toBe(2);
      expect(eventSystem.getHandlerCount('elem-1', 'click')).toBe(1);
      expect(eventSystem.getHandlerCount('elem-2')).toBe(1);
      expect(eventSystem.getHandlerCount('non-existent')).toBe(0);
    });

    it('should get event types for element', () => {
      const eventTypes = eventSystem.getEventTypes('elem-1');

      expect(eventTypes).toContain('click');
      expect(eventTypes).toContain('change');
      expect(eventTypes.length).toBe(2);
    });

    it('should return empty array for element with no handlers', () => {
      const eventTypes = eventSystem.getEventTypes('non-existent');

      expect(eventTypes).toEqual([]);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
    });

    it('should batch register multiple handlers', () => {
      const handlers = {
        click: jest.fn(),
        change: jest.fn(),
        input: jest.fn()
      };

      eventSystem.batchRegister('elem-1', handlers);

      expect(eventSystem.getHandlerCount('elem-1')).toBe(3);
      expect(eventSystem.hasHandlers('elem-1', 'click')).toBe(true);
      expect(eventSystem.hasHandlers('elem-1', 'change')).toBe(true);
      expect(eventSystem.hasHandlers('elem-1', 'input')).toBe(true);
    });

    it('should batch unregister all handlers', () => {
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'change', jest.fn());
      eventSystem.registerHandler('elem-1', 'input', jest.fn());

      eventSystem.batchUnregister('elem-1');

      expect(eventSystem.getHandlerCount('elem-1')).toBe(0);
    });

    it('should ignore non-function values in batch register', () => {
      const handlers = {
        click: jest.fn(),
        change: 'not-a-function',
        input: jest.fn()
      };

      eventSystem.batchRegister('elem-1', handlers);

      expect(eventSystem.getHandlerCount('elem-1')).toBe(2);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'change', jest.fn());
      eventSystem.registerHandler('elem-2', 'click', jest.fn());
    });

    it('should clear element handlers', () => {
      eventSystem.clearElement('elem-1');

      expect(eventSystem.getHandlerCount('elem-1')).toBe(0);
      expect(eventSystem.getHandlerCount('elem-2')).toBe(1);
    });

    it('should clear all handlers', () => {
      eventSystem.clearAll();

      expect(eventSystem.getHandlerCount('elem-1')).toBe(0);
      expect(eventSystem.getHandlerCount('elem-2')).toBe(0);
      expect(eventSystem.handlerRegistry.size).toBe(0);
    });

    it('should dispose event system', () => {
      eventSystem.dispose();

      expect(eventSystem.initialized).toBe(false);
      expect(eventSystem.rootElement).toBeNull();
      expect(rootElement.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
    });

    it('should provide event statistics', () => {
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-2', 'change', jest.fn());

      const stats = eventSystem.getStats();

      expect(stats.handlersRegistered).toBe(3);
      expect(stats.elementsWithHandlers).toBe(2);
      expect(stats.totalHandlers).toBe(3);
      expect(stats.delegatedEventsCount).toBe(eventSystem.delegatedEvents.size);
    });

    it('should calculate average handlers per element', () => {
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-2', 'click', jest.fn());

      const stats = eventSystem.getStats();

      expect(stats.averageHandlersPerElement).toBe(2); // 3 handlers / 2 elements = 1.5, rounded
    });
  });

  describe('Detailed Information', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'change', jest.fn());
    });

    it('should provide detailed info for specific element', () => {
      const info = eventSystem.getDetailedInfo('elem-1');

      expect(info.elementId).toBe('elem-1');
      expect(info.hasHandlers).toBe(true);
      expect(info.handlers.click).toBeDefined();
      expect(info.handlers.change).toBeDefined();
    });

    it('should provide detailed info for all elements', () => {
      eventSystem.registerHandler('elem-2', 'input', jest.fn());

      const info = eventSystem.getDetailedInfo();

      expect(info.totalElements).toBe(2);
      expect(info.elements['elem-1']).toBeDefined();
      expect(info.elements['elem-2']).toBeDefined();
    });

    it('should show hasHandlers correctly', () => {
      const withHandlers = eventSystem.getDetailedInfo('elem-1');
      const withoutHandlers = eventSystem.getDetailedInfo('non-existent');

      expect(withHandlers.hasHandlers).toBe(true);
      expect(withoutHandlers.hasHandlers).toBe(false);
    });
  });

  describe('Event Delegation Listener Creation', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
    });

    it('should create delegated listener for each event type', () => {
      eventSystem.delegatedEvents.forEach(eventType => {
        expect(eventSystem.nativeListeners.has(eventType)).toBe(true);
      });
    });

    it('should attach listeners with capture phase', () => {
      const addEventListenerCalls = rootElement.addEventListener.mock.calls;

      addEventListenerCalls.forEach(([event, listener, useCapture]) => {
        expect(useCapture).toBe(true); // Capture phase
      });
    });
  });

  describe('Edge Cases & Error Handling', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
    });

    it('should handle empty handler registry gracefully', () => {
      expect(eventSystem.getHandlerCount('non-existent')).toBe(0);
      expect(eventSystem.getEventTypes('non-existent')).toEqual([]);
      expect(eventSystem.hasHandlers('non-existent')).toBe(false);
    });

    it('should handle very large handler counts', () => {
      for (let i = 0; i < 100; i++) {
        eventSystem.registerHandler('elem-1', 'click', jest.fn());
      }

      expect(eventSystem.getHandlerCount('elem-1', 'click')).toBe(100);
    });

    it('should handle many different elements', () => {
      for (let i = 0; i < 100; i++) {
        eventSystem.registerHandler(`elem-${i}`, 'click', jest.fn());
      }

      expect(eventSystem.handlerRegistry.size).toBe(100);
    });

    it('should handle handler errors gracefully', () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      eventSystem.registerHandler('elem-1', 'click', errorHandler);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Simulate event dispatch
      eventSystem.dispatchToHandlers('elem-1', 'click', {
        type: 'click',
        target: { dataset: { elementId: 'elem-1' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Custom Events', () => {
    beforeEach(() => {
      eventSystem.initialize(rootElement);
    });

    it('should dispatch custom event', () => {
      const handler = jest.fn();
      const element = { dataset: { elementId: 'elem-1' } };

      eventSystem.registerHandler('elem-1', 'customEvent', handler);
      eventSystem.dispatchCustomEvent(element, 'customEvent', {});

      expect(handler).toHaveBeenCalled();
    });

    it('should throw on null element for custom event', () => {
      expect(() => eventSystem.dispatchCustomEvent(null, 'click', {})).toThrow();
    });
  });

  describe('Configuration Options', () => {
    it('should accept configuration options', () => {
      const eventSys = new EventSystem(runtime, {
        enableDebug: true,
        maxEventListeners: 5000,
        eventPoolSize: 50
      });

      expect(eventSys.config.enableDebug).toBe(true);
      expect(eventSys.config.maxEventListeners).toBe(5000);
      expect(eventSys.config.eventPoolSize).toBe(50);
    });

    it('should use default configuration', () => {
      const eventSys = new EventSystem(runtime);

      expect(eventSys.config.enableDebug).toBe(false);
      expect(eventSys.config.maxEventListeners).toBe(10000);
    });
  });
});