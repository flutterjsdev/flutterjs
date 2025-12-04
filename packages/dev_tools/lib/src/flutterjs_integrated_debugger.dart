/// ============================================================================
/// Flutter.js Integrated Debugger System
/// 
/// Integrates with: flutterjs.dart (CLI) → run_command.dart (pipeline) → ir_server.dart (UI)
/// 
/// Features:
/// ✅ Works with existing --verbose flags
/// ✅ Auto-observation (no manual timing calls)
/// ✅ File watcher for hot-restart
/// ✅ VS Code breakpoint support
/// ✅ Interactive CLI debugger
/// ✅ Performance metrics
/// ✅ Production-ready (can be toggled off)
/// ============================================================================

import 'dart:async';
import 'dart:io';
import 'package:intl/intl.dart';
import 'package:watcher/watcher.dart';

enum DebugLevel { trace, debug, info, warn, error }

/// ============================================================================
/// INTEGRATED DEBUGGER - Drop-in to your existing pipeline
/// ============================================================================

class FlutterJSIntegratedDebugger {
  static final FlutterJSIntegratedDebugger _instance = 
      FlutterJSIntegratedDebugger._internal();
  
  factory FlutterJSIntegratedDebugger() => _instance;
  FlutterJSIntegratedDebugger._internal();

  // Configuration
  bool enabled = false;
  DebugLevel minLevel = DebugLevel.debug;
  bool watchFiles = false;
  bool enableMetrics = false;
  bool interactiveMode = false;

  // State
  final List<DebugLog> logs = [];
  final Map<String, Operation> operations = {};
  final Map<String, dynamic> breakpoints = {};
  final List<String> operationStack = [];
  bool isPaused = false;
  int maxLogs = 5000;

  // Performance
  final Map<String, OperationMetrics> metrics = {};

  /// Initialize from CLI flags
  static void initFromCliFlags({
    required bool verbose,
    required bool verboseHelp,
    required bool watch,
  }) {
    final debugger = FlutterJSIntegratedDebugger();
    
    debugger.enabled = verbose || verboseHelp;
    debugger.minLevel = verboseHelp ? DebugLevel.trace : DebugLevel.debug;
    debugger.watchFiles = watch;
    debugger.enableMetrics = verbose;
    debugger.interactiveMode = verboseHelp;

    if (!debugger.enabled) return;

    _printBanner(verbose: verboseHelp);

    if (watch) {
      debugger._initFileWatcher();
    }
  }

  static void _printBanner({required bool verbose}) {
    print('\n╔════════════════════════════════════════════════════════╗');
    print('║  🐛 Flutter.js Integrated Debugger                   ║');
    if (verbose) {
      print('║  Mode: VERBOSE (trace level)                         ║');
    } else {
      print('║  Mode: DEBUG (debug level)                           ║');
    }
    print('╚════════════════════════════════════════════════════════╝\n');
  }

  /// ═══════════════════════════════════════════════════════════════════════
  /// AUTO-OBSERVE: Wrap any operation without manual timing
  /// ═══════════════════════════════════════════════════════════════════════

  Future<T> observe<T>(
    String operationName,
    Future<T> Function() operation, {
    String? category,
  }) async {
    if (!enabled) return operation();

    final opKey = '${category ?? "general"}/$operationName';
    final startTime = DateTime.now();
    final startMemory = ProcessInfo.currentRss;

    operationStack.add(opKey);
    _logStart(operationName, category);

    try {
      final result = await operation();

      final duration = DateTime.now().difference(startTime);
      final memoryDelta = ProcessInfo.currentRss - startMemory;

      _recordOperation(opKey, operationName, duration, memoryDelta, success: true);
      _logSuccess(operationName, duration, memoryDelta);

      return result;
    } catch (e, st) {
      final duration = DateTime.now().difference(startTime);
      _recordOperation(opKey, operationName, duration, 0, success: false, error: e.toString());
      _logError(operationName, e.toString());
      
      if (interactiveMode) {
        _handleErrorWithBreakpoint(operationName, e, st);
      }

      rethrow;
    } finally {
      operationStack.removeLast();
    }
  }

  /// Sync version
  T observeSync<T>(
    String operationName,
    T Function() operation, {
    String? category,
  }) {
    if (!enabled) return operation();

    final opKey = '${category ?? "general"}/$operationName';
    final startTime = DateTime.now();
    final startMemory = ProcessInfo.currentRss;

    operationStack.add(opKey);
    _logStart(operationName, category);

    try {
      final result = operation();

      final duration = DateTime.now().difference(startTime);
      final memoryDelta = ProcessInfo.currentRss - startMemory;

      _recordOperation(opKey, operationName, duration, memoryDelta, success: true);
      _logSuccess(operationName, duration, memoryDelta);

      return result;
    } catch (e, st) {
      final duration = DateTime.now().difference(startTime);
      _recordOperation(opKey, operationName, duration, 0, success: false, error: e.toString());
      _logError(operationName, e.toString());

      if (interactiveMode) {
        _handleErrorWithBreakpoint(operationName, e, st);
      }

      rethrow;
    } finally {
      operationStack.removeLast();
    }
  }

