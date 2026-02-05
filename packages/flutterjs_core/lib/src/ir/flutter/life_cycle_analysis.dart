// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:meta/meta.dart';
import '../diagnostics/analysis_issue.dart';
import '../core/source_location.dart';
import '../core/ir_node.dart';
import '../statements/statement_ir.dart';
import 'state_class_representation.dart';

/// <---------------------------------------------------------------------------->
/// lifecycle_analysis.dart
/// ----------------------------------------------------------------------------
///
/// Deep lifecycle correctness analysis for `State<T>` classes (initState,
/// didUpdateWidget, dispose, etc.).
///
/// Primary entity: [LifecycleAnalysis] – aggregates every operation that occurs
/// in each lifecycle method and validates resource acquisition/disposal order,
/// super-call requirements, async safety, and error handling.
///
/// Key sub-models:
/// • [LifecycleOperationIR] – a single statement in a lifecycle method
/// • [ResourceLeakIR], [UseBeforeInitIR], [OrderingIssueIR] – concrete problems
/// • Comprehensive issue list with severity and fix suggestions
///
/// Detects critical bugs such as:
/// • AnimationController created but never disposed
/// • Field used before initState runs
/// • Missing `super.initState()` / `super.dispose()`
/// • Async operations in initState without proper handling
///
/// Provides a health score (0-100) and a human-readable summary used by IDE
/// quick-fixes, CI reports, and architecture dashboards.
///
/// All classes are immutable, JSON-serializable, and designed for incremental
/// analysis passes and result merging.
/// <---------------------------------------------------------------------------->
///
///
///
///
///
///
///
///
/// Comprehensive analysis of State lifecycle methods and their correctness
///
/// Tracks what operations happen at each lifecycle stage and detects:
/// - Resource leaks (created but not disposed)
/// - Use-before-initialize bugs
/// - Ordering issues
/// - Missing lifecycle operations
///
/// Example analysis:
/// ```dart
/// class _MyState extends State<MyWidget> {
///   late AnimationController _controller;
///
///   @override
///   void initState() {
///     super.initState();
///     _controller = AnimationController(...); // Initialized
///   }
///
///   @override
///   void dispose() {
///     _controller.dispose(); // Properly disposed
///     super.dispose();
///   }
/// }
/// ```
@immutable
class LifecycleAnalysis extends IRNode {
  /// Operations that run during initState()
  ///
  /// This is where resources are typically acquired
  final List<LifecycleOperationIR> initStateOperations;

  /// Operations that run during dispose()
  ///
  /// This is where resources should be released
  final List<LifecycleOperationIR> disposeOperations;

  /// Operations in didUpdateWidget()
  ///
  /// Runs when parent widget changes properties
  final List<LifecycleOperationIR> didUpdateWidgetOperations;

  /// Operations in didChangeDependencies()
  ///
  /// Runs when an InheritedWidget is accessed
  final List<LifecycleOperationIR> didChangeDependenciesOperations;

  /// Operations in reassemble()
  ///
  /// Runs during hot reload
  final List<LifecycleOperationIR> reassembleOperations;

  /// Operations in deactivate()
  ///
  /// Runs when widget is removed from tree
  final List<LifecycleOperationIR> deactivateOperations;

  /// Resources created but never disposed
  ///
  /// Critical: leads to memory leaks
  final List<ResourceLeakIR> resourceLeaks;

  /// Fields accessed before initialization
  ///
  /// Critical: causes runtime errors
  final List<UseBeforeInitIR> useBeforeInitIssues;

  /// Lifecycle ordering problems
  ///
  /// Example: dispose() called before cleanup
  final List<OrderingIssueIR> orderingIssues;

  /// Missing required lifecycle operations
  ///
  /// Example: controller created but no dispose()
  final List<MissingOperationIR> missingOperations;

  /// Whether this State has proper error handling in lifecycle
  final bool hasErrorHandling;

  /// Whether super is called in all lifecycle methods
  final bool callsSuperInAllMethods;

  /// All detected lifecycle issues
  final List<LifecycleIssueIR> issues;

  /// Overall lifecycle health (0-100, 100 = perfect)
  final int healthScore;

  LifecycleAnalysis({
    required String id,
    required SourceLocationIR sourceLocation,
    this.initStateOperations = const [],
    this.disposeOperations = const [],
    this.didUpdateWidgetOperations = const [],
    this.didChangeDependenciesOperations = const [],
    this.reassembleOperations = const [],
    this.deactivateOperations = const [],
    this.resourceLeaks = const [],
    this.useBeforeInitIssues = const [],
    this.orderingIssues = const [],
    this.missingOperations = const [],
    this.hasErrorHandling = false,
    this.callsSuperInAllMethods = false,
    this.issues = const [],
    this.healthScore = 100,
  }) : super(id: id, sourceLocation: sourceLocation);

