// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class DatePickerThemeData {
    constructor({
        backgroundColor,
        elevation,
        shadowColor,
        surfaceTintColor,
        shape,
        headerBackgroundColor,
        headerForegroundColor,
        dayBackgroundColor,
        dayForegroundColor,
        dayOverlayColor,
        todayBackgroundColor,
        todayForegroundColor,
        todayBorder,
        yearBackgroundColor,
        yearForegroundColor,
        yearOverlayColor,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.shape = shape;
        this.headerBackgroundColor = headerBackgroundColor;
        this.headerForegroundColor = headerForegroundColor;
        this.dayBackgroundColor = dayBackgroundColor;
        this.dayForegroundColor = dayForegroundColor;
        this.dayOverlayColor = dayOverlayColor;
        this.todayBackgroundColor = todayBackgroundColor;
        this.todayForegroundColor = todayForegroundColor;
        this.todayBorder = todayBorder;
        this.yearBackgroundColor = yearBackgroundColor;
        this.yearForegroundColor = yearForegroundColor;
        this.yearOverlayColor = yearOverlayColor;
    }
}

class DatePickerTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(DatePickerTheme);
        return widget ? widget.data : null;
    }
}

export {
    DatePickerTheme,
    DatePickerThemeData
};
