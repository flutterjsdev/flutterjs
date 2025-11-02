import 'package:analyzer/dart/analysis/analysis_context.dart';
import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/file_system/physical_file_system.dart';
import 'package:path/path.dart' as path;
import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:analyzer/diagnostic/diagnostic.dart' as analyzer_diagnostic;
import 'package:analyzer/dart/element/element.dart' as analyzer_results;

import 'TypeDeclarationVisitor.dart';
import 'analysis_output_generator.dart';
import 'dependency_graph.dart';
import 'dependency_resolver.dart';
import 'incremental_cache.dart';
import 'type_registry.dart';
import 'dart:async';
import 'package:analyzer/dart/ast/ast.dart';

/// Advanced multi-pass project analyzer with incremental compilation support
/// and output file generation in build folder
class ProjectAnalyzer {
  final String projectPath;
  final String cacheDir;
  final String buildDir;
  final String outputDir;

  late AnalysisContextCollection _collection;

  // Multi-pass components
  late DependencyResolver _dependencyResolver;
  late TypeRegistry _typeRegistry;
  late AnalysisCache _cache;

  // Configuration
  final int maxParallelism;
  final bool enableVerboseLogging;
  final bool enableCache;
  final bool enableParallelProcessing;
  final bool generateOutputFiles;
  final List<String> excludePatterns;

  // Analysis state
  final Map<String, AnalysisContext> _fileToContext = {};
  final Map<String, FileAnalysisResult> _analysisResults = {};

  // Progress tracking
  final _progressController = StreamController<AnalysisProgress>.broadcast();
  Stream<AnalysisProgress> get progressStream => _progressController.stream;

  int _totalFiles = 0;
  int _processedFiles = 0;
  int _cachedFiles = 0;
  int _errorFiles = 0;

  ProjectAnalyzer(
    this.projectPath, {
    String? cacheDir,
    String? buildDir,
    String? outputDir,
    this.maxParallelism = 4,
    this.enableVerboseLogging = true,
    this.enableCache = true,
    this.enableParallelProcessing = true,
    this.generateOutputFiles = true,
    this.excludePatterns = const [
      '**/.dart_tool/**',
      '**/build/**',
      '**/*.g.dart',
      '**/*.freezed.dart',
      '**/*.mocks.dart',
      '**/test/**',
    ],
  }) : buildDir = buildDir ?? path.join(projectPath, 'build'),
       cacheDir =
           cacheDir ??
           path.join(
             buildDir ?? path.join(projectPath, 'build'),
             'flutter_js_cache',
           ),
       outputDir =
           outputDir ??
           path.join(
             buildDir ?? path.join(projectPath, 'build'),
             'analysis_output',
           );

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /// Initialize the analyzer with dependency resolution
  Future<void> initialize() async {
    _log('🚀 Initializing ProjectAnalyzer...');

    try {
      // Validate project structure
      await _validateProjectStructure();

      // Initialize build and output directories
      if (generateOutputFiles) {
        await _initializeOutputDirectories();
      }

      // Initialize analysis context
      final libPath = path.normalize(
        path.absolute(path.join(projectPath, 'lib')),
      );
      _collection = AnalysisContextCollection(
        includedPaths: [libPath],
        resourceProvider: PhysicalResourceProvider.INSTANCE,
      );
      _log("✓ Analysis context created");

      // Initialize components
      _dependencyResolver = DependencyResolver(
        projectPath,
        excludePatterns: excludePatterns,
      );
      _typeRegistry = TypeRegistry();

      if (enableCache) {
        _cache = AnalysisCache(cacheDir);
        await _cache.initialize();
      }

      _log('✓ Initialization complete');
    } catch (e, stackTrace) {
      _logError('Failed to initialize analyzer', e, stackTrace);
      rethrow;
    }
  }

  /// Initialize output directories in build folder
  Future<void> _initializeOutputDirectories() async {
    try {
      final buildDirectory = Directory(buildDir);
      if (!await buildDirectory.exists()) {
        await buildDirectory.create(recursive: true);
        _log('✓ Created build directory: $buildDir');
      }

      final outputDirectory = Directory(outputDir);
      if (!await outputDirectory.exists()) {
        await outputDirectory.create(recursive: true);
        _log('✓ Created output directory: $outputDir');
      }

      // Create subdirectories for organized output
      final subdirs = ['dependencies', 'types', 'imports', 'reports'];

      for (final subdir in subdirs) {
        final dir = Directory(path.join(outputDir, subdir));
        if (!await dir.exists()) {
          await dir.create(recursive: true);
        }
      }

      _log('✓ Output directory structure initialized');
    } catch (e, stackTrace) {
      _logError('Failed to initialize output directories', e, stackTrace);
      rethrow;
    }
  }

