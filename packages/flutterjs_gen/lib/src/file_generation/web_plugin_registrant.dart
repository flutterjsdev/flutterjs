// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:path/path.dart' as p;

/// Generates the web plugin registrant file (generated_plugin_registrant.js)
/// that imports all detected Flutter web plugins and registers them with the
/// FlutterJS PluginRegistry before the app starts.
///
/// This mirrors Flutter's generated_plugin_registrant.dart pattern for web.
class WebPluginRegistrant {
  final String buildDir;
  final List<String> webPlugins;

  WebPluginRegistrant({
    required this.buildDir,
    required this.webPlugins,
  });

  /// Scans node_modules to find all web plugins that have a registerWith method.
  ///
  /// A package is treated as a web plugin if any of its JS files exports a
  /// class with a static `registerWith(` method. We check the following
  /// locations in order:
  ///   1. `{package}.js` (root-level, e.g. url_launcher_web.js)
  ///   2. `index.js` (root-level)
  ///   3. `dist/{package}.js`
  ///   4. `dist/index.js`
  static Future<List<String>> findWebPlugins(String buildDir) async {
    final plugins = <String>[];
    final nodeModulesDir = Directory(p.join(buildDir, 'node_modules'));

    if (!await nodeModulesDir.exists()) {
      return plugins;
    }

    await for (final entity in nodeModulesDir.list()) {
      if (entity is! Directory) continue;

      final packageName = p.basename(entity.path);

      // Skip scoped packages (@flutterjs, @babel, etc.) and hidden dirs
      if (packageName.startsWith('@') || packageName.startsWith('.')) {
        continue;
      }

      // Check these locations in priority order
      final candidateFiles = [
        // Root-level file named after the package (most common for web plugins)
        p.join(entity.path, '$packageName.js'),
        // Root-level index.js
        p.join(entity.path, 'index.js'),
        // dist/ subdirectory variants
        p.join(entity.path, 'dist', '$packageName.js'),
        p.join(entity.path, 'dist', 'index.js'),
      ];

      for (final candidatePath in candidateFiles) {
        final file = File(candidatePath);
        if (await file.exists()) {
          final content = await file.readAsString();
          if (content.contains('static registerWith(')) {
            plugins.add(packageName);
            break; // Found it — no need to check other paths for this package
          }
        }
      }
    }

    return plugins;
  }

  /// Determines the import path for a plugin's JS file relative to dist/.
  ///
  /// Returns the bare package specifier (importmap resolves the actual path).
  /// Example: 'url_launcher_web' → import from 'url_launcher_web'
  String _getImportSpecifier(String packageName) {
    // Use bare specifier — importmap in index.html maps it to the right file
    return packageName;
  }

  /// Determines the main class name exported by the plugin.
  ///
  /// Follows the Flutter web plugin naming convention:
  ///   url_launcher_web → UrlLauncherPlugin
  ///   firebase_core_web → FirebaseCorePlugin
  String _getPluginClassName(String packageName) {
    if (packageName.endsWith('_web')) {
      // Remove _web suffix, convert to PascalCase, add Plugin suffix
      final baseName = packageName.substring(0, packageName.length - 4);
      return _snakeToPascal(baseName) + 'Plugin';
    }
    // Fallback: convert full package name to PascalCase
    return _snakeToPascal(packageName);
  }

  String _snakeToPascal(String snake) {
    return snake
        .split('_')
        .map((part) => part.isNotEmpty
            ? part[0].toUpperCase() + part.substring(1)
            : '')
        .join('');
  }

