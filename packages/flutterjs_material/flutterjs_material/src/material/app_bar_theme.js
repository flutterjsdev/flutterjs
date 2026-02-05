// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


export class AppBarTheme {
    constructor({
        color,
        backgroundColor,
        foregroundColor,
        elevation,
        shadowColor,
        surfaceTintColor,
        centerTitle,
        titleSpacing,
        toolbarHeight,
        toolbarTextStyle,
        titleTextStyle,
        systemOverlayStyle,
    } = {}) {
        this.color = color;
        this.backgroundColor = backgroundColor;
        this.foregroundColor = foregroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.centerTitle = centerTitle;
        this.titleSpacing = titleSpacing;
        this.toolbarHeight = toolbarHeight;
        this.toolbarTextStyle = toolbarTextStyle;
        this.titleTextStyle = titleTextStyle;
        this.systemOverlayStyle = systemOverlayStyle;
    }
}
