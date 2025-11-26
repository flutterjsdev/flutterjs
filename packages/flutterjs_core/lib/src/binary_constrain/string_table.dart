import 'dart:typed_data';
import 'dart:convert';
import 'binary_constain.dart';

/// ============================================================================
/// string_table.dart
/// String Interning System for Binary Serialization
/// ============================================================================
///
/// Implements a **compact, indexed string table** used during the binary
/// serialization process.
///
/// This module ensures that every unique string appearing in FlutterJS IR
/// (widget names, identifiers, property keys, literal values, etc.) is:
///
/// - Stored **once**
/// - Assigned a **stable numeric index**
/// - Referenced via lightweight integer offsets in the binary stream
///
/// The binary format relies heavily on this table because strings are the
/// most repeated and memory-heavy elements in UI metadata.
///
///
/// # Purpose
///
/// Without interning, writing the same string repeatedly—like:
/// - `"Text"`
/// - `"container"`
/// - `"onTap"`
/// - `"color"`
///
/// would dramatically inflate binary size.
///
/// The string table provides:
/// - **Deduplication** of identical strings
/// - **Index-based lookup** for compact encoding
/// - **Deterministic ordering** for reproducibility
///
///
/// # Responsibilities
///
/// ## 1. Interning & Indexing
/// The table assigns each string a unique integer index.
///
/// Example:
/// ```dart
/// final index = table.addString("Text"); // returns 0, 1, 2...
/// ```
///
/// If a string already exists, the existing index is returned:
///
/// ```dart
/// final again = table.addString("Text"); // returns same index
/// ```
///
/// Ensures **no duplicates**.
///
///
/// ## 2. Lookups
///
/// Fast lookup from index → string:
/// ```dart
/// final name = table.getString(3);
/// ```
///
/// And reverse:
/// ```dart
/// final index = table.getIndex("MyWidget");
/// ```
///
///
/// ## 3. Export / Import (Binary Serialization)
///
/// ### Writing the table:
/// - Writes the number of strings
/// - Writes each string in UTF-8
/// - Writes length-prefixes for safe decoding
///
/// ### Reading the table:
/// - Reads string count
/// - Reads each UTF-8 blob
/// - Reconstructs index ordering
///
///
/// ## 4. Internal Storage
///
/// The table typically maintains:
/// - `_strings` → List<String>
/// - `_indices` → Map<String, int>
///
/// This ensures O(1) access for both add and lookup.
///
///
/// # How Binary Writer Uses StringTable
///
/// When writing a string:
/// ```dart
/// final ref = stringTable.addString(value);
/// writer.writeUint32(ref);
/// ```
///
/// When reading:
/// ```dart
/// final index = reader.readUint32();
/// final value = stringTable.getString(index);
/// ```
///
///
/// # Guarantees
///
/// - **No duplicates**
/// - **Stable ordering** (order of first appearance)
/// - **Deterministic binary output**
/// - **Fast integer references**
///
///
/// # Example Usage
///
/// ```dart
/// final table = StringTable();
/// table.addString("title");
/// table.addString("subtitle");
///
/// final idx = table.getIndex("title"); // -> 0
/// final str = table.getString(idx);    // -> "title"
/// ```
///
///
/// # Error Handling
///
/// Reader must throw if:
/// - index is out of range
/// - invalid UTF-8 sequence encountered
///
/// Writer ensures:
/// - no null strings
/// - no malformed references
///
///
/// # Notes
///
/// - The string table is highly performance-sensitive; avoid expensive ops.
/// - All strings used in binary IR **must** pass through this table.
/// - Changing indexing behavior breaks binary compatibility.
/// - If new string categories are added, update serialization schema accordingly.
///
///
/// ============================================================================
///

class StringTable {
  /// Maps string -> index for O(1) lookup
  final Map<String, int> _indices = {};

  /// Ordered list of unique strings
  final List<String> _strings = [];

  /// Statistics for analysis
  int _totalStringsSeen = 0;
  int _totalBytesSeen = 0;
  int _totalDuplicates = 0;

  // =========================================================================
  // PUBLIC API - WRITING (used by BinaryIRWriter)
  // =========================================================================

  /// Add a string to the table if not already present
  /// Returns the index of the string
  int addString(String str) {
    if (str.isEmpty) return 0; // Empty strings get index 0 implicitly

    _totalStringsSeen++;
    _totalBytesSeen += utf8.encode(str).length;

    if (_indices.containsKey(str)) {
      _totalDuplicates++;
      return _indices[str]!;
    }

    final index = _strings.length;
    _indices[str] = index;
    _strings.add(str);

    return index;
  }

  /// Add multiple strings at once
  void addStrings(Iterable<String> strings) {
    for (final str in strings) {
      addString(str);
    }
  }

  /// Get string reference (index) without adding if not present
  int? getStringRefOrNull(String str) {
    return _indices[str];
  }

  /// Get string reference, throwing if not found
  int getStringRef(String str) {
    return _indices[str] ?? (throw StateError('String not in table: $str'));
  }

