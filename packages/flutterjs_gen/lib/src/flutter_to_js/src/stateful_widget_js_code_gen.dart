// ============================================================================
// PHASE 3.4: STATEFUL WIDGET CODE GENERATOR
// ============================================================================
// Converts Flutter StatefulWidget + State pattern to JavaScript
// Handles widget class, state class, lifecycle methods, and reactive state
// ============================================================================


import 'package:flutterjs_core/src/ir/expressions/cascade_expression_ir.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/src/flutter_to_js/src/utils/indenter.dart';
import '../flutter_to_js.dart';
import 'build_method_code_gen.dart';
import 'flutter_prop_converters.dart';
import 'function_code_generator.dart';
import 'stateless_widget_js_code_gen.dart';

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for stateful widget generation
class StatefulWidgetGenConfig {
  /// Whether to generate JSDoc comments
  final bool generateJSDoc;

  /// Whether to generate state change tracking
  final bool trackStateChanges;

  /// Whether to validate lifecycle methods
  final bool validateLifecycle;

  /// Whether to generate super() calls
  final bool generateSuperCalls;

  /// Indentation string
  final String indent;

  const StatefulWidgetGenConfig({
    this.generateJSDoc = true,
    this.trackStateChanges = false,
    this.validateLifecycle = true,
    this.generateSuperCalls = true,
    this.indent = '  ',
  });
}

// ============================================================================
// ANALYSIS MODELS
// ============================================================================

/// Information about a widget and its declarations
class WidgetInfo {
  /// The class declaration
  final ClassDecl declaration;

  /// Whether this is a StatefulWidget or State class
  final bool isStatefulWidget;

  /// Corresponding State class (if StatefulWidget)
  final ClassDecl? stateClass;

  WidgetInfo({
    required this.declaration,
    required this.isStatefulWidget,
    this.stateClass,
  });

  @override
  String toString() => 'WidgetInfo(${declaration.name})';
}

/// Lifecycle methods mapping
class LifecycleMapping {
  /// initState method
  final MethodDecl? initState;

  /// dispose method
  final MethodDecl? dispose;

  /// didUpdateWidget method
  final MethodDecl? didUpdateWidget;

  /// didChangeDependencies method
  final MethodDecl? didChangeDependencies;

  /// build method
  final MethodDecl? build;

  LifecycleMapping({
    this.initState,
    this.dispose,
    this.didUpdateWidget,
    this.didChangeDependencies,
    this.build,
  });

  /// Check if all required lifecycle methods are present
  bool get isComplete => build != null;

  /// Get all defined lifecycle methods
  List<MethodDecl> getAllMethods() {
    return [
      if (initState != null) initState!,
      if (dispose != null) dispose!,
      if (didUpdateWidget != null) didUpdateWidget!,
      if (didChangeDependencies != null) didChangeDependencies!,
      if (build != null) build!,
    ];
  }

  @override
  String toString() {
    final methods = <String>[];
    if (initState != null) methods.add('initState');
    if (dispose != null) methods.add('dispose');
    if (didUpdateWidget != null) methods.add('didUpdateWidget');
    if (didChangeDependencies != null) methods.add('didChangeDependencies');
    if (build != null) methods.add('build');
    return 'LifecycleMapping(${methods.join(", ")})';
  }
}

/// State field analysis
class StateModel {
  /// Fields that are reactive (used in build and modified via setState)
  final List<String> reactiveFields;

  /// Fields that are non-reactive (private, caches, etc)
  final List<String> nonReactiveFields;

  /// Controllers and resources
  final List<String> resources;

  /// Which fields are reset on dispose
  final Set<String> disposableFields;

  StateModel({
    this.reactiveFields = const [],
    this.nonReactiveFields = const [],
    this.resources = const [],
    this.disposableFields = const {},
  });

  @override
  String toString() =>
      'StateModel(reactive: ${reactiveFields.length}, non-reactive: ${nonReactiveFields.length})';
}

// ============================================================================
// LIFECYCLE BODY ANALYSIS
// ============================================================================

/// Represents the type of lifecycle method body
enum LifecycleBodyType {
  /// No body (abstract or stub)
  none,

  /// Empty body
  empty,

  /// Contains statements
  hasStatements,

  /// Unknown
  unknown,
}

// ============================================================================
// MAIN STATEFUL WIDGET GENERATOR
// ============================================================================

