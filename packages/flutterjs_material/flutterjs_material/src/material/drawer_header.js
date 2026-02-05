// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BoxDecoration } from './container.js';

/**
 * A Material Design drawer header.
 * 
 * Usually the first child in the drawer's list of widgets.
 */
export class DrawerHeader extends StatelessWidget {
    constructor({
        key,
        decoration,
        margin = EdgeInsets.only({ bottom: 8.0 }),
        padding = EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 8.0),
        duration = 250,
        curve = 'fastOutSlowIn',
        child
    } = {}) {
        super({ key });
        this.decoration = decoration;
        this.margin = margin;
        this.padding = padding;
        this.duration = duration;
        this.curve = curve;
        this.child = child;
    }

    build(context) {
        return new Container({
            decoration: this.decoration,
            margin: this.margin,
            padding: this.padding,
            height: 160.0 + 1.0, // 160 height + 1px border usually
            child: new Container({
                child: this.child
            })
        });
    }
}
