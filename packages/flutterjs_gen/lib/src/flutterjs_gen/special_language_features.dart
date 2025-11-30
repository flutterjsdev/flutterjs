// ============================================================================
// PHASE 2.5: SPECIAL LANGUAGE FEATURES CODE GENERATOR
// ============================================================================
// Handles advanced Dart features and their JavaScript equivalents:
// - Async/Await patterns
// - Generators (sync* and async*)
// - Null safety operators (?, ??, ?.)
// - Pattern matching → if/else chains
// - Cascade expressions
// - Collection if/for
// ============================================================================

import 'package:collection/collection.dart';

import 'package:flutterjs_core/src/ir/expressions/cascade_expression_ir.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/src/utils/code_gen_error.dart';
import 'expression_code_generator.dart';
import 'statement_code_generator.dart';
import '../utils/indenter.dart';

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for special features code generation
class SpecialFeaturesConfig {
  /// Whether to generate Promise chains instead of async/await
  final bool usePromiseChains;

  /// Whether to generate Symbol.iterator for generators
  final bool useSymbolIterator;

  /// Whether to preserve Dart null semantics
  final bool strictNullChecks;

  /// Indentation string
  final String indent;

  const SpecialFeaturesConfig({
    this.usePromiseChains = false,
    this.useSymbolIterator = false,
    this.strictNullChecks = true,
    this.indent = '  ',
  });
}

// ============================================================================
// MAIN SPECIAL FEATURES GENERATOR
// ============================================================================

class SpecialFeaturesCodeGen {
  final SpecialFeaturesConfig config;
  final ExpressionCodeGen exprGen;
  final StatementCodeGen stmtGen;
  late Indenter indenter;
  final List<CodeGenError> errors = [];

  SpecialFeaturesCodeGen({
    SpecialFeaturesConfig? config,
    ExpressionCodeGen? exprGen,
    StatementCodeGen? stmtGen,
  }) : config = config ?? const SpecialFeaturesConfig(),
       exprGen = exprGen ?? ExpressionCodeGen(),
       stmtGen = stmtGen ?? StatementCodeGen() {
    indenter = Indenter(this.config.indent);
  }

  // =========================================================================
  // 2.5.1 ASYNC/AWAIT HANDLING
  // =========================================================================

  /// Handle async function body - already native in JS!
  String handleAsyncFunction(FunctionDecl func) {
    if (!func.isAsync) {
      throw CodeGenError(
        message: 'Function is not async',
        suggestion: 'Check isAsync flag',
      );
    }

    // Dart async/await maps directly to JavaScript async/await
    // No transformation needed!
    return _generateAsyncFunction(func);
  }

