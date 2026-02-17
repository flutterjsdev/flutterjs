// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/// Represents an HTTP response to be sent to the client.
class Response {
  /// The HTTP status code.
  final int statusCode;

  /// The response body.
  final dynamic body;

  /// The response headers.
  final Map<String, String> headers;

  const Response(
    this.statusCode, {
    this.body,
    this.headers = const {},
  });

  /// Creates a 200 OK response.
  factory Response.ok([dynamic body, Map<String, String> headers = const {}]) {
    return Response(200, body: body, headers: headers);
  }

  /// Creates a 201 Created response.
  factory Response.created([dynamic body, Map<String, String> headers = const {}]) {
    return Response(201, body: body, headers: headers);
  }

  /// Creates a 204 No Content response.
  factory Response.noContent() {
    return Response(204);
  }

  /// Creates a 400 Bad Request response.
  factory Response.badRequest([dynamic body]) {
    return Response(400, body: body ?? {'error': 'Bad Request'});
  }

  /// Creates a 401 Unauthorized response.
  factory Response.unauthorized([dynamic body]) {
    return Response(401, body: body ?? {'error': 'Unauthorized'});
  }

  /// Creates a 403 Forbidden response.
  factory Response.forbidden([dynamic body]) {
    return Response(403, body: body ?? {'error': 'Forbidden'});
  }

  /// Creates a 404 Not Found response.
  factory Response.notFound([dynamic body]) {
    return Response(404, body: body ?? {'error': 'Not Found'});
  }

  /// Creates a 409 Conflict response.
  factory Response.conflict([dynamic body]) {
    return Response(409, body: body ?? {'error': 'Conflict'});
  }

  /// Creates a 422 Unprocessable Entity response.
  factory Response.unprocessable([dynamic body]) {
    return Response(422, body: body ?? {'error': 'Unprocessable Entity'});
  }

  /// Creates a 500 Internal Server Error response.
  factory Response.internalError([dynamic body]) {
    return Response(500, body: body ?? {'error': 'Internal Server Error'});
  }

  /// Creates a JSON response with the given status code.
  factory Response.json(int statusCode, dynamic data) {
    return Response(statusCode, body: data, headers: {'content-type': 'application/json'});
  }

  /// Creates a redirect response.
  factory Response.redirect(String url, {int statusCode = 302}) {
    return Response(statusCode, headers: {'location': url});
  }

  /// Creates a streaming response — chunked transfer, no `content-length`.
  ///
  /// [stream] must be a [Stream<String>] or [Stream<List<int>>].
  /// At runtime this maps to `Response.stream(asyncIterable)` in Node.js.
  ///
  /// ```dart
  /// @Get('/download')
  /// Response download() => Response.stream(
  ///   Stream.fromIterable(['chunk1', 'chunk2']),
  ///   contentType: 'text/plain',
  /// );
  /// ```
  factory Response.stream(
    Stream<dynamic> stream, {
    String contentType = 'application/octet-stream',
    int status = 200,
    Map<String, String> headers = const {},
  }) {
    return Response(status, body: stream, headers: {'content-type': contentType, ...headers});
  }

  /// Creates a Server-Sent Events (SSE) streaming response.
  ///
  /// [stream] yields string payloads (typically JSON-encoded). Each value is
  /// automatically wrapped as `data: <value>\n\n`.
  ///
  /// ```dart
  /// @Get('/events')
  /// Response events() => Response.sse(
  ///   Stream.periodic(Duration(seconds: 1), (i) => '{"tick":$i}').take(10),
  /// );
  /// ```
  factory Response.sse(
    Stream<String> stream, {
    Map<String, String> headers = const {},
  }) {
    return Response(200, body: stream, headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'x-accel-buffering': 'no',
      ...headers,
    });
  }

  /// Returns a copy of this response with additional headers.
  Response withHeaders(Map<String, String> additionalHeaders) {
    return Response(
      statusCode,
      body: body,
      headers: {...headers, ...additionalHeaders},
    );
  }
}
