import 'package:meta/meta.dart';
import '../expression_ir.dart';
import '../type_ir.dart';

// =============================================================================
// CASCADE EXPRESSION
// =============================================================================

/// Represents a cascade expression in Dart
/// Allows multiple method calls on the same object
///
/// Example: `obj..method1()..method2()..property = value`
@immutable
class CascadeExpressionIR extends ExpressionIR {
  /// The target object
  final ExpressionIR target;

  /// List of cascade sections (method calls, property assignments, etc.)
  final List<ExpressionIR> cascadeSections;

  const CascadeExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.target,
    required this.cascadeSections,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${target.toShortString()}..${cascadeSections.length} cascade(s)';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'target': target.toJson(),
      'cascadeSections': cascadeSections.map((s) => s.toJson()).toList(),
    };
  }
}

// =============================================================================
// NULL-AWARE ACCESS EXPRESSION
// =============================================================================

/// Represents null-aware access operations in Dart
/// Handles ?., ?[, and other null-coalescing access patterns
///
/// Example: `obj?.property`, `obj?[index]`, `obj?.method()`
@immutable
class NullAwareAccessExpressionIR extends ExpressionIR {
  /// The target object
  final ExpressionIR target;

  /// Type of null-aware operation (property access, method call, index access, etc.)
  final NullAwareOperationType operationType;

  /// Additional data for the operation (property name, method name, etc.)
  final String? operationData;

  const NullAwareAccessExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.target,
    required this.operationType,
    required super.resultType,
    this.operationData,
    super.metadata,
  });

  @override
  String toShortString() {
    final opStr = switch (operationType) {
      NullAwareOperationType.property => '?.$operationData',
      NullAwareOperationType.methodCall => '?.$operationData()',
      NullAwareOperationType.indexAccess => '?[...]',
    };
    return '${target.toShortString()}$opStr';
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'target': target.toJson(),
      'operationType': operationType.name,
      'operationData': operationData,
    };
  }
}

enum NullAwareOperationType { property, methodCall, indexAccess }

// =============================================================================
// NULL COALESCING EXPRESSION
// =============================================================================

/// Represents the null coalescing operator (??)
/// Returns the left operand if not null, otherwise the right operand
///
/// Example: `value ?? defaultValue`
@immutable
class NullCoalescingExpressionIR extends ExpressionIR {
  /// Left operand (checked for null)
  final ExpressionIR left;

  /// Right operand (used if left is null)
  final ExpressionIR right;

  const NullCoalescingExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.left,
    required this.right,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${left.toShortString()} ?? ${right.toShortString()}';

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson(), 'left': left.toJson(), 'right': right.toJson()};
  }
}

// =============================================================================
// INSTANCE CREATION EXPRESSION
// =============================================================================

/// Represents object instantiation with the `new` keyword or constructor call
///
/// Example: `new MyClass()`, `MyClass.named(args)`, `const MyClass()`
@immutable
class InstanceCreationExpressionIR extends ExpressionIR {
  /// The type being instantiated
  final TypeIR type;

  /// Optional constructor name (for named constructors)
  final String? constructorName;

  /// Whether this is a const constructor
  final bool isConst;

  /// Positional arguments
  final List<ExpressionIR> arguments;

  /// Named arguments
  final Map<String, ExpressionIR> namedArguments;

  const InstanceCreationExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.type,
    required super.resultType,
    this.constructorName,
    this.isConst = false,
    this.arguments = const [],
    this.namedArguments = const {},
    super.metadata,
  }) : super(isConstant: isConst);

  @override
  String toShortString() {
    final constStr = isConst ? 'const ' : '';
    final constructorStr = constructorName != null
        ? '.${constructorName!}'
        : '';
    final argsCount = arguments.length + namedArguments.length;
    return '$constStr${type.displayName()}$constructorStr($argsCount args)';
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'type': type.toJson(),
      'constructorName': constructorName,
      'isConst': isConst,
      'arguments': arguments.map((a) => a.toJson()).toList(),
      'namedArguments': namedArguments.map((k, v) => MapEntry(k, v.toJson())),
    };
  }
}

// =============================================================================
// COMPOUND ASSIGNMENT EXPRESSION
// =============================================================================

/// Represents compound assignment operations in Dart
/// Combines an operation with assignment (+=, -=, *=, etc.)
///
/// Example: `x += 5`, `str *= 2`, `value ??= defaultVal`
@immutable
class CompoundAssignmentExpressionIR extends ExpressionIR {
  /// The target being assigned to
  final ExpressionIR target;

