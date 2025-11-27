// ============================================================================
// VNODE RENDERER - Converts VNode tree to DOM (React-like VirtualDOM system)
// Layer: RENDERING
// ============================================================================

import { VNode } from './vnode.js';

class VNodeRenderer {
  /**
   * Render VNode tree to DOM element
   * Replaces content of target element with rendered DOM
   */
  static render(vnode, targetElement) {
    if (!targetElement) {
      throw new Error('Target element is required for rendering');
    }

    const domNode = this.createDOMNode(vnode);
    targetElement.innerHTML = '';
    targetElement.appendChild(domNode);
    
    return domNode;
  }

  /**
   * Create actual DOM node from VNode
   * Handles strings, numbers, null, and VNode objects
   */
  static createDOMNode(vnode) {
    // Handle text nodes
    if (typeof vnode === 'string') {
      return document.createTextNode(vnode);
    }

    if (typeof vnode === 'number') {
      return document.createTextNode(String(vnode));
    }

    // Handle null/undefined
    if (!vnode || vnode === null || vnode === undefined) {
      return document.createTextNode('');
    }

    // Handle VNode objects
    if (vnode instanceof VNode) {
      const element = document.createElement(vnode.tag);

      // Apply props/attributes
      if (vnode.props) {
        this.applyProps(element, vnode.props);
      }

      // Apply event listeners
      if (vnode.events && typeof vnode.events === 'object') {
        this.applyEvents(element, vnode.events);
      }

      // Add children recursively
      if (vnode.children && Array.isArray(vnode.children)) {
        vnode.children.forEach(child => {
          const childNode = this.createDOMNode(child);
          if (childNode) {
            element.appendChild(childNode);
          }
        });
      }

      // Store reference to VNode (for updates)
      element._vnode = vnode;
      vnode._element = element;

      return element;
    }

    // Array of vnodes - return fragment
    if (Array.isArray(vnode)) {
      const fragment = document.createDocumentFragment();
      vnode.forEach(v => {
        const node = this.createDOMNode(v);
        if (node) fragment.appendChild(node);
      });
      return fragment;
    }

    return document.createTextNode(String(vnode));
  }

  /**
   * Apply props/attributes to DOM element
   */
  static applyProps(element, props) {
    Object.entries(props).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      // Handle className
      if (key === 'className') {
        element.className = value;
        return;
      }

      // Handle style object
      if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
        return;
      }

      // Handle data attributes
      if (key.startsWith('data-')) {
        element.setAttribute(key, value);
        return;
      }

      // Handle boolean attributes
      if (typeof value === 'boolean') {
        if (value) {
          element.setAttribute(key, '');
        } else {
          element.removeAttribute(key);
        }
        return;
      }

      // Try to set as property first, fall back to attribute
      try {
        if (key in element) {
          element[key] = value;
        } else {
          element.setAttribute(key, String(value));
        }
      } catch (e) {
        element.setAttribute(key, String(value));
      }
    });
  }

  /**
   * Apply event listeners to DOM element
   */
  static applyEvents(element, events) {
    Object.entries(events).forEach(([eventName, handler]) => {
      if (typeof handler === 'function') {
        // Remove 'on' prefix if present (e.g., onClick -> click)
        const name = eventName.startsWith('on')
          ? eventName.slice(2).toLowerCase()
          : eventName.toLowerCase();

        element.addEventListener(name, handler);
      }
    });
  }

  /**
   * Update existing DOM node with new VNode
   * Performs efficient updates without full re-render
   */
  static updateDOMNode(domElement, oldVNode, newVNode) {
    // If completely different, replace
    if (!oldVNode || oldVNode.tag !== newVNode.tag) {
      const newDom = this.createDOMNode(newVNode);
      domElement.replaceWith(newDom);
      return newDom;
    }

    // Update props
    this.updateProps(domElement, oldVNode.props, newVNode.props);

    // Update events
    this.updateEvents(domElement, oldVNode.events, newVNode.events);

    // Update children
    this.updateChildren(domElement, oldVNode.children, newVNode.children);

    // Update VNode reference
    domElement._vnode = newVNode;
    newVNode._element = domElement;

    return domElement;
  }

  /**
   * Diff and update props
   */
  static updateProps(element, oldProps = {}, newProps = {}) {
    const allKeys = new Set([
      ...Object.keys(oldProps),
      ...Object.keys(newProps)
    ]);

    allKeys.forEach(key => {
      const oldValue = oldProps[key];
      const newValue = newProps[key];

      if (oldValue === newValue) {
        return; // No change
      }

      if (newValue === null || newValue === undefined) {
        // Remove attribute
        if (key === 'className') {
          element.className = '';
        } else if (key === 'style') {
          element.removeAttribute('style');
        } else {
          element.removeAttribute(key);
        }
      } else {
        // Update attribute
        if (key === 'className') {
          element.className = newValue;
        } else if (key === 'style' && typeof newValue === 'object') {
          Object.assign(element.style, newValue);
        } else if (key.startsWith('data-')) {
          element.setAttribute(key, newValue);
        } else {
          try {
            element[key] = newValue;
          } catch (e) {
            element.setAttribute(key, String(newValue));
          }
        }
      }
    });
  }

  /**
   * Diff and update events
   */
  static updateEvents(element, oldEvents = {}, newEvents = {}) {
    // Remove old events
    Object.entries(oldEvents).forEach(([eventName, oldHandler]) => {
      if (!newEvents[eventName]) {
        const name = eventName.startsWith('on')
          ? eventName.slice(2).toLowerCase()
          : eventName.toLowerCase();

        element.removeEventListener(name, oldHandler);
      }
    });

    // Add/update new events
    Object.entries(newEvents).forEach(([eventName, newHandler]) => {
      if (oldEvents[eventName] !== newHandler && typeof newHandler === 'function') {
        const name = eventName.startsWith('on')
          ? eventName.slice(2).toLowerCase()
          : eventName.toLowerCase();

        element.addEventListener(name, newHandler);
      }
    });
  }

  /**
   * Diff and update children
   */
  static updateChildren(element, oldChildren = [], newChildren = []) {
    const maxLen = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLen; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];
      const domChild = element.childNodes[i];

      if (!oldChild && newChild) {
        // Add new child
        const newDom = this.createDOMNode(newChild);
        element.appendChild(newDom);
      } else if (oldChild && !newChild) {
        // Remove child
        if (domChild) {
          domChild.remove();
        }
      } else if (oldChild && newChild && domChild) {
        // Update existing child
        if (typeof oldChild === 'string' || typeof newChild === 'string') {
          if (oldChild !== newChild) {
            domChild.textContent = String(newChild);
          }
        } else if (oldChild instanceof VNode && newChild instanceof VNode) {
          this.updateDOMNode(domChild, oldChild, newChild);
        }
      }
    }

    // Remove extra children
    while (element.childNodes.length > newChildren.length) {
      element.removeChild(element.lastChild);
    }
  }

  /**
   * Batch update multiple nodes efficiently
   */
  static batchUpdate(updates) {
    // Use requestAnimationFrame for efficient batching
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        updates.forEach(({ dom, oldVNode, newVNode }) => {
          this.updateDOMNode(dom, oldVNode, newVNode);
        });
        resolve();
      });
    });
  }
}

export { VNodeRenderer };