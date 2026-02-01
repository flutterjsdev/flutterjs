// ============================================================================
// FlutterJS Engine Bridge - Dart CLI <-> JS Engine Communication
// ============================================================================
//
// This module provides the bridge between the Dart CLI and the FlutterJS
// JavaScript engine (flutterjs.exe / flutter-js-linux / flutter-js-macos).
//
// Architecture:
//   Dart CLI runs: dart run flutterjs.dart run --to-js --serve
//       |
//       v  Generates .fjs files to build/flutterjs/src/
//   EngineBridgeManager.initProject()
//       |
//       v  Creates: flutterjs.config.js, package.json, public/index.html
//   EngineBridgeManager.startAfterBuild()
//       |
//       v  Spawns: flutterjs.exe dev (from build/flutterjs/)
//   Browser opens at http://localhost:3000
//
// Project Structure (auto-generated in build/flutterjs/):
//   build/flutterjs/
//     ├── flutterjs.config.js  <- Auto-generated config (entry: src/main.fjs)
//     ├── package.json         <- Auto-generated manifest
//     ├── src/                 <- Generated .fjs files
//     │   └── main.fjs
//     └── public/
//         └── index.html       <- Auto-generated HTML
//
// Future Evolution:
//   - Option B: WebSocket bridge for real-time hot reload
//   - Option C: Integrated IPC via stdin/stdout JSON-RPC
//
// ============================================================================

import 'dart:async';
import 'dart:io';
import 'package:path/path.dart' as path;
import 'package:pubjs/pubjs.dart'; // For RuntimePackageManager

/// Configuration for the JS Engine Bridge
class EngineBridgeConfig {
  /// Port for the dev server
  final int port;

  /// Whether to open browser automatically
  final bool openBrowser;

  /// Whether to enable hot module replacement
  final bool enableHMR;

  /// Whether to run in verbose mode
  final bool verbose;

  /// Build mode (dev or production)
  final String mode;

  /// Output directory containing .fjs files
  final String outputPath;

  /// Project root directory
  final String projectPath;

  const EngineBridgeConfig({
    this.port = 3000,
    this.openBrowser = true,
    this.enableHMR = true,
    this.verbose = false,
    this.mode = 'dev',
    required this.outputPath,
    required this.projectPath,
  });
}

/// Result of starting the JS engine
class EngineBridgeResult {
  final bool success;
  final int? port;
  final String? url;
  final String? errorMessage;
  final Process? process;

  const EngineBridgeResult({
    required this.success,
    this.port,
    this.url,
    this.errorMessage,
    this.process,
  });

  factory EngineBridgeResult.success({
    required int port,
    required Process process,
  }) {
    return EngineBridgeResult(
      success: true,
      port: port,
      url: 'http://localhost:$port',
      process: process,
    );
  }

  factory EngineBridgeResult.failure(String message) {
    return EngineBridgeResult(success: false, errorMessage: message);
  }
}

/// Bridge between Dart CLI and FlutterJS JavaScript Engine
///
/// This class manages the lifecycle of the JS engine process:
/// - Locates the appropriate engine binary for the platform
/// - Spawns the dev server process
/// - Handles process cleanup on exit
///
/// Usage:
/// ```dart
/// final bridge = FlutterJSEngineBridge(config);
/// final result = await bridge.startDevServer();
/// if (result.success) {
///   print('Server running at ${result.url}');
/// }
/// // ... later
/// await bridge.stop();
/// ```
class FlutterJSEngineBridge {
  final EngineBridgeConfig config;
  Process? _engineProcess;
  bool _isRunning = false;

  /// Stream controller for engine output
  final StreamController<String> _outputController =
      StreamController<String>.broadcast();

  /// Stream of output from the JS engine
  Stream<String> get output => _outputController.stream;

  FlutterJSEngineBridge(this.config);

