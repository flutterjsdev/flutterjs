import 'package:meta/meta.dart';

import 'issue_category.dart';
import 'source_location.dart';
/// Severity levels for analysis issues
enum IssueSeverity {
  error,    // Blocks execution or violates Dart rules
  warning,  // Likely bug or poor practice
  info,     // Suggestion for improvement
  hint,     // Low-priority note
}



/// Represents a problem found during analysis
@immutable
class AnalysisIssue {
  /// Unique identifier for this issue (e.g., "issue_missing_dispose_widget_123")
  final String id;

  /// Severity level of this issue
  final IssueSeverity severity;

   /// Category of issue
  final IssueCategory category;

  /// What went wrong (human-readable message)
  final String message;

  /// Machine-readable issue code for IDE integration (e.g., "flutter.missing_dispose")
  final String code;

  /// Where the problem is in source code
  final SourceLocationIR sourceLocation;

  /// Suggested fix (if any)
  final String? suggestion;

  /// Related locations that provide context
  final List<SourceLocationIR> relatedLocations;

  /// This issue is a duplicate of another (for deduplication)
  final bool isDuplicate;

  /// URL to documentation
  final String? documentationUrl;

  /// When this issue was created (milliseconds since epoch)
  final int createdAtMillis;

  const AnalysisIssue({
    required this.id,
    required this.severity,
    required this.message,
    required this.code,
    required this.sourceLocation,
    required this.category,
    this.suggestion,
    this.relatedLocations = const [],
    this.isDuplicate = false,
    this.documentationUrl,
    int? createdAtMillis,
  }) : createdAtMillis = createdAtMillis ?? 0;

  /// Convenience constructor for errors
  factory AnalysisIssue.error({
    required String id,
    required String message,
    required String code,
    required SourceLocationIR sourceLocation,
    required IssueCategory  category,
    String? suggestion,
    List<SourceLocationIR> relatedLocations = const [],
    String? documentationUrl,
   
  }) {
    return AnalysisIssue(
      id: id,
      severity: IssueSeverity.error,
      category: category,
      message: message,
      code: code,
      sourceLocation: sourceLocation,
      suggestion: suggestion,
      relatedLocations: relatedLocations,
      documentationUrl: documentationUrl,
    );
  }

  /// Convenience constructor for warnings
  factory AnalysisIssue.warning({
    required String id,
    required String message,
    required String code,
    required SourceLocationIR sourceLocation,
    required IssueCategory  category,
    String? suggestion,
    List<SourceLocationIR> relatedLocations = const [],
    String? documentationUrl,
  }) {
    return AnalysisIssue(
      id: id,
      severity: IssueSeverity.warning,
      category: category,
      message: message,
      code: code,
      sourceLocation: sourceLocation,
      suggestion: suggestion,
      relatedLocations: relatedLocations,
      documentationUrl: documentationUrl,
    );
  }

  /// Convenience constructor for info
  factory AnalysisIssue.info({
    required String id,
    required String message,
    required String code,
    required SourceLocationIR sourceLocation,
     required IssueCategory  category,
    String? suggestion,
  }) {
    return AnalysisIssue(
      id: id,
      severity: IssueSeverity.info,
      message: message,
      code: code,
      sourceLocation: sourceLocation,
      suggestion: suggestion,
      category: category
    );
  }

  /// Convenience constructor for hints
  factory AnalysisIssue.hint({
    required String id,
    required String message,
    required String code,
    required SourceLocationIR sourceLocation,
     required IssueCategory  category,
  }) {
    return AnalysisIssue(
      id: id,
      severity: IssueSeverity.hint,
      message: message,
      code: code,
      sourceLocation: sourceLocation,
      category: category
    );
  }

  /// Human-readable output for console/IDE
  String get displayMessage => '[$severity] $message ($code)';

  /// Full diagnostic with location and suggestion
  String get fullReport {
    final buffer = StringBuffer();
    buffer.writeln('$displayMessage');
    buffer.writeln('  at ${sourceLocation.humanReadable}');
    if (suggestion != null) {
      buffer.writeln('  💡 ${suggestion!}');
    }
    if (relatedLocations.isNotEmpty) {
      buffer.writeln('  Related:');
      for (final loc in relatedLocations) {
        buffer.writeln('    - ${loc.humanReadable}');
      }
    }
    if (documentationUrl != null) {
      buffer.writeln('  Docs: $documentationUrl');
    }
    return buffer.toString();
  }

  @override
  String toString() => displayMessage;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AnalysisIssue &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          code == other.code &&
          sourceLocation == other.sourceLocation &&
          severity == other.severity;

  @override
  int get hashCode =>
      Object.hash(id, code, sourceLocation, severity);

  factory AnalysisIssue.fromJson(Map<String, dynamic> json) {
    return AnalysisIssue(
      id: json['id'] as String,
      severity: IssueSeverity.values.firstWhere(
        (s) => s.name == json['severity'],
        orElse: () => IssueSeverity.warning,
      ),
      message: json['message'] as String,
      code: json['code'] as String,
      sourceLocation: SourceLocationIR.fromJson(
        json['sourceLocation'] as Map<String, dynamic>,
      ),
      suggestion: json['suggestion'] as String?,
      relatedLocations: (json['relatedLocations'] as List<dynamic>?)
              ?.map((e) => SourceLocationIR.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      isDuplicate: json['isDuplicate'] as bool? ?? false,
      documentationUrl: json['documentationUrl'] as String?,
      createdAtMillis: json['createdAtMillis'] as int?,
      category: json['category'] 
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'severity': severity.name,
      'message': message,
      'code': code,
      'sourceLocation': sourceLocation.toJson(),
      'suggestion': suggestion,
      'relatedLocations':
          relatedLocations.map((loc) => loc.toJson()).toList(),
      'isDuplicate': isDuplicate,
      'documentationUrl': documentationUrl,
      'createdAtMillis': createdAtMillis,
    };
  }
}