  /// Whether there are critical lifecycle bugs
  bool get hasCriticalIssues =>
      resourceLeaks.isNotEmpty || useBeforeInitIssues.isNotEmpty;

  /// Whether lifecycle is properly structured
  bool get isProperlyStructured =>
      !hasCriticalIssues &&
      orderingIssues.isEmpty &&
      missingOperations.isEmpty &&
      callsSuperInAllMethods;

  /// Count of resources that need disposal
  int get resourcesThatNeedDisposal => initStateOperations
      .where((op) => op.createsResource)
      .fold(0, (sum, op) => sum + 1);

  /// Count of resources actually disposed
  int get resourcesDisposed => disposeOperations
      .where((op) => op.disposesResource)
      .fold(0, (sum, op) => sum + 1);

  /// Whether all created resources are disposed
  bool get allResourcesDisposed =>
      resourcesThatNeedDisposal == resourcesDisposed && resourceLeaks.isEmpty;

  /// Human-readable lifecycle summary
  String get summary {
    final parts = <String>[];

    parts.add('initState: ${initStateOperations.length} operations');
    parts.add('dispose: ${disposeOperations.length} operations');

    if (hasCriticalIssues) {
      parts.add(
        '⚠️ CRITICAL ISSUES: ${resourceLeaks.length} leaks, ${useBeforeInitIssues.length} use-before-init',
      );
    }

    if (!allResourcesDisposed) {
      parts.add(
        '⚠️ ${resourcesThatNeedDisposal - resourcesDisposed} resources not disposed',
      );
    }

    if (!callsSuperInAllMethods) {
      parts.add('⚠️ Missing super calls in lifecycle');
    }

    return parts.join(' | ');
  }

  /// Validate lifecycle correctness
  List<String> validate() {
    final errors = <String>[];

    // Check for resource leaks
    if (resourceLeaks.isNotEmpty) {
      errors.add(
        'Resource leaks detected: ${resourceLeaks.map((r) => r.resourceName).join(", ")}',
      );
    }

    // Check for use-before-init
    if (useBeforeInitIssues.isNotEmpty) {
      errors.add(
        'Use-before-init: ${useBeforeInitIssues.map((u) => u.fieldName).join(", ")}',
      );
    }

    // Check resource disposal
    if (!allResourcesDisposed) {
      errors.add(
        '${resourcesThatNeedDisposal - resourcesDisposed} resources not disposed',
      );
    }

    // Check super calls
    if (!callsSuperInAllMethods) {
      errors.add('Missing super() calls in lifecycle methods');
    }

    // Check ordering
    if (orderingIssues.isNotEmpty) {
      errors.add(
        'Lifecycle ordering problems: ${orderingIssues.length} issues',
      );
    }

    return errors;
  }

  @override
  String toShortString() =>
      'Lifecycle [health: $healthScore, issues: ${issues.length}, leaks: ${resourceLeaks.length}]';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'initStateOps': initStateOperations.length,
      'disposeOps': disposeOperations.length,
      'resourceLeaks': resourceLeaks.length,
      'useBeforeInitIssues': useBeforeInitIssues.length,
      'orderingIssues': orderingIssues.length,
      'missingOperations': missingOperations.length,
      'healthScore': healthScore,
      'allResourcesDisposed': allResourcesDisposed,
      'sourceLocation': sourceLocation.toJson(),
    };
  }
}

// =============================================================================
// LIFECYCLE OPERATIONS
// =============================================================================

/// A single operation (statement) in a lifecycle method
@immutable
class LifecycleOperationIR extends IRNode {
  /// Which lifecycle method this operation belongs to
  final LifecycleMethodType method;

  /// What this operation does
  final OperationTypeIR operationType;

  /// Description of the operation
  final String description;

  /// The statement/code
  final StatementIR? statement;

  /// Whether this creates a resource that needs disposal
  final bool createsResource;

  /// Whether this disposes a resource
  final bool disposesResource;

  /// Resource name (if applicable)
  final String? resourceName;

  /// Whether this calls super
  final bool callsSuper;

  /// Whether this operation is async
  final bool isAsync;

  /// Whether this operation can throw
  final bool canThrow;

  /// Whether this operation modifies state
  final bool modifiesState;

  /// Dependencies (other resources that must be initialized first)
  final List<String> dependsOn;

