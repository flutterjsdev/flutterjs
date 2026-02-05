// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:flutterjs_core/ast_it.dart';
import 'package:flutterjs_core/src/ir/expressions/enum_member_access_expression.dart';

import '../../ir/expressions/expression_ir.dart';
import '../../ir/expressions/advanced.dart';
import '../../ir/expressions/function_method_calls.dart';
import '../../ir/expressions/literals.dart';
import '../../ir/expressions/operations.dart';
import '../../ir/expressions/vaibales_access.dart';

/// =============================================================================
///  VARIABLE COLLECTOR
///  Part of the custom Dart IR (Intermediate Representation) analyzer
/// =============================================================================
///
/// PURPOSE
/// -------
/// Recursively traverses an expression tree and collects every variable
/// (identifier) that is *read* or *referenced* within it.
///
/// This is extremely useful for:
/// • Detecting undeclared variables
/// • Building dependency graphs
/// • Implementing "find all usages"
/// • Supporting refactoring tools
/// • Analyzing closure-captured variables
/// • Linter rules (e.g. "no unused variables")
///
/// FEATURES
/// --------
/// • Handles all expression kinds (literals, operations, calls, etc.)
/// • Properly walks inside string interpolations
/// • Ignores literals and constants – only collects IdentifierExpr nodes
/// • Supports Dart 3.0+ enum member access (.center, MainAxisAlignment.center)
/// • Thread-safe: can be reused across multiple expressions
/// • Result available via the public `variables` Set<String>
///
/// USAGE EXAMPLE
/// -------------
/// ```dart
/// final collector = VariableCollector();
/// collector.visit(someComplexExpression);
/// print(collector.variables); // → {'count', 'user', 'isActive'}
/// ```
///
/// NOTE
/// ----
/// This visitor only collects *references*, not declarations.
/// For declarations, use `VariableDeclarationExtractor` from expressionvisitor.dart.
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-27
/// =============================================================================

/// Collects all variable references from expressions
/// ✅ Updated: Includes Dart 3.0+ enum member access support
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
        visit(interp);
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
      visit(elem);
    }
  }

  @override
  void visitMapLiteral(MapLiteralExpr expr) {
    for (final entry in expr.entries) {
      visit(entry.key);
      visit(entry.value);
    }
  }

  @override
  void visitSetLiteral(SetLiteralExpr expr) {
    for (final elem in expr.elements) {
      visit(elem);
    }
  }

  @override
  void visitIdentifier(IdentifierExpr expr) {
    variables.add(expr.name);
  }

  @override
  void visitPropertyAccess(PropertyAccessExpr expr) {
    visit(expr.target);
  }

  @override
  void visitIndexAccess(IndexAccessExpr expr) {
    visit(expr.target);
    visit(expr.index);
  }

  @override
  void visitBinaryOp(BinaryOpExpr expr) {
    visit(expr.left);
    visit(expr.right);
  }

  @override
  void visitUnaryOp(UnaryOpExpr expr) {
    visit(expr.operand);
  }

  @override
  void visitAssignment(AssignmentExpr expr) {
    visit(expr.target);
    visit(expr.value);
  }

  @override
  void visitConditional(ConditionalExpr expr) {
    visit(expr.condition);
    visit(expr.thenExpr);
    visit(expr.elseExpr);
  }

  @override
  void visitFunctionCall(FunctionCallExpr expr) {
    for (final arg in expr.arguments) {
      visit(arg);
    }
    for (final value in expr.namedArguments.values) {
      visit(value);
    }
  }

  @override
  void visitMethodCall(MethodCallExpr expr) {
    if (expr.receiver != null) {
      visit(expr.receiver!);
    }
    for (final arg in expr.arguments) {
      visit(arg);
    }
    for (final value in expr.namedArguments.values) {
      visit(value);
    }
  }

  @override
  void visitConstructorCall(ConstructorCallExpr expr) {
    for (final arg in expr.arguments) {
      visit(arg);
    }
    for (final value in expr.namedArguments.values) {
      visit(value);
    }
  }

  @override
  void visitLambda(LambdaExpr expr) {
    if (expr.body != null) {
      visit(expr.body!);
    }
  }

  @override
  void visitAwait(AwaitExpr expr) {
    visit(expr.futureExpression);
  }

  @override
  void visitThrow(ThrowExpr expr) {
    visit(expr.exceptionExpression);
  }

  @override
  void visitCast(CastExpr expr) {
    visit(expr.expression);
  }

  @override
  void visitTypeCheck(TypeCheckExpr expr) {
    visit(expr.expression);
  }

  // ✅ NEW: Handle Dart 3.0+ enum member access
  @override
  void visitEnumMemberAccess(EnumMemberAccessExpressionIR expr) {
    // Enum member access like .center or MainAxisAlignment.center
    // Add the enum type name if it's qualified (not shorthand)
    if (expr.typeName != null) {
      variables.add(expr.typeName!);
    }
    // Add inferred type name if type was inferred from context
    if (expr.inferredTypeName != null) {
      variables.add(expr.inferredTypeName!);
    }
    // The member name itself (.center) is not a variable reference
    // It's just a static constant access, so we don't add it
  }

  // =========================================================================
  // PRIVATE DISPATCHER
  // =========================================================================

  /// ✅ UPDATED: Internal dispatcher with EnumMemberAccess support
  void visit(ExpressionIR expr) {
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
    } else if (expr is EnumMemberAccessExpressionIR) {
      // ✅ NEW: Handle enum member access
      visitEnumMemberAccess(expr);
    }
  }
}
