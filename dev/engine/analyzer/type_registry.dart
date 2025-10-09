// lib/src/analyzer/type_registry.dart
import 'package:analyzer/dart/element/element.dart' as aelement;

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
