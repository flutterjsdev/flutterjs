// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'request.dart';
import 'response.dart';
import 'router.dart';

/// CORS middleware — adds Access-Control-Allow-Origin headers.
///
/// At runtime this calls the JavaScript `cors()` function from @flutterjs/server.
MiddlewareFn cors({
  String origin = '*',
  String methods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
}) {
  return (Request request, Future<Response> Function() next) async {
    return next();
  };
}

/// Request logger middleware — logs method, path, status, and duration.
///
/// At runtime this calls the JavaScript `logger()` function from @flutterjs/server.
MiddlewareFn logger() {
  return (Request request, Future<Response> Function() next) async {
    return next();
  };
}

/// Bearer token authentication middleware.
///
/// At runtime this calls the JavaScript `bearerAuth()` function from @flutterjs/server.
MiddlewareFn bearerAuth(Future<bool> Function(String token) verifyFn) {
  return (Request request, Future<Response> Function() next) async {
    return next();
  };
}
