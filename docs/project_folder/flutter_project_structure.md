# Flutter SDK Project Architecture

## Overview
Structure your project like the Flutter SDK itself — organized by subsystems/packages. This is ideal for large, modular projects where components are loosely coupled.

## Proposed Structure

```
project/
├── packages/                     # Monorepo-style packages
│   ├── engine/                   # Core engine package (90-95%)
│   │   ├── lib/
│   │   │   ├── src/
│   │   │   │   ├── analyzer/
│   │   │   │   │   ├── analyzer.dart
│   │   │   │   │   ├── visitors/
│   │   │   │   │   └── models/
│   │   │   │   ├── parser/
│   │   │   │   │   ├── parser.dart
│   │   │   │   │   ├── tokenizer.dart
│   │   │   │   │   └── models/
│   │   │   │   ├── ir/
│   │   │   │   │   ├── ast.dart
│   │   │   │   │   ├── visitor.dart
│   │   │   │   │   └── models/
│   │   │   │   ├── passes/
│   │   │   │   │   ├── pass_base.dart
│   │   │   │   │   ├── declaration_pass.dart
│   │   │   │   │   ├── flow_analysis_pass.dart
│   │   │   │   │   ├── symbol_resolution_pass.dart
│   │   │   │   │   ├── type_inference_pass.dart
│   │   │   │   │   └── validation_pass.dart
│   │   │   │   ├── code_gen/
│   │   │   │   │   ├── generator.dart
│   │   │   │   │   ├── emitters/
│   │   │   │   │   └── models/
│   │   │   │   ├── binary_constraint/
│   │   │   │   │   ├── constraint_checker.dart
│   │   │   │   │   └── models/
│   │   │   │   └── core/
│   │   │   │       ├── types.dart
│   │   │   │       ├── constants.dart
│   │   │   │       ├── exceptions.dart
│   │   │   │       └── extensions.dart
│   │   │   └── engine.dart       # Main public API (facade)
│   │   ├── test/
│   │   │   ├── analyzer/
│   │   │   ├── parser/
│   │   │   ├── passes/
│   │   │   └── code_gen/
│   │   ├── pubspec.yaml
│   │   └── README.md
│   │
│   ├── cli/                      # CLI tools package (5-10%)
│   │   ├── lib/
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   │   ├── base_command.dart
│   │   │   │   │   ├── analyze_command.dart
│   │   │   │   │   ├── build_command.dart
│   │   │   │   │   ├── clean_command.dart
│   │   │   │   │   ├── dev_server_command.dart
│   │   │   │   │   ├── run_command.dart
│   │   │   │   │   └── docs_command.dart
│   │   │   │   ├── runners/
│   │   │   │   │   └── cli_runner.dart
│   │   │   │   └── utils/
│   │   │   │       ├── logger.dart
│   │   │   │       ├── formatter.dart
│   │   │   │       └── cli_helper.dart
│   │   │   └── cli.dart          # CLI public API
│   │   ├── bin/
│   │   │   └── main.dart         # Entry point
│   │   ├── test/
│   │   ├── pubspec.yaml
│   │   └── README.md
│   │
│   ├── service_init/             # Service initialization package
│   │   ├── lib/
│   │   │   ├── src/
│   │   │   │   ├── initializer.dart
│   │   │   │   ├── service_detector.dart
│   │   │   │   └── models/
│   │   │   └── service_init.dart
│   │   ├── pubspec.yaml
│   │   └── README.md
│   │
│   └── dev_utils/                # Development utilities (shared)
│       ├── lib/
│       │   ├── src/
│       │   │   ├── logger.dart
│       │   │   ├── file_utils.dart
│       │   │   └── models/
│       │   └── dev_utils.dart
│       ├── pubspec.yaml
│       └── README.md
│
├── tool/                         # Build and development scripts
│   ├── build.dart
│   ├── test.dart
│   └── scripts/
│       ├── run_all_tests.sh
│       ├── publish_packages.sh
│       └── format_code.sh
│
├── test/                         # Integration tests
│   ├── integration/
│   │   ├── analyze_test.dart
│   │   ├── build_test.dart
│   │   └── e2e_test.dart
│   └── fixtures/
│
├── analysis_options.yaml         # Shared lint rules
├── pubspec.yaml                  # Root workspace
├── melos.yaml                    # (Optional) Multi-package manager
└── README.md
```

