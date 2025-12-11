// ============================================================================
// PHASE 2.2: STATEMENT CODE GENERATOR
// ============================================================================
// Converts all Dart statement IR types to JavaScript code
// Handles control flow, loops, exception handling, declarations
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/src/widget_generation/prop_conversion/flutter_prop_converters.dart';
import 'package:flutterjs_gen/src/utils/code_gen_error.dart';
import 'package:flutterjs_gen/src/utils/indenter.dart';
import '../expression/expression_code_generator.dart';

// ============================================================================
// CONFIGURATION & HELPERS
// ============================================================================

/// Configuration for statement code generation
class StatementGenConfig {
  /// Indentation string (2 or 4 spaces, tab)
  final String indent;

  /// Whether to use semicolons
  final bool useSemicolons;

  /// Whether to use 'const' for immutable collections
  final bool useConst;

  /// Maximum line width before wrapping (0 = no wrapping)
  final int lineWidth;

  const StatementGenConfig({
    this.indent = '  ',
    this.useSemicolons = true,
    this.useConst = true,
    this.lineWidth = 80,
  });
}

// ============================================================================
// STATEMENT ANALYSIS TYPES
// ============================================================================

/// Represents different statement block types for analysis
enum StatementBlockType {
  /// Empty or null block
  empty,

  /// Single statement block
  single,

  /// Multiple statements block
  multiple,

  /// Unknown type
  unknown,
}

// ============================================================================
// MAIN STATEMENT CODE GENERATOR
// ============================================================================

class StatementCodeGen {
  final StatementGenConfig config;
  final ExpressionCodeGen exprGen;
  late Indenter indenter;
  final List<CodeGenError> errors = [];
  final FlutterPropConverter propConverter;

  StatementCodeGen({
    StatementGenConfig? config,
    ExpressionCodeGen? exprGen,
    FlutterPropConverter? propConverter,
  }) : propConverter = propConverter ?? FlutterPropConverter(),
       config = config ?? const StatementGenConfig(),
       exprGen = exprGen ?? ExpressionCodeGen() {
    indenter = Indenter(this.config.indent);
  }

