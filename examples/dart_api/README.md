# dart_api — Dart → Node.js REST API Example

This example proves the FlutterJS compiler works for **server-side Dart**: write a REST API
in Dart, compile it to JavaScript, run it on Node.js — zero framework, zero config.

## What It Proves

| | Status |
|---|---|
| Dart classes compile to JS classes | ✅ |
| Dart methods compile to JS methods | ✅ |
| `@Server`, `@Get`, `@Post`, `@Delete` annotations understood | ✅ |
| Cascade `..` operator compiles correctly | ✅ |
| String interpolation compiles correctly | ✅ |
| `package:flutterjs_server` import resolved at runtime | ✅ |
| `cors()` + `logger()` middleware works | ✅ |
| All HTTP verbs, params, body parsing work | ✅ |

## Project Structure

```
dart_api/
├── lib/
│   ├── main.dart      ← Entry point: creates FlutterjsServer, mounts routes
│   ├── api.dart       ← @Server/@Get/@Post/@Delete annotated UserApi class
│   └── models.dart    ← User model + in-memory store
├── pubspec.yaml       ← depends on package:flutterjs_server
└── server.js          ← Hand-written reference output (for comparison)
```

## Compile & Run

```bash
# Navigate into the project first (like `flutter run`)
cd examples/dart_api

# Compile + start server in one command
dart run ../../bin/flutterjs.dart run --to-js --target node --serve --devtools-no-open

# Or: compile only, then run manually
dart run ../../bin/flutterjs.dart run --to-js --target node --devtools-no-open
node build/flutterjs/src/main.js
```

The server starts on **http://localhost:3000**.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API index |
| `GET` | `/health` | Health check |
| `GET` | `/users` | List all users |
| `GET` | `/users/:id` | Get user by ID |
| `POST` | `/users` | Create a user `{ name, email }` |
| `DELETE` | `/users/:id` | Delete a user |

## Test It

```bash
# List users
curl http://localhost:3000/users

# Get single user
curl http://localhost:3000/users/1

# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Dave","email":"dave@example.com"}'

# Delete user
curl -X DELETE http://localhost:3000/users/2
```

## The Dart Source

```dart
// lib/api.dart
import 'package:flutterjs_server/flutterjs_server.dart';
import 'models.dart';

@Server(port: 3000)
class UserApi {
  @Get('/users')
  Response listUsers() {
    final users = getAllUsers();
    return Response.ok({'data': users.map((u) => u.toJson()).toList(), 'count': users.length});
  }

  @Get('/users/:id')
  Response getUser(@Param('id') String id) {
    final user = getUserById(id);
    if (user == null) return Response.notFound({'error': 'User $id not found'});
    return Response.ok(user.toJson());
  }

  @Post('/users')
  Response createNewUser(@Body() Map<String, dynamic> body) {
    final name = body['name'] as String?;
    final email = body['email'] as String?;
    if (name == null || name.isEmpty) return Response.badRequest({'error': 'name is required'});
    if (email == null || email.isEmpty) return Response.badRequest({'error': 'email is required'});
    return Response.created(createUser(name, email).toJson());
  }

  @Delete('/users/:id')
  Response removeUser(@Param('id') String id) {
    if (!deleteUser(id)) return Response.notFound({'error': 'User $id not found'});
    return Response.noContent();
  }
}
```

## Known Compiler Gaps (TODO)

The compiler generates nearly correct JS but a few Dart idioms need post-processing:

| Dart | JS (needed) | Status |
|------|-------------|--------|
| `map.values.toList()` | `Object.values(map)` | Manual fix |
| `map.containsKey(k)` | `k in map` | Manual fix |
| `map.remove(k)` | `delete map[k]` | Manual fix |
| `list.toList()` | (remove call) | Manual fix |
| `str.isEmpty` | `str.length === 0` | Manual fix |
| Top-level vars before class use | Move after class | Manual fix |

These will be fixed in the compiler's expression code generator in a follow-up.
