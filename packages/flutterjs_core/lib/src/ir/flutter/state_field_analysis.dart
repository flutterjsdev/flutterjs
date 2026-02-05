// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:meta/meta.dart';
import '../diagnostics/analysis_issue.dart';
import '../core/source_location.dart';
import '../expressions/expression_ir.dart';
import '../core/ir_node.dart';
import '../declarations/variable_decl.dart';

/// <---------------------------------------------------------------------------->
/// state_field_analysis.dart
/// ----------------------------------------------------------------------------
///
/// Fine-grained analysis of individual state fields inside StatefulWidget State
/// classes (or any class that uses `setState` / reactive patterns).
///
/// Core entity: [StateFieldAnalysis] – describes one field’s lifecycle,
/// usage, and impact on the widget tree:
/// • Where it is read in `build()` (or never → dead code)
/// • Where it is mutated via `setState()`
/// • Resource handling (controllers, streams, listeners) and disposal checks
/// • Dependency graph (which other fields it depends on / affects)
/// • Performance impact and high-impact field detection
///
/// Additional IR:
/// • [SetStateModificationIR] – details of every `setState` call that touches the field
/// • [FieldInitializationIR] / [FieldDisposalIR] – init/dispose paths
/// • Issue containers ([StateFieldIssueIR]) and rebuild-trigger edges
///
/// Used for:
/// • Detecting unused / dead state fields
/// • Finding “modified in build()” bugs
/// • Resource-leak diagnostics (controller not disposed)
/// • Recommending field extraction or conversion to provider/selectors
/// • Building the global rebuild-trigger graph (see rebuild_trigger_graph.dart)
///
/// All types are immutable, provide rich `toJson` and human-readable summaries,
/// and are designed for incremental analysis and merging of results.
/// <---------------------------------------------------------------------------->
@immutable
class StateFieldAnalysis extends IRNode {
  /// The field being analyzed
  final FieldDecl field;

  /// Whether this field is read in the build() method
  final bool isAccessedInBuild;

  /// All locations where this field is read in build()
  ///
  /// Multiple accesses to same field tracked separately
  /// Useful for identifying redundant reads
  final List<SourceLocationIR> buildAccessLocations;

  /// How many times this field is accessed in build()
  int get buildAccessCount => buildAccessLocations.length;

  /// Whether this field is written in the build() method
  ///
  /// This is often a bug - modifying state in build() causes problems
  final bool isModifiedInBuild;

  /// Location where field is modified in build (if it happens)
  ///
  /// Usually indicates a bug that should be fixed
  final SourceLocationIR? buildModificationLocation;

  /// All setState() calls that modify this field
  ///
  /// Tracks which state mutations affect this field
  final List<SetStateModificationIR> setStateCallsModifying;

  /// Whether changes to this field trigger a rebuild
  ///
  /// Usually true, but can be false for:
  /// - Fields only used in non-rendering context
  /// - Fields modified in callbacks but never read
  final bool triggersRebuild;

  /// How this field is initialized
  ///
  /// Tracks the initialization path (inline, initState, etc.)
  final FieldInitializationIR? initializationPath;

  /// How this field is disposed (if it's a resource)
  ///
  /// For controllers, streams, etc. that need cleanup
  final FieldDisposalIR? disposalPath;

  /// Whether this field is a resource that needs disposal
  ///
  /// Examples: AnimationController, TextEditingController, StreamController
  final bool isResourceField;

  /// Widgets that directly depend on this field
  ///
  /// Widgets that read this field in their properties
  final List<WidgetDependencyIR> dependentWidgets;

  /// Other fields this field depends on (for ordering)
  ///
  /// If field X depends on field Y, must initialize Y first
  final List<String> dependsOnFields;

  /// Other fields that depend on this field
  final List<String> affectsFields;

  /// Issues found with this field's usage
  final List<StateFieldIssueIR> issues;

  /// Performance metrics for this field
  final StateFieldPerformanceIR performance;

  StateFieldAnalysis({
    required super.id,
    required super.sourceLocation,
    required this.field,
    this.isAccessedInBuild = false,
    this.buildAccessLocations = const [],
    this.isModifiedInBuild = false,
    this.buildModificationLocation,
    this.setStateCallsModifying = const [],
    this.triggersRebuild = false,
    this.initializationPath,
    this.disposalPath,
    this.isResourceField = false,
    this.dependentWidgets = const [],
    this.dependsOnFields = const [],
    this.affectsFields = const [],
    this.issues = const [],
    required this.performance,
  });

  /// Whether this field is actually used in rendering
  bool get isUsedInRendering => isAccessedInBuild && triggersRebuild;

