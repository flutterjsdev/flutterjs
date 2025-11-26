// ============================================================================
// SYMMETRIC FUNCTION EXTRACTION SYSTEM
// ============================================================================
// Extracts BOTH widget functions AND pure Dart functions identically
// If widget: extract FlutterComponents
// If pure function: extract PureFunctionData (same depth/detail)
// ============================================================================
import 'package:flutterjs_core/src/code_reader/flutter_component_system.dart';
import 'package:meta/meta.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:flutterjs_core/flutterjs_core.dart';

/// ============================================================================
/// SYMMETRIC FUNCTION EXTRACTION SYSTEM
/// ============================================================================
///
/// Extracts *pure Dart functions* and *widget-producing functions* using a
/// unified, symmetric model. This allows the FlutterJS code reader to interpret
/// both UI code and logic code with equal depth, detail, and structure.
///
/// The system ensures that:
///   • Widget-returning functions → become `FlutterComponent` trees  
///   • Non-widget functions → become `PureFunctionData` variants  
///
/// This means every function in a file is analyzed, classified, normalized, and
/// stored in a consistent format, enabling:
///
///   ✔ Static analysis  
///   ✔ Code intelligence  
///   ✔ Visualization (UI + logic trees)  
///   ✔ Function summaries  
///   ✔ Cross-language transformations  
///
///
/// ============================================================================
/// 1. PURE FUNCTION DATA MODEL
/// ============================================================================
///
/// Pure Dart functions are represented using the same base model (`FlutterComponent`)
/// for maximum compatibility with widget components. Each specialized function
/// category (validation, computation, factory, helpers, mixed) extends
/// `FlutterComponent` and provides:
///
///   • A name / signature  
///   • Input & output types  
///   • Structured body statements (`StatementIR`)  
///   • Complexity metrics (loops, conditions)  
///   • Semantic analysis data  
///
/// This allows a pure function to be analyzed just as deeply as a widget tree.
///
///
/// ============================================================================
/// 2. PURE FUNCTION DATA TYPES
/// ============================================================================
///
/// Supported pure function categories include:
///
///   • `ComputationFunctionData`  
///        Mathematical / transformation logic  
///        Tracks loop depth, conditional depth, variable count, etc.
///
///   • `ValidationFunctionData`  
///        Checks, rules, assertions, boolean returns  
///
///   • `FactoryFunctionData`  
///        Object creation & field initialization  
///
///   • `HelperFunctionData`  
///        Setup/configure/prepare/reset/cleanup style functions  
///        Includes side-effect detection  
///
///   • `MixedFunctionData`  
///        Functions containing multiple semantic components  
///
/// Each type has a `describe()` method and a JSON representation.
///
///
/// ============================================================================
/// 3. PURE FUNCTION EXTRACTOR
/// ============================================================================
///
/// `PureFunctionExtractor` is the symmetric counterpart to `ComponentExtractor`.
/// While `ComponentExtractor` extracts *widgets*, this extractor analyzes *pure
/// logic functions* and classifies them into specific semantic buckets.
///
/// Extraction workflow:
///
///   1. Classify function  
///         → Based on naming conventions + statement structure  
///
///   2. Run specialized extractor method  
///         → `_extractComputation()`  
///         → `_extractValidation()`  
///         → `_extractFactory()`  
///         → `_extractHelper()`  
///         → Fallback to generic extraction  
///
///   3. Generate typed `FlutterComponent`-based function data  
///
/// This gives every standalone function a clear, analyzable structure.
///
///
/// ============================================================================
/// 4. CLASSIFICATION LOGIC
/// ============================================================================
///
/// The system uses combined heuristics:
///
///   • Name-based signals:  
///       “validate…” → validation  
///       “create…/build…” → factory  
///       “calculate…/convert…” → computation  
///       “setup…/initialize…” → helper  
///
///   • Structural signals:  
///       loops     → computation  
///       conditionals → computation or validation  
///
///   • Fallbacks:  
///       complex logic → computation  
///       simple logic  → helper  
///
/// This enables highly accurate auto-classification of arbitrary functions.
///
///
/// ============================================================================
/// 5. SYMMETRIC INTEGRATION (DeclarationPass)
/// ============================================================================
///
/// `DeclarationPass` integrates symmetric extraction:
///
///   • Widget-producing functions → extracted as FlutterComponents  
///   • Pure functions → extracted as PureFunctionData  
///
/// Inside `visitFunctionDeclaration`:
///
///   1. Determine if function produces a widget (via WidgetProducerDetector)  
///   2. Extract body statements (for *all* functions)  
///   3. If widget:  
///         → Use ComponentExtractor  
///   4. If pure function:  
///         → Use PureFunctionExtractor  
///   5. Annotate FunctionDecl with metadata:
///         - extractionType: widget / pure_function  
///         - componentCount or dataType  
///
/// This creates a unified representation of ALL functions in the file.
///
///
/// ============================================================================
/// 6. DESIGN GOALS & ADVANTAGES
/// ============================================================================
///
/// This symmetric extraction system provides:
///
/// ✔ One extraction pipeline for *both UI and logic*  
/// ✔ Deep statement-level analysis for pure functions  
/// ✔ Compatibility with UI component structures  
/// ✔ Extensibility for new function categories  
/// ✔ Support for advanced analysis (complexity, flow, rules, etc.)  
/// ✔ Perfect integration with the component tree visualizer  
///
///
/// ============================================================================
/// REQUIREMENTS
/// ============================================================================
///
/// This system depends on:
///
///   • `ComponentExtractor` (for widget functions)  
///   • `StatementExtractorPass` (for IR-level statements)  
///   • `WidgetProducerDetector` (to detect UI-returning functions)  
///   • `SourceLocationIR` mapping  
///
///
/// ============================================================================
/// SUMMARY
/// ============================================================================
///
/// The Symmetric Function Extraction System enables the FlutterJS code reader to
/// understand **every function**, not only UI-building ones. It builds a bridge
/// between UI components and pure computation logic, enabling a merged world
/// where the entire file—widgets, transforms, validators, and helpers—is
/// represented uniformly as structured, typed components.
///
/// This unlocks powerful features:
///
///   • Code editors & visualizers  
///   • Smart refactoring  
///   • Cross-platform rewriters  
///   • Code intelligence  
///   • Static analysis at UI + logic levels  
/// ============================================================================

