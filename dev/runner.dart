import 'package:args/command_runner.dart';

import 'analyze_command.dart';
import 'build_command.dart';
import 'clean_command.dart';
import 'docs_command.dart';
import 'init_project/init_project.dart';
import 'model/package_profile.dart';
import 'run_command.dart';
import 'version_command.dart';

class FlutterJSCommandRunner extends CommandRunner<void> {
  FlutterJSCommandRunner({
    required this.verbose,
    required this.verboseHelp,
    required this.muteCommandLogging,
  }) : super(
         'flutterjs',
         '${PackageProfile.kAppName} - Flutter Design Systems for HTML',
       ) {
    argParser
      ..addFlag(
        'verbose',
        abbr: 'v',
        negatable: false,
        help: 'Show additional command output.',
      )
      ..addFlag(
        'version',
        negatable: false,
        help: 'Print version information.',
      );

    _addCommands();
  }

  final bool verbose;
  final bool verboseHelp;
  final bool muteCommandLogging;

  void _addCommands() {
    addCommand(InitProject(verbose: verbose, verboseHelp: verboseHelp));
    addCommand(BuildCommand(verbose: verbose, verboseHelp: verboseHelp));
    addCommand(RunCommand(verbose: verbose, verboseHelp: verboseHelp));
    addCommand(AnalyzeCommand(verbose: verbose, verboseHelp: verboseHelp));
    addCommand(DocsCommand(verbose: verbose, verboseHelp: verboseHelp));
    addCommand(CleanCommand(verbose: verbose));
    addCommand(VersionCommand());
  }

  @override
  Future<void> run(Iterable<String> args) async {
    // Handle version flag
    if (args.contains('--version')) {
      print('${PackageProfile.kAppName} v${PackageProfile.kVersion}');
      return;
    }

    return super.run(args);
  }
}
