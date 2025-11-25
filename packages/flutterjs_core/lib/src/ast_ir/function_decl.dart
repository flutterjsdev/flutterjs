/// <---------------------------------------------------------------------------->
/// function_decl.dart
/// ----------------------------------------------------------------------------
///
/// Detailed IR for functions, methods, and constructors in Dart.
///
/// [FunctionDecl] base: returns, params, body, async/generator modifiers.
///
/// Specializations:
/// • [MethodDecl]: Class methods with override/external
/// • [ConstructorDecl]: Inits, super calls, redirects, factories
///
/// Includes:
/// • [ConstructorInitializer]: Field inits
/// • [SuperConstructorCall]: Super invocations
/// • [RedirectedConstructorCall]: Redirects
///
/// Features:
/// • Signature strings
/// • Override checks
/// • JSON serialization
/// • Operator/constructor specifics
///
/// Key for:
/// • Call graph construction
/// • Async analysis
/// • Constructor validation
/// <---------------------------------------------------------------------------->
library;

import 'package:meta/meta.dart';
import 'diagnostics/source_location.dart';
import 'ir/expression_ir.dart';
import 'ir/ir_node.dart';
import 'ir/statement/statement_ir.dart';
import 'ir/type_ir.dart';
import 'parameter_decl.dart';
import 'variable_decl.dart';

// =============================================================================
// FUNCTION DECLARATIONS
// =============================================================================

/// Represents a function or method declaration in Dart code
///
/// Covers:
/// - Top-level functions
/// - Methods (instance, static, abstract)
/// - Getters and setters
/// - Factory constructors
/// - Async functions and generators
/// - Generic functions
///
/// Examples:
/// - `int add(int a, int b) => a + b;`
/// - `Future<String> fetchData() async { ... }`
/// - `Stream<T> generateValues<T>(T seed) async* { ... }`
/// - `factory Point.fromJson(Map json) { ... }`
@immutable
class FunctionDecl extends IRNode {
  /// Unique identifier for this function
  /// (inherited from IRNode)

  /// Function name
  ///
  /// For constructors: class name
  /// For getters/setters: property name
  /// For operators: operator symbol
  final String name;

  /// Return type of this function
  ///
  /// For constructors: return type is implicit (the class itself)
  /// For generators (async*): wraps type in Stream<T>
  /// For async functions: wraps type in Future<T>
  TypeIR returnType;

  /// Parameters of this function
  final List<ParameterDecl> parameters;

  /// Function body - list of statements
  ///
  /// For regular functions: list of statements (may be empty for arrow functions)
  /// For abstract methods: null
  /// For native functions: null
  ///
  /// ✅ FIXED: Changed from StatementIR? to List<StatementIR>?
  final List<StatementIR>? body;

  /// Whether this is declared with `async` keyword
  ///
  /// Indicates function returns a Future and may use await
  final bool isAsync;

  /// Whether this is a generator function (async* or sync*)
  ///
  /// Indicates function yields values (returns Stream or Iterable)
  final bool isGenerator;

  /// Whether this is a sync generator (`*` marker)
  ///
  /// Combined with isAsync:
  /// - isAsync=false, isSyncGenerator=false: regular function
  /// - isAsync=true, isSyncGenerator=false: async function returning Future
  /// - isAsync=false, isSyncGenerator=true: sync generator returning Iterable
  /// - isAsync=true, isSyncGenerator=true: async generator returning Stream
  final bool isSyncGenerator;

  /// Type parameters for generic functions
  ///
  /// Examples: <T>, <K, V>, <T extends Comparable<T>>
  final List<TypeParameterDecl> typeParameters;

  /// Documentation/comments above this function
  final String? documentation;

  /// Metadata annotations (e.g., @override, @deprecated, @visibleForTesting)
  final List<AnnotationIR> annotations;

  /// For methods: visibility modifier
  final VisibilityModifier visibility;

  /// For methods: whether declared with `static` keyword
  final bool isStatic;

  /// For methods: whether declared with `abstract` keyword
  final bool isAbstract;

  /// Whether this is a getter (property access without parens)
  final bool isGetter;

  /// Whether this is a setter (property assignment)
  final bool isSetter;

  /// Whether this is an operator overload (+, -, [], etc.)
  final bool isOperator;

  /// Whether this is a factory constructor
  final bool isFactory;

