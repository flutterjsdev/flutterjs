// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:path/path.dart' as path;
import 'package:args/command_runner.dart';

import 'package:flutterjs_tools/src/runner/run_command.dart'; // Reuse SetupManager
import 'package:flutterjs_tools/src/runner/engine_bridge.dart';
import 'package:flutterjs_tools/command.dart';

/// ============================================================================
/// BuildCommand – FlutterJS Build System (Production / Development)
/// ============================================================================
class BuildCommand extends Command<void> {
  BuildCommand({required this.verbose, required this.verboseHelp}) {
    argParser
      ..addOption(
        'mode',
        abbr: 'm',
        help: 'Build mode.',
        allowed: ['production', 'dev', 'development'],
        defaultsTo: 'production',
      )
      ..addFlag(
        'compress-max',
        help: 'Enable maximum compression.',
        negatable: false,
      )
      ..addFlag(
        'compare',
        help: 'Compare build sizes with Flutter Web.',
        negatable: false,
      )
      ..addOption(
        'output',
        abbr: 'o',
        help: 'Output directory.',
        defaultsTo: 'build',
      )
      ..addOption(
        'project',
        abbr: 'p',
        help: 'Path to project root (defaults to current directory).',
        defaultsTo: '.',
        hide: true, // Advanced: run from inside the project like `flutter build`
      )
      ..addOption(
        'source',
        abbr: 's',
        help: 'Path to source directory relative to project root.',
        defaultsTo: 'lib',
      )
      ..addFlag(
        'obfuscate',
        help: 'Obfuscate code (enabled by default in production).',
        defaultsTo: null,
      )
      ..addFlag('tree-shake', help: 'Remove unused code.', defaultsTo: true)
      ..addOption(
        'max-parallelism',
        help: 'Maximum parallel workers.',
        defaultsTo: '4',
      )
      ..addFlag(
        'parallel',
        help: 'Enable parallel processing.',
        defaultsTo: true,
      )
      ..addFlag(
        'to-js',
        help: 'Convert IR to JavaScript (Implicit in build).',
        defaultsTo: true,
      )
      ..addOption(
        'optimization-level',
        abbr: 'O',
        help:
            'JS Optimization Level (0-3). 0=None, 1=Basic, 3=Aggressive (Default for prod).',
      )
      ..addFlag(
        'serve',
        help: 'Serve the build output (Use "flutterjs preview" instead).',
        defaultsTo: false,
      )
      ..addFlag(
        'package-mode',
        help: 'Output compiled JS to <package>/src/ instead of dist/ (for SDK package development).',
        negatable: false,
      )
      ..addOption(
        'target',
        abbr: 't',
        help: 'Compilation target: web (Flutter/browser) or node (Node.js server-side).',
        allowed: ['web', 'node'],
        defaultsTo: 'web',
      );
  }

  final bool verbose;
  final bool verboseHelp;

  @override
  String get name => 'build';

  @override
  String get description => 'Build production or development output.';

  @override
  String get invocation => 'flutterjs build [options]';

