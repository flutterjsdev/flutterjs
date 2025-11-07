import 'dart:typed_data';
import 'package:collection/collection.dart';

import '../../../flutterjs_core.dart';
import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';

// ============================================================================
// PART 1: ERROR HANDLING & CONFIGURATION
// ============================================================================

enum ErrorSeverity { FATAL, ERROR, WARNING, INFO }

class GenerationError {
  final String message;
  final ErrorSeverity severity;
  final String? suggestion;
  final int? lineNumber;

  GenerationError({
    required this.message,
    required this.severity,
    this.suggestion,
    this.lineNumber,
  });

  @override
  String toString() =>
      '${severity.name}: $message${suggestion != null ? '\nSuggestion: $suggestion' : ''}';
}

class ErrorCollector {
  final List<GenerationError> errors = [];

  void addError(GenerationError error) {
    errors.add(error);
  }

  void error(String message, {String? suggestion}) {
    addError(
      GenerationError(
        message: message,
        severity: ErrorSeverity.ERROR,
        suggestion: suggestion,
      ),
    );
  }

  void warning(String message) {
    addError(
      GenerationError(message: message, severity: ErrorSeverity.WARNING),
    );
  }

  bool hasErrors() => errors.any((e) => e.severity == ErrorSeverity.ERROR);
  int get errorCount =>
      errors.where((e) => e.severity == ErrorSeverity.ERROR).length;
  int get warningCount =>
      errors.where((e) => e.severity == ErrorSeverity.WARNING).length;

  void clear() => errors.clear();
}

class JSFormatterConfig {
  final int indentSpaces;
  final bool useSemicolons;
  final bool includeTypeComments;
  final bool formatCode;
  final bool verbose;
  final bool minify;

  const JSFormatterConfig({
    this.indentSpaces = 2,
    this.useSemicolons = true,
    this.includeTypeComments = false,
    this.formatCode = true,
    this.verbose = false,
    this.minify = false,
  });
}

// Type mapping: Dart → JavaScript
const Map<String, String> DART_TO_JS_TYPES = {
  'int': 'Number',
  'double': 'Number',
  'String': 'String',
  'bool': 'Boolean',
  'List': 'Array',
  'Map': 'Object',
  'Set': 'Set',
  'void': 'void',
  'dynamic': 'any',
};

// ============================================================================
// PART 2: CODE GENERATORS (Isolated, Single Responsibility)
// ============================================================================

/// Generates import statements
class ImportsGenerator {
  final IRToJavaScriptFormatter formatter;

  ImportsGenerator(this.formatter);

  void generate(DartFile dartFile) {
    formatter.writeln("// Generated from Flutter IR");
    formatter.writeln("import React, { useState, useEffect } from 'react';");
    formatter.writeln("import { useNotifier } from 'flutter-js-framework';");
    formatter.writeln("import * as Flutter from 'flutter-js-framework';");
    formatter.writeln("");

    for (final import in dartFile.imports) {
      String importPath = import.uri
          .replaceAll('package:', '')
          .replaceAll('.dart', '');

      if (import.showList.isNotEmpty) {
        String imports = import.showList.join(', ');
        formatter.writeln("import { $imports } from '$importPath';");
      }
    }

    formatter.writeln("");
  }
}

/// Generates variable declarations
class VariablesGenerator {
  final IRToJavaScriptFormatter formatter;

  VariablesGenerator(this.formatter);

  void generate(List<VariableDecl> variables) {
    if (variables.isEmpty) return;

    formatter.writeln("\n// ========== VARIABLES ==========\n");

    for (final variable in variables) {
      String code = _convertVariable(variable);
      formatter.writeln(code);
    }
  }

  String _convertVariable(VariableDecl variable) {
    String keyword = variable.isConst ? 'const' : 'let';
    String init = '';

    if (variable.initializer != null) {
      init = ' = ${formatter._convertExpression(variable.initializer!)}';
    }

    return '$keyword ${variable.name}$init;';
  }
}

