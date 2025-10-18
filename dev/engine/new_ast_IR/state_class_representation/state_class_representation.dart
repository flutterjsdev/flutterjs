import 'package:meta/meta.dart';

import '../class_decl.dart';


// =============================================================================
// LIFECYCLE METHOD DECLARATIONS
// =============================================================================

/// Information about a State lifecycle method
@immutable
class LifecycleMethodDecl {
  /// Type of lifecycle method
  final LifecycleMethodType type;

  /// Whether this method calls super (required for initState/dispose)
  final bool callsSuper;

  /// List of statements in this method
  final List<String> statements;

  /// Controllers initialized in this method (typically initState)
  final List<String> initializedControllers;

  /// Controllers disposed in this method (typically dispose)
  final List<String> disposedControllers;

  /// State fields modified in this method
  final List<String> modifiedStateFields;

  /// State fields accessed (read) in this method
  final List<String> accessedStateFields;

  /// Async operations (Future/Stream) started in this method
  final List<String> asyncOperations;

  /// Whether this method is async
  final bool isAsync;

  /// Line number where this method starts
  final int lineNumber;

  /// Line number where this method ends
  final int endLineNumber;

  /// Documentation comment for this method
  final String? documentation;

  const LifecycleMethodDecl({
    required this.type,
    this.callsSuper = false,
    this.statements = const [],
    this.initializedControllers = const [],
    this.disposedControllers = const [],
    this.modifiedStateFields = const [],
    this.accessedStateFields = const [],
    this.asyncOperations = const [],
    this.isAsync = false,
    this.lineNumber = 0,
    this.endLineNumber = 0,
    this.documentation,
  });

  @override
  String toString() => '${type.name}() [${statements.length} statements]';
}

/// Enum for lifecycle method types
enum LifecycleMethodType {
  /// initState - called when State is created
  initState,

  /// didUpdateWidget - called when widget changes
  didUpdateWidget,

  /// didChangeDependencies - called when inherited widget changes
  didChangeDependencies,

  /// reassemble - called during hot reload in debug
  reassemble,

  /// deactivate - called when widget is removed
  deactivate,

  /// activate - called when widget is reinserted
  activate,

  /// dispose - called when State is destroyed
  dispose,
}

// =============================================================================
// STATE FIELD DECLARATIONS
// =============================================================================

/// Represents a mutable field in a State class
@immutable
class StateFieldDecl {
  /// Name of the field
  final String name;

  /// Type of the field
  final String type;

  /// Whether this field is initialized at declaration
  final bool hasInitializer;

  /// Initial value if present
  final String? initialValue;

  /// Whether this field is marked as late
  final bool isLate;

  /// Fields that affect this field's value
  final List<String> affectedBy;

  /// Fields affected by changes to this field
  final List<String> affects;

  /// Lines in build() that read this field
  final List<int> buildAccessLines;

  /// Lines in setState() calls that modify this field
  final List<int> setStateModificationLines;

  /// Whether this field is accessed in build()
  bool get isAccessedInBuild => buildAccessLines.isNotEmpty;

  /// Whether this field is modified via setState()
  bool get isModifiedInSetState => setStateModificationLines.isNotEmpty;

  /// Count of times this field is accessed in build()
  int get buildAccessCount => buildAccessLines.length;

  /// Whether field should trigger rebuild when modified
  final bool triggersRebuild;

  /// Documentation for this field
  final String? documentation;

  /// Whether this appears to be a controller (animation, text, scroll, etc.)
  final bool isController;

  /// Whether this controller is disposed in dispose()
  final bool isDisposedProperly;

  const StateFieldDecl({
    required this.name,
    required this.type,
    this.hasInitializer = false,
    this.initialValue,
    this.isLate = false,
    this.affectedBy = const [],
    this.affects = const [],
    this.buildAccessLines = const [],
    this.setStateModificationLines = const [],
    this.triggersRebuild = true,
    this.documentation,
    this.isController = false,
    this.isDisposedProperly = false,
  });

