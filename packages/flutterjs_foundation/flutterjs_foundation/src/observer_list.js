// Flutter foundation/observer_list.dart → JS

export class ObserverList {
  constructor() {
    this._list = [];
  }

  add(item) { this._list.push(item); }

  remove(item) {
    const idx = this._list.indexOf(item);
    if (idx !== -1) { this._list.splice(idx, 1); return true; }
    return false;
  }

  contains(item) { return this._list.includes(item); }

  get isEmpty() { return this._list.length === 0; }
  get isNotEmpty() { return this._list.length > 0; }

  [Symbol.iterator]() { return this._list[Symbol.iterator](); }
  toList() { return this._list.slice(); }
}

export class HashedObserverList {
  constructor() {
    this._set = new Set();
    this._list = [];
  }

  add(item) {
    if (!this._set.has(item)) {
      this._set.add(item);
      this._list.push(item);
    }
  }

  remove(item) {
    if (this._set.delete(item)) {
      const idx = this._list.indexOf(item);
      if (idx !== -1) this._list.splice(idx, 1);
      return true;
    }
    return false;
  }

  contains(item) { return this._set.has(item); }

  get isEmpty() { return this._set.size === 0; }
  get isNotEmpty() { return this._set.size > 0; }

  [Symbol.iterator]() { return this._list[Symbol.iterator](); }
  toList() { return this._list.slice(); }
}
