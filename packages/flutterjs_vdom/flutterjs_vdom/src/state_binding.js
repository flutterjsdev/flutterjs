/**
 * StateBinding - Connects VNode properties to StatefulWidget state
 * 
 * Manages two-way binding between:
 * - Flutter StatefulWidget state properties
 * - VNode tree and rendered DOM elements
 * 
 * Features:
 * - Automatic state-to-DOM synchronization
 * - DOM-to-state event handling
 * - One-way and two-way binding modes
 * - Nested property binding
 * - Computed/derived values
 * - Binding validation
 * - Memory management
 * - Change detection
 */

/**
 * Binding mode constants
 */
const BindingMode = {
  ONE_WAY: 'oneWay',      // State → DOM only
  TWO_WAY: 'twoWay',      // State ↔ DOM (bidirectional)
  EVENT: 'event'          // DOM event → State
};

/**
 * StateBinding - Represents a single state-to-DOM binding
 */
class StateBinding {
  constructor({
    statefulWidgetId,
    stateProperty,
    vnode,
    domElement = null,
    mode = BindingMode.ONE_WAY,
    transform = null,
    validate = null,
    debounceMs = 0
  } = {}) {
    // Identity
    this.statefulWidgetId = statefulWidgetId;
    this.stateProperty = stateProperty;
    this.id = `binding-${statefulWidgetId}-${stateProperty}-${Date.now()}`;

    // References
    this.vnode = vnode;
    this.domElement = domElement;

    // Configuration
    this.mode = mode;
    this.transform = transform;     // Function to transform state value
    this.validate = validate;       // Function to validate value
    this.debounceMs = debounceMs;

    // State tracking
    this.currentValue = null;
    this.previousValue = null;
    this.isDirty = false;
    this.isActive = true;

    // Debouncing
    this.debounceTimer = null;
    this.pendingValue = null;

    // Event handlers
    this.onUpdate = null;
    this.onChange = null;
    this.onValidationError = null;

    // Listeners
    this.eventListeners = [];
  }

  /**
   * Attach binding to DOM element
   * @param {HTMLElement} element
   */
  attach(element) {
    if (!element) {
      throw new Error('Cannot attach binding to null element');
    }

    this.domElement = element;

    // Store binding reference on element
    if (!element._stateBindings) {
      element._stateBindings = [];
    }
    element._stateBindings.push(this);

    // Attach event listeners if TWO_WAY or EVENT mode
    if (this.mode === BindingMode.TWO_WAY || this.mode === BindingMode.EVENT) {
      this.attachEventListeners();
    }

    return this;
  }

  /**
   * Detach binding from DOM element
   */
  detach() {
    if (!this.domElement) {
      return;
    }

    // Remove event listeners
    this.removeEventListeners();

    // Remove from element's binding list
    if (this.domElement._stateBindings) {
      const index = this.domElement._stateBindings.indexOf(this);
      if (index !== -1) {
        this.domElement._stateBindings.splice(index, 1);
      }
    }

    this.domElement = null;
  }

  /**
   * Update DOM with state value
   * @param {*} stateValue
   */
  updateDOM(stateValue) {
    if (!this.isActive || !this.domElement) {
      return;
    }

    // Store previous value
    this.previousValue = this.currentValue;
    this.currentValue = stateValue;

    // Transform value if needed
    let displayValue = stateValue;
    if (typeof this.transform === 'function') {
      try {
        displayValue = this.transform(stateValue);
      } catch (error) {
        console.error('Transform error:', error);
        return;
      }
    }

    // Update based on element type
    this.applyToDOM(displayValue);

    // Call update callback
    if (typeof this.onUpdate === 'function') {
      try {
        this.onUpdate(displayValue, this.previousValue);
      } catch (error) {
        console.error('onUpdate callback error:', error);
      }
    }

    this.isDirty = false;
  }

