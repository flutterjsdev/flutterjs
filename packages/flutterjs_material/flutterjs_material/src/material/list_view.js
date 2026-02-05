// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
    StatelessWidget,
    Widget,
} from "../core/widget_element.js";
import { Container } from "./container.js";
import { Column } from "../widgets/compoment/multi_child_view.js";
import { EdgeInsets } from "../utils/edge_insets.js";

export class ListView extends StatelessWidget {
    constructor({
        key,
        scrollDirection = "vertical",
        reverse = false,
        controller,
        primary,
        physics,
        shrinkWrap = false,
        padding,
        itemExtent,
        prototypeItem,
        addAutomaticKeepAlives = true,
        addRepaintBoundaries = true,
        addSemanticIndexes = true,
        cacheExtent,
        children = [],
        semanticChildCount,
        dragStartBehavior,
        keyboardDismissBehavior,
        restorationId,
        clipBehavior,
    } = {}) {
        super(key);
        this.key = key;
        this.scrollDirection = scrollDirection;
        this.reverse = reverse;
        this.controller = controller;
        this.primary = primary;
        this.physics = physics;
        this.shrinkWrap = shrinkWrap;
        this.padding = padding;
        this.itemExtent = itemExtent;
        this.prototypeItem = prototypeItem;
        this.addAutomaticKeepAlives = addAutomaticKeepAlives;
        this.addRepaintBoundaries = addRepaintBoundaries;
        this.addSemanticIndexes = addSemanticIndexes;
        this.cacheExtent = cacheExtent;
        this.children = children;
        this.semanticChildCount = semanticChildCount;
        this.dragStartBehavior = dragStartBehavior;
        this.keyboardDismissBehavior = keyboardDismissBehavior;
        this.restorationId = restorationId;
        this.clipBehavior = clipBehavior;
    }

    static builder({
        key,
        scrollDirection = "vertical",
        reverse = false,
        controller,
        primary,
        physics,
        shrinkWrap = false,
        padding,
        itemExtent,
        prototypeItem,
        addAutomaticKeepAlives = true,
        addRepaintBoundaries = true,
        addSemanticIndexes = true,
        cacheExtent,
        itemBuilder,
        itemCount,
        findChildIndexCallback,
        dragStartBehavior,
        keyboardDismissBehavior,
        restorationId,
        clipBehavior,
    } = {}) {
        const children = [];
        if (itemCount !== undefined && itemBuilder) {
            console.log('[ListView.builder] Creating', itemCount, 'children');
            for (let i = 0; i < itemCount; i++) {
                // Pass a mock context and index
                const child = itemBuilder({ type: 'BuildContext' }, i);
                console.log(`[ListView.builder] Child ${i}:`, child?.constructor?.name, 'has createElement:', typeof child?.createElement);
                children.push(child);
            }
            console.log('[ListView.builder] All children:', children.map(c => c?.constructor?.name));
        }

        return new ListView({
            key,
            scrollDirection,
            reverse,
            controller,
            primary,
            physics,
            shrinkWrap,
            padding,
            itemExtent,
            prototypeItem,
            addAutomaticKeepAlives,
            addRepaintBoundaries,
            addSemanticIndexes,
            cacheExtent,
            children,
            semanticChildCount: itemCount,
            dragStartBehavior,
            keyboardDismissBehavior,
            restorationId,
            clipBehavior,
        });

        console.log('[ListView.builder] Returning ListView instance:', result.constructor.name, 'extends StatelessWidget:', result instanceof StatelessWidget);
        return result;
    }

    static separated({
        key,
        scrollDirection = "vertical",
        reverse = false,
        controller,
        primary,
        physics,
        shrinkWrap = false,
        padding,
        itemBuilder,
        separatorBuilder,
        itemCount,
        addAutomaticKeepAlives = true,
        addRepaintBoundaries = true,
        addSemanticIndexes = true,
        cacheExtent,
        dragStartBehavior,
        keyboardDismissBehavior,
        restorationId,
        clipBehavior,
    } = {}) {
        const children = [];
        if (itemCount !== undefined && itemBuilder && separatorBuilder) {
            for (let i = 0; i < itemCount; i++) {
                children.push(itemBuilder({ type: 'BuildContext' }, i));
                if (i < itemCount - 1) {
                    children.push(separatorBuilder({ type: 'BuildContext' }, i));
                }
            }
        }

        return new ListView({
            key,
            scrollDirection,
            reverse,
            controller,
            primary,
            physics,
            shrinkWrap,
            padding,
            addAutomaticKeepAlives,
            addRepaintBoundaries,
            addSemanticIndexes,
            cacheExtent,
            children,
            semanticChildCount: itemCount, // Approximation
            dragStartBehavior,
            keyboardDismissBehavior,
            restorationId,
            clipBehavior,
        });
    }

    static custom({
        key,
        scrollDirection = "vertical",
        reverse = false,
        controller,
        primary,
        physics,
        shrinkWrap = false,
        padding,
        itemExtent,
        prototypeItem,
        childrenDelegate,
        cacheExtent,
        semanticChildCount,
        dragStartBehavior,
        keyboardDismissBehavior,
        restorationId,
        clipBehavior,
    } = {}) {
        // Basic support for SliverChildListDelegate (static list)
        // Dynamic delegates (SliverChildBuilderDelegate) would need runtime expansion
        let children = [];
        if (childrenDelegate && Array.isArray(childrenDelegate.children)) {
            children = childrenDelegate.children;
        } else if (childrenDelegate && typeof childrenDelegate.builder === 'function') {
            // Best effort for builder delegate if count is provided
            // This mimics the builder constructor logic
            const count = childrenDelegate.childCount || 0;
            for (let i = 0; i < count; i++) {
                children.push(childrenDelegate.builder({ type: 'BuildContext' }, i));
            }
        }

        return new ListView({
            key,
            scrollDirection,
            reverse,
            controller,
            primary,
            physics,
            shrinkWrap,
            padding,
            itemExtent,
            prototypeItem,
            cacheExtent,
            children,
            semanticChildCount: semanticChildCount || children.length,
            dragStartBehavior,
            keyboardDismissBehavior,
            restorationId,
            clipBehavior,
        });
    }

    build(context) {
        const isHorizontal = this.scrollDirection === "horizontal";

        // Create a scrollable container
        // Note: Don't pass string CSS values (like '100%') to Container's width/height
        // as they become invalid BoxConstraints. Use flexbox layout instead.
        return new Container({
            padding: this.padding,
            width: isHorizontal ? undefined : '100%', // ListView expands cross-axis by default
            height: isHorizontal ? '100%' : undefined,
            // Removed width/height - CSS flexbox handles sizing via the parent Column/Flex
            child: new Column({
                children: this.children,
                mainAxisSize: this.shrinkWrap ? "min" : "max",
                crossAxisAlignment: isHorizontal ? "center" : "stretch",
                // TODO: Handle 'reverse' by reversing children array or CSS direction
            })
        });
    }
}
