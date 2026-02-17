// ============================================================================
// Generated from Dart IR - Model-to-JS Conversion
// WARNING: Do not edit manually - changes will be lost
// Generated at: 2026-02-17 17:43:31.828477
// File: C:\Jay\_Plugin\flutterjs\packages\flutterjs_server\lib\src\annotations.dart
// ============================================================================



class Server {
  port = null;
  host = null;
  prefix = null;

  /**
   * @param {any|null} [port]
   * @param {any|null} [host]
   * @param {any|null} [prefix]
   */
  constructor({ port = 3000, host = undefined, prefix = undefined } = {}) {
    this.port = port;
    this.host = host;
    this.prefix = prefix;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Server = Server;

class Get {
  path = null;

  /**
   * @param {any|null} [path]
   */
  constructor(path = undefined) {
    this.path = path;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Get = Get;

class Post {
  path = null;

  /**
   * @param {any|null} [path]
   */
  constructor(path = undefined) {
    this.path = path;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Post = Post;

class Put {
  path = null;

  /**
   * @param {any|null} [path]
   */
  constructor(path = undefined) {
    this.path = path;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Put = Put;

class Patch {
  path = null;

  /**
   * @param {any|null} [path]
   */
  constructor(path = undefined) {
    this.path = path;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Patch = Patch;

class Delete {
  path = null;

  /**
   * @param {any|null} [path]
   */
  constructor(path = undefined) {
    this.path = path;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Delete = Delete;

class Route {
  path = null;
  methods = null;

  /**
   * @param {any|null} [path]
   * @param {any|null} [methods]
   */
  constructor(path = undefined, { methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] } = {}) {
    this.path = path;
    this.methods = methods;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Route = Route;

class Body {
  /**

   */
  constructor() {
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Body = Body;

class Param {
  name = null;

  /**
   * @param {any|null} [name]
   */
  constructor(name = undefined) {
    this.name = name;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Param = Param;

class Query {
  name = null;
  defaultValue = null;

  /**
   * @param {any|null} [name]
   * @param {any|null} [defaultValue]
   */
  constructor(name = undefined, { defaultValue = undefined } = {}) {
    this.name = name;
    this.defaultValue = defaultValue;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Query = Query;

class Header {
  name = null;

  /**
   * @param {any|null} [name]
   */
  constructor(name = undefined) {
    this.name = name;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Header = Header;

class Req {
  /**

   */
  constructor() {
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Req = Req;

class Middleware {
  handlers = null;

  /**
   * @param {any|null} [handlers]
   */
  constructor(handlers = undefined) {
    this.handlers = handlers;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Middleware = Middleware;

class Guard {
  guards = null;

  /**
   * @param {any|null} [guards]
   */
  constructor(guards = undefined) {
    this.guards = guards;
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Guard = Guard;


// ============================================================================
// EXPORTS
// ============================================================================

export {
  Server,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Route,
  Body,
  Param,
  Query,
  Header,
  Req,
  Middleware,
  Guard,
};

