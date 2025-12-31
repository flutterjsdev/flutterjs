import { Widget, StatelessWidget, Element } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { GestureDetector } from './gesture_detector.js';

// ============================================================================
// FLOATING ACTION BUTTON
// ============================================================================

class FloatingActionButton extends StatelessWidget {
  constructor({
    key = null,
    onPressed = null,
    onLongPress = null,
    tooltip = null,
    foregroundColor = '#FFF',
    backgroundColor = null,
    focusColor = null,
    hoverColor = null,
    splashColor = null,
    elevation = 6,
    highlightElevation = 12,
    disabledElevation = 0,
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
    this.backgroundColor = backgroundColor || this._getDefaultBackgroundColor();
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
   * Get default background color (primary color from theme)
   */
  _getDefaultBackgroundColor() {
    if (typeof window !== 'undefined') {
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#2196F3';
      return primaryColor.trim();
    }
    return '#2196F3';
  }

  /**
   * Get button size based on mini flag
   */
  _getButtonSize() {
    return this.mini ? 40 : 56;
  }

  /**
   * Get button styles
   */
  _getButtonStyle() {
    const size = this._getButtonSize();
    const elevation = this._isPressed ? this.highlightElevation : this.elevation;

    return {
      position: 'relative',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: this.backgroundColor,
      color: this.foregroundColor,
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: `0 ${elevation}px ${elevation * 1.5}px rgba(0, 0, 0, 0.${elevation})`,
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
  _getRippleStyle() {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: '50%',
      backgroundColor: this.splashColor || 'rgba(255, 255, 255, 0.2)',
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
    const buttonStyle = this._getButtonStyle();
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
            style: this._getRippleStyle(),
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
      child: new StatelessWidget({
        build: (ctx) => buttonContent
      })
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
    return new FloatingActionButtonElement(this,parent, runtime);
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
    foregroundColor = '#FFF',
    backgroundColor = null,
    icon = null,
    label = '',
    elevation = 6,
    highlightElevation = 12,
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
    this.backgroundColor = backgroundColor || this._getDefaultBackgroundColor();
    this.icon = icon;
    this.label = label;
    this.elevation = elevation;
    this.highlightElevation = highlightElevation;
    this.clipBehavior = clipBehavior;
    this.heroTag = heroTag;
    this.enableFeedback = enableFeedback;

    this._isPressed = false;
  }

  /**
   * Get default background color
   */
  _getDefaultBackgroundColor() {
    if (typeof window !== 'undefined') {
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#2196F3';
      return primaryColor.trim();
    }
    return '#2196F3';
  }

  /**
   * Handle press
   */
  _handlePress(event) {
    if (this.enableFeedback && navigator.vibrate) {
      navigator.vibrate(10);
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
      navigator.vibrate([10, 20, 10]);
    }
    if (this.onLongPress) {
      this.onLongPress(event);
    }
  }

  build(context) {
    const elevation = this._isPressed ? this.highlightElevation : this.elevation;

    const buttonStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px 20px',
      borderRadius: '48px',
      backgroundColor: this.backgroundColor,
      color: this.foregroundColor,
      border: 'none',
      cursor: 'pointer',
      boxShadow: `0 ${elevation}px ${elevation * 1.5}px rgba(0, 0, 0, 0.${elevation})`,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      fontSize: '14px',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      outline: 'none',
      fontFamily: 'inherit',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      minHeight: '48px'
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
      child: new StatelessWidget({
        build: (ctx) => buttonContent
      })
    });

    const fabElement = fabWidget.createElement?.(context.element, context.element.runtime);
    if (fabElement && fabElement.mount) {
      fabElement.mount(context.element);
    }
    return fabElement?.performRebuild?.(context.element, context.element.runtime) || null;
  }

  createElement(parent, runtime) {
    return new FloatingActionButtonElement(this,parent, runtime);
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