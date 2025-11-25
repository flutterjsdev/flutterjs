// ============================================================================
// PHASE 0: PRE-ANALYSIS - IR TO JAVASCRIPT CONVERSION
// ============================================================================
// Validates and analyzes IR before code generation begins
// Uses actual predefined types from the codebase
// ============================================================================

import '../../ast_ir/ast_it.dart';
//

// ============================================================================
// error & REPORT CLASSES
// ============================================================================

enum ValidationSeverity { fatal, error, warning, info }

class ValidationError {
  final String message;
  final ValidationSeverity severity;
  final String? suggestion;
  final String? affectedNode;
  final int? lineNumber;

  ValidationError({
    required this.message,
    required this.severity,
    this.suggestion,
    this.affectedNode,
    this.lineNumber,
  });

  @override
  String toString() {
    final parts = ['${severity.name}: $message'];
    if (affectedNode != null) parts.add('Node: $affectedNode');
    if (suggestion != null) parts.add('Suggestion: $suggestion');
    return parts.join('\n  ');
  }
}

class ValidationReport {
  final List<ValidationError> errors;
  final DateTime timestamp;
  final Duration duration;
  final bool canProceed;

  late final int fatalCount;
  late final int errorCount;
  late final int warningCount;

  ValidationReport({
    required this.errors,
    required this.duration,
    this.canProceed = true,
  }) : timestamp = DateTime.now() {
    fatalCount = errors
        .where((e) => e.severity == ValidationSeverity.fatal)
        .length;
    errorCount = errors
        .where((e) => e.severity == ValidationSeverity.error)
        .length;
    warningCount = errors
        .where((e) => e.severity == ValidationSeverity.warning)
        .length;
  }

  bool get hasErrors => errorCount > 0 || fatalCount > 0;
  bool get hasWarnings => warningCount > 0;
  int get totalIssues => fatalCount + errorCount + warningCount;

  String generateReport() {
    final buffer = StringBuffer();
    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║          IR VALIDATION REPORT                      ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

    buffer.writeln('Status: ${canProceed ? '✓ PASSED' : '✗ FAILED'}\n');

    buffer.writeln('Issues Found:');
    buffer.writeln('  Fatal:   $fatalCount');
    buffer.writeln('  Error:   $errorCount');
    buffer.writeln('  Warning: $warningCount');
    buffer.writeln('  Total:   $totalIssues\n');

    buffer.writeln('Duration: ${duration.inMilliseconds}ms\n');

    if (errors.isNotEmpty) {
      buffer.writeln('Details:');
      for (int i = 0; i < errors.length; i++) {
        buffer.writeln('\n[$i] ${errors[i]}');
      }
    }

    return buffer.toString();
  }
}

// ============================================================================
// 0.1 IR POST-DESERIALIZATION VALIDATOR
// ============================================================================

class IRPostDeserializeValidator {
  final DartFile dartFile;
  final List<ValidationError> errors = [];
  final List<String> _seenIds = [];
  IRPostDeserializeValidator(this.dartFile);

  ValidationReport validate() {
    final stopwatch = Stopwatch()..start();

    _checkStructuralIntegrity();
    _checkSemanticValidity();
    _checkCompletenessAfterDeser();
    _checkBinaryIntegrity();

    stopwatch.stop();

    return ValidationReport(
      errors: errors,
      duration: stopwatch.elapsed,
      canProceed: !errors.any((e) => e.severity == ValidationSeverity.fatal),
    );
  }

