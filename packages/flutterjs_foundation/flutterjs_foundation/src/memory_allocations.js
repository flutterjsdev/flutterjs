// Flutter foundation/memory_allocations.dart → JS (stubs — no VM memory tracking on web)

export class ObjectEvent {
  constructor(object) {
    this.object = object;
  }
}

export class ObjectCreated extends ObjectEvent {
  constructor(object) { super(object); }
}

export class ObjectDisposed extends ObjectEvent {
  constructor(object) { super(object); }
}

export class FlutterMemoryAllocations {
  static get instance() {
    if (!FlutterMemoryAllocations._instance) {
      FlutterMemoryAllocations._instance = new FlutterMemoryAllocations();
    }
    return FlutterMemoryAllocations._instance;
  }

  constructor() { this._listeners = []; }

  get hasListeners() { return this._listeners.length > 0; }

  addListener(listener) { this._listeners.push(listener); }
  removeListener(listener) {
    const i = this._listeners.indexOf(listener);
    if (i !== -1) this._listeners.splice(i, 1);
  }

  dispatchObjectCreated({ library, className, object }) {
    if (this._listeners.length > 0) {
      this._notify(new ObjectCreated(object));
    }
  }

  dispatchObjectDisposed({ object }) {
    if (this._listeners.length > 0) {
      this._notify(new ObjectDisposed(object));
    }
  }

  _notify(event) {
    for (const l of this._listeners) {
      try { l(event); } catch (e) { console.error('FlutterMemoryAllocations listener error:', e); }
    }
  }
}
