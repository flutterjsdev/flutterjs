// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/// <---------------------------------------------------------------------------->
/// ir_id_generator.dart
/// ----------------------------------------------------------------------------
///
/// Robust ID generation for IR nodes, ensuring uniqueness and determinism.
///
/// [IRIdGenerator] produces readable, collision-free IDs with strategies:
/// • Counter-based: Fast, session-unique
/// • Contextual: Nested (e.g., class.method)
/// • Deterministic: Hash-based for caching
/// • Simple: Temporary nodes
///
/// Includes:
/// • File hashing for cross-file uniqueness
/// • Name sanitization
/// • Reset for multi-file analysis
///
/// Recommendations:
/// • Use in [DartFileBuilder] for declaration passes
/// • Format spec: {type}_{context}_{name}_{counter}
///
/// Vital for:
/// • Node referencing in graphs
/// • Cache keys
/// • Debug logging
/// <---------------------------------------------------------------------------->
library;

import 'dart:convert';
import 'package:crypto/crypto.dart';

import '../declarations/dart_file_builder.dart';

/// ID Generation Strategy for IR Nodes
///
/// Requirements:
/// 1. **Uniqueness**: No two nodes should have the same ID
/// 2. **Determinism**: Same input → same ID (for caching/comparison)
/// 3. **Readability**: IDs should be debuggable
/// 4. **Collision-free**: Even across multiple files
/// 5. **Short enough**: For binary serialization efficiency

class IRIdGenerator {
  // Counter for ensuring uniqueness within a single file analysis session
  int counter = 0;

  // File path context (for cross-file uniqueness)
  final String? filePath;

  // Optional: project root for relative paths
  final String? projectRoot;

  IRIdGenerator({this.filePath, this.projectRoot});

  /// Generate a unique, deterministic ID
  ///
  /// Format: `{type}_{contextHash}_{name}_{counter}`
  ///
  /// Examples:
  /// - "class_a3f2_MyWidget_1"
  /// - "method_a3f2_MyWidget.build_2"
  /// - "field_a3f2_MyWidget._counter_3"
  /// - "param_a3f2_callback_4"
  String generateId(String type, [String? name]) {
    counter++;

    // Get short file hash for context
    final contextHash = _getFileContextHash();

    // Sanitize name (remove special characters)
    final safeName = name != null ? _sanitizeName(name) : '';

    // Build ID
    final parts = <String>[
      type,
      contextHash,
      if (safeName.isNotEmpty) safeName,
      counter.toString(),
    ];

    return parts.join('_');
  }

  /// Generate ID with full context (for nested declarations)
  ///
  /// Example: class MyWidget { int counter; }
  /// - Class: "class_a3f2_MyWidget_1"
  /// - Field: "field_a3f2_MyWidget.counter_2"
  String generateContextualId(
    String type,
    String name, {
    String? parentContext,
  }) {
    counter++;

    final contextHash = _getFileContextHash();
    final fullName = parentContext != null ? '$parentContext.$name' : name;
    final safeName = _sanitizeName(fullName);

    return '${type}_${contextHash}_${safeName}_$counter';
  }

  /// Generate deterministic ID (same input always produces same ID)
  ///
  /// Use this when you need stable IDs across multiple analysis runs
  /// for caching or incremental compilation.
  String generateDeterministicId(String type, String fullyQualifiedName) {
    // Use hash of type + FQN + file path
    final input = '$type:$fullyQualifiedName:${filePath ?? ""}';
    final hash = _shortHash(input);

    return '${type}_${hash}';
  }

  /// Generate simple incremental ID
  ///
  /// Simplest form - just type and counter.
  /// Use for temporary nodes or when context doesn't matter.
  String generateSimpleId(String type) {
    counter++;
    return '${type}_$counter';
  }

  /// Reset counter (call between file analyses)
  void reset() {
    counter = 0;
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /// Get short hash of file path for context
  String _getFileContextHash() {
    if (filePath == null) return 'global';

    // Use relative path if project root is available
    String pathToHash = filePath!;
    if (projectRoot != null && filePath!.startsWith(projectRoot!)) {
      pathToHash = filePath!.substring(projectRoot!.length);
    }

    return _shortHash(pathToHash);
  }

  /// Create short hash (first 4 chars of MD5)
  String _shortHash(String input) {
    final bytes = utf8.encode(input);
    final digest = md5.convert(bytes);
    return digest.toString().substring(0, 4);
  }

  /// Sanitize name for use in ID
  String _sanitizeName(String name) {
    // Remove/replace special characters
    return name
        .replaceAll(RegExp(r'[<>{}()\[\],\s]'), '')
        .replaceAll('?', 'nullable')
        .replaceAll('!', 'nonnull');
  }
}

// =============================================================================
// BUILDER INTEGRATION
// =============================================================================

/// Extension on DartFileBuilder for easy ID generation
extension BuilderIdGeneration on DartFileBuilder {
  /// Recommended: Use this method in your builder
  String generateId(String type, [String? name]) {
    // If builder has an ID generator instance, use it
    if (idGenerator.filePath?.isNotEmpty ?? false) {
      return idGenerator.generateId(type, name);
    }

    // Fallback: simple counter-based
    return '${type}_${name ?? ""}_${_nextCounter()}';
  }

