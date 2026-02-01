import 'dart:io';
import 'dart:async';
import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'package:flutterjs_core/src/analysis/visitors/declaration_pass.dart';
import 'package:flutterjs_core/src/ir/declarations/dart_file_builder.dart';
import 'package_resolver.dart';

/// Helper class for showing heartbeat progress during long operations
class _ProgressHeartbeat {
  Timer? _timer;
  final String taskName;
  final Duration interval;
  int _elapsed = 0;

  _ProgressHeartbeat(
    this.taskName, {
    this.interval = const Duration(seconds: 10),
  });

  void start() {
    _timer = Timer.periodic(interval, (timer) {
      _elapsed += interval.inSeconds;
      print('  ⏳ Still working on $taskName... (${_elapsed}s elapsed)');
    });
  }

  void stop() {
    _timer?.cancel();
  }
}

/// Compiles a Dart package to FlutterRS-compatible JavaScript
class PackageCompiler {
  final String packagePath;
  final String outputDir;
  final bool verbose;
  final PackageResolver? resolver;

  PackageCompiler({
    required this.packagePath,
    required this.outputDir,
    this.verbose = false,
    this.resolver,
  });

  String _sourceDirName = 'lib';

  /// Compile the entire package
  Future<void> compile() async {
    final possibleDirs = ['lib', 'src'];
    Directory? sourceDir;
    String? sourceDirName;

    for (final dir in possibleDirs) {
      final d = Directory(p.join(packagePath, dir));
      if (await d.exists()) {
        sourceDir = d;
        _sourceDirName = dir;
        break;
      }
    }

    if (sourceDir == null) {
      if (verbose) {
        print(
          '⚠️ Skipping package at $packagePath: No lib or src directory found.',
        );
      }
      return;
    }

    final distDir = Directory(outputDir);
    if (!await distDir.exists()) {
      await distDir.create(recursive: true);
    }

    final stopwatch = Stopwatch()..start();

    // Extract package name for better progress messages
    var packageName = p.basename(packagePath);
    final pubspecFile = File(p.join(packagePath, 'pubspec.yaml'));
    if (await pubspecFile.exists()) {
      final pubspecContent = await pubspecFile.readAsString();
      final nameMatch = RegExp(
        r'^name:\s+(.+)$',
        multiLine: true,
      ).firstMatch(pubspecContent);
      if (nameMatch != null) packageName = nameMatch.group(1)!.trim();
    }

    final heartbeat = _ProgressHeartbeat(
      packageName,
      interval: Duration(seconds: 10),
    );
    heartbeat.start();

    if (verbose) {
      print('Compiling package at $packagePath (using $_sourceDirName)...');
    }

    try {
      final exportsList = <Map<String, String>>[];

      await for (final entity in sourceDir.list(recursive: true)) {
        if (entity is File && entity.path.endsWith('.dart')) {
          final dartFile = await _compileFile(entity);
          if (dartFile != null) {
            final relativePath = p.relative(
              entity.path,
              from: p.join(packagePath, sourceDirName),
            );
            final jsPath =
                './dist/${p.setExtension(relativePath, '.js')}'; // path seems to need ./dist prefix

            for (final cls in dartFile.classDeclarations) {
              exportsList.add({
                'name': cls.name,
                'path': jsPath,
                'type': 'class',
              });
            }
            for (final func in dartFile.functionDeclarations) {
              exportsList.add({
                'name': func.name,
                'path': jsPath,
                'type':
                    'class', // Using class as generic export type based on existing files
              });
            }
            // Add others if needed
          }
        }
      }

      // Generate exports.json
      final pubspecFile = File(p.join(packagePath, 'pubspec.yaml'));
      String version = '0.0.1';
      String packageName = 'unknown';

      if (await pubspecFile.exists()) {
        final pubspecContent = await pubspecFile.readAsString();
        final versionMatch = RegExp(
          r'^version:\s+(.+)$',
          multiLine: true,
        ).firstMatch(pubspecContent);
        if (versionMatch != null) version = versionMatch.group(1)!.trim();

        final nameMatch = RegExp(
          r'^name:\s+(.+)$',
          multiLine: true,
        ).firstMatch(pubspecContent);
        if (nameMatch != null) packageName = nameMatch.group(1)!.trim();
      }

      final manifest = {
        'package': packageName,
        'version': version,
        'exports': exportsList,
      };

      await File(
        p.join(packagePath, 'exports.json'),
      ).writeAsString(jsonEncode(manifest));

      stopwatch.stop();
      if (verbose || stopwatch.elapsedMilliseconds > 1000) {
        print('✅ Compiled $packageName in ${stopwatch.elapsedMilliseconds}ms');
      } else if (!verbose) {
        // Minimal output for fast builds if needed, or keep silent
      }
    } finally {
      heartbeat.stop();
    }
  }

  Future<DartFile?> _compileFile(File file) async {
    final relativePath = p.relative(
      file.path,
      from: p.join(packagePath, _sourceDirName),
    );
    final outputPath = p.join(outputDir, p.setExtension(relativePath, '.js'));

    if (verbose) {
      print(
        '  Compiling $relativePath -> ${p.relative(outputPath, from: outputDir)}',
      );
    }

    try {
      final content = await file.readAsString();


      // 1. Parse Dart to AST
      final parseResult = parseString(content: content, path: file.path);
      final unit = parseResult.unit;

      // 2. Convert AST to IR (DartFile)
      final builder = DartFileBuilder(
        filePath: file.path,
        projectRoot: packagePath,
      );

      final pass = DeclarationPass(
        filePath: file.path,
        fileContent: content,
        builder: builder,
        verbose: verbose,
      );

      pass.extractDeclarations(unit);
      final dartFile = builder.build();

      // Check for platform-specific imports
      if (dartFile.imports.any(
        (i) =>
            i.uri == 'dart:io' ||
            i.uri == 'dart:ffi' ||
            i.uri == 'dart:isolate' ||
            i.uri == 'dart:mirrors',
      )) {
        if (verbose)
          print(
            '   ⚠️ Warning: $relativePath uses platform specific dependencies (runtime failure possible)',
          );
        // Continue compilation anyway
      }

      // 3. Generate JS from IR
      final pipeline = ModelToJSPipeline(
        importRewriter: (String uri) {
          // REMOVED package: rewriter logic.
          // We want ModelToJSPipeline to handle package: URIs by converting them
          // to bare specifiers (e.g. 'package:foo/foo.dart' -> 'foo/dist/foo.js')
          // which allows the browser's Import Map to verify resolution.
          // Relative paths (../../node_modules/foo) break when served or moved.
          if (uri.startsWith('package:')) {
            return uri; // Pass through to pipeline default handler
          }

          if (uri.endsWith('.dart') && !uri.startsWith('dart:')) {
            // Relative import
            return p.setExtension(uri, '.js');
          }
          return uri;
        },
        verbose: verbose,
      );
      final result = await pipeline.generateFile(dartFile);

      if (result.success && result.code != null) {
        // Ensure output dir exists
        final fileOutputDir = Directory(p.dirname(outputPath));
        if (!await fileOutputDir.exists()) {
          await fileOutputDir.create(recursive: true);
        }

        await File(outputPath).writeAsString(result.code!);

        return dartFile; // Return the full IR for manifest generation
      } else {
        print('❌ Failed to compile $relativePath:');
        for (final issue in result.issues) {
          print('    - ${issue.message}');
        }
        return null; // Compilation failed
      }
    } catch (e, st) {
      print('❌ Error compiling $relativePath: $e');
      if (verbose) {
        print(st);
      }
      return null;
    }
  }
}
