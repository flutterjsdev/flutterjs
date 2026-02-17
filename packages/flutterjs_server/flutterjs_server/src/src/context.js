// ============================================================================
// Generated from Dart IR - Model-to-JS Conversion
// WARNING: Do not edit manually - changes will be lost
// Generated at: 2026-02-17 17:43:31.864142
// File: C:\Jay\_Plugin\flutterjs\packages\flutterjs_server\lib\src\context.dart
// ============================================================================

import './request.js';


class Context {
  request = null;
  data = null;

  /**
   * @param {any|null} request
   * @param {Map<String, dynamic>?|null} [data]
   */
  constructor({ request, data = undefined } = {}) {
    this.request = request;
    this.data = data ?? ({});
  }

  /**
   * @param {string} [key]
   * @param {any|null} [value]
   */
  $set(key = undefined, value = undefined) {
  return this.data[key] = value;
  }

  /**
   * @param {string} [key]
   * @returns {T?|null}
   */
  $get(key = undefined) {
  return this.data[key];
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Context = Context;


// ============================================================================
// EXPORTS
// ============================================================================

export {
  Context,
};

