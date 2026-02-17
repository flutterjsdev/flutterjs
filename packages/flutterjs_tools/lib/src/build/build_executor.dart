// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:flutterjs_tools/src/build/dependency_graph.dart';
import 'package:flutterjs_tools/src/runner/code_pipleiline.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/ir/declarations/dart_file_builder.dart';
import 'package:flutterjs_core/src/ir/declarations/class_decl.dart';
import 'package:flutterjs_core/src/ir/declarations/import_export_stmt.dart';

/// Orchestrates the build process using a DFS/Post-Order traversal
class BuildExecutor {
  final DependencyGraph graph;
  final UnifiedConversionPipeline pipeline;
  final String projectRoot;
  final String outputDir;
  final bool verbose;

  final Set<String> _visited = {};
  final Set<String> _built = {};
  final Set<String> _onStack = {}; // For cycle detection

  BuildExecutor({
    required this.graph,
    required this.pipeline,
    String? projectRoot,
    required this.outputDir,
    this.verbose = false,
  }) : projectRoot = p.normalize(p.absolute(projectRoot ?? '.'));

  /// Build the project starting from the entry point
  Future<int> buildProject(String entryPointPath) async {
    final entryPoint = p.normalize(p.absolute(entryPointPath));
    _log('🚀 Starting DFS build from: $entryPoint (Root: $projectRoot)');

    // 1. Build Dependency Graph
    _log('📊 Building dependency graph...');
    await graph.build(entryPoint);

    // 2. Execute DFS Traversal and Build
    _log('🔨 Executing build phases...');

    _visited.clear();
    _built.clear();
    _onStack.clear();

    try {
      await _visitAndBuild(entryPoint);
    } catch (e) {
      _log('❌ Build failed: $e');
      rethrow;
    }

    _log('✅ Build complete. ${_built.length} files processed.');
    return _built.length;
  }

  Future<void> _visitAndBuild(String filePath) async {
    if (_built.contains(filePath)) return;

    if (_onStack.contains(filePath)) {
      _log('⚠️  Circular dependency detected: $filePath');
      return;
    }

    _onStack.add(filePath);
    _visited.add(filePath);

    // 1. Recurse on dependencies (Post-Order)
    final deps = graph.getDependencies(filePath);
    for (final dep in deps) {
      await _visitAndBuild(dep);
    }

    // 2. Build current file (Leaf or fully resolved node)
    if (!_built.contains(filePath)) {
      await _buildFile(filePath);
      _built.add(filePath);
    }

    _onStack.remove(filePath);
  }

  Future<void> _buildFile(String filePath) async {
    _log('   Compiling: ${p.basename(filePath)}');
    final relativePath = p.relative(filePath, from: p.join(projectRoot, 'lib'));

    // Determine output path (src/...)
    // Assuming outputDir is .../build/flutterjs/src
    var outputRelPath = relativePath;
    if (outputRelPath.endsWith('.dart')) {
      outputRelPath = p.setExtension(outputRelPath, '.js');
    } else {
      outputRelPath += '.js';
    }
    final outputPath = p.join(outputDir, outputRelPath);

    try {
      // 2a. Extract and register symbols for this file
      // Pass relative path from lib/ so ImportResolver can return it
      // Ensure we use forward slashes for consistency in registry/imports
      // Using context from 'path' package if available or just check string
      var regPath = p.relative(filePath, from: p.join(projectRoot, 'lib'));
      if (Platform.isWindows) {
        regPath = regPath.replaceAll('\\', '/');
      }

      // If the file is NOT in lib, try to make it relative to project root
      if (regPath.startsWith('..')) {
        regPath = p.relative(filePath, from: projectRoot);
        if (Platform.isWindows) {
          regPath = regPath.replaceAll('\\', '/');
        }
      }

      await _registerSymbols(filePath, regPath);

      // 2b. Build file
      final dartFile = await _parseDartFile(filePath);

      final result = await pipeline.executeFullPipeline(
        dartFile: dartFile,
        outputPath: outputPath,
        validate: true,
        optimize: false,
        optimizationLevel: 1,
      );

      if (!result.success) {
        throw Exception('Failed to compile $filePath: ${result.errorMessage}');
      }
    } catch (e) {
      _log('   ❌ Error compiling $filePath: $e');
      rethrow;
    }
  }

  // Helper to parse Dart file into IR
  Future<DartFile> _parseDartFile(String filePath) async {
    // Use DartFileBuilder and DeclarationPass to construction valid DartFile
    final content = await File(filePath).readAsString();

    // Synchronous parsing is fine for single file
    final result = parseString(
      content: content,
      path: filePath,
      throwIfDiagnostics: false,
    );

    final builder = DartFileBuilder(
      filePath: filePath,
      projectRoot: projectRoot,
    );

    final pass = DeclarationPass(
      filePath: filePath,
      fileContent: content,
      builder: builder,
    );

    result.unit.accept(pass);

    // Build import/export model
    final tracker = ImportExportTracker();
    final tempDartFile = builder.build();
    tracker.analyzeDartFile(tempDartFile);
    final importExportModel = tracker.buildModel();

    // Add model and rebuild
    builder.withImportExportModel(importExportModel);
    return builder.build();
  }

  /// Parses the file and registers top-level symbols in the registry
  Future<void> _registerSymbols(String filePath, String relativePath) async {
    if (!await File(filePath).exists()) return;

    _log('   📝 Registering symbols for $relativePath');

    final content = await File(filePath).readAsString();
    final result = parseString(
      content: content,
      path: filePath,
      throwIfDiagnostics: false,
    );

    for (final unitMember in result.unit.declarations) {
      String? name;
      if (unitMember is ClassDeclaration)
        name = unitMember.name.lexeme;
      else if (unitMember is FunctionDeclaration)
        name = unitMember.name.lexeme;
      else if (unitMember is EnumDeclaration)
        name = unitMember.name.lexeme;
      else if (unitMember is MixinDeclaration)
        name = unitMember.name.lexeme;
      else if (unitMember is ExtensionDeclaration)
        name = unitMember.name?.lexeme;
      else if (unitMember is TopLevelVariableDeclaration) {
        for (final v in unitMember.variables.variables) {
          _log('      + Symbol: ${v.name.lexeme} -> $relativePath');
          pipeline.packageRegistry.registerLocalSymbol(
            v.name.lexeme,
            relativePath,
          );
        }
      }

      if (name != null) {
        _log('      + Symbol: $name -> $relativePath');
        pipeline.packageRegistry.registerLocalSymbol(name, relativePath);
      }
    }
  }

  void _log(String message) {
    if (verbose) print(message);
  }
}