@immutable
class ComputationFunctionData extends FlutterComponent {
  final String inputType;
  final String outputType;
  final List<StatementIR> computationSteps;
  final int loopDepth;
  final int conditionalDepth;
  final Map<String, dynamic> analysis;

  const ComputationFunctionData({
    required super.id,
    required super.displayName,
    required this.inputType,
    required this.outputType,
    required this.computationSteps,
    required super.sourceLocation,
    this.loopDepth = 0,
    this.conditionalDepth = 0,
    this.analysis = const {},
    super.metadata,
  }) : super(type: ComponentType.computation);

  @override
  String describe() =>
      '$displayName($inputType) → $outputType [loops: $loopDepth, conditions: $conditionalDepth]';

  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'computation',
    'function': displayName,
    'input': inputType,
    'output': outputType,
    'steps': computationSteps.length,
    'loopDepth': loopDepth,
    'conditionalDepth': conditionalDepth,
    'analysis': analysis,
    'location': sourceLocation.toJson(),
  };
}

@immutable
class ValidationFunctionData extends FlutterComponent {
  final String targetType;
  final List<String> validationRules;
  final String returnType;
  final List<StatementIR> validationSteps;
  final Map<String, dynamic> analysis;

  const ValidationFunctionData({
    required super.id,
    required super.displayName,
    required this.targetType,
    required this.validationRules,
    required this.returnType,
    required this.validationSteps,
    required super.sourceLocation,
    this.analysis = const {},
    super.metadata,
  }) : super(type: ComponentType.validation);

  @override
  String describe() =>
      '$displayName($targetType) → $returnType [${validationRules.length} rules]';

  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'validation',
    'function': displayName,
    'target': targetType,
    'rules': validationRules,
    'return': returnType,
    'steps': validationSteps.length,
    'analysis': analysis,
    'location': sourceLocation.toJson(),
  };
}

