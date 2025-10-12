import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:path/path.dart' as path;

import '../engine/analyzer/analying_project.dart';
import '../engine/analyzer/dependency_graph.dart';

// ============================================================================
// ANALYZE COMMAND
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
      ..addFlag(
        'bundle',
        help: 'Analyze output bundle (requires build/ directory).',
        defaultsTo: true,
      )
      ..addFlag(
        'widgets',
        help: 'Analyze Flutter widget usage in source code.',
        defaultsTo: true,
      )
      ..addFlag(
        'dead-code',
        help: 'Run dead code analysis using dead_code_analyzer package.',
        negatable: false,
      )
      ..addFlag(
        'reactivity',
        help: 'Analyze reactivity and state management.',
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
  String get description => 'Analyze bundle size and dependencies.';

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

      // Listen to progress (optional)
      if (!jsonOutput) {
        analyzer.progressStream.listen((progress) {
          final percentage = progress.percentage;
          final bar = _createProgressBar(percentage);
          stdout.write('\r${progress.phase.displayName}: $bar $percentage% - ${progress.message}');
        });
      }

      // Run analysis
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
    final appIR = result.appIR;

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
    print('  └─ Errors:        ${stats.errorFiles}${stats.errorFiles > 0 ? ' ⚠️' : ' ✓'}\n');

    // Performance Statistics
    print('⚡ Performance:');
    print('  ├─ Duration:      ${_formatDuration(stats.durationMs)}');
    print('  ├─ Avg per file:  ${stats.avgTimePerFile.toStringAsFixed(1)}ms');
    print('  └─ Throughput:    ${stats.throughput.toStringAsFixed(1)} files/sec\n');

    // App Structure
    print('🏗️  Application Structure:');
    print('  ├─ Widgets:       ${appIR.widgets.length}');
    print('  ├─ State Classes: ${appIR.stateClasses.length}');
    print('  ├─ Providers:     ${appIR.providers.length}');
    print('  └─ Total Classes: ${result.fileIRs.values.fold(0, (sum, file) => sum + file.classes.length)}\n');

    // Widget Breakdown
    if (appIR.widgets.isNotEmpty) {
      print('🎨 Widget Usage:');
      final widgetCounts = <String, int>{};
      for (final widget in appIR.widgets) {
        final name = widget.name;
        widgetCounts[name] = (widgetCounts[name] ?? 0) + 1;
      }

      final sortedWidgets = widgetCounts.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));

      final topWidgets = sortedWidgets.take(10);
      for (var i = 0; i < topWidgets.length; i++) {
        final entry = topWidgets.elementAt(i);
        final isLast = i == topWidgets.length - 1;
        final prefix = isLast ? '└─' : '├─';
        print('  $prefix ${entry.key.padRight(20)} ${entry.value} instances');
      }
      if (sortedWidgets.length > 10) {
        print('  └─ ... and ${sortedWidgets.length - 10} more\n');
      } else {
        print('');
      }
    }

    // State Management
    if (appIR.stateClasses.isNotEmpty) {
      print('📦 State Management:');
      
      // Count state classes by characteristics
      var withInitState = 0;
      var withDispose = 0;
      var totalStateVars = 0;
      var withLifecycleMethods = 0;
      
      for (final state in appIR.stateClasses) {
        if (state.initState != null) withInitState++;
        if (state.dispose != null) withDispose++;
        totalStateVars += state.stateVariables.length;
        if (state.lifecycleMethods.isNotEmpty) withLifecycleMethods++;
      }
      
      print('  ├─ Total State Classes:     ${appIR.stateClasses.length}');
      print('  ├─ With initState():        $withInitState');
      print('  ├─ With dispose():          $withDispose');
      print('  ├─ With lifecycle methods:  $withLifecycleMethods');
      print('  ├─ Total state variables:   $totalStateVars');
      print('  └─ Avg vars per class:      ${totalStateVars > 0 ? (totalStateVars / appIR.stateClasses.length).toStringAsFixed(1) : '0'}\n');
    }

    // Dependency Graph Info
    if (verbose) {
      print('🔗 Dependency Graph:');
      print('  ├─ Total nodes:   ${result.dependencyGraph.nodeCount}');
      final cycles = result.dependencyGraph.detectCycles();
      print('  ├─ Cycles:        ${cycles.length}${cycles.isNotEmpty ? ' ⚠️' : ' ✓'}');
      print('  └─ Max depth:     ${_calculateMaxDepth(result.dependencyGraph)}\n');

      if (cycles.isNotEmpty && cycles.length <= 5) {
        print('⚠️  Circular Dependencies:');
        for (final cycle in cycles) {
          print('  ├─ ${cycle.map((f) => path.basename(f)).join(' -> ')}');
        }
        print('');
      }
    }

    // Type Registry
    print('🏷️  Type Registry:');
    print('  └─ Total types:   ${result.typeRegistry.typeCount}\n');

    // Import Analysis
    final totalImports = result.fileIRs.values.fold(0, (sum, file) => sum + file.imports.length);
    print('📥 Imports:');
    print('  └─ Total imports: $totalImports\n');

    // Optimization suggestions
    if (showSuggestions) {
      _printSuggestions(result);
    }

    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  void _printSuggestions(ProjectAnalysisResult result) {
    print('💡 Optimization Suggestions:\n');

    final suggestions = <String>[];

    // Cache hit rate
    if (result.statistics.cacheHitRate < 0.5) {
      suggestions.add('Low cache hit rate (${(result.statistics.cacheHitRate * 100).toStringAsFixed(0)}%) - run analysis again for faster incremental builds');
    }

    // Widget duplicates
    final widgetCounts = <String, int>{};
    for (final widget in result.appIR.widgets) {
      widgetCounts[widget.name] = (widgetCounts[widget.name] ?? 0) + 1;
    }
    final duplicateWidgets = widgetCounts.entries.where((e) => e.value > 5).length;
    if (duplicateWidgets > 0) {
      suggestions.add('$duplicateWidgets widget types used more than 5 times - consider extracting reusable components');
    }

    // Circular dependencies
    final cycles = result.dependencyGraph.detectCycles();
    if (cycles.isNotEmpty) {
      suggestions.add('${cycles.length} circular dependencies detected - refactor to improve maintainability');
    }

    // Large files
    final largeFiles = result.fileIRs.entries
        .where((e) => e.value.classes.length + e.value.widgets.length > 10)
        .length;
    if (largeFiles > 0) {
      suggestions.add('$largeFiles files have 10+ declarations - consider splitting for better organization');
    }

    // State management
    if (result.appIR.stateClasses.isEmpty && result.appIR.widgets.length > 10) {
      suggestions.add('No state management detected - consider using providers or state classes for complex UIs');
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
    final json = {
      'statistics': result.statistics.toJson(),
      'app_structure': {
        'widgets': result.appIR.widgets.length,
        'state_classes': result.appIR.stateClasses.length,
        'providers': result.appIR.providers.length,
        'total_classes': result.fileIRs.values.fold(0, (sum, file) => sum + file.classes.length),
      },
      'dependency_graph': {
        'node_count': result.dependencyGraph.nodeCount,
        'cycles': result.dependencyGraph.detectCycles().length,
      },
      'type_registry': {
        'type_count': result.typeRegistry.typeCount,
      },
      'files': result.fileIRs.length,
    };

    // Pretty print JSON
    print(_prettyJsonEncode(json));
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
    // Simple approximation - could be more sophisticated
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
      case AnalysisPhase.irGeneration:
        return '🔨 IR Generation';
      case AnalysisPhase.linking:
        return '🔗 Linking';
      case AnalysisPhase.caching:
        return '💾 Caching';
      case AnalysisPhase.complete:
        return '✅ Complete';
      case AnalysisPhase.error:
        return '❌ Error';
    }
  }
}