# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-17

### Added
- Initial release of flutterjs_server
- HTTP server framework for Node.js written in Dart
- Route annotations: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`
- Parameter annotations: `@Param`, `@Body`, `@Query`, `@Header`
- `@Server` annotation for server configuration
- Response helpers: `Response.ok()`, `Response.created()`, `Response.badRequest()`, etc.
- Request object with `method`, `path`, `params`, `query`, `body`, `headers`, `bearerToken`
- Built-in middleware: `cors()`, `logger()`, `bearerAuth()`
- Router with path parameter support (e.g., `/users/:id`)
- JSON and form-urlencoded body parsing
- Middleware chain with `next()` support
- FlutterJS compiler integration for Dart → JavaScript compilation

### Features
- Write Node.js HTTP servers in Dart
- Compile to JavaScript via FlutterJS
- Familiar Express-like API
- Strong typing and null safety
- Async/await support
- Fast regex-based routing
