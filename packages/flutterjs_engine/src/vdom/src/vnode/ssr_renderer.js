/**
 * SSRRenderer - Server-Side Rendering
 * 
 * Converts VNode trees to HTML strings for server-side rendering.
 * Handles:
 * - HTML string generation
 * - Attribute serialization
 * - Style serialization
 * - Proper escaping
 * - Self-closing tags
 */

class SSRRenderer {
  /**
   * Render VNode to HTML string
   * @param {VNode|string|Array} vnode - VNode tree
   * @param {Object} options - Rendering options
   * @returns {string} HTML string
   */
  static render(vnode, options = {}) {
    return this.renderVNode(vnode, options);
  }

  /**
   * Render single VNode to HTML string
   * @param {VNode|string|Array} vnode - VNode to render
   * @param {Object} options - Rendering options
   * @returns {string} HTML string
   */
  static renderVNode(vnode, options = {}) {
    // Handle null/undefined
    if (vnode === null || vnode === undefined) {
      return '';
    }

    // Handle arrays (fragments)
    if (Array.isArray(vnode)) {
      return vnode
        .map(child => this.renderVNode(child, options))
        .join('');
    }

    // Handle text nodes
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return this.escapeHTML(String(vnode));
    }

    // Handle boolean (render nothing)
    if (typeof vnode === 'boolean') {
      return '';
    }

    // Must be a VNode object
    if (!vnode.tag) {
      return '';
    }

    // Build opening tag
    const attrs = this.serializeAttributes(vnode);
    const openTag = `<${vnode.tag}${attrs ? ' ' + attrs : ''}>`;

    // Self-closing tags
    if (this.isVoidTag(vnode.tag)) {
      return openTag;
    }

    // Render children
    const childrenHTML = (vnode.children || [])
      .map(child => this.renderVNode(child, options))
      .join('');

    // Build closing tag
    const closeTag = `</${vnode.tag}>`;

    return `${openTag}${childrenHTML}${closeTag}`;
  }

  /**
   * Serialize attributes to HTML string
   * @private
   */
  static serializeAttributes(vnode) {
    const attrs = [];

    // Props (HTML attributes)
    if (vnode.props) {
      Object.entries(vnode.props).forEach(([key, value]) => {
        if (value === null || value === undefined || value === false) {
          return;
        }

        // Special handling for className
        if (key === 'className') {
          attrs.push(`class="${this.escapeAttribute(String(value))}"`);
          return;
        }

        // Boolean attributes
        if (value === true) {
          attrs.push(key);
          return;
        }

        // Regular attributes
        attrs.push(`${key}="${this.escapeAttribute(String(value))}"`);
      });
    }

    // Inline styles
    if (vnode.style && typeof vnode.style === 'object') {
      const styleStr = this.serializeStyles(vnode.style);
      if (styleStr) {
        attrs.push(`style="${this.escapeAttribute(styleStr)}"`);
      }
    }

    // Data attributes from metadata
    if (vnode.metadata) {
      if (vnode.metadata.widgetType) {
        attrs.push(`data-widget-type="${this.escapeAttribute(vnode.metadata.widgetType)}"`);
      }
    }

    // Key attribute
    if (vnode.key !== null && vnode.key !== undefined) {
      attrs.push(`data-key="${this.escapeAttribute(String(vnode.key))}"`);
    }

    return attrs.join(' ');
  }

  /**
   * Serialize styles to CSS string
   * @private
   */
  static serializeStyles(styles) {
    const styleEntries = Object.entries(styles)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
      });

    return styleEntries.join('; ');
  }

  /**
   * Check if tag is self-closing (void element)
   * @private
   */
  static isVoidTag(tag) {
    const voidTags = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
      'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];
    return voidTags.includes(tag.toLowerCase());
  }

  /**
   * Escape HTML special characters
   * @private
   */
  static escapeHTML(str) {
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
   * Escape HTML attribute value
   * @private
   */
  static escapeAttribute(str) {
    return this.escapeHTML(str);
  }

  /**
   * Render complete HTML document
   * @param {VNode} vnode - Root VNode
   * @param {Object} options - Document options
   * @returns {string} Complete HTML document
   */
  static renderDocument(vnode, options = {}) {
    const {
      title = 'FlutterJS App',
      meta = {},
      styles = [],
      scripts = [],
      lang = 'en'
    } = options;

    const bodyHTML = this.renderVNode(vnode);

    return `<!DOCTYPE html>
<html lang="${this.escapeAttribute(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(title)}</title>
  ${this.renderMetaTags(meta)}
  ${this.renderStyleLinks(styles)}
</head>
<body>
  <div id="root">${bodyHTML}</div>
  ${this.renderScriptTags(scripts)}
</body>
</html>`;
  }

  /**
   * Render meta tags
   * @private
   */
  static renderMetaTags(meta) {
    const tags = [];

    Object.entries(meta).forEach(([key, value]) => {
      if (key.startsWith('og:')) {
        tags.push(`<meta property="${this.escapeAttribute(key)}" content="${this.escapeAttribute(value)}">`);
      } else {
        tags.push(`<meta name="${this.escapeAttribute(key)}" content="${this.escapeAttribute(value)}">`);
      }
    });

    return tags.join('\n  ');
  }

  /**
   * Render style links
   * @private
   */
  static renderStyleLinks(styles) {
    return styles
      .map(href => `<link rel="stylesheet" href="${this.escapeAttribute(href)}">`)
      .join('\n  ');
  }

  /**
   * Render script tags
   * @private
   */
  static renderScriptTags(scripts) {
    return scripts
      .map(src => `<script src="${this.escapeAttribute(src)}" defer></script>`)
      .join('\n  ');
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SSRRenderer;
}
if (typeof window !== 'undefined') {
  window.SSRRenderer = SSRRenderer;
}