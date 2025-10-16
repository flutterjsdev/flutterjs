import 'package:meta/meta.dart';

/// Represents a physical location in source code
/// Used for precise error reporting and IDE integration
@immutable
class SourceLocation {
  /// Full path to the .dart file
  final String filePath;

  /// 1-based line number (for display)
  final int line;

  /// 1-based column number (for display)
  final int column;

  /// 0-based byte offset from start of file
  final int offset;

  /// Length of this element in bytes
  final int length;

  const SourceLocation({
    required this.filePath,
    required this.line,
    required this.column,
    required this.offset,
    required this.length,
  });

  /// Create an unknown/synthetic location
  factory SourceLocation.unknown() {
    return const SourceLocation(
      filePath: '<unknown>',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    );
  }

  /// Human-readable format: "path/to/file.dart:42:8"
  String get humanReadable => '$filePath:$line:$column';

  /// End line (useful for multi-line spans)
  int get endLine {
    // Count newlines in the span to calculate end line
    // final text = ''; // In real usage, would need source text
    return line;
  }

  /// End column
  int get endColumn => column + length;

  /// LSP (Language Server Protocol) compatible range
  Map<String, dynamic> get lspRange {
    return {
      'start': {'line': line - 1, 'character': column - 1},
      'end': {'line': line - 1, 'character': column - 1 + length},
    };
  }

  @override
  String toString() => humanReadable;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SourceLocation &&
          runtimeType == other.runtimeType &&
          filePath == other.filePath &&
          line == other.line &&
          column == other.column &&
          offset == other.offset &&
          length == other.length;

  @override
  int get hashCode =>
      Object.hash(filePath, line, column, offset, length);

  factory SourceLocation.fromJson(Map<String, dynamic> json) {
    return SourceLocation(
      filePath: json['filePath'] as String,
      line: json['line'] as int,
      column: json['column'] as int,
      offset: json['offset'] as int,
      length: json['length'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'filePath': filePath,
      'line': line,
      'column': column,
      'offset': offset,
      'length': length,
    };
  }
}