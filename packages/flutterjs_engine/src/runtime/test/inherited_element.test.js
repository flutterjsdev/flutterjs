/**
 * InheritedElement & InheritedWidget Test Suite
 *
 * Tests for:
 * - InheritedElement dependency tracking
 * - InheritedWidget value propagation
 * - Dependent notifications
 * - ChangeNotifier and ValueNotifier
 * - Provider pattern
 * - Memory cleanup
 */

import {
  InheritedElement,
  InheritedWidget,
  ValueNotifier,
  Provider,
  ChangeNotifier
} from '../src/inherited_element.js';
import { StatefulElement, StatelessElement } from '../src/element.js';
import { BuildContext } from '../src/build_context.js';
import { State } from '../src/state.js';

// Mock classes for testing
class MockWidget {
  constructor(name) {
    this.name = name;
    this.key = null;
  }
}

class MockElement extends Element {
  constructor(widget, parent, runtime) {
    super(widget, parent, runtime);
  }

  build() {
    return { tag: 'div', children: [] };
  }
}

class MockRuntime {
  constructor() {
    this.debugMode = false;
    this.serviceRegistry = new Map();
  }
}

class TestTheme extends InheritedWidget {
  constructor({ data, child, key }) {
    super({ data, child, key });
  }

  updateShouldNotify(oldWidget) {
    return this.data !== oldWidget.data;
  }

  static of(context) {
    return context.dependOnInheritedWidgetOfExactType(TestTheme);
  }
}

