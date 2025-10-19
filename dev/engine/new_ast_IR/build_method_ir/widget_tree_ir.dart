import 'package:meta/meta.dart';

import '../diagnostics/source_location.dart';
import '../ir/ir_node.dart';
import 'widget_node_ir.dart';
// =============================================================================
// WIDGET TREE REPRESENTATION
// =============================================================================

/// Represents the complete widget tree rendered by a build method
/// 
/// This captures the hierarchical structure of all widgets that will be
/// rendered during a single build() call. It includes metadata about the
/// tree structure that enables optimization analysis and debugging.
/// 
/// Examples of what this contains:
/// - Scaffold > AppBar (const) > Column > [Container, Text]
/// - ListView.builder with dynamic children (keyed)
/// - Complex nested structure with conditional branches
@immutable
class WidgetTreeIR extends IRNode {
  /// Root node of the tree
  /// 
  /// The widget that build() returns, everything else is a descendant
  final WidgetNodeIR root;

  /// Total number of nodes in this tree
  /// 
  /// Count of every widget, including root
  /// Useful for performance analysis (too many = rebuild is expensive)
  final int nodeCount;

  /// Maximum nesting depth
  /// 
  /// Measured from root to deepest leaf
  /// Deep trees (>20) can have layout performance issues
  final int depth;

  /// Conditional branches where tree structure differs
  /// 
  /// Locations in the tree where if/else or ternary creates different widgets
  /// Examples: "if (user.isAdmin)", "condition ? Widget1 : Widget2"
  final List<ConditionalBranchIR> conditionalBranches;

  /// Iteration patterns where dynamic children are generated
  /// 
  /// Locations where widgets are created in loops or map operations
  /// Examples: "list.map((item) => ItemWidget(item))", "for (var i = 0; ...)"
  final List<IterationPatternIR> iterationPatterns;

  /// Total count of const widgets in tree
  final int constWidgetCount;

  /// Total count of non-const widgets in tree
  final int nonConstWidgetCount;

  /// Widgets that need keys (in loops but don't have them)
  final int unkeyedDynamicWidgetCount;

  /// Tree statistics and metrics
  final TreeMetricsIR metrics;

  WidgetTreeIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.root,
    this.nodeCount = 0,
    this.depth = 0,
    this.conditionalBranches = const [],
    this.iterationPatterns = const [],
    this.constWidgetCount = 0,
    this.nonConstWidgetCount = 0,
    this.unkeyedDynamicWidgetCount = 0,
    required this.metrics,
  }) : super(id: id, sourceLocation: sourceLocation);

  /// Percentage of widgets using const keyword
  double get constWidgetPercentage =>
      nodeCount == 0 ? 0.0 : (constWidgetCount / nodeCount) * 100;

  /// Whether tree structure is simple (no conditionals, no loops)
  bool get isSimpleStructure =>
      conditionalBranches.isEmpty && iterationPatterns.isEmpty;

  /// Whether tree has dynamic structure that changes
  bool get hasDynamicStructure =>
      conditionalBranches.isNotEmpty || iterationPatterns.isNotEmpty;

  /// Whether tree has any performance concerns
  bool get hasPerformanceConcerns =>
      depth > 20 ||
      nodeCount > 100 ||
      nonConstWidgetCount > constWidgetCount ||
      unkeyedDynamicWidgetCount > 0;

  /// Get all issues found in this tree
  List<String> validateTree() {
    final issues = <String>[];

    if (root.treeDepth ==0) {
      issues.add('Widget tree has no root widget');
    }

    if (nodeCount == 0) {
      issues.add('Widget tree is empty');
    }

    if (depth > 20) {
      issues.add('Widget nesting depth ($depth) exceeds recommended maximum (20)');
    }

    if (nodeCount > 100) {
      issues.add('Widget tree has too many nodes ($nodeCount)');
    }

    if (constWidgetPercentage < 30) {
      issues.add('Only ${constWidgetPercentage.toStringAsFixed(1)}% of widgets use const');
    }

    if (unkeyedDynamicWidgetCount > 0) {
      issues.add('$unkeyedDynamicWidgetCount dynamic widgets missing keys');
    }

    return issues;
  }

  @override
  String toShortString() =>
      'WidgetTree [root: ${root.widgetType}, nodes: $nodeCount, depth: $depth, const: ${constWidgetPercentage.toStringAsFixed(1)}%]';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'root': root.toJson(),
      'nodeCount': nodeCount,
      'depth': depth,
      'conditionalBranches':
          conditionalBranches.map((c) => c.toJson()).toList(),
      'iterationPatterns': iterationPatterns.map((i) => i.toJson()).toList(),
      'constWidgetCount': constWidgetCount,
      'nonConstWidgetCount': nonConstWidgetCount,
      'unkeyedDynamicWidgetCount': unkeyedDynamicWidgetCount,
      'metrics': metrics.toJson(),
      'sourceLocation': sourceLocation.toJson(),
    };
  }

  factory WidgetTreeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return WidgetTreeIR(
      id: json['id'] as String,
      sourceLocation: sourceLocation,
      root: WidgetNodeIR.fromJson(
        json['root'] as Map<String, dynamic>,
        sourceLocation,
      ),
      nodeCount: json['nodeCount'] as int? ?? 0,
      depth: json['depth'] as int? ?? 0,
      conditionalBranches: (json['conditionalBranches'] as List<dynamic>? ?? [])
          .map((c) => ConditionalBranchIR.fromJson(
            c as Map<String, dynamic>,
            sourceLocation,
          ))
          .toList(),
      iterationPatterns: (json['iterationPatterns'] as List<dynamic>? ?? [])
          .map((i) => IterationPatternIR.fromJson(
            i as Map<String, dynamic>,
            sourceLocation,
          ))
          .toList(),
      constWidgetCount: json['constWidgetCount'] as int? ?? 0,
      nonConstWidgetCount: json['nonConstWidgetCount'] as int? ?? 0,
      unkeyedDynamicWidgetCount: json['unkeyedDynamicWidgetCount'] as int? ?? 0,
      metrics: TreeMetricsIR.fromJson(
        json['metrics'] as Map<String, dynamic>? ?? {},
        sourceLocation,
      ),
    );
  }
}

