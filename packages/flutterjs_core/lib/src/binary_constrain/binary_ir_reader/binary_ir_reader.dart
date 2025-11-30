// ============================================================================
// FILE: binary_ir_reader.dart (UPDATED SECTIONS ONLY)
// Deserializes Flutter IR with widget metadata attachment
// ============================================================================

import 'dart:convert';
import 'dart:math' as Math;
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/ir/flutter/widget_metadata.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/declaration_reader.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/expression_reader.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/reader.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/type_reader.dart';

import '../../analysis/extraction/flutter_component_system.dart';
import '../binary_ir_writer/ir_relationship_registry.dart';
import 'statement_reader.dart';

/// ============================================================================
/// binary_ir_reader.dart
/// Binary IR Reader — Reconstructs FlutterJS IR From Binary Format
/// ============================================================================
///
/// Responsible for **decoding the entire FlutterJS Intermediate Representation**
/// from the binary format produced by:
/// → `binary_ir_writer.dart`
///
/// This file orchestrates all readers:
/// - `expression_reader.dart`
/// - `statement_reader.dart`
/// - `type_reader.dart`
/// - `declaration_reader.dart`
/// - relationship deserialization
/// - binary structure validation
///
/// It is the exact inverse of the Binary IR Writer, ensuring the IR graph is
/// reconstructed with total fidelity.
///
///
/// # Purpose
///
/// The FlutterJS compiler stores IR in a **compact binary format**.
/// BinaryIRReader turns that byte stream back into a fully structured IR tree:
///
/// - widget metadata
/// - declarations
/// - types
/// - statements
/// - expressions
/// - relationships
///
/// This enables:
/// - debugging
/// - JS code generation
/// - visualization tools
/// - re-analysis or incremental rebuilds
///
///
/// # Responsibilities
///
/// ## 1. Entry Point for Full IR Deserialization
///
/// ```dart
/// IRRoot root = BinaryIRReader(bytes).read();
/// ```
///
/// Coordinates sub-readers to decode all IR components.
///
///
/// ## 2. Read and Verify Binary Headers
///
/// Validates:
/// - magic number
/// - binary schema version
/// - section layout
///
/// Failure results in:
/// - `BinaryFormatException`
///
///
/// ## 3. Read String Table
///
/// Reads:
/// - string count
/// - UTF-8 blobs
/// - rebuilds StringTable mapping
///
/// All named IR components depend on this table.
///
///
/// ## 4. Deserialize Types
///
/// Calls:
/// ```dart
/// typeReader.readType();
/// ```
///
/// Rebuilds:
/// - primitives
/// - class types
/// - function types
/// - generic structures
///
///
/// ## 5. Deserialize Declarations
///
/// Reads:
/// - variable declarations
/// - function definitions
/// - constructor signatures
///
/// via:
/// ```dart
/// declarationReader.readDeclaration();
/// ```
///
///
/// ## 6. Deserialize Statements
///
/// Function bodies and procedural logic reconstructed through:
///
/// ```dart
/// statementReader.readStatement();
/// ```
///
///
/// ## 7. Deserialize Expressions
///
/// For every expression-like field:
///
/// ```dart
/// expressionReader.readExpression();
/// ```
///
///
/// ## 8. Deserialize Relationships
///
/// Loads IR graph edges:
/// - parent → child
/// - declaration → reference
/// - type → usage
///
/// Ensures IR graph integrity.
///
///
/// ## 9. Build Complete IR Tree
///
/// Once all sections are decoded:
/// - nodes are linked
/// - parent/child structure restored
/// - declarations tied to references
///
///
/// # Example Usage
///
/// ```dart
/// final reader = BinaryIRReader(bytes);
/// final ir = reader.read();
/// ```
///
///
/// # Error Handling
///
/// Throws:
/// - `BinaryFormatException`
/// - `IRValidationException` (if semantic issues found)
/// - `RangeError` for string/offset violations
///
///
/// # Notes
///
/// - Must remain 100% symmetric with Binary IR Writer.
/// - Changes in encoding require matching updates here.
/// - Must rebuild relationships *after* nodes are read.
/// - Decoder must gracefully detect broken or partial binaries.
///
///
/// ============================================================================
///

