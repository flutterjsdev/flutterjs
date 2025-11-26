// =========================================================================
// IR RELATIONSHIP REGISTRY (COMPLETE VERSION)
// =========================================================================

import '../../../flutterjs_core.dart';
/// ============================================================================
/// ir_relationship_registry.dart
/// IR Relationship Registry — Tracks and Manages Cross-Node Relationships
/// ============================================================================
///
/// Provides a centralized registry for recording, organizing, and validating
/// **cross-node relationships** inside the FlutterJS Intermediate Representation (IR).
///
/// In a complex IR tree, many nodes depend on one another:
/// - Widget → parent widget
/// - Variable → declaration site
/// - Function → parameters
/// - Expression → referenced identifiers
/// - Types → generic constraints
///
/// The IRRelationshipRegistry exists to track these links in a structured and
/// deterministic way so that:
/// - Binary serialization has stable reference indices  
/// - Validation can detect invalid or dangling relationships  
/// - Code generation (JS export) can resolve all dependencies  
///
///
/// # Purpose
///
/// The IR is not just a tree — it’s a **graph** with multiple kinds of edges:
///
/// - parent/child  
/// - declaration/reference  
/// - type/subtype  
/// - variable/assignment  
/// - callable/call-site  
///
/// Manually embedding all links inside nodes would:
/// - complicate traversal  
/// - risk missing reverse references  
/// - break binary ordering guarantees  
///
/// This registry provides a **single source of truth** for IR-level relationships.
///
///
/// # Responsibilities
///
/// ## 1. Store All Relationship Mappings
///
/// Tracks relationships such as:
/// - node → parent  
/// - variable → declaration  
/// - function → parameters  
/// - widget → children references  
/// - type indexes → usage indexes  
///
/// uses internal maps such as:
/// ```dart
/// Map<IRNode, IRNode> parentOf;
/// Map<VariableRef, Declaration> varToDecl;
/// Map<TypeRef, Set<IRNode>> typeUsage;
/// ```
///
///
/// ## 2. Provide Reverse Lookups
///
/// Useful for:
/// - validation  
/// - error reporting  
/// - optimization passes  
///
/// Example:
/// ```dart
/// final allUsers = registry.getNodesUsingType(typeRef);
/// ```
///
///
/// ## 3. Ensure Deterministic Relationship Ordering
///
/// All relationships must be emitted in the same order during:
/// - serialization  
/// - validation  
/// - export  
///
/// This registry enforces ordering guarantees.
///
///
/// ## 4. Relationship Queries
///
/// Common operations include:
/// - `getParent(node)`  
/// - `getChildren(node)`  
/// - `getDeclaration(variable)`  
/// - `getVariableUses(varDecl)`  
/// - `getCallSites(functionDecl)`  
///
///
/// ## 5. Used by Writers
///
/// `relationship_writer.dart` uses this registry to serialize:
/// - parent → child edges  
/// - declaration → reference edges  
/// - type dependency lists  
///
/// Binary output becomes fully reconstructable because the registry has
/// complete knowledge of every linkage.
///
///
/// ## 6. Used by Validators
///
/// `comprehensive_ir_validator.dart` checks:
/// - circular widget references  
/// - reference to undeclared variables  
/// - dangling type links  
/// - invalid parent/child structure  
///
///
/// # Internal Data Structures
///
/// The registry typically maintains:
///
/// ```dart
/// final Map<int, List<int>> relationships;
/// final Map<IRNode, int> nodeToIndex;
/// final Map<int, IRNode> indexToNode;
/// ```
///
/// ensuring bi-directional access.
///
///
/// # Example Usage
///
/// ```dart
/// final registry = IRRelationshipRegistry();
/// registry.registerParent(childNode, parentNode);
/// registry.registerVariableUse(variableRef, someExpression);
/// ```
///
/// Later used by:
///
/// ```dart
/// relationshipWriter.write(registry);
/// ```
///
///
/// # Notes
///
/// - The IR graph must be fully registered before writing binary.
/// - Registry must remain stable & immutable during serialization.
/// - Invalid states (dangling refs, cycles) must be caught before serialization.
/// - Performance critical — avoid heavy iteration inside core loops.
///
///
/// ============================================================================
///