@immutable
class FactoryFunctionData extends FlutterComponent {
  final String producedType;
  final List<String> parameters;
  final List<StatementIR> creationSteps;
  final List<String> initializedFields;
  final Map<String, dynamic> analysis;

  const FactoryFunctionData({
    required super.id,
    required super.displayName,
    required this.producedType,
    required this.parameters,
    required this.creationSteps,
    required this.initializedFields,
    required super.sourceLocation,
    this.analysis = const {},
    super.metadata,
  }) : super(type: ComponentType.factory);

  @override
  String describe() =>
      '$displayName(${parameters.join(', ')}) → $producedType [${initializedFields.length} fields]';

  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'factory',
    'function': displayName,
    'produces': producedType,
    'parameters': parameters,
    'steps': creationSteps.length,
    'initializedFields': initializedFields,
    'analysis': analysis,
    'location': sourceLocation.toJson(),
  };
}

@immutable
class HelperFunctionData extends FlutterComponent {
  final List<String> sideEffects;
  final List<StatementIR> steps;
  final String purpose;
  final Map<String, dynamic> analysis;

  const HelperFunctionData({
    required super.id,
    required super.displayName,
    required this.sideEffects,
    required this.steps,
    required this.purpose,
    required super.sourceLocation,
    this.analysis = const {},
    super.metadata,
  }) : super(type: ComponentType.helper);

  @override
  String describe() =>
      '$displayName [$purpose] - ${sideEffects.length} side effects';

  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'helper',
    'function': displayName,
    'purpose': purpose,
    'sideEffects': sideEffects,
    'steps': steps.length,
    'analysis': analysis,
    'location': sourceLocation.toJson(),
  };
}

@immutable
class MixedFunctionData extends FlutterComponent {
  final List<FlutterComponent> components;
  final Map<String, dynamic> analysis;

  const MixedFunctionData({
    required super.id,
    required super.displayName,
    required this.components,
    required super.sourceLocation,
    this.analysis = const {},
    super.metadata,
  }) : super(type: ComponentType.mixed);

  @override
  bool get canContainChildren => true;

  @override
  String describe() => '$displayName [${components.length} components]';

  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'mixed',
    'function': displayName,
    'components': [for (final c in components) c.toJson()],
    'analysis': analysis,
    'location': sourceLocation.toJson(),
  };
}

// ============================================================================
// 3. PURE FUNCTION EXTRACTOR (Symmetric to ComponentExtractor)
// ============================================================================

class PureFunctionExtractor {
  final String filePath;
  final String fileContent;
  final DartFileBuilder builder;
  final String id;

  int _idCounter = 0;

  PureFunctionExtractor({
    required this.filePath,
    required this.fileContent,
    required this.builder,
    required this.id,
  });

  String _generateId(String prefix) => '${prefix}_${++_idCounter}';

