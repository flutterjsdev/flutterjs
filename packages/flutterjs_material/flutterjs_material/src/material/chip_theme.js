// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class ChipThemeData {
    constructor({
        backgroundColor,
        deleteIconColor,
        disabledColor,
        selectedColor,
        secondarySelectedColor,
        shadowColor,
        surfaceTintColor,
        selectedShadowColor,
        showCheckmark,
        checkmarkColor,
        labelPadding,
        padding,
        side,
        shape,
        labelStyle,
        secondaryLabelStyle,
        brightness,
        elevation,
        pressElevation,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.deleteIconColor = deleteIconColor;
        this.disabledColor = disabledColor;
        this.selectedColor = selectedColor;
        this.secondarySelectedColor = secondarySelectedColor;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.selectedShadowColor = selectedShadowColor;
        this.showCheckmark = showCheckmark;
        this.checkmarkColor = checkmarkColor;
        this.labelPadding = labelPadding;
        this.padding = padding;
        this.side = side;
        this.shape = shape;
        this.labelStyle = labelStyle;
        this.secondaryLabelStyle = secondaryLabelStyle;
        this.brightness = brightness;
        this.elevation = elevation;
        this.pressElevation = pressElevation;
    }
}

class ChipTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(ChipTheme);
        return widget ? widget.data : null;
    }
}

export {
    ChipTheme,
    ChipThemeData
};
