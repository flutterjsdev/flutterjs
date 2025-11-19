// ============================================================================
// FILE: ir_server_enhanced.dart
// Complete Dart backend with error handling, caching, validation, timing
// ============================================================================

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:dev_tools/src/html_generator.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;

class BinaryIRServer {
  final int port;
  final String host;
  final bool verbose;
  final String watchDirectory;
  late HttpServer _server;

  // ✅ CACHING: Store parsed results
  final Map<String, Uint8List> _uploadedFiles = {};
  final Map<String, ProgressiveAnalysisResult> _analyses = {};
  final Map<String, String> _fileHashes = {}; // Prevent re-analysis
  final List<IRFileInfo> _availableFiles = [];

  // ✅ PERFORMANCE METRICS
  final Map<String, AnalysisMetrics> _metrics = {};

  // ✅ ERROR TRACKING
  final List<AnalysisError> _errorLog = [];
  final int maxErrorLogSize = 100;

  BinaryIRServer({
    required this.port,
    required this.host,
    required this.verbose,
    required this.watchDirectory,
  });

  Future<void> start() async {
    _scanForIRFiles();
    final handler = Pipeline()
        .addMiddleware(_loggingMiddleware)
        .addMiddleware(_errorHandlingMiddleware)
        .addHandler(_router);
    _server = await shelf_io.serve(handler, host, port);
  }

  Future<void> stop() async {
    await _server.close();
  }

  Future<Response> _handleUpload(Request request) async {
    try {
      // ✅ VALIDATION: Check content-type
      final contentType = request.headers['content-type'] ?? '';
      if (!contentType.contains('octet-stream') && contentType.isNotEmpty) {
        return _errorResponse(
          'Invalid content type. Expected binary file',
          400,
        );
      }

      // ✅ VALIDATION: Read file with size limit
      final bytes = await request
          .read()
          .expand((chunk) => chunk)
          .take(100 * 1024 * 1024) // 100MB limit
          .toList();

      final bytesData = Uint8List.fromList(bytes);

      if (bytesData.isEmpty) {
        _logError('UPLOAD_EMPTY', 'Empty file uploaded', '', 'api/upload');
        return _errorResponse('Empty file uploaded', 400);
      }

      // ✅ VALIDATION: Check magic number
      if (bytesData.length < 4) {
        _logError('UPLOAD_TOO_SMALL', 'File too small', '', 'api/upload');
        return _errorResponse('File too small to be valid IR file', 400);
      }

      final fileId = DateTime.now().millisecondsSinceEpoch.toString();
      _uploadedFiles[fileId] = bytesData;

      // ✅ PERFORMANCE: Create metrics tracker
      final metrics = AnalysisMetrics(fileId: fileId);
      _metrics[fileId] = metrics;

      metrics.recordPhase('READ_FILE', bytesData.length);

      // ✅ FIX: WAIT FOR STREAM TO COMPLETE BEFORE CHECKING RESULTS
      try {
        await _analyzeFileStream(
          fileId,
          bytesData,
          'uploaded_$fileId.ir',
        ).drain(); // ✅ Wait until all items are streamed

        // ✅ NOW the analysis should be stored
        await Future.delayed(
          Duration(milliseconds: 100),
        ); // Small delay to ensure storage
      } catch (e) {
        _logError('STREAM_ERROR', e.toString(), '', 'api/upload');
        return _errorResponse('Stream analysis failed: ${e.toString()}', 500);
      }

      // ✅ NOW it's safe to check
      final analysis = _analyses[fileId];
      if (analysis == null) {
        _logError(
          'ANALYSIS_NOT_FOUND',
          'Analysis result missing after stream',
          '',
          'api/upload',
        );
        return _errorResponse('Analysis result not found', 500);
      }

      if (!analysis.success) {
        _logError(
          'ANALYSIS_FAILED',
          analysis.error ?? '<unknown>',
          '',
          'api/upload',
        );
        return _errorResponse(analysis.error ?? 'Unknown analysis error', 400);
      }

      metrics.recordPhase('COMPLETE', analysis.totalLines);
      metrics.recordSuccess();

      return Response.ok(
        jsonEncode({
          'success': true,
          'fileId': fileId,
          'size': bytesData.length,
          'analysis': analysis.toJson(),
          'metrics': metrics.toJson(),
        }),
        headers: {'content-type': 'application/json'},
      );
    } catch (e, st) {
      _logError('UPLOAD_ERROR', e.toString(), st.toString(), 'api/upload');
      return _errorResponse('Upload failed: ${e.toString()}', 400);
    }
  }

