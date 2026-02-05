// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class PriorityQueue {
    constructor(comparison) {
        this.comparison = comparison || ((a, b) => a < b ? -1 : (a > b ? 1 : 0));
        this._queue = [];
        this._modificationCount = 0;
    }

    get length() {
        return this._queue.length;
    }

    get isEmpty() {
        return this._queue.length === 0;
    }

    get isNotEmpty() {
        return this._queue.length > 0;
    }

    get first() {
        if (this._queue.length === 0) throw new Error("No element");
        return this._queue[0];
    }

    add(element) {
        this._modificationCount++;
        this._queue.push(element);
        this._bubbleUp(this._queue.length - 1);
    }

    addAll(elements) {
        for (const element of elements) {
            this.add(element);
        }
    }

    removeFirst() {
        if (this._queue.length === 0) throw new Error("No element");
        this._modificationCount++;
        const result = this._queue[0];
        const last = this._queue.pop();
        if (this._queue.length > 0) {
            this._queue[0] = last;
            this._bubbleDown(0);
        }
        return result;
    }

    remove(element) {
        // Find index
        const index = this._queue.indexOf(element);
        if (index < 0) return false;

        this._modificationCount++;
        const last = this._queue.pop();
        if (index < this._queue.length) {
            this._queue[index] = last;
            this._bubbleDown(index);
            this._bubbleUp(index);
        }
        return true;
    }

    contains(object) {
        return this._queue.includes(object);
    }

    toList() {
        // Note: The order of elements in the list is not guaranteed to be sorted
        // for a standard HeapPriorityQueue unless consumed. 
        // Dart's PriorityQueue.toList() says "The order of the elements is not guaranteed."
        return [...this._queue];
    }

    toUnorderedList() {
        return [...this._queue];
    }

    toSet() {
        return new Set(this._queue);
    }

    clear() {
        this._queue = [];
        this._modificationCount++;
    }

    _bubbleUp(index) {
        while (index > 0) {
            const parentIndex = (index - 1) >>> 1;
            if (this.comparison(this._queue[index], this._queue[parentIndex]) >= 0) break;
            this._swap(index, parentIndex);
            index = parentIndex;
        }
    }

    _bubbleDown(index) {
        const length = this._queue.length;
        while (true) {
            const leftChild = (index * 2) + 1;
            if (leftChild >= length) break;
            let rightChild = leftChild + 1;
            let minChild = leftChild;
            if (rightChild < length && this.comparison(this._queue[rightChild], this._queue[leftChild]) < 0) {
                minChild = rightChild;
            }
            if (this.comparison(this._queue[index], this._queue[minChild]) <= 0) break;
            this._swap(index, minChild);
            index = minChild;
        }
    }

    _swap(i, j) {
        const temp = this._queue[i];
        this._queue[i] = this._queue[j];
        this._queue[j] = temp;
    }
}
