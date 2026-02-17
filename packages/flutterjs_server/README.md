# @flutterjs/server

> Write Node.js HTTP servers in Dart. Compile once, run anywhere Node.js runs.

`flutterjs_server` is a Dart package + Node.js runtime that lets you write fast HTTP APIs
in Dart using familiar annotations (`@Get`, `@Post`, etc.) and compile them to JavaScript
via the FlutterJS compiler.

## Why?

- **Dart is great for APIs** — strong typing, null safety, async/await, great tooling
- **Node.js is everywhere** — cheap hosting, huge ecosystem, edge runtimes
- **FlutterJS compiles Dart → JS** — this package proves it works end-to-end

## Quick Start

### 1. Add to `pubspec.yaml`

```yaml
dependencies:
  flutterjs_server: ^1.0.0
```

### 2. Write your API in Dart

```dart
// lib/api.dart
import 'package:flutterjs_server/flutterjs_server.dart';

@Server(port: 3000)
class MyApi {
  @Get('/hello')
  Response hello() => Response.ok({'message': 'Hello from Dart!'});

  @Get('/users/:id')
  Response getUser(@Param('id') String id) =>
      Response.ok({'id': id, 'name': 'Alice'});

  @Post('/users')
  Response createUser(@Body() Map<String, dynamic> body) {
    final name = body['name'] as String?;
    if (name == null) return Response.badRequest({'error': 'name required'});
    return Response.created({'id': '1', 'name': name});
  }
}
```

### 3. Write your entry point

```dart
// lib/main.dart
import 'package:flutterjs_server/flutterjs_server.dart';
import 'api.dart';

void main() {
  final server = FlutterjsServer(port: 3000);
  final api = MyApi();

  server
    ..use(cors())
    ..use(logger())
    ..mount((router, prefix) {
      router
        ..add('GET', '$prefix/hello', (req) => api.hello())
        ..add('GET', '$prefix/users/:id', (req) => api.getUser(req.params['id']!))
        ..add('POST', '$prefix/users', (req) => api.createUser(req.body as Map<String, dynamic>));
    })
    ..listen();
}
```

### 4. Compile and run

```bash
# Navigate into your project first (like `flutter run`)
cd my_api

# Compile + start server in one command
dart run flutterjs run --to-js --target node --serve --devtools-no-open

# Or: compile only, run manually
dart run flutterjs run --to-js --target node --devtools-no-open
node build/flutterjs/src/main.js
```

## Annotations

| Annotation | Description |
|-----------|-------------|
| `@Server(port: 3000)` | Mark a class as an HTTP server |
| `@Get('/path')` | HTTP GET route |
| `@Post('/path')` | HTTP POST route |
| `@Put('/path')` | HTTP PUT route |
| `@Patch('/path')` | HTTP PATCH route |
| `@Delete('/path')` | HTTP DELETE route |
| `@Param('name')` | URL path parameter (e.g. `/users/:id`) |
| `@Body()` | Request body (parsed JSON) |
| `@Query('name')` | Query string parameter |
| `@Header('name')` | Request header value |

## Response Helpers

```dart
Response.ok(body)              // 200
Response.created(body)         // 201
Response.noContent()           // 204
Response.badRequest(body)      // 400
Response.unauthorized(body)    // 401
Response.forbidden(body)       // 403
Response.notFound(body)        // 404
Response.conflict(body)        // 409
Response.unprocessable(body)   // 422
Response.internalError(body)   // 500
Response.json(status, data)    // Custom status with JSON body
Response.redirect(url)         // 302
```

## Built-in Middleware

```dart
// CORS (allows all origins by default)
server.use(cors());
server.use(cors(origin: 'https://example.com'));

// Request logger
server.use(logger());

// Bearer token auth
server.use(bearerAuth((token) async => token == 'secret'));
```

## Request Object

```dart
req.method       // 'GET', 'POST', etc.
req.path         // '/users/42'
req.params       // {'id': '42'}  — from URL params
req.query        // {'page': '1'} — from ?page=1
req.body         // parsed JSON or form body
req.headers      // all request headers (lowercase keys)
req.bearerToken  // 'abc123' from 'Authorization: Bearer abc123'
```

## Runtime Architecture

```
Dart source  →  FlutterJS compiler  →  JS output
     ↓                                      ↓
flutterjs_server (Dart stubs)    @flutterjs/server (Node.js runtime)
  - Type definitions               - FlutterjsServer class
  - Annotation classes             - Router with pre-compiled regex
  - Compile-time contracts         - Body parser (JSON / form-urlencoded)
                                   - Middleware chain (next() reaches routes)
                                   - cors(), logger(), bearerAuth()
```

The Dart package provides compile-time types and annotations. The actual HTTP handling
is done by the JavaScript runtime (`packages/flutterjs_server/flutterjs_server/runtime.js`)
which is bundled to `dist/index.js` via esbuild.

## Package Structure

```
packages/flutterjs_server/
├── lib/                          ← Dart package (compile-time)
│   ├── flutterjs_server.dart     ← Barrel export
│   └── src/
│       ├── annotations.dart      ← @Get, @Post, @Server, etc.
│       ├── request.dart          ← Request class
│       ├── response.dart         ← Response class
│       ├── router.dart           ← Router, HandlerFn, MiddlewareFn
│       ├── server.dart           ← FlutterjsServer class
│       ├── middleware.dart       ← cors(), logger(), bearerAuth()
│       └── context.dart          ← Context class
└── flutterjs_server/             ← npm package (Node.js runtime)
    ├── runtime.js                ← Hand-written Node.js runtime
    ├── build.js                  ← esbuild bundler
    ├── package.json
    └── dist/
        └── index.js              ← Bundled output (import this)
```

## Building the npm Package

```bash
cd packages/flutterjs_server/flutterjs_server
node build.js
```

This runs in two stages:
1. **Dart → JS**: Compiles `lib/*.dart` to `src/*.js` via the FlutterJS compiler
2. **Bundle**: Bundles `runtime.js` + compiled sources to `dist/index.js` via esbuild

## See Also

- [dart_api example](../../examples/dart_api/) — Full working REST API demo
- [FlutterJS](https://flutterjs.dev) — Compile Flutter apps to the web
