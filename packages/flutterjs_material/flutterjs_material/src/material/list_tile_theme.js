// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class ListTileThemeData {
    constructor({
        dense,
        shape,
        style,
        selectedColor,
        iconColor,
        textColor,
        contentPadding,
        tileColor,
        selectedTileColor,
        horizontalTitleGap,
        minVerticalPadding,
        minLeadingWidth,
        enableFeedback,
        mouseCursor,
        visualDensity,
        titleAlignment,
    } = {}) {
        this.dense = dense;
        this.shape = shape;
        this.style = style; // list, drawer
        this.selectedColor = selectedColor;
        this.iconColor = iconColor;
        this.textColor = textColor;
        this.contentPadding = contentPadding;
        this.tileColor = tileColor;
        this.selectedTileColor = selectedTileColor;
        this.horizontalTitleGap = horizontalTitleGap;
        this.minVerticalPadding = minVerticalPadding;
        this.minLeadingWidth = minLeadingWidth;
        this.enableFeedback = enableFeedback;
        this.mouseCursor = mouseCursor;
        this.visualDensity = visualDensity;
        this.titleAlignment = titleAlignment;
    }
}

class ListTileTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(ListTileTheme);
        return widget ? widget.data : null;
    }
}

export {
    ListTileTheme,
    ListTileThemeData
};
