// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Hydrator - SSR to CSR Transition System
 * 
 * Handles the hydration process:
 * 1. Takes SSR-rendered HTML
 * 2. Matches it with VNode tree
 * 3. Attaches event listeners
 * 4. Restores state bindings
 * 5. Calls ref callbacks
 * 6. Makes the app interactive
 */

import { VNodeRenderer } from './vnode_renderer.js';

class Hydrator {
  /**
   * Hydrate SSR-rendered DOM with VNode tree
   * @param {HTMLElement} rootElement - Root element with SSR HTML
   * @param {VNode} vnodeTree - VNode tree to hydrate with
   * @param {Object} hydrationData - Metadata from SSR (optional)
   * @returns {HTMLElement} Hydrated root element
   */
  static hydrate(rootElement, vnodeTree, hydrationData = null) {
    if (!rootElement) {
      throw new Error('Root element is required for hydration');
    }

    if (!vnodeTree) {
      throw new Error('VNode tree is required for hydration');
    }

    // Load hydration data from script tag if not provided
    if (!hydrationData) {
      hydrationData = this.loadHydrationData();
    }

    // Validate hydration data
    if (hydrationData && !this.validateHydrationData(hydrationData)) {
      console.warn('Invalid hydration data, proceeding without it');
      hydrationData = null;
    }

    // Match DOM nodes with VNodes
    this.matchDOMToVNode(rootElement, vnodeTree);

    // Attach event listeners
    this.attachEventListeners(rootElement, vnodeTree, hydrationData);

    // Restore refs
    this.restoreRefs(rootElement, vnodeTree, hydrationData);

    // Initialize state bindings
    this.initializeStateBindings(rootElement, vnodeTree, hydrationData);

    // Mark as hydrated
    rootElement.setAttribute('data-hydrated', 'true');
    rootElement._hydrated = true;

    // Cleanup hydration data script
    this.cleanupHydrationData();

    return rootElement;
  }

  /**
   * Match DOM nodes with VNode tree (recursive)
   * @private
   */
  static matchDOMToVNode(domNode, vnode, path = '0') {
    if (!domNode || !vnode) return;

    // Text nodes
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      // Text nodes are already rendered correctly
      return;
    }

    // Skip non-VNode objects
    if (!vnode.tag) return;

