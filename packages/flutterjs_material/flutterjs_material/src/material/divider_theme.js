// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '../core/widget_element.js';

export class DividerThemeData {
    constructor({ color, space, thickness, indent, endIndent } = {}) {
        this.color = color;
        this.space = space;
        this.thickness = thickness;
        this.indent = indent;
        this.endIndent = endIndent;
    }
}

export class DividerTheme extends InheritedWidget {
    constructor({ key, data, child } = {}) {
        super(key);
        this.data = data;
        this.child = child;
    }
    static of(context) { return new DividerThemeData(); }
}
