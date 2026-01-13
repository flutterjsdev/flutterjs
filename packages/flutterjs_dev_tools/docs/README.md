# FlutterJS Dev Tools - Technical Documentation

Technical documentation for the `flutterjs_dev_tools` package.

> [!NOTE]
> For general package overview, see the [main README](../README.md).

---

## Documentation Index

### Core Features

- **[Integrated Debugger](debugger.md)** - Advanced debugging system
  - Log categories and levels
  - Performance observation
  - Operation tracking
  - Interactive debugging

- **[IR Server](ir-server.md)** - Web-based IR visualization
  - Starting the server
  - Web interface
  - API endpoints
  - Configuration

- **[HTML Generator](html-generator.md)** - Generate HTML visualizations
  - IR to HTML conversion
  - Widget tree visualization
  - Customization options

### Guides

- **[Debugging Best Practices](guide-debugging.md)** - How to debug effectively
- **[Performance Monitoring](guide-performance.md)** - Track and optimize performance
- **[IR Visualization](guide-ir-visualization.md)** - Visualize and inspect IR

---

## Quick Links

- [Package README](../README.md)
- [FlutterJS Core](../../flutterjs_core/README.md)
- [FlutterJS Analyzer](../../flutterjs_analyzer/README.md)

---

## Component Overview

```
flutterjs_dev_tools
├── Debugger
│   ├── Log management
│   ├── Performance tracking
│   ├── Operation observation
│   └── Interactive debugging
│
├── IR Server
│   ├── Web interface
│   ├── File browser
│   ├── Widget tree viewer
│   └── Search functionality
│
└── HTML Generator
    ├── IR visualization
    ├── Widget tree rendering
    └── Syntax highlighting
```

---

## Integration

### With Analyzer

```dart
import 'package:flutterjs_dev_tools/dev_tools.dart';

final analyzer = ProjectAnalyzer(projectPath);

await debugger.observe('analyze_project', () async {
  return await analyzer.analyzeProject();
}, category: 'analyzer');
```

### With Code Generator

```dart
import 'package:flutterjs_dev_tools/dev_tools.dart';

await debugger.observe('generate_js', () async {
  final js = await generator.generate(fileIR);
}, category: 'codegen');
```

---

## Development

### Running Tests

```bash
cd packages/flutterjs_dev_tools
dart test
```

### Starting IR Server

```bash
dart run example/start_ir_server.dart
```

---

## See Also

- [Main Package README](../README.md)
- [FlutterJS Architecture](../../../docs/architecture/overview.md)
- [Contributing Guide](../../../docs/contributing/CONTRIBUTING.md)
