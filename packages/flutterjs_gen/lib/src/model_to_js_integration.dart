// ============================================================================
// MODEL-TO-JS CODE GEN INTEGRATION LAYER
// ============================================================================
// Unified entry point for all code generation phases
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'package:flutterjs_gen/src/validation_optimization/js_optimizer.dart';
import 'package:flutterjs_gen/src/model_to_js_diagnostic.dart';

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

  ModelToJSPipeline() {
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
    stmtGen = StatementCodeGen();
    classGen = ClassCodeGen();
    funcGen = FunctionCodeGen();
    buildMethodGen = BuildMethodCodeGen();
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
      } catch (e,st) {
        _log('  ❌ Error generating class ${cls.name}: $e');
        issues.add(DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'GEN001',
          message: 'Failed to generate class ${cls.name}: $e',
          affectedNode: cls.name,
          stackTrace: st
        ));
      }
    }

    // Generate functions
    for (final func in dartFile.functionDeclarations) {
      try {
        _log('  Generating function: ${func.name}');
        buffer.writeln(funcGen.generate(func));
        buffer.writeln();
      } catch (e,st) {
        _log('  ❌ Error generating function ${func.name}: $e');
        issues.add(DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'GEN002',
          message: 'Failed to generate function ${func.name}: $e',
          affectedNode: func.name,
          stackTrace: st
        ));
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
      report.addIssue(DiagnosticIssue(
        severity: DiagnosticSeverity.error,
        code: 'VAL001',
        message: 'Unmatched braces in generated code',
       

      ));
    }

    if (!_validateParentheses(jsCode)) {
      report.addIssue(DiagnosticIssue(
        severity: DiagnosticSeverity.error,
        code: 'VAL002',
        message: 'Unmatched parentheses in generated code',
      ));
    }

    // Check for critical markers
    if (jsCode.contains('/* TODO:') || jsCode.contains('// FIXME:')) {
      report.addIssue(DiagnosticIssue(
        severity: DiagnosticSeverity.warning,
        code: 'VAL003',
        message: 'Generated code contains TODO/FIXME markers',
        suggestion: 'Review incomplete implementations',
      ));
    }

    // Check minimum size
    if (jsCode.length < 100) {
      report.addIssue(DiagnosticIssue(
        severity: DiagnosticSeverity.warning,
        code: 'VAL004',
        message: 'Generated code is suspiciously small',
        suggestion: 'Verify code generation completed correctly',
      ));
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

    buffer.writeln('import Flutter from \'flutter-js-framework\';');
    buffer.writeln('import {');
    buffer.writeln('  Widget,');
    buffer.writeln('  State,');
    buffer.writeln('  StatefulWidget,');
    buffer.writeln('  StatelessWidget,');
    buffer.writeln('  BuildContext,');
    buffer.writeln('} from \'flutter-js-framework/widgets\';');

    return buffer.toString();
  }

  String _generateExports(DartFile dartFile) {
    final buffer = StringBuffer();

    buffer.writeln('\n// ============================================================================');
    buffer.writeln('// EXPORTS');
    buffer.writeln('// ============================================================================\n');
    buffer.writeln('export {');

    for (final cls in dartFile.classDeclarations) {
      buffer.writeln('  ${cls.name},');
    }

    for (final func in dartFile.functionDeclarations) {
      buffer.writeln('  ${func.name},');
    }

    buffer.writeln('};');

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

  GenerationResult.success({
    required this.code,
    this.statistics,
  })  : success = true,
        message = null,
        issues = [];

  GenerationResult.failed({
    required this.message,
    required this.issues,
  })  : success = false,
        code = null,
        statistics = null;

  void printSummary() {
    print('\n╔════════════════════════════════════════════════════════╗');
    if (success) {
      print('║               ✅ GENERATION SUCCESSFUL                ║');
      print('╠════════════════════════════════════════════════════════╣');
      print('║ Generated Code Length: ${(code?.length ?? 0).toString().padRight(34)}║');
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
        print('║ Issues (${issues.length}):                                          ║');
        for (final issue in issues.take(3)) {
          final msg =
              '  - ${issue.message}'.length > 50
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