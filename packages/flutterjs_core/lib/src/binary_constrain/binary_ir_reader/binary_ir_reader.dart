import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import '../../ast_ir/ast_it.dart';
import '../../ast_ir/ir/expression_types/cascade_expression_ir.dart';
import '../binary_constain.dart';
import '../binary_ir_writer/binary_ir_writer.dart';

/// Deserializes Flutter IR from binary format
///
/// Handles:
/// - Version compatibility checking
/// - Error recovery and detailed error reporting
/// - Checksum validation
/// - Full IR reconstruction
class BinaryIRReader {
  int _entryIdCounter = 0;
  int _exprIdCounter = 0;
  late ByteData _data;
  late List<String> _stringTable;
  int _offset = 0;
  bool _hasChecksumFlag = false;
  bool _verbose = false;
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
      _readStringTable();

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
    final magic = _readUint32();
    if (magic != BinaryConstants.MAGIC_NUMBER) {
      throw SerializationException(
        'Invalid magic number: 0x${magic.toRadixString(16)} '
        '(expected 0x${BinaryConstants.MAGIC_NUMBER.toRadixString(16)})',
        offset: 0,
      );
    }

    // Format version check
    final version = _readUint16();
    if (version != BinaryConstants.FORMAT_VERSION) {
      throw SerializationException(
        'Unsupported format version: $version (current: ${BinaryConstants.FORMAT_VERSION})',
        offset: 4,
      );
    }

    // Flags
    final flags = _readUint16();
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

  void _readStringTable() {
    final stringCount = _readUint32();

    if (stringCount > BinaryConstants.MAX_STRING_COUNT) {
      throw SerializationException(
        'String count too large: $stringCount (max ${BinaryConstants.MAX_STRING_COUNT})',
        offset: _offset - 4,
      );
    }

    _stringTable = List<String>.filled(stringCount, '');

    for (int i = 0; i < stringCount; i++) {
      _stringTable[i] = _readString();
    }
  }

  String _readStringRef() {
    final index = _readUint32();
    if (index >= _stringTable.length) {
      throw SerializationException(
        'String reference $index out of bounds (table size: ${_stringTable.length})',
        offset: _offset - 4,
      );
    }
    return _stringTable[index];
  }

  DartFile _readFileIRData() {
    printlog('[READ FILE IR DATA] START - offset: $_offset');

    final filePath = _readStringRef();
    printlog('[READ FILE IR] After filePath: $_offset');

    final builder = DartFileBuilder(filePath: filePath);

    final contentHash = _readStringRef();
    printlog('[READ FILE IR] After contentHash: $_offset');

    final libraryName = _readStringRef();
    printlog('[READ FILE IR] After library: $_offset');

    builder
      ..withContentHash(contentHash)
      ..withLibrary(libraryName);

    // Analysis metadata
    final analyzedAt = _readUint64();
    printlog('[READ FILE IR] After analyzedAt: $_offset');

    // Imports
    final importCount = _readUint32();
    printlog('[READ FILE IR] After importCount: $_offset, count: $importCount');

    for (int i = 0; i < importCount; i++) {
      builder.addImport(_readImportStmt());
    }
    printlog('[READ FILE IR] After imports loop: $_offset');

    // Exports
    final exportCount = _readUint32();
    printlog('[READ FILE IR] After exportCount: $_offset, count: $exportCount');

    for (int i = 0; i < exportCount; i++) {
      builder.addExport(_readExportStmt());
    }
    printlog('[READ FILE IR] After exports loop: $_offset');

    // Variables
    final varCount = _readUint32();
    printlog('[READ FILE IR] After varCount: $_offset');

    for (int i = 0; i < varCount; i++) {
      builder.addVariable(_readVariableDecl());
    }
    printlog('[READ FILE IR] After variables: $_offset');

    // Functions
    final funcCount = _readUint32();
    printlog('[READ FILE IR] After funcCount: $_offset');

    for (int i = 0; i < funcCount; i++) {
      builder.addFunction(_readFunctionDecl());
    }
    printlog('[READ FILE IR] After functions: $_offset');

    // Classes
    final classCount = _readUint32();
    printlog('[READ FILE IR] After classCount: $_offset');

    for (int i = 0; i < classCount; i++) {
      builder.addClass(_readClassDecl());
    }
    printlog('[READ FILE IR] After classes: $_offset');

    // Analysis issues
    final issueCount = _readUint32();
    printlog('[READ FILE IR] After issueCount: $_offset');

    for (int i = 0; i < issueCount; i++) {
      builder.addIssue(_readAnalysisIssue());
    }
    printlog('[READ FILE IR] After issues: $_offset');
    printlog('[READ FILE IR DATA] END');

    return builder.build();
  }

  AnnotationIR _readAnnotation() {
    final name = _readStringRef();

    final argCount = _readUint32();
    final arguments = <ExpressionIR>[];
    for (int i = 0; i < argCount; i++) {
      arguments.add(_readExpression());
    }

    final namedArgCount = _readUint32();
    final namedArguments = <String, ExpressionIR>{};
    for (int i = 0; i < namedArgCount; i++) {
      final key = _readStringRef();
      final value = _readExpression();
      namedArguments[key] = value;
    }

    final sourceLocation = _readSourceLocation();

    return AnnotationIR(
      name: name,
      arguments: arguments,
      namedArguments: namedArguments,
      sourceLocation: sourceLocation,
    );
  }

  ImportStmt _readImportStmt() {
    printlog('[READ IMPORT] START - offset: $_offset');

    final uri = _readStringRef();
    printlog('[READ IMPORT] After uri: $_offset');

    final hasPrefix = _readByte() != 0;
    printlog('[READ IMPORT] After prefix flag: $_offset');

    final prefix = hasPrefix ? _readStringRef() : null;
    printlog('[READ IMPORT] After prefix: $_offset');

    final isDeferred = _readByte() != 0;
    printlog('[READ IMPORT] After deferred: $_offset');

    final showCount = _readUint32();
    printlog('[READ IMPORT] After showCount: $_offset, count: $showCount');

    final showList = <String>[];
    for (int i = 0; i < showCount; i++) {
      showList.add(_readStringRef());
    }
    printlog('[READ IMPORT] After showList: $_offset');

    final hideCount = _readUint32();
    printlog('[READ IMPORT] After hideCount: $_offset, count: $hideCount');

    final hideList = <String>[];
    for (int i = 0; i < hideCount; i++) {
      hideList.add(_readStringRef());
    }
    printlog('[READ IMPORT] After hideList: $_offset');

    final sourceLocation = _readSourceLocation();
    printlog('[READ IMPORT] After sourceLocation: $_offset');
    printlog('[READ IMPORT] END');

    return ImportStmt(
      uri: uri,
      prefix: prefix,
      isDeferred: isDeferred,
      showList: showList,
      hideList: hideList,
      sourceLocation: sourceLocation,
      annotations: const [],
    );
  }

