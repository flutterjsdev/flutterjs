// ============================================================================
// PHASE 2.4: CLASS CODE GENERATOR
// ============================================================================
// Converts all Dart class IR types to JavaScript code
// Handles inheritance, fields, methods, constructors, static members, getters/setters
// ============================================================================

import 'package:collection/collection.dart';
import 'package:flutterjs_core/ast_it.dart';
import 'package:flutterjs_core/src/flutter_to_js/src/flutter_prop_converters.dart';
import 'package:flutterjs_core/src/flutter_to_js/src/utils/code_gen_error.dart';
import 'expression_code_generator.dart';
import 'function_code_generator.dart';
import 'statement_code_generator.dart';
import 'utils/indenter.dart';

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
  final FunctionCodeGen funcGen;
  late Indenter indenter;
  final List<CodeGenError> errors = [];
  final List<CodeGenWarning> warnings = [];
  final FlutterPropConverter propConverter;

  ClassCodeGen({
    ClassGenConfig? config,
    ExpressionCodeGen? exprGen,
    StatementCodeGen? stmtGen,
    FunctionCodeGen? funcGen,
    FlutterPropConverter? propConverter,
  }) : propConverter = propConverter ?? FlutterPropConverter(),
       config = config ?? const ClassGenConfig(),
       exprGen = exprGen ?? ExpressionCodeGen(),
       stmtGen = stmtGen ?? StatementCodeGen(),
       funcGen = funcGen ?? FunctionCodeGen() {
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

    indenter.indent();

    // Fields (as class properties)
    if (cls.instanceFields.isNotEmpty) {
      _generateFieldDeclarations(buffer, cls);
      buffer.writeln();
    }

    // Constructor(s)
    if (cls.constructors.isNotEmpty) {
      for (int i = 0; i < cls.constructors.length; i++) {
        buffer.writeln(_generateConstructor(cls.constructors[i], cls));
        if (i < cls.constructors.length - 1) {
          buffer.writeln();
        }
      }
      buffer.writeln();
    }

    // Instance methods
    if (cls.instanceMethods.isNotEmpty) {
      for (int i = 0; i < cls.instanceMethods.length; i++) {
        buffer.writeln(_generateMethod(cls.instanceMethods[i]));
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

    // Static methods
    if (cls.staticMethods.isNotEmpty) {
      for (int i = 0; i < cls.staticMethods.length; i++) {
        buffer.writeln(_generateStaticMethod(cls.staticMethods[i]));
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

    // Class keyword with modifiers
    if (cls.isAbstract) {
      buffer.write('abstract ');
    }

    buffer.write('class ${cls.name}');

    // Type parameters if any
    if (cls.typeParameters.isNotEmpty) {
      final typeParams = cls.typeParameters.map((t) => t.name).join(', ');
      buffer.write('<$typeParams>');
    }

    // Inheritance
    if (cls.superclass != null) {
      buffer.write(' extends ${cls.superclass!.displayName()}');
    }

    // Interfaces
    if (cls.interfaces.isNotEmpty) {
      final interfaces = cls.interfaces.map((i) => i.displayName()).join(', ');
      buffer.write(' implements $interfaces');
    }

    // Mixins
    if (cls.mixins.isNotEmpty) {
      final mixins = cls.mixins.map((m) => m.displayName()).join(', ');
      buffer.write(' with $mixins');
    }

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

    String declaration = '$staticKeyword${field.name}';

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

  // =========================================================================
  // CONSTRUCTOR GENERATION
  // =========================================================================

  String _generateConstructor(ConstructorDecl ctor, ClassDecl cls) {
    try {
      final buffer = StringBuffer();

      // Constructor name (named or default)
      String constructorName = 'constructor';
      if (ctor.constructorName != null && ctor.constructorName!.isNotEmpty) {
        constructorName = 'constructor_${ctor.constructorName}';
      }

      // Parameters
      final params = _generateParameterList(ctor.parameters);

      buffer.writeln(indenter.line('$constructorName($params) {'));
      indenter.indent();

      // Super call if extends another class
      if (cls.superclass != null) {
        buffer.writeln(indenter.line('super();'));
      }

      // Field assignments from parameters
      if (config.generateFieldInitializers) {
        for (final param in ctor.parameters) {
          final field = cls.instanceFields.firstWhereOrNull(
            (f) => f.name == param.name,
          );
          if (field != null) {
            buffer.writeln(
              indenter.line('this.${param.name} = ${param.name};'),
            );
          }
        }
      }

      // Handle field initializer list (e.g., Point.origin() : x = 0, y = 0)
      if (ctor.initializers != null && ctor.initializers.isNotEmpty) {
        for (final initializer in ctor.initializers) {
          try {
            // Initializer is typically: fieldName = expression
            final fieldName = initializer.fieldName;
            final expr = exprGen.generate(
              initializer.value,
              parenthesize: false,
            );
            buffer.writeln(indenter.line('this.$fieldName = $expr;'));
          } catch (e) {
            warnings.add(
              CodeGenWarning(
                severity: WarningSeverity.warning,
                message: 'Could not generate initializer: $e',
                suggestion: 'Check initializer expression in constructor',
              ),
            );
            buffer.writeln(
              indenter.line('/* TODO: Initializer failed - $e */'),
            );
          }
        }
      }

      if (ctor.body != null && ctor.body!.isNotEmpty) {
        try {
          // body is already a List<StatementIR>
          for (final stmt in ctor.body!) {
            try {
              final stmtCode = stmtGen.generate(stmt);
              buffer.writeln(stmtCode);
            } catch (e) {
              warnings.add(
                CodeGenWarning(
                  severity: WarningSeverity.warning,
                  message: 'Could not generate constructor statement: $e',
                  suggestion: 'Check statement structure in constructor body',
                ),
              );
              buffer.writeln(
                indenter.line('/* TODO: Statement failed - $e */'),
              );
            }
          }
        } catch (e) {
          warnings.add(
            CodeGenWarning(
              severity: WarningSeverity.warning,
              message: 'Could not generate constructor body: $e',
              suggestion: 'Check constructor body structure',
            ),
          );
          buffer.writeln(
            indenter.line('/* Constructor body generation failed */'),
          );
        }
      }
      indenter.dedent();
      buffer.write(indenter.line('}'));

      return buffer.toString().trim();
    } catch (e) {
      // Outer error handling
      errors.add(
        CodeGenError(
          message: 'Critical error generating constructor: $e',
          expressionType: ctor.runtimeType.toString(),
          suggestion: 'Check constructor declaration structure',
        ),
      );
      // Return minimal fallback
      return indenter.line(
        'constructor() { /* Constructor generation failed */ }',
      );
    }
  }

  // =========================================================================
  // METHOD GENERATION
  // =========================================================================

  String _generateMethod(MethodDecl method) {
    final buffer = StringBuffer();

    // Modifiers
    if (method.isAbstract) {
      return indenter.line(
        '// abstract ${method.name}(${_generateParameterList(method.parameters)});',
      );
    }

    if (method.isAsync && method.isGenerator) {
      buffer.write('async* ');
    } else if (method.isAsync) {
      buffer.write('async ');
    } else if (method.isGenerator) {
      buffer.write('* ');
    }

    // Getter/Setter
    if (method.isGetter) {
      buffer.write('get ');
    } else if (method.isSetter) {
      buffer.write('set ');
    }

    // Method name and parameters
    final params = _generateParameterList(method.parameters);
    buffer.writeln('${method.name}($params) {');

    indenter.indent();

    // ✅ FIXED: body is now List<StatementIR>?
    if (method.body != null && method.body!.isNotEmpty) {
      for (final stmt in method.body!) {
        buffer.writeln(stmtGen.generate(stmt));
      }
    } else {
      buffer.writeln(indenter.line('// TODO: Implement ${method.name}'));
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));
    return buffer.toString().trim();
  }

  String _generateStaticMethod(MethodDecl method) {
    final buffer = StringBuffer();

    buffer.write('static ');

    // Async/Generator modifiers
    if (method.isAsync && method.isGenerator) {
      buffer.write('async* ');
    } else if (method.isAsync) {
      buffer.write('async ');
    } else if (method.isGenerator) {
      buffer.write('* ');
    }

    // Method name and parameters
    final params = _generateParameterList(method.parameters);
    buffer.writeln('${method.name}($params) {');

    indenter.indent();

    // ✅ FIXED: body is now List<StatementIR>? - iterate directly
    if (method.body != null && method.body!.isNotEmpty) {
      // body is already a List<StatementIR> - no type casting needed
      for (final stmt in method.body!) {
        buffer.writeln(stmtGen.generate(stmt));
      }
    } else {
      buffer.writeln(indenter.line('// TODO: Implement ${method.name}'));
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }
  // =========================================================================
  // PARAMETER & UTILITY METHODS
  // =========================================================================

  String _generateParameterList(List<ParameterDecl> parameters) {
    if (parameters.isEmpty) {
      return '';
    }

    // Separate parameters by type
    final required = parameters
        .where((p) => p.isRequired && !p.isNamed)
        .toList();
    final optional = parameters
        .where((p) => !p.isRequired && !p.isNamed)
        .toList();
    final named = parameters.where((p) => p.isNamed).toList();

    final parts = <String>[];

    // Required positional parameters
    parts.addAll(required.map((p) => p.name));

    // Optional positional parameters with defaults
    for (final param in optional) {
      final def = param.defaultValue != null
          ? exprGen.generate(param.defaultValue!, parenthesize: false)
          : 'undefined';
      parts.add('${param.name} = $def');
    }

    // Named parameters → object destructuring
    if (named.isNotEmpty) {
      final namedParts = named
          .map((p) {
            final def = p.defaultValue != null
                ? exprGen.generate(p.defaultValue!, parenthesize: false)
                : 'undefined';
            return '${p.name} = $def';
          })
          .join(', ');

      parts.add('{ $namedParts } = {}');
    }

    return parts.join(', ');
  }

  // =========================================================================
  // ADVANCED CLASS FEATURES
  // =========================================================================

  /// Generate property accessor pair (getter + setter)
  String _generatePropertyAccessor(FieldDecl field) {
    final buffer = StringBuffer();

    // Getter
    buffer.writeln(indenter.line('get ${field.name}() {'));
    indenter.indent();
    buffer.writeln(indenter.line('return this._${field.name};'));
    indenter.dedent();
    buffer.writeln(indenter.line('}'));

    buffer.writeln();

    // Setter
    buffer.writeln(indenter.line('set ${field.name}(value) {'));
    indenter.indent();
    buffer.writeln(indenter.line('this._${field.name} = value;'));
    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  /// Generate equality operator
  String _generateEqualsMethod(ClassDecl cls) {
    final buffer = StringBuffer();

    buffer.writeln(indenter.line('equals(other) {'));
    indenter.indent();

    buffer.writeln(
      indenter.line('if (!(other instanceof ${cls.name})) return false;'),
    );

    for (final field in cls.instanceFields) {
      buffer.writeln(
        indenter.line(
          'if (this.${field.name} !== other.${field.name}) return false;',
        ),
      );
    }

    buffer.writeln(indenter.line('return true;'));

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  /// Generate toString method
  String _generateToStringMethod(ClassDecl cls) {
    final buffer = StringBuffer();

    buffer.writeln(indenter.line('toString() {'));
    indenter.indent();

    final fields = cls.instanceFields
        .map((f) => '${f.name}: \${this.${f.name}}')
        .join(', ');

    buffer.writeln(indenter.line('return \'${cls.name}($fields)\';'));

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }
}

// ============================================================================
// HELPER: INDENTER (shared with other generators)
// ============================================================================

// ============================================================================
// EXAMPLE CONVERSIONS
// ============================================================================

/*
EXAMPLE 1: Simple Class
──────────────────────
Dart:
  class Point {
    int x;
    int y;
    Point(this.x, this.y);
    
    int get magnitude => (x * x + y * y).sqrt().toInt();
  }

JavaScript:
  class Point {
    x = null;
    y = null;
    
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
    
    get magnitude() {
      return Math.floor(Math.sqrt(x * x + y * y));
    }
  }


EXAMPLE 2: Class with Inheritance
──────────────────────────────────
Dart:
  class Shape {
    int area();
  }
  
  class Circle extends Shape {
    double radius;
    Circle(this.radius);
    
    int area() => (pi * radius * radius).toInt();
  }

JavaScript:
  class Shape {
    area() {
      // abstract
    }
  }
  
  class Circle extends Shape {
    radius = null;
    
    constructor(radius) {
      super();
      this.radius = radius;
    }
    
    area() {
      return Math.floor(Math.PI * this.radius * this.radius);
    }
  }


EXAMPLE 3: Static Members
─────────────────────────
Dart:
  class Math {
    static const PI = 3.14159;
    static int abs(int x) => x < 0 ? -x : x;
  }

JavaScript:
  class Math {
    static PI = 3.14159;
    
    static abs(x) {
      return x < 0 ? -x : x;
    }
  }


EXAMPLE 4: Getters and Setters
──────────────────────────────
Dart:
  class Rectangle {
    int _width;
    Rectangle(this._width);
    
    int get width => _width;
    set width(int w) => _width = w;
  }

JavaScript:
  class Rectangle {
    _width = null;
    
    constructor(_width) {
      this._width = _width;
    }
    
    get width() {
      return this._width;
    }
    
    set width(w) {
      this._width = w;
    }
  }


EXAMPLE 5: Abstract Class
─────────────────────────
Dart:
  abstract class Animal {
    void speak();
    void move() {
      print('Moving...');
    }
  }

JavaScript:
  abstract class Animal {
    // abstract speak();
    
    move() {
      console.log('Moving...');
    }
  }


EXAMPLE 6: Async Methods
───────────────────────
Dart:
  class DataLoader {
    Future<String> loadData() async {
      return await fetch('/api/data');
    }
  }

JavaScript:
  class DataLoader {
    async loadData() {
      return await fetch('/api/data');
    }
  }


EXAMPLE 7: Generator Methods
────────────────────────────
Dart:
  class Counter {
    Iterable<int> count(int max) sync* {
      for (int i = 0; i < max; i++) {
        yield i;
      }
    }
  }

JavaScript:
  class Counter {
    * count(max) {
      for (let i = 0; i < max; i++) {
        yield i;
      }
    }
  }


EXAMPLE 8: Method Overloading (via Dart named constructors)
─────────────────────────────────────────────────────────
Dart:
  class Date {
    int year, month, day;
    Date(this.year, this.month, this.day);
    Date.today() : this(2024, 1, 1);
  }

JavaScript:
  class Date {
    year = null;
    month = null;
    day = null;
    
    constructor(year, month, day) {
      this.year = year;
      this.month = month;
      this.day = day;
    }
    
    constructor_today() {
      this.year = 2024;
      this.month = 1;
      this.day = 1;
    }
  }
*/