  /// Whether this field is dead code (not used anywhere)
  bool get isDeadCode =>
      !isAccessedInBuild &&
      setStateCallsModifying.isEmpty &&
      dependentWidgets.isEmpty;

  /// Whether this field properly handles resources
  bool get properlyManagesResources =>
      !isResourceField || (initializationPath != null && disposalPath != null);

  /// Whether there are critical issues with this field
  bool get hasCriticalIssues =>
      issues.any((i) => i.severity == IssueSeverity.error);

  /// Whether there are warnings about this field
  bool get hasWarnings =>
      issues.any((i) => i.severity == IssueSeverity.warning);

  /// Get human-readable summary
  String get summary {
    final parts = <String>[];

    if (isDeadCode) {
      parts.add('Dead code (unused)');
    } else if (!isAccessedInBuild) {
      parts.add('Not used in build()');
    } else if (!triggersRebuild) {
      parts.add('Accessed but doesn\'t trigger rebuild');
    } else {
      parts.add('Active (accessed $buildAccessCount times in build())');
    }

    if (isModifiedInBuild) {
      parts.add('⚠️ MODIFIED IN BUILD (bug!)');
    }

    if (isResourceField && !properlyManagesResources) {
      parts.add('⚠️ Resource not properly disposed');
    }

    return parts.join(' | ');
  }

  @override
  String toShortString() =>
      '${field.name}: ${isAccessedInBuild ? "used" : "unused"}, triggers: $triggersRebuild';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'field': field.toString(),
      'isAccessedInBuild': isAccessedInBuild,
      'buildAccessCount': buildAccessCount,
      'isModifiedInBuild': isModifiedInBuild,
      'setStateCallsModifying': setStateCallsModifying.length,
      'triggersRebuild': triggersRebuild,
      'isResourceField': isResourceField,
      'properlyManagesResources': properlyManagesResources,
      'isDeadCode': isDeadCode,
      'dependentWidgets': dependentWidgets.length,
      'issues': issues.length,
      'sourceLocation': sourceLocation.toJson(),
    };
  }
}

/// Represents a setState() call that modifies a state field
@immutable
class SetStateModificationIR extends IRNode {
  /// The setState() call's location
  final SourceLocationIR setStateLocation;

  /// Which method contains this setState() call
  final String methodName;

  /// The callback expression passed to setState()
  final ExpressionIR? callbackExpression;

  /// What fields are modified in this setState() call
  final List<String> modifiedFieldNames;

  /// Whether this setState() is conditional
  final bool isConditional;

  /// Whether this setState() is in a loop
  final bool isInLoop;

  /// Other fields also modified by this setState()
  final List<String> affectsOtherFields;

  SetStateModificationIR({
    required super.id,
    required super.sourceLocation,
    required this.setStateLocation,
    required this.methodName,
    this.callbackExpression,
    this.modifiedFieldNames = const [],
    this.isConditional = false,
    this.isInLoop = false,
    this.affectsOtherFields = const [],
  });

  @override
  String toShortString() =>
      'setState in $methodName [${modifiedFieldNames.join(", ")}]${isConditional ? " (conditional)" : ""}${isInLoop ? " (in loop)" : ""}';
}

/// Represents how a state field is initialized
@immutable
class FieldInitializationIR extends IRNode {
  /// Where the field is initialized
  final InitializationLocationIR location;

  /// The initializer expression
  final ExpressionIR? expression;

  /// When this initialization happens relative to other fields
  final int initializationOrder;

  /// Whether this is lazy initialization
  final bool isLazy;

  /// Whether initialization depends on other fields
  final List<String> dependsOnFields;

  /// Whether initialization is async
  final bool isAsync;

  /// Whether initialization can fail
  final bool canFail;

  FieldInitializationIR({
    required super.id,
    required super.sourceLocation,
    required this.location,
    this.expression,
    this.initializationOrder = 0,
    this.isLazy = false,
    this.dependsOnFields = const [],
    this.isAsync = false,
    this.canFail = false,
  });

  @override
  String toShortString() =>
      '${location.name}${isLazy ? " (lazy)" : ""}${isAsync ? " (async)" : ""}';
}

/// Represents how a state field is cleaned up
@immutable
class FieldDisposalIR extends IRNode {
  /// Where disposal happens (usually dispose() method)
  final DisposalLocationIR location;

  /// The disposal code/method called
  final String disposalCode;

  /// Whether disposal is guaranteed to happen
  final bool isGuaranteed;

  /// Whether disposal is conditional
  final bool isConditional;

  /// Whether disposal can throw an exception
  final bool canThrow;

