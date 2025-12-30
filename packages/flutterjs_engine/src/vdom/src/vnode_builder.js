/**
 * VNodeBuilder - FIXED VERSION
 * Properly converts Widget → Element → VNode
 * 
 * The key fix: Pass runtime through the entire chain so elements can
 * create child elements when needed.
 */

import { VNode } from './vnode.js';
import { StyleConverter } from './style_converter.js';
import { StatelessElement, StatefulElement } from '@flutterjs/runtime/element';
import { InheritedElement } from '@flutterjs/runtime/inherited_element';

class VNodeBuilder {
  constructor(options = {}) {
    this.debugMode = options.debugMode || false;
    this.runtime = options.runtime;  // ✅ CRITICAL: Must have runtime

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

    // ✅ FIX: Ensure runtime is in context
    if (!context.runtime && this.runtime) {
      context.runtime = this.runtime;
    }

    // ✅ HANDLE STATELESS WIDGET
    if (typeof widget.build === 'function' && !widget.createState) {
      if (this.debugMode) {
        console.log('[VNodeBuilder] 📦 Building StatelessWidget:', widget.constructor.name);
      }

      // ✅ Create element with runtime
      if (!this.runtime) {
        throw new Error('[VNodeBuilder] Runtime required to build StatelessWidget');
      }

      // ✅ CORRECT - Just build, don't mount
      const element = new StatelessElement(widget, context.parentElement || null, this.runtime);

      const builtWidget = element.build();  // Only call build once

      if (!builtWidget) {
        return null;
      }

      // ✅ Recursively build result (might be another widget)
      return this.build(builtWidget, {
        ...context,
        parentElement: element,
        runtime: this.runtime
      });
    }

    // ✅ HANDLE STATEFUL WIDGET
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
        this.runtime  // ✅ PASS RUNTIME
      );

      // ✅ Mount to initialize state
      if (!element.mounted) {
        element.mount();
      }

      // Build element
      const builtWidget = element.build();

      if (!builtWidget) {
        return null;
      }

