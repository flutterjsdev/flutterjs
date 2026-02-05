// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


/**
 * Dart JS Interop Library
 * Implements dart:js_interop functionality for FlutterJS
 */

// Global context
export const globalJS = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});

// Base Types (Extension types in Dart, classes here for instanceof checks if needed)
export class JSAny { }
export class JSObject extends JSAny { }
export class JSFunction extends JSAny { }
export class JSArray extends JSAny { }
export class JSNumber extends JSAny { }
export class JSBoolean extends JSAny { }
export class JSString extends JSAny { }
export class JSSymbol extends JSAny { }
export class JSBigInt extends JSAny { }

// Conversion Utilities
// Since we are running in JS, these are mostly pass-throughs
// unless we need to unwrap Dart specialized types.

/**
 * Converts a Dart object to a JS object.
 */
export function toJS(o) {
    // If it's already a JS primitive or object, return it.
    // If we had wrappers for Dart Lists/Maps, we might unwrap them here.
    return o;
}

/**
 * Converts a JS object to a Dart object.
 */
export function toDart(o) {
    return o;
}

/**
 * Helper helpers for 'dart:js_interop_unsafe' if needed, 
 * usually mapped to direct property access in generated code,
 * but provided here for completeness.
 */
export function getProperty(obj, name) {
    return obj[name];
}

export function setProperty(obj, name, value) {
    obj[name] = value;
}

export function callMethod(obj, name, args) {
    return obj[name](...args);
}

// Support for 'web' package expectations
export const core = {
    globalThis: globalJS
};