/// Generates function declarations
class FunctionsGenerator {
  final IRToJavaScriptFormatter formatter;

  FunctionsGenerator(this.formatter);

  void generate(List<FunctionDecl> functions) {
    if (functions.isEmpty) return;

    formatter.writeln("\n// ========== FUNCTIONS ==========\n");

    for (int i = 0; i < functions.length; i++) {
      String code = _convertFunction(functions[i]);
      formatter.writeln(code);

      if (i < functions.length - 1) {
        formatter.writeln("");
      }
    }
  }

  String _convertFunction(FunctionDecl func) {
    String asyncKeyword = func.isAsync ? 'async ' : '';
    String params = func.parameters.map((p) => p.name).join(', ');

    formatter.write('${asyncKeyword}function ${func.name}($params) {\n');
    formatter.indent();

    if (func.body != null) {
      if (func.body is BlockStmt) {
        for (final stmt in (func.body as BlockStmt).statements) {
          formatter.writeln(formatter._convertStatement(stmt));
        }
      } else {
        formatter.writeln(formatter._convertStatement(func.body as StatementIR));
      }
    } else {
      formatter.writeln('// TODO: Function body');
    }

    formatter.dedent();
    formatter.writeln('}');

    return '';
  }
}

/// Generates class declarations (widgets, state classes)
class ClassesGenerator {
  final IRToJavaScriptFormatter formatter;
  late List<ClassDecl> allClasses;

  ClassesGenerator(this.formatter);

  void generate(List<ClassDecl> classes) {
    if (classes.isEmpty) return;

    allClasses = classes; // Store reference to all classes
    formatter.writeln("\n// ========== CLASSES ==========\n");

    final processedClasses = <String>{};

    for (int i = 0; i < classes.length; i++) {
      final classDecl = classes[i];

      if (processedClasses.contains(classDecl.name)) {
        continue;
      }
      processedClasses.add(classDecl.name);

      bool isStateful = _isStatefulWidget(classDecl);
      _generateClass(classDecl, isStateful, processedClasses);

      if (i < classes.length - 1) {
        formatter.writeln("");
      }
    }
  }

  void _generateClass(
    ClassDecl classDecl,
    bool isStateful,
    Set<String> processedClasses,
  ) {
    String baseClass = _getBaseClass(classDecl.superclass);

    // Class header
    formatter.writeln('class ${classDecl.name} extends $baseClass {');
    formatter.indent();

    // Constructor
    _generateConstructor(classDecl);

    // createState() for stateful widgets
    if (isStateful) {
      formatter.writeln('');
      _generateCreateState(classDecl);
    }

    // Methods
    if (classDecl.methods.isNotEmpty) {
      formatter.writeln('');
      _generateMethods(classDecl, isStateful);
    }

    formatter.dedent();
    formatter.writeln('}');

    // Generate state class for stateful widgets
    if (isStateful) {
      formatter.writeln('');
      _generateStateClass(classDecl, processedClasses);
    }
  }

  void _generateConstructor(ClassDecl classDecl) {
    formatter.writeln('constructor() {');
    formatter.indent();

    for (final field in classDecl.fields) {
      String value = field.initializer != null
          ? formatter._convertExpression(field.initializer!)
          : _getTypeDefault(field.type);
      formatter.writeln('this.${field.name} = $value;');
    }

    formatter.dedent();
    formatter.writeln('}');
  }

  void _generateCreateState(ClassDecl classDecl) {
    formatter.writeln('createState() {');
    formatter.indent();
    formatter.writeln('return new _${classDecl.name}State();');
    formatter.dedent();
    formatter.writeln('}');
  }

