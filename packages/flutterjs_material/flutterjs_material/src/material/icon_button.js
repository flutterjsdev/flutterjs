// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { GestureDetector } from './gesture_detector.js';
import { Container } from './container.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Center } from '../widgets/compoment/center.js';
import { IconTheme } from './icon_theme.js';
import { IconThemeData } from './icon.js';
import { Theme } from './theme.js';

/**
 * IconButton - A Material Design icon button.
 * 
 * An icon button is a picture printed on a Material widget that reacts to touches
 * by filling with color (ink).
 */
export class IconButton extends StatelessWidget {
    constructor({
        key,
        iconSize = null,
        padding = null,
        alignment,
        icon,
        color,
        focusColor,
        hoverColor,
        highlightColor,
        splashColor,
        disabledColor,
        onPressed,
        mouseCursor,
        focusNode,
        autofocus = false,
        tooltip,
        enableFeedback = true,
        constraints,
        style = null, // Added for completeness, though specific props usually take precedence
    } = {}) {
        super({ key });
        this.iconSize = iconSize;
        this.padding = padding;
        this.alignment = alignment;
        this.icon = icon;
        this.color = color;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.highlightColor = highlightColor;
        this.splashColor = splashColor;
        this.disabledColor = disabledColor;
        this.onPressed = onPressed;
        this.mouseCursor = mouseCursor;
        this.focusNode = focusNode;
        this.autofocus = autofocus;
        this.tooltip = tooltip;
        this.enableFeedback = enableFeedback;
        this.constraints = constraints;
        this.style = style;
    }

    build(context) {
        const theme = Theme.of(context);
        const iconButtonTheme = theme.iconButtonTheme?.style || {};

        // Retrieve parent theme to inherit properties (e.g. from AppBar)
        const parentIconTheme = IconTheme.of(context) || new IconThemeData({ size: 24.0, color: null });

        // Resolve params
        // M3 default size 24.0, padding 8.0

        // Theme could provide style.iconSize, style.padding if we map it
        // Simpler: just check style overrides if we implement ButtonStyle logic, 
        // but IconButton is weird as it has explicit props too.
        // Explicit props > Theme > Default

        const effectiveSize = this.iconSize ?? iconButtonTheme.iconSize ?? parentIconTheme.size ?? 24.0;
        const effectivePadding = this.padding ?? iconButtonTheme.padding ?? EdgeInsets.all(8.0);

        // Color resolution
        // 1. this.color
        // 2. iconButtonTheme.foregroundColor
        // 3. parentIconTheme.color
        // 4. Default?

        // Note: IconButton usually inherits color from IconTheme unless specified.

        let effectiveColor = this.color;
        if (!effectiveColor && iconButtonTheme.foregroundColor) {
            // Extract if it's a simple color or MaterialStateProperty (not fully supported here yet)
            effectiveColor = iconButtonTheme.foregroundColor;
        }
        if (!effectiveColor) {
            effectiveColor = parentIconTheme.color;
        }

        // Merge with IconButton specific overrides
        const mergedThemeData = parentIconTheme.copyWith({
            color: effectiveColor,
            size: effectiveSize
        });

        return new GestureDetector({
            onTap: this.onPressed,
            child: new Container({
                padding: effectivePadding,
                child: new Center({
                    child: new IconTheme({
                        data: mergedThemeData,
                        child: this.icon
                    })
                })
            })
        });
    }
}
