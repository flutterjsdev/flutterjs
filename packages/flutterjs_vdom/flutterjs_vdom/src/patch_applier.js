/**
 * PatchApplier - Simplified & Robust Version
 * Applies VNode patches to actual DOM
 * 
 * Key principles:
 * - Index '0' always means the direct child
 * - Parent is always found from the root
 * - Simple, straightforward logic
 */

export class PatchApplier {
  /**
   * Apply patches to DOM
   * @param {HTMLElement} rootElement - Element to apply patches to
   * @param {Patch[]} patches - Array of patches
   * @param {Object} options - Options
   * @returns {Object} Result
   */
  static apply(rootElement, patches, options = {}) {
    if (!rootElement || !Array.isArray(patches) || patches.length === 0) {
      return { success: true, patchesApplied: 0, totalPatches: 0 };
    }

    let patchesApplied = 0;
    const errors = [];

    try {
      // Order patches: REMOVE first (reverse order), then others
      const orderedPatches = this.orderPatches(patches);

      orderedPatches.forEach((patch) => {
        try {
          this.applyPatch(rootElement, patch);
          patchesApplied++;
        } catch (error) {
          errors.push(`Patch ${patch.type} at ${patch.index}: ${error.message}`);
        }
      });

      return {
        success: errors.length === 0,
        patchesApplied,
        totalPatches: patches.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        success: false,
        patchesApplied,
        error: error.message
      };
    }
  }

  /**
   * Order patches for safe application
   * REMOVE first (deepest first), then CREATE, REPLACE, then all UPDATES
   */
  static orderPatches(patches) {
    const byType = { REMOVE: [], CREATE: [], REPLACE: [], UPDATE: [] };

    patches.forEach(patch => {
      if (patch.type === 'REMOVE') {
        byType.REMOVE.push(patch);
      } else if (patch.type === 'CREATE') {
        byType.CREATE.push(patch);
      } else if (patch.type === 'REPLACE') {
        byType.REPLACE.push(patch);
      } else {
        byType.UPDATE.push(patch);
      }
    });

    // Sort REMOVE by depth (deepest first, by counting dots)
    byType.REMOVE.sort((a, b) => {
      const depthA = String(a.index || '0').split('.').length;
      const depthB = String(b.index || '0').split('.').length;
      return depthB - depthA;
    });

    return [...byType.REMOVE, ...byType.CREATE, ...byType.REPLACE, ...byType.UPDATE];
  }

  /**
   * Apply single patch
   */
  static applyPatch(rootElement, patch) {
    const { type, index } = patch;

    switch (type) {
      case 'CREATE':
        return this._create(rootElement, patch);
      case 'REMOVE':
        return this._remove(rootElement, patch);
      case 'REPLACE':
        return this._replace(rootElement, patch);
      case 'UPDATE_PROPS':
        return this._updateProps(rootElement, patch);
      case 'UPDATE_STYLE':
        return this._updateStyle(rootElement, patch);
      case 'UPDATE_TEXT':
        return this._updateText(rootElement, patch);
      case 'UPDATE_EVENTS':
        return this._updateEvents(rootElement, patch);
      default:
        throw new Error(`Unknown patch type: ${type}`);
    }
  }

  /**
   * Find element by index path
   * CRITICAL: Index '0' means FIRST CHILD of rootElement, NOT the root itself
   * Index '0' = first child (rootElement.childNodes[0])
   * Index '1' = second child (rootElement.childNodes[1])
   * Index '0.1' = first child's second child
   * Index '1.0.2' = second child's first child's third child
   */
  static _findElement(rootElement, index) {
    // No index or null/undefined = root element
    if (!index) {
      return rootElement;
    }

    // Parse index path
    let current = rootElement;
    const parts = String(index).split('.').map(p => parseInt(p, 10));

    // Navigate through the parts
    for (const partIndex of parts) {
      if (!current || !current.childNodes || partIndex >= current.childNodes.length) {
        console.warn(`_findElement: Cannot navigate to index ${index}, at part ${partIndex}, current has ${current?.childNodes?.length || 0} children`);
        return null;
      }
      current = current.childNodes[partIndex];
    }

    return current;
  }

