// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { InheritedWidget } from '../core/widget_element.js';

export class SearchBarThemeData {
    constructor({
        elevation, backgroundColor, shadowColor, surfaceTintColor,
        overlayColor, side, shape, padding, textStyle, hintStyle, constraints,
    } = {}) {
        Object.assign(this, {
            elevation, backgroundColor, shadowColor, surfaceTintColor,
            overlayColor, side, shape, padding, textStyle, hintStyle, constraints,
        });
    }
}

export class SearchBarTheme extends InheritedWidget {
    constructor({ key, data, child } = {}) {
        super(key);
        this.data = data;
        this.child = child;
    }
    static of(context) { return new SearchBarThemeData(); }
}

export class SearchViewThemeData {
    constructor({
        backgroundColor, elevation, surfaceTintColor, constraints,
        side, shape, headerTextStyle, headerHintStyle, dividerColor,
    } = {}) {
        Object.assign(this, {
            backgroundColor, elevation, surfaceTintColor, constraints,
            side, shape, headerTextStyle, headerHintStyle, dividerColor,
        });
    }
}

export class SearchViewTheme extends InheritedWidget {
    constructor({ key, data, child } = {}) {
        super(key);
        this.data = data;
        this.child = child;
    }
    static of(context) { return new SearchViewThemeData(); }
}

export class DropdownMenuThemeData {
    constructor({ textStyle, inputDecorationTheme, menuStyle } = {}) {
        Object.assign(this, { textStyle, inputDecorationTheme, menuStyle });
    }
}

export class DropdownMenuTheme extends InheritedWidget {
    constructor({ key, data, child } = {}) {
        super(key);
        this.data = data;
        this.child = child;
    }
    static of(context) { return new DropdownMenuThemeData(); }
}