  /// Whether this is a const constructor
  final bool isConst;

  /// Whether this function is external (implemented in another language)
  final bool isExternal;

  /// Whether this function was declared with `late` (rare, for initialization)
  final bool isLate;

  /// For constructors: the name of the class this constructs
  final String? constructorClass;

  /// For named constructors: the constructor name suffix
  ///
  /// Examples: Point.fromJson, Duration.zeroArgs, etc.
  final String? constructorName;

  /// Redirected constructor target (if this constructor redirects)
  ///
  /// Example: `Point(int x, int y) : this.fromJson({'x': x, 'y': y})`
  final String? redirectsTo;

  final bool isWidgetReturnType;

  bool? isWidgetFunction;

  FunctionDecl({
    required super.id,
    required this.name,
    required this.returnType,
    this.parameters = const [],
    this.body,
    this.isAsync = false,
    this.isGenerator = false,
    this.isSyncGenerator = false,
    this.typeParameters = const [],
    required super.sourceLocation,
    this.documentation,
    this.annotations = const [],
    this.visibility = VisibilityModifier.public,
    this.isStatic = false,
    this.isAbstract = false,
    this.isGetter = false,
    this.isSetter = false,
    this.isOperator = false,
    this.isFactory = false,
    this.isConst = false,
    this.isExternal = false,
    this.isLate = false,
    this.constructorClass,
    this.constructorName,
    this.redirectsTo,
    this.isWidgetReturnType = false,
    this.isWidgetFunction,
  }) : assert(
         !(isAsync && isSyncGenerator),
         'Function cannot be both async and sync generator',
       ),
       assert(
         !(isFactory && (isAbstract || isStatic)),
         'Factory constructor cannot be abstract or static',
       ),
       assert(
         !(isConst && (isAsync || isGenerator)),
         'Const constructor cannot be async or generator',
       ),
       assert(
         !(isGetter && (isSetter || isOperator)),
         'Getter cannot also be setter or operator',
       ),
       assert(
         !(isAbstract && body != null),
         'Abstract method cannot have body',
       );

  void markAsWidgetFunction({required bool isWidgetFun}) {
    isWidgetFunction = isWidgetFun;
  }

  /// Human-readable function signature
  ///
  /// Examples:
  /// - `int add(int a, int b) -> int`
  /// - `Future<String> fetchData() async -> Future<String>`
  /// - `Stream<T> generateValues<T>(T seed) async* -> Stream<T>`
  /// - `static void configure({required String apiKey})`
  String get signature {
    final parts = <String>[];

    if (isStatic) parts.add('static');
    if (isAbstract) parts.add('abstract');
    if (isFactory) parts.add('factory');
    if (isConst) parts.add('const');
    if (isAsync) parts.add('async');
    if (isGenerator) parts.add('*');

    parts.add(returnType.displayName());

    if (typeParameters.isNotEmpty) {
      final typeParams = typeParameters.map((tp) => tp.name).join(', ');
      parts.add('<$typeParams>');
    }

    parts.add(name);

    final paramList = parameters.map((p) => p.toString()).join(', ');
    parts.add('($paramList)');

    return parts.join(' ');
  }

  /// Qualified name including class context (for methods)
  ///
  /// Examples:
  /// - ClassName.methodName
  /// - ClassName.operator+
  String get qualifiedName {
    if (constructorClass != null) {
      if (constructorName != null) {
        return '$constructorClass.$constructorName';
      }
      return constructorClass!;
    }
    return name;
  }

  /// Whether this function has a body (not abstract or external)
  bool get hasBody => body != null && !isAbstract && !isExternal;

  /// Whether this function is a constructor
  bool get isConstructor => constructorClass != null;

  /// Whether this function is a named constructor
  bool get isNamedConstructor =>
      constructorClass != null && constructorName != null;

  /// Whether this function is a default constructor
  bool get isDefaultConstructor =>
      constructorClass != null && constructorName == null;

  /// Expected number of positional parameters
  int get positionalParameterCount =>
      parameters.where((p) => p.isPositional).length;

  /// Expected number of named parameters
  int get namedParameterCount => parameters.where((p) => p.isNamed).length;

  /// Expected number of required parameters
  int get requiredParameterCount =>
      parameters.where((p) => p.isRequired).length;