  /// Validate project structure before analysis
  Future<void> _validateProjectStructure() async {
    final libPath = path.normalize(
      path.absolute(path.join(projectPath, 'lib')),
    );
    final libDir = Directory(libPath);

    if (!await libDir.exists()) {
      throw StateError('lib directory not found at $projectPath');
    }

    final pubspecPath = path.normalize(
      path.absolute(path.join(projectPath, 'pubspec.yaml')),
    );
    final pubspecFile = File(pubspecPath);
    if (!await pubspecFile.exists()) {
      throw StateError('pubspec.yaml not found at $projectPath');
    }
  }

  // ==========================================================================
  // MAIN ANALYSIS PIPELINE
  // ==========================================================================

  /// Analyze entire project with multi-pass approach
  Future<ProjectAnalysisResult> analyzeProject() async {
    final stopwatch = Stopwatch()..start();

    try {
      print('🔍 Starting analysis of project at $projectPath');
      _notifyProgress(AnalysisPhase.starting, 0, 0, 'Starting analysis...');

      // PHASE 1: Build dependency graph
      final dependencyGraph = await _phase1_BuildDependencyGraph();
      final analysisOrder = dependencyGraph.topologicalSort();
      _totalFiles = analysisOrder.length;

      // PHASE 2: Detect changed files
      final changedFiles = await _phase2_DetectChangedFiles(analysisOrder);

      // PHASE 3: Type resolution pass
      final parsedFiles = await _phase3_ParseAndResolveTypes(
        analysisOrder,
        changedFiles,
      );

      // PHASE 4: Save cache
      if (enableCache) {
        await _phase4_CacheAnalysisResults(parsedFiles);
      }

      stopwatch.stop();

      final result = ProjectAnalysisResult(
        changedFiles: changedFiles,
        parsedUnits: parsedFiles,
        dependencyGraph: dependencyGraph,
        typeRegistry: _typeRegistry,
        analysisOrder: analysisOrder,
        statistics: AnalysisStatistics(
          totalFiles: _totalFiles,
          processedFiles: _processedFiles,
          cachedFiles: _cachedFiles,
          errorFiles: _errorFiles,
          durationMs: stopwatch.elapsedMilliseconds,
          changedFiles: changedFiles.length,
        ),
      );

      // PHASE 5: Generate output files
      if (generateOutputFiles) {
        await _phase5_GenerateOutputFiles(result);
      }

      _notifyProgress(
        AnalysisPhase.complete,
        _totalFiles,
        _totalFiles,
        'Analysis complete in ${stopwatch.elapsedMilliseconds}ms',
      );

      _logStatistics(result.statistics);

      return result;
    } catch (e, stackTrace) {
      _notifyProgress(
        AnalysisPhase.error,
        _processedFiles,
        _totalFiles,
        'Analysis failed: $e',
      );
      _logError('Analysis failed', e, stackTrace);
      rethrow;
    }
  }

  // ==========================================================================
  // PHASE 1: BUILD DEPENDENCY GRAPH
  // ==========================================================================

  Future<DependencyGraph> _phase1_BuildDependencyGraph() async {
    _notifyProgress(
      AnalysisPhase.dependencyResolution,
      0,
      0,
      'Building dependency graph...',
    );

    _log('📊 Phase 1: Building dependency graph...');

    try {
      final graph = await _dependencyResolver.buildGraph();

      // Detect circular dependencies
      final cycles = graph.detectCycles();
      if (cycles.isNotEmpty) {
        _log('⚠️  Warning: ${cycles.length} circular dependencies detected');
        if (enableVerboseLogging) {
          for (final cycle in cycles.take(5)) {
            _log('   ${cycle.map((f) => path.basename(f)).join(' -> ')}');
          }
          if (cycles.length > 5) {
            _log('   ... and ${cycles.length - 5} more');
          }
        }
      }

      final fileCount = graph.nodeCount;
      _log('✓ Dependency graph built: $fileCount files');

      return graph;
    } catch (e, stackTrace) {
      _logError('Failed to build dependency graph', e, stackTrace);
      rethrow;
    }
  }

