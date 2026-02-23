// Flutter foundation/key.dart → JS
// Key, LocalKey, UniqueKey, ValueKey

let _uniqueKeyCounter = 0;

export class Key {
  // Key(String value) factory → ValueKey<String>
  static create(value) {
    return new ValueKey(value);
  }
}

export class LocalKey extends Key {}

export class UniqueKey extends LocalKey {
  constructor() {
    super();
    this._id = ++_uniqueKeyCounter;
  }
  toString() {
    return `[#${this._id.toString(16).padStart(5, '0')}]`;
  }
}

export class ValueKey extends LocalKey {
  constructor(value) {
    super();
    this.value = value;
  }
  equals(other) {
    if (!(other instanceof ValueKey)) return false;
    return other.value === this.value;
  }
  toString() {
    const v = typeof this.value === 'string' ? `<'${this.value}'>` : `<${this.value}>`;
    return `[${v}]`;
  }
}
