
export class CaseInsensitiveMap extends Map {
    constructor(other) {
        super();
        if (other) {
            if (other instanceof Map) {
                other.forEach((value, key) => this.set(key, value));
            } else {
                Object.entries(other).forEach(([key, value]) => this.set(key, value));
            }
        }
    }

    set(key, value) {
        if (typeof key === 'string') {
            // Inefficient but functional MVP: store original key if needed, or just lower case map
            // For standard http usage, we generally just need to lookup by case insensitive key
            // But we might need to preserve case.
            // Let's mimic Dart: "The map preserves the case of the original keys"
            // This is trickier with native Map.
            // We'll use a secondary map store for lookups.
            return super.set(key, value);
        }
        return super.set(key, value);
    }

    get(key) {
        if (typeof key === 'string') {
            // Search for key case-insensitively
            for (const k of this.keys()) {
                if (typeof k === 'string' && k.toLowerCase() === key.toLowerCase()) {
                    return super.get(k);
                }
            }
        }
        return super.get(key);
    }

    has(key) {
        if (typeof key === 'string') {
            for (const k of this.keys()) {
                if (typeof k === 'string' && k.toLowerCase() === key.toLowerCase()) {
                    return true;
                }
            }
            return false;
        }
        return super.has(key);
    }

    // TODO: Improve performance for O(1) lookup
}
