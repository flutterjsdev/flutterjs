// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class EdgeInsets {
  constructor(top = 0, right = 0, bottom = 0, left = 0) {
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
  }

  static zero() {
    return new EdgeInsets(0, 0, 0, 0);
  }

  static all(value) {
    return new EdgeInsets(value, value, value, value);
  }

  static symmetric({ vertical = 0, horizontal = 0 } = {}) {
    return new EdgeInsets(vertical, horizontal, vertical, horizontal);
  }

  static only({ top = 0, right = 0, bottom = 0, left = 0 } = {}) {
    return new EdgeInsets(top, right, bottom, left);
  }

  static fromLTRB(left, top, right, bottom) {
    return new EdgeInsets(top, right, bottom, left);
  }

  get vertical() {
    return this.top + this.bottom;
  }

  get horizontal() {
    return this.left + this.right;
  }

  get isNonNegative() {
    return this.top >= 0 && this.right >= 0 && this.bottom >= 0 && this.left >= 0;
  }

  get isZero() {
    return this.top === 0 && this.right === 0 && this.bottom === 0 && this.left === 0;
  }

  add(other) {
    return new EdgeInsets(
      this.top + other.top,
      this.right + other.right,
      this.bottom + other.bottom,
      this.left + other.left
    );
  }

  copyWith({ top, right, bottom, left } = {}) {
    return new EdgeInsets(
      top ?? this.top,
      right ?? this.right,
      bottom ?? this.bottom,
      left ?? this.left
    );
  }

  equals(other) {
    if (!other || !(other instanceof EdgeInsets)) {
      return false;
    }
    return this.top === other.top &&
      this.right === other.right &&
      this.bottom === other.bottom &&
      this.left === other.left;
  }

  toCSSString() {
    return `${this.top}px ${this.right}px ${this.bottom}px ${this.left}px`;
  }

  toCSSShorthand() {
    const { top, right, bottom, left } = this;
    if (top === right && right === bottom && bottom === left) {
      return `${top}px`;
    }
    if (top === bottom && right === left) {
      return `${top}px ${right}px`;
    }
    return this.toCSSString();
  }

  toCSSMargin() {
    return this.toCSSString();
  }

  toCSSPadding() {
    return this.toCSSString();
  }

  toString() {
    return `EdgeInsets(${this.top}, ${this.right}, ${this.bottom}, ${this.left})`;
  }
}