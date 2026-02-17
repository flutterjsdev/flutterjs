// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// @flutterjs/server — Node.js runtime for Dart-compiled HTTP servers.
//
// This file is the permanent hand-written runtime entry point.
// Lives outside src/ so the Dart barrel generator can never overwrite it.
// Build pipeline: runtime.js → dist/index.js  (via esbuild in build.js)

import { createServer } from 'node:http';
import { URL } from 'node:url';

// ─── Annotation stubs (runtime no-ops — used statically by the compiler) ──────
export const Server     = (opts = {}) => opts;
export const Get        = (path) => path;
export const Post       = (path) => path;
export const Put        = (path) => path;
export const Patch      = (path) => path;
export const Delete     = (path) => path;
export const Route      = (path, opts = {}) => ({ path, ...opts });
export const Body       = () => null;
export const Param      = (name) => name;
export const Query      = (name, opts = {}) => ({ name, ...opts });
export const Header     = (name) => name;
export const Req        = () => null;
export const Middleware = (handlers) => handlers;
export const Guard      = (guards) => guards;

// ─── Request ──────────────────────────────────────────────────────────────────

export class Request {
  constructor({ method, url, path, params = {}, query = {}, headers = {}, body = null, rawBody = '' }) {
    this.method   = method;
    this.url      = url;
    this.path     = path;
    this.params   = params;
    this.query    = query;
    this.headers  = headers;
    this.body     = body;
    this.rawBody  = rawBody;
  }

  header(name)         { return this.headers[name.toLowerCase()]; }
  get contentType()    { return this.header('content-type'); }
  get isJson()         { return this.contentType?.includes('application/json') ?? false; }
  get authorization()  { return this.header('authorization'); }
  get bearerToken()    {
    const auth = this.authorization;
    return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  }

  // P1: typed helpers so compiled @Query/@Header annotations can target a stable API
  // instead of raw map access that crashes when the key is missing.

  /// Returns a single query param by name, or [defaultValue] if absent.
  queryParam(name, defaultValue = null) {
    const v = this.query[name];
    if (v === undefined || v === null) return defaultValue;
    return Array.isArray(v) ? v[0] : v;
  }

  /// Returns all values for a repeated query param (e.g. ?tag=a&tag=b → ['a','b']).
  queryParamAll(name) {
    const v = this.query[name];
    if (v === undefined || v === null) return [];
    return Array.isArray(v) ? v : [v];
  }

  // P1: safe body coercion — @Body() Map<String, dynamic> compiles to req.bodyAsMap().
  // Returns body as a plain object, never null/undefined. Avoids 'as Map' cast crash.
  bodyAsMap() {
    if (this.body === null || this.body === undefined) return {};
    if (typeof this.body === 'object' && !Array.isArray(this.body)) return this.body;
    return {};
  }

  /// Returns body as an array. Used for @Body() List<...>.
  bodyAsList() {
    if (Array.isArray(this.body)) return this.body;
    return [];
  }
}

// ─── Response ─────────────────────────────────────────────────────────────────

export class Response {
  constructor(statusCode, { body = null, headers = {} } = {}) {
    this.statusCode = statusCode;
    this.body       = body;
    this.headers    = headers;
  }

  static ok(body, headers = {})           { return new Response(200, { body, headers }); }
  static created(body, headers = {})      { return new Response(201, { body, headers }); }
  static noContent()                      { return new Response(204); }
  static badRequest(body)                 { return new Response(400, { body: body ?? { error: 'Bad Request' } }); }
  static unauthorized(body)               { return new Response(401, { body: body ?? { error: 'Unauthorized' } }); }
  static forbidden(body)                  { return new Response(403, { body: body ?? { error: 'Forbidden' } }); }
  static notFound(body)                   { return new Response(404, { body: body ?? { error: 'Not Found' } }); }
  static conflict(body)                   { return new Response(409, { body: body ?? { error: 'Conflict' } }); }
  static unprocessable(body)              { return new Response(422, { body: body ?? { error: 'Unprocessable Entity' } }); }
  static internalError(body)              { return new Response(500, { body: body ?? { error: 'Internal Server Error' } }); }
  static json(statusCode, data)           { return new Response(statusCode, { body: data, headers: { 'content-type': 'application/json' } }); }
  static redirect(url, statusCode = 302)  { return new Response(statusCode, { headers: { location: url } }); }

  /// Stream raw bytes/strings — chunked transfer, no content-length.
  /// `iterable` must be an AsyncIterable (async generator or ReadableStream).
  static stream(iterable, { contentType = 'application/octet-stream', status = 200, headers = {} } = {}) {
    const r = new Response(status, { headers: { 'content-type': contentType, ...headers } });
    r._stream = iterable;
    return r;
  }

