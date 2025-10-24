import 'analysis_issue.dart';
import 'issue_category.dart';
import 'source_location.dart';

/// Utility class to categorize analysis issues based on code, message, and context
class IssueCategorizer {
  /// Categorize an issue based on its code, message, and severity
  static IssueCategory categorizeByCode(String code, String message) {
    // Syntax and semantic errors
    if (_syntaxErrorCodes.contains(code)) {
      return IssueCategory.syntaxError;
    }

    // Type-related errors
    if (_typeErrorCodes.contains(code)) {
      return IssueCategory.typeError;
    }

    // Null safety issues
    if (_nullSafetyCodes.contains(code)) {
      return IssueCategory.nullSafety;
    }

    // Unused code
    if (_unusedCodeCodes.contains(code)) {
      return IssueCategory.unusedCode;
    }

    // Performance issues
    if (_performanceCodes.contains(code)) {
      return IssueCategory.flutterPerformance;
    }

    // Flutter-specific codes
    if (_flutterCodes.contains(code)) {
      return _getFlutterCategory(code);
    }

    // Code quality/smell
    if (_codeSmellCodes.contains(code)) {
      return IssueCategory.codeSmell;
    }

    // Convention
    if (_conventionCodes.contains(code)) {
      return IssueCategory.convention;
    }

    // Try pattern matching in message
    return _categorizeByMessage(message);
  }

  /// Map Flutter-specific codes to their categories
  static IssueCategory _getFlutterCategory(String code) {
    return switch (code) {
      'avoid_setstate_in_build' => IssueCategory.flutterSetState,
      'avoid_returning_widgets_from_getters' => IssueCategory.flutterWidget,
      'use_key_in_widget_constructors' => IssueCategory.flutterWidgetKey,
      'use_build_context_synchronously' => IssueCategory.flutterAsyncGap,
      'avoid_build_context_in_async_gap' => IssueCategory.flutterAsyncGap,
      'sized_box_for_spacer' => IssueCategory.flutterWidget,
      'prefer_const_constructors' => IssueCategory.flutterMissingConst,
      'prefer_const_constructors_in_immutables' =>
        IssueCategory.flutterMissingConst,
      'prefer_const_literals_to_create_immutables' =>
        IssueCategory.flutterMissingConst,
      _ => IssueCategory.flutterIssue,
    };
  }

  /// Categorize based on message content if code is not recognized
  static IssueCategory _categorizeByMessage(String message) {
    final lowerMsg = message.toLowerCase();

    // Type errors
    if (lowerMsg.contains('type mismatch') ||
        lowerMsg.contains('is not assignable to') ||
        lowerMsg.contains('expected') && lowerMsg.contains('found')) {
      return IssueCategory.typeError;
    }

    // Null safety
    if (lowerMsg.contains('null') ||
        lowerMsg.contains('non-nullable') ||
        lowerMsg.contains('nullable')) {
      return IssueCategory.nullSafety;
    }

    // Unused
    if (lowerMsg.contains('unused') ||
        lowerMsg.contains('never used') ||
        lowerMsg.contains('not used')) {
      return IssueCategory.unusedCode;
    }

    // Performance
    if (lowerMsg.contains('rebuild') ||
        lowerMsg.contains('expensive') ||
        lowerMsg.contains('performance') ||
        lowerMsg.contains('slow')) {
      return IssueCategory.flutterPerformance;
    }

    // Flutter - setState
    if (lowerMsg.contains('setstate') || lowerMsg.contains('set state')) {
      return IssueCategory.flutterSetState;
    }

    // Flutter - dispose
    if (lowerMsg.contains('dispose') || lowerMsg.contains('not disposed')) {
      return IssueCategory.flutterDispose;
    }

    // Flutter - widgets
    if (lowerMsg.contains('widget') ||
        lowerMsg.contains('build') ||
        lowerMsg.contains('flutter')) {
      return IssueCategory.flutterWidget;
    }

    // Syntax
    if (lowerMsg.contains('syntax') ||
        lowerMsg.contains('unexpected') ||
        lowerMsg.contains('expected')) {
      return IssueCategory.syntaxError;
    }

    // Code smell
    if (lowerMsg.contains('complexity') ||
        lowerMsg.contains('too many') ||
        lowerMsg.contains('long method')) {
      return IssueCategory.codeSmell;
    }

    // Convention
    if (lowerMsg.contains('should') ||
        lowerMsg.contains('naming') ||
        lowerMsg.contains('convention')) {
      return IssueCategory.convention;
    }

    return IssueCategory.other;
  }

