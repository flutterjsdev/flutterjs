// ============================================================================
// PART 1: CONFIGURATION & CONSTANTS
// ============================================================================

class JSFormatterConfig {
  final int indentSpaces;
  final bool useSemicolons;
  final bool includeTypeComments;
  final bool formatCode;
  final bool verbose;

  const JSFormatterConfig({
    this.indentSpaces = 2,
    this.useSemicolons = true,
    this.includeTypeComments = false,
    this.formatCode = true,
    this.verbose = false,
  });
}


// Type mapping: Dart → JavaScript
const Map<String, String> DART_TO_JS_TYPES = {
  'int': 'Number',
  'double': 'Number',
  'String': 'String',
  'bool': 'Boolean',
  'List': 'Array',
  'Map': 'Object',
  'Set': 'Set',
  'void': 'void',
  'dynamic': 'any',
};
