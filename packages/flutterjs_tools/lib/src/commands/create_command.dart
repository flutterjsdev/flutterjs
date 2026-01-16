import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:path/path.dart' as p;
import 'package:pubjs/pubjs.dart';

/// Command to create new FlutterJS projects or external packages
class CreateCommand extends Command<void> {
  CreateCommand() {
    argParser
      ..addOption(
        'package',
        help: 'Create a package (pub.dev + npm)',
        valueHelp: 'package_name',
      )
      ..addOption(
        'description',
        help: 'Package description',
        valueHelp: 'description',
      )
      ..addOption(
        'org',
        help: 'Organization name',
        defaultsTo: 'flutterjs',
        valueHelp: 'organization',
      );
  }

  @override
  String get name => 'create';

  @override
  String get description =>
      'Create a new FlutterJS project or external package';

  @override
  String get invocation => 'flutterjs create [arguments]';

  @override
  Future<void> run() async {
    final packageName = argResults!['package'] as String?;

    if (packageName != null) {
      // Create external package
      await _createPackage(packageName);
    } else {
      // Create regular FlutterJS project (not yet implemented)
      print('❌ Project creation not yet implemented');
      print('   Use: flutterjs create --package <name>');
      print('   Example: flutterjs create --package flutterjs_http');
      exit(1);
    }
  }

  Future<void> _createPackage(String packageName) async {
    final description = argResults!['description'] as String?;
    final organization = argResults!['org'] as String;

    // Find the packages directory
    final outputDir = _findPackagesDirectory();

    if (outputDir == null) {
      print('❌ Could not find packages directory');
      print('   Please run this command from within the FlutterJS repository');
      exit(1);
    }

    print('DEBUG_MARKER_1: outputDir = $outputDir');
    print('DEBUG_MARKER_2: packageName = $packageName');
    print('📦 Creating package: $packageName');

    if (description != null) {
      print('   Description: $description');
    }
    print('   Organization: $organization');
    print('');

    final scaffold = PackageScaffold();
    final success = await scaffold.createPackage(
      packageName: packageName,
      outputDir: outputDir,
      description: description,
      organization: organization,
    );

    if (success) {
      exit(0);
    } else {
      exit(1);
    }
  }

  /// Find the packages directory by traversing up from current directory
  String? _findPackagesDirectory() {
    var current = Directory.current;

    // Check if we're already in packages directory
    if (p.basename(current.path) == 'packages') {
      return current.path;
    }

    // Check if packages subdirectory exists
    final packagesDir = Directory(p.join(current.path, 'packages'));
    if (packagesDir.existsSync()) {
      return packagesDir.path;
    }

    // Traverse up to find packages directory
    while (current.parent.path != current.path) {
      current = current.parent;

      final packagesDir = Directory(p.join(current.path, 'packages'));
      if (packagesDir.existsSync()) {
        return packagesDir.path;
      }
    }

    return null;
  }
}
