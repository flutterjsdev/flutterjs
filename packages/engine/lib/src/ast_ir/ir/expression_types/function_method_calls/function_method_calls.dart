import 'package:meta/meta.dart';

import '../../expression_ir.dart';
import '../../type_ir.dart';

@immutable
class FunctionCallExpr extends ExpressionIR {
  final String functionName;
  final List<ExpressionIR> arguments;
  final Map<String, ExpressionIR> namedArguments;
  final List<TypeIR> typeArguments;

  const FunctionCallExpr({
    required super.id,
    required super.sourceLocation,
    required this.functionName,
    required super.resultType,
    this.arguments = const [],
    this.namedArguments = const {},
    this.typeArguments = const [],
    super.metadata,
  });

  @override
  String toShortString() =>
      '$functionName(${arguments.length} args${namedArguments.isNotEmpty ? ', ${namedArguments.length} named' : ''})';
}

@immutable
class MethodCallExpr extends ExpressionIR {
  final ExpressionIR? receiver;
  final String methodName;
  final List<ExpressionIR> arguments;
  final Map<String, ExpressionIR> namedArguments;
  final List<TypeIR> typeArguments;
  final bool isNullAware;
  final bool isCascade;

  const MethodCallExpr({
    required super.id,
    required super.sourceLocation,
    required this.methodName,
    required super.resultType,
    this.receiver,
    this.arguments = const [],
    this.namedArguments = const {},
    this.typeArguments = const [],
    this.isNullAware = false,
    this.isCascade = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${receiver?.toShortString()}${isNullAware
          ? '?.'
          : isCascade
          ? '..'
          : '.'}$methodName(...)';
}

@immutable
class ConstructorCallExpr extends ExpressionIR {
  final String className;
  final String? constructorName;
  final List<ExpressionIR> arguments;
  final Map<String, ExpressionIR> namedArguments;
  final List<TypeIR> typeArguments;

  const ConstructorCallExpr({
    required super.id,
    required super.sourceLocation,
    required this.className,
    required super.resultType,
    this.constructorName,
    this.arguments = const [],
    this.namedArguments = const {},
    this.typeArguments = const [],
    super.isConstant = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${isConstant ? 'const ' : ''}$className${constructorName != null ? '.$constructorName' : ''}(...)';
}
