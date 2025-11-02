import 'dart:math';
import 'dart:typed_data';
import 'package:collection/collection.dart';

import '../../../flutterjs_core.dart';
import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

class JSFormatterConfig {
  final int indentSpaces;
  final bool useSemicolons;
  final bool includeTypeComments;
  final bool formatCode;
  final int maxLineLength;
  final bool minify;

  const JSFormatterConfig({
    this.indentSpaces = 2,
    this.useSemicolons = true,
    this.includeTypeComments = false,
    this.formatCode = true,
    this.maxLineLength = 100,
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
  'Future': 'Promise',
  'Stream': 'AsyncIterable',
};

// Binary operators mapping
const Map<int, String> BINARY_OP_MAP = {
  0x01: '+',
  0x02: '-',
  0x03: '*',
  0x04: '/',
  0x05: '~/',
  0x06: '%',
  0x10: '===',
  0x11: '!==',
  0x12: '<',
  0x13: '<=',
  0x14: '>',
  0x15: '>=',
  0x20: '&&',
  0x21: '||',
  0x30: '&',
  0x31: '|',
  0x32: '^',
  0x33: '<<',
  0x34: '>>',
  0x35: '>>>',
  0x40: '??',
};

// Unary operators mapping
const Map<int, String> UNARY_OP_MAP = {
  0x01: '-',
  0x02: '!',
  0x03: '~',
  0x04: '++',
  0x05: '--',
  0x06: '++',
  0x07: '--',
};

// Flutter widgets registry
const Set<String> FLUTTER_WIDGETS = {
  'Container',
  'Text',
  'Row',
  'Column',
  'Scaffold',
  'AppBar',
  'FloatingActionButton',
  'ElevatedButton',
  'TextButton',
  'IconButton',
  'Center',
  'Padding',
  'ListView',
  'GridView',
  'SingleChildScrollView',
  'Stack',
  'Positioned',
  'Card',
  'Divider',
  'Icon',
  'Image',
  'SizedBox',
  'AspectRatio',
  'Expanded',
  'Flexible',
  'Spacer',
  'TextField',
  'Checkbox',
  'Radio',
  'Switch',
  'Slider',
};

// ============================================================================
// ERROR & CONTEXT MANAGEMENT
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
}

class GenerationContext {
  ClassDecl? currentClass;
  MethodDecl? currentMethod;
  FunctionDecl? currentFunction;
  bool inBuildMethod = false;
  bool inAsyncContext = false;
  bool inStatefulWidget = false;

  void enterClass(ClassDecl cls, {bool isStateful = false}) {
    currentClass = cls;
    inStatefulWidget = isStateful;
  }

  void exitClass() {
    currentClass = null;
    inStatefulWidget = false;
  }

  void enterMethod(MethodDecl method) {
    currentMethod = method;
    inBuildMethod = method.name == 'build';
    inAsyncContext = method.isAsync;
  }

  void exitMethod() {
    currentMethod = null;
    inBuildMethod = false;
    inAsyncContext = false;
  }

  void enterFunction(FunctionDecl func) {
    currentFunction = func;
    inAsyncContext = func.isAsync;
  }

  void exitFunction() {
    currentFunction = null;
    inAsyncContext = false;
  }

  bool canUseAwait() => inAsyncContext;
  bool isInBuildMethod() => inBuildMethod;
  bool isInStatefulWidget() => inStatefulWidget;
}

// ============================================================================
// SCOPE MANAGER - Variable Resolution
// ============================================================================

class VariableInfo {
  final String name;
  final TypeIR? type;
  final bool isField;
  final bool isFinal;
  final bool isParameter;

  VariableInfo({
    required this.name,
    this.type,
    this.isField = false,
    this.isFinal = false,
    this.isParameter = false,
  });
}

class Scope {
  final String name;
  final Scope? parent;
  final Map<String, VariableInfo> variables = {};

  Scope(this.name, {this.parent});

  void addVariable(String name, VariableInfo info) => variables[name] = info;

  VariableInfo? lookupLocal(String name) => variables[name];

  VariableInfo? lookupRecursive(String name) {
    return variables[name] ?? parent?.lookupRecursive(name);
  }

  bool isDefined(String name) => lookupRecursive(name) != null;
}

class ScopeManager {
  late Scope globalScope;
  late Scope currentScope;
  final List<Scope> scopeStack = [];

  ScopeManager() {
    globalScope = Scope('global');
    currentScope = globalScope;
  }

  void pushScope(String name) {
    final newScope = Scope(name, parent: currentScope);
    scopeStack.add(currentScope);
    currentScope = newScope;
  }

  void popScope() {
    if (scopeStack.isNotEmpty) {
      currentScope = scopeStack.removeLast();
    }
  }

  void addVariable(
    String name,
    TypeIR? type, {
    bool isField = false,
    bool isFinal = false,
    bool isParameter = false,
  }) {
    final info = VariableInfo(
      name: name,
      type: type,
      isField: isField,
      isFinal: isFinal,
      isParameter: isParameter,
    );
    currentScope.addVariable(name, info);
  }

