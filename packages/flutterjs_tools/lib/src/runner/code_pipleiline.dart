// ============================================================================
// INTEGRATED PIPELINE: Diagnostic → Integration → File Generation
// ============================================================================
// Connects all three components into a unified workflow
// ============================================================================

import 'dart:async';
import 'dart:io';
import 'package:path/path.dart' as path;
import 'package:flutterjs_tools/command.dart';

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'package:flutterjs_gen/src/file_generation/package_manifest.dart';

// ============================================================================
// UNIFIED PIPELINE ORCHESTRATOR
// ============================================================================

class UnifiedConversionPipeline {
  /// Phase 0: IR Validator
  late final ModelToJSDiagnosticEngine diagnosticEngine;

  /// Phases 1-3: Integration layer
  late final ModelToJSPipeline integrationPipeline;

  /// Phases 4-6: File generator
  late final FileCodeGen fileCodeGen;

  /// Package registry for import resolution
  late final PackageRegistry packageRegistry;

  /// Configuration
  final PipelineConfig config;

  /// Execution state
  final List<String> executionLog = [];
  final List<DiagnosticIssue> allIssues = [];

  UnifiedConversionPipeline({required this.config}) {
    // ✅ INITIALIZE ALL LATE FIELDS IN CONSTRUCTOR
    _initializeEngines();
  }

  void _initializeEngines() {
    try {
      diagnosticEngine = ModelToJSDiagnosticEngine();
      integrationPipeline = ModelToJSPipeline();

      // ✅ NEW: Initialize and load package registry
      packageRegistry = PackageRegistry();
      _loadPackageManifests();

      fileCodeGen = FileCodeGen(
        // Pass default generators - adjust based on your actual constructors
        exprCodeGen: ExpressionCodeGen(),
        stmtCodeGen: StatementCodeGen(),
        classCodeGen: ClassCodeGen(),
        funcCodeGen: FunctionCodeGen(),
        propConverter: FlutterPropConverter(),
        runtimeRequirements: RuntimeRequirements(),
        outputValidator: OutputValidator(''),
        jsOptimizer: JSOptimizer(''),
        packageRegistry: packageRegistry, // ✅ Pass loaded registry
      );

      _log('✅ Pipeline engines initialized');
    } catch (e) {
      _log('❌ Failed to initialize pipeline engines: $e');
      rethrow;
    }
  }

  void _loadPackageManifests() {
    try {
      // Manifests are in build/flutterjs/node_modules/@flutterjs/
      // This is where preparePackages() puts them
      final buildManifestPath = path.join(
        config.projectPath ?? Directory.current.path,
        'build',
        'flutterjs',
        'node_modules',
        '@flutterjs',
      );

      final dir = Directory(buildManifestPath);
      if (dir.existsSync()) {
        final absolutePath = path.absolute(buildManifestPath);
        _log('📦 Loading package manifests from: $absolutePath');
        packageRegistry.loadPackagesDirectory(buildManifestPath);
      } else {
        _log('⚠️  No manifests found at: $buildManifestPath');
        _log('   Make sure to run package preparation first');
      }
    } catch (e) {
      _log('⚠️  Failed to load package manifests: $e');
    }
  }

  // =========================================================================
  // MAIN EXECUTION PIPELINE
  // =========================================================================

