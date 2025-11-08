// ============================================================================
// PHASE 3.5: STATELESS WIDGET CODE GENERATOR
// ============================================================================
// Converts Flutter StatelessWidget to JavaScript
// Handles widget class, constructor with props, methods, and build()
// ============================================================================

import '../../ast_ir/ast_it.dart';
import 'build_method_code_gen.dart';
import 'function_code_generator.dart';
import 'statement_code_generator.dart';
import 'expression_code_generator.dart';

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for stateless widget generation
class StatelessWidgetGenConfig {
  /// Whether to generate JSDoc comments
  final bool generateJSDoc;

  /// Whether to validate widget structure
  final bool validateStructure;

  /// Whether to generate super() calls
  final bool generateSuperCalls;

  /// Whether to generate prop type hints in comments
  final bool generatePropTypeHints;

  /// Indentation string
  final String indent;

  const StatelessWidgetGenConfig({
    this.generateJSDoc = true,
    this.validateStructure = true,
    this.generateSuperCalls = true,
    this.generatePropTypeHints = true,
    this.indent = '  ',
  });
}

// ============================================================================
// ANALYSIS MODELS
// ============================================================================

/// Information about a stateless widget
class StatelessWidgetInfo {
  /// The class declaration
  final ClassDecl declaration;

  /// Constructor parameters (widget props)
  final List<ParameterDecl> constructorParams;

  /// Build method
  final MethodDecl? buildMethod;

  /// Other instance methods
  final List<MethodDecl> otherMethods;

  /// Static methods
  final List<MethodDecl> staticMethods;

  StatelessWidgetInfo({
    required this.declaration,
    required this.constructorParams,
    this.buildMethod,
    this.otherMethods = const [],
    this.staticMethods = const [],
  });

  bool get hasBuildMethod => buildMethod != null;
  int get totalMethods => (buildMethod != null ? 1 : 0) + otherMethods.length;

  @override
  String toString() =>
      'StatelessWidgetInfo(${declaration.name}, props: ${constructorParams.length}, methods: $totalMethods)';
}

/// Validation result for widget structure
class ValidationResult {
  final bool isValid;
  final List<String> errors;
  final List<String> warnings;

  ValidationResult({
    required this.isValid,
    this.errors = const [],
    this.warnings = const [],
  });

  int get issueCount => errors.length + warnings.length;

  @override
  String toString() =>
      'ValidationResult(valid: $isValid, errors: ${errors.length}, warnings: ${warnings.length})';
}

// ============================================================================
// MAIN STATELESS WIDGET GENERATOR
// ============================================================================

class StatelessWidgetJSCodeGen {
  final StatelessWidgetGenConfig config;
  final StatelessWidgetInfo widgetInfo;
  final BuildMethodCodeGen buildMethodGen;
  final FunctionCodeGen funcCodeGen;
  final StatementCodeGen stmtCodeGen;
  final ExpressionCodeGen exprGen;
  late Indenter indenter;

  final List<String> warnings = [];
  final List<String> errors = [];

