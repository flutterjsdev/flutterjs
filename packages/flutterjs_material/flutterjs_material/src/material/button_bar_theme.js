// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class ButtonBarThemeData {
    constructor({
        alignment,
        mainAxisSize,
        buttonTextTheme,
        buttonMinWidth,
        buttonHeight,
        buttonPadding,
        buttonAlignedDropdown,
        layoutBehavior,
        overflowDirection,
    } = {}) {
        this.alignment = alignment;
        this.mainAxisSize = mainAxisSize;
        this.buttonTextTheme = buttonTextTheme;
        this.buttonMinWidth = buttonMinWidth;
        this.buttonHeight = buttonHeight;
        this.buttonPadding = buttonPadding;
        this.buttonAlignedDropdown = buttonAlignedDropdown;
        this.layoutBehavior = layoutBehavior;
        this.overflowDirection = overflowDirection;
    }
}

class ButtonBarTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(ButtonBarTheme);
        return widget ? widget.data : null;
    }
}

export {
    ButtonBarTheme,
    ButtonBarThemeData
};
