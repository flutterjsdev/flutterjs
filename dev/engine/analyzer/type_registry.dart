// lib/src/analyzer/type_registry.dart
import 'package:analyzer/dart/element/element.dart' as aelement;
import 'package:path/path.dart' as path;
import 'dart:io';

import 'analying_project.dart';

/// Registry for all types discovered during analysis
/// 
/// This registry:
/// - Stores information about classes, mixins, enums, typedefs
/// - Tracks which file each type is defined in
/// - Enables lookup of type information for IR generation
/// - Handles type availability checking based on imports
class TypeRegistry {
  final Map<String, TypeInfo> _types = {};
  final Map<String, Set<String>> _fileTypes = {};
  
  // Cache for package name
  String? _packageName;
  String? _projectPath;

  /// Register a type in the registry
  void registerType(TypeInfo typeInfo) {
    _types[typeInfo.name] = typeInfo;
    _fileTypes.putIfAbsent(typeInfo.filePath, () => {}).add(typeInfo.name);
    
    // Store project path from first registered type
    _projectPath ??= _extractProjectPath(typeInfo.filePath);
  }

  /// Look up type information by name
  TypeInfo? lookupType(String typeName) {
    return _types[typeName];
  }

  /// Check if any types are registered for a file
  bool hasTypesForFile(String filePath) {
    return _fileTypes.containsKey(filePath);
  }

  /// Get all type names defined in a file
  Set<String> getTypesInFile(String filePath) {
    return _fileTypes[filePath] ?? {};
  }

  /// Remove all types from a file (for incremental updates)
  void removeTypesForFile(String filePath) {
    final typeNames = _fileTypes.remove(filePath) ?? {};
    for (final typeName in typeNames) {
      _types.remove(typeName);
    }
  }

  /// Returns the total number of registered types
  int get typeCount => _types.length;

  /// Get all registered type names
  List<String> getAllTypeNames() => _types.keys.toList();

  /// Get all types matching a predicate
  List<TypeInfo> getTypesWhere(bool Function(TypeInfo) predicate) {
    return _types.values.where(predicate).toList();
  }

  /// Get all widget types
  List<TypeInfo> getWidgets() {
    return _types.values.where((t) => t.isWidget).toList();
  }

  /// Get all stateful widgets
  List<TypeInfo> getStatefulWidgets() {
    return _types.values.where((t) => t.isStatefulWidget).toList();
  }

  /// Get all state classes
  List<TypeInfo> getStateClasses() {
    return _types.values.where((t) => t.isState).toList();
  }

  /// Check if a type is available in a given file context
  bool isTypeAvailableIn(
    String typeName,
    String filePath,
    FileAnalysisResult analysisResult,
  ) {
    final typeInfo = _types[typeName];
    if (typeInfo == null) return false;

    // Same file - always available
    if (typeInfo.filePath == filePath) return true;

    // Check imports
    for (final import in analysisResult.imports) {
      final resolvedPath = _resolveImport(import, filePath);
      if (resolvedPath == typeInfo.filePath) return true;
    }

    return false;
  }

  /// Resolve an import URI to a file path
  String? _resolveImport(ImportInfo import, String currentFile) {
    final uri = import.uri;

    // Skip dart: imports
    if (uri.startsWith('dart:')) return null;

    if (uri.startsWith('package:')) {
      return _resolvePackageImport(uri);
    } else {
      return _resolveRelativeImport(uri, currentFile);
    }
  }

  /// Resolve package: imports
  String? _resolvePackageImport(String uri) {
    if (_projectPath == null) return null;

    _packageName ??= _getPackageName(_projectPath!);
    if (_packageName == null) return null;

    // Extract package name and path
    final packagePath = uri.replaceFirst('package:', '');
    final parts = packagePath.split('/');

    if (parts.isEmpty) return null;

    final packageName = parts.first;

    // Only resolve imports from the current package
    if (packageName != _packageName) return null;

    final relativePath = parts.skip(1).join('/');
    return path.normalize(
      path.absolute(path.join(_projectPath!, 'lib', relativePath)),
    );
  }

