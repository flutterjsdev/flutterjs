// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../core/source_location.dart';
import 'type_ir.dart';

/// =============================================================================
///  NULLABLE TYPE WRAPPER
///  Safe wrapper for nullable types in the custom Dart IR
/// =============================================================================
///
/// PURPOSE
/// -------
/// Explicitly represents a nullable type (T?) while preventing dangerous
/// double-wrapping (T??). Used throughout the type system to maintain
/// correctness during type inference, serialization, and analysis.
///
/// KEY FEATURES
/// ------------
/// • Prevents double-nullable wrapping via assert + flatten()
/// • Safe unwrapping with unwrap()
/// • Factory .flatten() removes nested nullability
/// • Full JSON serialization support
/// • Immutable + proper equality/hashCode
///
/// USAGE
/// -----
/// ```dart
/// final stringNullable = NullableTypeIR.flatten(
///   id: 'type_str_nullable',
///   name: 'String',
///   sourceLocation: loc,
///   type: someStringType, // even if already nullable
/// );
/// print(stringNullable.displayName()); // "String?"
/// ```
///
/// DESIGN NOTES
/// ------------
/// This is the canonical way to represent nullability in the IR.
/// Never create T? manually — always go through NullableTypeIR or .toNullable().
///
/// RELATED FILES
/// -------------
/// • type_ir.dart           → Base TypeIR
/// • class_type_ir.dart     → Uses toNullable()/toNonNullable()
/// • primitive_type_ir.dart → Primitives are non-nullable by default
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
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
    return {...super.toJson(), 'innerType': innerType.toJson()};
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
