// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:convert';
import 'dart:io';

import 'package:args/command_runner.dart';
import 'package:path/path.dart' as p;
// ignore: implementation_imports
import 'package:pubjs/src/publisher.dart';

class PublishCommand extends Command<void> {
  @override
  final String name = 'publish';

  @override
  final String description = 'Publish the current package to the registry.';

  final Publisher _publisher;

  PublishCommand({Publisher? publisher})
    : _publisher = publisher ?? Publisher() {
    argParser.addFlag(
      'dry-run',
      negatable: false,
      help: 'Validate the package but do not actually publish it.',
    );
    argParser.addOption(
      'update-registry',
      help: 'Path to local registry.json to auto-update upon success.',
      valueHelp: 'path/to/registry.json',
    );
    argParser.addOption(
      'tag',
      help: ' The npm tag to publish with (e.g., beta, next).',
    );
  }

  @override
  Future<void> run() async {
    final dryRun = argResults?['dry-run'] as bool;
    final registryPath = argResults?['update-registry'] as String?;
    final tag = argResults?['tag'] as String?;

    final currentDir = Directory.current;
    final pubspecFile = File(p.join(currentDir.path, 'pubspec.yaml'));

    if (!pubspecFile.existsSync()) {
      print('Error: pubspec.yaml not found in current directory.');
      exit(1);
    }

    // 1. Publish to npm
    try {
      await _publisher.publish(
        currentDir.path,
        dryRun: dryRun,
        tag: tag,
        verbose: globalResults?['verbose'] as bool? ?? false,
      );
    } catch (e) {
      print('Publish failed: $e');
      exit(1);
    }

    // 2. Update Registry if requested
    if (registryPath != null && !dryRun) {
      print('Updating registry at: $registryPath');
      await _updateRegistry(registryPath, pubspecFile);
    } else if (registryPath != null && dryRun) {
      print('[Dry Run] Would update registry at: $registryPath');
    }
  }

  Future<void> _updateRegistry(String registryPath, File pubspecFile) async {
    final registryFile = File(registryPath);
    if (!registryFile.existsSync()) {
      print(
        'Warning: Registry file not found at $registryPath. Skipping update.',
      );
      return;
    }

    try {
      // Read Pubspec
      final pubspecContent = pubspecFile.readAsStringSync();
      // Simple parsing to avoid extra dependencies - relying on standard format
      final name = _extractYamlValue(pubspecContent, 'name');
      final version = _extractYamlValue(pubspecContent, 'version');
      final description =
          _extractYamlValue(pubspecContent, 'description') ?? '';

      if (name == null || version == null) {
        print('Error: Could not parse name or version from pubspec.yaml');
        return;
      }

      // Read Registry
      final registryJson = jsonDecode(await registryFile.readAsString());
      final List<dynamic> packages = registryJson['packages'];

      // Find implementation package name (flutterjs_x)
      // Convention: If package is 'flutterjs', name is 'flutterjs'.
      // If package is 'http' (and we are publishing 'flutterjs_http'), we need to know the mapping.
      // BUT, usually we are publishing the flutterjs_ implementation.
      // So if I am in 'flutterjs_http', the package name IS 'flutterjs_http'.

      bool found = false;
      for (var pkg in packages) {
        if (pkg['flutterjs_package'] == name) {
          // Update existing
          pkg['version'] = version;
          pkg['description'] = description;
          pkg['meta'] = {
            ...(pkg['meta'] ?? {}),
            'last_updated': DateTime.now().toIso8601String(),
          };
          found = true;
          print('Updated existing entry for $name to version $version');
          break;
        }
      }

      if (!found) {
        // Add new entry
        // We guess the "original" name. If it starts with flutterjs_, strip it.
        String originalName = name;
        if (name.startsWith('flutterjs_') && name != 'flutterjs') {
          originalName = name.replaceFirst('flutterjs_', '');
        }

        packages.add({
          "name": originalName,
          "flutterjs_package": name,
          "description": description,
          "version": version,
          "metrics": {"downloads": 0, "likes": 0},
          "mapping": {
            "original_package": originalName,
            "replacement_package": name,
          },
          "last_updated": DateTime.now().toIso8601String(),
        });
        print('Added new entry for $name');
      }

      // Write back
      const encoder = JsonEncoder.withIndent('  ');
      await registryFile.writeAsString(encoder.convert(registryJson));
      print('Registry updated successfully!');
      print(
        'REMINDER: Don\'t forget to git commit and push the registry changes!',
      );
    } catch (e) {
      print('Failed to update registry: $e');
    }
  }

  String? _extractYamlValue(String content, String key) {
    // Simple regex for top-level keys
    final regex = RegExp('^$key:\\s+(.+)\$', multiLine: true);
    final match = regex.firstMatch(content);
    return match?.group(1)?.trim().replaceAll('"', '').replaceAll("'", "");
  }
}
