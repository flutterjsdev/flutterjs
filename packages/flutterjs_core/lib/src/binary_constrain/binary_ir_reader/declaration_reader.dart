import 'package:flutterjs_core/flutterjs_core.dart';

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
  ConstructorDecl readConstructorDecl() {
    final id = readStringRef();
    final constructorClass = readStringRef();

    final hasName = readByte() != 0;
    final constructorName = hasName ? readStringRef() : null;

    final isConst = readByte() != 0;
    final isFactory = readByte() != 0;

    final paramCount = readUint32();
    final parameters = <ParameterDecl>[];
    for (int i = 0; i < paramCount; i++) {
      parameters.add(readParameterDecl());
    }

    final sourceLocation = readSourceLocation();

    // ✅ NEW: Read constructor initializers
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

    // ✅ NEW: Read constructor body statements
    final hasBody = readByte() != 0;
    List<StatementIR>? body;
    if (hasBody) {
      final stmtCount = readUint32();
      body = <StatementIR>[];
      for (int i = 0; i < stmtCount; i++) {
        body.add(readStatement());
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
      body: body, // ✅ NOW INCLUDED
      initializers: initializers, // ✅ NOW INCLUDED
    );
  }
}