// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:flutterjs_server/flutterjs_server.dart';
import 'api.dart';

/// Entry point — compiled to main.js by FlutterJS.
///
/// Run with:
///   dart run flutterjs build .
///   node build/flutterjs/src/main.js
void main() {
  final server = FlutterjsServer(port: 3000);
  final api = UserApi();

  server
    ..use(cors())
    ..use(logger())
    ..mount((router, prefix) {
      router
        ..add('GET', '$prefix/', (req) => api.root())
        ..add('GET', '$prefix/health', (req) => api.health())
        ..add('GET', '$prefix/users', (req) => api.listUsers())
        ..add('GET', '$prefix/users/:id', (req) => api.getUser(req.params['id']!))
        ..add('POST', '$prefix/users', (req) => api.createNewUser(req.body as Map<String, dynamic>))
        ..add('DELETE', '$prefix/users/:id', (req) => api.removeUser(req.params['id']!));
    })
    ..listen();
}
