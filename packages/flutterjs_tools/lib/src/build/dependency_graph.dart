// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:yaml/yaml.dart';

/// Represents a node in the dependency graph
class DependencyNode {
  final String filePath;
  final Set<String> imports;
  final Set<String> exports;

  DependencyNode({
    required this.filePath,
    required this.imports,
    required this.exports,
  });
}

/// Analyzes project files to build a dependency graph
class DependencyGraph {
  final String projectRoot;
  String? _packageName;
  final Map<String, DependencyNode> _nodes = {};

  // Cache for resolved paths to avoid repeated I/O
  final Map<String, String?> _resolveCache = {};

  DependencyGraph({required String projectRoot})
    : projectRoot = p.normalize(p.absolute(projectRoot));

  /// Get the package name from pubspec.yaml
  Future<String> get packageName async {
    if (_packageName != null) return _packageName!;

    final pubspecFile = File(p.join(projectRoot, 'pubspec.yaml'));
    if (await pubspecFile.exists()) {
      final content = await pubspecFile.readAsString();
      final yaml = loadYaml(content);
      _packageName = yaml['name'] as String?;
    }

    _packageName ??= 'unknown';
    return _packageName!;
  }

  /// Build the graph starting from an entry point
  Future<void> build(String entryPoint) async {
    // Normalize entry point
    final absoluteEntry = p.normalize(p.absolute(entryPoint));
    await _visit(absoluteEntry);
  }

  /// Get dependencies for a specific file (must be built first)
  List<String> getDependencies(String filePath) {
    if (!_nodes.containsKey(filePath)) return [];

    final node = _nodes[filePath]!;
    final deps = <String>[];

    for (final importPath in node.imports) {
      if (_nodes.containsKey(importPath)) {
        deps.add(importPath);
      }
    }
    return deps;
  }

  Future<void> _visit(String filePath) async {
    if (_nodes.containsKey(filePath)) return;

    final file = File(filePath);
    if (!await file.exists()) return;

    // Parse file to get imports/exports
    final result = parseString(
      content: await file.readAsString(),
      path: filePath,
      throwIfDiagnostics: false,
    );

    final unit = result.unit;
    final imports = <String>{};
    final exports = <String>{};

    for (final directive in unit.directives) {
      if (directive is ImportDirective) {
        final uri = directive.uri.stringValue;
        if (uri != null) {
          final resolved = await _resolveUri(uri, filePath);
          if (resolved != null) imports.add(resolved);
        }
      } else if (directive is ExportDirective) {
        final uri = directive.uri.stringValue;
        if (uri != null) {
          final resolved = await _resolveUri(uri, filePath);
          if (resolved != null) {
            // Treat exports as dependencies too (must build exported file first)
            imports.add(resolved);
            exports.add(resolved);
          }
        }
      }
    }

    _nodes[filePath] = DependencyNode(
      filePath: filePath,
      imports: imports,
      exports: exports,
    );

    // Recurse
    for (final dep in imports) {
      await _visit(dep);
    }
  }

  Future<String?> _resolveUri(String uri, String currentPath) async {
    final key = '$uri|$currentPath';
    if (_resolveCache.containsKey(key)) return _resolveCache[key];

    String? resolvedPath;

    if (uri.startsWith('dart:')) {
      // Skip SDK imports
      resolvedPath = null;
    } else if (uri.startsWith('package:')) {
      // Handle package imports
      final currentPkg = await packageName;
      if (uri.startsWith('package:$currentPkg/')) {
        // Local package import
        final relative = uri.substring('package:$currentPkg/'.length);
        resolvedPath = p.normalize(p.join(projectRoot, 'lib', relative));
      } else {
        // External package - skip for now (assumed built)
        resolvedPath = null;
      }
    } else {
      // Relative import
      resolvedPath = p.normalize(p.join(p.dirname(currentPath), uri));
    }

    // Ensure absolute if not null
    if (resolvedPath != null && !p.isAbsolute(resolvedPath)) {
      resolvedPath = p.normalize(p.absolute(resolvedPath));
    }

    // Verify existence if it looks like a local file
    if (resolvedPath != null) {
      if (!await File(resolvedPath).exists()) {
        // Try finding it? Or just assume it's missing/generated?
        // For now, if it doesn't exist, we can't build it.
        resolvedPath = null;
      }
    }

    _resolveCache[key] = resolvedPath;
    return resolvedPath;
  }
}
