// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class ButtonThemeData {
    constructor({
        textTheme,
        minWidth = 88.0,
        height = 36.0,
        padding,
        shape,
        alignedDropdown = false,
        buttonColor,
        disabledColor,
        focusColor,
        hoverColor,
        highlightColor,
        splashColor,
        colorScheme,
        materialTapTargetSize,
    } = {}) {
        this.textTheme = textTheme;
        this.minWidth = minWidth;
        this.height = height;
        this.padding = padding;
        this.shape = shape;
        this.alignedDropdown = alignedDropdown;
        this.buttonColor = buttonColor;
        this.disabledColor = disabledColor;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.highlightColor = highlightColor;
        this.splashColor = splashColor;
        this.colorScheme = colorScheme;
        this.materialTapTargetSize = materialTapTargetSize;
    }
}

class ButtonTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(ButtonTheme);
        return widget ? widget.data : new ButtonThemeData();
    }
}

export {
    ButtonTheme,
    ButtonThemeData
};
