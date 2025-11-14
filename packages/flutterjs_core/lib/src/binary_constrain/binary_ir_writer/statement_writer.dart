import 'package:flutterjs_core/flutterjs_core.dart';

mixin StatementWriter {
  void _writeByte(int value);
 
  void _writeUint32(int value);
  int _getStringRef(String str);
  void writeType(TypeIR type);
   void writeExpression(ExpressionIR expr);
    void _writeSourceLocation(SourceLocationIR location);
    void writeFunctionDecl(FunctionDecl func);

  void writeStatement(StatementIR stmt) {
    if (stmt is ExpressionStmt) {
      _writeByte(BinaryConstants.STMT_EXPRESSION);
      writeExpressionStatement(stmt);
    } else if (stmt is VariableDeclarationStmt) {
      _writeByte(BinaryConstants.STMT_VAR_DECL);
      _writeVariableDeclarationStatement(stmt);
    } else if (stmt is ReturnStmt) {
      _writeByte(BinaryConstants.STMT_RETURN);
      _writeReturnStatement(stmt);
    } else if (stmt is BreakStmt) {
      _writeByte(BinaryConstants.STMT_BREAK);
      _writeBreakStatement(stmt);
    } else if (stmt is ContinueStmt) {
      _writeByte(BinaryConstants.STMT_CONTINUE);
      _writeContinueStatement(stmt);
    } else if (stmt is ThrowStmt) {
      _writeByte(BinaryConstants.STMT_THROW);
      _writeThrowStatement(stmt);
    } else if (stmt is AssertStatementIR) {
      _writeByte(BinaryConstants.STMT_ASSERT);
      _writeAssertStatement(stmt);
    } else if (stmt is EmptyStatementIR) {
      _writeByte(BinaryConstants.STMT_EMPTY);
      _writeEmptyStatement(stmt);
    } else if (stmt is BlockStmt) {
      _writeByte(BinaryConstants.STMT_BLOCK);
      _writeBlockStatement(stmt);
    } else if (stmt is IfStmt) {
      _writeByte(BinaryConstants.STMT_IF);
      _writeIfStatement(stmt);
    } else if (stmt is ForStmt) {
      _writeByte(BinaryConstants.STMT_FOR);
      _writeForStatement(stmt);
    } else if (stmt is ForEachStmt) {
      _writeByte(BinaryConstants.STMT_FOR_EACH);
      _writeForEachStatement(stmt);
    } else if (stmt is WhileStmt) {
      _writeByte(BinaryConstants.STMT_WHILE);
      _writeWhileStatement(stmt);
    } else if (stmt is DoWhileStmt) {
      _writeByte(BinaryConstants.STMT_DO_WHILE);
      _writeDoWhileStatement(stmt);
    } else if (stmt is SwitchStmt) {
      _writeByte(BinaryConstants.STMT_SWITCH);
      _writeSwitchStatement(stmt);
    } else if (stmt is TryStmt) {
      _writeByte(BinaryConstants.STMT_TRY);
      _writeTryStatement(stmt);
    } else if (stmt is LabeledStatementIR) {
      _writeByte(BinaryConstants.STMT_LABELED);
      _writeLabeledStatement(stmt);
    } else if (stmt is YieldStatementIR) {
      _writeByte(BinaryConstants.STMT_YIELD);
      _writeYieldStatement(stmt);
    } else if (stmt is FunctionDeclarationStatementIR) {
      _writeByte(BinaryConstants.STMT_FUNCTION_DECL);
      _writeFunctionDeclarationStatement(stmt);
    } else {
      _writeByte(BinaryConstants.STMT_UNKNOWN);
    }
  }

  void writeExpressionStatement(ExpressionStmt stmt) {
    writeExpression(stmt.expression);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeVariableDeclarationStatement(VariableDeclarationStmt stmt) {
    _writeUint32(_getStringRef(stmt.name));
    _writeByte(stmt.type != null ? 1 : 0);
    if (stmt.type != null) {
      writeType(stmt.type!);
    }
    _writeByte(stmt.initializer != null ? 1 : 0);
    if (stmt.initializer != null) {
      writeExpression(stmt.initializer!);
    }
    _writeByte(stmt.isFinal ? 1 : 0);
    _writeByte(stmt.isConst ? 1 : 0);
    _writeByte(stmt.isLate ? 1 : 0);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeReturnStatement(ReturnStmt stmt) {
    _writeByte(stmt.expression != null ? 1 : 0);
    if (stmt.expression != null) {
      writeExpression(stmt.expression!);
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeBreakStatement(BreakStmt stmt) {
    _writeByte(stmt.label != null ? 1 : 0);
    if (stmt.label != null) {
      _writeUint32(_getStringRef(stmt.label!));
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeContinueStatement(ContinueStmt stmt) {
    _writeByte(stmt.label != null ? 1 : 0);
    if (stmt.label != null) {
      _writeUint32(_getStringRef(stmt.label!));
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeThrowStatement(ThrowStmt stmt) {
    writeExpression(stmt.exceptionExpression);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeAssertStatement(AssertStatementIR stmt) {
    writeExpression(stmt.condition);
    _writeByte(stmt.message != null ? 1 : 0);
    if (stmt.message != null) {
      writeExpression(stmt.message!);
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeEmptyStatement(EmptyStatementIR stmt) {
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeBlockStatement(BlockStmt stmt) {
    _writeUint32(stmt.statements.length);
    for (final s in stmt.statements) {
      writeStatement(s);
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeIfStatement(IfStmt stmt) {
    writeExpression(stmt.condition);
    writeStatement(stmt.thenBranch);
    _writeByte(stmt.elseBranch != null ? 1 : 0);
    if (stmt.elseBranch != null) {
      writeStatement(stmt.elseBranch!);
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeForStatement(ForStmt stmt) {
    _writeByte(stmt.initialization != null ? 1 : 0);
    if (stmt.initialization != null) {
      if (stmt.initialization is VariableDeclarationStmt) {
        _writeByte(0);
        _writeVariableDeclarationStatement(
          stmt.initialization as VariableDeclarationStmt,
        );
      } else {
        _writeByte(1);
        writeExpression(stmt.initialization as ExpressionIR);
      }
    }
    _writeByte(stmt.condition != null ? 1 : 0);
    if (stmt.condition != null) {
      writeExpression(stmt.condition!);
    }
    _writeUint32(stmt.updaters.length);
    for (final update in stmt.updaters) {
      writeExpression(update);
    }
    writeStatement(stmt.body);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeForEachStatement(ForEachStmt stmt) {
    _writeUint32(_getStringRef(stmt.loopVariable));
    _writeByte(stmt.loopVariableType != null ? 1 : 0);
    if (stmt.loopVariableType != null) {
      writeType(stmt.loopVariableType!);
    }
    writeExpression(stmt.iterable);
    writeStatement(stmt.body);
    _writeByte(stmt.isAsync ? 1 : 0);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeWhileStatement(WhileStmt stmt) {
    writeExpression(stmt.condition);
    writeStatement(stmt.body);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeDoWhileStatement(DoWhileStmt stmt) {
    writeStatement(stmt.body);
    writeExpression(stmt.condition);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeSwitchStatement(SwitchStmt stmt) {
    writeExpression(stmt.expression);
    _writeUint32(stmt.cases.length);
    for (final switchCase in stmt.cases) {
      _writeSwitchCase(switchCase);
    }
    _writeByte(stmt.defaultCase != null ? 1 : 0);
    if (stmt.defaultCase != null) {
      _writeUint32(stmt.defaultCase!.statements.length);
      for (final s in stmt.defaultCase!.statements) {
        writeStatement(s);
      }
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeSwitchCase(SwitchCaseStmt switchCase) {
    _writeByte(switchCase.isDefault ? 1 : 0);
    _writeByte(switchCase.patterns != null ? 1 : 0);
    if (switchCase.patterns != null) {
      _writeUint32(switchCase.patterns!.length);
      for (final pattern in switchCase.patterns!) {
        writeExpression(pattern);
      }
    }
    _writeUint32(switchCase.statements.length);
    for (final s in switchCase.statements) {
      writeStatement(s);
    }
  }

  void _writeTryStatement(TryStmt stmt) {
    writeStatement(stmt.tryBlock);
    _writeUint32(stmt.catchClauses.length);
    for (final catchClause in stmt.catchClauses) {
      _writeCatchClause(catchClause);
    }
    _writeByte(stmt.finallyBlock != null ? 1 : 0);
    if (stmt.finallyBlock != null) {
      writeStatement(stmt.finallyBlock!);
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeCatchClause(CatchClauseStmt catchClause) {
    _writeByte(catchClause.exceptionType != null ? 1 : 0);
    if (catchClause.exceptionType != null) {
      writeType(catchClause.exceptionType!);
    }
    _writeByte(catchClause.exceptionParameter != null ? 1 : 0);
    if (catchClause.exceptionParameter != null) {
      _writeUint32(_getStringRef(catchClause.exceptionParameter!));
    }
    _writeByte(catchClause.stackTraceParameter != null ? 1 : 0);
    if (catchClause.stackTraceParameter != null) {
      _writeUint32(_getStringRef(catchClause.stackTraceParameter!));
    }
    writeStatement(catchClause.body);
  }

  void _writeLabeledStatement(LabeledStatementIR stmt) {
    _writeUint32(_getStringRef(stmt.label));
    writeStatement(stmt.statement);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeYieldStatement(YieldStatementIR stmt) {
    writeExpression(stmt.value);
    _writeByte(stmt.isYieldEach ? 1 : 0);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeFunctionDeclarationStatement(FunctionDeclarationStatementIR stmt) {
    writeFunctionDecl(stmt.function);
    _writeSourceLocation(stmt.sourceLocation);
  }
}
