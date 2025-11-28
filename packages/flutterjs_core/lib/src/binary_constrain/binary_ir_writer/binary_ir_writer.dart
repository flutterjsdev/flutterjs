import 'dart:convert';
import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/analysis/extraction/flutter_component_system.dart';
import 'package:flutterjs_core/src/analysis/extraction/symmetric_function_extraction.dart';
import 'package:flutterjs_core/src/ir/core/source_location.dart';
import 'package:flutterjs_core/src/ir/declarations/import_export_stmt.dart';
import 'package:flutterjs_core/src/ir/expressions/expression_ir.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/declaration_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/expression_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/relationship_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/statement_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/string_collection.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/type_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/writer.dart';

import '../../ir/declarations/dart_file_builder.dart';
import '../../ir/expressions/cascade_expression_ir.dart';
import 'ir_relationship_registry.dart';
import '../binary_constain.dart';
import 'validator_file.dart';

/// ============================================================================
/// binary_ir_writer.dart
/// Binary IR Writer — Core Encoder for FlutterJS Intermediate Representation
/// ============================================================================
///
/// Provides the high-level writer responsible for converting the **entire
/// FlutterJS IR tree** into the compact binary format used by the FlutterJS
/// runtime, JavaScript converter, and build pipeline.
///
/// This file coordinates multiple specialized writers:
/// - `expression_writer.dart`
/// - `statement_writer.dart`
/// - `type_writer.dart`
/// - `declaration_writer.dart`
/// - `relationship_writer.dart`
/// - `string_collection.dart`
/// - base `writer.dart` (low-level byte output)
///
/// It ensures that **all IR components** (widgets, declarations, types,
/// relations, expressions) are written in the correct schema order using the
/// BinaryWriter.
///
///
/// # Purpose
///
/// BinaryIRWriter is the **master serializer** for structured IR.
/// It transforms the in-memory IR graph into:
///
/// - Deterministic
/// - Compact
/// - Versioned
/// - Validated
///
/// binary output.
///
/// This output is consumed by:
/// - The FlutterJS JavaScript generator
/// - Binary → IR decoders
/// - Developer tooling
///
///
/// # Responsibilities
///
/// ## 1. Orchestrates IR Serialization
///
/// Calls specific writers in correct order:
///
/// ```dart
/// writeTypes();
/// writeDeclarations();
/// writeExpressions();
/// writeStatements();
/// writeRelationships();
/// ```
///
/// Guarantees schema consistency.
///
///
/// ## 2. Manages String Table Population
///
/// All IR strings must pass through `StringCollection` before writing indices.
/// BinaryIRWriter ensures:
/// - Widget names
/// - Type names
/// - Variable identifiers
/// - Property keys
///
/// are registered **before** numeric references are written.
///
///
/// ## 3. Ensures Deterministic Ordering
///
/// Ordering rules enforced:
/// - Types are written before declarations
/// - Declarations before bodies
/// - Expression definitions before usage
///
/// This guarantees reproducible builds.
///
///
/// ## 4. Section Boundary Emission
///
/// Writes section markers defined in `binary_constain.dart` to maintain
/// structured binary composition.
///
///
/// ## 5. Error Checking
///
/// Writer validates:
/// - Missing IR sections
/// - Invalid references
/// - Empty mandatory structures
/// - Duplicate identifiers causing schema conflict
///
///
/// # High-Level Serialization Flow
///
/// ```
/// +------------------------+
/// | FlutterJS IR Structure |
/// +-----------+------------+
///             |
///             v
/// +------------------------+
/// | BinaryIRWriter         |
/// +-----------+------------+
///             | orchestrates
///             v
///   +---------+---------+
///   | Sub-Writers       |
///   | type/expr/decl/...|
///   +---------+---------+
///             |
///             v
/// +------------------------+
/// | BinaryWriter + Strings|
/// +-----------+------------+
///             |
///             v
///       [ Final Bytes ]
/// ```
///
///
/// # Example Usage
///
/// ```dart
/// final writer = BinaryIRWriter();
/// final bytes = writer.write(irRoot);
/// ```
///
/// The returned byte array represents the entire compiled IR.
///
///
/// # Notes
///
/// - Must be updated whenever IR schema changes.
/// - Works closely with validators to ensure correctness.
/// - Performance-sensitive: avoid unnecessary traversal or string lookups.
/// - Output must remain binary-compatible across versions.
///
///
/// ============================================================================
///