  void _generateMethods(ClassDecl classDecl, bool isStateful) {
    final methodsToWrite = classDecl.methods
        .where((m) => m.name != 'createState')
        .where((m) => !(isStateful && m.name == 'build'))
        .toList();

    for (int j = 0; j < methodsToWrite.length; j++) {
      final method = methodsToWrite[j];
      String asyncKeyword = method.isAsync ? 'async ' : '';
      String params = method.parameters.isEmpty
          ? ''
          : method.parameters.map((p) => p.name).join(', ');

      formatter.writeln('${asyncKeyword}${method.name}($params) {');
      formatter.indent();

      if (method.name == 'initState' || method.name == 'dispose') {
        formatter.writeln('super.${method.name}();');
      }

      _writeMethodBody(method);

      formatter.dedent();
      formatter.writeln('}');

      if (j < methodsToWrite.length - 1) {
        formatter.writeln('');
      }
    }
  }

  void _writeMethodBody(MethodDecl method) {
    if (method.body != null) {
      if (method.body is BlockStmt) {
        final blockStmt = method.body as BlockStmt;
        if (blockStmt.statements.isNotEmpty) {
          for (final stmt in blockStmt.statements) {
            try {
              formatter.writeln(formatter._convertStatement(stmt));
            } catch (e) {
              formatter.errorCollector.error(
                'Error converting statement in ${method.name}: $e',
                suggestion: 'Check if statement type is supported',
              );
              formatter.writeln('// TODO: Error converting statement');
            }
          }
        } else {
          formatter.writeln('// TODO: Implement ${method.name}');
        }
      } else {
        try {
          formatter.writeln(formatter._convertStatement(method.body as StatementIR));
        } catch (e) {
          formatter.errorCollector.error(
            'Error converting method body: $e',
            suggestion: 'Check if body statement type is supported',
          );
          formatter.writeln('// TODO: Error converting method body');
        }
      }
    } else {
      formatter.writeln('// TODO: Implement ${method.name}');
    }
  }

  void _generateStateClass(ClassDecl classDecl, Set<String> processedClasses) {
    final stateClassName = '_${classDecl.name}State';

    // Check if state class exists in IR by searching all classes
    final existingStateClass = allClasses.firstWhereOrNull(
      (c) => c.name == stateClassName,
    );

    if (existingStateClass != null) {
      processedClasses.add(stateClassName);
      _generateStateClassFromIR(existingStateClass, classDecl.name);
    } else {
      _generateBoilerplateStateClass(stateClassName, classDecl.name);
    }
  }

  void _generateStateClassFromIR(ClassDecl stateClass, String widgetName) {
    formatter.writeln('class ${stateClass.name} extends State<$widgetName> {');
    formatter.indent();

    formatter.writeln('constructor() {');
    formatter.indent();
    formatter.writeln('super();');
    formatter.dedent();
    formatter.writeln('}');

    if (stateClass.methods.isNotEmpty) {
      formatter.writeln('');
      _generateMethods(stateClass, false);
    }

    formatter.dedent();
    formatter.writeln('}');
  }

  void _generateBoilerplateStateClass(String stateClassName, String widgetName) {
    formatter.writeln('class $stateClassName extends State<$widgetName> {');
    formatter.indent();

    formatter.writeln('constructor() {');
    formatter.indent();
    formatter.writeln('super();');
    formatter.dedent();
    formatter.writeln('}');

    formatter.writeln('');
    formatter.writeln('initState() {');
    formatter.indent();
    formatter.writeln('super.initState();');
    formatter.writeln('// TODO: Initialize state');
    formatter.dedent();
    formatter.writeln('}');

    formatter.writeln('');
    formatter.writeln('build(context) {');
    formatter.indent();
    formatter.writeln('// TODO: Implement build');
    formatter.writeln('return new Container({');
    formatter.indent();
    formatter.writeln('child: new Text("TODO: Implement build")');
    formatter.dedent();
    formatter.writeln('});');
    formatter.dedent();
    formatter.writeln('}');

    formatter.writeln('');
    formatter.writeln('dispose() {');
    formatter.indent();
    formatter.writeln('super.dispose();');
    formatter.dedent();
    formatter.writeln('}');

    formatter.dedent();
    formatter.writeln('}');
  }

