// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { TextField } from './text_field.js';
import { InputDecoration } from './input_decorator.js';
import { TextEditingController } from './text_editing_controller.js';
import { Form } from './form.js';
import { SizedBox } from '../widgets/compoment/sized_box.js';

/**
 * FormFieldValidator - Type for validation functions
 * @callback FormFieldValidator
 * @param {string} value - The current value
 * @returns {string|null} Error message or null if valid
 */

/**
 * AutovalidateMode - When to auto-validate the field
 */
const AutovalidateMode = {
    disabled: 'disabled',           // Never auto-validate
    always: 'always',              // Always validate on change
    onUserInteraction: 'onUserInteraction'  // Validate after first user interaction
};

/**
 * TextFormField - A TextField that integrates with Form for validation
 */
class TextFormField extends StatefulWidget {
    constructor({
        key = null,
        controller = null,
        initialValue = null,
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
        onTap = null,
        onEditingComplete = null,
        onFieldSubmitted = null,
        onSaved = null,
        validator = null,
        enabled = true,
        autovalidateMode = AutovalidateMode.disabled,
        readOnly = false,
        showCursor = true,
        buildCounter = null,
        scrollPadding = null,
        enableIMEPersonalizedLearning = true,
        cursorWidth = 2.0,
        cursorHeight = null,
        cursorRadius = null,
        cursorColor = null,
        keyboardAppearance = 'light',
        scrollPhysics = null,
        selectionEnabled = true,
        onTapOutside = null,
        restorationId = null
    } = {}) {
        super(key);

        // Validate initialValue and controller
        if (initialValue != null && controller != null) {
            throw new Error('Cannot provide both a controller and an initialValue');
        }

        this.controller = controller;
        this.initialValue = initialValue;
        this.decoration = decoration;
        this.keyboardType = keyboardType;
        this.textInputAction = textInputAction;
        this.textCapitalization = textCapitalization;
        this.style = style;
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
        this.onTap = onTap;
        this.onEditingComplete = onEditingComplete;
        this.onFieldSubmitted = onFieldSubmitted;
        this.onSaved = onSaved;
        this.validator = validator;
        this.enabled = enabled;
        this.autovalidateMode = autovalidateMode;
        this.readOnly = readOnly;
        this.showCursor = showCursor;
        this.buildCounter = buildCounter;
        this.scrollPadding = scrollPadding;
        this.enableIMEPersonalizedLearning = enableIMEPersonalizedLearning;
        this.cursorWidth = cursorWidth;
        this.cursorHeight = cursorHeight;
        this.cursorRadius = cursorRadius;
        this.cursorColor = cursorColor;
        this.keyboardAppearance = keyboardAppearance;
        this.scrollPhysics = scrollPhysics;
        this.selectionEnabled = selectionEnabled;
        this.onTapOutside = onTapOutside;
        this.restorationId = restorationId;
    }

    createState() {
        return new TextFormFieldState();
    }
}

/**
 * TextFormFieldState - State management for TextFormField
 */
class TextFormFieldState extends State {
    constructor() {
        super();
        this._controller = null;
        this._errorText = null;
        this._hasInteractedByUser = false;
        this._isValid = true;
    }

    initState() {
        super.initState();

        // Create controller if not provided
        if (this.widget.controller == null) {
            this._controller = new TextEditingController({
                text: this.widget.initialValue || ''
            });
        } else {
            this._controller = this.widget.controller;
        }

        // Register with Form if present
        this._registerWithForm();
    }

    didUpdateWidget(oldWidget) {
        super.didUpdateWidget(oldWidget);

        // Update controller if changed
        if (this.widget.controller !== oldWidget.controller) {
            if (oldWidget.controller == null && this._controller != null) {
                // Was using internal controller, dispose it
                this._controller.dispose();
            }

            if (this.widget.controller != null) {
                this._controller = this.widget.controller;
            } else {
                this._controller = new TextEditingController({
                    text: this.widget.initialValue || ''
                });
            }
        }
    }

    dispose() {
        // Only dispose controller if we created it
        if (this.widget.controller == null && this._controller != null) {
            this._controller.dispose();
        }
        super.dispose();
    }

    /**
     * Get current value of the field
     */
    get value() {
        return this._controller?.text || '';
    }

    /**
     * Validate the field manually
     * @returns {boolean} True if valid
     */
    validate() {
        console.error('[TextFormField] validate() called, value:', this.value);
        this.setState(() => {
            this._errorText = this._runValidator(this.value);
            this._isValid = this._errorText == null;
            this._hasInteractedByUser = true;
        });
        return this._isValid;
    }

    /**
     * Save the field value (calls onSaved callback)
     */
    save() {
        if (this.widget.onSaved != null) {
            this.widget.onSaved(this.value);
        }
    }

