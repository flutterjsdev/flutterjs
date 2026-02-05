// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';

export class FlutterLogo extends StatelessWidget {
    constructor({
        key,
        size = 24.0,
        colors, // Ignored mostly in simple web version unless we SVG manipulate
        textColor,
        style,
        duration,
        curve,
    } = {}) {
        super(key);
        this.size = size;
        this.colors = colors;
        this.textColor = textColor;
        this.style = style;
        this.duration = duration;
        this.curve = curve;
    }

    build(context) {
        // Just return the Flutter Icon/Logo SVG or Image
        // Using a public URL or base64 placeholder for the logo
        const flutterLogoUrl = "https://storage.googleapis.com/cms-storage-bucket/0dbfcc7a59cd1cf16282.png"; // Official Flutter Logo

        return new Container({
            width: this.size,
            height: this.size,
            decoration: {
                image: {
                    image: `url("${flutterLogoUrl}")`,
                    fit: 'contain'
                }
            }
        });
    }
}