    // Element nodes
    if (domNode.nodeType === Node.ELEMENT_NODE) {
      // Store bidirectional references
      domNode._vnode = vnode;
      vnode._element = domNode;
      vnode._path = path;

      // Verify tag matches (mismatch = hydration error)
      if (domNode.tagName.toLowerCase() !== vnode.tag.toLowerCase()) {
        console.warn(
          `Hydration mismatch at path ${path}: ` +
          `expected <${vnode.tag}>, got <${domNode.tagName.toLowerCase()}>`
        );
        // Could attempt recovery here, but for now just warn
      }

      // Match children recursively
      if (vnode.children && vnode.children.length > 0) {
        this.matchChildren(domNode, vnode.children, path);
      }
    }
  }

  /**
   * Match child nodes
   * @private
   */
  static matchChildren(parentDom, vnodeChildren, parentPath) {
    const domChildren = Array.from(parentDom.childNodes);
    let domIndex = 0;
    let vnodeIndex = 0;

    while (vnodeIndex < vnodeChildren.length && domIndex < domChildren.length) {
      const domChild = domChildren[domIndex];
      const vnodeChild = vnodeChildren[vnodeIndex];

      // Skip whitespace-only text nodes in DOM
      if (domChild.nodeType === Node.TEXT_NODE && !domChild.textContent.trim()) {
        domIndex++;
        continue;
      }

      // Skip null/undefined vnodes
      if (vnodeChild === null || vnodeChild === undefined) {
        vnodeIndex++;
        continue;
      }

      const childPath = `${parentPath}.${vnodeIndex}`;

      // Match text nodes
      if (typeof vnodeChild === 'string' || typeof vnodeChild === 'number') {
        if (domChild.nodeType === Node.TEXT_NODE) {
          // Verify content matches
          const vnodeText = String(vnodeChild);
          const domText = domChild.textContent;
          
          if (vnodeText !== domText) {
            console.warn(
              `Text content mismatch at ${childPath}: ` +
              `expected "${vnodeText}", got "${domText}"`
            );
          }
        }
        domIndex++;
        vnodeIndex++;
        continue;
      }

      // Match element nodes
      if (vnodeChild.tag && domChild.nodeType === Node.ELEMENT_NODE) {
        this.matchDOMToVNode(domChild, vnodeChild, childPath);
        domIndex++;
        vnodeIndex++;
        continue;
      }

      // If we get here, there's a mismatch - skip both and continue
      domIndex++;
      vnodeIndex++;
    }
  }

  /**
   * Attach event listeners from VNode tree
   * @private
   */
  static attachEventListeners(rootElement, vnode, hydrationData) {
    if (!vnode || typeof vnode !== 'object' || !vnode.tag) {
      return;
    }

    // Attach events on this node
    if (vnode._element && vnode.events && Object.keys(vnode.events).length > 0) {
      VNodeRenderer.applyEvents(vnode._element, vnode.events);
    }

    // Recursively attach events on children
    if (vnode.children && Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        this.attachEventListeners(rootElement, child, hydrationData);
      });
    }
  }

  /**
   * Restore ref callbacks
   * @private
   */
  static restoreRefs(rootElement, vnode, hydrationData) {
    if (!vnode || typeof vnode !== 'object' || !vnode.tag) {
      return;
    }

    // Call ref callback if present
    if (vnode._element && vnode.ref && typeof vnode.ref === 'function') {
      try {
        vnode.ref(vnode._element);
      } catch (error) {
        console.error('Error calling ref callback:', error);
      }
    }

    // Recursively restore refs on children
    if (vnode.children && Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        this.restoreRefs(rootElement, child, hydrationData);
      });
    }
  }

  /**
   * Initialize state bindings
   * @private
   */
  static initializeStateBindings(rootElement, vnode, hydrationData) {
    if (!vnode || typeof vnode !== 'object' || !vnode.tag) {
      return;
    }

    // Register state binding if present
    if (vnode.isStateBinding && vnode._element) {
      // Store binding information for later state updates
      if (!rootElement._stateBindings) {
        rootElement._stateBindings = [];
      }

      rootElement._stateBindings.push({
        element: vnode._element,
        widgetId: vnode.statefulWidgetId,
        property: vnode.stateProperty,
        updateFn: vnode.updateFn
      });
    }

    // Recursively initialize state bindings on children
    if (vnode.children && Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        this.initializeStateBindings(rootElement, child, hydrationData);
      });
    }
  }

  /**
   * Load hydration data from script tag
   * @private
   */
  static loadHydrationData() {
    if (typeof document === 'undefined') {
      return null;
    }

    const script = document.getElementById('__FLUTTERJS_HYDRATION_DATA__');
    if (!script) {
      return null;
    }

    try {
      return JSON.parse(script.textContent);
    } catch (error) {
      console.error('Failed to parse hydration data:', error);
      return null;
    }
  }

  /**
   * Validate hydration data structure
   * @private
   */
  static validateHydrationData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check required fields
    if (!data.version) {
      return false;
    }

    // Check arrays exist
    const requiredArrays = ['widgets', 'stateBindings', 'events', 'refs'];
    for (const key of requiredArrays) {
      if (!Array.isArray(data[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cleanup hydration data script tag
   * @private
   */
  static cleanupHydrationData() {
    if (typeof document === 'undefined') {
      return;
    }

    const script = document.getElementById('__FLUTTERJS_HYDRATION_DATA__');
    if (script && script.parentNode) {
      script.parentNode.removeChild(script);
    }
  }

  /**
   * Check if element is hydrated
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if hydrated
   */
  static isHydrated(element) {
    return element && (element._hydrated === true || element.hasAttribute('data-hydrated'));
  }

  /**
   * Generate hydration data from VNode tree
   * @param {VNode} vnode - VNode tree
   * @returns {Object} Hydration data
   */
  static generateHydrationData(vnode) {
    const data = {
      version: '1.0.0',
      timestamp: Date.now(),
      widgets: [],
      stateBindings: [],
      events: [],
      refs: []
    };

    this.collectHydrationData(vnode, data, '0');

    return data;
  }

  /**
   * Collect hydration data recursively
   * @private
   */
  static collectHydrationData(vnode, data, path) {
    if (!vnode || typeof vnode !== 'object' || !vnode.tag) {
      return;
    }

    // Collect widget metadata
    if (vnode.metadata && vnode.metadata.widgetType) {
      data.widgets.push({
        path,
        type: vnode.metadata.widgetType,
        props: vnode.metadata.flutterProps || {},
        key: vnode.key
      });
    }

    // Collect state bindings
    if (vnode.isStateBinding) {
      data.stateBindings.push({
        path,
        widgetId: vnode.statefulWidgetId,
        property: vnode.stateProperty
      });
    }

    // Collect event handlers (just names, not functions)
    if (vnode.events && Object.keys(vnode.events).length > 0) {
      data.events.push({
        path,
        events: Object.keys(vnode.events)
      });
    }

    // Collect refs
    if (vnode.ref) {
      data.refs.push({
        path,
        hasRef: true
      });
    }

    // Recursively collect from children
    if (vnode.children && Array.isArray(vnode.children)) {
      vnode.children.forEach((child, index) => {
        if (child && typeof child === 'object' && child.tag) {
          this.collectHydrationData(child, data, `${path}.${index}`);
        }
      });
    }
  }

  /**
   * Partial hydration - hydrate only specific subtree
   * @param {HTMLElement} element - Subtree root element
   * @param {VNode} vnode - VNode for subtree
   * @returns {HTMLElement} Hydrated element
   */
  static hydratePartial(element, vnode) {
    if (!element || !vnode) {
      throw new Error('Element and VNode required for partial hydration');
    }

    // Match and hydrate just this subtree
    this.matchDOMToVNode(element, vnode);
    this.attachEventListeners(element, vnode, null);
    this.restoreRefs(element, vnode, null);
    this.initializeStateBindings(element, vnode, null);

    element.setAttribute('data-hydrated', 'true');
    element._hydrated = true;

    return element;
  }

  /**
   * Dehydrate - remove all hydration (for testing/cleanup)
   * @param {HTMLElement} element - Element to dehydrate
   */
  static dehydrate(element) {
    if (!element) return;

    // Remove event listeners
    VNodeRenderer.cleanupEventListeners(element);

    // Remove hydration markers
    element.removeAttribute('data-hydrated');
    delete element._hydrated;
    delete element._stateBindings;

    // Recursively dehydrate children
    Array.from(element.children).forEach(child => {
      this.dehydrate(child);
    });
  }

  /**
   * Verify hydration correctness
   * @param {HTMLElement} rootElement - Root element
   * @param {VNode} vnode - VNode tree
   * @returns {Object} Verification report
   */
  static verifyHydration(rootElement, vnode) {
    const report = {
      success: true,
      mismatches: [],
      warnings: [],
      stats: {
        nodesChecked: 0,
        nodesMatched: 0,
        eventListenersAttached: 0,
        refsRestored: 0,
        stateBindings: 0
      }
    };

    this.verifyNode(rootElement, vnode, report, '0');

    report.success = report.mismatches.length === 0;

    return report;
  }

  /**
   * Verify single node
   * @private
   */
  static verifyNode(domNode, vnode, report, path) {
    if (!vnode || typeof vnode !== 'object' || !vnode.tag) {
      return;
    }

    report.stats.nodesChecked++;

    // Check if DOM node exists
    if (!domNode) {
      report.mismatches.push({
        path,
        type: 'missing-dom',
        message: `DOM node missing for VNode <${vnode.tag}>`
      });
      return;
    }

    // Check if references are set
    if (!domNode._vnode || !vnode._element) {
      report.warnings.push({
        path,
        type: 'missing-reference',
        message: 'VNode-DOM references not set'
      });
    } else {
      report.stats.nodesMatched++;
    }

    // Check if tag matches
    if (domNode.tagName.toLowerCase() !== vnode.tag.toLowerCase()) {
      report.mismatches.push({
        path,
        type: 'tag-mismatch',
        expected: vnode.tag,
        actual: domNode.tagName.toLowerCase()
      });
    }

    // Check if events are attached
    if (vnode.events && Object.keys(vnode.events).length > 0) {
      if (domNode._eventListeners) {
        report.stats.eventListenersAttached += Object.keys(domNode._eventListeners).length;
      } else {
        report.warnings.push({
          path,
          type: 'missing-events',
          message: 'Event listeners not attached'
        });
      }
    }

    // Check if ref was called
    if (vnode.ref) {
      report.stats.refsRestored++;
    }

    // Check state bindings
    if (vnode.isStateBinding) {
      report.stats.stateBindings++;
    }

    // Recursively verify children
    if (vnode.children && Array.isArray(vnode.children)) {
      const domChildren = Array.from(domNode.childNodes).filter(
        child => child.nodeType === Node.ELEMENT_NODE
      );

      vnode.children.forEach((child, index) => {
        if (child && typeof child === 'object' && child.tag) {
          const domChild = domChildren[index];
          this.verifyNode(domChild, child, report, `${path}.${index}`);
        }
      });
    }
  }

  /**
   * Get hydration statistics
   * @param {HTMLElement} rootElement - Hydrated root element
   * @returns {Object} Statistics
   */
  static getStats(rootElement) {
    const stats = {
      isHydrated: this.isHydrated(rootElement),
      totalElements: 0,
      elementsWithEvents: 0,
      elementsWithRefs: 0,
      stateBindings: 0
    };

    const countRecursive = (element) => {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;

      stats.totalElements++;

      if (element._eventListeners && Object.keys(element._eventListeners).length > 0) {
        stats.elementsWithEvents++;
      }

      if (element._vnode && element._vnode.ref) {
        stats.elementsWithRefs++;
      }

      Array.from(element.children).forEach(countRecursive);
    };

    countRecursive(rootElement);

    if (rootElement._stateBindings) {
      stats.stateBindings = rootElement._stateBindings.length;
    }

    return stats;
  }
}



export {Hydrator}