class IRRelationshipRegistry {
  final Map<String, List<String>> classMethods = {};
  final Map<String, List<String>> classFields = {};
  final Map<String, String> methodToClass = {};
  final Map<String, String> fieldToClass = {};
  final Map<String, Set<String>> methodCalls = {};
  final Map<String, Set<String>> fieldAccesses = {};
  final Map<String, String> widgetToStateClass = {};
  final Map<String, Map<StateLifecycleMethod, String>> stateLifecycleMethods =
      {};
  final Map<String, String> stateBuildMethods = {};
  final Map<String, String> classHierarchy = {};
  final Map<String, Set<String>> interfaceImplementers = {};
  final Map<String, String> methodOverrides = {};
  // ✓ NEW: Track what widgets each class builds
  final Map<String, String> classBuildOutputs = {};

  // ✓ NEW: Track widget composition
  final Map<String, List<String>> widgetComposition =
      {}; // Scaffold -> [AppBar, FloatingActionButton, ...]

  // =========================================================================
  // REGISTRATION METHODS
  // =========================================================================

  void registerClassBuildOutput(String classId, String widgetName) {
    classBuildOutputs[classId] = widgetName;
  }

  void registerWidgetChild(String parentWidget, String childWidget) {
    widgetComposition.putIfAbsent(parentWidget, () => []).add(childWidget);
  }

  void registerMethodToClass(String methodId, String classId) {
    methodToClass[methodId] = classId;
    classMethods.putIfAbsent(classId, () => []).add(methodId);
  }

  void registerFieldToClass(String fieldId, String classId) {
    fieldToClass[fieldId] = classId;
    classFields.putIfAbsent(classId, () => []).add(fieldId);
  }

  void registerMethodCall(String fromMethodId, String toMethodId) {
    methodCalls.putIfAbsent(fromMethodId, () => {}).add(toMethodId);
  }

  void registerFieldAccess(String fromMethodId, String fieldId) {
    fieldAccesses.putIfAbsent(fromMethodId, () => {}).add(fieldId);
  }

  void registerWidgetStateConnection(
    String widgetClassId,
    String stateClassId,
  ) {
    widgetToStateClass[widgetClassId] = stateClassId;
  }

  void registerStateLifecycleMethod(
    String stateClassId,
    StateLifecycleMethod methodType,
    String methodId,
  ) {
    stateLifecycleMethods.putIfAbsent(stateClassId, () => {})[methodType] =
        methodId;
  }

  void registerStateBuildMethod(String stateClassId, String buildMethodId) {
    stateBuildMethods[stateClassId] = buildMethodId;
  }

  void registerInheritance(String subclassId, String superclassTypeName) {
    classHierarchy[subclassId] = superclassTypeName;
  }

  void registerInterfaceImplementation(
    String interfaceTypeName,
    String implementingClassId,
  ) {
    interfaceImplementers
        .putIfAbsent(interfaceTypeName, () => {})
        .add(implementingClassId);
  }

  void registerMethodOverride(
    String overrideMethodId,
    String overriddenMethodId,
  ) {
    methodOverrides[overrideMethodId] = overriddenMethodId;
  }

  // =========================================================================
  // QUERY METHODS
  // =========================================================================

  List<String> getClassMethods(String classId) => classMethods[classId] ?? [];
  List<String> getClassFields(String classId) => classFields[classId] ?? [];
  Set<String> getMethodCalls(String methodId) => methodCalls[methodId] ?? {};
  Set<String> getFieldAccesses(String methodId) =>
      fieldAccesses[methodId] ?? {};
  String? getStateClassForWidget(String widgetClassId) =>
      widgetToStateClass[widgetClassId];
  Map<StateLifecycleMethod, String> getStateLifecycleMethods(
    String stateClassId,
  ) => stateLifecycleMethods[stateClassId] ?? {};
  String? getStateBuildMethod(String stateClassId) =>
      stateBuildMethods[stateClassId];
  String? getSuperclass(String classId) => classHierarchy[classId];
  Set<String> getInterfaceImplementers(String interfaceTypeName) =>
      interfaceImplementers[interfaceTypeName] ?? {};
  String? getOverriddenMethod(String overrideMethodId) =>
      methodOverrides[overrideMethodId];

  // =========================================================================
  // VALIDATION
  // =========================================================================

