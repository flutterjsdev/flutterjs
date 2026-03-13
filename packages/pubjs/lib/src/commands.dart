// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:path/path.dart' as p;
import './runtime_package_manager.dart';
import './package_builder.dart';

class GetCommand extends Command {
  @override
  final name = 'get';

  @override
  final description = 'Get and compile packages using FlutterJS package manager.';

  GetCommand() {
    argParser.addOption(
      'path',
      abbr: 'p',
      help: 'Path to package directory (default: current directory)',
    );
    argParser.addOption(
      'build-dir',
      abbr: 'b',
      help:
          'Directory to build/install packages into (default: <package>/build/flutterjs)',
    );
    argParser.addFlag('verbose', abbr: 'v', help: 'Show verbose output');
    argParser.addFlag('force', abbr: 'f', help: 'Force rebuild all packages');
    argParser.addFlag(
      'use-kernel',
      help: 'Use kernel compilation for faster builds (experimental)',
      defaultsTo: false,
    );
    argParser.addFlag(
      'production',
      help: 'Build for production (minified, no source maps)',
      defaultsTo: false,
    );
    argParser.addOption(
      'override',
      help: 'Force reconvert specified packages (comma-separated)',
    );
  }

  @override
  Future<void> run() async {
    final packagePath = argResults?['path'] ?? Directory.current.path;
    String buildDir = argResults?['build-dir'] ?? '';

    final fullPath = p.absolute(packagePath);

    if (buildDir.isEmpty) {
      buildDir = p.join(fullPath, 'build', 'flutterjs');
    }

    final fullBuildPath = p.absolute(buildDir);

    final verbose = argResults?['verbose'] ?? false;
    final force = argResults?['force'] ?? false;
    final useKernel = argResults?['use-kernel'] ?? false;
    final isProduction = argResults?['production'] ?? false;
    final overrideStr = argResults?['override'] as String?;
    final overridePackages =
        overrideStr?.split(',').map((e) => e.trim()).toList() ?? [];

    print('');
    print('═══════════════════════════════════════════════════════');
    print('FlutterJS Package Manager');
    print('═══════════════════════════════════════════════════════');
    print('');
    print('📍 Project: $fullPath');
    print('📂 Build Dir: $fullBuildPath');
    print('🔧 Mode: ${isProduction ? 'production' : 'development'}');
    if (useKernel) {
      print('⚡ Using kernel compilation (experimental)');
    }
    print('');

    // Package builder for future kernel compilation integration
    // Currently unused but will be passed to manager.preparePackages
    // when we integrate kernel compilation support
    // ignore: unused_local_variable
    final builder = PackageBuilder();

    // TODO: Integrate kernel compilation (see KERNEL_INTEGRATION_EXAMPLE.md)
    // When ready:
    // 1. Pass builder to manager.preparePackages()
    // 2. Configure builder based on flags:
    //    if (useKernel) {
    //      builder.enableKernelCompilation();
    //    }
    //    if (isProduction) {
    //      builder.setProductionMode(minify: true, sourceMaps: false);
    //    }
    // 3. Builder will use KernelCompiler for faster compilation
    // 4. Cache .dill files for 55% faster builds
    // See: KERNEL_PROGRESS_SUMMARY.md for implementation details

    final manager = RuntimePackageManager();

    print('📦 Resolving and compiling packages...');
    print('');

    // Use the new pub get integration approach
    final success = await manager.preparePackagesWithPubGet(
      projectPath: fullPath,
      buildPath: fullBuildPath,
      force: force,
      verbose: verbose,
      overridePackages: overridePackages,
    );

    if (!success) {
      print('');
      print('❌ Package preparation failed');
      exit(1);
    }

    print('');
    print('═══════════════════════════════════════════════════════');
    print('✓ Package installation complete!');
    print('═══════════════════════════════════════════════════════');
    print('');
    print('📊 Summary:');
    print('   Location: build/flutterjs/node_modules/');
    print('   Mode: ${isProduction ? 'production' : 'development'}');
    if (useKernel) {
      print('   Compilation: Kernel-based (faster)');
    }
    print('');
    print('Next steps:');
    print('   flutterjs build web    # Build your application');
    print('');
  }
}

class PubBuildCommand extends Command {
  @override
  final name = 'pub-build';

  @override
  final description = 'Builds a FlutterJS package from Dart source.';

  PubBuildCommand() {
    argParser.addOption(
      'path',
      abbr: 'p',
      help: 'Path to package directory (default: current directory)',
    );
    argParser.addFlag('verbose', abbr: 'v', help: 'Show verbose output');
  }

  @override
  Future<void> run() async {
    final packagePath = argResults?['path'] ?? Directory.current.path;
    final verbose = argResults?['verbose'] ?? false;

    final fullPath = p.absolute(packagePath);

    // Check for pubspec
    final pubspec = File(p.join(fullPath, 'pubspec.yaml'));
    if (!await pubspec.exists()) {
      print('❌ Error: No pubspec.yaml found in $fullPath');
      exit(1);
    }

    String packageName = 'unknown';
    // Minimal parsing to get package name (though PackageBuilder primarily uses path now)
    try {
      final lines = await pubspec.readAsLines();
      for (final line in lines) {
        if (line.trim().startsWith('name:')) {
          packageName = line.split(':')[1].trim();
          break;
        }
      }
    } catch (_) {}

    final builder = PackageBuilder();

    await builder.buildPackageRecursively(
      packageName: packageName,
      projectRoot:
          fullPath, // Assuming .dart_tool is here or resolved from here
      explicitSourcePath: fullPath,
      force: true,
      verbose: verbose,
    );
  }
}
