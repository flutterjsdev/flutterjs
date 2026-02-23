// Flutter foundation/basic_types.dart → JS
// CachingIterable, Factory, lerpDuration
// Note: Dart typedefs (VoidCallback, ValueChanged, etc.) are not needed in JS
// as JS has no type system — functions are just functions.

export class CachingIterable {
  constructor(iterator) {
    this._iterator = iterator;
    this._results = [];
    this._exhausted = false;
  }

  _fillNext() {
    if (this._exhausted) return false;
    const next = this._iterator.next();
    if (next.done) {
      this._exhausted = true;
      return false;
    }
    this._results.push(next.value);
    return true;
  }

  _precacheAll() {
    while (this._fillNext()) {}
  }

  get length() {
    this._precacheAll();
    return this._results.length;
  }

  elementAt(index) {
    if (index < 0) throw new RangeError(`index (${index}) must be >= 0`);
    while (this._results.length <= index) {
      if (!this._fillNext()) throw new RangeError(`index (${index}) out of range`);
    }
    return this._results[index];
  }

  toList() {
    this._precacheAll();
    return this._results.slice();
  }

  [Symbol.iterator]() {
    let index = 0;
    return {
      next: () => {
        while (index >= this._results.length) {
          if (!this._fillNext()) return { done: true, value: undefined };
        }
        return { done: false, value: this._results[index++] };
      },
    };
  }

  map(fn) { return new CachingIterable(this.toList().map(fn)[Symbol.iterator]()); }
  where(fn) { return new CachingIterable(this.toList().filter(fn)[Symbol.iterator]()); }
  expand(fn) { return new CachingIterable(this.toList().flatMap(x => [...fn(x)])[Symbol.iterator]()); }
  take(n) { return new CachingIterable(this.toList().slice(0, n)[Symbol.iterator]()); }
  skip(n) { return new CachingIterable(this.toList().slice(n)[Symbol.iterator]()); }
  takeWhile(fn) {
    const result = [];
    for (const x of this) { if (!fn(x)) break; result.push(x); }
    return new CachingIterable(result[Symbol.iterator]());
  }
  skipWhile(fn) {
    const arr = this.toList();
    let i = 0;
    while (i < arr.length && fn(arr[i])) i++;
    return new CachingIterable(arr.slice(i)[Symbol.iterator]());
  }
}

export class Factory {
  constructor(constructor) {
    this.constructor_ = constructor;
  }

  create() {
    return this.constructor_();
  }

  get type() {
    return this.constructor_.name || 'unknown';
  }

  toString() {
    return `Factory(type: ${this.type})`;
  }
}

export function lerpDuration(a, b, t) {
  // Durations as milliseconds in JS (Dart uses microseconds)
  const aMicros = a instanceof Duration ? a.inMicroseconds : (a * 1000);
  const bMicros = b instanceof Duration ? b.inMicroseconds : (b * 1000);
  const lerped = Math.round(aMicros + (bMicros - aMicros) * t);
  return new Duration(lerped);
}

// Minimal Duration class for lerpDuration compatibility
class Duration {
  constructor(microseconds) {
    this.inMicroseconds = microseconds;
    this.inMilliseconds = Math.floor(microseconds / 1000);
  }
  static fromMilliseconds(ms) { return new Duration(ms * 1000); }
  toString() { return `Duration(${this.inMilliseconds}ms)`; }
}
