// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class NavigationBarThemeData {
    constructor({
        height,
        backgroundColor,
        elevation,
        shadowColor,
        surfaceTintColor,
        indicatorColor,
        indicatorShape,
        labelTextStyle,
        iconTheme,
        labelBehavior, // alwaysShow, onlyShowSelected, alwaysHide
    } = {}) {
        this.height = height;
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.indicatorColor = indicatorColor;
        this.indicatorShape = indicatorShape;
        this.labelTextStyle = labelTextStyle;
        this.iconTheme = iconTheme;
        this.labelBehavior = labelBehavior;
    }
}

class NavigationBarTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(NavigationBarTheme);
        return widget ? widget.data : null;
    }
}

export {
    NavigationBarTheme,
    NavigationBarThemeData
};
