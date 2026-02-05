// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:yaml/yaml.dart';

/// Analyzes pubspec.yaml to find dependencies.
class PubSpecParser {
  /// Parses the [pubspecContent] and returns a list of direct runtime dependencies.
  ///
  /// Excludes `dev_dependencies` as they typically don't need JS resolution
  /// (unless they are builders, which is a separate concern).
  /// Excludes `flutter` and `flutter_test` SDK dependencies.
  List<String> getDependencies(String pubspecContent) {
    try {
      final yaml = loadYaml(pubspecContent);
      if (yaml is! YamlMap) {
        return [];
      }

      final dependencies = yaml['dependencies'];
      if (dependencies is! YamlMap) {
        return [];
      }

      final packageNames = <String>[];
      for (final key in dependencies.keys) {
        final packageName = key.toString();

        // Skip SDK dependencies
        if (packageName == 'flutter' || packageName == 'flutter_test') {
          continue;
        }

        packageNames.add(packageName);
      }

      return packageNames;
    } catch (e) {
      print('Warning: Failed to parse pubspec.yaml: $e');
      return [];
    }
  }
}
