// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * StackFit - How children fit in Stack
 */
const StackFit = Object.freeze({
  // Children are sized to their natural size
  loose: 'loose',

  // Children are forced to expand to fill the Stack
  expand: 'expand',

  // Children are sized to the smallest size that fits all of them
  passthrough: 'passthrough'
});
export { StackFit };