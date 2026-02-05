// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'dart:convert';

/// Client for interacting with npm CLI and registry
class NpmClient {
  /// Check if npm is available in the system
  Future<bool> isNpmAvailable() async {
    try {
      final result = await Process.run('npm', ['--version']);
      return result.exitCode == 0;
    } catch (e) {
      return false;
    }
  }

  /// Get npm version
  Future<String?> getNpmVersion() async {
    try {
      final result = await Process.run('npm', ['--version']);
      if (result.exitCode == 0) {
        return (result.stdout as String).trim();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Check if user is logged into npm
  Future<bool> isAuthenticated() async {
    try {
      final result = await Process.run('npm', ['whoami']);
      return result.exitCode == 0;
    } catch (e) {
      return false;
    }
  }

  /// Get current npm user
  Future<String?> getCurrentUser() async {
    try {
      final result = await Process.run('npm', ['whoami']);
      if (result.exitCode == 0) {
        return (result.stdout as String).trim();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Run npm install in the specified directory
  Future<bool> install(String directory, {bool verbose = false}) async {
    try {
      print('Running npm install in $directory...');

      final args = ['install'];
      if (!verbose) {
        args.add('--silent');
      }

      final result = await Process.run(
        'npm',
        args,
        workingDirectory: directory,
      );

      if (result.exitCode != 0) {
        print('npm install failed:');
        print(result.stderr);
        return false;
      }

      if (verbose) {
        print(result.stdout);
      }

      return true;
    } catch (e) {
      print('Error running npm install: $e');
      return false;
    }
  }

  /// Run npm publish in the specified directory
  Future<bool> publish(
    String directory, {
    bool dryRun = false,
    bool verbose = false,
    String? tag,
  }) async {
    try {
      final args = ['publish'];

      if (dryRun) {
        args.add('--dry-run');
      }

      // Always publish scoped packages as public by default
      args.addAll(['--access', 'public']);

      if (tag != null) {
        args.addAll(['--tag', tag]);
      }

      print(
        dryRun
            ? 'Running npm publish --dry-run in $directory...'
            : 'Publishing to npm from $directory...',
      );

      final result = await Process.run(
        'npm',
        args,
        workingDirectory: directory,
      );

      if (verbose || dryRun) {
        print(result.stdout);
      }

      if (result.exitCode != 0) {
        print('npm publish failed:');
        print(result.stderr);
        return false;
      }

      return true;
    } catch (e) {
      print('Error running npm publish: $e');
      return false;
    }
  }

  /// Fetch package information from npm registry
  Future<Map<String, dynamic>?> getPackageInfo(String packageName) async {
    try {
      final result = await Process.run('npm', ['view', packageName, '--json']);

      if (result.exitCode != 0) {
        return null;
      }

      final jsonStr = result.stdout as String;
      return jsonDecode(jsonStr) as Map<String, dynamic>;
    } catch (e) {
      print('Error fetching package info for $packageName: $e');
      return null;
    }
  }

  /// Add a package to package.json dependencies
  Future<bool> addDependency(
    String directory,
    String packageName, {
    String? version,
    bool dev = false,
  }) async {
    try {
      final args = ['install', packageName];

      if (version != null) {
        args[1] = '$packageName@$version';
      }

      if (dev) {
        args.add('--save-dev');
      } else {
        args.add('--save');
      }

      final result = await Process.run(
        'npm',
        args,
        workingDirectory: directory,
      );

      return result.exitCode == 0;
    } catch (e) {
      print('Error adding dependency $packageName: $e');
      return false;
    }
  }

  /// Initialize a new npm package (npm init)
  Future<bool> init(String directory, {required String packageName}) async {
    try {
      final result = await Process.run('npm', [
        'init',
        '-y',
      ], workingDirectory: directory);

      if (result.exitCode != 0) {
        return false;
      }

      // Update the generated package.json with the correct name
      final packageJsonFile = File('$directory/package.json');
      if (await packageJsonFile.exists()) {
        final content = await packageJsonFile.readAsString();
        final json = jsonDecode(content) as Map<String, dynamic>;
        json['name'] = packageName;

        const encoder = JsonEncoder.withIndent('  ');
        await packageJsonFile.writeAsString(encoder.convert(json));
      }

      return true;
    } catch (e) {
      print('Error running npm init: $e');
      return false;
    }
  }
}
