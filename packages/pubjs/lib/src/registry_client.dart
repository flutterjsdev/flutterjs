import 'dart:convert';
import 'package:http/http.dart' as http;
import 'model/package_info.dart';
import 'pub_dev_client.dart';

/// Responsible for fetching package mapping data from pub.dev or npm registry.
///
/// This class now primarily delegates to PubDevClient for standard packages.
class RegistryClient {
  static const String _npmRegistry = 'https://registry.npmjs.org';
  static const String _defaultScope = '@flutterjs';

  final http.Client _client;
  final PubDevClient _pubDevClient;
  final String scope;

  RegistryClient({
    http.Client? client,
    PubDevClient? pubDevClient,
    this.scope = _defaultScope,
  }) : _client = client ?? http.Client(),
       _pubDevClient = pubDevClient ?? PubDevClient();

  /// Fetches the package info from pub.dev (preferred) or npm registry.
  ///
  /// Tries pub.dev first. If not found, fallsback to npm for external packages.
  ///
  /// Returns null if the package is not found or if there is an error.
  Future<PackageInfo?> fetchPackageInfo(String packageName) async {
    // Try pub.dev first
    final pubDevInfo = await _pubDevClient.fetchPackageInfo(packageName);
    if (pubDevInfo != null) {
      return pubDevInfo;
    }

    // Fallback to npm for external packages
    print('Package $packageName not found on pub.dev, trying npm...');
    return await _fetchFromNpm(packageName);
  }

  /// Fetches package from npm registry (for external packages)
  Future<PackageInfo?> _fetchFromNpm(String packageName) async {
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
          'Error fetching $npmPackageName from npm (Status ${response.statusCode})',
        );
        return null;
      }
    } catch (e) {
      print('Error fetching package $npmPackageName: $e');
      return null;
    }
  }

  /// Convert package name to npm scoped package name
  /// Example: 'material' -> '@flutterjs/material'
  String _toNpmPackageName(String packageName) {
    // If already scoped, return as-is
    if (packageName.startsWith('@')) {
      return packageName;
    }

    // Convert to scoped package
    return '$scope/$packageName';
  }

  /// Get the npm package name for a given package name
  String getNpmPackageName(String packageName) {
    return _toNpmPackageName(packageName);
  }

  /// Dispose resources
  void dispose() {
    _client.close();
    _pubDevClient.dispose();
  }
}
