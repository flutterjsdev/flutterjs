// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Column, SizedBox, Text, Center, GestureDetector } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';

/**
 * An iOS-style picker.
 *
 * Simulates the iOS drum-roll picker using a scrollable list.
 * Displays items in a wheel with a highlight rectangle for the selection.
 */
export class CupertinoPicker extends StatefulWidget {
    constructor({
        key,
        diameterRatio = 1.07,
        backgroundColor,
        offAxisFraction = 0.0,
        useMagnifier = false,
        magnification = 1.0,
        scrollController,
        squeeze = 1.45,
        itemExtent = 32.0,
        onSelectedItemChanged,
        children = [],
        selectionOverlay,
        looping = false,
    } = {}) {
        super(key);
        Object.assign(this, {
            diameterRatio, backgroundColor, offAxisFraction,
            useMagnifier, magnification, scrollController, squeeze,
            itemExtent, onSelectedItemChanged, children, selectionOverlay, looping,
        });
    }

    createState() { return new _CupertinoPickerState(); }
}

class _CupertinoPickerState extends State {
    initState() {
        super.initState();
        this._selectedIndex = 0;
    }

    build(context) {
        const bgColor = this.widget.backgroundColor || CupertinoColors.systemBackground;
        const itemHeight = this.widget.itemExtent;
        const visibleItems = 5;
        const totalHeight = itemHeight * visibleItems;

        const items = this.widget.children.map((child, index) => {
            const isSelected = index === this._selectedIndex;
            return new GestureDetector({
                onTap: () => {
                    this.setState(() => { this._selectedIndex = index; });
                    this.widget.onSelectedItemChanged?.(index);
                },
                child: new Container({
                    height: itemHeight,
                    child: new Center({
                        child: new Container({
                            style: {
                                fontSize: isSelected ? '21px' : '17px',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                                color: isSelected ? CupertinoColors.label : CupertinoColors.systemGrey,
                                fontWeight: isSelected ? '500' : '400',
                                cursor: 'pointer',
                            },
                            child: child,
                        }),
                    }),
                }),
            });
        });

        return new Container({
            height: totalHeight,
            decoration: new BoxDecoration({ color: bgColor }),
            style: { overflow: 'auto', position: 'relative' },
            child: new Column({
                mainAxisSize: MainAxisSize.min,
                children: items,
            }),
        });
    }
}
