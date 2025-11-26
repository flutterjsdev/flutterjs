import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:crypto/crypto.dart';
/// ============================================================================
/// type_writer.dart
/// Type Writer — Serializes Type Definitions and References in the FlutterJS IR
/// ============================================================================
///
/// Responsible for encoding all **type-related information** in the FlutterJS
/// Intermediate Representation (IR).  
///
/// Types in FlutterJS IR are used for:
/// - variable declarations  
/// - parameter lists  
/// - function signatures  
/// - class and widget definitions  
/// - generic constraints  
///
/// This writer ensures that types are serialized in a compact, deterministic,
/// schema-compliant binary format so they can be reconstructed perfectly by the
/// binary reader.
///
///
/// # Purpose
///
/// Types are fundamental to the structure of IR. They help the runtime and
/// validators understand:
/// - data shape  
/// - nullability  
/// - generic relationships  
/// - inheritance / subtyping  
///
/// The TypeWriter provides the rules and binary structure necessary to encode
/// the complete type system in FlutterJS IR.
///
///
/// # Responsibilities
///
/// ## 1. Serialize Type Tags
///
/// Every type definition begins with a type tag:
///
/// - `kTypePrimitive`  
/// - `kTypeClass`  
/// - `kTypeGeneric`  
/// - `kTypeFunction`  
/// - `kTypeList`  
/// - `kTypeMap`  
/// - `kTypeNullable`  
///
/// These tags are defined in the binary schema.
///
///
/// ## 2. Primitive Type Encoding
///
/// Examples:
/// - `int`  
/// - `double`  
/// - `String`  
/// - `bool`  
///
/// Encoded using:
/// ```dart
/// writer.writeUint8(PRIMITIVE_TYPE_TAG);
/// ```
///
///
/// ## 3. Class Type Encoding
///
/// Includes:
/// - class name (string table index)  
/// - type arguments (generic types, if any)  
///
/// ```dart
/// [TAG_CLASS]
/// [NAME_INDEX]
/// [GENERIC_COUNT]
///   [ARG_1]
///   [ARG_2]
/// ```
///
///
/// ## 4. Generic Type Encoding
///
/// Supports structures like:
/// ```dart
/// List<T>
/// Map<K, V>
/// ```
///
/// Each generic parameter is recursively written as a type entry.
///
///
/// ## 5. Nullability Encoding
///
/// FlutterJS IR supports nullability flags:
///
/// ```dart
/// int?   → nullable  
/// int    → non-nullable  
/// ```
///
/// Binary representation:
/// ```dart
/// [TAG_NULLABLE]
/// [INNER_TYPE]
/// ```
///
///
/// ## 6. Function Type Encoding
///
/// Covers:
/// - positional parameters  
/// - named parameters  
/// - return type  
/// - optional/required flags  
///
/// Binary structure:
/// ```dart
/// [TAG_FUNCTION]
/// [RETURN_TYPE]
/// [PARAM_COUNT]
///   [PARAM_1_TYPE]
///   [PARAM_2_TYPE]
///   ...
/// ```
///
///
/// ## 7. Type Reference Writing
///
/// Types may appear by reference rather than definition:
///
/// ```dart
/// writer.writeUint32(typeIndex);
/// ```
///
///
/// ## 8. Consistency with StringCollection
///
/// All type names must be interned before writing:
///
/// ```dart
/// final nameId = strings.intern(type.name);
/// writer.writeUint32(nameId);
/// ```
///
///
/// # Example Usage
///
/// ```dart
/// final tw = TypeWriter(writer, stringCollection);
/// tw.writeType(irType);
/// ```
///
/// Typically invoked via:
/// - `declaration_writer.dart` (parameters, fields)  
/// - `binary_ir_writer.dart` (global type table)  
///
///
/// # Binary Flow Example
///
/// For a type:
/// ```dart
/// Map<String, int>
/// ```
///
/// Encoded as:
/// ```
/// TAG_MAP
///   TAG_CLASS (String)
///   TAG_PRIMITIVE (int)
/// ```
///
///
/// # Error Handling
///
/// Throws if:
/// - a type is null or unresolved  
/// - a generic parameter is missing  
/// - an invalid type tag is encountered  
/// - a type name is missing from the string table  
///
///
/// # Notes
///
/// - Must match reader decoding structure exactly.  
/// - Deterministic ordering is critical for binary reproducibility.  
/// - All types must be fully written before serialization progresses.  
/// - Any schema change affects all type-based validators.  
///
///
/// ============================================================================
///

mixin TypeWriter {
  // These methods are provided by BinaryIRWriter
  void writeByte(int value);
  void writeUint32(int value);
  int getStringRef(String str);

  BytesBuilder get buffer;

  BytesBuilder get _buffer => buffer;

  void writeType(TypeIR type) {
    if (type is SimpleTypeIR) {
      writeByte(BinaryConstants.TYPE_SIMPLE);
      writeUint32(getStringRef(type.name));
      writeByte(type.isNullable ? 1 : 0);
    } else if (type is DynamicTypeIR) {
      writeByte(BinaryConstants.TYPE_DYNAMIC);
    } else if (type is VoidTypeIR) {
      writeByte(BinaryConstants.TYPE_VOID);
    } else if (type is NeverTypeIR) {
      writeByte(BinaryConstants.TYPE_NEVER);
    } else {
      writeByte(BinaryConstants.TYPE_SIMPLE);
      writeUint32(getStringRef(type.displayName()));
      writeByte(type.isNullable ? 1 : 0);
    }
  }

  void writeChecksum(Uint8List data) {
    try {
      final digest = sha256.convert(data);
      final checksumBytes = digest.bytes;
      buffer.add(checksumBytes);
    } catch (e) {
      throw SerializationException(
        'Failed to compute checksum: $e',
        offset: buffer.length,
        context: 'checksum_write',
      );
    }
  }
}
