import 'package:analyzer/dart/analysis/analysis_context.dart';
import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/file_system/physical_file_system.dart';
import 'package:path/path.dart' as path;
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:analyzer/diagnostic/diagnostic.dart' as analyzer_diagnostic;
import 'package:analyzer/dart/element/element.dart' as analyzer_results;

import 'TypeDeclarationVisitor.dart';
import 'dependency_graph.dart';
import 'dependency_resolver.dart';
import 'analyze_flutter_app.dart';
import 'incremental_cache.dart';
import 'ir_linker.dart';
import 'model/class_model.dart';
import 'type_registry.dart';
import 'dart:async';
import 'package:analyzer/dart/ast/ast.dart';

// void main() async {
//   final analyzer = ProjectAnalyzer('/path/to/flutter/project');

//   await analyzer.initialize();

//   // First run: Full analysis
//   print('First analysis...');
//   var result = await analyzer.analyzeProject();
//   print('Found ${result.fileIRs.length} files');

//   // Make a change to one file
//   print('\nMaking a change...');
//   await File('/path/to/flutter/project/lib/widgets/button.dart')
//       .writeAsString('// Modified\n' + content);

//   // Second run: Incremental analysis (much faster)
//   print('\nIncremental analysis...');
//   result = await analyzer.analyzeProject();
//   print('Only re-analyzed changed files + dependents');

//   // Link into complete app IR
//   final appIR = result.linkIntoAppIR();

//   analyzer.dispose();
// }

/// Advanced multi-pass project analyzer with incremental compilation support
///
/// **Architecture:**
/// ```
/// Phase 1: Discovery & Dependency Resolution
///    ↓
/// Phase 2: Change Detection (Incremental)
///    ↓
/// Phase 3: Type Resolution (Parallel)
///    ↓
/// Phase 4: IR Generation (Parallel, Dependency-Ordered)
///    ↓
/// Phase 5: IR Linking & Validation
///    ↓
/// Phase 6: Cache Persistence
/// ```
class ProjectAnalyzer {
  final String projectPath;
  final String cacheDir;

  late AnalysisContextCollection _collection;

  // Multi-pass components
  late DependencyResolver _dependencyResolver;
  late TypeRegistry _typeRegistry;
  late IncrementalCache _cache;

