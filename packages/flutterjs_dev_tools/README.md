# FlutterJS Dev Tools

**Package**: `flutterjs_dev_tools`  
**Purpose**: Development tools, debugging utilities, and IR visualization for FlutterJS

---

## Overview

`flutterjs_dev_tools` provides essential development and debugging tools for FlutterJS development. It includes IR visualization, integrated debugging, HTML generation utilities, and performance monitoring.

**What it provides:**
- 🐛 **Integrated Debugger** - Debug FlutterJS builds with detailed logging
- 📊 **IR Server** - Visualize IR in a web interface
- 🌐 **HTML Generator** - Generate HTML from IR
- 📈 **Performance Monitoring** - Track build performance
- 🔍 **IR Inspection** - Browse and inspect IR structures

---

## Features

### 1. Integrated Debugger

Advanced debugging system with categorized logging and performance tracking.

**Features:**
- Hierarchical log categories
- Debug levels (info, debug, warn, error)
- Performance timing with `observe()`
- Color-coded console output
- Time-based filtering

**Usage:**

```dart
import 'package:flutterjs_dev_tools/dev_tools.dart';

// Log messages
debugger.log(
  DebugLevel.info,
  'Starting analysis',
  category: 'analyzer',
);

// Track performance
await debugger.observe('file_analysis', () async {
  await analyzeFile(path);
}, category: 'performance');

// Enable/disable categories
debugger.enableCategory('analyzer');
debugger.disableCategory('codegen');

// Set global log level
debugger.setLogLevel(DebugLevel.debug);
```

### 2. IR Server

Web-based IR visualization server for inspecting generated IR.

**Features:**
- Browse file IR structures
- View IR in JSON format
- Inspect widget trees
- Navigate dependencies
- Search IR nodes

**Usage:**

```dart
import 'package:flutterjs_dev_tools/dev_tools.dart';

// Start IR server
final server = IRServer(
  port: 8080,
  irDirectory: 'build/ir',
);

await server.start();
print('IR Server: http://localhost:8080');

// Access features:
// - View IR files
// - Browse widget trees
// - Inspect dependencies
// - Search IR content
```

**Web Interface:**
- `http://localhost:8080/` - IR file browser
- `http://localhost:8080/ir/<file>` - View specific IR
- `http://localhost:8080/widgets` - Widget tree view
- `http://localhost:8080/search?q=<query>` - Search IR

### 3. HTML Generator

Generate HTML visualizations from IR structures.

**Features:**
- Convert IR to readable HTML
- Syntax highlighting
- Collapsible sections
- Widget tree visualization
- Export to HTML file

**Usage:**

```dart
import 'package:flutterjs_dev_tools/dev_tools.dart';

final generator = HTMLGenerator();

// Generate HTML from file IR
final html = generator.generateFromFileIR(fileIR);

// Save to file
await File('output.html').writeAsString(html);

// Generate widget tree HTML
final widgetHtml = generator.generateWidgetTree(widgetIR);
```

---

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  flutterjs_dev_tools: ^1.0.0
```

Or for development only:

```yaml
dev_dependencies:
  flutterjs_dev_tools: ^1.0.0
```

---

## Quick Start

### Enable Debugging

```dart
import 'package:flutterjs_dev_tools/dev_tools.dart';

void main() async {
  // Configure debugger
  debugger.setLogLevel(DebugLevel.debug);
  debugger.enableCategory('analyzer');
  debugger.enableCategory('codegen');
  
  // Your FlutterJS code
  final analyzer = ProjectAnalyzer(projectPath);
  await analyzer.initialize();
  
  await debugger.observe('full_analysis', () async {
    final result = await analyzer.analyzeProject();
  }, category: 'analyzer');
}
```

### Start IR Visualization Server

```dart
import 'package:flutterjs_dev_tools/dev_tools.dart';

void main() async {
  final server = IRServer(
    port: 8080,
    irDirectory: 'build/ir',
  );
  
  await server.start();
  
  print('🚀 IR Server running at http://localhost:8080');
  print('   Press Ctrl+C to stop');
  
  // Keep server running
  await ProcessSignal.sigint.watch().first;
  await server.stop();
}
```

---

## Debug Levels

```dart
enum DebugLevel {
  info,     // General information
  debug,    // Detailed debug info
  warn,     // Warnings
  error,    // Errors
}
```

**Setting log level:**

```dart
// Show only warnings and errors
debugger.setLogLevel(DebugLevel.warn);

// Show all debug information
debugger.setLogLevel(DebugLevel.debug);
```

---

## Debug Categories

Organize logs by category:

**Common categories:**
- `analyzer` - Code analysis
- `codegen` - Code generation
- `ir` - IR operations
- `performance` - Performance tracking
- `validation` - Validation
- `output` - File output

**Usage:**

```dart
// Enable specific categories
debugger.enableCategory('analyzer');
debugger.enableCategory('codegen');

// Disable noisy categories
debugger.disableCategory('debug');

// Check if category is enabled
if (debugger.isCategoryEnabled('analyzer')) {
  // Log detailed analyzer info
}
```

---

## Performance Monitoring

Track execution time of operations:

```dart
// Track single operation
final duration = await debugger.observe(
  'operation_name',
  () async {
    await expensiveOperation();
  },
  category: 'performance',
);

