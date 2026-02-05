// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { ListTile } from './list_tile.js';
import { Theme } from './theme.js';
import { Column } from '../widgets/widgets.js';
import { Colors } from './color.js';
import { Icon, Icons } from './icon.js';

export class ExpansionTile extends StatefulWidget {
    constructor({
        key,
        leading,
        title,
        subtitle,
        onExpansionChanged,
        children = [],
        trailing,
        initiallyExpanded = false,
        maintainState = false,
        tilePadding,
        expandedCrossAxisAlignment,
        expandedAlignment,
        childrenPadding,
        backgroundColor,
        collapsedBackgroundColor,
        textColor,
        collapsedTextColor,
        iconColor,
        collapsedIconColor,
        shape,
        collapsedShape,
        clipBehavior,
        controlAffinity,
    } = {}) {
        super(key);
        this.leading = leading;
        this.title = title;
        this.subtitle = subtitle;
        this.onExpansionChanged = onExpansionChanged;
        this.children = children;
        this.trailing = trailing;
        this.initiallyExpanded = initiallyExpanded;
        this.maintainState = maintainState;
        this.tilePadding = tilePadding;
        this.expandedCrossAxisAlignment = expandedCrossAxisAlignment;
        this.expandedAlignment = expandedAlignment;
        this.childrenPadding = childrenPadding;
        this.backgroundColor = backgroundColor;
        this.collapsedBackgroundColor = collapsedBackgroundColor;
        this.textColor = textColor;
        this.collapsedTextColor = collapsedTextColor;
        this.iconColor = iconColor;
        this.collapsedIconColor = collapsedIconColor;
        this.shape = shape;
        this.collapsedShape = collapsedShape;
        this.clipBehavior = clipBehavior;
        this.controlAffinity = controlAffinity;
    }

    createState() {
        return new ExpansionTileState();
    }
}

class ExpansionTileState extends State {
    constructor() {
        super();
        this.isExpanded = false;
    }

    initState() {
        this.isExpanded = this.widget.initiallyExpanded;
    }

    _handleTap() {
        this.setState(() => {
            this.isExpanded = !this.isExpanded;
        });
        this.widget.onExpansionChanged?.(this.isExpanded);
    }

    build(context) {
        // Construct ListTile
        // We generally append an arrow icon if trailing is null, or rotate existing trailing?
        // Flutter default: Adds ExpandMore icon at trailing position.

        const theme = Theme.of(context);
        const defaultIconColor = this.isExpanded ? (this.widget.iconColor || theme.colorScheme.primary) : (this.widget.collapsedIconColor || theme.unselectedWidgetColor);

        const trailingIcon = this.widget.trailing || new Icon(this.isExpanded ? Icons.expandLess : Icons.expandMore, {
            color: defaultIconColor
        });

        return new Column({
            children: [
                new ListTile({
                    leading: this.widget.leading,
                    title: this.widget.title,
                    subtitle: this.widget.subtitle,
                    trailing: trailingIcon,
                    onTap: () => this._handleTap(),
                    tileColor: this.isExpanded ? this.widget.backgroundColor : this.widget.collapsedBackgroundColor,
                    // text/icon colors handling would go here via style injection or Theme wrapping
                }),
                // Children only if expanded
                ...(this.isExpanded ? this.widget.children : [])
            ]
        });
    }
}
