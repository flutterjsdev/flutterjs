// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Widget, StatelessWidget } from '../core/widget_element.js';
import { Element } from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { GestureDetector } from './gesture_detector.js';
import { Theme } from './theme.js';

// ============================================================================
// FLOATING ACTION BUTTON
// ============================================================================

class FloatingActionButton extends StatelessWidget {
  constructor({
    key = null,
    onPressed = null,
    onLongPress = null,
    tooltip = null,
    foregroundColor = null,
    backgroundColor = null,
    focusColor = null,
    hoverColor = null,
    splashColor = null,
    elevation = null,
    highlightElevation = null,
    disabledElevation = null,
    child = null,
    mini = false,
    shape = null,
    clipBehavior = 'clip',
    autofocus = false,
    materialTapTargetSize = null,
    isExtended = false,
    enableFeedback = true,
    heroTag = 'FloatingActionButton'
  } = {}) {
    super(key);

    if (!onPressed) {
      throw new Error('FloatingActionButton requires onPressed callback');
    }

    this.onPressed = onPressed;
    this.onLongPress = onLongPress;
    this.tooltip = tooltip;
    this.foregroundColor = foregroundColor;
    this.backgroundColor = backgroundColor;
    this.focusColor = focusColor;
    this.hoverColor = hoverColor;
    this.splashColor = splashColor;
    this.elevation = elevation;
    this.highlightElevation = highlightElevation;
    this.disabledElevation = disabledElevation;
    this.child = child;
    this.mini = mini;
    this.shape = shape;
    this.clipBehavior = clipBehavior;
    this.autofocus = autofocus;
    this.materialTapTargetSize = materialTapTargetSize;
    this.isExtended = isExtended;
    this.enableFeedback = enableFeedback;
    this.heroTag = heroTag;

    this._isHovered = false;
    this._isPressed = false;
  }

  /**
   * Get button size based on mini flag
   */
  _getButtonSize(fabTheme) {
    if (this.mini) return 40;
    // TODO: support fabTheme.sizeConstraints logic if complex
    return 56;
  }

  /**
   * Get button styles
   */
  _getButtonStyle(bgColor, fgColor, elevation, shape) {
    const size = this._getButtonSize();

    // Simple shape resolution (string or style obj)
    // M3 Standard: 16px
    let borderRadius = '16px';
    // If shape is provided (e.g. RoundedRectangleBorder), we'd extract it. 
    // For now assuming simple style or default.

    return {
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: borderRadius,
      backgroundColor: bgColor,
      color: fgColor,
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: `0 ${elevation}px ${elevation * 1.5}px rgba(0, 0, 0, 0.2)`,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
      fontFamily: 'inherit',
      fontSize: '24px',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    };
  }

