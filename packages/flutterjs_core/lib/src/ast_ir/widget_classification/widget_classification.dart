import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:meta/meta.dart';
import '../class_decl.dart';
import 'dart:core';

import '../function_decl.dart';

/// <---------------------------------------------------------------------------->
/// widget_classification.dart
/// ----------------------------------------------------------------------------
///
/// Core model and classification engine for Flutter widgets in a static-analysis
/// tool (custom linter, IDE plugin, architecture auditor, performance profiler, etc.).
///
/// This file provides:
/// • Enums that categorise widgets by type, purpose, performance impact, and child-handling
/// • [WidgetDecl] – an immutable, enriched representation of a widget class that extends
///   the generic [ClassDecl] with widget-specific diagnostics (const-constructible,
///   rebuild frequency, known anti-patterns, etc.)
/// • [WidgetProperty] & [ChildHandling] – metadata for common widget parameters
/// • [WidgetClassifier] – a pure-static service that automatically classifies any
///   [ClassDecl] into a fully-populated [WidgetDecl] using heuristics, name-based
///   look-ups, and deep analysis of constructors, fields, and the build method.
///
/// The classifier is deliberately stateless and side-effect-free so it can be used
/// both in a one-pass analyzer and in incremental/re-entrant analysis pipelines.
///
/// Typical usage inside an analyzer:
/// ```dart
/// final widgetDecl = WidgetClassifier.classify(classDecl);
/// print('Widget ${widgetDecl.name} → ${widgetDecl.characteristics}');
/// if (widgetDecl.knownIssues.isNotEmpty) { … report issues … }
/// ```
///
/// The data produced here is consumed by:
/// • Performance dashboards (expensive rebuild detection)
/// • Architecture linters (StatelessWidget with mutable fields, etc.)
/// • Widget-tree visualisers
/// • Automatic refactoring tools (extract-widget, add-const, etc.)
///
/// All classes are `@immutable` and provide value-equality, JSON serialization
/// helpers (via `toJson` on related IR nodes), and rich `toString` overrides for
/// debugging and reporting.
/// <---------------------------------------------------------------------------->
/// Categorizes different widget types in Flutter
enum WidgetType {
  /// StatelessWidget - no internal state
  stateless,

  /// StatefulWidget - manages internal state
  stateful,

  /// InheritedWidget - passes data down widget tree
  inherited,

  /// State - the state class for a StatefulWidget
  stateClass,

  /// Custom widget (not a standard Flutter widget)
  custom,
}

/// Categories of widgets based on their primary purpose
enum WidgetCategory {
  /// Layout widgets (Container, Row, Column, etc.)
  layout,

  /// Display widgets (Text, Image, Icon, etc.)
  display,

  /// Input widgets (TextField, Button, Checkbox, etc.)
  input,

  /// Navigation widgets (NavigationBar, AppBar, etc.)
  navigation,

  /// List/Grid widgets (ListView, GridView, etc.)
  scrollable,

  /// Async widgets (FutureBuilder, StreamBuilder, etc.)
  async,

  /// Animation widgets (AnimatedContainer, Hero, etc.)
  animation,

  /// Gesture/Event widgets (GestureDetector, InkWell, etc.)
  gesture,

  /// Scaffold/Page widgets (Scaffold, MaterialApp, etc.)
  scaffold,

  /// Other/Unknown category
  other,
}

/// Performance characteristics of a widget
enum PerformanceProfile {
  /// Lightweight, rebuilds frequently with minimal cost
  lightweight,

  /// Moderate cost, rebuilds should be monitored
  moderate,

  /// Expensive widget, minimize rebuilds
  expensive,

  /// Very expensive, should rarely rebuild
  veryExpensive,
}

// =============================================================================
// WIDGET DECLARATION
// =============================================================================

/// Complete representation of a Flutter widget declaration
@immutable
class WidgetDecl extends ClassDecl {
  /// Classification of this widget
  final WidgetType widgetType;

  /// Category of this widget (layout, display, etc.)
  final WidgetCategory category;

  /// Whether this widget extends StatelessWidget
  final bool isStateless;

  /// Whether this widget extends StatefulWidget
  final bool isStateful;

  /// Whether this widget extends InheritedWidget
  final bool isInherited;

  /// Return type of the build method (usually Widget)
  final String buildReturnType;