  /// Get the path to the engine binary for the current platform
  /// Prefers Node.js source (bin/index.js) over bundled executable
  String? _getEnginePath() {
    // 1. Check FLUTTERJS_ENGINE_ROOT environment variable
    final envEngineRoot = Platform.environment['FLUTTERJS_ENGINE_ROOT'];
    if (envEngineRoot != null) {
      // Check for source
      final envSource = path.join(envEngineRoot, 'bin', 'index.js');
      if (File(envSource).existsSync() && _isNodeAvailable()) {
        if (config.verbose) print('  ✓ Using engine from env: $envSource');
        return path.normalize(envSource);
      }
      // Check for binary
      final binaryName = _getPlatformBinaryName();
      final envBinary = path.join(envEngineRoot, 'dist', binaryName);
      if (File(envBinary).existsSync()) {
        if (config.verbose)
          print('  ✓ Using engine binary from env: $envBinary');
        return path.normalize(envBinary);
      }
    }

    // 2. Check relative to script location (if running from source/dev)
    try {
      final scriptPath = Platform.script.toFilePath();
      if (config.verbose) print('  Script path: $scriptPath');

      Directory current = File(scriptPath).parent;
      for (int i = 0; i < 6; i++) {
        // Check if we are in 'bin' parallel to 'packages'
        final candidate = path.join(
          current.path,
          'packages',
          'flutterjs_engine',
          'bin',
          'index.js',
        );
        if (File(candidate).existsSync() && _isNodeAvailable()) {
          if (config.verbose)
            print(
              '  ✓ Found engine relative to script (packages sibling): $candidate',
            );
          return path.normalize(candidate);
        }

        // Check if we are inside 'packages' directory
        if (path.basename(current.path) == 'packages') {
          final engineSource = path.join(
            current.path,
            'flutterjs_engine',
            'bin',
            'index.js',
          );
          if (File(engineSource).existsSync() && _isNodeAvailable()) {
            return path.normalize(engineSource);
          }
        }

        if (current.parent.path == current.path) break;
        current = current.parent;
      }
    } catch (e) {
      if (config.verbose) print('  Error checking script location: $e');
    }

    // 3. Search upwards from project root for 'packages' directory
    try {
      Directory current = Directory(config.projectPath);
      for (int i = 0; i < 8; i++) {
        // Search up to 8 levels
        final candidatePkg = path.join(
          current.path,
          'packages',
          'flutterjs_engine',
        );
        final candidateSource = path.join(candidatePkg, 'bin', 'index.js');

        if (config.verbose) {
          // print('  Checking up-tree: $candidateSource');
        }

        if (File(candidateSource).existsSync() && _isNodeAvailable()) {
          if (config.verbose)
            print(
              '  ✓ Found engine by searching up from project: $candidateSource',
            );
          return path.normalize(candidateSource);
        }

        if (current.parent.path == current.path) break;
        current = current.parent;
      }
    } catch (e) {
      if (config.verbose) print('  Error searching up from project: $e');
    }

    // 4. Fallback: Try bundled binaries (relative)
    final nullablePaths = <String?>[
      path.join(
        config.projectPath,
        '..',
        '..',
        'packages',
        'flutterjs_engine',
        'dist',
      ),
      // Installed globally (future)
      _getGlobalInstallPath(),
      // In PATH (if installed globally)
      _getFromPath(),
    ];
    final possiblePaths = nullablePaths.whereType<String>().toList();

    final binaryName = _getPlatformBinaryName();

    for (final basePath in possiblePaths) {
      final fullPath = path.join(basePath, binaryName);
      final normalizedPath = path.normalize(fullPath);

      if (config.verbose) {
        print('  Checking bundled binary: $normalizedPath');
      }

      if (File(normalizedPath).existsSync()) {
        return normalizedPath;
      }
    }

    return null;
  }

  /// Check if Node.js is available in the system
  bool _isNodeAvailable() {
    try {
      final result = Process.runSync('node', ['--version']);
      return result.exitCode == 0;
    } catch (e) {
      return false;
    }
  }

  /// Get the binary name for the current platform
  String _getPlatformBinaryName() {
    if (Platform.isWindows) {
      return 'flutterjs-win.exe';
    } else if (Platform.isMacOS) {
      return 'flutterjs-macos';
    } else if (Platform.isLinux) {
      return 'flutterjs-linux';
    } else {
      throw UnsupportedError(
        'Unsupported platform: ${Platform.operatingSystem}',
      );
    }
  }

  /// Get global install path (for future npm global install)
  String? _getGlobalInstallPath() {
    // TODO: Implement when we have npm global install
    return null;
  }

