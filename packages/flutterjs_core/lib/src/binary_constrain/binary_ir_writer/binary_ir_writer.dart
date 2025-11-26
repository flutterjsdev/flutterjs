import 'dart:convert';
import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';
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

  void _writeFileIRData(DartFile fileIR) {
    try {
      _irDataStartOffset = _buffer.length;
      printlog('[WRITE FILE IR DATA] START');

      writeUint32(getStringRef(fileIR.filePath));
      writeUint32(getStringRef(fileIR.contentHash));
      writeUint32(getStringRef(fileIR.library ?? "<unknown>"));
      writeUint64(DateTime.now().millisecondsSinceEpoch);

      writeUint32(fileIR.imports.length);
      for (final import in fileIR.imports) {
        writeImportStmt(import);
      }

      writeUint32(fileIR.exports.length);
      for (final export in fileIR.exports) {
        writeExportStmt(export);
      }

      writeUint32(fileIR.variableDeclarations.length);
      for (final variable in fileIR.variableDeclarations) {
        writeVariableDecl(variable);
      }

      writeUint32(fileIR.functionDeclarations.length);
      for (final func in fileIR.functionDeclarations) {
        writeFunctionDecl(func);
      }

      // ✅ NEW DEBUG: Before writing classes
      printlog('\n[DEBUG] Before writing classes:');
      printlog('Classes to write: ${fileIR.classDeclarations.length}');
      printlog('String table size: ${_stringTable.length}');
      printlog('Valid indices: 0-${_stringTable.length - 1}');

      // ✅ VERIFY each class ID is in the string table
      for (int i = 0; i < fileIR.classDeclarations.length; i++) {
        final classDecl = fileIR.classDeclarations[i];

        if (!_stringIndices.containsKey(classDecl.id)) {
          printlog('\n❌ CLASS ID NOT IN STRING TABLE:');
          printlog('   Class: ${classDecl.name}');
          printlog('   ID: "${classDecl.id}"');
          printlog('   Problem: This ID was never added to string table!');

          throw SerializationException(
            'Class ID "${classDecl.id}" not in string table. '
            'This should have been collected in collectStringsFromClass(). '
            'String table has ${_stringTable.length} strings.',
            offset: _buffer.length,
            context: 'class_id_missing',
          );
        }

        final idx = _stringIndices[classDecl.id]!;
        printlog('[Class $i] ID index: $idx, name: ${classDecl.name}');
      }

      writeUint32(fileIR.classDeclarations.length);
      printlog('[WRITE FILE IR] After classCount: ${_buffer.length}');

      for (final classDecl in fileIR.classDeclarations) {
        writeClassDecl(classDecl);
      }
      printlog('[WRITE FILE IR] After classes: ${_buffer.length}');

      writeUint32(fileIR.analysisIssues.length);
      for (final issue in fileIR.analysisIssues) {
        writeAnalysisIssue(issue);
      }
      printlog('[WRITE FILE IR] After issues: ${_buffer.length}');
      printlog('[WRITE FILE IR DATA] END');
    } catch (e) {
      printlog('[WRITE FILE IR ERROR] $e');
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
  // ============================================================================
  // FUNCTION DECLARATION WRITER - CLEAN & SYNCHRONIZED
  // ============================================================================
  void writeFunctionDecl(FunctionDecl func) {
    printlog(
      '[WRITE FUNCTION] START - ${func.name} at offset ${buffer.length}',
    );

    // ========== SECTION 1: Basic Metadata ==========
    writeUint32(getStringRef(func.id));
    writeUint32(getStringRef(func.name));
    writeUint32(getStringRef(func.returnType.displayName()));

    // ========== SECTION 2: Documentation ==========
    writeByte(func.documentation != null ? 1 : 0);
    if (func.documentation != null) {
      writeUint32(getStringRef(func.documentation!));
    }

    // ========== SECTION 3: Type Parameters ==========
    writeUint32(func.typeParameters.length);
    for (final tp in func.typeParameters) {
      writeUint32(getStringRef(tp.name));
      writeByte(tp.bound != null ? 1 : 0);
      if (tp.bound != null) {
        writeType(tp.bound!);
      }
    }

    // ========== SECTION 4: Parameters ==========
    writeUint32(func.parameters.length);
    for (final param in func.parameters) {
      writeParameterDecl(param);
    }

    // ========== SECTION 5: Source Location ==========
    writeSourceLocation(func.sourceLocation);

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

      printlog('[WRITE FUNCTION] Constructor-specific data written');
    } else if (func is MethodDecl) {
      writeByte(2); // isMethod flag (2 instead of 1 to avoid confusion)

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

      printlog('[WRITE FUNCTION] Method-specific data written');
    } else {
      writeByte(0); // Regular function
    }

    // ========== SECTION 7: Function Body ==========
    writeByte(func.body != null ? 1 : 0);
    if (func.body != null) {
      writeUint32(func.body!.length);
      for (final stmt in func.body!) {
        writeStatement(stmt);
      }
      printlog(
        '[WRITE FUNCTION] Body statements written: ${func.body!.length}',
      );
    }

    printlog('[WRITE FUNCTION] END - ${func.name} at offset ${buffer.length}');
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

  @override
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

      // ✅ MUST collect from method body
      if (method.body != null) {
        collectStringsFromStatements(method.body!);
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

      // ✅ MUST collect from constructor body
      if (constructor.body != null) {
        collectStringsFromStatements(constructor.body!);
      }
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

      if (func.superCall != null) {
        for (final arg in func.superCall!.arguments) {
          collectStringsFromExpression(arg);
        }
        for (final arg in func.superCall!.namedArguments.values) {
          collectStringsFromExpression(arg);
        }
      }

      if (func.redirectedCall != null) {
        for (final arg in func.redirectedCall!.arguments) {
          collectStringsFromExpression(arg);
        }
        for (final arg in func.redirectedCall!.namedArguments.values) {
          collectStringsFromExpression(arg);
        }
      }

      if (func.body != null) {
        collectStringsFromStatements(func.body!);
      }
    }

    if (func is MethodDecl) {
      if (func.className != null) {
        addString(func.className!);
      }
      if (func.overriddenSignature != null) {
        addString(func.overriddenSignature!);
      }
      if (func.body != null) {
        collectStringsFromStatements(func.body!);
      }
    }
    if (func.body != null && func is! ConstructorDecl && func is! MethodDecl) {
      collectStringsFromStatements(func.body!);
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
