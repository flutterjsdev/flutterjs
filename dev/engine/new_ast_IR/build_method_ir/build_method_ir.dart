import 'package:meta/meta.dart';
import '../diagnostics/analysis_issue.dart';
import '../diagnostics/source_location.dart';
import '../function_decl.dart';
import '../ir/expression_ir.dart';
import '../ir/ir_node.dart';
import '../ir/statement/statement_ir.dart';
import '../ir/type_ir.dart';
import '../parameter_decl.dart';
import 'key_widget_ir.dart';


// =============================================================================
// BUILD METHOD ANALYSIS
// =============================================================================

/// Specialized MethodDecl for build() methods in Flutter widgets
///
/// Captures detailed information about widget composition, state dependencies,
/// performance characteristics, and rebuild triggers.
///
/// This is the most analysis-intensive part of the IR - the build method
/// defines what UI gets rendered, so understanding its behavior is critical
/// for optimization and correctness checking.
@immutable
class BuildMethodIR extends MethodDecl {
  /// The root widget that this build method returns
  ///
  /// Null if build method has no explicit return or returns null
  final WidgetNodeIR? rootWidget;

  /// The complete widget tree returned by this build method
  ///
  /// Includes hierarchical structure, property bindings, and metadata
  final WidgetTreeIR? widgetTree;

  /// All widgets instantiated anywhere in this build method
  ///
  /// Includes:
  /// - Widgets in main return expression
  /// - Widgets in conditional branches
  /// - Widgets in loops
  /// - Nested widgets
  ///
  /// Useful for finding all widget types created during a build
  final List<WidgetInstantiationIR> instantiatedWidgets;

  /// Widgets that only exist in conditional (if/else) branches
  ///
  /// These widgets are not always present in the final tree
  /// Useful for identifying dynamic tree structure
  final List<ConditionalWidgetIR> conditionalWidgets;

  /// Widgets that only exist in loops
  ///
  /// Track dynamic children generation patterns
  final List<LoopWidgetIR> loopWidgets;

  /// Count of widgets declared with `const` keyword
  ///
  /// Const widgets are not rebuilt when parent rebuilds
  /// Higher count = better performance (less GC pressure)
  final int constWidgetCount;

  /// Count of widgets created without `const` (non-const)
  ///
  /// These are recreated on every build
  /// High count = potential performance issue
  final int nonConstWidgetCount;

  /// All calls to Theme.of(), MediaQuery.of(), etc.
  ///
  /// These create implicit dependencies on inherited widgets
  /// When these change, this widget automatically rebuilds
  final List<AncestorAccessIR> ancestorReads;

  /// All Provider reads in this build method
  ///
  /// Tracks state management access patterns
  final List<ProviderReadIR> providerReads;

  /// All FutureBuilder widgets in this build
  final List<AsyncBuilderIR> futureBuilders;

  /// All StreamBuilder widgets in this build
  final List<AsyncBuilderIR> streamBuilders;

  /// Which state fields trigger a rebuild of this widget
  ///
  /// When any of these fields are modified via setState(),
  /// this build() method will be called
  final List<StateFieldDependencyIR> rebuildTriggers;

  /// Variables captured from outer scope
  ///
  /// Closures that reference variables from parent scopes
  /// Important for detecting unintended captures
  final List<String> capturedVariables;

  /// Control flow analysis for this build method
  final BuildControlFlowIR controlFlow;

  /// Performance analysis and metrics
  final BuildPerformanceIR performance;

  /// Styling and theming operations
  final List<StylingOperationIR> stylingOperations;

  /// Animation usage in this build
  final List<AnimationUsageIR> animationUsages;

  /// Gesture detection and event handling
  final List<GestureHandlerIR> gestureHandlers;

  /// Issues found specifically in this build method
  final List<BuildMethodIssueIR> issues;

  BuildMethodIR({
    required String id,
    required String name,
    required String? className,
    required SourceLocationIR sourceLocation,
    String? documentation,
    List<ParameterDecl> parameters = const [],
    StatementIR? body,
    this.rootWidget,
    this.widgetTree,
    this.instantiatedWidgets = const [],
    this.conditionalWidgets = const [],
    this.loopWidgets = const [],
    this.constWidgetCount = 0,
    this.nonConstWidgetCount = 0,
    this.ancestorReads = const [],
    this.providerReads = const [],
    this.futureBuilders = const [],
    this.streamBuilders = const [],
    this.rebuildTriggers = const [],
    this.capturedVariables = const [],
    required this.controlFlow,
    required this.performance,
    this.stylingOperations = const [],
    this.animationUsages = const [],
    this.gestureHandlers = const [],
    this.issues = const [],
  }) : super(
         id: id,
         name: name,
         returnType: TypeIR.widget(),
         className: className,
         parameters: parameters,
         body: body,
         sourceLocation: sourceLocation,
         documentation: documentation,
         isGetter: false,
       );

