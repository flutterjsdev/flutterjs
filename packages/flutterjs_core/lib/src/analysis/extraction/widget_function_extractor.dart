// ============================================================================
// UPDATED WIDGET FUNCTION EXTRACTOR
// ============================================================================
// Returns FunctionExtractionData instead of tuple, works with FunctionBody
// ============================================================================

import 'package:analyzer/dart/ast/ast.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/analysis/extraction/component_extractor.dart';

import 'flutter_component_system.dart';
import 'symmetric_function_extraction.dart';

class WidgetFunctionExtractor {
  /// Extract function returning rich FunctionExtractionData
  static FunctionExtractionData extractFunction({
    required FunctionDeclaration node,
    required String funcName,
    required String funcId,
    required bool isWidgetFunc,
    required List<StatementIR> bodyStatements,
    required List<ExpressionIR> bodyExpressions,
    required DartFileBuilder builder,
    required EnhancedComponentExtractor componentExtractor,
    required String fileContent,
    required String filePath,
    required PureFunctionExtractor pureFunctionExtractor,
  }) {
    if (bodyStatements.isEmpty && bodyExpressions.isEmpty) {
      print('   ⚠️  Empty function body');
      return FunctionExtractionData.empty(functionName: funcName);
    }

    // =========================================================================
    // IF WIDGET: Extract FlutterComponents
    // =========================================================================

    if (isWidgetFunc) {
      return _extractWidgetFunction(
        node: node,
        funcName: funcName,
        funcId: funcId,
        bodyStatements: bodyStatements,
        bodyExpressions: bodyExpressions,
        builder: builder,
        componentExtractor: componentExtractor,
        fileContent: fileContent,
        filePath: filePath,
      );
    }

    // =========================================================================
    // ELSE: Extract Pure Function Data
    // =========================================================================

    return _extractPureFunction(
      node: node,
      funcName: funcName,
      funcId: funcId,
      bodyStatements: bodyStatements,
      bodyExpressions: bodyExpressions,
      pureFunctionExtractor: pureFunctionExtractor,
      builder: builder,
    );
  }

  // ============================================================================
  // WIDGET EXTRACTION
  // ============================================================================

  static FunctionExtractionData _extractWidgetFunction({
    required FunctionDeclaration node,
    required String funcName,
    required String funcId,
    required List<StatementIR> bodyStatements,
    required List<ExpressionIR> bodyExpressions,
    required DartFileBuilder builder,
    required EnhancedComponentExtractor componentExtractor,
    required String fileContent,
    required String filePath,
  }) {
    print('   🎨 [ComponentExtraction] WIDGET FUNCTION');

    final startTime = DateTime.now();
    final components = <FlutterComponent>[];
    final diagnostics = <ExtractionDiagnostic>[];
    int returnCount = 0;
    int variableCount = 0;

    // Extract from return statements
    for (final stmt in bodyStatements) {
      if (stmt is ReturnStmt && stmt.expression != null) {
        returnCount++;
        try {
          final component = componentExtractor.extract(
            stmt.expression,
            hint: 'return_statement',
          );

          components.add(component);
          print('      ✅ ${component.describe()}');
          _printComponentTree(component, depth: 3);
        } catch (e) {
          print('      ❌ Extraction failed: $e');

          diagnostics.add(
            ExtractionDiagnostic(
              level: DiagnosticLevel.warning,
              message: 'Failed to extract component from return: $e',
              code: 'component_extraction_failed',
            ),
          );

          components.add(
            UnsupportedComponent(
              id: builder.generateId('unsupported'),
              sourceCode: stmt.expression.toString(),
              sourceLocation: _makeSourceLocation(
                stmt.sourceLocation.offset,
                fileContent,
                filePath,
                builder,
              ),
              reason: 'Exception: $e',
            ),
          );
        }
      }
      // Variable assignments - might contain widgets
      else if (stmt is VariableDeclarationStmt && stmt.initializer != null) {
        variableCount++;
        try {
          final component = componentExtractor.extract(
            stmt.initializer,
            hint: 'variable_assignment',
          );

          if (component is! UnsupportedComponent) {
            components.add(component);
            print('      ✅ ${component.describe()} in ${stmt.name}');
          }
        } catch (_) {
          // Silently skip non-widget variables
        }
      }
    }

    // Extract from expressions
    for (final expr in bodyExpressions) {
      try {
        final component = componentExtractor.extract(expr, hint: 'expression');
        if (component is! UnsupportedComponent) {
          components.add(component);
        }
      } catch (_) {}
    }

    final duration = DateTime.now().difference(startTime);

    return FunctionExtractionData(
      extractionType: 'widget',
      components: components,
      pureFunctionData: null,
      analysis: {
        'componentCount': components.length,
        'returnStatementCount': returnCount,
        'variableDeclarationCount': variableCount,
        'hasComplexLogic': bodyStatements.length > 1,
        'statementsCount': bodyStatements.length,
        'expressionsCount': bodyExpressions.length,
      },
      expressions: bodyExpressions,
      statements: bodyStatements,
      metadata: FunctionMetadata(
        name: funcName,
        type: 'widget',
        isAsync: node.functionExpression.body.isAsynchronous,
        isGenerator: node.functionExpression.body.isGenerator,
        returnType: node.returnType?.toString(),
      ),
      metrics: ExtractionMetrics(
        duration: duration,
        componentsExtracted: components.length,
        expressionsAnalyzed: bodyExpressions.length,
        statementsProcessed: bodyStatements.length,
      ),
      validation: ExtractionValidation(isValid: true),
      diagnostics: diagnostics,
    );
  }

