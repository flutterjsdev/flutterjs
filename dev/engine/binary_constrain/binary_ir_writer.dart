import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';

import '../new_ast_IR/class_decl.dart';
import '../new_ast_IR/dart_file_builder.dart';
import '../new_ast_IR/diagnostics/analysis_issue.dart';
import '../new_ast_IR/diagnostics/source_location.dart';
import '../new_ast_IR/function_decl.dart';
import '../new_ast_IR/import_export_stmt.dart';
import '../new_ast_IR/ir/expression_ir.dart';
import '../new_ast_IR/ir/statement/statement_ir.dart';
import '../new_ast_IR/ir/type_ir.dart';
import '../new_ast_IR/parameter_decl.dart';
import '../new_ast_IR/variable_decl.dart';
import 'binary_constain.dart';

/// Serializes Flutter IR to binary format
///
/// Binary Format:
/// [HEADER (8 bytes)]
/// [STRING_TABLE (variable)]
/// [IR_DATA (variable)]
/// [CHECKSUM (32 bytes, optional)]
class BinaryIRWriter {
  final BytesBuilder _buffer = BytesBuilder();
  final List<String> _stringTable = [];
  final Map<String, int> _stringIndices = {};
  int _stringTableStartOffset = 0;
  int _irDataStartOffset = 0;

  bool _headerWritten = false;
  bool _shouldWriteChecksum = true;

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Serialize a DartFile IR to binary format
  Uint8List writeFileIR(DartFile fileIR) {
    // Validate before writing
    final validationErrors = _validateFileIR(fileIR);
    if (validationErrors.isNotEmpty) {
      throw SerializationException(
        'Cannot serialize invalid FileIR:\n${validationErrors.join('\n')}',
        offset: 0,
      );
    }

    _buffer.clear();
    _stringTable.clear();
    _stringIndices.clear();

    // Step 1: Collect all strings for deduplication
    _collectStrings(fileIR);

    // Step 2: Write header
    _writeHeader();

    // Step 3: Write string table
    _writeStringTable();

    // Step 4: Write IR data
    _writeFileIRData(fileIR);

    // Step 5: Write checksum (optional)
    if (_shouldWriteChecksum) {
      final data = _buffer.toBytes();
      _writeChecksum(data);
    }

    return _buffer.toBytes();
  }

  // =========================================================================
  // HEADER WRITING
  // =========================================================================

  void _writeHeader() {
    // Magic number (4 bytes): "FLIR"
    _writeUint32(BinaryConstants.MAGIC_NUMBER);

    // Format version (2 bytes)
    _writeUint16(BinaryConstants.FORMAT_VERSION);

    // Flags (2 bytes)
    int flags = 0;
    if (_shouldWriteChecksum) {
      flags |= BinaryConstants.FLAG_HAS_CHECKSUM;
    }
    _writeUint16(flags);

    _headerWritten = true;
  }

  // =========================================================================
  // STRING TABLE WRITING
  // =========================================================================

