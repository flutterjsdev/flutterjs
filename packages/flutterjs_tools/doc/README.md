# FlutterJS CLI Tools - Technical Documentation

Technical documentation for the `flutterjs_tools` package.

> [!NOTE]
> For user-facing CLI command reference, see [CLI Commands Guide](../../../docs/getting-started/cli-commands.md).

---

## Documentation Index

### Architecture

- **[CLI Architecture](architecture.md)** - Command structure and runner
- **[Command Implementation](guide-commands.md)** - How commands are implemented
- **[Engine Bridge](engine-bridge.md)** - Interface with the runtime engine

### Guides

- **[Adding New Commands](guide-adding-commands.md)** - Step-by-step guide
- **[Runner Integration](guide-runner.md)** - How the runner orchestrates tools

---

## Quick Links

- [Package README](../README.md)
- [FlutterJS Analyzer](../../flutterjs_analyzer/README.md)
- [FlutterJS Gen](../../flutterjs_gen/README.md)

---

## Usage for Contributors

### Running from Source

```bash
# From package root
dart lib/src/runner.dart [command]

# Or if bin/ exists
dart bin/flutterjs.dart [command]
```

### Debugging

The CLI integrates with `flutterjs_dev_tools` for debugging. Use `--verbose` flag to enable debug output.

```bash
flutterjs run --verbose
```

---

## Command Structure

```dart
class BuildCommand extends Command {
  @override
  final name = 'build';
  
  @override
  final description = 'Builds the application for production.';
  
  BuildCommand() {
    argParser.addFlag('optimize', help: 'Enable optimizations');
  }
  
  @override
  Future<void> run() async {
    // Implementation
  }
}
```

---

## See Also

- [Main Package README](../README.md)
- [Contributing Guide](../../../docs/contributing/CONTRIBUTING.md)
