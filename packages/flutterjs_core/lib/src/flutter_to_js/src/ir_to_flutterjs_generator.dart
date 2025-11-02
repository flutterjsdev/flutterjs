import 'context/generation_context.dart';
import 'utils/generation_error.dart';
import 'utils/generator_config.dart';

class IRToFlutterJSGenerator {
  // Configuration
  late GeneratorConfig config;
  late ErrorCollector errorCollector;
  late GenerationContext context;

  // Output
  final StringBuffer output = StringBuffer();
  int indentLevel = 0;

  // Data structures
  late dynamic dartFile;
  final Map<String, String> typeMapping = {};
  final Map<int, String> binaryOpMap = {};
  final Map<int, String> unaryOpMap = {};
  final Map<String, bool> widgetRegistry = {};
  final Map<String, int> generatedIds = {};

  // Tracking
  final List<String> generatedClasses = [];
  final List<String> generatedFunctions = [];
  int errorCount = 0;
  int warningCount = 0;

  IRToFlutterJSGenerator({GeneratorConfig? config}) {
    this.config = config ?? const GeneratorConfig();
    errorCollector = ErrorCollector();
    context = GenerationContext();
    _initializeMappings();
  }

  // =========================================================================
  // INITIALIZATION & MAPPING SETUP
  // =========================================================================

  void _initializeMappings() {
    _initializeBinaryOperators();
    _initializeUnaryOperators();
    _initializeTypeMapping();
    _initializeWidgetRegistry();
  }

  void _initializeBinaryOperators() {
    binaryOpMap.addAll({
      // Arithmetic
      0x01: '+',
      0x02: '-',
      0x03: '*',
      0x04: '/',
      0x05: '%',
      0x06: '>>',

      // Comparison
      0x10: '===',
      0x11: '!==',
      0x12: '<',
      0x13: '<=',
      0x14: '>',
      0x15: '>=',

      // Logical
      0x20: '&&',
      0x21: '||',

      // Bitwise
      0x30: '&',
      0x31: '|',
      0x32: '^',
      0x33: '<<',
      0x34: '>>',
      0x35: '>>>',

      // Special
      0x40: '??',
    });

    _logVerbose('Initialized ${binaryOpMap.length} binary operators');
  }

  void _initializeUnaryOperators() {
    unaryOpMap.addAll({
      0x01: '-',      // negate
      0x02: '!',      // not
      0x03: '~',      // bitwise not
      0x04: '++',     // pre-increment
      0x05: '--',     // pre-decrement
      0x06: '++',     // post-increment
      0x07: '--',     // post-decrement
    });

    _logVerbose('Initialized ${unaryOpMap.length} unary operators');
  }

  void _initializeTypeMapping() {
    typeMapping.addAll({
      // Dart -> JavaScript
      'int': 'Number',
      'double': 'Number',
      'String': 'String',
      'bool': 'Boolean',
      'List': 'Array',
      'Map': 'Object',
      'Set': 'Set',
      'void': 'void',
      'dynamic': 'any',
      'Null': 'null',
      'Future': 'Promise',
      'Stream': 'AsyncIterable',

      // Flutter types
      'Widget': 'Widget',
      'StatelessWidget': 'StatelessWidget',
      'StatefulWidget': 'StatefulWidget',
      'State': 'State',
      'BuildContext': 'BuildContext',
      'Container': 'Container',
      'Text': 'Text',
      'Row': 'Row',
      'Column': 'Column',
      'Scaffold': 'Scaffold',
      'AppBar': 'AppBar',
      'FloatingActionButton': 'FloatingActionButton',
      'ElevatedButton': 'ElevatedButton',
      'TextButton': 'TextButton',
      'IconButton': 'IconButton',
      'Icon': 'Icon',
      'Image': 'Image',
      'ListView': 'ListView',
      'GridView': 'GridView',
      'SingleChildScrollView': 'SingleChildScrollView',
      'Center': 'Center',
      'Padding': 'Padding',
      'Align': 'Align',
      'Stack': 'Stack',
      'Positioned': 'Positioned',
      'SizedBox': 'SizedBox',
    });

    _logVerbose('Initialized ${typeMapping.length} type mappings');
  }

  void _initializeWidgetRegistry() {
    final widgets = [
      'Container',
      'Text',
      'Row',
      'Column',
      'Scaffold',
      'AppBar',
      'FloatingActionButton',
      'ElevatedButton',
      'TextButton',
      'IconButton',
      'Icon',
      'Image',
      'ListView',
      'GridView',
      'Center',
      'Padding',
      'Align',
      'Stack',
      'Positioned',
      'SizedBox',
      'SingleChildScrollView',
      'Card',
      'Divider',
      'Spacer',
    ];

    for (final widget in widgets) {
      widgetRegistry[widget] = true;
    }

    _logVerbose('Registered ${widgetRegistry.length} widgets');
  }


  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  void indent() {
    indentLevel++;
  }

  void dedent() {
    indentLevel = (indentLevel - 1).clamp(0, indentLevel);
  }

  String getIndent() => ' ' * (indentLevel * config.indentSpaces);

  void write(String text) {
    output.write(text);
  }

  void writeln(String text) {
    output.writeln(text);
  }

  void writeIndented(String text) {
    output.write(getIndent());
    output.writeln(text);
  }

  void writeBlock(String name, String content) {
    writeIndented('$name {');
    indent();
    writeIndented(content);
    dedent();
    writeIndented('}');
  }

