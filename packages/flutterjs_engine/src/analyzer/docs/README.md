# Analyzer Documentation

Documentation for `@flutterjs/analyzer`, the static analysis engine for FlutterJS.

## Contents

- **[Architecture](architecture.md)**: Detailed explanation of the 10-step analysis pipeline.
- **[Usage Guide](usage.md)**: How to use the CLI and JS API.

## Quick Start

```bash
# Run analysis on a file
node dist/analyzer.js src/main.js
```

## Purpose

The analyzer is effectively a "compiler frontend" for FlutterJS. It doesn't generate code (that's `flutterjs_gen`'s job), but it *understands* the code. It is used to:
1.  **Validate** widget structure before runtime.
2.  **Optimize** the build (e.g., removing unused imports).
3.  **Ensure** SSR compatibility by flagging unsafe code.
4.  **Debug** app structure by visualizing the widget tree.
