// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:convert';
import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:yaml/yaml.dart';

/// Resolves package locations using .dart_tool/package_config.json
class PackageResolver {
  final Map<String, String> _packagePaths = {};

  // Cache for parsed dependencies
  final Map<String, List<String>> _dependenciesCache = {};

  /// Returns the absolute path to the root of the specified package.
  String? resolvePackagePath(String packageName) {
    return _packagePaths[packageName];
  }

  /// Returns a map of all resolved packages and their paths.
  Map<String, String> get packagePaths => Map.unmodifiable(_packagePaths);

  /// Returns a list of direct dependencies for the given package.
  Future<List<String>> getDependencies(String packageName) async {
    if (_dependenciesCache.containsKey(packageName)) {
      return _dependenciesCache[packageName]!;
    }

    final packagePath = resolvePackagePath(packageName);
    if (packagePath == null) {
      throw Exception('Package $packageName not found in configuration.');
    }

    final pubspecPath = p.join(packagePath, 'pubspec.yaml');
    final pubspecFile = File(pubspecPath);

    if (!await pubspecFile.exists()) {
      // Could be the SDK or a special package without pubspec?
      // Assume no dependencies.
      _dependenciesCache[packageName] = [];
      return [];
    }

    try {
      final content = await pubspecFile.readAsString();
      final yaml = loadYaml(content);
      final deps = <String>[];

      if (yaml is Map && yaml.containsKey('dependencies')) {
        final dependencies = yaml['dependencies'];
        if (dependencies is Map) {
          deps.addAll(dependencies.keys.cast<String>());
        }
      }

      _dependenciesCache[packageName] = deps;
      return deps;
    } catch (e) {
      print('Warning: Failed to parse pubspec.yaml for $packageName: $e');
      return [];
    }
  }

  /// Loads and parses the package_config.json file.
  ///
  /// [projectRoot] is the root of the project containing the .dart_tool directory.
  static Future<PackageResolver> load(String projectRoot) async {
    final resolver = PackageResolver();
    await resolver._loadConfig(projectRoot);
    return resolver;
  }

  Future<void> _loadConfig(String projectRoot) async {
    final configFile = File(
      p.join(projectRoot, '.dart_tool', 'package_config.json'),
    );

    if (!await configFile.exists()) {
      throw Exception(
        'Package configuration not found at ${configFile.path}. Run "dart pub get" first.',
      );
    }

    try {
      final content = await configFile.readAsString();
      final json = jsonDecode(content) as Map<String, dynamic>;
      final packages = json['packages'] as List<dynamic>;

      for (final pkg in packages) {
        final name = pkg['name'] as String;
        final rootUri = pkg['rootUri'] as String;

        // Convert URI to path
        String path;
        if (rootUri.startsWith('file:///')) {
          path = Uri.parse(rootUri).toFilePath();
        } else {
          // Handle relative URIs (relative to package_config.json location)
          // package_config.json is in .dart_tool/, so .. goes up to project root
          // But spec says relative to the file itself.
          final configDir = p.dirname(configFile.path);
          path = p.normalize(p.join(configDir, rootUri));
        }

        // On Windows, Uri.toFilePath handles standard file URIs,
        // but simple relative paths need p.absolute/normalize if mixed.
        // We will store absolute paths.
        if (!p.isAbsolute(path)) {
          path = p.absolute(path);
        }

        _packagePaths[name] = path;
      }
    } catch (e) {
      throw Exception('Failed to parse package_config.json: $e');
    }
  }
}
