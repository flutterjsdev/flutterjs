import 'package:meta/meta.dart';
import '../../../ast_it.dart';
import '../core/source_location.dart';
import 'operations.dart';
import '../core/ir_node.dart';
import '../types/type_ir.dart';

/// =============================================================================
///  EXPRESSION IR REPRESENTATIONS
///  Core for expression analysis in the custom Dart IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Models all possible Dart expressions as immutable IR nodes, enabling:
/// • Type inference
/// • Constant evaluation
/// • Dependency analysis
/// • Code generation
/// • Linting/optimization
///
/// Covers literals, operations, calls, collections, and more.
///
/// KEY COMPONENTS
/// --------------
/// 1. ExpressionIR         → Abstract base for all expressions
/// 2. LiteralExpressionIR  → Numbers, strings, booleans, null
/// 3. IdentifierExpressionIR → Variable references (this, super)
/// 4. BinaryExpressionIR   → Arithmetic/logical operations
/// 5. MethodCallExpressionIR → obj.method(args)
/// 6. PropertyAccessExpressionIR → obj.property
/// 7. ConditionalExpressionIR → cond ? then : else
/// 8. List/Map/SetExpressionIR → Collection literals
/// 9. IndexAccessExpressionIR → obj[index]
/// 10. UnaryExpressionIR   → !operand, ++var
/// 11. CastExpressionIR    → expr as Type
/// 12. ConstructorCallExpressionIR → Class(args)
/// 13. FunctionExpressionIR → (params) => body
/// 14. Specialized: FlutterWidgetConstructorIR, WidgetPropertyIR, etc.
///
/// FEATURES
/// --------
/// • Result type tracking (resultType)
/// • Const detection (isConstant)
/// • Null-aware/cascade support
/// • JSON serialization (toJson/fromJson)
/// • Human-readable toShortString()
/// • Content equality checks
///
/// USAGE EXAMPLE
/// -------------
/// ```dart
/// // Create a binary expression: x + 1
/// final binExpr = BinaryExpressionIR(
///   id: 'bin1',
///   sourceLocation: loc,
///   left: IdentifierExpressionIR(... 'x' ...),
///   operator: BinaryOperatorIR.add,
///   right: LiteralExpressionIR(... 1 ...),
///   resultType: intType,
/// );
///
/// // Check if constant
/// if (binExpr.isConstant) { ... }
///
/// // Serialize
/// final json = binExpr.toJson();
/// ```
///
/// EXTENSIBILITY
/// -------------
/// • Add new expression types by subclassing ExpressionIR
/// • Implement custom visitors (see expression_visitor.dart)
/// • Use metadata for framework-specific data (e.g., Flutter)
///
/// RELATED FILES
/// -------------
/// • ir_node.dart                → Base IRNode
/// • type_ir.dart                → Type representations
/// • expression_types/operations/operations.dart → Binary/Unary details
/// • variable_collector.dart     → Example visitor
/// • expression_visitor.dart     → Traversal framework
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
@immutable
abstract class ExpressionIR extends IRNode {
  /// The type this expression evaluates to
  final TypeIR resultType;

  /// Whether this expression can be evaluated at compile time
  final bool isConstant;

  const ExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.resultType,
    this.isConstant = false,
    required super.metadata,
  });

  /// Human-readable expression for debugging
  @override
  String toShortString();

  @override
  bool contentEquals(IRNode other) {
    if (other is! ExpressionIR) return false;
    return resultType.contentEquals(other.resultType);
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'resultType': resultType.toJson(),
      'sourceLocation': sourceLocation.toJson(),
      'isConstant': isConstant,
      'expressionType': runtimeType.toString(),
    };
  }
}

/// Represents the implicit receiver in a cascade section
@immutable
class CascadeReceiverExpressionIR extends ExpressionIR {
  const CascadeReceiverExpressionIR({
    required super.id,
    required super.sourceLocation,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() => '..';

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson()};
  }
}

// =============================================================================
// ENUMS
// =============================================================================

enum LiteralType {
  stringValue,
  intValue,
  doubleValue,
  boolValue,
  nullValue,
  listValue,
  mapValue,
  setValue,
}

