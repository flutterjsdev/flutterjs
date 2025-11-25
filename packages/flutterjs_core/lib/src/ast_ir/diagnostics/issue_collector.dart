/// <---------------------------------------------------------------------------->
/// issue_collector.dart
/// ----------------------------------------------------------------------------
///
/// In-memory collector and processor for analysis results.
///
/// Acts as the central registry for all [AnalysisIssue]s produced during a
/// static analysis run (Dart analyzer, custom linters, flutter analyze, etc.).
///
/// Key responsibilities:
/// • Collect & store issues immutably
/// • Deduplicate aggressively (by location + code or location only)
/// • Auto-categorize uncategorized issues via [IssueCategorizer]
/// • Provide rich filtering, grouping, and statistics
/// • Generate beautiful console reports
/// • Export structured JSON or text summaries
/// • Sort issues by severity → file → line (perfect for IDEs and CI)
///
/// Designed for use in:
/// • CLI tools (`flutter analyze`, custom linters)
/// • IDE extensions (VS Code, IntelliJ)
/// • CI/CD pipelines and web dashboards
/// • Testing & benchmarking frameworks
///
/// Thread-safe for single analysis runs. Reset with `clear()` between projects.
///
/// Example:
/// ```dart
/// final collector = IssueCollector();
/// collector.addIssues(issuesFromAnalyzer);
/// collector.deduplicateByLocation();
/// collector.categorizeAll(fileContent: source);
/// collector.printAllIssues();
/// ```
/// <---------------------------------------------------------------------------->

import 'analysis_issue.dart';
import 'issue_categorizer.dart';
import 'issue_category.dart';

class IssueCollector {
  final List<AnalysisIssue> _issues = [];
  final List<AnalysisIssue> _duplicates = [];

  /// All collected issues
  List<AnalysisIssue> get issues => List.unmodifiable(_issues);

  /// All detected duplicate issues
  List<AnalysisIssue> get duplicates => List.unmodifiable(_duplicates);

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

  /// Count of each category
  Map<IssueCategory, int> get categoryCounts {
    final counts = <IssueCategory, int>{};
    for (final issue in _issues) {
      counts[issue.category] = (counts[issue.category] ?? 0) + 1;
    }
    return counts;
  }

  /// Total number of issues
  int get total => _issues.length;

  /// Total number of duplicate issues
  int get totalDuplicates => _duplicates.length;

  /// Only error-level issues
  List<AnalysisIssue> get errors =>
      _issues.where((i) => i.severity == IssueSeverity.error).toList();

  /// Only warning-level issues
  List<AnalysisIssue> get warnings =>
      _issues.where((i) => i.severity == IssueSeverity.warning).toList();

  /// Only info-level issues
  List<AnalysisIssue> get infos =>
      _issues.where((i) => i.severity == IssueSeverity.info).toList();

  /// Only hint-level issues
  List<AnalysisIssue> get hints =>
      _issues.where((i) => i.severity == IssueSeverity.hint).toList();

  /// Critical issues (errors and Flutter critical issues)
  List<AnalysisIssue> get critical => _issues
      .where((i) => i.severity == IssueSeverity.error || i.category.isCritical)
      .toList();

  /// Add an issue
  void addIssue(AnalysisIssue issue) {
    _issues.add(issue);
  }

  /// Add multiple issues
  void addIssues(List<AnalysisIssue> issues) {
    _issues.addAll(issues);
  }

  /// Clear all issues and duplicates
  void clear() {
    _issues.clear();
    _duplicates.clear();
  }

  /// Deduplicate issues by location and code - properly removes duplicates
  void deduplicateByLocation() {
    final seen = <String, AnalysisIssue>{};
    final deduplicated = <AnalysisIssue>[];
    _duplicates.clear();

    for (final issue in _issues) {
      // Create unique key: file:offset:code
      final key =
          '${issue.sourceLocation.filePath}:${issue.sourceLocation.offset}:${issue.code}';

      if (seen.containsKey(key)) {
        // This is a duplicate - store it separately
        _duplicates.add(issue);
      } else {
        // First occurrence - add to results
        seen[key] = issue;
        deduplicated.add(issue);
      }
    }

    _issues.clear();
    _issues.addAll(deduplicated);
  }

