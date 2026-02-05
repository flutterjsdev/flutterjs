// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Size } from "./geometry.js";

export class BoxConstraints {
    constructor(minWidth = 0, maxWidth = Infinity, minHeight = 0, maxHeight = Infinity) {
        this.minWidth = minWidth;
        this.maxWidth = maxWidth;
        this.minHeight = minHeight;
        this.maxHeight = maxHeight;
    }

    static tight(size) {
        return new BoxConstraints(size.width, size.width, size.height, size.height);
    }

    static loose(size) {
        return new BoxConstraints(0, size.width, 0, size.height);
    }

    static expand({ width = Infinity, height = Infinity } = {}) {
        return new BoxConstraints(0, width, 0, height);
    }

    static tightFor({ width = null, height = null } = {}) {
        return new BoxConstraints(
            width ?? 0,
            width ?? Infinity,
            height ?? 0,
            height ?? Infinity
        );
    }

    get isTight() {
        return this.minWidth === this.maxWidth && this.minHeight === this.maxHeight;
    }

    get isNormalized() {
        return this.minWidth <= this.maxWidth && this.minHeight <= this.maxHeight;
    }

    debugAssertIsValid() {
        if (!(this.minWidth >= 0 && this.maxWidth >= this.minWidth &&
            this.minHeight >= 0 && this.maxHeight >= this.minHeight)) {
            throw new Error(
                `Invalid BoxConstraints: ${this.minWidth}..${this.maxWidth}, ${this.minHeight}..${this.maxHeight}`
            );
        }
        return true;
    }

    constrain(size) {
        return new Size(
            Math.max(this.minWidth, Math.min(this.maxWidth, size.width)),
            Math.max(this.minHeight, Math.min(this.maxHeight, size.height))
        );
    }

    /**
     * Returns a new BoxConstraints that respects the given constraints while being 
     * as close as possible to the original constraints.
     */
    enforce(constraints) {
        if (!constraints) return this;

        return new BoxConstraints(
            Math.max(this.minWidth, constraints.minWidth),
            Math.min(this.maxWidth, constraints.maxWidth),
            Math.max(this.minHeight, constraints.minHeight),
            Math.min(this.maxHeight, constraints.maxHeight)
        );
    }

    widthConstraints() {
        return new BoxConstraints(this.minWidth, this.maxWidth, 0, Infinity);
    }

    heightConstraints() {
        return new BoxConstraints(0, Infinity, this.minHeight, this.maxHeight);
    }

    tighten({ width = null, height = null } = {}) {
        return new BoxConstraints(
            width !== null ? Math.max(this.minWidth, width) : this.minWidth,
            width !== null ? Math.min(this.maxWidth, width) : this.maxWidth,
            height !== null ? Math.max(this.minHeight, height) : this.minHeight,
            height !== null ? Math.min(this.maxHeight, height) : this.maxHeight
        );
    }

    copyWith({ minWidth, maxWidth, minHeight, maxHeight } = {}) {
        return new BoxConstraints(
            minWidth ?? this.minWidth,
            maxWidth ?? this.maxWidth,
            minHeight ?? this.minHeight,
            maxHeight ?? this.maxHeight
        );
    }

    toString() {
        return `BoxConstraints(${this.minWidth}..${this.maxWidth}, ${this.minHeight}..${this.maxHeight})`;
    }
}