enum BinaryOperatorIR {
  add,
  subtract,
  multiply,
  divide,
  modulo,
  floorDivide,
  equals,
  notEquals,
  lessThan,
  greaterThan,
  lessThanOrEqual,
  greaterThanOrEqual,
  logicalAnd,
  logicalOr,
  bitwiseAnd,
  bitwiseOr,
  bitwiseXor,
  leftShift,
  rightShift,
  nullCoalesce,
}

// =============================================================================
// LITERAL EXPRESSION
// =============================================================================

class NamedArgumentIR extends ExpressionIR {
  final String name;
  final ExpressionIR value;

  NamedArgumentIR({
    required super.id,
    required this.name,
    required this.value,
    required super.sourceLocation,
    required super.metadata,
    required super.resultType,
  });

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson(), 'name': name, 'value': value.toString()};
  }
}

/// Represents a literal value (number, string, boolean, null)
@immutable
class LiteralExpressionIR extends ExpressionIR {
  /// The literal value
  final dynamic value;

  /// Type of literal
  final LiteralType literalType;

  const LiteralExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.value,
    required this.literalType,
    super.metadata,
  }) : super(isConstant: true);

  @override
  String toShortString() {
    switch (literalType) {
      case LiteralType.stringValue:
        return '"$value"';
      case LiteralType.intValue:
      case LiteralType.doubleValue:
        return value.toString();
      case LiteralType.boolValue:
        return value ? 'true' : 'false';
      case LiteralType.nullValue:
        return 'null';
      default:
        return value.toString();
    }
  }

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson(), 'value': value, 'literalType': literalType.name};
  }
}

// =============================================================================
// IDENTIFIER EXPRESSION
// =============================================================================

/// Represents a variable or constant reference
@immutable
class IdentifierExpressionIR extends ExpressionIR {
  /// Name of the variable/constant
  final String name;

  /// Whether this is a reference to `this`
  final bool isThisReference;

  /// Whether this is a reference to `super`
  final bool isSuperReference;

  const IdentifierExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.name,
    this.isThisReference = false,
    this.isSuperReference = false,
    super.metadata,
  });

  @override
  String toShortString() => name;

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'name': name,
      'isThisReference': isThisReference,
      'isSuperReference': isSuperReference,
    };
  }
}

// =============================================================================
// BINARY EXPRESSION
// =============================================================================

/// Represents a binary operation (two operands and an operator)
@immutable
class BinaryExpressionIR extends ExpressionIR {
  /// Left operand
  final ExpressionIR left;

  /// Operator
  final BinaryOperatorIR operator;

  /// Right operand
  final ExpressionIR right;

  const BinaryExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.left,
    required this.operator,
    required this.right,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${left.toShortString()} ${operator.name} ${right.toShortString()}';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'left': left.toJson(),
      'operator': operator.name,
      'right': right.toJson(),
    };
  }
}

// =============================================================================
// METHOD CALL EXPRESSION
// =============================================================================

/// Represents a method or function call
@immutable
class MethodCallExpressionIR extends ExpressionIR {
  /// The object this method is called on (null for functions)
  final ExpressionIR? target;

  /// Method name
  final String methodName;

  /// Positional arguments
  final List<ExpressionIR> arguments;

  /// Named arguments
  final Map<String, ExpressionIR> namedArguments;

  /// Whether this is a null-aware call (?.method())
  final bool isNullAware;

  /// Whether this is a cascade call (..method())
  final bool isCascade;

  final List<TypeIR> typeArguments; // ← ADD THIS

