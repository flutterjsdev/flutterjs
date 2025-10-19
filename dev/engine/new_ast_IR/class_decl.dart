import 'package:meta/meta.dart';
import 'diagnostics/source_location.dart';
import 'ir/ir_node.dart';
import 'ir/type_ir.dart';
import 'parameter_decl.dart';

import 'function_decl.dart';

// =============================================================================
// FIELD DECLARATION
// =============================================================================

/// Represents a field/property declaration within a class
@immutable
class FieldDecl extends IRNode {
  /// Field name
  final String name;

  /// Field type
  final TypeIR type;

  /// Optional initializer expression
  final String? initializer;

  /// Whether field is final (cannot be reassigned)
  final bool isFinal;

  /// Whether field is const (compile-time constant)
  final bool isConst;

  /// Whether field is static (belongs to class, not instance)
  final bool isStatic;

  /// Whether field is late (lazy initialization)
  final bool isLate;

  /// Visibility: public if name doesn't start with _, private otherwise
  final bool isPrivate;

  /// Documentation comment above field
  final String? documentation;

  /// Annotations on field (e.g., @override, @deprecated)
  final List<String> annotations;

  FieldDecl({
    required super.id,
    required super.sourceLocation,
    required this.name,
    required this.type,
    this.initializer,
    this.isFinal = false,
    this.isConst = false,
    this.isStatic = false,
    this.isLate = false,
    this.isPrivate = false,
    this.documentation,
    this.annotations = const [],
    super.metadata,
  });

  /// Whether this field is accessible from outside the class
  bool get isAccessible => !isPrivate;

  /// Whether this field can be modified
  bool get isMutable => !isFinal && !isConst;

  @override
  String toString() {
    final modifiers = [
      if (isStatic) 'static',
      if (isConst) 'const',
      if (isFinal) 'final',
      if (isLate) 'late',
    ].join(' ');

    return '${modifiers.isNotEmpty ? '$modifiers ' : ''}$name: ${type.displayName}';
  }
}

// =============================================================================
// METHOD DECLARATION
// =============================================================================

/// Represents a method declaration within a class
/// Extends FunctionDecl to reuse function signature logic
// @immutable
// class MethodDecl extends FunctionDecl {
//   /// Whether this overrides a superclass method
//   final bool isOverride;

//   MethodDecl({
//     required super.id,
//     required super.sourceLocation,
//     required super.name,
//     required super.returnType,
//     super.parameters = const [],
//     super.body,
//     super.isAsync = false,
//     super.isGenerator = false,
//     super.typeParameters = const [],
//     super.documentation,
//     super.annotations = const [],
//     super.isStatic = false,
//     super.isAbstract = false,
//     super.isGetter = false,
//     super.isSetter = false,
//     this.isOverride = false,
//   });

//   /// Whether this method is accessible from outside the class
//   bool get isAccessible => !name.startsWith('_');

//   /// Whether this method can be called on instances
//   bool get isInstanceMethod => !isStatic;

//   @override
//   String toString() {
//     final modifiers = [
//       if (isStatic) 'static',
//       if (isAbstract) 'abstract',
//       if (isAsync) 'async',
//       if (isGenerator) '*',
//     ].join(' ');

//     final kind = isGetter
//         ? 'get'
//         : isStatic
//         ? 'method'
//         : 'method';
//     return '${modifiers.isNotEmpty ? '$modifiers ' : ''}$kind $name() → ${returnType.displayName}';
//   }
// }

// =============================================================================
// CONSTRUCTOR DECLARATION
// =============================================================================

/// Represents a constructor declaration
@immutable
class ConstructorDecl extends IRNode {
  /// Constructor name (empty string for default, name for named constructors)
  final String name;

  /// Constructor parameters
  final List<ParameterDecl> parameters;

  /// Field initializer expressions (e.g., : field = value)
  final List<FieldInitializer> initializers;

  /// Constructor body (might be empty)
  final String? body;

  /// Whether this is a const constructor
  final bool isConst;

  /// Whether this is a factory constructor
  final bool isFactory;

  /// Whether this redirects to another constructor
  final bool isRedirecting;

  /// Target constructor if redirecting
  final String? redirectTarget;

  /// Documentation comment
  final String? documentation;

  /// Annotations (e.g., @deprecated)
  final List<String> annotations;

  const ConstructorDecl({
    required super.id,
    required super.sourceLocation,
    this.name = '',
    this.parameters = const [],
    this.initializers = const [],
    this.body,
    this.isConst = false,
    this.isFactory = false,
    this.isRedirecting = false,
    this.redirectTarget,
    this.documentation,
    this.annotations = const [],
    super.metadata,
  });

