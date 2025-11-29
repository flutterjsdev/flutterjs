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

  // ✅ NEW: Add this line after _analyses
  final Map<String, dynamic> _jsonDataCache = {}; // Cache parsed JSON data
  final Map<String, JsonAnalysisResult> _jsonAnalyses =
      {}; // Cache JSON analysis results

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
  // ✅ REPLACE the _handleUpload method in ir_server.dart with this:

  // ============================================================================
  // CORRECTED: _handleUpload method with proper shelf_multipart API
  // ============================================================================

  // ============================================================================
  // PRODUCTION-READY: Robust multipart parsing with edge case handling
  // ============================================================================

  Future<Response> _handleUpload(Request request) async {
    try {
      print('📤 Upload started...');

      // ✅ STEP 1: Validate content-type
      final contentType = request.headers['content-type'] ?? '';
      if (!contentType.contains('multipart/form-data')) {
        return _errorResponseJson({
          'success': false,
          'error': 'Invalid content-type. Expected multipart/form-data',
          'received': contentType,
        }, 400);
      }

      // ✅ STEP 2: Extract boundary safely
      final boundaryMatch = RegExp(
        r'boundary=([^\s;]+)',
      ).firstMatch(contentType);
      if (boundaryMatch == null) {
        return _errorResponseJson({
          'success': false,
          'error': 'Missing boundary in multipart request',
        }, 400);
      }

      String boundary = boundaryMatch.group(1)!.replaceAll('"', '');
      if (boundary.isEmpty) {
        return _errorResponseJson({
          'success': false,
          'error': 'Empty boundary value',
        }, 400);
      }

      print('✅ Boundary extracted: $boundary');

      // ✅ STEP 3: Read body with size limit
      const maxRequestSize =
          105 * 1024 * 1024; // 105MB to allow 100MB files + headers
      final bodyBytes = <int>[];

      try {
        await for (final chunk in request.read()) {
          bodyBytes.addAll(chunk);
          if (bodyBytes.length > maxRequestSize) {
            return _errorResponseJson({
              'success': false,
              'error': 'Request body exceeds maximum size (100MB)',
            }, 413);
          }
        }
      } catch (e) {
        return _errorResponseJson({
          'success': false,
          'error': 'Failed to read request body: ${e.toString()}',
        }, 400);
      }

      if (bodyBytes.isEmpty) {
        return _errorResponseJson({
          'success': false,
          'error': 'Empty request body',
        }, 400);
      }

      print('📊 Body received: ${bodyBytes.length} bytes');

      // ✅ STEP 4: Parse multipart with robust boundary detection
      final parser = MultipartParser(Uint8List.fromList(bodyBytes), boundary);

      final parseResult = parser.parse();
      if (!parseResult['success']) {
        return _errorResponseJson({
          'success': false,
          'error': parseResult['error'] ?? 'Multipart parsing failed',
        }, 400);
      }

      final fileNameExtracted = parseResult['filename'] as String?;
      final fileDataExtracted = parseResult['data'] as Uint8List?;

      if (fileNameExtracted == null || fileNameExtracted.isEmpty) {
        return _errorResponseJson({
          'success': false,
          'error': 'No filename found in multipart upload',
        }, 400);
      }

      if (fileDataExtracted == null || fileDataExtracted.isEmpty) {
        return _errorResponseJson({
          'success': false,
          'error': 'No file data found in multipart upload',
        }, 400);
      }

      print('📄 File: $fileNameExtracted (${fileDataExtracted.length} bytes)');

      // ✅ STEP 5: Validate file
      if (!fileNameExtracted.toLowerCase().endsWith('.ir')) {
        return _errorResponseJson({
          'success': false,
          'error': 'Invalid file type. Only .ir files are allowed',
          'filename': fileNameExtracted,
        }, 400);
      }

      const maxFileSize = 100 * 1024 * 1024; // 100MB
      if (fileDataExtracted.length > maxFileSize) {
        return _errorResponseJson({
          'success': false,
          'error': 'File exceeds maximum size (100MB)',
          'size': fileDataExtracted.length,
        }, 413);
      }

      // ✅ STEP 6: Store and analyze
      final fileId = DateTime.now().millisecondsSinceEpoch.toString();
      _uploadedFiles[fileId] = fileDataExtracted;

      final metrics = AnalysisMetrics(fileId: fileId);
      _metrics[fileId] = metrics;
      metrics.recordPhase('READ_FILE', fileDataExtracted.length);

      print('🔍 Starting analysis for: $fileId');

      try {
        await _analyzeFileStream(
          fileId,
          fileDataExtracted,
          fileNameExtracted,
        ).drain();
        await Future.delayed(Duration(milliseconds: 150));
      } catch (e, st) {
        print('❌ Analysis error: $e');
        _logError('ANALYSIS_ERROR', e.toString(), st.toString(), 'api/upload');
        return _errorResponseJson({
          'success': false,
          'error': 'Analysis failed: ${e.toString()}',
        }, 500);
      }

      // ✅ STEP 7: Retrieve and validate analysis
      final analysis = _analyses[fileId];
      if (analysis == null) {
        _logError(
          'ANALYSIS_NOT_FOUND',
          'No result after stream',
          '',
          'api/upload',
        );
        return _errorResponseJson({
          'success': false,
          'error': 'Analysis result not found',
        }, 500);
      }

      if (!analysis.success) {
        return _errorResponseJson({
          'success': false,
          'error': analysis.error ?? 'Unknown analysis error',
        }, 400);
      }

      metrics.recordPhase('COMPLETE', analysis.totalLines);
      metrics.recordSuccess();

      print('✅ Upload complete!');

      // ✅ STEP 8: Return success
      return Response.ok(
        jsonEncode({
          'success': true,
          'fileId': fileId,
          'fileName': fileNameExtracted,
          'size': fileDataExtracted.length,
          'analysis': analysis.toJson(),
          'metrics': metrics.toJson(),
        }),
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'access-control-allow-origin': '*',
        },
      );
    } catch (e, st) {
      print('❌ FATAL: $e\n$st');
      _logError('UPLOAD_FATAL', e.toString(), st.toString(), 'api/upload');

      return Response(
        500,
        body: jsonEncode({'success': false, 'error': 'Internal server error'}),
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }
  }

  /// Helper to send JSON error responses
  Response _errorResponseJson(Map<String, dynamic> json, int statusCode) {
    return Response(
      statusCode,
      body: jsonEncode(json),
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  }

  // ✅ ALSO UPDATE Response error helper
  Response _errorResponse(String message, int statusCode) {
    final response = {
      'success': false,
      'error': message,
      'timestamp': DateTime.now().toIso8601String(),
    };

    if (verbose) {
      print('⚠️ Error response [$statusCode]: $message');
    }

    return Response(
      statusCode,
      body: jsonEncode(response),
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
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

        importsRaw: imports, // Full ImportStmt objects
        variablesRaw: variables, // Full VariableDecl objects
        functionsRaw: functions, // Full FunctionDecl objects
        classesRaw: classes, // Full ClassDecl objects
        exportsRaw: dartFile.exports, // Add exports too!
        issuesRaw: dartFile.analysisIssues, // Add analysis issues!
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
        if (file is File &&
            (file.path.endsWith('.ir') || file.path.endsWith('.json'))) {
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

      // ✅ NEW: Add these routes before the 404 error
      if (path == 'api/upload-json' && method == 'POST') {
        return await _handleJsonUpload(request);
      }

      if (path == 'api/json-files' && method == 'GET') {
        return _handleListJsonFiles();
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

  // ✅ NEW: Add this complete method
  Future<Response> _handleJsonUpload(Request request) async {
    try {
      print('📤 JSON Upload started...');

      final contentType = request.headers['content-type'] ?? '';
      if (!contentType.contains('multipart/form-data')) {
        return _errorResponseJson({
          'success': false,
          'error': 'Invalid content-type. Expected multipart/form-data',
        }, 400);
      }

      final boundaryMatch = RegExp(
        r'boundary=([^\s;]+)',
      ).firstMatch(contentType);
      if (boundaryMatch == null) {
        return _errorResponseJson({
          'success': false,
          'error': 'Missing boundary in multipart request',
        }, 400);
      }

      String boundary = boundaryMatch.group(1)!.replaceAll('"', '');
      const maxRequestSize = 60 * 1024 * 1024; // 60MB for JSON

      final bodyBytes = <int>[];
      await for (final chunk in request.read()) {
        bodyBytes.addAll(chunk);
        if (bodyBytes.length > maxRequestSize) {
          return _errorResponseJson({
            'success': false,
            'error': 'Request body exceeds maximum size (50MB)',
          }, 413);
        }
      }

      if (bodyBytes.isEmpty) {
        return _errorResponseJson({
          'success': false,
          'error': 'Empty request body',
        }, 400);
      }

      final parser = MultipartParser(Uint8List.fromList(bodyBytes), boundary);
      final parseResult = parser.parse();

      if (!parseResult['success']) {
        return _errorResponseJson({
          'success': false,
          'error': parseResult['error'] ?? 'Multipart parsing failed',
        }, 400);
      }

      final fileName = parseResult['filename'] as String?;
      final fileData = parseResult['data'] as Uint8List?;

      if (fileName == null || fileName.isEmpty) {
        return _errorResponseJson({
          'success': false,
          'error': 'No filename found',
        }, 400);
      }

      if (!fileName.toLowerCase().endsWith('.json')) {
        return _errorResponseJson({
          'success': false,
          'error': 'Invalid file type. Only .json files are allowed',
        }, 400);
      }

      if (fileData == null || fileData.isEmpty) {
        return _errorResponseJson({
          'success': false,
          'error': 'No file data found',
        }, 400);
      }

      const maxFileSize = 50 * 1024 * 1024;
      if (fileData.length > maxFileSize) {
        return _errorResponseJson({
          'success': false,
          'error': 'File exceeds maximum size (50MB)',
        }, 413);
      }

      // ✅ Parse and analyze JSON
      final fileId = DateTime.now().millisecondsSinceEpoch.toString();
      _uploadedFiles[fileId] = fileData;

      final metrics = AnalysisMetrics(fileId: fileId);
      _metrics[fileId] = metrics;
      metrics.recordPhase('READ_FILE', fileData.length);

      try {
        final jsonString = utf8.decode(fileData);
        final jsonData = jsonDecode(jsonString);

        _jsonDataCache[fileId] = jsonData;

        final analysis = _analyzeJsonData(fileId, jsonData, fileName);
        _jsonAnalyses[fileId] = analysis;

        metrics.recordPhase('PARSE_JSON', _getJsonItemCount(jsonData));
        metrics.recordSuccess();

        print('✅ JSON Upload complete!');

        return Response.ok(
          jsonEncode({
            'success': true,
            'fileId': fileId,
            'fileName': fileName,
            'size': fileData.length,
            'analysis': analysis.toJson(),
            'metrics': metrics.toJson(),
          }),
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'access-control-allow-origin': '*',
          },
        );
      } catch (e) {
        _logError('JSON_PARSE_ERROR', e.toString(), '', 'api/upload-json');
        return _errorResponseJson({
          'success': false,
          'error': 'Invalid JSON format: ${e.toString()}',
        }, 400);
      }
    } catch (e, st) {
      print('❌ JSON Upload Error: $e\n$st');
      _logError(
        'JSON_UPLOAD_ERROR',
        e.toString(),
        st.toString(),
        'api/upload-json',
      );

      return Response(
        500,
        body: jsonEncode({'success': false, 'error': 'Internal server error'}),
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }
  }

  // ✅ NEW: Analyze JSON structure
  JsonAnalysisResult _analyzeJsonData(
    String fileId,
    dynamic jsonData,
    String fileName,
  ) {
    final result = JsonAnalysisResult(
      fileId: fileId,
      fileName: fileName,
      startTime: DateTime.now(),
    );

    try {
      final stats = _analyzeJsonStructure(jsonData);

      result.setAnalysis(
        topLevelType: jsonData is List ? 'Array' : 'Object',
        itemCount: stats['itemCount'] as int,
        maxDepth: stats['maxDepth'] as int,
        totalSize: jsonEncode(jsonData).length,
        keys: stats['keys'] as List<String>,
        structure: stats['structure'] as Map<String, dynamic>,
      );

      result.success = true;
    } catch (e) {
      result.success = false;
      result.error = e.toString();
    }

    return result;
  }

  // ✅ NEW: Analyze JSON structure recursively
  Map<String, dynamic> _analyzeJsonStructure(
    dynamic data, {
    int depth = 0,
    int maxDepth = 0,
  }) {
    if (depth > maxDepth) maxDepth = depth;

    List<String> keys = [];
    Map<String, dynamic> structure = {};
    int itemCount = 0;

    if (data is Map) {
      keys = data.keys.cast<String>().toList();
      itemCount = data.length;

      data.forEach((key, value) {
        final type = _getJsonType(value);
        structure[key] = {
          'type': type,
          'value': value is Map || value is List ? '...' : value,
        };
      });
    } else if (data is List) {
      itemCount = data.length;
      if (data.isNotEmpty) {
        structure['[0]'] = {
          'type': _getJsonType(data[0]),
          'value': data[0] is Map || data[0] is List ? '...' : data[0],
        };
      }
    }

    return {
      'itemCount': itemCount,
      'maxDepth': maxDepth,
      'keys': keys,
      'structure': structure,
    };
  }

  // ✅ NEW: Get JSON value type
  String _getJsonType(dynamic value) {
    if (value == null) return 'null';
    if (value is bool) return 'boolean';
    if (value is int) return 'integer';
    if (value is double) return 'number';
    if (value is String) return 'string';
    if (value is List) return 'array';
    if (value is Map) return 'object';
    return 'unknown';
  }

  // ✅ NEW: Get total JSON item count
  int _getJsonItemCount(dynamic data) {
    if (data is Map) return data.length;
    if (data is List) return data.length;
    return 1;
  }

  // ✅ NEW: List available JSON files
  Response _handleListJsonFiles() {
    try {
      final jsonFiles = _availableFiles
          .where((f) => f.name.endsWith('.json'))
          .toList();

      return Response.ok(
        jsonEncode({
          'success': true,
          'count': jsonFiles.length,
          'files': jsonFiles
              .map(
                (f) => {
                  'path': f.path,
                  'name': f.name,
                  'size': f.size,
                  'sizeKB': (f.size / 1024).toStringAsFixed(2),
                  'modified': f.modified.toIso8601String(),
                  'cached': _jsonDataCache.containsKey(f.path),
                },
              )
              .toList(),
        }),
        headers: {'content-type': 'application/json'},
      );
    } catch (e) {
      _logError('LIST_JSON_ERROR', e.toString(), '', 'api/json-files');
      return _errorResponse('Failed to list JSON files: $e', 500);
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

  String _getHtmlUI() => HtmlGenerator.generate();
}

Map<String, dynamic> _serializeObject(dynamic obj) {
  if (obj == null) return {};

  // Handle different IR types
  if (obj is ImportStmt) {
    return {
      'type': 'ImportStmt',
      'uri': obj.uri,
      'prefix': obj.prefix,
      'isDeferred': obj.isDeferred,
      'showList': obj.showList,
      'hideList': obj.hideList,
    };
  }

  if (obj is VariableDecl) {
    return {
      //'type': 'VariableDecl',
      'id': obj.id,
      'name': obj.name,
      'type': obj.type.displayName(),
      'isFinal': obj.isFinal,
      'isConst': obj.isConst,
      'isStatic': obj.isStatic,
      'isLate': obj.isLate,
      'hasInitializer': obj.initializer != null,
    };
  }

  if (obj is FunctionDecl) {
    return {
      'type': 'FunctionDecl',
      'id': obj.id,
      'name': obj.name,
      'returnType': obj.returnType.displayName(),
      'parameterCount': obj.parameters.length,
      'parameters': obj.parameters
          .map(
            (p) => {
              'name': p.name,
              'type': p.type.displayName(),
              'isRequired': p.isRequired,
              'isNamed': p.isNamed,
            },
          )
          .toList(),
      'isAsync': obj.isAsync,
      'documentation': obj.documentation,
    };
  }

  if (obj is ClassDecl) {
    return {
      'type': 'ClassDecl',
      'id': obj.id,
      'name': obj.name,
      'isAbstract': obj.isAbstract,
      'isFinal': obj.isFinal,
      'methodCount': obj.methods.length,
      'fieldCount': obj.fields.length,
      'constructorCount': obj.constructors.length,
      'methods': obj.methods
          .map(
            (m) => {
              'name': m.name,
              'returnType': m.returnType.displayName(),
              'parameters': m.parameters.length,
            },
          )
          .toList(),
      'fields': obj.fields
          .map(
            (f) => {
              'name': f.name,
              'type': f.type.displayName(),
              'isFinal': f.isFinal,
            },
          )
          .toList(),
    };
  }

  if (obj is ExportStmt) {
    return {
      'type': 'ExportStmt',
      'uri': obj.uri,
      'showList': obj.showList,
      'hideList': obj.hideList,
    };
  }

  if (obj is AnalysisIssue) {
    return {
      'type': 'AnalysisIssue',
      'code': obj.code,
      'message': obj.message,
      'severity': obj.severity.toString(),
      'category': obj.category.toString(),
      'suggestion': obj.suggestion,
    };
  }

  // Fallback: try to JSON encode
  try {
    return {'raw': obj.toString()};
  } catch (e) {
    return {'error': 'Could not serialize: ${e.toString()}'};
  }
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
    List<dynamic>? importsRaw,
    List<dynamic>? variablesRaw,
    List<dynamic>? functionsRaw,
    List<dynamic>? classesRaw,
    List<dynamic>? exportsRaw,
    List<dynamic>? issuesRaw,
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

      // ✅ ADD: Raw converted data for verification
      'rawData': {
        'imports': importsRaw?.map(_serializeObject).toList() ?? [],
        'variables': variablesRaw?.map(_serializeObject).toList() ?? [],
        'functions': functionsRaw?.map(_serializeObject).toList() ?? [],
        'classes': classesRaw?.map(_serializeObject).toList() ?? [],
        'exports': exportsRaw?.map(_serializeObject).toList() ?? [],
        'issues': issuesRaw?.map(_serializeObject).toList() ?? [],
      },
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

// ============================================================================
// ROBUST MULTIPART PARSER - Handles edge cases
// ============================================================================

class MultipartParser {
  final Uint8List data;
  final String boundary;

  MultipartParser(this.data, this.boundary);

  /// Parse multipart data with comprehensive error handling
  Map<String, dynamic> parse() {
    try {
      // Convert to bytes for binary-safe parsing
      final boundaryBytes = utf8.encode('--$boundary');
      final crlfBytes = utf8.encode('\r\n');
      final doubleCrlfBytes = utf8.encode('\r\n\r\n');

      // ✅ Find all boundary positions (robust to different line endings)
      final boundaries = _findBoundaries(boundaryBytes);
      if (boundaries.isEmpty) {
        return {'success': false, 'error': 'No boundaries found in data'};
      }

      // ✅ Process each part
      for (int i = 0; i < boundaries.length - 1; i++) {
        final partStart = boundaries[i] + boundaryBytes.length;
        final partEnd = boundaries[i + 1];

        final part = data.sublist(partStart, partEnd);
        final partString = _decodePartSafely(part);

        if (!partString.contains('filename=')) {
          continue;
        }

        // ✅ Extract filename safely
        final filename = _extractFilename(partString);
        if (filename == null || filename.isEmpty) {
          continue;
        }

        // ✅ Extract file content (handle binary data)
        final content = _extractFileContent(part, doubleCrlfBytes, crlfBytes);
        if (content != null && content.isNotEmpty) {
          return {'success': true, 'filename': filename, 'data': content};
        }
      }

      return {
        'success': false,
        'error': 'No file part found in multipart data',
      };
    } catch (e, st) {
      print('Parse error: $e\n$st');
      return {'success': false, 'error': 'Parsing error: ${e.toString()}'};
    }
  }

  /// Find all boundary positions in binary data
  List<int> _findBoundaries(Uint8List boundaryBytes) {
    final positions = <int>[];
    for (int i = 0; i <= data.length - boundaryBytes.length; i++) {
      bool match = true;
      for (int j = 0; j < boundaryBytes.length; j++) {
        if (data[i + j] != boundaryBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        positions.add(i);
      }
    }
    return positions;
  }

  /// Safely decode part, falling back to latin1 if UTF-8 fails
  String _decodePartSafely(Uint8List part) {
    try {
      return utf8.decode(part);
    } catch (e) {
      // Fallback: use latin1 for binary-heavy content
      try {
        return latin1.decode(part);
      } catch (e2) {
        // Last resort: lossy conversion
        return String.fromCharCodes(part);
      }
    }
  }

  /// Extract filename from Content-Disposition header
  String? _extractFilename(String partString) {
    // Handle both: filename="name.ir" and filename=name.ir
    final patterns = [
      RegExp(r'filename="([^"]+)"'),
      RegExp(r"filename='([^']+)'"),
      RegExp(r'filename=([^\s;]+)'),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(partString);
      if (match != null && match.group(1) != null) {
        var filename = match.group(1)!;
        // Sanitize filename
        filename = filename.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '');
        return filename.isNotEmpty ? filename : null;
      }
    }

    return null;
  }

  /// Extract actual file content (binary-safe)
  Uint8List? _extractFileContent(
    Uint8List part,
    Uint8List doubleCrlfBytes,
    Uint8List crlfBytes,
  ) {
    // Find the double CRLF that separates headers from content
    int headerEnd = -1;
    for (int i = 0; i <= part.length - doubleCrlfBytes.length; i++) {
      bool match = true;
      for (int j = 0; j < doubleCrlfBytes.length; j++) {
        if (part[i + j] != doubleCrlfBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        headerEnd = i;
        break;
      }
    }

    if (headerEnd == -1) {
      return null; // No header/content separator found
    }

    final contentStart = headerEnd + doubleCrlfBytes.length;

    // Find trailing CRLF (end of content before next boundary)
    int contentEnd = part.length;
    for (int i = part.length - crlfBytes.length; i >= contentStart; i--) {
      bool match = true;
      for (int j = 0; j < crlfBytes.length; j++) {
        if (part[i + j] != crlfBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        contentEnd = i;
        break;
      }
    }

    if (contentStart >= contentEnd) {
      return null;
    }

    return part.sublist(contentStart, contentEnd);
  }
}

// ✅ NEW: JSON Analysis Result
class JsonAnalysisResult {
  final String fileId;
  final String fileName;
  final DateTime startTime;
  bool success = false;
  String? error;

  String? topLevelType;
  int? itemCount;
  int? maxDepth;
  int? totalSize;
  List<String>? keys;
  Map<String, dynamic>? structure;

  JsonAnalysisResult({
    required this.fileId,
    required this.fileName,
    required this.startTime,
  });

  void setAnalysis({
    required String topLevelType,
    required int itemCount,
    required int maxDepth,
    required int totalSize,
    required List<String> keys,
    required Map<String, dynamic> structure,
  }) {
    this.topLevelType = topLevelType;
    this.itemCount = itemCount;
    this.maxDepth = maxDepth;
    this.totalSize = totalSize;
    this.keys = keys;
    this.structure = structure;
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'error': error,
      'fileId': fileId,
      'fileName': fileName,
      'topLevelType': topLevelType,
      'itemCount': itemCount,
      'maxDepth': maxDepth,
      'totalSize': totalSize,
      'keys': keys,
      'structure': structure,
      'duration': DateTime.now().difference(startTime).inMilliseconds,
    };
  }
}
