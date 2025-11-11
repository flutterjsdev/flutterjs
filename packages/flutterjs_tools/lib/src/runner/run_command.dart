// ============================================================================
// UNIFIED COMMAND - Complete Analysis → IR Generation → JS Conversion Pipeline
// ============================================================================
// Integrates ALL phases: 0-6
// Phase 0: Pre-Analysis (Validation, Type System, Scope, Control Flow, Flutter)
// Phase 1: IR Normalization & Enhancement
// Phase 2: Core Language Code Generation
// Phase 3: Flutter-Specific Code Generation
// Phase 4: File-Level Generation
// Phase 5: Output Validation & Optimization
// Phase 6: Reporting & Output
// ============================================================================

import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:flutterjs_tools/src/runner/helper.dart';
import 'package:path/path.dart' as path;
import 'package:flutterjs_analyzer/flutterjs_analyzer.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:analyzer/dart/ast/ast.dart';

class RunCommand extends Command<void> {
  RunCommand({required this.verbose, required this.verboseHelp}) {
    argParser
      ..addOption(
        'project',
        abbr: 'p',
        help: 'Path to Flutter project root.',
        defaultsTo: '.',
      )
      ..addOption(
        'source',
        abbr: 's',
        help: 'Path to source directory relative to project root.',
        defaultsTo: 'lib',
      )
      ..addFlag(
        'json',
        help: 'Output results in JSON format.',
        negatable: false,
      )
      ..addFlag(
        'parallel',
        help: 'Enable parallel processing.',
        defaultsTo: true,
      )
      ..addOption(
        'max-parallelism',
        help: 'Maximum parallel workers.',
        defaultsTo: '4',
      )
      ..addFlag(
        'incremental',
        help: 'Use incremental caching.',
        defaultsTo: true,
      )
      ..addFlag(
        'skip-analysis',
        help: 'Skip analysis phase and convert all .dart files.',
        negatable: false,
      )
      ..addFlag(
        'show-analysis',
        help: 'Show detailed analysis report.',
        defaultsTo: false,
      )
      ..addFlag(
        'strict',
        help: 'Exit with error if any issues found.',
        negatable: false,
      )
      ..addFlag(
        'all',
        abbr: 'a',
        help: 'Analyze all files regardless of cache.',
        negatable: false,
      )
      ..addFlag(
        'to-js',
        help: 'Convert IR to JavaScript (includes all validation & optimization).',
        negatable: false,
      )
      ..addOption(
        'js-optimization-level',
        help: 'JavaScript optimization level (0-3).',
        defaultsTo: '1',
        allowed: ['0', '1', '2', '3'],
      )
      ..addFlag(
        'validate-output',
        help: 'Validate generated JavaScript before output.',
        defaultsTo: true,
      )
      ..addFlag(
        'clear-cache',
        help: 'Clear analysis cache before running.',
        negatable: false,
      )
      ..addFlag(
        'generate-reports',
        help: 'Generate detailed conversion reports.',
        defaultsTo: true,
      );
  }

  final bool verbose;
  final bool verboseHelp;

  @override
  String get name => 'run';

  @override
  String get description =>
      'Complete pipeline: Analysis → IR Generation → JS Conversion (Phases 0-6)\n'
      'Phase 0: Pre-Analysis (validation, type system, scope, control flow, Flutter analysis)\n'
      'Phase 1: IR Normalization\n'
      'Phase 2: Core Language Code Generation\n'
      'Phase 3: Flutter Code Generation\n'
      'Phase 4: File-Level Generation\n'
      'Phase 5: Validation & Optimization\n'
      'Phase 6: Reporting';

