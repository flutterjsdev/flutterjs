// lib/src/analyzer/dependency_resolver.dart

import 'dart:io';
import 'package:path/path.dart' as path;

import 'dependency_graph.dart';

class DependencyResolver {
  final String projectPath;
  late DependencyGraph graph;

  DependencyResolver(this.projectPath);

  Future<DependencyGraph> buildGraph() async {
    graph = DependencyGraph();
    
    final libDir = Directory(path.join(projectPath, 'lib'));
    await for (final file in _listDartFiles(libDir)) {
      await _analyzeFileDependencies(file.path);
    }
    
    return graph;
  }

  Future<void> _analyzeFileDependencies(String filePath) async {
    final content = await File(filePath).readAsString();
    final imports = _extractImportsFromContent(content);
    
    graph.addNode(filePath);
    
    for (final import in imports) {
      final resolvedPath = _resolveImportPath(import, filePath);
      if (resolvedPath != null) {
        graph.addEdge(filePath, resolvedPath);
      }
    }
  }

  List<String> _extractImportsFromContent(String content) {
    final importRegex = RegExp(
      r'''import\s+['"](package:[^'"]+|[^'"]+\.dart)['"]''',
    );
    
    return importRegex.allMatches(content)
        .map((m) => m.group(1)!)
        .where((uri) => !uri.startsWith('dart:')) // Skip dart: imports
        .toList();
  }

  String? _resolveImportPath(String importUri, String currentFile) {
    if (importUri.startsWith('package:')) {
      // Handle package imports
      final packagePath = importUri.replaceFirst('package:', '');
      final parts = packagePath.split('/');
      
      // Skip external packages
      final currentPackageName = _getCurrentPackageName();
      if (parts.first != currentPackageName) return null;
      
      // Convert to file path
      return path.join(
        projectPath,
        'lib',
        parts.skip(1).join('/'),
      );
    } else {
      // Relative import
      final currentDir = path.dirname(currentFile);
      return path.normalize(path.join(currentDir, importUri));
    }
  }

  String _getCurrentPackageName() {
    // Read from pubspec.yaml
    final pubspecPath = path.join(projectPath, 'pubspec.yaml');
    final content = File(pubspecPath).readAsStringSync();
    final nameMatch = RegExp(r'name:\s*(\w+)').firstMatch(content);
    return nameMatch?.group(1) ?? '';
  }

  Stream<File> _listDartFiles(Directory dir) async* {
    await for (final entity in dir.list(recursive: true)) {
      if (entity is File && entity.path.endsWith('.dart')) {
        yield entity;
      }
    }
  }

  List<String> getDependents(String filePath) {
    return graph.getDependents(filePath);
  }
}