export 'validating/binary_format_validator.dart';
export 'validating/comprehensive_ir_validator.dart';
export 'binary_constain.dart';
export 'binary_ir_reader/binary_ir_reader.dart';
export 'binary_ir_writer/binary_ir_writer.dart';
export 'string_table.dart';
/// ============================================================================
/// binary.dart
/// Binary Serialization Core (Writer + Reader Entry Point)
/// ============================================================================
///
/// Provides the centralized export hub and unified API surface for all binary
/// serialization utilities used inside **FlutterJS IR → Binary Format**
/// conversion.
///
/// # Overview
/// This file acts as the *public interface layer* for the binary subsystem.  
/// Instead of importing multiple scattered files (`writer.dart`,
/// `reader.dart`, `expression_read_write.dart`, `string_table.dart`, etc.),
/// consumers import **this single library**, which re-exports all required
/// low-level components.
///
/// This design keeps the binary pipeline modular while offering a clean external
/// API.
///
/// # Responsibilities
///
/// - Aggregate and expose:
///   - BinaryWriter / BinaryReader
///   - Expression serialization/deserialization helpers
///   - StringTable utilities
///   - Binary format validation constants
///
/// - Provide a unified import target:
///   ```dart
///   import 'package:flutterjs/binary.dart';
///   ```
///
/// - Ensure a consistent versioned binary format across:
///   - AST → IR conversion
///   - IR → Binary encoding
///   - Binary → IR decoding
///
///
/// # Why This File Exists
/// The FlutterJS pipeline generates a **binary bundle** representing UI layout,
/// interaction hooks, literals, expressions, and widget metadata.
///
/// Multiple parts of this system require access to:
/// - Low-level byte writing functions
/// - Deterministic string interning
/// - Expression tree encoding/decoding
/// - Binary schema constants
///
/// Instead of importing 6–10 files separately, this provides **one stable API**.
///
///
/// # What Is Exported
///
/// ## 1. Binary Format Validation
/// `binary_format_validate.dart` verifies signature, endianness, reserved
/// ranges, and section boundaries during load.
///
/// ## 2. Binary Writer
/// Writes:
/// - ints, doubles, bools
/// - UTF-8 strings via StringTable
/// - expressions (delegated to `expression_write.dart`)
/// - structured IR objects (widgets, conditions, loops)
///
/// ## 3. Binary Reader
/// Reads back the same structures deterministically.
/// Ensures format compliance using exported validation constants.
///
/// ## 4. Expression Serialization
/// `expression_read_write.dart` provides:
/// - Literal serialization
/// - Variable reference encoding
/// - Property binding serialization
/// - Function & callback expression support
///
/// ## 5. String Table System
/// Efficient string-deduplication used during serialization.
/// Exposes:
/// - `StringTable`
/// - `StringRef`
/// - compression / indexing helpers
///
///
/// # Integration
///
/// ### Writing:
/// ```dart
/// final writer = BinaryWriter();
/// myIRObject.toBinary(writer);
/// final bytes = writer.toBytes();
/// ```
///
/// ### Reading:
/// ```dart
/// final reader = BinaryReader(bytes);
/// final ir = MyIRObject.fromBinary(reader);
/// ```
///
/// Applications working with FlutterJS IR should only import from this file.
///
///
/// # Notes
/// - This file does **not** contain logic – it only re-exports modules.
/// - Always keep exports version-aligned with binary schema changes.
/// - Breaking binary format changes must bump the binary schema version.
///
///
/// ============================================================================
///
