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
  final fragment = node.declaredFragment;
  if (fragment != null) {
    final element = fragment.element;  // Get the ClassElement from the fragment
    
    final typeInfo = TypeInfo(
      name: element.name??"<anonymous>",
      fullyQualifiedName: element.displayName.isEmpty ? "<anonymous>" : element.displayName,
      kind: element.isAbstract ? TypeKind.abstractClass : TypeKind.class_,
      filePath: filePath,
      element: element,
      isAbstract: element.isAbstract,
      superType: element.supertype?.getDisplayString(),
      interfaces: element.interfaces
          .map((i) => i.getDisplayString())
          .toList(),
      mixins: element.mixins
          .map((m) => m.getDisplayString())
          .toList(),
      typeParameters: element.typeParameters.map((t) => t.name??"").toList(),
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
  final fragment = node.declaredFragment;
  if (fragment != null) {
    final element = fragment.element;  // Get the MixinElement from the fragment
    
    final typeInfo = TypeInfo(
      name: element.name??"<anonymous>",
      fullyQualifiedName: element.displayName.isEmpty ? "<anonymous>" : element.displayName,
      kind: TypeKind.mixin,
      filePath: filePath,
      element: element,
      interfaces: element.interfaces
          .map((i) => i.getDisplayString())
          .toList(),
      superclassConstraints: element.superclassConstraints
          .map((s) => s.getDisplayString())
          .toList(),
    );
    
    typeRegistry.registerType(typeInfo);
    typesFound++;
  }
  
  super.visitMixinDeclaration(node);
}
 @override
void visitEnumDeclaration(EnumDeclaration node) {
  final fragment = node.declaredFragment;
  if (fragment != null) {
    final element = fragment.element;  // Get the EnumElement from the fragment
    
    final typeInfo = TypeInfo(
      name: element.name ?? "<anonymous>",
      fullyQualifiedName: element.displayName.isEmpty ? "<anonymous>" : element.displayName,
      kind: TypeKind.enum_,
      filePath: filePath,
      element: element,
      enumValues: element.fields
          .where((f) => f.isEnumConstant )
          .map((f) => f.name ?? "")
          .toList(),
    );
    
    typeRegistry.registerType(typeInfo);
    typesFound++;
  }
  
  super.visitEnumDeclaration(node);
}
@override
void visitGenericTypeAlias(GenericTypeAlias node) {
  final fragment = node.declaredFragment;
  if (fragment != null) {
    final element = fragment.element as TypeAliasElement;  // Cast to TypeAliasElement
    
    final typeInfo = TypeInfo(
      name: element.name ?? '<anonymous>',
      fullyQualifiedName: element.displayName.isEmpty ? '<anonymous>' : element.displayName,
      kind: TypeKind.typedef,
      filePath: filePath,
      element: element,
      aliasedType: element.aliasedType.getDisplayString(),
      typeParameters: element.typeParameters.map((t) => t.name??"").toList(),
    );
    
    typeRegistry.registerType(typeInfo);
    typesFound++;
  }
  
  super.visitGenericTypeAlias(node);
}

@override
void visitExtensionDeclaration(ExtensionDeclaration node) {
  final fragment = node.declaredFragment;
  if (fragment != null) {
    final element = fragment.element;  // Cast to ExtensionElement
    
    final typeInfo = TypeInfo(
      name: element.name ?? '<anonymous>',
      fullyQualifiedName: element.displayName.isEmpty ? '<anonymous>' : element.displayName,
      kind: TypeKind.extension,
      filePath: filePath,
      element: element,
      extendedType: element.extendedType.getDisplayString(),
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
      current = current.element.supertype;  // Access supertype through the element
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

