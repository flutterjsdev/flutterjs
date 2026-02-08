// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Stream } from "./stream.js";

export class StreamView extends Stream {
    constructor(stream) {
        super();
        this._stream = stream;
    }

    get isBroadcast() {
        return this._stream.isBroadcast;
    }

    asBroadcastStream({ onListen, onCancel } = {}) {
        return this._stream.asBroadcastStream({ onListen, onCancel });
    }

    listen(onData, { onError, onDone, cancelOnError } = {}) {
        return this._stream.listen(onData, { onError, onDone, cancelOnError });
    }
}
