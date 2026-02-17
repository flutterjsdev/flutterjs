#!/usr/bin/env dart
// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:flutterjs_builder/src/package_compiler.dart';

/// Build a FlutterJS SDK package (compile lib/ → src/)
///
/// Usage:
///   dart tool/build_package.dart packages/flutterjs_foundation
///   dart tool/build_package.dart packages/flutterjs_services
Future<void> main(List<String> args) async {
  if (args.isEmpty) {
    print('Usage: dart tool/build_package.dart <package-path>');
    print('');
    print('Examples:');
    print('  dart tool/build_package.dart packages/flutterjs_foundation');
    print('  dart tool/build_package.dart packages/flutterjs_services');
    exit(1);
  }

  final packagePath = p.normalize(p.absolute(args[0]));
  final packageDir = Directory(packagePath);

  if (!await packageDir.exists()) {
    print('❌ Package directory not found: $packagePath');
    exit(1);
  }

  final libDir = Directory(p.join(packagePath, 'lib'));
  if (!await libDir.exists()) {
    print('❌ No lib/ directory found in: $packagePath');
    print('   This command is for packages with Dart source code.');
    exit(1);
  }

  print('🔨 Building SDK package: ${p.basename(packagePath)}\n');

  // Get package name from pubspec.yaml
  var packageName = p.basename(packagePath);
  final pubspecFile = File(p.join(packagePath, 'pubspec.yaml'));
  if (await pubspecFile.exists()) {
    final pubspecContent = await pubspecFile.readAsString();
    final nameMatch = RegExp(
      r'^name:\s+(.+)$',
      multiLine: true,
    ).firstMatch(pubspecContent);
    if (nameMatch != null) {
      packageName = nameMatch.group(1)!.trim();
    }
  }

  print('📦 Package name: $packageName');
  print('📁 Source directory: lib/');
  print('📤 Output directory: $packageName/src/\n');

  final compiler = PackageCompiler(
    packagePath: packagePath,
    outputDir: 'dist', // Will be overridden by outputToSrc
    verbose: true,
    outputToSrc: true, // ✅ Enable package mode
  );

  try {
    await compiler.compile();
    print('\n✅ Package build successful!');
    print('   Generated files: ${p.join(packagePath, packageName, 'src')}/');
    print('   Exports manifest: ${p.join(packagePath, packageName, 'exports.json')}');
  } catch (e, st) {
    print('\n❌ Package build failed: $e');
    print(st);
    exit(1);
  }
}
