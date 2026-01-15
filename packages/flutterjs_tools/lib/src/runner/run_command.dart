// ============================================================================
// UNIFIED COMMAND - Complete Analysis → IR Generation → JS Conversion Pipeline
// WITH INTEGRATED DEVTOOLS IR VIEWER SERVER
// ============================================================================

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:flutterjs_dev_tools/dev_tools.dart';
import 'package:args/command_runner.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'package:flutterjs_tools/src/runner/code_pipleiline.dart';
import 'package:flutterjs_tools/src/runner/engine_bridge.dart';
import 'package:flutterjs_tools/src/runner/helper.dart';
import 'package:path/path.dart' as path;
import 'package:dart_analyzer/dart_analyzer.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart' as com;

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

/// ============================================================================
/// RunCommand - Main orchestrator (delegating to specialists)
/// ============================================================================
class RunCommand extends Command<void> {
  RunCommand({required this.verbose, required this.verboseHelp}) {
    _registerArguments();
  }

  final bool verbose;
  final bool verboseHelp;
  BinaryIRServer? _devToolsServer;
  EngineBridgeManager? _engineBridgeManager;

  void _registerArguments() {
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
        help: 'Do not auto-open browser for DevTools.',
        negatable: false,
      )
      ..addFlag(
        'incremental',
        help: 'Use incremental caching (only reprocess changed files)',
        defaultsTo: true,
      )
      ..addFlag(
        'hot-reload',
        help: 'Enable hot-reload mode (watch for changes and auto-rebuild)',
        negatable: false,
      )
      ..addFlag(
        'clear-cache',
        help: 'Clear cache and do full rebuild',
        negatable: false,
      )
      ..addOption(
        'cache-dir',
        help: 'Custom cache directory path',
        defaultsTo: null,
      )
      ..addOption(
        'debounce-time',
        help: 'File watcher debounce time in ms (default: 500)',
        defaultsTo: '500',
      )
      ..addFlag(
        'serve',
        help: 'Start dev server after JS conversion (requires --to-js)',
        negatable: false,
      )
      ..addOption(
        'server-port',
        help: 'Port for the FlutterJS dev server (default: 3000)',
        defaultsTo: '3000',
      )
      ..addFlag(
        'open-browser',
        help: 'Open browser automatically when server starts',
        defaultsTo: true,
      );
  }

  @override
  String get name => 'run';

  @override
  String get description =>
      'Complete pipeline: Analysis → IR Generation → JS Conversion (Phases 0-6)\n'
      'With integrated DevTools IR Viewer and Debugger';

  @override
  Future<void> run() async {
    try {
      // Parse CLI arguments
      final config = _parseConfig();

      // Setup phase
      final context = await debugger.observe(
        'setup_phase',
        () => _setupContext(config),
        category: 'setup',
      );
      if (context == null) exit(1);

      // Execute pipeline
      final results = await _executePipeline(config, context);

      // Report results (DON'T call printSummary here!)
      await _reportResults(config, context, results);

      // Start dev server if --serve flag is set (requires --to-js)
      if (config.serve &&
          config.toJs &&
          results.jsConversion.filesGenerated > 0) {
        await _startDevServer(config, context);
      }

      // Cleanup (DON'T call printSummary here either!)
      await _cleanup(config, context);

      // ✅ ONLY place where printSummary should be called
      debugger.printSummary(force: true);
    } catch (e, st) {
      _handleFatalError(e, st);
      // Print summary even on error
      debugger.printSummary(force: true);
    }
  }

  // =========================================================================
  // PHASE 0: CONFIGURATION & SETUP
  // =========================================================================

  PipelineConfig _parseConfig() {
    return PipelineConfig(
      projectPath: argResults!['project'] as String,
      sourcePath: argResults!['source'] as String,
      jsonOutput: argResults!['json'] as bool,
      enableParallel: argResults!['parallel'] as bool,
      maxParallelism: int.parse(argResults!['max-parallelism'] as String),
      enableIncremental:
          argResults!['incremental'] as bool && !(argResults!['all'] as bool),
      skipAnalysis: argResults!['skip-analysis'] as bool,
      showAnalysis: argResults!['show-analysis'] as bool,
      strictMode: argResults!['strict'] as bool,
      toJs: argResults!['to-js'] as bool,
      jsOptLevel: int.parse(argResults!['js-optimization-level'] as String),
      validateOutput: argResults!['validate-output'] as bool,
      generateReports: argResults!['generate-reports'] as bool,
      devToolsPort:
          int.tryParse(argResults!['devtools-port'] as String) ?? 8765,
      devToolsNoOpen: argResults!['devtools-no-open'] as bool,
      enableDevTools: !(argResults!['devtools-no-open'] as bool),
      // New: Dev server configuration
      serve: argResults!['serve'] as bool,
      serverPort: int.tryParse(argResults!['server-port'] as String) ?? 3000,
      openBrowser: argResults!['open-browser'] as bool,
      verbose: verbose,
    );
  }

  Future<PipelineContext?> _setupContext(PipelineConfig config) async {
    final setupManager = SetupManager(config: config, verbose: verbose);
    return await setupManager.setup();
  }

  Future<void> runWithUnifiedPipeline({
    required List<String> dartFiles,
    required String outputPath,
    required int optimizationLevel,
    required bool validate,
    config,
  }) async {
    final pipeline = UnifiedConversionPipeline(config: config);

    int successCount = 0;
    int failureCount = 0;

    for (final dartFilePath in dartFiles) {
      try {
        final dartFile = _loadDartFile(dartFilePath);
        final jsOutputPath = _getJsOutputPath(dartFilePath, outputPath);

        final result = await pipeline.executeFullPipeline(
          dartFile: dartFile,
          outputPath: jsOutputPath,
          validate: validate,
          optimize: optimizationLevel > 0,
          optimizationLevel: optimizationLevel,
        );

        if (result.success) {
          successCount++;
          result.printReport();
        } else {
          failureCount++;
          result.printReport();
        }
      } catch (e) {
        failureCount++;
        print('❌ Error processing $dartFilePath: $e');
      }
    }

    pipeline.printSummary();
    print('\n✅ Processed: $successCount successful');
    print('❌ Failed: $failureCount');
  }

  DartFile _loadDartFile(String path) {
    // TODO: Implement based on your DartFile loader
    throw UnimplementedError();
  }

  String _getJsOutputPath(String dartPath, String outputDir) {
    final basename = path.basenameWithoutExtension(dartPath);
    return path.join(outputDir, '$basename.js');
  }

  // =========================================================================
  // PHASE 1-6: PIPELINE EXECUTION
  // =========================================================================

  Future<PipelineResults> _executePipeline(
    PipelineConfig config,
    PipelineContext context,
  ) async {
    if (!config.jsonOutput) {
      OutputFormatter.printHeader(context);
    }

    // Start DevTools if enabled
    if (config.enableDevTools) {
      _devToolsServer = await debugger.observe(
        'devtools_startup',
        () => DevToolsManager.start(config, context),
        category: 'devtools',
      );
    }

    // Run analysis & IR generation
    final analysisResults = await debugger.observe(
      'phase_1_analysis',
      () => AnalysisPhase.execute(config, context, verbose),
      category: 'analysis',
    );
    final irResults = await debugger.observe(
      'phase_2_ir_generation',
      () =>
          IRGenerationPhase.execute(config, context, analysisResults, verbose),
      category: 'ir_generation',
    );

    // Convert to JavaScript
    var jsResults = JSConversionResult.empty();

    // ✅ FIX: Check the flag properly
    if (config.toJs) {
      if (!config.jsonOutput) {
        print('');
        print('PHASES 4-6: Converting IR to JavaScript...');
      }

      jsResults = await debugger.observe(
        'phase_4_6_js_conversion',
        () => JSConversionPhase.execute(config, context, irResults, verbose),
        category: 'js_conversion',
      );
    } else {
      if (!config.jsonOutput) {
        print('');
        print('⏭️  Skipping JS conversion (--to-js flag not set)');
      }
    }

    return PipelineResults(
      analysis: analysisResults,
      irGeneration: irResults,
      jsConversion: jsResults,
      duration: Stopwatch()..start(),
    );
  }
  // =========================================================================
  // REPORTING & OUTPUT
  // =========================================================================

  Future<void> _reportResults(
    PipelineConfig config,
    PipelineContext context,
    PipelineResults results,
  ) async {
    final reporter = ResultReporter(
      config: config,
      context: context,
      verbose: verbose,
    );

    if (config.generateReports) {
      await reporter.generateDetailedReports(results);
    }

    if (config.jsonOutput) {
      reporter.printJsonOutput(results);
    } else {
      reporter.printHumanOutput(results);
      if (config.enableDevTools && _devToolsServer != null) {
        reporter.printDevToolsInfo(_devToolsServer!.port);
      }
    }
  }

  // =========================================================================
  // DEV SERVER
  // =========================================================================

  Future<void> _startDevServer(
    PipelineConfig config,
    PipelineContext context,
  ) async {
    _engineBridgeManager = EngineBridgeManager();

    // Step 1: Initialize JS project structure (creates flutterjs.config.js, package.json)
    if (!config.jsonOutput) {
      print('\n📦 Setting up FlutterJS project...');
    }

    final initSuccess = await _engineBridgeManager!.initProject(
      buildPath: context.buildPath,
      verbose: config.verbose,
    );

    if (!initSuccess) {
      print('⚠️  JS project init failed, but continuing to try dev server...');
    }

    // Step 2: Start the dev server from build/flutterjs
    if (!config.jsonOutput) {
      print('\n🚀 Starting FlutterJS Dev Server...');
    }

    final result = await _engineBridgeManager!.startAfterBuild(
      buildPath: context.buildPath, // JS CLI runs from here
      jsOutputPath: context.jsOutputPath, // .fjs files are in lib/
      port: config.serverPort,
      openBrowser: config.openBrowser,
      verbose: config.verbose,
    );

    if (!result.success) {
      print('\n❌ Failed to start dev server: ${result.errorMessage}');
      return;
    }

    if (!config.jsonOutput) {
      // JS server already prints the URL, so we just print project info for context
      print('   📁 Project root: ${context.buildPath}');
    }
  }

  // =========================================================================
  // CLEANUP & SHUTDOWN
  // =========================================================================

  Future<void> _cleanup(PipelineConfig config, PipelineContext context) async {
    // Check if either DevTools or Dev Server are running
    final devToolsRunning = config.enableDevTools && _devToolsServer != null;
    final devServerRunning = _engineBridgeManager?.isRunning ?? false;

    if (devToolsRunning || devServerRunning) {
      if (!config.jsonOutput) {
        print('\n⏳ Server(s) running. Press "q" or Ctrl+C to stop.');
        if (devToolsRunning) {
          print('   🔧 DevTools: http://localhost:${_devToolsServer!.port}');
        }
        if (devServerRunning) {
          print('   🌐 Dev Server: http://localhost:${config.serverPort}');
        }
        print('');
      }

      // Wait for Ctrl+C
      await _waitForExit();
    }

    // Cleanup resources
    if (_engineBridgeManager != null) {
      await _engineBridgeManager!.stop();
    }

    if (config.strictMode &&
        (debugger.logs.any((l) => l.level == DebugLevel.error))) {
      exit(1);
    }
  }

  /// Wait for user to press Ctrl+C or 'q'
  Future<void> _waitForExit() async {
    final completer = Completer<void>();

    // Handle SIGINT (Ctrl+C)
    final sigintSub = ProcessSignal.sigint.watch().listen((signal) {
      if (!completer.isCompleted) {
        print('\n\n👋 Shutting down...');
        completer.complete();
      }
    });

    // Also listen to stdin for 'q' to quit (keeps process alive in interactive mode)
    StreamSubscription? stdinSub;
    try {
      if (stdin.hasTerminal) {
        // Only configure terminal if we own it
        try {
          stdin.echoMode = false;
          stdin.lineMode = false;
        } catch (_) {}

        stdinSub = stdin.listen((data) {
          final char = String.fromCharCodes(data);
          if (char.toLowerCase() == 'q') {
            if (!completer.isCompleted) {
              print('\n\n👋 Quitting...');
              completer.complete();
            }
          }
        });
      }
    } catch (e) {
      // Ignore stdin errors (e.g. if piped or non-interactive)
    }

    // Keep running until signal received or process exits
    await completer.future;

    await sigintSub.cancel();
    await stdinSub?.cancel();
  }

  void _handleFatalError(dynamic e, StackTrace st) {
    print('\nFatal error: $e');
    if (verbose) print('Stack trace:\n$st');

    // Cleanup on error
    _engineBridgeManager?.stop();

    exit(1);
  }
}

