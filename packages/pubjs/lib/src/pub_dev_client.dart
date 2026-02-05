// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'model/package_info.dart';

/// Client for interacting with pub.dev API
///
/// Fetches package metadata and tarball URLs from pub.dev registry.
///
/// Example:
/// ```dart
/// final client = PubDevClient();
/// final packageInfo = await client.fetchPackageInfo('http');
/// print('Latest version: ${packageInfo?.version}');
/// print('Tarball URL: ${packageInfo?.archiveUrl}');
/// ```
class PubDevClient {
  static const String _pubDevRegistry = 'https://pub.dev/api/packages';

  final http.Client _client;

  PubDevClient({http.Client? client}) : _client = client ?? http.Client();

  /// Fetches package information from pub.dev
  ///
  /// Returns [PackageInfo] with latest version and archive URL,
  /// or null if package not found or error occurs.
  ///
  /// Example:
  /// ```dart
  /// final info = await client.fetchPackageInfo('http');
  /// if (info != null) {
  ///   print('Found version ${info.version}');
  /// }
  /// ```
  Future<PackageInfo?> fetchPackageInfo(String packageName) async {
    final url = Uri.parse('$_pubDevRegistry/$packageName');

    try {
      final response = await _client.get(url);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return PackageInfo.fromPubDevJson(json, packageName);
      } else if (response.statusCode == 404) {
        print('Package $packageName not found on pub.dev');
        return null;
      } else {
        print(
          'Error fetching $packageName from pub.dev (Status ${response.statusCode})',
        );
        return null;
      }
    } catch (e) {
      print('Error fetching package $packageName: $e');
      return null;
    }
  }

  /// Fetches a specific version of a package from pub.dev
  ///
  /// Returns [PackageInfo] for the requested version,
  /// or null if version not found.
  ///
  /// Example:
  /// ```dart
  /// final info = await client.fetchPackageVersion('http', '1.1.0');
  /// ```
  Future<PackageInfo?> fetchPackageVersion(
    String packageName,
    String version,
  ) async {
    final url = Uri.parse('$_pubDevRegistry/$packageName');

    try {
      final response = await _client.get(url);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;

        // Find the specific version in the versions list
        final versions = json['versions'] as List<dynamic>?;
        if (versions == null) return null;

        for (final versionData in versions) {
          final versionMap = versionData as Map<String, dynamic>;
          if (versionMap['version'] == version) {
            return PackageInfo.fromPubDevVersionJson(versionMap, packageName);
          }
        }

        print('Version $version of $packageName not found on pub.dev');
        return null;
      } else if (response.statusCode == 404) {
        print('Package $packageName not found on pub.dev');
        return null;
      } else {
        print(
          'Error fetching $packageName from pub.dev (Status ${response.statusCode})',
        );
        return null;
      }
    } catch (e) {
      print('Error fetching package $packageName version $version: $e');
      return null;
    }
  }

  /// Checks if a package exists on pub.dev
  ///
  /// Returns true if the package exists, false otherwise.
  Future<bool> packageExists(String packageName) async {
    final info = await fetchPackageInfo(packageName);
    return info != null;
  }

  /// Gets all available versions of a package
  ///
  /// Returns a list of version strings, or empty list if not found.
  ///
  /// Example:
  /// ```dart
  /// final versions = await client.getAvailableVersions('http');
  /// print('Available versions: $versions');
  /// ```
  Future<List<String>> getAvailableVersions(String packageName) async {
    final url = Uri.parse('$_pubDevRegistry/$packageName');

    try {
      final response = await _client.get(url);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final versions = json['versions'] as List<dynamic>?;

        if (versions == null) return [];

        return versions
            .map((v) => (v as Map<String, dynamic>)['version'] as String)
            .toList();
      }

      return [];
    } catch (e) {
      print('Error fetching versions for $packageName: $e');
      return [];
    }
  }

  /// Dispose the HTTP client
  void dispose() {
    _client.close();
  }
}