// Test Suite
describe('InheritedElement', () => {
  let runtime;
  let parentElement;
  let inheritedWidget;
  let inheritedElement;

  beforeEach(() => {
    runtime = new MockRuntime();
    parentElement = new MockElement(new MockWidget('parent'), null, runtime);
    parentElement.mounted = true;

    inheritedWidget = new TestTheme({
      data: { color: 'blue' },
      child: new MockWidget('child')
    });

    inheritedElement = new InheritedElement(inheritedWidget, parentElement, runtime);
    inheritedElement.mounted = true;
  });

  describe('Construction & Initialization', () => {
    it('should create InheritedElement with widget', () => {
      expect(inheritedElement.widget).toBe(inheritedWidget);
      expect(inheritedElement.parent).toBe(parentElement);
      expect(inheritedElement.dependents.size).toBe(0);
    });

    it('should throw error if widget has no child', () => {
      const badWidget = new InheritedWidget({ child: null });
      expect(() => {
        new InheritedElement(badWidget, parentElement, runtime);
      }).not.toThrow(); // Should not throw on creation

      const element = new InheritedElement(badWidget, parentElement, runtime);
      expect(() => element.build()).toThrow();
    });

    it('should cache inherited value', () => {
      const widget = new TestTheme({
        data: { color: 'red', theme: 'dark' },
        child: new MockWidget('child')
      });
      const element = new InheritedElement(widget, parentElement, runtime);

      expect(element._inheritedValue).toEqual({ color: 'red', theme: 'dark' });
    });

    it('should handle null data gracefully', () => {
      const widget = new TestTheme({
        data: null,
        child: new MockWidget('child')
      });
      const element = new InheritedElement(widget, parentElement, runtime);

      expect(element._inheritedValue).toBeNull();
    });
  });

  describe('Dependent Management', () => {
    let dependent1;
    let dependent2;

    beforeEach(() => {
      dependent1 = new MockElement(new MockWidget('dependent1'), inheritedElement, runtime);
      dependent2 = new MockElement(new MockWidget('dependent2'), inheritedElement, runtime);
      dependent1.mounted = true;
      dependent2.mounted = true;
    });

    it('should add dependent', () => {
      inheritedElement.addDependent(dependent1);

      expect(inheritedElement.dependents.has(dependent1)).toBe(true);
      expect(inheritedElement.dependentCount).toBe(1);
    });

    it('should add multiple dependents', () => {
      inheritedElement.addDependent(dependent1);
      inheritedElement.addDependent(dependent2);

      expect(inheritedElement.dependentCount).toBe(2);
      expect(inheritedElement.dependents.has(dependent1)).toBe(true);
      expect(inheritedElement.dependents.has(dependent2)).toBe(true);
    });

    it('should not duplicate dependents', () => {
      inheritedElement.addDependent(dependent1);
      inheritedElement.addDependent(dependent1);

      expect(inheritedElement.dependentCount).toBe(1);
    });

    it('should throw error on null dependent', () => {
      expect(() => inheritedElement.addDependent(null)).toThrow();
    });

    it('should remove dependent', () => {
      inheritedElement.addDependent(dependent1);
      inheritedElement.addDependent(dependent2);

      inheritedElement.removeDependent(dependent1);

      expect(inheritedElement.dependents.has(dependent1)).toBe(false);
      expect(inheritedElement.dependents.has(dependent2)).toBe(true);
      expect(inheritedElement.dependentCount).toBe(1);
    });

    it('should handle removing non-existent dependent', () => {
      expect(() => inheritedElement.removeDependent(dependent1)).not.toThrow();
    });

    it('should check if element is dependent', () => {
      inheritedElement.addDependent(dependent1);

      expect(inheritedElement.hasDependent(dependent1)).toBe(true);
      expect(inheritedElement.hasDependent(dependent2)).toBe(false);
    });

    it('should get dependent count', () => {
      inheritedElement.addDependent(dependent1);
      inheritedElement.addDependent(dependent2);

      expect(inheritedElement.dependentCount).toBe(2);
    });
  });

  describe('Update & Notification', () => {
    let dependent1;
    let dependent2;

    beforeEach(() => {
      dependent1 = new MockElement(new MockWidget('dependent1'), inheritedElement, runtime);
      dependent2 = new MockElement(new MockWidget('dependent2'), inheritedElement, runtime);
      dependent1.mounted = true;
      dependent2.mounted = true;

      dependent1.markNeedsBuild = jest.fn();
      dependent2.markNeedsBuild = jest.fn();

      inheritedElement.addDependent(dependent1);
      inheritedElement.addDependent(dependent2);
    });

    it('should notify dependents on update', () => {
      const newWidget = new TestTheme({
        data: { color: 'red' },
        child: new MockWidget('child')
      });

      inheritedElement.update(newWidget);
      inheritedElement.notifyDependents();

      expect(dependent1.markNeedsBuild).toHaveBeenCalled();
      expect(dependent2.markNeedsBuild).toHaveBeenCalled();
    });

    it('should not notify if updateShouldNotify returns false', () => {
      inheritedWidget.updateShouldNotify = jest.fn().mockReturnValue(false);

      const newWidget = new TestTheme({
        data: { color: 'red' },
        child: new MockWidget('child')
      });

      inheritedElement.update(newWidget);

      expect(dependent1.markNeedsBuild).not.toHaveBeenCalled();
      expect(dependent2.markNeedsBuild).not.toHaveBeenCalled();
    });

    it('should respect updateShouldNotify optimization', () => {
      inheritedWidget.updateShouldNotify = jest.fn().mockReturnValue(false);

      const sameWidget = new TestTheme({
        data: inheritedWidget.data,
        child: new MockWidget('child')
      });

      inheritedElement.update(sameWidget);

      expect(inheritedWidget.updateShouldNotify).toHaveBeenCalledWith(inheritedWidget);
      expect(dependent1.markNeedsBuild).not.toHaveBeenCalled();
    });

    it('should skip unmounted dependents', () => {
      dependent1.mounted = false;

      inheritedElement.notifyDependents();

      expect(dependent1.markNeedsBuild).not.toHaveBeenCalled();
      expect(dependent2.markNeedsBuild).toHaveBeenCalled();
    });

    it('should skip already dirty dependents', () => {
      dependent1.dirty = true;

      inheritedElement.notifyDependents();

      expect(dependent1.markNeedsBuild).not.toHaveBeenCalled();
      expect(dependent2.markNeedsBuild).toHaveBeenCalled();
    });

    it('should prevent recursive notifications', () => {
      inheritedElement._notifying = true;

      inheritedElement.notifyDependents();

      expect(dependent1.markNeedsBuild).not.toHaveBeenCalled();
      expect(dependent2.markNeedsBuild).not.toHaveBeenCalled();
    });

    it('should notify specific dependents', () => {
      const specificSet = new Set([dependent1]);

      inheritedElement.notifySpecificDependents(specificSet);

      expect(dependent1.markNeedsBuild).toHaveBeenCalled();
      expect(dependent2.markNeedsBuild).not.toHaveBeenCalled();
    });
  });

  describe('Build & Rendering', () => {
    it('should build child widget', () => {
      const builtVNode = inheritedElement.build();

      expect(builtVNode).toBeDefined();
      expect(builtVNode.tag).toBe('div');
      expect(builtVNode.props['data-widget']).toBe('TestTheme');
      expect(builtVNode.metadata.isInheritedWidget).toBe(true);
    });

    it('should throw if child is missing', () => {
      const badWidget = new InheritedWidget({ child: null });
      const badElement = new InheritedElement(badWidget, parentElement, runtime);

      expect(() => badElement.build()).toThrow(/must have a child/);
    });
  });

  describe('Lifecycle Management', () => {
    let dependent;

    beforeEach(() => {
      dependent = new MockElement(new MockWidget('dependent'), inheritedElement, runtime);
      dependent.mounted = true;
      inheritedElement.addDependent(dependent);
    });

    it('should mount element', () => {
      inheritedElement.mount();

      expect(inheritedElement.mounted).toBe(true);
      expect(inheritedElement.dependentCount).toBe(1);
    });

    it('should unmount and cleanup dependents', () => {
      inheritedElement.unmount();

      expect(inheritedElement.mounted).toBe(false);
      expect(inheritedElement.dependentCount).toBe(0);
      expect(inheritedElement.dependents.size).toBe(0);
    });

    it('should clear all references on unmount', () => {
      inheritedElement.unmount();

      expect(inheritedElement.dependents.size).toBe(0);
      expect(inheritedElement.widget).not.toBeNull();
    });
  });

  describe('Statistics & Debugging', () => {
    let dependent1;
    let dependent2;

    beforeEach(() => {
      dependent1 = new MockElement(new MockWidget('dep1'), inheritedElement, runtime);
      dependent2 = new MockElement(new MockWidget('dep2'), inheritedElement, runtime);
      dependent1.mounted = true;
      dependent2.mounted = true;

      inheritedElement.addDependent(dependent1);
      inheritedElement.addDependent(dependent2);
    });

    it('should provide statistics', () => {
      const stats = inheritedElement.getStats();

      expect(stats.type).toBe('InheritedElement');
      expect(stats.inheritedValue).toEqual(inheritedWidget.data);
      expect(stats.dependentCount).toBe(2);
      expect(stats.dependents).toHaveLength(2);
    });

    it('should include dependent details in stats', () => {
      const stats = inheritedElement.getStats();

      const depDetails = stats.dependents;
      expect(depDetails[0].id).toBeDefined();
      expect(depDetails[0].type).toBe('MockElement');
      expect(depDetails[0].mounted).toBe(true);
    });
  });
});

