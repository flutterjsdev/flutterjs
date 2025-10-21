import '../expression_ir.dart';
import '../ir_node.dart';
import '../type_ir.dart';
import '../../diagnostics/source_location.dart';

/// Represents a parameter in a function, method, or constructor
class ParameterIR extends IRNode {
  final String name;
  final TypeIR type;
  final bool isOptional;
  final bool isNamed;
  final bool isRequired;
  final ExpressionIR? defaultValue;

  ParameterIR({
    required super.id,
    required super.sourceLocation,
    required this.name,
    required this.type,
    this.isOptional = false,
    this.isNamed = false,
    this.isRequired = false,
    this.defaultValue,
    super.metadata,
  });

  /// True if this parameter is positional (not named)
  bool get isPositional => !isNamed;

  /// True if this parameter is variadic (e.g., ...args)
  bool get isVariadic => name.startsWith('...');

  /// True if the type is nullable
  bool get isNullable => type.isNullable;

  /// Formatted parameter signature: "String name" or "int? count"
  String get signature {
    final typeName = type.displayName();
    return '$typeName $name';
  }

  /// Full parameter declaration with modifiers
  String get declaration {
    final sig = signature;
    if (isNamed && isRequired) {
      return 'required $sig';
    }
    if (isOptional && !isNamed) {
      return '[$sig]';
    }
    return sig;
  }

  /// Factory constructor from JSON
  factory ParameterIR.fromJson(Map<String, dynamic> json) {
    return ParameterIR(
      name: json['name'] as String,
      type: TypeIR.fromJson(json['type'] as Map<String, dynamic>),
      isOptional: json['isOptional'] as bool? ?? false,
      isNamed: json['isNamed'] as bool? ?? false,
      isRequired: json['isRequired'] as bool? ?? false,
      defaultValue: json['defaultValue'] != null
          ? ExpressionIR.fromJson(json['defaultValue'] as Map<String, dynamic>)
          : null,
      id: json['id'] as String,
      sourceLocation: SourceLocationIR.fromJson(
        json['sourceLocation'] as Map<String, dynamic>,
      ),
      metadata: json['metadata'] != null
          ? json['metadata'] as Map<String, dynamic>
          : null,
    );
  }

  /// Serialize to JSON
  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'type': type.toJson(),
      'isOptional': isOptional,
      'isNamed': isNamed,
      'isRequired': isRequired,
      'defaultValue': defaultValue?.toJson(),
    };
  }

  @override
  String toString() => declaration;

  /// For testing: compare meaningful content
  @override
  bool contentEquals(IRNode other) {
    if (other is! ParameterIR) return false;

    final defaultValueEqual =
        (defaultValue == null && other.defaultValue == null) ||
        (defaultValue != null &&
            other.defaultValue != null &&
            defaultValue!.contentEquals(other.defaultValue!));

    // Simple map equality check instead of Flutter's mapEquals
    final metadataEqual = _mapsEqual(metadata, other.metadata);

    return name == other.name &&
        type.contentEquals(other.type) &&
        isOptional == other.isOptional &&
        isNamed == other.isNamed &&
        isRequired == other.isRequired &&
        defaultValueEqual &&
        metadataEqual;
  }

  // Helper method instead of Flutter's mapEquals
  bool _mapsEqual(Map<String, dynamic>? a, Map<String, dynamic>? b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    return a.entries.every((e) => e.value == b[e.key]);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParameterIR &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          type == other.type &&
          isOptional == other.isOptional &&
          isNamed == other.isNamed &&
          isRequired == other.isRequired &&
          defaultValue == other.defaultValue;

  @override
  int get hashCode =>
      Object.hash(name, type, isOptional, isNamed, isRequired, defaultValue);
}
