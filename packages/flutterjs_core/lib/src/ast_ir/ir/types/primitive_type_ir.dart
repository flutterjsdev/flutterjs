import '../type_ir.dart';
import '../../diagnostics/source_location.dart';

/// =============================================================================
///  PRIMITIVE & BUILT-IN TYPE REPRESENTATIONS
///  int, double, bool, String, void, dynamic, Never
/// =============================================================================
///
/// PURPOSE
/// -------
/// Canonical, fast representations of Dart’s built-in types with proper
/// semantics, nullability, and factory constructors.
///
/// Used everywhere performance and correctness matter.
///
/// FEATURES
/// --------
/// • Enum-based kind (PrimitiveKind)
/// • Dedicated factory methods: .int(), .string(), .void_(), etc.
/// • Proper isBuiltIn = true
/// • Optimized for frequent use
/// • Full serialization
///
/// BEST PRACTICE
/// -------------
/// Always use the factories:
/// ```dart
/// PrimitiveTypeIR.string(id: 'str', sourceLocation: loc, isNullable: true)
/// ```
/// Never: new PrimitiveTypeIR(name: 'String', ...)
///
/// RELATED FILES
/// -------------
/// • type_ir.dart
/// • nullable_type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
class PrimitiveTypeIR extends TypeIR {
  final PrimitiveKind kind;

  PrimitiveTypeIR({
    required super.id,
    required super.name,
    required super.sourceLocation,
    required this.kind,
    super.isNullable = false,
  });

  @override
  bool get isBuiltIn => true;

  @override
  bool get isGeneric => false;

  @override
  String displayName() {
    return isNullable ? '$name?' : name;
  }

  bool get isVoid => kind == PrimitiveKind.void_;

  bool get isDynamic => kind == PrimitiveKind.dynamic_;

  bool get isNever => kind == PrimitiveKind.never;

  bool get isNumeric =>
      kind == PrimitiveKind.int || kind == PrimitiveKind.double;

  bool get isBoolean => kind == PrimitiveKind.bool;

  bool get isString => kind == PrimitiveKind.string;

  @override
  Map<String, dynamic> toJson() {
    return {...super.toJson(), 'kind': kind.toString()};
  }

  factory PrimitiveTypeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    final kindString = json['kind'] as String? ?? '';
    final kind = PrimitiveKind.values.firstWhere(
      (e) => e.toString() == kindString,
      orElse: () => PrimitiveKind.dynamic_,
    );

    return PrimitiveTypeIR(
      id: json['id'] as String,
      name: json['name'] as String,
      sourceLocation: sourceLocation,
      kind: kind,
      isNullable: json['isNullable'] as bool? ?? false,
    );
  }

  // Factory constructors for common primitives
  factory PrimitiveTypeIR.int({
    required String id,
    required SourceLocationIR sourceLocation,
    bool isNullable = false,
  }) => PrimitiveTypeIR(
    id: id,
    name: 'int',
    sourceLocation: sourceLocation,
    kind: PrimitiveKind.int,
    isNullable: isNullable,
  );

  factory PrimitiveTypeIR.double({
    required String id,
    required SourceLocationIR sourceLocation,
    bool isNullable = false,
  }) => PrimitiveTypeIR(
    id: id,
    name: 'double',
    sourceLocation: sourceLocation,
    kind: PrimitiveKind.double,
    isNullable: isNullable,
  );

  factory PrimitiveTypeIR.bool({
    required String id,
    required SourceLocationIR sourceLocation,
    bool isNullable = false,
  }) => PrimitiveTypeIR(
    id: id,
    name: 'bool',
    sourceLocation: sourceLocation,
    kind: PrimitiveKind.bool,
    isNullable: isNullable,
  );

  factory PrimitiveTypeIR.string({
    required String id,
    required SourceLocationIR sourceLocation,
    bool isNullable = false,
  }) => PrimitiveTypeIR(
    id: id,
    name: 'String',
    sourceLocation: sourceLocation,
    kind: PrimitiveKind.string,
    isNullable: isNullable,
  );

  factory PrimitiveTypeIR.void_({
    required String id,
    required SourceLocationIR sourceLocation,
  }) => PrimitiveTypeIR(
    id: id,
    name: 'void',
    sourceLocation: sourceLocation,
    kind: PrimitiveKind.void_,
    isNullable: false,
  );

  factory PrimitiveTypeIR.dynamic_({
    required String id,
    required SourceLocationIR sourceLocation,
  }) => PrimitiveTypeIR(
    id: id,
    name: 'dynamic',
    sourceLocation: sourceLocation,
    kind: PrimitiveKind.dynamic_,
    isNullable: false,
  );

  factory PrimitiveTypeIR.never({
    required String id,
    required SourceLocationIR sourceLocation,
  }) => PrimitiveTypeIR(
    id: id,
    name: 'Never',
    sourceLocation: sourceLocation,
    kind: PrimitiveKind.never,
    isNullable: false,
  );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PrimitiveTypeIR &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          kind == other.kind &&
          isNullable == other.isNullable;

  @override
  int get hashCode => Object.hash(id, kind, isNullable);
}

enum PrimitiveKind { int, double, bool, string, void_, dynamic_, never }
