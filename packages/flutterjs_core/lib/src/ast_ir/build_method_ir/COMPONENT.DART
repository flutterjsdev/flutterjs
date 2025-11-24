// ============================================================================
// FLUTTER COMPONENT SYSTEM V2 - IR-CENTRIC ARCHITECTURE
// ============================================================================
// Migration Strategy:
// - Old: FlutterComponent hierarchy for simple representation
// - New: Direct production of BuildMethodIR, WidgetTreeIR, WidgetNodeIR
// - Rationale: The advanced IR provides lossless analysis data needed for
//   correctness checking, optimization, and performance analysis
// - Benefit: Single source of truth for both analysis and tooling
// ============================================================================

import 'package:meta/meta.dart';
import '../diagnostics/source_location.dart';
import '../ir/expression_ir.dart';
import '../ir/ir_node.dart';
import '../ir/type_ir.dart';
import '../build_method/build_method_ir.dart';
import '../build_method/widget_tree_ir.dart';
import '../build_method/widget_node_ir.dart';
import '../build_method/key_type_ir.dart';

// ============================================================================
// 1. IR-CENTRIC COMPONENT MODEL (Legacy compatibility layer)
// ============================================================================

/// Represents ANY renderable/buildable component in Flutter code
/// NOW: Production layer delegates to proper IR types
@immutable
abstract class FlutterComponent extends IRNode {
  final String displayName;
  final ComponentType type;

  const FlutterComponent({
    required super.id,
    required this.displayName,
    required this.type,
    super.metadata = const {},
    required super.sourceLocation,
  });

  Map<String, dynamic> toJson();
  String describe();
  bool get isHotReloadable => true;
  bool get canContainChildren => false;
  List<FlutterComponent> getChildren() => [];
}

enum ComponentType {
  widget, builder, callback, lambda, conditional, loop, collection,
  cascade, nullCoalescing, nullAware, spread, container, unsupported,
  computation, validation, factory, accessor, helper, sideEffect, mixed,
}

// Legacy components - kept for backward compatibility in non-build contexts
@immutable
class LegacyWidgetComponent extends FlutterComponent {
  final String widgetName;
  final String? constructorName;
  final List<PropertyBinding> properties;
  final List<FlutterComponent> children;
  final bool isConst;

  const LegacyWidgetComponent({
    required super.id,
    required this.widgetName,
    required super.sourceLocation,
    this.constructorName,
    this.properties = const [],
    this.children = const [],
    this.isConst = false,
    super.metadata,
  }) : super(displayName: widgetName, type: ComponentType.widget);

  @override
  bool get canContainChildren => true;
  @override
  List<FlutterComponent> getChildren() => children;
  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'widget',
    'widget': widgetName,
    if (constructorName != null) 'constructor': constructorName,
    'const': isConst,
    'properties': [for (final p in properties) p.toJson()],
    'children': [for (final c in children) c.toJson()],
    'location': sourceLocation.toJson(),
  };
  @override
  String describe() {
    final str = widgetName;
    final ctor = constructorName != null ? '.${constructorName!}' : '';
    final count = children.isNotEmpty ? ' (${children.length} children)' : '';
    return '$str$ctor$count';
  }
}

@immutable
class LegacyConditionalComponent extends FlutterComponent {
  final String conditionCode;
  final FlutterComponent thenComponent;
  final FlutterComponent? elseComponent;
  final bool isTernary;

  const LegacyConditionalComponent({
    required super.id,
    required this.conditionCode,
    required this.thenComponent,
    this.elseComponent,
    required super.sourceLocation,
    this.isTernary = false,
    super.metadata,
  }) : super(
    displayName: isTernary ? 'ternary' : 'if',
    type: ComponentType.conditional,
  );

  @override
  bool get canContainChildren => true;
  @override
  List<FlutterComponent> getChildren() {
    final children = [thenComponent];
    if (elseComponent != null) children.add(elseComponent!);
    return children;
  }
  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'conditional',
    'kind': isTernary ? 'ternary' : 'if',
    'condition': conditionCode,
    'then': thenComponent.toJson(),
    if (elseComponent != null) 'else': elseComponent!.toJson(),
    'location': sourceLocation.toJson(),
  };
  @override
  String describe() => '${isTernary ? '?' : 'if'} ($conditionCode) ? ... : ...';
}

