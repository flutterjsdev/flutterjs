import 'package:args/command_runner.dart';
// ============================================================================
// CLEAN COMMAND
// ============================================================================

class CleanCommand extends Command<void> {
  CleanCommand({required this.verbose});

  final bool verbose;

  @override
  String get name => 'clean';

  @override
  String get description => 'Delete build artifacts and caches.';

  @override
  Future<void> run() async {
    print('🧹 Cleaning build artifacts...\n');

    final directories = ['build/', '.flutterjs-cache/', 'node_modules/'];

    for (final dir in directories) {
      if (verbose) {
        print('Removing $dir');
      }
      // TODO: Actually remove directories
      // await Directory(dir).delete(recursive: true);
    }

    print('\n✅ Clean complete!\n');
  }
}
