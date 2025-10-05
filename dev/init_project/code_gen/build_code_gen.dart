import 'dart:io';

Future<void> createBuildStructure(bool verbose) async {
  print('📦 Creating MPA build structure...');

  final dirs = [
    'build/flutterjs-cache/output',
    'build/flutterjs-cache/output/pages',
    'build/flutterjs-cache/output/services',
    'build/flutterjs-cache/output/styles',
    'build/flutterjs/output',
    'build/flutterjs/output/pages',
    'build/flutterjs/output/services',
    'build/flutterjs/output/runtime',
  ];

  for (final dirPath in dirs) {
    final dir = Directory(dirPath);
    if (!await dir.exists()) {
      await dir.create(recursive: true);
      if (verbose) print('   Created: $dirPath/');
    }
  }

  print('✅ MPA structure created\n');
}