  /// Check if engine is available in PATH
  String? _getFromPath() {
    // TODO: Implement PATH lookup
    return null;
  }

  /// Start the development server
  Future<EngineBridgeResult> startDevServer() async {
    if (_isRunning) {
      return EngineBridgeResult.failure('Engine is already running');
    }

    final enginePath = _getEnginePath();

    if (enginePath == null) {
      return EngineBridgeResult.failure(
        'FlutterJS engine not found.\n'
        'Searched locations included:\n'
        '  - packages/flutterjs_engine/dist/ (relative)\n'
        '  - Environment variable FLUTTERJS_ENGINE_ROOT\n'
        '\nMake sure the engine binaries are built or you are in the correct directory:\n'
        '  cd packages/flutterjs_engine\n'
        '  npm run build:windows  (or build:linux / build:macos)',
      );
    }

    if (config.verbose) {
      print('\n🔧 Starting FlutterJS Engine...');
      print('   Binary: $enginePath');
      print('   Project: ${config.projectPath}');
      print('   Output: ${config.outputPath}');
      print('   Port: ${config.port}');
    }

    try {
      // Build command arguments
      final args = <String>['dev', '--port', config.port.toString()];

      if (config.openBrowser) {
        args.add('--open');
      }

      if (!config.enableHMR) {
        args.add('--no-hmr');
      }

      if (config.verbose) {
        args.add('--verbose');
      }

      // Determine if we're running Node.js source or bundled executable
      final isJsSource = enginePath.endsWith('.js');
      final String executable;
      final List<String> processArgs;

      if (isJsSource) {
        // Run with Node.js
        executable = 'node';
        processArgs = [enginePath, ...args];
        if (config.verbose) {
          print('   Mode: Node.js (ES modules)');
        }
      } else {
        // Run bundled executable directly
        executable = enginePath;
        processArgs = args;
        if (config.verbose) {
          print('   Mode: Bundled executable');
        }
      }

      // Start the process
      _engineProcess = await Process.start(
        executable,
        processArgs,
        workingDirectory: config.projectPath,
        mode: ProcessStartMode.normal,
      );

      _isRunning = true;
      final readyCompleter = Completer<void>();

      // Listen to stdout
      _engineProcess!.stdout
          .transform(const SystemEncoding().decoder)
          .listen(
            (data) {
              _outputController.add(data);
              if (config.verbose) {
                stdout.write(data);
              }
              if (!readyCompleter.isCompleted &&
                  (data.contains('Development server running!') ||
                      data.contains('Failed to start dev server'))) {
                readyCompleter.complete();
              }
            },
            onError: (error) {
              _outputController.addError(error);
            },
          );

      // Listen to stderr
      _engineProcess!.stderr.transform(const SystemEncoding().decoder).listen((
        data,
      ) {
        _outputController.add('[ERROR] $data');
        stderr.write(data);
      });

      // Handle process exit
      _engineProcess!.exitCode.then((exitCode) {
        _isRunning = false;
        if (config.verbose) {
          print('\n⚡ FlutterJS Engine exited with code: $exitCode');
        }
        if (!readyCompleter.isCompleted) readyCompleter.complete();
      });

      // Wait for build completion (up to 60s)
      await readyCompleter.future.timeout(
        const Duration(seconds: 60),
        onTimeout: () => null,
      );

      if (!config.verbose) {
        print('\n✅ FlutterJS Dev Server started');
        print('   🌐 http://localhost:${config.port}');
        print('   📁 Serving: ${config.outputPath}');
        print('\n   Press Ctrl+C to stop.\n');
      }

      return EngineBridgeResult.success(
        port: config.port,
        process: _engineProcess!,
      );
    } catch (e) {
      return EngineBridgeResult.failure('Failed to start engine: $e');
    }
  }

  /// Stop the engine process
  Future<void> stop() async {
    if (_engineProcess != null && _isRunning) {
      if (config.verbose) {
        print('\n🛑 Stopping FlutterJS Engine...');
      }

      // Send SIGTERM on Unix, SIGINT on Windows
      if (Platform.isWindows) {
        // On Windows, kill the process tree
        await Process.run('taskkill', [
          '/F',
          '/T',
          '/PID',
          '${_engineProcess!.pid}',
        ]);
      } else {
        _engineProcess!.kill(ProcessSignal.sigterm);
      }

      _isRunning = false;
      _engineProcess = null;

      if (config.verbose) {
        print('✅ Engine stopped');
      }
    }

    await _outputController.close();
  }

