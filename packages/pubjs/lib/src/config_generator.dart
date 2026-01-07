import 'dart:convert';
import 'dart:io';

/// Updates the flutterjs.config.json file with resolved mappings.
class ConfigGenerator {
  /// Updates the `flutterjs.config.json` at [projectPath] with [newMappings].
  ///
  /// [newMappings] is a map of `package:name` -> `js_implementation`.
  /// e.g. `{'package:http': '@flutterjs/http'}`.
  Future<void> updateConfig(
      String projectPath, Map<String, String> newMappings) async {
    final configFile = File('$projectPath/flutterjs.config.json');
    Map<String, dynamic> config = {};

    if (await configFile.exists()) {
      try {
        final content = await configFile.readAsString();
        config = jsonDecode(content) as Map<String, dynamic>;
      } catch (e) {
        print('Error reading existing config: $e');
        // Retrieve empty config or throw? For now gracefully start fresh or partial.
      }
    }

    // Ensure 'packages' key exists
    if (!config.containsKey('packages')) {
      config['packages'] = <String, dynamic>{};
    }

    final packages = config['packages'] as Map<String, dynamic>;

    // Merge new mappings
    // We only overwrite or add.
    for (final entry in newMappings.entries) {
      packages[entry.key] = entry.value;
    }

    // Write back
    const encoder = JsonEncoder.withIndent('  ');
    await configFile.writeAsString(encoder.convert(config));
    print('Updated flutterjs.config.json with ${newMappings.length} mappings.');
  }
}
