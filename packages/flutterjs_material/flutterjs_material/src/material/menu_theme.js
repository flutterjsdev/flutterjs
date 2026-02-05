// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class MenuThemeData {
    constructor({
        style
    } = {}) {
        this.style = style;
    }
}

class MenuTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(MenuTheme);
        return widget ? widget.data : null;
    }
}

export {
    MenuTheme,
    MenuThemeData
};
