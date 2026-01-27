import 'dart:io';
import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'package:flutterjs_core/src/analysis/visitors/declaration_pass.dart';
import 'package:flutterjs_core/src/ir/declarations/dart_file_builder.dart';
import 'package_resolver.dart';

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

    print('Compiling package at $packagePath (using $_sourceDirName)...');

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
    print('✅ Generated exports.json for $packageName');
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
            '   ⚠️ Skipping $relativePath (platform specific dependencies)',
          );
        return null;
      }

      // 3. Generate JS from IR
      final pipeline = ModelToJSPipeline(
        importRewriter: (String uri) {
          if (uri.startsWith('package:')) {
            if (resolver == null) {
              if (verbose) print('   ⚠️ Rewriter: resolver is null for $uri');
              return uri;
            }
            final uriParsed = Uri.parse(uri);
            final pkgName = uriParsed.pathSegments.first;
            final pathInPkg = uriParsed.pathSegments.skip(1).join('/');

            final pkgRoot = resolver!.resolvePackagePath(pkgName);
            if (pkgRoot == null) {
              if (verbose)
                print('   ⚠️ Rewriter: could not resolve path for $pkgName');
            }
            if (pkgRoot != null) {
              // Assume standard structure: package_root/dist/path/to/file.js
              // Note: The original dart file was likely in package_root/lib/path/to/file.dart
              // And we map lib/ -> dist/
              // pathInPkg usually doesn't include 'lib' if using standard exports?
              // Wait. package:foo/bar.dart maps to foo/lib/bar.dart on disk.
              // Our compiler outputs foo/lib/bar.dart -> foo/dist/bar.js.
              // So target path is pkgRoot/dist/bar.js.
              // If pathInPkg includes 'src', e.g. package:foo/src/internal.dart
              // It maps to foo/lib/src/internal.dart -> foo/dist/src/internal.js.

              final targetJsAbs = p.join(
                pkgRoot,
                'dist',
                p.setExtension(pathInPkg, '.js'),
              );

              // outputPath is absolute path of FILE BEING GENERATED
              final currentJsAbs = outputPath;

              String relativePath = p.relative(
                targetJsAbs,
                from: p.dirname(currentJsAbs),
              );
              relativePath = p.normalize(relativePath);

              // Ensure dot prefix for local relative paths
              if (!relativePath.startsWith('.')) {
                relativePath = './$relativePath';
              }
              return relativePath.replaceAll(r'\', '/');
            }
          }

          if (uri.endsWith('.dart') && !uri.startsWith('dart:')) {
            // Relative import
            return p.setExtension(uri, '.js');
          }
          return uri;
        },
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