  /// If disposal is missing but needed, this flag is set
  final bool isMissing;

  /// Reason disposal might be missing/problematic
  final String? missingReason;

  FieldDisposalIR({
    required super.id,
    required super.sourceLocation,
    required this.location,
    required this.disposalCode,
    this.isGuaranteed = true,
    this.isConditional = false,
    this.canThrow = false,
    this.isMissing = false,
    this.missingReason,
  });

  @override
  String toShortString() =>
      'Disposal in ${location.name}${isConditional ? " (conditional)" : ""}${isMissing ? " ⚠️ MISSING" : ""}';
}

/// Represents a widget that depends on a state field
@immutable
class WidgetDependencyIR extends IRNode {
  /// Widget type/class name
  final String widgetType;

  /// Which property of the widget uses this field
  final String propertyName;

  /// Location in code where field is accessed
  final SourceLocationIR accessLocation;

  /// Whether this property is reactive (changes update widget)
  final bool isReactive;

  /// Whether field is used in child widget
  final bool isInChildWidget;

  WidgetDependencyIR({
    required super.id,
    required super.sourceLocation,
    required this.widgetType,
    required this.propertyName,
    required this.accessLocation,
    this.isReactive = true,
    this.isInChildWidget = false,
  });

  @override
  String toShortString() =>
      '$widgetType.$propertyName${isReactive ? " (reactive)" : ""}';
}

/// Performance metrics for a state field
@immutable
class StateFieldPerformanceIR extends IRNode {
  /// How often this field is accessed in a typical build
  int get accessFrequency => _accessCount;
  final int _accessCount;

  /// Estimated cost of re-evaluating uses of this field
  ///
  /// Based on complexity of widgets using it
  final double estimatedCostPerRebuild;

  /// How many widgets depend on this field
  final int dependentWidgetCount;

  /// Whether changes to this field affect many widgets
  ///
  /// Affects > 10 widgets = potential performance issue
  final bool isHighImpact;

  /// Whether this field is frequently modified
  ///
  /// > 5 setState calls per operation = potential issue
  final bool isFrequentlyModified;

  /// Estimated number of rebuilds per user interaction
  ///
  /// If field modified, how many rebuilds happen?
  final int rebuildsPerModification;

  StateFieldPerformanceIR({
    required super.id,
    required super.sourceLocation,
    int accessCount = 0,
    this.estimatedCostPerRebuild = 0.0,
    this.dependentWidgetCount = 0,
    this.isHighImpact = false,
    this.isFrequentlyModified = false,
    this.rebuildsPerModification = 1,
  }) : _accessCount = accessCount;

  @override
  String toShortString() =>
      'Accessed $accessFrequency times, impacts $dependentWidgetCount widgets, cost: ${estimatedCostPerRebuild.toStringAsFixed(2)}';
}

/// Issues found with a state field
@immutable
class StateFieldIssueIR extends IRNode {
  /// Severity of the issue
  final IssueSeverity severity;

  /// Type of issue
  final StateFieldIssueType issueType;

  /// Human-readable description
  final String message;

  /// Suggested fix
  final String? suggestion;

  /// Location of the issue
  final SourceLocationIR? issueLocation;

  StateFieldIssueIR({
    required super.id,
    required super.sourceLocation,
    required this.severity,
    required this.issueType,
    required this.message,
    this.suggestion,
    this.issueLocation,
  });

  @override
  String toShortString() =>
      '[${severity.name.toUpperCase()}] ${issueType.name}: $message';
}

// // =============================================================================
// // REBUILD TRIGGER GRAPH
// // =============================================================================

// /// Models dependencies between state changes and UI rebuilds
// ///
// /// Nodes: StateField, Edges: "change in X triggers rebuild of Y"
// @immutable
// class RebuildTriggerGraph extends IRNode {
//   /// All state fields as graph nodes
//   final List<StateFieldAnalysis> stateFields;

//   /// Edges: state field → build method/widget
//   final List<RebuildTriggerEdge> edges;

//   /// Computed transitive closure (field X affects all these widgets)
//   final Map<String, Set<String>> transitiveAffects;

//   /// Analysis results
//   final RebuildGraphAnalysisIR analysis;

//   RebuildTriggerGraph({
//     required super.id,
//     required super.sourceLocation,
//     this.stateFields = const [],
//     this.edges = const [],
//     this.transitiveAffects = const {},
//     required this.analysis,
//   });

//   /// Find all fields that affect a given widget
//   Set<String> getFieldsAffecting(String widgetName) {
//     final affecting = <String>{};
//     for (final edge in edges) {
//       if (edge.targetWidget == widgetName) {
//         affecting.add(edge.sourceField);
//       }
//     }
//     return affecting;
//   }

