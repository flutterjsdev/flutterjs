import 'dart:convert';
import 'package:http/http.dart' as http;
import 'model/package_info.dart';
import 'pub_dev_client.dart';
import 'flutterjs_registry_client.dart';

/// Responsible for fetching package mapping data from pub.dev or npm registry.
///
/// This class now delegates to PubDevClient but first checks for FlutterJS overrides.
class RegistryClient {
  static const String _npmRegistry = 'https://registry.npmjs.org';
  static const String _defaultScope = '@flutterjs';

  final http.Client _client;
  final PubDevClient _pubDevClient;
  final FlutterJSRegistryClient _flutterJSRegistry;
  final String scope;

  RegistryClient({
    http.Client? client,
    PubDevClient? pubDevClient,
    FlutterJSRegistryClient? flutterJSRegistry,
    this.scope = _defaultScope,
  }) : _client = client ?? http.Client(),
       _pubDevClient = pubDevClient ?? PubDevClient(),
       _flutterJSRegistry = flutterJSRegistry ?? FlutterJSRegistryClient();

  /// Fetches the package info from pub.dev (preferred) or npm registry.
  ///
  /// Checks FlutterJS registry for overrides specifically for generic package names like 'http'.
  /// Returns null if the package is not found or if there is an error.
  Future<PackageInfo?> fetchPackageInfo(String packageName) async {
    // 1. Check for FlutterJS Registry alias (e.g. http -> flutterjs_http)
    final replacement = await _flutterJSRegistry.getReplacementPackage(
      packageName,
    );
    final targetPackageName = replacement ?? packageName;

    if (replacement != null) {
      print(
        'Note: "$packageName" maps to "$replacement" in FlutterJS registry.',
      );
    }

    // 2. Try pub.dev with the TARGET name
    final pubDevInfo = await _pubDevClient.fetchPackageInfo(targetPackageName);
    if (pubDevInfo != null) {
      // If we swapped names, we might want to wrap the result to reflect the original requested name
      // but functionality-wise, returning the actual info is usually best.
      return pubDevInfo;
    }

    // 3. Fallback to npm for external packages
    print('Package $targetPackageName not found on pub.dev, trying npm...');
    return await _fetchFromNpm(targetPackageName);
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