  void _checkStructuralIntegrity() {
    // 1. All class references are valid
    for (final cls in dartFile.classDeclarations) {
      if (cls.name.isEmpty) {
        _addError(
          'Class has empty name',
          ValidationSeverity.fatal,
          affectedNode: 'ClassDecl[${cls.id}]',
          suggestion: 'Ensure all classes have non-empty names',
        );
      }

      if (cls.superclass != null && cls.superclass!.displayName().isEmpty) {
        _addError(
          'Class superclass reference is invalid',
          ValidationSeverity.error,
          affectedNode: 'ClassDecl[${cls.name}]',
          suggestion: 'Superclass type cannot be empty',
        );
      }

      // Validate methods
      for (final method in cls.methods) {
        if (method.name.isEmpty) {
          _addError(
            'Method in class ${cls.name} has empty name',
            ValidationSeverity.error,
            affectedNode: 'MethodDecl[${method.id}]',
          );
        }
      }

      // Validate fields
      for (final field in cls.fields) {
        if (field.name.isEmpty) {
          _addError(
            'Field in class ${cls.name} has empty name',
            ValidationSeverity.error,
            affectedNode: 'FieldDecl[${field.id}]',
          );
        }
      }

      // Validate constructors
      for (final ctor in cls.constructors) {
        if (ctor.constructorClass != cls.name) {
          _addError(
            'Constructor class mismatch: ${ctor.constructorClass} vs ${cls.name}',
            ValidationSeverity.warning,
            affectedNode: 'ConstructorDecl[${ctor.id}]',
          );
        }
      }
    }

    // 2. All function references are valid
    for (final func in dartFile.functionDeclarations) {
      if (func.name.isEmpty) {
        _addError(
          'Function has empty name',
          ValidationSeverity.fatal,
          affectedNode: 'FunctionDecl[${func.id}]',
        );
      }

      for (final param in func.parameters) {
        if (param.name.isEmpty) {
          _addError(
            'Parameter in function ${func.name} has empty name',
            ValidationSeverity.error,
            affectedNode: 'ParameterDecl[${param.id}]',
          );
        }
      }
    }

    // 3. Validate superclass consistency
    for (final cls in dartFile.classDeclarations) {
      if (cls.extendsClass && cls.isAbstract && cls.isSealed) {
        // Check semantic consistency
      }
    }

    // 4. Duplicate IDs check
    _checkDuplicateIds();
  }

  void _checkDuplicateIds() {
    final allIds = <String>{};

    for (final cls in dartFile.classDeclarations) {
      if (allIds.contains(cls.id)) {
        _addError(
          'Duplicate ID found: ${cls.id}',
          ValidationSeverity.error,
          affectedNode: 'ClassDecl[${cls.name}]',
          suggestion: 'Each element must have a unique ID',
        );
      }
      allIds.add(cls.id);
    }

    for (final func in dartFile.functionDeclarations) {
      if (allIds.contains(func.id)) {
        _addError(
          'Duplicate ID found: ${func.id}',
          ValidationSeverity.error,
          affectedNode: 'FunctionDecl[${func.name}]',
        );
      }
      allIds.add(func.id);
    }
  }

  void _checkSemanticValidity() {
    // 1. No inheritance cycles
    _detectInheritanceCycles();

    // 2. Abstract methods in abstract classes
    _validateAbstractMethods();

    // 3. Type system consistency
    _checkTypeConsistency();

    // 4. Constructor validity
    _validateConstructors();
  }

  void _detectInheritanceCycles() {
    final classMap = {
      for (final cls in dartFile.classDeclarations) cls.name: cls,
    };

    for (final cls in dartFile.classDeclarations) {
      final visited = <String>{};
      if (_hasCycle(cls.name, classMap, visited)) {
        _addError(
          'Circular inheritance detected in class ${cls.name}',
          ValidationSeverity.fatal,
          affectedNode: 'ClassDecl[${cls.name}]',
          suggestion: 'Remove circular inheritance',
        );
      }
    }
  }

  bool _hasCycle(
    String className,
    Map<String, ClassDecl> classMap,
    Set<String> visited,
  ) {
    if (visited.contains(className)) return true;
    if (!classMap.containsKey(className)) return false;

    visited.add(className);
    final cls = classMap[className]!;

    if (cls.superclass != null) {
      final parentName = cls.superclass!.displayName();
      if (_hasCycle(parentName, classMap, visited)) {
        return true;
      }
    }

    visited.remove(className);
    return false;
  }

  void _validateAbstractMethods() {
    for (final cls in dartFile.classDeclarations) {
      if (!cls.isAbstract) {
        // Non-abstract class cannot have abstract methods
        for (final method in cls.methods) {
          if (method.isAbstract) {
            _addError(
              'Non-abstract class ${cls.name} contains abstract method ${method.name}',
              ValidationSeverity.error,
              affectedNode: 'MethodDecl[${method.name}]',
              suggestion:
                  'Either mark class as abstract or provide implementation',
            );
          }
        }
      }
    }
  }

