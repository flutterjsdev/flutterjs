import 'package:flutterjs_core/flutterjs_core.dart';
/// ============================================================================
/// writer.dart
/// BinaryWriter — Low-Level Byte Output Engine for FlutterJS Binary Encoding
/// ============================================================================
///
/// Provides the **core byte-level writing utilities** used by all higher-level
/// binary writers in the FlutterJS compiler pipeline.
///
/// This is the foundational module upon which the entire binary IR output is
/// built.  
///
/// Higher-level writers depend on BinaryWriter to emit:
/// - primitive integers  
/// - floating-point numbers  
/// - booleans  
/// - UTF-8 strings  
/// - section headers  
/// - object references  
/// - encoded IR fragments  
///
///
/// # Purpose
///
/// `BinaryWriter` abstracts away all low-level details of writing into a
/// growable byte buffer while guaranteeing:
///
/// - correct endianness  
/// - deterministic output  
/// - safe index writing  
/// - binary schema compliance  
///
/// Every serializer (IR writer, expression writer, statement writer, etc.)
/// uses this file to produce the final byte stream.
///
///
/// # Responsibilities
///
/// ## 1. Manage the Output Buffer
///
/// Maintains an internal `BytesBuilder` or raw `Uint8List` buffer:
///
/// ```dart
/// final _buffer = BytesBuilder();
/// ```
///
/// Provides:
/// - append operations  
/// - automatic resizing  
/// - safe access  
///
///
/// ## 2. Write Primitive Types
///
/// ### Integers
/// ```dart
/// writeUint8(int value);
/// writeUint16(int value);
/// writeUint32(int value);
/// ```
///
/// Always writes in **little-endian** or schema-specified format.
///
///
/// ### Floating-Point Numbers
///
/// ```dart
/// writeFloat64(double value);
/// ```
///
/// Encoded using IEEE-754.
///
///
/// ### Booleans
///
/// ```dart
/// writeBool(true);  // → 1
/// writeBool(false); // → 0
/// ```
///
///
/// ## 3. Write UTF-8 Strings
///
/// Not for normal strings — this only writes string *bytes*.  
/// The string **indexing** is handled externally (via `string_collection.dart`).
///
/// ```dart
/// writeUtf8Bytes(String value);
/// writeStringWithLength(String value);
/// ```
///
///
/// ## 4. Write Section Tags & Boundaries
///
/// Used by the IR writer:
///
/// ```dart
/// writeUint8(kSectionWidgets);
/// writeUint8(kSectionExpressions);
/// writeUint8(kSectionStringTable);
/// ```
///
/// Ensures binary format consistency.
///
///
/// ## 5. Write Arbitrary Byte Lists
///
/// ```dart
/// writeBytes(Uint8List data);
/// ```
///
/// Supports embedding sub-payloads such as:
/// - nested IR blocks  
/// - encoded string table  
/// - optional metadata sections  
///
///
/// ## 6. Provide Finalized Output
///
/// Returns the final binary bundle:
///
/// ```dart
/// Uint8List toBytes();
/// ```
///
/// The method guarantees:
/// - no trailing unused capacity  
/// - deterministic layout  
///
///
/// # Typical Use Case in the Pipeline
///
/// ```dart
/// final writer = BinaryWriter();
///
/// // Used by higher layers
/// expressionWriter.write(expr);
/// statementWriter.write(stmt);
/// relationshipWriter.write(relations);
///
/// final result = writer.toBytes();
/// ```
///
///
/// # Integration With Other Writers
///
/// BinaryWriter is used by:
///
/// - `binary_ir_writer.dart`  
/// - `expression_writer.dart`  
/// - `statement_writer.dart`  
/// - `type_writer.dart`  
/// - `relationship_writer.dart`  
/// - `declaration_writer.dart`  
///
/// It is the **core dependency** for every binary encoder.
///
///
/// # Error Handling
///
/// BinaryWriter throws when:
/// - writing out-of-range integer values  
/// - writing null values where forbidden  
/// - unsupported type encodings are attempted  
///
/// Higher-level writers should validate values before calling this.
///
///
/// # Notes
///
/// - This file should remain minimal and optimized—no IR logic allowed.  
/// - Changes here affect the entire binary system; modify with caution.  
/// - Must remain synchronized with binary readers for endianness & formats.  
/// - Low-level writer performance significantly affects full build speed.  
///
///
/// ============================================================================
///

mixin Writer {
  void printlog(String message);

  void writeByte(int value);

  void writeUint16(int value);

  void writeUint32(int value);

  void writeInt64(int value);

  void writeUint64(int value);

  void writeDouble(double value);

  void writeString(String str);
  void addString(String str);
  int getStringRef(String str);
}

mixin SourceLocation {
  void writeSourceLocation(SourceLocationIR location);
}