  bool _isStatefulWidget(ClassDecl classDecl) {
    if (classDecl.superclass == null) return false;
    String superclassName = classDecl.superclass!.displayName();
    return superclassName.contains('StatefulWidget') &&
        !superclassName.contains('State');
  }

  String _getBaseClass(TypeIR? superclass) {
    if (superclass == null) return 'Widget';
    String name = superclass.displayName();

    if (name.contains('StatefulWidget')) return 'StatefulWidget';
    if (name.contains('StatelessWidget')) return 'StatelessWidget';
    if (name.contains('State')) return 'State';
    if (name.contains('ChangeNotifier')) return 'ChangeNotifier';

    return name;
  }

  String _getTypeDefault(TypeIR type) {
    final typeName = type.displayName();
    switch (typeName) {
      case 'int':
        return '0';
      case 'double':
        return '0.0';
      case 'String':
        return '""';
      case 'bool':
        return 'false';
      case 'List':
        return '[]';
      case 'Map':
        return '{}';
      case 'Set':
        return 'new Set()';
      default:
        return 'null';
    }
  }
}

/// Generates export statements
class ExportsGenerator {
  void generate(
    StringBuffer output,
    DartFile dartFile,
  ) {
    final exports = <String>[];

    // Export classes
    for (final cls in dartFile.classDeclarations) {
      exports.add(cls.name);
    }

    // Export functions
    for (final func in dartFile.functionDeclarations) {
      exports.add(func.name);
    }

    // Export variables
    for (final variable in dartFile.variableDeclarations) {
      exports.add(variable.name);
    }

    // Export generated state classes
    for (final cls in dartFile.classDeclarations) {
      if (_isStatefulWidget(cls)) {
        final stateClassName = '_${cls.name}State';
        if (!dartFile.classDeclarations.any((c) => c.name == stateClassName)) {
          exports.add(stateClassName);
        }
      }
    }

    if (exports.isEmpty) return;

    output.write('\n// Exports\n');
    output.write('export { ${exports.join(', ')} };\n');
  }

  bool _isStatefulWidget(ClassDecl classDecl) {
    if (classDecl.superclass == null) return false;
    String superclassName = classDecl.superclass!.displayName();
    return superclassName.contains('StatefulWidget') &&
        !superclassName.contains('State');
  }
}

// ============================================================================
// PART 3: EXPRESSION CONVERTER
// ============================================================================

class ExpressionConverter {
  final IRToJavaScriptFormatter formatter;

  ExpressionConverter(this.formatter);

  String convert(ExpressionIR expr) {
    try {
      if (expr is LiteralExpressionIR) {
        return _convertLiteral(expr);
      } else if (expr is IdentifierExpressionIR) {
        return expr.name;
      } else if (expr is BinaryExpressionIR) {
        return _convertBinary(expr);
      } else if (expr is UnaryExpressionIR) {
        return _convertUnary(expr);
      } else if (expr is MethodCallExpressionIR) {
        return _convertMethodCall(expr);
      } else if (expr is PropertyAccessExpressionIR) {
        return '${convert(expr.target)}.${expr.propertyName}';
      } else if (expr is IndexAccessExpressionIR) {
        return '${convert(expr.target)}[${convert(expr.index)}]';
      } else if (expr is ConditionalExpressionIR) {
        return '(${convert(expr.condition)}) ? (${convert(expr.thenExpression)}) : (${convert(expr.elseExpression)})';
      } else if (expr is ListExpressionIR) {
        return '[${expr.elements.map(convert).join(', ')}]';
      } else if (expr is MapExpressionIR) {
        return '{${expr.entries.map((e) => '${convert(e.key)}: ${convert(e.value)}').join(', ')}}';
      } else if (expr is StringInterpolationExpressionIR) {
        return _convertStringInterpolation(expr);
      } else if (expr is ThisExpressionIR) {
        return 'this';
      } else if (expr is SuperExpressionIR) {
        return 'super';
      } else {
        formatter.errorCollector.warning(
          'Unknown expression type: ${expr.runtimeType}',
        );
        return '/* UNKNOWN: ${expr.runtimeType} */';
      }
    } catch (e) {
      formatter.errorCollector.error(
        'Error converting expression: $e',
        suggestion: 'Check if all properties of ${expr.runtimeType} are accessible',
      );
      return '/* ERROR: $e */';
    }
  }