// =========================================================================
// SEPARATED MANAGERS - Each handles one responsibility
// =========================================================================

/// Handles directory setup, validation, and initialization
class SetupManager {
  final PipelineConfig config;
  final bool verbose;

  SetupManager({required this.config, required this.verbose});

  Future<PipelineContext?> setup() async {
    try {
      final projectDir = Directory(config.projectPath);
      if (!await projectDir.exists()) {
        print('Error: Project directory not found at ${config.projectPath}');
        return null;
      }

      final absoluteProjectPath = path.normalize(projectDir.absolute.path);
      final absoluteSourcePath = path.join(
        absoluteProjectPath,
        config.sourcePath,
      );

      // Create output directories
      // build/flutterjs/ is the JS project root (where flutterjs.exe will run)
      // build/flutterjs/src/ is where .js files go (matches JS CLI's entry.main: 'src/main.js')
      // build/reports/ is for Dart CLI reports (separate from JS project)
      final buildDir = path.join(absoluteProjectPath, 'build');
      final flutterJsDir = path.join(buildDir, 'flutterjs');
      final jsOutputPath = path.join(
        flutterJsDir,
        'src',
      ); // Using src/ to match JS example
      final reportsPath = path.join(
        buildDir,
        'reports',
      ); // Keep reports outside flutterjs

      if (config.toJs) await Directory(jsOutputPath).create(recursive: true);
      if (config.generateReports) {
        await Directory(reportsPath).create(recursive: true);
      }

      // Initialize parser
      if (!config.jsonOutput) print('Initializing Dart parser...\n');
      DartFileParser.initialize(projectRoot: absoluteProjectPath);

      return PipelineContext(
        projectPath: absoluteProjectPath,
        sourcePath: absoluteSourcePath,
        buildPath: flutterJsDir,
        jsOutputPath: jsOutputPath,
        reportsPath: reportsPath,
      );
    } catch (e) {
      print('Setup error: $e');
      return null;
    }
  }
}

