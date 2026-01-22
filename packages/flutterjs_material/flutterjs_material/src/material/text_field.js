import { StatefulWidget, State } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { InputDecoration } from './input_decorator.js';
import { OutlineInputBorder, UnderlineInputBorder } from './input_border.js';
import { TextEditingController } from './text_editing_controller.js';
import { Color } from '../utils/color.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { TextStyle } from '../painting/text_style.js';
import { Theme } from './theme.js';


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
        const isFocused = this.isFocused;
        const hasValue = this.value && this.value.length > 0;
        const isFloating = isFocused || hasValue;

        // Determine current border type and color
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        const primaryColor = new Color(colorScheme.primary);
        const errorColor = new Color(colorScheme.error);
        const outlineColor = new Color(colorScheme.outline);

        let borderColor = outlineColor.toCSSString();
        let borderWidth = 1;

        if (hasError) {
            borderColor = errorColor.toCSSString();
            borderWidth = isFocused ? 2 : 1;
        } else if (isFocused) {
            borderColor = primaryColor.toCSSString();
            borderWidth = 2;
        }

        // --- Styles ---

        // 1. Main Wrapper (Vertical stack: InputContainer + Helpers)
        const wrapperStyle = {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            position: 'relative',
            fontFamily: 'Roboto, sans-serif',
            boxSizing: 'border-box'
        };

        // 2. Input Decorator Container (The Box)
        const containerStyle = {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minHeight: decoration.isDense ? '40px' : '56px',
            backgroundColor: decoration.filled ? (decoration.fillColor || colorScheme.surfaceContainerHighest || '#E6E0E9') : 'transparent',
            borderRadius: '4px',
            boxSizing: 'border-box'
        };

        // Border application
        if (decoration.border instanceof OutlineInputBorder) {
            containerStyle.border = `${borderWidth}px solid ${borderColor}`;
            if (decoration.border.borderRadius) {
                containerStyle.borderRadius = `${decoration.border.borderRadius}px`;
            }
        } else if (decoration.border instanceof UnderlineInputBorder) {
            containerStyle.borderBottom = `${borderWidth}px solid ${borderColor}`;
            containerStyle.borderRadius = '4px 4px 0 0'; // Slight top radius for filled
        }

        // 3. Floating Label
        const labelStyle = {
            position: 'absolute',
            left: (decoration.border instanceof OutlineInputBorder) ? '12px' : '0px',
            top: '0',
            pointerEvents: 'none',
            transformOrigin: 'top left',
            transition: 'color 0.2s, transform 0.2s',
            color: hasError ? errorColor.toCSSString() : (isFocused ? primaryColor.toCSSString() : (colorScheme.onSurfaceVariant || '#49454F')),
            // Float logic: Translate up and Scale down
            transform: isFloating
                ? `translate(0, -50%) scale(0.75)`
                : `translate(0, 16px) scale(1)`,
            backgroundColor: (isFloating && decoration.border instanceof OutlineInputBorder) ? '#fafafa' : 'transparent',
            padding: '0 4px',
            zIndex: 1,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        };

        // Adjust Label for Filled/Underline
        if (!(decoration.border instanceof OutlineInputBorder)) {
            if (isFloating) {
                labelStyle.transform = `translate(0, 4px) scale(0.75)`;
            }
        }

        // 4. Input Element
        const inputStyle = {
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: (decoration.border instanceof OutlineInputBorder) ? '16px 12px' : '20px 0 8px 0',
            fontSize: '16px',
            color: 'inherit',
            width: '100%',
            fontFamily: 'inherit',
            height: '100%',
            cursor: this.widget.enabled ? 'text' : 'default'
        };

        const inputProps = {
            type: this._getInputType(),
            value: this.value,
            disabled: !this.widget.enabled,
            readOnly: this.widget.readOnly,
            placeholder: (isFloating && decoration.hintText) ? decoration.hintText : '',
            style: inputStyle,
            'aria-label': decoration.labelText
        };

        const events = {
            focus: () => this._handleFocus(),
            blur: () => this._handleBlur(),
            input: (e) => this._handleChange(e),
            click: () => this._handleTap()
        };

        // --- Children Construction ---
        const containerChildren = [];

        // Prefix
        if (decoration.prefixIcon || decoration.prefix) {
            containerChildren.push(this._buildAffix(decoration.prefixIcon || decoration.prefix, 'prefix'));
        }

        // Input
        containerChildren.push(new VNode({
            tag: this.widget.maxLines > 1 ? 'textarea' : 'input',
            props: inputProps,
            events: events
        }));

        // Label
        if (decoration.labelText) {
            containerChildren.push(new VNode({
                tag: 'label',
                props: { style: labelStyle },
                children: [decoration.labelText]
            }));
        }

        // Suffix
        if (decoration.suffixIcon || decoration.suffix) {
            containerChildren.push(this._buildAffix(decoration.suffixIcon || decoration.suffix, 'suffix'));
        }

        // Main Container Node
        const container = new VNode({
            tag: 'div',
            props: {
                className: 'fjs-input-decorator',
                style: containerStyle,
                tabIndex: -1
            },
            children: containerChildren,
            events: {
                click: () => {
                    // Focus handled by input, but this area click should also focus if needed.
                }
            }
        });

        // Helper / Error Text (Reserved Space)
        const errorText = decoration.errorText;
        const helperText = decoration.helperText;
        const hasFooterContent = !!(errorText || helperText);

        const footerColor = errorText ? errorColor.toCSSString() : '#757575';
        const footerText = errorText || helperText || ' ';

        console.error(`[TextField] Build: key=${this.widget.key}, hasError=${!!errorText}, errorText="${errorText}"`);

        const footer = new VNode({
            tag: 'div',
            props: {
                className: 'fjs-text-field-footer',
                style: {
                    fontSize: '12px',
                    color: footerColor,
                    marginTop: '4px',
                    marginLeft: (decoration.border instanceof OutlineInputBorder) ? '12px' : '0',
                    minHeight: '16px',
                    lineHeight: '1.5',
                    visibility: hasFooterContent ? 'visible' : 'hidden', // Hide but keep space
                    pointerEvents: 'none'
                }
            },
            children: [footerText]
        });

        return new VNode({
            tag: 'div',
            props: { style: wrapperStyle, key: this.widget.key },
            children: [container, footer]
        });
    }

    _getInputType() {
        if (this.widget.obscureText) return 'password';
        const map = {
            'text': 'text',
            'emailAddress': 'email',
            'number': 'number',
            'phone': 'tel',
            'url': 'url'
        };
        return map[this.widget.keyboardType] || 'text';
    }

    _buildAffix(content, type) {
        return new VNode({
            tag: 'div',
            props: {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    padding: type === 'prefix' ? '0 8px 0 12px' : '0 12px 0 8px',
                    color: '#757575'
                }
            },
            children: [typeof content === 'string' ? content : content]
        });
    }
}

export { TextField, TextFieldState };
