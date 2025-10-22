import 'package:meta/meta.dart';

import '../../expression_ir.dart';
import '../../ir_node.dart';
import '../../type_ir.dart';

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
  final ExpressionIR key;
  final ExpressionIR value;

  const MapEntryIR({
    required super.id,
    required super.sourceLocation,
    required this.key,
    required this.value,
    super.metadata,
  });

  @override
  String toShortString() => '${key.toShortString()}: ${value.toShortString()}';
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