  /// Expected number of optional parameters
  int get optionalParameterCount =>
      parameters.where((p) => !p.isRequired).length;

  /// All positional parameters (required and optional)
  List<ParameterDecl> get positionalParameters =>
      parameters.where((p) => p.isPositional).toList();

  /// All named parameters (required and optional)
  List<ParameterDecl> get namedParameters =>
      parameters.where((p) => p.isNamed).toList();

  /// All required parameters (positional and named)
  List<ParameterDecl> get requiredParameters =>
      parameters.where((p) => p.isRequired).toList();

  /// All optional parameters (positional with default and named)
  List<ParameterDecl> get optionalParameters =>
      parameters.where((p) => !p.isRequired).toList();

  /// Effective return type for analysis
  ///
  /// For async generators: returns Stream<T>
  /// For sync generators: returns Iterable<T>
  /// For async: returns Future<T>
  /// Otherwise: returns declared returnType
  TypeIR get effectiveReturnType {
    if (isGenerator) {
      if (isAsync) {
        // async* returns Stream<T>
        return returnType; // Already wrapped by analyzer
      } else {
        // sync* returns Iterable<T>
        return returnType; // Already wrapped by analyzer
      }
    }
    if (isAsync) {
      // async returns Future<T>
      return returnType; // Already wrapped by analyzer
    }
    return returnType;
  }

  /// Whether this function can be called synchronously
  bool get isSynchronous => !isAsync && !isGenerator;

  /// Validates this function declaration for consistency
  ///
  /// Returns list of validation errors, empty if valid
  List<String> validate() {
    final errors = <String>[];

    // async and sync generator are mutually exclusive
    if (isAsync && isSyncGenerator) {
      errors.add('Function cannot be both async and sync generator');
    }

    // factory cannot be abstract or static
    if (isFactory) {
      if (isAbstract) {
        errors.add('Factory constructor cannot be abstract');
      }
      if (isStatic) {
        errors.add('Factory constructor cannot be static');
      }
    }

    // const constructor cannot be async or generator
    if (isConst) {
      if (isAsync) {
        errors.add('Const constructor cannot be async');
      }
      if (isGenerator) {
        errors.add('Const constructor cannot be generator');
      }
    }

    // ✅ FIXED: abstract methods cannot have body (body is now List<StatementIR>?)
    if (isAbstract && body != null && body!.isNotEmpty) {
      errors.add('Abstract method cannot have implementation');
    }

    // external functions should not have body (though some patterns allow it)
    if (isExternal && body != null && body!.isNotEmpty) {
      // This is sometimes valid, so warning only
    }

    // getter/setter consistency
    if (isGetter) {
      if (parameters.isNotEmpty) {
        errors.add('Getter cannot have parameters');
      }
      if (isSetter) {
        errors.add('Function cannot be both getter and setter');
      }
    }

    if (isSetter) {
      if (parameters.length != 1) {
        errors.add('Setter must have exactly one parameter');
      }
    }

    // constructor validation
    if (isConstructor) {
      if (returnType.name != 'void' && returnType.name != constructorClass) {
        errors.add(
          'Constructor return type must match class name or be implicit',
        );
      }
    }

    // duplicate parameter names
    final paramNames = <String>{};
    for (final param in parameters) {
      if (paramNames.contains(param.name)) {
        errors.add('Duplicate parameter name: ${param.name}');
      }
      paramNames.add(param.name);
    }

    return errors;
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'returnType': returnType.toJson(),
      'parameters': parameters.map((p) => p.toJson()).toList(),
      'isAsync': isAsync,
      'isGenerator': isGenerator,
      'isSyncGenerator': isSyncGenerator,
      'typeParameters': typeParameters.map((tp) => tp.toJson()).toList(),
      'sourceLocation': sourceLocation.toJson(),
      if (documentation != null) 'documentation': documentation,
      if (annotations.isNotEmpty)
        'annotations': annotations.map((a) => a.toJson()).toList(),
      'visibility': visibility.toString().split('.').last,
      'isStatic': isStatic,
      'isAbstract': isAbstract,
      'isGetter': isGetter,
      'isSetter': isSetter,
      'isOperator': isOperator,
      'isFactory': isFactory,
      'isConst': isConst,
      'isExternal': isExternal,
      'isLate': isLate,
      if (constructorClass != null) 'constructorClass': constructorClass,
      if (constructorName != null) 'constructorName': constructorName,
      if (redirectsTo != null) 'redirectsTo': redirectsTo,
      'isWidgetReturnType': isWidgetReturnType,
    };
  }

  @override
  String toString() => signature;
}

