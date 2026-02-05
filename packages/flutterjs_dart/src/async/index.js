// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// dart:async implementation

export class Timer {
    constructor(duration, callback) {
        this._timer = setTimeout(callback, duration.inMilliseconds || duration);
    }

    static periodic(duration, callback) {
        const timer = new Timer(0, () => { });
        // Clear initial timeout, set interval
        clearTimeout(timer._timer);
        timer._timer = setInterval(() => callback(timer), duration.inMilliseconds || duration);
        return timer;
    }

    static run(callback) {
        setTimeout(callback, 0);
    }

    cancel() {
        clearTimeout(this._timer); // Works for clearInterval too in browsers usually
        clearInterval(this._timer);
    }
}

export class Future {
    constructor(computation) {
        this._promise = new Promise((resolve, reject) => {
            try {
                const result = computation();
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
    }

    // Internal: wrap existing promise
    static _wrap(promise) {
        const f = new Future(() => { });
        f._promise = promise;
        return f;
    }

    static value(value) {
        return Future._wrap(Promise.resolve(value));
    }

    static error(error) {
        return Future._wrap(Promise.reject(error));
    }

    static delayed(duration, computation) {
        return Future._wrap(new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    if (computation) {
                        resolve(computation());
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    reject(e);
                }
            }, duration.inMilliseconds || duration);
        }));
    }

    static wait(futures) {
        const promises = futures.map(f => f instanceof Future ? f._promise : f);
        return Future._wrap(Promise.all(promises));
    }

    then(onValue, { onError } = {}) {
        const p = this._promise.then(
            val => onValue(val),
            err => {
                if (onError) {
                    return onError(err);
                }
                throw err;
            }
        );
        return Future._wrap(p);
    }

    catchError(onError, { test } = {}) {
        const p = this._promise.catch(err => {
            if (test && !test(err)) throw err;
            return onError(err);
        });
        return Future._wrap(p);
    }

    whenComplete(action) {
        const p = this._promise.finally(() => {
            return action();
        });
        return Future._wrap(p);
    }

    // To allow await in JS specific code if needed (not standard Dart but helpful)
    thenJS(onFulfilled, onRejected) {
        return this._promise.then(onFulfilled, onRejected);
    }
}

export class Completer {
    constructor() {
        this.future = new Future(() => { });
        // Replace the promise with one we control
        this.future._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    complete(value) {
        this._resolve(value);
    }

    completeError(error) {
        this._reject(error);
    }

    get isCompleted() {
        // Hard to track without extra state, skipping for lightweight wrapper
        return false;
    }
}

export class StreamSubscription {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.isPaused = false;
        this.isCanceled = false;
    }

    cancel() {
        this.isCanceled = true;
        if (this.callbacks && this.callbacks.onCancel) {
            this.callbacks.onCancel();
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }
}

export class Stream {
    constructor(onListen) {
        this._onListen = onListen;
    }

    listen(onData, { onError, onDone, cancelOnError } = {}) {
        const subscription = new StreamSubscription({
            onData,
            onError,
            onDone,
            onCancel: () => {
                // Cleanup logic if needed
            }
        });

        if (this._onListen) {
            const cancelCallback = this._onListen(subscription);
            if (cancelCallback && typeof cancelCallback === 'function') {
                subscription.callbacks.onCancel = cancelCallback;
            }
        }

        return subscription;
    }

    // Basic transforms
    map(convert) {
        const controller = new StreamController();
        this.listen(
            data => controller.add(convert(data)),
            {
                onError: err => controller.addError(err),
                onDone: () => controller.close()
            }
        );
        return controller.stream;
    }

    static fromIterable(iterable) {
        const controller = new StreamController();
        // Run asynchronously
        setTimeout(() => {
            for (const item of iterable) {
                if (controller.isClosed) break;
                controller.add(item);
            }
            if (!controller.isClosed) controller.close();
        }, 0);
        return controller.stream;
    }
}

export class StreamController {
    constructor() {
        this._listeners = [];
        this.isClosed = false;
    }

    get stream() {
        if (!this._stream) {
            this._stream = new Stream((subscription) => {
                this._listeners.push(subscription);
                return () => {
                    const idx = this._listeners.indexOf(subscription);
                    if (idx >= 0) this._listeners.splice(idx, 1);
                };
            });
        }
        return this._stream;
    }

    get hasListener() {
        return this._listeners.length > 0;
    }

    add(event) {
        if (this.isClosed) return;
        // Copy to avoid modification while emitting
        [...this._listeners].forEach(sub => {
            if (!sub.isCanceled && !sub.isPaused && sub.callbacks.onData) {
                sub.callbacks.onData(event);
            }
        });
    }

    addError(error) {
        if (this.isClosed) return;
        [...this._listeners].forEach(sub => {
            if (!sub.isCanceled && !sub.isPaused && sub.callbacks.onError) {
                sub.callbacks.onError(error);
            }
        });
    }

    close() {
        if (this.isClosed) return;
        this.isClosed = true;
        [...this._listeners].forEach(sub => {
            if (!sub.isCanceled && !sub.isPaused && sub.callbacks.onDone) {
                sub.callbacks.onDone();
            }
        });
        this._listeners = [];
    }
}

// --- Zone ---
export class Zone {
    static get current() {
        return _root;
    }

    fork({ specification, zoneValues } = {}) {
        return this;
    }

    run(action) {
        return action();
    }

    bindCallback(callback) {
        return callback;
    }

    bindUnaryCallback(callback) {
        return callback;
    }

    bindBinaryCallback(callback) {
        return callback;
    }
}

const _root = new Zone();

export function runZoned(body, { zoneValues, zoneSpecification, onError } = {}) {
    return body();
}

export function runZonedGuarded(body, onError, { zoneValues, zoneSpecification } = {}) {
    try {
        return body();
    } catch (e) {
        onError(e, null);
    }
}
