
import '../type_ir.dart';
import '../../diagnostics/source_location.dart';

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

  bool get isNumeric => kind == PrimitiveKind.int || kind == PrimitiveKind.double;

  bool get isBoolean => kind == PrimitiveKind.bool;

  bool get isString => kind == PrimitiveKind.string;

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'kind': kind.toString(),
    };
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
  }) =>
      PrimitiveTypeIR(
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
  }) =>
      PrimitiveTypeIR(
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
  }) =>
      PrimitiveTypeIR(
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
  }) =>
      PrimitiveTypeIR(
        id: id,
        name: 'String',
        sourceLocation: sourceLocation,
        kind: PrimitiveKind.string,
        isNullable: isNullable,
      );

  factory PrimitiveTypeIR.void_({
    required String id,
    required SourceLocationIR sourceLocation,
  }) =>
      PrimitiveTypeIR(
        id: id,
        name: 'void',
        sourceLocation: sourceLocation,
        kind: PrimitiveKind.void_,
        isNullable: false,
      );

  factory PrimitiveTypeIR.dynamic_({
    required String id,
    required SourceLocationIR sourceLocation,
  }) =>
      PrimitiveTypeIR(
        id: id,
        name: 'dynamic',
        sourceLocation: sourceLocation,
        kind: PrimitiveKind.dynamic_,
        isNullable: false,
      );

  factory PrimitiveTypeIR.never({
    required String id,
    required SourceLocationIR sourceLocation,
  }) =>
      PrimitiveTypeIR(
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
