/**
 * RenderEngine - Universal Rendering Engine
 * 
 * Automatically detects environment (server/client) and uses appropriate renderer:
 * - Server: SSR (HTML string generation)
 * - Client: CSR (DOM element creation)
 * 
 * Also handles:
 * - Hydration data generation for SSR
 * - Critical CSS extraction
 * - Asset bundling
 * - Performance monitoring
 */

import { VNodeRenderer } from './vnode_renderer.js';
import { SSRRenderer } from './ssr_renderer.js';

class RenderEngine {
  /**
   * Universal render method - auto-detects environment
   * @param {VNode} vnode - VNode tree to render
   * @param {HTMLElement|null} target - Target element (client only)
   * @param {Object} options - Rendering options
   * @returns {HTMLElement|string} DOM element (client) or HTML string (server)
   */
  static render(vnode, target = null, options = {}) {
    const env = this.detectEnvironment();

    if (env === 'server') {
      return this.renderServer(vnode, options);
    } else {
      return this.renderClient(vnode, target, options);
    }
  }

  /**
   * Detect execution environment
   * @returns {string} 'server' or 'client'
   */
  static detectEnvironment() {
    // Check for window object (browser)
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      return 'client';
    }

    // Check for Node.js
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      return 'server';
    }

    // Default to client
    return 'client';
  }

  /**
   * Server-side rendering
   * @param {VNode} vnode - VNode tree
   * @param {Object} options - SSR options
   * @returns {string} Complete HTML document
   */
  static renderServer(vnode, options = {}) {
    const {
      title = 'FlutterJS App',
      includeHydration = true,
      includeCriticalCSS = true,
      includeRuntime = true,
      meta = {},
      scripts = [],
      styles = []
    } = options;

    // Generate HTML from VNode
    const bodyHTML = SSRRenderer.renderVNode(vnode);

    // Generate hydration data
    const hydrationData = includeHydration 
      ? this.generateHydrationData(vnode)
      : null;

    // Extract critical CSS
    const criticalCSS = includeCriticalCSS
      ? this.extractCriticalCSS(vnode)
      : '';

    // Build complete HTML document
    return this.buildHTMLDocument({
      title,
      meta,
      criticalCSS,
      bodyHTML,
      hydrationData,
      scripts,
      styles,
      includeRuntime
    });
  }

  /**
   * Client-side rendering
   * @param {VNode} vnode - VNode tree
   * @param {HTMLElement} target - Target DOM element
   * @param {Object} options - CSR options
   * @returns {HTMLElement} Rendered DOM element
   */
  static renderClient(vnode, target, options = {}) {
    if (!target) {
      throw new Error('Target element is required for client-side rendering');
    }

    const {
      clear = true,
      measurePerformance = false
    } = options;

    const startTime = measurePerformance ? performance.now() : 0;

    // Render to DOM
    const element = VNodeRenderer.render(vnode, target, { clear });

    if (measurePerformance) {
      const endTime = performance.now();
      console.log(`Render time: ${(endTime - startTime).toFixed(2)}ms`);
    }

    return element;
  }

  /**
   * Build complete HTML document
   * @private
   */
  static buildHTMLDocument({
    title,
    meta,
    criticalCSS,
    bodyHTML,
    hydrationData,
    scripts,
    styles,
    includeRuntime
  }) {
    const metaTags = this.generateMetaTags(meta);
    const styleTags = this.generateStyleTags(styles, criticalCSS);
    const scriptTags = this.generateScriptTags(scripts, includeRuntime);
    const hydrationScript = hydrationData
      ? `<script id="__FLUTTERJS_HYDRATION_DATA__" type="application/json">${JSON.stringify(hydrationData)}</script>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(title)}</title>
  ${metaTags}
  ${styleTags}
</head>
<body>
  <div id="root">${bodyHTML}</div>
  ${hydrationScript}
  ${scriptTags}
</body>
</html>`;
  }

  /**
   * Generate meta tags
   * @private
   */
  static generateMetaTags(meta) {
    const tags = [];

    if (meta.description) {
      tags.push(`<meta name="description" content="${this.escapeHTML(meta.description)}">`);
    }

    if (meta.keywords) {
      tags.push(`<meta name="keywords" content="${this.escapeHTML(meta.keywords)}">`);
    }

    if (meta.author) {
      tags.push(`<meta name="author" content="${this.escapeHTML(meta.author)}">`);
    }

    // Open Graph
    if (meta.ogTitle) {
      tags.push(`<meta property="og:title" content="${this.escapeHTML(meta.ogTitle)}">`);
    }

    if (meta.ogDescription) {
      tags.push(`<meta property="og:description" content="${this.escapeHTML(meta.ogDescription)}">`);
    }

    if (meta.ogImage) {
      tags.push(`<meta property="og:image" content="${this.escapeHTML(meta.ogImage)}">`);
    }

    // Twitter Card
    if (meta.twitterCard) {
      tags.push(`<meta name="twitter:card" content="${this.escapeHTML(meta.twitterCard)}">`);
    }

    // Custom meta tags
    if (meta.custom) {
      meta.custom.forEach(({ name, content, property }) => {
        if (property) {
          tags.push(`<meta property="${this.escapeHTML(property)}" content="${this.escapeHTML(content)}">`);
        } else {
          tags.push(`<meta name="${this.escapeHTML(name)}" content="${this.escapeHTML(content)}">`);
        }
      });
    }

    return tags.join('\n  ');
  }

  /**
   * Generate style tags
   * @private
   */
  static generateStyleTags(styles, criticalCSS) {
    const tags = [];

    // Critical CSS inline
    if (criticalCSS) {
      tags.push(`<style id="critical-css">${criticalCSS}</style>`);
    }

    // External stylesheets
    styles.forEach(href => {
      tags.push(`<link rel="stylesheet" href="${this.escapeHTML(href)}">`);
    });

    // Material Design base styles
    tags.push(`<style id="md-base">
:root {
  --md-sys-color-primary: #6750a4;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #eaddff;
  --md-sys-color-on-primary-container: #21005e;
  --md-sys-color-surface: #fffbfe;
  --md-sys-color-on-surface: #1c1b1f;
  --md-sys-color-outline: #79747e;
  --md-sys-color-outline-variant: #cac7cf;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>`);

    return tags.join('\n  ');
  }

  /**
   * Generate script tags
   * @private
   */
  static generateScriptTags(scripts, includeRuntime) {
    const tags = [];

    // Runtime script for hydration
    if (includeRuntime) {
      tags.push(`<script src="/flutterjs-runtime.js" defer></script>`);
    }

    // Additional scripts
    scripts.forEach(src => {
      tags.push(`<script src="${this.escapeHTML(src)}" defer></script>`);
    });

    return tags.join('\n  ');
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

    // Traverse VNode tree and collect metadata
    this.traverseVNode(vnode, (node, path) => {
      // Collect widget metadata
      if (node.metadata && node.metadata.widgetType) {
        data.widgets.push({
          path,
          type: node.metadata.widgetType,
          props: node.metadata.flutterProps || {},
          key: node.key
        });
      }

      // Collect state bindings
      if (node.isStateBinding) {
        data.stateBindings.push({
          path,
          widgetId: node.statefulWidgetId,
          property: node.stateProperty
        });
      }

      // Collect event handlers
      if (node.events && Object.keys(node.events).length > 0) {
        data.events.push({
          path,
          events: Object.keys(node.events)
        });
      }

      // Collect refs
      if (node.ref) {
        data.refs.push({
          path,
          hasRef: true
        });
      }
    });

    return data;
  }

  /**
   * Traverse VNode tree
   * @private
   */
  static traverseVNode(vnode, callback, path = '0') {
    if (!vnode || typeof vnode !== 'object' || !vnode.tag) {
      return;
    }

    callback(vnode, path);

    if (vnode.children && Array.isArray(vnode.children)) {
      vnode.children.forEach((child, index) => {
        if (child && typeof child === 'object' && child.tag) {
          this.traverseVNode(child, callback, `${path}.${index}`);
        }
      });
    }
  }

  /**
   * Extract critical CSS from VNode tree
   * @param {VNode} vnode - VNode tree
   * @returns {string} Critical CSS
   */
  static extractCriticalCSS(vnode) {
    const classNames = new Set();
    const inlineStyles = [];

    // Collect all class names and inline styles
    this.traverseVNode(vnode, (node) => {
      if (node.props && node.props.className) {
        node.props.className.split(' ').forEach(cls => {
          if (cls) classNames.add(cls);
        });
      }

      if (node.style && Object.keys(node.style).length > 0) {
        // Track commonly used styles for optimization
        inlineStyles.push(node.style);
      }
    });

    // Generate CSS for collected classes
    const css = [];

    // Add utility classes
    if (classNames.size > 0) {
      classNames.forEach(className => {
        if (className.startsWith('fjs-')) {
          // Add FlutterJS-specific styles
          css.push(this.getWidgetCSS(className));
        }
      });
    }

    return css.filter(Boolean).join('\n');
  }

  /**
   * Get CSS for widget class
   * @private
   */
  static getWidgetCSS(className) {
    const widgetStyles = {
      'fjs-text': '.fjs-text { display: inline; }',
      'fjs-container': '.fjs-container { display: block; }',
      'fjs-column': '.fjs-column { display: flex; flex-direction: column; }',
      'fjs-row': '.fjs-row { display: flex; flex-direction: row; }',
      'fjs-center': '.fjs-center { display: flex; justify-content: center; align-items: center; }',
      'fjs-scaffold': '.fjs-scaffold { min-height: 100vh; display: flex; flex-direction: column; }',
      'fjs-app-bar': '.fjs-app-bar { display: flex; align-items: center; padding: 16px; min-height: 56px; }',
      'fjs-card': '.fjs-card { border-radius: 12px; overflow: hidden; }',
      'fjs-list-view': '.fjs-list-view { overflow-y: auto; display: flex; flex-direction: column; }',
      'fjs-grid-view': '.fjs-grid-view { display: grid; gap: 16px; }'
    };

    return widgetStyles[className] || '';
  }

  /**
   * Hydrate server-rendered HTML on client
   * @param {HTMLElement} root - Root element with SSR HTML
   * @param {VNode} vnode - VNode tree
   * @param {Object} hydrationData - Hydration metadata
   * @returns {HTMLElement} Hydrated root element
   */
  static hydrate(root, vnode, hydrationData = null) {
    if (this.detectEnvironment() === 'server') {
      throw new Error('Hydration can only run on the client');
    }

    // Load hydration data from script tag if not provided
    if (!hydrationData) {
      const dataScript = document.getElementById('__FLUTTERJS_HYDRATION_DATA__');
      if (dataScript) {
        try {
          hydrationData = JSON.parse(dataScript.textContent);
        } catch (error) {
          console.error('Failed to parse hydration data:', error);
        }
      }
    }

    // Perform hydration
    if (vnode && vnode.hydrate) {
      return vnode.hydrate(root);
    } else {
      // Manual hydration using VNode tree
      return this.hydrateManual(root, vnode, hydrationData);
    }
  }

  /**
   * Manual hydration process
   * @private
   */
  static hydrateManual(root, vnode, hydrationData) {
    // Match DOM nodes with VNodes
    this.matchAndHydrate(root, vnode);

    // Restore event listeners
    if (hydrationData && hydrationData.events) {
      this.restoreEventListeners(root, vnode, hydrationData.events);
    }

    // Restore refs
    if (hydrationData && hydrationData.refs) {
      this.restoreRefs(root, vnode, hydrationData.refs);
    }

    return root;
  }

  /**
   * Match DOM nodes with VNodes and attach references
   * @private
   */
  static matchAndHydrate(domNode, vnode) {
    if (!domNode || !vnode || typeof vnode !== 'object') {
      return;
    }

    // Store references
    if (domNode.nodeType === Node.ELEMENT_NODE) {
      domNode._vnode = vnode;
      vnode._element = domNode;

      // Recursively hydrate children
      if (vnode.children && Array.isArray(vnode.children)) {
        const domChildren = Array.from(domNode.childNodes);
        let vnodeIndex = 0;

        domChildren.forEach(domChild => {
          const vnodeChild = vnode.children[vnodeIndex];
          if (vnodeChild && typeof vnodeChild === 'object') {
            this.matchAndHydrate(domChild, vnodeChild);
            vnodeIndex++;
          }
        });
      }
    }
  }

  /**
   * Restore event listeners from hydration data
   * @private
   */
  static restoreEventListeners(root, vnode, eventData) {
    eventData.forEach(({ path, events }) => {
      const element = this.findElementByPath(root, path);
      if (element && vnode.events) {
        VNodeRenderer.applyEvents(element, vnode.events);
      }
    });
  }

  /**
   * Restore ref callbacks
   * @private
   */
  static restoreRefs(root, vnode, refData) {
    refData.forEach(({ path }) => {
      const element = this.findElementByPath(root, path);
      if (element && vnode.ref && typeof vnode.ref === 'function') {
        vnode.ref(element);
      }
    });
  }

  /**
   * Find element by path
   * @private
   */
  static findElementByPath(root, path) {
    const indices = path.split('.').map(Number).slice(1); // Skip root '0'
    let current = root;

    for (const index of indices) {
      const children = Array.from(current.childNodes);
      if (index >= children.length) return null;
      current = children[index];
    }

    return current;
  }

  /**
   * Escape HTML special characters
   * @private
   */
  static escapeHTML(str) {
    if (!str) return '';
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
   * Get rendering statistics
   * @param {VNode} vnode - VNode tree
   * @returns {Object} Statistics
   */
  static getStats(vnode) {
    const stats = {
      totalNodes: 0,
      elementNodes: 0,
      textNodes: 0,
      depth: 0,
      classes: new Set(),
      events: 0,
      stateBindings: 0
    };

    const calculateDepth = (node, currentDepth = 0) => {
      stats.totalNodes++;
      stats.depth = Math.max(stats.depth, currentDepth);

      if (!node || typeof node !== 'object' || !node.tag) {
        stats.textNodes++;
        return;
      }

      stats.elementNodes++;

      if (node.props && node.props.className) {
        node.props.className.split(' ').forEach(cls => {
          if (cls) stats.classes.add(cls);
        });
      }

      if (node.events) {
        stats.events += Object.keys(node.events).length;
      }

      if (node.isStateBinding) {
        stats.stateBindings++;
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
          calculateDepth(child, currentDepth + 1);
        });
      }
    };

    calculateDepth(vnode);

    return {
      ...stats,
      classes: stats.classes.size
    };
  }
}


export {RenderEngine}