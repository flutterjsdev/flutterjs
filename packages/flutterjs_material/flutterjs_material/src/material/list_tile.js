// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Color, CrossAxisAlignment, MainAxisAlignment, MainAxisSize, Alignment } from '../utils/utils.js';
import { Row, Column, Expanded, SizedBox } from '../widgets/widgets.js';
import { Container } from './container.js';
import { GestureDetector } from './gesture_detector.js';
import { BoxConstraints } from '../utils/box_constraints.js';
import { Theme } from './theme.js';
import { IconTheme } from './icon_theme.js';
import { TextStyle } from '../painting/text_style.js';

/**
 * A single fixed-height row that typically contains some text as well as
 * a leading or trailing icon.
 */
export class ListTile extends StatelessWidget {
    constructor({
        key,
        leading,
        title,
        subtitle,
        trailing,
        isThreeLine = false,
        dense,
        visualDensity,
        shape,
        contentPadding,
        enabled = true,
        onTap,
        onLongPress,
        mouseCursor,
        selected = false,
        focusColor,
        hoverColor,
        focusNode,
        autofocus = false,
        tileColor,
        selectedTileColor,
        enableFeedback,
        horizontalTitleGap,
        minVerticalPadding,
        minLeadingWidth,
    } = {}) {
        super(key);
        this.leading = leading;
        this.title = title;
        this.subtitle = subtitle;
        this.trailing = trailing;
        this.isThreeLine = isThreeLine;
        this.dense = dense;
        this.visualDensity = visualDensity;
        this.shape = shape;
        this.contentPadding = contentPadding;
        this.enabled = enabled;
        this.onTap = onTap;
        this.onLongPress = onLongPress;
        this.mouseCursor = mouseCursor;
        this.selected = selected;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.focusNode = focusNode;
        this.autofocus = autofocus;
        this.tileColor = tileColor;
        this.selectedTileColor = selectedTileColor;
        this.enableFeedback = enableFeedback;
        this.horizontalTitleGap = horizontalTitleGap;
        this.minVerticalPadding = minVerticalPadding;
        this.minLeadingWidth = minLeadingWidth;
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        // Colors
        // Selected: Secondary Container
        // Unselected: Transparent (or tileColor)
        const defaultSelectedColor = colorScheme.secondaryContainer || '#E8DEF8';
        const defaultSelectedContentColor = colorScheme.onSecondaryContainer || '#1D192B';
        const defaultContentColor = colorScheme.onSurfaceVariant || '#49454F';
        const titleColor = colorScheme.onSurface || '#1C1B1F';

        const bgColor = this.selected
            ? (this.selectedTileColor || defaultSelectedColor)
            : (this.tileColor || null);

        const iconColor = this.selected ? defaultSelectedContentColor : defaultContentColor;
        const textColor = this.selected ? defaultSelectedContentColor : defaultContentColor;
        const mainTextColor = this.selected ? defaultSelectedContentColor : titleColor;

        const children = [];

        // Leading
        if (this.leading) {
            children.push(new IconTheme({
                data: theme.iconTheme.copyWith({ color: iconColor }),
                child: new Container({
                    constraints: new BoxConstraints(
                        this.minLeadingWidth || 40,
                        Infinity,
                        0,
                        Infinity
                    ),
                    alignment: Alignment.center,
                    child: this.leading
                })
            }));

            children.push(new SizedBox({ width: this.horizontalTitleGap || 16 }));
        }

        // Title & Subtitle
        const textChildren = [];
        if (this.title) {
            textChildren.push(this.title);
        }

        if (this.subtitle) {
            if (this.title) {
                textChildren.push(new SizedBox({ height: 4 }));
            }
            textChildren.push(this.subtitle);
        }

        children.push(new Expanded({
            child: new Column({
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: textChildren
            })
        }));

        // Trailing
        if (this.trailing) {
            children.push(new SizedBox({ width: 16 }));
            children.push(new IconTheme({
                data: theme.iconTheme.copyWith({ color: iconColor }), // Typically trailing is also onSurfaceVariant
                child: this.trailing
            }));
        }

        // Decoration & Sizing
        const minHeight = this.dense ? 48 : (this.isThreeLine ? 88 : 56);

        let padding = this.contentPadding;
        if (!padding) {
            padding = EdgeInsets.symmetric({ horizontal: 16, vertical: 8 });
        }

        const tileContent = new Container({
            constraints: new BoxConstraints(
                0,        // minWidth
                Infinity, // maxWidth
                minHeight,// minHeight
                Infinity  // maxHeight
            ),
            padding: padding,
            color: bgColor,
            child: new Row({
                crossAxisAlignment: CrossAxisAlignment.center,
                children: children
            })
        });

        if (this.enabled && (this.onTap || this.onLongPress)) {
            return new GestureDetector({
                onTap: this.onTap,
                onLongPress: this.onLongPress,
                child: tileContent
            });
        }

        return tileContent;
    }
}
