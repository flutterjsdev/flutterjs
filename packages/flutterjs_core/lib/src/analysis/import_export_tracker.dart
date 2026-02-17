/// Import/Export Tracker - Builds the ImportExportModel during analysis
///
/// This tracker walks through the Dart file IR and builds a complete picture
/// of what symbols are defined, used, and need to be imported/exported.
///
/// ARCHITECTURE:
/// This provides a single source of truth for imports/exports, eliminating
/// duplicate symbol resolution logic in multiple code generators.
library;

import '../ir/declarations/import_export_model.dart';
import '../ir/declarations/dart_file_builder.dart';

/// Tracks imports and exports during Dart file analysis
///
/// This is a SIMPLIFIED version that just tracks locally defined symbols.
/// Future improvements will add full expression scanning for symbol usage.
class ImportExportTracker {
  /// Symbols defined locally in this file
  final Set<String> _locallyDefined = {};

  /// Symbols used in this file's code (TODO: implement full scanning)
  final Set<String> _symbolsUsed = {};

  /// Map of symbol -> Dart URI where it's defined
  final Map<String, String> _symbolToSourceUri = {};

  /// Dart core symbols (Uri, DateTime, etc.)
  final Set<String> _coreSymbols = {};

  /// Material/Widgets symbols
  final Set<String> _materialSymbols = {};

  /// Track a locally defined symbol
  void defineSymbol(String name, SymbolType type) {
    _locallyDefined.add(name);
  }

  /// Track a symbol being used
  void useSymbol(String name, {String? fromUri}) {
    // Strip generic parameters and nullability
    var cleanName = name;
    if (cleanName.contains('<')) {
      cleanName = cleanName.substring(0, cleanName.indexOf('<'));
    }
    if (cleanName.endsWith('?')) {
      cleanName = cleanName.substring(0, cleanName.length - 1);
    }

    _symbolsUsed.add(cleanName);

    // Record where it comes from if not defined locally
    if (fromUri != null && !_locallyDefined.contains(cleanName)) {
      _symbolToSourceUri[cleanName] = fromUri;

      // Categorize by source
      if (fromUri.startsWith('dart:core')) {
        _coreSymbols.add(cleanName);
      } else if (fromUri.contains('material.dart') ||
                 fromUri.contains('widgets.dart') ||
                 fromUri.contains('cupertino.dart')) {
        _materialSymbols.add(cleanName);
      }
    }
  }

  /// Analyze a DartFile and populate the model
  void analyzeDartFile(DartFile dartFile) {
    // 1. Record all locally defined symbols
    for (final classDecl in dartFile.classDeclarations) {
      defineSymbol(classDecl.name, SymbolType.class_);
    }

    for (final enumDecl in dartFile.enumDeclarations) {
      defineSymbol(enumDecl.name, SymbolType.enum_);
    }

    for (final funcDecl in dartFile.functionDeclarations) {
      defineSymbol(funcDecl.name, SymbolType.function);
    }

    for (final varDecl in dartFile.variableDeclarations) {
      defineSymbol(varDecl.name, SymbolType.variable);
    }

    // 2. Track imports and what symbols they provide
    // This helps code generators know which imports are needed
    for (final import in dartFile.imports) {
      // Track symbols from show clauses
      for (final symbol in import.showList) {
        useSymbol(symbol, fromUri: import.uri);
      }
    }

    // TODO: Phase 5 Enhancement - Scan expressions to find symbol usage
    // This would involve walking through all class members, function bodies,
    // variable initializers, etc. to collect actually USED symbols (not just imported).
    // For now, imported symbols are tracked, and ImportAnalyzer handles usage detection.
  }

  /// Build the final ImportExportModel
  ImportExportModel buildModel() {
    return ImportExportModel(
      locallyDefined: Set.from(_locallyDefined),
      symbolsUsed: Set.from(_symbolsUsed),
      symbolToSourceUri: Map.from(_symbolToSourceUri),
      requiredImports: [], // Will be populated by code generators
      exports: [], // Will be populated by code generators
      coreSymbolsUsed: Set.from(_coreSymbols),
      materialSymbolsUsed: Set.from(_materialSymbols),
    );
  }

  /// Clear all tracked data
  void reset() {
    _locallyDefined.clear();
    _symbolsUsed.clear();
    _symbolToSourceUri.clear();
    _coreSymbols.clear();
    _materialSymbols.clear();
  }
}
