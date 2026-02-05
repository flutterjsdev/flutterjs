// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Row } from '../widgets/widgets.js';
import { GestureDetector } from './gesture_detector.js';
import { Container } from './container.js';
import { ToggleButtonsTheme } from './toggle_buttons_theme.js';
import { Theme } from './theme.js';
import { Color } from '../utils/color.js';
import { Colors } from './color.js';

export class ToggleButtons extends StatefulWidget {
    constructor({
        key,
        children = [],
        isSelected = [],
        onPressed,
        mouseCursor,
        textStyle,
        constraints,
        color,
        selectedColor,
        disabledColor,
        fillColor,
        focusColor,
        highlightColor,
        hoverColor,
        splashColor,
        borderColor,
        selectedBorderColor,
        disabledBorderColor,
        borderRadius,
        borderWidth,
        direction, // Axis.horizontal
        verticalDirection,
    } = {}) {
        super(key);
        this.children = children;
        this.isSelected = isSelected;
        this.onPressed = onPressed;
        this.color = color;
        this.selectedColor = selectedColor;
        this.fillColor = fillColor;
        this.borderColor = borderColor;
        this.selectedBorderColor = selectedBorderColor;
        this.borderRadius = borderRadius;
        this.borderWidth = borderWidth;
    }

    createState() {
        return new ToggleButtonsState();
    }
}

class ToggleButtonsState extends State {
    build(context) {
        const theme = ToggleButtonsTheme.of(context) || {};
        const appTheme = Theme.of(context);
        const colorScheme = appTheme.colorScheme;

        return new Row({
            children: this.widget.children.map((child, index) => {
                const isSelected = this.widget.isSelected[index];

                // Styles
                const defaultBorderColor = colorScheme.outline || '#79747E';
                const defaultSelectedBorderColor = colorScheme.outline || '#79747E'; // Usually same outline in M3 initially but can be varying

                const borderColor = isSelected
                    ? (this.widget.selectedBorderColor || theme.selectedBorderColor || defaultSelectedBorderColor)
                    : (this.widget.borderColor || theme.borderColor || defaultBorderColor);

                const backgroundColor = isSelected
                    ? (this.widget.fillColor || theme.fillColor || new Color(colorScheme.primary).withOpacity(0.12).toCSSString()) // Secondary containerish
                    : 'transparent';

                const textColor = isSelected
                    ? (this.widget.selectedColor || theme.selectedColor || colorScheme.primary || '#6750A4')
                    : (this.widget.color || theme.color || colorScheme.onSurfaceVariant || '#49454F');

                return new GestureDetector({
                    onTap: () => this.widget.onPressed?.(index),
                    child: new Container({
                        color: backgroundColor,
                        decoration: {
                            border: `1px solid ${borderColor}`,
                            // borderRadius logic (first, last, vs middle)
                        },
                        padding: { horizontal: 16, vertical: 8 }, // example
                        child: child // Apply textColor to child (IconTheme/TextStyle) usually done by providing DefaultTextStyle/IconTheme above this container or child
                    })
                });
            })
        });
    }
}