  /**
   * Get ripple effect styles
   */
  _getRippleStyle(splashColor) {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: '50%', // Actually should match button shape
      backgroundColor: splashColor || 'rgba(255, 255, 255, 0.2)',
      opacity: 0,
      pointerEvents: 'none',
      animation: this._isPressed
        ? 'fab-ripple 0.6s ease-out'
        : 'none'
    };
  }

  /**
   * Handle press with feedback
   */
  _handlePress(event) {
    if (this.enableFeedback) {
      // Haptic feedback (if available)
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }

    if (this.onPressed) {
      this.onPressed(event);
    }
  }

  /**
   * Handle long press
   */
  _handleLongPress(event) {
    if (this.enableFeedback && navigator.vibrate) {
      navigator.vibrate([10, 20, 10]); // Double vibration for long press
    }

    if (this.onLongPress) {
      this.onLongPress(event);
    }
  }

  /**
   * Handle mouse/touch down
   */
  _handleTapDown(event) {
    this._isPressed = true;
  }

  /**
   * Handle mouse/touch up
   */
  _handleTapUp(event) {
    this._isPressed = false;
  }

  /**
   * Inject ripple animation keyframes
   */
  _injectKeyframes() {
    if (typeof document !== 'undefined' && !document.getElementById('fab-keyframes')) {
      const style = document.createElement('style');
      style.id = 'fab-keyframes';
      style.textContent = `
        @keyframes fab-ripple {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(2);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  build(context) {
    const theme = Theme.of(context);
    const colorScheme = theme.colorScheme;
    const fabTheme = theme.floatingActionButtonTheme || {};

    // 1. Resolve Colors
    const bgColor = this.backgroundColor || fabTheme.backgroundColor || colorScheme.primaryContainer || '#EADDFF';
    const fgColor = this.foregroundColor || fabTheme.foregroundColor || colorScheme.onPrimaryContainer || '#21005D';
    const splashColor = this.splashColor || fabTheme.splashColor || 'rgba(255, 255, 255, 0.2)';

    const getCSSColor = (c) => {
      if (c && typeof c.toCSSString === 'function') return c.toCSSString();
      if (c && typeof c.object === 'object' && c.value) return `#${c.value.toString(16).padStart(8, '0').slice(2)}`;
      if (typeof c === 'string') return c;
      return c;
    };

    const cssBgColor = getCSSColor(bgColor);
    const cssFgColor = getCSSColor(fgColor);
    const cssSplashColor = getCSSColor(splashColor);

    // 2. Resolve Elevation
    const elevation = this.elevation ?? fabTheme.elevation ?? 6;
    const highlightElevation = this.highlightElevation ?? fabTheme.highlightElevation ?? 12;
    const effectiveElevation = this._isPressed ? highlightElevation : elevation;

    // 3. Resolve Shape
    const shape = this.shape || fabTheme.shape;


    const buttonStyle = this._getButtonStyle(cssBgColor, cssFgColor, effectiveElevation, shape);
    let childVNode = null;

    // Build child element
    if (this.child) {
      const childElement = this.child.createElement?.(context.element, context.element.runtime) || this.child;
      if (childElement.mount) {
        childElement.mount(context.element);
      }
      childVNode = childElement.performRebuild?.(context.element, context.element.runtime) || null;
    }

    // Inject ripple animation keyframes
    this._injectKeyframes();

    // Create the actual button content (without gesture detection)
    const buttonContent = new VNode({
      tag: 'button',
      props: {
        style: buttonStyle,
        type: 'button',
        title: this.tooltip || '',
        'aria-label': this.tooltip || 'Floating Action Button'
      },
      children: [
        // Ripple effect
        new VNode({
          tag: 'span',
          props: {
            style: this._getRippleStyle(cssSplashColor),
            className: 'fab-ripple'
          },
          children: []
        }),
        // Child content (icon)
        new VNode({
          tag: 'span',
          props: {
            style: {
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          },
          children: childVNode ? [childVNode] : []
        })
      ]
    });

    // Wrap button with GestureDetector
    const fabWidget = new GestureDetector({
      onTap: (event) => this._handlePress(event),
      onTapDown: (event) => this._handleTapDown(event),
      onTapUp: (event) => this._handleTapUp(event),
      onLongPress: (event) => this._handleLongPress(event),
      child: new _FABContentWrapper(buttonContent)
    });

    // Build gesture detector element
    const fabElement = fabWidget.createElement?.(context.element, context.element.runtime);
    if (fabElement && fabElement.mount) {
      fabElement.mount(context.element);
    }
    let fabVNode = fabElement?.performRebuild?.(context.element, context.element.runtime) || null;

    // Wrap with tooltip if provided
    if (this.tooltip) {
      return new VNode({
        tag: 'div',
        props: {
          style: {
            position: 'relative',
            display: 'inline-block'
          },
          'data-widget': 'FloatingActionButton'
        },
        children: [
          fabVNode,
          new VNode({
            tag: 'div',
            props: {
              style: {
                visibility: 'hidden',
                backgroundColor: '#333',
                color: '#fff',
                textAlign: 'center',
                borderRadius: '4px',
                padding: '5px 8px',
                position: 'absolute',
                zIndex: 1000,
                bottom: '125%',
                left: '50%',
                marginLeft: '-40px',
                opacity: 0,
                transition: 'opacity 0.3s',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 500,
                pointerEvents: 'none',
                width: '80px'
              },
              className: 'fab-tooltip'
            },
            children: [this.tooltip]
          })
        ]
      });
    }

    return fabVNode;
  }

  createElement(parent, runtime) {
    return new FloatingActionButtonElement(this, parent, runtime);
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'onPressed', value: this.onPressed ? 'fn' : null });
    properties.push({ name: 'tooltip', value: this.tooltip });
    properties.push({ name: 'backgroundColor', value: this.backgroundColor });
    if (this.mini) properties.push({ name: 'mini', value: true });
  }
}

