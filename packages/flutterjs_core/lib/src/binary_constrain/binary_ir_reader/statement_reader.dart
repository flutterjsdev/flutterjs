import 'package:flutterjs_core/flutterjs_core.dart';
/// ============================================================================
/// statement_reader.dart
/// Statement Reader — Reconstructs Executable Statements from Binary IR
/// ============================================================================
///
/// This module deserializes all **statement-level IR structures** from the
/// binary format produced by `statement_writer.dart`.
///
/// Statements represent **execution flow** within the FlutterJS IR:
/// - return statements  
/// - variable assignments  
/// - expression statements  
/// - if/else branches  
/// - block statements  
/// - loops (for / foreach / while)  
///
/// They form the procedural backbone of function bodies and widget logic.
///
///
/// # Purpose
///
/// Rebuilds the procedural execution tree of the IR so FlutterJS can:
/// - generate JavaScript equivalents  
/// - re-run validation  
/// - visualize control flow  
/// - analyze or optimize IR  
///
/// This file must fully mirror the encoding logic from the writer.
///
///
/// # Responsibilities
///
/// ## 1. Read Statement Tags
///
/// Each statement begins with a tag, allowing the reader to dispatch to the
/// correct decoding logic:
///
/// - `kStmtExpression`  
/// - `kStmtReturn`  
/// - `kStmtVarAssign`  
/// - `kStmtIf`  
/// - `kStmtBlock`  
/// - `kStmtFor`  
/// - `kStmtForEach`  
/// - `kStmtWhile`  
///
///
/// ## 2. Expression Statement
///
/// Reads a single expression:
///
/// ```dart
/// TAG_EXPRESSION_STATEMENT
///   [EXPRESSION]
/// ```
///
///
/// ## 3. Return Statement
///
/// ```dart
/// TAG_RETURN
///   [HAS_VALUE]
///     [EXPRESSION?]
/// ```
///
/// Allows both:
/// - `return;`  
/// - `return value;`  
///
///
/// ## 4. Variable Assignment
///
/// Reads:
/// - variable reference  
/// - operator tag  
/// - RHS expression  
///
/// Example:
/// ```dart
/// count = count + 1;
/// ```
///
///
/// ## 5. If / Else Statements
///
/// Structure:
/// ```dart
/// TAG_IF
///   [CONDITION]
///   [THEN_BLOCK]
///   [HAS_ELSE]
///     [ELSE_BLOCK?]
/// ```
///
///
/// ## 6. Block Statements
///
/// ```dart
/// TAG_BLOCK
///   [STATEMENT_COUNT]
///   [STATEMENTS...]
/// ```
///
/// Supports nested blocks recursively.
///
///
/// ## 7. For Loop
///
/// Recreates:
/// - initializer  
/// - condition  
/// - update expression  
/// - body  
///
/// ```dart
/// TAG_FOR
///   [INIT_STMT?]
///   [CONDITION_EXPR?]
///   [UPDATE_EXPR?]
///   [BODY_BLOCK]
/// ```
///
///
/// ## 8. ForEach Loop
///
/// Reads:
/// - loop variable declaration  
/// - iterable expression  
/// - loop body  
///
///
/// ## 9. While Loop
///
/// Reads:
/// - condition expression  
/// - body block  
///
///
/// ## 10. Recursive Reconstruction
///
/// Every branch, body, and nested block is processed recursively:
///
/// ```dart
/// Statement readStatement();
/// ```
///
/// allowing arbitrarily deep control flow structures.
///
///
/// # Example Usage
///
/// ```dart
/// final stmt = statementReader.readStatement();
/// ```
///
/// Called within:
/// - declaration_reader (for function bodies)  
/// - binary_ir_reader (global deserialization)  
///
///
/// # Error Handling
///
/// Throws when:
/// - encountering unknown statement tag  
/// - missing required child expression or body  
/// - malformed loop structure  
/// - invalid boolean flags  
///
///
/// # Notes
///
/// - Must match statement_writer.dart exactly, field by field.  
/// - Recursion depth can be large — guard against corrupted binaries.  
/// - Control-flow integrity is validated by `comprehensive_ir_validator.dart`.  
///
///
/// ============================================================================
///