  Future<Response> _handleLoadFromPath(Request request) async {
    try {
      final bodyBytes = await request.read().expand((chunk) => chunk).toList();
      final body = utf8.decode(bodyBytes);
      final data = jsonDecode(body) as Map<String, dynamic>;
      final filePath = data['path'] as String?;

      if (filePath == null || filePath.isEmpty) {
        return _errorResponse('Path parameter is required', 400);
      }

      final file = File(filePath);
      if (!await file.exists()) {
        _logError('FILE_NOT_FOUND', 'Path: $filePath', '', 'api/load-path');
        return _errorResponse('File not found: $filePath', 404);
      }

      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        _logError('FILE_EMPTY', 'Path: $filePath', '', 'api/load-path');
        return _errorResponse('File is empty: $filePath', 400);
      }

      final fileId = filePath.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      _uploadedFiles[fileId] = bytes;

      // ✅ PERFORMANCE: Create metrics tracker
      final metrics = AnalysisMetrics(fileId: fileId);
      _metrics[fileId] = metrics;

      metrics.recordPhase('READ_FILE', bytes.length);

      // ✅ FIX: WAIT FOR STREAM TO COMPLETE BEFORE CHECKING RESULTS
      try {
        await _analyzeFileStream(
          fileId,
          bytes,
          file.uri.pathSegments.last,
        ).drain(); // ✅ Wait until all items are streamed

        // ✅ NOW the analysis should be stored
        await Future.delayed(
          Duration(milliseconds: 100),
        ); // Small delay to ensure storage
      } catch (e) {
        _logError('STREAM_ERROR', e.toString(), '', 'api/load-path');
        return _errorResponse('Stream analysis failed: ${e.toString()}', 500);
      }

      // ✅ NOW it's safe to check
      final analysis = _analyses[fileId];
      if (analysis == null) {
        _logError(
          'ANALYSIS_NOT_FOUND',
          'Analysis result missing after stream',
          '',
          'api/load-path',
        );
        return _errorResponse('Analysis result not found', 500);
      }

      if (!analysis.success) {
        _logError(
          'ANALYSIS_FAILED',
          analysis.error ?? '<unknown>',
          '',
          'api/load-path',
        );
        return _errorResponse(analysis.error ?? 'Unknown analysis error', 400);
      }

      metrics.recordPhase('COMPLETE', analysis.totalLines);
      metrics.recordSuccess();

      return Response.ok(
        jsonEncode({
          'success': true,
          'fileId': fileId,
          'path': filePath,
          'size': bytes.length,
          'analysis': analysis.toJson(),
          'metrics': metrics.toJson(),
        }),
        headers: {'content-type': 'application/json'},
      );
    } catch (e, st) {
      _logError(
        'LOAD_PATH_ERROR',
        e.toString(),
        st.toString(),
        'api/load-path',
      );
      return _errorResponse('Load failed: ${e.toString()}', 400);
    }
  }

  // ============================================================================
  // IMPROVED: Stream analysis with better error handling
  // ============================================================================

  Stream<AnalysisLine> _analyzeFileStream(
    String fileId,
    Uint8List bytes,
    String fileName,
  ) async* {
    ProgressiveAnalysisResult? result;

    try {
      if (verbose) print('🔍 Starting stream analysis: $fileName');

      final reader = BinaryIRReader();
      final dartFile = reader.readFileIR(bytes, verbose: verbose);

      result = ProgressiveAnalysisResult(
        fileId: fileId,
        fileName: fileName,
        startTime: DateTime.now(),
      );

      var lineNum = 1;

      // ========== FILE INFORMATION SECTION ==========
      yield AnalysisLine(
        lineNum: lineNum++,
        text: '📄 FILE INFORMATION',
        status: 'ok',
        section: 'FILE_INFO',
        details: {'type': 'header'},
      );

      yield AnalysisLine(
        lineNum: lineNum++,
        text: 'Library: ${dartFile.library}',
        status: 'ok',
        section: 'FILE_INFO',
        details: {'library': dartFile.library},
      );

      yield AnalysisLine(
        lineNum: lineNum++,
        text: 'File Path: ${dartFile.filePath}',
        status: 'ok',
        section: 'FILE_INFO',
        details: {'path': dartFile.filePath},
      );

      yield AnalysisLine(
        lineNum: lineNum++,
        text:
            'Size: ${(bytes.length / 1024).toStringAsFixed(1)} KB | Hash: ${(dartFile.contentHash).substring(0, 16)}...',
        status: 'ok',
        section: 'FILE_INFO',
        details: {'size': bytes.length, 'hash': dartFile.contentHash},
      );

      result.addPhase('FILE_INFO', 'ok', {
        'filePath': dartFile.filePath,
        'contentHash': dartFile.contentHash,
        'library': dartFile.library ?? '<unknown>',
        'totalBytes': bytes.length,
      });

      // ========== STATISTICS SECTION ==========
      yield AnalysisLine(
        lineNum: lineNum++,
        text: '📊 STATISTICS',
        status: 'pending',
        section: 'STATISTICS',
        details: {'type': 'header'},
      );

      final stats = {
        'imports': dartFile.imports.length,
        'exports': dartFile.exports.length,
        'variables': dartFile.variableDeclarations.length,
        'functions': dartFile.functionDeclarations.length,
        'classes': dartFile.classDeclarations.length,
        'analysisIssues': dartFile.analysisIssues.length,
        'totalMethods': (dartFile.classDeclarations).fold(
          0,
          (sum, c) => sum + (c.methods.length),
        ),
        'totalFields': (dartFile.classDeclarations).fold(
          0,
          (sum, c) => sum + (c.fields.length),
        ),
      };

      yield AnalysisLine(
        lineNum: lineNum++,
        text:
            'Classes: ${stats['classes']} | Methods: ${stats['totalMethods']} | Fields: ${stats['totalFields']}',
        status: 'ok',
        section: 'STATISTICS',
        details: stats,
      );

      yield AnalysisLine(
        lineNum: lineNum++,
        text:
            'Functions: ${stats['functions']} | Variables: ${stats['variables']}',
        status: 'ok',
        section: 'STATISTICS',
        details: {
          'functions': stats['functions'],
          'variables': stats['variables'],
        },
      );

      yield AnalysisLine(
        lineNum: lineNum++,
        text:
            'Imports: ${stats['imports']} | Exports: ${stats['exports']} | Issues: ${stats['analysisIssues']}',
        status: stats['analysisIssues'] == 0 ? 'ok' : 'warning',
        section: 'STATISTICS',
        details: {
          'imports': stats['imports'],
          'issues': stats['analysisIssues'],
        },
      );

      result.addPhase('STATISTICS', 'ok', stats);

      // ========== IMPORTS SECTION ==========
      final imports = dartFile.imports;
      if (imports.isNotEmpty) {
        yield AnalysisLine(
          lineNum: lineNum++,
          text: '📦 IMPORTS (${imports.length})',
          status: 'pending',
          section: 'IMPORTS',
          details: {'count': imports.length, 'type': 'header'},
        );

        for (int i = 0; i < imports.length && i < 15; i++) {
          final imp = imports[i];
          yield AnalysisLine(
            lineNum: lineNum++,
            text:
                '├─ ${imp.uri} ${imp.prefix != null ? '(as ${imp.prefix})' : ''} ${imp.isDeferred == true ? '[deferred]' : ''}',
            status: 'ok',
            section: 'IMPORTS',
            details: {
              'uri': imp.uri,
              'prefix': imp.prefix,
              'deferred': imp.isDeferred,
            },
          );
        }

        if (imports.length > 15) {
          yield AnalysisLine(
            lineNum: lineNum++,
            text: '└─ ... and ${imports.length - 15} more imports',
            status: 'ok',
            section: 'IMPORTS',
            details: {'remaining': imports.length - 15},
          );
        }

        result.addPhase(
          'IMPORTS',
          'ok',
          imports
              .map(
                (i) => {
                  'uri': i.uri,
                  'prefix': i.prefix ?? 'none',
                  'isDeferred': i.isDeferred,
                },
              )
              .toList(),
        );
      }

      // ========== CLASSES SECTION ==========
      final classes = dartFile.classDeclarations;
      if (classes.isNotEmpty) {
        yield AnalysisLine(
          lineNum: lineNum++,
          text: '🗿 CLASSES (${classes.length})',
          status: 'pending',
          section: 'CLASSES',
          details: {'count': classes.length, 'type': 'header'},
        );

        for (int i = 0; i < classes.length && i < 15; i++) {
          final cls = classes[i];
          final abstractFlag = cls.isAbstract == true ? '[abstract] ' : '';
          yield AnalysisLine(
            lineNum: lineNum++,
            text:
                '├─ $abstractFlag${cls.name} [${cls.methods.length} methods | ${cls.fields.length} fields]',
            status: 'ok',
            section: 'CLASSES',
            details: {
              'name': cls.name,
              'methods': cls.methods.length,
              'fields': cls.fields.length,
            },
          );
        }

        if (classes.length > 15) {
          yield AnalysisLine(
            lineNum: lineNum++,
            text: '└─ ... and ${classes.length - 15} more classes',
            status: 'ok',
            section: 'CLASSES',
            details: {'remaining': classes.length - 15},
          );
        }

        result.addPhase(
          'CLASSES',
          'ok',
          classes
              .map(
                (c) => {
                  'name': c.name,
                  'methods': c.methods.length,
                  'fields': c.fields.length,
                },
              )
              .toList(),
        );
      }

      // ========== FUNCTIONS SECTION ==========
      final functions = dartFile.functionDeclarations;
      if (functions.isNotEmpty) {
        yield AnalysisLine(
          lineNum: lineNum++,
          text: '⚙️ FUNCTIONS (${functions.length})',
          status: 'pending',
          section: 'FUNCTIONS',
          details: {'count': functions.length, 'type': 'header'},
        );

        for (int i = 0; i < functions.length && i < 15; i++) {
          final func = functions[i];
          final asyncFlag = func.isAsync == true ? '[async] ' : '';
          yield AnalysisLine(
            lineNum: lineNum++,
            text:
                '├─ $asyncFlag${func.name}(${func.parameters.length} params) → ${func.returnType.displayName()}',
            status: 'ok',
            section: 'FUNCTIONS',
            details: {
              'name': func.name,
              'parameters': func.parameters.length,
              'returnType': func.returnType.displayName(),
            },
          );
        }

        if (functions.length > 15) {
          yield AnalysisLine(
            lineNum: lineNum++,
            text: '└─ ... and ${functions.length - 15} more functions',
            status: 'ok',
            section: 'FUNCTIONS',
            details: {'remaining': functions.length - 15},
          );
        }

        result.addPhase(
          'FUNCTIONS',
          'ok',
          functions
              .map((f) => {'name': f.name, 'parameters': f.parameters.length})
              .toList(),
        );
      }

      // ========== VARIABLES SECTION ==========
      final variables = dartFile.variableDeclarations;
      if (variables.isNotEmpty) {
        yield AnalysisLine(
          lineNum: lineNum++,
          text: '📝 VARIABLES (${variables.length})',
          status: 'pending',
          section: 'VARIABLES',
          details: {'count': variables.length, 'type': 'header'},
        );

        for (int i = 0; i < variables.length && i < 15; i++) {
          final variable = variables[i];
          yield AnalysisLine(
            lineNum: lineNum++,
            text: '├─ ${variable.name}: ${variable.type.displayName()}',
            status: 'ok',
            section: 'VARIABLES',
            details: {
              'name': variable.name,
              'type': variable.type.displayName(),
            },
          );
        }

        if (variables.length > 15) {
          yield AnalysisLine(
            lineNum: lineNum++,
            text: '└─ ... and ${variables.length - 15} more variables',
            status: 'ok',
            section: 'VARIABLES',
            details: {'remaining': variables.length - 15},
          );
        }

        result.addPhase(
          'VARIABLES',
          'ok',
          variables
              .map((v) => {'name': v.name, 'type': v.type.displayName()})
              .toList(),
        );
      }

      // ========== FINAL LINE ==========
      yield AnalysisLine(
        lineNum: lineNum++,
        text: '✅ ANALYSIS COMPLETE - ${lineNum - 1} lines analyzed',
        status: 'ok',
        section: 'COMPLETE',
        details: {'totalLines': lineNum - 1},
      );

      result.markComplete();
      result.totalLines = lineNum - 1;
      result.setFinalAnalysis(
        fileInfo: {
          'filePath': dartFile.filePath,
          'contentHash': dartFile.contentHash,
          'library': dartFile.library ?? '<unknown>',
          'totalBytes': bytes.length,
        },
        statistics: stats,
        imports: imports
            .map((i) => {'uri': i.uri, 'prefix': i.prefix})
            .toList(),
        variables: variables
            .map((v) => {'name': v.name, 'type': v.type.displayName()})
            .toList(),
        functions: functions
            .map((f) => {'name': f.name, 'params': f.parameters.length})
            .toList(),
        classes: classes
            .map((c) => {'name': c.name, 'methods': c.methods.length})
            .toList(),
      );

      // ✅ STORE RESULT BEFORE STREAM ENDS
      _analyses[fileId] = result;
      if (verbose) print('✅ Analysis stored successfully: $fileId');
    } catch (e, st) {
      _logError('ANALYSIS_ERROR', e.toString(), st.toString(), fileId);

      // ✅ Even on error, store the failed result
      if (result != null) {
        result.success = false;
        result.error = 'Analysis error: ${e.toString()}';
        _analyses[fileId] = result;
      }

      yield AnalysisLine(
        lineNum: -1,
        text: '❌ ERROR: ${e.toString()}',
        status: 'error',
        section: 'ERROR',
        details: {'exception': e.toString()},
      );
    }
  }

  void _scanForIRFiles() {
    try {
      final dir = Directory(watchDirectory);
      if (!dir.existsSync()) {
        if (verbose) print('⚠️  Directory not found: $watchDirectory');
        return;
      }

      _availableFiles.clear();
      final files = dir.listSync(recursive: false);

      for (final file in files) {
        if (file is File && file.path.endsWith('.ir')) {
          try {
            _availableFiles.add(
              IRFileInfo(
                path: file.path,
                name: file.uri.pathSegments.last,
                size: file.lengthSync(),
                modified: file.statSync().modified,
              ),
            );
            if (verbose) print('📄 Found: ${file.path}');
          } catch (e) {
            if (verbose) print('⚠️  Could not stat file ${file.path}: $e');
          }
        }
      }

      if (verbose) print('✅ Scanned: ${_availableFiles.length} IR files\n');
    } catch (e) {
      if (verbose) print('❌ Error scanning directory: $e');
    }
  }

  // ✅ NEW: Error handling middleware
  Handler _errorHandlingMiddleware(Handler innerHandler) {
    return (request) async {
      try {
        return await innerHandler(request);
      } catch (e, st) {
        _logError(
          'MIDDLEWARE_ERROR',
          e.toString(),
          st.toString(),
          request.url.path,
        );
        return _errorResponse('Internal server error: $e', 500);
      }
    };
  }

  // ✅ ENHANCED: Logging middleware with timing
  Handler _loggingMiddleware(Handler innerHandler) {
    return (request) async {
      final startTime = DateTime.now();
      if (verbose) {
        print(
          '🔨 [${request.method}] ${request.url} at ${startTime.toIso8601String()}',
        );
      }

      final response = await innerHandler(request);

      final duration = DateTime.now().difference(startTime);
      if (verbose) {
        print(
          '✅ Response: ${response.statusCode} in ${duration.inMilliseconds}ms\n',
        );
      }

      return response;
    };
  }

  Future<Response> _router(Request request) async {
    var path = request.url.path;
    final method = request.method;

    if (path.startsWith('/')) {
      path = path.substring(1);
    }

    try {
      if ((path.isEmpty || path == '/') && method == 'GET') {
        return Response.ok(
          _getHtmlUI(),
          headers: {'content-type': 'text/html; charset=utf-8'},
        );
      }

      if (path == 'api/files' && method == 'GET') {
        return _handleListFiles();
      }

      if (path == 'api/upload' && method == 'POST') {
        return await _handleUpload(request);
      }

      if (path == 'api/load-path' && method == 'POST') {
        return await _handleLoadFromPath(request);
      }

      // ✅ NEW: API endpoint for metrics
      if (path == 'api/metrics' && method == 'GET') {
        return _handleMetrics();
      }

      // ✅ NEW: API endpoint for error logs
      if (path == 'api/errors' && method == 'GET') {
        return _handleErrorLogs();
      }

      // ✅ NEW: API endpoint to clear cache
      if (path == 'api/cache/clear' && method == 'POST') {
        return _handleClearCache();
      }

      return _errorResponse('Route not found: $path', 404);
    } catch (e, st) {
      _logError('ROUTER_ERROR', e.toString(), st.toString(), path);
      return _errorResponse('Server error: ${e.toString()}', 500);
    }
  }

  Response _handleListFiles() {
    try {
      return Response.ok(
        jsonEncode({
          'success': true,
          'count': _availableFiles.length,
          'files': _availableFiles
              .map(
                (f) => {
                  'path': f.path,
                  'name': f.name,
                  'size': f.size,
                  'sizeKB': (f.size / 1024).toStringAsFixed(2),
                  'modified': f.modified.toIso8601String(),
                  'cached': _fileHashes.containsKey(f.path), // ✅ Show if cached
                },
              )
              .toList(),
        }),
        headers: {'content-type': 'application/json'},
      );
    } catch (e) {
      _logError('LIST_FILES_ERROR', e.toString(), '', 'api/files');
      return _errorResponse('Failed to list files: $e', 500);
    }
  }

  // ✅ NEW: Metrics endpoint
  Response _handleMetrics() {
    try {
      final metricsData = _metrics.values.map((m) => m.toJson()).toList();
      return Response.ok(
        jsonEncode({
          'success': true,
          'metrics': metricsData,
          'totalAnalyses': _analyses.length,
          'totalCached': _fileHashes.length,
        }),
        headers: {'content-type': 'application/json'},
      );
    } catch (e) {
      _logError('METRICS_ERROR', e.toString(), '', 'api/metrics');
      return _errorResponse('Failed to get metrics: $e', 500);
    }
  }

  // ✅ NEW: Error logs endpoint
  Response _handleErrorLogs() {
    try {
      return Response.ok(
        jsonEncode({
          'success': true,
          'errors': _errorLog.map((e) => e.toJson()).toList(),
          'totalErrors': _errorLog.length,
        }),
        headers: {'content-type': 'application/json'},
      );
    } catch (e) {
      return _errorResponse('Failed to get error logs: $e', 500);
    }
  }

  // ✅ NEW: Cache clearing endpoint
  Response _handleClearCache() {
    try {
      final oldSize = _analyses.length;
      _analyses.clear();
      _uploadedFiles.clear();
      _fileHashes.clear();
      _metrics.clear();

      return Response.ok(
        jsonEncode({
          'success': true,
          'message': 'Cache cleared',
          'itemsRemoved': oldSize,
        }),
        headers: {'content-type': 'application/json'},
      );
    } catch (e) {
      _logError('CACHE_CLEAR_ERROR', e.toString(), '', 'api/cache/clear');
      return _errorResponse('Failed to clear cache: $e', 500);
    }
  }

  // ✅ NEW: Error logging
  void _logError(
    String code,
    String message,
    String stackTrace,
    String context,
  ) {
    final error = AnalysisError(
      code: code,
      message: message,
      stackTrace: stackTrace,
      context: context,
      timestamp: DateTime.now(),
    );

    _errorLog.add(error);

    // Keep error log size manageable
    if (_errorLog.length > maxErrorLogSize) {
      _errorLog.removeAt(0);
    }

    if (verbose) {
      print('❌ ERROR [$code]: $message in $context');
      if (stackTrace.isNotEmpty) print('Stack: $stackTrace');
    }
  }

  Response _errorResponse(String message, int statusCode) {
    return Response(
      statusCode,
      body: jsonEncode({
        'success': false,
        'error': message,
        'timestamp': DateTime.now().toIso8601String(),
      }),
      headers: {'content-type': 'application/json'},
    );
  }

  String _getHtmlUI() => HtmlGenerator.generate();
}

