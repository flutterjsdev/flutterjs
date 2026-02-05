// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FIXED: Complete Stateful/Stateless Widget System
 * 
 * KEY FIXES:
 * 1. StatefulElement properly initializes State with lifecycle
 * 2. State.setState() correctly marks element for rebuild
 * 3. Proper context passing through entire widget tree
 * 4. Both StatelessElement and StatefulElement work correctly
 */

import { Diagnosticable, Element, StatelessElement, StatefulElement } from "@flutterjs/runtime/element";
import { VNode } from "@flutterjs/vdom/vnode";

// ============================================================================
// STATE BASE CLASS - FIXED
// ============================================================================

/**
 * State - Mutable state holder for StatefulWidget
 * 
 * âœ… CRITICAL: This is now properly integrated with StatefulElement
 */
class State extends Diagnosticable {
  constructor() {
    super();

    // Internal references
    this._element = null;           // Owner StatefulElement
    this._widget = null;            // Current widget configuration
    this._mounted = false;          // Is state mounted?
    this._building = false;         // Currently building?

    // Lifecycle tracking
    this._didInitState = false;
    this._didMount = false;
    this._isActive = false;

    // Performance tracking
    this._buildCount = 0;
  }

  /**
   * Get the widget that created this state
   */
  get widget() {
    return this._widget;
  }

  /**
   * Get the build context
   */
  get context() {
    return this._element?.context || null;
  }

  /**
   * Check if state is mounted
   */
  get mounted() {
    return this._mounted;
  }

  // ========== LIFECYCLE METHODS ==========

  /**
   * Called once when state is first created
   * Override to initialize state variables
   */
  initState() {
    // Override in subclass
  }

  /**
   * Called when widget configuration changes
   * @param {Widget} oldWidget - Previous widget
   */
  didUpdateWidget(oldWidget) {
    // Override in subclass
  }

  /**
   * Called when inherited dependencies change
   */
  didChangeDependencies() {
    // Override in subclass
  }

  /**
   * Called after first frame is rendered
   */
  didMount() {
    // Override in subclass
  }

  /**
   * Called when state is about to be permanently removed
   * Override to cleanup resources
   */
  dispose() {
    // Override in subclass
  }

  /**
   * Called when state is reactivated
   */
  activate() {
    // Override in subclass
  }

  /**
   * Called when state is deactivated
   */
  deactivate() {
    // Override in subclass
  }

  /**
   * Build the widget tree
   * MUST be overridden in subclass
   * @param {BuildContext} context - Build context
   * @returns {Widget|VNode} Widget tree or VNode
   */
  build(context) {
    throw new Error(`${this.constructor.name}.build(context) must be implemented`);
  }

  // ========== STATE MANAGEMENT ==========

  /**
   * Update state and schedule rebuild
   * @param {Function|Object} updateFn - Update function or object
   */
  setState(updateFn) {
    if (!this.mounted) {
      console.warn(`[State] setState called on unmounted state`);
      return;
    }

    if (this._building) {
      console.warn(`[State] setState called during build`);
    }

    // Apply update
    if (typeof updateFn === 'function') {
      try {
        updateFn.call(this);
      } catch (error) {
        console.error(`[State] setState update function failed:`, error);
        throw error;
      }
    } else if (typeof updateFn === 'object' && updateFn !== null) {
      Object.assign(this, updateFn);
    }

    // Trigger rebuild
    if (this._element && typeof this._element.markNeedsBuild === 'function') {
      this._element.markNeedsBuild();
    }
  }

  // ========== INTERNAL LIFECYCLE (called by StatefulElement) ==========

  /**
   * Internal: Initialize state
   * Called by StatefulElement after mount
   */
  _init() {
    if (this._didInitState) {
      return;
    }

    this._didInitState = true;
    this._mounted = true;
    this._isActive = true;

    try {
      console.log(`[State] Calling initState for ${this.constructor.name}`);
      this.initState();
    } catch (error) {
      console.error(`[State] initState failed:`, error);
      throw error;
    }
  }

