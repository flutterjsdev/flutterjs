// ============================================================================
// PHASE 3.3: BUILD METHOD CODE GENERATOR
// ============================================================================
// Converts Flutter build() methods to JavaScript render functions
// Handles widget tree extraction, conditional rendering, and state access
// ============================================================================

import 'package:collection/collection.dart';
import 'package:flutterjs_core/src/ast_ir/ir/expression_types/cascade_expression_ir.dart';
import 'package:flutterjs_core/src/flutter_to_js/src/flutter_prop_converters.dart';
import 'package:flutterjs_core/src/flutter_to_js/src/utils/code_gen_error.dart';
import '../../ast_ir/ast_it.dart';
import 'expression_code_generator.dart';
import 'statement_code_generator.dart';
import 'utils/indenter.dart';
import 'widget_instantiation_code_gen.dart';

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for build method generation
class BuildMethodGenConfig {
  /// Whether to generate JSDoc for build method
  final bool generateJSDoc;

  /// Whether to optimize widget tree
  final bool optimizeWidgetTree;

  /// Whether to extract local widget builders
  final bool extractLocalBuilders;

  /// Whether to validate all widgets in tree
  final bool validateWidgets;

  /// Indentation string
  final String indent;

  const BuildMethodGenConfig({
    this.generateJSDoc = true,
    this.optimizeWidgetTree = false,
    this.extractLocalBuilders = true,
    this.validateWidgets = true,
    this.indent = '  ',
  });
}

// ============================================================================
// MAIN BUILD METHOD CODE GENERATOR
// ============================================================================

class BuildMethodCodeGen {
  final BuildMethodGenConfig config;
  final WidgetInstantiationCodeGen widgetInstanGen;
  final StatementCodeGen stmtGen;
  final ExpressionCodeGen exprGen;
  late Indenter indenter;
  final List<CodeGenWarning> warnings = [];
  final List<CodeGenError> errors = [];

  /// Track extracted local builders
  final Map<String, String> localBuilders = {};

