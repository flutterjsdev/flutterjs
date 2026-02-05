// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Focus Manager
 * 
 * Manages keyboard focus and navigation across the widget tree.
 * Handles Tab navigation, autofocus, focus scopes, and programmatic focus control.
 * 
 * Features:
 * - Focus registration and tracking
 * - Keyboard navigation (Tab/Shift+Tab)
 * - Focus scopes for modal dialogs
 * - Autofocus support
 * - Focus event callbacks
 * - Accessibility support
 */

class FocusManager {
  constructor(runtime) {
    this.runtime = runtime;
    this.focusedElement = null;
    this.focusableElements = new Map(); // elementId → FocusableInfo
    this.focusScopes = new Map(); // scopeId → [elementIds]
    this.activeScopeId = null;
    
    // Focus event listeners
    this.focusChangeListeners = new Set();
    
    // Keyboard navigation
    this.keyboardEnabled = false;
    this.keyboardHandler = null;
  }
  
  /**
   * Register a focusable element
   * @param {string} elementId - Unique element identifier
   * @param {HTMLElement} domElement - Actual DOM element
   * @param {Object} options - Focus configuration
   */
  registerFocusable(elementId, domElement, options = {}) {
    if (!elementId || !domElement) {
      console.warn('[FocusManager] Invalid registration:', { elementId, domElement });
      return;
    }
    
    const focusableInfo = {
      elementId,
      element: domElement,
      canRequestFocus: options.canRequestFocus !== false,
      skipTraversal: options.skipTraversal === true,
      autofocus: options.autofocus === true,
      onFocusChange: options.onFocusChange || null,
      tabIndex: options.tabIndex ?? 0,
      scopeId: options.scopeId || null
    };
    
    this.focusableElements.set(elementId, focusableInfo);
    
    // Set tabIndex for keyboard navigation
    if (!focusableInfo.skipTraversal) {
      domElement.tabIndex = focusableInfo.tabIndex;
    }
    
    // Attach DOM focus/blur listeners
    this._attachDOMListeners(domElement, elementId);
    
    // Handle autofocus
    if (focusableInfo.autofocus) {
      // Defer to next tick to ensure element is mounted
      requestAnimationFrame(() => {
        if (this.focusableElements.has(elementId)) {
          this.requestFocus(elementId);
        }
      });
    }
  }
  
  /**
   * Unregister a focusable element
   * @param {string} elementId - Element to unregister
   */
  unregisterFocusable(elementId) {
    const info = this.focusableElements.get(elementId);
    if (!info) return;
    
    // Blur if currently focused
    if (this.focusedElement === elementId) {
      this.focusedElement = null;
      this._notifyFocusChange(null, elementId);
    }
    
    // Remove from scopes
    for (const [scopeId, elementIds] of this.focusScopes.entries()) {
      const index = elementIds.indexOf(elementId);
      if (index !== -1) {
        elementIds.splice(index, 1);
      }
    }
    
    // Remove DOM listeners
    this._detachDOMListeners(info.element, elementId);
    
    this.focusableElements.delete(elementId);
  }
  
  /**
   * Request focus for an element
   * @param {string} elementId - Element to focus
   * @param {Object} options - Focus options
   * @returns {boolean} Success
   */
  requestFocus(elementId, options = {}) {
    const info = this.focusableElements.get(elementId);
    
    if (!info) {
      console.warn('[FocusManager] Cannot focus unknown element:', elementId);
      return false;
    }
    
    if (!info.canRequestFocus) {
      console.warn('[FocusManager] Element cannot receive focus:', elementId);
      return false;
    }
    
    // Check scope restrictions
    if (this.activeScopeId && info.scopeId !== this.activeScopeId) {
      console.warn('[FocusManager] Focus request blocked by active scope');
      return false;
    }
    
    // Blur previous focus
    const previousFocus = this.focusedElement;
    if (previousFocus && previousFocus !== elementId) {
      this._blurElement(previousFocus);
    }
    
    // Focus new element
    try {
      info.element.focus(options);
      this.focusedElement = elementId;
      this._notifyFocusChange(elementId, previousFocus);
      
      // Call widget's onFocusChange callback
      if (info.onFocusChange) {
        info.onFocusChange(true);
      }
      
      return true;
    } catch (error) {
      console.error('[FocusManager] Focus failed:', error);
      return false;
    }
  }
  
  /**
   * Blur an element
   * @param {string} elementId - Element to blur
   */
  unfocus(elementId) {
    if (this.focusedElement !== elementId) return;
    
    this._blurElement(elementId);
    this.focusedElement = null;
    this._notifyFocusChange(null, elementId);
  }
  