  /// Get display name (ClassName or ClassName.namedConstructor)
  String displayName(String className) {
    return name.isEmpty ? className : '$className.$name';
  }

  /// Whether this creates new instances (false if factory/redirecting)
  bool get createsNewInstance => !isFactory && !isRedirecting;

  @override
  String toString() {
    final modifiers = [
      if (isConst) 'const',
      if (isFactory) 'factory',
      if (isRedirecting) 'redirecting',
    ].join(' ');

    return '${modifiers.isNotEmpty ? '$modifiers ' : ''}constructor ${name.isEmpty ? '' : name}(...)';
  }
}

/// Represents a field initializer in a constructor
@immutable
class FieldInitializer {
  /// Name of field being initialized
  final String fieldName;

  /// Expression initializing the field
  final String expression;

  /// Source location of this initializer
  final SourceLocationIR sourceLocation;

  const FieldInitializer({
    required this.fieldName,
    required this.expression,
    required this.sourceLocation,
  });

  @override
  String toString() => '$fieldName = $expression';
}

// =============================================================================
// CLASS DECLARATION
// =============================================================================

/// Represents a complete class declaration
@immutable
class ClassDecl extends IRNode {
  /// Class name
  final String name;

  /// Direct superclass (if any)
  final TypeIR? superclass;

  /// Interfaces/abstract classes this class implements
  final List<TypeIR> interfaces;

  /// Mixins this class uses
  final List<TypeIR> mixins;

  /// Type parameters (e.g., <T, U>)
  final List<String> typeParameters;

  /// All field declarations
  final List<FieldDecl> fields;

  /// All method declarations
  final List<MethodDecl> methods;

  /// All constructor declarations
  final List<ConstructorDecl> constructors;

  /// Whether class is abstract
  final bool isAbstract;

  /// Whether class is final (cannot be subclassed)
  final bool isFinal;

  /// Whether class is sealed (Dart 3.0+)
  final bool isSealed;

  /// Whether class is a mixin (Dart 2.1+)
  final bool isMixin;

  /// Class documentation/javadoc
  final String? documentation;

  /// Class annotations (e.g., @immutable, @deprecated)
  final List<String> annotations;

  const ClassDecl({
    required super.id,
    required super.sourceLocation,
    required this.name,
    this.superclass,
    this.interfaces = const [],
    this.mixins = const [],
    this.typeParameters = const [],
    this.fields = const [],
    this.methods = const [],
    this.constructors = const [],
    this.isAbstract = false,
    this.isFinal = false,
    this.isSealed = false,
    this.isMixin = false,
    this.documentation,
    this.annotations = const [],
    super.metadata,
  });

  /// Get default constructor (no-arg unnamed constructor)
  ConstructorDecl? get defaultConstructor {
    try {
      return constructors.firstWhere(
        (c) => c.name.isEmpty && c.parameters.isEmpty,
      );
    } catch (e) {
      return null;
    }
  }

  /// All public fields (not starting with _)
  List<FieldDecl> get publicFields {
    return fields.where((f) => !f.isPrivate).toList();
  }

  /// All private fields (starting with _)
  List<FieldDecl> get privateFields {
    return fields.where((f) => f.isPrivate).toList();
  }

  /// All static fields
  List<FieldDecl> get staticFields {
    return fields.where((f) => f.isStatic).toList();
  }

  /// All instance fields
  List<FieldDecl> get instanceFields {
    return fields.where((f) => !f.isStatic).toList();
  }

  /// All public methods (not starting with _)
  List<MethodDecl> get publicMethods {
    return methods.where((m) => !m.name.startsWith('_')).toList();
  }

  /// All private methods (starting with _)
  List<MethodDecl> get privateMethods {
    return methods.where((m) => m.name.startsWith('_')).toList();
  }

  /// All static methods
  List<MethodDecl> get staticMethods {
    return methods.where((m) => m.isStatic).toList();
  }

  /// All instance methods
  List<MethodDecl> get instanceMethods {
    return methods.where((m) => !m.isStatic).toList();
  }

  /// All getters
  List<MethodDecl> get getters {
    return methods.where((m) => m.isGetter).toList();
  }

  /// All setters
  List<MethodDecl> get setters {
    return methods.where((m) => m.isSetter).toList();
  }

  /// All abstract methods (not implemented)
  List<MethodDecl> get abstractMethods {
    return methods.where((m) => m.isAbstract).toList();
  }

