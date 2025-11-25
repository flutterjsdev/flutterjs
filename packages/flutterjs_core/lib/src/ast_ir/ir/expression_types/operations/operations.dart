import 'package:meta/meta.dart';
import '../../expression_ir.dart';

/// =============================================================================
///  OPERATOR EXPRESSIONS
///  Binary, unary, assignment, and conditional operations
/// =============================================================================
///
/// PURPOSE
/// -------
/// Models all Dart operators as first-class IR nodes:
/// • Arithmetic: +, -, *, /, ~/
/// • Comparison: ==, !=, <, >, <=, >=
/// • Logical: &&, ||
/// • Bitwise: &, |, ^, <<, >>>
/// • Null coalescing: ??>
/// • Assignments: =, +=, ??=
/// • Ternary: condition ? a : b
///
/// Essential for:
/// • Constant folding
/// • Optimization
/// • Code transformation
/// • Linter rules
///
/// KEY COMPONENTS
/// --------------
/// • BinaryOpExpr           → left + right
/// • UnaryOpExpr            → !value, ++count
/// • AssignmentExpr         → x = 5, y += 1
/// • ConditionalExpr        → isTrue ? a : b
///
/// FEATURES
/// --------
/// • Full enum coverage of Dart operators
/// • Compound assignment support
/// • isConstant flag for folding
/// • Rich toShortString()
///
/// RELATED FILES
/// -------------
/// • expression_ir.dart
/// • type_ir.dart
/// • constant_folder.dart (future)
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
enum BinaryOperator {
  add,
  subtract,
  multiply,
  divide,
  modulo,
  truncatingDivide,
  power,
  equals,
  notEquals,
  lessThan,
  lessOrEqual,
  greaterThan,
  greaterOrEqual,
  logicalAnd,
  logicalOr,
  bitwiseAnd,
  bitwiseOr,
  bitwiseXor,
  leftShift,
  rightShift,
  nullCoalesce,
}

@immutable
class BinaryOpExpr extends ExpressionIR {
  final ExpressionIR left;
  final BinaryOperator operator;
  final ExpressionIR right;

  const BinaryOpExpr({
    required super.id,
    required super.sourceLocation,
    required this.left,
    required this.operator,
    required this.right,
    required super.resultType,
    super.isConstant = false,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${left.toShortString()} ${operator.name} ${right.toShortString()}';
}

enum UnaryOperator {
  negate,
  logicalNot,
  bitwiseNot,
  preIncrement,
  preDecrement,
  postIncrement,
  postDecrement,
}

@immutable
class UnaryOpExpr extends ExpressionIR {
  final UnaryOperator operator;
  final ExpressionIR operand;

  const UnaryOpExpr({
    required super.id,
    required super.sourceLocation,
    required this.operator,
    required this.operand,
    required super.resultType,
    super.isConstant = false,
    super.metadata,
  });

  @override
  String toShortString() => '${operator.name}${operand.toShortString()}';
}

@immutable
class AssignmentExpr extends ExpressionIR {
  final ExpressionIR target;
  final ExpressionIR value;
  final bool isCompound;
  final BinaryOperator? compoundOperator;

  const AssignmentExpr({
    required super.id,
    required super.sourceLocation,
    required this.target,
    required this.value,
    required super.resultType,
    this.isCompound = false,
    this.compoundOperator,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${target.toShortString()} ${isCompound ? '${compoundOperator!.name}=' : '='} ${value.toShortString()}';
}

@immutable
class ConditionalExpr extends ExpressionIR {
  final ExpressionIR condition;
  final ExpressionIR thenExpr;
  final ExpressionIR elseExpr;

  const ConditionalExpr({
    required super.id,
    required super.sourceLocation,
    required this.condition,
    required this.thenExpr,
    required this.elseExpr,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${condition.toShortString()} ? ${thenExpr.toShortString()} : ${elseExpr.toShortString()}';
}
