// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Null assertion operator (!) helper
 * Throws an error if the value is null or undefined
 * @param {*} value - The value to check
 * @returns {*} The value if not null/undefined
 * @throws {Error} If value is null or undefined
 */
export function nullAssert(value) {
  if (value === null || value === undefined) {
    throw new Error("Null check operator '!' used on a null value");
  }
  return value;
}

export default nullAssert;
