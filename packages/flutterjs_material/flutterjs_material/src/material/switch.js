import { StatefulWidget, State } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { SwitchThemeData } from '../utils/switch_theme.js';
import { Color } from '../utils/color.js';

/**
 * Switch - Material Design switch widget (toggle control)
 */
class Switch extends StatefulWidget {
    constructor({
        key = null,
        value = false,
        onChanged = null,
        activeColor = null,
        activeTrackColor = null,
        inactiveThumbColor = null,
        inactiveTrackColor = null,
        activeThumbImage = null,
        inactiveThumbImage = null,
        thumbColor = null,
        trackColor = null,
        materialTapTargetSize = 'padded',
        dragStartBehavior = 'start',
        mouseCursor = null,
        focusColor = null,
        hoverColor = null,
        overlayColor = null,
        splashRadius = null,
        focusNode = null,
        autofocus = false
    } = {}) {
        super(key);
        this.value = value;
        this.onChanged = onChanged;
        this.activeColor = activeColor;
        this.activeTrackColor = activeTrackColor;
        this.inactiveThumbColor = inactiveThumbColor;
        this.inactiveTrackColor = inactiveTrackColor;
        this.activeThumbImage = activeThumbImage;
        this.inactiveThumbImage = inactiveThumbImage;
        this.thumbColor = thumbColor;
        this.trackColor = trackColor;
        this.materialTapTargetSize = materialTapTargetSize;
        this.dragStartBehavior = dragStartBehavior;
        this.mouseCursor = mouseCursor;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.overlayColor = overlayColor;
        this.splashRadius = splashRadius;
        this.focusNode = focusNode;
        this.autofocus = autofocus;
    }

    createState() {
        return new SwitchState();
    }
}

/**
 * SwitchState - State management for Switch
 */
class SwitchState extends State {
    constructor() {
        super();
        this.isHovered = false;
        this.isFocused = false;
        this.isPressed = false;
        this.isDragging = false;
    }

    _handleClick(event) {
        event.stopPropagation();

        if (this.widget.onChanged == null) return;

        this.widget.onChanged(!this.widget.value);
    }

    _handleMouseEnter() {
        this.setState(() => {
            this.isHovered = true;
        });
    }

    _handleMouseLeave() {
        this.setState(() => {
            this.isHovered = false;
            this.isPressed = false;
        });
    }

    _handleMouseDown() {
        this.setState(() => {
            this.isPressed = true;
        });
    }

    _handleMouseUp() {
        this.setState(() => {
            this.isPressed = false;
        });
    }

    _handleFocus() {
        this.setState(() => {
            this.isFocused = true;
        });
    }

    _handleBlur() {
        this.setState(() => {
            this.isFocused = false;
        });
    }

    build(context) {
        const isDisabled = this.widget.onChanged == null;
        const isActive = this.widget.value;

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        // Get theme
        const theme = context.switchTheme || new SwitchThemeData();

        // Determine colors using theme
        const thumbColor = this._getThumbColor(isActive, isDisabled, theme);
        const trackColor = this._getTrackColor(isActive, isDisabled, theme);

        // Container styles (includes hit area)
        const containerStyles = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '59px', // Material spec: 51px track + 4px padding on each side
            height: `${theme.getSwitchSize()}px`,
            cursor: isDisabled ? 'default' : (this.widget.mouseCursor || theme.mouseCursor || 'pointer'),
            position: 'relative'
        };

