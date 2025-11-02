# Comprehensive IR to Flutter JS Code Generation Plan
## 90%+ Complete with Detailed Timeline

---

## PROJECT OVERVIEW

**Goal:** Convert Binary IR (Dart) → JavaScript (Flutter JS Framework)

**Scope Decisions (90% only):**
- ✅ Classes, Functions, Variables
- ✅ Widgets, State Management
- ✅ Expressions, Statements, Control Flow
- ✅ Async/Await, Try-Catch
- ✅ Error Handling & Type Validation
- ✅ Scope Management & Variable Resolution
- ✅ Build Method, Lifecycle Methods
- ❌ Mixins (skip - low priority)
- ❌ Extensions (skip - low priority)
- ❌ Factory Constructors (skip - can add later)
- ❌ Enums (skip - can add later)

**Target Completion:** 8-10 weeks

---

## TIMELINE OVERVIEW

```
WEEK 1:     Setup & Core Architecture (7 days)
WEEK 2:     Error Handling & Scope Manager (7 days)
WEEK 3:     Expression Conversion (7 days)
WEEK 4:     Statement Conversion (7 days)
WEEK 5:     Class & Method Generation (7 days)
WEEK 6:     Widget & Build Method (7 days)
WEEK 7:     Async/Await & Complex Flow (7 days)
WEEK 8:     Integration & Testing (7 days)
WEEK 9:     Optimization & Edge Cases (7 days)
WEEK 10:    Final Polish & Deployment (3 days)

TOTAL: 66 development days = ~10 weeks (part-time friendly)
```

---

# DETAILED PHASE BREAKDOWN

---

# PHASE 1: CORE ARCHITECTURE (Week 1 = 7 days)

## Day 1-2: Generator Class Structure

**Create main class:**

```dart
class IRToFlutterJSGenerator {
  // Configuration
  late GeneratorConfig config;
  late ErrorCollector errorCollector;
  late ScopeManager scopeManager;
  late CodeFormatter formatter;
  late GenerationContext context;
  
  // Output
  StringBuffer output = StringBuffer();
  int indentLevel = 0;
  
  // Data
  late DartFile dartFile;
  Map<String, String> typeMapping = {};
  Map<int, String> binaryOpMap = {};
  Map<int, String> unaryOpMap = {};
  Map<String, bool> widgetRegistry = {};
  
  // Main entry
  String generate(List<int> binaryData, {GeneratorConfig? config}) {
    // Initialize
    // Read IR
    // Generate code
    // Format output
    // Return result
  }
}
```

**Mapping tables initialization:**

```dart
void initializeMappings() {
  // Binary operators
  binaryOpMap = {
    0x01: '+', 0x02: '-', 0x03: '*', 0x04: '/',
    0x10: '===', 0x11: '!==', 0x12: '<', 0x15: '>=',
    0x20: '&&', 0x21: '||', // ... more
  };
  
  // Unary operators
  unaryOpMap = {
    0x01: '-', 0x02: '!', 0x03: '~', // ...
  };
  
  // Type mapping
  typeMapping = {
    'int': 'Number', 'double': 'Number',
    'String': 'String', 'bool': 'Boolean',
    'List': 'Array', 'Map': 'Object',
    'void': '', 'dynamic': '',
  };
  
  // Widget registry
  widgetRegistry = {
    'Container': true, 'Text': true, 'Row': true,
    'Column': true, 'Scaffold': true, 'AppBar': true,
    'FloatingActionButton': true, 'ElevatedButton': true,
    // ... all 20+ widgets
  };
}
```

---

## Day 2-3: Utility Methods

**Writing utilities:**

```dart
class GeneratorUtils {
  // INDENTATION & FORMATTING
  void indent() => indentLevel++;
  void dedent() => indentLevel--;
  String getIndent() => '  ' * indentLevel;
  
  void write(String text) {
    output.write(text);
  }
  
  void writeln(String text, {int? indent}) {
    if (indent != null) {
      output.write(getIndent());
    }
    output.writeln(text);
  }
  
  void writeBlock(String name, String content) {
    writeln('$name {');
    indent();
    writeln(content);
    dedent();
    writeln('}');
  }
  
  // STRING HANDLING
  String escapeString(String str) {
    return str
      .replaceAll('\\', '\\\\')
      .replaceAll('"', '\\"')
      .replaceAll('\n', '\\n')
      .replaceAll('\r', '\\r')
      .replaceAll('\t', '\\t');
  }
  
  String formatIdentifier(String id) {
    // Sanitize if needed
    if (isKeyword(id)) return '${id}_';
    return id;
  }
  
  // TYPE HANDLING
  String mapType(TypeIR type) {
    if (type is SimpleTypeIR) {
      return typeMapping[type.name] ?? type.name;
    }
    return 'any';
  }
  
  String getTypeComment(TypeIR type) {
    if (!config.includeTypeComments) return '';
    String typeStr = mapType(type);
    return typeStr.isEmpty ? '' : '// @type {$typeStr}';
  }
  
  // VALIDATION
  bool isWidget(String name) => widgetRegistry[name] ?? false;
  bool isKeyword(String word) {
    final keywords = {'class', 'function', 'const', 'let', 'return', 'if', 'else',
                      'for', 'while', 'try', 'catch', 'finally', 'throw', 'new',
                      'this', 'super', 'async', 'await', 'yield', 'export', 'import'};
    return keywords.contains(word);
  }
}
```

---

## Day 3-4: Configuration System

```dart
class GeneratorConfig {
  final int indentSpaces;
  final bool useSemicolons;
  final bool includeTypeComments;
  final bool formatCode;
  final bool verboseOutput;
  final bool generateSourceMaps;
  final int maxLineLength;
  
  const GeneratorConfig({
    this.indentSpaces = 2,
    this.useSemicolons = true,
    this.includeTypeComments = true,
    this.formatCode = true,
    this.verboseOutput = false,
    this.generateSourceMaps = false,
    this.maxLineLength = 100,
  });
  
  GeneratorConfig copyWith({
    int? indentSpaces,
    bool? useSemicolons,
    bool? includeTypeComments,
    bool? formatCode,
    bool? verboseOutput,
    bool? generateSourceMaps,
    int? maxLineLength,
  }) {
    return GeneratorConfig(
      indentSpaces: indentSpaces ?? this.indentSpaces,
      // ... copy others
    );
  }
}
```