  void _writeStringTable() {
    _stringTableStartOffset = _buffer.length;

    // String count
    _writeUint32(_stringTable.length);

    // Write each string
    for (final str in _stringTable) {
      _writeString(str);
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

    // Collect from imports
    for (final import in fileIR.imports) {
      _addString(import.uri);
      if (import.prefix != null) _addString(import.prefix!);
      for (final show in import.showList) _addString(show);
      for (final hide in import.hideList) _addString(hide);
    }

    // Collect from classes
    for (final classDecl in fileIR.classDeclarations) {
      _collectStringsFromClass(classDecl);
    }

    // Collect from functions
    for (final func in fileIR.functionDeclarations) {
      _collectStringsFromFunction(func);
    }

    // Collect from variables
    for (final variable in fileIR.variableDeclarations) {
      _collectStringsFromVariable(variable);
    }
  }

  void _collectStringsFromClass(ClassDecl classDecl) {
    _addString(classDecl.id);
    _addString(classDecl.name);
    if (classDecl.documentation != null) _addString(classDecl.documentation!);

    for (final field in classDecl.fields) {
      _addString(field.name);
      _addString(field.type.displayName());
    }

    for (final method in classDecl.methods) {
      _addString(method.name);
      _addString(method.returnType.displayName());
      for (final param in method.parameters) {
        _addString(param.name);
        _addString(param.type.displayName());
      }
    }
  }

  void _collectStringsFromFunction(FunctionDecl func) {
    _addString(func.id);
    _addString(func.name);
    _addString(func.returnType.displayName());

    for (final param in func.parameters) {
      _addString(param.name);
      _addString(param.type.displayName());
    }
  }

  void _collectStringsFromVariable(VariableDecl variable) {
    _addString(variable.id);
    _addString(variable.name);
    _addString(variable.type.displayName());
  }

  // =========================================================================
  // IR DATA WRITING
  // =========================================================================

  void _writeFileIRData(DartFile fileIR) {
    _irDataStartOffset = _buffer.length;

    // File metadata
    _writeUint32(_getStringRef(fileIR.filePath));
    _writeUint32(_getStringRef(fileIR.contentHash));
    _writeUint32(_getStringRef(fileIR.library ?? "<unknown>"));

    // Analysis metadata
    _writeUint64(DateTime.now().millisecondsSinceEpoch);

    // Imports
    _writeUint32(fileIR.imports.length);
    for (final import in fileIR.imports) {
      _writeImportStmt(import);
    }

    // Exports
    _writeUint32(fileIR.exports.length);
    for (final export in fileIR.exports) {
      _writeExportStmt(export);
    }

    // Top-level variables
    _writeUint32(fileIR.variableDeclarations.length);
    for (final variable in fileIR.variableDeclarations) {
      _writeVariableDecl(variable);
    }

    // Functions
    _writeUint32(fileIR.functionDeclarations.length);
    for (final func in fileIR.functionDeclarations) {
      _writeFunctionDecl(func);
    }

    // Classes
    _writeUint32(fileIR.classDeclarations.length);
    for (final classDecl in fileIR.classDeclarations) {
      _writeClassDecl(classDecl);
    }

    // Analysis issues
    _writeUint32(fileIR.analysisIssues.length);
    for (final issue in fileIR.analysisIssues) {
      _writeAnalysisIssue(issue);
    }
  }

  void _writeImportStmt(ImportStmt import) {
    _writeUint32(_getStringRef(import.uri));
    _writeByte(import.prefix != null ? 1 : 0);
    if (import.prefix != null) {
      _writeUint32(_getStringRef(import.prefix!));
    }

    _writeByte(import.isDeferred ? 1 : 0);

    _writeUint32(import.showList.length);
    for (final show in import.showList) {
      _writeUint32(_getStringRef(show));
    }

    _writeUint32(import.hideList.length);
    for (final hide in import.hideList) {
      _writeUint32(_getStringRef(hide));
    }

    _writeSourceLocation(import.sourceLocation);
  }

  void _writeExportStmt(ExportStmt export) {
    _writeUint32(_getStringRef(export.uri));

    _writeUint32(export.showList.length);
    for (final show in export.showList) {
      _writeUint32(_getStringRef(show));
    }

    _writeUint32(export.hideList.length);
    for (final hide in export.hideList) {
      _writeUint32(_getStringRef(hide));
    }

    _writeSourceLocation(export.sourceLocation);
  }

  void _writeVariableDecl(VariableDecl variable) {
    _writeUint32(_getStringRef(variable.id));
    _writeUint32(_getStringRef(variable.name));
    _writeType(variable.type);

    _writeByte(variable.isFinal ? 1 : 0);
    _writeByte(variable.isConst ? 1 : 0);
    _writeByte(variable.isStatic ? 1 : 0);
    _writeByte(variable.isLate ? 1 : 0);
    _writeByte(variable.isPrivate ? 1 : 0);

    _writeByte(variable.initializer != null ? 1 : 0);
    if (variable.initializer != null) {
      _writeExpression(variable.initializer!);
    }

    _writeSourceLocation(variable.sourceLocation);
  }

  void _writeFunctionDecl(FunctionDecl func) {
    _writeUint32(_getStringRef(func.id));
    _writeUint32(_getStringRef(func.name));
    _writeType(func.returnType);

    _writeByte(func.isAsync ? 1 : 0);
    _writeByte(func.isGenerator ? 1 : 0);

    _writeUint32(func.parameters.length);
    for (final param in func.parameters) {
      _writeParameterDecl(param);
    }

    _writeSourceLocation(func.sourceLocation);
  }

  void _writeParameterDecl(ParameterDecl param) {
    _writeUint32(_getStringRef(param.id));
    _writeUint32(_getStringRef(param.name));
    _writeType(param.type);

    _writeByte(param.isRequired ? 1 : 0);
    _writeByte(param.isNamed ? 1 : 0);
    _writeByte(param.isPositional ? 1 : 0);

    _writeByte(param.defaultValue != null ? 1 : 0);
    if (param.defaultValue != null) {
      _writeExpression(param.defaultValue!);
    }

    _writeSourceLocation(param.sourceLocation);
  }

  void _writeClassDecl(ClassDecl classDecl) {
    _writeUint32(_getStringRef(classDecl.id));
    _writeUint32(_getStringRef(classDecl.name));

    _writeByte(classDecl.isAbstract ? 1 : 0);
    _writeByte(classDecl.isFinal ? 1 : 0);

    // Superclass
    _writeByte(classDecl.superclass != null ? 1 : 0);
    if (classDecl.superclass != null) {
      _writeType(classDecl.superclass!);
    }

    // Interfaces
    _writeUint32(classDecl.interfaces.length);
    for (final iface in classDecl.interfaces) {
      _writeType(iface);
    }

    // Mixins
    _writeUint32(classDecl.mixins.length);
    for (final mixin in classDecl.mixins) {
      _writeType(mixin);
    }

    // Fields
    _writeUint32(classDecl.fields.length);
    for (final field in classDecl.fields) {
      _writeFieldDecl(field);
    }

    // Methods
    _writeUint32(classDecl.methods.length);
    for (final method in classDecl.methods) {
      _writeMethodDecl(method);
    }

    // Constructors
    _writeUint32(classDecl.constructors.length);
    for (final constructor in classDecl.constructors) {
      _writeConstructorDecl(constructor);
    }

    _writeSourceLocation(classDecl.sourceLocation);
  }

  void _writeFieldDecl(FieldDecl field) {
    _writeUint32(_getStringRef(field.id));
    _writeUint32(_getStringRef(field.name));
    _writeType(field.type);

    _writeByte(field.isFinal ? 1 : 0);
    _writeByte(field.isConst ? 1 : 0);
    _writeByte(field.isStatic ? 1 : 0);
    _writeByte(field.isLate ? 1 : 0);
    _writeByte(field.isPrivate ? 1 : 0);

    _writeByte(field.initializer != null ? 1 : 0);
    if (field.initializer != null) {
      _writeExpression(field.initializer!);
    }

    _writeSourceLocation(field.sourceLocation);
  }

  void _writeMethodDecl(MethodDecl method) {
    _writeUint32(_getStringRef(method.id));
    _writeUint32(_getStringRef(method.name));
    _writeType(method.returnType);

    _writeByte(method.isAsync ? 1 : 0);
    _writeByte(method.isGenerator ? 1 : 0);
    _writeByte(method.isStatic ? 1 : 0);
    _writeByte(method.isAbstract ? 1 : 0);
    _writeByte(method.isGetter ? 1 : 0);
    _writeByte(method.isSetter ? 1 : 0);

    _writeUint32(method.parameters.length);
    for (final param in method.parameters) {
      _writeParameterDecl(param);
    }

    _writeSourceLocation(method.sourceLocation);
  }

  void _writeConstructorDecl(ConstructorDecl constructor) {
    _writeUint32(_getStringRef(constructor.id));
    _writeUint32(_getStringRef(constructor.constructorClass ?? "<unknown>"));

    _writeByte(constructor.constructorName != null ? 1 : 0);
    if (constructor.constructorName != null) {
      _writeUint32(_getStringRef(constructor.constructorName!));
    }

    _writeByte(constructor.isConst ? 1 : 0);
    _writeByte(constructor.isFactory ? 1 : 0);

    _writeUint32(constructor.parameters.length);
    for (final param in constructor.parameters) {
      _writeParameterDecl(param);
    }

    _writeSourceLocation(constructor.sourceLocation);
  }

  void _writeAnalysisIssue(AnalysisIssue issue) {
    _writeUint32(_getStringRef(issue.id));
    _writeUint32(_getStringRef(issue.code));
    _writeUint32(_getStringRef(issue.message));

    _writeByte(issue.severity.index);
    _writeByte(issue.category.index);

    _writeByte(issue.suggestion != null ? 1 : 0);
    if (issue.suggestion != null) {
      _writeUint32(_getStringRef(issue.suggestion!));
    }

    _writeSourceLocation(issue.sourceLocation);
  }

  // =========================================================================
  // TYPE WRITING
  // =========================================================================

  void _writeType(TypeIR type) {
    if (type is SimpleTypeIR) {
      _writeByte(BinaryConstants.TYPE_SIMPLE);
      _writeUint32(_getStringRef(type.name));
      _writeByte(type.isNullable ? 1 : 0);
    } else if (type is DynamicTypeIR) {
      _writeByte(BinaryConstants.TYPE_DYNAMIC);
    } else if (type is VoidTypeIR) {
      _writeByte(BinaryConstants.TYPE_VOID);
    } else if (type is NeverTypeIR) {
      _writeByte(BinaryConstants.TYPE_NEVER);
    } else {
      _writeByte(BinaryConstants.TYPE_SIMPLE);
      _writeUint32(_getStringRef(type.displayName()));
      _writeByte(type.isNullable ? 1 : 0);
    }
  }

  // =========================================================================
  // EXPRESSION WRITING
  // =========================================================================

  void _writeExpression(ExpressionIR expr) {
    if (expr is LiteralExpressionIR) {
      _writeByte(BinaryConstants.EXPR_LITERAL);
      _writeLiteralExpression(expr);
    } else if (expr is IdentifierExpressionIR) {
      _writeByte(BinaryConstants.EXPR_IDENTIFIER);
      _writeUint32(_getStringRef(expr.name));
    } else if (expr is BinaryExpressionIR) {
      _writeByte(BinaryConstants.EXPR_BINARY);
      _writeBinaryExpression(expr);
    } else if (expr is MethodCallExpressionIR) {
      _writeByte(BinaryConstants.EXPR_METHOD_CALL);
      _writeMethodCallExpression(expr);
    } else if (expr is PropertyAccessExpressionIR) {
      _writeByte(BinaryConstants.EXPR_PROPERTY_ACCESS);
      _writePropertyAccessExpression(expr);
    } else if (expr is ConditionalExpressionIR) {
      _writeByte(BinaryConstants.EXPR_CONDITIONAL);
      _writeConditionalExpression(expr);
    } else if (expr is ListExpressionIR) {
      _writeByte(BinaryConstants.EXPR_LIST_LITERAL);
      _writeListLiteralExpression(expr);
    } else if (expr is MapExpressionIR) {
      _writeByte(BinaryConstants.EXPR_MAP_LITERAL);
      _writeMapLiteralExpression(expr);
    } else if (expr is SetExpressionIR) {
      _writeSetExpression(expr);
    } else {
      _writeByte(BinaryConstants.EXPR_UNKNOWN);
    }
  }

  void _writeLiteralExpression(LiteralExpressionIR expr) {
    _writeByte(expr.literalType.index);
    switch (expr.literalType) {
      case LiteralType.stringValue:
        _writeUint32(_getStringRef(expr.value as String));
        break;
      case LiteralType.intValue:
        _writeInt64(int.parse(expr.value.toString()));
        break;
      case LiteralType.doubleValue:
        _writeDouble(double.parse(expr.value.toString()));
        break;
      case LiteralType.boolValue:
        _writeByte((expr.value as bool) ? 1 : 0);
        break;
      case LiteralType.nullValue:
        break;
      default:
        break;
    }
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeBinaryExpression(BinaryExpressionIR expr) {
    _writeExpression(expr.left);
    _writeUint32(_getStringRef(expr.operator.name));
    _writeExpression(expr.right);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeMethodCallExpression(MethodCallExpressionIR expr) {
    _writeByte(expr.target != null ? 1 : 0);
    if (expr.target != null) {
      _writeExpression(expr.target!);
    }
    _writeUint32(_getStringRef(expr.methodName));
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writePropertyAccessExpression(PropertyAccessExpressionIR expr) {
    _writeExpression(expr.target);
    _writeUint32(_getStringRef(expr.propertyName));
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeConditionalExpression(ConditionalExpressionIR expr) {
    _writeExpression(expr.condition);
    _writeExpression(expr.thenExpression);
    _writeExpression(expr.elseExpression);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeListLiteralExpression(ListExpressionIR expr) {
    _writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      _writeExpression(elem);
    }
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeMapLiteralExpression(MapExpressionIR expr) {
    _writeUint32(expr.entries.length);
    for (final entry in expr.entries) {
      _writeExpression(entry.key);
      _writeExpression(entry.value);
    }
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

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
      );
    }
    _writeUint16(bytes.length);
    _buffer.add(bytes);
  }

  void _writeChecksum(Uint8List data) {
    final digest = sha256.convert(data);
    _buffer.add(digest.bytes);
  }

  // =========================================================================
  // VALIDATION
  // =========================================================================

  List<String> _validateFileIR(DartFile fileIR) {
    final errors = <String>[];

    if (fileIR.filePath.isEmpty) {
      errors.add('FileIR.filePath is empty');
    }
    if (fileIR.contentHash.isEmpty) {
      errors.add('FileIR.contentHash is empty');
    }

    for (final classDecl in fileIR.classDeclarations) {
      if (classDecl.name.isEmpty) {
        errors.add('Class has empty name');
      }
    }

    return errors;
  }

  //   void _writeLiteralExpression(LiteralExpressionIR expr) {
  //   _writeByte(expr.literalType.index);
  //   switch (expr.literalType) {
  //     case LiteralType.stringValue:
  //       _writeUint32(_getStringRef(expr.value as String));
  //       break;
  //     case LiteralType.intValue:
  //       _writeInt64(int.parse(expr.value.toString()));
  //       break;
  //     case LiteralType.doubleValue:
  //       _writeDouble(double.parse(expr.value.toString()));
  //       break;
  //     case LiteralType.boolValue:
  //       _writeByte((expr.value as bool) ? 1 : 0);
  //       break;
  //     case LiteralType.nullValue:
  //       break;
  //     default:
  //       break;
  //   }
  //   _writeSourceLocation(expr.sourceLocation);
  // }

  void _writeSetExpression(SetExpressionIR expr) {
    _writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      _writeExpression(elem);
    }
    _writeType(expr.elementType);
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- Binary & Unary Operations ---

  // void _writeBinaryExpression(BinaryExpressionIR expr) {
  //   _writeExpression(expr.left);
  //   _writeByte(expr.operator.index); // Enum index
  //   _writeExpression(expr.right);
  //   _writeType(expr.resultType);
  //   _writeSourceLocation(expr.sourceLocation);
  // }

  void _writeUnaryExpression(UnaryExpressionIR expr) {
    _writeByte(expr.operator.index); // Enum index
    _writeExpression(expr.operand);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeCompoundAssignmentExpression(CompoundAssignmentExpressionIR expr) {
    _writeExpression(expr.target);
    _writeByte(expr.operator.index);
    _writeExpression(expr.value);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- Assignment & Access ---

  void _writeAssignmentExpression(AssignmentExpressionIR expr) {
    _writeExpression(expr.target);
    _writeExpression(expr.value);
    _writeByte(expr.isCompound ? 1 : 0);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeIndexAccessExpression(IndexAccessExpressionIR expr) {
    _writeExpression(expr.target);
    _writeExpression(expr.index);
    _writeType(expr.resultType);
    _writeByte(expr.isNullAware ? 1 : 0);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeCascadeExpression(CascadeExpressionIR expr) {
    _writeExpression(expr.target);
    _writeUint32(expr.cascadeSections.length);
    for (final section in expr.cascadeSections) {
      _writeExpression(section);
    }
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- Type Operations ---

  void _writeCastExpression(CastExpressionIR expr) {
    _writeExpression(expr.expression);
    _writeType(expr.targetType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeTypeCheckExpression(TypeCheckExpressionIR expr) {
    _writeExpression(expr.expression);
    _writeType(expr.checkType);
    _writeByte(expr.isNegated ? 1 : 0);
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- Async Operations ---

  void _writeAwaitExpression(AwaitExpressionIR expr) {
    _writeExpression(expr.futureExpression);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeThrowExpression(ThrowExpressionIR expr) {
    _writeExpression(expr.exception);
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- Null-Aware Operations ---

  void _writeNullAwareAccessExpression(NullAwareAccessExpressionIR expr) {
    _writeExpression(expr.target);
    _writeByte(expr.operationType.index);
    _writeByte(expr.operationData != null ? 1 : 0);
    if (expr.operationData != null) {
      _writeUint32(_getStringRef(expr.operationData!));
    }
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeNullCoalescingExpression(NullCoalescingExpressionIR expr) {
    _writeExpression(expr.left);
    _writeExpression(expr.right);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- Function & Method Calls ---

  void _writeMethodCallExpression(MethodCallExpressionIR expr) {
    _writeByte(expr.target != null ? 1 : 0);
    if (expr.target != null) {
      _writeExpression(expr.target!);
    }
    _writeUint32(_getStringRef(expr.methodName));
    _writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      _writeExpression(arg);
    }
    _writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeExpression(entry.value);
    }
    _writeByte(expr.isNullAware ? 1 : 0);
    _writeByte(expr.isCascade ? 1 : 0);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeFunctionCallExpression(FunctionCallExpressionIR expr) {
    _writeExpression(expr.function);
    _writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      _writeExpression(arg);
    }
    _writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeExpression(entry.value);
    }
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeInstanceCreationExpression(InstanceCreationExpressionIR expr) {
    _writeType(expr.type);
    _writeByte(expr.constructorName != null ? 1 : 0);
    if (expr.constructorName != null) {
      _writeUint32(_getStringRef(expr.constructorName!));
    }
    _writeByte(expr.isConst ? 1 : 0);
    _writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      _writeExpression(arg);
    }
    _writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeExpression(entry.value);
    }
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeLambdaExpression(LambdaExpressionIR expr) {
    _writeUint32(expr.parameters.length);
    for (final param in expr.parameters) {
      _writeParameterDecl(param);
    }
    _writeByte(expr.body != null ? 1 : 0);
    if (expr.body != null) {
      _writeExpression(expr.body!);
    }
    _writeType(expr.returnType);
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- String Interpolation ---

  void _writeStringInterpolationExpression(
    StringInterpolationExpressionIR expr,
  ) {
    _writeUint32(expr.parts.length);
    for (final part in expr.parts) {
      _writeByte(part.isExpression ? 1 : 0);
      if (part.isExpression) {
        _writeExpression(part.expression!);
      } else {
        _writeUint32(_getStringRef(part.text!));
      }
    }
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- Identifiers & Access ---

  void _writeIdentifierExpression(IdentifierExpressionIR expr) {
    _writeUint32(_getStringRef(expr.name));
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writePropertyAccessExpression(PropertyAccessExpressionIR expr) {
    _writeExpression(expr.target);
    _writeUint32(_getStringRef(expr.propertyName));
    _writeByte(expr.isNullAware ? 1 : 0);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- Control Flow ---

  void _writeConditionalExpression(ConditionalExpressionIR expr) {
    _writeExpression(expr.condition);
    _writeExpression(expr.thenExpression);
    _writeExpression(expr.elseExpression);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  // --- Special ---

  void _writeThisExpression(ThisExpressionIR expr) {
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeSuperExpression(SuperExpressionIR expr) {
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeParenthesizedExpression(ParenthesizedExpressionIR expr) {
    _writeExpression(expr.innerExpression);
    _writeSourceLocation(expr.sourceLocation);
  }

  // ============================================================================
// STATEMENT SERIALIZATION - WRITER METHODS
// ============================================================================
// Add these methods to BinaryIRWriter class

// --- Simple Statements ---

void _writeExpressionStatement(ExpressionStatementIR stmt) {
  _writeExpression(stmt.expression);
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeVariableDeclarationStatement(VariableDeclarationStatementIR stmt) {
  _writeUint32(stmt.variables.length);
  for (final variable in stmt.variables) {
    _writeVariableDecl(variable);
  }
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeReturnStatement(ReturnStatementIR stmt) {
  _writeByte(stmt.value != null ? 1 : 0);
  if (stmt.value != null) {
    _writeExpression(stmt.value!);
  }
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeBreakStatement(BreakStatementIR stmt) {
  _writeByte(stmt.label != null ? 1 : 0);
  if (stmt.label != null) {
    _writeUint32(_getStringRef(stmt.label!));
  }
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeContinueStatement(ContinueStatementIR stmt) {
  _writeByte(stmt.label != null ? 1 : 0);
  if (stmt.label != null) {
    _writeUint32(_getStringRef(stmt.label!));
  }
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeThrowStatement(ThrowStatementIR stmt) {
  _writeExpression(stmt.exception);
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeAssertStatement(AssertStatementIR stmt) {
  _writeExpression(stmt.condition);
  _writeByte(stmt.message != null ? 1 : 0);
  if (stmt.message != null) {
    _writeExpression(stmt.message!);
  }
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeEmptyStatement(EmptyStatementIR stmt) {
  _writeSourceLocation(stmt.sourceLocation);
}

// --- Compound Statements ---

void _writeBlockStatement(BlockStatementIR stmt) {
  _writeUint32(stmt.statements.length);
  for (final s in stmt.statements) {
    _writeStatement(s);
  }
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeIfStatement(IfStatementIR stmt) {
  _writeExpression(stmt.condition);
  _writeStatement(stmt.thenBranch);
  _writeByte(stmt.elseBranch != null ? 1 : 0);
  if (stmt.elseBranch != null) {
    _writeStatement(stmt.elseBranch!);
  }
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeForStatement(ForStatementIR stmt) {
  // Init
  _writeByte(stmt.init != null ? 1 : 0);
  if (stmt.init != null) {
    if (stmt.init is VariableDeclarationStatementIR) {
      _writeByte(0);
      _writeVariableDeclarationStatement(stmt.init as VariableDeclarationStatementIR);
    } else {
      _writeByte(1);
      _writeExpression(stmt.init as ExpressionIR);
    }
  }

  // Condition
  _writeByte(stmt.condition != null ? 1 : 0);
  if (stmt.condition != null) {
    _writeExpression(stmt.condition!);
  }

  // Update
  _writeUint32(stmt.updates.length);
  for (final update in stmt.updates) {
    _writeExpression(update);
  }

  // Body
  _writeStatement(stmt.body);
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeForEachStatement(ForEachStatementIR stmt) {
  _writeUint32(_getStringRef(stmt.variable));
  _writeExpression(stmt.iterable);
  _writeStatement(stmt.body);
  _writeByte(stmt.isAsync ? 1 : 0);
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeWhileStatement(WhileStatementIR stmt) {
  _writeExpression(stmt.condition);
  _writeStatement(stmt.body);
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeDoWhileStatement(DoWhileStatementIR stmt) {
  _writeStatement(stmt.body);
  _writeExpression(stmt.condition);
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeSwitchStatement(SwitchStatementIR stmt) {
  _writeExpression(stmt.expression);
  _writeUint32(stmt.cases.length);
  for (final switchCase in stmt.cases) {
    _writeSwitchCase(switchCase);
  }
  _writeByte(stmt.defaultCase != null ? 1 : 0);
  if (stmt.defaultCase != null) {
    _writeUint32(stmt.defaultCase!.statements.length);
    for (final s in stmt.defaultCase!.statements) {
      _writeStatement(s);
    }
  }
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeSwitchCase(SwitchCaseIR switchCase) {
  _writeUint32(switchCase.labels.length);
  for (final label in switchCase.labels) {
    _writeExpression(label);
  }
  _writeUint32(switchCase.statements.length);
  for (final s in switchCase.statements) {
    _writeStatement(s);
  }
}

void _writeTryStatement(TryStatementIR stmt) {
  _writeStatement(stmt.tryBlock);
  
  _writeUint32(stmt.catchClauses.length);
  for (final catchClause in stmt.catchClauses) {
    _writeCatchClause(catchClause);
  }

  _writeByte(stmt.finallyBlock != null ? 1 : 0);
  if (stmt.finallyBlock != null) {
    _writeStatement(stmt.finallyBlock!);
  }

  _writeSourceLocation(stmt.sourceLocation);
}

void _writeCatchClause(CatchClauseIR catchClause) {
  _writeType(catchClause.exceptionType);
  _writeByte(catchClause.exceptionVariable != null ? 1 : 0);
  if (catchClause.exceptionVariable != null) {
    _writeUint32(_getStringRef(catchClause.exceptionVariable!));
  }
  _writeByte(catchClause.stackTraceVariable != null ? 1 : 0);
  if (catchClause.stackTraceVariable != null) {
    _writeUint32(_getStringRef(catchClause.stackTraceVariable!));
  }
  _writeStatement(catchClause.body);
}

void _writeLabeledStatement(LabeledStatementIR stmt) {
  _writeUint32(_getStringRef(stmt.label));
  _writeStatement(stmt.statement);
  _writeSourceLocation(stmt.sourceLocation);
}

// --- Special Statements ---

void _writeYieldStatement(YieldStatementIR stmt) {
  _writeExpression(stmt.value);
  _writeByte(stmt.isYieldEach ? 1 : 0);
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeFunctionDeclarationStatement(FunctionDeclarationStatementIR stmt) {
  _writeFunctionDecl(stmt.function);
  _writeSourceLocation(stmt.sourceLocation);
}

void _writeStatement(StatementIR stmt) {
  if (stmt is ExpressionStatementIR) {
    _writeByte(BinaryConstants.STMT_EXPRESSION);
    _writeExpressionStatement(stmt);
  } else if (stmt is VariableDeclarationStatementIR) {
    _writeByte(BinaryConstants.STMT_VAR_DECL);
    _writeVariableDeclarationStatement(stmt);
  } else if (stmt is ReturnStatementIR) {
    _writeByte(BinaryConstants.STMT_RETURN);
    _writeReturnStatement(stmt);
  } else if (stmt is BreakStatementIR) {
    _writeByte(BinaryConstants.STMT_BREAK);
    _writeBreakStatement(stmt);
  } else if (stmt is ContinueStatementIR) {
    _writeByte(BinaryConstants.STMT_CONTINUE);
    _writeContinueStatement(stmt);
  } else if (stmt is ThrowStatementIR) {
    _writeByte(BinaryConstants.STMT_THROW);
    _writeThrowStatement(stmt);
  } else if (stmt is AssertStatementIR) {
    _writeByte(BinaryConstants.STMT_ASSERT);
    _writeAssertStatement(stmt);
  } else if (stmt is EmptyStatementIR) {
    _writeByte(BinaryConstants.STMT_EMPTY);
    _writeEmptyStatement(stmt);
  } else if (stmt is BlockStatementIR) {
    _writeByte(BinaryConstants.STMT_BLOCK);
    _writeBlockStatement(stmt);
  } else if (stmt is IfStatementIR) {
    _writeByte(BinaryConstants.STMT_IF);
    _writeIfStatement(stmt);
  } else if (stmt is ForStatementIR) {
    _writeByte(BinaryConstants.STMT_FOR);
    _writeForStatement(stmt);
  } else if (stmt is ForEachStatementIR) {
    _writeByte(BinaryConstants.STMT_FOR_EACH);
    _writeForEachStatement(stmt);
  } else if (stmt is WhileStatementIR) {
    _writeByte(BinaryConstants.STMT_WHILE);
    _writeWhileStatement(stmt);
  } else if (stmt is DoWhileStatementIR) {
    _writeByte(BinaryConstants.STMT_DO_WHILE);
    _writeDoWhileStatement(stmt);
  } else if (stmt is SwitchStatementIR) {
    _writeByte(BinaryConstants.STMT_SWITCH);
    _writeSwitchStatement(stmt);
  } else if (stmt is TryStatementIR) {
    _writeByte(BinaryConstants.STMT_TRY);
    _writeTryStatement(stmt);
  } else if (stmt is LabeledStatementIR) {
    _writeByte(BinaryConstants.STMT_LABELED);
    _writeLabeledStatement(stmt);
  } else if (stmt is YieldStatementIR) {
    _writeByte(BinaryConstants.STMT_YIELD);
    _writeYieldStatement(stmt);
  } else if (stmt is FunctionDeclarationStatementIR) {
    _writeByte(BinaryConstants.STMT_FUNCTION_DECL);
    _writeFunctionDeclarationStatement(stmt);
  } else {
    _writeByte(BinaryConstants.STMT_UNKNOWN);
  }
}

}

/// Exception thrown during serialization
class SerializationException implements Exception {
  final String message;
  final int offset;

  SerializationException(this.message, {required this.offset});

  @override
  String toString() => 'SerializationException at offset $offset: $message';
}
