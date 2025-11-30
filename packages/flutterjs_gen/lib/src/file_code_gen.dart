// ============================================================================
// PHASE 4: ADVANCED FILE-LEVEL GENERATION WITH ASYNC SAFETY
// ============================================================================

import 'package:flutterjs_core/src/ir/expressions/cascade_expression_ir.dart';

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/ast_it.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'flutterjs_gen/js_optimizer.dart';
import 'flutterjs_gen/stateless_widget_js_code_gen.dart';
import 'utils/indenter.dart';

class FileCodeGen {
  final ExpressionCodeGen exprCodeGen;
  final StatementCodeGen stmtCodeGen;
  final ClassCodeGen classCodeGen;
  final FunctionCodeGen funcCodeGen;
  final FlutterPropConverter propConverter;
  final RuntimeRequirements runtimeRequirements;
  final OutputValidator? outputValidator;
  final JSOptimizer? jsOptimizer;
  late Indenter indenter;

  late Set<String> usedWidgets;
  late Set<String> usedHelpers;
  late Set<String> usedTypes;
  late Map<String, List<String>> classDependencies;

  late ValidationReport? validationReport;
  late String? optimizedCode;
  final List<String> generationWarnings = [];

  // ✅ NEW: Thread-safe lock for buffer operations
  late final _lock = Mutex();

  FileCodeGen({
    ExpressionCodeGen? exprCodeGen,
    StatementCodeGen? stmtCodeGen,
    ClassCodeGen? classCodeGen,
    FunctionCodeGen? funcCodeGen,
    FlutterPropConverter? propConverter,
    RuntimeRequirements? runtimeRequirements,
    this.outputValidator,
    this.jsOptimizer,
  }) : exprCodeGen = exprCodeGen ?? ExpressionCodeGen(),
       stmtCodeGen = stmtCodeGen ?? StatementCodeGen(),
       classCodeGen = classCodeGen ?? ClassCodeGen(),
       funcCodeGen = funcCodeGen ?? FunctionCodeGen(),
       propConverter = propConverter ?? FlutterPropConverter(),
       runtimeRequirements = runtimeRequirements ?? RuntimeRequirements() {
    indenter = Indenter('  ');
    usedWidgets = {};
    usedHelpers = {};
    usedTypes = {};
    classDependencies = {};
  }

  // =========================================================================
  // MAIN GENERATION WITH ASYNC SAFETY
  // =========================================================================
  Future<String> generate(
    DartFile dartFile, {
    bool validate = true,
    bool optimize = false,
    int optimizationLevel = 1,
  }) async {
    try {
      // Step 1: Analyze file (can be async)
      await _analyzeFileAsync(dartFile);

      // Step 2: Generate code with proper async/await
      var generatedCode = await _generateCodeAsync(dartFile);

      // Step 3: VALIDATE
      if (validate) {
        generatedCode = await _performValidationAsync(generatedCode, dartFile);
      }

      // Step 4: OPTIMIZE
      if (optimize) {
        generatedCode = await _performOptimizationAsync(
          generatedCode,
          optimizationLevel,
        );
      }

      return generatedCode;
    } catch (e) {
      return _generateErrorOutput(e);
    }
  }

  // =========================================================================
  // ASYNC FILE ANALYSIS
  // =========================================================================

  Future<void> _analyzeFileAsync(DartFile dartFile) async {
    await _lock.protect(() async {
      usedWidgets.clear();
      usedHelpers.clear();
      usedTypes.clear();
      classDependencies.clear();
    });

    // Analyze classes
    for (final cls in dartFile.classDeclarations) {
      await _analyzeClassAsync(cls);
    }

    // Analyze functions
    for (final func in dartFile.functionDeclarations) {
      await _analyzeFunctionAsync(func);
    }

    // Analyze variables
    for (final variable in dartFile.variableDeclarations) {
      _analyzeExpression(variable.initializer);
      await _lock.protect(() async {
        usedTypes.add(variable.type.displayName());
      });
    }

    // Analyze runtime requirements
    await runtimeRequirements.analyzeAsync(dartFile);
    await _lock.protect(() async {
      usedHelpers.addAll(runtimeRequirements.getRequiredHelpers());
    });
  }

