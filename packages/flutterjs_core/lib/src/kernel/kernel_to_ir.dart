// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/// Converts Dart Kernel IR (.dill files) to FlutterJS IR
///
/// This provides a bridge between Dart's official CFE (Common Front-End)
/// and our custom code generation pipeline. By using kernel compilation,
/// we get perfect type resolution, null safety guarantees, and all imports
/// pre-resolved - without having to implement our own type inference.
///
/// Flow:
/// 1. dart compile kernel → .dill file (Kernel IR)
/// 2. Load .dill → kernel.Component
/// 3. Parse kernel.Component → DartFile IR (this file)
/// 4. Generate JavaScript from DartFile IR (existing pipeline)
///
/// Benefits:
/// - Perfect type information from Dart's own compiler
/// - Constant folding already done
/// - Conditional imports resolved
/// - Null safety enforced
/// - Can cache .dill files (packages are immutable)
library;

// TODO: Add kernel dependencies to pubspec.yaml
// For now, this is a stub implementation that will be completed
// when we add the kernel package dependency

/// Stub for kernel.Component until we add the dependency
class Component {
  List<Library> get libraries => [];
}

/// Stub for kernel.Library
class Library {
  Uri get importUri => Uri.parse('package:stub');
  Uri get fileUri => Uri.parse('file:///stub.dart');
  List<LibraryDependency> get dependencies => [];
  List<Reference> get additionalExports => [];
  List<Class> get classes => [];
  List<Procedure> get procedures => [];
  List<Field> get fields => [];
}

/// Stub for kernel.LibraryDependency
class LibraryDependency {
  Library get targetLibrary => Library();
  String? get name => null;
  bool get isDeferred => false;
  List<Combinator> get combinators => [];
}

/// Stub for kernel.Combinator
class Combinator {
  bool get isShow => true;
  List<String> get names => [];
}

/// Stub for kernel.Reference
class Reference {
  String get canonicalName => '';
}

/// Stub for kernel.Class
class Class {
  String get name => '';
  Class? get superclass => null;
  List<Supertype> get implementedTypes => [];
  List<TypeParameter> get typeParameters => [];
  List<Field> get fields => [];
  List<Procedure> get procedures => [];
  List<Constructor> get constructors => [];
}

/// Stub for kernel.Supertype
class Supertype {
  Class get classNode => Class();
}

/// Stub for kernel.TypeParameter
class TypeParameter {
  String get name => '';
}

/// Stub for kernel.Field
class Field {
  String get name => '';
  DartType get type => DartType();
  Expression? get initializer => null;
  bool get isStatic => false;
  bool get isFinal => false;
  bool get isConst => false;
}

/// Stub for kernel.Procedure
class Procedure {
  String get name => '';
  FunctionNode get function => FunctionNode();
  bool get isStatic => false;
  bool get isAbstract => false;
  ProcedureKind get kind => ProcedureKind.method;
}

/// Stub for kernel.ProcedureKind
enum ProcedureKind {
  method,
  getter,
  setter,
  operator,
}

/// Stub for kernel.Constructor
class Constructor {
  String get name => '';
  FunctionNode get function => FunctionNode();
}

/// Stub for kernel.FunctionNode
class FunctionNode {
  List<VariableDeclaration> get positionalParameters => [];
  List<VariableDeclaration> get namedParameters => [];
  DartType get returnType => DartType();
  Statement? get body => null;
}

/// Stub for kernel.VariableDeclaration
class VariableDeclaration {
  String get name => '';
  DartType get type => DartType();
  Expression? get initializer => null;
}

/// Stub for kernel.DartType
class DartType {
  @override
  String toString() => 'dynamic';
}

/// Stub for kernel.Expression
class Expression {}

/// Stub for kernel.Statement
class Statement {}

/// Converts Kernel IR to FlutterJS DartFile IR
class KernelToIRConverter {
  /// Convert a kernel library to DartFile IR
  ///
  /// This is the main entry point. Given a kernel library from a .dill file,
  /// this converts it to our DartFile IR which can then be passed to the
  /// JavaScript code generator.
  ///
  /// Example:
  /// ```dart
  /// final compiler = KernelCompiler();
  /// final component = await compiler.loadKernel('package.dill');
  /// final library = component.libraries.first;
  ///
  /// final converter = KernelToIRConverter();
  /// final dartFile = converter.convertLibrary(library);
  /// ```
  Future<DartFileStub> convertLibrary(Library library) async {
    return DartFileStub(
      filePath: library.fileUri.toFilePath(),
      libraryUri: library.importUri.toString(),
      imports: _convertImports(library.dependencies),
      exports: _convertExports(library.additionalExports),
      classes: _convertClasses(library.classes),
      functions: _convertProcedures(library.procedures),
      variables: _convertFields(library.fields),
    );
  }

  List<ImportStub> _convertImports(List<LibraryDependency> deps) {
    return deps.map((dep) {
      return ImportStub(
        uri: dep.targetLibrary.importUri.toString(),
        prefix: dep.name,
        isDeferred: dep.isDeferred,
        showList: _extractShowCombinators(dep.combinators),
        hideList: _extractHideCombinators(dep.combinators),
      );
    }).toList();
  }

  List<String> _extractShowCombinators(List<Combinator> combinators) {
    return combinators
        .where((c) => c.isShow)
        .expand((c) => c.names)
        .toList();
  }

  List<String> _extractHideCombinators(List<Combinator> combinators) {
    return combinators
        .where((c) => !c.isShow)
        .expand((c) => c.names)
        .toList();
  }