  StatelessWidgetJSCodeGen({
    required this.widgetInfo,
    required this.buildMethodGen,
    FunctionCodeGen? funcCodeGen,
    StatementCodeGen? stmtCodeGen,
    ExpressionCodeGen? exprGen,
    StatelessWidgetGenConfig? config,
  })  : config = config ?? const StatelessWidgetGenConfig(),
        funcCodeGen = funcCodeGen ?? FunctionCodeGen(),
        stmtCodeGen = stmtCodeGen ?? StatementCodeGen(),
        exprGen = exprGen ?? ExpressionCodeGen() {
    indenter = Indenter(this.config.indent);
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Generate complete stateless widget code
  String generate() {
    try {
      warnings.clear();
      errors.clear();

      // Validate widget structure
      final validation = _validateWidget();
      if (!validation.isValid && config.validateStructure) {
        errors.addAll(validation.errors);
        final errorMsg =
            'Cannot generate widget: ${errors.join("; ")}';
        throw CodeGenError(
          message: errorMsg,
          suggestion: 'Fix widget structure before code generation',
        );
      }

      warnings.addAll(validation.warnings);

      // Generate code
      final buffer = StringBuffer();

      // JSDoc
      if (config.generateJSDoc) {
        buffer.writeln(_generateJSDoc());
      }

      // Class definition
      buffer.writeln(_generateClassDefinition());

      return buffer.toString().trim();
    } catch (e) {
      final error = 'Failed to generate stateless widget: $e';
      errors.add(error);
      throw CodeGenError(
        message: error,
        suggestion: 'Check class and method declarations',
      );
    }
  }

  // =========================================================================
  // VALIDATION
  // =========================================================================

  ValidationResult _validateWidget() {
    final errs = <String>[];
    final warns = <String>[];

    // Check class name
    if (widgetInfo.declaration.name.isEmpty) {
      errs.add('Widget class has empty name');
    }

    // Check that it extends StatelessWidget
    if (widgetInfo.declaration.superclass != null) {
      final superName =
          widgetInfo.declaration.superclass!.displayName();
      if (!superName.contains('StatelessWidget')) {
        warns.add(
          'Widget should extend StatelessWidget, but extends $superName',
        );
      }
    } else {
      warns.add('Widget should explicitly extend StatelessWidget');
    }

    // Check for build method
    if (!widgetInfo.hasBuildMethod) {
      errs.add('StatelessWidget must have a build() method');
    } else {
      final buildMethod = widgetInfo.buildMethod!;

      // Validate build method signature
      if (buildMethod.parameters.length != 1 ||
          buildMethod.parameters.first.name != 'context') {
        warns.add(
          'build() should have exactly one parameter: BuildContext context',
        );
      }

      // Validate build method has body
      if (buildMethod.body == null) {
        errs.add('build() method must have a body');
      }
    }

    // Check constructor
    final ctor = widgetInfo.declaration.constructors.isNotEmpty
        ? widgetInfo.declaration.constructors.first
        : null;

    if (ctor == null && widgetInfo.constructorParams.isNotEmpty) {
      warns.add(
        'Widget has constructor parameters but no explicit constructor',
      );
    }

    // Check for stateful patterns
    if (widgetInfo.declaration.instanceFields.any((f) => !f.isFinal)) {
      warns.add(
        'StatelessWidget should not have mutable fields',
      );
    }

    return ValidationResult(
      isValid: errs.isEmpty,
      errors: errs,
      warnings: warns,
    );
  }

  // =========================================================================
  // JSDOC GENERATION
  // =========================================================================

  String _generateJSDoc() {
    final buffer = StringBuffer();

    buffer.writeln('/**');
    buffer.writeln(' * ${widgetInfo.declaration.name}');
    buffer.writeln(' * A stateless widget (immutable UI component)');

    if (widgetInfo.constructorParams.isNotEmpty) {
      buffer.writeln(' *');
      buffer.writeln(' * Properties:');
      for (final param in widgetInfo.constructorParams) {
        final type = param.type.displayName();
        buffer.writeln(' * @param {${_jsType(type)}} ${param.name}');
      }
    }

    buffer.writeln(' *');
    buffer.writeln(' * @returns {Widget} The widget tree');
    buffer.writeln(' */');

    return buffer.toString();
  }

  // =========================================================================
  // CLASS GENERATION
  // =========================================================================

  String _generateClassDefinition() {
    final buffer = StringBuffer();

    // Class header
    buffer.write('class ${widgetInfo.declaration.name}');

    // Superclass
    if (widgetInfo.declaration.superclass != null) {
      buffer.write(
        ' extends ${widgetInfo.declaration.superclass!.displayName()}',
      );
    } else {
      buffer.write(' extends StatelessWidget');
    }

    buffer.writeln(' {');
    indenter.indent();

    // Instance properties (from constructor params)
    if (widgetInfo.constructorParams.isNotEmpty) {
      _generateConstructorProperties(buffer);
      buffer.writeln();
    }

    // Constructor
    _generateConstructor(buffer);
    buffer.writeln();

    // Static methods
    if (widgetInfo.staticMethods.isNotEmpty) {
      _generateStaticMethods(buffer);
      buffer.writeln();
    }

    // Instance methods (non-build)
    if (widgetInfo.otherMethods.isNotEmpty) {
      _generateInstanceMethods(buffer);
      buffer.writeln();
    }

    // Build method
    _generateBuildMethod(buffer);

    indenter.dedent();
    buffer.writeln('}');

    return buffer.toString();
  }

  // =========================================================================
  // CONSTRUCTOR PROPERTIES
  // =========================================================================

  void _generateConstructorProperties(StringBuffer buffer) {
    for (final param in widgetInfo.constructorParams) {
      final typeHint = config.generatePropTypeHints
          ? ' // ${param.type.displayName()}'
          : '';

      buffer.writeln(indenter.line('${param.name} = null;$typeHint'));
    }
  }

  // =========================================================================
  // CONSTRUCTOR
  // =========================================================================

  void _generateConstructor(StringBuffer buffer) {
    // Build parameter list for constructor
    final params = _generateConstructorSignature();

    buffer.writeln(indenter.line('constructor($params) {'));
    indenter.indent();

    // Call super
    if (config.generateSuperCalls) {
      buffer.writeln(indenter.line('super();'));
    }

    // Assign parameters to properties
    for (final param in widgetInfo.constructorParams) {
      buffer.writeln(
        indenter.line('this.${param.name} = ${param.name};'),
      );
    }

    indenter.dedent();
    buffer.writeln(indenter.line('}'));
  }

  String _generateConstructorSignature() {
    if (widgetInfo.constructorParams.isEmpty) {
      return '';
    }

    // Build parameter list with destructuring for named params
    final required = widgetInfo.constructorParams
        .where((p) => p.isRequired && !p.isNamed)
        .toList();

    final optional = widgetInfo.constructorParams
        .where((p) => !p.isRequired && !p.isNamed)
        .toList();

    final named =
        widgetInfo.constructorParams.where((p) => p.isNamed).toList();

    final parts = <String>[];

    // Required positional
    parts.addAll(required.map((p) => p.name));

    // Optional positional with defaults
    for (final param in optional) {
      final defValue = param.defaultValue != null
          ? exprGen.generate(param.defaultValue!, parenthesize: false)
          : 'undefined';
      parts.add('${param.name} = $defValue');
    }

    // Named parameters â†' object destructuring
    if (named.isNotEmpty) {
      final namedParts = named.map((p) {
        final defValue = p.defaultValue != null
            ? exprGen.generate(p.defaultValue!, parenthesize: false)
            : 'undefined';
        return '${p.name} = $defValue';
      }).join(', ');

      parts.add('{ $namedParts } = {}');
    }

    return parts.join(', ');
  }

  // =========================================================================
  // STATIC METHODS
  // =========================================================================

  void _generateStaticMethods(StringBuffer buffer) {
    for (int i = 0; i < widgetInfo.staticMethods.length; i++) {
      final method = widgetInfo.staticMethods[i];

      buffer.write(indenter.line('static '));
      _generateMethodBody(buffer, method, isStatic: true);

      if (i < widgetInfo.staticMethods.length - 1) {
        buffer.writeln();
      }
    }
  }

  // =========================================================================
  // INSTANCE METHODS
  // =========================================================================

  void _generateInstanceMethods(StringBuffer buffer) {
    for (int i = 0; i < widgetInfo.otherMethods.length; i++) {
      final method = widgetInfo.otherMethods[i];

      _generateMethodBody(buffer, method, isStatic: false);

      if (i < widgetInfo.otherMethods.length - 1) {
        buffer.writeln();
      }
    }
  }

  // =========================================================================
  // BUILD METHOD
  // =========================================================================

  void _generateBuildMethod(StringBuffer buffer) {
    if (widgetInfo.buildMethod == null) {
      // Fallback: generate stub
      buffer.writeln(indenter.line('build(context) {'));
      indenter.indent();
      buffer.writeln(indenter.line('return null; // TODO: Implement'));
      indenter.dedent();
      buffer.writeln(indenter.line('}'));
      return;
    }

    // Use specialized build method generator
    try {
      final buildCode = buildMethodGen.generateBuild(widgetInfo.buildMethod!);

      // Add indentation
      for (final line in buildCode.split('\n')) {
        if (line.isNotEmpty) {
          buffer.writeln(indenter.line(line));
        } else {
          buffer.writeln();
        }
      }
    } catch (e) {
      warnings.add('Could not generate build method: $e');

      // Fallback
      buffer.writeln(indenter.line('build(context) {'));
      indenter.indent();
      buffer.writeln(indenter.line('// TODO: Build method conversion failed'));
      buffer.writeln(indenter.line('return null;'));
      indenter.dedent();
      buffer.writeln(indenter.line('}'));
    }
  }

  // =========================================================================
  // METHOD BODY GENERATION
  // =========================================================================

  void _generateMethodBody(
    StringBuffer buffer,
    MethodDecl method, {
    bool isStatic = false,
  }) {
    // Modifiers
    String modifiers = '';

    if (method.isAsync) {
      modifiers = 'async ';
    } else if (method.isGenerator) {
      modifiers = '* ';
    }

    // Getter/Setter
    if (method.isGetter) {
      modifiers = 'get ';
    } else if (method.isSetter) {
      modifiers = 'set ';
    }

    // Method signature
    final params = _generateMethodParameters(method.parameters);

    buffer.writeln('$modifiers${method.name}($params) {');
    indenter.indent();

    // Method body
    if (method.body == null) {
      buffer.writeln(indenter.line('// TODO: Implement ${method.name}'));
    } else if (method.body is BlockStmt) {
      final blockStmt = method.body as BlockStmt;

      for (final stmt in blockStmt.statements) {
        try {
          buffer.writeln(stmtCodeGen.generate(stmt));
        } catch (e) {
          warnings.add(
            'Could not generate statement in ${method.name}: $e',
          );
          buffer.writeln(indenter.line('// TODO: Statement conversion failed'));
        }
      }
    } else {
      // Expression body
      try {
        final expr =
            exprGen.generate(method.body as ExpressionIR, parenthesize: false);
        buffer.writeln(indenter.line('return $expr;'));
      } catch (e) {
        warnings.add('Could not generate method body for ${method.name}: $e');
        buffer.writeln(indenter.line('// TODO: Method body conversion failed'));
      }
    }

    indenter.dedent();
    buffer.write(indenter.line('}'));
  }

  String _generateMethodParameters(List<ParameterDecl> parameters) {
    if (parameters.isEmpty) {
      return '';
    }

    // Separate by type
    final required =
        parameters.where((p) => p.isRequired && !p.isNamed).toList();

    final optional =
        parameters.where((p) => !p.isRequired && !p.isNamed).toList();

    final named = parameters.where((p) => p.isNamed).toList();

    final parts = <String>[];

    // Required
    parts.addAll(required.map((p) => p.name));

    // Optional with defaults
    for (final param in optional) {
      final defValue = param.defaultValue != null
          ? exprGen.generate(param.defaultValue!, parenthesize: false)
          : 'undefined';
      parts.add('${param.name} = $defValue');
    }

    // Named â†' object destructuring
    if (named.isNotEmpty) {
      final namedStr = named
          .map((p) {
            final defValue = p.defaultValue != null
                ? exprGen.generate(p.defaultValue!, parenthesize: false)
                : 'undefined';
            return '${p.name} = $defValue';
          })
          .join(', ');

      parts.add('{ $namedStr } = {}');
    }

    return parts.join(', ');
  }

  // =========================================================================
  // REPORTING
  // =========================================================================

  /// Get all warnings
  List<String> getWarnings() => List.unmodifiable(warnings);

  /// Get all errors
  List<String> getErrors() => List.unmodifiable(errors);

  /// Check if generation was successful
  bool get isSuccessful => errors.isEmpty;

  /// Generate comprehensive report
  String generateReport() {
    final buffer = StringBuffer();

    buffer.writeln('\n╔════════════════════════════════════════╗');
    buffer.writeln('║  STATELESS WIDGET GENERATION REPORT    ║');
    buffer.writeln('╚════════════════════════════════════════╝\n');

    buffer.writeln('Widget: ${widgetInfo.declaration.name}');
    buffer.writeln('Props: ${widgetInfo.constructorParams.length}');
    buffer.writeln('Methods: ${widgetInfo.totalMethods}');
    buffer.writeln('Status: ${isSuccessful ? ' SUCCESS' : 'FAILED'}\n');

    if (errors.isEmpty && warnings.isEmpty) {
      buffer.writeln(' No issues found!\n');
      return buffer.toString();
    }

    if (errors.isNotEmpty) {
      buffer.writeln(' ERRORS (${errors.length}):');
      for (final error in errors) {
        buffer.writeln('  - $error');
      }
      buffer.writeln();
    }

    if (warnings.isNotEmpty) {
      buffer.writeln('  WARNINGS (${warnings.length}):');
      for (final warning in warnings) {
        buffer.writeln('  - $warning');
      }
    }

    return buffer.toString();
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  String _jsType(String dartType) {
    return switch (dartType) {
      'String' => 'string',
      'int' || 'double' || 'num' => 'number',
      'bool' => 'boolean',
      'List' => 'Array',
      'Map' => 'Object',
      'Set' => 'Set',
      'void' => 'void',
      _ => 'any',
    };
  }
}

// ============================================================================
// ERROR TYPES
// ============================================================================

class CodeGenError implements Exception {
  final String message;
  final String? suggestion;

  CodeGenError({required this.message, this.suggestion});

  @override
  String toString() =>
      'CodeGenError: $message${suggestion != null ? '\n  Suggestion: $suggestion' : ''}';
}

// ============================================================================
// INDENTER UTILITY
// ============================================================================

class Indenter {
  String _indent;
  int _level = 0;

  Indenter(this._indent);

  void indent() => _level++;

  void dedent() {
    if (_level > 0) _level--;
  }

  String get current => _indent * _level;

  String get next => _indent * (_level + 1);

  String line(String code) => '$current$code';
}

// ============================================================================
// FACTORY CONSTRUCTOR FOR EASY CREATION
// ============================================================================

extension StatelessWidgetCodeGenFactory on ClassDecl {
  /// Quickly create StatelessWidgetJSCodeGen from ClassDecl
  StatelessWidgetJSCodeGen toJSCodeGen({
    required BuildMethodCodeGen buildMethodGen,
    StatelessWidgetGenConfig? config,
  }) {
    final buildMethod =
        instanceMethods.firstWhereOrNull((m) => m.name == 'build');

    final otherMethods = instanceMethods
        .where((m) => m.name != 'build')
        .toList();

    final ctor =
        constructors.isNotEmpty ? constructors.first : null;

    final constructorParams = ctor?.parameters ?? [];

    final staticMethods =
        methods.where((m) => m.isStatic).toList();

    final widgetInfo = StatelessWidgetInfo(
      declaration: this,
      constructorParams: constructorParams,
      buildMethod: buildMethod,
      otherMethods: otherMethods,
      staticMethods: staticMethods,
    );

    return StatelessWidgetJSCodeGen(
      widgetInfo: widgetInfo,
      buildMethodGen: buildMethodGen,
      config: config,
    );
  }
}

extension FirstWhereOrNull<T> on List<T> {
  T? firstWhereOrNull(bool Function(T) test) {
    try {
      return firstWhere(test);
    } catch (e) {
      return null;
    }
  }
}