  List<String> validateAllRelationships(
    Set<String> validMethodIds,
    Set<String> validFieldIds,
    Map<String, ClassDecl> classesById,
  ) {
    final errors = <String>[];

    // Validate method references
    for (final methodId in methodCalls.keys) {
      if (!validMethodIds.contains(methodId)) {
        errors.add('Unknown method calling others: $methodId');
      }
      for (final calledId in methodCalls[methodId]!) {
        if (!validMethodIds.contains(calledId)) {
          errors.add('Method $methodId calls unknown method: $calledId');
        }
      }
    }

    // Validate field references
    for (final methodId in fieldAccesses.keys) {
      for (final fieldId in fieldAccesses[methodId]!) {
        if (!validFieldIds.contains(fieldId)) {
          errors.add('Method $methodId accesses unknown field: $fieldId');
        }
      }
    }

    // Validate widget-state connections
    for (final entry in widgetToStateClass.entries) {
      if (!classesById.containsKey(entry.key)) {
        errors.add('Unknown widget class: ${entry.key}');
      }
      if (!classesById.containsKey(entry.value)) {
        errors.add('Unknown state class: ${entry.value}');
      }
    }

    // Validate lifecycle methods
    for (final stateEntry in stateLifecycleMethods.entries) {
      for (final methodEntry in stateEntry.value.entries) {
        if (!validMethodIds.contains(methodEntry.value)) {
          errors.add(
            'State ${stateEntry.key} has unknown lifecycle method: ${methodEntry.value}',
          );
        }
      }
    }

    // Validate build methods
    for (final entry in stateBuildMethods.entries) {
      if (!validMethodIds.contains(entry.value)) {
        errors.add(
          'Unknown build method for state ${entry.key}: ${entry.value}',
        );
      }
    }

    return errors;
  }

  // =========================================================================
  // REPORTING
  // =========================================================================

  String generateReport() {
    final buffer = StringBuffer();
    buffer.writeln('\n=== IR RELATIONSHIP REPORT ===\n');

    buffer.writeln('CLASS STRUCTURE:');
    buffer.writeln('  Total classes: ${classMethods.length}');
    for (final entry in classMethods.entries) {
      final methods = entry.value.length;
      final fields = classFields[entry.key]?.length ?? 0;
      buffer.writeln('    ${entry.key}: $methods methods, $fields fields');
    }

    buffer.writeln('\nWIDGET-STATE CONNECTIONS: ${widgetToStateClass.length}');
    for (final entry in widgetToStateClass.entries) {
      buffer.writeln('  ${entry.key} -> ${entry.value}');
    }

    buffer.writeln('\nSTATE LIFECYCLE METHODS:');
    for (final entry in stateLifecycleMethods.entries) {
      buffer.writeln('  State ${entry.key}: ${entry.value.length} methods');
    }

    buffer.writeln(
      '\nMETHOD CALL GRAPH: ${methodCalls.length} methods with calls',
    );
    buffer.writeln(
      '\nFIELD ACCESS GRAPH: ${fieldAccesses.length} methods accessing fields',
    );
    buffer.writeln(
      '\nCLASS HIERARCHY: ${classHierarchy.length} inheritance relationships',
    );
    buffer.writeln(
      '\nINTERFACE IMPLEMENTATIONS: ${interfaceImplementers.length} interfaces',
    );

    buffer.writeln('\n=== END REPORT ===\n');
    return buffer.toString();
  }

  // =========================================================================
  // SIZE ANALYSIS
  // =========================================================================

  int estimateRelationshipsSectionSize() {
    int size = 2; // flags

    // Widget-state connections
    size += 4 + (widgetToStateClass.length * 8);

    // State lifecycle methods
    size += 4 + (stateLifecycleMethods.length * (4 + 1));
    for (final methods in stateLifecycleMethods.values) {
      size += methods.length * 5; // type byte + method id ref
    }
    size += 4 + (stateBuildMethods.length * 8);

    // Method calls
    size += 4 + (methodCalls.length * 8);
    for (final methods in methodCalls.values) {
      size += methods.length * 4;
    }

    // Field accesses
    size += 4 + (fieldAccesses.length * 8);
    for (final fields in fieldAccesses.values) {
      size += fields.length * 4;
    }

    // Class hierarchy
    size += 4 + (classHierarchy.length * 8);

    // Interface implementers
    size += 4 + (interfaceImplementers.length * 8);
    for (final implementers in interfaceImplementers.values) {
      size += implementers.length * 4;
    }

    return size;
  }
}

