/**
 * VNode - Virtual DOM Node Implementation
 * 
 * Represents a virtual DOM node that can:
 * 1. Handle any Flutter widget type
 * 2. Serialize to HTML string (SSR)
 * 3. Convert to actual DOM element (CSR)
 * 4. Support hydration (SSR -> CSR transition)
 * 5. Track state bindings
 * 6. Manage event handlers
 */

class VNode {
  /**
   * @param {Object} config - VNode configuration
   * @param {string} config.tag - HTML tag name (div, span, button, etc.)
   * @param {Object} config.props - HTML attributes {className, id, data-*, etc.}
   * @param {Object} config.style - CSS styles {color, padding, display, etc.}
   * @param {Array} config.children - Child VNodes or text strings
   * @param {string|number} config.key - Unique key for list reconciliation
   * @param {Function} config.ref - Callback when DOM element is created
   * @param {Object} config.events - Event handlers {click, change, input, etc.}
   * @param {string} config.statefulWidgetId - ID of owning StatefulWidget
   * @param {string} config.stateProperty - State property this node displays
   * @param {boolean} config.isStateBinding - Whether this depends on state
   * @param {Function} config.updateFn - Callback on state change
   * @param {Object} config.metadata - Additional widget metadata
   */
  constructor({
    tag = 'div',
    props = {},
    style = {},
    children = [],
    key = null,
    ref = null,
    events = {},
    statefulWidgetId = null,
    stateProperty = null,
    isStateBinding = false,
    updateFn = null,
    metadata = {}
  } = {}) {
    this.tag = tag;
    this.props = props || {};
    this.style = style || {};
    this.children = Array.isArray(children) ? children : [];
    this.key = key;
    this.ref = ref;
    this.events = events || {};

    // State binding
    this.statefulWidgetId = statefulWidgetId;
    this.stateProperty = stateProperty;
    this.isStateBinding = isStateBinding;
    this.updateFn = updateFn;

    // Metadata (widget type, original props, etc.)
    this.metadata = metadata || {};

    // Runtime references
    this._element = null;  // DOM element (set during rendering)
    this._parent = null;   // Parent VNode
    this._index = null;    // Index in parent's children
  }

  /**
   * Convert VNode to HTML string (Server-Side Rendering)
   * @param {Object} options - Rendering options
   * @returns {string} HTML string
   */
  toHTML(options = {}) {
    // Handle text nodes
    if (typeof this === 'string') {
      return VNode.escapeHTML(this);
    }

    // Handle null/undefined
    if (!this || !this.tag) {
      return '';
    }

    // Build opening tag with attributes
    const attrs = this._serializeAttributes();
    const openTag = `<${this.tag}${attrs ? ' ' + attrs : ''}>`;

    // Self-closing tags
    if (VNode.VOID_TAGS.includes(this.tag)) {
      return openTag;
    }

    // Render children
    const childrenHTML = this.children
      .map(child => {
        if (child instanceof VNode) {
          return child.toHTML(options);
        }
        if (typeof child === 'string') {
          return VNode.escapeHTML(child);
        }
        return '';
      })
      .join('');

    const closeTag = `</${this.tag}>`;
    return `${openTag}${childrenHTML}${closeTag}`;
  }

  /**
   * Convert VNode to actual DOM element (Client-Side Rendering)
   * @param {Object} options - Rendering options
   * @returns {HTMLElement} DOM element
   */
  toDOM(options = {}) {
     console.log(`\n=== toDOM called for tag: ${this.tag}`);
  console.log(`    style object:`, this.style);
  console.log(`    style keys:`, Object.keys(this.style));
    // Handle text nodes
    if (typeof this === 'string') {
      return document.createTextNode(this);
    }

    // Handle null/undefined
    if (!this || !this.tag) {
      return document.createTextNode('');
    }

    // Create DOM element
    const element = document.createElement(this.tag);

    // Apply props (HTML attributes)
    this._applyProps(element);

    // Apply styles (CSS)
    this._applyStyles(element);

    // Attach event listeners
    this._applyEvents(element);

    // Add children recursively
    this.children.forEach((child, index) => {
      let childNode;

      if (child instanceof VNode) {
        childNode = child.toDOM(options);
        child._parent = this;
        child._index = index;
      } else if (typeof child === 'string') {
        childNode = document.createTextNode(child);
      } else {
        childNode = document.createTextNode(String(child || ''));
      }

      if (childNode) {
        element.appendChild(childNode);
      }
    });

    // Store reference
    this._element = element;
    element._vnode = this;

    // Call ref callback
    if (typeof this.ref === 'function') {
      this.ref(element);
    }

    return element;
  }

  /**
   * Hydrate existing SSR-rendered DOM with interactivity
   * @param {HTMLElement} domElement - Existing DOM element from SSR
   * @returns {HTMLElement} Hydrated element
   */
  hydrate(domElement) {
    if (!domElement || !this.tag) {
      return null;
    }

    // Store reference
    this._element = domElement;
    domElement._vnode = this;

    // Attach event listeners (SSR doesn't include events)
    this._applyEvents(domElement);

    // Hydrate children recursively
    const domChildren = Array.from(domElement.childNodes);
    let vnodeChildIndex = 0;

    domChildren.forEach((domChild, domIndex) => {
      const vnodeChild = this.children[vnodeChildIndex];

      if (!vnodeChild) return;

      if (vnodeChild instanceof VNode) {
        vnodeChild.hydrate(domChild);
        vnodeChild._parent = this;
        vnodeChild._index = vnodeChildIndex;
        vnodeChildIndex++;
      } else if (domChild.nodeType === Node.TEXT_NODE) {
        // Text node - just verify content matches
        if (String(vnodeChild) === domChild.textContent) {
          vnodeChildIndex++;
        }
      }
    });

    // Call ref callback
    if (typeof this.ref === 'function') {
      this.ref(domElement);
    }

    return domElement;
  }