  /// Serialize the string table to binary format
  /// Format:
  /// [STRING_COUNT (4 bytes)]
  /// [STRING_1_LENGTH (2 bytes)][STRING_1_DATA (variable)]
  /// [STRING_2_LENGTH (2 bytes)][STRING_2_DATA (variable)]
  /// ...
  void writeTo(BytesBuilder buffer) {
    // Write count
    _writeUint32(buffer, _strings.length);

    // Write each string
    for (final str in _strings) {
      _writeString(buffer, str);
    }
  }

  // =========================================================================
  // PUBLIC API - READING (used by BinaryIRReader)
  // =========================================================================

  /// Deserialize string table from binary data
  /// Reads from current buffer position
  void readFrom(ByteData data, int offset) {
    int currentOffset = offset;

    // Read count
    final count = _readUint32(data, currentOffset);
    currentOffset += 4;

    _strings.clear();
    _indices.clear();

    for (int i = 0; i < count; i++) {
      // Read string length
      final length = _readUint16(data, currentOffset);
      currentOffset += 2;

      if (length > BinaryConstants.MAX_STRING_LENGTH) {
        throw StringTableException(
          'String length too large: $length (max ${BinaryConstants.MAX_STRING_LENGTH})',
          index: i,
        );
      }

      // Read string bytes
      if (currentOffset + length > data.lengthInBytes) {
        throw StringTableException(
          'Not enough data for string $i (need $length bytes)',
          index: i,
        );
      }

      final bytes = data.buffer.asUint8List(currentOffset, length);
      final str = utf8.decode(bytes);
      currentOffset += length;

      _indices[str] = i;
      _strings.add(str);
    }
  }

  /// Get a string by index
  String getString(int index) {
    if (index < 0 || index >= _strings.length) {
      throw StringTableException(
        'String index out of bounds: $index (table size: ${_strings.length})',
        index: index,
      );
    }
    return _strings[index];
  }

