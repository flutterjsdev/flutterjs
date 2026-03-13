// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:flutterjs_core/src/kernel/kernel_compiler.dart';
import 'package:flutterjs_core/src/kernel/runtime_extractor.dart';

/// Extract the Dart runtime from dart2js compilation
///
/// This script:
/// 1. Creates a minimal Dart program that uses dart:core, dart:async, etc.
/// 2. Compiles it with dart2js (same flags as Flutter uses)
/// 3. Extracts the runtime portion
/// 4. Generates @flutterjs/runtime module
Future<void> main(List<String> args) async {
  print('═══════════════════════════════════════════════════════');
  print('FlutterJS Runtime Extraction Tool');
  print('═══════════════════════════════════════════════════════');
  print('');

  // Step 1: Create minimal Dart program
  print('Step 1: Creating minimal Dart program...');
  final tempDir = Directory.systemTemp.createTempSync('flutterjs_runtime_');
  final entryFile = File(p.join(tempDir.path, 'runtime.dart'));

  // This program exercises all the dart:* APIs we want in the runtime
  await entryFile.writeAsString('''
// Minimal program to extract complete dart:core, dart:async, dart:convert runtime
import 'dart:async';
import 'dart:convert';
import 'dart:collection';
import 'dart:typed_data';
import 'dart:math';

void main() {
  // dart:core types
  final str = 'hello';
  final num = 42;
  final list = <int>[1, 2, 3];
  final map = <String, dynamic>{'key': 'value'};
  final set = <String>{'a', 'b'};

  // dart:async types
  final future = Future.value(42);
  final stream = Stream.value(1);
  final completer = Completer<int>();

  // dart:convert
  final json = jsonEncode({'test': true});
  final decoded = jsonDecode(json);

  // dart:collection
  final queue = Queue<int>();
  final hashMap = HashMap<String, int>();

  // dart:typed_data
  final uint8List = Uint8List(10);
  final buffer = ByteData(8);

  // dart:math
  final random = Random();
  final pi = 3.14159;

  print('Runtime extracted');
}
''');

  print('  ✓ Created: ${entryFile.path}');
  print('');

  // Step 2: Compile with dart2js
  print('Step 2: Compiling with dart2js (using Flutter\'s flags)...');
  final compiler = KernelCompiler();
  final outputPath = p.join(tempDir.path, 'runtime.js');

  final result = await compiler.compileToDart2JS(
    entryPoint: entryFile.path,
    outputPath: outputPath,
    csp: true, // No eval() - browser safe
    optimizationLevel: 0, // No optimization for readable output
    minify: false, // No minification - need readable names
    sourceMaps: false, // No source maps needed
  );

  if (!result.success) {
    print('✗ Compilation failed!');
    print(result.stderr);
    exit(1);
  }

  print('');
  print('Compilation stats:');
  print('  Lines: ${result.lineCount}');
  print('  Size: ${(result.outputSize! / 1024).toStringAsFixed(1)} KB');
  print('  Time: ${result.duration.inMilliseconds}ms');
  print('');

  // Step 3: Extract runtime
  print('Step 3: Extracting runtime from compiled output...');
  final extractor = RuntimeExtractor();
  final runtime = await extractor.extractRuntime(outputPath);

  print('  Runtime components:');
  print('    Setup: ${(runtime.setupCode.length / 1024).toStringAsFixed(1)} KB');
  print('    Helpers: ${(runtime.helperFunctions.length / 1024).toStringAsFixed(1)} KB');
  print('    Type system: ${(runtime.typeSystem.length / 1024).toStringAsFixed(1)} KB');
  print('  Total runtime: ${(runtime.runtimeSize / 1024).toStringAsFixed(1)} KB (${runtime.runtimePercentage.toStringAsFixed(1)}% of output)');
  print('');

  // Step 4: Generate runtime module
  print('Step 4: Generating @flutterjs/runtime module...');
  final runtimeOutputPath = p.join(
    Directory.current.path,
    'packages',
    'flutterjs_dart',
    'dist',
    'runtime_extracted.js',
  );

  await extractor.generateRuntimeModule(
    runtime: runtime,
    outputPath: runtimeOutputPath,
  );

  print('  ✓ Generated: $runtimeOutputPath');
  print('');

  // Step 5: Also save the full compiled output for reference
  final referenceOutputPath = p.join(
    Directory.current.path,
    'packages',
    'flutterjs_dart',
    'dist',
    'runtime_full_reference.js',
  );
  await File(outputPath).copy(referenceOutputPath);
  print('  ✓ Reference saved: $referenceOutputPath');
  print('');

  // Cleanup
  await tempDir.delete(recursive: true);

  print('═══════════════════════════════════════════════════════');
  print('✓ Runtime extraction complete!');
  print('═══════════════════════════════════════════════════════');
  print('');
  print('Next steps:');
  print('1. Review: packages/flutterjs_dart/dist/runtime_extracted.js');
  print('2. Parse and extract actual dart:core classes');
  print('3. Generate TypeScript definitions');
  print('4. Publish as @flutterjs/runtime npm package');
}