  Future<void> _analyzeClassAsync(ClassDecl cls) async {
    await _lock.protect(() async {
      if (cls.superclass != null) {
        final parentName = cls.superclass!.displayName();
        classDependencies.putIfAbsent(cls.name, () => []).add(parentName);
      }

      for (final iface in cls.interfaces) {
        classDependencies
            .putIfAbsent(cls.name, () => [])
            .add(iface.displayName());
      }

      for (final field in cls.instanceFields) {
        usedTypes.add(field.type.displayName());
        if (field.initializer != null) {
          _analyzeExpression(field.initializer);
        }
      }
    });

    for (final method in cls.methods) {
      if (method.name == 'build') {
        await _analyzeBuildMethodAsync(method);
      }

      if (method.body != null) {
        if (method.body is BlockStmt) {
          _analyzeStatement(method.body as BlockStmt);
        } else if (method.body is ExpressionIR) {
          _analyzeExpression(method.body as ExpressionIR);
        }
      }
    }
  }

  Future<void> _analyzeFunctionAsync(FunctionDecl func) async {
    await _lock.protect(() async {
      usedTypes.add(func.returnType.displayName());
      for (final param in func.parameters) {
        usedTypes.add(param.type.displayName());
      }
    });

    if (func.body != null) {
      if (func.body is BlockStmt) {
        _analyzeStatement(func.body as BlockStmt);
      } else if (func.body is ExpressionIR) {
        _analyzeExpression(func.body as ExpressionIR);
      }
    }
  }

  Future<void> _analyzeBuildMethodAsync(MethodDecl method) async {
    if (method.body == null) return;

    if (method.body is BlockStmt) {
      final block = method.body as BlockStmt;
      for (final stmt in block.statements) {
        if (stmt is ReturnStmt && stmt.expression != null) {
          await _detectWidgetsInExpressionAsync(stmt.expression!);
        }
      }
    } else if (method.body is ExpressionIR) {
      await _detectWidgetsInExpressionAsync(method.body as ExpressionIR);
    }
  }

  Future<void> _detectWidgetsInExpressionAsync(ExpressionIR expr) async {
    if (expr is InstanceCreationExpressionIR) {
      final widgetName = expr.type.displayName();
      await _lock.protect(() async {
        usedWidgets.add(widgetName);
      });

      for (final arg in expr.arguments) {
        await _detectWidgetsInExpressionAsync(arg);
      }

      for (final arg in expr.namedArguments.values) {
        await _detectWidgetsInExpressionAsync(arg);
      }
    } else if (expr is MethodCallExpressionIR) {
      for (final arg in expr.arguments) {
        await _detectWidgetsInExpressionAsync(arg);
      }
      for (final arg in expr.namedArguments.values) {
        await _detectWidgetsInExpressionAsync(arg);
      }
    } else if (expr is ListExpressionIR) {
      for (final elem in expr.elements) {
        await _detectWidgetsInExpressionAsync(elem);
      }
    } else if (expr is ConditionalExpressionIR) {
      await _detectWidgetsInExpressionAsync(expr.thenExpression);
      await _detectWidgetsInExpressionAsync(expr.elseExpression);
    }
  }

  // =========================================================================
  // ASYNC CODE GENERATION (FIXED: Sequential instead of concurrent)
  // =========================================================================

  Future<String> _generateCodeAsync(DartFile dartFile) async {
    var code = StringBuffer();

    // Generate each section sequentially to avoid buffer corruption
    code.writeln(await _generateHeaderAsync());
    code.writeln();
    code.writeln(await _generateSmartImportsAsync());
    code.writeln();

    code.writeln(await _generateRequiredHelpersAsync());
    code.writeln();
    code.writeln(await _generateTopLevelVariablesAsync(dartFile));
    code.writeln();
    code.writeln(await _generateEnumsAndConstantsAsync(dartFile));
    code.writeln();
    code.writeln(await _generateClassesAsync(dartFile));
    code.writeln();
    code.writeln(await _generateFunctionsAsync(dartFile));
    code.writeln();
    code.writeln(await _generateExportsAsync(dartFile));

    return code.toString();
  }

  // =========================================================================
  // ASYNC SECTION GENERATORS
  // =========================================================================

