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
 * A Material Design choice chip.
 *
 * ChoiceChips represent a single choice from a set.
 * Choice chips contain related descriptive text or categories.
 */
export class ChoiceChip extends StatelessWidget {
    constructor({
        key,
        avatar,
        label,
        labelStyle,
        labelPadding,
        onSelected,
        selected = false,
        selectedColor,
        disabledColor,
        tooltip,
        shape,
        clipBehavior,
        backgroundColor,
        padding,
        elevation,
        shadowColor,
        showCheckmark = true,
        checkmarkColor,
        side,
    } = {}) {
        super(key);
        this.avatar = avatar;
        this.label = label;
        this.labelStyle = labelStyle;
        this.labelPadding = labelPadding;
        this.onSelected = onSelected;
        this.selected = selected;
        this.selectedColor = selectedColor;
        this.disabledColor = disabledColor;
        this.tooltip = tooltip;
        this.shape = shape;
        this.clipBehavior = clipBehavior;
        this.backgroundColor = backgroundColor;
        this.padding = padding;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.showCheckmark = showCheckmark;
        this.checkmarkColor = checkmarkColor;
        this.side = side;
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
