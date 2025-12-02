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

    // ✅ FIX 1: Don't use 'const' keyword for function declarations
    // const is only for variables/fields, not functions
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

    // ✅ FIX 2: Regular function header (never use const)
    buffer.writeln('$header ${func.name}($params) {');
    indenter.indent();

    if (func.body == null) {
      buffer.writeln(indenter.line('// TODO: Implement ${func.name}'));
    } else if (func.body!.statements.isEmpty) {
      buffer.writeln(indenter.line('// Empty function body'));
    } else {
      for (final stmt in func.body!.statements) {
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
    // ✅ ONLY use arrow functions if:
    // 1. Single return or single expression
    // 2. NOT async or generator
    // 3. NOT main() or other entry points

    final params = _generateParameterList(func.parameters);

    // Extract the expression from body
    ExpressionIR? exprBody = _extractExpressionFromBody(func.body, bodyType);

    if (exprBody == null) {
      // Fall back to regular function if can't extract expression
      return _generateRegularFunction(func, jsDoc);
    }

    final expr = exprGen.generate(exprBody, parenthesize: false);

    // ✅ FIX 3: Use 'const' or 'let' only for variable declarations
    // Use 'const' only if function is truly immutable and simple
    final keyword = _shouldUseConst(func) ? 'const' : 'let';

    // ✅ Arrow function format (no 'const' prefix for top-level)
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

    // âœ… FIXED: body is now FunctionBodyIR?
    if (method.body == null) {
      if (!method.isAbstract) {
        buffer.writeln(indenter.line('// TODO: Implement ${method.name}'));
      }
    } else if (method.body!.statements.isEmpty) {
      buffer.writeln(indenter.line('// Empty method body'));
    } else {
      for (final stmt in method.body!.statements) {
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

    // âœ… FIXED: body is now FunctionBodyIR?
    if (ctor.body == null) {
      buffer.writeln(indenter.line('// TODO: Constructor body'));
    } else if (ctor.body!.statements.isEmpty) {
      buffer.writeln(indenter.line('// Empty constructor body'));
    } else {
      for (final stmt in ctor.body!.statements) {
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
  FunctionBodyType _analyzeBodyType(FunctionBodyIR? body) {
    if (body == null) {
      return FunctionBodyType.none;
    }

    // Check statements list length
    if (body.statements.isEmpty) {
      return FunctionBodyType.empty;
    }

    if (body.statements.length == 1) {
      final stmt = body.statements.first;

      // Single return statement
      if (stmt is ReturnStmt) {
        return FunctionBodyType.singleReturn;
      }

      // Single expression statement
      if (stmt is ExpressionStmt) {
        return FunctionBodyType.singleExpression;
      }
    }

    // ✅ Multiple statements = MUST be regular function
    if (body.statements.length > 1) {
      return FunctionBodyType.multipleStatements;
    }

    return FunctionBodyType.unknown;
  }

  bool _canBeArrowFunction(FunctionBodyType bodyType, FunctionBodyIR? body) {
    // ✅ Only these types can be arrows:
    if (bodyType == FunctionBodyType.singleReturn ||
        bodyType == FunctionBodyType.singleExpression) {
      return _extractExpressionFromBody(body, bodyType) != null;
    }

    // Everything else must be regular function
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

    // ✅ NEW: Separate by type including isPositional
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

  /// Determine if function should use const keyword
  /// ✅ FIX 4: Determine if should use const
  bool _shouldUseConst(FunctionDecl func) {
    // Use const only for arrow functions that are immutable
    // Regular functions should never use const
    if (!func.isAsync && !func.isGenerator) {
      // Only if body is single expression with no side effects
      return true;
    }
    return false;
  }
}
