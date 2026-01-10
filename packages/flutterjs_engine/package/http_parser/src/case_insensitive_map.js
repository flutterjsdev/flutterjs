
export class CaseInsensitiveMap extends Map {
    constructor(other) {
        super();
        this._lowerCaseMap = new Map(); // Maps lower-case key to original key

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
            const lowerKey = key.toLowerCase();
            // If we already have this key (case-insensitive), we need to update the value
            // but preserve strict "original casing" rule for the main map?
            // Dart: "If the map previously contained a mapping for a key that equals [key] 
            // (case-insensitively), valid access uses the new key's case."
            // Wait, Dart 'http' says: "The map preserves the case of the *original* keys"
            // actually standard CaseInsensitiveMap usually normalizes access but preserves insertion case or updates it.

            // Let's remove any old key that matches
            if (this._lowerCaseMap.has(lowerKey)) {
                const oldKey = this._lowerCaseMap.get(lowerKey);
                super.delete(oldKey);
            }

            this._lowerCaseMap.set(lowerKey, key);
            return super.set(key, value);
        }
        return super.set(key, value);
    }

    get(key) {
        if (typeof key === 'string') {
            const lowerKey = key.toLowerCase();
            if (this._lowerCaseMap.has(lowerKey)) {
                return super.get(this._lowerCaseMap.get(lowerKey));
            }
        }
        return super.get(key);
    }

    has(key) {
        if (typeof key === 'string') {
            return this._lowerCaseMap.has(key.toLowerCase());
        }
        return super.has(key);
    }

    delete(key) {
        if (typeof key === 'string') {
            const lowerKey = key.toLowerCase();
            if (this._lowerCaseMap.has(lowerKey)) {
                const originalKey = this._lowerCaseMap.get(lowerKey);
                this._lowerCaseMap.delete(lowerKey);
                return super.delete(originalKey);
            }
        }
        return super.delete(key);
    }

    clear() {
        this._lowerCaseMap.clear();
        super.clear();
    }
}