  // ==========================================================================
  // PHASE 2: DETECT CHANGED FILES
  // ==========================================================================

  Future<Set<String>> _phase2_DetectChangedFiles(List<String> allFiles) async {
    _notifyProgress(
      AnalysisPhase.changeDetection,
      0,
      allFiles.length,
      'Detecting changes...',
    );

    _log('🔄 Phase 2: Detecting changes...');

    if (!enableCache) {
      _log('   Cache disabled, analyzing all files');
      return Set.from(allFiles);
    }

    final changedFiles = <String>{};
    final skippedFiles = <String>{};
    int checked = 0;
    int quickSkipped = 0;
    int hashComputed = 0;

    for (final filePath in allFiles) {
      try {
        final file = File(filePath);
        if (!await file.exists()) {
          _logVerbose('   File not found: ${path.basename(filePath)}');
          changedFiles.add(filePath);
          continue;
        }

        final stat = await file.stat();
        final currentModTime = stat.modified.millisecondsSinceEpoch;
        final cachedModTime = await _cache.getFileModTime(filePath);

        if (cachedModTime != null && currentModTime == cachedModTime) {
          quickSkipped++;
          skippedFiles.add(filePath);

          checked++;
          if (checked % 100 == 0) {
            _notifyProgress(
              AnalysisPhase.changeDetection,
              checked,
              allFiles.length,
              'Quick-checked $checked files (skipped: $quickSkipped)...',
            );
          }
          continue;
        }

        hashComputed++;
        final currentHash = await _computeFileHash(filePath);
        final cachedHash = await _cache.getFileHash(filePath);

        if (currentHash != cachedHash) {
          changedFiles.add(filePath);

          final dependents = _dependencyResolver.getAllDependents(filePath);
          changedFiles.addAll(dependents);

          _logVerbose(
            '   Changed: ${path.basename(filePath)} '
            '(+${dependents.length} dependents)',
          );
        } else {
          skippedFiles.add(filePath);
          _logVerbose('   Touch only: ${path.basename(filePath)}');
        }

        await _cache.setFileHash(filePath, currentHash);
        await _cache.setFileModTime(filePath, currentModTime);

        checked++;
        if (checked % 50 == 0) {
          _notifyProgress(
            AnalysisPhase.changeDetection,
            checked,
            allFiles.length,
            'Checked $checked files (hashed: $hashComputed, skipped: $quickSkipped)...',
          );
        }
      } catch (e) {
        _logVerbose('   Error checking ${path.basename(filePath)}: $e');
        changedFiles.add(filePath);
      }
    }

    final cachedCount = skippedFiles.length;
    _cachedFiles = cachedCount;

    _log(
      '✅ Change detection complete:\n'
      '   Changed files: ${changedFiles.length}\n'
      '   Cached (unchanged): $cachedCount\n'
      '   Quick-skipped by mod time: $quickSkipped\n'
      '   Hash computations: $hashComputed\n'
      '   Cache hit rate: ${((cachedCount / allFiles.length) * 100).toStringAsFixed(1)}%',
    );

    return changedFiles;
  }

  // ==========================================================================
  // PHASE 3: TYPE RESOLUTION
  // ==========================================================================

  Future<Map<String, ParsedFileInfo>> _phase3_ParseAndResolveTypes(
    List<String> filesInOrder,
    Set<String> changedFiles,
  ) async {
    _notifyProgress(
      AnalysisPhase.typeResolution,
      0,
      filesInOrder.length,
      'Parsing and resolving types...',
    );

    _log('🏷️ Phase 3: Parsing and resolving types...');

    final parsedFiles = <String, ParsedFileInfo>{};
    int processed = 0;

    for (final filePath in filesInOrder) {
      try {
        final result = await analyzeFile(filePath);
        if (result == null) {
          _logVerbose('   Skipping ${path.basename(filePath)} - parse failed');
          continue;
        }

        final visitor = TypeDeclarationVisitor(filePath, _typeRegistry);
        result.unit.accept(visitor);

        _logVerbose(
          '   Parsed ${path.basename(filePath)} - ${visitor.typesFound} types',
        );

        parsedFiles[filePath] = ParsedFileInfo(
          path: filePath,
          unit: result.unit,
          libraryElement: result.libraryElement,
          analysisResult: result,
          needsIRGeneration: changedFiles.contains(filePath),
        );

        processed++;
        _processedFiles = processed;

        if (processed % 20 == 0) {
          _notifyProgress(
            AnalysisPhase.typeResolution,
            processed,
            filesInOrder.length,
            'Parsed $processed/${filesInOrder.length} files...',
          );
        }
      } catch (e, stackTrace) {
        _logError('Error parsing ${path.basename(filePath)}', e, stackTrace);
        _errorFiles++;
      }
    }

    _log(
      '✓ Parsed ${parsedFiles.length} files, type registry: ${_typeRegistry.typeCount} types',
    );
    return parsedFiles;
  }