  /// Heuristic: is this field likely a controller?
  static bool _isLikelyController(String type) {
    return type.contains('Controller') ||
        type == 'AnimationController' ||
        type == 'TextEditingController' ||
        type == 'ScrollController' ||
        type == 'PageController' ||
        type == 'TabController' ||
        type == 'VideoPlayerController' ||
        type == 'StreamSubscription';
  }

  @override
  String toString() =>
      '$name: $type${isAccessedInBuild ? ' (accessed in build)' : ''}';
}

// =============================================================================
// SETSTATE CALLS
// =============================================================================

/// Information about a setState() call
@immutable
class SetStateCallDecl {
  /// Unique identifier for this setState call
  final String id;

  /// Line number where setState is called
  final int lineNumber;

  /// Name of method containing this setState call
  final String inMethod;

  /// State fields modified in this setState callback
  final List<String> modifiedFields;

  /// Whether the callback is async
  final bool isAsync;

  /// Whether the callback contains control flow (if/loops)
  final bool hasControlFlow;

  /// Number of statements in the callback
  final int statementCount;

  /// Whether this setState affects the widget tree visibly
  final bool affectsUI;

  /// UI elements affected by this setState
  final List<String> affectedWidgets;

  /// Whether this setState is in a loop (potential issue)
  final bool isInLoop;

  /// Whether this setState appears to be in a hot path
  final bool isInHotPath;

  const SetStateCallDecl({
    required this.id,
    required this.lineNumber,
    required this.inMethod,
    this.modifiedFields = const [],
    this.isAsync = false,
    this.hasControlFlow = false,
    this.statementCount = 0,
    this.affectsUI = true,
    this.affectedWidgets = const [],
    this.isInLoop = false,
    this.isInHotPath = false,
  });

  /// Severity of this setState call (heuristic)
  SetStateCallSeverity get severity {
    if (isInLoop && isInHotPath) return SetStateCallSeverity.critical;
    if (isInLoop || isInHotPath) return SetStateCallSeverity.warning;
    if (modifiedFields.isEmpty) return SetStateCallSeverity.info;
    return SetStateCallSeverity.normal;
  }

  @override
  String toString() =>
      'setState() in $inMethod:$lineNumber [${modifiedFields.length} fields modified]';
}

enum SetStateCallSeverity {
  /// Normal setState usage
  normal,

  /// Something to watch (setState in hot path, etc.)
  warning,

  /// Likely performance issue (setState in loop)
  critical,

  /// Informational (setState doesn't modify anything)
  info,
}

// =============================================================================
// STATE CLASS DECLARATION
// =============================================================================

/// Complete representation of a State<T> class
@immutable
class StateDecl extends ClassDecl {
  /// Name of the StatefulWidget this State is associated with
  final String linkedWidgetName;

  /// Reference ID to the linked StatefulWidget
  final String linkedWidgetId;

  /// Generic type parameter if any (e.g., State<MyWidget>)
  final String? genericType;

  /// Mutable fields that trigger rebuilds
  final List<StateFieldDecl> stateFields;

  /// Regular (immutable or non-reactive) fields
  final List<String> regularFields;

  /// initState lifecycle method
  final LifecycleMethodDecl? initState;

  /// didUpdateWidget lifecycle method
  final LifecycleMethodDecl? didUpdateWidget;

  /// didChangeDependencies lifecycle method
  final LifecycleMethodDecl? didChangeDependencies;

  /// reassemble lifecycle method (debug/hot-reload)
  final LifecycleMethodDecl? reassemble;

  /// deactivate lifecycle method
  final LifecycleMethodDecl? deactivate;

  /// activate lifecycle method
  final LifecycleMethodDecl? activate;

  /// dispose lifecycle method
  final LifecycleMethodDecl? dispose;

  /// The build() method
  final BuildMethodDecl? buildMethod;

  /// All setState() calls in this State class
  final List<SetStateCallDecl> setStateCalls;

  /// Calls to context.read/watch (Provider usage)
  final List<String> providerReads;

  /// Calls to Theme.of, MediaQuery.of, etc.
  final List<String> contextDependencies;

