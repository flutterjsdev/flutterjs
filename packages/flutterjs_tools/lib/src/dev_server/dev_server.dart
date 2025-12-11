import 'dart:io';
import 'dart:convert';
import 'dart:async';
import 'package:path/path.dart' as path;
import 'package:mime/mime.dart' as mime;
import 'package:watcher/watcher.dart';

/// ============================================================================
/// DevServer – Flutter.js Development Server
/// ============================================================================
///
/// A fully-featured local development server designed for **Flutter.js**
/// projects.
///
/// It serves your generated web build output **(SPA or MPA)**, provides
/// **hot reload via WebSockets**, watches file changes, supports interactive
/// CLI commands, and acts as a foundation for advanced tooling.
///
///
/// # Features
///
/// ### ✔ Static File Server
/// Serves HTML, CSS, JS, images, fonts, and runtime files from the build
/// directory (`build/web` or custom path).
///
/// ### ✔ SPA + MPA Support
/// - SPA fallback: unknown routes → `index.html`
/// - MPA routing: resolves HTML files inside `/pages`, nested directories, and
///   page-specific entry points
///
/// ### ✔ Hot Reload (WebSocket-powered)
/// Automatically refreshes connected browsers when files change.
///
/// Reload strategies include:
/// - `css`: live CSS swapping (no full reload)
/// - `component`: stateless component hot-swap
/// - `page`: reload only if page HTML changes
/// - `full`: full browser refresh (JS/HTML)
///
/// WebSocket endpoint:
/// ```
/// ws://localhost:<port>/__hot_reload
/// ```
///
/// ### ✔ Interactive CLI Controls
/// The server listens to single-key commands in the terminal:
///
/// | Key | Action                            |
/// |-----|-----------------------------------|
/// | `h` | Trigger manual hot reload         |
/// | `r` | Restart server without exiting    |
/// | `q` | Quit the server cleanly           |
///
/// ### ✔ File Watching
/// Uses `watcher` package to detect changes to:
///
/// - HTML, CSS, JS
/// - `/pages`, `/components`, `/models`, `/services`
/// - `/assets`, `/images`, `/styles`, `/runtime`
///
/// Automatically dispatches a reload message to all connected WebSocket clients.
///
///
/// ### ✔ Extensible API Endpoints
/// Built-in example APIs:
/// - `/api/health`
/// - `/api/build-info`
///
/// Developers can extend `_handleApiRequest()` for custom endpoints.
///
///
/// # Usage
///
/// ```dart
/// final server = DevServer(
///   buildDir: 'build/web',
///   port: 8080,
///   host: 'localhost',
///   hotReload: true,
///   verbose: true,
/// );
///
/// await server.initialize();
/// ```
///
/// Once running, you will see:
///
/// ```
/// h → hot reload
/// r → restart server
/// q → quit
/// ```
///
///
/// # Lifecycle
///
/// ## `initialize()`
/// Binds the HTTP server, optionally sets up hot reload, starts file watchers,
/// and begins handling requests.
///
/// ## `stop()`
/// Closes WebSockets, file watchers, stdin listeners, and HTTP server.
///
/// The server auto-handles `SIGINT` (Ctrl+C) for graceful shutdown.
///
///
/// # Architecture Overview
///
/// - **HTTP Server** → Serves static assets and API routes
/// - **WebSocket Server** → Pushes hot reload notifications
/// - **File System Watchers** → Detect file changes
/// - **CLI Listener** → Interactive commands during development
///
///
/// # Notes
///
/// - CLI input is captured using raw mode (`stdin.echoMode = false`), so only
///   single-key commands are processed.
/// - WebSocket connections are tracked in `_wsClients`.
/// - HTML responses automatically get an injected `<script>` enabling live
///   reload in the browser.
/// - MPA routing is smart: checks `/pages/route.html`, `/route.html`,
///   `/pages/route/index.html`.
///
///
/// This class powers the Flutter.js development workflow, enabling a smooth,
/// framework-like DX similar to Vite, Next.js, and Flutter’s own hot reload.
///