---

## Day 4-5: Code Formatting

```dart
class CodeFormatter {
  String formatComplete(String code, GeneratorConfig config) {
    code = _normalizeLineBreaks(code);
    code = _fixIndentation(code, config.indentSpaces);
    code = _addSpacing(code);
    code = _formatBraces(code);
    return code;
  }
  
  String _normalizeLineBreaks(String code) {
    return code.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  }
  
  String _fixIndentation(String code, int spaces) {
    final lines = code.split('\n');
    final result = <String>[];
    int indent = 0;
    
    for (final line in lines) {
      final trimmed = line.trim();
      
      if (trimmed.startsWith('}')) indent--;
      if (indent < 0) indent = 0;
      
      if (trimmed.isNotEmpty) {
        result.add('${' ' * (indent * spaces)}$trimmed');
      } else {
        result.add('');
      }
      
      if (trimmed.endsWith('{')) indent++;
    }
    
    return result.join('\n');
  }
  
  String _addSpacing(String code) {
    // Add space after keywords
    code = code.replaceAllMapped(
      RegExp(r'(if|for|while|switch|catch)\('),
      (m) => '${m.group(1)} ('
    );
    
    // Add spaces around operators
    code = code.replaceAll(RegExp(r'([^=!<>+\-*/%&|^])=([^=])'), r'$1 = $2');
    
    return code;
  }
  
  String _formatBraces(String code) {
    // Ensure proper brace formatting
    // Opening { on same line, closing } on new line
    return code;
  }
}
```

---

## Day 5-7: Testing & Validation

**Create test structure:**

```dart
class GeneratorTestSuite {
  void testLiteralConversion() {
    // Test each literal type
    final result = generator.convertLiteral(stringLit);
    assert(result == '"hello"');
  }
  
  void testIdentifierResolution() {
    // Test variable lookups
  }
  
  void testTypeMapping() {
    // Test Dart -> JS type conversion
  }
}
```

---

# PHASE 2: ERROR HANDLING & SCOPE (Week 2 = 7 days)

## Day 8-9: Error System

```dart
enum ErrorSeverity { FATAL, ERROR, WARNING, INFO }

class GenerationError {
  final String message;
  final ErrorSeverity severity;
  final String? suggestion;
  final String? location;
  final int? lineNumber;
  
  GenerationError({
    required this.message,
    required this.severity,
    this.suggestion,
    this.location,
    this.lineNumber,
  });
  
  String format() => '''
Error: $message
Severity: $severity
${suggestion != null ? 'Suggestion: $suggestion' : ''}
${location != null ? 'Location: $location' : ''}
  ''';
}

class ErrorCollector {
  List<GenerationError> errors = [];
  
  void addError(GenerationError error) {
    errors.add(error);
    if (error.severity == ErrorSeverity.FATAL) {
      throw GenerationException(error);
    }
  }
  
  void errorUnknownExpression(dynamic expr) {
    addError(GenerationError(
      message: 'Unknown expression type: ${expr.runtimeType}',
      severity: ErrorSeverity.ERROR,
      suggestion: 'Check IR structure',
    ));
  }
  
  void errorTypeMismatch(String expected, String got) {
    addError(GenerationError(
      message: 'Type mismatch: expected $expected, got $got',
      severity: ErrorSeverity.WARNING,
    ));
  }
  
  void errorUnresolvedIdentifier(String name) {
    addError(GenerationError(
      message: 'Unresolved identifier: $name',
      severity: ErrorSeverity.ERROR,
      suggestion: 'Check variable declaration and scope',
    ));
  }
  
  void warningUnsupportedFeature(String feature) {
    addError(GenerationError(
      message: 'Unsupported feature: $feature',
      severity: ErrorSeverity.WARNING,
      suggestion: 'Feature will be simulated or skipped',
    ));
  }
  
  bool hasErrors() => errors.any((e) => e.severity == ErrorSeverity.ERROR);
  bool hasFatalErrors() => errors.any((e) => e.severity == ErrorSeverity.FATAL);
}
```

---

## Day 9-11: Scope Manager

```dart
class VariableInfo {
  final String name;
  final TypeIR type;
  final bool isField;
  final bool isFinal;
  final bool isParameter;
  final Scope declaringScope;
  
  VariableInfo({
    required this.name,
    required this.type,
    this.isField = false,
    this.isFinal = false,
    this.isParameter = false,
    required this.declaringScope,
  });
}

class Scope {
  final String name;
  final Scope? parent;
  final Map<String, VariableInfo> variables = {};
  int depth = 0;
  
  Scope(this.name, {this.parent}) {
    depth = (parent?.depth ?? -1) + 1;
  }
  
  void addVariable(String name, VariableInfo info) {
    variables[name] = info;
  }
  
  VariableInfo? lookupLocal(String name) => variables[name];
  
  VariableInfo? lookupRecursive(String name) {
    var info = variables[name];
    if (info != null) return info;
    return parent?.lookupRecursive(name);
  }
  
  bool isDefined(String name) => lookupRecursive(name) != null;
  List<String> getLocalNames() => variables.keys.toList();
}

class ScopeManager {
  late Scope globalScope;
  late Scope currentScope;
  final Stack<Scope> scopeStack = Stack();
  
  ScopeManager() {
    globalScope = Scope('global');
    currentScope = globalScope;
  }
  
  void pushScope(String name) {
    final newScope = Scope(name, parent: currentScope);
    scopeStack.push(currentScope);
    currentScope = newScope;
  }
  
  void popScope() {
    if (scopeStack.isNotEmpty) {
      currentScope = scopeStack.pop();
    }
  }
  
  void addVariable(String name, TypeIR type, {
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
      declaringScope: currentScope,
    );
    currentScope.addVariable(name, info);
  }
  
  VariableInfo? resolveVariable(String name) {
    return currentScope.lookupRecursive(name);
  }
  
  bool isInLocalScope(String name) {
    return currentScope.lookupLocal(name) != null;
  }
  
  String getPrefixForVariable(String name) {
    final info = resolveVariable(name);
    if (info == null) return '';
    
    if (info.isField && !isInLocalScope(name)) {
      return 'this.';
    }
    
    return '';
  }
  
  bool isNameShadowed(String name) {
    return currentScope.lookupLocal(name) != null &&
           currentScope.parent?.lookupRecursive(name) != null;
  }
}
```