  /// The compound operator (+=, -=, *=, /=, etc.)
  final BinaryOperatorIR operator;

  /// The value being combined with the target
  final ExpressionIR value;

  const CompoundAssignmentExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.target,
    required this.operator,
    required this.value,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${target.toShortString()} $operator ${value.toShortString()}';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'target': target.toJson(),
      'operator': operator,
      'value': value.toJson(),
    };
  }
}

// =============================================================================
// STRING INTERPOLATION EXPRESSION
// =============================================================================

/// Represents string interpolation in Dart
/// Combines literal string parts with expressions
///
/// Example: `"Hello $name, you are $age years old"`
@immutable
class StringInterpolationExpressionIR extends ExpressionIR {
  /// The parts of the interpolated string
  final List<StringInterpolationPart> parts;

  const StringInterpolationExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.parts,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() => '"...${parts.length} parts..."';

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson(), 'parts': parts.map((p) => p.toJson()).toList()};
  }
}

// =============================================================================
// THIS EXPRESSION
// =============================================================================

/// Represents the `this` keyword in Dart
/// Refers to the current instance
///
/// Example: `this.property`, `this.method()`
@immutable
class ThisExpressionIR extends ExpressionIR {
  const ThisExpressionIR({
    required super.id,
    required super.sourceLocation,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() => 'this';

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson()};
  }
}

// =============================================================================
// SUPER EXPRESSION
// =============================================================================

/// Represents the `super` keyword in Dart
/// Refers to the parent class instance
///
/// Example: `super.property`, `super.method()`
@immutable
class SuperExpressionIR extends ExpressionIR {
  const SuperExpressionIR({
    required super.id,
    required super.sourceLocation,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() => 'super';

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson()};
  }
}

// =============================================================================
// PARENTHESIZED EXPRESSION
// =============================================================================

/// Represents an expression wrapped in parentheses
/// Used to enforce precedence or for clarity
///
/// Example: `(a + b) * c`, `(condition ? x : y)`
@immutable
class ParenthesizedExpressionIR extends ExpressionIR {
  /// The expression inside the parentheses
  final ExpressionIR innerExpression;

  const ParenthesizedExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.innerExpression,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() => '(${innerExpression.toShortString()})';

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson(), 'innerExpression': innerExpression.toJson()};
  }
}

// =============================================================================
// ASSIGNMENT EXPRESSION
// =============================================================================

/// Represents simple assignment operations in Dart
/// Assigns a value to a target
///
/// Example: `x = 5`, `obj.property = value`, `list[0] = item`
@immutable
class AssignmentExpressionIR extends ExpressionIR {
  /// The target being assigned to
  final ExpressionIR target;

  /// The value being assigned
  final ExpressionIR value;

  const AssignmentExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.target,
    required this.value,
    required super.resultType,
    super.metadata,
  });

  @override
  String toShortString() =>
      '${target.toShortString()} = ${value.toShortString()}';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'target': target.toJson(),
      'value': value.toJson(),
    };
  }
}

/// Represents a single part of a string interpolation
/// Can be either literal text or an expression to be evaluated
@immutable
class StringInterpolationPart {
  /// Whether this part is an expression (true) or literal text (false)
  final bool isExpression;

  /// The expression (if isExpression is true)
  final ExpressionIR? expression;

  /// The literal text (if isExpression is false)
  final String? text;

  const StringInterpolationPart({
    required this.isExpression,
    this.expression,
    this.text,
  }) : assert(
         (isExpression && expression != null && text == null) ||
             (!isExpression && text != null && expression == null),
         'Either expression or text must be provided, but not both',
       );

  /// Factory constructor for text parts
  factory StringInterpolationPart.text(String textContent) {
    return StringInterpolationPart(isExpression: false, text: textContent);
  }

  /// Factory constructor for expression parts
  factory StringInterpolationPart.expression(ExpressionIR expr) {
    return StringInterpolationPart(isExpression: true, expression: expr);
  }

  Map<String, dynamic> toJson() {
    return {
      'isExpression': isExpression,
      'expression': expression?.toJson(),
      'text': text,
    };
  }

  factory StringInterpolationPart.fromJson(Map<String, dynamic> json) {
    final isExpr = json['isExpression'] as bool;
    if (isExpr) {
      return StringInterpolationPart.expression(
        ExpressionIR.fromJson(json['expression'] as Map<String, dynamic>),
      );
    } else {
      return StringInterpolationPart.text(json['text'] as String);
    }
  }
}
