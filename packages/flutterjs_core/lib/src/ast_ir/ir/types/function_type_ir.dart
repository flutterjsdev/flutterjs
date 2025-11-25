import '../type_ir.dart';
import 'parameter_ir.dart';
import '../../diagnostics/source_location.dart';

/// =============================================================================
///  FUNCTION TYPE REPRESENTATION
///  Full Dart function signature modeling
/// =============================================================================
///
/// PURPOSE
/// -------
/// Models function, method, and closure types with complete parameter and
/// generic information — critical for type checking, refactoring, and code gen.
///
/// Supports:
/// • Positional, optional, named parameters
/// • Required named parameters
/// • Generic functions (T Function<U>(U))
/// • Nullability on the function type itself
///
/// USAGE
/// -----
/// ```dart
/// final callbackType = FunctionTypeIR(
///   id: 'type_callback',
///   name: 'void Function(String)',
///   returnType: PrimitiveTypeIR.void_(...),
///   parameters: [paramString],
///   sourceLocation: loc,
/// );
/// ```
///
/// RICH DISPLAY
/// ------------
/// ```
/// (String name, [int? age], {required bool active}) → void
/// <T>(T value) → T?
/// ```
///
/// RELATED FILES
/// -------------
/// • parameter_ir.dart
/// • type_ir.dart
/// • primitive_type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
class FunctionTypeIR extends TypeIR {
  final TypeIR returnType;
  final List<ParameterIR> parameters;
  final List<TypeParameterIR> typeParameters;

  FunctionTypeIR({
    required super.id,
    required super.name,
    super.isNullable = false,
    required this.returnType,
    required this.parameters,
    this.typeParameters = const [],
    required super.sourceLocation,
  });

  bool get isBuiltIn => false;

  bool get isGeneric => typeParameters.isNotEmpty;

  bool get hasParameters => parameters.isNotEmpty;

  bool get hasOptionalParameters =>
      parameters.any((p) => p.isOptional || p.isNamed);

  bool get hasPositionalParameters => parameters.any((p) => !p.isNamed);

  bool get hasNamedParameters => parameters.any((p) => p.isNamed);

  List<ParameterIR> get requiredPositionalParameters =>
      parameters.where((p) => !p.isOptional && !p.isNamed).toList();

  List<ParameterIR> get optionalPositionalParameters =>
      parameters.where((p) => p.isOptional && !p.isNamed).toList();

  List<ParameterIR> get namedParameters =>
      parameters.where((p) => p.isNamed).toList();

  @override
  String displayName() {
    final typeParams = isGeneric
        ? '<${typeParameters.map((tp) => tp.name).join(', ')}>'
        : '';

    final params = _formatParameters();
    final sig = '$typeParams($params) → ${returnType.name}';

    return isNullable ? '$sig?' : sig;
  }

  String _formatParameters() {
    if (parameters.isEmpty) return '';

    final positional = <String>[];
    final optional = <String>[];
    final named = <String>[];

    for (final param in parameters) {
      final paramStr =
          '${param.type.name}${param.isNullable ? '?' : ''} ${param.name}';

      if (param.isNamed) {
        named.add(paramStr);
      } else if (param.isOptional) {
        optional.add(paramStr);
      } else {
        positional.add(paramStr);
      }
    }

    final parts = <String>[];
    if (positional.isNotEmpty) parts.add(positional.join(', '));
    if (optional.isNotEmpty) parts.add('[${optional.join(', ')}]');
    if (named.isNotEmpty) parts.add('{${named.join(', ')}}');

    return parts.join(', ');
  }

  factory FunctionTypeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return FunctionTypeIR(
      id: json['id'] as String,
      name: json['name'] as String,
      isNullable: json['isNullable'] as bool? ?? false,
      returnType: TypeIR.fromJson(json['returnType'] as Map<String, dynamic>),
      parameters: (json['parameters'] as List<dynamic>)
          .map((e) => ParameterIR.fromJson(e as Map<String, dynamic>))
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
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'returnType': returnType.toJson(),
      'parameters': parameters.map((p) => p.toJson()).toList(),
      'typeParameters': typeParameters.map((tp) => tp.toJson()).toList(),
    };
  }

  /// Creates a function type with different return type
  FunctionTypeIR withReturnType(TypeIR newReturnType) {
    return FunctionTypeIR(
      id: id,
      name: name,
      isNullable: isNullable,
      returnType: newReturnType,
      parameters: parameters,
      typeParameters: typeParameters,
      sourceLocation: sourceLocation,
    );
  }

  /// Creates a function type with additional parameters
  FunctionTypeIR withParameters(List<ParameterIR> newParameters) {
    return FunctionTypeIR(
      id: id,
      name: name,
      isNullable: isNullable,
      returnType: returnType,
      parameters: newParameters,
      typeParameters: typeParameters,
      sourceLocation: sourceLocation,
    );
  }

  /// Creates a function type with type parameters (making it generic)
  FunctionTypeIR withTypeParameters(List<TypeParameterIR> newTypeParameters) {
    return FunctionTypeIR(
      id: id,
      name: name,
      isNullable: isNullable,
      returnType: returnType,
      parameters: parameters,
      typeParameters: newTypeParameters,
      sourceLocation: sourceLocation,
    );
  }

  /// Creates a nullable version of this function type
  FunctionTypeIR toNullable() {
    if (isNullable) return this;
    return FunctionTypeIR(
      id: id,
      name: name,
      isNullable: true,
      returnType: returnType,
      parameters: parameters,
      typeParameters: typeParameters,
      sourceLocation: sourceLocation,
    );
  }

  /// Creates a non-nullable version of this function type
  FunctionTypeIR toNonNullable() {
    if (!isNullable) return this;
    return FunctionTypeIR(
      id: id,
      name: name,
      isNullable: false,
      returnType: returnType,
      parameters: parameters,
      typeParameters: typeParameters,
      sourceLocation: sourceLocation,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FunctionTypeIR &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          returnType == other.returnType &&
          isNullable == other.isNullable &&
          _listEquals(parameters, other.parameters) &&
          _listEquals(typeParameters, other.typeParameters);

  @override
  int get hashCode => Object.hash(
    id,
    returnType,
    isNullable,
    Object.hashAll(parameters),
    Object.hashAll(typeParameters),
  );

  static bool _listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
