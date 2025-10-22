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
import '../new_ast_IR/ir/expression_types/advanced/advanced.dart';
import '../new_ast_IR/ir/expression_types/cascade_expression_ir.dart';
import '../new_ast_IR/ir/expression_types/function_method_calls/function_method_calls.dart';
import '../new_ast_IR/ir/expression_types/operations/operations.dart';
import '../new_ast_IR/ir/statement/statement_ir.dart';
import '../new_ast_IR/ir/type_ir.dart';
import '../new_ast_IR/parameter_decl.dart';
import '../new_ast_IR/variable_decl.dart';
import 'binary_constain.dart';

/// Serializes Flutter IR to binary format with checksums and validation
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
    // =====================================================================
    // STEP 1: Validate before doing any work
    // =====================================================================
    final validationErrors = _validateFileIR(fileIR);
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
      // Step 2: Collect all strings for deduplication
      _collectStrings(fileIR);

      // Step 3: Write header
      _writeHeader();

      // Step 4: Write string table
      _writeStringTable();

      // Step 5: Write IR data
      _writeFileIRData(fileIR);

      // ===================================================================
      // STEP 6: Write checksum if enabled
      // ===================================================================
      if (_shouldWriteChecksum) {
        final dataBeforeChecksum = _buffer.toBytes();
        _writeChecksum(dataBeforeChecksum);
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

  // =========================================================================
  // HEADER WRITING
  // =========================================================================

  void _writeHeader() {
    try {
      // Magic number (4 bytes): "FLIR"
      _writeUint32(BinaryConstants.MAGIC_NUMBER);

      // Format version (2 bytes)
      _writeUint16(BinaryConstants.FORMAT_VERSION);

      // Flags (2 bytes)
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

    print('[COLLECT] File: ${fileIR.filePath}');
    print('[COLLECT] Imports: ${fileIR.imports.length}');
    print('[COLLECT] Exports: ${fileIR.exports.length}'); // ← Add this
    print('[COLLECT] Classes: ${fileIR.classDeclarations.length}');
    print('[COLLECT] Function: ${fileIR.functionDeclarations.length}');

    // Collect from imports
    for (final import in fileIR.imports) {
      _addString(import.uri);
      _addString(import.sourceLocation.file);
      if (import.prefix != null) _addString(import.prefix!);
      for (final show in import.showList) _addString(show);
      for (final hide in import.hideList) _addString(hide);
      _collectStringsFromImport(import); // ← ADD THIS
    }

    for (final export in fileIR.exports) {
      _addString(export.uri);
      _addString(export.sourceLocation.file); // ← ADD THIS
      for (final show in export.showList) _addString(show);
      for (final hide in export.hideList) _addString(hide);
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

  void _collectStringsFromImport(ImportStmt import) {
    for (final ann in import.annotations) {
      _addString(ann.name);
      // Collect from annotation arguments recursively if needed
    }
  }

  void _collectStringsFromClass(ClassDecl classDecl) {
    _addString(classDecl.id);
    _addString(classDecl.name);
    _addString(classDecl.sourceLocation.file); // ← ADD THIS
    if (classDecl.documentation != null) _addString(classDecl.documentation!);
    // ADD THIS - collect superclass type name
    if (classDecl.superclass != null) {
      _addString(classDecl.superclass!.displayName());
    }

    // ADD THIS - collect interface type names
    for (final iface in classDecl.interfaces) {
      _addString(iface.displayName());
    }

    // ADD THIS - collect mixin type names
    for (final mixin in classDecl.mixins) {
      _addString(mixin.displayName());
    }

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
    _addString(func.sourceLocation.file);
    for (final param in func.parameters) {
      _addString(param.name);
      _addString(param.type.displayName());
      _addString(param.sourceLocation.file); // ← ADD THIS
    }
  }

  void _collectStringsFromVariable(VariableDecl variable) {
    _addString(variable.id);
    _addString(variable.name);
    _addString(variable.type.displayName());
    _addString(variable.sourceLocation.file); // ← ADD THIS
  }

  // =========================================================================
  // IR DATA WRITING
  // =========================================================================

  // void _writeFileIRData(DartFile fileIR) {
  //   try {
  //     _irDataStartOffset = _buffer.length;

  //     // File metadata
  //     _writeUint32(_getStringRef(fileIR.filePath));
  //     _writeUint32(_getStringRef(fileIR.contentHash));
  //     _writeUint32(_getStringRef(fileIR.library ?? "<unknown>"));

  //     // Analysis metadata
  //     _writeUint64(DateTime.now().millisecondsSinceEpoch);

  //     // Imports
  //     _writeUint32(fileIR.imports.length);
  //     for (final import in fileIR.imports) {
  //       _writeImportStmt(import);
  //     }

  //     // Exports
  //     _writeUint32(fileIR.exports.length);
  //     for (final export in fileIR.exports) {
  //       _writeExportStmt(export);
  //     }

  //     // Top-level variables
  //     _writeUint32(fileIR.variableDeclarations.length);
  //     for (final variable in fileIR.variableDeclarations) {
  //       _writeVariableDecl(variable);
  //     }

  //     // Functions
  //     _writeUint32(fileIR.functionDeclarations.length);
  //     for (final func in fileIR.functionDeclarations) {
  //       _writeFunctionDecl(func);
  //     }

  //     // Classes
  //     _writeUint32(fileIR.classDeclarations.length);
  //     for (final classDecl in fileIR.classDeclarations) {
  //       _writeClassDecl(classDecl);
  //     }

  //     // Analysis issues
  //     _writeUint32(fileIR.analysisIssues.length);
  //     for (final issue in fileIR.analysisIssues) {
  //       _writeAnalysisIssue(issue);
  //     }
  //   } catch (e) {
  //     throw SerializationException(
  //       'Failed to write file IR data: $e',
  //       offset: _buffer.length,
  //       context: 'file_ir_data',
  //     );
  //   }
  // }

  void _writeFileIRData(DartFile fileIR) {
    try {
      _irDataStartOffset = _buffer.length;
      print('[WRITE FILE IR DATA] START');

      // File metadata
      _writeUint32(_getStringRef(fileIR.filePath));
      print('[WRITE FILE IR] After filePath: ${_buffer.length}');

      _writeUint32(_getStringRef(fileIR.contentHash));
      print('[WRITE FILE IR] After contentHash: ${_buffer.length}');

      _writeUint32(_getStringRef(fileIR.library ?? "<unknown>"));
      print('[WRITE FILE IR] After library: ${_buffer.length}');

      // Analysis metadata
      _writeUint64(DateTime.now().millisecondsSinceEpoch);
      print('[WRITE FILE IR] After analyzedAt: ${_buffer.length}');

      // Imports
      _writeUint32(fileIR.imports.length);
      print(
        '[WRITE FILE IR] After importCount: ${_buffer.length}, count: ${fileIR.imports.length}',
      );

      for (final import in fileIR.imports) {
        _writeImportStmt(import);
      }
      print('[WRITE FILE IR] After imports loop: ${_buffer.length}');

      // Exports
      _writeUint32(fileIR.exports.length);
      print(
        '[WRITE FILE IR] After exportCount: ${_buffer.length}, count: ${fileIR.exports.length}',
      );

      for (final export in fileIR.exports) {
        _writeExportStmt(export);
      }
      print('[WRITE FILE IR] After exports loop: ${_buffer.length}');

      // Top-level variables
      _writeUint32(fileIR.variableDeclarations.length);
      print('[WRITE FILE IR] After varCount: ${_buffer.length}');

      for (final variable in fileIR.variableDeclarations) {
        _writeVariableDecl(variable);
      }
      print('[WRITE FILE IR] After variables: ${_buffer.length}');

      // Functions
      _writeUint32(fileIR.functionDeclarations.length);
      print('[WRITE FILE IR] After funcCount: ${_buffer.length}');

      for (final func in fileIR.functionDeclarations) {
        _writeFunctionDecl(func);
      }
      print('[WRITE FILE IR] After functions: ${_buffer.length}');

      // Classes
      _writeUint32(fileIR.classDeclarations.length);
      print('[WRITE FILE IR] After classCount: ${_buffer.length}');

      for (final classDecl in fileIR.classDeclarations) {
        _writeClassDecl(classDecl);
      }
      print('[WRITE FILE IR] After classes: ${_buffer.length}');

      // Analysis issues
      _writeUint32(fileIR.analysisIssues.length);
      print('[WRITE FILE IR] After issueCount: ${_buffer.length}');

      for (final issue in fileIR.analysisIssues) {
        _writeAnalysisIssue(issue);
      }
      print('[WRITE FILE IR] After issues: ${_buffer.length}');
      print('[WRITE FILE IR DATA] END');
    } catch (e) {
      throw SerializationException(
        'Failed to write file IR data: $e',
        offset: _buffer.length,
        context: 'file_ir_data',
      );
    }
  }

  void _writeAnnotation(AnnotationIR ann) {
    _writeUint32(_getStringRef(ann.name));

    _writeUint32(ann.arguments.length);
    for (final arg in ann.arguments) {
      _writeExpression(arg);
    }

    _writeUint32(ann.namedArguments.length);
    for (final entry in ann.namedArguments.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeExpression(entry.value);
    }

    _writeSourceLocation(ann.sourceLocation);
  }
  //   void _writeImportStmt(ImportStmt import) {
  //   _writeUint32(_getStringRef(import.uri));
  //   _writeByte(import.prefix != null ? 1 : 0);
  //   if (import.prefix != null) {
  //     _writeUint32(_getStringRef(import.prefix!));
  //   }
  //   _writeByte(import.isDeferred ? 1 : 0);

  //   // ADD THIS - Write annotations
  //   _writeUint32(import.annotations.length);
  //   for (final ann in import.annotations) {
  //     _writeAnnotation(ann);
  //   }

  //   _writeUint32(import.showList.length);
  //   for (final show in import.showList) {
  //     _writeUint32(_getStringRef(show));
  //   }

  //   _writeUint32(import.hideList.length);
  //   for (final hide in import.hideList) {
  //     _writeUint32(_getStringRef(hide));
  //   }

  //   _writeSourceLocation(import.sourceLocation);
  // }

  void _writeImportStmt(ImportStmt import) {
    print('[WRITE IMPORT] START - buffer offset: ${_buffer.length}');

    _writeUint32(_getStringRef(import.uri));
    print('[WRITE IMPORT] After uri: ${_buffer.length}');

    _writeByte(import.prefix != null ? 1 : 0);
    print('[WRITE IMPORT] After prefix flag: ${_buffer.length}');

    if (import.prefix != null) {
      _writeUint32(_getStringRef(import.prefix!));
      print('[WRITE IMPORT] After prefix value: ${_buffer.length}');
    }

    _writeByte(import.isDeferred ? 1 : 0);
    print('[WRITE IMPORT] After deferred: ${_buffer.length}');

    _writeUint32(import.showList.length);
    print('[WRITE IMPORT] After showCount: ${_buffer.length}');

    for (final show in import.showList) {
      _writeUint32(_getStringRef(show));
    }
    print('[WRITE IMPORT] After showList: ${_buffer.length}');

    _writeUint32(import.hideList.length);
    print('[WRITE IMPORT] After hideCount: ${_buffer.length}');

    for (final hide in import.hideList) {
      _writeUint32(_getStringRef(hide));
    }
    print('[WRITE IMPORT] After hideList: ${_buffer.length}');

    _writeSourceLocation(import.sourceLocation);
    print('[WRITE IMPORT] After sourceLocation: ${_buffer.length}');
    print('[WRITE IMPORT] END - total bytes written: ${_buffer.length}');
  }

  void _writeExportStmt(ExportStmt export) {
    print('[WRITE EXPORT] START - buffer offset: ${_buffer.length}');

    _writeUint32(_getStringRef(export.uri));
    print('[WRITE EXPORT] After uri: ${_buffer.length}');

    _writeUint32(export.showList.length);
    print('[WRITE EXPORT] After showCount: ${_buffer.length}');

    for (final show in export.showList) {
      _writeUint32(_getStringRef(show));
    }
    print('[WRITE EXPORT] After showList: ${_buffer.length}');

    _writeUint32(export.hideList.length);
    print('[WRITE EXPORT] After hideCount: ${_buffer.length}');

    for (final hide in export.hideList) {
      _writeUint32(_getStringRef(hide));
    }
    print('[WRITE EXPORT] After hideList: ${_buffer.length}');

    _writeSourceLocation(export.sourceLocation);
    print('[WRITE EXPORT] After sourceLocation: ${_buffer.length}');
    print('[WRITE EXPORT] END');
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
    print('[WRITE FUNC] START - buffer: ${_buffer.length}');

    _writeUint32(_getStringRef(func.id));
    print('[WRITE FUNC] After id: ${_buffer.length}');

    _writeUint32(_getStringRef(func.name));
    print('[WRITE FUNC] After name: ${_buffer.length}');

    _writeType(func.returnType);
    print('[WRITE FUNC] After returnType: ${_buffer.length}');

    _writeByte(func.isAsync ? 1 : 0);
    print('[WRITE FUNC] After isAsync: ${_buffer.length}');

    _writeByte(func.isGenerator ? 1 : 0);
    print('[WRITE FUNC] After isGenerator: ${_buffer.length}');

    _writeUint32(func.parameters.length);
    print('[WRITE FUNC] After paramCount: ${_buffer.length}');

    for (final param in func.parameters) {
      _writeParameterDecl(param);
    }
    print('[WRITE FUNC] After parameters: ${_buffer.length}');

    _writeSourceLocation(func.sourceLocation);
    print('[WRITE FUNC] After sourceLocation: ${_buffer.length}');
    print('[WRITE FUNC] END');
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
    print('[WRITE CLASS] START - buffer: ${_buffer.length}');

    _writeUint32(_getStringRef(classDecl.id));
    print('[WRITE CLASS] After id: ${_buffer.length}');

    _writeUint32(_getStringRef(classDecl.name));
    print('[WRITE CLASS] After name: ${_buffer.length}');

    _writeByte(classDecl.isAbstract ? 1 : 0);
    print('[WRITE CLASS] After isAbstract: ${_buffer.length}');

    _writeByte(classDecl.isFinal ? 1 : 0);
    print('[WRITE CLASS] After isFinal: ${_buffer.length}');

    // Superclass
    _writeByte(classDecl.superclass != null ? 1 : 0);
    print('[WRITE CLASS] After hasSuperclass: ${_buffer.length}');

    if (classDecl.superclass != null) {
      _writeType(classDecl.superclass!);
    }
    print('[WRITE CLASS] After superclass: ${_buffer.length}');

    // Interfaces
    _writeUint32(classDecl.interfaces.length);
    print('[WRITE CLASS] After interfaceCount: ${_buffer.length}');

    for (final iface in classDecl.interfaces) {
      _writeType(iface);
    }
    print('[WRITE CLASS] After interfaces: ${_buffer.length}');

    // Mixins
    _writeUint32(classDecl.mixins.length);
    print('[WRITE CLASS] After mixinCount: ${_buffer.length}');

    for (final mixin in classDecl.mixins) {
      _writeType(mixin);
    }
    print('[WRITE CLASS] After mixins: ${_buffer.length}');

    // Fields
    _writeUint32(classDecl.fields.length);
    print('[WRITE CLASS] After fieldCount: ${_buffer.length}');

    for (final field in classDecl.fields) {
      _writeFieldDecl(field);
    }
    print('[WRITE CLASS] After fields: ${_buffer.length}');

    // Methods
    _writeUint32(classDecl.methods.length);
    print('[WRITE CLASS] After methodCount: ${_buffer.length}');

    for (final method in classDecl.methods) {
      _writeMethodDecl(method);
    }
    print('[WRITE CLASS] After methods: ${_buffer.length}');

    // Constructors
    _writeUint32(classDecl.constructors.length);
    print('[WRITE CLASS] After constructorCount: ${_buffer.length}');

    for (final constructor in classDecl.constructors) {
      _writeConstructorDecl(constructor);
    }
    print('[WRITE CLASS] After constructors: ${_buffer.length}');

    _writeSourceLocation(classDecl.sourceLocation);
    print('[WRITE CLASS] After sourceLocation: ${_buffer.length}');
    print('[WRITE CLASS] END');
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
      _writeByte(BinaryConstants.EXPR_SET_LITERAL);
      _writeSetExpression(expr);
    } else if (expr is UnaryExpressionIR) {
      _writeByte(BinaryConstants.EXPR_UNARY);
      _writeUnaryExpression(expr);
    } else if (expr is CompoundAssignmentExpressionIR) {
      _writeByte(BinaryConstants.EXPR_COMPOUND_ASSIGNMENT);
      _writeCompoundAssignmentExpression(expr);
    } else if (expr is AssignmentExpressionIR) {
      _writeByte(BinaryConstants.EXPR_ASSIGNMENT);
      _writeAssignmentExpression(expr);
    } else if (expr is IndexAccessExpressionIR) {
      _writeByte(BinaryConstants.EXPR_INDEX_ACCESS);
      _writeIndexAccessExpression(expr);
    } else if (expr is CascadeExpressionIR) {
      _writeByte(BinaryConstants.EXPR_CASCADE);
      _writeCascadeExpression(expr);
    } else if (expr is CastExpressionIR) {
      _writeByte(BinaryConstants.EXPR_CAST);
      _writeCastExpression(expr);
    } else if (expr is TypeCheckExpr) {
      _writeByte(BinaryConstants.EXPR_TYPE_CHECK);
      _writeTypeCheckExpression(expr);
    } else if (expr is AwaitExpr) {
      _writeByte(BinaryConstants.EXPR_AWAIT);
      _writeAwaitExpression(expr);
    } else if (expr is ThrowExpr) {
      _writeByte(BinaryConstants.EXPR_THROW);
      _writeThrowExpression(expr);
    } else if (expr is NullAwareAccessExpressionIR) {
      _writeByte(BinaryConstants.EXPR_NULL_AWARE);
      _writeNullAwareAccessExpression(expr);
    } else if (expr is NullCoalescingExpressionIR) {
      _writeByte(BinaryConstants.OP_NULL_COALESCE);
      _writeNullCoalescingExpression(expr);
    } else if (expr is FunctionCallExpr) {
      _writeByte(BinaryConstants.EXPR_FUNCTION_CALL);
      _writeFunctionCallExpression(expr);
    } else if (expr is StringInterpolationExpressionIR) {
      _writeByte(BinaryConstants.EXPR_STRING_INTERPOLATION);
      _writeStringInterpolationExpression(expr);
    } else if (expr is InstanceCreationExpressionIR) {
      _writeByte(BinaryConstants.EXPR_INSTANCE_CREATION);
      _writeInstanceCreationExpression(expr);
    } else if (expr is LambdaExpr) {
      _writeByte(BinaryConstants.EXPR_LAMBDA);
      _writeLambdaExpression(expr);
    } else if (expr is ThisExpressionIR) {
      _writeByte(BinaryConstants.EXPR_THIS);
      _writeThisExpression(expr);
    } else if (expr is SuperExpressionIR) {
      _writeByte(BinaryConstants.EXPR_SUPER);
      _writeSuperExpression(expr);
    } else if (expr is ParenthesizedExpressionIR) {
      _writeByte(BinaryConstants.EXPR_PARENTHESIZED);
      _writeParenthesizedExpression(expr);
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
    _writeByte(expr.operator.index);
    _writeExpression(expr.right);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeUnaryExpression(UnaryExpressionIR expr) {
    _writeByte(expr.operator.index);
    _writeExpression(expr.operand);
    _writeByte(expr.isPrefix ? 1 : 0);
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

  void _writeAssignmentExpression(AssignmentExpressionIR expr) {
    _writeExpression(expr.target);
    _writeExpression(expr.value);
    _writeSourceLocation(expr.sourceLocation);
    _writeType(expr.resultType);
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
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeCastExpression(CastExpressionIR expr) {
    _writeExpression(expr.expression);
    _writeType(expr.targetType);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeTypeCheckExpression(TypeCheckExpr expr) {
    _writeExpression(expr.expression);
    _writeType(expr.typeToCheck);
    _writeByte(expr.isNegated ? 1 : 0);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeAwaitExpression(AwaitExpr expr) {
    _writeExpression(expr.futureExpression);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeThrowExpression(ThrowExpr expr) {
    _writeExpression(expr.exceptionExpression);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

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

  void _writeFunctionCallExpression(FunctionCallExpr expr) {
    _writeUint32(_getStringRef(expr.functionName));
    _writeUint32(expr.arguments.length);
    for (final arg in expr.arguments) {
      _writeExpression(arg);
    }
    _writeUint32(expr.namedArguments.length);
    for (final entry in expr.namedArguments.entries) {
      _writeUint32(_getStringRef(entry.key));
      _writeExpression(entry.value);
    }
    _writeUint32(expr.typeArguments.length);
    for (final typeArg in expr.typeArguments) {
      _writeType(typeArg);
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

  void _writeLambdaExpression(LambdaExpr expr) {
    _writeUint32(expr.parameters.length);
    for (final param in expr.parameters) {
      _writeUint32(_getStringRef(param.id));
      _writeUint32(_getStringRef(param.name));
      _writeType(param.type);
      _writeByte(param.isRequired ? 1 : 0);
      _writeByte(param.isNamed ? 1 : 0);
      _writeByte(param.isOptional ? 1 : 0);
      _writeByte(param.defaultValue != null ? 1 : 0);
      if (param.defaultValue != null) {
        _writeExpression(param.defaultValue!);
      }
      _writeSourceLocation(param.sourceLocation);
    }
    _writeByte(expr.body != null ? 1 : 0);
    if (expr.body != null) {
      _writeExpression(expr.body!);
    }
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

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
    _writeByte(expr.isConst ? 1 : 0);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeMapLiteralExpression(MapExpressionIR expr) {
    _writeUint32(expr.entries.length);
    for (final entry in expr.entries) {
      _writeExpression(entry.key);
      _writeExpression(entry.value);
    }
    _writeByte(expr.isConst ? 1 : 0);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeSetExpression(SetExpressionIR expr) {
    _writeUint32(expr.elements.length);
    for (final elem in expr.elements) {
      _writeExpression(elem);
    }
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeThisExpression(ThisExpressionIR expr) {
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeSuperExpression(SuperExpressionIR expr) {
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  void _writeParenthesizedExpression(ParenthesizedExpressionIR expr) {
    _writeExpression(expr.innerExpression);
    _writeType(expr.resultType);
    _writeSourceLocation(expr.sourceLocation);
  }

  // =========================================================================
  // STATEMENT WRITING
  // =========================================================================

  void _writeStatement(StatementIR stmt) {
    if (stmt is ExpressionStmt) {
      _writeByte(BinaryConstants.STMT_EXPRESSION);
      _writeExpressionStatement(stmt);
    } else if (stmt is VariableDeclarationStmt) {
      _writeByte(BinaryConstants.STMT_VAR_DECL);
      _writeVariableDeclarationStatement(stmt);
    } else if (stmt is ReturnStmt) {
      _writeByte(BinaryConstants.STMT_RETURN);
      _writeReturnStatement(stmt);
    } else if (stmt is BreakStmt) {
      _writeByte(BinaryConstants.STMT_BREAK);
      _writeBreakStatement(stmt);
    } else if (stmt is ContinueStmt) {
      _writeByte(BinaryConstants.STMT_CONTINUE);
      _writeContinueStatement(stmt);
    } else if (stmt is ThrowStmt) {
      _writeByte(BinaryConstants.STMT_THROW);
      _writeThrowStatement(stmt);
    } else if (stmt is AssertStatementIR) {
      _writeByte(BinaryConstants.STMT_ASSERT);
      _writeAssertStatement(stmt);
    } else if (stmt is EmptyStatementIR) {
      _writeByte(BinaryConstants.STMT_EMPTY);
      _writeEmptyStatement(stmt);
    } else if (stmt is BlockStmt) {
      _writeByte(BinaryConstants.STMT_BLOCK);
      _writeBlockStatement(stmt);
    } else if (stmt is IfStmt) {
      _writeByte(BinaryConstants.STMT_IF);
      _writeIfStatement(stmt);
    } else if (stmt is ForStmt) {
      _writeByte(BinaryConstants.STMT_FOR);
      _writeForStatement(stmt);
    } else if (stmt is ForEachStmt) {
      _writeByte(BinaryConstants.STMT_FOR_EACH);
      _writeForEachStatement(stmt);
    } else if (stmt is WhileStmt) {
      _writeByte(BinaryConstants.STMT_WHILE);
      _writeWhileStatement(stmt);
    } else if (stmt is DoWhileStmt) {
      _writeByte(BinaryConstants.STMT_DO_WHILE);
      _writeDoWhileStatement(stmt);
    } else if (stmt is SwitchStmt) {
      _writeByte(BinaryConstants.STMT_SWITCH);
      _writeSwitchStatement(stmt);
    } else if (stmt is TryStmt) {
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

  void _writeExpressionStatement(ExpressionStmt stmt) {
    _writeExpression(stmt.expression);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeVariableDeclarationStatement(VariableDeclarationStmt stmt) {
    _writeUint32(_getStringRef(stmt.name));
    _writeByte(stmt.type != null ? 1 : 0);
    if (stmt.type != null) {
      _writeType(stmt.type!);
    }
    _writeByte(stmt.initializer != null ? 1 : 0);
    if (stmt.initializer != null) {
      _writeExpression(stmt.initializer!);
    }
    _writeByte(stmt.isFinal ? 1 : 0);
    _writeByte(stmt.isConst ? 1 : 0);
    _writeByte(stmt.isLate ? 1 : 0);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeReturnStatement(ReturnStmt stmt) {
    _writeByte(stmt.expression != null ? 1 : 0);
    if (stmt.expression != null) {
      _writeExpression(stmt.expression!);
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeBreakStatement(BreakStmt stmt) {
    _writeByte(stmt.label != null ? 1 : 0);
    if (stmt.label != null) {
      _writeUint32(_getStringRef(stmt.label!));
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeContinueStatement(ContinueStmt stmt) {
    _writeByte(stmt.label != null ? 1 : 0);
    if (stmt.label != null) {
      _writeUint32(_getStringRef(stmt.label!));
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeThrowStatement(ThrowStmt stmt) {
    _writeExpression(stmt.exceptionExpression);
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

  void _writeBlockStatement(BlockStmt stmt) {
    _writeUint32(stmt.statements.length);
    for (final s in stmt.statements) {
      _writeStatement(s);
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeIfStatement(IfStmt stmt) {
    _writeExpression(stmt.condition);
    _writeStatement(stmt.thenBranch);
    _writeByte(stmt.elseBranch != null ? 1 : 0);
    if (stmt.elseBranch != null) {
      _writeStatement(stmt.elseBranch!);
    }
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeForStatement(ForStmt stmt) {
    _writeByte(stmt.initialization != null ? 1 : 0);
    if (stmt.initialization != null) {
      if (stmt.initialization is VariableDeclarationStmt) {
        _writeByte(0);
        _writeVariableDeclarationStatement(
          stmt.initialization as VariableDeclarationStmt,
        );
      } else {
        _writeByte(1);
        _writeExpression(stmt.initialization as ExpressionIR);
      }
    }
    _writeByte(stmt.condition != null ? 1 : 0);
    if (stmt.condition != null) {
      _writeExpression(stmt.condition!);
    }
    _writeUint32(stmt.updaters.length);
    for (final update in stmt.updaters) {
      _writeExpression(update);
    }
    _writeStatement(stmt.body);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeForEachStatement(ForEachStmt stmt) {
    _writeUint32(_getStringRef(stmt.loopVariable));
    _writeByte(stmt.loopVariableType != null ? 1 : 0);
    if (stmt.loopVariableType != null) {
      _writeType(stmt.loopVariableType!);
    }
    _writeExpression(stmt.iterable);
    _writeStatement(stmt.body);
    _writeByte(stmt.isAsync ? 1 : 0);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeWhileStatement(WhileStmt stmt) {
    _writeExpression(stmt.condition);
    _writeStatement(stmt.body);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeDoWhileStatement(DoWhileStmt stmt) {
    _writeStatement(stmt.body);
    _writeExpression(stmt.condition);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeSwitchStatement(SwitchStmt stmt) {
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

  void _writeSwitchCase(SwitchCaseStmt switchCase) {
    _writeByte(switchCase.isDefault ? 1 : 0);
    _writeByte(switchCase.patterns != null ? 1 : 0);
    if (switchCase.patterns != null) {
      _writeUint32(switchCase.patterns!.length);
      for (final pattern in switchCase.patterns!) {
        _writeExpression(pattern);
      }
    }
    _writeUint32(switchCase.statements.length);
    for (final s in switchCase.statements) {
      _writeStatement(s);
    }
  }

  void _writeTryStatement(TryStmt stmt) {
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

  void _writeCatchClause(CatchClauseStmt catchClause) {
    _writeByte(catchClause.exceptionType != null ? 1 : 0);
    if (catchClause.exceptionType != null) {
      _writeType(catchClause.exceptionType!);
    }
    _writeByte(catchClause.exceptionParameter != null ? 1 : 0);
    if (catchClause.exceptionParameter != null) {
      _writeUint32(_getStringRef(catchClause.exceptionParameter!));
    }
    _writeByte(catchClause.stackTraceParameter != null ? 1 : 0);
    if (catchClause.stackTraceParameter != null) {
      _writeUint32(_getStringRef(catchClause.stackTraceParameter!));
    }
    _writeStatement(catchClause.body);
  }

  void _writeLabeledStatement(LabeledStatementIR stmt) {
    _writeUint32(_getStringRef(stmt.label));
    _writeStatement(stmt.statement);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeYieldStatement(YieldStatementIR stmt) {
    _writeExpression(stmt.value);
    _writeByte(stmt.isYieldEach ? 1 : 0);
    _writeSourceLocation(stmt.sourceLocation);
  }

  void _writeFunctionDeclarationStatement(FunctionDeclarationStatementIR stmt) {
    _writeFunctionDecl(stmt.function);
    _writeSourceLocation(stmt.sourceLocation);
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
  // VALIDATION (PRIORITY 2)
  // =========================================================================

  /// Enhanced validation before serialization
  List<String> _validateFileIR(DartFile fileIR) {
    final errors = <String>[];

    // Basic file validation
    if (fileIR.filePath.isEmpty) {
      errors.add('FileIR.filePath is empty');
    } else if (fileIR.filePath.length > BinaryConstants.MAX_STRING_LENGTH) {
      errors.add('File path too long: ${fileIR.filePath.length} bytes');
    }

    if (fileIR.contentHash.isEmpty) {
      errors.add('FileIR.contentHash is empty');
    }

    // Validate collections aren't too large
    if (fileIR.classDeclarations.length > BinaryConstants.MAX_ARRAY_COUNT) {
      errors.add('Too many classes: ${fileIR.classDeclarations.length}');
    }
    if (fileIR.functionDeclarations.length > BinaryConstants.MAX_ARRAY_COUNT) {
      errors.add('Too many functions: ${fileIR.functionDeclarations.length}');
    }
    if (fileIR.variableDeclarations.length > BinaryConstants.MAX_ARRAY_COUNT) {
      errors.add('Too many variables: ${fileIR.variableDeclarations.length}');
    }

    // Validate class declarations
    for (final classDecl in fileIR.classDeclarations) {
      if (classDecl.name.isEmpty) {
        errors.add('Class has empty name');
      } else if (classDecl.name.length > BinaryConstants.MAX_STRING_LENGTH) {
        errors.add('Class name too long: "${classDecl.name}"');
      }

      if (classDecl.fields.length > BinaryConstants.MAX_ARRAY_COUNT) {
        errors.add('Class ${classDecl.name} has too many fields');
      }
      if (classDecl.methods.length > BinaryConstants.MAX_ARRAY_COUNT) {
        errors.add('Class ${classDecl.name} has too many methods');
      }

      for (final field in classDecl.fields) {
        if (field.name.isEmpty) {
          errors.add('Field in class ${classDecl.name} has empty name');
        }
      }

      for (final method in classDecl.methods) {
        if (method.name.isEmpty) {
          errors.add('Method in class ${classDecl.name} has empty name');
        }
        if (method.parameters.length > BinaryConstants.MAX_ARRAY_COUNT) {
          errors.add(
            'Method ${classDecl.name}.${method.name} has too many parameters',
          );
        }
      }
    }

    // Validate function declarations
    for (final func in fileIR.functionDeclarations) {
      if (func.name.isEmpty) {
        errors.add('Function has empty name');
      } else if (func.name.length > BinaryConstants.MAX_STRING_LENGTH) {
        errors.add('Function name too long: "${func.name}"');
      }

      if (func.parameters.length > BinaryConstants.MAX_ARRAY_COUNT) {
        errors.add('Function ${func.name} has too many parameters');
      }
    }

    // Validate imports
    for (final import in fileIR.imports) {
      if (import.uri.isEmpty) {
        errors.add('Import has empty URI');
      }
      if (import.showList.length > BinaryConstants.MAX_ARRAY_COUNT) {
        errors.add('Import ${import.uri} has too many show items');
      }
    }

    return errors;
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
    print('\n=== DEBUG SERIALIZATION ===');

    print('\n1. Input validation:');
    print('   File path: "${fileIR.filePath}"');
    print('   Content hash: "${fileIR.contentHash}"');
    print('   Library: "${fileIR.library ?? '<unknown>'}"');
    print('   Imports: ${fileIR.imports.length}');
    print('   Exports: ${fileIR.exports.length}');
    print('   Variables: ${fileIR.variableDeclarations.length}');
    print('   Functions: ${fileIR.functionDeclarations.length}');
    print('   Classes: ${fileIR.classDeclarations.length}');

    // Check string collection
    print('\n2. Collecting strings...');
    final preCollectStrings = _stringTable.length;
    _collectStrings(fileIR);
    print('   String table size: ${_stringTable.length}');
    print('   Strings added: ${_stringTable.length - preCollectStrings}');

    // Show first and last few strings
    print('\n3. String table contents:');
    for (
      int i = 0;
      i < (_stringTable.length < 5 ? _stringTable.length : 5);
      i++
    ) {
      print('   [$i] "${_stringTable[i]}"');
    }
    if (_stringTable.length > 10) {
      print('   ...');
    }
    for (
      int i = (_stringTable.length > 5 ? _stringTable.length - 3 : 0);
      i < _stringTable.length;
      i++
    ) {
      if (i >= 5) {
        print('   [$i] "${_stringTable[i]}"');
      }
    }

    print('\n4. String deduplication stats:');
    print('   Unique strings: ${_stringTable.length}');
    print('   Max string index: ${_stringTable.length - 1}');

    print('\n5. Potential issues to check:');
    print('   ✓ Are string references within 0-${_stringTable.length - 1}?');
    print('   ✓ Check BinaryIRWriter._getStringRef() returns valid indices');
    print('   ✓ Verify string table size matches actual strings');

    print('\n=== END DEBUG ===\n');
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