  /// Check if the engine is currently running
  bool get isRunning => _isRunning;

  /// Get the process ID (if running)
  int? get pid => _engineProcess?.pid;

  /// Send a reload signal to the engine (for hot reload)
  /// This is a placeholder for future IPC implementation
  Future<void> triggerReload() async {
    if (!_isRunning) {
      print('⚠️  Engine not running, cannot trigger reload');
      return;
    }

    // TODO: Implement IPC-based hot reload
    // For now, we rely on the JS engine's file watcher
    if (config.verbose) {
      print('🔄 Reload triggered (using file watcher)');
    }
  }
}

/// Manager for coordinating Dart CLI with JS Engine
///
/// This is the high-level API that the RunCommand uses.
///
/// Flow:
/// 1. Dart CLI generates .fjs files to build/flutterjs/lib/
///   2. EngineBridgeManager.initProject() runs flutterjs.exe init in build/flutterjs/
///   3. EngineBridgeManager.startAfterBuild() runs flutterjs.exe dev from build/flutterjs/
///   4. EngineBridgeManager.buildProject() runs flutterjs.exe build from build/flutterjs/
class EngineBridgeManager {
  FlutterJSEngineBridge? _bridge;
  String? _lastEnginePath;

  /// Build the JS project (Production Build)
  ///
  /// Invokes `flutterjs build` in the output directory.
  Future<bool> buildProject({
    required String buildPath,
    bool verbose = false,
  }) async {
    if (verbose) {
      print('\n🔨 Building JS project (Production)...');
      print('   Directory: $buildPath');
    }

    // Reuse bridge discovery logic by creating specific config for build
    // NOTE: Port is irrelevant for build but required by config
    final config = EngineBridgeConfig(
      projectPath: buildPath,
      outputPath: 'dist',
      verbose: verbose,
      mode: 'production',
      port: 0,
    );

    _bridge = FlutterJSEngineBridge(config);
    final enginePath = _bridge!._getEnginePath();

    if (enginePath == null) {
      print('❌ Failed to locate FlutterJS engine binary/script.');
      return false;
    }

    if (verbose) {
      print('   Using engine: $enginePath');
    }

    // 1. Create temporary package.json for build (if missing)
    final pkgFile = File(path.join(buildPath, 'package.json'));
    bool createdPkg = false;
    if (!pkgFile.existsSync()) {
      if (verbose) print('   📝 Creating temporary package.json...');
      pkgFile.writeAsStringSync(
        '{"type": "module", "name": "temp-build", "private": true}',
      );
      createdPkg = true;
    }

    try {
      // Determine executable and args
      final isJsSource = enginePath.endsWith('.js');
      final String executable = isJsSource ? 'node' : enginePath;
      final List<String> args = isJsSource
          ? [enginePath, 'build', '--to-js', '--output', config.outputPath]
          : ['build', '--to-js', '--output', config.outputPath];

      if (verbose) args.add('--verbose');

      if (verbose) {
        print('   Executing: $executable ${args.join(' ')}');
      }

      final process = await Process.start(
        executable,
        args,
        workingDirectory: buildPath,
        mode: ProcessStartMode.inheritStdio,
      );

      final exitCode = await process.exitCode;

      if (exitCode == 0 ||
          File(path.join(buildPath, 'dist', 'index.html')).existsSync()) {
        print('\n✅ JS Build successful (or verified)!');

        // 2. Ensuring Clean Build: Remove dist/node_modules if present
        // (It shouldn't be there with new PackageCollector, but forcing cleanup just in case)
        final distNodeModules = Directory(
          path.join(buildPath, 'dist', 'node_modules'),
        );
        if (distNodeModules.existsSync()) {
          if (verbose)
            print('   🧹 Cleaning up duplicate dist/node_modules...');
          try {
            distNodeModules.deleteSync(recursive: true);
          } catch (e) {
            print(
              '   ⚠️ Warning: Could not separate node_modules from dist: $e',
            );
          }
        }

        // Ensure Vercel config exists
        final vercelFile = File(path.join(buildPath, 'vercel.json'));
        if (!vercelFile.existsSync()) {
          vercelFile.writeAsStringSync('''
{
  "version": 2,
  "routes": [
    { "src": "^/node_modules/(.*)", "dest": "/node_modules/\$1" },
    { "src": "^/assets/(.*)", "dest": "/dist/assets/\$1" },
    { "src": "^/(.*)", "dest": "/dist/\$1" },
    { "handle": "filesystem" },
    { "src": "^/(.*)", "dest": "/dist/index.html" }
  ]
}
''');
          if (verbose) print('   Created vercel.json');
        }

        return true;
      } else {
        print('\n❌ JS Build failed with exit code $exitCode');
        return false;
      }
    } catch (e) {
      print('❌ internal error running build: $e');
      return false;
    } finally {
      // 3. Remove temporary package.json
      if (createdPkg && pkgFile.existsSync()) {
        try {
          if (verbose) print('   🗑️  Removing temporary package.json');
          pkgFile.deleteSync();
        } catch (_) {}
      }
    }
  }

