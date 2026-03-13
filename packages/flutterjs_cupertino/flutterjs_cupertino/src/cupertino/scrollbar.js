// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';

/**
 * An iOS-style scrollbar.
 *
 * Uses CSS scrollbar styling for the web platform to match
 * the thin, rounded iOS scrollbar appearance.
 */
export class CupertinoScrollbar extends StatelessWidget {
    constructor({
        key,
        child,
        controller,
        thumbVisibility,
        thickness = 3.0,
        thicknessWhileDragging = 8.0,
        radius,
        radiusWhileDragging,
        scrollbarOrientation,
    } = {}) {
        super(key);
        Object.assign(this, {
            child, controller, thumbVisibility, thickness,
            thicknessWhileDragging, radius, radiusWhileDragging,
            scrollbarOrientation,
        });
    }

    build(context) {
        return new Container({
            style: {
                overflow: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: `${CupertinoColors.systemGrey3} transparent`,
            },
            child: this.child,
        });
    }
}
