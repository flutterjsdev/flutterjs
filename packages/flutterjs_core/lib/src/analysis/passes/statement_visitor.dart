// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// =============================================================================
// STATEMENT VISITORS
// =============================================================================
import 'package:flutterjs_core/ast_it.dart';

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
    } else if (stmt is CatchClauseStmt) {
      // todo
    } else if (stmt is AssertStatementIR) {
      // todo
    } else if (stmt is EmptyStatementIR) {
    } else if (stmt is YieldStatementIR) {
    } else if (stmt is LabeledStatementIR) {
    } else if (stmt is FunctionDeclarationStatementIR) {
    } else if (stmt is WidgetUsageIR) {}
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

  // ✅ NEW: Add this method to handle FunctionBodyIR
  Set<String> analyzeFunctionBody(FunctionBodyIR body) {
    variables.clear();
    for (final stmt in body.statements) {
      _visit(stmt);
    }
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

  // ✅ NEW: Add this method to handle FunctionBodyIR
  void analyzeFunctionBody(FunctionBodyIR body) {
    _isReachable = true;
    unreachableLocations.clear();

    for (final stmt in body.statements) {
      _visit(stmt);
      if (!_isReachable) break;
    }
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
