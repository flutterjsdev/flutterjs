// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// PHASE 2.4: CLASS CODE GENERATOR
// ============================================================================
// Converts all Dart class IR types to JavaScript code
// Handles inheritance, fields, methods, constructors, static members, getters/setters
// ============================================================================
import 'package:flutterjs_core/ast_it.dart';
import 'package:flutterjs_gen/src/widget_generation/prop_conversion/flutter_prop_converters.dart';
import 'package:flutterjs_gen/src/utils/code_gen_error.dart';
import '../expression/expression_code_generator.dart';
import '../function/function_code_generator.dart';
import '../parameter/parameter_code_gen.dart';
import '../statement/statement_code_generator.dart';
import '../../utils/indenter.dart';

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for class code generation
class ClassGenConfig {
  /// Whether to generate field initializers in constructor
  final bool generateFieldInitializers;

  /// Whether to use TypeScript-like field type hints in comments
  final bool useTypeComments;

  /// Indentation string
  final String indent;

  /// Whether to generate getters/setters for private fields
  final bool generatePropertyAccessors;

  const ClassGenConfig({
    this.generateFieldInitializers = true,
    this.useTypeComments = false,
    this.indent = '  ',
    this.generatePropertyAccessors = false,
  });
}

// ============================================================================
// MAIN CLASS CODE GENERATOR
// ============================================================================

class ClassCodeGen {
  final ClassGenConfig config;
  final ExpressionCodeGen exprGen;
  final StatementCodeGen stmtGen;
  final FunctionCodeGen funcGen; // ✅ USE THIS FOR METHODS & CONSTRUCTORS
  late Indenter indenter;
  final List<CodeGenError> errors = [];
  final List<CodeGenWarning> warnings = [];
  final FlutterPropConverter propConverter;
  final ParameterCodeGen paramGen; // ✅ ADD THIS

  ClassCodeGen({
    ClassGenConfig? config,
    ExpressionCodeGen? exprGen,
    StatementCodeGen? stmtGen,
    FunctionCodeGen? funcGen,
    ParameterCodeGen? paramGen, // ✅ ADD THIS
    FlutterPropConverter? propConverter,
  }) : exprGen = exprGen ?? ExpressionCodeGen(),
       stmtGen = stmtGen ?? StatementCodeGen(),
       funcGen = funcGen ?? FunctionCodeGen(),
       propConverter = propConverter ?? FlutterPropConverter(exprGen: exprGen),
       config = config ?? const ClassGenConfig(),
       paramGen = paramGen ?? ParameterCodeGen(exprGen: exprGen) {
    indenter = Indenter(this.config.indent);
  }

