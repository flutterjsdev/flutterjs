/**
 * VNodeRenderer - Client-Side Rendering (CSR)
 * 
 * Converts VNode trees to actual DOM elements in the browser.
 * Handles:
 * - DOM element creation
 * - Props/styles/events application
 * - Recursive child rendering
 * - Refs and callbacks
 * - Event listener management
 */

class VNodeRenderer {
  /**
   * Render VNode tree to DOM
   * @param {VNode|string|Array} vnode - VNode tree to render
   * @param {HTMLElement} targetElement - DOM element to render into
   * @param {Object} options - Rendering options
   * @returns {HTMLElement} Root DOM element
   */
  static render(vnode, targetElement, options = {}) {
    if (!targetElement) {
      throw new Error('Target element is required');
    }

    // Clear target if specified
    if (options.clear !== false) {
      this.clearElement(targetElement);
    }

    // Create DOM tree
    const domNode = this.createDOMNode(vnode);

    // Append to target
    if (domNode) {
      if (Array.isArray(domNode)) {
        domNode.forEach(node => targetElement.appendChild(node));
      } else {
        targetElement.appendChild(domNode);
      }
    }

    // Return first element or array
    return Array.isArray(domNode) ? domNode[0] : domNode;
  }

  /**
   * Create DOM node from VNode
   * @param {VNode|string|Array} vnode - VNode to convert
   * @returns {HTMLElement|Text|Array|null} DOM node(s)
   */
  static createDOMNode(vnode) {
    // Handle null/undefined
    if (vnode === null || vnode === undefined) {
      return document.createTextNode('');
    }

    // Handle arrays (fragments)
    if (Array.isArray(vnode)) {
      return vnode
        .map(child => this.createDOMNode(child))
        .filter(node => node !== null);
    }

    // Handle text nodes
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return document.createTextNode(String(vnode));
    }

    // Handle boolean (render nothing)
    if (typeof vnode === 'boolean') {
      return document.createTextNode('');
    }

    // Must be a VNode object
    if (!vnode.tag) {
      console.warn('Invalid VNode: missing tag', vnode);
      return document.createTextNode('');
    }

    // Create element
    const element = document.createElement(vnode.tag);

    // Store VNode reference
    element._vnode = vnode;
    vnode._element = element;

    // Apply props (HTML attributes)
    this.applyProps(element, vnode.props || {});

    // Apply styles (CSS)
    this.applyStyles(element, vnode.style || {});

    // Attach event listeners
    this.applyEvents(element, vnode.events || {});

    // Render children
    if (vnode.children && vnode.children.length > 0) {
      this.renderChildren(element, vnode.children);
    }

    // Call ref callback
    if (typeof vnode.ref === 'function') {
      try {
        vnode.ref(element);
      } catch (error) {
        console.error('Error in ref callback:', error);
      }
    }

