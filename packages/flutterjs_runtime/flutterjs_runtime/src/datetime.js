// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Dart DateTime Polyfill
 * Mimics dart:core DateTime class
 */
export class DateTime {
    constructor(date) {
        this._date = date instanceof Date ? date : new Date(date);
    }

    static now() {
        return new DateTime(new Date());
    }

    static fromMillisecondsSinceEpoch(millisecondsSinceEpoch, { isUtc = false } = {}) {
        return new DateTime(new Date(millisecondsSinceEpoch));
    }

    get millisecondsSinceEpoch() {
        return this._date.getTime();
    }

    get year() { return this._date.getFullYear(); }
    get month() { return this._date.getMonth() + 1; }
    get day() { return this._date.getDate(); }
    get hour() { return this._date.getHours(); }
    get minute() { return this._date.getMinutes(); }
    get second() { return this._date.getSeconds(); }
    get millisecond() { return this._date.getMilliseconds(); }
    get microsecond() { return 0; } // JS Date doesn't support microseconds

    toString() {
        // Basic implementation: 2026-01-24 11:41:17.102
        return this._date.toISOString().replace('T', ' ').replace('Z', '');
    }
}
