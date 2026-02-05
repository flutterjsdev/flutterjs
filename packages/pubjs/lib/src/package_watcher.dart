// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'dart:async';

/// Watches package source files and triggers rebuilds on changes
///
/// 🎁 WATCH MODE - Development workflow enhancement
class PackageWatcher {
  final String projectRoot;
  final List<String> packagesToWatch;
  final Function(String packageName) onPackageChanged;
  final bool verbose;

  StreamSubscription? _subscription;
  final Map<String, DateTime> _lastChangeTime = {};
  final _debounceMs = 500; // Debounce time in milliseconds

  PackageWatcher({
    required this.projectRoot,
    required this.packagesToWatch,
    required this.onPackageChanged,
    this.verbose = false,
  });

  /// Start watching for changes
  Future<void> start() async {
    if (verbose) {
      print('\n👀 Starting watch mode...');
      print('   Watching ${packagesToWatch.length} packages');
    }

    // Watch all package source directories
    for (final packageName in packagesToWatch) {
      final packagePath = _getPackagePath(packageName);
      if (packagePath == null) continue;

      final srcDir = Directory('$packagePath/src');
      if (!await srcDir.exists()) continue;

      // Watch for changes
      final watcher = srcDir.watch(recursive: true);

      watcher.listen((event) {
        _handleFileChange(packageName, event.path);
      });

      if (verbose) {
        print('   👁  Watching $packageName');
      }
    }
  }

  /// Handle file change with debouncing
  void _handleFileChange(String packageName, String filePath) {
    // Only watch .js files
    if (!filePath.endsWith('.js')) return;

    final now = DateTime.now();
    final lastChange = _lastChangeTime[packageName];

    // Debounce: Ignore if changed too recently
    if (lastChange != null) {
      final diff = now.difference(lastChange).inMilliseconds;
      if (diff < _debounceMs) return;
    }

    _lastChangeTime[packageName] = now;

    if (verbose) {
      print('\n📝 Change detected: $packageName');
      print('   File: ${filePath.split('/').last}');
    }

    // Trigger rebuild callback
    onPackageChanged(packageName);
  }

  /// Get package source path
  String? _getPackagePath(String packageName) {
    final simpleName = packageName.replaceAll('@flutterjs/', '');
    final path =
        '$projectRoot/packages/flutterjs_$simpleName/flutterjs_$simpleName';

    if (Directory(path).existsSync()) {
      return path;
    }

    return null;
  }

  /// Stop watching
  Future<void> stop() async {
    await _subscription?.cancel();
    if (verbose) {
      print('\n👋 Stopped watch mode');
    }
  }
}

/// Build statistics tracker
///
/// 🎁 BUILD STATISTICS - Performance metrics
class BuildStatistics {
  DateTime? startTime;
  DateTime? endTime;

  int builtCount = 0;
  int skippedCount = 0;
  int failedCount = 0;

  final Map<String, int> packageBuildTimes = {};

  /// Record individual package build time
  void recordPackageBuild(String packageName, int milliseconds) {
    packageBuildTimes[packageName] = milliseconds;
  }

  /// Get total duration
  String getDuration() {
    if (startTime == null || endTime == null) return '0ms';

    final duration = endTime!.difference(startTime!);

    if (duration.inSeconds > 0) {
      return '${duration.inSeconds}.${(duration.inMilliseconds % 1000).toString().padLeft(3, '0')}s';
    }

    return '${duration.inMilliseconds}ms';
  }

  /// Get average build time
  double getAverageMs() {
    if (packageBuildTimes.isEmpty) return 0;

    final total = packageBuildTimes.values.reduce((a, b) => a + b);
    return total / packageBuildTimes.length;
  }

  /// Get slowest package
  MapEntry<String, int>? getSlowestPackage() {
    if (packageBuildTimes.isEmpty) return null;

    return packageBuildTimes.entries.reduce(
      (a, b) => a.value > b.value ? a : b,
    );
  }

  /// Print detailed report
  void printReport() {
    print('\n┌─────────────────────────────────────────┐');
    print('│     📊 Build Statistics Report       │');
    print('├─────────────────────────────────────────┤');
    print('│ Total Duration: ${getDuration().padRight(23)} │');
    print('│ Built: ${builtCount.toString().padRight(31)} │');
    print('│ Skipped: ${skippedCount.toString().padRight(29)} │');
    if (failedCount > 0) {
      print('│ Failed: ${failedCount.toString().padRight(30)} │');
    }

    if (packageBuildTimes.isNotEmpty) {
      print('│                                         │');
      print(
        '│ Average Build Time: ${getAverageMs().toStringAsFixed(0)}ms${' ' * (15 - getAverageMs().toStringAsFixed(0).length)} │',
      );

      final slowest = getSlowestPackage();
      if (slowest != null) {
        final name = slowest.key.replaceAll('@flutterjs/', '');
        print(
          '│ Slowest: $name (${slowest.value}ms)${' ' * (21 - name.length - slowest.value.toString().length)} │',
        );
      }
    }

    print('└─────────────────────────────────────────┘\n');
  }
}
