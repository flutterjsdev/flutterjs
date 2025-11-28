import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/analysis/extraction/flutter_component_system.dart';
import 'package:flutterjs_core/src/analysis/extraction/symmetric_function_extraction.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/ir_relationship_registry.dart';

import '../../ir/expressions/cascade_expression_ir.dart';

/// ============================================================================
/// relationship_writer.dart
/// Relationship Writer — Serializes Cross-Node IR Relationships into Binary
/// ============================================================================
///
/// Converts all IR-level relationships recorded in
/// `IRRelationshipRegistry` into a structured binary format.
///
/// The FlutterJS IR is a graph, not just a tree. Relationships include:
/// - Parent → child mapping
/// - Declaration → reference usage
/// - Type → usage mapping
/// - Function → call sites
/// - Variable → assigned expressions
///
/// These relationships must be written in a precise, deterministic format to
/// allow the binary decoder and validators to **reconstruct the full IR graph**
/// exactly as it existed in memory.
///
///
/// # Purpose
///
/// The binary IR writer handles the core structure of the IR, but it **cannot**
/// encode graph edges implicitly — these must be written as explicit
/// relationship blocks.
///
/// `relationship_writer.dart` ensures:
/// - All IR graph connections are serialized
/// - Relationships are ordered deterministically
/// - Referencing indices match the IR writer’s node indices
/// - Cycles or invalid references can be detected by validators
///
///
/// # Responsibilities
///
/// ## 1. Write Relationship Section Header
///
/// Emits the relationship section tag (`kSectionRelationships`) defined in
/// `binary_constain.dart`.
///
/// Ensures the decoder knows where the relationship block begins.
///
///
/// ## 2. Serialize Parent → Child Edges
///
/// For each IR node:
/// ```dart
/// writer.writeUint32(parentIndex);
/// writer.writeUint32(childIndex);
/// ```
///
/// Order is deterministic based on registry ordering.
///
///
/// ## 3. Serialize Declaration → Usage Relationships
///
/// Examples:
/// - Variable reference → variable declaration
/// - Function call → function declaration
///
/// Structure:
/// ```dart
/// [DECL_NODE_INDEX]
/// [REFERENCE_COUNT]
///   [REF_NODE_INDEX_1]
///   [REF_NODE_INDEX_2]
///   ...
/// ```
///
///
/// ## 4. Serialize Type Dependencies
///
/// Used to track:
/// - which nodes use a specific type
/// - which generic types depend on another type
///
/// Example:
/// ```dart
/// [TYPE_INDEX]
/// [DEPENDENT_NODE_COUNT]
/// [NODE_1]
/// [NODE_2]
/// ```
///
///
/// ## 5. Deterministic Ordering
///
/// All edges must follow stable ordering rules:
/// 1. relationships sorted by source node
/// 2. edges sorted by target node
///
/// Guarantees reproducible builds and binary diffs.
///
///
/// ## 6. Integration with IR Registry
///
/// The writer gathers all relationships from:
///
/// ```dart
/// final rels = registry.getAll();
/// ```
///
/// Converts internal maps into serializable lists of index pairs.
///
///
/// # Binary Structure Summary
///
/// ```
/// [REL_SECTION_TAG]
/// [TOTAL_RELATIONSHIP_GROUPS]
///
/// -- Parent/Child --
///— [PARENT_INDEX, CHILD_INDEX]
///
/// -- Declarations --
///— [DECL_INDEX]
///— [REFERENCE_COUNT]
///— [REF_INDEXES...]
///
/// -- Types --
/// — [TYPE_INDEX]
/// — [DEPENDENT_COUNT]
/// — [DEPENDENT_INDEXES...]
/// ```
///
///
/// # Example Usage
///
/// ```dart
/// final writer = RelationshipWriter(binaryWriter, registry);
/// writer.write();
/// ```
///
/// Normally called indirectly as part of:
///
/// ```dart
/// BinaryIRWriter().write(ir);
/// ```
///
///
/// # Error Handling
///
/// Throws when:
/// - an IR node is missing in registry mappings
/// - relationships reference unk

