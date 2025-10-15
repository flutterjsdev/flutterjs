// // lib/src/ir/imports/import_ir.dart

// import 'ir/helper.dart';
// abstract class IRNode {
//   /// Unique identifier for this IR node
//   final String id;
  
//   /// Timestamp when this node was created
//   final DateTime createdAt;
  
//   IRNode({
//     required this.id,
//     DateTime? createdAt,
//   }) : createdAt = createdAt ?? DateTime.now();
  
//   /// Get metadata about this node
//   Map<String, dynamic> getMetadata() => {
//     'id': id,
//     'type': runtimeType.toString(),
//     'createdAt': createdAt.toIso8601String(),
//   };
// }
// /// Represents an import directive in the IR
// /// 
// /// This class encapsulates all information about a Dart import statement,
// /// including the URI, prefix, combinators (show/hide), and deferred loading.
// class ImportIR extends IRNode {
//   /// The URI being imported (e.g., 'package:flutter/material.dart')
//   final String uri;
  
//   /// Optional prefix for the import (e.g., 'import ... as prefix')
//   final String prefix;
  
//   /// Whether this is a deferred import (e.g., 'import ... deferred as')
//   final bool isDeferred;
  
//   /// List of names explicitly shown in 'show' combinators
//   /// Empty if no show combinator is specified
//   final List<String> showCombinators;
  
//   /// List of names explicitly hidden in 'hide' combinators
//   /// Empty if no hide combinator is specified
//   final List<String> hideCombinators;
  
//   /// Conditional import configurations (for multi-platform support)
//   /// Maps condition to alternative URI (e.g., 'dart.library.io' -> 'package:...')
//   final Map<String, String> conditionalUris;
  
//   /// Whether this import is from a relative path
//   final bool isRelative;
  
//   /// Whether this import is from the 'dart:' library system
//   final bool isDartLibrary;
  
//   /// Whether this import is from a package
//   final bool isPackageImport;
  
//   /// The source location of this import directive
//   final SourceLocationIR sourceLocation;
  
//   /// Parsed package name if this is a package import
//   /// e.g., 'flutter' from 'package:flutter/material.dart'
//   final String? packageName;
  
//   /// Parsed library path if this is a package import
//   /// e.g., 'material.dart' from 'package:flutter/material.dart'
//   final String? libraryPath;
  
//   /// Whether this import contributes to the public API of this file
//   final bool exportsSymbols;
  
//   ImportIR({
//     required this.uri,
//     required String id,
//     this.prefix = '',
//     this.isDeferred = false,
//     this.showCombinators = const [],
//     this.hideCombinators = const [],
//     this.conditionalUris = const {},
//     this.isRelative = false,
//     this.isDartLibrary = false,
//     this.isPackageImport = false,
//     required this.sourceLocation,
//     this.packageName,
//     this.libraryPath,
//     this.exportsSymbols = false,
//   }) : super(id: id);
  
//   /// Factory constructor to parse import information from URI
//   factory ImportIR.fromUri({
//     required String uri,
//     required String id,
//     String prefix = '',
//     bool isDeferred = false,
//     List<String> showCombinators = const [],
//     List<String> hideCombinators = const [],
//     Map<String, String> conditionalUris = const {},
//     required SourceLocationIR sourceLocation,
//   }) {
//     // Determine import type and parse package/library info
//     final isDartLibrary = uri.startsWith('dart:');
//     final isPackageImport = uri.startsWith('package:');
//     final isRelative = uri.startsWith('.') || uri.startsWith('/');
    
//     String? packageName;
//     String? libraryPath;
    
//     if (isPackageImport) {
//       // Parse 'package:flutter/material.dart' into 'flutter' and 'material.dart'
//       final parts = uri.substring(8).split('/'); // Remove 'package:' prefix
//       if (parts.isNotEmpty) {
//         packageName = parts[0];
//         libraryPath = parts.skip(1).join('/');
//       }
//     }
    
//     return ImportIR(
//       uri: uri,
//       id: id,
//       prefix: prefix,
//       isDeferred: isDeferred,
//       showCombinators: showCombinators,
//       hideCombinators: hideCombinators,
//       conditionalUris: conditionalUris,
//       isDartLibrary: isDartLibrary,
//       isPackageImport: isPackageImport,
//       isRelative: isRelative,
//       sourceLocation: sourceLocation,
//       packageName: packageName,
//       libraryPath: libraryPath,
//     );
//   }
  
//   /// Get all symbols that are available after this import
//   /// Returns all public symbols unless restricted by show/hide
//   Set<String> getAvailableSymbols(Set<String> allPublicSymbols) {
//     Set<String> available = Set.from(allPublicSymbols);
    
//     // Apply show combinator (whitelist)
//     if (showCombinators.isNotEmpty) {
//       available = available.intersection(showCombinators.toSet());
//     }
    
//     // Apply hide combinator (blacklist)
//     if (hideCombinators.isNotEmpty) {
//       available.removeAll(hideCombinators);
//     }
    
//     return available;
//   }
  
//   /// Check if a specific symbol is available through this import
//   bool hasSymbol(String symbolName) {
//     // Explicit show combinator: symbol must be in the list
//     if (showCombinators.isNotEmpty) {
//       return showCombinators.contains(symbolName);
//     }
    
