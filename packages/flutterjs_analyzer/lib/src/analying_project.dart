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
import 'type_registry.dart';
import 'dart:async';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:dev_tools/dev_tools.dart'; // ADD THIS

/// Advanced multi-pass project analyzer
class ProjectAnalyzer {
  final String projectPath;
  final String buildDir;
  final String outputDir;

  late AnalysisContextCollection _collection;

  // Multi-pass components
  late DependencyResolver _dependencyResolver;
  late TypeRegistry _typeRegistry;

  // Configuration
  final int maxParallelism;
  final bool enableVerboseLogging;
  final bool generateOutputFiles;
  final List<String> excludePatterns;

  // Analysis state
  final Map<String, AnalysisContext> _fileToContext = {};
  final Map<String, FileAnalysisResult> _analysisResults = {};

  ProjectAnalyzer(
    this.projectPath, {
    String? buildDir,
    String? outputDir,
    this.maxParallelism = 4,
    this.enableVerboseLogging = true,
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
    return await debugger.observe('analyzer_initialization', () async {
      debugger.log(
        DebugLevel.info,
        'Initializing ProjectAnalyzer',
        category: 'analyzer',
      );

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
        debugger.log(
          DebugLevel.debug,
          'Analysis context created',
          category: 'analyzer',
        );

        // Initialize components
        _dependencyResolver = DependencyResolver(
          projectPath,
          excludePatterns: excludePatterns,
        );
        _typeRegistry = TypeRegistry();

        debugger.log(
          DebugLevel.info,
          'Initialization complete',
          category: 'analyzer',
        );
      } catch (e, stackTrace) {
        debugger.log(
          DebugLevel.error,
          'Failed to initialize analyzer: $e\n$stackTrace',
          category: 'analyzer',
        );
        rethrow;
      }
    }, category: 'analyzer');
  }

