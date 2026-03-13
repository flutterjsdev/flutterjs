// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, Column, SizedBox, Center, Text, GestureDetector } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style segmented control.
 *
 * Displays a horizontal set of segments. Only one can be selected at a time.
 * Similar to UISegmentedControl in UIKit.
 */
export class CupertinoSegmentedControl extends StatefulWidget {
    constructor({
        key,
        children = {},  // Map<T, Widget>
        onValueChanged,
        groupValue,
        unselectedColor,
        selectedColor,
        borderColor,
        pressedColor,
        padding,
    } = {}) {
        super(key);
        this.children = children;
        this.onValueChanged = onValueChanged;
        this.groupValue = groupValue;
        this.unselectedColor = unselectedColor || CupertinoColors.white;
        this.selectedColor = selectedColor;
        this.borderColor = borderColor;
        this.pressedColor = pressedColor;
        this.padding = padding;
    }

    createState() { return new _CupertinoSegmentedControlState(); }
}

class _CupertinoSegmentedControlState extends State {
    build(context) {
        const theme = CupertinoTheme.of(context);
        const selectedBg = this.widget.selectedColor || theme.primaryColor;
        const unselectedBg = this.widget.unselectedColor;
        const borderClr = this.widget.borderColor || theme.primaryColor;
        const entries = Object.entries(this.widget.children);

        const segments = entries.map(([key, child], index) => {
            const isSelected = key === String(this.widget.groupValue);
            const isFirst = index === 0;
            const isLast = index === entries.length - 1;

            let borderRadius;
            if (isFirst && isLast) {
                borderRadius = BorderRadius.circular(8);
            } else if (isFirst) {
                borderRadius = BorderRadius.only({ topLeft: 8, bottomLeft: 8 });
            } else if (isLast) {
                borderRadius = BorderRadius.only({ topRight: 8, bottomRight: 8 });
            } else {
                borderRadius = BorderRadius.all(0);
            }

            const segment = new Container({
                padding: this.widget.padding || EdgeInsets.symmetric({ horizontal: 16, vertical: 6 }),
                decoration: new BoxDecoration({
                    color: isSelected ? selectedBg : unselectedBg,
                    borderRadius: borderRadius,
                }),
                child: new Center({
                    child: new Container({
                        style: { color: isSelected ? CupertinoColors.white : selectedBg },
                        child: child,
                    }),
                }),
            });

            return new GestureDetector({
                onTap: () => this.widget.onValueChanged?.(key),
                child: segment,
            });
        });

        return new Container({
            decoration: new BoxDecoration({
                borderRadius: BorderRadius.circular(8),
                border: { color: borderClr, width: 1 },
            }),
            child: new Row({
                mainAxisSize: MainAxisSize.min,
                children: segments,
            }),
        });
    }
}

/**
 * CupertinoSlidingSegmentedControl — iOS 13+ style segmented control
 * with a sliding background pill.
 */
export class CupertinoSlidingSegmentedControl extends StatefulWidget {
    constructor({
        key,
        children = {},
        onValueChanged,
        groupValue,
        thumbColor,
        backgroundColor,
        padding,
    } = {}) {
        super(key);
        this.children = children;
        this.onValueChanged = onValueChanged;
        this.groupValue = groupValue;
        this.thumbColor = thumbColor || CupertinoColors.white;
        this.backgroundColor = backgroundColor || CupertinoColors.systemGrey5;
        this.padding = padding;
    }

    createState() { return new _CupertinoSlidingSegmentedControlState(); }
}

class _CupertinoSlidingSegmentedControlState extends State {
    build(context) {
        const entries = Object.entries(this.widget.children);

        const segments = entries.map(([key, child]) => {
            const isSelected = key === String(this.widget.groupValue);

            return new GestureDetector({
                onTap: () => this.widget.onValueChanged?.(key),
                child: new Container({
                    padding: this.widget.padding || EdgeInsets.symmetric({ horizontal: 16, vertical: 6 }),
                    decoration: isSelected ? new BoxDecoration({
                        color: this.widget.thumbColor,
                        borderRadius: BorderRadius.circular(7),
                        boxShadow: [
                            { color: 'rgba(0,0,0,0.04)', offsetX: 0, offsetY: 3, blurRadius: 8 },
                            { color: 'rgba(0,0,0,0.12)', offsetX: 0, offsetY: 3, blurRadius: 1 },
                        ],
                    }) : undefined,
                    child: new Center({ child }),
                }),
            });
        });

        return new Container({
            padding: EdgeInsets.all(2),
            decoration: new BoxDecoration({
                color: this.widget.backgroundColor,
                borderRadius: BorderRadius.circular(9),
            }),
            child: new Row({
                mainAxisSize: MainAxisSize.min,
                children: segments,
            }),
        });
    }
}