@immutable
class LegacyLoopComponent extends FlutterComponent {
  final String loopKind;
  final String? loopVariable;
  final String? iterableCode;
  final String? conditionCode;
  final FlutterComponent bodyComponent;
  final int? estimatedIterations;

  const LegacyLoopComponent({
    required super.id,
    required this.loopKind,
    required this.bodyComponent,
    required super.sourceLocation,
    this.loopVariable,
    this.iterableCode,
    this.conditionCode,
    this.estimatedIterations,
    super.metadata,
  }) : super(displayName: loopKind, type: ComponentType.loop);

  @override
  bool get canContainChildren => true;
  @override
  List<FlutterComponent> getChildren() => [bodyComponent];
  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'loop',
    'kind': loopKind,
    if (loopVariable != null) 'variable': loopVariable,
    if (iterableCode != null) 'iterable': iterableCode,
    if (conditionCode != null) 'condition': conditionCode,
    'body': bodyComponent.toJson(),
    'location': sourceLocation.toJson(),
  };
  @override
  String describe() =>
      '$loopKind${loopVariable != null ? '($loopVariable)' : ''}';
}

@immutable
class LegacyCollectionComponent extends FlutterComponent {
  final String collectionKind;
  final List<FlutterComponent> elements;
  final bool hasSpread;

  const LegacyCollectionComponent({
    required super.id,
    required this.collectionKind,
    required this.elements,
    required super.sourceLocation,
    this.hasSpread = false,
    super.metadata,
  }) : super(displayName: collectionKind, type: ComponentType.collection);

  @override
  bool get canContainChildren => true;
  @override
  List<FlutterComponent> getChildren() => elements;
  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'collection',
    'kind': collectionKind,
    'elements': [for (final e in elements) e.toJson()],
    'hasSpread': hasSpread,
    'location': sourceLocation.toJson(),
  };
  @override
  String describe() =>
      '$collectionKind[${elements.length} items]${hasSpread ? ' (spread)' : ''}';
}

@immutable
class LegacyUnsupportedComponent extends FlutterComponent {
  final String sourceCode;
  final String? reason;

  const LegacyUnsupportedComponent({
    required super.id,
    required this.sourceCode,
    required super.sourceLocation,
    this.reason,
    super.metadata,
  }) : super(displayName: 'unsupported', type: ComponentType.unsupported);

  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'unsupported',
    'source': sourceCode,
    if (reason != null) 'reason': reason,
    'location': sourceLocation.toJson(),
  };
  @override
  String describe() => 'UNSUPPORTED: $sourceCode';
}

// ============================================================================
// 2. PROPERTY BINDINGS
// ============================================================================

@immutable
abstract class PropertyBinding {
  final String name;
  final String value;
  final PropertyType type;

  const PropertyBinding({
    required this.name,
    required this.value,
    required this.type,
  });

  Map<String, dynamic> toJson();
}

enum PropertyType {
  literal, variable, callback, builder, expression,
}

@immutable
class LiteralPropertyBinding extends PropertyBinding {
  const LiteralPropertyBinding({required super.name, required super.value})
    : super(type: PropertyType.literal);

  @override
  Map<String, dynamic> toJson() => {
    'name': name,
    'value': value,
    'type': 'literal',
  };
}

@immutable
class CallbackPropertyBinding extends PropertyBinding {
  final List<String> parameters;
  final bool isAsync;

  const CallbackPropertyBinding({
    required super.name,
    required super.value,
    required this.parameters,
    this.isAsync = false,
  }) : super(type: PropertyType.callback);

  @override
  Map<String, dynamic> toJson() => {
    'name': name,
    'value': value,
    'type': 'callback',
    'parameters': parameters,
    'async': isAsync,
  };
}

@immutable
class BuilderPropertyBinding extends PropertyBinding {
  final List<String> parameters;

  const BuilderPropertyBinding({
    required super.name,
    required super.value,
    required this.parameters,
  }) : super(type: PropertyType.builder);

  @override
  Map<String, dynamic> toJson() => {
    'name': name,
    'value': value,
    'type': 'builder',
    'parameters': parameters,
  };
}

// ============================================================================
// 3. NEW: IR-NATIVE BUILDER COMPONENT
// ============================================================================

/// Wraps BuildMethodIR with component-like interface for backward compat
@immutable
class BuildMethodComponent extends FlutterComponent {
  final BuildMethodIR buildMethodIR;