  /// Total number of widgets instantiated in this build
  int get totalWidgetCount => instantiatedWidgets.length;

  /// Percentage of widgets using const keyword
  double get constWidgetPercentage =>
      totalWidgetCount == 0 ? 0.0 : (constWidgetCount / totalWidgetCount) * 100;

  /// Whether this build method has any performance issues
  bool get hasPerformanceIssues => issues.any(
    (i) =>
        i.severity == IssueSeverity.warning ||
        i.severity == IssueSeverity.error,
  );

  /// Whether this build method depends on any ancestors (Theme, MediaQuery, etc.)
  bool get dependsOnAncestors => ancestorReads.isNotEmpty;

  /// Whether this build method reads from providers
  bool get dependsOnProviders => providerReads.isNotEmpty;

  /// Whether this build method has dynamic children (loops)
  bool get hasDynamicChildren => loopWidgets.isNotEmpty;

  /// Whether this build method has conditional widgets
  bool get hasConditionalWidgets => conditionalWidgets.isNotEmpty;

  /// Maximum nesting depth of the widget tree
  int get maxNestingDepth => widgetTree?.depth ?? 0;

  /// Whether this build creates any async widgets (FutureBuilder, StreamBuilder)
  bool get usesAsyncWidgets =>
      futureBuilders.isNotEmpty || streamBuilders.isNotEmpty;

  /// Whether this build uses animations
  bool get usesAnimations => animationUsages.isNotEmpty;

  /// Whether this build handles gestures
  bool get handlesGestures => gestureHandlers.isNotEmpty;

  /// Validates the build method structure and returns issues
  List<String> validateBuildStructure() {
    final issues = <String>[];

    // Empty build is suspicious
    if (instantiatedWidgets.isEmpty) {
      issues.add('Build method returns no widgets');
    }

    // Multiple root widgets suggest List wrapping
    if (instantiatedWidgets.length > 1 &&
        widgetTree?.root.children.isEmpty == true) {
      issues.add('Build method instantiates multiple widgets at root level');
    }

    // Very deep nesting can cause performance issues
    if (maxNestingDepth > 20) {
      issues.add(
        'Widget tree nesting depth (${maxNestingDepth}) exceeds recommended maximum (20)',
      );
    }

    // Many widgets in a single build can be slow
    if (totalWidgetCount > 100) {
      issues.add('Build method creates many widgets ($totalWidgetCount)');
    }

    // Very few const widgets suggest potential performance issue
    if (constWidgetPercentage < 20 && nonConstWidgetCount > 10) {
      issues.add(
        'Only ${constWidgetPercentage.toStringAsFixed(1)}% of widgets use const',
      );
    }

    return issues;
  }

  /// Suggests optimizations for this build method
  List<BuildOptimizationSuggestionIR> suggestOptimizations() {
    final suggestions = <BuildOptimizationSuggestionIR>[];

    // Suggest const keywords
    if (constWidgetPercentage < 50 && nonConstWidgetCount > 5) {
      suggestions.add(
        BuildOptimizationSuggestionIR(
          id: '${id}_opt_const',
          sourceLocation: sourceLocation,
          type: OptimizationType.addConstKeyword,
          description:
              'Add const keyword to ${nonConstWidgetCount} widgets to prevent unnecessary rebuilds',
          impact: OptimizationImpact.high,
          widgets: instantiatedWidgets
              .where((w) => !w.isConst)
              .map((w) => w.widgetType)
              .toList(),
        ),
      );
    }

    // Suggest extracting widgets
    if (totalWidgetCount > 50) {
      suggestions.add(
        BuildOptimizationSuggestionIR(
          id: '${id}_opt_extract',
          sourceLocation: sourceLocation,
          type: OptimizationType.extractWidgets,
          description: 'Extract some widgets into separate methods or classes',
          impact: OptimizationImpact.medium,
          reason: 'Build method is creating $totalWidgetCount widgets',
        ),
      );
    }

    // Suggest RepaintBoundary for expensive subtrees
    if (maxNestingDepth > 15) {
      suggestions.add(
        BuildOptimizationSuggestionIR(
          id: '${id}_opt_repaint',
          sourceLocation: sourceLocation,
          type: OptimizationType.addRepaintBoundary,
          description: 'Add RepaintBoundary around expensive widget subtrees',
          impact: OptimizationImpact.medium,
        ),
      );
    }

    // Suggest indexing for loops
    if (loopWidgets.isNotEmpty) {
      final loopsWithoutKeys = loopWidgets.where((w) => w.hasKey == false);
      if (loopsWithoutKeys.isNotEmpty) {
        suggestions.add(
          BuildOptimizationSuggestionIR(
            id: '${id}_opt_keys',
            sourceLocation: sourceLocation,
            type: OptimizationType.addKeys,
            description: 'Add keys to ${loopsWithoutKeys.length} list items',
            impact: OptimizationImpact.high,
            reason: 'Improves performance of list rebuilds',
          ),
        );
      }
    }

    // Suggest caching theme/mediaquery
    if (ancestorReads.length > 3) {
      suggestions.add(
        BuildOptimizationSuggestionIR(
          id: '${id}_opt_cache',
          sourceLocation: sourceLocation,
          type: OptimizationType.cacheInheritedValues,
          description:
              'Cache Theme/MediaQuery reads instead of accessing ${ancestorReads.length} times',
          impact: OptimizationImpact.low,
        ),
      );
    }

    return suggestions;
  }

