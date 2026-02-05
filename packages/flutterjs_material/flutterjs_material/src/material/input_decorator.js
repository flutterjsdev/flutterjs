// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { OutlineInputBorder } from './input_border.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Color } from '../utils/color.js';

/**
 * InputDecoration - Describes the visual appearance of a TextField
 */
class InputDecoration {
    constructor({
        labelText = null,
        hintText = null,
        helperText = null,
        errorText = null,
        prefixIcon = null,
        suffixIcon = null,
        prefix = null,
        suffix = null,
        border = null,
        enabledBorder = null,
        focusedBorder = null,
        errorBorder = null,
        filled = false,
        fillColor = null,
        contentPadding = null, // EdgeInsets or {top, bottom...}
        isDense = false,
        counter = null,
        counterText = null,
        floatingLabelBehavior = 'auto', // 'auto', 'always', 'never'
        alignLabelWithHint = false,
        icon = null,
        labelStyle = null, // TextStyle
        floatingLabelStyle = null, // TextStyle
        helperStyle = null, // TextStyle
        hintStyle = null, // TextStyle
        errorStyle = null, // TextStyle
    } = {}) {
        this.labelText = labelText;
        this.hintText = hintText;
        this.helperText = helperText;
        this.errorText = errorText;
        this.prefixIcon = prefixIcon;
        this.suffixIcon = suffixIcon;
        this.prefix = prefix;
        this.suffix = suffix;

        // Borders
        this.border = border || new OutlineInputBorder();
        this.enabledBorder = enabledBorder || this.border;
        this.focusedBorder = focusedBorder || this.border;
        this.errorBorder = errorBorder || this.border;

        // Fill
        this.filled = filled;
        this.fillColor = fillColor; // Defaults handled by widget/theme

        // Padding
        if (contentPadding instanceof EdgeInsets) {
            this.contentPadding = contentPadding;
        } else if (contentPadding) {
            this.contentPadding = new EdgeInsets(contentPadding);
        } else {
            this.contentPadding = new EdgeInsets({ top: 12, bottom: 12, left: 16, right: 16 });
        }

        this.isDense = isDense;
        this.counter = counter;
        this.counterText = counterText;
        this.floatingLabelBehavior = floatingLabelBehavior;
        this.alignLabelWithHint = alignLabelWithHint;
        this.icon = icon;

        // Styles
        this.labelStyle = labelStyle;
        this.floatingLabelStyle = floatingLabelStyle;
        this.helperStyle = helperStyle;
        this.hintStyle = hintStyle;
        this.errorStyle = errorStyle;
    }

    copyWith(options = {}) {
        return new InputDecoration({
            labelText: options.labelText ?? this.labelText,
            hintText: options.hintText ?? this.hintText,
            helperText: options.helperText ?? this.helperText,
            errorText: options.errorText ?? this.errorText,
            prefixIcon: options.prefixIcon ?? this.prefixIcon,
            suffixIcon: options.suffixIcon ?? this.suffixIcon,
            prefix: options.prefix ?? this.prefix,
            suffix: options.suffix ?? this.suffix,
            border: options.border ?? this.border,
            enabledBorder: options.enabledBorder ?? this.enabledBorder,
            focusedBorder: options.focusedBorder ?? this.focusedBorder,
            errorBorder: options.errorBorder ?? this.errorBorder,
            filled: options.filled ?? this.filled,
            fillColor: options.fillColor ?? this.fillColor,
            contentPadding: options.contentPadding ?? this.contentPadding,
            isDense: options.isDense ?? this.isDense,
            counter: options.counter ?? this.counter,
            counterText: options.counterText ?? this.counterText,
            floatingLabelBehavior: options.floatingLabelBehavior ?? this.floatingLabelBehavior,
            alignLabelWithHint: options.alignLabelWithHint ?? this.alignLabelWithHint,
            icon: options.icon ?? this.icon,
            labelStyle: options.labelStyle ?? this.labelStyle,
            floatingLabelStyle: options.floatingLabelStyle ?? this.floatingLabelStyle,
            helperStyle: options.helperStyle ?? this.helperStyle,
            hintStyle: options.hintStyle ?? this.hintStyle,
            errorStyle: options.errorStyle ?? this.errorStyle
        });
    }
}

export { InputDecoration };
