import 'dart:io';
import 'package:args/command_runner.dart';
import '../dev/runner.dart';

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