    return element;
  }

  /**
   * Render children into parent element
   * @private
   */
  static renderChildren(parent, children) {
    children.forEach((child, index) => {
      const childNode = this.createDOMNode(child);
      
      if (childNode) {
        if (Array.isArray(childNode)) {
          // Fragment - append all nodes
          childNode.forEach(node => parent.appendChild(node));
        } else {
          parent.appendChild(childNode);
        }

        // Store parent/index references for VNode children
        if (child && typeof child === 'object' && child.tag) {
          child._parent = parent._vnode;
          child._index = index;
        }
      }
    });
  }

  /**
   * Apply HTML attributes to element
   * @private
   */
  static applyProps(element, props) {
    Object.entries(props).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      try {
        // Special handling for className
        if (key === 'className' || key === 'class') {
          element.className = value;
          return;
        }

        // Special handling for value (inputs)
        if (key === 'value' && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
          element.value = value;
          return;
        }

        // Special handling for checked (checkboxes/radios)
        if (key === 'checked' && element.tagName === 'INPUT') {
          element.checked = !!value;
          return;
        }

        // Special handling for selected (options)
        if (key === 'selected' && element.tagName === 'OPTION') {
          element.selected = !!value;
          return;
        }

        // Special handling for disabled
        if (key === 'disabled') {
          element.disabled = !!value;
          return;
        }

        // Data attributes and aria attributes
        if (key.startsWith('data-') || key.startsWith('aria-')) {
          element.setAttribute(key, String(value));
          return;
        }

        // Boolean attributes
        if (typeof value === 'boolean') {
          if (value) {
            element.setAttribute(key, '');
          } else {
            element.removeAttribute(key);
          }
          return;
        }

        // Try setting as property first (faster)
        if (key in element) {
          element[key] = value;
        } else {
          // Fall back to setAttribute
          element.setAttribute(key, String(value));
        }
      } catch (error) {
        console.warn(`Failed to set prop ${key}:`, error);
        // Try setAttribute as fallback
        try {
          element.setAttribute(key, String(value));
        } catch (e) {
          console.error(`Failed to set attribute ${key}:`, e);
        }
      }
    });
  }

  /**
   * Apply CSS styles to element
   * @private
   */
  static applyStyles(element, styles) {
    Object.entries(styles).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        try {
          // Handle CSS custom properties (--variable-name)
          if (key.startsWith('--')) {
            element.style.setProperty(key, value);
          } else {
            element.style[key] = value;
          }
        } catch (error) {
          console.warn(`Failed to set style ${key}:`, error);
        }
      }
    });
  }

  /**
   * Attach event listeners to element
   * @private
   */
  static applyEvents(element, events) {
    Object.entries(events).forEach(([eventName, handler]) => {
      if (typeof handler !== 'function') {
        console.warn(`Event handler for ${eventName} is not a function`);
        return;
      }

      try {
        // Normalize event name
        // onClick -> click, onInput -> input, etc.
        const normalizedName = eventName
          .replace(/^on/, '')
          .toLowerCase();

        // Store listeners for cleanup
        if (!element._eventListeners) {
          element._eventListeners = {};
        }

        // Remove old listener if exists
        if (element._eventListeners[normalizedName]) {
          element.removeEventListener(
            normalizedName,
            element._eventListeners[normalizedName]
          );
        }

        // Add new listener
        element.addEventListener(normalizedName, handler);
        element._eventListeners[normalizedName] = handler;
      } catch (error) {
        console.error(`Failed to attach event ${eventName}:`, error);
      }
    });
  }

  /**
   * Clear element contents and remove event listeners
   * @private
   */
  static clearElement(element) {
    // Remove event listeners from all descendants
    this.cleanupEventListeners(element);

    // Clear innerHTML
    element.innerHTML = '';
  }

  /**
   * Recursively remove event listeners
   * @private
   */
  static cleanupEventListeners(element) {
    if (!element) return;

    // Remove listeners from this element
    if (element._eventListeners) {
      Object.entries(element._eventListeners).forEach(([event, handler]) => {
        element.removeEventListener(event, handler);
      });
      element._eventListeners = null;
    }

    // Remove VNode reference
    if (element._vnode) {
      element._vnode._element = null;
      element._vnode = null;
    }

    // Recursively clean children
    Array.from(element.children).forEach(child => {
      this.cleanupEventListeners(child);
    });
  }

  /**
   * Update element with new props
   * @param {HTMLElement} element - Element to update
   * @param {Object} oldProps - Previous props
   * @param {Object} newProps - New props
   */
  static updateProps(element, oldProps = {}, newProps = {}) {
    // Remove old props that don't exist in new props
    Object.keys(oldProps).forEach(key => {
      if (!(key in newProps)) {
        if (key === 'className' || key === 'class') {
          element.className = '';
        } else if (key.startsWith('data-') || key.startsWith('aria-')) {
          element.removeAttribute(key);
        } else if (typeof oldProps[key] === 'boolean') {
          element.removeAttribute(key);
        } else if (key in element) {
          element[key] = '';
        } else {
          element.removeAttribute(key);
        }
      }
    });

    // Apply new props
    this.applyProps(element, newProps);
  }

  /**
   * Update element with new styles
   * @param {HTMLElement} element - Element to update
   * @param {Object} oldStyles - Previous styles
   * @param {Object} newStyles - New styles
   */
  static updateStyles(element, oldStyles = {}, newStyles = {}) {
    // Remove old styles that don't exist in new styles
    Object.keys(oldStyles).forEach(key => {
      if (!(key in newStyles)) {
        element.style[key] = '';
      }
    });

    // Apply new styles
    this.applyStyles(element, newStyles);
  }

  /**
   * Update element with new events
   * @param {HTMLElement} element - Element to update
   * @param {Object} oldEvents - Previous events
   * @param {Object} newEvents - New events
   */
  static updateEvents(element, oldEvents = {}, newEvents = {}) {
    // Remove old event listeners
    Object.keys(oldEvents).forEach(eventName => {
      if (!(eventName in newEvents)) {
        const normalizedName = eventName.replace(/^on/, '').toLowerCase();
        if (element._eventListeners && element._eventListeners[normalizedName]) {
          element.removeEventListener(
            normalizedName,
            element._eventListeners[normalizedName]
          );
          delete element._eventListeners[normalizedName];
        }
      }
    });

    // Apply new events
    this.applyEvents(element, newEvents);
  }

  /**
   * Replace element with new VNode
   * @param {HTMLElement} oldElement - Element to replace
   * @param {VNode} newVNode - New VNode to render
   * @returns {HTMLElement} New element
   */
  static replaceElement(oldElement, newVNode) {
    const newElement = this.createDOMNode(newVNode);
    
    if (oldElement.parentNode && newElement) {
      // Cleanup old element
      this.cleanupEventListeners(oldElement);
      
      // Replace in DOM
      oldElement.parentNode.replaceChild(newElement, oldElement);
    }

    return newElement;
  }

  /**
   * Remove element from DOM
   * @param {HTMLElement} element - Element to remove
   */
  static removeElement(element) {
    if (!element || !element.parentNode) return;

    // Cleanup event listeners
    this.cleanupEventListeners(element);

    // Remove from DOM
    element.parentNode.removeChild(element);
  }

  /**
   * Insert element at specific position
   * @param {HTMLElement} parent - Parent element
   * @param {VNode} vnode - VNode to insert
   * @param {number} index - Position to insert at
   * @returns {HTMLElement} Inserted element
   */
  static insertAt(parent, vnode, index) {
    const element = this.createDOMNode(vnode);
    
    if (!element) return null;

    const children = Array.from(parent.childNodes);
    
    if (index >= children.length) {
      parent.appendChild(element);
    } else {
      parent.insertBefore(element, children[index]);
    }

    return element;
  }

  /**
   * Find element by index path
   * @param {HTMLElement} root - Root element
   * @param {string} indexPath - Dot-separated index path (e.g., "0.1.2")
   * @returns {HTMLElement|null} Found element
   */
  static findElementByPath(root, indexPath) {
    if (!indexPath) return root;

    const indices = indexPath.split('.').map(Number);
    let current = root;

    for (const index of indices) {
      const children = Array.from(current.childNodes);
      if (index >= children.length) return null;
      current = children[index];
    }

    return current;
  }

  /**
   * Get element's index path
   * @param {HTMLElement} element - Element to get path for
   * @returns {string} Dot-separated index path
   */
  static getElementPath(element) {
    const indices = [];
    let current = element;

    while (current.parentNode && current.parentNode !== document.body) {
      const parent = current.parentNode;
      const index = Array.from(parent.childNodes).indexOf(current);
      indices.unshift(index);
      current = parent;
    }

    return indices.join('.');
  }

  /**
   * Batch render multiple VNodes
   * @param {Array} vnodes - Array of VNodes
   * @param {HTMLElement} container - Container element
   */
  static batchRender(vnodes, container) {
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    vnodes.forEach(vnode => {
      const element = this.createDOMNode(vnode);
      if (element) {
        if (Array.isArray(element)) {
          element.forEach(node => fragment.appendChild(node));
        } else {
          fragment.appendChild(element);
        }
      }
    });

    // Clear and append in one operation
    this.clearElement(container);
    container.appendChild(fragment);
  }

  /**
   * Check if element needs update
   * @param {HTMLElement} element - DOM element
   * @param {VNode} vnode - New VNode
   * @returns {boolean} True if update needed
   */
  static needsUpdate(element, vnode) {
    if (!element._vnode) return true;
    
    const oldVNode = element._vnode;

    // Different tags = needs replace
    if (oldVNode.tag !== vnode.tag) return true;

    // Check if key changed
    if (oldVNode.key !== vnode.key) return true;

    // Check if props changed (shallow)
    const oldProps = oldVNode.props || {};
    const newProps = vnode.props || {};
    if (Object.keys(oldProps).length !== Object.keys(newProps).length) {
      return true;
    }

    // Check if styles changed (shallow)
    const oldStyles = oldVNode.style || {};
    const newStyles = vnode.style || {};
    if (Object.keys(oldStyles).length !== Object.keys(newStyles).length) {
      return true;
    }

    return false;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VNodeRenderer;
}
if (typeof window !== 'undefined') {
  window.VNodeRenderer = VNodeRenderer;
}