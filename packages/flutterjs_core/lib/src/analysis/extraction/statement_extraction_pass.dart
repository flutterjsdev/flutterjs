import 'package:analyzer/dart/ast/ast.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/ir/expressions/cascade_expression_ir.dart';

import '../visitors/analyzer_widget_detection_setup.dart';
import 'lambda_function_extractor.dart';

/// <---------------------------------------------------------------------------->
/// statement_extraction_pass.dart
/// ----------------------------------------------------------------------------
///
/// AST-to-IR converter for Dart statements and expressions in a Flutter analyzer.
///
/// This pass extracts executable code (bodies of methods/functions/constructors)
/// into a structured IR ([StatementIR], [ExpressionIR]) for further analysis.
/// It handles all major statement types (blocks, ifs, loops, switches, etc.)
/// and expressions (literals, binaries, calls, cascades, etc.).
///
/// Core class: [StatementExtractionPass] – traverses AST nodes to build IR trees,
/// preserving source locations, metadata, and structural details.
///
/// Key features:
/// • Recursive extraction with null-safety and error handling
/// • Support for modern Dart (patterns, records, cascades, null-aware ops)
/// • Enum mappings for operators ([BinaryOperatorIR], [UnaryOperatorIR])
/// • Specialized IR for complex constructs (e.g., [CascadeExpressionIR])
/// • Debug utilities for body type inspection and extraction logging
///
/// Typical usage:
/// dart /// final statements = extractor.extractBodyStatements(functionBody); /// // Now analyze statements for flows, types, etc. ///
///
/// Powers:
/// • Control flow graph building
/// • Type inference on expressions
/// • Pattern matching for anti-patterns (e.g., setState in loops)
/// • Code generation/refactoring tools
///
/// IR nodes are immutable, JSON-serializable, and provide toShortString for summaries.
/// <---------------------------------------------------------------------------->
class StatementExtractionPass {
  final String filePath;
  final String fileContent;
  final DartFileBuilder builder;

  StatementExtractionPass({
    required this.filePath,
    required this.fileContent,
    required this.builder,
  });

  void debugFunctionBodyType(FunctionBody? body) {
    if (body == null) return;

    print('=== DEBUG: FunctionBody Type Info ===');
    print('runtimeType: ${body.runtimeType}');
    print('toString(): ${body.toString()}');
    print('Type name: ${body.runtimeType.toString()}');

    // Check ALL possible is relationships
    print('\n--- Is Checks ---');
    // ignore: unnecessary_type_check
    print('is FunctionBody: ${body is FunctionBody}');
    print('is BlockFunctionBody: ${body is BlockFunctionBody}');
    print('is ExpressionFunctionBody: ${body is ExpressionFunctionBody}');

    // Try to access properties
    print('\n--- Property Access ---');
    try {
      if (body is BlockFunctionBody) {
        print('✅ CAN access BlockFunctionBody.block');
        print('   block.statements.length: ${body.block.statements.length}');
      } else {
        print('❌ CANNOT cast to BlockFunctionBody');
      }
    } catch (e) {
      print('❌ ERROR: $e');
    }

    try {
      if (body is ExpressionFunctionBody) {
        print('✅ CAN access ExpressionFunctionBody.expression');
      } else {
        print('❌ CANNOT cast to ExpressionFunctionBody');
      }
    } catch (e) {
      print('❌ ERROR: $e');
    }

    // Print class hierarchy using reflection
    print('\n--- Class Hierarchy ---');
    var type = body.runtimeType;
    print('Type: $type');
    print('Type string: ${type.toString()}');

    // Manual check: does body have .block property?
    print('\n--- Has Properties ---');
    try {
      final block = (body as dynamic).block;
      print('✅ Has .block property: $block');
    } catch (e) {
      print('❌ No .block property: $e');
    }
  }

  List<ExpressionIR> extractBodyExpressions(FunctionBody? body) {
    if (body == null) {
      print('⚠️  [extractBodyExpressions] FunctionBody is null');
      return [];
    }

    final expressions = <ExpressionIR>[];
    print('📊 [extractBodyExpressions] Type: ${body.runtimeType}');

    // TYPE 1: BlockFunctionBody - extract expressions from all statements
    if (body is BlockFunctionBody) {
      print('   ✅ BlockFunctionBody');
      _extractExpressionsFromStatements(body.block.statements, expressions);
      print('   ✓ Extracted: ${expressions.length} expressions');
      return expressions;
    }

    // TYPE 2: ExpressionFunctionBody - the expression itself
    if (body is ExpressionFunctionBody) {
      print('   ✅ ExpressionFunctionBody (arrow syntax)');
      expressions.add(extractExpression(body.expression));
      print('   ✓ Extracted: ${expressions.length} expressions');
      return expressions;
    }

    // TYPE 3: EmptyFunctionBody
    print('   ℹ️  EmptyFunctionBody');
    return [];
  }

