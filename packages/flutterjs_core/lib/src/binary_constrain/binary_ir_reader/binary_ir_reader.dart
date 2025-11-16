import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/declaration_reader.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/expression_reader.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/reader.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/type_reader.dart';
import '../../ast_ir/ast_it.dart';
import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';
import '../binary_constain.dart';
import '../binary_ir_writer/binary_ir_writer.dart';
import 'statement_reader.dart';

/// Deserializes Flutter IR from binary format
///
/// Handles:
/// - Version compatibility checking
/// - Error recovery and detailed error reporting
/// - Checksum validation
/// - Full IR reconstruction
class BinaryIRReader with Reader, StatementReader, SourceLocation,ExpressionReader , TypeReader, DeclarationReader{
 
  late ByteData _data;
  late List<String> _stringTable;
  int _offset = 0;
  bool _hasChecksumFlag = false;
  bool _verbose = false;

  set _offSet(int offset) {
    _offset = offset;
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Deserialize a DartFile IR from binary format
  DartFile readFileIR(Uint8List bytes, {bool verbose = false}) {
    _verbose = verbose;

    printlog('\n=== START DEBUG ===\n');
    if (bytes.length < BinaryConstants.HEADER_SIZE) {
      throw SerializationException(
        'File too small: ${bytes.length} bytes (minimum ${BinaryConstants.HEADER_SIZE})',
        offset: 0,
      );
    }

    _data = ByteData.view(bytes.buffer);
    _offset = 0;
    _stringTable = [];

    try {
      // Step 1: Read and validate header
      _readHeader();

      // Step 2: Read string table
      readStringTable();

      // Step 3: Read IR data
      final fileIR = _readFileIRData();

      // Step 4: Validate checksum if present (handled in header)
      if (_hasChecksumFlag) {
        _validateChecksum(bytes);
      }

      return fileIR;
    } catch (e) {
      if (e is SerializationException) rethrow;
      throw SerializationException(
        'Failed to deserialize: $e',
        offset: _offset,
      );
    }
  }

  // =========================================================================
  // HEADER READING
  // =========================================================================

  void _readHeader() {
    // Magic number validation
    final magic = readUint32();
    if (magic != BinaryConstants.MAGIC_NUMBER) {
      throw SerializationException(
        'Invalid magic number: 0x${magic.toRadixString(16)} '
        '(expected 0x${BinaryConstants.MAGIC_NUMBER.toRadixString(16)})',
        offset: 0,
      );
    }

    // Format version check
    final version = readUint16();
    if (version != BinaryConstants.FORMAT_VERSION) {
      throw SerializationException(
        'Unsupported format version: $version (current: ${BinaryConstants.FORMAT_VERSION})',
        offset: 4,
      );
    }

    // Flags
    final flags = readUint16();
    _hasChecksumFlag = (flags & BinaryConstants.FLAG_HAS_CHECKSUM) != 0;
    final isCompressed = (flags & BinaryConstants.FLAG_COMPRESSED) != 0;

    if (isCompressed) {
      throw SerializationException(
        'Compressed format not yet supported',
        offset: 6,
      );
    }

    printlog('Header read - Checksum present: $_hasChecksumFlag');
  }

  // =========================================================================
  // STRING TABLE READING
  // =========================================================================

  void readStringTable() {
    final stringCount = readUint32();

    if (stringCount > BinaryConstants.MAX_STRING_COUNT) {
      throw SerializationException(
        'String count too large: $stringCount (max ${BinaryConstants.MAX_STRING_COUNT})',
        offset: _offset - 4,
      );
    }

    _stringTable = List<String>.filled(stringCount, '');

    for (int i = 0; i < stringCount; i++) {
      _stringTable[i] = readString();
    }
  }

 

  DartFile _readFileIRData() {
    printlog('[READ FILE IR DATA] START - offset: $_offset');

    final filePath = readStringRef();
    printlog('[READ FILE IR] After filePath: $_offset');

    final builder = DartFileBuilder(filePath: filePath);

    final contentHash = readStringRef();
    printlog('[READ FILE IR] After contentHash: $_offset');

    final libraryName = readStringRef();
    printlog('[READ FILE IR] After library: $_offset');

    builder
      ..withContentHash(contentHash)
      ..withLibrary(libraryName);

    // Analysis metadata
    final analyzedAt = readUint64();
    printlog('[READ FILE IR] After analyzedAt: $_offset');

    // Imports
    final importCount = readUint32();
    printlog('[READ FILE IR] After importCount: $_offset, count: $importCount');

    for (int i = 0; i < importCount; i++) {
      builder.addImport(readImportStmt());
    }
    printlog('[READ FILE IR] After imports loop: $_offset');

    // Exports
    final exportCount = readUint32();
    printlog('[READ FILE IR] After exportCount: $_offset, count: $exportCount');

    for (int i = 0; i < exportCount; i++) {
      builder.addExport(readExportStmt());
    }
    printlog('[READ FILE IR] After exports loop: $_offset');

    // Variables
    final varCount = readUint32();
    printlog('[READ FILE IR] After varCount: $_offset');

    for (int i = 0; i < varCount; i++) {
      builder.addVariable(readVariableDecl());
    }
    printlog('[READ FILE IR] After variables: $_offset');

    // Functions
    final funcCount = readUint32();
    printlog('[READ FILE IR] After funcCount: $_offset');

    for (int i = 0; i < funcCount; i++) {
      builder.addFunction(readFunctionDecl());
    }
    printlog('[READ FILE IR] After functions: $_offset');

    // Classes
    final classCount = readUint32();
    printlog('[READ FILE IR] After classCount: $_offset');

    for (int i = 0; i < classCount; i++) {
      builder.addClass(readClassDecl());
    }
    printlog('[READ FILE IR] After classes: $_offset');

    // Analysis issues
    final issueCount = readUint32();
    printlog('[READ FILE IR] After issueCount: $_offset');

    for (int i = 0; i < issueCount; i++) {
      builder.addIssue(_readAnalysisIssue());
    }
    printlog('[READ FILE IR] After issues: $_offset');
    printlog('[READ FILE IR DATA] END');

    return builder.build();
  }

  AnnotationIR _readAnnotation() {
    final name = readStringRef();

    final argCount = readUint32();
    final arguments = <ExpressionIR>[];
    for (int i = 0; i < argCount; i++) {
      arguments.add(readExpression());
    }

    final namedArgCount = readUint32();
    final namedArguments = <String, ExpressionIR>{};
    for (int i = 0; i < namedArgCount; i++) {
      final key = readStringRef();
      final value = readExpression();
      namedArguments[key] = value;
    }

    final sourceLocation = readSourceLocation();

    return AnnotationIR(
      name: name,
      arguments: arguments,
      namedArguments: namedArguments,
      sourceLocation: sourceLocation,
    );
  }

 
  // =========================================================================
  // STEP 6: Add checksum validation method (NEW)
  // =========================================================================
  /// Validates the checksum at the end of the file


  void _validateChecksum(Uint8List allBytes) {
    // Checksum is the last 32 bytes
    if (allBytes.length < BinaryConstants.CHECKSUM_SIZE) {
      throw SerializationException(
        'File too small for checksum: ${allBytes.length} bytes',
        offset: allBytes.length,
      );
    }

    // Extract checksum from end of file
    final checksumStart = allBytes.length - BinaryConstants.CHECKSUM_SIZE;
    final checksumFromFile = allBytes.sublist(checksumStart);

    // Get data WITHOUT the checksum
    final dataWithoutChecksum = allBytes.sublist(0, checksumStart);

    // Recompute checksum
    final computedDigest = sha256.convert(dataWithoutChecksum);
    final computedChecksum = computedDigest.bytes;

    // Compare
    if (!bytesEqual(computedChecksum, checksumFromFile)) {
      printlog(
        'File checksum: ${checksumFromFile.map((b) => b.toRadixString(16).padLeft(2, '0')).join('')}',
      );
      printlog('Computed checksum: ${computedDigest.toString()}');

      throw SerializationException(
        'Checksum mismatch: file may be corrupted or tampered with',
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

  

 

  // --- Binary & Unary Operations ---

  // ============================================================================
  // STATEMENT SERIALIZATION - READER METHODS
  // ============================================================================
  // Add these methods to BinaryIRReader class

  void printlog(String message) {
    if (_verbose) {
      print(message);
    }
  }
}
