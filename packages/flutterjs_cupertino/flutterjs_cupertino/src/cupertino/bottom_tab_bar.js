// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, Column, SizedBox } from '@flutterjs/material';
import { Text, GestureDetector, Icon, Icons } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style bottom tab bar. Typically used with CupertinoTabScaffold.
 *
 * Provides a bottom tab bar following iOS Human Interface Guidelines,
 * with icon + label tabs, active color highlight, and translucent background.
 */
export class CupertinoTabBar extends StatelessWidget {
    constructor({
        key,
        items = [],
        onTap,
        currentIndex = 0,
        backgroundColor,
        activeColor,
        inactiveColor,
        iconSize = 30.0,
        height = 50.0,
        border = true,
    } = {}) {
        super(key);
        this.items = items;
        this.onTap = onTap;
        this.currentIndex = currentIndex;
        this.backgroundColor = backgroundColor;
        this.activeColor = activeColor;
        this.inactiveColor = inactiveColor;
        this.iconSize = iconSize;
        this.height = height;
        this.border = border;
    }

    build(context) {
        const theme = CupertinoTheme.of(context);
        const bgColor = this.backgroundColor || theme.barBackgroundColor;
        const activeFg = this.activeColor || theme.primaryColor;
        const inactiveFg = this.inactiveColor || CupertinoColors.systemGrey;

        const tabs = this.items.map((item, index) => {
            const isActive = index === this.currentIndex;
            const color = isActive ? activeFg : inactiveFg;

            const tabContent = new Column({
                mainAxisSize: MainAxisSize.min,
                children: [
                    item.icon ? new Container({
                        style: { color },
                        child: item.activeIcon && isActive ? item.activeIcon : item.icon,
                    }) : new SizedBox(),
                    item.label ? new Text(item.label, {
                        style: { fontSize: 10, color },
                    }) : new SizedBox(),
                ],
            });

            return new GestureDetector({
                onTap: () => this.onTap?.(index),
                child: new Container({
                    style: { flex: 1, cursor: 'pointer' },
                    padding: EdgeInsets.only({ top: 4, bottom: 2 }),
                    child: tabContent,
                }),
            });
        });

        return new Container({
            height: this.height,
            decoration: new BoxDecoration({
                color: bgColor,
                border: this.border ? {
                    top: { color: CupertinoColors.separator, width: 0.5 },
                } : undefined,
            }),
            style: {
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
            },
            child: new Row({
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: tabs,
            }),
        });
    }
}

/**
 * Represents an item in a CupertinoTabBar.
 */
export class BottomNavigationBarItem {
    constructor({
        icon,
        activeIcon,
        label,
        backgroundColor,
        tooltip,
    } = {}) {
        this.icon = icon;
        this.activeIcon = activeIcon;
        this.label = label;
        this.backgroundColor = backgroundColor;
        this.tooltip = tooltip;
    }
}