  /// The build method if present
  final BuildMethodDecl? buildMethod;

  /// If this is a StatefulWidget, reference to associated State class name
  final String? stateClassName;

  /// Performance profile of this widget
  final PerformanceProfile performanceProfile;

  /// Whether this widget is const-constructible
  final bool isConstConstructible;

  /// Common widget properties this widget accepts
  final List<WidgetProperty> commonProperties;

  /// Child/children handling capability
  final ChildHandling childHandling;

  /// Whether this widget rebuilds frequently (heuristic)
  final bool rebuildsFrequently;

  /// Known issues or anti-patterns with this widget
  final List<String> knownIssues;

  WidgetDecl({
    required super.id,
    required super.name,
    required this.widgetType,
    required super.sourceLocation,
    required this.category,
    required this.isStateless,
    required this.isStateful,
    required this.isInherited,
    required this.buildReturnType,
    this.buildMethod,
    this.stateClassName,
    this.performanceProfile = PerformanceProfile.lightweight,
    this.isConstConstructible = true,
    this.commonProperties = const [],
    required this.childHandling,
    this.rebuildsFrequently = false,
    this.knownIssues = const [],
    super.superclass,
    super.interfaces = const [],
    super.mixins = const [],
    super.typeParameters = const [],
    super.fields = const [],
    super.methods = const [],
    super.constructors = const [],
    super.isAbstract = false,
    super.isFinal = false,
    super.isSealed = false,
    super.isMixin = false,
    super.documentation,
    super.annotations = const [],
    super.metadata,
  });

  /// Determine if widget is a standard Flutter widget
  bool get isStandardFlutterWidget => category != WidgetCategory.other;

  /// Check if widget accepts a single child
  bool get acceptsSingleChild => childHandling == ChildHandling.singleChild;

  /// Check if widget accepts multiple children
  bool get acceptsMultipleChildren =>
      childHandling == ChildHandling.multipleChildren;

  /// Check if widget doesn't accept children
  bool get doesNotAcceptChildren => childHandling == ChildHandling.none;

  /// Count of mutable state fields (excluding const/final)
  int get mutableStateFieldCount =>
      fields.where((f) => f.isMutable && !f.isStatic).length;

  /// Check if widget has complex state management
  bool get hasComplexState =>
      mutableStateFieldCount > 3 ||
      methods.any((m) => m.name.contains('setState'));

  /// Summary of widget characteristics
  String get characteristics {
    final parts = <String>[
      widgetType.name,
      category.name,
      performanceProfile.name,
      if (isConstConstructible) 'const-constructible',
      if (rebuildsFrequently) 'frequent-rebuilds',
      childHandling.name,
      if (hasComplexState) 'complex-state',
    ];
    return parts.join(', ');
  }

  /// Get the build method from this widget's methods
  MethodDecl? get buildMethodFromClass {
    try {
      return methods.firstWhere((m) => m.name == 'build');
    } catch (e) {
      return null;
    }
  }

  @override
  String toString() => 'WidgetDecl($name - ${widgetType.name})';
}

// =============================================================================
// WIDGET PROPERTIES
// =============================================================================

/// A property that a widget commonly accepts
@immutable
class WidgetProperty {
  /// Name of the property
  final String name;

  /// Type of the property (e.g., 'Color', 'Widget', 'double')
  final String type;

  /// Whether this property is required
  final bool isRequired;

  /// Default value if not required
  final String? defaultValue;

  /// Whether this property affects layout/size
  final bool affectsLayout;

  /// Whether this property affects appearance
  final bool affectsAppearance;

  /// Whether changing this property triggers rebuild
  final bool triggerRebuild;

  /// Documentation for this property
  final String? documentation;

  const WidgetProperty({
    required this.name,
    required this.type,
    this.isRequired = false,
    this.defaultValue,
    this.affectsLayout = false,
    this.affectsAppearance = false,
    this.triggerRebuild = true,
    this.documentation,
  });

  @override
  String toString() => '$name: $type${isRequired ? ' (required)' : ''}';
}

// =============================================================================
// CHILD HANDLING
// =============================================================================

/// How a widget handles child widgets
enum ChildHandling {
  /// Widget doesn't accept children (Text, Icon, etc.)
  none,

  /// Widget accepts a single child property
  singleChild,

