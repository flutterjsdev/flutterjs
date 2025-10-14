// lib/src/analyzer/dependency_resolver.dart

import 'dart:io';
import 'package:path/path.dart' as path;

import 'dependency_graph.dart';

/// Resolves file dependencies by analyzing imports
/// 
/// This class:
/// - Scans Dart files for import statements
/// - Resolves relative and package imports to file paths
/// - Builds a dependency graph showing which files depend on which
/// - Handles exclude patterns (generated files, test files, etc.)
class DependencyResolver {
  final String projectPath;
  final List<String> excludePatterns;
  
  late DependencyGraph graph;
  String? _packageName;
  
  // Cache for resolved import paths
  final Map<String, String?> _importCache = {};

  DependencyResolver(
    this.projectPath, {
    this.excludePatterns = const [
      '**/.dart_tool/**',
      '**/build/**',
      '**/*.g.dart',
      '**/*.freezed.dart',
      '**/*.mocks.dart',
      '**/test/**',
    ],
  });

  /// Build the complete dependency graph for the project
  Future<DependencyGraph> buildGraph() async {
    graph = DependencyGraph();
    
    // Load package name once
    _packageName = _getCurrentPackageName();
    if (_packageName == null) {
      _logWarning('Could not determine package name from pubspec.yaml');
    }
    
    final libDir = Directory(path.join(projectPath, 'lib'));
    
    if (!await libDir.exists()) {
      throw StateError('lib directory not found at $projectPath');
    }
    
    int filesProcessed = 0;
    int filesSkipped = 0;
    
    // Process all Dart files
    await for (final file in _listDartFiles(libDir)) {
      if (_shouldExcludeFile(file.path)) {
        filesSkipped++;
        continue;
      }
      
      try {
        await _analyzeFileDependencies(file.path);
        filesProcessed++;
      } catch (e) {
        _logError('Failed to analyze ${path.basename(file.path)}: $e');
      }
    }
    
    _log('Dependency graph built: $filesProcessed files processed, $filesSkipped skipped');
    
    return graph;
  }

  /// Analyze a single file and add its dependencies to the graph
  Future<void> _analyzeFileDependencies(String filePath) async {
    final normalizedPath = path.normalize(path.absolute(filePath));
    
    // Verify file exists
    if (!await File(normalizedPath).exists()) {
      _logWarning('File not found: $normalizedPath');
      return;
    }
    
    final content = await File(normalizedPath).readAsString();
    final imports = _extractImportsFromContent(content);
    
    // Add node for this file
    graph.addNode(normalizedPath);
    
    // Add edges for each import
    for (final importUri in imports) {
      final resolvedPath = await _resolveImportPath(importUri, normalizedPath);
      
      if (resolvedPath != null) {
        // Ensure the dependency file is also in the graph
        graph.addNode(resolvedPath);
        graph.addEdge(normalizedPath, resolvedPath);
      }
    }
  }

  /// Extract import URIs from file content
  List<String> _extractImportsFromContent(String content) {
    final imports = <String>[];
    
    // Match import statements: import 'uri' or import "uri"
    final importRegex = RegExp(
      r'''import\s+['"]((?:package:|\.\.?/)(?:[^'"\\]|\\['"])+)['"]''',
      multiLine: true,
    );
    
    for (final match in importRegex.allMatches(content)) {
      final uri = match.group(1);
      if (uri != null && !uri.startsWith('dart:')) {
        imports.add(uri);
      }
    }
    
    // Also check export statements as they create dependencies
    final exportRegex = RegExp(
      r'''export\s+['"]((?:package:|\.\.?/)(?:[^'"\\]|\\['"])+)['"]''',
      multiLine: true,
    );
    
    for (final match in exportRegex.allMatches(content)) {
      final uri = match.group(1);
      if (uri != null && !uri.startsWith('dart:')) {
        imports.add(uri);
      }
    }
    
    return imports;
  }

  /// Resolve an import URI to an absolute file path
  Future<String?> _resolveImportPath(String importUri, String currentFile) async {
    // Check cache first
    final cacheKey = '$currentFile|$importUri';
    if (_importCache.containsKey(cacheKey)) {
      return _importCache[cacheKey];
    }
    
    String? resolvedPath;
    
    if (importUri.startsWith('package:')) {
      resolvedPath = await _resolvePackageImport(importUri);
    } else {
      resolvedPath = _resolveRelativeImport(importUri, currentFile);
    }
    
    // Verify the resolved file exists
    if (resolvedPath != null) {
      if (!await File(resolvedPath).exists()) {
        _logWarning('Resolved import not found: $resolvedPath (from $importUri)');
        resolvedPath = null;
      }
    }
    
    // Cache the result
    _importCache[cacheKey] = resolvedPath;
    
    return resolvedPath;
  }

