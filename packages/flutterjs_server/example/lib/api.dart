// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:flutterjs_server/flutterjs_server.dart';
import 'models.dart';

@Server(port: 3000)
class UserApi {
  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('/users')
  Response listUsers() {
    final users = getAllUsers();
    return Response.ok({
      'data': users.map((u) => u.toJson()).toList(),
      'count': users.length,
    });
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

    if (name == null || name.isEmpty) {
      return Response.badRequest({'error': 'name is required'});
    }
    if (email == null || email.isEmpty) {
      return Response.badRequest({'error': 'email is required'});
    }

    final user = createUser(name, email);
    return Response.created(user.toJson());
  }

  @Delete('/users/:id')
  Response removeUser(@Param('id') String id) {
    final deleted = deleteUser(id);
    if (!deleted) return Response.notFound({'error': 'User $id not found'});
    return Response.noContent();
  }

  // ── Health ─────────────────────────────────────────────────────────────────

  @Get('/health')
  Response health() => Response.ok({
    'status': 'ok',
    'server': 'FlutterJS Server',
    'version': '1.0.0',
  });

  @Get('/')
  Response root() => Response.ok({
    'message': 'Welcome to the FlutterJS Server demo API!',
    'endpoints': [
      'GET  /health',
      'GET  /users',
      'GET  /users/:id',
      'POST /users',
      'DELETE /users/:id',
    ],
  });
}
