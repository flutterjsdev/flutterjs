// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Row, Column, SizedBox } from '@flutterjs/material';
import { Text, Center } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * An iOS-style navigation bar.
 *
 * The navigation bar is a toolbar that minimally consists of a widget,
 * normally a page title, in the middle of the toolbar.
 */
export class CupertinoNavigationBar extends StatelessWidget {
    constructor({
        key,
        leading,
        automaticallyImplyLeading = true,
        automaticallyImplyMiddle = true,
        previousPageTitle,
        middle,
        trailing,
        border = true,
        backgroundColor,
        brightness,
        padding,
        transitionBetweenRoutes = true,
        heroTag,
    } = {}) {
        super(key);
        Object.assign(this, {
            leading, automaticallyImplyLeading, automaticallyImplyMiddle,
            previousPageTitle, middle, trailing, border, backgroundColor,
            brightness, padding, transitionBetweenRoutes, heroTag,
        });
    }

    build(context) {
        const theme = CupertinoTheme.of(context);
        const bgColor = this.backgroundColor || theme.barBackgroundColor;

        const children = [];

        // Leading
        if (this.leading) {
            children.push(this.leading);
        } else {
            children.push(new SizedBox({ width: 44 }));
        }

        // Middle / Title
        if (this.middle) {
            children.push(new Container({
                style: { flex: 1, textAlign: 'center' },
                child: new Container({
                    style: theme.textTheme.navTitleTextStyle,
                    child: this.middle,
                }),
            }));
        } else {
            children.push(new Container({ style: { flex: 1 } }));
        }

        // Trailing
        if (this.trailing) {
            children.push(this.trailing);
        } else {
            children.push(new SizedBox({ width: 44 }));
        }

        return new Container({
            height: 44,
            padding: this.padding || EdgeInsets.symmetric({ horizontal: 8 }),
            decoration: new BoxDecoration({
                color: bgColor,
                border: this.border ? {
                    bottom: { color: CupertinoColors.separator, width: 0.5 },
                } : undefined,
            }),
            style: {
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
            },
            child: new Row({
                children: children,
            }),
        });
    }
}