class FloatingActionButtonElement extends Element {
  performRebuild(parent, runtime) {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// EXTENDED FLOATING ACTION BUTTON
// ============================================================================

class FloatingActionButtonExtended extends StatelessWidget {
  constructor({
    key = null,
    onPressed = null,
    onLongPress = null,
    tooltip = null,
    foregroundColor = null,
    backgroundColor = null,
    icon = null,
    label = '',
    elevation = null,
    highlightElevation = null,
    clipBehavior = 'clip',
    heroTag = 'FloatingActionButton',
    enableFeedback = true
  } = {}) {
    super(key);

    if (!onPressed) {
      throw new Error('FloatingActionButtonExtended requires onPressed callback');
    }

    this.onPressed = onPressed;
    this.onLongPress = onLongPress;
    this.tooltip = tooltip;
    this.foregroundColor = foregroundColor;
    this.backgroundColor = backgroundColor;
    this.icon = icon;
    this.label = label;
    this.elevation = elevation;
    this.highlightElevation = highlightElevation;
    this.clipBehavior = clipBehavior;
    this.heroTag = heroTag;
    this.enableFeedback = enableFeedback;

    this._isPressed = false;
  }

  build(context) {
    const theme = Theme.of(context);
    const colorScheme = theme.colorScheme;
    const fabTheme = theme.floatingActionButtonTheme || {};

    const elevation = this.elevation ?? fabTheme.elevation ?? 6;
    const highlightElevation = this.highlightElevation ?? fabTheme.highlightElevation ?? 12;
    const effectiveElevation = this._isPressed ? highlightElevation : elevation;

    const bgColor = this.backgroundColor || fabTheme.backgroundColor || colorScheme.primaryContainer || '#EADDFF';
    const fgColor = this.foregroundColor || fabTheme.foregroundColor || colorScheme.onPrimaryContainer || '#21005D';

    const getCSSColor = (c) => {
      if (c && typeof c.toCSSString === 'function') return c.toCSSString();
      if (c && typeof c.object === 'object' && c.value) return `#${c.value.toString(16).padStart(8, '0').slice(2)}`;
      if (typeof c === 'string') return c;
      return c;
    };

    const effectiveBgColor = getCSSColor(bgColor);
    const effectiveFgColor = getCSSColor(fgColor);

    const buttonStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px 20px',
      borderRadius: '16px', // M3 Extended FAB radius
      backgroundColor: effectiveBgColor,
      color: effectiveFgColor,
      border: 'none',
      cursor: 'pointer',
      boxShadow: `0 ${effectiveElevation}px ${effectiveElevation * 1.5}px rgba(0, 0, 0, 0.2)`,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      fontSize: '14px',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      outline: 'none',
      fontFamily: 'inherit',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      minHeight: '56px' // M3 standard height
    };

    let iconVNode = null;
    if (this.icon) {
      const iconElement = this.icon.createElement?.(context.element, context.element.runtime) || this.icon;
      if (iconElement.mount) {
        iconElement.mount(context.element);
      }
      iconVNode = iconElement.performRebuild?.(context.element, context.element.runtime) || null;
    }

    const buttonContent = new VNode({
      tag: 'button',
      props: {
        style: buttonStyle,
        type: 'button',
        title: this.tooltip || '',
        'aria-label': this.tooltip || this.label
      },
      children: [
        iconVNode && new VNode({
          tag: 'span',
          props: { style: { display: 'flex', alignItems: 'center' } },
          children: [iconVNode]
        }),
        new VNode({
          tag: 'span',
          props: {},
          children: [this.label]
        })
      ]
    });

    // Wrap with GestureDetector
    const fabWidget = new GestureDetector({
      onTap: (event) => this._handlePress(event),
      onLongPress: (event) => this._handleLongPress(event),
      child: new _FABContentWrapper(buttonContent)
    });

    const fabElement = fabWidget.createElement?.(context.element, context.element.runtime);
    if (fabElement && fabElement.mount) {
      fabElement.mount(context.element);
    }
    return fabElement?.performRebuild?.(context.element, context.element.runtime) || null;
  }

  createElement(parent, runtime) {
    return new FloatingActionButtonElement(this, parent, runtime);
  }
}

class _FABContentWrapper extends StatelessWidget {
  constructor(content) {
    super();
    this.content = content;
  }

  build(context) {
    return this.content;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  FloatingActionButton,
  FloatingActionButtonElement,
  FloatingActionButtonExtended
};
