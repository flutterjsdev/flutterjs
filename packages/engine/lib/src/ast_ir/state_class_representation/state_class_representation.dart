import 'package:meta/meta.dart';

import '../class_decl.dart';
import '../diagnostics/analysis_issue.dart';
import '../diagnostics/source_location.dart';
import '../function_decl.dart';
import '../variable_decl.dart';
import '../ir/type_ir.dart';
import '../ir/statement/statement_ir.dart';

// =============================================================================
// LIFECYCLE METHOD DECLARATIONS
// =============================================================================

/// Information about a State lifecycle method
@immutable
class LifecycleMethodDecl extends MethodDecl {
  /// Type of lifecycle method
  final LifecycleMethodType lifecycleType;

  /// Controllers initialized in this method (typically initState)
  final List<FieldDecl> initializedControllers;

  /// Controllers disposed in this method (typically dispose)
  final List<FieldDecl> disposedControllers;

  /// State fields modified in this method
  final List<FieldDecl> modifiedStateFields;

  /// State fields accessed (read) in this method
  final List<FieldDecl> accessedStateFields;

  /// Async operations (Future/Stream) started in this method
  final List<String> asyncOperations;

  LifecycleMethodDecl({
    required super.id,
    required super.name,
    required super.returnType,
    required super.sourceLocation,
    required this.lifecycleType,
    super.parameters = const [],
    super.body,
    super.isAsync = false,
    super.documentation,
    super.annotations = const [],
    super.className,
    super.markedOverride = false,
    this.initializedControllers = const [],
    this.disposedControllers = const [],
    this.modifiedStateFields = const [],
    this.accessedStateFields = const [],
    this.asyncOperations = const [],
  });

  /// Whether this method calls super (required for initState/dispose/didUpdateWidget)
  bool get callsSuper {
    if (body == null) return false;
    // Check if body contains super call - would need statement analysis
    // For now, return false and let validation pass detect this
    return false; // TODO: Implement super call detection
  }

  /// Number of statements in this method
  int get statementCount {
    if (body == null) return 0;
    if (body is BlockStmt) {
      return (body as BlockStmt).statements.length;
    }
    return 1;
  }

  @override
  String toString() => '${lifecycleType.name}() [${statementCount} statements]';
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

/// Represents a mutable field in a State class with reactive behavior tracking
@immutable
class StateFieldDecl extends FieldDecl {
  /// Fields that affect this field's value (dependencies)
  final List<FieldDecl> affectedBy;

  /// Fields affected by changes to this field
  final List<FieldDecl> affects;

  /// Lines in build() that read this field
  final List<int> buildAccessLines;

  /// Lines in setState() calls that modify this field
  final List<int> setStateModificationLines;

  /// Whether this field should trigger rebuild when modified
  final bool triggersRebuild;

  /// Whether this appears to be a controller (animation, text, scroll, etc.)
  final bool isController;

  /// Whether this controller is disposed in dispose()
  final bool isDisposedProperly;

  StateFieldDecl({
    required super.id,
    required super.name,
    required super.type,
    required super.sourceLocation,
    super.initializer,
    super.isFinal = false,
    super.isConst = false,
    super.isLate = false,
    super.isStatic = false,
    super.documentation,
    super.annotations = const [],
    super.visibility = VisibilityModifier.public,
    super.isPrivate = false,
    this.affectedBy = const [],
    this.affects = const [],
    this.buildAccessLines = const [],
    this.setStateModificationLines = const [],
    this.triggersRebuild = true,
    this.isController = false,
    this.isDisposedProperly = false,
  });

  /// Whether this field is accessed in build()
  bool get isAccessedInBuild => buildAccessLines.isNotEmpty;

  /// Whether this field is modified via setState()
  bool get isModifiedInSetState => setStateModificationLines.isNotEmpty;

  /// Count of times this field is accessed in build()
  int get buildAccessCount => buildAccessLines.length;

  @override
  String toString() =>
      '$name: ${type.displayName()}${isAccessedInBuild ? ' (accessed in build)' : ''}';
}

// =============================================================================
// SETSTATE CALLS
// =============================================================================

/// Information about a setState() call
@immutable
class SetStateCallDecl {
  /// Unique identifier for this setState call
  final String id;

  /// Source location of this call
  final SourceLocationIR sourceLocation;

  /// Name of method containing this setState call
  final String inMethod;

  /// State fields modified in this setState callback
  final List<StateFieldDecl> modifiedFields;

  /// The callback body (if available)
  final StatementIR? callbackBody;

  /// Whether the callback is async
  final bool isAsync;