  Future<String> _generateHeaderAsync() async {
    return '''
// ============================================================================
// Generated from Dart IR - Advanced Code Generation (Phase 4+5)
// WARNING: Do not edit manually - changes will be lost
// Generated at: ${DateTime.now()}
//
// Smart Features Enabled:
// ✓ Intelligent import detection
// ✓ Unused widget filtering
// ✓ Dependency-aware helper generation
// ✓ Type-aware imports
// ✓ Validation & Optimization (Phase 5)
// ============================================================================
''';
  }

  Future<String> _generateSmartImportsAsync() async {
    var code = StringBuffer();

    const allWidgets = {
      'Container': 'Basic container widget',
      'Text': 'Text display widget',
      'Row': 'Horizontal layout',
      'Column': 'Vertical layout',
      'Center': 'Centering widget',
      'Padding': 'Padding widget',
      'Stack': 'Overlapping widgets',
      'Expanded': 'Flexible space widget',
      'SizedBox': 'Fixed size box',
      'Scaffold': 'Material scaffold',
      'AppBar': 'App bar widget',
      'FloatingActionButton': 'FAB widget',
      'ListView': 'List view widget',
      'GridView': 'Grid view widget',
      'Card': 'Card widget',
      'Icon': 'Icon widget',
      'Image': 'Image widget',
      'Button': 'Button widget',
      'TextField': 'Text input',
      'Form': 'Form widget',
    };

    await _lock.protect(() async {
      code.writeln('import Flutter from \'flutter-js-framework\';');
      code.writeln('import {');
      code.writeln('  // Core Framework');
      code.writeln('  Widget,');
      code.writeln('  State,');
      code.writeln('  StatefulWidget,');
      code.writeln('  StatelessWidget,');
      code.writeln('  BuildContext,');
      code.writeln('  Key,');

      final usedWidgetsList =
          usedWidgets.where((w) => allWidgets.containsKey(w)).toList()..sort();

      if (usedWidgetsList.isNotEmpty) {
        code.writeln('  // Used Widgets');
        for (final widget in usedWidgetsList) {
          code.writeln('  $widget, // ${allWidgets[widget]}');
        }
      }

      code.writeln('} from \'flutter-js-framework/widgets\';');
    });

    return code.toString();
  }

  Future<String> _generateRequiredHelpersAsync() async {
    var code = StringBuffer();

    await _lock.protect(() async {
      if (usedHelpers.isEmpty) {
        return;
      }

      code.writeln('// ===== RUNTIME HELPERS (${usedHelpers.length}) =====\n');

      for (final helper in usedHelpers.toList()..sort()) {
        final helperCode = await _generateHelperAsync(helper);
        if (helperCode.isNotEmpty) {
          code.writeln(helperCode);
          code.writeln();
        }
      }
    });

    return code.toString();
  }

  Future<String> _generateHelperAsync(String helperName) async {
    // All helpers wrapped safely
    if (helperName.startsWith('isType_')) {
      final typeName = helperName.replaceFirst('isType_', '');
      return 'function isType_$typeName(value) { return value instanceof $typeName; }';
    }

    if (helperName == 'nullCheck') {
      return r'''function nullCheck(value, name) {
  if (value === null || value === undefined) throw new Error(`${name} cannot be null`);
  return value;
}''';
    }

    // ✅ FIXED: Complete typeAssertion function - using raw string
    if (helperName == 'typeAssertion') {
      return r'''function typeAssertion(value, expectedType, variableName) {
  if (!(value instanceof expectedType)) {
    throw new TypeError(`${variableName} must be of type ${expectedType.name}`);
  }
  return value;
}''';
    }

    if (helperName == 'boundsCheck') {
      return '''function boundsCheck(index, length) {
  if (index < 0 || index >= length) {
    throw new RangeError('Index out of bounds');
  }
}''';
    }

    if (helperName == 'listCast') {
      return '''function listCast(list, expectedType) {
  return list.map(item => {
    if (!(item instanceof expectedType)) {
      throw new TypeError(`Item must be of type \${expectedType.name}`);
    }
    return item;
  });
}''';
    }

    if (helperName == 'mapCast') {
      return '''function mapCast(map, expectedKeyType, expectedValueType) {
  const result = new Map();
  for (const [key, value] of map) {
    if (!(key instanceof expectedKeyType)) {
      throw new TypeError(`Key must be of type \${expectedKeyType.name}`);
    }
    if (!(value instanceof expectedValueType)) {
      throw new TypeError(`Value must be of type \${expectedValueType.name}`);
    }
    result.set(key, value);
  }
  return result;
}''';
    }

    return '';
  }

