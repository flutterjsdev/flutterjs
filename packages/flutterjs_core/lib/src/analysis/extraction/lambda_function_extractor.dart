// ============================================================================
// SIMPLIFIED LAMBDA FUNCTION EXTRACTION
// ============================================================================
// Uses extractBodyStatements directly for lambda/anonymous functions
// Works for both block {} and arrow => syntax
// ============================================================================

import 'package:analyzer/dart/ast/ast.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/analysis/extraction/statement_extraction_pass.dart';

/// Simple lambda extraction using extractBodyStatements
class SimpleLambdaExtractor {
  final String filePath;
  final String fileContent;
  final DartFileBuilder builder;
  final StatementExtractionPass statementExtractor;
  final bool verbose;

  SimpleLambdaExtractor({
    required this.filePath,
    required this.fileContent,
    required this.builder,
    required this.statementExtractor,
    this.verbose = false,
  });

  void _log(String message) {
    if (verbose) print(message);
  }

  /// Extract lambda using extractBodyStatements directly
  FunctionExpressionIR extractLambda({
    required FunctionExpression expr,
    required SourceLocationIR sourceLocation,
    String? hint,
  }) {
    try {
      // =========================================================================
      // STEP 1: Extract parameters (same for both block and arrow)
      // =========================================================================
      final parameters = extractLambdaParameters(expr.parameters);
      _log('   🔹 Lambda parameters: ${parameters.length}');

      // =========================================================================
      // STEP 2: Extract body using extractBodyStatements directly
      // =========================================================================
      final bodyStatements = statementExtractor.extractBodyStatements(
        expr.body,
      );
      _log('   ✅ Body statements extracted: ${bodyStatements.length}');

      // =========================================================================
      // STEP 3: Classify lambda
      // =========================================================================
      final classification = _classifyLambda(
        hint: hint,
        paramCount: parameters.length,
        statementCount: bodyStatements.length,
      );
      _log('   🔹 Classification: $classification');

      // =========================================================================
      // STEP 4: Infer return type
      // =========================================================================
      final returnType = _inferReturnType(bodyStatements, sourceLocation);
      _log('   🔹 Return type: ${returnType.runtimeType}');

      // =========================================================================
      // STEP 5: Build metadata
      // =========================================================================
      final metadata = <String, dynamic>{
        'hint': hint,
        'classification': classification,
        'parameterCount': parameters.length,
        'statementCount': bodyStatements.length,
        'hasReturn': bodyStatements.any((s) => s is ReturnStmt),
        'isArrow': _isArrowFunction(expr),
      };

      // =========================================================================
      // STEP 6: Return FunctionExpressionIR
      // =========================================================================
      return FunctionExpressionIR(
        id: builder.generateId('lambda'),
        parameter: parameters,
        body: FunctionBodyIR(
          id: builder.generateId('lambda_block'),
          statements: bodyStatements,
          sourceLocation: sourceLocation,
        ),

        returnType: returnType,
        sourceLocation: sourceLocation,
        metadata: metadata,
        isAsync: expr.body.isAsynchronous,
        isGenerator: expr.body.isGenerator,
      );
    } catch (e, st) {
      _log('   ❌ Lambda extraction failed: $e\n$st');
      return _createFallbackLambda(expr, sourceLocation, e.toString());
    }
  }

  // =========================================================================
  // PARAMETER EXTRACTION
  // =========================================================================

  List<ParameterDecl> extractLambdaParameters(FormalParameterList? paramList) {
    if (paramList == null) return [];

    final parameters = <ParameterDecl>[];

    for (final param in paramList.parameters) {
      String name = '';
      TypeIR? type;

      if (param is DefaultFormalParameter) {
        name = _getParameterName(param.parameter) ?? '';
        type = _extractParameterType(param.parameter);
      } else {
        name = _getFormalParameterName(param) ?? '';
        type = _extractFormalParameterType(param);
      }

      if (name.isNotEmpty) {
        parameters.add(
          ParameterDecl(
            id: builder.generateId('param', name),
            name: name,
            type: type,
            isRequired: param is DefaultFormalParameter
                ? param.isRequired
                : false,
            isNamed: param.isNamed,
            isPositional: param.isPositional,
            sourceLocation: _makeSourceLocation(param.offset, param.length),
          ),
        );
      }
    }

    return parameters;
  }

