// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:flutterjs_core/src/kernel/kernel_compiler.dart';

/// Test kernel compilation with a simple Dart program
///
/// This verifies that:
/// 1. KernelCompiler can find Dart SDK
/// 2. Can compile Dart → Kernel (.dill)
/// 3. Output file is created
/// 4. Compilation succeeds
Future<void> main(List<String> args) async {
  print('═══════════════════════════════════════════════════════');
  print('Kernel Compilation Test');
  print('═══════════════════════════════════════════════════════');
  print('');

  // Step 1: Create test program
  print('Step 1: Creating test Dart program...');
  final tempDir = Directory.systemTemp.createTempSync('flutterjs_kernel_test_');
  final testFile = File(p.join(tempDir.path, 'test.dart'));

  await testFile.writeAsString('''
// Simple test program
void main() {
  print('Hello from kernel compilation!');

  final numbers = [1, 2, 3, 4, 5];
  final doubled = numbers.map((n) => n * 2).toList();
  print('Doubled: \$doubled');
}

class Person {
  final String name;
  final int age;

  Person(this.name, this.age);

  String greet() => 'Hello, I am \$name and I am \$age years old';
}
''');

  print('  ✓ Created: ${testFile.path}');
  print('');

  // Step 2: Compile to kernel
  print('Step 2: Compiling to kernel...');
  final compiler = KernelCompiler();
  final outputPath = p.join(tempDir.path, 'test.dill');

  final result = await compiler.compileToKernel(
    entryPoint: testFile.path,
    outputPath: outputPath,
  );

  if (!result.success) {
    print('✗ Compilation failed!');
    print(result.stderr);
    exit(1);
  }

  print('  ✓ Compiled successfully');
  print('  ✓ Kernel size: ${(result.kernelSize! / 1024).toStringAsFixed(1)} KB');
  print('  ✓ Duration: ${result.duration.inMilliseconds}ms');
  print('');

  // Step 3: Verify output
  print('Step 3: Verifying kernel output...');
  final kernelFile = File(outputPath);
  if (!kernelFile.existsSync()) {
    print('✗ Kernel file not found: $outputPath');
    exit(1);
  }

  final kernelSize = kernelFile.lengthSync();
  print('  ✓ Kernel file exists: $outputPath');
  print('  ✓ File size: ${(kernelSize / 1024).toStringAsFixed(1)} KB');
  print('');

  // Step 4: Read kernel header (first 4 bytes should be magic number)
  final bytes = kernelFile.readAsBytesSync();
  print('Step 4: Analyzing kernel format...');
  print('  First 10 bytes: ${bytes.take(10).toList()}');

  // Kernel files start with magic number 0x90ABCDEF
  if (bytes.length >= 4) {
    final magic = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    print('  Magic number: 0x${magic.toRadixString(16).toUpperCase()}');

    if (magic == 0x90ABCDEF) {
      print('  ✓ Valid kernel file format');
    } else {
      print('  ⚠ Unexpected magic number (expected 0x90ABCDEF)');
    }
  }
  print('');

  // Cleanup
  await tempDir.delete(recursive: true);

  print('═══════════════════════════════════════════════════════');
  print('✓ Kernel compilation test passed!');
  print('═══════════════════════════════════════════════════════');
  print('');
  print('Next steps:');
  print('1. Add kernel package dependency to pubspec.yaml');
  print('2. Implement kernel → IR converter');
  print('3. Integrate into build pipeline');
  print('4. Test with real packages');
}
