// Flutter foundation/synchronous_future.dart → JS
// SynchronousFuture - a Future that completes synchronously

export class SynchronousFuture {
  constructor(value) {
    this._value = value;
    this._resolved = true;
  }

  // Behaves like Promise for async/await usage
  then(onFulfilled, onRejected) {
    try {
      const result = onFulfilled ? onFulfilled(this._value) : this._value;
      return result instanceof SynchronousFuture ? result : new SynchronousFuture(result);
    } catch (e) {
      if (onRejected) return new SynchronousFuture(onRejected(e));
      throw e;
    }
  }

  // Make it thenable so async/await works
  [Symbol.toStringTag]() { return 'SynchronousFuture'; }

  // Convert to real Promise when needed
  toPromise() { return Promise.resolve(this._value); }

  static value(v) { return new SynchronousFuture(v); }
}