  /// Execute the complete pipeline: Diagnostic → Integration → Generation
  Future<UnifiedPipelineResult> executeFullPipeline({
    required DartFile dartFile,
    required String outputPath,
    bool validate = true,
    bool optimize = false,
    int optimizationLevel = 1,
  }) async {
    final stopwatch = Stopwatch()..start();

    _log('═══ STARTING FULL PIPELINE ═══');
    _log('📁 Output path: $outputPath');
    _log('🔧 Optimize: $optimize (level $optimizationLevel)');
    _log('✔️  Validate: $validate');

    try {
      // ===== PHASE 0: DIAGNOSTIC VALIDATION =====
      _log('ðŸ"‹ Phase 0: IR Structure Validation');
      final diagnosticReport = await _runDiagnosticsPhase(
        dartFile,
        validate: validate,
      );

      allIssues.addAll(diagnosticReport.issues);

      if (diagnosticReport.hasCriticalIssues && config.strictMode) {
        _log('✗ Diagnostics failed with critical issues');
        return UnifiedPipelineResult.failed(
          message: 'Diagnostic validation failed',
          issues: diagnosticReport.issues,
          duration: stopwatch.elapsed,
        );
      }

      _log('✓ Diagnostics complete (${diagnosticReport.totalIssues} issues)');

      // ===== PHASES 1-3: IR GENERATION & INTEGRATION =====
      _log('ðŸ"„ Phases 1-3: IR Generation & Integration');
      final integrationResult = await _runIntegrationPhases(
        dartFile: dartFile,
        outputPath: outputPath,
      );

      if (!integrationResult.success && config.strictMode) {
        _log('✗ Integration phases failed');
        return UnifiedPipelineResult.failed(
          message: 'Integration phases failed',
          issues: allIssues,
          duration: stopwatch.elapsed,
        );
      }

      _log('✓ Integration complete');

      // ===== PHASES 4-6: FILE GENERATION & VALIDATION =====
      _log('✗ï¸  Phases 4-6: File Generation, Validation & Optimization');
      _log('📝 About to call _runGenerationPhases');
      _log('   - Optimize: $optimize');
      _log('   - Optimization Level: $optimizationLevel');
      _log('   - Output Path: $outputPath');

      final generationResult = await _runGenerationPhases(
        dartFile: dartFile,
        outputPath: outputPath,
        validate: validate,
        optimize: optimize,
        optimizationLevel: optimizationLevel,
      );

      _log('📊 Generation result received:');
      _log('   - Success: ${generationResult.success}');
      _log('   - Code length: ${generationResult.code?.length ?? 0} bytes');
      _log('   - Message: ${generationResult.message}');
      _log('   - Output path: ${generationResult.outputPath}');

      if (!generationResult.success && config.strictMode) {
        _log('✗ Generation phases failed');
        return UnifiedPipelineResult.failed(
          message: generationResult.message ?? "unknown error",
          issues: allIssues,
          duration: stopwatch.elapsed,
        );
      }

      // CHECK IF FILE WAS ACTUALLY WRITTEN
      if (generationResult.outputPath != null) {
        final outputFile = File(generationResult.outputPath!);
        final fileExists = await outputFile.exists();
        final fileSize = fileExists ? await outputFile.length() : 0;
        _log('🔍 File verification:');
        _log('   - Path: ${generationResult.outputPath}');
        _log('   - Exists: $fileExists');
        _log('   - Size: $fileSize bytes');
      }

      _log('✓ Generation complete');

      stopwatch.stop();

      // ===== COMPILE RESULTS =====
      return UnifiedPipelineResult.success(
        code: generationResult.code,
        irJson: integrationResult.irJson,
        diagnosticReport: diagnosticReport,
        generationReport: generationResult,
        duration: stopwatch.elapsed,
        statistics: {
          'diagnosticIssues': diagnosticReport.totalIssues,
          'generatedCodeSize': generationResult.code?.length ?? 0,
          'optimizationLevel': optimizationLevel,
          'durationMs': stopwatch.elapsedMilliseconds,
        },
      );
    } catch (e, st) {
      _log('✗ Pipeline error: $e');
      _log('Stack trace:');
      _log(st.toString());
      if (config.verbose) _log('Stack: $st');

      return UnifiedPipelineResult.failed(
        message: 'Pipeline error: $e',
        issues: allIssues,
        duration: stopwatch.elapsed,
      );
    }
  }
  // =========================================================================
  // PHASE 0: DIAGNOSTIC VALIDATION
  // =========================================================================

