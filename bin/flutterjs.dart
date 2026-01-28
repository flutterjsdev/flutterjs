import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:flutterjs_tools/command.dart';

/// ============================================================================
/// Flutter.js CLI Entry Point
/// ============================================================================
///
/// This file defines the main executable for the **Flutter.js** command-line
/// tool. It initializes argument parsing, handles global flags (`-v`, `-h`,
/// `doctor`, etc.), configures logging verbosity, and delegates execution to
/// `FlutterJSCommandRunner`.
///
/// This CLI is designed to be:
///   • Fully cross-platform (supports PowerShell/Windows help conventions)
///   • Verbose/debug-friendly (`-v`, `-vv`)
///   • Compatible with `args` command runner
///   • Extensible through the `FlutterJSCommandRunner` command registry
///
///
/// # Argument Behavior
///
/// ## Verbosity
/// `-v` or `--verbose`
///     Enables verbose logging
///
/// `-vv`
///     Enables **very** verbose logging (highest detail level)
///
///
/// ## Help Flags
/// Supports multiple help shortcuts:
///   • `-h`
///   • `--help`
///   • `help`
///   • PowerShell syntax: `-?`
///   • Windows syntax: `/?`
///
/// Help mode also automatically activates when:
///   • Only one argument is provided *and* it is a verbose flag
///
///
/// ## Doctor Mode
/// Triggered when:
///   • `doctor` is the first argument
///   • Or verbose + `doctor` as the last argument
///
/// Doctor mode prints diagnostic system information.
///
///
/// # Logging Control
///
/// `muteCommandLogging` is enabled when:
///   • Running help OR doctor
///   • AND verbosity is not super-verbose (`-vv`)
///
/// This keeps help/diagnostic output clean by hiding internal command logs.
///
///
/// # Execution Workflow
///
/// ```text
/// args → parse flags → configure verbosity & help → run FlutterJSCommandRunner
///                                                               ↓
///                                                          executes command
/// ```
///
/// Errors are handled gracefully:
///   • `UsageException` → prints usage information, exits with code 64
///   • Any other error → logs message, suggests running `-v` for debug
///
///
/// # Constants
///
/// `version` / `kVersion` → Current Flutter.js CLI version
/// `appName`  / `kAppName` → Display name used by the CLI and commands
///
///
/// # Summary
///
/// This file contains the complete startup logic for the Flutter.js CLI,
/// including:
///   ✔ Flag normalization
///   ✔ Help/doctor routing
///   ✔ Verbose mode handling
///   ✔ Command runner instantiation
///   ✔ Error/exception management
///
/// The actual commands, subcommands, and handlers are registered inside
/// `FlutterJSCommandRunner`, making this entrypoint clean, simple, and easy to
/// extend.
///

const String version = '2.0.0';
const String appName = 'Flutter.js';

const String kVersion = '2.0.0';
const String kAppName = 'Flutter.js';

Future<void> main(List<String> args) async {
  // Parse verbose flags early
  final bool veryVerbose = args.contains('-vv');
  final bool verbose =
      args.contains('-v') || args.contains('--verbose') || veryVerbose;

  // Support universal help idioms (PowerShell, Windows)
  final int powershellHelpIndex = args.indexOf('-?');
  if (powershellHelpIndex != -1) {
    args[powershellHelpIndex] = '-h';
  }
  final int slashQuestionHelpIndex = args.indexOf('/?');
  if (slashQuestionHelpIndex != -1) {
    args[slashQuestionHelpIndex] = '-h';
  }

  final bool help =
      args.contains('-h') ||
      args.contains('--help') ||
      (args.isNotEmpty && args.first == 'help') ||
      (args.length == 1 && verbose);

  final bool doctor =
      (args.isNotEmpty && args.first == 'doctor') ||
      (args.length == 2 && verbose && args.last == 'doctor');

  final bool muteCommandLogging = (help || doctor) && !veryVerbose;
  final bool verboseHelp = help && verbose;

  // Create and run command runner
  final runner = FlutterJSCommandRunner(
    verbose: verbose,
    verboseHelp: verboseHelp,
    muteCommandLogging: muteCommandLogging,
  );

  try {
    await runner.run(args);
  } on UsageException catch (e) {
    print('${e.message}\n');
    print(e.usage);
    exit(64); // Command line usage error
  } catch (e) {
    if (verbose) {
      print('Error: $e');
    } else {
      print('Error: $e');
      print('Run with -v for more details.');
    }
    exit(1);
  }
}
