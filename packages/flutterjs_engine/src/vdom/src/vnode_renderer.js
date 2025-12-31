/**
 * VNodeRenderer - Client-Side Rendering (CSR)
 * WITH ENHANCED DEBUGGING
 */

class VNodeRenderer {
  constructor(options = {}) {
    this.debugMode = options.debugMode || false;
    this.rootElement = options.rootElement || null;
  }

  render(vnode, targetElement, options = {}) {
    if (!targetElement) {
      throw new Error('Target element is required');
    }

    if (this.debugMode) {
      console.log('[VNodeRenderer] 🎨 Rendering to', targetElement.id || targetElement.className || targetElement.tagName);
      console.log('[VNodeRenderer] 📦 VNode to render:', {
        type: typeof vnode,
        isArray: Array.isArray(vnode),
        hasTag: vnode?.tag,
        constructor: vnode?.constructor?.name,
        keys: vnode ? Object.keys(vnode).slice(0, 10) : []
      });
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

    if (this.debugMode) {
      console.log('[VNodeRenderer] ✅ Rendered successfully');
    }

    return Array.isArray(domNode) ? domNode[0] : domNode;
  }

  createDOMNode(vnode) {
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

    // ✅ ENHANCED DEBUG: Check if it's a valid VNode
    if (!vnode.tag) {
      console.error('❌ Invalid VNode: missing tag');
      console.error('📋 Object details:', {
        type: typeof vnode,
        constructor: vnode?.constructor?.name,
        hasTag: vnode?.tag !== undefined,
        hasBuild: typeof vnode?.build === 'function',
        hasCreateState: typeof vnode?.createState === 'function',
        hasCreateElement: typeof vnode?.createElement === 'function',
        keys: Object.keys(vnode).slice(0, 20)
      });
      console.error('🔍 Full object:', vnode);
      
      // Try to identify what it is
      if (typeof vnode.build === 'function') {
        console.error('❌ This looks like a WIDGET, not a VNode!');
        console.error('   Widget type:', vnode.constructor.name);
        console.error('   Widget should have been built to VNode before rendering');
      } else if (typeof vnode.createElement === 'function') {
        console.error('❌ This looks like a WIDGET with createElement!');
      } else if (vnode.appBar || vnode.body || vnode.floatingActionButton) {
        console.error('❌ This looks like a SCAFFOLD widget instance!');
      }
      
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

  renderChildren(parent, children) {
    children.forEach((child, index) => {
      const childNode = this.createDOMNode(child);
      
      if (childNode) {
        if (Array.isArray(childNode)) {
          childNode.forEach(node => parent.appendChild(node));
        } else {
          parent.appendChild(childNode);
        }

        if (child && typeof child === 'object' && child.tag) {
          child._parent = parent._vnode;
          child._index = index;
        }
      }
    });
  }

  applyProps(element, props) {
    Object.entries(props).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      try {
        if (key === 'className' || key === 'class') {
          element.className = value;
          return;
        }

        if (key === 'value' && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
          element.value = value;
          return;
        }

        if (key === 'checked' && element.tagName === 'INPUT') {
          element.checked = !!value;
          return;
        }

        if (key === 'selected' && element.tagName === 'OPTION') {
          element.selected = !!value;
          return;
        }

        if (key === 'disabled') {
          element.disabled = !!value;
          return;
        }

        if (key.startsWith('data-') || key.startsWith('aria-')) {
          element.setAttribute(key, String(value));
          return;
        }

        if (typeof value === 'boolean') {
          if (value) {
            element.setAttribute(key, '');
          } else {
            element.removeAttribute(key);
          }
          return;
        }

        if (key in element) {
          element[key] = value;
        } else {
          element.setAttribute(key, String(value));
        }
      } catch (error) {
        console.warn(`Failed to set prop ${key}:`, error);
        try {
          element.setAttribute(key, String(value));
        } catch (e) {
          console.error(`Failed to set attribute ${key}:`, e);
        }
      }
    });
  }

  applyStyles(element, styles) {
    Object.entries(styles).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        try {
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

  applyEvents(element, events) {
    Object.entries(events).forEach(([eventName, handler]) => {
      if (typeof handler !== 'function') {
        console.warn(`Event handler for ${eventName} is not a function`);
        return;
      }

      try {
        const normalizedName = eventName
          .replace(/^on/, '')
          .toLowerCase();

        if (!element._eventListeners) {
          element._eventListeners = {};
        }

        if (element._eventListeners[normalizedName]) {
          element.removeEventListener(
            normalizedName,
            element._eventListeners[normalizedName]
          );
        }

        element.addEventListener(normalizedName, handler);
        element._eventListeners[normalizedName] = handler;
      } catch (error) {
        console.error(`Failed to attach event ${eventName}:`, error);
      }
    });
  }

  clearElement(element) {
    this.cleanupEventListeners(element);
    element.innerHTML = '';
  }

  cleanupEventListeners(element) {
    if (!element) return;

    if (element._eventListeners) {
      Object.entries(element._eventListeners).forEach(([event, handler]) => {
        element.removeEventListener(event, handler);
      });
      element._eventListeners = null;
    }

    if (element._vnode) {
      element._vnode._element = null;
      element._vnode = null;
    }

    Array.from(element.children).forEach(child => {
      this.cleanupEventListeners(child);
    });
  }

  updateProps(element, oldProps = {}, newProps = {}) {
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

    this.applyProps(element, newProps);
  }

  updateStyles(element, oldStyles = {}, newStyles = {}) {
    Object.keys(oldStyles).forEach(key => {
      if (!(key in newStyles)) {
        element.style[key] = '';
      }
    });

    this.applyStyles(element, newStyles);
  }

  updateEvents(element, oldEvents = {}, newEvents = {}) {
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

    this.applyEvents(element, newEvents);
  }

  replaceElement(oldElement, newVNode) {
    const newElement = this.createDOMNode(newVNode);
    
    if (oldElement.parentNode && newElement) {
      this.cleanupEventListeners(oldElement);
      oldElement.parentNode.replaceChild(newElement, oldElement);
    }

    return newElement;
  }

  removeElement(element) {
    if (!element || !element.parentNode) return;
    this.cleanupEventListeners(element);
    element.parentNode.removeChild(element);
  }

  insertAt(parent, vnode, index) {
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

  findElementByPath(root, indexPath) {
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

  getElementPath(element) {
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

  batchRender(vnodes, container) {
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

    this.clearElement(container);
    container.appendChild(fragment);
  }

  needsUpdate(element, vnode) {
    if (!element._vnode) return true;
    
    const oldVNode = element._vnode;

    if (oldVNode.tag !== vnode.tag) return true;
    if (oldVNode.key !== vnode.key) return true;

    const oldProps = oldVNode.props || {};
    const newProps = vnode.props || {};
    if (Object.keys(oldProps).length !== Object.keys(newProps).length) {
      return true;
    }

    const oldStyles = oldVNode.style || {};
    const newStyles = vnode.style || {};
    if (Object.keys(oldStyles).length !== Object.keys(newStyles).length) {
      return true;
    }

    return false;
  }
}

export { VNodeRenderer };