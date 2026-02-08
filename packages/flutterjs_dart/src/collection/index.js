// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// dart:collection implementation

export * from './queue.js';

export class LinkedList {
    constructor() {
        this._head = null;
        this._tail = null;
        this._length = 0;
    }

    add(entry) {
        if (!this._head) {
            this._head = entry;
            this._tail = entry;
        } else {
            this._tail.next = entry;
            entry.previous = this._tail;
            this._tail = entry;
        }
        this._length++;
    }

    // Minimal implementation for now
    get length() { return this._length; }
}

export class LinkedListEntry {
    constructor() {
        this.list = null;
        this.previous = null;
        this.next = null;
    }

    unlink() {
        // TODO impl
    }
}

// Maps and Sets are just native JS Map/Set usually, but we can export helpers
export const HashMap = Map;
export const LinkedHashMap = Map;
export const HashSet = Set;

export class UnmodifiableListView {
    constructor(source) {
        this._list = Array.from(source);
    }
    get length() { return this._list.length; }
    operator_get(index) { return this._list[index]; }
}

export class UnmodifiableMapView {
    constructor(source) {
        this._map = source;
    }
}

export class MapView {
    constructor(source) {
        this._map = source;
    }
}

export class UnmodifiableSetView {
    constructor(source) {
        this._set = source;
    }
}

export class ListMixin {
    get isEmpty() { return this.length === 0; }
    get isNotEmpty() { return this.length > 0; }
}
export class MapMixin {
    get isEmpty() { return this.length === 0; }
    get isNotEmpty() { return this.length > 0; }
}
export class SetMixin {
    get isEmpty() { return this.length === 0; }
    get isNotEmpty() { return this.length > 0; }
}

export class IterableBase { }
export class ListBase extends ListMixin { }
export class MapBase extends MapMixin { }
export class SetBase extends SetMixin { }
export class UnmodifiableMapBase extends MapMixin { }
export class CanonicalizedMap extends Map { }

export * from './priority_queue.js';
export * from './queue_list.js';
