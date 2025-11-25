import 'package:meta/meta.dart';

import '../../expression_ir.dart';

/// =============================================================================
///  VARIABLES & MEMBER ACCESS EXPRESSIONS
///  Identifier, property access, and index access in the IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents how code reads from variables and accesses object members:
/// • Simple identifiers: count, userName, MyClass
/// • Property access: obj.property, obj?.property
/// • Index access: list[0], map['key']
///
/// Critical for:
/// • Variable usage analysis
/// • Refactoring (rename symbol)
/// • Null-safety checking
/// • Dependency extraction
///
/// KEY COMPONENTS
/// --------------
/// • IdentifierExpr         → Variable, function, or type name
/// • PropertyAccessExpr     → obj.property (with null-aware support)
/// • IndexAccessExpr        → collection[index]
///
/// FEATURES
/// --------
/// • Null-aware property access (?.)
/// • Type reference detection (e.g., int in var x = int;)
/// • Human-readable toShortString()
/// • Immutable + metadata support
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart
/// • variable_collector.dart  → Uses IdentifierExpr heavily
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// NOTE:    File was previously named "vaibales_access.dart" — renamed for correctness
/// =============================================================================
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
