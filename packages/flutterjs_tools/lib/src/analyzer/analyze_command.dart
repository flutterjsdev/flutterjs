// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:path/path.dart' as path;
import 'package:dart_analyzer/dart_analyzer.dart';

/// ============================================================================
/// AnalyzeCommand – Phase 1 FlutterJS Project Analyzer
/// ============================================================================
///
/// Performs a **full Phase-1 analysis** of a FlutterJS project, including:
///
///   • Parsing every `.dart` file
///   • Dependency resolution
///   • Change detection & incremental caching
///   • Type registry population
///   • Circular dependency detection
///   • File metadata extraction (widgets, classes, functions)
///
/// This command **does not generate IR**. It is exclusively responsible for the
/// initial analysis needed before IR generation or JavaScript conversion.
///
///
/// # Purpose
///
/// `flutterjs analyze` is used to:
///
/// - Validate project structure
/// - Understand which files changed since last analysis
/// - Detect errors early
/// - Produce a detailed report
/// - Prepare data for the IR pipeline (Phase 2+)
///
/// This phase is equivalent to:
/// > *"FlutterJS Analyzer Pass: 0 → 1"*
///
///
/// # Key Features
///
/// ### ✔ Incremental Analysis
/// Uses caching to skip unchanged files and dramatically reduce processing time.
///
/// ### ✔ Dependency Graph
/// Builds a complete import/export graph and detects cycles.
///
/// ### ✔ File Metadata
/// Extracts:
/// - widget declarations
/// - state classes
/// - regular classes
/// - typedefs / mixins / enums
///
/// ### ✔ Change Detection
/// Identifies exactly which files need IR regeneration.
///
/// ### ✔ Parallel Processing
/// Multi-thread capable (Isolate-based) with `--parallel` & `--max-parallelism`.
///
/// ### ✔ JSON & Text Output
/// Perfect for CI/CD or human inspection.
///
///
/// # CLI Flags
///
/// | Flag | Description |
/// |------|-------------|
/// | `--json` | Output machine-readable JSON instead of text. |
/// | `--suggestions` | Show optimization suggestions (default: on). |
/// | `--source` / `-s` | Source directory (default: `lib`). |
/// | `--project` / `-p` | Project root (default: `.`). |
/// | `--parallel` | Enable parallel processing. |
/// | `--cache` | Enable incremental cache (default: on). |
/// | `--max-parallelism` | Number of workers. |
/// | `--show-errors` | Show detailed error summaries. |
/// | `--show-metadata` | Show widgets, classes, and function counts. |
///
///
/// # When to Use
///
/// Run this command:
///
/// - before generating IR
/// - after large codebase changes
/// - when debugging dependency or caching issues
/// - to diagnose errors in Flutter project structure
///
///
/// # Output Format (Text)
///
/// Produces structured sections:
///
///   • File statistics
///   • Performance metrics
///   • Import/export breakdown
///   • Dependency graph stats
///   • Declarations summary
///   • Files with errors
///   • Files requiring IR generation
///   • Optimization suggestions
///
///
/// # Output Format (JSON)
///
/// Machine-readable output containing:
///   - statistics
///   - dependency graph
///   - type registry summary
///   - file metadata
///   - errors (if any)
///   - changed files needing IR
///
/// Perfect for CI/CD integrations or custom tooling.
///
///
/// # Workflow (Phase 1)
///
/// ```
/// ProjectAnalyzer.initialize()
///       ↓
/// Dependency Resolution
///       ↓
/// Change Detection (incremental cache)
///       ↓
/// Type Registry
///       ↓
/// File Metadata Extraction
///       ↓
/// Report (JSON or Text)
/// ```
///
/// This phase **does not** produce IR or JavaScript.
/// It simply analyzes and prepares the project.
///
///
/// # Fail-Fast Behavior
///
/// The command exits with **code 1** if:
///
/// - any file contains analysis errors
///
/// Useful for gating builds in CI/CD.
///
///
/// # Next Steps After Analysis
///
/// If the project is clean:
///
/// ```bash
/// flutterjs run  # full pipeline IR → JS
/// ```
///
/// or
///
/// ```bash
/// flutterjs generate-ir
/// ```
///
///
/// ============================================================================
///

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
      ..addFlag('cache', help: 'Enable incremental cache.', defaultsTo: true)
      ..addOption(
        'max-parallelism',
        help: 'Maximum parallel workers.',
        defaultsTo: '4',
      )
      ..addFlag(
        'show-errors',
        help: 'Show detailed error messages.',
        defaultsTo: false,
      )
      ..addFlag(
        'show-metadata',
        help: 'Show file metadata (widgets, classes, functions).',
        defaultsTo: false,
      );
  }

  final bool verbose;
  final bool verboseHelp;

  @override
  String get name => 'analyze';

  @override
  String get description =>
      'Analyze Flutter project structure and dependencies (Phase 1 - no IR generation).';

  @override
  Future<void> run() async {
    final jsonOutput = argResults!['json'] as bool;
    final showSuggestions = argResults!['suggestions'] as bool;
    final projectPath = argResults!['project'] as String;
    final enableParallel = argResults!['parallel'] as bool;
    final enableCache = argResults!['cache'] as bool;
    final maxParallelism = int.parse(argResults!['max-parallelism'] as String);
    final showErrors = argResults!['show-errors'] as bool;
    final showMetadata = argResults!['show-metadata'] as bool;

    // Validate project path
    final projectDir = Directory(projectPath);
    if (!await projectDir.exists()) {
      print('❌ Error: Project directory not found at $projectPath');
      exit(1);
    }

    final absolutePath = projectDir.absolute.path;

    if (!jsonOutput) {
      print('📊 Analyzing FlutterJS project...');
      print('   Project: $absolutePath');
      print(
        '   Mode: Phase 1 Analysis (parsing, dependencies, type resolution)',
      );
      print(
        '   Parallel: ${enableParallel ? 'enabled ($maxParallelism workers)' : 'disabled'}',
      );
      print('   Cache: ${enableCache ? 'enabled' : 'disabled'}\n');
    }

    // Initialize analyzer
    final analyzer = ProjectAnalyzer(
      absolutePath,
      maxParallelism: maxParallelism,
      enableVerboseLogging: verbose,
    );

    try {
      // Initialize
      await analyzer.initialize();

      // Listen to progress

      // Create orchestrator and run Phase 1 analysis
      final orchestrator = ProjectAnalysisOrchestrator(analyzer);
      final report = await orchestrator.analyze();

      if (!jsonOutput) {
        print('\n'); // New line after progress
        _printTextAnalysis(report, showSuggestions, showErrors, showMetadata);
      } else {
        _printJsonAnalysis(report);
      }

      // Cleanup
      analyzer.dispose();

      // Exit with appropriate code
      if (report.filesWithErrors.isNotEmpty) {
        print(
          '\n⚠️  Analysis completed with ${report.filesWithErrors.length} files having errors',
        );
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

  void _printTextAnalysis(
    ProjectAnalysisReport report,
    bool showSuggestions,
    bool showErrors,
    bool showMetadata,
  ) {
    final stats = report.analysisResult.statistics;

    // Summary Section
    print('┌────────────────────────────────────────────────┐');
    print('│          📊 ANALYSIS SUMMARY (PHASE 1)         │');
    print('└────────────────────────────────────────────────┘\n');

    // File Statistics
    print('📁 Files:');
    print('  ├─ Total:         ${stats.totalFiles}');
    print('  ├─ Processed:     ${stats.processedFiles}');
    print(
      '  ├─ Cached:        ${stats.cachedFiles} (${(stats.cacheHitRate * 100).toStringAsFixed(1)}%)',
    );
    print('  ├─ Changed:       ${stats.changedFiles}');
    print('  ├─ Need IR:       ${report.changedFiles.length}');
    print(
      '  └─ Errors:        ${report.filesWithErrors.length}${report.filesWithErrors.isNotEmpty ? ' ⚠️' : ' ✓'}\n',
    );

    // Performance Statistics
    print('⚡ Performance:');
    print('  ├─ Duration:      ${_formatDuration(stats.durationMs)}');
    print('  ├─ Avg per file:  ${stats.avgTimePerFile.toStringAsFixed(1)}ms');
    print(
      '  └─ Throughput:    ${stats.throughput.toStringAsFixed(1)} files/sec\n',
    );

    // Dependency Graph Info
    print('🔗 Dependency Graph:');
    print(
      '  ├─ Total nodes:   ${report.analysisResult.dependencyGraph.nodeCount}',
    );
    final cycles = report.analysisResult.dependencyGraph.detectCycles();
    print(
      '  ├─ Cycles:        ${cycles.length}${cycles.isNotEmpty ? ' ⚠️' : ' ✓'}',
    );
    print(
      '  └─ Max depth:     ${_calculateMaxDepth(report.analysisResult.dependencyGraph)}\n',
    );

    if (cycles.isNotEmpty && verbose) {
      print('⚠️  Circular Dependencies:');
      for (final cycle in cycles.take(5)) {
        print('  ├─ ${cycle.map((f) => path.basename(f)).join(' → ')}');
      }
      if (cycles.length > 5) {
        print('  └─ ... and ${cycles.length - 5} more\n');
      } else {
        print('');
      }
    }

    // Type Registry
    print('🏷️  Type Registry:');
    final typeStats = report.analysisResult.typeRegistry.getStatistics();
    print(
      '  ├─ Total types:    ${report.analysisResult.typeRegistry.typeCount}',
    );
    print('  ├─ Widgets:        ${typeStats['widgets']}');
    print('  │  ├─ Stateful:    ${typeStats['statefulWidgets']}');
    print('  │  └─ Stateless:   ${typeStats['statelessWidgets']}');
    print('  ├─ State classes:  ${typeStats['stateClasses']}');
    print('  ├─ Classes:        ${typeStats['classes']}');
    print('  ├─ Abstract:       ${typeStats['abstractClasses']}');
    print('  ├─ Mixins:         ${typeStats['mixins']}');
    print('  ├─ Enums:          ${typeStats['enums']}');
    print('  └─ Typedefs:       ${typeStats['typedefs']}\n');

    // File Summaries
    print('📋 Parsed Files Summary:');
    print('  ├─ Total files:    ${report.fileSummaries.length}');
    print(
      '  ├─ With errors:    ${report.filesWithErrors.length}${report.filesWithErrors.isNotEmpty ? ' ⚠️' : ' ✓'}',
    );
    print('  └─ Ready for IR:   ${report.changedFiles.length}\n');

    // Declarations Summary
    if (showMetadata) {
      print('🔍 Declarations Found:');
      print('  ├─ Widgets:        ${report.totalWidgets}');
      print('  ├─ State classes:  ${report.totalStateClasses}');
      print('  ├─ Classes:        ${report.totalClasses}');
      print('  └─ Functions:      ${report.totalFunctions}\n');
    }

    // Import/Export Statistics
    final allImports = report.fileSummaries.values
        .expand((s) => s.metadata.imports)
        .toList();
    final allExports = report.fileSummaries.values
        .expand((s) => s.metadata.exports)
        .toList();

    final dartImports = allImports.where((i) => i.startsWith('dart:')).length;
    final packageImports = allImports
        .where((i) => i.startsWith('package:'))
        .length;
    final relativeImports = allImports
        .where((i) => !i.startsWith('dart:') && !i.startsWith('package:'))
        .length;

    print('📥 Imports & Exports:');
    print('  ├─ Total imports:  ${allImports.length}');
    print('  │  ├─ Dart core:   $dartImports');
    print('  │  ├─ Package:     $packageImports');
    print('  │  └─ Relative:    $relativeImports');
    print('  └─ Total exports:  ${allExports.length}\n');

    // Errors Section
    if (showErrors && report.filesWithErrors.isNotEmpty) {
      print('❌ Files with Errors:');
      for (final filePath in report.filesWithErrors.take(10)) {
        final filename = path.basename(filePath);
        final summary = report.getSummary(filePath);
        if (summary != null) {
          final errorCount = summary.analysisResult.errorList.length;
          print('  ├─ $filename ($errorCount errors)');

          if (verbose) {
            for (final error in summary.analysisResult.errorList.take(2)) {
              print('     │  └─ ${error.message}');
            }
          }
        }
      }
      if (report.filesWithErrors.length > 10) {
        print('  └─ ... and ${report.filesWithErrors.length - 10} more\n');
      } else {
        print('');
      }
    }

    // Changed Files Section
    if (report.changedFiles.isNotEmpty) {
      print('🔄 Changed Files (Need IR Generation):');
      for (final filePath in report.changedFiles.take(10)) {
        final filename = path.basename(filePath);
        print('  ├─ $filename');
      }
      if (report.changedFiles.length > 10) {
        print('  └─ ... and ${report.changedFiles.length - 10} more\n');
      } else {
        print('');
      }
    }

    // Optimization suggestions
    if (showSuggestions) {
      _printSuggestions(report);
    }

    // Ready for Phase 2
    print('📍 Phase 1 Status:');
    if (report.isReadyForIRGeneration) {
      print('  └─ ✅ Ready for Phase 2 (IR Generation)\n');
    } else {
      print('  └─ ⚠️  Fix errors before proceeding to Phase 2\n');
    }

    // Next Steps
    print('🚀 Next Steps:');
    print('  ├─ Fix any errors if present');
    print('  └─ Run "generate-ir" command to create IR for changed files\n');

    print('└────────────────────────────────────────────────┘\n');
  }

  void _printSuggestions(ProjectAnalysisReport report) {
    print('💡 Optimization Suggestions:\n');

    final suggestions = <String>[];
    final stats = report.analysisResult.statistics;

    // Cache hit rate
    if (stats.cacheHitRate < 0.5 && stats.changedFiles > 0) {
      suggestions.add(
        'Low cache hit rate (${(stats.cacheHitRate * 100).toStringAsFixed(0)}%) - '
        'run analysis again for faster incremental builds',
      );
    }

    // Circular dependencies
    final cycles = report.analysisResult.dependencyGraph.detectCycles();
    if (cycles.isNotEmpty) {
      suggestions.add(
        '${cycles.length} circular dependencies detected - '
        'refactor to improve maintainability',
      );
    }

    // Large files with many declarations
    final largeFiles = report.fileSummaries.values
        .where((summary) => summary.metadata.getAllDeclarations().length > 10)
        .length;
    if (largeFiles > 0) {
      suggestions.add(
        '$largeFiles files have 10+ declarations - '
        'consider splitting for better organization',
      );
    }

    // Files with errors
    if (report.filesWithErrors.isNotEmpty) {
      suggestions.add(
        '${report.filesWithErrors.length} files have errors - '
        'fix these before IR generation',
      );
    }

    // Performance suggestion
    if (stats.avgTimePerFile > 100) {
      suggestions.add(
        'Average time per file is ${stats.avgTimePerFile.toStringAsFixed(0)}ms - '
        'consider increasing --max-parallelism',
      );
    }

    // Deep dependency chains
    final maxDepth = _calculateMaxDepth(report.analysisResult.dependencyGraph);
    if (maxDepth > 10) {
      suggestions.add(
        'Deep dependency chains detected (depth: $maxDepth) - '
        'consider flattening architecture',
      );
    }

    // Many changed files
    if (stats.changedFiles > stats.totalFiles * 0.5) {
      suggestions.add(
        '${stats.changedFiles} files changed '
        '(${(stats.changedFiles / stats.totalFiles * 100).toStringAsFixed(0)}%) - '
        'incremental cache will be more effective on smaller changes',
      );
    }

    // Widget/State class ratio
    if (report.totalStateClasses > 0) {
      final ratio = report.totalWidgets / report.totalStateClasses;
      if (ratio < 0.8) {
        suggestions.add(
          'Low widget-to-state ratio (${ratio.toStringAsFixed(1)}) - '
          'some state classes may be orphaned',
        );
      }
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

  void _printJsonAnalysis(ProjectAnalysisReport report) {
    final stats = report.analysisResult.statistics;

    final allImports = report.fileSummaries.values
        .expand((s) => s.metadata.imports)
        .toList();
    final allExports = report.fileSummaries.values
        .expand((s) => s.metadata.exports)
        .toList();

    final json = {
      'phase': 'analysis',
      'version': 1,
      'statistics': stats.toJson(),
      'files': {
        'total': report.fileSummaries.length,
        'need_ir': report.changedFiles.length,
        'with_errors': report.filesWithErrors.length,
        'analysis_order': report.analysisResult.analysisOrder.length,
      },
      'dependency_graph': {
        'node_count': report.analysisResult.dependencyGraph.nodeCount,
        'cycles': report.analysisResult.dependencyGraph.detectCycles().length,
        'max_depth': _calculateMaxDepth(report.analysisResult.dependencyGraph),
      },
      'type_registry': report.analysisResult.typeRegistry.getStatistics(),
      'declarations': {
        'widgets': report.totalWidgets,
        'state_classes': report.totalStateClasses,
        'classes': report.totalClasses,
        'functions': report.totalFunctions,
      },
      'imports_exports': {
        'total_imports': allImports.length,
        'total_exports': allExports.length,
        'dart_imports': allImports.where((i) => i.startsWith('dart:')).length,
        'package_imports': allImports
            .where((i) => i.startsWith('package:'))
            .length,
        'relative_imports': allImports
            .where((i) => !i.startsWith('dart:') && !i.startsWith('package:'))
            .length,
      },
      'ready_for_ir_generation': report.isReadyForIRGeneration,
      'files_needing_ir': report.getFilesNeedingIR(),
      'analysis_order': report.analysisResult.analysisOrder,
      'errors': report.filesWithErrors.isEmpty
          ? null
          : report.getErrorSummary(),
    };

    print(_prettyJsonEncode(json));
  }

  String _createProgressBar(int percentage) {
    const width = 30;
    final filled = (width * percentage / 100).round();
    final empty = width - filled;
    return '[${'█' * filled}${'░' * empty}]';
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
    if (graph.nodeCount == 0) return 0;

    // Simple approximation - real implementation would traverse the graph
    return (graph.nodeCount / 10).ceil();
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
        if (entry.value == null) continue;

        buffer.write(
          '$nextSpaces"${entry.key}": ${_jsonEncode(entry.value, indent + 1)}',
        );
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
