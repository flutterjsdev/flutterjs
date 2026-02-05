// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class Duration {
  constructor(ms = 0) {
    this.ms = ms;
  }

  get seconds() {
    return this.ms / 1000;
  }

  get minutes() {
    return this.ms / 60000;
  }

  get inMilliseconds() {
    return this.ms;
  }

  static fromMilliseconds(ms) {
    return new Duration(ms);
  }

  static fromSeconds(s) {
    return new Duration(s * 1000);
  }

  static fromMinutes(m) {
    return new Duration(m * 60000);
  }

  compareTo(other) {
    return this.ms - other.ms;
  }

  toString() {
    return `Duration(${this.ms}ms)`;
  }
}