  int _nextCounter() {
    idGenerator.counter++;
    return idGenerator.counter;
  }

  // Add these fields to DartFileBuilder:
  // IRIdGenerator? _idGenerator;
  // int _counter = 0;
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

void examples() {
  // Example 1: Basic usage in visitor
  final generator = IRIdGenerator(
    filePath: '/Users/dev/my_app/lib/main.dart',
    projectRoot: '/Users/dev/my_app',
  );

  print(generator.generateId('class', 'MyWidget'));
  // Output: class_a3f2_MyWidget_1

  print(generator.generateId('method', 'build'));
  // Output: method_a3f2_build_2

  print(
    generator.generateContextualId(
      'field',
      'counter',
      parentContext: 'MyWidget',
    ),
  );
  // Output: field_a3f2_MyWidget.counter_3

  // Example 2: Deterministic IDs for caching
  final deterministicId = generator.generateDeterministicId(
    'class',
    'com.example.MyWidget',
  );
  print(deterministicId);
  // Output: class_7a8b (always same for same input)

  // Example 3: Simple IDs for temporary nodes
  print(generator.generateSimpleId('temp'));
  // Output: temp_4

  // Example 4: Reset between files
  generator.reset();
  print(generator.generateId('class', 'AnotherWidget'));
  // Output: class_a3f2_AnotherWidget_1 (counter reset)
}

// =============================================================================
// ALTERNATIVE: SIMPLER VERSION (if you don't need determinism)
// =============================================================================

class SimpleIdGenerator {
  int _counter = 0;

  String generate(String type, [String? name]) {
    _counter++;
    if (name != null && name.isNotEmpty) {
      return '${type}_${name}_$_counter';
    }
    return '${type}_$_counter';
  }

  void reset() => _counter = 0;
}

// =============================================================================
// RECOMMENDED IMPLEMENTATION FOR DartFileBuilder
// =============================================================================

/// Add this to your DartFileBuilder class:
class DartFileBuilderWithIdGen {
  final IRIdGenerator _idGenerator;

  DartFileBuilderWithIdGen({required String filePath, String? projectRoot})
    : _idGenerator = IRIdGenerator(
        filePath: filePath,
        projectRoot: projectRoot,
      );

  /// Main method to call from visitors
  String generateId(String type, [String? name]) {
    return _idGenerator.generateId(type, name);
  }

  /// For nested declarations (methods in classes, etc.)
  String generateContextualId(String type, String name, {String? parent}) {
    return _idGenerator.generateContextualId(type, name, parentContext: parent);
  }

  /// For deterministic IDs (caching)
  String generateDeterministicId(String type, String fqn) {
    return _idGenerator.generateDeterministicId(type, fqn);
  }
}

// =============================================================================
// PERFORMANCE NOTES
// =============================================================================

/*
PERFORMANCE CONSIDERATIONS:

1. **Counter-based IDs** (fastest)
   - Time: O(1)
   - Use for: Single-file analysis, temporary nodes
   - Example: "class_MyWidget_42"

2. **Hash-based IDs** (medium)
   - Time: O(n) where n = string length
   - Use for: Cross-file analysis, caching
   - Example: "class_a3f2_MyWidget"

3. **Deterministic IDs** (slowest but stable)
   - Time: O(n) + hash computation
   - Use for: Incremental compilation, cache invalidation
   - Example: "class_7a8b9c"

RECOMMENDATION:
- For declaration_pass.dart: Use counter-based (generateId)
- For cross-file linking: Use hash-based (generateContextualId)
- For caching/comparison: Use deterministic (generateDeterministicId)
*/

// =============================================================================
// ID FORMAT SPECIFICATION
// =============================================================================

/*
STANDARD ID FORMAT:

{type}_{context}_{name}_{counter}

COMPONENTS:
1. type (required): Node type (class, method, field, param, etc.)
2. context (optional): Short hash of file path (4 chars)
3. name (optional): Sanitized name of the declaration
4. counter (required): Monotonic counter for uniqueness

EXAMPLES:
- class_a3f2_MyWidget_1
- method_a3f2_MyWidget.build_2
- field_a3f2_MyWidget._counter_3
- param_a3f2_callback_4
- type_a3f2_String_5
- expr_a3f2_literal_6

WHY THIS FORMAT?
1. Readable in logs/debugger
2. Grep-able (can search by type prefix)
3. Unique across files (context hash)
4. Sortable (counter suffix)
5. Reasonably short (~30 chars avg)
*/