  @override
  Future<void> run() async {
    final projectPath = argResults!['project'] as String;
    final sourcePath = argResults!['source'] as String;
    final jsonOutput = argResults!['json'] as bool;
    final enableParallel = argResults!['parallel'] as bool;
    final maxParallelism = int.parse(argResults!['max-parallelism'] as String);
    var enableIncremental = argResults!['incremental'] as bool;
    final skipAnalysis = argResults!['skip-analysis'] as bool;
    final showAnalysis = argResults!['show-analysis'] as bool;
    final strictMode = argResults!['strict'] as bool;
    final analyzeAll = argResults!['all'] as bool;
    final toJs = argResults!['to-js'] as bool;
    final jsOptLevel = int.parse(argResults!['js-optimization-level'] as String);
    final validateOutput = argResults!['validate-output'] as bool;
    final clearCache = argResults!['clear-cache'] as bool;
    final generateReports = argResults!['generate-reports'] as bool;

    if (analyzeAll) enableIncremental = false;

    // ===== SETUP DIRECTORIES =====
    final projectDir = Directory(projectPath);
    if (!await projectDir.exists()) {
      print('Error: Project directory not found at $projectPath');
      exit(1);
    }

    final absoluteProjectPath = path.normalize(projectDir.absolute.path);
    final absoluteSourcePath = path.join(absoluteProjectPath, sourcePath);

    // Build directory structure
    final buildDir = path.join(absoluteProjectPath, 'build');
    final flutterJsDir = path.join(buildDir, 'flutterjs');
    final irOutputPath = path.join(flutterJsDir, 'ir');
    final jsOutputPath = path.join(flutterJsDir, 'js');
    final reportsPath = path.join(flutterJsDir, 'reports');

    if (!jsonOutput) {
      _printHeader(absoluteProjectPath, absoluteSourcePath, flutterJsDir, toJs);
    }

    int jsFileCount = 0;
    final allWarnings = <String>[];
    final allErrors = <String>[];

    try {
      // Create directories
      await Directory(irOutputPath).create(recursive: true);
      if (toJs) await Directory(jsOutputPath).create(recursive: true);
      if (generateReports) await Directory(reportsPath).create(recursive: true);

      // Initialize parser
      try {
        if (!jsonOutput) print('Initializing Dart parser...\n');
        DartFileParser.initialize(projectRoot: absoluteProjectPath);
      } catch (e) {
        print('Error: Failed to initialize Dart parser: $e');
        exit(1);
      }

      // ===== PHASE 1: ANALYSIS =====
      List<String> filesToConvert = [];

      if (skipAnalysis) {
        if (!jsonOutput) print('PHASE 1: Discovering all Dart files...\n');
        filesToConvert = await _discoverAllDartFiles(absoluteSourcePath);
        if (!jsonOutput) print('  Found: ${filesToConvert.length} files\n');
      } else {
        if (!jsonOutput) print('PHASE 1: Analyzing project...\n');
        final analyzer = ProjectAnalyzer(
          absoluteProjectPath,
          maxParallelism: maxParallelism,
          enableVerboseLogging: verbose,
          enableCache: enableIncremental,
          enableParallelProcessing: enableParallel,
        );

        try {
          await analyzer.initialize();
          final orchestrator = ProjectAnalysisOrchestrator(analyzer);
          final analysisReport = await orchestrator.analyze();

          filesToConvert = analysisReport.changedFiles.toList();

          if (!jsonOutput) {
            _printAnalysisSummary(analysisReport, showAnalysis);
            print('\n  Files for conversion: ${filesToConvert.length}\n');
          }

          analyzer.dispose();

          if (analysisReport.filesWithErrors.isNotEmpty && strictMode) {
            print(
              'Error: ${analysisReport.filesWithErrors.length} files have errors.',
            );
            exit(1);
          }
        } catch (e) {
          analyzer.dispose();
          rethrow;
        }
      }

      if (filesToConvert.isEmpty) {
        if (!jsonOutput) print('No files to convert.');
        exit(0);
      }

      // ===== PHASE 2: IR GENERATION =====
      if (!jsonOutput)
        print('PHASE 2: Generating IR for ${filesToConvert.length} files...\n');

      final irResults = await _runAllPasses(
        dartFiles: filesToConvert,
        projectRoot: absoluteProjectPath,
        parallel: enableParallel,
        maxParallelism: maxParallelism,
        verbose: verbose,
        jsonOutput: jsonOutput,
      );

      // ===== PHASE 3: SERIALIZATION =====
      if (!jsonOutput) print('PHASE 3: Serializing IR...\n');

      final irFileCount = await _serializeIR(
        irResults: irResults,
        outputPath: irOutputPath,
        sourceBasePath: absoluteSourcePath,
        verbose: verbose,
      );

      if (!jsonOutput) print('  Serialized: $irFileCount files\n');

      // ===== PHASE 4-6: IR TO JAVASCRIPT (with validation & optimization) =====
      if (toJs && irResults.dartFiles.isNotEmpty) {
        if (!jsonOutput) {
          print(
            'PHASES 4-6: Converting IR to JavaScript with Validation & Optimization\n',
          );
        }

        try {
          await Directory(jsOutputPath).create(recursive: true);

          jsFileCount = await _convertIRToJavaScriptWithValidation(
            irResults: irResults,
            sourceBasePath: absoluteSourcePath,
            jsOutputPath: jsOutputPath,
            validateOutput: validateOutput,
            optimizationLevel: jsOptLevel,
            generateReports: generateReports,
            reportsPath: reportsPath,
            verbose: verbose,
            jsonOutput: jsonOutput,
            warnings: allWarnings,
            errors: allErrors,
          );

          if (!jsonOutput) {
            print('\n  Generated: $jsFileCount JavaScript files\n');
          }
        } catch (e, stackTrace) {
          print('Error during JavaScript conversion: $e');
          if (verbose) print('Stack trace: $stackTrace');
          if (strictMode) exit(1);
        }
      }

      // ===== FINAL REPORTING =====
      if (!jsonOutput) {
        _printFinalResults(
          irResults,
          filesToConvert.length,
          irFileCount,
          jsFileCount,
          flutterJsDir,
          allWarnings,
          allErrors,
        );
      } else {
        _printJsonResults(
          irResults,
          filesToConvert.length,
          irFileCount,
          jsFileCount,
        );
      }

      // Exit with error if strict mode and issues found
      if ((allErrors.isNotEmpty || allWarnings.isNotEmpty) && strictMode) {
        exit(1);
      }
    } catch (e, stackTrace) {
      print('\nFatal error: $e');
      if (verbose) print('Stack trace:\n$stackTrace');
      exit(1);
    }
  }

