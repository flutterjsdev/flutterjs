// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { Theme } from './theme.js';

/**
 * A Material Design panel that slides in horizontally from the edge of a Scaffold
 * to show navigation links in an application.
 */
export class Drawer extends StatelessWidget {
    constructor({
        key,
        backgroundColor,
        elevation,
        shadowColor,
        surfaceTintColor,
        shape,
        width,
        child,
        semanticLabel,
        clipBehavior
    } = {}) {
        super({ key });
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.shape = shape;
        this.width = width;
        this.child = child;
        this.semanticLabel = semanticLabel;
        this.clipBehavior = clipBehavior;
    }

    build(context) {
        // Note: Scaffold currently handles the drawer sliding animation, positioning,
        // and default sizing/shadows.
        // This widget mainly serves to provide the content and optional background styling overrides.

        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        return new Container({
            color: this.backgroundColor || colorScheme.surfaceContainerLow || '#F7F2FA',
            child: this.child
        });
    }
}
