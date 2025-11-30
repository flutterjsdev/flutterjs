// ============================================================================
// PHASE 3.3: BUILD METHOD CODE GENERATOR (FIXED)
// ============================================================================
// Converts Flutter build() methods to JavaScript render functions
// ============================================================================

import 'package:flutterjs_core/src/ir/expressions/cascade_expression_ir.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/src/utils/code_gen_error.dart';
import 'expression_code_generator.dart';
import 'flutter_prop_converters.dart';
import 'statement_code_generator.dart';
import '../utils/indenter.dart';
import 'widget_instantiation_code_gen.dart';

class BuildMethodGenConfig {
  final bool generateJSDoc;
  final bool optimizeWidgetTree;
  final bool extractLocalBuilders;
  final bool validateWidgets;
  final String indent;
  final bool verbose;

  const BuildMethodGenConfig({
    this.generateJSDoc = true,
    this.optimizeWidgetTree = false,
    this.extractLocalBuilders = true,
    this.validateWidgets = true,
    this.indent = '  ',
    this.verbose = false,
  });
}

class BuildMethodCodeGen {
  final BuildMethodGenConfig config;
  final WidgetInstantiationCodeGen widgetInstanGen;
  final StatementCodeGen stmtGen;
  final ExpressionCodeGen exprGen;
  late Indenter indenter;
  final List<CodeGenWarning> warnings = [];
  final List<CodeGenError> errors = [];

  final Map<String, String> localBuilders = {};
  final WidgetTree? widgetTree;
  final FlutterPropConverter propConverter;

  BuildMethodCodeGen({
    BuildMethodGenConfig? config,
    WidgetInstantiationCodeGen? widgetInstanGen,
    StatementCodeGen? stmtGen,
    ExpressionCodeGen? exprGen,
    this.widgetTree,
    FlutterPropConverter? propConverter,
  }) : propConverter = propConverter ?? FlutterPropConverter(),
       config = config ?? const BuildMethodGenConfig(),
       widgetInstanGen = widgetInstanGen ?? WidgetInstantiationCodeGen(),
       stmtGen = stmtGen ?? StatementCodeGen(),
       exprGen = exprGen ?? ExpressionCodeGen() {
    indenter = Indenter(this.config.indent);
  }

