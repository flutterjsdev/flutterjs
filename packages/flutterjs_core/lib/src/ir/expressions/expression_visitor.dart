import 'dart:math';

import 'expression_ir.dart';
import 'advanced.dart';
import 'function_method_calls.dart';
import 'literals.dart';
import 'operations.dart';
import 'vaibales_access.dart';
import '../statements/statement_ir.dart';
import '../types/type_ir.dart';

/// =============================================================================
///  EXPRESSION & STATEMENT VISITOR FRAMEWORK
///  Core analysis infrastructure for the custom Dart IR
/// =============================================================================
///
/// OVERVIEW
/// --------
/// This file contains the complete visitor pattern implementation for
/// traversing and analyzing the `ExpressionIR` and `StatementIR` AST.
///
/// It enables multiple independent analyses (type inference, constant folding,
/// metrics, linting, etc.) without coupling them to the node classes.
///
/// KEY VISITORS INCLUDED
/// ---------------------
/// • DepthCalculator          → Maximum expression nesting depth
/// • TypeInferencer            → Bottom-up type inference with context
/// • ConstantFolder            → Evaluates compile-time constant expressions
/// • DependencyExtractor       → Extracts function/method/constructor dependencies
/// • StatementCounter          → Counts statements and control-flow nodes
/// • VariableDeclarationExtractor → Finds all declared variables in a block
/// • ReachabilityAnalyzer      → Detects unreachable code after return/throw/break
///
/// EXTENDING THE FRAMEWORK
/// -----------------------
/// To create a new analysis:
///   1. Implement `ExpressionVisitor<R>` and/or `StatementVisitor<R>`
///   2. Use the provided `_visit()` dispatcher for clean type-switching
///   3. Return meaningful results or mutate internal state as needed
///
/// All visitors are designed to be fast, reusable, and composable.
///
/// PERFORMANCE
/// -----------
/// Visitors use direct `is` checks + private `_visit()` dispatchers for
/// maximum performance (avoids virtual method overhead where possible).
///
/// RELATED FILES
/// -------------
/// • variable_collector.dart → Specialized collector for referenced variables
/// • expression_ir.dart      → Core node definitions
/// • statement_ir.dart       → Control-flow node definitions
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
/// Base visitor interface for traversing expressions
abstract class ExpressionVisitor<R> {
  R visitIntLiteral(IntLiteralExpr expr);
  R visitDoubleLiteral(DoubleLiteralExpr expr);
  R visitStringLiteral(StringLiteralExpr expr);
  R visitBoolLiteral(BoolLiteralExpr expr);
  R visitNullLiteral(NullLiteralExpr expr);
  R visitListLiteral(ListLiteralExpr expr);
  R visitMapLiteral(MapLiteralExpr expr);
  R visitSetLiteral(SetLiteralExpr expr);
  R visitIdentifier(IdentifierExpr expr);
  R visitPropertyAccess(PropertyAccessExpr expr);
  R visitIndexAccess(IndexAccessExpr expr);
  R visitBinaryOp(BinaryOpExpr expr);
  R visitUnaryOp(UnaryOpExpr expr);
  R visitAssignment(AssignmentExpr expr);
  R visitConditional(ConditionalExpr expr);
  R visitFunctionCall(FunctionCallExpr expr);
  R visitMethodCall(MethodCallExpr expr);
  R visitConstructorCall(ConstructorCallExpr expr);
  R visitLambda(LambdaExpr expr);
  R visitAwait(AwaitExpr expr);
  R visitThrow(ThrowExpr expr);
  R visitCast(CastExpr expr);
  R visitTypeCheck(TypeCheckExpr expr);
}

/// Base visitor interface for traversing statements
abstract class StatementVisitor<R> {
  R visitExpressionStmt(ExpressionStmt stmt);
  R visitVariableDeclaration(VariableDeclarationStmt stmt);
  R visitReturn(ReturnStmt stmt);
  R visitBreak(BreakStmt stmt);
  R visitContinue(ContinueStmt stmt);
  R visitThrow(ThrowStmt stmt);
  R visitBlock(BlockStmt stmt);
  R visitIf(IfStmt stmt);
  R visitFor(ForStmt stmt);
  R visitForEach(ForEachStmt stmt);
  R visitWhile(WhileStmt stmt);
  R visitDoWhile(DoWhileStmt stmt);
  R visitSwitch(SwitchStmt stmt);
  R visitTry(TryStmt stmt);
}

// =============================================================================
// EXPRESSION VISITORS
// =============================================================================

/// Calculates maximum nesting depth of expressions
class DepthCalculator implements ExpressionVisitor<int> {
  int _maxDepth = 0;

  int get maxDepth => _maxDepth;

  int calculate(ExpressionIR expr) {
    final depth = _visit(expr);
    _maxDepth = depth;
    return depth;
  }