  // Configuration
  final int maxParallelism;
  final bool enableVerboseLogging;
  final bool enableCache;
  final bool enableParallelProcessing;
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
    this.maxParallelism = 4,
    this.enableVerboseLogging = true,
    this.enableCache = true,
    this.enableParallelProcessing = true,
    this.excludePatterns = const [
      '**/.dart_tool/**',
      '**/build/**',
      '**/*.g.dart',
      '**/*.freezed.dart',
      '**/*.mocks.dart',
      '**/test/**',
    ],
  }) : cacheDir = cacheDir ?? path.join(projectPath, '.flutter_js_cache');

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /// Initialize the analyzer with dependency resolution
  Future<void> initialize() async {
    _log('🚀 Initializing ProjectAnalyzer...');

    try {
      // Validate project structure
      await _validateProjectStructure();

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
      _dependencyResolver = DependencyResolver(projectPath);
      _typeRegistry = TypeRegistry();

      if (enableCache) {
        _cache = IncrementalCache(cacheDir);
        await _cache.initialize();
      }

      _log('✓ Initialization complete');
    } catch (e, stackTrace) {
      _logError('Failed to initialize analyzer', e, stackTrace);
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

    final pubSpacPath = path.normalize(
      path.absolute(path.join(projectPath, 'pubspec.yaml')),
    );
    final pubspecFile = File(pubSpacPath);
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
      await _phase3_TypeResolution(analysisOrder, changedFiles);

      // PHASE 4: Per-file IR generation
      final fileIRs = await _phase4_GenerateIRs(analysisOrder, changedFiles);

      // PHASE 5: Link and validate
      final appIR = await _phase5_LinkAndValidate(fileIRs, dependencyGraph);

      // PHASE 6: Save cache
      if (enableCache) {
        await _phase6_PersistCache(fileIRs);
      }

      stopwatch.stop();

      final result = ProjectAnalysisResult(
        fileIRs: fileIRs,
        appIR: appIR,
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
          hash: await _computeFileHash(filePath),
        );

        _analysisResults[filePath] = analysisResult;
        return analysisResult;
      }

      return null;
    } catch (e, stackTrace) {
      _logError('Failed to analyze file: $filePath', e, stackTrace);
      return null;
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

    final graph = await _dependencyResolver.buildGraph();

    // Detect circular dependencies
    final cycles = graph.detectCycles();
    if (cycles.isNotEmpty) {
      _log('⚠️  Warning: ${cycles.length} circular dependencies detected');
      if (enableVerboseLogging) {
        for (final cycle in cycles) {
          _log('   ${cycle.map((f) => path.basename(f)).join(' -> ')}');
        }
      }
    }

    final fileCount = graph.nodeCount;
    _log('✓ Dependency graph built: $fileCount files');

    return graph;
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
    int checked = 0;

    for (final filePath in allFiles) {
      try {
        final currentHash = await _computeFileHash(filePath);
        final cachedHash = await _cache.getFileHash(filePath);

        if (currentHash != cachedHash) {
          changedFiles.add(filePath);

          // Invalidate all dependents recursively
          final dependents = _dependencyResolver.getAllDependents(filePath);
          changedFiles.addAll(dependents);

          _logVerbose(
            '   Changed: ${path.basename(filePath)} '
            '(+${dependents.length} dependents)',
          );
        }

        checked++;
        if (checked % 50 == 0) {
          _notifyProgress(
            AnalysisPhase.changeDetection,
            checked,
            allFiles.length,
            'Checked $checked files...',
          );
        }
      } catch (e) {
        _logVerbose('   Error checking ${path.basename(filePath)}: $e');
        // Treat as changed on error
        changedFiles.add(filePath);
      }
    }

    _log(
      '✓ ${changedFiles.length} files changed (${allFiles.length - changedFiles.length} cached)',
    );
    _cachedFiles = allFiles.length - changedFiles.length;

    return changedFiles;
  }

  // ==========================================================================
  // PHASE 3: TYPE RESOLUTION
  // ==========================================================================

  Future<void> _phase3_TypeResolution(
    List<String> filesInOrder,
    Set<String> changedFiles,
  ) async {
    _notifyProgress(
      AnalysisPhase.typeResolution,
      0,
      filesInOrder.length,
      'Resolving types...',
    );

    _log('🏷️  Phase 3: Resolving types...');

    int processed = 0;

    if (enableParallelProcessing) {
      // Process in batches while respecting dependency order
      final batches = _createDependencyOrderedBatches(
        filesInOrder,
        changedFiles,
      );

      for (final batch in batches) {
        await _processTypeResolutionBatch(batch);
        processed += batch.length;

        _notifyProgress(
          AnalysisPhase.typeResolution,
          processed,
          filesInOrder.length,
          'Resolved $processed types...',
        );
      }
    } else {
      // Sequential processing
      for (final filePath in filesInOrder) {
        await _resolveTypesForFile(filePath, changedFiles);
        processed++;

        if (processed % 20 == 0) {
          _notifyProgress(
            AnalysisPhase.typeResolution,
            processed,
            filesInOrder.length,
            'Resolved $processed types...',
          );
        }
      }
    }

    _log('✓ Type registry populated: ${_typeRegistry.typeCount} types');
  }

  Future<void> _processTypeResolutionBatch(List<String> batch) async {
    final futures = batch.map((filePath) async {
      try {
        final result = await analyzeFile(filePath);
        if (result != null) {
          final visitor = TypeDeclarationVisitor(filePath, _typeRegistry);
          result.unit.accept(visitor);
        }
      } catch (e) {
        _logVerbose(
          '   Error resolving types in ${path.basename(filePath)}: $e',
        );
      }
    });

    await Future.wait(futures);
  }

  Future<void> _resolveTypesForFile(
    String filePath,
    Set<String> changedFiles,
  ) async {
    // Skip if not changed and already in registry
    if (!changedFiles.contains(filePath) &&
        _typeRegistry.hasTypesForFile(filePath)) {
      return;
    }

    try {
      final result = await analyzeFile(filePath);
      if (result == null) return;

      // Extract type declarations
      final visitor = TypeDeclarationVisitor(filePath, _typeRegistry);
      result.unit.accept(visitor);

      _logVerbose(
        '   ✓ ${path.basename(filePath)}: ${visitor.typesFound} types',
      );
    } catch (e) {
      _logVerbose('   ✗ ${path.basename(filePath)}: $e');
    }
  }

  // ==========================================================================
  // PHASE 4: IR GENERATION
  // ==========================================================================

  Future<Map<String, FileDeclaration>> _phase4_GenerateIRs(
    List<String> filesInOrder,
    Set<String> changedFiles,
  ) async {
    _notifyProgress(
      AnalysisPhase.irGeneration,
      0,
      filesInOrder.length,
      'Generating IR...',
    );

    _log('🔨 Phase 4: Generating IR...');

    final fileIRs = <String, FileDeclaration>{};
    int processed = 0;

    if (enableParallelProcessing) {
      final batches = _createDependencyOrderedBatches(
        filesInOrder,
        changedFiles,
      );

      for (final batch in batches) {
        final batchResults = await _processIRGenerationBatch(
          batch,
          changedFiles,
        );
        fileIRs.addAll(batchResults);
        processed += batch.length;

        _notifyProgress(
          AnalysisPhase.irGeneration,
          processed,
          filesInOrder.length,
          'Generated $processed IRs...',
        );
      }
    } else {
      for (final filePath in filesInOrder) {
        final ir = await _generateIRForFile(filePath, changedFiles);
        if (ir != null) {
          fileIRs[filePath] = ir;
        }
        processed++;

        if (processed % 20 == 0) {
          _notifyProgress(
            AnalysisPhase.irGeneration,
            processed,
            filesInOrder.length,
            'Generated $processed IRs...',
          );
        }
      }
    }

    _processedFiles = processed;
    _log('✓ Generated ${fileIRs.length} file IRs');

    return fileIRs;
  }

  Future<Map<String, FileDeclaration>> _processIRGenerationBatch(
    List<String> batch,
    Set<String> changedFiles,
  ) async {
    final results = <String, FileDeclaration>{};

    final futures = batch.map((filePath) async {
      final ir = await _generateIRForFile(filePath, changedFiles);
      if (ir != null) {
        return MapEntry(filePath, ir);
      }
      return null;
    });

    final entries = await Future.wait(futures);

    for (final entry in entries) {
      if (entry != null) {
        results[entry.key] = entry.value;
      }
    }

    return results;
  }

  Future<FileDeclaration?> _generateIRForFile(
    String filePath,
    Set<String> changedFiles,
  ) async {
    try {
      // Use cache if file hasn't changed
      if (enableCache && !changedFiles.contains(filePath)) {
        final cached = await _cache.getFileDeclaration(filePath);
        if (cached != null) {
          _logVerbose('   ⚡ ${path.basename(filePath)} (cached)');
          return cached;
        }
      }

      // Generate new IR
      final result = await analyzeFile(filePath);
      if (result == null) {
        _errorFiles++;
        return null;
      }

      if (result.hasErrors) {
        _log(
          '⚠️  ${path.basename(filePath)} has ${result.errors.length} errors',
        );
        _errorFiles++;
      }

      final analysisContext = FileAnalysisContext(
        currentFile: filePath,
        typeRegistry: _typeRegistry,
        dependencyGraph: _dependencyResolver.graph,
      );
      print('🔍 Generating IR for: ${path.basename(filePath)}');
      print('   Analysis result: ${result != null ? "✓" : "✗"}');
      print('   Has errors: ${result?.hasErrors}');
      if (result?.hasErrors == true) {
        print('   Errors:');
        for (final error in result!.errorList) {
          print('      - ${error.message}');
        }
      }
      final visitor = FileDeclarationGenerator(analysisContext);
      print('   Visitor created: ✓');
      result.unit.accept(visitor);
      print('   AST visited: ✓');

      final fileIR = visitor.buildFileDeclaration();
      print(
        '   IR built: ✓ (${fileIR.widgets.length}W, ${fileIR.classes.length}C)',
      );
      // Update cache hash
      if (enableCache) {
        await _cache.setFileHash(filePath, result.hash);
      }

      _logVerbose(
        '   ✓ ${path.basename(filePath)}: '
        '${fileIR.widgets.length}W ${fileIR.classes.length}C',
      );

      return fileIR;
    } catch (e, stackTrace) {
      print('❌ DETAILED ERROR in _generateIRForFile:');
      print('   File: $filePath');
      print('   Error type: ${e.runtimeType}');
      print('   Error: $e');
      print('   Stack trace:');
      print(stackTrace);
      _logError('Failed to generate IR for $filePath', e, stackTrace);
      _errorFiles++;
      return null;
    }
  }

  // ==========================================================================
  // PHASE 5: LINKING & VALIDATION
  // ==========================================================================

  Future<FlutterAppDeclaration> _phase5_LinkAndValidate(
    Map<String, FileDeclaration> fileIRs,
    DependencyGraph dependencyGraph,
  ) async {
    _notifyProgress(AnalysisPhase.linking, 0, 1, 'Linking IRs...');

    _log('🔗 Phase 5: Linking and validating...');

    try {
      final linker = DeclarationLinker(
        dependencyGraph: dependencyGraph,
        typeRegistry: _typeRegistry,
        fileDeclarations: fileIRs,
      );

      final appIR = linker.link();

      // Validate
      final validator = DeclarationValidator(appIR, _typeRegistry);
      final validationResult = validator.validate();

      if (!validationResult.isValid) {
        _log('⚠️  Validation found ${validationResult.errors.length} errors:');
        for (final error in validationResult.errors.take(10)) {
          _log('   - $error');
        }
        if (validationResult.errors.length > 10) {
          _log('   ... and ${validationResult.errors.length - 10} more');
        }
      }

      if (validationResult.warnings.isNotEmpty) {
        _log(
          '⚠️  Validation found ${validationResult.warnings.length} warnings:',
        );
        for (final warning in validationResult.warnings.take(5)) {
          _log('   - $warning');
        }
        if (validationResult.warnings.length > 5) {
          _log('   ... and ${validationResult.warnings.length - 5} more');
        }
      }

      if (validationResult.isValid && validationResult.warnings.isEmpty) {
        _log('✓ Validation passed');
      }

      _log(
        '✓ Linked app IR: '
        '${appIR.widgets.length}W ${appIR.stateClasses.length}S '
        '${appIR.providers.length}P',
      );

      return appIR;
    } catch (e, stackTrace) {
      _logError('Linking failed', e, stackTrace);
      rethrow;
    }
  }

  // ==========================================================================
  // PHASE 6: CACHE PERSISTENCE
  // ==========================================================================

  Future<void> _phase6_PersistCache(
    Map<String, FileDeclaration> fileIRs,
  ) async {
    _notifyProgress(
      AnalysisPhase.caching,
      0,
      fileIRs.length,
      'Saving cache...',
    );

    _log('💾 Phase 6: Saving cache...');

    try {
      await _cache.saveAll(fileIRs);
      _log('✓ Cache saved: ${fileIRs.length} files');
    } catch (e, stackTrace) {
      _logError('Failed to save cache', e, stackTrace);
      // Non-fatal, continue
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /// Create batches of files that can be processed in parallel
  /// while respecting dependency order
  List<List<String>> _createDependencyOrderedBatches(
    List<String> filesInOrder,
    Set<String> filesToProcess,
  ) {
    final batches = <List<String>>[];
    final processed = <String>{};
    final batch = <String>[];

    for (final file in filesInOrder) {
      if (!filesToProcess.contains(file)) {
        processed.add(file);
        continue;
      }

      // Check if all dependencies are processed
      final deps = _dependencyResolver.getDependencies(file);
      if (deps.every((dep) => processed.contains(dep))) {
        batch.add(file);

        if (batch.length >= maxParallelism) {
          batches.add(List.from(batch));
          processed.addAll(batch);
          batch.clear();
        }
      }
    }

    if (batch.isNotEmpty) {
      batches.add(batch);
    }

    return batches;
  }

  /// Get analysis context for a specific file
  AnalysisContext? _getContextForFile(String filePath) {
    // Cache lookup
    if (_fileToContext.containsKey(filePath)) {
      return _fileToContext[filePath];
    }

    // Find context
    for (final context in _collection.contexts) {
      if (context.contextRoot.isAnalyzed(filePath)) {
        _fileToContext[filePath] = context;
        return context;
      }
    }

    return null;
  }

  /// Compute hash of file content
  Future<String> _computeFileHash(String filePath) async {
    try {
      final file = File(filePath);
      final content = await file.readAsBytes();
      return md5.convert(content).toString();
    } catch (e) {
      _logVerbose('Failed to compute hash for $filePath: $e');
      // Return timestamp-based hash as fallback
      return DateTime.now().millisecondsSinceEpoch.toString();
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

  void _log(String message) {
    // if (enableVerboseLogging) {
    print(message);
    // }
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

/// Result of analyzing the entire project
class ProjectAnalysisResult {
  final Map<String, FileDeclaration> fileIRs;
  final FlutterAppDeclaration appIR;
  final DependencyGraph dependencyGraph;
  final TypeRegistry typeRegistry;
  final List<String> analysisOrder;
  final AnalysisStatistics statistics;

  ProjectAnalysisResult({
    required this.fileIRs,
    required this.appIR,
    required this.dependencyGraph,
    required this.typeRegistry,
    required this.analysisOrder,
    required this.statistics,
  });

  /// Get IR for a specific file
  FileDeclaration? getFileDeclaration(String filePath) => fileIRs[filePath];

  /// Get all widgets in the project
  List<WidgetDeclaration> get allWidgets => appIR.widgets;

  /// Get all state classes in the project
  List<StateClassDeclaration> get allStateClasses => appIR.stateClasses;

  /// Get all providers in the project
  List<ProviderDeclaration> get allProviders => appIR.providers;
}

/// Result of analyzing a single file
class FileAnalysisResult {
  final String path;
  final CompilationUnit unit;
  final analyzer_results.LibraryElement libraryElement;
  final List<analyzer_diagnostic.Diagnostic> errors;
  final List<ImportInfo> imports;
  final List<String> exports;
  final String hash;

  FileAnalysisResult({
    required this.path,
    required this.unit,
    required this.libraryElement,
    required this.errors,
    required this.imports,
    required this.exports,
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

/// Context for analyzing a single file
class FileAnalysisContext {
  final String currentFile;
  final TypeRegistry typeRegistry;
  final DependencyGraph dependencyGraph;

  FileAnalysisContext({
    required this.currentFile,
    required this.typeRegistry,
    required this.dependencyGraph,
  });

  /// Get dependencies of current file
  List<String> getDependencies() {
    return dependencyGraph.getDependencies(currentFile);
  }

  /// Get all dependents (files that depend on this file)
  List<String> getDependents() {
    return dependencyGraph.getDependents(currentFile);
  }

  /// Resolve a type name to its full information
  TypeInfo? resolveType(String typeName) {
    return typeRegistry.lookupType(typeName);
  }

  /// Check if a type is available in current context
  bool isTypeAvailable(String typeName) {
    return typeRegistry.isTypeAvailableIn(typeName, currentFile);
  }
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
  irGeneration,
  linking,
  caching,
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
