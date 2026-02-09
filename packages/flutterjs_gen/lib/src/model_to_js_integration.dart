// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// MODEL-TO-JS CODE GEN INTEGRATION LAYER
// ============================================================================
// Unified entry point for all code generation phases
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'package:flutterjs_gen/src/validation_optimization/js_optimizer.dart';
import 'package:flutterjs_gen/src/model_to_js_diagnostic.dart';
import 'package:flutterjs_gen/src/utils/import_analyzer.dart';
import 'package:flutterjs_gen/src/utils/indenter.dart';
import 'package:path/path.dart' as p;
import 'dart:io';

// ============================================================================
// GENERATION PIPELINE ORCHESTRATOR
// ============================================================================

class ModelToJSPipeline {
  late final IRStructureValidator irValidator;
  late final CodeGenerationValidator codeGenValidator;
  late final WidgetValidationValidator widgetValidator;
  late final ModelToJSDiagnosticEngine diagnosticEngine;

  late final ExpressionCodeGen exprGen;
  late final StatementCodeGen stmtGen;
  late final ClassCodeGen classGen;
  late final FunctionCodeGen funcGen;
  late final BuildMethodCodeGen buildMethodGen;
  late final Indenter indenter;

  final List<String> logs = [];
  final List<DiagnosticIssue> issues = [];

  // Optional callback to rewrite import URIs (e.g. package: -> relative path)
  final String Function(String uri)? importRewriter;
  final bool verbose;

  // NEW: Global symbol table (Symbol -> URI) from exports.json
  final Map<String, String> globalSymbolTable;

  ModelToJSPipeline({
    this.importRewriter,
    this.verbose = false,
    this.globalSymbolTable = const {},
  }) {
    indenter = Indenter('  ');
    _initializeDiagnostics();
    _initializeGenerators();
  }

  void _initializeDiagnostics() {
    irValidator = IRStructureValidator();
    codeGenValidator = CodeGenerationValidator();
    widgetValidator = WidgetValidationValidator();
    diagnosticEngine = ModelToJSDiagnosticEngine();
  }

  void _initializeGenerators() {
    exprGen = ExpressionCodeGen();
    stmtGen = StatementCodeGen(exprGen: exprGen);
    // Share the indenter
    stmtGen.indenter = indenter;

    funcGen = FunctionCodeGen(exprGen: exprGen, stmtGen: stmtGen);
    classGen = ClassCodeGen(
      exprGen: exprGen,
      stmtGen: stmtGen,
      funcGen: funcGen,
    );
    buildMethodGen = BuildMethodCodeGen(exprGen: exprGen, stmtGen: stmtGen);
  }

  // =========================================================================
  // MAIN PIPELINE EXECUTION
  // =========================================================================

  Future<GenerationResult> generateFile(DartFile dartFile) async {
    _log('🚀 Starting Model-to-JS conversion pipeline...');
    _log('File: ${dartFile.filePath}');

    try {
      // Step 1: VALIDATE IR
      _log('\n[1/4] Validating IR structure...');
      final irReport = await _validateIR(dartFile);
      if (irReport.hasCriticalIssues) {
        _log('❌ IR validation failed');
        return GenerationResult.failed(
          message: 'IR structure validation failed',
          issues: irReport.issues,
        );
      }
      _log('✅ IR structure valid');

      // Step 2: GENERATE CODE
      _log('\n[2/4] Generating JavaScript code...');
      final jsCode = await _generateJavaScript(dartFile);
      if (jsCode.isEmpty) {
        _log('❌ Code generation produced empty output');
        return GenerationResult.failed(
          message: 'Code generation failed',
          issues: issues,
        );
      }
      _log('✅ JavaScript code generated (${jsCode.length} chars)');

      // Step 3: VALIDATE OUTPUT
      _log('\n[3/4] Validating generated code...');
      final outputReport = await _validateOutput(jsCode);
      if (outputReport.hasCriticalIssues) {
        _log('❌ Output validation failed');
        return GenerationResult.failed(
          message: 'Generated code validation failed',
          issues: outputReport.issues,
        );
      }
      _log('✅ Generated code is valid');

      // Step 4: OPTIMIZE (Optional)
      _log('\n[4/4] Optimizing code...');
      final optimizedCode = await _optimizeCode(jsCode);
      _log(
        '✅ Code optimized (${jsCode.length} → ${optimizedCode.length} chars)',
      );

      return GenerationResult.success(
        code: optimizedCode,
        statistics: {
          'originalSize': jsCode.length,
          'optimizedSize': optimizedCode.length,
          'reduction': jsCode.length - optimizedCode.length,
          'classes': dartFile.classDeclarations.length,
          'functions': dartFile.functionDeclarations.length,
        },
      );
    } catch (e, st) {
      _log('❌ Pipeline error: $e\n$st');
      return GenerationResult.failed(
        message: 'Unexpected pipeline error: $e',
        issues: issues,
      );
    }
  }

  // =========================================================================
  // PHASE IMPLEMENTATIONS
  // =========================================================================

  Future<DiagnosticReport> _validateIR(DartFile dartFile) async {
    final report = diagnosticEngine.performFullDiagnostics(dartFile);

    // Log issues
    for (final issue in report.issues) {
      _log('  ${issue.severity.name.toUpperCase()}: ${issue.message}');
      issues.add(issue);
    }

    return report;
  }

