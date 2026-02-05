// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class TooltipThemeData {
    constructor({
        height,
        padding,
        margin,
        verticalOffset,
        preferBelow,
        excludeFromSemantics,
        decoration,
        textStyle,
        textAlign,
        waitDuration,
        showDuration,
        triggerMode,
        enableFeedback,
    } = {}) {
        this.height = height;
        this.padding = padding;
        this.margin = margin;
        this.verticalOffset = verticalOffset;
        this.preferBelow = preferBelow;
        this.excludeFromSemantics = excludeFromSemantics;
        this.decoration = decoration;
        this.textStyle = textStyle;
        this.textAlign = textAlign;
        this.waitDuration = waitDuration;
        this.showDuration = showDuration;
        this.triggerMode = triggerMode;
        this.enableFeedback = enableFeedback;
    }
}

class TooltipTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(TooltipTheme);
        return widget ? widget.data : null;
    }
}

export {
    TooltipTheme,
    TooltipThemeData
};