  Future<DiagnosticReport> _runDiagnosticsPhase(
    DartFile dartFile, {
    required bool validate,
  }) async {
    _log('  - Validating IR structure');

    try {
      // Run comprehensive diagnostics
      final report = diagnosticEngine.performFullDiagnostics(dartFile);

      if (config.verbose) {
        _log('  - IR structure: ${report.totalIssues} issues found');
        for (final issue in report.issues.take(5)) {
          _log('    • ${issue.severity.name}: ${issue.message}');
        }
      }

      return report;
    } catch (e) {
      _log('  - Error during diagnostics: $e');
      final report = DiagnosticReport();
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'DIAG001',
          message: 'Diagnostic phase error: $e',
        ),
      );
      return report;
    }
  }

  // =========================================================================
  // PHASES 1-3: INTEGRATION
  // =========================================================================

  Future<_IntegrationPhaseResult> _runIntegrationPhases({
    required DartFile dartFile,
    required String outputPath,
  }) async {
    try {
      _log('  - Running integration pipeline');

      // The integration pipeline handles:
      // Phase 1: Symbol resolution
      // Phase 2: Type inference
      // Phase 3: Widget analysis

      // For now, we'll use the integration pipeline's generation result
      final result = await integrationPipeline.generateFile(dartFile);

      if (!result.success) {
        _log('  - Integration failed: ${result.message}');
        allIssues.addAll(result.issues);
        return _IntegrationPhaseResult(success: false);
      }

      _log(
        '  - Integration complete (${result.code?.length ?? 0} chars generated)',
      );

      // Capture intermediate results
      final irJson = {
        'classes': dartFile.classDeclarations.length,
        'functions': dartFile.functionDeclarations.length,
        'variables': dartFile.variableDeclarations.length,
      };

      return _IntegrationPhaseResult(
        success: true,
        irJson: irJson,
        issues: result.issues,
      );
    } catch (e, stackTrace) {
      _log('  - Integration phase error: $e');
      allIssues.add(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'INT001',
          message: 'Integration phase error: $e',
          stackTrace: stackTrace,
        ),
      );
      return _IntegrationPhaseResult(success: false);
    }
  }

  // =========================================================================
  // PHASES 4-6: FILE GENERATION
  // =========================================================================

  Future<GenerationPhaseResult> _runGenerationPhases({
    required DartFile dartFile,
    required String outputPath,
    required bool validate,
    required bool optimize,
    required int optimizationLevel,
  }) async {
    try {
      _log('  ✏️  Phase 4-6 START');
      _log('     Input DartFile: ${dartFile.filePath}');
      _log('     Output path: $outputPath');

      // ===== PHASE 4: FILE-LEVEL GENERATION =====
      _log('  - Phase 4: Generating JavaScript code');

      var jsCode = await fileCodeGen.generate(
        dartFile,
        validate: validate,
        optimize: optimize,
        optimizationLevel: optimizationLevel,
      );

      _log('  - Generated code length: ${jsCode.length} bytes');

      if (jsCode.isEmpty) {
        _log('  - ❌ ERROR: Generated code is EMPTY');
        return GenerationPhaseResult(
          success: false,
          message: 'Generated code is empty',
        );
      }

      _log('  - ✅ Code generated successfully');

      // ===== PHASE 5: VALIDATION & OPTIMIZATION =====
      if (validate) {
        _log('  - Phase 5A: Validating generated code');

        // ✅ Initialize OutputValidator with generated code
        final validator = OutputValidator(jsCode);
        final validationReport = await validator.validate();

        if (validationReport.hasCriticalIssues) {
          _log(
            '  - ⚠️  Validation issues found: ${validationReport.errorCount}',
          );
          if (config.verbose) {
            for (final error in validationReport.errors.take(3)) {
              _log('    • ${error.message}');
            }
          }
        } else {
          _log('  - ✅ Validation passed');
        }
      }

      Map<String, dynamic> optimizationReport = {};

      if (optimize) {
        _log('  - Phase 5B: Optimizing code (level $optimizationLevel)');

        // ✅ Initialize JSOptimizer with generated code
        final optimizer = JSOptimizer(jsCode);
        final optimizedCode = optimizer.optimize(
          level: optimizationLevel,
          dryRun: false,
        );

        final reduction = jsCode.length - optimizedCode.length;
        final reduction_pct = (reduction / jsCode.length * 100).toStringAsFixed(
          1,
        );
        _log('  - ✅ Optimization: -$reduction bytes ($reduction_pct%)');
        _log('     Before: ${jsCode.length}, After: ${optimizedCode.length}');

        jsCode = optimizedCode;

        optimizationReport = {
          'original_size': jsCode.length,
          'optimized_size': optimizedCode.length,
          'reduction_bytes': reduction,
          'reduction_percent': reduction_pct,
        };
      }

      // ===== PHASE 6: OUTPUT =====
      _log('  - Phase 6: Writing output file');
      _log('     Path: $outputPath');
      _log('     Code size: ${jsCode.length} bytes');

      final outputFile = File(outputPath);

      _log('     Creating parent directories...');
      await outputFile.parent.create(recursive: true);
      _log('     ✅ Parent directory created');

      _log('     Writing file...');
      await outputFile.writeAsString(jsCode);
      _log('     ✅ File written');

      // VERIFY FILE WAS WRITTEN
      final fileExists = await outputFile.exists();
      final fileSize = await outputFile.length();
      _log('     📊 File verification:');
      _log('        - Exists: $fileExists');
      _log('        - Size: $fileSize bytes');

      if (!fileExists) {
        _log('     ❌ WARNING: File does not exist after write!');
      }

      _log('  - ✅ File written: $outputPath');

      return GenerationPhaseResult(
        success: true,
        code: jsCode,
        outputPath: outputPath,
        optimizationReport: optimizationReport.isNotEmpty
            ? optimizationReport
            : null,
      );
    } catch (e, st) {
      _log('  - ❌ Generation error: $e');
      _log('     Stack: $st');

      allIssues.add(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'GEN001',
          message: 'Generation phase error: $e',
          stackTrace: st,
        ),
      );

      return GenerationPhaseResult(
        success: false,
        message: 'Generation error: $e',
      );
    }
  }
  // =========================================================================
  // UTILITIES
  // =========================================================================

  void _log(String message) {
    final timestamp = DateTime.now().toString().split('.')[0];
    final logLine = '[$timestamp] $message';
    executionLog.add(logLine);
    if (config.verbose) print(logLine);
  }

  String getFullLog() => executionLog.join('\n');

  void printSummary() {
    print(
      '\n╔════════════════════════════════════════════════════════════════╗',
    );
    print('║           UNIFIED PIPELINE EXECUTION SUMMARY                 ║');
    print('╚════════════════════════════════════════════════════════════════╝');
    print('Total phases: 6 (Diagnostic + Integration + Generation)');
    print('Issues found: ${allIssues.length}');
    print('Execution log entries: ${executionLog.length}');
    print('');
  }
}