/// Represents a type parameter in a generic function or class
///
/// Examples: T, K extends Comparable<K>, U super Animal

/// Represents a method declaration (instance, static, or abstract)
@immutable
class MethodDecl extends FunctionDecl {
  /// Name of the class containing this method
  final String? className;

  /// Whether this method overrides a parent class method
  ///
  /// Not definitive - just indicates @override annotation
  final bool markedOverride;

  /// For overridden methods: the method signature being overridden
  final String? overriddenSignature;

  MethodDecl({
    required super.id,
    required super.name,
    required super.returnType,
    super.parameters = const [],
    super.body,
    super.isAsync = false,
    super.isGenerator = false,
    super.isSyncGenerator = false,
    super.typeParameters = const [],
    required super.sourceLocation,
    super.documentation,
    super.annotations = const [],
    super.visibility = VisibilityModifier.public,
    super.isStatic = false,
    super.isAbstract = false,
    super.isGetter = false,
    super.isSetter = false,
    super.isOperator = false,
    super.isFactory = false,
    super.isConst = false,
    super.isExternal = false,
    super.isLate = false,
    this.className,
    this.markedOverride = false,
    this.overriddenSignature,
    super.isWidgetReturnType = false,
    super.isWidgetFunction,
  });

  /// Full method name with class context
  String get fullQualifiedName => className != null ? '$className.$name' : name;

  Map<String, dynamic> toJson() {
    return {
      'className': className,
      'name': name,
      'returnType': returnType.toJson(),
      'parameters': parameters.map((p) => p.toJson()).toList(),
      'isAsync': isAsync,
      'isGenerator': isGenerator,
      'isSyncGenerator': isSyncGenerator,
      'typeParameters': typeParameters.map((tp) => tp.toJson()).toList(),
      'sourceLocation': sourceLocation.toJson(),
      if (documentation != null) 'documentation': documentation,
      if (annotations.isNotEmpty)
        'annotations': annotations.map((a) => a.toJson()).toList(),
      'visibility': visibility.toString().split('.').last,
      'isStatic': isStatic,
      'isAbstract': isAbstract,
      'isGetter': isGetter,
      'isSetter': isSetter,
      'isOperator': isOperator,
      'isFactory': isFactory,
      'isConst': isConst,
      'isExternal': isExternal,
      'isLate': isLate,
      'markedOverride': markedOverride,
      if (overriddenSignature != null)
        'overriddenSignature': overriddenSignature,
    };
  }
}

/// Specialized FunctionDecl for constructors
///
/// Captures constructor-specific semantics
@immutable
class ConstructorDecl extends FunctionDecl {
  /// Initializer list (field assignments before body)
  ///
  /// Example: Point(int x, int y) : this.x = x, this.y = y { ... }
  final List<ConstructorInitializer> initializers;

  /// Positional super() call in initializer list
  final SuperConstructorCall? superCall;

  /// Redirected constructor call (if redirecting constructor)
  final RedirectedConstructorCall? redirectedCall;

  ConstructorDecl({
    required String id,
    required String name,
    required String constructorClass,
    String? constructorName,
    List<ParameterDecl> parameters = const [],
    List<StatementIR>?
    body, // ✅ FIXED: Changed from StatementIR? to List<StatementIR>?
    bool isFactory = false,
    bool isConst = false,
    bool isExternal = false,
    List<TypeParameterDecl> typeParameters = const [],
    required SourceLocationIR sourceLocation,
    String? documentation,
    List<AnnotationIR> annotations = const [],
    this.initializers = const [],
    this.superCall,
    this.redirectedCall,
    super.isWidgetFunction = false,
  }) : super(
         id: id,
         name: name,
         returnType: VoidTypeIR(
           id: '${id}_returnType',
           sourceLocation: sourceLocation,
         ),
         parameters: parameters,
         body: body,
         typeParameters: typeParameters,
         sourceLocation: sourceLocation,
         documentation: documentation,
         annotations: annotations,
         isFactory: isFactory,
         isConst: isConst,
         isExternal: isExternal,
         constructorClass: constructorClass,
         constructorName: constructorName,
       );