  // =========================================================================
  // PHASE 0-3: ANALYSIS & IR GENERATION
  // =========================================================================

  Future<IRGenerationResults> _runAllPasses({
    required List<String> dartFiles,
    required String projectRoot,
    required bool parallel,
    required int maxParallelism,
    required bool verbose,
    required bool jsonOutput,
  }) async {
    final stopwatch = Stopwatch()..start();
    final results = IRGenerationResults();

    try {
      if (!jsonOutput) print('  Pass 1/5: Declaration Discovery...');
      await _runDeclarationPass(
        dartFiles: dartFiles,
        projectRoot: projectRoot,
        results: results,
        verbose: verbose,
      );

      if (!jsonOutput) print('  Pass 2/5: Symbol Resolution...');
      await _runSymbolResolutionPass(results: results, verbose: verbose);

      if (!jsonOutput) print('  Pass 3/5: Type Inference...');
      await _runTypeInferencePass(results: results, verbose: verbose);

      if (!jsonOutput) print('  Pass 4/5: Flow Analysis...');
      await _runFlowAnalysisPass(results: results, verbose: verbose);

      if (!jsonOutput) print('  Pass 5/5: Validation & Diagnostics...');
      await _runValidationPass(results: results, verbose: verbose);

      stopwatch.stop();
      results.totalDurationMs = stopwatch.elapsedMilliseconds;
    } catch (e) {
      if (verbose) print('Error during passes: $e');
      rethrow;
    }

    return results;
  }

