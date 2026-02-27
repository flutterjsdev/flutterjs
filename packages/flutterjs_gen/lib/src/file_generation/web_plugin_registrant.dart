// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:path/path.dart' as p;

/// Generates the web plugin registrant file that calls registerWith on all web plugins.
/// This mimics Flutter's generated_plugin_registrant.dart behavior for web.
class WebPluginRegistrant {
  final String buildDir;
  final List<String> webPlugins;

  WebPluginRegistrant({
    required this.buildDir,
    required this.webPlugins,
  });

  /// Scans the node_modules directory to find all web plugins with registerWith methods.
  static Future<List<String>> findWebPlugins(String buildDir) async {
    final plugins = <String>[];
    final nodeModulesDir = Directory(p.join(buildDir, 'node_modules'));

    if (!await nodeModulesDir.exists()) {
      return plugins;
    }

    // Scan all packages in node_modules
    await for (final entity in nodeModulesDir.list()) {
      if (entity is Directory) {
        final packageName = p.basename(entity.path);

        // Skip @flutterjs scoped packages and non-plugin packages
        if (packageName.startsWith('@') || packageName.startsWith('.')) {
          continue;
        }

        // Check if this package has a dist file with registerWith
        final distFiles = [
          p.join(entity.path, 'dist', '$packageName.js'),
          p.join(entity.path, 'dist', 'index.js'),
        ];

        for (final distFile in distFiles) {
          final file = File(distFile);
          if (await file.exists()) {
            final content = await file.readAsString();
            // Look for "static registerWith" method
            if (content.contains('static registerWith(')) {
              plugins.add(packageName);
              break;
            }
          }
        }
      }
    }

    return plugins;
  }

  /// Generates the web plugin registrant JavaScript file.
  String generateRegistrantCode() {
    final buffer = StringBuffer();

    buffer.writeln('// Copyright 2025 The FlutterJS Authors. All rights reserved.');
    buffer.writeln('// Use of this source code is governed by a BSD-style license that can be');
    buffer.writeln('// found in the LICENSE file.');
    buffer.writeln();
    buffer.writeln('// ============================================================================');
    buffer.writeln('// AUTO-GENERATED FILE - DO NOT EDIT');
    buffer.writeln('// Flutter Web Plugin Registrant');
    buffer.writeln('// ============================================================================');
    buffer.writeln();

    // Import all web plugins
    for (final plugin in webPlugins) {
      // Find the main export class name (usually plugin name in PascalCase)
      final className = _getPluginClassName(plugin);
      buffer.writeln("import { $className } from '../node_modules/$plugin/dist/$plugin.js';");
    }

    buffer.writeln();
    buffer.writeln('/**');
    buffer.writeln(' * Registers all Flutter web plugins.');
    buffer.writeln(' * This function must be called before the app starts.');
    buffer.writeln(' */');
    buffer.writeln('export function registerPlugins() {');

    if (webPlugins.isEmpty) {
      buffer.writeln('  // No web plugins to register');
    } else {
      buffer.writeln('  // Register each web plugin');
      for (final plugin in webPlugins) {
        final className = _getPluginClassName(plugin);
        buffer.writeln('  $className.registerWith();');
      }
    }

    buffer.writeln('}');
    buffer.writeln();

    return buffer.toString();
  }

  /// Converts plugin package name to class name.
  /// Example: url_launcher_web -> UrlLauncherPlugin
  String _getPluginClassName(String packageName) {
    // Most web plugins follow the pattern: package_name_web -> PackageNamePlugin
    // Example: url_launcher_web -> UrlLauncherPlugin

    if (packageName.endsWith('_web')) {
      // Remove _web suffix
      final baseName = packageName.substring(0, packageName.length - 4);
      // Convert snake_case to PascalCase and add Plugin suffix
      return _snakeToPascal(baseName) + 'Plugin';
    }

    // Fallback: just convert to PascalCase
    return _snakeToPascal(packageName);
  }

  String _snakeToPascal(String snake) {
    return snake
        .split('_')
        .map((part) => part[0].toUpperCase() + part.substring(1))
        .join('');
  }

  /// Writes the registrant file to disk.
  Future<void> writeRegistrantFile() async {
    final outputPath = p.join(buildDir, 'src', 'generated_plugin_registrant.js');
    final file = File(outputPath);
    await file.writeAsString(generateRegistrantCode());
    print('✅ Generated web plugin registrant: $outputPath');
  }
}