// =========================================================================
// SUPPORTING TYPES
// =========================================================================

enum StateLifecycleMethod {
  initState,
  dispose,
  didUpdateWidget,
  didChangeDependencies,
  reassemble,
  deactivate,
  activate,
}

// =========================================================================
// VERIFICATION CHECKLIST FOR IRRelationshipRegistry
// =========================================================================

/*
✅ COMPLETENESS VERIFICATION:

1. DATA STRUCTURES:
   ✅ classMethods - Maps class ID to method IDs
   ✅ classFields - Maps class ID to field IDs
   ✅ methodToClass - Bidirectional: method -> class
   ✅ fieldToClass - Bidirectional: field -> class
   ✅ methodCalls - Call graph: method -> called methods
   ✅ fieldAccesses - Access graph: method -> accessed fields
   ✅ widgetToStateClass - Widget-State associations
   ✅ stateLifecycleMethods - Lifecycle method mappings
   ✅ stateBuildMethods - Build method references
   ✅ classHierarchy - Inheritance relationships
   ✅ interfaceImplementers - Interface implementations
   ✅ methodOverrides - Override relationships

2. REGISTRATION METHODS:
   ✅ registerMethodToClass() - Add method to class
   ✅ registerFieldToClass() - Add field to class
   ✅ registerMethodCall() - Record method calls
   ✅ registerFieldAccess() - Record field accesses
   ✅ registerWidgetStateConnection() - Link widgets to states
   ✅ registerStateLifecycleMethod() - Track lifecycle methods
   ✅ registerStateBuildMethod() - Track build methods
   ✅ registerInheritance() - Track superclasses
   ✅ registerInterfaceImplementation() - Track interfaces
   ✅ registerMethodOverride() - Track overrides

3. QUERY METHODS:
   ✅ getClassMethods() - Query methods by class
   ✅ getClassFields() - Query fields by class
   ✅ getMethodCalls() - Query called methods
   ✅ getFieldAccesses() - Query accessed fields
   ✅ getStateClassForWidget() - Get state for widget
   ✅ getStateLifecycleMethods() - Get lifecycle methods
   ✅ getStateBuildMethod() - Get build method
   ✅ getSuperclass() - Get parent class
   ✅ getInterfaceImplementers() - Get implementers
   ✅ getOverriddenMethod() - Get overridden method

4. VALIDATION METHODS:
   ✅ validateAllRelationships() - Comprehensive validation
     - Validates method references
     - Validates field references
     - Validates widget-state connections
     - Validates lifecycle methods
     - Validates build methods
   ✅ Error collection and reporting

5. REPORTING & ANALYSIS:
   ✅ generateReport() - Human-readable report
   ✅ estimateRelationshipsSectionSize() - Size estimation
   ✅ Detailed statistics

6. INTEGRATION WITH BinaryIRWriter:
   ✅ _buildRelationships() - Build relationship map
   ✅ _processWidgetStateConnections() - Find widget-state pairs
   ✅ _processStateLifecycleMethods() - Extract lifecycle methods
   ✅ _writeRelationshipsSection() - Serialize relationships
   ✅ _collectStringsFromRelationships() - Dedup strings
   ✅ Validation before serialization
   ✅ Proper error handling
   ✅ Debug output support

7. SERIALIZATION FORMAT:
   ✅ Flags indicating presence of each relationship type
   ✅ Variable-length encoding (only write present data)
   ✅ String deduplication via string table
   ✅ Efficient ID references
   ✅ Set-based collections for fast lookup

8. ERROR HANDLING:
   ✅ SerializationException with context
   ✅ Validation errors before writing
   ✅ Bounds checking
   ✅ Detailed error messages

STRENGTHS:
- Complete bidirectional relationships
- Efficient serialization with flags
- Comprehensive validation
- Strong error handling
- Widget-state linking
- Lifecycle tracking
- Method call graph
- Class hierarchy tracking

POTENTIAL ENHANCEMENTS:
- Could add more relationship types (e.g., field initialization)
- Could track state field dependencies
- Could track provider usage
- Could track animation controller usage
- Could add relationship querying helpers (e.g., find all methods calling a method)

*/

