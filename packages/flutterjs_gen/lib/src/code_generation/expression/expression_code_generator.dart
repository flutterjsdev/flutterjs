// ============================================================================
// PHASE 2.1: EXPRESSION CODE GENERATOR
// ============================================================================
// Converts all Dart expression IR types to JavaScript code
// Direct IR → JS without intermediate transformations
// ============================================================================

import 'dart:math';

import 'package:flutterjs_core/flutterjs_core.dart';
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

  /// ✅ NEW: Track the current function context
  FunctionDecl? _currentFunctionContext;

  // ✅ ADD THIS: Track recursion depth
  int _recursionDepth = 0;
  static const int _maxRecursionDepth = 100;

  ExpressionCodeGen({
    ExpressionGenConfig? config,
    FunctionDecl? currentFunctionContext,
  }) : config = config ?? const ExpressionGenConfig(),

       _currentFunctionContext = currentFunctionContext;

  /// ✅ NEW: Set context when generating expressions for a function
  void setFunctionContext(FunctionDecl? func) {
    _currentFunctionContext = func;
  }

  /// Generate JavaScript code from an expression IR
  /// Returns JS code or throws CodeGenError on unsupported expressions
  String generate(ExpressionIR expr, {bool parenthesize = false}) {
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
    if (expr is LambdaExpr) {
      return _generateLambda(expr); // ✅ Line ~180
    }

    if (expr is AwaitExpr) {
      return _generateAwait(expr); // ✅ Line ~240
    }

    if (expr is EnumMemberAccessExpressionIR) {
      return _generateEnumMemberAccess(expr); // ✅ Line ~160
    }

    if (expr is FunctionExpressionIR) {
      return _generateFunctionExpression(expr); // ✅ ADD THIS
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
    print('   🔵 [FunctionExpression] Generating lambda...');

    // =========================================================================
    // STEP 1: Generate parameter list
    // =========================================================================
    final params = expr.parameter.map((p) => p.name).join(', ');
    print('   📍 Parameters: $params');

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
          print('   📍 Body type: single return');
        }
      }
      // Single expression statement: (x) => expr
      else if (statements.length == 1 && statements.first is ExpressionStmt) {
        final exprStmt = statements.first as ExpressionStmt;
        bodyCode = generate(exprStmt.expression, parenthesize: false);
        print('   📍 Body type: single expression');
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
        print('   📍 Body type: multiple statements');
      }
    } else {
      print('   ⚠️  No body statements found');
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

    print('   ✅ Generated: $result');
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
      final typeName = param.type!.displayName();
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
    final thenPart = _generateStatementBody(stmt.thenBranch);

    String result = 'if ($condition) $thenPart';

    if (stmt.elseBranch != null) {
      final elsePart = _generateStatementBody(stmt.elseBranch!);
      result += ' else $elsePart';
    }

    return result;
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

  /// Generate statement body (single or block)
  String _generateStatementBody(StatementIR stmt) {
    if (stmt is BlockStmt) {
      return _generateBlockStatement(stmt);
    }

    return _generateStatement(stmt);
  }

  String _generateUnknownExpression(UnknownExpressionIR expr) {
    print('⚠️  UnknownExpressionIR detected: ${expr.source}');

    // Try to extract usable info from the unknown expression
    if (expr.source != null && expr.source!.isNotEmpty) {
      print('   Fallback: Using source text: "${expr.source}"');
      warnings.add(
        CodeGenWarning(
          severity: WarningSeverity.warning,
          message: 'UnknownExpressionIR encountered: ${expr.source}',
          suggestion: 'This expression type may not be fully supported',
        ),
      );
      return expr.source!;
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
    return expr.name;
  }

  String _generatePropertyAccess(PropertyAccessExpressionIR expr) {
    // ✅ FIX: Never parenthesize property access chains
    final target = generate(expr.target, parenthesize: false);

    if (_isValidIdentifier(expr.propertyName)) {
      return '$target.${expr.propertyName}';
    } else {
      return "$target['${expr.propertyName}']";
    }
  }

  String _generateIndexAccess(IndexAccessExpressionIR expr) {
    final target = generate(expr.target, parenthesize: false);
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
    final elements = expr.elements
        .map((e) => generate(e, parenthesize: false))
        .join(', ');

    return '[$elements]';
  }

  String _generateMapLiteral(MapExpressionIR expr) {
    final entries = expr.entries
        .map((entry) {
          final key = _generateMapKey(entry.key);
          final value = generate(entry.value, parenthesize: false);
          return '$key: $value';
        })
        .join(', ');

    return '{$entries}';
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

    // Otherwise compute key
    return generate(keyExpr, parenthesize: true);
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
      final target = generate(expr.target!, parenthesize: false);
      final args = _generateArgumentList(expr.arguments, expr.namedArguments);

      if (expr.isNullAware) {
        return '$target?.${expr.methodName}$typeArgStr($args)';
      } else if (expr.isCascade) {
        return '$target..${expr.methodName}$typeArgStr($args)';
      } else {
        return '$target.${expr.methodName}$typeArgStr($args)';
      }
    }

    // ✅ FIXED: When target is null
    final args = _generateArgumentList(expr.arguments, expr.namedArguments);

    // Check if this is a widget constructor
    final isWidgetCall =
        expr.methodName.isNotEmpty &&
        expr.methodName[0].toUpperCase() == expr.methodName[0];

    if (isWidgetCall) {
      // ✅ FIX: Add 'new' keyword for widget constructors (implicitly detected by Capitalized name)
      return 'new ${expr.methodName}$typeArgStr($args)';
    }

    // ✅ NEW: Use context from the function declaration
    // This requires passing context through the generation pipeline
    if (_currentFunctionContext != null &&
        !_currentFunctionContext!.isTopLevel) {
      // Inside a class method: use 'this.'
      return 'this.${expr.methodName}$typeArgStr($args)';
    }

    // Top-level function: direct call (no 'this.')
    return '${expr.methodName}$typeArgStr($args)';
  }

  /// ✅ NEW HELPER: Generate type arguments like <CounterModel>, <List<String>>
  String _generateTypeArguments(List<TypeIR> typeArguments) {
    if (typeArguments.isEmpty) {
      return '';
    }

    final typeStrs = typeArguments.map((typeIR) {
      return _generateType(typeIR);
    }).toList();

    return '<${typeStrs.join(", ")}>';
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
      final nullable = typeIR.isNullable ?? false ? '?' : '';
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

    return '${expr.functionName}($args)';
  }

  /// Handles InstanceCreationExpressionIR (has TypeIR type)
  String _generateInstanceCreation(InstanceCreationExpressionIR expr) {
    final typeName = expr.type.displayName();
    final constructorName = expr.constructorName != null
        ? '.${expr.constructorName}'
        : '';
    final args = _generateArgumentList(expr.arguments, expr.namedArguments);
    // Note: JavaScript doesn't have 'const' for object instantiation, only 'new'

    return 'new $typeName$constructorName($args)';
  }

  /// Handles ConstructorCallExpressionIR (has String className)
  String _generateConstructorCall(ConstructorCallExpressionIR expr) {
    // ✅ Build constructor name
    final constructorName = (expr.constructorName?.isNotEmpty ?? false)
        ? '.${expr.constructorName}'
        : '';

    // ✅ Combine positional and named arguments
    // Use positionalArguments, not arguments
    final args = _generateArgumentList(
      expr.positionalArguments,
      expr.namedArguments,
    );

    // Note: JavaScript doesn't have 'const' for object instantiation, only 'new'
    return 'new ${expr.className}$constructorName($args)';
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
          print('⚠️  Skipping null positional argument');
          continue;
        }

        final code = generate(expr, parenthesize: false);
        parts.add(code);
      } catch (e) {
        print('❌ Error generating positional argument: $e');
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
            print('⚠️  Skipping null named argument: $argName');
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
          // CHANGED: Skip failed named arguments instead of adding placeholder
          // namedParts.add('${entry.key}: null /* arg generation failed */');
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

  String _generateCast(CastExpressionIR expr) {
    final value = generate(expr.expression, parenthesize: true);
    final targetType = expr.targetType.displayName();

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
        // Generic cast with instanceof check
        return '($value instanceof $targetType) ? $value : (() => { throw new Error("Cast failed to $targetType"); })()';
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

  String _generateTypeCheckExpression(String value, String typeName) {
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
        return '$value === null';
      case 'Null':
        return '$value === null';
      default:
        warnings.add(
          CodeGenWarning(
            severity: WarningSeverity.warning,
            message: 'Type check for custom type: $typeName',
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

    return 'throw $exception';
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
    final target = generate(expr.target, parenthesize: false);

    final sections = expr.cascadeSections
        .map((s) {
          if (s is MethodCallExpressionIR) {
            final args = _generateArgumentList(s.arguments, s.namedArguments);
            return '.${s.methodName}($args)';
          }
          if (s is PropertyAccessExpressionIR) {
            return '.${s.propertyName}';
          }
          if (s is AssignmentExpressionIR) {
            return ' = ${generate(s.value, parenthesize: false)}';
          }

          throw CodeGenError(
            message: 'Unsupported cascade section type: ${s.runtimeType}',
            suggestion:
                'Cascade sections must be method calls, property access, or assignments',
          );
        })
        .join('');

    return '$target$sections';
  }

  String _generateParenthesized(ParenthesizedExpressionIR expr) {
    final inner = generate(expr.innerExpression, parenthesize: false);

    return '($inner)';
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

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

    // Check if it's a reserved word
    const reserved = {
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
    };

    return !reserved.contains(name);
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
}

// ============================================================================
// FLUTTER ENUM MEMBER MAPPING
// ============================================================================
