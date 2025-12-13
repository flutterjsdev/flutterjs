// ============================================================================
// SERVER-SIDE RENDERING (SSR)
// Renders widgets on server, sends HTML to client, hydrates on client
// Enables: Fast initial load, SEO, Progressive enhancement
// ============================================================================

import { VNode } from './vnode.js';

/**
 * SSR Renderer - Renders widget tree to HTML string on server
 * Used with Node.js (Express, Fastify, etc.)
 */
class SSRRenderer {
  /**
   * Render widget tree to HTML string
   * Usage: const html = SSRRenderer.renderToString(new MyApp());
   */
  static renderToString(widget) {
    if (!widget) {
      throw new Error('Widget is required for SSR');
    }

    // Create element and mount (virtual mount on server)
    const element = widget.createElement();
    element.mount(null);

    // Build VNode tree
    const vnode = element.performRebuild();

    // Convert to HTML string
    return this.vnodeToString(vnode);
  }

  /**
   * Convert VNode to HTML string with proper escaping
   */
  static vnodeToString(vnode, depth = 0) {
    if (vnode === null || vnode === undefined) {
      return '';
    }

    // Handle primitives
    if (typeof vnode === 'string') {
      return this.escapeHtml(vnode);
    }

    if (typeof vnode === 'number') {
      return this.escapeHtml(String(vnode));
    }

    // Handle arrays
    if (Array.isArray(vnode)) {
      return vnode.map(v => this.vnodeToString(v, depth)).join('');
    }

    // Handle VNode objects
    if (vnode instanceof VNode) {
      const { tag, props = {}, children = [] } = vnode;

      // Get attributes string
      const attrs = this.serializeAttrs(props);
      const attrStr = attrs ? ' ' + attrs : '';

      // Self-closing tags
      if (this.isSelfClosing(tag)) {
        return `<${tag}${attrStr} />`;
      }

      // Convert children to string
      const childrenStr = children
        .map(child => this.vnodeToString(child, depth + 1))
        .join('');

      return `<${tag}${attrStr}>${childrenStr}</${tag}>`;
    }

    // Fallback
    return String(vnode);
  }

  /**
   * Serialize props/attributes for HTML
   */
  static serializeAttrs(props) {
    return Object.entries(props)
      .map(([key, value]) => {
        if (value === null || value === undefined || value === false) {
          return '';
        }

        if (value === true) {
          return key;
        }

        // Handle className
        if (key === 'className') {
          return `class="${this.escapeAttr(value)}"`;
        }

        // Handle style object
        if (key === 'style' && typeof value === 'object') {
          const styleStr = Object.entries(value)
            .map(([prop, val]) => `${this.camelToKebab(prop)}: ${val}`)
            .join('; ');
          return `style="${this.escapeAttr(styleStr)}"`;
        }

        // Skip events on server (they don't work in HTML)
        if (key.startsWith('on')) {
          return '';
        }

        // Skip internal props
        if (key.startsWith('_')) {
          return '';
        }

        return `${key}="${this.escapeAttr(String(value))}"`;
      })
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Escape HTML special characters
   */
  static escapeHtml(str) {
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
   * Escape attribute values
   */
  static escapeAttr(str) {
    return this.escapeHtml(str);
  }

  /**
   * Check if tag is self-closing
   */
  static isSelfClosing(tag) {
    return [
      'area', 'base', 'br', 'col', 'embed',
      'hr', 'img', 'input', 'link', 'meta',
      'param', 'source', 'track', 'wbr'
    ].includes(tag);
  }

  /**
   * Convert camelCase to kebab-case for CSS
   */
  static camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }

  /**
   * Render to HTML with DOCTYPE and meta tags
   */
  static renderToDocument(widget, options = {}) {
    const {
      title = 'FlutterJS App',
      description = 'A FlutterJS application',
      keywords = 'flutter, web, javascript',
      charset = 'UTF-8',
      viewport = 'width=device-width, initial-scale=1.0',
      favicon = '/favicon.ico',
      stylesheets = [],
      metaTags = [],
      lang = 'en'
    } = options;

    const html = this.renderToString(widget);

    // Generate meta tags
    const metaTagsHtml = [
      `<meta charset="${charset}">`,
      `<meta name="viewport" content="${viewport}">`,
      `<meta name="description" content="${this.escapeAttr(description)}">`,
      `<meta name="keywords" content="${this.escapeAttr(keywords)}">`,
      `<link rel="icon" href="${favicon}">`,
      ...stylesheets.map(href => `<link rel="stylesheet" href="${href}">`),
      ...metaTags.map(({ name, content }) =>
        `<meta name="${name}" content="${this.escapeAttr(content)}">`
      )
    ].join('\n  ');

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  ${metaTagsHtml}
  <title>${this.escapeHtml(title)}</title>
</head>
<body>
  <div id="root">${html}</div>
  <script type="module">
    import { hydrate } from './hydrator.js';
    hydrate(document.getElementById('root'));
  </script>
</body>
</html>`;
  }

  /**
   * Render with initial state for hydration
   */
  static renderWithState(widget, initialState = {}) {
    const html = this.renderToString(widget);

    return {
      html,
      state: initialState,
      stateScript: `
        <script type="application/json" id="__INITIAL_STATE__">
          ${JSON.stringify(initialState)}
        </script>
      `
    };
  }

  /**
   * Stream rendering for large pages (progressive rendering)
   */
  static *renderToStream(widget) {
    if (!widget) {
      throw new Error('Widget is required for SSR');
    }

    // Send HTML head
    yield `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FlutterJS App</title>
</head>
<body>
  <div id="root">`;

    // Build element
    const element = widget.createElement();
    element.mount(null);
    const vnode = element.performRebuild();

    // Stream body in chunks
    yield* this.streamVNode(vnode);

    // Close HTML
    yield `</div>
  <script type="module">
    import { hydrate } from './hydrator.js';
    hydrate(document.getElementById('root'));
  </script>
</body>
</html>`;
  }

  /**
   * Stream VNode rendering
   */
  static *streamVNode(vnode, chunkSize = 8192) {
    const html = this.vnodeToString(vnode);
    
    // Stream in chunks
    for (let i = 0; i < html.length; i += chunkSize) {
      yield html.slice(i, i + chunkSize);
    }
  }
}

export { SSRRenderer };