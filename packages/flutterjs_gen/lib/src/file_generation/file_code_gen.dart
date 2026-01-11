// ============================================================================
// PHASE 4: ADVANCED FILE-LEVEL GENERATION WITH ASYNC SAFETY
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'package:flutterjs_gen/src/file_generation/runtime_requirements.dart';
import '../widget_generation/stateless_widget/stateless_widget_js_code_gen.dart';
import '../utils/indenter.dart';
import 'import_resolver.dart';

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
  late Set<String> definedNames; // ✅ NEW: Track locally defined names
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
    definedNames = {};
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
      definedNames.clear();
      classDependencies.clear();
    });

    // Analyze classes
    for (final cls in dartFile.classDeclarations) {
      await _lock.protect(() async {
        definedNames.add(cls.name);
      });
      await _analyzeClassAsync(cls);
    }

    // Analyze functions
    for (final func in dartFile.functionDeclarations) {
      await _lock.protect(() async {
        definedNames.add(func.name);
      });
      await _analyzeFunctionAsync(func);
    }

    // Analyze variables
    for (final variable in dartFile.variableDeclarations) {
      _analyzeExpression(variable.initializer);
      await _lock.protect(() async {
        definedNames.add(variable.name);
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
      if (method.body != null) {
        for (final stmt in method.body!.statements) {
          _analyzeStatement(stmt);
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
      for (final stmt in func.body!.statements) {
        _analyzeStatement(stmt);
      }
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
    code.writeln(await _generateSmartImportsAsync(dartFile));
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
// Generated from Dart IR - Advanced Code Generation (Phase 10)
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

  Future<String> _generateSmartImportsAsync(DartFile dartFile) async {
    var code = StringBuffer();

    await _lock.protect(() async {
      // Ensure Icons is imported if Icon is used (safety fallback)
      if (usedWidgets.contains('Icon')) {
        usedWidgets.add('Icons');
      }

      // ✅ NEW: Ensure Theme/Material related classes are imported
      if (usedWidgets.contains('MaterialApp') ||
          usedWidgets.contains('Theme')) {
        usedWidgets.add('ThemeData');
        usedWidgets.add('ColorScheme');
        usedWidgets.add('Colors');
        usedWidgets.add('Theme'); // ✅ Explicitly add Theme
      }

      // ✅ NEW: Ensure Icon/Icons are imported
      if (usedWidgets.contains('Icon') ||
          usedWidgets.contains('Icons') ||
          usedWidgets.contains('FloatingActionButton') ||
          usedWidgets.contains('IconButton')) {
        usedWidgets.add('Icon');
        usedWidgets.add('Icons');
        usedWidgets.add('IconData');
        usedWidgets.add('FloatingActionButton');
      }

      // ✅ NEW: Ensure TextStyle is imported if Text is used
      if (usedWidgets.contains('Text')) {
        usedWidgets.add('TextStyle');
      }

      if (usedWidgets.contains('TextStyle')) {
        usedWidgets.add('TextStyle');
      }

      // -----------------------------------------------------------------------
      // UNIFIED MATERIAL IMPORTS
      // -----------------------------------------------------------------------

      final materialImports = <String>{
        'runApp',
        'Widget',
        'State',
        'StatefulWidget',
        'StatelessWidget',
        'BuildContext',
        'Key',
      };

      // Sort widgets to ensure deterministic output
      final sortedWidgets =
          usedWidgets.where((w) => !definedNames.contains(w)).toSet().toList()
            ..sort();

      // Helper to check core symbols
      final resolver = ImportResolver();

      for (final widget in sortedWidgets) {
        // Skip runtime types if they accidentally got into usedWidgets
        if (widget.startsWith('_') || materialImports.contains(widget))
          continue;

        // Only import if it's a known core widget
        if (resolver.isKnownCore(widget) ||
            widget == 'ThemeData' ||
            widget == 'ColorScheme' ||
            widget == 'Colors' ||
            widget == 'Theme' ||
            widget == 'Icon' ||
            widget == 'Icons' ||
            widget == 'IconData' ||
            widget == 'FloatingActionButton' ||
            widget == 'TextStyle') {
          materialImports.add(widget);
        }
      }

      if (materialImports.isNotEmpty) {
        // ✅ Restored & Expanded inference logic
        materialImports.addAll({
          'Theme',
          'Colors',
          'Icons',
          'ThemeData',
          'EdgeInsets',
          'BorderRadius',
          'BoxDecoration',
          'TextStyle',
          'BoxShadow',
          'Offset',
          'FontWeight',
          'BoxShape',
          'Alignment',
          'CrossAxisAlignment',
          'MainAxisAlignment',
        });

        code.writeln('import {');
        final sortedImports = materialImports.toList()..sort();
        for (final symbol in sortedImports) {
          code.writeln('  $symbol,');
        }
        code.writeln('} from \'@flutterjs/material\';');
      }

      // -----------------------------------------------------------------------
      // LOCAL / PACKAGE IMPORTS (Namespace Strategy)
      // -----------------------------------------------------------------------

      final localNamespaces = <String>[];
      int importCounter = 0;

      // Filter for relevant imports (ignore flutter/material/core as they are handled above)
      for (final importStmt in dartFile.imports) {
        final uri = importStmt.uri;

        // Skip Core libs (handled by SmartImport logic above)
        if (uri.startsWith('dart:') ||
            uri.startsWith('package:flutter/') ||
            uri == 'package:flutterjs/material.dart') {
          continue;
        }

        // Determine JS Path
        String jsPath = uri;
        if (uri.startsWith('package:')) {
          // Heuristic: If it's a package import, check if it's THIS package or external
          // For now, assuming external packages are peer directories or node_modules
          // But user said: "import is local ... full path and reference path"
          // Simple strategy: Convert package:foo/bar.dart -> package/foo/bar.dart.js (or ./ if local)

          // For local project (multi_file_test), imports are like package:multi_file_test/file.dart
          // We need to resolve this relative to current file.
          // However, simple relative imports are safer if possible.
          // If the import IS relative (starts with .), use it directly.
          if (!uri.startsWith('.')) {
            // It is a package import. Let's just blindly import it from the packages directory structure
            // assuming the build system lays it out.
            // BUT user said "respective file already available at same location but .js"
            // This implies if we import `utils.dart` (relative), `utils.js` is there.
            // If we import `package:my_app/utils.dart`, and we are in `lib/main.dart`, that IS `utils.dart`.

            // TRICKY: We don't easily know "current package name" here without more context.
            // Fallback: Just treat it as a path that exists.
            // APPEND .js extension (or replace .dart with .js)
            if (jsPath.endsWith('.dart')) {
              jsPath = jsPath.substring(0, jsPath.length - 5) + '.fjs';
            } else {
              jsPath += '.js';
            }
          }
        } else {
          // Relative import
          if (jsPath.endsWith('.dart')) {
            jsPath = jsPath.substring(0, jsPath.length - 5) + '.fjs';
          } else {
            jsPath += '.js';
          }
        }

        // Ensure explicit relative path (e.g. 'models/file.js' -> './models/file.js')
        // Valid for any path that doesn't start with '.', '/', or '@' (scoped packages)
        if (!jsPath.startsWith('.') &&
            !jsPath.startsWith('/') &&
            !jsPath.startsWith('@')) {
          jsPath = './$jsPath';
        }

        // Generate Namespace Import
        final namespaceVar = '_import_${importCounter++}';
        localNamespaces.add(namespaceVar);

        if (importStmt.prefix != null) {
          code.writeln('import * as ${importStmt.prefix} from \'$jsPath\';');
          localNamespaces.removeLast(); // Don't merge prefixed imports
        } else {
          code.writeln('import * as $namespaceVar from \'$jsPath\';');

          // Apply show/hide filters if present
          if (importStmt.showList.isNotEmpty ||
              importStmt.hideList.isNotEmpty) {
            final show = importStmt.showList.map((s) => "'$s'").toList();
            final hide = importStmt.hideList.map((s) => "'$s'").toList();
            // Overwrite the namespace variable with the filtered version
            // We do this by re-assigning it to a new filtered const if possible,
            // but 'import * as' creates a constant module object.
            // So we create a NEW variable and replace the old one in localNamespaces

            final filteredVar = '${namespaceVar}_filtered';
            code.writeln(
              'const $filteredVar = _filterNamespace($namespaceVar, [${show.join(', ')}], [${hide.join(', ')}]);',
            );

            // Update the list to use the filtered variable instead of the raw import
            localNamespaces.removeLast();
            localNamespaces.add(filteredVar);
          }
        }
      }

      // -----------------------------------------------------------------------
      // RUNTIME SYMBOL RESOLUTION
      // -----------------------------------------------------------------------

      // Merge all unprefixed namespaces to resolve top-level symbols
      if (localNamespaces.isNotEmpty) {
        code.writeln();
        code.writeln('// Merging local imports for symbol resolution');
        code.writeln(
          'const __merged_imports = Object.assign({}, ${localNamespaces.join(", ")});',
        );

        // Filter function for show/hide support
        code.writeln('''
function _filterNamespace(ns, show, hide) {
  let res = Object.assign({}, ns);
  if (show && show.length > 0) {
    const newRes = {};
    show.forEach(k => { if (res[k]) newRes[k] = res[k]; });
    res = newRes;
  }
  if (hide && hide.length > 0) {
    hide.forEach(k => delete res[k]);
  }
  return res;
}
''');

        // Destructure required symbols
        // Symbols that are used but not defined locally and not in core

        // Primitives and basic types to ignore
        const ignoredTypes = {
          'int',
          'double',
          'num',
          'String',
          'bool',
          'void',
          'dynamic',
          'Object',
          'List',
          'Map',
          'Set',
          'Function',
          'null',
        };

        // Symbols that need resolution (Used but not defined, not resolved by core)
        final requiredSymbols = <String>{};

        // Collect all potential symbols and strip generics (e.g., List<User> -> List)
        final candidates = <String>{...usedWidgets, ...usedTypes};
        for (var symbol in candidates) {
          if (symbol.contains('<')) {
            symbol = symbol.substring(0, symbol.indexOf('<'));
          }
          requiredSymbols.add(symbol);
        }

        requiredSymbols.removeAll(definedNames);
        requiredSymbols.removeAll(materialImports);
        requiredSymbols.removeAll(ignoredTypes);

        if (requiredSymbols.isNotEmpty) {
          code.writeln('const {');
          for (final symbol in requiredSymbols.toList()..sort()) {
            // Skip Likely noise
            if (symbol.contains('.'))
              continue; // Prefixed usage (Prefix.Symbol)

            // Skip private symbols (starting with _) - they are class members, not imports
            if (symbol.startsWith('_')) continue;

            code.writeln('  $symbol,');
          }
          code.writeln('} = __merged_imports;');
        }
      }
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
      // Skip private classes (starting with _) - they are not publicly accessible
      if (cls.name.startsWith('_')) continue;
      code.writeln('  ${cls.name},');
    }

    for (final func in dartFile.functionDeclarations) {
      // Skip private functions (starting with _)
      if (func.name.startsWith('_')) continue;
      code.writeln('  ${func.name},');
    }

    for (final variable in dartFile.variableDeclarations) {
      // Skip private variables (starting with _)
      if (variable.name.startsWith('_')) continue;
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

  void _analyzeStatement(StatementIR stmt) {
    if (stmt is BlockStmt) {
      for (final s in stmt.statements) _analyzeStatement(s);
    } else if (stmt is IfStmt) {
      _analyzeExpression(stmt.condition);
      _analyzeStatement(stmt.thenBranch);
      if (stmt.elseBranch != null) _analyzeStatement(stmt.elseBranch!);
    } else if (stmt is ReturnStmt) {
      if (stmt.expression != null) _analyzeExpression(stmt.expression);
    } else if (stmt is ExpressionStmt) {
      _analyzeExpression(stmt.expression);
    } else if (stmt is VariableDeclarationStmt) {
      if (stmt.initializer != null) {
        _analyzeExpression(stmt.initializer!);
      }
    } else if (stmt is ForStmt) {
      if (stmt.initialization != null && stmt.initialization is StatementIR) {
        _analyzeStatement(stmt.initialization as StatementIR);
      } else if (stmt.initialization is ExpressionIR) {
        _analyzeExpression(stmt.initialization as ExpressionIR);
      }
      if (stmt.condition != null) _analyzeExpression(stmt.condition);
      for (final u in stmt.updaters) _analyzeExpression(u);
      _analyzeStatement(stmt.body);
    } else if (stmt is ForEachStmt) {
      _analyzeExpression(stmt.iterable);
      _analyzeStatement(stmt.body);
    } else if (stmt is WhileStmt) {
      _analyzeExpression(stmt.condition);
      _analyzeStatement(stmt.body);
    } else if (stmt is SwitchStmt) {
      _analyzeExpression(stmt.expression);
      for (final c in stmt.cases) {
        for (final s in c.statements) _analyzeStatement(s);
      }
      if (stmt.defaultCase != null) {
        for (final s in stmt.defaultCase!.statements) _analyzeStatement(s);
      }
    }
  }

  void _analyzeExpression(ExpressionIR? expr) {
    if (expr == null) return;

    if (expr is TypeCheckExpr) {
      usedTypes.add(expr.typeToCheck.displayName());
    } else if (expr is CastExpressionIR) {
      usedTypes.add(expr.targetType.displayName());
    }

    // Always detect widgets in any expression
    _detectWidgetsInExpression(expr);
  }

  void _detectWidgetsInExpression(ExpressionIR expr) {
    void addWidget(String name) {
      if (name.isEmpty) return;
      final rootName = name.split('.').first;
      // Heuristic: Class names are capitalized
      if (rootName.isNotEmpty && rootName[0].toUpperCase() == rootName[0]) {
        usedWidgets.add(rootName);
      }
    }

    if (expr is InstanceCreationExpressionIR) {
      addWidget(expr.type.displayName());

      for (final arg in expr.arguments) {
        _detectWidgetsInExpression(arg);
      }

      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is ConstructorCallExpressionIR) {
      // Handle ConstructorCallExpressionIR (used for Text, TextStyle, SizedBox, etc.)
      addWidget(expr.className);

      for (final arg in expr.positionalArguments) {
        _detectWidgetsInExpression(arg);
      }

      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is MethodCallExpressionIR) {
      // Detect widget constructors by capitalized method name
      if (expr.methodName.isNotEmpty) {
        addWidget(expr.methodName);
      }

      // For static method calls like Navigator.of(), detect the class name
      if (expr.target != null) {
        // If target is an identifier (e.g., Navigator in Navigator.of()), add it
        if (expr.target is IdentifierExpressionIR) {
          final targetName = (expr.target as IdentifierExpressionIR).name;
          addWidget(targetName);
        }
        _detectWidgetsInExpression(expr.target!);
      }

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
    } else if (expr is PropertyAccessExpressionIR) {
      if (expr.target is IdentifierExpressionIR) {
        final targetName = (expr.target as IdentifierExpressionIR).name;
        addWidget(targetName);
      }
    } else if (expr is IdentifierExpressionIR) {
      addWidget(expr.name);
    } else if (expr is FunctionExpressionIR) {
      // Analyze lambda/function bodies for widget usage
      if (expr.body != null) {
        for (final stmt in expr.body!.statements) {
          _analyzeStatement(stmt);
        }
      }
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
