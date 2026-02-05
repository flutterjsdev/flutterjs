// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

class t{get current(){throw new Error("Iterator.current must be implemented")}moveNext(){throw new Error("Iterator.moveNext must be implemented")}}class o{get iterator(){throw new Error("Iterable.iterator must be implemented")}*[Symbol.iterator](){const e=this.iterator;for(;e.moveNext();)yield e.current}}class m{compareTo(e){throw new Error("Comparable.compareTo must be implemented")}}var a={Iterator:t,Iterable:o,Comparable:m};export{m as Comparable,o as Iterable,t as Iterator,a as default};
//# sourceMappingURL=index.js.map
