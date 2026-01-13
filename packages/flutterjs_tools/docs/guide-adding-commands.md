# Guide: Adding New Commands

How to add a new command to the FlutterJS CLI.

---

## Step 1: Create Command Class

Create a new file in `lib/src/commands/` (or appropriate logical directory like `lib/src/my_feature/`).

```dart
import 'dart:async';
import 'package:args/command_runner.dart';

class MyCommand extends Command {
  @override
  final name = 'my-command';

  @override
  final description = 'Description of what my command does.';

  MyCommand() {
    // Add flags and options
    argParser.addFlag(
      'force',
      abbr: 'f',
      help: 'Force execution.',
      defaultsTo: false,
    );
  }

  @override
  Future<void> run() async {
    final force = argResults?['force'] as bool;
    
    print('Running my-command with force=$force');
    
    // logic here
  }
}
```

---

## Step 2: Register Command

Open `lib/src/runner.dart` and add your command to the runner.

```dart
import 'commands/my_command.dart';

class FlutterJsRunner extends CommandRunner<void> {
  FlutterJsRunner() : super(...) {
    // ... other commands
    addCommand(MyCommand()); // Register here
  }
}
```

---

## Step 3: Export from Library

Ensure your command is exported in `lib/flutterjs_tools.dart` if it needs to be accessible programmatically, or just keeps it internal if only used by the runner.

---

## Best Practices

1. **Clear Description**: Provide a concise description for `--help`.
2. **Standard Flags**: Use standard flags like `--help`, `--verbose` where applicable.
3. **Error Handling**: Use `UsageException` for invalid arguments.
4. **Separation of Concerns**: Keep command logic separate from business logic (put business logic in a service/manager class).

---

## See Also

- [CLI Architecture](architecture.md)
- [Command Implementation](guide-commands.md)
