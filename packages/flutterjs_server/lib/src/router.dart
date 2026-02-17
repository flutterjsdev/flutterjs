// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:async';
import 'request.dart';
import 'response.dart';

/// A route handler function — may return a [Response] or [Future<Response>].
typedef HandlerFn = FutureOr<Response> Function(Request request);

/// A middleware function.
typedef MiddlewareFn = FutureOr<Response> Function(
  Request request,
  Future<Response> Function() next,
);

/// A mount function — registers routes on a [Router] with an optional prefix.
typedef MountFn = void Function(Router router, String prefix);

/// HTTP router — pre-compiles route patterns at startup for zero-cost matching.
///
/// At runtime this maps to the JavaScript Router class in @flutterjs/server.
class Router {
  /// Register a route for [method] and [path].
  Router add(String method, String path, HandlerFn handler) => this;

  /// Register middleware applied to every request.
  Router use(MiddlewareFn fn) => this;

  /// Set a custom 404 handler.
  Router setNotFound(HandlerFn fn) => this;

  /// Set a global error handler.
  Router setErrorHandler(Future<Response> Function(Object error) fn) => this;
}