  String _generateAsyncFunction(FunctionDecl func) {
    final buffer = StringBuffer();

    // async keyword (already handled by FunctionCodeGen)
    buffer.writeln('async function ${func.name}() {');
    indenter.indent();

    if (func.body != null) {
      if (func.body is BlockStmt) {
        for (final stmt in (func.body as BlockStmt).statements) {
          buffer.writeln(stmtGen.generate(stmt));
        }
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  /// Convert async function to Promise chain (for older JS)
  String convertAsyncToPromiseChain(FunctionDecl func) {
    if (!func.isAsync) {
      throw CodeGenError(message: 'Function is not async');
    }

    final buffer = StringBuffer();

    buffer.writeln('function ${func.name}() {');
    indenter.indent();
    buffer.writeln(indenter.line('return new Promise((resolve, reject) => {'));
    indenter.indent();

    if (func.body is BlockStmt) {
      final blockStmt = func.body as BlockStmt;
      for (final stmt in blockStmt.statements) {
        // TODO: Transform await expressions into .then() chains
        buffer.writeln(stmtGen.generate(stmt));
      }
    }

    indenter.dedent();
    buffer.writeln(indenter.line('});'));
    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  /// Handle await expression - convert to Promise.then() if needed
  String handleAwaitExpression(AwaitExpr expr) {
    final futureExpr = expr.futureExpression;

    if (config.usePromiseChains) {
      return _convertAwaitToThen(futureExpr);
    } else {
      // Native await support
      final future = exprGen.generate(futureExpr, parenthesize: true);
      return 'await $future';
    }
  }

  String _convertAwaitToThen(ExpressionIR futureExpr) {
    final future = exprGen.generate(futureExpr, parenthesize: true);

    // This would need context of the surrounding code
    // For now, return placeholder
    return '$future.then(result => { /* handle result */ })';
  }

  // =========================================================================
  // 2.5.2 GENERATOR HANDLING
  // =========================================================================

  /// Handle sync* generator
  String handleSyncGenerator(FunctionDecl func) {
    if (!func.isGenerator || func.isAsync) {
      throw CodeGenError(
        message: 'Function is not a sync generator',
        suggestion: 'Check isGenerator flag',
      );
    }

    return _generateSyncGenerator(func);
  }

  String _generateSyncGenerator(FunctionDecl func) {
    final buffer = StringBuffer();

    // function* syntax (already handled by FunctionCodeGen)
    buffer.writeln('function* ${func.name}() {');
    indenter.indent();

    if (func.body is BlockStmt) {
      for (final stmt in (func.body as BlockStmt).statements) {
        buffer.writeln(stmtGen.generate(stmt));
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  /// Handle async* generator (Stream)
  String handleAsyncGenerator(FunctionDecl func) {
    if (!func.isGenerator || !func.isAsync) {
      throw CodeGenError(
        message: 'Function is not an async generator',
        suggestion: 'Check isGenerator and isAsync flags',
      );
    }

    return _generateAsyncGenerator(func);
  }

  String _generateAsyncGenerator(FunctionDecl func) {
    final buffer = StringBuffer();

    // async function* syntax
    buffer.writeln('async function* ${func.name}() {');
    indenter.indent();

    if (func.body is BlockStmt) {
      for (final stmt in (func.body as BlockStmt).statements) {
        buffer.writeln(stmtGen.generate(stmt));
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  /// Convert generator to iterator protocol (for older JS)
  String convertGeneratorToIteratorProtocol(FunctionDecl func) {
    final buffer = StringBuffer();

    final funcName = func.name;
    final iteratorName = '${funcName}Iterator';

    // Create iterator class
    buffer.writeln('class $iteratorName {');
    indenter.indent();

    buffer.writeln(indenter.line('constructor() {'));
    indenter.indent();
    buffer.writeln(indenter.line('this.index = 0;'));
    buffer.writeln(indenter.line('this.done = false;'));
    indenter.dedent();
    buffer.writeln(indenter.line('}'));

    buffer.writeln();
    buffer.writeln(indenter.line('[Symbol.iterator]() {'));
    indenter.indent();
    buffer.writeln(indenter.line('return this;'));
    indenter.dedent();
    buffer.writeln(indenter.line('}'));

    buffer.writeln();
    buffer.writeln(indenter.line('next() {'));
    indenter.indent();
    buffer.writeln(indenter.line('// TODO: Implement iteration logic'));
    buffer.writeln(
      indenter.line('return { value: undefined, done: this.done };'),
    );
    indenter.dedent();
    buffer.writeln(indenter.line('}'));

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  // =========================================================================
  // 2.5.3 NULL SAFETY OPERATORS
  // =========================================================================

  /// Handle nullable type (String?)
  String handleNullableType(TypeIR type) {
    // In JavaScript, all types can be null anyway
    // Just strip the ? marker
    return type.displayName().replaceAll('?', '');
  }

  /// Handle null-aware property access (?.prop)
  String handleNullAwarePropertyAccess(String target, String property) {
    // JavaScript has native optional chaining
    return '$target?.$property';
  }

  /// Handle null-aware method call (?.method())
  String handleNullAwareMethodCall(String target, String method, String args) {
    // JavaScript has native optional chaining
    return '$target?.$method($args)';
  }

  /// Handle null-aware index access (?.[index])
  String handleNullAwareIndexAccess(String target, String index) {
    // JavaScript has native optional chaining
    return '$target?.[$index]';
  }

  /// Handle null coalescing operator (??)
  String handleNullCoalescing(String left, String right) {
    // JavaScript has native nullish coalescing
    return '$left ?? $right';
  }

  // =========================================================================
  // 2.5.4 PATTERN MATCHING → IF/ELSE CHAINS
  // =========================================================================

  /// Convert switch statement with pattern matching to if/else chain
  String convertPatternMatchingSwitch(SwitchStmt stmt) {
    final buffer = StringBuffer();
    final expr = exprGen.generate(stmt.expression, parenthesize: true);

    bool isFirstCase = true;

    // Generate cases as if/else chain
    for (final caseStmt in stmt.cases) {
      _generatePatternCase(buffer, expr, caseStmt, isFirstCase);
      isFirstCase = false;
    }

    // Default case
    if (stmt.defaultCase != null) {
      buffer.writeln(indenter.line('else {'));
      indenter.indent();

      for (final stmt in stmt.defaultCase!.statements) {
        buffer.writeln(stmtGen.generate(stmt));
      }

      indenter.dedent();
      buffer.write(indenter.line('}'));
    }

    return buffer.toString().trim();
  }

  void _generatePatternCase(
    StringBuffer buffer,
    String switchExpr,
    SwitchCaseStmt caseStmt,
    bool isFirst,
  ) {
    if (caseStmt.patterns == null || caseStmt.patterns!.isEmpty) {
      return; // Skip empty patterns
    }

    final ifKeyword = isFirst ? 'if' : 'else if';

    // Generate pattern check for each pattern
    for (int i = 0; i < caseStmt.patterns!.length; i++) {
      final pattern = caseStmt.patterns![i];
      final check = _generatePatternCheck(switchExpr, pattern);

      if (i == 0) {
        buffer.writeln(indenter.line('$ifKeyword ($check) {'));
      } else {
        buffer.writeln(indenter.line('} else if ($check) {'));
      }

      indenter.indent();

      // Bind pattern variable if needed
      _generatePatternBinding(buffer, pattern, switchExpr);

      // Case statements
      for (final stmt in caseStmt.statements) {
        buffer.writeln(stmtGen.generate(stmt));
      }

      indenter.dedent();

      if (i == caseStmt.patterns!.length - 1) {
        buffer.write(indenter.line('}'));
      }
    }
  }

  String _generatePatternCheck(String expr, ExpressionIR pattern) {
    // Pattern is usually a type name or constant
    if (pattern is IdentifierExpressionIR) {
      final typeName = pattern.name;
      return '$expr instanceof $typeName';
    }

    if (pattern is LiteralExpressionIR) {
      final literal = exprGen.generate(pattern, parenthesize: false);
      return '$expr === $literal';
    }

    // Fallback
    return '$expr === ${exprGen.generate(pattern, parenthesize: false)}';
  }

  void _generatePatternBinding(
    StringBuffer buffer,
    ExpressionIR pattern,
    String expr,
  ) {
    // Extract variable name from pattern if available
    // For now, use generic binding
    if (pattern is IdentifierExpressionIR) {
      final varName = pattern.name.toLowerCase()[0] + pattern.name.substring(1);
      buffer.writeln(indenter.line('const $varName = $expr;'));
    }
  }

  // =========================================================================
  // 2.5.5 CASCADE EXPRESSIONS
  // =========================================================================

  String handleCascadeExpression(CascadeExpressionIR expr) {
    final buffer = StringBuffer();
    final target = exprGen.generate(expr.target, parenthesize: false);

    buffer.writeln('(() => {');
    indenter.indent();
    buffer.writeln(indenter.line('const \$\$cascade = $target;'));

    // Apply each cascade section
    for (final section in expr.cascadeSections) {
      if (section is MethodCallExpressionIR) {
        final args = _generateArgumentList(
          section.arguments,
          section.namedArguments,
        );
        buffer.writeln(
          indenter.line('\$\$cascade.${section.methodName}($args);'),
        );
      } else if (section is PropertyAccessExpressionIR) {
        buffer.writeln(indenter.line('\$\$cascade.${section.propertyName};'));
      } else if (section is AssignmentExpressionIR) {
        final value = exprGen.generate(section.value, parenthesize: false);
        buffer.writeln(indenter.line('\$\$cascade = $value;'));
      }
    }

    buffer.writeln(indenter.line('return \$\$cascade;'));
    indenter.dedent();
    buffer.write(indenter.line('})()'));

    return buffer.toString().trim();
  }

  // =========================================================================
  // 2.5.6 COLLECTION LITERALS WITH IF/FOR
  // =========================================================================

  /// Handle collection if (list as example)
  String handleCollectionIf(ListExpressionIR expr) {
    // [if (condition) element1, element2, ...]
    final buffer = StringBuffer();

    buffer.write('[');

    for (int i = 0; i < expr.elements.length; i++) {
      final elem = expr.elements[i];

      // TODO: Check if element is a ConditionalExpression
      if (elem is ConditionalExpressionIR) {
        final cond = exprGen.generate(elem.condition, parenthesize: false);
        final trueBranch = exprGen.generate(
          elem.thenExpression,
          parenthesize: false,
        );

        buffer.write('...($cond ? [$trueBranch] : [])');
      } else {
        buffer.write(exprGen.generate(elem, parenthesize: false));
      }

      if (i < expr.elements.length - 1) {
        buffer.write(', ');
      }
    }

    buffer.write(']');

    return buffer.toString();
  }

  /// Handle collection for (list comprehension)
  String handleCollectionFor(ListExpressionIR expr) {
    // [for (int i = 0; i < 10; i++) i * 2]
    // Convert to: Array.from({length: 10}, (_, i) => i * 2)

    // TODO: Parse the for loop structure from expr
    // For now, return placeholder

    return '/* TODO: Collection for */';
  }

  // =========================================================================
  // 2.5.7 DEFAULT VALUES & NAMED PARAMETERS
  // =========================================================================

  /// Handle default parameter value
  String handleDefaultParameter(ParameterDecl param) {
    if (param.defaultValue == null) {
      return param.name;
    }

    final defaultVal = exprGen.generate(
      param.defaultValue!,
      parenthesize: false,
    );
    return '${param.name} = $defaultVal';
  }

  /// Handle named parameters as object destructuring
  String handleNamedParameters(List<ParameterDecl> namedParams) {
    if (namedParams.isEmpty) {
      return '';
    }

    final parts = namedParams
        .map((p) {
          final defaultVal = p.defaultValue != null
              ? exprGen.generate(p.defaultValue!, parenthesize: false)
              : 'undefined';
          return '${p.name} = $defaultVal';
        })
        .join(', ');

    return '{ $parts } = {}';
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  String _generateArgumentList(
    List<ExpressionIR> positional,
    Map<String, ExpressionIR> named,
  ) {
    final parts = <String>[];

    parts.addAll(
      positional.map((e) => exprGen.generate(e, parenthesize: false)),
    );

    if (named.isNotEmpty) {
      final namedStr = named.entries
          .map(
            (e) =>
                '${e.key}: ${exprGen.generate(e.value, parenthesize: false)}',
          )
          .join(', ');
      parts.add('{$namedStr}');
    }

    return parts.join(', ');
  }

  String _formatCascadeChain(List<ExpressionIR> sections) {
    return sections
        .map((s) {
          if (s is MethodCallExpressionIR) {
            return '.${s.methodName}()';
          } else if (s is PropertyAccessExpressionIR) {
            return '.${s.propertyName}';
          }
          return '';
        })
        .join('');
  }
}

// ============================================================================
// HELPER: INDENTER
// ============================================================================

// ============================================================================
// EXAMPLE CONVERSIONS
// ============================================================================

/*
EXAMPLE 1: Async/Await (Direct)
────────────────────────────────
Dart:
  Future<String> load() async {
    final data = await fetch();
    return data;
  }

JavaScript:
  async function load() {
    const data = await fetch();
    return data;
  }


EXAMPLE 2: Generator
────────────────────
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


EXAMPLE 3: Async Generator
───────────────────────────
Dart:
  Stream<String> readLines() async* {
    for await (String line in input) {
      yield line;
    }
  }

JavaScript:
  async function* readLines() {
    for await (const line of input) {
      yield line;
    }
  }


EXAMPLE 4: Null-Aware Access
────────────────────────────
Dart:
  String? name = null;
  name?.toUpperCase();
  name ?? 'default';

JavaScript:
  let name = null;
  name?.toUpperCase();
  name ?? 'default';


EXAMPLE 5: Pattern Matching
───────────────────────────
Dart:
  switch (shape) {
    case Circle c:
      print(c.radius);
    case Square s:
      print(s.side);
  }

JavaScript:
  if (shape instanceof Circle) {
    const c = shape;
    console.log(c.radius);
  } else if (shape instanceof Square) {
    const s = shape;
    console.log(s.side);
  }


EXAMPLE 6: Cascade Expression
──────────────────────────────
Dart:
  button
    ..text = 'Click me'
    ..onClick.listen(handler)
    ..disabled = false;

JavaScript:
  (() => {
    const $$cascade = button;
    $$cascade.text = 'Click me';
    $$cascade.onClick.listen(handler);
    $$cascade.disabled = false;
    return $$cascade;
  })();


EXAMPLE 7: Collection If
────────────────────────
Dart:
  [1, 2, if (condition) 3, 4]

JavaScript:
  [1, 2, ...(condition ? [3] : []), 4]


EXAMPLE 8: Named Parameters
──────────────────────────
Dart:
  function configure({String host = 'localhost', int port = 8080}) { }

JavaScript:
  function configure({host = 'localhost', port = 8080} = {}) { }
*/