  Future<void> _runDeclarationPass({
    required List<String> dartFiles,
    required String projectRoot,
    required IRGenerationResults results,
    required bool verbose,
  }) async {
    int filesProcessed = 0;

    for (final filePath in dartFiles) {
      try {
        final file = File(filePath);
        if (!await file.exists()) continue;

        final content = await file.readAsString();
        final builder = DartFileBuilder(filePath: filePath, projectRoot: projectRoot);

        CompilationUnit? unit;
        try {
          unit = DartFileParser.parseFile(filePath);
        } catch (_) {
          continue;
        }

        if (unit == null) continue;

        final pass = DeclarationPass(
          filePath: filePath,
          fileContent: content,
          builder: builder,
        );
        pass.extractDeclarations(unit);

        final dartFile = builder.build();
        results.dartFiles[filePath] = dartFile;
        filesProcessed++;

        if (verbose) {
          print('    ${path.basename(filePath)} (${dartFile.declarationCount} decls)');
        }
      } catch (e) {
        if (verbose) print('    Error: ${path.basename(filePath)}: $e');
      }
    }

    if (!verbose) print('    Processed: $filesProcessed files');
  }

  Future<void> _runSymbolResolutionPass({
    required IRGenerationResults results,
    required bool verbose,
  }) async {
    final pass = SymbolResolutionPass(dartFiles: results.dartFiles, projectRoot: '');
    pass.resolveAllSymbols();

    results.resolutionIssues.addAll(pass.resolutionIssues);
    results.widgetStateBindings.addAll(pass.widgetStateBindings);
    results.providerRegistry.addAll(pass.providerRegistry);

    if (!verbose) print('    Resolved: ${pass.globalSymbolRegistry.length} symbols');
  }

  Future<void> _runTypeInferencePass({
    required IRGenerationResults results,
    required bool verbose,
  }) async {
    final pass = TypeInferencePass(
      dartFiles: results.dartFiles,
      globalSymbols: {},
      providerRegistry: results.providerRegistry,
    );

    pass.inferAllTypes();
    results.inferenceIssues.addAll(pass.inferenceIssues);
    results.typeCache.addAll(pass.typeCache);

    if (!verbose) print('    Inferred: ${pass.typeCache.length} expressions');
  }

  Future<void> _runFlowAnalysisPass({
    required IRGenerationResults results,
    required bool verbose,
  }) async {
    final pass = FlowAnalysisPass(dartFiles: results.dartFiles, typeInferenceInfo: {});
    pass.analyzeAllFlows();

    results.flowIssues.addAll(pass.flowIssues);
    results.controlFlowGraphs.addAll(pass.controlFlowGraphs);
    results.rebuildTriggers.addAll(pass.rebuildTriggers);

    if (!verbose) print('    Built: ${pass.controlFlowGraphs.length} CFGs');
  }

  Future<void> _runValidationPass({
    required IRGenerationResults results,
    required bool verbose,
  }) async {
    final pass = ValidationPass(dartFiles: results.dartFiles, flowAnalysisInfo: {});
    pass.validateAll();

    results.validationIssues.addAll(pass.validationIssues);
    results.validationSummary = pass.summary;

    if (!verbose) {
      print(
        '    Issues: ${pass.validationIssues.length} '
        '(${pass.summary.errorCount}E, ${pass.summary.warningCount}W)',
      );
    }
  }

  // =========================================================================
  // PHASE 4-6: IR TO JAVASCRIPT WITH VALIDATION & OPTIMIZATION
  // =========================================================================

