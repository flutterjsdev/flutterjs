// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Column, SizedBox } from '@flutterjs/material';
import { EdgeInsets } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * Implements a page layout with a navigation bar at the top.
 *
 * The scaffold lays out the navigation bar on top and the content below.
 */
export class CupertinoPageScaffold extends StatelessWidget {
    constructor({
        key,
        navigationBar,
        backgroundColor,
        resizeToAvoidBottomInset = true,
        child,
    } = {}) {
        super(key);
        this.navigationBar = navigationBar;
        this.backgroundColor = backgroundColor;
        this.resizeToAvoidBottomInset = resizeToAvoidBottomInset;
        this.child = child;
    }

    build(context) {
        const theme = CupertinoTheme.of(context);
        const bgColor = this.backgroundColor || theme.scaffoldBackgroundColor;

        const children = [];

        if (this.navigationBar) {
            children.push(this.navigationBar);
        }

        if (this.child) {
            children.push(new Container({
                style: { flex: 1, overflow: 'auto' },
                child: this.child,
            }));
        }

        return new Container({
            decoration: new BoxDecoration({ color: bgColor }),
            style: {
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
            },
            child: new Column({ children }),
        });
    }
}
