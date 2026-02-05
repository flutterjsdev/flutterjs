// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class BottomAppBarTheme {
    constructor({
        color,
        elevation,
        shape,
        height,
        surfaceTintColor,
        shadowColor,
        padding,
    } = {}) {
        this.color = color;
        this.elevation = elevation;
        this.shape = shape;
        this.height = height;
        this.surfaceTintColor = surfaceTintColor;
        this.shadowColor = shadowColor;
        this.padding = padding;
    }
}

class BottomAppBarThemeData extends InheritedWidget {
    // Wait, InheritedWidget is for passing down. Theme is data.
    // Correct pattern: Theme holds ThemeData.
    // But FlutterJS implementation of Theme seems mixed manually. 
    // Following `icon.js` pattern: IconThemeData is class, not widget.
    // `Theme` is InheritedWidget.
    // We should check `theme_data.js` to see if it aggregates these.
    // The file `bottom_app_bar_theme.js` should likely export the Data class.
}

export {
    BottomAppBarTheme
};
