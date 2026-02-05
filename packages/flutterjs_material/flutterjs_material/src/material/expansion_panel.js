// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Container } from './container.js';
import { Column, Row, Expanded } from '../widgets/widgets.js';
import { GestureDetector } from './gesture_detector.js';
import { Icon, Icons } from './icon.js';
import { IconButton } from './icon_button.js';
// import { MergeableMaterialItem } from './mergeable_material.js'; // Assuming this might not exist, will skip interface usage
import { EdgeInsets } from '../utils/edge_insets.js';

export class ExpansionPanel {
    constructor({
        headerBuilder,
        body,
        isExpanded = false,
        canTapOnHeader = false,
        backgroundColor,
    } = {}) {
        this.headerBuilder = headerBuilder;
        this.body = body;
        this.isExpanded = isExpanded;
        this.canTapOnHeader = canTapOnHeader;
        this.backgroundColor = backgroundColor;
    }
}

export class ExpansionPanelList extends StatefulWidget {
    constructor({
        key,
        children = [],
        expansionCallback,
        animationDuration,
        expandedHeaderPadding,
        dividerColor,
        elevation = 2,
    } = {}) {
        super(key);
        this.children = children;
        this.expansionCallback = expansionCallback;
        this.animationDuration = animationDuration;
        this.expandedHeaderPadding = expandedHeaderPadding;
        this.dividerColor = dividerColor;
        this.elevation = elevation;
    }

    createState() {
        return new ExpansionPanelListState();
    }
}

class ExpansionPanelListState extends State {

    _isChildExpanded(index) {
        return this.widget.children[index].isExpanded;
    }

    _handlePressed(isExpanded, index) {
        this.widget.expansionCallback?.(index, isExpanded);
    }

    build(context) {
        const items = this.widget.children.map((child, index) => {

            const header = child.headerBuilder(context, child.isExpanded);
            const expandIcon = new IconButton({
                icon: new Icon(child.isExpanded ? Icons.expandLess : Icons.expandMore),
                onPressed: () => this._handlePressed(child.isExpanded, index)
            });

            const headerRow = new Row({
                children: [
                    new Expanded({ child: header }),
                    expandIcon
                ]
            });

            // Wrap header in gesture detector if canTapOnHeader
            const interactiveHeader = child.canTapOnHeader
                ? new GestureDetector({
                    onTap: () => this._handlePressed(child.isExpanded, index),
                    child: headerRow
                })
                : headerRow;

            return new Container({
                margin: EdgeInsets.symmetric({ vertical: 4.0 }), // Separation
                // Elevation simulated via box-shadow
                style: {
                    boxShadow: `0 1px 3px ${this.dividerColor || Theme.of(context).dividerColor || 'rgba(0,0,0,0.12)'}`
                },
                child: new Column({
                    children: [
                        new Container({
                            padding: EdgeInsets.all(4), // Base padding
                            child: interactiveHeader
                        }),
                        child.isExpanded ? child.body : new Container()
                    ]
                })
            });
        });

        return new Column({
            children: items
        });
    }
}

export class ExpansionPanelRadio extends ExpansionPanel {
    constructor({ value, ...args }) {
        super(args);
        this.value = value;
    }
}
