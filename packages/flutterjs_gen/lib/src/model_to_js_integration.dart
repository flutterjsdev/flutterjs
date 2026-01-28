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

  final List<String> logs = [];
  final List<DiagnosticIssue> issues = [];

  // Optional callback to rewrite import URIs (e.g. package: -> relative path)
  final String Function(String uri)? importRewriter;

  ModelToJSPipeline({this.importRewriter}) {
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
    for (final func in dartFile.functionDeclarations) {
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

    // Generate exports
    buffer.writeln(_generateExports(dartFile));

    return buffer.toString();
  }

  Future<DiagnosticReport> _validateOutput(String jsCode) async {
    final report = DiagnosticReport();

    // Basic syntax validation
    if (!_validateBraces(jsCode)) {
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

    // Generate imports with symbol analysis
    for (final import in dartFile.imports) {
      String importPath = import.uri;

      // Convert package: URI to JS import path
      if (importPath.startsWith('package:')) {
        importPath = _convertPackageUriToJsPath(importPath);
      } else if (importPath.startsWith('dart:')) {
        importPath = _convertDartUriToJsPath(importPath);
      } else if (importRewriter != null) {
        importPath = importRewriter!(importPath);
      }

      // Get symbols used from this import
      final symbols = usedSymbols[import.uri] ?? {};

      // Generate import statement
      if (import.prefix != null) {
        buffer.writeln('import * as ${import.prefix} from \'$importPath\';');
      } else if (import.showList.isNotEmpty) {
        // Explicit show list takes precedence
        buffer.writeln(
          'import { ${import.showList.join(", ")} } from \'$importPath\';',
        );
      } else if (symbols.isNotEmpty) {
        // ✅ NEW: Use analyzed symbols
        buffer.writeln(
          'import { ${symbols.join(", ")} } from \'$importPath\';',
        );
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

    // For third-party packages, convert .dart to .js and add dist/
    if (filePath.isNotEmpty) {
      final jsFile = filePath.replaceAll('.dart', '.js');
      return '$packageName/dist/$jsFile';
    }

    // Default to package/dist/package.js
    return '$packageName/dist/$packageName.js';
  }

  /// Convert dart: URI to JS import path
  /// dart:math -> @flutterjs/dart/math/dist/math.js
  String _convertDartUriToJsPath(String dartUri) {
    final libName = dartUri.substring(5); // 'math'
    return '@flutterjs/dart/$libName/dist/$libName.js';
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
    buffer.writeln('export {');

    for (final cls in dartFile.classDeclarations) {
      buffer.writeln('  ${cls.name},');
    }

    for (final func in dartFile.functionDeclarations) {
      buffer.writeln('  ${func.name},');
    }

    buffer.writeln('};');

    // Generate Recursive Exports from 'export' directives
    if (dartFile.exports.isNotEmpty) {
      buffer.writeln();
      buffer.writeln('// RE-EXPORTS');
      for (final export in dartFile.exports) {
        String jsPath = export.uri;
        if (importRewriter != null) {
          jsPath = importRewriter!(jsPath);
        } else if (jsPath.endsWith('.dart') && !jsPath.startsWith('dart:')) {
          jsPath = jsPath.replaceAll('.dart', '.js'); // Basic fallback
        }

        // Handle 'package:' uris not handled by rewriter (fallback)
        if (jsPath.startsWith('package:')) {
          // If rewriter didn't handle it, we might be in trouble, but let's try to keep it valid JS string
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
    print(logLine);
  }

  String getFullLog() => logs.join('\n');
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