  /// Whether this class can be instantiated
  bool get isInstantiable => !isAbstract || abstractMethods.isEmpty;

  /// Whether this class extends another (has explicit superclass)
  bool get extendsClass => superclass != null;

  /// Whether this class implements interfaces
  bool get implementsInterfaces => interfaces.isNotEmpty;

  /// Total member count (fields + methods + constructors)
  int get memberCount => fields.length + methods.length + constructors.length;

  @override
  String toString() {
    final modifiers = [
      if (isAbstract) 'abstract',
      if (isFinal) 'final',
      if (isSealed) 'sealed',
      if (isMixin) 'mixin',
    ].join(' ');

    final typeParams = typeParameters.isNotEmpty
        ? '<${typeParameters.join(', ')}>'
        : '';
    final superStr = superclass != null
        ? ' extends ${superclass!.displayName}'
        : '';
    final mixinStr = mixins.isNotEmpty
        ? ' with ${mixins.map((m) => m.displayName).join(', ')}'
        : '';
    final ifaceStr = interfaces.isNotEmpty
        ? ' implements ${interfaces.map((i) => i.displayName).join(', ')}'
        : '';

    return '${modifiers.isNotEmpty ? '$modifiers ' : ''}class $name$typeParams$superStr$mixinStr$ifaceStr';
  }
}

// =============================================================================
// ENHANCED CLASS DECLARATION WITH ANALYSIS
// =============================================================================

/// Extended class info with analysis metadata
@immutable
class EnhancedClassDecl extends ClassDecl {
  /// Whether class is used in this codebase
  final bool isUsed;

  /// Count of direct usages
  final int usageCount;

  /// Direct subclasses in this codebase
  final List<String> directSubclasses;

  /// Classes that implement this
  final List<String> directImplementers;

  /// Cyclic inheritance detected
  final bool hasCyclicInheritance;

  const EnhancedClassDecl({
    required super.id,
    required super.sourceLocation,
    required super.name,
    super.superclass,
    super.interfaces = const [],
    super.mixins = const [],
    super.typeParameters = const [],
    super.fields = const [],
    super.methods = const [],
    super.constructors = const [],
    super.isAbstract = false,
    super.isFinal = false,
    super.isSealed = false,
    super.isMixin = false,
    super.documentation,
    super.annotations = const [],
    this.isUsed = false,
    this.usageCount = 0,
    this.directSubclasses = const [],
    this.directImplementers = const [],
    this.hasCyclicInheritance = false,
    super.metadata,
  });

  /// Whether class is dead code (not used anywhere)
  bool get isDeadCode => !isUsed && !annotations.contains('deprecated');

  /// Inheritance depth (0 = no superclass, 1 = extends one class, etc.)
  int get inheritanceDepth {
    int depth = 0;
    TypeIR? current = superclass;
    while (current != null) {
      depth++;
      // In real implementation, would look up superclass's superclass
      break; // Stop for now
    }
    return depth;
  }
}

// =============================================================================
// CLASS HIERARCHY UTILITIES
// =============================================================================

/// Utilities for analyzing class hierarchies
class ClassHierarchyUtils {
  /// Check if a class is a subclass of another
  static bool isSubclassOf(ClassDecl subclass, ClassDecl superclass) {
    if (subclass.superclass == null) return false;

    // Direct inheritance
    if (subclass.superclass!.displayName == superclass.name) {
      return true;
    }

    // TODO: In full implementation, recursively check superclass chain
    return false;
  }

  /// Check if a class implements another class/interface
  static bool implementsClass(ClassDecl impl, ClassDecl iface) {
    return impl.interfaces.any((i) => i.displayName == iface.name);
  }

  /// Get all methods from class and superclasses
  static List<MethodDecl> getAllMethods(
    ClassDecl cls, [
    List<ClassDecl>? hierarchy,
  ]) {
    final allMethods = <MethodDecl>[...cls.methods];

    // TODO: Add methods from superclass and mixins
    // This requires access to the full class registry

    return allMethods;
  }

  /// Find potential unimplemented abstract methods
  static List<MethodDecl> findUnimplementedMethods(ClassDecl cls) {
    if (cls.isAbstract)
      return []; // Abstract classes can have unimplemented methods

    // All abstract methods in this class plus all from interfaces
    return cls.abstractMethods;
  }
}

// =============================================================================
// PARAMETER DECLARATION (for constructors and methods)
// =============================================================================

/// Represents a parameter in a function/method/constructor