describe('InheritedWidget', () => {
  it('should create InheritedWidget with child', () => {
    const child = new MockWidget('child');
    const widget = new InheritedWidget({ child, key: 'key1' });

    expect(widget.child).toBe(child);
    expect(widget.key).toBe('key1');
    expect(widget.type).toBe('InheritedWidget');
  });

  it('should throw error without child', () => {
    expect(() => new InheritedWidget({ child: null })).toThrow();
  });

  it('should handle data vs value parameter', () => {
    const widget1 = new InheritedWidget({ child: new MockWidget('c'), data: 'data1' });
    const widget2 = new InheritedWidget({ child: new MockWidget('c'), value: 'value1' });

    expect(widget1.data).toBe('data1');
    expect(widget2.data).toBe('value1');
  });

  it('should update should notify by default', () => {
    const widget1 = new InheritedWidget({ child: new MockWidget('c'), data: 'a' });
    const widget2 = new InheritedWidget({ child: new MockWidget('c'), data: 'b' });

    expect(widget1.updateShouldNotify(widget2)).toBe(true);
  });

  it('should not notify if data same', () => {
    const widget1 = new InheritedWidget({ child: new MockWidget('c'), data: 'same' });
    const widget2 = new InheritedWidget({ child: new MockWidget('c'), data: 'same' });

    expect(widget1.updateShouldNotify(widget2)).toBe(false);
  });

  it('should create element for widget', () => {
    const widget = new InheritedWidget({ child: new MockWidget('c') });
    const runtime = new MockRuntime();

    const element = widget.createElement(null, runtime);

    expect(element instanceof InheritedElement).toBe(true);
    expect(element.widget).toBe(widget);
  });

  it('should have static of method', () => {
    expect(typeof InheritedWidget.of).toBe('function');
  });
});