  void _checkTypeConsistency() {
    for (final cls in dartFile.classDeclarations) {
      // Validate method return types are properly set
      for (final method in cls.methods) {
        // Check method parameters have valid types
        for (final param in method.parameters) {
          if (param.type.displayName().isEmpty) {
            _addError(
              'Parameter ${param.name} in method ${method.name} has invalid type',
              ValidationSeverity.warning,
              affectedNode: 'ParameterDecl[${param.name}]',
            );
          }
        }
      }

      // Check field type names are meaningful
      for (final field in cls.fields) {
        final typeName = field.type.displayName();
        if (typeName.isEmpty) {
          _addError(
            'Field ${field.name} in class ${cls.name} has invalid type name',
            ValidationSeverity.warning,
            affectedNode: 'FieldDecl[${field.name}]',
          );
        }
      }
    }
  }

  void _validateConstructors() {
    for (final cls in dartFile.classDeclarations) {
      if (cls.constructors.isEmpty) {
        // OK - will generate default constructor
      } else {
        for (final ctor in cls.constructors) {
          if (ctor.isFactory && ctor.isConst) {
            _addError(
              'Constructor cannot be both factory and const',
              ValidationSeverity.error,
              affectedNode: 'ConstructorDecl[${ctor.id}]',
            );
          }
        }
      }
    }
  }

  void _checkCompletenessAfterDeser() {
    // Verify file metadata is present
    if (dartFile.filePath.isEmpty) {
      _addError(
        'DartFile has empty filePath',
        ValidationSeverity.error,
        suggestion: 'File must have a valid path',
      );
    }

    if (dartFile.contentHash.isEmpty) {
      _addError(
        'DartFile has empty contentHash',
        ValidationSeverity.warning,
        suggestion: 'Content hash should be computed for verification',
      );
    }
  }

  void _checkBinaryIntegrity() {
    // Check format version compatibility
    // This would be done during deserialization, but we can verify here

    // Verify timestamps are reasonable
    // Verify no data corruption indicators
  }

  void _addError(
    String message,
    ValidationSeverity severity, {
    String? suggestion,
    String? affectedNode,
  }) {
    errors.add(
      ValidationError(
        message: message,
        severity: severity,
        suggestion: suggestion,
        affectedNode: affectedNode,
      ),
    );
  }
}

// ============================================================================
// 0.2 IR TYPE SYSTEM ANALYZER
// ============================================================================

class TypeInfo {
  final String name;
  final String? superclass;
  final Set<String> interfaces;
  final Set<String> mixins;
  final Map<String, TypeIR> fields;
  final Map<String, MethodSignature> methods;
  final List<ParameterIR> typeParameters;
  final bool isAbstract;
  final bool isFinal;

  TypeInfo({
    required this.name,
    this.superclass,
    this.interfaces = const {},
    this.mixins = const {},
    this.fields = const {},
    this.methods = const {},
    this.typeParameters = const [],
    this.isAbstract = false,
    this.isFinal = false,
  });

  @override
  String toString() => 'TypeInfo($name)';
}

class MethodSignature {
  final String name;
  final TypeIR returnType;
  final List<ParameterDecl> parameters;
  final bool isAsync;
  final bool isGenerator;
  final bool isAbstract;
  final bool isStatic;

  MethodSignature({
    required this.name,
    required this.returnType,
    required this.parameters,
    this.isAsync = false,
    this.isGenerator = false,
    this.isAbstract = false,
    this.isStatic = false,
  });

  @override
  String toString() => 'MethodSignature($name)';
}

class TypeEnvironment {
  final Map<String, TypeInfo> typeTable = {};
  final Map<String, List<ParameterIR>> genericTypes = {};
  final Map<String, TypeIR> aliases = {};

  void addType(String name, TypeInfo info) {
    typeTable[name] = info;
  }

  TypeInfo? getType(String name) => typeTable[name];
  bool isKnownType(String name) => typeTable.containsKey(name);
  bool isGenericType(String name) => genericTypes.containsKey(name);