  /**
   * Apply value to DOM element
   * @private
   */
  applyToDOM(value) {
    if (!this.domElement) return;

    const tagName = this.domElement.tagName;
    const type = this.domElement.type || '';
    // Class binding (CHECK FIRST)
  if (this.stateProperty === 'className' || this.stateProperty === 'class') {
    this.domElement.className = String(value ?? '');
    return;
  }
   // Style binding (CHECK FIRST)
  if (this.stateProperty.startsWith('style-')) {
    const styleProp = this.stateProperty.replace(/^style-/, '');
    this.domElement.style[styleProp] = String(value ?? '');
    return;
  }

  // Generic attribute binding (CHECK FIRST)
  if (this.stateProperty.startsWith('attr-')) {
    const attrName = this.stateProperty.replace(/^attr-/, '');
    this.domElement.setAttribute(attrName, String(value ?? ''));
    return;
  }

    // Text content binding
    if (tagName === 'SPAN' || tagName === 'DIV' || tagName === 'P' || tagName === 'H1' || 
        tagName === 'H2' || tagName === 'H3' || tagName === 'H4' || tagName === 'H5' || tagName === 'H6') {
      this.domElement.textContent = String(value ?? '');
      return;
    }

    // Input value binding
    if (tagName === 'INPUT' && (type === 'text' || type === 'password' || type === 'email' || type === 'number' || type === 'search' || type === 'url' || type === 'tel')) {
      this.domElement.value = String(value ?? '');
      return;
    }

    // Textarea binding
    if (tagName === 'TEXTAREA') {
      this.domElement.value = String(value ?? '');
      return;
    }

    // Select binding
    if (tagName === 'SELECT') {
      this.domElement.value = String(value ?? '');
      return;
    }

    // Checkbox binding
    if (tagName === 'INPUT' && type === 'checkbox') {
      this.domElement.checked = !!value;
      return;
    }

    // Radio button binding
    if (tagName === 'INPUT' && type === 'radio') {
      this.domElement.checked = String(value) === this.domElement.value;
      return;
    }

    // Image src binding
    if (tagName === 'IMG') {
      this.domElement.src = String(value ?? '');
      return;
    }

    // Href binding
    if (tagName === 'A') {
      this.domElement.href = String(value ?? '');
      return;
    }

    // Class binding
    if (this.stateProperty === 'className' || this.stateProperty === 'class') {
      this.domElement.className = String(value ?? '');
      return;
    }

    // Generic attribute binding
    if (this.stateProperty.startsWith('attr-')) {
      const attrName = this.stateProperty.replace(/^attr-/, '');
      this.domElement.setAttribute(attrName, String(value ?? ''));
      return;
    }

    // Style binding
    if (this.stateProperty.startsWith('style-')) {
      const styleProp = this.stateProperty.replace(/^style-/, '');
      this.domElement.style[styleProp] = String(value ?? '');
      return;
    }

    // Fallback: set as text content
    this.domElement.textContent = String(value ?? '');
  }

  /**
   * Get value from DOM element
   * @returns {*}
   */
  readFromDOM() {
    if (!this.domElement) {
      return null;
    }

    const tagName = this.domElement.tagName;
    const type = this.domElement.type || '';

    // Text content
    if (tagName === 'SPAN' || tagName === 'DIV' || tagName === 'P') {
      return this.domElement.textContent;
    }

    // Input value
    if (tagName === 'INPUT' && (type === 'text' || type === 'password' || type === 'email' || type === 'number')) {
      const value = this.domElement.value;
      // Try to parse as number if type is number
      if (type === 'number') {
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
      }
      return value;
    }

    // Textarea
    if (tagName === 'TEXTAREA') {
      return this.domElement.value;
    }

    // Select
    if (tagName === 'SELECT') {
      return this.domElement.value;
    }

    // Checkbox
    if (tagName === 'INPUT' && type === 'checkbox') {
      return this.domElement.checked;
    }

    // Radio
    if (tagName === 'INPUT' && type === 'radio') {
      return this.domElement.checked ? this.domElement.value : null;
    }

    return null;
  }

  /**
   * Attach event listeners for TWO_WAY/EVENT mode
   * @private
   */
  attachEventListeners() {
    if (!this.domElement) return;

    const tagName = this.domElement.tagName;
    const type = this.domElement.type || '';

    // Determine appropriate events
    let events = [];

    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
      events = ['input', 'change'];
    } else if (tagName === 'SPAN' || tagName === 'DIV') {
      events = ['click', 'change'];
    }

    // Create event handler
    const handler = (e) => this.handleDOMChange(e);