/// Manages DevTools server lifecycle
class DevToolsManager {
  static Future<BinaryIRServer?> start(
    PipelineConfig config,
    PipelineContext context,
  ) async {
    try {
      if (!config.jsonOutput) print('🔧 Starting DevTools IR Viewer...');

      final server = BinaryIRServer(
        port: config.devToolsPort,
        host: 'localhost',
        verbose: config.verbose,
        //watchDirectory: context.irOutputPath, // ❌ FIX #1: UNCOMMENTED
      );

      await server.start();

      if (!config.jsonOutput) {
        print('✅ DevTools started on http://localhost:${config.devToolsPort}');
      }

      if (!config.devToolsNoOpen) {
        await _openBrowserAsync('http://localhost:${config.devToolsPort}');
      }

      return server;
    } catch (e) {
      print('⚠️  Failed to start DevTools: $e');
      return null;
    }
  }

  static Future<void> _openBrowserAsync(String url) async {
    try {
      if (Platform.isWindows) {
        await Process.run('start', [url]);
      } else if (Platform.isMacOS) {
        await Process.run('open', [url]);
      } else if (Platform.isLinux) {
        await Process.run('xdg-open', [url]);
      }
    } catch (_) {
      // Silently fail
    }
  }
}

/// Handles analysis phase (no IR generation yet)
class AnalysisPhase {
  static Future<AnalysisResults> execute(
    PipelineConfig config,
    PipelineContext context,
    bool verbose,
  ) async {
    return await debugger.observe('analysis_phase', () async {
      if (!config.jsonOutput) print('PHASE 1: Analyzing project...\n');

      if (config.skipAnalysis) {
        return await debugger.observe(
          'discover_all_dart_files',
          () async => AnalysisResults.skipped(
            filesToConvert: await _discoverAllDartFiles(
              path.normalize(context.sourcePath),
            ),
          ),
          category: 'analysis',
        );
      }

      return await debugger.observe('project_analysis', () async {
        final analyzer = ProjectAnalyzer(
          context.projectPath,
          maxParallelism: config.maxParallelism,
          enableVerboseLogging: verbose,
        );

        try {
          await debugger.observe(
            'analyzer_initialization',
            () => analyzer.initialize(),
            category: 'analysis',
          );

          final orchestrator = ProjectAnalysisOrchestrator(analyzer);
          final report = await debugger.observe(
            'orchestrated_analysis',
            () => orchestrator.analyze(),
            category: 'analysis',
          );

          if (!config.jsonOutput) {
            _printAnalysisSummary(report, config.showAnalysis);
            print('\n  Files for conversion: ${report.changedFiles.length}\n');
          }

          analyzer.dispose();
          return AnalysisResults.success(report);
        } catch (e) {
          analyzer.dispose();
          rethrow;
        }
      }, category: 'analysis');
    }, category: 'analysis');
  }

