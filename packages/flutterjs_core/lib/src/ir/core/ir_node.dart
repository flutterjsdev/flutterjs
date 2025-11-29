// lib/src/ir/ir_node.dart

import 'package:meta/meta.dart';

import '../diagnostics/analysis_issue.dart';
import 'source_location.dart';

/// =============================================================================
///  IR NODE BASE CLASSES
///  Foundation for the custom Dart Intermediate Representation (IR)
/// =============================================================================
///
/// PURPOSE
/// -------
/// Defines the core building blocks for all IR nodes in the analyzer/compiler.
/// Every piece of parsed/analyzed Dart code is represented as an IRNode subclass.
///
/// This ensures:
/// • Consistent identity tracking (unique IDs)
/// • Source traceability (file/line/column)
/// • Debuggability (timestamps, metadata)
/// • Extensibility (metadata map for custom data)
/// • Equality checks (content-based, not reference)
///
/// KEY COMPONENTS
/// --------------
/// 1. IRNode              → Abstract base for all IR elements
/// 2. SourceLocationIR    → (Commented out) Tracks code positions
/// 3. AnalysisIssueIR     → Represents lint warnings/errors
///
/// FEATURES
/// --------
/// • Immutable by default (@immutable)
/// • Debug-friendly toString() and toShortString()
/// • Content equality for testing/comparison
/// • Factory constructors for common cases (errors, warnings)
/// • JSON serialization (toJson/fromJson)
///
/// USAGE EXAMPLE
/// -------------
/// ```dart
/// // Create a custom node
/// class MyCustomNode extends IRNode {
///   final String data;
///   MyCustomNode({
///     required String id,
///     required SourceLocationIR sourceLocation,
///     required this.data,
///   }) : super(id: id, sourceLocation: sourceLocation);
///
///   @override
///   String toShortString() => 'MyCustom($data)';
///
///   @override
///   bool contentEquals(IRNode other) =>
///     other is MyCustomNode && data == other.data;
/// }
///
/// // Create an issue
/// final issue = AnalysisIssueIR.error(
///   id: 'err_001',
///   message: 'Something wrong',
///   code: 'my.lint',
///   sourceLocation: myLocation,
/// );
/// ```
///
/// EXTENSION GUIDE
/// ---------------
/// See the commented "EXTENSION GUIDE" section for patterns on:
/// • Creating new IR classes
/// • Integrating with AST visitors
/// • Generating issues
/// • Traversing trees
/// • Serialization
/// • Example Widget IR
///
/// RELATED FILES
/// -------------
/// • type_ir.dart        → Type representations
/// • expression_ir.dart  → Expression nodes
/// • statement_ir.dart   → (Assumed) Statement/control-flow nodes
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
///
///
@immutable
abstract class IRNode {
  /// Unique identifier for this node (format: "type_uniqueKey")
  /// Examples: "widget_MyWidget_abc123", "method_build_def456"
  final String id;

  /// Where this node came from in the source code
  final SourceLocationIR sourceLocation;

  /// When this IR was created (milliseconds since epoch)
  final int createdAtMillis;

  /// Optional metadata for extensibility
  /// Can store analyzer directives, lint levels, custom data, etc.
  final Map<String, dynamic> metadata;

  const IRNode({
    required this.id,
    required this.sourceLocation,
    int? createdAtMillis,
    Map<String, dynamic>? metadata,
  }) : createdAtMillis = createdAtMillis ?? 0,
       metadata = metadata ?? const {};

  /// Human-readable representation for debugging
  String get debugName => runtimeType.toString();

  /// Short description of this node
  String toShortString() => '$debugName($id)';

  @override
  String toString() => toShortString();

  /// For testing: compare meaningful content (not identity)
  bool contentEquals(IRNode other) {
    if (runtimeType != other.runtimeType) return false;
    return id == other.id;
  }
}

/// Represents a problem found during analysis
@immutable
class AnalysisIssueIR extends IRNode {
  /// Severity level of this issue
  final IssueSeverity severity;

  /// What went wrong (human-readable message)
  final String message;

  /// Machine-readable issue code for IDE integration (e.g., "dart.unused_import")
  final String code;

  /// Suggested fix (if any)
  final String? suggestion;

  /// Related locations that provide context
  final List<SourceLocationIR> relatedLocations;

  /// This issue is a duplicate of another (for deduplication)
  final bool isDuplicate;

  const AnalysisIssueIR({
    required super.id,
    required this.severity,
    required this.message,
    required this.code,
    required super.sourceLocation,
    this.suggestion,
    this.relatedLocations = const [],
    this.isDuplicate = false,
  });

  /// Convenience constructor for errors
  factory AnalysisIssueIR.error({
    required String id,
    required String message,
    required String code,
    required SourceLocationIR sourceLocation,
    String? suggestion,
  }) {
    return AnalysisIssueIR(
      id: id,
      severity: IssueSeverity.error,
      message: message,
      code: code,
      sourceLocation: sourceLocation,
      suggestion: suggestion,
    );
  }

  /// Convenience constructor for warnings
  factory AnalysisIssueIR.warning({
    required String id,
    required String message,
    required String code,
    required SourceLocationIR sourceLocation,
  }) {
    return AnalysisIssueIR(
      id: id,
      severity: IssueSeverity.warning,
      message: message,
      code: code,
      sourceLocation: sourceLocation,
    );
  }

  @override
  String toShortString() => '[$severity] $message ($code)';

  @override
  bool contentEquals(IRNode other) {
    if (other is! AnalysisIssueIR) return false;
    return message == other.message &&
        code == other.code &&
        sourceLocation.contentEquals(other.sourceLocation);
  }
}