  ExportStmt _readExportStmt() {
    printlog('[READ EXPORT] START - offset: $_offset');

    final uri = _readStringRef();
    printlog('[READ EXPORT] After uri: $_offset');

    final showCount = _readUint32();
    printlog('[READ EXPORT] After showCount: $_offset, count: $showCount');

    final showList = <String>[];
    for (int i = 0; i < showCount; i++) {
      showList.add(_readStringRef());
    }
    printlog('[READ EXPORT] After showList: $_offset');

    final hideCount = _readUint32();
    printlog('[READ EXPORT] After hideCount: $_offset, count: $hideCount');

    final hideList = <String>[];
    for (int i = 0; i < hideCount; i++) {
      hideList.add(_readStringRef());
    }
    printlog('[READ EXPORT] After hideList: $_offset');

    final sourceLocation = _readSourceLocation();
    printlog('[READ EXPORT] After sourceLocation: $_offset');
    printlog('[READ EXPORT] END');

    return ExportStmt(
      uri: uri,
      showList: showList,
      hideList: hideList,
      sourceLocation: sourceLocation,
    );
  }

  VariableDecl _readVariableDecl() {
    printlog('[READ Variable] START - offset: $_offset');
    final id = _readStringRef();
    printlog('[READ Variable] After - id: $_offset');
    final name = _readStringRef();
    printlog('[READ Variable] After - name: $_offset');
    final type = _readType();
    printlog('[READ Variable] After - tyep: $_offset');

    final isFinal = _readByte() != 0;
    printlog('[READ Variable] After - isFinal: $_offset');
    final isConst = _readByte() != 0;
    printlog('[READ Variable] After - isConst: $_offset');
    final isStatic = _readByte() != 0;
    printlog('[READ Variable] After - isStatic: $_offset');
    final isLate = _readByte() != 0;
    printlog('[READ Variable] After - isLate: $_offset');
    final isPrivate = _readByte() != 0;
    printlog('[READ Variable] After - isPrivate: $_offset');

    final hasInitializer = _readByte() != 0;
    printlog('[READ Variable] After - hasInitializer: $_offset');
    ExpressionIR? initializer;
    if (hasInitializer) {
      initializer = _readExpression();
    }
    printlog('[READ Variable] After - initializer: $_offset');

    final sourceLocation = _readSourceLocation();
    printlog('[READ Variable] After - sourceLocation: $_offset');

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

  FunctionDecl _readFunctionDecl() {
    printlog('[READ FUNC] START - offset: $_offset');

    final id = _readStringRef();
    printlog('[READ FUNC] After id: $_offset');

    final name = _readStringRef();
    printlog('[READ FUNC] After name: $_offset');

    final returnType = _readType();
    printlog('[READ FUNC] After returnType: $_offset');

    final isAsync = _readByte() != 0;
    printlog('[READ FUNC] After isAsync: $_offset');

    final isGenerator = _readByte() != 0;
    printlog('[READ FUNC] After isGenerator: $_offset');

    final paramCount = _readUint32();
    printlog('[READ FUNC] After paramCount: $_offset, count: $paramCount');

    final parameters = <ParameterDecl>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(_readParameterDecl());
    }
    printlog('[READ FUNC] After parameters: $_offset');

    final sourceLocation = _readSourceLocation();
    printlog('[READ FUNC] After sourceLocation: $_offset');
    printlog('[READ FUNC] END');

    return FunctionDecl(
      id: id,
      name: name,
      returnType: returnType,
      parameters: parameters,
      isAsync: isAsync,
      isGenerator: isGenerator,
      sourceLocation: sourceLocation,
    );
  }

