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
      print('Error parsing flutterjs.config.js: $e');
      return {};
    }
  }

  /// Gets the full configuration object (future expansion)
  ///
  /// Currently returns a simplified config map.
  Future<Map<String, dynamic>> resolveConfig(String configPath) async {
    final pubDevDeps = await resolvePubDevDependencies(configPath);

    return {
      'dependencies': {'pubDev': pubDevDeps},
    };
  }

  /// Checks if a config file exists at the given path
  Future<bool> configExists(String configPath) async {
    return File(configPath).exists();
  }
}