   Future<int> _convertIRToJavaScriptWithValidation({
    required IRGenerationResults irResults,
    required String sourceBasePath,
    required String jsOutputPath,
    required bool validateOutput,
    required int optimizationLevel,
    required bool generateReports,
    required String reportsPath,
    required bool verbose,
    required bool jsonOutput,
    required List<String> warnings,
    required List<String> errors,
  }) async {
    int filesGenerated = 0;
    final normalizedSourcePath = path.normalize(sourceBasePath);
    final normalizedJsOutputPath = path.normalize(jsOutputPath);

    if (!jsonOutput) print('  Phase 4: File-Level Generation...');
    if (!jsonOutput) print('  Phase 5: Validation & Optimization (Level $optimizationLevel)...');
    if (!jsonOutput) print('  Phase 6: Reporting & Output...\n');

    for (final entry in irResults.dartFiles.entries) {
      try {
        final dartFilePath = entry.key;
        final dartFile = entry.value;

        // Calculate relative path
        final normalizedDartPath = path.normalize(dartFilePath);
        if (!normalizedDartPath.startsWith(normalizedSourcePath)) continue;

        final relativePath = path.relative(
          normalizedDartPath,
          from: normalizedSourcePath,
        );

        var relativeDir = path.dirname(relativePath);
        if (relativeDir == '.') relativeDir = '';

        final fileNameWithoutExt = path.basenameWithoutExtension(normalizedDartPath);
        final jsFileName = '$fileNameWithoutExt.js';

        final jsOutputFile = relativeDir.isEmpty
            ? File(path.join(normalizedJsOutputPath, jsFileName))
            : File(path.join(normalizedJsOutputPath, relativeDir, jsFileName));

        // ===== PHASE 4: FILE-LEVEL GENERATION =====
        final fileCodeGen = FileCodeGen(
          propConverter: FlutterPropConverter(),
          runtimeRequirements: RuntimeRequirements(),
        );

        // ✅ FIXED: Properly await and store result
        var jsCode = await fileCodeGen.generate(
          dartFile,
          validate: validateOutput,
          optimize: optimizationLevel > 0,
          optimizationLevel: optimizationLevel,
        );

        if (verbose) {
          print('    Phase 4: ${path.basename(dartFilePath)} - Generated (${jsCode.length} bytes)');
        }

        // // // ===== PHASE 5: VALIDATION & OPTIMIZATION =====
        // if (validateOutput) {
        //   final validator = OutputValidator(jsCode);
        //   final validationReport = await validator.validate();

        //   if (validationReport.hasCriticalIssues) {
        //     for (final error in validationReport.errors) {
        //       if (error.severity == ErrorSeverity.error ||
        //           error.severity == ErrorSeverity.fatal) {
        //         errors.add(
        //           '${path.basename(dartFilePath)}: ${error.message}',
        //         );
        //       }
        //     }
        //     if (verbose) {
        //       print('    Phase 5: ${path.basename(dartFilePath)} - ❌ Validation FAILED');
        //     }
        //     continue;
        //   }

        //   for (final error in validationReport.errors) {
        //     if (error.severity == ErrorSeverity.warning) {
        //       warnings.add(
        //         '${path.basename(dartFilePath)}: ${error.message}',
        //       );
        //     }
        //   }

        //   if (verbose) {
        //     print('    Phase 5: ${path.basename(dartFilePath)} - ✅ Validated');
        //   }
        // }

        // ===== PHASE 6: OUTPUT & REPORTING =====
        await jsOutputFile.parent.create(recursive: true);
        print("output ${jsCode}");
        await jsOutputFile.writeAsString(jsCode);
        print("output1 ${jsOutputFile.readAsString()}");
        filesGenerated++;

        if (verbose) {
          final sizeKb = (jsCode.length / 1024).toStringAsFixed(2);
          print('    Phase 6: ${path.basename(dartFilePath)} - Written ($sizeKb KB) ✓');
        }

        // Generate report if requested
        if (generateReports) {
          final reportFile = File(
            path.join(
              reportsPath,
              '${fileNameWithoutExt}_conversion_report.json',
            ),
          );

          await reportFile.parent.create(recursive: true);
          await reportFile.writeAsString(_generateConversionReport(
            dartFile,
            jsCode,
            optimizationLevel,
          ));

          if (verbose) {
            print('    Reports: ${path.basename(dartFilePath)}_conversion_report.json ✓');
          }
        }
      } catch (e, stackTrace) {
        if (verbose) {
          print('    ❌ Error processing ${path.basename(entry.key)}: $e');
          if (verbose) print('       Stack: $stackTrace');
        }
        errors.add('${path.basename(entry.key)}: $e');
      }
    }

    return filesGenerated;
  }

  // =========================================================================
  // SERIALIZATION & HELPERS
  // =========================================================================