  /**
   * Internal blur helper
   * @private
   */
  _blurElement(elementId) {
    const info = this.focusableElements.get(elementId);
    if (!info) return;
    
    try {
      info.element.blur();
      
      // Call widget's onFocusChange callback
      if (info.onFocusChange) {
        info.onFocusChange(false);
      }
    } catch (error) {
      console.error('[FocusManager] Blur failed:', error);
    }
  }
  
  /**
   * Move focus in a direction (Tab navigation)
   * @param {string} direction - 'forward' or 'backward'
   */
  moveFocus(direction = 'forward') {
    const focusable = this._getFocusableInScope();
    
    if (focusable.length === 0) {
      console.warn('[FocusManager] No focusable elements available');
      return;
    }
    
    // Sort by DOM position for correct tab order
    focusable.sort((a, b) => {
      const aInfo = this.focusableElements.get(a);
      const bInfo = this.focusableElements.get(b);
      
      // First by tabIndex
      if (aInfo.tabIndex !== bInfo.tabIndex) {
        return aInfo.tabIndex - bInfo.tabIndex;
      }
      
      // Then by DOM position
      const position = aInfo.element.compareDocumentPosition(bInfo.element);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return 0;
    });
    
    // Find current index
    const currentIndex = this.focusedElement 
      ? focusable.indexOf(this.focusedElement)
      : -1;
    
    // Calculate next index
    let nextIndex;
    if (direction === 'forward') {
      nextIndex = (currentIndex + 1) % focusable.length;
    } else {
      nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
    }
    
    // Focus next element
    const nextElementId = focusable[nextIndex];
    this.requestFocus(nextElementId);
  }
  
  /**
   * Get focusable elements in current scope
   * @private
   */
  _getFocusableInScope() {
    const allFocusable = Array.from(this.focusableElements.entries())
      .filter(([id, info]) => !info.skipTraversal)
      .map(([id]) => id);
    
    // If no active scope, return all
    if (!this.activeScopeId) {
      return allFocusable;
    }
    
    // Return only elements in active scope
    const scopeElements = this.focusScopes.get(this.activeScopeId) || [];
    return allFocusable.filter(id => scopeElements.includes(id));
  }
  
  /**
   * Create a focus scope (for modals, dialogs)
   * @param {string} scopeId - Unique scope identifier
   * @param {string[]} elementIds - Elements in this scope
   */
  createScope(scopeId, elementIds = []) {
    this.focusScopes.set(scopeId, elementIds);
  }
  
  /**
   * Add element to scope
   * @param {string} scopeId - Scope identifier
   * @param {string} elementId - Element to add
   */
  addToScope(scopeId, elementId) {
    if (!this.focusScopes.has(scopeId)) {
      this.createScope(scopeId);
    }
    
    const elements = this.focusScopes.get(scopeId);
    if (!elements.includes(elementId)) {
      elements.push(elementId);
    }
    
    // Update element's scope
    const info = this.focusableElements.get(elementId);
    if (info) {
      info.scopeId = scopeId;
    }
  }
  
  /**
   * Activate a focus scope (restrict focus to this scope)
   * @param {string} scopeId - Scope to activate
   */
  pushScope(scopeId) {
    if (!this.focusScopes.has(scopeId)) {
      console.warn('[FocusManager] Cannot activate unknown scope:', scopeId);
      return;
    }
    
    this.activeScopeId = scopeId;
    
    // If current focus is outside scope, blur it
    const currentInfo = this.focusedElement 
      ? this.focusableElements.get(this.focusedElement)
      : null;
    
    if (currentInfo && currentInfo.scopeId !== scopeId) {
      this.unfocus(this.focusedElement);
    }
  }
  
  /**
   * Deactivate current scope
   */
  popScope() {
    this.activeScopeId = null;
  }
  
  /**
   * Remove a focus scope
   * @param {string} scopeId - Scope to remove
   */
  removeScope(scopeId) {
    // Clear scope ID from all elements
    const elements = this.focusScopes.get(scopeId) || [];
    elements.forEach(elementId => {
      const info = this.focusableElements.get(elementId);
      if (info && info.scopeId === scopeId) {
        info.scopeId = null;
      }
    });
    
    this.focusScopes.delete(scopeId);
    
    // Clear active scope if it was this one
    if (this.activeScopeId === scopeId) {
      this.activeScopeId = null;
    }
  }
  
