import '../../diagnostics/source_location.dart';
import '../type_ir.dart';
/// =============================================================================
///  GENERIC TYPE REPRESENTATION
///  List<T>, Map<K,V>, FutureOr<T>, etc.
/// =============================================================================
///
/// PURPOSE
/// -------
/// Represents instantiated generic types with concrete type arguments
/// and optional type parameters (for generic type aliases or declarations).
///
/// Used in:
/// • Type inference
/// • Generic method resolution
/// • Bounds checking
///
/// EXAMPLE
/// -------
/// ```dart
/// GenericTypeIR(
///   name: 'List',
///   typeArguments: [stringType],
///   // → List<String>
/// )
/// ```
///
/// RELATED FILES
/// -------------
/// • type_ir.dart
/// • class_type_ir.dart
/// • function_type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
class GenericTypeIR extends TypeIR {
  final List<TypeIR> typeArguments;
  final List<TypeParameterIR> typeParameters;

  GenericTypeIR({
    required super.id,
    required super.name,
    super.isNullable = false,
    required this.typeArguments,
    this.typeParameters = const [],
    required super.sourceLocation,
  });

  @override
  bool get isBuiltIn => false;

  @override
  bool get isGeneric => true;
  factory GenericTypeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return GenericTypeIR(
      id: json['id'] as String,
      name: json['name'] as String,
      isNullable: json['isNullable'] as bool? ?? false,
      typeArguments: (json['typeArguments'] as List<dynamic>)
          .map((e) => TypeIR.fromJson(e as Map<String, dynamic>))
          .toList(),
      typeParameters:
          (json['typeParameters'] as List<dynamic>?)
              ?.map((e) => TypeParameterIR.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      sourceLocation: sourceLocation,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GenericTypeIR &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          isNullable == other.isNullable &&
          _listEquals(typeArguments, other.typeArguments) &&
          _listEquals(typeParameters, other.typeParameters);

  @override
  int get hashCode => Object.hash(
    id,
    name,
    isNullable,
    Object.hashAll(typeArguments),
    Object.hashAll(typeParameters),
  );

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'typeArguments': typeArguments.map((t) => t.toJson()).toList(),
      'typeParameters': typeParameters.map((tp) => tp.toJson()).toList(),
    };
  }

  /// Helper function to compare lists deeply.
  static bool _listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
