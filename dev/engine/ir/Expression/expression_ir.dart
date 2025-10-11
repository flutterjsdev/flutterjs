
import '../Statement/statement_ir.dart';

class AnnotationIR {
  final String name;
  final List<ExpressionIR> arguments;

  AnnotationIR({
    required this.name,
    required this.arguments,
  });
}

class ParameterIR {
  final String name;
  final TypeIR type;
  final bool isOptional;
  final bool isNamed;
  final bool isRequired;
  final ExpressionIR? defaultValue;

  ParameterIR({
    required this.name,
    required this.type,
    this.isOptional = false,
    this.isNamed = false,
    this.isRequired = false,
    this.defaultValue,
  });
}

class MethodIR {
  final String name;
  final TypeIR? returnType;
  final List<ParameterIR> parameters;
  final List<StatementIR> body;
  final ExpressionIR? returnExpression;
  final bool isAsync;
  final bool isGenerator;
  final bool isStatic;
  final bool isAbstract;
  final List<AnnotationIR> annotations;
  final SourceLocationIR sourceLocation;

  MethodIR({
    required this.name,
    required this.returnType,
    required this.parameters,
    required this.body,
    required this.returnExpression,
    required this.isAsync,
    required this.isGenerator,
    required this.isStatic,
    required this.isAbstract,
    required this.annotations,
    required this.sourceLocation,
  });
}
class SourceLocationIR {
  final String file;      // Path to the source file
  final int line;         // Line number (1-based)
  final int column;       // Column number (1-based)
  final int offset;       // Character offset from start of file (0-based)
  final int length;       // Length of the code element in characters
  
  SourceLocationIR({
    required this.file,
    required this.line,
    required this.column,
    required this.offset,
    required this.length,
  });
}

abstract class ExpressionIR {
  final String id;
  final TypeIR resultType;
  final SourceLocationIR sourceLocation;

  ExpressionIR({
    required this.id,
    required this.resultType,
    required this.sourceLocation,
  });
}

class LiteralExpressionIR extends ExpressionIR {
  final dynamic value;
  final LiteralType literalType;

  LiteralExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.value,
    required this.literalType,
  });
}

enum LiteralType {
  string,
  integer,
  double,
  boolean,
  nullValue,
  list,
  map,
  set,
}

class IdentifierExpressionIR extends ExpressionIR {
  final String name;
  final bool isThisReference;
  final bool isSuperReference;

  IdentifierExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.name,
    this.isThisReference = false,
    this.isSuperReference = false,
  });
}

class BinaryExpressionIR extends ExpressionIR {
  final ExpressionIR left;
  final BinaryOperator operator;
  final ExpressionIR right;

  BinaryExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.left,
    required this.operator,
    required this.right,
  });
}

enum BinaryOperator {
  add, subtract, multiply, divide, modulo,
  equals, notEquals, lessThan, lessOrEqual, greaterThan, greaterOrEqual,
  logicalAnd, logicalOr,
  bitwiseAnd, bitwiseOr, bitwiseXor,
  leftShift, rightShift,
  nullCoalesce,
}

class UnaryExpressionIR extends ExpressionIR {
  final UnaryOperator operator;
  final ExpressionIR operand;
  final bool isPrefix;

  UnaryExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.operator,
    required this.operand,
    this.isPrefix = true,
  });
}

enum UnaryOperator {
  negate,
  not,
  bitwiseNot,
  increment,
  decrement,
  nullCheck,
}

class MethodCallExpressionIR extends ExpressionIR {
  final ExpressionIR? target;
  final String methodName;
  final List<ExpressionIR> arguments;
  final Map<String, ExpressionIR> namedArguments;
  final List<TypeIR> typeArguments;
  final bool isNullAware;
  final bool isCascade;

  MethodCallExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    this.target,
    required this.methodName,
    this.arguments = const [],
    this.namedArguments = const {},
    this.typeArguments = const [],
    this.isNullAware = false,
    this.isCascade = false,
  });
}

class PropertyAccessExpressionIR extends ExpressionIR {
  final ExpressionIR target;
  final String propertyName;
  final bool isNullAware;
  final bool isCascade;

  PropertyAccessExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.target,
    required this.propertyName,
    this.isNullAware = false,
    this.isCascade = false,
  });
}

class ConditionalExpressionIR extends ExpressionIR {
  final ExpressionIR condition;
  final ExpressionIR thenExpression;
  final ExpressionIR elseExpression;

  ConditionalExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.condition,
    required this.thenExpression,
    required this.elseExpression,
  });
}

class FunctionExpressionIR extends ExpressionIR {
  final List<ParameterIR> parameters;
  final StatementIR? body;
  final ExpressionIR? expressionBody;
  final bool isAsync;
  final bool isGenerator;
  final List<String> capturedVariables;

  FunctionExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.parameters,
    this.body,
    this.expressionBody,
    this.isAsync = false,
    this.isGenerator = false,
    this.capturedVariables = const [],
  });
}

class ListExpressionIR extends ExpressionIR {
  final List<ExpressionIR> elements;
  final TypeIR elementType;
  final bool isConst;

  ListExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.elements,
    required this.elementType,
    this.isConst = false,
  });
}

class MapExpressionIR extends ExpressionIR {
  final List<MapEntryIR> entries;
  final TypeIR keyType;
  final TypeIR valueType;
  final bool isConst;

  MapExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.entries,
    required this.keyType,
    required this.valueType,
    this.isConst = false,
  });
}

class MapEntryIR {
  final ExpressionIR key;
  final ExpressionIR value;

  MapEntryIR({
    required this.key,
    required this.value,
  });
}

class AwaitExpressionIR extends ExpressionIR {
  final ExpressionIR expression;

  AwaitExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.expression,
  });
}

class AsExpressionIR extends ExpressionIR {
  final ExpressionIR expression;
  final TypeIR targetType;

  AsExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.expression,
    required this.targetType,
  });
}

class IsExpressionIR extends ExpressionIR {
  final ExpressionIR expression;
  final TypeIR targetType;
  final bool isNegated;

  IsExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.expression,
    required this.targetType,
    this.isNegated = false,
  });
}

class InterpolatedStringExpressionIR extends ExpressionIR {
  final List<ExpressionIR> parts;

  InterpolatedStringExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.parts,
  });
}