class StatefulWidgetJSCodeGen {
  final StatefulWidgetGenConfig config;
  final WidgetInfo statefulWidget;
  final WidgetInfo stateClass;
  final LifecycleMapping lifecycleMapping;
  final StateModel stateModel;
  final BuildMethodCodeGen buildMethodGen;
  final FunctionCodeGen funcCodeGen;
  late Indenter indenter;
  final List<CodeGenWarning> warnings = [];
  final List<CodeGenError> errors = [];
  final FlutterPropConverter propConverter;

  final StatementCodeGen stmtCodeGen; // Injected
  final ExpressionCodeGen exprCodeGen; // Injected

  StatefulWidgetJSCodeGen({
    required this.statefulWidget,
    required this.stateClass,
    required this.lifecycleMapping,
    required this.stateModel,
    required this.buildMethodGen,
    required this.funcCodeGen,
    StatefulWidgetGenConfig? config,
    FlutterPropConverter? propConverter,
    StatementCodeGen? stmtCodeGen,
    ExpressionCodeGen? exprCodeGen,
  }) : propConverter = propConverter ?? FlutterPropConverter(),
       stmtCodeGen = stmtCodeGen ?? StatementCodeGen(),
       exprCodeGen = exprCodeGen ?? ExpressionCodeGen(),
       config = config ?? const StatefulWidgetGenConfig() {
    indenter = Indenter(this.config.indent);
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /// Generate complete stateful widget code
  String generate() {
    try {
      // Validate before generation
      _validateStatefulWidget();

      if (errors.isNotEmpty) {
        final error = CodeGenError(
          message:
              'Cannot generate stateful widget due to ${errors.length} error(s)',
          suggestion: 'Fix all errors before code generation',
        );
        throw error;
      }

      final buffer = StringBuffer();

      // Generate widget class
      buffer.writeln(_generateWidgetClass());
      buffer.writeln();

      // Generate state class
      buffer.writeln(_generateStateClass());

      return buffer.toString().trim();
    } catch (e) {
      final error = CodeGenError(
        message: 'Failed to generate stateful widget: $e',
        suggestion: 'Check class declarations and lifecycle methods',
      );
      errors.add(error);
      rethrow;
    }
  }

  // =========================================================================
  // VALIDATION
  // =========================================================================

  void _validateStatefulWidget() {
    if (config.validateLifecycle) {
      // Check that build method exists
      if (lifecycleMapping.build == null) {
        final error = CodeGenError(
          message: 'State class must have a build() method',
          suggestion: 'Add: Widget build(BuildContext context) { ... }',
        );
        errors.add(error);
      }

      // Check that State class has proper name
      final expectedStateName = '_${statefulWidget.declaration.name}State';
      if (stateClass.declaration.name != expectedStateName) {
        final warning = CodeGenWarning(
          severity: WarningSeverity.warning,
          message:
              'State class name should follow convention: $expectedStateName',
          suggestion:
              'Rename from ${stateClass.declaration.name} to $expectedStateName',
        );
        warnings.add(warning);
      }

      // Check that State extends State
      if (stateClass.declaration.superclass == null) {
        final warning = CodeGenWarning(
          severity: WarningSeverity.warning,
          message: '${stateClass.declaration.name} should extend State',
          suggestion:
              'Change: class ${stateClass.declaration.name} extends State<${statefulWidget.declaration.name}>',
        );
        warnings.add(warning);
      }
    }
  }

  // =========================================================================
  // WIDGET CLASS GENERATION
  // =========================================================================

  String _generateWidgetClass() {
    final buffer = StringBuffer();

    // JSDoc
    if (config.generateJSDoc) {
      buffer.writeln(_generateWidgetJSDoc());
    }

    // Class header
    buffer.writeln(
      'class ${statefulWidget.declaration.name} extends StatefulWidget {',
    );
    indenter.indent();

    // Constructor with props
    _generateWidgetConstructor(buffer);

    buffer.writeln();

    // createState() method
    _generateCreateState(buffer);

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  void _generateWidgetConstructor(StringBuffer buffer) {
    final params = statefulWidget.declaration.constructors.isNotEmpty
        ? statefulWidget.declaration.constructors.first.parameters
        : <ParameterDecl>[];

    // Build parameter list
    final paramStr = params.isEmpty ? '' : params.map((p) => p.name).join(', ');

    buffer.writeln(indenter.line('constructor({$paramStr} = {}) {'));
    indenter.indent();

    if (config.generateSuperCalls) {
      buffer.writeln(indenter.line('super();'));
    }

    // Assign parameters to properties
    for (final param in params) {
      buffer.writeln(indenter.line('this.${param.name} = ${param.name};'));
    }

    indenter.dedent();
    buffer.writeln(indenter.line('}'));
  }

  void _generateCreateState(StringBuffer buffer) {
    buffer.writeln(indenter.line('createState() {'));
    indenter.indent();

    final stateName = '_${statefulWidget.declaration.name}State';
    buffer.writeln(indenter.line('return new $stateName();'));

    indenter.dedent();
    buffer.writeln(indenter.line('}'));
  }

  String _generateWidgetJSDoc() {
    final buffer = StringBuffer();

    buffer.writeln('/**');
    buffer.writeln(' * ${statefulWidget.declaration.name} - A stateful widget');

    // Document widget properties
    if (statefulWidget.declaration.constructors.isNotEmpty) {
      final params = statefulWidget.declaration.constructors.first.parameters;
      for (final param in params) {
        buffer.writeln(' * @param {any} ${param.name} - Widget property');
      }
    }

    buffer.writeln(' */');

    return buffer.toString();
  }

  // =========================================================================
  // STATE CLASS GENERATION
  // =========================================================================

  String _generateStateClass() {
    final buffer = StringBuffer();

    // JSDoc
    if (config.generateJSDoc) {
      buffer.writeln(_generateStateJSDoc());
    }

    // Class header
    final stateName = '_${statefulWidget.declaration.name}State';
    buffer.writeln('class $stateName extends State {');
    indenter.indent();

    // Constructor
    _generateStateConstructor(buffer);
    buffer.writeln();

    // State fields
    _generateStateFields(buffer);
    if (stateModel.reactiveFields.isNotEmpty ||
        stateModel.nonReactiveFields.isNotEmpty) {
      buffer.writeln();
    }

    // initState lifecycle
    _generateInitState(buffer);

    // dispose lifecycle
    _generateDispose(buffer);

    // didUpdateWidget lifecycle
    _generateDidUpdateWidget(buffer);

    // didChangeDependencies lifecycle
    _generateDidChangeDependencies(buffer);

    // setState wrapper
    _generateSetStateWrapper(buffer);

    // Custom methods (non-lifecycle)
    _generateCustomMethods(buffer);

    // build method
    _generateBuildMethod(buffer);

    indenter.dedent();
    buffer.write(indenter.line('}'));

    return buffer.toString().trim();
  }

  void _generateStateConstructor(StringBuffer buffer) {
    buffer.writeln(indenter.line('constructor() {'));
    indenter.indent();

    if (config.generateSuperCalls) {
      buffer.writeln(indenter.line('super();'));
    }

    indenter.dedent();
    buffer.writeln(indenter.line('}'));
  }

  void _generateStateFields(StringBuffer buffer) {
    for (final fieldName in stateModel.reactiveFields) {
      final field = stateClass.declaration.instanceFields.firstWhereOrNull(
        (f) => f.name == fieldName,
      );

      if (field != null) {
        String initialValue = 'null';

        if (field.initializer != null) {
          final result = propConverter.convertProperty(
            field.name,
            field.initializer!,
            field.type.displayName(),
          );
          initialValue = result.code;

          if (!result.isSuccessful) {
            warnings.add(
              CodeGenWarning(
                severity: WarningSeverity.warning,
                message: 'Field init conversion failed: ${field.name}',
              ),
            );
          }
        }

        final typeComment = config.generateJSDoc
            ? ' // ${field.type.displayName()}'
            : '';

        buffer.writeln(
          indenter.line('$fieldName = $initialValue;$typeComment'),
        );
      }
    }

    for (final fieldName in stateModel.nonReactiveFields) {
      final field = stateClass.declaration.instanceFields.firstWhereOrNull(
        (f) => f.name == fieldName,
      );

      if (field != null) {
        String initialValue = 'null';

        if (field.initializer != null) {
          final result = propConverter.convertProperty(
            field.name,
            field.initializer!,
            field.type.displayName(),
          );
          initialValue = result.code;
        }

        buffer.writeln(
          indenter.line('$fieldName = $initialValue; // Non-reactive'),
        );
      }
    }

    for (final fieldName in stateModel.resources) {
      buffer.writeln(indenter.line('$fieldName = null; // Resource'));
    }
  }

  void _generateInitState(StringBuffer buffer) {
    buffer.writeln(indenter.line('initState() {'));
    indenter.indent();

    if (config.generateSuperCalls) {
      buffer.writeln(indenter.line('super.initState();'));
    }

    if (lifecycleMapping.initState != null) {
      final bodyType = _analyzeLifecycleBody(lifecycleMapping.initState!.body);

      try {
        final methodBody = lifecycleMapping.initState!.body;
        if (bodyType == LifecycleBodyType.hasStatements && methodBody != null) {
          // ✓ FIXED: Indent each statement line properly
          for (final stmt in methodBody) {
            final stmtCode = stmtCodeGen.generate(stmt);
            for (final line in stmtCode.split('\n')) {
              if (line.isNotEmpty) {
                buffer.writeln(indenter.line(line));
              } else {
                buffer.writeln();
              }
            }
          }
        } else if (bodyType == LifecycleBodyType.empty) {
          buffer.writeln(indenter.line('// initState body is empty'));
        } else {
          buffer.writeln(indenter.line('// TODO: Initialize state'));
        }
      } catch (e) {
        buffer.writeln(
          indenter.line('// TODO: initState body (conversion failed)'),
        );
      }
    } else {
      buffer.writeln(indenter.line('// TODO: Initialize state'));
    }

    indenter.dedent();
    buffer.writeln(indenter.line('}'));
  }

  void _generateDispose(StringBuffer buffer) {
    buffer.writeln(indenter.line('dispose() {'));
    indenter.indent();

    // Generate cleanup for disposable fields
    if (stateModel.disposableFields.isNotEmpty) {
      for (final field in stateModel.disposableFields) {
        buffer.writeln(indenter.line('this.$field?.dispose();'));
      }
    }

    if (lifecycleMapping.dispose != null) {
      final bodyType = _analyzeLifecycleBody(lifecycleMapping.dispose!.body);

      try {
        final methodBody = lifecycleMapping.dispose!.body;
        if (bodyType == LifecycleBodyType.hasStatements && methodBody != null) {
          // ✓ FIXED: Indent each statement line properly
          for (final stmt in methodBody) {
            // Skip super.dispose() if already present
            if (stmt is! ExpressionStmt ||
                !_isSuperCall(stmt.expression, 'dispose')) {
              final stmtCode = stmtCodeGen.generate(stmt);
              for (final line in stmtCode.split('\n')) {
                if (line.isNotEmpty) {
                  buffer.writeln(indenter.line(line));
                } else {
                  buffer.writeln();
                }
              }
            }
          }
        }
      } catch (e) {
        warnings.add(
          CodeGenWarning(
            severity: WarningSeverity.warning,
            message: 'Could not generate dispose body: $e',
          ),
        );
      }
    }

    if (config.generateSuperCalls) {
      buffer.writeln(indenter.line('super.dispose();'));
    }

    indenter.dedent();
    buffer.writeln(indenter.line('}'));
  }

  void _generateDidUpdateWidget(StringBuffer buffer) {
    if (lifecycleMapping.didUpdateWidget == null) return;

    buffer.writeln(indenter.line('didUpdateWidget(oldWidget) {'));
    indenter.indent();

    if (config.generateSuperCalls) {
      buffer.writeln(indenter.line('super.didUpdateWidget(oldWidget);'));
    }

    final bodyType = _analyzeLifecycleBody(
      lifecycleMapping.didUpdateWidget!.body,
    );

    try {
      final methodBody = lifecycleMapping.didUpdateWidget!.body;
      if (bodyType == LifecycleBodyType.hasStatements && methodBody != null) {
        // ✓ FIXED: Indent each statement line properly
        for (final stmt in methodBody) {
          if (stmt is! ExpressionStmt ||
              !_isSuperCall(stmt.expression, 'didUpdateWidget')) {
            final stmtCode = stmtCodeGen.generate(stmt);
            for (final line in stmtCode.split('\n')) {
              if (line.isNotEmpty) {
                buffer.writeln(indenter.line(line));
              } else {
                buffer.writeln();
              }
            }
          }
        }
      }
    } catch (e) {
      warnings.add(
        CodeGenWarning(
          severity: WarningSeverity.warning,
          message: 'Could not generate didUpdateWidget body: $e',
        ),
      );
    }

    indenter.dedent();
    buffer.writeln(indenter.line('}'));
    buffer.writeln();
  }

  void _generateDidChangeDependencies(StringBuffer buffer) {
    if (lifecycleMapping.didChangeDependencies == null) return;

    buffer.writeln(indenter.line('didChangeDependencies() {'));
    indenter.indent();

    if (config.generateSuperCalls) {
      buffer.writeln(indenter.line('super.didChangeDependencies();'));
    }

    final bodyType = _analyzeLifecycleBody(
      lifecycleMapping.didChangeDependencies!.body,
    );

    try {
      final methodBody = lifecycleMapping.didChangeDependencies!.body;
      if (bodyType == LifecycleBodyType.hasStatements && methodBody != null) {
        // ✓ FIXED: Indent each statement line properly
        for (final stmt in methodBody) {
          if (stmt is! ExpressionStmt ||
              !_isSuperCall(stmt.expression, 'didChangeDependencies')) {
            final stmtCode = stmtCodeGen.generate(stmt);
            for (final line in stmtCode.split('\n')) {
              if (line.isNotEmpty) {
                buffer.writeln(indenter.line(line));
              } else {
                buffer.writeln();
              }
            }
          }
        }
      } else if (bodyType == LifecycleBodyType.none) {
        buffer.writeln(
          indenter.line('// TODO: Convert didChangeDependencies body'),
        );
      }
    } catch (e) {
      warnings.add(
        CodeGenWarning(
          severity: WarningSeverity.warning,
          message: 'Could not generate didChangeDependencies body: $e',
        ),
      );
      buffer.writeln(
        indenter.line('// TODO: Convert didChangeDependencies body'),
      );
    }

    indenter.dedent();
    buffer.writeln(indenter.line('}'));
    buffer.writeln();
  }

  void _generateSetStateWrapper(StringBuffer buffer) {
    buffer.writeln(indenter.line('setState(callback) {'));
    indenter.indent();

    if (config.trackStateChanges) {
      buffer.writeln(indenter.line('// Track state change'));
      for (final field in stateModel.reactiveFields) {
        buffer.writeln(indenter.line('const oldValue_$field = this.$field;'));
      }
    }

    buffer.writeln(indenter.line('callback.call(this);'));

    if (config.trackStateChanges) {
      buffer.writeln(indenter.line('// Trigger re-render'));
    }

    if (config.generateSuperCalls) {
      buffer.writeln(indenter.line('super.setState();'));
    }

    indenter.dedent();
    buffer.writeln(indenter.line('}'));
    buffer.writeln();
  }

  void _generateCustomMethods(StringBuffer buffer) {
    final customMethods = stateClass.declaration.instanceMethods
        .where(
          (m) =>
              m.name != 'build' &&
              m.name != 'initState' &&
              m.name != 'dispose' &&
              m.name != 'didUpdateWidget' &&
              m.name != 'didChangeDependencies',
        )
        .toList();

    for (int i = 0; i < customMethods.length; i++) {
      final method = customMethods[i];

      try {
        final methodCode = funcCodeGen.generateMethod(method);

        // ✓ FIXED: Handle multi-line method code properly
        for (final line in methodCode.split('\n')) {
          if (line.isNotEmpty) {
            buffer.writeln(indenter.line(line));
          } else {
            buffer.writeln();
          }
        }
      } catch (e) {
        warnings.add(
          CodeGenWarning(
            severity: WarningSeverity.warning,
            message: 'Could not generate method ${method.name}: $e',
            suggestion: 'Check method structure',
          ),
        );
        // Fallback
        buffer.writeln(indenter.line('${method.name}(...args) {'));
        indenter.indent();
        buffer.writeln(indenter.line('// TODO: Method implementation failed'));
        indenter.dedent();
        buffer.writeln(indenter.line('}'));
      }

      if (i < customMethods.length - 1) {
        buffer.writeln();
      }
    }

    if (customMethods.isNotEmpty) {
      buffer.writeln();
    }
  }
  // =========================================================================
  // LIFECYCLE BODY ANALYSIS
  // =========================================================================

  /// ✅ FIXED: Analyze lifecycle method body type
  LifecycleBodyType _analyzeLifecycleBody(List<StatementIR>? body) {
    if (body == null) {
      return LifecycleBodyType.none;
    }

    if (body.isEmpty) {
      return LifecycleBodyType.empty;
    }

    return LifecycleBodyType.hasStatements;
  }

  // Helper to detect super calls
  bool _isSuperCall(ExpressionIR expr, String methodName) {
    if (expr is MethodCallExpressionIR) {
      if (expr.target is SuperExpressionIR && expr.methodName == methodName) {
        return true;
      }
    }
    return false;
  }

  String _describeLifecycleBodyType(LifecycleBodyType type) {
    switch (type) {
      case LifecycleBodyType.none:
        return 'none (no body)';
      case LifecycleBodyType.empty:
        return 'empty (0 statements)';
      case LifecycleBodyType.hasStatements:
        return 'hasStatements (1+ statements)';
      case LifecycleBodyType.unknown:
        return 'unknown';
    }
  }

  /// ✓ NEW: Get statement count from lifecycle body
  int _getLifecycleStatementCount(List<StatementIR>? body) {
    return body?.length ?? 0;
  }

  /// ✓ NEW: Check if lifecycle body contains specific statement type
  bool _lifecycleHasStatementType<T extends StatementIR>(
    List<StatementIR>? body,
  ) {
    if (body == null || body.isEmpty) return false;
    return body.any((stmt) => stmt is T);
  }

  /// ✓ NEW: Get first statement of specific type
  T? _getFirstLifecycleStatement<T extends StatementIR>(
    List<StatementIR>? body,
  ) {
    if (body == null || body.isEmpty) return null;
    try {
      return body.firstWhere((stmt) => stmt is T) as T;
    } catch (e) {
      return null;
    }
  }

  void _generateBuildMethod(StringBuffer buffer) {
    if (lifecycleMapping.build == null) {
      buffer.writeln(indenter.line('build(context) {'));
      indenter.indent();
      buffer.writeln(indenter.line('return null; // TODO: Implement'));
      indenter.dedent();
      buffer.write(indenter.line('}'));
    } else {
      // Use buildMethodGen to generate build
      final buildCode = buildMethodGen.generateBuild(lifecycleMapping.build!);

      // Indent the build code
      final lines = buildCode.split('\n');
      for (final line in lines) {
        buffer.writeln(indenter.line(line));
      }
    }
  }

  String _generateStateJSDoc() {
    final buffer = StringBuffer();

    buffer.writeln('/**');
    buffer.writeln(' * State for ${statefulWidget.declaration.name}');
    buffer.writeln(' * Manages reactive state and lifecycle');
    buffer.writeln(' */');

    return buffer.toString();
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  String _getDefaultValue(TypeIR type) {
    final typeName = type.displayName();

    return switch (typeName) {
      'int' => '0',
      'double' => '0.0',
      'String' => '""',
      'bool' => 'false',
      'List' => '[]',
      'Map' => '{}',
      'Set' => 'new Set()',
      'Future' => 'Promise.resolve(null)',
      'Stream' => 'null',
      _ => 'null',
    };
  }

  /// Get all warnings
  List<CodeGenWarning> getWarnings() => List.unmodifiable(warnings);

  /// Get all errors
  List<CodeGenError> getErrors() => List.unmodifiable(errors);

  /// Generate comprehensive report
  String generateReport() {
    final buffer = StringBuffer();

    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║    STATEFUL WIDGET GENERATION REPORT               ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

    buffer.writeln('Widget: ${statefulWidget.declaration.name}');
    buffer.writeln('State: ${stateClass.declaration.name}');
    buffer.writeln('Lifecycle: $lifecycleMapping');
    buffer.writeln('State Model: $stateModel\n');

    if (errors.isEmpty && warnings.isEmpty) {
      buffer.writeln('✅ No issues found!\n');
      return buffer.toString();
    }

    if (errors.isNotEmpty) {
      buffer.writeln('❌ ERRORS (${errors.length}):');
      for (final error in errors) {
        buffer.writeln('  - ${error.message}');
        if (error.suggestion != null) {
          buffer.writeln('    💡 ${error.suggestion}');
        }
      }
      buffer.writeln();
    }

    if (warnings.isNotEmpty) {
      buffer.writeln('⚠️  WARNINGS (${warnings.length}):');
      for (final warning in warnings) {
        buffer.writeln('  - ${warning.message}');
        if (warning.suggestion != null) {
          buffer.writeln('    💡 ${warning.suggestion}');
        }
      }
    }

    return buffer.toString();
  }
}

// ============================================================================
// WARNING & ERROR TYPES
// ============================================================================

enum WarningSeverity { info, warning, error }

class CodeGenWarning {
  final WarningSeverity severity;
  final String message;
  final String? suggestion;

  CodeGenWarning({
    required this.severity,
    required this.message,
    this.suggestion,
  });

  @override
  String toString() => '${severity.name.toUpperCase()}: $message';
}

class CodeGenError {
  final String message;
  final String? suggestion;

  CodeGenError({required this.message, this.suggestion});

  @override
  String toString() =>
      'ERROR: $message'
      '${suggestion != null ? '\n  Suggestion: $suggestion' : ''}';
}
