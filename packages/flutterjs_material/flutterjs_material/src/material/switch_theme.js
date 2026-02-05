// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '@flutterjs/runtime';

class SwitchThemeData {
    constructor({
        thumbColor,
        trackColor,
        trackOutlineColor,
        trackOutlineWidth,
        materialTapTargetSize,
        mouseCursor,
        overlayColor,
        splashRadius,
        thumbIcon,
    } = {}) {
        this.thumbColor = thumbColor;
        this.trackColor = trackColor;
        this.trackOutlineColor = trackOutlineColor;
        this.trackOutlineWidth = trackOutlineWidth;
        this.materialTapTargetSize = materialTapTargetSize;
        this.mouseCursor = mouseCursor;
        this.overlayColor = overlayColor;
        this.splashRadius = splashRadius;
        this.thumbIcon = thumbIcon;
    }
}

class SwitchTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(SwitchTheme);
        return widget ? widget.data : null;
    }
}

export {
    SwitchTheme,
    SwitchThemeData
};