class BinaryIRWriter
    with
        Writer,
        SourceLocation,
        TypeWriter,
        ExpressionWriter,
        RelationshipWriter,
        DeclarationWriter,
        StatementWriter,
        ValidatorFile,
        StringCollectionPhase {
  final BytesBuilder _buffer = BytesBuilder();
  final List<String> _stringTable = [];
  final Map<String, int> _stringIndices = {};

  // =========================================================================
  // RELATIONSHIP TRACKING
  // =========================================================================
  late IRRelationshipRegistry _relationships;
  int _relationshipsStartOffset = 0;
  int _stringTableStartOffset = 0;
  int _irDataStartOffset = 0;

  bool _shouldWriteChecksum = true;
  bool _verbose = false;

  // =========================================================================
  // MIXIN GETTERS - PROVIDE CONCRETE IMPLEMENTATIONS
  // =========================================================================

  /// Getter for RelationshipWriter mixin
  @override
  IRRelationshipRegistry get relationshipsRegistry => _relationships;

  /// Getter for StringCollectionPhase and RelationshipWriter mixins
  @override
  bool get isVerbose => _verbose;

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Serialize a DartFile IR to binary format
  Uint8List writeFileIR(DartFile fileIR, {bool verbose = false}) {
    _verbose = verbose;
    _relationships = IRRelationshipRegistry();

    printlog('[INIT] Serialization started with verbose=$_verbose');

    // STEP 1: Validate
    final validationErrors = validateFileIR(fileIR);
    if (validationErrors.isNotEmpty) {
      throw SerializationException(
        'Cannot serialize invalid FileIR:\n${validationErrors.join('\n')}',
        offset: 0,
        context: 'validation',
      );
    }

    _buffer.clear();
    _stringTable.clear();
    _stringIndices.clear();

    // STEP 2: Build relationships
    buildRelationships(fileIR);

    // STEP 3: Collect strings
    collectStrings(fileIR);
    collectStringsFromRelationships();

    // ✅ NEW DEBUG: Print all collected strings
    printlog('\n[DEBUG] String table after collection:');
    printlog('Total strings: ${_stringTable.length}');
    for (int i = 0; i < _stringTable.length; i++) {
      printlog('  [$i] "${_stringTable[i]}"');
    }
    printlog('');

    // STEP 4: Write header
    _writeHeader();

    // STEP 5: Write string table
    _writeStringTable();

    // ✅ NEW DEBUG: Verify string table is finalized
    printlog('[DEBUG] String table finalized - no more additions allowed');
    printlog('[DEBUG] Valid indices: 0-${_stringTable.length - 1}');
    printlog('[DEBUG] String table offset range: 8-${_buffer.length}');

    // STEP 6: Write relationships
    _relationshipsStartOffset = _buffer.length;
    _writeRelationshipsSection();

    // STEP 7: Write IR data
    _writeFileIRData(fileIR);

    // STEP 8: Write checksum
    if (_shouldWriteChecksum) {
      final dataBeforeChecksum = _buffer.toBytes();
      writeChecksum(dataBeforeChecksum);
    }

    if (_verbose) {
      _debugPrintStructure();
    }

    printlog('[✅ COMPLETE] Serialization successful: ${_buffer.length} bytes');
    return _buffer.toBytes();
  }

  void _debugPrintStructure() {
    printlog('\n=== BINARY STRUCTURE ===');
    printlog('Header: 0 - 8 bytes');
    printlog('String table: 8 - $_stringTableStartOffset bytes');
    printlog(
      'Relationships: $_stringTableStartOffset - $_relationshipsStartOffset bytes',
    );
    printlog('IR data: $_relationshipsStartOffset - $_irDataStartOffset bytes');
    printlog('Total: ${_buffer.length} bytes');
    printlog('=== END STRUCTURE ===\n');
  }

  // =========================================================================
  // HEADER WRITING
  // =========================================================================

  void _writeHeader() {
    try {
      writeUint32(BinaryConstants.MAGIC_NUMBER);
      writeUint16(BinaryConstants.FORMAT_VERSION);

      int flags = 0;
      if (_shouldWriteChecksum) {
        flags = BinaryConstants.setFlag(
          flags,
          BinaryConstants.FLAG_HAS_CHECKSUM,
        );
      }
      writeUint16(flags);
    } catch (e) {
      throw SerializationException(
        'Failed to write header: $e',
        offset: _buffer.length,
        context: 'header',
      );
    }
  }

  // =========================================================================
  // STRING TABLE WRITING
  // =========================================================================

  void _writeStringTable() {
    try {
      _stringTableStartOffset = _buffer.length;

      // String count
      writeUint32(_stringTable.length);

      // Write each string
      for (int i = 0; i < _stringTable.length; i++) {
        writeString(_stringTable[i]);
      }
    } catch (e) {
      throw SerializationException(
        'Failed to write string table: $e',
        offset: _buffer.length,
        context: 'string_table',
      );
    }
  }

  @override
  void addString(String str) {
    if (str.isEmpty) return;

    if (!_stringIndices.containsKey(str)) {
      final newIndex = _stringTable.length;
      _stringIndices[str] = newIndex;
      _stringTable.add(str);

      if (_verbose) {
        printlog('[ADD STRING] [$newIndex] "$str"');
      }
    }
  }

  @override
  int getStringRef(String str) {
    addString(str);
    return _stringIndices[str] ?? 0;
  }

  // =========================================================================
  // RELATIONSHIP SECTION WRITING
  // =========================================================================

  void _writeRelationshipsSection() {
    try {
      printlog('[WRITE RELATIONSHIPS] START - offset: ${_buffer.length}');

      int relationshipFlags = 0;
      if (_relationships.widgetToStateClass.isNotEmpty) {
        relationshipFlags |= 0x0001;
      }
      if (_relationships.stateLifecycleMethods.isNotEmpty) {
        relationshipFlags |= 0x0002;
      }
      if (_relationships.methodCalls.isNotEmpty) {
        relationshipFlags |= 0x0004;
      }
      if (_relationships.fieldAccesses.isNotEmpty) {
        relationshipFlags |= 0x0008;
      }
      if (_relationships.classHierarchy.isNotEmpty) {
        relationshipFlags |= 0x0010;
      }
      if (_relationships.interfaceImplementers.isNotEmpty) {
        relationshipFlags |= 0x0020;
      }
      if (_relationships.classBuildOutputs.isNotEmpty) {
        relationshipFlags |= 0x0040;
      }

      writeUint16(relationshipFlags);
      printlog(
        '[WRITE RELATIONSHIPS] Flags: 0x${relationshipFlags.toRadixString(16)}',
      );

      if (relationshipFlags & 0x0001 != 0) {
        _writeWidgetStateConnections();
      }
      if (relationshipFlags & 0x0002 != 0) {
        _writeStateLifecycleMethods();
      }
      if (relationshipFlags & 0x0004 != 0) {
        _writeMethodCallGraph();
      }
      if (relationshipFlags & 0x0008 != 0) {
        _writeFieldAccessGraph();
      }
      if (relationshipFlags & 0x0010 != 0) {
        _writeClassHierarchy();
      }
      if (relationshipFlags & 0x0020 != 0) {
        _writeInterfaceImplementers();
      }
      if (relationshipFlags & 0x0040 != 0) {
        _writeClassBuildOutputs();
      }

      printlog('[WRITE RELATIONSHIPS] END - offset: ${_buffer.length}');
    } catch (e) {
      throw SerializationException(
        'Failed to write relationships section: $e',
        offset: _buffer.length,
        context: 'relationships_section',
      );
    }
  }

  void _writeClassBuildOutputs() {
    printlog('[WRITE WIDGET-OUTPUTS] START');
    writeUint32(_relationships.classBuildOutputs.length);

    for (final entry in _relationships.classBuildOutputs.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value));
    }

    printlog('[WRITE WIDGET-OUTPUTS] END');
  }

  void _writeWidgetStateConnections() {
    printlog('[WRITE WIDGET-STATE] START');
    writeUint32(_relationships.widgetToStateClass.length);

    for (final entry in _relationships.widgetToStateClass.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value));
    }

    printlog(
      '[WRITE WIDGET-STATE] END - ${_relationships.widgetToStateClass.length} connections',
    );
  }

  void _writeStateLifecycleMethods() {
    printlog('[WRITE STATE-LIFECYCLE] START');
    writeUint32(_relationships.stateLifecycleMethods.length);

    for (final entry in _relationships.stateLifecycleMethods.entries) {
      writeUint32(getStringRef(entry.key));
      writeByte(entry.value.length);

      for (final methodEntry in entry.value.entries) {
        writeByte(methodEntry.key.index);
        writeUint32(getStringRef(methodEntry.value));
      }
    }

    writeUint32(_relationships.stateBuildMethods.length);
    for (final entry in _relationships.stateBuildMethods.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value));
    }

    printlog('[WRITE STATE-LIFECYCLE] END');
  }

  void _writeMethodCallGraph() {
    printlog('[WRITE METHOD-CALLS] START');
    writeUint32(_relationships.methodCalls.length);

    for (final entry in _relationships.methodCalls.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(entry.value.length);

      for (final calledMethodId in entry.value) {
        writeUint32(getStringRef(calledMethodId));
      }
    }

    printlog('[WRITE METHOD-CALLS] END');
  }

  void _writeFieldAccessGraph() {
    printlog('[WRITE FIELD-ACCESS] START');
    writeUint32(_relationships.fieldAccesses.length);

    for (final entry in _relationships.fieldAccesses.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(entry.value.length);

      for (final fieldId in entry.value) {
        writeUint32(getStringRef(fieldId));
      }
    }

    printlog('[WRITE FIELD-ACCESS] END');
  }

  void _writeClassHierarchy() {
    printlog('[WRITE CLASS-HIERARCHY] START');
    writeUint32(_relationships.classHierarchy.length);

    for (final entry in _relationships.classHierarchy.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value));
    }

    printlog('[WRITE CLASS-HIERARCHY] END');
  }

  void _writeInterfaceImplementers() {
    printlog('[WRITE INTERFACE-IMPLEMENTERS] START');
    writeUint32(_relationships.interfaceImplementers.length);

    for (final entry in _relationships.interfaceImplementers.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(entry.value.length);

      for (final implementerId in entry.value) {
        writeUint32(getStringRef(implementerId));
      }
    }

    printlog('[WRITE INTERFACE-IMPLEMENTERS] END');
  }

  // =========================================================================
  // FILE IR DATA WRITING
  // =========================================================================

  // ============================================================================
  // COMPLETE SECTION: _writeFileIRData - VERIFIED SYMMETRIC ORDER
  // ============================================================================

  void _writeFileIRData(DartFile fileIR) {
    try {
      _irDataStartOffset = _buffer.length;
      printlog('[WRITE FILE IR DATA] START - offset: $_irDataStartOffset');

      // ========== SECTION 1: Basic File Metadata ==========
      printlog('[SECTION 1] File metadata at offset: ${_buffer.length}');

      writeUint32(getStringRef(fileIR.filePath));
      printlog('  - filePath written at: ${_buffer.length - 4}');

      writeUint32(getStringRef(fileIR.contentHash));
      printlog('  - contentHash written at: ${_buffer.length - 4}');

      writeUint32(getStringRef(fileIR.library ?? "<unknown>"));
      printlog('  - library written at: ${_buffer.length - 4}');

      writeUint64(DateTime.now().millisecondsSinceEpoch);
      printlog('  - analyzedAt written at: ${_buffer.length - 8}');

      // ========== SECTION 2: Imports ==========
      printlog('[SECTION 2] Imports at offset: ${_buffer.length}');
      writeUint32(fileIR.imports.length);
      printlog(
        '  - importCount: ${fileIR.imports.length} at: ${_buffer.length - 4}',
      );

      for (int i = 0; i < fileIR.imports.length; i++) {
        try {
          writeImportStmt(fileIR.imports[i]);
          printlog('  - import $i written');
        } catch (e) {
          throw SerializationException(
            'Error writing import $i: $e',
            offset: _buffer.length,
            context: 'import_write',
          );
        }
      }

      // ========== SECTION 3: Exports ==========
      printlog('[SECTION 3] Exports at offset: ${_buffer.length}');
      writeUint32(fileIR.exports.length);
      printlog(
        '  - exportCount: ${fileIR.exports.length} at: ${_buffer.length - 4}',
      );

      for (int i = 0; i < fileIR.exports.length; i++) {
        try {
          writeExportStmt(fileIR.exports[i]);
          printlog('  - export $i written');
        } catch (e) {
          throw SerializationException(
            'Error writing export $i: $e',
            offset: _buffer.length,
            context: 'export_write',
          );
        }
      }

      // ========== SECTION 4: Variables ==========
      printlog('[SECTION 4] Variables at offset: ${_buffer.length}');
      writeUint32(fileIR.variableDeclarations.length);
      printlog(
        '  - varCount: ${fileIR.variableDeclarations.length} at: ${_buffer.length - 4}',
      );

      for (int i = 0; i < fileIR.variableDeclarations.length; i++) {
        try {
          writeVariableDecl(fileIR.variableDeclarations[i]);
          printlog('  - variable $i written');
        } catch (e) {
          throw SerializationException(
            'Error writing variable $i: $e',
            offset: _buffer.length,
            context: 'variable_write',
          );
        }
      }

      // ========== SECTION 5: Functions (Top-Level) ==========
      printlog('[SECTION 5] Functions at offset: ${_buffer.length}');
      writeUint32(fileIR.functionDeclarations.length);
      printlog(
        '  - funcCount: ${fileIR.functionDeclarations.length} at: ${_buffer.length - 4}',
      );

      for (int i = 0; i < fileIR.functionDeclarations.length; i++) {
        try {
          printlog(
            '  - Writing function $i/${fileIR.functionDeclarations.length}: '
            '${fileIR.functionDeclarations[i].name}',
          );
          writeFunctionDecl(fileIR.functionDeclarations[i]);
          printlog('  - function $i complete at offset: ${_buffer.length}');
        } catch (e) {
          printlog('[FUNCTION WRITE ERROR] Function $i: $e');
          throw SerializationException(
            'Error writing function $i: $e',
            offset: _buffer.length,
            context: 'function_write',
          );
        }
      }

      // ========== SECTION 6: Classes ==========
      printlog('[SECTION 6] Classes at offset: ${_buffer.length}');

      // Verify all class IDs are in string table
      for (int i = 0; i < fileIR.classDeclarations.length; i++) {
        final classDecl = fileIR.classDeclarations[i];
        if (!_stringIndices.containsKey(classDecl.id)) {
          throw SerializationException(
            'Class ID "${classDecl.id}" not in string table for class ${classDecl.name}',
            offset: _buffer.length,
            context: 'class_id_missing',
          );
        }
      }

      writeUint32(fileIR.classDeclarations.length);
      printlog(
        '  - classCount: ${fileIR.classDeclarations.length} at: ${_buffer.length - 4}',
      );

      for (int i = 0; i < fileIR.classDeclarations.length; i++) {
        try {
          printlog(
            '  - Writing class $i/${fileIR.classDeclarations.length}: '
            '${fileIR.classDeclarations[i].name}',
          );
          writeClassDecl(fileIR.classDeclarations[i]);
          printlog('  - class $i complete at offset: ${_buffer.length}');
        } catch (e) {
          printlog('[CLASS WRITE ERROR] Class $i: $e');
          throw SerializationException(
            'Error writing class $i: $e',
            offset: _buffer.length,
            context: 'class_write',
          );
        }
      }

      // ========== SECTION 7: Analysis Issues ==========
      printlog('[SECTION 7] Issues at offset: ${_buffer.length}');
      writeUint32(fileIR.analysisIssues.length);
      printlog(
        '  - issueCount: ${fileIR.analysisIssues.length} at: ${_buffer.length - 4}',
      );

      for (int i = 0; i < fileIR.analysisIssues.length; i++) {
        try {
          writeAnalysisIssue(fileIR.analysisIssues[i]);
          printlog('  - issue $i written');
        } catch (e) {
          throw SerializationException(
            'Error writing issue $i: $e',
            offset: _buffer.length,
            context: 'issue_write',
          );
        }
      }

      printlog('[WRITE FILE IR DATA] END at offset: ${_buffer.length}');
      printlog(
        '[WRITE FILE IR DATA] Total bytes written: ${_buffer.length - _irDataStartOffset}',
      );
    } catch (e) {
      printlog('[WRITE FILE IR DATA ERROR] $e');
      rethrow;
    }
  }

  void debugSerialize(DartFile fileIR) {
    printlog('\n=== DEBUG SERIALIZATION ===');

    printlog('\n1. Input validation:');
    printlog('   File path: "${fileIR.filePath}"');
    printlog('   Content hash: "${fileIR.contentHash}"');
    printlog('   Library: "${fileIR.library ?? '<unknown>'}"');
    printlog('   Imports: ${fileIR.imports.length}');
    printlog('   Exports: ${fileIR.exports.length}');
    printlog('   Variables: ${fileIR.variableDeclarations.length}');
    printlog('   Functions: ${fileIR.functionDeclarations.length}');
    printlog('   Classes: ${fileIR.classDeclarations.length}');

    printlog('\n2. Collecting strings...');
    final preCollectStrings = _stringTable.length;
    collectStrings(fileIR);
    printlog('   String table size: ${_stringTable.length}');
    printlog('   Strings added: ${_stringTable.length - preCollectStrings}');

    printlog('\n3. String table contents:');
    for (
      int i = 0;
      i < (_stringTable.length < 5 ? _stringTable.length : 5);
      i++
    ) {
      printlog('   [$i] "${_stringTable[i]}"');
    }
    if (_stringTable.length > 10) {
      printlog('   ...');
    }
    for (
      int i = (_stringTable.length > 5 ? _stringTable.length - 3 : 0);
      i < _stringTable.length;
      i++
    ) {
      if (i >= 5) {
        printlog('   [$i] "${_stringTable[i]}"');
      }
    }

    printlog('\n4. String deduplication stats:');
    printlog('   Unique strings: ${_stringTable.length}');
    printlog('   Max string index: ${_stringTable.length - 1}');

    printlog('\n=== END DEBUG ===\n');
  }

  @override
  void writeSourceLocation(SourceLocationIR location) {
    writeUint32(getStringRef(location.file));
    writeUint32(location.line);
    writeUint32(location.column);
    writeUint32(location.offset);
    writeUint32(location.length);
  }

  @override
  void printlog(String message) {
    // if (isVerbose) {
    print(message);
    // }
  }

  @override
  void writeByte(int value) {
    _buffer.addByte(value & 0xFF);
  }

  @override
  void writeUint16(int value) {
    _buffer.addByte((value & 0xFF));
    _buffer.addByte((value >> 8) & 0xFF);
  }

  @override
  void writeUint32(int value) {
    _buffer.addByte((value & 0xFF));
    _buffer.addByte((value >> 8) & 0xFF);
    _buffer.addByte((value >> 16) & 0xFF);
    _buffer.addByte((value >> 24) & 0xFF);
  }

  @override
  void writeInt64(int value) {
    writeUint32(value & 0xFFFFFFFF);
    writeUint32((value >> 32) & 0xFFFFFFFF);
  }

  @override
  void writeUint64(int value) {
    writeInt64(value);
  }

  @override
  void writeDouble(double value) {
    final bytes = Float64List(1)..[0] = value;
    _buffer.add(bytes.buffer.asUint8List());
  }

  @override
  void writeString(String str) {
    final bytes = utf8.encode(str);
    if (bytes.length > BinaryConstants.MAX_STRING_LENGTH) {
      throw SerializationException(
        'String too long: ${bytes.length} bytes (max ${BinaryConstants.MAX_STRING_LENGTH})',
        offset: _buffer.length,
        context: 'string_write',
      );
    }
    writeUint16(bytes.length);
    _buffer.add(bytes);
  }

  @override
  List<String> get stringTable => _stringTable;

  @override
  BytesBuilder get buffer => _buffer;

  @override
  void collectStringsFromImport(ImportStmt import) {
    for (final ann in import.annotations) {
      addString(ann.name);
    }
  }

  @override
  void writeExpression(ExpressionIR expr) {
    if (expr is LiteralExpressionIR) {
      writeByte(BinaryConstants.EXPR_LITERAL);
      writeLiteralExpression(expr);
    } else if (expr is IdentifierExpressionIR) {
      writeByte(BinaryConstants.EXPR_IDENTIFIER);
      writeUint32(getStringRef(expr.name));
    } else if (expr is BinaryExpressionIR) {
      writeByte(BinaryConstants.EXPR_BINARY);
      writeBinaryExpression(expr);
    } else if (expr is MethodCallExpressionIR) {
      writeByte(BinaryConstants.EXPR_METHOD_CALL);
      writeMethodCallExpression(expr);
    } else if (expr is PropertyAccessExpressionIR) {
      writeByte(BinaryConstants.EXPR_PROPERTY_ACCESS);
      writePropertyAccessExpression(expr);
    } else if (expr is ConditionalExpressionIR) {
      writeByte(BinaryConstants.EXPR_CONDITIONAL);
      writeConditionalExpression(expr);
    } else if (expr is ListExpressionIR) {
      writeByte(BinaryConstants.EXPR_LIST_LITERAL);
      writeListLiteralExpression(expr);
    } else if (expr is MapExpressionIR) {
      writeByte(BinaryConstants.EXPR_MAP_LITERAL);
      writeMapLiteralExpression(expr);
    } else if (expr is SetExpressionIR) {
      writeByte(BinaryConstants.EXPR_SET_LITERAL);
      writeSetExpression(expr);
    } else if (expr is UnaryExpressionIR) {
      writeByte(BinaryConstants.EXPR_UNARY);
      writeUnaryExpression(expr);
    } else if (expr is CompoundAssignmentExpressionIR) {
      writeByte(BinaryConstants.EXPR_COMPOUND_ASSIGNMENT);
      writeCompoundAssignmentExpression(expr);
    } else if (expr is AssignmentExpressionIR) {
      writeByte(BinaryConstants.EXPR_ASSIGNMENT);
      writeAssignmentExpression(expr);
    } else if (expr is IndexAccessExpressionIR) {
      writeByte(BinaryConstants.EXPR_INDEX_ACCESS);
      writeIndexAccessExpression(expr);
    } else if (expr is CascadeExpressionIR) {
      writeByte(BinaryConstants.EXPR_CASCADE);
      writeCascadeExpression(expr);
    } else if (expr is CastExpressionIR) {
      writeByte(BinaryConstants.EXPR_CAST);
      writeCastExpression(expr);
    } else if (expr is TypeCheckExpr) {
      writeByte(BinaryConstants.EXPR_TYPE_CHECK);
      writeTypeCheckExpression(expr);
    } else if (expr is AwaitExpr) {
      writeByte(BinaryConstants.EXPR_AWAIT);
      writeAwaitExpression(expr);
    } else if (expr is ThrowExpr) {
      writeByte(BinaryConstants.EXPR_THROW);
      writeThrowExpression(expr);
    } else if (expr is NullAwareAccessExpressionIR) {
      writeByte(BinaryConstants.EXPR_NULL_AWARE);
      writeNullAwareAccessExpression(expr);
    } else if (expr is NullCoalescingExpressionIR) {
      writeByte(BinaryConstants.OP_NULL_COALESCE);
      writeNullCoalescingExpression(expr);
    } else if (expr is FunctionCallExpr) {
      writeByte(BinaryConstants.EXPR_FUNCTION_CALL);
      writeFunctionCallExpression(expr);
    } else if (expr is StringInterpolationExpressionIR) {
      writeByte(BinaryConstants.EXPR_STRING_INTERPOLATION);
      writeStringInterpolationExpression(expr);
    } else if (expr is InstanceCreationExpressionIR) {
      writeByte(BinaryConstants.EXPR_INSTANCE_CREATION);
      writeInstanceCreationExpression(expr);
    } else if (expr is LambdaExpr) {
      writeByte(BinaryConstants.EXPR_LAMBDA);
      writeLambdaExpression(expr);
    } else if (expr is ThisExpressionIR) {
      writeByte(BinaryConstants.EXPR_THIS);
      writeThisExpression(expr);
    } else if (expr is SuperExpressionIR) {
      writeByte(BinaryConstants.EXPR_SUPER);
      writeSuperExpression(expr);
    } else if (expr is ParenthesizedExpressionIR) {
      writeByte(BinaryConstants.EXPR_PARENTHESIZED);
      writeParenthesizedExpression(expr);
    } else {
      writeByte(BinaryConstants.EXPR_UNKNOWN);
    }
  }

  @override
  void writeStatement(StatementIR stmt) {
    if (stmt is ExpressionStmt) {
      writeByte(BinaryConstants.STMT_EXPRESSION);
      writeExpressionStatement(stmt);
    } else if (stmt is VariableDeclarationStmt) {
      writeByte(BinaryConstants.STMT_VAR_DECL);
      writeVariableDeclarationStatement(stmt);
    } else if (stmt is ReturnStmt) {
      writeByte(BinaryConstants.STMT_RETURN);
      writeReturnStatement(stmt);
    } else if (stmt is BreakStmt) {
      writeByte(BinaryConstants.STMT_BREAK);
      writeBreakStatement(stmt);
    } else if (stmt is ContinueStmt) {
      writeByte(BinaryConstants.STMT_CONTINUE);
      writeContinueStatement(stmt);
    } else if (stmt is ThrowStmt) {
      writeByte(BinaryConstants.STMT_THROW);
      writeThrowStatement(stmt);
    } else if (stmt is AssertStatementIR) {
      writeByte(BinaryConstants.STMT_ASSERT);
      writeAssertStatement(stmt);
    } else if (stmt is EmptyStatementIR) {
      writeByte(BinaryConstants.STMT_EMPTY);
      writeEmptyStatement(stmt);
    } else if (stmt is BlockStmt) {
      writeByte(BinaryConstants.STMT_BLOCK);
      writeBlockStatement(stmt);
    } else if (stmt is IfStmt) {
      writeByte(BinaryConstants.STMT_IF);
      writeIfStatement(stmt);
    } else if (stmt is ForStmt) {
      writeByte(BinaryConstants.STMT_FOR);
      writeForStatement(stmt);
    } else if (stmt is ForEachStmt) {
      writeByte(BinaryConstants.STMT_FOR_EACH);
      writeForEachStatement(stmt);
    } else if (stmt is WhileStmt) {
      writeByte(BinaryConstants.STMT_WHILE);
      writeWhileStatement(stmt);
    } else if (stmt is DoWhileStmt) {
      writeByte(BinaryConstants.STMT_DO_WHILE);
      writeDoWhileStatement(stmt);
    } else if (stmt is SwitchStmt) {
      writeByte(BinaryConstants.STMT_SWITCH);
      writeSwitchStatement(stmt);
    } else if (stmt is TryStmt) {
      writeByte(BinaryConstants.STMT_TRY);
      writeTryStatement(stmt);
    } else if (stmt is LabeledStatementIR) {
      writeByte(BinaryConstants.STMT_LABELED);
      writeLabeledStatement(stmt);
    } else if (stmt is YieldStatementIR) {
      writeByte(BinaryConstants.STMT_YIELD);
      writeYieldStatement(stmt);
    } else if (stmt is FunctionDeclarationStatementIR) {
      writeByte(BinaryConstants.STMT_FUNCTION_DECL);
      writeFunctionDeclarationStatement(stmt);
    } else {
      writeByte(BinaryConstants.STMT_UNKNOWN);
    }
  }

  // ============================================================================
  // FUNCTION DECLARATION WRITER - CLEAN & SYNCHRONIZED
  // ============================================================================
  @override
  void writeFunctionDecl(FunctionDecl func) {
    printlog(
      '[WRITE FUNCTION] START - ${func.name} at offset ${buffer.length}',
    );

    try {
      // ========== SECTION 1: Basic Metadata ==========
      writeUint32(getStringRef(func.id));
      writeUint32(getStringRef(func.name));
      writeUint32(getStringRef(func.returnType.displayName()));
      printlog(
        '[WRITE FUNCTION] Section 1 (metadata) at offset ${buffer.length}',
      );

      // ========== SECTION 2: Documentation & Annotations ==========
      writeByte(func.documentation != null ? 1 : 0);
      if (func.documentation != null) {
        writeUint32(getStringRef(func.documentation!));
      }

      // Annotations
      writeUint32(func.annotations.length);
      for (final ann in func.annotations) {
        writeAnnotation(ann);
      }
      printlog(
        '[WRITE FUNCTION] Section 2 (documentation/annotations) at offset ${buffer.length}',
      );

      // ========== SECTION 3: Type Parameters ==========
      writeUint32(func.typeParameters.length);
      for (final tp in func.typeParameters) {
        writeUint32(getStringRef(tp.name));
        writeByte(tp.bound != null ? 1 : 0);
        if (tp.bound != null) {
          writeType(tp.bound!);
        }
      }
      printlog(
        '[WRITE FUNCTION] Section 3 (typeParameters) at offset ${buffer.length}',
      );

      // ========== SECTION 4: Parameters ==========
      writeUint32(func.parameters.length);
      for (final param in func.parameters) {
        writeParameterDecl(param);
      }
      printlog(
        '[WRITE FUNCTION] Section 4 (parameters) at offset ${buffer.length}',
      );

      // ========== SECTION 5: Source Location ==========
      writeSourceLocation(func.sourceLocation);
      printlog(
        '[WRITE FUNCTION] Section 5 (sourceLocation) at offset ${buffer.length}',
      );

      // ========== SECTION 6: Type-Specific Data ==========
      if (func is ConstructorDecl) {
        writeByte(1); // isConstructor flag

        writeUint32(getStringRef(func.constructorClass ?? ''));
        writeByte(func.constructorName != null ? 1 : 0);
        if (func.constructorName != null) {
          writeUint32(getStringRef(func.constructorName!));
        }

        writeByte(func.isConst ? 1 : 0);
        writeByte(func.isFactory ? 1 : 0);

        // Initializers
        writeUint32(func.initializers.length);
        for (final init in func.initializers) {
          writeUint32(getStringRef(init.fieldName));
          writeByte(init.isThisField ? 1 : 0);
          writeExpression(init.value);
          writeSourceLocation(init.sourceLocation);
        }

        // Super call
        writeByte(func.superCall != null ? 1 : 0);
        if (func.superCall != null) {
          writeByte(func.superCall!.constructorName != null ? 1 : 0);
          if (func.superCall!.constructorName != null) {
            writeUint32(getStringRef(func.superCall!.constructorName!));
          }
          writeUint32(func.superCall!.arguments.length);
          for (final arg in func.superCall!.arguments) {
            writeExpression(arg);
          }
          writeUint32(func.superCall!.namedArguments.length);
          for (final entry in func.superCall!.namedArguments.entries) {
            writeUint32(getStringRef(entry.key));
            writeExpression(entry.value);
          }
          writeSourceLocation(func.superCall!.sourceLocation);
        }

        // Redirected call
        writeByte(func.redirectedCall != null ? 1 : 0);
        if (func.redirectedCall != null) {
          writeByte(func.redirectedCall!.constructorName != null ? 1 : 0);
          if (func.redirectedCall!.constructorName != null) {
            writeUint32(getStringRef(func.redirectedCall!.constructorName!));
          }
          writeUint32(func.redirectedCall!.arguments.length);
          for (final arg in func.redirectedCall!.arguments) {
            writeExpression(arg);
          }
          writeUint32(func.redirectedCall!.namedArguments.length);
          for (final entry in func.redirectedCall!.namedArguments.entries) {
            writeUint32(getStringRef(entry.key));
            writeExpression(entry.value);
          }
          writeSourceLocation(func.redirectedCall!.sourceLocation);
        }

        printlog(
          '[WRITE FUNCTION] Section 6 (constructor-specific) at offset ${buffer.length}',
        );
      } else if (func is MethodDecl) {
        writeByte(2); // isMethod flag

        writeByte(func.className != null ? 1 : 0);
        if (func.className != null) {
          writeUint32(getStringRef(func.className!));
        }

        writeByte(func.overriddenSignature != null ? 1 : 0);
        if (func.overriddenSignature != null) {
          writeUint32(getStringRef(func.overriddenSignature!));
        }

        writeByte(func.isAsync ? 1 : 0);
        writeByte(func.isGenerator ? 1 : 0);

        printlog(
          '[WRITE FUNCTION] Section 6 (method-specific) at offset ${buffer.length}',
        );
      } else {
        writeByte(0); // Regular function
        printlog(
          '[WRITE FUNCTION] Section 6 (regular function) at offset ${buffer.length}',
        );
      }

      // ========== SECTION 7: Function Body ==========
      // THIS MUST MATCH READER EXACTLY
      writeFunctionBody(func.body);
      printlog('[WRITE FUNCTION] Section 7 (body) at offset ${buffer.length}');

      printlog(
        '[WRITE FUNCTION] END - ${func.name} at offset ${buffer.length}',
      );
    } catch (e) {
      printlog('[WRITE FUNCTION ERROR] ${func.name}: $e');
      rethrow;
    }
  }

  // ============================================================================
  // NEW METHOD: Write FunctionBody with extraction data
  // ============================================================================
  @override
  void writeFunctionBody(FunctionBodyIR? body) {
    writeByte(body != null ? 1 : 0);

    if (body == null) {
      printlog('[FUNCTION BODY] null body at offset: ${buffer.length}');
      return;
    }

    printlog('[FUNCTION BODY] START at offset: ${buffer.length}');

    // ========== Write statements count + statements ==========
    writeUint32(body.statements.length);
    printlog('[FUNCTION BODY] Statements: ${body.statements.length}');

    for (int i = 0; i < body.statements.length; i++) {
      try {
        writeStatement(body.statements[i]);
      } catch (e) {
        printlog('[FUNCTION BODY ERROR] Statement $i: $e');
        rethrow;
      }
    }

    // ========== Write expressions count + expressions ==========
    // THIS IS CRITICAL - READER MUST READ THIS TOO
    writeUint32(body.expressions.length);
    printlog('[FUNCTION BODY] Expressions: ${body.expressions.length}');

    for (int i = 0; i < body.expressions.length; i++) {
      try {
        writeExpression(body.expressions[i]);
      } catch (e) {
        printlog('[FUNCTION BODY ERROR] Expression $i: $e');
        rethrow;
      }
    }

    // ========== Write extraction data flag + data ==========
    writeByte(body.extractionData != null ? 1 : 0);
    printlog(
      '[FUNCTION BODY] Has extraction data: ${body.extractionData != null}',
    );

    if (body.extractionData != null) {
      writeExtractionData(body.extractionData!);
    }

    printlog('[FUNCTION BODY] END at offset: ${buffer.length}');
  }

  void writeExtractionData(FunctionExtractionData data) {
    printlog('[EXTRACTION DATA] Writing: ${data.extractionType}');

    // Write extraction type
    writeUint32(getStringRef(data.extractionType));

    // Write components count and data
    writeUint32(data.components.length);
    printlog('[EXTRACTION DATA] Components: ${data.components.length}');

    for (final component in data.components) {
      writeFlutterComponent(component);
    }

    // Write pure function data flag
    writeByte(data.pureFunctionData != null ? 1 : 0);
    if (data.pureFunctionData != null) {
      writePureFunctionComponent(data.pureFunctionData!);
    }

    // Write analysis data
    writeUint32(data.analysis.length);
    printlog('[EXTRACTION DATA] Analysis entries: ${data.analysis.length}');

    for (final entry in data.analysis.entries) {
      writeUint32(getStringRef(entry.key));
      // Write value as string representation
      final valueStr = entry.value.toString();
      writeUint32(getStringRef(valueStr));
    }

    // Write metadata
    writeExtractionMetadata(data.metadata);

    // Write metrics
    writeExtractionMetrics(data.metrics);

    // Write validation
    writeExtractionValidation(data.validation);

    // Write diagnostics
    writeUint32(data.diagnostics.length);
    for (final diag in data.diagnostics) {
      writeExtractionDiagnostic(diag);
    }

    printlog('[EXTRACTION DATA] Complete');
  }

  void writeFlutterComponent(FlutterComponent component) {
    if (component is WidgetComponent) {
      writeByte(0);
      writeWidgetComponent(component);
    } else if (component is ConditionalComponent) {
      writeByte(1);
      writeConditionalComponent(component);
    } else if (component is LoopComponent) {
      writeByte(2);
      writeLoopComponent(component);
    } else if (component is CollectionComponent) {
      writeByte(3);
      writeCollectionComponent(component);
    } else if (component is BuilderComponent) {
      writeByte(4);
      writeBuilderComponent(component);
    } else if (component is UnsupportedComponent) {
      writeByte(5);
      writeUnsupportedComponent(component);
    } else if (component is ContainerFallbackComponent) {
      writeByte(6);
      writeContainerFallbackComponent(component);
    } else {
      writeByte(5); // Fallback to unsupported
      writeUnsupportedComponent(
        UnsupportedComponent(
          id: component.id,
          sourceCode: component.describe(),
          reason: 'Unknown component type: ${component.runtimeType}',
          sourceLocation: component.sourceLocation,
        ),
      );
    }
  }

  void writeWidgetComponent(WidgetComponent widget) {
    writeUint32(getStringRef(widget.id));
    writeUint32(getStringRef(widget.widgetName));
    writeUint32(getStringRef(widget.constructorName ?? ''));
    writeByte(widget.isConst ? 1 : 0);
    writeSourceLocation(widget.sourceLocation);

    // Write properties
    writeUint32(widget.properties.length);
    for (final prop in widget.properties) {
      writePropertyBinding(prop);
    }

    // Write children
    writeUint32(widget.children.length);
    for (final child in widget.children) {
      writeFlutterComponent(child);
    }

    // ✅ ADD THIS: Widget metadata
    writeUint32(widget.metadata.length);
    for (final entry in widget.metadata.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }
  }

  void writeConditionalComponent(ConditionalComponent cond) {
    writeUint32(getStringRef(cond.id));
    writeUint32(getStringRef(cond.conditionCode));
    writeByte(cond.isTernary ? 1 : 0);
    writeSourceLocation(cond.sourceLocation);

    writeFlutterComponent(cond.thenComponent);

    writeByte(cond.elseComponent != null ? 1 : 0);
    if (cond.elseComponent != null) {
      writeFlutterComponent(cond.elseComponent!);
    }

    // ✅ ADD THIS: Conditional metadata
    writeUint32(cond.metadata.length);
    for (final entry in cond.metadata.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }
  }

  void writeLoopComponent(LoopComponent loop) {
    writeUint32(getStringRef(loop.id));
    writeUint32(getStringRef(loop.loopKind));
    writeUint32(getStringRef(loop.loopVariable ?? ''));
    writeUint32(getStringRef(loop.iterableCode ?? ''));
    writeUint32(getStringRef(loop.conditionCode ?? ''));
    writeSourceLocation(loop.sourceLocation);

    writeFlutterComponent(loop.bodyComponent);

    // ✅ ADD THIS: Loop metadata
    writeUint32(loop.metadata.length);
    for (final entry in loop.metadata.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }
  }

  void writeCollectionComponent(CollectionComponent coll) {
    writeUint32(getStringRef(coll.id));
    writeUint32(getStringRef(coll.collectionKind));
    writeByte(coll.hasSpread ? 1 : 0);
    writeSourceLocation(coll.sourceLocation);

    writeUint32(coll.elements.length);
    for (final elem in coll.elements) {
      writeFlutterComponent(elem);
    }

    // ✅ ADD THIS: Collection metadata
    writeUint32(coll.metadata.length);
    for (final entry in coll.metadata.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }
  }

  void writeBuilderComponent(BuilderComponent builder) {
    writeUint32(getStringRef(builder.id));
    writeUint32(getStringRef(builder.builderName));
    writeByte(builder.isAsync ? 1 : 0);
    writeSourceLocation(builder.sourceLocation);

    writeUint32(builder.parameters.length);
    for (final param in builder.parameters) {
      writeUint32(getStringRef(param));
    }

    writeUint32(getStringRef(builder.bodyDescription ?? ''));

    // ✅ ADD THIS: Builder metadata
    writeUint32(builder.metadata.length);
    for (final entry in builder.metadata.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }
  }

  void writeUnsupportedComponent(UnsupportedComponent unsupported) {
    writeUint32(getStringRef(unsupported.id));
    writeUint32(getStringRef(unsupported.sourceCode));
    writeUint32(getStringRef(unsupported.reason ?? ''));
    writeSourceLocation(unsupported.sourceLocation);

    // ✅ ADD THIS: Unsupported metadata
    writeUint32(unsupported.metadata.length);
    for (final entry in unsupported.metadata.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }
  }

  void writeContainerFallbackComponent(ContainerFallbackComponent container) {
    writeUint32(getStringRef(container.id));
    writeUint32(getStringRef(container.reason));
    writeSourceLocation(container.sourceLocation);

    writeByte(container.wrappedComponent != null ? 1 : 0);
    if (container.wrappedComponent != null) {
      writeFlutterComponent(container.wrappedComponent!);
    }

    // ✅ ADD THIS: Container metadata
    writeUint32(container.metadata.length);
    for (final entry in container.metadata.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }
  }

  void writePropertyBinding(PropertyBinding binding) {
    if (binding is LiteralPropertyBinding) {
      writeByte(0);
      writeUint32(getStringRef(binding.name));
      writeUint32(getStringRef(binding.value));
    } else if (binding is CallbackPropertyBinding) {
      writeByte(1);
      writeUint32(getStringRef(binding.name));
      writeUint32(getStringRef(binding.value));
      writeByte(binding.isAsync ? 1 : 0);
      writeUint32(binding.parameters.length);
      for (final param in binding.parameters) {
        writeUint32(getStringRef(param));
      }
    } else if (binding is BuilderPropertyBinding) {
      writeByte(2);
      writeUint32(getStringRef(binding.name));
      writeUint32(getStringRef(binding.value));
      writeUint32(binding.parameters.length);
      for (final param in binding.parameters) {
        writeUint32(getStringRef(param));
      }
    }
  }

  void writePureFunctionComponent(FlutterComponent component) {
    if (component is ComputationFunctionData) {
      writeByte(0);
      writeComputationFunctionData(component);
    } else if (component is ValidationFunctionData) {
      writeByte(1);
      writeValidationFunctionData(component);
    } else if (component is FactoryFunctionData) {
      writeByte(2);
      writeFactoryFunctionData(component);
    } else if (component is HelperFunctionData) {
      writeByte(3);
      writeHelperFunctionData(component);
    } else if (component is MixedFunctionData) {
      writeByte(4);
      writeMixedFunctionData(component);
    }
  }

  void writeComputationFunctionData(ComputationFunctionData data) {
    writeUint32(getStringRef(data.id));
    writeUint32(getStringRef(data.displayName));
    writeUint32(getStringRef(data.inputType));
    writeUint32(getStringRef(data.outputType));
    writeUint32(data.loopDepth);
    writeUint32(data.conditionalDepth);
    writeSourceLocation(data.sourceLocation);

    // Write analysis map
    writeUint32(data.analysis.length);
    for (final entry in data.analysis.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }

    // Write computation steps
    writeUint32(data.computationSteps.length);
    for (final step in data.computationSteps) {
      writeStatement(step);
    }
  }

  void writeValidationFunctionData(ValidationFunctionData data) {
    writeUint32(getStringRef(data.id));
    writeUint32(getStringRef(data.displayName));
    writeUint32(getStringRef(data.targetType));
    writeUint32(getStringRef(data.returnType));
    writeSourceLocation(data.sourceLocation);

    // Write validation rules
    writeUint32(data.validationRules.length);
    for (final rule in data.validationRules) {
      writeUint32(getStringRef(rule));
    }

    // Write analysis map
    writeUint32(data.analysis.length);
    for (final entry in data.analysis.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }

    // Write validation steps
    writeUint32(data.validationSteps.length);
    for (final step in data.validationSteps) {
      writeStatement(step);
    }
  }

  void writeFactoryFunctionData(FactoryFunctionData data) {
    writeUint32(getStringRef(data.id));
    writeUint32(getStringRef(data.displayName));
    writeUint32(getStringRef(data.producedType));
    writeSourceLocation(data.sourceLocation);

    // Write parameters
    writeUint32(data.parameters.length);
    for (final param in data.parameters) {
      writeUint32(getStringRef(param));
    }

    // Write initialized fields
    writeUint32(data.initializedFields.length);
    for (final field in data.initializedFields) {
      writeUint32(getStringRef(field));
    }

    // Write analysis map
    writeUint32(data.analysis.length);
    for (final entry in data.analysis.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }

    // Write creation steps
    writeUint32(data.creationSteps.length);
    for (final step in data.creationSteps) {
      writeStatement(step);
    }
  }

  void writeHelperFunctionData(HelperFunctionData data) {
    writeUint32(getStringRef(data.id));
    writeUint32(getStringRef(data.displayName));
    writeUint32(getStringRef(data.purpose));
    writeSourceLocation(data.sourceLocation);

    // Write side effects
    writeUint32(data.sideEffects.length);
    for (final effect in data.sideEffects) {
      writeUint32(getStringRef(effect));
    }

    // Write analysis map
    writeUint32(data.analysis.length);
    for (final entry in data.analysis.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }

    // Write steps
    writeUint32(data.steps.length);
    for (final step in data.steps) {
      writeStatement(step);
    }
  }

  void writeMixedFunctionData(MixedFunctionData data) {
    writeUint32(getStringRef(data.id));
    writeUint32(getStringRef(data.displayName));
    writeSourceLocation(data.sourceLocation);

    // Write components
    writeUint32(data.components.length);
    for (final component in data.components) {
      writeFlutterComponent(component);
    }

    // Write analysis map
    writeUint32(data.analysis.length);
    for (final entry in data.analysis.entries) {
      writeUint32(getStringRef(entry.key));
      writeUint32(getStringRef(entry.value.toString()));
    }
  }

  // ============================================================================
  // NEW METHOD: Write ExtractionValidation
  // ============================================================================

  void writeExtractionValidation(ExtractionValidation validation) {
    writeByte(validation.isValid ? 1 : 0);

    writeUint32(validation.errors.length);
    for (final error in validation.errors) {
      writeUint32(getStringRef(error));
    }
  }

  // ============================================================================
  // NEW METHOD: Write ExtractionDiagnostic
  // ============================================================================

  void writeExtractionDiagnostic(ExtractionDiagnostic diagnostic) {
    writeByte(diagnostic.level.index);
    writeUint32(getStringRef(diagnostic.message));
    writeUint32(getStringRef(diagnostic.code ?? ''));
  }

  void writeExtractionMetadata(FunctionMetadata metadata) {
    writeUint32(getStringRef(metadata.name));
    writeUint32(getStringRef(metadata.type));
    writeByte(metadata.isAsync ? 1 : 0);
    writeByte(metadata.isGenerator ? 1 : 0);

    writeByte(metadata.returnType != null ? 1 : 0);
    if (metadata.returnType != null) {
      writeUint32(getStringRef(metadata.returnType!));
    }
  }

  // ============================================================================
  // NEW METHOD: Write ExtractionMetrics
  // ============================================================================

  void writeExtractionMetrics(ExtractionMetrics metrics) {
    writeUint64(metrics.duration.inMilliseconds);
    writeUint32(metrics.componentsExtracted);
    writeUint32(metrics.expressionsAnalyzed);
    writeUint32(metrics.statementsProcessed);
  }

  @override
  void collectStringsFromExpression(ExpressionIR? expr) {
    if (expr == null) return;

    if (expr is LiteralExpressionIR) {
      if (expr.literalType == LiteralType.stringValue) {
        addString(expr.value as String);
      }
    } else if (expr is IdentifierExpressionIR) {
      addString(expr.name);
    } else if (expr is BinaryExpressionIR) {
      collectStringsFromExpression(expr.left);
      collectStringsFromExpression(expr.right);
    } else if (expr is MethodCallExpressionIR) {
      collectStringsFromExpression(expr.target);
      addString(expr.methodName);
      for (final arg in expr.arguments) {
        collectStringsFromExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        collectStringsFromExpression(arg);
      }
    } else if (expr is PropertyAccessExpressionIR) {
      collectStringsFromExpression(expr.target);
      addString(expr.propertyName);
    } else if (expr is ConditionalExpressionIR) {
      collectStringsFromExpression(expr.condition);
      collectStringsFromExpression(expr.thenExpression);
      collectStringsFromExpression(expr.elseExpression);
    } else if (expr is ListExpressionIR) {
      for (final elem in expr.elements) {
        collectStringsFromExpression(elem);
      }
    } else if (expr is MapExpressionIR) {
      for (final entry in expr.entries) {
        collectStringsFromExpression(entry.key);
        collectStringsFromExpression(entry.value);
      }
    } else if (expr is SetExpressionIR) {
      for (final elem in expr.elements) {
        collectStringsFromExpression(elem);
      }
    } else if (expr is IndexAccessExpressionIR) {
      collectStringsFromExpression(expr.target);
      collectStringsFromExpression(expr.index);
    } else if (expr is UnaryExpressionIR) {
      collectStringsFromExpression(expr.operand);
    } else if (expr is AssignmentExpressionIR) {
      collectStringsFromExpression(expr.target);
      collectStringsFromExpression(expr.value);
    } else if (expr is CastExpressionIR) {
      collectStringsFromExpression(expr.expression);
      addString(expr.targetType.displayName());
    } else if (expr is TypeCheckExpr) {
      collectStringsFromExpression(expr.expression);
      addString(expr.typeToCheck.displayName());
    } else if (expr is AwaitExpr) {
      collectStringsFromExpression(expr.futureExpression);
    } else if (expr is ThrowExpr) {
      collectStringsFromExpression(expr.exceptionExpression);
    } else if (expr is NullAwareAccessExpressionIR) {
      collectStringsFromExpression(expr.target);
      if (expr.operationData != null) {
        addString(expr.operationData!);
      }
    } else if (expr is NullCoalescingExpressionIR) {
      collectStringsFromExpression(expr.left);
      collectStringsFromExpression(expr.right);
    } else if (expr is FunctionCallExpr) {
      addString(expr.functionName);
      for (final arg in expr.arguments) {
        collectStringsFromExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        collectStringsFromExpression(arg);
      }
    } else if (expr is InstanceCreationExpressionIR) {
      // ✓ NEW: Add widget class name
      addString(expr.type.displayName());

      if (expr.constructorName != null) {
        addString(expr.constructorName!);
      }

      // ✓ NEW: Add named parameter names (child, children, etc.)
      for (final argName in expr.namedArguments.keys) {
        addString(argName);
      }

      // Recursively collect from arguments
      for (final arg in expr.arguments) {
        collectStringsFromExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        collectStringsFromExpression(arg);
      }
    } else if (expr is LambdaExpr) {
      for (final param in expr.parameters) {
        addString(param.id);
        addString(param.name);
        addString(param.type.displayName());
        if (param.defaultValue != null) {
          collectStringsFromExpression(param.defaultValue);
        }
        addString(param.sourceLocation.file);
      }
      if (expr.body != null) {
        collectStringsFromExpression(expr.body);
      }
    } else if (expr is StringInterpolationExpressionIR) {
      for (final part in expr.parts) {
        if (part.isExpression) {
          collectStringsFromExpression(part.expression);
        } else {
          addString(part.text!);
        }
      }
    } else if (expr is ThisExpressionIR) {
      // No strings to collect
    } else if (expr is SuperExpressionIR) {
      // No strings to collect
    } else if (expr is ParenthesizedExpressionIR) {
      collectStringsFromExpression(expr.innerExpression);
    } else if (expr is CompoundAssignmentExpressionIR) {
      collectStringsFromExpression(expr.target);
      collectStringsFromExpression(expr.value);
    } else if (expr is CascadeExpressionIR) {
      collectStringsFromExpression(expr.target);
      for (final section in expr.cascadeSections) {
        collectStringsFromExpression(section);
      }
    }
  }

  @override
  void collectStringsFromVariable(VariableDecl variable) {
    addString(variable.id);
    addString(variable.name);
    addString(variable.type.displayName());
    addString(variable.sourceLocation.file);
    if (variable.initializer != null) {
      collectStringsFromExpression(variable.initializer);
    }
  }

  void collectStringsFromExtractionData(FunctionExtractionData data) {
    addString(data.extractionType);

    for (final component in data.components) {
      collectStringsFromFlutterComponent(component);
    }

    if (data.pureFunctionData != null) {
      collectStringsFromFlutterComponent(data.pureFunctionData!);
    }

    for (final entry in data.analysis.entries) {
      addString(entry.key);
      addString(entry.value.toString());
    }

    addString(data.metadata.name);
    addString(data.metadata.type);
    if (data.metadata.returnType != null) {
      addString(data.metadata.returnType!);
    }

    for (final diag in data.diagnostics) {
      addString(diag.message);
      if (diag.code != null) {
        addString(diag.code);
      }
    }
  }

  void collectStringsFromFlutterComponent(FlutterComponent component) {
    addString(component.id);
    addString(component.describe());
    addString(component.sourceLocation.file);

    if (component is WidgetComponent) {
      addString(component.widgetName);
      if (component.constructorName != null) {
        addString(component.constructorName!);
      }
      for (final prop in component.properties) {
        addString(prop.name);
        addString(prop.value);
      }
      for (final child in component.children) {
        collectStringsFromFlutterComponent(child);
      }
    } else if (component is ConditionalComponent) {
      addString(component.conditionCode);
      collectStringsFromFlutterComponent(component.thenComponent);
      if (component.elseComponent != null) {
        collectStringsFromFlutterComponent(component.elseComponent!);
      }
    } else if (component is LoopComponent) {
      addString(component.loopKind);
      if (component.loopVariable != null) {
        addString(component.loopVariable!);
      }
      if (component.iterableCode != null) {
        addString(component.iterableCode!);
      }
      if (component.conditionCode != null) {
        addString(component.conditionCode!);
      }
      collectStringsFromFlutterComponent(component.bodyComponent);
    } else if (component is CollectionComponent) {
      addString(component.collectionKind);
      for (final elem in component.elements) {
        collectStringsFromFlutterComponent(elem);
      }
    } else if (component is BuilderComponent) {
      addString(component.builderName);
      for (final param in component.parameters) {
        addString(param);
      }
      if (component.bodyDescription != null) {
        addString(component.bodyDescription!);
      }
    } else if (component is UnsupportedComponent) {
      addString(component.sourceCode);
      if (component.reason != null) {
        addString(component.reason!);
      }
    } else if (component is ComputationFunctionData) {
      addString(component.displayName);
      addString(component.inputType);
      addString(component.outputType);
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    } else if (component is ValidationFunctionData) {
      addString(component.displayName);
      addString(component.targetType);
      addString(component.returnType);
      for (final rule in component.validationRules) {
        addString(rule);
      }
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    } else if (component is FactoryFunctionData) {
      addString(component.displayName);
      addString(component.producedType);
      for (final param in component.parameters) {
        addString(param);
      }
      for (final field in component.initializedFields) {
        addString(field);
      }
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    } else if (component is HelperFunctionData) {
      addString(component.displayName);
      addString(component.purpose);
      for (final effect in component.sideEffects) {
        addString(effect);
      }
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    } else if (component is MixedFunctionData) {
      addString(component.displayName);
      for (final subComponent in component.components) {
        collectStringsFromFlutterComponent(subComponent);
      }
      for (final entry in component.analysis.entries) {
        addString(entry.key);
        addString(entry.value.toString());
      }
    }
  }

  @override
  void collectStringsFromClass(ClassDecl classDecl) {
    // ✅ MUST collect class ID and name FIRST
    addString(classDecl.id);
    addString(classDecl.name);
    addString(classDecl.sourceLocation.file);
    if (classDecl.documentation != null) addString(classDecl.documentation!);

    if (classDecl.superclass != null) {
      addString(classDecl.superclass!.displayName());
    }

    // ✅ Interfaces
    for (final iface in classDecl.interfaces) {
      addString(iface.displayName());
    }

    // ✅ Mixins
    for (final mixin in classDecl.mixins) {
      addString(mixin.displayName());
    }

    // ✅ Fields - COLLECT FIELD ID!
    for (final field in classDecl.fields) {
      addString(field.id); // ← CRITICAL! This must be collected
      addString(field.name);
      addString(field.type.displayName());
      addString(field.sourceLocation.file);
      if (field.initializer != null) {
        collectStringsFromExpression(field.initializer);
      }
    }

    // ✅ Methods - COLLECT METHOD ID!
    for (final method in classDecl.methods) {
      addString(method.id); // ← CRITICAL! This must be collected
      addString(method.name);
      addString(method.returnType.displayName());
      addString(method.sourceLocation.file);

      // Collect from annotations
      for (final ann in method.annotations) {
        addString(ann.name);
      }

      for (final param in method.parameters) {
        addString(param.id);
        addString(param.name);
        addString(param.type.displayName());
        addString(param.sourceLocation.file);
        if (param.defaultValue != null) {
          collectStringsFromExpression(param.defaultValue);
        }
      }

      // ✅ MUST collect from method body - NOW WITH EXTRACTION DATA!
      if (method.body != null) {
        collectStringsFromStatements(method.body!.statements);
        collectStringsFromExpressions(method.body!.expressions);

        // ✅ NEW: Collect from extraction data in FunctionBodyIR
        if (method.body!.extractionData != null) {
          collectStringsFromExtractionData(method.body!.extractionData!);
        }
      }
    }

    // ✅ Constructors - COLLECT CONSTRUCTOR ID!
    for (final constructor in classDecl.constructors) {
      addString(constructor.id); // ← CRITICAL! This must be collected
      addString(constructor.name);
      addString(constructor.constructorClass ?? "<unknown>");
      if (constructor.constructorName != null) {
        addString(constructor.constructorName!);
      }
      addString(constructor.sourceLocation.file);

      for (final param in constructor.parameters) {
        addString(param.id);
        addString(param.name);
        addString(param.type.displayName());
        addString(param.sourceLocation.file);
        if (param.defaultValue != null) {
          collectStringsFromExpression(param.defaultValue);
        }
      }

      // ✅ MUST collect from initializers
      for (final init in constructor.initializers) {
        addString(init.fieldName);
        collectStringsFromExpression(init.value);
      }

      // ✅ MUST collect from constructor body - NOW WITH EXTRACTION DATA!
      if (constructor.body != null) {
        collectStringsFromStatements(constructor.body!.statements);
        collectStringsFromExpressions(constructor.body!.expressions);

        // ✅ NEW: Collect from extraction data in FunctionBodyIR
        if (constructor.body!.extractionData != null) {
          collectStringsFromExtractionData(constructor.body!.extractionData!);
        }
      }
    }
  }

  // ✅ Helper method to collect from list of expressions
  void collectStringsFromExpressions(List<ExpressionIR> expressions) {
    for (final expr in expressions) {
      collectStringsFromExpression(expr);
    }
  }

  @override
  void collectStringsFromAnalysisIssues(DartFile fileIR) {
    for (final issue in fileIR.analysisIssues) {
      addString(issue.id);
      addString(issue.code);
      addString(issue.message);
      if (issue.suggestion != null) {
        addString(issue.suggestion!);
      }
      addString(issue.sourceLocation.file);
    }
  }

  @override
  void writeClassDecl(ClassDecl classDecl) {
    final startOffset = _buffer.length;
    printlog('\n[WRITE CLASS START] ${classDecl.name} at offset: $startOffset');
    printlog('[CLASS] id: ${classDecl.id}');
    printlog('[CLASS] name: ${classDecl.name}');

    // STEP 1: Write class ID
    try {
      final idRef = getStringRef(classDecl.id);
      printlog(
        '[CLASS] id stringRef: $idRef (table size: ${_stringTable.length})',
      );
      writeUint32(idRef);
    } catch (e) {
      printlog('[CLASS ERROR] Failed to write id: $e');
      rethrow;
    }
    printlog('[CLASS] After id: ${_buffer.length}');

    // STEP 2: Write class name
    try {
      final nameRef = getStringRef(classDecl.name);
      printlog(
        '[CLASS] name stringRef: $nameRef (table size: ${_stringTable.length})',
      );
      writeUint32(nameRef);
    } catch (e) {
      printlog('[CLASS ERROR] Failed to write name: $e');
      rethrow;
    }
    printlog('[CLASS] After name: ${_buffer.length}');

    // STEP 3: Write flags
    writeByte(classDecl.isAbstract ? 1 : 0);
    writeByte(classDecl.isFinal ? 1 : 0);
    printlog('[CLASS] After flags: ${_buffer.length}');

    // STEP 4: Write superclass
    writeByte(classDecl.superclass != null ? 1 : 0);
    if (classDecl.superclass != null) {
      writeType(classDecl.superclass!);
    }
    printlog('[CLASS] After superclass: ${_buffer.length}');

    // STEP 5: Write interfaces
    printlog('[CLASS] interfaces count: ${classDecl.interfaces.length}');
    writeUint32(classDecl.interfaces.length);
    for (int i = 0; i < classDecl.interfaces.length; i++) {
      try {
        writeType(classDecl.interfaces[i]);
        printlog('[CLASS] Interface $i written');
      } catch (e) {
        printlog('[CLASS ERROR] Failed to write interface $i: $e');
        rethrow;
      }
    }
    printlog('[CLASS] After interfaces: ${_buffer.length}');

    // STEP 6: Write mixins
    printlog('[CLASS] mixins count: ${classDecl.mixins.length}');
    writeUint32(classDecl.mixins.length);
    for (int i = 0; i < classDecl.mixins.length; i++) {
      try {
        writeType(classDecl.mixins[i]);
        printlog('[CLASS] Mixin $i written');
      } catch (e) {
        printlog('[CLASS ERROR] Failed to write mixin $i: $e');
        rethrow;
      }
    }
    printlog('[CLASS] After mixins: ${_buffer.length}');

    // STEP 7: Write fields
    printlog('[CLASS] fields count: ${classDecl.fields.length}');
    writeUint32(classDecl.fields.length);
    for (int i = 0; i < classDecl.fields.length; i++) {
      try {
        printlog('[CLASS] Writing field $i/${classDecl.fields.length}');
        final fieldStartOffset = _buffer.length;
        writeFieldDecl(classDecl.fields[i]);
        final fieldEndOffset = _buffer.length;
        printlog(
          '[CLASS] Field $i: ${fieldEndOffset - fieldStartOffset} bytes',
        );
      } catch (e) {
        printlog('[CLASS ERROR] Failed to write field $i: $e');
        rethrow;
      }
    }
    printlog('[CLASS] After fields: ${_buffer.length}');

    // STEP 8: Write methods
    printlog('[CLASS] methods count: ${classDecl.methods.length}');
    writeUint32(classDecl.methods.length);
    for (int i = 0; i < classDecl.methods.length; i++) {
      try {
        printlog(
          '[CLASS] Writing method $i/${classDecl.methods.length}: ${classDecl.methods[i].name}',
        );
        final methodStartOffset = _buffer.length;
        writeMethodDecl(classDecl.methods[i]);
        final methodEndOffset = _buffer.length;
        printlog(
          '[CLASS] Method $i: ${methodEndOffset - methodStartOffset} bytes',
        );
      } catch (e) {
        printlog(
          '[CLASS ERROR] Failed to write method $i/${classDecl.methods.length}: $e',
        );
        rethrow;
      }
    }
    printlog('[CLASS] After methods: ${_buffer.length}');

    // STEP 9: Write constructors
    printlog('[CLASS] constructors count: ${classDecl.constructors.length}');
    writeUint32(classDecl.constructors.length);
    for (int i = 0; i < classDecl.constructors.length; i++) {
      try {
        printlog(
          '[CLASS] Writing constructor $i/${classDecl.constructors.length}',
        );
        final ctorStartOffset = _buffer.length;
        writeConstructorDecl(classDecl.constructors[i]);
        final ctorEndOffset = _buffer.length;
        printlog(
          '[CLASS] Constructor $i: ${ctorEndOffset - ctorStartOffset} bytes',
        );
      } catch (e) {
        printlog('[CLASS ERROR] Failed to write constructor $i: $e');
        rethrow;
      }
    }
    printlog('[CLASS] After constructors: ${_buffer.length}');

    // STEP 10: Write source location
    try {
      printlog('[CLASS] sourceLocation file: ${classDecl.sourceLocation.file}');
      writeSourceLocation(classDecl.sourceLocation);
    } catch (e) {
      printlog('[CLASS ERROR] Failed to write sourceLocation: $e');
      rethrow;
    }

    final endOffset = _buffer.length;
    final totalBytes = endOffset - startOffset;
    printlog(
      '[WRITE CLASS END] ${classDecl.name}: $totalBytes bytes ($startOffset-$endOffset)\n',
    );
  }

  @override
  void collectStringsFromFunction(FunctionDecl func) {
    printlog('[COLLECT FUNCTION] ${func.name}');
    addString(func.id);
    addString(func.name);
    addString(func.returnType.displayName());
    addString(func.sourceLocation.file);

    if (func.documentation != null) {
      addString(func.documentation!);
    }

    for (final param in func.parameters) {
      addString(param.id);
      addString(param.name);
      addString(param.type.displayName());
      addString(param.sourceLocation.file);
      if (param.defaultValue != null) {
        collectStringsFromExpression(param.defaultValue);
      }
    }

    for (final ann in func.annotations) {
      addString(ann.name);
    }

    for (final tp in func.typeParameters) {
      addString(tp.name);
      if (tp.bound != null) {
        addString(tp.bound!.displayName());
      }
    }

    // ✅ UPDATED: Collect from function body with new FunctionBodyIR structure
    if (func.body != null) {
      // ✅ Collect from statements list
      collectStringsFromStatements(func.body!.statements);

      // ✅ Collect from expressions list
      collectStringsFromExpressions(func.body!.expressions);

      // ✅ Collect from extraction data
      if (func.body!.extractionData != null) {
        collectStringsFromExtractionData(func.body!.extractionData!);
      }
    }

    if (func is ConstructorDecl) {
      if (func.constructorClass != null) {
        addString(func.constructorClass!);
      }
      if (func.constructorName != null) {
        addString(func.constructorName!);
      }
      for (final init in func.initializers) {
        addString(init.fieldName);
        collectStringsFromExpression(init.value);
      }
    }

    if (func is MethodDecl) {
      if (func.className != null) {
        addString(func.className!);
      }
      if (func.overriddenSignature != null) {
        addString(func.overriddenSignature!);
      }
    }
  }
}

/// Enhanced exception with context information
class SerializationException implements Exception {
  final String message;
  final int offset;
  final String context;

  SerializationException(
    this.message, {
    required this.offset,
    this.context = 'unknown',
  });

  @override
  String toString() =>
      'SerializationException [$context] at offset $offset: $message';
}