  /// Categorize based on source location patterns
  static IssueCategory categorizeByContext(
    SourceLocationIR location,
    String fileContent,
  ) {
    try {
      // Extract line content
      final lines = fileContent.split('\n');
      if (location.line <= 0 || location.line > lines.length) {
        return IssueCategory.other;
      }

      final line = lines[location.line - 1];

      // Check for setState in build
      if (line.contains('setState') && line.contains('build')) {
        return IssueCategory.flutterSetState;
      }

      // Check for missing dispose
      if (line.contains('Controller') || line.contains('StreamSubscription')) {
        return IssueCategory.flutterDispose;
      }

      // Check for explicit type conversions
      if (line.contains(' as ') || line.contains(' is ')) {
        return IssueCategory.typeError;
      }

      // Check for null coalescing
      if (line.contains('??')) {
        return IssueCategory.nullSafety;
      }

      // Check for long lines (code smell)
      if (line.length > 120) {
        return IssueCategory.codeSmell;
      }

      return IssueCategory.other;
    } catch (_) {
      return IssueCategory.other;
    }
  }

  /// Map multiple categorization strategies
  static IssueCategory categorize(AnalysisIssue issue, {String? fileContent}) {
    // Primary: by code
    var category = categorizeByCode(issue.code, issue.message);
    if (category != IssueCategory.other) {
      return category;
    }

    // Secondary: by message pattern
    category = _categorizeByMessage(issue.message);
    if (category != IssueCategory.other) {
      return category;
    }

    // Tertiary: by context (if file content available)
    if (fileContent != null) {
      category = categorizeByContext(issue.sourceLocation, fileContent);
      if (category != IssueCategory.other) {
        return category;
      }
    }

    return IssueCategory.other;
  }

  // =========================================================================
  // ERROR CODE MAPPINGS - Dart Analyzer codes
  // =========================================================================

  static const Set<String> _syntaxErrorCodes = {
    'syntax_error',
    'unexpected_token',
    'expected_token',
    'invalid_assignment',
    'missing_identifier',
    'mismatched_tag_definition',
    'unexpected_end_of_file',
  };

  static const Set<String> _typeErrorCodes = {
    'argument_type_not_assignable',
    'assignment_to_final',
    'invalid_assignment',
    'return_of_invalid_type',
    'wrong_number_of_type_arguments',
    'type_argument_not_matching_bounds',
    'incompatible_use_of_extension_on_value',
    'not_instantiated_bounded_type',
    'not_a_type',
    'type_test_with_unrelated_type',
  };

  static const Set<String> _nullSafetyCodes = {
    'null_aware_in_condition',
    'unnecessary_null_in_if_null_operator',
    'unnecessary_null_comparison',
    'always_null',
    'null_check_always_fails',
    'unnecessary_null_assert',
    'dead_null_aware_expression',
  };

  static const Set<String> _unusedCodeCodes = {
    'unused_import',
    'unused_element',
    'unused_label',
    'unused_local_variable',
    'unused_shown_name',
    'duplicate_import',
    'unnecessary_import',
  };

  static const Set<String> _performanceCodes = {
    'literal_only_boolean_expressions',
    'unnecessary_statements',
    'prefer_const_constructors',
    'prefer_const_constructors_in_immutables',
    'prefer_const_declarations',
    'prefer_const_literals_to_create_immutables',
    'unnecessary_list_literals_in_map_literal',
    'avoid_rebuilds_in_build',
  };

  static const Set<String> _flutterCodes = {
    'avoid_returning_widgets_from_getters',
    'avoid_setstate_in_build',
    'avoid_build_context_in_async_gap',
    'avoid_multiple_declarations_per_line',
    'sized_box_for_spacer',
    'use_key_in_widget_constructors',
    'use_build_context_synchronously',
  };

  static const Set<String> _codeSmellCodes = {
    'long_method',
    'too_many_parameters',
    'duplicated_code',
    'cyclomatic_complexity',
    'high_cognitive_complexity',
    'avoid_private_typedef_functions',
    'avoid_empty_else',
    'avoid_function_literals_in_foreach_calls',
  };

  static const Set<String> _conventionCodes = {
    'camel_case_types',
    'camel_case_extensions',
    'file_names',
    'library_names',
    'library_prefixes',
    'non_constant_identifier_names',
    'constant_identifier_names',
    'prefer_naming_convention',
  };
}
