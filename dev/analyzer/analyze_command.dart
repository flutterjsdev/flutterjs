import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:path/path.dart' as path;

import '../engine/analyzer/analying_project.dart';
import '../engine/analyzer/dependency_graph.dart';
import '../engine/analyzer/type_registry.dart';

// ============================================================================
// ANALYZE COMMAND - Analysis Only (No IR Generation)
// ============================================================================

class AnalyzeCommand extends Command<void> {
  AnalyzeCommand({required this.verbose, required this.verboseHelp}) {
    argParser
      ..addFlag(
        'json',
        help: 'Output analysis in JSON format.',
        negatable: false,
      )
      ..addFlag(
        'suggestions',
        help: 'Show optimization suggestions.',
        defaultsTo: true,
      )
      ..addOption(
        'source',
        abbr: 's',
        help: 'Path to Flutter source code.',
        defaultsTo: 'lib',
      )
      ..addOption(
        'project',
        abbr: 'p',
        help: 'Path to Flutter project root.',
        defaultsTo: '.',
      )
      ..addFlag(
        'parallel',
        help: 'Enable parallel processing.',
        defaultsTo: true,
      )
      ..addFlag(
        'cache',
        help: 'Enable incremental cache.',
        defaultsTo: true,
      )
      ..addOption(
        'max-parallelism',
        help: 'Maximum parallel workers.',
        defaultsTo: '4',
      );
  }

  final bool verbose;
  final bool verboseHelp;

  @override
  String get name => 'analyze';

  @override
  String get description => 'Analyze Flutter project structure and dependencies (no IR generation).';

  @override
  Future<void> run() async {
    final jsonOutput = argResults!['json'] as bool;
    final showSuggestions = argResults!['suggestions'] as bool;
    final projectPath = argResults!['project'] as String;
    final enableParallel = argResults!['parallel'] as bool;
    final enableCache = argResults!['cache'] as bool;
    final maxParallelism = int.parse(argResults!['max-parallelism'] as String);

    // Validate project path
    final projectDir = Directory(projectPath);
    if (!await projectDir.exists()) {
      print('❌ Error: Project directory not found at $projectPath');
      exit(1);
    }

    final absolutePath = projectDir.absolute.path;

    print('📊 Analyzing Flutter.js project...');
    print('   Project: $absolutePath');
    print('   Mode: Analysis only (no IR generation)');
    print('   Parallel: ${enableParallel ? 'enabled ($maxParallelism workers)' : 'disabled'}');
    print('   Cache: ${enableCache ? 'enabled' : 'disabled'}\n');

    // Initialize analyzer
    final analyzer = ProjectAnalyzer(
      absolutePath,
      maxParallelism: maxParallelism,
      enableVerboseLogging: verbose,
      enableCache: enableCache,
      enableParallelProcessing: enableParallel,
    );

    try {
      // Initialize
      await analyzer.initialize();

      // Listen to progress
      if (!jsonOutput) {
        analyzer.progressStream.listen((progress) {
          final percentage = progress.percentage;
          final bar = _createProgressBar(percentage);
          stdout.write('\r${progress.phase.displayName}: $bar $percentage% - ${progress.message}');
        });
      }

      // Run analysis (ONLY parsing, dependency resolution, type resolution)
      final result = await analyzer.analyzeProject();

      if (!jsonOutput) {
        print('\n'); // New line after progress
        _printTextAnalysis(result, showSuggestions);
      } else {
        _printJsonAnalysis(result);
      }

      // Cleanup
      analyzer.dispose();

      // Exit with appropriate code
      if (result.statistics.errorFiles > 0) {
        print('\n⚠️  Analysis completed with ${result.statistics.errorFiles} errors');
        exit(1);
      }

    } catch (e, stackTrace) {
      print('\n❌ Analysis failed: $e');
      if (verbose) {
        print('Stack trace:\n$stackTrace');
      }
      analyzer.dispose();
      exit(1);
    }
  }