//     // Hide combinator: symbol must not be in the list
//     if (hideCombinators.isNotEmpty) {
//       return !hideCombinators.contains(symbolName);
//     }
    
//     // No combinators: symbol is available
//     return true;
//   }
  
//   /// Get the fully qualified reference to a symbol from this import
//   String getQualifiedReference(String symbolName) {
//     if (prefix.isNotEmpty) {
//       return '$prefix.$symbolName';
//     }
//     return symbolName;
//   }
  
//   /// Check if this import represents a transitive dependency
//   /// (i.e., it imports from another import)
//   bool get isTransitive => uri.contains('/../') || uri.contains('/./');
  
//   /// Get a human-readable description of the import
//   String getDescription() {
//     StringBuffer buffer = StringBuffer();
    
//     if (isDeferred) {
//       buffer.write('deferred import ');
//     } else {
//       buffer.write('import ');
//     }
    
//     buffer.write('"$uri"');
    
//     if (prefix.isNotEmpty) {
//       buffer.write(' as $prefix');
//     }
    
//     if (showCombinators.isNotEmpty) {
//       buffer.write(' show ${showCombinators.join(', ')}');
//     }
    
//     if (hideCombinators.isNotEmpty) {
//       buffer.write(' hide ${hideCombinators.join(', ')}');
//     }
    
//     return buffer.toString();
//   }
  
//   @override
//   String toString() => getDescription();
// }

// /// Represents an export directive in the IR
// /// 
// /// Similar to ImportIR but for re-exporting symbols from other libraries
// class ExportIR extends IRNode {
//   /// The URI being exported
//   final String uri;
  
//   /// List of names explicitly shown in 'show' combinators
//   final List<String> showCombinators;
  
//   /// List of names explicitly hidden in 'hide' combinators
//   final List<String> hideCombinators;
  
//   /// The source location of this export directive
//   final SourceLocationIR sourceLocation;
  
//   /// Whether this export re-exports all public symbols
//   final bool exportsAll;
  
//   ExportIR({
//     required this.uri,
//     required String id,
//     this.showCombinators = const [],
//     this.hideCombinators = const [],
//     required this.sourceLocation,
//     this.exportsAll = true,
//   }) : super(id: id);
  
//   /// Get all exported symbols, applying show/hide combinators
//   Set<String> getExportedSymbols(Set<String> sourceSymbols) {
//     Set<String> exported = Set.from(sourceSymbols);
    
//     if (showCombinators.isNotEmpty) {
//       exported = exported.intersection(showCombinators.toSet());
//     }
    
//     if (hideCombinators.isNotEmpty) {
//       exported.removeAll(hideCombinators);
//     }
    
//     return exported;
//   }
  
//   /// Check if a symbol is exported
//   bool exportsSymbol(String symbolName) {
//     if (showCombinators.isNotEmpty) {
//       return showCombinators.contains(symbolName);
//     }
    
//     if (hideCombinators.isNotEmpty) {
//       return !hideCombinators.contains(symbolName);
//     }
    
//     return exportsAll;
//   }
  
//   @override
//   String toString() {
//     StringBuffer buffer = StringBuffer();
//     buffer.write('export "$uri"');
    
//     if (showCombinators.isNotEmpty) {
//       buffer.write(' show ${showCombinators.join(', ')}');
//     }
    
//     if (hideCombinators.isNotEmpty) {
//       buffer.write(' hide ${hideCombinators.join(', ')}');
//     }
    
//     return buffer.toString();
//   }
// }

// /// Container for all import and export directives in a file
// class ImportExportListIR extends IRNode {
//   /// All imports in the file, in order of appearance
//   final List<ImportIR> imports;
  
//   /// All exports in the file
//   final List<ExportIR> exports;
  
//   /// Map of prefixes to their corresponding imports
//   final Map<String, ImportIR> prefixMap;
  
//   /// Map of package names to their imports
//   final Map<String, List<ImportIR>> packageMap;
  
//   ImportExportListIR({
//     required String id,
//     this.imports = const [],
//     this.exports = const [],
//     this.prefixMap = const {},
//     this.packageMap = const {},
//   }) : super(id: id);
  
//   /// Find an import by its prefix
//   ImportIR? findByPrefix(String prefix) => prefixMap[prefix];
  
//   /// Find all imports from a specific package
//   List<ImportIR> findByPackage(String packageName) => 
//       packageMap[packageName] ?? [];
  
//   /// Get all symbols available in this file from imports
//   /// Returns map of symbol to its import source
//   Map<String, ImportIR> getAvailableSymbols() {
//     final available = <String, ImportIR>{};
    
//     for (final import in imports) {
//       if (import.prefix.isEmpty) {
//         // Direct imports without prefix make symbols available directly
//         // In a real implementation, we'd need the actual symbol list from the import
//         // For now, we track that they're available through this import
//       }
//     }
    
//     return available;
//   }
  
//   /// Check if a symbol is available (considering all imports)
//   bool isSymbolAvailable(String symbolName) {
//     for (final import in imports) {
//       if (import.hasSymbol(symbolName)) {
//         return true;
//       }
//     }
//     return false;
//   }
  
//   @override
//   String toString() => 'ImportExportList(${imports.length} imports, ${exports.length} exports)';
// }