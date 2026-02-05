// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// lib/src/analyzer/analysis_output_generator.dart

import 'dependency_graph.dart';
import 'type_registry.dart';

/// Helper class for generating analysis output JSON
class AnalysisOutputGenerator {
  /// Generate dependency graph JSON
  static Map<String, dynamic> generateDependencyGraphJson(
    DependencyGraph graph,
    List<String> analysisOrder,
  ) {
    return {
      'timestamp': DateTime.now().toIso8601String(),
      'totalNodes': graph.nodeCount,
      'totalEdges': graph.edgeCount,
      'graph': graph.toJson(),
      'topologicalOrder': analysisOrder,
      'hasCircularDependencies': graph.hasCircularDependencies(),
    };
  }

  /// Generate type registry JSON
  static Map<String, dynamic> generateTypeRegistryJson(TypeRegistry registry) {
    return {
      'timestamp': DateTime.now().toIso8601String(),
      ...registry.toJsonWithStats(),
    };
  }
}
