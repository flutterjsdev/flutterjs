// ============================================================================
// Generated from Dart IR - Model-to-JS Conversion
// WARNING: Do not edit manually - changes will be lost
// Generated at: 2026-02-17 17:43:31.920777
// File: C:\Jay\_Plugin\flutterjs\packages\flutterjs_server\lib\src\router.dart
// ============================================================================

import './request.js';
import './response.js';
import { Zone, runZoned } from '@flutterjs/dart/async';


class Router {
  constructor() {
    // No superclass
  }

  /**
   * @param {string} [method]
   * @param {string} [path]
   * @param {HandlerFn} [handler]
   * @returns {Router}
   */
  add(method = undefined, path = undefined, handler = undefined) {
  return this;
  }

  /**
   * @param {MiddlewareFn} [fn]
   * @returns {Router}
   */
  use(fn = undefined) {
  return this;
  }

  /**
   * @param {HandlerFn} [fn]
   * @returns {Router}
   */
  setNotFound(fn = undefined) {
  return this;
  }

  /**
   * @param {Future<Response> Function(Object error)} [fn]
   * @returns {Router}
   */
  setErrorHandler(fn = undefined) {
  return this;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Router = Router;


// ============================================================================
// EXPORTS
// ============================================================================

export {
  Router,
};

