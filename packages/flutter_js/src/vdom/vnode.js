export class VNode {
  constructor({
    tag,
    props = {},
    children = [],
    key = null,
    ref = null,
    events = {}
  }) {
    this.tag = tag;           // 'div', 'button', 'span', etc.
    this.props = props;       // HTML attributes
    this.children = children; // VNode[] or string[]
    this.key = key;           // For list reconciliation
    this.ref = ref;           // Reference to DOM element
    this.events = events;     // { onClick: fn, onHover: fn, ... }
    this._element = null;     // Cached DOM element
  }

  /**
   * Converts VNode to HTML string (for SSR)
   */
  toHTML() {
    const attrs = this._serializeAttrs();
    const openTag = `<${this.tag}${attrs ? ' ' + attrs : ''}>`;

    // Self-closing tags
    if (this._isVoidTag()) {
      return openTag;
    }

    // Children
    const childrenHTML = this.children
      .map(child => {
        if (child instanceof VNode) {
          return child.toHTML();
        }
        if (child === null || child === undefined) {
          return '';
        }
        return this._escapeHTML(String(child));
      })
      .join('');

    return `${openTag}${childrenHTML}</${this.tag}>`;
  }

  /**
   * Converts VNode to DOM element (for CSR)
   */
  toDOM() {
    const element = document.createElement(this.tag);
    this._element = element;

    // Apply props (attributes)
    Object.entries(this.props).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else {
        try {
          element[key] = value;
        } catch {
          element.setAttribute(key, value);
        }
      }
    });

    // Attach events
    Object.entries(this.events).forEach(([eventName, handler]) => {
      if (handler) {
        element.addEventListener(eventName, handler);
      }
    });

    // Add children
    this.children.forEach(child => {
      if (child instanceof VNode) {
        element.appendChild(child.toDOM());
      } else if (child !== null && child !== undefined) {
        element.appendChild(document.createTextNode(String(child)));
      }
    });

    return element;
  }

  /**
   * Hydrates existing DOM element with events
   * (Used when rendering on server, then hydrating on client)
   */
  hydrate(existingElement) {
    this._element = existingElement;

    // Attach events to existing DOM
    Object.entries(this.events).forEach(([eventName, handler]) => {
      if (handler) {
        existingElement.addEventListener(eventName, handler);
      }
    });

    // Recursively hydrate children
    let childIndex = 0;
    Array.from(existingElement.childNodes).forEach(childNode => {
      const vnodeChild = this.children[childIndex];
      if (vnodeChild instanceof VNode && childNode.nodeType === 1) {
        vnodeChild.hydrate(childNode);
        childIndex++;
      } else if (childNode.nodeType === 3) {
        childIndex++;
      }
    });

    return existingElement;
  }

  /**
   * Serialize HTML attributes
   */
  _serializeAttrs() {
    return Object.entries(this.props)
      .map(([key, value]) => {
        if (value === null || value === undefined || value === false) return '';
        if (value === true) return key;
        if (key === 'className') return `class="${this._escape(value)}"`;
        if (key === 'style' && typeof value === 'object') {
          const styleStr = Object.entries(value)
            .map(([prop, val]) => `${this._camelToKebab(prop)}: ${val}`)
            .join('; ');
          return `style="${this._escape(styleStr)}"`;
        }
        return `${key}="${this._escape(String(value))}"`;
      })
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Check if tag is self-closing
   */
  _isVoidTag() {
    return ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(this.tag);
  }

  /**
   * Escape HTML special characters
   */
  _escape(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, c => map[c]);
  }

  /**
   * Escape HTML for text content
   */
  _escapeHTML(str) {
    return this._escape(str);
  }

  /**
   * Convert camelCase to kebab-case
   */
  _camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }
}