describe('ChangeNotifier', () => {
  let notifier;

  beforeEach(() => {
    notifier = new ChangeNotifier();
  });

  it('should add listener', () => {
    const listener = jest.fn();
    notifier.addListener(listener);

    expect(notifier.listenerCount).toBe(1);
  });

  it('should throw on non-function listener', () => {
    expect(() => notifier.addListener('not-a-function')).toThrow();
  });

  it('should remove listener', () => {
    const listener = jest.fn();
    notifier.addListener(listener);
    notifier.removeListener(listener);

    expect(notifier.listenerCount).toBe(0);
  });

  it('should notify all listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    notifier.addListener(listener1);
    notifier.addListener(listener2);

    notifier.notifyListeners();

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('should handle listener errors gracefully', () => {
    const badListener = jest.fn().mockImplementation(() => {
      throw new Error('Listener error');
    });
    const goodListener = jest.fn();

    notifier.addListener(badListener);
    notifier.addListener(goodListener);

    expect(() => notifier.notifyListeners()).not.toThrow();
    expect(goodListener).toHaveBeenCalled();
  });

  it('should remove all listeners', () => {
    notifier.addListener(() => {});
    notifier.addListener(() => {});
    notifier.addListener(() => {});

    expect(notifier.listenerCount).toBe(3);

    notifier.removeAllListeners();

    expect(notifier.listenerCount).toBe(0);
  });

  it('should check if has listeners', () => {
    expect(notifier.hasListeners()).toBe(false);

    notifier.addListener(() => {});

    expect(notifier.hasListeners()).toBe(true);
  });

  it('should dispose and clear listeners', () => {
    notifier.addListener(() => {});
    notifier.addListener(() => {});

    notifier.dispose();

    expect(notifier.listenerCount).toBe(0);
  });
});

describe('ValueNotifier', () => {
  let valueNotifier;

  beforeEach(() => {
    valueNotifier = new ValueNotifier(0);
  });

  it('should initialize with value', () => {
    expect(valueNotifier.value).toBe(0);
    expect(valueNotifier.getValue()).toBe(0);
  });

  it('should update value and notify', () => {
    const listener = jest.fn();
    valueNotifier.addListener(listener);

    valueNotifier.value = 5;

    expect(valueNotifier.value).toBe(5);
    expect(listener).toHaveBeenCalled();
  });

  it('should not notify if value same', () => {
    const listener = jest.fn();
    valueNotifier.addListener(listener);

    valueNotifier.value = 0;

    expect(listener).not.toHaveBeenCalled();
  });

  it('should set value with optional notification', () => {
    const listener = jest.fn();
    valueNotifier.addListener(listener);

    valueNotifier.setValue(10, false);

    expect(valueNotifier.value).toBe(10);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should set value and notify by default', () => {
    const listener = jest.fn();
    valueNotifier.addListener(listener);

    valueNotifier.setValue(15);

    expect(valueNotifier.value).toBe(15);
    expect(listener).toHaveBeenCalled();
  });

  it('should handle complex values', () => {
    const complexValue = { count: 0, name: 'test' };
    const cn = new ValueNotifier(complexValue);

    expect(cn.value).toEqual(complexValue);

    const newValue = { count: 1, name: 'updated' };
    cn.value = newValue;

    expect(cn.value).toEqual(newValue);
  });
});

describe('Provider', () => {
  let notifier;

  beforeEach(() => {
    notifier = new ValueNotifier({ theme: 'light' });
  });

  it('should create Provider with notifier', () => {
    const provider = new Provider({
      notifier,
      child: new MockWidget('child')
    });

    expect(provider.notifier).toBe(notifier);
  });

  it('should create Provider with static value', () => {
    const provider = new Provider({
      value: 'static-value',
      child: new MockWidget('child')
    });

    expect(provider.data).toBe('static-value');
  });

  it('should throw error if notifier not ChangeNotifier', () => {
    expect(() => {
      new Provider({
        notifier: 'not-a-notifier',
        child: new MockWidget('child')
      });
    }).toThrow();
  });

  it('should get value from notifier', () => {
    const provider = new Provider({
      notifier,
      child: new MockWidget('child')
    });

    expect(provider.getValue()).toEqual({ theme: 'light' });

    notifier.value = { theme: 'dark' };

    expect(provider.getValue()).toEqual({ theme: 'dark' });
  });

  it('should not notify if notifier same', () => {
    const provider1 = new Provider({
      notifier,
      child: new MockWidget('child')
    });

    const provider2 = new Provider({
      notifier, // same notifier
      child: new MockWidget('child')
    });

    expect(provider1.updateShouldNotify(provider2)).toBe(false);
  });

  it('should notify if notifier different', () => {
    const notifier2 = new ValueNotifier('different');

    const provider1 = new Provider({
      notifier,
      child: new MockWidget('child')
    });

    const provider2 = new Provider({
      notifier: notifier2,
      child: new MockWidget('child')
    });

    expect(provider1.updateShouldNotify(provider2)).toBe(true);
  });

  it('should notify if value different', () => {
    const provider1 = new Provider({
      value: 'value1',
      child: new MockWidget('child')
    });

    const provider2 = new Provider({
      value: 'value2',
      child: new MockWidget('child')
    });

    expect(provider1.updateShouldNotify(provider2)).toBe(true);
  });

  it('should have static of method', () => {
    expect(typeof Provider.of).toBe('function');
  });
});

describe('Integration Scenarios', () => {
  it('should handle deep dependent chains', () => {
    const runtime = new MockRuntime();
    const rootWidget = new TestTheme({
      data: { color: 'blue' },
      child: new MockWidget('child')
    });
    const rootElement = new InheritedElement(rootWidget, null, runtime);
    rootElement.mounted = true;

    // Create chain of dependents
    const dependent1 = new MockElement(new MockWidget('d1'), rootElement, runtime);
    const dependent2 = new MockElement(new MockWidget('d2'), dependent1, runtime);
    const dependent3 = new MockElement(new MockWidget('d3'), dependent2, runtime);

    dependent1.mounted = true;
    dependent2.mounted = true;
    dependent3.mounted = true;

    dependent1.markNeedsBuild = jest.fn();
    dependent2.markNeedsBuild = jest.fn();
    dependent3.markNeedsBuild = jest.fn();

    // Only direct dependents should be notified
    rootElement.addDependent(dependent1);
    rootElement.notifyDependents();

    expect(dependent1.markNeedsBuild).toHaveBeenCalled();
    expect(dependent2.markNeedsBuild).not.toHaveBeenCalled();
    expect(dependent3.markNeedsBuild).not.toHaveBeenCalled();
  });

  it('should handle multiple inherited widgets in tree', () => {
    const runtime = new MockRuntime();

    const themeWidget = new TestTheme({
      data: { color: 'blue' },
      child: new MockWidget('child')
    });
    const themeElement = new InheritedElement(themeWidget, null, runtime);
    themeElement.mounted = true;

    const localeWidget = new InheritedWidget({
      data: 'en_US',
      child: new MockWidget('child')
    });
    const localeElement = new InheritedElement(localeWidget, themeElement, runtime);
    localeElement.mounted = true;

    const dependent = new MockElement(new MockWidget('dep'), localeElement, runtime);
    dependent.mounted = true;
    dependent.markNeedsBuild = jest.fn();

    themeElement.addDependent(dependent);
    localeElement.addDependent(dependent);

    expect(themeElement.dependentCount).toBe(1);
    expect(localeElement.dependentCount).toBe(1);
  });

  it('should handle cleanup during unmount', () => {
    const runtime = new MockRuntime();
    const parentWidget = new TestTheme({
      data: { color: 'blue' },
      child: new MockWidget('child')
    });
    const parentElement = new InheritedElement(parentWidget, null, runtime);
    parentElement.mounted = true;

    const childElement1 = new MockElement(new MockWidget('c1'), parentElement, runtime);
    const childElement2 = new MockElement(new MockWidget('c2'), parentElement, runtime);
    childElement1.mounted = true;
    childElement2.mounted = true;

    parentElement.addDependent(childElement1);
    parentElement.addDependent(childElement2);

    expect(parentElement.dependentCount).toBe(2);

    parentElement.unmount();

    expect(parentElement.dependentCount).toBe(0);
    expect(parentElement.mounted).toBe(false);
  });

  it('should handle rapid value changes', () => {
    const notifier = new ValueNotifier(0);
    const listener = jest.fn();
    notifier.addListener(listener);

    // Rapid changes
    for (let i = 0; i < 100; i++) {
      notifier.value = i;
    }

    expect(listener).toHaveBeenCalledTimes(100);
    expect(notifier.value).toBe(99);
  });
});

describe('Performance & Memory', () => {
  it('should handle many dependents efficiently', () => {
    const runtime = new MockRuntime();
    const widget = new TestTheme({
      data: { color: 'blue' },
      child: new MockWidget('child')
    });
    const element = new InheritedElement(widget, null, runtime);
    element.mounted = true;

    // Add many dependents
    const dependents = [];
    for (let i = 0; i < 1000; i++) {
      const dep = new MockElement(new MockWidget(`dep${i}`), element, runtime);
      dep.mounted = true;
      dep.markNeedsBuild = jest.fn();
      dependents.push(dep);
      element.addDependent(dep);
    }

    expect(element.dependentCount).toBe(1000);

    // Notify all
    const start = performance.now();
    element.notifyDependents();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should be fast
    dependents.forEach(d => expect(d.markNeedsBuild).toHaveBeenCalled());
  });

  it('should cleanup memory on unmount', () => {
    const runtime = new MockRuntime();
    const widget = new TestTheme({
      data: { color: 'blue' },
      child: new MockWidget('child')
    });
    const element = new InheritedElement(widget, null, runtime);

    const dependents = [];
    for (let i = 0; i < 100; i++) {
      const dep = new MockElement(new MockWidget(`dep${i}`), element, runtime);
      dependents.push(dep);
      element.addDependent(dep);
    }

    expect(element.dependentCount).toBe(100);

    element.unmount();

    expect(element.dependentCount).toBe(0);
    expect(element.dependents.size).toBe(0);
  });
});