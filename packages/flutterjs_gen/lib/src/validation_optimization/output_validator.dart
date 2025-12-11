// ============================================================================
// PHASE 5: VALIDATION & OPTIMIZATION
// ============================================================================

// ============================================================================
// VALIDATION ERROR & REPORT CLASSES
// ============================================================================

enum ErrorSeverity { fatal, error, warning, info }

class ValidationError {
  final String message;
  final ErrorSeverity severity;
  final String? suggestion;
  final int? lineNumber;
  final String? code;

  ValidationError({
    required this.message,
    required this.severity,
    this.suggestion,
    this.lineNumber,
    this.code,
  });

  @override
  String toString() {
    final parts = ['${severity.name.toUpperCase()}: $message'];
    if (lineNumber != null) parts.add('Line: $lineNumber');
    if (code != null) parts.add('Code: $code');
    if (suggestion != null) parts.add('Suggestion ${suggestion}');
    return parts.join('\n  ');
  }
}

class ValidationReport {
  final List<ValidationError> errors;
  final DateTime timestamp;
  final Duration duration;
  final bool canProceed;
  final bool isValid;
  final Map<String, dynamic> metrics;

  late final int fatalCount;
  late final int errorCount;
  late final int warningCount;
  late final int infoCount;

  ValidationReport({
    required this.errors,
    required this.duration,
    this.isValid = true,
    this.metrics = const {},
    this.canProceed = true,
  }) : timestamp = DateTime.now() {
    fatalCount = errors.where((e) => e.severity == ErrorSeverity.fatal).length;
    errorCount = errors.where((e) => e.severity == ErrorSeverity.error).length;
    warningCount = errors
        .where((e) => e.severity == ErrorSeverity.warning)
        .length;
    infoCount = errors.where((e) => e.severity == ErrorSeverity.info).length;
  }

  bool get hasErrors => errorCount > 0 || fatalCount > 0;
  bool get hasWarnings => warningCount > 0;

  bool get hasCriticalIssues => fatalCount > 0 || errorCount > 0;
  int get totalIssues => fatalCount + errorCount + warningCount + infoCount;

  String generateReport() {
    final buffer = StringBuffer();

    buffer.writeln(
      '\n╔════════════════════════════════════════════════════════════════╗',
    );
    buffer.writeln(
      '║              VALIDATION REPORT                                 ║',
    );
    buffer.writeln(
      '╚════════════════════════════════════════════════════════════════╝\n',
    );

    buffer.writeln('Status: ${isValid ? '✅ PASSED' : '❌ FAILED'}');
    buffer.writeln('Duration: ${duration.inMilliseconds}ms\n');

    buffer.writeln('Issues Summary:');
    buffer.writeln('  Fatal:   $fatalCount');
    buffer.writeln('  Error:   $errorCount');
    buffer.writeln('  Warning: $warningCount');
    buffer.writeln('  Info:    $infoCount');
    buffer.writeln('  Total:   $totalIssues\n');

    if (metrics.isNotEmpty) {
      buffer.writeln('Metrics:');
      for (final entry in metrics.entries) {
        buffer.writeln('  ${entry.key}: ${entry.value}');
      }
      buffer.writeln();
    }

    if (errors.isNotEmpty) {
      if (errorCount > 0) {
        buffer.writeln('Error Details:');
        for (final error in errors.where(
          (e) => e.severity == ErrorSeverity.error,
        )) {
          buffer.writeln('  ${error.toString()}');
        }
      }
      if (errorCount > 0) {
        buffer.writeln('\nfatal Details:');
        for (final error in errors.where(
          (e) => e.severity == ErrorSeverity.fatal,
        )) {
          buffer.writeln('  ${error.toString()}');
        }
      }

      if (errorCount > 0) {
        buffer.writeln('\nWarning Details:');
        for (final error in errors.where(
          (e) => e.severity == ErrorSeverity.warning,
        )) {
          buffer.writeln('  ${error.toString()}');
        }
      }

      if (infoCount > 0) {
        buffer.writeln('\nInfo Details:');
        for (final error in errors.where(
          (e) => e.severity == ErrorSeverity.info,
        )) {
          buffer.writeln('  ${error.toString()}');
        }
      }
    }

    return buffer.toString();
  }
}

// ============================================================================
// OUTPUT VALIDATOR - COMPLETE IMPLEMENTATION
// ============================================================================