  // ==========================================================================
  // PHASE 4: CACHE PERSISTENCE
  // ==========================================================================

  Future<void> _phase4_CacheAnalysisResults(
    Map<String, ParsedFileInfo> parsedFiles,
  ) async {
    _notifyProgress(
      AnalysisPhase.caching,
      0,
      parsedFiles.length,
      'Caching analysis results...',
    );

    _log('💾 Phase 4: Caching analysis results...');

    try {
      int cached = 0;
      for (final entry in parsedFiles.entries) {
        await _cache.setFileHash(entry.key, entry.value.analysisResult.hash);
        cached++;

        if (cached % 50 == 0) {
          _notifyProgress(
            AnalysisPhase.caching,
            cached,
            parsedFiles.length,
            'Cached $cached files...',
          );
        }
      }

      await _cache.saveMetadata({
        'lastAnalysis': DateTime.now().toIso8601String(),
        'fileCount': parsedFiles.length,
        'typeCount': _typeRegistry.typeCount,
      });

      _log('✓ Cached ${parsedFiles.length} analysis results');
    } catch (e, stackTrace) {
      _logError('Failed to cache analysis results', e, stackTrace);
    }
  }

  // ==========================================================================
  // PHASE 5: OUTPUT FILE GENERATION
  // ==========================================================================

  Future<void> _phase5_GenerateOutputFiles(ProjectAnalysisResult result) async {
    _notifyProgress(
      AnalysisPhase.outputGeneration,
      0,
      5,
      'Generating output files...',
    );

    _log('📁 Phase 5: Generating output files in $outputDir...');

    try {
      int step = 0;

      // 1. Generate dependency graph report
      step++;
      _notifyProgress(
        AnalysisPhase.outputGeneration,
        step,
        5,
        'Generating dependency graph...',
      );
      await _generateDependencyGraph(result);
      _log('   ✓ Dependency graph generated');

      // 2. Generate type registry report
      step++;
      _notifyProgress(
        AnalysisPhase.outputGeneration,
        step,
        5,
        'Generating type registry...',
      );
      await _generateTypeRegistry(result);
      _log('   ✓ Type registry generated');

      // 3. Generate import analysis report
      step++;
      _notifyProgress(
        AnalysisPhase.outputGeneration,
        step,
        5,
        'Generating import analysis...',
      );
      await _generateImportAnalysis(result);
      _log('   ✓ Import analysis generated');

      // 4. Generate analysis summary report
      step++;
      _notifyProgress(
        AnalysisPhase.outputGeneration,
        step,
        5,
        'Generating summary report...',
      );
      await _generateAnalysisSummary(result);
      _log('   ✓ Summary report generated');

      // 5. Generate detailed statistics
      step++;
      _notifyProgress(
        AnalysisPhase.outputGeneration,
        step,
        5,
        'Generating statistics...',
      );
      await _generateStatisticsReport(result);
      _log('   ✓ Statistics report generated');

      _log('✓ All output files generated successfully in $outputDir');
    } catch (e, stackTrace) {
      _logError('Failed to generate output files', e, stackTrace);
    }
  }

  /// Generate dependency graph JSON file
  Future<void> _generateDependencyGraph(ProjectAnalysisResult result) async {
    try {
      final output = AnalysisOutputGenerator.generateDependencyGraphJson(
        result.dependencyGraph,
        result.analysisOrder,
      );

      final file = File(path.join(outputDir, 'dependencies', 'graph.json'));
      await file.writeAsString(jsonEncode(output), encoding: utf8, flush: true);
    } catch (e, stackTrace) {
      _logError('Failed to generate dependency graph', e, stackTrace);
    }
  }

  /// Generate type registry JSON file
  Future<void> _generateTypeRegistry(ProjectAnalysisResult result) async {
    try {
      final output = AnalysisOutputGenerator.generateTypeRegistryJson(
        result.typeRegistry,
      );

      final file = File(path.join(outputDir, 'types', 'registry.json'));
      await file.writeAsString(jsonEncode(output), encoding: utf8, flush: true);
    } catch (e, stackTrace) {
      _logError('Failed to generate type registry', e, stackTrace);
    }
  }