  const BuildMethodComponent({
    required super.id,
    required this.buildMethodIR,
    required super.sourceLocation,
    super.metadata,
  }) : super(
    displayName: buildMethodIR.name,
    type: ComponentType.builder,
  );

  @override
  bool get canContainChildren => true;

  @override
  List<FlutterComponent> getChildren() {
    // Return root widget wrapped as component if present
    if (buildMethodIR.rootWidget != null) {
      return [_widgetNodeToComponent(buildMethodIR.rootWidget!)];
    }
    return [];
  }

  static FlutterComponent _widgetNodeToComponent(WidgetNodeIR node) {
    final children = node.children.map(_widgetNodeToComponent).toList();
    return LegacyWidgetComponent(
      id: node.id,
      widgetName: node.widgetType,
      constructorName: node.constructorName,
      sourceLocation: node.sourceLocation,
      isConst: node.isConst,
      children: children,
    );
  }

  @override
  Map<String, dynamic> toJson() => buildMethodIR.toJson() as Map<String, dynamic>;

  @override
  String describe() => 'BuildMethod: ${buildMethodIR.name}';
}

// ============================================================================
// 4. COMPONENT REGISTRY - IR EDITION
// ============================================================================

class ComponentRegistry {
  final Map<String, ComponentDetector> detectors = {};
  final Set<String> knownWidgets = {};

  ComponentRegistry() {
    _registerCommonWidgets();
  }

  void _registerCommonWidgets() {
    const widgets = {
      'Scaffold', 'AppBar', 'Container', 'Column', 'Row', 'Center', 'Text',
      'Button', 'FloatingActionButton', 'ListView', 'GridView', 'Stack',
      'Positioned', 'GestureDetector', 'InkWell', 'MaterialApp',
      'ElevatedButton', 'Icon', 'Padding', 'SizedBox', 'Expanded',
      'Flexible', 'Dialog', 'AlertDialog', 'Card', 'ListTile', 'Drawer',
      'FutureBuilder', 'StreamBuilder', 'AnimatedContainer', 'AnimatedOpacity',
      'Transform', 'ClipRRect', 'CustomWidget',
    };
    knownWidgets.addAll(widgets);
  }

  void register(String key, ComponentDetector detector) {
    detectors[key] = detector;
  }

  // Detection methods (delegated)
  bool isWidgetCreation(dynamic node) =>
      _call('isWidgetCreation', node) ?? false;
  bool isConditional(dynamic node) => _call('isConditional', node) ?? false;
  bool isLoop(dynamic node) => _call('isLoop', node) ?? false;
  bool isCollection(dynamic node) => _call('isCollection', node) ?? false;
  bool isBuilder(dynamic node) => _call('isBuilder', node) ?? false;
  bool isCallback(dynamic node) => _call('isCallback', node) ?? false;
  bool isBuildMethod(dynamic node) => _call('isBuildMethod', node) ?? false;

  // Extraction methods (delegated)
  String getWidgetName(dynamic node) =>
      _call('getWidgetName', node) ?? 'Unknown';
  String? getConstructorName(dynamic node) => _call('getConstructorName', node);
  bool isConst(dynamic node) => _call('isConst', node) ?? false;
  List<PropertyBinding> getProperties(dynamic node) =>
      _call('getProperties', node) ?? [];
  List<dynamic> getChildElements(dynamic node) =>
      _call('getChildElements', node) ?? [];
  KeyTypeIR? getKeyInfo(dynamic node) => _call('getKeyInfo', node);

  String getCondition(dynamic node) => _call('getCondition', node) ?? 'true';
  dynamic getThenBranch(dynamic node) => _call('getThenBranch', node);
  dynamic getElseBranch(dynamic node) => _call('getElseBranch', node);
  bool isTernary(dynamic node) => _call('isTernary', node) ?? false;

  String getLoopKind(dynamic node) => _call('getLoopKind', node) ?? 'for';
  String? getLoopVariable(dynamic node) => _call('getLoopVariable', node);
  String? getIterable(dynamic node) => _call('getIterable', node);
  String? getLoopCondition(dynamic node) => _call('getLoopCondition', node);
  dynamic getLoopBody(dynamic node) => _call('getLoopBody', node);

  String getCollectionKind(dynamic node) =>
      _call('getCollectionKind', node) ?? 'list';
  bool hasSpread(dynamic node) => _call('hasSpread', node) ?? false;
  List<dynamic> getCollectionElements(dynamic node) =>
      _call('getCollectionElements', node) ?? [];

