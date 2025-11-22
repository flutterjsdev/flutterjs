// ============================================================================
// FIXED: statement_extraction_pass.dart
// ============================================================================
// Key fixes:
// 1. Proper null handling for optional types
// 2. Correct UnaryOperator enum usage (not string operators)
// 3. Assignment expression extraction separated from statements
// 4. Proper metadata handling on ExpressionIR base class
// 5. MapEntryIR properly instantiated with all required fields

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/ast.dart' as ast;
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/ast_ir/ir/expression_types/cascade_expression_ir.dart';

import 'ast_ir/ir/expression_ir.dart';
import 'ast_ir/ir/type_ir.dart';
import 'ast_ir/ir/statement/statement_ir.dart';
import 'ast_ir/diagnostics/source_location.dart';
import 'ast_ir/dart_file_builder.dart';

/// Extract List<StatementIR> from method/function bodies
class StatementExtractionPass {
  final String filePath;
  final String fileContent;
  final DartFileBuilder builder;

  StatementExtractionPass({
    required this.filePath,
    required this.fileContent,
    required this.builder,
  });

  /// Extract all statements from a function/method body
  List<StatementIR> extractBodyStatements(FunctionBody? body) {
    if (body == null) return [];

    final statements = <StatementIR>[];

    if (body is BlockFunctionBody) {
      for (final stmt in body.block.statements) {
        final extracted = _extractStatement(stmt);
        if (extracted != null) {
          statements.add(extracted);
        }
      }
    } else if (body is ExpressionFunctionBody) {
      statements.add(
        ReturnStmt(
          id: builder.generateId('stmt_return'),
          expression: extractExpression(body.expression),
          sourceLocation: _extractSourceLocation(body, body.offset),
          metadata: {},
        ),
      );
    }

    return statements;
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
      return ExpressionStmt(
        id: builder.generateId('stmt_expr'),
        expression: extractExpression(stmt.expression),
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
            patterns: member.expression != null
                ? [extractExpression(member.expression!)]
                : null,
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
        value: expr.value.toString(),
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
        value: expr.value.toString(),
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
        value: expr.value.toString(),
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
      return MethodCallExpressionIR(
        id: builder.generateId('expr_call'),
        methodName: expr.methodName.name,
        target: expr.target != null ? extractExpression(expr.target!) : null,
        arguments: expr.argumentList.arguments
            .map(
              (arg) => arg is NamedExpression
                  ? extractExpression(arg.expression)
                  : extractExpression(arg),
            )
            .toList(),
        resultType: DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
          // metadata: {},
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
      final positional = <ExpressionIR>[];
      final named = <String, ExpressionIR>{};
      final namedWithTypes = <NamedArgumentIR>[];

      for (final arg in expr.argumentList.arguments) {
        if (arg is NamedExpression) {
          final argName = arg.name.label.name;
          final argValue = extractExpression(arg.expression);

          named[argName] = argValue;

          // ✅ CAPTURE NAMED ARGUMENT DETAILS
          namedWithTypes.add(
            NamedArgumentIR(
              id: builder.generateId('named_arg_$argName'),
              name: argName,
              value: argValue,
              resultType: SimpleTypeIR(
                id: builder.generateId('type'),
                name: 'function or widget',
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
        positionalArguments: positional,
        namedArguments: named,
        arguments: [...positional, ...named.values],
        namedArgumentsDetailed: namedWithTypes, // ✅ ADD THIS
        resultType: SimpleTypeIR(
          id: builder.generateId('type'),
          name: className,
          isNullable: false,
          sourceLocation: sourceLoc,
        ),
        sourceLocation: sourceLoc,
        metadata: metadata,
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

    // Function expressions/lambdas
    if (expr is FunctionExpression) {
      return FunctionExpressionIR(
        id: builder.generateId('expr_func'),
        parameterNames:
            expr.parameters?.parameters
                .map((p) => p.name?.lexeme ?? '')
                .toList() ??
            [],
        sourceLocation: sourceLoc,
        metadata: metadata,
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

  List<WidgetPropertyIR> _extractWidgetProperties(
    InstanceCreationExpression expr,
    String className,
  ) {
    final properties = <WidgetPropertyIR>[];

    for (final arg in expr.argumentList.arguments) {
      if (arg is NamedExpression) {
        final propName = arg.name.label.name;
        final propValue = extractExpression(arg.expression);

        // Determine if this is a callback
        final isCallback =
            propName.startsWith('on') ||
            propName == 'builder' ||
            propName == 'itemBuilder';

        properties.add(
          WidgetPropertyIR(
            resultType: SimpleTypeIR(
              id: builder.generateId('type'),
              name: 'Widget',
              isNullable: true,
              sourceLocation: _extractSourceLocation(arg, arg.offset),
            ),
            id: builder.generateId('widget_prop_$propName'),
            propertyName: propName,
            value: propValue,
            isCallback: isCallback,
            sourceLocation: _extractSourceLocation(arg, arg.offset),
            metadata: {'widgetClass': className, 'isCallback': isCallback},
          ),
        );
      }
    }

    return properties;
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
}

/// Extension for ForStatement helper
extension ForStatementHelper on ForStatement {
  /// Check if this is a for-each loop (for (var x in items) {...})
  /// ForEachParts indicates it's a for-each loop
  bool get isForEach => forLoopParts is ForEachParts;

  /// Check if this is a traditional for loop
  bool get isTraditionalFor => !isForEach;
}
