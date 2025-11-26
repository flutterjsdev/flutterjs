import 'package:meta/meta.dart';
import '../diagnostics/analysis_issue.dart';
import '../core/ir_node.dart';

/// <---------------------------------------------------------------------------->
/// rebuild_trigger_graph.dart
/// ----------------------------------------------------------------------------
///
/// Directed graph that models **which state field changes trigger which build
/// method executions** (the “rebuild trigger” graph).
///
/// Core entities:
/// • [RebuildTriggerGraph] – container for nodes, edges, transitive closure
/// • [RebuildEdge] – source field → target build method with detailed cost info
/// • [RebuildCostIR] – estimated ms cost, widget count, const-ratio, nesting depth…
/// • Comprehensive analysis ([GraphAnalysisIR]) and issue containers
///
/// The graph powers advanced diagnostics:
/// • Unnecessary rebuild detection
/// • Expensive / cascading rebuild identification
/// • High-impact field discovery (“changing this one field rebuilds 87 widgets”)
/// • Optimization suggestions (add const, extract widget, memoize, split state…)
///
/// Features:
/// • Transitive closure pre-computed for O(1) “what does X affect?” queries
/// • Cost model that respects loops, conditionals, dynamic children, etc.
/// • Rich JSON export for visualisation tools
/// • Immutable design with value-equality for safe incremental updates
///
/// Typical usage:
/// ```dart
/// final graph = RebuildTriggerGraph.buildFrom(project);
/// final cascades = graph.findCascades();
/// for (final c in cascades) { report “field X triggers ${c.cascadeLength} rebuilds” }
/// ```
/// <---------------------------------------------------------------------------->
@immutable
class RebuildTriggerGraph extends IRNode {
  /// All rebuild nodes: (StateField, BuildMethod) pairs
  final List<RebuildNode> nodes;

  /// All edges: StateField → BuildMethod with cost information
  final List<RebuildEdge> edges;

  /// Transitive closure: if field X changes, which builds are affected
  ///
  /// Key: field name, Value: set of build method names affected (directly or indirectly)
  final Map<String, Set<String>> transitiveAffects;

  /// Analysis and statistics about this graph
  final GraphAnalysisIR analysis;

  /// Detected performance problems
  final List<PerformanceIssueIR> performanceIssues;

  /// Suggested optimizations
  final List<OptimizationSuggestionIR> optimizationSuggestions;

  RebuildTriggerGraph({
    required super.id,
    required super.sourceLocation,
    this.nodes = const [],
    this.edges = const [],
    this.transitiveAffects = const {},
    required this.analysis,
    this.performanceIssues = const [],
    this.optimizationSuggestions = const [],
  });

  /// Query: What state changes cause this widget to rebuild?
  ///
  /// Returns all edges where the target build method is this widget
  List<RebuildEdge> getTriggersFor(String buildMethodName) {
    return edges.where((e) => e.targetBuildMethod == buildMethodName).toList();
  }

  /// Query: Which widgets rebuild when field X changes?
  ///
  /// Returns all build methods affected by this field (direct + transitive)
  Set<String> getAffectedBuilds(String fieldName) {
    return transitiveAffects[fieldName] ?? {};
  }

  /// Query: What is the direct cost of changing field X?
  ///
  /// Sum of all direct edge costs from this field
  double getDirectCost(String fieldName) {
    return edges
        .where((e) => e.sourceField == fieldName)
        .fold(0.0, (sum, e) => sum + e.cost.estimatedCostMs);
  }

  /// Query: What is the cascading cost of changing field X?
  ///
  /// Includes indirect rebuilds that might be triggered
  double getCascadingCost(String fieldName) {
    double totalCost = getDirectCost(fieldName);

    // Add transitive costs
    final affectedBuilds = getAffectedBuilds(fieldName);
    for (final build in affectedBuilds) {
      // Check if this build modifies other state fields
      for (final edge in edges) {
        if (edge.targetBuildMethod == build && edge.sourceField != fieldName) {
          totalCost += edge.cost.estimatedCostMs;
        }
      }
    }

    return totalCost;
  }