  VariableInfo? resolveVariable(String name) =>
      currentScope.lookupRecursive(name);

  String getPrefixForVariable(String name) {
    final info = resolveVariable(name);
    if (info?.isField == true && !currentScope.isDefined(name)) {
      return 'this.';
    }
    return '';
  }

  bool isNameDefined(String name) => currentScope.isDefined(name);
}

// ============================================================================
// MAIN FORMATTER CLASS
// ============================================================================

class IRToJavaScriptFormatter {
  final JSFormatterConfig config;
  final ErrorCollector errorCollector = ErrorCollector();
  final GenerationContext context = GenerationContext();
  final ScopeManager scopeManager = ScopeManager();

  late StringBuffer output;
  late DartFile dartFile;
  int indentLevel = 0;

  IRToJavaScriptFormatter({JSFormatterConfig? config})
    : config = config ?? const JSFormatterConfig();

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Main entry point: Convert IR to JavaScript
  String format(DartFile irFile) {
    dartFile = irFile;
    output = StringBuffer();
    indentLevel = 0;

    try {
      _generateImports();
      _generateTopLevelVariables();
      _generateFunctions();
      _generateClasses();
      _generateExports();

      String result = output.toString();

      if (config.formatCode) {
        result = _formatCode(result);
      }

      return result;
    } catch (e, stack) {
      errorCollector.error('Fatal generation error: $e\n$stack');
      return '/* ERROR: ${errorCollector.errors.join('\n')} */';
    }
  }

  // =========================================================================
  // IMPORTS & EXPORTS
  // =========================================================================

  void _generateImports() {
    writeln("// Generated from Flutter IR");
    writeln("import React, { useState, useEffect } from 'react';");
    writeln("import { useNotifier } from 'flutter-js-framework';");
    writeln("import * as Flutter from 'flutter-js-framework';");
    writeln("");

    // Generate file imports
    for (final import in dartFile.imports) {
      String importPath = import.uri
          .replaceAll('package:', '')
          .replaceAll('.dart', '')
          .replaceAll('/', '/');

      if (import.showList.isNotEmpty) {
        String imports = import.showList.join(', ');
        writeln("import { $imports } from '$importPath';");
      } else if (import.hideList.isEmpty) {
        writeln(
          "import * as _${_sanitizeName(import.uri)} from '$importPath';",
        );
      }
    }

    writeln("");
  }

  void _generateExports() {
    final exports = <String>[];

    for (final cls in dartFile.classDeclarations) {
      exports.add(cls.name);
    }
    for (final func in dartFile.functionDeclarations) {
      exports.add(func.name);
    }
    for (final variable in dartFile.variableDeclarations) {
      exports.add(variable.name);
    }

    if (exports.isEmpty) return;

    writeln("");
    writeln("// Exports");
    writeln("export { ${exports.join(', ')} };");
  }

  // =========================================================================
  // TOP-LEVEL DECLARATIONS
  // =========================================================================

  void _generateTopLevelVariables() {
    if (dartFile.variableDeclarations.isEmpty) return;

    writeln("\n// ========== VARIABLES ==========\n");

    for (final variable in dartFile.variableDeclarations) {
      String decl = _convertVariableDeclaration(variable);
      writeln(decl);
    }
  }

  // =========================================================================
  // VARIABLE DECLARATION
  // =========================================================================

   String _convertVariableDeclaration(VariableDecl variable) {
    scopeManager.addVariable(variable.name, variable.type);

    String keyword = variable.isConst ? 'const' : 'let';
    String init = '';

    if (variable.initializer != null) {
      String value = _convertExpression(variable.initializer!);
      init = ' = $value';
    }

    String type = _getTypeComment(variable.type);
    String result = '$keyword ${variable.name}$init;';

    return type.isNotEmpty ? '$type\n$result' : result;
  }

  // =========================================================================
  // EXPRESSION CONVERSION - All 30+ Types
  // =========================================================================

