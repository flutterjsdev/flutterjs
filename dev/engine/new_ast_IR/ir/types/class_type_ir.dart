import '../ir_node.dart';
import '../type_ir.dart';

/// Represents class references: Widget, MyCustomClass, etc.
class ClassTypeIR extends TypeIR {
  final String className;
  final String? libraryUri;  // "package:flutter/material.dart"
  final List<TypeIR> typeArguments;  // For generics
  final bool isAbstract;

  ClassTypeIR({
    required super.id,
    required super.name,
    required super.sourceLocation,
    required this.className,
    this.libraryUri,
    this.typeArguments = const [],
    this.isAbstract = false,
    super.isNullable = false,
  });


  bool get isBuiltIn => false;

  bool get isGeneric => typeArguments.isNotEmpty;

  String get fullyQualifiedName => 
    libraryUri != null ? '$libraryUri#$className' : className;

  @override
  String displayName() {
    final typeArgs = isGeneric
        ? '<${typeArguments.map((t) => t.displayName()).join(', ')}>'
        : '';
    final baseName = '$className$typeArgs';
    return isNullable ? '$baseName?' : baseName;
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'className': className,
      'libraryUri': libraryUri,
      'typeArguments': typeArguments.map((t) => t.toJson()).toList(),
      'isAbstract': isAbstract,
    };
  }

  factory ClassTypeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    final typeArgumentsJson = json['typeArguments'] as List<dynamic>? ?? [];
    final typeArguments = typeArgumentsJson
        .cast<Map<String, dynamic>>()
        .map((argJson) => TypeIR.fromJson(argJson))
        .toList();

    return ClassTypeIR(
      id: json['id'] as String,
      name: json['name'] as String,
      sourceLocation: sourceLocation,
      className: json['className'] as String,
      libraryUri: json['libraryUri'] as String?,
      typeArguments: typeArguments,
      isAbstract: json['isAbstract'] as bool? ?? false,
      isNullable: json['isNullable'] as bool? ?? false,
    );
  }

  /// Creates a generic class type with type arguments
  ClassTypeIR withTypeArguments(List<TypeIR> args) {
    return ClassTypeIR(
      id: id,
      name: name,
      sourceLocation: sourceLocation,
      className: className,
      libraryUri: libraryUri,
      typeArguments: args,
      isAbstract: isAbstract,
      isNullable: isNullable,
    );
  }

  /// Creates a nullable version of this class type
  ClassTypeIR toNullable() {
    if (isNullable) return this;
    return ClassTypeIR(
      id: id,
      name: name,
      sourceLocation: sourceLocation,
      className: className,
      libraryUri: libraryUri,
      typeArguments: typeArguments,
      isAbstract: isAbstract,
      isNullable: true,
    );
  }

  /// Creates a non-nullable version of this class type
  ClassTypeIR toNonNullable() {
    if (!isNullable) return this;
    return ClassTypeIR(
      id: id,
      name: name,
      sourceLocation: sourceLocation,
      className: className,
      libraryUri: libraryUri,
      typeArguments: typeArguments,
      isAbstract: isAbstract,
      isNullable: false,
    );
  }


  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClassTypeIR &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          className == other.className &&
          libraryUri == other.libraryUri &&
          isAbstract == other.isAbstract &&
          isNullable == other.isNullable &&
          _listEquals(typeArguments, other.typeArguments);

  @override
  int get hashCode => Object.hash(
    id,
    className,
    libraryUri,
    isAbstract,
    isNullable,
    Object.hashAll(typeArguments),
  );

  static bool _listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}