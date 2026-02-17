// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'router.dart';

/// The FlutterJS HTTP server — wraps Node.js `node:http` at runtime.
///
/// Create a server, mount routes, attach middleware, then call [listen].
///
/// ```dart
/// final server = FlutterjsServer(port: 3000);
/// server
///   ..use(cors())
///   ..use(logger())
///   ..mount((router, prefix) {
///     router.add('GET', '$prefix/hello', (_req) async => Response.ok('hi'));
///   })
///   ..listen();
/// ```
class FlutterjsServer {
  final int port;
  final String host;
  final String prefix;

  FlutterjsServer({this.port = 3000, this.host = '0.0.0.0', this.prefix = ''});

  /// Mount a controller function that registers routes on the internal router.
  FlutterjsServer mount(MountFn fn) => this;

  /// Register middleware applied to every request.
  FlutterjsServer use(MiddlewareFn fn) => this;

  /// Start listening on [port].
  FlutterjsServer listen([void Function()? callback]) => this;

  /// Stop the server.
  Future<void> close() async {}
}
