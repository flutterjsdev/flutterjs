// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Offset } from './geometry.js';
export class BoxShadow {
  constructor({
    color = '#000000',
    offset = Offset.zero(),
    blurRadius = 0,
    spreadRadius = 0
  } = {}) {
    this.color = (color && typeof color.toCSSString === 'function') ? color.toCSSString() : color;
    this.offset = offset;
    this.blurRadius = blurRadius;
    this.spreadRadius = spreadRadius;
  }

  toCSSString() {
    return `${this.offset.dx}px ${this.offset.dy}px ${this.blurRadius}px ${this.spreadRadius}px ${this.color}`;
  }

  toString() {
    return `BoxShadow(color: ${this.color}, blur: ${this.blurRadius})`;
  }
}