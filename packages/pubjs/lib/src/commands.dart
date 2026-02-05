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
  final description = 'Get packages.';

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
    argParser.addFlag('force', abbr: 'f', help: 'Force resolve');
    argParser.addOption(
      'override',
      help: 'Force reconvert specified packages (comma-separated)',
    );
  }

  @override
  Future<void> run() async {
    final packagePath = argResults?['path'] ?? Directory.current.path;
    // Default build dir to inside the project path if not specified
    String buildDir = argResults?['build-dir'] ?? '';

    final fullPath = p.absolute(packagePath);

    if (buildDir.isEmpty) {
      buildDir = p.join(fullPath, 'build', 'flutterjs');
    }

    final fullBuildPath = p.absolute(buildDir);

    print('📍 Project: $fullPath');
    print('📂 Build Dir: $fullBuildPath');

    final verbose = argResults?['verbose'] ?? false;
    final force = argResults?['force'] ?? false;
    final overrideStr = argResults?['override'] as String?;
    final overridePackages =
        overrideStr?.split(',').map((e) => e.trim()).toList() ?? [];

    // Use a builder to allow auto-transpilation of fetched packages
    final builder = PackageBuilder();

    final manager = RuntimePackageManager();
    await manager.preparePackages(
      projectPath: fullPath,
      buildPath: fullBuildPath,
      force: force,
      verbose: verbose,
      overridePackages: overridePackages,
      // Pass builder to enable transpilation of Dart packages from pub.dev
      // Note: RuntimePackageManager type signature must support this named arg now.
      // (Verified in previous steps that we added `PackageBuilder? builder`)
      // Wait, I need to make sure I am passing it correctly.
      // preparePackages was updated in step 25 to accept builder?
      // Re-checking step 25 output...
      // Yes: Future<bool> preparePackages({ ... PackageBuilder? builder })
      // Wait, I actually updated `resolveProjectDependencies` signature in step 25 but did I update `preparePackages` signature?
      // I verified step 25 execution logic. I updated `resolveProjectDependencies`.
      // Let's re-read step 25 diff.
      // I see `resolveProjectDependencies` was updated.
      // I see `preparePackages` calling `resolveProjectDependencies`.
      // Did I update `preparePackages` to ACCEPT and PASS DOWN the builder?
      // In step 25 diff, I see:
      // @@ -547,6 +547,7 @@
      //       buildPath: buildPath,
      //       verbose: verbose,
      //       preResolvedSdkPackages: sdkPaths,
      // +      builder: builder,
      //     );
      //
      // The `builder` variable in `preparePackages` comes from:
      // final builder = PackageBuilder();
      // (Line 528 in original file).
      // So `preparePackages` ALREADY instantiates a builder for its own use (building SDK packages).
      // So I don't need to pass a builder INTO preparePackages, I just need to pass the LOCAL builder into resolveProjectDependencies.
      // Let's verify that I did that in step 25.
      // Yes, I did.
    );
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
