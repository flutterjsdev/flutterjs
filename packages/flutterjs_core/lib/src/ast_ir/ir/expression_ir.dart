import 'package:meta/meta.dart';
import '../ast_it.dart';
import '../diagnostics/source_location.dart';
import 'expression_types/operations/operations.dart';
import 'ir_node.dart';
import 'type_ir.dart';

// =============================================================================
// BASE EXPRESSION IR
// =============================================================================

/// Base class for all expression representations in the IR
///
/// Expressions are code fragments that evaluate to a value
/// Examples: 42, "hello", x + 1, obj.property, functionCall()
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

  /// Factory for deserializing expressions from JSON
  factory ExpressionIR.fromJson(Map<String, dynamic> json) {
    final type = json['expressionType'] as String?;
    final sourceLocation = SourceLocationIR.fromJson(
      json['sourceLocation'] as Map<String, dynamic>,
    );
    final resultType = TypeIR.fromJson(
      json['resultType'] as Map<String, dynamic>,
    );

    switch (type) {
      case 'LiteralExpressionIR':
        return LiteralExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          value: json['value'],
          literalType: LiteralType.values.firstWhere(
            (lt) => lt.name == json['literalType'],
            orElse: () => LiteralType.nullValue,
          ),
        );
      case 'IdentifierExpressionIR':
        return IdentifierExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          name: json['name'] as String,
          isThisReference: json['isThisReference'] as bool? ?? false,
          isSuperReference: json['isSuperReference'] as bool? ?? false,
        );
      case 'BinaryExpressionIR':
        return BinaryExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          left: ExpressionIR.fromJson(json['left'] as Map<String, dynamic>),
          operator: BinaryOperatorIR.values.firstWhere(
            (op) => op.name == json['operator'],
            orElse: () => BinaryOperatorIR.add,
          ),
          right: ExpressionIR.fromJson(json['right'] as Map<String, dynamic>),
        );
      case 'MethodCallExpressionIR':
        return MethodCallExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          target: json['target'] != null
              ? ExpressionIR.fromJson(json['target'] as Map<String, dynamic>)
              : null,
          methodName: json['methodName'] as String,
          arguments: (json['arguments'] as List<dynamic>? ?? [])
              .map((a) => ExpressionIR.fromJson(a as Map<String, dynamic>))
              .toList(),
          namedArguments:
              (json['namedArguments'] as Map<String, dynamic>? ?? {}).map(
                (k, v) => MapEntry(
                  k,
                  ExpressionIR.fromJson(v as Map<String, dynamic>),
                ),
              ),
          isNullAware: json['isNullAware'] as bool? ?? false,
          isCascade: json['isCascade'] as bool? ?? false,
        );
      case 'PropertyAccessExpressionIR':
        return PropertyAccessExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          target: ExpressionIR.fromJson(json['target'] as Map<String, dynamic>),
          propertyName: json['propertyName'] as String,
          isNullAware: json['isNullAware'] as bool? ?? false,
        );
      case 'ConditionalExpressionIR':
        return ConditionalExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          condition: ExpressionIR.fromJson(
            json['condition'] as Map<String, dynamic>,
          ),
          thenExpression: ExpressionIR.fromJson(
            json['thenExpression'] as Map<String, dynamic>,
          ),
          elseExpression: ExpressionIR.fromJson(
            json['elseExpression'] as Map<String, dynamic>,
          ),
        );
      case 'ListExpressionIR':
        return ListExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          elements: (json['elements'] as List<dynamic>? ?? [])
              .map((e) => ExpressionIR.fromJson(e as Map<String, dynamic>))
              .toList(),
          isConst: json['isConst'] as bool? ?? false,
        );
      case 'MapExpressionIR':
        return MapExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          entries: (json['entries'] as List<dynamic>? ?? [])
              .map((e) => MapEntryIR.fromJson(e as Map<String, dynamic>))
              .toList(),
          isConst: json['isConst'] as bool? ?? false,
        );
      case 'SetExpressionIR':
        return SetExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          elements: (json['elements'] as List<dynamic>? ?? [])
              .map((e) => ExpressionIR.fromJson(e as Map<String, dynamic>))
              .toList(),
          isConst: json['isConst'] as bool? ?? false,
        );
      case 'IndexAccessExpressionIR':
        return IndexAccessExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          target: ExpressionIR.fromJson(json['target'] as Map<String, dynamic>),
          index: ExpressionIR.fromJson(json['index'] as Map<String, dynamic>),
          isNullAware: json['isNullAware'] as bool? ?? false,
        );
      case 'UnaryExpressionIR':
        UnaryOperator getUnaryOperator(String json) {
          switch (json) {
            case 'negate':
              return UnaryOperator.negate;
            case 'logicalNot':
              return UnaryOperator.logicalNot;
            case 'bitwiseNot':
              return UnaryOperator.bitwiseNot;
            case 'preIncrement':
              return UnaryOperator.preIncrement;
            case 'preDecrement':
              return UnaryOperator.preDecrement;
            case 'postIncrement':
              return UnaryOperator.postIncrement;
            case 'postDecrement':
              return UnaryOperator.postDecrement;
            default:
              return UnaryOperator.negate;
          }
        }
        UnaryOperator unary = getUnaryOperator(json['opetatir']);
        return UnaryExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          operator: unary,
          operand: ExpressionIR.fromJson(
            json['operand'] as Map<String, dynamic>,
          ),
          isPrefix: json['isPrefix'] as bool? ?? true,
        );
      case 'CastExpressionIR':
        return CastExpressionIR(
          id: json['id'] as String,
          resultType: resultType,
          sourceLocation: sourceLocation,
          expression: ExpressionIR.fromJson(
            json['expression'] as Map<String, dynamic>,
          ),
          targetType: TypeIR.fromJson(
            json['targetType'] as Map<String, dynamic>,
          ),
        );
      default:
        throw UnimplementedError('Unknown ExpressionIR type: $type');
    }
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

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'value': value.toString(),
      'sourceLocation': sourceLocation.toString(),
    };
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

  const MethodCallExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.methodName,
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
    final argsStr = arguments.map((a) => a.toShortString()).join(', ');
    return '$targetStr$op$methodName($argsStr)';
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

  const PropertyAccessExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.target,
    required this.propertyName,
    this.isNullAware = false,
    super.metadata,
  });

  @override
  String toShortString() {
    final op = isNullAware ? '?.' : '.';
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

class WidgetPropertyIR extends ExpressionIR{

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

  Map<String, dynamic> toJson() {
    return {
      'id': id,
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

  /// Named arguments like key:, child:, title:
  final Map<String, ExpressionIR> namedArguments;

  /// Positional arguments
  final List<ExpressionIR> positionalArguments;

   final List<NamedArgumentIR> namedArgumentsDetailed; // ✅ ADD THIS

  const ConstructorCallExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.className,
    this.namedArguments = const {},
      required this.namedArgumentsDetailed, // ✅ ADD THIS
    this.positionalArguments = const [],
    required super.resultType,
    super.metadata, required List<ExpressionIR> arguments,
  });

  @override
  String toShortString() => '$className(...)';
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
  final List<String> parameterNames;
  final List<StatementIR>? body; // null if not yet analyzed

   FunctionExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.parameterNames,
    this.body,
    super.metadata,
  }) : super(resultType:  DynamicTypeIR(id: 'dynamic', sourceLocation: SourceLocationIR(
    id: 'loc_dynamic',
    file: 'builtin',
    line: 0,
    column: 0,
    offset: 0,
    length: 0,
  )));

  @override
  String toShortString() => '(${parameterNames.join(', ')}) => ...';
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
  /// Key-value pairs
  final List<MapEntryIR> entries;

  /// Whether declared with const keyword
  final bool isConst;

  const MapExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.entries,
    this.isConst = false,
    super.metadata,
  }) : super(isConstant: isConst);

  @override
  bool get isConstant => isConst && entries.every((e) => e.isConstant);
  @override
  String toShortString() => '{${entries.length} entries}';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'entries': entries.map((e) => e.toJson()).toList(),
      'isConst': isConst,
    };
  }
}

/// A single key-value entry in a map literal

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
      'operator': operator,
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
  }) : super(resultType:  SimpleTypeIR(
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
  ));

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
  }) : super(resultType:  DynamicTypeIR(id: 'dynamic', sourceLocation: SourceLocationIR(
    id: 'loc_dynamic',
    file: 'builtin',
    line: 0,
    column: 0,
    offset: 0,
    length: 0,
  )));

  @override
  String toShortString() => source;
}