  /// Server-Sent Events stream — sets correct headers, wraps each string as an SSE event.
  /// `iterable` yields string data payloads (e.g. JSON strings).
  /// Usage: Response.sse(async function*() { yield JSON.stringify({msg:'hi'}); })
  static sse(iterable, { headers = {} } = {}) {
    async function* formatSse(source) {
      for await (const data of source) {
        yield `data: ${data}\n\n`;
      }
    }
    const r = new Response(200, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        'x-accel-buffering': 'no', // disable nginx proxy buffering
        ...headers,
      },
    });
    r._stream = formatSse(iterable);
    return r;
  }

  withHeaders(additional) {
    return new Response(this.statusCode, { body: this.body, headers: { ...this.headers, ...additional } });
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

export class Context {
  constructor(request) {
    this.request = request;
    this.data    = {};
  }
  set(key, value) { this.data[key] = value; }
  get(key)        { return this.data[key]; }
}

// ─── Router ───────────────────────────────────────────────────────────────────
// Pre-compiles route patterns to RegExp at startup — zero parsing at request time.

export class Router {
  constructor() {
    this._routes       = [];
    this._middleware   = [];
    this._notFound     = null;
    this._errorHandler = null;
  }

  add(method, path, handler) {
    const { regex, paramNames } = compilePath(path);
    this._routes.push({ method: method.toUpperCase(), regex, paramNames, handler });
    return this;
  }

  use(fn)              { this._middleware.push(fn); return this; }
  setNotFound(fn)      { this._notFound = fn; return this; }
  setErrorHandler(fn)  { this._errorHandler = fn; return this; }

  async handle(req) {
    // Route matching — extracted so middleware can call it via next()
    const executeRoute = async () => {
      for (const route of this._routes) {
        if (route.method !== req.method) continue;
        const match = req.path.match(route.regex);
        if (!match) continue;

        const params = {};
        for (let i = 0; i < route.paramNames.length; i++) {
          params[route.paramNames[i]] = decodeURIComponent(match[i + 1] ?? '');
        }
        req.params = params;

        // P0: wrap handler so async throws are caught by the error handler,
        // not leaked as unhandled rejections that bypass sendResponse entirely.
        try {
          return await route.handler(req);
        } catch (err) {
          if (this._errorHandler) return this._errorHandler(err, req);
          throw err; // re-throw — outer FlutterjsServer.listen() catch handles it
        }
      }

      if (this._notFound) return this._notFound(req);
      return Response.notFound({ error: 'Not Found', path: req.path });
    };

    // Run middleware chain; terminal next() executes the route
    const runMiddleware = async (index) => {
      if (index >= this._middleware.length) return executeRoute();
      return this._middleware[index](req, () => runMiddleware(index + 1));
    };

    return runMiddleware(0);
  }
}

// ─── Path compiler ────────────────────────────────────────────────────────────

function compilePath(path) {
  const paramNames = [];
  const pattern = path
    .replace(/[.*+?^${}()|[\]\\]/g, (c) => c === ':' ? c : `\\${c}`)
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  return { regex: new RegExp(`^${pattern}(?:\\?.*)?$`), paramNames };
}

// ─── Body parser ──────────────────────────────────────────────────────────────

async function parseBody(nodeReq) {
  const ct = (nodeReq.headers['content-type'] ?? '').toLowerCase();

  // P0: multipart/form-data bodies cannot be parsed without a boundary parser.
  // Return null body + set a flag so handlers can detect and reject cleanly.
  if (ct.includes('multipart/form-data')) {
    // Drain the socket so the connection isn't left hanging.
    nodeReq.resume();
    await new Promise((r) => nodeReq.on('end', r).on('error', r));
    return { body: null, rawBody: '', multipart: true };
  }

  return new Promise((resolve) => {
    const chunks = [];
    nodeReq.on('data', (chunk) => chunks.push(chunk));
    nodeReq.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let body = rawBody;
      if (ct.includes('application/json') && rawBody) {
        try { body = JSON.parse(rawBody); } catch { body = rawBody; }
      } else if (ct.includes('application/x-www-form-urlencoded') && rawBody) {
        // P0: preserve repeated keys as arrays — ?a=1&a=2 → { a: ['1','2'] }
        const params = new URLSearchParams(rawBody);
        body = {};
        for (const key of params.keys()) {
          const vals = params.getAll(key);
          body[key] = vals.length === 1 ? vals[0] : vals;
        }
      }
      resolve({ body, rawBody, multipart: false });
    });
    nodeReq.on('error', () => resolve({ body: null, rawBody: '', multipart: false }));
  });
}

// ─── Response writer ──────────────────────────────────────────────────────────