  int _visit(ExpressionIR expr) {
    if (expr is IntLiteralExpr) {
      return visitIntLiteral(expr);
    } else if (expr is DoubleLiteralExpr)
      return visitDoubleLiteral(expr);
    else if (expr is StringLiteralExpr)
      return visitStringLiteral(expr);
    else if (expr is BoolLiteralExpr)
      return visitBoolLiteral(expr);
    else if (expr is NullLiteralExpr)
      return visitNullLiteral(expr);
    else if (expr is ListLiteralExpr)
      return visitListLiteral(expr);
    else if (expr is MapLiteralExpr)
      return visitMapLiteral(expr);
    else if (expr is SetLiteralExpr)
      return visitSetLiteral(expr);
    else if (expr is IdentifierExpr)
      return visitIdentifier(expr);
    else if (expr is PropertyAccessExpr)
      return visitPropertyAccess(expr);
    else if (expr is IndexAccessExpr)
      return visitIndexAccess(expr);
    else if (expr is BinaryOpExpr)
      return visitBinaryOp(expr);
    else if (expr is UnaryOpExpr)
      return visitUnaryOp(expr);
    else if (expr is AssignmentExpr)
      return visitAssignment(expr);
    else if (expr is ConditionalExpr)
      return visitConditional(expr);
    else if (expr is FunctionCallExpr)
      return visitFunctionCall(expr);
    else if (expr is MethodCallExpr)
      return visitMethodCall(expr);
    else if (expr is ConstructorCallExpr)
      return visitConstructorCall(expr);
    else if (expr is LambdaExpr)
      return visitLambda(expr);
    else if (expr is AwaitExpr)
      return visitAwait(expr);
    else if (expr is ThrowExpr)
      return visitThrow(expr);
    else if (expr is CastExpr)
      return visitCast(expr);
    else if (expr is TypeCheckExpr)
      return visitTypeCheck(expr);
    return 1;
  }

  @override
  int visitIntLiteral(IntLiteralExpr expr) => 1;
  @override
  int visitDoubleLiteral(DoubleLiteralExpr expr) => 1;
  @override
  int visitStringLiteral(StringLiteralExpr expr) {
    if (expr.interpolations == null) return 1;
    final maxInterp = expr.interpolations!
        .map(_visit)
        .fold(0, (a, b) => a > b ? a : b);
    return maxInterp + 1;
  }

  @override
  int visitBoolLiteral(BoolLiteralExpr expr) => 1;
  @override
  int visitNullLiteral(NullLiteralExpr expr) => 1;
  @override
  int visitListLiteral(ListLiteralExpr expr) {
    final maxElem = expr.elements.map(_visit).fold(0, (a, b) => a > b ? a : b);
    return maxElem + 1;
  }

  @override
  int visitMapLiteral(MapLiteralExpr expr) {
    int maxDepth = 1;
    for (final entry in expr.entries) {
      maxDepth = _max(maxDepth, _visit(entry.key), _visit(entry.value));
    }
    return maxDepth + 1;
  }

  @override
  int visitSetLiteral(SetLiteralExpr expr) {
    final maxElem = expr.elements.map(_visit).fold(0, (a, b) => a > b ? a : b);
    return maxElem + 1;
  }

  @override
  int visitIdentifier(IdentifierExpr expr) => 1;
  @override
  int visitPropertyAccess(PropertyAccessExpr expr) => _visit(expr.target) + 1;
  @override
  int visitIndexAccess(IndexAccessExpr expr) =>
      _max(1, _visit(expr.target), _visit(expr.index)) + 1;
  @override
  int visitBinaryOp(BinaryOpExpr expr) =>
      _max(1, _visit(expr.left), _visit(expr.right)) + 1;
  @override
  int visitUnaryOp(UnaryOpExpr expr) => _visit(expr.operand) + 1;
  @override
  int visitAssignment(AssignmentExpr expr) =>
      _max(1, _visit(expr.target), _visit(expr.value)) + 1;
  @override
  int visitConditional(ConditionalExpr expr) =>
      _max(
        _visit(expr.condition),
        _visit(expr.thenExpr),
        _visit(expr.elseExpr),
      ) +
      1;
  @override
  int visitFunctionCall(FunctionCallExpr expr) {
    int maxArgDepth = 0;
    for (final arg in expr.arguments) {
      maxArgDepth = _max(maxArgDepth, _visit(arg));
    }
    for (final val in expr.namedArguments.values) {
      maxArgDepth = _max(maxArgDepth, _visit(val));
    }
    return maxArgDepth + 1;
  }

  @override
  int visitMethodCall(MethodCallExpr expr) {
    int maxDepth = expr.receiver != null ? _visit(expr.receiver!) : 0;
    for (final arg in expr.arguments) {
      maxDepth = _max(maxDepth, _visit(arg));
    }
    for (final val in expr.namedArguments.values) {
      maxDepth = _max(maxDepth, _visit(val));
    }
    return maxDepth + 1;
  }

  @override
  int visitConstructorCall(ConstructorCallExpr expr) {
    int maxDepth = 0;
    for (final arg in expr.arguments) {
      maxDepth = _max(maxDepth, _visit(arg));
    }
    for (final val in expr.namedArguments.values) {
      maxDepth = _max(maxDepth, _visit(val));
    }
    return maxDepth + 1;
  }

  @override
  int visitLambda(LambdaExpr expr) =>
      expr.body != null ? _visit(expr.body!) + 1 : 1;
  @override
  int visitAwait(AwaitExpr expr) => _visit(expr.futureExpression) + 1;
  @override
  int visitThrow(ThrowExpr expr) => _visit(expr.exceptionExpression) + 1;
  @override
  int visitCast(CastExpr expr) => _visit(expr.expression) + 1;
  @override
  int visitTypeCheck(TypeCheckExpr expr) => _visit(expr.expression) + 1;

  int _max(int a, [int? b, int? c]) {
    int result = a;
    if (b != null) result = result > b ? result : b;
    if (c != null) result = result > c ? result : c;
    return result;
  }
}

/// Infers types bottom-up through expression trees
class TypeInferencer implements ExpressionVisitor<TypeIR?> {
  final Map<String, TypeIR> typeContext;

  TypeInferencer({Map<String, TypeIR>? context}) : typeContext = context ?? {};

  TypeIR? infer(ExpressionIR expr) => _visit(expr);

