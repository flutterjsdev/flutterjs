// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class FloatingActionButtonThemeData {
    constructor({
        foregroundColor,
        backgroundColor,
        focusColor,
        hoverColor,
        splashColor,
        elevation,
        focusElevation,
        hoverElevation,
        disabledElevation,
        highlightElevation,
        shape,
        enableFeedback,
        iconSize,
        sizeConstraints,
        smallSizeConstraints,
        largeSizeConstraints,
        extendedSizeConstraints,
        extendedIconLabelSpacing,
        extendedPadding,
        extendedTextStyle,
    } = {}) {
        this.foregroundColor = foregroundColor;
        this.backgroundColor = backgroundColor;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.splashColor = splashColor;
        this.elevation = elevation;
        this.focusElevation = focusElevation;
        this.hoverElevation = hoverElevation;
        this.disabledElevation = disabledElevation;
        this.highlightElevation = highlightElevation;
        this.shape = shape;
        this.enableFeedback = enableFeedback;
        this.iconSize = iconSize;
        this.sizeConstraints = sizeConstraints;
        this.smallSizeConstraints = smallSizeConstraints;
        this.largeSizeConstraints = largeSizeConstraints;
        this.extendedSizeConstraints = extendedSizeConstraints;
        this.extendedIconLabelSpacing = extendedIconLabelSpacing;
        this.extendedPadding = extendedPadding;
        this.extendedTextStyle = extendedTextStyle;
    }
}

class FloatingActionButtonTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(FloatingActionButtonTheme);
        return widget ? widget.data : null;
    }
}

export {
    FloatingActionButtonTheme,
    FloatingActionButtonThemeData
};