/// Represents a conditional branch in the widget tree
@immutable
class ConditionalBranchIR extends IRNode {
  /// Condition expression (the if/ternary condition)
  final String conditionExpression;

  /// Widget in then branch
  final String thenWidgetType;

  /// Widget in else branch (if any)
  final String? elseWidgetType;

  /// Branch type (ternary, if statement, null coalesce)
  final BranchTypeIR branchType;

  ConditionalBranchIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.conditionExpression,
    required this.thenWidgetType,
    this.elseWidgetType,
    required this.branchType,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      '$conditionExpression ? $thenWidgetType : ${elseWidgetType ?? "null"}';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conditionExpression': conditionExpression,
      'thenWidgetType': thenWidgetType,
      'elseWidgetType': elseWidgetType,
      'branchType': branchType.name,
      'sourceLocation': sourceLocation.toJson(),
    };
  }

  factory ConditionalBranchIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return ConditionalBranchIR(
      id: json['id'] as String,
      sourceLocation: sourceLocation,
      conditionExpression: json['conditionExpression'] as String,
      thenWidgetType: json['thenWidgetType'] as String,
      elseWidgetType: json['elseWidgetType'] as String?,
      branchType: BranchTypeIR.values.byName(
        json['branchType'] as String? ?? 'ternary',
      ),
    );
  }
}

/// Represents an iteration pattern (loop) in widget tree
@immutable
class IterationPatternIR extends IRNode {
  /// Loop type (for, forEach, map, etc.)
  final LoopTypeIR loopType;

  /// What's being iterated over
  final String iterableExpression;

  /// Loop variable name
  final String loopVariableName;

  /// Widget generated per iteration
  final String generatedWidgetType;

  /// Whether items have keys
  final bool hasKeys;

  /// Expected number of items (if determinable)
  final int? expectedItemCount;

  IterationPatternIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.loopType,
    required this.iterableExpression,
    required this.loopVariableName,
    required this.generatedWidgetType,
    this.hasKeys = false,
    this.expectedItemCount,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      '${loopType.name}($loopVariableName) => $generatedWidgetType${hasKeys ? " [keyed]" : ""}';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'loopType': loopType.name,
      'iterableExpression': iterableExpression,
      'loopVariableName': loopVariableName,
      'generatedWidgetType': generatedWidgetType,
      'hasKeys': hasKeys,
      'expectedItemCount': expectedItemCount,
      'sourceLocation': sourceLocation.toJson(),
    };
  }

  factory IterationPatternIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return IterationPatternIR(
      id: json['id'] as String,
      sourceLocation: sourceLocation,
      loopType: LoopTypeIR.values.byName(
        json['loopType'] as String? ?? 'forEach',
      ),
      iterableExpression: json['iterableExpression'] as String,
      loopVariableName: json['loopVariableName'] as String,
      generatedWidgetType: json['generatedWidgetType'] as String,
      hasKeys: json['hasKeys'] as bool? ?? false,
      expectedItemCount: json['expectedItemCount'] as int?,
    );
  }
}

/// Tree metrics and statistics
@immutable
class TreeMetricsIR extends IRNode {
  /// Average branching factor (children per node)
  final double averageBranchingFactor;

  /// Number of leaf nodes (no children)
  final int leafNodeCount;

  /// Estimated total build time in microseconds
  final int estimatedBuildTimeUs;

  /// Memory estimate for widget tree in bytes
  final int estimatedMemoryBytes;

  TreeMetricsIR({
    required super. id,
    required super. sourceLocation,
    this.averageBranchingFactor = 0.0,
    this.leafNodeCount = 0,
    this.estimatedBuildTimeUs = 0,
    this.estimatedMemoryBytes = 0,
  }) ;

  @override
  String toShortString() =>
      'Metrics [branching: ${averageBranchingFactor.toStringAsFixed(2)}, leaves: $leafNodeCount, time: ~${estimatedBuildTimeUs}us]';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'averageBranchingFactor': averageBranchingFactor,
      'leafNodeCount': leafNodeCount,
      'estimatedBuildTimeUs': estimatedBuildTimeUs,
      'estimatedMemoryBytes': estimatedMemoryBytes,
      'sourceLocation': sourceLocation.toJson(),
    };
  }

  factory TreeMetricsIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return TreeMetricsIR(
      id: json['id'] as String,
      sourceLocation: sourceLocation,
      averageBranchingFactor: (json['averageBranchingFactor'] as num? ?? 0).toDouble(),
      leafNodeCount: json['leafNodeCount'] as int? ?? 0,
      estimatedBuildTimeUs: json['estimatedBuildTimeUs'] as int? ?? 0,
      estimatedMemoryBytes: json['estimatedMemoryBytes'] as int? ?? 0,
    );
  }
}

// =============================================================================
// ENUMS
// =============================================================================

enum BranchTypeIR {
  ternary,      // condition ? widget1 : widget2
  ifStatement,  // if (condition) widget1 else widget2
  switchCase,   // switch case
  nullCoalesce, // value ?? default
}

enum LoopTypeIR {
  forLoop,      // for (var i = 0; ...)
  forEach,      // for (var item in items)
  mapMethod,    // items.map()
  expandMethod, // items.expand()
  listMap,      // [...list.map()]
  listExpand,   // [...list.expand()]
  custom,       // other iteration
}