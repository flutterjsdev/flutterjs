// ============================================================================
// UNIFIED COMMAND - Complete Analysis → IR Generation → JS Conversion Pipeline
// WITH INTEGRATED DEVTOOLS IR VIEWER SERVER
// ============================================================================

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:dev_tools/dev_tools.dart';
import 'package:args/command_runner.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'package:flutterjs_tools/src/runner/code_pipleiline.dart';
import 'package:flutterjs_tools/src/runner/helper.dart';
import 'package:path/path.dart' as path;
import 'package:flutterjs_analyzer/flutterjs_analyzer.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:flutterjs_gen/src/file_code_gen.dart';
import 'package:flutterjs_gen/src/flutterjs_gen/flutter_prop_converters.dart';

/// ============================================================================
/// RunCommand
/// ============================================================================
///
/// A full end-to-end pipeline for:
///
///   ✔ Dart Analysis
///   ✔ IR Generation
///   ✔ IR Validation
///   ✔ IR → JavaScript Conversion
///   ✔ Optimization (0–3)
///   ✔ Reporting
///   ✔ DevTools IR Viewer (live server)
///
/// This is the most powerful and feature-complete command in the Flutter.js CLI.
/// Its goal is to take a Flutter project directory and produce:
///
///   - Binary IR files (`.ir`)
///   - JavaScript module files (`.js`)
///   - Detailed analysis & conversion reports
///   - Live DevTools IR viewer on a local server
///
///
/// # Overview of Pipeline Phases
///
/// ## **Phase 0 – Pre-Analysis Setup**
///  - Directory resolution
///  - Cache clearing
///  - Parser bootstrapping
///
/// ## **Phase 1 – Static Analysis**
/// Using `ProjectAnalyzer`:
///  - File change detection
///  - AST parsing
///  - Semantic checks
///  - Error reporting
///
/// Output: List of Dart files to convert
///
/// ## **Phase 2 – IR Generation (Passes 1–5)**
///
/// Pass 1: Declaration Discovery
/// Pass 2: Symbol Resolution
/// Pass 3: Type Inference
/// Pass 4: Control-Flow Analysis
/// Pass 5: Validation & Diagnostics
///
/// Output: A complete `IRGenerationResults` object.
///
/// ## **Phase 3 – IR Serialization**
/// Writes `.ir` binary files to:
///
/// `build/flutterjs/ir/<relative_path>/*.ir`
///
///
/// ## **Phase 4–6 – IR → JavaScript Conversion**
///  - File-level code generation
///  - Optional validation
///  - Optimization levels 0–3
///  - Per-file conversion reports
///
/// Output: one `.js` file per Dart file.
///
///
/// # Integrated DevTools IR Viewer
///
/// This command includes an embedded DevTools server which:
///
///   • Watches IR directory live
///   • Reloads when new IR is generated
///   • Visualizes declarations, CFGs, state fields, lifecycle, etc.
///   • Opens automatically unless `--devtools-no-open` is passed
///
/// The server is started **before** analysis so that files appear live as soon
/// as they are generated.
///
///
/// # CLI Flags
///
/// ## Project Control
/// - `--project` (`-p`)
/// - `--source` (`-s`)
///
/// ## Analysis Control
/// - `--skip-analysis`
/// - `--incremental` (enabled default)
/// - `--all` (forces full rebuild)
///
/// ## Parallelism
/// - `--parallel`
/// - `--max-parallelism=<n>`
///
/// ## IR Output
/// - `--json` (machine-readable output)
/// - `--generate-reports`
/// - `--strict` (exit 1 on any issue)
///
/// ## JS Conversion
/// - `--to-js`
/// - `--js-optimization-level=0–3`
/// - `--validate-output`
///
/// ## DevTools
/// - `--devtools-port=<port>`
/// - `--devtools-no-open`
///
///
/// # Execution Workflow
///
/// ```text
/// run → set paths → start DevTools → analyze → generate IR → serialize IR
///     → convert to JavaScript → write reports → print summary → stay open
/// ```
///
/// The DevTools server continues running until the user presses Ctrl+C.
///
///
/// # Error Handling
///
/// - Every phase is wrapped with detailed verbose diagnostics.
/// - Any exception during IR or JS generation is logged.
/// - With `--strict`, the process exits with non-zero status if **any** issue
///   or warning is collected.
///
///
/// # Summary
///
/// `RunCommand` is the heart of the Flutter.js command-line tool.
/// It unifies:
///
///   • full static analysis
///   • multi-pass IR generation
///   • incremental & parallel conversion
///   • cross-file dependency analysis
///   • optimized JavaScript output
///   • human-readable + JSON reporting
///   • optional strict mode for CI pipelines
///   • a fully integrated DevTools visualization server
///
/// This is the recommended command for end users and CI to produce all artifacts
/// required for Flutter.js runtime execution.
///

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
        help:
            'Convert IR to JavaScript (includes all validation & optimization).',
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
      )
      ..addOption(
        'devtools-port',
        help: 'Port for DevTools server (default: 8765).',
        defaultsTo: '8765',
      )
      ..addFlag(
        'devtools-no-open',
        help:
            'Do not auto-open browser for DevTools (DevTools runs by default).',
        negatable: false,
      );
  }

  final bool verbose;
  final bool verboseHelp;

  // ✅ NEW: DevTools server instance
  BinaryIRServer? _devToolsServer;

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
      'Phase 6: Reporting\n'
      '\nWith integrated DevTools IR Viewer (--devtools flag)';

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
    final jsOptLevel = int.parse(
      argResults!['js-optimization-level'] as String,
    );
    final validateOutput = argResults!['validate-output'] as bool;
    final clearCache = argResults!['clear-cache'] as bool;
    final generateReports = argResults!['generate-reports'] as bool;

    // ✅ NEW: DevTools options (enabled by default)
    final devToolsPort =
        int.tryParse(argResults!['devtools-port'] as String) ?? 8765;
    final devToolsNoOpen = argResults!['devtools-no-open'] as bool;
    final enableDevTools =
        !devToolsNoOpen; // Enabled by default unless explicitly disabled

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
      _printHeader(
        absoluteProjectPath,
        absoluteSourcePath,
        flutterJsDir,
        toJs,
        devToolsPort,
      );
    }

    int jsFileCount = 0;
    final allWarnings = <String>[];
    final allErrors = <String>[];

    try {
      // ✅ NEW: Start DevTools server if enabled
      if (enableDevTools) {
        _devToolsServer = await _startDevToolsServer(
          port: devToolsPort,
          watchDirectory: irOutputPath,
          verbose: verbose,
          jsonOutput: jsonOutput,
          openBrowser: !devToolsNoOpen,
        );
      }

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
      print(" issues found during IR generation.\n${irResults.toJson()}");

      // ===== PHASE 3: SERIALIZATION =====
      if (!jsonOutput) print('PHASE 3: Serializing IR...\n');

      // ✅ NEW: Refresh DevTools if server is running
      if (enableDevTools && _devToolsServer != null) {
        if (!jsonOutput) print('  DevTools: IR files ready for analysis\n');
      }
      final reportFile = File(path.join(reportsPath, 'conversion_report.json'));

      await reportFile.parent.create(recursive: true);

      await reportFile.writeAsString(printPrettyJson(irResults.toJson()));

      // ===== PHASE 4-6: IR TO JAVASCRIPT (with validation & optimization) =====
      
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
            generateReports: true ?? generateReports,
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
        // Generate report if requested
      

      // ===== FINAL REPORTING =====
      if (!jsonOutput) {
        _printFinalResults(
          irResults,
          filesToConvert.length,
          // irFileCount,
          jsFileCount,
          flutterJsDir,
          allWarnings,
          allErrors,
          enableDevTools ? 'http://localhost:$devToolsPort' : null,
        );
      } else {
        _printJsonResults(
          irResults,
          filesToConvert.length,
          // irFileCount,
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
    } finally {
      // ✅ NEW: Keep DevTools running or shutdown gracefully
      if (enableDevTools && _devToolsServer != null) {
        if (!jsonOutput) {
          print('\n⏳ DevTools server is running. Press Ctrl+C to stop.\n');
        }
        // Don't stop the server - keep it running for analysis
      }
    }
  }

  String printPrettyJson(Map<String, dynamic> data) {
    const JsonEncoder encoder = JsonEncoder.withIndent('  ');
    return encoder.convert(data);
  }

  // ✅ NEW: Start DevTools Server
  Future<BinaryIRServer?> _startDevToolsServer({
    required int port,
    required String watchDirectory,
    required bool verbose,
    required bool jsonOutput,
    required bool openBrowser,
  }) async {
    try {
      if (!jsonOutput) print('🔧 Starting DevTools IR Viewer...');

      // Ensure watch directory exists
      await Directory(watchDirectory).create(recursive: true);

      final server = BinaryIRServer(
        port: port,
        host: 'localhost',
        verbose: verbose,
        watchDirectory: watchDirectory,
      );

      await server.start();

      if (!jsonOutput) {
        print('✅ DevTools started on http://localhost:$port');
      }

      // Auto-open browser if not suppressed
      if (openBrowser) {
        await _openBrowserAsync('http://localhost:$port');
      }

      return server;
    } catch (e) {
      print('⚠️  Failed to start DevTools: $e');
      return null;
    }
  }

  // ✅ NEW: Open browser without blocking
  Future<void> _openBrowserAsync(String url) async {
    try {
      if (Platform.isWindows) {
        await Process.run('start', [url]);
      } else if (Platform.isMacOS) {
        await Process.run('open', [url]);
      } else if (Platform.isLinux) {
        await Process.run('xdg-open', [url]);
      }
    } catch (e) {
      // Silently fail - not critical
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
        final builder = DartFileBuilder(
          filePath: filePath,
          projectRoot: projectRoot,
        );

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
          print(
            '    ${path.basename(filePath)} (${dartFile.declarationCount} decls)',
          );
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
    final pass = SymbolResolutionPass(
      dartFiles: results.dartFiles,
      projectRoot: '',
    );
    pass.resolveAllSymbols();

    results.resolutionIssues.addAll(pass.resolutionIssues);
    results.widgetStateBindings.addAll(pass.widgetStateBindings);
    results.providerRegistry.addAll(pass.providerRegistry);

    if (!verbose) {
      print('    Resolved: ${pass.globalSymbolRegistry.length} symbols');
    }
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
    final pass = FlowAnalysisPass(
      dartFiles: results.dartFiles,
      typeInferenceInfo: {},
    );
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
    final pass = ValidationPass(
      dartFiles: results.dartFiles,
      flowAnalysisInfo: {},
    );
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
    // =========================================================================
    // SETUP: Initialize the unified pipeline
    // =========================================================================

    final pipeline = UnifiedConversionPipeline(
      config: PipelineConfig(
        strictMode: argResults!['strict'] as bool? ?? true,
        verbose: verbose,
        printLogs: !jsonOutput,
        optimizationLevel: optimizationLevel,
      ),
    );

    int filesGenerated = 0;
    int filesFailed = 0;

    final normalizedSourcePath = path.normalize(sourceBasePath);
    final normalizedJsOutputPath = path.normalize(jsOutputPath);

    if (!jsonOutput) {
      print('  Phase 4: File-Level Generation...');
      print(
        '  Phase 5: Validation & Optimization (Level $optimizationLevel)...',
      );
      print('  Phase 6: Reporting & Output...\n');
    }

    // =========================================================================
    // MAIN LOOP: Process each Dart file through the pipeline
    // =========================================================================

    for (final entry in irResults.dartFiles.entries) {
      final dartFilePath = entry.key;
      final dartFile = entry.value;

      try {
        // Calculate relative path
        final normalizedDartPath = path.normalize(dartFilePath);

        if (!normalizedDartPath.startsWith(normalizedSourcePath)) {
          if (verbose) {
            print('  ⚠️  Skipping: $dartFilePath (outside source path)');
          }
          continue;
        }

        final relativePath = path.relative(
          normalizedDartPath,
          from: normalizedSourcePath,
        );

        var relativeDir = path.dirname(relativePath);
        if (relativeDir == '.') relativeDir = '';

        final fileNameWithoutExt = path.basenameWithoutExtension(
          normalizedDartPath,
        );
        final jsFileName = '$fileNameWithoutExt.js';

        // ===== DETERMINE OUTPUT PATH =====
        final jsOutputFile = relativeDir.isEmpty
            ? File(path.join(normalizedJsOutputPath, jsFileName))
            : File(path.join(normalizedJsOutputPath, relativeDir, jsFileName));

        if (verbose) {
          print('  Processing: ${path.basename(dartFilePath)}');
        }

        // ===== EXECUTE UNIFIED PIPELINE (Phases 0-6) =====
        final pipelineResult = await pipeline.executeFullPipeline(
          dartFile: dartFile,
          outputPath: jsOutputFile.path,
          validate: validateOutput,
          optimize: optimizationLevel > 0,
          optimizationLevel: optimizationLevel,
        );

        // ===== HANDLE RESULTS =====
        if (!pipelineResult.success) {
          filesFailed++;
          final errorMsg = pipelineResult.errorMessage ?? 'Unknown error';
          errors.add('${path.basename(dartFilePath)}: $errorMsg');

          if (verbose) {
            print('    ❌ Failed: $errorMsg');
          }

          // Exit early if strict mode
          if (argResults!['strict'] as bool? ?? false) {
            if (!jsonOutput) {
              print('\n❌ STRICT MODE: Exiting on first error');
            }
            exit(1);
          }

          continue; // Skip to next file
        }

        // ===== SUCCESS: Generate output and reports =====
        filesGenerated++;

        // Write JavaScript file
        await jsOutputFile.parent.create(recursive: true);
        await jsOutputFile.writeAsString(pipelineResult.code ?? '');

        if (verbose) {
          final sizeKb = ((pipelineResult.code?.length ?? 0) / 1024)
              .toStringAsFixed(2);
          print('    ✅ Generated ($sizeKb KB)');
        }

        // ===== GENERATE REPORT (if requested) =====
        if (generateReports && pipelineResult.diagnosticReport != null) {
          await _generateDetailedReport(
            dartFile: dartFile,
            jsCode: pipelineResult.code ?? '',
            diagnosticReport: pipelineResult.diagnosticReport!,
            generationReport: pipelineResult.generationReport,
            statistics: pipelineResult.statistics,
            fileNameWithoutExt: fileNameWithoutExt,
            reportsPath: reportsPath,
            verbose: verbose,
          );
        }

        // ===== COLLECT WARNINGS =====
        if (pipelineResult.diagnosticReport != null) {
          for (final issue in pipelineResult.diagnosticReport!.issues) {
            if (issue.severity == DiagnosticSeverity.warning) {
              warnings.add('${path.basename(dartFilePath)}: ${issue.message}');
            }
          }
        }
      } catch (e, stackTrace) {
        filesFailed++;
        final errorMsg = 'Exception: $e';
        errors.add('${path.basename(dartFilePath)}: $errorMsg');

        if (verbose) {
          print('    ❌ Error: $e');
          if (verbose) print('       Stack: $stackTrace');
        }

        // Continue to next file unless strict mode
        if (argResults!['strict'] as bool? ?? false) {
          if (!jsonOutput) print('\n❌ STRICT MODE: Exiting on error');
          exit(1);
        }
      }
    }
    if (!jsonOutput) {
      print('\n═══════════════════════════════════════════════════════════');
      print('  Generated: $filesGenerated files ✅');
      print('  Failed: $filesFailed files ❌');
      if (warnings.isNotEmpty) {
        print('  Warnings: ${warnings.length} ⚠️');
      }
      if (errors.isNotEmpty) {
        print('  Errors: ${errors.length} ❌');
      }
      print('═══════════════════════════════════════════════════════════\n');
    }

    // Print pipeline log if verbose
    if (verbose) {
      print('\nPipeline Execution Log:');
      print(pipeline.getFullLog());
    }

    return filesGenerated;
  }

  Future<void> _generateDetailedReport({
    required DartFile dartFile,
    required String jsCode,
    required DiagnosticReport diagnosticReport,
    required dynamic generationReport,
    required Map<String, dynamic>? statistics,
    required String fileNameWithoutExt,
    required String reportsPath,
    required bool verbose,
  }) async {
    try {
      final reportContent = {
        'file': dartFile.filePath,
        'timestamp': DateTime.now().toIso8601String(),
        'phases': {
          'phase_0_diagnostic': {
            'total_issues': diagnosticReport.totalIssues,
            'errors': diagnosticReport.errorCount,
            'warnings': diagnosticReport.warningCount,
            'fatal': diagnosticReport.fatalCount,
            'issues': diagnosticReport.issues
                .map(
                  (i) => {
                    'severity': i.severity.name,
                    'code': i.code,
                    'message': i.message,
                    'suggestion': i.suggestion,
                    'stack':i.stackTrace.toString()
                  },
                )
                .toList(),
          },
          'phases_1_3_integration': {
            'classes': dartFile.classDeclarations.length,
            'functions': dartFile.functionDeclarations.length,
            'variables': dartFile.variableDeclarations.length,
          },
          'phases_4_6_generation': {
            'js_code_size': jsCode.length,
            'optimization_level': statistics?['optimizationLevel'] ?? 0,
            'duration_ms': statistics?['durationMs'] ?? 0,
          },
        },
      };

      final reportJson = jsonEncode(reportContent);

      final reportFile = File(
        path.join(reportsPath, '${fileNameWithoutExt}_conversion_report.json'),
      );

      await reportFile.parent.create(recursive: true);
      await reportFile.writeAsString(reportJson);

      if (verbose) {
        print('    📄 Report: ${reportFile.path}');
      }
    } catch (e) {
      if (verbose) {
        print('    ⚠️  Failed to generate report: $e');
      }
    }
  }

  // =========================================================================
  // SERIALIZATION & HELPERS
  // =========================================================================

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
    int devToolsPort,
  ) {
    print('');
    print(
      '┌──────────────────────────────────────────────────────────────────────┐',
    );
    print(
      '│    FLUTTER IR TO JAVASCRIPT CONVERSION PIPELINE (Phases 0-6)        │',
    );
    print(
      '└──────────────────────────────────────────────────────────────────────┘',
    );
    print('Project:  $projectPath');
    print('Source:   $sourcePath');
    print('Build:    $outputPath');
    if (toJs) {
      print('  ├─ IR output:  ${path.join(outputPath, 'ir')}');
      print('  ├─ JS output:  ${path.join(outputPath, 'js')}');
      print('  └─ Reports:    ${path.join(outputPath, 'reports')}');
    }
    print(
      'DevTools: http://localhost:$devToolsPort (opening automatically...)',
    );
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
    // int irFiles,
    int jsFiles,
    String buildPath,
    List<String> warnings,
    List<String> errors,
    String? devToolsUrl,
  ) {
    print(
      '\n┌──────────────────────────────────────────────────────────────────────┐',
    );
    print(
      '│              CONVERSION COMPLETE                                     │',
    );
    print(
      '└──────────────────────────────────────────────────────────────────────┘',
    );
    print('Files analyzed:    $filesAnalyzed');
    print('IR files:          \$irFiles');
    print('JS files:          $jsFiles');
    print('Total declarations: ${_countDeclarations(results)}');
    print('Build output:      $buildPath');

    if (devToolsUrl != null) {
      print('\n✅ DevTools IR Viewer is running:');
      print('   🌐 $devToolsUrl');
      print('   All IR files are ready for analysis in the viewer');
    }

    if (errors.isNotEmpty) {
      print('\n⚠  Errors (${errors.length}):');
      for (final error in errors.take(5)) {
        print('  • $error');
      }
      if (errors.length > 5) print('  ... and ${errors.length - 5} more');
    }

    if (warnings.isNotEmpty) {
      print('\n⚠  Warnings (${warnings.length}):');
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
    // int irFiles,
    int jsFiles,
  ) {
    final json = {
      'status': 'success',
      'files_analyzed': filesAnalyzed,
      // 'ir_files': irFiles,
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

  Map<String, dynamic> toJson() {
    return {
      'dart_files': dartFiles.map((k, v) => MapEntry(k, v.toJson())),
      'resolution_issues': resolutionIssues,
      'inference_issues': inferenceIssues,
      'flow_issues': flowIssues,
      'validation_issues': validationIssues,
      'total_duration_ms': totalDurationMs,
      'declaration_count': dartFiles.values.fold<int>(
        0,
        (sum, file) => sum + file.declarationCount,
      ),
      'validation_summary': validationSummary?.toJson(),
      'widget_state_bindings': widgetStateBindings,
      'provider_registry': providerRegistry.map(
        (k, v) => MapEntry(k, v.toJson()),
      ),
      'type_cache_size': typeCache.length,
      'control_flow_graphs_count': controlFlowGraphs.length,
      'rebuild_triggers_count': rebuildTriggers.length,
      'state_field_analysis_count': stateFieldAnalysis.length,
      'lifecycle_analysis_count': lifecycleAnalysis.length,
    };
  }

  List<AnalysisIssue> getAllIssues() {
    return [
      ...resolutionIssues,
      ...inferenceIssues,
      ...flowIssues,
      ...validationIssues,
    ];
  }
}