  @override
  String toString() =>
      'BuildMethod($className.$name) [${totalWidgetCount} widgets, depth: $maxNestingDepth]';
}

/// Represents a single widget instantiation in the build method
@immutable
class WidgetInstantiationIR extends IRNode {
  /// Type/class of the widget (e.g., "Container", "Text", "CustomWidget")
  final String widgetType;

  /// Constructor name if named constructor (e.g., "fromJson" in Icon.fromJson)
  final String? constructorName;

  /// Arguments passed to widget constructor
  final List<ExpressionIR> arguments;

  /// Named arguments passed to widget constructor
  final Map<String, ExpressionIR> namedArguments;

  /// Whether created with `const` keyword
  final bool isConst;

  /// Whether this widget is wrapped in a conditional
  final bool isConditional;

  /// Whether this widget is inside a loop
  final bool isInLoop;

  /// Depth in the widget tree (root = 0)
  final int treeDepth;

  /// Whether this widget has a key
  final bool hasKey;

  /// If it has a key, what kind
  final KeyTypeIR? keyType;

  WidgetInstantiationIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.widgetType,
    this.constructorName,
    this.arguments = const [],
    this.namedArguments = const {},
    this.isConst = false,
    this.isConditional = false,
    this.isInLoop = false,
    this.treeDepth = 0,
    this.hasKey = false,
    this.keyType,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      '${isConst ? 'const ' : ''}$widgetType${constructorName != null ? '.${constructorName!}' : ''}()';
}

/// Represents a widget that appears in conditional branches
@immutable
class ConditionalWidgetIR extends IRNode {
  /// The condition under which this widget appears
  final ExpressionIR condition;

  /// Widget in then branch
  final WidgetInstantiationIR? thenWidget;

  /// Widget in else branch (if any)
  final WidgetInstantiationIR? elseWidget;

  /// Whether this is a ternary expression, if statement, or other pattern
  final ConditionalPatternType patternType;

  ConditionalWidgetIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.condition,
    this.thenWidget,
    this.elseWidget,
    required this.patternType,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      '${thenWidget?.widgetType ?? 'null'} if ... else ${elseWidget?.widgetType ?? 'null'}';
}

/// Represents widgets created in loop constructs
@immutable
class LoopWidgetIR extends IRNode {
  /// Type of loop (for, forEach, map, expand, etc.)
  final LoopTypeIR loopType;

  /// What's being iterated over
  final ExpressionIR iterable;

  /// Loop variable name
  final String loopVariableName;

  /// Widget created in each iteration
  final WidgetInstantiationIR widget;

  /// Whether loop items have keys
  final bool hasKey;

  /// Expected number of items (if determinable)
  final int? expectedItemCount;

  LoopWidgetIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.loopType,
    required this.iterable,
    required this.loopVariableName,
    required this.widget,
    this.hasKey = false,
    this.expectedItemCount,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      '${loopType.name}($loopVariableName) => ${widget.widgetType}${hasKey ? ' [keyed]' : ''}';
}

/// Represents a call to Theme.of(), MediaQuery.of(), etc.
@immutable
class AncestorAccessIR extends IRNode {
  /// Type of inherited widget being accessed
  final AncestorAccessTypeIR accessType;

  /// The property being read (e.g., "textTheme", "size")
  final String? property;