---

## Day 11-12: Type System

```dart
class TypeValidator {
  bool isAssignableFrom(TypeIR target, TypeIR source) {
    if (target is DynamicTypeIR || source is DynamicTypeIR) return true;
    
    if (target.displayName() == source.displayName()) return true;
    
    // Allow numeric conversions
    if (['int', 'double'].contains(target.displayName()) &&
        ['int', 'double'].contains(source.displayName())) {
      return true;
    }
    
    return false;
  }
  
  bool isNumericType(TypeIR type) {
    final name = type.displayName();
    return ['int', 'double', 'num'].contains(name);
  }
  
  bool isStringType(TypeIR type) => type.displayName() == 'String';
  bool isBoolType(TypeIR type) => type.displayName() == 'bool';
  bool isCollectionType(TypeIR type) {
    final name = type.displayName();
    return ['List', 'Map', 'Set'].any((t) => name.contains(t));
  }
  
  bool isNullable(TypeIR type) {
    return type.isNullable || type is DynamicTypeIR;
  }
}

class TypeSystemRules {
  static const enforceNullSafety = false; // JS compatibility
  
  static const autoCoerceTypes = {
    'int-double': true,
    'int-String': false, // Requires .toString()
    'double-String': false,
  };
  
  static const warnableConversions = {
    'dynamic-specific': true,
    'nullable-non-nullable': true,
  };
}
```

---

## Day 12-14: Context Manager

```dart
class GenerationContext {
  ClassDecl? currentClass;
  MethodDecl? currentMethod;
  FunctionDecl? currentFunction;
  bool inBuildMethod = false;
  bool inAsyncContext = false;
  bool inStatefulWidget = false;
  int blockDepth = 0;
  
  void enterClass(ClassDecl cls) {
    currentClass = cls;
    inStatefulWidget = cls.superclass?.displayName().contains('StatefulWidget') ?? false;
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
  
  bool isInStatefulWidget() => inStatefulWidget;
  bool isInBuildMethod() => inBuildMethod;
  bool canUseAwait() => inAsyncContext;
  String? getThisPrefix() => currentClass != null ? 'this.' : null;
}
```

---

# PHASE 3: EXPRESSION CONVERSION (Week 3 = 7 days)

## Day 15: Literals & Identifiers

```dart
String convertLiteral(LiteralExpressionIR expr) {
  switch (expr.literalType) {
    case LiteralType.stringValue:
      return '"${escapeString(expr.value as String)}"';
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

String convertIdentifier(IdentifierExpressionIR expr) {
  VariableInfo? varInfo = scopeManager.resolveVariable(expr.name);
  
  if (varInfo == null) {
    errorCollector.errorUnresolvedIdentifier(expr.name);
    return '/* UNDEFINED: ${expr.name} */';
  }
  
  String prefix = scopeManager.getPrefixForVariable(expr.name);
  return '$prefix${expr.name}';
}
```

---

## Day 15-16: Binary & Unary Operators

```dart
String convertBinaryExpression(BinaryExpressionIR expr) {
  String left = convertExpression(expr.left);
  String right = convertExpression(expr.right);
  String op = binaryOpMap[expr.operator] ?? '?';
  
  // Special cases
  if (expr.operator == BinaryConstants.OP_INT_DIVIDE) {
    return 'Math.floor(($left) / ($right))';
  }
  
  return '($left) $op ($right)';
}

String convertUnaryExpression(UnaryExpressionIR expr) {
  String operand = convertExpression(expr.operand);
  String op = unaryOpMap[expr.operator] ?? '?';
  
  if (expr.operator == BinaryConstants.UNARY_PRE_INCREMENT) {
    return '++$operand';
  } else if (expr.operator == BinaryConstants.UNARY_POST_INCREMENT) {
    return '$operand++';
  }
  
  return '$op($operand)';
}
```

---

## Day 16-17: Collections

```dart
String convertListExpression(ListExpressionIR expr) {
  List<String> elements = expr.elements
    .map(e => convertExpression(e))
    .toList();
  
  String result = '[${elements.join(', ')}]';
  
  if (expr.isConst) {
    result = 'Object.freeze($result)';
  }
  
  return result;
}

String convertMapExpression(MapExpressionIR expr) {
  List<String> entries = expr.entries
    .map(e => '${convertExpression(e.key)}: ${convertExpression(e.value)}')
    .toList();
  
  return '{${entries.join(', ')}}';
}

String convertSetExpression(SetExpressionIR expr) {
  List<String> elements = expr.elements
    .map(e => convertExpression(e))
    .toList();
  
  return 'new Set([${elements.join(', ')}])';
}
```

---

## Day 17-18: Method Calls & Widget Creation

