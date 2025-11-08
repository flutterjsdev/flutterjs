// ============================================================================
// PHASE 2.3: FUNCTION/METHOD CODE GENERATOR
// ============================================================================
// Converts all Dart function/method IR types to JavaScript code
// Handles regular, arrow, async, generators, constructors, getters/setters
// ============================================================================

import 'package:collection/collection.dart';
import '../../ast_ir/ast_it.dart';
import 'expression_code_generator.dart';
import 'statement_code_generator.dart';

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
// MAIN FUNCTION CODE GENERATOR
// ============================================================================

class FunctionCodeGen {
  final FunctionGenConfig config;
  final StatementCodeGen stmtGen;
  final ExpressionCodeGen exprGen;
  late Indenter indenter;
  final List<CodeGenError> errors = [];

  FunctionCodeGen({
    FunctionGenConfig? config,
    StatementCodeGen? stmtGen,
    ExpressionCodeGen? exprGen,
  })  : config = config ?? const FunctionGenConfig(),
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

    // Check if this is a simple arrow function candidate
    // (single expression, not async, not generator)
    if (config.useArrowFunctions &&
        !func.isAsync &&
        !func.isGenerator &&
        _isSimpleExpression(func)) {
      return _generateArrowFunction(func, jsDoc);
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

    // Function body
    if (func.body != null) {
      if (func.body is BlockStmt) {
        for (final stmt in (func.body as BlockStmt).statements) {
          buffer.writeln(stmtGen.generate(stmt));
        }
      } else {
        // Expression body - wrap in return
        final expr = exprGen.generate(func.body as ExpressionIR, parenthesize: false);
        buffer.writeln(indenter.line('return $expr;'));
      }
    } else {
      buffer.writeln(indenter.line('// TODO: Implement ${func.name}'));
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  String _generateArrowFunction(FunctionDecl func, String jsDoc) {
    final params = _generateParameterList(func.parameters);

    // Get expression body
    ExpressionIR? exprBody;
    if (func.body is ExpressionIR) {
      exprBody = func.body as ExpressionIR;
    }

    if (exprBody == null) {
      // Fall back to regular function if no expression body
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

    // Method body
    if (method.body != null) {
      if (method.body is BlockStmt) {
        for (final stmt in (method.body as BlockStmt).statements) {
          buffer.writeln(stmtGen.generate(stmt));
        }
      } else {
        // Expression body
        final expr = exprGen.generate(method.body as ExpressionIR, parenthesize: false);
        buffer.writeln(indenter.line('return $expr;'));
      }
    } else if (!method.isAbstract) {
      buffer.writeln(indenter.line('// TODO: Implement ${method.name}'));
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

    // Constructor body (if any)
    // TODO: Parse and generate constructor body from IR

    buffer.writeln(indenter.line('// TODO: Constructor body'));

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  // =========================================================================
  // PARAMETER HANDLING
  // =========================================================================

  String _generateParameterList(List<ParameterDecl> parameters) {
    if (parameters.isEmpty) {
      return '';
    }

    // Separate parameters by type
    final required = parameters.where((p) => p.isRequired && !p.isNamed).toList();
    final optional = parameters.where((p) => !p.isRequired && !p.isNamed).toList();
    final named = parameters.where((p) => p.isNamed).toList();

    final parts = <String>[];

    // Required positional parameters
    parts.addAll(required.map((p) => _generateParameter(p)));

    // Optional positional parameters with defaults
    for (final param in optional) {
      final def = param.defaultValue != null
          ? exprGen.generate(param.defaultValue!, parenthesize: false)
          : 'undefined';
      parts.add('${param.name} = $def');
    }

    // Named parameters → object destructuring
    if (named.isNotEmpty) {
      final namedParts = named.map((p) {
        final def = p.defaultValue != null
            ? exprGen.generate(p.defaultValue!, parenthesize: false)
            : 'undefined';
        return '${p.name} = $def';
      }).join(', ');

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

  /// Check if function body is a simple expression
  bool _isSimpleExpression(FunctionDecl func) {
    if (func.body == null) return false;
    return func.body is ExpressionIR && func.body is! MethodCallExpressionIR;
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

// ============================================================================
// HELPER: INDENTER (shared with StatementCodeGen)
// ============================================================================

class Indenter {
  String _indent;
  int _level = 0;

  Indenter(this._indent);

  void indent() => _level++;
  void dedent() {
    if (_level > 0) _level--;
  }

  String get current => _indent * _level;
  String get next => _indent * (_level + 1);

  String line(String code) => '$current$code';
}

// ============================================================================
// EXAMPLE CONVERSIONS
// ============================================================================

/*
EXAMPLE 1: Simple Arrow Function
──────────────────────────────────
Dart:
  int add(int a, int b) => a + b;

JavaScript:
  const add = (a, b) => a + b;


EXAMPLE 2: Function with Named Parameters
──────────────────────────────────────────
Dart:
  void configure({String host = 'localhost', int port = 8080}) {
    print('$host:$port');
  }

JavaScript:
  function configure({host = 'localhost', port = 8080} = {}) {
    console.log(`${host}:${port}`);
  }


EXAMPLE 3: Async Function
─────────────────────────
Dart:
  Future<String> fetchData() async {
    return await http.get('/api/data');
  }

JavaScript:
  async function fetchData() {
    return await http.get('/api/data');
  }


EXAMPLE 4: Generator Function
─────────────────────────────
Dart:
  Iterable<int> count(int max) sync* {
    for (int i = 0; i < max; i++) {
      yield i;
    }
  }

JavaScript:
  function* count(max) {
    for (let i = 0; i < max; i++) {
      yield i;
    }
  }


EXAMPLE 5: Async Generator
──────────────────────────
Dart:
  Stream<String> fetchLines() async* {
    for await (String line in input) {
      yield line;
    }
  }

JavaScript:
  async function* fetchLines() {
    for await (const line of input) {
      yield line;
    }
  }


EXAMPLE 6: Method with JSDoc
────────────────────────────
Dart:
  String greet(String name) => 'Hello, $name!';

JavaScript:
  /**
   * @param {string} name
   * @returns {string}
   */
  greet(name) {
    return `Hello, ${name}!`;
  }


EXAMPLE 7: Constructor
─────────────────────
Dart:
  class Point {
    int x, y;
    Point(this.x, this.y);
  }

JavaScript:
  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }


EXAMPLE 8: Getter/Setter
───────────────────────
Dart:
  class Rectangle {
    int _width;
    int get width => _width;
    set width(int w) => _width = w;
  }

JavaScript:
  class Rectangle {
    constructor(width) {
      this._width = width;
    }
    
    get width() {
      return this._width;
    }
    
    set width(w) {
      this._width = w;
    }
  }


EXAMPLE 9: Static Method
───────────────────────
Dart:
  class Math {
    static int abs(int x) => x < 0 ? -x : x;
  }

JavaScript:
  class Math {
    static abs(x) {
      return x < 0 ? -x : x;
    }
  }


EXAMPLE 10: Method with Optional Parameters
────────────────────────────────────────────
Dart:
  String format(String str, {int width = 10, bool uppercase = false}) {
    return uppercase ? str.toUpperCase() : str;
  }

JavaScript:
  function format(str, {width = 10, uppercase = false} = {}) {
    return uppercase ? str.toUpperCase() : str;
  }
*/