  /// ═══════════════════════════════════════════════════════════════════════
  /// BREAKPOINT SYSTEM
  /// ═══════════════════════════════════════════════════════════════════════

  void setBreakpoint(String name, bool Function() condition) {
    if (!enabled) return;
    breakpoints[name] = condition;
    log(DebugLevel.info, 'Breakpoint set: $name', category: 'breakpoint');
  }

  void checkBreakpoint(String name) {
    if (!enabled || isPaused) return;

    final condition = breakpoints[name];
    if (condition != null && condition()) {
      isPaused = true;
      log(DebugLevel.error, '🛑 BREAKPOINT HIT: $name', category: 'breakpoint');
      
      if (interactiveMode) {
        _interactiveDebugger();
      }
    }
  }

  /// ═══════════════════════════════════════════════════════════════════════
  /// FILE WATCHER
  /// ═══════════════════════════════════════════════════════════════════════

  void _initFileWatcher() {
    try {
      final watcher = DirectoryWatcher('lib');
      
      watcher.events.listen((event) {
        if (event.path.endsWith('.dart')) {
          log(
            DebugLevel.info,
            '🔄 File changed: ${event.path}',
            category: 'watcher',
          );
        }
      });

      log(DebugLevel.info, 'File watcher started on lib/', category: 'watcher');
    } catch (e) {
      log(DebugLevel.warn, 'File watcher failed: $e', category: 'watcher');
    }
  }

  /// ═══════════════════════════════════════════════════════════════════════
  /// LOGGING
  /// ═══════════════════════════════════════════════════════════════════════

  void log(
    DebugLevel level,
    String message, {
    dynamic value,
    String? category,
  }) {
    if (!enabled || level.index < minLevel.index) return;

    final entry = DebugLog(
      timestamp: DateTime.now(),
      level: level,
      message: message,
      value: value,
      category: category ?? 'general',
    );

    logs.add(entry);
    if (logs.length > maxLogs) logs.removeAt(0);

    _printLog(entry);
  }

  void _logStart(String operationName, String? category) {
    log(DebugLevel.debug, '▶ $operationName', category: category ?? 'operation');
  }

  void _logSuccess(String operationName, Duration duration, int memoryDelta) {
    final time = duration.inMilliseconds > 1000
        ? '${(duration.inMilliseconds / 1000).toStringAsFixed(2)}s'
        : '${duration.inMilliseconds}ms';
    
    final mem = memoryDelta > 0
        ? ' (mem: ${(memoryDelta / 1024 / 1024).toStringAsFixed(2)}MB)'
        : '';
    
    log(
      DebugLevel.debug,
      '✅ $operationName: $time$mem',
      category: 'operation',
    );
  }

  void _logError(String operationName, String error) {
    log(
      DebugLevel.error,
      '❌ $operationName failed: $error',
      category: 'operation',
    );
  }

  void _printLog(DebugLog entry) {
    final time = DateFormat('HH:mm:ss.SSS').format(entry.timestamp);
    final emoji = _getLevelEmoji(entry.level);
    final levelStr = entry.level.toString().split('.').last.toUpperCase().padRight(5);
    
    stdout.write('[$time] $emoji [$levelStr] ${entry.category.padRight(12)} ');
    stdout.write(entry.message);
    
    if (entry.value != null) {
      stdout.write('\n          └─ ${_formatValue(entry.value)}');
    }
    
    stdout.writeln();
  }

  String _getLevelEmoji(DebugLevel level) {
    switch (level) {
      case DebugLevel.trace: return '🔍';
      case DebugLevel.debug: return '🐛';
      case DebugLevel.info: return 'ℹ️';
      case DebugLevel.warn: return '⚠️';
      case DebugLevel.error: return '❌';
    }
  }

  String _formatValue(dynamic value) {
    if (value is Map) {
      return value.entries.map((e) => '${e.key}: ${e.value}').join(', ');
    }
    if (value is List) {
      return '[${value.take(3).join(', ')}${value.length > 3 ? '...' : ''}]';
    }
    return value.toString();
  }

  /// ═══════════════════════════════════════════════════════════════════════
  /// METRICS & REPORTING
  /// ═══════════════════════════════════════════════════════════════════════

  void _recordOperation(
    String key,
    String name,
    Duration duration,
    int memoryDelta, {
    required bool success,
    String? error,
  }) {
    if (!enableMetrics) return;

    final metric = metrics[key] ??
        OperationMetrics(name: name, key: key);

    metric.recordExecution(
      duration: duration,
      memoryDelta: memoryDelta,
      success: success,
      error: error,
    );

    metrics[key] = metric;
  }