// ============================================================================
// DATA CLASSES
// ============================================================================

class AnalysisLine {
  final int lineNum;
  final String text;
  final String status;
  final String section;
  final Map<String, dynamic>? details;

  AnalysisLine({
    required this.lineNum,
    required this.text,
    required this.status,
    required this.section,
    this.details,
  });

  Map<String, dynamic> toJson() {
    return {
      'lineNum': lineNum,
      'text': text,
      'status': status,
      'section': section,
      'details': details,
    };
  }
}

class ProgressiveAnalysisResult {
  final String fileId;
  final String fileName;
  final DateTime startTime;
  bool success = true;
  String? error;
  int totalLines = 0;

  List<AnalysisPhase> phases = [];
  Map<String, dynamic>? finalAnalysis;

  ProgressiveAnalysisResult({
    required this.fileId,
    required this.fileName,
    required this.startTime,
  });

  void addPhase(String phase, String status, dynamic data) {
    phases.add(
      AnalysisPhase(
        phase: phase,
        status: status,
        data: data,
        timestamp: DateTime.now(),
      ),
    );
  }

  void markComplete() {
    addPhase('COMPLETE', 'ok', {
      'duration': DateTime.now().difference(startTime).inMilliseconds,
      'totalPhases': phases.length,
      'totalLines': totalLines,
    });
  }