  static Future<List<String>> _discoverAllDartFiles(String sourceDir) async {
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

  static void _printAnalysisSummary(
    ProjectAnalysisReport report,
    bool detailed,
  ) {
    final stats = report.analysisResult.statistics;
    print('Analysis Results:');
    print('  Total files: ${stats.totalFiles}');
    print('  Changed: ${report.changedFiles.length}');
    print('  Errors: ${report.filesWithErrors.length}');
  }
}

/// Handles IR generation (Passes 1-5)
class IRGenerationPhase {
  static Future<IRGenerationResults> execute(
    PipelineConfig config,
    PipelineContext context,
    AnalysisResults analysisResults,
    bool verbose,
  ) async {
    return await debugger.observe('ir_generation_phase', () async {
      if (!config.jsonOutput) {
        print(
          'PHASE 2: Generating IR for ${analysisResults.filesToConvert.length} files...\n',
        );
      }

      final irGenerator = IRGenerator(verbose: verbose);
      final results = await debugger.observe(
        'all_ir_passes',
        () => irGenerator.generateIR(
          dartFiles: analysisResults.filesToConvert,
          projectRoot: context.projectPath,
          parallel: config.enableParallel,
          maxParallelism: config.maxParallelism,
        ),
        category: 'ir_generation',
      );

      // Serialize IR
      if (!config.jsonOutput) print('PHASE 3: Serializing IR...\n');
      await debugger.observe(
        'ir_serialization',
        () => _serializeIR(results, context.reportsPath),
        category: 'ir_generation',
      );

      return results;
    }, category: 'ir_generation');
  }

  static Future<void> _serializeIR(
    IRGenerationResults results,
    String reportsPath,
  ) async {
    final reportFile = File(path.join(reportsPath, 'conversion_report.json'));
    await reportFile.parent.create(recursive: true);
    await reportFile.writeAsString(jsonEncode(results.toJson()));
  }
}

/// Handles JavaScript conversion (Phases 4-6)
/// Handles JavaScript conversion (Phases 4-6)
class JSConversionPhase {
  static Future<JSConversionResult> execute(
    PipelineConfig config,
    PipelineContext context,
    IRGenerationResults irResults,
    bool verbose,
  ) async {
    return await debugger.observe('js_conversion_phase', () async {
      if (!config.jsonOutput) {
        print(
          'PHASES 4-6: Converting IR to JavaScript with Validation & Optimization\n',
        );
      }

      int filesGenerated = 0;
      int filesFailed = 0;
      final warnings = <String>[];
      final errors = <String>[];

      final pipeline = UnifiedConversionPipeline(config: config);

      for (final entry in irResults.dartFiles.entries) {
        final dartFilePath = entry.key;
        final dartFile = entry.value;
        final fileName = path.basename(dartFilePath);

        try {
          final normalizedDartPath = path.normalize(dartFilePath);
          final normalizedSourcePath = path.normalize(context.sourcePath);

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
          final jsFileName = '$fileNameWithoutExt.fjs';

          final jsOutputFile = relativeDir.isEmpty
              ? File(path.join(context.jsOutputPath, jsFileName))
              : File(path.join(context.jsOutputPath, relativeDir, jsFileName));

          if (verbose) {
            print('  Processing: $fileName');
          }

          final pipelineResult = await pipeline.executeFullPipeline(
            dartFile: dartFile,
            outputPath: jsOutputFile.path,
            validate: config.validateOutput,
            optimize: config.jsOptLevel > 0,
            optimizationLevel: config.jsOptLevel,
          );

          if (!pipelineResult.success) {
            filesFailed++;
            final errorMsg = pipelineResult.errorMessage ?? 'Unknown error';
            errors.add('$fileName: $errorMsg');

            if (verbose) {
              print('    ❌ Failed: $errorMsg');
            }

            if (config.strictMode) {
              exit(1);
            }
            continue;
          }

          // ✅ WRITE THE FILE
          filesGenerated++;
          await jsOutputFile.parent.create(recursive: true);
          await jsOutputFile.writeAsString(pipelineResult.code ?? '');

          if (verbose) {
            final sizeKb = ((pipelineResult.code?.length ?? 0) / 1024)
                .toStringAsFixed(2);
            print('    ✅ Generated ($sizeKb KB)');
          }

          // Collect warnings
          if (pipelineResult.diagnosticReport != null) {
            for (final issue in pipelineResult.diagnosticReport!.issues) {
              if (issue.severity == DiagnosticSeverity.warning) {
                warnings.add('$fileName: ${issue.message}');
              }
            }
          }
        } catch (e, st) {
          filesFailed++;
          errors.add('$fileName: Exception: $e');

          if (verbose) {
            print('    ❌ Error: $e');
            print('       $st');
          }

          if (config.strictMode) {
            exit(1);
          }
        }
      }

      if (!config.jsonOutput) {
        print('\n  Generated: $filesGenerated files ✅');
        print('  Failed: $filesFailed files ❌');
        if (warnings.isNotEmpty) print('  Warnings: ${warnings.length} ⚠️');
        if (errors.isNotEmpty) print('  Errors: ${errors.length} ❌');
        print('');
      }

      return JSConversionResult(
        filesGenerated: filesGenerated,
        filesFailed: filesFailed,
        warnings: warnings,
        errors: errors,
        outputPath: context.jsOutputPath,
      );
    }, category: 'js_conversion');
  }
}

/// Centralized result reporting (removes duplicate output)
class ResultReporter {
  final PipelineConfig config;
  final PipelineContext context;
  final bool verbose;

