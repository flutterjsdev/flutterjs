/**
 * VNodeBuilder - FIXED VERSION
 * Properly converts Widget → Element → VNode
 * 
 * KEY FIX: Keep building recursively until we get a VNode, not a widget
 */
import { VNode } from './vnode.js';
import { StyleConverter } from './style_converter.js';
import { StatelessElement, StatefulElement } from '@flutterjs/runtime/element';
import { InheritedElement } from '@flutterjs/runtime/inherited_element';

class VNodeBuilder {
  constructor(options = {}) {
    this.debugMode = options.debugMode || false;
    this.runtime = options.runtime;

    if (this.debugMode && !this.runtime) {
      console.warn('[VNodeBuilder] ⚠️ No runtime provided - Element creation will fail');
    }
  }

  /**
   * Build VNode tree from widget
   * @param {Widget} widget - Flutter widget instance
   * @param {BuildContext} context - Build context with runtime
   * @returns {VNode|string|null} VNode tree or text content
   */
  build(widget, context = {}) {
    // Handle null/undefined
    if (!widget) {
      return null;
    }

    // If already a VNode, return as-is
    if (widget && typeof widget === 'object' && widget.tag) {
      return widget;
    }

    // Handle text strings directly
    if (typeof widget === 'string') {
      return widget;
    }

    // Handle numbers
    if (typeof widget === 'number') {
      return String(widget);
    }

    // ✅ Ensure runtime is in context
    if (!context.runtime && this.runtime) {
      context.runtime = this.runtime;
    }

    // ✅ STATELESS WIDGET
    if (typeof widget.build === 'function' && !widget.createState) {
      if (this.debugMode) {
        console.log('[VNodeBuilder] 📦 Building StatelessWidget:', widget.constructor.name);
      }

      if (!this.runtime) {
        throw new Error('[VNodeBuilder] Runtime required to build StatelessWidget');
      }

      // Create element
      const element = new StatelessElement(widget, context.parentElement || null, this.runtime);

      // Call widget.build() 
      const builtWidget = element.build();

      if (!builtWidget) {
        return null;
      }

      if (this.debugMode) {
        console.log('[VNodeBuilder] build() returned:', {
          type: typeof builtWidget,
          hasTag: builtWidget?.tag !== undefined,
          constructor: builtWidget?.constructor?.name
        });
      }

      // ✅ FIX: Check if it's a VNode (has tag property)
      if (builtWidget && typeof builtWidget === 'object' && builtWidget.tag) {
        if (this.debugMode) {
          console.log('[VNodeBuilder] ✓ Got VNode, returning');
        }
        return builtWidget;
      }

      // ✅ FIX: If it's a widget, recursively build it
      if (builtWidget && typeof builtWidget === 'object' && typeof builtWidget.build === 'function') {
        if (this.debugMode) {
          console.log('[VNodeBuilder] 🔄 Got Widget, recursively building:', builtWidget.constructor.name);
        }
        return this.build(builtWidget, {
          ...context,
          parentElement: element,
          runtime: this.runtime
        });
      }

      // ✅ If it's a string/number, return it
      if (typeof builtWidget === 'string' || typeof builtWidget === 'number') {
        return builtWidget;
      }

      if (this.debugMode) {
        console.warn('[VNodeBuilder] Unknown return type from build():', builtWidget);
      }
      return null;
    }

    // ✅ STATEFUL WIDGET
    if (typeof widget.createState === 'function') {
      if (this.debugMode) {
        console.log('[VNodeBuilder] 📦 Building StatefulWidget:', widget.constructor.name);
      }

      if (!this.runtime) {
        throw new Error('[VNodeBuilder] Runtime required to build StatefulWidget');
      }

      const element = new StatefulElement(
        widget,
        context.parentElement || null,
        this.runtime
      );

      // Mount to initialize state
      if (!element.mounted) {
        element.mount();
      }

      // Build element
      const builtWidget = element.build();

      if (!builtWidget) {
        return null;
      }

      // ✅ Check if it's a VNode
      if (builtWidget && typeof builtWidget === 'object' && builtWidget.tag) {
        return builtWidget;
      }

      // ✅ If it's a widget, recursively build
      if (builtWidget && typeof builtWidget === 'object' && typeof builtWidget.build === 'function') {
        return this.build(builtWidget, {
          ...context,
          parentElement: element,
          runtime: this.runtime
        });
      }

      if (typeof builtWidget === 'string' || typeof builtWidget === 'number') {
        return builtWidget;
      }

      return null;
    }

    // ✅ INHERITED WIDGET
    if (widget.updateShouldNotify && typeof widget.updateShouldNotify === 'function') {
      if (this.debugMode) {
        console.log('[VNodeBuilder] 📦 Building InheritedWidget:', widget.constructor.name);
      }

      if (!this.runtime) {
        throw new Error('[VNodeBuilder] Runtime required to build InheritedWidget');
      }

      const element = new InheritedElement(
        widget,
        context.parentElement || null,
        this.runtime
      );

      if (!element.mounted) {
        element.mount();
      }

      const builtWidget = element.build();

      if (widget.child) {
        const childVNode = this.build(widget.child, {
          ...context,
          parentElement: element,
          runtime: this.runtime
        });

        if (builtWidget && childVNode) {
          if (!builtWidget.children) {
            builtWidget.children = [];
          }
          builtWidget.children.push(childVNode);
        }

        return builtWidget || childVNode;
      }

      return builtWidget ? this.build(builtWidget, context) : null;
    }

    // ✅ FALLBACK: Unknown widget type
    if (this.debugMode) {
      console.warn('[VNodeBuilder] Unknown widget type:', widget.constructor?.name || typeof widget);
    }

    return this.buildGeneric(widget, context);
  }

  /**
   * Build children array
   * ✅ Properly passes context with runtime
   */
  buildChildren(children, context) {
    if (!children) return [];
    if (!Array.isArray(children)) children = [children];

    return children
      .map((child, index) => {
        return this.build(child, {
          ...context,
          childIndex: index,
          runtime: this.runtime
        });
      })
      .filter(vnode => vnode !== null && vnode !== undefined);
  }

  /**
   * Get widget type name
   * @private
   */
  getWidgetType(widget) {
    if (!widget) return 'Unknown';

    if (widget.constructor && widget.constructor.name) {
      return widget.constructor.name;
    }

    if (widget.runtimeType) {
      return widget.runtimeType;
    }

    if (widget.widget && widget.widget.constructor) {
      return widget.widget.constructor.name;
    }

    return 'Unknown';
  }

  /**
   * Extract common props from widget
   * @private
   */
  extractCommonProps(widget) {
    const props = {};

    if (widget.key) {
      props.key = widget.key;
    }

    if (widget._debugLabel) {
      props['data-debug-label'] = widget._debugLabel;
    }

    return props;
  }

  /**
   * Generic widget builder
   */
  buildGeneric(widget, context) {
    let children = [];

    if (widget.child) {
      const child = this.build(widget.child, context);
      if (child) children = [child];
    } else if (widget.children) {
      children = this.buildChildren(widget.children, context);
    }

    const widgetType = this.getWidgetType(widget);

    return new VNode({
      tag: 'div',
      props: {
        className: `fjs-${widgetType.toLowerCase()}`,
        'data-widget-type': widgetType,
        ...this.extractCommonProps(widget)
      },
      children,
      metadata: {
        widgetType,
        note: 'Generic widget - no specific builder implemented'
      }
    });
  }
}

export { VNodeBuilder };