  /// Whether the callback contains control flow (if/loops)
  final bool hasControlFlow;

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
    required this.sourceLocation,
    required this.inMethod,
    this.modifiedFields = const [],
    this.callbackBody,
    this.isAsync = false,
    this.hasControlFlow = false,
    this.affectsUI = true,
    this.affectedWidgets = const [],
    this.isInLoop = false,
    this.isInHotPath = false,
  });

  /// Line number where setState is called
  int get lineNumber => sourceLocation.line;

  /// Number of statements in the callback
  int get statementCount {
    if (callbackBody == null) return 0;
    if (callbackBody is BlockStmt) {
      return (callbackBody as BlockStmt).statements.length;
    }
    return 1;
  }

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
// BUILD METHOD DECLARATION (State-specific)
// =============================================================================

/// Information about a build() method in a State class
@immutable
class BuildMethodDecl extends MethodDecl {
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
  final List<WidgetInstantiation> instantiatedWidgets;

  /// Calls to Theme.of, MediaQuery.of, etc.
  final List<String> ancestorReads;

  /// Provider reads (context.read/watch)
  final List<String> providerReads;

  /// FutureBuilder/StreamBuilder calls
  final List<String> asyncBuilders;

  /// State fields accessed in this build
  final List<StateFieldDecl> accessedStateFields;

  BuildMethodDecl({
    required super.id,
    required super.name,
    required super.returnType,
    required super.sourceLocation,
    super.parameters = const [],
    super.body,
    super.isAsync = false,
    super.documentation,
    super.annotations = const [],
    super.className,
    super.markedOverride = true, // build() typically overrides
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

  /// Line number where build method starts
  int get lineNumber => sourceLocation.line;

  /// Number of statements in build method
  int get statementCount {
    if (body == null) return 0;
    if (body is BlockStmt) {
      return (body as BlockStmt).statements.length;
    }
    return 1;
  }

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

  @override
  String toString() =>
      'build() [${estimatedNodeCount} nodes, depth: $maxTreeDepth, complexity: ${complexity.name}]';
}

enum BuildMethodComplexity { low, medium, high, veryHigh }

/// Represents a widget instantiation in build()
@immutable
class WidgetInstantiation {
  /// Unique identifier
  final String id;

  /// Widget name (e.g., "Container", "Text", "ListView")
  final String name;

  /// Source location
  final SourceLocationIR sourceLocation;

  /// Whether this widget is const
  final bool isConst;

  /// Whether this widget is created in a loop
  final bool isInLoop;

  /// Whether this widget has a key parameter
  final bool hasKey;

  /// Parent widget (if known)
  final String? parentWidget;

  /// Child widgets (if known)
  final List<String> childWidgets;

  const WidgetInstantiation({
    required this.id,
    required this.name,
    required this.sourceLocation,
    this.isConst = false,
    this.isInLoop = false,
    this.hasKey = false,
    this.parentWidget,
    this.childWidgets = const [],
  });

  int get lineNumber => sourceLocation.line;

  @override
  String toString() =>
      '${isConst ? "const " : ""}$name${hasKey ? " (keyed)" : ""}';
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
  final TypeIR? genericType;

  /// Mutable fields that trigger rebuilds
  final List<StateFieldDecl> stateFields;

  /// Regular (immutable or non-reactive) fields
  final List<FieldDecl> regularFields;

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

  /// Controllers used in this State (subset of fields)
  final List<StateFieldDecl> controllers;

  /// Whether this State uses TickerProviderStateMixin
  final bool usesSingleTickerProvider;

  /// Whether this State uses multiple ticker providers
  final bool usesMultipleTickerProviders;

  /// Whether this State class appears to have memory leaks
  final bool appearToHaveMemoryLeaks;

  /// Detected issues in lifecycle management
  final List<LifecycleIssue> lifecycleIssues;

  StateDecl({
    required super.id,
    required super.sourceLocation,
    required super.name,
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
    super.superclass,
    super.interfaces = const [],
    super.mixins = const [],
    super.typeParameters = const [],
    super.fields = const [],
    super.methods = const [],
    super.constructors = const [],
    super.isAbstract = false,
    super.documentation,
    super.annotations = const [],
    super.metadata,
    this.usesSingleTickerProvider = false,
    this.usesMultipleTickerProviders = false,
    this.appearToHaveMemoryLeaks = false,
    this.lifecycleIssues = const [],
  });

  /// Whether initState calls super (must be true)
  bool get initStateCallsSuper => initState?.callsSuper ?? false;

  /// Whether dispose calls super (must be true)
  bool get disposeCallsSuper => dispose?.callsSuper ?? false;

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
  List<StateFieldDecl> get controllersMissingDisposal {
    final disposed =
        dispose?.disposedControllers.map((f) => f.name).toSet() ?? <String>{};
    return controllers
        .where((c) => !disposed.contains(c.name) && !c.isDisposedProperly)
        .toList();
  }

  /// Whether this State has all required lifecycle methods
  bool get hasCompleteLifecycle =>
      initState != null &&
      dispose != null &&
      initStateCallsSuper &&
      disposeCallsSuper;

  /// Whether this State properly manages controllers
  bool get properlyManagedControllers => controllersMissingDisposal.isEmpty;

  /// Critical issues that need attention
  List<LifecycleIssue> get criticalIssues =>
      lifecycleIssues.where((i) => i.severity == IssueSeverity.error).toList();

  /// Warning issues
  List<LifecycleIssue> get warningIssues => lifecycleIssues
      .where((i) => i.severity == IssueSeverity.warning)
      .toList();

  /// Health score (0-100) based on lifecycle management
  int get healthScore {
    int score = 100;

    // Deduct for missing lifecycle methods
    if (initState == null &&
        (stateFields.isNotEmpty || controllers.isNotEmpty)) {
      score -= 20;
    }
    if (dispose == null && controllers.isNotEmpty) {
      score -= 20;
    }

    // Deduct for not calling super
    if (initState != null && !initStateCallsSuper) score -= 15;
    if (dispose != null && !disposeCallsSuper) score -= 15;

    // Deduct for missing controller disposal
    score -= (controllersMissingDisposal.length * 10);

    // Deduct for unused state fields
    score -= (unusedStateFields.length * 5);

    // Deduct for critical issues
    score -= (criticalIssues.length * 10);

    // Deduct for problematic setState calls
    final criticalSetState = setStateCalls
        .where((s) => s.severity == SetStateCallSeverity.critical)
        .length;
    score -= (criticalSetState * 5);

    return score.clamp(0, 100);
  }

  @override
  String toString() =>
      'StateDecl($name) [${stateFields.length} state fields, health: $healthScore]';
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

  /// Source location where issue occurs
  final SourceLocationIR sourceLocation;

  /// Suggested fix
  final String? suggestion;

  /// Related fields/methods
  final List<String> relatedItems;

  const LifecycleIssue({
    required this.type,
    required this.severity,
    required this.message,
    required this.sourceLocation,
    this.suggestion,
    this.relatedItems = const [],
  });

  /// Line number where issue occurs (convenience)
  int get lineNumber => sourceLocation.line;

  @override
  String toString() => '${type.name} (${severity.name}): $message';
}

enum LifecycleIssueType {
  /// initState doesn't call super
  initStateNoSuper,

  /// dispose doesn't call super
  disposeNoSuper,

  /// didUpdateWidget doesn't call super
  didUpdateWidgetNoSuper,

  /// Missing super call in lifecycle method
  missingSuper,

  /// Resource leak (controller/subscription not disposed)
  resourceLeak,

  /// Resource used before initialization
  useBeforeInit,

  /// Resource disposed multiple times
  disposedTwice,

  /// Lifecycle method ordering problem
  orderingProblem,

  /// Missing async handling
  missingAsyncHandling,

  /// No error handling
  noErrorHandling,

  /// Should be stateless widget
  statefulVsStateless,

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
        issues.add(
          LifecycleIssue(
            type: LifecycleIssueType.missingInitState,
            severity: IssueSeverity.warning,
            message:
                'State has ${state.stateFields.length} state fields but no initState',
            sourceLocation: state.sourceLocation,
            suggestion:
                'Implement initState() to initialize controllers/listeners',
          ),
        );
      }
    } else if (!state.initStateCallsSuper) {
      issues.add(
        LifecycleIssue(
          type: LifecycleIssueType.initStateNoSuper,
          severity: IssueSeverity.error,
          message: 'initState() does not call super.initState()',
          sourceLocation: state.initState!.sourceLocation,
          suggestion: 'Add super.initState() as first statement in initState()',
        ),
      );
    }

