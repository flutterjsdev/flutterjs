// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '@flutterjs/material';
import { Container, BoxDecoration } from '@flutterjs/material';
import { SizedBox } from '@flutterjs/material';
import { CupertinoColors } from './colors.js';

/**
 * An iOS-style activity indicator that spins clockwise.
 *
 * Uses CSS animation for the web platform.
 */
export class CupertinoActivityIndicator extends StatelessWidget {
    constructor({
        key,
        color,
        animating = true,
        radius = 10.0,
    } = {}) {
        super(key);
        this.color = color;
        this.animating = animating;
        this.radius = radius;
    }

    build(context) {
        const size = this.radius * 2;
        const color = this.color || CupertinoColors.systemGrey;

        // Use CSS spinner animation for the web
        return new Container({
            width: size,
            height: size,
            style: {
                width: `${size}px`,
                height: `${size}px`,
                border: `2px solid transparent`,
                borderTopColor: color,
                borderLeftColor: color,
                borderRadius: '50%',
                animation: this.animating ? 'cupertino-spin 1s linear infinite' : 'none',
            },
        });
    }
}

/**
 * CupertinoActivityIndicator CSS injection.
 * Call this once to add the spinner keyframes.
 */
export function injectCupertinoActivityIndicatorCSS() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('cupertino-activity-indicator-css')) return;

    const style = document.createElement('style');
    style.id = 'cupertino-activity-indicator-css';
    style.textContent = `
        @keyframes cupertino-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}
