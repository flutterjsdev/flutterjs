// ============================================================================
// FILE: binary_ir_reader.dart (UPDATED SECTIONS ONLY)
// Deserializes Flutter IR with widget metadata attachment
// ============================================================================

import 'dart:convert';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/ast_ir/widget_metadata.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/declaration_reader.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/expression_reader.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/reader.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_reader/type_reader.dart';

import '../binary_ir_writer/ir_relationship_registry.dart';
import 'statement_reader.dart';

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

    // ✓ NEW: Initialize relationship registry
    _relationships = IRRelationshipRegistry();

    try {
      // Step 1: Read and validate header
      _readHeader();

      // Step 2: Read string table
      readStringTable();

      // ✓ NEW: Step 3a: Read relationships section
      _readRelationshipsSection();

      // Step 3b: Read IR data
      final fileIR = _readFileIRData();

      // ✓ NEW: Step 4: Attach widget metadata to fileIR
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

    printlog('Header read - Checksum present: $_hasChecksumFlag');
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
      _stringTable[i] = readString();
    }

    printlog('[READ] String table: $stringCount strings');
  }

  // ✓ NEW: Read relationships section
  void _readRelationshipsSection() {
    try {
      printlog('[READ RELATIONSHIPS] START - offset: $_offset');

      final relationshipFlags = readUint16();
      printlog(
        '[READ RELATIONSHIPS] Flags: 0x${relationshipFlags.toRadixString(16)}',
      );

      // Read each relationship type based on flags
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

    // Read build methods
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

  // ✓ NEW: Read widget build outputs
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

  // ✓ NEW: Attach widget metadata to DartFile
  void _attachWidgetMetadata(DartFile fileIR) {
    final metadata = WidgetMetadata.fromRegistry(_relationships);

    // If you added extension to DartFile:
    // fileIR.attachWidgetMetadata(metadata);

    // Or if using a field directly on DartFile:
    if (fileIR is DartFileWithMetadata) {
      fileIR.attachWidgetMetadata(metadata);
    }

    printlog('[ATTACH] Widget metadata attached to DartFile');
    printlog('[METADATA] Build methods: ${metadata.buildMethods.length}');
    printlog(
      '[METADATA] Widget-State connections: ${metadata.widgetStateConnections.length}',
    );
    printlog(
      '[METADATA] State lifecycle methods: ${metadata.stateLifecycleMethods.length}',
    );
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
        'but only ${_data.lengthInBytes - _offset} available',
        offset: _offset,
      );
    }
  }

  @override
  String readStringRef() {
    final index = readUint32();
    if (index >= _stringTable.length) {
      throw SerializationException(
        'String reference $index out of bounds (table size: ${_stringTable.length})',
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
          'Return type error Unknown type kind: $typeKind',
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
      case BinaryConstants.EXPR_IDENTIFIER:
        return readIdentifierExpression();
      case BinaryConstants.OP_NULL_COALESCE:
        return readNullCoalescingExpression();
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
  
  @override
  FunctionDecl readFunctionDecl() {
    final id = readStringRef();

    final name = readStringRef();

    final returnType = readType();

    final isAsync = readByte() != 0;

    final isGenerator = readByte() != 0;

    final paramCount = readUint32();

    final parameters = <ParameterDecl>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(readParameterDecl());
    }

    final sourceLocation = readSourceLocation();

    // ✅ NEW: Read function body statements
    final hasBody = readByte() != 0;
    List<StatementIR>? body;
    if (hasBody) {
      final stmtCount = readUint32();
      body = <StatementIR>[];
      for (int i = 0; i < stmtCount; i++) {
        body.add(readStatement());
      }
    }

    return FunctionDecl(
      id: id,
      name: name,
      returnType: returnType,
      parameters: parameters,
      isAsync: isAsync,
      isGenerator: isGenerator,
      sourceLocation: sourceLocation,
      body: body, // ✅ NOW INCLUDED
    );
  }
  
  @override
  ParameterDecl readParameterDecl()  {
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
   MethodDecl readMethodDecl() {
    final id = readStringRef();

    final name = readStringRef();

    final returnType = readType();

    final isAsync = readByte() != 0;

    final isGenerator = readByte() != 0;

    final isStatic = readByte() != 0;

    final isAbstract = readByte() != 0;

    final isGetter = readByte() != 0;

    final isSetter = readByte() != 0;

    // CRITICAL: Read parameter count
    final paramCount = readUint32();

    // CRITICAL: Validate paramCount
    if (paramCount > 100) {
      throw SerializationException(
        'Invalid parameter count: $paramCount (likely misaligned bytes)',
        offset: _offset - 4,
      );
    }

    // CRITICAL: Read parameters in loop
    final parameters = <ParameterDecl>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(readParameterDecl());
    }

    final sourceLocation = readSourceLocation();

    // ✅ NEW: Read method body statements
    final hasBody = readByte() != 0;
    List<StatementIR>? body;
    if (hasBody) {
      final stmtCount = readUint32();
      body = <StatementIR>[];
      for (int i = 0; i < stmtCount; i++) {
        body.add(readStatement());
      }
    }

    return MethodDecl(
      id: id,
      name: name,
      returnType: returnType,
      parameters: parameters,
      isAsync: isAsync,
      isGenerator: isGenerator,
      isStatic: isStatic,
      isAbstract: isAbstract,
      isGetter: isGetter,
      isSetter: isSetter,
      sourceLocation: sourceLocation,
      body: body, // ✅ NOW INCLUDED
    );
  }



}

// ✓ NEW: Interface for DartFile with metadata support
abstract class DartFileWithMetadata {
  late WidgetMetadata widgetMetadata;
}