  /// Controllers used in this State
  final List<String> controllers;

  /// Whether initState calls super (must be true)
  final bool initStateCallsSuper;

  /// Whether dispose calls super (must be true)
  final bool disposeCallsSuper;

  // /// Mixins applied to this State class
  // final List<String> mixins;

  /// Whether this State uses TickerProviderStateMixin
  final bool usesSingleTickerProvider;

  /// Whether this State uses multiple ticker providers
  final bool usesMultipleTickerProviders;

  /// Whether this State class appears to have memory leaks
  /// (e.g., subscriptions not cancelled, controllers not disposed)
  final bool appearToHaveMemoryLeaks;

  /// Detected issues in lifecycle management
  final List<LifecycleIssue> lifecycleIssues;

  StateDecl({
    required super.id,
    required super.sourceLocation,
    required super.name,
    required super.metadata,
    required this.linkedWidgetName,
    required this.linkedWidgetId,
    this.genericType,
    this.stateFields = const [],
    this.regularFields = const [],
    this.initState,
    this.didUpdateWidget,
    this.didChangeDependencies,
    this.reassemble,
    this.deactivate,
    this.activate,
    this.dispose,
    this.buildMethod,
    this.setStateCalls = const [],
    this.providerReads = const [],
    this.contextDependencies = const [],
    this.controllers = const [],
    this.initStateCallsSuper = false,
    this.disposeCallsSuper = false,
    super.mixins = const [],
    this.usesSingleTickerProvider = false,
    this.usesMultipleTickerProviders = false,
    this.appearToHaveMemoryLeaks = false,
    this.lifecycleIssues = const [],
  });

  /// Total count of state fields
  int get stateFieldCount => stateFields.length;

  /// Fields accessed in build()
  List<StateFieldDecl> get fieldsAccessedInBuild =>
      stateFields.where((f) => f.isAccessedInBuild).toList();

  /// Fields modified in setState()
  List<StateFieldDecl> get fieldsModifiedInSetState =>
      stateFields.where((f) => f.isModifiedInSetState).toList();

  /// Fields never accessed in build (unused state)
  List<StateFieldDecl> get unusedStateFields =>
      stateFields.where((f) => !f.isAccessedInBuild).toList();

  /// Controllers not properly disposed
  List<String> get controllersMissingDisposal {
    final disposed = dispose?.disposedControllers ?? [];
    return controllers.where((c) => !disposed.contains(c)).toList();
  }

  /// Whether this State has all required lifecycle methods
  bool get hasCompleteLifecycle =>
      initState != null &&
      dispose != null &&
      initStateCallsSuper &&
      disposeCallsSuper;

  /// Whether this State properly manages controllers
  bool get properlymanagedControllers => controllersMissingDisposal.isEmpty;

  /// Critical issues that need attention
  List<LifecycleIssue> get criticalIssues =>
      lifecycleIssues.where((i) => i.severity == IssueSeverity.error).toList();

  /// Warning issues
  List<LifecycleIssue> get warningIssues =>
      lifecycleIssues.where((i) => i.severity == IssueSeverity.warning).toList();

  /// Health score (0-100) based on lifecycle management
  int get healthScore {
    int score = 100;

    // Deduct for missing lifecycle methods
    if (initState == null) score -= 20;
    if (dispose == null) score -= 20;

    // Deduct for not calling super
    if (initState != null && !initStateCallsSuper) score -= 15;
    if (dispose != null && !disposeCallsSuper) score -= 15;

    // Deduct for missing controller disposal
    score -= (controllersMissingDisposal.length * 10);

    // Deduct for unused state fields
    score -= (unusedStateFields.length * 5);

    // Deduct for critical issues
    score -= (criticalIssues.length * 10);

    return score.clamp(0, 100);
  }

  @override
  String toString() =>
      'StateDecl($name) [${stateFields.length} state fields, health: $healthScore]';
}

// =============================================================================
// BUILD METHOD DECLARATION (State-specific)
// =============================================================================