  /**
   * Internal: Call didChangeDependencies
   */
  _didChangeDependencies() {
    try {
      this.didChangeDependencies();
    } catch (error) {
      console.error(`[State] didChangeDependencies failed:`, error);
    }
  }

  /**
   * Internal: Call didMount
   */
  _didMount() {
    if (this._didMount) {
      return;
    }

    this._didMount = true;

    try {
      console.log(`[State] Calling didMount for ${this.constructor.name}`);
      this.didMount();
    } catch (error) {
      console.error(`[State] didMount failed:`, error);
    }
  }

  /**
   * Internal: Dispose state
   */
  _dispose() {
    this._mounted = false;
    this._isActive = false;

    try {
      console.log(`[State] Calling dispose for ${this.constructor.name}`);
      this.dispose();
    } catch (error) {
      console.error(`[State] dispose failed:`, error);
    }
  }

  /**
   * Internal: Deactivate state
   */
  _deactivate() {
    if (!this._isActive) {
      return;
    }

    this._isActive = false;

    try {
      this.deactivate();
    } catch (error) {
      console.error(`[State] deactivate failed:`, error);
    }
  }

  /**
   * Internal: Reactivate state
   */
  _reactivate() {
    if (this._isActive) {
      return;
    }

    this._isActive = true;

    try {
      this.activate();
    } catch (error) {
      console.error(`[State] activate failed:`, error);
    }
  }

  /**
   * Print to console (Flutter compatibility)
   */
  print(message) {
    console.log(message);
  }

  toStringShort() {
    return `${this.constructor.name}`;
  }
}

// ============================================================================
// WIDGET BASE CLASS
// ============================================================================

class Widget extends Diagnosticable {
  constructor(key = null) {
    super();
    if (new.target === Widget) {
      throw new Error('Widget is abstract and cannot be instantiated');
    }
    this.key = key;
  }

  /**
   * Create an Element for this widget
   * Must be implemented in subclasses
   */
  createElement(parent, runtime) {
    throw new Error(
      `${this.constructor.name}.createElement() must be implemented`
    );
  }

  toStringShort() {
    return `${this.constructor.name}${this.key ? `(key: ${this.key})` : '(unkeyed)'}`;
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
  }
}

// ============================================================================
// STATELESS WIDGET
// ============================================================================

class StatelessWidget extends Widget {
  constructor(key = null) {
    super(key);
  }

  /**
   * Build the widget UI
   * MUST be overridden
   */
  build(context) {
    throw new Error(`${this.constructor.name}.build(context) must be implemented`);
  }

  /**
   * Create element for this widget
   */
  createElement(parent, runtime) {
    return new StatelessElement(this, parent, runtime);
  }
}

// StatelessElement is imported from @flutterjs/runtime

// ============================================================================
// STATEFUL WIDGET
// ============================================================================

class StatefulWidget extends Widget {
  constructor(key = null) {
    super(key);
  }

  /**
   * Create the state object
   * MUST be overridden
   */
  createState() {
    throw new Error(`${this.constructor.name}.createState() must be implemented`);
  }

  /**
   * Create element for this widget
   */
  createElement(parent, runtime) {
    return new StatefulElement(this, parent, runtime);
  }
}

// StatefulElement is imported from @flutterjs/runtime

// ============================================================================
// PROXY WIDGET
// ============================================================================

class ProxyWidget extends Widget {
  constructor({ key = null, child = null } = {}) {
    super(key);
    if (new.target === ProxyWidget) {
      throw new Error('ProxyWidget is abstract');
    }
    this.child = child;
  }

  createElement(parent, runtime) {
    return new ProxyElement(this, parent, runtime);
  }
}

/**
 * ProxyElement - Element for proxy widget
 */
class ProxyElement extends Element {
  constructor(widget, parent = null, runtime = null) {
    super(widget, parent, runtime);
  }