  Future<int> _serializeIR({
    required IRGenerationResults irResults,
    required String outputPath,
    required bool verbose,
    required String sourceBasePath,
  }) async {
    int fileCount = 0;
    final normalizedOutputPath = path.normalize(outputPath);
    final normalizedSourcePath = path.normalize(sourceBasePath);

    for (final entry in irResults.dartFiles.entries) {
      try {
        final normalizedPath = path.normalize(entry.key);
        if (!normalizedPath.startsWith(normalizedSourcePath)) continue;

        final relativePath = path.relative(normalizedPath, from: normalizedSourcePath);
        var relDir = path.dirname(relativePath);
        if (relDir == '.') relDir = '';

        final fileNameWithoutExt = path.basenameWithoutExtension(normalizedPath);
        final outputFileName = '${fileNameWithoutExt}_ir.ir';

        final outputFile = relDir.isEmpty
            ? File(path.join(normalizedOutputPath, outputFileName))
            : File(path.join(normalizedOutputPath, relDir, outputFileName));

        final binaryWriter = BinaryIRWriter();
        final binaryBytes = binaryWriter.writeFileIR(entry.value, verbose: false);

        await outputFile.parent.create(recursive: true);
        await outputFile.writeAsBytes(binaryBytes);
        fileCount++;

        if (verbose) {
          final sizeKb = (binaryBytes.length / 1024).toStringAsFixed(2);
          print('    ✓ ${path.basename(entry.key)} ($sizeKb KB)');
        }
      } catch (e) {
        if (verbose) print('    ✗ ${path.basename(entry.key)}: $e');
      }
    }

    return fileCount;
  }

  Future<List<String>> _discoverAllDartFiles(String sourceDir) async {
    final dir = Directory(sourceDir);
    final files = <String>[];

    await for (final entity in dir.list(recursive: true, followLinks: false)) {
      if (entity is File && entity.path.endsWith('.dart')) {
        files.add(entity.path);
      }
    }

    files.sort();
    return files;
  }

  // =========================================================================
  // OUTPUT & REPORTING
  // =========================================================================

  void _printHeader(
    String projectPath,
    String sourcePath,
    String outputPath,
    bool toJs,
  ) {
    print('');
    print('┌────────────────────────────────────────────────────────────────┐');
    print('│    FLUTTER IR TO JAVASCRIPT CONVERSION PIPELINE (Phases 0-6)   │');
    print('└────────────────────────────────────────────────────────────────┘');
    print('Project:  $projectPath');
    print('Source:   $sourcePath');
    print('Build:    $outputPath');
    if (toJs) {
      print('  ├─ IR output:  ${path.join(outputPath, 'ir')}');
      print('  ├─ JS output:  ${path.join(outputPath, 'js')}');
      print('  └─ Reports:    ${path.join(outputPath, 'reports')}');
    }
    print('');
  }

  void _printAnalysisSummary(ProjectAnalysisReport report, bool detailed) {
    final stats = report.analysisResult.statistics;

    print('Analysis Results:');
    print('  Total files: ${stats.totalFiles}');
    print('  Changed: ${report.changedFiles.length}');
    print('  Errors: ${report.filesWithErrors.length}');
    print('  Time: ${_formatDuration(stats.durationMs)}');
  }

  void _printFinalResults(
    IRGenerationResults results,
    int filesAnalyzed,
    int irFiles,
    int jsFiles,
    String buildPath,
    List<String> warnings,
    List<String> errors,
  ) {
    print('\n┌────────────────────────────────────────────────────────────────┐');
    print('│              CONVERSION COMPLETE                               │');
    print('└────────────────────────────────────────────────────────────────┘');
    print('Files analyzed:    $filesAnalyzed');
    print('IR files:          $irFiles');
    print('JS files:          $jsFiles');
    print('Total declarations: ${_countDeclarations(results)}');
    print('Build output:      $buildPath');

    if (errors.isNotEmpty) {
      print('\n⚠ Errors (${errors.length}):');
      for (final error in errors.take(5)) {
        print('  • $error');
      }
      if (errors.length > 5) print('  ... and ${errors.length - 5} more');
    }

    if (warnings.isNotEmpty) {
      print('\n⚠ Warnings (${warnings.length}):');
      for (final warning in warnings.take(5)) {
        print('  • $warning');
      }
      if (warnings.length > 5) print('  ... and ${warnings.length - 5} more');
    }

    print('');
  }