  /// Initialize the JS project structure in buildPath
  ///
  /// Generates a complete FlutterJS project structure matching the example:
  /// - flutterjs.config.js (full config)
  /// - package.json (complete scripts and dependencies)
  /// - public/index.html
  /// - README.md
  /// - .gitignore
  ///
  /// Returns true if init succeeded or project already exists
  Future<bool> initProject({
    required String buildPath,
    String projectName = 'flutterjs-app',
    bool verbose = false,
  }) async {
    // ✅ COPY PACKAGE MAP: Always copy authoritative map to JS build directory
    // Do this BEFORE early return so it updates on every run
    try {
      final projectRoot = Directory(buildPath).parent.parent.path;
      final packageMapSource = File(
        path.join(projectRoot, '.dart_tool', 'flutterjs', 'package_map.json'),
      );
      final packageMapDest = File(path.join(buildPath, 'package_map.json'));

      stderr.writeln(
        '   [DEBUG-FORCE] Checking package_map source: ${packageMapSource.path}',
      );
      if (packageMapSource.existsSync()) {
        stderr.writeln(
          '   [DEBUG-FORCE] Copying package_map.json to build directory...',
        );
        packageMapSource.copySync(packageMapDest.path);
        stderr.writeln('   [DEBUG-FORCE] Copy success.');
      } else {
        stderr.writeln(
          '   [DEBUG-FORCE] package_map.json not found at ${packageMapSource.path}',
        );
      }
    } catch (e) {
      stderr.writeln('   ⚠️ Warning: Failed to copy package_map.json: $e');
    }

    // Check if already initialized (flutterjs.config.js exists)
    final configFile = File(path.join(buildPath, 'flutterjs.config.js'));
    if (configFile.existsSync()) {
      if (verbose) {
        print('   ✅ JS project already initialized');
      }
      return true;
    }

    if (verbose) {
      print('\n🔧 Initializing FlutterJS JS project...');
      print('   Directory: $buildPath');
    }

    try {
      // Ensure the build directory exists
      await Directory(buildPath).create(recursive: true);

      // ✅ HYBRID RESOLUTION: Resolve SDK packages dynamically
      if (verbose) {
        print('   📦 Resolving SDK packages...');
      }

      // Import RuntimePackageManager from pubjs
      // Note: Need to add import at top of file
      final packageManager = RuntimePackageManager();

      // Get SDK packages (all @flutterjs/* packages) AND project dependencies
      if (verbose)
        print('   [DEBUG] Calling packageManager.resolvePackages...');
      final sdkPackages = await packageManager.resolvePackages(
        [], // Empty list since we want all SDK packages initially
        projectPath: Directory(buildPath).parent.parent.path,
        includeSDK: true,
        includeProjectDependencies: true, // ✅ Resolve all pubspec dependencies
        lookupNodeModulesPath: path.join(
          buildPath,
          'node_modules',
        ), // ✅ Scan installed modules
        verbose: verbose,
      );

      // ✅ COPY PACKAGE MAP: Copy authoritative map to JS build directory
      try {
        final projectRoot = Directory(buildPath).parent.parent.path;
        final packageMapSource = File(
          path.join(projectRoot, '.dart_tool', 'flutterjs', 'package_map.json'),
        );
        final packageMapDest = File(path.join(buildPath, 'package_map.json'));

        if (packageMapSource.existsSync()) {
          if (verbose)
            print('   [DEBUG] Copying package_map.json to build directory...');
          packageMapSource.copySync(packageMapDest.path);
        } else {
          print(
            '   ⚠️ Warning: package_map.json not found at ${packageMapSource.path}',
          );
        }
      } catch (e) {
        print('   ⚠️ Warning: Failed to copy package_map.json: $e');
      }

      // Validate core packages are present
      final corePackages = [
        '@flutterjs/runtime',
        '@flutterjs/vdom',
        '@flutterjs/material',
        '@flutterjs/analyzer',
      ];

      for (final core in corePackages) {
        if (!sdkPackages.containsKey(core)) {
          print(
            '⚠️  Warning: Core package $core not found! This may cause build failures.',
          );
        }
      }

      // Format packages for config
      // Filter out core packages that have default mappings in JS
      final packagePathsConfig = sdkPackages.entries
          .map(
            (e) =>
                "    '${e.key}': {\n      path: '${e.value.replaceAll(r'\', '/')}'\n    }",
          )
          .join(',\n');

      if (verbose) {
        print('   ✅ Resolved ${sdkPackages.length} SDK packages');
      }

      // 1. Generate flutterjs.config.js (full config matching example)
      final configContent =
          '''
// ============================================================================
// FlutterJS Configuration
// Auto-generated by Dart CLI
// ============================================================================

export default {
  // Project Identity
  project: {
    name: '$projectName',
    description: 'A FlutterJS Application',
    version: '1.0.0',
  },

  // Entry Point Configuration
  entry: {
    main: 'src/main.js',
    rootWidget: 'MyApp',
    entryFunction: 'main',
  },

  // Rendering Mode
  render: {
    mode: 'csr', // Options: 'csr' | 'ssr' | 'hybrid'
    target: 'web', // Options: 'web' | 'node' | 'universal'
  },

  // Build Configuration
  build: {
    output: 'dist',
    source: 'src',
    production: {
      minify: true,
      obfuscate: true,
      treeshake: true,
      sourceMap: false,
    },
    development: {
      minify: false,
      obfuscate: false,
      treeshake: false,
      sourceMap: true,
    },
    html: {
      template: 'public/index.html',
      inlineCSS: false,
      minifyHTML: false,
    },
  },

  // Development Server
  dev: {
    server: {
      port: 3000,
      host: 'localhost',
      https: false,
    },
    hmr: {
      enabled: true,
      interval: 300,
      reload: true,
    },
    behavior: {
      open: false,
      cors: true,
      proxy: {},
    },
  },

  // Framework & Runtime Configuration
  framework: {
    material: {
      version: '3',
      theme: 'light',
    },
    cupertino: {
      enabled: false,
    },
    providers: {
      theme: true,
      navigation: true,
      mediaQuery: true,
      locale: true,
    },
  },

  // Dependencies Configuration
  dependencies: {
    npm: {},
    pubDev: {}, // pub.dev packages with version overrides
    custom: {},
    cdn: {
      roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
    },
  },

  // Package paths (auto-resolved)
  packages: {
$packagePathsConfig
  },

  // Assets Configuration
  assets: {
    include: [
      'public/assets/**/*',
      'public/fonts/**/*',
    ],
    exclude: [
      '**/*.md',
      '**/.DS_Store',
      '**/node_modules',
    ],
  },

  // Logging & Debugging
  logging: {
    level: 'info',
    modules: {
      analyzer: false,
      builder: false,
      compiler: false,
    },
  },

  // Performance Optimization
  optimization: {
    budgets: [
      { type: 'bundle', name: 'app', maxSize: '50kb' },
    ],
    cache: {
      enabled: true,
      type: 'file',
      directory: '.cache',
    },
    lazyLoad: {
      enabled: true,
      minChunkSize: 5000,
    },
  },

  // Environment Variables
  env: {
    development: {
      DEBUG: true,
    },
    production: {
      DEBUG: false,
    },
  },
};
''';

      await configFile.writeAsString(configContent);
      if (verbose) {
        print('   ✅ Created flutterjs.config.js');
      }

      // 2. Generate complete package.json
      final packageJsonFile = File(path.join(buildPath, 'package.json'));
      if (!packageJsonFile.existsSync()) {
        final packageJsonContent =
            '''
{
  "name": "$projectName",
  "version": "1.0.0",
  "description": "A FlutterJS Application - Generated by Dart CLI",
  "type": "module",
  "main": "dist/index.html",
  "module": "src/main.js",
  "scripts": {
    "dev": "flutterjs dev",
    "dev:debug": "flutterjs dev --debug",
    "dev:verbose": "flutterjs dev --verbose",
    "build": "flutterjs build",
    "build:prod": "flutterjs build --production",
    "preview": "flutterjs preview",
    "analyze": "flutterjs analyze",
    "clean": "rimraf dist .cache .dev"
  },
  "keywords": [
    "flutterjs",
    "flutter",
    "web-app",
    "material-design"
  ],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  },
  "dependencies": {
    "@flutterjs/core": "^1.0.0",
    "@flutterjs/material": "^1.0.0"
  },
  "devDependencies": {
    "@flutter-js/cli": "^1.0.0"
  },
  "flutterjs": {
    "version": "1.0.0",
    "configFile": "flutterjs.config.js",
    "entry": {
      "main": "src/main.js",
      "rootWidget": "MyApp",
      "entryFunction": "main"
    },
    "build": {
      "source": "src",
      "output": "dist",
      "target": "web"
    },
    "dev": {
      "port": 3000,
      "hmr": true
    }
  },
  "browserslist": [
    "> 1%",
    "last 2 versions",
    "not dead",
    "not IE 11"
  ]
}
''';
        await packageJsonFile.writeAsString(packageJsonContent);
        if (verbose) {
          print('   ✅ Created package.json');
        }
      }

      // 3. Generate public/index.html - SKIPPED (Handled by Dev Server)
      // The dev server generates .dev/index.html with dynamic import maps.
      // We no longer generate a static public/index.html to avoid confusion.

      // 4. Generate README.md
      final readmeFile = File(path.join(buildPath, 'README.md'));
      if (!readmeFile.existsSync()) {
        final readmeContent =
            '''
# $projectName

A FlutterJS application generated by Dart CLI.

## Getting Started

### Start Development Server

```bash
npm run dev
# or
flutterjs dev
```

Opens development server at http://localhost:3000

### Build for Production

```bash
npm run build
# or
flutterjs build
```

Creates optimized build in `dist/` folder.

### Preview Production Build

```bash
npm run preview
# or
flutterjs preview
```

## Project Structure

```
$projectName/
├── flutterjs.config.js    # Configuration file
├── package.json           # NPM manifest
├── src/                   # Source files (.fjs)
│   └── main.fjs
├── public/                # Static assets
│   └── index.html
├── dist/                  # Production build (generated)
└── .dev/                  # Dev server output (generated)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run clean` - Clean build artifacts

## Configuration

Edit `flutterjs.config.js` to customize:
- Rendering mode (SSR/CSR/Hybrid)
- Build options
- Development server settings
- Optimization settings
''';
        await readmeFile.writeAsString(readmeContent);
        if (verbose) {
          print('   ✅ Created README.md');
        }
      }

      // 5. Generate .gitignore
      final gitignoreFile = File(path.join(buildPath, '.gitignore'));
      if (!gitignoreFile.existsSync()) {
        final gitignoreContent = '''
# Dependencies
node_modules/

# Build outputs
dist/
.dev/
.debug/

# Generated files
.flutterjs/
.cache/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*
''';
        await gitignoreFile.writeAsString(gitignoreContent);
        if (verbose) {
          print('   ✅ Created .gitignore');
        }
      }

      // 6. Generate .vercelignore
      final vercelignoreFile = File(path.join(buildPath, '.vercelignore'));
      if (!vercelignoreFile.existsSync()) {
        final vercelignoreContent = '''
# Ignore public folder (template only, not for deployment)
public/

# Ignore source files (Dart/Flutter source)
src/*.fjs
src/*.dart

# Ignore package files to prevent npm install attempt
package.json
package-lock.json

# Ignore build config
flutterjs.config.js

# Ignore development artifacts
.dev/
.debug/

# We include both 'dist' and 'node_modules' in upload
# so Vercel can serve efficiently from root
!node_modules
!node_modules/**/*
!dist
!dist/**/*
''';
        await vercelignoreFile.writeAsString(vercelignoreContent);
        if (verbose) {
          print('   ✅ Created .vercelignore');
        }
      }

      // 7. Create assets directory
      final assetsDir = Directory(path.join(buildPath, 'assets'));
      await assetsDir.create(recursive: true);

      print('   ✅ JS project initialized');
      return true;
    } catch (e) {
      print('❌ Init error: $e');
      return false;
    }
  }