  List<ExportStub> _convertExports(List<Reference> exports) {
    return exports.map((ref) {
      return ExportStub(
        uri: ref.canonicalName,
      );
    }).toList();
  }

  List<ClassStub> _convertClasses(List<Class> classes) {
    return classes.map((cls) {
      return ClassStub(
        name: cls.name,
        superclass: cls.superclass?.name,
        implementsList: cls.implementedTypes
            .map((t) => t.classNode.name)
            .toList(),
        typeParameters: cls.typeParameters
            .map((t) => t.name)
            .toList(),
        fields: _convertClassFields(cls.fields),
        methods: _convertProcedures(cls.procedures),
        constructors: _convertConstructors(cls.constructors),
      );
    }).toList();
  }

  List<FieldStub> _convertClassFields(List<Field> fields) {
    return fields.map((field) {
      return FieldStub(
        name: field.name,
        type: field.type.toString(),
        isStatic: field.isStatic,
        isFinal: field.isFinal,
        isConst: field.isConst,
        hasInitializer: field.initializer != null,
      );
    }).toList();
  }

  List<MethodStub> _convertProcedures(List<Procedure> procedures) {
    return procedures.map((proc) {
      return MethodStub(
        name: proc.name,
        isStatic: proc.isStatic,
        isAbstract: proc.isAbstract,
        isGetter: proc.kind == ProcedureKind.getter,
        isSetter: proc.kind == ProcedureKind.setter,
        isOperator: proc.kind == ProcedureKind.operator,
        returnType: proc.function.returnType.toString(),
        parameters: _convertParameters(proc.function),
      );
    }).toList();
  }

  List<ParameterStub> _convertParameters(FunctionNode function) {
    final params = <ParameterStub>[];

    // Positional parameters
    for (final param in function.positionalParameters) {
      params.add(ParameterStub(
        name: param.name,
        type: param.type.toString(),
        isNamed: false,
        hasDefaultValue: param.initializer != null,
      ));
    }

    // Named parameters
    for (final param in function.namedParameters) {
      params.add(ParameterStub(
        name: param.name,
        type: param.type.toString(),
        isNamed: true,
        hasDefaultValue: param.initializer != null,
      ));
    }

    return params;
  }

  List<ConstructorStub> _convertConstructors(List<Constructor> constructors) {
    return constructors.map((ctor) {
      return ConstructorStub(
        name: ctor.name,
        parameters: _convertParameters(ctor.function),
      );
    }).toList();
  }

  List<FieldStub> _convertFields(List<Field> fields) {
    return fields.map((field) {
      return FieldStub(
        name: field.name,
        type: field.type.toString(),
        isStatic: field.isStatic,
        isFinal: field.isFinal,
        isConst: field.isConst,
        hasInitializer: field.initializer != null,
      );
    }).toList();
  }
}

// =============================================================================
// STUB DATA STRUCTURES
// These will be replaced with actual DartFile IR once kernel dependency is added
// =============================================================================

class DartFileStub {
  final String filePath;
  final String libraryUri;
  final List<ImportStub> imports;
  final List<ExportStub> exports;
  final List<ClassStub> classes;
  final List<MethodStub> functions;
  final List<FieldStub> variables;

  DartFileStub({
    required this.filePath,
    required this.libraryUri,
    required this.imports,
    required this.exports,
    required this.classes,
    required this.functions,
    required this.variables,
  });
}

class ImportStub {
  final String uri;
  final String? prefix;
  final bool isDeferred;
  final List<String> showList;
  final List<String> hideList;

  ImportStub({
    required this.uri,
    this.prefix,
    this.isDeferred = false,
    this.showList = const [],
    this.hideList = const [],
  });
}

class ExportStub {
  final String uri;

  ExportStub({required this.uri});
}

class ClassStub {
  final String name;
  final String? superclass;
  final List<String> implementsList;
  final List<String> typeParameters;
  final List<FieldStub> fields;
  final List<MethodStub> methods;
  final List<ConstructorStub> constructors;

  ClassStub({
    required this.name,
    this.superclass,
    this.implementsList = const [],
    this.typeParameters = const [],
    this.fields = const [],
    this.methods = const [],
    this.constructors = const [],
  });
}

class MethodStub {
  final String name;
  final bool isStatic;
  final bool isAbstract;
  final bool isGetter;
  final bool isSetter;
  final bool isOperator;
  final String returnType;
  final List<ParameterStub> parameters;

  MethodStub({
    required this.name,
    this.isStatic = false,
    this.isAbstract = false,
    this.isGetter = false,
    this.isSetter = false,
    this.isOperator = false,
    this.returnType = 'dynamic',
    this.parameters = const [],
  });
}

class FieldStub {
  final String name;
  final String type;
  final bool isStatic;
  final bool isFinal;
  final bool isConst;
  final bool hasInitializer;

  FieldStub({
    required this.name,
    this.type = 'dynamic',
    this.isStatic = false,
    this.isFinal = false,
    this.isConst = false,
    this.hasInitializer = false,
  });
}

class ConstructorStub {
  final String name;
  final List<ParameterStub> parameters;

  ConstructorStub({
    required this.name,
    this.parameters = const [],
  });
}

class ParameterStub {
  final String name;
  final String type;
  final bool isNamed;
  final bool hasDefaultValue;

  ParameterStub({
    required this.name,
    this.type = 'dynamic',
    this.isNamed = false,
    this.hasDefaultValue = false,
  });
}