  /// Generate import analysis report
  Future<void> _generateImportAnalysis(ProjectAnalysisResult result) async {
    try {
      final importMap = <String, Set<String>>{};
      final externalImports = <String>{};

      for (final parsedFile in result.parsedUnits.values) {
        for (final import in parsedFile.imports) {
          if (import.isPackageImport || import.isDartCoreImport) {
            externalImports.add(import.uri);
          } else if (import.isRelative) {
            importMap
                .putIfAbsent(parsedFile.path, () => <String>{})
                .add(import.uri);
          }
        }
      }

      final output = {
        'timestamp': DateTime.now().toIso8601String(),
        'internalImports': importMap.map(
          (k, v) => MapEntry(path.relative(k, from: projectPath), v.toList()),
        ),
        'externalImports': externalImports.toList(),
        'uniqueExternalCount': externalImports.length,
      };

      final file = File(path.join(outputDir, 'imports', 'analysis.json'));
      await file.writeAsString(jsonEncode(output), encoding: utf8, flush: true);
    } catch (e, stackTrace) {
      _logError('Failed to generate import analysis', e, stackTrace);
    }
  }

  /// Generate analysis summary report
  Future<void> _generateAnalysisSummary(ProjectAnalysisResult result) async {
    try {
      final stats = result.statistics;
      final output = {
        'timestamp': DateTime.now().toIso8601String(),
        'projectPath': projectPath,
        'analysisDuration': '${stats.durationMs}ms',
        'summary': {
          'totalFiles': stats.totalFiles,
          'processedFiles': stats.processedFiles,
          'cachedFiles': stats.cachedFiles,
          'errorFiles': stats.errorFiles,
          'changedFiles': stats.changedFiles,
          'cacheHitRate': '${(stats.cacheHitRate * 100).toStringAsFixed(1)}%',
          'errorRate': '${(stats.errorRate * 100).toStringAsFixed(1)}%',
        },
        'performance': {
          'avgTimePerFile': '${stats.avgTimePerFile.toStringAsFixed(2)}ms',
          'throughput': '${stats.throughput.toStringAsFixed(0)} files/sec',
        },
        'output': {
          'dependencyGraphFile': 'dependencies/graph.json',
          'typeRegistryFile': 'types/registry.json',
          'importAnalysisFile': 'imports/analysis.json',
          'statisticsFile': 'reports/statistics.json',
          'summaryFile': 'reports/summary.json',
        },
      };

      final file = File(path.join(outputDir, 'reports', 'summary.json'));
      await file.writeAsString(jsonEncode(output), encoding: utf8, flush: true);
    } catch (e, stackTrace) {
      _logError('Failed to generate analysis summary', e, stackTrace);
    }
  }