  TypeIR? _visit(ExpressionIR expr) {
    if (expr is IntLiteralExpr) {
      return visitIntLiteral(expr);
    } else if (expr is DoubleLiteralExpr) {
      return visitDoubleLiteral(expr);
    } else if (expr is StringLiteralExpr) {
      return visitStringLiteral(expr);
    } else if (expr is BoolLiteralExpr) {
      return visitBoolLiteral(expr);
    } else if (expr is NullLiteralExpr) {
      return visitNullLiteral(expr);
    } else if (expr is ListLiteralExpr) {
      return visitListLiteral(expr);
    } else if (expr is MapLiteralExpr) {
      return visitMapLiteral(expr);
    } else if (expr is SetLiteralExpr) {
      return visitSetLiteral(expr);
    } else if (expr is IdentifierExpr) {
      return visitIdentifier(expr);
    } else if (expr is PropertyAccessExpr) {
      return visitPropertyAccess(expr);
    } else if (expr is IndexAccessExpr) {
      return visitIndexAccess(expr);
    } else if (expr is BinaryOpExpr) {
      return visitBinaryOp(expr);
    } else if (expr is UnaryOpExpr) {
      return visitUnaryOp(expr);
    } else if (expr is AssignmentExpr) {
      return visitAssignment(expr);
    } else if (expr is ConditionalExpr) {
      return visitConditional(expr);
    } else if (expr is FunctionCallExpr) {
      return visitFunctionCall(expr);
    } else if (expr is MethodCallExpr) {
      return visitMethodCall(expr);
    } else if (expr is ConstructorCallExpr) {
      return visitConstructorCall(expr);
    } else if (expr is LambdaExpr) {
      return visitLambda(expr);
    } else if (expr is AwaitExpr) {
      return visitAwait(expr);
    } else if (expr is ThrowExpr) {
      return visitThrow(expr);
    } else if (expr is CastExpr) {
      return visitCast(expr);
    } else if (expr is TypeCheckExpr) {
      return visitTypeCheck(expr);
    }
    return null;
  }

  @override
  TypeIR? visitIntLiteral(IntLiteralExpr expr) => expr.resultType;
  @override
  TypeIR? visitDoubleLiteral(DoubleLiteralExpr expr) => expr.resultType;
  @override
  TypeIR? visitStringLiteral(StringLiteralExpr expr) => expr.resultType;
  @override
  TypeIR? visitBoolLiteral(BoolLiteralExpr expr) => expr.resultType;
  @override
  TypeIR? visitNullLiteral(NullLiteralExpr expr) => expr.resultType;
  @override
  TypeIR? visitListLiteral(ListLiteralExpr expr) => expr.resultType;
  @override
  TypeIR? visitMapLiteral(MapLiteralExpr expr) => expr.resultType;
  @override
  TypeIR? visitSetLiteral(SetLiteralExpr expr) => expr.resultType;
  @override
  TypeIR? visitIdentifier(IdentifierExpr expr) =>
      typeContext[expr.name] ?? expr.resultType;
  @override
  TypeIR? visitPropertyAccess(PropertyAccessExpr expr) => expr.resultType;
  @override
  TypeIR? visitIndexAccess(IndexAccessExpr expr) => expr.resultType;
  @override
  TypeIR? visitBinaryOp(BinaryOpExpr expr) => expr.resultType;
  @override
  TypeIR? visitUnaryOp(UnaryOpExpr expr) => expr.resultType;
  @override
  TypeIR? visitAssignment(AssignmentExpr expr) => _visit(expr.value);
  @override
  TypeIR? visitConditional(ConditionalExpr expr) =>
      _visit(expr.thenExpr) ?? _visit(expr.elseExpr);
  @override
  TypeIR? visitFunctionCall(FunctionCallExpr expr) => expr.resultType;
  @override
  TypeIR? visitMethodCall(MethodCallExpr expr) => expr.resultType;
  @override
  TypeIR? visitConstructorCall(ConstructorCallExpr expr) => expr.resultType;
  @override
  TypeIR? visitLambda(LambdaExpr expr) => expr.resultType;
  @override
  TypeIR? visitAwait(AwaitExpr expr) => expr.resultType;
  @override
  TypeIR? visitThrow(ThrowExpr expr) => expr.resultType;
  @override
  TypeIR? visitCast(CastExpr expr) => expr.resultType;
  @override
  TypeIR? visitTypeCheck(TypeCheckExpr expr) => expr.resultType;
}

/// Evaluates compile-time constant expressions
class ConstantFolder implements ExpressionVisitor<dynamic> {
  dynamic fold(ExpressionIR expr) => _visit(expr);

  dynamic _visit(ExpressionIR expr) {
    if (expr is IntLiteralExpr) {
      return visitIntLiteral(expr);
    } else if (expr is DoubleLiteralExpr) {
      return visitDoubleLiteral(expr);
    } else if (expr is StringLiteralExpr) {
      return visitStringLiteral(expr);
    } else if (expr is BoolLiteralExpr) {
      return visitBoolLiteral(expr);
    } else if (expr is NullLiteralExpr) {
      return visitNullLiteral(expr);
    } else if (expr is ListLiteralExpr) {
      return visitListLiteral(expr);
    } else if (expr is MapLiteralExpr) {
      return visitMapLiteral(expr);
    } else if (expr is SetLiteralExpr) {
      return visitSetLiteral(expr);
    } else if (expr is BinaryOpExpr) {
      return visitBinaryOp(expr);
    } else if (expr is UnaryOpExpr) {
      return visitUnaryOp(expr);
    } else if (expr is ConditionalExpr) {
      return visitConditional(expr);
    } else if (expr is CastExpr) {
      return visitCast(expr);
    }
    return null; // Non-constant
  }

