import 'package:meta/meta.dart';
import 'diagnostics/source_location.dart';
import 'ir/ir_node.dart';
import 'ir/type_ir.dart';
import 'ir/expression_ir.dart';
import 'variable_decl.dart';

@immutable
class ParameterDecl extends IRNode {
  /// Parameter name
  final String name;

  /// Parameter type
  TypeIR type;

  /// Optional default value expression
  final ExpressionIR? defaultValue;

  /// Whether parameter is required (cannot be omitted)
  final bool isRequired;

  /// Whether parameter is positional (vs named)
  /// Positional: func(1, 2, 3)
  /// Named: func(name: value)
  final bool isPositional;

  /// Whether parameter is named
  final bool isNamed;

  /// Annotations on parameter (e.g., @required, @deprecated)
  final List<AnnotationIR> annotations;

  ParameterDecl({
    required super.id,
    required super.sourceLocation,
    required this.name,
    required this.type,
    this.defaultValue,
    this.isRequired = false,
    this.isPositional = true,
    this.isNamed = false,
    this.annotations = const [],
    super.metadata,
  }) {
    // Validate that isPositional and isNamed are mutually exclusive
    assert(
      !(isPositional && isNamed),
      'Parameter cannot be both positional and named',
    );
    assert(
      isPositional || isNamed,
      'Parameter must be either positional or named',
    );
  }

  /// Whether this parameter can be omitted in function calls
  bool get isOptional => !isRequired;

  /// Whether parameter has optional positional syntax [param]
  bool get isOptionalPositional => isPositional && !isRequired;

  /// Whether parameter has required named syntax {required param}
  bool get isRequiredNamed => isNamed && isRequired;

  @override
  String toString() {
    final modifiers = [if (isRequired) 'required'].join(' ');

    final bracket = isNamed
        ? '{'
        : isOptionalPositional
        ? '['
        : '';
    final closeBracket = isNamed
        ? '}'
        : isOptionalPositional
        ? ']'
        : '';

    final typeStr = type.displayName();
    final defaultStr = defaultValue != null
        ? ' = ${defaultValue!.toShortString()}'
        : '';

    return '$bracket${modifiers.isNotEmpty ? '$modifiers ' : ''}$typeStr $name$defaultStr$closeBracket';
  }
}

/// Type parameter declaration (e.g., <T extends Comparable>)
///
@immutable
class TypeParameterDecl {
  /// Type parameter name
  final String name;

  /// Upper bound constraint (if any)
  ///
  /// Example: T extends Comparable<T>
  final TypeIR? bound;

  /// Lower bound constraint (rare, Dart doesn't support in declarations)
  final TypeIR? lowerBound;

  /// Whether this has a bound constraint
  bool get hasBound => bound != null || lowerBound != null;

  /// Declaration string
  ///
  /// Examples: "T", "K extends Comparable<K>"
  String get declaration {
    if (bound != null) {
      return '$name extends ${bound!.displayName}';
    }
    if (lowerBound != null) {
      return '$name super ${lowerBound!.displayName}';
    }
    return name;
  }

  const TypeParameterDecl({required this.name, this.bound, this.lowerBound});

  @override
  String toString() => declaration;
}
