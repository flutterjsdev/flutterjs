# Integrated Debugger

Comprehensive guide to the FlutterJS integrated debugger system.

---

## Overview

The integrated debugger provides:
- Categorized logging
- Performance tracking
- Operation observation  
- Interactive debugging
- File watching

---

## Debug Levels

```dart
enum DebugLevel {
  trace,    // Most detailed
  debug,    // Debug information
  info,     // General information
  warn,     // Warnings
  error,    // Errors only
}
```

### Setting Log Level

```dart
// Show everything
debugger.minLevel = DebugLevel.trace;

// Show only warnings and errors
debugger.minLevel = DebugLevel.warn;
```

---

## Categories

Organize logs by component:

```dart
// Log with category
debugger.log(
  DebugLevel.info,
  'Analysis started',
  category: 'analyzer',
);

debugger.log(
  DebugLevel.debug,
  'Generating JavaScript',
  category: 'codegen',
);
```

**Common categories:**
- `analyzer` - Code analysis
- `codegen` - Code generation
- `ir` - IR operations
- `performance` - Performance tracking
- `validation` - Validation checks
- `watcher` - File watching
- `general` - Uncategorized

---

## Performance Observation

Track operation performance automatically:

```dart
// Async operation
final result = await debugger.observe(
  'operation_name',
  () async {
    return await expensiveOperation();
  },
  category: 'performance',
);

// Sync operation
final result = debugger.observeSync(
  'operation_name',
  () {
    return expensiveComputation();
  },
  category: 'performance',
);
```

### What Gets Tracked

- Execution time (duration)
- Memory usage (delta)
- Success/failure
- Error messages (if failed)

---

## Initialization

### From CLI Flags

```dart
FlutterJSIntegratedDebugger.initFromCliFlags(
  verbose: true,
  verboseHelp: false,
  watch: true,
);
```

**Flags:**
- `verbose` - Enable debugger
- `verboseHelp` - Enable trace level + interactive mode
- `watch` - Enable file watching

### Manual Configuration

```dart
final debugger = FlutterJSIntegratedDebugger();

debugger.enabled = true;
debugger.minLevel = DebugLevel.debug;
debugger.enableMetrics = true;
debugger.watchFiles = true;
debugger.interactiveMode = false;
```

---

## Performance Metrics

View performance summary at the end:

```dart
// Auto-printed at end of run
debugger.printSummary();

// Force print summary
debugger.printSummary(force: true);

// Reset metrics (for watch mode)
debugger.resetMetrics();
```

**Output example:**
```
📊 Performance Summary:
analyze_project:1x avg1234ms tot1234ms | 
generate_ir:5x avg45ms tot225ms | 
validate_ir:5x avg12ms tot60ms
Total: 1.52s
```

---

## File Watching

### Smart File Watcher

```dart
final watcher = SmartFileWatcher(
  watchDir: 'lib',
  debounceTime: Duration(milliseconds: 500),
);

watcher.onChange((changedFiles) {
  print('Files changed: $changedFiles');
  // Trigger rebuild
});

await watcher.start();
```

**Features:**
- Debouncing (avoids rapid triggers)
- Batch change notification
- Watches `.dart` files only

---

## Interactive Mode

Enable for debugging errors:

```dart
debugger.interactiveMode = true;

// On error, will show:
// ❌ Error in operation_name
//    Error: <error message>
//    Stack: <first stack frame>
```

---

## Best Practices

1. **Use categories** - Organize logs by component
2. **Use observe()** - Always wrap expensive operations
3. **Set appropriate levels** - Don't spam with trace logs
4. **Check enabled** - Don't compute expensive values if disabled
5. **Reset metrics** - In watch mode, reset between runs

---

## Examples

### Basic Logging

```dart
debugger.enabled = true;

debugger.log(DebugLevel.info, 'Starting...', category: 'app');
debugger.log(DebugLevel.debug, 'Details', category: 'app', value: {'count': 5});
debugger.log(DebugLevel.warn, 'Warning!', category: 'app');
debugger.log(DebugLevel.error, 'Failed!', category: 'app');
```

### Performance Tracking

```dart
// Single operation
await debugger.observe('analyze_file', () async {
  await analyzer.analyzeFile('main.dart');
}, category: 'analyzer');

// Nested operations
await debugger.observe('full_build', () async {
  await debugger.observe('analyze', () async {
    await analyzer.analyze();
  }, category: 'analyzer');
  
  await debugger.observe('codegen', () async {
    await generator.generate();
  }, category: 'codegen');
}, category: 'build');
```

### Conditional Logging

```dart
// Only if enabled
if (debugger.enabled) {
  final details = computeExpensiveDetails();
  debugger.log(DebugLevel.debug, 'Details', category: 'app', value: details);
}
```

---

## See Also

- [Package README](../README.md)
- [Performance Monitoring Guide](guide-performance.md)
- [Debugging Best Practices](guide-debugging.md)