  String _convertExpression(ExpressionIR expr) {
    try {
      if (expr is LiteralExpressionIR) {
        return _convertLiteral(expr);
      } else if (expr is IdentifierExpressionIR) {
        return _convertIdentifier(expr);
      } else if (expr is BinaryExpressionIR) {
        return _convertBinaryExpression(expr);
      } else if (expr is UnaryExpressionIR) {
        return _convertUnaryExpression(expr);
      } else if (expr is MethodCallExpressionIR) {
        return _convertMethodCall(expr);
      } else if (expr is PropertyAccessExpressionIR) {
        return _convertPropertyAccess(expr);
      } else if (expr is IndexAccessExpressionIR) {
        return _convertIndexAccess(expr);
      } else if (expr is ConditionalExpressionIR) {
        return _convertConditional(expr);
      } else if (expr is AssignmentExpressionIR) {
        return _convertAssignment(expr);
      } else if (expr is ListExpressionIR) {
        return _convertListExpression(expr);
      } else if (expr is MapExpressionIR) {
        return _convertMapExpression(expr);
      } else if (expr is SetExpressionIR) {
        return _convertSetExpression(expr);
      } else if (expr is StringInterpolationExpressionIR) {
        return _convertStringInterpolation(expr);
      } else if (expr is CastExpressionIR) {
        return _convertCast(expr);
      } else if (expr is TypeCheckExpr) {
        return _convertTypeCheck(expr);
      } else if (expr is AwaitExpr) {
        return _convertAwait(expr);
      } else if (expr is ThrowExpr) {
        return _convertThrowExpression(expr);
      } else if (expr is NullCoalescingExpressionIR) {
        return _convertNullCoalesce(expr);
      } else if (expr is LambdaExpr) {
        return _convertLambda(expr);
      } else if (expr is ThisExpressionIR) {
        return 'this';
      } else if (expr is SuperExpressionIR) {
        return 'super';
      } else if (expr is FunctionCallExpr) {
        return _convertFunctionCall(expr);
      } else if (expr is InstanceCreationExpressionIR) {
        return _convertInstanceCreation(expr);
      } else {
        errorCollector.error(
          'Unknown expression type: ${expr.runtimeType}',
          suggestion: 'Check if IR structure is correct',
        );
        return '/* UNKNOWN_EXPR */';
      }
    } catch (e) {
      errorCollector.error('Error converting expression: $e');
      return '/* ERROR */';
    }
  }

  // =========================================================================
  // LITERAL EXPRESSIONS
  // =========================================================================

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

  // =========================================================================
  // IDENTIFIER & ACCESS
  // =========================================================================

  String _convertIdentifier(IdentifierExpressionIR expr) {
    VariableInfo? varInfo = scopeManager.resolveVariable(expr.name);

    if (varInfo == null) {
      errorCollector.warning('Unresolved identifier: ${expr.name}');
      return '/* UNDEFINED: ${expr.name} */';
    }

    String prefix = scopeManager.getPrefixForVariable(expr.name);
    return '$prefix${expr.name}';
  }

  String _convertPropertyAccess(PropertyAccessExpressionIR expr) {
    String target = _convertExpression(expr.target);
    return '$target.${expr.propertyName}';
  }

  String _convertIndexAccess(IndexAccessExpressionIR expr) {
    String target = _convertExpression(expr.target);
    String index = _convertExpression(expr.index);

    if (expr.isNullAware) {
      return '$target?.[$index]';
    }

    return '$target[$index]';
  }

  // =========================================================================
  // OPERATIONS
  // =========================================================================

  String _convertBinaryExpression(BinaryExpressionIR expr) {
    String left = _convertExpression(expr.left);
    String right = _convertExpression(expr.right);

    if (expr.operator == 0x05) {
      // Integer division
      return 'Math.floor(($left) / ($right))';
    }

    String op = BINARY_OP_MAP[expr.operator] ?? '?';
    return '($left) $op ($right)';
  }

  String _convertUnaryExpression(UnaryExpressionIR expr) {
    String operand = _convertExpression(expr.operand);
    String op = UNARY_OP_MAP[expr.operator] ?? '?';

    if (expr.operator == 0x04 || expr.operator == 0x05) {
      // Pre-increment/decrement
      return '$op$operand';
    } else if (expr.operator == 0x06 || expr.operator == 0x07) {
      // Post-increment/decrement
      return '$operand$op';
    }

    return '$op($operand)';
  }

  String _convertAssignment(AssignmentExpressionIR expr) {
    String target = _convertExpression(expr.target);
    String value = _convertExpression(expr.value);
    return '$target = $value';
  }

  String _convertConditional(ConditionalExpressionIR expr) {
    String cond = _convertExpression(expr.condition);
    String then = _convertExpression(expr.thenExpression);
    String els = _convertExpression(expr.elseExpression);
    return '($cond) ? ($then) : ($els)';
  }

  // =========================================================================
  // COLLECTIONS
  // =========================================================================

  String _convertListExpression(ListExpressionIR expr) {
    List<String> elements = expr.elements
        .map((e) => _convertExpression(e))
        .toList();

    String result = '[${elements.join(', ')}]';

    if (expr.isConst) {
      result = 'Object.freeze($result)';
    }

    return result;
  }

  String _convertMapExpression(MapExpressionIR expr) {
    List<String> entries = expr.entries
        .map(
          (e) => '${_convertExpression(e.key)}: ${_convertExpression(e.value)}',
        )
        .toList();

    return '{${entries.join(', ')}}';
  }

  String _convertSetExpression(SetExpressionIR expr) {
    List<String> elements = expr.elements
        .map((e) => _convertExpression(e))
        .toList();

    return 'new Set([${elements.join(', ')}])';
  }

  // =========================================================================
  // METHOD & FUNCTION CALLS
  // =========================================================================

  String _convertMethodCall(MethodCallExpressionIR expr) {
    // Check for setState
    if (expr.methodName == 'setState') {
      return _convertSetState(expr);
    }

    // Check for widgets
    if (isWidget(expr.methodName)) {
      return _convertWidgetCall(expr);
    }

    // Regular method call
    String target = '';
    if (expr.target != null) {
      target = _convertExpression(expr.target!) + '.';
    }

    String args = _formatArguments(expr.arguments, expr.namedArguments);
    return '$target${expr.methodName}($args)';
  }