  Future<String> _generateJavaScript(DartFile dartFile) async {
    final buffer = StringBuffer();

    // Generate header
    buffer.writeln(_generateFileHeader(dartFile));

    // Generate imports
    buffer.writeln(_generateImports(dartFile));
    buffer.writeln();

    // DEBUG: List all functions
    print(
      'DEBUG: Functions in ${dartFile.filePath}: ${dartFile.functionDeclarations.map((f) => f.name).join(', ')}',
    );

    // Generate classes

    for (final cls in dartFile.classDeclarations) {
      try {
        _log('  Generating class: ${cls.name}');
        buffer.writeln(classGen.generate(cls));
        buffer.writeln();
      } catch (e, st) {
        _log('  ❌ Error generating class ${cls.name}: $e');
        issues.add(
          DiagnosticIssue(
            severity: DiagnosticSeverity.error,
            code: 'GEN001',
            message: 'Failed to generate class ${cls.name}: $e',
            affectedNode: cls.name,
            stackTrace: st,
          ),
        );
      }
    }

    // Generate functions
    // Group functions by name to detect getter/setter pairs
    final funcsByName = <String, List<FunctionDecl>>{};
    for (var f in dartFile.functionDeclarations) {
      var key = f.name;
      if (f.isSetter && key.endsWith('=')) {
        key = key.substring(0, key.length - 1);
      }
      funcsByName.putIfAbsent(key, () => []).add(f);
    }

    for (var name in funcsByName.keys) {
      // DEBUG:
      if (name == 'createInternal') {
        print('DEBUG: Found createInternal in ${dartFile.filePath}');
      }
      final group = funcsByName[name]!;

      // Check for getter/setter pair
      FunctionDecl? getter;
      FunctionDecl? setter;

      for (var f in group) {
        if (f.isGetter) getter = f;
        if (f.isSetter) setter = f;
      }

      if (group.length == 2 && getter != null && setter != null) {
        // Handle getter/setter pair
        try {
          _log('  Generating merged getter/setter: $name');
          buffer.writeln(await _generateMergedGetterSetter(getter, setter));
          buffer.writeln();
        } catch (e, st) {
          _log('  ❌ Error generating getter/setter pair $name: $e');
          issues.add(
            DiagnosticIssue(
              severity: DiagnosticSeverity.error,
              code: 'GEN003',
              message: 'Failed to generate getter/setter pair $name: $e',
              affectedNode: name,
              stackTrace: st,
            ),
          );
        }
      } else {
        // Handle normally (single functions or non-pairs)
        for (final func in group) {
          try {
            _log('  Generating function: ${func.name}');
            buffer.writeln(funcGen.generate(func));
            buffer.writeln();
          } catch (e, st) {
            _log('  ❌ Error generating function ${func.name}: $e');
            issues.add(
              DiagnosticIssue(
                severity: DiagnosticSeverity.error,
                code: 'GEN002',
                message: 'Failed to generate function ${func.name}: $e',
                affectedNode: func.name,
                stackTrace: st,
              ),
            );
          }
        }
      }
    }

    // Generate variables
    for (final variable in dartFile.variableDeclarations) {
      try {
        _log('  Generating variable: ${variable.name}');
        final safeName = exprGen.safeIdentifier(variable.name);
        final keyword = variable.isFinal || variable.isConst ? 'const' : 'let';

        if (variable.initializer != null) {
          final init = exprGen.generate(variable.initializer!);
          buffer.writeln('$keyword $safeName = $init;');
        } else {
          buffer.writeln('$keyword $safeName = null;');
        }
        buffer.writeln();
      } catch (e, st) {
        _log('  ❌ Error generating variable ${variable.name}: $e');
        issues.add(
          DiagnosticIssue(
            severity: DiagnosticSeverity.error,
            code: 'GEN004',
            message: 'Failed to generate variable ${variable.name}: $e',
            affectedNode: variable.name,
            stackTrace: st,
          ),
        );
      }
    }

    // Generate exports
    buffer.writeln(_generateExports(dartFile));

    // 🔄 CIRCULAR DEPENDENCY FIX:
    // Expose `current` globally for context.js to use without importing path.js
    // We utilize p.separator to ensure we don't accidentally match 'parsed_path.dart'
    if (dartFile.filePath.endsWith('${p.separator}path.dart')) {
      buffer.writeln('// 🔄 Circular dependency fix: expose current');
      buffer.writeln('globalThis._flutterjs_path_current = current;');
    }

    // 🔄 CIRCULAR DEPENDENCY FIX (Part 3):
    // style.js cannot import Context because context.js imports style.js indirecty.
    // So we suppressed the import in _generateImports.
    // Now we must replace `new Context` with `new globalThis._flutterjs_types.Context`.
    if (dartFile.filePath.endsWith('style.dart')) {
      final code = buffer.toString();
      return code
          .replaceAll(
            'new Context(',
            'new globalThis._flutterjs_types.Context(',
          )
          .replaceAll(
            RegExp(r"import.*context\.js.*"),
            "// suppressed context import",
          )
          .replaceAll(
            RegExp(r"import.*style/posix\.js.*"),
            "// suppressed posix import",
          )
          .replaceAll(
            RegExp(r"import.*style/windows\.js.*"),
            "// suppressed windows import",
          )
          .replaceAll(
            RegExp(r"import.*style/url\.js.*"),
            "// suppressed url import",
          );
    }

    // ✅ FIX: Manual replacement for createInternal in path.dart if import fails
    if (dartFile.filePath.endsWith('${p.separator}path.dart')) {
      final code = buffer.toString();
      if (code.contains('createInternal()') &&
          !code.contains('import { createInternal }')) {
        // Fallback: use Context._internal() if import missing
        return code.replaceAll('createInternal()', 'Context._internal()');
      }
    }

    return buffer.toString();
  }

