// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package_manifest.dart';

/// Manages the resolution of Dart symbols to JavaScript packages.
///
/// Now uses PackageRegistry to query actual package exports instead of
/// maintaining hardcoded symbol maps.
class ImportResolver {
  final PackageRegistry registry;

  // STAGE 2: Configuration (Dart Library -> JS Package)
  // Default mappings that mimic Flutter's structure.
  static const Map<String, String> _defaultLibraryToPackage = {
    // Core Runtime
    'package:flutter/runtime.dart': '@flutterjs/runtime',

    // Core Widgets & Material
    'package:flutter/material.dart': '@flutterjs/material',
    'package:flutter/widgets.dart':
        '@flutterjs/material', // Most widgets are in material package for now
    'package:flutter/cupertino.dart': '@flutterjs/material',

    // Official Plugins
    'package:flutterjs_seo': '@flutterjs/seo',

    // Core Dart Packages
    'package:path/path.dart': 'path',
    'package:term_glyph/term_glyph.dart': 'term_glyph',
  };

  final Map<String, String> _libraryToPackageMap;

  ImportResolver({
    PackageRegistry? registry,
    Map<String, String>? userPackageMap,
  }) : registry = registry ?? PackageRegistry(),
       _libraryToPackageMap = {..._defaultLibraryToPackage, ...?userPackageMap};

  /// Resolves the JS package import path for a given [symbol].
  ///
  /// Resolution order:
  /// 1. Check PackageRegistry for exact match
  /// 2. Check hardcoded library mappings (for backwards compatibility)
  /// 3. Check file imports for context
  /// 4. Fallback to @flutterjs/material
  String resolve(String symbol, {List<String> activeImports = const []}) {
    // 1. PRIORITY: Check PackageRegistry for exact match
    // This is the new dynamic resolution based on actual package exports
    final packageFromRegistry = registry.findPackageForSymbol(symbol);
    if (packageFromRegistry != null) {
      return packageFromRegistry;
    }

    // 2. Fallback to library-based resolution
    // Check if this is a dart: import or package: import
    for (final importUri in activeImports) {
      if (importUri.startsWith('package:flutter/')) {
        final dartLib = _resolveLibraryToPackage(importUri);
        if (dartLib != '@flutterjs/material') {
          return dartLib;
        }
      }
    }

    // 3. STAGE 2: Contextual Heuristics (based on File Imports)
    // If we don't know the symbol, check the file's imports.
    for (final importUri in activeImports) {
      // Parse 'package:name/...'
      final packageName = _extractPackageName(importUri);
      if (packageName != null) {
        final mappedJsPackage = _libraryToPackageMap['package:$packageName'];
        if (mappedJsPackage != null &&
            mappedJsPackage != '@flutterjs/material') {
          // We found a non-default mapped package!
          return mappedJsPackage;
        }
      }
    }

    // 4. Fallback: Default UI Library
    // If strictly unknown and no helpful imports found, assume Material/Widget layer.
    return '@flutterjs/material';
  }

  /// Resolves a Dart library URI (e.g. package:foo/bar.dart) to a JS package name (e.g. @org/foo)
  /// Returns null if no mapping is found.
  String? resolveLibrary(String uri) {
    if (!uri.startsWith('package:')) return null;

    final packageName = _extractPackageName(uri);
    if (packageName == null) return null;

    // Check explicitly mapped packages
    if (_libraryToPackageMap.containsKey('package:$packageName')) {
      return _libraryToPackageMap['package:$packageName'];
    }

    return null;
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

  /// Checks if the symbol is known in the registry
  bool isKnownCore(String symbol) {
    return registry.hasSymbol(symbol);
  }
}