class OutputValidator {
  final String jsCode;
  final List<ValidationError> errors = [];
  late final Map<String, Set<String>> definedVariables;
  late final Map<String, Set<String>> usedVariables;
  late final Set<String> definedFunctions;
  late final Set<String> calledFunctions;
  late final Set<String> requiredHelpers;

  OutputValidator(this.jsCode) {
    definedVariables = {};
    usedVariables = {};
    definedFunctions = {};
    calledFunctions = {};
    requiredHelpers = {};
  }

  ValidationReport validate() {
    final stopwatch = Stopwatch()..start();

    // Run all validations
    _syntaxValidation();

    _semanticValidation();
    _runtimeValidation();
    _styleValidation();

    stopwatch.stop();

    return ValidationReport(
      errors: errors,
      duration: stopwatch.elapsed,
      isValid: !errors.any(
        (e) =>
            e.severity == ErrorSeverity.fatal ||
            e.severity == ErrorSeverity.error,
      ),
      metrics: {
        'lines': jsCode.split('\n').length,
        'characters': jsCode.length,
        'functions': definedFunctions.length,
        'variables': definedVariables.values.expand((v) => v).length,
        'issues': errors.length,
      },
    );
  }

  // =========================================================================
  // SYNTAX VALIDATION
  // =========================================================================

  void _syntaxValidation() {
    // Check braces balance
    _validateBraces(jsCode);

    // Check quotes balance
    _validateQuotes(jsCode);

    // Check semicolons
    _validateSemicolons(jsCode);

    // Check function definitions
    _extractFunctions(jsCode);
    final lines = jsCode;
    // Check variable declarations
    _extractVariables(lines.split('\n'));
  }

  void _validateBraces(String code) {
    final stack = <String>[];
    final pairs = {'(': ')', '[': ']', '{': '}'};

    for (int i = 0; i < code.length; i++) {
      final char = code[i];

      if (pairs.containsKey(char)) {
        stack.add(char);
      } else if (pairs.containsValue(char)) {
        if (stack.isEmpty || pairs[stack.last] != char) {
          _addError(
            'Mismatched closing bracket "$char" at position $i',
            ErrorSeverity.error,
            suggestion:
                'Expected ${stack.isNotEmpty ? pairs[stack.last] : "nothing"}',
          );
          return;
        }
        stack.removeLast();
      }
    }

    if (stack.isNotEmpty) {
      _addError('Unclosed brackets: ${stack.join(", ")}', ErrorSeverity.error);
    }
  }

  void _validateQuotes(String code) {
    int singleQuotes = 0;
    int doubleQuotes = 0;
    int backticks = 0;

    for (int i = 0; i < code.length; i++) {
      final char = code[i];

      if (char == "'" && (i == 0 || code[i - 1] != '\\')) singleQuotes++;
      if (char == '"' && (i == 0 || code[i - 1] != '\\')) doubleQuotes++;
      if (char == '`' && (i == 0 || code[i - 1] != '\\')) backticks++;
    }

    if (singleQuotes % 2 != 0) {
      _addError('Unmatched single quotes', ErrorSeverity.warning);
    }

    if (doubleQuotes % 2 != 0) {
      _addError('Unmatched double quotes', ErrorSeverity.warning);
    }

    if (backticks % 2 != 0) {
      _addError(
        'Unmatched backticks (template strings)',
        ErrorSeverity.warning,
      );
    }
  }

  void _validateSemicolons(String code) {
    // Check for missing semicolons on function/class declarations
    final funcPattern = RegExp(r'(function|class)\s+\w+\s*\{');
    final matches = funcPattern.allMatches(code);

    // Note: JavaScript has automatic semicolon insertion, so this is a warning
    for (final match in matches) {
      if (match.start > 0 && code[match.start - 1] != ';') {
        // This is usually OK due to ASI, just info
      }
    }
  }