  String _convertLiteral(LiteralExpressionIR expr) {
    switch (expr.literalType) {
      case LiteralType.stringValue:
        return '"${_escapeString(expr.value as String)}"';
      case LiteralType.intValue:
        return expr.value.toString();
      case LiteralType.doubleValue:
        return expr.value.toString();
      case LiteralType.boolValue:
        return (expr.value as bool) ? 'true' : 'false';
      case LiteralType.nullValue:
        return 'null';
      default:
        return 'undefined';
    }
  }

  String _convertBinary(BinaryExpressionIR expr) {
    String left = convert(expr.left);
    String right = convert(expr.right);
    String op = expr.operator.toString();
    return '($left) $op ($right)';
  }

  String _convertUnary(UnaryExpressionIR expr) {
    String operand = convert(expr.operand);
    String op = expr.operator.toString();
    return '$op$operand';
  }

  String _convertMethodCall(MethodCallExpressionIR expr) {
    String target = expr.target != null ? '${convert(expr.target!)}.' : '';
    List<String> args = expr.arguments.map(convert).toList();
    return '$target${expr.methodName}(${args.join(', ')})';
  }

  String _convertStringInterpolation(StringInterpolationExpressionIR expr) {
    String result = '`';
    for (final part in expr.parts) {
      if (part.isExpression) {
        result += '\${${convert(part.expression!)}}';
      } else {
        result += part.text!;
      }
    }
    result += '`';
    return result;
  }

  String _escapeString(String str) {
    return str
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r')
        .replaceAll('\t', '\\t');
  }
}

// ============================================================================
// PART 4: STATEMENT CONVERTER
// ============================================================================

class StatementConverter {
  final IRToJavaScriptFormatter formatter;

  StatementConverter(this.formatter);

  String convert(StatementIR stmt) {
    if (stmt is ExpressionStmt) {
      return '${formatter._convertExpression(stmt.expression)};';
    } else if (stmt is ReturnStmt) {
      return stmt.expression != null
          ? 'return ${formatter._convertExpression(stmt.expression!)};'
          : 'return;';
    } else if (stmt is IfStmt) {
      return _convertIf(stmt);
    } else if (stmt is ForStmt) {
      return _convertFor(stmt);
    } else if (stmt is WhileStmt) {
      return _convertWhile(stmt);
    } else if (stmt is BlockStmt) {
      return _convertBlock(stmt);
    } else {
      return '// TODO: ${stmt.runtimeType}';
    }
  }

  String _convertIf(IfStmt stmt) {
    String cond = formatter._convertExpression(stmt.condition);
    String then = convert(stmt.thenBranch);
    String result = 'if ($cond) $then';
    if (stmt.elseBranch != null) {
      result += ' else ${convert(stmt.elseBranch!)}';
    }
    return result;
  }

  String _convertFor(ForStmt stmt) {
    String init = '';
    String cond = '';
    String updates = '';
    return 'for ($init; $cond; $updates) {}';
  }

  String _convertWhile(WhileStmt stmt) {
    String cond = formatter._convertExpression(stmt.condition);
    String body = convert(stmt.body);
    return 'while ($cond) $body';
  }

  String _convertBlock(BlockStmt stmt) {
    String result = '{\n';
    formatter.indent();
    for (final s in stmt.statements) {
      formatter.writeln(convert(s));
    }
    formatter.dedent();
    result += formatter.getIndent() + '}';
    return result;
  }
}

