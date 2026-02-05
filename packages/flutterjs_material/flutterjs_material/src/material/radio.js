// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { RadioThemeData } from '../utils/radio_theme.js';
import { Color } from '../utils/color.js';
import { Theme } from './theme.js';

/**
 * Radio - Material Design radio button widget
 * Used for selecting a single option from a set
 */
class Radio extends StatefulWidget {
    constructor({
        key = null,
        value = null,
        groupValue = null,
        onChanged = null,
        toggleable = false,
        activeColor = null,
        fillColor = null,
        materialTapTargetSize = 'padded',
        visualDensity = null,
        focusColor = null,
        hoverColor = null,
        overlayColor = null,
        splashRadius = null,
        focusNode = null,
        autofocus = false
    } = {}) {
        super(key);
        this.value = value;
        this.groupValue = groupValue;
        this.onChanged = onChanged;
        this.toggleable = toggleable;
        this.activeColor = activeColor;
        this.fillColor = fillColor;
        this.materialTapTargetSize = materialTapTargetSize;
        this.visualDensity = visualDensity;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.overlayColor = overlayColor;
        this.splashRadius = splashRadius;
        this.focusNode = focusNode;
        this.autofocus = autofocus;
    }

    createState() {
        return new RadioState();
    }
}

/**
 * RadioState - State management for Radio
 */
class RadioState extends State {
    constructor() {
        super();
        this.isHovered = false;
        this.isFocused = false;
        this.isPressed = false;
    }

    _handleClick(event) {
        event.stopPropagation();

        if (this.widget.onChanged == null) return;

        if (this.widget.toggleable && this.widget.value === this.widget.groupValue) {
            // If already selected and toggleable, deselect
            this.widget.onChanged(null);
        } else {
            // Select this value
            this.widget.onChanged(this.widget.value);
        }
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
        const isSelected = this.widget.value === this.widget.groupValue;

        const elementId = context.element?.getElementId?.() || `radio-${Date.now()}`;
        const widgetPath = context.element?.getWidgetPath?.() || 'Radio';

        // Get theme
        const theme = context.radioTheme || new RadioThemeData();
        const appTheme = Theme.of(context);
        const colorScheme = appTheme.colorScheme;

        // Determine colors using theme
        const fillColor = this._getFillColor(isSelected, isDisabled, theme, colorScheme);
        const borderColor = this._getBorderColor(isSelected, isDisabled, theme, colorScheme);

        // Container styles
        const containerStyles = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${theme.getRadioSize()}px`,
            height: `${theme.getRadioSize()}px`,
            borderRadius: '50%',
            cursor: isDisabled ? 'default' : (this.widget.mouseCursor || theme.mouseCursor || 'pointer'),
            position: 'relative',
            transition: 'background-color 0.15s ease',
            backgroundColor: this._getOverlayColor(isDisabled, theme, colorScheme)
        };

        // Radio circle styles
        const circleStyles = {
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: `2px solid ${borderColor}`,
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `all ${theme.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            position: 'relative'
        };

        // Inner dot (shown when selected)
        let innerDot = null;
        if (isSelected) {
            innerDot = new VNode({
                tag: 'div',
                props: {
                    className: 'fjs-radio-inner-dot',
                    style: {
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: fillColor,
                        transition: `transform ${theme.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                        transform: 'scale(1)'
                    }
                }
            });
        }

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
            className: 'fjs-radio-container',
            style: containerStyles,
            tabIndex: isDisabled ? -1 : 0,
            role: 'radio',
            'aria-checked': isSelected,
            'aria-disabled': isDisabled,
            'data-element-id': elementId,
            'data-widget-path': widgetPath,
            'data-widget': 'Radio',
            'data-selected': isSelected,
            'data-disabled': isDisabled
        };

        const circle = new VNode({
            tag: 'div',
            props: {
                className: 'fjs-radio-circle',
                style: circleStyles
            },
            children: innerDot ? [innerDot] : []
        });

        return new VNode({
            tag: 'div',
            props: containerProps,
            children: [circle],
            events,
            key: this.widget.key
        });
    }

    _getFillColor(isSelected, isDisabled, theme, colorScheme) {
        if (isDisabled) {
            return new Color(colorScheme.onSurface).withOpacity(0.38).toCSSString();
        }

        if (this.widget.fillColor) {
            return new Color(this.widget.fillColor).toCSSString();
        }

        if (isSelected && this.widget.activeColor) {
            return new Color(this.widget.activeColor).toCSSString();
        }

        if (isSelected) {
            return theme.fillColor || colorScheme.primary || '#6200ee';
        }

        return 'transparent';
    }

    _getBorderColor(isSelected, isDisabled, theme, colorScheme) {
        if (isDisabled) {
            return new Color(colorScheme.onSurface).withOpacity(0.38).toCSSString();
        }

        if (isSelected && this.widget.activeColor) {
            return new Color(this.widget.activeColor).toCSSString();
        }

        if (isSelected) {
            return colorScheme.primary || '#6200ee';
        }

        return colorScheme.onSurfaceVariant || '#49454F';
    }

    _getOverlayColor(isDisabled, theme, colorScheme) {
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

        // Use theme
        if (this.isPressed) {
            return new Color(colorScheme.primary).withOpacity(0.12).toCSSString();
        }

        if (this.isFocused) {
            return new Color(colorScheme.onSurface).withOpacity(0.12).toCSSString();
        }

        if (this.isHovered) {
            return new Color(colorScheme.onSurface).withOpacity(0.08).toCSSString();
        }

        return 'transparent';
    }
}

export { Radio, RadioState };
