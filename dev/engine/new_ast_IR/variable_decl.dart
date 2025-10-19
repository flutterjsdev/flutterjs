import 'package:meta/meta.dart';
import 'diagnostics/source_location.dart';
import 'ir/expression_ir.dart';
import 'ir/ir_node.dart';
import 'ir/type_ir.dart';

// =============================================================================
// VARIABLE DECLARATIONS
// =============================================================================

/// Represents a variable declaration in Dart code
/// 
/// Covers:
/// - Top-level variables (in files)
/// - Local variables (in functions/methods)
/// - Field declarations (in classes)
/// - Parameters (in functions/methods/constructors)
/// 
/// Examples:
/// - `int x = 42;`
/// - `final String name;`
/// - `const bool DEBUG = true;`
/// - `late StreamController<int> controller;`
/// - `required String title` (parameter)
@immutable
class VariableDecl  extends IRNode{


  /// Variable name
  final String name;

  /// The type of this variable
   TypeIR type;

  /// Optional initializer expression
  /// 
  /// null means:
  /// - For final/const without initializer: type annotation required
  /// - For late fields: initialized elsewhere
  /// - For parameters: no default value
  final ExpressionIR? initializer;

  /// Whether this is declared with `final` keyword
  final bool isFinal;

  /// Whether this is declared with `const` keyword
  /// 
  /// Note: const implies final (const variables are always final)
  final bool isConst;

  final bool isPrivate;

  /// Whether this is declared with `late` keyword
  /// 
  /// Defers initialization. Only valid for:
  /// - Top-level variables
  /// - Static variables
  /// - Instance fields
  /// - Local variables
  /// 
  /// NOT valid for: parameters, const variables
  final bool isLate;

  /// Whether this is declared with `static` keyword (for fields only)
  final bool isStatic;

  /// Documentation/comments above this variable
  final String? documentation;

  /// Metadata annotations (e.g., @override, @deprecated)
  final List<AnnotationIR> annotations;

  /// Visibility modifier context
  /// 
  /// Determined by naming convention (starts with _) or explicit visibility
  /// in parameter declarations
  final VisibilityModifier visibility;

  /// For parameters: whether this is a required parameter
  /// 
  /// Applies to named parameters with @required or required keyword
  final bool isRequired;

  /// For parameters: whether this is a named parameter
  /// 
  /// vs positional parameter
  final bool isNamed;

  /// For parameters: whether this is a positional parameter
  /// 
  /// vs named parameter
  final bool isPositional;

   VariableDecl({
    required super.id,
    required this.name,
    required this.type,
    this.initializer,
    this.isFinal = false,
    this.isConst = false,
    this.isLate = false,
    this.isStatic = false,
    required super.sourceLocation,
    this.documentation,
    this.annotations = const [],
    this.visibility = VisibilityModifier.public,
    this.isRequired = false,
    this.isNamed = false,
    this.isPositional = true,
    this.isPrivate=false,
  }) : assert(
    !isConst || !isLate,
    'Variable cannot be both const and late',
  ), assert(
    !isConst || initializer != null,
    'Const variables must have an initializer',
  ), assert(
    !(isNamed && isPositional),
    'Variable cannot be both named and positional',
  );

  /// Whether this variable is mutable
  /// 
  /// Returns false for final and const variables
  bool get isMutable => !isFinal && !isConst;

  /// Whether this variable has an initializer
  bool get hasInitializer => initializer != null;

  /// Whether this variable can be evaluated at compile-time
  /// 
  /// Const variables and those with const initializers
  bool get isCompileTimeConstant => isConst || (initializer?.isConstant ?? false);

  /// Human-readable declaration string
  /// 
  /// Examples:
  /// - "late final String? name"
  /// - "const int DEBUG = 42"
  /// - "required String title"
  String get declaration {
    final parts = <String>[];

    if (isRequired) parts.add('required');
    if (isConst) parts.add('const');
    if (isFinal && !isConst) parts.add('final');
    if (isLate) parts.add('late');
    if (isStatic) parts.add('static');

    parts.add(type.displayName());
    parts.add(name);

    if (initializer != null) {
      parts.add('= ${initializer!.toShortString()}');
    }

    return parts.join(' ');
  }

  /// Whether this variable needs explicit initialization
  /// 
  /// True for:
  /// - Non-null final variables without initializer
  /// - Parameters without defaults
  bool get needsInitialization {
    if (isConst) return false; // const always initialized
    if (initializer != null) return false; // already has one
    if (type.isNullable) return false; // nullable can be null
    if (isRequired && (isNamed || isPositional)) return false; // parameter

    return isFinal || !isMutable;
  }

