// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/// Marks a class as an HTTP server.
///
/// The compiled output will create a Node.js HTTP server listening on [port].
///
/// ```dart
/// @Server(port: 3000)
/// class MyApi {
///   @Get('/hello')
///   Response hello() => Response.ok('Hello world');
/// }
/// ```
class Server {
  final int port;
  final String? host;
  final String? prefix;

  const Server({this.port = 3000, this.host, this.prefix});
}

/// Marks a method as a GET route handler.
class Get {
  final String path;
  const Get(this.path);
}

/// Marks a method as a POST route handler.
class Post {
  final String path;
  const Post(this.path);
}

/// Marks a method as a PUT route handler.
class Put {
  final String path;
  const Put(this.path);
}

/// Marks a method as a PATCH route handler.
class Patch {
  final String path;
  const Patch(this.path);
}

/// Marks a method as a DELETE route handler.
class Delete {
  final String path;
  const Delete(this.path);
}

/// Marks a method as handling all HTTP methods for a path.
class Route {
  final String path;
  final List<String> methods;
  const Route(this.path, {this.methods = const ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']});
}

/// Injects the request body (parsed as JSON) into a parameter.
///
/// ```dart
/// @Post('/users')
/// Future<Response> createUser(@Body() Map<String, dynamic> body) async { ... }
/// ```
class Body {
  const Body();
}

/// Injects a URL path parameter into a parameter.
///
/// ```dart
/// @Get('/users/:id')
/// Future<Response> getUser(@Param('id') String id) async { ... }
/// ```
class Param {
  final String name;
  const Param(this.name);
}

/// Injects a query string parameter into a parameter.
///
/// ```dart
/// @Get('/search')
/// Response search(@Query('q') String query) { ... }
/// ```
class Query {
  final String name;
  final dynamic defaultValue;
  const Query(this.name, {this.defaultValue});
}

/// Injects a request header value into a parameter.
class Header {
  final String name;
  const Header(this.name);
}

/// Marks a method parameter as receiving the full [Request] object.
class Req {
  const Req();
}

/// Applies middleware to a class or method.
///
/// ```dart
/// @Server(port: 3000)
/// @Middleware([authMiddleware, corsMiddleware])
/// class MyApi { ... }
/// ```
class Middleware {
  final List<dynamic> handlers;
  const Middleware(this.handlers);
}

/// Marks a controller method to require authentication.
class Guard {
  final List<Type> guards;
  const Guard(this.guards);
}