## pubspec.yaml Organization

### Root pubspec.yaml
```yaml
name: my_project
description: My awesome Dart compiler

environment:
  sdk: '>=3.0.0 <4.0.0'

# Workspace packages
workspace:
  - packages/engine
  - packages/cli
  - packages/service_init
  - packages/dev_utils

dev_dependencies:
  lints: ^3.0.0
  test: ^1.25.0
```

### packages/engine/pubspec.yaml
```yaml
name: engine
description: Core analysis and code generation engine

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  dev_utils:
    path: ../dev_utils

dev_dependencies:
  test: ^1.25.0
```

### packages/cli/pubspec.yaml
```yaml
name: cli
description: Command-line interface

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  engine:
    path: ../engine
  dev_utils:
    path: ../dev_utils
  args: ^2.4.0
  
dev_dependencies:
  test: ^1.25.0
```

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         CLI Package (bin/main.dart)         │ ← Entry point
│  (commands, formatters, user interaction)  │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│       Engine Package (core logic)           │ ← Can be used independently
│  (analyzer, parser, IR, passes, codegen)   │
│       All business logic here               │
└─────────────────────────────────────────────┘
                 ↑
     ┌───────────┴──────────────┐
     ↓                          ↓
┌──────────────┐        ┌──────────────────┐
│ service_init │        │  dev_utils       │
│              │        │ (shared helpers) │
└──────────────┘        └──────────────────┘
```

## Key Advantages

✅ **Modularity** — Each package is independent and testable
✅ **Reusability** — Engine can be published to pub.dev and used by others
✅ **Scalability** — Easy to add new packages (web UI, desktop app, etc.)
✅ **Clear dependencies** — Each pubspec.yaml shows what it needs
✅ **Separate tests** — Each package has its own test suite
✅ **Team work friendly** — Different teams can work on different packages
✅ **Monorepo benefits** — Everything in one repo, published together

## File Organization Inside Packages

Every package follows this pattern:

```
packages/engine/
├── lib/
│   ├── src/               # Internal implementation
│   │   ├── analyzer/
│   │   ├── parser/
│   │   └── ...
│   └── engine.dart        # Public API (exports what's needed)
├── test/                  # Tests mirror src/ structure
│   ├── analyzer_test.dart
│   ├── parser_test.dart
│   └── ...
├── pubspec.yaml
└── README.md
```

## Public API Example

```dart
// lib/engine.dart (public API of engine package)
export 'src/analyzer/analyzer.dart';
export 'src/parser/parser.dart';
export 'src/ir/ast.dart';
export 'src/core/exceptions.dart';
export 'src/core/types.dart';

// Users of engine package only see what's exported
// Internal implementation details are hidden in src/
```

## Using Multiple Packages

```dart
// In CLI package
import 'package:engine/engine.dart';
import 'package:dev_utils/dev_utils.dart';

class AnalyzeCommand {
  final engine = Engine();
  
  Future<void> run() async {
    final result = await engine.analyze(path);
    Logger.info(result.toString());
  }
}
```

## Optional: Use Melos for Package Management

If you want automated scripting for all packages:

```yaml
# melos.yaml
name: my_project
packages:
  - packages/**

scripts:
  test:all:
    run: melos exec -- dart test
    description: Run tests for all packages
  
  analyze:all:
    run: melos exec -- dart analyze
    description: Analyze all packages
```

Then run: `melos test:all` to test everything.

## Migration Path

```
1. Create packages/ folder
2. Move engine → packages/engine/
3. Move CLI → packages/cli/
4. Extract common utils → packages/dev_utils/
5. Create root pubspec.yaml with workspace
6. Update imports to use package names
7. Test each package independently
```

## Example: Future Expansion

With this structure, adding new frontends is trivial:

```
packages/
├── engine/           # Existing core
├── cli/              # Existing CLI
├── web_ui/           # New: Web dashboard (Flutter Web)
├── ide_plugin/       # New: IDE plugin for VS Code
├── grpc_server/      # New: gRPC API server
└── desktop_ui/       # New: Desktop app (Flutter Desktop)
```

All use the same `engine` package, no duplication.