  LifecycleOperationIR({
    required super.id,
    required super.sourceLocation,
    required this.method,
    required this.operationType,
    required this.description,
    this.statement,
    this.createsResource = false,
    this.disposesResource = false,
    this.resourceName,
    this.callsSuper = false,
    this.isAsync = false,
    this.canThrow = false,
    this.modifiesState = false,
    this.dependsOn = const [],
  });

  @override
  String toShortString() =>
      '${method.name}: ${operationType.name}${createsResource ? ' (creates ${resourceName ?? "resource"})' : ''}${disposesResource ? ' (disposes)' : ''}';
}

/// A resource that was created but not disposed
@immutable
class ResourceLeakIR extends IRNode {
  /// Name of the resource
  final String resourceName;

  /// Type of resource (controller, stream, listener, etc.)
  final ResourceTypeIR resourceType;

  /// Where it was created
  final SourceLocationIR creationLocation;

  /// Why it wasn't disposed
  final String reason;

  /// Severity of the leak
  final IssueSeverity severity;

  /// Potential impact of not disposing
  final String impact;

  ResourceLeakIR({
    required super.id,
    required super.sourceLocation,
    required this.resourceName,
    required this.resourceType,
    required this.creationLocation,
    required this.reason,
    required this.severity,
    required this.impact,
  });

  @override
  String toShortString() =>
      'Leak: $resourceName (${resourceType.name}) - $reason';
}

/// A field accessed before it was initialized
@immutable
class UseBeforeInitIR extends IRNode {
  /// Name of the field
  final String fieldName;

  /// Where it was accessed too early
  final SourceLocationIR accessLocation;

  /// Where it should have been initialized first
  final SourceLocationIR initializationLocation;

  /// Which method accessed it prematurely
  final LifecycleMethodType methodAccessing;

  /// Which method should initialize it first
  final LifecycleMethodType methodInitializing;

  UseBeforeInitIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.fieldName,
    required this.accessLocation,
    required this.initializationLocation,
    required this.methodAccessing,
    required this.methodInitializing,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      'Use-before-init: $fieldName accessed in ${methodAccessing.name} but initialized in ${methodInitializing.name}';
}

/// Lifecycle ordering problem
@immutable
class OrderingIssueIR extends IRNode {
  /// Type of ordering issue
  final OrderingIssueType issueType;

  /// Description
  final String description;

  /// Operations involved
  final List<LifecycleOperationIR> involvedOperations;

  /// How to fix it
  final String suggestion;

  OrderingIssueIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.issueType,
    required this.description,
    required this.involvedOperations,
    required this.suggestion,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() => 'Ordering: ${issueType.name} - $description';
}

/// Missing required lifecycle operation
@immutable
class MissingOperationIR extends IRNode {
  /// What operation is missing
  final OperationTypeIR missingOperation;

  /// In which lifecycle method it should be
  final LifecycleMethodType method;

  /// Why it's needed
  final String reason;

  /// What was found (if anything)
  final String? whatWasFound;

  MissingOperationIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.missingOperation,
    required this.method,
    required this.reason,
    this.whatWasFound,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      'Missing: ${missingOperation.name} in ${method.name} ($reason)';
}

/// A general lifecycle issue
@immutable
class LifecycleIssueIR extends IRNode {
  /// Severity
  final IssueSeverity severity;

  /// Issue type
  final LifecycleIssueType issueType;

  /// Description
  final String message;

  /// Suggestion to fix
  final String? suggestion;

  /// Location of the issue
  final SourceLocationIR? issueLocation;

  LifecycleIssueIR({
    required super.id,
    required super.sourceLocation,
    required this.severity,
    required this.issueType,
    required this.message,
    this.suggestion,
    this.issueLocation,
  });

  @override
  String toShortString() => '[${severity.name}] ${issueType.name}: $message';
}

// =============================================================================
// ENUMS
// =============================================================================

enum OperationTypeIR {
  createController,
  createStream,
  createListener,
  subscribeToStream,
  addListener,
  disposeController,
  closeStream,
  removeListener,
  unsubscribeFromStream,
  initializeField,
  callSuper,
  callAsync,
  fetchData,
  setupAnimation,
  registerCallback,
  other,
}

enum ResourceTypeIR {
  animationController,
  textEditingController,
  scrollController,
  pageController,
  tabController,
  videoController,
  streamController,
  streamSubscription,
  listener,
  focusNode,
  other,
}

enum OrderingIssueType {
  dependencyNotInitialized, // Using field that hasn't been initialized yet
  multipleInitializations, // Resource initialized multiple times
  disposedThenUsed, // Using resource after disposal
  superNotCalled, // super method not called
  asyncInInit, // Async operation in initState
}
