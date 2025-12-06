// ============================================================================
// PHASE 2.3: FUNCTION/METHOD CODE GENERATOR
// ============================================================================
// Converts all Dart function/method IR types to JavaScript code
// Handles regular, arrow, async, generators, constructors, getters/setters
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/src/widget_generation/prop_conversion/flutter_prop_converters.dart';
import 'package:flutterjs_gen/src/utils/code_gen_error.dart';

import '../expression/expression_code_generator.dart';
import '../statement/statement_code_generator.dart';
import '../../utils/indenter.dart';

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for function code generation
class FunctionGenConfig {
  /// Whether to use arrow syntax for single-expression functions
  final bool useArrowFunctions;

  /// Whether to generate JSDoc comments
  final bool generateJSDoc;

  /// Indentation string
  final String indent;

  const FunctionGenConfig({
    this.useArrowFunctions = true,
    this.generateJSDoc = true,
    this.indent = '  ',
  });
}

// ============================================================================
// BODY TYPE ENUMERATION
// ============================================================================

/// Represents the type of function body
enum FunctionBodyType {
  /// No body (abstract or stub)
  none,

  /// Single return statement (can be arrow function)
  singleReturn,

  /// Single expression statement (can be arrow function)
  singleExpression,

  /// Multiple statements (must be regular function)
  multipleStatements,

  /// Empty body
  empty,

  /// Unknown or unsupported
  unknown,
}

// ============================================================================
// MAIN FUNCTION CODE GENERATOR
// ============================================================================

class FunctionCodeGen {
  final FunctionGenConfig config;
  final StatementCodeGen stmtGen;
  final ExpressionCodeGen exprGen;
  late Indenter indenter;
  final List<CodeGenError> errors = [];
  final FlutterPropConverter propConverter;

  FunctionCodeGen({
    FunctionGenConfig? config,
    StatementCodeGen? stmtGen,
    ExpressionCodeGen? exprGen,
    FlutterPropConverter? propConverter,
  }) : propConverter = propConverter ?? FlutterPropConverter(),
       config = config ?? const FunctionGenConfig(),
       stmtGen = stmtGen ?? StatementCodeGen(),
       exprGen = exprGen ?? ExpressionCodeGen() {
    indenter = Indenter(this.config.indent);
  }