  @override
  dynamic visitIntLiteral(IntLiteralExpr expr) => expr.value;
  @override
  dynamic visitDoubleLiteral(DoubleLiteralExpr expr) => expr.value;
  @override
  dynamic visitStringLiteral(StringLiteralExpr expr) => expr.value;
  @override
  dynamic visitBoolLiteral(BoolLiteralExpr expr) => expr.value;
  @override
  dynamic visitNullLiteral(NullLiteralExpr expr) => null;
  @override
  dynamic visitListLiteral(ListLiteralExpr expr) {
    final folded = <dynamic>[];
    for (final elem in expr.elements) {
      final val = _visit(elem);
      if (val == null && elem is! NullLiteralExpr) return null;
      folded.add(val);
    }
    return folded;
  }

  @override
  dynamic visitMapLiteral(MapLiteralExpr expr) {
    final folded = <dynamic, dynamic>{};
    for (final entry in expr.entries) {
      final k = _visit(entry.key);
      final v = _visit(entry.value);
      if ((k == null && entry.key is! NullLiteralExpr) ||
          (v == null && entry.value is! NullLiteralExpr)) {
        return null;
      }
      folded[k] = v;
    }
    return folded;
  }

  @override
  dynamic visitSetLiteral(SetLiteralExpr expr) {
    final folded = <dynamic>{};
    for (final elem in expr.elements) {
      final val = _visit(elem);
      if (val == null && elem is! NullLiteralExpr) return null;
      folded.add(val);
    }
    return folded;
  }

  @override
  dynamic visitIdentifier(IdentifierExpr expr) => null; // Not constant
  @override
  dynamic visitPropertyAccess(PropertyAccessExpr expr) => null; // Not constant
  @override
  dynamic visitIndexAccess(IndexAccessExpr expr) => null; // Not constant
  @override
  dynamic visitBinaryOp(BinaryOpExpr expr) {
    final left = _visit(expr.left);
    final right = _visit(expr.right);
    if (left == null || right == null) return null;

    try {
      switch (expr.operator) {
        // Arithmetic operators
        case BinaryOperator.add:
          return left + right;
        case BinaryOperator.subtract:
          return left - right;
        case BinaryOperator.multiply:
          return left * right;
        case BinaryOperator.divide:
          return left / right;
        case BinaryOperator.truncatingDivide:
          return left ~/ right;
        case BinaryOperator.modulo:
          return left % right;
        case BinaryOperator.power:
          return pow(left, right); // Requires: import 'dart:math';

        // Equality operators
        case BinaryOperator.equals:
          return left == right;
        case BinaryOperator.notEquals:
          return left != right;

        // Relational operators
        case BinaryOperator.lessThan:
          return left < right;
        case BinaryOperator.lessOrEqual:
          return left <= right;
        case BinaryOperator.greaterThan:
          return left > right;
        case BinaryOperator.greaterOrEqual:
          return left >= right;

        // Logical operators
        case BinaryOperator.logicalAnd:
          return left && right;
        case BinaryOperator.logicalOr:
          return left || right;

        // Bitwise operators
        case BinaryOperator.bitwiseAnd:
          return left & right;
        case BinaryOperator.bitwiseOr:
          return left | right;
        case BinaryOperator.bitwiseXor:
          return left ^ right;
        case BinaryOperator.leftShift:
          return left << right;
        case BinaryOperator.rightShift:
          return left >> right;

        // Null-aware operator
        case BinaryOperator.nullCoalesce:
          return left ?? right;

        // default: return null;
      }
    } catch (_) {
      return null;
    }
  }

  @override
  dynamic visitUnaryOp(UnaryOpExpr expr) {
    final operand = _visit(expr.operand);
    if (operand == null) return null;
    try {
      switch (expr.operator) {
        // ✅ UnaryOperator enum
        case UnaryOperator.negate:
          return -operand;
        case UnaryOperator.logicalNot:
          return !operand;
        case UnaryOperator.bitwiseNot:
          return ~operand;
        case UnaryOperator.preIncrement:
          return (operand is num ? operand + 1 : null);
        case UnaryOperator.preDecrement:
          return (operand is num ? operand - 1 : null);
        case UnaryOperator.postIncrement:
          return (operand is num ? operand + 1 : null);
        case UnaryOperator.postDecrement:
          return (operand is num ? operand - 1 : null);

        // default: return null;
      }
    } catch (_) {
      return null;
    }
  }

  @override
  dynamic visitAssignment(AssignmentExpr expr) => null; // Not constant
  @override
  dynamic visitConditional(ConditionalExpr expr) {
    final cond = _visit(expr.condition);
    if (cond is! bool) return null;
    return cond ? _visit(expr.thenExpr) : _visit(expr.elseExpr);
  }

  @override
  dynamic visitFunctionCall(FunctionCallExpr expr) => null; // Not constant
  @override
  dynamic visitMethodCall(MethodCallExpr expr) => null; // Not constant
  @override
  dynamic visitConstructorCall(ConstructorCallExpr expr) => null; // Not constant
  @override
  dynamic visitLambda(LambdaExpr expr) => null; // Not constant
  @override
  dynamic visitAwait(AwaitExpr expr) => null; // Not constant
  @override
  dynamic visitThrow(ThrowExpr expr) => null; // Not constant
  @override
  dynamic visitCast(CastExpr expr) => _visit(expr.expression); // Pass through
  @override
  dynamic visitTypeCheck(TypeCheckExpr expr) => null; // Not constant
}