  /// Detect unnecessary rebuilds
  ///
  /// Finds cases where:
  /// - Field accessed but not in build()
  /// - Build method runs but doesn't change UI
  /// - Widget rebuilt but nothing changed
  List<UnnecessaryRebuildIR> findUnnecessaryRebuilds() {
    final unnecessary = <UnnecessaryRebuildIR>[];

    for (final edge in edges) {
      // Build doesn't actually use the field value
      if (!edge.fieldActuallyUsed) {
        unnecessary.add(
          UnnecessaryRebuildIR(
            fieldName: edge.sourceField,
            buildMethod: edge.targetBuildMethod,
            reason: 'Field modified but not used in build()',
            severity: IssueSeverity.warning,
          ),
        );
      }

      // Build runs but produces identical widget tree
      if (edge.cost.rebuildsButNoChange) {
        unnecessary.add(
          UnnecessaryRebuildIR(
            fieldName: edge.sourceField,
            buildMethod: edge.targetBuildMethod,
            reason: 'Build runs but widget tree unchanged',
            severity: IssueSeverity.warning,
          ),
        );
      }
    }

    return unnecessary;
  }

  /// Find expensive rebuilds
  ///
  /// Rebuilds that take significant time or affect many widgets
  List<ExpensiveRebuildIR> findExpensiveRebuilds({
    double costThresholdMs = 5.0,
    int widgetThreshold = 50,
  }) {
    final expensive = <ExpensiveRebuildIR>[];

    // Group edges by build method to analyze aggregate impact
    final edgesByBuild = <String, List<RebuildEdge>>{};
    for (final edge in edges) {
      edgesByBuild.putIfAbsent(edge.targetBuildMethod, () => []).add(edge);
    }

    for (final entry in edgesByBuild.entries) {
      final buildMethod = entry.key;
      final buildEdges = entry.value;

      // Check if any single edge is expensive
      for (final edge in buildEdges) {
        if (edge.cost.estimatedCostMs > costThresholdMs) {
          expensive.add(
            ExpensiveRebuildIR(
              fieldName: edge.sourceField,
              buildMethod: buildMethod,
              costMs: edge.cost.estimatedCostMs,
              reason: 'Single edge exceeds cost threshold',
              affectedWidgetCount: edge.cost.estimatedWidgetsRebuilt,
            ),
          );
        }
      }

      // Check if aggregate cost is high
      final totalCost = buildEdges.fold(
        0.0,
        (sum, e) => sum + e.cost.estimatedCostMs,
      );
      if (totalCost > costThresholdMs * 2) {
        expensive.add(
          ExpensiveRebuildIR(
            fieldName: 'multiple',
            buildMethod: buildMethod,
            costMs: totalCost,
            reason: 'Multiple field changes trigger expensive build',
            affectedWidgetCount: buildEdges.fold(
              0,
              (sum, e) => sum + e.cost.estimatedWidgetsRebuilt,
            ),
          ),
        );
      }
    }

    return expensive;
  }

  /// Detect cascade patterns
  ///
  /// One field change triggers many rebuilds
  List<RebuildCascadeIR> findCascades({int cascadeThreshold = 5}) {
    final cascades = <RebuildCascadeIR>[];

    for (final entry in transitiveAffects.entries) {
      final fieldName = entry.key;
      final affectedBuilds = entry.value;

      if (affectedBuilds.length >= cascadeThreshold) {
        cascades.add(
          RebuildCascadeIR(
            fieldName: fieldName,
            cascadeLength: affectedBuilds.length,
            affectedBuildMethods: affectedBuilds.toList(),
            severity: affectedBuilds.length > cascadeThreshold * 2
                ? IssueSeverity.error
                : IssueSeverity.warning,
          ),
        );
      }
    }

    return cascades;
  }

  @override
  String toShortString() =>
      'RebuildGraph [${nodes.length} nodes, ${edges.length} edges, analysis: ${analysis.toShortString()}]';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nodeCount': nodes.length,
      'edgeCount': edges.length,
      'analysis': analysis.toJson(),
      'performanceIssues': performanceIssues.length,
      'sourceLocation': sourceLocation.toJson(),
    };
  }
}

// =============================================================================
// REBUILD NODE
// =============================================================================

