import { StatefulWidget, State } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { CheckboxThemeData } from '../utils/checkbox_theme.js';
import { Color } from '../utils/color.js';
import { Theme } from './theme.js';

/**
 * Checkbox - Material Design checkbox widget
 */
class Checkbox extends StatefulWidget {
    constructor({
        key = null,
        value = false,
        tristate = false,
        onChanged = null,
        activeColor = null,
        fillColor = null,
        checkColor = null,
        focusColor = null,
        hoverColor = null,
        overlayColor = null,
        splashRadius = null,
        materialTapTargetSize = 'padded',
        visualDensity = null,
        focusNode = null,
        autofocus = false,
        shape = null,
        side = null
    } = {}) {
        super(key);
        this.value = value;
        this.tristate = tristate;
        this.onChanged = onChanged;
        this.activeColor = activeColor;
        this.fillColor = fillColor;
        this.checkColor = checkColor;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.overlayColor = overlayColor;
        this.splashRadius = splashRadius;
        this.materialTapTargetSize = materialTapTargetSize;
        this.visualDensity = visualDensity;
        this.focusNode = focusNode;
        this.autofocus = autofocus;
        this.shape = shape;
        this.side = side;
    }

    createState() {
        return new CheckboxState();
    }
}

/**
 * CheckboxState - State management for Checkbox
 */
class CheckboxState extends State {
    constructor() {
        super();
        this.isHovered = false;
        this.isFocused = false;
        this.isPressed = false;
    }

    _handleClick(event) {
        event.stopPropagation();

        if (this.widget.onChanged == null) return;

        if (this.widget.tristate) {
            // Cycle through: false -> true -> null -> false
            let newValue;
            if (this.widget.value === false) {
                newValue = true;
            } else if (this.widget.value === true) {
                newValue = null;
            } else {
                newValue = false;
            }
            this.widget.onChanged(newValue);
        } else {
            this.widget.onChanged(!this.widget.value);
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
        const isChecked = this.widget.value === true;
        const isIndeterminate = this.widget.value == null;

        const elementId = context.element?.getElementId?.() || `checkbox-${Date.now()}`;
        const widgetPath = context.element?.getWidgetPath?.() || 'Checkbox';

        // Get theme
        const theme = context.checkboxTheme || new CheckboxThemeData();

        // Create implicit theme/colorScheme access
        const appTheme = Theme.of(context);
        const colorScheme = appTheme.colorScheme;

        // Determine colors using theme
        const fillColor = this._getFillColor(isChecked, isIndeterminate, isDisabled, theme, colorScheme);
        const borderColor = this._getBorderColor(isChecked, isIndeterminate, isDisabled, theme, colorScheme);
        const checkColor = this.widget.checkColor
            ? new Color(this.widget.checkColor).toCSSString()
            : colorScheme.onPrimary; // M3 default

        // Container styles
        const containerStyles = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${theme.getCheckboxSize()}px`,
            height: `${theme.getCheckboxSize()}px`,
            borderRadius: '50%',
            cursor: isDisabled ? 'default' : 'pointer',
            position: 'relative',
            transition: 'background-color 0.15s ease',
            backgroundColor: this._getOverlayColor(isDisabled, theme, colorScheme)
        };

        // Checkbox box styles
        const boxStyles = {
            width: '18px',
            height: '18px',
            borderRadius: this.widget.shape?.borderRadius || '2px',
            border: `2px solid ${borderColor}`,
            backgroundColor: fillColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `all ${theme.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            position: 'relative'
        };

        // Build check mark or indeterminate line
        let checkMark = null;
        if (isChecked) {
            // Ensure checkColor is string
            const safeCheckColor = typeof checkColor === 'object' && checkColor.toCSSString
                ? checkColor.toCSSString()
                : checkColor;
            checkMark = this._buildCheckMark(safeCheckColor);
        } else if (isIndeterminate) {
            const safeCheckColor = typeof checkColor === 'object' && checkColor.toCSSString
                ? checkColor.toCSSString()
                : checkColor;
            checkMark = this._buildIndeterminateMark(safeCheckColor);
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
            className: 'fjs-checkbox-container',
            style: containerStyles,
            tabIndex: isDisabled ? -1 : 0,
            role: 'checkbox',
            'aria-checked': isIndeterminate ? 'mixed' : isChecked,
            'aria-disabled': isDisabled,
            'data-element-id': elementId,
            'data-widget-path': widgetPath,
            'data-widget': 'Checkbox',
            'data-checked': isChecked,
            'data-indeterminate': isIndeterminate,
            'data-disabled': isDisabled
        };

        const box = new VNode({
            tag: 'div',
            props: {
                className: 'fjs-checkbox-box',
                style: boxStyles
            },
            children: checkMark ? [checkMark] : []
        });

        return new VNode({
            tag: 'div',
            props: containerProps,
            children: [box],
            events,
            key: this.widget.key
        });
    }

    _getFillColor(isChecked, isIndeterminate, isDisabled, theme, colorScheme) {
        if (isDisabled) {
            const disabledColor = new Color(colorScheme.onSurface).withOpacity(0.38);
            return isChecked || isIndeterminate ? disabledColor.toCSSString() : 'transparent';
        }

        if (this.widget.fillColor) {
            return new Color(this.widget.fillColor).toCSSString();
        }

        if (this.widget.activeColor && (isChecked || isIndeterminate)) {
            return new Color(this.widget.activeColor).toCSSString();
        }

        if (isChecked || isIndeterminate) {
            return theme.fillColor || colorScheme.primary;
        }

        return 'transparent';
    }

    _getBorderColor(isChecked, isIndeterminate, isDisabled, theme, colorScheme) {
        if (isDisabled) {
            return new Color(colorScheme.onSurface).withOpacity(0.38).toCSSString();
        }

        if (this.widget.side?.color) {
            return new Color(this.widget.side.color).toCSSString();
        }

        if (this.widget.activeColor && (isChecked || isIndeterminate)) {
            return new Color(this.widget.activeColor).toCSSString();
        }

        if (isChecked || isIndeterminate) {
            return colorScheme.primary || '#6200ee';
        }

        // Unselected border color - M3 uses onSurfaceVariant
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

        // Use theme colors
        // If theme has logic, let it handle it, but fallback to Primary with Opacity
        if (this.isPressed) {
            // Pressed is usually Primary with high opacity
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

    _buildCheckMark(checkColor) {
        // SVG check mark with proper SVG attributes
        return new VNode({
            tag: 'svg',
            props: {
                width: '14',
                height: '14',
                viewBox: '0 0 14 14',
                style: {
                    position: 'absolute'
                }
            },
            children: [
                new VNode({
                    tag: 'path',
                    props: {
                        d: 'M2 7l4 4 6-8',
                        fill: 'none',
                        stroke: checkColor,
                        'stroke-width': '2',
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round'
                    }
                })
            ]
        });
    }

    _buildIndeterminateMark(checkColor) {
        return new VNode({
            tag: 'div',
            props: {
                style: {
                    width: '10px',
                    height: '2px',
                    backgroundColor: checkColor,
                    borderRadius: '1px',
                    pointerEvents: 'none'
                }
            }
        });
    }
}

export { Checkbox, CheckboxState };