  SourceLocationIR _makeLocation(int offset, int length) {
    int line = 1, column = 1;
    for (int i = 0; i < offset && i < fileContent.length; i++) {
      if (fileContent[i] == '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    return SourceLocationIR(
      id: id,
      file: filePath,
      line: line,
      column: column,
      offset: offset,
      length: length,
    );
  }

  /// Main extraction method - analyze pure function like ComponentExtractor analyzes widgets
  FlutterComponent extract({
    required FunctionDeclaration node,
    required String functionName,
    required List<StatementIR> bodyStatements,
  }) {
    try {
      // Classify the pure function type
      final functionKind = _classifyPureFunction(functionName, bodyStatements);

      print('   📊 [PureFunctionExtractor] Analyzing as: $functionKind');

      // Extract based on type
      final data = switch (functionKind) {
        'computation' => _extractComputation(
          node,
          functionName,
          bodyStatements,
        ),
        'validation' => _extractValidation(node, functionName, bodyStatements),
        'factory' => _extractFactory(node, functionName, bodyStatements),
        'helper' => _extractHelper(node, functionName, bodyStatements),
        _ => _extractGeneric(node, functionName, bodyStatements),
      };

      return data;
    } catch (e) {
      print('      ❌ Extraction failed: $e');

      // Fallback: generic extraction
      return _extractGeneric(node, functionName, bodyStatements);
    }
  }

  FlutterComponent extractMethod({
    required MethodDeclaration node,
    required String functionName,
    required String className,
    required List<StatementIR> bodyStatements,
  }) {
    try {
      // Classify the pure function type
      final functionKind = _classifyPureFunction(functionName, bodyStatements);

      print('   📊 [PureFunctionExtractor] Analyzing as: $functionKind');

      // Extract based on type
      final data = switch (functionKind) {
        'computation' => _extractComputationFromMethod(
          node,
          functionName,
          className,
          bodyStatements,
        ),
        'validation' => _extractValidationFromMethod(
          node,
          functionName,
          className,
          bodyStatements,
        ),
        'factory' => _extractFactoryFromMethod(
          node,
          functionName,
          className,
          bodyStatements,
        ),
        'helper' => _extractHelperFromMethod(
          node,
          functionName,
          className,
          bodyStatements,
        ),
        _ => _extractGenericFromMethod(
          node,
          functionName,
          className,
          bodyStatements,
        ),
      };

      return data;
    } catch (e) {
      print('      ❌ Extraction failed: $e');

      // Fallback: generic extraction
      return _extractGenericFromMethod(
        node,
        functionName,
        className,
        bodyStatements,
      );
    }
  }

  // =========================================================================
  // Classification
  // =========================================================================

  String _classifyPureFunction(
    String functionName,
    List<StatementIR> statements,
  ) {
    final nameLower = functionName.toLowerCase();

    // Validation
    if (nameLower.startsWith('validate') ||
        nameLower.startsWith('verify') ||
        nameLower.startsWith('check') ||
        nameLower.startsWith('is') ||
        nameLower.startsWith('has')) {
      return 'validation';
    }

    // Factory/Creation
    if (nameLower.startsWith('create') ||
        nameLower.startsWith('make') ||
        nameLower.startsWith('build') ||
        nameLower.startsWith('construct')) {
      return 'factory';
    }

    // Helper/Setup
    if (nameLower.startsWith('initialize') ||
        nameLower.startsWith('setup') ||
        nameLower.startsWith('configure') ||
        nameLower.startsWith('prepare')) {
      return 'helper';
    }

    // Computation (default for calculation-like)
    if (nameLower.startsWith('calculate') ||
        nameLower.startsWith('compute') ||
        nameLower.startsWith('format') ||
        nameLower.startsWith('transform') ||
        nameLower.startsWith('convert')) {
      return 'computation';
    }

    // Heuristic: if has loops/conditionals, likely computation
    final hasLoops = statements.any(
      (s) => s is ForStmt || s is ForEachStmt || s is WhileStmt,
    );
    final hasConditionals = statements.any((s) => s is IfStmt);

    if (hasLoops || (hasConditionals && statements.length > 2)) {
      return 'computation';
    }

    return 'generic';
  }

  // =========================================================================
  // Extraction Strategies
  // =========================================================================

  ComputationFunctionData _extractComputation(
    FunctionDeclaration node,
    String functionName,
    List<StatementIR> bodyStatements,
  ) {
    print('      ✅ Extracting computation function...');

    int loopDepth = 0;
    int conditionalDepth = 0;
    final analysis = <String, dynamic>{};

    // Analyze structure
    for (final stmt in bodyStatements) {
      if (stmt is ForStmt || stmt is ForEachStmt) {
        loopDepth++;
      }
      if (stmt is IfStmt) {
        conditionalDepth++;
      }
    }

    final inputType =
        node
            .functionExpression
            .parameters
            ?.parameters
            .firstOrNull
            ?.name
            ?.lexeme ??
        'input';
    final outputType = node.returnType?.toString() ?? 'dynamic';

    analysis['statementsCount'] = bodyStatements.length;
    analysis['hasReturn'] = bodyStatements.any((s) => s is ReturnStmt);
    analysis['variableCount'] = bodyStatements
        .whereType<VariableDeclarationStmt>()
        .length;

    return ComputationFunctionData(
      id: _generateId('computation'),
      displayName: functionName,
      inputType: inputType,
      outputType: outputType,
      computationSteps: bodyStatements,
      sourceLocation: _makeLocation(node.offset, node.length),
      loopDepth: loopDepth,
      conditionalDepth: conditionalDepth,
      analysis: analysis,
    );
  }

  ComputationFunctionData _extractComputationFromMethod(
    MethodDeclaration node,
    String methodName,
    String className,
    List<StatementIR> bodyStatements,
  ) {
    print('      Extracting computation method: $className.$methodName');

    int loopDepth = 0;
    int conditionalDepth = 0;
    final analysis = <String, dynamic>{};

    // Structural analysis
    for (final stmt in bodyStatements) {
      if (stmt is ForStmt || stmt is ForEachStmt) loopDepth++;
      if (stmt is IfStmt) conditionalDepth++;
    }

    final inputType =
        node.parameters?.parameters.firstOrNull?.name?.lexeme ?? 'input';

    final outputType = node.returnType?.toString() ?? 'dynamic';

    analysis
      ..['statementsCount'] = bodyStatements.length
      ..['hasReturn'] = bodyStatements.any((s) => s is ReturnStmt)
      ..['variableCount'] = bodyStatements
          .whereType<VariableDeclarationStmt>()
          .length;

    return ComputationFunctionData(
      id: builder.generateId('computation_method', '$className.$methodName'),
      displayName: '$className.$methodName',
      inputType: inputType,
      outputType: outputType,
      computationSteps: bodyStatements,
      sourceLocation: _makeLocation(node.offset, node.length),
      loopDepth: loopDepth,
      conditionalDepth: conditionalDepth,
      analysis: analysis,
    );
  }

  ValidationFunctionData _extractValidation(
    FunctionDeclaration node,
    String functionName,
    List<StatementIR> bodyStatements,
  ) {
    print('      ✅ Extracting validation function...');

    final targetType =
        node
            .functionExpression
            .parameters
            ?.parameters
            .firstOrNull
            ?.name
            ?.lexeme ??
        'target';
    final returnType = node.returnType?.toString() ?? 'bool';

    // Extract validation rules from conditionals
    final rules = <String>[];
    for (final stmt in bodyStatements) {
      if (stmt is IfStmt) {
        rules.add('Rule: ${stmt.condition.toString()}');
      }
    }

    final analysis = <String, dynamic>{
      'ruleCount': rules.length,
      'statementsCount': bodyStatements.length,
      'hasEarlyReturn': bodyStatements.any(
        (s) =>
            s is ReturnStmt &&
            bodyStatements.indexOf(s) < bodyStatements.length - 1,
      ),
    };

    return ValidationFunctionData(
      id: _generateId('validation'),
      displayName: functionName,
      targetType: targetType,
      validationRules: rules,
      returnType: returnType,
      validationSteps: bodyStatements,
      sourceLocation: _makeLocation(node.offset, node.length),
      analysis: analysis,
    );
  }

  ValidationFunctionData _extractValidationFromMethod(
    MethodDeclaration node,
    String methodName,
    String className,
    List<StatementIR> bodyStatements,
  ) {
    print('      Extracting validation method: $className.$methodName');

    final targetType =
        node.parameters?.parameters.firstOrNull?.name?.lexeme ?? 'target';

    final returnType = node.returnType?.toString() ?? 'bool';

    // Extract validation rules from if-statements
    final rules = <String>[];
    for (final stmt in bodyStatements) {
      if (stmt is IfStmt) {
        rules.add('Rule: ${stmt.condition.toString()}');
      }
    }

    final analysis = <String, dynamic>{
      'ruleCount': rules.length,
      'statementsCount': bodyStatements.length,
      'hasEarlyReturn': bodyStatements.any(
        (s) =>
            s is ReturnStmt &&
            bodyStatements.indexOf(s) < bodyStatements.length - 1,
      ),
    };

    return ValidationFunctionData(
      id: builder.generateId('validation_method', '$className.$methodName'),
      displayName: '$className.$methodName',
      targetType: targetType,
      validationRules: rules,
      returnType: returnType,
      validationSteps: bodyStatements,
      sourceLocation: _makeLocation(node.offset, node.length),
      analysis: analysis,
    );
  }

  FactoryFunctionData _extractFactory(
    FunctionDeclaration node,
    String functionName,
    List<StatementIR> bodyStatements,
  ) {
    print('      ✅ Extracting factory function...');

    final producedType = node.returnType?.toString() ?? 'dynamic';
    final parameters =
        node.functionExpression.parameters?.parameters
            .map((p) => p.name?.lexeme ?? '')
            .where((n) => n.isNotEmpty)
            .toList() ??
        [];

    // Extract initialized fields
    final initializedFields = <String>[];
    for (final stmt in bodyStatements) {
      if (stmt is VariableDeclarationStmt) {
        initializedFields.add(stmt.name);
      }
    }

    final analysis = <String, dynamic>{
      'parameterCount': parameters.length,
      'fieldCount': initializedFields.length,
      'statementsCount': bodyStatements.length,
    };

    return FactoryFunctionData(
      id: _generateId('factory'),
      displayName: functionName,
      producedType: producedType,
      parameters: parameters,
      creationSteps: bodyStatements,
      initializedFields: initializedFields,
      sourceLocation: _makeLocation(node.offset, node.length),
      analysis: analysis,
    );
  }

  FactoryFunctionData _extractFactoryFromMethod(
    MethodDeclaration node,
    String methodName,
    String className,
    List<StatementIR> bodyStatements,
  ) {
    print('      Extracting factory method: $className.$methodName');

    final producedType = node.returnType?.toString() ?? 'dynamic';

    final parameters =
        node.parameters?.parameters
            .map((p) => p.name?.lexeme ?? '')
            .where((n) => n.isNotEmpty)
            .toList() ??
        <String>[];

    // Extract initialized fields (could be instance fields or local vars)
    final initializedFields = <String>[];
    for (final stmt in bodyStatements) {
      if (stmt is VariableDeclarationStmt) {
        initializedFields.add(stmt.name);
      }
    }

    final analysis = <String, dynamic>{
      'parameterCount': parameters.length,
      'fieldCount': initializedFields.length,
      'statementsCount': bodyStatements.length,
      'hasReturn': bodyStatements.any((s) => s is ReturnStmt),
    };

    return FactoryFunctionData(
      id: builder.generateId('factory_method', '$className.$methodName'),
      displayName: '$className.$methodName',
      producedType: producedType,
      parameters: parameters,
      creationSteps: bodyStatements,
      initializedFields: initializedFields,
      sourceLocation: _makeLocation(node.offset, node.length),
      analysis: analysis,
    );
  }

  HelperFunctionData _extractHelper(
    FunctionDeclaration node,
    String functionName,
    List<StatementIR> bodyStatements,
  ) {
    print('      ✅ Extracting helper function...');

    final sideEffects = <String>[];

    // Detect side effects (assignments, calls)
    for (final stmt in bodyStatements) {
      if (stmt is VariableDeclarationStmt && stmt.initializer != null) {
        sideEffects.add('Initialize ${stmt.name}');
      }
      if (stmt is ExpressionStmt) {
        sideEffects.add('Expression: ${stmt.expression.toShortString()}');
      }
    }

    final purpose = _determinePurpose(functionName);

    final analysis = <String, dynamic>{
      'sideEffectCount': sideEffects.length,
      'statementsCount': bodyStatements.length,
    };

    return HelperFunctionData(
      id: _generateId('helper'),
      displayName: functionName,
      sideEffects: sideEffects,
      steps: bodyStatements,
      purpose: purpose,
      sourceLocation: _makeLocation(node.offset, node.length),
      analysis: analysis,
    );
  }

  HelperFunctionData _extractHelperFromMethod(
    MethodDeclaration node,
    String methodName,
    String className,
    List<StatementIR> bodyStatements,
  ) {
    print('      Extracting helper method: $className.$methodName');

    final sideEffects = <String>[];

    for (final stmt in bodyStatements) {
      if (stmt is VariableDeclarationStmt && stmt.initializer != null) {
        sideEffects.add('Initialize ${stmt.name}');
      }
      if (stmt is ExpressionStmt) {
        sideEffects.add('Expression: ${stmt.expression.toShortString()}');
      }
    }

    final purpose = _determinePurpose(methodName);

    final analysis = <String, dynamic>{
      'sideEffectCount': sideEffects.length,
      'statementsCount': bodyStatements.length,
      'hasComplexLogic': bodyStatements.any(
        (s) => s is ForStmt || s is ForEachStmt || s is IfStmt || s is TryStmt,
      ),
    };

    return HelperFunctionData(
      id: builder.generateId('helper_method', '$className.$methodName'),
      displayName: '$className.$methodName',
      sideEffects: sideEffects,
      steps: bodyStatements,
      purpose: purpose,
      sourceLocation: _makeLocation(node.offset, node.length),
      analysis: analysis,
    );
  }

  FlutterComponent _extractGeneric(
    FunctionDeclaration node,
    String functionName,
    List<StatementIR> bodyStatements,
  ) {
    print('      ⚠️  Could not classify - extracting as generic');

    // Try to infer from multiple signals
    final hasComplexLogic = bodyStatements.any(
      (s) => s is ForStmt || s is ForEachStmt || s is IfStmt || s is TryStmt,
    );

    if (hasComplexLogic) {
      return _extractComputation(node, functionName, bodyStatements);
    }

    // Fallback to helper
    return _extractHelper(node, functionName, bodyStatements);
  }

  FlutterComponent _extractGenericFromMethod(
    MethodDeclaration node,
    String methodName,
    String className,
    List<StatementIR> bodyStatements,
  ) {
    print(
      '      Warning Could not classify method: $className.$methodName → falling back',
    );

    final hasComplexLogic = bodyStatements.any(
      (s) => s is ForStmt || s is ForEachStmt || s is IfStmt || s is TryStmt,
    );

    if (hasComplexLogic) {
      final data = _extractComputationFromMethod(
        node,
        methodName,
        className,
        bodyStatements,
      );
      print('         → Classified as computation (fallback)');
      return data;
    }

    final data = _extractHelperFromMethod(
      node,
      methodName,
      className,
      bodyStatements,
    );
    print('         → Classified as helper (fallback)');
    return data;
  }

  String _determinePurpose(String functionName) {
    final lower = functionName.toLowerCase();

    if (lower.startsWith('initialize')) return 'Initialization';
    if (lower.startsWith('setup')) return 'Setup';
    if (lower.startsWith('configure')) return 'Configuration';
    if (lower.startsWith('prepare')) return 'Preparation';
    if (lower.startsWith('reset')) return 'Reset';
    if (lower.startsWith('dispose')) return 'Cleanup';

    return 'Helper';
  }
}

// ============================================================================
// 4. SYMMETRIC EXTRACTION IN DeclarationPass
// ============================================================================

/*
USAGE in declaration_pass.dart:

class DeclarationPass {
  late final PureFunctionExtractor pureFunctionExtractor;

  void _initializeComponentSystem() {
    // ... existing code ...
    pureFunctionExtractor = PureFunctionExtractor(
      filePath: filePath,
      fileContent: fileContent,
      builder: builder,
      id: builder.generateId('pure_extractor'),
    );
  }

  @override
  void visitFunctionDeclaration(FunctionDeclaration node) {
    if (_currentClass != null) {
      super.visitFunctionDeclaration(node);
      return;
    }

    final funcName = node.name.lexeme;
    print('🔧 [Function] $funcName()');

    // =========================================================================
    // STEP 1: Determine if widget or pure function
    // =========================================================================
    bool isWidgetFunc = false;

    if (widgetDetector != null) {
      final execElement = node.declaredFragment?.element;
      if (execElement != null) {
        isWidgetFunc = widgetDetector!.producesWidget(execElement);
      }
    }

    // =========================================================================
    // STEP 2: Extract body statements (ALWAYS)
    // =========================================================================
    final bodyStatements = _statementExtractor.extractBodyStatements(
      node.functionExpression.body,
    );

    print('   📦 Body statements: ${bodyStatements.length}');

    // =========================================================================
    // STEP 3: IF WIDGET - Extract FlutterComponents
    // =========================================================================
    final components = <FlutterComponent>[];

    if (isWidgetFunc && bodyStatements.isNotEmpty) {
      print('   🎨 [ComponentSystem] WIDGET - Extracting components...');

      for (final stmt in bodyStatements) {
        if (stmt is ReturnStmt && stmt.expression != null) {
          try {
            final component = componentExtractor.extract(
              stmt.expression,
              hint: 'return_statement',
            );
            components.add(component);
            print('      ✅ ${component.describe()}');
            _printComponentTree(component, depth: 3);
          } catch (e) {
            print('      ❌ Extract failed: $e');
            components.add(UnsupportedComponent(
              id: builder.generateId('unsupported'),
              sourceCode: stmt.expression.toString(),
              sourceLocation: _makeSourceLocation(stmt.sourceLocation.offset),
              reason: 'Exception: $e',
            ));
          }
        } else if (stmt is VariableDeclarationStmt && stmt.initializer != null) {
          try {
            final component = componentExtractor.extract(
              stmt.initializer,
              hint: 'variable_assignment',
            );
            components.add(component);
            print('      ✅ ${component.describe()} in ${stmt.name}');
          } catch (_) {}
        }
      }

      print('   🎨 [ComponentSystem] Extracted ${components.length} components');
      final funcId = builder.generateId('func', funcName);
      functionComponents[funcId] = components;
    }
    // =========================================================================
    // ELSE IF PURE FUNCTION - Extract PureFunctionData
    // =========================================================================
    else if (!isWidgetFunc && bodyStatements.isNotEmpty) {
      print('   🔢 [PureFunctionExtractor] PURE FUNCTION - Analyzing...');

      final pureFunctionData = pureFunctionExtractor.extract(
        node: node,
        functionName: funcName,
        bodyStatements: bodyStatements,
      );

      print('      ✅ ${pureFunctionData.describe()}');

      // Store for later use
      final funcId = builder.generateId('func', funcName);
      functionComponents[funcId] = [pureFunctionData]; // Store as list for consistency
    }

    // =========================================================================
    // STEP 4: Create FunctionDecl
    // =========================================================================
    final functionDecl = FunctionDecl(
      id: builder.generateId('func', funcName),
      name: funcName,
      returnType: _extractTypeFromAnnotation(node.returnType, node.name.offset),
      parameters: _extractParameters(node.functionExpression.parameters),
      body: bodyStatements,
      isAsync: node.functionExpression.body.isAsynchronous,
      isGenerator: node.functionExpression.body.isGenerator,
      typeParameters: _extractTypeParameters(
        node.functionExpression.typeParameters,
      ),
      documentation: _extractDocumentation(node),
      annotations: _extractAnnotations(node.metadata),
      sourceLocation: _extractSourceLocation(node, node.name.offset),
    );

    // =========================================================================
    // STEP 5: Attach extraction metadata
    // =========================================================================
    if (isWidgetFunc) {
      functionDecl.markAsWidgetFunction(isWidgetFun: true);
      functionDecl.metadata['extractionType'] = 'widget';
      functionDecl.metadata['components'] = components;
      functionDecl.metadata['componentCount'] = components.length;
      print('   🏷️  Marked as WIDGET function');
    } else {
      functionDecl.metadata['extractionType'] = 'pure_function';
      if (functionComponents.containsKey(functionDecl.id)) {
        final data = functionComponents[functionDecl.id];
        functionDecl.metadata['functionData'] = data;
        if (data.isNotEmpty) {
          functionDecl.metadata['dataType'] = data[0].runtimeType.toString();
        }
      }
      print('   🏷️  Marked as PURE FUNCTION');
    }

    _topLevelFunctions.add(functionDecl);
    super.visitFunctionDeclaration(node);
  }
}
*/
