import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';


import 'type_registry.dart';

/// Visitor that extracts type declarations and registers them in the TypeRegistry
/// 
/// This visitor walks the AST and collects:
/// - Classes (including abstract classes)
/// - Mixins
/// - Enums
/// - Typedefs/Type aliases
/// - Extension declarations
class TypeDeclarationVisitor extends RecursiveAstVisitor<void> {
  final String filePath;
  final TypeRegistry typeRegistry;
  
  int typesFound = 0;

  TypeDeclarationVisitor(this.filePath, this.typeRegistry);

  @override
  void visitClassDeclaration(ClassDeclaration node) {
    final element = node.declaredElement;
    if (element != null) {
      final typeInfo = TypeInfo(
        name: element.name,
        fullyQualifiedName: element.displayName,
        kind: element.isAbstract ? TypeKind.abstractClass : TypeKind.class_,
        filePath: filePath,
        element: element,
        isAbstract: element.isAbstract,
        superType: element.supertype?.getDisplayString(withNullability: false),
        interfaces: element.interfaces
            .map((i) => i.getDisplayString(withNullability: false))
            .toList(),
        mixins: element.mixins
            .map((m) => m.getDisplayString(withNullability: false))
            .toList(),
        typeParameters: element.typeParameters.map((t) => t.name).toList(),
        isWidget: _isWidget(element),
        isStatefulWidget: _isStatefulWidget(element),
        isStatelessWidget: _isStatelessWidget(element),
        isState: _isState(element),
      );
      
      typeRegistry.registerType(typeInfo);
      typesFound++;
    }
    
    super.visitClassDeclaration(node);
  }

  @override
  void visitMixinDeclaration(MixinDeclaration node) {
    final element = node.declaredElement;
    if (element != null) {
      final typeInfo = TypeInfo(
        name: element.name,
        fullyQualifiedName: element.displayName,
        kind: TypeKind.mixin,
        filePath: filePath,
        element: element,
        interfaces: element.interfaces
            .map((i) => i.getDisplayString(withNullability: false))
            .toList(),
        superclassConstraints: element.superclassConstraints
            .map((s) => s.getDisplayString(withNullability: false))
            .toList(),
      );
      
      typeRegistry.registerType(typeInfo);
      typesFound++;
    }
    
    super.visitMixinDeclaration(node);
  }

  @override
  void visitEnumDeclaration(EnumDeclaration node) {
    final element = node.declaredElement;
    if (element != null) {
      final typeInfo = TypeInfo(
        name: element.name,
        fullyQualifiedName: element.displayName,
        kind: TypeKind.enum_,
        filePath: filePath,
        element: element,
        enumValues: element.fields
            .where((f) => f.isEnumConstant)
            .map((f) => f.name)
            .toList(),
      );
      
      typeRegistry.registerType(typeInfo);
      typesFound++;
    }
    
    super.visitEnumDeclaration(node);
  }

  @override
  void visitGenericTypeAlias(GenericTypeAlias node) {
    final element = node.declaredElement;
    if (element != null) {
      final typeInfo = TypeInfo(
        name: element.name,
        fullyQualifiedName: element.displayName,
        kind: TypeKind.typedef,
        filePath: filePath,
        element: element,
        aliasedType: element.aliasedType.getDisplayString(withNullability: false),
        typeParameters: element.typeParameters.map((t) => t.name).toList(),
      );
      
      typeRegistry.registerType(typeInfo);
      typesFound++;
    }
    
    super.visitGenericTypeAlias(node);
  }

  @override
  void visitExtensionDeclaration(ExtensionDeclaration node) {
    final element = node.declaredElement;
    if (element != null) {
      final typeInfo = TypeInfo(
        name: element.name ?? '<anonymous>',
        fullyQualifiedName: element.displayName,
        kind: TypeKind.extension,
        filePath: filePath,
        element: element,
        extendedType: element.extendedType.getDisplayString(withNullability: false),
      );
      
      typeRegistry.registerType(typeInfo);
      typesFound++;
    }
    
    super.visitExtensionDeclaration(node);
  }

  // Helper methods to detect Flutter-specific types
  bool _isWidget(ClassElement element) {
    return _extendsOrImplements(element, 'Widget');
  }

  bool _isStatefulWidget(ClassElement element) {
    return _extendsOrImplements(element, 'StatefulWidget');
  }

  bool _isStatelessWidget(ClassElement element) {
    return _extendsOrImplements(element, 'StatelessWidget');
  }

  bool _isState(ClassElement element) {
    return _extendsOrImplements(element, 'State');
  }

  bool _extendsOrImplements(ClassElement element, String typeName) {
    // Check superclass chain
    var current = element.supertype;
    while (current != null) {
      if (current.element.name == typeName) {
        return true;
      }
      current = current.supertype;
    }
    
    // Check interfaces
    for (final interface in element.allSupertypes) {
      if (interface.element.name == typeName) {
        return true;
      }
    }
    
    return false;
  }
}

// /// Type information extracted from declarations
// class TypeInfo {
//   final String name;
//   final String fullyQualifiedName;
//   final TypeKind kind;
//   final String filePath;
//   final Element element;
  
//   // Class-specific
//   final bool isAbstract;
//   final String? superType;
//   final List<String> interfaces;
//   final List<String> mixins;
//   final List<String> typeParameters;
  
//   // Flutter-specific flags
//   final bool isWidget;
//   final bool isStatefulWidget;
//   final bool isStatelessWidget;
//   final bool isState;
  
//   // Mixin-specific
//   final List<String> superclassConstraints;
  
//   // Enum-specific
//   final List<String> enumValues;
  
//   // Typedef-specific
//   final String? aliasedType;
  
//   // Extension-specific
//   final String? extendedType;

//   TypeInfo({
//     required this.name,
//     required this.fullyQualifiedName,
//     required this.kind,
//     required this.filePath,
//     required this.element,
//     this.isAbstract = false,
//     this.superType,
//     this.interfaces = const [],
//     this.mixins = const [],
//     this.typeParameters = const [],
//     this.isWidget = false,
//     this.isStatefulWidget = false,
//     this.isStatelessWidget = false,
//     this.isState = false,
//     this.superclassConstraints = const [],
//     this.enumValues = const [],
//     this.aliasedType,
//     this.extendedType,
//   });
// }

// /// Type kind enumeration
// enum TypeKind {
//   class_,
//   abstractClass,
//   mixin,
//   enum_,
//   typedef,
//   extension,
// }