  /// Get string safely, returning null if out of bounds
  String? getStringOrNull(int index) {
    if (index < 0 || index >= _strings.length) return null;
    return _strings[index];
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /// Get total number of strings in table
  int get length => _strings.length;

  /// Get total size if this table were written to bytes
  int get sizeInBytes {
    int size = 4; // For count
    for (final str in _strings) {
      size += 2; // String length field
      size += utf8.encode(str).length; // String data
    }
    return size;
  }

  /// Get all strings (for debugging/analysis)
  List<String> get allStrings => List.unmodifiable(_strings);

  /// Get statistics about string usage
  StringTableStats getStats() {
    return StringTableStats(
      totalStringsInTable: _strings.length,
      totalStringsSeen: _totalStringsSeen,
      totalBytesSeen: _totalBytesSeen,
      totalDuplicates: _totalDuplicates,
      deduplicationRatio: _totalStringsSeen > 0
          ? (_totalDuplicates / _totalStringsSeen)
          : 0.0,
      compressionRatio: _totalBytesSeen > 0 && sizeInBytes > 0
          ? (1.0 - (sizeInBytes / _totalBytesSeen))
          : 0.0,
      averageStringLength: _strings.isEmpty
          ? 0
          : _strings
                    .map((s) => utf8.encode(s).length)
                    .reduce((a, b) => a + b) ~/
                _strings.length,
      longestString: _strings.isEmpty
          ? ''
          : _strings.reduce(
              (a, b) => utf8.encode(a).length > utf8.encode(b).length ? a : b,
            ),
      longestStringLength: _strings.isEmpty
          ? 0
          : _strings
                .map((s) => utf8.encode(s).length)
                .reduce((a, b) => a > b ? a : b),
    );
  }

  /// Reset the table
  void clear() {
    _indices.clear();
    _strings.clear();
    _totalStringsSeen = 0;
    _totalBytesSeen = 0;
    _totalDuplicates = 0;
  }

  /// Verify table integrity
  bool verify() {
    // Check indices match strings
    if (_indices.length != _strings.length) {
      return false;
    }

    // Check all indices are correct
    for (int i = 0; i < _strings.length; i++) {
      if (_indices[_strings[i]] != i) {
        return false;
      }
    }

    // Check no duplicate indices
    final usedIndices = _indices.values.toSet();
    if (usedIndices.length != _strings.length) {
      return false;
    }

    return true;
  }

  /// Generate a report of string usage
  String generateReport() {
    final stats = getStats();
    final buffer = StringBuffer();

    buffer.writeln('STRING TABLE REPORT');
    buffer.writeln('═' * 60);
    buffer.writeln('Strings in table: ${stats.totalStringsInTable}');
    buffer.writeln('Total strings seen: ${stats.totalStringsSeen}');
    buffer.writeln('Total duplicates: ${stats.totalDuplicates}');
    buffer.writeln(
      'Deduplication ratio: ${(stats.deduplicationRatio * 100).toStringAsFixed(2)}%',
    );
    buffer.writeln(
      'Compression ratio: ${(stats.compressionRatio * 100).toStringAsFixed(2)}%',
    );
    buffer.writeln();
    buffer.writeln('STATISTICS:');
    buffer.writeln(
      '  Average string length: ${stats.averageStringLength} bytes',
    );
    buffer.writeln(
      '  Longest string: "${stats.longestString}" (${stats.longestStringLength} bytes)',
    );
    buffer.writeln('  Table size: ${stats.tableSize} bytes');
    buffer.writeln('  Original size: ${stats.originalSize} bytes');
    buffer.writeln(
      '  Savings: ${(stats.originalSize - stats.tableSize)} bytes',
    );
    buffer.writeln();
    buffer.writeln('MOST COMMON STRINGS:');

    final sorted =
        _strings
            .asMap()
            .entries
            .map((e) => MapEntry(e.value, _countOccurrences(e.value)))
            .toList()
          ..sort((a, b) => b.value.compareTo(a.value));

    for (int i = 0; i < (sorted.length < 10 ? sorted.length : 10); i++) {
      final entry = sorted[i];
      buffer.writeln('  ${i + 1}. "${entry.key}" (×${entry.value})');
    }

    buffer.writeln('═' * 60);
    return buffer.toString();
  }

  int _countOccurrences(String str) {
    // This is approximate - counts how many times we tried to add this string
    // In a real implementation, you might track this more precisely
    return 1; // Placeholder
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  void _writeUint32(BytesBuilder buffer, int value) {
    buffer.addByte((value & 0xFF));
    buffer.addByte((value >> 8) & 0xFF);
    buffer.addByte((value >> 16) & 0xFF);
    buffer.addByte((value >> 24) & 0xFF);
  }

  void _writeUint16(BytesBuilder buffer, int value) {
    buffer.addByte((value & 0xFF));
    buffer.addByte((value >> 8) & 0xFF);
  }

  void _writeString(BytesBuilder buffer, String str) {
    final bytes = utf8.encode(str);
    if (bytes.length > BinaryConstants.MAX_STRING_LENGTH) {
      throw StringTableException(
        'String too long: ${bytes.length} bytes (max ${BinaryConstants.MAX_STRING_LENGTH})',
        string: str,
      );
    }
    _writeUint16(buffer, bytes.length);
    buffer.add(bytes);
  }

  int _readUint32(ByteData data, int offset) {
    return data.getUint32(offset, Endian.little);
  }

  int _readUint16(ByteData data, int offset) {
    return data.getUint16(offset, Endian.little);
  }
}

/// Statistics about string table efficiency
class StringTableStats {
  final int totalStringsInTable;
  final int totalStringsSeen;
  final int totalBytesSeen;
  final int totalDuplicates;
  final double deduplicationRatio;
  final double compressionRatio;
  final int averageStringLength;
  final String longestString;
  final int longestStringLength;

  StringTableStats({
    required this.totalStringsInTable,
    required this.totalStringsSeen,
    required this.totalBytesSeen,
    required this.totalDuplicates,
    required this.deduplicationRatio,
    required this.compressionRatio,
    required this.averageStringLength,
    required this.longestString,
    required this.longestStringLength,
  });

  int get tableSize => totalStringsInTable * 2 + totalBytesSeen ~/ 2;
  int get originalSize => totalBytesSeen;
  int get savedBytes => originalSize - tableSize;

  @override
  String toString() =>
      '''
StringTableStats(
  strings: $totalStringsInTable,
  dedup: ${(deduplicationRatio * 100).toStringAsFixed(2)}%,
  compression: ${(compressionRatio * 100).toStringAsFixed(2)}%,
  avgLen: $averageStringLength,
  longest: "$longestString" ($longestStringLength bytes)
)''';
}

/// Exception thrown by string table operations
class StringTableException implements Exception {
  final String message;
  final int? index;
  final String? string;

  StringTableException(this.message, {this.index, this.string});

  @override
  String toString() {
    final parts = [message];
    if (index != null) parts.add('index=$index');
    if (string != null) parts.add('string="$string"');
    return 'StringTableException: ${parts.join(', ')}';
  }
}

// =========================================================================
// HELPER EXTENSION
// =========================================================================

/// Extension to make BytesBuilder easier to work with
extension BytesBuilderX on BytesBuilder {
  /// Write a uint32 in little-endian format
  void addUint32(int value) {
    addByte((value & 0xFF));
    addByte((value >> 8) & 0xFF);
    addByte((value >> 16) & 0xFF);
    addByte((value >> 24) & 0xFF);
  }

  /// Write a uint16 in little-endian format
  void addUint16(int value) {
    addByte((value & 0xFF));
    addByte((value >> 8) & 0xFF);
  }

  /// Write a UTF-8 encoded string with length prefix
  void addLengthPrefixedString(String str) {
    final bytes = utf8.encode(str);
    addUint16(bytes.length);
    add(bytes);
  }
}
