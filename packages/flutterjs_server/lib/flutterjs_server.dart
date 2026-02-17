// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/// FlutterJS Server — a fast, Dart-compiled HTTP server framework for Node.js.
///
/// Write your API in Dart using familiar annotations, compile to JavaScript,
/// and run on Node.js with performance that beats Express and Fastify.
///
/// ## Quick Start
///
/// ```dart
/// import 'package:flutterjs_server/flutterjs_server.dart';
///
/// @Server(port: 3000)
/// class MyApi {
///   @Get('/hello')
///   Response hello() => Response.ok({'message': 'Hello, World!'});
///
///   @Get('/users/:id')
///   Future<Response> getUser(@Param('id') String id) async {
///     return Response.ok({'id': id, 'name': 'Alice'});
///   }
///
///   @Post('/users')
///   Future<Response> createUser(@Body() Map<String, dynamic> body) async {
///     return Response.created({'id': '1', ...body});
///   }
/// }
/// ```
///
/// Compile and run:
/// ```bash
/// dart run flutterjs build .
/// node dist/server.js
/// ```
library flutterjs_server;

export 'src/annotations.dart';
export 'src/request.dart';
export 'src/response.dart';
export 'src/context.dart';
export 'src/router.dart';
export 'src/server.dart';
export 'src/middleware.dart';