  /**
   * Get child index from full index path
   * '0' -> 0
   * '0.1' -> 1
   * '0.1.2' -> 2
   */
  static _getChildIndex(index) {
    const str = String(index || '0');
    const parts = str.split('.');
    return parseInt(parts[parts.length - 1], 10);
  }

  /**
   * Get parent index from full index path
   * '0' -> null or '' (parent is the root element itself)
   * '0.1' -> '0' (parent of first child's second child)
   * '0.1.2' -> '0.1'
   */
  static _getParentIndex(index) {
    const str = String(index || '0');
    const parts = str.split('.');

    if (parts.length === 1) {
      // Direct children of root - parent is rootElement itself (return null/empty)
      return null;
    }

    parts.pop();
    return parts.join('.');
  }

  /**
   * CREATE - Add new element
   */
  static _create(rootElement, patch) {
    const { index, newNode } = patch;

    if (!newNode) {
      throw new Error('CREATE patch requires newNode');
    }

    // Get parent element
    const parentIndex = this._getParentIndex(index);
    let parent;

    if (parentIndex === null || parentIndex === '') {
      // Parent is the root element itself
      parent = rootElement;
    } else {
      parent = this._findElement(rootElement, parentIndex);
    }

    if (!parent) {
      throw new Error(`Parent element not found at index ${parentIndex}`);
    }

    // Create the new DOM element
    const newElement = this._createDOMNode(newNode);
    if (!newElement) {
      throw new Error('Failed to create DOM node');
    }

    // Get insertion position
    const childIndex = this._getChildIndex(index);

    // Insert at correct position
    if (childIndex >= parent.childNodes.length) {
      parent.appendChild(newElement);
    } else {
      parent.insertBefore(newElement, parent.childNodes[childIndex]);
    }

    return newElement;
  }

