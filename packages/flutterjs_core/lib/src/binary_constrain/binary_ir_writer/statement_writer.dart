import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';

mixin StatementWriter {
  void writeByte(int value);

  void writeUint32(int value);
  int _getStringRef(String str);
  void writeType(TypeIR type);
  void writeExpression(ExpressionIR expr);
  void writeSourceLocation(SourceLocationIR location);
  void writeFunctionDecl(FunctionDecl func);

  void printlog(String str);

  BytesBuilder get _buffer;

  void writeStatement(StatementIR stmt) {
    if (stmt is ExpressionStmt) {
      writeByte(BinaryConstants.STMT_EXPRESSION);
      writeExpressionStatement(stmt);
    } else if (stmt is VariableDeclarationStmt) {
      writeByte(BinaryConstants.STMT_VAR_DECL);
      _writeVariableDeclarationStatement(stmt);
    } else if (stmt is ReturnStmt) {
      writeByte(BinaryConstants.STMT_RETURN);
      _writeReturnStatement(stmt);
    } else if (stmt is BreakStmt) {
      writeByte(BinaryConstants.STMT_BREAK);
      _writeBreakStatement(stmt);
    } else if (stmt is ContinueStmt) {
      writeByte(BinaryConstants.STMT_CONTINUE);
      _writeContinueStatement(stmt);
    } else if (stmt is ThrowStmt) {
      writeByte(BinaryConstants.STMT_THROW);
      _writeThrowStatement(stmt);
    } else if (stmt is AssertStatementIR) {
      writeByte(BinaryConstants.STMT_ASSERT);
      _writeAssertStatement(stmt);
    } else if (stmt is EmptyStatementIR) {
      writeByte(BinaryConstants.STMT_EMPTY);
      _writeEmptyStatement(stmt);
    } else if (stmt is BlockStmt) {
      writeByte(BinaryConstants.STMT_BLOCK);
      _writeBlockStatement(stmt);
    } else if (stmt is IfStmt) {
      writeByte(BinaryConstants.STMT_IF);
      _writeIfStatement(stmt);
    } else if (stmt is ForStmt) {
      writeByte(BinaryConstants.STMT_FOR);
      _writeForStatement(stmt);
    } else if (stmt is ForEachStmt) {
      writeByte(BinaryConstants.STMT_FOR_EACH);
      _writeForEachStatement(stmt);
    } else if (stmt is WhileStmt) {
      writeByte(BinaryConstants.STMT_WHILE);
      _writeWhileStatement(stmt);
    } else if (stmt is DoWhileStmt) {
      writeByte(BinaryConstants.STMT_DO_WHILE);
      _writeDoWhileStatement(stmt);
    } else if (stmt is SwitchStmt) {
      writeByte(BinaryConstants.STMT_SWITCH);
      _writeSwitchStatement(stmt);
    } else if (stmt is TryStmt) {
      writeByte(BinaryConstants.STMT_TRY);
      _writeTryStatement(stmt);
    } else if (stmt is LabeledStatementIR) {
      writeByte(BinaryConstants.STMT_LABELED);
      _writeLabeledStatement(stmt);
    } else if (stmt is YieldStatementIR) {
      writeByte(BinaryConstants.STMT_YIELD);
      _writeYieldStatement(stmt);
    } else if (stmt is FunctionDeclarationStatementIR) {
      writeByte(BinaryConstants.STMT_FUNCTION_DECL);
      _writeFunctionDeclarationStatement(stmt);
    } else {
      writeByte(BinaryConstants.STMT_UNKNOWN);
    }
  }

  void writeExpressionStatement(ExpressionStmt stmt) {
    writeExpression(stmt.expression);
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeVariableDeclarationStatement(VariableDeclarationStmt stmt) {
    writeUint32(_getStringRef(stmt.name));
    writeByte(stmt.type != null ? 1 : 0);
    if (stmt.type != null) {
      writeType(stmt.type!);
    }
    writeByte(stmt.initializer != null ? 1 : 0);
    if (stmt.initializer != null) {
      writeExpression(stmt.initializer!);
    }
    writeByte(stmt.isFinal ? 1 : 0);
    writeByte(stmt.isConst ? 1 : 0);
    writeByte(stmt.isLate ? 1 : 0);
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeReturnStatement(ReturnStmt stmt) {
    writeByte(stmt.expression != null ? 1 : 0);
    if (stmt.expression != null) {
      writeExpression(stmt.expression!);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeBreakStatement(BreakStmt stmt) {
    writeByte(stmt.label != null ? 1 : 0);
    if (stmt.label != null) {
      writeUint32(_getStringRef(stmt.label!));
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeContinueStatement(ContinueStmt stmt) {
    writeByte(stmt.label != null ? 1 : 0);
    if (stmt.label != null) {
      writeUint32(_getStringRef(stmt.label!));
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeThrowStatement(ThrowStmt stmt) {
    writeExpression(stmt.exceptionExpression);
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeAssertStatement(AssertStatementIR stmt) {
    writeExpression(stmt.condition);
    writeByte(stmt.message != null ? 1 : 0);
    if (stmt.message != null) {
      writeExpression(stmt.message!);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeEmptyStatement(EmptyStatementIR stmt) {
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeBlockStatement(BlockStmt stmt) {
    writeUint32(stmt.statements.length);
    for (final s in stmt.statements) {
      writeStatement(s);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeIfStatement(IfStmt stmt) {
    writeExpression(stmt.condition);
    writeStatement(stmt.thenBranch);
    writeByte(stmt.elseBranch != null ? 1 : 0);
    if (stmt.elseBranch != null) {
      writeStatement(stmt.elseBranch!);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeForStatement(ForStmt stmt) {
    writeByte(stmt.initialization != null ? 1 : 0);
    if (stmt.initialization != null) {
      if (stmt.initialization is VariableDeclarationStmt) {
        writeByte(0);
        _writeVariableDeclarationStatement(
          stmt.initialization as VariableDeclarationStmt,
        );
      } else {
        writeByte(1);
        writeExpression(stmt.initialization as ExpressionIR);
      }
    }
    writeByte(stmt.condition != null ? 1 : 0);
    if (stmt.condition != null) {
      writeExpression(stmt.condition!);
    }
    writeUint32(stmt.updaters.length);
    for (final update in stmt.updaters) {
      writeExpression(update);
    }
    writeStatement(stmt.body);
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeForEachStatement(ForEachStmt stmt) {
    writeUint32(_getStringRef(stmt.loopVariable));
    writeByte(stmt.loopVariableType != null ? 1 : 0);
    if (stmt.loopVariableType != null) {
      writeType(stmt.loopVariableType!);
    }
    writeExpression(stmt.iterable);
    writeStatement(stmt.body);
    writeByte(stmt.isAsync ? 1 : 0);
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeWhileStatement(WhileStmt stmt) {
    writeExpression(stmt.condition);
    writeStatement(stmt.body);
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeDoWhileStatement(DoWhileStmt stmt) {
    writeStatement(stmt.body);
    writeExpression(stmt.condition);
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeSwitchStatement(SwitchStmt stmt) {
    writeExpression(stmt.expression);
    writeUint32(stmt.cases.length);
    for (final switchCase in stmt.cases) {
      _writeSwitchCase(switchCase);
    }
    writeByte(stmt.defaultCase != null ? 1 : 0);
    if (stmt.defaultCase != null) {
      writeUint32(stmt.defaultCase!.statements.length);
      for (final s in stmt.defaultCase!.statements) {
        writeStatement(s);
      }
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeSwitchCase(SwitchCaseStmt switchCase) {
    writeByte(switchCase.isDefault ? 1 : 0);
    writeByte(switchCase.patterns != null ? 1 : 0);
    if (switchCase.patterns != null) {
      writeUint32(switchCase.patterns!.length);
      for (final pattern in switchCase.patterns!) {
        writeExpression(pattern);
      }
    }
    writeUint32(switchCase.statements.length);
    for (final s in switchCase.statements) {
      writeStatement(s);
    }
  }

  void _writeTryStatement(TryStmt stmt) {
    writeStatement(stmt.tryBlock);
    writeUint32(stmt.catchClauses.length);
    for (final catchClause in stmt.catchClauses) {
      _writeCatchClause(catchClause);
    }
    writeByte(stmt.finallyBlock != null ? 1 : 0);
    if (stmt.finallyBlock != null) {
      writeStatement(stmt.finallyBlock!);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeCatchClause(CatchClauseStmt catchClause) {
    writeByte(catchClause.exceptionType != null ? 1 : 0);
    if (catchClause.exceptionType != null) {
      writeType(catchClause.exceptionType!);
    }
    writeByte(catchClause.exceptionParameter != null ? 1 : 0);
    if (catchClause.exceptionParameter != null) {
      writeUint32(_getStringRef(catchClause.exceptionParameter!));
    }
    writeByte(catchClause.stackTraceParameter != null ? 1 : 0);
    if (catchClause.stackTraceParameter != null) {
      writeUint32(_getStringRef(catchClause.stackTraceParameter!));
    }
    writeStatement(catchClause.body);
  }

  void _writeLabeledStatement(LabeledStatementIR stmt) {
    writeUint32(_getStringRef(stmt.label));
    writeStatement(stmt.statement);
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeYieldStatement(YieldStatementIR stmt) {
    writeExpression(stmt.value);
    writeByte(stmt.isYieldEach ? 1 : 0);
    writeSourceLocation(stmt.sourceLocation);
  }

  void _writeFunctionDeclarationStatement(FunctionDeclarationStatementIR stmt) {
    writeFunctionDecl(stmt.function);
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeImportStmt(ImportStmt import) {
    printlog('[WRITE IMPORT] START - buffer offset: ${_buffer.length}');

    writeUint32(_getStringRef(import.uri));
    printlog('[WRITE IMPORT] After uri: ${_buffer.length}');

    writeByte(import.prefix != null ? 1 : 0);
    printlog('[WRITE IMPORT] After prefix flag: ${_buffer.length}');

    if (import.prefix != null) {
      writeUint32(_getStringRef(import.prefix!));
      printlog('[WRITE IMPORT] After prefix value: ${_buffer.length}');
    }

    writeByte(import.isDeferred ? 1 : 0);
    printlog('[WRITE IMPORT] After deferred: ${_buffer.length}');

    writeUint32(import.showList.length);
    printlog('[WRITE IMPORT] After showCount: ${_buffer.length}');

    for (final show in import.showList) {
      writeUint32(_getStringRef(show));
    }
    printlog('[WRITE IMPORT] After showList: ${_buffer.length}');

    writeUint32(import.hideList.length);
    printlog('[WRITE IMPORT] After hideCount: ${_buffer.length}');

    for (final hide in import.hideList) {
      writeUint32(_getStringRef(hide));
    }
    printlog('[WRITE IMPORT] After hideList: ${_buffer.length}');

    writeSourceLocation(import.sourceLocation);
    printlog('[WRITE IMPORT] After sourceLocation: ${_buffer.length}');
    printlog('[WRITE IMPORT] END - total bytes written: ${_buffer.length}');
  }

  void writeExportStmt(ExportStmt export) {
    printlog('[WRITE EXPORT] START - buffer offset: ${_buffer.length}');

    writeUint32(_getStringRef(export.uri));
    printlog('[WRITE EXPORT] After uri: ${_buffer.length}');

    writeUint32(export.showList.length);
    printlog('[WRITE EXPORT] After showCount: ${_buffer.length}');

    for (final show in export.showList) {
      writeUint32(_getStringRef(show));
    }
    printlog('[WRITE EXPORT] After showList: ${_buffer.length}');

    writeUint32(export.hideList.length);
    printlog('[WRITE EXPORT] After hideCount: ${_buffer.length}');

    for (final hide in export.hideList) {
      writeUint32(_getStringRef(hide));
    }
    printlog('[WRITE EXPORT] After hideList: ${_buffer.length}');

    writeSourceLocation(export.sourceLocation);
    printlog('[WRITE EXPORT] After sourceLocation: ${_buffer.length}');
    printlog('[WRITE EXPORT] END');
  }
}
