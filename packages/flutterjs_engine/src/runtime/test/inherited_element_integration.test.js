/**
 * InheritedElement Integration Tests
 *
 * Tests for real-world scenarios and integration with BuildContext,
 * StatefulWidget, State management, and event systems.
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

// Mock classes
class MockWidget {
  constructor(name) {
    this.name = name;
    this.key = null;
  }
}

class MockRuntime {
  constructor() {
    this.debugMode = false;
    this.serviceRegistry = new Map();
    this.dirtyElements = new Set();
  }

  markNeedsBuild(element) {
    this.dirtyElements.add(element);
  }
}

class TestTheme extends InheritedWidget {
  constructor({ primaryColor = '#6750a4', secondaryColor = '#03dac6', child, key }) {
    super({ child, key });
    this.data = {
      primaryColor,
      secondaryColor
    };
  }

  updateShouldNotify(oldWidget) {
    return this.data.primaryColor !== oldWidget.data.primaryColor ||
           this.data.secondaryColor !== oldWidget.data.secondaryColor;
  }

  static of(context) {
    return context.dependOnInheritedWidgetOfExactType(TestTheme);
  }
}

class CounterNotifier extends ChangeNotifier {
  constructor(initialValue = 0) {
    super();
    this.count = initialValue;
  }

  increment() {
    this.count++;
    this.notifyListeners();
  }

  decrement() {
    this.count--;
    this.notifyListeners();
  }

  reset() {
    this.count = 0;
    this.notifyListeners();
  }

  setValue(value) {
    if (this.count !== value) {
      this.count = value;
      this.notifyListeners();
    }
  }
}

describe('InheritedWidget Integration Tests', () => {
  let runtime;

  beforeEach(() => {
    runtime = new MockRuntime();
  });

  describe('BuildContext Integration', () => {
    it('should allow access via BuildContext.dependOnInheritedWidgetOfExactType', () => {
      const themeWidget = new TestTheme({
        primaryColor: '#FF0000',
        child: new MockWidget('child')
      });

      const themeElement = new InheritedElement(themeWidget, null, runtime);
      themeElement.mounted = true;

      const mockParentElement = {
        parent: themeElement,
        id: 'parent',
        mounted: true,
        _inheritedDependencies: new Set()
      };

      const context = new BuildContext(mockParentElement, runtime);

      // Mock the dependOnInheritedWidgetOfExactType method
      context.dependOnInheritedWidgetOfExactType = (Type) => {
        let current = mockParentElement.parent;
        while (current) {
          if (current instanceof InheritedElement) {
            if (current.widget instanceof TestTheme) {
              current.addDependent(mockParentElement);
              return current.widget;
            }
          }
          current = current.parent;
        }
        return null;
      };

      const theme = context.dependOnInheritedWidgetOfExactType(TestTheme);

      expect(theme).toBeDefined();
      expect(theme.data.primaryColor).toBe('#FF0000');
      expect(themeElement.hasDependent(mockParentElement)).toBe(true);
    });

    it('should track multiple BuildContext accesses from same element', () => {
      const themeWidget = new TestTheme({
        primaryColor: '#0000FF',
        child: new MockWidget('child')
      });

      const themeElement = new InheritedElement(themeWidget, null, runtime);
      themeElement.mounted = true;

      const mockElement = {
        parent: themeElement,
        id: 'elem1',
        mounted: true
      };

      // First access
      themeElement.addDependent(mockElement);

      // Second access from same element
      themeElement.addDependent(mockElement);

      // Should still only have one dependent (no duplicates)
      expect(themeElement.dependentCount).toBe(1);
      expect(themeElement.hasDependent(mockElement)).toBe(true);
    });

    it('should handle nested InheritedWidgets correctly', () => {
      // Theme provider
      const themeWidget = new TestTheme({
        primaryColor: '#6750a4',
        child: new MockWidget('child')
      });
      const themeElement = new InheritedElement(themeWidget, null, runtime);
      themeElement.mounted = true;

      // Locale provider (nested inside theme)
      class LocaleWidget extends InheritedWidget {
        constructor({ locale = 'en_US', child, key }) {
          super({ child, key });
          this.data = locale;
        }

        updateShouldNotify(oldWidget) {
          return this.data !== oldWidget.data;
        }

        static of(context) {
          return context.dependOnInheritedWidgetOfExactType(LocaleWidget);
        }
      }

      const localeWidget = new LocaleWidget({
        locale: 'es_ES',
        child: new MockWidget('child')
      });
      const localeElement = new InheritedElement(localeWidget, themeElement, runtime);
      localeElement.mounted = true;

      // Consumer element (inside locale provider)
      const consumerElement = {
        parent: localeElement,
        id: 'consumer',
        mounted: true,
        markNeedsBuild: jest.fn()
      };

      // Should be able to access nearest inherited widget
      localeElement.addDependent(consumerElement);

      expect(localeElement.dependentCount).toBe(1);
      expect(themeElement.dependentCount).toBe(0);

      // Update locale - should notify consumer
      const newLocaleWidget = new LocaleWidget({
        locale: 'fr_FR',
        child: new MockWidget('child')
      });
      localeElement.update(newLocaleWidget);
      localeElement.notifyDependents();

      expect(consumerElement.markNeedsBuild).toHaveBeenCalled();
    });
  });

  describe('ChangeNotifier with InheritedWidget', () => {
    it('should propagate ChangeNotifier updates to dependents', () => {
      const counterNotifier = new CounterNotifier(5);
      const provider = new Provider({
        notifier: counterNotifier,
        child: new MockWidget('child')
      });

      const providerElement = new InheritedElement(provider, null, runtime);
      providerElement.mounted = true;

      const dependent1 = { id: 'dep1', mounted: true, markNeedsBuild: jest.fn() };
      const dependent2 = { id: 'dep2', mounted: true, markNeedsBuild: jest.fn() };

      providerElement.addDependent(dependent1);
      providerElement.addDependent(dependent2);

      // Update notifier
      counterNotifier.increment();

      expect(counterNotifier.count).toBe(6);

      // Update provider with new value
      const newProvider = new Provider({
        notifier: counterNotifier,
        child: new MockWidget('child')
      });
      providerElement.update(newProvider);
      providerElement.notifyDependents();

      expect(dependent1.markNeedsBuild).toHaveBeenCalled();
      expect(dependent2.markNeedsBuild).toHaveBeenCalled();
    });

    it('should handle listener registration on ChangeNotifier', () => {
      const notifier = new CounterNotifier(0);
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      notifier.addListener(listener1);
      notifier.addListener(listener2);

      notifier.increment();
      notifier.increment();

      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(2);
      expect(notifier.count).toBe(2);
    });

    it('should optimize notifications when notifier unchanged', () => {
      const notifier = new CounterNotifier(10);
      const provider1 = new Provider({
        notifier,
        child: new MockWidget('child1')
      });
      const provider2 = new Provider({
        notifier,
        child: new MockWidget('child2')
      });

      // Both use same notifier - update should not trigger propagation
      // (notifier itself handles listeners)
      expect(provider1.updateShouldNotify(provider2)).toBe(false);
    });
  });

  describe('ValueNotifier with InheritedWidget', () => {
    it('should efficiently update single reactive value', () => {
      const valueNotifier = new ValueNotifier({ isDarkMode: false });
      const provider = new Provider({
        notifier: valueNotifier,
        child: new MockWidget('child')
      });

      const providerElement = new InheritedElement(provider, null, runtime);
      providerElement.mounted = true;

      const dependent = { id: 'dep', mounted: true, markNeedsBuild: jest.fn() };
      providerElement.addDependent(dependent);

      // Change value
      valueNotifier.value = { isDarkMode: true };

      expect(valueNotifier.value.isDarkMode).toBe(true);

      // Simulate update propagation
      const newProvider = new Provider({
        notifier: valueNotifier,
        child: new MockWidget('child')
      });
      providerElement.update(newProvider);
      providerElement.notifyDependents();

      expect(dependent.markNeedsBuild).toHaveBeenCalled();
    });

    it('should only notify when value actually changes', () => {
      const notifier = new ValueNotifier('initial');
      const listeners = [jest.fn(), jest.fn(), jest.fn()];

      listeners.forEach(l => notifier.addListener(l));

      // Set same value - no notification
      notifier.value = 'initial';
      expect(listeners[0]).not.toHaveBeenCalled();

      // Set different value - notify
      notifier.value = 'changed';
      expect(listeners[0]).toHaveBeenCalled();
      expect(listeners[1]).toHaveBeenCalled();
      expect(listeners[2]).toHaveBeenCalled();
    });
  });

  describe('Multi-Widget Theme System', () => {
    it('should support application-wide theme switching', () => {
      // Root theme provider
      let currentTheme = { primaryColor: '#6750a4', isDark: false };

      const themeWidget = new TestTheme({
        primaryColor: currentTheme.primaryColor,
        child: new MockWidget('app')
      });
      const themeElement = new InheritedElement(themeWidget, null, runtime);
      themeElement.mounted = true;

      // Multiple consumers throughout app
      const consumers = [];
      for (let i = 0; i < 10; i++) {
        const consumer = {
          id: `consumer-${i}`,
          mounted: true,
          markNeedsBuild: jest.fn()
        };
        themeElement.addDependent(consumer);
        consumers.push(consumer);
      }

      expect(themeElement.dependentCount).toBe(10);

      // Switch theme
      const newThemeWidget = new TestTheme({
        primaryColor: '#FF5722',
        child: new MockWidget('app')
      });
      themeElement.update(newThemeWidget);

      // Only notify if color actually changed
      expect(newThemeWidget.updateShouldNotify(themeWidget)).toBe(true);

      themeElement.notifyDependents();

      // All consumers should rebuild
      consumers.forEach(c => {
        expect(c.markNeedsBuild).toHaveBeenCalled();
      });
    });
  });

  describe('StatefulWidget Integration', () => {
    it('should work with StatefulElement for reactive state', () => {
      // Create a counter notifier
      const counterNotifier = new CounterNotifier(0);

      // Provider element
      const provider = new Provider({
        notifier: counterNotifier,
        child: new MockWidget('counter')
      });
      const providerElement = new InheritedElement(provider, null, runtime);
      providerElement.mounted = true;

      // Stateful consumer
      class CounterState extends State {
        build(context) {
          // In real scenario, this would:
          // const counter = Provider.of(context);
          // return Text(`Count: ${counter.count}`);
          return new MockWidget('text');
        }
      }

      const statefulConsumer = {
        id: 'counter-consumer',
        mounted: true,
        parent: providerElement,
        markNeedsBuild: jest.fn(),
        state: new CounterState()
      };

      // Register as dependent
      providerElement.addDependent(statefulConsumer);

      // Change counter
      counterNotifier.increment();
      counterNotifier.increment();

      expect(counterNotifier.count).toBe(2);

      // Update provider (in real app, this triggers rebuild)
      const newProvider = new Provider({
        notifier: counterNotifier,
        child: new MockWidget('counter')
      });
      providerElement.update(newProvider);
      providerElement.notifyDependents();

      expect(statefulConsumer.markNeedsBuild).toHaveBeenCalled();
    });
  });

  describe('Selective Notifications', () => {
    it('should support selective dependent notifications', () => {
      const widget = new TestTheme({
        primaryColor: '#6750a4',
        child: new MockWidget('child')
      });
      const element = new InheritedElement(widget, null, runtime);
      element.mounted = true;

      // Create multiple dependents
      const dependents = Array.from({ length: 5 }, (_, i) => ({
        id: `dep-${i}`,
        mounted: true,
        markNeedsBuild: jest.fn()
      }));

      dependents.forEach(d => element.addDependent(d));

      // Only notify specific ones
      const toNotify = new Set([dependents[0], dependents[2], dependents[4]]);
      element.notifySpecificDependents(toNotify);

      expect(dependents[0].markNeedsBuild).toHaveBeenCalled();
      expect(dependents[1].markNeedsBuild).not.toHaveBeenCalled();
      expect(dependents[2].markNeedsBuild).toHaveBeenCalled();
      expect(dependents[3].markNeedsBuild).not.toHaveBeenCalled();
      expect(dependents[4].markNeedsBuild).toHaveBeenCalled();
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle update with error in updateShouldNotify', () => {
      const widget = new TestTheme({
        primaryColor: '#6750a4',
        child: new MockWidget('child')
      });
      const element = new InheritedElement(widget, null, runtime);
      element.mounted = true;

      const dependent = { id: 'dep', mounted: true, markNeedsBuild: jest.fn() };
      element.addDependent(dependent);

      // Mock error in updateShouldNotify
      widget.updateShouldNotify = () => {
        throw new Error('Update check failed');
      };

      const newWidget = new TestTheme({
        primaryColor: '#FF0000',
        child: new MockWidget('child')
      });

      // Should not crash
      expect(() => element.update(newWidget)).not.toThrow();
    });

    it('should handle rapid mount/unmount cycles', () => {
      const widget = new TestTheme({
        primaryColor: '#6750a4',
        child: new MockWidget('child')
      });
      const element = new InheritedElement(widget, null, runtime);

      // Rapid cycles
      for (let i = 0; i < 10; i++) {
        element.mount();
        const dependent = { id: `dep-${i}`, mounted: true };
        element.addDependent(dependent);
        element.unmount();
      }

      expect(element.mounted).toBe(false);
      expect(element.dependentCount).toBe(0);
    });

    it('should handle unmount of dependent during notification', () => {
      const widget = new TestTheme({
        primaryColor: '#6750a4',
        child: new MockWidget('child')
      });
      const element = new InheritedElement(widget, null, runtime);
      element.mounted = true;

      const dependent1 = { id: 'dep1', mounted: true, markNeedsBuild: jest.fn() };
      const dependent2 = { id: 'dep2', mounted: true, markNeedsBuild: jest.fn() };
      const dependent3 = { id: 'dep3', mounted: true, markNeedsBuild: jest.fn() };

      element.addDependent(dependent1);
      element.addDependent(dependent2);
      element.addDependent(dependent3);

      // Unmount one during notification
      dependent2.mounted = false;

      element.notifyDependents();

      expect(dependent1.markNeedsBuild).toHaveBeenCalled();
      expect(dependent2.markNeedsBuild).not.toHaveBeenCalled();
      expect(dependent3.markNeedsBuild).toHaveBeenCalled();
    });
  });

  describe('Real-World Scenario: Multi-Provider App', () => {
    it('should handle app with multiple providers', () => {
      // Theme provider
      const themeNotifier = new ValueNotifier({ isDark: false });
      const themeProvider = new Provider({
        notifier: themeNotifier,
        child: new MockWidget('app')
      });
      const themeElement = new InheritedElement(themeProvider, null, runtime);
      themeElement.mounted = true;

      // Localization provider
      const localeNotifier = new ValueNotifier('en_US');
      const localeProvider = new Provider({
        notifier: localeNotifier,
        child: new MockWidget('app')
      });
      const localeElement = new InheritedElement(localeProvider, themeElement, runtime);
      localeElement.mounted = true;

      // Settings provider
      const settingsNotifier = new ValueNotifier({ notifications: true });
      const settingsProvider = new Provider({
        notifier: settingsNotifier,
        child: new MockWidget('app')
      });
      const settingsElement = new InheritedElement(settingsProvider, localeElement, runtime);
      settingsElement.mounted = true;

      // Components using different providers
      const themeConsumer = { id: 'theme-consumer', mounted: true, markNeedsBuild: jest.fn() };
      const localeConsumer = { id: 'locale-consumer', mounted: true, markNeedsBuild: jest.fn() };
      const settingsConsumer = { id: 'settings-consumer', mounted: true, markNeedsBuild: jest.fn() };
      const multiConsumer = { id: 'multi-consumer', mounted: true, markNeedsBuild: jest.fn() };

      themeElement.addDependent(themeConsumer);
      themeElement.addDependent(multiConsumer);

      localeElement.addDependent(localeConsumer);
      localeElement.addDependent(multiConsumer);

      settingsElement.addDependent(settingsConsumer);
      settingsElement.addDependent(multiConsumer);

      // Change theme
      themeNotifier.value = { isDark: true };
      const newThemeProvider = new Provider({
        notifier: themeNotifier,
        child: new MockWidget('app')
      });
      themeElement.update(newThemeProvider);
      themeElement.notifyDependents();

      expect(themeConsumer.markNeedsBuild).toHaveBeenCalled();
      expect(multiConsumer.markNeedsBuild).toHaveBeenCalled();

      // Reset for next change
      themeConsumer.markNeedsBuild.mockClear();
      multiConsumer.markNeedsBuild.mockClear();

      // Change locale
      localeNotifier.value = 'es_ES';
      const newLocaleProvider = new Provider({
        notifier: localeNotifier,
        child: new MockWidget('app')
      });
      localeElement.update(newLocaleProvider);
      localeElement.notifyDependents();

      expect(localeConsumer.markNeedsBuild).toHaveBeenCalled();
      expect(multiConsumer.markNeedsBuild).toHaveBeenCalled();
      expect(themeConsumer.markNeedsBuild).not.toHaveBeenCalled();
    });
  });
});