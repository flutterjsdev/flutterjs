// ============================================================================
// CODE FORMATTING
// ============================================================================

import 'utils/generator_config.dart';

class CodeFormatter {
  final GeneratorConfig config;

  CodeFormatter({required this.config});

  /// Complete code formatting pipeline
  String formatComplete(String code) {
    code = _normalizeLineBreaks(code);
    code = _fixIndentation(code);
    code = _addSpacing(code);
    code = _formatBraces(code);
    code = _trimExtraBlankLines(code);
    return code;
  }

  /// Normalize line breaks to \n
  String _normalizeLineBreaks(String code) {
    return code.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  }

  /// Fix indentation based on braces
  String _fixIndentation(String code) {
    final lines = code.split('\n');
    final result = <String>[];
    int indent = 0;

    for (final line in lines) {
      final trimmed = line.trim();

      // Decrease indent for closing braces
      if (trimmed.startsWith('}') ||
          trimmed.startsWith(']') ||
          trimmed.startsWith(')')) {
        indent = (indent - 1).clamp(0, indent);
      }

      // Write line with proper indentation
      if (trimmed.isNotEmpty) {
        final indentStr = ' ' * (indent * config.indentSpaces);
        result.add('$indentStr$trimmed');
      } else {
        result.add('');
      }

      // Increase indent for opening braces
      if (trimmed.endsWith('{') || trimmed.endsWith('[')) {
        indent++;
      }
    }

    return result.join('\n');
  }

  /// Add spacing around keywords and operators
  String _addSpacing(String code) {
    var result = code;

    // Add space after keywords before parentheses
    final keywords = [
      'if',
      'for',
      'while',
      'switch',
      'catch',
      'function',
      'return',
    ];
    for (final keyword in keywords) {
      result = result.replaceAllMapped(
        RegExp('$keyword\\('),
        (m) => '$keyword (',
      );
    }

    // Add spaces around binary operators (but not in strings/comments)
    result = result.replaceAllMapped(
      RegExp(r'([^\s=!<>+\-*/%&|^])(=)([^=])'),
      (m) => '${m.group(1)} ${m.group(2)} ${m.group(3)}',
    );

    // Add space before opening braces
    result = result.replaceAll(RegExp(r'([^\s])\{'), r'$1 {');

    return result;
  }

  /// Format braces: opening { on same line, closing } on new line
  String _formatBraces(String code) {
    var result = code;

    // Ensure closing brace on new line
    result = result.replaceAllMapped(
      RegExp(r'([^\n])\}'),
      (m) => '${m.group(1)}\n}',
    );

    // Ensure opening brace on same line (don't move to new line)
    // This is already handled by our formatting

    return result;
  }

  /// Remove extra blank lines (keep max 1)
  String _trimExtraBlankLines(String code) {
    return code.replaceAll(RegExp(r'\n\n\n+'), '\n\n');
  }

  /// Check if a line is too long and needs splitting
  bool isLineTooLong(String line) {
    return line.length > config.maxLineLength;
  }

  /// Split a long line if needed
  List<String> splitLongLine(String line) {
    if (!isLineTooLong(line)) {
      return [line];
    }

    final parts = <String>[];
    var current = '';

    final tokens = line.split(' ');
    for (final token in tokens) {
      if ((current + ' ' + token).length > config.maxLineLength &&
          current.isNotEmpty) {
        parts.add(current);
        current = token;
      } else {
        current = current.isEmpty ? token : '$current $token';
      }
    }

    if (current.isNotEmpty) {
      parts.add(current);
    }

    return parts;
  }
}

// ============================================================================
// LINE BUILDER (for constructing lines with proper formatting)
// ============================================================================

class LineBuilder {
  final StringBuffer buffer = StringBuffer();
  final GeneratorConfig config;
  int indentLevel;

  LineBuilder({required this.config, this.indentLevel = 0});

  void indent() => indentLevel++;
  void dedent() => indentLevel = (indentLevel - 1).clamp(0, indentLevel);

  String getIndent() => ' ' * (indentLevel * config.indentSpaces);

  void write(String text) {
    buffer.write(text);
  }

  void writeln(String text) {
    buffer.write(getIndent());
    buffer.writeln(text);
    if (config.useSemicolons &&
        !text.endsWith(';') &&
        !text.endsWith('{') &&
        !text.endsWith('}')) {
      // Add semicolon if not already present and not a block statement
    }
  }

  void writeBlock(String declaration, Function(LineBuilder) body) {
    writeln('$declaration {');
    indent();
    body(this);
    dedent();
    writeln('}');
  }

