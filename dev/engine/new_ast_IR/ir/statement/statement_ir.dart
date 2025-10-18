// lib/src/ir/statement/statement_ir.dart
// Complete Statement IR hierarchy for Phase 2

import 'package:meta/meta.dart';
import '../expression_ir.dart';
import '../ir_node.dart';
import '../type_ir.dart';


/// Base class for all statement IR nodes
@immutable
abstract class StatementIR extends IRNode {
  const StatementIR({
   required super.id,
    required super. sourceLocation,
   super. metadata,
  }) ;
}

// =============================================================================
// SIMPLE STATEMENTS
// =============================================================================

@immutable
class ExpressionStmt extends StatementIR {
  final ExpressionIR expression;

  const ExpressionStmt({
   required super.id,
    required super. sourceLocation,
    required this.expression,
   super. metadata,
  }) ;

  @override
  String toShortString() => expression.toShortString();
}

@immutable
class VariableDeclarationStmt extends StatementIR {
  final String name;
  final TypeIR? type;
  final ExpressionIR? initializer;
  final bool isFinal;
  final bool isConst;
  final bool isLate;
  final bool isMutable;

  const VariableDeclarationStmt({
   required super.id,
    required super. sourceLocation,
    required this.name,
    required TypeIR resultType,
    this.type,
    this.initializer,
    this.isFinal = false,
    this.isConst = false,
    this.isLate = false,
   super. metadata,
  })  : isMutable = !isFinal && !isConst
       ;

  @override
  String toShortString() {
    final modifier = isConst ? 'const' : isFinal ? 'final' : 'var';
    final typeStr = type != null ? '${type!.displayName} ' : '';
    return '$modifier $typeStr$name${initializer != null ? ' = ${initializer!.toShortString()}' : ''}';
  }
}

@immutable
class ReturnStmt extends StatementIR {
  final ExpressionIR? expression;

  const ReturnStmt({
   required super.id,
    required super. sourceLocation,
    this.expression,
   super. metadata,
  }) ;

  @override
  String toShortString() =>
      'return${expression != null ? ' ${expression!.toShortString()}' : ''}';
}

@immutable
class BreakStmt extends StatementIR {
  final String? label;

  const BreakStmt({
   required super.id,
    required super. sourceLocation,
    this.label,
   super. metadata,
  }) ;

  @override
  String toShortString() => 'break${label != null ? ' $label' : ''}';
}

@immutable
class ContinueStmt extends StatementIR {
  final String? label;

  const ContinueStmt({
   required super.id,
    required super. sourceLocation,
    this.label,
   super. metadata,
  }) ;

  @override
  String toShortString() => 'continue${label != null ? ' $label' : ''}';
}

@immutable
class ThrowStmt extends StatementIR {
  final ExpressionIR exceptionExpression;

  const ThrowStmt({
   required super.id,
    required super. sourceLocation,
    required this.exceptionExpression,
   super. metadata,
  }) ;

  @override
  String toShortString() => 'throw ${exceptionExpression.toShortString()}';
}

// =============================================================================
// COMPOUND STATEMENTS
// =============================================================================

@immutable
class BlockStmt extends StatementIR {
  final List<StatementIR> statements;

  const BlockStmt({
   required super.id,
    required super. sourceLocation,
    required this.statements,
   super. metadata,
  }) ;

  @override
  String toShortString() => '{ ${statements.length} statements }';
}

@immutable
class IfStmt extends StatementIR {
  final ExpressionIR condition;
  final StatementIR thenBranch;
  final StatementIR? elseBranch;

  const IfStmt({
    required super.id,
    required super. sourceLocation,
    required this.condition,
    required this.thenBranch,
    this.elseBranch,
   super. metadata,
  });

  @override
  String toShortString() =>
      'if (${condition.toShortString()}) { ... }${elseBranch != null ? ' else { ... }' : ''}';
}

@immutable
class ForStmt extends StatementIR {
  final ExpressionIR? initialization;
  final ExpressionIR? condition;
  final List<ExpressionIR> updaters;
  final StatementIR body;

  const ForStmt({
   required super.id,
    required super. sourceLocation,
    this.initialization,
    this.condition,
    this.updaters = const [],
    required this.body,
   super. metadata,
  }) ;

  @override
  String toShortString() => 'for (...) { ... }';
}

