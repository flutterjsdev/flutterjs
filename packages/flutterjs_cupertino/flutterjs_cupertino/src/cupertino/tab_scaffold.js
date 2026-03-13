// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { Column, SizedBox, Text, GestureDetector, Center } from '@flutterjs/material';
import { EdgeInsets, BorderRadius } from '@flutterjs/material';
import { MainAxisSize } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';
import { CupertinoTheme } from './theme.js';

/**
 * CupertinoTabScaffold — provides a tab-based navigation structure.
 *
 * Combines a CupertinoTabBar with a tab body that switches based
 * on the selected tab index.
 */
export class CupertinoTabScaffold extends StatefulWidget {
    constructor({
        key,
        tabBar,
        tabBuilder,
        controller,
        backgroundColor,
        resizeToAvoidBottomInset = true,
    } = {}) {
        super(key);
        this.tabBar = tabBar;
        this.tabBuilder = tabBuilder;
        this.controller = controller;
        this.backgroundColor = backgroundColor;
        this.resizeToAvoidBottomInset = resizeToAvoidBottomInset;
    }

    createState() { return new _CupertinoTabScaffoldState(); }
}

class _CupertinoTabScaffoldState extends State {
    initState() {
        super.initState();
        this._currentIndex = this.widget.controller?.index || 0;
    }

    build(context) {
        const theme = CupertinoTheme.of(context);
        const bgColor = this.widget.backgroundColor || theme.scaffoldBackgroundColor;

        // Clone tab bar with our onTap handler
        const tabBar = this.widget.tabBar;
        const originalOnTap = tabBar.onTap;

        // Build tab body
        const tabBody = this.widget.tabBuilder
            ? this.widget.tabBuilder(context, this._currentIndex)
            : new SizedBox();

        // Create the tab bar with updated index and tap handler
        const updatedTabBar = new tabBar.constructor({
            ...tabBar,
            currentIndex: this._currentIndex,
            onTap: (index) => {
                this.setState(() => { this._currentIndex = index; });
                originalOnTap?.(index);
            },
        });

        return new Container({
            decoration: new BoxDecoration({ color: bgColor }),
            style: {
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
            },
            child: new Column({
                children: [
                    new Container({
                        style: { flex: 1, overflow: 'auto' },
                        child: tabBody,
                    }),
                    updatedTabBar,
                ],
            }),
        });
    }
}

/**
 * CupertinoTabView — one tab's navigation view within a CupertinoTabScaffold.
 */
export class CupertinoTabView extends StatelessWidget {
    constructor({
        key,
        builder,
        navigatorKey,
        defaultTitle,
        routes,
        onGenerateRoute,
        onUnknownRoute,
    } = {}) {
        super(key);
        this.builder = builder;
        this.navigatorKey = navigatorKey;
        this.defaultTitle = defaultTitle;
        this.routes = routes;
        this.onGenerateRoute = onGenerateRoute;
        this.onUnknownRoute = onUnknownRoute;
    }

    build(context) {
        if (this.builder) {
            return this.builder(context);
        }
        return new SizedBox();
    }
}

// Import StatelessWidget for CupertinoTabView
import { StatelessWidget } from '@flutterjs/material';
