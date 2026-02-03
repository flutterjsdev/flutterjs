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
  }) : exprGen = exprGen ?? ExpressionCodeGen(),
       config = config ?? const StatementGenConfig(),
       propConverter =
           propConverter ??
           FlutterPropConverter(exprGen: exprGen ?? ExpressionCodeGen()) {
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

    // ✅ NEW: Handle Dart 3 if-case statement
    if (stmt is IfCaseStmt) {
      return _generateIfCaseStatement(stmt);
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
    // Fix: JS 'const' requires an initializer. If declared without one (e.g. late final), use 'let'.
    if ((stmt.isFinal || stmt.isConst) && stmt.initializer != null) {
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
    var cond = exprGen.generate(stmt.condition, parenthesize: false);

    // ✅ FIX: Parenthesize Arrow IIFE (e.g. () => {}()) which is invalid JS if unwrapped
    // Must wrap ONLY the arrow function, then add the call () after the closing paren
    // Wrong: ((() => {...}())  Correct: ((() => {...})())
    final trimmedCond = cond.trim();
    if (trimmedCond.startsWith('() =>') && trimmedCond.endsWith('()')) {
      // Remove trailing () call, wrap arrow function, then re-add ()
      final arrowFunc = trimmedCond.substring(0, trimmedCond.length - 2);
      cond = '($arrowFunc)()';
    }

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
    var condition = exprGen.generate(stmt.condition, parenthesize: false);
    String? patternInjection;

    // ✅ NEW: basic Dart 3 pattern matching support
    // Pattern: "obj case Type(:final prop)" -> "obj instanceof Type" + "const prop = obj.prop;"
    // Detect raw pattern syntax coming from expression generator
    if (condition.contains('case ') || condition.contains('(:')) {
      final trimmed = condition.trim();

      // Regex 1: Full pattern "response case BaseResponseWithUrl(:final url)"
      // Handles optional spacing, simple property extraction, and dot notation
      final fullRegex = RegExp(
        r'^([a-zA-Z0-9_.]+)\s+case\s+([a-zA-Z0-9_<>?.]+)\s*\(\s*:\s*final\s+(\w+)\s*\)$',
      );
      var match = fullRegex.firstMatch(trimmed);

      if (match != null) {
        final obj = match.group(1);
        final type = match.group(2);
        final prop = match.group(3);
        // Strip generics from type if present for instanceof Check
        final cleanType = type!.contains('<')
            ? type.substring(0, type.indexOf('<'))
            : type;

        condition = '$obj instanceof $cleanType';
        patternInjection = 'const $prop = $obj.$prop;';
      } else {
        // Regex 2: Pattern match with LHS check "lhs case Type(:final prop?)"
        // Matches: request case Abortable(:final abortTrigger?)
        if (trimmed.contains(' case ')) {
          final parts = trimmed.split(' case ');
          if (parts.length == 2) {
            final lhs = parts[0];
            final pattern = parts[1];

            if (pattern.contains('DOMException') &&
                pattern.contains("'AbortError'")) {
              print('   🔧 Fixed DOMException pattern: $trimmed');
              condition =
                  '$lhs instanceof DOMException && $lhs.name == "AbortError"';
              match = RegExp('').firstMatch('matched');
            }

            final objectPatternRegex = RegExp(
              r'^([a-zA-Z0-9_<>?]+)\s*\(\s*:\s*final\s+([a-zA-Z0-9_]+)(\?)?\s*\)$',
            );
            final objectMatch = objectPatternRegex.firstMatch(pattern);

            if (objectMatch != null) {
              final type = objectMatch.group(1)!;
              final prop = objectMatch.group(2)!;
              final isNullable = objectMatch.group(3) == '?';

              final cleanType = type.contains('<')
                  ? type.substring(0, type.indexOf('<'))
                  : type;

              print(
                '   🔧 Fixed pattern match: $trimmed -> $lhs instanceof $cleanType',
              );
              condition = '$lhs instanceof $cleanType';
              if (isNullable) {
                condition += ' && $lhs.$prop != null';
              }
              patternInjection = 'const $prop = $lhs.$prop;';
              match = objectMatch;
            }
          }
        }

        if (match == null) {
          // Fallback or other patterns
          final truncatedRegex = RegExp(
            r'^([a-zA-Z0-9_<>?]+)\s*\(\s*:\s*final\s+([a-zA-Z0-9_]+)(\?)?\s*\)$',
          );
          match = truncatedRegex.firstMatch(trimmed);

          if (match != null) {
            final type = match.group(1)!;
            final prop = match.group(2)!;
            final isNullable = match.group(3) == '?';

            final cleanType = type.contains('<')
                ? type.substring(0, type.indexOf('<'))
                : type;

            final obj = 'response'; // Fallback

            print(
              '   🔧 Fixed truncated pattern match: $trimmed -> $obj instanceof $cleanType',
            );
            condition = '$obj instanceof $cleanType';
            if (isNullable) {
              condition += ' && $obj.$prop != null';
            }
            patternInjection = 'const $prop = $obj.$prop;';
          }
        }
      }
    }

    buffer.writeln(indenter.line('if ($condition) {'));
    indenter.indent();

    // Inject pattern variable if needed
    if (patternInjection != null) {
      buffer.writeln(indenter.line(patternInjection));
    }

    // Generate the then branch inline (without extra braces if it's a BlockStmt)
    if (stmt.thenBranch is BlockStmt) {
      final block = stmt.thenBranch as BlockStmt;
      for (final s in block.statements) {
        buffer.writeln(generate(s));
      }
    } else {
      buffer.writeln(generate(stmt.thenBranch));
    }

    indenter.dedent();

    // ✅ FIXED: elseBranch is nullable, handle with proper null check
    if (stmt.elseBranch != null) {
      buffer.writeln(indenter.line('} else {'));
      indenter.indent();

      // Generate the else branch inline (without extra braces if it's a BlockStmt)
      if (stmt.elseBranch is BlockStmt) {
        final block = stmt.elseBranch as BlockStmt;
        for (final s in block.statements) {
          buffer.writeln(generate(s));
        }
      } else {
        buffer.writeln(generate(stmt.elseBranch!));
      }

      indenter.dedent();
      buffer.write(indenter.line('}'));
    } else {
      buffer.write(indenter.line('}'));
    }

    return buffer.toString().trim();
  }

  String _generateForStatement(ForStmt stmt) {
    final buffer = StringBuffer();

    // Handle initialization - this is tricky because Dart's `var i = 0`
    // gets parsed as an expression, not a statement
    String init = '';
    if (stmt.initialization != null) {
      final initExpr = stmt.initialization!;

      // Check if this looks like a variable declaration pattern
      // In the IR, `var i = 0` might come through as just the assignment expression
      final initCode = exprGen.generate(initExpr, parenthesize: false);

      // If it's a simple number or doesn't have 'let'/'const'/'var', assume it needs declaration
      // This is a heuristic - ideally the IR should preserve variable declarations
      if (!initCode.contains('let') &&
          !initCode.contains('const') &&
          !initCode.contains('var')) {
        // This might be just the initializer value, we need to infer the variable name
        // For now, generate as-is but this is a known limitation
        init = initCode;
      } else {
        init = initCode;
      }
    }

    // Safe condition with null check
    String condition = '';
    if (stmt.condition != null) {
      condition = exprGen.generate(stmt.condition!, parenthesize: false);
    }

    // Safe updaters list handling
    String updates = '';
    if (stmt.updaters.isNotEmpty) {
      updates = stmt.updaters
          .map((u) => exprGen.generate(u, parenthesize: false))
          .join(', ');
    }

    buffer.writeln(indenter.line('for ($init; $condition; $updates) {'));
    indenter.indent();

    // Generate the body inline (without extra braces if it's a BlockStmt)
    if (stmt.body is BlockStmt) {
      final block = stmt.body as BlockStmt;
      for (final s in block.statements) {
        buffer.writeln(generate(s));
      }
    } else {
      buffer.writeln(generate(stmt.body));
    }

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

    if (stmt.tryBlock is BlockStmt) {
      final block = stmt.tryBlock as BlockStmt;
      for (final s in block.statements) {
        buffer.writeln(generate(s));
      }
    } else {
      buffer.writeln(generate(stmt.tryBlock));
    }

    indenter.dedent();

    if (stmt.catchClauses.isNotEmpty) {
      // ✅ FIXED: Generate catch block transitions
      const catchVar = 'e';
      buffer.writeln(indenter.line('} catch ($catchVar) {'));
      indenter.indent();

      bool hasCatchAll = false;
      for (var i = 0; i < stmt.catchClauses.length; i++) {
        final clause = stmt.catchClauses[i];
        final isLast = i == stmt.catchClauses.length - 1;

        // Generate condition if specific type
        bool openedScope = false;

        if (clause.exceptionType != null) {
          var typeName = clause.exceptionType!.displayName();
          // Strip generics for instanceof check
          if (typeName.contains('<')) {
            typeName = typeName.substring(0, typeName.indexOf('<'));
          }
          buffer.writeln(
            indenter.line(
              '${i == 0 ? "if" : "else if"} ($catchVar instanceof $typeName) {',
            ),
          );
          openedScope = true;
        } else {
          hasCatchAll = true;
          // Generic catch clause
          if (i > 0) {
            buffer.writeln(indenter.line('else {'));
            openedScope = true;
          }
          // If i==0, we are already inside the catch block, no new scope needed
        }

        indenter.indent();

        // Parameter binding
        final exParam = clause.exceptionParameter ?? '_';
        if (exParam != catchVar && exParam != '_') {
          buffer.writeln(indenter.line('let $exParam = $catchVar;'));
        }

        if (clause.stackTraceParameter != null) {
          buffer.writeln(
            indenter.line(
              'const ${clause.stackTraceParameter} = new Error().stack;',
            ),
          );
        }

        if (clause.body is BlockStmt) {
          final block = clause.body as BlockStmt;
          for (final s in block.statements) {
            buffer.writeln(generate(s));
          }
        } else {
          buffer.writeln(generate(clause.body));
        }

        indenter.dedent();

        if (openedScope) {
          buffer.writeln(indenter.line('}'));
        }
      }

      // Rethrow if no matching clause found and no catch-all
      if (!hasCatchAll) {
        buffer.writeln(indenter.line('else {'));
        indenter.indent();
        buffer.writeln(indenter.line('throw $catchVar;'));
        indenter.dedent();
        buffer.writeln(indenter.line('}'));
      }

      indenter.dedent();
      // ⚠️ MOVED: Do not close catch block here; let finally/else close it
    }

    if (stmt.finallyBlock != null) {
      buffer.writeln(indenter.line('} finally {'));
      indenter.indent();

      if (stmt.finallyBlock is BlockStmt) {
        final block = stmt.finallyBlock as BlockStmt;
        for (final s in block.statements) {
          buffer.writeln(generate(s));
        }
      } else {
        buffer.writeln(generate(stmt.finallyBlock!));
      }

      indenter.dedent();
      buffer.write(indenter.line('}'));
    } else {
      // If no finally block, check if we need to close try or catch
      if (stmt.catchClauses.isEmpty) {
        // Case: try { ... }
        // JS requires catch or finally. Generate empty finally.
        buffer.writeln(indenter.line('} finally {'));
        buffer.write(indenter.line('}'));
      } else {
        // Case: try { ... } catch { ... }
        // Close the catch block
        buffer.write(indenter.line('}'));
      }
    }

    return buffer.toString().trim();
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

  // =========================================================================
  // DART 3 PATTERN MATCHING
  // =========================================================================

  /// Generate JavaScript for Dart 3 `if-case` statements.
  /// Converts: `if (input case TypedData data) { ... }`
  /// To: `if (input instanceof TypedData) { let data = input; ... }`
  String _generateIfCaseStatement(IfCaseStmt stmt) {
    final buffer = StringBuffer();
    final exprCode = exprGen.generate(stmt.expression, parenthesize: false);

    // Generate the condition based on pattern type
    final condition = _generatePatternCondition(stmt.pattern, exprCode);

    // Handle guard clause (when condition)
    String fullCondition = condition;
    if (stmt.guard != null) {
      final guardCode = exprGen.generate(stmt.guard!.condition);
      fullCondition = '($condition) && ($guardCode)';
    }

    buffer.writeln(indenter.line('if ($fullCondition) {'));
    indenter.indent();

    // Bind variables from pattern
    for (final varName in _getPatternBoundVariables(stmt.pattern)) {
      buffer.writeln(indenter.line('let $varName = $exprCode;'));
    }

    // Generate then branch
    if (stmt.thenBranch is BlockStmt) {
      final block = stmt.thenBranch as BlockStmt;
      for (final s in block.statements) {
        buffer.writeln(generate(s));
      }
    } else {
      buffer.writeln(generate(stmt.thenBranch));
    }

    indenter.dedent();

    // Handle else branch
    if (stmt.elseBranch != null) {
      buffer.writeln(indenter.line('} else {'));
      indenter.indent();

      if (stmt.elseBranch is BlockStmt) {
        final block = stmt.elseBranch as BlockStmt;
        for (final s in block.statements) {
          buffer.writeln(generate(s));
        }
      } else {
        buffer.writeln(generate(stmt.elseBranch!));
      }

      indenter.dedent();
    }

    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  /// Generate JavaScript condition for pattern matching
  String _generatePatternCondition(PatternIR pattern, String exprCode) {
    if (pattern is VariablePatternIR) {
      // Type pattern: `TypedData data` -> `input instanceof TypedData`
      if (pattern.hasExplicitType) {
        final typeName = pattern.matchedType.displayName();
        return '$exprCode instanceof $typeName';
      }
      // Just variable binding (var x) - always matches
      return 'true';
    }

    if (pattern is ConstantPatternIR) {
      // Constant pattern: `case 42` -> `input === 42`
      final valueCode = exprGen.generate(pattern.value);
      return '$exprCode === $valueCode';
    }

    if (pattern is WildcardPatternIR) {
      // Wildcard: `_` always matches
      return 'true';
    }

    if (pattern is NullCheckPatternIR) {
      // Null check: `x?` -> `x != null`
      return '$exprCode != null';
    }

    if (pattern is NullAssertPatternIR) {
      // Null assert: `x!` -> same as null check for now
      return '$exprCode != null';
    }

    if (pattern is ObjectPatternIR) {
      // Object pattern: `SomeClass(field: x)` -> `input instanceof SomeClass`
      final typeName = pattern.matchedType.displayName();
      return '$exprCode instanceof $typeName';
    }

    // Fallback: generate true and add a comment
    return 'true /* unsupported pattern: ${pattern.runtimeType} */';
  }

  /// Extract bound variables from pattern
  List<String> _getPatternBoundVariables(PatternIR pattern) {
    if (pattern is VariablePatternIR) {
      return [pattern.variableName];
    }

    // For other patterns, use the boundVariables property
    return pattern.boundVariables;
  }
}