@immutable
class ForEachStmt extends StatementIR {
  final String loopVariable;
  final TypeIR? loopVariableType;
  final ExpressionIR iterable;
  final StatementIR body;
  final bool isAsync;

  const ForEachStmt({
   required super.id,
    required super. sourceLocation,
    required this.loopVariable,
    required this.iterable,
    required this.body,
    this.loopVariableType,
    this.isAsync = false,
   super. metadata,
  }) ;

  @override
  String toShortString() =>
      'for${isAsync ? ' await' : ''} ($loopVariable in ${iterable.toShortString()}) { ... }';
}

@immutable
class WhileStmt extends StatementIR {
  final ExpressionIR condition;
  final StatementIR body;

  const WhileStmt({
   required super.id,
    required super. sourceLocation,
    required this.condition,
    required this.body,
   super. metadata,
  }) ;

  @override
  String toShortString() => 'while (${condition.toShortString()}) { ... }';
}

@immutable
class DoWhileStmt extends StatementIR {
  final StatementIR body;
  final ExpressionIR condition;

  const DoWhileStmt({
   required super.id,
    required super. sourceLocation,
    required this.body,
    required this.condition,
   super. metadata,
  }) ;

  @override
  String toShortString() => 'do { ... } while (${condition.toShortString()})';
}

@immutable
class SwitchStmt extends StatementIR {
  final ExpressionIR expression;
  final List<SwitchCaseStmt> cases;
  final SwitchCaseStmt? defaultCase;

  const SwitchStmt({
   required super.id,
    required super. sourceLocation,
    required this.expression,
    required this.cases,
    this.defaultCase,
   super. metadata,
  }) ;

  @override
  String toShortString() =>
      'switch (${expression.toShortString()}) { ${cases.length} cases }';
}

@immutable
class SwitchCaseStmt extends IRNode {
  final List<ExpressionIR>? patterns;
  final List<StatementIR> statements;
  final bool isDefault;

  const SwitchCaseStmt({
   required super.id,
    required super. sourceLocation,
    this.patterns,
    required this.statements,
    this.isDefault = false,
   super. metadata,
  }) ;

  @override
  String toShortString() {
    if (isDefault) return 'default: ...';
    return 'case: ...';
  }
}

@immutable
class TryStmt extends StatementIR {
  final StatementIR tryBlock;
  final List<CatchClauseStmt> catchClauses;
  final StatementIR? finallyBlock;

  const TryStmt({
   required super.id,
    required super. sourceLocation,
    required this.tryBlock,
    required this.catchClauses,
    this.finallyBlock,
   super. metadata,
  }) ;

  @override
  String toShortString() =>
      'try { ... } catch (${catchClauses.length} clauses)${finallyBlock != null ? ' finally { ... }' : ''}';
}

@immutable
class CatchClauseStmt extends IRNode {
  final TypeIR? exceptionType;
  final String? exceptionParameter;
  final String? stackTraceParameter;
  final StatementIR body;

  const CatchClauseStmt({
   required super.id,
    required super. sourceLocation,
    this.exceptionType,
    this.exceptionParameter,
    this.stackTraceParameter,
    required this.body,
   super. metadata,
  }) ;

  @override
  String toShortString() {
    String typeStr = exceptionType?.displayName() ?? 'dynamic';
    return 'catch ($typeStr ${exceptionParameter ?? 'e'}) { ... }';
  }
}

// // =============================================================================
// // VISITOR PATTERN FOR TRAVERSAL
// // =============================================================================

// /// Base visitor for traversing expression trees
// abstract class ExpressionVisitor<R> {
//   // Literals
//   R visitIntLiteral(IntLiteralExpr expr);
//   R visitDoubleLiteral(DoubleLiteralExpr expr);
//   R visitStringLiteral(StringLiteralExpr expr);
//   R visitBoolLiteral(BoolLiteralExpr expr);
//   R visitNullLiteral(NullLiteralExpr expr);
//   R visitListLiteral(ListLiteralExpr expr);
//   R visitMapLiteral(MapLiteralExpr expr);
//   R visitSetLiteral(SetLiteralExpr expr);

//   // Variable & Access
//   R visitIdentifier(IdentifierExpr expr);
//   R visitPropertyAccess(PropertyAccessExpr expr);
//   R visitIndexAccess(IndexAccessExpr expr);