  /// Find the engine binary path or source script
  String? _findEnginePath(String fromDir, bool verbose) {
    // 1. Check for Node.js source (bin/index.js) - PRIORITY
    final sourcePaths = <String>[
      // Relative: build/flutterjs/ -> packages/flutterjs_engine/bin/index.js
      path.join(
        fromDir,
        '..',
        '..',
        'packages',
        'flutterjs_engine',
        'bin',
        'index.js',
      ),
      // Relative: 8 levels up (general safety)
      path.join(
        fromDir,
        '..',
        '..',
        '..',
        'packages',
        'flutterjs_engine',
        'bin',
        'index.js',
      ),
      path.join(
        fromDir,
        '..',
        '..',
        '..',
        '..',
        'packages',
        'flutterjs_engine',
        'bin',
        'index.js',
      ),
      // Absolute fallback
      'C:/Jay/_Plugin/flutterjs/packages/flutterjs_engine/bin/index.js',
    ];

    for (final sourcePath in sourcePaths) {
      final normalized = path.normalize(sourcePath);
      if (verbose) print('   Checking source: $normalized');
      if (File(normalized).existsSync()) {
        return normalized;
      }
    }

    // 2. Fallback to Executables
    final binaryName = Platform.isWindows
        ? 'flutterjs-win.exe'
        : Platform.isMacOS
        ? 'flutterjs-macos'
        : 'flutterjs-linux';

    final possiblePaths = <String?>[
      // Relative
      path.join(fromDir, '..', '..', 'packages', 'flutterjs_engine', 'dist'),
      path.join(
        fromDir,
        '..',
        '..',
        '..',
        'packages',
        'flutterjs_engine',
        'dist',
      ),
      // Absolute
      'C:/Jay/_Plugin/flutterjs/packages/flutterjs_engine/dist',
    ];

    for (final basePath in possiblePaths.whereType<String>()) {
      final fullPath = path.normalize(path.join(basePath, binaryName));
      if (verbose) {
        print('   Checking binary: $fullPath');
      }
      if (File(fullPath).existsSync()) {
        return fullPath;
      }
    }

    return null;
  }

