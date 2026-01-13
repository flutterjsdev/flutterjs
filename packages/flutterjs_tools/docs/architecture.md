# CLI Architecture

Architecture of the FlutterJS Code Line Interface.

---

## Overview

The `flutterjs_tools` package uses the standard Dart `args` and `command_runner` packages to provide a structured CLI.

```
FlutterJSCommander (CommandRunner)
    │
    ├── Global Flags (--verbose, --version)
    │
    └── Commands
        ├── CreateCommand
        ├── RunCommand
        ├── BuildCommand
        └── ...
```

---

## Command Runner

The `FlutterJSRunner` in `lib/src/runner.dart` is the entry point. It registers all available commands and handles global error reporting.

```dart
class FlutterJsRunner extends CommandRunner<void> {
  FlutterJsRunner()
      : super('flutterjs', 'Manage FlutterJS application development.') {
    
    addCommand(CreateCommand());
    addCommand(RunCommand());
    addCommand(BuildCommand());
    addCommand(AnalyzeCommand());
    addCommand(CleanCommand());
    // ...
  }
}
```

---

## Architecture Layers

1. **Entry Point** (`bin/flutterjs.dart` or `lib/src/runner.dart`)
   - Parses arguments
   - Initializes runner

2. **Command Layer** (`lib/src/commands/`)
   - Defines command syntax (name, description, flags)
   - Validates arguments
   - Orchestrates execution

3. **Logic Layer** (`lib/src/*/`)
   - Business logic for each command
   - `build/`, `analyze/`, `create/`, etc.

4. **Integration Layer**
   - Calls other packages (`flutterjs_analyzer`, `flutterjs_gen`)
   - File system operations
   - Process management

---

## Engine Bridge

The CLI interacts with the runtime engine via `EngineBridge` (`lib/src/runner/engine_bridge.dart`). This abstraction allows the CLI to execute code in the appropriate environment (e.g., Dart VM, Browser).

---

## See Also

- [Adding New Commands](guide-adding-commands.md)
- [Command Implementation](guide-commands.md)