  /// Widget accepts a children list
  multipleChildren,

  /// Widget accepts both child and children (rare)
  mixed,
}

// =============================================================================
// BUILD METHOD DECLARATION
// =============================================================================

/// Information about a widget's build method

// =============================================================================
// WIDGET CLASSIFICATION ENGINE
// =============================================================================

/// Service for classifying widgets
class WidgetClassifier {
  /// Standard Flutter widgets and their categories
  static const Map<String, (WidgetType, WidgetCategory)> _standardWidgets = {
    // Layout widgets
    'Container': (WidgetType.custom, WidgetCategory.layout),
    'Padding': (WidgetType.custom, WidgetCategory.layout),
    'Margin': (WidgetType.custom, WidgetCategory.layout),
    'Center': (WidgetType.custom, WidgetCategory.layout),
    'Align': (WidgetType.custom, WidgetCategory.layout),
    'Row': (WidgetType.custom, WidgetCategory.layout),
    'Column': (WidgetType.custom, WidgetCategory.layout),
    'Stack': (WidgetType.custom, WidgetCategory.layout),
    'Positioned': (WidgetType.custom, WidgetCategory.layout),
    'Flex': (WidgetType.custom, WidgetCategory.layout),
    'Wrap': (WidgetType.custom, WidgetCategory.layout),
    'SizedBox': (WidgetType.custom, WidgetCategory.layout),
    'Expanded': (WidgetType.custom, WidgetCategory.layout),
    'Flexible': (WidgetType.custom, WidgetCategory.layout),
    'AspectRatio': (WidgetType.custom, WidgetCategory.layout),
    'FittedBox': (WidgetType.custom, WidgetCategory.layout),
    'FractionallySizedBox': (WidgetType.custom, WidgetCategory.layout),

    // Display widgets
    'Text': (WidgetType.custom, WidgetCategory.display),
    'RichText': (WidgetType.custom, WidgetCategory.display),
    'Image': (WidgetType.custom, WidgetCategory.display),
    'Icon': (WidgetType.custom, WidgetCategory.display),
    'CircleAvatar': (WidgetType.custom, WidgetCategory.display),
    'Placeholder': (WidgetType.custom, WidgetCategory.display),
    'DecoratedBox': (WidgetType.custom, WidgetCategory.display),
    'Opacity': (WidgetType.custom, WidgetCategory.display),
    'Divider': (WidgetType.custom, WidgetCategory.display),
    'Card': (WidgetType.custom, WidgetCategory.display),
    'Chip': (WidgetType.custom, WidgetCategory.display),

    // Input widgets
    'TextField': (WidgetType.custom, WidgetCategory.input),
    'TextFormField': (WidgetType.custom, WidgetCategory.input),
    'ElevatedButton': (WidgetType.custom, WidgetCategory.input),
    'TextButton': (WidgetType.custom, WidgetCategory.input),
    'OutlinedButton': (WidgetType.custom, WidgetCategory.input),
    'IconButton': (WidgetType.custom, WidgetCategory.input),
    'FloatingActionButton': (WidgetType.custom, WidgetCategory.input),
    'Checkbox': (WidgetType.custom, WidgetCategory.input),
    'Radio': (WidgetType.custom, WidgetCategory.input),
    'Switch': (WidgetType.custom, WidgetCategory.input),
    'Slider': (WidgetType.custom, WidgetCategory.input),
    'DropdownButton': (WidgetType.custom, WidgetCategory.input),
    'Form': (WidgetType.custom, WidgetCategory.input),

    // Navigation widgets
    'AppBar': (WidgetType.custom, WidgetCategory.navigation),
    'BottomNavigationBar': (WidgetType.custom, WidgetCategory.navigation),
    'NavigationBar': (WidgetType.custom, WidgetCategory.navigation),
    'Drawer': (WidgetType.custom, WidgetCategory.navigation),
    'DrawerHeader': (WidgetType.custom, WidgetCategory.navigation),
    'TabBar': (WidgetType.custom, WidgetCategory.navigation),
    'TabBarView': (WidgetType.custom, WidgetCategory.navigation),

    // Scaffold
    'Scaffold': (WidgetType.custom, WidgetCategory.scaffold),
    'MaterialApp': (WidgetType.custom, WidgetCategory.scaffold),
    'WidgetsApp': (WidgetType.custom, WidgetCategory.scaffold),

    // Scrollable/List widgets
    'ListView': (WidgetType.custom, WidgetCategory.scrollable),
    'GridView': (WidgetType.custom, WidgetCategory.scrollable),
    'SingleChildScrollView': (WidgetType.custom, WidgetCategory.scrollable),
    'CustomScrollView': (WidgetType.custom, WidgetCategory.scrollable),
    'SliverList': (WidgetType.custom, WidgetCategory.scrollable),
    'SliverGrid': (WidgetType.custom, WidgetCategory.scrollable),
    'SliverAppBar': (WidgetType.custom, WidgetCategory.scrollable),

    // Async widgets
    'FutureBuilder': (WidgetType.custom, WidgetCategory.async),
    'StreamBuilder': (WidgetType.custom, WidgetCategory.async),

    // Animation widgets
    'AnimatedContainer': (WidgetType.custom, WidgetCategory.animation),
    'AnimatedOpacity': (WidgetType.custom, WidgetCategory.animation),
    'AnimatedPositioned': (WidgetType.custom, WidgetCategory.animation),
    'AnimatedSize': (WidgetType.custom, WidgetCategory.animation),
    'Hero': (WidgetType.custom, WidgetCategory.animation),
    'FadeTransition': (WidgetType.custom, WidgetCategory.animation),
    'SlideTransition': (WidgetType.custom, WidgetCategory.animation),
    'ScaleTransition': (WidgetType.custom, WidgetCategory.animation),
    'RotationTransition': (WidgetType.custom, WidgetCategory.animation),
    'AnimatedBuilder': (WidgetType.custom, WidgetCategory.animation),

    // Gesture widgets
    'GestureDetector': (WidgetType.custom, WidgetCategory.gesture),
    'InkWell': (WidgetType.custom, WidgetCategory.gesture),
    'Dismissible': (WidgetType.custom, WidgetCategory.gesture),
    'Draggable': (WidgetType.custom, WidgetCategory.gesture),
    'DragTarget': (WidgetType.custom, WidgetCategory.gesture),

    // Special widgets
    'Inherited': (WidgetType.inherited, WidgetCategory.other),
  };