  ParameterDecl _readParameterDecl() {
    final id = _readStringRef();
    final name = _readStringRef();
    final type = _readType();

    final isRequired = _readByte() != 0;
    final isNamed = _readByte() != 0;
    final isPositional = _readByte() != 0;

    final hasDefaultValue = _readByte() != 0;
    ExpressionIR? defaultValue;
    if (hasDefaultValue) {
      defaultValue = _readExpression();
    }

    final sourceLocation = _readSourceLocation();

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

  ClassDecl _readClassDecl() {
    printlog('[READ CLASS] START - offset: $_offset');

    final id = _readStringRef();
    printlog('[READ CLASS] After id: $_offset');

    final name = _readStringRef();
    printlog('[READ CLASS] After name: $_offset');

    final isAbstract = _readByte() != 0;
    printlog('[READ CLASS] After isAbstract: $_offset');

    final isFinal = _readByte() != 0;
    printlog('[READ CLASS] After isFinal: $_offset');

    final hasSuperclass = _readByte() != 0;
    printlog('[READ CLASS] After hasSuperclass: $_offset');

    TypeIR? superclass;
    if (hasSuperclass) {
      superclass = _readType();
    }
    printlog('[READ CLASS] After superclass: $_offset');

    final interfaceCount = _readUint32();
    printlog('[READ CLASS] After interfaceCount: $_offset');

    final interfaces = <TypeIR>[];
    for (int i = 0; i < interfaceCount; i++) {
      interfaces.add(_readType());
    }
    printlog('[READ CLASS] After interfaces: $_offset');

    final mixinCount = _readUint32();
    printlog('[READ CLASS] After mixinCount: $_offset');

    final mixins = <TypeIR>[];
    for (int i = 0; i < mixinCount; i++) {
      mixins.add(_readType());
    }
    printlog('[READ CLASS] After mixins: $_offset');

    final fieldCount = _readUint32();
    printlog('[READ CLASS] After fieldCount: $_offset');

    final fields = <FieldDecl>[];
    for (int i = 0; i < fieldCount; i++) {
      fields.add(_readFieldDecl());
    }
    printlog('[READ CLASS] After fields: $_offset');

    final methodCount = _readUint32();
    printlog('[READ CLASS] After methodCount: $_offset');

    final methods = <MethodDecl>[];
    for (int i = 0; i < methodCount; i++) {
      methods.add(_readMethodDecl());
    }
    printlog('[READ CLASS] After methods: $_offset');

    final constructorCount = _readUint32();
    printlog('[READ CLASS] After constructorCount: $_offset');

    final constructors = <ConstructorDecl>[];
    for (int i = 0; i < constructorCount; i++) {
      constructors.add(_readConstructorDecl());
    }
    printlog('[READ CLASS] After constructors: $_offset');

    final sourceLocation = _readSourceLocation();
    printlog('[READ CLASS] After sourceLocation: $_offset');
    printlog('[READ CLASS] END');

    return ClassDecl(
      id: id,
      name: name,
      superclass: superclass,
      interfaces: interfaces,
      mixins: mixins,
      fields: fields,
      methods: methods,
      constructors: constructors,
      isAbstract: isAbstract,
      isFinal: isFinal,
      sourceLocation: sourceLocation,
    );
  }

  FieldDecl _readFieldDecl() {
    final id = _readStringRef();
    final name = _readStringRef();
    final type = _readType();

    final isFinal = _readByte() != 0;
    final isConst = _readByte() != 0;
    final isStatic = _readByte() != 0;
    final isLate = _readByte() != 0;
    final isPrivate = _readByte() != 0;

    final hasInitializer = _readByte() != 0;
    ExpressionIR? initializer;
    if (hasInitializer) {
      initializer = _readExpression();
    }

    final sourceLocation = _readSourceLocation();

    return FieldDecl(
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
      sourceLocation: sourceLocation,
      isPrivate: isPrivate,
    );
  }

  MethodDecl _readMethodDecl() {
    printlog('[READ CLASS Method] START - offset: $_offset');

    final id = _readStringRef();
    printlog('[READ CLASS Method] After id: $_offset');

    final name = _readStringRef();
    printlog('[READ CLASS Method] After name: $_offset');

    final returnType = _readType();
    printlog('[READ CLASS Method] After returnType: $_offset');

    final isAsync = _readByte() != 0;
    printlog('[READ CLASS Method] After isAsync: $_offset (value: $isAsync)');

    final isGenerator = _readByte() != 0;
    printlog(
      '[READ CLASS Method] After isGenerator: $_offset (value: $isGenerator)',
    );

    final isStatic = _readByte() != 0;
    printlog('[READ CLASS Method] After isStatic: $_offset (value: $isStatic)');

    final isAbstract = _readByte() != 0;
    printlog(
      '[READ CLASS Method] After isAbstract: $_offset (value: $isAbstract)',
    );

    final isGetter = _readByte() != 0;
    printlog('[READ CLASS Method] After isGetter: $_offset (value: $isGetter)');

    final isSetter = _readByte() != 0;
    printlog('[READ CLASS Method] After isSetter: $_offset (value: $isSetter)');

    // CRITICAL: Read parameter count
    final paramCount = _readUint32();
    printlog(
      '[READ CLASS Method] After paramCount: $_offset (value: $paramCount)',
    );

    // CRITICAL: Validate paramCount
    if (paramCount > 100) {
      printlog(
        '[READ CLASS Method] ERROR: paramCount=$paramCount seems wrong!',
      );
      printlog('[READ CLASS Method] String table size: ${_stringTable.length}');
      throw SerializationException(
        'Invalid parameter count: $paramCount (likely misaligned bytes)',
        offset: _offset - 4,
      );
    }

    // CRITICAL: Read parameters in loop
    final parameters = <ParameterDecl>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(_readParameterDecl());
    }
    printlog('[READ CLASS Method] After parameters loop: $_offset');

    final sourceLocation = _readSourceLocation();
    printlog('[READ CLASS Method] After sourceLocation: $_offset');

    printlog('[READ CLASS Method] END\n');

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
    );
  }

  ConstructorDecl _readConstructorDecl() {
    final id = _readStringRef();
    final constructorClass = _readStringRef();

    final hasName = _readByte() != 0;
    final constructorName = hasName ? _readStringRef() : null;

    final isConst = _readByte() != 0;
    final isFactory = _readByte() != 0;

    final paramCount = _readUint32();
    final parameters = <ParameterDecl>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(_readParameterDecl());
    }

    final sourceLocation = _readSourceLocation();

    return ConstructorDecl(
      id: id,
      name: constructorName ?? '',
      constructorClass: constructorClass,
      constructorName: constructorName,
      parameters: parameters,
      isConst: isConst,
      isFactory: isFactory,
      sourceLocation: sourceLocation,
    );
  }

  // =========================================================================
  // STEP 6: Add checksum validation method (NEW)
  // =========================================================================
  /// Validates the checksum at the end of the file
  bool _bytesEqual(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

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
    if (!_bytesEqual(computedChecksum, checksumFromFile)) {
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
    final id = _readStringRef();
    final code = _readStringRef();
    final message = _readStringRef();

    final severityIndex = _readByte();
    final severity = IssueSeverity.values[severityIndex];

    final categoryIndex = _readByte();
    final category = IssueCategory.values[categoryIndex];

    final hasSuggestion = _readByte() != 0;
    final suggestion = hasSuggestion ? _readStringRef() : null;

    final sourceLocation = _readSourceLocation();

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

  // =========================================================================
  // TYPE READING
  // =========================================================================

  TypeIR _readType() {
    final typeKind = _readByte();

    switch (typeKind) {
      case BinaryConstants.TYPE_SIMPLE:
        final name = _readStringRef();
        final isNullable = _readByte() != 0;
        return SimpleTypeIR(
          id: 'type_${name}_simple',
          name: name,
          isNullable: isNullable,
          sourceLocation: SourceLocationIR(
            id: 'loc_type',
            file: 'builtin',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
        );

      case BinaryConstants.TYPE_DYNAMIC:
        return DynamicTypeIR(
          id: 'type_dynamic',
          sourceLocation: SourceLocationIR(
            id: 'loc_type',
            file: 'builtin',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
        );

      case BinaryConstants.TYPE_VOID:
        return VoidTypeIR(
          id: 'type_void',
          sourceLocation: SourceLocationIR(
            id: 'loc_type',
            file: 'builtin',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
        );

      case BinaryConstants.TYPE_NEVER:
        return NeverTypeIR(
          id: 'type_never',
          sourceLocation: SourceLocationIR(
            id: 'loc_type',
            file: 'builtin',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
        );

      default:
        throw SerializationException(
          'Return type error Unknown type kind: $typeKind',
          offset: _offset - 1,
        );
    }
  }

  // =========================================================================
  // EXPRESSION READING
  // =========================================================================

  ExpressionIR _readExpression() {
    final exprType = _readByte();

    switch (exprType) {
      case BinaryConstants.EXPR_LITERAL:
        return _readLiteralExpression();

      case BinaryConstants.EXPR_IDENTIFIER:
        final name = _readStringRef();
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
        return _readBinaryExpression();

      case BinaryConstants.EXPR_METHOD_CALL:
        return _readMethodCallExpression();

      case BinaryConstants.EXPR_PROPERTY_ACCESS:
        return _readPropertyAccessExpression();

      case BinaryConstants.EXPR_CONDITIONAL:
        return _readConditionalExpression();

      case BinaryConstants.EXPR_LIST_LITERAL:
        return _readListLiteralExpression();

      case BinaryConstants.EXPR_MAP_LITERAL:
        return _readMapLiteralExpression();
      case BinaryConstants.EXPR_SET_LITERAL:
        return _readSetLiteralExpression();
      case BinaryConstants.EXPR_UNARY:
        return _readUnaryExpression();
      case BinaryConstants.EXPR_COMPOUND_ASSIGNMENT:
        return _readCompoundAssignmentExpression();
      case BinaryConstants.EXPR_ASSIGNMENT:
        return _readAssignmentExpression();
      case BinaryConstants.EXPR_INDEX_ACCESS:
        return _readIndexAccessExpression();
      case BinaryConstants.EXPR_CASCADE:
        return _readCascadeExpression();
      case BinaryConstants.EXPR_CAST:
        return _readCastExpression();
      case BinaryConstants.EXPR_TYPE_CHECK:
        return _readTypeCheckExpression();
      case BinaryConstants.EXPR_AWAIT:
        return _readAwaitExpression();
      case BinaryConstants.EXPR_THROW:
        return _readThrowExpression();
      case BinaryConstants.EXPR_NULL_AWARE:
        return _readNullAwareAccessExpression();

      case BinaryConstants.EXPR_FUNCTION_CALL:
        return _readFunctionCallExpression();
      case BinaryConstants.EXPR_STRING_INTERPOLATION:
        return _readStringInterpolationExpression();
      case BinaryConstants.EXPR_THIS:
        return _readThisExpression();
      case BinaryConstants.EXPR_SUPER:
        return _readSuperExpression();
      case BinaryConstants.EXPR_PARENTHESIZED:
        return _readParenthesizedExpression();
      case BinaryConstants.EXPR_INSTANCE_CREATION:
        return _readInstanceCreationExpression();
      case BinaryConstants.EXPR_LAMBDA:
        return _readLambdaExpression();
      case BinaryConstants.EXPR_IDENTIFIER:
        return _readIdentifierExpression();
      case BinaryConstants.OP_NULL_COALESCE:
        return _readNullCoalescingExpression();
      default:
        throw SerializationException(
          'Unknown expression type: 0x${exprType.toRadixString(16)}',
          offset: _offset - 1,
        );
    }
  }

  LiteralExpressionIR _readLiteralExpression() {
    final literalTypeIndex = _readByte();
    final literalType = LiteralType.values[literalTypeIndex];

    dynamic value;
    switch (literalType) {
      case LiteralType.stringValue:
        value = _readStringRef();
        break;
      case LiteralType.intValue:
        value = _readInt64();
        break;
      case LiteralType.doubleValue:
        value = _readDouble();
        break;
      case LiteralType.boolValue:
        value = _readByte() != 0;
        break;
      case LiteralType.nullValue:
        value = null;
        break;
      default:
        value = null;
    }

    final sourceLocation = _readSourceLocation();

    return LiteralExpressionIR(
      id: 'expr_lit_$value',
      resultType: DynamicTypeIR(
        id: 'type_dynamic',
        sourceLocation: sourceLocation,
      ),
      sourceLocation: sourceLocation,
      value: value,
      literalType: literalType,
    );
  }

  PropertyAccessExpressionIR _readPropertyAccessExpression() {
    final target = _readExpression();
    final propertyName = _readStringRef();
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();

    return PropertyAccessExpressionIR(
      resultType: resultType,
      id: 'expr_prop',
      target: target,
      propertyName: propertyName,
      sourceLocation: sourceLocation,
    );
  }

  ConditionalExpressionIR _readConditionalExpression() {
    final condition = _readExpression();
    final thenExpression = _readExpression();
    final elseExpression = _readExpression();
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();

    return ConditionalExpressionIR(
      resultType: resultType,
      id: 'expr_cond',
      condition: condition,
      thenExpression: thenExpression,
      elseExpression: elseExpression,
      sourceLocation: sourceLocation,
    );
  }

  // =========================================================================
  // SOURCE LOCATION READING
  // =========================================================================

  SourceLocationIR _readSourceLocation() {
    final file = _readStringRef();
    final line = _readUint32();
    final column = _readUint32();
    final offset = _readUint32();
    final length = _readUint32();

    return SourceLocationIR(
      id: 'loc_${file}_${line}',
      file: file,
      line: line,
      column: column,
      offset: offset,
      length: length,
    );
  }

  // =========================================================================
  // LOW-LEVEL BINARY READING
  // =========================================================================

  int _readByte() {
    _boundsCheck(1);
    return _data.getUint8(_offset++) & 0xFF;
  }

  int _readUint16() {
    _boundsCheck(2);
    final value = _data.getUint16(_offset, Endian.little);
    _offset += 2;
    return value;
  }

  int _readUint32() {
    _boundsCheck(4);
    final value = _data.getUint32(_offset, Endian.little);
    _offset += 4;
    return value;
  }

  int _readInt64() {
    _boundsCheck(8);
    final value = _data.getInt64(_offset, Endian.little);
    _offset += 8;
    return value;
  }

  int _readUint64() {
    _boundsCheck(8);
    final value = _data.getUint64(_offset, Endian.little);
    _offset += 8;
    return value;
  }

  double _readDouble() {
    _boundsCheck(8);
    final value = _data.getFloat64(_offset, Endian.little);
    _offset += 8;
    return value;
  }

  String _readString() {
    final length = _readUint16();
    if (length > BinaryConstants.MAX_STRING_LENGTH) {
      throw SerializationException(
        'String length too large: $length',
        offset: _offset - 2,
      );
    }

    _boundsCheck(length);
    final bytes = _data.buffer.asUint8List(_offset, length);
    _offset += length;

    return utf8.decode(bytes);
  }

  void _boundsCheck(int bytesNeeded) {
    if (_offset + bytesNeeded > _data.lengthInBytes) {
      throw SerializationException(
        'Unexpected end of data: need $bytesNeeded bytes, '
        'but only ${_data.lengthInBytes - _offset} available',
        offset: _offset,
      );
    }
  }

  SetExpressionIR _readSetLiteralExpression() {
    final elementCount = _readUint32();
    final elements = <ExpressionIR>[];
    for (int i = 0; i < elementCount; i++) {
      elements.add(_readExpression());
    }
    final elementType = _readType();
    final sourceLocation = _readSourceLocation();

    return SetExpressionIR(
      id: 'expr_set',
      elements: elements,
      resultType: elementType,

      // resultType: DynamicTypeIR(id: 'type_set', sourceLocation: sourceLocation),
      sourceLocation: sourceLocation,
    );
  }

  // --- Binary & Unary Operations ---

  BinaryExpressionIR _readBinaryExpression() {
    final left = _readExpression();
    final operatorIndex = _readByte();
    final operator = BinaryOperatorIR.values[operatorIndex];
    final right = _readExpression();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return BinaryExpressionIR(
      id: 'expr_bin',
      left: left,
      operator: operator,
      right: right,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  UnaryExpressionIR _readUnaryExpression() {
    final operatorIndex = _readByte();
    final operator = UnaryOperator.values[operatorIndex];
    final operand = _readExpression();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return UnaryExpressionIR(
      id: 'expr_unary',
      operator: operator,
      operand: operand,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  CompoundAssignmentExpressionIR _readCompoundAssignmentExpression() {
    final target = _readExpression();
    final operatorIndex = _readByte();
    final operator = BinaryOperatorIR.values[operatorIndex];
    final value = _readExpression();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return CompoundAssignmentExpressionIR(
      id: 'expr_compound_assign',
      target: target,
      operator: operator,
      value: value,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Assignment & Access ---

  AssignmentExpressionIR _readAssignmentExpression() {
    final target = _readExpression();
    final value = _readExpression();
    // final isCompound = _readByte() != 0;
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    return AssignmentExpressionIR(
      id: 'expr_assign',
      target: target,
      value: value,
      resultType: resultType,

      sourceLocation: sourceLocation,
    );
  }

  IndexAccessExpressionIR _readIndexAccessExpression() {
    final target = _readExpression();
    final index = _readExpression();
    final resultType = _readType();
    final isNullAware = _readByte() != 0;
    final sourceLocation = _readSourceLocation();

    return IndexAccessExpressionIR(
      id: 'expr_index',
      target: target,
      index: index,
      resultType: resultType,
      isNullAware: isNullAware,
      sourceLocation: sourceLocation,
    );
  }

  CascadeExpressionIR _readCascadeExpression() {
    final target = _readExpression();
    final sectionCount = _readUint32();
    final cascadeSections = <ExpressionIR>[];
    for (int i = 0; i < sectionCount; i++) {
      cascadeSections.add(_readExpression());
    }
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    return CascadeExpressionIR(
      id: 'expr_cascade',
      target: target,
      cascadeSections: cascadeSections,
      sourceLocation: sourceLocation,
      resultType: resultType,
    );
  }

  // --- Type Operations ---

  CastExpressionIR _readCastExpression() {
    final expression = _readExpression();
    final targetType = _readType();
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    return CastExpressionIR(
      resultType: resultType,
      id: 'expr_cast',
      expression: expression,
      targetType: targetType,
      sourceLocation: sourceLocation,
    );
  }

  TypeCheckExpr _readTypeCheckExpression() {
    final expression = _readExpression();
    final checkType = _readType();
    final isNegated = _readByte() != 0;
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    return TypeCheckExpr(
      id: 'expr_typecheck',
      expression: expression,
      typeToCheck: checkType,
      resultType: resultType,
      isNegated: isNegated,
      sourceLocation: sourceLocation,
    );
  }

  // --- Async Operations ---

  AwaitExpr _readAwaitExpression() {
    final futureExpression = _readExpression();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return AwaitExpr(
      id: 'expr_await',
      futureExpression: futureExpression,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  ThrowExpr _readThrowExpression() {
    final exception = _readExpression();
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    return ThrowExpr(
      id: 'expr_throw',
      // exception: exception,
      exceptionExpression: exception,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Null-Aware Operations ---

  NullAwareAccessExpressionIR _readNullAwareAccessExpression() {
    final target = _readExpression();
    final operationTypeIndex = _readByte();
    final operationType = NullAwareOperationType.values[operationTypeIndex];
    final hasOperationData = _readByte() != 0;
    final operationData = hasOperationData ? _readStringRef() : null;
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return NullAwareAccessExpressionIR(
      id: 'expr_nullaware',
      target: target,
      operationType: operationType,
      operationData: operationData,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  NullCoalescingExpressionIR _readNullCoalescingExpression() {
    final left = _readExpression();
    final right = _readExpression();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return NullCoalescingExpressionIR(
      id: 'expr_nullcoalesce',
      left: left,
      right: right,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Function & Method Calls ---

  MethodCallExpressionIR _readMethodCallExpression() {
    final hasTarget = _readByte() != 0;
    ExpressionIR? target;
    if (hasTarget) {
      target = _readExpression();
    }

    final methodName = _readStringRef();

    final argCount = _readUint32();
    final arguments = <ExpressionIR>[];
    for (int i = 0; i < argCount; i++) {
      arguments.add(_readExpression());
    }

    final namedArgCount = _readUint32();
    final namedArguments = <String, ExpressionIR>{};
    for (int i = 0; i < namedArgCount; i++) {
      final key = _readStringRef();
      final value = _readExpression();
      namedArguments[key] = value;
    }

    final isNullAware = _readByte() != 0;
    final isCascade = _readByte() != 0;
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return MethodCallExpressionIR(
      id: 'expr_method',
      target: target,
      methodName: methodName,
      arguments: arguments,
      namedArguments: namedArguments,
      isNullAware: isNullAware,
      isCascade: isCascade,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  FunctionCallExpr _readFunctionCallExpression() {
    final functionName = _readStringRef();

    final argCount = _readUint32();
    final arguments = <ExpressionIR>[];
    for (int i = 0; i < argCount; i++) {
      arguments.add(_readExpression());
    }

    final namedArgCount = _readUint32();
    final namedArguments = <String, ExpressionIR>{};
    for (int i = 0; i < namedArgCount; i++) {
      final key = _readStringRef();
      final value = _readExpression();
      namedArguments[key] = value;
    }

    final typeArgCount = _readUint32();
    final typeArguments = <TypeIR>[];
    for (int i = 0; i < typeArgCount; i++) {
      typeArguments.add(_readType());
    }

    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return FunctionCallExpr(
      id: 'expr_func_call',
      functionName: functionName,
      arguments: arguments,
      namedArguments: namedArguments,
      typeArguments: typeArguments,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  InstanceCreationExpressionIR _readInstanceCreationExpression() {
    final type = _readType();
    final hasConstructorName = _readByte() != 0;
    final constructorName = hasConstructorName ? _readStringRef() : null;
    final isConst = _readByte() != 0;

    final argCount = _readUint32();
    final arguments = <ExpressionIR>[];
    for (int i = 0; i < argCount; i++) {
      arguments.add(_readExpression());
    }

    final namedArgCount = _readUint32();
    final namedArguments = <String, ExpressionIR>{};
    for (int i = 0; i < namedArgCount; i++) {
      final key = _readStringRef();
      final value = _readExpression();
      namedArguments[key] = value;
    }

    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return InstanceCreationExpressionIR(
      id: 'expr_instance_create',
      type: type,
      constructorName: constructorName,
      isConst: isConst,
      arguments: arguments,
      namedArguments: namedArguments,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  LambdaExpr _readLambdaExpression() {
    final paramCount = _readUint32();
    final parameters = <ParameterIR>[];
    for (int i = 0; i < paramCount; i++) {
      final paramDecl = _readParameterDecl();
      // Convert ParameterDecl to ParameterIR
      parameters.add(
        ParameterIR(
          id: paramDecl.id,
          name: paramDecl.name,
          type: paramDecl.type,
          isRequired: paramDecl.isRequired,
          isNamed: paramDecl.isNamed,
          isOptional: !paramDecl.isRequired,
          defaultValue: paramDecl.defaultValue,
          sourceLocation: paramDecl.sourceLocation,
        ),
      );
    }

    final hasBody = _readByte() != 0;
    ExpressionIR? body;
    if (hasBody) {
      body = _readExpression();
    }

    final returnType = _readType();
    final sourceLocation = _readSourceLocation();

    return LambdaExpr(
      id: 'expr_lambda',
      parameters: parameters,
      body: body,
      resultType: returnType,
      sourceLocation: sourceLocation,
    );
  }

  // --- String Interpolation ---

  StringInterpolationExpressionIR _readStringInterpolationExpression() {
    final partCount = _readUint32();
    final parts = <StringInterpolationPart>[];
    for (int i = 0; i < partCount; i++) {
      final isExpression = _readByte() != 0;
      if (isExpression) {
        parts.add(StringInterpolationPart.expression(_readExpression()));
      } else {
        parts.add(StringInterpolationPart.text(_readStringRef()));
      }
    }
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return StringInterpolationExpressionIR(
      id: 'expr_string_interp',
      parts: parts,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Identifiers & Access ---

  IdentifierExpressionIR _readIdentifierExpression() {
    final name = _readStringRef();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return IdentifierExpressionIR(
      id: 'expr_id_$name',
      name: name,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Collections ---

  ListExpressionIR _readListLiteralExpression() {
    final elementCount = _readUint32();
    final elements = <ExpressionIR>[];
    for (int i = 0; i < elementCount; i++) {
      elements.add(_readExpression());
    }

    final isConst = _readByte() != 0;
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return ListExpressionIR(
      id: 'expr_list',
      elements: elements,

      isConst: isConst,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  MapExpressionIR _readMapLiteralExpression() {
    final entryCount = _readUint32();
    final entries = <MapEntryIR>[];

    for (int i = 0; i < entryCount; i++) {
      final entryId = 'map_entry_${_entryIdCounter++}';
      final entrySourceLocation = _readSourceLocation();

      final key = _readExpression();
      final value = _readExpression();

      entries.add(
        MapEntryIR(
          id: entryId,
          sourceLocation: entrySourceLocation,
          key: key,
          value: value,
        ),
      );
    }

    final isConst = _readByte() != 0;
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();
    final exprId = 'expr_map_${_exprIdCounter++}';

    return MapExpressionIR(
      id: exprId,
      entries: entries,
      isConst: isConst,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Special ---

  ThisExpressionIR _readThisExpression() {
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    return ThisExpressionIR(
      id: 'expr_this',
      sourceLocation: sourceLocation,
      resultType: resultType,
    );
  }

  SuperExpressionIR _readSuperExpression() {
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    return SuperExpressionIR(
      id: 'expr_super',
      sourceLocation: sourceLocation,
      resultType: resultType,
    );
  }

  ParenthesizedExpressionIR _readParenthesizedExpression() {
    final innerExpression = _readExpression();
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    return ParenthesizedExpressionIR(
      id: 'expr_paren',
      innerExpression: innerExpression,
      sourceLocation: sourceLocation,
      resultType: resultType,
    );
  }

  // ============================================================================
  // STATEMENT SERIALIZATION - READER METHODS
  // ============================================================================
  // Add these methods to BinaryIRReader class

  // --- Simple Statements ---

  ExpressionStmt _readExpressionStatement() {
    final expression = _readExpression();
    final sourceLocation = _readSourceLocation();
    return ExpressionStmt(
      id: 'stmt_expr',
      expression: expression,
      sourceLocation: sourceLocation,
    );
  }

  VariableDeclarationStmt _readVariableDeclarationStatement() {
    final varCount = _readUint32();
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    // If multiple variables, just use the first one
    // (or you could return a BlockStmt with multiple VariableDeclarationStmt)
    if (varCount == 0) {
      return VariableDeclarationStmt(
        id: 'stmt_var_decl',
        name: '<empty>',
        resultType: resultType,
        sourceLocation: sourceLocation,
      );
    }

    final firstVar = _readVariableDecl();

    // Read remaining variables (if any)
    for (int i = 1; i < varCount; i++) {
      _readVariableDecl(); // Skip or handle separately
    }

    return VariableDeclarationStmt(
      id: 'stmt_var_decl',
      name: firstVar.name,
      type: firstVar.type,
      resultType: resultType,
      initializer: firstVar.initializer,
      isFinal: firstVar.isFinal,
      isConst: firstVar.isConst,
      isLate: firstVar.isLate,
      sourceLocation: sourceLocation,
    );
  }

  ReturnStmt _readReturnStatement() {
    final hasValue = _readByte() != 0;
    ExpressionIR? value;
    if (hasValue) {
      value = _readExpression();
    }
    final sourceLocation = _readSourceLocation();
    return ReturnStmt(
      id: 'stmt_return',
      expression: value,
      sourceLocation: sourceLocation,
    );
  }

  BreakStmt _readBreakStatement() {
    final hasLabel = _readByte() != 0;
    final label = hasLabel ? _readStringRef() : null;
    final sourceLocation = _readSourceLocation();
    return BreakStmt(
      id: 'stmt_break',
      label: label,
      sourceLocation: sourceLocation,
    );
  }

  ContinueStmt _readContinueStatement() {
    final hasLabel = _readByte() != 0;
    final label = hasLabel ? _readStringRef() : null;
    final sourceLocation = _readSourceLocation();
    return ContinueStmt(
      id: 'stmt_continue',
      label: label,
      sourceLocation: sourceLocation,
    );
  }

  ThrowStmt _readThrowStatement() {
    final exception = _readExpression();
    final sourceLocation = _readSourceLocation();
    return ThrowStmt(
      id: 'stmt_throw',
      // exception: exception,
      exceptionExpression: exception,

      sourceLocation: sourceLocation,
    );
  }

  AssertStatementIR _readAssertStatement() {
    final condition = _readExpression();
    final hasMessage = _readByte() != 0;
    ExpressionIR? message;
    if (hasMessage) {
      message = _readExpression();
    }
    final sourceLocation = _readSourceLocation();
    return AssertStatementIR(
      id: 'stmt_assert',
      condition: condition,
      message: message,
      sourceLocation: sourceLocation,
    );
  }

  EmptyStatementIR _readEmptyStatement() {
    final sourceLocation = _readSourceLocation();
    return EmptyStatementIR(id: 'stmt_empty', sourceLocation: sourceLocation);
  }

  // --- Compound Statements ---

  BlockStmt _readBlockStatement() {
    final stmtCount = _readUint32();
    final statements = <StatementIR>[];
    for (int i = 0; i < stmtCount; i++) {
      statements.add(_readStatement());
    }
    final sourceLocation = _readSourceLocation();
    return BlockStmt(
      id: 'stmt_block',
      statements: statements,
      sourceLocation: sourceLocation,
    );
  }

  IfStmt _readIfStatement() {
    final condition = _readExpression();
    final thenBranch = _readStatement();
    final hasElse = _readByte() != 0;
    StatementIR? elseBranch;
    if (hasElse) {
      elseBranch = _readStatement();
    }
    final sourceLocation = _readSourceLocation();
    return IfStmt(
      id: 'stmt_if',
      condition: condition,
      thenBranch: thenBranch,
      elseBranch: elseBranch,
      sourceLocation: sourceLocation,
    );
  }

  ForStmt _readForStatement() {
    dynamic init;
    final hasInit = _readByte() != 0;
    if (hasInit) {
      final initType = _readByte();
      if (initType == 0) {
        init = _readVariableDeclarationStatement();
      } else {
        init = _readExpression();
      }
    }

    final hasCondition = _readByte() != 0;
    ExpressionIR? condition;
    if (hasCondition) {
      condition = _readExpression();
    }

    final updateCount = _readUint32();
    final updates = <ExpressionIR>[];
    for (int i = 0; i < updateCount; i++) {
      updates.add(_readExpression());
    }

    final body = _readStatement();
    final sourceLocation = _readSourceLocation();

    return ForStmt(
      id: 'stmt_for',

      initialization: init,
      condition: condition,

      updaters: updates,
      body: body,
      sourceLocation: sourceLocation,
    );
  }

  ForEachStmt _readForEachStatement() {
    final variable = _readStringRef();

    final hasLoopVariableType = _readByte() != 0;
    TypeIR? loopVariableType;
    if (hasLoopVariableType) {
      loopVariableType = _readType();
    }

    final iterable = _readExpression();
    final body = _readStatement();
    final isAsync = _readByte() != 0;
    final sourceLocation = _readSourceLocation();

    return ForEachStmt(
      id: 'stmt_for_each',
      loopVariable: variable,
      loopVariableType: loopVariableType,
      iterable: iterable,
      body: body,
      isAsync: isAsync,
      sourceLocation: sourceLocation,
    );
  }

  WhileStmt _readWhileStatement() {
    final condition = _readExpression();
    final body = _readStatement();
    final sourceLocation = _readSourceLocation();

    return WhileStmt(
      id: 'stmt_while',
      condition: condition,
      body: body,
      sourceLocation: sourceLocation,
    );
  }

  DoWhileStmt _readDoWhileStatement() {
    final body = _readStatement();
    final condition = _readExpression();
    final sourceLocation = _readSourceLocation();

    return DoWhileStmt(
      id: 'stmt_do_while',
      body: body,
      condition: condition,
      sourceLocation: sourceLocation,
    );
  }

  SwitchStmt _readSwitchStatement() {
    final expression = _readExpression();
    final caseCount = _readUint32();
    final cases = <SwitchCaseStmt>[];
    for (int i = 0; i < caseCount; i++) {
      cases.add(_readSwitchCase());
    }

    final hasDefault = _readByte() != 0;
    SwitchCaseStmt? defaultCase;
    if (hasDefault) {
      final stmtCount = _readUint32();
      final statements = <StatementIR>[];
      for (int i = 0; i < stmtCount; i++) {
        statements.add(_readStatement());
      }
      defaultCase = SwitchCaseStmt(
        id: 'stmt_switch_default',
        sourceLocation: _readSourceLocation(),
        patterns: null,
        statements: statements,
        isDefault: true,
      );
    }

    final sourceLocation = _readSourceLocation();

    return SwitchStmt(
      id: 'stmt_switch',
      expression: expression,
      cases: cases,
      defaultCase: defaultCase,
      sourceLocation: sourceLocation,
    );
  }

  SwitchCaseStmt _readSwitchCase() {
    final labelCount = _readUint32();
    final sourceLocation = _readSourceLocation();
    final labels = <ExpressionIR>[];
    for (int i = 0; i < labelCount; i++) {
      labels.add(_readExpression());
    }

    final stmtCount = _readUint32();
    final statements = <StatementIR>[];
    for (int i = 0; i < stmtCount; i++) {
      statements.add(_readStatement());
    }

    return SwitchCaseStmt(
      id: 'stmt_switch_case',
      sourceLocation: sourceLocation,
      patterns: labels,
      statements: statements,
    );
  }

  TryStmt _readTryStatement() {
    final tryBlock = _readStatement();

    final catchCount = _readUint32();
    final catchClauses = <CatchClauseStmt>[];
    for (int i = 0; i < catchCount; i++) {
      catchClauses.add(_readCatchClause());
    }

    final hasFinally = _readByte() != 0;
    StatementIR? finallyBlock;
    if (hasFinally) {
      finallyBlock = _readStatement();
    }

    final sourceLocation = _readSourceLocation();

    return TryStmt(
      id: 'stmt_try',
      tryBlock: tryBlock,
      catchClauses: catchClauses,
      finallyBlock: finallyBlock,
      sourceLocation: sourceLocation,
    );
  }

  CatchClauseStmt _readCatchClause() {
    final exceptionType = _readType();

    final hasExceptionVar = _readByte() != 0;
    final exceptionVariable = hasExceptionVar ? _readStringRef() : null;

    final hasStackTraceVar = _readByte() != 0;
    final stackTraceVariable = hasStackTraceVar ? _readStringRef() : null;
    final sourceLocation = _readSourceLocation();
    final body = _readStatement();

    return CatchClauseStmt(
      id: "stmt_catch_clause",
      exceptionType: exceptionType,

      sourceLocation: sourceLocation,
      exceptionParameter: exceptionVariable,
      stackTraceParameter: stackTraceVariable,
      body: body,
    );
  }

  LabeledStatementIR _readLabeledStatement() {
    final label = _readStringRef();
    final statement = _readStatement();
    final sourceLocation = _readSourceLocation();

    return LabeledStatementIR(
      id: 'stmt_labeled',
      label: label,
      statement: statement,
      sourceLocation: sourceLocation,
    );
  }

  YieldStatementIR _readYieldStatement() {
    final value = _readExpression();
    final isYieldEach = _readByte() != 0;
    final sourceLocation = _readSourceLocation();

    return YieldStatementIR(
      id: 'stmt_yield',
      value: value,
      isYieldEach: isYieldEach,
      sourceLocation: sourceLocation,
    );
  }

  FunctionDeclarationStatementIR _readFunctionDeclarationStatement() {
    final function = _readFunctionDecl();
    final sourceLocation = _readSourceLocation();

    return FunctionDeclarationStatementIR(
      id: 'stmt_func_decl',
      function: function,
      sourceLocation: sourceLocation,
    );
  }

  StatementIR _readStatement() {
    final stmtType = _readByte();

    switch (stmtType) {
      case BinaryConstants.STMT_EXPRESSION:
        return _readExpressionStatement();
      case BinaryConstants.STMT_VAR_DECL:
        return _readVariableDeclarationStatement();
      case BinaryConstants.STMT_RETURN:
        return _readReturnStatement();
      case BinaryConstants.STMT_BREAK:
        return _readBreakStatement();
      case BinaryConstants.STMT_CONTINUE:
        return _readContinueStatement();
      case BinaryConstants.STMT_THROW:
        return _readThrowStatement();
      case BinaryConstants.STMT_ASSERT:
        return _readAssertStatement();
      case BinaryConstants.STMT_EMPTY:
        return _readEmptyStatement();
      case BinaryConstants.STMT_BLOCK:
        return _readBlockStatement();
      case BinaryConstants.STMT_IF:
        return _readIfStatement();
      case BinaryConstants.STMT_FOR:
        return _readForStatement();
      case BinaryConstants.STMT_FOR_EACH:
        return _readForEachStatement();
      case BinaryConstants.STMT_WHILE:
        return _readWhileStatement();
      case BinaryConstants.STMT_DO_WHILE:
        return _readDoWhileStatement();
      case BinaryConstants.STMT_SWITCH:
        return _readSwitchStatement();
      case BinaryConstants.STMT_TRY:
        return _readTryStatement();
      case BinaryConstants.STMT_LABELED:
        return _readLabeledStatement();
      case BinaryConstants.STMT_YIELD:
        return _readYieldStatement();
      case BinaryConstants.STMT_FUNCTION_DECL:
        return _readFunctionDeclarationStatement();
      default:
        throw SerializationException(
          'Unknown statement type: 0x${stmtType.toRadixString(16)}',
          offset: _offset - 1,
        );
    }
  }

  /// Add this method to BinaryIRReader to get detailed error info
  void debugDeserialize(Uint8List bytes) {
    printlog('\n=== DEBUG DESERIALIZATION ===');
    printlog('File size: ${bytes.length} bytes');

    _data = ByteData.view(bytes.buffer);
    _offset = 0;
    _stringTable = [];

    try {
      // Read header
      printlog('\n1. Reading header...');
      _readHeader();
      printlog('   ✓ Header valid');

      // Read string table
      printlog('\n2. Reading string table...');
      final stringCountOffset = _offset;
      final stringCount = _readUint32();
      printlog('   String count: $stringCount');
      printlog('   Offset after count: $_offset');

      _stringTable = List<String>.filled(stringCount, '');
      for (int i = 0; i < stringCount; i++) {
        _stringTable[i] = _readString();
        if (i < 5 || i >= stringCount - 2) {
          printlog('   [$i] "${_stringTable[i]}" (offset: $_offset)');
        } else if (i == 5) {
          printlog('   ...');
        }
      }
      printlog('   ✓ String table loaded');
      printlog('   IR data starts at offset: $_offset');

      // Read IR data with detailed tracking
      printlog('\n3. Reading IR data...');
      final filePathRef = _readUint32();
      printlog(
        '   File path ref: $filePathRef (max valid: ${stringCount - 1})',
      );
      if (filePathRef >= stringCount) {
        printlog('   ✗ ERROR: File path reference out of bounds!');
        return;
      }

      final contentHashRef = _readUint32();
      printlog(
        '   Content hash ref: $contentHashRef (max valid: ${stringCount - 1})',
      );
      if (contentHashRef >= stringCount) {
        printlog('   ✗ ERROR: Content hash reference out of bounds!');
        return;
      }

      final libraryRef = _readUint32();
      printlog('   Library ref: $libraryRef (max valid: ${stringCount - 1})');
      if (libraryRef >= stringCount) {
        printlog('   ✗ ERROR: Library reference out of bounds!');
        return;
      }

      printlog('   ✓ File metadata read successfully');

      printlog(
        '\n4. Reading imports, exports, variables, functions, classes...',
      );
      final analyzedAt = _readUint64();

      // Imports
      final importCount = _readUint32();
      printlog('   Imports: $importCount');

      // Exports
      final exportCount = _readUint32();
      printlog('   Exports: $exportCount');

      // Variables
      final varCount = _readUint32();
      printlog('   Variables: $varCount');

      // Functions
      final funcCount = _readUint32();
      printlog('   Functions: $funcCount');

      // Classes
      final classCount = _readUint32();
      printlog('   Classes: $classCount');

      // Issues
      final issueCount = _readUint32();
      printlog('   Issues: $issueCount');

      printlog('   Current offset: $_offset / ${_data.lengthInBytes}');
      printlog('   Remaining bytes: ${_data.lengthInBytes - _offset}');

      printlog('\n✓ Debug deserialization completed successfully!');
    } on SerializationException catch (e) {
      printlog('\n✗ Deserialization failed: $e');
      printlog('   Current offset: $_offset');
      printlog('   String table size: ${_stringTable.length}');
    } catch (e, stackTrace) {
      printlog('\n✗ Unexpected error: $e');
      printlog('   Stack: $stackTrace');
    }
  }

  void printlog(String message) {
    if (_verbose) {
      print(message);
    }
  }
}