  /**
   * REMOVE - Delete element
   */
  static _remove(rootElement, patch) {
    const { index } = patch;

    const element = this._findElement(rootElement, index);
    if (!element) {
      throw new Error(`Element not found at index ${index}`);
    }

    // Cleanup before removal
    this._cleanup(element);

    // Remove from DOM
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * REPLACE - Replace element entirely
   */
  static _replace(rootElement, patch) {
    const { index, newNode } = patch;

    if (!newNode) {
      throw new Error('REPLACE patch requires newNode');
    }

    const element = this._findElement(rootElement, index);
    if (!element) {
      throw new Error(`Element not found at index ${index}`);
    }

    // Root cannot be replaced
    if (element === rootElement) {
      throw new Error('Cannot replace root element (no parent)');
    }

    // Create new element
    const newElement = this._createDOMNode(newNode);
    if (!newElement) {
      throw new Error('Failed to create replacement DOM node');
    }

    // Cleanup old element
    this._cleanup(element);

    // Replace in DOM
    if (element.parentNode) {
      element.parentNode.replaceChild(newElement, element);
      return newElement;
    } else {
      throw new Error('Element has no parent node');
    }
  }

  /**
   * UPDATE_PROPS - Update HTML attributes
   */
  static _updateProps(rootElement, patch) {
    const { index, value } = patch;

    if (!value || !value.changes) {
      return;
    }

    const element = this._findElement(rootElement, index);
    if (!element) {
      console.warn(`_updateProps: Element not found at index ${index}`);
      return;
    }

    const { changes } = value;

    // Remove properties
    if (changes.removed) {
      Object.keys(changes.removed).forEach(key => {
        this._removeProp(element, key);
      });
    }

    // Update properties
    if (changes.updated) {
      Object.entries(changes.updated).forEach(([key, val]) => {
        this._setProp(element, key, val);
      });
    }

    // Add properties
    if (changes.added) {
      Object.entries(changes.added).forEach(([key, val]) => {
        this._setProp(element, key, val);
      });
    }
  }

  /**
   * UPDATE_STYLE - Update CSS styles
   */
  static _updateStyle(rootElement, patch) {
    const { index, value } = patch;

    if (!value || !value.changes) {
      return;
    }

    const element = this._findElement(rootElement, index);
    if (!element) {
      console.warn(`_updateStyle: Element not found at index ${index}`);
      return;
    }

    const { changes } = value;

    // Remove styles
    if (changes.removed) {
      Object.keys(changes.removed).forEach(key => {
        element.style[key] = '';
      });
    }

    // Update styles
    if (changes.updated) {
      Object.entries(changes.updated).forEach(([key, val]) => {
        try {
          element.style[key] = val;
        } catch (e) {
          console.warn(`Failed to set style ${key}`);
        }
      });
    }

    // Add styles
    if (changes.added) {
      Object.entries(changes.added).forEach(([key, val]) => {
        try {
          element.style[key] = val;
        } catch (e) {
          console.warn(`Failed to set style ${key}`);
        }
      });
    }
  }

  /**
   * UPDATE_TEXT - Update text content
   */
  static _updateText(rootElement, patch) {
    const { index, value } = patch;

    const element = this._findElement(rootElement, index);
    if (!element) {
      console.warn(`_updateText: Element not found at index ${index}`);
      return;
    }

    // Handle text nodes
    if (element.nodeType === 3) { // TEXT_NODE
      element.nodeValue = String(value !== undefined ? value : '');
    } else {
      element.textContent = String(value !== undefined ? value : '');
    }
  }

  /**
   * UPDATE_EVENTS - Update event listeners
   */
  static _updateEvents(rootElement, patch) {
    const { index, value } = patch;

    if (!value || !value.changes) {
      return;
    }

    const element = this._findElement(rootElement, index);
    if (!element) {
      console.warn(`_updateEvents: Element not found at index ${index}`);
      return;
    }

    const { changes } = value;

    // Remove events
    if (changes.removed) {
      Object.keys(changes.removed).forEach(eventName => {
        this._removeEventListener(element, eventName);
      });
    }

    // Update events
    if (changes.updated) {
      Object.entries(changes.updated).forEach(([eventName, handler]) => {
        this._removeEventListener(element, eventName);
        if (handler) {
          this._addEventListener(element, eventName, handler);
        }
      });
    }

    // Add events
    if (changes.added) {
      Object.entries(changes.added).forEach(([eventName, handler]) => {
        if (handler) {
          this._addEventListener(element, eventName, handler);
        }
      });
    }
  }

  /**
   * Create a DOM node from VNode
   */
  static _createDOMNode(vnode) {
    // Text node
    if (typeof vnode === 'string') {
      return document.createTextNode(vnode);
    }

    if (!vnode || typeof vnode !== 'object') {
      return document.createTextNode('');
    }

    // Element node
    const tag = vnode.tag || 'div';
    const element = document.createElement(tag);

    // ✅ CRITICAL: Link VNode to Element
    vnode._element = element;
    element._vnode = vnode;

    // Apply properties
    if (vnode.props && typeof vnode.props === 'object') {
      Object.entries(vnode.props).forEach(([key, val]) => {
        this._setProp(element, key, val);
      });
    }

    // Apply styles
    if (vnode.style && typeof vnode.style === 'object') {
      Object.entries(vnode.style).forEach(([key, val]) => {
        try {
          element.style[key] = val;
        } catch (e) {
          // Ignore style errors
        }
      });
    }

    // Add children
    if (vnode.children && Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        const childNode = this._createDOMNode(child);
        if (childNode) {
          element.appendChild(childNode);
        }
      });
    }

    // Attach event handlers
    if (vnode.events && typeof vnode.events === 'object') {
      Object.entries(vnode.events).forEach(([eventName, handler]) => {
        if (typeof handler === 'function') {
          this._addEventListener(element, eventName, handler);
        }
      });
    }

