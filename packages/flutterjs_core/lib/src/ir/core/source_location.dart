// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/// <---------------------------------------------------------------------------->
/// source_location.dart
/// ----------------------------------------------------------------------------
///
/// Immutable, rich representation of a source code location.
///
/// Used universally across the analyzer ecosystem to pinpoint where an
/// [AnalysisIssue] occurs — with support for:
/// • Human-readable display (`lib/main.dart:42:8`)
/// • IDE navigation (line/col 1-based)
/// • LSP (Language Server Protocol) compatibility
/// • Byte offsets for precise parsing
/// • Range spanning (multi-line nodes)
/// • JSON serialization
/// • Value-based equality & hashing
///
/// Also includes smart extensions for:
/// • Distance calculations
/// • Range creation
/// • Nearby location checks
/// • Debug-friendly formatting
///
/// This is the single source of truth for "where" in the entire analysis pipeline.
///
/// Preferred over raw maps or analyzer's SourceLocation for consistency
/// and richer functionality.
/// <---------------------------------------------------------------------------->
library;

import 'package:meta/meta.dart';

@immutable
class SourceLocationIR {
  /// Unique identifier for this location
  final String id;

  /// Full path to the .dart file (absolute or relative)
  final String file;

  /// 1-based line number (for display and navigation)
  final int line;

  /// 1-based column number (for display and navigation)
  final int column;

  /// 0-based byte offset from start of file
  final int offset;

  /// Length of this element in bytes
  final int length;

  SourceLocationIR({
    required this.id,
    required this.file,
    required this.line,
    required this.column,
    required this.offset,
    required this.length,
  });

  /// Human-readable format: "path/to/file.dart:42:8"
  String get humanReadable => '$file:$line:$column';

  /// Alias for compatibility with SourceLocation.filePath
  String get filePath => file;

  /// End line (useful for multi-line constructs)
  int get endLine => line + _countNewlines();

  /// End column (handles multi-line spans correctly)
  int get endColumn {
    final newlines = _countNewlines();
    if (newlines == 0) {
      return column + length;
    }
    return (length - newlines * 80) % 80 + 1;
  }

  /// Count newlines in the span (approximate)
  int _countNewlines() {
    return (length / 80).floor();
  }

  /// LSP (Language Server Protocol) compatible range
  Map<String, dynamic> get lspRange {
    return {
      'start': {'line': line - 1, 'character': column - 1},
      'end': {'line': endLine - 1, 'character': endColumn - 1},
    };
  }

  /// Check if this is an unknown/synthetic location
  bool get isUnknown => file == '<unknown>';

  String get debugName => 'SourceLocation';

  String toShortString() => humanReadable;

  @override
  String toString() => humanReadable;

  bool contentEquals(SourceLocationIR other) {
    return file == other.file &&
        line == other.line &&
        column == other.column &&
        offset == other.offset &&
        length == other.length;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SourceLocationIR &&
          runtimeType == other.runtimeType &&
          file == other.file &&
          line == other.line &&
          column == other.column &&
          offset == other.offset &&
          length == other.length;

  @override
  int get hashCode => Object.hash(id, file, line, column, offset, length);

  /// Create from JSON
  factory SourceLocationIR.fromJson(Map<String, dynamic> json) {
    final file =
        json['file'] as String? ?? json['filePath'] as String? ?? '<unknown>';
    final line = json['line'] as int? ?? 0;
    final column = json['column'] as int? ?? 0;
    final offset = json['offset'] as int? ?? 0;
    final length = json['length'] as int? ?? 0;
    final id =
        json['id'] as String? ?? 'loc_${file.hashCode}_${line}_${column}';

    return SourceLocationIR(
      id: id,
      file: file,
      line: line,
      column: column,
      offset: offset,
      length: length,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'file': file,
      'line': line,
      'column': column,
      'offset': offset,
      'length': length,
    };
  }

  /// Create from line/column
  factory SourceLocationIR.fromLineColumn({
    required String id,
    required String file,
    required int line,
    required int column,
    int length = 1,
  }) {
    final offset = (line - 1) * 100 + (column - 1);
    return SourceLocationIR(
      id: id,
      file: file,
      line: line,
      column: column,
      offset: offset,
      length: length,
    );
  }

  /// Copy with modifications
  SourceLocationIR copyWith({
    String? id,
    String? file,
    int? line,
    int? column,
    int? offset,
    int? length,
  }) {
    return SourceLocationIR(
      id: id ?? this.id,
      file: file ?? this.file,
      line: line ?? this.line,
      column: column ?? this.column,
      offset: offset ?? this.offset,
      length: length ?? this.length,
    );
  }

  /// Check if location is within this range
  bool contains(SourceLocationIR other) {
    if (file != other.file) return false;
    return offset <= other.offset && other.offset < offset + length;
  }

  /// Get distance from another location (in bytes)
  int distanceFrom(SourceLocationIR other) {
    if (file != other.file) return -1;
    return (offset - other.offset).abs();
  }
}

/// Extension: Convenience methods
extension SourceLocationExtension on SourceLocationIR {
  /// Format for LSP/IDE display
  String get displayString => '$file($line:$column)';

  /// Format for error messages
  String get errorString => '$file at line $line, column $column';

  /// Check if locations are nearby (within N characters)
  bool isNearby(SourceLocationIR other, {int threshold = 10}) {
    if (file != other.file) return false;
    return distanceFrom(other) <= threshold;
  }

  /// Create a range from start to end location
  SourceLocationIR range(SourceLocationIR start, SourceLocationIR end) {
    if (start.file != end.file) {
      throw ArgumentError('Range locations must be in same file');
    }
    return SourceLocationIR(
      id: 'range_${start.id}_${end.id}',
      file: start.file,
      line: start.line,
      column: start.column,
      offset: start.offset,
      length: end.offset + end.length - start.offset,
    );
  }
}
