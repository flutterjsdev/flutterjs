// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:path/path.dart' as p;

/// Wrapper around dart compile kernel for generating .dill files
///
/// This uses Dart's official CFE (Common Front-End) to compile Dart source
/// to Kernel IR, which gives us perfect type resolution and all dependencies
/// resolved. We then parse the kernel to build our own IR.
class KernelCompiler {
  final String dartSdkPath;

  KernelCompiler({
    String? dartSdkPath,
  }) : dartSdkPath = dartSdkPath ?? _findDartSdk();

  /// Find the Dart SDK path
  static String _findDartSdk() {
    // Try DART_SDK environment variable
    final envSdk = Platform.environment['DART_SDK'];
    if (envSdk != null && Directory(envSdk).existsSync()) {
      return envSdk;
    }

    // Try to find dart executable
    final whereCmd = Platform.isWindows ? 'where' : 'which';
    final result = Process.runSync(whereCmd, ['dart']);
    if (result.exitCode == 0) {
      final dartPath = (result.stdout as String).trim().split('\n').first;
      // SDK is parent of bin directory
      return p.dirname(p.dirname(dartPath));
    }

    throw Exception('Could not find Dart SDK. Set DART_SDK environment variable.');
  }

  /// Compile Dart source to Kernel (.dill file)
  ///
  /// This is what dart2js does as its first step. We're using the same
  /// proven CFE that Google maintains.
  ///
  /// [entryPoint] - Path to main Dart file
  /// [outputPath] - Where to write the .dill file
  /// [packageConfigPath] - Path to .dart_tool/package_config.json
  Future<KernelCompilationResult> compileToKernel({
    required String entryPoint,
    required String outputPath,
    String? packageConfigPath,
    List<String>? additionalArgs,
  }) async {
    final args = [
      'compile',
      'kernel',
      if (packageConfigPath != null) ...['--packages', packageConfigPath],
      '-o',
      outputPath,
      ...?additionalArgs,
      entryPoint,
    ];

    print('Compiling to kernel: $entryPoint');
    print('  Output: $outputPath');

    final stopwatch = Stopwatch()..start();

    final result = await Process.run(
      Platform.isWindows ? 'dart.bat' : 'dart',
      args,
      runInShell: true,
    );

    stopwatch.stop();

    if (result.exitCode != 0) {
      return KernelCompilationResult(
        success: false,
        outputPath: outputPath,
        duration: stopwatch.elapsed,
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
      );
    }

    final fileSize = File(outputPath).lengthSync();
    print('  ✓ Compiled in ${stopwatch.elapsedMilliseconds}ms');
    print('  ✓ Kernel size: ${(fileSize / 1024).toStringAsFixed(1)} KB');

    return KernelCompilationResult(
      success: true,
      outputPath: outputPath,
      kernelSize: fileSize,
      duration: stopwatch.elapsed,
      stdout: result.stdout.toString(),
    );
  }

  /// Compile directly to JavaScript using dart2js
  ///
  /// This is for extracting the runtime or for comparison purposes.
  Future<Dart2JSCompilationResult> compileToDart2JS({
    required String entryPoint,
    required String outputPath,
    String? packageConfigPath,
    bool csp = true,
    int optimizationLevel = 4,
    bool minify = true,
    bool sourceMaps = false,
  }) async {
    final args = [
      'compile',
      'js',
      if (packageConfigPath != null) ...['--packages', packageConfigPath],
      if (csp) '--csp',
      '-O$optimizationLevel',
      if (minify) '--minify' else '--no-minify',
      if (!sourceMaps) '--no-source-maps',
      '-o',
      outputPath,
      entryPoint,
    ];

    print('Compiling with dart2js: $entryPoint');
    print('  Optimization: O$optimizationLevel');
    print('  CSP: $csp, Minify: $minify');

    final stopwatch = Stopwatch()..start();

    final result = await Process.run(
      Platform.isWindows ? 'dart.bat' : 'dart',
      args,
      runInShell: true,
    );

    stopwatch.stop();

    if (result.exitCode != 0) {
      return Dart2JSCompilationResult(
        success: false,
        outputPath: outputPath,
        duration: stopwatch.elapsed,
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
      );
    }

    final fileSize = File(outputPath).lengthSync();
    final lines = File(outputPath).readAsLinesSync().length;

    print('  ✓ Compiled in ${stopwatch.elapsedMilliseconds}ms');
    print('  ✓ Output size: ${(fileSize / 1024).toStringAsFixed(1)} KB ($lines lines)');

    return Dart2JSCompilationResult(
      success: true,
      outputPath: outputPath,
      outputSize: fileSize,
      lineCount: lines,
      duration: stopwatch.elapsed,
      stdout: result.stdout.toString(),
    );
  }
}

class KernelCompilationResult {
  final bool success;
  final String outputPath;
  final int? kernelSize;
  final Duration duration;
  final String stdout;
  final String? stderr;

  KernelCompilationResult({
    required this.success,
    required this.outputPath,
    this.kernelSize,
    required this.duration,
    required this.stdout,
    this.stderr,
  });
}

class Dart2JSCompilationResult {
  final bool success;
  final String outputPath;
  final int? outputSize;
  final int? lineCount;
  final Duration duration;
  final String stdout;
  final String? stderr;

  Dart2JSCompilationResult({
    required this.success,
    required this.outputPath,
    this.outputSize,
    this.lineCount,
    required this.duration,
    required this.stdout,
    this.stderr,
  });
}
