// ============================================================================
// PHASE 2.3: FUNCTION/METHOD CODE GENERATOR
// ============================================================================
// Converts all Dart function/method IR types to JavaScript code
// Handles regular, arrow, async, generators, constructors, getters/setters
// ============================================================================

import 'package:collection/collection.dart';
import 'package:flutterjs_core/src/flutter_to_js/src/flutter_prop_converters.dart';
import 'package:flutterjs_core/src/flutter_to_js/src/utils/code_gen_error.dart';
import '../../../ast_it.dart';
import 'expression_code_generator.dart';
import 'statement_code_generator.dart';
import 'utils/indenter.dart';

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
    this.generateJSDoc = false,
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
    // Generate JSDoc if enabled
    final jsDoc = config.generateJSDoc ? _generateJSDoc(func) : '';

    // ✅ FIXED: Check body type to determine if arrow function is possible
    final bodyType = _analyzeBodyType(func.body);

    // Check if this is a simple arrow function candidate
    // (single expression/return, not async, not generator)
    if (config.useArrowFunctions &&
        !func.isAsync &&
        !func.isGenerator &&
        _canBeArrowFunction(bodyType, func.body)) {
      return _generateArrowFunction(func, jsDoc, bodyType);
    }

    // Otherwise generate as regular function
    return _generateRegularFunction(func, jsDoc);
  }

  String _generateRegularFunction(FunctionDecl func, String jsDoc) {
    final buffer = StringBuffer();

    if (jsDoc.isNotEmpty) {
      buffer.writeln(jsDoc);
    }

    // Function keyword and async/generator modifiers
    String header = 'function';

    if (func.isAsync && func.isGenerator) {
      header = 'async function*';
    } else if (func.isAsync) {
      header = 'async function';
    } else if (func.isGenerator) {
      header = 'function*';
    }

    // Parameters
    final params = _generateParameterList(func.parameters);

    buffer.writeln('$header ${func.name}($params) {');
    indenter.indent();

    // ✅ FIXED: body is now List<StatementIR>?
    if (func.body == null) {
      buffer.writeln(indenter.line('// TODO: Implement ${func.name}'));
    } else if (func.body!.isEmpty) {
      buffer.writeln(indenter.line('// Empty function body'));
    } else {
      for (final stmt in func.body!) {
        buffer.writeln(stmtGen.generate(stmt));
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

    // Extract the expression from body
    ExpressionIR? exprBody = _extractExpressionFromBody(func.body, bodyType);

    if (exprBody == null) {
      // Fall back to regular function if can't extract expression
      return _generateRegularFunction(func, jsDoc);
    }

    final expr = exprGen.generate(exprBody, parenthesize: false);

    // Wrap in const/let for top-level functions
    final keyword = _shouldUseConst(func) ? 'const' : 'let';

    return '$keyword ${func.name} = ($params) => $expr;';
  }

  String _generateMethod(MethodDecl method, {bool isStatic = false}) {
    final buffer = StringBuffer();

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

    // ✅ FIXED: body is now List<StatementIR>?
    if (method.body == null) {
      if (!method.isAbstract) {
        buffer.writeln(indenter.line('// TODO: Implement ${method.name}'));
      }
    } else if (method.body!.isEmpty) {
      buffer.writeln(indenter.line('// Empty method body'));
    } else {
      for (final stmt in method.body!) {
        buffer.writeln(stmtGen.generate(stmt));
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateConstructor(ConstructorDecl ctor, String className) {
    final buffer = StringBuffer();

    // Constructor keyword
    final constructorName = ctor.constructorName != null
        ? ' ${ctor.constructorName}'
        : '';

    final params = _generateParameterList(ctor.parameters);

    buffer.writeln('constructor$constructorName($params) {');
    indenter.indent();

    // Call super if needed
    // TODO: Check if superclass exists and call super()

    // Field initializers
    for (final param in ctor.parameters) {
      // If parameter name matches a field name, initialize it
      buffer.writeln(indenter.line('this.${param.name} = ${param.name};'));
    }

    // ✅ FIXED: body is now List<StatementIR>?
    if (ctor.body == null) {
      buffer.writeln(indenter.line('// TODO: Constructor body'));
    } else if (ctor.body!.isEmpty) {
      buffer.writeln(indenter.line('// Empty constructor body'));
    } else {
      for (final stmt in ctor.body!) {
        buffer.writeln(stmtGen.generate(stmt));
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  // =========================================================================
  // BODY ANALYSIS - DETERMINE TYPE AND EXTRACT EXPRESSIONS
  // =========================================================================

  /// ✅ FIXED: Analyze body to determine its type
  FunctionBodyType _analyzeBodyType(List<StatementIR>? body) {
    if (body == null) {
      return FunctionBodyType.none;
    }

    if (body.isEmpty) {
      return FunctionBodyType.empty;
    }

    if (body.length == 1) {
      final stmt = body.first;

      // Single return statement
      if (stmt is ReturnStmt) {
        return FunctionBodyType.singleReturn;
      }

      // Single expression statement
      if (stmt is ExpressionStmt) {
        return FunctionBodyType.singleExpression;
      }
    }

    // Multiple statements
    if (body.length > 1) {
      return FunctionBodyType.multipleStatements;
    }

    return FunctionBodyType.unknown;
  }

  /// ✅ FIXED: Check if body can be converted to arrow function
  bool _canBeArrowFunction(FunctionBodyType bodyType, List<StatementIR>? body) {
    // Only singleReturn or singleExpression can be arrow functions
    if (bodyType == FunctionBodyType.singleReturn ||
        bodyType == FunctionBodyType.singleExpression) {
      // Verify we can actually extract an expression
      return _extractExpressionFromBody(body, bodyType) != null;
    }

    return false;
  }

  /// ✅ FIXED: Extract expression from single-statement body
  ExpressionIR? _extractExpressionFromBody(
    List<StatementIR>? body,
    FunctionBodyType bodyType,
  ) {
    if (body == null || body.isEmpty) {
      return null;
    }

    try {
      if (bodyType == FunctionBodyType.singleReturn) {
        final stmt = body.first;
        if (stmt is ReturnStmt) {
          return stmt.expression;
        }
      } else if (bodyType == FunctionBodyType.singleExpression) {
        final stmt = body.first;
        if (stmt is ExpressionStmt) {
          return stmt.expression;
        }
      }
    } catch (e) {
      // If extraction fails, return null to fall back to regular function
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
        .where((p) => !p.isRequired && !p.isNamed)
        .toList();
    final named = parameters.where((p) => p.isNamed).toList();

    final parts = <String>[];

    parts.addAll(required.map((p) => p.name));

    for (final param in optional) {
      String defValue = 'undefined';
      if (param.defaultValue != null) {
        final result = propConverter.convertProperty(
          param.name,
          param.defaultValue!,
          param.type.displayName(),
        );
        defValue = result.code;
      }
      parts.add('${param.name} = $defValue');
    }

    if (named.isNotEmpty) {
      final namedParts = named
          .map((p) {
            String defValue = 'undefined';
            if (p.defaultValue != null) {
              final result = propConverter.convertProperty(
                p.name,
                p.defaultValue!,
                p.type.displayName(),
              );
              defValue = result.code;
            }
            return '${p.name} = $defValue';
          })
          .join(', ');

      parts.add('{ $namedParts } = {}');
    }

    return parts.join(', ');
  }

  String _generateParameter(ParameterDecl param) {
    // Simple parameter name
    // Type information is lost in JS, but could be added as comments
    return param.name;
  }

  // =========================================================================
  // JSDOC GENERATION
  // =========================================================================

  String _generateJSDoc(FunctionDecl func) {
    if (!config.generateJSDoc) return '';

    final buffer = StringBuffer();

    buffer.writeln('/**');

    // Parameters documentation
    for (final param in func.parameters) {
      final type = _typeToJSDocType(param.type);
      buffer.writeln(' * @param {$type} ${param.name}');
    }

    // Return type documentation
    final returnType = _typeToJSDocType(func.returnType);
    if (returnType != 'void') {
      buffer.writeln(' * @returns {$returnType}');
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

  String _typeToJSDocType(TypeIR type) {
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
      default:
        return typeName;
    }
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /// ✅ FIXED: Properly check if function body is simple expression
  bool _isSimpleExpression(FunctionDecl func) {
    final bodyType = _analyzeBodyType(func.body);
    return _canBeArrowFunction(bodyType, func.body);
  }

  /// Determine if function should use const keyword
  bool _shouldUseConst(FunctionDecl func) {
    // Functions are const if they have no side effects
    // For now, assume all arrow functions can be const
    return true;
  }

  /// Check if parameter has default value
  bool _hasDefaultValue(ParameterDecl param) {
    return param.defaultValue != null;
  }

  /// Format parameter with type annotation in comment
  String _formatParameterWithType(ParameterDecl param) {
    final typeHint = '/* ${param.type.displayName()} */';
    return '${param.name} $typeHint';
  }
}
