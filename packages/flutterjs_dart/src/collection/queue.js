// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class Queue {
    constructor() {
        this._list = [];
    }

    add(value) { this._list.push(value); }
    addFirst(value) { this._list.unshift(value); }
    addLast(value) { this._list.push(value); }

    removeFirst() { return this._list.shift(); }
    removeLast() { return this._list.pop(); }

    get first() { return this._list[0]; }
    get last() { return this._list[this._list.length - 1]; }
    get length() { return this._list.length; }
    get isEmpty() { return this._list.length === 0; }
    get isNotEmpty() { return this._list.length > 0; }

    toList() { return [...this._list]; }
}
