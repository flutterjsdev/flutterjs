// lib/src/analyzer/type_registry.dart

class TypeRegistry {
  final Map<String, TypeInfo> _types = {};
  final Map<String, Set<String>> _fileTypes = {};

  void registerType(TypeInfo typeInfo) {
    _types[typeInfo.name] = typeInfo;
    
    _fileTypes
        .putIfAbsent(typeInfo.sourceFile, () => {})
        .add(typeInfo.name);
  }

  TypeInfo? lookupType(String typeName) {
    return _types[typeName];
  }

  bool hasTypesForFile(String filePath) {
    return _fileTypes.containsKey(filePath);
  }

  Set<String> getTypesInFile(String filePath) {
    return _fileTypes[filePath] ?? {};
  }

  void removeTypesForFile(String filePath) {
    final typeNames = _fileTypes.remove(filePath) ?? {};
    for (final typeName in typeNames) {
      _types.remove(typeName);
    }
  }
}

class TypeInfo {
  final String name;
  final String sourceFile;
  final TypeKind kind;
  final String? superclass;
  final List<String> mixins;
  final List<String> interfaces;
  final bool isAbstract;

  TypeInfo({
    required this.name,
    required this.sourceFile,
    required this.kind,
    this.superclass,
    this.mixins = const [],
    this.interfaces = const [],
    this.isAbstract = false,
  });
}

enum TypeKind {
  class_,
  mixin,
  enum_,
  extension,
  typedef,
}