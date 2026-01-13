# FlutterJS Analyzer

**Package**: `flutterjs_analyzer`  
**Purpose**: Dart code analysis and dependency resolution for FlutterJS projects

---

## Overview

The `flutterjs_analyzer` package is the core analysis engine of FlutterJS. It analyzes Flutter/Dart source code, builds dependency graphs, resolves types, and prepares code for conversion to JavaScript.

**Key responsibilities:**
- Parse Dart AST (Abstract Syntax Tree)
- Build dependency graphs
- Resolve type information
- Track imports/exports
- Detect circular dependencies
- Generate analysis reports

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  ProjectAnalyzer (Main Entry Point)                     │
│  • Orchestrates multi-phase analysis                    │
│  • Manages analysis pipeline                            │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Dependency   │ │ Type         │ │ Incremental  │
│ Resolver     │ │ Registry     │ │ Cache        │
│              │ │              │ │              │
│ • Build graph│ │ • Track types│ │ • File hashes│
│ • Detect     │ │ • Resolve    │ │ • Cache      │
│   cycles     │ │   references │ │   results    │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## Core Components

### ProjectAnalyzer

Main analyzer class that orchestrates the analysis pipeline.

**Located in**: `lib/src/analying_project.dart`

**Usage:**

```dart
import 'package:flutterjs_analyzer/flutterjs_analyzer.dart';

// Create analyzer instance
final analyzer = ProjectAnalyzer(
  '/path/to/flutter/project',
  buildDir: '/path/to/build',
  enableVerboseLogging: true,
  maxParallelism: 4,
);

// Initialize
await analyzer.initialize();

// Run analysis
final result = await analyzer.analyzeProject();

// Access results
print('Analyzed ${result.statistics.totalFiles} files');
print('Found ${result.statistics.errorFiles} files with errors');

// Clean up
analyzer.dispose();
```

**Constructor parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `projectPath` | String | required | Path to Flutter project root |
| `buildDir` | String? | `build/` | Build output directory |
| `outputDir` | String? | `build/analysis_output/` | Analysis output directory |
| `maxParallelism` | int | 4 | Max parallel file processing |
| `enableVerboseLogging` | bool | true | Enable detailed logs |
| `generateOutputFiles` | bool | true | Generate JSON analysis files |
| `excludePatterns` | List<String> | See code | Files to exclude from analysis |

---

### DependencyResolver

Builds and manages file dependency graphs.

**Located in**: `lib/src/dependency_resolver.dart`

**Features:**
- Discovers all Dart files in project
- Resolves import dependencies
- Builds directed graph
- Detects circular dependencies
- Provides topological sort for build order

**Usage:**

```dart
final resolver = DependencyResolver(projectPath);
final graph = await resolver.buildGraph();

// Get build order
final buildOrder = graph.topologicalSort();

// Detect cycles
final cycles = graph.detectCycles();
if (cycles.isNotEmpty) {
  print('Found ${cycles.length} circular dependencies');
}
```

---

### TypeRegistry

Tracks type declarations and resolves type references.

**Located in**: `lib/src/type_registry.dart`

**Features:**
- Register class declarations
- Register function declarations
- Track type parameters
- Resolve type references
- Handle generic types

**Usage:**

```dart
final registry = TypeRegistry();

// Register a class
registry.registerClass('MyWidget', classElement);

// Check if type exists
if (registry.hasType('StatefulWidget')) {
  final info = registry.getType('StatefulWidget');
}

// Get all registered types
print('Total types: ${registry.typeCount}');
```

---

### IncrementalCache

Caches analysis results for faster incremental builds.

**Located in**: `lib/src/incremental_cache.dart`

**Features:**
- Hash-based file change detection
- Cache analysis results
- Skip unchanged files
- Persistent cache storage

---

## Analysis Pipeline

The analyzer uses a multi-phase approach:

