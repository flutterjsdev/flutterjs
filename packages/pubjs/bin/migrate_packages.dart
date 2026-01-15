import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:pubjs/pubjs.dart';

void main() async {
  final scaffold = PackageScaffold();
  final packagesDir = p.absolute('packages');
  final engineDir = p.join(packagesDir, 'flutterjs_engine');

  final migrations = [
    {
      'name': 'flutterjs_material',
      'source': p.join(engineDir, 'package', 'material', 'src'),
      'description': 'FlutterJS Material Design components',
    },
    {
      'name': 'flutterjs_analyzer',
      'source': p.join(engineDir, 'src', 'analyzer', 'src'),
      'description': 'FlutterJS static analysis tools',
    },
    {
      'name': 'flutterjs_runtime',
      'source': p.join(engineDir, 'src', 'runtime', 'src'),
      'description': 'FlutterJS core runtime implementation',
    },
    {
      'name': 'flutterjs_vdom',
      'source': p.join(engineDir, 'src', 'vdom', 'src'),
      'description': 'FlutterJS Virtual DOM implementation',
    },
  ];

  print('🚀 Starting package migration...');

  for (final migration in migrations) {
    final name = migration['name'] as String;
    final sourcePath = migration['source'] as String;
    final description = migration['description'] as String;

    print('\n----------------------------------------');
    print('Processing $name...');

    // 1. Create Package
    final success = await scaffold.createPackage(
      packageName: name,
      outputDir: packagesDir,
      description: description,
    );

    if (!success) {
      print('❌ Failed to scaffold $name');
      continue;
    }

    // 2. Copy Source Code
    final targetJsDir = p.join(packagesDir, name, name, 'src');
    final sourceDir = Directory(sourcePath);
    final targetDir = Directory(targetJsDir);

    if (await sourceDir.exists()) {
      print('   📂 Copying existing source code from:');
      print('      $sourcePath');
      print('      to');
      print('      $targetJsDir');

      // Clear existing scaffolded src
      if (await targetDir.exists()) {
        await targetDir.delete(recursive: true);
      }
      await targetDir.create(recursive: true);

      await _copyDirectory(sourceDir, targetDir);
      print('   ✅ Source code migrated');
    } else {
      print('   ⚠️ Source directory not found: $sourcePath');
    }
  }

  print('\n----------------------------------------');
  print('✨ Migration complete!');
}

Future<void> _copyDirectory(Directory source, Directory destination) async {
  await for (final entity in source.list(recursive: false)) {
    if (entity is Directory) {
      final newDirectory = Directory(
        p.join(destination.path, p.basename(entity.path)),
      );
      await newDirectory.create();
      await _copyDirectory(entity, newDirectory);
    } else if (entity is File) {
      await entity.copy(p.join(destination.path, p.basename(entity.path)));
    }
  }
}
