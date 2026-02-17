// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:flutterjs_core/flutterjs_core.dart';

/// Generates JavaScript code for Dart enum declarations
///
/// Converts Dart enums to JavaScript objects with string values:
/// ```dart
/// enum LaunchMode { platformDefault, inAppWebView }
/// ```
/// becomes:
/// ```javascript
/// const LaunchMode = {
///   platformDefault: 'platformDefault',
///   inAppWebView: 'inAppWebView',
/// };
/// LaunchMode.values = ['platformDefault', 'inAppWebView'];
/// ```
class EnumCodeGen {
  /// Generate JavaScript enum object from EnumDecl IR
  String generateEnum(EnumDecl enumDecl) {
    final buffer = StringBuffer();

    // Generate const enum object
    buffer.writeln('const ${enumDecl.name} = {');

    for (final value in enumDecl.values) {
      // Use string values for simple enums
      // This allows: mode === LaunchMode.platformDefault
      buffer.writeln("  ${value.name}: '${value.name}',");
    }

    buffer.writeln('};');
    buffer.writeln();

    // Generate enum.values array for iteration
    buffer.write('${enumDecl.name}.values = [');
    final valueNames = enumDecl.values.map((v) => "'${v.name}'").join(', ');
    buffer.write(valueNames);
    buffer.writeln('];');
    buffer.writeln();

    // Generate enhanced enum features (if applicable)
    if (enumDecl.isEnhanced) {
      buffer.write(_generateEnhancedEnumFeatures(enumDecl));
    }

    // Add comment for debugging
    buffer.writeln('// Enum ${enumDecl.name} with ${enumDecl.values.length} values');

    return buffer.toString();
  }

  /// Generate enhanced enum features (Dart 2.17+)
  ///
  /// For enums with fields and methods:
  /// ```dart
  /// enum Planet {
  ///   earth(mass: 5.97),
  ///   mars(mass: 0.642);
  ///
  ///   const Planet({required this.mass});
  ///   final double mass;
  /// }
  /// ```
  String _generateEnhancedEnumFeatures(EnumDecl enumDecl) {
    final buffer = StringBuffer();

    // TODO: Future enhancement - generate enum instance objects with fields
    // For now, enhanced enums fall back to simple string enums

    if (enumDecl.fields.isNotEmpty) {
      buffer.writeln('// Enhanced enum with fields: ${enumDecl.fields.keys.join(', ')}');
    }

    if (enumDecl.methods.isNotEmpty) {
      buffer.writeln('// Enhanced enum with methods: ${enumDecl.methods.join(', ')}');
    }

    return buffer.toString();
  }

  /// Generate enum member access expression
  ///
  /// Converts `LaunchMode.platformDefault` to the JavaScript equivalent
  String generateEnumMemberAccess(String enumName, String memberName) {
    return '$enumName.$memberName';
  }

  /// Generate enum equality check
  ///
  /// Converts `mode == LaunchMode.platformDefault` to JavaScript
  String generateEnumEquality(String variable, String enumName, String memberName) {
    return "$variable === $enumName.$memberName";
  }
}
