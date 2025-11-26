import 'package:args/command_runner.dart';
import 'analyzer/analyze_command.dart';
import 'builder/build_command.dart';
import 'cleaner/clean_command.dart';
import 'docs_command.dart';
// import '../../flutterjs_gen/lib/init_project/init_project.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'model/package_profile.dart';
import 'runner/run_command.dart';
import 'version_command.dart';

/// ============================================================================
/// FlutterJSCommandRunner
/// ============================================================================
///
/// The central command dispatcher for the **Flutter.js CLI**.
///
/// This class extends `CommandRunner` from the `args` package and is responsible
/// for:
///
///   • Defining global CLI flags (`--verbose`, `--version`)  
///   • Routing execution to subcommands  
///   • Controlling verbosity, help formatting, and logging behavior  
///   • Displaying version information  
///
///
/// # Purpose
///
/// `FlutterJSCommandRunner` acts as the root of the CLI system. It aggregates
/// all commands (build, run, analyze, docs, clean, init, version) and ensures
/// they share consistent configuration and logging.
///
/// When a user runs:
///
/// ```bash
/// flutterjs <command> [options]
/// ```
///
/// this runner determines:
///   1. Which command to execute  
///   2. Whether to show verbose output  
///   3. Whether help should be shown  
///   4. Whether command logging should be muted  
///
///
/// # Global Flags
///
/// ## `--verbose` / `-v`  
/// Enables extended logging for debugging.
///  
/// ## `--version`  
/// Prints the CLI version and exits.
///
///
/// # Constructor Flags
///
/// These flags are injected by the entrypoint (`main.dart`) before invoking
/// the runner:
///
///   • `verbose`          → normal verbose mode  
///   • `verboseHelp`      → prints detailed help output  
///   • `muteCommandLogging`  
///       hides internal logging when running help/doctor to avoid clutter  
///
///
/// # Command Registration
///
/// `_addCommands()` installs all CLI subcommands:
///
///   • **InitProject** – project scaffolding  
///   • **BuildCommand** – build output generator  
///   • **RunCommand** – runtime renderer / local server  
///   • **AnalyzeCommand** – static analyzer + UI inspector  
///   • **DocsCommand** – generate documentation  
///   • **CleanCommand** – clean temp/cache output  
///   • **VersionCommand** – manual version print  
///
/// Each command receives the same verbose/help settings for consistent behavior.
///
///
/// # Version Handling
///
/// `run()` intercepts `--version` before invoking the main command runner:
///
/// ```dart
/// if (args.contains('--version')) {
///   print('${PackageProfile.kAppName} v${PackageProfile.kVersion}');
///   return;
/// }
/// ```
///
/// This mirrors tools like Flutter, Dart, npm, and Git.
///
///
/// # Overridden Run Behavior
///
/// After handling version requests, all remaining argument parsing and command
/// execution is delegated to:
///
/// ```dart
/// super.run(args);
/// ```
///
/// allowing the underlying command system to handle:
///   • required arguments  
///   • usage exceptions  
///   • command-specific errors  
///
///
/// # Summary
///
/// `FlutterJSCommandRunner` is the orchestration layer for the entire CLI.  
/// It provides:
///
///   ✔ Unified argument parsing  
///   ✔ Centralized flag handling  
///   ✔ Automatic registration of all tool commands  
///   ✔ Clean version/reporting behavior  
///   ✔ Configurable verbosity & logging  
///
/// Every CLI feature ultimately flows through this runner.
///


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
