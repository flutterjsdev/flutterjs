// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:args/command_runner.dart';

/// ============================================================================
/// CLEAN COMMAND — Remove Build Artifacts & Caches (FlutterJS)
/// ============================================================================
///
/// The `clean` command deletes all generated artifacts, caches, temporary
/// directories, and platform build folders used by FlutterJS and related tools.
///
/// This behaves similarly to:
///
/// ```bash
/// flutter clean
/// ```
///
/// but extends functionality to include:
///
/// - FlutterJS build output
/// - Analyzer cache
/// - Node.js dependencies
/// - iOS/Android platform build folders
/// - Pub cache repair (Windows/Linux)
///
///
/// # Purpose
///
/// The command is useful when:
/// - build inconsistencies appear
/// - generated JS/CSS/IR files become stale
/// - analyzer crashes due to corrupted cache
/// - switching branches with large project diffs
///
/// It ensures the next `flutterjs build` or `flutterjs run` starts fresh.
///
///
/// # Directories Removed
///
/// | Directory | Purpose |
/// |----------|---------|
/// | `build/` | All FlutterJS output files (HTML/CSS/JS/IR) |
/// | `.dart_tool/` | Analyzer + Dart package metadata |
/// | `.flutterjs-cache/` | FlutterJS incremental cache |
/// | `node_modules/` | Node.js dependencies (if present) |
/// | `ios/Pods/` | CocoaPods dependencies |
/// | `ios/.symlinks/` | iOS symlink metadata |
/// | `android/.gradle/` | Gradle cache |
/// | `android/app/build/` | Android build output |
///
/// Platform-specific cleaning:
///
/// - **macOS:** Removes Xcode `DerivedData`
/// - **Windows/Linux:** Runs `dart pub cache repair`
///
///
/// # Options
///
/// | Flag | Description |
/// |------|-------------|
/// | `--verbose` | Show each directory being cleaned. |
///
///
/// # Example Usage
///
/// ```bash
/// flutterjs clean
/// flutterjs clean --verbose
/// ```
///
///
/// # Behavior
///
/// The command:
///
/// 1. Iterates through all known build/cache folders
/// 2. Deletes directories safely and recursively
/// 3. Prints skipped directories when using `--verbose`
/// 4. Performs platform-specific cleanup
/// 5. Reports the total number of removed directories
///
///
/// # Output Example
///
/// ```
/// 🧹 Cleaning build artifacts and caches...
///
///    Removing: build/
///    Removing: .dart_tool/
///    Skipped: node_modules/ (does not exist)
///
/// ✅ Clean complete! Removed 5 artifact directories.
/// ```
///
///
/// ============================================================================

class CleanCommand extends Command<void> {
  CleanCommand({this.verbose = false}) {
    argParser.addFlag(
      'force',
      abbr: 'f',
      negatable: false,
      help:
          'Forcefully terminate locking processes (node, dart) before cleaning.',
    );
  }

  final bool verbose;

  @override
  String get name => 'clean';

  @override
  final String description =
      'Delete build artifacts and caches (like `flutter clean`).';

  @override
  Future<void> run() async {
    print('🧹 Cleaning build artifacts and caches...\n');

    final bool force = argResults?['force'] as bool? ?? false;

    if (force && Platform.isWindows) {
      await _killLockingProcesses();
    }

    // Directories to clean (common in Flutter/JS/Dart projects)
    final List<String> directories = [
      'build/',
      '.dart_tool/',
      '.flutterjs-cache/',
      'node_modules/',
      'ios/Pods/',
      'ios/.symlinks/',
      'android/.gradle/',
      'android/app/build/',
    ];

    int deletedCount = 0;
    final List<String> failedDirectories = [];

    for (final dirPath in directories) {
      final dir = Directory(dirPath);
      if (await dir.exists()) {
        if (verbose) {
          print('   Removing: $dirPath');
        }
        try {
          await dir.delete(recursive: true);
          deletedCount++;
        } on FileSystemException catch (e) {
          failedDirectories.add(dirPath);
          if (verbose) {
            print('   ⚠️  Failed to delete $dirPath: ${e.message}');
          }
        }
      } else if (verbose) {
        print('   Skipped: $dirPath (does not exist)');
      }
    }

    // Optional: Run platform-specific clean
    if (Platform.isMacOS) {
      await _cleanMacOS();
    } else if (Platform.isWindows || Platform.isLinux) {
      await _cleanPubCache();
    }

    if (failedDirectories.isNotEmpty) {
      print('\n❌ Failed to remove some directories:');
      for (final dir in failedDirectories) {
        print('   - $dir');
      }
      print(
        '\n💡 Tip: This usually happens because a process is still using those files.',
      );
      if (!force) {
        print('   👉 Try running: `flutterjs clean --force`');
      }
      print('   👉 Or use the reset script: `tool/reset.ps1` (Windows Only)');
    }

    print(
      '\n✅ Clean complete! Removed $deletedCount artifact director${deletedCount == 1 ? 'y' : 'ies'}.\n',
    );
  }

  Future<void> _killLockingProcesses() async {
    if (verbose) print('   🔍 Searching for locking processes...');

    // Kill Node.js processes related to FlutterJS
    try {
      if (verbose) print('   🔨 Killing locking node processes...');
      // We use taskkill to be forceful on Windows
      await Process.run('taskkill', [
        '/F',
        '/IM',
        'node.exe',
        '/T', // Kill child processes too
      ]);
    } catch (_) {
      // Ignore if no processes found or other errors
    }

    // Note: We avoid killing 'dart' processes here as it would kill the CLI itself.
    // However, if there are OTHER dart processes (like 'dart run'), they might be the culprit.
    // For now, node is the primary locker for build/flutterjs.
  }

  // Clean macOS/iOS derived data (optional enhancement)
  Future<void> _cleanMacOS() async {
    if (verbose) print('   Cleaning iOS DerivedData...');
    final derivedData =
        '${Platform.environment['HOME']}/Library/Developer/Xcode/DerivedData';
    final dir = Directory(derivedData);
    if (await dir.exists()) {
      await Process.run('rm', ['-rf', derivedData]);
    }
  }

  // Clean pub get cache (optional)
  Future<void> _cleanPubCache() async {
    if (verbose) print('   Running `dart pub cache repair`...');
    await Process.run('dart', ['pub', 'cache', 'repair']);
  }
}
