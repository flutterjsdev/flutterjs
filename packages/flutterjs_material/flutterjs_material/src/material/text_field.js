import { StatefulWidget, State } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { InputDecoration } from './input_decorator.js';
import { OutlineInputBorder, UnderlineInputBorder } from './input_border.js';
import { TextEditingController } from './text_editing_controller.js';
import { Color } from '../utils/color.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { TextStyle } from '../painting/text_style.js';


/**
 * TextField - Material Design text input field
 */
class TextField extends StatefulWidget {
    constructor({
        key = null,
        controller = null,
        decoration = null,
        keyboardType = 'text',
        textInputAction = 'done',
        textCapitalization = 'none',
        style = null,
        textAlign = 'left',
        textDirection = 'ltr',
        autofocus = false,
        obscureText = false,
        autocorrect = true,
        enableSuggestions = true,
        maxLines = 1,
        minLines = null,
        expands = false,
        maxLength = null,
        onChange = null,
        onEditingComplete = null,
        onSubmitted = null,
        onTap = null,
        enabled = true,
        readOnly = false,
        showCursor = true,
        selectionControls = null,
        buildCounter = null,
        scrollPadding = null,
        enableIMEPersonalizedLearning = true,
        cursorWidth = 2.0,
        cursorHeight = null,
        cursorRadius = null,
        cursorColor = null,
        keyboardAppearance = 'light',
        scrollPhysics = null,
        dragStartBehavior = 'start',
        selectionEnabled = true,
        onTapOutside = null
    } = {}) {
        super(key);
        this.controller = controller;
        this.decoration = decoration || new InputDecoration();
        this.keyboardType = keyboardType;
        this.textInputAction = textInputAction;
        this.textCapitalization = textCapitalization;
        this.style = style || new TextStyle({ fontSize: 16 });
        this.textAlign = textAlign;
        this.textDirection = textDirection;
        this.autofocus = autofocus;
        this.obscureText = obscureText;
        this.autocorrect = autocorrect;
        this.enableSuggestions = enableSuggestions;
        this.maxLines = maxLines;
        this.minLines = minLines;
        this.expands = expands;
        this.maxLength = maxLength;
        this.onChange = onChange;
        this.onEditingComplete = onEditingComplete;
        this.onSubmitted = onSubmitted;
        this.onTap = onTap;
        this.enabled = enabled;
        this.readOnly = readOnly;
        this.showCursor = showCursor;
        this.selectionControls = selectionControls;
        this.buildCounter = buildCounter;
        this.scrollPadding = scrollPadding;
        this.enableIMEPersonalizedLearning = enableIMEPersonalizedLearning;
        this.cursorWidth = cursorWidth;
        this.cursorHeight = cursorHeight;
        this.cursorRadius = cursorRadius;
        this.cursorColor = cursorColor;
        this.keyboardAppearance = keyboardAppearance;
        this.scrollPhysics = scrollPhysics;
        this.dragStartBehavior = dragStartBehavior;
        this.selectionEnabled = selectionEnabled;
        this.onTapOutside = onTapOutside;
    }

    createState() {
        return new TextFieldState();
    }
}

/**
 * TextFieldState - State management for TextField
 */
class TextFieldState extends State {
    constructor() {
        super();
        this.isFocused = false;
        this.value = '';
        this.inputRef = null;
    }

    initState() {
        super.initState();
        if (this.widget.controller) {
            this.value = this.widget.controller.text || '';
            // Listen to controller changes
            this.widget.controller.addListener(this._handleControllerChange.bind(this));
        }
        this.isFocused = this.widget.autofocus;
    }

    _handleControllerChange() {
        if (this.widget.controller && this.widget.controller.text !== this.value) {
            this.setState(() => {
                this.value = this.widget.controller.text;
            });
        }
    }

    dispose() {
        if (this.widget.controller) {
            this.widget.controller.removeListener(this._handleControllerChange.bind(this));
        }
        super.dispose();
    }

    didUpdateWidget(oldWidget) {
        super.didUpdateWidget(oldWidget);
        if (this.widget.controller !== oldWidget.controller) {
            // Remove old listener
            if (oldWidget.controller) {
                oldWidget.controller.removeListener(this._handleControllerChange.bind(this));
            }

            // Update value
            this.value = this.widget.controller?.text || '';

            // Add new listener
            if (this.widget.controller) {
                this.widget.controller.addListener(this._handleControllerChange.bind(this));
            }
        }
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
        if (this.widget.onEditingComplete) {
            this.widget.onEditingComplete();
        }
    }

    _handleChange(event) {
        const newValue = event.target.value;

        // Max length validation
        if (this.widget.maxLength && newValue.length > this.widget.maxLength) {
            return;
        }

        this.setState(() => {
            this.value = newValue;
        });

        // Update controller
        if (this.widget.controller) {
            // Avoid infinite loop by setting text directly without notifying if value is same (though value setter usually notifies)
            // Here we set it, which triggers listeners. Our listener checks equality.
            this.widget.controller.text = newValue;
        }

        // Trigger onChange callback
        if (this.widget.onChange) {
            this.widget.onChange(newValue);
        }
    }

