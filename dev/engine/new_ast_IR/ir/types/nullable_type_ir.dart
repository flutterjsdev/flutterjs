import '../ir_node.dart';
import '../type_ir.dart';

/// Wrapper for nullable types, preventing double-wrapping
class NullableTypeIR extends TypeIR {
  final TypeIR innerType;

  NullableTypeIR({
    required super.id,
    required super.name,
    required super.sourceLocation,
    required this.innerType,
  }) : super(isNullable: true) {
    // Validate: innerType should not already be nullable to prevent double-wrapping
    assert(
      !innerType.isNullable,
      'Cannot wrap an already nullable type in NullableTypeIR. '
      'Use the inner type directly or call .toNullable() instead.',
    );
  }

  bool get isBuiltIn => innerType.isBuiltIn;

  bool get isGeneric => (innerType as dynamic).isGeneric == true;

  /// Unwraps and returns the inner non-nullable type
  TypeIR unwrap() => innerType;

  /// Factory constructor that flattens nested nullable types
  factory NullableTypeIR.flatten({
    required String id,
    required String name,
    required SourceLocationIR sourceLocation,
    required TypeIR type,
  }) {
    // If already nullable, unwrap until we get a non-nullable type
    TypeIR unwrapped = type;
    while (unwrapped is NullableTypeIR) {
      unwrapped = unwrapped.innerType;
    }

    return NullableTypeIR(
      id: id,
      name: name,
      sourceLocation: sourceLocation,
      innerType: unwrapped,
    );
  }

  @override
  String displayName() => '${innerType.displayName()}?';

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'innerType': innerType.toJson(),
    };
  }

  factory NullableTypeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    final innerTypeJson = json['innerType'] as Map<String, dynamic>;
    final innerType = TypeIR.fromJson(innerTypeJson);

    return NullableTypeIR.flatten(
      id: json['id'] as String,
      name: json['name'] as String,
      sourceLocation: sourceLocation,
      type: innerType,
    );
  }

  /// Creates a new nullable type with a different inner type
  NullableTypeIR withInnerType(TypeIR newInnerType) {
    return NullableTypeIR(
      id: id,
      name: name,
      sourceLocation: sourceLocation,
      innerType: newInnerType,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is NullableTypeIR &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          innerType == other.innerType;

  @override
  int get hashCode => Object.hash(id, innerType);
}