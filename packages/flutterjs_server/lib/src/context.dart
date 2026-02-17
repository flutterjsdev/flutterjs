// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'request.dart';

/// Represents the execution context for a single request.
///
/// Holds per-request state that can be shared between middleware and handlers
/// via the [data] map.
class Context {
  final Request request;
  final Map<String, dynamic> data;

  Context({required this.request, Map<String, dynamic>? data})
      : data = data ?? {};

  /// Store a value in the context.
  void set(String key, dynamic value) => data[key] = value;

  /// Retrieve a value from the context.
  T? get<T>(String key) => data[key] as T?;
}
