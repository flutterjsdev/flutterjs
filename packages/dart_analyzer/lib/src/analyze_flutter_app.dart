// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Main Declaration container
import 'ir_linker.dart' as ir_linker;
import 'model/analyzer_model.dart';

class FlutterAppDeclaration {
  final int version;
  final List<WidgetDeclaration> widgets;
  final List<StateClassDeclaration> stateClasses;
  final List<FunctionDeclaration> functions;
  final List<RouteDeclaration> routes;
  final List<AnimationDeclaration> animations;
  final List<ProviderDeclaration> providers;
  final List<ImportDeclaration> imports;
  final List<ThemeDeclaration> themes;
  final DependencyGraphModel dependencyGraph;
  final Map<String, List<String>> fileStructure;

  FlutterAppDeclaration({
    required this.version,
    required this.widgets,
    required this.stateClasses,
    required this.functions,
    required this.routes,
    required this.animations,
    required this.providers,
    required this.imports,
    this.themes = const [],
    DependencyGraphModel? dependencyGraph,
    this.fileStructure = const {},
  }) : dependencyGraph =
           dependencyGraph ?? DependencyGraphModel(nodes: [], edges: []);
}

// Dependency graph for optimization
class DependencyGraphModel {
  final List<DependencyNode> nodes;
  final List<ir_linker.DependencyEdge> edges;

  DependencyGraphModel({required this.nodes, required this.edges});
}

class DependencyNode {
  final String id;
  final DependencyType type;
  final String name;

  DependencyNode({required this.id, required this.type, required this.name});
}

enum DependencyType { widget, state, provider, service, utility }

enum DependencyRelation { uses, extendsJS, implements, mixesWith, dependsOn }
