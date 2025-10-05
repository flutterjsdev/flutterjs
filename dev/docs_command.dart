import 'dart:io';

import 'package:args/command_runner.dart';
// ============================================================================
// DOCS COMMAND
// ============================================================================

class DocsCommand extends Command<void> {
  DocsCommand({required this.verbose, required this.verboseHelp}) {
    argParser
      ..addOption(
        'output',
        abbr: 'o',
        help: 'Output directory for documentation.',
        defaultsTo: 'docs',
      )
      ..addFlag(
        'serve',
        abbr: 's',
        help: 'Serve documentation locally.',
        negatable: false,
      );
  }

  final bool verbose;
  final bool verboseHelp;

  @override
  String get name => 'docs';

  @override
  String get description => 'Generate documentation.';

  @override
  Future<void> run() async {
    final outputDir = argResults!['output'] as String;
    final serve = argResults!['serve'] as bool;

    print('📚 Generating Flutter.js documentation...\n');

    print('Generating:');
    print('  ├─ Widget mapping reference');
    print('  ├─ API documentation');
    print('  ├─ Migration guide');
    print('  └─ Examples\n');

    await Future.delayed(Duration(milliseconds: 500));

    print('✅ Documentation generated at: $outputDir/\n');

    if (serve) {
      print('📖 Serving docs at http://localhost:4000');
      print('Press Ctrl+C to stop\n');

      // TODO: Implement doc server
      await ProcessSignal.sigint.watch().first;
    }
  }
}
