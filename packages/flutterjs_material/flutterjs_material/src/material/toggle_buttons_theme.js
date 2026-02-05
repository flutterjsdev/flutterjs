// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class ToggleButtonsThemeData {
    constructor({
        textStyle,
        constraints,
        color,
        selectedColor,
        disabledColor,
        fillColor,
        focusColor,
        highlightColor,
        hoverColor,
        splashColor,
        borderColor,
        selectedBorderColor,
        disabledBorderColor,
        borderRadius,
        borderWidth,
    } = {}) {
        this.textStyle = textStyle;
        this.constraints = constraints;
        this.color = color;
        this.selectedColor = selectedColor;
        this.disabledColor = disabledColor;
        this.fillColor = fillColor;
        this.focusColor = focusColor;
        this.highlightColor = highlightColor;
        this.hoverColor = hoverColor;
        this.splashColor = splashColor;
        this.borderColor = borderColor;
        this.selectedBorderColor = selectedBorderColor;
        this.disabledBorderColor = disabledBorderColor;
        this.borderRadius = borderRadius;
        this.borderWidth = borderWidth;
    }
}

class ToggleButtonsTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(ToggleButtonsTheme);
        return widget ? widget.data : null;
    }
}

export {
    ToggleButtonsTheme,
    ToggleButtonsThemeData
};
