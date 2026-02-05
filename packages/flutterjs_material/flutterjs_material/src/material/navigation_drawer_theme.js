// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class NavigationDrawerThemeData {
    constructor({
        tileHeight,
        backgroundColor,
        elevation,
        shadowColor,
        surfaceTintColor,
        indicatorColor,
        indicatorShape,
        indicatorSize,
        labelTextStyle,
        iconTheme,
    } = {}) {
        this.tileHeight = tileHeight;
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.indicatorColor = indicatorColor;
        this.indicatorShape = indicatorShape;
        this.indicatorSize = indicatorSize;
        this.labelTextStyle = labelTextStyle;
        this.iconTheme = iconTheme;
    }
}

class NavigationDrawerTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(NavigationDrawerTheme);
        return widget ? widget.data : null;
    }
}

export {
    NavigationDrawerTheme,
    NavigationDrawerThemeData
};