  Future<String> _generateTopLevelVariablesAsync(DartFile dartFile) async {
    var code = StringBuffer();

    if (dartFile.variableDeclarations.isEmpty) {
      return '';
    }

    code.writeln('// ===== TOP-LEVEL VARIABLES =====\n');

    for (final variable in dartFile.variableDeclarations) {
      String init = '';

      if (variable.initializer != null) {
        final result = propConverter.convertProperty(
          variable.name,
          variable.initializer!,
          variable.type.displayName(),
        );
        init = ' = ${result.code}';
      }

      final keyword = variable.isConst ? 'const' : 'let';
      code.writeln('$keyword ${variable.name}$init;');
    }

    code.writeln();
    return code.toString();
  }

  Future<String> _generateEnumsAndConstantsAsync(DartFile dartFile) async {
    var code = StringBuffer();

    final enums = dartFile.classDeclarations
        .where((cls) => _isEnum(cls))
        .toList();

    if (enums.isEmpty) {
      return '';
    }

    code.writeln('// ===== ENUMS & CONSTANTS =====\n');

    for (int i = 0; i < enums.length; i++) {
      code.writeln(await _generateEnumAsync(enums[i]));
      if (i < enums.length - 1) {
        code.writeln();
      }
    }

    code.writeln();
    return code.toString();
  }

  Future<String> _generateEnumAsync(ClassDecl enumClass) async {
    var code = StringBuffer();

    code.writeln('const ${enumClass.name} = {');
    indenter.indent();

    final enumValues = enumClass.staticFields;
    for (int i = 0; i < enumValues.length; i++) {
      final field = enumValues[i];
      final value = field.initializer != null
          ? exprCodeGen.generate(field.initializer!, parenthesize: false)
          : '$i';
      code.write(indenter.line('${field.name}: $value'));

      if (i < enumValues.length - 1) {
        code.write(',\n');
      } else {
        code.write('\n');
      }
    }

    indenter.dedent();
    code.write(indenter.line('};'));

    return code.toString();
  }

  Future<String> _generateClassesAsync(DartFile dartFile) async {
    var code = StringBuffer();

    if (dartFile.classDeclarations.isEmpty) {
      return '';
    }

    code.writeln('// ===== CLASSES =====\n');

    final sorted = _sortByDependency(dartFile.classDeclarations);

    for (int i = 0; i < sorted.length; i++) {
      try {
        code.writeln(await classCodeGen.generate(sorted[i]));
        if (i < sorted.length - 1) {
          code.writeln();
        }
      } catch (e) {
        code.writeln('// ERROR: Failed to generate class ${sorted[i].name}');
      }
    }

    code.writeln();
    return code.toString();
  }

  Future<String> _generateFunctionsAsync(DartFile dartFile) async {
    var code = StringBuffer();

    if (dartFile.functionDeclarations.isEmpty) {
      return '';
    }

    code.writeln('// ===== FUNCTIONS =====\n');

    for (int i = 0; i < dartFile.functionDeclarations.length; i++) {
      try {
        code.writeln(
          await funcCodeGen.generate(dartFile.functionDeclarations[i]),
        );
        if (i < dartFile.functionDeclarations.length - 1) {
          code.writeln();
        }
      } catch (e) {
        code.writeln('// ERROR: Failed to generate function');
      }
    }

    code.writeln();
    return code.toString();
  }

  Future<String> _generateExportsAsync(DartFile dartFile) async {
    var code = StringBuffer();

    code.writeln('// ===== EXPORTS =====\n');
    code.writeln('export {');

    for (final cls in dartFile.classDeclarations) {
      code.writeln('  ${cls.name},');
    }

    for (final func in dartFile.functionDeclarations) {
      code.writeln('  ${func.name},');
    }

    for (final variable in dartFile.variableDeclarations) {
      code.writeln('  ${variable.name},');
    }

    code.writeln('};');

    return code.toString();
  }

  // =========================================================================
  // VALIDATION & OPTIMIZATION (ASYNC)
  // =========================================================================

