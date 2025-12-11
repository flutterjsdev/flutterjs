import 'package:meta/meta.dart';
import '../../../ast_it.dart';

/// =============================================================================
///  LITERAL EXPRESSIONS
///  Constants and collection literals in the IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents compile-time known values and collection literals:
/// • Primitives: 42, 3.14, true, "hello", null
/// • Collections: [1, 2], {'a': 1}, <int>{1, 2}
/// • String interpolation: "Hello $name"
///
/// Used heavily in:
/// • Constant evaluation
/// • Widget optimization (const widgets)
/// • Code generation
/// • Dead code elimination
///
/// KEY COMPONENTS
/// --------------
/// • Int/Double/String/Bool/NullLiteralExpr
/// • ListLiteralExpr, MapLiteralExpr, SetLiteralExpr
/// • MapEntryIR (for map entries)
/// • isConstant flag (true for pure literals)
///
/// FEATURES
/// --------
/// • Full interpolation support in strings
/// • Type information for collections
/// • JSON serialization
/// • Smart toShortString() with element counts
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart
/// • type_ir.dart
/// • constant_evaluator.dart (future)
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================

@immutable
class IntLiteralExpr extends ExpressionIR {
  final int value;

  const IntLiteralExpr({
    required super.id,
    required super.sourceLocation,
    required this.value,
    required super.resultType,
    super.metadata,
  }) : super(isConstant: true);

  @override
  String toShortString() => '$value';
}

@immutable
class DoubleLiteralExpr extends ExpressionIR {
  final double value;

  const DoubleLiteralExpr({
    required super.id,
    required super.sourceLocation,
    required this.value,
    required super.resultType,
    super.metadata,
  }) : super(isConstant: true);

  @override
  String toShortString() => '$value';
}

@immutable
class StringLiteralExpr extends ExpressionIR {
  final String value;
  final List<ExpressionIR>? interpolations;

  StringLiteralExpr({
    required super.id,
    required super.sourceLocation,
    required this.value,
    required super.resultType,
    this.interpolations,
    super.metadata,
  }) : super(isConstant: interpolations == null || interpolations.isEmpty);

  @override
  String toShortString() =>
      '"$value"${interpolations != null ? ' [+${interpolations!.length} interpolations]' : ''}';
}

@immutable
class BoolLiteralExpr extends ExpressionIR {
  final bool value;

  const BoolLiteralExpr({
    required super.id,
    required super.sourceLocation,
    required this.value,
    required super.resultType,
    super.metadata,
  }) : super(isConstant: true);

  @override
  String toShortString() => value ? 'true' : 'false';
}

@immutable
class NullLiteralExpr extends ExpressionIR {
  const NullLiteralExpr({
    required super.id,
    required super.sourceLocation,
    required super.resultType,
    super.metadata,
  }) : super(isConstant: true);

  @override
  String toShortString() => 'null';
}

@immutable
class ListLiteralExpr extends ExpressionIR {
  final List<ExpressionIR> elements;
  final TypeIR elementType;

  const ListLiteralExpr({
    required super.id,
    required super.sourceLocation,
    required this.elements,
    required this.elementType,
    required super.resultType,
    super.isConstant = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '[${elements.length} elements of ${elementType.displayName}]';
}

@immutable
class MapLiteralExpr extends ExpressionIR {
  final List<MapEntryIR> entries;
  final TypeIR keyType;
  final TypeIR valueType;

  const MapLiteralExpr({
    required super.id,
    required super.sourceLocation,
    required this.entries,
    required this.keyType,
    required this.valueType,
    required super.resultType,
    super.isConstant = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '{${entries.length} entries: ${keyType.displayName} => ${valueType.displayName}}';
}

@immutable
class MapEntryIR extends IRNode {
  /// The key expression in this map entry
  final ExpressionIR key;

  /// The value expression in this map entry
  final ExpressionIR value;

  const MapEntryIR({
    required super.id,
    required super.sourceLocation,
    required this.key,
    required this.value,
    super.metadata,
  });

  /// Whether both key and value are constant expressions
  bool get isConstant => key.isConstant && value.isConstant;

  /// Short string representation of this map entry
  @override
  String toShortString() => '${key.toShortString()}: ${value.toShortString()}';

  /// Convert to JSON for serialization
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

@immutable
class SetLiteralExpr extends ExpressionIR {
  final List<ExpressionIR> elements;
  final TypeIR elementType;

  const SetLiteralExpr({
    required super.id,
    required super.sourceLocation,
    required this.elements,
    required this.elementType,
    required super.resultType,
    super.isConstant = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '{${elements.length} elements of ${elementType.displayName}}';
}
