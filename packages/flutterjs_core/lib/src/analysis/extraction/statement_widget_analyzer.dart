import 'package:flutterjs_core/flutterjs_core.dart';
import '../../ir/expressions/cascade_expression_ir.dart';

/// =============================================================================
///  STATEMENT WIDGET ANALYZER
///  Flutter-specific widget usage extractor for statements
/// =============================================================================
///
/// PURPOSE
/// -------
/// Analyzes Dart statements (from AST) to identify and extract Flutter widget
/// usages, adding WidgetUsageIR metadata to each StatementIR.
///
/// Handles all common patterns:
/// • Direct returns: return Scaffold(...);
/// • Assignments: final w = Container(...);
/// • Conditionals: if (...) Text(...) else Icon(...);
/// • Cascades: Scaffold()..body = Text(...);
/// • Null-aware/coalescing: obj?.widget ?? Default();
/// • Collections: children: [Text(), Icon()];
/// • Nested blocks/loops/try-catch
///
/// Integrates with DartFileBuilder for full analysis pipeline.
///
/// USAGE
/// -----
/// ```dart
/// final analyzer = StatementWidgetAnalyzer(
///   filePath: 'lib/main.dart',
///   fileContent: sourceCode,
///   builder: myBuilder,
/// );
/// analyzer.analyzeStatementsForWidgets(statementsList);
/// ```
///
/// After analysis, access via stmt.widgetUsages.
///
/// DESIGN NOTES
/// ------------
/// • Recursive extraction for nested structures
/// • Preserves original StatementIR via immutable updates
/// • Flutter-specific: Focuses on constructor calls like Scaffold()
/// • Extensible: Add more patterns in _extractWidgetsFromExpression()
///
/// RELATED FILES
/// -------------
/// • statement_ir.dart      → StatementIR + WidgetUsageIR
/// • expression_ir.dart     → Expression handling
/// • cascade_expression_ir.dart → Cascade support
/// • flutterjs_core.dart    → Core Flutter analysis utils
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
class StatementWidgetAnalyzer {
  final String filePath;
  final String fileContent;
  final DartFileBuilder builder;

  StatementWidgetAnalyzer({
    required this.filePath,
    required this.fileContent,
    required this.builder,
  });

  /// Analyze statements for widgets and add widget data to each statement
  void analyzeStatementsForWidgets(List<StatementIR> statements) {
    for (int i = 0; i < statements.length; i++) {
      final stmt = statements[i];
      final widgets = _extractWidgetsFromStatement(stmt);

      // ✅ Create new statement with widget data
      if (widgets.isNotEmpty) {
        statements[i] = _addWidgetsToStatement(stmt, widgets);
      }
    }
  }

  /// Extract all widgets from a statement
  List<WidgetUsageIR> _extractWidgetsFromStatement(StatementIR stmt) {
    final widgets = <WidgetUsageIR>[];

    // ✅ RETURN statements: return Scaffold();
    if (stmt is ReturnStmt && stmt.expression != null) {
      _extractWidgetsFromExpression(
        stmt.expression!,
        widgets,
        statementType: 'return',
        sourceLocation: stmt.sourceLocation,
      );
    }
    // ✅ VARIABLE DECLARATIONS: final widget = Scaffold();
    else if (stmt is VariableDeclarationStmt && stmt.initializer != null) {
      _extractWidgetsFromExpression(
        stmt.initializer!,
        widgets,
        statementType: 'variable',
        sourceLocation: stmt.sourceLocation,
        assignedToVariable: stmt.name,
      );
    }
    // ✅ EXPRESSION STATEMENTS: someWidget()
    else if (stmt is ExpressionStmt) {
      _extractWidgetsFromExpression(
        stmt.expression,
        widgets,
        statementType: 'expression',
        sourceLocation: stmt.sourceLocation,
      );
    }
    // ✅ IF STATEMENTS: both branches
    else if (stmt is IfStmt) {
      _extractWidgetsFromStatement(stmt.thenBranch).forEach((w) {
        widgets.add(w);
      });
      if (stmt.elseBranch != null) {
        _extractWidgetsFromStatement(stmt.elseBranch!).forEach((w) {
          widgets.add(w);
        });
      }
    }
    // ✅ BLOCKS: Recursively extract from inner statements
    else if (stmt is BlockStmt) {
      for (final innerStmt in stmt.statements) {
        widgets.addAll(_extractWidgetsFromStatement(innerStmt));
      }
    }
    // ✅ FOR/WHILE LOOPS: Extract from body
    else if (stmt is ForStmt) {
      widgets.addAll(_extractWidgetsFromStatement(stmt.body));
    } else if (stmt is ForEachStmt) {
      widgets.addAll(_extractWidgetsFromStatement(stmt.body));
    } else if (stmt is WhileStmt) {
      widgets.addAll(_extractWidgetsFromStatement(stmt.body));
    } else if (stmt is DoWhileStmt) {
      widgets.addAll(_extractWidgetsFromStatement(stmt.body));
    }
    // ✅ TRY-CATCH: Extract from all branches
    else if (stmt is TryStmt) {
      widgets.addAll(_extractWidgetsFromStatement(stmt.tryBlock));
      for (final catchClause in stmt.catchClauses) {
        widgets.addAll(_extractWidgetsFromStatement(catchClause.body));
      }
      if (stmt.finallyBlock != null) {
        widgets.addAll(_extractWidgetsFromStatement(stmt.finallyBlock!));
      }
    }
    // ✅ SWITCH: Extract from all cases
    else if (stmt is SwitchStmt) {
      for (final caseStmt in stmt.cases) {
        for (final caseBody in caseStmt.statements) {
          widgets.addAll(_extractWidgetsFromStatement(caseBody));
        }
      }
      if (stmt.defaultCase != null) {
        for (final caseBody in stmt.defaultCase!.statements) {
          widgets.addAll(_extractWidgetsFromStatement(caseBody));
        }
      }
    }

    return widgets;
  }