  /// What's done with the accessed value
  final String usage;

  AncestorAccessIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.accessType,
    this.property,
    required this.usage,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      '${accessType.name}${property != null ? ".$property" : ""}';
}

/// Represents a Provider read (context.read, context.watch, etc.)
@immutable
class ProviderReadIR extends IRNode {
  /// Type of provider access
  final ProviderAccessTypeIR accessType;

  /// Provider class/type being read
  final String providerType;

  /// Generic type argument (if parameterized)
  final TypeIR? genericType;

  /// For watch: whether it rebuilds this widget on change
  final bool triggersRebuild;

  ProviderReadIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.accessType,
    required this.providerType,
    this.genericType,
    this.triggersRebuild = false,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      'context.${accessType.name}<$providerType>${triggersRebuild ? ' [watch]' : ''}';
}

/// Control flow analysis for a build method
@immutable
class BuildControlFlowIR extends IRNode {
  /// All if statements in this build
  final List<ConditionalWidgetIR> ifStatements;

  /// All for/forEach loops
  final List<LoopWidgetIR> loops;

  /// Whether build has unreachable code
  final bool hasUnreachableCode;

  /// Maximum nesting depth of control structures
  final int maxControlFlowDepth;

  /// All try-catch blocks (for error handling)
  final int tryCatchCount;

  /// Complexity score (0-10, higher = more complex)
  final int complexityScore;

  BuildControlFlowIR({
    required String id,
    required SourceLocationIR sourceLocation,
    this.ifStatements = const [],
    this.loops = const [],
    this.hasUnreachableCode = false,
    this.maxControlFlowDepth = 0,
    this.tryCatchCount = 0,
    this.complexityScore = 0,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      'ControlFlow [if: ${ifStatements.length}, loops: ${loops.length}, complexity: $complexityScore/10]';
}

/// Performance metrics for a build method
@immutable
class BuildPerformanceIR extends IRNode {
  /// Estimated time to build in milliseconds (heuristic)
  final double estimatedBuildTimeMs;

  /// Number of widgets that will be rebuilt on state change
  final int widgetsRebuildOnStateChange;

  /// Number of const widgets (not rebuilt)
  final int constWidgetCount;

  /// Number of memoized/cached widgets
  final int memoizedWidgetCount;

  /// Whether this build is expensive (many widgets, deep nesting)
  final bool isExpensive;

  /// Suggested frame rate cap for smooth animation
  final int suggestedFrameRateCap;

  /// Potential jank indicator (0-10, 10 = very janky)
  final int jankRisk;

  BuildPerformanceIR({
    required String id,
    required SourceLocationIR sourceLocation,
    this.estimatedBuildTimeMs = 0,
    this.widgetsRebuildOnStateChange = 0,
    this.constWidgetCount = 0,
    this.memoizedWidgetCount = 0,
    this.isExpensive = false,
    this.suggestedFrameRateCap = 60,
    this.jankRisk = 0,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      'Performance [~${estimatedBuildTimeMs.toStringAsFixed(1)}ms, jank: $jankRisk/10]';
}

/// Styling operations in this build method
@immutable
class StylingOperationIR extends IRNode {
  /// Type of styling (padding, color, alignment, etc.)
  final String styleType;

  /// Widget this styling is applied to
  final String targetWidgetType;

  /// Whether this is hardcoded vs computed
  final bool isHardcoded;

  StylingOperationIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.styleType,
    required this.targetWidgetType,
    this.isHardcoded = true,
  }) : super(id: id, sourceLocation: sourceLocation);
}

/// Animation usage in this build method
@immutable
class AnimationUsageIR extends IRNode {
  /// Type of animation (implicit, explicit, tween)
  final AnimationTypeIR animationType;

  /// Widget being animated
  final String targetWidgetType;

  /// Property being animated (opacity, position, size, etc.)
  final String property;

  AnimationUsageIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.animationType,
    required this.targetWidgetType,
    required this.property,
  }) : super(id: id, sourceLocation: sourceLocation);
}

/// Gesture handling in this build method
@immutable
class GestureHandlerIR extends IRNode {
  /// Type of gesture (tap, drag, long press, etc.)
  final GestureTypeIR gestureType;

  /// Widget handling the gesture
  final String targetWidgetType;

  /// Whether handler triggers state change
  final bool triggersStateChange;

  /// Whether handler triggers navigation
  final bool triggersNavigation;

  GestureHandlerIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.gestureType,
    required this.targetWidgetType,
    this.triggersStateChange = false,
    this.triggersNavigation = false,
  }) : super(id: id, sourceLocation: sourceLocation);
}