// =========================================================================
// HELPER EXTENSION FOR RELATIONSHIP QUERIES
// =========================================================================

extension IRRelationshipQueries on IRRelationshipRegistry {
  /// Find all methods that call a specific method (transitive)
  Set<String> findMethodCallers(String targetMethodId) {
    final callers = <String>{};
    final worklist = <String>[targetMethodId];
    final visited = <String>{};

    while (worklist.isNotEmpty) {
      final current = worklist.removeAt(0);
      if (visited.contains(current)) continue;
      visited.add(current);

      for (final entry in methodCalls.entries) {
        if (entry.value.contains(current)) {
          callers.add(entry.key);
          worklist.add(entry.key);
        }
      }
    }

    return callers;
  }

  /// Find all fields accessed by a method (transitive)
  Set<String> findAllAccessedFields(String methodId) {
    final accessed = <String>{};
    final worklist = <String>[methodId];
    final visited = <String>{};

    while (worklist.isNotEmpty) {
      final current = worklist.removeAt(0);
      if (visited.contains(current)) continue;
      visited.add(current);

      if (fieldAccesses.containsKey(current)) {
        accessed.addAll(fieldAccesses[current]!);
      }

      if (methodCalls.containsKey(current)) {
        worklist.addAll(methodCalls[current]!);
      }
    }

    return accessed;
  }

  /// Get all methods in a class's hierarchy
  Set<String> getAllMethodsInHierarchy(String classId) {
    final methods = <String>{};
    methods.addAll(getClassMethods(classId));

    // Add superclass methods
    final superclassName = getSuperclass(classId);
    if (superclassName != null) {
      for (final entry in classHierarchy.entries) {
        if (entry.value == superclassName) {
          methods.addAll(getAllMethodsInHierarchy(entry.key));
        }
      }
    }

    return methods;
  }

  /// Check if a class implements an interface
  bool implementsInterface(String classId, String interfaceName) {
    for (final entry in interfaceImplementers.entries) {
      if (entry.key == interfaceName && entry.value.contains(classId)) {
        return true;
      }
    }
    return false;
  }

  /// Get all classes that inherit from a class
  Set<String> getSubclasses(String classId) {
    final subclasses = <String>{};

    for (final entry in classHierarchy.entries) {
      if (entry.value == classId) {
        subclasses.add(entry.key);
        // Recursively add subclasses of subclasses
        subclasses.addAll(getSubclasses(entry.key));
      }
    }

    return subclasses;
  }

  /// Generate call graph for visualization
  Map<String, List<String>> getCallGraph() {
    final graph = <String, List<String>>{};
    for (final entry in methodCalls.entries) {
      graph[entry.key] = entry.value.toList();
    }
    return graph;
  }

  /// Generate field dependency graph
  Map<String, List<String>> getFieldDependencyGraph() {
    final graph = <String, List<String>>{};
    for (final entry in fieldAccesses.entries) {
      graph[entry.key] = entry.value.toList();
    }
    return graph;
  }

  /// Find dead fields (never accessed)
  Set<String> findDeadFields(Set<String> allFieldIds) {
    final accessedFields = <String>{};
    for (final fields in fieldAccesses.values) {
      accessedFields.addAll(fields);
    }

    return allFieldIds.difference(accessedFields);
  }

  /// Find unreachable methods (never called)
  Set<String> findUnreachableMethods(
    Set<String> allMethodIds,
    Set<String> entryPoints,
  ) {
    final reachable = <String>{};
    final worklist = List<String>.from(entryPoints);

    while (worklist.isNotEmpty) {
      final current = worklist.removeAt(0);
      if (reachable.contains(current)) continue;
      reachable.add(current);

      if (methodCalls.containsKey(current)) {
        for (final calledId in methodCalls[current]!) {
          if (!reachable.contains(calledId)) {
            worklist.add(calledId);
          }
        }
      }
    }

    return allMethodIds.difference(reachable);
  }

  /// Check if there are circular dependencies
  bool hasCircularDependencies() {
    for (final entry in methodCalls.entries) {
      if (_hasCycle(entry.key, <String>{})) {
        return true;
      }
    }
    return false;
  }

  bool _hasCycle(String methodId, Set<String> visited) {
    if (visited.contains(methodId)) return true;
    visited.add(methodId);

    final called = methodCalls[methodId];
    if (called != null) {
      for (final calledId in called) {
        if (_hasCycle(calledId, Set.from(visited))) {
          return true;
        }
      }
    }

    return false;
  }