  /// Resolve relative imports
  String _resolveRelativeImport(String uri, String currentFile) {
    final currentDir = path.dirname(currentFile);
    return path.normalize(path.absolute(path.join(currentDir, uri)));
  }

  /// Extract project path from a file path
  String? _extractProjectPath(String filePath) {
    // Find the directory containing 'lib'
    var current = path.dirname(filePath);
    
    while (current != path.dirname(current)) {
      if (path.basename(current) == 'lib') {
        return path.dirname(current);
      }
      current = path.dirname(current);
    }
    
    return null;
  }

  /// Get package name from pubspec.yaml
  String? _getPackageName(String projectPath) {
    try {
      final pubspecPath = path.join(projectPath, 'pubspec.yaml');
      final pubspecFile = File(pubspecPath);

      if (!pubspecFile.existsSync()) return null;

      final content = pubspecFile.readAsStringSync();
      final nameMatch = RegExp(r'^name:\s*(\w+)', multiLine: true)
          .firstMatch(content);

      return nameMatch?.group(1);
    } catch (e) {
      return null;
    }
  }

  /// Clear all registered types
  void clear() {
    _types.clear();
    _fileTypes.clear();
  }

  /// Get statistics about registered types
  Map<String, int> getStatistics() {
    return {
      'totalTypes': _types.length,
      'filesWithTypes': _fileTypes.length,
      'classes': _types.values.where((t) => t.kind == TypeKind.class_).length,
      'abstractClasses': _types.values.where((t) => t.kind == TypeKind.abstractClass).length,
      'mixins': _types.values.where((t) => t.kind == TypeKind.mixin).length,
      'enums': _types.values.where((t) => t.kind == TypeKind.enum_).length,
      'typedefs': _types.values.where((t) => t.kind == TypeKind.typedef).length,
      'extensions': _types.values.where((t) => t.kind == TypeKind.extension).length,
      'widgets': _types.values.where((t) => t.isWidget).length,
      'statefulWidgets': _types.values.where((t) => t.isStatefulWidget).length,
      'statelessWidgets': _types.values.where((t) => t.isStatelessWidget).length,
      'stateClasses': _types.values.where((t) => t.isState).length,
    };
  }
}

/// Type information extracted from declarations
class TypeInfo {
  final String name;
  final String fullyQualifiedName;
  final TypeKind kind;
  final String filePath;
  final aelement.Element element;

  // Class-specific
  final bool isAbstract;
  final String? superType;
  final List<String> interfaces;
  final List<String> mixins;
  final List<String> typeParameters;

  // Flutter-specific flags
  final bool isWidget;
  final bool isStatefulWidget;
  final bool isStatelessWidget;
  final bool isState;

  // Mixin-specific
  final List<String> superclassConstraints;

  // Enum-specific
  final List<String> enumValues;

  // Typedef-specific
  final String? aliasedType;

  // Extension-specific
  final String? extendedType;

  TypeInfo({
    required this.name,
    required this.fullyQualifiedName,
    required this.kind,
    required this.filePath,
    required this.element,
    this.isAbstract = false,
    this.superType,
    this.interfaces = const [],
    this.mixins = const [],
    this.typeParameters = const [],
    this.isWidget = false,
    this.isStatefulWidget = false,
    this.isStatelessWidget = false,
    this.isState = false,
    this.superclassConstraints = const [],
    this.enumValues = const [],
    this.aliasedType,
    this.extendedType,
  });

  @override
  String toString() {
    final buffer = StringBuffer('TypeInfo($name, kind: $kind');
    
    if (isWidget) buffer.write(', widget');
    if (isStatefulWidget) buffer.write(', stateful');
    if (isStatelessWidget) buffer.write(', stateless');
    if (isState) buffer.write(', state');
    if (superType != null) buffer.write(', extends: $superType');
    
    buffer.write(')');
    return buffer.toString();
  }
}

/// Type kind enumeration
enum TypeKind {
  class_,
  abstractClass,
  mixin,
  enum_,
  typedef,
  extension,
}