  void printDebug(String msg) {
    if (config.verbose) {
      print('[BuildMethodGen] $msg');
    }
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Generate build method code
  String generateBuild(MethodDecl buildMethod) {
    try {
      localBuilders.clear();
      warnings.clear();
      errors.clear();

      printDebug('Generating build method: ${buildMethod.name}');
      printDebug('Body type: ${buildMethod.body.runtimeType}');
      printDebug('Body null: ${buildMethod.body == null}');

      final jsDoc = config.generateJSDoc ? _generateJSDoc(buildMethod) : '';
      final methodBody = _generateBuildBody(buildMethod);

      final result = '$jsDoc$methodBody';
      printDebug('Generated code length: ${result.length}');
      return result;
    } catch (e, st) {
      final error = CodeGenError(
        message: 'Failed to generate build method: $e',
        expressionType: buildMethod.runtimeType.toString(),
        suggestion: 'Check build method body structure',
      );
      errors.add(error);
      printDebug('❌ Error: $e\n$st');
      rethrow;
    }
  }

  // =========================================================================
  // JSDOC GENERATION
  // =========================================================================

  String _generateJSDoc(MethodDecl method) {
    final buffer = StringBuffer();
    buffer.writeln('/**');
    buffer.writeln(' * Build method - renders the widget tree');
    buffer.writeln(' * @param {any} context - Build context');
    buffer.writeln(' * @returns {Widget} - Root widget of the tree');
    buffer.writeln(' */');
    return buffer.toString();
  }

  // =========================================================================
  // BUILD METHOD BODY GENERATION (FIXED)
  // =========================================================================

  String _generateBuildBody(MethodDecl buildMethod) {
    final buffer = StringBuffer();
    buffer.writeln('build(context) {');
    indenter.indent();

    try {
      // ✅ NEW: Use extension method for safe access
      if (buildMethod.body?.isEmpty ?? true) {
        printDebug('⚠️  Body is empty');
        buffer.writeln(indenter.line('// Empty build method'));
        indenter.dedent();
        buffer.write(indenter.line('}'));
        return buffer.toString();
      }

      printDebug(
        'Body statement count: ${buildMethod.body?.statements.length}',
      );

      // ✅ FIXED: Extract return statement properly
      final returnStmt = _extractReturnStatement(buildMethod.body);

      if (returnStmt == null) {
        printDebug('⚠️  No return statement found');
        buffer.writeln(indenter.line('// Build method has no return'));
        buffer.writeln(indenter.line('return null;'));
        warnings.add(
          CodeGenWarning(
            severity: WarningSeverity.warning,
            message: 'No return statement in build method',
            suggestion: 'Add: return <widget>;',
          ),
        );
        indenter.dedent();
        buffer.write(indenter.line('}'));
        return buffer.toString();
      }

      if (returnStmt.expression == null) {
        printDebug('⚠️  Return statement has no expression');
        buffer.writeln(indenter.line('return null; // Empty return'));
        indenter.dedent();
        buffer.write(indenter.line('}'));
        return buffer.toString();
      }

      printDebug(
        '✓ Return expression type: ${returnStmt.expression.runtimeType}',
      );

      // ✅ FIXED: Generate the widget tree
      final widgetCode = _generateReturnWidget(returnStmt.expression!);
      buffer.writeln(indenter.line('return $widgetCode;'));

      indenter.dedent();
      buffer.write(indenter.line('}'));
      return buffer.toString();
    } catch (e, st) {
      printDebug('✗ Error in _generateBuildBody: $e\n$st');
      indenter.dedent();
      buffer.write(indenter.line('}'));
      return buffer.toString();
    }
  }
  // =========================================================================
  // RETURN STATEMENT EXTRACTION (FIXED)
  // =========================================================================

  /// ✓ NEW: Safely extract return statement from body
  ReturnStmt? _extractReturnStatement(dynamic body) {
    if (body == null) {
      printDebug('Body is null');
      return null;
    }

    // Case 1: body is a List<StatementIR>
    if (body is FunctionBodyIR) {
      printDebug('Body is FunctionBodyIR, count: ${body.statements.length}');
      return _findReturnInStatements(body.statements);
    }

    // Case 2: body is a BlockStmt
    if (body is BlockStmt) {
      printDebug('Body is BlockStmt');
      return _findReturnInStatements(body.statements);
    }

    // Case 3: body is a single ReturnStmt
    if (body is ReturnStmt) {
      printDebug('Body is ReturnStmt directly');
      return body;
    }

    // Case 4: body is some other statement
    if (body is StatementIR) {
      printDebug('Body is ${body.runtimeType}');
      return null;
    }

    printDebug('Unknown body type: ${body.runtimeType}');
    return null;
  }

  /// ✓ NEW: Find return statement in statement list
  ReturnStmt? _findReturnInStatements(List<StatementIR> statements) {
    // ✅ NEW: Use totalItems for safety
    if (statements.isEmpty) {
      return null;
    }

    // Search backwards for the last return statement
    for (int i = statements.length - 1; i >= 0; i--) {
      final stmt = statements[i];

      if (stmt is ReturnStmt) {
        printDebug('Found ReturnStmt at index $i');
        return stmt;
      }

      // Handle nested blocks
      if (stmt is BlockStmt) {
        final nested = _findReturnInStatements(stmt.statements);
        if (nested != null) {
          printDebug('Found ReturnStmt in nested BlockStmt at index $i');
          return nested;
        }
      }

      // Handle if statements
      if (stmt is IfStmt) {
        // Check then branch
        if (stmt.thenBranch is ReturnStmt) {
          return stmt.thenBranch as ReturnStmt;
        }
        // Check else branch
        if (stmt.elseBranch is ReturnStmt) {
          return stmt.elseBranch as ReturnStmt;
        }
      }
    }

    printDebug(
      'No return statement found in list of ${statements.length} statements',
    );
    return null;
  }
  // =========================================================================
  // WIDGET TREE GENERATION (FIXED)
  // =========================================================================

  String _generateReturnWidget(ExpressionIR? expr) {
    try {
      printDebug('Generating widget for: ${expr.runtimeType}');

      // Handle null
      if (expr == null) {
        printDebug('❌ Expression is null');
        warnings.add(
          CodeGenWarning(
            severity: WarningSeverity.error,
            message: 'Return expression is null',
          ),
        );
        return 'null';
      }

      // ✓ PRIMARY: Widget instantiation
      if (expr is InstanceCreationExpressionIR) {
        printDebug('✓ InstanceCreationExpressionIR');
        printDebug('  Widget type: ${expr.type}');
        printDebug('  Named args: ${expr.namedArguments.length}');
        return widgetInstanGen.generateWidgetInstantiation(expr);
      }

      // Conditional rendering
      if (expr is ConditionalExpressionIR) {
        printDebug('✓ ConditionalExpressionIR');
        return _generateConditionalWidget(expr);
      }

      // Null coalescing
      if (expr is NullCoalescingExpressionIR) {
        printDebug('✓ NullCoalescingExpressionIR');
        return _generateNullCoalescingWidget(expr);
      }

      // Variable references
      if (expr is IdentifierExpressionIR) {
        printDebug('✓ IdentifierExpressionIR: ${expr.name}');
        return _validateWidgetVariable(expr.name);
      }

      // Method calls (helpers)
      if (expr is MethodCallExpressionIR) {
        printDebug('✓ MethodCallExpressionIR: ${expr.methodName}');
        return _generateMethodCallWidget(expr);
      }

      // Null-aware access
      if (expr is NullAwareAccessExpressionIR) {
        printDebug('✓ NullAwareAccessExpressionIR');
        return _generateNullAwareWidget(expr);
      }

      // Function calls
      if (expr is FunctionCallExpr) {
        printDebug('✓ FunctionCallExpr: ${expr.functionName}');
        return _generateFunctionCallWidget(expr);
      }

      // Cascade expressions
      if (expr is CascadeExpressionIR) {
        printDebug('✓ CascadeExpressionIR');
        return exprGen.generate(expr, parenthesize: false);
      }

      // Fallback
      printDebug('⚠️  Unsupported expression type: ${expr.runtimeType}');
      warnings.add(
        CodeGenWarning(
          severity: WarningSeverity.warning,
          message: 'Non-standard widget expression: ${expr.runtimeType}',
          suggestion: 'Consider wrapping in a widget class',
        ),
      );

      return exprGen.generate(expr, parenthesize: false);
    } catch (e, st) {
      printDebug('❌ Error generating widget: $e\n$st');
      final error = CodeGenError(
        message: 'Failed to generate return widget: $e',
        expressionType: expr.runtimeType.toString(),
        suggestion: 'Check widget tree structure',
      );
      errors.add(error);
      return 'null /* Widget generation failed: $e */';
    }
  }

  String _generateConditionalWidget(ConditionalExpressionIR expr) {
    final cond = exprGen.generate(expr.condition, parenthesize: true);
    final trueWidget = _generateReturnWidget(expr.thenExpression);
    final falseWidget = _generateReturnWidget(expr.elseExpression);
    return '$cond ? $trueWidget : $falseWidget';
  }

  String _generateNullCoalescingWidget(NullCoalescingExpressionIR expr) {
    final primary = _generateReturnWidget(expr.left);
    final fallback = _generateReturnWidget(expr.right);
    return '$primary ?? $fallback';
  }

  String _validateWidgetVariable(String varName) {
    return varName;
  }

  String _generateMethodCallWidget(MethodCallExpressionIR expr) {
    if (expr.target != null) {
      final target = exprGen.generate(expr.target!, parenthesize: true);
      final args = _generateArgumentList(expr.arguments, expr.namedArguments);
      return '$target.${expr.methodName}($args)';
    } else {
      final args = _generateArgumentList(expr.arguments, expr.namedArguments);
      return '${expr.methodName}($args)';
    }
  }

  String _generateNullAwareWidget(NullAwareAccessExpressionIR expr) {
    final target = exprGen.generate(expr.target, parenthesize: true);
    switch (expr.operationType) {
      case NullAwareOperationType.methodCall:
        return '$target?.${expr.operationData}()';
      case NullAwareOperationType.property:
        return '$target?.${expr.operationData}';
      default:
        return '$target';
    }
  }

  String _generateFunctionCallWidget(FunctionCallExpr expr) {
    final args = _generateArgumentList(expr.arguments, expr.namedArguments);
    return '${expr.functionName}($args)';
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  String _generateArgumentList(
    List<ExpressionIR> positional,
    Map<String, ExpressionIR> named,
  ) {
    final parts = <String>[];
    parts.addAll(
      positional.map((e) => exprGen.generate(e, parenthesize: false)),
    );
    if (named.isNotEmpty) {
      final namedStr = named.entries
          .map(
            (e) =>
                '${e.key}: ${exprGen.generate(e.value, parenthesize: false)}',
          )
          .join(', ');
      parts.add('{$namedStr}');
    }
    return parts.join(', ');
  }

  String _extractLocalBuilder(String pattern, ExpressionIR expr) {
    final key = 'builder_${pattern}_${expr.id}';
    if (!localBuilders.containsKey(key)) {
      final builderName =
          '_build${pattern[0].toUpperCase()}${pattern.substring(1)}';
      final builderCode = _generateReturnWidget(expr);
      localBuilders[key] = '  $builderName() {\n    return $builderCode;\n  }';
    }
    return 'this._build${pattern[0].toUpperCase()}${pattern.substring(1)}()';
  }

  String getAllLocalBuilders() {
    return localBuilders.values.join('\n');
  }

  void analyzeBuild(MethodDecl buildMethod) {
    if (buildMethod.body == null) {
      final error = CodeGenError(
        message: 'Build method has no body',
        suggestion: 'Implement the build method',
      );
      errors.add(error);
      return;
    }

    final returnStmt = _extractReturnStatement(buildMethod.body);
    if (returnStmt == null) {
      final warning = CodeGenWarning(
        severity: WarningSeverity.warning,
        message: 'Build method does not return a widget',
        suggestion: 'Add: return <widget>;',
      );
      warnings.add(warning);
    }
  }

  List<CodeGenWarning> getWarnings() => List.unmodifiable(warnings);
  List<CodeGenError> getErrors() => List.unmodifiable(errors);

  String generateReport() {
    final buffer = StringBuffer();
    buffer.writeln('\n╔════════════════════════════════════════════════╗');
    buffer.writeln('║   BUILD METHOD ANALYSIS REPORT                 ║');
    buffer.writeln('╚════════════════════════════════════════════════╝\n');

    if (errors.isEmpty && warnings.isEmpty) {
      buffer.writeln('✅ No issues found!\n');
      return buffer.toString();
    }

    if (errors.isNotEmpty) {
      buffer.writeln('❌ ERRORS (${errors.length}):');
      for (final error in errors) {
        buffer.writeln('  - ${error.message}');
        if (error.suggestion != null) {
          buffer.writeln('    💡 ${error.suggestion}');
        }
      }
      buffer.writeln();
    }

    if (warnings.isNotEmpty) {
      buffer.writeln('⚠️  WARNINGS (${warnings.length}):');
      for (final warning in warnings) {
        buffer.writeln('  - ${warning.message}');
        if (warning.details != null) {
          buffer.writeln('    📝 ${warning.details}');
        }
        if (warning.suggestion != null) {
          buffer.writeln('    💡 ${warning.suggestion}');
        }
      }
    }

    return buffer.toString();
  }
}

class WidgetTree {
  final String rootWidget;
  final List<String> allWidgets;
  final int depth;
  final List<String> conditionalWidgets;

  WidgetTree({
    required this.rootWidget,
    required this.allWidgets,
    required this.depth,
    required this.conditionalWidgets,
  });

  @override
  String toString() =>
      'WidgetTree(root: $rootWidget, depth: $depth, widgets: ${allWidgets.length})';
}
