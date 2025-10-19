import 'package:meta/meta.dart';
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

  /// Whether parameter is required
  final bool isRequired;

  /// Whether parameter is positional (vs named)
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
  });

  /// Whether this parameter can be omitted in function calls
  bool get isOptional => !isRequired || defaultValue != null;

  @override
  String toString() {
    final modifiers = [
      if (isRequired) 'required',
    ].join(' ');

    final bracket = isNamed ? '{' : isPositional ? '' : '[';
    final closeBracket = isNamed ? '}' : isPositional ? '' : ']';

    return '${modifiers.isNotEmpty ? '$modifiers ' : ''}$bracket${type.displayName()} $name${defaultValue != null ? ' = ${defaultValue!.toShortString()}' : ''}$closeBracket';
  }
}