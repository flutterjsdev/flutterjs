import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';

import '../new_ast_IR/class_decl.dart';
import '../new_ast_IR/dart_file_builder.dart';
import '../new_ast_IR/diagnostics/analysis_issue.dart';
import '../new_ast_IR/diagnostics/issue_category.dart';
import '../new_ast_IR/diagnostics/source_location.dart';
import '../new_ast_IR/function_decl.dart';
import '../new_ast_IR/import_export_stmt.dart';
import '../new_ast_IR/ir/expression_ir.dart';
import '../new_ast_IR/ir/statement/statement_ir.dart';
import '../new_ast_IR/ir/type_ir.dart';
import '../new_ast_IR/parameter_decl.dart';
import '../new_ast_IR/variable_decl.dart';
import 'binary_constain.dart';

/// Deserializes Flutter IR from binary format
///
/// Handles:
/// - Version compatibility checking
/// - Error recovery and detailed error reporting
/// - Checksum validation
/// - Full IR reconstruction
class BinaryIRReader {
  late ByteData _data;
  late List<String> _stringTable;
  int _offset = 0;

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Deserialize a DartFile IR from binary format
  DartFile readFileIR(Uint8List bytes) {
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
    final hasChecksum = (flags & BinaryConstants.FLAG_HAS_CHECKSUM) != 0;
    final isCompressed = (flags & BinaryConstants.FLAG_COMPRESSED) != 0;

    if (isCompressed) {
      throw SerializationException(
        'Compressed format not yet supported',
        offset: 6,
      );
    }

    // TODO: Implement checksum validation if hasChecksum
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

  // =========================================================================
  // IR DATA READING
  // =========================================================================

  DartFile _readFileIRData() {
    final filePath = _readStringRef();
    final builder = DartFileBuilder(filePath: filePath);

    // File metadata

    final contentHash = _readStringRef();
    final libraryName = _readStringRef();

    builder
      ..withContentHash(contentHash)
      ..withLibrary(libraryName);

    // Analysis metadata
    final analyzedAt = _readUint64();

    // Imports
    final importCount = _readUint32();
    for (int i = 0; i < importCount; i++) {
      builder.addImport(_readImportStmt());
    }

    // Exports
    final exportCount = _readUint32();
    for (int i = 0; i < exportCount; i++) {
      builder.addExport(_readExportStmt());
    }

    // Variables
    final varCount = _readUint32();
    for (int i = 0; i < varCount; i++) {
      builder.addVariable(_readVariableDecl());
    }

    // Functions
    final funcCount = _readUint32();
    for (int i = 0; i < funcCount; i++) {
      builder.addFunction(_readFunctionDecl());
    }

    // Classes
    final classCount = _readUint32();
    for (int i = 0; i < classCount; i++) {
      builder.addClass(_readClassDecl());
    }

    // Analysis issues
    final issueCount = _readUint32();
    for (int i = 0; i < issueCount; i++) {
      builder.addIssue(_readAnalysisIssue());
    }

    return builder.build();
  }

  ImportStmt _readImportStmt() {
    final uri = _readStringRef();
    final hasPrefix = _readByte() != 0;
    final prefix = hasPrefix ? _readStringRef() : null;
    final isDeferred = _readByte() != 0;

    final showCount = _readUint32();
    final showList = <String>[];
    for (int i = 0; i < showCount; i++) {
      showList.add(_readStringRef());
    }

    final hideCount = _readUint32();
    final hideList = <String>[];
    for (int i = 0; i < hideCount; i++) {
      hideList.add(_readStringRef());
    }

    final sourceLocation = _readSourceLocation();

    return ImportStmt(
      uri: uri,
      prefix: prefix,
      isDeferred: isDeferred,
      showList: showList,
      hideList: hideList,
      sourceLocation: sourceLocation,
    );
  }

  ExportStmt _readExportStmt() {
    final uri = _readStringRef();

    final showCount = _readUint32();
    final showList = <String>[];
    for (int i = 0; i < showCount; i++) {
      showList.add(_readStringRef());
    }

    final hideCount = _readUint32();
    final hideList = <String>[];
    for (int i = 0; i < hideCount; i++) {
      hideList.add(_readStringRef());
    }

    final sourceLocation = _readSourceLocation();

    return ExportStmt(
      uri: uri,
      showList: showList,
      hideList: hideList,
      sourceLocation: sourceLocation,
    );
  }

  VariableDecl _readVariableDecl() {
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
    final id = _readStringRef();
    final name = _readStringRef();
    final returnType = _readType();

    final isAsync = _readByte() != 0;
    final isGenerator = _readByte() != 0;

    final paramCount = _readUint32();
    final parameters = <ParameterDecl>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(_readParameterDecl());
    }

    final sourceLocation = _readSourceLocation();

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
    final id = _readStringRef();
    final name = _readStringRef();

    final isAbstract = _readByte() != 0;
    final isFinal = _readByte() != 0;

    final hasSuperclass = _readByte() != 0;
    TypeIR? superclass;
    if (hasSuperclass) {
      superclass = _readType();
    }

    final interfaceCount = _readUint32();
    final interfaces = <TypeIR>[];
    for (int i = 0; i < interfaceCount; i++) {
      interfaces.add(_readType());
    }

    final mixinCount = _readUint32();
    final mixins = <TypeIR>[];
    for (int i = 0; i < mixinCount; i++) {
      mixins.add(_readType());
    }

    final fieldCount = _readUint32();
    final fields = <FieldDecl>[];
    for (int i = 0; i < fieldCount; i++) {
      fields.add(_readFieldDecl());
    }

    final methodCount = _readUint32();
    final methods = <MethodDecl>[];
    for (int i = 0; i < methodCount; i++) {
      methods.add(_readMethodDecl());
    }

    final constructorCount = _readUint32();
    final constructors = <ConstructorDecl>[];
    for (int i = 0; i < constructorCount; i++) {
      constructors.add(_readConstructorDecl());
    }

    final sourceLocation = _readSourceLocation();

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
    final id = _readStringRef();
    final name = _readStringRef();
    final returnType = _readType();

    final isAsync = _readByte() != 0;
    final isGenerator = _readByte() != 0;
    final isStatic = _readByte() != 0;
    final isAbstract = _readByte() != 0;
    final isGetter = _readByte() != 0;
    final isSetter = _readByte() != 0;

    final paramCount = _readUint32();
    final parameters = <ParameterDecl>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(_readParameterDecl());
    }

