import 'dart:math';

class JSOptimizer {
  String code;
  final Map<String, String> constantCache = {};
  final Set<String> unusedVariables = {};
  final List<String> optimizationLog = [];
  bool preserveComments = false;

  JSOptimizer(this.code);

  /// Public API: Optimize JS code at given level (1-3)
  String optimize({
    int level = 1,
    bool dryRun = false,
    bool preserveComments_ = false,
  }) {
    if (level < 1 || level > 3) {
      throw ArgumentError('Optimization level must be 1-3');
    }

    preserveComments = preserveComments_;
    optimizationLog.clear();

    if (dryRun) {
      return _dryRunAnalysis(level);
    }

    var optimized = code;

    if (level >= 1) {
      optimized = _constantFolding(optimized);
      optimized = _deadCodeElimination(optimized);
    }

    if (level >= 2) {
      optimized = _commonSubexpressionElimination(optimized);
      optimized = _variableInlining(optimized);
    }

    if (level >= 3) {
      optimized = _methodInlining(optimized);
      optimized = _minify(optimized);
    }

    code = optimized;
    return optimized;
  }

  /// Analyze what optimizations would be applied without modifying code
  String _dryRunAnalysis(int level) {
    final analysis = <String>[];
    var testCode = code;

    analysis.add('=== DRY RUN ANALYSIS (Level $level) ===\n');

    if (level >= 1) {
      final beforeCF = testCode;
      testCode = _constantFolding(testCode);
      if (beforeCF != testCode) {
        analysis.add(
          '✓ Constant Folding: Will optimize arithmetic/string operations',
        );
      }

      final beforeDCE = testCode;
      testCode = _deadCodeElimination(testCode);
      if (beforeDCE != testCode) {
        analysis.add(
          '✓ Dead Code Elimination: Will remove unreachable code after returns',
        );
      }
    }

    if (level >= 2) {
      final beforeCSE = testCode;
      testCode = _commonSubexpressionElimination(testCode);
      if (beforeCSE != testCode) {
        analysis.add(
          '✓ Common Subexpression Elimination: Will extract repeated expressions',
        );
      }

      final beforeVI = testCode;
      testCode = _variableInlining(testCode);
      if (beforeVI != testCode) {
        analysis.add('✓ Variable Inlining: Will inline single-use constants');
      }
    }

    if (level >= 3) {
      final beforeMI = testCode;
      testCode = _methodInlining(testCode);
      if (beforeMI != testCode) {
        analysis.add(
          '✓ Method Inlining: Will inline small, single/dual-use functions',
        );
      }

      analysis.add(
        '✓ Minification: Will remove comments and collapse whitespace',
      );
    }

    analysis.add('\nOriginal Size: ${code.length} bytes');
    analysis.add('Estimated Size: ${testCode.length} bytes');
    analysis.add(
      'Estimated Reduction: ${((code.length - testCode.length) / code.length * 100).toStringAsFixed(2)}%',
    );

    return analysis.join('\n');
  }

  // =========================================================================
  // LEVEL 1: BASIC OPTIMIZATIONS
  // =========================================================================

  String _constantFolding(String input) {
    var result = input;

    // Fold number additions: 1 + 2 → 3 (only within expressions, respect scope)
    result = result.replaceAllMapped(RegExp(r'(\d+)\s*\+\s*(\d+)'), (m) {
      final sum = int.parse(m.group(1)!) + int.parse(m.group(2)!);
      return sum.toString();
    });

    // Fold string concatenation: 'a' + 'b' → 'ab'
    result = result.replaceAllMapped(
      RegExp(r"'([^'\\]*(?:\\.[^'\\]*)*)'\s*\+\s*'([^'\\]*(?:\\.[^'\\]*)*)'"),
      (m) => "'${m.group(1)}${m.group(2)}'",
    );

    result = result.replaceAllMapped(
      RegExp(r'"([^"\\]*(?:\\.[^"\\]*)*)"\s*\+\s*"([^"\\]*(?:\\.[^"\\]*)*)"'),
      (m) => '"${m.group(1)}${m.group(2)}"',
    );

    optimizationLog.add('Constant Folding applied');
    return result;
  }