  /// Resolve package: imports
  Future<String?> _resolvePackageImport(String importUri) async {
    // Extract package name and path
    final packagePath = importUri.replaceFirst('package:', '');
    final parts = packagePath.split('/');
    
    if (parts.isEmpty) return null;
    
    final packageName = parts.first;
    final relativePath = parts.skip(1).join('/');
    
    // Only resolve imports from the current package
    if (packageName != _packageName) {
      // External package - not tracked in our dependency graph
      return null;
    }
    
    // Convert to file path: package:my_app/foo/bar.dart -> lib/foo/bar.dart
    final resolvedPath = path.normalize(
      path.absolute(path.join(projectPath, 'lib', relativePath)),
    );
    
    return resolvedPath;
  }

  /// Resolve relative imports (./file.dart or ../file.dart)
  String _resolveRelativeImport(String importUri, String currentFile) {
    final currentDir = path.dirname(currentFile);
    final resolvedPath = path.normalize(
      path.absolute(path.join(currentDir, importUri)),
    );
    
    return resolvedPath;
  }

  /// Check if a file should be excluded based on patterns
  bool _shouldExcludeFile(String filePath) {
    final relativePath = path.relative(filePath, from: projectPath);
    
    for (final pattern in excludePatterns) {
      if (_matchesPattern(relativePath, pattern)) {
        return true;
      }
    }
    
    return false;
  }

  /// Simple glob-style pattern matching
  bool _matchesPattern(String filePath, String pattern) {
    // Convert glob pattern to regex
    var regexPattern = pattern
        .replaceAll('**/', '.*/')  // ** matches any directory depth
        .replaceAll('*', '[^/]*')   // * matches anything except /
        .replaceAll('.', r'\.');    // Escape dots
    
    // Ensure pattern matches from start or after a /
    if (!regexPattern.startsWith('.*')) {
      regexPattern = '(^|/)$regexPattern';
    }
    
    final regex = RegExp(regexPattern);
    return regex.hasMatch(filePath);
  }

  /// Get the package name from pubspec.yaml
  String? _getCurrentPackageName() {
    try {
      final pubspecPath = path.join(projectPath, 'pubspec.yaml');
      final pubspecFile = File(pubspecPath);
      
      if (!pubspecFile.existsSync()) {
        return null;
      }
      
      final content = pubspecFile.readAsStringSync();
      final nameMatch = RegExp(r'^name:\s*(\w+)', multiLine: true).firstMatch(content);
      
      return nameMatch?.group(1);
    } catch (e) {
      _logError('Failed to read package name: $e');
      return null;
    }
  }

  /// List all Dart files in a directory recursively
  Stream<File> _listDartFiles(Directory dir) async* {
    try {
      await for (final entity in dir.list(recursive: true)) {
        if (entity is File && entity.path.endsWith('.dart')) {
          yield entity;
        }
      }
    } catch (e) {
      _logError('Error listing files in ${dir.path}: $e');
    }
  }

  // ==========================================================================
  // PUBLIC API - Dependency queries
  // ==========================================================================

  /// Get all direct dependencies of a file
  List<String> getDependencies(String filePath) {
    final normalized = path.normalize(path.absolute(filePath));
    return graph.getDependencies(normalized);
  }

  /// Get all files that directly depend on this file
  List<String> getDependents(String filePath) {
    final normalized = path.normalize(path.absolute(filePath));
    return graph.getDependents(normalized);
  }

  /// Get all transitive dependents (files that depend on this file, directly or indirectly)
  Set<String> getAllDependents(String filePath) {
    final normalized = path.normalize(path.absolute(filePath));
    return graph.getTransitiveDependents(normalized);
  }

  /// Check if there are circular dependencies in the graph
  bool hasCircularDependencies() {
    return graph.hasCircularDependencies();
  }

  /// Get all circular dependency cycles
  List<List<String>> getCircularDependencies() {
    return graph.detectCycles();
  }

  // ==========================================================================
  // LOGGING
  // ==========================================================================

  void _log(String message) {
    print('   $message');
  }

  void _logWarning(String message) {
    print('   ⚠️  $message');
  }

  void _logError(String message) {
    print('   ❌ $message');
  }
}