        // Track styles
        const trackStyles = {
            width: '51px',
            height: `${theme.trackHeight}px`,
            borderRadius: `${theme.trackHeight / 2}px`,
            backgroundColor: trackColor,
            position: 'relative',
            transition: `background-color ${theme.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            opacity: isDisabled ? 0.38 : 1
        };

        // Thumb container (moves left/right)
        const thumbContainerStyles = {
            position: 'absolute',
            left: isActive ? '27px' : '4px', // Slides between left and right
            top: '50%',
            transform: 'translateY(-50%)',
            transition: `left ${theme.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };

        // Thumb styles
        const thumbStyles = {
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: thumbColor,
            boxShadow: isActive
                ? '0 2px 4px rgba(0,0,0,0.2), 0 1px 10px rgba(0,0,0,0.12)'
                : '0 1px 3px rgba(0,0,0,0.2), 0 1px 8px rgba(0,0,0,0.12)',
            transition: `all ${theme.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            position: 'relative',
            zIndex: 2
        };

        // Ripple/overlay effect
        const overlayStyles = {
            position: 'absolute',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: this._getOverlayColor(isDisabled, isActive, theme),
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'background-color 0.15s ease',
            zIndex: 1
        };

        const events = {
            click: (e) => this._handleClick(e),
            mouseenter: () => this._handleMouseEnter(),
            mouseleave: () => this._handleMouseLeave(),
            mousedown: () => this._handleMouseDown(),
            mouseup: () => this._handleMouseUp(),
            focus: () => this._handleFocus(),
            blur: () => this._handleBlur()
        };

        const containerProps = {
            className: 'fjs-switch-container',
            style: containerStyles,
            tabIndex: isDisabled ? -1 : 0,
            role: 'switch',
            'aria-checked': isActive,
            'aria-disabled': isDisabled,
            'data-element-id': elementId,
            'data-widget-path': widgetPath,
            'data-widget': 'Switch',
            'data-active': isActive,
            'data-disabled': isDisabled
        };

        // Build thumb with optional overlay
        const thumbChildren = [];

        // Overlay (ripple effect)
        const overlay = new VNode({
            tag: 'div',
            props: {
                className: 'fjs-switch-overlay',
                style: overlayStyles
            }
        });
        thumbChildren.push(overlay);

        // Thumb
        const thumb = new VNode({
            tag: 'div',
            props: {
                className: 'fjs-switch-thumb',
                style: thumbStyles
            }
        });
        thumbChildren.push(thumb);

        const thumbContainer = new VNode({
            tag: 'div',
            props: {
                className: 'fjs-switch-thumb-container',
                style: thumbContainerStyles
            },
            children: thumbChildren
        });

        const track = new VNode({
            tag: 'div',
            props: {
                className: 'fjs-switch-track',
                style: trackStyles
            },
            children: [thumbContainer]
        });

        return new VNode({
            tag: 'div',
            props: containerProps,
            children: [track],
            events,
            key: this.widget.key
        });
    }

    _getThumbColor(isActive, isDisabled, theme) {
        if (this.widget.thumbColor) {
            return new Color(this.widget.thumbColor).toCSSString();
        }

        if (isDisabled) {
            return new Color('#bdbdbd').toCSSString();
        }

        if (this.widget.activeColor && isActive) {
            return new Color(this.widget.activeColor).toCSSString();
        }

        if (this.widget.inactiveThumbColor && !isActive) {
            return new Color(this.widget.inactiveThumbColor).toCSSString();
        }

        // Use theme defaults
        if (isActive) {
            return '#FFFFFF'; // Material default for active thumb
        }

        return new Color('#fafafa').toCSSString();
    }

    _getTrackColor(isActive, isDisabled, theme) {
        if (this.widget.trackColor) {
            return new Color(this.widget.trackColor).toCSSString();
        }

        if (isDisabled) {
            return new Color('#424242').toCSSString();
        }

        if (this.widget.activeTrackColor && isActive) {
            return new Color(this.widget.activeTrackColor).toCSSString();
        }

        if (this.widget.inactiveTrackColor && !isActive) {
            return new Color(this.widget.inactiveTrackColor).toCSSString();
        }

        // Use theme defaults
        if (isActive) {
            return new Color('#2196f3').withOpacity(0.5).toCSSString(); // Material blue, semi-transparent
        }

        return new Color('#9e9e9e').toCSSString();
    }

    _getOverlayColor(isDisabled, isActive, theme) {
        if (isDisabled) {
            return 'transparent';
        }

        if (this.widget.overlayColor && this.isPressed) {
            return new Color(this.widget.overlayColor).withOpacity(0.24).toCSSString();
        }

        if (this.widget.focusColor && this.isFocused) {
            return new Color(this.widget.focusColor).withOpacity(0.12).toCSSString();
        }

        if (this.widget.hoverColor && this.isHovered) {
            return new Color(this.widget.hoverColor).withOpacity(0.08).toCSSString();
        }

        // Use theme or default colors
        const baseColor = isActive ? '#2196f3' : '#616161';
        const alpha = this.isPressed ? 0.24 : (this.isFocused ? 0.12 : (this.isHovered ? 0.08 : 0));

        if (alpha === 0) return 'transparent';

        return new Color(baseColor).withOpacity(alpha).toCSSString();
    }
}

export { Switch, SwitchState };