    return element;
  }

  /**
   * Set a property on element
   */
  static _setProp(element, key, value) {
    if (value === null || value === undefined) {
      this._removeProp(element, key);
      return;
    }

    // className
    if (key === 'className') {
      element.className = String(value);
      return;
    }

    // value (for inputs, textareas)
    if (key === 'value') {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
        element.value = String(value);
      }
      return;
    }

    // checked, disabled, selected (booleans)
    if (key === 'checked' || key === 'disabled' || key === 'selected') {
      element[key] = !!value;
      return;
    }

    // data-* and aria-* attributes
    if (key.startsWith('data-') || key.startsWith('aria-')) {
      element.setAttribute(key, String(value));
      return;
    }

    // Try to set as property first
    try {
      if (key in element) {
        element[key] = value;
      } else {
        element.setAttribute(key, String(value));
      }
    } catch (e) {
      try {
        element.setAttribute(key, String(value));
      } catch (e2) {
        // Fail silently
      }
    }
  }

  /**
   * Remove a property from element
   */
  static _removeProp(element, key) {
    if (key === 'className') {
      element.className = '';
      return;
    }

    if (key === 'value') {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = '';
      }
      return;
    }

    if (key === 'checked' || key === 'disabled' || key === 'selected') {
      element[key] = false;
      return;
    }

    try {
      element.removeAttribute(key);
    } catch (e) {
      // Fail silently
    }
  }

  /**
   * Add event listener to element
   */
  static _addEventListener(element, eventName, handler) {
    if (typeof handler !== 'function') {
      return;
    }

    try {
      // Normalize event name: onClick -> click, onMouseover -> mouseover
      const normalizedName = eventName
        .replace(/^on/, '')
        .toLowerCase();

      // Store reference for later removal
      if (!element._eventListeners) {
        element._eventListeners = {};
      }

      element.addEventListener(normalizedName, handler);
      element._eventListeners[normalizedName] = handler;
    } catch (e) {
      console.warn(`Failed to add event listener ${eventName}`);
    }
  }

  /**
   * Remove event listener from element
   */
  static _removeEventListener(element, eventName) {
    try {
      const normalizedName = eventName
        .replace(/^on/, '')
        .toLowerCase();

      if (element._eventListeners && element._eventListeners[normalizedName]) {
        element.removeEventListener(normalizedName, element._eventListeners[normalizedName]);
        delete element._eventListeners[normalizedName];
      }
    } catch (e) {
      console.warn(`Failed to remove event listener ${eventName}`);
    }
  }

  /**
   * Cleanup element before removal
   */
  static _cleanup(element) {
    if (!element) return;

    // Remove all event listeners
    if (element._eventListeners) {
      Object.entries(element._eventListeners).forEach(([name, handler]) => {
        try {
          element.removeEventListener(name, handler);
        } catch (e) {
          // Fail silently
        }
      });
      element._eventListeners = {};
    }

    // Recursively cleanup children
    if (element.childNodes) {
      for (let i = 0; i < element.childNodes.length; i++) {
        this._cleanup(element.childNodes[i]);
      }
    }
  }

  /**
   * Validate patches
   */
  static validate(patches) {
    const errors = [];
    const validTypes = ['CREATE', 'REMOVE', 'REPLACE', 'UPDATE_PROPS', 'UPDATE_STYLE', 'UPDATE_TEXT', 'UPDATE_EVENTS'];

    if (!Array.isArray(patches)) {
      errors.push('Patches must be an array');
      return errors;
    }

    patches.forEach((patch, i) => {
      if (!patch.type) {
        errors.push(`Patch ${i}: Missing type`);
        return;
      }

      if (!validTypes.includes(patch.type)) {
        errors.push(`Patch ${i}: Invalid type "${patch.type}"`);
      }
    });

    return errors;
  }

  /**
   * Get statistics about patches
   */
  static getStats(patches) {
    const stats = { total: patches.length, byType: {} };

    patches.forEach(p => {
      stats.byType[p.type] = (stats.byType[p.type] || 0) + 1;
    });

    return stats;
  }
}