/// Extracts dependencies from expressions
class DependencyExtractor implements ExpressionVisitor<Set<String>> {
  final Set<String> dependencies = {};

  Set<String> extract(ExpressionIR expr) {
    dependencies.clear();
    _visit(expr);
    return dependencies;
  }

  void _visit(ExpressionIR expr) {
    if (expr is IntLiteralExpr) {
      visitIntLiteral(expr);
    } else if (expr is DoubleLiteralExpr) {
      visitDoubleLiteral(expr);
    } else if (expr is StringLiteralExpr) {
      visitStringLiteral(expr);
    } else if (expr is BoolLiteralExpr) {
      visitBoolLiteral(expr);
    } else if (expr is NullLiteralExpr) {
      visitNullLiteral(expr);
    } else if (expr is ListLiteralExpr) {
      visitListLiteral(expr);
    } else if (expr is MapLiteralExpr) {
      visitMapLiteral(expr);
    } else if (expr is SetLiteralExpr) {
      visitSetLiteral(expr);
    } else if (expr is IdentifierExpr) {
      visitIdentifier(expr);
    } else if (expr is PropertyAccessExpr) {
      visitPropertyAccess(expr);
    } else if (expr is IndexAccessExpr) {
      visitIndexAccess(expr);
    } else if (expr is BinaryOpExpr) {
      visitBinaryOp(expr);
    } else if (expr is UnaryOpExpr) {
      visitUnaryOp(expr);
    } else if (expr is AssignmentExpr) {
      visitAssignment(expr);
    } else if (expr is ConditionalExpr) {
      visitConditional(expr);
    } else if (expr is FunctionCallExpr) {
      visitFunctionCall(expr);
    } else if (expr is MethodCallExpr) {
      visitMethodCall(expr);
    } else if (expr is ConstructorCallExpr) {
      visitConstructorCall(expr);
    } else if (expr is LambdaExpr) {
      visitLambda(expr);
    } else if (expr is AwaitExpr) {
      visitAwait(expr);
    } else if (expr is ThrowExpr) {
      visitThrow(expr);
    } else if (expr is CastExpr) {
      visitCast(expr);
    } else if (expr is TypeCheckExpr) {
      visitTypeCheck(expr);
    }
  }

  @override
  Set<String> visitIntLiteral(IntLiteralExpr expr) => {};
  @override
  Set<String> visitDoubleLiteral(DoubleLiteralExpr expr) => {};
  @override
  Set<String> visitStringLiteral(StringLiteralExpr expr) => {};
  @override
  Set<String> visitBoolLiteral(BoolLiteralExpr expr) => {};
  @override
  Set<String> visitNullLiteral(NullLiteralExpr expr) => {};
  @override
  Set<String> visitListLiteral(ListLiteralExpr expr) {
    for (final elem in expr.elements) {
      _visit(elem);
    }
    return dependencies;
  }

  @override
  Set<String> visitMapLiteral(MapLiteralExpr expr) {
    for (final entry in expr.entries) {
      _visit(entry.key);
      _visit(entry.value);
    }
    return dependencies;
  }

  @override
  Set<String> visitSetLiteral(SetLiteralExpr expr) {
    for (final elem in expr.elements) {
      _visit(elem);
    }
    return dependencies;
  }

  @override
  Set<String> visitIdentifier(IdentifierExpr expr) {
    dependencies.add(expr.name);
    return dependencies;
  }

  @override
  Set<String> visitPropertyAccess(PropertyAccessExpr expr) {
    _visit(expr.target);
    dependencies.add(expr.propertyName);
    return dependencies;
  }

  @override
  Set<String> visitIndexAccess(IndexAccessExpr expr) {
    _visit(expr.target);
    _visit(expr.index);
    return dependencies;
  }

  @override
  Set<String> visitBinaryOp(BinaryOpExpr expr) {
    _visit(expr.left);
    _visit(expr.right);
    return dependencies;
  }

  @override
  Set<String> visitUnaryOp(UnaryOpExpr expr) {
    _visit(expr.operand);
    return dependencies;
  }

  @override
  Set<String> visitAssignment(AssignmentExpr expr) {
    _visit(expr.target);
    _visit(expr.value);
    return dependencies;
  }

  @override
  Set<String> visitConditional(ConditionalExpr expr) {
    _visit(expr.condition);
    _visit(expr.thenExpr);
    _visit(expr.elseExpr);
    return dependencies;
  }

  @override
  Set<String> visitFunctionCall(FunctionCallExpr expr) {
    dependencies.add(expr.functionName);
    for (final arg in expr.arguments) {
      _visit(arg);
    }
    for (final val in expr.namedArguments.values) {
      _visit(val);
    }
    return dependencies;
  }

  @override
  Set<String> visitMethodCall(MethodCallExpr expr) {
    if (expr.receiver != null) {
      _visit(expr.receiver!);
    }
    dependencies.add(expr.methodName);
    for (final arg in expr.arguments) {
      _visit(arg);
    }
    for (final val in expr.namedArguments.values) {
      _visit(val);
    }
    return dependencies;
  }

  @override
  Set<String> visitConstructorCall(ConstructorCallExpr expr) {
    dependencies.add(expr.className);
    for (final arg in expr.arguments) {
      _visit(arg);
    }
    for (final val in expr.namedArguments.values) {
      _visit(val);
    }
    return dependencies;
  }

  @override
  Set<String> visitLambda(LambdaExpr expr) {
    if (expr.body != null) {
      _visit(expr.body!);
    }
    return dependencies;
  }