mixin StatementReader {
  int readByte();

  ExpressionIR readExpression();
  VariableDecl readVariableDecl();
  int readUint32();
  SourceLocationIR readSourceLocation();
  TypeIR readType();
  String readStringRef();

  FunctionDecl readFunctionDecl();

  StatementIR readStatement();

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

  VariableDeclarationStmt readVariableDeclarationStatement() {
    // Match the write order from statement_writer.dart exactly
    final name = readStringRef(); // ✅ READ NAME, not varCount

    final hasType = readByte() != 0;
    TypeIR? type;
    if (hasType) {
      type = readType();
    }

    final hasInitializer = readByte() != 0;
    ExpressionIR? initializer;
    if (hasInitializer) {
      initializer = readExpression();
    }

    final isFinal = readByte() != 0;
    final isConst = readByte() != 0;
    final isLate = readByte() != 0;

    final sourceLocation = readSourceLocation();

    return VariableDeclarationStmt(
      id: 'stmt_var_decl',
      name: name,
      type: type,

      initializer: initializer,
      isFinal: isFinal,
      isConst: isConst,
      isLate: isLate,
      sourceLocation: sourceLocation,
    );
  }

  ReturnStmt readReturnStatement() {
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

  BreakStmt readBreakStatement() {
    final hasLabel = readByte() != 0;
    final label = hasLabel ? readStringRef() : null;
    final sourceLocation = readSourceLocation();
    return BreakStmt(
      id: 'stmt_break',
      label: label,
      sourceLocation: sourceLocation,
    );
  }

  ContinueStmt readContinueStatement() {
    final hasLabel = readByte() != 0;
    final label = hasLabel ? readStringRef() : null;
    final sourceLocation = readSourceLocation();
    return ContinueStmt(
      id: 'stmt_continue',
      label: label,
      sourceLocation: sourceLocation,
    );
  }

  ThrowStmt readThrowStatement() {
    final exception = readExpression();
    final sourceLocation = readSourceLocation();
    return ThrowStmt(
      id: 'stmt_throw',
      // exception: exception,
      exceptionExpression: exception,

      sourceLocation: sourceLocation,
    );
  }

  AssertStatementIR readAssertStatement() {
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

  EmptyStatementIR readEmptyStatement() {
    final sourceLocation = readSourceLocation();
    return EmptyStatementIR(id: 'stmt_empty', sourceLocation: sourceLocation);
  }

  // --- Compound Statements ---

  BlockStmt readBlockStatement() {
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

  IfStmt readIfStatement() {
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

  ForStmt readForStatement() {
    dynamic init;
    final hasInit = readByte() != 0;
    if (hasInit) {
      final initType = readByte();
      if (initType == 0) {
        init = readVariableDeclarationStatement();
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

  ForEachStmt readForEachStatement() {
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

  WhileStmt readWhileStatement() {
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

  DoWhileStmt readDoWhileStatement() {
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

  SwitchStmt readSwitchStatement() {
    final expression = readExpression();
    final caseCount = readUint32();
    final cases = <SwitchCaseStmt>[];
    for (int i = 0; i < caseCount; i++) {
      cases.add(readSwitchCase());
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

  SwitchCaseStmt readSwitchCase() {
    // The current code reads labelCount first, but writeStatement writes differently
    // Check what writeSwitchStatement does:

    // From statement_writer.dart:
    // writeSwitchCase writes: patterns/statements only
    // NOT a separate labelCount

    final isDefault = readByte() != 0;
    final hasPatterns = readByte() != 0;

    List<ExpressionIR>? patterns;
    if (hasPatterns) {
      final patternCount = readUint32();
      patterns = <ExpressionIR>[];
      for (int i = 0; i < patternCount; i++) {
        patterns.add(readExpression());
      }
    }

    final stmtCount = readUint32();
    final statements = <StatementIR>[];
    for (int i = 0; i < stmtCount; i++) {
      statements.add(readStatement());
    }

    final sourceLocation = readSourceLocation();

    return SwitchCaseStmt(
      id: 'stmt_switch_case',
      sourceLocation: sourceLocation,
      patterns: patterns,
      statements: statements,
      isDefault: isDefault,
    );
  }

  TryStmt readTryStatement() {
    final tryBlock = readStatement();

    final catchCount = readUint32();
    final catchClauses = <CatchClauseStmt>[];
    for (int i = 0; i < catchCount; i++) {
      catchClauses.add(readCatchClause());
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

  CatchClauseStmt readCatchClause() {
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

  LabeledStatementIR readLabeledStatement() {
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

  YieldStatementIR readYieldStatement() {
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

  FunctionDeclarationStatementIR readFunctionDeclarationStatement() {
    final function = readFunctionDecl();
    final sourceLocation = readSourceLocation();

    return FunctionDeclarationStatementIR(
      id: 'stmt_func_decl',
      function: function,
      sourceLocation: sourceLocation,
    );
  }
}