  /// Deduplicate issues by location only (ignores code/message differences)
  void deduplicateByLocationOnly() {
    final seen = <String, bool>{};
    final deduplicated = <AnalysisIssue>[];
    _duplicates.clear();

    for (final issue in _issues) {
      final key =
          '${issue.sourceLocation.filePath}:${issue.sourceLocation.offset}';

      if (seen.containsKey(key)) {
        _duplicates.add(issue);
      } else {
        seen[key] = true;
        deduplicated.add(issue);
      }
    }

    _issues.clear();
    _issues.addAll(deduplicated);
  }

  /// Categorize all issues if not already categorized
  void categorizeAll({String? fileContent}) {
    for (int i = 0; i < _issues.length; i++) {
      final oldIssue = _issues[i];

      // If category is 'other', try to recategorize
      if (oldIssue.category == IssueCategory.other) {
        final newCategory = IssueCategorizer.categorize(
          oldIssue,
          fileContent: fileContent,
        );

        if (newCategory != IssueCategory.other) {
          // Rebuild the issue with correct category
          _issues[i] = AnalysisIssue(
            id: oldIssue.id,
            code: oldIssue.code,
            message: oldIssue.message,
            severity: oldIssue.severity,
            category: newCategory,
            sourceLocation: oldIssue.sourceLocation,
            suggestion: oldIssue.suggestion,
            relatedLocations: oldIssue.relatedLocations,
            documentationUrl: oldIssue.documentationUrl,
          );
        }
      }
    }
  }

  /// Get issues for a specific file
  List<AnalysisIssue> getIssuesForFile(String filePath) {
    return _issues.where((i) => i.sourceLocation.filePath == filePath).toList();
  }

  /// Get issues by category
  List<AnalysisIssue> getIssuesByCategory(IssueCategory category) {
    return _issues.where((i) => i.category == category).toList();
  }

  /// Get issues by severity
  List<AnalysisIssue> getIssuesBySeverity(IssueSeverity severity) {
    return _issues.where((i) => i.severity == severity).toList();
  }

  /// Get issues by code
  List<AnalysisIssue> getIssuesByCode(String code) {
    return _issues.where((i) => i.code == code).toList();
  }

  /// Sort issues by severity then location then line
  void sort() {
    _issues.sort((a, b) {
      // Primary: severity (errors first)
      final severityOrder = {
        IssueSeverity.error: 0,
        IssueSeverity.warning: 1,
        IssueSeverity.info: 2,
        IssueSeverity.hint: 3,
      };
      final severityCompare = (severityOrder[a.severity] ?? 99).compareTo(
        severityOrder[b.severity] ?? 99,
      );
      if (severityCompare != 0) return severityCompare;

      // Secondary: file path
      final fileCompare = a.sourceLocation.filePath.compareTo(
        b.sourceLocation.filePath,
      );
      if (fileCompare != 0) return fileCompare;

      // Tertiary: line number
      return a.sourceLocation.line.compareTo(b.sourceLocation.line);
    });
  }

  /// Get issues grouped by file
  Map<String, List<AnalysisIssue>> getIssuesByFile() {
    final result = <String, List<AnalysisIssue>>{};
    for (final issue in _issues) {
      final file = issue.sourceLocation.filePath;
      result.putIfAbsent(file, () => []).add(issue);
    }
    return result;
  }

  /// Get statistics about collected issues
  Map<String, dynamic> getStatistics() {
    return {
      'total': total,
      'duplicates': totalDuplicates,
      'errors': errors.length,
      'warnings': warnings.length,
      'infos': infos.length,
      'hints': hints.length,
      'critical': critical.length,
      'hasErrors': errors.isNotEmpty,
      'hasCritical': critical.isNotEmpty,
      'severityCounts': severityCounts,
      'categoryCounts': categoryCounts,
      'fileCount': getIssuesByFile().length,
    };
  }

  /// Print all issues to console (formatted)
  void printAllIssues() {
    sort();
    print('═' * 80);
    print('ANALYSIS ISSUES REPORT');
    print('═' * 80);
    print('');

    if (_issues.isEmpty) {
      print('✓ No issues found!');
      print('');
      return;
    }

    var currentFile = '';
    for (final issue in _issues) {
      // Print file header if changed
      if (issue.sourceLocation.filePath != currentFile) {
        currentFile = issue.sourceLocation.filePath;
        print('');
        print('📄 FILE: $currentFile');
        print('─' * 80);
      }

      // Print issue
      _printIssue(issue);
    }

    print('');
    print('═' * 80);
    _printSummary();
  }

