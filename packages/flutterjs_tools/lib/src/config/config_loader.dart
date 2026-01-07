import 'dart:convert';
import 'dart:io';
import 'package:path/path.dart' as path;

/// Represents the user-defined configuration for a FlutterJS project.
/// Loaded from `flutterjs.config.json`.
class FlutterJsProjectConfig {
  final Map<String, String> packageMap;
  final bool useLocalRuntime;

  const FlutterJsProjectConfig({
    this.packageMap = const {},
    this.useLocalRuntime = false,
  });

  factory FlutterJsProjectConfig.fromJson(Map<String, dynamic> json) {
    return FlutterJsProjectConfig(
      packageMap: Map<String, String>.from(json['packages'] ?? {}),
      useLocalRuntime: json['useLocalRuntime'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'packages': packageMap,
    'useLocalRuntime': useLocalRuntime,
  };
}

class ConfigLoader {
  static const String _configFileName = 'flutterjs.config.json';

  /// Loads configuration from the project root.
  /// If file doesn't exist, returns default config.
  static Future<FlutterJsProjectConfig> load(String projectPath) async {
    final configFile = File(path.join(projectPath, _configFileName));

    if (await configFile.exists()) {
      try {
        final content = await configFile.readAsString();
        final json = jsonDecode(content);
        return FlutterJsProjectConfig.fromJson(json);
      } catch (e) {
        print('Warning: Failed to parse $_configFileName: $e');
        return const FlutterJsProjectConfig();
      }
    }

    return const FlutterJsProjectConfig();
  }

  /// Generates a default configuration file based on analyzed dependencies.
  static Future<void> createDefault(
    String projectPath,
    Map<String, String> detectedPackages,
  ) async {
    final configFile = File(path.join(projectPath, _configFileName));
    if (await configFile.exists()) return;

    final config = FlutterJsProjectConfig(packageMap: detectedPackages);

    await configFile.writeAsString(
      JsonEncoder.withIndent('  ').convert(config.toJson()),
    );
  }
}