  Future<String> _performValidationAsync(
    String jsCode,
    DartFile dartFile,
  ) async {
    final validator = outputValidator ?? OutputValidator(jsCode);
    validationReport = await validator.validate();
    if (validationReport!.hasCriticalIssues) {
      generationWarnings.add(
        '⚠️  CRITICAL VALIDATION ISSUES FOUND: ${validationReport!.errorCount} errors',
      );

      for (final error in validationReport!.errors) {
        if (error.severity == ErrorSeverity.fatal ||
            error.severity == ErrorSeverity.error) {
          generationWarnings.add('  ❌ ${error.message}');
        }
      }

      return _wrapWithValidationErrors(jsCode, validationReport!);
    }

    for (final error in validationReport!.errors) {
      if (error.severity == ErrorSeverity.warning) {
        generationWarnings.add('  ⚠️  ${error.message}');
      }
    }

    return jsCode;
  }

  Future<String> _performOptimizationAsync(
    String jsCode,
    int level, {
    bool dryRun = false,
    bool preserveComments = false,
  }) async {
    if (level < 1 || level > 3) {
      generationWarnings.add(
        'Warning: Invalid optimization level $level, using level 1',
      );
      level = 1;
    }

    try {
      final optimizer = JSOptimizer(jsCode);

      // DRY RUN MODE: Show what would be optimized without actually doing it
      if (dryRun) {
        final analysis = optimizer.optimize(
          level: level,
          dryRun: true,
          preserveComments_: preserveComments,
        );
        generationWarnings.add('DRY RUN (Level $level): No changes applied');
        return analysis;
      }

      // ACTUAL OPTIMIZATION
      final optimizedCode = optimizer.optimize(
        level: level,
        dryRun: false,
        preserveComments_: preserveComments,
      );

      final reduction = jsCode.length - optimizedCode.length;
      final reductionPercent = jsCode.length > 0
          ? (reduction / jsCode.length * 100).toStringAsFixed(2)
          : '0.00';

      // Warn if optimization resulted in minimal gains
      if (reduction < 50) {
        generationWarnings.add(
          'Note: Minimal optimization gains (Level $level): -$reduction bytes',
        );
      } else {
        generationWarnings.add(
          'Code optimized (Level $level): -$reduction bytes ($reductionPercent%)',
        );
      }

      // Log all applied optimizations
      for (final log in optimizer.optimizationLog) {
        generationWarnings.add('  → $log');
      }

      if (level == 3) {
        final header =
            '''
// ============================================================================
// CODE MINIFIED & OPTIMIZED (Level 3)
// Original: ${jsCode.length} bytes → Optimized: ${optimizedCode.length} bytes
// Reduction: $reduction bytes ($reductionPercent%)
// Note: Comments with "KEEP:" directive are preserved
// ============================================================================\n''';
        return header + optimizedCode;
      }

      if (level == 2) {
        final header =
            '''
// Optimized (Level 2): $reductionPercent% reduction
\n''';
        return header + optimizedCode;
      }

      return optimizedCode;
    } catch (e, stackTrace) {
      generationWarnings.add('Optimization failed: $e');
      generationWarnings.add('Stack trace: $stackTrace');
      return jsCode; // Graceful fallback
    }
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  void _analyzeStatement(BlockStmt block) {
    for (final stmt in block.statements) {
      if (stmt is IfStmt) {
        if (stmt.thenBranch is BlockStmt) {
          _analyzeStatement(stmt.thenBranch as BlockStmt);
        }
        if (stmt.elseBranch is BlockStmt) {
          _analyzeStatement(stmt.elseBranch as BlockStmt);
        }
      } else if (stmt is ExpressionStmt) {
        _analyzeExpression(stmt.expression);
      } else if (stmt is VariableDeclarationStmt) {
        if (stmt.initializer != null) {
          _analyzeExpression(stmt.initializer!);
        }
      }
    }
  }

  void _analyzeExpression(ExpressionIR? expr) {
    if (expr == null) return;

    if (expr is InstanceCreationExpressionIR) {
      _detectWidgetsInExpression(expr);
    } else if (expr is MethodCallExpressionIR) {
      _detectWidgetsInExpression(expr);
    } else if (expr is TypeCheckExpr) {
      usedTypes.add(expr.typeToCheck.displayName());
    } else if (expr is CastExpressionIR) {
      usedTypes.add(expr.targetType.displayName());
    }
  }

  void _detectWidgetsInExpression(ExpressionIR expr) {
    if (expr is InstanceCreationExpressionIR) {
      final widgetName = expr.type.displayName();
      usedWidgets.add(widgetName);

      for (final arg in expr.arguments) {
        _detectWidgetsInExpression(arg);
      }

      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is MethodCallExpressionIR) {
      for (final arg in expr.arguments) {
        _detectWidgetsInExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is ListExpressionIR) {
      for (final elem in expr.elements) {
        _detectWidgetsInExpression(elem);
      }
    } else if (expr is ConditionalExpressionIR) {
      _detectWidgetsInExpression(expr.thenExpression);
      _detectWidgetsInExpression(expr.elseExpression);
    }
  }

  bool _isEnum(ClassDecl cls) {
    return cls.instanceMethods.isEmpty &&
        cls.instanceFields.isEmpty &&
        cls.staticFields.isNotEmpty;
  }

  List<ClassDecl> _sortByDependency(List<ClassDecl> classes) {
    final sorted = <ClassDecl>[];
    final visited = <String>{};

    void visit(ClassDecl cls) {
      if (visited.contains(cls.name)) return;
      visited.add(cls.name);

      if (cls.superclass != null) {
        final parentName = cls.superclass!.displayName();
        final parent = classes.firstWhereOrNull((c) => c.name == parentName);
        if (parent != null) visit(parent);
      }

      for (final iface in cls.interfaces) {
        final ifaceName = iface.displayName();
        final ifaceClass = classes.firstWhereOrNull((c) => c.name == ifaceName);
        if (ifaceClass != null) visit(ifaceClass);
      }

      sorted.add(cls);
    }

    for (final cls in classes) {
      visit(cls);
    }

    return sorted;
  }

  String _wrapWithValidationErrors(String jsCode, ValidationReport report) {
    var code = StringBuffer();

    code.writeln(
      '// ============================================================================',
    );
    code.writeln('// ⚠️  VALIDATION ERRORS - Review before using');
    code.writeln(
      '// ============================================================================',
    );
    code.writeln('// Status: ${report.isValid ? "✅ VALID" : "❌ INVALID"}');
    code.writeln('// Issues: ${report.totalIssues}');
    code.writeln('//');

    for (final error in report.errors.where(
      (e) =>
          e.severity == ErrorSeverity.fatal ||
          e.severity == ErrorSeverity.error,
    )) {
      code.writeln('// ERROR: ${error.message}');
      if (error.suggestion != null) {
        code.writeln('// 💡 ${error.suggestion}');
      }
    }

    code.writeln(
      '// ============================================================================\n',
    );
    code.writeln(jsCode);

    return code.toString();
  }

  String _generateErrorOutput(Object error) {
    return '''
// ============================================================================
// ERROR: Failed to generate file
// ============================================================================
// Error: $error
//
// Checklist:
// ✗ Valid DartFile IR structure
// ✗ All dependent code generators initialized
// ✗ No circular dependencies
''';
  }

  Future<String> generateReportAsync(DartFile dartFile) async {
    final buffer = StringBuffer();

    buffer.writeln(
      '\n╔════════════════════════════════════════════════════════════════╗',
    );
    buffer.writeln(
      '║        FILE GENERATION REPORT (Phase 4 + Phase 5)             ║',
    );
    buffer.writeln(
      '╚════════════════════════════════════════════════════════════════╝\n',
    );

    buffer.writeln('📊 Input Statistics:');
    buffer.writeln('  Classes: ${dartFile.classDeclarations.length}');
    buffer.writeln('  Functions: ${dartFile.functionDeclarations.length}');
    buffer.writeln('  Variables: ${dartFile.variableDeclarations.length}\n');

    buffer.writeln('🔍 Smart Detection:');
    buffer.writeln('  Widgets Used: ${usedWidgets.length}');
    if (usedWidgets.isNotEmpty) {
      buffer.writeln('    - ${usedWidgets.toList().join(", ")}');
    }
    buffer.writeln('  Helpers Required: ${usedHelpers.length}');
    buffer.writeln('  Types Used: ${usedTypes.length}\n');

    if (validationReport != null) {
      buffer.writeln('✅ Validation Report (Phase 5):');
      buffer.writeln(
        '  Status: ${validationReport!.isValid ? "✅ PASSED" : "❌ FAILED"}',
      );
      buffer.writeln('  Issues: ${validationReport!.totalIssues}');
      buffer.writeln(
        '  Duration: ${validationReport!.duration.inMilliseconds}ms\n',
      );
    }

    if (generationWarnings.isNotEmpty) {
      buffer.writeln('⚠️  Generation Messages:');
      for (final warning in generationWarnings) {
        buffer.writeln('  $warning');
      }
      buffer.writeln();
    }

    buffer.writeln('✓ Generated Sections:');
    buffer.writeln('  ✓ Smart Imports');
    buffer.writeln('  ✓ Helper Functions');
    buffer.writeln('  ✓ Variables');
    buffer.writeln('  ✓ Enums');
    buffer.writeln('  ✓ Classes');
    buffer.writeln('  ✓ Functions');
    buffer.writeln('  ✓ Exports');

    return buffer.toString();
  }
}

// ============================================================================
// SIMPLE MUTEX FOR THREAD SAFETY
// ============================================================================

class Mutex {
  bool _locked = false;
  final List<Function> _queue = [];

  Future<T> protect<T>(Future<T> Function() callback) async {
    while (_locked) {
      await Future.delayed(Duration(milliseconds: 1));
    }

    _locked = true;
    try {
      return await callback();
    } finally {
      _locked = false;
    }
  }
}

// ============================================================================
// RUNTIME REQUIREMENTS (UPDATED WITH ASYNC)
// ============================================================================

class RuntimeRequirements {
  final Set<String> requiredHelpers = {};

  void addHelper(String helperName) {
    requiredHelpers.add(helperName);
  }

  List<String> getRequiredHelpers() {
    return requiredHelpers.toList()..sort();
  }

  Future<void> analyzeAsync(DartFile dartFile) async {
    if (_hasTypeChecks(dartFile)) {
      addHelper('isType_String');
      addHelper('isType_int');
      addHelper('isType_double');
      addHelper('isType_bool');
      addHelper('isType_List');
      addHelper('isType_Map');
    }

    if (_hasNullableTypes(dartFile)) {
      addHelper('nullCheck');
    }

    if (_hasCollections(dartFile)) {
      addHelper('listCast');
      addHelper('mapCast');
    }

    if (_hasArrayAccess(dartFile)) {
      addHelper('boundsCheck');
    }

    addHelper('typeAssertion');
  }

  bool _hasTypeChecks(DartFile dartFile) {
    for (final cls in dartFile.classDeclarations) {
      for (final method in cls.methods) {
        if (method.body != null) {
          if (_exprHasTypeCheck(method.body)) {
            return true;
          }
        }
      }
    }

    for (final func in dartFile.functionDeclarations) {
      if (func.body != null) {
        if (_exprHasTypeCheck(func.body)) {
          return true;
        }
      }
    }

    return false;
  }

  bool _exprHasTypeCheck(dynamic expr) {
    if (expr is TypeCheckExpr || expr is CastExpressionIR) {
      return true;
    }
    if (expr is BlockStmt) {
      for (final stmt in expr.statements) {
        if (stmt is ExpressionStmt && _exprHasTypeCheck(stmt.expression)) {
          return true;
        }
      }
    }
    return false;
  }

  bool _hasNullableTypes(DartFile dartFile) {
    for (final cls in dartFile.classDeclarations) {
      for (final field in cls.instanceFields) {
        final typeName = field.type.displayName();
        if (typeName.endsWith('?')) {
          return true;
        }
      }

      for (final method in cls.methods) {
        final returnTypeName = method.returnType.displayName();
        if (returnTypeName.endsWith('?')) {
          return true;
        }
      }
    }

    return false;
  }

  bool _hasCollections(DartFile dartFile) {
    for (final cls in dartFile.classDeclarations) {
      for (final field in cls.instanceFields) {
        final typeName = field.type.displayName();
        if (typeName.contains('List') ||
            typeName.contains('Map') ||
            typeName.contains('Set')) {
          return true;
        }
      }
    }

    return false;
  }

  bool _hasArrayAccess(DartFile dartFile) {
    return false;
  }
}

