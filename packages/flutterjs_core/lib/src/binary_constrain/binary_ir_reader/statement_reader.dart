import 'package:flutterjs_core/flutterjs_core.dart';

mixin StatementReader {
  int readByte();
  int get _offset;
  ExpressionIR readExpression();
  VariableDecl readVariableDecl();
  int readUint32();
  SourceLocationIR readSourceLocation();
  TypeIR readType();
  String readStringRef();

  FunctionDecl readFunctionDecl();

  StatementIR readStatement() {
    final stmtType = readByte();

    switch (stmtType) {
      case BinaryConstants.STMT_EXPRESSION:
        return readExpressionStatement();
      case BinaryConstants.STMT_VAR_DECL:
        return _readVariableDeclarationStatement();
      case BinaryConstants.STMT_RETURN:
        return _readReturnStatement();
      case BinaryConstants.STMT_BREAK:
        return _readBreakStatement();
      case BinaryConstants.STMT_CONTINUE:
        return _readContinueStatement();
      case BinaryConstants.STMT_THROW:
        return _readThrowStatement();
      case BinaryConstants.STMT_ASSERT:
        return _readAssertStatement();
      case BinaryConstants.STMT_EMPTY:
        return _readEmptyStatement();
      case BinaryConstants.STMT_BLOCK:
        return _readBlockStatement();
      case BinaryConstants.STMT_IF:
        return _readIfStatement();
      case BinaryConstants.STMT_FOR:
        return _readForStatement();
      case BinaryConstants.STMT_FOR_EACH:
        return _readForEachStatement();
      case BinaryConstants.STMT_WHILE:
        return _readWhileStatement();
      case BinaryConstants.STMT_DO_WHILE:
        return _readDoWhileStatement();
      case BinaryConstants.STMT_SWITCH:
        return _readSwitchStatement();
      case BinaryConstants.STMT_TRY:
        return _readTryStatement();
      case BinaryConstants.STMT_LABELED:
        return _readLabeledStatement();
      case BinaryConstants.STMT_YIELD:
        return _readYieldStatement();
      case BinaryConstants.STMT_FUNCTION_DECL:
        return _readFunctionDeclarationStatement();
      default:
        throw SerializationException(
          'Unknown statement type: 0x${stmtType.toRadixString(16)}',
          offset: _offset - 1,
        );
    }
  }

  // --- Simple Statements ---

  ExpressionStmt readExpressionStatement() {
    final expression = readExpression();
    final sourceLocation = readSourceLocation();
    return ExpressionStmt(
      id: 'stmt_expr',
      expression: expression,
      sourceLocation: sourceLocation,
    );
  }

  VariableDeclarationStmt _readVariableDeclarationStatement() {
    final varCount = readUint32();
    final sourceLocation = readSourceLocation();
    final resultType = readType();
    // If multiple variables, just use the first one
    // (or you could return a BlockStmt with multiple VariableDeclarationStmt)
    if (varCount == 0) {
      return VariableDeclarationStmt(
        id: 'stmt_var_decl',
        name: '<empty>',
        resultType: resultType,
        sourceLocation: sourceLocation,
      );
    }

    final firstVar = readVariableDecl();

    // Read remaining variables (if any)
    for (int i = 1; i < varCount; i++) {
      readVariableDecl(); // Skip or handle separately
    }

    return VariableDeclarationStmt(
      id: 'stmt_var_decl',
      name: firstVar.name,
      type: firstVar.type,
      resultType: resultType,
      initializer: firstVar.initializer,
      isFinal: firstVar.isFinal,
      isConst: firstVar.isConst,
      isLate: firstVar.isLate,
      sourceLocation: sourceLocation,
    );
  }

  ReturnStmt _readReturnStatement() {
    final hasValue = readByte() != 0;
    ExpressionIR? value;
    if (hasValue) {
      value = readExpression();
    }
    final sourceLocation = readSourceLocation();
    return ReturnStmt(
      id: 'stmt_return',
      expression: value,
      sourceLocation: sourceLocation,
    );
  }

  BreakStmt _readBreakStatement() {
    final hasLabel = readByte() != 0;
    final label = hasLabel ? readStringRef() : null;
    final sourceLocation = readSourceLocation();
    return BreakStmt(
      id: 'stmt_break',
      label: label,
      sourceLocation: sourceLocation,
    );
  }

  ContinueStmt _readContinueStatement() {
    final hasLabel = readByte() != 0;
    final label = hasLabel ? readStringRef() : null;
    final sourceLocation = readSourceLocation();
    return ContinueStmt(
      id: 'stmt_continue',
      label: label,
      sourceLocation: sourceLocation,
    );
  }

  ThrowStmt _readThrowStatement() {
    final exception = readExpression();
    final sourceLocation = readSourceLocation();
    return ThrowStmt(
      id: 'stmt_throw',
      // exception: exception,
      exceptionExpression: exception,

      sourceLocation: sourceLocation,
    );
  }

  AssertStatementIR _readAssertStatement() {
    final condition = readExpression();
    final hasMessage = readByte() != 0;
    ExpressionIR? message;
    if (hasMessage) {
      message = readExpression();
    }
    final sourceLocation = readSourceLocation();
    return AssertStatementIR(
      id: 'stmt_assert',
      condition: condition,
      message: message,
      sourceLocation: sourceLocation,
    );
  }

  EmptyStatementIR _readEmptyStatement() {
    final sourceLocation = readSourceLocation();
    return EmptyStatementIR(id: 'stmt_empty', sourceLocation: sourceLocation);
  }

  // --- Compound Statements ---

  BlockStmt _readBlockStatement() {
    final stmtCount = readUint32();
    final statements = <StatementIR>[];
    for (int i = 0; i < stmtCount; i++) {
      statements.add(readStatement());
    }
    final sourceLocation = readSourceLocation();
    return BlockStmt(
      id: 'stmt_block',
      statements: statements,
      sourceLocation: sourceLocation,
    );
  }

  IfStmt _readIfStatement() {
    final condition = readExpression();
    final thenBranch = readStatement();
    final hasElse = readByte() != 0;
    StatementIR? elseBranch;
    if (hasElse) {
      elseBranch = readStatement();
    }
    final sourceLocation = readSourceLocation();
    return IfStmt(
      id: 'stmt_if',
      condition: condition,
      thenBranch: thenBranch,
      elseBranch: elseBranch,
      sourceLocation: sourceLocation,
    );
  }

  ForStmt _readForStatement() {
    dynamic init;
    final hasInit = readByte() != 0;
    if (hasInit) {
      final initType = readByte();
      if (initType == 0) {
        init = _readVariableDeclarationStatement();
      } else {
        init = readExpression();
      }
    }

    final hasCondition = readByte() != 0;
    ExpressionIR? condition;
    if (hasCondition) {
      condition = readExpression();
    }

    final updateCount = readUint32();
    final updates = <ExpressionIR>[];
    for (int i = 0; i < updateCount; i++) {
      updates.add(readExpression());
    }

    final body = readStatement();
    final sourceLocation = readSourceLocation();

    return ForStmt(
      id: 'stmt_for',

      initialization: init,
      condition: condition,

      updaters: updates,
      body: body,
      sourceLocation: sourceLocation,
    );
  }

  ForEachStmt _readForEachStatement() {
    final variable = readStringRef();

    final hasLoopVariableType = readByte() != 0;
    TypeIR? loopVariableType;
    if (hasLoopVariableType) {
      loopVariableType = readType();
    }

    final iterable = readExpression();
    final body = readStatement();
    final isAsync = readByte() != 0;
    final sourceLocation = readSourceLocation();

    return ForEachStmt(
      id: 'stmt_for_each',
      loopVariable: variable,
      loopVariableType: loopVariableType,
      iterable: iterable,
      body: body,
      isAsync: isAsync,
      sourceLocation: sourceLocation,
    );
  }

  WhileStmt _readWhileStatement() {
    final condition = readExpression();
    final body = readStatement();
    final sourceLocation = readSourceLocation();

    return WhileStmt(
      id: 'stmt_while',
      condition: condition,
      body: body,
      sourceLocation: sourceLocation,
    );
  }

  DoWhileStmt _readDoWhileStatement() {
    final body = readStatement();
    final condition = readExpression();
    final sourceLocation = readSourceLocation();

    return DoWhileStmt(
      id: 'stmt_do_while',
      body: body,
      condition: condition,
      sourceLocation: sourceLocation,
    );
  }

  SwitchStmt _readSwitchStatement() {
    final expression = readExpression();
    final caseCount = readUint32();
    final cases = <SwitchCaseStmt>[];
    for (int i = 0; i < caseCount; i++) {
      cases.add(_readSwitchCase());
    }

    final hasDefault = readByte() != 0;
    SwitchCaseStmt? defaultCase;
    if (hasDefault) {
      final stmtCount = readUint32();
      final statements = <StatementIR>[];
      for (int i = 0; i < stmtCount; i++) {
        statements.add(readStatement());
      }
      defaultCase = SwitchCaseStmt(
        id: 'stmt_switch_default',
        sourceLocation: readSourceLocation(),
        patterns: null,
        statements: statements,
        isDefault: true,
      );
    }

    final sourceLocation = readSourceLocation();

    return SwitchStmt(
      id: 'stmt_switch',
      expression: expression,
      cases: cases,
      defaultCase: defaultCase,
      sourceLocation: sourceLocation,
    );
  }

  SwitchCaseStmt _readSwitchCase() {
    final labelCount = readUint32();
    final sourceLocation = readSourceLocation();
    final labels = <ExpressionIR>[];
    for (int i = 0; i < labelCount; i++) {
      labels.add(readExpression());
    }

    final stmtCount = readUint32();
    final statements = <StatementIR>[];
    for (int i = 0; i < stmtCount; i++) {
      statements.add(readStatement());
    }

    return SwitchCaseStmt(
      id: 'stmt_switch_case',
      sourceLocation: sourceLocation,
      patterns: labels,
      statements: statements,
    );
  }

  TryStmt _readTryStatement() {
    final tryBlock = readStatement();

    final catchCount = readUint32();
    final catchClauses = <CatchClauseStmt>[];
    for (int i = 0; i < catchCount; i++) {
      catchClauses.add(_readCatchClause());
    }

    final hasFinally = readByte() != 0;
    StatementIR? finallyBlock;
    if (hasFinally) {
      finallyBlock = readStatement();
    }

    final sourceLocation = readSourceLocation();

    return TryStmt(
      id: 'stmt_try',
      tryBlock: tryBlock,
      catchClauses: catchClauses,
      finallyBlock: finallyBlock,
      sourceLocation: sourceLocation,
    );
  }

  CatchClauseStmt _readCatchClause() {
    final exceptionType = readType();

    final hasExceptionVar = readByte() != 0;
    final exceptionVariable = hasExceptionVar ? readStringRef() : null;

    final hasStackTraceVar = readByte() != 0;
    final stackTraceVariable = hasStackTraceVar ? readStringRef() : null;
    final sourceLocation = readSourceLocation();
    final body = readStatement();

    return CatchClauseStmt(
      id: "stmt_catch_clause",
      exceptionType: exceptionType,

      sourceLocation: sourceLocation,
      exceptionParameter: exceptionVariable,
      stackTraceParameter: stackTraceVariable,
      body: body,
    );
  }

  LabeledStatementIR _readLabeledStatement() {
    final label = readStringRef();
    final statement = readStatement();
    final sourceLocation = readSourceLocation();

    return LabeledStatementIR(
      id: 'stmt_labeled',
      label: label,
      statement: statement,
      sourceLocation: sourceLocation,
    );
  }

  YieldStatementIR _readYieldStatement() {
    final value = readExpression();
    final isYieldEach = readByte() != 0;
    final sourceLocation = readSourceLocation();

    return YieldStatementIR(
      id: 'stmt_yield',
      value: value,
      isYieldEach: isYieldEach,
      sourceLocation: sourceLocation,
    );
  }

  FunctionDeclarationStatementIR _readFunctionDeclarationStatement() {
    final function = readFunctionDecl();
    final sourceLocation = readSourceLocation();

    return FunctionDeclarationStatementIR(
      id: 'stmt_func_decl',
      function: function,
      sourceLocation: sourceLocation,
    );
  }
}
