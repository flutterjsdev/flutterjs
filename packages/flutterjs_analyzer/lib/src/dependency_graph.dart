// lib/src/analyzer/dependency_graph.dart

class DependencyGraph {
  final Map<String, Set<String>> _dependencies = {};
  final Map<String, Set<String>> _dependents = {};

  void addNode(String filePath) {
    _dependencies.putIfAbsent(filePath, () => {});
    _dependents.putIfAbsent(filePath, () => {});
  }

  void addEdge(String from, String to) {
    _dependencies[from]!.add(to);
    _dependents[to]!.add(from);
  }

  /// Returns the number of nodes in the graph
  int get nodeCount => _dependencies.length;

  /// Detects all cycles in the dependency graph
  List<List<String>> detectCycles() {
    final cycles = <List<String>>[];
    final visited = <String>{};
    final recursionStack = <String>{};
    final path = <String>[];

    void dfs(String node) {
      visited.add(node);
      recursionStack.add(node);
      path.add(node);

      for (final dependency in _dependencies[node] ?? <String>[]) {
        if (!visited.contains(dependency)) {
          dfs(dependency);
        } else if (recursionStack.contains(dependency)) {
          // Found a cycle
          final cycleStartIndex = path.indexOf(dependency);
          final cycle = path.sublist(cycleStartIndex)..add(dependency);
          cycles.add(List.from(cycle));
        }
      }

      path.removeLast();
      recursionStack.remove(node);
    }

    for (final node in _dependencies.keys) {
      if (!visited.contains(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /// Gets all transitive dependents of a node
  Set<String> getTransitiveDependents(String filePath) {
    final result = <String>{};
    final visited = <String>{};

    void visit(String node) {
      if (visited.contains(node)) return;
      visited.add(node);

      for (final dependent in _dependents[node] ?? <String>[]) {
        result.add(dependent);
        visit(dependent);
      }
    }

    visit(filePath);
    return result;
  }

  List<String> getDependencies(String filePath) {
    return _dependencies[filePath]?.toList() ?? [];
  }

  List<String> getDependents(String filePath) {
    return _dependents[filePath]?.toList() ?? [];
  }

  /// Topological sort for correct analysis order
  List<String> topologicalSort({bool throwOnCycle = true}) {
    final sorted = <String>[];
    final visited = <String>{};
    final visiting = <String>{};

    bool visit(String node) {
      if (visited.contains(node)) return true;

      if (visiting.contains(node)) {
        if (throwOnCycle) {
          throw CircularDependencyException(
            'Circular dependency detected: $node',
          );
        }
        return false; // Cycle detected but not throwing
      }

      visiting.add(node);

      for (final dependency in _dependencies[node] ?? <String>[]) {
        if (!visit(dependency)) {
          return false; // Propagate cycle detection
        }
      }

      visiting.remove(node);
      visited.add(node);
      sorted.add(node);
      return true;
    }

    for (final node in _dependencies.keys) {
      if (!visit(node) && throwOnCycle) {
        throw CircularDependencyException('Circular dependencies detected');
      }
    }

    return sorted;
  }

  bool hasCircularDependencies() {
    try {
      topologicalSort();
      return false;
    } on CircularDependencyException {
      return true;
    }
  }
}

class CircularDependencyException implements Exception {
  final String message;
  CircularDependencyException(this.message);

  @override
  String toString() => 'CircularDependencyException: $message';
}
