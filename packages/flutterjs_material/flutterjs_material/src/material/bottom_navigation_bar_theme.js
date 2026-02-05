// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class BottomNavigationBarThemeData {
    constructor({
        backgroundColor,
        elevation,
        selectedIconTheme,
        unselectedIconTheme,
        selectedItemColor,
        unselectedItemColor,
        selectedLabelStyle,
        unselectedLabelStyle,
        showSelectedLabels,
        showUnselectedLabels,
        type,
        enableFeedback,
        landscapeLayout,
        mouseCursor,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.selectedIconTheme = selectedIconTheme;
        this.unselectedIconTheme = unselectedIconTheme;
        this.selectedItemColor = selectedItemColor;
        this.unselectedItemColor = unselectedItemColor;
        this.selectedLabelStyle = selectedLabelStyle;
        this.unselectedLabelStyle = unselectedLabelStyle;
        this.showSelectedLabels = showSelectedLabels;
        this.showUnselectedLabels = showUnselectedLabels;
        this.type = type;
        this.enableFeedback = enableFeedback;
        this.landscapeLayout = landscapeLayout;
        this.mouseCursor = mouseCursor;
    }
}

class BottomNavigationBarTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(BottomNavigationBarTheme);
        return widget ? widget.data : null;
    }
}

export {
    BottomNavigationBarTheme,
    BottomNavigationBarThemeData
};
