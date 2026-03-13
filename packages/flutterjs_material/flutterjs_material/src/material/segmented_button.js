// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row, Column, SizedBox } from '../widgets/widgets.js';
import { Icon, Icons } from './icon.js';
import { GestureDetector } from './gesture_detector.js';
import { BorderRadius } from '../utils/border_radius.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { MainAxisSize, CrossAxisAlignment } from '../utils/utils.js';
import { Theme } from './theme.js';
import { Text } from './text.js';

/**
 * Data describing a segment of a SegmentedButton.
 */
export class ButtonSegment {
    constructor({
        value,
        icon,
        label,
        tooltip,
        enabled = true,
    } = {}) {
        this.value = value;
        this.icon = icon;
        this.label = label;
        this.tooltip = tooltip;
        this.enabled = enabled;
    }
}

/**
 * A Material Design segmented button.
 *
 * Segmented buttons are used to help people select options, switch views,
 * or sort elements. Typically used for 2-5 options.
 *
 * This is the M3 replacement for ToggleButtons.
 */
export class SegmentedButton extends StatefulWidget {
    constructor({
        key,
        segments = [],
        selected = new Set(),
        onSelectionChanged,
        multiSelectionEnabled = false,
        emptySelectionAllowed = false,
        style,
        showSelectedIcon = true,
        selectedIcon,
    } = {}) {
        super(key);
        this.segments = segments;
        this.selected = selected;
        this.onSelectionChanged = onSelectionChanged;
        this.multiSelectionEnabled = multiSelectionEnabled;
        this.emptySelectionAllowed = emptySelectionAllowed;
        this.style = style;
        this.showSelectedIcon = showSelectedIcon;
        this.selectedIcon = selectedIcon;
    }

    createState() {
        return new SegmentedButtonState();
    }
}

class SegmentedButtonState extends State {
    _handlePress(segmentValue) {
        if (!this.widget.onSelectionChanged) return;

        const selected = new Set(this.widget.selected);
        const onlySelectedSegment = selected.size === 1 && selected.has(segmentValue);
        const validChange = this.widget.emptySelectionAllowed || !onlySelectedSegment;

        if (validChange) {
            if (this.widget.multiSelectionEnabled || (this.widget.emptySelectionAllowed && onlySelectedSegment)) {
                // Toggle behavior
                if (selected.has(segmentValue)) {
                    selected.delete(segmentValue);
                } else {
                    selected.add(segmentValue);
                }
            } else {
                // Single select: replace
                selected.clear();
                selected.add(segmentValue);
            }

            this.widget.onSelectionChanged(selected);
        }
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;
        const isEnabled = this.widget.onSelectionChanged != null;

        const outlineColor = colorScheme.outline || '#79747E';
        const selectedBgColor = colorScheme.secondaryContainer || '#E8DEF8';
        const selectedFgColor = colorScheme.onSecondaryContainer || '#1D192B';
        const unselectedFgColor = colorScheme.onSurface || '#1C1B1F';

        const children = this.widget.segments.map((segment, index) => {
            const isSelected = this.widget.selected.has(segment.value);
            const isFirst = index === 0;
            const isLast = index === this.widget.segments.length - 1;

            const segmentChildren = [];

            // Selected icon
            if (isSelected && this.widget.showSelectedIcon) {
                segmentChildren.push(
                    this.widget.selectedIcon || new Icon(Icons.check, {
                        size: 18.0,
                        color: selectedFgColor,
                    })
                );
                if (segment.label || segment.icon) {
                    segmentChildren.push(new SizedBox({ width: 8.0 }));
                }
            }

            // Segment icon (show when not selected, or when selected and showSelectedIcon is false)
            if (segment.icon && !(isSelected && this.widget.showSelectedIcon)) {
                segmentChildren.push(segment.icon);
                if (segment.label) {
                    segmentChildren.push(new SizedBox({ width: 8.0 }));
                }
            }

            // Label
            if (segment.label) {
                segmentChildren.push(segment.label);
            }

            // Border radius: round only the outer edges
            let borderRadius;
            if (isFirst && isLast) {
                borderRadius = BorderRadius.circular(20);
            } else if (isFirst) {
                borderRadius = BorderRadius.only({
                    topLeft: 20,
                    bottomLeft: 20,
                });
            } else if (isLast) {
                borderRadius = BorderRadius.only({
                    topRight: 20,
                    bottomRight: 20,
                });
            } else {
                borderRadius = BorderRadius.all(0);
            }

            const segmentWidget = new Container({
                padding: EdgeInsets.symmetric({ horizontal: 16.0, vertical: 10.0 }),
                decoration: new BoxDecoration({
                    color: isSelected ? selectedBgColor : 'transparent',
                    borderRadius: borderRadius,
                    border: {
                        color: outlineColor,
                        width: 1.0,
                    }
                }),
                child: new Row({
                    mainAxisSize: MainAxisSize.min,
                    children: segmentChildren,
                }),
            });

            if (!isEnabled || !segment.enabled) {
                return segmentWidget;
            }

            return new GestureDetector({
                onTap: () => this._handlePress(segment.value),
                child: segmentWidget,
            });
        });

        return new Row({
            mainAxisSize: MainAxisSize.min,
            children: children,
        });
    }
}
