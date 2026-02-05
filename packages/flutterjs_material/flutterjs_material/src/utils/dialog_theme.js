// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Color } from '../utils/color.js';
import { EdgeInsets } from '../utils/edge_insets.js';

/**
 * DialogTheme - Theme data for Dialogs
 */
class DialogTheme {
    constructor({
        backgroundColor,
        elevation,
        shadowColor = 'rgba(0, 0, 0, 0.2)',
        surfaceTintColor,
        shape,
        alignment,
        titleTextStyle,
        contentTextStyle,
        actionsPadding
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.shape = shape;
        this.alignment = alignment;
        this.titleTextStyle = titleTextStyle;
        this.contentTextStyle = contentTextStyle;
        this.actionsPadding = actionsPadding;
    }
}

export { DialogTheme };
