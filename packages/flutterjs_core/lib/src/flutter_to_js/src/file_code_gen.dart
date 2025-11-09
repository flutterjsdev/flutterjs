// ============================================================================
// PHASE 4: ADVANCED FILE-LEVEL GENERATION WITH SMART AWARENESS
// ============================================================================

import 'package:flutterjs_core/src/ast_ir/ir/expression_types/cascade_expression_ir.dart';
import '../../../flutterjs_core.dart';
import 'utils/indenter.dart';

// ============================================================================
// PHASE 4: FILE-LEVEL GENERATION - UPDATED WITH PHASE 5 INTEGRATION
// ============================================================================

class FileCodeGen {
  final ExpressionCodeGen exprCodeGen;
  final StatementCodeGen stmtCodeGen;
  final ClassCodeGen classCodeGen;
  final FunctionCodeGen funcCodeGen;
  final FlutterPropConverter propConverter;
  final RuntimeRequirements runtimeRequirements;
  final OutputValidator? outputValidator; // NEW: Phase 5 integration
  final JSOptimizer? jsOptimizer; // NEW: Phase 5 integration
  late Indenter indenter;

  // Smart detection caches
  late Set<String> usedWidgets;
  late Set<String> usedHelpers;
  late Set<String> usedTypes;
  late Map<String, List<String>> classDependencies;

  // Phase 5 integration
  late ValidationReport? validationReport;
  late String? optimizedCode;
  final List<String> generationWarnings = [];

  FileCodeGen({
    ExpressionCodeGen? exprCodeGen,
    StatementCodeGen? stmtCodeGen,
    ClassCodeGen? classCodeGen,
    FunctionCodeGen? funcCodeGen,
    FlutterPropConverter? propConverter,
    RuntimeRequirements? runtimeRequirements,
    OutputValidator? outputValidator, // NEW
    JSOptimizer? jsOptimizer, // NEW
  }) : exprCodeGen = exprCodeGen ?? ExpressionCodeGen(),
       stmtCodeGen = stmtCodeGen ?? StatementCodeGen(),
       classCodeGen = classCodeGen ?? ClassCodeGen(),
       funcCodeGen = funcCodeGen ?? FunctionCodeGen(),
       propConverter = propConverter ?? FlutterPropConverter(),
       runtimeRequirements = runtimeRequirements ?? RuntimeRequirements(),
       outputValidator = outputValidator,
       jsOptimizer = jsOptimizer {
    indenter = Indenter('  ');
    usedWidgets = {};
    usedHelpers = {};
    usedTypes = {};
    classDependencies = {};
  }

  // =========================================================================
  // MAIN GENERATION WITH VALIDATION & OPTIMIZATION
  // =========================================================================

  String generate(
    DartFile dartFile, {
    bool validate = true, // NEW: Enable validation
    bool optimize = false, // NEW: Enable optimization
    int optimizationLevel = 1, // NEW: Optimization level (1-3)
  }) {
    try {
      // Step 1: Analyze file
      _analyzeFile(dartFile);

      // Step 2: Generate code
      var generatedCode = _generateCode(dartFile);

      // Step 3: VALIDATE (Phase 5 integration)
      if (validate) {
        generatedCode = _performValidation(generatedCode, dartFile);
      }

      // Step 4: OPTIMIZE (Phase 5 integration)
      if (optimize) {
        generatedCode = _performOptimization(generatedCode, optimizationLevel);
      }

      return generatedCode;
    } catch (e) {
      return _generateErrorOutput(e);
    }
  }

  // =========================================================================
  // NEW: PHASE 5 INTEGRATION - VALIDATION
  // =========================================================================

