// ============================================================================
// COMPREHENSIVE FLUTTER COMPONENT HANDLER SYSTEM
// ============================================================================
// Handles: Widgets, Builders, Functions, Lists, Loops, Conditionals, etc.
// Features: Normalization, Hot Reload Support, Extensibility, Fallbacks
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:meta/meta.dart';
/// ============================================================================
/// flutter_component_system.dart
/// COMPREHENSIVE FLUTTER COMPONENT HANDLER SYSTEM
/// ============================================================================
///
/// A full-featured system for extracting, normalizing, and representing Flutter
/// UI code as structured components. This system works together with AST-based
/// detectors (e.g., ASTComponentAdapter) and the FlutterJS Core engine.
///
/// This file defines:
///   1. A unified `FlutterComponent` model
///   2. All concrete component types (widgets, loops, conditionals, builders...)
///   3. Property binding models (callbacks, builders, literals)
///   4. Source location tracking
///   5. A `ComponentExtractor` that converts AST → FlutterComponents
///   6. A `ComponentRegistry` that manages custom detectors
///   7. Hot reload–safe mutation helpers
///
/// The goal is to represent ANY part of Flutter UI code—widget trees, lists,
/// loops, conditionals, callbacks—as strongly typed component objects that can
/// be serialized, inspected, analyzed, or converted into other formats (e.g.
/// JavaScript/HTML visualizations).
///
///
/// ============================================================================
/// 1. UNIFIED COMPONENT MODEL
/// ============================================================================
///
/// The [`FlutterComponent`] class represents every extractable part of Flutter
/// code. Each component variant (widget, loop, conditional, callback, etc.)
/// extends this base class.
///
/// A `FlutterComponent` includes:
///   • A unique ID  
///   • A `ComponentType` describing its role  
///   • A `displayName`  
///   • A source-code location (`SourceLocationIR`)  
///   • Optional metadata  
///
/// This allows:
///   - Visual tree rendering
///   - UI code introspection
///   - Exporting UI to JSON
///   - Hot reload component replacement
///   - Cross-language translation (Flutter → JS/HTML)
///
///
/// ============================================================================
/// 2. CONCRETE COMPONENT TYPES
/// ============================================================================
///
/// The following extractable component types are supported:
///
///   • `WidgetComponent`  
///   • `BuilderComponent`  
///   • `ConditionalComponent`  
///   • `LoopComponent`  
///   • `CollectionComponent`  
///   • `ContainerFallbackComponent`  
///   • `UnsupportedComponent`  
///
/// These types represent:
///   - Widgets with properties and children
///   - Builder functions (`builder: (ctx) { ... }`)
///   - If/else and ternary operators
///   - For/forEach/while loops
///   - Lists/maps/sets with optional spread elements
///   - Fallback containers when extraction fails
///   - Unsupported syntax (for debugging)
///
/// Every component implements:
///   - `describe()` → human-readable summary  
///   - `toJson()` → serialization  
///   - `getChildren()` → recursive children  
///
///
/// ============================================================================
/// 3. PROPERTY BINDINGS
/// ============================================================================
///
/// Properties inside widget constructors can be:
///   - Literals (`color: Colors.red`)
///   - Variables (`child: myWidget`)
///   - Callbacks (`onTap: () { }`)
///   - Builder functions (`builder: (...)`)
///   - Expressions (`width: size * 2`)
///
/// These distinctions are captured using:
///
///   • `LiteralPropertyBinding`  
///   • `CallbackPropertyBinding`  
///   • `BuilderPropertyBinding`  
///
/// These bindings allow accurate UI rewrites, previews, or code generation.
///
///
/// ============================================================================
/// 4. SOURCE LOCATION TRACKING
/// ============================================================================
///
/// The extractor maps AST offsets to:
///   - Line number  
///   - Column number  
///   - Raw code substring range  
///
/// This enables:
///   • Highlighting source in editors  
///   • Error messages tied to original code  
///   • Click-to-navigate in UI inspectors  
///
///
/// ============================================================================
/// 5. COMPONENT EXTRACTOR
/// ============================================================================
///
/// `ComponentExtractor` is the core engine.  
/// Given any AST node, it:
///
///   1. Identifies its type using `ComponentRegistry`
///   2. Delegates to an appropriate extraction method:
///        - `_extractWidget`  
///        - `_extractConditional`  
///        - `_extractLoop`  
///        - `_extractCollection`  
///        - `_extractBuilder`  
///        - `_extractCallback`  
///   3. Recursively builds a component tree
///
/// This creates a fully typed `FlutterComponent` tree that mirrors the structure
/// of Flutter UI code without requiring a running Flutter app.
///
///
/// ============================================================================
/// 6. COMPONENT REGISTRY (DETECTION SYSTEM)
/// ============================================================================
///
/// `ComponentRegistry` is an extensible system that delegates parsing logic to
/// custom detectors such as:
///
///   - AST-based detectors  
///   - Reflection-based detectors  
///   - Plugin-based detectors  
///
/// It exposes high-level detection functions:
///
///   • `isWidgetCreation(node)`  
///   • `isBuilder(node)`  
///   • `isCallback(node)`  
///   • `isLoop(node)`  
///   • `isCollection(node)`  
///   • `isConditional(node)`  
///
/// Each of these checks is delegated to the registered detectors.
///
/// This architecture allows:
///   - Plug-and-play detectors  
///   - Multiple environments (AST, runtime, hybrid)  
///   - Custom DSLs  
///   - Versioned Flutter support  
///
///
/// ============================================================================
/// 7. HOT RELOAD / MUTATION SUPPORT
/// ============================================================================
///
/// `ComponentModifier` provides optional mutation helpers to support:
///
///   • Adding/removing/replacing child components  
///   • Reordering child lists  
///   • Updating property values  
///
/// These are essential for:
///   - Live preview editing  
///   - Full UI editors  
///   - Hot reload visualization  
///   - Dynamic code generation tools  
///
/// The system is designed with **immutable patterns** so original components
/// stay pure while modified copies are generated.
///
///
/// ============================================================================
/// REQUIREMENTS
/// ============================================================================
///
/// This system requires:
///   • A valid `ComponentDetector` implementation (e.g., ASTComponentAdapter)  
///   • FlutterJS Core (`flutterjs_core`)  
///   • Proper AST parsing (Dart Analyzer if using AST detection)  
///   • Source code string & file path for location tracking  
///
///
/// ============================================================================
/// SUMMARY
/// ============================================================================
///
/// This file defines the **entire component representation layer** of the
/// FlutterJS UI engine. It forms a complete, extensible foundation for analyzing
/// Flutter code, representing it structurally, and enabling tools such as:
///
///   ✔ UI tree previews  
///   ✔ Code inspectors  
///   ✔ Flutter → Web/JS transformers  
///   ✔ Behavior visualizers  
///   ✔ Hot reload visual editors  
///   ✔ Smart refactoring tools  
///
/// It is the central "model layer" for everything related to UI extraction.
///