  /// Generate detailed statistics report
  Future<void> _generateStatisticsReport(ProjectAnalysisResult result) async {
    try {
      final stats = result.statistics;
      final output = stats.toJson();
      output['timestamp'] = DateTime.now().toIso8601String();
      output['reportPath'] = outputDir;

      final file = File(path.join(outputDir, 'reports', 'statistics.json'));
      await file.writeAsString(jsonEncode(output), encoding: utf8, flush: true);
    } catch (e, stackTrace) {
      _logError('Failed to generate statistics report', e, stackTrace);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /// Analyze a single file incrementally
  Future<FileAnalysisResult?> analyzeFile(String filePath) async {
    try {
      final context = _getContextForFile(filePath);
      if (context == null) {
        _log('⚠️  No context found for $filePath');
        return null;
      }

      final session = context.currentSession;
      final result = await session.getResolvedUnit(filePath);

      if (result is ResolvedUnitResult) {
        final analysisResult = FileAnalysisResult(
          path: filePath,
          unit: result.unit,
          libraryElement: result.libraryElement,
          errors: result.diagnostics,
          imports: _extractImports(result.unit),
          exports: _extractExports(result.unit),
          parts: _extractParts(result.unit),
          hash: await _computeFileHash(filePath),
        );

        _analysisResults[filePath] = analysisResult;
        return analysisResult;
      }

      return null;
    } catch (e, stackTrace) {
      _logError('Failed to analyze file: $filePath', e, stackTrace);
      _errorFiles++;
      return null;
    }
  }

  /// Get analysis context for a specific file
  AnalysisContext? _getContextForFile(String filePath) {
    if (_fileToContext.containsKey(filePath)) {
      return _fileToContext[filePath];
    }

    try {
      for (final context in _collection.contexts) {
        final analyzedFiles = context.contextRoot.analyzedFiles();
        if (analyzedFiles.contains(filePath)) {
          _fileToContext[filePath] = context;
          return context;
        }
      }
    } catch (e) {
      _logVerbose('Error getting context for $filePath: $e');
    }

    return null;
  }

  /// Compute hash of file content with normalization
  Future<String> _computeFileHash(String filePath) async {
    try {
      final file = File(filePath);
      if (!await file.exists()) {
        throw FileSystemException('File not found', filePath);
      }

      var content = await file.readAsString(encoding: utf8);

      content = content
          .replaceAll('\r\n', '\n')
          .replaceAll('\r', '\n')
          .split('\n')
          .map((line) => line.trimRight())
          .join('\n')
          .trim();

      final bytes = utf8.encode(content);
      return md5.convert(bytes).toString();
    } catch (e) {
      _logVerbose('Failed to compute hash for $filePath: $e');
      return md5.convert(utf8.encode(filePath)).toString();
    }
  }

  /// Extract imports from compilation unit
  List<ImportInfo> _extractImports(CompilationUnit unit) {
    return unit.directives
        .whereType<ImportDirective>()
        .map(
          (import) => ImportInfo(
            uri: import.uri.stringValue ?? '',
            prefix: import.prefix?.name ?? '',
            isDeferred: import.deferredKeyword != null,
            showCombinators: import.combinators
                .whereType<ShowCombinator>()
                .expand((c) => c.shownNames.map((n) => n.name))
                .toList(),
            hideCombinators: import.combinators
                .whereType<HideCombinator>()
                .expand((c) => c.hiddenNames.map((n) => n.name))
                .toList(),
          ),
        )
        .toList();
  }

  /// Extract exports from compilation unit
  List<String> _extractExports(CompilationUnit unit) {
    return unit.directives
        .whereType<ExportDirective>()
        .map((export) => export.uri.stringValue ?? '')
        .where((uri) => uri.isNotEmpty)
        .toList();
  }

  /// Extract part directives from compilation unit
  List<String> _extractParts(CompilationUnit unit) {
    return unit.directives
        .whereType<PartDirective>()
        .map((part) => part.uri.stringValue ?? '')
        .where((uri) => uri.isNotEmpty)
        .toList();
  }

  // ==========================================================================
  // PROGRESS & LOGGING
  // ==========================================================================

  void _notifyProgress(
    AnalysisPhase phase,
    int current,
    int total,
    String message,
  ) {
    if (!_progressController.isClosed) {
      _progressController.add(
        AnalysisProgress(
          phase: phase,
          current: current,
          total: total,
          message: message,
          timestamp: DateTime.now(),
        ),
      );
    }
  }

  void _log(String message) {
    print(message);
  }

  void _logVerbose(String message) {
    if (enableVerboseLogging) {
      print(message);
    }
  }

  void _logError(String message, Object error, StackTrace stackTrace) {
    print('❌ $message');
    print('   Error: $error');
    if (enableVerboseLogging) {
      print('   Stack trace:\n$stackTrace');
    }
  }

  void _logStatistics(AnalysisStatistics stats) {
    _log('\n📊 Analysis Statistics:');
    _log('   Total files:     ${stats.totalFiles}');
    _log('   Processed:       ${stats.processedFiles}');
    _log('   Cached:          ${stats.cachedFiles}');
    _log('   Errors:          ${stats.errorFiles}');
    _log('   Changed files:   ${stats.changedFiles}');
    _log('   Duration:        ${stats.durationMs}ms');
    _log('   Avg per file:    ${stats.avgTimePerFile.toStringAsFixed(1)}ms');

    if (stats.totalFiles > 0) {
      _log(
        '   Cache hit rate:  ${(stats.cacheHitRate * 100).toStringAsFixed(1)}%',
      );
    }

    if (generateOutputFiles) {
      _log('\n📁 Output Files:');
      _log('   Location: $outputDir');
      _log('   - dependencies/graph.json');
      _log('   - types/registry.json');
      _log('   - imports/analysis.json');
      _log('   - reports/summary.json');
      _log('   - reports/statistics.json');
    }
  }

  /// Clean up resources
  void dispose() {
    _progressController.close();
    if (enableCache) {
      _cache.dispose();
    }
  }
}

// ==========================================================================
// RESULT CLASSES
// ==========================================================================

/// Result of analyzing the entire project - NO IR, only analysis metadata
class ProjectAnalysisResult {
  // Files that need IR generation (changed + dependents)
  final Set<String> changedFiles;

  // Pre-parsed ASTs ready for IR generation
  final Map<String, ParsedFileInfo> parsedUnits;

  // Analysis metadata
  final DependencyGraph dependencyGraph;
  final TypeRegistry typeRegistry;
  final List<String> analysisOrder;
  final AnalysisStatistics statistics;

  ProjectAnalysisResult({
    required this.changedFiles,
    required this.parsedUnits,
    required this.dependencyGraph,
    required this.typeRegistry,
    required this.analysisOrder,
    required this.statistics,
  });

  /// Get parsed info for a specific file
  ParsedFileInfo? getParsedFile(String filePath) => parsedUnits[filePath];

  /// Get all files that need IR generation
  List<String> getFilesNeedingIR() => changedFiles.toList();

  /// Get all successfully parsed files
  List<String> getAllParsedFiles() => parsedUnits.keys.toList();
}

/// Result of analyzing a single file
class FileAnalysisResult {
  final String path;
  final CompilationUnit unit;
  final analyzer_results.LibraryElement libraryElement;
  final List<analyzer_diagnostic.Diagnostic> errors;
  final List<ImportInfo> imports;
  final List<String> exports;
  final List<String> parts;
  final String hash;

  FileAnalysisResult({
    required this.path,
    required this.unit,
    required this.libraryElement,
    required this.errors,
    required this.imports,
    required this.exports,
    required this.parts,
    required this.hash,
  });

  bool get hasErrors =>
      errors.any((e) => e.severity == analyzer_diagnostic.Severity.error);

  List<analyzer_diagnostic.Diagnostic> get errorList => errors
      .where((e) => e.severity == analyzer_diagnostic.Severity.error)
      .toList();

  List<analyzer_diagnostic.Diagnostic> get warnings => errors
      .where((e) => e.severity == analyzer_diagnostic.Severity.warning)
      .toList();
}

/// Import information with detailed combinators
class ImportInfo {
  final String uri;
  final String prefix;
  final bool isDeferred;
  final List<String> showCombinators;
  final List<String> hideCombinators;

  ImportInfo({
    required this.uri,
    this.prefix = '',
    this.isDeferred = false,
    this.showCombinators = const [],
    this.hideCombinators = const [],
  });

  bool get isRelative =>
      !uri.startsWith('dart:') && !uri.startsWith('package:');
  bool get isPackageImport => uri.startsWith('package:');
  bool get isDartCoreImport => uri.startsWith('dart:');

  factory ImportInfo.fromJson(Map<String, dynamic> json) {
    return ImportInfo(
      uri: json['uri'] as String,
      prefix: json['prefix'] as String? ?? '',
      isDeferred: json['isDeferred'] as bool? ?? false,
      showCombinators:
          (json['showCombinators'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      hideCombinators:
          (json['hideCombinators'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
    'uri': uri,
    'prefix': prefix,
    'isDeferred': isDeferred,
    'showCombinators': showCombinators,
    'hideCombinators': hideCombinators,
  };
}

/// Analysis progress information
class AnalysisProgress {
  final AnalysisPhase phase;
  final int current;
  final int total;
  final String message;
  final DateTime timestamp;

  AnalysisProgress({
    required this.phase,
    required this.current,
    required this.total,
    required this.message,
    required this.timestamp,
  });

  double get progress => total > 0 ? current / total : 0.0;
  int get percentage => (progress * 100).round();
}

/// Analysis phase enumeration
enum AnalysisPhase {
  starting,
  dependencyResolution,
  changeDetection,
  typeResolution,
  caching,
  outputGeneration,
  complete,
  error,
}

/// Analysis statistics
class AnalysisStatistics {
  final int totalFiles;
  final int processedFiles;
  final int cachedFiles;
  final int errorFiles;
  final int durationMs;
  final int changedFiles;

  AnalysisStatistics({
    required this.totalFiles,
    required this.processedFiles,
    required this.cachedFiles,
    required this.errorFiles,
    required this.durationMs,
    required this.changedFiles,
  });

  double get cacheHitRate => totalFiles > 0 ? cachedFiles / totalFiles : 0.0;
  double get errorRate => totalFiles > 0 ? errorFiles / totalFiles : 0.0;
  double get avgTimePerFile =>
      processedFiles > 0 ? durationMs / processedFiles : 0.0;
  double get throughput =>
      durationMs > 0 ? (processedFiles * 1000.0) / durationMs : 0.0;

  Map<String, dynamic> toJson() => {
    'totalFiles': totalFiles,
    'processedFiles': processedFiles,
    'cachedFiles': cachedFiles,
    'errorFiles': errorFiles,
    'durationMs': durationMs,
    'changedFiles': changedFiles,
    'cacheHitRate': cacheHitRate,
    'errorRate': errorRate,
    'avgTimePerFile': avgTimePerFile,
    'throughput': throughput,
  };

  @override
  String toString() {
    return 'AnalysisStatistics('
        'total: $totalFiles, '
        'processed: $processedFiles, '
        'cached: $cachedFiles (${(cacheHitRate * 100).toStringAsFixed(1)}%), '
        'errors: $errorFiles, '
        'duration: ${durationMs}ms, '
        'avg: ${avgTimePerFile.toStringAsFixed(1)}ms/file'
        ')';
  }
}

/// Parsed file information ready for IR generation
class ParsedFileInfo {
  final String path;
  final CompilationUnit unit;
  final analyzer_results.LibraryElement libraryElement;
  final FileAnalysisResult analysisResult;
  final bool needsIRGeneration;

  ParsedFileInfo({
    required this.path,
    required this.unit,
    required this.libraryElement,
    required this.analysisResult,
    required this.needsIRGeneration,
  });

  bool get hasErrors => analysisResult.hasErrors;
  List<ImportInfo> get imports => analysisResult.imports;
  List<String> get exports => analysisResult.exports;
  List<String> get parts => analysisResult.parts;
}

// /// Simple cache for analysis metadata (NOT IR)
// class AnalysisCache {
//   final String cacheDir;
//   final Map<String, String> _fileHashes = {};
//   Map<String, dynamic> _metadata = {};

//   AnalysisCache(this.cacheDir);

//   Future<void> initialize() async {
//     final dir = Directory(cacheDir);
//     if (!await dir.exists()) {
//       await dir.create(recursive: true);
//     }

//     await _loadHashIndex();
//     await _loadMetadata();
//   }

//   Future<String?> getFileHash(String filePath) async {
//     return _fileHashes[filePath];
//   }

//   Future<void> setFileHash(String filePath, String hash) async {
//     _fileHashes[filePath] = hash;
//   }

//   Future<void> saveMetadata(Map<String, dynamic> metadata) async {
//     _metadata = metadata;
//     await _saveMetadata();
//   }

//   Future<Map<String, dynamic>> getMetadata() async {
//     return Map.from(_metadata);
//   }

//   Future<void> _loadHashIndex() async {
//     try {
//       final indexFile = File(path.join(cacheDir, 'hash_index.json'));
//       if (!await indexFile.exists()) return;

//       final content = await indexFile.readAsString();
//       final Map<String, dynamic> json = jsonDecode(content);
//       _fileHashes.addAll(json.cast<String, String>());
//     } catch (e) {
//       print('Warning: Failed to load hash index: $e');
//     }
//   }

//   Future<void> _loadMetadata() async {
//     try {
//       final metadataFile = File(path.join(cacheDir, 'metadata.json'));
//       if (!await metadataFile.exists()) return;

//       final content = await metadataFile.readAsString();
//       _metadata = jsonDecode(content);
//     } catch (e) {
//       print('Warning: Failed to load metadata: $e');
//     }
//   }

//   Future<void> _saveHashIndex() async {
//     try {
//       final indexFile = File(path.join(cacheDir, 'hash_index.json'));
//       final content = jsonEncode(_fileHashes);
//       await indexFile.writeAsString(content);
//     } catch (e) {
//       print('Warning: Failed to save hash index: $e');
//     }
//   }

//   Future<void> _saveMetadata() async {
//     try {
//       final metadataFile = File(path.join(cacheDir, 'metadata.json'));
//       final content = jsonEncode(_metadata);
//       await metadataFile.writeAsString(content);
//     } catch (e) {
//       print('Warning: Failed to save metadata: $e');
//     }
//   }

//   void dispose() {
//     _fileHashes.clear();
//     _metadata.clear();
//   }
// }
