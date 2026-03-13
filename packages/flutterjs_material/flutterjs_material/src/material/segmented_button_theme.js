// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { InheritedWidget } from '../core/widget_element.js';

/**
 * SegmentedButtonThemeData holds the theme configuration for SegmentedButton.
 */
export class SegmentedButtonThemeData {
    constructor({
        style,
        selectedIcon,
    } = {}) {
        this.style = style;
        this.selectedIcon = selectedIcon;
    }
}

/**
 * Applies a theme to SegmentedButton descendants.
 */
export class SegmentedButtonTheme extends InheritedWidget {
    constructor({
        key,
        data,
        child,
    } = {}) {
        super(key);
        this.data = data;
        this.child = child;
    }

    static of(context) {
        // Placeholder: return empty theme data if not found in context
        return new SegmentedButtonThemeData();
    }
}