```dart
String convertMethodCall(MethodCallExpressionIR expr) {
  // Check for widgets
  if (isWidget(expr.methodName)) {
    return convertWidgetCall(expr);
  }
  
  // Check for setState
  if (expr.methodName == 'setState') {
    return convertSetState(expr);
  }
  
  // Regular method call
  String target = '';
  if (expr.target != null) {
    target = convertExpression(expr.target!) + '.';
  }
  
  String args = _formatArguments(expr.arguments, expr.namedArguments);
  return '$target${expr.methodName}($args)';
}

String convertWidgetCall(MethodCallExpressionIR expr) {
  String widgetName = expr.methodName;
  String props = _formatWidgetProps(expr.namedArguments);
  
  return 'new $widgetName({$props})';
}

String convertSetState(MethodCallExpressionIR expr) {
  if (expr.arguments.isEmpty) {
    errorCollector.warningUnsupportedFeature('setState with no arguments');
    return 'this.setState({})';
  }
  
  String arg = convertExpression(expr.arguments[0]);
  return 'this.setState($arg)';
}

String _formatArguments(List<ExpressionIR> args, Map<String, ExpressionIR> namedArgs) {
  List<String> parts = [];
  
  // Positional
  parts.addAll(args.map(a => convertExpression(a)));
  
  // Named
  parts.addAll(namedArgs.entries
    .map(e => '${e.key}: ${convertExpression(e.value)}'));
  
  return parts.join(', ');
}

String _formatWidgetProps(Map<String, ExpressionIR> props) {
  List<String> result = [];
  
  for (final entry in props.entries) {
    String key = entry.key;
    String value = convertExpression(entry.value);
    result.add('$key: $value');
  }
  
  return result.join(',\n${getIndent()}');
}
```

---

## Day 18-19: Property & Index Access

```dart
String convertPropertyAccess(PropertyAccessExpressionIR expr) {
  String target = convertExpression(expr.target);
  return '$target.${expr.propertyName}';
}

String convertIndexAccess(IndexAccessExpressionIR expr) {
  String target = convertExpression(expr.target);
  String index = convertExpression(expr.index);
  
  if (expr.isNullAware) {
    return '$target?.[$index]';
  }
  
  return '$target[$index]';
}
```

---

## Day 19-21: Complex Expressions

```dart
String convertConditional(ConditionalExpressionIR expr) {
  String cond = convertExpression(expr.condition);
  String then = convertExpression(expr.thenExpression);
  String els = convertExpression(expr.elseExpression);
  
  return '($cond) ? ($then) : ($els)';
}

String convertAssignment(AssignmentExpressionIR expr) {
  String target = convertExpression(expr.target);
  String value = convertExpression(expr.value);
  
  return '$target = $value';
}

String convertNullCoalescing(NullCoalescingExpressionIR expr) {
  String left = convertExpression(expr.left);
  String right = convertExpression(expr.right);
  
  return '$left ?? $right';
}

String convertStringInterpolation(StringInterpolationExpressionIR expr) {
  String result = '`';
  
  for (final part in expr.parts) {
    if (part.isExpression) {
      String exp = convertExpression(part.expression!);
      result += '\${$exp}';
    } else {
      result += part.text!;
    }
  }
  
  result += '`';
  return result;
}

String convertLambda(LambdaExpr expr) {
  String params = expr.parameters
    .map(p => p.name)
    .join(', ');
  
  if (expr.body == null) {
    return '($params) => undefined';
  }
  
  String body = convertExpression(expr.body!);
  return '($params) => $body';
}
```

---

# PHASE 4: STATEMENT CONVERSION (Week 4 = 7 days)

## Day 22: Simple Statements

```dart
String convertExpressionStatement(ExpressionStmt stmt) {
  String expr = convertExpression(stmt.expression);
  return '$expr;';
}

String convertReturnStatement(ReturnStmt stmt) {
  if (stmt.expression == null) {
    return 'return;';
  }
  
  String expr = convertExpression(stmt.expression!);
  return 'return $expr;';
}

String convertThrowStatement(ThrowStmt stmt) {
  String expr = convertExpression(stmt.exceptionExpression);
  return 'throw $expr;';
}

String convertBreakStatement(BreakStmt stmt) {
  return stmt.label != null ? 'break ${stmt.label};' : 'break;';
}

String convertContinueStatement(ContinueStmt stmt) {
  return stmt.label != null ? 'continue ${stmt.label};' : 'continue;';
}
```

---

## Day 22-23: Variable Declarations & Blocks

```dart
String convertVariableDeclaration(VariableDeclarationStmt stmt) {
  String keyword = stmt.isFinal || stmt.isConst ? 'const' : 'let';
  String name = stmt.name;
  String init = '';
  
  if (stmt.initializer != null) {
    init = ' = ${convertExpression(stmt.initializer!)}';
  }
  
  scopeManager.addVariable(name, stmt.type ?? DynamicTypeIR(id: '', sourceLocation: null));
  
  String typeComment = getTypeComment(stmt.type);
  return (typeComment.isNotEmpty ? '$typeComment\n' : '') + '$keyword $name$init;';
}

String convertBlockStatement(BlockStmt stmt) {
  scopeManager.pushScope('block');
  
  String result = '{\n';
  indent();
  
  for (final s in stmt.statements) {
    String code = convertStatement(s);
    writeln(code);
  }
  
  dedent();
  result += '${getIndent()}}';
  
  scopeManager.popScope();
  
  return result;
}
```

---

## Day 23-24: Control Flow

```dart
String convertIfStatement(IfStmt stmt) {
  String cond = convertExpression(stmt.condition);
  String then = convertStatement(stmt.thenBranch);
  
  String result = 'if ($cond) $then';
  
  if (stmt.elseBranch != null) {
    String els = convertStatement(stmt.elseBranch!);
    result += '\nelse $els';
  }
  
  return result;
}

String convertForStatement(ForStmt stmt) {
  String init = '';
  if (stmt.initialization != null) {
    if (stmt.initialization is VariableDeclarationStmt) {
      init = convertVariableDeclaration(stmt.initialization as VariableDeclarationStmt);
      init = init.substring(0, init.length - 1); // Remove ;
    } else {
      init = convertExpression(stmt.initialization as ExpressionIR);
    }
  }
  
  String cond = stmt.condition != null ? convertExpression(stmt.condition!) : '';
  String updates = stmt.updaters.map(e => convertExpression(e)).join(', ');
  
  String body = convertStatement(stmt.body);
  
  return 'for ($init; $cond; $updates) $body';
}

