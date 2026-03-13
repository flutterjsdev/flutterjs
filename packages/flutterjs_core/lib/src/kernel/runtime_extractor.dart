// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';

/// Extracts the dart:core runtime from a dart2js compiled file
///
/// dart2js bundles the entire Dart runtime (dart:core, dart:async, etc.)
/// into every compiled file. We want to extract this ONCE and reuse it
/// across all packages.
class RuntimeExtractor {
  /// Extract runtime from a dart2js compiled file
  ///
  /// The dart2js output has a predictable structure:
  /// 1. IIFE wrapper: (function dartProgram(){...})()
  /// 2. Helper functions
  /// 3. Type system setup
  /// 4. dart:core implementations
  /// 5. User code
  ///
  /// We want to extract everything EXCEPT the user code.
  Future<ExtractedRuntime> extractRuntime(String compiledFilePath) async {
    final content = await File(compiledFilePath).readAsString();

    // Find the main structure markers
    final analysis = _analyzeStructure(content);

    return ExtractedRuntime(
      setupCode: _extractSetup(content, analysis),
      helperFunctions: _extractHelpers(content, analysis),
      typeSystem: _extractTypeSystem(content, analysis),
      coreLibrary: _extractCoreLib(content, analysis),
      asyncLibrary: _extractAsyncLib(content, analysis),
      totalSize: content.length,
    );
  }

  _StructureAnalysis _analyzeStructure(String content) {
    // dart2js wraps everything in: (function dartProgram(){...})()
    final iiffeStart = content.indexOf('(function dartProgram()');
    final iiffeEnd = content.lastIndexOf('})()');

    // Find key markers in the code
    final hunkHelpersStart = content.indexOf('var hunkHelpers=function()');
    final typeUniverseStart = content.indexOf('typeUniverse:');

    // The user code typically starts after all the setup
    // Look for the marker where actual application code begins
    final userCodeStart = _findUserCodeStart(content);

    return _StructureAnalysis(
      iiffeStart: iiffeStart,
      iiffeEnd: iiffeEnd,
      hunkHelpersStart: hunkHelpersStart,
      typeUniverseStart: typeUniverseStart,
      userCodeStart: userCodeStart,
    );
  }

  int _findUserCodeStart(String content) {
    // User code typically starts after the initialization
    // Look for patterns like: var A={ ... }
    // or the main function invocation
    final patterns = [
      RegExp(r'var\s+A\s*=\s*{'),
      RegExp(r'function\s+main\s*\('),
    ];

    int? earliest;
    for (final pattern in patterns) {
      final match = pattern.firstMatch(content);
      if (match != null) {
        if (earliest == null || match.start < earliest) {
          earliest = match.start;
        }
      }
    }

    return earliest ?? content.length;
  }

  String _extractSetup(String content, _StructureAnalysis analysis) {
    // Extract from IIFE start to before helpers
    if (analysis.hunkHelpersStart > 0) {
      return content.substring(
        analysis.iiffeStart,
        analysis.hunkHelpersStart,
      );
    }
    return '';
  }

  String _extractHelpers(String content, _StructureAnalysis analysis) {
    // Extract hunkHelpers and related utility functions
    if (analysis.hunkHelpersStart > 0 && analysis.typeUniverseStart > 0) {
      return content.substring(
        analysis.hunkHelpersStart,
        analysis.typeUniverseStart - 100, // Back up a bit to get full context
      );
    }
    return '';
  }

  String _extractTypeSystem(String content, _StructureAnalysis analysis) {
    // Extract type universe and type checking code
    if (analysis.typeUniverseStart > 0 && analysis.userCodeStart > 0) {
      return content.substring(
        analysis.typeUniverseStart,
        analysis.userCodeStart,
      );
    }
    return '';
  }

  String _extractCoreLib(String content, _StructureAnalysis analysis) {
    // dart:core implementations are typically in the type system section
    // We'll need to parse more carefully here
    return '// dart:core implementations';
  }

  String _extractAsyncLib(String content, _StructureAnalysis analysis) {
    // dart:async implementations
    return '// dart:async implementations';
  }

  /// Generate a standalone runtime module
  Future<void> generateRuntimeModule({
    required ExtractedRuntime runtime,
    required String outputPath,
  }) async {
    final buffer = StringBuffer();

    buffer.writeln('// @flutterjs/runtime');
    buffer.writeln('// Extracted from dart2js - Dart runtime for web');
    buffer.writeln('// DO NOT EDIT - Generated file');
    buffer.writeln();
    buffer.writeln('(function(exports) {');
    buffer.writeln('  "use strict";');
    buffer.writeln();
    buffer.writeln('  // Setup code');
    buffer.writeln('  ${runtime.setupCode}');
    buffer.writeln();
    buffer.writeln('  // Helper functions');
    buffer.writeln('  ${runtime.helperFunctions}');
    buffer.writeln();
    buffer.writeln('  // Type system');
    buffer.writeln('  ${runtime.typeSystem}');
    buffer.writeln();
    buffer.writeln('  // Export public API');
    buffer.writeln('  // TODO: Extract and export actual dart:core types');
    buffer.writeln('  exports.dart = {');
    buffer.writeln('    core: {},');
    buffer.writeln('    async: {},');
    buffer.writeln('  };');
    buffer.writeln();
    buffer.writeln('})(typeof module !== "undefined" ? module.exports : globalThis);');

    await File(outputPath).writeAsString(buffer.toString());
    print('Generated runtime module: $outputPath');
  }
}

class _StructureAnalysis {
  final int iiffeStart;
  final int iiffeEnd;
  final int hunkHelpersStart;
  final int typeUniverseStart;
  final int userCodeStart;

  _StructureAnalysis({
    required this.iiffeStart,
    required this.iiffeEnd,
    required this.hunkHelpersStart,
    required this.typeUniverseStart,
    required this.userCodeStart,
  });
}

class ExtractedRuntime {
  final String setupCode;
  final String helperFunctions;
  final String typeSystem;
  final String coreLibrary;
  final String asyncLibrary;
  final int totalSize;

  ExtractedRuntime({
    required this.setupCode,
    required this.helperFunctions,
    required this.typeSystem,
    required this.coreLibrary,
    required this.asyncLibrary,
    required this.totalSize,
  });

  int get runtimeSize =>
      setupCode.length +
      helperFunctions.length +
      typeSystem.length +
      coreLibrary.length +
      asyncLibrary.length;

  double get runtimePercentage => (runtimeSize / totalSize) * 100;
}
