// ============================================================================
// PHASE 0 ORCHESTRATOR - Runs all analysis in sequence
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';

class Phase0Orchestrator {
  final DartFile dartFile;

  late ValidationReport validationReport;
  late TypeEnvironment typeEnvironment;
  late ScopeModel scopeModel;
  late JsControlFlowGraph controlFlowGraph;

  Phase0Orchestrator(this.dartFile);

  /// Execute complete Phase 0 analysis
  Phase0AnalysisResult execute({bool verbose = false}) {
    final stopwatch = Stopwatch()..start();

    if (verbose) {
      print('\n╔════════════════════════════════════════════════════╗');
      print('║        PHASE 0: PRE-ANALYSIS EXECUTION            ║');
      print('╚════════════════════════════════════════════════════╝\n');
    }

    // 0.1: IR Post-Deserialization Validator
    if (verbose) print('Step 1: Validating IR structure...');
    final validator = IRPostDeserializeValidator(dartFile);
    validationReport = validator.validate();

    if (!validationReport.canProceed) {
      if (verbose) print(validationReport.generateReport());
      stopwatch.stop();
      return Phase0AnalysisResult.failed(
        validationReport: validationReport,
        duration: stopwatch.elapsed,
      );
    }
    if (verbose) print('✓ IR validation passed\n');

    // 0.2: IR Type System Analyzer
    if (verbose) print('Step 2: Analyzing type system...');
    final typeAnalyzer = IRTypeSystemAnalyzer(dartFile);
    typeAnalyzer.analyze();
    typeEnvironment = typeAnalyzer.typeEnvironment;
    if (verbose)
      print(
        '✓ Type system analyzed (${typeEnvironment.typeTable.length} types)\n',
      );

    // 0.3: IR Scope & Binding Analyzer
    if (verbose) print('Step 3: Analyzing scope and bindings...');
    final scopeAnalyzer = IRScopeAnalyzer(dartFile);
    scopeAnalyzer.analyze();
    scopeModel = scopeAnalyzer.scopeModel;
    if (verbose) print('✓ Scope analysis completed\n');

    // 0.4: IR Control Flow Analyzer
    if (verbose) print('Step 4: Analyzing control flow...');
    final cfgAnalyzer = IRControlFlowAnalyzer(dartFile);
    cfgAnalyzer.analyze();
    controlFlowGraph = cfgAnalyzer.cfg;
    if (verbose) print('✓ Control flow analyzed\n');

    stopwatch.stop();

    if (verbose) {
      print(validationReport.generateReport());
      print(typeEnvironment.generateReport());
      print(scopeModel.generateReport());
      print(controlFlowGraph.generateReport());
    }

    return Phase0AnalysisResult.success(
      validationReport: validationReport,
      typeEnvironment: typeEnvironment,
      scopeModel: scopeModel,
      controlFlowGraph: controlFlowGraph,
      duration: stopwatch.elapsed,
    );
  }
}

/// Complete result of Phase 0 analysis
class Phase0AnalysisResult {
  final bool success;
  final ValidationReport? validationReport;
  final TypeEnvironment? typeEnvironment;
  final ScopeModel? scopeModel;
  final JsControlFlowGraph? controlFlowGraph;
  final Duration duration;
  final String? error;

  Phase0AnalysisResult.success({
    required this.validationReport,
    required this.typeEnvironment,
    required this.scopeModel,
    required this.controlFlowGraph,
    required this.duration,
  }) : success = true,
       error = null;

  Phase0AnalysisResult.failed({
    required this.validationReport,
    required this.duration,
    this.error,
  }) : success = false,
       typeEnvironment = null,
       scopeModel = null,
       controlFlowGraph = null;

  String generateSummary() {
    final buffer = StringBuffer();
    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║         PHASE 0 ANALYSIS SUMMARY                  ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

    buffer.writeln('Status: ${success ? '✓ SUCCESS' : '✗ FAILED'}');
    buffer.writeln('Duration: ${duration.inMilliseconds}ms\n');

    if (validationReport != null) {
      buffer.writeln('Validation:');
      buffer.writeln('  Issues: ${validationReport!.totalIssues}');
      buffer.writeln('  Fatal: ${validationReport!.fatalCount}');
      buffer.writeln('  Errors: ${validationReport!.errorCount}');
      buffer.writeln('  Warnings: ${validationReport!.warningCount}\n');
    }

    if (success && typeEnvironment != null) {
      buffer.writeln('Type System:');
      buffer.writeln('  Known types: ${typeEnvironment!.typeTable.length}\n');
    }

    if (success && scopeModel != null) {
      buffer.writeln('Scopes:');
      buffer.writeln('  Total scopes: ${scopeModel!.scopeMap.length}');
      buffer.writeln(
        '  Global bindings: ${scopeModel!.globalBindings.length}\n',
      );
    }

    if (success && controlFlowGraph != null) {
      buffer.writeln('Control Flow:');
      buffer.writeln('  Basic blocks: ${controlFlowGraph!.blocks.length}');
      buffer.writeln(
        '  Dead code statements: ${controlFlowGraph!.unreachableStatements.length}\n',
      );
    }

    if (error != null) {
      buffer.writeln('Error: $error\n');
    }

    return buffer.toString();
  }
}
