// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Axis } from '../utils/property/axis.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { buildChildWidget } from '../utils/build_helper.js';

export class SingleChildScrollView extends StatelessWidget {
    constructor({
        key,
        scrollDirection = Axis.vertical,
        reverse = false,
        padding,
        primary,
        physics,
        controller,
        child
    } = {}) {
        super({ key });
        this.scrollDirection = scrollDirection;
        this.reverse = reverse;
        this.padding = padding;
        this.primary = primary;
        this.physics = physics;
        this.controller = controller;
        this.child = child;
    }

    build(context) {
        let paddingCss = '';
        if (this.padding) {
            if (this.padding instanceof EdgeInsets) {
                paddingCss = `${this.padding.top}px ${this.padding.right}px ${this.padding.bottom}px ${this.padding.left}px`;
            } else {
                paddingCss = `${this.padding.top || 0}px ${this.padding.right || 0}px ${this.padding.bottom || 0}px ${this.padding.left || 0}px`;
            }
        }

        const isHorizontal = this.scrollDirection === Axis.horizontal;

        // ✅ FIXED: Use flex: 1 instead of height: 100% to work with flex parents
        // The scroll container should expand to fill available space
        const style = {
            overflowX: isHorizontal ? 'auto' : 'hidden',
            overflowY: isHorizontal ? 'hidden' : 'auto',
            display: 'flex',
            flexDirection: isHorizontal ? 'row' : 'column',
            flex: '1 1 auto',
            minHeight: 0, // Important for flex children to allow shrinking
            width: '100%',
            // Remove height: '100%' - it conflicts with flex and prevents scrolling
            boxSizing: 'border-box',
            padding: paddingCss,
            alignItems: 'stretch', // Ensure child fills the cross-axis (width for vertical)
            WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
        };

        // ✅ FIXED: Use buildChildWidget helper instead of manual element creation
        let childVNode = null;
        if (this.child) {
            childVNode = buildChildWidget(this.child, context);
        }

        return new VNode({
            tag: 'div',
            props: {
                className: 'fjs-single-child-scroll-view',
                style,
                'data-widget': 'SingleChildScrollView'
            },
            children: childVNode ? [childVNode] : []
        });
    }
}

