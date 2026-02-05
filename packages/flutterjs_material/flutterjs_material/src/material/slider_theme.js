// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class SliderThemeData {
    constructor({
        trackHeight,
        activeTrackColor,
        inactiveTrackColor,
        disabledActiveTrackColor,
        disabledInactiveTrackColor,
        activeTickMarkColor,
        inactiveTickMarkColor,
        disabledActiveTickMarkColor,
        disabledInactiveTickMarkColor,
        thumbColor,
        overlappingShapeStrokeColor,
        disabledThumbColor,
        overlayColor,
        valueIndicatorColor,
        overlayShape,
        tickMarkShape,
        thumbShape,
        trackShape,
        valueIndicatorShape,
        rangeTickMarkShape,
        rangeThumbShape,
        rangeTrackShape,
        rangeValueIndicatorShape,
        showValueIndicator,
        valueIndicatorTextStyle,
        minThumbSeparation,
        thumbSelector,
        mouseCursor,
    } = {}) {
        this.trackHeight = trackHeight;
        this.activeTrackColor = activeTrackColor;
        this.inactiveTrackColor = inactiveTrackColor;
        this.thumbColor = thumbColor;
        this.overlayColor = overlayColor;
        // ... assign others
    }
}

class SliderTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(SliderTheme);
        return widget ? widget.data : null;
    }
}

export {
    SliderTheme,
    SliderThemeData
};