  /// Whether this is a default (unnamed) constructor
  bool get isDefaultConstructor => constructorName == null;

  /// Whether this is a named constructor
  bool get isNamedConstructor => constructorName != null;

  /// Declaration including initializers
  String get fullDeclaration {
    final sig = signature;
    if (initializers.isEmpty && superCall == null && redirectedCall == null) {
      return sig;
    }

    final inits = <String>[];
    if (initializers.isNotEmpty) {
      inits.addAll(initializers.map((i) => i.toString()));
    }
    if (superCall != null) {
      inits.add(superCall.toString());
    }
    if (redirectedCall != null) {
      inits.add(redirectedCall.toString());
    }

    return '$sig : ${inits.join(", ")}';
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'constructorClass': constructorClass,
      if (constructorName != null) 'constructorName': constructorName,
      'parameters': parameters.map((p) => p.toJson()).toList(),
      'isFactory': isFactory,
      'isConst': isConst,
      'isExternal': isExternal,
      'typeParameters': typeParameters.map((tp) => tp.toJson()).toList(),
      'initializers': initializers.map((init) => init.toString()).toList(),
      if (superCall != null) 'superCall': superCall.toString(),
      if (redirectedCall != null) 'redirectedCall': redirectedCall.toString(),
      'sourceLocation': sourceLocation.toJson(),
      if (documentation != null) 'documentation': documentation,
      if (annotations.isNotEmpty)
        'annotations': annotations.map((a) => a.toJson()).toList(),
    };
  }
}

/// Represents an initializer in a constructor's initializer list
///
/// Example: `this.x = x` in `Point(int x) : this.x = x { ... }`
@immutable
class ConstructorInitializer {
  /// Name of the field being initialized
  final String fieldName;

  /// Expression to initialize the field with
  final ExpressionIR value;

  /// Whether this is `this.field` (vs just field in super call)
  final bool isThisField;

  /// Where this initializer appears in source
  final SourceLocationIR sourceLocation;

  const ConstructorInitializer({
    required this.fieldName,
    required this.value,
    this.isThisField = true,
    required this.sourceLocation,
  });

  @override
  String toString() =>
      '${isThisField ? "this." : ""}$fieldName = ${value.toShortString()}';
}

/// Represents a super() call in initializer list
///
/// Example: `super.named(args)` in constructor initializer
@immutable
class SuperConstructorCall {
  /// Name of the super constructor (if named)
  final String? constructorName;

  /// Arguments passed to super constructor
  final List<ExpressionIR> arguments;

  /// Named arguments
  final Map<String, ExpressionIR> namedArguments;

  /// Where this appears in source
  final SourceLocationIR sourceLocation;

  const SuperConstructorCall({
    this.constructorName,
    this.arguments = const [],
    this.namedArguments = const {},
    required this.sourceLocation,
  });

  @override
  String toString() {
    final name = constructorName != null ? '.${constructorName!}' : '';
    final args = arguments.map((a) => a.toShortString()).join(', ');
    final named = namedArguments.entries
        .map((e) => '${e.key}: ${e.value.toShortString()}')
        .join(', ');
    final allArgs = [args, named].where((s) => s.isNotEmpty).join(', ');
    return 'super$name(${allArgs})';
  }
}

/// Represents a redirected constructor call
///
/// Example: `this.other(args)` in redirecting constructor
@immutable
class RedirectedConstructorCall {
  /// Name of the redirected constructor (if named)
  final String? constructorName;

  /// Arguments passed to redirected constructor
  final List<ExpressionIR> arguments;

  /// Named arguments
  final Map<String, ExpressionIR> namedArguments;

  /// Where this appears in source
  final SourceLocationIR sourceLocation;

  const RedirectedConstructorCall({
    this.constructorName,
    this.arguments = const [],
    this.namedArguments = const {},
    required this.sourceLocation,
  });

  @override
  String toString() {
    final name = constructorName != null ? '.${constructorName!}' : '';
    final args = arguments.map((a) => a.toShortString()).join(', ');
    final named = namedArguments.entries
        .map((e) => '${e.key}: ${e.value.toShortString()}')
        .join(', ');
    final allArgs = [args, named].where((s) => s.isNotEmpty).join(', ');
    return 'this$name(${allArgs})';
  }
}