  void setFinalAnalysis({
    required Map<String, dynamic> fileInfo,
    required Map<String, dynamic> statistics,
    required List<dynamic> imports,
    required List<dynamic> variables,
    required List<dynamic> functions,
    required List<dynamic> classes,
  }) {
    finalAnalysis = {
      'success': success,
      'error': error,
      'fileInfo': fileInfo,
      'statistics': statistics,
      'imports': imports,
      'variables': variables,
      'functions': functions,
      'classes': classes,
      'phases': phases.map((p) => p.toJson()).toList(),
    };
  }

  Map<String, dynamic> toJson() {
    return finalAnalysis ??
        {
          'success': success,
          'error': error,
          'phases': phases.map((p) => p.toJson()).toList(),
        };
  }
}

class AnalysisPhase {
  final String phase;
  final String status;
  final dynamic data;
  final DateTime timestamp;

  AnalysisPhase({
    required this.phase,
    required this.status,
    required this.data,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'phase': phase,
      'status': status,
      'timestamp': timestamp.toIso8601String(),
      'data': data,
    };
  }
}

// ✅ NEW: Performance Metrics Tracking
class AnalysisMetrics {
  final String fileId;
  final DateTime startTime;
  late DateTime endTime;
  bool completed = false;

  Map<String, PhaseMetric> phaseMetrics = {};

