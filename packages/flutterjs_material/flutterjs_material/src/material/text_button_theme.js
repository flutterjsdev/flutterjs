// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


import { ButtonStyle } from './button_style.js';

export class TextButtonThemeData {
    constructor({
        style
    } = {}) {
        this.style = style;
    }

    // Convert to JSON for VDOM/Props
    toJson() {
        return {
            style: this.style
        };
    }
}

export class TextButtonTheme {
    constructor({ data, child, key } = {}) {
        this.data = data;
        this.child = child;
        this.key = key;
    }

    static of(context) {
        return new TextButtonThemeData();
    }
}
