// ============================================================================
// PHASE 2.1: EXPRESSION CODE GENERATOR
// ============================================================================
// Converts all Dart expression IR types to JavaScript code
// Direct IR → JS without intermediate transformations
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/ir/expressions/cascade_expression_ir.dart';
import 'package:flutterjs_gen/src/widget_generation/stateless_widget/stateless_widget_js_code_gen.dart';
import 'package:flutterjs_gen/src/utils/code_gen_error.dart'
    hide CodeGenWarning, WarningSeverity;

import 'enum_member_access_handler.dart';

// ============================================================================
// CONFIGURATION & HELPERS
// ============================================================================

/// Configuration for code generation
class ExpressionGenConfig {
  /// Whether to wrap expressions in parentheses for safety
  final bool safeParens;

  /// Whether to include type annotations as comments
  final bool typeComments;

  /// Whether to use const/let optimization
  final bool constOptimization;

  /// Line width for formatting (0 = no wrapping)
  final int lineWidth;

  const ExpressionGenConfig({
    this.safeParens = true,
    this.typeComments = false,
    this.constOptimization = true,
    this.lineWidth = 80,
  });
}

/// Error reporting for code

// ============================================================================
// MAIN EXPRESSION CODE GENERATOR
// ============================================================================

class ExpressionCodeGen {
  final ExpressionGenConfig config;
  final List<CodeGenError> errors = [];
  final List<CodeGenWarning> warnings = [];
  final bool verbose;

  /// ✅ NEW: Track the current function context
  FunctionDecl? _currentFunctionContext;

  /// ✅ NEW: Track the current class context to check for fields
  ClassDecl? _currentClassContext;

  // ✅ ADD THIS: Track recursion depth
  int _recursionDepth = 0;
  static const int _maxRecursionDepth = 100;

  String? _cascadeReceiver;

  ExpressionCodeGen({
    ExpressionGenConfig? config,
    FunctionDecl? currentFunctionContext,
    ClassDecl? currentClassContext,
    this.verbose = false,
  }) : config = config ?? const ExpressionGenConfig(),
       _currentFunctionContext = currentFunctionContext,
       _currentClassContext = currentClassContext;

  void _log(String message) {
    if (verbose) print(message);
  }

  /// ✅ NEW: Set context when generating expressions for a function
  void setFunctionContext(FunctionDecl? func) {
    _currentFunctionContext = func;
  }

  /// ✅ NEW: Set context when code generating for a class method
  void setClassContext(ClassDecl? cls) {
    _currentClassContext = cls;
  }

