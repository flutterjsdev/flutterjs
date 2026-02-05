// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// import 'dart:io';

// Future<void> updateGitignore(bool verbose) async {
//   print('🔒 Updating .gitignore...');

//   final gitignoreFile = File('.gitignore');

//   if (!await gitignoreFile.exists()) {
//     await gitignoreFile.writeAsString('');
//   }

//   String content = await gitignoreFile.readAsString();

//   if (content.contains('build/flutterjs')) {
//     if (verbose) print('   FlutterJS entries already in .gitignore');
//     print('✅ .gitignore up to date\n');
//     return;
//   }

//   final additions = '''

// # FlutterJS
// build/flutterjs-cache/
// build/flutterjs/
// web/index.html.flutter
// web/firebase-config.json
// ''';

//   await gitignoreFile.writeAsString(content + additions);
//   print('✅ .gitignore updated\n');
// }
