import 'dart:io';
import 'package:path/path.dart' as p;

class ConfigGenerator {
  /// Generates a default `flutterjs.config.js` in the project root.
  ///
  /// Populates 'packages' map based on [dependencies] from pubspec.yaml.
  Future<void> createDefaultConfig(
    String projectPath,
    Map<dynamic, dynamic> dependencies,
  ) async {
    final configPath = p.join(projectPath, 'flutterjs.config.js');
    final configFile = File(configPath);

    if (await configFile.exists()) {
      return;
    }

    final buffer = StringBuffer();
    buffer.writeln('module.exports = {');
    buffer.writeln('  packages: {');

    for (final entry in dependencies.entries) {
      final name = entry.key;
      // Skip SDK and flutter itself
      if (name == 'flutter' ||
          (entry.value is Map && entry.value['sdk'] != null)) {
        continue;
      }

      // For now, initiate all as null (unknown/to-be-configured)
      // The user can then fill in: 'flutterjs_pkg:version' OR { path: '...' }
      // If we wanted to be smarter, we could check registry here, but
      // strict mode philosophy puts burden on user configuration for explicit clarity.
      buffer.writeln(
        "    '$name': null, // TODO: Set to 'flutterjs_$name:version' or { path: './...' }",
      );
    }

    buffer.writeln('  }');
    buffer.writeln('};');

    await configFile.writeAsString(buffer.toString());
    print('Created default configuration: $configPath');
  }
}