  /**
   * Serialize attributes to HTML string
   * @private
   * @returns {string} Attributes string
   */
  _serializeAttributes() {
    const attrs = [];

    // Props (HTML attributes)
    if (this.props) {
      Object.entries(this.props).forEach(([key, value]) => {
        if (value === null || value === undefined || value === false) {
          return;
        }

        if (value === true) {
          attrs.push(key);
        } else {
          // Convert className to class for HTML
          const attrName = key === 'className' ? 'class' : key;
          const escaped = VNode.escapeAttribute(String(value));
          attrs.push(`${attrName}="${escaped}"`);
        }
      });
    }

    // Inline styles
    if (this.style && typeof this.style === 'object') {
      const styleStr = Object.entries(this.style)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => {
          // Convert camelCase to kebab-case properly
          const cssKey = key
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase();
          return `${cssKey}: ${value}`;
        })
        .join('; ');

      if (styleStr) {
        attrs.push(`style="${VNode.escapeAttribute(styleStr)}"`);
      }
    }
    // Data attributes from metadata
    if (this.metadata.widgetType) {
      attrs.push(`data-widget-type="${VNode.escapeAttribute(this.metadata.widgetType)}"`);
    }

    if (this.key !== null && this.key !== undefined) {
      attrs.push(`data-key="${VNode.escapeAttribute(String(this.key))}"`);
    }

    return attrs.join(' ');
  }

  /**
   * Apply props to DOM element
   * @private
   * @param {HTMLElement} element - Target element
   */
  _applyProps(element) {
    if (!this.props) return;

    Object.entries(this.props).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      try {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'value' && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
          element.value = value;
        } else if (key === 'checked' && element.tagName === 'INPUT') {
          element.checked = !!value;
        } else if (key.startsWith('data-') || key.startsWith('aria-')) {
          element.setAttribute(key, String(value));
        } else if (typeof value === 'boolean') {
          if (value) {
            element.setAttribute(key, '');
          }
        } else {
          // Try property first, fall back to attribute
          if (key in element) {
            element[key] = value;
          } else {
            element.setAttribute(key, String(value));
          }
        }
      } catch (error) {
        console.warn(`Failed to set property ${key}:`, error);
      }
    });
  }

  /**
   * Apply styles to DOM element
   * @private
   * @param {HTMLElement} element - Target element
   */
  _applyStyles(element) {
    if (!this.style || typeof this.style !== 'object') return;

    Object.entries(this.style).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        try {
          element.style[key] = value;
          console.log(`Set style ${key} = ${value} -> element.style.${key} = ${element.style[key]}`);
        } catch (error) {
          console.warn(`Failed to set style ${key}:`, error);
        }
      }
    });
  }

  /**
   * Attach event listeners to DOM element
   * @private
   * @param {HTMLElement} element - Target element
   */
  _applyEvents(element) {
    if (!this.events) return;

    Object.entries(this.events).forEach(([eventName, handler]) => {
      if (typeof handler !== 'function') return;

      // Normalize event name (onClick -> click, onInput -> input)
      const normalizedName = eventName
        .replace(/^on/, '')
        .toLowerCase();

      // Store reference for cleanup
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
    });
  }

  /**
   * Create a clone of this VNode
   * @returns {VNode} Cloned VNode
   */
  clone() {
    return new VNode({
      tag: this.tag,
      props: { ...this.props },
      style: { ...this.style },
      children: this.children.map(child =>
        child instanceof VNode ? child.clone() : child
      ),
      key: this.key,
      ref: this.ref,
      events: { ...this.events },
      statefulWidgetId: this.statefulWidgetId,
      stateProperty: this.stateProperty,
      isStateBinding: this.isStateBinding,
      updateFn: this.updateFn,
      metadata: { ...this.metadata }
    });
  }

  /**
   * Get debug representation
   * @returns {string} Debug string
   */
  toString() {
    const childrenStr = this.children.length > 0
      ? ` [${this.children.length} children]`
      : '';
    const keyStr = this.key !== null ? ` key="${this.key}"` : '';
    return `<${this.tag}${keyStr}${childrenStr}>`;
  }

  // Static utility methods

  /**
   * Escape HTML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  static escapeHTML(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  }

  /**
   * Escape HTML attribute value
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  static escapeAttribute(str) {
    return VNode.escapeHTML(str);
  }

  /**
   * Check if tag is self-closing
   * @param {string} tag - Tag name
   * @returns {boolean} True if void tag
   */
  static isVoidTag(tag) {
    return VNode.VOID_TAGS.includes(tag);
  }

  /**
   * Create text VNode
   * @param {string} text - Text content
   * @returns {string} Text node (represented as string)
   */
  static text(text) {
    return String(text || '');
  }

  /**
   * Create fragment (multiple children without wrapper)
   * @param {Array} children - Child nodes
   * @returns {Array} Children array
   */
  static fragment(children) {
    return Array.isArray(children) ? children : [children];
  }
}

// Static constants
VNode.VOID_TAGS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
];

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VNode;
}
if (typeof window !== 'undefined') {
  window.VNode = VNode;
}

export { VNode }