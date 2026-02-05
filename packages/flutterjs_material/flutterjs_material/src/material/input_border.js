// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Color } from '../utils/color.js';
import { EdgeInsets } from '../utils/edge_insets.js';

/**
 * InputBorder - Base class for input borders
 */
class InputBorder {
    constructor({
        borderSide = 'none' // 'none' or object
    } = {}) {
        this.borderSide = borderSide;
    }
}

/**
 * OutlineInputBorder - Default rectangular border
 */
class OutlineInputBorder extends InputBorder {
    constructor({
        borderRadius = 4,
        borderSide = null, // { color, width }
        gapPadding = 4
    } = {}) {
        super();
        this.borderRadius = borderRadius;
        this.gapPadding = gapPadding;

        // Handle borderSide shorthand or object
        if (borderSide) {
            this.borderSide = {
                color: borderSide.color || '#79747E', // M3 Outline variant fallback
                width: borderSide.width || 1,
                ...borderSide
            };
        } else {
            this.borderSide = {
                color: '#79747E',
                width: 1
            };
        }
    }

    copyWith({ borderRadius, borderSide, gapPadding } = {}) {
        return new OutlineInputBorder({
            borderRadius: borderRadius ?? this.borderRadius,
            borderSide: borderSide ?? this.borderSide,
            gapPadding: gapPadding ?? this.gapPadding
        });
    }

    toCSSObject() {
        return {
            border: `${this.borderSide.width}px solid ${this.borderSide.color}`,
            borderRadius: `${this.borderRadius}px`
        };
    }
}

/**
 * UnderlineInputBorder - Underline only border
 */
class UnderlineInputBorder extends InputBorder {
    constructor({
        borderSide = null
    } = {}) {
        super();

        if (borderSide) {
            this.borderSide = {
                color: borderSide.color || '#79747E',
                width: borderSide.width || 1,
                ...borderSide
            };
        } else {
            this.borderSide = {
                color: '#79747E',
                width: 1
            };
        }
    }

    copyWith({ borderSide } = {}) {
        return new UnderlineInputBorder({
            borderSide: borderSide ?? this.borderSide
        });
    }

    toCSSObject() {
        return {
            borderBottom: `${this.borderSide.width}px solid ${this.borderSide.color}`
        };
    }
}

export { InputBorder, OutlineInputBorder, UnderlineInputBorder };
