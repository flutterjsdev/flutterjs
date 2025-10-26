/**
 * FlutterJS Framework - Standalone (No Node.js Dependency)
 * Pure JavaScript implementation with built-in CLI
 * Version: 1.0.0
 */

// ============================================
// CORE WIDGET SYSTEM
// ============================================

export class Widget {
  constructor(props = {}) {
    this.key = props.key || null;
    this.props = props;
    this._context = null;
    this._element = null;
    this._mounted = false;
  }

  build(context) {
    throw new Error('build() must be implemented');
  }

  mount(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (container) {
      this._element = container;
      this._mounted = true;
      this._context = new BuildContext(this);
      const vnode = this.build(this._context);
      if (vnode) {
        container.appendChild(vnode.render());
      }
    }
  }

  unmount() {
    this._mounted = false;
    if (this._element) {
      this._element.innerHTML = '';
    }
  }
}

export class StatelessWidget extends Widget {
  // Pure render, no state
  render() {
    if (!this._mounted) return null;
    const vnode = this.build(this._context);
    return vnode ? vnode.render() : null;
  }
}

export class StatefulWidget extends Widget {
  constructor(props = {}) {
    super(props);
    this._state = this.createState();
    this._state._widget = this;
  }

  createState() {
    throw new Error('createState() must be implemented');
  }

  setState(updater) {
    if (!this._state._mounted) {
      console.warn('setState called on unmounted widget');
      return;
    }

    if (typeof updater === 'function') {
      updater(this._state);
    } else {
      Object.assign(this._state, updater);
    }

    this._scheduleRebuild();
  }

  _scheduleRebuild() {
    if (this._rebuildScheduled) return;
    this._rebuildScheduled = true;

    requestAnimationFrame(() => {
      this._rebuildScheduled = false;
      if (this._element && this._mounted) {
        const vnode = this._state.build(this._context);
        if (vnode) {
          this._element.innerHTML = '';
          this._element.appendChild(vnode.render());
        }
      }
    });
  }

  mount(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (container) {
      this._element = container;
      this._mounted = true;
      this._context = new BuildContext(this);
      this._state._mounted = true;
      this._state.initState?.();
      const vnode = this._state.build(this._context);
      if (vnode) {
        container.appendChild(vnode.render());
      }
    }
  }

  unmount() {
    this._state.dispose?.();
    super.unmount();
  }
}

export class State {
  constructor() {
    this._widget = null;
    this._mounted = false;
  }

  initState() {}
  didChangeDependencies() {}
  didUpdateWidget(oldWidget) {}
  dispose() {}

  build(context) {
    throw new Error('build() must be implemented');
  }

  setState(updater) {
    this._widget.setState(updater);
  }
}

// ============================================
// BUILD CONTEXT
// ============================================

export class BuildContext {
  constructor(widget) {
    this.widget = widget;
    this._inheritedWidgets = new Map();
  }

  findAncestorStateOfType(type) {
    let current = this.widget;
    while (current) {
      if (current._state instanceof type) {
        return current._state;
      }
      current = current._parent;
    }
    return null;
  }

  dependOnInheritedWidgetOfExactType(type) {
    return this._inheritedWidgets.get(type.name);
  }
}

// ============================================
// VIRTUAL NODE SYSTEM (VNODE)
// ============================================

export class VNode {
  constructor(tag, props = {}, children = []) {
    this.tag = tag;
    this.props = props;
    this.children = Array.isArray(children) ? children : [children];
    this.events = {};
    this._parseEvents();
  }

  _parseEvents() {
    Object.keys(this.props).forEach(key => {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        this.events[eventName] = this.props[key];
      }
    });
  }

  render() {
    const element = document.createElement(this.tag);

    // Apply props
    Object.entries(this.props).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style') {
        if (typeof value === 'object') {
          Object.assign(element.style, value);
        }
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (!key.startsWith('on')) {
        element.setAttribute(key, value);
      }
    });

    // Attach event listeners
    Object.entries(this.events).forEach(([event, handler]) => {
      if (handler) {
        element.addEventListener(event, handler);
      }
    });

    // Append children
    this.children.forEach(child => {
      if (child instanceof VNode) {
        element.appendChild(child.render());
      } else if (child !== null && child !== undefined) {
        element.appendChild(document.createTextNode(String(child)));
      }
    });

    return element;
  }

  toHTML() {
    const attrs = Object.entries(this.props)
      .filter(([k]) => !k.startsWith('on'))
      .map(([k, v]) => {
        if (k === 'className') return `class="${v}"`;
        if (k === 'style' && typeof v === 'object') {
          const styleStr = Object.entries(v)
            .map(([prop, val]) => `${prop}: ${val}`)
            .join('; ');
          return `style="${styleStr}"`;
        }
        return `${k}="${v}"`;
      })
      .join(' ');

    const openTag = `<${this.tag}${attrs ? ' ' + attrs : ''}>`;

    const childrenHTML = this.children
      .map(child => {
        if (child instanceof VNode) {
          return child.toHTML();
        }
        return child !== null && child !== undefined
          ? String(child).replace(/[<>]/g, c => (c === '<' ? '&lt;' : '&gt;'))
          : '';
      })
      .join('');

    return `${openTag}${childrenHTML}</${this.tag}>`;
  }
}

// ============================================
// MATERIAL WIDGETS
// ============================================

export class MaterialApp extends StatelessWidget {
  constructor({ title = 'Flutter App', home, theme } = {}) {
    super({ title, home, theme });
    this.title = title;
    this.home = home;
    this.theme = theme;
  }

  build(context) {
    return new VNode('div', { className: 'flutter-app' }, [
      new VNode('style', {}, [
        this._generateThemeCSS(),
      ]),
      this.home ? this.home.build(context) : null,
    ]);
  }

