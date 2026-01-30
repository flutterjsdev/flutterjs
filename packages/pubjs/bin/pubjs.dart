import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:pubjs/pubjs.dart';

void main(List<String> args) async {
  final runner = CommandRunner('pubjs', 'FlutterJS Package Manager')
    ..addCommand(PubBuildCommand())
    ..addCommand(GetCommand());

  try {
    await runner.run(args);
  } catch (e) {
    print('Error: $e');
    exit(1);
  }
}