  /// Generates the complete generated_plugin_registrant.js file content.
  String generateRegistrantCode() {
    final buffer = StringBuffer();

    buffer.writeln('// Copyright 2025 The FlutterJS Authors. All rights reserved.');
    buffer.writeln('// Use of this source code is governed by a BSD-style license that can be');
    buffer.writeln('// found in the LICENSE file.');
    buffer.writeln();
    buffer.writeln('// ============================================================================');
    buffer.writeln('// AUTO-GENERATED FILE — DO NOT EDIT');
    buffer.writeln('// Flutter Web Plugin Registrant');
    buffer.writeln('//');
    buffer.writeln('// Registers all Flutter web plugins with the plugin registry before the');
    buffer.writeln('// app starts. Mirrors Flutter\'s generated_plugin_registrant.dart for web.');
    buffer.writeln('// ============================================================================');
    buffer.writeln();

    if (webPlugins.isEmpty) {
      buffer.writeln('import { getPluginRegistry } from \'flutter_web_plugins\';');
      buffer.writeln();
      buffer.writeln('/**');
      buffer.writeln(' * Registers all Flutter web plugins.');
      buffer.writeln(' * MUST be called before main() runs.');
      buffer.writeln(' * @param {import(\'flutter_web_plugins\').PluginRegistry} [registry]');
      buffer.writeln(' */');
      buffer.writeln('export function registerPlugins(registry) {');
      buffer.writeln('  // No web plugins detected');
      buffer.writeln('}');
    } else {
      // Import each plugin's class
      for (final plugin in webPlugins) {
        final className = _getPluginClassName(plugin);
        final specifier = _getImportSpecifier(plugin);
        buffer.writeln("import { $className } from '$specifier';");
      }
      buffer.writeln("import { getPluginRegistry } from 'flutter_web_plugins';");
      buffer.writeln();
      buffer.writeln('/**');
      buffer.writeln(' * Registers all Flutter web plugins.');
      buffer.writeln(' * MUST be called before main() runs.');
      buffer.writeln(' * @param {import(\'flutter_web_plugins\').PluginRegistry} [registry]');
      buffer.writeln(' */');
      buffer.writeln('export function registerPlugins(registry) {');
      buffer.writeln('  const reg = registry || getPluginRegistry();');

      for (final plugin in webPlugins) {
        final className = _getPluginClassName(plugin);
        // Pass registrarFor(pluginName) so each plugin gets its own Registrar
        buffer.writeln("  reg.registerPlugin($className, '$plugin');");
      }

      buffer.writeln('}');
    }

    buffer.writeln();
    return buffer.toString();
  }

  /// Generates the app.js bootstrap update snippet.
  ///
  /// Returns the lines to add to app.js to:
  ///   1. Import registerPlugins from generated_plugin_registrant.js
  ///   2. Call registerPlugins() before main()
  ///
  /// This is used by the build pipeline to patch app.js automatically.
  static String generateAppJsRegistrantCall() {
    return "import { registerPlugins } from './generated_plugin_registrant.js';";
  }

  static String generateAppJsBootstrapCall() {
    return "  // Register Flutter web plugins BEFORE main() runs.\n"
        "  registerPlugins();\n";
  }

  /// Writes the registrant file to the dist/ directory.
  Future<void> writeRegistrantFile() async {
    final outputPath = p.join(buildDir, 'dist', 'generated_plugin_registrant.js');
    final file = File(outputPath);
    await file.writeAsString(generateRegistrantCode());
    print('✅ Generated web plugin registrant: $outputPath');
  }

  /// Updates app.js to import and call registerPlugins() before main().
  ///
  /// Idempotent — if the import/call already exists, it is not added again.
  Future<void> patchAppJs() async {
    final appJsPath = p.join(buildDir, 'dist', 'app.js');
    final file = File(appJsPath);
    if (!await file.exists()) {
      print('⚠️  app.js not found at $appJsPath — skipping patch');
      return;
    }

    var content = await file.readAsString();
    bool modified = false;

    // Add import if not already present
    const importLine = "import { registerPlugins } from './generated_plugin_registrant.js';";
    if (!content.contains(importLine)) {
      // Insert after the first import line
      final firstImportEnd = content.indexOf('\n', content.indexOf('import '));
      if (firstImportEnd != -1) {
        content = content.substring(0, firstImportEnd + 1) +
            '$importLine\n' +
            content.substring(firstImportEnd + 1);
        modified = true;
      }
    }

    // Add registerPlugins() call before main() if not already present
    const registrantCall = 'registerPlugins();';
    if (!content.contains(registrantCall)) {
      // Insert before the line that calls main()
      final mainCallIdx = content.indexOf('main()');
      if (mainCallIdx != -1) {
        // Find the start of that line
        final lineStart = content.lastIndexOf('\n', mainCallIdx) + 1;
        // Get the indentation of the main() call line
        final indent = content
            .substring(lineStart, mainCallIdx)
            .replaceAll(RegExp(r'[^\s].*'), '');
        content = content.substring(0, lineStart) +
            '${indent}// Register Flutter web plugins before main() runs.\n' +
            '${indent}registerPlugins();\n\n' +
            content.substring(lineStart);
        modified = true;
      }
    }

    if (modified) {
      await file.writeAsString(content);
      print('✅ Patched app.js with registerPlugins() call');
    } else {
      print('ℹ️  app.js already has registerPlugins() — no patch needed');
    }
  }
}
