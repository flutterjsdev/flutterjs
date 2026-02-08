// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

    transform(streamTransformer) {
        return streamTransformer.bind(this);
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
        this._listeners.forEach(sub => {
            if (!sub.isCanceled && !sub.isPaused && sub.callbacks.onDone) {
                sub.callbacks.onDone();
            }
        });
        this._listeners = [];
    }
}

export class StreamTransformer {
    constructor(transformer) {
        this._transformer = transformer;
    }

    static fromHandlers({ handleData, handleError, handleDone }) {
        return new StreamTransformer((stream, cancelOnError) => {
            const controller = new StreamController();
            stream.listen(
                data => {
                    if (handleData) {
                        handleData(data, controller);
                    } else {
                        controller.add(data);
                    }
                },
                {
                    onError: error => {
                        if (handleError) {
                            handleError(error, controller);
                        } else {
                            controller.addError(error);
                        }
                    },
                    onDone: () => {
                        if (handleDone) {
                            handleDone(controller);
                        } else {
                            controller.close();
                        }
                    },
                    cancelOnError
                }
            );
            return controller.stream;
        });
    }

    bind(stream) {
        return this._transformer(stream);
    }
}