//   // Operations
//   R visitBinaryOp(BinaryOpExpr expr);
//   R visitUnaryOp(UnaryOpExpr expr);
//   R visitAssignment(AssignmentExpr expr);
//   R visitConditional(ConditionalExpr expr);

//   // Function/Method Calls
//   R visitFunctionCall(FunctionCallExpr expr);
//   R visitMethodCall(MethodCallExpr expr);
//   R visitConstructorCall(ConstructorCallExpr expr);

//   // Advanced
//   R visitLambda(LambdaExpr expr);
//   R visitAwait(AwaitExpr expr);
//   R visitThrow(ThrowExpr expr);
//   R visitCast(CastExpr expr);
//   R visitTypeCheck(TypeCheckExpr expr);
// }

// /// Base visitor for traversing statement trees
// abstract class StatementVisitor<R> {
//   R visitExpressionStmt(ExpressionStmt stmt);
//   R visitVariableDeclaration(VariableDeclarationStmt stmt);
//   R visitReturn(ReturnStmt stmt);
//   R visitBreak(BreakStmt stmt);
//   R visitContinue(ContinueStmt stmt);
//   R visitThrow(ThrowStmt stmt);
  
//   R visitBlock(BlockStmt stmt);
//   R visitIf(IfStmt stmt);
//   R visitFor(ForStmt stmt);
//   R visitForEach(ForEachStmt stmt);
//   R visitWhile(WhileStmt stmt);
//   R visitDoWhile(DoWhileStmt stmt);
//   R visitSwitch(SwitchStmt stmt);
//   R visitTry(TryStmt stmt);
// }

// // =============================================================================
// // CONCRETE VISITORS FOR ANALYSIS
// // =============================================================================

// /// Calculates expression nesting depth
// class ExpressionDepthCalculator implements ExpressionVisitor<int> {
//   @override
//   int visitIntLiteral(IntLiteralExpr expr) => 1;
  
//   @override
//   int visitDoubleLiteral(DoubleLiteralExpr expr) => 1;
  
//   @override
//   int visitStringLiteral(StringLiteralExpr expr) => 1;
  
//   @override
//   int visitBoolLiteral(BoolLiteralExpr expr) => 1;
  
//   @override
//   int visitNullLiteral(NullLiteralExpr expr) => 1;
  
//   @override
//   int visitListLiteral(ListLiteralExpr expr) {
//     final maxElementDepth = expr.elements.isEmpty 
//         ? 0 
//         : expr.elements.map(_visit).reduce((a, b) => a > b ? a : b);
//     return 1 + maxElementDepth;
//   }
  
//   @override
//   int visitMapLiteral(MapLiteralExpr expr) {
//     final depths = <int>[];
//     for (final entry in expr.entries) {
//       depths.add(_visit(entry.key));
//       depths.add(_visit(entry.value));
//     }
//     return depths.isEmpty ? 1 : 1 + depths.reduce((a, b) => a > b ? a : b);
//   }
  
//   @override
//   int visitSetLiteral(SetLiteralExpr expr) {
//     final maxElementDepth = expr.elements.isEmpty 
//         ? 0 
//         : expr.elements.map(_visit).reduce((a, b) => a > b ? a : b);
//     return 1 + maxElementDepth;
//   }
  
//   @override
//   int visitIdentifier(IdentifierExpr expr) => 1;
  
//   @override
//   int visitPropertyAccess(PropertyAccessExpr expr) => 1 + _visit(expr.target);
  
//   @override
//   int visitIndexAccess(IndexAccessExpr expr) {
//     final targetDepth = _visit(expr.target);
//     final indexDepth = _visit(expr.index);
//     return 1 + (targetDepth > indexDepth ? targetDepth : indexDepth);
//   }
  
//   @override
//   int visitBinaryOp(BinaryOpExpr expr) {
//     final leftDepth = _visit(expr.left);
//     final rightDepth = _visit(expr.right);
//     return 1 + (leftDepth > rightDepth ? leftDepth : rightDepth);
//   }
  
//   @override
//   int visitUnaryOp(UnaryOpExpr expr) => 1 + _visit(expr.operand);
  
//   @override
//   int visitAssignment(AssignmentExpr expr) {
//     final targetDepth = _visit(expr.target);
//     final valueDepth = _visit(expr.value);
//     return 1 + (targetDepth > valueDepth ? targetDepth : valueDepth);
//   }
  