  // =========================================================================
  // STRING HANDLING
  // =========================================================================

  String escapeString(String str) {
    return str
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r')
        .replaceAll('\t', '\\t')
        .replaceAll('\b', '\\b')
        .replaceAll('\f', '\\f');
  }

  String formatIdentifier(String id) {
    // Sanitize if needed
    if (_isKeyword(id)) {
      return '${id}_';
    }
    // Remove invalid characters
    return id.replaceAll(RegExp(r'[^\w$]'), '_');
  }

  bool _isKeyword(String word) {
    const keywords = {
      'class',
      'function',
      'const',
      'let',
      'var',
      'return',
      'if',
      'else',
      'for',
      'while',
      'do',
      'try',
      'catch',
      'finally',
      'throw',
      'new',
      'this',
      'super',
      'async',
      'await',
      'yield',
      'export',
      'import',
      'default',
      'break',
      'continue',
      'switch',
      'case',
      'extends',
      'static',
      'get',
      'set',
      'instanceof',
      'typeof',
      'void',
      'null',
      'true',
      'false',
    };
    return keywords.contains(word);
  }

  // =========================================================================
  // TYPE HANDLING
  // =========================================================================

  String mapType(dynamic type) {
    if (type == null) return 'any';

    try {
      final typeName = type.toString();
      return typeMapping[typeName] ?? typeName;
    } catch (e) {
      errorCollector.warningUnsupportedFeature('Type mapping for $type');
      return 'any';
    }
  }

  String getTypeComment(dynamic type) {
    if (!config.includeTypeComments || type == null) return '';
    final typeStr = mapType(type);
    if (typeStr.isEmpty || typeStr == 'void') return '';
    return '// @type {$typeStr}';
  }

  // =========================================================================
  // WIDGET DETECTION
  // =========================================================================

  bool isWidget(String name) => widgetRegistry[name] ?? false;

  bool isBuiltInWidget(String name) {
    const builtIns = {
      'Container',
      'Text',
      'Row',
      'Column',
      'Scaffold',
      'AppBar',
      'Center',
    };
    return builtIns.contains(name);
  }

  // =========================================================================
  // ID GENERATION
  // =========================================================================

  String generateId(String prefix) {
    final count = (generatedIds[prefix] ?? 0) + 1;
    generatedIds[prefix] = count;
    return '${prefix}_$count';
  }

  // =========================================================================
  // LOGGING
  // =========================================================================

  void _logVerbose(String message) {
    if (config.verboseOutput) {
      print('[GENERATOR] $message');
    }
  }

  void _logInfo(String message) {
    if (config.verboseOutput) {
      print('[INFO] $message');
    }
  }

  void _logWarning(String message) {
    print('[WARNING] $message');
  }

  void _logError(String message) {
    print('[ERROR] $message');
  }

  // =========================================================================
  // MAIN GENERATION ENTRY POINT
  // =========================================================================

  String generate(dynamic binaryData, {GeneratorConfig? generatorConfig}) {
    try {
      _logInfo('Starting code generation...');

      if (generatorConfig != null) {
        config = generatorConfig;
      }

      // Initialize
      output.clear();
      indentLevel = 0;
      generatedIds.clear();
      generatedClasses.clear();
      generatedFunctions.clear();

      _logVerbose('Configuration applied: ${config.verboseOutput ? "verbose" : "normal"}');

      // TODO: Parse binary IR into dartFile
      // dartFile = binaryReader.readFileIR(binaryData);

      // Generate code sections
      _logInfo('Generating imports...');
      // TODO: generateImports();

      _logInfo('Generating top-level code...');
      // TODO: generateTopLevelVariables();
      // TODO: generateFunctions();
      // TODO: generateClasses();
      // TODO: generateExports();

      // Format output
      String code = output.toString();
      if (config.formatCode) {
        _logInfo('Formatting code...');
        // TODO: code = formatter.formatComplete(code, config);
      }

      // Validate
      if (errorCollector.hasFatalErrors()) {
        throw GenerationException(GenerationError(
          message: 'Generation failed with fatal errors',
          severity: ErrorSeverity.fatal,
        ));
      }

      _logInfo('✓ Code generation completed successfully');
      if (errorCollector.hasWarnings()) {
        errorCollector.printReport();
      }

      return code;
    } catch (e, stack) {
      _logError('Generation failed: $e');
      _logError('Stack trace: $stack');
      rethrow;
    }
  }

  // =========================================================================
  // STATISTICS & REPORTING
  // =========================================================================

  Map<String, dynamic> getGenerationStats() {
    return {
      'generatedClasses': generatedClasses.length,
      'generatedFunctions': generatedFunctions.length,
      'totalErrors': errorCollector.errors
          .where((e) => e.severity == ErrorSeverity.error)
          .length,
      'totalWarnings': errorCollector.errors
          .where((e) => e.severity == ErrorSeverity.warning)
          .length,
      'outputSize': output.length,
      'indentLevel': indentLevel,
    };
  }

  void printStats() {
    final stats = getGenerationStats();
    print('\n=== GENERATION STATISTICS ===');
    print('Generated Classes: ${stats['generatedClasses']}');
    print('Generated Functions: ${stats['generatedFunctions']}');
    print('Errors: ${stats['totalErrors']}');
    print('Warnings: ${stats['totalWarnings']}');
    print('Output Size: ${stats['outputSize']} bytes');
    print('============================\n');
  }
}