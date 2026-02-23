// Flutter foundation/change_notifier.dart → JS
// Listenable, ValueListenable, ChangeNotifier, ValueNotifier

export class Listenable {
  addListener(listener) { throw new Error('addListener not implemented'); }
  removeListener(listener) { throw new Error('removeListener not implemented'); }

  static merge(listenables) {
    return new _MergingListenable(listenables);
  }
}

export class ValueListenable extends Listenable {
  get value() { throw new Error('value getter not implemented'); }
}

export class ChangeNotifier extends Listenable {
  constructor() {
    super();
    this._listeners = [];
    this._notifying = false;
    this._pendingRemovals = [];
    this._disposed = false;
  }

  get hasListeners() {
    return this._listeners.length > 0;
  }

  addListener(listener) {
    if (this._disposed) throw new Error(`${this.constructor.name} was used after being disposed.`);
    this._listeners.push(listener);
  }

  removeListener(listener) {
    if (this._disposed) return;
    if (this._notifying) {
      // Mark for removal after notification cycle completes
      const idx = this._listeners.indexOf(listener);
      if (idx !== -1) {
        this._listeners[idx] = null;
        this._pendingRemovals.push(idx);
      }
    } else {
      const idx = this._listeners.indexOf(listener);
      if (idx !== -1) this._listeners.splice(idx, 1);
    }
  }

  dispose() {
    if (this._disposed) throw new Error(`${this.constructor.name} already disposed.`);
    this._disposed = true;
    this._listeners = [];
  }

  notifyListeners() {
    if (this._disposed) throw new Error(`${this.constructor.name} was used after being disposed.`);
    if (this._listeners.length === 0) return;

    this._notifying = true;
    const snapshot = this._listeners.slice();
    for (const listener of snapshot) {
      if (listener !== null) {
        try {
          listener();
        } catch (e) {
          console.error(`Error in ChangeNotifier listener for ${this.constructor.name}:`, e);
        }
      }
    }
    this._notifying = false;

    // Clean up nulled-out listeners
    if (this._pendingRemovals.length > 0) {
      this._listeners = this._listeners.filter(l => l !== null);
      this._pendingRemovals = [];
    }
  }

  static debugAssertNotDisposed(notifier) {
    if (notifier._disposed) {
      throw new Error(`A ${notifier.constructor.name} was used after being disposed.`);
    }
    return true;
  }

  static maybeDispatchObjectCreation(object) {
    // No-op in web JS — memory allocation tracking not applicable
  }
}

class _MergingListenable extends Listenable {
  constructor(children) {
    super();
    this._children = [...children].filter(c => c != null);
  }

  addListener(listener) {
    for (const child of this._children) child.addListener(listener);
  }

  removeListener(listener) {
    for (const child of this._children) child.removeListener(listener);
  }

  toString() {
    return `Listenable.merge([${this._children.join(', ')}])`;
  }
}

export class ValueNotifier extends ChangeNotifier {
  constructor(value) {
    super();
    this._value = value;
  }

  get value() { return this._value; }
  set value(newValue) {
    if (this._value === newValue) return;
    this._value = newValue;
    this.notifyListeners();
  }

  toString() {
    return `ValueNotifier(${this._value})`;
  }
}
