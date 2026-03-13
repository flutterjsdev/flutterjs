// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Stack, Positioned } from '../widgets/compoment/stack.js';
import { SizedBox } from '../widgets/compoment/sized_box.js';
import { Theme } from './theme.js';

/**
 * The part of a Material Design AppBar that expands, collapses, and stretches.
 *
 * Most commonly used in the [SliverAppBar.flexibleSpace] field, a flexible
 * space bar expands and contracts as the app scrolls so that the [AppBar]
 * reaches from the top of the app to the top of the scrolling contents of
 * the app. When using [SliverAppBar.flexibleSpace], the [SliverAppBar.expandedHeight]
 * must be large enough to accommodate the [SliverAppBar.flexibleSpace] widget.
 */
export class FlexibleSpaceBar extends StatelessWidget {
    constructor({
        key,
        title,
        background,
        centerTitle,
        titlePadding,
        collapseMode = 'parallax',
        stretchModes = ['zoomBackground'],
    } = {}) {
        super(key);
        this.title = title;
        this.background = background;
        this.centerTitle = centerTitle;
        this.titlePadding = titlePadding;
        this.collapseMode = collapseMode;
        this.stretchModes = stretchModes;
    }

    build(context) {
        const theme = Theme.of(context);

        const children = [];

        // Background
        if (this.background) {
            children.push(new Positioned({
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                child: this.background,
            }));
        }

        // Title
        if (this.title) {
            children.push(new Positioned({
                bottom: 16,
                left: this.centerTitle ? undefined : 72,
                right: this.centerTitle ? undefined : 16,
                child: this.title,
            }));
        }

        if (children.length === 0) {
            return new SizedBox();
        }

        return new Stack({
            clipBehavior: 'hardEdge',
            children: children,
        });
    }
}

/**
 * Collapse modes for FlexibleSpaceBar.
 */
export const CollapseMode = {
    parallax: 'parallax',
    pin: 'pin',
    none: 'none',
};

/**
 * Stretch modes for FlexibleSpaceBar.
 */
export const StretchMode = {
    zoomBackground: 'zoomBackground',
    blurBackground: 'blurBackground',
    fadeTitle: 'fadeTitle',
};