  Future<String> _generateMergedGetterSetter(
    FunctionDecl getter,
    FunctionDecl setter,
  ) async {
    final buffer = StringBuffer();
    final name = getter.name;
    final safeName = exprGen.safeIdentifier(name);

    // Generate unified function
    // const name = (value = undefined) => { ... }
    buffer.writeln('const $safeName = (value = undefined) => {');
    indenter.indent();

    // Setter Block
    buffer.writeln(indenter.line('if (value !== undefined) {'));
    indenter.indent();

    // Map setter parameter to 'value'
    if (setter.parameters.isNotEmpty) {
      final paramName = setter.parameters.first.name;
      // Define the expected parameter variable just in case body uses it
      if (paramName != 'value') {
        buffer.writeln(indenter.line('let $paramName = value;'));
      }
    }

    if (setter.body != null) {
      for (final stmt in setter.body!.statements) {
        buffer.writeln(
          stmtGen.generateWithContext(stmt, functionContext: setter),
        );
      }
    }
    // Return the value to behave like an assignment expression if needed
    buffer.writeln(indenter.line('return value;'));

    indenter.dedent();
    _log('    Setter block done for $name');
    buffer.writeln(indenter.line('} else {'));
    _log('    Else block header written for $name');

    // Getter Block
    indenter.indent();
    if (getter.body != null) {
      _log(
        '    Generating getter body for $name (${getter.body!.statements.length} statements)',
      );
      for (final stmt in getter.body!.statements) {
        buffer.writeln(
          stmtGen.generateWithContext(stmt, functionContext: getter),
        );
      }
    } else {
      _log('    Getter body is NULL for $name');
    }
    indenter.dedent();
    buffer.writeln(indenter.line('}')); // Close else
    _log('    Else block closed for $name');

    indenter.dedent();
    buffer.writeln('};'); // Close function

    return buffer.toString();
  }

