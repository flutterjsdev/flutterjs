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

/**
 * A Material Design filter chip.
 *
 * Filter chips use tags or descriptive words as a way to filter content.
 * They allow for multiple selection (unlike ChoiceChip which is single select).
 */
export class FilterChip extends StatelessWidget {
    constructor({
        key,
        avatar,
        label,
        labelStyle,
        labelPadding,
        selected = false,
        onSelected,
        deleteIcon,
        onDeleted,
        deleteIconColor,
        deleteButtonTooltipMessage,
        disabledColor,
        selectedColor,
        tooltip,
        side,
        shape,
        clipBehavior,
        backgroundColor,
        padding,
        elevation,
        shadowColor,
        showCheckmark = true,
        checkmarkColor,
    } = {}) {
        super(key);
        this.avatar = avatar;
        this.label = label;
        this.labelStyle = labelStyle;
        this.labelPadding = labelPadding;
        this.selected = selected;
        this.onSelected = onSelected;
        this.deleteIcon = deleteIcon;
        this.onDeleted = onDeleted;
        this.deleteIconColor = deleteIconColor;
        this.disabledColor = disabledColor;
        this.selectedColor = selectedColor;
        this.tooltip = tooltip;
        this.backgroundColor = backgroundColor;
        this.padding = padding;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.showCheckmark = showCheckmark;
        this.checkmarkColor = checkmarkColor;
    }

    get isEnabled() {
        return this.onSelected != null;
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        // M3 defaults
        const bgColor = this.selected
            ? (this.selectedColor || colorScheme.secondaryContainer || '#E8DEF8')
            : (this.backgroundColor || 'transparent');

        const onColor = this.selected
            ? (colorScheme.onSecondaryContainer || '#1D192B')
            : (colorScheme.onSurfaceVariant || '#49454F');

        const borderColor = this.selected
            ? 'transparent'
            : (colorScheme.outlineVariant || '#CAC4D0');

        const checkColor = this.checkmarkColor || (colorScheme.onSecondaryContainer || '#1D192B');
        const deleteColor = this.deleteIconColor || onColor;

        const children = [];

        // Show checkmark for selected state
        if (this.selected && this.showCheckmark) {
            children.push(new Icon(Icons.check, { size: 18.0, color: checkColor }));
            children.push(new SizedBox({ width: 8.0 }));
        } else if (this.avatar) {
            children.push(this.avatar);
            children.push(new SizedBox({ width: 8.0 }));
        }

        // Label
        children.push(new Container({
            style: { color: onColor },
            child: this.label
        }));

        // Delete icon
        if (this.onDeleted) {
            children.push(new SizedBox({ width: 8.0 }));
            children.push(new GestureDetector({
                onTap: this.onDeleted,
                child: this.deleteIcon || new Icon(Icons.clear, { size: 18.0, color: deleteColor })
            }));
        }

        const chipContent = new Container({
            padding: this.padding || EdgeInsets.symmetric({ horizontal: 12.0, vertical: 6.0 }),
            decoration: new BoxDecoration({
                color: bgColor,
                borderRadius: BorderRadius.all(8.0),
                border: borderColor !== 'transparent' ? {
                    color: borderColor,
                    width: 1.0,
                } : undefined,
            }),
            child: new Row({
                mainAxisSize: MainAxisSize.min,
                children: children
            })
        });

        if (!this.isEnabled) {
            return chipContent;
        }

        return new GestureDetector({
            onTap: () => this.onSelected?.(!this.selected),
            child: chipContent,
        });
    }
}
