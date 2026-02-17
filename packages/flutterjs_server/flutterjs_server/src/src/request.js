// ============================================================================
// Generated from Dart IR - Model-to-JS Conversion
// WARNING: Do not edit manually - changes will be lost
// Generated at: 2026-02-17 17:43:31.893844
// File: C:\Jay\_Plugin\flutterjs\packages\flutterjs_server\lib\src\request.dart
// ============================================================================



class Request {
  method = null;
  url = null;
  path = null;
  params = null;
  query = null;
  headers = null;
  body = null;
  rawBody = null;

  /**
   * @param {any|null} method
   * @param {any|null} url
   * @param {any|null} path
   * @param {any|null} [params]
   * @param {any|null} [query]
   * @param {any|null} [headers]
   * @param {any|null} [body]
   * @param {any|null} [rawBody]
   */
  constructor({ method, url, path, params = {}, query = {}, headers = {}, body = undefined, rawBody = "" } = {}) {
    this.method = method;
    this.url = url;
    this.path = path;
    this.params = params;
    this.query = query;
    this.headers = headers;
    this.body = body;
    this.rawBody = rawBody;
  }

  /**
   * @param {string} [name]
   * @returns {String?|null}
   */
  header(name = undefined) {
  return this.headers[name.toLowerCase()];
  }

  /**

   * @returns {String?|null}
   */
  get contentType() {
  return this.header("content-type");
  }

  /**

   * @returns {boolean}
   */
  get isJson() {
  return contentType.includes("application/json") ?? false;
  }

  /**

   * @returns {String?|null}
   */
  get authorization() {
  return this.header("authorization");
  }

  /**

   * @returns {String?|null}
   */
  get bearerToken() {
  const auth = authorization;
  if ((auth !== null) && auth.startsWith("Bearer ")) {
  return auth.substring(7);
  }
  return null;
  }

  /**
   * @param {string} [name]
   * @param {String?|null} [defaultValue]
   * @returns {String?|null}
   */
  queryParam(name = undefined, defaultValue = undefined) {
  return this.query[name] ?? defaultValue;
  }

  /**
   * @param {string} [name]
   * @returns {List<String>}
   */
  queryParamAll(name = undefined) {
  const v = this.query[name];
  return (v !== null) ? (([v])) : (([]));
  }

  /**

   * @returns {Map<String, dynamic>}
   */
  bodyAsMap() {
  return (typeof this.body === 'object' && this.body !== null && !Array.isArray(this.body)) ? (((this.body instanceof Map) ? this.body : (() => { throw new Error("Cast failed to Map<String, dynamic>"); })())) : (({}));
  }

  /**

   * @returns {List<dynamic>}
   */
  bodyAsList() {
  return (Array.isArray(this.body)) ? (((this.body instanceof List) ? this.body : (() => { throw new Error("Cast failed to List<dynamic>"); })())) : (([]));
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Request = Request;


// ============================================================================
// EXPORTS
// ============================================================================

export {
  Request,
};