  String _convertFunctionCall(FunctionCallExpr expr) {
    String args = _formatArguments(expr.arguments, expr.namedArguments);
    return '${expr.functionName}($args)';
  }

  String _convertInstanceCreation(InstanceCreationExpressionIR expr) {
    String type = expr.type.displayName();
    String args = _formatArguments(expr.arguments, expr.namedArguments);

    if (isWidget(type)) {
      return 'new Flutter.$type({$args})';
    }

    return 'new $type({$args})';
  }

  String _convertSetState(MethodCallExpressionIR expr) {
    if (expr.arguments.isEmpty) {
      return 'this.setState({})';
    }

    String arg = _convertExpression(expr.arguments[0]);
    return 'this.setState($arg)';
  }

  String _convertWidgetCall(MethodCallExpressionIR expr) {
    String widgetName = expr.methodName;
    String props = _formatWidgetProps(expr.namedArguments);

    return 'new Flutter.$widgetName({$props})';
  }

  String _formatArguments(
    List<ExpressionIR> args,
    Map<String, ExpressionIR> namedArgs,
  ) {
    List<String> parts = [];

    // Positional
    parts.addAll(args.map((a) => _convertExpression(a)));

    // Named
    parts.addAll(
      namedArgs.entries.map((e) => '${e.key}: ${_convertExpression(e.value)}'),
    );

    return parts.join(', ');
  }

  String _formatWidgetProps(Map<String, ExpressionIR> props) {
    List<String> result = [];

    for (final entry in props.entries) {
      String key = entry.key;
      String value = _convertExpression(entry.value);
      result.add('$key: $value');
    }

    return result.join(', ');
  }

  // =========================================================================
  // SPECIAL EXPRESSIONS
  // =========================================================================

  String _convertStringInterpolation(StringInterpolationExpressionIR expr) {
    String result = '`';

    for (final part in expr.parts) {
      if (part.isExpression) {
        String exp = _convertExpression(part.expression!);
        result += '\${$exp}';
      } else {
        result += part.text!;
      }
    }

    result += '`';
    return result;
  }

  String _convertCast(CastExpressionIR expr) {
    String expression = _convertExpression(expr.expression);
    String targetType = expr.targetType.displayName();

    return '($expression as $targetType)';
  }

  String _convertTypeCheck(TypeCheckExpr expr) {
    String expression = _convertExpression(expr.expression);
    String typeToCheck = expr.typeToCheck.displayName();

    String result = 'instanceof $typeToCheck';
    if (expr.isNegated) {
      result = '!($expression $result)';
    } else {
      result = '$expression $result';
    }

    return result;
  }

  String _convertAwait(AwaitExpr expr) {
    if (!context.canUseAwait()) {
      errorCollector.warning('await used outside async context');
      return _convertExpression(expr.futureExpression);
    }

    String future = _convertExpression(expr.futureExpression);
    return 'await $future';
  }

  String _convertThrowExpression(ThrowExpr expr) {
    String exception = _convertExpression(expr.exceptionExpression);
    return 'throw $exception';
  }

  String _convertNullCoalesce(NullCoalescingExpressionIR expr) {
    String left = _convertExpression(expr.left);
    String right = _convertExpression(expr.right);
    return '$left ?? $right';
  }

  String _convertLambda(LambdaExpr expr) {
    String params = expr.parameters.map((p) => p.name).join(', ');

    if (expr.body == null) {
      return '($params) => undefined';
    }

    String body = _convertExpression(expr.body!);
    return '($params) => $body';
  }

  // =========================================================================
  // STATEMENT CONVERSION - All 12+ Types
  // =========================================================================

  String _convertStatement(StatementIR stmt) {
    try {
      if (stmt is ExpressionStmt) {
        return _convertExpressionStatement(stmt);
      } else if (stmt is VariableDeclarationStmt) {
        return _convertVariableDeclarationStatement(stmt);
      } else if (stmt is ReturnStmt) {
        return _convertReturnStatement(stmt);
      } else if (stmt is BreakStmt) {
        return _convertBreakStatement(stmt);
      } else if (stmt is ContinueStmt) {
        return _convertContinueStatement(stmt);
      } else if (stmt is ThrowStmt) {
        return _convertThrowStatement(stmt);
      } else if (stmt is BlockStmt) {
        return _convertBlockStatement(stmt);
      } else if (stmt is IfStmt) {
        return _convertIfStatement(stmt);
      } else if (stmt is ForStmt) {
        return _convertForStatement(stmt);
      } else if (stmt is ForEachStmt) {
        return _convertForEachStatement(stmt);
      } else if (stmt is WhileStmt) {
        return _convertWhileStatement(stmt);
      } else if (stmt is DoWhileStmt) {
        return _convertDoWhileStatement(stmt);
      } else if (stmt is SwitchStmt) {
        return _convertSwitchStatement(stmt);
      } else if (stmt is TryStmt) {
        return _convertTryStatement(stmt);
      } else {
        errorCollector.error('Unknown statement type: ${stmt.runtimeType}');
        return '/* UNKNOWN_STMT */';
      }
    } catch (e) {
      errorCollector.error('Error converting statement: $e');
      return '/* ERROR */';
    }
  }