String convertForEachStatement(ForEachStmt stmt) {
  scopeManager.pushScope('forEach');
  scopeManager.addVariable(
    stmt.loopVariable,
    stmt.loopVariableType ?? DynamicTypeIR(id: '', sourceLocation: null)
  );
  
  String iterable = convertExpression(stmt.iterable);
  String body = convertStatement(stmt.body);
  
  String result = 'for (const ${stmt.loopVariable} of $iterable) $body';
  
  scopeManager.popScope();
  
  return result;
}

String convertWhileStatement(WhileStmt stmt) {
  String cond = convertExpression(stmt.condition);
  String body = convertStatement(stmt.body);
  
  return 'while ($cond) $body';
}
```

---

## Day 24-25: Switch & Try-Catch

```dart
String convertSwitchStatement(SwitchStmt stmt) {
  String expr = convertExpression(stmt.expression);
  
  String result = 'switch ($expr) {\n';
  indent();
  
  for (final caseStmt in stmt.cases) {
    if (caseStmt.patterns != null) {
      for (final pattern in caseStmt.patterns!) {
        String p = convertExpression(pattern);
        result += '${getIndent()}case $p:\n';
      }
    }
    
    indent();
    for (final s in caseStmt.statements) {
      result += '${getIndent()}${convertStatement(s)}\n';
    }
    result += '${getIndent()}break;\n';
    dedent();
  }
  
  if (stmt.defaultCase != null) {
    result += '${getIndent()}default:\n';
    indent();
    for (final s in stmt.defaultCase!.statements) {
      result += '${getIndent()}${convertStatement(s)}\n';
    }
    dedent();
  }
  
  dedent();
  result += '}';
  
  return result;
}

String convertTryStatement(TryStmt stmt) {
  String result = 'try {\n';
  indent();
  
  for (final s in stmt.tryBlock.statements) {
    result += '${getIndent()}${convertStatement(s)}\n';
  }
  
  dedent();
  result += '}\n';
  
  for (final catchClause in stmt.catchClauses) {
    result += convertCatchClause(catchClause);
    result += '\n';
  }
  
  if (stmt.finallyBlock != null) {
    result += 'finally {\n';
    indent();
    for (final s in stmt.finallyBlock!.statements) {
      result += '${getIndent()}${convertStatement(s)}\n';
    }
    dedent();
    result += '}';
  }
  
  return result;
}

String convertCatchClause(CatchClauseStmt clause) {
  String exceptionVar = clause.exceptionParameter ?? 'e';
  
  String result = 'catch ($exceptionVar) {\n';
  indent();
  
  for (final s in clause.body.statements) {
    result += '${getIndent()}${convertStatement(s)}\n';
  }
  
  dedent();
  result += '}';
  
  return result;
}
```

---

## Day 25-26: Async/Await

```dart
String convertAwaitExpression(AwaitExpr expr) {
  if (!generationContext.canUseAwait()) {
    errorCollector.errorUnsupportedFeature('await outside async context');
    return convertExpression(expr.futureExpression);
  }
  
  String future = convertExpression(expr.futureExpression);
  return 'await $future';
}
```

---

## Day 26-28: Statement Master Dispatcher

```dart
String convertStatement(StatementIR stmt) {
  try {
    if (stmt is ExpressionStmt) {
      return convertExpressionStatement(stmt);
    } else if (stmt is VariableDeclarationStmt) {
      return convertVariableDeclaration(stmt);
    } else if (stmt is ReturnStmt) {
      return convertReturnStatement(stmt);
    } else if (stmt is BreakStmt) {
      return convertBreakStatement(stmt);
    } else if (stmt is ContinueStmt) {
      return convertContinueStatement(stmt);
    } else if (stmt is ThrowStmt) {
      return convertThrowStatement(stmt);
    } else if (stmt is BlockStmt) {
      return convertBlockStatement(stmt);
    } else if (stmt is IfStmt) {
      return convertIfStatement(stmt);
    } else if (stmt is ForStmt) {
      return convertForStatement(stmt);
    } else if (stmt is ForEachStmt) {
      return convertForEachStatement(stmt);
    } else if (stmt is WhileStmt) {
      return convertWhileStatement(stmt);
    } else if (stmt is DoWhileStmt) {
      return convertDoWhileStatement(stmt);
    } else if (stmt is SwitchStmt) {
      return convertSwitchStatement(stmt);
    } else if (stmt is TryStmt) {
      return convertTryStatement(stmt);
    } else {
      errorCollector.errorUnknownExpression(stmt);
      return '/* UNKNOWN STATEMENT */';
    }
  } catch (e, stack) {
    errorCollector.addError(GenerationError(
      message: 'Error converting statement: $e',
      severity: ErrorSeverity.ERROR,
      location: stack.toString(),
    ));
    return '/* ERROR CONVERTING STATEMENT */';
  }
}
```

---

# PHASE 5: CLASS & METHOD GENERATION (Week 5 = 7 days)

## Day 29-30: Method Generation

```dart
String convertMethodDeclaration(MethodDecl method) {
  generationContext.enterMethod(method);
  scopeManager.pushScope('method');
  
  // Add parameters to scope
  for (final param in method.parameters) {
    scopeManager.addVariable(param.name, param.type, isParameter: true);
  }
  
  String asyncKeyword = method.isAsync ? 'async ' : '';
  String getterKeyword = method.isGetter ? 'get ' : '';
  String setterKeyword = method.isSetter ? 'set ' : '';
  
  String params = method.parameters
    .map(p => p.name)
    .join(', ');
  
  String result = '${asyncKeyword}${getterKeyword}${setterKeyword}${method.name}($params) {\n';
  
  indent();
  
  // Special handling for lifecycle methods
  if (method.name == 'initState') {
    writeln('super.initState();');
  }
  
  // TODO: Generate method body from statements
  writeln('// Method implementation');
  
  dedent();
  result += '${getIndent()}}';
  
  scopeManager.popScope();
  generationContext.exitMethod();
  
  return result;
}