  ResultReporter({
    required this.config,
    required this.context,
    required this.verbose,
  });

  Future<void> generateDetailedReports(PipelineResults results) async {
    // Generate reports to files only
    final reportGenerator = DetailedReportGenerator(context.reportsPath);
    await reportGenerator.generateAll(results);
  }

  void printJsonOutput(PipelineResults results) {
    final json = {
      'status': 'success',
      'files_analyzed': results.analysis.filesToConvert.length,
      'js_files': results.jsConversion.filesGenerated,
      'declarations': _countDeclarations(results.irGeneration),
      'duration_ms': results.duration.elapsedMilliseconds,
    };
    print(jsonEncode(json));
  }

  void printHumanOutput(PipelineResults results) {
    OutputFormatter.printFinalResults(results: results, config: config);
  }

  void printDevToolsInfo(int port) {
    print('\n✅ DevTools IR Viewer is running:');
    print('   🌐 http://localhost:$port');
    print('   All IR files are ready for analysis in the viewer\n');
  }

  int _countDeclarations(IRGenerationResults results) {
    int count = 0;
    for (final file in results.dartFiles.values) {
      count += file.declarationCount;
    }
    return count;
  }
}

/// Handles detailed report generation
class DetailedReportGenerator {
  final String reportsPath;

  DetailedReportGenerator(this.reportsPath);

  // ❌ FIX #2: FULL IMPLEMENTATION
  Future<void> generateAll(PipelineResults results) async {
    try {
      // Generate summary report
      final summaryReport = {
        'timestamp': DateTime.now().toIso8601String(),
        'analysis': {
          'files_analyzed': results.analysis.filesToConvert.length,
          'files_skipped': results.analysis.skipped ? 'all' : 'none',
        },
        'ir_generation': {
          'total_files': results.irGeneration.dartFiles.length,
          'declarations': results.irGeneration.dartFiles.values.fold<int>(
            0,
            (sum, file) => sum + file.declarationCount,
          ),
          'resolution_issues': results.irGeneration.resolutionIssues.length,
          'inference_issues': results.irGeneration.inferenceIssues.length,
          'flow_issues': results.irGeneration.flowIssues.length,
          'validation_issues': results.irGeneration.validationIssues.length,
          'duration_ms': results.irGeneration.totalDurationMs,
        },
        'js_conversion': {
          'files_generated': results.jsConversion.filesGenerated,
          'files_failed': results.jsConversion.filesFailed,
          'warnings': results.jsConversion.warnings.length,
          'errors': results.jsConversion.errors.length,
        },
      };

      final summaryFile = File(path.join(reportsPath, 'summary_report.json'));
      await summaryFile.parent.create(recursive: true);
      await summaryFile.writeAsString(jsonEncode(summaryReport));

      // Generate detailed issues report if any
      if (results.irGeneration.getAllIssues().isNotEmpty) {
        final issuesReport = {
          'timestamp': DateTime.now().toIso8601String(),
          'total_issues': results.irGeneration.getAllIssues().length,
          'issues': results.irGeneration
              .getAllIssues()
              .map(
                (issue) => {
                  'type': issue.runtimeType.toString(),
                  'message': issue.toString(),
                },
              )
              .toList(),
        };

        final issuesFile = File(path.join(reportsPath, 'issues_report.json'));
        await issuesFile.writeAsString(jsonEncode(issuesReport));
      }

      // Generate JS conversion errors if any
      if (results.jsConversion.errors.isNotEmpty ||
          results.jsConversion.warnings.isNotEmpty) {
        final jsReport = {
          'timestamp': DateTime.now().toIso8601String(),
          'errors': results.jsConversion.errors,
          'warnings': results.jsConversion.warnings,
        };

        final jsReportFile = File(
          path.join(reportsPath, 'js_conversion_report.json'),
        );
        await jsReportFile.writeAsString(jsonEncode(jsReport));
      }
    } catch (e) {
      print('Warning: Failed to generate detailed reports: $e');
    }
  }
}

/// Output formatting (console only, no logic)
class OutputFormatter {
  static void printHeader(PipelineContext context) {
    print('''\n
┌────────────────────────────────────────────────────────────────────────────┐
│    FLUTTER IR TO JAVASCRIPT CONVERSION PIPELINE (Phases 0-6)        │
└────────────────────────────────────────────────────────────────────────────┘
Project:  ${context.projectPath}
Source:   ${context.sourcePath}
Build:    ${context.buildPath}
''');
  }

  static void printFinalResults({
    required PipelineResults results,
    required PipelineConfig config,
  }) {
    print('''\n
┌────────────────────────────────────────────────────────────────────────────┐
│              CONVERSION COMPLETE                                     │
└────────────────────────────────────────────────────────────────────────────┘
Files analyzed:    ${results.analysis.filesToConvert.length}
JS files:          ${results.jsConversion.filesGenerated}
Build output:      ${results.jsConversion.outputPath}
''');
  }
}

// =========================================================================
// DATA MODELS - Configuration & Results
// =========================================================================

class PipelineConfig {
  final String projectPath;
  final String sourcePath;
  final bool jsonOutput;
  final bool enableParallel;
  final int maxParallelism;
  final bool enableIncremental;
  final bool skipAnalysis;
  final bool showAnalysis;
  final bool strictMode;
  final bool toJs;
  final int jsOptLevel;
  final bool validateOutput;
  final bool generateReports;
  final int devToolsPort;
  final bool devToolsNoOpen;
  final bool enableDevTools;