/// A node in the rebuild trigger graph
///
/// Represents a (StateField, BuildMethod) pair
@immutable
class RebuildNode {
  /// Unique identifier for this node
  final String id;

  /// Name of the state field
  final String fieldName;

  /// Name of the build method
  final String buildMethodName;

  /// Class containing this build method
  final String className;

  /// Whether this is a direct dependency (field read in build)
  final bool isDirect;

  /// Whether this is a transitive dependency (field affects another field that affects build)
  final bool isTransitive;

  const RebuildNode({
    required this.id,
    required this.fieldName,
    required this.buildMethodName,
    required this.className,
    this.isDirect = false,
    this.isTransitive = false,
  });

  /// Full qualified build method name
  String get qualifiedBuildMethod => '$className.$buildMethodName';

  @override
  String toString() => 'Node($fieldName → $qualifiedBuildMethod)';
}

// =============================================================================
// REBUILD EDGE
// =============================================================================

/// An edge in the rebuild trigger graph
///
/// Represents: "when this state field changes, this build method is triggered"
@immutable
class RebuildEdge {
  /// Unique identifier
  final String id;

  /// Source: state field name
  final String sourceField;

  /// Target: build method name
  final String targetBuildMethod;

  /// Class containing the build method
  final String className;

  /// Cost information for this rebuild
  final RebuildCostIR cost;

  /// Whether the field value is actually used in the build
  ///
  /// If false: field modification triggers rebuild but isn't read
  final bool fieldActuallyUsed;

  /// Whether this is a direct edge (field directly accessed in build)
  final bool isDirect;

  /// How frequently this edge is traversed
  ///
  /// Based on how often the field is modified relative to other fields
  final EdgeFrequency frequency;

  /// Timestamp when this edge was last analyzed
  final DateTime analyzedAt;

  const RebuildEdge({
    required this.id,
    required this.sourceField,
    required this.targetBuildMethod,
    required this.className,
    required this.cost,
    this.fieldActuallyUsed = true,
    this.isDirect = true,
    this.frequency = EdgeFrequency.common,
    required this.analyzedAt,
  });

  /// Full qualified name of build method
  String get qualifiedBuildMethod => '$className.$targetBuildMethod';

  /// Severity based on cost and frequency
  IssueSeverity get severityBasedOnCost {
    if (cost.estimatedCostMs > 10.0) return IssueSeverity.error;
    if (cost.estimatedCostMs > 5.0) return IssueSeverity.warning;
    return IssueSeverity.info;
  }

  @override
  String toString() =>
      'Edge($sourceField → $qualifiedBuildMethod, cost: ${cost.estimatedCostMs.toStringAsFixed(2)}ms)';
}

// =============================================================================
// REBUILD COST ANALYSIS
// =============================================================================

/// Detailed cost information for a rebuild
@immutable
class RebuildCostIR {
  /// Estimated time to execute this build in milliseconds
  final double estimatedCostMs;

  /// Estimated number of widgets that will be rebuilt
  final int estimatedWidgetsRebuilt;

  /// Whether this build is const-heavy (optimized)
  final bool hasHighConstRatio;

  /// Maximum nesting depth of widgets in this build
  final int maxNestingDepth;

  /// Number of conditional branches in build
  final int conditionalBranchCount;

  /// Number of loops in build
  final int loopCount;

  /// Whether build has dynamic children
  final bool hasDynamicChildren;

  /// Whether build rebuilds but produces identical tree
  ///
  /// Indicates memoization opportunity
  final bool rebuildsButNoChange;

  /// Factors contributing to cost
  final List<CostFactorIR> costFactors;

  RebuildCostIR({
    required this.estimatedCostMs,
    required this.estimatedWidgetsRebuilt,
    this.hasHighConstRatio = false,
    this.maxNestingDepth = 0,
    this.conditionalBranchCount = 0,
    this.loopCount = 0,
    this.hasDynamicChildren = false,
    this.rebuildsButNoChange = false,
    this.costFactors = const [],
  });

  /// Whether this cost is acceptable
  ///
  /// < 1ms: excellent
  /// < 5ms: good
  /// < 16ms (60fps): acceptable
  /// >= 16ms: problematic
  bool get isAcceptable => estimatedCostMs < 16.0;