  String _convertExpressionStatement(ExpressionStmt stmt) {
    String expr = _convertExpression(stmt.expression);
    return '$expr;';
  }

  String _convertVariableDeclarationStatement(VariableDeclarationStmt stmt) {
    String keyword = stmt.isFinal || stmt.isConst ? 'const' : 'let';
    String init = '';

    if (stmt.initializer != null) {
      init = ' = ${_convertExpression(stmt.initializer!)}';
    }

    scopeManager.addVariable(stmt.name, stmt.type);

    String type = _getTypeComment(stmt.type);
    String result = '$keyword ${stmt.name}$init;';

    return type.isNotEmpty ? '$type\n$result' : result;
  }

  String _convertReturnStatement(ReturnStmt stmt) {
    if (stmt.expression == null) {
      return 'return;';
    }

    String expr = _convertExpression(stmt.expression!);
    return 'return $expr;';
  }

  String _convertBreakStatement(BreakStmt stmt) {
    return stmt.label != null ? 'break ${stmt.label};' : 'break;';
  }

  String _convertContinueStatement(ContinueStmt stmt) {
    return stmt.label != null ? 'continue ${stmt.label};' : 'continue;';
  }

  String _convertThrowStatement(ThrowStmt stmt) {
    String expr = _convertExpression(stmt.exceptionExpression);
    return 'throw $expr;';
  }

  String _convertBlockStatement(BlockStmt stmt) {
    scopeManager.pushScope('block');

    String result = '{\n';
    indent();

    for (final s in stmt.statements) {
      String code = _convertStatement(s);
      writeln(code);
    }

    dedent();
    result += '${getIndent()}}';

    scopeManager.popScope();

    return result;
  }

  String _convertIfStatement(IfStmt stmt) {
    String cond = _convertExpression(stmt.condition);
    String then = _convertStatement(stmt.thenBranch);

    String result = 'if ($cond) $then';

    if (stmt.elseBranch != null) {
      String els = _convertStatement(stmt.elseBranch!);
      result += ' else $els';
    }

    return result;
  }

  String _convertForStatement(ForStmt stmt) {
    String init = '';
    if (stmt.initialization != null) {
      if (stmt.initialization is VariableDeclarationStmt) {
        init = _convertVariableDeclarationStatement(
          stmt.initialization as VariableDeclarationStmt,
        );
        init = init.substring(0, init.length - 1); // Remove ;
      } else {
        init = _convertExpression(stmt.initialization as ExpressionIR);
      }
    }

    String cond = stmt.condition != null
        ? _convertExpression(stmt.condition!)
        : '';
    String updates = stmt.updaters.map((e) => _convertExpression(e)).join(', ');

    String body = _convertStatement(stmt.body);

    return 'for ($init; $cond; $updates) $body';
  }

  String _convertForEachStatement(ForEachStmt stmt) {
    scopeManager.pushScope('forEach');
    scopeManager.addVariable(stmt.loopVariable, stmt.loopVariableType);

    String iterable = _convertExpression(stmt.iterable);
    String body = _convertStatement(stmt.body);

    String result = 'for (const ${stmt.loopVariable} of $iterable) $body';

    scopeManager.popScope();

    return result;
  }

  String _convertWhileStatement(WhileStmt stmt) {
    String cond = _convertExpression(stmt.condition);
    String body = _convertStatement(stmt.body);

    return 'while ($cond) $body';
  }

  String _convertDoWhileStatement(DoWhileStmt stmt) {
    String body = _convertStatement(stmt.body);
    String cond = _convertExpression(stmt.condition);

    return 'do $body while ($cond);';
  }

  String _convertSwitchStatement(SwitchStmt stmt) {
    String expr = _convertExpression(stmt.expression);

    String result = 'switch ($expr) {\n';
    indent();

    for (final caseStmt in stmt.cases) {
      if (caseStmt.patterns != null) {
        for (final pattern in caseStmt.patterns!) {
          String p = _convertExpression(pattern);
          writeln('case $p:');
        }
      }

      indent();
      for (final s in caseStmt.statements) {
        writeln(_convertStatement(s));
      }
      writeln('break;');
      dedent();
    }

    if (stmt.defaultCase != null) {
      writeln('default:');
      indent();
      for (final s in stmt.defaultCase!.statements) {
        writeln(_convertStatement(s));
      }
      dedent();
    }

    dedent();
    result += '${getIndent()}}';

    return result;
  }