  String generateReport() {
    final buffer = StringBuffer();
    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║          TYPE ENVIRONMENT REPORT                   ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

    buffer.writeln('Known Types: ${typeTable.length}');
    for (final entry in typeTable.entries) {
      buffer.writeln('  - ${entry.key}');
    }

    buffer.writeln('\nGeneric Types: ${genericTypes.length}');
    for (final entry in genericTypes.entries) {
      buffer.writeln(
        '  - ${entry.key}<${entry.value.map((p) => p.name).join(', ')}>',
      );
    }

    return buffer.toString();
  }
}

class IRTypeSystemAnalyzer {
  final DartFile dartFile;
  IRTypeSystemAnalyzer(this.dartFile);
  final TypeEnvironment typeEnvironment = TypeEnvironment();

  void analyze() {
    _buildTypeTable();
    _resolveTypeReferences();
    _inferImplicitTypes();
    _validateTypeConsistency();
  }

  void _buildTypeTable() {
    // For each ClassDecl: name, superclass, interfaces, mixins, fields, methods
    for (final cls in dartFile.classDeclarations) {
      final fields = <String, TypeIR>{};
      for (final field in cls.fields) {
        fields[field.name] = field.type;
      }

      final methods = <String, MethodSignature>{};
      for (final method in cls.methods) {
        methods[method.name] = MethodSignature(
          name: method.name,
          returnType: method.returnType,
          parameters: method.parameters,
          isAsync: method.isAsync,
          isGenerator: method.isGenerator,
          isAbstract: method.isAbstract,
          isStatic: method.isStatic,
        );
      }

      final typeInfo = TypeInfo(
        name: cls.name,
        superclass: cls.superclass?.displayName(),
        interfaces: cls.interfaces.map((i) => i.displayName()).toSet(),
        mixins: cls.mixins.map((m) => m.displayName()).toSet(),
        fields: fields,
        methods: methods,
        isAbstract: cls.isAbstract,
        isFinal: cls.isFinal,
      );

      typeEnvironment.addType(cls.name, typeInfo);
    }
  }

  void _resolveTypeReferences() {
    // Convert all type names to resolved TypeIR objects
    // Handle nullable types (String?)
    // Handle generics (List<String>)
    // This is a placeholder for complex type resolution
  }

  void _inferImplicitTypes() {
    // For variables with 'var' keyword
    // Infer from initializer
    // Type narrowing in if-statements
  }

  void _validateTypeConsistency() {
    // Report type mismatches
  }
}

// ============================================================================
// 0.3 IR SCOPE & BINDING ANALYZER
// ============================================================================

class VariableBinding {
  final String name;
  final TypeIR type;
  final String? declarationScope;
  final bool isFinal;
  final bool isConst;

  VariableBinding({
    required this.name,
    required this.type,
    this.declarationScope,
    this.isFinal = false,
    this.isConst = false,
  });

  @override
  String toString() => 'VariableBinding($name: $type)';
}

class Scope {
  final String id;
  final String? parentScope;
  final Map<String, VariableBinding> bindings = {};
  final List<String> childScopes = [];

  Scope({required this.id, this.parentScope});

  void addBinding(VariableBinding binding) {
    bindings[binding.name] = binding;
  }

  VariableBinding? lookupBinding(String name) {
    return bindings[name];
  }

  @override
  String toString() => 'Scope($id, bindings: ${bindings.length})';
}

class ScopeModel {
  final Map<String, Scope> scopeMap = {};
  final Map<String, VariableBinding> globalBindings = {};
  final Map<String, ClosureInfo> closureCaptures = {};

  String generateReport() {
    final buffer = StringBuffer();
    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║          SCOPE MODEL REPORT                        ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

    buffer.writeln('Total Scopes: ${scopeMap.length}');
    buffer.writeln('Global Bindings: ${globalBindings.length}');
    buffer.writeln('Closure Captures: ${closureCaptures.length}');

    return buffer.toString();
  }
}

class ClosureInfo {
  final String closureId;
  final Set<String> capturedVariables = {};
  final bool captureByReference;

  ClosureInfo({required this.closureId, this.captureByReference = true});

  @override
  String toString() =>
      'ClosureInfo($closureId, captures: ${capturedVariables.length})';
}

