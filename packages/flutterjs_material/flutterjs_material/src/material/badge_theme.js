// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class BadgeThemeData {
    constructor({
        backgroundColor,
        textColor,
        smallSize,
        largeSize,
        textStyle,
        padding,
        alignment,
        offset,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.textColor = textColor;
        this.smallSize = smallSize;
        this.largeSize = largeSize;
        this.textStyle = textStyle;
        this.padding = padding;
        this.alignment = alignment;
        this.offset = offset;
    }
}

class BadgeTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(BadgeTheme);
        return widget ? widget.data : null;
    }
}

export {
    BadgeTheme,
    BadgeThemeData
};