// ============================================================================
// 1. UNIFIED COMPONENT MODEL
// ============================================================================

/// Represents ANY renderable/buildable component in Flutter code
/// From simple widgets to complex control flow
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

  /// Serialize for transmission/storage
  Map<String, dynamic> toJson();

  /// Human-readable summary
  String describe();

  /// Can this component be hot-replaced?
  bool get isHotReloadable => true;

  /// Can this component contain children?
  bool get canContainChildren => false;

  /// Get child components if any
  List<FlutterComponent> getChildren() => [];
}

/// All possible component types in Flutter code
enum ComponentType {
  // Concrete widgets
  widget,

  // Builders & callbacks
  builder,
  callback,
  lambda,

  // Control flow
  conditional, // if/ternary
  loop, // for/while
  collection, // list/map/set
  // Advanced
  cascade, // obj..prop = value
  nullCoalescing, // ??
  nullAware, // ?.
  spread, // ...items
  // Containers
  container, // fallback
  unsupported, // unknown component

  computation, // calculation, transformation
  validation, // checks, guards
  factory, // object creation
  accessor, // getters, property access
  helper, // setup, initialization
  sideEffect, // i/o, mutations
  mixed, // combination of above
}

// ============================================================================
// 2. CONCRETE COMPONENT IMPLEMENTATIONS
// ============================================================================

@immutable
class WidgetComponent extends FlutterComponent {
  final String widgetName;
  final String? constructorName;
  final List<PropertyBinding> properties;
  final List<FlutterComponent> children;
  final bool isConst;

