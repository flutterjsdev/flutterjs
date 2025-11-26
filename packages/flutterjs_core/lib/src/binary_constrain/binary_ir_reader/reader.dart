import 'dart:convert';
import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';
/// ============================================================================
/// reader.dart
/// BinaryReader — Low-Level Byte Input Engine for FlutterJS Binary Decoding
/// ============================================================================
///
/// Provides the **low-level API** for reading primitive values, strings,
/// sections, and byte sequences from a binary buffer during IR deserialization.
///
/// This is the exact counterpart to `writer.dart`.  
/// All higher-level readers depend on it:
/// - `binary_ir_reader.dart`  
/// - `expression_reader.dart`  
/// - `statement_reader.dart`  
/// - `type_reader.dart`  
/// - `declaration_reader.dart`  
///
///
/// # Purpose
///
/// BinaryReader abstracts raw byte access so IR decoding can be implemented:
/// - safely  
/// - deterministically  
/// - with guaranteed bounds checking  
///
/// It ensures that incorrect or malicious binaries cannot cause invalid reads,
/// crashes, or undefined state.
///
///
/// # Responsibilities
///
/// ## 1. Manage Cursor Position
///
/// Maintains the current read pointer:
///
/// ```dart
/// int _offset;
/// ```
///
/// Every read operation updates the cursor automatically.
///
///
/// ## 2. Read Primitive Types
///
/// ### Integers
/// ```dart
/// int readUint8();
/// int readUint16();
/// int readUint32();
/// ```
///
/// ### Floating-Point Numbers
/// ```dart
/// double readFloat64();
/// ```
///
/// Decodes IEEE-754 format.
///
///
/// ### Booleans
///
/// ```dart
/// bool readBool(); // 1 = true, 0 = false
/// ```
///
///
/// ## 3. Read UTF-8 Strings
///
/// Only for raw string bytes, not string interning logic:
///
/// ```dart
/// String readStringWithLength();
/// Uint8List readUtf8Bytes(int length);
/// ```
///
/// Actual string indexing is handled by `StringTable`, not the reader itself.
///
///
/// ## 4. Read Section Headers
///
/// Used by binary IR reader:
///
/// ```dart
/// int tag = readUint8(); // e.g. section: widgets, expressions, etc.
/// ```
///
/// Ensures the decoder identifies each logical section correctly.
///
///
/// ## 5. Bounds & Safety Checks
///
/// BinaryReader guarantees:
/// - no read overruns  
/// - no negative index access  
/// - no corrupted length read  
///
/// If something is wrong, throws:
/// - `BinaryFormatException`  
/// - `RangeError`  
///
///
/// ## 6. Read Raw Byte Chunks
///
/// ```dart
/// Uint8List slice = readBytes(length);
/// ```
///
/// Useful for reading:
/// - nested binary sections  
/// - string table payload  
/// - pre-sized blocks  
///
///
/// ## 7. Restore Cursor Position
///
/// Readers may temporarily adjust the offset, so restoring support is required:
///
/// ```dart
/// pushOffset();
/// popOffset();
/// ```
///
///
/// # Example Usage
///
/// ```dart
/// final reader = BinaryReader(bytes);
///
/// final tag = reader.readUint8();
/// final id  = reader.readUint32();
/// final name = reader.readStringWithLength();
/// ```
///
///
/// # Binary Flow
///
/// ```
/// Binary Bytes
///     ↓
/// BinaryReader (read primitives, strings)
///     ↓
/// Expression/Statement/Type readers
///     ↓
/// Full IR Tree
/// ```
///
///
/// # Error Handling
///
/// BinaryReader throws when:
/// - reading past buffer end  
/// - invalid UTF-8  
/// - corrupted length prefixes  
/// - incorrect section markers  
///
///
/// # Notes
///
/// - Must stay perfectly symmetric with writer.dart.  
/// - Keep optimized — used heavily during decoding.  
/// - Never embed IR logic here; this file must remain generic.  
///
///
/// ============================================================================
///

mixin Reader {
  int readByte();

  int readUint16();
  int readUint32();
  int readInt64();
  int readUint64();
  double readDouble();
  String readString();
  void boundsCheck(int bytesNeeded);

  String readStringRef();
  bool bytesEqual(List<int> a, List<int> b);
}

mixin SourceLocation {
  SourceLocationIR readSourceLocation();
}