function sendResponse(nodeRes, response) {
  // Streaming responses bypass sendResponse — handled inline in listen().
  // This guard prevents accidentally buffering a streaming response.
  if (response._stream) return;

  const headers = { ...response.headers };
  let body = response.body;

  if (body !== null && body !== undefined) {
    if (typeof body === 'object' && !Buffer.isBuffer(body)) {
      // JSON — stringify first, then measure byte length of the resulting string
      body = JSON.stringify(body);
      if (!headers['content-type']) headers['content-type'] = 'application/json; charset=utf-8';
    }
    // Fix: always convert string → Buffer before measuring so byteLength is exact
    // (multi-byte UTF-8 chars: "héllo".length === 5 but byteLength === 6)
    if (typeof body === 'string') {
      if (!headers['content-type']) headers['content-type'] = 'text/plain; charset=utf-8';
      body = Buffer.from(body, 'utf8');
    }
    // body is now Buffer or pre-existing Buffer — byteLength is exact
    headers['content-length'] = Buffer.byteLength(body).toString();
  }

  nodeRes.writeHead(response.statusCode, headers);
  if (response.statusCode === 204 || body === null || body === undefined) {
    nodeRes.end();
  } else {
    nodeRes.end(body);
  }
}

// ─── Streaming response writer ────────────────────────────────────────────────
// Called when response._stream is set. Pipes AsyncIterable chunks to the socket.

async function sendStreamingResponse(nodeRes, response) {
  const headers = { ...response.headers };
  // No content-length for streaming — transfer-encoding: chunked is implicit in Node HTTP
  nodeRes.writeHead(response.statusCode, headers);
  try {
    for await (const chunk of response._stream) {
      // Each chunk can be a string or Buffer
      nodeRes.write(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
    }
  } finally {
    nodeRes.end();
  }
}

// ─── FlutterjsServer ──────────────────────────────────────────────────────────

export class FlutterjsServer {
  constructor({
    port    = 3000,
    host    = '0.0.0.0',
    prefix  = '',
    timeout = 30_000,       // P2: per-request timeout in ms (0 = disabled)
  } = {}) {
    this.port    = port;
    this.host    = host;
    this.prefix  = prefix;
    this.timeout = timeout;
    this.router  = new Router();
    this._server = null;

    // P2-1: graceful-shutdown state
    this._inFlight      = 0;      // count of requests currently being handled
    this._shuttingDown  = false;  // set to true when shutdown is initiated
    this._drainResolve  = null;   // resolve() called when _inFlight hits 0 during shutdown
  }

  mount(controllerFn) {
    // P1: wrap router so routes are auto-prefixed — user writes '/users', gets '<prefix>/users'
    const prefixedRouter = {
      add: (method, path, handler) => {
        const fullPath = this.prefix ? `${this.prefix}${path}` : path;
        this.router.add(method, fullPath, handler);
        return prefixedRouter;
      },
      use:             (fn)  => { this.router.use(fn); return prefixedRouter; },
      setNotFound:     (fn)  => { this.router.setNotFound(fn); return prefixedRouter; },
      setErrorHandler: (fn)  => { this.router.setErrorHandler(fn); return prefixedRouter; },
    };
    controllerFn(prefixedRouter, this.prefix);
    return this;
  }

  use(fn) { this.router.use(fn); return this; }

  listen(callback) {
    this._server = createServer(async (nodeReq, nodeRes) => {
      // P2-1: reject new requests while shutting down
      if (this._shuttingDown) {
        nodeRes.writeHead(503, { 'content-type': 'application/json', 'connection': 'close' });
        nodeRes.end(JSON.stringify({ error: 'Server is shutting down' }));
        return;
      }

      this._inFlight++;

      try {
        const parsedUrl = new URL(nodeReq.url, `http://${nodeReq.headers.host ?? 'localhost'}`);
        const { body, rawBody, multipart } = await parseBody(nodeReq);

        // P0: multipart bodies are drained but not parsed — return 415 immediately.
        if (multipart) {
          sendResponse(nodeRes, Response.json(415, { error: 'multipart/form-data is not supported. Send JSON instead.' }));
          return;
        }

        const headers = {};
        for (const [k, v] of Object.entries(nodeReq.headers)) {
          headers[k] = Array.isArray(v) ? v.join(', ') : v;
        }

        // P0: preserve repeated query keys as arrays — ?a=1&a=2 → { a: ['1','2'] }
        const query = {};
        for (const key of parsedUrl.searchParams.keys()) {
          const vals = parsedUrl.searchParams.getAll(key);
          query[key] = vals.length === 1 ? vals[0] : vals;
        }

        const req = new Request({
          method: nodeReq.method.toUpperCase(),
          url:    nodeReq.url,
          path:   parsedUrl.pathname,
          params: {},
          query,
          headers,
          body,
          rawBody,
        });

        // P2-2: per-request timeout — race handler against a timer
        let response;
        if (this.timeout > 0) {
          let timeoutId;
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(
              () => reject(Object.assign(new Error(`Request timed out after ${this.timeout}ms`), { code: 'REQUEST_TIMEOUT' })),
              this.timeout,
            );
          });
          try {
            response = await Promise.race([this.router.handle(req), timeoutPromise]);
          } finally {
            clearTimeout(timeoutId);
          }
        } else {
          response = await this.router.handle(req);
        }

        // Route streaming vs buffered responses
        if (response._stream) {
          await sendStreamingResponse(nodeRes, response);
        } else {
          sendResponse(nodeRes, response);
        }

      } catch (err) {
        const is503 = err.code === 'REQUEST_TIMEOUT';
        const errResponse = is503
          ? Response.json(503, { error: err.message })
          : this.router._errorHandler
            ? await this.router._errorHandler(err)
            : Response.internalError({ error: err.message ?? 'Internal Server Error' });
        try { sendResponse(nodeRes, errResponse); } catch { nodeRes.end(); }
      } finally {
        // P2-1: decrement in-flight; if draining and now at 0, unblock shutdown
        this._inFlight--;
        if (this._shuttingDown && this._inFlight === 0 && this._drainResolve) {
          this._drainResolve();
        }
      }
    });

    // P1: friendly port-conflict error instead of raw EADDRINUSE crash
    this._server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${this.port} is already in use.\n   Stop the process using that port and try again.\n`);
        process.exit(1);
      } else {
        throw err;
      }
    });

    this._server.listen(this.port, this.host, () => {
      const cb = callback ?? (() => {
        const host = this.host === '0.0.0.0' ? 'localhost' : this.host;
        console.log(`\n🚀 @flutterjs/server running on http://${host}:${this.port}\n`);
      });
      cb();

      // P2-1: register graceful-shutdown handlers after server is up
      this._registerShutdownHandlers();
    });

    return this;
  }

  // P2-1: graceful shutdown — stop accepting, drain in-flight, exit
  _registerShutdownHandlers() {
    const shutdown = async (signal) => {
      // Only handle once
      if (this._shuttingDown) return;
      this._shuttingDown = true;

      console.log(`\n⏳ ${signal} received — shutting down gracefully…`);

      // Stop accepting new connections
      this._server.close();

      if (this._inFlight > 0) {
        console.log(`   Waiting for ${this._inFlight} in-flight request(s) to complete…`);

        // Wait for drain, or force-exit after 10 seconds
        const drainPromise = new Promise((resolve) => { this._drainResolve = resolve; });
        const forceExit    = new Promise((resolve) => setTimeout(resolve, 10_000));

        await Promise.race([drainPromise, forceExit]);

        if (this._inFlight > 0) {
          console.log(`   ⚠️  Force-exiting with ${this._inFlight} request(s) still in flight.`);
        }
      }

      console.log('   Server stopped. Goodbye!\n');
      process.exit(0);
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT',  () => shutdown('SIGINT'));
  }

  close() {
    return new Promise((resolve, reject) => {
      this._server
        ? this._server.close((err) => err ? reject(err) : resolve())
        : resolve();
    });
  }
}