// ============================================================================
// PART 5: MAIN FORMATTER CLASS
// ============================================================================

class IRToJavaScriptFormatter {
  final JSFormatterConfig config;
  final ErrorCollector errorCollector = ErrorCollector();
  
  late StringBuffer output;
  late DartFile dartFile;
  int indentLevel = 0;

  late ImportsGenerator importsGenerator;
  late VariablesGenerator variablesGenerator;
  late FunctionsGenerator functionsGenerator;
  late ClassesGenerator classesGenerator;
  late ExportsGenerator exportsGenerator;
  late ExpressionConverter expressionConverter;
  late StatementConverter statementConverter;

  IRToJavaScriptFormatter({JSFormatterConfig? config})
      : config = config ?? const JSFormatterConfig() {
    importsGenerator = ImportsGenerator(this);
    variablesGenerator = VariablesGenerator(this);
    functionsGenerator = FunctionsGenerator(this);
    classesGenerator = ClassesGenerator(this);
    exportsGenerator = ExportsGenerator();
    expressionConverter = ExpressionConverter(this);
    statementConverter = StatementConverter(this);
  }

  /// Main entry point
  String format(DartFile irFile) {
    dartFile = irFile;
    output = StringBuffer();
    indentLevel = 0;
    errorCollector.clear(); // Clear previous errors

    if (config.verbose) {
      _debugPrintIR();
    }

    try {
      importsGenerator.generate(dartFile);
      variablesGenerator.generate(dartFile.variableDeclarations);
      functionsGenerator.generate(dartFile.functionDeclarations);
      classesGenerator.generate(dartFile.classDeclarations);
      exportsGenerator.generate(output, dartFile);

      return output.toString();
    } catch (e, stack) {
      errorCollector.error('Fatal generation error: $e\n$stack');
      return '/* ERROR: ${errorCollector.errors.join('\n')} */';
    }
  }

  // =========================================================================
  // Public Conversion Methods
  // =========================================================================

  String _convertExpression(ExpressionIR expr) {
    return expressionConverter.convert(expr);
  }

  String _convertStatement(StatementIR stmt) {
    return statementConverter.convert(stmt);
  }

  // =========================================================================
  // Output Helpers
  // =========================================================================

  void indent() => indentLevel++;
  void dedent() {
    if (indentLevel > 0) indentLevel--;
  }

  String getIndent([int? customIndent]) {
    final level = customIndent ?? indentLevel;
    return ' ' * (level * config.indentSpaces);
  }

  void writeln(String text) {
    output.write('${getIndent()}$text\n');
  }

  void write(String text) {
    output.write(text);
  }

  // =========================================================================
  // Debug
  // =========================================================================

  void _debugPrintIR() {
    print('\n╔════════════════════════════════════════╗');
    print('║       FLUTTER IR STRUCTURE            ║');
    print('╚════════════════════════════════════════╝\n');

    print('Classes: ${dartFile.classDeclarations.length}');
    for (final cls in dartFile.classDeclarations) {
      print('  - ${cls.name} extends ${cls.superclass?.displayName() ?? "Object"}');
      print('    Methods: ${cls.methods.map((m) => m.name).join(", ")}');
      print('    Fields: ${cls.fields.map((f) => f.name).join(", ")}');
    }

    print('\nFunctions: ${dartFile.functionDeclarations.length}');
    for (final func in dartFile.functionDeclarations) {
      print('  - ${func.name}');
    }

    print('\nVariables: ${dartFile.variableDeclarations.length}');
    for (final v in dartFile.variableDeclarations) {
      print('  - ${v.name}: ${v.type.displayName()}');
    }

    print('\n╚════════════════════════════════════════╝\n');
  }
}

// ============================================================================
// EXTENSION
// ============================================================================

extension ListX<T> on List<T> {
  T? firstWhereOrNull(bool Function(T) test) {
    try {
      return firstWhere(test);
    } catch (e) {
      return null;
    }
  }
}