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
import '../parameter/parameter_code_gen.dart';
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
  final ParameterCodeGen paramGen;
  ClassDecl? _currentClassContext;

  FunctionCodeGen({
    FunctionGenConfig? config,
    StatementCodeGen? stmtGen,
    ExpressionCodeGen? exprGen,
    ParameterCodeGen? paramGen,
    FlutterPropConverter? propConverter,
    ClassDecl? currentClassContext, // ✅ Add this
  }) : propConverter = propConverter ?? FlutterPropConverter(),
       config = config ?? const FunctionGenConfig(),
       stmtGen = stmtGen ?? StatementCodeGen(),
       _currentClassContext = currentClassContext,
       paramGen =
           paramGen ??
           ParameterCodeGen(exprGen: exprGen ?? ExpressionCodeGen()),
       exprGen =
           exprGen ??
           ExpressionCodeGen(currentClassContext: currentClassContext) {
    indenter = Indenter(this.config.indent);
  }

  // ✅ Add method to set context dynamically if needed
  void setClassContext(ClassDecl? cls) {
    _currentClassContext = cls;
    exprGen.setClassContext(cls);
    // ✅ FIX: Also propogate context to StatementCodeGen's expression generator
    stmtGen.exprGen.setClassContext(cls);
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
  String generateConstructor(
    ConstructorDecl ctor,
    String className, {
    bool hasSuperclass = false,
  }) {
    try {
      return _generateConstructor(
        ctor,
        className,
        hasSuperclass: hasSuperclass,
      );
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

    final params = paramGen.generate(func.parameters);

    buffer.writeln('$header ${func.name}($params) {');
    indenter.indent();

    if (func.body == null) {
      buffer.writeln(indenter.line('// TODO: Implement ${func.name}'));
    } else if (func.body!.statements.isEmpty) {
      buffer.writeln(indenter.line('// Empty function body'));
    } else {
      for (final stmt in func.body!.statements) {
        // ✅ DEBUG: Inspect main function statements
        if (func.name == 'main') {
          print('[FunctionCodeGen] 🔍 Inspecting stmt: ${stmt.runtimeType}');
          if (stmt is ExpressionStmt) {
            if (stmt.expression is FunctionCallExpr) {
              print(
                '  -> FunctionCallExpr: "${(stmt.expression as FunctionCallExpr).functionName}"',
              );
            } else {
              try {
                final tempCode = exprGen.generate(stmt.expression);
                print('  -> Expression Code: "$tempCode"');
              } catch (e) {
                print('  -> Error generating code snippet: $e');
              }
            }
          }
        }

        bool isRunApp = false;
        if (func.name == 'main') {
          if (_isRunAppCall(stmt)) {
            isRunApp = true;
          } else if (stmt is ExpressionStmt) {
            // Fallback: Check string generation
            try {
              final code = exprGen.generate(stmt.expression);
              if (code.trim().startsWith('runApp(')) {
                isRunApp = true;
                print('[FunctionCodeGen] ⚠️ Detected runApp via string check');
              }
            } catch (_) {}
          }
        }

        // ✅ SPECIAL HANDLING: main()
        if (isRunApp) {
          print(
            '[FunctionCodeGen] 🔄 Transforming main() runApp call to return statement',
          );

          String? widgetCode;

          // Try to extract from AST first
          if (stmt is ExpressionStmt && stmt.expression is FunctionCallExpr) {
            final callExpr = stmt.expression as FunctionCallExpr;
            if (callExpr.arguments.isNotEmpty) {
              widgetCode = exprGen.generate(callExpr.arguments.first);
            }
          }

          // Fallback: extract from string
          if (widgetCode == null && stmt is ExpressionStmt) {
            final fullCode = exprGen.generate(
              stmt.expression,
            ); // runApp(new MyApp())
            final startParams = fullCode.indexOf('(');
            final endParams = fullCode.lastIndexOf(')');
            if (startParams != -1 && endParams != -1) {
              widgetCode = fullCode.substring(startParams + 1, endParams);
            }
          }

          if (widgetCode != null) {
            buffer.writeln(indenter.line('return $widgetCode;'));
            continue;
          }
        }

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
    final params = paramGen.generate(func.parameters);

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
    final params = paramGen.generate(method.parameters);

    // Sanitize method name for operators
    final methodName = _sanitizeMethodName(method.name);

    // ✅ FIXED: Use arrow functions for private methods to preserve 'this' context in callbacks
    // Exception: Generators cannot be arrow functions
    final useArrowFunction = false; // Generate all methods as standard methods

    if (useArrowFunction) {
      // Arrow function syntax: _methodName = (params) => {
      // Async handling: _methodName = async (params) => {
      buffer.write('$methodName = ');
      if (method.isAsync) buffer.write('async ');
      buffer.writeln('($params) => {');
    } else {
      // Standard method syntax
      buffer.writeln('$methodName($params) {');
    }

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

    // Check if we need semicolon (for class fields) or not (for methods)
    if (useArrowFunction) {
      buffer.write(indenter.line('};'));
    } else {
      buffer.write(indenter.line('}'));
    }

    return buffer.toString().trim();
  }

  String _generateConstructor(
    ConstructorDecl ctor,
    String className, {
    bool hasSuperclass = false,
  }) {
    final buffer = StringBuffer();

    // ✅ NEW: Generate JSDoc for constructor
    final jsDoc = config.generateJSDoc ? _generateConstructorJSDoc(ctor) : '';
    if (jsDoc.isNotEmpty) {
      buffer.writeln(jsDoc);
    }

    final isStaticMethod = ctor.isFactory || ctor.isNamedConstructor;
    final params = paramGen.generate(ctor.parameters);

    if (isStaticMethod) {
      // Named or Factory constructor becomes a static method
      final methodName = ctor.constructorName ?? 'create';
      buffer.writeln('static $methodName($params) {');
    } else {
      // Unnamed generative constructor becomes the JS constructor
      buffer.writeln('constructor($params) {');
    }

    indenter.indent();

    if (isStaticMethod && !ctor.isFactory) {
      // Named generative: needs to create an instance
      buffer.writeln(indenter.line('const instance = new $className();'));
    }

    // Handle super() call (only for primary constructor)
    if (!isStaticMethod) {
      final superParams = ctor.parameters
          .where((p) => p.origin == ParameterOrigin.superParam)
          .map((p) => p.name)
          .join(', ');

      if (ctor.superCall != null || superParams.isNotEmpty) {
        buffer.writeln(indenter.line('super($superParams);'));
      } else if (hasSuperclass) {
        final hasKey = ctor.parameters.any((p) => p.name == 'key');
        if (hasKey) {
          buffer.writeln(indenter.line('super(key);'));
        } else {
          buffer.writeln(indenter.line('super();'));
        }
      }
    }

    // Initialize fields
    for (final param in ctor.parameters) {
      if (ctor.initializers.any((i) => i.fieldName == param.name)) {
        continue;
      }

      final target = isStaticMethod && !ctor.isFactory ? 'instance' : 'this';

      switch (param.origin) {
        case ParameterOrigin.field:
        case ParameterOrigin.superParam:
          buffer.writeln(
            indenter.line('$target.${param.name} = ${param.name};'),
          );
          break;
        case ParameterOrigin.normal:
          // In Dart, normal parameters in constructors don't auto-assign
          break;
      }
    }

    // Constructor body
    if (ctor.body != null && ctor.body!.statements.isNotEmpty) {
      if (isStaticMethod && !ctor.isFactory) {
        // Wrap body in a closure using .call(instance) to correctly bind 'this'
        buffer.writeln(indenter.line('(function() {'));
        indenter.indent();
        for (final stmt in ctor.body!.statements) {
          buffer.writeln(stmtGen.generate(stmt));
        }
        indenter.dedent();
        buffer.writeln(indenter.line('}).call(instance);'));
      } else {
        // Normal body (or factory body which already has returns)
        for (final stmt in ctor.body!.statements) {
          buffer.writeln(stmtGen.generate(stmt));
        }
      }
    } else if (ctor.body == null && !ctor.isFactory) {
      buffer.writeln(indenter.line('// No implementation body'));
    }

    if (isStaticMethod && !ctor.isFactory) {
      buffer.writeln(indenter.line('return instance;'));
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateConstructorJSDoc(ConstructorDecl ctor) {
    if (!config.generateJSDoc) return '';

    final buffer = StringBuffer();
    buffer.writeln('/**');

    // ✅ NEW: Use ParameterCodeGen for parameter docs
    buffer.writeln(paramGen.generateJSDoc(ctor.parameters));

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
  // JSDOC GENERATION
  // =========================================================================

  // =========================================================================
  // JSDOC GENERATION - ✅ ENHANCED WITH PROPER TYPE INFO
  // =========================================================================

  String _generateMethodJSDoc(MethodDecl method) {
    final buffer = StringBuffer();
    buffer.writeln('/**');

    // ✅ NEW: Use ParameterCodeGen for parameter docs
    buffer.writeln(paramGen.generateJSDoc(method.parameters));

    // Fixed: Include return type documentation
    final returnType = _typeToJSDocType(method.returnType);
    if (returnType != 'void') {
      final nullable = method.returnType.isNullable;
      final fullType = nullable ? '$returnType|null' : returnType;
      buffer.writeln(' * @returns {$fullType}');
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

    // ✅ NEW: Use ParameterCodeGen for parameter docs
    buffer.writeln(paramGen.generateJSDoc(func.parameters));

    // Return type documentation
    final returnType = _typeToJSDocType(func.returnType);
    if (returnType != 'void') {
      final nullable = func.returnType.isNullable;
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

  // ✅ HELPER: Check if statement is runApp(...)
  bool _isRunAppCall(StatementIR stmt) {
    if (stmt is ExpressionStmt && stmt.expression is FunctionCallExpr) {
      final call = stmt.expression as FunctionCallExpr;
      // Fixed: FunctionCallExpr uses functionName property, not function expression
      return call.functionName == 'runApp';
    }
    return false;
  }

  // ✅ HELPER: Sanitize method names for JavaScript compatibility
  String _sanitizeMethodName(String name) {
    // Handle Dart operator methods
    String operator = name;
    if (name.startsWith('operator')) {
      // Extract the operator symbol
      operator = name.substring(8).trim(); // Remove "operator" prefix
    }

    // Map Dart operators to valid JS method names
    switch (operator) {
      case '[]':
        return 'get'; // Index getter: obj[index] -> obj.get(index)
      case '[]=':
        return 'set'; // Index setter: obj[index] = value -> obj.set(index, value)
      case '+':
        return 'add';
      case '-':
        return 'subtract';
      case '*':
        return 'multiply';
      case '/':
        return 'divide';
      case '~/':
        return 'intDivide';
      case '%':
        return 'modulo';
      case '==':
        return 'equals';
      case '<':
        return 'lessThan';
      case '>':
        return 'greaterThan';
      case '<=':
        return 'lessOrEqual';
      case '>=':
        return 'greaterOrEqual';
      case '~':
        return 'bitwiseNot';
      case '&':
        return 'bitwiseAnd';
      case '|':
        return 'bitwiseOr';
      case '^':
        return 'bitwiseXor';
      case '<<':
        return 'shiftLeft';
      case '>>':
        return 'shiftRight';
      case '>>>':
        return 'unsignedShiftRight';
      default:
        // If it starts with 'operator' but we don't recognize it
        if (name.startsWith('operator')) {
          return 'operator_${operator.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_')}';
        }
        // Otherwise return as-is
        return name;
    }
  }
}