  String getBuilderName(dynamic node) =>
      _call('getBuilderName', node) ?? 'builder';
  List<String> getBuilderParameters(dynamic node) =>
      _call('getBuilderParameters', node) ?? [];
  bool isAsyncBuilder(dynamic node) => _call('isAsyncBuilder', node) ?? false;

  String getCallbackName(dynamic node) =>
      _call('getCallbackName', node) ?? 'callback';
  List<String> getCallbackParameters(dynamic node) =>
      _call('getCallbackParameters', node) ?? [];

  // NEW: Build method and IR extraction
  BuildMethodIR? extractBuildMethod(dynamic node) =>
      _call('extractBuildMethod', node);

  dynamic? _call(String method, dynamic node) {
    for (final detector in detectors.values) {
      try {
        return (detector as dynamic).call(method, node);
      } catch (_) {}
    }
    return null;
  }
}

// ============================================================================
// 5. DETECTOR INTERFACE
// ============================================================================

abstract class ComponentDetector {
  dynamic call(String method, dynamic node);
}

// ============================================================================
// 6. COMPONENT EXTRACTOR - IR EDITION
// ============================================================================

class ComponentExtractor {
  final String filePath;
  final String fileContent;
  final ComponentRegistry registry;
  final String id;
  int _idCounter = 0;

  ComponentExtractor({
    required this.filePath,
    required this.fileContent,
    required this.id,
    ComponentRegistry? registry,
  }) : registry = registry ?? ComponentRegistry();

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

  /// PRIMARY: Extract build method → BuildMethodIR
  BuildMethodIR? extractBuildMethod(dynamic astNode, {required String methodName, required String className}) {
    try {
      // Delegate to adapter if it implements custom build extraction
      final result = registry.extractBuildMethod(astNode);
      if (result != null) return result;

      // Otherwise, generic extraction
      return _buildGenericBuildMethod(astNode, methodName, className);
    } catch (e) {
      return null;
    }
  }

  /// SECONDARY: Legacy extraction (for non-build contexts)
  FlutterComponent extract(dynamic astNode, {String? hint}) {
    try {
      if (registry.isBuildMethod(astNode)) {
        // Try to extract as BuildMethodIR, wrap if successful
        final buildIR = extractBuildMethod(astNode, methodName: 'build', className: 'Unknown');
        if (buildIR != null) {
          return BuildMethodComponent(
            id: _generateId('build_method'),
            buildMethodIR: buildIR,
            sourceLocation: _makeLocation(0, 0),
          );
        }
      }

      return _detectAndExtract(astNode, hint);
    } catch (e) {
      return LegacyUnsupportedComponent(
        id: _generateId('unsupported'),
        sourceCode: astNode.toString(),
        sourceLocation: _makeLocation(0, 0),
        reason: 'Error: $e',
      );
    }
  }

  FlutterComponent _detectAndExtract(dynamic node, String? hint) {
    if (registry.isWidgetCreation(node)) {
      return _extractWidget(node);
    }
    if (registry.isConditional(node)) {
      return _extractConditional(node);
    }
    if (registry.isLoop(node)) {
      return _extractLoop(node);
    }
    if (registry.isCollection(node)) {
      return _extractCollection(node);
    }
    if (registry.isBuilder(node)) {
      return _extractBuilder(node);
    }
    if (registry.isCallback(node)) {
      return _extractCallback(node);
    }

    return LegacyUnsupportedComponent(
      id: _generateId('unsupported'),
      sourceCode: node.toString(),
      sourceLocation: _makeLocation(0, 0),
      reason: 'No extractor matched',
    );
  }

  FlutterComponent _extractWidget(dynamic node) {
    final widgetName = registry.getWidgetName(node);
    final ctor = registry.getConstructorName(node);
    final isConst = registry.isConst(node);
    final properties = registry.getProperties(node);
    final children = <FlutterComponent>[];
    final childElements = registry.getChildElements(node);

    for (final child in childElements) {
      children.add(extract(child));
    }

    return LegacyWidgetComponent(
      id: _generateId('widget_$widgetName'),
      widgetName: widgetName,
      constructorName: ctor,
      sourceLocation: _makeLocation(0, 0),
      isConst: isConst,
      properties: properties,
      children: children,
    );
  }

