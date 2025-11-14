import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/declaration_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/expression_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/relationship_writer.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/type_writer.dart';

import '../../ast_ir/dart_file_builder.dart';

import '../../ast_ir/diagnostics/source_location.dart';
import '../../ast_ir/function_decl.dart';
import '../../ast_ir/import_export_stmt.dart';

import '../../ast_ir/variable_decl.dart';
import 'ir_relationship_registry.dart';
import '../binary_constain.dart';
import 'validator_file.dart';

/// Serializes Flutter IR to binary format with checksums and validation
class BinaryIRWriter
    with TypeWriter, ExpressionWriter, RelationshipWriter, DeclarationWriter {
  final BytesBuilder _buffer = BytesBuilder();
  final List<String> _stringTable = [];
  final Map<String, int> _stringIndices = {};

  // =========================================================================
  // RELATIONSHIP TRACKING - NEW
  // =========================================================================
  late IRRelationshipRegistry _relationships;
  ValidatorFile validatorFile = ValidatorFile();
  int _relationshipsStartOffset = 0;

  int _stringTableStartOffset = 0;
  int _irDataStartOffset = 0;

  bool _headerWritten = false;
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
    final validationErrors = validatorFile.validateFileIR(fileIR);
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
      _collectStrings(fileIR);
      _collectStringsFromRelationships();

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
        _writeChecksum(dataBeforeChecksum);
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

  void _collectStringsFromFunction(FunctionDecl func) {
    printlog('[COLLECT FUNCTION] ${func.name}');

    _addString(func.id);
    _addString(func.name);
    _addString(func.returnType.displayName());
    _addString(func.sourceLocation.file);

    if (func.documentation != null) {
      _addString(func.documentation!);
    }

    // Collect from parameters
    for (final param in func.parameters) {
      _addString(param.id);
      _addString(param.name);
      _addString(param.type.displayName());
      _addString(param.sourceLocation.file);
      if (param.defaultValue != null) {
        collectStringsFromExpression(param.defaultValue);
      }
    }

    // Collect from annotations
    for (final ann in func.annotations) {
      _addString(ann.name);
    }

    // Collect from type parameters
    for (final tp in func.typeParameters) {
      _addString(tp.name);
      if (tp.bound != null) {
        _addString(tp.bound!.displayName());
      }
    }

    // For constructors
    if (func is ConstructorDecl) {
      if (func.constructorClass != null) {
        _addString(func.constructorClass!);
      }
      if (func.constructorName != null) {
        _addString(func.constructorName!);
      }
    }

    // For methods
    if (func is MethodDecl) {
      if (func.className != null) {
        _addString(func.className!);
      }
      if (func.overriddenSignature != null) {
        _addString(func.overriddenSignature!);
      }
    }
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
  // STEP 0: BUILD RELATIONSHIPS - NEW
  // =========================================================================

  // =========================================================================
  // HEADER WRITING
  // =========================================================================

  void _writeHeader() {
    try {
      _writeUint32(BinaryConstants.MAGIC_NUMBER);
      _writeUint16(BinaryConstants.FORMAT_VERSION);

      int flags = 0;
      if (_shouldWriteChecksum) {
        flags = BinaryConstants.setFlag(
          flags,
          BinaryConstants.FLAG_HAS_CHECKSUM,
        );
      }
      _writeUint16(flags);

      _headerWritten = true;
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

  void _collectStringsFromRelationships() {
    // Collect lifecycle method type names
    for (final entry in _relationships.stateLifecycleMethods.entries) {
      for (final method in entry.value.values) {
        _addString(method);
      }
    }

    // Collect widget-state connection names
    for (final entry in _relationships.widgetToStateClass.entries) {
      _addString(entry.key);
      _addString(entry.value);
    }

    // Collect method call names
    for (final entry in _relationships.methodCalls.entries) {
      _addString(entry.key);
      for (final calledId in entry.value) {
        _addString(calledId);
      }
    }

    // Collect field access names
    for (final entry in _relationships.fieldAccesses.entries) {
      _addString(entry.key);
      for (final fieldId in entry.value) {
        _addString(fieldId);
      }
    }

    // Collect class hierarchy
    for (final entry in _relationships.classHierarchy.entries) {
      _addString(entry.key);
      _addString(entry.value);
    }

    printlog('[COLLECT] Relationship strings collected');
  }

  void _writeStringTable() {
    try {
      _stringTableStartOffset = _buffer.length;

      // String count
      _writeUint32(_stringTable.length);

      // Write each string
      for (int i = 0; i < _stringTable.length; i++) {
        _writeString(_stringTable[i]);
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

  void _collectStrings(DartFile fileIR) {
    _addString(fileIR.filePath);
    _addString(fileIR.contentHash);
    _addString(fileIR.library ?? "<unknown>");

    printlog('[COLLECT] File: ${fileIR.filePath}');
    printlog('[COLLECT] Imports: ${fileIR.imports.length}');
    printlog('[COLLECT] Exports: ${fileIR.exports.length}'); // ← Add this
    printlog('[COLLECT] Classes: ${fileIR.classDeclarations.length}');
    printlog('[COLLECT] Function: ${fileIR.functionDeclarations.length}');

    // Collect from imports
    for (final import in fileIR.imports) {
      _addString(import.uri);
      _addString(import.sourceLocation.file);
      if (import.prefix != null) _addString(import.prefix!);
      for (final show in import.showList) _addString(show);
      for (final hide in import.hideList) _addString(hide);
      collectStringsFromImport(import); // ← ADD THIS
    }

    for (final export in fileIR.exports) {
      _addString(export.uri);
      _addString(export.sourceLocation.file); // ← ADD THIS
      for (final show in export.showList) _addString(show);
      for (final hide in export.hideList) _addString(hide);
    }
    // Collect from functions
    for (final func in fileIR.functionDeclarations) {
      _collectStringsFromFunction(func);
    }

    // Collect from variables
    for (final variable in fileIR.variableDeclarations) {
      collectStringsFromVariable(variable);
    }

    // Collect from classes
    for (final classDecl in fileIR.classDeclarations) {
      collectStringsFromClass(classDecl);
    }
    collectStringsFromAnalysisIssues(fileIR);
    printlog('[COLLECT] String table size: ${_stringTable.length}');
    if (_verbose) {
      debugPrintStringTable();
    }
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

      _writeUint16(relationshipFlags);
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
    _writeUint32(_relationships.widgetToStateClass.length);

    for (final entry in _relationships.widgetToStateClass.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeUint32(_getStringRef(entry.value));
    }

    printlog(
      '[WRITE WIDGET-STATE] END - ${_relationships.widgetToStateClass.length} connections',
    );
  }

  void _writeStateLifecycleMethods() {
    printlog('[WRITE STATE-LIFECYCLE] START');
    _writeUint32(_relationships.stateLifecycleMethods.length);

    for (final entry in _relationships.stateLifecycleMethods.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeByte(entry.value.length);

      for (final methodEntry in entry.value.entries) {
        _writeByte(methodEntry.key.index);
        _writeUint32(_getStringRef(methodEntry.value));
      }
    }

    // Write build methods
    _writeUint32(_relationships.stateBuildMethods.length);
    for (final entry in _relationships.stateBuildMethods.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeUint32(_getStringRef(entry.value));
    }

    printlog('[WRITE STATE-LIFECYCLE] END');
  }

  void _writeMethodCallGraph() {
    printlog('[WRITE METHOD-CALLS] START');
    _writeUint32(_relationships.methodCalls.length);

    for (final entry in _relationships.methodCalls.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeUint32(entry.value.length);

      for (final calledMethodId in entry.value) {
        _writeUint32(_getStringRef(calledMethodId));
      }
    }

    printlog('[WRITE METHOD-CALLS] END');
  }

  void _writeFieldAccessGraph() {
    printlog('[WRITE FIELD-ACCESS] START');
    _writeUint32(_relationships.fieldAccesses.length);

    for (final entry in _relationships.fieldAccesses.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeUint32(entry.value.length);

      for (final fieldId in entry.value) {
        _writeUint32(_getStringRef(fieldId));
      }
    }

    printlog('[WRITE FIELD-ACCESS] END');
  }

  void _writeClassHierarchy() {
    printlog('[WRITE CLASS-HIERARCHY] START');
    _writeUint32(_relationships.classHierarchy.length);

    for (final entry in _relationships.classHierarchy.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeUint32(_getStringRef(entry.value));
    }

    printlog('[WRITE CLASS-HIERARCHY] END');
  }

  void _writeInterfaceImplementers() {
    printlog('[WRITE INTERFACE-IMPLEMENTERS] START');
    _writeUint32(_relationships.interfaceImplementers.length);

    for (final entry in _relationships.interfaceImplementers.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeUint32(entry.value.length);

      for (final implementerId in entry.value) {
        _writeUint32(_getStringRef(implementerId));
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
      _writeUint32(_getStringRef(fileIR.filePath));
      printlog('[WRITE FILE IR] After filePath: ${_buffer.length}');

      _writeUint32(_getStringRef(fileIR.contentHash));
      printlog('[WRITE FILE IR] After contentHash: ${_buffer.length}');

      _writeUint32(_getStringRef(fileIR.library ?? "<unknown>"));
      printlog('[WRITE FILE IR] After library: ${_buffer.length}');

      // Analysis metadata
      _writeUint64(DateTime.now().millisecondsSinceEpoch);
      printlog('[WRITE FILE IR] After analyzedAt: ${_buffer.length}');

      // Imports
      _writeUint32(fileIR.imports.length);
      printlog(
        '[WRITE FILE IR] After importCount: ${_buffer.length}, count: ${fileIR.imports.length}',
      );

      for (final import in fileIR.imports) {
        _writeImportStmt(import);
      }
      printlog('[WRITE FILE IR] After imports loop: ${_buffer.length}');

      // Exports
      _writeUint32(fileIR.exports.length);
      printlog(
        '[WRITE FILE IR] After exportCount: ${_buffer.length}, count: ${fileIR.exports.length}',
      );

      for (final export in fileIR.exports) {
        _writeExportStmt(export);
      }
      printlog('[WRITE FILE IR] After exports loop: ${_buffer.length}');

      // Top-level variables
      _writeUint32(fileIR.variableDeclarations.length);
      printlog('[WRITE FILE IR] After varCount: ${_buffer.length}');

      for (final variable in fileIR.variableDeclarations) {
        _writeVariableDecl(variable);
      }
      printlog('[WRITE FILE IR] After variables: ${_buffer.length}');

      // Functions
      _writeUint32(fileIR.functionDeclarations.length);
      printlog('[WRITE FILE IR] After funcCount: ${_buffer.length}');

      for (final func in fileIR.functionDeclarations) {
        writeFunctionDecl(func);
      }
      printlog('[WRITE FILE IR] After functions: ${_buffer.length}');

      // Classes
      _writeUint32(fileIR.classDeclarations.length);
      printlog('[WRITE FILE IR] After classCount: ${_buffer.length}');

      for (final classDecl in fileIR.classDeclarations) {
        writeClassDecl(classDecl);
      }
      printlog('[WRITE FILE IR] After classes: ${_buffer.length}');

      // Analysis issues
      _writeUint32(fileIR.analysisIssues.length);
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

  void _writeImportStmt(ImportStmt import) {
    printlog('[WRITE IMPORT] START - buffer offset: ${_buffer.length}');

    _writeUint32(_getStringRef(import.uri));
    printlog('[WRITE IMPORT] After uri: ${_buffer.length}');

    _writeByte(import.prefix != null ? 1 : 0);
    printlog('[WRITE IMPORT] After prefix flag: ${_buffer.length}');

    if (import.prefix != null) {
      _writeUint32(_getStringRef(import.prefix!));
      printlog('[WRITE IMPORT] After prefix value: ${_buffer.length}');
    }

    _writeByte(import.isDeferred ? 1 : 0);
    printlog('[WRITE IMPORT] After deferred: ${_buffer.length}');

    _writeUint32(import.showList.length);
    printlog('[WRITE IMPORT] After showCount: ${_buffer.length}');

    for (final show in import.showList) {
      _writeUint32(_getStringRef(show));
    }
    printlog('[WRITE IMPORT] After showList: ${_buffer.length}');

    _writeUint32(import.hideList.length);
    printlog('[WRITE IMPORT] After hideCount: ${_buffer.length}');

    for (final hide in import.hideList) {
      _writeUint32(_getStringRef(hide));
    }
    printlog('[WRITE IMPORT] After hideList: ${_buffer.length}');

    _writeSourceLocation(import.sourceLocation);
    printlog('[WRITE IMPORT] After sourceLocation: ${_buffer.length}');
    printlog('[WRITE IMPORT] END - total bytes written: ${_buffer.length}');
  }

  void _writeExportStmt(ExportStmt export) {
    printlog('[WRITE EXPORT] START - buffer offset: ${_buffer.length}');

    _writeUint32(_getStringRef(export.uri));
    printlog('[WRITE EXPORT] After uri: ${_buffer.length}');

    _writeUint32(export.showList.length);
    printlog('[WRITE EXPORT] After showCount: ${_buffer.length}');

    for (final show in export.showList) {
      _writeUint32(_getStringRef(show));
    }
    printlog('[WRITE EXPORT] After showList: ${_buffer.length}');

    _writeUint32(export.hideList.length);
    printlog('[WRITE EXPORT] After hideCount: ${_buffer.length}');

    for (final hide in export.hideList) {
      _writeUint32(_getStringRef(hide));
    }
    printlog('[WRITE EXPORT] After hideList: ${_buffer.length}');

    _writeSourceLocation(export.sourceLocation);
    printlog('[WRITE EXPORT] After sourceLocation: ${_buffer.length}');
    printlog('[WRITE EXPORT] END');
  }

  void _writeVariableDecl(VariableDecl variable) {
    printlog('[WRITE Variable] START - buffer offset: ${_buffer.length}');
    _writeUint32(_getStringRef(variable.id));
    printlog('[WRITE Variable] After id: ${_buffer.length}');
    _writeUint32(_getStringRef(variable.name));
    printlog('[WRITE Variable] After name: ${_buffer.length}');
    writeType(variable.type);
    printlog('[WRITE Variable] After type: ${_buffer.length}');
    _writeByte(variable.isFinal ? 1 : 0);
    printlog('[WRITE Variable] After isFinal: ${_buffer.length}');
    _writeByte(variable.isConst ? 1 : 0);
    printlog('[WRITE Variable] After isConst: ${_buffer.length}');
    _writeByte(variable.isStatic ? 1 : 0);
    printlog('[WRITE Variable] After isStatic: ${_buffer.length}');
    _writeByte(variable.isLate ? 1 : 0);
    printlog('[WRITE Variable] After isLate: ${_buffer.length}');
    _writeByte(variable.isPrivate ? 1 : 0);
    printlog('[WRITE Variable] After isPrivate: ${_buffer.length}');

    _writeByte(variable.initializer != null ? 1 : 0);
    printlog('[WRITE Variable] After initializer: ${_buffer.length}');
    if (variable.initializer != null) {
      writeExpression(variable.initializer!);
    }
    printlog('[WRITE Variable] After initializer: ${_buffer.length}');

    _writeSourceLocation(variable.sourceLocation);
    printlog('[WRITE Variable] After sourceLocation: ${_buffer.length}');
    printlog('[WRITE Variable] END');
  }

  // =========================================================================
  // TYPE WRITING
  // =========================================================================

  // =========================================================================
  // EXPRESSION WRITING
  // =========================================================================

  // =========================================================================
  // STATEMENT WRITING
  // =========================================================================

  // =========================================================================
  // SOURCE LOCATION WRITING
  // =========================================================================

  void _writeSourceLocation(SourceLocationIR location) {
    _writeUint32(_getStringRef(location.file));
    _writeUint32(location.line);
    _writeUint32(location.column);
    _writeUint32(location.offset);
    _writeUint32(location.length);
  }

  // =========================================================================
  // CHECKSUM WRITING (PRIORITY 1)
  // =========================================================================

  /// Computes SHA256 checksum of data and appends it to buffer
  void _writeChecksum(Uint8List data) {
    try {
      final digest = sha256.convert(data);
      final checksumBytes = digest.bytes;
      _buffer.add(checksumBytes);
    } catch (e) {
      throw SerializationException(
        'Failed to compute checksum: $e',
        offset: _buffer.length,
        context: 'checksum_write',
      );
    }
  }

  // =========================================================================
  // LOW-LEVEL BINARY WRITING
  // =========================================================================

  void _writeByte(int value) {
    _buffer.addByte(value & 0xFF);
  }

  void _writeUint16(int value) {
    _buffer.addByte((value & 0xFF));
    _buffer.addByte((value >> 8) & 0xFF);
  }

  void _writeUint32(int value) {
    _buffer.addByte((value & 0xFF));
    _buffer.addByte((value >> 8) & 0xFF);
    _buffer.addByte((value >> 16) & 0xFF);
    _buffer.addByte((value >> 24) & 0xFF);
  }

  void _writeInt64(int value) {
    _writeUint32(value & 0xFFFFFFFF);
    _writeUint32((value >> 32) & 0xFFFFFFFF);
  }

  void _writeUint64(int value) {
    _writeInt64(value);
  }

  void _writeDouble(double value) {
    final bytes = Float64List(1)..[0] = value;
    _buffer.add(bytes.buffer.asUint8List());
  }

  void _writeString(String str) {
    final bytes = utf8.encode(str);
    if (bytes.length > BinaryConstants.MAX_STRING_LENGTH) {
      throw SerializationException(
        'String too long: ${bytes.length} bytes (max ${BinaryConstants.MAX_STRING_LENGTH})',
        offset: _buffer.length,
        context: 'string_write',
      );
    }
    _writeUint16(bytes.length);
    _buffer.add(bytes);
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
    _collectStrings(fileIR);
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

  void printlog(String message) {
    if (_verbose) {
      print(message);
    }
  }

  void debugPrintStringTable() {
    print('\n=== STRING TABLE DEBUG ===');
    print('Total strings: ${_stringTable.length}');
    for (int i = 0; i < _stringTable.length; i++) {
      print('  [$i] "${_stringTable[i]}"');
    }
    print('=== END STRING TABLE ===\n');
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