  /// Generate JavaScript code from a function declaration
  String generate(FunctionDecl func) {
    try {
      return _generateFunction(func);
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate function ${func.name}: $e',
        expressionType: func.runtimeType.toString(),
        suggestion: 'Check if all function types are supported',
      );
      errors.add(error);
      rethrow;
    }
  }

  /// Generate code for a method declaration within a class
  String generateMethod(MethodDecl method, {bool isStatic = false}) {
    try {
      return _generateMethod(method, isStatic: isStatic);
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate method ${method.name}: $e',
        expressionType: method.runtimeType.toString(),
      );
      errors.add(error);
      rethrow;
    }
  }

  /// Generate code for a constructor
  String generateConstructor(ConstructorDecl ctor, String className) {
    try {
      return _generateConstructor(ctor, className);
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate constructor for $className: $e',
        expressionType: ctor.runtimeType.toString(),
      );
      errors.add(error);
      rethrow;
    }
  }

  // =========================================================================
  // PRIVATE GENERATION METHODS
  // =========================================================================

  String _generateFunction(FunctionDecl func) {
    // ✅ FIXED: Always generate JSDoc
    final jsDoc = config.generateJSDoc ? _generateFunctionJSDoc(func) : '';
    final bodyType = _analyzeBodyType(func.body);

    // ✅ Arrow functions only for non-void with single return
    if (config.useArrowFunctions &&
        !func.isAsync &&
        !func.isGenerator &&
        _isNonVoidType(func.returnType) &&
        _canBeArrowFunction(bodyType, func.body)) {
      return _generateArrowFunction(func, jsDoc, bodyType);
    }

    return _generateRegularFunction(func, jsDoc);
  }

  String _generateRegularFunction(FunctionDecl func, String jsDoc) {
    final buffer = StringBuffer();

    // ✅ FIXED: Always include JSDoc if available
    if (jsDoc.isNotEmpty) {
      buffer.writeln(jsDoc);
    }

    String header = 'function';

    if (func.isAsync && func.isGenerator) {
      header = 'async function*';
    } else if (func.isAsync) {
      header = 'async function';
    } else if (func.isGenerator) {
      header = 'function*';
    }

    final params = _generateParameterList(func.parameters);

    buffer.writeln('$header ${func.name}($params) {');
    indenter.indent();

    if (func.body == null) {
      buffer.writeln(indenter.line('// TODO: Implement ${func.name}'));
    } else if (func.body!.statements.isEmpty) {
      buffer.writeln(indenter.line('// Empty function body'));
    } else {
      for (final stmt in func.body!.statements) {
        // ✅ Pass function context
        buffer.writeln(
          stmtGen.generateWithContext(stmt, functionContext: func),
        );
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateArrowFunction(
    FunctionDecl func,
    String jsDoc,
    FunctionBodyType bodyType,
  ) {
    final params = _generateParameterList(func.parameters);
    final exprBody = _extractExpressionFromBody(func.body, bodyType);

    if (exprBody == null) {
      return _generateRegularFunction(func, jsDoc);
    }

    final expr = exprGen.generate(exprBody, parenthesize: false);

    // ✅ FIXED: Only use 'const' for arrow functions (not function declarations)
    // 'const' signals this is an immutable function assignment
    return 'const ${func.name} = ($params) => $expr;';
  }

  String _generateMethod(MethodDecl method, {bool isStatic = false}) {
    final buffer = StringBuffer();

    // ✅ COMPLETE FIX: Generate JSDoc with ALL type information
    final jsDoc = config.generateJSDoc ? _generateMethodJSDoc(method) : '';
    if (jsDoc.isNotEmpty) {
      buffer.writeln(jsDoc);
    }

    // ✅ NEW: Generate @override if annotation exists
    if (_hasOverrideAnnotation(method)) {
      buffer.writeln(indenter.line('// @override'));
    }

    // Static keyword
    if (isStatic) {
      buffer.write('static ');
    }

    // Getter/Setter keywords
    if (method.isGetter) {
      buffer.write('get ');
    } else if (method.isSetter) {
      buffer.write('set ');
    }

    // Async/Generator keywords
    if (method.isAsync && method.isGenerator) {
      buffer.write('async* ');
    } else if (method.isAsync) {
      buffer.write('async ');
    } else if (method.isGenerator) {
      buffer.write('* ');
    }

    // Method name and parameters
    final params = _generateParameterList(method.parameters);
    buffer.writeln('${method.name}($params) {');

    indenter.indent();

    if (method.body == null) {
      if (!method.isAbstract) {
        buffer.writeln(indenter.line('// TODO: Implement ${method.name}'));
      }
    } else if (method.body!.statements.isEmpty) {
      buffer.writeln(indenter.line('// Empty method body'));
    } else {
      for (final stmt in method.body!.statements) {
        // ✅ Pass method context to statement generator
        buffer.writeln(
          stmtGen.generateWithContext(stmt, functionContext: method),
        );
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateConstructor(ConstructorDecl ctor, String className) {
    final buffer = StringBuffer();

    // ✅ NEW: Generate JSDoc for constructor
    final jsDoc = config.generateJSDoc ? _generateConstructorJSDoc(ctor) : '';
    if (jsDoc.isNotEmpty) {
      buffer.writeln(jsDoc);
    }

    final constructorName = ctor.constructorName != null
        ? ' ${ctor.constructorName}'
        : '';

    final params = _generateParameterList(ctor.parameters);

    buffer.writeln('constructor$constructorName($params) {');
    indenter.indent();

    // ✅ NEW: Handle super() call if this is a subclass constructor
    if (ctor.superCall != null) {
      buffer.writeln(indenter.line('super();'));
    }

    // ✅ NEW: Generate field initializers
    for (final init in ctor.initializers) {
      final value = exprGen.generate(init.value, parenthesize: false);
      buffer.writeln(indenter.line('this.${init.fieldName} = $value;'));
    }

    // ✅ NEW: Auto-initialize parameters matching fields
    for (final param in ctor.parameters) {
      if (!ctor.initializers.any((i) => i.fieldName == param.name)) {
        buffer.writeln(indenter.line('this.${param.name} = ${param.name};'));
      }
    }

    if (ctor.body == null) {
      buffer.writeln(indenter.line('// TODO: Constructor body'));
    } else if (ctor.body!.statements.isEmpty) {
      // Empty - already handled with initializers
    } else {
      for (final stmt in ctor.body!.statements) {
        buffer.writeln(stmtGen.generate(stmt));
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateConstructorJSDoc(ConstructorDecl ctor) {
    if (!config.generateJSDoc) return '';

    final buffer = StringBuffer();
    buffer.writeln('/**');

    // ✅ Document constructor parameters
    for (final param in ctor.parameters) {
      final typeStr = _typeToJSDocType(param.type);
      final nullable = param.type?.isNullable ?? false;
      final fullType = nullable ? '$typeStr|null' : typeStr;

      buffer.writeln(' * @param {$fullType} ${param.name}');
    }

    buffer.writeln(' */');

    return buffer.toString().trim();
  }
  // =========================================================================
  // BODY ANALYSIS - DETERMINE TYPE AND EXTRACT EXPRESSIONS
  // =========================================================================

  /// ✅ FIXED: Analyze body to determine its type
  FunctionBodyType _analyzeBodyType(FunctionBodyIR? body) {
    if (body == null) {
      return FunctionBodyType.none;
    }

    if (body.statements.isEmpty) {
      return FunctionBodyType.empty;
    }

    if (body.statements.length == 1) {
      final stmt = body.statements.first;

      if (stmt is ReturnStmt) {
        return FunctionBodyType.singleReturn;
      }

      if (stmt is ExpressionStmt) {
        return FunctionBodyType.singleExpression;
      }
    }

    if (body.statements.length > 1) {
      return FunctionBodyType.multipleStatements;
    }

    return FunctionBodyType.unknown;
  }

  /// ✅ NEW: Check if function has a non-void return type
  bool _isNonVoidType(TypeIR? returnType) {
    if (returnType == null) return false;
    final typeName = returnType.displayName();
    return typeName != 'void' && typeName != 'Null';
  }

  bool _canBeArrowFunction(FunctionBodyType bodyType, FunctionBodyIR? body) {
    if (bodyType == FunctionBodyType.singleReturn ||
        bodyType == FunctionBodyType.singleExpression) {
      return _extractExpressionFromBody(body, bodyType) != null;
    }
    return false;
  }

  /// ✅ FIXED: Extract expression from single-statement body
  ExpressionIR? _extractExpressionFromBody(
    FunctionBodyIR? body,
    FunctionBodyType bodyType,
  ) {
    if (body == null || body.statements.isEmpty) {
      return null;
    }

    try {
      if (bodyType == FunctionBodyType.singleReturn) {
        final stmt = body.statements.first;
        if (stmt is ReturnStmt) {
          return stmt.expression;
        }
      } else if (bodyType == FunctionBodyType.singleExpression) {
        final stmt = body.statements.first;
        if (stmt is ExpressionStmt) {
          return stmt.expression;
        }
      }
    } catch (e) {
      return null;
    }

    return null;
  }

  // =========================================================================
  // PARAMETER HANDLING
  // =========================================================================

  String _generateParameterList(List<ParameterDecl> parameters) {
    if (parameters.isEmpty) {
      return '';
    }

    final required = parameters
        .where((p) => p.isRequired && !p.isNamed)
        .toList();

    final optional = parameters
        .where((p) => !p.isRequired && !p.isNamed && p.isPositional)
        .toList();

    final named = parameters.where((p) => p.isNamed).toList();

    final parts = <String>[];

    // Required positional parameters
    parts.addAll(required.map((p) => p.name));

    // Optional positional parameters with defaults
    for (final param in optional) {
      final def = param.defaultValue != null
          ? exprGen.generate(param.defaultValue!, parenthesize: false)
          : 'undefined';
      parts.add('${param.name} = $def');
    }

    // Named parameters → object destructuring
    if (named.isNotEmpty) {
      final namedParts = named
          .map((p) {
            final def = p.defaultValue != null
                ? exprGen.generate(p.defaultValue!, parenthesize: false)
                : 'undefined';
            return '${p.name} = $def';
          })
          .join(', ');

      parts.add('{ $namedParts } = {}');
    }

    return parts.join(', ');
  }

  // =========================================================================
  // JSDOC GENERATION
  // =========================================================================

  // =========================================================================
  // JSDOC GENERATION - ✅ ENHANCED WITH PROPER TYPE INFO
  // =========================================================================

  String _generateMethodJSDoc(MethodDecl method) {
    if (!config.generateJSDoc) return '';

    final buffer = StringBuffer();
    buffer.writeln('/**');

    // ✅ ENHANCED: Generate parameter documentation with types and nullability
    for (final param in method.parameters) {
      final typeStr = _typeToJSDocType(param.type);
      final nullable = param.type?.isNullable ?? false;
      final fullType = nullable ? '$typeStr|null' : typeStr;

      // ✅ NEW: Include parameter description if available
      buffer.writeln(' * @param {$fullType} ${param.name}');
    }

    // ✅ FIXED: Include return type documentation for non-void methods
    final returnType = _typeToJSDocType(method.returnType);
    if (returnType != 'void') {
      final nullable = method.returnType?.isNullable ?? false;
      final fullType = nullable ? '$returnType|null' : returnType;
      buffer.writeln(' * @returns {$fullType}');
    }

    // ✅ NEW: Add @override tag if present
    if (_hasOverrideAnnotation(method)) {
      buffer.writeln(' * @override');
    }

    // Async marker
    if (method.isAsync) {
      buffer.writeln(' * @async');
    }

    // Generator marker
    if (method.isGenerator) {
      buffer.writeln(' * @generator');
    }

    buffer.writeln(' */');

    return buffer.toString().trim();
  }

  String _generateFunctionJSDoc(FunctionDecl func) {
    if (!config.generateJSDoc) return '';

    final buffer = StringBuffer();
    buffer.writeln('/**');

    // ✅ Enhanced parameter documentation
    for (final param in func.parameters) {
      final typeStr = _typeToJSDocType(param.type);
      final nullable = param.type?.isNullable ?? false;
      final fullType = nullable ? '$typeStr|null' : typeStr;

      buffer.writeln(' * @param {$fullType} ${param.name}');
    }

    // ✅ Return type documentation
    final returnType = _typeToJSDocType(func.returnType);
    if (returnType != 'void') {
      final nullable = func.returnType?.isNullable ?? false;
      final fullType = nullable ? '$returnType|null' : returnType;
      buffer.writeln(' * @returns {$fullType}');
    }

    // Async marker
    if (func.isAsync) {
      buffer.writeln(' * @async');
    }

    // Generator marker
    if (func.isGenerator) {
      buffer.writeln(' * @generator');
    }

    buffer.writeln(' */');

    return buffer.toString().trim();
  }

  bool _hasOverrideAnnotation(MethodDecl method) {
    return method.annotations.any((ann) => ann.name == 'override');
  }

  String _typeToJSDocType(TypeIR? type) {
    if (type == null) return 'any';

    final typeName = type.displayName();

    switch (typeName) {
      case 'String':
        return 'string';
      case 'int':
      case 'double':
      case 'num':
        return 'number';
      case 'bool':
        return 'boolean';
      case 'void':
      case 'Null':
        return 'void';
      case 'List':
      case 'Iterable':
        return 'Array';
      case 'Map':
        return 'Object';
      case 'Set':
        return 'Set';
      case 'Future':
      case 'Promise':
        return 'Promise';
      case 'Stream':
        return 'AsyncIterable';
      case 'dynamic':
        return 'any';
      case 'Widget':
        return 'Widget';
      case 'BuildContext':
        return 'BuildContext';
      default:
        return typeName;
    }
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  List<CodeGenError> getErrors() => List.unmodifiable(errors);

  void clearErrors() {
    errors.clear();
  }
}
