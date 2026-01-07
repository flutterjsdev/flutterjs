import 'dart:convert';
import 'package:http/http.dart' as http;
import 'model/package_info.dart';

/// Responsible for fetching package mapping data from npm registry.
class RegistryClient {
  static const String _npmRegistry = 'https://registry.npmjs.org';
  static const String _defaultScope = '@flutterjs';

  final http.Client _client;
  final String scope;

  RegistryClient({
    http.Client? client,
    this.scope = _defaultScope,
  }) : _client = client ?? http.Client();

  /// Fetches the package info from npm registry.
  ///
  /// Converts a pubspec package name to npm scoped package name.
  /// Example: 'material' -> '@flutterjs/material'
  ///
  /// Returns null if the package is not found or if there is an error.
  Future<PackageInfo?> fetchPackageInfo(String packageName) async {
    // Convert package name to npm scoped package
    final npmPackageName = _toNpmPackageName(packageName);

    final url = Uri.parse('$_npmRegistry/$npmPackageName');

    try {
      final response = await _client.get(url);

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return PackageInfo.fromNpmJson(json, packageName);
      } else if (response.statusCode == 404) {
        print('Package $npmPackageName not found on npm registry');
        return null;
      } else {
        print(
            'Error fetching $npmPackageName from npm (Status ${response.statusCode})');
        return null;
      }
    } catch (e) {
      print('Error fetching package $npmPackageName: $e');
      return null;
    }
  }

  /// Convert pubspec package name to npm scoped package name
  /// Example: 'material' -> '@flutterjs/material'
  String _toNpmPackageName(String packageName) {
    // If already scoped, return as-is
    if (packageName.startsWith('@')) {
      return packageName;
    }

    // Convert to scoped package
    return '$scope/$packageName';
  }

  /// Get the npm package name for a given pubspec package name
  String getNpmPackageName(String packageName) {
    return _toNpmPackageName(packageName);
  }
}
