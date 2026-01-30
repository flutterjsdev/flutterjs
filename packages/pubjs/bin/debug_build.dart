
import 'dart:io';
// NOTE: We need to point to the file relatively or via package config.
// Since we are running from root with 'dart run', usage of 'package:pubjs' 
// depends on if pubjs is in the root pubspec. It is NOT.
// So we must use relative path import for the script if we run it with `dart run debug_build.dart`?
// No, `dart run` won't resolve relative imports well if it crosses package boundaries without package config.

// Strategy: Create this file INSIDE packages/pubjs/bin/debug_build.dart 
// so it has access to pubjs code naturally.

import 'package:pubjs/src/package_builder.dart';
import 'package:path/path.dart' as p;

void main() async {
  print('🛑 DEBUG: Starting manual build of google_fonts...');
  
  // Hardcoded paths for debugging
  final projectRoot = 'c:\\Jay\\_Plugin\\flutterjs\\examples\\flutterjs_website';
  final buildPath = p.join(projectRoot, 'build', 'flutterjs');
  final pkgPath = p.join(buildPath, 'node_modules', 'google_fonts');
  
  if (!Directory(pkgPath).existsSync()) {
    print('❌ Error: Package path does not exist: $pkgPath');
    return;
  }
  
  print('📍 Pkg Path: $pkgPath');
  
  final builder = PackageBuilder();
  
  try {
    final result = await builder.buildPackage(
      packageName: 'google_fonts',
      projectRoot: projectRoot,
      buildPath: buildPath, // Not used for explicit path but required
      explicitSourcePath: pkgPath,
      force: true,
      verbose: true,
    );
    print('✅ Build Result: $result');
  } catch (e, st) {
    print('❌ CRITICAL FAILURE: $e');
    print(st);
  }
}