  /// Generate JavaScript code from a class declaration
  String generate(ClassDecl cls) {
    try {
      return _generateClass(cls);
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate class ${cls.name}: $e',
        expressionType: cls.runtimeType.toString(),
        suggestion: 'Check if all class features are supported',
      );
      errors.add(error);
      rethrow;
    }
  }

  // =========================================================================
  // CLASS GENERATION
  // =========================================================================

  String _generateClass(ClassDecl cls) {
    final buffer = StringBuffer();

    // Class header
    buffer.write(_generateClassHeader(cls));
    buffer.writeln(' {');

    // ✅ Set class context for function generation
    funcGen.setClassContext(cls);

    indenter.indent();

    // Fields (as class properties)
    if (cls.instanceFields.isNotEmpty) {
      _generateFieldDeclarations(buffer, cls);
      buffer.writeln();
    }

    // ✅ Check if there's a primary constructor (generative unnamed)
    final hasPrimaryConstructor = cls.constructors.any(
      (ctor) => !ctor.isFactory && ctor.constructorName == null,
    );

    if (!hasPrimaryConstructor) {
      // Generate a default constructor that calls super() if needed
      buffer.writeln(indenter.apply('constructor() {'));
      indenter.indent();
      if (cls.superclass != null) {
        buffer.writeln(indenter.line('super();'));
      } else {
        buffer.writeln(indenter.line('// No superclass'));
      }
      indenter.dedent();
      buffer.writeln(indenter.apply('}'));
      buffer.writeln();
    }

    // ✅ FIXED: Use FunctionCodeGen for constructors
    if (cls.constructors.isNotEmpty) {
      for (int i = 0; i < cls.constructors.length; i++) {
        final ctorCode = funcGen.generateConstructor(
          cls.constructors[i],
          cls.name,
          hasSuperclass: cls.superclass != null,
        );
        buffer.writeln(indenter.apply(ctorCode));
        if (i < cls.constructors.length - 1) {
          buffer.writeln();
        }
      }
      buffer.writeln();
    }

    // ✅ FIXED: Use FunctionCodeGen for instance methods
    if (cls.instanceMethods.isNotEmpty) {
      for (int i = 0; i < cls.instanceMethods.length; i++) {
        final methodCode = funcGen.generateMethod(
          cls.instanceMethods[i],
          isStatic: false,
        );
        buffer.writeln(indenter.apply(methodCode));
        if (i < cls.instanceMethods.length - 1) {
          buffer.writeln();
        }
      }
      buffer.writeln();
    }

    // Static fields
    if (cls.staticFields.isNotEmpty) {
      _generateStaticFieldDeclarations(buffer, cls);
      buffer.writeln();
    }

    // ✅ FIXED: Use FunctionCodeGen for static methods
    if (cls.staticMethods.isNotEmpty) {
      for (int i = 0; i < cls.staticMethods.length; i++) {
        final methodCode = funcGen.generateMethod(
          cls.staticMethods[i],
          isStatic: true,
        );
        buffer.writeln(indenter.apply(methodCode));
        if (i < cls.staticMethods.length - 1) {
          buffer.writeln();
        }
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }
  // =========================================================================
  // CLASS HEADER
  // =========================================================================

  String _generateClassHeader(ClassDecl cls) {
    final buffer = StringBuffer();

    buffer.write('class ${cls.name}');

    // ✅ REMOVED: Type parameters - not valid JavaScript syntax
    // TypeScript-style generics like <T> are not valid in plain JS
    // if (cls.typeParameters.isNotEmpty) {
    //   final typeParams = cls.typeParameters.map((t) => t.name).join(', ');
    //   buffer.write('<$typeParams>');
    // }

    // Inheritance - ✅ Strip generic type parameters from superclass
    if (cls.superclass != null) {
      final superclassName = cls.superclass!.displayName();
      // Remove generic type arguments: State<MyHomePage> -> State
      final baseClassName = superclassName.contains('<')
          ? superclassName.substring(0, superclassName.indexOf('<'))
          : superclassName;
      buffer.write(' extends $baseClassName');
    }

    // NOTE: JS does not support 'implements' or 'with'.
    // Interfaces are purely build-time in Dart.
    // Mixins need a runtime helper (e.g. applyMixin), but for now we strip the syntax to avoid crashes.
    // Future: Implement mixin application logic.

    return buffer.toString();
  }
  // =========================================================================
  // FIELD DECLARATIONS
  // =========================================================================

  void _generateFieldDeclarations(StringBuffer buffer, ClassDecl cls) {
    for (final field in cls.instanceFields) {
      _generateFieldDeclaration(buffer, field, isStatic: false);
    }
  }

  void _generateStaticFieldDeclarations(StringBuffer buffer, ClassDecl cls) {
    for (final field in cls.staticFields) {
      _generateFieldDeclaration(buffer, field, isStatic: true);
    }
  }

  void _generateFieldDeclaration(
    StringBuffer buffer,
    FieldDecl field, {
    bool isStatic = false,
  }) {
    final staticKeyword = isStatic ? 'static ' : '';
    final typeComment = config.useTypeComments
        ? ' // ${field.type.displayName()}'
        : '';

    final safeName = exprGen.safeIdentifier(field.name);
    String declaration = '$staticKeyword$safeName';

    if (field.initializer != null) {
      final result = propConverter.convertProperty(
        field.name,
        field.initializer!,
        field.type.displayName(),
      );
      declaration += ' = ${result.code}';
    } else if (field.isFinal || field.isConst) {
      declaration += ' = null';
    } else {
      declaration += ' = null';
    }

    buffer.writeln(indenter.line('$declaration;$typeComment'));
  }
}
