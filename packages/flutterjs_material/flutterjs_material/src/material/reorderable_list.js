// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Container } from './container.js';
import { Column } from '../widgets/widgets.js';
import { GestureDetector } from './gesture_detector.js';
import { Theme } from './theme.js';
import { MainAxisSize } from '../utils/utils.js';

/**
 * A list whose items the user can interactively reorder by dragging.
 */
export class ReorderableListView extends StatefulWidget {
    constructor({
        key,
        children = [],
        onReorder,
        onReorderStart,
        onReorderEnd,
        itemCount,
        itemBuilder,
        proxyDecorator,
        buildDefaultDragHandles = true,
        padding,
        header,
        footer,
        scrollDirection = 'vertical',
        reverse = false,
        scrollController,
        primary,
        physics,
        shrinkWrap = false,
        anchor = 0.0,
        cacheExtent,
        dragStartBehavior,
        clipBehavior,
        autoScrollerVelocityScalar,
    } = {}) {
        super(key);
        this.children = children;
        this.onReorder = onReorder;
        this.onReorderStart = onReorderStart;
        this.onReorderEnd = onReorderEnd;
        this.buildDefaultDragHandles = buildDefaultDragHandles;
        this.padding = padding;
        this.header = header;
        this.footer = footer;
        this.scrollDirection = scrollDirection;
        this.shrinkWrap = shrinkWrap;
    }

    createState() {
        return new ReorderableListViewState();
    }
}

class ReorderableListViewState extends State {
    constructor() {
        super();
        this._dragIndex = null;
    }

    _handleReorder(oldIndex, newIndex) {
        this.widget.onReorder?.(oldIndex, newIndex);
    }

    build(context) {
        const items = this.widget.children.map((child, index) => {
            if (this.widget.buildDefaultDragHandles) {
                // Simplified: wrap in drag handle container
                return new GestureDetector({
                    onLongPress: () => {
                        this.widget.onReorderStart?.(index);
                    },
                    child: child,
                });
            }
            return child;
        });

        const allChildren = [];
        if (this.widget.header) allChildren.push(this.widget.header);
        allChildren.push(...items);
        if (this.widget.footer) allChildren.push(this.widget.footer);

        return new Container({
            padding: this.widget.padding,
            child: new Column({
                mainAxisSize: this.widget.shrinkWrap ? MainAxisSize.min : MainAxisSize.max,
                children: allChildren,
            }),
        });
    }
}