  /// Performance rating
  String get rating {
    if (estimatedCostMs < 1.0) return 'Excellent';
    if (estimatedCostMs < 5.0) return 'Good';
    if (estimatedCostMs < 16.0) return 'Acceptable';
    if (estimatedCostMs < 50.0) return 'Poor';
    return 'Very Poor';
  }

  Map<String, dynamic> toJson() {
    return {
      'estimatedCostMs': estimatedCostMs,
      'estimatedWidgetsRebuilt': estimatedWidgetsRebuilt,
      'rating': rating,
      'hasHighConstRatio': hasHighConstRatio,
      'maxNestingDepth': maxNestingDepth,
      'conditionalBranches': conditionalBranchCount,
      'loops': loopCount,
      'hasDynamicChildren': hasDynamicChildren,
    };
  }
}

/// A single factor contributing to rebuild cost
@immutable
class CostFactorIR {
  /// Type of factor
  final CostFactorType type;

  /// Description
  final String description;

  /// How much this contributes to total cost (0.0-1.0)
  final double weightage;

  /// Estimated milliseconds this adds to rebuild
  final double contributionMs;

  const CostFactorIR({
    required this.type,
    required this.description,
    required this.weightage,
    required this.contributionMs,
  });

  @override
  String toString() =>
      '${type.name}: ${contributionMs.toStringAsFixed(2)}ms (+${(weightage * 100).toStringAsFixed(0)}%)';
}

// =============================================================================
// GRAPH ANALYSIS
// =============================================================================

/// Overall analysis and statistics about the rebuild trigger graph
@immutable
class GraphAnalysisIR extends IRNode {
  /// Total number of state fields in graph
  final int totalStateFields;

  /// Total number of build methods in graph
  final int totalBuildMethods;

  /// Average number of fields per build
  final double averageFieldsPerBuild;

  /// Average cost per rebuild in milliseconds
  final double averageRebuildCostMs;

  /// Maximum cost for any single rebuild
  final double maxRebuildCostMs;

  /// Minimum cost for any rebuild
  final double minRebuildCostMs;

  /// Total estimated cost of all rebuilds per frame (60fps target)
  final double totalFrameBudgetMs;

  /// Whether current graph fits in 16ms frame budget
  final bool fitsInFrameBudget;

  /// Number of problematic patterns detected
  final int problemCount;

  /// Complexity score (0-100, 100 = very complex)
  final int complexityScore;

  /// Unused fields (never accessed in build)
  final int unusedFieldCount;

  /// Dead code patterns found
  final int deadCodePatternCount;

  GraphAnalysisIR({
    required super.id,
    required super.sourceLocation,
    required this.totalStateFields,
    required this.totalBuildMethods,
    required this.averageFieldsPerBuild,
    required this.averageRebuildCostMs,
    required this.maxRebuildCostMs,
    required this.minRebuildCostMs,
    required this.totalFrameBudgetMs,
    required this.fitsInFrameBudget,
    required this.problemCount,
    required this.complexityScore,
    required this.unusedFieldCount,
    required this.deadCodePatternCount,
  });

  @override
  String toShortString() =>
      'Analysis [${totalStateFields} fields → ${totalBuildMethods} builds, avg: ${averageRebuildCostMs.toStringAsFixed(2)}ms, fits budget: $fitsInFrameBudget]';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'totalStateFields': totalStateFields,
      'totalBuildMethods': totalBuildMethods,
      'averageRebuildCostMs': averageRebuildCostMs,
      'maxRebuildCostMs': maxRebuildCostMs,
      'totalFrameBudgetMs': totalFrameBudgetMs,
      'fitsInFrameBudget': fitsInFrameBudget,
      'problemCount': problemCount,
      'complexityScore': complexityScore,
      'sourceLocation': sourceLocation.toJson(),
    };
  }
}

// =============================================================================
// ISSUES AND SUGGESTIONS
// =============================================================================

/// A performance issue detected in the graph
@immutable
class PerformanceIssueIR extends IRNode {
  /// Issue severity
  final IssueSeverity severity;

