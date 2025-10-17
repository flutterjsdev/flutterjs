import 'package:meta/meta.dart';

import '../../expression_ir.dart';

@immutable
class IdentifierExpr extends ExpressionIR {
  final String name;
  final bool isTypeReference;

  const IdentifierExpr({
    required super.id,
    required super.sourceLocation,
    required this.name,
    required super.resultType,
    this.isTypeReference = false,
    super.metadata,
  });

  @override
  String toShortString() => name;
}

@immutable
class PropertyAccessExpr extends ExpressionIR {
  final ExpressionIR target;
  final String propertyName;
  final bool isNullAware;

  const PropertyAccessExpr({
    required super.id,
    required super.sourceLocation,
    required this.target,
    required this.propertyName,
    required super.resultType,
    this.isNullAware = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${target.toShortString()}${isNullAware ? '?.' : '.'}$propertyName';
}

@immutable
class IndexAccessExpr extends ExpressionIR {
  final ExpressionIR target;
  final ExpressionIR index;

  const IndexAccessExpr({
    required super.id,
    required super.sourceLocation,
    required this.target,
    required this.index,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${target.toShortString()}[${index.toShortString()}]';
}
