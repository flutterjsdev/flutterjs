/**
 * Key classes for widget identification and state preservation
 */

// ============================================================================
// KEY CLASSES
// ============================================================================

class Key {
    constructor() {
        if (new.target === Key) {
            throw new Error('Key is abstract');
        }
    }
}

class ValueKey extends Key {
    constructor(value) {
        super();
        this.value = value;
    }

    equals(other) {
        return other instanceof ValueKey && this.value === other.value;
    }

    toString() {
        return `ValueKey(${this.value})`;
    }
}

class ObjectKey extends Key {
    constructor(value) {
        super();
        this.value = value;
    }

    equals(other) {
        return other instanceof ObjectKey && this.value === other.value;
    }

    toString() {
        return `ObjectKey(${this.value})`;
    }
}

class GlobalKey extends Key {
    constructor(debugLabel = null) {
        super();
        this.debugLabel = debugLabel;
        this._currentElement = null;
    }

    get currentContext() {
        return this._currentElement?.context || null;
    }

    get currentWidget() {
        return this._currentElement?.widget || null;
    }

    get currentState() {
        return this._currentElement?.state || null;
    }

    equals(other) {
        return other instanceof GlobalKey && this === other;
    }

    toString() {
        return `GlobalKey${this.debugLabel ? `(${this.debugLabel})` : ''}`;
    }
}

export { Key, ValueKey, ObjectKey, GlobalKey };