  void writeBrackets(String name, List<String> items) {
    if (items.isEmpty) {
      writeln('$name: []');
      return;
    }

    writeln('$name: [');
    indent();
    for (int i = 0; i < items.length; i++) {
      final comma = i < items.length - 1 ? ',' : '';
      writeln('${items[i]}$comma');
    }
    dedent();
    writeln(']');
  }

  void writeObject(String name, Map<String, String> properties) {
    if (properties.isEmpty) {
      writeln('$name: {}');
      return;
    }

    writeln('$name: {');
    indent();
    final entries = properties.entries.toList();
    for (int i = 0; i < entries.length; i++) {
      final entry = entries[i];
      final comma = i < entries.length - 1 ? ',' : '';
      writeln('${entry.key}: ${entry.value}$comma');
    }
    dedent();
    writeln('}');
  }

  String build() => buffer.toString();
}

// ============================================================================
// GENERATOR UTILITIES (Mixin for reusable methods)
// ============================================================================

mixin GeneratorUtilities {
  /// Check if string is a JavaScript keyword or reserved word
  static bool isJSKeyword(String word) {
    const keywords = {
      // Keywords
      'abstract',
      'arguments',
      'await',
      'boolean',
      'break',
      'byte',
      'case',
      'catch',
      'char',
      'class',
      'const',
      'continue',
      'debugger',
      'default',
      'delete',
      'do',
      'double', 'else', 'enum', 'eval', 'export', 'extends', 'false', 'final',
      'finally',
      'float',
      'for',
      'function',
      'goto',
      'if',
      'implements',
      'import',
      'in', 'instanceof', 'int', 'interface', 'let', 'long', 'native', 'new',
      'null', 'package', 'private', 'protected', 'public', 'return', 'short',
      'static', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
      'transient', 'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while',
      'with', 'yield',
      // Global objects
      'Array',
      'Boolean',
      'Date',
      'Error',
      'Function',
      'Math',
      'Number',
      'Object',
      'RegExp',
      'String',
      'Symbol',
      'Promise',
      'Map',
      'Set',
      'WeakMap',
      'WeakSet',
    };
    return keywords.contains(word);
  }

  /// Safely format an identifier, avoiding keywords
  static String safeIdentifier(String id) {
    if (isJSKeyword(id)) {
      return '${id}_';
    }
    return id.replaceAll(RegExp(r'[^\w$]'), '_');
  }

  /// Check if a character needs escaping in a string
  static String escapeStringLiteral(String value) {
    return value
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r')
        .replaceAll('\t', '\\t')
        .replaceAll('\b', '\\b')
        .replaceAll('\f', '\\f')
        .replaceAll('\v', '\\v')
        .replaceAll('\0', '\\0');
  }

  /// Wrap string in quotes with proper escaping
  static String quotedString(String value) {
    final escaped = escapeStringLiteral(value);
    return '"$escaped"';
  }

  /// Convert Dart naming convention to JavaScript (camelCase)
  static String dartToJSIdentifier(String dartName) {
    if (dartName.isEmpty) return '';

    // Convert snake_case to camelCase
    if (dartName.contains('_')) {
      final parts = dartName.split('_');
      return parts[0] +
          parts.skip(1).map((p) => p[0].toUpperCase() + p.substring(1)).join();
    }

    return dartName;
  }

  /// Add suffix to avoid naming conflicts
  static String uniqueIdentifier(String base, Set<String> existing) {
    var candidate = base;
    var counter = 1;

    while (existing.contains(candidate)) {
      candidate = '$base$counter';
      counter++;
    }

    return candidate;
  }

  /// Combine multiple code fragments with proper separators
  static String joinCodeFragments(
    List<String> fragments, {
    String separator = '\n',
    bool skipEmpty = true,
  }) {
    final filtered = skipEmpty
        ? fragments.where((f) => f.isNotEmpty).toList()
        : fragments;
    return filtered.join(separator);
  }

  /// Add JSDoc comment for a variable/function
  static String createJSDoc(
    String description, {
    Map<String, String>? params,
    String? returns,
  }) {
    final buffer = StringBuffer();
    buffer.writeln('/**');
    buffer.writeln(' * $description');

    if (params != null && params.isNotEmpty) {
      for (final entry in params.entries) {
        buffer.writeln(' * @param {any} ${entry.key} - ${entry.value}');
      }
    }

    if (returns != null) {
      buffer.writeln(' * @returns {any} $returns');
    }

    buffer.writeln(' */');
    return buffer.toString();
  }
}