  /**
   * Setup keyboard navigation
   */
  setupKeyboardNavigation() {
    if (this.keyboardEnabled) return;
    
    this.keyboardHandler = (event) => {
      // Tab key
      if (event.key === 'Tab') {
        event.preventDefault();
        const direction = event.shiftKey ? 'backward' : 'forward';
        this.moveFocus(direction);
      }
      
      // Escape key - exit scope
      if (event.key === 'Escape' && this.activeScopeId) {
        this.popScope();
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
    this.keyboardEnabled = true;
  }
  
  /**
   * Disable keyboard navigation
   */
  disableKeyboardNavigation() {
    if (!this.keyboardEnabled) return;
    
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
    
    this.keyboardEnabled = false;
  }
  
  /**
   * Attach DOM focus/blur listeners
   * @private
   */
  _attachDOMListeners(element, elementId) {
    const focusHandler = () => {
      if (this.focusedElement !== elementId) {
        const previousFocus = this.focusedElement;
        this.focusedElement = elementId;
        this._notifyFocusChange(elementId, previousFocus);
        
        const info = this.focusableElements.get(elementId);
        if (info && info.onFocusChange) {
          info.onFocusChange(true);
        }
      }
    };
    
    const blurHandler = () => {
      if (this.focusedElement === elementId) {
        this.focusedElement = null;
        this._notifyFocusChange(null, elementId);
        
        const info = this.focusableElements.get(elementId);
        if (info && info.onFocusChange) {
          info.onFocusChange(false);
        }
      }
    };
    
    element.addEventListener('focus', focusHandler);
    element.addEventListener('blur', blurHandler);
    
    // Store handlers for cleanup
    element._focusHandlers = { focusHandler, blurHandler };
  }
  
  /**
   * Detach DOM listeners
   * @private
   */
  _detachDOMListeners(element, elementId) {
    if (!element._focusHandlers) return;
    
    const { focusHandler, blurHandler } = element._focusHandlers;
    element.removeEventListener('focus', focusHandler);
    element.removeEventListener('blur', blurHandler);
    
    delete element._focusHandlers;
  }
  
  /**
   * Add focus change listener
   * @param {Function} listener - Callback(newFocus, oldFocus)
   */
  addFocusChangeListener(listener) {
    this.focusChangeListeners.add(listener);
  }
  
  /**
   * Remove focus change listener
   * @param {Function} listener - Previously added listener
   */
  removeFocusChangeListener(listener) {
    this.focusChangeListeners.delete(listener);
  }
  
  /**
   * Notify all listeners of focus change
   * @private
   */
  _notifyFocusChange(newFocus, oldFocus) {
    this.focusChangeListeners.forEach(listener => {
      try {
        listener(newFocus, oldFocus);
      } catch (error) {
        console.error('[FocusManager] Listener error:', error);
      }
    });
  }
  
  /**
   * Get current focus
   * @returns {string|null} Currently focused element ID
   */
  get currentFocus() {
    return this.focusedElement;
  }
  
  /**
   * Check if element has focus
   * @param {string} elementId - Element to check
   * @returns {boolean}
   */
  hasFocus(elementId) {
    return this.focusedElement === elementId;
  }
  
  /**
   * Get all focusable elements
   * @returns {string[]} Array of element IDs
   */
  getFocusableElements() {
    return Array.from(this.focusableElements.keys());
  }
  
  /**
   * Get element info
   * @param {string} elementId - Element ID
   * @returns {Object|null} Element info
   */
  getElementInfo(elementId) {
    return this.focusableElements.get(elementId) || null;
  }
  
  /**
   * Clear all focus
   */
  clearFocus() {
    if (this.focusedElement) {
      this._blurElement(this.focusedElement);
      this.focusedElement = null;
    }
  }
  
  /**
   * Get focus statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalFocusable: this.focusableElements.size,
      currentFocus: this.focusedElement,
      activeScope: this.activeScopeId,
      scopeCount: this.focusScopes.size,
      keyboardEnabled: this.keyboardEnabled,
      listeners: this.focusChangeListeners.size
    };
  }
  
  /**
   * Dispose and cleanup
   */
  dispose() {
    // Disable keyboard navigation
    this.disableKeyboardNavigation();
    
    // Detach all DOM listeners
    for (const [elementId, info] of this.focusableElements.entries()) {
      this._detachDOMListeners(info.element, elementId);
    }
    
    // Clear all data
    this.focusableElements.clear();
    this.focusScopes.clear();
    this.focusChangeListeners.clear();
    this.focusedElement = null;
    this.activeScopeId = null;
  }
}


export {FocusManager};