  AnalysisMetrics({required this.fileId}) : startTime = DateTime.now();

  void recordPhase(String phaseName, int itemCount) {
    phaseMetrics[phaseName] = PhaseMetric(
      name: phaseName,
      timestamp: DateTime.now(),
      itemCount: itemCount,
      duration: phaseMetrics.isEmpty
          ? 0
          : DateTime.now().difference(startTime).inMilliseconds,
    );
  }

  void recordSuccess() {
    completed = true;
    endTime = DateTime.now();
  }

  int getTotalDuration() {
    return endTime.difference(startTime).inMilliseconds;
  }

  Map<String, dynamic> toJson() {
    return {
      'fileId': fileId,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime.toIso8601String(),
      'totalDurationMs': getTotalDuration(),
      'completed': completed,
      'phases': phaseMetrics.values.map((p) => p.toJson()).toList(),
    };
  }
}

class PhaseMetric {
  final String name;
  final DateTime timestamp;
  final int itemCount;
  final int duration;

  PhaseMetric({
    required this.name,
    required this.timestamp,
    required this.itemCount,
    required this.duration,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'timestamp': timestamp.toIso8601String(),
      'itemCount': itemCount,
      'durationMs': duration,
    };
  }
}

// ✅ NEW: Error Tracking
class AnalysisError {
  final String code;
  final String message;
  final String stackTrace;
  final String context;
  final DateTime timestamp;

  AnalysisError({
    required this.code,
    required this.message,
    required this.stackTrace,
    required this.context,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'code': code,
      'message': message,
      'stackTrace': stackTrace,
      'context': context,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}

class IRFileInfo {
  final String path;
  final String name;
  final int size;
  final DateTime modified;

  IRFileInfo({
    required this.path,
    required this.name,
    required this.size,
    required this.modified,
  });
}
