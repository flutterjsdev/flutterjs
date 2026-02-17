// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
  final bool outputToSrc;

  PackageCompiler({
    required this.packagePath,
    required this.outputDir,
    this.verbose = false,
    this.resolver,
    this.outputToSrc = false,
  });

  String _sourceDirName = 'lib';
  late String _actualOutputDir; // Computed output directory based on mode

  /// Compile the entire package
  Future<void> compile({Map<String, String>? dependencyPaths}) async {
    final possibleDirs = ['lib', 'src'];
    Directory? sourceDir;
    String? sourceDirName;

    // Extract package name early
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

    for (final dir in possibleDirs) {
      final d = Directory(p.join(packagePath, dir));
      if (await d.exists()) {
        sourceDir = d;
        sourceDirName = dir;
        _sourceDirName = dir;
        break;
      }
    }

    if (sourceDir == null || sourceDirName == null) {
      if (verbose) {
        print(
          '⚠️ Skipping package at $packagePath: No lib or src directory found.',
        );
      }
      return;
    }

    // ✅ Determine actual output directory based on mode
    _actualOutputDir = outputToSrc
        ? p.join(packagePath, packageName, 'src') // Package-mode: output to src/
        : outputDir; // Normal mode: output to dist/

    if (verbose && outputToSrc) {
      print('   📦 Package mode: outputting to $_actualOutputDir');
    }

    final distDir = Directory(_actualOutputDir);
    if (!await distDir.exists()) {
      await distDir.create(recursive: true);
    }

    final stopwatch = Stopwatch()..start();

    // ✅ Build Global Symbol Table from Dependencies
    final globalSymbolTable = <String, String>{};
    if (dependencyPaths != null) {
      if (verbose)
        print(
          '   🔍 Loading exports from ${dependencyPaths.length} dependencies...',
        );

      for (final depName in dependencyPaths.keys) {
        final depPath = dependencyPaths[depName]!;
        final exportsFile = File(p.join(depPath, 'exports.json'));

        if (await exportsFile.exists()) {
          try {
            final content = await exportsFile.readAsString();
            final json = jsonDecode(content);
            final exports = (json['exports'] as List?) ?? [];

            for (final export in exports) {
              final name = export['name'] as String?;
              final jsPath = export['path'] as String?;
              final uri = export['uri'] as String?; // ✅ explicit URI

              if (name != null) {
                if (uri != null) {
                  // Use explicit URI if available
                  globalSymbolTable[name] = uri;
                } else if (jsPath != null) {
                  // Fallback to inference (Legacy support)
                  var uriPath = jsPath;
                  if (uriPath.startsWith('./')) uriPath = uriPath.substring(2);
                  if (uriPath.startsWith('dist/'))
                    uriPath = uriPath.substring(5);

                  if (uriPath.endsWith('.js')) {
                    uriPath =
                        uriPath.substring(0, uriPath.length - 3) + '.dart';
                  }

                  final inferredUri = 'package:$depName/$uriPath';
                  globalSymbolTable[name] = inferredUri;
                }
              }
            }
          } catch (e) {
            if (verbose)
              print('   ⚠️ Failed to read exports.json for $depName: $e');
          }
        }
      }
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
      final parsedFiles = <File, DartFile>{};
      final localExports = <String, String>{};

      // PHASE 1: Parse all files and collect local exports
      print('DEBUG: Scanned sourceDir: ${sourceDir.path}');
      await for (final entity in sourceDir.list(recursive: true)) {
        if (entity is File && entity.path.endsWith('.dart')) {
          print('DEBUG: Found Dart file: ${entity.path}');
          final dartFile = await _parseFile(entity);
          if (dartFile != null) {
            parsedFiles[entity] = dartFile;

            final relativePath = p.relative(
              entity.path,
              from: p.join(packagePath, sourceDirName),
            );

            // ✅ Use src/ or dist/ based on mode
            final outputSubdir = outputToSrc ? 'src' : 'dist';
            final jsPath =
                './$outputSubdir/${p.setExtension(relativePath, '.js').replaceAll(r'\', '/')}';

            // Collect exports for THIS package
            for (final cls in dartFile.classDeclarations) {
              final dartUri =
                  'package:$packageName/${relativePath.replaceAll(r'\', '/')}';

              exportsList.add({
                'name': cls.name,
                'path': jsPath,
                'uri': dartUri,
                'type': 'class',
              });
              localExports[cls.name] = dartUri;
            }
            for (final func in dartFile.functionDeclarations) {
              final dartUri =
                  'package:$packageName/${relativePath.replaceAll(r'\', '/')}';
              exportsList.add({
                'name': func.name,
                'path': jsPath,
                'uri': dartUri,
                'type': 'function',
              });
              localExports[func.name] = dartUri;
            }

            // Add enum exports
            for (final enumDecl in dartFile.enumDeclarations) {
              final dartUri =
                  'package:$packageName/${relativePath.replaceAll(r'\', '/')}';

              // Export the enum type itself
              exportsList.add({
                'name': enumDecl.name,
                'path': jsPath,
                'uri': dartUri,
                'type': 'enum',
              });
              localExports[enumDecl.name] = dartUri;

              // Export each enum member (for auto-complete and symbol resolution)
              for (final value in enumDecl.values) {
                exportsList.add({
                  'name': '${enumDecl.name}.${value.name}',
                  'path': jsPath,
                  'uri': dartUri,
                  'type': 'enum_member',
                  'parent': enumDecl.name,
                });
              }
            }
          }
        }
      }

      // ✅ Update globalSymbolTable with local exports
      // This ensures that files in this package can resolve symbols
      // defined in other files of the SAME package using absolute package: URIs.
      globalSymbolTable.addAll(localExports);

      // DEBUG: Verify Style for path package
      if (packageName == 'path') {
        print(
          'DEBUG: [PackageCompiler] Global Symbol Table for $packageName has ${globalSymbolTable.length} entries',
        );
        if (globalSymbolTable.containsKey('Style')) {
          print(
            'DEBUG: [PackageCompiler] Style -> ${globalSymbolTable['Style']}',
          );
        } else {
          print(
            'DEBUG: [PackageCompiler] Style NOT FOUND in globalSymbolTable for $packageName',
          );
          print(
            'DEBUG: [PackageCompiler] Local Exports has Style? ${localExports.containsKey('Style')}',
          );
        }
      }

      // PHASE 2: Generate JS using the populated symbol table
      for (final entry in parsedFiles.entries) {
        await _generateJS(
          entry.key,
          entry.value,
          globalSymbolTable: globalSymbolTable,
        );
      }

      // Generate exports.json
      // (Version extraction logic remains same)
      var version = '0.0.1';
      final pubspecFile2 = File(p.join(packagePath, 'pubspec.yaml'));
      if (await pubspecFile2.exists()) {
        final pubspecContent = await pubspecFile2.readAsString();
        final versionMatch = RegExp(
          r'^version:\s+(.+)$',
          multiLine: true,
        ).firstMatch(pubspecContent);
        if (versionMatch != null) version = versionMatch.group(1)!.trim();
      }

      final manifest = {
        'package': packageName,
        'version': version,
        'exports': exportsList,
      };

      // ✅ Write exports.json to package dir when in package mode
      final exportsPath = outputToSrc
          ? p.join(packagePath, packageName, 'exports.json')
          : p.join(packagePath, 'exports.json');

      await File(exportsPath).writeAsString(jsonEncode(manifest));

      // ✅ Generate barrel export (src/index.js) when in package mode
      if (outputToSrc) {
        await _generateBarrelExport(exportsList, packageName);
      }

      stopwatch.stop();
      if (verbose || stopwatch.elapsedMilliseconds > 1000) {
        print('✅ Compiled $packageName in ${stopwatch.elapsedMilliseconds}ms');
      }
    } finally {
      heartbeat.stop();
    }
  }

  /// Generate barrel export file (src/index.js) that re-exports all symbols
  Future<void> _generateBarrelExport(
    List<Map<String, String>> exportsList,
    String packageName,
  ) async {
    final srcDir = Directory(_actualOutputDir);
    if (!await srcDir.exists()) {
      return;
    }

    // Group exports by file path
    final exportsByPath = <String, Set<String>>{};
    for (final export in exportsList) {
      final path = export['path'];
      final name = export['name'];
      if (path != null && name != null && !name.contains('.')) {
        // Skip enum members like "LaunchMode.platformDefault"
        final relativePath = path.replaceFirst(RegExp(r'^\./(?:src|dist)/'), './');
        exportsByPath.putIfAbsent(relativePath, () => {}).add(name);
      }
    }

    // Generate import/export statements
    final statements = <String>[];
    for (final entry in exportsByPath.entries.toList()..sort((a, b) => a.key.compareTo(b.key))) {
      final path = entry.key;
      final symbols = entry.value.toList()..sort();
      statements.add('export { ${symbols.join(', ')} } from \'$path\';');
    }

    final barrelContent = '''
// Auto-generated barrel export for @flutterjs/$packageName
// Do not edit manually - regenerated on each build
// Generated at: ${DateTime.now()}

${statements.join('\n')}
''';

    final indexFile = File(p.join(_actualOutputDir, 'index.js'));
    await indexFile.writeAsString(barrelContent);

    if (verbose) {
      print('   📦 Generated barrel export: ${p.relative(indexFile.path, from: packagePath)}');
    }
  }

  Future<DartFile?> _parseFile(File file) async {
    final relativePath = p.relative(
      file.path,
      from: p.join(packagePath, _sourceDirName),
    );

    if (verbose) {
      print('  Parsing $relativePath');
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

      // Build import/export model before finalizing DartFile
      final tracker = ImportExportTracker();
      final tempDartFile = builder.build();
      tracker.analyzeDartFile(tempDartFile);
      final importExportModel = tracker.buildModel();

      // Add model to builder and rebuild
      builder.withImportExportModel(importExportModel);
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
      }

      return dartFile;
    } catch (e, st) {
      print('❌ Error parsing $relativePath: $e');
      if (verbose) {
        print(st);
      }
      return null;
    }
  }

  Future<bool> _generateJS(
    File file,
    DartFile dartFile, {
    Map<String, String> globalSymbolTable = const {},
  }) async {
    final relativePath = p.relative(
      file.path,
      from: p.join(packagePath, _sourceDirName),
    );
    final outputPath = p.join(_actualOutputDir, p.setExtension(relativePath, '.js'));

    if (verbose) {
      print(
        '  Generatng JS $relativePath -> ${p.relative(outputPath, from: _actualOutputDir)}',
      );
    }

    try {
      // 3. Generate JS from IR
      final pipeline = ModelToJSPipeline(
        globalSymbolTable: globalSymbolTable,
        importRewriter: (String uri) {
          if (uri.startsWith('package:')) {
            if (uri.endsWith('.dart')) {
              return p.setExtension(uri, '.js');
            }
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

        return true;
      } else {
        print('❌ Failed to compile $relativePath:');
        if (result.message != null) {
          print('    Error: ${result.message}');
        }
        if (result.code != null) {
          print('--- GENERATED CODE BEGIN ---');
          print(result.code);
          print('--- GENERATED CODE END ---');
        }
        for (final issue in result.issues) {
          print('    - ${issue.message}');
        }
        return false;
      }
    } catch (e, st) {
      print('❌ Error generating JS for $relativePath: $e');
      if (verbose) {
        print(st);
      }
      return false;
    }
  }
}
