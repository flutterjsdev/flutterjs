// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// dart:core StringBuffer implementation
export class StringBuffer {
    constructor(content = '') {
        this._buffer = String(content);
    }

    write(obj) {
        this._buffer += String(obj ?? '');
    }

    writeAll(objects, separator = '') {
        const sep = String(separator);
        for (let i = 0; i < objects.length; i++) {
            if (i > 0) this._buffer += sep;
            this._buffer += String(objects[i] ?? '');
        }
    }

    writeln(obj = '') {
        this._buffer += String(obj ?? '') + '\n';
    }

    writeCharCode(charCode) {
        this._buffer += String.fromCharCode(charCode);
    }

    clear() {
        this._buffer = '';
    }

    toString() {
        return this._buffer;
    }

    get length() {
        return this._buffer.length;
    }

    get isEmpty() {
        return this._buffer.length === 0;
    }

    get isNotEmpty() {
        return this._buffer.length > 0;
    }
}