print('Operation took ${duration}ms');

// Track multiple operations
await debugger.observe('analyze_file', () async {
  await analyzeFile('main.dart');
}, category: 'analyzer');

await debugger.observe('generate_ir', () async {
  await generateIR(fileIR);
}, category: 'codegen');
```

**Performance reports:**

```dart
// Get performance summary
final stats = debugger.getPerformanceStats();
for (final entry in stats.entries) {
  print('${entry.key}: ${entry.value}ms');
}
```

---

## IR Visualization

### Viewing IR Structures

```dart
// Generate IR visualization
final irView = IRViewer(fileIR);

// Generate HTML
final html = irView.toHTML();

// Save to file
await File('ir_view.html').writeAsString(html);

// View in browser
Process.run('open', ['ir_view.html']);  // macOS
Process.run('start', ['ir_view.html']); // Windows
Process.run('xdg-open', ['ir_view.html']); // Linux
```

### Widget Tree Visualization

```dart
final widgetViewer = WidgetTreeViewer(widgetIR);

// Generate tree diagram
final treeDiagram = widgetViewer.generateTree();
print(treeDiagram);

// Generate interactive HTML
final html = widgetViewer.toHTML();
```

---

## Integration with FlutterJS

### In Analyzer

```dart
import 'package:flutterjs_dev_tools/dev_tools.dart';

class ProjectAnalyzer {
  Future<ProjectAnalysisResult> analyzeProject() async {
    return await debugger.observe('full_project_analysis', () async {
      debugger.log(
        DebugLevel.info,
        'Starting analysis of project at $projectPath',
        category: 'analyzer',
      );
      
      // Your analysis code
      final result = await _runAnalysis();
      
      debugger.log(
        DebugLevel.info,
        'Analysis complete: ${result.statistics.totalFiles} files',
        category: 'analyzer',
      );
      
      return result;
    }, category: 'analyzer');
  }
}
```

### In Code Generator

```dart
import 'package:flutterjs_dev_tools/dev_tools.dart';

class JavaScriptGenerator {
  Future<void> generate(FileIR fileIR) async {
    await debugger.observe('js_generation', () async {
      debugger.log(
        DebugLevel.debug,
        'Generating JS for ${fileIR.path}',
        category: 'codegen',
      );
      
      // Generate code
      final js = _generateJS(fileIR);
      
      debugger.log(
        DebugLevel.debug,
        'Generated ${js.length} bytes',
        category: 'codegen',
      );
    }, category: 'codegen');
  }
}
```

---

## Advanced Usage

### Custom Log Formatters

```dart
// Customize log output
debugger.setFormatter((level, message, category, timestamp) {
  return '[$timestamp] $category/$level: $message';
});
```

### Conditional Logging

```dart
// Only log in debug mode
if (kDebugMode) {
  debugger.log(DebugLevel.debug, 'Debug info', category: 'dev');
}

// Log with conditions
debugger.logIf(
  condition: verbose,
  level: DebugLevel.debug,
  message: 'Verbose output',
  category: 'debug',
);
```

### Performance Thresholds

```dart
// Warn if operation takes too long
await debugger.observe('slow_operation', () async {
  await operation();
}, category: 'performance', warnThresholdMs: 1000);
```

---

## Best Practices

1. **Use categories** - Organize logs by component
2. **Set appropriate levels** - Use debug for details, info for general
3. **Monitor performance** - Use `observe()` for expensive operations
4. **Disable in production** - Only enable in development builds
5. **Clean up** - Remove debug logs from production code

---

## Configuration

### Environment Variables

```bash
# Enable debug mode
export FLUTTERJS_DEBUG=true

# Set log level
export FLUTTERJS_LOG_LEVEL=debug

# Enable categories
export FLUTTERJS_DEBUG_CATEGORIES=analyzer,codegen

# Enable IR server
export FLUTTERJS_IR_SERVER=true
export FLUTTERJS_IR_PORT=8080
```

### Configuration File

Create `flutterjs_debug.yaml`:

```yaml
debug:
  enabled: true
  log_level: debug
  categories:
    - analyzer
    - codegen
    - performance
  
ir_server:
  enabled: true
  port: 8080
  auto_open: true

performance:
  track_all: true
  warn_threshold_ms: 1000
```

---

## Troubleshooting

### Debug logs not showing

```dart
// Check if category is enabled
debugger.enableCategory('your_category');

// Check log level
debugger.setLogLevel(DebugLevel.debug);
```

### IR server won't start

```bash
# Check if port is in use
lsof -i :8080

# Try different port
IRServer(port: 8081)
```

### Performance monitoring not working

```dart
// Ensure category is enabled
debugger.enableCategory('performance');

// Check if observe() wraps the entire operation
await debugger.observe('op', () async {
  // All code here
});
```

---

## See Also

- [FlutterJS Core](../flutterjs_core/README.md) - IR models
- [FlutterJS Analyzer](../flutterjs_analyzer/README.md) - Analysis engine
- [Contributing Guide](../../docs/contributing/CONTRIBUTING.md)