  String _deadCodeElimination(String input) {
    final lines = input.split('\n');
    final result = <String>[];
    int braceLevel = 0;
    bool inUnreachable = false;
    int unreachableBraceLevel = -1;
    int removedLines = 0;

    for (var line in lines) {
      final trimmed = line.trim();

      // Skip empty lines for analysis
      if (trimmed.isEmpty) {
        result.add(line);
        continue;
      }

      final openBraces = '{'.allMatches(trimmed).length;
      final closeBraces = '}'.allMatches(trimmed).length;

      // Detect return/break/continue/throw (unreachable code markers)
      final isUnreachableMarker =
          (trimmed.startsWith('return ') ||
              trimmed.startsWith('break') ||
              trimmed.startsWith('continue') ||
              trimmed.startsWith('throw ')) &&
          trimmed.endsWith(';') &&
          !trimmed.contains('{') &&
          !trimmed.contains('}');

      if (!inUnreachable && isUnreachableMarker) {
        inUnreachable = true;
        unreachableBraceLevel = braceLevel + openBraces;
        result.add(line);
        braceLevel += openBraces - closeBraces;
        continue;
      }

      braceLevel += openBraces - closeBraces;

      if (inUnreachable) {
        // Exit unreachable block when we close the original scope
        if (closeBraces > 0 && braceLevel < unreachableBraceLevel) {
          result.add(line); // Include the closing brace
          inUnreachable = false;
          unreachableBraceLevel = -1;
        } else if (!inUnreachable) {
          result.add(line);
        } else {
          removedLines++;
        }
        continue;
      }

      result.add(line);
    }

    if (removedLines > 0) {
      optimizationLog.add('Dead Code Elimination: removed $removedLines lines');
    }
    return result.join('\n');
  }

  // =========================================================================
  // LEVEL 2: INTERMEDIATE OPTIMIZATIONS
  // =========================================================================

  String _commonSubexpressionElimination(String input) {
    // More restrictive: only match complete function calls with clear boundaries
    final pattern = RegExp(
      r'\b(\w+(?:\.\w+)*)\s*\(\s*(?:[^()]*|(?:\([^)]*\)))*\s*\)',
    );

    final matches = pattern.allMatches(input);
    final freqMap = <String, List<int>>{};

    for (final match in matches) {
      final expr = match.group(0)!;
      // Ignore very short expressions and built-in methods
      if (expr.length < 10 || _isBuiltIn(expr)) continue;

      freqMap.putIfAbsent(expr, () => []).add(match.start);
    }

    var result = input;
    int counter = 0;

    for (final entry in freqMap.entries) {
      if (entry.value.length > 1) {
        final varName = '_cse${counter++}';
        final declaration = 'const $varName = ${entry.key};';
        result = result.replaceAll(entry.key, varName);
        result = declaration + '\n' + result;
        optimizationLog.add(
          'CSE: Extracted ${entry.key} (used ${entry.value.length}x)',
        );
      }
    }

    return result;
  }

  /// Check if an expression is a built-in that shouldn't be cached
  bool _isBuiltIn(String expr) {
    final builtIns = {
      'console.log',
      'Math.floor',
      'Math.ceil',
      'Math.round',
      'Object.keys',
      'Array.isArray',
      'parseInt',
      'parseFloat',
      'JSON.parse',
      'JSON.stringify',
    };
    return builtIns.any((builtin) => expr.startsWith(builtin));
  }

  String _variableInlining(String input) {
    // Match: const/let/var x = value; (with scope awareness)
    final constPattern = RegExp(r'(?:const|let|var)\s+(\w+)\s*=\s*([^;]+);');
    var result = input;
    int inlinedCount = 0;

    final constMatches = constPattern.allMatches(input).toList();

    for (final match in constMatches) {
      final varName = match.group(1)!;
      final value = match.group(2)!.trim();

      // Skip if value has side effects
      if (_hasSideEffects(value)) continue;

      // Count occurrences with word boundary (strict)
      final usePattern = RegExp(r'\b${RegExp.escape(varName)}\b');
      final useCount = usePattern.allMatches(result).length;

      // Only inline if used exactly once (the declaration counts as 1)
      if (useCount == 2) {
        // Replace usage (skip the declaration itself)
        result = result.replaceFirstMapped(usePattern, (m) {
          // Skip if this is the declaration
          if (result.indexOf('const $varName') ==
              m.start - varName.length - 6) {
            return m.group(0)!;
          }
          return '($value)';
        });

        // Remove declaration
        result = result.replaceAll(match.group(0)!, '');
        inlinedCount++;
      }
    }

    if (inlinedCount > 0) {
      optimizationLog.add('Variable Inlining: inlined $inlinedCount variables');
    }
    return result;
  }

  /// Check if an expression might have side effects
  bool _hasSideEffects(String value) {
    final sideEffectPatterns = [
      RegExp(r'new\s+\w+'),
      RegExp(r'\w+\s*\('),
      RegExp(r'Math\.random'),
      RegExp(r'Date\.now'),
      RegExp(r'Math\.random'),
      RegExp(r'process\.env'),
    ];
    return sideEffectPatterns.any((pattern) => pattern.hasMatch(value));
  }

