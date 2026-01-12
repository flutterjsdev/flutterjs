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
        help: 'Create an external package (pub.dev + npm)',
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

    // Determine output directory
    // If we're in external_package/, create here
    // Otherwise, create in external_package/ subdirectory
    final currentDir = Directory.current.path;
    final outputDir = p.basename(currentDir) == 'external_package'
        ? currentDir
        : p.join(currentDir, 'external_package');

    print('');
    print('🎨 Creating external package: $packageName');
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
}
