import 'package:meta/meta.dart';
import '../ir/ir_node.dart';

/// Unified source location tracking - combines SourceLocationIR and SourceLocation
/// Represents a physical location in source code for precise error reporting and IDE integration
@immutable
class SourceLocationIR extends IRNode {
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
  required this.file,
  required this.line,
  required this.column,
  required this.offset,
  required this.length,
  required super. id,
}) : super(
    
    sourceLocation:  SourceLocationIR( // Use `this` implicitly
      file: file,
      line: line,
      column: column,
      offset: offset,
      length: length,
      id: id,
    ),
  );
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
    // For multi-line: end column is length of last line
    // Approximate: assume avg line length of 80 chars
    return (length - newlines * 80) % 80 + 1;
  }

  /// Count newlines in the span (approximate - would need source text for accuracy)
  int _countNewlines() {
    // Approximate: every 80 chars might have a newline
    return (length / 80).floor();
  }

  /// LSP (Language Server Protocol) compatible range
  /// Format: {"start": {"line": 0, "character": 0}, "end": {"line": 0, "character": 5}}
  Map<String, dynamic> get lspRange {
    return {
      'start': {'line': line - 1, 'character': column - 1},
      'end': {
        'line': endLine - 1,
        'character': endColumn - 1,
      },
    };
  }

  /// Check if this is an unknown/synthetic location
  bool get isUnknown => file == '<unknown>';

  @override
  String get debugName => 'SourceLocation';

  @override
  String toShortString() => humanReadable;

  @override
  String toString() => humanReadable;

  @override
  bool contentEquals(IRNode other) {
    if (other is! SourceLocationIR) return false;
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
  int get hashCode =>
      Object.hash(file, line, column, offset, length);

  /// Create from JSON (compatible with both formats)
  factory SourceLocationIR.fromJson(Map<String, dynamic> json) {
    final file = json['file'] as String? ?? json['filePath'] as String? ?? '<unknown>';
    final line = json['line'] as int? ?? 0;
    final column = json['column'] as int? ?? 0;
    final offset = json['offset'] as int? ?? 0;
    final length = json['length'] as int? ?? 0;
    final id = json['id'] as String? ?? 'loc_${file.hashCode}_${line}_${column}';
    
    return SourceLocationIR(
      file: file,
      line: line,
      column: column,
      offset: offset,
      length: length,
      id: id,
    );
  }


  Map<String, dynamic> toJson() {
    return {
      'file': file,
      'line': line,
      'column': column,
      'offset': offset,
      'length': length,
    };
  }

  /// Create from line/column (calculates offset approximately)
  factory SourceLocationIR.fromLineColumn({
    required String file,
    required int line,
    required int column,
    int length = 1,
  }) {
    final offset = (line - 1) * 100 + (column - 1); // 0-based offset
    final id = 'loc_${file.hashCode}_${line}_${column}';
    return SourceLocationIR(
      file: file,
      line: line,
      column: column,
      offset: offset,
      length: length,
      id: id,
    );
  }

  /// Copy with modifications
  SourceLocationIR copyWith({
    String? file,
    int? line,
    int? column,
    int? offset,
    int? length,
  }) {
    return SourceLocationIR(
      file: file ?? this.file,
      line: line ?? this.line,
      column: column ?? this.column,
      offset: offset ?? this.offset,
      length: length ?? this.length,
      id: id,
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

// =============================================================================
// EXTENSION: Convenience methods for SourceLocationIR
// =============================================================================

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
   SourceLocationIR range(
    SourceLocationIR start,
    SourceLocationIR end,
  ) {
    if (start.file != end.file) {
      throw ArgumentError('Range locations must be in same file');
    }
    return SourceLocationIR(
      file: start.file,
      line: start.line,
      column: start.column,
      offset: start.offset,
      length: end.offset + end.length - start.offset,
      id: 'range_${start.id}_${end.id}',
    );
  }
}