  // Dev server configuration
  final bool serve;
  final int serverPort;
  final bool openBrowser;

  final bool verbose;

  PipelineConfig({
    required this.projectPath,
    required this.sourcePath,
    required this.jsonOutput,
    required this.enableParallel,
    required this.maxParallelism,
    required this.enableIncremental,
    required this.skipAnalysis,
    required this.showAnalysis,
    required this.strictMode,
    required this.toJs,
    required this.jsOptLevel,
    required this.validateOutput,
    required this.generateReports,
    required this.devToolsPort,
    required this.devToolsNoOpen,
    required this.enableDevTools,
    required this.serve,
    required this.serverPort,
    required this.openBrowser,
    required this.verbose,
  });
}

class PipelineContext {
  final String projectPath;
  final String sourcePath;
  final String buildPath;

  final String jsOutputPath;
  final String reportsPath;

  PipelineContext({
    required this.projectPath,
    required this.sourcePath,
    required this.buildPath,

    required this.jsOutputPath,
    required this.reportsPath,
  });
}

class PipelineResults {
  final AnalysisResults analysis;
  final IRGenerationResults irGeneration;
  final JSConversionResult jsConversion;
  final Stopwatch duration;

  PipelineResults({
    required this.analysis,
    required this.irGeneration,
    required this.jsConversion,
    required this.duration,
  });
}

class AnalysisResults {
  final List<String> filesToConvert;
  final ProjectAnalysisReport? report;
  final bool skipped;

  AnalysisResults({
    required this.filesToConvert,
    required this.report,
    required this.skipped,
  });

  factory AnalysisResults.skipped({required List<String> filesToConvert}) {
    return AnalysisResults(
      filesToConvert: filesToConvert,
      report: null,
      skipped: true,
    );
  }

  factory AnalysisResults.success(ProjectAnalysisReport report) {
    return AnalysisResults(
      filesToConvert: report.changedFiles.toList(),
      report: report,
      skipped: false,
    );
  }
}

class JSConversionResult {
  final int filesGenerated;
  final int filesFailed;
  final List<String> warnings;
  final List<String> errors;
  final String? outputPath;

  JSConversionResult({
    required this.filesGenerated,
    required this.filesFailed,
    required this.warnings,
    required this.errors,
    required this.outputPath,
  });

  factory JSConversionResult.empty() {
    return JSConversionResult(
      filesGenerated: 0,
      filesFailed: 0,
      warnings: [],
      errors: [],
      outputPath: null,
    );
  }
}

// ADD THIS:
// ADD THIS NEW CLASS TO DOCUMENT 1
// Place it after JSConversionPhase class (around line 550)

class JSConverter {
  final PipelineConfig config;
  final PipelineContext context;
  final bool verbose;

  JSConverter({
    required this.config,
    required this.context,
    required this.verbose,
  });

  Future<JSConversionResult> convertAll(IRGenerationResults irResults) async {
    int filesGenerated = 0;
    int filesFailed = 0;
    final warnings = <String>[];
    final errors = <String>[];

    final pipeline = UnifiedConversionPipeline(config: config);

    for (final entry in irResults.dartFiles.entries) {
      final dartFilePath = entry.key;
      final dartFile = entry.value;
      final fileName = path.basename(dartFilePath);

      try {
        await debugger.observe('convert_$fileName', () async {
          final normalizedDartPath = path.normalize(dartFilePath);
          final normalizedSourcePath = path.normalize(context.sourcePath);

          if (!normalizedDartPath.startsWith(normalizedSourcePath)) {
            if (verbose) {
              debugger.log(
                DebugLevel.warn,
                'Skipping: $dartFilePath (outside source path)',
                category: 'js_conversion',
              );
            }
            return;
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

          final jsOutputFile = relativeDir.isEmpty
              ? File(path.join(context.jsOutputPath, jsFileName))
              : File(path.join(context.jsOutputPath, relativeDir, jsFileName));

          if (verbose) {
            debugger.log(
              DebugLevel.debug,
              'Processing: $fileName',
              category: 'js_conversion',
            );
          }

          final pipelineResult = await pipeline.executeFullPipeline(
            dartFile: dartFile,
            outputPath: jsOutputFile.path,
            validate: config.validateOutput,
            optimize: config.jsOptLevel > 0,
            optimizationLevel: config.jsOptLevel,
          );

          if (!pipelineResult.success) {
            filesFailed++;
            final errorMsg = pipelineResult.errorMessage ?? 'Unknown error';
            errors.add('$fileName: $errorMsg');

            debugger.log(
              DebugLevel.error,
              'Failed: $errorMsg',
              category: 'js_conversion',
            );

            if (config.strictMode) exit(1);
            return;
          }

          filesGenerated++;
          await jsOutputFile.parent.create(recursive: true);
          await jsOutputFile.writeAsString(pipelineResult.code ?? '');

          if (verbose) {
            final sizeKb = ((pipelineResult.code?.length ?? 0) / 1024)
                .toStringAsFixed(2);
            debugger.log(
              DebugLevel.debug,
              'Generated ($sizeKb KB)',
              category: 'js_conversion',
            );
          }

          if (pipelineResult.diagnosticReport != null) {
            for (final issue in pipelineResult.diagnosticReport!.issues) {
              if (issue.severity == DiagnosticSeverity.warning) {
                warnings.add('$fileName: ${issue.message}');

                debugger.log(
                  DebugLevel.warn,
                  issue.message,
                  category: 'js_conversion',
                );
              }
            }
          }
        }, category: 'js_conversion');
      } catch (e) {
        filesFailed++;
        errors.add('$fileName: Exception: $e');

        debugger.log(
          DebugLevel.error,
          'Error converting $fileName: $e',
          category: 'js_conversion',
        );

        if (config.strictMode) exit(1);
      }
    }

    return JSConversionResult(
      filesGenerated: filesGenerated,
      filesFailed: filesFailed,
      warnings: warnings,
      errors: errors,
      outputPath: context.jsOutputPath,
    );
  }
}

// ADD THIS:
class IRGenerator {
  final bool verbose;