    _handleSubmit(event) {
        event.preventDefault();
        if (this.widget.onSubmitted) {
            this.widget.onSubmitted(this.value);
        }
    }

    _handleTap() {
        if (this.widget.onTap) {
            this.widget.onTap();
        }
    }

    build(context) {
        const decoration = this.widget.decoration;
        const hasError = !!decoration.errorText;
        const currentBorder = hasError
            ? decoration.errorBorder
            : (this.isFocused ? decoration.focusedBorder : decoration.enabledBorder);

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        // Theme colors
        const primaryColor = new Color('#2196f3');
        const errorColor = new Color('#f44336');

        // Build the input field
        const inputStyles = this._getInputStyles(currentBorder);
        const containerStyles = this._getContainerStyles(decoration, currentBorder, primaryColor, errorColor);

        const inputProps = {
            type: this._getInputType(),
            value: this.value,
            placeholder: decoration.hintText || '',
            disabled: !this.widget.enabled,
            readOnly: this.widget.readOnly,
            maxLength: this.widget.maxLength || undefined,
            autoFocus: this.widget.autofocus,
            autoComplete: this.widget.autocorrect ? 'on' : 'off',
            autoCorrect: this.widget.autocorrect ? 'on' : 'off',
            spellCheck: this.widget.enableSuggestions,
            style: inputStyles,
            'data-element-id': `${elementId}-input`,
            'data-widget': 'TextField-Input'
        };

        const events = {
            focus: () => this._handleFocus(),
            blur: () => this._handleBlur(),
            input: (e) => this._handleChange(e),
            keydown: (e) => {
                if (e.key === 'Enter' && this.widget.maxLines === 1) {
                    this._handleSubmit(e);
                }
            },
            click: () => this._handleTap()
        };

        // Build decoration elements
        const children = [];

        // Prefix
        if (decoration.prefixIcon || decoration.prefix) {
            children.push(this._buildAffix(decoration.prefixIcon || decoration.prefix, 'prefix'));
        }

        // Main input
        const inputElement = new VNode({
            tag: this.widget.maxLines === 1 ? 'input' : 'textarea',
            props: inputProps,
            events
        });

        children.push(inputElement);

        // Suffix
        if (decoration.suffixIcon || decoration.suffix) {
            children.push(this._buildAffix(decoration.suffixIcon || decoration.suffix, 'suffix'));
        }

        // Wrap in container
        const containerProps = {
            className: 'fjs-text-field-container',
            style: containerStyles,
            'data-element-id': elementId,
            'data-widget-path': widgetPath,
            'data-widget': 'TextField',
            'data-focused': this.isFocused,
            'data-error': hasError
        };

        const container = new VNode({
            tag: 'div',
            props: containerProps,
            children
        });

        // Add label, helper text, error text
        const fieldChildren = [];

        // Floating label
        if (decoration.labelText) {
            fieldChildren.push(this._buildLabel(decoration.labelText, primaryColor, errorColor, hasError));
        }

        fieldChildren.push(container);

        // Helper/Error text
        if (decoration.errorText) {
            fieldChildren.push(this._buildHelperText(decoration.errorText, true, errorColor));
        } else if (decoration.helperText) {
            fieldChildren.push(this._buildHelperText(decoration.helperText, false, primaryColor));
        }

        // Counter
        if (this.widget.maxLength && (decoration.counter !== false)) {
            fieldChildren.push(this._buildCounter());
        }

        return new VNode({
            tag: 'div',
            props: {
                className: 'fjs-text-field-wrapper',
                style: { display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', marginTop: decoration.labelText ? '8px' : '0' }
            },
            children: fieldChildren,
            key: this.widget.key
        });
    }

    _getInputType() {
        const typeMap = {
            text: 'text',
            multiline: 'text',
            number: 'number',
            phone: 'tel',
            email: 'email',
            url: 'url',
            password: 'password',
            datetime: 'datetime-local',
            emailAddress: 'email',
            visiblePassword: 'text'
        };

        if (this.widget.obscureText) return 'password';
        return typeMap[this.widget.keyboardType] || 'text';
    }

    _getContainerStyles(decoration, border, primaryColor, errorColor) {
        const styles = {
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            backgroundColor: 'transparent'
        };

        // Border styles
        if (border instanceof OutlineInputBorder) {
            const borderSide = border.borderSide;
            // Flatten border properties
            const width = borderSide.width || border.borderWidth || 1;
            const color = borderSide.color || border.borderColor || '#bdbdbd';

            styles.border = `${width}px solid ${color}`;
            styles.borderRadius = `${border.borderRadius}px`;
        } else if (border instanceof UnderlineInputBorder) {
            const borderSide = border.borderSide;
            const width = borderSide.width || border.borderWidth || 1;
            const color = borderSide.color || border.borderColor || '#bdbdbd';

            styles.borderBottom = `${width}px solid ${color}`;
            // Other borders none
            styles.borderTop = 'none';
            styles.borderLeft = 'none';
            styles.borderRight = 'none';
        }

        // Fill color
        if (decoration.filled && decoration.fillColor) {
            styles.backgroundColor = decoration.fillColor;
        }

        // Content padding
        if (decoration.contentPadding) {
            const p = decoration.contentPadding;
            styles.padding = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
        }

        // Focused state overrides
        if (this.isFocused) {
            const focusColor = decoration.errorText ? errorColor.toCSSString() : primaryColor.toCSSString();
            if (border instanceof OutlineInputBorder) {
                styles.borderColor = focusColor;
                styles.borderWidth = '2px';
                styles.boxShadow = `0 0 0 1px ${new Color(focusColor).withOpacity(0.2).toCSSString()}`;
                // Adjust padding to prevent layout shift if width changes
                // (Simplified here, in real Flutter this is complex)
            } else if (border instanceof UnderlineInputBorder) {
                styles.borderBottomColor = focusColor;
                styles.borderBottomWidth = '2px';
            }
        }

        // Error state without focus
        if (!this.isFocused && decoration.errorText) {
            if (border instanceof OutlineInputBorder) {
                styles.borderColor = errorColor.toCSSString();
            } else if (border instanceof UnderlineInputBorder) {
                styles.borderBottomColor = errorColor.toCSSString();
            }
        }

        return styles;
    }

    _getInputStyles(border) {
        const styleObj = this.widget.style instanceof TextStyle
            ? this.widget.style.toCSSObject()
            : this.widget.style || {};

        return {
            fontSize: '16px', // Default
            color: 'inherit',
            ...styleObj,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            flex: 1,
            minWidth: 0,
            textAlign: this.widget.textAlign,
            direction: this.widget.textDirection,
            caretColor: this.widget.cursorColor ? new Color(this.widget.cursorColor).toCSSString() : '#2196f3',
            resize: this.widget.maxLines > 1 ? 'vertical' : 'none',
            padding: '0',
            margin: '0',
            fontFamily: 'inherit'
        };
    }

    _buildLabel(labelText, primaryColor, errorColor, hasError) {
        const isFloating = this.isFocused || this.value;
        const color = hasError
            ? errorColor.toCSSString()
            : (this.isFocused ? primaryColor.toCSSString() : '#757575');

        const labelStyles = {
            fontSize: isFloating ? '12px' : '16px',
            color: color,
            position: 'absolute',
            top: isFloating ? '-8px' : '12px',
            left: '12px',
            backgroundColor: '#fff', // Should probably extract this from theme scaffold background
            padding: '0 4px',
            transition: 'all 0.2s ease',
            pointerEvents: 'none',
            zIndex: 1
        };

        // Adjust top for filled?
        if (this.widget.decoration.filled) {
            labelStyles.backgroundColor = 'transparent';
        }

        return new VNode({
            tag: 'span',
            props: {
                className: 'fjs-text-field-label',
                style: labelStyles
            },
            children: [labelText]
        });
    }

    _buildHelperText(text, isError, colorObj) {
        return new VNode({
            tag: 'span',
            props: {
                className: `fjs-text-field-${isError ? 'error' : 'helper'}`,
                style: {
                    fontSize: '12px',
                    color: isError ? '#f44336' : '#757575',
                    marginTop: '4px',
                    marginLeft: '14px' // Align with padding
                }
            },
            children: [text]
        });
    }

    _buildCounter() {
        const count = this.value.length;
        const max = this.widget.maxLength;

        return new VNode({
            tag: 'span',
            props: {
                className: 'fjs-text-field-counter',
                style: {
                    fontSize: '12px',
                    color: '#757575',
                    textAlign: 'right',
                    marginTop: '4px',
                    marginRight: '14px'
                }
            },
            children: [`${count}/${max}`]
        });
    }

    _buildAffix(content, type) {
        // Content can be a widget or string. If string, wrap in span.
        // If widget (VNode), use as is. 
        // Simplified: assume it's a VNode or string.

        let child = content;
        if (typeof content === 'string') {
            child = content;
        }
        // Note: If content is a Widget, it needs to be built. 
        // This implementation assumes pre-built VNode or string, or handled by framework if child is widget.
        // But since this is a leaf widget build, we should expect VNodes here if complex.

        return new VNode({
            tag: 'span',
            props: {
                className: `fjs-text-field-${type}`,
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    padding: type === 'prefix' ? '0 8px 0 0' : '0 0 0 8px',
                    color: '#757575'
                }
            },
            children: [child]
        });
    }
}

export { TextField, TextFieldState };
