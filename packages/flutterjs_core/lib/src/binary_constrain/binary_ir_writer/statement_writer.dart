import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';

mixin StatementWriter {
  void writeByte(int value);

  void writeUint32(int value);
  int getStringRef(String str);
  void writeType(TypeIR type);
  void writeExpression(ExpressionIR expr);
  void writeSourceLocation(SourceLocationIR location);
  void writeFunctionDecl(FunctionDecl func);

  void printlog(String str);

  BytesBuilder get buffer;

  BytesBuilder get _buffer => buffer;

  void writeStatement(StatementIR stmt);

  void writeExpressionStatement(ExpressionStmt stmt) {
    writeExpression(stmt.expression);
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeVariableDeclarationStatement(VariableDeclarationStmt stmt) {
    writeUint32(getStringRef(stmt.name));
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

  void writeReturnStatement(ReturnStmt stmt) {
    writeByte(stmt.expression != null ? 1 : 0);
    if (stmt.expression != null) {
      writeExpression(stmt.expression!);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeBreakStatement(BreakStmt stmt) {
    writeByte(stmt.label != null ? 1 : 0);
    if (stmt.label != null) {
      writeUint32(getStringRef(stmt.label!));
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeContinueStatement(ContinueStmt stmt) {
    writeByte(stmt.label != null ? 1 : 0);
    if (stmt.label != null) {
      writeUint32(getStringRef(stmt.label!));
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeThrowStatement(ThrowStmt stmt) {
    writeExpression(stmt.exceptionExpression);
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeAssertStatement(AssertStatementIR stmt) {
    writeExpression(stmt.condition);
    writeByte(stmt.message != null ? 1 : 0);
    if (stmt.message != null) {
      writeExpression(stmt.message!);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeEmptyStatement(EmptyStatementIR stmt) {
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeBlockStatement(BlockStmt stmt) {
    writeUint32(stmt.statements.length);
    for (final s in stmt.statements) {
      writeStatement(s);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeIfStatement(IfStmt stmt) {
    writeExpression(stmt.condition);
    writeStatement(stmt.thenBranch);
    writeByte(stmt.elseBranch != null ? 1 : 0);
    if (stmt.elseBranch != null) {
      writeStatement(stmt.elseBranch!);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeForStatement(ForStmt stmt) {
    writeByte(stmt.initialization != null ? 1 : 0);
    if (stmt.initialization != null) {
      if (stmt.initialization is VariableDeclarationStmt) {
        writeByte(0);
        writeVariableDeclarationStatement(
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

  void writeForEachStatement(ForEachStmt stmt) {
    writeUint32(getStringRef(stmt.loopVariable));
    writeByte(stmt.loopVariableType != null ? 1 : 0);
    if (stmt.loopVariableType != null) {
      writeType(stmt.loopVariableType!);
    }
    writeExpression(stmt.iterable);
    writeStatement(stmt.body);
    writeByte(stmt.isAsync ? 1 : 0);
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeWhileStatement(WhileStmt stmt) {
    writeExpression(stmt.condition);
    writeStatement(stmt.body);
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeDoWhileStatement(DoWhileStmt stmt) {
    writeStatement(stmt.body);
    writeExpression(stmt.condition);
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeSwitchStatement(SwitchStmt stmt) {
    writeExpression(stmt.expression);
    writeUint32(stmt.cases.length);
    for (final switchCase in stmt.cases) {
      writeSwitchCase(switchCase);
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

  void writeSwitchCase(SwitchCaseStmt switchCase) {
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

  void writeTryStatement(TryStmt stmt) {
    writeStatement(stmt.tryBlock);
    writeUint32(stmt.catchClauses.length);
    for (final catchClause in stmt.catchClauses) {
      writeCatchClause(catchClause);
    }
    writeByte(stmt.finallyBlock != null ? 1 : 0);
    if (stmt.finallyBlock != null) {
      writeStatement(stmt.finallyBlock!);
    }
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeCatchClause(CatchClauseStmt catchClause) {
    writeByte(catchClause.exceptionType != null ? 1 : 0);
    if (catchClause.exceptionType != null) {
      writeType(catchClause.exceptionType!);
    }
    writeByte(catchClause.exceptionParameter != null ? 1 : 0);
    if (catchClause.exceptionParameter != null) {
      writeUint32(getStringRef(catchClause.exceptionParameter!));
    }
    writeByte(catchClause.stackTraceParameter != null ? 1 : 0);
    if (catchClause.stackTraceParameter != null) {
      writeUint32(getStringRef(catchClause.stackTraceParameter!));
    }
    writeStatement(catchClause.body);
  }

  void writeLabeledStatement(LabeledStatementIR stmt) {
    writeUint32(getStringRef(stmt.label));
    writeStatement(stmt.statement);
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeYieldStatement(YieldStatementIR stmt) {
    writeExpression(stmt.value);
    writeByte(stmt.isYieldEach ? 1 : 0);
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeFunctionDeclarationStatement(FunctionDeclarationStatementIR stmt) {
    writeFunctionDecl(stmt.function);
    writeSourceLocation(stmt.sourceLocation);
  }

  void writeImportStmt(ImportStmt import) {
    printlog('[WRITE IMPORT] START - buffer offset: ${buffer.length}');

    writeUint32(getStringRef(import.uri));
    printlog('[WRITE IMPORT] After uri: ${buffer.length}');

    writeByte(import.prefix != null ? 1 : 0);
    printlog('[WRITE IMPORT] After prefix flag: ${buffer.length}');

    if (import.prefix != null) {
      writeUint32(getStringRef(import.prefix!));
      printlog('[WRITE IMPORT] After prefix value: ${buffer.length}');
    }

    writeByte(import.isDeferred ? 1 : 0);
    printlog('[WRITE IMPORT] After deferred: ${buffer.length}');

    writeUint32(import.showList.length);
    printlog('[WRITE IMPORT] After showCount: ${buffer.length}');

    for (final show in import.showList) {
      writeUint32(getStringRef(show));
    }
    printlog('[WRITE IMPORT] After showList: ${buffer.length}');

    writeUint32(import.hideList.length);
    printlog('[WRITE IMPORT] After hideCount: ${buffer.length}');

    for (final hide in import.hideList) {
      writeUint32(getStringRef(hide));
    }
    printlog('[WRITE IMPORT] After hideList: ${buffer.length}');

    writeSourceLocation(import.sourceLocation);
    printlog('[WRITE IMPORT] After sourceLocation: ${buffer.length}');
    printlog('[WRITE IMPORT] END - total bytes written: ${buffer.length}');
  }

  void writeExportStmt(ExportStmt export) {
    printlog('[WRITE EXPORT] START - buffer offset: ${buffer.length}');

    writeUint32(getStringRef(export.uri));
    printlog('[WRITE EXPORT] After uri: ${buffer.length}');

    writeUint32(export.showList.length);
    printlog('[WRITE EXPORT] After showCount: ${buffer.length}');

    for (final show in export.showList) {
      writeUint32(getStringRef(show));
    }
    printlog('[WRITE EXPORT] After showList: ${buffer.length}');

    writeUint32(export.hideList.length);
    printlog('[WRITE EXPORT] After hideCount: ${buffer.length}');

    for (final hide in export.hideList) {
      writeUint32(getStringRef(hide));
    }
    printlog('[WRITE EXPORT] After hideList: ${buffer.length}');

    writeSourceLocation(export.sourceLocation);
    printlog('[WRITE EXPORT] After sourceLocation: ${buffer.length}');
    printlog('[WRITE EXPORT] END');
  }
}