/// Main Dev Server for Flutter.js
class DevServer {
  late HttpServer _server;
  final String _buildDir;
  final int _port;
  final String _host;
  final bool _hotReload;
  final bool _verbose;

  // WebSocket clients for hot reload
  final Set<WebSocket> _wsClients = {};

  // File watchers
  final List<StreamSubscription> _watchers = [];

  // CLI input subscription (only created once)
  StreamSubscription? _stdinSubscription;

  // Flag to track if CLI listener is already setup
  static bool _cliListenerSetup = false;

  DevServer({
    required String buildDir,
    required int port,
    required String host,
    required bool hotReload,
    required bool verbose,
  }) : _buildDir = buildDir,
       _port = port,
       _host = host,
       _hotReload = hotReload,
       _verbose = verbose;

  /// Initialize and start the server
  Future<void> initialize() async {
    try {
      _server = await HttpServer.bind(_host, _port);
      _log('🚀 Dev Server started at http://$_host:$_port');
      _log('📁 Serving files from: $_buildDir');

      if (_hotReload) {
        _setupFileWatchers();
        _log('🔥 Hot reload enabled');
      }

      _log('');
      _log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      _log('💡 Commands:');
      _log('   h  - Manual hot reload (refresh all clients)');
      _log('   r  - Restart server (reload from index.html)');
      _log('   q  - Quit server');
      _log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      _log('');

      // Start CLI input listener
      _setupCliListener();

      await _handleRequests();
    } catch (e) {
      _log('❌ Failed to start server: $e', isError: true);
      rethrow;
    }
  }

  /// Setup CLI input listener for interactive commands
  void _setupCliListener() {
    // Only setup once per process
    if (_cliListenerSetup) {
      _log('⚠️  CLI listener already active');
      return;
    }

    stdin.echoMode = false;
    stdin.lineMode = false;

    _stdinSubscription = stdin.listen((List<int> data) {
      final input = String.fromCharCodes(data).trim().toLowerCase();

      switch (input) {
        case 'h':
          _handleManualReload();
          break;
        case 'r':
          _handleServerRestart();
          break;
        case 'q':
          _handleQuit();
          break;
        default:
          // Ignore other inputs
          break;
      }
    });

    _cliListenerSetup = true;
  }

  /// Handle manual reload command (r)
  void _handleManualReload() {
    _log('');
    _log('🔄 Manual reload triggered...');

    if (_wsClients.isEmpty) {
      _log('⚠️  No clients connected', isError: true);
      return;
    }

    // Send reload command to all connected clients
    _notifyClients({
      'type': 'reload',
      'path': 'manual',
      'strategy': 'full',
      'reason': 'manual_trigger',
      'timestamp': DateTime.now().toIso8601String(),
    });

    _log('✅ Reload command sent to ${_wsClients.length} client(s)');
    _log('');
  }

  /// Handle server restart command (R)
  Future<void> _handleServerRestart() async {
    _log('');
    _log('🔄 Server restart initiated...');

    // Notify clients about restart
    _notifyClients({
      'type': 'restart',
      'message': 'Server is restarting...',
      'timestamp': DateTime.now().toIso8601String(),
    });

    _log('📡 Notified clients about restart');

    // Small delay to ensure message is sent
    await Future.delayed(Duration(milliseconds: 100));

    // Close all connections
    for (final client in _wsClients) {
      await client.close(1012, 'Server restarting');
    }
    _wsClients.clear();

    // Cancel file watchers
    for (final watcher in _watchers) {
      await watcher.cancel();
    }
    _watchers.clear();

    // Close the server (but DON'T cancel stdin listener)
    await _server.close();

    _log('✅ Server stopped');
    _log('🚀 Restarting server...');
    _log('');

    // Restart the server (CLI listener stays active)
    _server = await HttpServer.bind(_host, _port);
    _log('🚀 Dev Server restarted at http://$_host:$_port');
    _log('📁 Serving files from: $_buildDir');

    if (_hotReload) {
      _setupFileWatchers();
      _log('🔥 Hot reload re-enabled');
    }

    _log('');

    // Continue handling requests (don't call initialize() again)
    _handleRequests();
  }

