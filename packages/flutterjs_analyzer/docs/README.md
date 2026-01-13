# FlutterJS Analyzer - Technical Documentation

Internal technical documentation for `flutterjs_analyzer` package components.

> [!NOTE]
> This documentation is for **contributors** working on the FlutterJS analyzer internals.  
> For user-facing documentation, see the [main README](../README.md).

---

## Overview

The `flutterjs_analyzer` package provides the core analysis engine for FlutterJS, handling Dart code analysis, dependency resolution, and IR (Intermediate Representation) generation.

---

## Component Documentation

### Core Analysis

- **[ProjectAnalyzer](analying_project.md)** - Main analyzer orchestrating the multi-phase analysis pipeline
  - Initialization and validation
  - Multi-phase analysis (6 phases)
  - Incremental compilation support
  - Cache management
  - Progress tracking

### Dependency Management

- **[DependencyGraph](dependency_graph.md)** - Directed graph of file dependencies
  - Graph representation
  - Topological sorting
  - Circular dependency detection
  - Dependency/dependent queries

- **[DependencyResolver](dependency_resolver.md)** - Builds dependency graphs from Dart files
  - File discovery in `lib/` directory
  - Import extraction and resolution
  - Package vs relative import handling
  - Graph construction

### Intermediate Representation (IR)

- **[FlutterAppIR](flutter_app_ir.md)** - Complete application IR structure
  - `FlutterAppIR` - Top-level IR container
  - `ImportIR` - Import directive representation
  - `DependencyGraphIR` - Component-level dependency graph
  - `DependencyNodeIR` - Graph nodes (widgets, states, providers)
  - `DependencyType` enum - Component types
  - `DependencyEdgeIR` - Graph edges (relationships)
  - `DependencyRelation` enum - Relationship types

---

## Analysis Pipeline

The analyzer uses a 6-phase pipeline:

```
Phase 1: Dependency Resolution
├─ Scan lib/ directory
├─ Extract imports from each file
├─ Build dependency graph
└─ Detect circular dependencies

Phase 2: Change Detection (Incremental)
├─ Compute file hashes
├─ Compare with cached hashes
└─ Identify changed files

Phase 3: Type Resolution
├─ Parse Dart AST for each file
├─ Visit type declarations
├─ Register types in TypeRegistry
└─ Resolve type references

Phase 4: IR Generation
├─ Generate FileIR for each changed file
├─ Process in dependency order
└─ Reuse cached IRs for unchanged files

Phase 5: Linking & Validation
├─ Link file IRs into FlutterAppIR
├─ Validate linked IR
└─ Report validation errors

Phase 6: Cache Persistence
├─ Save file IRs to cache
├─ Save file hashes
└─ Enable faster incremental builds
```

---

## Key Concepts

### Dependency Graph

The analyzer builds two types of dependency graphs:

1. **File-level graph** (`DependencyGraph`)
   - Tracks which files import/depend on other files
   - Used for determining analysis order
   - Enables incremental analysis

2. **Component-level graph** (`DependencyGraphIR`)
   - Tracks which widgets/classes depend on others
   - Used for optimization and code generation
   - Part of the final IR output

### Incremental Analysis

The analyzer supports incremental builds by:
- Computing MD5 hashes of file contents
- Caching analysis results (IRs)
- Detecting changed files
- Invalidating dependents of changed files
- Reusing cached results for unchanged files

### Parallel Processing

To improve performance:
- Files are processed in batches based on dependency levels
- Each batch can be processed in parallel
- Respects dependency ordering (dependencies before dependents)
- Configurable parallelism via `maxParallelism`

---

## API Quick Reference

### ProjectAnalyzer

```dart
// Create analyzer
final analyzer = ProjectAnalyzer(
  projectPath,
  buildDir: 'build',
  maxParallelism: 4,
  enableVerboseLogging: true,
);

// Initialize
await analyzer.initialize();

// Run full analysis
final result = await analyzer.analyzeProject();

// Analyze single file (incremental)
final fileResult = await analyzer.analyzeFile('lib/main.dart');

// Clean up
analyzer.dispose();
```

### DependencyResolver

```dart
// Build dependency graph
final resolver = DependencyResolver(projectPath);
final graph = await resolver.buildGraph();

// Get topological order
final order = graph.topologicalSort();

// Get dependents
final dependents = resolver.getDependents('lib/main.dart');
```

---

## File Outputs

The analyzer generates several output files in `build/analysis_output/`:

```
build/analysis_output/
├── dependencies/
│   └── graph.json          # File dependency graph
├── types/
│   └── registry.json       # Type registry
├── imports/
│   └── analysis.json       # Import analysis
└── reports/
    ├── summary.json        # Analysis summary
    └── statistics.json     # Performance statistics
```

---

## Development

### Running Tests

```bash
cd packages/flutterjs_analyzer
dart test
```

### Debugging

Enable verbose logging for detailed output:

```dart
final analyzer = ProjectAnalyzer(
  projectPath,
  enableVerboseLogging: true,
);
```

### Performance Profiling

Analysis statistics are available in the result:

```dart
final result = await analyzer.analyzeProject();
print('Total files: ${result.statistics.totalFiles}');
print('Duration: ${result.statistics.durationMs}ms');
print('Throughput: ${result.statistics.throughput} files/sec');
```

---

## See Also

- [Main Package README](../README.md) - User-facing documentation
- [FlutterJS Architecture](../../../docs/architecture/overview.md) - System architecture
- [Contributing Guide](../../../docs/contributing/CONTRIBUTING.md) - How to contribute
