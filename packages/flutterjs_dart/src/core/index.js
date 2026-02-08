// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// dart:core - Core Dart types and interfaces
// ============================================================================

/**
 * Iterator interface - base for all iterators
 */
export class Iterator {
    get current() {
        throw new Error('Iterator.current must be implemented');
    }

    moveNext() {
        throw new Error('Iterator.moveNext must be implemented');
    }
}

/**
 * Iterable interface - base for all iterables
 */
export class Iterable {
    get iterator() {
        throw new Error('Iterable.iterator must be implemented');
    }

    *[Symbol.iterator]() {
        const it = this.iterator;
        while (it.moveNext()) {
            yield it.current;
        }
    }
}

/**
 * Comparable interface
 */
export class Comparable {
    compareTo(other) {
        throw new Error('Comparable.compareTo must be implemented');
    }
}

// Export all core types
import { Uri } from './uri.js';
export { Uri };

export default {
    Iterator,
    Iterable,
    Comparable,
    Uri,
};
