class GeneratorConfig {
  final int indentSpaces;
  final bool useSemicolons;
  final bool includeTypeComments;
  final bool formatCode;
  final bool verboseOutput;
  final bool generateSourceMaps;
  final int maxLineLength;
  final bool strictNullChecks;
  final bool preserveComments;

  const GeneratorConfig({
    this.indentSpaces = 2,
    this.useSemicolons = true,
    this.includeTypeComments = true,
    this.formatCode = true,
    this.verboseOutput = false,
    this.generateSourceMaps = false,
    this.maxLineLength = 100,
    this.strictNullChecks = false,
    this.preserveComments = true,
  });

  GeneratorConfig copyWith({
    int? indentSpaces,
    bool? useSemicolons,
    bool? includeTypeComments,
    bool? formatCode,
    bool? verboseOutput,
    bool? generateSourceMaps,
    int? maxLineLength,
    bool? strictNullChecks,
    bool? preserveComments,
  }) {
    return GeneratorConfig(
      indentSpaces: indentSpaces ?? this.indentSpaces,
      useSemicolons: useSemicolons ?? this.useSemicolons,
      includeTypeComments: includeTypeComments ?? this.includeTypeComments,
      formatCode: formatCode ?? this.formatCode,
      verboseOutput: verboseOutput ?? this.verboseOutput,
      generateSourceMaps: generateSourceMaps ?? this.generateSourceMaps,
      maxLineLength: maxLineLength ?? this.maxLineLength,
      strictNullChecks: strictNullChecks ?? this.strictNullChecks,
      preserveComments: preserveComments ?? this.preserveComments,
    );
  }
}