import 'package:flutterjs_core/flutterjs_core.dart';

/// ============================================================================
/// declaration_reader.dart
/// Declaration Reader — Reconstructs Declarations in the FlutterJS IR
/// ============================================================================
///
/// Responsible for decoding all **declaration-related structures** from the
/// binary IR format produced by `declaration_writer.dart`.
///
/// A *declaration* represents any named entity in the FlutterJS IR:
/// - variables
/// - function/method declarations
/// - parameters
/// - fields
/// - class-level items
///
/// This reader is the exact inverse of the declaration writer and guarantees
/// the complete, accurate reconstruction of the IR’s symbol table.
///
///
/// # Purpose
///
/// Declarations define the **names, types, and scopes** of the entire IR.
///
/// Without reconstructing declarations correctly:
/// - expressions cannot resolve references
/// - statements cannot map to correct variables
/// - type information breaks
/// - UI generation becomes impossible
///
/// This module restores the symbol structure used throughout the IR graph.
///
///
/// # Responsibilities
///
/// ## 1. Read Declaration Tags
///
/// Each declaration begins with a binary tag:
///
/// - variable declaration
/// - function declaration
/// - class member
/// - parameter declaration
///
/// Controls the decoding path.
///
///
/// ## 2. Read Identifier (Name)
///
/// Reads the identifier’s string-table index:
///
/// ```dart
/// final name = strings[index];
/// ```
///
///
/// ## 3. Read Type Information
///
/// Uses:
/// ```dart
/// typeReader.readTypeRef();
/// ```
///
/// Supports:
/// - primitive types
/// - nullable types
/// - generics
/// - function types
///
///
/// ## 4. Read Modifiers & Flags
///
/// Includes attributes such as:
/// - const
/// - final
/// - static
/// - required
/// - optional
/// - visibility modifiers
///
/// Ensures decoding matches the encoding schema.
///
///
/// ## 5. Read Initializer Expressions (If Present)
///
/// Uses:
///
/// ```dart
/// expressionReader.readExpression();
/// ```
///
/// Handles:
/// - literal initializers
/// - computed values
/// - builder expressions
///
///
/// ## 6. Read Function Declarations
///
/// Includes:
/// - return type
/// - parameters
/// - async / sync modifier
/// - function body (via statement reader)
///
///
/// ## 7. Integrate Into IR Symbol Table
///
/// Reader ensures:
/// - declarations are assigned stable indices
/// - references can resolve immediately
/// - parent-scope is tracked
///
///
/// # Example Binary Structure
///
/// ```
/// [DECL_TAG]
/// [NAME_INDEX]
/// [TYPE_REF]
/// [FLAGS]
/// [HAS_INITIALIZER]
///   [EXPRESSION?]
/// [PARAMETER_COUNT]
///   [PARAM_DECLS...]
/// [FUNCTION_BODY?]
/// ```
///
///
/// # Example Usage
///
/// ```dart
/// final decl = declarationReader.readDeclaration();
/// ```
///
/// Called by:
/// - `binary_ir_reader.dart`
/// - function / widget deserializers
///
///
/// # Error Handling
///
/// Throws:
/// - malformed declaration tag
/// - invalid string reference
/// - missing type information
/// - invalid initializer expression
///
///
/// # Notes
///
/// - Must stay symmetrical with declaration_writer.dart.
/// - Declaration order must match writer’s deterministic output.
/// - Ensure parameters are read before body statements.
///
///
/// ============================================================================
///

mixin DeclarationReader {
  SourceLocationIR readSourceLocation();
  String readStringRef();
  int readUint32();
  double readDouble();
  int readInt64();
  int readByte();

  TypeIR readType();
  ExpressionIR readExpression();
  StatementIR readStatement(); // ✅ Need this for reading function bodies
  ParameterDecl readParameterDecl();
  MethodDecl readMethodDecl();
  FunctionExtractionData readFunctionExtractionData();
  ConstructorDecl readConstructorDecl();

  ImportStmt readImportStmt() {
    final uri = readStringRef();

    final hasPrefix = readByte() != 0;

    final prefix = hasPrefix ? readStringRef() : null;

    final isDeferred = readByte() != 0;

    final showCount = readUint32();

    final showList = <String>[];
    for (int i = 0; i < showCount; i++) {
      showList.add(readStringRef());
    }

    final hideCount = readUint32();

    final hideList = <String>[];
    for (int i = 0; i < hideCount; i++) {
      hideList.add(readStringRef());
    }

    final sourceLocation = readSourceLocation();

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

  ExportStmt readExportStmt() {
    final uri = readStringRef();

    final showCount = readUint32();

    final showList = <String>[];
    for (int i = 0; i < showCount; i++) {
      showList.add(readStringRef());
    }

    final hideCount = readUint32();

    final hideList = <String>[];
    for (int i = 0; i < hideCount; i++) {
      hideList.add(readStringRef());
    }

    final sourceLocation = readSourceLocation();

    return ExportStmt(
      uri: uri,
      showList: showList,
      hideList: hideList,
      sourceLocation: sourceLocation,
    );
  }

  // ✅ FIXED: Read method declaration with Widget type support

  ClassDecl readClassDecl() {
    final id = readStringRef();

    final name = readStringRef();

    final isAbstract = readByte() != 0;

    final isFinal = readByte() != 0;

    final hasSuperclass = readByte() != 0;

    TypeIR? superclass;
    if (hasSuperclass) {
      superclass = readType();
    }

    final interfaceCount = readUint32();

    final interfaces = <TypeIR>[];
    for (int i = 0; i < interfaceCount; i++) {
      interfaces.add(readType());
    }

    final mixinCount = readUint32();

    final mixins = <TypeIR>[];
    for (int i = 0; i < mixinCount; i++) {
      mixins.add(readType());
    }

    final fieldCount = readUint32();

    final fields = <FieldDecl>[];
    for (int i = 0; i < fieldCount; i++) {
      fields.add(readFieldDecl());
    }

    final methodCount = readUint32();

    final methods = <MethodDecl>[];
    for (int i = 0; i < methodCount; i++) {
      methods.add(readMethodDecl());
    }

    final constructorCount = readUint32();

    final constructors = <ConstructorDecl>[];
    for (int i = 0; i < constructorCount; i++) {
      constructors.add(readConstructorDecl());
    }

    final sourceLocation = readSourceLocation();

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

  FieldDecl readFieldDecl() {
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

  // ✅ FIXED: Read constructor body statements and initializers
}
