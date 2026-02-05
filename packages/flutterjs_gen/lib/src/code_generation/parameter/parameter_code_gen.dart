// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// PARAMETER CODE GENERATOR (PURE JAVASCRIPT - NO TYPES)
// ============================================================================
// Generates clean JavaScript without TypeScript type annotations
// ============================================================================

import 'package:flutterjs_core/ast_it.dart';
import '../expression/expression_code_generator.dart';

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for parameter code generation
class ParameterGenConfig {
  /// Whether to include type hints in comments
  final bool useTypeComments;

  /// Indentation string
  final String indent;

  /// Whether to generate JSDoc for parameters
  final bool generateJSDoc;

  const ParameterGenConfig({
    this.useTypeComments = false,
    this.indent = '  ',
    this.generateJSDoc = true,
  });
}

// ============================================================================
// PARAMETER CATEGORY
// ============================================================================

/// Represents different categories of parameters
enum ParameterCategory {
  /// Required positional parameters
  requiredPositional,

  /// Optional positional parameters with defaults
  optionalPositional,

  /// Named parameters (object destructuring)
  named,
}

/// Container for categorized parameters
class CategorizedParameters {
  final List<ParameterDecl> requiredPositional;
  final List<ParameterDecl> optionalPositional;
  final List<ParameterDecl> named;

  CategorizedParameters({
    required this.requiredPositional,
    required this.optionalPositional,
    required this.named,
  });

  /// Get all parameters in order
  List<ParameterDecl> get all => [
    ...requiredPositional,
    ...optionalPositional,
    ...named,
  ];

  /// Check if there are any parameters
  bool get isEmpty =>
      requiredPositional.isEmpty && optionalPositional.isEmpty && named.isEmpty;

  /// Check if there are any parameters
  bool get isNotEmpty => !isEmpty;

  /// Total parameter count
  int get length =>
      requiredPositional.length + optionalPositional.length + named.length;
}

// ============================================================================
// MAIN PARAMETER CODE GENERATOR
// ============================================================================

class ParameterCodeGen {
  final ParameterGenConfig config;
  final ExpressionCodeGen exprGen;

  ParameterCodeGen({ParameterGenConfig? config, ExpressionCodeGen? exprGen})
    : config = config ?? const ParameterGenConfig(),
      exprGen = exprGen ?? ExpressionCodeGen();

  /// ✅ Generate parameter list for pure JavaScript (NO TYPES)
  /// Example output: "key = undefined, title = undefined"
  /// For named: "{ key = undefined, title = undefined } = {}"
  String generate(List<ParameterDecl> parameters) {
    if (parameters.isEmpty) {
      return '';
    }

    final categorized = categorize(parameters);
    return _generateParameterParts(categorized).join(', ');
  }

  /// Generate parameters with inline type comments (optional)
  /// Example: "key /* any */, title = undefined /* any */"
  String generateWithTypeComments(List<ParameterDecl> parameters) {
    if (parameters.isEmpty) {
      return '';
    }

    final parts = <String>[];

    for (final param in parameters) {
      String part = param.name;

      // Add default value if present
      if (param.defaultValue != null) {
        final defaultVal = exprGen.generate(
          param.defaultValue!,
          parenthesize: false,
        );
        part += ' = $defaultVal';
      }

      // Add type comment (optional)
      if (config.useTypeComments && param.type != null) {
        final typeStr = param.type.displayName();
        part += ' /* $typeStr */';
      }

      parts.add(part);
    }

    return parts.join(', ');
  }

  /// Categorize parameters by type
  CategorizedParameters categorize(List<ParameterDecl> parameters) {
    final requiredPositional = parameters
        .where((p) => p.isRequired && !p.isNamed && p.isPositional)
        .toList();

    final optionalPositional = parameters
        .where((p) => !p.isRequired && !p.isNamed && p.isPositional)
        .toList();

    final named = parameters.where((p) => p.isNamed).toList();

    return CategorizedParameters(
      requiredPositional: requiredPositional,
      optionalPositional: optionalPositional,
      named: named,
    );
  }

  /// Generate JSDoc parameter documentation
  /// Example: " * @param {string} name\n * @param {number} [age=25]"
  String generateJSDoc(List<ParameterDecl> parameters) {
    if (parameters.isEmpty || !config.generateJSDoc) {
      return '';
    }

    final buffer = StringBuffer();

    for (final param in parameters) {
      final typeStr = _typeToJSDocType(param.type);
      final nullable = param.type?.isNullable ?? false;
      final fullType = nullable ? '$typeStr|null' : typeStr;

      // Optional parameters shown with square brackets
      if (!param.isRequired) {
        buffer.writeln(' * @param {$fullType} [${param.name}]');
      } else {
        buffer.writeln(' * @param {$fullType} ${param.name}');
      }
    }

    return buffer.toString().trimRight();
  }

  /// Generate parameter validation code
  /// Useful for constructor or method entry points
  String generateValidation(List<ParameterDecl> parameters) {
    final buffer = StringBuffer();

    for (final param in parameters) {
      if (param.isRequired && !(param.type.isNullable)) {
        buffer.writeln(
          'if (${param.name} == null) throw new Error("${param.name} is required");',
        );
      }
    }

    return buffer.toString().trimRight();
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  /// ✅ Generate parameter parts (pure JavaScript, no types)
  List<String> _generateParameterParts(CategorizedParameters categorized) {
    final parts = <String>[];

    // ✅ Required positional parameters (just names)
    parts.addAll(categorized.requiredPositional.map((p) => p.name));

    // ✅ Optional positional parameters with defaults
    for (final param in categorized.optionalPositional) {
      final def = _getDefaultValue(param);
      parts.add('${param.name} = $def');
    }

    // ✅ Named parameters → object destructuring
    if (categorized.named.isNotEmpty) {
      final namedParts = <String>[];

      for (final param in categorized.named) {
        // Only optional named params get defaults
        // Required named params don't have defaults
        if (param.isRequired) {
          namedParts.add(param.name);
        } else {
          final def = _getDefaultValue(param);
          namedParts.add('${param.name} = $def');
        }
      }

      parts.add('{ ${namedParts.join(", ")} } = {}');
    }

    return parts;
  }

  String _getDefaultValue(ParameterDecl param) {
    if (param.defaultValue != null) {
      return exprGen.generate(param.defaultValue!, parenthesize: false);
    }
    return 'undefined';
  }

  String _typeToJSDocType(TypeIR? type) {
    if (type == null) return 'any';

    final typeName = type.displayName();

    switch (typeName) {
      case 'String':
        return 'string';
      case 'int':
      case 'double':
      case 'num':
        return 'number';
      case 'bool':
        return 'boolean';
      case 'void':
      case 'Null':
        return 'void';
      case 'List':
      case 'Iterable':
        return 'Array';
      case 'Map':
        return 'Object';
      case 'Set':
        return 'Set';
      case 'Future':
      case 'Promise':
        return 'Promise';
      case 'Stream':
        return 'AsyncIterable';
      case 'dynamic':
        return 'any';
      case 'Widget':
        return 'Widget';
      case 'BuildContext':
        return 'BuildContext';
      default:
        return typeName;
    }
  }
}
