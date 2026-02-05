// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Color } from '../utils/color.js';

/**
 * ProgressIndicatorThemeData - Theme data for progress indicators
 */
class ProgressIndicatorThemeData {
    constructor({
        color = null,
        linearTrackColor = null,
        circularTrackColor = null,
        minHeight = null,
        refreshBackgroundColor = null
    } = {}) {
        this.color = color;
        this.linearTrackColor = linearTrackColor;
        this.circularTrackColor = circularTrackColor;
        this.minHeight = minHeight;
        this.refreshBackgroundColor = refreshBackgroundColor;
    }
}

export { ProgressIndicatorThemeData };