```
PHASE 0: Initialization
├─ Validate project structure
├─ Create output directories
└─ Initialize Dart analyzer context

PHASE 1: Dependency Graph
├─ Discover all Dart files
├─ Parse import/export directives
├─ Build dependency graph
└─ Detect circular dependencies

PHASE 3: Type Resolution
├─ Parse Dart AST for each file
├─ Visit type declarations
├─ Register types in registry
└─ Resolve type references

PHASE 5: Output Generation
├─ Generate dependency graph JSON
├─ Generate type registry JSON
├─ Generate import analysis JSON
├─ Generate analysis summary
└─ Generate statistics report
```

---

## Generated Output Files

When `generateOutputFiles: true`, the analyzer creates:

```
build/analysis_output/
├── dependencies/
│   └── graph.json              # Dependency graph data
├── types/
│   └── registry.json           # All types found
├── imports/
│   └── analysis.json           # Import/export analysis
└── reports/
    ├── summary.json            # Analysis summary
    └── statistics.json         # Detailed statistics
```

### dependency graph.json

Lists all files and their dependencies:

```json
{
  "nodes": [
    {
      "path": "lib/main.dart",
      "dependencies": ["lib/widgets/my_widget.dart"],
      "dependents": []
    }
  ],
  "totalFiles": 10,
  "analysisOrder": ["lib/widgets/my_widget.dart", "lib/main.dart"]
}
```

### types/registry.json

All type declarations found:

```json
{
  "classes": [
    {
      "name": "MyWidget",
      "filePath": "lib/widgets/my_widget.dart",
      "isAbstract": false,
      "superClass": "StatelessWidget",
      "interfaces": [],
      "typeParameters": []
    }
  ],
  "totalTypes": 25
}
```

### imports/analysis.json

Import usage statistics:

```json
{
  "internalImports": {
    "lib/main.dart": ["widgets/my_widget.dart"]
  },
  "externalImports": [
    "package:flutter/material.dart",
    "dart:core"
  ],
  "uniqueExternalCount": 5
}
```

### reports/summary.json

High-level analysis summary:

```json
{
  "timestamp": "2026-01-13T23:40:00Z",
  "projectPath": "/path/to/project",
  "analysisDuration": "1234ms",
  "summary": {
    "totalFiles": 10,
    "processedFiles": 10,
    "errorFiles": 0,
    "changedFiles": 10,
    "errorRate": "0%"
  },
  "performance": {
    "avgTimePerFile": "123.4ms",
    "throughput": "8 files/sec"
  }
}
```

---

## API Reference

### ProjectAnalysisResult

Result object returned by `analyzeProject()`.

**Properties:**

```dart
class ProjectAnalysisResult {
  Set<String> changedFiles;          // Files that changed
  Map<String, ParsedFileInfo> parsedUnits;  // Parsed file data
  DependencyGraph dependencyGraph;    // Dependency graph
  TypeRegistry typeRegistry;          // Type information
  List<String> analysisOrder;         // Build order
  AnalysisStatistics statistics;      // Analysis stats
}
```

**Methods:**

```dart
// Get parsed file info
ParsedFileInfo? getParsedFile(String filePath);

// Get files needing IR generation
List<String> getFilesNeedingIR();

// Get all parsed files
List<String> getAllParsedFiles();
```

### FileAnalysisResult

Result of analyzing a single file.

**Properties:**

```dart
class FileAnalysisResult {
  String path;                  // File path
  CompilationUnit unit;         // Parsed AST
  LibraryElement libraryElement;// Library info
  List<Diagnostic> errors;      // Errors/warnings
  List<ImportInfo> imports;     // Import directives
  List<String> exports;         // Export directives
  List<String> parts;           // Part directives
  String hash;                  // Content hash
  
  bool get hasErrors;           // Has compilation errors?
  List<Diagnostic> get errorList;  // Just errors
  List<Diagnostic> get warnings;   // Just warnings
}
```

### AnalysisStatistics

Performance and statistics information.

**Properties:**

