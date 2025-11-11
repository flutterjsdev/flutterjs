import 'dart:io';
import 'package:args/command_runner.dart';

// ============================================================================
// CLEAN COMMAND
// ============================================================================
class CleanCommand extends Command<void> {
  CleanCommand({this.verbose = false});

  final bool verbose;

  @override
  String get name => 'clean';

  @override
  String get description =>
      'Delete build artifacts and caches (like `flutter clean`).';

  @override
  Future<void> run() async {
    print('🧹 Cleaning build artifacts and caches...\n');

    // Directories to clean (common in Flutter/JS/Dart projects)
    final List<String> directories = [
      'build/',
      '.dart_tool/',
      '.flutterjs-cache/',
      'node_modules/',
      'ios/Pods/',
      'ios/.symlinks/',
      'android/.gradle/',
      'android/app/build/',
    ];

    int deletedCount = 0;

    for (final dirPath in directories) {
      final dir = Directory(dirPath);
      if (await dir.exists()) {
        if (verbose) {
          print('   Removing: $dirPath');
        }
        try {
          await dir.delete(recursive: true);
          deletedCount++;
        } on FileSystemException catch (e) {
          if (verbose) {
            print('   ⚠️  Failed to delete $dirPath: ${e.message}');
          }
        }
      } else if (verbose) {
        print('   Skipped: $dirPath (does not exist)');
      }
    }

    // Optional: Run platform-specific clean
    if (Platform.isMacOS) {
      await _cleanMacOS();
    } else if (Platform.isWindows || Platform.isLinux) {
      await _cleanPubCache();
    }

    print(
      '\n✅ Clean complete! Removed $deletedCount artifact director${deletedCount == 1 ? 'y' : 'ies'}.\n',
    );
  }

  // Clean macOS/iOS derived data (optional enhancement)
  Future<void> _cleanMacOS() async {
    if (verbose) print('   Cleaning iOS DerivedData...');
    final derivedData =
        '${Platform.environment['HOME']}/Library/Developer/Xcode/DerivedData';
    final dir = Directory(derivedData);
    if (await dir.exists()) {
      await Process.run('rm', ['-rf', derivedData]);
    }
  }

  // Clean pub get cache (optional)
  Future<void> _cleanPubCache() async {
    if (verbose) print('   Running `dart pub cache repair`...');
    await Process.run('dart', ['pub', 'cache', 'repair']);
  }
}
