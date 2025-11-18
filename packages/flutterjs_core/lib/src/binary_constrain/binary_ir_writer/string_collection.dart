import 'package:flutterjs_core/flutterjs_core.dart';

mixin StringCollectionPhase {
  // âœ… Abstract getters that must be provided by implementing class
  List<String> get stringTable;
  bool get isVerbose;
  // âœ… FIXED: Use getter to access verbose flag
  bool get _verbose => isVerbose;
  List<String> get _stringTable => stringTable;

  void printlog(String str);
  void addString(String str);
  void collectStringsFromImport(ImportStmt stm);
  void collectStringsFromExpression(ExpressionIR? expr);
  void collectStringsFromVariable(VariableDecl ver);
  void collectStringsFromClass(ClassDecl classDecl);
  void collectStringsFromAnalysisIssues(DartFile fileIr);
  void collectStringsFromFunction(FunctionDecl func);

  void collectStringsFromStatements(List<StatementIR>? stmts) {
    if (stmts == null) return;
    for (final stmt in stmts) {
      collectStringsFromStatement(stmt);
    }
  }

  void collectStrings(DartFile fileIR) {
    addString(fileIR.filePath);
    addString(fileIR.contentHash);
    addString(fileIR.library ?? "<unknown>");

    printlog('[COLLECT] Starting string collection');
    printlog('[COLLECT] Imports: ${fileIR.imports.length}');

    for (final import in fileIR.imports) {
      addString(import.uri);
      addString(import.sourceLocation.file);
      if (import.prefix != null) addString(import.prefix!);
      for (final show in import.showList) {
        addString(show);
      }
      for (final hide in import.hideList) {
        addString(hide);
      }
      collectStringsFromImport(import);
    }

    printlog('[COLLECT] Exports: ${fileIR.exports.length}');
    for (final export in fileIR.exports) {
      addString(export.uri);
      addString(export.sourceLocation.file);
      for (final show in export.showList) {
        addString(show);
      }
      for (final hide in export.hideList) {
        addString(hide);
      }
    }

    printlog('[COLLECT] Functions: ${fileIR.functionDeclarations.length}');
    for (final func in fileIR.functionDeclarations) {
      collectStringsFromFunction(func);
    }

    printlog('[COLLECT] Variables: ${fileIR.variableDeclarations.length}');
    for (final variable in fileIR.variableDeclarations) {
      collectStringsFromVariable(variable);
    }

    // ✅ THIS MUST BE CALLED
    printlog('[COLLECT] Classes: ${fileIR.classDeclarations.length}');
    for (int i = 0; i < fileIR.classDeclarations.length; i++) {
      final cls = fileIR.classDeclarations[i];
      printlog('[COLLECT CLASS $i] ${cls.name} (id="${cls.id}")');
      collectStringsFromClass(cls);
    }

    printlog('[COLLECT] Issues: ${fileIR.analysisIssues.length}');
    collectStringsFromAnalysisIssues(fileIR);

    printlog('[COLLECT] ✅ String table size: ${stringTable.length}');
    if (_verbose) {
      debugPrintStringTable();
    }
  }

  // âœ… Core statement string collection - Parameter is nullable
  void collectStringsFromStatement(StatementIR? stmt) {
    if (stmt == null) return;

    if (stmt is ExpressionStmt) {
      collectStringsFromExpression(stmt.expression);
    } else if (stmt is VariableDeclarationStmt) {
      addString(stmt.name);
      if (stmt.type != null) {
        addString(stmt.type!.displayName());
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
      addString(stmt.loopVariable);
      if (stmt.loopVariableType != null) {
        addString(stmt.loopVariableType!.displayName());
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
          addString(catchClause.exceptionType!.displayName());
        }
        if (catchClause.exceptionParameter != null) {
          addString(catchClause.exceptionParameter!);
        }
        if (catchClause.stackTraceParameter != null) {
          addString(catchClause.stackTraceParameter!);
        }
        collectStringsFromStatement(catchClause.body);
      }
      collectStringsFromStatement(stmt.finallyBlock);
    } else if (stmt is ReturnStmt) {
      if (stmt.expression != null) {
        collectStringsFromExpression(stmt.expression);
      }
    } else if (stmt is ThrowStmt) {
      collectStringsFromExpression(stmt.exceptionExpression);
    } else if (stmt is BreakStmt) {
      if (stmt.label != null) {
        addString(stmt.label!);
      }
    } else if (stmt is ContinueStmt) {
      if (stmt.label != null) {
        addString(stmt.label!);
      }
    } else if (stmt is LabeledStatementIR) {
      addString(stmt.label);
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
    addString(stmt.sourceLocation.file);
  }

  void debugPrintStringTable() {
    print('\n=== STRING TABLE DEBUG ===');
    print('Total strings: ${stringTable.length}');
    for (int i = 0; i < stringTable.length; i++) {
      print('  [$i] "${stringTable[i]}"');
    }
    print('=== END STRING TABLE ===\n');
  }
}