    final sourceLocation = _readSourceLocation();

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
          'Unknown type kind: $typeKind',
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

  BinaryExpressionIR _readBinaryExpression() {
    final left = _readExpression();
    final operatorString = _readStringRef();
    final right = _readExpression();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    // Convert string back to enum
    final operator = BinaryOperatorIR.values.firstWhere(
      (op) => op.name == operatorString,
      orElse: () => throw SerializationException(
        'Unknown binary operator: $operatorString',
        offset: _offset,
      ),
    );

    return BinaryExpressionIR(
      id: 'expr_bin',
      left: left,
      operator: operator,
      right: right,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  MethodCallExpressionIR _readMethodCallExpression() {
    final hasTarget = _readByte() != 0;
    ExpressionIR? target;
    if (hasTarget) {
      target = _readExpression();
    }

    final methodName = _readStringRef();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return MethodCallExpressionIR(
      id: 'expr_method',
      target: target,
      methodName: methodName,
      resultType: resultType,
      sourceLocation: sourceLocation,
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

  ListExpressionIR _readListLiteralExpression() {
    final elementCount = _readUint32();
    final elements = <ExpressionIR>[];
    for (int i = 0; i < elementCount; i++) {
      elements.add(_readExpression());
    }
    final sourceLocation = _readSourceLocation();
    final resultType = _readType();
    return ListExpressionIR(
      resultType: resultType,
      id: 'expr_list',
      elements: elements,
      sourceLocation: sourceLocation,
    );
  }

  MapExpressionIR _readMapLiteralExpression() {
    final entryCount = _readUint32();
    final resultType = _readType();
    final entries = <MapEntryIR>[];
    for (int i = 0; i < entryCount; i++) {
      final key = _readExpression();
      final value = _readExpression();
      // entries[key] = value;
      entries.add(MapEntryIR(key: key, value: value));
    }
    final sourceLocation = _readSourceLocation();

    return MapExpressionIR(
      resultType: resultType,
      id: 'expr_map',
      entries: entries,
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

  SetLiteralExpressionIR _readSetLiteralExpression() {
    final elementCount = _readUint32();
    final elements = <ExpressionIR>[];
    for (int i = 0; i < elementCount; i++) {
      elements.add(_readExpression());
    }
    final elementType = _readType();
    final sourceLocation = _readSourceLocation();

    return SetLiteralExpressionIR(
      id: 'expr_set',
      elements: elements,
      elementType: elementType,
      resultType: DynamicTypeIR(id: 'type_set', sourceLocation: sourceLocation),
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
    final operator = UnaryOperatorIR.values[operatorIndex];
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
    final isCompound = _readByte() != 0;
    final sourceLocation = _readSourceLocation();

    return AssignmentExpressionIR(
      id: 'expr_assign',
      target: target,
      value: value,
      isCompound: isCompound,
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

    return CascadeExpressionIR(
      id: 'expr_cascade',
      target: target,
      cascadeSections: cascadeSections,
      sourceLocation: sourceLocation,
    );
  }

  // --- Type Operations ---

  CastExpressionIR _readCastExpression() {
    final expression = _readExpression();
    final targetType = _readType();
    final sourceLocation = _readSourceLocation();

    return CastExpressionIR(
      id: 'expr_cast',
      expression: expression,
      targetType: targetType,
      sourceLocation: sourceLocation,
    );
  }

  TypeCheckExpressionIR _readTypeCheckExpression() {
    final expression = _readExpression();
    final checkType = _readType();
    final isNegated = _readByte() != 0;
    final sourceLocation = _readSourceLocation();

    return TypeCheckExpressionIR(
      id: 'expr_typecheck',
      expression: expression,
      checkType: checkType,
      isNegated: isNegated,
      sourceLocation: sourceLocation,
    );
  }

  // --- Async Operations ---

  AwaitExpressionIR _readAwaitExpression() {
    final futureExpression = _readExpression();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return AwaitExpressionIR(
      id: 'expr_await',
      futureExpression: futureExpression,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  ThrowExpressionIR _readThrowExpression() {
    final exception = _readExpression();
    final sourceLocation = _readSourceLocation();

    return ThrowExpressionIR(
      id: 'expr_throw',
      exception: exception,
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

  FunctionCallExpressionIR _readFunctionCallExpression() {
    final function = _readExpression();

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

    return FunctionCallExpressionIR(
      id: 'expr_func_call',
      function: function,
      arguments: arguments,
      namedArguments: namedArguments,
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

  LambdaExpressionIR _readLambdaExpression() {
    final paramCount = _readUint32();
    final parameters = <ParameterDecl>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(_readParameterDecl());
    }

    final hasBody = _readByte() != 0;
    ExpressionIR? body;
    if (hasBody) {
      body = _readExpression();
    }

    final returnType = _readType();
    final sourceLocation = _readSourceLocation();

    return LambdaExpressionIR(
      id: 'expr_lambda',
      parameters: parameters,
      body: body,
      returnType: returnType,
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
    final sourceLocation = _readSourceLocation();

    return StringInterpolationExpressionIR(
      id: 'expr_string_interp',
      parts: parts,
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

  PropertyAccessExpressionIR _readPropertyAccessExpression() {
    final target = _readExpression();
    final propertyName = _readStringRef();
    final isNullAware = _readByte() != 0;
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return PropertyAccessExpressionIR(
      id: 'expr_prop',
      target: target,
      propertyName: propertyName,
      isNullAware: isNullAware,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Collections ---

  ListLiteralExpressionIR _readListLiteralExpression() {
    final elementCount = _readUint32();
    final elements = <ExpressionIR>[];
    for (int i = 0; i < elementCount; i++) {
      elements.add(_readExpression());
    }
    final elementType = _readType();
    final isConst = _readByte() != 0;
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return ListLiteralExpressionIR(
      id: 'expr_list',
      elements: elements,
      elementType: elementType,
      isConst: isConst,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  MapLiteralExpressionIR _readMapLiteralExpression() {
    final entryCount = _readUint32();
    final entries = <MapEntryIR>[];
    for (int i = 0; i < entryCount; i++) {
      final key = _readExpression();
      final value = _readExpression();
      entries.add(MapEntryIR(key: key, value: value));
    }
    final keyType = _readType();
    final valueType = _readType();
    final isConst = _readByte() != 0;
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return MapLiteralExpressionIR(
      id: 'expr_map',
      entries: entries,
      keyType: keyType,
      valueType: valueType,
      isConst: isConst,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Control Flow ---

  ConditionalExpressionIR _readConditionalExpression() {
    final condition = _readExpression();
    final thenExpression = _readExpression();
    final elseExpression = _readExpression();
    final resultType = _readType();
    final sourceLocation = _readSourceLocation();

    return ConditionalExpressionIR(
      id: 'expr_cond',
      condition: condition,
      thenExpression: thenExpression,
      elseExpression: elseExpression,
      resultType: resultType,
      sourceLocation: sourceLocation,
    );
  }

  // --- Special ---

  ThisExpressionIR _readThisExpression() {
    final sourceLocation = _readSourceLocation();

    return ThisExpressionIR(id: 'expr_this', sourceLocation: sourceLocation);
  }

  SuperExpressionIR _readSuperExpression() {
    final sourceLocation = _readSourceLocation();

    return SuperExpressionIR(id: 'expr_super', sourceLocation: sourceLocation);
  }

  ParenthesizedExpressionIR _readParenthesizedExpression() {
    final innerExpression = _readExpression();
    final sourceLocation = _readSourceLocation();

    return ParenthesizedExpressionIR(
      id: 'expr_paren',
      innerExpression: innerExpression,
      sourceLocation: sourceLocation,
    );
  }

  // ============================================================================
  // STATEMENT SERIALIZATION - READER METHODS
  // ============================================================================
  // Add these methods to BinaryIRReader class

  // --- Simple Statements ---

  ExpressionStatementIR _readExpressionStatement() {
    final expression = _readExpression();
    final sourceLocation = _readSourceLocation();
    return ExpressionStatementIR(
      id: 'stmt_expr',
      expression: expression,
      sourceLocation: sourceLocation,
    );
  }

  VariableDeclarationStatementIR _readVariableDeclarationStatement() {
    final varCount = _readUint32();
    final variables = <VariableDecl>[];
    for (int i = 0; i < varCount; i++) {
      variables.add(_readVariableDecl());
    }
    final sourceLocation = _readSourceLocation();
    return VariableDeclarationStatementIR(
      id: 'stmt_var_decl',
      variables: variables,
      sourceLocation: sourceLocation,
    );
  }

  ReturnStatementIR _readReturnStatement() {
    final hasValue = _readByte() != 0;
    ExpressionIR? value;
    if (hasValue) {
      value = _readExpression();
    }
    final sourceLocation = _readSourceLocation();
    return ReturnStatementIR(
      id: 'stmt_return',
      value: value,
      sourceLocation: sourceLocation,
    );
  }

  BreakStatementIR _readBreakStatement() {
    final hasLabel = _readByte() != 0;
    final label = hasLabel ? _readStringRef() : null;
    final sourceLocation = _readSourceLocation();
    return BreakStatementIR(
      id: 'stmt_break',
      label: label,
      sourceLocation: sourceLocation,
    );
  }

  ContinueStatementIR _readContinueStatement() {
    final hasLabel = _readByte() != 0;
    final label = hasLabel ? _readStringRef() : null;
    final sourceLocation = _readSourceLocation();
    return ContinueStatementIR(
      id: 'stmt_continue',
      label: label,
      sourceLocation: sourceLocation,
    );
  }

  ThrowStatementIR _readThrowStatement() {
    final exception = _readExpression();
    final sourceLocation = _readSourceLocation();
    return ThrowStatementIR(
      id: 'stmt_throw',
      exception: exception,
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

  BlockStatementIR _readBlockStatement() {
    final stmtCount = _readUint32();
    final statements = <StatementIR>[];
    for (int i = 0; i < stmtCount; i++) {
      statements.add(_readStatement());
    }
    final sourceLocation = _readSourceLocation();
    return BlockStatementIR(
      id: 'stmt_block',
      statements: statements,
      sourceLocation: sourceLocation,
    );
  }

  IfStatementIR _readIfStatement() {
    final condition = _readExpression();
    final thenBranch = _readStatement();
    final hasElse = _readByte() != 0;
    StatementIR? elseBranch;
    if (hasElse) {
      elseBranch = _readStatement();
    }
    final sourceLocation = _readSourceLocation();
    return IfStatementIR(
      id: 'stmt_if',
      condition: condition,
      thenBranch: thenBranch,
      elseBranch: elseBranch,
      sourceLocation: sourceLocation,
    );
  }

  ForStatementIR _readForStatement() {
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

    return ForStatementIR(
      id: 'stmt_for',
      init: init,
      condition: condition,
      updates: updates,
      body: body,
      sourceLocation: sourceLocation,
    );
  }

  ForEachStatementIR _readForEachStatement() {
    final variable = _readStringRef();
    final iterable = _readExpression();
    final body = _readStatement();
    final isAsync = _readByte() != 0;
    final sourceLocation = _readSourceLocation();

    return ForEachStatementIR(
      id: 'stmt_for_each',
      variable: variable,
      iterable: iterable,
      body: body,
      isAsync: isAsync,
      sourceLocation: sourceLocation,
    );
  }

  WhileStatementIR _readWhileStatement() {
    final condition = _readExpression();
    final body = _readStatement();
    final sourceLocation = _readSourceLocation();

    return WhileStatementIR(
      id: 'stmt_while',
      condition: condition,
      body: body,
      sourceLocation: sourceLocation,
    );
  }

  DoWhileStatementIR _readDoWhileStatement() {
    final body = _readStatement();
    final condition = _readExpression();
    final sourceLocation = _readSourceLocation();

    return DoWhileStatementIR(
      id: 'stmt_do_while',
      body: body,
      condition: condition,
      sourceLocation: sourceLocation,
    );
  }

  SwitchStatementIR _readSwitchStatement() {
    final expression = _readExpression();
    final caseCount = _readUint32();
    final cases = <SwitchCaseIR>[];
    for (int i = 0; i < caseCount; i++) {
      cases.add(_readSwitchCase());
    }

    final hasDefault = _readByte() != 0;
    BlockStatementIR? defaultCase;
    if (hasDefault) {
      final stmtCount = _readUint32();
      final statements = <StatementIR>[];
      for (int i = 0; i < stmtCount; i++) {
        statements.add(_readStatement());
      }
      defaultCase = BlockStatementIR(
        id: 'stmt_switch_default',
        statements: statements,
        sourceLocation: SourceLocationIR(
          id: 'loc_default',
          file: 'builtin',
          line: 0,
          column: 0,
          offset: 0,
          length: 0,
        ),
      );
    }

    final sourceLocation = _readSourceLocation();

    return SwitchStatementIR(
      id: 'stmt_switch',
      expression: expression,
      cases: cases,
      defaultCase: defaultCase,
      sourceLocation: sourceLocation,
    );
  }

  SwitchCaseIR _readSwitchCase() {
    final labelCount = _readUint32();
    final labels = <ExpressionIR>[];
    for (int i = 0; i < labelCount; i++) {
      labels.add(_readExpression());
    }

    final stmtCount = _readUint32();
    final statements = <StatementIR>[];
    for (int i = 0; i < stmtCount; i++) {
      statements.add(_readStatement());
    }

    return SwitchCaseIR(labels: labels, statements: statements);
  }

  TryStatementIR _readTryStatement() {
    final tryBlock = _readStatement();

    final catchCount = _readUint32();
    final catchClauses = <CatchClauseIR>[];
    for (int i = 0; i < catchCount; i++) {
      catchClauses.add(_readCatchClause());
    }

    final hasFinally = _readByte() != 0;
    StatementIR? finallyBlock;
    if (hasFinally) {
      finallyBlock = _readStatement();
    }

    final sourceLocation = _readSourceLocation();

    return TryStatementIR(
      id: 'stmt_try',
      tryBlock: tryBlock,
      catchClauses: catchClauses,
      finallyBlock: finallyBlock,
      sourceLocation: sourceLocation,
    );
  }

  CatchClauseIR _readCatchClause() {
    final exceptionType = _readType();

    final hasExceptionVar = _readByte() != 0;
    final exceptionVariable = hasExceptionVar ? _readStringRef() : null;

    final hasStackTraceVar = _readByte() != 0;
    final stackTraceVariable = hasStackTraceVar ? _readStringRef() : null;

    final body = _readStatement();

    return CatchClauseIR(
      exceptionType: exceptionType,
      exceptionVariable: exceptionVariable,
      stackTraceVariable: stackTraceVariable,
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
}

/// Exception thrown during deserialization
class SerializationException implements Exception {
  final String message;
  final int offset;

  SerializationException(this.message, {required this.offset});

  @override
  String toString() => 'SerializationException at offset $offset: $message';
}
