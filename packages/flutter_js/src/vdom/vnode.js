class VNode {
  constructor({
    tag,
    props = {},
    children = [],
    key = null,
    ref = null,
    events = {}
  }) {
    this.tag = tag;           // 'div', 'button', 'span'
    this.props = props;       // HTML attributes
    this.children = children; // VNode[] or string[]
    this.key = key;
    this.ref = ref;
    this.events = events;     // { onClick: fn, ... }
    this._element = null;     // Cached DOM element
  }

  // Render to HTML string (for SSR/SSG)
  toHTML() {
    const attrs = this._serializeAttrs();
    const openTag = `<${this.tag}${attrs ? ' ' + attrs : ''}>`;

    if (this._isVoidTag()) {
      return openTag;
    }

    const childrenHTML = this.children
      .map(child => {
        if (child instanceof VNode) return child.toHTML();
        if (child === null || child === undefined) return '';
        return this._escapeHTML(String(child));
      })
      .join('');

    return `${openTag}${childrenHTML}</${this.tag}>`;
  }

  // Render to DOM (for CSR)
  toDOM() {
    const element = document.createElement(this.tag);
    this._element = element;

    // Apply props
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

  // Hydrate: attach events to existing DOM
  hydrate(existingElement) {
    this._element = existingElement;

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

  _isVoidTag() {
    return ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(this.tag);
  }

  _escape(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return str.replace(/[&<>"']/g, c => map[c]);
  }

  _escapeHTML(str) {
    return this._escape(str);
  }

  _camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }
}