  @override
  Set<String> visitAwait(AwaitExpr expr) {
    _visit(expr.futureExpression);
    return dependencies;
  }

  @override
  Set<String> visitThrow(ThrowExpr expr) {
    _visit(expr.exceptionExpression);
    return dependencies;
  }

  @override
  Set<String> visitCast(CastExpr expr) {
    _visit(expr.expression);
    return dependencies;
  }

  @override
  Set<String> visitTypeCheck(TypeCheckExpr expr) {
    _visit(expr.expression);
    return dependencies;
  }
}

// =============================================================================
// STATEMENT VISITORS
// =============================================================================

/// Counts statements and their types
class StatementCounter implements StatementVisitor<int> {
  final Map<String, int> counts = {};
  int _totalStatements = 0;

  int get totalStatements => _totalStatements;

  int count(StatementIR stmt) {
    _totalStatements = 0;
    counts.clear();
    _visit(stmt);
    return _totalStatements;
  }

  void _visit(StatementIR stmt) {
    _totalStatements++;
    if (stmt is ExpressionStmt) {
      visitExpressionStmt(stmt);
    } else if (stmt is VariableDeclarationStmt) {
      visitVariableDeclaration(stmt);
    } else if (stmt is ReturnStmt) {
      visitReturn(stmt);
    } else if (stmt is BreakStmt) {
      visitBreak(stmt);
    } else if (stmt is ContinueStmt) {
      visitContinue(stmt);
    } else if (stmt is ThrowStmt) {
      visitThrow(stmt);
    } else if (stmt is BlockStmt) {
      visitBlock(stmt);
    } else if (stmt is IfStmt) {
      visitIf(stmt);
    } else if (stmt is ForStmt) {
      visitFor(stmt);
    } else if (stmt is ForEachStmt) {
      visitForEach(stmt);
    } else if (stmt is WhileStmt) {
      visitWhile(stmt);
    } else if (stmt is DoWhileStmt) {
      visitDoWhile(stmt);
    } else if (stmt is SwitchStmt) {
      visitSwitch(stmt);
    } else if (stmt is TryStmt) {
      visitTry(stmt);
    }
  }

  void _incrementCount(String type) {
    counts[type] = (counts[type] ?? 0) + 1;
  }

  @override
  int visitExpressionStmt(ExpressionStmt stmt) {
    _incrementCount('ExpressionStmt');
    return 1;
  }

  @override
  int visitVariableDeclaration(VariableDeclarationStmt stmt) {
    _incrementCount('VariableDeclarationStmt');
    return 1;
  }

  @override
  int visitReturn(ReturnStmt stmt) {
    _incrementCount('ReturnStmt');
    return 1;
  }

  @override
  int visitBreak(BreakStmt stmt) {
    _incrementCount('BreakStmt');
    return 1;
  }

  @override
  int visitContinue(ContinueStmt stmt) {
    _incrementCount('ContinueStmt');
    return 1;
  }

  @override
  int visitThrow(ThrowStmt stmt) {
    _incrementCount('ThrowStmt');
    return 1;
  }

  @override
  int visitBlock(BlockStmt stmt) {
    _incrementCount('BlockStmt');
    for (final s in stmt.statements) {
      _visit(s);
    }
    return stmt.statements.length;
  }

  @override
  int visitIf(IfStmt stmt) {
    _incrementCount('IfStmt');
    _visit(stmt.thenBranch);
    if (stmt.elseBranch != null) {
      _visit(stmt.elseBranch!);
    }
    return 1;
  }

  @override
  int visitFor(ForStmt stmt) {
    _incrementCount('ForStmt');
    _visit(stmt.body);
    return 1;
  }

  @override
  int visitForEach(ForEachStmt stmt) {
    _incrementCount('ForEachStmt');
    _visit(stmt.body);
    return 1;
  }

  @override
  int visitWhile(WhileStmt stmt) {
    _incrementCount('WhileStmt');
    _visit(stmt.body);
    return 1;
  }

  @override
  int visitDoWhile(DoWhileStmt stmt) {
    _incrementCount('DoWhileStmt');
    _visit(stmt.body);
    return 1;
  }

  @override
  int visitSwitch(SwitchStmt stmt) {
    _incrementCount('SwitchStmt');
    for (final caseStmt in stmt.cases) {
      for (final s in caseStmt.statements) {
        _visit(s);
      }
    }
    return 1;
  }

  @override
  int visitTry(TryStmt stmt) {
    _incrementCount('TryStmt');
    _visit(stmt.tryBlock);
    for (final catchClause in stmt.catchClauses) {
      _visit(catchClause.body);
    }
    if (stmt.finallyBlock != null) {
      _visit(stmt.finallyBlock!);
    }
    return 1;
  }
}

/// Extracts all variable declarations from statements
class VariableDeclarationExtractor implements StatementVisitor<Set<String>> {
  final Set<String> variables = {};
  final Map<String, int> counts = {};
  final DependencyExtractor _exprExtractor = DependencyExtractor();

  Set<String> extract(StatementIR stmt) {
    variables.clear();
    _visit(stmt);
    return variables;
  }

