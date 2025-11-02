enum ErrorSeverity { fatal, error, warning, info }

class GenerationError {
  final String message;
  final ErrorSeverity severity;
  final String? suggestion;
  final String? location;
  final int? lineNumber;
  final String? context;

  GenerationError({
    required this.message,
    required this.severity,
    this.suggestion,
    this.location,
    this.lineNumber,
    this.context,
  });

  String format() {
    final buffer = StringBuffer();
    buffer.writeln('${severity.name}: $message');
    if (location != null) buffer.writeln('Location: $location');
    if (lineNumber != null) buffer.writeln('Line: $lineNumber');
    if (suggestion != null) buffer.writeln('Suggestion: $suggestion');
    if (context != null) buffer.writeln('Context: $context');
    return buffer.toString();
  }

  @override
  String toString() => format();
}

class ErrorCollector {
  final List<GenerationError> errors = [];

  void addError(GenerationError error) {
    errors.add(error);
    if (error.severity == ErrorSeverity.fatal) {
      throw GenerationException(error);
    }
  }

  void errorUnknownExpression(dynamic expr, {String? context}) {
    addError(
      GenerationError(
        message: 'Unknown expression type: ${expr.runtimeType}',
        severity: ErrorSeverity.error,
        suggestion: 'Check IR structure and expression types',
        context: context,
      ),
    );
  }

  void errorTypeMismatch(String expected, String got, {String? context}) {
    addError(
      GenerationError(
        message: 'Type mismatch: expected $expected, got $got',
        severity: ErrorSeverity.warning,
        context: context,
      ),
    );
  }

  void errorUnresolvedIdentifier(String name, {String? context}) {
    addError(
      GenerationError(
        message: 'Unresolved identifier: $name',
        severity: ErrorSeverity.error,
        suggestion: 'Check variable declaration and scope',
        context: context,
      ),
    );
  }

  void warningUnsupportedFeature(String feature, {String? context}) {
    addError(
      GenerationError(
        message: 'Unsupported feature: $feature',
        severity: ErrorSeverity.warning,
        suggestion: 'Feature will be simulated or skipped',
        context: context,
      ),
    );
  }

  void warningSyntaxTransformation(String description) {
    addError(
      GenerationError(
        message: 'Syntax transformation: $description',
        severity: ErrorSeverity.info,
      ),
    );
  }

  bool hasErrors() => errors.any((e) => e.severity == ErrorSeverity.error);
  bool hasFatalErrors() => errors.any((e) => e.severity == ErrorSeverity.fatal);
  bool hasWarnings() => errors.any((e) => e.severity == ErrorSeverity.warning);

  void printReport() {
    if (errors.isEmpty) {
      print('✓ No errors or warnings');
      return;
    }

    print('\n=== GENERATION REPORT ===\n');

    final byType = <ErrorSeverity, List<GenerationError>>{};
    for (final error in errors) {
      byType.putIfAbsent(error.severity, () => []).add(error);
    }

    for (final severity in ErrorSeverity.values.reversed) {
      final typeErrors = byType[severity] ?? [];
      if (typeErrors.isEmpty) continue;

      print('${severity.name}S (${typeErrors.length}):');
      for (final error in typeErrors) {
        print('  • ${error.message}');
        if (error.suggestion != null) {
          print('    → ${error.suggestion}');
        }
      }
      print('');
    }
  }
}

class GenerationException implements Exception {
  final GenerationError error;

  GenerationException(this.error);

  @override
  String toString() => error.format();
}
