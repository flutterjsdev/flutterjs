// ============================================================================
// Generated from Dart IR - Model-to-JS Conversion
// WARNING: Do not edit manually - changes will be lost
// Generated at: 2026-02-17 17:43:31.908376
// File: C:\Jay\_Plugin\flutterjs\packages\flutterjs_server\lib\src\response.dart
// ============================================================================



class Response {
  statusCode = null;
  body = null;
  headers = null;

  /**
   * @param {any|null} [statusCode]
   * @param {any|null} [body]
   * @param {any|null} [headers]
   */
  constructor(statusCode = undefined, { body = undefined, headers = {} } = {}) {
    this.statusCode = statusCode;
    this.body = body;
    this.headers = headers;
  }

  /**
   * @param {any|null} [body]
   * @param {Map<String, String>} [headers]
   */
  static ok(body = undefined, headers = {}) {
  return new Response(200, { body: body, headers: headers });
  }

  /**
   * @param {any|null} [body]
   * @param {Map<String, String>} [headers]
   */
  static created(body = undefined, headers = {}) {
  return new Response(201, { body: body, headers: headers });
  }

  /**

   */
  static noContent() {
  return new Response(204);
  }

  /**
   * @param {any|null} [body]
   */
  static badRequest(body = undefined) {
  return new Response(400, { body: body ?? ({ error: "Bad Request" }) });
  }

  /**
   * @param {any|null} [body]
   */
  static unauthorized(body = undefined) {
  return new Response(401, { body: body ?? ({ error: "Unauthorized" }) });
  }

  /**
   * @param {any|null} [body]
   */
  static forbidden(body = undefined) {
  return new Response(403, { body: body ?? ({ error: "Forbidden" }) });
  }

  /**
   * @param {any|null} [body]
   */
  static notFound(body = undefined) {
  return new Response(404, { body: body ?? ({ error: "Not Found" }) });
  }

  /**
   * @param {any|null} [body]
   */
  static conflict(body = undefined) {
  return new Response(409, { body: body ?? ({ error: "Conflict" }) });
  }

  /**
   * @param {any|null} [body]
   */
  static unprocessable(body = undefined) {
  return new Response(422, { body: body ?? ({ error: "Unprocessable Entity" }) });
  }

  /**
   * @param {any|null} [body]
   */
  static internalError(body = undefined) {
  return new Response(500, { body: body ?? ({ error: "Internal Server Error" }) });
  }

  /**
   * @param {number} [statusCode]
   * @param {any|null} [data]
   */
  static json(statusCode = undefined, data = undefined) {
  return new Response(statusCode, { body: data, headers: { "content-type": "application/json" } });
  }

  /**
   * @param {string} [url]
   * @param {number} [statusCode]
   */
  static redirect(url = undefined, { statusCode = 302 } = {}) {
  return new Response(statusCode, { headers: { location: url } });
  }

  /**
   * @param {Stream<dynamic>} [stream]
   * @param {string} [contentType]
   * @param {number} [status]
   * @param {Map<String, String>} [headers]
   */
  static stream(stream = undefined, { contentType = "application/octet-stream", status = 200, headers = {} } = {}) {
  return new Response(status, { body: stream, headers: { "content-type": contentType } });
  }

  /**
   * @param {Stream<String>} [stream]
   * @param {Map<String, String>} [headers]
   */
  static sse(stream = undefined, { headers = {} } = {}) {
  return new Response(200, { body: stream, headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", "x-accel-buffering": "no" } });
  }

  /**
   * @param {Map<String, String>} [additionalHeaders]
   * @returns {Response}
   */
  withHeaders(additionalHeaders = undefined) {
  return new Response(this.statusCode, { body: this.body, headers: {} });
  }

}
// Registration for circular dependency resolution
globalThis._flutterjs_types = globalThis._flutterjs_types || {};
globalThis._flutterjs_types.Response = Response;


// ============================================================================
// EXPORTS
// ============================================================================

export {
  Response,
};

