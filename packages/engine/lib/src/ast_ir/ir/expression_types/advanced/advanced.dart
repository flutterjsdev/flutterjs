import 'package:meta/meta.dart';
import '../../expression_ir.dart';
import '../../statement/statement_ir.dart';
import '../../type_ir.dart';
import '../../types/parameter_ir.dart';

@immutable
class LambdaExpr extends ExpressionIR {
  final List<ParameterIR> parameters;
  final ExpressionIR? body;
  final List<StatementIR>? blockBody;

  const LambdaExpr({
    required super.id,
    required super.sourceLocation,
    required this.parameters,
    required super.resultType,
    this.body,
    this.blockBody,
    super.metadata,
  });

  @override
  String toShortString() =>
      '(${parameters.length} params) => ${body != null ? body!.toShortString() : '{ block }'}';
}

@immutable
class AwaitExpr extends ExpressionIR {
  final ExpressionIR futureExpression;

  const AwaitExpr({
    required super.id,
    required super.sourceLocation,
    required this.futureExpression,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() => 'await ${futureExpression.toShortString()}';
}

@immutable
class ThrowExpr extends ExpressionIR {
  final ExpressionIR exceptionExpression;

  const ThrowExpr({
    required super.id,
    required super.sourceLocation,
    required this.exceptionExpression,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() => 'throw ${exceptionExpression.toShortString()}';
}

@immutable
class CastExpr extends ExpressionIR {
  final ExpressionIR expression;
  final TypeIR targetType;

  const CastExpr({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    required this.targetType,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${expression.toShortString()} as ${targetType.displayName}';
}

@immutable
class TypeCheckExpr extends ExpressionIR {
  final ExpressionIR expression;
  final TypeIR typeToCheck;
  final bool isNegated;

  const TypeCheckExpr({
    required super.id,
    required super.sourceLocation,
    required this.expression,
    required this.typeToCheck,
    required super.resultType,
    this.isNegated = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${expression.toShortString()} ${isNegated ? 'is!' : 'is'} ${typeToCheck.displayName}';
}