mixin RelationshipWriter {
  /// Returns the relationships registry from BinaryIRWriter
  IRRelationshipRegistry get relationshipsRegistry;
  bool get isVerbose;
  void printlog(String value);
  void addString(String str);

  // âœ… FIXED: Use getter to access _relationships
  IRRelationshipRegistry get _relationships => relationshipsRegistry;
  bool get _verbose => isVerbose;

  void buildRelationships(DartFile fileIR) {
    printlog('[RELATIONSHIPS] Building relationship map...');

    // Index all declarations first
    final classesById = <String, ClassDecl>{};
    final methodsById = <String, dynamic>{};
    final fieldsById = <String, dynamic>{};

    for (final classDecl in fileIR.classDeclarations) {
      classesById[classDecl.id] = classDecl;

      // Register methods
      for (final method in classDecl.methods) {
        methodsById[method.id] = method;
        _relationships.registerMethodToClass(method.id, classDecl.id);
      }

      // Register fields
      for (final field in classDecl.fields) {
        fieldsById[field.id] = field;
        _relationships.registerFieldToClass(field.id, classDecl.id);
      }

      // Register constructors
      for (final constructor in classDecl.constructors) {
        methodsById[constructor.id] = constructor;
        _relationships.registerMethodToClass(constructor.id, classDecl.id);
      }

      // Register superclass
      if (classDecl.superclass != null) {
        _relationships.registerInheritance(
          classDecl.id,
          classDecl.superclass!.displayName(),
        );
      }

      // Register interfaces
      for (final iface in classDecl.interfaces) {
        _relationships.registerInterfaceImplementation(
          iface.displayName(),
          classDecl.id,
        );
      }
    }

    // âœ… NEW: Also index top-level functions
    for (final func in fileIR.functionDeclarations) {
      methodsById[func.id] = func;
      printlog('[RELATIONSHIPS] Registered top-level function: ${func.name}');
    }

    _processBuildMethods(classesById);

    // Process widget-state connections
    _processWidgetStateConnections(classesById);

    // âœ… NEW: Process extraction data relationships from all functions
    _processExtractionDataRelationships(fileIR, classesById, methodsById);

    // Validate relationships
    final errors = _relationships.validateAllRelationships(
      methodsById.keys.toSet(),
      fieldsById.keys.toSet(),
      classesById,
    );

    if (errors.isNotEmpty) {
      throw SerializationException(
        'Relationship validation failed:\n${errors.join('\n')}',
        offset: 0,
        context: 'relationships',
      );
    }

    printlog('[RELATIONSHIPS] Map built successfully');
    if (_verbose) {
      printlog(_relationships.generateReport());
    }
  }

  void _processExtractionDataRelationships(
    DartFile fileIR,
    Map<String, ClassDecl> classesById,
    Map<String, dynamic> methodsById,
  ) {
    printlog('[EXTRACTION RELATIONSHIPS] Processing...');

    // âœ… Process top-level functions
    for (final func in fileIR.functionDeclarations) {
      if (func.body?.extractionData != null) {
        _processExtractionDataFromFunction(func, null);
      }
    }

    // âœ… Process class methods
    for (final classEntry in classesById.entries) {
      final classDecl = classEntry.value;

      // Process instance methods
      for (final method in classDecl.methods) {
        if (method.body?.extractionData != null) {
          _processExtractionDataFromFunction(method, classEntry.key);
        }
      }

      // Process constructors
      for (final constructor in classDecl.constructors) {
        if (constructor.body?.extractionData != null) {
          _processExtractionDataFromFunction(constructor, classEntry.key);
        }
      }
    }

    printlog('[EXTRACTION RELATIONSHIPS] Complete');
  }

  void _processExtractionDataFromFunction(FunctionDecl func, String? classId) {
    final data = func.body!.extractionData!;

    printlog(
      '[EXTRACTION] ${classId != null ? '$classId.${func.name}' : func.name}: '
      'type=${data.extractionType}, components=${data.components.length}',
    );

    // Track widget components created by this function
    _trackWidgetComponentsFromExtraction(func.id, data);

    // Track nested function relationships
    _trackNestedFunctionsFromExtraction(func.id, data);
  }

  void _trackWidgetComponentsFromExtraction(
    String functionId,
    FunctionExtractionData data,
  ) {
    for (final component in data.components) {
      _trackComponentWidgets(functionId, component);
    }

    if (data.pureFunctionData != null) {
      _trackComponentWidgets(functionId, data.pureFunctionData!);
    }
  }

  void _trackComponentWidgets(String functionId, FlutterComponent component) {
    if (component is WidgetComponent) {
      addString(component.widgetName);
      // Track that this function builds this widget
      _relationships.registerClassBuildOutput(functionId, component.widgetName);

      // Recursively track children
      for (final child in component.children) {
        _trackComponentWidgets(functionId, child);
      }
    } else if (component is ConditionalComponent) {
      _trackComponentWidgets(functionId, component.thenComponent);
      if (component.elseComponent != null) {
        _trackComponentWidgets(functionId, component.elseComponent!);
      }
    } else if (component is LoopComponent) {
      _trackComponentWidgets(functionId, component.bodyComponent);
    } else if (component is CollectionComponent) {
      for (final elem in component.elements) {
        _trackComponentWidgets(functionId, elem);
      }
    } else if (component is ContainerFallbackComponent) {
      if (component.wrappedComponent != null) {
        _trackComponentWidgets(functionId, component.wrappedComponent!);
      }
    } else if (component is MixedFunctionData) {
      for (final subComponent in component.components) {
        _trackComponentWidgets(functionId, subComponent);
      }
    }
  }

  void _trackNestedFunctionsFromExtraction(
    String functionId,
    FunctionExtractionData data,
  ) {
    // Track pure function types that may represent nested functions
    if (data.pureFunctionData is ComputationFunctionData) {
      _trackComputationFunction(
        functionId,
        data.pureFunctionData as ComputationFunctionData,
      );
    } else if (data.pureFunctionData is ValidationFunctionData) {
      _trackValidationFunction(
        functionId,
        data.pureFunctionData as ValidationFunctionData,
      );
    } else if (data.pureFunctionData is FactoryFunctionData) {
      _trackFactoryFunction(
        functionId,
        data.pureFunctionData as FactoryFunctionData,
      );
    } else if (data.pureFunctionData is HelperFunctionData) {
      _trackHelperFunction(
        functionId,
        data.pureFunctionData as HelperFunctionData,
      );
    }
  }

  void _trackComputationFunction(
    String parentFunctionId,
    ComputationFunctionData data,
  ) {
    // Track the computation function as a nested relationship
    addString(data.displayName);
    addString(data.inputType);
    addString(data.outputType);

    for (final entry in data.analysis.entries) {
      addString(entry.key);
      addString(entry.value.toString());
    }

    printlog(
      '[EXTRACTION] Computation function: ${data.displayName} '
      '(${data.inputType} → ${data.outputType})',
    );
  }

  void _trackValidationFunction(
    String parentFunctionId,
    ValidationFunctionData data,
  ) {
    addString(data.displayName);
    addString(data.targetType);
    addString(data.returnType);

    for (final rule in data.validationRules) {
      addString(rule);
    }

    for (final entry in data.analysis.entries) {
      addString(entry.key);
      addString(entry.value.toString());
    }

    printlog(
      '[EXTRACTION] Validation function: ${data.displayName} '
      '(target=${data.targetType})',
    );
  }

  void _trackHelperFunction(String parentFunctionId, HelperFunctionData data) {
    addString(data.displayName);
    addString(data.purpose);

    for (final effect in data.sideEffects) {
      addString(effect);
    }

    for (final entry in data.analysis.entries) {
      addString(entry.key);
      addString(entry.value.toString());
    }

    printlog(
      '[EXTRACTION] Helper function: ${data.displayName} '
      '(purpose=${data.purpose})',
    );
  }

  void _trackFactoryFunction(
    String parentFunctionId,
    FactoryFunctionData data,
  ) {
    addString(data.displayName);
    addString(data.producedType);

    for (final param in data.parameters) {
      addString(param);
    }

    for (final field in data.initializedFields) {
      addString(field);
    }

    for (final entry in data.analysis.entries) {
      addString(entry.key);
      addString(entry.value.toString());
    }

    printlog(
      '[EXTRACTION] Factory function: ${data.displayName} '
      '(produces=${data.producedType})',
    );
  }

 void _processBuildMethods(Map<String, ClassDecl> classesById) {
  printlog('[BUILD METHODS] Processing...');

  for (final classEntry in classesById.entries) {
    final classDecl = classEntry.value;

    // Find build method
    MethodDecl? buildMethod;
    try {
      buildMethod = classDecl.methods.firstWhere((m) => m.name == 'build');
    } catch (e) {
      continue; // No build method
    }

    if (buildMethod != null && buildMethod.body != null) {
      // âœ… FIRST: Check extraction data for widget relationships
      if (buildMethod.body!.extractionData != null) {
        final data = buildMethod.body!.extractionData!;
        for (final component in data.components) {
          if (component is WidgetComponent) {
            final widgetName = component.widgetName;
            addString(widgetName);
            _relationships.registerClassBuildOutput(classDecl.id, widgetName);
            printlog(
              '[BUILD METHODS] Class ${classDecl.name} builds ${component.widgetName}',
            );
            break; // Usually only one root widget per build
          }
        }
      }

      // âœ… FALLBACK: If no extraction data, try to extract from return statement
      if (!_relationships.classBuildOutputs.containsKey(classDecl.id)) {
        final returnedWidget = _extractWidgetFromBuildBody(buildMethod.body?.statements ?? []);

        if (returnedWidget != null) {
          final widgetName = returnedWidget.debugName;
          addString(widgetName);
          _relationships.registerClassBuildOutput(classDecl.id, widgetName);
          printlog(
            '[BUILD METHODS] Class ${classDecl.name} builds $widgetName (from return)',
          );
        }
      }
    }
  }

  printlog('[BUILD METHODS] Complete');
}
  InstanceCreationExpressionIR? _extractWidgetFromBuildBody(
    List<StatementIR> body,
  ) {
    for (final stmt in body) {
      if (stmt is ReturnStmt && stmt.expression != null) {
        final expr = stmt.expression!;

        // Direct widget return: return Scaffold(...)
        if (expr is InstanceCreationExpressionIR) {
          return expr;
        }

        // Wrapped in conditional: return condition ? Widget1 : Widget2
        if (expr is ConditionalExpressionIR) {
          if (expr.thenExpression is InstanceCreationExpressionIR) {
            return expr.thenExpression as InstanceCreationExpressionIR;
          }
        }
      }
    }
    return null;
  }

  void _processWidgetStateConnections(Map<String, ClassDecl> classesById) {
    for (final classEntry in classesById.entries) {
      final classDecl = classEntry.value;

      // Check if StatefulWidget
      if (_isStatefulWidget(classDecl)) {
        MethodDecl? createStateMethod;
        try {
          createStateMethod = classDecl.methods.firstWhere(
            (m) => m.name == 'createState',
          );
        } catch (e) {
          // createState method not found
          createStateMethod = null;
        }
        if (createStateMethod != null) {
          final stateClassId = _findStateClassFromWidget(
            classDecl,
            classesById,
          );
          if (stateClassId != null) {
            _relationships.registerWidgetStateConnection(
              classDecl.id,
              stateClassId,
            );

            // Register lifecycle methods
            final stateClass = classesById[stateClassId];
            if (stateClass != null) {
              _processStateLifecycleMethods(stateClassId, stateClass);
            }
          }
        }
      }
    }
  }

  bool _isStatefulWidget(ClassDecl classDecl) {
    return classDecl.interfaces.any((i) => i.displayName() == 'StatefulWidget');
  }

  String? _findStateClassFromWidget(
    ClassDecl widget,
    Map<String, ClassDecl> classesById,
  ) {
    // Look for State<WidgetName> or _WidgetNameState pattern
    final widgetName = widget.name;

    // Pattern 1: _WidgetNameState
    final pattern1 = '${widget.name}State';
    for (final classEntry in classesById.entries) {
      if (classEntry.value.name.endsWith(pattern1)) {
        return classEntry.key;
      }
    }

    // Pattern 2: _WidgetName
    final pattern2 = '_$widgetName';
    for (final classEntry in classesById.entries) {
      if (classEntry.value.name == pattern2 &&
          _isStateSubclass(classEntry.value)) {
        return classEntry.key;
      }
    }

    return null;
  }

  bool _isStateSubclass(ClassDecl classDecl) {
    if (classDecl.superclass == null) return false;
    final superName = classDecl.superclass!.displayName();
    return superName.contains('State');
  }

  void _processStateLifecycleMethods(
    String stateClassId,
    ClassDecl stateClass,
  ) {
    for (final method in stateClass.methods) {
      switch (method.name) {
        case 'initState':
          _relationships.registerStateLifecycleMethod(
            stateClassId,
            StateLifecycleMethod.initState,
            method.id,
          );
          break;
        case 'dispose':
          _relationships.registerStateLifecycleMethod(
            stateClassId,
            StateLifecycleMethod.dispose,
            method.id,
          );
          break;
        case 'didUpdateWidget':
          _relationships.registerStateLifecycleMethod(
            stateClassId,
            StateLifecycleMethod.didUpdateWidget,
            method.id,
          );
          break;
        case 'didChangeDependencies':
          _relationships.registerStateLifecycleMethod(
            stateClassId,
            StateLifecycleMethod.didChangeDependencies,
            method.id,
          );
          break;
        case 'build':
          _relationships.registerStateBuildMethod(stateClassId, method.id);
          break;
      }
    }
  }

  void collectStringsFromRelationships() {
    printlog('[COLLECT RELATIONSHIPS] Starting...');

    // Collect lifecycle method type names
    for (final entry in _relationships.stateLifecycleMethods.entries) {
      addString(entry.key);
      for (final method in entry.value.values) {
        addString(method);
      }
    }
    printlog(
      '[COLLECT RELATIONSHIPS] State lifecycle methods: ${_relationships.stateLifecycleMethods.length}',
    );

    // Collect widget-state connection names
    for (final entry in _relationships.widgetToStateClass.entries) {
      addString(entry.key);
      addString(entry.value);
    }
    printlog(
      '[COLLECT RELATIONSHIPS] Widget-state connections: ${_relationships.widgetToStateClass.length}',
    );

    // Collect build methods
    for (final entry in _relationships.stateBuildMethods.entries) {
      addString(entry.key);
      addString(entry.value);
    }
    printlog(
      '[COLLECT RELATIONSHIPS] Build methods: ${_relationships.stateBuildMethods.length}',
    );

    // Collect method call names
    for (final entry in _relationships.methodCalls.entries) {
      addString(entry.key);
      for (final calledId in entry.value) {
        addString(calledId);
      }
    }
    printlog(
      '[COLLECT RELATIONSHIPS] Method calls: ${_relationships.methodCalls.length}',
    );

    // Collect field access names
    for (final entry in _relationships.fieldAccesses.entries) {
      addString(entry.key);
      for (final fieldId in entry.value) {
        addString(fieldId);
      }
    }
    printlog(
      '[COLLECT RELATIONSHIPS] Field accesses: ${_relationships.fieldAccesses.length}',
    );

    // Collect class hierarchy
    for (final entry in _relationships.classHierarchy.entries) {
      addString(entry.key);
      addString(entry.value);
    }
    printlog(
      '[COLLECT RELATIONSHIPS] Class hierarchy: ${_relationships.classHierarchy.length}',
    );

    // Collect interface implementations
    for (final entry in _relationships.interfaceImplementers.entries) {
      addString(entry.key);
      for (final implementerId in entry.value) {
        addString(implementerId);
      }
    }
    printlog(
      '[COLLECT RELATIONSHIPS] Interface implementations: ${_relationships.interfaceImplementers.length}',
    );

    // âœ… NEW: Collect class build outputs (from extraction data)
    for (final entry in _relationships.classBuildOutputs.entries) {
      addString(entry.key);
      addString(entry.value);
    }
    printlog(
      '[COLLECT RELATIONSHIPS] Class build outputs: ${_relationships.classBuildOutputs.length}',
    );

    printlog('[COLLECT RELATIONSHIPS] Complete');
  }
}
