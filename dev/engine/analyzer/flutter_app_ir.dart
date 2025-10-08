// Main IR container
import '../ir/Statement/statement_ir.dart';
import '../ir/widget/widget_ir.dart';

class FlutterAppIR {
  final int version;
  final List<WidgetIR> widgets;
  final List<StateClassIR> stateClasses;
  final List<FunctionIR> functions;
  final List<RouteIR> routes;
  final List<AnimationIR> animations;
  final List<ProviderIR> providers;
  final List<ImportIR> imports;
  final List<ThemeIR> themes;
  final DependencyGraphIR dependencyGraph;
  final Map<String, List<String>> fileStructure;

  FlutterAppIR({
    required this.version,
    required this.widgets,
    required this.stateClasses,
    required this.functions,
    required this.routes,
    required this.animations,
    required this.providers,
    required this.imports,
    this.themes = const [],
    DependencyGraphIR? dependencyGraph,
    this.fileStructure = const {},
  }) : dependencyGraph = dependencyGraph ?? DependencyGraphIR(nodes: [], edges: []);
}

// Import tracking
class ImportIR {
  final String uri;
  final String prefix;
  final bool isDeferred;
  final List<String> showCombinators;
  final List<String> hideCombinators;

  ImportIR({
    required this.uri,
    this.prefix = '',
    this.isDeferred = false,
    this.showCombinators = const [],
    this.hideCombinators = const [],
  });
}

// Dependency graph for optimization
class DependencyGraphIR {
  final List<DependencyNodeIR> nodes;
  final List<DependencyEdgeIR> edges;

  DependencyGraphIR({
    required this.nodes,
    required this.edges,
  });
}

class DependencyNodeIR {
  final String id;
  final DependencyType type;
  final String name;

  DependencyNodeIR({
    required this.id,
    required this.type,
    required this.name,
  });
}

enum DependencyType {
  widget,
  state,
  provider,
  service,
  utility,
}

class DependencyEdgeIR {
  final String fromId;
  final String toId;
  final DependencyRelation relation;

  DependencyEdgeIR({
    required this.fromId,
    required this.toId,
    required this.relation,
  });
}

enum DependencyRelation {
  uses,
  extendsJS,
  implements,
  mixesWith,
  dependsOn,
}