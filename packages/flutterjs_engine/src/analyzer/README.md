# @flutterjs/analyzer

**Package**: `@flutterjs/analyzer`  
**Description**: Static analyzer for Flutter widgets in JavaScript.

---

## Overview

The Analyzer package is responsible for parsing and understanding Flutter widget structures in JavaScript. It provides the metadata needed for properties validation, state management, and debugging tools.

## Key Features

- **Parser**: Parses Flutter-like syntax in JS/Dart.
- **Widget Analyzer**: inspects widget classes to extract properties and state.
- **Report Generator**: Generates analysis reports for the CLI.
- **Import Resolver**: Resolves Flutter framework imports.

## Architecture

The analyzer works at build-time (Node.js) to validate code before bundling.

```
Input (Code) → Lexer → Parser → Analyzer → Report (JSON)
```

## Exports

- `context_analyzer.js`: Analyzes build context usage.
- `state_analyzer_implementation.js`: Analyzes `setState` calls.
- `flutterjs_report_generator.js`: Creates build reports.

## Usage

Used primarily by the `flutterjs_engine` CLI during the build process.

```javascript
import { FlutterJSWidgetAnalyzer } from '@flutterjs/analyzer';

const analyzer = new FlutterJSWidgetAnalyzer();
const report = await analyzer.analyze('src/main.js');
```