  /// Recursively extract widgets from expressions
  /// Handles ALL expression types that might contain widgets
  void _extractWidgetsFromExpression(
    ExpressionIR expr,
    List<WidgetUsageIR> widgets, {
    required String statementType,
    required dynamic sourceLocation,
    String? assignedToVariable,
    bool isConditional = false,
  }) {
    // ✅ Direct widget creation: Scaffold(...)
    if (expr is ConstructorCallExpressionIR) {
      final widget = WidgetUsageIR(
        id: builder.generateId('widget_usage_${expr.className}'),
        widgetName: expr.className,
        constructorName: expr.className,
        properties: _extractProperties(expr),
        statementType: statementType,
        assignedToVariable: assignedToVariable,
        sourceLocation: sourceLocation,
        positionalArgs: expr.positionalArguments
            .map((e) => e.toString())
            .toList(),
        isConditional: isConditional,
        metadata: {
          'className': expr.className,
          'hasNamed': expr.namedArguments.isNotEmpty,
          'namedCount': expr.namedArguments.length,
        },
      );
      widgets.add(widget);

      // ✅ Recursively extract nested widgets from properties
      for (final namedArg in (expr.namedArgumentsDetailed)) {
        _extractWidgetsFromExpression(
          namedArg.value,
          widgets,
          statementType: 'property',
          sourceLocation: sourceLocation,
          isConditional: isConditional,
        );
      }
    } else if (expr is StringInterpolationExpressionIR) {
      // String interpolation in widget properties - preserve it
      print('   [StringInterpolation] Preserving in property');
      // Just track that we've seen it, don't try to extract widgets from it
      // (unless it contains widget expressions, which is unlikely)
      return;
    }
    // ✅ Conditional: condition ? WidgetA() : WidgetB()
    else if (expr is ConditionalExpressionIR) {
      _extractWidgetsFromExpression(
        expr.thenExpression,
        widgets,
        statementType: statementType,
        sourceLocation: sourceLocation,
        isConditional: true,
      );
      _extractWidgetsFromExpression(
        expr.elseExpression,
        widgets,
        statementType: statementType,
        sourceLocation: sourceLocation,
        isConditional: true,
      );
    }
    // ✅ List of widgets: [Widget1(), Widget2()]
    else if (expr is ListExpressionIR) {
      for (final element in expr.elements) {
        _extractWidgetsFromExpression(
          element,
          widgets,
          statementType: 'list_item',
          sourceLocation: sourceLocation,
          isConditional: isConditional,
        );
      }
    }
    // ✅ Named arguments: body: Scaffold()
    else if (expr is NamedArgumentIR) {
      _extractWidgetsFromExpression(
        expr.value,
        widgets,
        statementType: statementType,
        sourceLocation: sourceLocation,
        isConditional: isConditional,
      );
    }
    // ✅ NEW: Cascade Expressions - Scaffold()..appBar = AppBar()
    else if (expr is CascadeExpressionIR) {
      // Extract target widget
      _extractWidgetsFromExpression(
        expr.target,
        widgets,
        statementType: statementType,
        sourceLocation: sourceLocation,
        isConditional: isConditional,
      );

      // Extract widgets from cascade sections
      for (final section in expr.cascadeSections) {
        _extractWidgetsFromExpression(
          section,
          widgets,
          statementType: 'cascade_section',
          sourceLocation: sourceLocation,
          isConditional: isConditional,
        );
      }
    }
    // ✅ NEW: Null-Aware Access - obj?.buildWidget()
    else if (expr is NullAwareAccessExpressionIR) {
      _extractWidgetsFromExpression(
        expr.target,
        widgets,
        statementType: statementType,
        sourceLocation: sourceLocation,
        isConditional: isConditional,
      );
    }
    // ✅ NEW: Null Coalescing - widget ?? DefaultWidget()
    else if (expr is NullCoalescingExpressionIR) {
      // Extract from left side
      _extractWidgetsFromExpression(
        expr.left,
        widgets,
        statementType: statementType,
        sourceLocation: sourceLocation,
        isConditional: isConditional,
      );

      // Extract from right side (fallback)
      _extractWidgetsFromExpression(
        expr.right,
        widgets,
        statementType: statementType,
        sourceLocation: sourceLocation,
        isConditional: true, // Mark as conditional since it's a fallback
      );
    }
    // ✅ NEW: Compound Assignment - children ??= [Widget()]
    else if (expr is CompoundAssignmentExpressionIR) {
      _extractWidgetsFromExpression(
        expr.value,
        widgets,
        statementType: 'compound_assign',
        sourceLocation: sourceLocation,
        isConditional: isConditional,
      );
    }
    // ✅ NEW: Parenthesized Expression - (Widget())
    else if (expr is ParenthesizedExpressionIR) {
      _extractWidgetsFromExpression(
        expr.innerExpression,
        widgets,
        statementType: statementType,
        sourceLocation: sourceLocation,
        isConditional: isConditional,
      );
    }
    // ✅ Method calls that might return widgets: buildWidget()
    else if (expr is MethodCallExpressionIR) {
      // Extract target if present (e.g., obj.buildWidget())
      if (expr.target != null) {
        _extractWidgetsFromExpression(
          expr.target!,
          widgets,
          statementType: statementType,
          sourceLocation: sourceLocation,
          isConditional: isConditional,
        );
      }

      // Recursively extract from arguments
      for (final arg in expr.arguments) {
        _extractWidgetsFromExpression(
          arg,
          widgets,
          statementType: 'method_arg',
          sourceLocation: sourceLocation,
          isConditional: isConditional,
        );
      }
    }
    // ✅ Assignment Expression - widget = Scaffold()
    else if (expr is AssignmentExpressionIR) {
      _extractWidgetsFromExpression(
        expr.value,
        widgets,
        statementType: 'assignment',
        sourceLocation: sourceLocation,
        isConditional: isConditional,
      );
    }
    // ✅ Map literals (used for widget configuration)
    else if (expr is MapExpressionIR) {
      for (final entry in expr.entries) {
        _extractWidgetsFromExpression(
          entry.value,
          widgets,
          statementType: 'map_value',
          sourceLocation: sourceLocation,
          isConditional: isConditional,
        );
      }
    }
  }

