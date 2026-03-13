// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { Text } from './text.js';
import { Theme } from './theme.js';

/**
 * A run of selectable text with a single style.
 *
 * The SelectableText widget displays a string of text that the user can
 * select and copy. The string might break across multiple lines or might
 * all be displayed on the same line depending on the layout constraints.
 */
export class SelectableText extends StatelessWidget {
    constructor(data, {
        key,
        style,
        textAlign,
        textDirection,
        maxLines,
        minLines,
        onTap,
        showCursor = false,
        cursorColor,
        cursorWidth = 2.0,
        selectionColor,
        enableInteractiveSelection = true,
        semanticsLabel,
    } = {}) {
        super(key);
        this.data = data;
        this.style = style;
        this.textAlign = textAlign;
        this.textDirection = textDirection;
        this.maxLines = maxLines;
        this.minLines = minLines;
        this.onTap = onTap;
        this.showCursor = showCursor;
        this.cursorColor = cursorColor;
        this.cursorWidth = cursorWidth;
        this.selectionColor = selectionColor;
        this.enableInteractiveSelection = enableInteractiveSelection;
        this.semanticsLabel = semanticsLabel;
    }

    build(context) {
        const theme = Theme.of(context);

        // In a web context, selectable text is simply text with user-select enabled
        // Unlike the default Text widget which may disable selection
        return new Container({
            style: {
                userSelect: this.enableInteractiveSelection ? 'text' : 'none',
                cursor: this.enableInteractiveSelection ? 'text' : 'default',
                textAlign: this.textAlign || 'start',
                direction: this.textDirection,
                ...(this.maxLines ? {
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: this.maxLines,
                    WebkitBoxOrient: 'vertical',
                } : {}),
            },
            child: new Text(this.data, {
                style: this.style,
                textAlign: this.textAlign,
                textDirection: this.textDirection,
                maxLines: this.maxLines,
            }),
        });
    }
}