  IRGenerator({required this.verbose});

  Future<IRGenerationResults> generateIR({
    required List<String> dartFiles,
    required String projectRoot,
    required bool parallel,
    required int maxParallelism,
  }) async {
    final stopwatch = Stopwatch()..start();
    final results = IRGenerationResults();

    try {
      await debugger.observe(
        'pass_1_declaration_discovery',
        () => _runDeclarationPass(
          dartFiles: dartFiles,
          projectRoot: projectRoot,
          results: results,
          verbose: verbose,
        ),
        category: 'ir_pass',
      );

      await debugger.observe(
        'pass_2_symbol_resolution',
        () => _runSymbolResolutionPass(results: results, verbose: verbose),
        category: 'ir_pass',
      );

      await debugger.observe(
        'pass_3_type_inference',
        () => _runTypeInferencePass(results: results, verbose: verbose),
        category: 'ir_pass',
      );

      await debugger.observe(
        'pass_4_flow_analysis',
        () => _runFlowAnalysisPass(results: results, verbose: verbose),
        category: 'ir_pass',
      );

      await debugger.observe(
        'pass_5_validation_diagnostics',
        () => _runValidationPass(results: results, verbose: verbose),
        category: 'ir_pass',
      );

      stopwatch.stop();
      results.totalDurationMs = stopwatch.elapsedMilliseconds;
    } catch (e) {
      stopwatch.stop();
      debugger.log(
        DebugLevel.error,
        'IR generation failed: $e',
        category: 'ir_pass',
      );
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
          debugger.log(
            DebugLevel.debug,
            '${path.basename(filePath)} (${dartFile.declarationCount} decls)',
            category: 'declaration_pass',
          );
        }
      } catch (e) {
        if (verbose) {
          debugger.log(
            DebugLevel.warn,
            'Error parsing ${path.basename(filePath)}: $e',
            category: 'declaration_pass',
          );
        }
      }
    }

    if (!verbose) {
      debugger.log(
        DebugLevel.debug,
        'Processed: $filesProcessed files',
        category: 'declaration_pass',
      );
    }
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

    debugger.log(
      DebugLevel.debug,
      'Resolved: ${pass.globalSymbolRegistry.length} symbols',
      category: 'symbol_resolution',
    );
  }

  Future<void> _runTypeInferencePass({
    required IRGenerationResults results,
    required bool verbose,
  }) async {
    // ✓ INTEGRATED: Use ExpressionVisitor + TypeInferenceVisitor
    final pass = TypeInferencePass(
      dartFiles: results.dartFiles,
      globalSymbols: {},
      providerRegistry: results.providerRegistry,
    );

    // Delegate to visitor-based inference (cleaner, more extensible)
    final expressionInferencer = ExpressionBasedTypeInferencer(
      globalSymbols: pass.globalSymbols,
      providerRegistry: pass.providerRegistry,
      typeCompatibilityGraph: pass.typeCompatibilityGraph,
    );

    pass.inferAllTypes();

    // NEW: Use visitors to infer expression types in field initializers
    for (final dartFile in results.dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        for (final field in classDecl.fields) {
          if (field.initializer != null) {
            final inferredType = expressionInferencer.infer(field.initializer!);

            if (verbose) {
              debugger.log(
                DebugLevel.debug,
                'Field ${field.name}: ${inferredType?.name ?? 'unknown'}',
                category: 'type_inference',
              );
            }
          }
        }

        // Infer types in method bodies
        for (final method in classDecl.methods) {
          if (method.body != null) {
            _inferTypesInMethodBody(
              method.body!,
              expressionInferencer,
              verbose,
            );
          }
        }
      }

      // Infer types in function bodies
      for (final func in dartFile.functionDeclarations) {
        if (func.body != null) {
          _inferTypesInMethodBody(func.body!, expressionInferencer, verbose);
        }
      }

      // Infer types in variable initializers
      for (final variable in dartFile.variableDeclarations) {
        if (variable.initializer != null) {
          final inferredType = expressionInferencer.infer(
            variable.initializer!,
          );

          if (verbose) {
            debugger.log(
              DebugLevel.debug,
              'Variable ${variable.name}: ${inferredType?.name ?? 'unknown'}',
              category: 'type_inference',
            );
          }
        }
      }
    }

    pass.inferAllTypes();
    results.inferenceIssues.addAll(pass.inferenceIssues);
    results.typeCache.addAll(pass.typeCache);