      // ✅ Recursively build result
      return this.build(builtWidget, {
        ...context,
        parentElement: element,
        runtime: this.runtime
      });
    }

    // ✅ HANDLE INHERITED WIDGET
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
        this.runtime  // ✅ PASS RUNTIME
      );

      if (!element.mounted) {
        element.mount();
      }

      // Build the inherited widget wrapper
      const builtWidget = element.build();

      // ✅ Also build the child widget
      if (widget.child) {
        const childVNode = this.build(widget.child, {
          ...context,
          parentElement: element,
          runtime: this.runtime
        });

        // If built widget is a container, insert child
        if (builtWidget && childVNode) {
          if (!builtWidget.children) {
            builtWidget.children = [];
          }
          builtWidget.children.push(childVNode);
        }

        // ✅ CORRECT - Pass runtime
        return builtWidget ? this.build(builtWidget, {
          ...context,
          runtime: this.runtime
        }) : childVNode;
      }

      return builtWidget ? this.build(builtWidget, context) : null;
    }

    // ✅ Detect widget type and dispatch
    const widgetType = this.getWidgetType(widget);

    if (this.debugMode && widgetType !== 'Unknown') {
      console.log('[VNodeBuilder] 📝 Building widget type:', widgetType);
    }

    // Dispatch to appropriate builder
    const vnode = this.buildWidgetByType(widget, widgetType, context);

    return vnode;
  }

  /**
   * Build widget by type
   * @private
   */
  buildWidgetByType(widget, widgetType, context) {
    switch (widgetType) {
      // Text widgets
      case 'Text':
        return this.buildText(widget, context);
      case 'RichText':
        return this.buildRichText(widget, context);

      // Layout widgets
      case 'Container':
        return this.buildContainer(widget, context);
      case 'Column':
        return this.buildColumn(widget, context);
      case 'Row':
        return this.buildRow(widget, context);
      case 'Stack':
        return this.buildStack(widget, context);
      case 'Center':
        return this.buildCenter(widget, context);
      case 'Align':
        return this.buildAlign(widget, context);
      case 'Padding':
        return this.buildPadding(widget, context);
      case 'SizedBox':
        return this.buildSizedBox(widget, context);
      case 'Expanded':
        return this.buildExpanded(widget, context);
      case 'Flexible':
        return this.buildFlexible(widget, context);

      // Scaffold & Structure
      case 'Scaffold':
        return this.buildScaffold(widget, context);
      case 'AppBar':
        return this.buildAppBar(widget, context);
      case 'FloatingActionButton':
        return this.buildFloatingActionButton(widget, context);
      case 'Drawer':
        return this.buildDrawer(widget, context);

      // Button widgets
      case 'ElevatedButton':
      case 'TextButton':
      case 'OutlinedButton':
      case 'IconButton':
        return this.buildButton(widget, context);

      // Input widgets
      case 'TextField':
        return this.buildTextField(widget, context);
      case 'Checkbox':
        return this.buildCheckbox(widget, context);
      case 'Radio':
        return this.buildRadio(widget, context);
      case 'Switch':
        return this.buildSwitch(widget, context);

      // List widgets
      case 'ListView':
        return this.buildListView(widget, context);
      case 'GridView':
        return this.buildGridView(widget, context);
      case 'ListTile':
        return this.buildListTile(widget, context);

      // Visual widgets
      case 'Card':
        return this.buildCard(widget, context);
      case 'Divider':
        return this.buildDivider(widget, context);
      case 'Icon':
        return this.buildIcon(widget, context);
      case 'Image':
        return this.buildImage(widget, context);
      case 'CircleAvatar':
        return this.buildCircleAvatar(widget, context);

      // Navigation
      case 'MaterialApp':
        return this.buildMaterialApp(widget, context);
      case 'Navigator':
        return this.buildNavigator(widget, context);

      // Generic fallback
      default:
        return this.buildGeneric(widget, context);
    }
  }

  /**
   * Build children array
   * ✅ NOW PROPERLY PASSES CONTEXT WITH RUNTIME
   */
  buildChildren(children, context) {
    if (!children) return [];
    if (!Array.isArray(children)) children = [children];

    return children
      .map((child, index) => {
        // ✅ Ensure runtime is passed to all children
        return this.build(child, {
          ...context,
          childIndex: index,
          runtime: this.runtime  // ✅ CRITICAL
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

  // ============================================================================
  // TEXT WIDGETS
  // ============================================================================

  buildText(widget, context) {
    const style = widget.style || {};
    const data = widget.data || '';

    return new VNode({
      tag: 'span',
      props: {
        className: 'fjs-text',
        ...this.extractCommonProps(widget)
      },
      style: StyleConverter.textStyleToCss(style),
      children: [String(data)],
      metadata: {
        widgetType: 'Text',
        flutterProps: { data, style }
      }
    });
  }

  buildRichText(widget, context) {
    return new VNode({
      tag: 'span',
      props: { className: 'fjs-rich-text' },
      children: [widget.text || ''],
      metadata: { widgetType: 'RichText' }
    });
  }

  // ============================================================================
  // LAYOUT WIDGETS
  // ============================================================================

  buildContainer(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const decoration = widget.decoration || {};
    const padding = widget.padding;
    const margin = widget.margin;
    const color = widget.color;
    const width = widget.width;
    const height = widget.height;
    const alignment = widget.alignment;

    const style = {
      ...StyleConverter.decorationToCss(decoration),
      ...StyleConverter.paddingToCss(padding),
      ...StyleConverter.marginToCss(margin),
      ...StyleConverter.alignmentToCss(alignment),
    };

    if (color) {
      style.backgroundColor = StyleConverter.colorToCss(color);
    }

    if (width !== undefined) {
      style.width = typeof width === 'number' ? `${width}px` : width;
    }

    if (height !== undefined) {
      style.height = typeof height === 'number' ? `${height}px` : height;
    }

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-container',
        ...this.extractCommonProps(widget)
      },
      style,
      children: child ? [child] : [],
      metadata: {
        widgetType: 'Container',
        flutterProps: { decoration, padding, margin, color, width, height }
      }
    });
  }

  buildColumn(widget, context) {
    const children = this.buildChildren(widget.children, context);
    const mainAxisAlignment = widget.mainAxisAlignment || 'start';
    const crossAxisAlignment = widget.crossAxisAlignment || 'center';
    const mainAxisSize = widget.mainAxisSize || 'max';

    const style = {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: StyleConverter.mainAxisAlignmentToCss(mainAxisAlignment),
      alignItems: StyleConverter.crossAxisAlignmentToCss(crossAxisAlignment, 'column'),
    };

    if (mainAxisSize === 'min') {
      style.height = 'auto';
    }

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-column',
        ...this.extractCommonProps(widget)
      },
      style,
      children,
      metadata: {
        widgetType: 'Column',
        flutterProps: { mainAxisAlignment, crossAxisAlignment, mainAxisSize }
      }
    });
  }

  buildRow(widget, context) {
    const children = this.buildChildren(widget.children, context);
    const mainAxisAlignment = widget.mainAxisAlignment || 'start';
    const crossAxisAlignment = widget.crossAxisAlignment || 'center';
    const mainAxisSize = widget.mainAxisSize || 'max';

    const style = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: StyleConverter.mainAxisAlignmentToCss(mainAxisAlignment),
      alignItems: StyleConverter.crossAxisAlignmentToCss(crossAxisAlignment, 'row'),
    };

    if (mainAxisSize === 'min') {
      style.width = 'auto';
    }

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-row',
        ...this.extractCommonProps(widget)
      },
      style,
      children,
      metadata: {
        widgetType: 'Row',
        flutterProps: { mainAxisAlignment, crossAxisAlignment, mainAxisSize }
      }
    });
  }

  buildStack(widget, context) {
    const children = this.buildChildren(widget.children, context);
    const alignment = widget.alignment || 'topLeft';

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-stack',
        ...this.extractCommonProps(widget)
      },
      style: {
        position: 'relative',
        ...StyleConverter.alignmentToCss(alignment)
      },
      children: children.map(child => {
        return new VNode({
          tag: 'div',
          style: { position: 'absolute' },
          children: [child]
        });
      }),
      metadata: { widgetType: 'Stack' }
    });
  }

  buildCenter(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-center',
        ...this.extractCommonProps(widget)
      },
      style: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      children: child ? [child] : [],
      metadata: { widgetType: 'Center' }
    });
  }

  buildAlign(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const alignment = widget.alignment || 'center';

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-align',
        ...this.extractCommonProps(widget)
      },
      style: {
        display: 'flex',
        ...StyleConverter.alignmentToCss(alignment)
      },
      children: child ? [child] : [],
      metadata: { widgetType: 'Align', flutterProps: { alignment } }
    });
  }

  buildPadding(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const padding = widget.padding;

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-padding',
        ...this.extractCommonProps(widget)
      },
      style: StyleConverter.paddingToCss(padding),
      children: child ? [child] : [],
      metadata: { widgetType: 'Padding', flutterProps: { padding } }
    });
  }

  buildSizedBox(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const width = widget.width;
    const height = widget.height;

    const style = {};
    if (width !== undefined) {
      style.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      style.height = typeof height === 'number' ? `${height}px` : height;
    }

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-sized-box',
        ...this.extractCommonProps(widget)
      },
      style,
      children: child ? [child] : [],
      metadata: { widgetType: 'SizedBox', flutterProps: { width, height } }
    });
  }

  buildExpanded(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const flex = widget.flex || 1;

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-expanded',
        ...this.extractCommonProps(widget)
      },
      style: {
        flex: String(flex)
      },
      children: child ? [child] : [],
      metadata: { widgetType: 'Expanded', flutterProps: { flex } }
    });
  }

  buildFlexible(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const flex = widget.flex || 1;
    const fit = widget.fit || 'loose';

    const style = {
      flex: fit === 'tight' ? String(flex) : `0 1 auto`
    };

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-flexible',
        ...this.extractCommonProps(widget)
      },
      style,
      children: child ? [child] : [],
      metadata: { widgetType: 'Flexible', flutterProps: { flex, fit } }
    });
  }

  buildScaffold(widget, context) {
    const appBar = widget.appBar ? this.build(widget.appBar, context) : null;
    const body = widget.body ? this.build(widget.body, context) : null;
    const fab = widget.floatingActionButton
      ? this.build(widget.floatingActionButton, context)
      : null;
    const drawer = widget.drawer ? this.build(widget.drawer, context) : null;
    const backgroundColor = widget.backgroundColor;

    const children = [];

    if (appBar) children.push(appBar);
    if (body) {
      children.push(new VNode({
        tag: 'main',
        props: { className: 'fjs-scaffold-body' },
        style: { flex: '1' },
        children: [body]
      }));
    }
    if (fab) children.push(fab);
    if (drawer) children.push(drawer);

    const style = {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    };

    if (backgroundColor) {
      style.backgroundColor = StyleConverter.colorToCss(backgroundColor);
    }

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-scaffold',
        ...this.extractCommonProps(widget)
      },
      style,
      children,
      metadata: { widgetType: 'Scaffold' }
    });
  }

  buildAppBar(widget, context) {
    const title = widget.title ? this.build(widget.title, context) : null;
    const leading = widget.leading ? this.build(widget.leading, context) : null;
    const actions = widget.actions ? this.buildChildren(widget.actions, context) : [];
    const backgroundColor = widget.backgroundColor;

    const style = {
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      minHeight: '56px',
      gap: '16px'
    };

    if (backgroundColor) {
      style.backgroundColor = StyleConverter.colorToCss(backgroundColor);
    } else {
      style.backgroundColor = 'var(--md-sys-color-primary, #6750a4)';
      style.color = 'var(--md-sys-color-on-primary, #ffffff)';
    }

    const children = [];
    if (leading) children.push(leading);
    if (title) {
      children.push(new VNode({
        tag: 'div',
        props: { className: 'fjs-app-bar-title' },
        style: { flex: '1' },
        children: [title]
      }));
    }
    if (actions.length > 0) {
      children.push(new VNode({
        tag: 'div',
        props: { className: 'fjs-app-bar-actions' },
        style: { display: 'flex', gap: '8px' },
        children: actions
      }));
    }

    return new VNode({
      tag: 'header',
      props: {
        className: 'fjs-app-bar',
        ...this.extractCommonProps(widget)
      },
      style,
      children,
      metadata: { widgetType: 'AppBar' }
    });
  }

  buildFloatingActionButton(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const onPressed = widget.onPressed;
    const backgroundColor = widget.backgroundColor;

    const style = {
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      border: 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: onPressed ? 'pointer' : 'default',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
    };

    if (backgroundColor) {
      style.backgroundColor = StyleConverter.colorToCss(backgroundColor);
    } else {
      style.backgroundColor = 'var(--md-sys-color-primary, #6750a4)';
      style.color = 'var(--md-sys-color-on-primary, #ffffff)';
    }

    const events = {};
    if (onPressed && typeof onPressed === 'function') {
      events.click = onPressed;
    }

    return new VNode({
      tag: 'button',
      props: {
        className: 'fjs-fab',
        disabled: !onPressed,
        ...this.extractCommonProps(widget)
      },
      style,
      children: child ? [child] : [],
      events,
      metadata: { widgetType: 'FloatingActionButton' }
    });
  }

  buildDrawer(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;

    return new VNode({
      tag: 'aside',
      props: {
        className: 'fjs-drawer',
        ...this.extractCommonProps(widget)
      },
      style: {
        position: 'fixed',
        left: '0',
        top: '0',
        bottom: '0',
        width: '280px',
        backgroundColor: '#ffffff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        transform: 'translateX(-100%)',
        transition: 'transform 0.3s'
      },
      children: child ? [child] : [],
      metadata: { widgetType: 'Drawer' }
    });
  }

  buildButton(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const onPressed = widget.onPressed;
    const widgetType = this.getWidgetType(widget);

    const style = {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '4px',
      cursor: onPressed ? 'pointer' : 'default',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s'
    };

    if (widgetType === 'ElevatedButton') {
      style.backgroundColor = 'var(--md-sys-color-primary, #6750a4)';
      style.color = 'var(--md-sys-color-on-primary, #ffffff)';
      style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    } else if (widgetType === 'TextButton') {
      style.backgroundColor = 'transparent';
      style.color = 'var(--md-sys-color-primary, #6750a4)';
    } else if (widgetType === 'OutlinedButton') {
      style.backgroundColor = 'transparent';
      style.color = 'var(--md-sys-color-primary, #6750a4)';
      style.border = '1px solid var(--md-sys-color-outline, #79747e)';
    } else if (widgetType === 'IconButton') {
      style.padding = '8px';
      style.borderRadius = '50%';
      style.backgroundColor = 'transparent';
      style.width = '40px';
      style.height = '40px';
      style.display = 'flex';
      style.justifyContent = 'center';
      style.alignItems = 'center';
    }

    const events = {};
    if (onPressed && typeof onPressed === 'function') {
      events.click = onPressed;
    }

    return new VNode({
      tag: 'button',
      props: {
        className: `fjs-${widgetType.toLowerCase().replace(/button$/, '-button')}`,
        disabled: !onPressed,
        ...this.extractCommonProps(widget)
      },
      style,
      children: child ? [child] : [],
      events,
      metadata: { widgetType }
    });
  }

  buildTextField(widget, context) {
    const controller = widget.controller;
    const decoration = widget.decoration || {};
    const onChanged = widget.onChanged;
    const onSubmitted = widget.onSubmitted;
    const obscureText = widget.obscureText || false;

    const style = {
      padding: '12px 16px',
      border: '1px solid var(--md-sys-color-outline, #ccc)',
      borderRadius: '4px',
      fontSize: '16px',
      width: '100%',
      boxSizing: 'border-box'
    };

    const props = {
      className: 'fjs-text-field',
      type: obscureText ? 'password' : 'text',
      placeholder: decoration.hintText || '',
      ...this.extractCommonProps(widget)
    };

    if (controller && controller.text !== undefined) {
      props.value = controller.text;
    }

    const events = {};
    if (onChanged && typeof onChanged === 'function') {
      events.input = (e) => onChanged(e.target.value);
    }
    if (onSubmitted && typeof onSubmitted === 'function') {
      events.keypress = (e) => {
        if (e.key === 'Enter') onSubmitted(e.target.value);
      };
    }

    return new VNode({
      tag: 'input',
      props,
      style,
      events,
      metadata: { widgetType: 'TextField', flutterProps: { decoration, obscureText } }
    });
  }

  buildCheckbox(widget, context) {
    const value = widget.value || false;
    const onChanged = widget.onChanged;

    const events = {};
    if (onChanged && typeof onChanged === 'function') {
      events.change = (e) => onChanged(e.target.checked);
    }

    return new VNode({
      tag: 'input',
      props: {
        type: 'checkbox',
        checked: value,
        className: 'fjs-checkbox',
        ...this.extractCommonProps(widget)
      },
      style: {
        width: '20px',
        height: '20px',
        cursor: onChanged ? 'pointer' : 'default'
      },
      events,
      metadata: { widgetType: 'Checkbox', flutterProps: { value } }
    });
  }

  buildRadio(widget, context) {
    const value = widget.value;
    const groupValue = widget.groupValue;
    const onChanged = widget.onChanged;
    const checked = value === groupValue;

    const events = {};
    if (onChanged && typeof onChanged === 'function') {
      events.change = () => onChanged(value);
    }

    return new VNode({
      tag: 'input',
      props: {
        type: 'radio',
        checked,
        className: 'fjs-radio',
        ...this.extractCommonProps(widget)
      },
      style: {
        width: '20px',
        height: '20px',
        cursor: onChanged ? 'pointer' : 'default'
      },
      events,
      metadata: { widgetType: 'Radio', flutterProps: { value, groupValue } }
    });
  }

  buildSwitch(widget, context) {
    const value = widget.value || false;
    const onChanged = widget.onChanged;

    const events = {};
    if (onChanged && typeof onChanged === 'function') {
      events.change = (e) => onChanged(e.target.checked);
    }

    return new VNode({
      tag: 'label',
      props: { className: 'fjs-switch' },
      style: {
        display: 'inline-block',
        width: '52px',
        height: '32px',
        position: 'relative'
      },
      children: [
        new VNode({
          tag: 'input',
          props: {
            type: 'checkbox',
            checked: value,
            style: 'display: none;'
          },
          events
        }),
        new VNode({
          tag: 'span',
          props: { className: 'fjs-switch-slider' },
          style: {
            position: 'absolute',
            cursor: 'pointer',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: value ? '#6750a4' : '#ccc',
            borderRadius: '32px',
            transition: '0.4s'
          }
        })
      ],
      metadata: { widgetType: 'Switch' }
    });
  }

  buildListView(widget, context) {
    const children = this.buildChildren(widget.children, context);

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-list-view',
        ...this.extractCommonProps(widget)
      },
      style: {
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      },
      children,
      metadata: { widgetType: 'ListView' }
    });
  }

  buildGridView(widget, context) {
    const children = this.buildChildren(widget.children, context);
    const crossAxisCount = widget.crossAxisCount || 2;

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-grid-view',
        ...this.extractCommonProps(widget)
      },
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${crossAxisCount}, 1fr)`,
        gap: '16px'
      },
      children,
      metadata: { widgetType: 'GridView', flutterProps: { crossAxisCount } }
    });
  }

  buildListTile(widget, context) {
    const leading = widget.leading ? this.build(widget.leading, context) : null;
    const title = widget.title ? this.build(widget.title, context) : null;
    const subtitle = widget.subtitle ? this.build(widget.subtitle, context) : null;
    const trailing = widget.trailing ? this.build(widget.trailing, context) : null;
    const onTap = widget.onTap;

    const children = [];

    if (leading) {
      children.push(new VNode({
        tag: 'div',
        props: { className: 'fjs-list-tile-leading' },
        children: [leading]
      }));
    }

    const contentChildren = [];
    if (title) contentChildren.push(title);
    if (subtitle) contentChildren.push(subtitle);

    if (contentChildren.length > 0) {
      children.push(new VNode({
        tag: 'div',
        props: { className: 'fjs-list-tile-content' },
        style: { flex: '1' },
        children: contentChildren
      }));
    }

    if (trailing) {
      children.push(new VNode({
        tag: 'div',
        props: { className: 'fjs-list-tile-trailing' },
        children: [trailing]
      }));
    }

    const events = {};
    if (onTap && typeof onTap === 'function') {
      events.click = onTap;
    }

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-list-tile',
        ...this.extractCommonProps(widget)
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        cursor: onTap ? 'pointer' : 'default'
      },
      children,
      events,
      metadata: { widgetType: 'ListTile' }
    });
  }

  buildCard(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const elevation = widget.elevation || 1;
    const color = widget.color;

    const style = {
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: `0 ${elevation * 2}px ${elevation * 4}px rgba(0,0,0,0.${Math.min(elevation * 2, 3)})`
    };

    if (color) {
      style.backgroundColor = StyleConverter.colorToCss(color);
    } else {
      style.backgroundColor = '#ffffff';
    }

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-card',
        ...this.extractCommonProps(widget)
      },
      style,
      children: child ? [child] : [],
      metadata: { widgetType: 'Card', flutterProps: { elevation } }
    });
  }

  buildDivider(widget, context) {
    const height = widget.height || 1;
    const thickness = widget.thickness || 1;
    const color = widget.color;

    const style = {
      height: `${height}px`,
      borderTop: `${thickness}px solid ${color ? StyleConverter.colorToCss(color) : '#e0e0e0'}`,
      margin: '8px 0'
    };

    return new VNode({
      tag: 'hr',
      props: {
        className: 'fjs-divider',
        ...this.extractCommonProps(widget)
      },
      style,
      metadata: { widgetType: 'Divider' }
    });
  }

  buildIcon(widget, context) {
    const icon = widget.icon;
    const size = widget.size || 24;
    const color = widget.color;

    const style = {
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-block'
    };

    if (color) {
      style.color = StyleConverter.colorToCss(color);
    }

    return new VNode({
      tag: 'span',
      props: {
        className: 'fjs-icon',
        'data-icon': icon,
        ...this.extractCommonProps(widget)
      },
      style,
      children: ['⬤'],
      metadata: { widgetType: 'Icon', flutterProps: { icon, size } }
    });
  }

  buildImage(widget, context) {
    const src = widget.image?.src || widget.src || '';
    const width = widget.width;
    const height = widget.height;
    const fit = widget.fit || 'contain';

    const style = {};

    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    const fitMap = {
      fill: 'fill',
      contain: 'contain',
      cover: 'cover',
      fitWidth: 'scale-down',
      fitHeight: 'scale-down',
      none: 'none',
      scaleDown: 'scale-down'
    };
    style.objectFit = fitMap[fit] || 'contain';

    return new VNode({
      tag: 'img',
      props: {
        src,
        alt: widget.semanticLabel || '',
        className: 'fjs-image',
        ...this.extractCommonProps(widget)
      },
      style,
      metadata: { widgetType: 'Image', flutterProps: { src, fit } }
    });
  }

  buildCircleAvatar(widget, context) {
    const child = widget.child ? this.build(widget.child, context) : null;
    const radius = widget.radius || 20;
    const backgroundColor = widget.backgroundColor;

    const style = {
      width: `${radius * 2}px`,
      height: `${radius * 2}px`,
      borderRadius: '50%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    };

    if (backgroundColor) {
      style.backgroundColor = StyleConverter.colorToCss(backgroundColor);
    } else {
      style.backgroundColor = 'var(--md-sys-color-primary-container, #eaddff)';
    }

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-circle-avatar',
        ...this.extractCommonProps(widget)
      },
      style,
      children: child ? [child] : [],
      metadata: { widgetType: 'CircleAvatar', flutterProps: { radius } }
    });
  }

  buildMaterialApp(widget, context) {
    const home = widget.home ? this.build(widget.home, context) : null;
    const title = widget.title || '';

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-material-app',
        'data-title': title,
        ...this.extractCommonProps(widget)
      },
      style: {
        minHeight: '100vh',
        fontFamily: 'Roboto, sans-serif'
      },
      children: home ? [home] : [],
      metadata: { widgetType: 'MaterialApp', flutterProps: { title } }
    });
  }

  buildNavigator(widget, context) {
    const children = this.buildChildren(widget.pages || [], context);

    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-navigator',
        ...this.extractCommonProps(widget)
      },
      children,
      metadata: { widgetType: 'Navigator' }
    });
  }

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