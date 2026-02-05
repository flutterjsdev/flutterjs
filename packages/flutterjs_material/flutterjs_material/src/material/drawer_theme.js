// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class DrawerThemeData {
    constructor({
        backgroundColor,
        scrimColor,
        elevation,
        shadowColor,
        surfaceTintColor,
        shape,
        endShape,
        width,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.scrimColor = scrimColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.shape = shape;
        this.endShape = endShape;
        this.width = width;
    }
}

class DrawerTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(DrawerTheme);
        return widget ? widget.data : null;
    }
}

export {
    DrawerTheme,
    DrawerThemeData
};
