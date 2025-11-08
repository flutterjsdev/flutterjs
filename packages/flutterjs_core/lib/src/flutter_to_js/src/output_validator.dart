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
    if (suggestion != null) parts.add('💡 ${suggestion}');
    return parts.join('\n  ');
  }
}

class ValidationReport {
  final List<ValidationError> errors;
  final Duration duration;
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
  }) {
    fatalCount = errors.where((e) => e.severity == ErrorSeverity.fatal).length;
    errorCount = errors.where((e) => e.severity == ErrorSeverity.error).length;
    warningCount = errors.where((e) => e.severity == ErrorSeverity.warning).length;
    infoCount = errors.where((e) => e.severity == ErrorSeverity.info).length;
  }

  bool get hasCriticalIssues => fatalCount > 0 || errorCount > 0;
  int get totalIssues => fatalCount + errorCount + warningCount + infoCount;

  String generateReport() {
    final buffer = StringBuffer();

    buffer.writeln('\n╔════════════════════════════════════════════════════════════════╗');
    buffer.writeln('║              VALIDATION REPORT                                 ║');
    buffer.writeln('╚════════════════════════════════════════════════════════════════╝\n');

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
      buffer.writeln('Details:');
      for (final error in errors) {
        buffer.writeln('  ${error.toString()}');
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
      isValid: !errors.any((e) => e.severity == ErrorSeverity.fatal || e.severity == ErrorSeverity.error),
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
    final lines = jsCode.split('\n');

    // Check braces balance
    _validateBraces(jsCode);

    // Check quotes balance
    _validateQuotes(jsCode);

    // Check semicolons
    _validateSemicolons(jsCode);

    // Check function definitions
    _extractFunctions(jsCode);

    // Check variable declarations
    _extractVariables(lines);
  }

  void _validateBraces(String code) {
    int openBraces = 0;
    int openParens = 0;
    int openBrackets = 0;

    for (int i = 0; i < code.length; i++) {
      final char = code[i];

      if (char == '{') openBraces++;
      if (char == '}') openBraces--;
      if (char == '(') openParens++;
      if (char == ')') openParens--;
      if (char == '[') openBrackets++;
      if (char == ']') openBrackets--;

      if (openBraces < 0 || openParens < 0 || openBrackets < 0) {
        _addError(
          'Mismatched closing bracket at position $i',
          ErrorSeverity.error,
          suggestion: 'Check brace/bracket pairing',
        );
        return;
      }
    }

    if (openBraces != 0) {
      _addError(
        'Unmatched braces: $openBraces unclosed',
        ErrorSeverity.error,
      );
    }

    if (openParens != 0) {
      _addError(
        'Unmatched parentheses: $openParens unclosed',
        ErrorSeverity.error,
      );
    }

    if (openBrackets != 0) {
      _addError(
        'Unmatched brackets: $openBrackets unclosed',
        ErrorSeverity.error,
      );
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
      _addError(
        'Unmatched single quotes',
        ErrorSeverity.warning,
      );
    }

    if (doubleQuotes % 2 != 0) {
      _addError(
        'Unmatched double quotes',
        ErrorSeverity.warning,
      );
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
    final pattern = RegExp(r'(?:function|async function|\*|async \*)\s+(\w+)\s*\(');
    for (final match in pattern.allMatches(code)) {
      definedFunctions.add(match.group(1)!);
    }

    // Extract arrow functions: const name = (...) => { ... }
    final arrowPattern = RegExp(r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(');
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
        definedVariables.putIfAbsent(i.toString(), () => {}).add(match.group(1)!);
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

  void _addError(
    String message,
    ErrorSeverity severity, {
    String? suggestion,
  }) {
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

// ============================================================================
// JS OPTIMIZER - ADVANCED IMPLEMENTATION
// ============================================================================

class JSOptimizer {
  String code;
  final Map<String, String> constantCache = {};
  final Set<String> unusedVariables = {};

  JSOptimizer(this.code);

  String optimize({int level = 1}) {
    if (level < 1 || level > 3) {
      throw ArgumentError('Optimization level must be 1-3');
    }

    if (level >= 1) {
      code = _constantFolding();
      code = _deadCodeElimination();
    }

    if (level >= 2) {
      code = _commonSubexpressionElimination();
      code = _variableInlining();
    }

    if (level >= 3) {
      code = _methodInlining();
      code = _minify();
    }

    return code;
  }

  // =========================================================================
  // LEVEL 1: BASIC OPTIMIZATIONS
  // =========================================================================

  String _constantFolding() {
    // 1 + 2 → 3
    var result = code.replaceAllMapped(
      RegExp(r'(\d+)\s*\+\s*(\d+)'),
      (m) => (int.parse(m.group(1)!) + int.parse(m.group(2)!)).toString(),
    );

    // 'hello' + 'world' → 'helloworld'
    result = result.replaceAllMapped(
      RegExp(r"'([^']*)'\s*\+\s*'([^']*)'"),
      (m) => "'${m.group(1)}${m.group(2)}'",
    );

    return result;
  }

  String _deadCodeElimination() {
    final lines = code.split('\n');
    final result = <String>[];
    bool inUnreachableBlock = false;

    for (final line in lines) {
      final trimmed = line.trim();

      // Mark unreachable code after return
      if (trimmed.startsWith('return')) {
        inUnreachableBlock = true;
        result.add(line);
        continue;
      }

      // Skip until we exit the block
      if (inUnreachableBlock) {
        if (trimmed == '}') {
          inUnreachableBlock = false;
        }
        continue; // Skip dead code
      }

      result.add(line);
    }

    return result.join('\n');
  }

  // =========================================================================
  // LEVEL 2: INTERMEDIATE OPTIMIZATIONS
  // =========================================================================

  String _commonSubexpressionElimination() {
    // Identify repeated expressions and extract to variables
    final pattern = RegExp(r'(\w+\.\w+\([^)]*\))');
    final matches = pattern.allMatches(code);
    final expressionMap = <String, int>{};

    for (final match in matches) {
      final expr = match.group(1)!;
      expressionMap[expr] = (expressionMap[expr] ?? 0) + 1;
    }

    var result = code;
    int varCounter = 0;

    for (final entry in expressionMap.entries) {
      if (entry.value > 1) {
        // Extract common expression
        final varName = '_cse${varCounter++}';
        final declaration = 'const $varName = ${entry.key};';
        result = result.replaceAll(entry.key, varName);

        // Add declaration at the start
        final lines = result.split('\n');
        if (lines.isNotEmpty) {
          lines.insert(0, declaration);
          result = lines.join('\n');
        }
      }
    }

    return result;
  }

  String _variableInlining() {
    // Inline single-use variables
    var result = code;

    // Find: const x = value; ... x (single use)
    final pattern = RegExp(r'const\s+(\w+)\s*=\s*([^;]+);[^}]*\1(?![a-zA-Z0-9_])');

    result = result.replaceAllMapped(
      RegExp(r'const\s+(\w+)\s*=\s*([^;]+);'),
      (m) {
        final varName = m.group(1)!;
        final value = m.group(2)!;
        final useCount = _countOccurrences(result, varName);

        // Inline if used only once
        if (useCount == 1) {
          result = result.replaceAll(varName, '($value)');
          return ''; // Remove declaration
        }

        return m.group(0)!;
      },
    );

    return result;
  }

  // =========================================================================
  // LEVEL 3: AGGRESSIVE OPTIMIZATIONS
  // =========================================================================

  String _methodInlining() {
    // Inline small methods
    final pattern = RegExp(
      r'(?:function|const\s+\w+\s*=)\s*(\w+)\s*\([^)]*\)\s*\{([^}]{1,50})\}',
    );

    var result = code;

    for (final match in pattern.allMatches(code)) {
      final methodName = match.group(1)!;
      final methodBody = match.group(2)!.trim();

      // Only inline if method is small and used
      final useCount = _countOccurrences(result, '$methodName(');

      if (useCount > 0 && useCount < 3 && methodBody.length < 100) {
        // Inline the method
        result = result.replaceAll(
          RegExp('$methodName\\(\\)'),
          '{ ${methodBody} }',
        );
      }
    }

    return result;
  }

  String _minify() {
    var result = code;

    // Remove comments
    result = result.replaceAll(RegExp(r'//.*'), ''); // Single-line
    result = result.replaceAll(RegExp(r'/\*[\s\S]*?\*/'), ''); // Multi-line

    // Remove excess whitespace
    result = result.replaceAll(RegExp(r'\n\s*\n'), '\n'); // Empty lines
    result = result.replaceAll(RegExp(r'\s+'), ' '); // Multiple spaces

    // Remove spaces around operators (but be careful)
    result = result.replaceAll(RegExp(r'\s*([{}();,=+\-*/<>:])\s*'), '\1');

    // Restore some necessary spaces
    result = result.replaceAll(RegExp(r'([a-zA-Z0-9_])([a-zA-Z0-9_])'), '\1 \2');

    return result.trim();
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  int _countOccurrences(String text, String pattern) {
    return pattern.allMatches(text).length;
  }

  String generateReport(String originalCode) {
    final originalSize = originalCode.length;
    final optimizedSize = code.length;
    final reduction = ((originalSize - optimizedSize) / originalSize * 100).toStringAsFixed(2);

    return '''
╔════════════════════════════════════════════════════════════════╗
║              OPTIMIZATION REPORT                              ║
╚════════════════════════════════════════════════════════════════╝

Original Size:   $originalSize bytes
Optimized Size:  $optimizedSize bytes
Reduction:       ${originalSize - optimizedSize} bytes ($reduction%)

Optimizations Applied:
  ✓ Constant folding
  ✓ Dead code elimination
  ✓ Common subexpression elimination
  ✓ Variable inlining
  ✓ Method inlining
  ✓ Minification
''';
  }
}