  /// Classify a class as a widget based on ClassDecl
  static WidgetDecl? classifyWidget(
    ClassDecl classDecl, {
    String? stateClassName,
    BuildMethodDecl? buildMethod,
  }) {
    // Determine widget type from superclass
    final superclassName = classDecl.superclass?.displayName ?? '';

    late WidgetType widgetType;
    late bool isStateless;
    late bool isStateful;
    late bool isInherited;

    if (superclassName == 'StatelessWidget') {
      widgetType = WidgetType.stateless;
      isStateless = true;
      isStateful = false;
      isInherited = false;
    } else if (superclassName == 'StatefulWidget') {
      widgetType = WidgetType.stateful;
      isStateless = false;
      isStateful = true;
      isInherited = false;
    } else if (superclassName == 'InheritedWidget' ||
        superclassName.toString().startsWith('InheritedWidget<')) {
      widgetType = WidgetType.inherited;
      isStateless = false;
      isStateful = false;
      isInherited = true;
    } else if (superclassName.toString().startsWith('State<')) {
      widgetType = WidgetType.stateClass;
      isStateless = false;
      isStateful = false;
      isInherited = false;
    } else {
      // Not a recognized widget type
      return null;
    }

    // Determine category
    final category = _categorizeWidget(classDecl.name);

    // Determine child handling
    final childHandling = _determineChildHandling(classDecl.name);

    // Determine performance profile from build method or class analysis
    final performanceProfile = _determinePerformanceProfile(
      classDecl,
      buildMethod,
    );

    // Extract build method from class if not provided
    final buildMethodFromClass = buildMethod ?? _extractBuildMethod(classDecl);

    // Detect const constructibility
    final isConstConstructible = _isConstConstructible(classDecl);

    // Analyze common properties
    final commonProperties = _getCommonProperties(classDecl.name);

    // Detect known issues
    final knownIssues = _detectKnownIssues(classDecl);

    return WidgetDecl(
      id: classDecl.id,
      name: classDecl.name,
      sourceLocation: classDecl.sourceLocation,
      widgetType: widgetType,
      category: category,
      isStateless: isStateless,
      isStateful: isStateful,
      isInherited: isInherited,
      buildReturnType:
          buildMethodFromClass?.returnType.displayName() ?? 'Widget',
      buildMethod: buildMethod,
      stateClassName: stateClassName,
      performanceProfile: performanceProfile,
      isConstConstructible: isConstConstructible,
      childHandling: childHandling,
      rebuildsFrequently: _predictRebuildsFrequently(classDecl.name),
      commonProperties: commonProperties,
      knownIssues: knownIssues,
      superclass: classDecl.superclass,
      interfaces: classDecl.interfaces,
      mixins: classDecl.mixins,
      typeParameters: classDecl.typeParameters,
      fields: classDecl.fields,
      methods: classDecl.methods,
      constructors: classDecl.constructors,
      isAbstract: classDecl.isAbstract,
      isFinal: classDecl.isFinal,
      isSealed: classDecl.isSealed,
      isMixin: classDecl.isMixin,
      documentation: classDecl.documentation,
      annotations: classDecl.annotations,
    );
  }

