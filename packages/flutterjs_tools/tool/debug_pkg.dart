import 'dart:io';
import 'package:pubjs/pubjs.dart';
import 'package:path/path.dart' as path;

Future<void> main() async {
  print('Starting debug_pkg...');
  // Assuming running from packages/flutterjs_tools/
  final toolsDir = Directory.current.path;
  final repoRoot = path.dirname(path.dirname(toolsDir)); // packages/../


  // Simulate routing_app project
  final projectPath = path.join(repoRoot, 'examples', 'routing_app');
  final flutterJsDir = path.join(projectPath, '.flutterjs');

  print('Repo Root: $repoRoot');
  print('Project: $projectPath');

  final pm = RuntimePackageManager();
  print('Calling preparePackages...');

  try {
    final result = await pm.preparePackages(
      projectPath: projectPath,
      buildPath: flutterJsDir,
      verbose: true,
    );
    print('Result: $result');
  } catch (e, st) {
    print('ERROR: $e');
    print(st);
  }
  print('Done.');
}
