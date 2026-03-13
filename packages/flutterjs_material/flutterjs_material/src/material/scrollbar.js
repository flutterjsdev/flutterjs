// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { Theme } from './theme.js';

/**
 * A Material Design scrollbar.
 *
 * Wraps its child with a scrollbar that becomes visible when the content
 * is scrollable. Uses native browser scrollbar behavior for the web.
 */
export class Scrollbar extends StatelessWidget {
    constructor({
        key,
        child,
        controller,
        thumbVisibility,
        trackVisibility,
        thickness,
        radius,
        interactive,
        scrollbarOrientation,
    } = {}) {
        super(key);
        this.child = child;
        this.controller = controller;
        this.thumbVisibility = thumbVisibility;
        this.trackVisibility = trackVisibility;
        this.thickness = thickness;
        this.radius = radius;
        this.interactive = interactive;
        this.scrollbarOrientation = scrollbarOrientation;
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        const thumbColor = colorScheme.onSurfaceVariant || '#49454F';
        const trackColor = colorScheme.surfaceContainerHighest || '#E6E0E9';
        const effectiveThickness = this.thickness || 8.0;
        const effectiveRadius = this.radius || 4.0;

        // On the web, we use CSS to style the scrollbar
        // The Container wraps the child and applies scrollbar styling
        return new Container({
            style: {
                overflow: 'auto',
                scrollbarWidth: this.thumbVisibility === false ? 'none' : 'thin',
                scrollbarColor: `${thumbColor} ${trackColor}`,
            },
            child: this.child,
        });
    }
}
