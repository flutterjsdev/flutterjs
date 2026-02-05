// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class MaterialBannerThemeData {
    constructor({
        backgroundColor,
        surfaceTintColor,
        shadowColor,
        dividerColor,
        contentTextStyle,
        elevation,
        padding,
        leadingPadding,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.surfaceTintColor = surfaceTintColor;
        this.shadowColor = shadowColor;
        this.dividerColor = dividerColor;
        this.contentTextStyle = contentTextStyle;
        this.elevation = elevation;
        this.padding = padding;
        this.leadingPadding = leadingPadding;
    }
}

class MaterialBannerTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(MaterialBannerTheme);
        return widget ? widget.data : null;
    }
}

export {
    MaterialBannerTheme,
    MaterialBannerThemeData
};