  void _printJsonResults(
    IRGenerationResults results,
    int filesAnalyzed,
    int irFiles,
    int jsFiles,
  ) {
    final json = {
      'status': 'success',
      'files_analyzed': filesAnalyzed,
      'ir_files': irFiles,
      'js_files': jsFiles,
      'declarations': _countDeclarations(results),
      'duration_ms': results.totalDurationMs,
    };

    print(_prettyJsonEncode(json));
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  int _countDeclarations(IRGenerationResults results) {
    int count = 0;
    for (final file in results.dartFiles.values) {
      count += file.declarationCount;
    }
    return count;
  }

  String _formatDuration(int ms) {
    if (ms < 1000) return '${ms}ms';
    if (ms < 60000) return '${(ms / 1000).toStringAsFixed(2)}s';
    final m = ms ~/ 60000;
    final s = (ms % 60000) / 1000;
    return '${m}m ${s.toStringAsFixed(1)}s';
  }

  String _prettyJsonEncode(Map<String, dynamic> json) => _jsonEncode(json, 0);

  String _jsonEncode(dynamic value, int indent) {
    final sp = '  ' * indent;
    final nsp = '  ' * (indent + 1);

    if (value is Map) {
      if (value.isEmpty) return '{}';
      final b = StringBuffer('{\n');
      final e = value.entries.toList();
      for (var i = 0; i < e.length; i++) {
        if (e[i].value == null) continue;
        b.write('$nsp"${e[i].key}": ${_jsonEncode(e[i].value, indent + 1)}');
        if (i < e.length - 1) b.write(',');
        b.write('\n');
      }
      b.write('$sp}');
      return b.toString();
    } else if (value is List) {
      if (value.isEmpty) return '[]';
      final b = StringBuffer('[\n');
      for (var i = 0; i < value.length; i++) {
        b.write('$nsp${_jsonEncode(value[i], indent + 1)}');
        if (i < value.length - 1) b.write(',');
        b.write('\n');
      }
      b.write('$sp]');
      return b.toString();
    } else if (value is String) {
      return '"$value"';
    } else {
      return value.toString();
    }
  }

  String _generateConversionReport(
    DartFile dartFile,
    String jsCode,
    int optimizationLevel,
  ) {
    return '''{
  "dart_file": "${dartFile.filePath}",
  "classes": ${dartFile.classDeclarations.length},
  "functions": ${dartFile.functionDeclarations.length},
  "declarations": ${dartFile.declarationCount},
  "js_code_size_bytes": ${jsCode.length},
  "optimization_level": $optimizationLevel,
  "timestamp": "${DateTime.now()}"
}''';
  }
}

// =========================================================================
// RESULTS CONTAINER
// =========================================================================

class IRGenerationResults {
  final Map<String, DartFile> dartFiles = {};
  final List<AnalysisIssue> resolutionIssues = [];
  final Map<String, String> widgetStateBindings = {};
  final Map<String, ProviderInfo> providerRegistry = {};
  final Map<String, dynamic> typeCache = {};
  final List<AnalysisIssue> inferenceIssues = [];
  final Map<String, dynamic> controlFlowGraphs = {};
  final Map<String, Set<String>> rebuildTriggers = {};
  final Map<String, dynamic> stateFieldAnalysis = {};
  final Map<String, dynamic> lifecycleAnalysis = {};
  final List<AnalysisIssue> flowIssues = [];
  final List<AnalysisIssue> validationIssues = [];

  ValidationSummary? validationSummary;
  int totalDurationMs = 0;

  List<AnalysisIssue> getAllIssues() {
    return [
      ...resolutionIssues,
      ...inferenceIssues,
      ...flowIssues,
      ...validationIssues,
    ];
  }
}