//   @override
//   int visitConditional(ConditionalExpr expr) {
//     final condDepth = _visit(expr.condition);
//     final thenDepth = _visit(expr.thenExpr);
//     final elseDepth = _visit(expr.elseExpr);
//     final maxDepth = [condDepth, thenDepth, elseDepth].reduce((a, b) => a > b ? a : b);
//     return 1 + maxDepth;
//   }
  
//   @override
//   int visitFunctionCall(FunctionCallExpr expr) {
//     final argDepths = expr.arguments.map(_visit).toList();
//     final namedDepths = expr.namedArguments.values.map(_visit).toList();
//     final allDepths = [...argDepths, ...namedDepths];
//     return 1 + (allDepths.isEmpty ? 0 : allDepths.reduce((a, b) => a > b ? a : b));
//   }
  
//   @override
//   int visitMethodCall(MethodCallExpr expr) {
//     final receiverDepth = expr.receiver != null ? _visit(expr.receiver!) : 0;
//     final argDepths = expr.arguments.map(_visit).toList();
//     final namedDepths = expr.namedArguments.values.map(_visit).toList();
//     final allDepths = [receiverDepth, ...argDepths, ...namedDepths];
//     return 1 + (allDepths.isEmpty ? 0 : allDepths.reduce((a, b) => a > b ? a : b));
//   }
  
//   @override
//   int visitConstructorCall(ConstructorCallExpr expr) {
//     final argDepths = expr.arguments.map(_visit).toList();
//     final namedDepths = expr.namedArguments.values.map(_visit).toList();
//     final allDepths = [...argDepths, ...namedDepths];
//     return 1 + (allDepths.isEmpty ? 0 : allDepths.reduce((a, b) => a > b ? a : b));
//   }
  
//   @override
//   int visitLambda(LambdaExpr expr) {
//     if (expr.body != null) {
//       return 1 + _visit(expr.body!);
//     }
//     return 1;
//   }
  
//   @override
//   int visitAwait(AwaitExpr expr) => 1 + _visit(expr.futureExpression);
  
//   @override
//   int visitThrow(ThrowExpr expr) => 1 + _visit(expr.exceptionExpression);
  
//   @override
//   int visitCast(CastExpr expr) => 1 + _visit(expr.expression);
  
//   @override
//   int visitTypeCheck(TypeCheckExpr expr) => 1 + _visit(expr.expression);

//   int _visit(ExpressionIR expr) {
//     if (expr is IntLiteralExpr) return visitIntLiteral(expr);
//     if (expr is DoubleLiteralExpr) return visitDoubleLiteral(expr);
//     if (expr is StringLiteralExpr) return visitStringLiteral(expr);
//     if (expr is BoolLiteralExpr) return visitBoolLiteral(expr);
//     if (expr is NullLiteralExpr) return visitNullLiteral(expr);
//     if (expr is ListLiteralExpr) return visitListLiteral(expr);
//     if (expr is MapLiteralExpr) return visitMapLiteral(expr);
//     if (expr is SetLiteralExpr) return visitSetLiteral(expr);
//     if (expr is IdentifierExpr) return visitIdentifier(expr);
//     if (expr is PropertyAccessExpr) return visitPropertyAccess(expr);
//     if (expr is IndexAccessExpr) return visitIndexAccess(expr);
//     if (expr is BinaryOpExpr) return visitBinaryOp(expr);
//     if (expr is UnaryOpExpr) return visitUnaryOp(expr);
//     if (expr is AssignmentExpr) return visitAssignment(expr);
//     if (expr is ConditionalExpr) return visitConditional(expr);
//     if (expr is FunctionCallExpr) return visitFunctionCall(expr);
//     if (expr is MethodCallExpr) return visitMethodCall(expr);
//     if (expr is ConstructorCallExpr) return visitConstructorCall(expr);
//     if (expr is LambdaExpr) return visitLambda(expr);
//     if (expr is AwaitExpr) return visitAwait(expr);
//     if (expr is ThrowExpr) return visitThrow(expr);
//     if (expr is CastExpr) return visitCast(expr);
//     if (expr is TypeCheckExpr) return visitTypeCheck(expr);
//     return 1;
//   }
// }