  /// Handle quit command (q)
  void _handleQuit() {
    _log('');
    _log('👋 Shutting down server...');
    stop().then((_) => exit(0));
  }

  /// Main request handler
  Future<void> _handleRequests() async {
    await for (HttpRequest request in _server) {
      _handleRequest(request);
    }
  }

  /// Route and handle individual requests
  Future<void> _handleRequest(HttpRequest request) async {
    final uri = request.uri;
    _log('📥 ${request.method} ${uri.path}');

    try {
      // Handle WebSocket upgrade for hot reload
      if (_hotReload && uri.path == '/__hot_reload') {
        await _handleWebSocket(request);
        return;
      }

      // Handle API routes (if needed)
      if (uri.path.startsWith('/api/')) {
        await _handleApiRequest(request);
        return;
      }

      // Handle static files
      await _handleStaticFile(request);
    } catch (e) {
      _log('❌ Error handling request: $e', isError: true);
      _sendError(request, 500, 'Internal Server Error');
    }
  }

  /// Serve static files (HTML, CSS, JS, images, etc.)
  /// Handles both SPA and MPA architectures
  Future<void> _handleStaticFile(HttpRequest request) async {
    var requestPath = request.uri.path;

    // Default to index.html for root
    if (requestPath == '/') {
      requestPath = '/index.html';
    }

    // Remove leading slash for file path construction
    final relativePath = requestPath.substring(1);
    final filePath = path.join(_buildDir, relativePath);
    final file = File(filePath);

    // Direct file exists - serve it
    if (await file.exists()) {
      await _serveFile(request, file);
      return;
    }

    // Check if it's a directory with index.html
    final dir = Directory(filePath);
    if (await dir.exists()) {
      final indexFile = File(path.join(filePath, 'index.html'));
      if (await indexFile.exists()) {
        await _serveFile(request, indexFile);
        return;
      }
    }

    // MPA Support: Check for page-specific HTML files
    // Pattern: /route-name -> /pages/route-name.html or /route-name.html
    if (!requestPath.contains('.')) {
      final mpaRoutes = [
        // Try /pages/{route}.html (Flutter.js Phase 1.5 structure)
        path.join(_buildDir, 'pages', '$relativePath.html'),
        // Try /{route}.html (flat structure)
        path.join(_buildDir, '$relativePath.html'),
        // Try /pages/{route}/index.html (nested structure)
        path.join(_buildDir, 'pages', relativePath, 'index.html'),
      ];

      for (final routePath in mpaRoutes) {
        final routeFile = File(routePath);
        if (await routeFile.exists()) {
          _log(
            '📄 MPA Route: $requestPath -> ${path.relative(routePath, from: _buildDir)}',
          );
          await _serveFile(request, routeFile);
          return;
        }
      }
    }

    // SPA fallback - serve index.html for client-side routing
    // Only if file doesn't have an extension (not requesting a resource)
    if (!requestPath.contains('.')) {
      final indexPath = path.join(_buildDir, 'index.html');
      final indexFile = File(indexPath);
      if (await indexFile.exists()) {
        _log('📄 SPA Fallback: $requestPath -> index.html');
        await _serveFile(request, indexFile);
        return;
      }
    }

    _sendError(request, 404, 'File not found: $requestPath');
  }

  /// Serve a file with proper MIME type and caching headers
  Future<void> _serveFile(HttpRequest request, File file) async {
    try {
      final content = await file.readAsBytes();
      final mimeType =
          mime.lookupMimeType(file.path) ?? 'application/octet-stream';

      request.response
        ..statusCode = HttpStatus.ok
        ..headers.contentType = ContentType.parse(mimeType)
        ..headers.add('Cache-Control', 'no-cache')
        ..headers.add('Access-Control-Allow-Origin', '*');

      // Inject hot reload script if it's an HTML file
      if (_hotReload && mimeType == 'text/html') {
        final html = utf8.decode(content);
        final injected = _injectHotReloadScript(html);
        request.response.write(injected);
      } else {
        request.response.add(content);
      }

      await request.response.close();
      _log('✅ Served: ${file.path} ($mimeType)');
    } catch (e) {
      _log('❌ Error serving file: $e', isError: true);
      _sendError(request, 500, 'Error reading file');
    }
  }

