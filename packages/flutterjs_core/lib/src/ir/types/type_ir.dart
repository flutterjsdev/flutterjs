// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:meta/meta.dart';
import '../core/source_location.dart';
import '../core/ir_node.dart';
import 'function_type_ir.dart';
import 'generic_type_ir.dart';

abstract class TypeIR extends IRNode {
  final String name;
  final bool isNullable;

  const TypeIR({
    required super.id,
    required this.name,
    this.isNullable = false,
    required super.sourceLocation,
  });

  /// Human-readable type representation (e.g., "List<String>?", "int")
  /// Override in subclasses for custom formatting
  String displayName() {
    return isNullable ? '$name?' : name;
  }

  bool get isBuiltIn => false;
  bool get isGeneric => false;

  /// Get the base type without nullability wrapper
  TypeIR unwrapNullable() {
    // Default implementation - override in wrapper types like NullableTypeIR
    return this;
  }

  /// Check if this type can be assigned to another type
  bool isAssignableTo(TypeIR other) {
    // Default: same type is always assignable
    if (name == other.name && isNullable == other.isNullable) return true;

    // Null safety: non-nullable can't be assigned to nullable in strict mode
    if (isNullable && !other.isNullable) return false;

    // dynamic accepts anything
    if (other.name == 'dynamic') return true;

    // Override in subclasses for proper type hierarchy checking
    return false;
  }

  /// Check if this type is a subtype of another type
  bool isSubtypeOf(TypeIR other) => isAssignableTo(other);

  @override
  bool contentEquals(IRNode other) {
    if (other is! TypeIR) return false;
    return name == other.name && isNullable == other.isNullable;
  }

  @override
  String toShortString() => displayName();

  /// Create a Widget type (commonly used in build methods)
  factory TypeIR.widget() {
    return SimpleTypeIR(
      id: 'widget_type',
      sourceLocation: SourceLocationIR(
        file: '',
        line: 0,
        column: 0,
        offset: 0,
        length: 0,
        id: '',
      ),
      name: 'Widget',
      isNullable: false,
    );
  }

  /// Create a Future type wrapping another type
  factory TypeIR.future(TypeIR innerType) {
    return GenericTypeIR(
      id: 'future_${innerType.id}',
      sourceLocation: innerType.sourceLocation,
      name: 'Future',
      typeArguments: [innerType],
      isNullable: false,
    );
  }

  /// Create a Stream type wrapping another type
  factory TypeIR.stream(TypeIR innerType) {
    return GenericTypeIR(
      id: 'stream_${innerType.id}',
      sourceLocation: innerType.sourceLocation,
      name: 'Stream',
      typeArguments: [innerType],
      isNullable: false,
    );
  }

  /// Create a List type wrapping an element type
  factory TypeIR.list(TypeIR elementType) {
    return GenericTypeIR(
      id: 'list_${elementType.id}',
      sourceLocation: elementType.sourceLocation,
      name: 'List',
      typeArguments: [elementType],
      isNullable: false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'isNullable': isNullable,
      'type': runtimeType.toString(),
      'sourceLocation': sourceLocation.toJson(),
    };
  }
}

/// Represents a simple class type (non-generic)
@immutable
class SimpleTypeIR extends TypeIR {
  final List<TypeIR> typeArguments;

  const SimpleTypeIR({
    required super.id,
    required super.name,
    super.isNullable = false,
    this.typeArguments = const [],
    required super.sourceLocation,
  });

  @override
  String displayName() {
    final baseName = name;
    final withArgs = typeArguments.isNotEmpty
        ? '$baseName<${typeArguments.map((t) => t.displayName()).join(', ')}>'
        : baseName;
    return isNullable ? '$withArgs?' : withArgs;
  }
  // @override
  // bool get isBuiltIn => false;

  @override
  bool get isBuiltIn {
    const builtins = {
      'int',
      'double',
      'bool',
      'String',
      'dynamic',
      'void',
      'null',
    };
    return builtins.contains(name.toLowerCase());
  }

  @override
  bool get isGeneric => typeArguments.isNotEmpty;

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'typeArguments': typeArguments.map((t) => t.toJson()).toList(),
    };
  }
}

class TypeParameterIR {
  final String name;
  final TypeIR? bound;

  TypeParameterIR({required this.name, this.bound});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TypeParameterIR &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          bound == other.bound;

  Map<String, dynamic> toJson() {
    return {'name': name, 'bound': bound?.toJson()};
  }
}

class DynamicTypeIR extends TypeIR {
  DynamicTypeIR({required super.id, required super.sourceLocation})
    : super(name: 'dynamic', isNullable: true);

  @override
  bool get isBuiltIn => true;

  @override
  bool get isGeneric => false;

  @override
  bool isAssignableTo(TypeIR other) => true; // dynamic is assignable to everything
  @override
  String displayName() => name;
}

class VoidTypeIR extends TypeIR {
  VoidTypeIR({required super.id, required super.sourceLocation})
    : super(name: 'void', isNullable: false);

  @override
  bool get isBuiltIn => true;

  @override
  bool get isGeneric => false;

  @override
  String displayName() => name;
}

class NeverTypeIR extends TypeIR {
  NeverTypeIR({required super.id, required super.sourceLocation})
    : super(name: 'Never', isNullable: false);
  @override
  bool get isBuiltIn => true;

  @override
  bool get isGeneric => false;

  @override
  String displayName() => name;
}