  /// Extract properties from constructor call
  Map<String, String> _extractProperties(ConstructorCallExpressionIR expr) {
    final props = <String, String>{};

    // ✓ USE DETAILED NAMED ARGUMENTS IF AVAILABLE
    if (expr.namedArgumentsDetailed.isNotEmpty) {
      for (final namedArg in expr.namedArgumentsDetailed) {
        props[namedArg.name] = namedArg.value.toShortString();
      }
    } else {
      // Fallback to basic map
      for (final entry in expr.namedArguments.entries) {
        props[entry.key] = entry.value.toShortString();
      }
    }

    return props;
  }

  /// Create a new statement with widget data attached
  StatementIR _addWidgetsToStatement(
    StatementIR stmt,
    List<WidgetUsageIR> widgets,
  ) {
    // ✅ Return new statement with widgetUsages set
    if (stmt is ReturnStmt) {
      return ReturnStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        expression: stmt.expression,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is VariableDeclarationStmt) {
      return VariableDeclarationStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        name: stmt.name,
        type: stmt.type,
        initializer: stmt.initializer,
        isFinal: stmt.isFinal,
        isConst: stmt.isConst,
        isLate: stmt.isLate,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is ExpressionStmt) {
      return ExpressionStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        expression: stmt.expression,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is IfStmt) {
      return IfStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        condition: stmt.condition,
        thenBranch: stmt.thenBranch,
        elseBranch: stmt.elseBranch,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is BlockStmt) {
      return BlockStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        statements: stmt.statements,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is ForStmt) {
      return ForStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        initialization: stmt.initialization,
        condition: stmt.condition,
        updaters: stmt.updaters,
        body: stmt.body,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is ForEachStmt) {
      return ForEachStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        loopVariable: stmt.loopVariable,
        iterable: stmt.iterable,
        body: stmt.body,
        loopVariableType: stmt.loopVariableType,
        isAsync: stmt.isAsync,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is WhileStmt) {
      return WhileStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        condition: stmt.condition,
        body: stmt.body,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is DoWhileStmt) {
      return DoWhileStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        body: stmt.body,
        condition: stmt.condition,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is TryStmt) {
      return TryStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        tryBlock: stmt.tryBlock,
        catchClauses: stmt.catchClauses,
        finallyBlock: stmt.finallyBlock,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    if (stmt is SwitchStmt) {
      return SwitchStmt(
        id: stmt.id,
        sourceLocation: stmt.sourceLocation,
        expression: stmt.expression,
        cases: stmt.cases,
        defaultCase: stmt.defaultCase,
        metadata: stmt.metadata,
        widgetUsages: widgets,
      );
    }

    // Fallback for other statement types
    return stmt;
  }
}