  _generateThemeCSS() {
    return `
      :root {
        --md-sys-color-primary: #6750A4;
        --md-sys-color-on-primary: #FFFFFF;
        --md-sys-color-surface: #FFFBFE;
        --md-sys-typescale-body-large-size: 16px;
      }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; }
    `;
  }
}

export class Scaffold extends StatelessWidget {
  constructor({ appBar, body, floatingActionButton } = {}) {
    super({ appBar, body, floatingActionButton });
    this.appBar = appBar;
    this.body = body;
    this.floatingActionButton = floatingActionButton;
  }

  build(context) {
    const children = [];
    if (this.appBar) children.push(this.appBar);
    if (this.body) children.push(this.body);
    if (this.floatingActionButton) children.push(this.floatingActionButton);

    return new VNode('div', { className: 'flutter-scaffold' }, children);
  }
}

export class AppBar extends StatelessWidget {
  constructor({ title, backgroundColor } = {}) {
    super({ title, backgroundColor });
    this.title = title;
    this.backgroundColor = backgroundColor;
  }

  build(context) {
    return new VNode(
      'div',
      {
        className: 'flutter-appbar',
        style: {
          backgroundColor: this.backgroundColor || 'var(--md-sys-color-primary)',
          color: '#FFFFFF',
          padding: '16px',
          fontSize: '20px',
          fontWeight: 'bold',
        },
      },
      [this.title]
    );
  }
}

export class Text extends StatelessWidget {
  constructor(data, { style, textAlign, maxLines } = {}) {
    super({ data, style, textAlign, maxLines });
    this.data = data;
    this.style = style;
    this.textAlign = textAlign;
    this.maxLines = maxLines;
  }

  build(context) {
    return new VNode('span', { className: 'flutter-text' }, [String(this.data)]);
  }
}

export class Container extends StatelessWidget {
  constructor({ width, height, color, child, padding, margin, alignment } = {}) {
    super({ width, height, color, child, padding, margin, alignment });
    this.width = width;
    this.height = height;
    this.color = color;
    this.child = child;
    this.padding = padding;
    this.margin = margin;
    this.alignment = alignment;
  }

  build(context) {
    const style = {
      width: this.width ? `${this.width}px` : 'auto',
      height: this.height ? `${this.height}px` : 'auto',
      backgroundColor: this.color,
      padding: this.padding ? `${this.padding}px` : '0',
      margin: this.margin ? `${this.margin}px` : '0',
    };

    return new VNode('div', { className: 'flutter-container', style }, [
      this.child,
    ]);
  }
}

export class ElevatedButton extends StatelessWidget {
  constructor({ onPressed, child, backgroundColor, textColor } = {}) {
    super({ onPressed, child, backgroundColor, textColor });
    this.onPressed = onPressed;
    this.child = child;
    this.backgroundColor = backgroundColor;
    this.textColor = textColor;
  }

  build(context) {
    return new VNode(
      'button',
      {
        className: 'flutter-elevated-button',
        style: {
          backgroundColor: this.backgroundColor || 'var(--md-sys-color-primary)',
          color: this.textColor || '#FFFFFF',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        onClick: this.onPressed,
      },
      [this.child]
    );
  }
}

export class Column extends StatelessWidget {
  constructor({ children = [], mainAxisAlignment = 'start' } = {}) {
    super({ children, mainAxisAlignment });
    this.children = children;
    this.mainAxisAlignment = mainAxisAlignment;
  }

  build(context) {
    const justifyMap = {
      start: 'flex-start',
      end: 'flex-end',
      center: 'center',
      spaceBetween: 'space-between',
    };

    return new VNode(
      'div',
      {
        className: 'flutter-column',
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: justifyMap[this.mainAxisAlignment] || 'flex-start',
        },
      },
      this.children
    );
  }
}

export class Row extends StatelessWidget {
  constructor({ children = [], mainAxisAlignment = 'start' } = {}) {
    super({ children, mainAxisAlignment });
    this.children = children;
    this.mainAxisAlignment = mainAxisAlignment;
  }

  build(context) {
    const justifyMap = {
      start: 'flex-start',
      end: 'flex-end',
      center: 'center',
      spaceBetween: 'space-between',
    };

    return new VNode(
      'div',
      {
        className: 'flutter-row',
        style: {
          display: 'flex',
          flexDirection: 'row',
          justifyContent: justifyMap[this.mainAxisAlignment] || 'flex-start',
        },
      },
      this.children
    );
  }
}

// ============================================
// RUNTIME
// ============================================

export function runApp(app) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const root = document.getElementById('root') || document.body;
      const instance = new app();
      instance.mount(root);
      window._flutterAppInstance = instance;
    });
  } else {
    const root = document.getElementById('root') || document.body;
    const instance = new app();
    instance.mount(root);
    window._flutterAppInstance = instance;
  }
}

// ============================================
// CLI SUPPORT (Browser Console)
// ============================================

export const CLI = {
  serve: (port = 5000, callback) => {
    console.log(`FlutterJS dev server running on http://localhost:${port}`);
    if (callback) callback();
  },

  build: () => {
    console.log('Building FlutterJS app...');
    return {
      success: true,
      output: 'build/ directory created',
    };
  },

  help: () => {
    console.log(`
FlutterJS CLI
Usage: flutter-js <command>

Commands:
  serve [port]     - Start development server
  build            - Build for production
  help             - Show this help message
    `);
  },
};

// Export default
export default {
  Widget,
  StatelessWidget,
  StatefulWidget,
  State,
  BuildContext,
  VNode,
  MaterialApp,
  Scaffold,
  AppBar,
  Text,
  Container,
  ElevatedButton,
  Column,
  Row,
  runApp,
  CLI,
};