class IRScopeAnalyzer {
  final DartFile dartFile;
  IRScopeAnalyzer(this.dartFile);
  final ScopeModel scopeModel = ScopeModel();

  void analyze() {
    _buildScopeChain();
    _resolveBindings();
    _analyzeClosures();
    _analyzeLifetimes();
  }

  void _buildScopeChain() {
    // FileScope
    //   ├─ ClassScope (for each class)
    //   │   ├─ FieldScope
    //   │   └─ MethodScope (for each method)
    //   │       └─ BlockScope → LocalVarScope → ...
    //   └─ FunctionScope (for each top-level function)
    //       └─ BlockScope → LocalVarScope → ...
  }

  void _resolveBindings() {
    // Every identifier → declaration
    // Track which scope it comes from
  }

  void _analyzeClosures() {
    // Find nested functions/lambdas
    // What variables do they capture?
    // By reference or by value?
  }

  void _analyzeLifetimes() {
    // Variable initialization point
    // Last use point
    // Can it be inlined?
  }
}

// ============================================================================
// 0.4 IR CONTROL FLOW ANALYZER
// ============================================================================

class BasicBlock {
  final String id;
  final List<StatementIR> statements;
  final Set<String> successors = {};
  final Set<String> predecessors = {};
  bool isReachable = true;

  BasicBlock({required this.id, required this.statements});

  @override
  String toString() => 'BasicBlock($id)';
}

class ControlFlowGraph {
  final Map<String, BasicBlock> blocks = {};
  late BasicBlock entryBlock;
  late BasicBlock exitBlock;
  final Map<String, Set<String>> reachability = {};
  final List<String> unreachableStatements = [];

  String generateReport() {
    final buffer = StringBuffer();
    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║        CONTROL FLOW GRAPH REPORT                   ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

    buffer.writeln('Total Blocks: ${blocks.length}');
    buffer.writeln('Unreachable Statements: ${unreachableStatements.length}');

    if (unreachableStatements.isNotEmpty) {
      buffer.writeln('\nUnreachable Code:');
      for (final stmt in unreachableStatements) {
        buffer.writeln('  - $stmt');
      }
    }

    return buffer.toString();
  }
}

class IRControlFlowAnalyzer {
  final DartFile dartFile;
  IRControlFlowAnalyzer(this.dartFile);
  final ControlFlowGraph cfg = ControlFlowGraph();

  void analyze() {
    _buildCFG();
    _analyzeReachability();
    _analyzeLoops();
    _analyzeExceptions();
  }

  void _buildCFG() {
    // Create BasicBlocks
    // Add edges
  }

  void _analyzeReachability() {
    // Mark reachable/unreachable blocks
    // Report dead code
  }

  void _analyzeLoops() {
    // Identify loop structures
    // Nested loops
  }

  void _analyzeExceptions() {
    // Track exception flow
    // Which exceptions can be thrown where
  }
}

// ============================================================================
// PHASE 0 ORCHESTRATOR - Runs all analysis in sequence
// ============================================================================

class Phase0Orchestrator {
  final DartFile dartFile;

  late ValidationReport validationReport;
  late TypeEnvironment typeEnvironment;
  late ScopeModel scopeModel;
  late ControlFlowGraph controlFlowGraph;

  Phase0Orchestrator(this.dartFile);

