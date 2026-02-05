import 'dart:io';
import 'package:path/path.dart' as p;

const licenseHeader =
    '''// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

''';

void main() async {
  final rootDir = Directory('c:/Jay/_Plugin/flutterjs');
  final excludeDirs = {
    '.dart_tool',
    'build',
    '.git',
    '.idea',
    '.vscode',
    'node_modules',
  };

  await for (final entity in rootDir.list(
    recursive: true,
    followLinks: false,
  )) {
    if (entity is File) {
      final path = entity.path;
      final ext = p.extension(path);

      if (ext != '.dart' && ext != '.js') continue;

      final parts = p.split(path);
      if (parts.any((part) => excludeDirs.contains(part))) continue;

      final content = await entity.readAsString();
      if (!content.contains('Copyright 2025 The FlutterJS Authors')) {
        print('Updating $path');
        await entity.writeAsString(licenseHeader + content);
      }
    }
  }
  print('Done!');
}