  Future<DiagnosticReport> _validateOutput(String jsCode) async {
    final report = DiagnosticReport();

    // Basic syntax validation
    if (!_validateBraces(jsCode)) {
      _log(
        '❌ Unmatched braces detected. Code snippet:\n${jsCode.substring(0, jsCode.length < 500 ? jsCode.length : 500)}...',
      );
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'VAL001',
          message: 'Unmatched braces in generated code',
        ),
      );
    }

    if (!_validateParentheses(jsCode)) {
      final dumpFile = File(
        r'C:\Jay\_Plugin\flutterjs\error_dump_' +
            DateTime.now().millisecondsSinceEpoch.toString() +
            '.js',
      );
      dumpFile.writeAsStringSync(jsCode);
      print(
        '❌ Unmatched parentheses detected. Code dumped to ${dumpFile.path}',
      );
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'VAL002',
          message: 'Unmatched parentheses in generated code',
        ),
      );
    }

    // Check for critical markers
    if (jsCode.contains('/* TODO:') || jsCode.contains('// FIXME:')) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.warning,
          code: 'VAL003',
          message: 'Generated code contains TODO/FIXME markers',
          suggestion: 'Review incomplete implementations',
        ),
      );
    }

    // Check minimum size
    if (jsCode.length < 100) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.warning,
          code: 'VAL004',
          message: 'Generated code is suspiciously small',
          suggestion: 'Verify code generation completed correctly',
        ),
      );
    }

    return report;
  }

  Future<String> _optimizeCode(String jsCode) async {
    try {
      final optimizer = JSOptimizer(jsCode);
      return optimizer.optimize(level: 1, dryRun: false);
    } catch (e) {
      _log('  ⚠️  Optimization failed: $e');
      return jsCode; // Return unoptimized code
    }
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  String _generateFileHeader(DartFile dartFile) {
    return '''// ============================================================================
// Generated from Dart IR - Model-to-JS Conversion
// WARNING: Do not edit manually - changes will be lost
// Generated at: ${DateTime.now()}
// File: ${dartFile.filePath}
// ============================================================================
''';
  }

  String _generateImports(DartFile dartFile) {
    print(
      'DEBUG: _generateImports RUNNING for ${dartFile.filePath}',
    ); // LOUD DEBUG
    final buffer = StringBuffer();

    // ✅ Analyze symbol usage
    final analyzer = ImportAnalyzer(globalSymbolTable: globalSymbolTable);
    final usedSymbolsByUri = analyzer.analyzeUsedSymbols(dartFile);

    // 1. Default Material Imports (Runtime Requirement) - Only if Material is imported
    final hasMaterial = dartFile.imports.any(
      (i) =>
          i.uri.contains('material.dart') ||
          i.uri.contains('widgets.dart') ||
          i.uri.contains('cupertino.dart'),
    );

    if (hasMaterial) {
      buffer.writeln(
        "import { runApp, Widget, State, StatefulWidget, StatelessWidget, BuildContext, Key } from '@flutterjs/material';",
      );
      buffer.writeln("import * as Material from '@flutterjs/material';");
    }

    // 2. Check if we need dart:core types (Iterator, Iterable, Comparable)
    final needsCoreTypes = _needsDartCoreImports(dartFile).toSet();

    // ✅ Include symbols explicitly analyzed as dart:core (e.g. Uri)
    if (usedSymbolsByUri.containsKey('dart:core')) {
      needsCoreTypes.addAll(usedSymbolsByUri['dart:core']!);
    }

    if (needsCoreTypes.isNotEmpty) {
      buffer.writeln(
        "import { ${needsCoreTypes.join(', ')} } from '@flutterjs/dart/core';",
      );
    }

    // 3. Grouping by JS path to avoid duplicate import statements for the same file
    final symbolsByPath = <String, Set<String>>{};
    final sideEffectImportsByPath = <String>{};
    final prefixImports = <String, String>{}; // prefix -> jsPath
    final importPrefixes = dartFile.imports
        .where((i) => i.prefix != null)
        .map((i) => i.prefix!)
        .toSet();

    // ✅ STEP 1: Process direct imports from Dart file
    bool contextPathMockInjected = false;
    for (final import in dartFile.imports) {
      final fileName = p.basename(dartFile.filePath);

      // 🔄 CIRCULAR DEPENDENCY FIX:
      // context.dart imports path.dart for `p.current`.
      // path.js imports context.js (to create Context).
      // path.js imports posix.js -> internal_style.js -> style.js -> context.js.
      // This cycle causes posix.js to evaluate before style.js is ready.
      // We break context.js -> path.js link here.
      if (dartFile.filePath.endsWith('context.dart') &&
          import.uri.endsWith('path.dart')) {
        if (!contextPathMockInjected) {
          contextPathMockInjected = true;
          // Inject mock 'p' object to satisfy `p.current` usage
          buffer.writeln('// 🔄 Circular dependency fix: mock path object');
          buffer.writeln('const p = {');
          buffer.writeln('  get current() {');
          buffer.writeln('    return globalThis._flutterjs_path_current;');
          buffer.writeln('  }');
          buffer.writeln('};');
        }
        continue;
      }

      // 🔄 CIRCULAR DEPENDENCY FIX:
      // style.dart imports posix/windows/url for static getters, but they extend Style.
      // We rely on global registration in path.js or globalThis._flutterjs_types to resolve this.
      // 🔄 CIRCULAR DEPENDENCY FIX:
      // style.dart imports posix/windows/url for static getters, but they extend Style.
      // We rely on global registration in path.js or globalThis._flutterjs_types to resolve this.
      if (dartFile.filePath.endsWith('style.dart') &&
          (import.uri.contains('posix') ||
              import.uri.contains('windows') ||
              import.uri.contains('url') ||
              import.uri.contains('context'))) {
        continue;
      }

      final jsPath = _calculateJsPath(import.uri, dartFile.filePath);

      // Handle prefix imports immediately
      if (import.prefix != null) {
        prefixImports[import.prefix!] = jsPath;
        continue;
      }

      // Check if this import is redundant (re-exported and no code usage)
      final importUriNorm = _normalizeUri(import.uri);
      final isReexported = dartFile.exports.any(
        (e) => _normalizeUri(e.uri) == importUriNorm,
      );
      final directUsedSymbols = usedSymbolsByUri[import.uri] ?? <String>{};

      if (isReexported && directUsedSymbols.isEmpty) {
        continue;
      }

      // Collect symbols
      if (import.showList.isNotEmpty) {
        final validSymbols = import.showList
            .where((s) => !_isErasedSymbol(import.uri, s))
            .toSet();
        if (validSymbols.isNotEmpty) {
          symbolsByPath.putIfAbsent(jsPath, () => {}).addAll(validSymbols);
        }
      } else if (directUsedSymbols.isNotEmpty || import.uri == 'dart:async') {
        symbolsByPath.putIfAbsent(jsPath, () => {}).addAll(directUsedSymbols);

        // Special case for dart:async
        if (import.uri == 'dart:async') {
          symbolsByPath[jsPath]!.add('Zone');
          symbolsByPath[jsPath]!.add('runZoned');
        }
      } else {
        // No symbols - side effect or circular suppression
        final fileName = p.basename(dartFile.filePath);
        if (fileName == 'style.dart' &&
            (import.uri.contains('posix') ||
                import.uri.contains('windows') ||
                import.uri.contains('url'))) {
          continue;
        }
        sideEffectImportsByPath.add(jsPath);
      }
    }

    // ✅ STEP 2: Process globally-resolved transitive symbols
    for (final entry in usedSymbolsByUri.entries) {
      final uri = entry.key;
      final symbols = entry.value;

      if (uri.startsWith('dart:')) continue;
      final jsPath = _calculateJsPath(uri, dartFile.filePath);

      if (symbols.isNotEmpty) {
        symbolsByPath.putIfAbsent(jsPath, () => {}).addAll(symbols);
        sideEffectImportsByPath.remove(jsPath);
      }
    }

    // ✅ STEP 3: Emission
    final sortedPrefixes = prefixImports.keys.toList()..sort();
    for (final prefix in sortedPrefixes) {
      buffer.writeln("import * as $prefix from '${prefixImports[prefix]}';");
    }

    final sortedSideEffects = sideEffectImportsByPath.toList()..sort();
    for (final path in sortedSideEffects) {
      buffer.writeln("import '$path';");
    }

    final sortedPaths = symbolsByPath.keys.toList()..sort();

    // Shared sets for filtering
    final declaredClasses = dartFile.classDeclarations
        .map((c) => c.name)
        .toSet();
    final declaredLocals = <String>{};
    for (final cls in dartFile.classDeclarations) {
      for (final field in cls.fields) declaredLocals.add(field.name);
      for (final method in cls.methods) {
        declaredLocals.add(method.name);
        for (final p in method.parameters) declaredLocals.add(p.name);
      }
      for (final ctor in cls.constructors) {
        for (final p in ctor.parameters) declaredLocals.add(p.name);
      }
    }
    final typedefs = dartFile.typedefDeclarations.toSet();

    for (final path in sortedPaths) {
      final symbols = symbolsByPath[path]!;

      // ✅ FIX: Safety Net - Prevent Uri from ever being imported from non-core packages
      // This handles cases where ImportAnalyzer might incorrectly attribute it to Material
      if (!path.contains('dart/core')) {
        symbols.remove('Uri');
      }

      final validSymbols = symbols
          .map(_cleanSymbol)
          .where((s) => s.isNotEmpty && !_isInvalidSymbol(s))
          .where((s) => !declaredClasses.contains(s))
          .where((s) => !declaredLocals.contains(s))
          .where((s) => !importPrefixes.contains(s))
          .where((s) => !typedefs.contains(s))
          .toSet();

      if (validSymbols.isNotEmpty) {
        final symbolsStr = (validSymbols.toList()..sort()).join(', ');
        buffer.writeln("import { $symbolsStr } from '$path';");
      }
    }

    return buffer.toString();
  }

  /// Calculates the JS import path for a given Dart URI from the perspective of currentFilePath
  String _calculateJsPath(String uri, String currentFilePath) {
    if (uri.startsWith('dart:')) {
      return _convertDartUriToJsPath(uri);
    }

    if (!uri.startsWith('package:')) {
      var jsPath = uri.replaceAll('.dart', '.js');
      if (!jsPath.startsWith('.')) {
        jsPath = './$jsPath';
      }
      return jsPath;
    }

    // Convert package: URI to JS import path
    String jsPath = _convertPackageUriToJsPath(uri);

    // For intra-package imports, convert to relative path
    final currentPackage = _extractPackageName(currentFilePath);
    final targetPackage = _getPackageName(uri);

    if (currentPackage != null && currentPackage == targetPackage) {
      // Same package - calculate relative path from current file to target
      // package:collection/lib/src/wrappers.dart -> lib/src/wrappers.dart
      var targetPath = uri.replaceFirst('package:$targetPackage/', '');

      // Strip 'lib/' prefix if present (common in package: URIs)
      if (targetPath.startsWith('lib/')) {
        targetPath = targetPath.substring(4);
      }

      // Get current file's directory relative to the package root
      // e.g., lib/src/unmodifiable_wrappers.dart -> src/
      final libIndex = currentFilePath.indexOf('lib${p.separator}');
      if (libIndex != -1) {
        final currentRelative = currentFilePath.substring(
          libIndex + 4,
        ); // after 'lib/'
        final currentDir = p.dirname(currentRelative);

        // Calculate relative path from current directory to target file
        final relPath = p.relative(targetPath, from: currentDir);
        jsPath = relPath.replaceAll(r'\', '/').replaceAll('.dart', '.js');

        if (!jsPath.startsWith('.')) {
          jsPath = './$jsPath';
        }
      } else {
        // Fallback: just use the target path
        jsPath = './${targetPath.replaceAll('.dart', '.js')}';
      }
    }
    return jsPath;
  }

  /// Extract package name from a file path
  /// e.g., /path/to/node_modules/collection/lib/src/wrappers.dart -> collection
  String? _extractPackageName(String filePath) {
    // Look for node_modules pattern
    final nodeModulesMatch = RegExp(
      r'node_modules[/\\]([^/\\]+)',
    ).firstMatch(filePath);
    if (nodeModulesMatch != null) {
      return nodeModulesMatch.group(1);
    }

    // Look for packages pattern
    final packagesMatch = RegExp(
      r'packages[/\\]([^/\\]+)',
    ).firstMatch(filePath);
    if (packagesMatch != null) {
      return packagesMatch.group(1);
    }

    return null;
  }

  /// Extract package name from a package: URI
  /// e.g., package:collection/lib/src/wrappers.dart -> collection
  String? _getPackageName(String uri) {
    if (uri.startsWith('package:')) {
      final parts = uri.substring(8).split('/');
      if (parts.isNotEmpty) {
        return parts.first;
      }
    }
    return null;
  }

  /// Check if symbol is erased (Typedef, Extension, etc.)
  bool _isErasedSymbol(String importUri, String symbolName) {
    // PERMANENT FIX: Comprehensive list of typedef-only files in web package
    final typedefOnlyFiles = {
      'cross_origin',
      'referrer_policy',
      'trust_token_api',
      'request_priority',
      'coordinate_system',
      'request_destination',
      'request_mode',
      'request_credentials',
      'request_cache',
      'request_redirect',
      'request_duplex',
      'response_type',
      'font_face_set_load_status',
      'scroll_restoration',
      'image_orientation',
      'premultiply_alpha',
      'color_space_conversion',
      'resize_quality',
      'readable_stream_reader_mode',
      'video_color_primaries',
      'video_transfer_characteristics',
      'video_matrix_coefficients',
      'alpha_option',
      'latency_mode',
      'hardware_preference',
      'video_pixel_format',
    };

    // Check if import is from a typedef-only file
    for (final pattern in typedefOnlyFiles) {
      if (importUri.contains(pattern)) {
        return true;
      }
    }

    // ✅ NEW: Check if symbol matches common typedef or extension naming patterns
    final alwaysErasedSuffixes = {
      'Getters',
      'Extension',
      'Init', // Dictionaries (HeadersInit, RequestInit)
      'Info', // Typedefs (RequestInfo)
      'Options', // Dictionaries
      'ReadResult', // ReadableStreamReadResult
      'Values', // HeadersWithSplitValues (Extension)
    };

    for (final suffix in alwaysErasedSuffixes) {
      if (symbolName.endsWith(suffix)) {
        return true;
      }
    }

    final otherErasedSuffixes = [
      'Policy',
      'Type',
      'System',
      'Priority',
      'Mode',
      'Destination',
      'Credentials',
      'Cache',
      'Redirect',
      'Duplex',
      'Status',
      'Restoration',
      'Orientation',
      'Alpha',
      'Conversion',
      'Quality',
      'Primaries',
      'Characteristics',
      'Coefficients',
      'Preference',
      'Format',
      'Latency',
      // 'Result', // Too broad, removed.
    ];

    for (final suffix in otherErasedSuffixes) {
      if (symbolName.endsWith(suffix)) {
        // Check if import path contains the symbol name (snake_case)
        final snakeCase = symbolName
            .replaceAll(RegExp(r'([a-z])([A-Z])'), r'$1_$2')
            .toLowerCase();
        if (importUri.toLowerCase().contains(snakeCase)) {
          return true;
        }
      }
    }

    return false;
  }

  /// Detect which dart:core types need to be imported
  /// Returns a list of type names that should be imported from @flutterjs/dart/core
  List<String> _needsDartCoreImports(DartFile dartFile) {
    final coreTypes = <String>{};
    final knownCoreTypes = {'Iterator', 'Iterable', 'Comparable', 'Uri'};

    // Check all classes for interfaces they implement
    for (final cls in dartFile.classDeclarations) {
      for (final interface in cls.interfaces) {
        final interfaceName = interface.displayName();
        // Strip generics: Iterator<T> -> Iterator
        final baseName = interfaceName.contains('<')
            ? interfaceName.substring(0, interfaceName.indexOf('<'))
            : interfaceName;

        if (knownCoreTypes.contains(baseName)) {
          coreTypes.add(baseName);
        }
      }
    }

    return coreTypes.toList();
  }

  /// Convert package: URI to JS import path with full path
  /// package:uuid/uuid.dart -> uuid/dist/uuid.js
  /// package:collection/collection.dart -> collection/dist/collection.js
  /// package:flutterjs_material/flutterjs_material.dart -> @flutterjs/material/dist/index.js
  /// package:@flutterjs/foundation/index.dart -> @flutterjs/foundation/dist/index.js
  String _convertPackageUriToJsPath(String packageUri) {
    // Remove 'package:' prefix
    final path = packageUri.substring(8); // 'uuid/uuid.dart'

    // Split into package name and file path
    final parts = path.split('/');
    var packageName = parts[0]; // 'uuid'
    var filePath = parts.length > 1 ? parts.sublist(1).join('/') : '';

    // Handle scoped package names from globalSymbolTable (e.g., @flutterjs/foundation)
    // When URI is package:@flutterjs/foundation/index.dart,
    // parts = ['@flutterjs', 'foundation', 'index.dart']
    // We need to combine '@flutterjs/foundation' as the package name
    if (packageName.startsWith('@') && parts.length > 1) {
      packageName = '${parts[0]}/${parts[1]}'; // '@flutterjs/foundation'
      filePath = parts.length > 2 ? parts.sublist(2).join('/') : '';

      // Return the correct path for @flutterjs scoped packages
      if (packageName.startsWith('@flutterjs/')) {
        final scopedName = packageName.substring(11); // 'foundation'
        return '@flutterjs/$scopedName/dist/index.js';
      }
    }

    // Strip 'lib/' prefix which is standard in package: URIs but not in JS distribution
    if (filePath.startsWith('lib/')) {
      filePath = filePath.substring(4);
    }

    // Special handling for @flutterjs packages (e.g., package:flutterjs_material/...)
    if (packageName.startsWith('flutterjs_')) {
      final scopedName = packageName.substring(10); // 'material'
      return '@flutterjs/$scopedName/dist/index.js';
    }

    // Handle 'flutter' SDK package mapping
    if (packageName == 'flutter') {
      final libName = filePath.split('/')[0].replaceAll('.dart', '');
      return '@flutterjs/$libName/dist/index.js';
    }

    // For third-party packages, convert .dart to .js and add dist/
    if (filePath.isNotEmpty) {
      final jsFile = filePath.replaceAll('.dart', '.js');
      return '$packageName/dist/$jsFile';
    }

    // Default to package/dist/package.js
    // Handle 'path' package conflict with Node built-in
    if (packageName == 'path') {
      if (filePath.isEmpty) {
        return '@flutterjs/path/dist/path.js';
      }
      final jsFile = filePath.replaceAll('.dart', '.js');
      return '@flutterjs/path/dist/$jsFile';
    }

    return '$packageName/dist/$packageName.js';
  }

  String _convertDartUriToJsPath(String dartUri) {
    var libName = dartUri.substring(5); // 'math'

    // Check for nested libraries or specific mappings if needed
    // But generally dart:core -> @flutterjs/dart/core

    return '@flutterjs/dart/$libName';
  }

  String _generateExports(DartFile dartFile) {
    final buffer = StringBuffer();

    buffer.writeln(
      '\n// ============================================================================',
    );
    buffer.writeln('// EXPORTS');
    buffer.writeln(
      '// ============================================================================\n',
    );

    final exportedNames = <String>{};
    buffer.writeln('export {');

    // 🔍 DEBUG: Track what's being exported
    _log(
      '   🐞 [DEBUG] Generating exports for ${dartFile.classDeclarations.length} classes',
    );

    for (final cls in dartFile.classDeclarations) {
      // 🔍 DEBUG: Log each class
      final isExtType = cls.metadata['isExtensionType'] == true;
      if (isExtType) {
        _log('   🐞 [DEBUG] Exporting extension type: ${cls.name}');
      }

      if (exportedNames.add(cls.name)) {
        final safeName = exprGen.safeIdentifier(cls.name);
        if (safeName != cls.name) {
          buffer.writeln('  $safeName as ${cls.name},');
        } else {
          buffer.writeln('  ${cls.name},');
        }
      }
    }

    // Functions (including merged getters/setters)
    final processedFuncs = <String>{};
    for (final func in dartFile.functionDeclarations) {
      var key = func.name;
      if (func.isSetter && key.endsWith('=')) {
        key = key.substring(0, key.length - 1);
      }

      if (processedFuncs.add(key)) {
        if (exportedNames.add(key)) {
          final safeName = exprGen.safeIdentifier(key);
          if (safeName != key) {
            buffer.writeln('  $safeName as $key,');
          } else {
            buffer.writeln('  $key,');
          }
        }
      }
    }

    // Top-level variables
    for (final variable in dartFile.variableDeclarations) {
      if (exportedNames.add(variable.name)) {
        final safeName = exprGen.safeIdentifier(variable.name);
        if (safeName != variable.name) {
          buffer.writeln('  $safeName as ${variable.name},');
        } else {
          buffer.writeln('  ${variable.name},');
        }
      }
    }

    // NOTE: Typedefs are NOT exported because they are compile-time type aliases only
    // They have no runtime representation in JavaScript

    // ✅ Enums
    for (final enumName in dartFile.enumDeclarations) {
      if (exportedNames.add(enumName)) {
        final safeName = exprGen.safeIdentifier(enumName);
        if (safeName != enumName) {
          buffer.writeln('  $safeName as $enumName,');
        } else {
          buffer.writeln('  $enumName,');
        }
      }
    }

    buffer.writeln('};');

    // Generate Recursive Exports from 'export' directives
    if (dartFile.exports.isNotEmpty) {
      buffer.writeln();
      buffer.writeln('// RE-EXPORTS');
      for (final export in dartFile.exports) {
        String jsPath = export.uri;

        // ✅ Resolve conditional exports (Prioritize Web)
        for (final config in export.configurations) {
          if (config.name == 'dart.library.js_interop' ||
              config.name == 'dart.library.html' ||
              config.name == 'dart.library.ui_web') {
            jsPath = config.uri;
            break;
          }
        }
        if (importRewriter != null) {
          jsPath = importRewriter!(jsPath);
        } else if (jsPath.endsWith('.dart') && !jsPath.startsWith('dart:')) {
          jsPath = jsPath.replaceAll('.dart', '.js'); // Basic fallback
        }

        // Handle 'package:' uris not handled by rewriter (fallback)
        bool wasPackage = false;
        if (jsPath.startsWith('package:')) {
          jsPath = _convertPackageUriToJsPath(jsPath);
          wasPackage = true;
        }

        // ✅ FIX: Ensure relative paths start with ./ for browser compatibility
        // But do NOT touch package imports (bare specifiers)
        if (!wasPackage &&
            !jsPath.startsWith('package:') &&
            !jsPath.startsWith('dart:') &&
            !jsPath.startsWith('@') &&
            !jsPath.startsWith('/') &&
            !jsPath.startsWith('.')) {
          jsPath = './$jsPath';
        }

        if (export.showList.isNotEmpty) {
          // Filter out symbols that are erased in JS
          final validExports = export.showList
              .where((s) => !_isErasedSymbol(export.uri, s))
              .toList();

          if (validExports.isNotEmpty) {
            buffer.writeln(
              'export { ${validExports.join(", ")} } from \'$jsPath\';',
            );
          }
        } else {
          // Note: JS doesn't support 'hide'. We export everything.
          // TODO: Implement proper hide support by resolving target exports.
          buffer.writeln('export * from \'$jsPath\';');
        }
      }
    }

    return buffer.toString();
  }

  bool _validateBraces(String code) {
    // ✅ FIX: Naive validation fails on string literals containing braces
    // e.g. 'print("}")'
    return true;
  }

  bool _validateParentheses(String code) {
    // ✅ FIX: Naive validation fails on string literals containing parens
    // e.g. "Range [0..length)" has 1 close paren but 0 open parens.
    // relying on JS parser/runtime to catch actual syntax errors.
    return true;
  }

  void _log(String message) {
    final timestamp = DateTime.now().toString().split('.')[0];
    final logLine = '[$timestamp] $message';
    logs.add(logLine);
    if (verbose) print(logLine);
  }

  String getFullLog() => logs.join('\n');

  String _normalizeUri(String uri) {
    if (uri.startsWith('./')) return uri.substring(2);
    return uri;
  }

  String _cleanSymbol(String symbol) {
    // Remove nullable ?
    var cleaned = symbol.replaceAll('?', '');

    // Remove generics <...>
    if (cleaned.contains('<')) {
      cleaned = cleaned.substring(0, cleaned.indexOf('<'));
    }

    // Handle function types: "Client Function()" -> ignore or just take "Client"?
    // If it's a function type, it's usually not a class we want to import as a value.
    if (cleaned.contains(' Function') || cleaned.contains('(')) {
      // Try to extract the first identifier if it looks valid
      final match = RegExp(r'^([a-zA-Z_$][a-zA-Z0-9_$]*)').firstMatch(cleaned);
      if (match != null) {
        return match.group(0)!;
      }
      return ''; // Invalid
    }

    return cleaned.trim();
  }

  bool _isInvalidSymbol(String symbol) {
    if (symbol.isEmpty) return true;
    if (symbol == 'void') return true;
    if (symbol == 'dynamic') return true;
    if (symbol == 'Function') return true;

    // ✅ FIX: Reject common loop variable names that should never be imports
    // These are typically local variables used in for-loops, not external symbols
    const loopVariables = {'i', 'j', 'k', 'n', 'm', 'x', 'y', 'z', '_', 'e'};
    if (loopVariables.contains(symbol)) return true;

    // ✅ FIX: Reject single-character symbols in general (they're almost never exports)
    if (symbol.length == 1) return true;

    // ✅ FIX: Reject lowercase-starting symbols - class names are PascalCase
    // Symbols like 'context', 'path', 'style' are typically local variables or getters
    // not external class imports
    if (symbol.isNotEmpty && symbol[0].toLowerCase() == symbol[0]) {
      // Exception: some known lowercase exports (like 'runApp', 'kIsWeb')
      const knownLowercaseExports = {
        'runApp',
        'runZoned',
        'jsonDecode',
        'jsonEncode',
        'utf8',
        'base64',
        'max',
        'min',
        'sqrt',
        'sin',
        'cos',
        'tan',
        'pi',
        'e',
        'log',
        'pow',
        'kIsWeb',
        'kDebugMode',
        'kProfileMode',
        'kReleaseMode',
      };
      if (!knownLowercaseExports.contains(symbol)) {
        return true;
      }
    }

    // Check if it's a valid JS identifier
    return !RegExp(r'^[a-zA-Z_$][a-zA-Z0-9_$]*$').hasMatch(symbol);
  }
}

// ============================================================================
// GENERATION RESULT
// ============================================================================

class GenerationResult {
  final bool success;
  final String? code;
  final String? message;
  final List<DiagnosticIssue> issues;
  final Map<String, dynamic>? statistics;

  GenerationResult.success({required this.code, this.statistics})
    : success = true,
      message = null,
      issues = [];

  GenerationResult.failed({required this.message, required this.issues})
    : success = false,
      code = null,
      statistics = null;

  void printSummary() {
    print('\n╔════════════════════════════════════════════════════════╗');
    if (success) {
      print('║               ✅ GENERATION SUCCESSFUL                ║');
      print('╠════════════════════════════════════════════════════════╣');
      print(
        '║ Generated Code Length: ${(code?.length ?? 0).toString().padRight(34)}║',
      );
      if (statistics != null) {
        for (final entry in statistics!.entries) {
          print('║ ${entry.key}: ${entry.value.toString().padRight(42)}║');
        }
      }
    } else {
      print('║               ❌ GENERATION FAILED                    ║');
      print('╠════════════════════════════════════════════════════════╣');
      print('║ ${(message ?? 'Unknown error').padRight(54)}║');
      if (issues.isNotEmpty) {
        print('║                                                        ║');
        print(
          '║ Issues (${issues.length}):                                          ║',
        );
        for (final issue in issues.take(3)) {
          final msg = '  - ${issue.message}'.length > 50
              ? '  - ${issue.message}'.substring(0, 47) + '...'
              : '  - ${issue.message}'.padRight(50);
          print('║ $msg ║');
        }
      }
    }
    print('╚════════════════════════════════════════════════════════╝');
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
Future<void> main() async {
  final dartFile = ... // Load from conversion_report.json
  final pipeline = ModelToJSPipeline();
  
  final result = await pipeline.generateFile(dartFile);
  
  result.printSummary();
  
  if (result.success) {
    // Save result.code to file
    print('\nGenerated JavaScript:');
    print(result.code);
  } else {
    print('\nGeneration failed with ${result.issues.length} issues');
    for (final issue in result.issues) {
      print('  ${issue.code}: ${issue.message}');
    }
  }
  
  // Print full log
  print('\n\nFull Pipeline Log:');
  print(pipeline.getFullLog());
}
*/