    // Check dispose
    if (state.dispose == null) {
      if (state.controllers.isNotEmpty || state.providerReads.isNotEmpty) {
        issues.add(
          LifecycleIssue(
            type: LifecycleIssueType.missingDispose,
            severity: IssueSeverity.error,
            message:
                'State uses ${state.controllers.length} controllers but has no dispose()',
            sourceLocation: state.sourceLocation,
            suggestion: 'Implement dispose() to clean up resources',
          ),
        );
      }
    } else if (!state.disposeCallsSuper) {
      issues.add(
        LifecycleIssue(
          type: LifecycleIssueType.disposeNoSuper,
          severity: IssueSeverity.error,
          message: 'dispose() does not call super.dispose()',
          sourceLocation: state.dispose!.sourceLocation,
          suggestion: 'Add super.dispose() as last statement in dispose()',
        ),
      );
    }

    // Check didUpdateWidget
    if (state.didUpdateWidget != null && !state.didUpdateWidget!.callsSuper) {
      issues.add(
        LifecycleIssue(
          type: LifecycleIssueType.didUpdateWidgetNoSuper,
          severity: IssueSeverity.warning,
          message: 'didUpdateWidget() does not call super.didUpdateWidget()',
          sourceLocation: state.didUpdateWidget!.sourceLocation,
          suggestion:
              'Call super.didUpdateWidget(oldWidget) in didUpdateWidget()',
        ),
      );
    }