    debugger.log(
      DebugLevel.debug,
      'Inferred: ${pass.typeCache.length} expressions (visitor-based)',
      category: 'type_inference',
    );
  }

  // ADD THIS NEW METHOD TO IRGenerator CLASS
  void _inferTypesInMethodBody(
    dynamic body,
    ExpressionBasedTypeInferencer inferencer,
    bool verbose,
  ) {
    if (body is BlockStmt) {
      for (final stmt in body.statements) {
        _inferTypesInStatement(stmt, inferencer, verbose);
      }
    }
  }

  // ADD THIS NEW METHOD TO IRGenerator CLASS
  void _inferTypesInStatement(
    StatementIR stmt,
    ExpressionBasedTypeInferencer inferencer,
    bool verbose,
  ) {
    if (stmt is VariableDeclarationStmt && stmt.initializer != null) {
      final type = inferencer.infer(stmt.initializer!);
      if (verbose) {
        debugger.log(
          DebugLevel.debug,
          'Local ${stmt.name}: ${type?.name ?? 'unknown'}',
          category: 'type_inference',
        );
      }
    } else if (stmt is ExpressionStmt) {
      inferencer.infer(stmt.expression);
    } else if (stmt is IfStmt) {
      inferencer.infer(stmt.condition);
      _inferTypesInMethodBody(stmt.thenBranch, inferencer, verbose);
      if (stmt.elseBranch != null) {
        _inferTypesInMethodBody(stmt.elseBranch, inferencer, verbose);
      }
    } else if (stmt is BlockStmt) {
      _inferTypesInMethodBody(stmt, inferencer, verbose);
    } else if (stmt is ReturnStmt && stmt.expression != null) {
      inferencer.infer(stmt.expression!);
    }
  }

  Future<void> _runFlowAnalysisPass({
    required IRGenerationResults results,
    required bool verbose,
  }) async {
    // ✓ INTEGRATED: Use StatementVisitor + ReachabilityAnalyzer
    final pass = FlowAnalysisPass(
      dartFiles: results.dartFiles,
      typeInferenceInfo: {},
    );
    pass.analyzeAllFlows();

    // NEW: Use ReachabilityAnalyzer from statement_visitor.dart
    final reachabilityAnalyzer = ReachabilityAnalyzer();

    for (final dartFile in results.dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        for (final method in classDecl.methods) {
          if (method.body != null) {
            reachabilityAnalyzer.analyzeFunctionBody(method.body!);

            for (final location in reachabilityAnalyzer.unreachableLocations) {
              pass.addFlowIssue(
                severity: IssueSeverity.warning,
                message: 'Unreachable code detected',
                sourceLocation: SourceLocationIR(
                  id: 'loc_unreachable_${pass.flowIssues.length}',
                  file: dartFile.filePath,
                  line: 0,
                  column: 0,
                  offset: 0,
                  length: 0,
                ),
                code: 'UNREACHABLE_CODE',
              );

              if (verbose) {
                debugger.log(
                  DebugLevel.warn,
                  'Unreachable code in ${method.name}: $location',
                  category: 'flow_analysis',
                );
              }
            }
          }
        }
      }
    }

    results.flowIssues.addAll(pass.flowIssues);
    results.controlFlowGraphs.addAll(pass.controlFlowGraphs);
    results.rebuildTriggers.addAll(pass.rebuildTriggers);

    debugger.log(
      DebugLevel.debug,
      'Built: ${pass.controlFlowGraphs.length} CFGs, '
      'Found: ${reachabilityAnalyzer.unreachableLocations.length} unreachable code locations',
      category: 'flow_analysis',
    );
  }

  Future<void> _runValidationPass({
    required IRGenerationResults results,
    required bool verbose,
  }) async {
    // ✓ INTEGRATED: Use ConstantFolder + VariableCollector
    final pass = ValidationPass(
      dartFiles: results.dartFiles,
      flowAnalysisInfo: {},
    );
    pass.validateAll();

    // NEW: Use ConstantFolder to find optimization opportunities
    final constantFolder = ConstantFolder();
    final variableCollector = VariableCollector();

    for (final dartFile in results.dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        for (final field in classDecl.fields) {
          if (field.initializer != null) {
            // Check if initializer is compile-time constant
            final constValue = constantFolder.fold(field.initializer!);

            if (constValue != null && !field.isConst) {
              pass.addIssue(
                severity: IssueSeverity.info,
                category: IssueCategory.flutterMissingConst,
                message: 'Field "${field.name}" can be marked const',
                sourceLocation: field.sourceLocation,
                code: 'CONST_CANDIDATE',
                suggestion: 'Mark as `const` for optimization',
              );

              if (verbose) {
                debugger.log(
                  DebugLevel.info,
                  'Const candidate: ${field.name}',
                  category: 'validation',
                );
              }
            }

            // Collect variables used in initializer
            variableCollector.visit(field.initializer!);
            if (verbose && variableCollector.variables.isNotEmpty) {
              debugger.log(
                DebugLevel.debug,
                'Field ${field.name} uses: ${variableCollector.variables.join(', ')}',
                category: 'validation',
              );
            }
            variableCollector.variables.clear();
          }
        }

        // Check for unused variables in methods
        for (final method in classDecl.methods) {
          if (method.body != null) {
            final varExtractor = VariableDeclarationExtractor();
            final declaredVars = varExtractor.analyzeFunctionBody(method.body!);

            if (verbose && declaredVars.isNotEmpty) {
              debugger.log(
                DebugLevel.debug,
                'Method ${method.name} declares: ${declaredVars.join(', ')}',
                category: 'validation',
              );
            }
          }
        }
      }
    }

    results.validationIssues.addAll(pass.validationIssues);
    results.validationSummary = pass.summary;

    debugger.log(
      DebugLevel.debug,
      'Issues: ${pass.validationIssues.length} '
      '(${pass.summary.errorCount}E, ${pass.summary.warningCount}W, '
      '${pass.summary.infoCount}I)',
      category: 'validation',
    );
  }
}

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