// ─── Built-in middleware ───────────────────────────────────────────────────────

export function cors({ origin = '*', methods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS' } = {}) {
  return async (req, next) => {
    if (req.method === 'OPTIONS') {
      return new Response(204, { headers: {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': methods,
        'access-control-allow-headers': 'content-type, authorization',
        'access-control-max-age': '86400',
      }});
    }
    const response = await next();
    return response.withHeaders({ 'access-control-allow-origin': origin });
  };
}

export function logger() {
  return async (req, next) => {
    const start = Date.now();
    const response = await next();
    const ms = Date.now() - start;
    const s = response?.statusCode ?? '???';
    const c = s >= 500 ? '\x1b[31m' : s >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${c}${req.method}\x1b[0m ${req.path} → ${s} (${ms}ms)`);
    return response;
  };
}

export function bearerAuth(verifyFn) {
  return async (req, next) => {
    const token = req.bearerToken;
    if (!token) return Response.unauthorized({ error: 'Missing token' });
    const valid = await verifyFn(token);
    if (!valid) return Response.unauthorized({ error: 'Invalid token' });
    return next();
  };
}

// ─── Convenience bootstrap ────────────────────────────────────────────────────

export function createFlutterjsServer(opts, mountFn) {
  const server = new FlutterjsServer(opts);
  if (mountFn) server.mount(mountFn);
  server.listen();
  return server;
}