/// State field dependency information
@immutable
class StateFieldDependencyIR extends IRNode {
  /// Name of the state field
  final String fieldName;

  /// How the field is used in build (read, write, both)
  final StateFieldUsageTypeIR usageType;

  /// Whether changes to this field always cause rebuild
  final bool alwaysTriggers;

  /// Locations where this field is accessed in build
  final List<SourceLocationIR> accessLocations;

  StateFieldDependencyIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.fieldName,
    required this.usageType,
    this.alwaysTriggers = true,
    this.accessLocations = const [],
  }) : super(id: id, sourceLocation: sourceLocation);
}

/// Issue found in build method analysis
@immutable
class BuildMethodIssueIR extends IRNode {
  /// Severity level of the issue
  final IssueSeverity severity;

  /// Type of issue (missing const, inefficient structure, etc.)
  final BuildIssueTypeIR issueType;

  /// Human-readable description
  final String message;

  /// Suggested fix
  final String? suggestion;

  /// Related widgets/code
  final List<String> relatedItems;

  BuildMethodIssueIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.severity,
    required this.issueType,
    required this.message,
    this.suggestion,
    this.relatedItems = const [],
  }) : super(id: id, sourceLocation: sourceLocation);
}

/// Optimization suggestion for build method
@immutable
class BuildOptimizationSuggestionIR extends IRNode {
  /// Type of optimization
  final OptimizationType type;

  /// Description of what to do
  final String description;

  /// Expected impact on performance
  final OptimizationImpact impact;

  /// Reason for this suggestion
  final String? reason;

  /// Specific widgets affected
  final List<String> widgets;

  BuildOptimizationSuggestionIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.type,
    required this.description,
    required this.impact,
    this.reason,
    this.widgets = const [],
  }) : super(id: id, sourceLocation: sourceLocation);
}

// =============================================================================
// ENUMS
// =============================================================================

enum ConditionalPatternType {
  ternary, // condition ? then : else
  ifStatement, // if (condition) then else
  switchCase, // switch/case
  nullCoalesce, // value ?? default
}

enum LoopTypeIR {
  forLoop, // for (var i = 0; ...)
  forEach, // for (var item in items)
  mapMethod, // items.map()
  expandMethod, // items.expand()
  listMap, // [...list.map()]
  custom, // other iteration
}

enum AncestorAccessTypeIR {
  theme, // Theme.of(context)
  mediaQuery, // MediaQuery.of(context)
  scaffold, // Scaffold.of(context)
  focusScope, // FocusScope.of(context)
  navigator, // Navigator.of(context)
  inheritedWidget, // Custom inherited
}

enum ProviderAccessTypeIR {
  read, // context.read<T>()
  watch, // context.watch<T>()
  select, // context.select<T, R>()
}

enum AnimationTypeIR {
  implicit, // AnimatedContainer, etc.
  explicit, // AnimationController + Listener
  tween, // TweenAnimationBuilder
  implicit_animated, // Implicit animations
}

enum GestureTypeIR {
  tap, // GestureDetector.onTap
  doubleTap, // GestureDetector.onDoubleTap
  longPress, // GestureDetector.onLongPress
  drag, // GestureDetector.onPanUpdate
  scroll, // ScrollView
  hover, // MouseRegion.onHover
  focus, // Focus.onFocusChange
}

enum StateFieldUsageTypeIR {
  read, // Field is read
  write, // Field is written
  both, // Field is read and written
  modified, // Field is modified (+=, --, etc.)
}

enum OptimizationType {
  addConstKeyword, // Add const to widgets
  extractWidgets, // Extract into separate methods
  addRepaintBoundary, // Add RepaintBoundary
  addKeys, // Add keys to list items
  cacheInheritedValues, // Cache Theme/MediaQuery
  memoizeExpensiveWidgets, // Use memoization
  useBuilderPattern, // Use Builder for scoping
  splitBuildMethods, // Split into multiple methods
}

enum OptimizationImpact {
  low, // Minor improvement
  medium, // Notable improvement
  high, // Significant improvement
}

enum BuildIssueTypeIR {
  missingConstKeyword, // Widget should use const
  missingKeys, // List items need keys
  deepNesting, // Too much nesting
  tooManyWidgets, // Too many widgets created
  unnecessaryRebuilds, // Widgets rebuild unnecessarily
  capturedVariableIssue, // Closure captures problematic variable
  inefficientPattern, // Inefficient widget structure
  performanceWarning, // Potential performance issue
}