//   /// Find all widgets affected by a given field
//   Set<String> getWidgetsAffectedBy(String fieldName) =>
//       transitiveAffects[fieldName] ?? {};

//   /// Find redundant state modifications (same field modified multiple times per operation)
//   List<RedundantModificationIR> findRedundantModifications() {
//     final result = <RedundantModificationIR>[];
//     for (final field in stateFields) {
//       if (field.setStateCallsModifying.length > 1) {
//         result.add(
//           RedundantModificationIR(
//             fieldName: field.field.name,
//             modificationCount: field.setStateCallsModifying.length,
//             locations: field.setStateCallsModifying
//                 .map((m) => m.setStateLocation)
//                 .toList(),
//           ),
//         );
//       }
//     }
//     return result;
//   }

//   @override
//   String toShortString() =>
//       'RebuildGraph [${stateFields.length} fields, ${edges.length} dependencies]';
// }

/// A single edge in the rebuild trigger graph
@immutable
class RebuildTriggerEdge {
  /// Source: state field name
  final String sourceField;

  /// Target: widget name
  final String targetWidget;

  /// How strong is this dependency (0.0 - 1.0)
  final double strength;

  /// Whether this is a direct or transitive dependency
  final bool isDirect;

  /// Number of rebuild cycles triggered by this edge
  final int rebuildCount;

  const RebuildTriggerEdge({
    required this.sourceField,
    required this.targetWidget,
    this.strength = 1.0,
    this.isDirect = true,
    this.rebuildCount = 1,
  });

  @override
  String toString() =>
      '$sourceField → $targetWidget (strength: ${strength.toStringAsFixed(2)}, rebuilds: $rebuildCount)';
}

/// Analysis results from the rebuild trigger graph
@immutable
class RebuildGraphAnalysisIR extends IRNode {
  /// Fields with no effect on rendering (dead code)
  final List<String> deadCodeFields;

  /// Fields that trigger rebuilds of many widgets
  final List<HighImpactFieldIR> highImpactFields;

  /// Potential circular dependencies
  final List<CircularDependencyIR> circularDependencies;

  /// Inefficient patterns found
  final List<String> inefficientPatterns;

  /// Overall graph complexity score (0-100)
  final int complexityScore;

  RebuildGraphAnalysisIR({
    required super.id,
    required super.sourceLocation,
    this.deadCodeFields = const [],
    this.highImpactFields = const [],
    this.circularDependencies = const [],
    this.inefficientPatterns = const [],
    this.complexityScore = 0,
  });

  @override
  String toShortString() =>
      'Graph [dead: ${deadCodeFields.length}, high-impact: ${highImpactFields.length}, circular: ${circularDependencies.length}, complexity: $complexityScore/100]';
}

/// Field that affects many widgets
@immutable
class HighImpactFieldIR {
  final String fieldName;
  final int affectedWidgetCount;
  final double totalCostPerRebuild;

  HighImpactFieldIR({
    required this.fieldName,
    required this.affectedWidgetCount,
    required this.totalCostPerRebuild,
  });
}

/// Circular dependency in state
@immutable
class CircularDependencyIR {
  final List<String> fieldChain;

  CircularDependencyIR({required this.fieldChain});

  @override
  String toString() => '${fieldChain.join(' → ')} → ${fieldChain.first}';
}

/// Redundant state modification
@immutable
class RedundantModificationIR {
  final String fieldName;
  final int modificationCount;
  final List<SourceLocationIR> locations;

  RedundantModificationIR({
    required this.fieldName,
    required this.modificationCount,
    required this.locations,
  });
}

// =============================================================================
// ENUMS
// =============================================================================

enum InitializationLocationIR {
  fieldDeclaration, // int x = 0;
  constructorField, // this.x = x in constructor
  constructorBody, // x = 0; in constructor body
  initState, // in initState()
  lazyInitialization, // late field, initialized elsewhere
  factoryConstructor, // in factory constructor
}

enum DisposalLocationIR {
  dispose, // in dispose() method
  destructor, // implicit cleanup
  finally_, // in finally block
  notDisposed, // no disposal found
}

enum StateFieldIssueType {
  deadCode, // Field never used
  notAccessedInBuild, // Not read in build()
  modifiedInBuild, // Modified in build (bug)
  resourceNotDisposed, // Resource not cleaned up
  nullableMissing, // Should be nullable but isn't
  frequentModification, // Too many setState calls
  highImpact, // Affects too many widgets
  circularDependency, // Depends on itself indirectly
  synchronizationIssue, // Not properly synchronized
}