  /// Recursively extract all expressions from a list of statements
  void _extractExpressionsFromStatements(
    List<AstNode> statements,
    List<ExpressionIR> expressions,
  ) {
    for (final stmt in statements) {
      if (stmt is ReturnStatement && stmt.expression != null) {
        expressions.add(extractExpression(stmt.expression!));
      } else if (stmt is ExpressionStatement) {
        expressions.add(extractExpression(stmt.expression));
      } else if (stmt is VariableDeclarationStatement &&
          stmt.variables.variables.isNotEmpty) {
        final variable = stmt.variables.variables.first;
        if (variable.initializer != null) {
          expressions.add(extractExpression(variable.initializer!));
        }
      } else if (stmt is IfStatement) {
        // Extract condition expression
        expressions.add(extractExpression(stmt.expression));
        // Recursively extract from branches
        if (stmt.thenStatement is Block) {
          _extractExpressionsFromStatements(
            (stmt.thenStatement as Block).statements,
            expressions,
          );
        }
        if (stmt.elseStatement is Block) {
          _extractExpressionsFromStatements(
            (stmt.elseStatement as Block).statements,
            expressions,
          );
        }
      } else if (stmt is ForStatement) {
        // Extract loop condition and updaters
        final parts = stmt.forLoopParts;
        if (parts is ForPartsWithDeclarations) {
          if (parts.condition != null) {
            expressions.add(extractExpression(parts.condition!));
          }
          expressions.addAll(parts.updaters.map((e) => extractExpression(e)));
        } else if (parts is ForPartsWithExpression) {
          if (parts.condition != null) {
            expressions.add(extractExpression(parts.condition!));
          }
          expressions.addAll(parts.updaters.map((e) => extractExpression(e)));
        } else if (parts is ForEachParts) {
          if (parts is ForEachPartsWithDeclaration) {
            expressions.add(extractExpression(parts.iterable));
          } else if (parts is ForEachPartsWithIdentifier) {
            expressions.add(extractExpression(parts.iterable));
          }
        }
        // Recursively extract from loop body
        if (stmt.body is Block) {
          _extractExpressionsFromStatements(
            (stmt.body as Block).statements,
            expressions,
          );
        }
      } else if (stmt is WhileStatement) {
        expressions.add(extractExpression(stmt.condition));
        if (stmt.body is Block) {
          _extractExpressionsFromStatements(
            (stmt.body as Block).statements,
            expressions,
          );
        }
      } else if (stmt is DoStatement) {
        expressions.add(extractExpression(stmt.condition));
        if (stmt.body is Block) {
          _extractExpressionsFromStatements(
            (stmt.body as Block).statements,
            expressions,
          );
        }
      } else if (stmt is AssignmentExpression) {
        expressions.add(extractExpression(stmt));
      } else if (stmt is Block) {
        _extractExpressionsFromStatements(stmt.statements, expressions);
      } else if (stmt is TryStatement) {
        _extractExpressionsFromStatements(stmt.body.statements, expressions);
        for (final catchClause in stmt.catchClauses) {
          _extractExpressionsFromStatements(
            catchClause.body.statements,
            expressions,
          );
        }
        if (stmt.finallyBlock != null) {
          _extractExpressionsFromStatements(
            stmt.finallyBlock!.statements,
            expressions,
          );
        }
      } else if (stmt is SwitchStatement) {
        expressions.add(extractExpression(stmt.expression));
        for (final member in stmt.members) {
          if (member is SwitchCase) {
            expressions.add(extractExpression(member.expression));
            _extractExpressionsFromStatements(member.statements, expressions);
          } else if (member is SwitchDefault) {
            _extractExpressionsFromStatements(member.statements, expressions);
          }
        }
      }
    }
  }

  /// USAGE in your code
  List<StatementIR> extractBodyStatements(FunctionBody? body) {
    if (body == null) {
      print(
        '⚠️  [extractBodyStatements] FunctionBody is null (abstract/external)',
      );
      return [];
    }

    final statements = <StatementIR>[];
    print('📊 [extractBodyStatements] Type: ${body.runtimeType}');

    // ✅ TYPE 1: BlockFunctionBody - { statements }
    if (body is BlockFunctionBody) {
      final stmtCount = body.block.statements.length;
      print('   ✅ BlockFunctionBody - $stmtCount statements');

      if (stmtCount == 0) {
        print('   ⚠️  Empty block: { }');
      } else {
        for (final stmt in body.block.statements) {
          final extracted = _extractStatement(stmt);
          if (extracted != null) {
            statements.add(extracted);
          }
        }
      }

      print('   ✓ Extracted: ${statements.length} statements');
      return statements; // ⬅️ RETURN HERE!
    }

    // ✅ TYPE 2: ExpressionFunctionBody - => expression;
    if (body is ExpressionFunctionBody) {
      print('   ✅ ExpressionFunctionBody (arrow syntax: =>)');
      statements.add(
        ReturnStmt(
          id: builder.generateId('stmt_return'),
          expression: extractExpression(body.expression),
          sourceLocation: _extractSourceLocation(body, body.offset),
          metadata: {},
        ),
      );

      print('   ✓ Extracted: ${statements.length} statements');
      return statements; // ⬅️ RETURN HERE!
    }

    // ✅ TYPE 3: EmptyFunctionBody (abstract/external/etc)
    // If it's not BlockFunctionBody or ExpressionFunctionBody, it MUST be EmptyFunctionBody
    print('   ℹ️  EmptyFunctionBody (abstract/external/no implementation)');
    return []; // ⬅️ No statements to extract
  }

