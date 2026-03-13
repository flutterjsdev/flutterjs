// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { SizedBox, Center, GestureDetector } from '@flutterjs/material';
import { BorderRadius } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style checkbox.
 *
 * Uses a rounded checkbox style consistent with iOS HIG.
 */
export class CupertinoCheckbox extends StatefulWidget {
    constructor({
        key,
        value = false,
        onChanged,
        activeColor,
        checkColor,
        tristate = false,
        focusColor,
        focusNode,
        autofocus = false,
        shape,
        side,
        inactiveColor,
    } = {}) {
        super(key);
        Object.assign(this, {
            value, onChanged, activeColor, checkColor, tristate,
            focusColor, focusNode, autofocus, shape, side, inactiveColor,
        });
    }

    createState() { return new _CupertinoCheckboxState(); }
}

class _CupertinoCheckboxState extends State {
    build(context) {
        const theme = CupertinoTheme.of(context);
        const isChecked = this.widget.value === true;
        const isNull = this.widget.value === null;
        const enabled = this.widget.onChanged != null;
        const activeClr = this.widget.activeColor || theme.primaryColor;
        const checkClr = this.widget.checkColor || CupertinoColors.white;
        const inactiveClr = this.widget.inactiveColor || CupertinoColors.systemGrey3;

        const bgColor = isChecked || isNull ? activeClr : 'transparent';
        const borderColor = isChecked || isNull ? activeClr : inactiveClr;

        const checkmark = isChecked
            ? new Center({
                child: new Container({
                    style: {
                        fontSize: '14px',
                        color: checkClr,
                        fontWeight: '700',
                        lineHeight: '1',
                    },
                    child: new Container({ tag: 'span', children: ['✓'] }),
                }),
            })
            : isNull
                ? new Center({
                    child: new Container({
                        width: 8,
                        height: 2,
                        decoration: new BoxDecoration({ color: checkClr }),
                    }),
                })
                : new SizedBox();

        const box = new Container({
            width: 22,
            height: 22,
            decoration: new BoxDecoration({
                color: bgColor,
                borderRadius: BorderRadius.circular(4),
                border: { color: borderColor, width: 2 },
            }),
            style: { opacity: enabled ? 1 : 0.5 },
            child: checkmark,
        });

        if (!enabled) return box;

        return new GestureDetector({
            onTap: () => {
                if (this.widget.tristate) {
                    const nextValue = this.widget.value === true ? false
                        : this.widget.value === false ? null
                        : true;
                    this.widget.onChanged?.(nextValue);
                } else {
                    this.widget.onChanged?.(!this.widget.value);
                }
            },
            child: new Container({
                style: { cursor: 'pointer' },
                child: box,
            }),
        });
    }
}

/**
 * An iOS-style radio button.
 *
 * Displays a circular radio button matching iOS HIG.
 */
export class CupertinoRadio extends StatefulWidget {
    constructor({
        key,
        value,
        groupValue,
        onChanged,
        activeColor,
        inactiveColor,
        fillColor,
        focusColor,
        focusNode,
        autofocus = false,
        useCheckmarkStyle = false,
    } = {}) {
        super(key);
        Object.assign(this, {
            value, groupValue, onChanged, activeColor, inactiveColor,
            fillColor, focusColor, focusNode, autofocus, useCheckmarkStyle,
        });
    }

    createState() { return new _CupertinoRadioState(); }
}

class _CupertinoRadioState extends State {
    build(context) {
        const theme = CupertinoTheme.of(context);
        const isSelected = this.widget.value === this.widget.groupValue;
        const enabled = this.widget.onChanged != null;
        const activeClr = this.widget.activeColor || theme.primaryColor;
        const inactiveClr = this.widget.inactiveColor || CupertinoColors.systemGrey3;

        const outerColor = isSelected ? activeClr : inactiveClr;

        let innerWidget;
        if (isSelected) {
            if (this.widget.useCheckmarkStyle) {
                innerWidget = new Center({
                    child: new Container({
                        style: { fontSize: '14px', color: activeClr, fontWeight: '700' },
                        child: new Container({ tag: 'span', children: ['✓'] }),
                    }),
                });
            } else {
                innerWidget = new Center({
                    child: new Container({
                        width: 10,
                        height: 10,
                        decoration: new BoxDecoration({
                            color: activeClr,
                            borderRadius: BorderRadius.circular(5),
                        }),
                    }),
                });
            }
        } else {
            innerWidget = new SizedBox();
        }

        const radio = new Container({
            width: 22,
            height: 22,
            decoration: new BoxDecoration({
                borderRadius: BorderRadius.circular(11),
                border: { color: outerColor, width: 2 },
            }),
            style: { opacity: enabled ? 1 : 0.5 },
            child: innerWidget,
        });

        if (!enabled) return radio;

        return new GestureDetector({
            onTap: () => this.widget.onChanged?.(this.widget.value),
            child: new Container({
                style: { cursor: 'pointer' },
                child: radio,
            }),
        });
    }
}
