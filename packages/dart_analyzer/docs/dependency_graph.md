Below is a **DartDoc-style documentation** for the provided `DependencyGraph` class and its related `CircularDependencyException` class. The documentation summarizes the purpose, architecture, and key functionality of the code, focusing on what it does in the context of a Flutter/Dart project analysis pipeline. It is structured to be clear, concise, and professional, suitable for developers who need to understand the code's intent and usage.

---

## DependencyGraph

A Dart class for managing and analyzing file dependencies in a Dart/Flutter project, supporting dependency tracking and topological sorting for analysis order.

### Overview

The `DependencyGraph` class represents a directed graph of file dependencies within a Dart/Flutter project. It tracks which files depend on others (dependencies) and which files are depended upon (dependents), enabling the construction of a dependency graph. The class provides methods to add nodes (files) and edges (dependencies), retrieve dependencies or dependents, and perform a topological sort to determine a safe order for analyzing files. It also detects circular dependencies, which could disrupt analysis.

This class is likely used in the dependency resolution phase (Phase 1) of the `ProjectAnalyzer` (assumed to be part of the broader analysis pipeline, e.g., in `analying_project.dart`) to ensure files are processed in the correct order based on their dependencies.

### Usage

```dart
// Create a DependencyGraph instance
final graph = DependencyGraph();

// Add files (nodes)
graph.addNode('lib/main.dart');
graph.addNode('lib/models/user.dart');

// Add a dependency (edge)
graph.addEdge('lib/main.dart', 'lib/models/user.dart');

// Get dependencies of a file
final deps = graph.getDependencies('lib/main.dart'); // ['lib/models/user.dart']

// Get dependents of a file
final dependents = graph.getDependents('lib/models/user.dart'); // ['lib/main.dart']

// Perform topological sort
final sortedOrder = graph.topologicalSort(); // ['lib/models/user.dart', 'lib/main.dart']

// Check for circular dependencies
final hasCircular = graph.hasCircularDependencies(); // false
```

### Key Components

#### `DependencyGraph` Class

- **Purpose**: Manages a directed graph of file dependencies, enabling dependency queries and topological sorting for correct analysis order.
- **Key Fields**:
  - `_dependencies`: A map from file paths to sets of files they depend on (outgoing edges).
  - `_dependents`: A map from file paths to sets of files that depend on them (incoming edges).

- **Key Methods**:
  - `addNode(String filePath)`: Adds a file to the graph, initializing empty dependency and dependent sets.
  - `addEdge(String from, String to)`: Adds a directed edge from one file to another, indicating that `from` depends on `to`.
  - `getDependencies(String filePath)`: Returns a list of files that `filePath` depends on.
  - `getDependents(String filePath)`: Returns a list of files that depend on `filePath`.
  - `topologicalSort()`: Performs a depth-first search (DFS) to return a topologically sorted list of file paths, ensuring files are processed after their dependencies. Throws `CircularDependencyException` if a cycle is detected.
  - `hasCircularDependencies()`: Checks if the graph contains circular dependencies by attempting a topological sort, returning `true` if a cycle is found.

#### Algorithm Details

- **Graph Representation**:
  - Uses two maps (`_dependencies` and `_dependents`) for efficient lookup of outgoing and incoming edges.
  - Each map stores file paths as keys and sets of file paths as values, representing directed edges.

- **Topological Sort**:
  - Implements a depth-first search (DFS) algorithm to produce a linear ordering of files where each file appears after its dependencies.
  - Tracks visited and visiting nodes to detect cycles.
  - If a node is encountered in the `visiting` set during DFS, a `CircularDependencyException` is thrown.

- **Cycle Detection**:
  - The `hasCircularDependencies` method leverages `topologicalSort` to detect cycles, catching any `CircularDependencyException` to return `true`.

#### `CircularDependencyException` Class

- **Purpose**: Represents an error when a circular dependency is detected in the graph.
- **Fields**:
  - `message`: A string describing the cycle (e.g., the file path causing the cycle).
- **Methods**:
  - `toString()`: Returns a string representation of the exception for debugging.

### Dependencies

- **Dart Core**: Uses `Map` and `Set` from `dart:collection` for graph storage.
- **No External Packages**: The implementation is self-contained, relying on Dart's standard library.

### Assumptions and Limitations

- Assumes file paths are unique strings (e.g., `lib/main.dart`).
- Does not validate file paths or check if files exist.
- Circular dependencies are detected but not resolved; the caller must handle `CircularDependencyException`.
- The graph is not optimized for very large projects (e.g., no indexing or caching beyond basic maps).

### Notes

- The `DependencyGraph` is designed to integrate with a broader analysis pipeline, such as the `ProjectAnalyzer` from `analying_project.dart`, where it supports dependency resolution (Phase 1).
- The class is lightweight and focused, handling only dependency relationships without additional metadata (e.g., file content or types).
- The topological sort ensures files are analyzed in an order that respects dependencies, critical for correct type resolution and IR generation in later phases.
- Circular dependency detection is robust but may require additional logging or resolution strategies in a production environment.

---

This documentation provides a clear overview of the `DependencyGraph` class, its role in managing file dependencies, and its integration with a Dart/Flutter project analysis pipeline. Let me know if you need further clarification, additional details, or documentation for related components!