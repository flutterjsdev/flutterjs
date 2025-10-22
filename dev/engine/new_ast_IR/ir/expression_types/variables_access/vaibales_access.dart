import 'package:meta/meta.dart';

import '../../expression_ir.dart';

/// Represents an identifier expression in the abstract syntax tree (AST).
/// This could refer to a variable, function, or type name.
///
/// Example: `foo` or `int` (if [isTypeReference] is true).
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

/// Represents a property access expression in the AST.
/// This is used for accessing members of an object or class.
///
/// Example: `obj.property` or `obj?.property` (if [isNullAware] is true).
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

/// Represents an index access expression in the AST.
/// This is used for accessing elements in a list, map, or similar collection.
///
/// Example: `list[0]` or `map[key]`.
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
