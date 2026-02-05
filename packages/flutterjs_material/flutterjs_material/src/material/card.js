// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BorderRadius } from '../utils/border_radius.js';
import { CardTheme } from './card_theme.js';
import { Colors } from './color.js';

class Card extends StatelessWidget {
    constructor({
        key,
        color,
        shadowColor,
        surfaceTintColor,
        elevation,
        shape,
        borderOnForeground = true,
        margin,
        clipBehavior,
        child,
        semanticContainer = true
    } = {}) {
        super(key);
        this.color = color;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.elevation = elevation;
        this.shape = shape;
        this.borderOnForeground = borderOnForeground;
        this.margin = margin;
        this.clipBehavior = clipBehavior;
        this.child = child;
        this.semanticContainer = semanticContainer;
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;
        const cardTheme = theme.cardTheme || {}; // Assuming cardTheme exists in Theme

        // M3 Card Defaults
        // Elevated Card: Surface Container Low
        // Outlined Card: Surface
        // Filled Card: Surface Container Highest
        // We'll default to Elevated Card behavior as it's the standard "Card"
        const defaultColor = colorScheme.surfaceContainerLow || '#F7F2FA';
        const defaultShadowColor = colorScheme.shadow || '#000000';
        const defaultShape = { borderRadius: BorderRadius.circular(12) }; // M3 uses 12px

        const resolveColor = (value, defaultValue) => {
            if (value) {
                if (typeof value === 'string') return value;
                if (typeof value.toCSSString === 'function') return value.toCSSString();
                if (value.value) return '#' + value.value.toString(16).padStart(8, '0').slice(2);
            }
            return defaultValue;
        };

        const effectiveColor = resolveColor(this.color || cardTheme.color, defaultColor);
        const effectiveShadowColor = resolveColor(this.shadowColor || cardTheme.shadowColor, defaultShadowColor);

        const effectiveElevation = this.elevation ?? cardTheme.elevation ?? 1;
        const effectiveShape = this.shape || cardTheme.shape || defaultShape;
        const effectiveMargin = this.margin || cardTheme.margin || EdgeInsets.all(4);
        const effectiveClipBehavior = this.clipBehavior || cardTheme.clipBehavior;

        // Shadow simulation
        const boxShadow = effectiveElevation > 0 ? [{
            color: 'rgba(0,0,0,0.2)', // Simplification of shadowColor logic
            offsetX: 0,
            offsetY: 1,
            blurRadius: 3,
            spreadRadius: 1
        }] : [];

        // Apply style to Container
        const decoration = new BoxDecoration({
            color: effectiveColor,
            borderRadius: effectiveShape.borderRadius, // Assuming shape has borderRadius for now
            boxShadow: boxShadow
        });

        return new Container({
            margin: effectiveMargin,
            decoration: decoration,
            clipBehavior: effectiveClipBehavior,
            child: this.child
        });
    }
}

export { Card };