  String _performValidation(String jsCode, DartFile dartFile) {
    // Create validator if not provided
    final validator = outputValidator ?? OutputValidator(jsCode);

    // Run validation
    validationReport = validator.validate();

    // Handle critical errors
    if (validationReport!.hasCriticalIssues) {
      generationWarnings.add(
        '⚠️  CRITICAL VALIDATION ISSUES FOUND: ${validationReport!.errorCount} errors',
      );

      // Log errors
      for (final error in validationReport!.errors) {
        if (error.severity == ErrorSeverity.fatal ||
            error.severity == ErrorSeverity.error) {
          generationWarnings.add('  ❌ ${error.message}');
        }
      }

      // Return code with error comments
      return _wrapWithValidationErrors(jsCode, validationReport!);
    }

    // Log warnings
    for (final error in validationReport!.errors) {
      if (error.severity == ErrorSeverity.warning) {
        generationWarnings.add('  ⚠️  ${error.message}');
      }
    }

    return jsCode;
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

  // =========================================================================
  // NEW: PHASE 5 INTEGRATION - OPTIMIZATION
  // =========================================================================

  String _performOptimization(String jsCode, int level) {
    if (level < 1 || level > 3) {
      generationWarnings.add(
        '⚠️  Invalid optimization level $level, using level 1',
      );
      return jsCode;
    }

    try {
      final optimizer = jsOptimizer ?? JSOptimizer(jsCode);
      optimizedCode = optimizer.optimize(level: level);

      // Calculate reduction
      final reduction = jsCode.length - optimizedCode!.length;
      final reductionPercent = (reduction / jsCode.length * 100)
          .toStringAsFixed(2);

      generationWarnings.add(
        '✅ Code optimized (Level $level): -$reduction bytes ($reductionPercent%)',
      );

      // Add optimization report header if Level 3
      if (level == 3) {
        var optimized = StringBuffer();
        optimized.writeln(
          '// ============================================================================',
        );
        optimized.writeln('// ✅ CODE MINIFIED (Level 3 Optimization)');
        optimized.writeln(
          '// Original: ${jsCode.length} bytes → Optimized: ${optimizedCode!.length} bytes',
        );
        optimized.writeln(
          '// Reduction: $reduction bytes ($reductionPercent%)',
        );
        optimized.writeln(
          '// ============================================================================\n',
        );
        optimized.write(optimizedCode!);

        return optimized.toString();
      }

      return optimizedCode!;
    } catch (e) {
      generationWarnings.add(
        '⚠️  Optimization failed: $e, returning original code',
      );
      return jsCode;
    }
  }

  // =========================================================================
  // CODE GENERATION (existing implementation with enhancements)
  // =========================================================================

  String _generateCode(DartFile dartFile) {
    var code = StringBuffer();

    code.writeln(_generateHeader());
    code.writeln();
    code.writeln(_generateSmartImports());
    code.writeln();
    code.writeln(_generateRequiredHelpers());
    code.writeln();
    code.writeln(_generateTopLevelVariables(dartFile));
    code.writeln();
    code.writeln(_generateEnumsAndConstants(dartFile));
    code.writeln();
    code.writeln(_generateClasses(dartFile));
    code.writeln();
    code.writeln(_generateFunctions(dartFile));
    code.writeln();
    code.writeln(_generateExports(dartFile));

    return code.toString();
  }

  // =========================================================================
  // FILE ANALYSIS (smart detection)
  // =========================================================================

  void _analyzeFile(DartFile dartFile) {
    usedWidgets.clear();
    usedHelpers.clear();
    usedTypes.clear();
    classDependencies.clear();

    for (final cls in dartFile.classDeclarations) {
      _analyzeClass(cls);
    }

    for (final func in dartFile.functionDeclarations) {
      _analyzeFunction(func);
    }

    for (final variable in dartFile.variableDeclarations) {
      _analyzeExpression(variable.initializer);
      usedTypes.add(variable.type.displayName());
    }

    runtimeRequirements.analyze(dartFile);
    usedHelpers.addAll(runtimeRequirements.getRequiredHelpers());
  }

  void _analyzeClass(ClassDecl cls) {
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

    for (final method in cls.methods) {
      if (method.name == 'build') {
        _analyzeBuildMethod(method);
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

  void _analyzeFunction(FunctionDecl func) {
    usedTypes.add(func.returnType.displayName());

    for (final param in func.parameters) {
      usedTypes.add(param.type.displayName());
    }

    if (func.body != null) {
      if (func.body is BlockStmt) {
        _analyzeStatement(func.body as BlockStmt);
      } else if (func.body is ExpressionIR) {
        _analyzeExpression(func.body as ExpressionIR);
      }
    }
  }

  void _analyzeBuildMethod(MethodDecl method) {
    if (method.body == null) return;

    if (method.body is BlockStmt) {
      final block = method.body as BlockStmt;
      for (final stmt in block.statements) {
        if (stmt is ReturnStmt && stmt.expression != null) {
          _detectWidgetsInExpression(stmt.expression!);
        }
      }
    } else if (method.body is ExpressionIR) {
      _detectWidgetsInExpression(method.body as ExpressionIR);
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

  // =========================================================================
  // SECTIONS (Smart implementations)
  // =========================================================================

  String _generateHeader() {
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

  String _generateSmartImports() {
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

    return code.toString();
  }

  String _generateRequiredHelpers() {
    if (usedHelpers.isEmpty) {
      return '';
    }

    var code = StringBuffer();
    code.writeln('// ===== RUNTIME HELPERS (${usedHelpers.length}) =====\n');

    for (final helper in usedHelpers.toList()..sort()) {
      final helperCode = _generateHelper(helper);
      if (helperCode.isNotEmpty) {
        code.writeln(helperCode);
        code.writeln();
      }
    }

    return code.toString();
  }

  String _generateHelper(String helperName) {
    // Implementation from Phase 4
    if (helperName.startsWith('isType_')) {
      final typeName = helperName.replaceFirst('isType_', '');
      return 'function isType_$typeName(value) { return value instanceof $typeName; }';
    }

    if (helperName == 'nullCheck') {
      return '''function nullCheck(value, name) {
  if (value === null || value === undefined) throw new Error(\`\${name} cannot be null\`);
  return value;
}''';
    }

    if (helperName == 'typeAssertion') {
      return '''function typeAssertion(value, expectedType, variableName) {
  if (!(value instanceof expectedType)) {
    throw new TypeError(\`\${variableName} must be of type \${expectedType.name}\`);
  }
  return value;
}''';
    }

    return '';
  }

  String _generateTopLevelVariables(DartFile dartFile) {
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

  String _generateEnumsAndConstants(DartFile dartFile) {
    var code = StringBuffer();

    final enums = dartFile.classDeclarations
        .where((cls) => _isEnum(cls))
        .toList();

    if (enums.isEmpty) {
      return '';
    }

    code.writeln('// ===== ENUMS & CONSTANTS =====\n');

    for (int i = 0; i < enums.length; i++) {
      code.writeln(_generateEnum(enums[i]));
      if (i < enums.length - 1) {
        code.writeln();
      }
    }

    code.writeln();
    return code.toString();
  }

  String _generateEnum(ClassDecl enumClass) {
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

  bool _isEnum(ClassDecl cls) {
    return cls.instanceMethods.isEmpty &&
        cls.instanceFields.isEmpty &&
        cls.staticFields.isNotEmpty;
  }

  String _generateClasses(DartFile dartFile) {
    var code = StringBuffer();

    if (dartFile.classDeclarations.isEmpty) {
      return '';
    }

    code.writeln('// ===== CLASSES =====\n');

    final sorted = _sortByDependency(dartFile.classDeclarations);

    for (int i = 0; i < sorted.length; i++) {
      try {
        code.writeln(classCodeGen.generate(sorted[i]));
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

  String _generateFunctions(DartFile dartFile) {
    var code = StringBuffer();

    if (dartFile.functionDeclarations.isEmpty) {
      return '';
    }

    code.writeln('// ===== FUNCTIONS =====\n');

    for (int i = 0; i < dartFile.functionDeclarations.length; i++) {
      try {
        code.writeln(funcCodeGen.generate(dartFile.functionDeclarations[i]));
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

  String _generateExports(DartFile dartFile) {
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

  // =========================================================================
  // COMPREHENSIVE REPORTING WITH PHASE 5
  // =========================================================================

  String generateReport(DartFile dartFile) {
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

    if (optimizedCode != null) {
      buffer.writeln('🚀 Optimization:');
      buffer.writeln('  Original Size: ${optimizedCode!.length} bytes');
      buffer.writeln('  Optimized Size: ${optimizedCode!.length} bytes\n');
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
// EXTENSION: FirstWhereOrNull
// ============================================================================

// ============================================================================
// EXTENSION: Add firstWhereOrNull helper
// ============================================================================

class RuntimeRequirements {
  final Set<String> requiredHelpers = {};

  void addHelper(String helperName) {
    requiredHelpers.add(helperName);
  }

  List<String> getRequiredHelpers() {
    return requiredHelpers.toList()..sort();
  }

  void analyze(DartFile dartFile) {
    // Scan for features that require helpers

    // Type checks needed?
    if (_hasTypeChecks(dartFile)) {
      addHelper('isType_String');
      addHelper('isType_int');
      addHelper('isType_double');
      addHelper('isType_bool');
      addHelper('isType_List');
      addHelper('isType_Map');
    }

    // Null checks needed?
    if (_hasNullableTypes(dartFile)) {
      addHelper('nullCheck');
    }

    // Collection operations?
    if (_hasCollections(dartFile)) {
      addHelper('listCast');
      addHelper('mapCast');
    }

    // Array access needed?
    if (_hasArrayAccess(dartFile)) {
      addHelper('boundsCheck');
    }

    // Type assertions?
    addHelper('typeAssertion');
  }

  bool _hasTypeChecks(DartFile dartFile) {
    // Check if any class uses 'is' or 'as' operations
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
    // Check for nullable types (String?, int?, etc.)
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
    // Check for List/Map/Set usage
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
    // Check for indexed access operations
    // This would require scanning expressions, simplified here
    return false;
  }
}
