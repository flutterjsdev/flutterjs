// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Text } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style text field.
 *
 * Implements the iOS text field with rounded rectangle border,
 * placeholder text, prefix/suffix support.
 */
export class CupertinoTextField extends StatelessWidget {
    constructor({
        key,
        controller,
        placeholder,
        prefix,
        suffix,
        decoration,
        padding,
        style,
        textAlign = 'start',
        readOnly = false,
        obscureText = false,
        maxLines = 1,
        minLines,
        maxLength,
        onChanged,
        onSubmitted,
        onTap,
        enabled = true,
        keyboardType,
        textInputAction,
        autofocus = false,
        clearButtonMode = 'never',
    } = {}) {
        super(key);
        Object.assign(this, {
            controller, placeholder, prefix, suffix, decoration,
            padding, style, textAlign, readOnly, obscureText,
            maxLines, minLines, maxLength, onChanged, onSubmitted,
            onTap, enabled, keyboardType, textInputAction,
            autofocus, clearButtonMode,
        });
    }

    build(context) {
        const theme = CupertinoTheme.of(context);
        const bgColor = CupertinoColors.systemBackground;
        const borderColor = CupertinoColors.systemGrey4;
        const placeholderColor = CupertinoColors.systemGrey2;

        return new Container({
            padding: this.padding || EdgeInsets.symmetric({ horizontal: 6, vertical: 8 }),
            decoration: this.decoration || new BoxDecoration({
                color: bgColor,
                borderRadius: BorderRadius.circular(5),
                border: { color: borderColor, width: 0.5 },
            }),
            style: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                fontSize: '17px',
                color: CupertinoColors.label,
                ...(this.style || {}),
            },
            child: new Text(
                this.controller?.text || this.placeholder || '',
                { style: {
                    color: (this.controller?.text) ? CupertinoColors.label : placeholderColor,
                }}
            ),
        });
    }
}