String convertConstructor(ClassDecl classDecl) {
  scopeManager.pushScope('constructor');
  
  String result = 'constructor() {\n';
  indent();
  
  // Call super if needed
  if (classDecl.superclass != null &&
      classDecl.superclass!.displayName() != 'Widget') {
    writeln('super();');
  }
  
  // Initialize fields
  for (final field in classDecl.fields) {
    if (field.initializer != null) {
      String init = convertExpression(field.initializer!);
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
```

---

## Day 30-31: Class Generation

```dart
String convertClassDeclaration(ClassDecl classDecl) {
  generationContext.enterClass(classDecl);
  scopeManager.pushScope('class');
  
  // Add fields to scope
  for (final field in classDecl.fields) {
    scopeManager.addVariable(field.name, field.type, isField: true);
  }
  
  String baseClass = _getBaseClass(classDecl.superclass);
  
  String result = 'class ${classDecl.name} extends $baseClass {\n';
  indent();
  
  // Constructor
  if (classDecl.fields.isNotEmpty || baseClass != 'Widget') {
    result += convertConstructor(classDecl) + '\n\n';
  }
  
  // If StatefulWidget, add createState
  if (baseClass == 'StatefulWidget') {
    result += 'createState() {\n';
    indent();
    result += 'return new _${classDecl.name}State();\n';
    dedent();
    result += '}\n\n';
  }
  
  // Methods
  for (int i = 0; i < classDecl.methods.length; i++) {
    result += convertMethodDeclaration(classDecl.methods[i]);
    if (i < classDecl.methods.length - 1) {
      result += '\n\n';
    }
  }
  
  dedent();
  result += '}\n';
  
  // If StatefulWidget, generate State class
  if (baseClass == 'StatefulWidget') {
    result += '\n' + _generateStateClass(classDecl);
  }
  
  scopeManager.popScope();
  generationContext.exitClass();
  
  return result;
}

String _getBaseClass(TypeIR? superclass) {
  if (superclass == null) return 'Widget';
  
  String name = superclass.displayName();
  
  if (name.contains('StatefulWidget')) return 'StatefulWidget';
  if (name.contains('StatelessWidget')) return 'StatelessWidget';
  if (name.contains('State')) return 'State';
  if (name.contains('ChangeNotifier')) return 'ChangeNotifier';
  
  return 'Widget';
}

String _generateStateClass(ClassDecl statefulWidget) {
  String stateName = '_${statefulWidget.name}State';
  
  // Find the corresponding state class in the file
  // For now, create a basic one
  String result = 'class $stateName extends State {\n';
  indent();
  
  result += 'constructor() {\n';
  indent();
  result += 'super();\n';
  dedent();
  result += '}\n\n';
  
  result += 'initState() {\n';
  indent();
  result += 'super.initState();\n';
  dedent();
  result += '}\n\n';
  
  result += 'build(context) {\n';
  indent();
  result += 'return new Container({});\n';
  dedent();
  result += '}\n\n';
  
  result += 'dispose() {\n';
  indent();
  result += 'super.dispose();\n';
  dedent();
  result += '}\n';
  
  dedent();
  result += '}\n';
  
  return result;
}
```

---

## Day 31-32: Function Generation

```dart
String convertFunctionDeclaration(FunctionDecl func) {
  generationContext.enterFunction(func);
  scopeManager.pushScope('function');
  
  // Add parameters
  for (final param in func.parameters) {
    scopeManager.addVariable(param.name, param.type, isParameter: true);
  }
  
  String asyncKeyword = func.isAsync ? 'async ' : '';
  String params = func.parameters
    .map(p => p.name)
    .join(', ');
  
  String result = '${asyncKeyword}function ${func.name}($params) {\n';
  
  indent();
  writeln('// Function implementation');
  dedent();
  
  result += '}\n';
  
  scopeManager.popScope();
  generationContext.exitFunction();
  
  return result;
}
```

---

## Day 32-35: Top-Level Generation

```dart
String convertTopLevelVariable(VariableDecl variable) {
  String keyword = variable.isConst ? 'const' : 'let';
  String init = '';
  
  if (variable.initializer != null) {
    init = ' = ${convertExpression(variable.initializer!)}';
  }
  
  String typeComment = getTypeComment(variable.type);
  return (typeComment.isNotEmpty ? '$typeComment\n' : '') +
         '$keyword ${variable.name}$init;';
}

void generateImports() {
  writeln("import FlutterJS from 'flutter-js-framework';");
  writeln("const { Container, Text, Row, Column, Scaffold, AppBar, ");
  writeln("        ElevatedButton, FloatingActionButton, Icon, Image ");
  writeln("      } = FlutterJS.widgets;");
  writeln("const { State, StatefulWidget, StatelessWidget, BuildContext } = FlutterJS.core;");
  writeln("const { Colors } = FlutterJS.foundation;");
  
  // File imports
  for (final import in dartFile.imports) {
    writeln("import * as ${_sanitizeImportPath(import.uri)} from '${import.uri}';");
  }
}

void generateTopLevelVariables() {
  if (dartFile.variableDeclarations.isEmpty) return;
  
  writeln('\n// ========== VARIABLES ==========\n');
  
  for (final variable in dartFile.variableDeclarations) {
    writeln(convertTopLevelVariable(variable));
  }
}

void generateFunctions() {
  if (dartFile.functionDeclarations.isEmpty) return;
  
  writeln('\n// ========== FUNCTIONS ==========\n');
  
  for (int i = 0; i < dartFile.functionDeclarations.length; i++) {
    writeln(convertFunctionDeclaration(dartFile.functionDeclarations[i]));
    if (i < dartFile.functionDeclarations.length - 1) {
      writeln('');
    }
  }
}

void generateClasses() {
  if (dartFile.classDeclarations.isEmpty) return;
  
  writeln('\n// ========== CLASSES ==========\n');
  
  for (int i = 0; i < dartFile.classDeclarations.length; i++) {
    writeln(convertClassDeclaration(dartFile.classDeclarations[i]));
    if (i < dartFile.classDeclarations.length - 1) {
      writeln('');
    }
  }
}

void generateExports() {
  List<String> exports = [];
  
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
  
  writeln('\n// ========== EXPORTS ==========\n');
  writeln('export {');
  indent();
  for (int i = 0; i < exports.length; i++) {
    String comma = i < exports.length - 1 ? ',' : '';
    writeln('${exports[i]}$comma');
  }
  dedent();
  writeln('};');
}
```

---

# PHASE 6: WIDGET & BUILD METHOD (Week 6 = 7 days)

## Day 36-38: Build Method Conversion

```dart
String convertBuildMethod(MethodDecl buildMethod) {
  generationContext.enterMethod(buildMethod);
  
  String result = 'build(context) {\n';
  indent();
  
  // Build methods should return a single widget
  // Collect all statements and extract the return
  StatementIR? returnStmt;
  List<StatementIR> setupStmts = [];
  
  if (buildMethod.body is BlockStmt) {
    for (final stmt in (buildMethod.body as BlockStmt).statements) {
      if (stmt is ReturnStmt) {
        returnStmt = stmt;
      } else {
        setupStmts.add(stmt);
      }
    }
  }
  
  // Output setup statements
  for (final stmt in setupStmts) {
    writeln(convertStatement(stmt));
  }
  
  // Output return statement
  if (returnStmt != null) {
    writeln(convertStatement(returnStmt));
  } else {
    writeln('return new Container({});');
  }
  
  dedent();
  result += '}\n';
  
  generationContext.exitMethod();
  
  return result;
}
```

---

## Day 38-40: Widget Formatting

```dart
String formatWidgetTree(MethodCallExpressionIR widget, {int depth = 0}) {
  String indent = '  ' * depth;
  String widgetName = widget.methodName;
  
  // Format properties
  List<String> props = [];
  
  for (final entry in widget.namedArguments.entries) {
    String key = entry.key;
    ExpressionIR value = entry.value;
    
    String valueStr;
    if (value is MethodCallExpressionIR && isWidget(value.methodName)) {
      valueStr = formatWidgetTree(value, depth: depth + 1);
    } else {
      valueStr = convertExpression(value);
    }
    
    props.add('$key: $valueStr');
  }
  
  String propStr = props.join(',\n${indent}  ');
  
  if (propStr.isEmpty) {
    return 'new $widgetName({})';
  }
  
  return 'new $widgetName({\n${indent}  $propStr\n$indent})';
}
```

---

## Day 40-42: State Management

```dart
String convertSetState(MethodCallExpressionIR expr) {
  if (expr.arguments.isEmpty) {
    errorCollector.warningUnsupportedFeature('setState with no arguments');
    return 'this.setState({})';
  }
  
  ExpressionIR arg = expr.arguments[0];
  
  // If it's a map, use directly
  if (arg is MapExpressionIR) {
    String mapStr = convertMapExpression(arg);
    return 'this.setState($mapStr)';
  }
  
  // If it's a lambda/function, call it
  String argStr = convertExpression(arg);
  return 'this.setState($argStr)';
}
```

---

## Day 42-45: Complex Widget Trees

```dart
String generateBuildMethodWithComplexWidgets(MethodDecl method) {
  // Handle Scaffold, AppBar, FloatingActionButton patterns
  // Handle Column/Row children arrays
  // Handle nested widgets
  
  String result = 'build(context) {\n';
  indent();
  
  result += 'return new Scaffold({\n';
  indent();
  result += 'appBar: new AppBar({\n';
  indent();
  result += 'title: new Text("Home")\n';
  dedent();
  result += '}),\n';
  
  result += 'body: new Center({\n';
  indent();
  result += 'child: new Column({\n';
  indent();
  result += 'children: [\n';
  // ... format children
  result += ']\n';
  dedent();
  result += '})\n';
  dedent();
  result += '})\n';
  
  dedent();
  result += '});\n';
  dedent();
  result += '}\n';
  
  return result;
}
```

---

# PHASE 7: ASYNC/AWAIT & COMPLEX FLOW (Week 7 = 7 days)

## Day 46-48: Async Function Bodies

```dart
String convertAsyncFunction(FunctionDecl func) {
  generationContext.enterFunction(func);
  scopeManager.pushScope('async_function');
  
  String params = func.parameters
    .map(p => p.name)
    .join(', ');
  
  String result = 'async function ${func.name}($params) {\n';
  indent();
  
  // Convert body statements
  if (func.body is BlockStmt) {
    for (final stmt in (func.body as BlockStmt).statements) {
      writeln(convertStatement(stmt));
    }
  }
  
  dedent();
  result += '}\n';
  
  scopeManager.popScope();
  generationContext.exitFunction();
  
  return result;
}
```

---

## Day 48-50: Error Handling in Async

```dart
String convertAsyncTryCatch(TryStmt stmt) {
  String result = 'try {\n';
  indent();
  
  for (final s in stmt.tryBlock.statements) {
    String code = convertStatement(s);
    writeln(code);
  }
  
  dedent();
  result += '} catch (error) {\n';
  indent();
  
  // Handle multiple catch types
  if (stmt.catchClauses.length > 1) {
    for (int i = 0; i < stmt.catchClauses.length; i++) {
      if (i > 0) result += 'else ';
      
      if (stmt.catchClauses[i].exceptionType != null) {
        String exceptionType = stmt.catchClauses[i].exceptionType!.displayName();
        result += 'if (error instanceof $exceptionType) {\n';
        indent();
      }
      
      for (final s in stmt.catchClauses[i].body.statements) {
        result += '${getIndent()}${convertStatement(s)}\n';
      }
      
      if (stmt.catchClauses[i].exceptionType != null) {
        dedent();
        result += '}';
      }
    }
  } else {
    for (final s in stmt.catchClauses[0].body.statements) {
      result += '${getIndent()}${convertStatement(s)}\n';
    }
  }
  
  dedent();
  result += '}\n';
  
  if (stmt.finallyBlock != null) {
    result += 'finally {\n';
    indent();
    for (final s in stmt.finallyBlock!.statements) {
      result += '${getIndent()}${convertStatement(s)}\n';
    }
    dedent();
    result += '}\n';
  }
  
  return result;
}
```

---

## Day 50-52: Cascades & Complex Operations

```dart
String convertCascadeExpression(CascadeExpressionIR expr) {
  String target = convertExpression(expr.target);
  
  String result = target;
  for (final section in expr.cascadeSections) {
    if (section is MethodCallExpressionIR) {
      result += '.${section.methodName}(...)';
    } else if (section is PropertyAccessExpressionIR) {
      result += '.${section.propertyName}';
    }
  }
  
  return result;
}
```

---

# PHASE 8: INTEGRATION & TESTING (Week 8 = 7 days)

## Day 53-56: Full Conversion Flow

```dart
String generate(List<int> binaryData) {
  try {
    // 1. Initialize
    _initialize();
    
    // 2. Read IR
    dartFile = binaryReader.readFileIR(Uint8List.fromList(binaryData));
    
    // 3. Generate
    generateImports();
    generateTopLevelVariables();
    generateFunctions();
    generateClasses();
    generateExports();
    
    // 4. Format
    String code = output.toString();
    if (config.formatCode) {
      code = formatter.formatComplete(code, config);
    }
    
    // 5. Validate
    if (errorCollector.hasFatalErrors()) {
      throw GenerationException('Generation failed with fatal errors');
    }
    
    return code;
  } catch (e, stack) {
    errorCollector.addError(GenerationError(
      message: 'Fatal generation error: $e',
      severity: ErrorSeverity.FATAL,
      location: stack.toString(),
    ));
    rethrow;
  }
}
```

---

## Day 56-59: Unit Tests

```dart
class IRToJSGeneratorTests {
  void testLiteralConversion() { }
  void testIdentifierResolution() { }
  void testBinaryOperators() { }
  void testListExpression() { }
  void testMapExpression() { }
  void testMethodCall() { }
  void testWidgetCreation() { }
  void testIfStatement() { }
  void testForLoop() { }
  void testForEachLoop() { }
  void testTryCatch() { }
  void testAsyncFunction() { }
  void testClassGeneration() { }
  void testStatefulWidget() { }
  void testBuildMethod() { }
}
```

---

# PHASE 9: OPTIMIZATION & EDGE CASES (Week 9 = 7 days)

## Day 60-62: Edge Case Handling

```
1. Empty classes
2. Empty methods
3. Empty functions
4. Circular references
5. Deep nesting
6. Large collections
7. Very long lines
8. Complex type hierarchies
9. Undefined references
10. Type mismatches
```

---

## Day 62-66: Final Polish

```dart
// Output file generation
void generateOutputFile(String code, String outputPath) {
  // Write JS file
  // Generate source map if enabled
  // Generate report
}

// Generate report
void generateReport() {
  print('Generation Report:');
  print('  Classes: ${dartFile.classDeclarations.length}');
  print('  Functions: ${dartFile.functionDeclarations.length}');
  print('  Variables: ${dartFile.variableDeclarations.length}');
  print('  Errors: ${errorCollector.errors.length}');
  print('  Warnings: ${errorCollector.errors.where((e) => e.severity == ErrorSeverity.WARNING).length}');
}
```

---

# PHASE 10: FINAL POLISH (Week 10 = 3 days)

## Day 67: Documentation

- Code comments
- API documentation
- Usage examples
- Error reference

---

## Day 68: Performance Tuning

- Memory optimization
- Caching strategies
- Generation speed

---

## Day 69: Deployment

- Package for publication
- Create CLI tool
- Setup CI/CD
- Documentation site

---

# TIMELINE SUMMARY TABLE

| Phase | Week | Duration | Key Deliverables | Status |
|-------|------|----------|------------------|--------|
| 1 | 1 | 7 days | Architecture, Utils, Config, Formatter | ✅ |
| 2 | 2 | 7 days | Error Handling, Scope Manager, Type System | ✅ |
| 3 | 3 | 7 days | All Expressions | ✅ |
| 4 | 4 | 7 days | All Statements | ✅ |
| 5 | 5 | 7 days | Classes, Methods, Functions | ✅ |
| 6 | 6 | 7 days | Widgets, Build Method | ✅ |
| 7 | 7 | 7 days | Async/Await, Complex Flow | ✅ |
| 8 | 8 | 7 days | Integration, Testing | ✅ |
| 9 | 9 | 7 days | Optimization, Edge Cases | ✅ |
| 10 | 10 | 3 days | Polish, Deployment | ✅ |

**Total: 66 development days = 10 weeks (part-time friendly)**

---

# CRITICAL DECISION POINTS

## Decision 1: Expression vs Statement Body Storage
**How:** Statements contain expressions. Blocks contain statements.
**Implementation:** Recursive convertStatement() and convertExpression()

## Decision 2: Scope Tracking
**How:** Maintain scope stack during traversal
**Implementation:** Push/pop on entering/exiting blocks

## Decision 3: Error Recovery
**How:** Don't stop on errors, collect and report
**Implementation:** ErrorCollector logs non-fatal errors

## Decision 4: Widget Detection
**How:** Check methodName against widgetRegistry
**Implementation:** isWidget() function

## Decision 5: Type Comments
**How:** Optional comments for type annotations
**Implementation:** config.includeTypeComments flag

---

# SUCCESS CRITERIA (90%+)

- ✅ All literal expressions convert correctly
- ✅ All statements convert correctly
- ✅ Classes generate proper JS syntax
- ✅ Methods have proper this. prefix
- ✅ Widgets create correct JS objects
- ✅ Scope resolution works
- ✅ Error handling catches issues
- ✅ Output is properly formatted
- ✅ Type comments generated
- ✅ Build methods return widgets
- ✅ setState() works correctly
- ✅ Async/Await converts properly
- ✅ Try-Catch generates JS try-catch
- ✅ No major regressions
- ✅ Performance acceptable (<1s for 1000 LOC)

