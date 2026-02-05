// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class MenuBarThemeData {
    constructor({
        style
    } = {}) {
        this.style = style;
    }
}

class MenuBarTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(MenuBarTheme);
        return widget ? widget.data : null;
    }
}

export {
    MenuBarTheme,
    MenuBarThemeData
};
