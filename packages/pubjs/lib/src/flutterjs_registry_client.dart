// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:convert';
import 'package:http/http.dart' as http;

class FlutterJSRegistryClient {
  static const String _registryUrl =
      'https://raw.githubusercontent.com/flutterjsdev/flutterjs_website/master/content/registry.json';

  /// Built-in fallback registry for common packages.
  /// Used when the remote registry is unreachable.
  static const Map<String, String> _localFallback = {
    // State management
    'provider': 'provider',
    'riverpod': 'riverpod',
    'flutter_riverpod': 'flutter_riverpod',
    'bloc': 'bloc',
    'flutter_bloc': 'flutter_bloc',
    // Networking
    'http': 'http',
    'dio': 'dio',
    // Storage
    'shared_preferences': 'shared_preferences',
    'hive': 'hive',
    // UI
    'google_fonts': 'google_fonts',
    'cached_network_image': 'cached_network_image',
    'flutter_svg': 'flutter_svg',
    // Navigation
    'go_router': 'go_router',
    // Utilities
    'intl': 'intl',
    'collection': 'collection',
    'path': 'path',
    'equatable': 'equatable',
    'json_annotation': 'json_annotation',
    'freezed_annotation': 'freezed_annotation',
    // Platform
    'url_launcher': 'url_launcher',
    'url_launcher_web': 'url_launcher_web',
    'path_provider': 'path_provider',
    'path_provider_web': 'path_provider_web',
  };

  final http.Client _client;

  FlutterJSRegistryClient({http.Client? client})
    : _client = client ?? http.Client();

  Future<Map<String, dynamic>?> fetchRegistry() async {
    try {
      final response = await _client
          .get(Uri.parse(_registryUrl))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      // Network unavailable - callers will use _localFallback
      return null;
    }
  }

  Future<String?> getReplacementPackage(String originalPackage) async {
    final registry = await fetchRegistry();

    if (registry != null) {
      final packages = registry['packages'] as List<dynamic>? ?? [];
      for (final pkg in packages) {
        if (pkg['name'] == originalPackage) {
          return pkg['flutterjs_package'] as String?;
        }
      }
    }

    // Fallback to local map when registry is unavailable
    return _localFallback[originalPackage];
  }
}