  performRebuild() {
    const childWidget = this.widget.child;

    if (!childWidget) {
      if (this._childElement) {
        this._childElement.unmount();
        this._childElement = null;
      }
      return null;
    }

    try {
      if (this._childElement) {
        // Reconciliation: Check if we can reuse the existing element
        const oldWidget = this._childElement.widget;

        if (oldWidget.constructor === childWidget.constructor && oldWidget.key === childWidget.key) {
          // Reuse existing element
          this._childElement.updateWidget(childWidget);

          // Ensure VNode is fresh if dirty
          if (this._childElement.dirty) {
            this._childElement.rebuild();
          }
        } else {
          // Replace element
          this._childElement.unmount();
          this._childElement = childWidget.createElement(this, this.runtime);
          this._childElement.mount(this);
        }
      } else {
        // Initial create
        this._childElement = childWidget.createElement(this, this.runtime);
        this._childElement.mount(this);
      }

      // Return the child's VNode
      return this._childElement.vnode;

    } catch (error) {
      console.error(`[ProxyElement] performRebuild failed:`, error);
      throw error;
    }
  }
}

// ============================================================================
// INHERITED WIDGET
// ============================================================================

class InheritedWidget extends ProxyWidget {
  constructor({ key = null, child } = {}) {
    super({ key, child });
  }

  createElement(parent, runtime) {
    return new InheritedElement(this, parent, runtime);
  }

  updateShouldNotify(oldWidget) {
    return true;
  }
}

class InheritedElement extends ProxyElement {
  constructor(widget, parent = null, runtime = null) {
    super(widget, parent, runtime);
  }

  update(newWidget) {
    const oldWidget = this.widget;
    super.update(newWidget);
    if (this.widget.updateShouldNotify(oldWidget)) {
      this.notifyClients(oldWidget);
    }
  }
}

// ============================================================================
// ERROR WIDGET
// ============================================================================

class ErrorWidget extends StatelessWidget {
  constructor({ message = 'Error', error = null } = {}) {
    super();
    this.message = message;
    this.error = error;
  }

  build(context) {
    return new VNode({
      tag: 'div',
      props: {
        style: {
          backgroundColor: '#B3261E', // Material Error Red
          color: 'white',
          padding: '16px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }
      },
      children: [this.message]
    });
  }
}

// ============================================================================
// KEY CLASSES
// ============================================================================

class Key {
  constructor() {
    if (new.target === Key) {
      throw new Error('Key is abstract');
    }
  }
}

class ValueKey extends Key {
  constructor(value) {
    super();
    this.value = value;
  }

  equals(other) {
    return other instanceof ValueKey && this.value === other.value;
  }

  toString() {
    return `ValueKey(${this.value})`;
  }
}

class ObjectKey extends Key {
  constructor(value) {
    super();
    this.value = value;
  }

  equals(other) {
    return other instanceof ObjectKey && this.value === other.value;
  }

  toString() {
    return `ObjectKey(${this.value})`;
  }
}

class GlobalKey extends Key {
  constructor(debugLabel = null) {
    super();
    this.debugLabel = debugLabel;
    this._currentElement = null;
  }

  get currentContext() {
    return this._currentElement?.context || null;
  }

  get currentWidget() {
    return this._currentElement?.widget || null;
  }

  get currentState() {
    return this._currentElement?.state || null;
  }

  equals(other) {
    return other instanceof GlobalKey && this === other;
  }

  toString() {
    return `GlobalKey${this.debugLabel ? `(${this.debugLabel})` : ''}`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  State,
  Widget,
  StatelessWidget,
  StatelessElement,
  StatefulWidget,
  StatefulElement,
  ProxyWidget,
  ProxyElement,
  ErrorWidget,
  Key,
  ValueKey,
  ObjectKey,
  GlobalKey,
  Diagnosticable,
  InheritedWidget,
  InheritedElement
};