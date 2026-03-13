// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, SizedBox, Text, GestureDetector } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { CrossAxisAlignment } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style search text field.
 *
 * Displays a search field with a magnifying glass icon, placeholder text,
 * and an optional cancel button. Matches the iOS search bar appearance.
 */
export class CupertinoSearchTextField extends StatefulWidget {
    constructor({
        key,
        controller,
        onChanged,
        onSubmitted,
        onSuffixTap,
        placeholder = 'Search',
        style,
        decoration,
        backgroundColor,
        borderRadius,
        padding,
        itemColor,
        itemSize = 20.0,
        prefixIcon,
        prefixInsets,
        suffixIcon,
        suffixInsets,
        suffixMode = 'editing', // 'never', 'editing', 'notEditing', 'always'
        onTap,
        autofocus = false,
        autocorrect = true,
        enabled = true,
    } = {}) {
        super(key);
        Object.assign(this, {
            controller, onChanged, onSubmitted, onSuffixTap, placeholder,
            style, decoration, backgroundColor, borderRadius, padding,
            itemColor, itemSize, prefixIcon, prefixInsets, suffixIcon,
            suffixInsets, suffixMode, onTap, autofocus, autocorrect, enabled,
        });
    }

    createState() { return new _CupertinoSearchTextFieldState(); }
}

class _CupertinoSearchTextFieldState extends State {
    initState() {
        super.initState();
        this._text = this.widget.controller?.text || '';
    }

    build(context) {
        const bgColor = this.widget.backgroundColor || CupertinoColors.tertiarySystemFill;
        const radius = this.widget.borderRadius || BorderRadius.circular(8);
        const iconColor = this.widget.itemColor || CupertinoColors.systemGrey;

        const children = [];

        // Search icon
        children.push(new Container({
            padding: EdgeInsets.only({ left: 6, right: 4 }),
            child: new Text('🔍', { style: { fontSize: 14, color: iconColor } }),
        }));

        // Placeholder / text
        children.push(new Container({
            style: { flex: 1 },
            child: new Text(this._text || this.widget.placeholder, {
                style: {
                    fontSize: 17,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                    color: this._text ? CupertinoColors.label : CupertinoColors.systemGrey,
                },
            }),
        }));

        // Clear button
        const showSuffix = (this.widget.suffixMode === 'always') ||
            (this.widget.suffixMode === 'editing' && this._text.length > 0);

        if (showSuffix) {
            children.push(new GestureDetector({
                onTap: () => {
                    this.setState(() => { this._text = ''; });
                    this.widget.onSuffixTap?.();
                    this.widget.onChanged?.('');
                },
                child: new Container({
                    padding: EdgeInsets.only({ right: 6, left: 4 }),
                    child: new Text('✕', {
                        style: { fontSize: 14, color: iconColor, cursor: 'pointer' },
                    }),
                }),
            }));
        }

        const field = new Container({
            padding: this.widget.padding || EdgeInsets.symmetric({ horizontal: 4, vertical: 8 }),
            decoration: this.widget.decoration || new BoxDecoration({
                color: bgColor,
                borderRadius: radius,
            }),
            child: new Row({
                crossAxisAlignment: CrossAxisAlignment.center,
                children: children,
            }),
        });

        if (this.widget.onTap) {
            return new GestureDetector({
                onTap: this.widget.onTap,
                child: field,
            });
        }

        return field;
    }
}