  /// Track widget tree structure
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

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Generate build method code
  String generateBuild(MethodDecl buildMethod) {
    try {
      localBuilders.clear();

      // Generate JSDoc if enabled
      final jsDoc = config.generateJSDoc ? _generateJSDoc(buildMethod) : '';

      // Generate method signature
      final methodBody = _generateBuildBody(buildMethod);

      return '$jsDoc$methodBody';
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate build method: $e',
        expressionType: buildMethod.runtimeType.toString(),
        suggestion: 'Check build method body structure',
      );
      errors.add(error);
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
  // BUILD METHOD BODY GENERATION
  // =========================================================================
  String _generateBuildBody(MethodDecl buildMethod) {
    final buffer = StringBuffer();
    buffer.writeln('build(context) {');
    indenter.indent();

    if (buildMethod.body == null) {
      buffer.writeln(indenter.line('// TODO: Implement build method'));
      indenter.dedent();
      buffer.write(indenter.line('}'));
      return buffer.toString();
    }

    // ✅ FIXED: body is now List<StatementIR>
    // Process all statements directly
    if (buildMethod.body!.isEmpty) {
      buffer.writeln(indenter.line('// Empty build method'));
    } else {
      // Look for return statement
      ReturnStmt? returnStmt;

      for (int i = 0; i < buildMethod.body!.length; i++) {
        final stmt = buildMethod.body![i];

        if (stmt is ReturnStmt && i == buildMethod.body!.length - 1) {
          // Last statement is return - save it for end
          returnStmt = stmt;
        } else {
          // Generate regular statements
          buffer.writeln(stmtGen.generate(stmt));
        }
      }

      // Handle final return
      if (returnStmt != null && returnStmt.expression != null) {
        final widgetCode = _generateReturnWidget(returnStmt.expression!);
        buffer.writeln(indenter.line('return $widgetCode;'));
      } else {
        buffer.writeln(indenter.line('return null; // No return in build'));
        warnings.add(
          CodeGenWarning(
            severity: WarningSeverity.warning,
            message: 'No explicit return statement found in build method',
            suggestion: 'Add: return <widget>;',
          ),
        );
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));
    return buffer.toString();
  }


  // =========================================================================
  // WIDGET TREE GENERATION
  // =========================================================================
  String _generateReturnWidget(ExpressionIR expr) {
    try {
      // Handle widget instantiation
      if (expr is InstanceCreationExpressionIR) {
        return widgetInstanGen.generateWidgetInstantiation(expr);
      }

      // Handle conditional (ternary) rendering
      if (expr is ConditionalExpressionIR) {
        return _generateConditionalWidget(expr);
      }

      // Handle null coalescing
      if (expr is NullCoalescingExpressionIR) {
        return _generateNullCoalescingWidget(expr);
      }

      // Handle variable references
      if (expr is IdentifierExpressionIR) {
        return _validateWidgetVariable(expr.name);
      }

      // Handle method calls (helper methods)
      if (expr is MethodCallExpressionIR) {
        return _generateMethodCallWidget(expr);
      }

      // Handle null-aware access
      if (expr is NullAwareAccessExpressionIR) {
        return _generateNullAwareWidget(expr);
      }

      // Handle function calls
      if (expr is FunctionCallExpr) {
        return _generateFunctionCallWidget(expr);
      }

      // Handle cascade expressions
      if (expr is CascadeExpressionIR) {
        return exprGen.generate(expr, parenthesize: false);
      }

      // IMPORTANT: Don't silently fall through - report it
      final warning = CodeGenWarning(
        severity: WarningSeverity.warning,
        message: 'Non-standard widget expression: ${expr.runtimeType}',
        details: 'Attempting generic expression generation',
        suggestion: 'Consider wrapping in a widget class',
      );
      warnings.add(warning);

      return exprGen.generate(expr, parenthesize: false);
    } catch (e) {
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
    // condition ? trueWidget : falseWidget
    final cond = exprGen.generate(expr.condition, parenthesize: true);
    final trueWidget = _generateReturnWidget(expr.thenExpression);
    final falseWidget = _generateReturnWidget(expr.elseExpression);

    return '$cond ? $trueWidget : $falseWidget';
  }

  String _generateNullCoalescingWidget(NullCoalescingExpressionIR expr) {
    // primaryWidget ?? fallbackWidget
    final primary = _generateReturnWidget(expr.left);
    final fallback = _generateReturnWidget(expr.right);

    return '$primary ?? $fallback';
  }

  String _validateWidgetVariable(String varName) {
    // Variable should be a widget instance or method
    return varName;
  }

  String _generateMethodCallWidget(MethodCallExpressionIR expr) {
    // Helper method returning widget
    if (expr.target != null) {
      final target = exprGen.generate(expr.target!, parenthesize: true);
      final args = _generateArgumentList(expr.arguments, expr.namedArguments);
      return '$target.${expr.methodName}($args)';
    } else {
      // Top-level helper function
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
  // HELPER METHODS
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

  /// Extract common widget patterns into helper methods
  String _extractLocalBuilder(String pattern, ExpressionIR expr) {
    final key = 'builder_${pattern}_${expr.id}';

    if (!localBuilders.containsKey(key)) {
      final builderName =
          '_build${pattern[0].toUpperCase()}${pattern.substring(1)}';
      final builderCode = _generateReturnWidget(expr);

      localBuilders[key] =
          '''
  $builderName() {
    return $builderCode;
  }
''';
    }

    return 'this._build${pattern[0].toUpperCase()}${pattern.substring(1)}()';
  }

  /// Get all extracted builders
  String getAllLocalBuilders() {
    return localBuilders.values.join('\n');
  }

  /// Analyze build method for issues
  void analyzeBuild(MethodDecl buildMethod) {
    if (buildMethod.body == null) {
      final error = CodeGenError(
        message: 'Build method has no body',
        suggestion: 'Implement the build method',
      );
      errors.add(error);
      return;
    }

    // Check for return statement
    bool hasReturn = false;

    if (buildMethod.body is ReturnStmt) {
      hasReturn = (buildMethod.body as ReturnStmt).expression != null;
    } else if (buildMethod.body is BlockStmt) {
      final block = buildMethod.body as BlockStmt;
      hasReturn = block.statements.whereType<ReturnStmt>().isNotEmpty;
    }

    if (!hasReturn) {
      final warning = CodeGenWarning(
        severity: WarningSeverity.warning,
        message: 'Build method does not return a widget',
        suggestion: 'Add: return <widget>;',
      );
      warnings.add(warning);
    }
  }

  /// Get all warnings
  List<CodeGenWarning> getWarnings() => List.unmodifiable(warnings);

  /// Get all errors
  List<CodeGenError> getErrors() => List.unmodifiable(errors);

  /// Generate analysis report
  String generateReport() {
    final buffer = StringBuffer();

    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║        BUILD METHOD ANALYSIS REPORT                ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

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

// ============================================================================
// WIDGET TREE STRUCTURE (for analysis)
// ============================================================================

/// Represents the structure of a Flutter widget tree
class WidgetTree {
  /// Root widget in the tree
  final String rootWidget;

  /// All widgets in the tree
  final List<String> allWidgets;

  /// Depth of the tree
  final int depth;

  /// Conditional branches (widgets with conditional rendering)
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

// ============================================================================
// WARNING & ERROR TYPES
// ============================================================================

// ============================================================================
// EXAMPLE CONVERSIONS
// ============================================================================

/*
EXAMPLE 1: Simple Widget Return
────────────────────────────────
Dart:
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Hello'),
      color: Colors.blue,
    );
  }

JavaScript:
  build(context) {
    return new Container({
      child: new Text({
        data: 'Hello'
      }),
      color: 'blue'
    });
  }


EXAMPLE 2: Conditional Rendering
──────────────────────────────────
Dart:
  @override
  Widget build(BuildContext context) {
    return isLoading 
      ? Center(child: CircularProgressIndicator())
      : ListView(...);
  }

JavaScript:
  build(context) {
    return isLoading 
      ? new Center({
          child: new CircularProgressIndicator({})
        })
      : new ListView({...});
  }


EXAMPLE 3: Complex Widget Tree
───────────────────────────────
Dart:
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('My App')),
      body: Column(
        children: [
          Text('Title'),
          Expanded(child: ListView(...)),
        ],
      ),
    );
  }

JavaScript:
  build(context) {
    return new Scaffold({
      appBar: new AppBar({
        title: new Text({data: 'My App'})
      }),
      body: new Column({
        children: [
          new Text({data: 'Title'}),
          new Expanded({
            child: new ListView({...})
          })
        ]
      })
    });
  }


EXAMPLE 4: With Local Variables
────────────────────────────────
Dart:
  @override
  Widget build(BuildContext context) {
    final title = state.title ?? 'Default';
    final isVisible = state.show;
    
    return Container(
      child: isVisible ? Text(title) : SizedBox(),
    );
  }

JavaScript:
  build(context) {
    const title = state.title ?? 'Default';
    const isVisible = state.show;
    
    return new Container({
      child: isVisible 
        ? new Text({data: title})
        : new SizedBox({})
    });
  }


EXAMPLE 5: Helper Methods
─────────────────────────
Dart:
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _buildContent(),
    );
  }
  
  Widget _buildContent() {
    return Column(children: [...]);
  }

JavaScript:
  build(context) {
    return new Scaffold({
      body: this._buildContent()
    });
  }
  
  _buildContent() {
    return new Column({
      children: [...]
    });
  }
*/
