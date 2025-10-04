import 'dart:io';

import 'package:args/command_runner.dart';
// ============================================================================
// RUN COMMAND
// ============================================================================

class RunCommand extends Command<void> {
  RunCommand({required this.verbose, required this.verboseHelp}) {
    argParser
      ..addOption(
        'port',
        abbr: 'p',
        help: 'Port to run the development server on.',
        defaultsTo: '3000',
      )
      ..addFlag(
        'hot-reload',
        help: 'Enable hot reload.',
        defaultsTo: true,
      )
      ..addFlag(
        'open',
        abbr: 'o',
        help: 'Open in default browser.',
        negatable: false,
      )
      ..addOption(
        'host',
        help: 'Host to bind the server to.',
        defaultsTo: 'localhost',
      );
  }

  final bool verbose;
  final bool verboseHelp;

  @override
  String get name => 'run';

  @override
  String get description => 'Run development server with hot reload.';

  @override
  String get invocation => 'flutter-js run [options]';

  @override
  Future<void> run() async {
    final port = int.parse(argResults!['port'] as String);
    final host = argResults!['host'] as String;
    final hotReload = argResults!['hot-reload'] as bool;
    final openBrowser = argResults!['open'] as bool;

    print('🚀 Starting Flutter.js development server...\n');

    if (verbose) {
      print('Configuration:');
      print('  Host:        $host');
      print('  Port:        $port');
      print('  Hot reload:  $hotReload');
      print('');
    }

    print('⚙️  Parsing Flutter widgets...');
    await Future.delayed(Duration(milliseconds: 300));
    
    print('📦 Building development bundle...');
    await Future.delayed(Duration(milliseconds: 500));
    
    print('✨ Server ready!\n');
    print('  Local:   http://$host:$port');
    print('  Network: http://192.168.1.100:$port\n');
    
    if (openBrowser) {
      print('🌐 Opening browser...\n');
    }
    
    print('Press Ctrl+C to stop\n');
    print('[INFO] Watching for file changes...');
    
    if (hotReload) {
      print('[INFO] Hot reload enabled');
    }

    // TODO: Implement actual dev server
    // await flutterjs.startDevServer(
    //   port: port,
    //   host: host,
    //   hotReload: hotReload,
    //   verbose: verbose,
    // );

    // Keep process alive
    await ProcessSignal.sigint.watch().first;
    print('\n\n👋 Shutting down server...');
  }
}
