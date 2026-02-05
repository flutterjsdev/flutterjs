// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class BorderRadius {
    constructor({
        topLeft = 0,
        topRight = 0,
        bottomLeft = 0,
        bottomRight = 0
    } = {}) {
        this.topLeft = topLeft;
        this.topRight = topRight;
        this.bottomLeft = bottomLeft;
        this.bottomRight = bottomRight;
    }

    static all(radius) {
        return new BorderRadius({
            topLeft: radius,
            topRight: radius,
            bottomLeft: radius,
            bottomRight: radius
        });
    }

    static circular(radius) {
        return BorderRadius.all(radius);
    }

    static zero() {
        return BorderRadius.all(0);
    }

    static only({
        topLeft = 0,
        topRight = 0,
        bottomLeft = 0,
        bottomRight = 0
    } = {}) {
        return new BorderRadius({
            topLeft,
            topRight,
            bottomLeft,
            bottomRight
        });
    }

    resolve(direction) {
        return this; // Simplified
    }
}