  String? _getParameterName(NormalFormalParameter param) {
    if (param is SimpleFormalParameter) return param.name?.lexeme;
    if (param is FieldFormalParameter) return param.name.lexeme;
    if (param is FunctionTypedFormalParameter) return param.name.lexeme;
    return null;
  }

  TypeIR _extractParameterType(NormalFormalParameter param) {
    TypeAnnotation? typeAnnotation;
    int offset = param.offset;

    if (param is SimpleFormalParameter) {
      typeAnnotation = param.type;
      offset = param.offset;
    } else if (param is FieldFormalParameter) {
      typeAnnotation = param.type;
      offset = param.offset;
    } else if (param is FunctionTypedFormalParameter) {
      typeAnnotation = param.returnType;
      offset = param.offset;
    }

    if (typeAnnotation == null) {
      return DynamicTypeIR(
        id: builder.generateId('type'),
        sourceLocation: _makeSourceLocation(offset, 0),
      );
    }

    final typeName = typeAnnotation.toString().replaceAll('?', '').trim();
    final isNullable = typeAnnotation.toString().contains('?');

    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: typeName,
      isNullable: isNullable,
      sourceLocation: _makeSourceLocation(offset, typeAnnotation.length),
    );
  }

  String? _getFormalParameterName(FormalParameter param) {
    // All FormalParameter types have a 'name' token property
    if (param.name != null) {
      return param.name!.lexeme;
    }

    // Handle specific subtypes that might have different name sources
    if (param is SuperFormalParameter) {
      // Super parameter: super.fieldName
      return param.name.lexeme;
    }

    if (param is DefaultFormalParameter) {
      // Unwrap and get name from the wrapped parameter
      return _getParameterName(param.parameter);
    }

    return null;
  }

  TypeIR _extractFormalParameterType(FormalParameter param) {
    TypeAnnotation? typeAnnotation;
    int offset = param.offset;

    // ─────────────────────────────────────────────────────────────────
    // SimpleFormalParameter: (int x), (x), (this.x)
    // ─────────────────────────────────────────────────────────────────
    if (param is SimpleFormalParameter) {
      typeAnnotation = param.type;
      offset = param.offset;
    }
    // ─────────────────────────────────────────────────────────────────
    // FieldFormalParameter: (this.fieldName), (this.x)
    // ─────────────────────────────────────────────────────────────────
    else if (param is FieldFormalParameter) {
      typeAnnotation = param.type;
      offset = param.offset;
    }
    // ─────────────────────────────────────────────────────────────────
    // FunctionTypedFormalParameter: (int callback(String x))
    // ─────────────────────────────────────────────────────────────────
    else if (param is FunctionTypedFormalParameter) {
      typeAnnotation = param.returnType;
      offset = param.offset;
    }
    // ─────────────────────────────────────────────────────────────────
    // SuperFormalParameter: (super.fieldName), (super.x)
    // ─────────────────────────────────────────────────────────────────
    else if (param is SuperFormalParameter) {
      typeAnnotation = param.type;
      offset = param.offset;
    }
    // ─────────────────────────────────────────────────────────────────
    // DefaultFormalParameter: Unwrap and extract from wrapped parameter
    // ─────────────────────────────────────────────────────────────────
    else if (param is DefaultFormalParameter) {
      return _extractParameterType(param.parameter);
    }

    // Handle null annotation (inferred/implicit type)
    if (typeAnnotation == null) {
      return DynamicTypeIR(
        id: builder.generateId('type'),
        sourceLocation: _makeSourceLocation(offset, 0),
      );
    }

    // Parse the type annotation
    final typeName = typeAnnotation.toString().replaceAll('?', '').trim();
    final isNullable = typeAnnotation.toString().contains('?');

    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: typeName,
      isNullable: isNullable,
      sourceLocation: _makeSourceLocation(offset, typeAnnotation.length),
    );
  }

  // =========================================================================
  // RETURN TYPE INFERENCE
  // =========================================================================

  TypeIR _inferReturnType(
    List<StatementIR> statements,
    SourceLocationIR sourceLocation,
  ) {
    // Look for return statements
    for (final stmt in statements) {
      if (stmt is ReturnStmt && stmt.expression != null) {
        // Could infer from expression, but for now:
        return SimpleTypeIR(
          id: builder.generateId('type'),
          name: 'dynamic', // Can be improved with expression analysis
          sourceLocation: sourceLocation,
        );
      }
    }

    // Default to dynamic
    return DynamicTypeIR(
      id: builder.generateId('type'),
      sourceLocation: sourceLocation,
    );
  }

  // =========================================================================
  // LAMBDA CLASSIFICATION
  // =========================================================================

  String _classifyLambda({
    required String? hint,
    required int paramCount,
    required int statementCount,
  }) {
    // Use hint if provided
    if (hint != null) {
      if (hint.contains('callback') ||
          hint.contains('onTap') ||
          hint.contains('onPressed')) {
        return 'callback';
      }
      if (hint.contains('builder')) {
        return 'builder';
      }
      if (hint.contains('transform') || hint.contains('map')) {
        return 'transformer';
      }
      if (hint.contains('filter') || hint.contains('where')) {
        return 'filter';
      }
      if (hint.contains('reducer') || hint.contains('fold')) {
        return 'reducer';
      }
    }

    // Heuristics based on parameter count
    if (paramCount == 0) {
      return 'no_param_callback'; // () => ...
    }
    if (paramCount == 1) {
      return 'transformer'; // Single param: likely transform/map
    }
    if (paramCount == 2) {
      return 'reducer'; // Two params: accumulator pattern
    }

    return 'callback'; // Default
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  bool _isArrowFunction(FunctionExpression expr) {
    return expr.body is ExpressionFunctionBody;
  }

  SourceLocationIR _makeSourceLocation(int offset, int length) {
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
      length: length,
    );
  }

  FunctionExpressionIR _createFallbackLambda(
    FunctionExpression expr,
    SourceLocationIR sourceLocation,
    String error,
  ) {
    final params = extractLambdaParameters(expr.parameters);

    return FunctionExpressionIR(
      id: builder.generateId('lambda_fallback'),
      parameter: params,
      body: null,
      returnType: DynamicTypeIR(
        id: builder.generateId('type'),
        sourceLocation: sourceLocation,
      ),
      sourceLocation: sourceLocation,
      metadata: {'extractionError': error},
    );
  }
}