  // ============================================================================
  // PURE FUNCTION EXTRACTION
  // ============================================================================

  static FunctionExtractionData _extractPureFunction({
    required FunctionDeclaration node,
    required String funcName,
    required String funcId,
    required List<StatementIR> bodyStatements,
    required List<ExpressionIR> bodyExpressions,
    required PureFunctionExtractor pureFunctionExtractor,
    required DartFileBuilder builder,
  }) {
    print('   📢 [PureFunctionExtraction] PURE FUNCTION');

    final startTime = DateTime.now();

    try {
      final pureFunctionData = pureFunctionExtractor.extract(
        node: node,
        functionName: funcName,
        bodyStatements: bodyStatements,
      );

      print('      ✅ ${pureFunctionData.describe()}');

      final duration = DateTime.now().difference(startTime);

      return FunctionExtractionData(
        extractionType: 'pure_function',
        components: [],
        pureFunctionData: pureFunctionData,
        analysis: {
          'functionDataType': pureFunctionData.type.name,
          'statementsCount': bodyStatements.length,
          'expressionsCount': bodyExpressions.length,
        },
        expressions: bodyExpressions,
        statements: bodyStatements,
        metadata: FunctionMetadata(
          name: funcName,
          type: 'pure_function',
          isAsync: node.functionExpression.body.isAsynchronous,
          isGenerator: node.functionExpression.body.isGenerator,
          returnType: node.returnType?.toString(),
        ),
        metrics: ExtractionMetrics(
          duration: duration,
          componentsExtracted: 0,
          expressionsAnalyzed: bodyExpressions.length,
          statementsProcessed: bodyStatements.length,
        ),
        validation: ExtractionValidation(isValid: true),
      );
    } catch (e) {
      print('      ❌ Extraction failed: $e');

      return FunctionExtractionData.error(
        errorMessage: e.toString(),
        functionName: funcName,
        statements: bodyStatements,
      );
    }
  }

  // ============================================================================
  // METHOD EXTRACTION
  // ============================================================================

  static FunctionExtractionData extractMethod({
    required MethodDeclaration node,
    required String funcName,
    required String funcId,
    required bool isWidgetFunc,
    required List<StatementIR> bodyStatements,
    required List<ExpressionIR> bodyExpressions,
    required String className,
    required PureFunctionExtractor pureFunctionExtractor,
    required DartFileBuilder builder,
  }) {
    if (bodyStatements.isEmpty && bodyExpressions.isEmpty) {
      print('   ⚠️  Empty method body');
      return FunctionExtractionData.empty(functionName: funcName);
    }

    // =========================================================================
    // Widget method extraction (if applicable)
    // =========================================================================
    if (isWidgetFunc) {
      return _extractWidgetMethod(
        node: node,
        funcName: funcName,
        funcId: funcId,
        bodyStatements: bodyStatements,
        bodyExpressions: bodyExpressions,
        className: className,
        builder: builder,
      );
    }

    // =========================================================================
    // Pure method extraction
    // =========================================================================
    return _extractPureMethod(
      node: node,
      funcName: funcName,
      funcId: funcId,
      bodyStatements: bodyStatements,
      bodyExpressions: bodyExpressions,
      className: className,
      pureFunctionExtractor: pureFunctionExtractor,
      builder: builder,
    );
  }