    // Attach listeners
    events.forEach(event => {
      this.domElement.addEventListener(event, handler);
      this.eventListeners.push({ event, handler });
    });
  }

  /**
   * Remove event listeners
   * @private
   */
  removeEventListeners() {
    if (!this.domElement) return;

    this.eventListeners.forEach(({ event, handler }) => {
      this.domElement.removeEventListener(event, handler);
    });

    this.eventListeners = [];
  }

  /**
   * Handle DOM change event
   * @private
   */
  handleDOMChange(event) {
    if (!this.isActive || this.mode === BindingMode.ONE_WAY) {
      return;
    }

    const value = this.readFromDOM();

    // Validate if needed
    if (typeof this.validate === 'function') {
      try {
        const valid = this.validate(value);
        if (!valid) {
          if (typeof this.onValidationError === 'function') {
            this.onValidationError(value);
          }
          // Revert to previous value
          this.updateDOM(this.currentValue);
          return;
        }
      } catch (error) {
        console.error('Validation error:', error);
        this.updateDOM(this.currentValue);
        return;
      }
    }

    // Apply debouncing if needed
    if (this.debounceMs > 0) {
      this.pendingValue = value;

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.notifyChange(this.pendingValue);
        this.debounceTimer = null;
      }, this.debounceMs);
    } else {
      this.notifyChange(value);
    }
  }

  /**
   * Notify of value change
   * @private
   */
  notifyChange(value) {
    this.isDirty = true;
    this.previousValue = this.currentValue;
    this.currentValue = value;

    if (typeof this.onChange === 'function') {
      try {
        this.onChange(value, this.previousValue);
      } catch (error) {
        console.error('onChange callback error:', error);
      }
    }
  }

  /**
   * Disable binding temporarily
   */
  disable() {
    this.isActive = false;
  }

  /**
   * Enable binding
   */
  enable() {
    this.isActive = true;
  }

  /**
   * Check if binding is dirty
   */
  isDirtyBinding() {
    return this.isDirty;
  }

  /**
   * Reset dirty flag
   */
  clearDirty() {
    this.isDirty = false;
  }

  /**
   * Destroy binding and cleanup
   */
  destroy() {
    this.detach();
    this.onUpdate = null;
    this.onChange = null;
    this.onValidationError = null;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

/**
 * StateBindingRegistry - Manages multiple state bindings
 */
class StateBindingRegistry {
  constructor() {
    this.bindings = new Map();  // statefulWidgetId → Map of stateProperty → StateBinding[]
  }

  /**
   * Register a state binding
   * @param {StateBinding} binding
   */
  register(binding) {
    if (!(binding instanceof StateBinding)) {
      throw new Error('Must register StateBinding instance');
    }

    const widgetId = binding.statefulWidgetId;
    const property = binding.stateProperty;

    if (!this.bindings.has(widgetId)) {
      this.bindings.set(widgetId, new Map());
    }

    const widgetBindings = this.bindings.get(widgetId);

    if (!widgetBindings.has(property)) {
      widgetBindings.set(property, []);
    }

    widgetBindings.get(property).push(binding);

    return binding.id;
  }

  /**
   * Unregister a binding
   * @param {string} bindingId
   */
  unregister(bindingId) {
    for (const widgetBindings of this.bindings.values()) {
      for (const bindings of widgetBindings.values()) {
        const index = bindings.findIndex(b => b.id === bindingId);
        if (index !== -1) {
          bindings[index].destroy();
          bindings.splice(index, 1);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Update state and sync to all bound DOM elements
   * @param {string} statefulWidgetId
   * @param {Object} stateUpdates - { property: value }
   */
  updateState(statefulWidgetId, stateUpdates) {
    if (!this.bindings.has(statefulWidgetId)) {
      return;
    }

    const widgetBindings = this.bindings.get(statefulWidgetId);

    Object.entries(stateUpdates).forEach(([property, value]) => {
      if (widgetBindings.has(property)) {
        const bindings = widgetBindings.get(property);
        bindings.forEach(binding => {
          binding.updateDOM(value);
        });
      }
    });
  }

  /**
   * Get dirty bindings (those modified from DOM)
   * @returns {StateBinding[]}
   */
  getDirtyBindings() {
    const dirty = [];

    for (const widgetBindings of this.bindings.values()) {
      for (const bindings of widgetBindings.values()) {
        bindings.forEach(binding => {
          if (binding.isDirtyBinding()) {
            dirty.push(binding);
          }
        });
      }
    }

    return dirty;
  }

  /**
   * Get dirty values as state object
   * @param {string} statefulWidgetId - Optional filter by widget
   * @returns {Object}
   */
  getDirtyValues(statefulWidgetId = null) {
    const values = {};

    for (const [widgetId, widgetBindings] of this.bindings) {
      if (statefulWidgetId && widgetId !== statefulWidgetId) {
        continue;
      }

      for (const [property, bindings] of widgetBindings) {
        for (const binding of bindings) {
          if (binding.isDirtyBinding()) {
            values[property] = binding.currentValue;
          }
        }
      }
    }

    return values;
  }

  /**
   * Clear dirty flags on all bindings
   */
  clearDirty() {
    for (const widgetBindings of this.bindings.values()) {
      for (const bindings of widgetBindings.values()) {
        bindings.forEach(binding => binding.clearDirty());
      }
    }
  }

  /**
   * Get all bindings for a widget
   * @param {string} statefulWidgetId
   * @returns {StateBinding[]}
   */
  getWidgetBindings(statefulWidgetId) {
    if (!this.bindings.has(statefulWidgetId)) {
      return [];
    }

    const bindings = [];
    const widgetBindings = this.bindings.get(statefulWidgetId);

    for (const bindingList of widgetBindings.values()) {
      bindings.push(...bindingList);
    }

    return bindings;
  }

  /**
   * Get bindings for a specific property
   * @param {string} statefulWidgetId
   * @param {string} property
   * @returns {StateBinding[]}
   */
  getPropertyBindings(statefulWidgetId, property) {
    if (!this.bindings.has(statefulWidgetId)) {
      return [];
    }

    const widgetBindings = this.bindings.get(statefulWidgetId);

    if (!widgetBindings.has(property)) {
      return [];
    }

    return widgetBindings.get(property);
  }

  /**
   * Remove all bindings for a widget
   * @param {string} statefulWidgetId
   */
  removeWidget(statefulWidgetId) {
    if (!this.bindings.has(statefulWidgetId)) {
      return;
    }

    const widgetBindings = this.bindings.get(statefulWidgetId);

    for (const bindings of widgetBindings.values()) {
      bindings.forEach(binding => binding.destroy());
    }

    this.bindings.delete(statefulWidgetId);
  }

  /**
   * Clear all bindings
   */
  clear() {
    for (const widgetBindings of this.bindings.values()) {
      for (const bindings of widgetBindings.values()) {
        bindings.forEach(binding => binding.destroy());
      }
    }

    this.bindings.clear();
  }

  /**
   * Get total number of bindings
   * @returns {number}
   */
  getBindingCount() {
    let count = 0;

    for (const widgetBindings of this.bindings.values()) {
      for (const bindings of widgetBindings.values()) {
        count += bindings.length;
      }
    }

    return count;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {
      totalBindings: 0,
      totalWidgets: 0,
      totalProperties: 0,
      dirtyBindings: 0,
      byMode: {}
    };

    stats.totalWidgets = this.bindings.size;

    for (const widgetBindings of this.bindings.values()) {
      stats.totalProperties += widgetBindings.size;

      for (const bindings of widgetBindings.values()) {
        stats.totalBindings += bindings.length;

        bindings.forEach(binding => {
          if (binding.isDirtyBinding()) {
            stats.dirtyBindings++;
          }

          if (!stats.byMode[binding.mode]) {
            stats.byMode[binding.mode] = 0;
          }
          stats.byMode[binding.mode]++;
        });
      }
    }

    return stats;
  }
}

/**
 * Helper to create bindings more easily
 */
function createBinding(config) {
  return new StateBinding(config);
}

/**
 * Helper to create bidirectional binding
 */
function createTwoWayBinding({
  statefulWidgetId,
  stateProperty,
  vnode,
  domElement = null,
  transform = null,
  validate = null,
  debounceMs = 0
} = {}) {
  return new StateBinding({
    statefulWidgetId,
    stateProperty,
    vnode,
    domElement,
    mode: BindingMode.TWO_WAY,
    transform,
    validate,
    debounceMs
  });
}

/**
 * Helper to create one-way binding
 */
function createOneWayBinding({
  statefulWidgetId,
  stateProperty,
  vnode,
  domElement = null,
  transform = null
} = {}) {
  return new StateBinding({
    statefulWidgetId,
    stateProperty,
    vnode,
    domElement,
    mode: BindingMode.ONE_WAY,
    transform
  });
}



export {BindingMode, StateBinding,StateBindingRegistry,createBinding,createTwoWayBinding,createOneWayBinding}