```dart
class AnalysisStatistics {
  int totalFiles;          // Total files found
  int processedFiles;      // Files successfully processed
  int cachedFiles;         // Files loaded from cache
  int errorFiles;          // Files with errors
  int durationMs;          // Total duration in milliseconds
  int changedFiles;        // Files that changed
  
  double get errorRate;         // Error percentage
  double get cacheHitRate;      // Cache hit percentage
  double get avgTimePerFile;    // Average time per file
  double get throughput;        // Files per second
}
```

---

## Usage in FlutterJS CLI

The analyzer is used by the Dart CLI (`bin/flutterjs.dart`):

```dart
// 1. Create analyzer
final analyzer = ProjectAnalyzer(
  projectPath,
  buildDir: buildPath,
  enableVerboseLogging: verbose,
);

// 2. Initialize
await analyzer.initialize();

// 3. Run analysis
final result = await analyzer.analyzeProject();

// 4. Use results for IR generation
for (final file in result.getFilesNeedingIR()) {
  await generateIR(file, result);
}

// 5. Clean up
analyzer.dispose();
```

---

## Advanced Features

### Incremental Analysis

Only reanalyze changed files:

```dart
final cache = IncrementalCache(buildDir);

// Load cached results
await cache.load();

// Check if file changed
if (cache.hasChanged(filePath)) {
  // Reanalyze this file
  final result = await analyzer.analyzeFile(filePath);
  
  // Update cache
  cache.updateFile(filePath, result.hash);
}

// Save cache
await cache.save();
```

### Parallel Processing

Process files in parallel for faster analysis:

```dart
final analyzer = ProjectAnalyzer(
  projectPath,
  maxParallelism: 8,  // Use 8 parallel workers
);
```

### Custom Exclude Patterns

Exclude specific files from analysis:

```dart
final analyzer = ProjectAnalyzer(
  projectPath,
  excludePatterns: [
    '**/.dart_tool/**',
    '**/build/**',
    '**/*.g.dart',        // Generated files
    '**/test/**',         // Test files
    '**/example/**',      // Example files
  ],
);
```

---

## Error Handling

The analyzer provides detailed error information:

```dart
final result = await analyzer.analyzeProject();

// Check for errors
if (result.statistics.errorFiles > 0) {
  for (final parsedFile in result.parsedUnits.values) {
    if (parsedFile.analysisResult.hasErrors) {
      print('Errors in ${parsedFile.path}:');
      
      for (final error in parsedFile.analysisResult.errorList) {
        print('  Line ${error.location.line}: ${error.message}');
      }
    }
  }
}
```

---

## Integration with Other Packages

The analyzer integrates with:

- **`flutterjs_tools`** - Uses analysis results for code generation
- **`flutterjs_dev_tools`** - Provides debugging output

---

## Development

### Running Tests

```bash
cd packages/flutterjs_analyzer
dart test
```

### Debugging

Enable verbose logging:

```dart
final analyzer = ProjectAnalyzer(
  projectPath,
  enableVerboseLogging: true,  // Detailed logs
);
```

---

## Performance Tips

1. **Use incremental analysis** - Only reanalyze changed files
2. **Increase parallelism** - For large projects, use more workers
3. **Disable output generation** - Set `generateOutputFiles: false` if not needed
4. **Exclude unnecessary files** - Add patterns to `excludePatterns`

---

## Troubleshooting

### "lib directory not found"

Ensure you're pointing to the project root (where `pubspec.yaml` is):

```dart
final analyzer = ProjectAnalyzer('/path/to/project');
```

### "No context found for file"

The file might not be in the `lib/` directory or is excluded by patterns.

### Slow analysis

- Increase `maxParallelism`
- Enable incremental caching
- Exclude unnecessary files

---

## See Also

- [Dart CLI Documentation](../../../docs/getting-started/cli-commands.md)
- [Architecture Overview](../../../docs/architecture/overview.md)
- [Contributing Guide](../../../docs/contributing/CONTRIBUTING.md)
