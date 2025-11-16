import 'dart:async';
import 'dart:io';
import 'package:dev_tools/src/ir_server.dart';
import 'package:args/args.dart';

/// Advanced Binary IR Viewer with Enhanced Diagnostics
/// Shows exactly what's working and what's failing
/// Run: dart main.dart --dir . --port 8765 --verbose

void main(List<String> args) async {
  final parser = ArgParser()
    ..addOption('port', abbr: 'p', help: 'Port to run server on', defaultsTo: '8765')
    ..addOption('host', help: 'Host to bind to', defaultsTo: 'localhost')
    ..addOption('dir', abbr: 'd', help: 'Directory to watch for *.ir files', defaultsTo: '.')
    ..addFlag('verbose', abbr: 'v', help: 'Verbose output with diagnostics')
    ..addFlag('no-open', help: 'Do not open browser')
    ..addFlag('help', abbr: 'h', help: 'Show help');

  try {
    final results = parser.parse(args);
    if (results['help'] as bool) {
      _printHelp(parser);
      exit(0);
    }

    final port = int.tryParse(results['port'] as String) ?? 8765;
    final host = results['host'] as String;
    final verbose = results['verbose'] as bool;
    final noOpen = results['no-open'] as bool;
    final watchDir = results['dir'] as String;

    _printBanner();

    final server = BinaryIRServer(
      port: port,
      host: host,
      verbose: verbose,
      watchDirectory: watchDir,
    );

    await server.start();
    print('✅ Server started on http://$host:$port');
    print('📁 Watching: $watchDir for *.ir files');
    print('📡 Ready for analysis!\n');

    if (!noOpen) {
      await _openBrowser('http://$host:$port');
    }

    print('Press Ctrl+C to stop\n');
    await stdin.first;
    await server.stop();
    print('\n✅ Server stopped');
  } catch (e) {
    print('❌ Fatal Error: $e');
    exit(1);
  }
}

void _printHelp(ArgParser parser) {
  print('Binary IR Viewer - Advanced with Diagnostics\n');
  print('Usage: dart main.dart [OPTIONS]\n');
  print('OPTIONS:\n${parser.usage}');
  print('\nEXAMPLES:');
  print('  dart main.dart --port 8765 --dir . --verbose');
  print('  dart main.dart -p 9000 -d /path/to/ir/files -v');
}

Future<void> _openBrowser(String url) async {
  try {
    if (Platform.isWindows) {
      await Process.run('start', [url]);
    } else if (Platform.isMacOS) {
      await Process.run('open', [url]);
    } else if (Platform.isLinux) {
      await Process.run('xdg-open', [url]);
    }
  } catch (e) {
    print('⚠️  Open manually: $url');
  }
}

void _printBanner() {
  print('''
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  📊 Binary IR Viewer - Enhanced Diagnostics                        │
│  Real-time Error Highlighting & Component Status                  │
│                                                                    │
│  Using BinaryIRReader from flutterjs_core                         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
''');
}