  /// Generate JavaScript code from a statement IR
  String generate(StatementIR stmt) {
    try {
      return _generateStatement(stmt);
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate statement: $e',
        expressionType: stmt.runtimeType.toString(),
        suggestion: 'Check if statement type is supported',
      );
      errors.add(error);
      rethrow;
    }
  }

  /// ✅ NEW: Generate with function context
  String generateWithContext(
    StatementIR stmt, {
    FunctionDecl? functionContext,
  }) {
    try {
      if (functionContext != null) {
        exprGen.setFunctionContext(functionContext);
      }
      return _generateStatement(stmt);
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate statement: $e',
        expressionType: stmt.runtimeType.toString(),
        suggestion: 'Check if statement type is supported',
      );
      errors.add(error);
      rethrow;
    } finally {
      exprGen.setFunctionContext(null);
    }
  }
  // =========================================================================
  // PRIVATE GENERATION METHODS
  // =========================================================================

  String _generateStatement(StatementIR stmt) {
    // Simple Statements (0x00 - 0x0F)
    if (stmt is ExpressionStmt) {
      return _generateExpressionStatement(stmt);
    }

    if (stmt is VariableDeclarationStmt) {
      return _generateVariableDeclaration(stmt);
    }

    if (stmt is ReturnStmt) {
      return _generateReturnStatement(stmt);
    }

    if (stmt is BreakStmt) {
      return _generateBreakStatement(stmt);
    }

    if (stmt is ContinueStmt) {
      return _generateContinueStatement(stmt);
    }

    if (stmt is ThrowStmt) {
      return _generateThrowStatement(stmt);
    }

    if (stmt is AssertStatementIR) {
      return _generateAssertStatement(stmt);
    }

    if (stmt is EmptyStatementIR) {
      return _generateEmptyStatement(stmt);
    }

    // Compound Statements (0x10 - 0x1F)
    if (stmt is BlockStmt) {
      return _generateBlockStatement(stmt);
    }

    if (stmt is IfStmt) {
      return _generateIfStatement(stmt);
    }

    if (stmt is ForStmt) {
      return _generateForStatement(stmt);
    }

    if (stmt is ForEachStmt) {
      return _generateForEachStatement(stmt);
    }

    if (stmt is WhileStmt) {
      return _generateWhileStatement(stmt);
    }

    if (stmt is DoWhileStmt) {
      return _generateDoWhileStatement(stmt);
    }

    if (stmt is SwitchStmt) {
      return _generateSwitchStatement(stmt);
    }

    if (stmt is TryStmt) {
      return _generateTryStatement(stmt);
    }

    if (stmt is LabeledStatementIR) {
      return _generateLabeledStatement(stmt);
    }

    if (stmt is YieldStatementIR) {
      return _generateYieldStatement(stmt);
    }

    if (stmt is FunctionDeclarationStatementIR) {
      return _generateFunctionDeclarationStatement(stmt);
    }

    // Fallback
    throw CodeGenError(
      message: 'Unsupported statement type: ${stmt.runtimeType}',
      suggestion: 'Check if this statement type is implemented',
    );
  }

  // =========================================================================
  // SIMPLE STATEMENTS (0x00 - 0x0F)
  // =========================================================================

  String _generateExpressionStatement(ExpressionStmt stmt) {
    final expr = exprGen.generate(stmt.expression, parenthesize: false);
    final semi = config.useSemicolons ? ';' : '';

    return indenter.line('$expr$semi');
  }

  String _generateVariableDeclaration(VariableDeclarationStmt stmt) {
    // Determine keyword
    String keyword = 'let';
    if (stmt.isFinal || stmt.isConst) {
      keyword = 'const';
    }

    // Build declaration
    String decl = '$keyword ${stmt.name}';

    if (stmt.initializer != null) {
      final result = propConverter.convertProperty(
        stmt.name,
        stmt.initializer!,
        stmt.type?.displayName(),
      );
      decl += ' = ${result.code}';
    }

    final semi = config.useSemicolons ? ';' : '';
    return indenter.line('$decl$semi');
  }

  String _generateReturnStatement(ReturnStmt stmt) {
    if (stmt.expression == null) {
      final semi = config.useSemicolons ? ';' : '';
      return indenter.line('return$semi');
    }

    final expr = exprGen.generate(stmt.expression!, parenthesize: false);
    final semi = config.useSemicolons ? ';' : '';

    return indenter.line('return $expr$semi');
  }

  String _generateBreakStatement(BreakStmt stmt) {
    if (stmt.label != null) {
      final semi = config.useSemicolons ? ';' : '';
      return indenter.line('break ${stmt.label}$semi');
    }

    final semi = config.useSemicolons ? ';' : '';
    return indenter.line('break$semi');
  }

  String _generateContinueStatement(ContinueStmt stmt) {
    if (stmt.label != null) {
      final semi = config.useSemicolons ? ';' : '';
      return indenter.line('continue ${stmt.label}$semi');
    }

    final semi = config.useSemicolons ? ';' : '';
    return indenter.line('continue$semi');
  }

  String _generateThrowStatement(ThrowStmt stmt) {
    final expr = exprGen.generate(
      stmt.exceptionExpression,
      parenthesize: false,
    );
    final semi = config.useSemicolons ? ';' : '';

    return indenter.line('throw $expr$semi');
  }

  String _generateAssertStatement(AssertStatementIR stmt) {
    final cond = exprGen.generate(stmt.condition, parenthesize: false);

    if (stmt.message != null) {
      final msg = exprGen.generate(stmt.message!, parenthesize: false);
      final semi = config.useSemicolons ? ';' : '';
      return indenter.line('console.assert($cond, $msg)$semi');
    }

    final semi = config.useSemicolons ? ';' : '';
    return indenter.line('console.assert($cond)$semi');
  }

  String _generateEmptyStatement(EmptyStatementIR stmt) {
    return indenter.line(';');
  }

  // =========================================================================
  // COMPOUND STATEMENTS (0x10 - 0x1F)
  // =========================================================================

  String _generateBlockStatement(BlockStmt stmt) {
    final buffer = StringBuffer();

    buffer.writeln(indenter.line('{'));
    indenter.indent();

    for (final s in stmt.statements) {
      buffer.writeln(generate(s));
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateIfStatement(IfStmt stmt) {
    final buffer = StringBuffer();
    final condition = exprGen.generate(stmt.condition, parenthesize: false);

    buffer.writeln(indenter.line('if ($condition) {'));
    indenter.indent();

    buffer.writeln(generate(stmt.thenBranch));

    indenter.dedent();

    // ✅ FIXED: elseBranch is nullable, handle with proper null check
    if (stmt.elseBranch != null) {
      buffer.writeln(indenter.line('} else {'));
      indenter.indent();

      buffer.writeln(generate(stmt.elseBranch!));

      indenter.dedent();
      buffer.write(indenter.line('}'));
    } else {
      buffer.write(indenter.line('}'));
    }

    return buffer.toString().trim();
  }

  String _generateForStatement(ForStmt stmt) {
    final buffer = StringBuffer();

    // ✅ NEW: Safe initialization handling
    String init = '';
    if (stmt.initialization != null) {
      if (stmt.initialization is VariableDeclarationStmt) {
        final decl = generate(stmt.initialization as StatementIR);
        init = decl.trim();
        if (init.endsWith(';')) {
          init = init.substring(0, init.length - 1);
        }
      } else if (stmt.initialization is ExpressionIR) {
        init = exprGen.generate(
          stmt.initialization as ExpressionIR,
          parenthesize: false,
        );
      }
    }

    // ✅ NEW: Safe condition with null check
    String condition = '';
    if (stmt.condition != null) {
      condition = exprGen.generate(stmt.condition!, parenthesize: false);
    }

    // ✅ NEW: Safe updaters list handling
    String updates = '';
    if (stmt.updaters.isNotEmpty) {
      updates = stmt.updaters
          .map((u) => exprGen.generate(u, parenthesize: false))
          .join(', ');
    }

    buffer.writeln(indenter.line('for ($init; $condition; $updates) {'));
    indenter.indent();
    buffer.writeln(generate(stmt.body));
    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateForEachStatement(ForEachStmt stmt) {
    final buffer = StringBuffer();
    final iterable = exprGen.generate(stmt.iterable, parenthesize: false);

    // ✅ FIXED: Proper async for-await handling
    if (stmt.isAsync) {
      buffer.writeln(
        indenter.line('for await (const ${stmt.loopVariable} of $iterable) {'),
      );
    } else {
      buffer.writeln(
        indenter.line('for (const ${stmt.loopVariable} of $iterable) {'),
      );
    }

    indenter.indent();
    buffer.writeln(generate(stmt.body));
    indenter.dedent();

    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateWhileStatement(WhileStmt stmt) {
    final buffer = StringBuffer();
    final condition = exprGen.generate(stmt.condition, parenthesize: false);

    buffer.writeln(indenter.line('while ($condition) {'));
    indenter.indent();

    buffer.writeln(generate(stmt.body));

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateDoWhileStatement(DoWhileStmt stmt) {
    final buffer = StringBuffer();
    final condition = exprGen.generate(stmt.condition, parenthesize: false);

    buffer.writeln(indenter.line('do {'));
    indenter.indent();

    buffer.writeln(generate(stmt.body));

    indenter.dedent();
    buffer.writeln(indenter.line('} while ($condition);'));

    return buffer.toString().trim();
  }

  String _generateSwitchStatement(SwitchStmt stmt) {
    final buffer = StringBuffer();
    final expr = exprGen.generate(stmt.expression, parenthesize: false);

    buffer.writeln(indenter.line('switch ($expr) {'));
    indenter.indent();

    // Generate cases
    for (final switchCase in stmt.cases) {
      _generateSwitchCase(buffer, switchCase);
    }

    // ✅ FIXED: Generate default case with proper null check
    if (stmt.defaultCase != null) {
      buffer.writeln(indenter.line('default:'));
      indenter.indent();

      for (final s in stmt.defaultCase!.statements) {
        buffer.writeln(generate(s));
      }

      indenter.dedent();
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  void _generateSwitchCase(StringBuffer buffer, SwitchCaseStmt switchCase) {
    // ✅ FIXED: Proper null check for patterns
    if (switchCase.patterns == null || switchCase.patterns!.isEmpty) {
      buffer.writeln(indenter.line('default:'));
    } else {
      for (final pattern in switchCase.patterns!) {
        final patternCode = exprGen.generate(pattern, parenthesize: false);
        buffer.writeln(indenter.line('case $patternCode:'));
      }
    }

    indenter.indent();

    for (final stmt in switchCase.statements) {
      buffer.writeln(generate(stmt));
    }

    // Add break if last statement is not already break/return
    if (switchCase.statements.isNotEmpty) {
      final lastStmt = switchCase.statements.last;
      if (lastStmt is! BreakStmt && lastStmt is! ReturnStmt) {
        buffer.writeln(indenter.line('break;'));
      }
    }

    indenter.dedent();
  }

  String _generateTryStatement(TryStmt stmt) {
    final buffer = StringBuffer();

    buffer.writeln(indenter.line('try {'));
    indenter.indent();

    buffer.writeln(generate(stmt.tryBlock));

    indenter.dedent();

    // ✅ FIXED: Generate catch clauses with proper handling
    for (final catchClause in stmt.catchClauses) {
      _generateCatchClause(buffer, catchClause);
    }

    // ✅ FIXED: Generate finally clause with proper null check
    if (stmt.finallyBlock != null) {
      buffer.writeln(indenter.line('} finally {'));
      indenter.indent();

      buffer.writeln(generate(stmt.finallyBlock!));

      indenter.dedent();
      buffer.write(indenter.line('}'));
    } else {
      buffer.write(indenter.line('}'));
    }

    return buffer.toString().trim();
  }

  void _generateCatchClause(StringBuffer buffer, CatchClauseStmt catchClause) {
    // ✅ NEW: Proper null checks for exception and stack trace parameters
    final exceptionParam = catchClause.exceptionParameter ?? 'e';
    final stackTraceParam = catchClause.stackTraceParameter;

    if (stackTraceParam != null) {
      buffer.writeln(indenter.line('} catch ($exceptionParam) {'));
      buffer.writeln(
        indenter.line('const $stackTraceParam = new Error().stack;'),
      );
    } else {
      buffer.writeln(indenter.line('} catch ($exceptionParam) {'));
    }

    indenter.indent();
    buffer.writeln(generate(catchClause.body));
    indenter.dedent();
  }

  String _generateLabeledStatement(LabeledStatementIR stmt) {
    final buffer = StringBuffer();

    buffer.writeln(indenter.line('${stmt.label}:'));
    buffer.write(generate(stmt.statement));

    return buffer.toString().trim();
  }

  String _generateYieldStatement(YieldStatementIR stmt) {
    final expr = exprGen.generate(stmt.value, parenthesize: false);

    // ✅ FIXED: Proper yield/yield* handling
    if (stmt.isYieldEach) {
      final semi = config.useSemicolons ? ';' : '';
      return indenter.line('yield* $expr$semi');
    } else {
      final semi = config.useSemicolons ? ';' : '';
      return indenter.line('yield $expr$semi');
    }
  }

  String _generateFunctionDeclarationStatement(
    FunctionDeclarationStatementIR stmt,
  ) {
    // This would delegate to FunctionCodeGen (Phase 2.3)
    // For now, return placeholder
    return indenter.line(
      '// TODO: Function declaration: ${stmt.function.name}',
    );
  }
}
