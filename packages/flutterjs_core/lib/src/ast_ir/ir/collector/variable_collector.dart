import '../expression_ir.dart';
import '../expression_types/advanced/advanced.dart';
import '../expression_types/function_method_calls/function_method_calls.dart';
import '../expression_types/literals/literals.dart';
import '../expression_types/operations/operations.dart';
import '../expression_types/variables_access/vaibales_access.dart';
import 'expression_visitor.dart';

/// Collects all variable references
class VariableCollector implements ExpressionVisitor<void> {
  final Set<String> variables = {};

  @override
  void visitIntLiteral(IntLiteralExpr expr) {}

  @override
  void visitDoubleLiteral(DoubleLiteralExpr expr) {}

  @override
  void visitStringLiteral(StringLiteralExpr expr) {
    if (expr.interpolations != null) {
      for (final interp in expr.interpolations!) {
        _visit(interp);
      }
    }
  }

  @override
  void visitBoolLiteral(BoolLiteralExpr expr) {}

  @override
  void visitNullLiteral(NullLiteralExpr expr) {}

  @override
  void visitListLiteral(ListLiteralExpr expr) {
    for (final elem in expr.elements) {
      _visit(elem);
    }
  }

  @override
  void visitMapLiteral(MapLiteralExpr expr) {
    for (final entry in expr.entries) {
      _visit(entry.key);
      _visit(entry.value);
    }
  }

  @override
  void visitSetLiteral(SetLiteralExpr expr) {
    for (final elem in expr.elements) {
      _visit(elem);
    }
  }

  @override
  void visitIdentifier(IdentifierExpr expr) {
    variables.add(expr.name);
  }

  @override
  void visitPropertyAccess(PropertyAccessExpr expr) {
    _visit(expr.target);
  }

  @override
  void visitIndexAccess(IndexAccessExpr expr) {
    _visit(expr.target);
    _visit(expr.index);
  }

  @override
  void visitBinaryOp(BinaryOpExpr expr) {
    _visit(expr.left);
    _visit(expr.right);
  }

  @override
  void visitUnaryOp(UnaryOpExpr expr) {
    _visit(expr.operand);
  }

  @override
  void visitAssignment(AssignmentExpr expr) {
    _visit(expr.target);
    _visit(expr.value);
  }

  @override
  void visitConditional(ConditionalExpr expr) {
    _visit(expr.condition);
    _visit(expr.thenExpr);
    _visit(expr.elseExpr);
  }

  @override
  void visitFunctionCall(FunctionCallExpr expr) {
    for (final arg in expr.arguments) {
      _visit(arg);
    }
    for (final value in expr.namedArguments.values) {
      _visit(value);
    }
  }

  @override
  void visitMethodCall(MethodCallExpr expr) {
    if (expr.receiver != null) {
      _visit(expr.receiver!);
    }
    for (final arg in expr.arguments) {
      _visit(arg);
    }
    for (final value in expr.namedArguments.values) {
      _visit(value);
    }
  }

  @override
  void visitConstructorCall(ConstructorCallExpr expr) {
    for (final arg in expr.arguments) {
      _visit(arg);
    }
    for (final value in expr.namedArguments.values) {
      _visit(value);
    }
  }

  @override
  void visitLambda(LambdaExpr expr) {
    if (expr.body != null) {
      _visit(expr.body!);
    }
  }

  @override
  void visitAwait(AwaitExpr expr) {
    _visit(expr.futureExpression);
  }

  @override
  void visitThrow(ThrowExpr expr) {
    _visit(expr.exceptionExpression);
  }

  @override
  void visitCast(CastExpr expr) {
    _visit(expr.expression);
  }

  @override
  void visitTypeCheck(TypeCheckExpr expr) {
    _visit(expr.expression);
  }

  void _visit(ExpressionIR expr) {
    if (expr is IntLiteralExpr)
      visitIntLiteral(expr);
    else if (expr is DoubleLiteralExpr)
      visitDoubleLiteral(expr);
    else if (expr is StringLiteralExpr)
      visitStringLiteral(expr);
    else if (expr is BoolLiteralExpr)
      visitBoolLiteral(expr);
    else if (expr is NullLiteralExpr)
      visitNullLiteral(expr);
    else if (expr is ListLiteralExpr)
      visitListLiteral(expr);
    else if (expr is MapLiteralExpr)
      visitMapLiteral(expr);
    else if (expr is SetLiteralExpr)
      visitSetLiteral(expr);
    else if (expr is IdentifierExpr)
      visitIdentifier(expr);
    else if (expr is PropertyAccessExpr)
      visitPropertyAccess(expr);
    else if (expr is IndexAccessExpr)
      visitIndexAccess(expr);
    else if (expr is BinaryOpExpr)
      visitBinaryOp(expr);
    else if (expr is UnaryOpExpr)
      visitUnaryOp(expr);
    else if (expr is AssignmentExpr)
      visitAssignment(expr);
    else if (expr is ConditionalExpr)
      visitConditional(expr);
    else if (expr is FunctionCallExpr)
      visitFunctionCall(expr);
    else if (expr is MethodCallExpr)
      visitMethodCall(expr);
    else if (expr is ConstructorCallExpr)
      visitConstructorCall(expr);
    else if (expr is LambdaExpr)
      visitLambda(expr);
    else if (expr is AwaitExpr)
      visitAwait(expr);
    else if (expr is ThrowExpr)
      visitThrow(expr);
    else if (expr is CastExpr)
      visitCast(expr);
    else if (expr is TypeCheckExpr)
      visitTypeCheck(expr);
  }
}