  /// Handle API requests (extensible for future features)
  Future<void> _handleApiRequest(HttpRequest request) async {
    final path = request.uri.path;

    // Example API endpoints
    if (path == '/api/health') {
      _sendJson(request, {
        'status': 'ok',
        'timestamp': DateTime.now().toIso8601String(),
      });
      return;
    }

    if (path == '/api/build-info') {
      _sendJson(request, {
        'buildDir': _buildDir,
        'hotReload': _hotReload,
        'clients': _wsClients.length,
      });
      return;
    }

    _sendError(request, 404, 'API endpoint not found');
  }

  /// Handle WebSocket connections for hot reload
  Future<void> _handleWebSocket(HttpRequest request) async {
    try {
      final socket = await WebSocketTransformer.upgrade(request);
      _wsClients.add(socket);
      _log('🔌 WebSocket client connected (${_wsClients.length} total)');

      socket.listen(
        (data) {
          _log('📨 WebSocket message: $data');
        },
        onDone: () {
          _wsClients.remove(socket);
          _log(
            '🔌 WebSocket client disconnected (${_wsClients.length} remaining)',
          );
        },
        onError: (e) {
          _wsClients.remove(socket);
          _log('❌ WebSocket error: $e', isError: true);
        },
      );

      // Send initial connection message
      socket.add(
        json.encode({'type': 'connected', 'message': 'Hot reload ready'}),
      );
    } catch (e) {
      _log('❌ WebSocket upgrade failed: $e', isError: true);
    }
  }

  /// Setup file watchers for hot reload
  /// Supports both SPA and MPA architectures
  void _setupFileWatchers() {
    final dir = Directory(_buildDir);

    if (!dir.existsSync()) {
      _log('⚠️ Build directory does not exist: $_buildDir', isError: true);
      return;
    }

    // Watch root HTML files (SPA: index.html, MPA: multiple pages)
    _watchFiles('*.html');

    // Watch CSS files
    _watchFiles('*.css');

    // Watch JS files
    _watchFiles('*.js');

    // Watch MPA-specific directories (Phase 1.5 structure)
    _watchDirectory('pages'); // MPA pages
    _watchDirectory('components'); // Shared components
    _watchDirectory('models'); // Non-UI classes
    _watchDirectory('services'); // Business logic

    // Watch asset directories
    _watchDirectory('assets');
    _watchDirectory('images');
    _watchDirectory('styles');
    _watchDirectory('scripts');
    _watchDirectory('runtime'); // Flutter.js runtime
  }

  /// Watch specific file patterns
  void _watchFiles(String pattern) {
    final dir = Directory(_buildDir);

    dir.list(recursive: true).listen((entity) {
      if (entity is File && _matchesPattern(entity.path, pattern)) {
        final watcher = FileWatcher(entity.path);
        final subscription = watcher.events.listen((event) {
          _onFileChanged(event);
        });
        _watchers.add(subscription);
      }
    });
  }

  /// Watch entire directory
  void _watchDirectory(String dirName) {
    final dir = Directory(path.join(_buildDir, dirName));

    if (!dir.existsSync()) return;

    final watcher = DirectoryWatcher(dir.path);
    final subscription = watcher.events.listen((event) {
      _onFileChanged(event);
    });
    _watchers.add(subscription);
  }