/// Information about a build() method in a State class
@immutable
class BuildMethodDecl {
  /// Unique identifier
  final String id;

  /// Line number where build method starts
  final int lineNumber;

  /// Return type (should be Widget or similar)
  final String returnType;

  /// Whether the method is async (usually shouldn't be)
  final bool isAsync;

  /// Number of statements in build method
  final int statementCount;

  /// Maximum widget tree depth
  final int maxTreeDepth;

  /// Estimated number of widget nodes created
  final int estimatedNodeCount;

  /// Whether build has conditional logic (if/else)
  final bool hasConditionals;

  /// Whether build has loops (for/while)
  final bool hasLoops;

  /// Whether build creates widgets in loops (potential issue)
  final bool createsWidgetsInLoops;

  /// Widgets instantiated directly in this build
  final List<String> instantiatedWidgets;

  /// Calls to Theme.of, MediaQuery.of, etc.
  final List<String> ancestorReads;

  /// Provider reads (context.read/watch)
  final List<String> providerReads;

  /// FutureBuilder/StreamBuilder calls
  final List<String> asyncBuilders;

  /// State fields accessed in this build
  final List<String> accessedStateFields;

  /// Whether this build method is likely expensive
  bool get isExpensive =>
      statementCount > 50 ||
      maxTreeDepth > 8 ||
      estimatedNodeCount > 100 ||
      createsWidgetsInLoops;

  /// Whether this build method is problematic
  bool get hasProblems =>
      hasLoops && createsWidgetsInLoops ||
      isAsync ||
      instantiatedWidgets.length > 50;

  /// Performance complexity rating
  BuildMethodComplexity get complexity {
    if (estimatedNodeCount > 100) return BuildMethodComplexity.veryHigh;
    if (estimatedNodeCount > 50) return BuildMethodComplexity.high;
    if (statementCount > 30) return BuildMethodComplexity.medium;
    return BuildMethodComplexity.low;
  }

  const BuildMethodDecl({
    required this.id,
    required this.lineNumber,
    this.returnType = 'Widget',
    this.isAsync = false,
    this.statementCount = 0,
    this.maxTreeDepth = 0,
    this.estimatedNodeCount = 0,
    this.hasConditionals = false,
    this.hasLoops = false,
    this.createsWidgetsInLoops = false,
    this.instantiatedWidgets = const [],
    this.ancestorReads = const [],
    this.providerReads = const [],
    this.asyncBuilders = const [],
    this.accessedStateFields = const [],
  });

  @override
  String toString() =>
      'build() [${estimatedNodeCount} nodes, depth: $maxTreeDepth, complexity: ${complexity.name}]';
}

enum BuildMethodComplexity {
  low,
  medium,
  high,
  veryHigh,
}

// =============================================================================
// LIFECYCLE ISSUES
// =============================================================================

/// Detected issue in State lifecycle management
@immutable
class LifecycleIssue {
  /// Type of issue
  final LifecycleIssueType type;

  /// Severity of the issue
  final IssueSeverity severity;

  /// Human-readable description
  final String message;

  /// Line number where issue occurs
  final int lineNumber;

  /// Suggested fix
  final String? suggestion;

  /// Related fields/methods
  final List<String> relatedItems;

  const LifecycleIssue({
    required this.type,
    required this.severity,
    required this.message,
    required this.lineNumber,
    this.suggestion,
    this.relatedItems = const [],
  });

  @override
  String toString() => '${type.name} (${severity.name}): $message';
}

enum LifecycleIssueType {
  /// initState doesn't call super
  initStateNoSuper,

  /// dispose doesn't call super
  disposeNoSuper,

  /// Controller created but never disposed
  controllerNotDisposed,

  /// Stream subscription not cancelled
  subscriptionNotCancelled,

  /// setState called in build
  setStateInBuild,

  /// setState called with async callback
  setStateWithAsync,

  /// build is async (shouldn't be)
  buildIsAsync,

  /// Widgets created inside loops
  widgetsInLoops,

  /// State field never used in build
  unusedStateField,

  /// initState not implemented but needed
  missingInitState,