  const MethodCallExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.methodName,
    required this.typeArguments, // ← ADD THIS
    this.target,
    this.arguments = const [],
    this.namedArguments = const {},
    this.isNullAware = false,
    this.isCascade = false,
    super.metadata,
  });

  @override
  String toShortString() {
    final targetStr = target?.toShortString() ?? '';
    final op = isNullAware ? '?.' : (isCascade ? '..' : '.');

    final posArgs = arguments.map((a) => a.toShortString()).join(', ');

    // ✓ INCLUDE NAMED ARGUMENTS WITH KEYS
    final namedArgs = namedArguments.entries
        .map((e) => '${e.key}: ${e.value.toShortString()}')
        .join(', ');

    final allArgs = [posArgs, namedArgs].where((s) => s.isNotEmpty).join(', ');

    return '$targetStr$op$methodName($allArgs)';
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'target': target?.toJson(),
      'methodName': methodName,
      'arguments': arguments.map((a) => a.toJson()).toList(),
      'namedArguments': namedArguments.map((k, v) => MapEntry(k, v.toJson())),
      'isNullAware': isNullAware,
      'isCascade': isCascade,
    };
  }
}

// =============================================================================
// PROPERTY ACCESS EXPRESSION
// =============================================================================

/// Represents accessing a property on an object
@immutable
class PropertyAccessExpressionIR extends ExpressionIR {
  /// The object whose property is accessed
  final ExpressionIR target;

  /// Property name
  final String propertyName;

  /// Whether this is null-aware access (?.property)
  final bool isNullAware;

  /// Whether this is a cascade access (..property)
  final bool isCascade;

  const PropertyAccessExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.target,
    required this.propertyName,
    this.isNullAware = false,
    this.isCascade = false,
    super.metadata,
  });

  @override
  String toShortString() {
    final op = isNullAware ? '?.' : (isCascade ? '..' : '.');
    return '${target.toShortString()}$op$propertyName';
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'target': target.toJson(),
      'propertyName': propertyName,
      'isNullAware': isNullAware,
    };
  }
}

class WidgetPropertyIR extends ExpressionIR {
  final String propertyName;
  final ExpressionIR value;
  final TypeIR? expectedType;
  final bool isCallback; // onPressed, onChanged, etc.

  const WidgetPropertyIR({
    required super.id,
    required this.propertyName,
    required this.value,
    this.expectedType,
    required super.resultType,
    this.isCallback = false,
    required super.sourceLocation,
    required super.metadata,
  });

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'expectedType': expectedType,
      'propertyName': propertyName,
      'value': value.toString(),
      'isCallback': isCallback,
      'sourceLocation': sourceLocation.toString(),
    };
  }
}

@immutable
class ConstructorCallExpressionIR extends ExpressionIR {
  /// The class/widget being instantiated
  final String className;

  final String? constructorName;

  /// Named arguments like key:, child:, title:
  final Map<String, ExpressionIR> namedArguments;

  /// Positional arguments
  final List<ExpressionIR> positionalArguments;

  final List<NamedArgumentIR> namedArgumentsDetailed; // ✅ ADD THIS

  const ConstructorCallExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.className,
    this.constructorName = '',
    this.namedArguments = const {},
    required this.namedArgumentsDetailed,
    this.positionalArguments = const [],
    required super.resultType,
    super.metadata,
    required List<ExpressionIR> arguments,
    super.isConstant = false,
  });

  String? get effectiveConstructorName =>
      (constructorName?.isEmpty ?? true) ? className : constructorName;

  @override
  String toShortString() => '$className(...)';
  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'className': className,
      'constructorName': constructorName,
      'positionalArguments': positionalArguments
          .map((a) => a.toJson())
          .toList(),
      'namedArguments': Map.fromEntries(
        namedArguments.entries.map((e) => MapEntry(e.key, e.value.toJson())),
      ),
      'namedArgumentsDetailed': namedArgumentsDetailed
          .map((n) => n.toJson())
          .toList(),
    };
  }
}

class FlutterWidgetConstructorIR extends ConstructorCallExpressionIR {
  final List<WidgetPropertyIR> widgetProperties; // ✅ NEW
  final bool isConstConstructor;
  final List<String> appliedModifiers; // const, final, etc.

  const FlutterWidgetConstructorIR({
    required super.id,
    required super.className,
    required super.positionalArguments,
    required super.namedArguments,
    required super.arguments,
    required super.namedArgumentsDetailed,
    required this.widgetProperties, // ✅ NEW
    required this.isConstConstructor,
    required this.appliedModifiers,
    required super.resultType,
    required super.sourceLocation,
    required super.metadata,
  });
}

