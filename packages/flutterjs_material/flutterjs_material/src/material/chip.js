// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row, SizedBox } from '../widgets/widgets.js';
import { Icon, Icons } from './icon.js';
import { GestureDetector } from './gesture_detector.js';
import { Colors } from './color.js';
import { BorderRadius } from '../utils/border_radius.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { MainAxisSize } from '../utils/utils.js';
import { Theme } from './theme.js';

export class Chip extends StatelessWidget {
    constructor({
        key,
        avatar,
        label,
        labelStyle,
        labelPadding,
        deleteIcon,
        onDeleted,
        deleteIconColor,
        useDeleteButtonTooltip = true,
        deleteButtonTooltipMessage,
        side,
        shape,
        clipBehavior = 'none',
        focusNode,
        autofocus = false,
        backgroundColor,
        padding,
        visualDensity,
        materialTapTargetSize,
        elevation,
        shadowColor,
        surfaceTintColor,
        iconTheme,
    } = {}) {
        super(key);
        this.avatar = avatar;
        this.label = label;
        this.labelStyle = labelStyle;
        this.labelPadding = labelPadding;
        this.deleteIcon = deleteIcon;
        this.onDeleted = onDeleted;
        this.deleteIconColor = deleteIconColor;
        this.backgroundColor = backgroundColor;
        this.padding = padding;
        this.elevation = elevation;
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        // M3 Chip defaults
        // InputChip/AssistChip usually: surfaceContainerLow or explicit colors
        // Collection/Filter: secondaryContainer when selected
        // We'll treat generic Chip as FilterChip-like or AssistChip
        // Default: surfaceContainerLow (or equivalent) for unselected, outline variant for border
        // Let's use secondaryContainer to make it look distinct "chip-like"

        const backgroundColor = this.backgroundColor || colorScheme.secondaryContainer || '#E8DEF8';
        const onColor = colorScheme.onSecondaryContainer || '#1D192B';
        const deleteIconColor = this.deleteIconColor || onColor;

        const children = [];

        if (this.avatar) {
            children.push(this.avatar);
            children.push(new SizedBox({ width: 8.0 }));
        }

        // Apply style to label if it's text
        // Ideally we wrap in DefaultTextStyle
        children.push(new Container({
            style: { color: onColor },
            child: this.label
        }));

        if (this.onDeleted) {
            children.push(new SizedBox({ width: 8.0 }));
            children.push(new GestureDetector({
                onTap: this.onDeleted,
                child: this.deleteIcon || new Icon(Icons.cancel, { size: 18.0, color: deleteIconColor })
            }));
        }

        return new Container({
            padding: this.padding || EdgeInsets.symmetric({ horizontal: 12.0, vertical: 6.0 }), // M3 slightly taller 32dp
            decoration: new BoxDecoration({
                color: backgroundColor,
                borderRadius: BorderRadius.all(8.0), // M3 uses 8dp usually, Stadium (16) for Assist
            }),
            child: new Row({
                mainAxisSize: MainAxisSize.min,
                children: children
            })
        });
    }
}
