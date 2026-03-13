// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '../core/widget_element.js';

export class ExpansionTileThemeData {
    constructor({
        backgroundColor, collapsedBackgroundColor, tilePadding,
        expandedAlignment, childrenPadding, iconColor, collapsedIconColor,
        textColor, collapsedTextColor, shape, collapsedShape, clipBehavior,
    } = {}) {
        Object.assign(this, {
            backgroundColor, collapsedBackgroundColor, tilePadding,
            expandedAlignment, childrenPadding, iconColor, collapsedIconColor,
            textColor, collapsedTextColor, shape, collapsedShape, clipBehavior,
        });
    }
}

export class ExpansionTileTheme extends InheritedWidget {
    constructor({ key, data, child } = {}) {
        super(key);
        this.data = data;
        this.child = child;
    }
    static of(context) { return new ExpansionTileThemeData(); }
}
