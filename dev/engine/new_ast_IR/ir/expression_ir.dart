import 'ir_node.dart';
import 'type_ir.dart';

abstract class ExpressionIR extends IRNode {
  final TypeIR resultType;

  /// Whether this expression can be evaluated at compile time
  final bool isConstant;

  const ExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.resultType,
    this.isConstant = false,
    required super.metadata,
  });

  factory ExpressionIR.fromJson(Map<String, dynamic> json) {
    final type = json['expressionType'] as String?;
    final sourceLocation = SourceLocationIR.fromJson(
      json['sourceLocation'] as Map<String, dynamic>,
    );

    switch (type) {
      case 'LiteralExpressionIR':
        return LiteralExpressionIR(
          id: json['id'] as String,
          resultType: TypeIR.fromJson(
            json['resultType'] as Map<String, dynamic>,
          ),
          sourceLocation: sourceLocation,
          value: json['value'],
          literalType: LiteralType.values.firstWhere(
            (lt) => lt.name == json['literalType'],
            orElse: () => LiteralType.nullValue,
          ),
        );
      case 'IdentifierExpressionIR':
        return IdentifierExpressionIR(
          id: json['id'] as String,
          resultType: TypeIR.fromJson(
            json['resultType'] as Map<String, dynamic>,
          ),
          sourceLocation: sourceLocation,
          name: json['name'] as String,
          isThisReference: json['isThisReference'] as bool? ?? false,
          isSuperReference: json['isSuperReference'] as bool? ?? false,
        );
      case 'BinaryExpressionIR':
        return BinaryExpressionIR(
          id: json['id'] as String,
          resultType: TypeIR.fromJson(
            json['resultType'] as Map<String, dynamic>,
          ),
          sourceLocation: sourceLocation,
          left: ExpressionIR.fromJson(json['left'] as Map<String, dynamic>),
          operator: BinaryOperatorIR.values.firstWhere(
            (op) => op.name == json['operator'],
            orElse: () => BinaryOperatorIR.add,
          ),
          right: ExpressionIR.fromJson(json['right'] as Map<String, dynamic>),
        );
      default:
        throw UnimplementedError('Unknown ExpressionIR type: $type');
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'resultType': resultType.toJson(),
      'sourceLocation': sourceLocation.toJson(),
      'expressionType': runtimeType.toString(),
    };
  }

  @override
  bool contentEquals(IRNode other) {
    if (other is! ExpressionIR) return false;
    return resultType.contentEquals(other.resultType);
  }
}

enum LiteralType {
  stringValue,
  intValue,
  doubleValue,
  boolValue,
  nullValue,
  listValue,
  mapValue,
}

enum BinaryOperatorIR {
  add,
  subtract,
  multiply,
  divide,
  modulo,
  equals,
  notEquals,
  lessThan,
  greaterThan,
  lessThanOrEqual,
  greaterThanOrEqual,
  logicalAnd,
  logicalOr,
}

class LiteralExpressionIR extends ExpressionIR {
  final dynamic value;
  final LiteralType literalType;

  const LiteralExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.value,
    required this.literalType,
    super.metadata,
  });

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson(), 'value': value, 'literalType': literalType.name};
  }
}

class IdentifierExpressionIR extends ExpressionIR {
  final String name;
  final bool isThisReference;
  final bool isSuperReference;

  const IdentifierExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.name,
    this.isThisReference = false,
    this.isSuperReference = false,
    super.metadata,
  });

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'name': name,
      'isThisReference': isThisReference,
      'isSuperReference': isSuperReference,
    };
  }
}

class BinaryExpressionIR extends ExpressionIR {
  final ExpressionIR left;
  final BinaryOperatorIR operator;
  final ExpressionIR right;

  const BinaryExpressionIR({
    required super.id,
    required super.resultType,
    required super.sourceLocation,
    required this.left,
    required this.operator,
    required this.right,
    super.metadata,
  });

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'left': left.toJson(),
      'operator': operator.name,
      'right': right.toJson(),
    };
  }
}
