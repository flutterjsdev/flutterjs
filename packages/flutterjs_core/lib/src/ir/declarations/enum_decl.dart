// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:meta/meta.dart';
import '../core/ir_node.dart';
import '../core/source_location.dart';
import '../types/type_ir.dart';

/// Represents an enum declaration in Dart
///
/// Example:
/// ```dart
/// enum LaunchMode {
///   platformDefault,
///   inAppWebView,
///   externalApplication,
/// }
/// ```
@immutable
class EnumDecl extends IRNode {
  /// The name of the enum
  final String name;

  /// The enum values/members
  final List<EnumValueDecl> values;

  /// Type parameters (for enhanced enums with generics)
  final List<TypeIR> typeParameters;

  /// Mixins (for enhanced enums)
  final List<TypeIR> mixins;

  /// Interfaces (for enhanced enums)
  final List<TypeIR> interfaces;

  /// Constructor parameters (for enhanced enums with custom constructors)
  final List<String> constructorParameters;

  /// Fields (for enhanced enums with additional fields)
  final Map<String, TypeIR> fields;

  /// Methods (for enhanced enums with methods)
  final List<String> methods;

  /// Whether this is an enhanced enum (Dart 2.17+)
  final bool isEnhanced;

  const EnumDecl({
    required super.id,
    required super.sourceLocation,
    required this.name,
    required this.values,
    this.typeParameters = const [],
    this.mixins = const [],
    this.interfaces = const [],
    this.constructorParameters = const [],
    this.fields = const {},
    this.methods = const [],
    this.isEnhanced = false,
    super.metadata,
  });

  @override
  String toShortString() => 'enum $name { ${values.map((v) => v.name).join(', ')} }';

  @override
  Map<String, dynamic> toJson() {
    return {
      'type': 'EnumDecl',
      'id': id,
      'name': name,
      'values': values.map((v) => v.toJson()).toList(),
      'isEnhanced': isEnhanced,
      'typeParameters': typeParameters.map((t) => t.toJson()).toList(),
      'mixins': mixins.map((m) => m.toJson()).toList(),
      'interfaces': interfaces.map((i) => i.toJson()).toList(),
      'fields': fields.map((k, v) => MapEntry(k, v.toJson())),
      'sourceLocation': sourceLocation.toJson(),
      'metadata': metadata,
    };
  }
}

/// Represents a single value/member in an enum
@immutable
class EnumValueDecl extends IRNode {
  /// The name of the enum value
  final String name;

  /// The index/ordinal of this value
  final int index;

  /// Constructor arguments (for enhanced enums)
  final List<String> constructorArguments;

  const EnumValueDecl({
    required super.id,
    required super.sourceLocation,
    required this.name,
    required this.index,
    this.constructorArguments = const [],
    super.metadata,
  });

  @override
  String toShortString() => name;

  @override
  Map<String, dynamic> toJson() {
    return {
      'type': 'EnumValueDecl',
      'id': id,
      'name': name,
      'index': index,
      'constructorArguments': constructorArguments,
      'sourceLocation': sourceLocation.toJson(),
      'metadata': metadata,
    };
  }
}