class UnifiedPipelineResult {
  bool success = false;
  String? code;
  Map<String, dynamic>? irJson;
  DiagnosticReport? diagnosticReport;
  GenerationPhaseResult? generationReport;
  Duration? duration;
  Map<String, dynamic>? statistics;
  List<DiagnosticIssue> issues = [];
  String? errorMessage;

  UnifiedPipelineResult.success({
    required this.code,
    required this.irJson,
    required this.diagnosticReport,
    required this.generationReport,
    required this.duration,
    required this.statistics,
  }) : success = true;

  UnifiedPipelineResult.failed({
    required String message,
    required this.issues,
    required this.duration,
  }) : success = false,
       errorMessage = message;

  void printReport() {
    print(
      '\n╔════════════════════════════════════════════════════════════════╗',
    );
    if (success) {
      print('║              ✅ PIPELINE SUCCESSFUL                         ║');
      print(
        '╠════════════════════════════════════════════════════════════════╣',
      );
      print(
        '║ Generated Code Size: ${(code?.length ?? 0).toString().padRight(42)}║',
      );
      print(
        '║ Duration: ${(duration?.inMilliseconds ?? 0).toString().padRight(51)}║',
      );
      if (statistics != null) {
        print(
          '║ Optimization Level: ${statistics!['optimizationLevel'].toString().padRight(43)}║',
        );
      }
    } else {
      print('║              ❌ PIPELINE FAILED                            ║');
      print(
        '╠════════════════════════════════════════════════════════════════╣',
      );
      print('║ Error: ${(errorMessage ?? 'Unknown').padRight(56)}║');
      print('║ Issues: ${issues.length.toString().padRight(55)}║');
    }
    print(
      '╚════════════════════════════════════════════════════════════════╝\n',
    );
  }
}

// ============================================================================
// INTERNAL PHASE RESULTS
// ============================================================================

class _IntegrationPhaseResult {
  final bool success;
  final Map<String, dynamic>? irJson;
  final List<DiagnosticIssue> issues;

  _IntegrationPhaseResult({
    required this.success,
    this.irJson,
    this.issues = const [],
  });
}

class GenerationPhaseResult {
  final bool success;
  final String? code;
  final String? message;
  final String? outputPath;
  final Map<String, dynamic>? optimizationReport;

  GenerationPhaseResult({
    required this.success,
    this.code,
    this.message,
    this.outputPath,
    this.optimizationReport,
  });
}

// ============================================================================
// INTEGRATION WITH RunCommand
// ============================================================================