    /**
     * Reset the field to initial state
     */
    reset() {
        this.setState(() => {
            this._controller.text = this.widget.initialValue || '';
            this._errorText = null;
            this._hasInteractedByUser = false;
            this._isValid = true;
        });
    }

    /**
     * Run the validator function
     * @private
     */
    _runValidator(value) {
        if (this.widget.validator == null) {
            return null;
        }
        return this.widget.validator(value);
    }

    /**
     * Handle value changes
     * @private
     */
    _handleChange(value) {
        // Check if we should auto-validate
        const shouldAutoValidate =
            this.widget.autovalidateMode === AutovalidateMode.always ||
            (this.widget.autovalidateMode === AutovalidateMode.onUserInteraction &&
                this._hasInteractedByUser);

        if (shouldAutoValidate) {
            this.setState(() => {
                this._errorText = this._runValidator(value);
                this._isValid = this._errorText == null;
            });
        }

        if (!this._hasInteractedByUser) {
            this.setState(() => {
                this._hasInteractedByUser = true;
            });
        }

        // Call user's onChange
        if (this.widget.onChange != null) {
            this.widget.onChange(value);
        }
    }

    /**
     * Handle field submission
     * @private
     */
    _handleSubmitted(value) {
        // Always validate on submit
        this.validate();

        if (this.widget.onFieldSubmitted != null) {
            this.widget.onFieldSubmitted(value);
        }
    }

    /**
     * Register this field with the parent Form (if present)
     * @private
     */
    _registerWithForm() {
        if (this._form) {
            this._form._unregister(this);
        }

        // We need to wait for context to be available. 
        // In initState/didChangeDependencies context is available.
        // However, Form.of(context) requires context.
        this._form = Form.of(this.context);

        if (this._form) {
            console.error('[TextFormField] Found form, registering');
            this._form._register(this);
        } else {
            console.error('[TextFormField] Form not found in context');
        }
    }

    didChangeDependencies() {
        super.didChangeDependencies();
        this._registerWithForm();
    }

    dispose() {
        if (this._form) {
            this._form._unregister(this);
        }
        // Only dispose controller if we created it
        if (this.widget.controller == null && this._controller != null) {
            this._controller.dispose();
        }
        super.dispose();
    }

    build(context) {
        // Merge error text from validation into decoration
        let effectiveDecoration = this.widget.decoration || new InputDecoration();

        if (this._errorText != null) {
            effectiveDecoration = effectiveDecoration.copyWith({
                errorText: this._errorText
            });
        }

        // Build the underlying TextField
        const textField = new TextField({
            key: this.widget.key,
            controller: this._controller,
            decoration: effectiveDecoration,
            keyboardType: this.widget.keyboardType,
            textInputAction: this.widget.textInputAction,
            textCapitalization: this.widget.textCapitalization,
            style: this.widget.style,
            textAlign: this.widget.textAlign,
            textDirection: this.widget.textDirection,
            autofocus: this.widget.autofocus,
            obscureText: this.widget.obscureText,
            autocorrect: this.widget.autocorrect,
            enableSuggestions: this.widget.enableSuggestions,
            maxLines: this.widget.maxLines,
            minLines: this.widget.minLines,
            expands: this.widget.expands,
            maxLength: this.widget.maxLength,
            onChange: (value) => this._handleChange(value),
            onTap: this.widget.onTap,
            onEditingComplete: this.widget.onEditingComplete,
            onSubmitted: (value) => this._handleSubmitted(value),
            enabled: this.widget.enabled,
            readOnly: this.widget.readOnly,
            showCursor: this.widget.showCursor,
            buildCounter: this.widget.buildCounter,
            scrollPadding: this.widget.scrollPadding,
            enableIMEPersonalizedLearning: this.widget.enableIMEPersonalizedLearning,
            cursorWidth: this.widget.cursorWidth,
            cursorHeight: this.widget.cursorHeight,
            cursorRadius: this.widget.cursorRadius,
            cursorColor: this.widget.cursorColor,
            keyboardAppearance: this.widget.keyboardAppearance,
            scrollPhysics: this.widget.scrollPhysics,
            selectionEnabled: this.widget.selectionEnabled,
            onTapOutside: this.widget.onTapOutside
        });

        // ✅ FIXED: Return the widget instance directly, don't call .build()
        //Return the TextField widget - the runtime will handle building it
        return new SizedBox({
            width: Infinity,
            child: textField
        });
    }
}

/**
 * FormFieldSetter - Type for onSaved callback
 * @callback FormFieldSetter
 * @param {string} value - The value to save
 */

export {
    TextFormField,
    TextFormFieldState,
    AutovalidateMode
};
