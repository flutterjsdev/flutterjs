// ============================================================================
// Generated from Dart IR - Model-to-JS Conversion
// WARNING: Do not edit manually - changes will be lost
// Generated at: 2026-02-17 17:43:31.932183
// File: C:\Jay\_Plugin\flutterjs\packages\flutterjs_server\lib\src\server.dart
// ============================================================================

import './router.js';


class FlutterjsServer {
  port = null;
  host = null;
  prefix = null;

  /**
   * @param {any|null} [port]
   * @param {any|null} [host]
   * @param {any|null} [prefix]
   */
  constructor({ port = 3000, host = "0.0.0.0", prefix = "" } = {}) {
    this.port = port;
    this.host = host;
    this.prefix = prefix;
  }

  /**
   * @param {MountFn} [fn]
   * @returns {FlutterjsServer}
   */
  mount(fn = undefined) {
  return this;
  }

  /**
   * @param {MiddlewareFn} [fn]
   * @returns {FlutterjsServer}
   */
  use(fn = undefined) {
  return this;
  }

  /**
   * @param {void Function()?|null} [callback]
   * @returns {FlutterjsServer}
   */
  listen(callback = undefined) {
  return this;
  }

  /**

   * @returns {Future<void>}
   * @async
   */
  async close() {
    // Empty method body
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.FlutterjsServer = FlutterjsServer;


// ============================================================================
// EXPORTS
// ============================================================================

export {
  FlutterjsServer,
};