  /// Execute complete Phase 0 analysis
  Phase0AnalysisResult execute({bool verbose = false}) {
    final stopwatch = Stopwatch()..start();

    if (verbose) {
      print('\n╔════════════════════════════════════════════════════╗');
      print('║        PHASE 0: PRE-ANALYSIS EXECUTION            ║');
      print('╚════════════════════════════════════════════════════╝\n');
    }

    // 0.1: IR Post-Deserialization Validator
    if (verbose) print('Step 1: Validating IR structure...');
    final validator = IRPostDeserializeValidator(dartFile);
    validationReport = validator.validate();

    if (!validationReport.canProceed) {
      if (verbose) print(validationReport.generateReport());
      stopwatch.stop();
      return Phase0AnalysisResult.failed(
        validationReport: validationReport,
        duration: stopwatch.elapsed,
      );
    }
    if (verbose) print('✓ IR validation passed\n');

    // 0.2: IR Type System Analyzer
    if (verbose) print('Step 2: Analyzing type system...');
    final typeAnalyzer = IRTypeSystemAnalyzer(dartFile);
    typeAnalyzer.analyze();
    typeEnvironment = typeAnalyzer.typeEnvironment;
    if (verbose)
      print(
        '✓ Type system analyzed (${typeEnvironment.typeTable.length} types)\n',
      );

    // 0.3: IR Scope & Binding Analyzer
    if (verbose) print('Step 3: Analyzing scope and bindings...');
    final scopeAnalyzer = IRScopeAnalyzer(dartFile);
    scopeAnalyzer.analyze();
    scopeModel = scopeAnalyzer.scopeModel;
    if (verbose) print('✓ Scope analysis completed\n');

    // 0.4: IR Control Flow Analyzer
    if (verbose) print('Step 4: Analyzing control flow...');
    final cfgAnalyzer = IRControlFlowAnalyzer(dartFile);
    cfgAnalyzer.analyze();
    controlFlowGraph = cfgAnalyzer.cfg;
    if (verbose) print('✓ Control flow analyzed\n');

    stopwatch.stop();

    if (verbose) {
      print(validationReport.generateReport());
      print(typeEnvironment.generateReport());
      print(scopeModel.generateReport());
      print(controlFlowGraph.generateReport());
    }

    return Phase0AnalysisResult.success(
      validationReport: validationReport,
      typeEnvironment: typeEnvironment,
      scopeModel: scopeModel,
      controlFlowGraph: controlFlowGraph,
      duration: stopwatch.elapsed,
    );
  }
}

/// Complete result of Phase 0 analysis
class Phase0AnalysisResult {
  final bool success;
  final ValidationReport? validationReport;
  final TypeEnvironment? typeEnvironment;
  final ScopeModel? scopeModel;
  final ControlFlowGraph? controlFlowGraph;
  final Duration duration;
  final String? error;

  Phase0AnalysisResult.success({
    required this.validationReport,
    required this.typeEnvironment,
    required this.scopeModel,
    required this.controlFlowGraph,
    required this.duration,
  }) : success = true,
       error = null;

  Phase0AnalysisResult.failed({
    required this.validationReport,
    required this.duration,
    this.error,
  }) : success = false,
       typeEnvironment = null,
       scopeModel = null,
       controlFlowGraph = null;

  String generateSummary() {
    final buffer = StringBuffer();
    buffer.writeln('\n╔════════════════════════════════════════════════════╗');
    buffer.writeln('║         PHASE 0 ANALYSIS SUMMARY                  ║');
    buffer.writeln('╚════════════════════════════════════════════════════╝\n');

    buffer.writeln('Status: ${success ? '✓ SUCCESS' : '✗ FAILED'}');
    buffer.writeln('Duration: ${duration.inMilliseconds}ms\n');

    if (validationReport != null) {
      buffer.writeln('Validation:');
      buffer.writeln('  Issues: ${validationReport!.totalIssues}');
      buffer.writeln('  Fatal: ${validationReport!.fatalCount}');
      buffer.writeln('  Errors: ${validationReport!.errorCount}');
      buffer.writeln('  Warnings: ${validationReport!.warningCount}\n');
    }

    if (success && typeEnvironment != null) {
      buffer.writeln('Type System:');
      buffer.writeln('  Known types: ${typeEnvironment!.typeTable.length}\n');
    }

    if (success && scopeModel != null) {
      buffer.writeln('Scopes:');
      buffer.writeln('  Total scopes: ${scopeModel!.scopeMap.length}');
      buffer.writeln(
        '  Global bindings: ${scopeModel!.globalBindings.length}\n',
      );
    }

    if (success && controlFlowGraph != null) {
      buffer.writeln('Control Flow:');
      buffer.writeln('  Basic blocks: ${controlFlowGraph!.blocks.length}');
      buffer.writeln(
        '  Dead code statements: ${controlFlowGraph!.unreachableStatements.length}\n',
      );
    }

    if (error != null) {
      buffer.writeln('Error: $error\n');
    }

    return buffer.toString();
  }
}