@immutable
class FunctionExpressionIR extends ExpressionIR {
  final List<ParameterDecl> parameter;
  final FunctionBodyIR? body; // null if not yet analyzed
  final TypeIR? returnType;
  final bool isAsync;
  final bool isGenerator;

  FunctionExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.parameter,
    this.body,
    super.metadata,
    this.returnType,
    this.isAsync = false,
    this.isGenerator = false,
  }) : super(
         resultType: DynamicTypeIR(
           id: 'dynamic',
           sourceLocation: SourceLocationIR(
             id: 'loc_dynamic',
             file: 'builtin',
             line: 0,
             column: 0,
             offset: 0,
             length: 0,
           ),
         ),
       );

  @override
  String toShortString() => '(${parameter.join(', ')}) => ...';
  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      "parameter": parameter.map((e) => e.toJson()).toList(),
      'returnType': returnType?.toJson() ?? {},
      "body": body?.toJson() ?? {},
      "isAsync": isAsync,
      "isGenerator": isGenerator,
    };
  }
}

// =============================================================================
// CONDITIONAL EXPRESSION
// =============================================================================

/// Represents a ternary conditional expression
@immutable
class ConditionalExpressionIR extends ExpressionIR {
  /// The condition
  final ExpressionIR condition;

  /// Expression if condition is true
  final ExpressionIR thenExpression;

  /// Expression if condition is false
  final ExpressionIR elseExpression;

  const ConditionalExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.condition,
    required this.thenExpression,
    required this.elseExpression,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${condition.toShortString()} ? ${thenExpression.toShortString()} : ${elseExpression.toShortString()}';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'condition': condition.toJson(),
      'thenExpression': thenExpression.toJson(),
      'elseExpression': elseExpression.toJson(),
    };
  }
}

// =============================================================================
// COLLECTION EXPRESSIONS
// =============================================================================

/// Represents a list literal
@immutable
class ListExpressionIR extends ExpressionIR {
  /// Elements in the list
  final List<ExpressionIR> elements;

  /// Whether declared with const keyword
  final bool isConst;

  const ListExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.elements,
    this.isConst = false,
    super.metadata,
  }) : super(isConstant: isConst);

  @override
  bool get isConstant => isConst && elements.every((e) => e.isConstant);
  @override
  String toShortString() => '[${elements.length} items]';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'elements': elements.map((e) => e.toJson()).toList(),
      'isConst': isConst,
    };
  }
}

/// Represents a map literal
@immutable
class MapExpressionIR extends ExpressionIR {
  /// Elements (entries, conditionals, spreads)
  final List<ExpressionIR> elements;

  /// Whether declared with const keyword
  final bool isConst;

  const MapExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.elements,
    this.isConst = false,
    super.metadata,
  }) : super(isConstant: isConst);

  @override
  bool get isConstant => isConst && elements.every((e) => e.isConstant);
  @override
  String toShortString() => '{${elements.length} entries}';

  @override
  Map<String, dynamic> toJson() {
    return {
      'elements': elements.map((e) => e.toJson()).toList(),
      'isConst': isConst,
    };
  }
}

/// A single key-value entry in a map literal
@immutable
class MapEntryIR extends ExpressionIR {
  /// The key expression in this map entry
  final ExpressionIR key;

  /// The value expression in this map entry
  final ExpressionIR value;

  MapEntryIR({
    required super.id,
    required super.sourceLocation,
    required this.key,
    required this.value,
    super.metadata,
  }) : super(
         resultType: DynamicTypeIR(
           id: 'dynamic',
           sourceLocation: sourceLocation,
         ),
         isConstant: false,
       ); // Usually not an expression in itself but used here as one

  /// Whether both key and value are constant expressions
  @override
  bool get isConstant => key.isConstant && value.isConstant;

  /// Short string representation of this map entry
  @override
  String toShortString() => '${key.toShortString()}: ${value.toShortString()}';

  /// Convert to JSON for serialization
  @override
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sourceLocation': sourceLocation.toJson(),
      'key': key.toJson(),
      'value': value.toJson(),
      if (metadata.isNotEmpty) 'metadata': metadata,
    };
  }
}

