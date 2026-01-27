import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:pubjs/pubjs.dart';
import 'package:path/path.dart' as p;

void main(List<String> args) async {
  final runner = CommandRunner('pubjs', 'FlutterJS Package Manager')
    ..addCommand(BuildPackageCommand())
    ..addCommand(GetCommand());

  try {
    await runner.run(args);
  } catch (e) {
    print('Error: $e');
    exit(1);
  }
}

class GetCommand extends Command {
  @override
  final name = 'get';

  @override
  final description = 'Get packages.';

  GetCommand() {
    argParser.addOption(
      'path',
      abbr: 'p',
      help: 'Path to package directory (default: current directory)',
    );
    argParser.addOption(
      'build-dir',
      abbr: 'b',
      help:
          'Directory to build/install packages into (default: <package>/build/flutterjs)',
    );
    argParser.addFlag('verbose', abbr: 'v', help: 'Show verbose output');
    argParser.addFlag('force', abbr: 'f', help: 'Force resolve');
  }

  @override
  Future<void> run() async {
    final packagePath = argResults?['path'] ?? Directory.current.path;
    // Default build dir to inside the project path if not specified
    String buildDir = argResults?['build-dir'] ?? '';

    final fullPath = p.absolute(packagePath);

    if (buildDir.isEmpty) {
      buildDir = p.join(fullPath, 'build', 'flutterjs');
    }

    final fullBuildPath = p.absolute(buildDir);

    print('📍 Project: $fullPath');
    print('📂 Build Dir: $fullBuildPath');

    final verbose = argResults?['verbose'] ?? false;
    final force = argResults?['force'] ?? false;

    final manager = RuntimePackageManager();
    await manager.preparePackages(
      projectPath: fullPath,
      buildPath: fullBuildPath,
      force: force,
      verbose: verbose,
    );
  }
}

class BuildPackageCommand extends Command {
  @override
  final name = 'build-package';

  @override
  final aliases = ['build'];

  @override
  final description = 'Builds a FlutterJS package from Dart source.';

  BuildPackageCommand() {
    argParser.addOption(
      'path',
      abbr: 'p',
      help: 'Path to package directory (default: current directory)',
    );
    argParser.addFlag('verbose', abbr: 'v', help: 'Show verbose output');
  }

  @override
  Future<void> run() async {
    final packagePath = argResults?['path'] ?? Directory.current.path;
    final verbose = argResults?['verbose'] ?? false;

    final fullPath = p.absolute(packagePath);

    // Check for pubspec
    final pubspec = File(p.join(fullPath, 'pubspec.yaml'));
    if (!await pubspec.exists()) {
      print('❌ Error: No pubspec.yaml found in $fullPath');
      exit(1);
    }

    String packageName = 'unknown';
    // Minimal parsing to get package name (though PackageBuilder primarily uses path now)
    try {
      final lines = await pubspec.readAsLines();
      for (final line in lines) {
        if (line.trim().startsWith('name:')) {
          packageName = line.split(':')[1].trim();
          break;
        }
      }
    } catch (_) {}

    final builder = PackageBuilder();

    await builder.buildPackageRecursively(
      packageName: packageName,
      projectRoot:
          fullPath, // Assuming .dart_tool is here or resolved from here
      explicitSourcePath: fullPath,
      force: true,
      verbose: verbose,
    );
  }
}