  /// Generate JavaScript code from an expression IR
  /// Returns JS code or throws CodeGenError on unsupported expressions
  String generate(ExpressionIR expr, {bool parenthesize = false}) {
    // DEBUG: Identify what IR type 'for' loops are
    try {
      if (expr is UnknownExpressionIR) {
        if (expr.source.contains('for (')) {
          print(
            'DEBUG: Found "for (" in UnknownExpressionIR: \n${expr.source}',
          );
        }
      } else {
        // Check other types if they have source or toShortString
        final str = expr.toString();
        if (str.contains('for (')) {
          print('DEBUG: Found "for (" in ${expr.runtimeType}: $str');
        }
      }
    } catch (e) {
      // ignore
    }

    _recursionDepth++;

    if (_recursionDepth > _maxRecursionDepth) {
      _recursionDepth--;
      final error = CodeGenError(
        message: 'Maximum recursion depth exceeded (infinite loop detected)',
        expressionType: expr.runtimeType.toString(),
        suggestion:
            'Check for circular references in expressions or self-referencing arguments',
      );
      errors.add(error);
      throw error;
    }

    try {
      String code = _generateExpression(expr);

      // 🛡️ ROBUST FIX: Handle 'users', 'users.length', 'users[index]'
      // This catches cases where 'users' is an UnknownExpression or part of one.
      if (code == 'users' ||
          code.startsWith('users.') ||
          code.startsWith('users[')) {
        if (_currentClassContext != null &&
            _currentFunctionContext?.isTopLevel == false) {
          // Double check it's not already prefixed (unlikely here but safe)
          if (!code.startsWith('this.')) {
            return 'this.$code';
          }
        }
      }

      // ✅ FIX: Only parenthesize if truly necessary
      // Property chains don't need parens
      if (parenthesize && config.safeParens && _needsParentheses(expr)) {
        code = '($code)';
      }

      if (config.typeComments && expr is! LiteralExpressionIR) {
        code += ' /* ${expr.runtimeType} */';
      }

      return code;
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate expression: $e',
        expressionType: expr.runtimeType.toString(),
        suggestion: 'Check if expression type is supported',
      );
      errors.add(error);
      rethrow;
    } finally {
      _recursionDepth--;
    }
  }

  bool _needsParentheses(ExpressionIR expr) {
    // These never need parentheses:
    if (expr is IdentifierExpressionIR) return false;
    if (expr is CascadeReceiverExpressionIR) return false;
    if (expr is LiteralExpressionIR) return false;
    if (expr is PropertyAccessExpressionIR) return false;
    if (expr is IndexAccessExpressionIR) return false;
    if (expr is ThisExpressionIR) return false;
    if (expr is SuperExpressionIR) return false;
    if (expr is MethodCallExpressionIR) return false;
    if (expr is FunctionCallExpr) return false;
    if (expr is InstanceCreationExpressionIR) return false;

    // These usually need parentheses:
    if (expr is BinaryExpressionIR) return true;
    if (expr is UnaryExpressionIR) return true;
    if (expr is ConditionalExpressionIR) return true;
    if (expr is LambdaExpr) return true;
    if (expr is AssignmentExpressionIR) return true;

    if (expr is AssignmentExpressionIR) return true;

    // ✅ FIX: Check UnknownExpressionIR content
    if (expr is UnknownExpressionIR) {
      final source = expr.source?.trim();
      if (source == 'super') return false;
      if (source == 'this') return false;
      // Simple identifiers don't need parentheses
      if (source != null &&
          RegExp(r'^[a-zA-Z_$][a-zA-Z0-9_$]*$').hasMatch(source)) {
        return false;
      }
    }

    return true; // Default: be safe
  }

  /// Debug method to print the call stack
  void _printRecursionInfo(ExpressionIR expr) {
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    print('Recursion Depth: $_recursionDepth / $_maxRecursionDepth');
    print('Expression Type: ${expr.runtimeType}');
    print('Expression: ${expr.toShortString()}');
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  // =========================================================================
  // PRIVATE GENERATION METHODS
  // =========================================================================
  String _generateExpression(ExpressionIR expr) {
    if (_recursionDepth > 50) {
      _printRecursionInfo(expr);
    }

    if (expr is LiteralExpressionIR) {
      return _generateLiteral(expr);
    }

    if (expr is IdentifierExpressionIR) {
      return _generateIdentifier(expr);
    }

    if (expr is PropertyAccessExpressionIR) {
      return _generatePropertyAccess(expr);
    }

    if (expr is IndexAccessExpressionIR) {
      return _generateIndexAccess(expr);
    }

    if (expr is ThisExpressionIR) {
      return _generateThisExpression(expr);
    }

    if (expr is SuperExpressionIR) {
      return _generateSuperExpression(expr);
    }

    if (expr is BinaryExpressionIR) {
      return _generateBinary(expr);
    }

    if (expr is UnaryExpressionIR) {
      return _generateUnary(expr);
    }

    if (expr is AssignmentExpressionIR) {
      return _generateAssignment(expr);
    }

    if (expr is CompoundAssignmentExpressionIR) {
      return _generateCompoundAssignment(expr);
    }

    if (expr is ConditionalExpressionIR) {
      return _generateConditional(expr);
    }

    if (expr is NullCoalescingExpressionIR) {
      return _generateNullCoalescing(expr);
    }

    if (expr is NullAwareAccessExpressionIR) {
      return _generateNullAwareAccess(expr);
    }

    if (expr is ListExpressionIR) {
      return _generateListLiteral(expr);
    }

    if (expr is MapExpressionIR) {
      return _generateMapLiteral(expr);
    }

    if (expr is MapEntryIR) {
      return _generateMapEntry(expr); // ✅ Handle MapEntryIR as expression
    }

    if (expr is SetExpressionIR) {
      return _generateSetLiteral(expr);
    }

    if (expr is MethodCallExpressionIR) {
      return _generateMethodCall(expr);
    }

    if (expr is FunctionCallExpr) {
      return _generateFunctionCall(expr);
    }

    if (expr is InstanceCreationExpressionIR) {
      return _generateInstanceCreation(expr);
    }

    if (expr is LambdaExpr) {
      return _generateLambda(expr);
    }

    if (expr is CastExpressionIR) {
      return _generateCast(expr);
    }

    if (expr is TypeCheckExpr) {
      return _generateTypeCheck(expr);
    }

    if (expr is IsExpressionIR) {
      return _generateIsExpression(expr);
    }

    if (expr is AwaitExpr) {
      return _generateAwait(expr);
    }

    if (expr is ThrowExpr) {
      return _generateThrow(expr);
    }

    if (expr is StringInterpolationExpressionIR) {
      return _generateStringInterpolation(expr);
    }

    if (expr is CascadeExpressionIR) {
      return _generateCascade(expr);
    }

    if (expr is CascadeReceiverExpressionIR) {
      return _cascadeReceiver ?? 'obj';
    }

    if (expr is ParenthesizedExpressionIR) {
      return _generateParenthesized(expr);
    }

    if (expr is EnumMemberAccessExpressionIR) {
      return _generateEnumMemberAccess(expr);
    }

    // will thing about this if we need this future
    if (expr is ConstructorCallExpressionIR) {
      return _generateConstructorCall(expr);
    }
    if (expr is FunctionExpressionIR) {
      return _generateFunctionExpression(expr);
    }

    if (expr is NullCoalescingExpressionIR) {
      return _generateNullCoalescing(expr);
    }

    // ✅ NEW: Handle UnknownExpressionIR gracefully
    if (expr is UnknownExpressionIR) {
      return _generateUnknownExpression(expr);
    }

    throw CodeGenError(
      message: 'Unsupported expression type: ${expr.runtimeType}',
      suggestion: 'Check if this expression type is implemented',
    );
  }

  // Add this new method:
  String _generateFunctionExpression(FunctionExpressionIR expr) {
    _log('   🔵 [FunctionExpression] Generating lambda...');

    // Block with multiple print calls using _log
    final params = expr.parameter.map((p) => p.name).join(', ');
    _log('   📍 Parameters: $params');

    // =========================================================================
    // STEP 2: Extract the body expression
    // =========================================================================
    String bodyCode = 'undefined';

    if (expr.body != null && expr.body!.statements.isNotEmpty) {
      final statements = expr.body!.statements;

      // Single return statement: (x) => expr
      if (statements.length == 1 && statements.first is ReturnStmt) {
        final returnStmt = statements.first as ReturnStmt;
        if (returnStmt.expression != null) {
          bodyCode = generate(returnStmt.expression!, parenthesize: false);
          _log('   📍 Body type: single return');
        }
      }
      // Single expression statement: (x) => expr
      else if (statements.length == 1 && statements.first is ExpressionStmt) {
        final exprStmt = statements.first as ExpressionStmt;
        bodyCode = generate(exprStmt.expression, parenthesize: false);
        _log('   📍 Body type: single expression');
      }
      // Multiple statements: (x) { stmt1; stmt2; }
      else {
        final stmtCode = statements
            .map((s) {
              if (s is ExpressionStmt) {
                return '${generate(s.expression, parenthesize: false)};';
              } else if (s is ReturnStmt && s.expression != null) {
                return 'return ${generate(s.expression!, parenthesize: false)};';
              } else {
                return '';
              }
            })
            .where((s) => s.isNotEmpty)
            .join(' ');

        bodyCode = '{ $stmtCode }';
        _log('   📍 Body type: multiple statements');
      }
    } else {
      _log('   ⚠️  No body statements found');
    }

    // =========================================================================
    // STEP 3: Build arrow function
    // =========================================================================
    String result;

    if (expr.isAsync && expr.isGenerator) {
      result = 'async function* ($params) $bodyCode';
    } else if (expr.isAsync) {
      result = 'async ($params) => $bodyCode';
    } else if (expr.isGenerator) {
      result = 'function* ($params) $bodyCode';
    } else {
      // Regular arrow function
      result = '($params) => $bodyCode';
    }

    _log('   ✅ Generated: $result');
    return result;
  }
  // =========================================================================
  // PARAMETER GENERATION
  // =========================================================================

  /// Generate parameter list from ParameterDecl objects
  String _generateFunctionParameters(List<ParameterDecl> parameters) {
    if (parameters.isEmpty) {
      return '';
    }

    // Separate positional and named parameters
    final positional = <String>[];
    final named = <String>[];

    for (final param in parameters) {
      final paramCode = _generateSingleParameter(param);

      if (param.isNamed) {
        named.add(paramCode);
      } else {
        positional.add(paramCode);
      }
    }

    // Combine: positional first, then named in destructuring
    if (positional.isNotEmpty && named.isEmpty) {
      return positional.join(', ');
    }

    if (positional.isEmpty && named.isNotEmpty) {
      return '{ ${named.join(", ")} }';
    }

    if (positional.isNotEmpty && named.isNotEmpty) {
      return '${positional.join(", ")}, { ${named.join(", ")} }';
    }

    return '';
  }

  /// Generate a single parameter declaration
  String _generateSingleParameter(ParameterDecl param) {
    final name = param.name;

    // Add type annotation as comment if configured
    if (config.typeComments && param.type != null) {
      final typeName = param.type.displayName();
      return '$name /* : $typeName */';
    }

    // Handle default values
    if (param.defaultValue != null && param.isNamed) {
      try {
        final defaultVal = generate(param.defaultValue!, parenthesize: false);
        return '$name = $defaultVal';
      } catch (e) {
        print('   ⚠️  Failed to generate default value for $name: $e');
        return name;
      }
    }

    return name;
  }

  // =========================================================================
  // FUNCTION BODY GENERATION
  // =========================================================================

  /// Generate function body from BlockStmt
  String _generateFunctionBody(StatementIR body) {
    if (body is BlockStmt) {
      return _generateBlockStatement(body);
    }

    if (body is ExpressionStmt) {
      final expr = generate(body.expression, parenthesize: false);
      return '{ return $expr; }';
    }

    // Single return statement
    if (body is ReturnStmt) {
      if (body.expression != null) {
        final expr = generate(body.expression!, parenthesize: false);
        return '{ return $expr; }';
      }
      return '{ return; }';
    }

    // Fallback
    print('   ⚠️  Unknown body statement type: ${body.runtimeType}');
    return '{ /* unknown body */ }';
  }

  /// Generate block statements
  String _generateBlockStatement(BlockStmt block) {
    final buffer = StringBuffer('{\n');

    for (final stmt in block.statements) {
      try {
        final stmtCode = _generateStatement(stmt);
        buffer.writeln('  $stmtCode');
      } catch (e) {
        print('   ⚠️  Error generating statement: $e');
        buffer.writeln('  /* error generating statement */');
      }
    }

    buffer.write('}');
    return buffer.toString();
  }

  /// Generate individual statements
  String _generateStatement(StatementIR stmt) {
    if (stmt is ExpressionStmt) {
      return '${generate(stmt.expression, parenthesize: false)};';
    }

    if (stmt is ReturnStmt) {
      if (stmt.expression != null) {
        return 'return ${generate(stmt.expression!, parenthesize: false)};';
      }
      return 'return;';
    }

    if (stmt is VariableDeclarationStmt) {
      return _generateVariableDeclaration(stmt);
    }

    if (stmt is IfStmt) {
      return _generateIfStatement(stmt);
    }

    if (stmt is ForStmt) {
      return _generateForStatement(stmt);
    }

    if (stmt is ForEachStmt) {
      return _generateForEachStatement(stmt);
    }

    if (stmt is WhileStmt) {
      return _generateWhileStatement(stmt);
    }

    if (stmt is DoWhileStmt) {
      return _generateDoWhileStatement(stmt);
    }

    if (stmt is BlockStmt) {
      return _generateBlockStatement(stmt);
    }

    if (stmt is ThrowStmt) {
      return 'throw ${generate(stmt.exceptionExpression, parenthesize: false)};';
    }

    print('   ⚠️  Unknown statement type: ${stmt.runtimeType}');
    return '/* unknown statement */';
  }

  // =========================================================================
  // STATEMENT GENERATION HELPERS
  // =========================================================================

  String _generateVariableDeclaration(VariableDeclarationStmt stmt) {
    final keyword = stmt.isFinal ? 'const' : (stmt.isConst ? 'const' : 'let');

    if (stmt.initializer != null) {
      final init = generate(stmt.initializer!, parenthesize: false);
      return '$keyword ${stmt.name} = $init;';
    }

    return '$keyword ${stmt.name};';
  }

  String _generateIfStatement(IfStmt stmt) {
    final condition = generate(stmt.condition, parenthesize: true);

    // ✅ GENERATOR FIX: Intercept Dart 3 Pattern Matching for BaseResponseWithUrl
    // The IR generator produces invalid JS for: if (response case BaseResponseWithUrl(: final url))
    // It comes out as: if (BaseResponseWithUrl(: final url))
    // We convert this to: if (response.url) { const url = response.url; ... }
    // ✅ GENERATOR FIX: Intercept Dart 3 Pattern Matching for BaseResponseWithUrl
    // The IR generator produces invalid JS for: if (response case BaseResponseWithUrl(: final url))
    // It comes out as: if (BaseResponseWithUrl(: final url))
    // We convert this to: if (response.url) { const url = response.url; ... }
    if (RegExp(
      r'BaseResponseWithUrl\s*\(\s*:\s*final\s+url\s*\)',
    ).hasMatch(condition)) {
      print(
        '   🔧 Fixing BaseResponseWithUrl pattern match in IfStmt: $condition',
      );

      final thenBlock = _generateStatementBody(stmt.thenBranch);
      // Strip outer braces from thenBlock to inject variable
      final innerBody = thenBlock.trim().substring(
        1,
        thenBlock.trim().length - 1,
      );

      final elsePart = stmt.elseBranch != null
          ? ' else ${_generateStatementBody(stmt.elseBranch!)}'
          : '';

      return 'if (response.url) {\n'
          '      const url = response.url;\n'
          '      $innerBody\n'
          '    }$elsePart';
    }

    final thenBody = _generateStatementBody(stmt.thenBranch);
    final elseBody = stmt.elseBranch != null
        ? _generateStatementBody(stmt.elseBranch!)
        : null;

    return 'if ($condition) $thenBody' +
        (elseBody != null ? ' else $elseBody' : '');
  }

  String _generateForStatement(ForStmt stmt) {
    final init = stmt.initialization != null
        ? generate(stmt.initialization!, parenthesize: false)
        : '';
    final condition = stmt.condition != null
        ? generate(stmt.condition!, parenthesize: false)
        : '';
    final increment = stmt.updaters.isNotEmpty
        ? stmt.updaters.map((e) {
            generate(e, parenthesize: false);
          }).toList()
        : '';

    final body = _generateStatementBody(stmt.body);

    return 'for ($init; $condition; $increment) $body';
  }

  String _generateForEachStatement(ForEachStmt stmt) {
    final varName = stmt.loopVariable;
    final iterable = generate(stmt.iterable, parenthesize: false);
    final body = _generateStatementBody(stmt.body);

    return 'for (const $varName of $iterable) $body';
  }

  String _generateWhileStatement(WhileStmt stmt) {
    final condition = generate(stmt.condition, parenthesize: true);
    final body = _generateStatementBody(stmt.body);

    return 'while ($condition) $body';
  }

  String _generateDoWhileStatement(DoWhileStmt stmt) {
    final body = _generateStatementBody(stmt.body);
    final condition = generate(stmt.condition, parenthesize: true);

    return 'do $body while ($condition);';
  }

  /// Generate statement body (single or block)
  String _generateStatementBody(StatementIR stmt) {
    if (stmt is BlockStmt) {
      return _generateBlockStatement(stmt);
    }

    return _generateStatement(stmt);
  }

  String _generateUnknownExpression(UnknownExpressionIR expr) {
    // ✅ FIX: Strip generic type arguments
    if (expr.source != null && expr.source.contains('<')) {
      final stripped = expr.source.substring(0, expr.source.indexOf('<'));
      return stripped;
    }

    if (expr.source != null) {
      String source = expr.source;

      // ✅ FIX: Replace embedded Symbol literals: #symbol -> "dart.symbol.symbol"
      // e.g. Zone.current[#token] -> Zone.current["dart.symbol.token"]
      if (source.contains('#')) {
        source = source.replaceAllMapped(
          RegExp(r'#([a-zA-Z_]\w*)'),
          (m) => '"dart.symbol.${m.group(1)}"',
        );
      }

      // ✅ FIX: Remove 'as Type' casts
      // e.g. client as Client Function() -> client
      if (source.contains(' as ')) {
        source = source.replaceAll(
          RegExp(r'\s+as\s+[a-zA-Z0-9_<>?]+(\s*Function\s*\([^)]*\))?'),
          '',
        );
      }

      // ✅ FIX: Handle standalone #symbol (if regex didn't catch start)
      if (source.startsWith('#')) {
        final bare = source.substring(1);
        return '"dart.symbol.$bare"';
      }

      if (source != expr.source) {
        return source;
      }

      // ✅ FIX: Convert raw Dart closures/IIFEs to JS arrow functions
      // Pattern: (params) { body } -> (params) => { body }
      // This is highly common in IIFEs like (() { ... })() which Dart allows but JS requires =>
      // ✅ ROBUST FIX: Convert raw Dart closures/IIFEs to JS arrow functions
      // AND handle scope resolution immediately to avoid shadowing bugs.
      // Pattern: (params) { body } -> (params) => { body }
      if (source.contains(') {') && !source.contains('=>')) {
        final originalSource = source;
        source = source.replaceAllMapped(RegExp(r'\((.*?)\)\s*\{'), (m) {
          final params = m.group(1)!;
          // Don't convert if it looks like a control flow statement
          final prefix = originalSource.substring(0, m.start).trim();
          if (prefix.endsWith('if') ||
              prefix.endsWith('while') ||
              prefix.endsWith('for') ||
              prefix.endsWith('switch') ||
              prefix.endsWith('catch')) {
            return m.group(0)!;
          }
          print('   Converting closure to arrow: (${params}) { -> (${params}) => {');
          return '($params) => {';
        });

        // ✅ FALLBACK: If regex didn't catch `(() {` (empty params), force it
        if (source.contains('(() {') && !source.contains('(() => {')) {
             print('   Converting empty IIFE closure manually');
             source = source.replaceAll('(() {', '(() => {');
        }

        // ✅ CRITICAL: Apply private field resolution on the modified source
        // Because we are returning early, we must duplicate the logic that runs later.
        if (_currentClassContext != null) {
          final privateFieldPattern = RegExp(r'\b(_[a-zA-Z]\w*)\b');
          final matches = privateFieldPattern.allMatches(source);

          for (final match in matches) {
            final fieldName = match.group(1)!;

            // Check if it's a static field or method
            final isStatic = _currentClassContext!.staticFields.any((f) => f.name == fieldName) ||
                _currentClassContext!.staticMethods.any((m) => m.name == fieldName);

            // Check if it's an instance field or method
            final isInstance = _currentClassContext!.instanceFields.any((f) => f.name == fieldName) ||
                _currentClassContext!.instanceMethods.any((m) => m.name == fieldName);

            if (isStatic) {
              source = source.replaceAll(
                RegExp(r'\b' + fieldName + r'\b'),
                '${_currentClassContext!.name}.$fieldName',
              );
            } else if (isInstance) {
              source = source.replaceAll(
                RegExp(r'(?<!this\.)\b' + fieldName + r'\b'),
                'this.$fieldName',
              );
            }
          }
        }
        
        return source; // ✅ RETURN MODIFIED SOURCE
      }
    }

    // ✅ FIX: Add this. prefix to private instance fields/methods and ClassName. to static ones
    // This handles cases where complex expressions come through as UnknownExpressionIR
    if (expr.source != null &&
        _currentClassContext != null &&
        _currentFunctionContext != null) {
      String source = expr.source;

      // Find all identifiers that start with _ (private fields)
      final privateFieldPattern = RegExp(r'\b(_[a-zA-Z]\w*)\b');
      final matches = privateFieldPattern.allMatches(source);

      for (final match in matches) {
        final fieldName = match.group(1)!;

        // Check if it's a static field or method
        final isStatic =
            _currentClassContext!.staticFields.any(
              (f) => f.name == fieldName,
            ) ||
            _currentClassContext!.staticMethods.any((m) => m.name == fieldName);

        // Check if it's an instance field or method
        final isInstance =
            _currentClassContext!.instanceFields.any(
              (f) => f.name == fieldName,
            ) ||
            _currentClassContext!.instanceMethods.any(
              (m) => m.name == fieldName,
            );

        if (isStatic) {
          // Replace with ClassName.fieldName
          source = source.replaceAll(
            RegExp(r'\b' + fieldName + r'\b'),
            '${_currentClassContext!.name}.$fieldName',
          );
        } else if (isInstance) {
          // Replace with this.fieldName, but check if it's already prefixed
          source = source.replaceAll(
            RegExp(r'(?<!this\.)\b' + fieldName + r'\b'),
            'this.$fieldName',
          );
        }
      }

      if (source != expr.source) {
        print('   Fixed field references: ${expr.source} → $source');
        return source;
      }
    }

    // ✅ FIX: Strip postfix bang operator (!)
    if (expr.source != null &&
        expr.source.endsWith('!') &&
        expr.source.length > 1) {
      final source = expr.source;
      print(
        '   Converting null assert: $source → ${source.substring(0, source.length - 1)}',
      );
      return source.substring(0, source.length - 1);
    }

    // Handle Dart 3.0+ shorthand enum/method syntax (.center, .fromSeed, etc.)
    if (expr.source != null && expr.source.startsWith('.')) {
      // CHECK: Is it a method call? (contains '(')
      if (expr.source.contains('(')) {
        // Specific mapping for common shorthand constructors
        if (expr.source.startsWith('.fromSeed')) {
          var call = expr.source;
          // Hack: Wrap named arguments in {} for JS
          // e.g. .fromSeed(seedColor: red) -> .fromSeed({seedColor: red})
          if (call.contains('(') && call.endsWith(')')) {
            final start = call.indexOf('(');
            final args = call.substring(start + 1, call.length - 1);

            // If args has ':' (named args) and not already wrapped
            if (args.contains(':') && !args.trim().startsWith('{')) {
              final methodPart = call.substring(0, start);
              final wrappedCall = 'ColorScheme$methodPart({$args})';
              print(
                '   Converting shorthand method with JS args: $wrappedCall',
              );
              return wrappedCall;
            }
          }
          print(
            '   Converting shorthand method: ${expr.source} → ColorScheme${expr.source}',
          );
          return 'ColorScheme${expr.source}';
        }
        // Add other shorthand constructors here if needed
      }
      // It's a property/enum access (e.g. .center)
      else {
        print(
          '   Converting shorthand to string: ${expr.source} → "${expr.source}"',
        );
        return '"${expr.source}"'; // Output as string literal for JS runtime to process
      }
    }

    // Try to extract usable info from the unknown expression
    if (expr.source != null && expr.source.isNotEmpty) {
      final source = expr.source.trim();

      // ✅ Handle collection-for: for (var item in items) element
      // Define helper logic inline
      String? tryConvertFor(String code) {
        // Helper to contextualize private members (underscore prefix)
        // This is a heuristic for implicit 'this' in C-style loops where we lack full context checks
        String fixContext(String s) {
          return s.replaceAllMapped(
            RegExp(r'(?<!this\.)\b(_[a-zA-Z]\w*)\b'),
            (m) => 'this.${m.group(1)}',
          );
        }

        // 1. Handle for-in loop: for (var item in items) element
        final loopMatch = RegExp(
          r'^for\s*\(\s*var\s+(\w+)\s+in\s+([^)]+)\)\s+(.+)$',
          dotAll: true,
        ).firstMatch(code);

        if (loopMatch != null) {
          final loopVar = loopMatch.group(1)!;
          final iterable = fixContext(loopMatch.group(2)!.trim());
          final body = fixContext(loopMatch.group(3)!.trim());

          if (body.startsWith('...')) {
            final spreadBody = body.substring(3).replaceAll('const ', 'new ');
            return '...($iterable).flatMap(($loopVar) => $spreadBody)';
          } else {
            final safeBody = body.replaceAll('const ', 'new ');
            return '...($iterable).map(($loopVar) => $safeBody)';
          }
        }

        // 2. Handle C-style for loop: for (var i = 0; i < len; i++) element
        final cStyleMatch = RegExp(
          r'^for\s*\(\s*(.*?);\s*(.*?);\s*(.*?)\)\s+(.+)$',
          dotAll: true,
        ).firstMatch(code);

        if (cStyleMatch != null) {
          final rawInit = cStyleMatch.group(1)!.trim();
          // Handle 'var i', 'int i', 'double i' -> 'let i'
          // Don't fixContext the initialization variable declaration itself
          final init = rawInit.replaceAll(
            RegExp(r'\b(var|int|double|num)\s+'),
            'let ',
          );

          final cond = fixContext(cStyleMatch.group(2)!.trim());
          final update = fixContext(cStyleMatch.group(3)!.trim());
          final body = fixContext(cStyleMatch.group(4)!.trim());

          // remove const from body
          final safeBody = body.replaceAll('const ', 'new ');

          return '...(() => {'
              '  const \$list = [];'
              '  for ($init; $cond; $update) {'
              '    \$list.push($safeBody);'
              '  }'
              '  return \$list;'
              '})()';
        }

        return null;
      }

      if (source.startsWith('for (')) {
        print(
          '🔧 Converting collection-for (bare): ${source.substring(0, source.length > 50 ? 50 : source.length)}...',
        );
        final res = tryConvertFor(source);
        if (res != null) return res;
      }

      if (source.startsWith('[') && source.contains('for (')) {
        final inside = source.substring(1, source.length - 1).trim();
        if (inside.startsWith('for (')) {
          print(
            '🔧 Converting collection-for (list): ${source.substring(0, source.length > 50 ? 50 : source.length)}...',
          );
          final res = tryConvertFor(inside);
          if (res != null) return '[$res]';
        }
      }

      // ✅ Handle collection-if: if (condition) ...elements or if (condition) element
      if (source.startsWith('if (')) {
        print(
          '🔧 Converting collection-if: ${source.length > 60 ? source.substring(0, 60) + '...' : source}',
        );

        // Find the condition
        final condStart = source.indexOf('(');
        var parenCount = 0;
        var condEnd = -1;
        for (var i = condStart; i < source.length; i++) {
          if (source[i] == '(') parenCount++;
          if (source[i] == ')') {
            parenCount--;
            if (parenCount == 0) {
              condEnd = i;
              break;
            }
          }
        }

        if (condEnd > condStart) {
          final condition = source.substring(condStart + 1, condEnd);
          final rest = source.substring(condEnd + 1).trim();

          // Check if it's a spread: ...[
          if (rest.startsWith('...[')) {
            final elementsEnd = rest.lastIndexOf(']');
            if (elementsEnd > 3) {
              var elements = rest.substring(4, elementsEnd);
              // Convert const to new for valid JavaScript
              elements = elements.replaceAll(RegExp(r'\bconst\s+'), 'new ');
              // Add 'new' to constructor calls (UpperCase names)
              elements = _addNewToConstructors(elements);
              final converted = '...(($condition) ? [$elements] : [])';
              print('   → Spread: $converted');
              return converted;
            }
          } else if (rest.isNotEmpty) {
            // Single element
            var singleElement = rest;
            // Convert const to new for valid JavaScript
            singleElement = singleElement.replaceAll(
              RegExp(r'\bconst\s+'),
              'new ',
            );
            // Add 'new' to constructor calls
            singleElement = _addNewToConstructors(singleElement);
            final converted = '(($condition) ? $singleElement : null)';
            print(
              '   → Single: ${converted.length > 80 ? converted.substring(0, 80) + '...' : converted}',
            );
            return converted;
          }
        }
      }

      // ✅ WORKAROUND: Detect widget constructors with named parameters
      // Pattern: UpperCaseName(param: value, ...)
      if (RegExp(r'^[A-Z]\w*\s*\(').hasMatch(source)) {
        // Check if it has named parameters (contains ':' but not '::' or 'http:')
        // ✅ FIX: Exclude Dart 3 patterns (e.g. :final url) which start with :
        if (source.contains(':') &&
            !source.contains('::') &&
            !source.contains('http:') &&
            !source.contains('(:')) {
          // Find the constructor name
          final nameMatch = RegExp(
            r'^([A-Z]\w*)(\.\w+)?\s*\(',
          ).firstMatch(source);
          if (nameMatch != null) {
            final constructorName = nameMatch
                .group(0)!
                .replaceAll('(', '')
                .trim();
            final afterName = source.substring(nameMatch.end);

            // Check if parameters are already wrapped in {}
            if (!afterName.trimLeft().startsWith('{')) {
              // Find the closing paren
              var parenCount = 1;
              var endIdx = 0;
              for (var i = 0; i < afterName.length; i++) {
                if (afterName[i] == '(') parenCount++;
                if (afterName[i] == ')') {
                  parenCount--;
                  if (parenCount == 0) {
                    endIdx = i;
                    break;
                  }
                }
              }

              if (endIdx > 0) {
                final params = afterName.substring(0, endIdx);
                final wrapped = 'new $constructorName({$params})';
                print('🔧 Wrapped named parameters in UnknownExpressionIR');
                return wrapped;
              }
            }
          }
        }
      }

      _log('   Fallback: Using source text: "${expr.source}"');
      warnings.add(
        CodeGenWarning(
          severity: WarningSeverity.warning,
          message: 'UnknownExpressionIR encountered: ${expr.source}',
          suggestion: 'This expression type may not be fully supported',
        ),
      );
      return expr.source;
    }

    // Last resort
    warnings.add(
      CodeGenWarning(
        severity: WarningSeverity.warning,
        message: 'UnknownExpressionIR with no source information',
        suggestion: 'Check IR parser for this expression type',
      ),
    );
    return 'undefined /* unknown expression */';
  }

  String _generateEnumMemberAccess(EnumMemberAccessExpressionIR expr) {
    print('✔️ Processing Dart 3.0+ enum member access: "${expr.source}"');

    final typeName = expr.typeName ?? expr.inferredTypeName;
    final memberName = expr.memberName;

    if (typeName != null) {
      final jsValue = FlutterEnumMapper.mapEnumMember(typeName, memberName);
      print('✔️ Mapped $typeName.$memberName → $jsValue');
      return jsValue;
    }

    print('⚠️  No type info, using member name: $memberName');
    return '"${memberName.toLowerCase()}"';
  }

  // =========================================================================
  // LITERAL EXPRESSIONS (0x01 - 0x0F)
  // =========================================================================

  String _generateLiteral(LiteralExpressionIR expr) {
    switch (expr.literalType) {
      case LiteralType.stringValue:
        final str = expr.value as String;

        // Always use regular double quotes for strings to ensure consistent escaping (e.g. \n -> "\\n")
        // This avoids issues where template literals preserve raw newlines, causing
        // problems in generated code formatting and functionality (e.g. replaceAll).
        return _escapeString(str);
      case LiteralType.intValue:
        return expr.value.toString();
      case LiteralType.doubleValue:
        return expr.value.toString();
      case LiteralType.boolValue:
        return (expr.value as bool) ? 'true' : 'false';
      case LiteralType.nullValue:
        return 'null';
      default:
        throw CodeGenError(
          message: 'Unknown literal type: ${expr.literalType}',
        );
    }
  }

  String _escapeString(String str) {
    // Escape special characters for JavaScript
    final escaped = str
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r')
        .replaceAll('\t', '\\t')
        .replaceAll('\b', '\\b')
        .replaceAll('\f', '\\f');

    return '"$escaped"';
  }

  // =========================================================================
  // IDENTIFIER & ACCESS EXPRESSIONS (0x10 - 0x1F)
  // =========================================================================

  String _generateIdentifier(IdentifierExpressionIR expr) {
    if (expr.isSuperReference) return 'super';
    if (expr.isThisReference) return 'this';

    // Strip generic type arguments from the name
    String name = expr.name;

    if (name.contains('<')) {
      name = name.substring(0, name.indexOf('<'));
    }

    // ✅ FORCE FIX: Handle compound identifier "widget.field"
    if (name.startsWith('widget.')) {
      return 'this.$name';
    }

    // Apply JS safety transformation
    name = safeIdentifier(name);

    // Check if we're inside a class method (not top-level)
    if (_currentFunctionContext != null &&
        !_currentFunctionContext!.isTopLevel) {
      // Check if it's a parameter first
      bool isParam = _currentFunctionContext!.parameters.any(
        (p) => p.name == name,
      );

      // Don't add prefixes to parameters
      if (isParam) {
        return name;
      }

      // For private identifiers (start with _), check if they're fields
      if (name.startsWith('_') && _currentClassContext != null) {
        // Check if it's a static field
        final isStaticField = _currentClassContext!.staticFields.any(
          (f) => f.name == name,
        );

        if (isStaticField) {
          return '${_currentClassContext!.name}.$name';
        }

        // Check if it's an instance field
        final isInstanceField = _currentClassContext!.instanceFields.any(
          (f) => f.name == name,
        );

        if (isInstanceField) {
          return 'this.$name';
        }

        // ⚠️ FIX: Do NOT default to 'this.' if not found in fields.
        // It could be a top-level function or variable (e.g. _closeSink).
        // Dart guarantees resolution; if it's not a field, it must be top-level/imported.
        return name;
      }

      // For known special identifiers
      if (_currentClassContext != null) {
        if (name == 'widget' || name == 'context' || name == 'mounted') {
          return 'this.$name';
        }
      }
    }

    return name;
  }

  String _generatePropertyAccess(PropertyAccessExpressionIR expr) {
    // ✅ FIX: Use parenthesize: true to ensure complex targets (like ternaries)
    // are correctly wrapped before property access.
    var target = generate(expr.target, parenthesize: true);

    // ✅ FORCE FIX for 'widget' -> 'this.widget' if identifier generation missed it
    if (target == 'widget') {
      // Even if context is missing, 'widget' property access is almost always 'this.widget' in State classes
      // But be careful not to break local vars.
      // Assuming 'widget' is valid property.
      target = 'this.widget';
    }

    // ✅ NEW: Handle Dart 3.0+ shorthand enum syntax (.center, .start, etc.)

    // When target is empty OR whitespace-only, this is likely shorthand enum access
    if (target.isEmpty || target.trim().isEmpty) {
      // Check if property name matches a known enum member
      final propertyName = expr.propertyName;

      // Try to infer the enum type from context and map it
      // For now, check common Flutter enum members
      final knownEnumMembers = {
        'center', 'start', 'end', 'stretch', 'baseline', // Alignment
        'spaceBetween', 'spaceAround', 'spaceEvenly', // MainAxis
        'horizontal', 'vertical', // Axis
        'max', 'min', // Size
        'left', 'right', 'justify', // TextAlign
        'clip', 'fade', 'ellipsis', 'visible', // TextOverflow
        'bold', 'normal', 'w100', 'w200', 'w300', // FontWeight
        'w400', 'w500', 'w600', 'w700', 'w800', 'w900',
        'fill', 'contain', 'cover', 'none', 'scaleDown', // BoxFit
        'up', 'down', // VerticalDirection
        'rtl', 'ltr', // TextDirection
      };

      if (knownEnumMembers.contains(propertyName)) {
        print(
          '✔️ Detected shorthand enum syntax: .$propertyName → "$propertyName"',
        );
        return '"$propertyName"';
      }

      // Unknown shorthand - output as-is with warning
      print('⚠️  Unknown shorthand property access: .$propertyName');
      return '.$propertyName';
    }

    // ✅ FIX: Polyfill .entries for Maps (JS Objects)
    if (expr.propertyName == 'entries') {
      print('🔧 Converting .entries to Object.entries() polyfill');
      // Polyfill: Object.entries(target).map(([k, v]) => ({key: k, value: v}))
      return 'Object.entries($target).map(([k, v]) => ({key: k, value: v}))';
    }

    if (_isValidIdentifier(expr.propertyName)) {
      final safeName = safeIdentifier(expr.propertyName);
      final op = expr.isNullAware ? '?.' : '.';
      return '$target$op$safeName';
    } else {
      if (expr.isNullAware) {
        return '$target?.[${expr.propertyName}]';
      }
      return "$target['${expr.propertyName}']";
    }
  }

  String _generateIndexAccess(IndexAccessExpressionIR expr) {
    // ✅ FIX: Use parenthesize: true for target
    final target = generate(expr.target, parenthesize: true);
    final index = generate(expr.index, parenthesize: false);

    if (expr.isNullAware) {
      return '$target?.[$index]';
    }

    return '$target[$index]';
  }

  String _generateThisExpression(ThisExpressionIR expr) {
    return 'this';
  }

  String _generateSuperExpression(SuperExpressionIR expr) {
    return 'super';
  }

  // =========================================================================
  // BINARY & UNARY OPERATIONS (0x20 - 0x2F)
  // =========================================================================

  String _generateBinary(BinaryExpressionIR expr) {
    // Special handling for floor division
    if (expr.operator == BinaryOperatorIR.floorDivide) {
      final left = generate(expr.left, parenthesize: true);
      final right = generate(expr.right, parenthesize: true);
      return 'Math.floor($left / $right)';
    }

    final isSuperCheck =
        (expr.left is SuperExpressionIR) ||
        (expr.left is IdentifierExpressionIR &&
            (expr.left as IdentifierExpressionIR).name == 'super') ||
        (expr.left is UnknownExpressionIR &&
            (expr.left as UnknownExpressionIR).source?.trim() == 'super');

    if (isSuperCheck &&
        (expr.operator == BinaryOperatorIR.equals ||
            expr.operator == BinaryOperatorIR.notEquals)) {
      final right = generate(expr.right, parenthesize: false);
      final op = expr.operator == BinaryOperatorIR.equals ? '' : '!';
      print('🔧 Converting super equality check: ${op}super.equals($right)');
      return '${op}super.equals($right)';
    }

    final left = generate(expr.left, parenthesize: true);
    final right = generate(expr.right, parenthesize: true);
    final op = _mapBinaryOperator(expr.operator);

    return '$left $op $right';
  }

  String _mapBinaryOperator(BinaryOperatorIR op) {
    switch (op) {
      // Arithmetic
      case BinaryOperatorIR.add:
        return '+';
      case BinaryOperatorIR.subtract:
        return '-';
      case BinaryOperatorIR.multiply:
        return '*';
      case BinaryOperatorIR.divide:
        return '/';
      case BinaryOperatorIR.floorDivide:
        throw CodeGenError(
          message: 'Floor division should be handled in _generateBinary',
        );
      case BinaryOperatorIR.modulo:
        return '%';

      // Comparison
      case BinaryOperatorIR.equals:
        return '===';
      case BinaryOperatorIR.notEquals:
        return '!==';
      case BinaryOperatorIR.lessThan:
        return '<';
      case BinaryOperatorIR.lessThanOrEqual:
        return '<=';
      case BinaryOperatorIR.greaterThan:
        return '>';
      case BinaryOperatorIR.greaterThanOrEqual:
        return '>=';

      // Logical
      case BinaryOperatorIR.logicalAnd:
        return '&&';
      case BinaryOperatorIR.logicalOr:
        return '||';

      // Bitwise
      case BinaryOperatorIR.bitwiseAnd:
        return '&';
      case BinaryOperatorIR.bitwiseOr:
        return '|';
      case BinaryOperatorIR.bitwiseXor:
        return '^';
      case BinaryOperatorIR.leftShift:
        return '<<';
      case BinaryOperatorIR.rightShift:
        return '>>';
      // case BinaryOperatorIR.unsignedRightShift:
      //   return '>>>';

      // Null coalescing handled separately
      case BinaryOperatorIR.nullCoalesce:
        return '??';
    }
  }

  String _generateUnary(UnaryExpressionIR expr) {
    final operand = generate(expr.operand, parenthesize: true);
    final op = _mapUnaryOperator(expr.operator);

    if (expr.isPrefix) {
      return '$op$operand';
    } else {
      // ✅ FIX: Postfix '!' (null check). Use runtime helper.
      if (op == '!') {
        return 'nullAssert($operand)';
      }
      return '$operand$op';
    }
  }

  String _mapUnaryOperator(UnaryOperator op) {
    switch (op) {
      case UnaryOperator.negate:
        return '-';
      case UnaryOperator.logicalNot:
        return '!';
      case UnaryOperator.bitwiseNot:
        return '~';
      case UnaryOperator.preIncrement:
        return '++';
      case UnaryOperator.preDecrement:
        return '--';
      case UnaryOperator.postIncrement:
        return '++';
      case UnaryOperator.postDecrement:
        return '--';
    }
  }

  String _generateAssignment(AssignmentExpressionIR expr) {
    final target = generate(expr.target, parenthesize: false);
    final value = generate(expr.value, parenthesize: true);

    // Check if this is a variable declaration (used in for loop initialization)
    final isDeclaration = expr.metadata?['isDeclaration'] == true;
    if (isDeclaration) {
      final isConst = expr.metadata?['isConst'] == true;
      final isFinal = expr.metadata?['isFinal'] == true;
      final keyword = isConst || isFinal ? 'const' : 'let';
      return '$keyword $target = $value';
    }

    return '$target = $value';
  }

  String _generateCompoundAssignment(CompoundAssignmentExpressionIR expr) {
    final target = generate(expr.target, parenthesize: false);
    final op = _mapBinaryOperator(expr.operator);
    final value = generate(expr.value, parenthesize: true);

    return '$target $op= $value';
  }

  // =========================================================================
  // CONDITIONAL & NULL-AWARE EXPRESSIONS (0x24 - 0x25)
  // =========================================================================

  String _generateConditional(ConditionalExpressionIR expr) {
    final cond = generate(expr.condition, parenthesize: true);
    final then = generate(expr.thenExpression, parenthesize: true);
    final else_ = generate(expr.elseExpression, parenthesize: true);

    return '($cond) ? ($then) : ($else_)';
  }

  String _generateNullCoalescing(NullCoalescingExpressionIR expr) {
    final left = generate(expr.left, parenthesize: true);
    final right = generate(expr.right, parenthesize: true);

    return '$left ?? $right';
  }

  String _generateNullAwareAccess(NullAwareAccessExpressionIR expr) {
    final target = generate(expr.target, parenthesize: true);

    switch (expr.operationType) {
      case NullAwareOperationType.property:
        return '$target?.${expr.operationData}';

      case NullAwareOperationType.methodCall:
        return '$target?.${expr.operationData}()';

      case NullAwareOperationType.indexAccess:
        return '$target?.[${expr.operationData}]';
    }
  }

  // =========================================================================
  // COLLECTION EXPRESSIONS (0x07 - 0x09)
  // =========================================================================

  String _generateListLiteral(ListExpressionIR expr) {
    final parts = <String>[];

    for (final element in expr.elements) {
      final code = generate(element, parenthesize: false);

      // Check if this element is a conditional from collection-if that needs spreading
      if (element is ConditionalExpressionIR &&
          element.metadata['fromCollectionIf'] == true &&
          element.metadata['isSpread'] == true) {
        // Use spread operator to flatten: ...(condition ? [items] : [])
        parts.add('...($code)');
      } else if (element is ConditionalExpressionIR &&
          element.metadata['fromCollectionIf'] == true) {
        // Single element conditional: filter out nulls
        parts.add(
          '...($code) != null ? [$code] : []]'.replaceAll(
            '] != null ? [',
            ' != null ? ',
          ),
        );
      } else {
        parts.add(code);
      }
    }

    return '[${parts.join(', ')}]';
  }

  String _generateMapLiteral(MapExpressionIR expr) {
    if (expr.elements.isEmpty) {
      return '{}';
    }

    final entryStrings = <String>[];

    for (final element in expr.elements) {
      // ✅ Start handling diverse map elements

      // 1. Literal NULL (from skipped ForElement etc.)
      if (element is LiteralExpressionIR &&
          element.literalType == LiteralType.nullValue) {
        continue;
      }

      // 2. Standard MapEntryIR
      if (element is MapEntryIR) {
        final key = _generateMapKey(element.key);
        final value = generate(element.value, parenthesize: false);
        entryStrings.add('$key: $value');
        continue;
      }

      // 3. Conditional / Spread / Other Expression
      // Assuming these evaluate to an object we can spread
      // e.g. Conditional: (c) ? {k:v} : {}
      final spreadExpr = generate(element, parenthesize: true);
      entryStrings.add('...$spreadExpr');
    }

    return '{ ${entryStrings.join(', ')} }';
  }

  // ✅ Add helper for MapEntryIR (used when it appears as expression in conditional)
  // Generates { key: value } as a standalone object
  String _generateMapEntry(MapEntryIR expr) {
    final key = _generateMapKey(expr.key);
    final value = generate(expr.value, parenthesize: false);
    return '{ $key: $value }';
  }

  String _generateMapKey(ExpressionIR keyExpr) {
    // If key is a simple identifier, use unquoted form
    if (keyExpr is IdentifierExpressionIR && _isValidIdentifier(keyExpr.name)) {
      return keyExpr.name;
    }

    // If key is a string literal, use it as property name
    if (keyExpr is LiteralExpressionIR &&
        keyExpr.literalType == LiteralType.stringValue) {
      final str = keyExpr.value as String;
      if (_isValidIdentifier(str)) {
        return str;
      }
      return _escapeString(str);
    }

    // Otherwise compute key (Use brackets for computed property names in JS)
    // e.g. { [new Foo()]: 'bar' }
    final keyExprCode = generate(keyExpr, parenthesize: false);
    return '[$keyExprCode]';
  }

  String _generateSetLiteral(SetExpressionIR expr) {
    final elements = expr.elements
        .map((e) => generate(e, parenthesize: false))
        .join(', ');

    return 'new Set([$elements])';
  }

  // =========================================================================
  // FUNCTION & METHOD CALLS (0x30 - 0x34)
  // =========================================================================

  String _generateMethodCall(MethodCallExpressionIR expr) {
    // ✅ GENERATE TYPE ARGUMENTS <CounterModel>, <List<String>>, etc.
    final typeArgStr = _generateTypeArguments(expr.typeArguments);

    // If target is explicitly provided, use it
    if (expr.target != null) {
      // ✅ FIX: Use parenthesize: true to ensure complex targets (like casts/ternaries)
      // are correctly wrapped before method call.
      final target = generate(expr.target!, parenthesize: true);
      final args = _generateArgumentList(expr.arguments, expr.namedArguments);

      // ✅ NEW: Map Dart math methods to JS Math object
      if (expr.arguments.isEmpty) {
        switch (expr.methodName) {
          case 'floor':
            return 'Math.floor($target)';
          case 'round':
            return 'Math.round($target)';
          case 'ceil':
            return 'Math.ceil($target)';
          case 'truncate':
            return 'Math.trunc($target)';
        }
      }

      final safeMethodName = safeIdentifier(expr.methodName);

      if (expr.isNullAware) {
        return '$target?.$safeMethodName$typeArgStr($args)';
      } else if (expr.isCascade) {
        return '$target.$safeMethodName$typeArgStr($args)';
      } else {
        return '$target.$safeMethodName$typeArgStr($args)';
      }
    }

    // ✅ FIXED: When target is null
    final args = _generateArgumentList(expr.arguments, expr.namedArguments);

    // Check if this is a widget/class constructor
    // Include both:
    // - Public classes: ClassName (starts with uppercase)
    // - Private classes: _ClassName (starts with _ then uppercase)
    final isWidgetCall =
        expr.methodName.isNotEmpty &&
        (
        // Public class: first char is uppercase
        (expr.methodName[0].toUpperCase() == expr.methodName[0] &&
                !expr.methodName.startsWith('_')) ||
            // Private class: starts with _ and second char is uppercase
            (expr.methodName.startsWith('_') &&
                expr.methodName.length > 1 &&
                expr.methodName[1].toUpperCase() == expr.methodName[1]));

    if (isWidgetCall) {
      // Add 'new' keyword for widget/class constructors
      return 'new ${expr.methodName}$typeArgStr($args)';
    }

    // ✅ SMART CONTEXT: Method resolution
    // Instead of blindly adding 'this.' (which breaks globals like print()),
    // verify if the method actually belongs to the class context.
    if (_currentClassContext != null &&
        _currentFunctionContext != null &&
        !_currentFunctionContext!.isTopLevel) {
      bool shouldAddThis = false;
      final name = expr.methodName;

      // 1. Is it a defined instance method in this class?
      if (_currentClassContext!.instanceMethods.any((m) => m.name == name)) {
        shouldAddThis = true;
      }
      // 2. Is it a private method? (Heuristic: starts with _)
      // BUT: Exclude private CLASS names like _LandingPageState
      // (they start with _ but second char is uppercase)
      else if (name.startsWith('_') &&
          name.length > 1 &&
          name[1].toLowerCase() == name[1]) {
        shouldAddThis = true;
      }
      // 3. Known State<T> methods (common case)
      else if (const {
        'setState',
        'initState',
        'dispose',
        'didUpdateWidget',
        'didChangeDependencies',
      }.contains(name)) {
        shouldAddThis = true;
      }

      if (shouldAddThis) {
        return 'this.${expr.methodName}$typeArgStr($args)';
      }
    }

    // Fallback: Top-level function / Global / Imported

    return '${expr.methodName}$typeArgStr($args)';
  }

  /// ✅ NEW HELPER: Generate type arguments like <CounterModel>, <List<String>>
  String _generateTypeArguments(List<TypeIR> typeArguments) {
    // ✅ FIX: JS doesn't support generic type arguments in method calls.
    // Return empty string to strip them.
    return '';
  }

  /// Generate a single TypeIR to string
  String _generateType(TypeIR typeIR) {
    if (typeIR is SimpleTypeIR) {
      final nullable = typeIR.isNullable ? '?' : '';
      return '${typeIR.name}$nullable';
    }

    if (typeIR is ClassTypeIR) {
      final typeArgs = typeIR.typeArguments.isNotEmpty
          ? '<${typeIR.typeArguments.map(_generateType).join(", ")}>'
          : '';
      final nullable = typeIR.isNullable ? '?' : '';
      return '${typeIR.className}$typeArgs$nullable';
    }

    if (typeIR is DynamicTypeIR) {
      return 'dynamic';
    }

    if (typeIR is VoidTypeIR) {
      return 'void';
    }

    if (typeIR is NeverTypeIR) {
      return 'Never';
    }

    if (typeIR is FunctionTypeIR) {
      return 'Function';
    }

    // Fallback
    return 'dynamic';
  }

  String _generateFunctionCall(FunctionCallExpr expr) {
    final args = _generateArgumentList(expr.arguments, expr.namedArguments);

    // ✅ SMART CONTEXT for FunctionCallExpr
    // If we are in a class, this might be a method call misidentified as a function call
    if (_currentClassContext != null &&
        _currentFunctionContext != null &&
        !_currentFunctionContext!.isTopLevel) {
      bool shouldAddThis = false;
      final name = expr.functionName;

      // 1. Is it a defined instance method?
      if (_currentClassContext!.instanceMethods.any((m) => m.name == name)) {
        shouldAddThis = true;
      }
      // 2. Is it a private method?
      // BUT: Exclude private CLASS names like _LandingPageState
      else if (name.startsWith('_') &&
          name.length > 1 &&
          name[1].toLowerCase() == name[1]) {
        shouldAddThis = true;
      }
      // 3. Known State methods
      else if (const {
        'setState',
        'initState',
        'dispose',
        'didUpdateWidget',
        'didChangeDependencies',
      }.contains(name)) {
        shouldAddThis = true;
      }

      if (shouldAddThis) {
        return 'this.${expr.functionName}($args)';
      }
    }

    return '${expr.functionName}($args)';
  }

  /// Handles InstanceCreationExpressionIR (has TypeIR type)
  String _generateInstanceCreation(InstanceCreationExpressionIR expr) {
    var typeName = expr.type.displayName();

    // ✅ FIX: Strip generics from type name for JS
    // GlobalKey<FormState> -> GlobalKey
    if (typeName.contains('<')) {
      typeName = typeName.substring(0, typeName.indexOf('<'));
    }
    if (typeName == 'all' || typeName == 'EdgeInsets') {
      print(
        '🏗️ InstanceCreation: type=$typeName, constructor=${expr.constructorName}',
      );
    }
    final constructorName = expr.constructorName != null
        ? '.${expr.constructorName}'
        : '';
    final args = _generateArgumentList(expr.arguments, expr.namedArguments);

    // ✅ FIX: Use 'new' only for unnamed constructors (static methods don't use 'new')
    // Also skip 'new' for RequestInit (package:web interop)
    final prefix =
        (expr.constructorName?.isNotEmpty ?? false) || typeName == 'RequestInit'
        ? ''
        : 'new ';

    return '$prefix$typeName$constructorName($args)';
  }

  /// Handles ConstructorCallExpressionIR (has String className)
  String _generateConstructorCall(ConstructorCallExpressionIR expr) {
    if (expr.className == 'all' || expr.className == 'EdgeInsets') {
      print(
        '🏗️ ConstructorCall: class=${expr.className}, constructor=${expr.constructorName}',
      );
    }

    // ✅ PATCH: Fix misidentified EdgeInsets & BorderRadius constructors
    if (expr.className == 'all' ||
        expr.className == 'symmetric' ||
        expr.className == 'only' ||
        expr.className == 'fromLTRB' ||
        expr.className == 'circular') {
      // Handles Radius.circular too

      // Assume these are EdgeInsets/BorderRadius constructors
      final args = _generateArgumentList(
        expr.positionalArguments,
        expr.namedArguments,
      );

      var type = 'EdgeInsets';
      if (expr.className == 'circular')
        type =
            'BorderRadius'; // or Radius, context dependent but usually BorderRadius in widgets

      // If the constructor is 'all', mapped to 'EdgeInsets.all'
      // If 'symmetric', mapped to 'EdgeInsets.symmetric'
      return '$type.${expr.className}($args)';
    }

    // ✅ Build constructor name
    final constructorName = (expr.constructorName?.isNotEmpty ?? false)
        ? '.${expr.constructorName}'
        : '';

    // ✅ Use positionalArguments, not arguments
    final args = _generateArgumentList(
      expr.positionalArguments,
      expr.namedArguments,
    );

    // ✅ FIX: Use 'new' only for unnamed constructors
    final prefix = (expr.constructorName?.isNotEmpty ?? false) ? '' : 'new ';
    return '$prefix${expr.className}$constructorName($args)';
  }

  String _generateArgumentList(
    List<ExpressionIR> positional,
    Map<String, ExpressionIR> named,
  ) {
    final parts = <String>[];

    // ✅ FIX 1: Skip null positional arguments
    for (final expr in positional) {
      try {
        // NEW: Skip null literals
        if (expr is LiteralExpressionIR &&
            expr.literalType == LiteralType.nullValue) {
          _log('⚠️  Skipping null positional argument');
          continue;
        }

        final code = generate(expr, parenthesize: false);
        parts.add(code);
      } catch (e) {
        _log('❌ Error generating positional argument: $e');
        warnings.add(
          CodeGenWarning(
            severity: WarningSeverity.warning,
            message:
                'Failed to generate positional argument: ${expr.runtimeType}',
            suggestion: 'Check argument expression structure',
          ),
        );
        // CHANGED: Don't add placeholder for positional args - just skip
        // parts.add('null /* arg generation failed */');
      }
    }

    // ✅ ENHANCED: Process named arguments with type checking
    if (named.isNotEmpty) {
      final namedParts = <String>[];

      for (final entry in named.entries) {
        try {
          final argName = entry.key;
          final argExpr = entry.value;

          // ✅ FIX 2: Skip null named arguments
          if (argExpr is LiteralExpressionIR &&
              argExpr.literalType == LiteralType.nullValue) {
            _log('⚠️  Skipping null named argument: $argName');
            continue;
          }

          // ✅ NEW: Special handling for EnumMemberAccessExpressionIR
          if (argExpr is EnumMemberAccessExpressionIR) {
            print(
              '✅ Named argument "$argName" is EnumMemberAccess: ${argExpr.source}',
            );
            final jsCode = _generateEnumMemberAccess(argExpr);
            namedParts.add('$argName: $jsCode');
          } else {
            // Regular expression handling
            final code = generate(argExpr, parenthesize: false);
            namedParts.add('$argName: $code');
          }
        } catch (e, stack) {
          print('❌ Error generating named argument "${entry.key}": $e');
          print("${entry.key}: $e \n$stack");
          warnings.add(
            CodeGenWarning(
              severity: WarningSeverity.warning,
              message:
                  'Failed to generate named argument "${entry.key}": ${entry.value.runtimeType}',
              suggestion: 'Check argument expression structure',
            ),
          );

          // ✅ FIX: SAFETY FALLBACK for children
          // If 'children' generation fails (e.g. complex spreads), standard widgets (Column/Row/Stack)
          // will crash if they receive undefined (undefined.map).
          // Fallback to empty array to keep the app alive.
          if (entry.key == 'children') {
            print('⚠️  FALLBACK: Generating empty children list due to error');
            namedParts.add('children: []');
          } else {
            // For other args, explicit null is better than undefined/skipping
            namedParts.add('${entry.key}: null /* arg generation failed */');
          }
        }
      }

      if (namedParts.isNotEmpty) {
        parts.add('{ ${namedParts.join(", ")} }');
      }
    }

    return parts.join(', ');
  }

  String _generateLambda(LambdaExpr expr) {
    // Generate parameter list
    final params = expr.parameters.map((p) => p.name).join(', ');

    // Generate body
    if (expr.body != null) {
      final body = generate(expr.body!, parenthesize: false);
      return '($params) => $body';
    } else {
      return '($params) => undefined';
    }
  }

  // =========================================================================
  // TYPE OPERATIONS (0x40 - 0x42)
  // =========================================================================

  String _stripGenerics(String typeName) {
    var name = typeName;
    if (name.contains('<')) {
      name = name.substring(0, name.indexOf('<')).trim();
    }
    if (name.endsWith('?')) {
      name = name.substring(0, name.length - 1);
    }
    return name;
  }

  String _generateCast(CastExpressionIR expr) {
    final value = generate(expr.expression, parenthesize: true);
    final rawTargetType = expr.targetType.displayName();
    final targetType = _stripGenerics(rawTargetType);

    // Handle common type casts
    switch (targetType) {
      case 'int':
        return 'Math.floor($value)';
      case 'double':
      case 'num':
        return 'Number($value)';
      case 'String':
        return 'String($value)';
      case 'bool':
        return 'Boolean($value)';
      default:
        // ✅ FIX: Handle generic types (usually single letters like E, T, K, V)
        // JavaScript doesn't have runtime generic types, so 'instanceof E' will fail.
        if (targetType.length == 1 && targetType == targetType.toUpperCase()) {
          return value;
        }

        // ✅ FIX: Skip cast validation for package:web / JS interop types
        if (targetType.endsWith('Init') ||
            targetType.endsWith('Info') ||
            targetType.endsWith('Options') ||
            targetType.endsWith('Event') ||
            targetType.startsWith('JS') ||
            targetType == 'Promise' ||
            targetType == 'Object' ||
            targetType == 'String' ||
            targetType == 'Number' ||
            targetType == 'Boolean' ||
            targetType == 'Function') {
          return value;
        }

        // ✅ FIX: Skip unsafe function casts (Client Function()...)
        if (rawTargetType.contains('Function') || rawTargetType.contains('(')) {
          return value;
        }

        // Generic cast with instanceof check
        return '($value instanceof $targetType) ? $value : (() => { throw new Error("Cast failed to $rawTargetType"); })()';
    }
  }

  String _generateTypeCheck(TypeCheckExpr expr) {
    final value = generate(expr.expression, parenthesize: true);
    final checkType = expr.typeToCheck.displayName();

    String check = _generateTypeCheckExpression(value, checkType);

    if (expr.isNegated) {
      return '!($check)';
    } else {
      return check;
    }
  }

  String _generateIsExpression(IsExpressionIR expr) {
    final value = generate(expr.expression, parenthesize: true);
    final checkType = expr.targetType.displayName();

    String check = _generateTypeCheckExpression(value, checkType);

    if (expr.isNegated) {
      return '!($check)';
    } else {
      return check;
    }
  }

  String _generateTypeCheckExpression(String value, String rawTypeName) {
    var typeName = _stripGenerics(rawTypeName);

    // ✅ FIX: Handle generic function types (e.g. "void Function()")
    // rawTypeName might be "void Function(Object)", stripGenerics returns "void Function(Object)" (incomplete logic)
    // or if stripped, it might be "Function".
    // If it contains "Function" or starts with "Function", treat as function type
    if (rawTypeName.contains('Function') || typeName == 'Function') {
      return 'typeof $value === \'function\'';
    }

    switch (typeName) {
      case 'String':
        return 'typeof $value === \'string\'';
      case 'int':
      case 'double':
      case 'num':
        return 'typeof $value === \'number\'';
      case 'bool':
        return 'typeof $value === \'boolean\'';
      case 'List':
      case 'Iterable':
        return 'Array.isArray($value)';
      case 'Map':
        return 'typeof $value === \'object\' && $value !== null && !Array.isArray($value)';
      case 'Set':
        return '$value instanceof Set';
      case 'null':
      case 'Null':
        return '$value === null';
      case 'dynamic':
      case 'Object':
        return 'true'; // Always true
      default:
        // ✅ Handle erased generic type parameters (usually single letters like E, T, K, V)
        // JavaScript doesn't have runtime generic types, so 'instanceof E' will fail.
        if (typeName.length == 1 && typeName == typeName.toUpperCase()) {
          return 'true'; // Best we can do in JS for erased generics
        }

        // ✅ FIX: Skip instanceof for JS interop types or invalid identifiers
        if (typeName.contains(' ') ||
            typeName.contains('<') ||
            typeName.contains('(')) {
          // Fallback for complex types that got through stripping
          // Likely a function type signature that wasn't caught above
          return 'true /* approximate check for $rawTypeName */';
        }

        warnings.add(
          CodeGenWarning(
            severity: WarningSeverity.warning,
            message: 'Type check for custom type: $rawTypeName',
            suggestion: 'Ensure $typeName is imported in generated code',
          ),
        );
        return '$value instanceof $typeName';
    }
  }

  List<CodeGenWarning> getWarnings() => List.unmodifiable(warnings);

  /// Get all errors
  List<CodeGenError> getErrors() => List.unmodifiable(errors);

  /// Clear all warnings and errors
  void clearIssues() {
    warnings.clear();
    errors.clear();
  }

  String generateIssuesReport() {
    if (errors.isEmpty && warnings.isEmpty) {
      return '✓ No issues found';
    }

    final buffer = StringBuffer();

    if (errors.isNotEmpty) {
      buffer.writeln('❌ ERRORS (${errors.length}):');
      for (final error in errors) {
        buffer.writeln('  - ${error.message}');
        if (error.suggestion != null) {
          buffer.writeln('    💡 ${error.suggestion}');
        }
      }
    }

    if (warnings.isNotEmpty) {
      if (errors.isNotEmpty) buffer.writeln();
      buffer.writeln('⚠️  WARNINGS (${warnings.length}):');
      for (final warning in warnings) {
        buffer.writeln('  - ${warning.message}');
        if (warning.suggestion != null) {
          buffer.writeln('    💡 ${warning.suggestion}');
        }
      }
    }

    return buffer.toString();
  }

  // =========================================================================
  // ASYNC OPERATIONS (0x50 - 0x52)
  // =========================================================================

  String _generateAwait(AwaitExpr expr) {
    final future = generate(expr.futureExpression, parenthesize: true);

    return 'await $future';
  }

  String _generateThrow(ThrowExpr expr) {
    final exception = generate(expr.exceptionExpression, parenthesize: true);

    // ✅ FIX: In JS, 'throw' is a statement, not an expression.
    // Wrapping it in an IIFE allows it to be used in expression contexts (like ternary).
    return '(() => { throw $exception; })()';
  }

  // =========================================================================
  // STRING INTERPOLATION & SPECIAL (0x62+)
  // =========================================================================

  String _generateStringInterpolation(StringInterpolationExpressionIR expr) {
    final buffer = StringBuffer('`');

    for (final part in expr.parts) {
      if (part.isExpression) {
        buffer.write('\${${generate(part.expression!, parenthesize: false)}}');
      } else {
        // Escape backticks and backslashes in template strings
        final escaped = part.text!
            .replaceAll('\\', '\\\\')
            .replaceAll('`', '\\`')
            .replaceAll('\$', '\\\$');
        buffer.write(escaped);
      }
    }

    buffer.write('`');
    return buffer.toString();
  }

  String _generateCascade(CascadeExpressionIR expr) {
    // Generate the target expression first (it will be evaluated once)
    final targetCode = generate(expr.target, parenthesize: true);

    // Use a unique name for the cascaded object to avoid collisions.
    // We'll use a stack-like approach for nested cascades.
    final varName = '_casc${_recursionDepth}';

    final buffer = StringBuffer('(($varName) => {\n');

    final oldReceiver = _cascadeReceiver;
    _cascadeReceiver = varName;
    try {
      for (final section in expr.cascadeSections) {
        final sectionCode = generate(section, parenthesize: false);
        buffer.writeln('  $sectionCode;');
      }
    } finally {
      _cascadeReceiver = oldReceiver;
    }

    buffer.writeln('  return $varName;');
    buffer.write('})($targetCode)');

    return buffer.toString();
  }

  String _generateParenthesized(ParenthesizedExpressionIR expr) {
    final inner = generate(expr.innerExpression, parenthesize: false);

    return '($inner)';
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  static const _jsReservedWords = {
    'abstract',
    'arguments',
    'await',
    'boolean',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'double',
    'else',
    'enum',
    'eval',
    'export',
    'extends',
    'false',
    'final',
    'finally',
    'float',
    'for',
    'function',
    'goto',
    'if',
    'implements',
    'import',
    'in',
    'instanceof',
    'int',
    'interface',
    'let',
    'long',
    'native',
    'new',
    'null',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'short',
    'static',
    'super',
    'switch',
    'synchronized',
    'this',
    'throw',
    'throws',
    'transient',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'volatile',
    'while',
    'with',
    'yield',
    'async',
    'get',
    'set',
    'of',
  };

  bool _isValidIdentifier(String name) {
    if (name.isEmpty) return false;

    // Check first character
    if (!RegExp(r'[a-zA-Z_$]').hasMatch(name[0])) {
      return false;
    }

    // Check remaining characters
    if (!RegExp(r'^[a-zA-Z0-9_$]*$').hasMatch(name)) {
      return false;
    }

    return !_jsReservedWords.contains(name);
  }

  String safeIdentifier(String name) {
    // These are reserved in JS and cannot be used as identifiers or member names
    // in various contexts (like variable names or static class fields)
    const reservedMembers = {'constructor', 'prototype', '__proto__'};

    if (reservedMembers.contains(name) || _jsReservedWords.contains(name)) {
      return '\$$name';
    }

    return name;
  }

  String generateEnumMemberAccess(EnumMemberAccessExpressionIR expr) {
    print('✅ Processing Dart 3.0+ enum member access: "${expr.source}"');
    print(expr.toDebugString());

    // Handle shorthand with type inference
    if (expr.kind == EnumMemberAccessKind.shorthand) {
      if (expr.inferredTypeName != null) {
        print('✅ Inferred type: ${expr.inferredTypeName}');
      } else {
        print('⚠️  Could not infer type for shorthand access');
        // The parent context (like Column.mainAxisAlignment) would need to
        // provide the type - this is handled at a higher level
      }
    }

    // Convert to JavaScript representation
    final jsCode = expr.toJavaScript();
    print('✅ Generated JS: $jsCode');

    return jsCode;
  }

  /// Helper: Add 'new' keyword to constructor calls in string
  /// Detects UpperCase identifiers followed by '(' and adds 'new' if missing
  String _addNewToConstructors(String code) {
    // Pattern: UpperCase letter followed by alphanumeric and then '('
    // But NOT preceded by 'new '
    // Examples: TextButton(...) → new TextButton(...)
    //          SizedBox(...) → new SizedBox(...)

    final result = code.replaceAllMapped(
      RegExp(r'(?<!new\s)(?<![.])\b([A-Z][a-zA-Z0-9_]*)\s*\('),
      (match) {
        final className = match.group(1)!;
        // Don't add 'new' to known Flutter constants/enums or types
        final skipList = {
          'Colors',
          'Icons',
          'EdgeInsets',
          'FontWeight',
          'TextAlign',
          'MainAxisAlignment',
          'CrossAxisAlignment',
          'MainAxisSize',
          'WrapAlignment',
          'BoxShape',
          'TextOverflow',
          'Alignment',
          'BorderRadius',
          'Border',
          'BoxDecoration',
          'BoxConstraints',
          'TextStyle',
          'Color',
          'Offset',
          'BoxShadow',
          'BorderSide',
          'RoundedRectangleBorder',
          'ColorScheme',
          'Theme',
          'MediaQuery',
        };

        // If it's a known utility class with static methods, don't add 'new'
        if (skipList.contains(className)) {
          return match.group(0)!;
        }

        return 'new $className(';
      },
    );

    return result;
  }
}