  /// Extract a single statement
  StatementIR? _extractStatement(AstNode? stmt) {
    if (stmt == null) return null;

    if (stmt is VariableDeclarationStatement) {
      return _extractVariableDeclarationStatement(stmt);
    }

    if (stmt is ReturnStatement) {
      return ReturnStmt(
        id: builder.generateId('stmt_return'),
        expression: stmt.expression != null
            ? extractExpression(stmt.expression!)
            : null,
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    if (stmt is IfStatement) {
      final condition = stmt.caseClause != null
          ? _extractPatternCondition(stmt.caseClause!)
          : extractExpression(stmt.expression);
      return IfStmt(
        id: builder.generateId('stmt_if'),
        condition: condition,
        thenBranch: _extractStatementAsBlock(stmt.thenStatement),
        elseBranch: stmt.elseStatement != null
            ? _extractStatement(stmt.elseStatement)
            : null,
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    if (stmt is ForStatement) {
      if (stmt.isForEach) {
        return _extractForEachStatement(stmt);
      } else {
        return _extractForStatement(stmt);
      }
    }

    if (stmt is WhileStatement) {
      return WhileStmt(
        id: builder.generateId('stmt_while'),
        condition: extractExpression(stmt.condition),
        body: _extractStatementAsBlock(stmt.body),
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    if (stmt is DoStatement) {
      return DoWhileStmt(
        id: builder.generateId('stmt_do_while'),
        body: _extractStatementAsBlock(stmt.body),
        condition: extractExpression(stmt.condition),
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    if (stmt is ExpressionStatement) {
      final expr = stmt.expression;
      return ExpressionStmt(
        id: builder.generateId('stmt_expr'),
        expression: extractExpression(stmt.expression),
        isMethodCall: expr is MethodInvocation,
        isConstructorCall: expr is InstanceCreationExpression,
        isAssignment: expr is AssignmentExpression,
        expressionType: _classifyExpression(expr),
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    if (stmt is Block) {
      return _extractBlockStatement(stmt);
    }

    if (stmt is TryStatement) {
      return _extractTryStatement(stmt);
    }

    if (stmt is SwitchStatement) {
      return _extractSwitchStatement(stmt);
    }

    if (stmt is BreakStatement) {
      return BreakStmt(
        id: builder.generateId('stmt_break'),
        label: stmt.label?.name,
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    if (stmt is ContinueStatement) {
      return ContinueStmt(
        id: builder.generateId('stmt_continue'),
        label: stmt.label?.name,
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    if (stmt is ThrowExpression) {
      return ThrowStmt(
        id: builder.generateId('stmt_throw'),
        exceptionExpression: extractExpression(stmt.expression),
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    if (stmt is AssertStatement) {
      return AssertStatementIR(
        id: builder.generateId('stmt_assert'),
        condition: extractExpression(stmt.condition),
        message: stmt.message != null ? extractExpression(stmt.message!) : null,
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    if (stmt is LabeledStatement) {
      return LabeledStatementIR(
        id: builder.generateId('stmt_labeled'),
        label: stmt.labels.first.label.name,
        statement:
            _extractStatement(stmt.statement) ??
            BlockStmt(
              id: builder.generateId('stmt_block'),
              statements: [],
              sourceLocation: _extractSourceLocation(stmt, stmt.offset),
              metadata: {},
            ),
        sourceLocation: _extractSourceLocation(stmt, stmt.offset),
        metadata: {},
      );
    }

    return null;
  }

  /// Extract a statement and wrap it in BlockStmt if needed
  StatementIR _extractStatementAsBlock(AstNode stmt) {
    if (stmt is Block) {
      return _extractBlockStatement(stmt);
    }

    final extracted = _extractStatement(stmt);
    if (extracted != null) {
      return extracted;
    }

    return BlockStmt(
      id: builder.generateId('stmt_block'),
      statements: [],
      sourceLocation: _extractSourceLocation(stmt, stmt.offset),
      metadata: {},
    );
  }

  /// Extract a block of statements
  BlockStmt _extractBlockStatement(Block block) {
    final statements = <StatementIR>[];

    for (final stmt in block.statements) {
      final extracted = _extractStatement(stmt);
      if (extracted != null) {
        statements.add(extracted);
      }
    }

    return BlockStmt(
      id: builder.generateId('stmt_block'),
      statements: statements,
      sourceLocation: _extractSourceLocation(block, block.offset),
      metadata: {},
    );
  }

  /// Extract variable declaration statement
  StatementIR _extractVariableDeclarationStatement(
    VariableDeclarationStatement stmt,
  ) {
    final variable = stmt.variables.variables.first;

    return VariableDeclarationStmt(
      id: builder.generateId('stmt_var'),
      name: variable.name.lexeme,
      type: _extractTypeFromAnnotation(stmt.variables.type, variable.offset),
      initializer: variable.initializer != null
          ? extractExpression(variable.initializer!)
          : null,
      isFinal: stmt.variables.isFinal,
      isConst: stmt.variables.isConst,
      isLate: stmt.variables.isLate,
      sourceLocation: _extractSourceLocation(stmt, variable.offset),
      metadata: {},
    );
  }

  /// Extract traditional for loop: for (int i = 0; i < 10; i++)
  /// Dart's ForStatement has forLoopParts that can be:
  /// - ForPartsWithDeclarations (declares variable)
  /// - ForPartsWithExpression (existing variable)
  /// - ForEachParts (for-each loop)
  ForStmt _extractForStatement(ForStatement stmt) {
    final parts = stmt.forLoopParts;

    ExpressionIR? initialization;
    ExpressionIR? condition;
    List<ExpressionIR> updaters = [];

    if (parts is ForPartsWithDeclarations) {
      // for (int i = 0; i < 10; i++)
      final variables = parts.variables;
      if (variables.variables.isNotEmpty) {
        final firstVar = variables.variables.first;
        initialization = firstVar.initializer != null
            ? extractExpression(firstVar.initializer!)
            : null;
      }
      condition = parts.condition != null
          ? extractExpression(parts.condition!)
          : null;
      updaters = parts.updaters.map((e) => extractExpression(e)).toList();
    } else if (parts is ForPartsWithExpression) {
      // for (i = 0; i < 10; i++)
      initialization = parts.initialization != null
          ? extractExpression(parts.initialization!)
          : null;
      condition = parts.condition != null
          ? extractExpression(parts.condition!)
          : null;
      updaters = parts.updaters.map((e) => extractExpression(e)).toList();
    }

    return ForStmt(
      id: builder.generateId('stmt_for'),
      initialization: initialization,
      condition: condition,
      updaters: updaters,
      body: _extractStatementAsBlock(stmt.body),
      sourceLocation: _extractSourceLocation(stmt, stmt.offset),
      metadata: {},
    );
  }

  /// Extract for-each loop: for (var item in items) or for (final item in items)
  ForEachStmt _extractForEachStatement(ForStatement stmt) {
    final parts = stmt.forLoopParts;

    String loopVariable = 'item';
    TypeIR? loopVariableType;
    ExpressionIR iterableExpr = UnknownExpressionIR(
      id: builder.generateId('expr_unknown'),
      source: 'items',
      sourceLocation: _extractSourceLocation(stmt, stmt.offset),
      metadata: {},
    );

    if (parts is ForEachPartsWithDeclaration) {
      // for (var x in items) or for (final x in items)
      final varDecl = parts.loopVariable;
      loopVariable = varDecl.name.lexeme;
      loopVariableType = _extractTypeFromAnnotation(
        varDecl.type,
        varDecl.offset,
      );
      iterableExpr = extractExpression(parts.iterable);
    } else if (parts is ForEachPartsWithIdentifier) {
      // for (x in items) - where x is an existing variable
      loopVariable = parts.identifier.name;
      iterableExpr = extractExpression(parts.iterable);
    }

    return ForEachStmt(
      id: builder.generateId('stmt_foreach'),
      loopVariable: loopVariable,
      loopVariableType: loopVariableType,
      iterable: iterableExpr,
      body: _extractStatementAsBlock(stmt.body),
      isAsync: stmt.awaitKeyword != null,
      sourceLocation: _extractSourceLocation(stmt, stmt.offset),
      metadata: {},
    );
  }

  /// Extract try-catch-finally statement
  TryStmt _extractTryStatement(TryStatement stmt) {
    return TryStmt(
      id: builder.generateId('stmt_try'),
      tryBlock: _extractBlockStatement(stmt.body),
      catchClauses: stmt.catchClauses.map((catchClause) {
        return CatchClauseStmt(
          id: builder.generateId('stmt_catch'),
          exceptionType: catchClause.exceptionType != null
              ? _extractTypeFromAnnotation(
                  catchClause.exceptionType,
                  stmt.offset,
                )
              : null,
          exceptionParameter: catchClause.exceptionParameter?.name.lexeme,
          stackTraceParameter: catchClause.stackTraceParameter?.name.lexeme,
          body: _extractBlockStatement(catchClause.body),
          sourceLocation: _extractSourceLocation(
            catchClause,
            catchClause.offset,
          ),
          metadata: {},
        );
      }).toList(),
      finallyBlock: stmt.finallyBlock != null
          ? _extractBlockStatement(stmt.finallyBlock!)
          : null,
      sourceLocation: _extractSourceLocation(stmt, stmt.offset),
      metadata: {},
    );
  }

  /// Extract switch statement
  SwitchStmt _extractSwitchStatement(SwitchStatement stmt) {
    final cases = <SwitchCaseStmt>[];
    SwitchCaseStmt? defaultCase;

    for (final member in stmt.members) {
      if (member is SwitchCase) {
        cases.add(
          SwitchCaseStmt(
            id: builder.generateId('stmt_case'),
            patterns: [extractExpression(member.expression)],
            statements: member.statements
                .map((s) => _extractStatement(s))
                .whereType<StatementIR>()
                .toList(),
            sourceLocation: _extractSourceLocation(member, member.offset),
            metadata: {},
          ),
        );
      } else if (member is SwitchDefault) {
        defaultCase = SwitchCaseStmt(
          id: builder.generateId('stmt_default'),
          statements: member.statements
              .map((s) => _extractStatement(s))
              .whereType<StatementIR>()
              .toList(),
          isDefault: true,
          sourceLocation: _extractSourceLocation(member, member.offset),
          metadata: {},
        );
      }
    }

    return SwitchStmt(
      id: builder.generateId('stmt_switch'),
      expression: extractExpression(stmt.expression),
      cases: cases,
      defaultCase: defaultCase,
      sourceLocation: _extractSourceLocation(stmt, stmt.offset),
      metadata: {},
    );
  }

  // =========================================================================
  // EXPRESSION EXTRACTION - FIXED
  // =========================================================================

  ExpressionIR extractExpression(dynamic expr) {
    final sourceLoc = _extractSourceLocation(expr, expr.offset);
    final metadata = <String, dynamic>{};

    // Literals
    if (expr is IntegerLiteral) {
      return LiteralExpressionIR(
        id: builder.generateId('expr_lit'),
        value: expr.value,
        literalType: LiteralType.intValue,
        resultType: SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'int',
          isNullable: false,
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }
    if (expr is StringInterpolation) {
      print('   [StringInterpolation] Found: ${expr.toString()}');

      final interpolationParts = <StringInterpolationPart>[];

      // Process each element in the interpolation
      for (final element in expr.elements) {
        if (element is InterpolationString) {
          // This is literal text part
          final literalText = element.value;
          interpolationParts.add(StringInterpolationPart.text(literalText));
          print('      [Text Part] "$literalText"');
        } else if (element is InterpolationExpression) {
          // This is an expression like $variable or ${expression}
          final exprValue = element.expression;
          final extractedExpr = extractExpression(exprValue);
          interpolationParts.add(
            StringInterpolationPart.expression(extractedExpr),
          );
          print('      [Expr Part] ${exprValue.toString()}');
        }
      }

      // Create StringInterpolationExpressionIR
      final result = StringInterpolationExpressionIR(
        id: builder.generateId('expr_string_interp'),
        sourceLocation: sourceLoc,
        parts: interpolationParts,
        resultType: SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'String',
          isNullable: false,
          sourceLocation: sourceLoc,
        ),
        metadata: metadata,
      );

      print('      ✓ Created StringInterpolationExpressionIR');
      return result;
    }
    if (expr is StringLiteral) {
      return LiteralExpressionIR(
        id: builder.generateId('expr_lit'),
        value: expr.stringValue ?? '',
        literalType: LiteralType.stringValue,
        resultType: SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'String',
          isNullable: false,
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    if (expr is BooleanLiteral) {
      return LiteralExpressionIR(
        id: builder.generateId('expr_lit'),
        value: expr.value,
        literalType: LiteralType.boolValue,
        resultType: SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'bool',
          isNullable: false,
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    if (expr is NullLiteral) {
      return LiteralExpressionIR(
        id: builder.generateId('expr_lit'),
        value: 'null',
        literalType: LiteralType.nullValue,
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    if (expr is DoubleLiteral) {
      return LiteralExpressionIR(
        id: builder.generateId('expr_lit'),
        value: expr.value,
        literalType: LiteralType.doubleValue,
        resultType: SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'double',
          isNullable: false,
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Identifiers
    if (expr is Identifier) {
      return IdentifierExpressionIR(
        id: builder.generateId('expr_id'),
        name: expr.name,
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Binary expressions
    if (expr is BinaryExpression) {
      return BinaryExpressionIR(
        id: builder.generateId('expr_bin'),
        operator: _mapBinaryOperator(expr.operator.lexeme),
        left: extractExpression(expr.leftOperand),
        right: extractExpression(expr.rightOperand),
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Prefix expressions (!a, -a, ++a, etc.)
    if (expr is PrefixExpression) {
      return UnaryExpressionIR(
        id: builder.generateId('expr_prefix'),
        operator: _mapUnaryOperator(expr.operator.lexeme, isPrefix: true),
        operand: extractExpression(expr.operand),
        isPrefix: true,
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Postfix expressions (a++, a--, etc.)
    if (expr is PostfixExpression) {
      return UnaryExpressionIR(
        id: builder.generateId('expr_postfix'),
        operator: _mapUnaryOperator(expr.operator.lexeme, isPrefix: false),
        operand: extractExpression(expr.operand),
        isPrefix: false,
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Method calls
    if (expr is MethodInvocation) {
      final typeArgs = <TypeIR>[];
      final positionalArgs = <ExpressionIR>[];
      final namedArgs = <String, ExpressionIR>{};

      // ✅ EXTRACT TYPE ARGUMENTS FROM <...>
      if (expr.typeArguments != null) {
        for (final typeArgAnnotation in expr.typeArguments!.arguments) {
          // typeArgAnnotation is a TypeAnnotation
          // Get the resolved DartType from the analyzer
          final dartType = typeArgAnnotation.type;

          if (dartType != null) {
            // ✅ Use the helper to convert DartType to TypeIR
            typeArgs.add(
              MethodCallExpressionType(
                builder: builder,
                filePath: filePath,
              ).extractTypeFromDartType(dartType, typeArgAnnotation.offset),
            );
          } else {
            // Fallback: parse the string representation
            final typeName = typeArgAnnotation
                .toString()
                .replaceAll('?', '')
                .trim();
            typeArgs.add(
              ClassTypeIR(
                name: typeName,
                id: builder.generateId('type_arg'),
                className: typeName,
                typeArguments: [],
                sourceLocation: _extractSourceLocation(
                  typeArgAnnotation,
                  typeArgAnnotation.offset,
                ),
              ),
            );
          }
        }
      }

      // Extract positional and named arguments
      for (final arg in expr.argumentList.arguments) {
        if (arg is NamedExpression) {
          final argName = arg.name.label.name;
          final argValue = extractExpression(arg.expression);
          namedArgs[argName] = argValue;
        } else {
          positionalArgs.add(extractExpression(arg));
        }
      }

      return MethodCallExpressionIR(
        typeArguments: typeArgs, // ✅ Now includes <CounterModel>
        id: builder.generateId('expr_call'),
        methodName: expr.methodName.name,
        target: expr.target != null ? extractExpression(expr.target!) : null,
        arguments: positionalArgs,
        namedArguments: namedArgs,
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Property access
    if (expr is PropertyAccess) {
      return PropertyAccessExpressionIR(
        id: builder.generateId('expr_prop'),
        target: extractExpression(expr.target),
        propertyName: expr.propertyName.name,
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Index access
    if (expr is IndexExpression) {
      return IndexAccessExpressionIR(
        id: builder.generateId('expr_index'),
        target: extractExpression(expr.target),
        index: extractExpression(expr.index),
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Assignment
    if (expr is AssignmentExpression) {
      return AssignmentExpressionIR(
        id: builder.generateId('expr_assign'),
        target: extractExpression(expr.leftHandSide),
        value: extractExpression(expr.rightHandSide),

        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Ternary expressions
    if (expr is ConditionalExpression) {
      return ConditionalExpressionIR(
        id: builder.generateId('expr_cond'),
        condition: extractExpression(expr.condition),
        thenExpression: extractExpression(expr.thenExpression),
        elseExpression: extractExpression(expr.elseExpression),
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // List literals
    if (expr is ListLiteral) {
      return ListExpressionIR(
        id: builder.generateId('expr_list'),
        elements: expr.elements.map((e) => extractExpression(e)).toList(),
        resultType: SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'List',
          isNullable: false,
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Map literals
    if (expr is SetOrMapLiteral) {
      return MapExpressionIR(
        id: builder.generateId('expr_map'),
        entries: expr.elements
            .whereType<MapLiteralEntry>()
            .map(
              (e) => MapEntryIR(
                id: builder.generateId('expr_entry'),
                sourceLocation: _extractSourceLocation(e, e.offset),
                key: extractExpression(e.key),
                value: extractExpression(e.value),
                metadata: {},
              ),
            )
            .toList(),
        resultType: SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'Map',
          isNullable: false,
          sourceLocation: sourceLoc,
          // metadata: {},
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Constructor calls
    if (expr is InstanceCreationExpression) {
      final className = expr.constructorName.type.name.toString();
      final constructorName = expr.constructorName.name?.name;
      final isConst = expr.isConst;
      final positional = <ExpressionIR>[];
      final named = <String, ExpressionIR>{};
      final namedWithTypes = <NamedArgumentIR>[];

      for (final arg in expr.argumentList.arguments) {
        if (arg is NamedExpression) {
          final argName = arg.name.label.name;
          final argValue = extractExpression(arg.expression);

          // ✓ PRESERVE NAME WITH VALUE
          named[argName] = argValue;

          // ✓ CAPTURE NAMED ARGUMENT WITH TYPE INFO
          namedWithTypes.add(
            NamedArgumentIR(
              id: builder.generateId('named_arg_$argName'),
              name: argName,
              value: argValue,
              resultType: SimpleTypeIR(
                id: builder.generateId('type'),
                name: 'dynamic',
                isNullable: true,
                sourceLocation: _extractSourceLocation(arg, arg.offset),
              ),
              sourceLocation: _extractSourceLocation(arg, arg.offset),
              metadata: {},
            ),
          );
        } else {
          positional.add(extractExpression(arg));
        }
      }

      return ConstructorCallExpressionIR(
        id: builder.generateId('expr_ctor'),
        className: className,

        constructorName: constructorName,
        positionalArguments: positional,
        namedArguments: named, // ✓ KEEP MAP OF NAMES TO EXPRESSIONS
        arguments: positional, // ✓ ONLY positional, NOT mixed!
        namedArgumentsDetailed: namedWithTypes, // ✓ HAS DETAILS
        resultType: SimpleTypeIR(
          id: builder.generateId('type'),
          name: className,
          isNullable: false,
          sourceLocation: sourceLoc,
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
        isConstant: isConst,
      );
    }

    // Type cast
    if (expr is AsExpression) {
      return CastExpressionIR(
        id: builder.generateId('expr_cast'),
        expression: extractExpression(expr.expression),
        targetType: _extractTypeFromAnnotation(expr.type, expr.offset),
        resultType: _extractTypeFromAnnotation(expr.type, expr.offset),
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Type check
    if (expr is IsExpression) {
      return IsExpressionIR(
        id: builder.generateId('expr_is'),
        expression: extractExpression(expr.expression),
        targetType: _extractTypeFromAnnotation(expr.type, expr.offset),
        isNegated: expr.notOperator != null,
        sourceLocation: sourceLoc,
        metadata: metadata,
      );
    }

    // Fix for extracting FunctionExpression with body

    if (expr is FunctionExpression) {
      final funcBody = expr.body; // ← FunctionBody

      // =========================================================================
      // STEP 1: Extract body statements (handles both arrow and block)
      // =========================================================================
      final bodyStatements = extractBodyStatements(funcBody);

      // =========================================================================
      // STEP 2: Extract parameters using FormalParameterExtractor
      // =========================================================================
      final formalParamExtractor = SimpleLambdaExtractor(
        filePath: filePath,
        fileContent: fileContent,
        builder: builder,
        statementExtractor: StatementExtractionPass(
          builder: builder,
          fileContent: fileContent,
          filePath: filePath,
        ),
      );

      final parameters = formalParamExtractor.extractLambdaParameters(
        expr.parameters,
      );

      // =========================================================================
      // STEP 3: Determine if arrow or block function
      // =========================================================================
      final isArrowFunction = funcBody is ExpressionFunctionBody;

      // =========================================================================
      // STEP 4: Extract return type from body
      // =========================================================================
      final returnType = _inferReturnTypeFromBody(
        bodyStatements,
        isArrowFunction,
        funcBody,
        sourceLoc,
      );

      // =========================================================================
      // STEP 5: Build FunctionExpressionIR with proper values
      // =========================================================================
      return FunctionExpressionIR(
        id: builder.generateId('expr_func'),
        // ✅ Use extracted ParameterDecl objects instead of separate lists
        parameter: parameters,
        // ✅ Use extracted body statements wrapped in BlockStmt
        body: FunctionBodyIR(
          id: builder.generateId('lambda_block'),
          statements: bodyStatements,
          sourceLocation: sourceLoc,
        ),

        // ✅ Use inferred return type instead of always dynamic
        returnType: returnType,
        sourceLocation: sourceLoc,
        metadata: {
          ...metadata,
          'isArrow': isArrowFunction,
          'parameterCount': parameters,
          'statementCount': bodyStatements.length,
          'isAsync': funcBody.isAsynchronous,
          'isGenerator': funcBody.isGenerator,
        },
        isAsync: funcBody.isAsynchronous,
        isGenerator: funcBody.isGenerator,
      );
    }

    // Unknown expressions
    return UnknownExpressionIR(
      id: builder.generateId('expr_unknown'),
      source: expr.toString(),
      sourceLocation: sourceLoc,
      metadata: metadata,
    );
  }

  TypeIR _inferReturnTypeFromBody(
    List<StatementIR> bodyStatements,
    bool isArrowFunction,
    FunctionBody funcBody,
    SourceLocationIR sourceLoc,
  ) {
    // Arrow function: infer from expression
    if (isArrowFunction && funcBody is ExpressionFunctionBody) {
      final exprNode = funcBody.expression;

      // Check expression type in AST
      if (exprNode is StringLiteral) {
        return SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'String',
          sourceLocation: sourceLoc,
        );
      }
      if (exprNode is IntegerLiteral) {
        return SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'int',
          sourceLocation: sourceLoc,
        );
      }
      if (exprNode is DoubleLiteral) {
        return SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'double',
          sourceLocation: sourceLoc,
        );
      }
      if (exprNode is BooleanLiteral) {
        return SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'bool',
          sourceLocation: sourceLoc,
        );
      }
      if (exprNode is ListLiteral) {
        return SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'List',
          sourceLocation: sourceLoc,
        );
      }
      if (exprNode is MapEntry) {
        return SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'Map',
          sourceLocation: sourceLoc,
        );
      }
    }

    // Block function: look for return statements
    for (final stmt in bodyStatements) {
      if (stmt is ReturnStmt && stmt.expression != null) {
        // Found a return, return type is present
        return SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'dynamic', // Could infer from expression IR
          sourceLocation: sourceLoc,
        );
      }
    }

    // Default: dynamic
    return DynamicTypeIR(
      id: builder.generateId('type'),
      sourceLocation: sourceLoc,
    );
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /// Map string operator to UnaryOperator enum
  UnaryOperator _mapUnaryOperator(String op, {required bool isPrefix}) {
    switch (op) {
      case '!':
        return UnaryOperator.logicalNot;
      case '-':
        return UnaryOperator.negate;
      case '~':
        return UnaryOperator.bitwiseNot;
      case '++':
        return isPrefix
            ? UnaryOperator.preIncrement
            : UnaryOperator.postIncrement;
      case '--':
        return isPrefix
            ? UnaryOperator.preDecrement
            : UnaryOperator.postDecrement;
      default:
        return UnaryOperator.negate;
    }
  }

  TypeIR _extractTypeFromAnnotation(
    TypeAnnotation? typeAnnotation,
    int offset,
  ) {
    final sourceLoc = SourceLocationIR(
      id: builder.generateId('loc'),
      file: filePath,
      line: 0,
      column: 0,
      offset: offset,
      length: typeAnnotation?.length ?? 0,
    );

    if (typeAnnotation == null) {
      return DynamicTypeIR(
        id: builder.generateId('type'),
        sourceLocation: sourceLoc,
        // metadata: {},
      );
    }

    final typeName = typeAnnotation.toString();
    final isNullable = typeAnnotation.question != null;
    final baseTypeName = typeName.replaceAll('?', '').trim();

    if (baseTypeName == 'void') {
      return VoidTypeIR(
        id: builder.generateId('type'),
        sourceLocation: sourceLoc,
        // metadata: {},
      );
    }

    if (baseTypeName == 'dynamic') {
      return DynamicTypeIR(
        id: builder.generateId('type'),
        sourceLocation: sourceLoc,
        // metadata: {},
      );
    }

    if (baseTypeName == 'Never') {
      return NeverTypeIR(
        id: builder.generateId('type'),
        sourceLocation: sourceLoc,
        // metadata: {},
      );
    }

    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: baseTypeName,
      isNullable: isNullable,
      sourceLocation: sourceLoc,
      // metadata: {},
    );
  }

  SourceLocationIR _extractSourceLocation(AstNode node, int startOffset) {
    int line = 1;
    int column = 1;

    for (int i = 0; i < startOffset && i < fileContent.length; i++) {
      if (fileContent[i] == '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }

    return SourceLocationIR(
      id: builder.generateId('loc'),
      file: filePath,
      line: line,
      column: column,
      offset: startOffset,
      length: node.length,
    );
  }

  ExpressionIR _extractPatternCondition(CaseClause caseClause) {
    // CaseClause has guardedPattern which contains the pattern
    final guardedPattern = caseClause.guardedPattern;
    final pattern = guardedPattern.pattern;

    // Optional: Extract guard condition (the when clause)
    final whenClause = guardedPattern.whenClause;

    // For now, represent pattern as an unknown expression
    // In a full implementation, you'd recursively parse DartPattern types
    // (ConstantPattern, VariablePattern, RecordPattern, ObjectPattern, etc.)
    return UnknownExpressionIR(
      id: builder.generateId('expr_pattern'),
      source:
          pattern.toString() +
          (whenClause != null
              ? ' when ${whenClause.expression.toString()}'
              : ''),
      sourceLocation: _extractSourceLocation(caseClause, caseClause.offset),
      metadata: {},
    );
  }

  BinaryOperatorIR _mapBinaryOperator(String op) {
    switch (op) {
      case '+':
        return BinaryOperatorIR.add;
      case '-':
        return BinaryOperatorIR.subtract;
      case '*':
        return BinaryOperatorIR.multiply;
      case '/':
        return BinaryOperatorIR.divide;
      case '%':
        return BinaryOperatorIR.modulo;
      case '~/':
        return BinaryOperatorIR.floorDivide;
      case '==':
        return BinaryOperatorIR.equals;
      case '!=':
        return BinaryOperatorIR.notEquals;
      case '<':
        return BinaryOperatorIR.lessThan;
      case '>':
        return BinaryOperatorIR.greaterThan;
      case '<=':
        return BinaryOperatorIR.lessThanOrEqual;
      case '>=':
        return BinaryOperatorIR.greaterThanOrEqual;
      case '&&':
        return BinaryOperatorIR.logicalAnd;
      case '||':
        return BinaryOperatorIR.logicalOr;
      case '&':
        return BinaryOperatorIR.bitwiseAnd;
      case '|':
        return BinaryOperatorIR.bitwiseOr;
      case '^':
        return BinaryOperatorIR.bitwiseXor;
      case '<<':
        return BinaryOperatorIR.leftShift;
      case '>>':
        return BinaryOperatorIR.rightShift;
      case '??':
        return BinaryOperatorIR.nullCoalesce;
      default:
        return BinaryOperatorIR.add; // fallback
    }
  }

  String _classifyExpression(AstNode expr) {
    // Method calls
    if (expr is MethodInvocation) {
      final methodName = expr.methodName.name.toLowerCase();

      // Framework/System calls
      if (methodName == 'runapp') return 'framework_initialization';
      if (methodName.startsWith('set')) return 'setter_call';
      if (methodName.startsWith('get')) return 'getter_call';
      if (methodName == 'print') return 'debug_call';
      if (methodName == 'tostring') return 'conversion_call';

      // Common patterns
      if (methodName.contains('validate')) return 'validation_call';
      if (methodName.contains('build')) return 'build_call';
      if (methodName.contains('create')) return 'factory_call';
      if (methodName.contains('init')) return 'initialization_call';

      return 'method_call'; // default
    }

    // Constructor calls
    if (expr is InstanceCreationExpression) {
      final className = expr.constructorName.type.name.toString();

      if (className == 'Future') return 'async_construction';
      if (className == 'Stream') return 'stream_construction';
      if (className.startsWith('State')) return 'state_construction';
      if (className.endsWith('Exception') || className.endsWith('Error')) {
        return 'error_construction';
      }

      return 'object_construction'; // default
    }

    // Binary operations
    if (expr is BinaryExpression) {
      final op = expr.operator.lexeme;

      if (['+', '-', '*', '/', '%', '~/'].contains(op)) {
        return 'arithmetic';
      }
      if (['<', '>', '<=', '>=', '==', '!='].contains(op)) {
        return 'comparison';
      }
      if (['&&', '||'].contains(op)) {
        return 'logical';
      }
      if (['&', '|', '^', '<<', '>>'].contains(op)) {
        return 'bitwise';
      }
      if (op == '??') {
        return 'null_coalesce';
      }

      return 'binary_operation'; // default
    }

    // Unary operations
    if (expr is PrefixExpression || expr is PostfixExpression) {
      final op = (expr as dynamic).operator.lexeme;

      if (op == '!') return 'logical_negation';
      if (['+', '-'].contains(op)) return 'arithmetic_sign';
      if (['++', '--'].contains(op)) return 'increment_decrement';
      if (op == '~') return 'bitwise_not';

      return 'unary_operation'; // default
    }

    // Literals
    if (expr is IntegerLiteral) return 'integer_literal';
    if (expr is StringLiteral) return 'string_literal';
    if (expr is BooleanLiteral) return 'boolean_literal';
    if (expr is DoubleLiteral) return 'double_literal';
    if (expr is NullLiteral) return 'null_literal';
    if (expr is ListLiteral) return 'list_literal';
    if (expr is SetOrMapLiteral) return 'map_or_set_literal';

    // Variables/Identifiers
    if (expr is Identifier) {
      final name = expr.name.toLowerCase();

      if (name == 'this') return 'self_reference';
      if (name == 'super') return 'super_reference';
      if (name[0].toUpperCase() == name[0]) return 'constant_reference';

      return 'variable_reference'; // default
    }

    // Conditionals
    if (expr is ConditionalExpression) return 'ternary_conditional';

    // Assignments
    if (expr is AssignmentExpression) return 'assignment';

    // Type checks/casts
    if (expr is IsExpression) return 'type_check';
    if (expr is AsExpression) return 'type_cast';

    // Cascades
    if (expr is CascadeExpression) return 'cascade_chain';

    // Function expressions (lambdas)
    if (expr is FunctionExpression) return 'lambda_function';

    // Default fallback
    return 'unknown_expression';
  }
}

/// Extension for ForStatement helper
extension ForStatementHelper on ForStatement {
  /// Check if this is a for-each loop (for (var x in items) {...})
  /// ForEachParts indicates it's a for-each loop
  bool get isForEach => forLoopParts is ForEachParts;

  /// Check if this is a traditional for loop
  bool get isTraditionalFor => !isForEach;
}
