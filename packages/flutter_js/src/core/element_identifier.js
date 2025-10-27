// @flutterjs/core/element_identifier.js

/**
 * ElementIdentifier - Manages unique identification for elements in widget tree
 * Similar to Flutter's element identification system
 */
class ElementIdentifier {
    constructor() {
        this._elementCounter = 0;
        this._keyedElements = new Map();  // key -> element mapping
        this._unKeyedElements = [];        // unkeyed elements by position
    }

    /**
     * Generate or retrieve element ID
     * Supports both keyed and unkeyed identification strategies
     */
    getElementId(element, prevElement = null) {
        // Strategy 1: Explicit key (strongest identification)
        if (element.widget.key) {
            return this._getKeyedId(element);
        }

        // Strategy 2: Runtimetype + position (medium identification)
        return this._getUnkeyedId(element, prevElement);
    }

    /**
     * Keyed identification - uses explicit keys for stability
     * Widget can be moved around tree but still recognized
     */
    _getKeyedId(element) {
        const key = element.widget.key;
        const runtimeType = element.widget.constructor.name;

        if (!this._keyedElements.has(key)) {
            this._keyedElements.set(key, element);
        }

        return `keyed-${runtimeType}-${key}`;
    }

    /**
     * Unkeyed identification - uses runtime type + position
     * Position-based, so moving widget breaks identity
     */
    _getUnkeyedId(element, prevElement = null) {
        const runtimeType = element.widget.constructor.name;
        const parent = element._parent;

        if (!parent) {
            return `unkeyed-${runtimeType}-root`;
        }

        // Find position among siblings of same type
        const siblings = parent._children.filter(
            child => child.widget.constructor.name === runtimeType
        );
        const position = siblings.indexOf(element);

        return `unkeyed-${runtimeType}-${position}`;
    }

    /**
     * Generate complete widget path for debugging
     */
    getWidgetPath(element) {
        const path = [];
        let current = element;

        while (current) {
            const typeLabel = current.widget.constructor.name;
            const keyLabel = current.widget.key ? `[${current.widget.key}]` : '';
            path.unshift(`${typeLabel}${keyLabel}`);
            current = current._parent;
        }

        return path.join(' > ');
    }

    /**
     * Find element by ID in tree (for re-identification)
     */
    findElementById(id, rootElement) {
        const stack = [rootElement];

        while (stack.length > 0) {
            const current = stack.pop();

            if (this.getElementId(current) === id) {
                return current;
            }

            stack.push(...current._children);
        }

        return null;
    }

    /**
     * Clear cache when tree changes
     */
    invalidateCache() {
        this._keyedElements.clear();
        this._unKeyedElements = [];
    }
}

// ============================================================================
// Export
// ============================================================================

export { ElementIdentifier };