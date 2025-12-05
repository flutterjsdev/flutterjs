// ============================================================================
// PHASE 2.1: EXPRESSION CODE GENERATOR
// ============================================================================
// Converts all Dart expression IR types to JavaScript code
// Direct IR → JS without intermediate transformations
// ============================================================================


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

  // ✅ ADD THIS: Track recursion depth
  int _recursionDepth = 0;
  static const int _maxRecursionDepth = 100;

  ExpressionCodeGen({ExpressionGenConfig? config})
    : config = config ?? const ExpressionGenConfig();

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

      if (parenthesize && config.safeParens) {
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
      // ✅ ADD THIS: Always decrement
      _recursionDepth--;
    }
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
    // Literal Expressions
    // ✅ ADD THIS: Debug logging
    if (_recursionDepth > 50) {
      _printRecursionInfo(expr);
    }
    if (expr is LiteralExpressionIR) {
      return _generateLiteral(expr);
    }

    // Identifiers & Access
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

    // Operations
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

    // Conditionals
    if (expr is ConditionalExpressionIR) {
      return _generateConditional(expr);
    }

    if (expr is NullCoalescingExpressionIR) {
      return _generateNullCoalescing(expr);
    }

    if (expr is NullAwareAccessExpressionIR) {
      return _generateNullAwareAccess(expr);
    }

    // Collections
    if (expr is ListExpressionIR) {
      return _generateListLiteral(expr);
    }

    if (expr is MapExpressionIR) {
      return _generateMapLiteral(expr);
    }

    if (expr is SetExpressionIR) {
      return _generateSetLiteral(expr);
    }

    // Functions & Calls
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

    // Type Operations
    if (expr is CastExpressionIR) {
      return _generateCast(expr);
    }

    if (expr is TypeCheckExpr) {
      return _generateTypeCheck(expr);
    }

    // Async Operations
    if (expr is AwaitExpr) {
      return _generateAwait(expr);
    }

    if (expr is ThrowExpr) {
      return _generateThrow(expr);
    }

    // Other
    if (expr is StringInterpolationExpressionIR) {
      return _generateStringInterpolation(expr);
    }

    if (expr is CascadeExpressionIR) {
      return _generateCascade(expr);
    }

    if (expr is ParenthesizedExpressionIR) {
      return _generateParenthesized(expr);
    }

    // ✅ NEW: Add this handler for EnumMemberAccess
    if (expr is EnumMemberAccessExpressionIR) {
      return _generateEnumMemberAccess(expr);
    }
    
    // Fallback
    throw CodeGenError(
      message: 'Unsupported expression type: ${expr.runtimeType}',
      suggestion: 'Check if this expression type is implemented',
    );
  }

  String _generateEnumMemberAccess(EnumMemberAccessExpressionIR expr) {
    print('✅ Processing Dart 3.0+ enum member access: "${expr.source}"');

    // Get the type name (either explicit or inferred)
    final typeName = expr.typeName ?? expr.inferredTypeName;
    final memberName = expr.memberName;

    // Use the enum mapper to get the correct JavaScript/CSS value
    if (typeName != null) {
      final jsValue = FlutterEnumMapper.mapEnumMember(typeName, memberName);
      print('✅ Mapped $typeName.$memberName → $jsValue');
      return jsValue;
    }

    // Fallback: just return the member name as a string
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
    final target = generate(expr.target, parenthesize: true);

    // Check if property name is valid JS identifier
    if (_isValidIdentifier(expr.propertyName)) {
      return '$target.${expr.propertyName}';
    } else {
      return "$target['${expr.propertyName}']";
    }
  }

  String _generateIndexAccess(IndexAccessExpressionIR expr) {
    final target = generate(expr.target, parenthesize: true);
    final index = generate(expr.index, parenthesize: true);

    // Handle null-aware index access (?.operator not standard, but can use optional chaining)
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
    // ✅ FIX: Don't use 'this.' for Flutter widget constructors
    final target = expr.target != null
        ? generate(expr.target!, parenthesize: true)
        : 'this';

    // ✅ NEW: Check if this is a widget constructor call (capitalize first letter)
    final isWidgetCall = expr.methodName[0].toUpperCase() == expr.methodName[0];

    // Generate arguments - THIS IS THE KEY FIX
    final args = _generateArgumentList(expr.arguments, expr.namedArguments);

    // ✅ FIX: For widget calls, don't use 'this.'
    if (isWidgetCall) {
      return '${expr.methodName}($args)';
    }

    // For regular method calls, use dot notation
    if (expr.isNullAware) {
      return '$target?.${expr.methodName}($args)';
    } else if (expr.isCascade) {
      return '$target..${expr.methodName}($args)';
    } else {
      return '$target.${expr.methodName}($args)';
    }
  }

  String _generateFunctionCall(FunctionCallExpr expr) {
    final args = _generateArgumentList(expr.arguments, expr.namedArguments);

    return '${expr.functionName}($args)';
  }

  String _generateInstanceCreation(InstanceCreationExpressionIR expr) {
    final typeName = expr.type.displayName();
    final constructorName = expr.constructorName != null
        ? '.${expr.constructorName}'
        : '';
    final args = _generateArgumentList(expr.arguments, expr.namedArguments);
    final constKeyword = expr.isConst ? 'const ' : '';

    return '${constKeyword}new $typeName$constructorName($args)';
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
