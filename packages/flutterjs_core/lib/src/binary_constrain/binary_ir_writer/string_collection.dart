import 'package:flutterjs_core/flutterjs_core.dart';

mixin StringCollectionPhase {
  List<String> get _stringTable;
  bool get _verbose;
  void printlog(String str);
  void _addString(String str);
  void collectStringsFromImport(ImportStmt stm);
  void collectStringsFromExpression(ExpressionIR? expr);
  void collectStringsFromVariable(VariableDecl ver);
  void collectStringsFromClass(ClassDecl classDecl);
  void collectStringsFromAnalysisIssues(DartFile fileIr);
  void collectStringsFromFunction(FunctionDecl func);

  // ✅ FIXED: Match signature exactly with nullable parameter
  void collectStringsFromStatements(List<StatementIR>? stmts) {
    if (stmts == null) return;
    for (final stmt in stmts) {
      collectStringsFromStatement(stmt);
    }
  }

  void collectStrings(DartFile fileIR) {
    _addString(fileIR.filePath);
    _addString(fileIR.contentHash);
    _addString(fileIR.library ?? "<unknown>");

    printlog('[COLLECT] File: ${fileIR.filePath}');
    printlog('[COLLECT] Imports: ${fileIR.imports.length}');
    printlog('[COLLECT] Exports: ${fileIR.exports.length}');
    printlog('[COLLECT] Classes: ${fileIR.classDeclarations.length}');
    printlog('[COLLECT] Functions: ${fileIR.functionDeclarations.length}');

    // Collect from imports
    for (final import in fileIR.imports) {
      _addString(import.uri);
      _addString(import.sourceLocation.file);
      if (import.prefix != null) _addString(import.prefix!);
      for (final show in import.showList) {
        _addString(show);
      }
      for (final hide in import.hideList) {
        _addString(hide);
      }
      collectStringsFromImport(import);
    }

    // Collect from exports
    for (final export in fileIR.exports) {
      _addString(export.uri);
      _addString(export.sourceLocation.file);
      for (final show in export.showList) {
        _addString(show);
      }
      for (final hide in export.hideList) {
        _addString(hide);
      }
    }

    // Collect from functions
    for (final func in fileIR.functionDeclarations) {
      collectStringsFromFunction(func);
    }

    // Collect from variables
    for (final variable in fileIR.variableDeclarations) {
      collectStringsFromVariable(variable);
    }

    // Collect from classes
    for (final classDecl in fileIR.classDeclarations) {
      collectStringsFromClass(classDecl);
    }

    // NOTE: DartFile doesn't have topLevelStatements field
    // Statements are typically inside function/method bodies, not at file level

    // Collect from analysis issues
    collectStringsFromAnalysisIssues(fileIR);

    printlog('[COLLECT] String table size: ${_stringTable.length}');
    if (_verbose) {
      debugPrintStringTable();
    }
  }

  // ✅ Core statement string collection - Parameter is nullable
  void collectStringsFromStatement(StatementIR? stmt) {
    if (stmt == null) return;

    if (stmt is ExpressionStmt) {
      collectStringsFromExpression(stmt.expression);
    } else if (stmt is VariableDeclarationStmt) {
      _addString(stmt.name);
      if (stmt.type != null) {
        _addString(stmt.type!.displayName());
      }
      if (stmt.initializer != null) {
        collectStringsFromExpression(stmt.initializer);
      }
    } else if (stmt is BlockStmt) {
      for (final s in stmt.statements) {
        collectStringsFromStatement(s);
      }
    } else if (stmt is IfStmt) {
      collectStringsFromExpression(stmt.condition);
      collectStringsFromStatement(stmt.thenBranch);
      // ✅ FIXED: elseBranch is nullable, pass without force unwrap
      collectStringsFromStatement(stmt.elseBranch);
    } else if (stmt is ForStmt) {
      if (stmt.initialization is VariableDeclarationStmt) {
        collectStringsFromStatement(
          stmt.initialization as VariableDeclarationStmt,
        );
      } else if (stmt.initialization is ExpressionIR) {
        collectStringsFromExpression(stmt.initialization as ExpressionIR);
      }
      if (stmt.condition != null) {
        collectStringsFromExpression(stmt.condition);
      }
      for (final update in stmt.updaters) {
        collectStringsFromExpression(update);
      }
      collectStringsFromStatement(stmt.body);
    } else if (stmt is ForEachStmt) {
      _addString(stmt.loopVariable);
      if (stmt.loopVariableType != null) {
        _addString(stmt.loopVariableType!.displayName());
      }
      collectStringsFromExpression(stmt.iterable);
      collectStringsFromStatement(stmt.body);
    } else if (stmt is WhileStmt) {
      collectStringsFromExpression(stmt.condition);
      collectStringsFromStatement(stmt.body);
    } else if (stmt is DoWhileStmt) {
      collectStringsFromStatement(stmt.body);
      collectStringsFromExpression(stmt.condition);
    } else if (stmt is SwitchStmt) {
      collectStringsFromExpression(stmt.expression);
      for (final switchCase in stmt.cases) {
        if (switchCase.patterns != null) {
          for (final pattern in switchCase.patterns!) {
            collectStringsFromExpression(pattern);
          }
        }
        for (final s in switchCase.statements) {
          collectStringsFromStatement(s);
        }
      }
      if (stmt.defaultCase != null) {
        for (final s in stmt.defaultCase!.statements) {
          collectStringsFromStatement(s);
        }
      }
    } else if (stmt is TryStmt) {
      collectStringsFromStatement(stmt.tryBlock);
      for (final catchClause in stmt.catchClauses) {
        if (catchClause.exceptionType != null) {
          _addString(catchClause.exceptionType!.displayName());
        }
        if (catchClause.exceptionParameter != null) {
          _addString(catchClause.exceptionParameter!);
        }
        if (catchClause.stackTraceParameter != null) {
          _addString(catchClause.stackTraceParameter!);
        }
        collectStringsFromStatement(catchClause.body);
      }
      // ✅ FIXED: finallyBlock is nullable, pass without force unwrap
      collectStringsFromStatement(stmt.finallyBlock);
    } else if (stmt is ReturnStmt) {
      if (stmt.expression != null) {
        collectStringsFromExpression(stmt.expression);
      }
    } else if (stmt is ThrowStmt) {
      collectStringsFromExpression(stmt.exceptionExpression);
    } else if (stmt is BreakStmt) {
      if (stmt.label != null) {
        _addString(stmt.label!);
      }
    } else if (stmt is ContinueStmt) {
      if (stmt.label != null) {
        _addString(stmt.label!);
      }
    } else if (stmt is LabeledStatementIR) {
      _addString(stmt.label);
      collectStringsFromStatement(stmt.statement);
    } else if (stmt is YieldStatementIR) {
      collectStringsFromExpression(stmt.value);
    } else if (stmt is FunctionDeclarationStatementIR) {
      collectStringsFromFunction(stmt.function);
    } else if (stmt is AssertStatementIR) {
      collectStringsFromExpression(stmt.condition);
      if (stmt.message != null) {
        collectStringsFromExpression(stmt.message);
      }
    }

    // Always collect source location
    _addString(stmt.sourceLocation.file);
  }

  void debugPrintStringTable() {
    print('\n=== STRING TABLE DEBUG ===');
    print('Total strings: ${_stringTable.length}');
    for (int i = 0; i < _stringTable.length; i++) {
      print('  [$i] "${_stringTable[i]}"');
    }
    print('=== END STRING TABLE ===\n');
  }
}