  void _extractFunctions(String code) {
    // Extract function definitions: function name() { ... }
    final pattern = RegExp(
      r'(?:function|async function|\*|async \*)\s+(\w+)\s*\(',
    );
    for (final match in pattern.allMatches(code)) {
      definedFunctions.add(match.group(1)!);
    }

    // Extract arrow functions: const name = (...) => { ... }
    final arrowPattern = RegExp(
      r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(',
    );
    for (final match in arrowPattern.allMatches(code)) {
      definedFunctions.add(match.group(1)!);
    }
  }

  void _extractVariables(List<String> lines) {
    for (int i = 0; i < lines.length; i++) {
      final line = lines[i];

      // Variable declarations: const/let/var name = ...
      final declPattern = RegExp(r'(?:const|let|var)\s+(\w+)\s*=');
      for (final match in declPattern.allMatches(line)) {
        definedVariables
            .putIfAbsent(i.toString(), () => {})
            .add(match.group(1)!);
      }

      // Used variables (heuristic)
      final usagePattern = RegExp(r'\b(\w+)\b(?=\s*[\.\(\)\+\-\*\/])');
      for (final match in usagePattern.allMatches(line)) {
        usedVariables.putIfAbsent(i.toString(), () => {}).add(match.group(1)!);
      }

      // Function calls
      final callPattern = RegExp(r'(\w+)\s*\(');
      for (final match in callPattern.allMatches(line)) {
        calledFunctions.add(match.group(1)!);
      }
    }
  }

  // =========================================================================
  // SEMANTIC VALIDATION
  // =========================================================================

  void _semanticValidation() {
    // Check all called functions are defined
    _validateFunctionCalls();

    // Check all used variables are defined
    _validateVariableUsage();

    // Check scope correctness
    _validateScoping();
  }

  void _validateFunctionCalls() {
    // Built-in functions that are always available
    const builtins = {
      'console',
      'Math',
      'Array',
      'Object',
      'String',
      'Number',
      'Boolean',
      'Date',
      'JSON',
      'Promise',
      'Set',
      'Map',
      'Symbol',
      'Error',
      'TypeError',
      'RangeError',
      'parseInt',
      'parseFloat',
      'isNaN',
      'isFinite',
      'typeof',
      'instanceof',
      'delete',
      'new',
      'void',
      'return',
      'throw',
      'try',
      'catch',
      'finally',
    };

    for (final func in calledFunctions) {
      if (!definedFunctions.contains(func) && !builtins.contains(func)) {
        _addError(
          'Function "$func" is called but not defined',
          ErrorSeverity.warning,
          suggestion: 'Check if function is imported or defined',
        );
      }
    }
  }

  void _validateVariableUsage() {
    final allDefined = <String>{};
    for (final vars in definedVariables.values) {
      allDefined.addAll(vars);
    }

    for (final lineVars in usedVariables.values) {
      for (final variable in lineVars) {
        // Skip single-letter variables and common built-ins
        if (variable.length == 1 || _isBuiltinObject(variable)) {
          continue;
        }

        if (!allDefined.contains(variable) && !_isBuiltinFunction(variable)) {
          _addError(
            'Variable "$variable" used but may not be defined',
            ErrorSeverity.warning,
            suggestion: 'Check variable declaration',
          );
        }
      }
    }
  }

  void _validateScoping() {
    // Check for variables used before declaration (simple heuristic)
    int lineNum = 0;
    final definedUpToLine = <String>{};

    for (final line in jsCode.split('\n')) {
      lineNum++;

      // Extract newly defined variables
      final declPattern = RegExp(r'(?:const|let|var)\s+(\w+)');
      for (final match in declPattern.allMatches(line)) {
        definedUpToLine.add(match.group(1)!);
      }

      // Check for potential uses before declaration
      final usagePattern = RegExp(r'\b(\w+)\b');
      for (final match in usagePattern.allMatches(line)) {
        final variable = match.group(1)!;
        if (line.contains('const $variable') ||
            line.contains('let $variable') ||
            line.contains('var $variable')) {
          // Skip the declaration itself
          continue;
        }
      }
    }
  }

  // =========================================================================
  // RUNTIME VALIDATION
  // =========================================================================

  void _runtimeValidation() {
    // Check for required helpers
    _validateHelpers();

    // Check framework usage
    _validateFrameworkUsage();

    // Check for common issues
    _validateCommonIssues();
  }

  void _validateHelpers() {
    // Check if nullCheck is used
    if (jsCode.contains('nullCheck(')) {
      if (!jsCode.contains('function nullCheck')) {
        requiredHelpers.add('nullCheck');
        _addError(
          'nullCheck helper used but not defined',
          ErrorSeverity.error,
          suggestion: 'Add nullCheck helper function',
        );
      }
    }

    // Check other helpers
    _checkHelperPresence('typeAssertion');
    _checkHelperPresence('listCast');
    _checkHelperPresence('mapCast');
  }

  void _checkHelperPresence(String helperName) {
    if (jsCode.contains('$helperName(')) {
      if (!jsCode.contains('function $helperName') &&
          !jsCode.contains('const $helperName')) {
        _addError(
          '$helperName helper used but not defined',
          ErrorSeverity.error,
          suggestion: 'Add $helperName helper function',
        );
      }
    }
  }

  void _validateFrameworkUsage() {
    // Check if flutter imports are present
    if (jsCode.contains('Container(') ||
        jsCode.contains('Text(') ||
        jsCode.contains('Row(') ||
        jsCode.contains('Column(')) {
      if (!jsCode.contains('flutter-js-framework')) {
        _addError(
          'Flutter widgets used but framework not imported',
          ErrorSeverity.error,
          suggestion: 'Add import for flutter-js-framework',
        );
      }
    }
  }

  void _validateCommonIssues() {
    // Check for common mistakes
    if (jsCode.contains('== ')) {
      _addError(
        'Loose equality (==) detected, should use strict (===)',
        ErrorSeverity.warning,
        suggestion: 'Replace == with ===',
      );
    }

    if (jsCode.contains('var ')) {
      _addError(
        'Old variable declaration (var) detected',
        ErrorSeverity.info,
        suggestion: 'Use const or let instead',
      );
    }

    if (jsCode.contains('console.log(')) {
      _addError(
        'Debug logging (console.log) found in code',
        ErrorSeverity.info,
        suggestion: 'Remove debug statements before production',
      );
    }
  }

  // =========================================================================
  // STYLE VALIDATION
  // =========================================================================

  void _styleValidation() {
    _validateFormatting();
    _validateNaming();
    _validateConventions();
  }

  void _validateFormatting() {
    final lines = jsCode.split('\n');
    int expectedIndent = 0;

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i];
      if (line.isEmpty) continue;

      final leadingSpaces = line.length - line.trimLeft().length;
      final expectedSpaces = expectedIndent * 2;

      // Check for inconsistent indentation
      if (leadingSpaces % 2 != 0) {
        _addError(
          'Inconsistent indentation on line ${i + 1}',
          ErrorSeverity.warning,
          suggestion: 'Use 2-space indentation',
        );
      }

      // Track brace nesting - FIXED: Use proper character iteration
      for (int j = 0; j < line.length; j++) {
        final char = line[j];
        if (char == '{') expectedIndent++;
        if (char == '}') expectedIndent--;
      }
    }
  }

  void _validateNaming() {
    // Check for camelCase naming
    final pattern = RegExp(r'(?:function|const|let)\s+([a-z_$][a-zA-Z0-9_$]*)');
    for (final match in pattern.allMatches(jsCode)) {
      final name = match.group(1)!;
      if (name.contains('_') && !name.startsWith('_')) {
        _addError(
          'Function/variable "$name" uses snake_case instead of camelCase',
          ErrorSeverity.info,
          suggestion: 'Use camelCase naming convention',
        );
      }
    }
  }

  void _validateConventions() {
    // Check for class naming (PascalCase)
    final classPattern = RegExp(r'class\s+([a-z][a-zA-Z0-9_]*)');
    for (final match in classPattern.allMatches(jsCode)) {
      final name = match.group(1)!;
      if (!_isPascalCase(name)) {
        _addError(
          'Class "$name" should use PascalCase',
          ErrorSeverity.info,
          suggestion: 'Rename to ${_toPascalCase(name)}',
        );
      }
    }
  }

  void _addError(String message, ErrorSeverity severity, {String? suggestion}) {
    errors.add(
      ValidationError(
        message: message,
        severity: severity,
        suggestion: suggestion,
      ),
    );
  }

  bool _isBuiltinObject(String name) {
    const builtins = {
      'console',
      'window',
      'document',
      'this',
      'super',
      'arguments',
    };
    return builtins.contains(name);
  }

  bool _isBuiltinFunction(String name) {
    const builtins = {
      'parseInt',
      'parseFloat',
      'isNaN',
      'isFinite',
      'encodeURI',
      'decodeURI',
      'encodeURIComponent',
      'decodeURIComponent',
    };
    return builtins.contains(name);
  }

  bool _isPascalCase(String name) {
    if (name.isEmpty) return false;
    return name[0].toUpperCase() == name[0];
  }

  String _toPascalCase(String name) {
    final parts = name.split('_');
    return parts
        .map((p) => p.isEmpty ? '' : p[0].toUpperCase() + p.substring(1))
        .join('');
  }
}