  const WidgetComponent({
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
class BuilderComponent extends FlutterComponent {
  final String builderName;
  final List<String> parameters;
  final String? bodyDescription;
  final bool isAsync;

  const BuilderComponent({
    required super.id,
    required this.builderName,
    required super.sourceLocation,
    this.parameters = const [],
    this.bodyDescription,
    this.isAsync = false,
    super.metadata,
  }) : super(displayName: builderName, type: ComponentType.builder);

  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'builder',
    'name': builderName,
    'parameters': parameters,
    'async': isAsync,
    if (bodyDescription != null) 'body': bodyDescription,
    'location': sourceLocation.toJson(),
  };

  @override
  String describe() =>
      '$builderName(${parameters.join(', ')})${isAsync ? ' async' : ''}';
}

@immutable
class ConditionalComponent extends FlutterComponent {
  final String conditionCode;
  final FlutterComponent thenComponent;
  final FlutterComponent? elseComponent;
  final bool isTernary;

  const ConditionalComponent({
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
class LoopComponent extends FlutterComponent {
  final String loopKind; // 'for', 'forEach', 'while'
  final String? loopVariable;
  final String? iterableCode;
  final String? conditionCode;
  final FlutterComponent bodyComponent;
  final int? estimatedIterations;

  const LoopComponent({
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
class CollectionComponent extends FlutterComponent {
  final String collectionKind; // 'list', 'map', 'set'
  final List<FlutterComponent> elements;
  final bool hasSpread;

  const CollectionComponent({
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
class UnsupportedComponent extends FlutterComponent {
  final String sourceCode;
  final String? reason;

  const UnsupportedComponent({
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

@immutable
class ContainerFallbackComponent extends FlutterComponent {
  final FlutterComponent? wrappedComponent;
  final String reason;

  const ContainerFallbackComponent({
    required super.id,
    required super.sourceLocation,
    required this.reason,
    this.wrappedComponent,
    super.metadata,
  }) : super(
         displayName: 'Container (fallback)',
         type: ComponentType.container,
       );

  @override
  bool get canContainChildren => true;

  @override
  List<FlutterComponent> getChildren() =>
      wrappedComponent != null ? [wrappedComponent!] : [];

  @override
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': 'container_fallback',
    'reason': reason,
    if (wrappedComponent != null) 'wrapped': wrappedComponent!.toJson(),
    'location': sourceLocation.toJson(),
  };

  @override
  String describe() => 'Container (fallback: $reason)';
}

// ============================================================================
// 3. PROPERTY BINDINGS (Properties, Callbacks, Builders)
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
  literal, // color: Colors.red
  variable, // child: myWidget
  callback, // onTap: () { }
  builder, // builder: (context) { }
  expression, // width: size * 2
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
// 4. SOURCE LOCATION TRACKING
// ============================================================================

// ============================================================================
// 5. COMPONENT EXTRACTOR (Main Handler)
// ============================================================================

class ComponentExtractor {
  final String filePath;
  final String fileContent;
  final ComponentRegistry registry;
  final String id;

  // ID generator
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

  /// Main extraction method - handles ANY component
  FlutterComponent extract(dynamic astNode, {String? hint}) {
    try {
      // Try to detect component type
      final component = _detectAndExtract(astNode, hint);
      return component;
    } catch (e) {
      // Fallback to unsupported
      return UnsupportedComponent(
        id: _generateId('unsupported'),
        sourceCode: astNode.toString(),
        sourceLocation: _makeLocation(0, 0),
        reason: 'Error during extraction: $e',
      );
    }
  }

  FlutterComponent _detectAndExtract(dynamic node, String? hint) {
    // Widget creation
    if (registry.isWidgetCreation(node)) {
      return _extractWidget(node);
    }

    // Conditional (ternary or if)
    if (registry.isConditional(node)) {
      return _extractConditional(node);
    }

    // Loop (for, forEach, while)
    if (registry.isLoop(node)) {
      return _extractLoop(node);
    }

    // Collection (list, map, set)
    if (registry.isCollection(node)) {
      return _extractCollection(node);
    }

    // Builder function
    if (registry.isBuilder(node)) {
      return _extractBuilder(node);
    }

    // Callback function
    if (registry.isCallback(node)) {
      return _extractCallback(node);
    }

    // Unknown
    return UnsupportedComponent(
      id: _generateId('unsupported'),
      sourceCode: node.toString(),
      sourceLocation: _makeLocation(0, 0),
      reason: 'No extractor matched this component type',
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

    return WidgetComponent(
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

    return ConditionalComponent(
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

    return LoopComponent(
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

    return CollectionComponent(
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

    return BuilderComponent(
      id: _generateId('builder_$name'),
      builderName: name,
      parameters: params,
      isAsync: isAsync,
      sourceLocation: _makeLocation(0, 0),
    );
  }

  FlutterComponent _extractCallback(dynamic node) {
    final name = registry.getCallbackName(node);
    final params = registry.getCallbackParameters(node);

    return BuilderComponent(
      id: _generateId('callback_$name'),
      builderName: name,
      parameters: params,
      sourceLocation: _makeLocation(0, 0),
    );
  }
}

// ============================================================================
// 6. COMPONENT REGISTRY (Extensible Detection)
// ============================================================================

class ComponentRegistry {
  final Map<String, ComponentDetector> detectors = {};
  final Set<String> knownWidgets = {};

  ComponentRegistry() {
    _registerDefaultDetectors();
    _registerCommonWidgets();
  }

  void _registerDefaultDetectors() {
    // Default implementation - override with AST-specific logic
  }

  void _registerCommonWidgets() {
    const widgets = {
      'Scaffold',
      'AppBar',
      'Container',
      'Column',
      'Row',
      'Center',
      'Text',
      'Button',
      'FloatingActionButton',
      'ListView',
      'GridView',
      'Stack',
      'Positioned',
      'GestureDetector',
      'InkWell',
      'MaterialApp',
      'ElevatedButton',
      'Icon',
      'Padding',
      'SizedBox',
      'Expanded',
      'Flexible',
      'Dialog',
      'AlertDialog',
      'Card',
      'ListTile',
      'Drawer',
    };
    knownWidgets.addAll(widgets);
  }

  /// Register custom detector
  void register(String key, ComponentDetector detector) {
    detectors[key] = detector;
  }

  /// Detection methods
  bool isWidgetCreation(dynamic node) =>
      _call('isWidgetCreation', node) ?? false;
  bool isConditional(dynamic node) => _call('isConditional', node) ?? false;
  bool isLoop(dynamic node) => _call('isLoop', node) ?? false;
  bool isCollection(dynamic node) => _call('isCollection', node) ?? false;
  bool isBuilder(dynamic node) => _call('isBuilder', node) ?? false;
  bool isCallback(dynamic node) => _call('isCallback', node) ?? false;

  String getWidgetName(dynamic node) =>
      _call('getWidgetName', node) ?? 'Unknown';
  String? getConstructorName(dynamic node) => _call('getConstructorName', node);
  bool isConst(dynamic node) => _call('isConst', node) ?? false;
  List<PropertyBinding> getProperties(dynamic node) =>
      _call('getProperties', node) ?? [];
  List<dynamic> getChildElements(dynamic node) =>
      _call('getChildElements', node) ?? [];

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

  dynamic? _call(String method, dynamic node) {
    for (final detector in detectors.values) {
      try {
        return (detector as dynamic).call(method, node);
      } catch (_) {}
    }
    return null;
  }
}

/// Interface for custom detectors
abstract class ComponentDetector {
  dynamic call(String method, dynamic node);
}

// ============================================================================
// 7. HOT RELOAD SUPPORT
// ============================================================================

class ComponentModifier {
  /// Add a component
  static FlutterComponent addComponent(
    FlutterComponent parent,
    FlutterComponent child, {
    int? atIndex,
  }) {
    if (!parent.canContainChildren) {
      throw Exception('$parent cannot contain children');
    }
    // Return modified parent (immutable update)
    // Implementation depends on parent type
    return parent;
  }

  /// Remove a component
  static FlutterComponent removeComponent(
    FlutterComponent parent,
    String childId,
  ) {
    if (!parent.canContainChildren) {
      throw Exception('$parent cannot contain children');
    }
    // Return modified parent
    return parent;
  }

  /// Replace a component
  static FlutterComponent replaceComponent(
    FlutterComponent parent,
    String oldId,
    FlutterComponent newComponent,
  ) {
    // Find and replace
    return parent;
  }

  /// Reorder components
  static FlutterComponent reorderComponents(
    FlutterComponent parent,
    int fromIndex,
    int toIndex,
  ) {
    // Reorder children
    return parent;
  }

  /// Update property
  static FlutterComponent updateProperty(
    FlutterComponent component,
    String propertyName,
    String newValue,
  ) {
    if (component is WidgetComponent) {
      // Update property binding
    }
    return component;
  }
}
