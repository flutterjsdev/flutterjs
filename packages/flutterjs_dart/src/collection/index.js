// dart:collection implementation

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
export const HashSet = Set;

export * from './priority_queue.js';
export * from './queue_list.js';