  /// Start the dev server after .fjs files are generated
  ///
  /// [buildPath] - The build/flutterjs directory (JS project root)
  /// [jsOutputPath] - The build/flutterjs/lib directory (where .fjs files are)
  Future<EngineBridgeResult> startAfterBuild({
    required String buildPath,
    required String jsOutputPath,
    int port = 3000,
    bool openBrowser = true,
    bool verbose = false,
  }) async {
    if (!verbose) {
      print('\n🚀 Starting FlutterJS Dev Server...');
    }

    // Use the engine path found during init, or find it again
    final enginePath = _lastEnginePath ?? _findEnginePath(buildPath, verbose);
    if (enginePath == null) {
      return EngineBridgeResult.failure('FlutterJS engine not found');
    }

    final config = EngineBridgeConfig(
      projectPath: buildPath, // Run from build/flutterjs (JS project root)
      outputPath: jsOutputPath,
      port: port,
      openBrowser: openBrowser,
      verbose: verbose,
    );

    _bridge = FlutterJSEngineBridge(config);
    return await _bridge!.startDevServer();
  }

  /// Stop the dev server
  Future<void> stop() async {
    if (_bridge != null) {
      await _bridge!.stop();
      _bridge = null;
    }
  }

  /// Get current bridge (if running)
  FlutterJSEngineBridge? get bridge => _bridge;

  /// Whether a dev server is currently running
  bool get isRunning => _bridge?.isRunning ?? false;
}
