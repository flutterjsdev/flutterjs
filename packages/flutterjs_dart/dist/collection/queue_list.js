// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import{Queue as e}from"./index.js";class l extends e{constructor(t){super(),Array.isArray(t)?this._list=[...t]:this._list=[]}add(t){this._list.push(t)}addAll(t){for(const s of t)this._list.push(s)}get length(){return this._list.length}set length(t){this._list.length=t}operator_get(t){return this._list[t]}operator_set(t,s){this._list[t]=s}indexOf(t,s){return this._list.indexOf(t,s)}}export{l as QueueList};
//# sourceMappingURL=queue_list.js.map
