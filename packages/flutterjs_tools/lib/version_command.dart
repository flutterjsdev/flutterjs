import 'dart:io';

import 'package:args/command_runner.dart';

import 'model/package_profile.dart';
// ============================================================================
// VERSION COMMAND
// ============================================================================

class VersionCommand extends Command<void> {
  @override
  String get name => 'version';

  @override
  String get description => 'Show version information.';

  @override
  Future<void> run() async {
    print('${PackageProfile.kAppName} v${PackageProfile.kVersion}');
    print('Transpile Flutter apps to optimized HTML/CSS/JS');
    print('');
    print('Dart SDK: ${Platform.version}');
    print('Platform: ${Platform.operatingSystem}');
  }
}