  String _convertTryStatement(TryStmt stmt) {
    // Start try block
    String result = 'try {\n';
    indent();

    // Convert try block statements
    if (stmt.tryBlock is BlockStmt) {
      // If it's already a BlockStmt, use its statements
      final blockStmt = stmt.tryBlock as BlockStmt;
      for (final s in blockStmt.statements) {
        writeln(_convertStatement(s));
      }
    } else {
      // Otherwise, convert the single statement
      writeln(_convertStatement(stmt.tryBlock));
    }

    dedent();
    result += '${getIndent()}} ';

    // Convert catch clauses
    for (final catchClause in stmt.catchClauses) {
      result += _convertCatchClause(catchClause);
      result += ' ';
    }

    // Convert finally block if present
    if (stmt.finallyBlock != null) {
      result += 'finally {\n';
      indent();

      if (stmt.finallyBlock is BlockStmt) {
        // If it's already a BlockStmt, use its statements
        final blockStmt = stmt.finallyBlock as BlockStmt;
        for (final s in blockStmt.statements) {
          writeln(_convertStatement(s));
        }
      } else {
        // Otherwise, convert the single statement
        writeln(_convertStatement(stmt.finallyBlock!));
      }

      dedent();
      result += '${getIndent()}}';
    }

    return result.trim();
  }