  void _visit(StatementIR stmt) {
    if (stmt is ExpressionStmt) {
      visitExpressionStmt(stmt);
    } else if (stmt is VariableDeclarationStmt) {
      visitVariableDeclaration(stmt);
    } else if (stmt is ReturnStmt) {
      visitReturn(stmt);
    } else if (stmt is BreakStmt) {
      visitBreak(stmt);
    } else if (stmt is ContinueStmt) {
      visitContinue(stmt);
    } else if (stmt is ThrowStmt) {
      visitThrow(stmt);
    } else if (stmt is BlockStmt) {
      visitBlock(stmt);
    } else if (stmt is IfStmt) {
      visitIf(stmt);
    } else if (stmt is ForStmt) {
      visitFor(stmt);
    } else if (stmt is ForEachStmt) {
      visitForEach(stmt);
    } else if (stmt is WhileStmt) {
      visitWhile(stmt);
    } else if (stmt is DoWhileStmt) {
      visitDoWhile(stmt);
    } else if (stmt is SwitchStmt) {
      visitSwitch(stmt);
    } else if (stmt is TryStmt) {
      visitTry(stmt);
    }
  }

  @override
  Set<String> visitExpressionStmt(ExpressionStmt stmt) => variables;
  @override
  Set<String> visitVariableDeclaration(VariableDeclarationStmt stmt) {
    variables.add(stmt.name);
    if (stmt.initializer != null) {
      variables.addAll(_exprExtractor.extract(stmt.initializer!));
    }
    return variables;
  }

  @override
  Set<String> visitReturn(ReturnStmt stmt) {
    if (stmt.expression != null) {
      variables.addAll(_exprExtractor.extract(stmt.expression!));
    }
    return variables;
  }

  @override
  Set<String> visitBreak(BreakStmt stmt) => variables;
  @override
  Set<String> visitContinue(ContinueStmt stmt) => variables;
  @override
  Set<String> visitThrow(ThrowStmt stmt) => variables;
  @override
  Set<String> visitBlock(BlockStmt stmt) {
    for (final s in stmt.statements) {
      _visit(s);
    }
    return variables;
  }

  @override
  Set<String> visitIf(IfStmt stmt) {
    _visit(stmt.thenBranch);
    if (stmt.elseBranch != null) {
      _visit(stmt.elseBranch!);
    }
    return variables;
  }

  @override
  Set<String> visitFor(ForStmt stmt) {
    _visit(stmt.body);
    return variables;
  }

  @override
  Set<String> visitForEach(ForEachStmt stmt) {
    variables.add(stmt.loopVariable);
    _visit(stmt.body);
    return variables;
  }

  @override
  Set<String> visitWhile(WhileStmt stmt) {
    _visit(stmt.body);
    return variables;
  }

  @override
  Set<String> visitDoWhile(DoWhileStmt stmt) {
    _visit(stmt.body);
    return variables;
  }

  @override
  Set<String> visitSwitch(SwitchStmt stmt) {
    for (final caseStmt in stmt.cases) {
      for (final s in caseStmt.statements) {
        _visit(s);
      }
    }
    return variables;
  }

  @override
  Set<String> visitTry(TryStmt stmt) {
    _visit(stmt.tryBlock);
    for (final catchClause in stmt.catchClauses) {
      if (catchClause.exceptionParameter != null) {
        variables.add(catchClause.exceptionParameter!);
      }
      if (catchClause.stackTraceParameter != null) {
        variables.add(catchClause.stackTraceParameter!);
      }
      _visit(catchClause.body);
    }
    if (stmt.finallyBlock != null) {
      _visit(stmt.finallyBlock!);
    }
    return variables;
  }
}

/// Detects unreachable code after return/throw statements
class ReachabilityAnalyzer implements StatementVisitor<bool> {
  bool _isReachable = true;
  final List<String> unreachableLocations = [];

  void analyze(StatementIR stmt) {
    _isReachable = true;
    unreachableLocations.clear();
    _visit(stmt);
  }

  void _visit(StatementIR stmt) {
    if (!_isReachable) {
      unreachableLocations.add(stmt.sourceLocation.toString());
      return;
    }

    if (stmt is ExpressionStmt) {
      visitExpressionStmt(stmt);
    } else if (stmt is VariableDeclarationStmt) {
      visitVariableDeclaration(stmt);
    } else if (stmt is ReturnStmt) {
      visitReturn(stmt);
    } else if (stmt is BreakStmt) {
      visitBreak(stmt);
    } else if (stmt is ContinueStmt) {
      visitContinue(stmt);
    } else if (stmt is ThrowStmt) {
      visitThrow(stmt);
    } else if (stmt is BlockStmt) {
      visitBlock(stmt);
    } else if (stmt is IfStmt) {
      visitIf(stmt);
    } else if (stmt is ForStmt) {
      visitFor(stmt);
    } else if (stmt is ForEachStmt) {
      visitForEach(stmt);
    } else if (stmt is WhileStmt) {
      visitWhile(stmt);
    } else if (stmt is DoWhileStmt) {
      visitDoWhile(stmt);
    } else if (stmt is SwitchStmt) {
      visitSwitch(stmt);
    } else if (stmt is TryStmt) {
      visitTry(stmt);
    }
  }

  @override
  bool visitExpressionStmt(ExpressionStmt stmt) => _isReachable;
  @override
  bool visitVariableDeclaration(VariableDeclarationStmt stmt) => _isReachable;
  @override
  bool visitReturn(ReturnStmt stmt) {
    _isReachable = false;
    return false;
  }

  @override
  bool visitBreak(BreakStmt stmt) {
    _isReachable = false;
    return false;
  }

  @override
  bool visitContinue(ContinueStmt stmt) {
    _isReachable = false;
    return false;
  }

  @override
  bool visitThrow(ThrowStmt stmt) {
    _isReachable = false;
    return false;
  }

  @override
  bool visitBlock(BlockStmt stmt) {
    for (final s in stmt.statements) {
      _visit(s);
      if (!_isReachable) break;
    }
    return _isReachable;
  }

