import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:flutterjs_tools/src/runner/helper.dart';
import 'package:path/path.dart' as path;
import 'package:flutterjs_analyzer/flutterjs_analyzer.dart';
import 'package:flutterjs_core/flutterjs_core.dart';

import 'package:analyzer/dart/ast/ast.dart';

// ============================================================================
// UNIFIED COMMAND - Analysis → IR Generation → JS Conversion Pipeline
// ============================================================================

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
        help: 'Analyze all files regardless of cache (disables incremental).',
        negatable: false,
      )
      ..addFlag(
        'to-js',
        help: 'Also convert generated IR to JavaScript.',
        negatable: false,
      )
      ..addFlag(
        'clear-cache',
        help: 'Clear analysis cache before running.',
        negatable: false,
      );
  }

  final bool verbose;
  final bool verboseHelp;

  @override
  String get name => 'run';

  @override
  String get description =>
      'Analyze Flutter project and generate IR. '
      'Phase 1: Analysis → Phase 2: IR Generation → Phase 3: JS Conversion (optional)';

  @override
  Future<void> run() async {
    final projectPath = argResults!['project'] as String;
    final sourcePath = argResults!['source'] as String;
    final jsonOutput = argResults!['json'] as bool;
    final enableParallel = argResults!['parallel'] as bool;
    final maxParallelism = int.parse(argResults!['max-parallelism'] as String);
    bool enableIncremental = argResults!['incremental'] as bool;
    final skipAnalysis = argResults!['skip-analysis'] as bool;
    final showAnalysis = argResults!['show-analysis'] as bool;
    final strictMode = argResults!['strict'] as bool;
    final analyzeAll = argResults!['all'] as bool;
    final toJs = argResults!['to-js'] as bool;
    final clearCache = argResults!['clear-cache'] as bool;

    // Disable incremental if analyzing all files
    if (analyzeAll) enableIncremental = false;

    // Validate project directory
    final projectDir = Directory(projectPath);
    if (!await projectDir.exists()) {
      print('Error: Project directory not found at $projectPath');
      exit(1);
    }

    final absoluteProjectPath = path.normalize(projectDir.absolute.path);
    final absoluteSourcePath = path.join(absoluteProjectPath, sourcePath);

    // ===== BUILD FOLDER STRUCTURE (Following Flutter conventions) =====
    final buildDir = path.join(absoluteProjectPath, 'build');
    final flutterJsDir = path.join(buildDir, 'flutterjs');
    final irOutputPath = path.join(flutterJsDir, 'ir');
    final jsOutputPath = path.join(flutterJsDir, 'js');
    final analysisReportPath = path.join(flutterJsDir, 'analysis');

    if (!jsonOutput) {
      print('');
      print('╔═════════════════════════════════════════╗');
      print('║   FLUTTER IR GENERATION PIPELINE        ║');
      print('╚═════════════════════════════════════════╝');
      print('Project:  $absoluteProjectPath');
      print('Source:   $absoluteSourcePath');
      print('Output:   $flutterJsDir');
      if (toJs) print('  ├─ IR:   $irOutputPath');
      if (toJs) print('  └─ JS:   $jsOutputPath');
      print('');
    }

    int jsFileCount = 0;

    try {
      // Create build directory structure
      await Directory(buildDir).create(recursive: true);
      await Directory(flutterJsDir).create(recursive: true);
      await Directory(irOutputPath).create(recursive: true);
      if (toJs) await Directory(jsOutputPath).create(recursive: true);
      await Directory(analysisReportPath).create(recursive: true);

      // Clear cache if requested
      if (clearCache) {
        if (!jsonOutput) print('Clearing cache...\n');
        final cacheDir = Directory(path.join(flutterJsDir, '.cache'));
        if (await cacheDir.exists()) {
          await cacheDir.delete(recursive: true);
        }
      }

      // Initialize Dart parser
      try {
        if (!jsonOutput) print('Initializing Dart parser...\n');
        DartFileParser.initialize(projectRoot: absoluteProjectPath);
      } catch (e) {
        print('Error: Failed to initialize Dart parser: $e');
        exit(1);
      }

      // ===== PHASE 1: ANALYSIS =====
      List<String> filesToConvert = [];

      if (analyzeAll) {
        if (!jsonOutput) print('PHASE 1: Discovering all Dart files...\n');
        filesToConvert = await _discoverAllDartFiles(absoluteSourcePath);
        if (!jsonOutput) {
          print('  Files discovered: ${filesToConvert.length}\n');
        }
      } else if (skipAnalysis) {
        if (!jsonOutput)
          print('PHASE 1: Skipping analysis (discovering all files)...\n');
        filesToConvert = await _discoverAllDartFiles(absoluteSourcePath);
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
              'Error: ${analysisReport.filesWithErrors.length} files with errors. '
              'Fix errors before proceeding.',
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

      // Validate IR files
      await validateIRFilesComprehensive(
        outputPath: irOutputPath,
        verbose: verbose,
        reportPath: analysisReportPath,
      );

      if (verbose) {
        print('\nDEBUG: Checking IR file structure...');
        final irFiles = Directory(irOutputPath);
        if (await irFiles.exists()) {
          await for (final entity in irFiles.list(recursive: true)) {
            if (entity is File && entity.path.endsWith('.ir')) {
              print('  ✓ ${path.relative(entity.path, from: irOutputPath)}');
            }
          }
        }
      }

      // ===== PHASE 4: IR TO JAVASCRIPT CONVERSION (OPTIONAL) =====
      if (toJs) {
        if (!jsonOutput) {
          print('\nPHASE 4: Converting IR Files to JavaScript...\n');
        }

        try {
          // ✓ Ensure JS output directory exists
          await Directory(jsOutputPath).create(recursive: true);

          // ✓ Convert all .ir files to .js
          jsFileCount = await _convertIRToJavaScript(
            irInputPath: irOutputPath, // input:  build/flutterjs/ir/*.ir
            jsOutputPath: jsOutputPath, // output: build/flutterjs/js/*.js
            verbose: verbose,
            jsonOutput: jsonOutput,
          );

          if (!jsonOutput) {
            if (jsFileCount > 0) {
              print('\n  ✓ JavaScript files saved to: $jsOutputPath');
            } else {
              print(
                '\n  ✗ No JavaScript files were generated. Check IR files.',
              );
            }
          }
        } catch (e, stackTrace) {
          print('Error during JavaScript conversion: $e');
          if (verbose) {
            print('\nStack trace:\n$stackTrace');
          }
          if (strictMode) exit(1);
        }
      }

      // ===== PRINT RESULTS =====
      if (!jsonOutput) {
        _printResults(
          irResults,
          filesToConvert.length,
          irFileCount,
          jsFilesGenerated: jsFileCount,
          buildPath: flutterJsDir,
        );
      } else {
        _printJsonResults(
          irResults,
          filesToConvert.length,
          irFileCount,
          jsFilesGenerated: jsFileCount,
        );
      }

      final hasErrors =
          irResults.validationSummary != null &&
          irResults.validationSummary!.errorCount > 0;

      if (hasErrors && strictMode) exit(1);
    } catch (e, stackTrace) {
      print('\nError: $e');
      if (verbose) print('Stack trace:\n$stackTrace');
      exit(1);
    }
  }

  // =========================================================================
  // PHASE 1: HELPERS
  // =========================================================================

  void _printAnalysisSummary(ProjectAnalysisReport report, bool detailed) {
    final stats = report.analysisResult.statistics;

    print('  Analysis Results:');
    print('    Total files scanned: ${stats.totalFiles}');
    print('    Files with changes: ${report.changedFiles.length}');
    print('    Files with errors: ${report.filesWithErrors.length}');
    print(
      '    Cache hit rate: ${(stats.cacheHitRate * 100).toStringAsFixed(1)}%',
    );
    print('    Time: ${_formatDuration(stats.durationMs)}');

    if (detailed && report.fileSummaries.isNotEmpty) {
      print('\n    Summary:');
      final typeStats = report.analysisResult.typeRegistry.getStatistics();
      print('      Widgets: ${typeStats['widgets']}');
      print('      State classes: ${typeStats['stateClasses']}');
      print('      Total classes: ${typeStats['classes']}');
    }
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
  // PHASE 2: IR GENERATION PASSES
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
          unit = _parseFile(filePath);
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

    if (!verbose)
      print('    Resolved: ${pass.globalSymbolRegistry.length} symbols');
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
  // PHASE 3: SERIALIZATION
  // =========================================================================

  Future<int> _serializeIR({
    required IRGenerationResults irResults,
    required String outputPath,
    required bool verbose,
    required String sourceBasePath,
  }) async {
    int fileCount = 0;
    final normalizedOutputPath = path.normalize(outputPath);
    final normalizedSourceBasePath = path.normalize(sourceBasePath);

    for (final entry in irResults.dartFiles.entries) {
      try {
        final normalizedFilePath = path.normalize(entry.key);

        if (!normalizedFilePath.startsWith(normalizedSourceBasePath)) continue;

        final relativePath = path.relative(
          normalizedFilePath,
          from: normalizedSourceBasePath,
        );

        var relativeDir = path.dirname(relativePath);
        if (relativeDir == '.') relativeDir = '';

        final fileNameWithoutExt = path.basenameWithoutExtension(
          normalizedFilePath,
        );
        final outputFileName = '${fileNameWithoutExt}_ir.ir';

        final outputFile = relativeDir.isEmpty
            ? File(path.join(normalizedOutputPath, outputFileName))
            : File(
                path.join(normalizedOutputPath, relativeDir, outputFileName),
              );

        final binaryWriter = BinaryIRWriter();
        final binaryBytes = binaryWriter.writeFileIR(
          entry.value,
          verbose: false,
        );

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

  // =========================================================================
  // PHASE 4: IR TO JAVASCRIPT
  // =========================================================================

  Future<int> _convertIRToJavaScript({
    required String irInputPath,
    required String jsOutputPath,
    required bool verbose,
    required bool jsonOutput,
  }) async {
    int fileCount = 0;
    int errorCount = 0;

    const config = JSFormatterConfig(
      indentSpaces: 2,
      useSemicolons: true,
      includeTypeComments: false,
      formatCode: true,
      minify: false,
    );

    final irDir = Directory(irInputPath);

    // ✓ Check if IR directory exists
    if (!await irDir.exists()) {
      if (!jsonOutput) print('Error: IR directory not found: $irInputPath');
      return 0;
    }

    if (!jsonOutput) {
      print('  Scanning IR directory: $irInputPath\n');
    }

    // ✓ Find all .ir files
    final irFiles = <String>[];
    try {
      await for (final entity in irDir.list(
        recursive: true,
        followLinks: false,
      )) {
        if (entity is File && entity.path.endsWith('.ir')) {
          irFiles.add(entity.path);
        }
      }
    } catch (e) {
      if (!jsonOutput) print('Error reading IR directory: $e');
      return 0;
    }

    if (irFiles.isEmpty) {
      if (!jsonOutput) print('No .ir files found in $irInputPath');
      return 0;
    }

    if (!jsonOutput) {
      print('  Found ${irFiles.length} IR file(s)');
      print('  Converting to JavaScript...\n');
    }

    irFiles.sort();

    // ✓ Process each .ir file
    for (final irFilePath in irFiles) {
      try {
        final irFile = File(irFilePath);
        if (!await irFile.exists()) continue;

        final irFileName = path.basename(irFilePath);
        final jsFileName = irFileName
            .replaceAll('_ir.ir', '.js')
            .replaceAll('.ir', '.js');

        // ✓ Calculate relative path for directory structure
        final relativePath = path.relative(irFilePath, from: irInputPath);
        var relativeDir = path.dirname(relativePath);
        if (relativeDir == '.') relativeDir = '';

        // ✓ Construct JS output path (preserve directory structure)
        final jsOutputFile = relativeDir.isEmpty
            ? File(path.join(jsOutputPath, jsFileName))
            : File(path.join(jsOutputPath, relativeDir, jsFileName));

        if (verbose) {
          print('  Processing: $irFileName');
        }

        // ✓ Read binary IR file
        final irBytes = await irFile.readAsBytes();
        if (irBytes.isEmpty) {
          if (verbose) print('    ✗ Empty IR file');
          errorCount++;
          continue;
        }

        // ✓ Deserialize binary IR to DartFile object
        DartFile dartFile;
        try {
          final reader = BinaryIRReader();
          dartFile = reader.readFileIR(irBytes);
        } catch (e) {
          if (verbose) print('    ✗ Failed to deserialize IR: $e');
          errorCount++;
          continue;
        }

        // ✓ Format DartFile to JavaScript code
        final formatter = IRToJavaScriptFormatter(config: config);
        final jsCode = formatter.format(dartFile);

        // ✓ Check for formatter errors
        if (formatter.errorCollector.hasErrors()) {
          final errors = formatter.errorCollector.errors
              .where((e) => e.severity == ErrorSeverity.ERROR)
              .map((e) => e.message)
              .toList();

          if (verbose) {
            print('    ✗ Formatter errors (${errors.length}):');
            for (final error in errors.take(3)) {
              print('      - $error');
            }
          }
          errorCount++;
          continue;
        }

        // ✓ Verify JS code is not empty
        if (jsCode.isEmpty) {
          if (verbose) print('    ✗ Generated empty JavaScript');
          errorCount++;
          continue;
        }

        // ✓ Create output directory if needed
        await jsOutputFile.parent.create(recursive: true);

        // ✓ Write JS file
        await jsOutputFile.writeAsString(jsCode);
        fileCount++;

        if (verbose) {
          final sizeKb = (jsCode.length / 1024).toStringAsFixed(2);
          final displayPath = relativeDir.isEmpty
              ? jsFileName
              : path.join(relativeDir, jsFileName);
          print('    ✓ $jsFileName → $displayPath ($sizeKb KB)');
        }
      } catch (e, stackTrace) {
        errorCount++;
        if (verbose) {
          print('    ✗ Error processing ${path.basename(irFilePath)}: $e');
          if (verbose) print('       $stackTrace');
        }
      }
    }

    if (!jsonOutput) {
      print(
        '\n  ✓ Successfully converted: $fileCount / ${irFiles.length} files',
      );
      if (errorCount > 0) {
        print('  ✗ Failed: $errorCount files');
      }
    }

    return fileCount;
  }

  // =========================================================================
  // OUTPUT
  // =========================================================================

  void _printResults(
    IRGenerationResults results,
    int filesAnalyzed,
    int irFilesGenerated, {
    int jsFilesGenerated = 0,
    required String buildPath,
  }) {
    print('\n╔═════════════════════════════════════════╗');
    print('║        GENERATION COMPLETE              ║');
    print('╚═════════════════════════════════════════╝');
    print('Files analyzed:    $filesAnalyzed');
    print('IR files generated: $irFilesGenerated');
    if (jsFilesGenerated > 0) print('JS files generated: $jsFilesGenerated');
    print('Total declarations: ${_countDeclarations(results)}');
    print('Build output:      $buildPath');

    if (results.validationSummary != null) {
      print('\nValidation:');
      print('  Errors:   ${results.validationSummary!.errorCount}');
      print('  Warnings: ${results.validationSummary!.warningCount}');
      print('  Score:    ${results.validationSummary!.getHealthScore()}/100');
    }

    print('Time: ${_formatDuration(results.totalDurationMs)}');
    print('');
  }

  void _printJsonResults(
    IRGenerationResults results,
    int filesAnalyzed,
    int irFilesGenerated, {
    int jsFilesGenerated = 0,
  }) {
    final json = {
      'status': 'success',
      'files_analyzed': filesAnalyzed,
      'ir_files': irFilesGenerated,
      'js_files': jsFilesGenerated,
      'declarations': _countDeclarations(results),
      'errors': results.validationSummary?.errorCount ?? 0,
      'warnings': results.validationSummary?.warningCount ?? 0,
      'duration_ms': results.totalDurationMs,
    };

    print(_prettyJsonEncode(json));
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  CompilationUnit? _parseFile(String filePath) {
    return DartFileParser.parseFile(filePath);
  }

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

  Future<void> validateIRFilesComprehensive({
    required String outputPath,
    required bool verbose,
    String? reportPath,
  }) async {
    if (!verbose) return;

    print('\n✓ Validating IR files...');
    final validator = ComprehensiveIRValidator();
    final report = await validator.validateAllLayers(
      outputPath: outputPath,
      verbose: false,
    );

    if (reportPath != null) {
      final reportFile = File(path.join(reportPath, 'validation_report.json'));
      await reportFile.writeAsString(_generateValidationJSON(report));
    }
  }

  String _generateValidationJSON(ComprehensiveValidationReport report) {
    return '''
{
  "timestamp": "${DateTime.now()}",
  "status": "${report.fileReports.every((r) => r.isValid) ? 'PASS' : 'FAIL'}",
  "total_files": ${report.fileReports.length},
  "valid_files": ${report.validFileCount},
  "invalid_files": ${report.invalidFileCount},
  "total_errors": ${report.totalErrors},
  "total_warnings": ${report.totalWarnings}
}
''';
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
// import 'dart:io';
// import 'package:args/command_runner.dart';
// import 'package:flutterjs_tools/src/runner/helper.dart';
// import 'package:path/path.dart' as path;
// import 'package:flutterjs_analyzer/flutterjs_analyzer.dart';
// import 'package:flutterjs_core/flutterjs_core.dart';

// import 'package:analyzer/dart/ast/ast.dart';

// // ============================================================================
// // UNIFIED COMMAND - Analysis → IR Generation → JS Conversion Pipeline
// // ============================================================================

// class RunCommand extends Command<void> {
//   RunCommand({required this.verbose, required this.verboseHelp}) {
//     argParser
//       ..addOption(
//         'project',
//         abbr: 'p',
//         help: 'Path to Flutter project root.',
//         defaultsTo: '.',
//       )
//       ..addOption(
//         'source',
//         abbr: 's',
//         help: 'Path to source directory relative to project root.',
//         defaultsTo: 'lib',
//       )
//       ..addOption(
//         'output',
//         abbr: 'o',
//         help: 'Output directory for IR files.',
//         defaultsTo: '.flutterjs/ir',
//       )
//       ..addFlag(
//         'json',
//         help: 'Output results in JSON format.',
//         negatable: false,
//       )
//       ..addFlag(
//         'parallel',
//         help: 'Enable parallel processing.',
//         defaultsTo: true,
//       )
//       ..addOption(
//         'max-parallelism',
//         help: 'Maximum parallel workers.',
//         defaultsTo: '4',
//       )
//       ..addFlag(
//         'incremental',
//         help: 'Use incremental caching.',
//         defaultsTo: true,
//       )
//       ..addFlag(
//         'skip-analysis',
//         help: 'Skip analysis phase and convert all .dart files.',
//         negatable: false,
//       )
//       ..addFlag(
//         'show-analysis',
//         help: 'Show detailed analysis report.',
//         defaultsTo: false,
//       )
//       ..addFlag(
//         'strict',
//         help: 'Exit with error if any issues found.',
//         negatable: false,
//       )
//       ..addFlag(
//         'to-js',
//         help:
//             'Also convert generated IR to JavaScript (follows Flutter build structure).',
//         negatable: false,
//       );
//   }

//   final bool verbose;
//   final bool verboseHelp;

//   @override
//   String get name => 'run';

//   @override
//   String get description =>
//       'Analyze Flutter project and generate IR for changed files. '
//       'Phase 1: Analysis → Phase 2: IR Generation (5 passes) → Phase 3: JS Conversion (optional)';

//   @override
//   Future<void> run() async {
//     final projectPath = argResults!['project'] as String;
//     final sourcePath = argResults!['source'] as String;
//     final outputPath = argResults!['output'] as String;
//     final jsonOutput = argResults!['json'] as bool;
//     final enableParallel = argResults!['parallel'] as bool;
//     final maxParallelism = int.parse(argResults!['max-parallelism'] as String);
//     final enableIncremental = argResults!['incremental'] as bool;
//     final skipAnalysis = argResults!['skip-analysis'] as bool;
//     final showAnalysis = argResults!['show-analysis'] as bool;
//     final strictMode = argResults!['strict'] as bool;
//     final toJs = argResults!['to-js'] as bool;

//     // Validate paths
//     final projectDir = Directory(projectPath);
//     if (!await projectDir.exists()) {
//       print('Error: Project directory not found at $projectPath');
//       exit(1);
//     }

//     final absoluteProjectPath = path.normalize(projectDir.absolute.path);
//     final absoluteSourcePath = path.join(absoluteProjectPath, sourcePath);

//     // Create build directory structure (following Flutter conventions)
//     final buildDir = path.join(absoluteProjectPath, 'build');
//     final flutterJsDir = path.join(buildDir, 'flutterjs');

//     // DERIVE ALL PATHS FROM build/flutterjs/
//     final absoluteOutputPath = path.join(flutterJsDir, 'ir');
//     final jsOutputPath = path.join(flutterJsDir, 'js');
//     final analysisReportPath = path.join(flutterJsDir, 'analysis');

//     if (!jsonOutput) {
//       print('');
//       print('========== FLUTTER IR GENERATION ==========');
//       print('Project: $absoluteProjectPath');
//       print('Source:  $absoluteSourcePath');
//       print('IR Output:  $absoluteOutputPath');
//       if (toJs) print('JS Output:  $jsOutputPath');
//       print('==========================================\n');
//     }

//     int jsFileCount = 0;

//     try {
//       await Directory(absoluteOutputPath).create(recursive: true);

//       // ===== INITIALIZE PARSER =====
//       try {
//         if (!jsonOutput) print('Initializing Dart parser...\n');
//         DartFileParser.initialize(projectRoot: absoluteProjectPath);
//       } catch (e) {
//         print('Error: Failed to initialize Dart parser: $e');
//         exit(1);
//       }

//       // PHASE 1: ANALYSIS
//       List<String> filesToConvert = [];

//       if (skipAnalysis) {
//         if (!jsonOutput) print('Skipping analysis phase...\n');
//         filesToConvert = await _discoverAllDartFiles(absoluteSourcePath);
//       } else {
//         if (!jsonOutput) print('PHASE 1: Analyzing project...\n');
//         final analyzer = ProjectAnalyzer(
//           absoluteProjectPath,
//           maxParallelism: maxParallelism,
//           enableVerboseLogging: verbose,
//           enableCache: enableIncremental,
//           enableParallelProcessing: enableParallel,
//         );

//         try {
//           await analyzer.initialize();

//           final orchestrator = ProjectAnalysisOrchestrator(analyzer);
//           final analysisReport = await orchestrator.analyze();

//           filesToConvert = analysisReport.changedFiles.toList();

//           if (!jsonOutput) {
//             _printAnalysisSummary(analysisReport, showAnalysis);
//             print(
//               '\nFiles identified for IR conversion: ${filesToConvert.length}\n',
//             );
//           }

//           analyzer.dispose();

//           if (analysisReport.filesWithErrors.isNotEmpty && strictMode) {
//             print(
//               'Error: ${analysisReport.filesWithErrors.length} files with errors. '
//               'Fix errors before proceeding.',
//             );
//             exit(1);
//           }
//         } catch (e) {
//           analyzer.dispose();
//           rethrow;
//         }
//       }

//       if (filesToConvert.isEmpty) {
//         if (!jsonOutput) {
//           print('No files to convert.');
//         } else {
//           print('{"status":"success","filesConverted":0}');
//         }
//         exit(0);
//       }

//       // PHASE 2: IR GENERATION
//       if (!jsonOutput)
//         print('PHASE 2: Generating IR for ${filesToConvert.length} files...\n');

//       final irResults = await _runAllPasses(
//         dartFiles: filesToConvert,
//         projectRoot: absoluteProjectPath,
//         parallel: enableParallel,
//         maxParallelism: maxParallelism,
//         verbose: verbose,
//         jsonOutput: jsonOutput,
//       );

//       // PHASE 3: SERIALIZATION
//       if (!jsonOutput) print('PHASE 3: Serializing IR...\n');

//       final irFileCount = await _serializeIR(
//         irResults: irResults,
//         outputPath: absoluteOutputPath,
//         sourceBasePath: absoluteSourcePath,
//         verbose: verbose,
//       );

//       await validateIRFilesComprehensive(
//         outputPath: absoluteOutputPath,
//         verbose: verbose,
//       );

//       if (verbose) {
//         print('\nDEBUGGING deserialization:');
//         final mainIrFile = File(path.join(absoluteOutputPath, 'main_ir.ir'));
//         if (await mainIrFile.exists()) {
//           final bytes = await mainIrFile.readAsBytes();
//           final reader = BinaryIRReader();
//           reader.debugDeserialize(bytes);
//         }
//       }

//       // PHASE 4: IR TO JAVASCRIPT CONVERSION (OPTIONAL)
//       if (toJs && irResults.dartFiles.isNotEmpty) {
//         if (!jsonOutput) print('PHASE 4: Converting IR to JavaScript...\n');

//         try {
//           await Directory(jsOutputPath).create(recursive: true);

//           jsFileCount = await _convertIRToJavaScript(
//             irResults: irResults,
//             sourceBasePath: absoluteSourcePath,
//             jsOutputPath: jsOutputPath,
//             verbose: verbose,
//             jsonOutput: jsonOutput,
//           );

//           if (!jsonOutput) {
//             print('\nJavaScript Conversion Results:');
//             print('  JS files generated: $jsFileCount');
//             print('  Output directory: $jsOutputPath');
//           }
//         } catch (e) {
//           print('Error during JavaScript conversion: $e');
//           if (verbose) print('Details: $e');
//           if (strictMode) exit(1);
//         }
//       }

//       // RESULTS
//       if (!jsonOutput) {
//         _printResults(
//           irResults,
//           filesToConvert.length,
//           irFileCount,
//           jsFilesGenerated: jsFileCount,
//         );
//       } else {
//         _printJsonResults(
//           irResults,
//           filesToConvert.length,
//           irFileCount,
//           jsFilesGenerated: jsFileCount,
//         );
//       }

//       final hasErrors =
//           irResults.validationSummary != null &&
//           irResults.validationSummary!.errorCount > 0;

//       if (hasErrors && strictMode) {
//         exit(1);
//       }
//     } catch (e, stackTrace) {
//       print('\nError: $e');
//       if (verbose) {
//         print('Stack trace:\n$stackTrace');
//       }
//       exit(1);
//     }
//   }

//   // =========================================================================
//   // PHASE 1: ANALYSIS HELPERS
//   // =========================================================================

//   void _printAnalysisSummary(ProjectAnalysisReport report, bool detailed) {
//     final stats = report.analysisResult.statistics;

//     print('Analysis Results:');
//     print('  Total files scanned: ${stats.totalFiles}');
//     print('  Files with changes: ${report.changedFiles.length}');
//     print('  Files with errors: ${report.filesWithErrors.length}');
//     print(
//       '  Cache hit rate: ${(stats.cacheHitRate * 100).toStringAsFixed(1)}%',
//     );
//     print('  Analysis time: ${_formatDuration(stats.durationMs)}');

//     if (detailed && report.fileSummaries.isNotEmpty) {
//       print('\n  Top level summary:');
//       final typeStats = report.analysisResult.typeRegistry.getStatistics();
//       print('    Widgets found: ${typeStats['widgets']}');
//       print('    State classes: ${typeStats['stateClasses']}');
//       print('    Total classes: ${typeStats['classes']}');
//     }

//     if (report.filesWithErrors.isNotEmpty &&
//         report.filesWithErrors.length <= 5) {
//       print('\n  Files with errors:');
//       for (final file in report.filesWithErrors) {
//         print('    - ${path.basename(file)}');
//       }
//     }
//   }

//   Future<List<String>> _discoverAllDartFiles(String sourceDir) async {
//     final dir = Directory(sourceDir);
//     final files = <String>[];

//     await for (final entity in dir.list(recursive: true, followLinks: false)) {
//       if (entity is File && entity.path.endsWith('.dart')) {
//         files.add(entity.path);
//       }
//     }

//     files.sort();
//     return files;
//   }

//   // =========================================================================
//   // PHASE 2: IR GENERATION PASSES
//   // =========================================================================

//   Future<IRGenerationResults> _runAllPasses({
//     required List<String> dartFiles,
//     required String projectRoot,
//     required bool parallel,
//     required int maxParallelism,
//     required bool verbose,
//     required bool jsonOutput,
//   }) async {
//     final stopwatch = Stopwatch()..start();
//     final results = IRGenerationResults();

//     try {
//       if (!jsonOutput) print('  Pass 1/5: Declaration Discovery...');
//       await _runDeclarationPass(
//         dartFiles: dartFiles,
//         projectRoot: projectRoot,
//         results: results,
//         verbose: verbose,
//       );

//       if (!jsonOutput) print('  Pass 2/5: Symbol Resolution...');
//       await _runSymbolResolutionPass(results: results, verbose: verbose);

//       if (!jsonOutput) print('  Pass 3/5: Type Inference...');
//       await _runTypeInferencePass(results: results, verbose: verbose);

//       if (!jsonOutput) print('  Pass 4/5: Flow Analysis...');
//       await _runFlowAnalysisPass(results: results, verbose: verbose);

//       if (!jsonOutput) print('  Pass 5/5: Validation & Diagnostics...');
//       await _runValidationPass(results: results, verbose: verbose);

//       stopwatch.stop();
//       results.totalDurationMs = stopwatch.elapsedMilliseconds;
//     } catch (e) {
//       if (verbose) print('Error during passes: $e');
//       rethrow;
//     }

//     return results;
//   }

//   Future<void> _runDeclarationPass({
//     required List<String> dartFiles,
//     required String projectRoot,
//     required IRGenerationResults results,
//     required bool verbose,
//   }) async {
//     int filesProcessed = 0;

//     for (final filePath in dartFiles) {
//       try {
//         final file = File(filePath);

//         if (!await file.exists()) {
//           if (verbose) print('      File not found: $filePath');
//           continue;
//         }

//         final content = await file.readAsString();
//         final builder = DartFileBuilder(
//           filePath: filePath,
//           projectRoot: projectRoot,
//         );

//         CompilationUnit? unit;
//         try {
//           unit = _parseFile(filePath);
//         } catch (parseError) {
//           if (verbose) {
//             print(
//               '      Parse error in ${path.basename(filePath)}: $parseError',
//             );
//           }
//           continue;
//         }

//         if (unit == null) {
//           if (verbose) {
//             print(
//               '      Failed to parse ${path.basename(filePath)}: returned null',
//             );
//           }
//           continue;
//         }

//         final pass = DeclarationPass(
//           filePath: filePath,
//           fileContent: content,
//           builder: builder,
//         );
//         pass.extractDeclarations(unit);

//         final dartFile = builder.build();
//         results.dartFiles[filePath] = dartFile;
//         filesProcessed++;

//         if (verbose) {
//           print(
//             '      ${path.basename(filePath)} (${dartFile.declarationCount} declarations)',
//           );
//         }
//       } catch (e, stackTrace) {
//         if (verbose) {
//           print('      Error processing ${path.basename(filePath)}: $e');
//           print('      Stack: $stackTrace');
//         }
//       }
//     }

//     if (!verbose) {
//       print('      Processed: $filesProcessed files');
//     } else if (filesProcessed == 0) {
//       print('      ⚠️  WARNING: No files were successfully processed!');
//     }
//   }

//   Future<void> _runSymbolResolutionPass({
//     required IRGenerationResults results,
//     required bool verbose,
//   }) async {
//     final pass = SymbolResolutionPass(
//       dartFiles: results.dartFiles,
//       projectRoot: '',
//     );

//     pass.resolveAllSymbols();

//     results.resolutionIssues.addAll(pass.resolutionIssues);
//     results.widgetStateBindings.addAll(pass.widgetStateBindings);
//     results.providerRegistry.addAll(pass.providerRegistry);

//     if (!verbose) {
//       print('      Resolved: ${pass.globalSymbolRegistry.length} symbols');
//     }
//   }

//   Future<void> _runTypeInferencePass({
//     required IRGenerationResults results,
//     required bool verbose,
//   }) async {
//     final pass = TypeInferencePass(
//       dartFiles: results.dartFiles,
//       globalSymbols: {},
//       providerRegistry: results.providerRegistry,
//     );

//     pass.inferAllTypes();

//     results.inferenceIssues.addAll(pass.inferenceIssues);
//     results.typeCache.addAll(pass.typeCache);

//     if (!verbose) {
//       print('      Inferred: ${pass.typeCache.length} expressions');
//     }
//   }

//   Future<void> _runFlowAnalysisPass({
//     required IRGenerationResults results,
//     required bool verbose,
//   }) async {
//     final pass = FlowAnalysisPass(
//       dartFiles: results.dartFiles,
//       typeInferenceInfo: {},
//     );

//     pass.analyzeAllFlows();

//     results.flowIssues.addAll(pass.flowIssues);
//     results.controlFlowGraphs.addAll(pass.controlFlowGraphs);
//     results.rebuildTriggers.addAll(pass.rebuildTriggers);
//     results.stateFieldAnalysis.addAll(pass.stateFieldAnalysis);
//     results.lifecycleAnalysis.addAll(pass.lifecycleAnalysis);

//     if (!verbose) {
//       print(
//         '      Built: ${pass.controlFlowGraphs.length} CFGs, '
//         '${pass.rebuildTriggers.length} triggers',
//       );
//     }
//   }

//   Future<void> _runValidationPass({
//     required IRGenerationResults results,
//     required bool verbose,
//   }) async {
//     final pass = ValidationPass(
//       dartFiles: results.dartFiles,
//       flowAnalysisInfo: {},
//     );

//     pass.validateAll();

//     results.validationIssues.addAll(pass.validationIssues);
//     results.validationSummary = pass.summary;

//     if (!verbose) {
//       final total = pass.validationIssues.length;
//       print(
//         '      Found: $total issues '
//         '(${pass.summary.errorCount} errors, '
//         '${pass.summary.warningCount} warnings)',
//       );
//     }
//   }

//   // =========================================================================
//   // PHASE 3: SERIALIZATION
//   // =========================================================================

//   Future<int> _serializeIR({
//     required IRGenerationResults irResults,
//     required String outputPath,
//     required bool verbose,
//     required String sourceBasePath,
//   }) async {
//     int fileCount = 0;
//     final failedFiles = <String, String>{};

//     final normalizedOutputPath = path.normalize(outputPath);
//     final normalizedSourceBasePath = path.normalize(sourceBasePath);

//     for (final entry in irResults.dartFiles.entries) {
//       final filePath = entry.key;
//       final dartFile = entry.value;

//       try {
//         final normalizedFilePath = path.normalize(filePath);

//         if (!normalizedFilePath.startsWith(normalizedSourceBasePath)) {
//           final error = 'File not under source path: $filePath';
//           failedFiles[filePath] = error;
//           if (verbose) print('    ✗ ${path.basename(filePath)}: $error');
//           continue;
//         }

//         try {
//           final relativePath = path.relative(
//             normalizedFilePath,
//             from: normalizedSourceBasePath,
//           );

//           var relativeDir = path.dirname(relativePath);

//           if (relativeDir == '.') {
//             relativeDir = '';
//           }

//           final fileNameWithoutExt = path.basenameWithoutExtension(
//             normalizedFilePath,
//           );
//           final outputFileName = '${fileNameWithoutExt}_ir.ir';

//           final outputFile = relativeDir.isEmpty
//               ? File(path.join(normalizedOutputPath, outputFileName))
//               : File(
//                   path.join(normalizedOutputPath, relativeDir, outputFileName),
//                 );

//           final binaryWriter = BinaryIRWriter();
//           final binaryBytes = binaryWriter.writeFileIR(
//             dartFile,
//             verbose: false,
//           );

//           await outputFile.parent.create(recursive: true);
//           await outputFile.writeAsBytes(binaryBytes);
//           fileCount++;

//           if (verbose) {
//             final sizeKb = (binaryBytes.length / 1024).toStringAsFixed(2);
//             final displayPath = relativeDir.isEmpty
//                 ? outputFileName
//                 : path.join(relativeDir, outputFileName);
//             print(
//               '    ✓ ${path.basename(filePath)} → $displayPath ($sizeKb KB)',
//             );
//           }
//         } catch (pathError) {
//           final error = 'Path calculation failed: $pathError';
//           failedFiles[filePath] = error;
//           if (verbose) print('    ✗ ${path.basename(filePath)}: $error');
//         }
//       } catch (e) {
//         final error = 'Serialization failed: $e';
//         failedFiles[filePath] = error;
//         if (verbose) print('    ✗ ${path.basename(filePath)}: $error');
//       }
//     }

//     if (verbose && failedFiles.isNotEmpty) {
//       print('\n    Failed to serialize ${failedFiles.length} files:');
//       for (final entry in failedFiles.entries) {
//         print('      • ${path.basename(entry.key)}: ${entry.value}');
//       }
//     }

//     return fileCount;
//   }

//   // =========================================================================
//   // PHASE 4: IR TO JAVASCRIPT CONVERSION
//   // =========================================================================

//   Future<int> _convertIRToJavaScript({
//     required IRGenerationResults irResults,
//     required String sourceBasePath,
//     required String jsOutputPath,
//     required bool verbose,
//     required bool jsonOutput,
//   }) async {
//     int fileCount = 0;
//     final failedFiles = <String, String>{};

//     final normalizedSourceBasePath = path.normalize(sourceBasePath);
//     final normalizedJsOutputPath = path.normalize(jsOutputPath);

//     const config = JSFormatterConfig(
//       indentSpaces: 2,
//       useSemicolons: true,
//       includeTypeComments: false,
//       formatCode: true,
//       minify: false,
//     );

//     for (final entry in irResults.dartFiles.entries) {
//       final dartFilePath = entry.key;
//       final dartFile = entry.value;

//       try {
//         final normalizedDartPath = path.normalize(dartFilePath);

//         if (!normalizedDartPath.startsWith(normalizedSourceBasePath)) {
//           failedFiles[dartFilePath] = 'File not under source path';
//           continue;
//         }

//         final relativePath = path.relative(
//           normalizedDartPath,
//           from: normalizedSourceBasePath,
//         );

//         var relativeDir = path.dirname(relativePath);
//         if (relativeDir == '.') relativeDir = '';

//         final fileNameWithoutExt = path.basenameWithoutExtension(
//           normalizedDartPath,
//         );
//         final jsFileName = '$fileNameWithoutExt.js';

//         final jsOutputFile = relativeDir.isEmpty
//             ? File(path.join(normalizedJsOutputPath, jsFileName))
//             : File(path.join(normalizedJsOutputPath, relativeDir, jsFileName));

//         await jsOutputFile.parent.create(recursive: true);

//         final formatter = IRToJavaScriptFormatter(config: config);
//         final jsCode = formatter.format(dartFile);

//         if (formatter.errorCollector.hasErrors()) {
//           final errors = formatter.errorCollector.errors
//               .where((e) => e.severity == ErrorSeverity.ERROR)
//               .map((e) => e.message)
//               .join('; ');
//           failedFiles[dartFilePath] = errors;
//           if (verbose) {
//             print('    ✗ ${path.basename(dartFilePath)}: $errors');
//           }
//           continue;
//         }

//         await jsOutputFile.writeAsString(jsCode);
//         fileCount++;

//         if (verbose) {
//           final relativeJsPath = relativeDir.isEmpty
//               ? jsFileName
//               : path.join(relativeDir, jsFileName);
//           final sizeKb = (jsCode.length / 1024).toStringAsFixed(2);
//           print(
//             '    ✓ ${path.basename(dartFilePath)} → $relativeJsPath ($sizeKb KB)',
//           );
//         }
//       } catch (e, stackTrace) {
//         failedFiles[dartFilePath] = e.toString();
//         if (verbose) {
//           print('    ✗ ${path.basename(dartFilePath)}: $e');
//           print('       Stack: $stackTrace');
//         }
//       }
//     }

//     if (failedFiles.isNotEmpty) {
//       if (!jsonOutput) {
//         print('\n  ⚠️  Failed to convert ${failedFiles.length} files:');
//         for (final entry in failedFiles.entries) {
//           print('    • ${path.basename(entry.key)}: ${entry.value}');
//         }
//       }
//     }

//     return fileCount;
//   }

//   // =========================================================================
//   // OUTPUT FORMATTING
//   // =========================================================================

//   void _printResults(
//     IRGenerationResults results,
//     int filesAnalyzed,
//     int irFilesGenerated, {
//     int jsFilesGenerated = 0,
//   }) {
//     print('\n========== GENERATION COMPLETE ==========');
//     print('Files analyzed: $filesAnalyzed');
//     print('IR files generated: $irFilesGenerated');
//     if (jsFilesGenerated > 0) print('JS files generated: $jsFilesGenerated');
//     print('Total declarations: ${_countDeclarations(results)}');
//     print('Control flow graphs: ${results.controlFlowGraphs.length}');
//     print('Rebuild triggers: ${results.rebuildTriggers.length}');

//     if (results.validationSummary != null) {
//       final summary = results.validationSummary!;
//       print('\nValidation Results:');
//       print('  Critical: ${summary.criticalCount}');
//       print('  Errors: ${summary.errorCount}');
//       print('  Warnings: ${summary.warningCount}');
//       print('  Health Score: ${summary.getHealthScore()}/100');
//     }

//     print('Generation time: ${_formatDuration(results.totalDurationMs)}');
//     print('==========================================\n');
//   }

//   void _printJsonResults(
//     IRGenerationResults results,
//     int filesAnalyzed,
//     int irFilesGenerated, {
//     int jsFilesGenerated = 0,
//   }) {
//     final json = {
//       'status': 'success',
//       'phase': 'analysis_ir_and_js_generation',
//       'files_analyzed': filesAnalyzed,
//       'ir_files_generated': irFilesGenerated,
//       'js_files_generated': jsFilesGenerated,
//       'declarations': _countDeclarations(results),
//       'control_flows': results.controlFlowGraphs.length,
//       'rebuild_triggers': results.rebuildTriggers.length,
//       'duration_ms': results.totalDurationMs,
//       'validation': {
//         'critical': results.validationSummary?.criticalCount ?? 0,
//         'errors': results.validationSummary?.errorCount ?? 0,
//         'warnings': results.validationSummary?.warningCount ?? 0,
//         'health_score': results.validationSummary?.getHealthScore() ?? 100,
//       },
//     };

//     print(_prettyJsonEncode(json));
//   }

//   // =========================================================================
//   // UTILITIES
//   // =========================================================================

//   CompilationUnit? _parseFile(String filePath) {
//     return DartFileParser.parseFile(filePath);
//   }

//   int _countDeclarations(IRGenerationResults results) {
//     int count = 0;
//     for (final file in results.dartFiles.values) {
//       count += file.declarationCount;
//     }
//     return count;
//   }

//   String _formatDuration(int milliseconds) {
//     if (milliseconds < 1000) {
//       return '${milliseconds}ms';
//     } else if (milliseconds < 60000) {
//       return '${(milliseconds / 1000).toStringAsFixed(2)}s';
//     } else {
//       final minutes = milliseconds ~/ 60000;
//       final seconds = (milliseconds % 60000) / 1000;
//       return '${minutes}m ${seconds.toStringAsFixed(1)}s';
//     }
//   }

//   String _prettyJsonEncode(Map<String, dynamic> json) {
//     return _jsonEncode(json, 0);
//   }

//   String _jsonEncode(dynamic value, int indent) {
//     final spaces = '  ' * indent;
//     final nextSpaces = '  ' * (indent + 1);

//     if (value is Map) {
//       if (value.isEmpty) return '{}';
//       final buffer = StringBuffer('{\n');
//       final entries = value.entries.toList();
//       for (var i = 0; i < entries.length; i++) {
//         final entry = entries[i];
//         if (entry.value == null) continue;
//         buffer.write(
//           '$nextSpaces"${entry.key}": ${_jsonEncode(entry.value, indent + 1)}',
//         );
//         if (i < entries.length - 1) buffer.write(',');
//         buffer.write('\n');
//       }
//       buffer.write('$spaces}');
//       return buffer.toString();
//     } else if (value is List) {
//       if (value.isEmpty) return '[]';
//       final buffer = StringBuffer('[\n');
//       for (var i = 0; i < value.length; i++) {
//         buffer.write('$nextSpaces${_jsonEncode(value[i], indent + 1)}');
//         if (i < value.length - 1) buffer.write(',');
//         buffer.write('\n');
//       }
//       buffer.write('$spaces]');
//       return buffer.toString();
//     } else if (value is String) {
//       return '"$value"';
//     } else if (value is bool || value is num) {
//       return value.toString();
//     } else {
//       return 'null';
//     }
//   }

//   Future<void> validateIRFilesComprehensive({
//     required String outputPath,
//     required bool verbose,
//   }) async {
//     print('\n');
//     print('╔═════════════════════════════════════════════════════════════╗');
//     print('║      Starting Comprehensive IR Validation (4 Layers)        ║');
//     print('╚═════════════════════════════════════════════════════════════╝');

//     final validator = ComprehensiveIRValidator();
//     final report = await validator.validateAllLayers(
//       outputPath: outputPath,
//       verbose: verbose,
//     );

//     if (verbose) {
//       await _exportValidationReport(report, outputPath);
//     }
//   }

//   Future<void> _exportValidationReport(
//     ComprehensiveValidationReport report,
//     String outputPath,
//   ) async {
//     final reportFile = File(path.join(outputPath, 'validation_report.json'));
//     final json = _generateValidationJSON(report);

//     await reportFile.writeAsString(json);
//     print('\n✓ Validation report exported to: ${reportFile.path}');
//   }

//   String _generateValidationJSON(ComprehensiveValidationReport report) {
//     final buffer = StringBuffer();
//     buffer.writeln('{');
//     buffer.writeln('  "timestamp": "${DateTime.now()}",');
//     buffer.writeln(
//       '  "overall_status": "${report.fileReports.every((r) => r.isValid) ? 'PASS' : 'FAIL'}",',
//     );
//     buffer.writeln('  "summary": {');
//     buffer.writeln('    "total_files": ${report.fileReports.length},');
//     buffer.writeln('    "valid_files": ${report.validFileCount},');
//     buffer.writeln('    "invalid_files": ${report.invalidFileCount},');
//     buffer.writeln('    "total_errors": ${report.totalErrors},');
//     buffer.writeln('    "total_warnings": ${report.totalWarnings}');
//     buffer.writeln('  },');
//     buffer.writeln('  "layer_success_rates": {');

//     final rates = report.layerSuccessRates;
//     final rateEntries = rates.entries.toList();
//     for (int i = 0; i < rateEntries.length; i++) {
//       final entry = rateEntries[i];
//       final percentage = entry.value * 100;
//       buffer.write('    "${entry.key}": $percentage');
//       if (i < rateEntries.length - 1) buffer.write(',');
//       buffer.writeln();
//     }

//     buffer.writeln('  },');
//     buffer.writeln('  "files": [');

//     for (int i = 0; i < report.fileReports.length; i++) {
//       final fileReport = report.fileReports[i];
//       buffer.writeln('    {');
//       buffer.writeln('      "name": "${fileReport.fileName}",');
//       buffer.writeln('      "valid": ${fileReport.isValid},');
//       buffer.writeln('      "errors": ${fileReport.totalErrors},');
//       buffer.writeln('      "warnings": ${fileReport.totalWarnings},');
//       buffer.writeln('      "layers": [');

//       for (int j = 0; j < fileReport.results.length; j++) {
//         final result = fileReport.results[j];
//         buffer.writeln('        {');
//         buffer.writeln('          "stage": "${result.stage}",');
//         buffer.writeln('          "valid": ${result.isValid},');
//         buffer.writeln('          "errors": [');

//         for (int k = 0; k < result.errors.length; k++) {
//           buffer.write('            "${result.errors[k]}"');
//           if (k < result.errors.length - 1) buffer.write(',');
//           buffer.writeln();
//         }

//         buffer.writeln('          ]');
//         buffer.write('        }');
//         if (j < fileReport.results.length - 1) buffer.write(',');
//         buffer.writeln();
//       }

//       buffer.writeln('      ]');
//       buffer.write('    }');
//       if (i < report.fileReports.length - 1) buffer.write(',');
//       buffer.writeln();
//     }

//     buffer.writeln('  ]');
//     buffer.writeln('}');

//     return buffer.toString();
//   }
// }

// // =========================================================================
// // RESULTS CONTAINER
// // =========================================================================

// class IRGenerationResults {
//   final Map<String, DartFile> dartFiles = {};
//   final List<AnalysisIssue> resolutionIssues = [];
//   final Map<String, String> widgetStateBindings = {};
//   final Map<String, ProviderInfo> providerRegistry = {};
//   final Map<String, dynamic> typeCache = {};
//   final List<AnalysisIssue> inferenceIssues = [];
//   final Map<String, dynamic> controlFlowGraphs = {};
//   final Map<String, Set<String>> rebuildTriggers = {};
//   final Map<String, dynamic> stateFieldAnalysis = {};
//   final Map<String, dynamic> lifecycleAnalysis = {};
//   final List<AnalysisIssue> flowIssues = [];
//   final List<AnalysisIssue> validationIssues = [];

//   ValidationSummary? validationSummary;
//   int totalDurationMs = 0;

//   List<AnalysisIssue> getAllIssues() {
//     return [
//       ...resolutionIssues,
//       ...inferenceIssues,
//       ...flowIssues,
//       ...validationIssues,
//     ];
//   }
// }