  /// Validates this variable declaration for consistency
  /// 
  /// Returns list of validation errors, empty if valid
  List<String> validate() {
    final errors = <String>[];

    // const cannot be late
    if (isConst && isLate) {
      errors.add('Variable cannot be both const and late');
    }

    // const must have initializer
    if (isConst && initializer == null) {
      errors.add('Const variable must have an initializer');
    }

    // late cannot be used with parameters
    if (isLate && (isRequired || isNamed)) {
      errors.add('Late modifier not allowed on parameters');
    }

    // late cannot be const
    if (isLate && isConst) {
      errors.add('Late and const are mutually exclusive');
    }

    // const initializer must be constant
    if (isConst && initializer != null && !initializer!.isConstant) {
      errors.add('Const variable initializer must be a compile-time constant');
    }

    // cannot be both named and positional
    if (isNamed && isPositional) {
      errors.add('Parameter cannot be both named and positional');
    }

    // private variables should use underscore naming
    if (visibility == VisibilityModifier.private && !name.startsWith('_')) {
      // Warning, not error - might be intentional
    }

    return errors;
  }

  @override
  String toString() => declaration;
}

/// Represents a variable reference or usage
/// 
/// Used in expressions where a variable is accessed
@immutable
class VariableRef {
  /// Reference to the variable declaration
  final String variableId;

  /// Variable name (for quick access without lookup)
  final String name;

  /// Where this variable is referenced
  final SourceLocationIR sourceLocation;

  /// Whether this reference modifies the variable (assignment target)
  final bool isModified;

  const VariableRef({
    required this.variableId,
    required this.name,
    required this.sourceLocation,
    this.isModified = false,
  });

  @override
  String toString() => '$name${isModified ? ' (modified)' : ''}';
}

/// Represents a field declaration in a class
/// 
/// Extends VariableDecl with class-specific semantics
@immutable
class FieldDecl extends VariableDecl {
  /// Whether this field is abstract (must be overridden in subclass)
  final bool isAbstract;

  /// Whether this field is a getter property
  final bool isGetter;

  /// Whether this field is a setter property
  final bool isSetter;

  /// For getters: the return type (same as type)
  /// For setters: the parameter type (same as type)
  final TypeIR? propertyType;

   FieldDecl({
    required super. id,
    required super. name,
    required super. type,
    super. initializer,
    super. isFinal = false,
    super. isConst = false,
    super. isLate = false,
    super. isStatic = false,
    required super. sourceLocation,
    super.documentation,
    super. annotations = const [],
    super. visibility = VisibilityModifier.public,
    this.isAbstract = false,
    this.isGetter = false,
    this.isSetter = false,
    this.propertyType,
    super.isPrivate,
    super.isNamed,
    super.isRequired
  }) ;

  /// Whether this is a computed property (getter/setter, not a backing field)
  bool get isComputedProperty => isGetter || isSetter;
}

/// Represents a parameter in a function/method/constructor signature
/// 
/// Extends VariableDecl with parameter-specific semantics

/// Enumeration of variable visibility
enum VisibilityModifier {
  /// Public (default), accessible from anywhere
  public,
  
  /// Private (starts with _), accessible only within same library
  private,
  
  /// Protected (convention in some frameworks), documentation only
  protected,
  
  /// Internal/package-private (convention in some frameworks)
  internal,
}

/// Enumeration of parameter kinds in Dart
enum ParameterKind {
  /// Required positional parameter: `func(int x)`
  requiredPositional,
  
  /// Optional positional parameter: `func([int x])`
  positional,
  
  /// Required named parameter: `func({required String name})`
  requiredNamed,
  
  /// Optional named parameter: `func({String name = 'default'})`
  named,
  
  /// Mixed positional/named (rare): `func(int x, {String name})`
  namedPositional,
}

/// Represents an annotation/metadata on a variable
/// 
/// Examples: @override, @deprecated, @JsonKey('field_name')
@immutable
class AnnotationIR {
  /// Name of the annotation
  final String name;

  /// Arguments passed to the annotation constructor
  final List<ExpressionIR> arguments;

  /// Named arguments
  final Map<String, ExpressionIR> namedArguments;

  /// Where this annotation appears in source
  final SourceLocationIR sourceLocation;

  const AnnotationIR({
    required this.name,
    this.arguments = const [],
    this.namedArguments = const {},
    required this.sourceLocation,
  });

  @override
  String toString() {
    final args = arguments.map((a) => a.toShortString()).join(', ');
    final named = namedArguments.entries
        .map((e) => '${e.key}: ${e.value.toShortString()}')
        .join(', ');
    final allArgs = [args, named].where((s) => s.isNotEmpty).join(', ');
    return '@$name${allArgs.isNotEmpty ? '($allArgs)' : ''}';
  }
}