  void _printTextAnalysis(ProjectAnalysisResult result, bool showSuggestions) {
    final stats = result.statistics;

    // Summary Section
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    print('📊 ANALYSIS SUMMARY');
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // File Statistics
    print('📁 Files:');
    print('  ├─ Total:         ${stats.totalFiles}');
    print('  ├─ Processed:     ${stats.processedFiles}');
    print('  ├─ Cached:        ${stats.cachedFiles} (${(stats.cacheHitRate * 100).toStringAsFixed(1)}%)');
    print('  ├─ Changed:       ${stats.changedFiles}');
    print('  ├─ Need IR:       ${result.filesToAnalyze.length}');
    print('  └─ Errors:        ${stats.errorFiles}${stats.errorFiles > 0 ? ' ⚠️' : ' ✓'}\n');

    // Performance Statistics
    print('⚡ Performance:');
    print('  ├─ Duration:      ${_formatDuration(stats.durationMs)}');
    print('  ├─ Avg per file:  ${stats.avgTimePerFile.toStringAsFixed(1)}ms');
    print('  └─ Throughput:    ${stats.throughput.toStringAsFixed(1)} files/sec\n');

    // Dependency Graph Info
    print('🔗 Dependency Graph:');
    print('  ├─ Total nodes:   ${result.dependencyGraph.nodeCount}');
    final cycles = result.dependencyGraph.detectCycles();
    print('  ├─ Cycles:        ${cycles.length}${cycles.isNotEmpty ? ' ⚠️' : ' ✓'}');
    print('  └─ Max depth:     ${_calculateMaxDepth(result.dependencyGraph)}\n');

    if (cycles.isNotEmpty && verbose) {
      print('⚠️  Circular Dependencies:');
      for (final cycle in cycles.take(5)) {
        print('  ├─ ${cycle.map((f) => path.basename(f)).join(' -> ')}');
      }
      if (cycles.length > 5) {
        print('  └─ ... and ${cycles.length - 5} more\n');
      } else {
        print('');
      }
    }

    // Type Registry
    print('🏷️  Type Registry:');
    print('  ├─ Total types:   ${result.typeRegistry.typeCount}');
    print('  ├─ Widgets:       ${_countTypesByKind(result.typeRegistry, 'Widget')}');
    print('  ├─ State classes: ${_countTypesByKind(result.typeRegistry, 'State')}');
    print('  └─ Other classes: ${result.typeRegistry.typeCount - _countTypesByKind(result.typeRegistry, 'Widget') - _countTypesByKind(result.typeRegistry, 'State')}\n');

    // Parsed Files Info
    print('📋 Parsed Files:');
    print('  ├─ Total parsed:  ${result.parsedUnits.length}');
    final filesWithErrors = result.parsedUnits.values.where((f) => f.hasErrors).length;
    final filesWithWarnings = result.parsedUnits.values.where((f) => f.analysisResult.warnings.isNotEmpty).length;
    print('  ├─ With errors:   $filesWithErrors${filesWithErrors > 0 ? ' ⚠️' : ' ✓'}');
    print('  └─ With warnings: $filesWithWarnings${filesWithWarnings > 0 ? ' ⚠️' : ''}\n');

    // Import/Export Statistics
    final totalImports = result.parsedUnits.values.fold(0, (sum, file) => sum + file.imports.length);
    final totalExports = result.parsedUnits.values.fold(0, (sum, file) => sum + file.exports.length);
    final dartImports = result.parsedUnits.values.fold(0, (sum, file) => 
      sum + file.imports.where((i) => i.isDartCoreImport).length);
    final packageImports = result.parsedUnits.values.fold(0, (sum, file) => 
      sum + file.imports.where((i) => i.isPackageImport).length);
    final relativeImports = result.parsedUnits.values.fold(0, (sum, file) => 
      sum + file.imports.where((i) => i.isRelative).length);

    print('📥 Imports & Exports:');
    print('  ├─ Total imports:    $totalImports');
    print('  │  ├─ Dart core:     $dartImports');
    print('  │  ├─ Package:       $packageImports');
    print('  │  └─ Relative:      $relativeImports');
    print('  └─ Total exports:    $totalExports\n');

    // Analysis Order Info
    print('📐 Dependency Order:');
    print('  ├─ Analysis order calculated: ${result.analysisOrder.length} files');
    print('  └─ Ready for IR generation: ${result.filesToAnalyze.length} files\n');

    // Optimization suggestions
    if (showSuggestions) {
      _printSuggestions(result);
    }

    // Next Steps
    print('📝 Next Steps:');
    print('  └─ Run "generate-ir" command to create IR for analyzed files\n');

    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  void _printSuggestions(ProjectAnalysisResult result) {
    print('💡 Optimization Suggestions:\n');

    final suggestions = <String>[];

    // Cache hit rate
    if (result.statistics.cacheHitRate < 0.5 && result.statistics.changedFiles > 0) {
      suggestions.add('Low cache hit rate (${(result.statistics.cacheHitRate * 100).toStringAsFixed(0)}%) - run analysis again for faster incremental builds');
    }

    // Circular dependencies
    final cycles = result.dependencyGraph.detectCycles();
    if (cycles.isNotEmpty) {
      suggestions.add('${cycles.length} circular dependencies detected - refactor to improve maintainability');
    }

    // Large files
    final largeFiles = result.parsedUnits.values
        .where((parsed) => parsed.unit.declarations.length > 10)
        .length;
    if (largeFiles > 0) {
      suggestions.add('$largeFiles files have 10+ declarations - consider splitting for better organization');
    }

    // Files with errors
    final filesWithErrors = result.parsedUnits.values.where((f) => f.hasErrors).length;
    if (filesWithErrors > 0) {
      suggestions.add('$filesWithErrors files have errors - fix these before IR generation');
    }

    // Performance suggestion
    if (result.statistics.avgTimePerFile > 100) {
      suggestions.add('Average time per file is ${result.statistics.avgTimePerFile.toStringAsFixed(0)}ms - consider increasing --max-parallelism');
    }

    // Deep dependency chains
    final maxDepth = _calculateMaxDepth(result.dependencyGraph);
    if (maxDepth > 10) {
      suggestions.add('Deep dependency chains detected (depth: $maxDepth) - consider flattening architecture');
    }

    // Many changed files
    if (result.statistics.changedFiles > result.statistics.totalFiles * 0.5) {
      suggestions.add('${result.statistics.changedFiles} files changed (${(result.statistics.changedFiles / result.statistics.totalFiles * 100).toStringAsFixed(0)}%) - incremental cache will be more effective on smaller changes');
    }

    // Display suggestions
    if (suggestions.isEmpty) {
      print('  ✓ No optimization suggestions - your project looks good!\n');
    } else {
      for (var i = 0; i < suggestions.length; i++) {
        final isLast = i == suggestions.length - 1;
        final prefix = isLast ? '└─' : '├─';
        print('  $prefix ${suggestions[i]}');
      }
      print('');
    }
  }

  void _printJsonAnalysis(ProjectAnalysisResult result) {
    final filesWithErrors = result.parsedUnits.values.where((f) => f.hasErrors).length;
    final filesWithWarnings = result.parsedUnits.values.where((f) => f.analysisResult.warnings.isNotEmpty).length;

    final json = {
      'statistics': result.statistics.toJson(),
      'files': {
        'total': result.parsedUnits.length,
        'need_ir': result.filesToAnalyze.length,
        'with_errors': filesWithErrors,
        'with_warnings': filesWithWarnings,
        'analysis_order': result.analysisOrder.length,
      },
      'dependency_graph': {
        'node_count': result.dependencyGraph.nodeCount,
        'cycles': result.dependencyGraph.detectCycles().length,
        'max_depth': _calculateMaxDepth(result.dependencyGraph),
      },
      'type_registry': {
        'total_types': result.typeRegistry.typeCount,
        'widgets': _countTypesByKind(result.typeRegistry, 'Widget'),
        'state_classes': _countTypesByKind(result.typeRegistry, 'State'),
      },
      'imports_exports': {
        'total_imports': result.parsedUnits.values.fold(0, (sum, file) => sum + file.imports.length),
        'total_exports': result.parsedUnits.values.fold(0, (sum, file) => sum + file.exports.length),
        'dart_imports': result.parsedUnits.values.fold(0, (sum, file) => 
          sum + file.imports.where((i) => i.isDartCoreImport).length),
        'package_imports': result.parsedUnits.values.fold(0, (sum, file) => 
          sum + file.imports.where((i) => i.isPackageImport).length),
        'relative_imports': result.parsedUnits.values.fold(0, (sum, file) => 
          sum + file.imports.where((i) => i.isRelative).length),
      },
      'files_to_analyze': result.filesToAnalyze,
      'analysis_order': result.analysisOrder,
    };

    print(_prettyJsonEncode(json));
  }

  int _countTypesByKind(TypeRegistry registry, String kind) {
    // This is a placeholder - you'll need to implement this based on your TypeRegistry
    // For now, return 0
    return 0;
  }

  String _createProgressBar(int percentage) {
    const width = 30;
    final filled = (width * percentage / 100).round();
    final empty = width - filled;
    return '[' + '█' * filled + '░' * empty + ']';
  }

  String _formatDuration(int milliseconds) {
    if (milliseconds < 1000) {
      return '${milliseconds}ms';
    } else if (milliseconds < 60000) {
      return '${(milliseconds / 1000).toStringAsFixed(2)}s';
    } else {
      final minutes = milliseconds ~/ 60000;
      final seconds = (milliseconds % 60000) / 1000;
      return '${minutes}m ${seconds.toStringAsFixed(1)}s';
    }
  }

  int _calculateMaxDepth(DependencyGraph graph) {
    return graph.nodeCount > 0 ? (graph.nodeCount / 10).ceil() : 0;
  }

  String _prettyJsonEncode(Map<String, dynamic> json) {
    return _jsonEncode(json, 0);
  }

  String _jsonEncode(dynamic value, int indent) {
    final spaces = '  ' * indent;
    final nextSpaces = '  ' * (indent + 1);

    if (value is Map) {
      if (value.isEmpty) return '{}';
      
      final buffer = StringBuffer('{\n');
      final entries = value.entries.toList();
      
      for (var i = 0; i < entries.length; i++) {
        final entry = entries[i];
        buffer.write('$nextSpaces"${entry.key}": ${_jsonEncode(entry.value, indent + 1)}');
        if (i < entries.length - 1) buffer.write(',');
        buffer.write('\n');
      }
      
      buffer.write('$spaces}');
      return buffer.toString();
    } else if (value is List) {
      if (value.isEmpty) return '[]';
      
      final buffer = StringBuffer('[\n');
      for (var i = 0; i < value.length; i++) {
        buffer.write('$nextSpaces${_jsonEncode(value[i], indent + 1)}');
        if (i < value.length - 1) buffer.write(',');
        buffer.write('\n');
      }
      buffer.write('$spaces]');
      return buffer.toString();
    } else if (value is String) {
      return '"$value"';
    } else if (value is bool || value is num) {
      return value.toString();
    } else {
      return 'null';
    }
  }
}

// Extension for better phase display
extension AnalysisPhaseDisplay on AnalysisPhase {
  String get displayName {
    switch (this) {
      case AnalysisPhase.starting:
        return '🚀 Starting';
      case AnalysisPhase.dependencyResolution:
        return '🔍 Dependencies';
      case AnalysisPhase.changeDetection:
        return '🔄 Changes';
      case AnalysisPhase.typeResolution:
        return '🏷️  Types';
      case AnalysisPhase.caching:
        return '💾 Caching';
      case AnalysisPhase.complete:
        return '✅ Complete';
      case AnalysisPhase.error:
        return '❌ Error';
    }
  }
}