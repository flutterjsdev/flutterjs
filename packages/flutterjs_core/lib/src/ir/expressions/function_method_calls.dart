import 'package:meta/meta.dart';

import 'expression_ir.dart';
import '../types/type_ir.dart';

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
class FunctionCallExpr extends ExpressionIR {
  final String functionName;
  final List<ExpressionIR> arguments;
  final Map<String, ExpressionIR> namedArguments;
  final List<TypeIR> typeArguments;

  /// The canonical URI of the library where this function is defined
  final String? resolvedLibraryUri;

  const FunctionCallExpr({
    required super.id,
    required super.sourceLocation,
    required this.functionName,
    required super.resultType,
    this.arguments = const [],
    this.namedArguments = const {},
    this.typeArguments = const [],
    this.resolvedLibraryUri,
    super.metadata,
  });

  @override
  String toShortString() {
    final posArgs = arguments.map((a) => a.toShortString()).join(', ');
    final namedArgs = namedArguments.entries
        .map((e) => '${e.key}: ${e.value.toShortString()}')
        .join(', ');

    final allArgs = [posArgs, namedArgs].where((s) => s.isNotEmpty).join(', ');

    return '$functionName($allArgs)';
  }
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

  /// The canonical URI of the library where the class is defined
  final String? resolvedLibraryUri;

  const ConstructorCallExpr({
    required super.id,
    required super.sourceLocation,
    required this.className,
    required super.resultType,
    this.constructorName,
    this.arguments = const [],
    this.namedArguments = const {},
    this.typeArguments = const [],
    this.resolvedLibraryUri,
    super.isConstant = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${isConstant ? 'const ' : ''}$className${constructorName != null ? '.$constructorName' : ''}(...)';
}