  @override
  bool visitIf(IfStmt stmt) {
    final beforeIf = _isReachable;
    _visit(stmt.thenBranch);
    final afterThen = _isReachable;
    _isReachable = beforeIf;

    if (stmt.elseBranch != null) {
      _visit(stmt.elseBranch!);
      _isReachable = _isReachable && afterThen;
    } else {
      _isReachable = true; // If without else is always reachable
    }
    return _isReachable;
  }

  @override
  bool visitFor(ForStmt stmt) {
    _visit(stmt.body);
    _isReachable = true; // Loop might not execute
    return _isReachable;
  }

  @override
  bool visitForEach(ForEachStmt stmt) {
    _visit(stmt.body);
    _isReachable = true; // Loop might not execute
    return _isReachable;
  }

  @override
  bool visitWhile(WhileStmt stmt) {
    _visit(stmt.body);
    _isReachable = true; // Loop might not execute
    return _isReachable;
  }

  @override
  bool visitDoWhile(DoWhileStmt stmt) {
    _visit(stmt.body);
    _isReachable = true; // Do-while might exit normally
    return _isReachable;
  }

  @override
  bool visitSwitch(SwitchStmt stmt) {
    bool allPathsReturn = true;
    for (final caseStmt in stmt.cases) {
      _isReachable = true;
      for (final s in caseStmt.statements) {
        _visit(s);
        if (!_isReachable) break;
      }
      allPathsReturn = allPathsReturn && !_isReachable;
    }
    _isReachable = !allPathsReturn;
    return _isReachable;
  }

  @override
  bool visitTry(TryStmt stmt) {
    _visit(stmt.tryBlock);
    final afterTry = _isReachable;

    for (final catchClause in stmt.catchClauses) {
      _isReachable = true;
      _visit(catchClause.body);
      if (!_isReachable && stmt.finallyBlock == null) break;
    }

    if (stmt.finallyBlock != null) {
      _isReachable = true;
      _visit(stmt.finallyBlock!);
    } else {
      _isReachable = afterTry;
    }
    return _isReachable;
  }
}

// // =============================================================================
// // USAGE EXAMPLES
// // =============================================================================

// /// Example: Using the visitors together
// class AnalysisExample {
//   void demonstrateVisitors() {
//     // Create sample expressions
//     // final intLit = IntLiteralExpr(id: 'int1', value: 42, resultType: ...);
//     // final strLit = StringLiteralExpr(id: 'str1', value: 'hello', resultType: ...);
//     // final binOp = BinaryOpExpr(id: 'bin1', left: intLit, operator: '+', right: intLit, ...);

//     // Example 1: Calculate depth
//     // final depthCalc = DepthCalculator();
//     // final depth = depthCalc.calculate(binOp);
//     // print('Expression depth: $depth'); // Output: 2

//     // Example 2: Extract variables
//     // final varCollector = VariableCollector();
//     // varCollector.visitBinaryOp(binOp);
//     // print('Variables: ${varCollector.variables}'); // Output: {}

//     // Example 3: Infer types
//     // final typeInf = TypeInferencer();
//     // final type = typeInf.infer(binOp);
//     // print('Result type: $type');

//     // Example 4: Fold constants
//     // final folder = ConstantFolder();
//     // final value = folder.fold(binOp);
//     // print('Constant value: $value'); // Output: 84

//     // Example 5: Extract dependencies
//     // final depExtractor = DependencyExtractor();
//     // final deps = depExtractor.extract(binOp);
//     // print('Dependencies: $deps');

//     // Example 6: Count statements
//     // final counter = StatementCounter();
//     // final count = counter.count(blockStmt);
//     // print('Total statements: $count');
//     // print('Counts: ${counter.counts}');

//     // Example 7: Check reachability
//     // final reachAnalyzer = ReachabilityAnalyzer();
//     // reachAnalyzer.analyze(functionBody);
//     // if (reachAnalyzer.unreachableLocations.isNotEmpty) {
//     //   print('Unreachable code found at: ${reachAnalyzer.unreachableLocations}');
//     // }
//   }

//   /// Composite analysis: Analyze a method for complexity and quality issues
//   void analyzeMethodComplexity(StatementIR methodBody) {
//     final depthCalc = DepthCalculator();
//     final counter = StatementCounter();
//     final reachability = ReachabilityAnalyzer();

//     // Analyze expressions for depth
//     int maxExprDepth = 0;
//     // (would need to walk all expressions in the method)

//     // Count statements
//     counter.count(methodBody);
//     final totalStmts = counter.totalStatements;

//     // Check reachability
//     reachability.analyze(methodBody);

//     // Generate report
//     print('Method Complexity Report:');
//     print('  Total Statements: $totalStmts');
//     print('  Max Expression Depth: $maxExprDepth');
//     print('  Statement Types: ${counter.counts}');
//     if (reachability.unreachableLocations.isNotEmpty) {
//       print('  ⚠️  Unreachable code found');
//     }
//   }

//   /// Combined analysis: Check for setState calls in expressions
//   void checkSetStateUsage(ExpressionIR expr) {
//     final depExtractor = DependencyExtractor();
//     final deps = depExtractor.extract(expr);

//     if (deps.contains('setState')) {
//       print('⚠️  Found setState call in expression');
//     }
//   }

//   /// Type context analysis: Infer types with known variables
//   void inferTypesWithContext(ExpressionIR expr, Map<String, TypeIR> context) {
//     final inferencer = TypeInferencer(context: context);
//     final resultType = inferencer.infer(expr);
//     print('Inferred type: ${resultType?.displayName}');
//   }
// }