  /// Handle file change events
  /// Smart reload based on file type and location
  void _onFileChanged(WatchEvent event) {
    final relativePath = path.relative(event.path, from: _buildDir);
    _log('🔄 File changed: $relativePath (${event.type})');

    // Determine reload strategy based on file location and type
    String reloadStrategy = 'full';

    if (relativePath.endsWith('.css')) {
      reloadStrategy = 'css';
    } else if (relativePath.startsWith(
      'components${Platform.pathSeparator}stateless',
    )) {
      // Pure stateless components - can be hot-swapped
      reloadStrategy = 'component';
    } else if (relativePath.startsWith('pages${Platform.pathSeparator}')) {
      // MPA page changed - reload that specific page
      reloadStrategy = 'page';
    }

    // Notify all connected clients
    _notifyClients({
      'type': 'reload',
      'path': relativePath,
      'changeType': event.type.toString(),
      'strategy': reloadStrategy,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  /// Notify WebSocket clients
  void _notifyClients(Map<String, dynamic> message) {
    final payload = json.encode(message);
    final deadClients = <WebSocket>[];

    for (final client in _wsClients) {
      try {
        client.add(payload);
      } catch (e) {
        _log('❌ Failed to send to client: $e', isError: true);
        deadClients.add(client);
      }
    }

    // Remove dead clients
    _wsClients.removeAll(deadClients);
  }

  /// Inject hot reload script into HTML
  String _injectHotReloadScript(String html) {
    final script =
        '''
<script>
(function() {
  const ws = new WebSocket('ws://${_host}:${_port}/__hot_reload');
  
  ws.onopen = () => {
    console.log('[Hot Reload] Connected');
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('[Hot Reload]', data);
    
    if (data.type === 'reload') {
      // CSS hot reload (without full page refresh)
      if (data.path.endsWith('.css')) {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(link => {
          const href = link.getAttribute('href').split('?')[0];
          link.setAttribute('href', href + '?t=' + Date.now());
        });
      } else {
        // Full page reload for HTML/JS changes
        location.reload();
      }
    }
  };
  
  ws.onerror = (error) => {
    console.error('[Hot Reload] Error:', error);
  };
  
  ws.onclose = () => {
    console.log('[Hot Reload] Disconnected. Retrying...');
    setTimeout(() => location.reload(), 1000);
  };
})();
</script>
''';

    // Inject before closing body tag
    if (html.contains('</body>')) {
      return html.replaceFirst('</body>', '$script</body>');
    }

    // Fallback: append to end
    return html + script;
  }

  /// Send JSON response
  void _sendJson(HttpRequest request, Map<String, dynamic> data) {
    request.response
      ..statusCode = HttpStatus.ok
      ..headers.contentType = ContentType.json
      ..write(json.encode(data))
      ..close();
  }

  /// Send error response
  void _sendError(HttpRequest request, int statusCode, String message) {
    request.response
      ..statusCode = statusCode
      ..headers.contentType = ContentType.html
      ..write(_errorPage(statusCode, message))
      ..close();
  }

  /// Generate error page
  String _errorPage(int code, String message) {
    return '''
<!DOCTYPE html>
<html>
<head>
  <title>Error $code</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .error {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #e53e3e; margin: 0 0 1rem; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Error $code</h1>
    <p>$message</p>
  </div>
</body>
</html>
''';
  }

  /// Match file pattern
  bool _matchesPattern(String filePath, String pattern) {
    final ext = pattern.replaceFirst('*.', '');
    return filePath.endsWith('.$ext');
  }

  /// Log messages
  void _log(String message, {bool isError = false}) {
    if (_verbose || isError) {
      final timestamp = DateTime.now().toIso8601String().substring(11, 19);
      print('[$timestamp] $message');
    }
  }

  /// Stop the server and cleanup
  Future<void> stop() async {
    _log('🛑 Stopping dev server...');

    // Close all WebSocket connections
    for (final client in _wsClients) {
      await client.close();
    }
    _wsClients.clear();

    // Cancel file watchers
    for (final watcher in _watchers) {
      await watcher.cancel();
    }
    _watchers.clear();

    // Cancel stdin subscription
    await _stdinSubscription?.cancel();

    // Close the server
    await _server.close();
    _log('✅ Dev server stopped');
  }
}

/// CLI entry point
Future<void> main(List<String> args) async {
  final server = DevServer(
    buildDir: 'build/web',
    port: 8080,
    host: 'localhost',
    hotReload: true,
    verbose: true,
  );

  try {
    await server.initialize();

    // Handle graceful shutdown
    ProcessSignal.sigint.watch().listen((_) async {
      await server.stop();
      exit(0);
    });
  } catch (e) {
    print('Failed to start server: $e');
    exit(1);
  }
}
