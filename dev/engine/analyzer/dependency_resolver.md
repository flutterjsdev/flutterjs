DependencyResolver
A Dart class for resolving and building a dependency graph of Dart files in a Flutter/Dart project, identifying import relationships between files.
Overview
The DependencyResolver class constructs a DependencyGraph by analyzing Dart files in a project's lib directory. It processes each file to extract import directives, resolves their paths (both relative and package-based), and builds a directed graph of file dependencies. This class is likely used in the dependency resolution phase (Phase 1) of the ProjectAnalyzer to ensure files are analyzed in the correct order based on their dependencies.
Purpose

Scans the lib directory to identify all .dart files.
Extracts import directives from each file's content.
Resolves import URIs (relative or package-based) to absolute file paths.
Constructs a DependencyGraph with nodes (files) and edges (dependencies).
Provides access to dependents for incremental analysis.

Usage
// Create a DependencyResolver for a project
final resolver = DependencyResolver('/path/to/project');

// Build the dependency graph
final graph = await resolver.buildGraph();

// Access the dependency graph
print(graph.topologicalSort()); // List of files in dependency order

// Get dependents of a specific file
final dependents = resolver.getDependents('lib/main.dart');
print(dependents); // List of files that depend on 'lib/main.dart'

Key Components
DependencyResolver Class

Purpose: Analyzes Dart files to build a DependencyGraph capturing import relationships.

Key Fields:

projectPath: The root directory of the Dart/Flutter project.
graph: The DependencyGraph instance storing file dependencies (initialized during buildGraph).


Key Methods:

buildGraph(): Asynchronously constructs the dependency graph by scanning all .dart files in the lib directory and analyzing their imports.
_analyzeFileDependencies(String filePath): Processes a single file to extract and resolve its import dependencies, adding them to the graph.
_extractImportsFromContent(String content): Uses a regular expression to extract import URIs from a file's content, excluding dart: imports.
_resolveImportPath(String importUri, String currentFile): Resolves an import URI (relative or package-based) to an absolute file path.
_getCurrentPackageName(): Reads the pubspec.yaml to extract the project's package name.
_listDartFiles(Directory dir): Streams all .dart files in the lib directory recursively.
getDependents(String filePath): Retrieves the list of files that depend on the specified file.



Dependency Resolution Process

File Discovery:

Recursively scans the lib directory to find all .dart files using _listDartFiles.
Each file is processed to extract its imports.


Import Extraction:

Uses a regular expression (import\s+['"](package:[^'"]+|[^'"]+\.dart)['"]) to extract import URIs from file content.
Filters out dart: imports (core Dart libraries) as they are not project-specific dependencies.


Path Resolution:

Resolves relative imports (e.g., './utils.dart') to absolute paths based on the importing file's directory.
Resolves package imports (e.g., 'package:my_app/utils.dart') by checking the package name against the project's pubspec.yaml and mapping to the lib directory.
Ignores imports from external packages (not matching the project's package name).


Graph Construction:

Adds each file as a node in the DependencyGraph using addNode.
Adds edges for resolved imports using addEdge, where the importing file depends on the imported file.


Dependent Queries:

Provides access to the graph's dependents via getDependents, useful for incremental analysis.



Dependencies

Dart Core: Uses dart:io for file system operations (e.g., reading files, listing directories).
Path Package: Uses package:path for cross-platform path manipulation.
DependencyGraph: Relies on the DependencyGraph class to store and manage the dependency graph.

Assumptions and Limitations

Assumes a standard Flutter/Dart project structure with a lib directory and a pubspec.yaml file.
Assumes import URIs follow standard formats (package: or relative .dart paths).
Does not validate if resolved file paths exist or are valid Dart files.
Ignores external package imports, focusing only on project-internal dependencies.
Reads pubspec.yaml synchronously in _getCurrentPackageName, which may impact performance for large files.
Does not handle complex import cases (e.g., barrel files, conditional imports).

Notes

The DependencyResolver integrates with the ProjectAnalyzer's dependency resolution phase (Phase 1), providing the DependencyGraph needed for topological sorting and analysis ordering.
The regular expression for import extraction is simple and may not handle edge cases like multi-line imports or comments.
The class is asynchronous where appropriate to support efficient processing of large projects.
The resolved dependency graph enables incremental analysis by identifying dependents of changed files.