  /// Issue category
  final PerformanceIssueCategoryIR category;

  /// Human-readable description
  final String message;

  /// Affected state field
  final String fieldName;

  /// Affected build method
  final String buildMethodName;

  /// Suggested fix
  final String? suggestion;

  PerformanceIssueIR({
    required super.id,
    required super.sourceLocation,
    required this.severity,
    required this.category,
    required this.message,
    required this.fieldName,
    required this.buildMethodName,
    this.suggestion,
  });

  @override
  String toShortString() =>
      '[${severity.name}] $category: $fieldName → $buildMethodName';
}

/// Optimization suggestion for the graph
@immutable
class OptimizationSuggestionIR extends IRNode {
  /// Type of optimization
  final OptimizationTypeIR type;

  /// Estimated improvement (0.0-1.0, 1.0 = 100% improvement)
  final double estimatedImprovement;

  /// Implementation difficulty (0.0 = easy, 1.0 = very hard)
  final double implementationDifficulty;

  /// Description
  final String description;

  /// Specific recommendation
  final String recommendation;

  /// Affected field(s)
  final List<String> affectedFields;

  OptimizationSuggestionIR({
    required super.id,
    required super.sourceLocation,
    required this.type,
    required this.estimatedImprovement,
    required this.implementationDifficulty,
    required this.description,
    required this.recommendation,
    required this.affectedFields,
  });

  /// Priority score (higher = should do first)
  double get priority =>
      (estimatedImprovement / (implementationDifficulty + 0.1));

  @override
  String toShortString() =>
      '${type.name}: ${(estimatedImprovement * 100).toStringAsFixed(0)}% improvement, difficulty: ${(implementationDifficulty * 100).toStringAsFixed(0)}%';
}

/// Unnecessary rebuild detected
@immutable
class UnnecessaryRebuildIR {
  final String fieldName;
  final String buildMethod;
  final String reason;
  final IssueSeverity severity;

  UnnecessaryRebuildIR({
    required this.fieldName,
    required this.buildMethod,
    required this.reason,
    required this.severity,
  });

  @override
  String toString() => 'Unnecessary: $fieldName → $buildMethod ($reason)';
}

/// Expensive rebuild detected
@immutable
class ExpensiveRebuildIR {
  final String fieldName;
  final String buildMethod;
  final double costMs;
  final String reason;
  final int affectedWidgetCount;

  ExpensiveRebuildIR({
    required this.fieldName,
    required this.buildMethod,
    required this.costMs,
    required this.reason,
    required this.affectedWidgetCount,
  });

  @override
  String toString() =>
      'Expensive: $fieldName → $buildMethod (${costMs.toStringAsFixed(2)}ms, $affectedWidgetCount widgets)';
}

/// Rebuild cascade detected
@immutable
class RebuildCascadeIR {
  final String fieldName;
  final int cascadeLength;
  final List<String> affectedBuildMethods;
  final IssueSeverity severity;

  RebuildCascadeIR({
    required this.fieldName,
    required this.cascadeLength,
    required this.affectedBuildMethods,
    required this.severity,
  });

  @override
  String toString() =>
      'Cascade: $fieldName triggers $cascadeLength rebuilds (${affectedBuildMethods.join(", ")})';
}

// =============================================================================
// ENUMS
// =============================================================================

enum EdgeFrequency {
  veryRare, // < 1% of interactions
  rare, // 1-5% of interactions
  occasional, // 5-25% of interactions
  common, // 25-75% of interactions
  frequent, // 75-99% of interactions
  veryFrequent, // 99%+ of interactions
}

enum CostFactorType {
  widgetCount,
  nestingDepth,
  conditionals,
  loops,
  dynamicChildren,
  animationHandling,
  complexExpressions,
  providerAccess,
}

enum PerformanceIssueCategoryIR {
  unnecessaryRebuild,
  expensiveBuild,
  cascade,
  deadCode,
  memoizationOpportunity,
}

enum OptimizationTypeIR {
  addConstKeyword,
  extractWidget,
  useMemoization,
  improveKeyUsage,
  splitStateFields,
  lazyInitialization,
  cacheComputation,
  useInheritedWidget,
}