  /// dispose not implemented but needed
  missingDispose,

  /// Memory leak suspected
  suspectedMemoryLeak,

  /// Other issue
  other,
}

enum IssueSeverity {
  /// Must fix (crash or major bug likely)
  error,

  /// Should fix (potential issue)
  warning,

  /// Could improve (style/optimization)
  info,
}

// =============================================================================
// STATE CLASS ANALYZER
// =============================================================================

/// Analyzes State classes for issues
class StateAnalyzer {
  /// Detect common lifecycle issues
  static List<LifecycleIssue> analyzeLifecycle(StateDecl state) {
    final issues = <LifecycleIssue>[];

    // Check initState
    if (state.initState == null) {
      if (state.stateFields.isNotEmpty ||
          state.controllers.isNotEmpty ||
          state.providerReads.isNotEmpty) {
        issues.add(LifecycleIssue(
          type: LifecycleIssueType.missingInitState,
          severity: IssueSeverity.warning,
          message:
              'State has ${state.stateFields.length} state fields but no initState',
          lineNumber: 0,
          suggestion: 'Implement initState() to initialize controllers/listeners',
        ));
      }
    } else if (!state.initStateCallsSuper) {
      issues.add(LifecycleIssue(
        type: LifecycleIssueType.initStateNoSuper,
        severity: IssueSeverity.error,
        message: 'initState() does not call super.initState()',
        lineNumber: state.initState!.lineNumber,
        suggestion: 'Add super.initState() as first statement in initState()',
      ));
    }

    // Check dispose
    if (state.dispose == null) {
      if (state.controllers.isNotEmpty || state.providerReads.isNotEmpty) {
        issues.add(LifecycleIssue(
          type: LifecycleIssueType.missingDispose,
          severity: IssueSeverity.warning,
          message:
              'State uses ${state.controllers.length} controllers but has no dispose()',
          lineNumber: 0,
          suggestion: 'Implement dispose() to clean up resources',
        ));
      }
    } else if (!state.disposeCallsSuper) {
      issues.add(LifecycleIssue(
        type: LifecycleIssueType.disposeNoSuper,
        severity: IssueSeverity.error,
        message: 'dispose() does not call super.dispose()',
        lineNumber: state.dispose!.lineNumber,
        suggestion: 'Add super.dispose() as last statement in dispose()',
      ));
    }

    // Check for undisposed controllers
    for (final controller in state.controllersMissingDisposal) {
      issues.add(LifecycleIssue(
        type: LifecycleIssueType.controllerNotDisposed,
        severity: IssueSeverity.warning,
        message: 'Controller "$controller" created but never disposed',
        lineNumber: 0,
        suggestion: 'Add $controller.dispose() in dispose() method',
        relatedItems: [controller],
      ));
    }

    // Check for unused state fields
    for (final field in state.unusedStateFields) {
      issues.add(LifecycleIssue(
        type: LifecycleIssueType.unusedStateField,
        severity: IssueSeverity.info,
        message: 'State field "${field.name}" is never accessed in build()',
        lineNumber: 0,
        suggestion: 'Consider removing unused field or using it in build()',
        relatedItems: [field.name],
      ));
    }

    // Check build method
    if (state.buildMethod != null) {
      if (state.buildMethod!.isAsync) {
        issues.add(LifecycleIssue(
          type: LifecycleIssueType.buildIsAsync,
          severity: IssueSeverity.error,
          message: 'build() is async - this is not allowed',
          lineNumber: state.buildMethod!.lineNumber,
          suggestion: 'Move async logic to initState or use FutureBuilder',
        ));
      }

      if (state.buildMethod!.createsWidgetsInLoops) {
        issues.add(LifecycleIssue(
          type: LifecycleIssueType.widgetsInLoops,
          severity: IssueSeverity.warning,
          message: 'Widgets are created inside loops in build()',
          lineNumber: state.buildMethod!.lineNumber,
          suggestion:
              'Consider using ListView.builder or similar for dynamic lists',
        ));
      }
    }

    return issues;
  }
}