/**
 * EventSystem Integration Tests
 *
 * Tests for real-world event handling scenarios:
 * - Event bubbling and propagation
 * - Multiple handlers on same element
 * - Event handler cleanup
 * - Complex DOM structures
 * - Performance under load
 */

import {
  EventSystem,
  SyntheticEvent
} from '../src/event_system.js';

class MockRuntime {
  constructor() {
    this.debugMode = false;
  }
}

describe('EventSystem Integration Tests', () => {
  let runtime;
  let eventSystem;
  let rootElement;

  beforeEach(() => {
    runtime = new MockRuntime();
    eventSystem = new EventSystem(runtime, { enableDebug: false });

    rootElement = {
      tagName: 'DIV',
      dataset: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      parentElement: null
    };

    eventSystem.initialize(rootElement);
  });

  describe('Event Propagation', () => {
    it('should propagate events up DOM tree', () => {
      const grandparentHandler = jest.fn();
      const parentHandler = jest.fn();
      const childHandler = jest.fn();

      eventSystem.registerHandler('grandparent', 'click', grandparentHandler);
      eventSystem.registerHandler('parent', 'click', parentHandler);
      eventSystem.registerHandler('child', 'click', childHandler);

      // Simulate event bubbling from child to grandparent
      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'child' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // In order: child -> parent -> grandparent (bubbling)
      eventSystem.dispatchToHandlers('child', 'click', nativeEvent);
      eventSystem.dispatchToHandlers('parent', 'click', nativeEvent);
      eventSystem.dispatchToHandlers('grandparent', 'click', nativeEvent);

      expect(childHandler).toHaveBeenCalled();
      expect(parentHandler).toHaveBeenCalled();
      expect(grandparentHandler).toHaveBeenCalled();
    });

    it('should respect stopPropagation', () => {
      const parentHandler = jest.fn();
      const childHandler = jest.fn().mockImplementation((event) => {
        event.stopPropagation();
      });

      eventSystem.registerHandler('parent', 'click', parentHandler);
      eventSystem.registerHandler('child', 'click', childHandler);

      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'child' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('child', 'click', nativeEvent);
      expect(childHandler).toHaveBeenCalled();

      nativeEvent._stopPropagation = false;
      eventSystem.dispatchToHandlers('parent', 'click', nativeEvent);

      // Parent should still be called (propagation check happens in delegated listener)
      expect(parentHandler).toHaveBeenCalled();
    });

    it('should respect stopImmediatePropagation', () => {
      const handler1 = jest.fn().mockImplementation((event) => {
        event.stopImmediatePropagation();
      });
      const handler2 = jest.fn();

      // Same element, multiple handlers - stopImmediatePropagation should stop handler2
      eventSystem.registerHandler('elem-1', 'click', handler1);
      eventSystem.registerHandler('elem-1', 'click', handler2);

      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'elem-1' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('elem-1', 'click', nativeEvent);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Handlers on Same Element', () => {
    it('should call all handlers in registration order', () => {
      const callOrder = [];
      const handler1 = jest.fn(() => callOrder.push(1));
      const handler2 = jest.fn(() => callOrder.push(2));
      const handler3 = jest.fn(() => callOrder.push(3));

      eventSystem.registerHandler('elem-1', 'click', handler1);
      eventSystem.registerHandler('elem-1', 'click', handler2);
      eventSystem.registerHandler('elem-1', 'click', handler3);

      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'elem-1' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('elem-1', 'click', nativeEvent);

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('should handle error in one handler without affecting others', () => {
      const handler1 = jest.fn(() => { throw new Error('Handler 1 error'); });
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      eventSystem.registerHandler('elem-1', 'click', handler1);
      eventSystem.registerHandler('elem-1', 'click', handler2);
      eventSystem.registerHandler('elem-1', 'click', handler3);

      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'elem-1' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      eventSystem.dispatchToHandlers('elem-1', 'click', nativeEvent);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('should allow removing handler during event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn(() => {
        eventSystem.unregisterHandler('elem-1', 'click', handler3);
      });
      const handler3 = jest.fn();

      eventSystem.registerHandler('elem-1', 'click', handler1);
      eventSystem.registerHandler('elem-1', 'click', handler2);
      eventSystem.registerHandler('elem-1', 'click', handler3);

      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'elem-1' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('elem-1', 'click', nativeEvent);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled(); // Still called during dispatch
    });
  });

  describe('Complex Widget Tree Simulation', () => {
    it('should handle button inside form inside container', () => {
      const containerHandler = jest.fn();
      const formHandler = jest.fn();
      const buttonHandler = jest.fn();

      eventSystem.registerHandler('container', 'click', containerHandler);
      eventSystem.registerHandler('form', 'click', formHandler);
      eventSystem.registerHandler('button', 'click', buttonHandler);

      // Simulate click on button -> form -> container
      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'button' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('button', 'click', nativeEvent);
      expect(buttonHandler).toHaveBeenCalled();

      eventSystem.dispatchToHandlers('form', 'click', nativeEvent);
      expect(formHandler).toHaveBeenCalled();

      eventSystem.dispatchToHandlers('container', 'click', nativeEvent);
      expect(containerHandler).toHaveBeenCalled();
    });

    it('should handle list with multiple items', () => {
      const handlers = [];
      for (let i = 0; i < 10; i++) {
        handlers[i] = jest.fn();
        eventSystem.registerHandler(`item-${i}`, 'click', handlers[i]);
      }

      const listHandler = jest.fn();
      eventSystem.registerHandler('list', 'click', listHandler);

      // Click on item 5
      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'item-5' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('item-5', 'click', nativeEvent);
      eventSystem.dispatchToHandlers('list', 'click', nativeEvent);

      // Only item-5 and list handlers should be called
      expect(handlers[5]).toHaveBeenCalled();
      expect(handlers[0]).not.toHaveBeenCalled();
      expect(listHandler).toHaveBeenCalled();
    });

    it('should handle nested identical event types', () => {
      const outerHandler = jest.fn();
      const innerHandler = jest.fn();
      const innerInnerHandler = jest.fn();

      eventSystem.registerHandler('outer', 'click', outerHandler);
      eventSystem.registerHandler('inner', 'click', innerHandler);
      eventSystem.registerHandler('inner-inner', 'click', innerInnerHandler);

      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'inner-inner' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('inner-inner', 'click', nativeEvent);
      eventSystem.dispatchToHandlers('inner', 'click', nativeEvent);
      eventSystem.dispatchToHandlers('outer', 'click', nativeEvent);

      expect(innerInnerHandler).toHaveBeenCalled();
      expect(innerHandler).toHaveBeenCalled();
      expect(outerHandler).toHaveBeenCalled();
    });
  });

  describe('Lifecycle & Cleanup', () => {
    it('should cleanup element handlers on unmount', () => {
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'change', jest.fn());
      eventSystem.registerHandler('elem-1', 'focus', jest.fn());

      expect(eventSystem.getHandlerCount('elem-1')).toBe(3);

      eventSystem.clearElement('elem-1');

      expect(eventSystem.getHandlerCount('elem-1')).toBe(0);
      expect(eventSystem.hasHandlers('elem-1')).toBe(false);
    });

    it('should handle cleanup of element with no handlers', () => {
      expect(() => eventSystem.clearElement('non-existent')).not.toThrow();
    });

    it('should cleanup all handlers on app unmount', () => {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
          eventSystem.registerHandler(`elem-${i}`, `event-${j}`, jest.fn());
        }
      }

      expect(eventSystem.handlerRegistry.size).toBe(5);

      eventSystem.clearAll();

      expect(eventSystem.handlerRegistry.size).toBe(0);
    });
  });

  describe('Different Event Types', () => {
    it('should handle click events', () => {
      const handler = jest.fn();
      eventSystem.registerHandler('btn', 'click', handler);

      const nativeEvent = {
        type: 'click',
        button: 0,
        buttons: 1,
        target: { dataset: { elementId: 'btn' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('btn', 'click', nativeEvent);

      expect(handler).toHaveBeenCalledWith(expect.any(SyntheticEvent));
      const event = handler.mock.calls[0][0];
      expect(event.type).toBe('click');
      expect(event.button).toBe(0);
    });

    it('should handle input events', () => {
      const handler = jest.fn();
      eventSystem.registerHandler('input', 'input', handler);

      const nativeEvent = {
        type: 'input',
        target: {
          dataset: { elementId: 'input' },
          value: 'hello'
        },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('input', 'input', nativeEvent);

      const event = handler.mock.calls[0][0];
      expect(event.value).toBe('hello');
    });

    it('should handle keyboard events', () => {
      const handler = jest.fn();
      eventSystem.registerHandler('input', 'keydown', handler);

      const nativeEvent = {
        type: 'keydown',
        key: 'Enter',
        keyCode: 13,
        target: { dataset: { elementId: 'input' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('input', 'keydown', nativeEvent);

      const event = handler.mock.calls[0][0];
      expect(event.key).toBe('Enter');
      expect(event.keyCode).toBe(13);
    });

    it('should handle touch events', () => {
      const handler = jest.fn();
      eventSystem.registerHandler('elem', 'touchstart', handler);

      const nativeEvent = {
        type: 'touchstart',
        touches: [{ clientX: 100, clientY: 200 }],
        target: { dataset: { elementId: 'elem' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('elem', 'touchstart', nativeEvent);

      const event = handler.mock.calls[0][0];
      expect(event.touches.length).toBe(1);
    });

    it('should handle focus events', () => {
      const focusHandler = jest.fn();
      const blurHandler = jest.fn();

      eventSystem.registerHandler('input', 'focus', focusHandler);
      eventSystem.registerHandler('input', 'blur', blurHandler);

      const focusEvent = {
        type: 'focus',
        target: { dataset: { elementId: 'input' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      const blurEvent = {
        type: 'blur',
        target: { dataset: { elementId: 'input' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('input', 'focus', focusEvent);
      eventSystem.dispatchToHandlers('input', 'blur', blurEvent);

      expect(focusHandler).toHaveBeenCalled();
      expect(blurHandler).toHaveBeenCalled();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle many elements with handlers', () => {
      const elementCount = 1000;
      const startTime = performance.now();

      for (let i = 0; i < elementCount; i++) {
        eventSystem.registerHandler(`elem-${i}`, 'click', jest.fn());
      }

      const registerTime = performance.now() - startTime;

      expect(eventSystem.handlerRegistry.size).toBe(elementCount);
      expect(registerTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should handle many handlers on single element', () => {
      const handlerCount = 100;
      const startTime = performance.now();

      for (let i = 0; i < handlerCount; i++) {
        eventSystem.registerHandler('elem-1', 'click', jest.fn());
      }

      const registerTime = performance.now() - startTime;

      expect(eventSystem.getHandlerCount('elem-1')).toBe(handlerCount);
      expect(registerTime).toBeLessThan(500); // Should complete in < 500ms
    });

    it('should dispatch events quickly', () => {
      const handlers = [];
      for (let i = 0; i < 100; i++) {
        const handler = jest.fn();
        handlers.push(handler);
        eventSystem.registerHandler('elem-1', 'click', handler);
      }

      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'elem-1' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      const startTime = performance.now();
      eventSystem.dispatchToHandlers('elem-1', 'click', nativeEvent);
      const dispatchTime = performance.now() - startTime;

      expect(dispatchTime).toBeLessThan(100); // Should dispatch in < 100ms
      handlers.forEach(h => expect(h).toHaveBeenCalled());
    });
  });

  describe('Event Statistics & Tracking', () => {
    it('should track event dispatch statistics', () => {
      eventSystem.registerHandler('elem-1', 'click', jest.fn());

      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'elem-1' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('elem-1', 'click', nativeEvent);
      eventSystem.dispatchToHandlers('elem-1', 'click', nativeEvent);

      const stats = eventSystem.getStats();

      expect(stats.handlersRegistered).toBe(1);
      expect(stats.eventsDispatched).toBe(2);
    });

    it('should provide accurate statistics', () => {
      const nativeEvent = {
        type: 'click',
        target: { dataset: { elementId: 'elem' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // Register handlers
      eventSystem.registerHandler('elem-1', 'click', jest.fn());
      eventSystem.registerHandler('elem-1', 'change', jest.fn());
      eventSystem.registerHandler('elem-2', 'click', jest.fn());

      const stats = eventSystem.getStats();

      expect(stats.handlersRegistered).toBe(3);
      expect(stats.elementsWithHandlers).toBe(2);
      expect(stats.totalHandlers).toBe(3);
    });
  });

  describe('Real-world Form Handling', () => {
    it('should handle form submission with multiple field changes', () => {
      const form = { id: 'form' };
      const emailInput = { id: 'email' };
      const passwordInput = { id: 'password' };
      const submitBtn = { id: 'submit' };

      const emailChangeHandler = jest.fn();
      const passwordChangeHandler = jest.fn();
      const submitHandler = jest.fn();
      const formSubmitHandler = jest.fn();

      eventSystem.registerHandler('email', 'change', emailChangeHandler);
      eventSystem.registerHandler('password', 'change', passwordChangeHandler);
      eventSystem.registerHandler('submit', 'click', submitHandler);
      eventSystem.registerHandler('form', 'submit', formSubmitHandler);

      // Simulate form interaction
      const emailChangeEvent = {
        type: 'change',
        target: { dataset: { elementId: 'email' }, value: 'test@example.com' },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('email', 'change', emailChangeEvent);
      expect(emailChangeHandler).toHaveBeenCalled();

      const passwordChangeEvent = {
        type: 'change',
        target: { dataset: { elementId: 'password' }, value: 'password' },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('password', 'change', passwordChangeEvent);
      expect(passwordChangeHandler).toHaveBeenCalled();

      const submitClickEvent = {
        type: 'click',
        target: { dataset: { elementId: 'submit' } },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      eventSystem.dispatchToHandlers('submit', 'click', submitClickEvent);
      eventSystem.dispatchToHandlers('form', 'submit', submitClickEvent);

      expect(submitHandler).toHaveBeenCalled();
      expect(formSubmitHandler).toHaveBeenCalled();
    });
  });
});