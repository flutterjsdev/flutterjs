# FlutterJS CLI Tools

**Package**: `flutterjs_tools`  
**Purpose**: Command-line interface for FlutterJS development

---

## Overview

`flutterjs_tools` provides the command-line interface (CLI) for creating, building, running, and analyzing FlutterJS projects. It serves as the primary tool for developers working with the framework.

---

## Commands

### `flutterjs create`
Creates a new FlutterJS project.

```bash
flutterjs create my_app
```

### `flutterjs run`
Runs the application in development mode with hot reload (planned).

```bash
flutterjs run
flutterjs run -d chrome
```

### `flutterjs build`
Builds the application for production.

```bash
flutterjs build
flutterjs build --optimize
```

### `flutterjs analyze`
Analyzes the project and generates Intermediate Representation (IR).

```bash
flutterjs analyze
```

### `flutterjs clean`
Cleans build artifacts and temporary files.

```bash
flutterjs clean
```

### `flutterjs serve`
Starts a development server.

```bash
flutterjs serve
```

### `flutterjs docs`
Generates project documentation.

```bash
flutterjs docs
```

---

## Installation

The CLI should be activated globally:

```bash
dart pub global activate flutterjs_tools
```

Or used via `flutterjs` command if configured.

---

## Architecture

The CLI is built using `args` and `command_runner`.

```
flutterjs (CommandRunner)
├── analyze (AnalyzeCommand)
├── build (BuildCommand)
├── clean (CleanCommand)
├── create (CreateCommand)
├── docs (DocsCommand)
├── run (RunCommand)
└── version (VersionCommand)
```

### Integration

- **Analyzer**: Calls `flutterjs_analyzer` for code analysis
- **Generator**: Uses `flutterjs_gen` for code generation
- **Dev Tools**: Integrates with `flutterjs_dev_tools` for debugging

---

## Development

### Running Locally

```bash
dart bin/flutterjs.dart [command]
```

### Adding Commands

1. Create command class in `lib/src/commands/`
2. Extend `Command`
3. Register in `lib/src/runner.dart`

---

## See Also

- [CLI Commands Guide](../../docs/getting-started/cli-commands.md) - User-facing guide
- [FlutterJS Core](../flutterjs_core/README.md) - Core engine
- [Contributing Guide](../../docs/contributing/CONTRIBUTING.md)