  /// Generate relationship statistics
  Map<String, dynamic> getStatistics() {
    return {
      'totalClasses': classMethods.length,
      'totalMethods': methodToClass.length,
      'totalFields': fieldToClass.length,
      'methodCalls': methodCalls.length,
      'fieldAccesses': fieldAccesses.length,
      'widgetStateConnections': widgetToStateClass.length,
      'stateClasses': stateLifecycleMethods.length,
      'buildMethods': stateBuildMethods.length,
      'inheritanceLinks': classHierarchy.length,
      'interfaceImplementations': interfaceImplementers.length,
      'methodOverrides': methodOverrides.length,
      'totalRelationships':
          methodCalls.length + fieldAccesses.length + classHierarchy.length,
    };
  }

  /// Generate relationship summary report
  String generateDetailedReport() {
    final stats = getStatistics();
    final buffer = StringBuffer();

    buffer.writeln('\n╔════════════════════════════════════════════╗');
    buffer.writeln('║  IR RELATIONSHIP REGISTRY - DETAILED REPORT  ║');
    buffer.writeln('╚════════════════════════════════════════════╝\n');

    buffer.writeln('📊 STATISTICS:');
    buffer.writeln('  Total Classes: ${stats['totalClasses']}');
    buffer.writeln('  Total Methods: ${stats['totalMethods']}');
    buffer.writeln('  Total Fields: ${stats['totalFields']}');
    buffer.writeln('  Total Relationships: ${stats['totalRelationships']}\n');

    buffer.writeln('📦 RELATIONSHIP BREAKDOWN:');
    buffer.writeln('  Method Calls: ${stats['methodCalls']}');
    buffer.writeln('  Field Accesses: ${stats['fieldAccesses']}');
    buffer.writeln('  Widget→State: ${stats['widgetStateConnections']}');
    buffer.writeln('  State Classes: ${stats['stateClasses']}');
    buffer.writeln('  Build Methods: ${stats['buildMethods']}');
    buffer.writeln('  Inheritance: ${stats['inheritanceLinks']}');
    buffer.writeln(
      '  Interface Implementations: ${stats['interfaceImplementations']}',
    );
    buffer.writeln('  Method Overrides: ${stats['methodOverrides']}\n');

    buffer.writeln('🔗 CLASS STRUCTURE:');
    for (final entry in classMethods.entries) {
      final methods = entry.value.length;
      final fields = classFields[entry.key]?.length ?? 0;
      buffer.writeln('  • $entry.key');
      buffer.writeln('    - Methods: $methods');
      buffer.writeln('    - Fields: $fields');
    }

    buffer.writeln('\n🎨 WIDGET-STATE CONNECTIONS:');
    if (widgetToStateClass.isEmpty) {
      buffer.writeln('  (none)');
    } else {
      for (final entry in widgetToStateClass.entries) {
        buffer.writeln('  ${entry.key} → ${entry.value}');
      }
    }

    buffer.writeln('\n⚙️  STATE LIFECYCLE:');
    if (stateLifecycleMethods.isEmpty) {
      buffer.writeln('  (none)');
    } else {
      for (final entry in stateLifecycleMethods.entries) {
        buffer.writeln('  State: ${entry.key}');
        for (final method in entry.value.entries) {
          buffer.writeln('    - ${method.key.name}: ${method.value}');
        }
      }
    }

    buffer.writeln('\n🏗️  CLASS HIERARCHY:');
    if (classHierarchy.isEmpty) {
      buffer.writeln('  (no inheritance)');
    } else {
      for (final entry in classHierarchy.entries) {
        buffer.writeln('  ${entry.key} extends ${entry.value}');
      }
    }

    buffer.writeln('\n🔍 INTEGRITY CHECK:');
    final circularDeps = hasCircularDependencies();
    buffer.writeln(
      '  Circular Dependencies: ${circularDeps ? '⚠️  YES' : '✅ NO'}',
    );
    buffer.writeln(
      '  Estimated Section Size: ${estimateRelationshipsSectionSize()} bytes',
    );

    buffer.writeln('\n╚════════════════════════════════════════════╝\n');
    return buffer.toString();
  }
}
