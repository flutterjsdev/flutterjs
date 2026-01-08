/// Manages the resolution of Dart symbols to JavaScript packages.
///
/// Implements a 2-Stage Resolution Strategy:
/// 1. **Symbol -> Dart Library**: Identifies which Dart library a symbol belongs to (e.g., `Text` -> `package:flutter/material.dart`).
/// 2. **Dart Library -> JS Package**: Maps the Dart library to a JS package (e.g., `package:flutter/material.dart` -> `@flutterjs/material`).
///
/// This allows users to configure the *destination* JS package for any given Dart library
/// without needing to redefine every single symbol mapping.
class ImportResolver {
  // STAGE 1: Knowledge Base (Symbol -> Dart Library)
  // Defines the canonical source of truth for where core symbols come from.
  static const Map<String, String> _symbolToLibrary = {
    // Core Runtime
    'runApp': 'package:flutter/runtime.dart',
    'Widget': 'package:flutter/runtime.dart',
    'State': 'package:flutter/runtime.dart',
    'StatefulWidget': 'package:flutter/runtime.dart',
    'StatelessWidget': 'package:flutter/runtime.dart',
    'BuildContext': 'package:flutter/runtime.dart',
    'Key': 'package:flutter/runtime.dart',
    'ValueKey': 'package:flutter/runtime.dart',
    'ObjectKey': 'package:flutter/runtime.dart',
    'GlobalKey': 'package:flutter/runtime.dart',
    'UniqueKey': 'package:flutter/runtime.dart',
    'Scheduler': 'package:flutter/runtime.dart',
    'GestureDetector': 'package:flutter/runtime.dart',

    // Material Widgets
    'MaterialApp': 'package:flutter/material.dart',
    'Scaffold': 'package:flutter/material.dart',
    'AppBar': 'package:flutter/material.dart',
    'Text': 'package:flutter/material.dart',
    'TextStyle': 'package:flutter/material.dart',
    'Container': 'package:flutter/material.dart',
    'Column': 'package:flutter/material.dart',
    'Row': 'package:flutter/material.dart',
    'Icon': 'package:flutter/material.dart',
    'Icons': 'package:flutter/material.dart',
    'Padding': 'package:flutter/material.dart',
    'FloatingActionButton': 'package:flutter/material.dart',
    'Center': 'package:flutter/material.dart',
    'SizedBox': 'package:flutter/material.dart',
    'Card': 'package:flutter/material.dart',
    'Colors': 'package:flutter/material.dart',
    'Theme': 'package:flutter/material.dart',
    'ThemeData': 'package:flutter/material.dart',
    'ColorScheme': 'package:flutter/material.dart',
    'ListTile': 'package:flutter/material.dart',
    'ListView': 'package:flutter/material.dart',
    'Divider': 'package:flutter/material.dart',
    'ElevatedButton': 'package:flutter/material.dart',
    'MainAxisAlignment': 'package:flutter/material.dart',
  };

  // STAGE 2: Configuration (Dart Library -> JS Package)
  // Default mappings that mimic Flutter's structure.
  static const Map<String, String> _defaultLibraryToPackage = {
    // We map both runtime and material to @flutterjs/material by default
    // because @flutterjs/material is the Unified Entry Point.
    // Users can override this to split them if needed.
    'package:flutter/runtime.dart': '@flutterjs/material',
    'package:flutter/material.dart': '@flutterjs/material',
    'package:flutter/widgets.dart': '@flutterjs/material',
    'package:flutter/cupertino.dart': '@flutterjs/material', // Fallback for now
  };

  final Map<String, String> _libraryToPackageMap;

  ImportResolver({Map<String, String>? userPackageMap})
    : _libraryToPackageMap = {..._defaultLibraryToPackage, ...?userPackageMap};

  /// Resolves the JS package import path for a given [symbol].
  ///
  /// [activeImports] is the list of import URIs present in the file using this symbol.
  /// This context allows us to route unknown symbols to packages imported by the user.
  String resolve(String symbol, {List<String> activeImports = const []}) {
    // 1. STAGE 1: Exact Symbol Knowledge
    // Check if we know exactly where this symbol comes from in Dart.
    final knownLibrary = _symbolToLibrary[symbol];
    if (knownLibrary != null) {
      return _resolveLibraryToPackage(knownLibrary);
    }

    // 2. STAGE 2: Contextual Heuristics (based on File Imports)
    // If we don't know the symbol, check the file's imports.
    // If the user imports 'package:firebase_core/...', and we have a mapping for
    // 'package:firebase_core', we can infer the symbol likely comes from there.

    for (final importUri in activeImports) {
      // Parse 'package:name/...'
      final packageName = _extractPackageName(importUri);
      if (packageName != null) {
        final mappedJsPackage = _libraryToPackageMap['package:$packageName'];
        if (mappedJsPackage != null &&
            mappedJsPackage != '@flutterjs/material') {
          // We found a non-default mapped package!
          // If there are multiple, this is ambiguous, but picking the first valid
          // non-core package is a strong heuristic for custom widgets.
          return mappedJsPackage;
        }
      }
    }

    // 3. Fallback: Default UI Library
    // If strictly unknown and no helpful imports found, assume Material/Widget layer.
    return '@flutterjs/material';
  }

  String _resolveLibraryToPackage(String dartLibraryUri) {
    // Exact match
    if (_libraryToPackageMap.containsKey(dartLibraryUri)) {
      return _libraryToPackageMap[dartLibraryUri]!;
    }

    // Package-level match (e.g. package:flutter/material.dart matches package:flutter)
    final packageName = _extractPackageName(dartLibraryUri);
    if (packageName != null &&
        _libraryToPackageMap.containsKey('package:$packageName')) {
      return _libraryToPackageMap['package:$packageName']!;
    }

    return '@flutterjs/material';
  }

  String? _extractPackageName(String uri) {
    if (uri.startsWith('package:')) {
      final parts = uri.substring(8).split('/');
      if (parts.isNotEmpty) {
        return parts.first;
      }
    }
    return null;
  }
}