/// Represents a set literal
@immutable
class SetExpressionIR extends ExpressionIR {
  final List<ExpressionIR> elements;
  final bool isConst;

  const SetExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.elements,
    this.isConst = false,
    super.metadata,
  }) : super(isConstant: isConst); // ← Just false here!

  // ← ADD THIS GETTER (1 line!)
  @override
  bool get isConstant => isConst && elements.every((e) => e.isConstant);

  @override
  String toShortString() => '{${elements.length} items}';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'elements': elements.map((e) => e.toJson()).toList(),
      'isConst': isConst,
    };
  }
}

// =============================================================================
// INDEX ACCESS EXPRESSION
// =============================================================================

/// Represents index access on a collection
@immutable
class IndexAccessExpressionIR extends ExpressionIR {
  /// The collection being indexed
  final ExpressionIR target;

  /// The index expression
  final ExpressionIR index;

  /// Whether this is null-aware access ([?index])
  final bool isNullAware;

  const IndexAccessExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.target,
    required this.index,
    this.isNullAware = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${target.toShortString()}${isNullAware ? "?[" : "["}${index.toShortString()}]';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'target': target.toJson(),
      'index': index.toJson(),
      'isNullAware': isNullAware,
    };
  }
}

// =============================================================================
// UNARY EXPRESSION
// =============================================================================

/// Represents a unary operation (one operand and an operator)
@immutable
class UnaryExpressionIR extends ExpressionIR {
  /// The operator (!, -, ~, ++, --, etc.)
  final UnaryOperator operator;

  /// The operand
  final ExpressionIR operand;

  /// Whether operator is prefix (++x) or postfix (x++)
  final bool isPrefix;

  const UnaryExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.operator,
    required this.operand,
    this.isPrefix = true,
    super.metadata,
  });

  @override
  String toShortString() => isPrefix
      ? '$operator${operand.toShortString()}'
      : '${operand.toShortString()}$operator';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'operator': operator.name,
      'operand': operand.toJson(),
      'isPrefix': isPrefix,
    };
  }
}

// =============================================================================
// CAST EXPRESSION
// =============================================================================

@immutable
class CascadeSection extends IRNode {
  final String type; // 'method', 'property', 'index'
  final String name;
  final List<ExpressionIR>? arguments; // for method calls
  final ExpressionIR? value; // for property/index assignment

  const CascadeSection({
    required super.id,
    required super.sourceLocation,
    required this.type,
    required this.name,
    this.arguments,
    this.value,
    super.metadata,
  });

  @override
  String toShortString() => '..$name';
}

/// Represents a type cast expression
@immutable
class CastExpressionIR extends ExpressionIR {
  /// The expression being cast
  final ExpressionIR expression;

  /// The target type
  final TypeIR targetType;

  const CastExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.expression,
    required this.targetType,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${expression.toShortString()} as ${targetType.displayName()}';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'expression': expression.toJson(),
      'targetType': targetType.toJson(),
    };
  }
}

@immutable
class IsExpressionIR extends ExpressionIR {
  final ExpressionIR expression;
  final TypeIR targetType;
  final bool isNegated;

  IsExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    required this.targetType,
    this.isNegated = false,
    super.metadata,
  }) : super(
         resultType: SimpleTypeIR(
           id: 'type_bool',
           name: 'bool',
           isNullable: false,
           sourceLocation: SourceLocationIR(
             id: 'loc_bool',
             file: 'builtin',
             line: 0,
             column: 0,
             offset: 0,
             length: 0,
           ),
         ),
       );

  @override
  String toShortString() =>
      '${expression.toShortString()} ${isNegated ? 'is!' : 'is'} ${targetType.displayName()}';
}

@immutable
class UnknownExpressionIR extends ExpressionIR {
  final String source;

  UnknownExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.source,
    super.metadata,
  }) : super(
         resultType: DynamicTypeIR(
           id: 'dynamic',
           sourceLocation: SourceLocationIR(
             id: 'loc_dynamic',
             file: 'builtin',
             line: 0,
             column: 0,
             offset: 0,
             length: 0,
           ),
         ),
       );

  @override
  String toShortString() => source;
}
