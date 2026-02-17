// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'dart:convert';

/// Represents a package's export manifest
class PackageManifest {
  final String packageName;
  final String version;
  final Set<String> exports;
  final List<Map<String, dynamic>> exportDetails; // Full export info with path, uri, type

  PackageManifest({
    required this.packageName,
    required this.version,
    required this.exports,
    required this.exportDetails,
  });

  /// Load manifest from JSON file
  factory PackageManifest.fromJson(Map<String, dynamic> json) {
    final exportsList = json['exports'] as List;
    return PackageManifest(
      packageName: json['package'] as String,
      version: json['version'] as String,
      exports: exportsList.map((e) {
        if (e is String) return e;
        if (e is Map) return e['name'] as String;
        return e.toString();
      }).toSet(),
      exportDetails: exportsList.map((e) {
        if (e is Map<String, dynamic>) return e;
        return {'name': e.toString()};
      }).cast<Map<String, dynamic>>().toList(),
    );
  }

  /// Load manifest from file path
  factory PackageManifest.fromFile(String manifestPath) {
    final file = File(manifestPath);
    if (!file.existsSync()) {
      throw FileSystemException('Manifest not found', manifestPath);
    }

    final json = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    return PackageManifest.fromJson(json);
  }

  /// Check if this package exports a given symbol
  bool hasExport(String symbol) => exports.contains(symbol);

  @override
  String toString() =>
      'PackageManifest($packageName v$version, ${exports.length} exports)';
}

/// Registry of all package manifests
class PackageRegistry {
  final Map<String, PackageManifest> _packagesByName = {};
  final Map<String, String> _symbolToPackage = {};

  /// Load a single manifest file
  void loadManifest(String manifestPath) {
    try {
      final manifest = PackageManifest.fromFile(manifestPath);
      _registerManifest(manifest);
    } catch (e) {
      print('⚠️  Failed to load manifest $manifestPath: $e');
    }
  }

  void _registerManifest(PackageManifest manifest) {
    _packagesByName[manifest.packageName] = manifest;

    // Build reverse index: symbol → package
    for (final symbol in manifest.exports) {
      // If symbol already exists, keep first package (SDK packages loaded first)
      if (!_symbolToPackage.containsKey(symbol)) {
        _symbolToPackage[symbol] = manifest.packageName;
      }
    }

    print(
      '📋 Registered ${manifest.packageName}: ${manifest.exports.length} exports',
    );
  }

  /// Auto-discover and load all exports.json in packages directory
  void loadPackagesDirectory(String packagesDir) {
    final dir = Directory(packagesDir);
    if (!dir.existsSync()) {
      print('⚠️  Packages directory not found: $packagesDir');
      return;
    }

    print('📦 Scanning for package manifests in $packagesDir...');

    // Find all exports.json files recursively
    final manifests = dir
        .listSync(recursive: true)
        .whereType<File>()
        .where((file) => file.path.endsWith('exports.json'))
        .toList();

    if (manifests.isEmpty) {
      print('⚠️  No package manifests found');
      return;
    }

    for (final manifestFile in manifests) {
      loadManifest(manifestFile.path);
    }

    print('✅ Loaded ${_packagesByName.length} package manifests\n');
  }

  /// Find which package exports a given symbol
  String? findPackageForSymbol(String symbol) {
    return _symbolToPackage[symbol];
  }

  /// Get all loaded packages
  List<String> get loadedPackages => _packagesByName.keys.toList();

  /// Get total number of symbols tracked
  int get totalSymbols => _symbolToPackage.length;

  /// Check if a symbol is known
  bool hasSymbol(String symbol) => _symbolToPackage.containsKey(symbol);

  /// Register a local symbol pointing to a specific file path
  void registerLocalSymbol(String symbol, String absolutePath) {
    // For local files, we map the symbol to the absolute path
    // ImportResolver/ImportAnalyzer will need to handle this path
    _symbolToPackage[symbol] = absolutePath;
    print('📝 Registered local symbol: $symbol -> $absolutePath');
  }

  /// Build a global symbol table mapping symbol name → full package: URI.
  /// Falls back to bare package name if the export has no explicit uri field.
  /// This is consumed by ImportAnalyzer to resolve symbols to their packages.
  Map<String, String> buildGlobalSymbolTable() {
    final table = <String, String>{};
    for (final manifest in _packagesByName.values) {
      for (final detail in manifest.exportDetails) {
        final name = detail['name'] as String?;
        if (name == null || name.isEmpty) continue;
        // Prefer the explicit 'uri' field (full package: URI) over bare package name
        final uri = detail['uri'] as String?;
        if (uri != null && uri.isNotEmpty) {
          table.putIfAbsent(name, () => uri);
        } else {
          table.putIfAbsent(name, () => manifest.packageName);
        }
      }
    }
    return Map.unmodifiable(table);
  }

  /// Find the full export details (path, uri, type) for a symbol
  Map<String, dynamic>? findSymbolDetails(String symbol) {
    final packageName = _symbolToPackage[symbol];
    if (packageName == null) return null;

    final manifest = _packagesByName[packageName];
    if (manifest == null) return null;

    // Find the export entry for this symbol
    for (final export in manifest.exportDetails) {
      if (export['name'] == symbol) {
        return export;
      }
    }

    return null;
  }
}