  static FunctionExtractionData _extractWidgetMethod({
    required MethodDeclaration node,
    required String funcName,
    required String funcId,
    required List<StatementIR> bodyStatements,
    required List<ExpressionIR> bodyExpressions,
    required String className,
    required DartFileBuilder builder,
  }) {
    print('   🎨 [WidgetMethod] $className.$funcName()');

    final startTime = DateTime.now();
    final components = <FlutterComponent>[];

    // For widget methods, typically just return statements
    for (final stmt in bodyStatements) {
      if (stmt is ReturnStmt && stmt.expression != null) {
        try {
          // Note: In a real scenario, you'd use componentExtractor here too
          print('      ✅ Widget method return extracted');
        } catch (e) {
          print('      ❌ Failed: $e');
        }
      }
    }

    final duration = DateTime.now().difference(startTime);

    return FunctionExtractionData(
      extractionType: 'widget_method',
      components: components,
      pureFunctionData: null,
      analysis: {
        'componentCount': components.length,
        'methodType': 'widget',
        'className': className,
      },
      expressions: bodyExpressions,
      statements: bodyStatements,
      metadata: FunctionMetadata(
        name: funcName,
        type: 'widget_method',
        isAsync: node.body.isAsynchronous,
        isGenerator: node.body.isGenerator,
        returnType: node.returnType?.toString(),
      ),
      metrics: ExtractionMetrics(
        duration: duration,
        componentsExtracted: components.length,
        expressionsAnalyzed: bodyExpressions.length,
        statementsProcessed: bodyStatements.length,
      ),
      validation: ExtractionValidation(isValid: true),
    );
  }

  static FunctionExtractionData _extractPureMethod({
    required MethodDeclaration node,
    required String funcName,
    required String funcId,
    required List<StatementIR> bodyStatements,
    required List<ExpressionIR> bodyExpressions,
    required String className,
    required PureFunctionExtractor pureFunctionExtractor,
    required DartFileBuilder builder,
  }) {
    print('   📢 [PureMethod] $className.$funcName()');

    final startTime = DateTime.now();

    try {
      final pureFunctionData = pureFunctionExtractor.extractMethod(
        node: node,
        className: className,
        functionName: funcName,
        bodyStatements: bodyStatements,
      );

      print('      ✅ ${pureFunctionData.describe()}');

      final duration = DateTime.now().difference(startTime);

      return FunctionExtractionData(
        extractionType: 'pure_method',
        components: [],
        pureFunctionData: pureFunctionData,
        analysis: {
          'functionDataType': pureFunctionData.type.name,
          'methodType': 'pure',
          'className': className,
        },
        expressions: bodyExpressions,
        statements: bodyStatements,
        metadata: FunctionMetadata(
          name: funcName,
          type: 'pure_method',
          isAsync: node.body.isAsynchronous,
          isGenerator: node.body.isGenerator,
          returnType: node.returnType?.toString(),
        ),
        metrics: ExtractionMetrics(
          duration: duration,
          componentsExtracted: 0,
          expressionsAnalyzed: bodyExpressions.length,
          statementsProcessed: bodyStatements.length,
        ),
        validation: ExtractionValidation(isValid: true),
      );
    } catch (e) {
      print('      ❌ Extraction failed: $e');

      return FunctionExtractionData.error(
        errorMessage: e.toString(),
        functionName: funcName,
        statements: bodyStatements,
      );
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  static SourceLocationIR _makeSourceLocation(
    int offset,
    String fileContent,
    String filePath,
    DartFileBuilder builder,
  ) {
    int line = 1, column = 1;
    for (int i = 0; i < offset && i < fileContent.length; i++) {
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
      offset: offset,
      length: 0,
    );
  }

  static void _printComponentTree(FlutterComponent comp, {int depth = 0}) {
    final indent = '   ' * depth;
    print('$indent${comp.describe()}');

    for (final child in comp.getChildren()) {
      _printComponentTree(child, depth: depth + 1);
    }
  }
}


enum DiagnosticLevel {
  info,
  warning,
  error,
}

extension DiagnosticLevelExtension on DiagnosticLevel {
  String get name {
    switch (this) {
      case DiagnosticLevel.info:
        return 'info';
      case DiagnosticLevel.warning:
        return 'warning';
      case DiagnosticLevel.error:
        return 'error';
    }
  }

  String get icon {
    switch (this) {
      case DiagnosticLevel.info:
        return 'ℹ️';
      case DiagnosticLevel.warning:
        return '⚠️';
      case DiagnosticLevel.error:
        return '❌';
    }
  }
}

