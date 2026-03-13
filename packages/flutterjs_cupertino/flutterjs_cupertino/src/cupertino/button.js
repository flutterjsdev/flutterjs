// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { GestureDetector } from '@flutterjs/material';
import { Text, Center, SizedBox, Opacity } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style button.
 *
 * Takes in a text or an icon that fades out and in on touch.
 * May optionally have a background.
 */
export class CupertinoButton extends StatefulWidget {
    constructor({
        key,
        child,
        padding,
        color,
        disabledColor,
        minSize = 44.0,
        pressedOpacity = 0.4,
        borderRadius,
        alignment = 'center',
        onPressed,
    } = {}) {
        super(key);
        this.child = child;
        this.padding = padding;
        this.color = color;
        this.disabledColor = disabledColor || CupertinoColors.quaternarySystemFill;
        this.minSize = minSize;
        this.pressedOpacity = pressedOpacity;
        this.borderRadius = borderRadius || BorderRadius.all(8.0);
        this.alignment = alignment;
        this.onPressed = onPressed;
    }

    /** Creates a filled CupertinoButton */
    static filled({
        key, child, padding, color, disabledColor,
        minSize = 44.0, pressedOpacity = 0.4, borderRadius,
        alignment = 'center', onPressed,
    } = {}) {
        return new CupertinoButton({
            key, child, padding,
            color: color || CupertinoColors.activeBlue,
            disabledColor, minSize, pressedOpacity, borderRadius,
            alignment, onPressed,
        });
    }

    get enabled() { return this.onPressed != null; }

    createState() { return new _CupertinoButtonState(); }
}

class _CupertinoButtonState extends State {
    constructor() { super(); this._pressed = false; }

    build(context) {
        const theme = CupertinoTheme.of(context);
        const enabled = this.widget.enabled;
        const bgColor = !enabled
            ? (this.widget.color ? this.widget.disabledColor : null)
            : this.widget.color;
        const fgColor = this.widget.color
            ? CupertinoColors.white
            : theme.primaryColor;

        const opacity = !enabled ? 0.4 : (this._pressed ? (this.widget.pressedOpacity || 0.4) : 1.0);

        const button = new Container({
            padding: this.widget.padding || EdgeInsets.all(16),
            constraints: { minWidth: this.widget.minSize, minHeight: this.widget.minSize },
            decoration: bgColor ? new BoxDecoration({
                color: bgColor,
                borderRadius: this.widget.borderRadius,
            }) : undefined,
            alignment: this.widget.alignment,
            child: new Container({
                style: { color: fgColor },
                child: this.widget.child,
            }),
        });

        const opacityWrapped = new Opacity({ opacity, child: button });

        if (!enabled) return opacityWrapped;

        return new GestureDetector({
            onTapDown: () => this.setState(() => { this._pressed = true; }),
            onTapUp: () => { this.setState(() => { this._pressed = false; }); this.widget.onPressed?.(); },
            onTapCancel: () => this.setState(() => { this._pressed = false; }),
            child: opacityWrapped,
        });
    }
}
