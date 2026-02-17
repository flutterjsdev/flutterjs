// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/// Represents an incoming HTTP request.
///
/// Maps directly to the Node.js IncomingMessage object at runtime.
class Request {
  /// The HTTP method (GET, POST, PUT, DELETE, etc.)
  final String method;

  /// The full request URL including query string
  final String url;

  /// The URL path without query string
  final String path;

  /// Parsed URL path parameters (e.g. /users/:id → {'id': '42'})
  final Map<String, String> params;

  /// Parsed query string parameters.
  /// Values are [String] for single params, [List<String>] for repeated params (?a=1&a=2).
  final Map<String, dynamic> query;

  /// Request headers (lowercase keys)
  final Map<String, String> headers;

  /// The parsed request body (available after body parsing)
  final dynamic body;

  /// The raw body as a string
  final String rawBody;

  const Request({
    required this.method,
    required this.url,
    required this.path,
    this.params = const {},
    this.query = const <String, dynamic>{},
    this.headers = const {},
    this.body,
    this.rawBody = '',
  });

  /// Returns a header value by name (case-insensitive).
  String? header(String name) => headers[name.toLowerCase()];

  /// Returns the content type header value.
  String? get contentType => header('content-type');

  /// Returns true if the request body is JSON.
  bool get isJson => contentType?.contains('application/json') ?? false;

  /// Returns the authorization header value.
  String? get authorization => header('authorization');

  /// Returns the bearer token from the Authorization header.
  String? get bearerToken {
    final auth = authorization;
    if (auth != null && auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    return null;
  }

  /// Returns a single query param by [name], or [defaultValue] if absent.
  ///
  /// When the param is repeated (?a=1&a=2), returns the first value.
  /// At runtime maps to `req.queryParam(name, defaultValue)`.
  String? queryParam(String name, [String? defaultValue]) =>
      query[name] ?? defaultValue;

  /// Returns all values for a repeated query param (e.g. ?tag=a&tag=b).
  ///
  /// At runtime maps to `req.queryParamAll(name)`.
  List<String> queryParamAll(String name) {
    final v = query[name];
    return v != null ? [v] : [];
  }

  /// Returns the body as a [Map], safely — never throws even if body is null.
  ///
  /// Use instead of `body as Map<String, dynamic>` to avoid cast crashes.
  /// At runtime maps to `req.bodyAsMap()`.
  Map<String, dynamic> bodyAsMap() =>
      body is Map<String, dynamic> ? body as Map<String, dynamic> : {};

  /// Returns the body as a [List], safely.
  ///
  /// At runtime maps to `req.bodyAsList()`.
  List<dynamic> bodyAsList() =>
      body is List ? body as List<dynamic> : [];
}
