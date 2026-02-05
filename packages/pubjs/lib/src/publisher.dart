// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'dart:convert';
import 'package:path/path.dart' as p;
import 'npm_client.dart';

class Publisher {
  final NpmClient _npmClient;
  final String scope;

  Publisher({NpmClient? npmClient, this.scope = '@flutterjs'})
    : _npmClient = npmClient ?? NpmClient();

  /// Publishes the package at [packageRoot] to npm registry.
  ///
  /// [dryRun] - If true, performs a dry run without actually publishing
  /// [tag] - Optional npm dist-tag (e.g., 'beta', 'next')
  Future<void> publish(
    String packageRoot, {
    bool dryRun = false,
    String? tag,
    bool verbose = false,
  }) async {
    final pubspecFile = File(p.join(packageRoot, 'pubspec.yaml'));
    if (!await pubspecFile.exists()) {
      throw Exception('pubspec.yaml not found in $packageRoot');
    }

    // Check npm availability and authentication
    final hasNpm = await _npmClient.isNpmAvailable();
    if (!hasNpm) {
      throw Exception('npm is not installed or not available in PATH');
    }

    if (!dryRun) {
      final isAuthenticated = await _npmClient.isAuthenticated();
      if (!isAuthenticated) {
        throw Exception('Not logged into npm. Please run "npm login" first.');
      }

      final user = await _npmClient.getCurrentUser();
      print('Publishing as npm user: $user');
    }

    // Parse pubspec.yaml
    final content = await pubspecFile.readAsString();
    final name = _extractValue(content, 'name');
    final version = _extractValue(content, 'version');
    final description = _extractValue(content, 'description') ?? '';

    if (name == null || version == null) {
      throw Exception('Could not parse name or version from pubspec.yaml');
    }

    print('Preparing to publish $name $version...');

    // Create temp directory for npm package
    final tempDir = await Directory.systemTemp.createTemp('pubjs_publish_');
    try {
      // Generate npm package.json
      final npmPackageName = _toNpmPackageName(name);
      final packageJson = {
        'name': npmPackageName,
        'version': version,
        'description': description,
        'type': 'module',
        'main': 'index.js',
        'keywords': ['flutterjs', name],
        'license': 'MIT',
        'repository': {
          'type': 'git',
          'url': 'https://github.com/flutterjsdev/flutterjs.git',
        },
      };

      // Write package.json
      final packageJsonFile = File(p.join(tempDir.path, 'package.json'));
      const encoder = JsonEncoder.withIndent('  ');
      await packageJsonFile.writeAsString(encoder.convert(packageJson));

      // Copy package files (JavaScript files only)
      print('Copying package files...');
      await _copyPackageFiles(Directory(packageRoot), tempDir);

      // Verify files were copied
      final files = await tempDir.list().toList();
      if (files.length <= 1) {
        // Only package.json
        throw Exception(
          'No JavaScript files found to publish. Make sure your package contains .js files.',
        );
      }

      // Publish to npm
      print(dryRun ? 'Running dry-run...' : 'Publishing to npm...');
      final success = await _npmClient.publish(
        tempDir.path,
        dryRun: dryRun,
        verbose: verbose,
        tag: tag,
      );

      if (!success) {
        throw Exception('npm publish failed');
      }

      if (dryRun) {
        print('Dry-run completed successfully!');
        print('Package would be published as: $npmPackageName@$version');
      } else {
        print('Successfully published $npmPackageName@$version!');
        print('View at: https://www.npmjs.com/package/$npmPackageName');
      }
    } finally {
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    }
  }

  String? _extractValue(String content, String key) {
    final regex = RegExp('^$key:\\s+(.+)\$', multiLine: true);
    final match = regex.firstMatch(content);
    return match?.group(1)?.trim();
  }

  String _toNpmPackageName(String packageName) {
    // If already scoped, return as-is
    if (packageName.startsWith('@')) {
      return packageName;
    }
    // Convert to scoped package
    return '$scope/$packageName';
  }

  Future<void> _copyPackageFiles(Directory source, Directory dest) async {
    // Only copy JavaScript files and related assets
    final allowedExtensions = ['.js', '.mjs', '.cjs', '.json', '.md'];
    final ignore = [
      '.git',
      '.dart_tool',
      'build',
      'pubspec.yaml',
      'pubspec.lock',
      'analysis_options.yaml',
      '.packages',
      'node_modules',
    ];

    await for (final entity in source.list(recursive: true)) {
      if (entity is File) {
        final relative = p.relative(entity.path, from: source.path);

        // Check ignore list
        if (ignore.any(
          (i) =>
              relative.startsWith(i) ||
              relative.contains('/$i/') ||
              relative == i,
        )) {
          continue;
        }

        // Check file extension
        final ext = p.extension(entity.path).toLowerCase();
        if (!allowedExtensions.contains(ext)) {
          continue;
        }

        final destFile = File(p.join(dest.path, relative));
        await destFile.parent.create(recursive: true);
        await entity.copy(destFile.path);
      }
    }
  }
}
