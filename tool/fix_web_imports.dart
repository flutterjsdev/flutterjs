#!/usr/bin/env dart
// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';

/// Automatically fixes conditional imports for web-only builds.
///
/// Replaces:
///   import '_foo_io.dart' if (dart.library.js_interop) '_foo_web.dart' as foo;
///
/// With:
///   import '_foo_web.dart' as foo;
///
/// This removes the need for _io.dart files in web-only packages.
void main(List<String> args) {
  if (args.isEmpty) {
    print('Usage: dart fix_web_imports.dart <directory>');
    print('Example: dart fix_web_imports.dart packages/flutterjs_foundation/lib');
    exit(1);
  }

  final dirPath = args[0];
  final dir = Directory(dirPath);

  if (!dir.existsSync()) {
    print('❌ Directory not found: $dirPath');
    exit(1);
  }

  print('🔍 Scanning for conditional imports in: $dirPath\n');

  final conditionalImportPattern = RegExp(
    r"import\s+'([^']+_io\.dart)'\s+if\s+\([^)]+\)\s+'([^']+_web\.dart)'\s+as\s+(\w+);",
  );

  var filesFixed = 0;
  var importsFixed = 0;

  for (final file in dir.listSync(recursive: true)) {
    if (file is File && file.path.endsWith('.dart')) {
      final content = file.readAsStringSync();
      final matches = conditionalImportPattern.allMatches(content);

      if (matches.isEmpty) continue;

      var newContent = content;
      var fileHadChanges = false;

      for (final match in matches) {
        final ioFile = match.group(1)!;
        final webFile = match.group(2)!;
        final alias = match.group(3)!;

        final originalImport = match.group(0)!;
        final simplifiedImport = "// Web-only build: directly import web implementation\nimport '$webFile' as $alias;";

        newContent = newContent.replaceFirst(originalImport, simplifiedImport);

        print('   ✅ ${file.path.split(Platform.pathSeparator).last}');
        print('      - Removed: $ioFile');
        print('      + Using:   $webFile\n');

        fileHadChanges = true;
        importsFixed++;
      }

      if (fileHadChanges) {
        file.writeAsStringSync(newContent);
        filesFixed++;
      }
    }
  }

  print('━' * 50);
  print('✅ Fixed $importsFixed conditional imports in $filesFixed files');
}