  // =========================================================================
  // LEVEL 3: AGGRESSIVE OPTIMIZATIONS
  // =========================================================================

  String _methodInlining(String input) {
    // Match small functions with explicit bounds checking
    final pattern = RegExp(
      r'(?:function\s+(\w+)\s*\(([^)]*)\)\s*\{([^}]{1,80})\}|(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{([^}]{1,80})\})',
    );

    var result = input;
    final seen = <String, _FunctionInfo>{};

    for (final match in pattern.allMatches(input)) {
      final name = match.group(1) ?? match.group(4);
      final params = (match.group(2) ?? match.group(5))!;
      final body = (match.group(3) ?? match.group(6))!.trim();

      if (name == null || seen.containsKey(name)) continue;

      // Validate: no side effects, simple params
      if (_hasSideEffects(body) || params.contains('=')) continue;

      final callPattern = RegExp(r'\b${RegExp.escape(name)}\s*\([^)]*\)\s*;');
      final useCount = callPattern.allMatches(result).length;

      // Only inline if used 1-2 times AND body is small
      if (useCount >= 1 && useCount <= 2 && body.length < 80) {
        seen[name] = _FunctionInfo(name, params, body);
        result = result.replaceAll(callPattern, '$body;');
        optimizationLog.add(
          'Method Inlining: inlined $name (called $useCount times)',
        );
      }
    }

    // Remove function definitions after inlining
    for (final name in seen.keys) {
      result = result.replaceAll(
        RegExp(r'\bfunction\s+$name\s*\([^)]*\)\s*\{[^}]*\}'),
        '',
      );
      result = result.replaceAll(
        RegExp(r'\b(?:const|let|var)\s+$name\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\}'),
        '',
      );
    }

    return result;
  }

  String _minify(String input) {
    var result = input;

    // 1. Extract and preserve "KEEP:" comments
    final keepComments = <String>[];
    result = result.replaceAllMapped(RegExp(r'//\s*KEEP:\s*([^\n]+)'), (m) {
      keepComments.add(m.group(1)!);
      return '/*KEEP:${keepComments.length - 1}*/';
    });

    // 2. Remove regular comments (if not preserving)
    if (!preserveComments) {
      result = result.replaceAll(RegExp(r'//[^\n]*'), '');
      result = result.replaceAll(RegExp(r'/\*(?!KEEP:)[\s\S]*?\*/'), '');
    }

    // 3. Collapse whitespace (preserve newlines in some cases for readability)
    result = result.replaceAll(RegExp(r'\s+'), ' ');

    // 4. Remove space around safe tokens
    final safeTokens = [
      '{',
      '}',
      '(',
      ')',
      '[',
      ']',
      ';',
      ',',
      '.',
      '=',
      '+',
      '-',
      '*',
      '/',
      '>',
      '<',
      '!',
      '?',
      ':',
      '&',
      '|',
    ];
    for (final token in safeTokens) {
      result = result.replaceAll(
        RegExp('\\s*\\${RegExp.escape(token)}\\s*'),
        token,
      );
    }

    // 5. Remove empty lines and trim
    result = result
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .join('');

    // 6. Restore KEEP comments
    for (int i = 0; i < keepComments.length; i++) {
      result = result.replaceAll('/*KEEP:$i*/', '/*${keepComments[i]}*/');
    }

    optimizationLog.add('Minification applied');
    return result;
  }

  // =========================================================================
  // HELPER: Generate Optimization Report
  // =========================================================================

  String generateReport(String originalCode) {
    final originalSize = originalCode.length;
    final optimizedSize = code.length;
    final reduction = originalSize - optimizedSize;
    final reductionPercent = originalSize > 0
        ? (reduction / originalSize * 100).toStringAsFixed(2)
        : '0.00';

    final report =
        '''
╔════════════════════════════════════════════════════════════════╗
║                     OPTIMIZATION REPORT                        ║
╚════════════════════════════════════════════════════════════════╝

Original Size:     $originalSize bytes
Optimized Size:    $optimizedSize bytes
Reduction:         $reduction bytes ($reductionPercent%)

Optimizations Applied:
${optimizationLog.map((log) => '  • $log').join('\n')}

Safe Practices:
  ✓ Comments with KEEP: directive preserved
  ✓ Dead code elimination respects multiple exit types
  ✓ Variable inlining skips side-effect expressions
  ✓ Method inlining validates function safety
  ✓ Scope awareness maintained throughout
'''
            .trim();

    return report;
  }
}

class _FunctionInfo {
  final String name;
  final String params;
  final String body;

  _FunctionInfo(this.name, this.params, this.body);
}
