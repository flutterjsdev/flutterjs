import 'package:meta/meta.dart';
import 'expression_ir.dart';
import '../statements/statement_ir.dart';
import '../types/type_ir.dart';
import '../types/parameter_ir.dart';

/// =============================================================================
///  FUNCTION, METHOD & CONSTRUCTOR CALLS
///  Invocation expressions in the IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents all forms of callable invocations:
/// • Free functions: print("hello")
/// • Methods: obj.doSomething()
/// • Constructors: MyWidget(), const Text("hi")
/// • Null-aware and cascade calls
///
/// Critical for:
/// • Dependency analysis
/// • Widget tree extraction
/// • Performance profiling
/// • Refactoring
///
/// KEY COMPONENTS
/// --------------
/// • FunctionCallExpr       → print(), myFunc()
/// • MethodCallExpr         → obj.method(), obj?.call(), obj..update()
/// • ConstructorCallExpr    → Widget(), const Padding()
///
/// FEATURES
/// --------
/// • Positional + named arguments
/// • Generic type arguments <T>()
/// • Null-aware and cascade support
/// • const constructor detection
/// • Rich metadata attachment
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart
/// • constructor_call_expr.dart (legacy)
/// • statement_widget_analyzer.dart → Heavily uses ConstructorCallExpr
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
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
