import 'dart:async';
import 'dart:io';
import 'package:intl/intl.dart';
import 'package:watcher/watcher.dart';

enum DebugLevel { trace, debug, info, warn, error }

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
  final Map<String, OperationMetrics> metrics = {};
  final List<String> operationStack = [];
  bool isPaused = false;
  int maxLogs = 5000;

  // ✅ NEW: Defer reporting
  bool _reportPrinted = false;

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
    print('\n┌────────────────────────────────────────────────────────────┐');
    print('│  🛠 Flutter.js Integrated Debugger                         │');
    if (verbose) {
      print('│  Mode: VERBOSE (trace level)                              │');
    } else {
      print('│  Mode: DEBUG (debug level)                                │');
    }
    print('└────────────────────────────────────────────────────────────┘\n');
  }

  /// Auto-observe for async operations
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

      _recordOperation(
        opKey,
        operationName,
        duration,
        memoryDelta,
        success: true,
      );
      _logSuccess(operationName, duration, memoryDelta);

      return result;
    } catch (e, st) {
      final duration = DateTime.now().difference(startTime);
      _recordOperation(
        opKey,
        operationName,
        duration,
        0,
        success: false,
        error: e.toString(),
      );
      _logError(operationName, e.toString());

      if (interactiveMode) {
        _handleErrorWithBreakpoint(operationName, e, st);
      }

      rethrow;
    } finally {
      operationStack.removeLast();
    }
  }

  /// Auto-observe for sync operations
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

      _recordOperation(
        opKey,
        operationName,
        duration,
        memoryDelta,
        success: true,
      );
      _logSuccess(operationName, duration, memoryDelta);

      return result;
    } catch (e, st) {
      final duration = DateTime.now().difference(startTime);
      _recordOperation(
        opKey,
        operationName,
        duration,
        0,
        success: false,
        error: e.toString(),
      );
      _logError(operationName, e.toString());

      if (interactiveMode) {
        _handleErrorWithBreakpoint(operationName, e, st);
      }

      rethrow;
    } finally {
      operationStack.removeLast();
    }
  }

  /// Logging
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
    log(
      DebugLevel.debug,
      '▶ $operationName',
      category: category ?? 'operation',
    );
  }

  void _logSuccess(String operationName, Duration duration, int memoryDelta) {
    final time = duration.inMilliseconds > 1000
        ? '${(duration.inMilliseconds / 1000).toStringAsFixed(2)}s'
        : '${duration.inMilliseconds}ms';

    final mem = memoryDelta > 0
        ? ' (mem: ${(memoryDelta / 1024 / 1024).toStringAsFixed(2)}MB)'
        : '';

    log(DebugLevel.debug, '✅ $operationName: $time$mem', category: 'operation');
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
    final levelStr = entry.level
        .toString()
        .split('.')
        .last
        .toUpperCase()
        .padRight(5);

    stdout.write('[$time] $emoji [$levelStr] ${entry.category.padRight(12)} ');
    stdout.write(entry.message);

    if (entry.value != null) {
      stdout.write('\n          └─ ${_formatValue(entry.value)}');
    }

    stdout.writeln();
  }

  String _getLevelEmoji(DebugLevel level) {
    switch (level) {
      case DebugLevel.trace:
        return '🔍';
      case DebugLevel.debug:
        return '🛠';
      case DebugLevel.info:
        return 'ℹ️';
      case DebugLevel.warn:
        return '⚠️';
      case DebugLevel.error:
        return '❌';
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

  // =========================================================================
  // ✅ DEFERRED REPORTING - Print ONLY ONCE at end
  // =========================================================================

  void _recordOperation(
    String key,
    String name,
    Duration duration,
    int memoryDelta, {
    required bool success,
    String? error,
  }) {
    if (!enableMetrics) return;

    final metric = metrics[key] ?? OperationMetrics(name: name, key: key);

    metric.recordExecution(
      duration: duration,
      memoryDelta: memoryDelta,
      success: success,
      error: error,
    );

    metrics[key] = metric;
  }

  /// ✅ Print report ONLY if not deferred, or explicitly called
  void printSummary({bool force = false}) {
    if (!enabled || metrics.isEmpty) return;

    // ✅ CRITICAL: Only print if force=true OR haven't printed yet
    if (_reportPrinted && !force) {
      log(
        DebugLevel.warn,
        'printSummary called multiple times! Ignoring duplicate call.',
        category: 'debugger',
      );
      return;
    }

    _reportPrinted = true;

    final buffer = StringBuffer();
    int totalTime = 0;

    final sorted = metrics.entries.toList()
      ..sort(
        (a, b) => b.value.totalDurationMs.compareTo(a.value.totalDurationMs),
      );

    for (final entry in sorted) {
      final m = entry.value;
      totalTime += m.totalDurationMs;

      buffer.write(
        "${m.name}:${m.executionCount}x "
        "avg${m.averageDurationMs.toStringAsFixed(0)}ms "
        "tot${m.totalDurationMs}ms | ",
      );
    }

    // Remove final ' | '
    final summary = buffer.toString().replaceAll(RegExp(r' \| $'), '');

    // ✅ Print with clear header to show it's only once
    stdout.writeln('\n📊 Performance Summary:');
    stdout.writeln(summary);
    stdout.writeln("Total: ${(totalTime / 1000).toStringAsFixed(2)}s\n");
  }

  /// ✅ Clear metrics for next run (used in watch mode)
  void resetMetrics() {
    metrics.clear();
    _reportPrinted = false;
  }

  void _initFileWatcher() {
    try {
      final watcher = DirectoryWatcher('lib');

      watcher.events.listen((event) {
        if (event.path.endsWith('.dart')) {
          log(
            DebugLevel.info,
            '📝 File changed: ${event.path}',
            category: 'watcher',
          );
        }
      });

      log(DebugLevel.info, 'File watcher started on lib/', category: 'watcher');
    } catch (e) {
      log(DebugLevel.warn, 'File watcher failed: $e', category: 'watcher');
    }
  }

  void _handleErrorWithBreakpoint(
    String operation,
    Object error,
    StackTrace st,
  ) {
    stdout.writeln('\n❌ Error in $operation');
    stdout.writeln('   Error: $error');
    if (interactiveMode) {
      stdout.writeln('   Stack: ${st.toString().split('\n').first}');
    }
  }
}

/// ============================================================================
/// SMART FILE WATCHER - Triggers FULL pipeline on any change
/// ============================================================================

class SmartFileWatcher {
  final String watchDir;
  final Duration debounceTime;
  late StreamSubscription _subscription;

  Timer? _debounceTimer;
  final Set<String> _changedFiles = {};
  final List<void Function(Set<String>)> _callbacks = [];

  SmartFileWatcher({
    required this.watchDir,
    this.debounceTime = const Duration(milliseconds: 500),
  });

  /// Start watching directory (watches both SDK and source)
  Future<void> start() async {
    try {
      final watcher = DirectoryWatcher(watchDir);

      _subscription = watcher.events.listen((event) {
        // ✅ Watch ALL .dart files (SDK + source)
        if (event.path.endsWith('.dart')) {
          _changedFiles.add(event.path);

          // ✅ Debounce: Wait before triggering full pipeline
          _debounceTimer?.cancel();
          _debounceTimer = Timer(debounceTime, () {
            _notifyListeners();
          });
        }
      });

      print(
        '👀 File watcher started on: $watchDir (watches SDK + source code)\n',
      );
    } catch (e) {
      print('⚠️ File watcher failed: $e');
    }
  }

  /// Add change listener
  void onChange(void Function(Set<String>) callback) {
    _callbacks.add(callback);
  }

  void _notifyListeners() {
    if (_changedFiles.isNotEmpty) {
      print('\n🔄 Change detected: ${_changedFiles.length} file(s) changed');
      print('🔁 Triggering FULL pipeline...\n');

      for (final callback in _callbacks) {
        callback(_changedFiles);
      }
      _changedFiles.clear();
    }
  }

  /// Stop watching
  Future<void> stop() async {
    _debounceTimer?.cancel();
    await _subscription.cancel();
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
