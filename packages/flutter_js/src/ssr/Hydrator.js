// ============================================================================
// HYDRATOR - Client-Side Hydration
// Attaches interactivity to server-rendered HTML
// Enables: SEO + Interactivity, Fast page load, Progressive enhancement
// ============================================================================

import { VNodeRenderer } from './vnode_renderer.js';
import { VNodeDiffer } from './vnode_differ.js';

/**
 * Hydrator - Attach interactivity to server-rendered HTML
 * Process:
 * 1. Server renders widget tree to HTML
 * 2. HTML sent to client
 * 3. Client hydrates: attaches event listeners without re-rendering
 * 4. Widget becomes interactive
 */
class Hydrator {
  /**
   * Hydrate server-rendered HTML with client-side interactivity
   *
   * Usage (client-side):
   * import { hydrate } from './hydrator.js';
   * hydrate(document.getElementById('root'));
   */
  static async hydrate(rootElement, options = {}) {
    if (!rootElement) {
      throw new Error('Root element required for hydration');
    }

    const {
      widget = null,
      initialState = {},
      debugMode = false
    } = options;

    if (debugMode) {
      console.log('🌊 Starting hydration...');
      console.time('Hydration');
    }

    try {
      // Step 1: Extract initial state from HTML if available
      const state = this.extractInitialState(initialState);
      if (debugMode) {
        console.log('📦 Initial state:', state);
      }

      // Step 2: If widget provided, build virtual tree
      if (widget) {
        const element = widget.createElement();
        element.mount(null);
        const vnode = element.performRebuild();

        // Step 3: Hydrate the VNode tree onto existing DOM
        this.hydrateVNode(vnode, rootElement, state);
      } else {
        // Step 4: Just attach event listeners to existing DOM
        this.attachEventsToDOM(rootElement);
      }

      if (debugMode) {
        console.timeEnd('Hydration');
        console.log('✅ Hydration complete');
      }

      // Mark root as hydrated
      rootElement.setAttribute('data-hydrated', 'true');

      return {
        success: true,
        rootElement,
        state
      };
    } catch (error) {
      console.error('❌ Hydration failed:', error);
      throw error;
    }
  }

  /**
   * Hydrate VNode tree onto existing DOM
   * Matches VNode structure to DOM, attaches event listeners
   */
  static hydrateVNode(vnode, domElement, state = {}) {
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      // Text node - verify matches
      const expectedText = String(vnode);
      const actualText = domElement.textContent.trim();
      
      if (expectedText.trim() !== actualText) {
        console.warn(
          `Text mismatch during hydration:`,
          `expected "${expectedText}", got "${actualText}"`
        );
      }
      return;
    }

    if (!vnode || !vnode.tag) {
      return;
    }

    // Verify tag matches
    if (domElement.tagName.toLowerCase() !== vnode.tag.toLowerCase()) {
      throw new Error(
        `Tag mismatch during hydration: ` +
        `expected <${vnode.tag}>, got <${domElement.tagName.toLowerCase()}>`
      );
    }

    // Attach events (props are already in HTML from SSR)
    if (vnode.events && typeof vnode.events === 'object') {
      this.attachEventsToElement(domElement, vnode.events);
    }

    // Recursively hydrate children
    if (vnode.children && Array.isArray(vnode.children)) {
      let childIndex = 0;
      
      Array.from(domElement.childNodes).forEach(childNode => {
        if (childIndex < vnode.children.length) {
          const vnodeChild = vnode.children[childIndex];
          
          if (vnodeChild instanceof VNode) {
            // Element node
            if (childNode.nodeType === 1) {
              this.hydrateVNode(vnodeChild, childNode, state);
              childIndex++;
            }
          } else if (typeof vnodeChild === 'string' || typeof vnodeChild === 'number') {
            // Text node
            if (childNode.nodeType === 3) {
              childIndex++;
            }
          }
        }
      });
    }

    // Store reference to VNode for future updates
    domElement._vnode = vnode;
  }

  /**
   * Attach event listeners to element
   */
  static attachEventsToElement(element, events) {
    Object.entries(events).forEach(([eventName, handler]) => {
      if (typeof handler === 'function') {
        // Normalize event name
        const name = eventName.startsWith('on')
          ? eventName.slice(2).toLowerCase()
          : eventName.toLowerCase();

        element.addEventListener(name, handler);
      }
    });
  }

  /**
   * Attach events to existing DOM (when no VNode provided)
   * Traverses DOM and looks for data-event-* attributes
   */
  static attachEventsToDOM(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    let currentElement = walker.nextNode();
    while (currentElement) {
      // Find all data-event-* attributes
      Array.from(currentElement.attributes).forEach(attr => {
        if (attr.name.startsWith('data-event-')) {
          const eventName = attr.name.replace('data-event-', '');
          const handlerName = attr.value;

          // Get handler function from window or global scope
          const handler = this.getHandlerFunction(handlerName);
          if (handler) {
            currentElement.addEventListener(eventName, handler);
          }
        }
      });

      currentElement = walker.nextNode();
    }
  }

  /**
   * Extract initial state from HTML script tag
   */
  static extractInitialState(fallback = {}) {
    const scriptTag = document.getElementById('__INITIAL_STATE__');
    
    if (!scriptTag) {
      return fallback;
    }

    try {
      return JSON.parse(scriptTag.textContent);
    } catch (error) {
      console.error('Failed to parse initial state:', error);
      return fallback;
    }
  }

  /**
   * Get handler function from window/global scope
   */
  static getHandlerFunction(name) {
    const parts = name.split('.');
    let fn = window;

    for (const part of parts) {
      fn = fn[part];
      if (!fn) break;
    }

    return typeof fn === 'function' ? fn : null;
  }

  /**
   * Validate hydration - check if SSR and VNode match
   */
  static validateHydration(vnode, domElement) {
    const errors = [];

    // Check tag
    if (vnode.tag && domElement.tagName.toLowerCase() !== vnode.tag.toLowerCase()) {
      errors.push(`Tag mismatch: expected ${vnode.tag}, got ${domElement.tagName}`);
    }

    // Check props
    if (vnode.props) {
      Object.entries(vnode.props).forEach(([key, value]) => {
        if (key === 'className') {
          if (domElement.className !== value) {
            errors.push(`className mismatch for ${vnode.tag}`);
          }
        } else if (key === 'style') {
          // Style comparison is complex, skip for now
        } else if (!key.startsWith('on')) {
          const domValue = domElement.getAttribute(key);
          if (String(value) !== domValue) {
            errors.push(`Prop mismatch: ${key}="${value}" vs "${domValue}"`);
          }
        }
      });
    }

    // Check children count
    if (vnode.children) {
      const elementChildren = Array.from(domElement.childNodes).filter(
        n => n.nodeType === 1
      );
      const vnodeChildren = vnode.children.filter(v => v instanceof VNode);
      
      if (vnodeChildren.length !== elementChildren.length) {
        errors.push(
          `Child count mismatch: expected ${vnodeChildren.length}, ` +
          `got ${elementChildren.length}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Mismatch recovery - when SSR and CSR don't match
   * Falls back to full client-side render
   */
  static recoverFromMismatch(rootElement, widget) {
    console.warn('🔄 Hydration mismatch detected, re-rendering...');

    // Clear existing content
    rootElement.innerHTML = '';

    // Re-render from scratch (CSR fallback)
    const element = widget.createElement();
    element.mount(null);
    const vnode = element.performRebuild();

    // Render to DOM
    const domElement = VNodeRenderer.createDOMNode(vnode);
    rootElement.appendChild(domElement);

    return domElement;
  }
}

export { Hydrator };