  @override
  Future<void> run() async {
    final mode = argResults!['mode'] as String;
    final isDev = mode == 'dev' || mode == 'development';
    final outputDir = argResults!['output'] as String;
    final projectPath = argResults!['project'] as String;
    final sourcePath = argResults!['source'] as String;

    _printHeader();

    if (verbose) {
      print('Configuration:');
      print('  Mode:         ${isDev ? "Development" : "Production"}');
      print('  Output:       $outputDir/');
      print('  Project:      $projectPath');
      print('');
    }

    // 1. Create Pipeline Config
    final config = PipelineConfig(
      projectPath: projectPath,
      sourcePath: sourcePath,
      jsonOutput: false,
      enableParallel: argResults!['parallel'] as bool,
      maxParallelism: int.parse(argResults!['max-parallelism'] as String),
      enableIncremental: true,
      skipAnalysis: false,
      showAnalysis: false,
      strictMode: !isDev, // Strict in production
      toJs: true, // Build always implies to-js
      jsOptLevel: argResults!['optimization-level'] != null
          ? int.parse(argResults!['optimization-level'] as String)
          : (isDev ? 0 : 3), // 3 for prod, 0 for dev
      validateOutput: true,
      generateReports: true,
      devToolsPort: 8765,
      devToolsNoOpen: true,
      enableDevTools: false,
      serve: false,
      serverPort: 3000,
      openBrowser: false,
      verbose: verbose,
      target: argResults!['target'] as String,
    );

    // 2. Setup Context
    final setupManager = SetupManager(config: config, verbose: verbose);
    final context = await setupManager.setup();

    if (context == null) {
      print('❌ Setup failed. Aborting build.');
      exit(1);
    }

    try {
      // 3. Analysis Phase
      final analysisResults = await AnalysisPhase.execute(
        config,
        context,
        verbose,
      );

      // 4. IR Generation Phase
      final irResults = await IRGenerationPhase.execute(
        config,
        context,
        analysisResults,
        verbose,
      );

      // 5. JS Conversion Phase
      final jsResults = await JSConversionPhase.execute(
        config,
        context,
        irResults,
        verbose,
      );

      // 6. Report Results
      final reporter = ResultReporter(
        config: config,
        context: context,
        verbose: verbose,
      );

      if (config.generateReports) {
        await reporter.generateDetailedReports(
          PipelineResults(
            analysis: analysisResults,
            irGeneration: irResults,
            jsConversion: jsResults,
            duration: Stopwatch(), // Dummy for now
          ),
        );
      }

      reporter.printHumanOutput(
        PipelineResults(
          analysis: analysisResults,
          irGeneration: irResults,
          jsConversion: jsResults,
          duration: Stopwatch(),
        ),
      );

      // 7. Trigger JS Build Phase
      print('\n🚀 Triggering JS Bundle Phase...');
      final bridgeManager = EngineBridgeManager();

      // Ensure project initialized
      await bridgeManager.initProject(
        buildPath: context.buildPath,
        verbose: verbose,
      );

      final success = await bridgeManager.buildProject(
        buildPath: context.buildPath,
        verbose: verbose,
      );

      if (!success) {
        print('❌ JS Build failed.');
        exit(1);
      } else {
        print('\n✅ JS Build completed.');

        // Copy dist to project root
        final distSource = Directory(path.join(context.buildPath, 'dist'));
        final distDest = Directory(path.join(context.projectPath, 'dist'));

        if (await distSource.exists()) {
          print('    Copying artifacts to ${distDest.path}...');
          if (await distDest.exists()) {
            await distDest.delete(recursive: true);
          }
          await distDest.create(recursive: true);
          await _copyDirectory(distSource, distDest);
          print('    ✅ Artifacts ready in dist/');
        } else {
          print('    ⚠️  Warning: No dist/ directory found in build output.');
        }
      }

      // Handle --serve flag
      if (argResults!['serve'] as bool) {
        print('\n💡 Tip: To preview your production build, run:');
        print('   flutterjs preview');
        print('\n   To start a development server with hot reload, run:');
        print('   flutterjs dev (or flutterjs run)');
      }
    } catch (e, st) {
      print('\n❌ Fatal Build Error: $e');
      if (verbose) {
        print(st);
      }
      exit(1);
    }
  }

  void _printHeader() {
    print('🔨 Building FlutterJS project...\n');
  }

  Future<void> _copyDirectory(Directory source, Directory destination) async {
    await for (var entity in source.list(recursive: false)) {
      if (entity is Directory) {
        var newDirectory = Directory(
          path.join(destination.absolute.path, path.basename(entity.path)),
        );
        await newDirectory.create();
        await _copyDirectory(entity.absolute, newDirectory);
      } else if (entity is File) {
        await entity.copy(
          path.join(destination.absolute.path, path.basename(entity.path)),
        );
      }
    }
  }
}
