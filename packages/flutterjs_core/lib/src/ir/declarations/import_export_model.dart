/// Import/Export Model - Complete dependency tracking for JavaScript generation
///
/// This model is built during the analysis phase and provides a single source
/// of truth for what imports and exports a file needs. This eliminates the need
/// for duplicate symbol resolution logic in multiple code generators.
library;

/// Represents a single import statement needed in the generated JavaScript
class ImportDeclaration {
  /// The path to import from (e.g., './types.js', '@flutterjs/material', 'url_launcher')
  final String path;

  /// Symbols to import from this path (empty for side-effect imports)
  final Set<String> symbols;

  /// Whether this is a namespace import (import * as X)
  final String? namespaceAlias;

  /// Whether this is a side-effect only import (import 'path')
  final bool isSideEffectOnly;

  /// The original Dart URI (for debugging)
  final String dartUri;

  ImportDeclaration({
    required this.path,
    required this.symbols,
    this.namespaceAlias,
    this.isSideEffectOnly = false,
    required this.dartUri,
  });

  @override
  String toString() {
    if (isSideEffectOnly) return "import '$path'; // $dartUri";
    if (namespaceAlias != null) return "import * as $namespaceAlias from '$path';";
    if (symbols.isEmpty) return "import '$path';";
    return "import { ${symbols.join(', ')} } from '$path';";
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ImportDeclaration &&
          runtimeType == other.runtimeType &&
          path == other.path &&
          symbols.length == other.symbols.length &&
          symbols.every((s) => other.symbols.contains(s)) &&
          namespaceAlias == other.namespaceAlias;

  @override
  int get hashCode => Object.hash(path, symbols, namespaceAlias);
}

/// Represents a symbol export in the generated JavaScript
class ExportDeclaration {
  /// The symbol being exported
  final String symbol;

  /// Whether this is a re-export from another module
  final String? reexportFrom;

  /// The type of symbol (class, function, enum, variable)
  final SymbolType type;

  ExportDeclaration({
    required this.symbol,
    this.reexportFrom,
    required this.type,
  });

  @override
  String toString() {
    if (reexportFrom != null) {
      return "export { $symbol } from '$reexportFrom';";
    }
    return "export { $symbol };";
  }
}

/// Type of symbol for export tracking
enum SymbolType {
  class_,
  enum_,
  function,
  variable,
  typedef,
  extensionType,
}

/// Complete import/export model for a Dart file
///
/// This model is built during analysis and provides all the information needed
/// to generate correct JavaScript imports and exports without any guessing or
/// duplicate symbol resolution.
class ImportExportModel {
  /// Symbols defined locally in THIS file
  final Set<String> locallyDefined;

  /// Symbols actually used in THIS file's code
  final Set<String> symbolsUsed;

  /// Map of symbol -> where it comes from (Dart URI)
  /// Only includes symbols that need to be imported (not locally defined)
  final Map<String, String> symbolToSourceUri;

  /// Imports required for this file (already resolved to JS paths)
  final List<ImportDeclaration> requiredImports;

  /// Exports from this file
  final List<ExportDeclaration> exports;

  /// Dart core symbols used (these go to @flutterjs/dart/core)
  final Set<String> coreSymbolsUsed;

  /// Material/Widgets symbols used (these go to @flutterjs/material)
  final Set<String> materialSymbolsUsed;

  ImportExportModel({
    required this.locallyDefined,
    required this.symbolsUsed,
    required this.symbolToSourceUri,
    required this.requiredImports,
    required this.exports,
    required this.coreSymbolsUsed,
    required this.materialSymbolsUsed,
  });

  /// Create an empty model
  factory ImportExportModel.empty() {
    return ImportExportModel(
      locallyDefined: {},
      symbolsUsed: {},
      symbolToSourceUri: {},
      requiredImports: [],
      exports: [],
      coreSymbolsUsed: {},
      materialSymbolsUsed: {},
    );
  }

  /// Check if a symbol is defined locally
  bool isDefinedLocally(String symbol) => locallyDefined.contains(symbol);

  /// Check if a symbol is used
  bool isUsed(String symbol) => symbolsUsed.contains(symbol);

  /// Get the source URI for a symbol (or null if local)
  String? getSourceUri(String symbol) {
    if (isDefinedLocally(symbol)) return null;
    return symbolToSourceUri[symbol];
  }

  /// Get all symbols that need to be imported
  Set<String> get symbolsToImport {
    return symbolsUsed.where((s) => !isDefinedLocally(s)).toSet();
  }

  /// Debug representation
  @override
  String toString() {
    final buffer = StringBuffer();
    buffer.writeln('ImportExportModel {');
    buffer.writeln('  Locally Defined (${locallyDefined.length}): ${locallyDefined.take(5)}...');
    buffer.writeln('  Symbols Used (${symbolsUsed.length}): ${symbolsUsed.take(5)}...');
    buffer.writeln('  To Import (${symbolsToImport.length}): ${symbolsToImport.take(5)}...');
    buffer.writeln('  Required Imports (${requiredImports.length})');
    buffer.writeln('  Exports (${exports.length})');
    buffer.writeln('}');
    return buffer.toString();
  }
}