  String _convertCatchClause(CatchClauseStmt clause) {
    // Get exception variable name
    String exceptionVar = clause.exceptionParameter ?? 'error';

    // Optional: Add exception type checking
    String exceptionType = '';
    if (clause.exceptionType != null) {
      String typeName = clause.exceptionType!.displayName();
      exceptionType = 'if (error instanceof $typeName) ';
    }

    String result = 'catch ($exceptionVar) {\n';
    indent();

    // Convert catch block statements
    if (clause.body is BlockStmt) {
      // If it's already a BlockStmt, use its statements
      final blockStmt = clause.body as BlockStmt;
      for (final s in blockStmt.statements) {
        writeln(_convertStatement(s));
      }
    } else {
      // Otherwise, convert the single statement
      writeln(_convertStatement(clause.body));
    }

    dedent();
    result += '${getIndent()}}';

    return result;
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  bool isWidget(String name) => FLUTTER_WIDGETS.contains(name);

  String _getBaseClass(TypeIR? superclass) {
    if (superclass == null) return 'Widget';

    String name = superclass.displayName();

    if (name.contains('StatefulWidget')) return 'StatefulWidget';
    if (name.contains('StatelessWidget')) return 'StatelessWidget';
    if (name.contains('State')) return 'State';
    if (name.contains('ChangeNotifier')) return 'ChangeNotifier';

    return 'Widget';
  }

  bool _isStatefulWidget(ClassDecl classDecl) {
    if (classDecl.superclass == null) return false;

    String superclassName = classDecl.superclass!.displayName();
    return superclassName.contains('StatefulWidget') ||
        superclassName.contains('State');
  }

  String _escapeString(String str) {
    return str
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r')
        .replaceAll('\t', '\\t');
  }

  String _sanitizeName(String name) {
    return name
        .replaceAll('package:', '')
        .replaceAll('/', '_')
        .replaceAll('-', '_')
        .replaceAll('.', '_');
  }

  String _getTypeComment(TypeIR? type) {
    if (!config.includeTypeComments || type == null) return '';

    String jsType = DART_TO_JS_TYPES[type.displayName()] ?? type.displayName();
    if (jsType.isEmpty) return '';

    return '// @type {$jsType}';
  }

  String _formatCode(String code) {
    final lines = code.split('\n');
    final formatted = <String>[];
    int indent = 0;

    for (final line in lines) {
      final trimmed = line.trim();

      if (trimmed.startsWith('}') ||
          trimmed.startsWith(']') ||
          trimmed.startsWith(')')) {
        indent--;
      }

      if (indent < 0) indent = 0;

      if (trimmed.isNotEmpty) {
        formatted.add('${' ' * (indent * config.indentSpaces)}$trimmed');
      } else {
        formatted.add('');
      }

      if (trimmed.endsWith('{') ||
          trimmed.endsWith('[') ||
          trimmed.endsWith('(')) {
        indent++;
      }
    }

    return formatted.join('\n');
  }

  // =========================================================================
  // OUTPUT HELPERS
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
  // GENERATION REPORT
  // =========================================================================

  String getReport() {
    final report = StringBuffer();

    report.writeln('\n═══════════════════════════════════════');
    report.writeln('IR TO JAVASCRIPT GENERATION REPORT');
    report.writeln('═══════════════════════════════════════\n');

    report.writeln('Classes: ${dartFile.classDeclarations.length}');
    report.writeln('Functions: ${dartFile.functionDeclarations.length}');
    report.writeln('Variables: ${dartFile.variableDeclarations.length}');
    report.writeln('Imports: ${dartFile.imports.length}');
    report.writeln('');

    if (errorCollector.hasErrors()) {
      report.writeln('ERRORS: ${errorCollector.errorCount}');
      for (final error in errorCollector.errors.where(
        (e) => e.severity == ErrorSeverity.ERROR,
      )) {
        report.writeln('  ✗ ${error.message}');
        if (error.suggestion != null) {
          report.writeln('    → ${error.suggestion}');
        }
      }
    }

    if (errorCollector.warningCount > 0) {
      report.writeln('WARNINGS: ${errorCollector.warningCount}');
      for (final warning in errorCollector.errors.where(
        (e) => e.severity == ErrorSeverity.WARNING,
      )) {
        report.writeln('  ⚠ ${warning.message}');
      }
    }

    report.writeln('\n═══════════════════════════════════════\n');

    return report.toString();
  }

  String _convertFunctionDeclaration(FunctionDecl func) {
    context.enterFunction(func);
    scopeManager.pushScope('function');

    for (final param in func.parameters) {
      scopeManager.addVariable(param.name, param.type, isParameter: true);
    }

    String asyncKeyword = func.isAsync ? 'async ' : '';
    String params = func.parameters.map((p) => p.name).join(', ');

    String result = '${asyncKeyword}function ${func.name}($params) {\n';
    indent();

    // Convert function body properly
    if (func.body != null) {
      if (func.body is BlockStmt) {
        final blockStmt = func.body as BlockStmt;
        for (final stmt in blockStmt.statements) {
          writeln(_convertStatement(stmt));
        }
      } else if (func.body is StatementIR) {
        writeln(_convertStatement(func.body as StatementIR));
      }
    } else {
      writeln('// TODO: Function body not available');
    }

    dedent();
    result += output.toString().split('\n').lastWhere((l) => l.isNotEmpty);
    result += '\n${getIndent()}}\n';

    scopeManager.popScope();
    context.exitFunction();

    return result;
  }

  String _convertMethodDeclaration(MethodDecl method) {
    context.enterMethod(method);
    scopeManager.pushScope('method');

    // Register parameters
    for (final param in method.parameters) {
      scopeManager.addVariable(param.name, param.type, isParameter: true);
    }

    String asyncKeyword = method.isAsync ? 'async ' : '';
    String params = method.parameters.map((p) => p.name).join(', ');

    String result = '${asyncKeyword}${method.name}($params) {\n';
    indent();

    // Special handling for lifecycle methods
    if (method.name == 'initState') {
      writeln('super.initState();');
    } else if (method.name == 'dispose') {
      writeln('super.dispose();');
    } else if (method.name == 'build') {
      writeln('// Build widget tree - implement build method');
    } else {
      // Convert actual method body
      if (method.body != null) {
        if (method.body is BlockStmt) {
          final blockStmt = method.body as BlockStmt;
          for (final stmt in blockStmt.statements) {
            writeln(_convertStatement(stmt));
          }
        } else if (method.body is StatementIR) {
          writeln(_convertStatement(method.body as StatementIR));
        }
      } else {
        writeln('// Method implementation');
      }
    }

    dedent();
    result += '${getIndent()}}';

    scopeManager.popScope();
    context.exitMethod();

    return result;
  }

  String _convertClassDeclaration(ClassDecl classDecl) {
    bool isStateful = _isStatefulWidget(classDecl);
    context.enterClass(classDecl, isStateful: isStateful);
    scopeManager.pushScope('class');

    // Register fields in scope
    for (final field in classDecl.fields) {
      scopeManager.addVariable(field.name, field.type, isField: true);
    }

    String baseClass = _getBaseClass(classDecl.superclass);
    String result = 'class ${classDecl.name} extends $baseClass {\n';

    indent();

    // Constructor
    if (classDecl.fields.isNotEmpty || baseClass != 'Widget') {
      result += _convertConstructor(classDecl) + '\n\n';
    }

    // For StatefulWidget, generate createState
    if (isStateful) {
      result += _generateCreateState(classDecl) + '\n\n';
    }

    // Methods
    for (int i = 0; i < classDecl.methods.length; i++) {
      result += getIndent() + _convertMethodDeclaration(classDecl.methods[i]);
      if (i < classDecl.methods.length - 1) {
        result += '\n\n';
      }
    }

    dedent();
    result += '\n${getIndent()}}';

    // Generate State class if StatefulWidget
    if (isStateful) {
      result += '\n\n' + _generateStateClass(classDecl);
    }

    scopeManager.popScope();
    context.exitClass();

    return result;
  }

  String _convertConstructor(ClassDecl classDecl) {
    scopeManager.pushScope('constructor');

    String result = 'constructor() {\n';
    indent();

    // Call super if needed
    if (classDecl.superclass != null &&
        !classDecl.superclass!.displayName().contains('Widget')) {
      writeln('super();');
    }

    // Initialize fields
    for (final field in classDecl.fields) {
      if (field.initializer != null) {
        String init = _convertExpression(field.initializer!);
        writeln('this.${field.name} = $init;');
      } else {
        writeln('this.${field.name} = null;');
      }
    }

    dedent();
    result += '${getIndent()}}';

    scopeManager.popScope();

    return result;
  }

  String _generateCreateState(ClassDecl classDecl) {
    String stateName = '_${classDecl.name}State';
    return '${getIndent()}createState() {\n${getIndent(1)}return new $stateName();\n${getIndent()}}';
  }

  String _generateStateClass(ClassDecl statefulWidget) {
    String stateName = '_${statefulWidget.name}State';

    String result = 'class $stateName extends State {\n';
    indent();

    // Constructor
    result += '${getIndent()}constructor() {\n';
    indent();
    writeln('super();');
    dedent();
    result += '${getIndent()}}\n\n';

    // initState
    result += '${getIndent()}initState() {\n';
    indent();
    writeln('super.initState();');
    dedent();
    result += '${getIndent()}}\n\n';

    // build
    result += '${getIndent()}build(context) {\n';
    indent();
    writeln('return new Container({});');
    dedent();
    result += '${getIndent()}}\n\n';

    // dispose
    result += '${getIndent()}dispose() {\n';
    indent();
    writeln('super.dispose();');
    dedent();
    result += '${getIndent()}}\n';

    dedent();
    result += '${getIndent()}}';

    return result;
  }

  void _generateFunctions() {
    if (dartFile.functionDeclarations.isEmpty) return;

    writeln("\n// ========== FUNCTIONS ==========\n");

    for (int i = 0; i < dartFile.functionDeclarations.length; i++) {
      final functionDecl = dartFile.functionDeclarations[i];
      
      // Get base function structure
      String asyncKeyword = functionDecl.isAsync ? 'async ' : '';
      String params = functionDecl.parameters.map((p) => p.name).join(', ');
      
      write('${asyncKeyword}function ${functionDecl.name}($params) {\n');
      indent();

      // Convert function body
      if (functionDecl.body != null) {
        if (functionDecl.body is BlockStmt) {
          final blockStmt = functionDecl.body as BlockStmt;
          for (final stmt in blockStmt.statements) {
            writeln(_convertStatement(stmt));
          }
        } else if (functionDecl.body is StatementIR) {
          writeln(_convertStatement(functionDecl.body as StatementIR));
        }
      } else {
        writeln('// TODO: Function body');
      }

      dedent();
      writeln('}');
      
      if (i < dartFile.functionDeclarations.length - 1) {
        writeln("");
      }
    }
  }

  void _generateClasses() {
    if (dartFile.classDeclarations.isEmpty) return;

    writeln("\n// ========== CLASSES ==========\n");

    for (int i = 0; i < dartFile.classDeclarations.length; i++) {
      bool isStateful = _isStatefulWidget(dartFile.classDeclarations[i]);
      final classDecl = dartFile.classDeclarations[i];
      
      // Class header
      String baseClass = _getBaseClass(classDecl.superclass);
      writeln('class ${classDecl.name} extends $baseClass {');
      indent();

      // Constructor
      writeln('constructor() {');
      indent();
      if (classDecl.fields.isNotEmpty) {
        for (final field in classDecl.fields) {
          if (field.initializer != null) {
            String init = _convertExpression(field.initializer!);
            writeln('this.${field.name} = $init;');
          } else {
            writeln('this.${field.name} = null;');
          }
        }
      }
      dedent();
      writeln('}');
      
      writeln('');

      // createState for StatefulWidget
      if (isStateful) {
        writeln('createState() {');
        indent();
        writeln('return new _${classDecl.name}State();');
        dedent();
        writeln('}');
        writeln('');
      }

      // Methods
      for (int j = 0; j < classDecl.methods.length; j++) {
        final method = classDecl.methods[j];
        String asyncKeyword = method.isAsync ? 'async ' : '';
        String params = method.parameters.map((p) => p.name).join(', ');
        
        writeln('${asyncKeyword}${method.name}($params) {');
        indent();

        if (method.name == 'initState') {
          writeln('super.initState();');
        } else if (method.name == 'dispose') {
          writeln('super.dispose();');
        } else if (method.name == 'build') {
          writeln('// Build implementation');
        } else if (method.body != null) {
          if (method.body is BlockStmt) {
            final blockStmt = method.body as BlockStmt;
            for (final stmt in blockStmt.statements) {
              writeln(_convertStatement(stmt));
            }
          } else if (method.body is StatementIR) {
            writeln(_convertStatement(method.body as StatementIR));
          }
        }

        dedent();
        writeln('}');
        
        if (j < classDecl.methods.length - 1) {
          writeln('');
        }
      }

      dedent();
      writeln('}');

      // Generate State class if StatefulWidget
      if (isStateful) {
        writeln('');
        writeln('class _${classDecl.name}State extends State {');
        indent();
        
        writeln('constructor() {');
        indent();
        writeln('super();');
        dedent();
        writeln('}');
        writeln('');

        writeln('initState() {');
        indent();
        writeln('super.initState();');
        dedent();
        writeln('}');
        writeln('');

        writeln('build(context) {');
        indent();
        writeln('return new Container({});');
        dedent();
        writeln('}');
        writeln('');

        writeln('dispose() {');
        indent();
        writeln('super.dispose();');
        dedent();
        writeln('}');

        dedent();
        writeln('}');
      }

      if (i < dartFile.classDeclarations.length - 1) {
        writeln("");
      }
    }
  }

}