    // Check for undisposed controllers
    for (final controller in state.controllersMissingDisposal) {
      issues.add(
        LifecycleIssue(
          type: LifecycleIssueType.controllerNotDisposed,
          severity: IssueSeverity.error,
          message: 'Controller "${controller.name}" created but never disposed',
          sourceLocation: controller.sourceLocation,
          suggestion: 'Add ${controller.name}.dispose() in dispose() method',
          relatedItems: [controller.name],
        ),
      );
    }

    // Check for unused state fields
    for (final field in state.unusedStateFields) {
      issues.add(
        LifecycleIssue(
          type: LifecycleIssueType.unusedStateField,
          severity: IssueSeverity.info,
          message: 'State field "${field.name}" is never accessed in build()',
          sourceLocation: field.sourceLocation,
          suggestion: 'Consider removing unused field or using it in build()',
          relatedItems: [field.name],
        ),
      );
    }

    // Check build method
    if (state.buildMethod != null) {
      if (state.buildMethod!.isAsync) {
        issues.add(
          LifecycleIssue(
            type: LifecycleIssueType.buildIsAsync,
            severity: IssueSeverity.error,
            message: 'build() is async - this is not allowed',
            sourceLocation: state.buildMethod!.sourceLocation,
            suggestion: 'Move async logic to initState or use FutureBuilder',
          ),
        );
      }

      if (state.buildMethod!.createsWidgetsInLoops) {
        issues.add(
          LifecycleIssue(
            type: LifecycleIssueType.widgetsInLoops,
            severity: IssueSeverity.warning,
            message: 'Widgets are created inside loops in build()',
            sourceLocation: state.buildMethod!.sourceLocation,
            suggestion:
                'Consider using ListView.builder or similar for dynamic lists',
          ),
        );
      }
    }

    // Check for setState in loops
    for (final setStateCall in state.setStateCalls) {
      if (setStateCall.isInLoop) {
        issues.add(
          LifecycleIssue(
            type: LifecycleIssueType.other,
            severity: IssueSeverity.error,
            message:
                'setState() called inside a loop in ${setStateCall.inMethod}',
            sourceLocation: setStateCall.sourceLocation,
            suggestion:
                'Batch state updates and call setState() once after the loop',
          ),
        );
      }

      if (setStateCall.isAsync) {
        issues.add(
          LifecycleIssue(
            type: LifecycleIssueType.setStateWithAsync,
            severity: IssueSeverity.warning,
            message:
                'setState() has async callback in ${setStateCall.inMethod}',
            sourceLocation: setStateCall.sourceLocation,
            suggestion:
                'Avoid async callbacks in setState(). Use Future.microtask() instead',
          ),
        );
      }
    }

    return issues;
  }

  /// Generate a health report for a State class
  static String generateHealthReport(StateDecl state) {
    final buffer = StringBuffer();

    buffer.writeln('State Health Report: ${state.name}');
    buffer.writeln('=' * 60);
    buffer.writeln('Health Score: ${state.healthScore}/100');
    buffer.writeln();

    buffer.writeln('State Fields: ${state.stateFieldCount}');
    buffer.writeln(
      '  - Accessed in build(): ${state.fieldsAccessedInBuild.length}',
    );
    buffer.writeln('  - Unused: ${state.unusedStateFields.length}');
    buffer.writeln();

    buffer.writeln('Controllers: ${state.controllers.length}');
    buffer.writeln(
      '  - Missing disposal: ${state.controllersMissingDisposal.length}',
    );
    buffer.writeln();

    buffer.writeln('setState() Calls: ${state.setStateCalls.length}');
    final criticalCalls = state.setStateCalls
        .where((s) => s.severity == SetStateCallSeverity.critical)
        .length;
    if (criticalCalls > 0) {
      buffer.writeln('  - CRITICAL: $criticalCalls');
    }
    buffer.writeln();

    if (state.lifecycleIssues.isNotEmpty) {
      buffer.writeln('Issues Found: ${state.lifecycleIssues.length}');
      buffer.writeln('  - Errors: ${state.criticalIssues.length}');
      buffer.writeln('  - Warnings: ${state.warningIssues.length}');
      buffer.writeln();

      for (final issue in state.lifecycleIssues) {
        final severity = issue.severity == IssueSeverity.error
            ? 'ERROR'
            : 'WARNING';
        buffer.writeln('[$severity] ${issue.message}');
        if (issue.suggestion != null) {
          buffer.writeln('  → ${issue.suggestion}');
        }
      }
    }

    return buffer.toString();
  }
}
