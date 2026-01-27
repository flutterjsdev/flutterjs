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
export default {
    Iterator,
    Iterable,
    Comparable,
};