  /// Initialize output directories in build folder
  Future<void> _initializeOutputDirectories() async {
    try {
      final buildDirectory = Directory(buildDir);
      if (!await buildDirectory.exists()) {
        await buildDirectory.create(recursive: true);
        debugger.log(
          DebugLevel.debug,
          'Created build directory: $buildDir',
          category: 'analyzer',
        );
      }

      final outputDirectory = Directory(outputDir);
      if (!await outputDirectory.exists()) {
        await outputDirectory.create(recursive: true);
        debugger.log(
          DebugLevel.debug,
          'Created output directory: $outputDir',
          category: 'analyzer',
        );
      }

      // Create subdirectories for organized output
      final subdirs = ['dependencies', 'types', 'imports', 'reports'];

      for (final subdir in subdirs) {
        final dir = Directory(path.join(outputDir, subdir));
        if (!await dir.exists()) {
          await dir.create(recursive: true);
        }
      }

      debugger.log(
        DebugLevel.debug,
        'Output directory structure initialized',
        category: 'analyzer',
      );
    } catch (e, stackTrace) {
      debugger.log(
        DebugLevel.error,
        'Failed to initialize output directories: $e\n$stackTrace',
        category: 'analyzer',
      );
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
    return await debugger.observe('full_project_analysis', () async {
      debugger.log(
        DebugLevel.info,
        'Starting analysis of project at $projectPath',
        category: 'analysis',
      );

      // PHASE 1: Build dependency graph
      final dependencyGraph = await debugger.observe(
        'phase_1_dependency_graph',
        () async {
          return await _phase1_BuildDependencyGraph();
        },
        category: 'analysis_phase',
      );

      final analysisOrder = dependencyGraph.topologicalSort();
      final totalFiles = analysisOrder.length;

      debugger.log(
        DebugLevel.debug,
        'Analysis order: $totalFiles files to process',
        category: 'analysis',
      );

      // PHASE 3: Type resolution pass
      final parsedFiles = await debugger.observe(
        'phase_3_type_resolution',
        () async {
          return await _phase3_ParseAndResolveTypes(analysisOrder);
        },
        category: 'analysis_phase',
      );

      // Compile results
      final changedFiles = Set<String>.from(analysisOrder);
      int processedFiles = parsedFiles.length;
      int errorFiles = parsedFiles.values
          .where((f) => f.analysisResult.hasErrors)
          .length;

      final result = ProjectAnalysisResult(
        changedFiles: changedFiles,
        parsedUnits: parsedFiles,
        dependencyGraph: dependencyGraph,
        typeRegistry: _typeRegistry,
        analysisOrder: analysisOrder,
        statistics: AnalysisStatistics(
          totalFiles: totalFiles,
          processedFiles: processedFiles,
          cachedFiles: 0,
          errorFiles: errorFiles,
          durationMs: 0,
          changedFiles: changedFiles.length,
        ),
      );

      // PHASE 5: Generate output files
      if (generateOutputFiles) {
        await debugger.observe('phase_5_output_generation', () async {
          await _phase5_GenerateOutputFiles(result);
        }, category: 'analysis_phase');
      }

      debugger.log(
        DebugLevel.info,
        'Analysis complete: $processedFiles files processed, '
        '$errorFiles with errors',
        category: 'analysis',
      );

      return result;
    }, category: 'analysis');
  }

  // ==========================================================================
  // PHASE 1: BUILD DEPENDENCY GRAPH
  // ==========================================================================

  Future<DependencyGraph> _phase1_BuildDependencyGraph() async {
    debugger.log(
      DebugLevel.debug,
      'Phase 1: Building dependency graph',
      category: 'analysis',
    );

    try {
      final graph = await _dependencyResolver.buildGraph();

      // Detect circular dependencies
      final cycles = graph.detectCycles();
      if (cycles.isNotEmpty) {
        debugger.log(
          DebugLevel.warn,
          'Found ${cycles.length} circular dependencies',
          category: 'analysis',
        );
        if (enableVerboseLogging) {
          for (final cycle in cycles.take(5)) {
            debugger.log(
              DebugLevel.debug,
              'Cycle: ${cycle.map((f) => path.basename(f)).join(" → ")}',
              category: 'analysis',
            );
          }
          if (cycles.length > 5) {
            debugger.log(
              DebugLevel.debug,
              '... and ${cycles.length - 5} more cycles',
              category: 'analysis',
            );
          }
        }
      }

      final fileCount = graph.nodeCount;
      debugger.log(
        DebugLevel.debug,
        'Dependency graph built: $fileCount files',
        category: 'analysis',
      );

      return graph;
    } catch (e, stackTrace) {
      debugger.log(
        DebugLevel.error,
        'Failed to build dependency graph: $e\n$stackTrace',
        category: 'analysis',
      );
      rethrow;
    }
  }

  // ==========================================================================
  // PHASE 3: TYPE RESOLUTION
  // ==========================================================================

  Future<Map<String, ParsedFileInfo>> _phase3_ParseAndResolveTypes(
    List<String> filesInOrder,
  ) async {
    debugger.log(
      DebugLevel.debug,
      'Phase 3: Parsing and resolving types for ${filesInOrder.length} files',
      category: 'analysis',
    );

    final parsedFiles = <String, ParsedFileInfo>{};
    

    for (final filePath in filesInOrder) {
      try {
        final result = await analyzeFile(filePath);
        if (result == null) {
          continue;
        }

        final visitor = TypeDeclarationVisitor(filePath, _typeRegistry);
        result.unit.accept(visitor);

        if (enableVerboseLogging && visitor.typesFound > 0) {
          debugger.log(
            DebugLevel.debug,
            '${path.basename(filePath)}: ${visitor.typesFound} types',
            category: 'analysis',
          );
        }

        parsedFiles[filePath] = ParsedFileInfo(
          path: filePath,
          unit: result.unit,
          libraryElement: result.libraryElement,
          analysisResult: result,
          needsIRGeneration: true,
        );

     
      } catch (e, stackTrace) {
        debugger.log(
          DebugLevel.warn,
          'Error parsing ${path.basename(filePath)}: $e \n$stackTrace',
          category: 'analysis',
        );
      }
    }

    debugger.log(
      DebugLevel.debug,
      'Parsed ${parsedFiles.length} files, '
      'type registry: ${_typeRegistry.typeCount} types',
      category: 'analysis',
    );

    return parsedFiles;
  }

  // ==========================================================================
  // PHASE 5: OUTPUT FILE GENERATION
  // ==========================================================================

  Future<void> _phase5_GenerateOutputFiles(ProjectAnalysisResult result) async {
    debugger.log(
      DebugLevel.debug,
      'Phase 5: Generating output files in $outputDir',
      category: 'analysis',
    );

    try {
      await debugger.observe('generate_dependency_graph', () async {
        await _generateDependencyGraph(result);
      }, category: 'output_gen');

      await debugger.observe('generate_type_registry', () async {
        await _generateTypeRegistry(result);
      }, category: 'output_gen');

      await debugger.observe('generate_import_analysis', () async {
        await _generateImportAnalysis(result);
      }, category: 'output_gen');

      await debugger.observe('generate_analysis_summary', () async {
        await _generateAnalysisSummary(result);
      }, category: 'output_gen');

      await debugger.observe('generate_statistics_report', () async {
        await _generateStatisticsReport(result);
      }, category: 'output_gen');

      debugger.log(
        DebugLevel.debug,
        'All output files generated successfully',
        category: 'analysis',
      );
    } catch (e, stackTrace) {
      debugger.log(
        DebugLevel.error,
        'Failed to generate output files: $e\n$stackTrace',
        category: 'analysis',
      );
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
    } catch (e) {
      debugger.log(
        DebugLevel.error,
        'Failed to generate dependency graph: $e',
        category: 'analysis',
      );
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
    } catch (e) {
      debugger.log(
        DebugLevel.error,
        'Failed to generate type registry: $e',
        category: 'analysis',
      );
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
    } catch (e) {
      debugger.log(
        DebugLevel.error,
        'Failed to generate import analysis: $e',
        category: 'analysis',
      );
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
          'errorFiles': stats.errorFiles,
          'changedFiles': stats.changedFiles,
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
    } catch (e) {
      debugger.log(
        DebugLevel.error,
        'Failed to generate analysis summary: $e',
        category: 'analysis',
      );
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
    } catch (e) {
      debugger.log(
        DebugLevel.error,
        'Failed to generate statistics report: $e',
        category: 'analysis',
      );
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
        debugger.log(
          DebugLevel.warn,
          'No context found for $filePath',
          category: 'analysis',
        );
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
      debugger.log(
        DebugLevel.error,
        'Failed to analyze file: $filePath - $e\n$stackTrace',
        category: 'analysis',
      );
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
      debugger.log(
        DebugLevel.debug,
        'Error getting context for $filePath: $e',
        category: 'analysis',
      );
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
      debugger.log(
        DebugLevel.debug,
        'Failed to compute hash for $filePath: $e',
        category: 'analysis',
      );
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

  /// Clean up resources
  void dispose() {
    debugger.log(
      DebugLevel.debug,
      'Disposing ProjectAnalyzer',
      category: 'analyzer',
    );
  }
}

// ==========================================================================
// RESULT CLASSES
// ==========================================================================

/// Result of analyzing the entire project
class ProjectAnalysisResult {
  final Set<String> changedFiles;
  final Map<String, ParsedFileInfo> parsedUnits;
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

  ParsedFileInfo? getParsedFile(String filePath) => parsedUnits[filePath];
  List<String> getFilesNeedingIR() => changedFiles.toList();
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