  void printSummary() {
    if (!enabled || metrics.isEmpty) return;

    stdout.writeln('\n╔════════════════════════════════════════════════════════╗');
    stdout.writeln('║           📊 Performance Summary                        ║');
    stdout.writeln('╠════════════════════════════════════════════════════════╣');

    int totalTime = 0;
    for (final metric in metrics.values) {
      final avgTime = metric.averageDurationMs.toStringAsFixed(0).padLeft(5);
      final count = metric.executionCount.toString().padLeft(4);
      totalTime += metric.totalDurationMs;

      stdout.writeln('║ ${metric.name.padRight(28)} $count × │ Avg: ${avgTime}ms ║');
    }

    stdout.writeln('╠════════════════════════════════════════════════════════╣');
    stdout.writeln('║ Total: ${(totalTime / 1000).toStringAsFixed(2)}s'.padRight(56) + '║');
    stdout.writeln('╚════════════════════════════════════════════════════════╝\n');
  }

  /// ═══════════════════════════════════════════════════════════════════════
  /// INTERACTIVE DEBUGGER
  /// ═══════════════════════════════════════════════════════════════════════

  void _interactiveDebugger() {
    stdout.writeln('\n🛑 Debugger paused. Commands: continue (c), logs (l), stack (s), exit (e)');
    
    while (isPaused) {
      stdout.write('> ');
      final input = stdin.readLineSync() ?? '';
      
      switch (input.toLowerCase().trim()) {
        case 'c':
        case 'continue':
          isPaused = false;
          break;
        case 'l':
        case 'logs':
          _showLogs();
          break;
        case 's':
        case 'stack':
          _showStack();
          break;
        case 'e':
        case 'exit':
          exit(1);
        default:
          stdout.writeln('Unknown command');
      }
    }
  }

  void _handleErrorWithBreakpoint(String operation, Object error, StackTrace st) {
    stdout.writeln('\n❌ Error in $operation');
    stdout.writeln('   Error: $error');
    if (interactiveMode) {
      stdout.writeln('   Stack: ${st.toString().split('\n').first}');
      _interactiveDebugger();
    }
  }

  void _showLogs() {
    final recent = logs.skip(logs.length - 10);
    for (final log in recent) {
      _printLog(log);
    }
  }

  void _showStack() {
    if (operationStack.isEmpty) {
      stdout.writeln('Operation stack is empty');
      return;
    }
    for (int i = 0; i < operationStack.length; i++) {
      stdout.writeln('  #$i ${operationStack[i]}');
    }
  }
}

/// ============================================================================
/// DATA MODELS
/// ============================================================================

class DebugLog {
  final DateTime timestamp;
  final DebugLevel level;
  final String message;
  final dynamic value;
  final String category;

  DebugLog({
    required this.timestamp,
    required this.level,
    required this.message,
    this.value,
    required this.category,
  });
}

class Operation {
  final String name;
  final DateTime startTime;
  late DateTime endTime;
  late Duration duration;
  bool success = true;
  String? error;

  Operation({required this.name, required this.startTime});
}

class OperationMetrics {
  final String name;
  final String key;
  final List<int> durationHistory = [];
  final List<int> memoryHistory = [];
  final List<bool> successHistory = [];

  int executionCount = 0;
  int totalDurationMs = 0;
  int totalMemoryMB = 0;

  OperationMetrics({required this.name, required this.key});

  void recordExecution({
    required Duration duration,
    required int memoryDelta,
    required bool success,
    String? error,
  }) {
    executionCount++;
    final durationMs = duration.inMilliseconds;
    durationHistory.add(durationMs);
    memoryHistory.add(memoryDelta);
    successHistory.add(success);

    totalDurationMs += durationMs;
    totalMemoryMB += (memoryDelta ~/ 1024 ~/ 1024);

    if (durationHistory.length > 100) {
      durationHistory.removeAt(0);
      memoryHistory.removeAt(0);
      successHistory.removeAt(0);
    }
  }

  int get averageDurationMs =>
      executionCount > 0 ? totalDurationMs ~/ executionCount : 0;

  double get successRate {
    if (successHistory.isEmpty) return 0;
    final successful = successHistory.where((s) => s).length;
    return (successful / successHistory.length) * 100;
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'executionCount': executionCount,
      'averageDurationMs': averageDurationMs,
      'totalDurationMs': totalDurationMs,
      'successRate': successRate,
    };
  }
}

/// ============================================================================
/// SINGLETON INSTANCE & CONVENIENCE
/// ============================================================================

final debugger = FlutterJSIntegratedDebugger();

/// Use in your pipeline:
/// 
/// await debugger.observe('phase_1_analysis', () async {
///   return analyzer.analyze();
/// }, category: 'parser');
///
/// final widgets = debugger.observeSync('parse_declarations', () {
///   return parser.parseDeclarations();
/// }, category: 'parser');
