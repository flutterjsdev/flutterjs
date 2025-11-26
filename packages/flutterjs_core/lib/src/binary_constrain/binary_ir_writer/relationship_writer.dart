import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/binary_constrain/binary_ir_writer/ir_relationship_registry.dart';

import '../../ir/expressions/cascade_expression_ir.dart';

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

    _processBuildMethods(classesById);

    // Process widget-state connections
    _processWidgetStateConnections(classesById);

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

  void _processBuildMethods(Map<String, ClassDecl> classesById) {
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
        // Extract widget tree from return statement
        final returnedWidget = _extractWidgetFromBuildBody(buildMethod.body!);

        if (returnedWidget != null) {
          // Store relationship: class -> widget tree
          final widgetName = returnedWidget.debugName;
          addString(widgetName);
          _relationships.registerClassBuildOutput(classDecl.id, widgetName);
        }
      }
    }
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
    // Collect lifecycle method type names
    for (final entry in _relationships.stateLifecycleMethods.entries) {
      for (final method in entry.value.values) {
        addString(method);
      }
    }

    // Collect widget-state connection names
    for (final entry in _relationships.widgetToStateClass.entries) {
      addString(entry.key);
      addString(entry.value);
    }

    // Collect method call names
    for (final entry in _relationships.methodCalls.entries) {
      addString(entry.key);
      for (final calledId in entry.value) {
        addString(calledId);
      }
    }

    // Collect field access names
    for (final entry in _relationships.fieldAccesses.entries) {
      addString(entry.key);
      for (final fieldId in entry.value) {
        addString(fieldId);
      }
    }

    // Collect class hierarchy
    for (final entry in _relationships.classHierarchy.entries) {
      addString(entry.key);
      addString(entry.value);
    }

    printlog('[COLLECT] Relationship strings collected');
  }
}
