// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { SizedBox } from '@flutterjs/material';
import { BorderRadius } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style slider.
 *
 * Used to select from a range of values.
 */
export class CupertinoSlider extends StatefulWidget {
    constructor({
        key,
        value = 0.0,
        onChanged,
        onChangeStart,
        onChangeEnd,
        min = 0.0,
        max = 1.0,
        divisions,
        activeColor,
        thumbColor,
    } = {}) {
        super(key);
        this.value = value;
        this.onChanged = onChanged;
        this.onChangeStart = onChangeStart;
        this.onChangeEnd = onChangeEnd;
        this.min = min;
        this.max = max;
        this.divisions = divisions;
        this.activeColor = activeColor;
        this.thumbColor = thumbColor || CupertinoColors.white;
    }

    createState() { return new _CupertinoSliderState(); }
}

class _CupertinoSliderState extends State {
    build(context) {
        const theme = CupertinoTheme.of(context);
        const activeClr = this.widget.activeColor || theme.primaryColor;
        const thumbClr = this.widget.thumbColor;
        const trackHeight = 2;
        const thumbSize = 28;
        const enabled = this.widget.onChanged != null;

        const fraction = (this.widget.value - this.widget.min) / (this.widget.max - this.widget.min);
        const percentage = `${(fraction * 100).toFixed(1)}%`;

        // Use native HTML range input for web interactivity
        return new Container({
            style: {
                display: 'flex',
                alignItems: 'center',
                height: `${thumbSize + 8}px`,
                opacity: enabled ? 1 : 0.5,
            },
            child: new Container({
                tag: 'input',
                style: {
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    width: '100%',
                    height: `${trackHeight}px`,
                    background: `linear-gradient(to right, ${activeClr} 0%, ${activeClr} ${percentage}, ${CupertinoColors.systemGrey4} ${percentage}, ${CupertinoColors.systemGrey4} 100%)`,
                    borderRadius: '1px',
                    outline: 'none',
                    cursor: enabled ? 'pointer' : 'default',
                },
                attrs: {
                    type: 'range',
                    min: this.widget.min,
                    max: this.widget.max,
                    value: this.widget.value,
                    step: this.widget.divisions
                        ? (this.widget.max - this.widget.min) / this.widget.divisions
                        : 'any',
                    disabled: !enabled,
                },
                events: enabled ? {
                    input: (e) => {
                        const newValue = parseFloat(e.target.value);
                        this.widget.onChanged?.(newValue);
                    },
                } : {},
            }),
        });
    }
}
