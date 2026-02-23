// Flutter services/restoration.dart → JS

export function debugIsSerializableForRestoration(value) {
  // On web, anything JSON-serializable is fine
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

export class RestorationBucket {
  constructor({ restorationId, initialData = null }) {
    this.restorationId = restorationId;
    this._data = initialData ?? {};
    this._children = new Map();
  }

  read(key) { return this._data[key] ?? null; }
  write(key, value) { this._data[key] = value; }
  remove(key) { delete this._data[key]; }
  contains(key) { return Object.prototype.hasOwnProperty.call(this._data, key); }

  claimChild(restorationId, { debugOwner = null } = {}) {
    if (!this._children.has(restorationId)) {
      this._children.set(restorationId, new RestorationBucket({
        restorationId,
        initialData: this._data[restorationId],
      }));
    }
    return this._children.get(restorationId);
  }

  adoptChild(bucket) {
    this._children.set(bucket.restorationId, bucket);
  }

  dispose() {
    this._data = {};
    this._children.clear();
  }
}

export class RestorationManager {
  constructor() {
    this._rootBucket = null;
    this._listeners = [];
  }

  get rootBucket() {
    if (!this._rootBucket) {
      // Try to load from sessionStorage
      try {
        const saved = sessionStorage.getItem('flutter_restoration');
        const data = saved ? JSON.parse(saved) : {};
        this._rootBucket = new RestorationBucket({ restorationId: 'root', initialData: data });
      } catch {
        this._rootBucket = new RestorationBucket({ restorationId: 'root' });
      }
    }
    return Promise.resolve(this._rootBucket);
  }

  flushData() {
    if (this._rootBucket) {
      try {
        sessionStorage.setItem('flutter_restoration', JSON.stringify(this._rootBucket._data));
      } catch {
        // sessionStorage not available or quota exceeded
      }
    }
  }

  addListener(listener) { this._listeners.push(listener); }
  removeListener(listener) {
    const i = this._listeners.indexOf(listener);
    if (i !== -1) this._listeners.splice(i, 1);
  }
}
