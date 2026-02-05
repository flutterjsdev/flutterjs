import 'dart:io';
import 'package:path/path.dart' as p;

const targetVersion = '1.0.0';

void main() async {
  final rootDir = Directory('c:/Jay/_Plugin/flutterjs');
  final excludeDirs = {
    '.dart_tool',
    'build',
    '.git',
    '.idea',
    '.vscode',
    'node_modules',
  };

  await for (final entity in rootDir.list(
    recursive: true,
    followLinks: false,
  )) {
    if (entity is File) {
      final path = entity.path;
      final fileName = p.basename(path);

      final parts = p.split(path);
      if (parts.any((part) => excludeDirs.contains(part))) continue;

      if (fileName == 'pubspec.yaml') {
        await updatePubspec(entity);
      } else if (fileName == 'package.json') {
        await updatePackageJson(entity);
      } else if (fileName == 'flutterjs.dart' && path.contains('bin')) {
        await updateCliVersion(entity);
      }
    }
  }
  print('Synchronization complete!');
}

Future<void> updatePubspec(File file) async {
  final content = await file.readAsString();
  final updated = content.replaceFirst(
    RegExp(r'^version: .+$', multiLine: true),
    'version: $targetVersion',
  );
  if (content != updated) {
    print('Updating pubspec: ${file.path}');
    await file.writeAsString(updated);
  }
}

Future<void> updatePackageJson(File file) async {
  final content = await file.readAsString();
  final updated = content.replaceFirst(
    RegExp(r'"version": "[^"]+"'),
    '"version": "$targetVersion"',
  );
  if (content != updated) {
    print('Updating package.json: ${file.path}');
    await file.writeAsString(updated);
  }
}

Future<void> updateCliVersion(File file) async {
  final content = await file.readAsString();
  var updated = content.replaceFirst(
    RegExp(r"const String version = '[^']+'"),
    "const String version = '$targetVersion'",
  );
  updated = updated.replaceFirst(
    RegExp(r"const String kVersion = '[^']+'"),
    "const String kVersion = '$targetVersion'",
  );
  if (content != updated) {
    print('Updating CLI constants: ${file.path}');
    await file.writeAsString(updated);
  }
}
