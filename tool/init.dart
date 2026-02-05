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

  // 2. NPM Install (Helper)
  Future<void> npmInstall(String path) async {
    print('\n📦 Installing JS dependencies in $path...');
    var npmCmd = Platform.isWindows ? 'npm.cmd' : 'npm';

    // Check if directory exists
    if (!Directory(path).existsSync()) {
      print('⚠️ Directory $path not found, skipping...');
      return;
    }

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
  }

  await npmInstall('packages/flutterjs_engine');
  await npmInstall('packages/flutterjs_vscode_extension');
  await npmInstall('examples/counter');

  print('\n✅ Initialization complete!');
}