  /// Extract BuildMethodDecl from ClassDecl's build method
  /// Now constructs full BuildMethodDecl extending MethodDecl
  static BuildMethodDecl? _extractBuildMethod(ClassDecl classDecl) {
    try {
      final buildMethodBase = classDecl.methods.firstWhere(
        (m) => m.name == 'build',
      );

      // Construct BuildMethodDecl with all inherited MethodDecl properties
      return BuildMethodDecl(
        // Inherited MethodDecl properties
        id: buildMethodBase.id,
        name: buildMethodBase.name,
        returnType: buildMethodBase.returnType,
        sourceLocation: buildMethodBase.sourceLocation,
        parameters: buildMethodBase.parameters,
        body: buildMethodBase.body,
        isAsync: buildMethodBase.isAsync,
        documentation: buildMethodBase.documentation,
        annotations: buildMethodBase.annotations,
        className: buildMethodBase.className,
        markedOverride: buildMethodBase.markedOverride,

        // BuildMethodDecl-specific properties (State version)
        maxTreeDepth: 0, // Will be computed by analyzer
        estimatedNodeCount: 0,
        hasConditionals: false,
        hasLoops: false,
        createsWidgetsInLoops: false,
        instantiatedWidgets: const [],
        ancestorReads: const [],
        providerReads: const [],
        asyncBuilders: const [],
        accessedStateFields: const [],
      );
    } catch (e) {
      return null;
    }
  }

  /// Determine performance profile based on build method analysis
  static PerformanceProfile _determinePerformanceProfile(
    ClassDecl classDecl,
    BuildMethodDecl? buildMethod,
  ) {
    // If build method provided, use its performance rating
    if (buildMethod != null) {
      if (buildMethod.estimatedNodeCount > 100) {
        return PerformanceProfile.veryExpensive;
      }
      if (buildMethod.estimatedNodeCount > 50) {
        return PerformanceProfile.expensive;
      }
      if (buildMethod.statementCount > 30) {
        return PerformanceProfile.moderate;
      }
      if (buildMethod.createsWidgetsInLoops || buildMethod.hasLoops) {
        return PerformanceProfile.expensive;
      }
      return PerformanceProfile.lightweight;
    }

    // Heuristic: analyze class complexity
    final methodCount = classDecl.methods.length;
    final fieldCount = classDecl.fields.length;

    // Check widget name patterns
    if (classDecl.name.contains('Future') ||
        classDecl.name.contains('Stream')) {
      return PerformanceProfile.expensive;
    }
    if (classDecl.name == 'ListView' ||
        classDecl.name == 'GridView' ||
        classDecl.name == 'CustomScrollView') {
      return PerformanceProfile.moderate;
    }

    // Check structural complexity
    if (methodCount > 10 || fieldCount > 5) {
      return PerformanceProfile.moderate;
    }

    return PerformanceProfile.lightweight;
  }

  /// Detect if widget is const-constructible
  static bool _isConstConstructible(ClassDecl classDecl) {
    // Check if any constructor is const
    final hasConstConstructor = classDecl.constructors.any((c) => c.isConst);

    // Check if all fields are final or const (requirement for const)
    final allFieldsFinalOrConst = classDecl.fields.every(
      (f) => f.isFinal || f.isConst,
    );

    return hasConstConstructor && allFieldsFinalOrConst;
  }

