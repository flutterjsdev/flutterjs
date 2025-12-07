// File: lib/src/analysis/visitors/type_inference_visitor.dart
import 'package:flutterjs_core/flutterjs_core.dart';

import 'expression_visitor.dart';

/// Enhanced type inferencer using ExpressionVisitor pattern
class ExpressionBasedTypeInferencer implements ExpressionVisitor<TypeIR?> {
  final Map<String, dynamic> globalSymbols;
  final Map<String, ProviderInfo> providerRegistry;
  final Map<String, Set<String>> typeCompatibilityGraph;
  final Map<String, TypeIR> typeCache = {};

  ExpressionBasedTypeInferencer({
    required this.globalSymbols,
    required this.providerRegistry,
    required this.typeCompatibilityGraph,
  });

  /// Main entry point with caching
  TypeIR? infer(ExpressionIR expr) {
    if (typeCache.containsKey(expr.id)) {
      return typeCache[expr.id];
    }

    final result = _visit(expr);
    if (result != null) {
      typeCache[expr.id] = result;
    }
    return result;
  }

  /// Internal dispatcher
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
    } else if (expr is EnumMemberAccessExpressionIR) {
      return visitEnumMemberAccess(expr);
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
  TypeIR? visitIdentifier(IdentifierExpr expr) => expr.resultType;

  @override
  TypeIR? visitPropertyAccess(PropertyAccessExpr expr) => expr.resultType;

  @override
  TypeIR? visitIndexAccess(IndexAccessExpr expr) => expr.resultType;

  @override
  TypeIR? visitBinaryOp(BinaryOpExpr expr) {
    final left = _visit(expr.left);
    final right = _visit(expr.right);

    // Comparison operators always return bool
    if (['==', '!=', '<', '>', '<=', '>='].contains(expr.operator)) {
      return _createType('bool');
    }

    // Arithmetic: double wins
    if (['+', '-', '*', '/'].contains(expr.operator)) {
      if (_isType(left, 'double') || _isType(right, 'double')) {
        return _createType('double');
      }
      if (_isType(left, 'int') && _isType(right, 'int')) {
        return expr.operator == '/' ? _createType('double') : _createType('int');
      }
    }

    return expr.resultType;
  }

  @override
  TypeIR? visitUnaryOp(UnaryOpExpr expr) {
    if (expr.operator == '!') return _createType('bool');
    return _visit(expr.operand);
  }

  @override
  TypeIR? visitAssignment(AssignmentExpr expr) => _visit(expr.value);

  @override
  TypeIR? visitConditional(ConditionalExpr expr) {
    final thenType = _visit(expr.thenExpr);
    final elseType = _visit(expr.elseExpr);
    if (_typesMatch(thenType, elseType)) return thenType;
    return thenType; // Default to then type
  }

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

  @override
  TypeIR? visitEnumMemberAccess(EnumMemberAccessExpressionIR expr) =>
      expr.resultType;

  // Helpers
  TypeIR _createType(String name) => SimpleTypeIR(
    id: 'type_$name',
    name: name,
    isNullable: false,
    sourceLocation: SourceLocationIR(
      id: 'loc_builtin',
      file: 'builtin',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    ),
  );

  bool _isType(TypeIR? type, String name) =>
      type is SimpleTypeIR && type.name == name;

  bool _typesMatch(TypeIR? a, TypeIR? b) {
    if (a == null || b == null) return false;
    if (a is SimpleTypeIR && b is SimpleTypeIR) {
      return a.name == b.name;
    }
    return false;
  }
}