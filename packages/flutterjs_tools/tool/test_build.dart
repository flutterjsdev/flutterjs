import 'package:flutterjs_tools/src/runner.dart';
import 'package:path/path.dart' as path;
import 'dart:io';

Future<void> main() async {
  print('Running BuildCommand verification...');

  final repoRoot = path.dirname(path.dirname(Directory.current.path));
  final projectPath = path.join(repoRoot, 'examples', 'counter');

  print('Target Project: $projectPath');

  // Ensure bin/flutterjs.dart is compiled or usable? No need, using Runner directly.

  final runner = FlutterJSCommandRunner(
    verbose: true,
    verboseHelp: false,
    muteCommandLogging: false,
  );

  try {
    // Mimic arguments passed to CLI
    await runner.run([
      'build',
      '--project', projectPath,
      '--source', 'lib',
      '--output', 'build',
      '--mode',
      'dev', // implicit in build now but explicit config in BuildCommand is toJs: true
    ]);
    print('BuildCommand verification finished successfully.');
  } catch (e) {
    print('BuildCommand verification failed: $e');
    exit(1);
  }
}