  FlutterComponent _extractConditional(dynamic node) {
    final condition = registry.getCondition(node);
    final thenNode = registry.getThenBranch(node);
    final elseNode = registry.getElseBranch(node);
    final isTernary = registry.isTernary(node);

    return LegacyConditionalComponent(
      id: _generateId('conditional'),
      conditionCode: condition,
      thenComponent: extract(thenNode),
      elseComponent: elseNode != null ? extract(elseNode) : null,
      sourceLocation: _makeLocation(0, 0),
      isTernary: isTernary,
    );
  }

  FlutterComponent _extractLoop(dynamic node) {
    final loopKind = registry.getLoopKind(node);
    final loopVar = registry.getLoopVariable(node);
    final iterable = registry.getIterable(node);
    final condition = registry.getLoopCondition(node);
    final bodyNode = registry.getLoopBody(node);

    return LegacyLoopComponent(
      id: _generateId('loop_$loopKind'),
      loopKind: loopKind,
      loopVariable: loopVar,
      iterableCode: iterable,
      conditionCode: condition,
      bodyComponent: extract(bodyNode),
      sourceLocation: _makeLocation(0, 0),
    );
  }

  FlutterComponent _extractCollection(dynamic node) {
    final kind = registry.getCollectionKind(node);
    final hasSpread = registry.hasSpread(node);
    final elements = registry.getCollectionElements(node);
    final componentElements = <FlutterComponent>[];

    for (final elem in elements) {
      componentElements.add(extract(elem));
    }

    return LegacyCollectionComponent(
      id: _generateId('collection_$kind'),
      collectionKind: kind,
      elements: componentElements,
      sourceLocation: _makeLocation(0, 0),
      hasSpread: hasSpread,
    );
  }

  FlutterComponent _extractBuilder(dynamic node) {
    final name = registry.getBuilderName(node);
    final params = registry.getBuilderParameters(node);
    final isAsync = registry.isAsyncBuilder(node);

    // If this is a FutureBuilder or StreamBuilder, note it
    // (Actual AsyncBuilderIR creation happens in IR adapter)

    return LegacyUnsupportedComponent(
      id: _generateId('builder_$name'),
      sourceCode: 'Builder: $name(${params.join(", ")})',
      sourceLocation: _makeLocation(0, 0),
      reason: 'Builders handled at IR level',
    );
  }

  FlutterComponent _extractCallback(dynamic node) {
    final name = registry.getCallbackName(node);
    final params = registry.getCallbackParameters(node);

    return LegacyUnsupportedComponent(
      id: _generateId('callback_$name'),
      sourceCode: 'Callback: $name(${params.join(", ")})',
      sourceLocation: _makeLocation(0, 0),
      reason: 'Callbacks handled at IR level',
    );
  }

  // Generic build method extraction (fallback)
  BuildMethodIR _buildGenericBuildMethod(
    dynamic astNode,
    String methodName,
    String className,
  ) {
    final location = _makeLocation(0, 0);
    const emptyLocation = SourceLocationIR(
      id: 'empty',
      file: '',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    );

    // Stub: Real implementation in AST adapter
    return BuildMethodIR(
      id: _generateId('build_method'),
      name: methodName,
      className: className,
      sourceLocation: location,
      rootWidget: null,
      widgetTree: null,
      controlFlow: BuildControlFlowIR(
        id: _generateId('control_flow'),
        sourceLocation: emptyLocation,
      ),
      performance: BuildPerformanceIR(
        id: _generateId('performance'),
        sourceLocation: emptyLocation,
      ),
    );
  }
}

// ============================================================================
// 7. PUBLIC API
// ============================================================================

/// Register AST adapter with component registry
void registerASTAdapter(
  ComponentRegistry registry,
  dynamic widgetDetector,
  String filePath,
  String fileContent,
) {
  // Import and register AST adapter from ast_component_adapter.dart
  // This function is called by the main analysis pipeline
}

/// Quick IR extraction for build methods
BuildMethodIR? extractBuildMethodIR(
  dynamic astNode,
  ComponentExtractor extractor,
  String className,
) {
  return extractor.extractBuildMethod(
    astNode,
    methodName: 'build',
    className: className,
  );
}

/// Quick legacy extraction
FlutterComponent extractComponent(
  dynamic astNode,
  ComponentExtractor extractor,
) {
  return extractor.extract(astNode, hint: 'from_ast');
}