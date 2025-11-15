import 'dart:typed_data';

import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/declaration_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/expression_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/relationship_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/statement_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/string_collection.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/type_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/writer.dart';

import '../../ast_ir/dart_file_builder.dart';
import 'ir_relationship_registry.dart';
import '../binary_constain.dart';
import 'validator_file.dart';

/// Serializes Flutter IR to binary format with checksums and validation
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
  // RELATIONSHIP TRACKING - NEW
  // =========================================================================
  late IRRelationshipRegistry _relationships;
  // ValidatorFile validatorFile = ValidatorFile();
  int _relationshipsStartOffset = 0;

  int _stringTableStartOffset = 0;
  int _irDataStartOffset = 0;

  bool _shouldWriteChecksum = true;
  bool _verbose = false;

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Serialize a DartFile IR to binary format
  Uint8List writeFileIR(DartFile fileIR, {bool verbose = false}) {
    _verbose = verbose;

    // =====================================================================
    // STEP 0: INITIALIZE RELATIONSHIP REGISTRY
    // =====================================================================
    _relationships = IRRelationshipRegistry();
    printlog('[INIT] Relationship registry created');

    // =====================================================================
    // STEP 1: Validate before doing any work
    // =====================================================================
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

    try {
      // ===================================================================
      // STEP 2: Build relationship map before collecting strings
      // ===================================================================
      buildRelationships(fileIR);

      // Step 3: Collect all strings for deduplication
      collectStrings(fileIR);
      collectStringsFromRelationships();

      // Step 4: Write header
      _writeHeader();

      // Step 5: Write string table
      _writeStringTable();

      // ===================================================================
      // STEP 6: WRITE RELATIONSHIP SECTION - NEW
      // ===================================================================
      _relationshipsStartOffset = _buffer.length;
      _writeRelationshipsSection();
      printlog(
        '[WRITE] Relationships section at offset: $_relationshipsStartOffset',
      );

      // Step 7: Write IR data
      _writeFileIRData(fileIR);

      // ===================================================================
      // STEP 8: Write checksum if enabled
      // ===================================================================
      if (_shouldWriteChecksum) {
        final dataBeforeChecksum = _buffer.toBytes();
        writeChecksum(dataBeforeChecksum);
      }

      if (_verbose) {
        _debugPrintStructure();
      }

      return _buffer.toBytes();
    } catch (e) {
      if (e is SerializationException) rethrow;
      throw SerializationException(
        'Serialization failed: $e',
        offset: _buffer.length,
        context: 'writeFileIR',
      );
    }
  }

  // =============================================================================
  // FUNCTION SERIALIZATION - BinaryIRWriter
  // =============================================================================

  /// Add these methods to BinaryIRWriter class

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

  void _addString(String str) {
    if (str.isEmpty) return;

    if (!_stringIndices.containsKey(str)) {
      _stringIndices[str] = _stringTable.length;
      _stringTable.add(str);
    }
  }

  int _getStringRef(String str) {
    _addString(str);
    return _stringIndices[str] ?? 0;
  }

  // =========================================================================
  // RELATIONSHIP SECTION WRITING - NEW
  // =========================================================================

  void _writeRelationshipsSection() {
    try {
      printlog('[WRITE RELATIONSHIPS] START - offset: ${_buffer.length}');

      // Write flags indicating which relationships are present
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

      writeUint16(relationshipFlags);
      printlog(
        '[WRITE RELATIONSHIPS] Flags: 0x${relationshipFlags.toRadixString(16)}',
      );

      // Write each relationship type
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

      printlog('[WRITE RELATIONSHIPS] END - offset: ${_buffer.length}');
    } catch (e) {
      throw SerializationException(
        'Failed to write relationships section: $e',
        offset: _buffer.length,
        context: 'relationships_section',
      );
    }
  }

  void _writeWidgetStateConnections() {
    printlog('[WRITE WIDGET-STATE] START');
    writeUint32(_relationships.widgetToStateClass.length);

    for (final entry in _relationships.widgetToStateClass.entries) {
      writeUint32(_getStringRef(entry.key));
      writeUint32(_getStringRef(entry.value));
    }

    printlog(
      '[WRITE WIDGET-STATE] END - ${_relationships.widgetToStateClass.length} connections',
    );
  }

  void _writeStateLifecycleMethods() {
    printlog('[WRITE STATE-LIFECYCLE] START');
    writeUint32(_relationships.stateLifecycleMethods.length);

    for (final entry in _relationships.stateLifecycleMethods.entries) {
      writeUint32(_getStringRef(entry.key));
      writeByte(entry.value.length);

      for (final methodEntry in entry.value.entries) {
        writeByte(methodEntry.key.index);
        writeUint32(_getStringRef(methodEntry.value));
      }
    }

    // Write build methods
    writeUint32(_relationships.stateBuildMethods.length);
    for (final entry in _relationships.stateBuildMethods.entries) {
      writeUint32(_getStringRef(entry.key));
      writeUint32(_getStringRef(entry.value));
    }

    printlog('[WRITE STATE-LIFECYCLE] END');
  }

  void _writeMethodCallGraph() {
    printlog('[WRITE METHOD-CALLS] START');
    writeUint32(_relationships.methodCalls.length);

    for (final entry in _relationships.methodCalls.entries) {
      writeUint32(_getStringRef(entry.key));
      writeUint32(entry.value.length);

      for (final calledMethodId in entry.value) {
        writeUint32(_getStringRef(calledMethodId));
      }
    }

    printlog('[WRITE METHOD-CALLS] END');
  }

  void _writeFieldAccessGraph() {
    printlog('[WRITE FIELD-ACCESS] START');
    writeUint32(_relationships.fieldAccesses.length);

    for (final entry in _relationships.fieldAccesses.entries) {
      writeUint32(_getStringRef(entry.key));
      writeUint32(entry.value.length);

      for (final fieldId in entry.value) {
        writeUint32(_getStringRef(fieldId));
      }
    }

    printlog('[WRITE FIELD-ACCESS] END');
  }

  void _writeClassHierarchy() {
    printlog('[WRITE CLASS-HIERARCHY] START');
    writeUint32(_relationships.classHierarchy.length);

    for (final entry in _relationships.classHierarchy.entries) {
      writeUint32(_getStringRef(entry.key));
      writeUint32(_getStringRef(entry.value));
    }

    printlog('[WRITE CLASS-HIERARCHY] END');
  }

  void _writeInterfaceImplementers() {
    printlog('[WRITE INTERFACE-IMPLEMENTERS] START');
    writeUint32(_relationships.interfaceImplementers.length);

    for (final entry in _relationships.interfaceImplementers.entries) {
      writeUint32(_getStringRef(entry.key));
      writeUint32(entry.value.length);

      for (final implementerId in entry.value) {
        writeUint32(_getStringRef(implementerId));
      }
    }

    printlog('[WRITE INTERFACE-IMPLEMENTERS] END');
  }

  // =========================================================================
  // EXISTING METHODS (PLACEHOLDER)
  // =========================================================================

  void _writeFileIRData(DartFile fileIR) {
    try {
      _irDataStartOffset = _buffer.length;
      printlog('[WRITE FILE IR DATA] START');

      // File metadata
      writeUint32(_getStringRef(fileIR.filePath));
      printlog('[WRITE FILE IR] After filePath: ${_buffer.length}');

      writeUint32(_getStringRef(fileIR.contentHash));
      printlog('[WRITE FILE IR] After contentHash: ${_buffer.length}');

      writeUint32(_getStringRef(fileIR.library ?? "<unknown>"));
      printlog('[WRITE FILE IR] After library: ${_buffer.length}');

      // Analysis metadata
      writeUint64(DateTime.now().millisecondsSinceEpoch);
      printlog('[WRITE FILE IR] After analyzedAt: ${_buffer.length}');

      // Imports
      writeUint32(fileIR.imports.length);
      printlog(
        '[WRITE FILE IR] After importCount: ${_buffer.length}, count: ${fileIR.imports.length}',
      );

      for (final import in fileIR.imports) {
        writeImportStmt(import);
      }
      printlog('[WRITE FILE IR] After imports loop: ${_buffer.length}');

      // Exports
      writeUint32(fileIR.exports.length);
      printlog(
        '[WRITE FILE IR] After exportCount: ${_buffer.length}, count: ${fileIR.exports.length}',
      );

      for (final export in fileIR.exports) {
        writeExportStmt(export);
      }
      printlog('[WRITE FILE IR] After exports loop: ${_buffer.length}');

      // Top-level variables
      writeUint32(fileIR.variableDeclarations.length);
      printlog('[WRITE FILE IR] After varCount: ${_buffer.length}');

      for (final variable in fileIR.variableDeclarations) {
        writeVariableDecl(variable);
      }
      printlog('[WRITE FILE IR] After variables: ${_buffer.length}');

      // Functions
      writeUint32(fileIR.functionDeclarations.length);
      printlog('[WRITE FILE IR] After funcCount: ${_buffer.length}');

      for (final func in fileIR.functionDeclarations) {
        writeFunctionDecl(func);
      }
      printlog('[WRITE FILE IR] After functions: ${_buffer.length}');

      // Classes
      writeUint32(fileIR.classDeclarations.length);
      printlog('[WRITE FILE IR] After classCount: ${_buffer.length}');

      for (final classDecl in fileIR.classDeclarations) {
        writeClassDecl(classDecl);
      }
      printlog('[WRITE FILE IR] After classes: ${_buffer.length}');

      // Analysis issues
      writeUint32(fileIR.analysisIssues.length);
      printlog('[WRITE FILE IR] After issueCount: ${_buffer.length}');

      for (final issue in fileIR.analysisIssues) {
        writeAnalysisIssue(issue);
      }
      printlog('[WRITE FILE IR] After issues: ${_buffer.length}');
      printlog('[WRITE FILE IR DATA] END');
    } catch (e) {
      throw SerializationException(
        'Failed to write file IR data: $e',
        offset: _buffer.length,
        context: 'file_ir_data',
      );
    }
  }

  /// Add this method to BinaryIRWriter to validate before writing
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

    // Check string collection
    printlog('\n2. Collecting strings...');
    final preCollectStrings = _stringTable.length;
    collectStrings(fileIR);
    printlog('   String table size: ${_stringTable.length}');
    printlog('   Strings added: ${_stringTable.length - preCollectStrings}');

    // Show first and last few strings
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

    printlog('\n5. Potential issues to check:');
    printlog('   ✓ Are string references within 0-${_stringTable.length - 1}?');
    printlog('   ✓ Check BinaryIRWriter._getStringRef() returns valid indices');
    printlog('   ✓ Verify string table size matches actual strings');

    printlog('\n=== END DEBUG ===\n');
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