  /// Detect known issues or anti-patterns
  static List<String> _detectKnownIssues(ClassDecl classDecl) {
    final issues = <String>[];

    // Check for mutable state
    if (classDecl.fields.any((f) => f.isMutable)) {
      issues.add('Contains mutable fields - consider using final');
    }

    // Check for complex state
    final mutableCount = classDecl.fields.where((f) => f.isMutable).length;
    if (mutableCount > 3) {
      issues.add('Complex state: $mutableCount mutable fields');
    }

    // Check for missing build method in widget classes
    if ((classDecl.superclass?.displayName ?? '').toString().contains(
      'Widget',
    )) {
      if (!classDecl.methods.any((m) => m.name == 'build')) {
        issues.add('Missing build() method');
      }
    }

    // Check for private mutable state in StatelessWidget
    if (classDecl.superclass?.displayName == 'StatelessWidget') {
      if (classDecl.fields.any((f) => f.isMutable && !f.isStatic)) {
        issues.add('StatelessWidget should not have mutable instance fields');
      }
    }

    // Detect potential memory leaks (fields not disposed)
    if (classDecl.fields.any(
      (f) =>
          (f.type.displayName.toString().contains('Controller') ||
              f.type.displayName.toString().contains('Stream') ||
              f.type.displayName.toString().contains('Listener')) &&
          !classDecl.methods.any((m) => m.name == 'dispose'),
    )) {
      issues.add('Potential memory leak: resource not disposed');
    }

    return issues;
  }

  /// Categorize a widget by name
  static WidgetCategory _categorizeWidget(String widgetName) {
    if (_standardWidgets.containsKey(widgetName)) {
      return _standardWidgets[widgetName]!.$2;
    }

    if (widgetName.contains('List') ||
        widgetName.contains('Grid') ||
        widgetName.contains('Scroll')) {
      return WidgetCategory.scrollable;
    }
    if (widgetName.contains('Button') ||
        widgetName.contains('TextField') ||
        widgetName.contains('Input')) {
      return WidgetCategory.input;
    }
    if (widgetName.contains('Animated') || widgetName.contains('Transition')) {
      return WidgetCategory.animation;
    }
    if (widgetName.contains('Future') || widgetName.contains('Stream')) {
      return WidgetCategory.async;
    }
    if (widgetName.contains('Gesture') ||
        widgetName.contains('Detector') ||
        widgetName.contains('Draggable')) {
      return WidgetCategory.gesture;
    }

    return WidgetCategory.other;
  }

  /// Determine child handling capability
  static ChildHandling _determineChildHandling(String widgetName) {
    if (widgetName == 'Text' ||
        widgetName == 'Image' ||
        widgetName == 'Icon' ||
        widgetName == 'TextField' ||
        widgetName == 'CircleAvatar') {
      return ChildHandling.none;
    }

    if (widgetName == 'Row' ||
        widgetName == 'Column' ||
        widgetName == 'Stack' ||
        widgetName == 'Wrap' ||
        widgetName == 'ListView' ||
        widgetName == 'GridView') {
      return ChildHandling.multipleChildren;
    }

    return ChildHandling.singleChild;
  }

  /// Predict if widget rebuilds frequently
  static bool _predictRebuildsFrequently(String widgetName) {
    return widgetName.contains('Future') ||
        widgetName.contains('Stream') ||
        widgetName.contains('Animation');
  }

  /// Get common properties for a widget
  static List<WidgetProperty> _getCommonProperties(String widgetName) {
    final properties = <WidgetProperty>[
      WidgetProperty(
        name: 'key',
        type: 'Key',
        isRequired: false,
        affectsLayout: true,
        triggerRebuild: false,
      ),
    ];

    if (['Container', 'Padding', 'Center', 'SizedBox'].contains(widgetName)) {
      properties.addAll([
        WidgetProperty(
          name: 'child',
          type: 'Widget',
          isRequired: false,
          affectsLayout: true,
        ),
        WidgetProperty(
          name: 'width',
          type: 'double',
          isRequired: false,
          affectsLayout: true,
        ),
        WidgetProperty(
          name: 'height',
          type: 'double',
          isRequired: false,
          affectsLayout: true,
        ),
      ]);
    }

    return properties;
  }
}