  /// Print a single issue in a formatted way
  void _printIssue(AnalysisIssue issue) {
    // Severity indicator
    final severityIcon = switch (issue.severity) {
      IssueSeverity.error => '❌',
      IssueSeverity.warning => '⚠️ ',
      IssueSeverity.info => 'ℹ️ ',
      IssueSeverity.hint => '💡',
    };

    // Category badge
    final categoryBadge = issue.category.displayName;

    print(
      '$severityIcon [${issue.severity.name.toUpperCase()}] '
      '${issue.sourceLocation.line}:${issue.sourceLocation.column} '
      '[$categoryBadge]',
    );
    print('   Code: ${issue.code}');
    print('   Message: ${issue.message}');

    if (issue.suggestion != null) {
      print('   💡 Suggestion: ${issue.suggestion}');
    }

    if (issue.documentationUrl != null) {
      print('   📚 Learn more: ${issue.documentationUrl}');
    }

    print('');
  }

  /// Print summary statistics
  void _printSummary() {
    final stats = getStatistics();

    print('SUMMARY:');
    print('  Total Issues: ${stats['total']}');
    if (stats['duplicates'] > 0) {
      print('  Duplicate Issues: ${stats['duplicates']}');
    }
    print('  Files with Issues: ${stats['fileCount']}');
    print('');

    print('BY SEVERITY:');
    print('  Errors: ${stats['errors']}');
    print('  Warnings: ${stats['warnings']}');
    print('  Infos: ${stats['infos']}');
    print('  Hints: ${stats['hints']}');
    print('');

    if (stats['critical'] > 0) {
      print('  ⚠️  CRITICAL ISSUES: ${stats['critical']}');
    }

    print('');
  }

  /// Export issues as JSON-like map
  Map<String, dynamic> toJson() {
    sort();
    return {
      'timestamp': DateTime.now().toIso8601String(),
      'totalIssues': total,
      'totalDuplicates': totalDuplicates,
      'statistics': getStatistics(),
      'issues': _issues
          .map(
            (i) => {
              'code': i.code,
              'severity': i.severity.name,
              'category': i.category.displayName,
              'message': i.message,
              'file': i.sourceLocation.filePath,
              'line': i.sourceLocation.line,
              'column': i.sourceLocation.column,
              'offset': i.sourceLocation.offset,
              'suggestion': i.suggestion,
              'documentationUrl': i.documentationUrl,
            },
          )
          .toList(),
    };
  }

  /// Generate a text report
  String generateReport() {
    sort();
    final buffer = StringBuffer();
    final stats = getStatistics();

    buffer.writeln('═' * 80);
    buffer.writeln('ANALYSIS REPORT');
    buffer.writeln('═' * 80);
    buffer.writeln('Generated: ${DateTime.now().toIso8601String()}');
    buffer.writeln('');

    buffer.writeln('SUMMARY:');
    buffer.writeln('  Total Issues: ${stats['total']}');
    buffer.writeln('  Duplicate Issues: ${stats['duplicates']}');
    buffer.writeln('  Files Analyzed: ${stats['fileCount']}');
    buffer.writeln('  Has Errors: ${stats['hasErrors']}');
    buffer.writeln('  Has Critical: ${stats['hasCritical']}');
    buffer.writeln('');

    buffer.writeln('BY SEVERITY:');
    buffer.writeln('  Errors: ${stats['errors']}');
    buffer.writeln('  Warnings: ${stats['warnings']}');
    buffer.writeln('  Infos: ${stats['infos']}');
    buffer.writeln('  Hints: ${stats['hints']}');
    buffer.writeln('');

    buffer.writeln('BY CATEGORY:');
    final sortedCategories =
        (stats['categoryCounts'] as Map<IssueCategory, int>).entries.toList()
          ..sort((a, b) => b.value.compareTo(a.value));

    for (final entry in sortedCategories) {
      buffer.writeln('  ${entry.key.displayName}: ${entry.value}');
    }
    buffer.writeln('');

    buffer.writeln('═' * 80);
    return buffer.toString();
  }
}
