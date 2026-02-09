// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';

void main() async {
  print('🚀 Initializing FlutterJS Workspace...');

  // 1. Dart Pub Get
  print('\n📦 Resolving Dart dependencies...');
  var pubGetProcess = await Process.start(
    'dart',
    ['pub', 'get'],
    mode: ProcessStartMode.inheritStdio,
    runInShell: true,
  );
  var exitCode = await pubGetProcess.exitCode;
  if (exitCode != 0) exit(exitCode);

  // 2. NPM Install and Build (Helper)
  Future<void> npmInstallAndBuild(String path, {bool skipBuild = false}) async {
    print('\n📦 Installing JS dependencies in $path...');
    var npmCmd = Platform.isWindows ? 'npm.cmd' : 'npm';

    // Check if directory exists
    if (!Directory(path).existsSync()) {
      print('⚠️ Directory $path not found, skipping...');
      return;
    }

    // Check if package.json exists
    if (!File('$path/package.json').existsSync()) {
      print('⚠️ No package.json in $path, skipping...');
      return;
    }

    // Install dependencies
    var process = await Process.start(
      npmCmd,
      ['install'],
      workingDirectory: path,
      mode: ProcessStartMode.inheritStdio,
      runInShell: true,
    );
    var code = await process.exitCode;
    if (code != 0) {
      print('❌ Failed to install dependencies in $path');
      exit(code);
    }
    print('✅ Dependencies installed in $path');

    // Skip build if requested
    if (skipBuild) {
      print('⏭️  Skipping build for $path');
      return;
    }

    // Build the package
    print('🔨 Building package in $path...');
    var buildProcess = await Process.start(
      npmCmd,
      ['run', 'build'],
      workingDirectory: path,
      mode: ProcessStartMode.inheritStdio,
      runInShell: true,
    );
    var buildCode = await buildProcess.exitCode;
    if (buildCode != 0) {
      print('⚠️  Build failed for $path (this may be expected)');
      // Don't exit - continue with other packages
      return;
    }
    print('✅ Package built in $path');
  }

  // Install engine but skip build (it's a CLI tool)
  await npmInstallAndBuild('packages/flutterjs_engine', skipBuild: true);

  // Build all library packages that have package.json
  final packagesToBuild = [
    'packages/flutterjs_foundation/flutterjs_foundation',
    'packages/flutterjs_runtime/flutterjs_runtime',
    'packages/flutterjs_material/flutterjs_material',
    'packages/flutterjs_vdom/flutterjs_vdom',
    'packages/flutterjs_seo/flutterjs_seo',
    'packages/flutterjs_analyzer/flutterjs_analyzer',
    'packages/flutterjs_widgets/flutterjs_widgets',
    'packages/flutterjs_rendering/flutterjs_rendering',
    'packages/flutterjs_animation/flutterjs_animation',
    'packages/flutterjs_cupertino/flutterjs_cupertino',
    'packages/flutterjs_gestures/flutterjs_gestures',
    'packages/flutterjs_painting/flutterjs_painting',
    'packages/flutterjs_services/flutterjs_services',
  ];

  for (final pkg in packagesToBuild) {
    await npmInstallAndBuild(pkg);
  }

  print('\n✅ Initialization complete!');
}
