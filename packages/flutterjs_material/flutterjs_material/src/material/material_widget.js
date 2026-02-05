// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { BorderRadius } from '../utils/border_radius.js';
import { Colors } from './color.js';

export const MaterialType = {
    canvas: 'canvas',
    card: 'card',
    circle: 'circle',
    button: 'button',
    transparency: 'transparency'
};

export class Material extends StatelessWidget {
    constructor({
        key,
        type = MaterialType.canvas,
        elevation = 0.0,
        color,
        shadowColor,
        surfaceTintColor,
        textStyle,
        borderRadius,
        shape,
        borderOnForeground = true,
        clipBehavior,
        animationDuration,
        child,
    } = {}) {
        super(key);
        this.type = type;
        this.elevation = elevation;
        this.color = color;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.textStyle = textStyle;
        this.borderRadius = borderRadius;
        this.shape = shape;
        this.borderOnForeground = borderOnForeground;
        this.clipBehavior = clipBehavior;
        this.animationDuration = animationDuration;
        this.child = child;
    }

    build(context) {
        // Material implementation primarily manages:
        // 1. Background Color
        // 2. Elevation (Box Shadow)
        // 3. Shape/BorderRadius
        // 4. Clipping

        let backgroundColor = this.color;
        // Default colors based on type
        if (!backgroundColor) {
            if (this.type === MaterialType.canvas) backgroundColor = Colors.white; // Simplified default
            else if (this.type === MaterialType.card) backgroundColor = Colors.white;
            else if (this.type === MaterialType.transparency) backgroundColor = Colors.transparent;
            // ...
        }

        // Shadow
        const boxShadow = this.elevation > 0 ? [{
            color: 'rgba(0,0,0,0.2)', // simplified
            blurRadius: this.elevation * 2, // approximation
            offset: { x: 0, y: this.elevation }
        }] : [];

        // Shape/BorderRadius
        // Prioritize shape, then borderRadius, then type defaults
        let effectiveBorderRadius = this.borderRadius;
        if (this.type === MaterialType.circle) {
            effectiveBorderRadius = BorderRadius.circular(9999); // max
        }

        return new Container({
            child: this.child,
            clipBehavior: this.clipBehavior,
            decoration: new BoxDecoration({
                color: backgroundColor,
                borderRadius: effectiveBorderRadius,
                boxShadow: boxShadow
            })
            // TextStyle should be handled by DefaultTextStyle wrapping child ideally
        });
    }
}
