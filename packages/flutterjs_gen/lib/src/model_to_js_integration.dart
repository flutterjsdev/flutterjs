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

  ModelToJSPipeline({this.importRewriter, this.verbose = false}) {
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
    final buffer = StringBuffer();

    // ✅ NEW: Analyze symbol usage
    final analyzer = ImportAnalyzer();
    final usedSymbols = analyzer.analyzeUsedSymbols(dartFile);

    // Default Material Imports (Runtime Requirement) - Only if Material is imported
    final hasMaterial = dartFile.imports.any(
      (i) =>
          i.uri.contains('material.dart') ||
          i.uri.contains('widgets.dart') ||
          i.uri.contains('cupertino.dart'),
    );

    if (hasMaterial) {
      buffer.writeln('import {');
      buffer.writeln('  runApp,');
      buffer.writeln('  Widget,');
      buffer.writeln('  State,');
      buffer.writeln('  StatefulWidget,');
      buffer.writeln('  StatelessWidget,');
      buffer.writeln('  BuildContext,');
      buffer.writeln('  Key,');
      buffer.writeln('} from \'@flutterjs/material\';');
      buffer.writeln('import * as Material from \'@flutterjs/material\';');
    }

    // Check if we need dart:core types (Iterator, Iterable, Comparable)
    // These are implicitly available in Dart but need explicit imports in JS
    final needsCoreTypes = _needsDartCoreImports(dartFile);
    if (needsCoreTypes.isNotEmpty) {
      buffer.writeln(
        'import { ${needsCoreTypes.join(", ")} } from \'@flutterjs/dart/core\';',
      );
    }

    // Collect all import prefixes to avoid naming conflicts
    final importPrefixes = dartFile.imports
        .map((i) => i.prefix)
        .where((p) => p != null)
        .toSet();

    // Generate imports with symbol analysis
    for (final import in dartFile.imports) {
      String importPath = import.uri;

      // ✅ Resolve conditional imports (Prioritize Web)
      for (final config in import.configurations) {
        if (config.name == 'dart.library.js_interop' ||
            config.name == 'dart.library.html' ||
            config.name == 'dart.library.ui_web') {
          importPath = config.uri;
          break;
        }
      }

      // Convert package: URI to JS import path
      bool wasPackage = false;
      if (importPath.startsWith('package:')) {
        importPath = _convertPackageUriToJsPath(importPath);
        wasPackage = true;
      } else if (importPath.startsWith('dart:')) {
        importPath = _convertDartUriToJsPath(importPath);
      } else if (importRewriter != null) {
        importPath = importRewriter!(importPath);
      }

      // ✅ FIX: Ensure relative paths start with ./ for browser compatibility
      if (!wasPackage &&
          !importPath.startsWith('package:') &&
          !importPath.startsWith('dart:') &&
          !importPath.startsWith('@') &&
          !importPath.startsWith('/') &&
          !importPath.startsWith('.')) {
        importPath = './$importPath';
      }

      // Get symbols used from this import
      final symbols = usedSymbols[import.uri] ?? <String>{};

      // ✅ FORCE: Ensure Zone and runZoned are present for dart:async
      // These are used in zoneClient which contains raw strings the analyzer misses.
      final isAsync =
          import.uri == 'dart:async' ||
          importPath.contains('async/index.js') ||
          importPath.contains('@flutterjs/dart/async');

      if (isAsync) {
        symbols.add('Zone');
        symbols.add('runZoned');
      }

      // ✅ NEW: Check if this import is redundant (re-exported and no code usage)
      final importUriNorm = _normalizeUri(import.uri);
      final isReexported = dartFile.exports.any(
        (e) => _normalizeUri(e.uri) == importUriNorm,
      );
      if (isReexported && symbols.isEmpty && import.prefix == null) {
        continue;
      }

      // Generate import statement
      if (import.prefix != null) {
        buffer.writeln('import * as ${import.prefix} from \'$importPath\';');
      } else if (import.showList.isNotEmpty) {
        // Explicit show list takes precedence
        buffer.writeln(
          'import { ${import.showList.join(", ")} } from \'$importPath\';',
        );
      } else if (symbols.isNotEmpty) {
        // ✅ FIX: Clean symbols to remove Dart syntax (Client?, List<T>)
        // AND ensure we don't import symbols that conflict with local class names OR prefixes
        final declaredClasses = dartFile.classDeclarations
            .map((c) => c.name)
            .toSet();
        
        // ✅ FIX: Also collect all class field names - these are local, not imports
        final declaredFields = <String>{};
        for (final cls in dartFile.classDeclarations) {
          for (final field in cls.fields) {
            declaredFields.add(field.name);
          }
          // Also add method names to avoid importing them
          for (final method in cls.methods) {
            declaredFields.add(method.name);
            // ✅ FIX: Also add method parameter names - they're local, not imports
            for (final param in method.parameters) {
              declaredFields.add(param.name);
            }
          }
          // ✅ FIX: Also add constructor parameter names
          for (final ctor in cls.constructors) {
            for (final param in ctor.parameters) {
              declaredFields.add(param.name);
            }
          }
        }

        final validSymbols = symbols
            .map(_cleanSymbol)
            .where((s) => s.isNotEmpty && !_isInvalidSymbol(s))
            .where((s) => !declaredClasses.contains(s))
            .where((s) => !declaredFields.contains(s)) // ✅ FIX: Exclude class fields
            .where((s) => !importPrefixes.contains(s)) // ✅ FIX: Avoid conflict with prefixes
            .toSet();

        // ✅ FORCE: Ensure Zone and runZoned are present for dart:async
        if (import.uri == 'dart:async') {
          validSymbols.add('Zone');
          validSymbols.add('runZoned');
        }

        if (validSymbols.isNotEmpty) {
          final symbolsStr = validSymbols.join(', ');
          buffer.writeln('import { $symbolsStr } from \'$importPath\';');
        }
      } else {
        // Side-effect only import (rare)
        buffer.writeln('import \'$importPath\';');
      }
    }

    return buffer.toString();
  }

  /// Detect which dart:core types need to be imported
  /// Returns a list of type names that should be imported from @flutterjs/dart/core
  List<String> _needsDartCoreImports(DartFile dartFile) {
    final coreTypes = <String>{};
    final knownCoreTypes = {'Iterator', 'Iterable', 'Comparable'};

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
  String _convertPackageUriToJsPath(String packageUri) {
    // Remove 'package:' prefix
    final path = packageUri.substring(8); // 'uuid/uuid.dart'

    // Split into package name and file path
    final parts = path.split('/');
    final packageName = parts[0]; // 'uuid'
    final filePath = parts.length > 1 ? parts.sublist(1).join('/') : '';

    // Special handling for @flutterjs packages
    if (packageName.startsWith('flutterjs_')) {
      final scopedName = packageName.substring(10); // 'material'
      return '@flutterjs/$scopedName/dist/index.js';
    }

    // Handle 'flutter' SDK package mapping
    if (packageName == 'flutter') {
      final libName = filePath.split('/')[0].replaceAll('.dart', '');
      return '@flutterjs/$libName/src/index.js';
    }

    // For third-party packages, convert .dart to .js and add dist/
    if (filePath.isNotEmpty) {
      final jsFile = filePath.replaceAll('.dart', '.js');
      return '$packageName/dist/$jsFile';
    }

    // Default to package/dist/package.js
    return '$packageName/dist/$packageName.js';
  }

  String _convertDartUriToJsPath(String dartUri) {
    final libName = dartUri.substring(5); // 'math'
    return '@flutterjs/dart/dist/$libName/index.js';
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

    for (final cls in dartFile.classDeclarations) {
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
          buffer.writeln(
            'export { ${export.showList.join(", ")} } from \'$jsPath\';',
          );
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
    int count = 0;
    for (final char in code.split('')) {
      if (char == '{') count++;
      if (char == '}') count--;
      if (count < 0) return false;
    }
    return count == 0;
  }

  bool _validateParentheses(String code) {
    int count = 0;
    for (final char in code.split('')) {
      if (char == '(') count++;
      if (char == ')') count--;
      if (count < 0) return false;
    }
    return count == 0;
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
