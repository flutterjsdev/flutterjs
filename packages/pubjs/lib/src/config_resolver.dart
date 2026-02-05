// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';

/// Resolves configuration from flutterjs.config.js
///
/// Parses JavaScript configuration file to extract package version overrides
/// and other FlutterJS-specific settings.
class ConfigResolver {
  /// Reads and parses flutterjs.config.js
  ///
  /// Returns a map of package names to version constraints from the
  /// `dependencies.pubDev` section, or empty map if not found.
  ///
  /// Example config:
  /// ```js
  /// module.exports = {
  ///   dependencies: {
  ///     pubDev: {
  ///       'http': '^1.1.0',
  ///       'provider': '^6.0.0',
  ///     }
  ///   }
  /// }
  /// ```
  Future<Map<String, String>> resolvePubDevDependencies(
    String configPath,
  ) async {
    final configFile = File(configPath);

    if (!await configFile.exists()) {
      return {};
    }

    try {
      final content = await configFile.readAsString();

      // Extract dependencies.pubDev section using regex
      // This is a simple parser - for production, consider using a JS parser
      final pubDevMatch = RegExp(
        r'pubDev\s*:\s*\{([^}]*)\}',
        multiLine: true,
        dotAll: true,
      ).firstMatch(content);

      if (pubDevMatch == null) {
        return {};
      }

      final pubDevSection = pubDevMatch.group(1) ?? '';
      final dependencies = <String, String>{};

      // Parse each line: 'package': 'version',
      final linePattern = RegExp(
        r'''['"]([\w\-]+)['"]\s*:\s*['"]([\^~<>=\.\d\w\-\s]+)['"]''',
      );

      for (final match in linePattern.allMatches(pubDevSection)) {
        final packageName = match.group(1);
        final version = match.group(2);
        if (packageName != null && version != null) {
          dependencies[packageName] = version;
        }
      }

      return dependencies;
    } catch (e) {
      print('Error parsing flutterjs.config.js dependencies: $e');
      return {};
    }
  }

  /// Resolves local path overrides from flutterjs.config.js
  ///
  /// Example config:
  /// ```js
  /// module.exports = {
  ///   localPaths: {
  ///     'my_package': '../my_package',
  ///   }
  /// }
  /// ```
  Future<Map<String, String>> resolveLocalPaths(String configPath) async {
    final configFile = File(configPath);

    if (!await configFile.exists()) {
      return {};
    }

    try {
      final content = await configFile.readAsString();

      // Extract localPaths section using regex
      final localPathsMatch = RegExp(
        r'localPaths\s*:\s*\{([^}]*)\}',
        multiLine: true,
        dotAll: true,
      ).firstMatch(content);

      if (localPathsMatch == null) {
        return {};
      }

      final section = localPathsMatch.group(1) ?? '';
      final paths = <String, String>{};

      // Parse each line: 'package': './path',
      final linePattern = RegExp(
        r'''['"]([\w\-]+)['"]\s*:\s*['"]([^'"]+)['"]''',
      );

      for (final match in linePattern.allMatches(section)) {
        final packageName = match.group(1);
        final path = match.group(2);
        if (packageName != null && path != null) {
          paths[packageName] = path;
        }
      }

      return paths;
    } catch (e) {
      print('Error parsing flutterjs.config.js localPaths: $e');
      return {};
    }
  }

  /// Parses the unified 'packages' configuration from flutterjs.config.js
  ///
  /// Returns a map of Dart package names to their configuration.
  Future<Map<String, UserPackageConfig>> resolvePackageConfig(
    String configPath,
  ) async {
    final configFile = File(configPath);
    if (!await configFile.exists()) return {};

    try {
      final content = await configFile.readAsString();

      // Extract 'packages' object using brace counting
      // Find "packages:"
      final startMatch = RegExp(r'packages\s*:\s*\{').firstMatch(content);
      if (startMatch == null) return {};

      final startIndex = startMatch.end - 1; // pointing to '{'
      int braceCount = 0;
      int endIndex = -1;

      for (int i = startIndex; i < content.length; i++) {
        final char = content[i];
        if (char == '{') {
          braceCount++;
        } else if (char == '}') {
          braceCount--;
          if (braceCount == 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex == -1) return {};

      // Content inside the outer braces
      final section = content.substring(startIndex + 1, endIndex);
      final configs = <String, UserPackageConfig>{};

      // 2. Object: 'key': { ... }
      // This is hard to regex robustly, but for common cases:
      // We might need a better parser or assume simple formatting.
      // For now, let's look for known patterns line by line or block based.
      // Actually, simplest is to capture everything and try to parse.

      // Let's iterate lines for simplicity if assumptions hold (one entry per line usually)
      // But multi-line objects break this.

      // Better approach for Regex parser of JS Object:
      // Find keys, look ahead for value.

      // Combined Iterator:
      // Match keys that are strings (quoted or not if simple keys?)
      // JS object keys can be unquoted, but our generator uses quotes.
      // Let's assume quoted for reliability.
      final keyPattern = RegExp(r'''(?:['"]([\w\-]+)['"]|([\w\-]+))\s*:\s*''');
      final matches = keyPattern.allMatches(section);

      for (final match in matches) {
        final key = match.group(1) ?? match.group(2)!;
        final start = match.end;

        final remainder = section
            .substring(start)
            .trimLeft(); // Keep newlines in check

        if (remainder.startsWith("'") || remainder.startsWith('"')) {
          // String Value
          final quote = remainder[0];
          final endQuote = remainder.indexOf(quote, 1);
          if (endQuote != -1) {
            final value = remainder.substring(1, endQuote);
            final parts = value.split(':');
            configs[key] = UserPackageConfig(
              flutterJsPackage: parts[0],
              version: parts.length > 1 ? parts[1] : null,
            );
          }
        } else if (remainder.startsWith("{")) {
          // Object Value: { path: '...' }
          final endBrace = remainder.indexOf('}');
          if (endBrace != -1) {
            final objContent = remainder.substring(1, endBrace);

            final pathMatch = RegExp(
              r'''path\s*:\s*['"]([^'"]+)['"]''',
            ).firstMatch(objContent);
            String? path = pathMatch?.group(1);

            final pkgMatch = RegExp(
              r'''(flutterJsPackage|flutterjs_package)\s*:\s*['"]([^'"]+)['"]''',
            ).firstMatch(objContent);
            String? pkg = pkgMatch?.group(2);

            configs[key] = UserPackageConfig(path: path, flutterJsPackage: pkg);
          }
        }
      }

      return configs;
    } catch (e) {
      print('Error parsing flutterjs.config.js packages: $e');
      return {};
    }
  }

  /// Checks if a config file exists at the given path
  Future<bool> configExists(String configPath) async {
    return File(configPath).exists();
  }
}

class UserPackageConfig {
  final String? flutterJsPackage;
  final String? version;
  final String? path;

  UserPackageConfig({this.flutterJsPackage, this.version, this.path});

  bool get isLocal => path != null;
}