class BinaryIRReader
    with
        Reader,
        StatementReader,
        SourceLocation,
        ExpressionReader,
        TypeReader,
        DeclarationReader {
  late ByteData _data;
  late List<String> _stringTable;
  int _offset = 0;
  bool _hasChecksumFlag = false;
  bool _verbose = false;

  // ✓ NEW: Relationship registry for widget metadata
  late IRRelationshipRegistry _relationships;

  // ✅ NEW: Tracking for diagnostics
  int _stringTableStartOffset = 0;
  int _stringTableEndOffset = 0;


  /// Deserialize a DartFile IR from binary format
  DartFile readFileIR(Uint8List bytes, {bool verbose = false}) {
    _verbose = verbose;

    printlog('\n=== START BINARY IR READER ===\n');
    if (bytes.length < BinaryConstants.HEADER_SIZE) {
      throw SerializationException(
        'File too small: ${bytes.length} bytes (minimum ${BinaryConstants.HEADER_SIZE})',
        offset: 0,
      );
    }

    _data = ByteData.view(bytes.buffer);
    _offset = 0;
    _stringTable = [];
    _relationships = IRRelationshipRegistry();

    try {
      // Step 1: Read and validate header
      _readHeader();

      // Step 2: Read string table with diagnostics
      _stringTableStartOffset = _offset;
      readStringTable();
      _stringTableEndOffset = _offset;

      // ✅ DIAGNOSTIC: Validate string table
      _validateStringTableIntegrity();

      // Step 3a: Read relationships section
      _readRelationshipsSection();

      // Step 3b: Read IR data
     
      final fileIR = _readFileIRData();

      // Step 4: Attach widget metadata
      _attachWidgetMetadata(fileIR);

      // Step 5: Validate checksum if present
      if (_hasChecksumFlag) {
        _validateChecksum(bytes);
      }

      printlog('\n=== END BINARY IR READER ===\n');
      return fileIR;
    } catch (e) {
      if (e is SerializationException) rethrow;
      throw SerializationException(
        'Failed to deserialize: $e',
        offset: _offset,
      );
    }
  }

  void _readHeader() {
    final magic = readUint32();
    if (magic != BinaryConstants.MAGIC_NUMBER) {
      throw SerializationException(
        'Invalid magic number: 0x${magic.toRadixString(16)}',
        offset: 0,
      );
    }

    final version = readUint16();
    if (version != BinaryConstants.FORMAT_VERSION) {
      throw SerializationException(
        'Unsupported format version: $version',
        offset: 4,
      );
    }

    final flags = readUint16();
    _hasChecksumFlag = (flags & BinaryConstants.FLAG_HAS_CHECKSUM) != 0;
    final isCompressed = (flags & BinaryConstants.FLAG_COMPRESSED) != 0;

    if (isCompressed) {
      throw SerializationException(
        'Compressed format not yet supported',
        offset: 6,
      );
    }

    printlog('✅ Header validated - Checksum: $_hasChecksumFlag');
  }

  void readStringTable() {
    final stringCount = readUint32();

    if (stringCount > BinaryConstants.MAX_STRING_COUNT) {
      throw SerializationException(
        'String count too large: $stringCount',
        offset: _offset - 4,
      );
    }

    _stringTable = List<String>.filled(stringCount, '');

    for (int i = 0; i < stringCount; i++) {
      try {
        _stringTable[i] = readString();
      } catch (e) {
        throw SerializationException(
          'Error reading string $i/$stringCount at offset $_offset: $e',
          offset: _offset,
        );
      }
    }

    printlog(
      '✅ String table: $stringCount strings (offset: $_stringTableStartOffset-$_stringTableEndOffset)',
    );
  }

  // ✅ NEW: Validate string table integrity
  void _validateStringTableIntegrity() {
    printlog('\n=== STRING TABLE DIAGNOSTICS ===');
    printlog('String table size: ${_stringTable.length}');
    printlog('Start offset: $_stringTableStartOffset');
    printlog('End offset: $_stringTableEndOffset');
    printlog('Bytes used: ${_stringTableEndOffset - _stringTableStartOffset}');

    // Sample first few strings
    for (int i = 0; i < _stringTable.length && i < 5; i++) {
      final str = _stringTable[i];
      printlog('  [$i] "${str.substring(0, Math.min(50, str.length))}"');
    }

    if (_stringTable.length > 5) {
      printlog('  ... and ${_stringTable.length - 5} more');
    }
  }

  void _readRelationshipsSection() {
    try {
      printlog('[READ RELATIONSHIPS] START - offset: $_offset');

      final relationshipFlags = readUint16();
      printlog(
        '[READ RELATIONSHIPS] Flags: 0x${relationshipFlags.toRadixString(16)}',
      );

      if (relationshipFlags & 0x0001 != 0) {
        _readWidgetStateConnections();
      }
      if (relationshipFlags & 0x0002 != 0) {
        _readStateLifecycleMethods();
      }
      if (relationshipFlags & 0x0004 != 0) {
        _readMethodCallGraph();
      }
      if (relationshipFlags & 0x0008 != 0) {
        _readFieldAccessGraph();
      }
      if (relationshipFlags & 0x0010 != 0) {
        _readClassHierarchy();
      }
      if (relationshipFlags & 0x0020 != 0) {
        _readInterfaceImplementers();
      }
      if (relationshipFlags & 0x0040 != 0) {
        _readClassBuildOutputs();
      }

      printlog('[READ RELATIONSHIPS] END - offset: $_offset');
    } catch (e) {
      throw SerializationException(
        'Failed to read relationships section: $e',
        offset: _offset,
      );
    }
  }

  void _readWidgetStateConnections() {
    printlog('[READ WIDGET-STATE] START');
    final count = readUint32();
    for (int i = 0; i < count; i++) {
      final widgetId = readStringRef();
      final stateId = readStringRef();
      _relationships.registerWidgetStateConnection(widgetId, stateId);
    }
    printlog('[READ WIDGET-STATE] END - $count connections');
  }

  void _readStateLifecycleMethods() {
    printlog('[READ STATE-LIFECYCLE] START');
    final count = readUint32();
    for (int i = 0; i < count; i++) {
      final stateId = readStringRef();
      final methodCount = readByte();
      for (int j = 0; j < methodCount; j++) {
        final methodTypeIndex = readByte();
        final methodType = StateLifecycleMethod.values[methodTypeIndex];
        final methodId = readStringRef();
        _relationships.registerStateLifecycleMethod(
          stateId,
          methodType,
          methodId,
        );
      }
    }

    final buildMethodCount = readUint32();
    for (int i = 0; i < buildMethodCount; i++) {
      final stateId = readStringRef();
      final buildMethodId = readStringRef();
      _relationships.registerStateBuildMethod(stateId, buildMethodId);
    }
    printlog('[READ STATE-LIFECYCLE] END');
  }

  void _readMethodCallGraph() {
    printlog('[READ METHOD-CALLS] START');
    final count = readUint32();
    for (int i = 0; i < count; i++) {
      final callerId = readStringRef();
      final calleeCount = readUint32();
      for (int j = 0; j < calleeCount; j++) {
        final calleeId = readStringRef();
        _relationships.registerMethodCall(callerId, calleeId);
      }
    }
    printlog('[READ METHOD-CALLS] END');
  }

  void _readFieldAccessGraph() {
    printlog('[READ FIELD-ACCESS] START');
    final count = readUint32();
    for (int i = 0; i < count; i++) {
      final methodId = readStringRef();
      final fieldCount = readUint32();
      for (int j = 0; j < fieldCount; j++) {
        final fieldId = readStringRef();
        _relationships.registerFieldAccess(methodId, fieldId);
      }
    }
    printlog('[READ FIELD-ACCESS] END');
  }

  void _readClassHierarchy() {
    printlog('[READ CLASS-HIERARCHY] START');
    final count = readUint32();
    for (int i = 0; i < count; i++) {
      final subclassId = readStringRef();
      final superclassName = readStringRef();
      _relationships.registerInheritance(subclassId, superclassName);
    }
    printlog('[READ CLASS-HIERARCHY] END');
  }

  void _readInterfaceImplementers() {
    printlog('[READ INTERFACE-IMPLEMENTERS] START');
    final count = readUint32();
    for (int i = 0; i < count; i++) {
      final interfaceName = readStringRef();
      final implementerCount = readUint32();
      for (int j = 0; j < implementerCount; j++) {
        final implementerId = readStringRef();
        _relationships.registerInterfaceImplementation(
          interfaceName,
          implementerId,
        );
      }
    }
    printlog('[READ INTERFACE-IMPLEMENTERS] END');
  }

  void _readClassBuildOutputs() {
    printlog('[READ WIDGET-OUTPUTS] START');
    final count = readUint32();
    for (int i = 0; i < count; i++) {
      final classId = readStringRef();
      final widgetName = readStringRef();
      _relationships.registerClassBuildOutput(classId, widgetName);
    }
    printlog('[READ WIDGET-OUTPUTS] END - $count outputs');
  }

  // ============================================================================
  // COMPLETE SECTION: _readFileIRData - SYMMETRIC WITH WRITER
  // ============================================================================

  DartFile _readFileIRData() {
    try {
  
      _logOffsetProgress('FILE IR DATA START');

      // ========== SECTION 1: Basic File Metadata ==========
      _assertValidBoundary('FILE METADATA');

      final filePath = readStringRef();
      final contentHash = readStringRef();
      final libraryName = readStringRef();
   

      _logOffsetProgress('AFTER METADATA');

      final builder = DartFileBuilder(filePath: filePath)
        ..withContentHash(contentHash)
        ..withLibrary(libraryName);

      // ========== SECTION 2: Imports ==========
      _assertValidBoundary('IMPORTS');
      _validateCountField('importCount');

      final importCount = readUint32();
      printlog('  - Importing $importCount items');

      for (int i = 0; i < importCount; i++) {
        try {
          builder.addImport(readImportStmt());
        } catch (e) {
          throw SerializationException(
            'Error reading import $i/$importCount: $e',
            offset: _offset,
          );
        }
      }
      _logOffsetProgress('AFTER IMPORTS', expectedBytes: importCount);

      // ========== SECTION 3: Exports ==========
      _assertValidBoundary('EXPORTS');
      _validateCountField('exportCount');

      final exportCount = readUint32();
      printlog('  - Exporting $exportCount items');

      for (int i = 0; i < exportCount; i++) {
        try {
          builder.addExport(readExportStmt());
        } catch (e) {
          throw SerializationException(
            'Error reading export $i/$exportCount: $e',
            offset: _offset,
          );
        }
      }
      _logOffsetProgress('AFTER EXPORTS', expectedBytes: exportCount);

      // ========== SECTION 4: Variables ==========
      _assertValidBoundary('VARIABLES');
      _validateCountField('varCount');

      final varCount = readUint32();
      printlog('  - Reading $varCount variables');

      for (int i = 0; i < varCount; i++) {
        try {
          builder.addVariable(readVariableDecl());
        } catch (e) {
          throw SerializationException(
            'Error reading variable $i/$varCount: $e',
            offset: _offset,
          );
        }
      }
      _logOffsetProgress('AFTER VARIABLES', expectedBytes: varCount);

      // ========== SECTION 5: Functions ==========
      _assertValidBoundary('FUNCTIONS');
      _validateCountField('funcCount');

      final funcCount = readUint32();
      printlog('  - Reading $funcCount functions');

      for (int i = 0; i < funcCount; i++) {
        try {
          printlog('  - Function $i/$funcCount at offset: $_offset');
          builder.addFunction(readFunctionDecl());
          _logOffsetProgress('AFTER FUNCTION $i', expectedBytes: 1);
        } catch (e) {
          throw SerializationException(
            'Error reading function $i/$funcCount: $e',
            offset: _offset,
          );
        }
      }
      _logOffsetProgress('AFTER FUNCTIONS', expectedBytes: funcCount);

      // ========== SECTION 6: Classes ==========
      printlog('\n[CRITICAL] About to read class count at offset: $_offset');
      _assertValidBoundary('CLASSES');
      _validateCountField('classCount');

      final classCount = readUint32();
      printlog('  - Reading $classCount classes');

      if (classCount > 10000) {
        throw SerializationException(
          'Unreasonable class count: $classCount (likely corrupted)',
          offset: _offset - 4,
        );
      }

      for (int i = 0; i < classCount; i++) {
        try {
          printlog('  - Class $i/$classCount at offset: $_offset');
          builder.addClass(readClassDecl());
          _logOffsetProgress('AFTER CLASS $i', expectedBytes: 1);
        } catch (e) {
          throw SerializationException(
            'Error reading class $i/$classCount: $e',
            offset: _offset,
          );
        }
      }
      _logOffsetProgress('AFTER CLASSES', expectedBytes: classCount);

      // ========== SECTION 7: Issues ==========
      _assertValidBoundary('ISSUES');
      _validateCountField('issueCount');

      final issueCount = readUint32();
      printlog('  - Reading $issueCount issues');

      for (int i = 0; i < issueCount; i++) {
        try {
          builder.addIssue(_readAnalysisIssue());
        } catch (e) {
          throw SerializationException(
            'Error reading issue $i/$issueCount: $e',
            offset: _offset,
          );
        }
      }
      _logOffsetProgress('AFTER ISSUES', expectedBytes: issueCount);

      printlog('[READ FILE IR DATA] COMPLETE');
      return builder.build();
    } catch (e) {
      printlog('[READ FILE IR DATA ERROR] $e');
      _dumpHexAround(_offset);
      rethrow;
    }
  }

  void _attachWidgetMetadata(DartFile fileIR) {
    final metadata = WidgetMetadata.fromRegistry(_relationships);

    if (fileIR is DartFileWithMetadata) {
      fileIR.attachWidgetMetadata(metadata);
    }

    printlog('[ATTACH] Widget metadata attached to DartFile');
  }

  void _validateChecksum(Uint8List allBytes) {
    if (allBytes.length < BinaryConstants.CHECKSUM_SIZE) {
      throw SerializationException(
        'File too small for checksum',
        offset: allBytes.length,
      );
    }

    final checksumStart = allBytes.length - BinaryConstants.CHECKSUM_SIZE;
    final checksumFromFile = allBytes.sublist(checksumStart);
    final dataWithoutChecksum = allBytes.sublist(0, checksumStart);

    final computedDigest = sha256.convert(dataWithoutChecksum);
    final computedChecksum = computedDigest.bytes;

    if (!bytesEqual(computedChecksum, checksumFromFile)) {
      throw SerializationException(
        'Checksum mismatch: file may be corrupted',
        offset: checksumStart,
      );
    }

    printlog(
      'Checksum verified: ${computedDigest.toString().substring(0, 16)}...',
    );
  }

  AnalysisIssue _readAnalysisIssue() {
    final id = readStringRef();
    final code = readStringRef();
    final message = readStringRef();

    final severityIndex = readByte();
    final severity = IssueSeverity.values[severityIndex];

    final categoryIndex = readByte();
    final category = IssueCategory.values[categoryIndex];

    final hasSuggestion = readByte() != 0;
    final suggestion = hasSuggestion ? readStringRef() : null;

    final sourceLocation = readSourceLocation();

    return AnalysisIssue(
      id: id,
      code: code,
      message: message,
      severity: severity,
      category: category,
      suggestion: suggestion,
      sourceLocation: sourceLocation,
    );
  }

  void printlog(String message) {
    if (_verbose) {
      print(message);
    }
  }

  @override
  int readByte() {
    boundsCheck(1);
    return _data.getUint8(_offset++) & 0xFF;
  }

  @override
  int readUint16() {
    boundsCheck(2);
    final value = _data.getUint16(_offset, Endian.little);
    _offset += 2;
    return value;
  }

  @override
  int readUint32() {
    boundsCheck(4);
    final value = _data.getUint32(_offset, Endian.little);
    _offset += 4;
    return value;
  }

  @override
  int readInt64() {
    boundsCheck(8);
    final value = _data.getInt64(_offset, Endian.little);
    _offset += 8;
    return value;
  }

  @override
  int readUint64() {
    boundsCheck(8);
    final value = _data.getUint64(_offset, Endian.little);
    _offset += 8;
    return value;
  }

  @override
  double readDouble() {
    boundsCheck(8);
    final value = _data.getFloat64(_offset, Endian.little);
    _offset += 8;
    return value;
  }

  @override
  String readString() {
    final length = readUint16();
    if (length > BinaryConstants.MAX_STRING_LENGTH) {
      throw SerializationException(
        'String length too large: $length',
        offset: _offset - 2,
      );
    }

    boundsCheck(length);
    final bytes = _data.buffer.asUint8List(_offset, length);
    _offset += length;

    return utf8.decode(bytes);
  }

  @override
  void boundsCheck(int bytesNeeded) {
    if (_offset + bytesNeeded > _data.lengthInBytes) {
      throw SerializationException(
        'Unexpected end of data: need $bytesNeeded bytes, '
        'but only ${_data.lengthInBytes - _offset} available at offset $_offset',
        offset: _offset,
      );
    }
  }

  @override
  String readStringRef() {
    final index = readUint32();

    // ✅ ADDED: Better error message with context
    if (index >= _stringTable.length) {
      throw SerializationException(
        'String reference OUT OF BOUNDS: $index >= ${_stringTable.length} '
        '(offset: $_offset, file size: ${_data.lengthInBytes}, '
        'string table range: $_stringTableStartOffset-$_stringTableEndOffset)',
        offset: _offset - 4,
      );
    }
    return _stringTable[index];
  }

  @override
  bool bytesEqual(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  @override
  SourceLocationIR readSourceLocation() {
    final file = readStringRef();
    final line = readUint32();
    final column = readUint32();
    final offset = readUint32();
    final length = readUint32();

    return SourceLocationIR(
      id: 'loc_${file}_$line',
      file: file,
      line: line,
      column: column,
      offset: offset,
      length: length,
    );
  }

  @override
  TypeIR readType() {
    final typeKind = readByte();

    switch (typeKind) {
      case BinaryConstants.TYPE_SIMPLE:
        final name = readStringRef();
        final isNullable = readByte() != 0;
        return simpleTypeIR(name, isNullable);

      case BinaryConstants.TYPE_DYNAMIC:
        return dynamicTypeIR();

      case BinaryConstants.TYPE_VOID:
        return voidTypeIR();

      case BinaryConstants.TYPE_NEVER:
        return neverTypeIR();

      default:
        throw SerializationException(
          'Unknown type kind: $typeKind',
          offset: _offset - 1,
        );
    }
  }

  @override
  ExpressionIR readExpression() {
    final exprType = readByte();

    switch (exprType) {
      case BinaryConstants.EXPR_LITERAL:
        return readLiteralExpression();

      case BinaryConstants.EXPR_IDENTIFIER:
        final name = readStringRef();
        return IdentifierExpressionIR(
          id: 'expr_id_$name',
          name: name,
          resultType: DynamicTypeIR(
            id: 'type_dynamic',
            sourceLocation: SourceLocationIR(
              id: 'loc_type',
              file: 'builtin',
              line: 0,
              column: 0,
              offset: 0,
              length: 0,
            ),
          ),
          sourceLocation: SourceLocationIR(
            id: 'loc_expr',
            file: 'builtin',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
        );

      case BinaryConstants.EXPR_BINARY:
        return readBinaryExpression();

      case BinaryConstants.EXPR_METHOD_CALL:
        return readMethodCallExpression();

      case BinaryConstants.EXPR_PROPERTY_ACCESS:
        return readPropertyAccessExpression();

      case BinaryConstants.EXPR_CONDITIONAL:
        return readConditionalExpression();

      case BinaryConstants.EXPR_LIST_LITERAL:
        return readListLiteralExpression();

      case BinaryConstants.EXPR_MAP_LITERAL:
        return readMapLiteralExpression();
      case BinaryConstants.EXPR_SET_LITERAL:
        return readSetLiteralExpression();
      case BinaryConstants.EXPR_UNARY:
        return readUnaryExpression();
      case BinaryConstants.EXPR_COMPOUND_ASSIGNMENT:
        return readCompoundAssignmentExpression();
      case BinaryConstants.EXPR_ASSIGNMENT:
        return readAssignmentExpression();
      case BinaryConstants.EXPR_INDEX_ACCESS:
        return readIndexAccessExpression();
      case BinaryConstants.EXPR_CASCADE:
        return readCascadeExpression();
      case BinaryConstants.EXPR_CAST:
        return readCastExpression();
      case BinaryConstants.EXPR_TYPE_CHECK:
        return readTypeCheckExpression();
      case BinaryConstants.EXPR_AWAIT:
        return readAwaitExpression();
      case BinaryConstants.EXPR_THROW:
        return readThrowExpression();
      case BinaryConstants.EXPR_NULL_AWARE:
        return readNullAwareAccessExpression();

      case BinaryConstants.EXPR_FUNCTION_CALL:
        return readFunctionCallExpression();
      case BinaryConstants.EXPR_STRING_INTERPOLATION:
        return readStringInterpolationExpression();
      case BinaryConstants.EXPR_THIS:
        return readThisExpression();
      case BinaryConstants.EXPR_SUPER:
        return readSuperExpression();
      case BinaryConstants.EXPR_PARENTHESIZED:
        return readParenthesizedExpression();
      case BinaryConstants.EXPR_INSTANCE_CREATION:
        return readInstanceCreationExpression();
      case BinaryConstants.EXPR_LAMBDA:
        return readLambdaExpression();
      default:
        throw SerializationException(
          'Unknown expression type: 0x${exprType.toRadixString(16)}',
          offset: _offset - 1,
        );
    }
  }

  int _entryIdCounter = 0;
  int _exprIdCounter = 0;
  MapExpressionIR readMapLiteralExpression() {
    final entryCount = readUint32();
    final entries = <MapEntryIR>[];

    for (int i = 0; i < entryCount; i++) {
      final entryId = 'map_entry_${_entryIdCounter++}';
      final entrySourceLocation = readSourceLocation();

      final key = readExpression();
      final value = readExpression();

      entries.add(
        MapEntryIR(
          id: entryId,
          sourceLocation: entrySourceLocation,
          key: key,
          value: value,
        ),
      );
    }

    final isConst = readByte() != 0;
    final resultType = readType();
    final sourceLocation = readSourceLocation();
    final exprId = 'expr_map_${_exprIdCounter++}';

    return MapExpressionIR(
      id: exprId,
      entries: entries,
      isConst: isConst,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  @override
  StatementIR readStatement() {
    final stmtType = readByte();

    switch (stmtType) {
      case BinaryConstants.STMT_EXPRESSION:
        return readExpressionStatement();
      case BinaryConstants.STMT_VAR_DECL:
        return readVariableDeclarationStatement();
      case BinaryConstants.STMT_RETURN:
        return readReturnStatement();
      case BinaryConstants.STMT_BREAK:
        return readBreakStatement();
      case BinaryConstants.STMT_CONTINUE:
        return readContinueStatement();
      case BinaryConstants.STMT_THROW:
        return readThrowStatement();
      case BinaryConstants.STMT_ASSERT:
        return readAssertStatement();
      case BinaryConstants.STMT_EMPTY:
        return readEmptyStatement();
      case BinaryConstants.STMT_BLOCK:
        return readBlockStatement();
      case BinaryConstants.STMT_IF:
        return readIfStatement();
      case BinaryConstants.STMT_FOR:
        return readForStatement();
      case BinaryConstants.STMT_FOR_EACH:
        return readForEachStatement();
      case BinaryConstants.STMT_WHILE:
        return readWhileStatement();
      case BinaryConstants.STMT_DO_WHILE:
        return readDoWhileStatement();
      case BinaryConstants.STMT_SWITCH:
        return readSwitchStatement();
      case BinaryConstants.STMT_TRY:
        return readTryStatement();
      case BinaryConstants.STMT_LABELED:
        return readLabeledStatement();
      case BinaryConstants.STMT_YIELD:
        return readYieldStatement();
      case BinaryConstants.STMT_FUNCTION_DECL:
        return readFunctionDeclarationStatement();
      default:
        throw SerializationException(
          'Unknown statement type: 0x${stmtType.toRadixString(16)}',
          offset: _offset - 1,
        );
    }
  }

  @override
  VariableDecl readVariableDecl() {
    final id = readStringRef();
    final name = readStringRef();
    final type = readType();

    final isFinal = readByte() != 0;
    final isConst = readByte() != 0;
    final isStatic = readByte() != 0;
    final isLate = readByte() != 0;
    final isPrivate = readByte() != 0;

    final hasInitializer = readByte() != 0;
    ExpressionIR? initializer;
    if (hasInitializer) {
      initializer = readExpression();
    }

    final sourceLocation = readSourceLocation();

    return VariableDecl(
      id: id,
      name: name,
      type: type,
      isFinal: isFinal,
      isConst: isConst,
      isStatic: isStatic,
      isLate: isLate,
      initializer: initializer,
      visibility: isPrivate
          ? VisibilityModifier.private
          : VisibilityModifier.public,
      isPrivate: isPrivate,
      sourceLocation: sourceLocation,
    );
  }

  // ============================================================================
  // FUNCTION DECLARATION READER - CLEAN & SYNCHRONIZED
  // ============================================================================
  @override
  FunctionDecl readFunctionDecl() {
    printlog('[READ FUNCTION] START at offset: $_offset');

    try {
      // ========== SECTION 1: Basic Metadata ==========
      final id = readStringRef();
      final name = readStringRef();
      final returnTypeName = readStringRef();
      final returnType = simpleTypeIR(returnTypeName, false);
      printlog('[READ FUNCTION] Section 1: id=$id, name=$name');

      // ========== SECTION 2: Documentation & Annotations ==========
      final hasDocumentation = readByte() != 0;
      String? documentation;
      if (hasDocumentation) {
        documentation = readStringRef();
      }

      printlog('[READ FUNCTION] Before annotation count at offset: $_offset');
      final annotationCount = readUint32();
      printlog(
        '[READ FUNCTION] Annotation count: $annotationCount at offset: ${_offset - 4}',
      );

      final annotations = <AnnotationIR>[];
      for (int i = 0; i < annotationCount; i++) {
        printlog('[READ FUNCTION] Reading annotation $i/$annotationCount');
        annotations.add(readAnnotation());
        printlog('[READ FUNCTION] Annotation $i complete at offset: $_offset');
      }

      printlog('[READ FUNCTION] After annotations at offset: $_offset');

      // ========== SECTION 3: Type Parameters ==========
      final typeParameterCount = readUint32();
      final typeParameters = <TypeParameterDecl>[];
      for (int i = 0; i < typeParameterCount; i++) {
        final tpName = readStringRef();
        final hasBound = readByte() != 0;
        TypeIR? bound;
        if (hasBound) {
          bound = readType();
        }

        // Create a default source location for the type parameter
        final tpSourceLocation = SourceLocationIR(
          id: 'loc_type_param_$tpName',
          file: 'builtin',
          line: 0,
          column: 0,
          offset: 0,
          length: 0,
        );

        typeParameters.add(
          TypeParameterDecl(
            // ✓ REMOVED: lowerBound: 0,
            id: 'type_param_${tpName}_$i',
            name: tpName,
            bound: bound,
            sourceLocation: tpSourceLocation,
            // lowerBound is optional - don't include it unless you have a value
          ),
        );
      }

      printlog('[READ FUNCTION] Section 3: typeParameters=$typeParameterCount');

      // ========== SECTION 4: Parameters ==========
      final paramCount = readUint32();
      final parameters = <ParameterDecl>[];
      for (int i = 0; i < paramCount; i++) {
        parameters.add(readParameterDecl());
      }
      printlog('[READ FUNCTION] Section 4: parameters=$paramCount');

      // ========== SECTION 5: Source Location ==========
      final sourceLocation = readSourceLocation();
      printlog('[READ FUNCTION] Section 5: sourceLocation at offset $_offset');

      // ========== SECTION 6: Type-Specific Data ==========
      final funcType = readByte(); // 0=regular, 1=constructor, 2=method
      printlog('[READ FUNCTION] Section 6: funcType=$funcType');

      if (funcType == 1) {
        // ========== CONSTRUCTOR ==========
        final constructorClass = readStringRef();

        final hasConstructorName = readByte() != 0;
        final constructorName = hasConstructorName ? readStringRef() : null;

        final isConst = readByte() != 0;
        final isFactory = readByte() != 0;

        // Initializers
        final initCount = readUint32();
        final initializers = <ConstructorInitializer>[];
        for (int i = 0; i < initCount; i++) {
          final fieldName = readStringRef();
          final isThisField = readByte() != 0;
          final value = readExpression();
          final initSourceLocation = readSourceLocation();
          initializers.add(
            ConstructorInitializer(
              fieldName: fieldName,
              value: value,
              isThisField: isThisField,
              sourceLocation: initSourceLocation,
            ),
          );
        }

        // Super call
        final hasSuperCall = readByte() != 0;
        SuperConstructorCall? superCall;
        if (hasSuperCall) {
          final hasSuperConstructorName = readByte() != 0;
          final superConstructorName = hasSuperConstructorName
              ? readStringRef()
              : null;
          final superArgCount = readUint32();
          final superArgs = <ExpressionIR>[];
          for (int i = 0; i < superArgCount; i++) {
            superArgs.add(readExpression());
          }
          final superNamedArgCount = readUint32();
          final superNamedArgs = <String, ExpressionIR>{};
          for (int i = 0; i < superNamedArgCount; i++) {
            final key = readStringRef();
            final value = readExpression();
            superNamedArgs[key] = value;
          }
          final superSourceLocation = readSourceLocation();
          superCall = SuperConstructorCall(
            constructorName: superConstructorName,
            arguments: superArgs,
            namedArguments: superNamedArgs,
            sourceLocation: superSourceLocation,
          );
        }

        // Redirected call
        final hasRedirectedCall = readByte() != 0;
        RedirectedConstructorCall? redirectedCall;
        if (hasRedirectedCall) {
          final hasRedirectedConstructorName = readByte() != 0;
          final redirectedConstructorName = hasRedirectedConstructorName
              ? readStringRef()
              : null;
          final redirectedArgCount = readUint32();
          final redirectedArgs = <ExpressionIR>[];
          for (int i = 0; i < redirectedArgCount; i++) {
            redirectedArgs.add(readExpression());
          }
          final redirectedNamedArgCount = readUint32();
          final redirectedNamedArgs = <String, ExpressionIR>{};
          for (int i = 0; i < redirectedNamedArgCount; i++) {
            final key = readStringRef();
            final value = readExpression();
            redirectedNamedArgs[key] = value;
          }
          final redirectedSourceLocation = readSourceLocation();
          redirectedCall = RedirectedConstructorCall(
            constructorName: redirectedConstructorName,
            arguments: redirectedArgs,
            namedArguments: redirectedNamedArgs,
            sourceLocation: redirectedSourceLocation,
          );
        }

        // ========== SECTION 7: Function Body ==========
        final hasBody = readByte() != 0;
        FunctionBodyIR? functionBody;
        if (hasBody) {
          functionBody = _readFunctionBody();
          // Fallback to function's sourceLocation if body didn't specify one
          if (functionBody.sourceLocation.file == 'unknown') {
            functionBody = FunctionBodyIR(
              id: functionBody.id,
              sourceLocation: sourceLocation,
              statements: functionBody.statements,
            
            );
          }
        }

        return ConstructorDecl(
          id: id,
          name: constructorName ?? '',
          constructorClass: constructorClass,
          constructorName: constructorName,
          parameters: parameters,
          isConst: isConst,
          isFactory: isFactory,
          sourceLocation: sourceLocation,
          body: functionBody,
          initializers: initializers,
          superCall: superCall,
          redirectedCall: redirectedCall,
          documentation: documentation,
          annotations: annotations,
          typeParameters: typeParameters,
        );
      } else if (funcType == 2) {
        // ========== METHOD ==========
        final hasClassName = readByte() != 0;
        final className = hasClassName ? readStringRef() : null;

        final hasOverriddenSignature = readByte() != 0;
        final overriddenSignature = hasOverriddenSignature
            ? readStringRef()
            : null;

        final isAsync = readByte() != 0;
        final isGenerator = readByte() != 0;

        // ========== SECTION 7: Function Body ==========
        final hasBody = readByte() != 0;
        FunctionBodyIR? functionBody;
        if (hasBody) {
          functionBody = _readFunctionBody();
        }

        return MethodDecl(
          id: id,
          name: name,
          returnType: returnType,
          parameters: parameters,
          isAsync: isAsync,
          isGenerator: isGenerator,
          sourceLocation: sourceLocation,
          className: className,
          overriddenSignature: overriddenSignature,
          body: functionBody,
          documentation: documentation,
          annotations: annotations,
          typeParameters: typeParameters,
        );
      } else {
        // ========== REGULAR FUNCTION ==========

        // ========== SECTION 7: Function Body ==========
        final hasBody = readByte() != 0;
        FunctionBodyIR? functionBody;
        if (hasBody) {
          functionBody = _readFunctionBody();
        }

        return FunctionDecl(
          id: id,
          name: name,
          returnType: returnType,
          parameters: parameters,
          isAsync: false,
          isGenerator: false,
          sourceLocation: sourceLocation,
          body: functionBody,
          documentation: documentation,
          annotations: annotations,
          typeParameters: typeParameters,
        );
      }
    } catch (e) {
      printlog('[READ FUNCTION ERROR] at offset $_offset: $e');
      rethrow;
    }
  }

  FunctionBodyIR _readFunctionBody() {
    printlog('[READ FUNCTION BODY] START at offset: $_offset');

    try {
      // âœ… FIRST: Read body ID
      final bodyId = readStringRef();
      printlog('[READ FUNCTION BODY] Read body ID: $bodyId');

      // âœ… SECOND: Check if body has explicit sourceLocation
      final hasExplicitSourceLocation = readByte() != 0;
      printlog(
        '[READ FUNCTION BODY] Has explicit sourceLocation: $hasExplicitSourceLocation',
      );

      SourceLocationIR? bodySourceLocation;
      if (hasExplicitSourceLocation) {
        bodySourceLocation = readSourceLocation();
        printlog(
          '[READ FUNCTION BODY] Read explicit sourceLocation at offset: ${_offset - 20}',
        );
      } else {
        printlog(
          '[READ FUNCTION BODY] No explicit sourceLocation (will use function location)',
        );
      }

      // âœ" Read statements count immediately - THIRD THING
      final stmtCount = readUint32();
      printlog(
        '[READ FUNCTION BODY] Statement count: $stmtCount at offset: ${_offset - 4}',
      );

      if (stmtCount > 10000) {
        throw SerializationException(
          'Unreasonable statement count: $stmtCount',
          offset: _offset - 4,
        );
      }

      final statements = <StatementIR>[];
      for (int i = 0; i < stmtCount; i++) {
        try {
          statements.add(readStatement());
        } catch (e) {
          throw SerializationException(
            'Error reading statement $i/$stmtCount: $e',
            offset: _offset,
          );
        }
      }
      printlog('[READ FUNCTION BODY] Statements complete');

      // âœ" Then read expressions count
      final exprCount = readUint32();
      printlog(
        '[READ FUNCTION BODY] Expression count: $exprCount at offset: ${_offset - 4}',
      );

      if (exprCount > 10000) {
        throw SerializationException(
          'Unreasonable expression count: $exprCount',
          offset: _offset - 4,
        );
      }

      final expressions = <ExpressionIR>[];
      for (int i = 0; i < exprCount; i++) {
        try {
          expressions.add(readExpression());
        } catch (e) {
          throw SerializationException(
            'Error reading expression $i/$exprCount: $e',
            offset: _offset,
          );
        }
      }
      printlog('[READ FUNCTION BODY] Expressions complete');

      // âœ" Then read extraction data flag
      final hasExtractionData = readByte() != 0;
      printlog('[READ FUNCTION BODY] Has extraction data: $hasExtractionData');

    

      printlog('[READ FUNCTION BODY] END at offset: $_offset');

      // âœ… Return with all fields properly populated
      return FunctionBodyIR(
        id: bodyId,
        sourceLocation: bodySourceLocation!,
        statements: statements,
    
    
      );
    } catch (e) {
      printlog('[READ FUNCTION BODY ERROR] at offset $_offset: $e');
      _dumpHexAround(_offset);
      rethrow;
    }
  }

  AnnotationIR readAnnotation() {
    printlog('[READ ANNOTATION] START at offset: $_offset');

    try {
      // ✓ Read annotation name
      final name = readStringRef();
      printlog('[READ ANNOTATION] Name: $name');

      // ✓ Read positional arguments
      final argCount = readUint32();
      final arguments = <ExpressionIR>[];
      for (int i = 0; i < argCount; i++) {
        arguments.add(readExpression());
      }
      printlog('[READ ANNOTATION] Arguments: $argCount');

      // ✓ Read named arguments
      final namedArgCount = readUint32();
      final namedArguments = <String, ExpressionIR>{};
      for (int i = 0; i < namedArgCount; i++) {
        final key = readStringRef();
        final value = readExpression();
        namedArguments[key] = value;
      }
      printlog('[READ ANNOTATION] Named arguments: $namedArgCount');

      // ✓ Read source location
      final sourceLocation = readSourceLocation();

      printlog('[READ ANNOTATION] END at offset: $_offset');

      return AnnotationIR(
        name: name,
        arguments: arguments,
        namedArguments: namedArguments,
        sourceLocation: sourceLocation,
      );
    } catch (e) {
      printlog('[READ ANNOTATION ERROR] at offset $_offset: $e');
      rethrow;
    }
  }

  @override
  ParameterDecl readParameterDecl() {
    final id = readStringRef();
    final name = readStringRef();
    final type = readType();

    final isRequired = readByte() != 0;
    final isNamed = readByte() != 0;
    final isPositional = readByte() != 0;

    final hasDefaultValue = readByte() != 0;
    ExpressionIR? defaultValue;
    if (hasDefaultValue) {
      defaultValue = readExpression();
    }

    final sourceLocation = readSourceLocation();

    return ParameterDecl(
      id: id,
      name: name,
      type: type,
      isRequired: isRequired,
      isNamed: isNamed,
      isPositional: isPositional,
      defaultValue: defaultValue,
      sourceLocation: sourceLocation,
    );
  }

  // ✅ FIXED: Read method body statements

  @override
  @override
  MethodDecl readMethodDecl() {
    printlog('[READ METHOD] START at offset: $_offset');

    try {
      // ========== SECTION 1: Basic Metadata ==========
      final id = readStringRef();
      final name = readStringRef();
      final returnType = readType();
      printlog('[READ METHOD] Basic metadata: id=$id, name=$name');

      // ========== SECTION 2: Documentation & Annotations ==========
      final hasDocumentation = readByte() != 0;
      String? documentation;
      if (hasDocumentation) {
        documentation = readStringRef();
      }

      final annotationCount = readUint32();
      final annotations = <AnnotationIR>[];
      for (int i = 0; i < annotationCount; i++) {
        annotations.add(readAnnotation());
      }
      printlog('[READ METHOD] Annotations: $annotationCount');

      // ========== SECTION 3: Type Parameters ==========
      final typeParameterCount = readUint32();
      final typeParameters = <TypeParameterDecl>[];
      for (int i = 0; i < typeParameterCount; i++) {
        final tpName = readStringRef();
        final hasBound = readByte() != 0;
        TypeIR? bound;
        if (hasBound) {
          bound = readType();
        }

        final tpSourceLocation = SourceLocationIR(
          id: 'loc_type_param_$tpName',
          file: 'builtin',
          line: 0,
          column: 0,
          offset: 0,
          length: 0,
        );

        typeParameters.add(
          TypeParameterDecl(
            id: 'type_param_${tpName}_$i',
            name: tpName,
            bound: bound,
            sourceLocation: tpSourceLocation,
          ),
        );
      }
      printlog('[READ METHOD] Type parameters: $typeParameterCount');

      // ========== SECTION 4: Parameters ==========
      final paramCount = readUint32();
      final parameters = <ParameterDecl>[];
      for (int i = 0; i < paramCount; i++) {
        parameters.add(readParameterDecl());
      }
      printlog('[READ METHOD] Parameters: $paramCount');

      // ========== SECTION 5: Source Location ==========
      final sourceLocation = readSourceLocation();
      printlog('[READ METHOD] Source location read');

      // ========== SECTION 6: Type-Specific Data (Method = funcType 2) ==========
      final funcType = readByte(); // Should be 2 for method
      if (funcType != 2) {
        throw SerializationException(
          'Expected funcType 2 (method), got $funcType',
          offset: _offset - 1,
        );
      }

      final hasClassName = readByte() != 0;
      final className = hasClassName ? readStringRef() : null;

      final hasOverriddenSignature = readByte() != 0;
      final overriddenSignature = hasOverriddenSignature
          ? readStringRef()
          : null;

      final isAsync = readByte() != 0;
      final isGenerator = readByte() != 0;

      // âœ… NEW: Read widget return flag
      final isWidgetReturn = readByte() != 0;

      printlog(
        '[READ METHOD] Method-specific data: async=$isAsync, generator=$isGenerator, widget=$isWidgetReturn',
      );

      // ========== SECTION 7: Function Body + Extraction Data ==========
      // âœ… THIS IS THE KEY FIX: Read body using _readFunctionBody()
      final hasBody = readByte() != 0;
      FunctionBodyIR? functionBody;
      if (hasBody) {
        functionBody = _readFunctionBody();

        // âœ… Fallback to method's sourceLocation if body didn't specify one
        if (functionBody.sourceLocation.file == 'unknown') {
          printlog('[READ METHOD] Attaching method sourceLocation to body');
          functionBody = FunctionBodyIR(
            id: functionBody.id,
            sourceLocation: sourceLocation,
            statements: functionBody.statements,
          
          );
        }
      }
      printlog('[READ METHOD] Body: ${hasBody ? 'yes' : 'no'}');

      printlog('[READ METHOD] END at offset: $_offset');

      return MethodDecl(
        id: id,
        name: name,
        returnType: returnType,
        parameters: parameters,
        isAsync: isAsync,
        isGenerator: isGenerator,
        sourceLocation: sourceLocation,
        className: className,
        overriddenSignature: overriddenSignature,
        body: functionBody,
        documentation: documentation,
        annotations: annotations,
        typeParameters: typeParameters,
        isWidgetReturnType: isWidgetReturn,
      );
    } catch (e) {
      printlog('[READ METHOD ERROR] at offset $_offset: $e');
      rethrow;
    }
  }



  FlutterComponent _readFlutterComponent() {
    final componentType = readByte();

    switch (componentType) {
      case 0: // WidgetComponent
        return _readWidgetComponent();
      case 1: // ConditionalComponent
        return _readConditionalComponent();
      case 2: // LoopComponent
        return _readLoopComponent();
      case 3: // CollectionComponent
        return _readCollectionComponent();
      case 4: // BuilderComponent
        return _readBuilderComponent();
      case 5: // UnsupportedComponent
        return _readUnsupportedComponent();
      case 6: // ContainerFallbackComponent
        return _readContainerFallbackComponent();
      default:
        throw SerializationException(
          'Unknown component type: $componentType',
          offset: _offset - 1,
        );
    }
  }

  ContainerFallbackComponent _readContainerFallbackComponent() {
    final id = readStringRef();
    final reason = readStringRef();
    final sourceLocation = readSourceLocation();

    final hasWrapped = readByte() != 0;
    FlutterComponent? wrappedComponent;
    if (hasWrapped) {
      wrappedComponent = _readFlutterComponent();
    }

    return ContainerFallbackComponent(
      id: id,
      reason: reason,
      sourceLocation: sourceLocation,
      wrappedComponent: wrappedComponent,
    );
  }

  CollectionComponent _readCollectionComponent() {
    final id = readStringRef();
    final collectionKind = readStringRef();
    final hasSpread = readByte() != 0;
    final sourceLocation = readSourceLocation();

    final elemCount = readUint32();
    final elements = <FlutterComponent>[];
    for (int i = 0; i < elemCount; i++) {
      elements.add(_readFlutterComponent());
    }

    return CollectionComponent(
      id: id,
      collectionKind: collectionKind,
      elements: elements,
      hasSpread: hasSpread,
      sourceLocation: sourceLocation,
    );
  }

  BuilderComponent _readBuilderComponent() {
    final id = readStringRef();
    final builderName = readStringRef();
    final isAsync = readByte() != 0;
    final sourceLocation = readSourceLocation();

    final paramCount = readUint32();
    final parameters = <String>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(readStringRef());
    }

    final bodyDescription = readStringRef();

    return BuilderComponent(
      id: id,
      builderName: builderName,
      parameters: parameters,
      isAsync: isAsync,
      sourceLocation: sourceLocation,
      bodyDescription: bodyDescription.isEmpty ? null : bodyDescription,
    );
  }

  UnsupportedComponent _readUnsupportedComponent() {
    final id = readStringRef();
    final sourceCode = readStringRef();
    final reason = readStringRef();
    final sourceLocation = readSourceLocation();

    return UnsupportedComponent(
      id: id,
      sourceCode: sourceCode,
      reason: reason.isEmpty ? null : reason,
      sourceLocation: sourceLocation,
    );
  }

  LoopComponent _readLoopComponent() {
    final id = readStringRef();
    final loopKind = readStringRef();
    final loopVariable = readStringRef();
    final iterableCode = readStringRef();
    final conditionCode = readStringRef();
    final sourceLocation = readSourceLocation();

    final bodyComponent = _readFlutterComponent();

    return LoopComponent(
      id: id,
      loopKind: loopKind,
      loopVariable: loopVariable.isEmpty ? null : loopVariable,
      iterableCode: iterableCode.isEmpty ? null : iterableCode,
      conditionCode: conditionCode.isEmpty ? null : conditionCode,
      bodyComponent: bodyComponent,
      sourceLocation: sourceLocation,
    );
  }

  ConditionalComponent _readConditionalComponent() {
    final id = readStringRef();
    final conditionCode = readStringRef();
    final isTernary = readByte() != 0;
    final sourceLocation = readSourceLocation();

    final thenComponent = _readFlutterComponent();
    final hasElse = readByte() != 0;
    FlutterComponent? elseComponent;
    if (hasElse) {
      elseComponent = _readFlutterComponent();
    }

    return ConditionalComponent(
      id: id,
      conditionCode: conditionCode,
      thenComponent: thenComponent,
      elseComponent: elseComponent,
      isTernary: isTernary,
      sourceLocation: sourceLocation,
    );
  }

 




  WidgetComponent _readWidgetComponent() {
    final id = readStringRef();
    final widgetName = readStringRef();
    final constructorName = readStringRef();
    final isConst = readByte() != 0;
    final sourceLocation = readSourceLocation();

    // Read properties
    final propCount = readUint32();
    final properties = <PropertyBinding>[];
    for (int i = 0; i < propCount; i++) {
      properties.add(_readPropertyBinding());
    }

    // Read children
    final childCount = readUint32();
    final children = <FlutterComponent>[];
    for (int i = 0; i < childCount; i++) {
      children.add(_readFlutterComponent());
    }

    return WidgetComponent(
      id: id,
      widgetName: widgetName,
      constructorName: constructorName.isEmpty ? null : constructorName,
      properties: properties,
      children: children,
      isConst: isConst,
      sourceLocation: sourceLocation,
    );
  }

  PropertyBinding _readPropertyBinding() {
    final bindingType = readByte();

    switch (bindingType) {
      case 0: // LiteralPropertyBinding
        final name = readStringRef();
        final value = readStringRef();
        return LiteralPropertyBinding(name: name, value: value);

      case 1: // CallbackPropertyBinding
        final name = readStringRef();
        final value = readStringRef();
        final isAsync = readByte() != 0;
        final paramCount = readUint32();
        final parameters = <String>[];
        for (int i = 0; i < paramCount; i++) {
          parameters.add(readStringRef());
        }
        return CallbackPropertyBinding(
          name: name,
          value: value,
          parameters: parameters,
          isAsync: isAsync,
        );

      case 2: // BuilderPropertyBinding
        final name = readStringRef();
        final value = readStringRef();
        final paramCount = readUint32();
        final parameters = <String>[];
        for (int i = 0; i < paramCount; i++) {
          parameters.add(readStringRef());
        }
        return BuilderPropertyBinding(
          name: name,
          value: value,
          parameters: parameters,
        );

      default:
        throw SerializationException(
          'Unknown property binding type: $bindingType',
          offset: _offset - 1,
        );
    }
  }



  @override
  ConstructorDecl readConstructorDecl() {
    printlog('[READ CONSTRUCTOR] START at offset: $_offset');

    try {
      // ========== SECTION 1: Basic Metadata ==========
      final id = readStringRef();
      final name = readStringRef();
    
      printlog('[READ CONSTRUCTOR] Basic metadata: id=$id, name=$name');

      // ========== SECTION 2: Documentation & Annotations ==========
      final hasDocumentation = readByte() != 0;
      String? documentation;
      if (hasDocumentation) {
        documentation = readStringRef();
      }

      final annotationCount = readUint32();
      final annotations = <AnnotationIR>[];
      for (int i = 0; i < annotationCount; i++) {
        annotations.add(readAnnotation());
      }
      printlog('[READ CONSTRUCTOR] Annotations: $annotationCount');

      // ========== SECTION 3: Type Parameters ==========
      final typeParameterCount = readUint32();
      final typeParameters = <TypeParameterDecl>[];
      for (int i = 0; i < typeParameterCount; i++) {
        final tpName = readStringRef();
        final hasBound = readByte() != 0;
        TypeIR? bound;
        if (hasBound) {
          bound = readType();
        }

        final tpSourceLocation = SourceLocationIR(
          id: 'loc_type_param_$tpName',
          file: 'builtin',
          line: 0,
          column: 0,
          offset: 0,
          length: 0,
        );

        typeParameters.add(
          TypeParameterDecl(
            id: 'type_param_${tpName}_$i',
            name: tpName,
            bound: bound,
            sourceLocation: tpSourceLocation,
          ),
        );
      }
      printlog('[READ CONSTRUCTOR] Type parameters: $typeParameterCount');

      // ========== SECTION 4: Parameters ==========
      final paramCount = readUint32();
      final parameters = <ParameterDecl>[];
      for (int i = 0; i < paramCount; i++) {
        parameters.add(readParameterDecl());
      }
      printlog('[READ CONSTRUCTOR] Parameters: $paramCount');

      // ========== SECTION 5: Source Location ==========
      final sourceLocation = readSourceLocation();
      printlog('[READ CONSTRUCTOR] Source location read');

      // ========== SECTION 6: Type-Specific Data (Constructor = funcType 1) ==========
      final funcType = readByte(); // Should be 1 for constructor
      if (funcType != 1) {
        throw SerializationException(
          'Expected funcType 1 (constructor), got $funcType',
          offset: _offset - 1,
        );
      }

      final constructorClass = readStringRef();

      final hasConstructorName = readByte() != 0;
      final constructorName = hasConstructorName ? readStringRef() : null;

      final isConst = readByte() != 0;
      final isFactory = readByte() != 0;

      // ========== SECTION 6a: Initializers ==========
      final initCount = readUint32();
      final initializers = <ConstructorInitializer>[];
      for (int i = 0; i < initCount; i++) {
        final fieldName = readStringRef();
        final isThisField = readByte() != 0;
        final value = readExpression();
        final initSourceLocation = readSourceLocation();
        initializers.add(
          ConstructorInitializer(
            fieldName: fieldName,
            value: value,
            isThisField: isThisField,
            sourceLocation: initSourceLocation,
          ),
        );
      }
      printlog('[READ CONSTRUCTOR] Initializers: $initCount');

      // ========== SECTION 6b: Super call ==========
      final hasSuperCall = readByte() != 0;
      SuperConstructorCall? superCall;
      if (hasSuperCall) {
        final hasSuperConstructorName = readByte() != 0;
        final superConstructorName = hasSuperConstructorName
            ? readStringRef()
            : null;
        final superArgCount = readUint32();
        final superArgs = <ExpressionIR>[];
        for (int i = 0; i < superArgCount; i++) {
          superArgs.add(readExpression());
        }
        final superNamedArgCount = readUint32();
        final superNamedArgs = <String, ExpressionIR>{};
        for (int i = 0; i < superNamedArgCount; i++) {
          final key = readStringRef();
          final value = readExpression();
          superNamedArgs[key] = value;
        }
        final superSourceLocation = readSourceLocation();
        superCall = SuperConstructorCall(
          constructorName: superConstructorName,
          arguments: superArgs,
          namedArguments: superNamedArgs,
          sourceLocation: superSourceLocation,
        );
      }
      printlog('[READ CONSTRUCTOR] Super call: ${hasSuperCall ? 'yes' : 'no'}');

      // ========== SECTION 6c: Redirected call ==========
      final hasRedirectedCall = readByte() != 0;
      RedirectedConstructorCall? redirectedCall;
      if (hasRedirectedCall) {
        final hasRedirectedConstructorName = readByte() != 0;
        final redirectedConstructorName = hasRedirectedConstructorName
            ? readStringRef()
            : null;
        final redirectedArgCount = readUint32();
        final redirectedArgs = <ExpressionIR>[];
        for (int i = 0; i < redirectedArgCount; i++) {
          redirectedArgs.add(readExpression());
        }
        final redirectedNamedArgCount = readUint32();
        final redirectedNamedArgs = <String, ExpressionIR>{};
        for (int i = 0; i < redirectedNamedArgCount; i++) {
          final key = readStringRef();
          final value = readExpression();
          redirectedNamedArgs[key] = value;
        }
        final redirectedSourceLocation = readSourceLocation();
        redirectedCall = RedirectedConstructorCall(
          constructorName: redirectedConstructorName,
          arguments: redirectedArgs,
          namedArguments: redirectedNamedArgs,
          sourceLocation: redirectedSourceLocation,
        );
      }
      printlog(
        '[READ CONSTRUCTOR] Redirected call: ${hasRedirectedCall ? 'yes' : 'no'}',
      );

      // ========== SECTION 7: Function Body + Extraction Data ==========
      // âœ… THIS IS THE KEY FIX: Read body using _readFunctionBody()
      final hasBody = readByte() != 0;
      FunctionBodyIR? functionBody;
      if (hasBody) {
        functionBody = _readFunctionBody();

        // âœ… Fallback to constructor's sourceLocation if body didn't specify one
        if (functionBody.sourceLocation.file == 'unknown') {
          printlog(
            '[READ CONSTRUCTOR] Attaching constructor sourceLocation to body',
          );
          functionBody = FunctionBodyIR(
            id: functionBody.id,
            sourceLocation: sourceLocation,
            statements: functionBody.statements,
  
        
          );
        }
      }
      printlog('[READ CONSTRUCTOR] Body: ${hasBody ? 'yes' : 'no'}');

      printlog('[READ CONSTRUCTOR] END at offset: $_offset');

      return ConstructorDecl(
        id: id,
        name: constructorName ?? '',
        constructorClass: constructorClass,
        constructorName: constructorName,
        parameters: parameters,
        isConst: isConst,
        isFactory: isFactory,
        sourceLocation: sourceLocation,
        body: functionBody,
        initializers: initializers,
        superCall: superCall,
        redirectedCall: redirectedCall,
        documentation: documentation,
        annotations: annotations,
        typeParameters: typeParameters,
      );
    } catch (e) {
      printlog('[READ CONSTRUCTOR ERROR] at offset $_offset: $e');
      rethrow;
    }
  }

  // ============================================================================
  // ADD TO: binary_ir_reader.dart
  // Validation helpers to detect misalignment
  // ============================================================================

  /// Validate that the next bytes look like a valid count
  bool _validateCountField(String fieldName) {
    if (_offset + 4 > _data.lengthInBytes) {
      printlog('[VALIDATE] ERROR: Not enough bytes for $fieldName count');
      return false;
    }

    final countBytes = _data.buffer.asUint8List(_offset, 4);
    final count =
        countBytes[0] |
        (countBytes[1] << 8) |
        (countBytes[2] << 16) |
        (countBytes[3] << 24);

    if (count > 100000) {
      printlog(
        '[VALIDATE] WARNING: $fieldName count suspiciously large: $count (0x${count.toRadixString(16)})',
      );
      _dumpHexAround(_offset);
      return false;
    }

    printlog('[VALIDATE] $fieldName count OK: $count');
    return true;
  }

  /// Dump hex around current offset for debugging
  void _dumpHexAround(int offset) {
    printlog('\n=== HEX DUMP AROUND OFFSET $offset ===');

    final startOffset = (offset - 16).clamp(0, _data.lengthInBytes);
    final endOffset = (offset + 64).clamp(0, _data.lengthInBytes);
    final dumpBytes = _data.buffer.asUint8List(
      startOffset,
      endOffset - startOffset,
    );

    for (int i = 0; i < dumpBytes.length; i += 16) {
      final chunk = dumpBytes.sublist(i, (i + 16).clamp(0, dumpBytes.length));
      final hex = chunk
          .map((b) => b.toRadixString(16).padLeft(2, '0'))
          .join(' ');
      final ascii = chunk
          .map((b) => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.')
          .join('');

      final addr = (startOffset + i).toString().padLeft(5, '0');
      final marker = (startOffset + i == offset) ? ' ← OFFSET' : '';
      printlog('  $addr: $hex | $ascii$marker');
    }

    printlog('=== END HEX DUMP ===\n');
  }

  /// Verify we're at a valid boundary before reading critical counts
  void _assertValidBoundary(String sectionName) {
    printlog('\n[BOUNDARY CHECK] Section: $sectionName at offset: $_offset');

    // Check for unreasonable offset
    if (_offset > _data.lengthInBytes) {
      throw SerializationException(
        'Offset out of bounds: $_offset > ${_data.lengthInBytes}',
        offset: _offset,
      );
    }

    // Check alignment
    if ((_offset % 4) != 0) {
      printlog(
        '[BOUNDARY CHECK] WARNING: Offset $_offset not 4-byte aligned (offset % 4 = ${_offset % 4})',
      );
    }

    // Dump the area
    _dumpHexAround(_offset);
    printlog('[BOUNDARY CHECK] Done\n');
  }

  /// Compare write and read offsets for debugging
  void _logOffsetProgress(String stage, {int expectedBytes = 0}) {
    printlog(
      '[OFFSET] $stage: offset=$_offset, remaining=${_data.lengthInBytes - _offset} bytes, expected=$expectedBytes',
    );
  }
}

// ✓ NEW: Interface for DartFile with metadata support
abstract class DartFileWithMetadata {
  late WidgetMetadata widgetMetadata;
}