// ============================================================================
// INTEGRATION INTO EXPRESSION EXTRACTOR
// ============================================================================

/*
// In your existing expression extractor (e.g., StatementExtractionPass):

if (expr is FunctionExpression) {
  final lambdaExtractor = SimpleLambdaExtractor(
    filePath: filePath,
    fileContent: fileContent,
    builder: builder,
    statementExtractor: this, // Pass the statement extractor
  );

  return lambdaExtractor.extractLambda(
    expr: expr,
    sourceLocation: sourceLoc,
    hint: 'callback', // Optional: helps with classification
  );
}

// ============================================================================
// EXAMPLES
// ============================================================================

// Example 1: Simple callback (arrow)
() => print('Hello')
// → isArrow: true
// → statements: [ExpressionStmt(print('Hello'))]
// → classification: 'no_param_callback'

// Example 2: Builder with block
(context) {
  return Scaffold(
    body: Center(child: Text('Hello')),
  );
}
// → isArrow: false
// → statements: [ReturnStmt(Scaffold(...))]
// → classification: 'builder'
// → parameters: [ParameterDecl(name: 'context', type: dynamic)]

// Example 3: Transform with arrow
(item) => item.toUpperCase()
// → isArrow: true
// → statements: [ExpressionStmt(item.toUpperCase())]
// → classification: 'transformer'
// → parameters: [ParameterDecl(name: 'item')]

// Example 4: Reducer
(sum, value) => sum + value
// → isArrow: true
// → statements: [ExpressionStmt(sum + value)]
// → classification: 'reducer'
// → parameters: [sum, value]

// Example 5: Complex event handler (block)
(e) {
  if (e != null) {
    setState(() {
      _value = e;
    });
  }
}
// → isArrow: false
// → statements: [IfStmt(...), ...]
// → classification: 'callback'
// → parameters: [e]

// ============================================================================
// KEY ADVANTAGES
// ============================================================================

// ✅ Reuses extractBodyStatements - no duplication
// ✅ Handles both arrow and block syntax automatically
// ✅ Simple and maintainable code
// ✅ Consistent with named function extraction
// ✅ Works with any statement inside lambda
// ✅ Minimal overhead
*/
