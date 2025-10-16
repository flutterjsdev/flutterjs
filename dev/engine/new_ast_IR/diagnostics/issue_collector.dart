import 'analysis_issue.dart';

class IssueCollector {
  final List<AnalysisIssue> _issues = [];

  /// All collected issues
  List<AnalysisIssue> get issues => List.unmodifiable(_issues);

  /// Count of each severity level
  Map<IssueSeverity, int> get severityCounts {
    final counts = <IssueSeverity, int>{
      IssueSeverity.error: 0,
      IssueSeverity.warning: 0,
      IssueSeverity.info: 0,
      IssueSeverity.hint: 0,
    };
    for (final issue in _issues) {
      counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    }
    return counts;
  }

  /// Total number of issues
  int get total => _issues.length;

  /// Only error-level issues
  List<AnalysisIssue> get errors =>
      _issues.where((i) => i.severity == IssueSeverity.error).toList();

  /// Only warning-level issues
  List<AnalysisIssue> get warnings =>
      _issues.where((i) => i.severity == IssueSeverity.warning).toList();

  /// Add an issue
  void addIssue(AnalysisIssue issue) {
    _issues.add(issue);
  }

  /// Add multiple issues
  void addIssues(List<AnalysisIssue> issues) {
    _issues.addAll(issues);
  }

  /// Clear all issues
  void clear() {
    _issues.clear();
  }

  /// Deduplicate issues by location and code
  void deduplicateByLocation() {
    final seen = <String, AnalysisIssue>{};
    final deduplicated = <AnalysisIssue>[];

    for (final issue in _issues) {
      final key =
          '${issue.sourceLocation.filePath}:${issue.sourceLocation.offset}:${issue.code}';
      if (seen.containsKey(key)) {
        // Mark as duplicate
        deduplicated.add(
          AnalysisIssue(
            id: issue.id,
            severity: issue.severity,
            message: issue.message,
            code: issue.code,
            sourceLocation: issue.sourceLocation,
            suggestion: issue.suggestion,
            relatedLocations: issue.relatedLocations,
            isDuplicate: true,
            documentationUrl: issue.documentationUrl,
          ),
        );
      } else {
        seen[key] = issue;
        deduplicated.add(issue);
      }
    }

    _issues.clear();
    _issues.addAll(deduplicated);
  }

  /// Get issues for a specific file
  List<AnalysisIssue> getIssuesForFile(String filePath) {
    return _issues
        .where((i) => i.sourceLocation.filePath == filePath)
        .toList();
  }

  /// Sort issues by severity then location
  void sort() {
    _issues.sort((a, b) {
      final severityOrder = {
        IssueSeverity.error: 0,
        IssueSeverity.warning: 1,
        IssueSeverity.info: 2,
        IssueSeverity.hint: 3,
      };
      final severityCompare = (severityOrder[a.severity] ?? 99)
          .compareTo(severityOrder[b.severity] ?? 99);
      if (severityCompare != 0) return severityCompare;

      return a.sourceLocation.filePath
          .compareTo(b.sourceLocation.filePath);
    });
  }

  /// Print all issues to console (formatted)
  void printAllIssues() {
    sort();
    for (final issue in _issues) {
      print(issue.fullReport);
      print('---');
    }
  }
}