# CLI Commands

Complete reference for FlutterJS command-line interface.

## Overview

FlutterJS provides a Dart CLI for analyzing and converting Flutter code to JavaScript, plus a JavaScript CLI for serving and building applications.

---

## Dart CLI

The Dart CLI handles the conversion pipeline: Dart → IR → JavaScript.

> [!NOTE]
> For a detailed breakdown of the analysis and generation phases, see [Dart CLI Pipeline Architecture](../architecture/dart-cli-pipeline.md).


### Basic Usage

```bash
dart run bin/flutterjs.dart [command] [options]
```

### `run` Command

Analyzes, converts, and optionally serves your Flutter app.

```bash
dart run bin/flutterjs.dart run [options]
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project, -p <path>` | Path to Flutter project root | `.` (current directory) |
| `--source, -s <path>` | Source directory relative to project | `lib` |
| `--to-js` | Convert IR to JavaScript | `false` |
| `--serve` | Start dev server after conversion | `false` |
| `--server-port <port>` | Dev server port | `3000` |
| `--open-browser` | Open browser automatically | `true` |
| `--js-optimization-level <0-3>` | JavaScript optimization level | `1` |
| `--validate-output` | Validate generated JavaScript | `true` |
| `--incremental` | Only reprocess changed files | `true` |
| `--parallel` | Enable parallel processing | `true` |
| `--verbose, -v` | Show detailed logs | `false` |

#### Examples

**Basic conversion:**
```bash
dart run bin/flutterjs.dart run --to-js
```

**Convert and serve:**
```bash
dart run bin/flutterjs.dart run --to-js --serve
```

**Custom port:**
```bash
dart run bin/flutterjs.dart run --to-js --serve --server-port 4000
```

**Verbose output:**
```bash
dart run bin/flutterjs.dart run --to-js --serve --verbose
```

**Different project:**
```bash
dart run bin/flutterjs.dart run --project ../my-other-app --to-js --serve
```

---

## JavaScript CLI

*Note: The JavaScript CLI (`flutterjs` command) is planned for npm distribution. Currently, use the Dart CLI for building and the engine bridge for serving.*

### Planned Commands

```bash
flutterjs init <name>       # Create new project
flutterjs dev               # Start dev server
flutterjs build             # Production build
flutterjs preview           # Preview production build
```

### Build Options (Planned)

```bash
flutterjs build [options]

Options:
  --mode <mode>           Rendering mode: csr | ssr | hybrid
  --output <dir>          Output directory (default: dist)
  --minify               Enable minification
  --no-minify            Disable minification
  --sourcemap            Generate source maps
```

---

## Development Workflow

### 1. Initial Setup

```bash
# Navigate to your Flutter project
cd examples/counter

# Run full pipeline with dev server
dart run ../../bin/flutterjs.dart run --to-js --serve
```

### 2. Development Mode

The dev server watches for file changes and rebuilds automatically:

```bash
dart run bin/flutterjs.dart run --to-js --serve --verbose
```

**What happens:**
1. Analyzer detects changes in `lib/`
2. Regenerates affected files
3. Browser refreshes (manual refresh currently, hot reload planned)

### 3. Stop the Server

Press `q` or `Ctrl+C` in the terminal.

---

## Pipeline Phases

When you run with `--to-js`, the following phases execute:

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 0: Setup & Initialization                                │
│  • Validate project directory                                   │
│  • Initialize Dart analyzer                                     │
│  • Create output directories                                    │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 1: Static Analysis                                       │
│  • Parse Dart AST                                               │
│  • Build dependency graph                                       │
│  • Detect changed files (incremental)                           │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 2: IR Generation (5 Passes)                              │
│  • Pass 1: Declaration Discovery                                │
│  • Pass 2: Symbol Resolution                                    │
│  • Pass 3: Type Inference                                       │
│  • Pass 4: Control-Flow Analysis                                │
│  • Pass 5: Validation & Diagnostics                             │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 3: IR Serialization                                      │
│  • Generate binary IR files                                     │
│  • Save conversion reports                                      │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 4-6: JavaScript Conversion                               │
│  • Convert IR to JavaScript                                     │
│  • Validate generated code                                      │
│  • Optimize (levels 0-3)                                        │
│  • Write .fjs files                                             │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 7: Dev Server (--serve flag)                             │
│  • Spawn flutterjs.exe dev server                              │
│  • Open browser automatically                                   │
│  • Hot reload on file changes                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Optimization Levels

JavaScript optimization can be controlled with `--js-optimization-level`:

| Level | Description | Use Case |
|-------|-------------|----------|
| `0` | No optimization, readable code | Debugging |
| `1` | Basic optimization | Development (default) |
| `2` | Moderate optimization | Pre-production testing |
| `3` | Maximum optimization | Production |

**Example:**
```bash
# Development (readable)
dart run bin/flutterjs.dart run --to-js --js-optimization-level 0

# Production (optimized)
dart run bin/flutterjs.dart run --to-js --js-optimization-level 3
```

---

## Troubleshooting

### Port Already in Use

```bash
Error: Port 3000 is already in use
```

**Solution:** Use a different port:
```bash
dart run bin/flutterjs.dart run --to-js --serve --server-port 4000
```

### Analyzer Errors

```bash
Error: Failed to analyze lib/main.dart
```

**Solution:** Check your Dart syntax:
```bash
dart analyze lib/main.dart
```

### File Not Found

```bash
Error: Project directory not found: /path/to/project
```

**Solution:** Ensure you're in the correct directory or specify the path:
```bash
dart run bin/flutterjs.dart run --project /correct/path --to-js
```

---

## Environment Variables

You can set environment variables to configure FlutterJS:

| Variable | Description | Default |
|----------|-------------|---------|
| `FLUTTERJS_PORT` | Default dev server port | `3000` |
| `FLUTTERJS_VERBOSE` | Enable verbose logging | `false` |

**Example:**
```bash
export FLUTTERJS_PORT=4000
export FLUTTERJS_VERBOSE=true
dart run bin/flutterjs.dart run --to-js --serve
```

---

## Next Steps

- Understand [Project Structure](project-structure.md)
- Learn about [Widget Catalog](../guides/widget-catalog.md)
- Explore [Architecture](../architecture/overview.md)
