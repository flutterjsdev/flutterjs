import 'package:flutterjs_core/flutterjs_core.dart';

import '../binary_constrain/binary_ir_writer/ir_relationship_registry.dart';

class WidgetMetadata {
  /// Maps build method ID -> root widget type (e.g., "Scaffold", "Container")
  final Map<String, String> buildMethods;

  /// Maps widget class ID -> state class ID (e.g., "MyAppWidget" -> "_MyAppState")
  final Map<String, String> widgetStateConnections;

  /// Maps subclass ID -> superclass name (inheritance chain)
  final Map<String, String> classHierarchy;

  /// Maps state class ID -> lifecycle method IDs
  final Map<String, Map<String, String>> stateLifecycleMethods;

  /// Maps state class ID -> build method ID
  final Map<String, String> stateBuildMethods;

  /// All widget classes found in the code
  final Set<String> widgetClasses;

  /// Maps class ID -> widget tree structure (for advanced analysis)
  final Map<String, WidgetTreeNode?> widgetTrees;

  /// Interface implementations (interface name -> implementing class IDs)
  final Map<String, Set<String>> interfaceImplementers;

  /// Method call graph (method ID -> called method IDs)
  final Map<String, Set<String>> methodCalls;

  /// Field access graph (method ID -> accessed field IDs)
  final Map<String, Set<String>> fieldAccesses;

  WidgetMetadata({
    Map<String, String>? buildMethods,
    Map<String, String>? widgetStateConnections,
    Map<String, String>? classHierarchy,
    Map<String, Map<String, String>>? stateLifecycleMethods,
    Map<String, String>? stateBuildMethods,
    Set<String>? widgetClasses,
    Map<String, WidgetTreeNode?>? widgetTrees,
    Map<String, Set<String>>? interfaceImplementers,
    Map<String, Set<String>>? methodCalls,
    Map<String, Set<String>>? fieldAccesses,
  }) : buildMethods = buildMethods ?? {},
       widgetStateConnections = widgetStateConnections ?? {},
       classHierarchy = classHierarchy ?? {},
       stateLifecycleMethods = stateLifecycleMethods ?? {},
       stateBuildMethods = stateBuildMethods ?? {},
       widgetClasses = widgetClasses ?? {},
       widgetTrees = widgetTrees ?? {},
       interfaceImplementers = interfaceImplementers ?? {},
       methodCalls = methodCalls ?? {},
       fieldAccesses = fieldAccesses ?? {};

  /// Check if a class is a StatefulWidget
  bool isStatefulWidget(String classId) {
    return widgetStateConnections.containsKey(classId);
  }

  /// Check if a class is a State subclass
  bool isStateClass(String classId) {
    return stateBuildMethods.containsKey(classId) ||
        stateLifecycleMethods.containsKey(classId);
  }

  /// Get build method for a state class
  String? getBuildMethod(String stateClassId) {
    return stateBuildMethods[stateClassId];
  }

  /// Get root widget type returned by a build method
  String? getRootWidgetType(String buildMethodId) {
    return buildMethods[buildMethodId];
  }

  /// Get state class for a widget
  String? getStateClass(String widgetClassId) {
    return widgetStateConnections[widgetClassId];
  }

  /// Get superclass name for a class
  String? getSuperclass(String classId) {
    return classHierarchy[classId];
  }

  /// Check if class implements an interface
  bool implementsInterface(String classId, String interfaceName) {
    return interfaceImplementers[interfaceName]?.contains(classId) ?? false;
  }

  /// Get all methods called from a method
  Set<String> getCalledMethods(String methodId) {
    return methodCalls[methodId] ?? {};
  }

  /// Get all fields accessed from a method
  Set<String> getAccessedFields(String methodId) {
    return fieldAccesses[methodId] ?? {};
  }

  /// Create from relationship registry
  static WidgetMetadata fromRegistry(IRRelationshipRegistry registry) {
    return WidgetMetadata(
      buildMethods: Map.from(registry.classBuildOutputs),
      widgetStateConnections: Map.from(registry.widgetToStateClass),
      classHierarchy: Map.from(registry.classHierarchy),
      stateLifecycleMethods: Map.from(registry.stateLifecycleMethods),
      stateBuildMethods: Map.from(registry.stateBuildMethods),
      widgetClasses: registry.widgetToStateClass.keys.toSet(),
      interfaceImplementers: Map.from(registry.interfaceImplementers),
      methodCalls: Map.from(registry.methodCalls),
      fieldAccesses: Map.from(registry.fieldAccesses),
    );
  }

  /// Convert to JSON-friendly format for serialization
  Map<String, dynamic> toJson() => {
    'buildMethods': buildMethods,
    'widgetStateConnections': widgetStateConnections,
    'classHierarchy': classHierarchy,
    'stateLifecycleMethods': stateLifecycleMethods,
    'stateBuildMethods': stateBuildMethods,
    'widgetClasses': widgetClasses.toList(),
    'interfaceImplementers': interfaceImplementers.map(
      (k, v) => MapEntry(k, v.toList()),
    ),
    'methodCalls': methodCalls.map((k, v) => MapEntry(k, v.toList())),
    'fieldAccesses': fieldAccesses.map((k, v) => MapEntry(k, v.toList())),
  };

  @override
  String toString() {
    return '''WidgetMetadata(
  buildMethods: ${buildMethods.length},
  widgetStateConnections: ${widgetStateConnections.length},
  classHierarchy: ${classHierarchy.length},
  stateLifecycleMethods: ${stateLifecycleMethods.length},
  widgetClasses: ${widgetClasses.length},
  interfaceImplementers: ${interfaceImplementers.length},
  methodCalls: ${methodCalls.length},
  fieldAccesses: ${fieldAccesses.length},
)''';
  }
}



class WidgetTreeNode {
  /// Widget class name (e.g., "Scaffold", "Container")
  final String widgetType;

  /// Constructor name if custom (e.g., "named" in Container.named())
  final String? constructorName;

  /// Child widgets
  final List<WidgetTreeNode> children;

  /// Properties passed to widget (child, children, body, etc.)
  final Map<String, dynamic> properties;

  WidgetTreeNode({
    required this.widgetType,
    this.constructorName,
    List<WidgetTreeNode>? children,
    Map<String, dynamic>? properties,
  })  : children = children ?? [],
        properties = properties ?? {};

  /// Pretty print widget tree
  String prettyPrint({int indent = 0}) {
    final prefix = '  ' * indent;
    final buffer = StringBuffer();

    buffer.write('$prefix$widgetType');
    if (constructorName != null) {
      buffer.write('.$constructorName');
    }

    if (properties.isNotEmpty) {
      buffer.write(' {');
      for (final entry in properties.entries) {
        buffer.write('${entry.key}: ${entry.value}');
      }
      buffer.write('}');
    }

    buffer.writeln();

    for (final child in children) {
      buffer.write(child.prettyPrint(indent: indent + 1));
    }

    return buffer.toString();
  }
}

extension DartFileWidgetMetadata on DartFile {
  /// Get widget metadata attached to this file
  WidgetMetadata? getWidgetMetadata() {
    // Stored during IR reading
    return _widgetMetadataCache;
  }

  /// Set widget metadata (called by reader)
  void attachWidgetMetadata(WidgetMetadata metadata) {
    _widgetMetadataCache = metadata;
  }
}

// Add this field to DartFile class
late WidgetMetadata? _widgetMetadataCache;