Below is a **DartDoc-style documentation** for the provided `FlutterAppIR`, `ImportIR`, `DependencyGraphIR`, `DependencyNodeIR`, and related classes/enums. The documentation summarizes the purpose, structure, and key functionality of these classes, focusing on their role as intermediate representations (IRs) in a Flutter/Dart project analysis pipeline. It is structured to be clear, concise, and professional, suitable for developers who need to understand the code's intent and usage.

---

## FlutterAppIR

A Dart class representing the intermediate representation (IR) of an entire Flutter/Dart application, aggregating widgets, state classes, functions, routes, animations, providers, imports, themes, and dependency information.

### Overview

The `FlutterAppIR` class serves as the main container for the intermediate representation of a Flutter/Dart project, capturing the analyzed structure and relationships of its components. It is likely used as the output of the `ProjectAnalyzer` (assumed to be part of the broader analysis pipeline, e.g., in `analying_project.dart`) after all analysis phases are complete. The class aggregates various IR types, including widgets, state classes, and dependency graphs, providing a comprehensive model of the application's structure for optimization, code generation, or analysis.

### Purpose

- Aggregates IRs for all analyzed components of a Flutter/Dart project.
- Stores metadata such as version, file structure, and dependency graph.
- Enables downstream processing (e.g., optimization, validation, or code generation) by providing a unified representation.

### Usage

```dart
// Create a FlutterAppIR instance
final appIR = FlutterAppIR(
  version: 2,
  widgets: [WidgetIR(...)],
  stateClasses: [StateClassIR(...)],
  functions: [FunctionIR(...)],
  routes: [RouteIR(...)],
  animations: [AnimationIR(...)],
  providers: [ProviderIR(...)],
  imports: [ImportIR(...)],
  themes: [ThemeIR(...)],
  dependencyGraph: DependencyGraphIR(nodes: [], edges: []),
  fileStructure: {'lib/main.dart': ['MyApp', 'HomePage']},
);

// Access components
print(appIR.widgets); // List of WidgetIR
print(appIR.dependencyGraph); // DependencyGraphIR
```

### Key Components

#### `FlutterAppIR` Class

- **Purpose**: Acts as the top-level IR container for a Flutter/Dart project.
- **Fields**:
  - `version`: An integer indicating the IR schema version (e.g., for compatibility).
  - `widgets`: A list of `WidgetIR` objects representing Flutter widgets (`StatelessWidget` or `StatefulWidget`).
  - `stateClasses`: A list of `StateClassIR` objects representing state classes for `StatefulWidget`s.
  - `functions`: A list of `FunctionIR` objects representing top-level or standalone functions.
  - `routes`: A list of `RouteIR` objects representing navigation routes.
  - `animations`: A list of `AnimationIR` objects representing animation-related constructs.
  - `providers`: A list of `ProviderIR` objects representing state management providers (e.g., `ChangeNotifier`).
  - `imports`: A list of `ImportIR` objects capturing import directives across the project.
  - `themes`: A list of `ThemeIR` objects representing theme configurations (defaults to empty list).
  - `dependencyGraph`: A `DependencyGraphIR` capturing relationships between components (defaults to empty graph).
  - `fileStructure`: A map of file paths to lists of class/function names defined in each file (defaults to empty map).

- **Constructor**:
  - Initializes all required fields and provides defaults for optional fields (`themes`, `dependencyGraph`, `fileStructure`).
  - Ensures a valid `DependencyGraphIR` is always present, even if empty.

---

## ImportIR

A Dart class representing an import directive in the IR, capturing details about the imported URI, prefix, and combinators.

### Overview

The `ImportIR` class models a single import directive in a Dart file, storing information about the import URI, prefix, deferred status, and show/hide combinators. It is used within `FlutterAppIR` to track all imports across the project, aiding in dependency analysis and module resolution.

### Usage

```dart
// Create an ImportIR instance
final importIR = ImportIR(
  uri: 'package:my_app/utils.dart',
  prefix: 'utils',
  isDeferred: false,
  showCombinators: ['MyClass'],
  hideCombinators: ['PrivateClass'],
);

// Access import details
print(importIR.uri); // 'package:my_app/utils.dart'
print(importIR.showCombinators); // ['MyClass']
```

### Key Components

- **Fields**:
  - `uri`: The import URI (e.g., `'package:my_app/utils.dart'` or `'./utils.dart'`).
  - `prefix`: The prefix used in the import (e.g., `'utils'` in `import '...' as utils`), defaults to empty string.
  - `isDeferred`: A boolean indicating if the import is deferred (e.g., `import '...' deferred as ...`).
  - `showCombinators`: A list of names included via `show` combinators (e.g., `show MyClass`).
  - `hideCombinators`: A list of names excluded via `hide` combinators (e.g., `hide PrivateClass`).

- **Constructor**:
  - Requires `uri`; other fields have defaults (`prefix` as empty string, `isDeferred` as `false`, combinators as empty lists).

---

## DependencyGraphIR

A Dart class representing the IR version of a dependency graph, capturing nodes (components) and edges (relationships) in a Flutter/Dart project.

### Overview

The `DependencyGraphIR` class models the dependency relationships between components (e.g., widgets, state classes, providers) in a project. It is a simplified IR representation of the `DependencyGraph` (from `dependency_graph.dart`), designed for inclusion in `FlutterAppIR`. It supports optimization and analysis by providing a structured view of component dependencies.

### Usage

```dart
// Create a DependencyGraphIR instance
final depGraph = DependencyGraphIR(
  nodes: [
    DependencyNodeIR(id: 'w1', type: DependencyType.widget, name: 'MyWidget'),
  ],
  edges: [
    DependencyEdgeIR(fromId: 'w1', toId: 's1', relation: DependencyRelation.dependsOn),
  ],
);

// Access nodes and edges
print(depGraph.nodes); // [DependencyNodeIR(...)]
print(depGraph.edges); // [DependencyEdgeIR(...)]
```

### Key Components

- **Fields**:
  - `nodes`: A list of `DependencyNodeIR` objects representing components (e.g., widgets, state classes).
  - `edges`: A list of `DependencyEdgeIR` objects representing relationships between components.

- **Constructor**:
  - Requires both `nodes` and `edges` lists to ensure a complete graph representation.

---

## DependencyNodeIR

A Dart class representing a node in the `DependencyGraphIR`, corresponding to a specific component in the project.

### Overview

The `DependencyNodeIR` class models a single component (e.g., a widget, state class, or provider) in the dependency graph. It captures the component's identifier, type, and name, enabling tracking of dependencies at the component level.

### Usage

```dart
// Create a DependencyNodeIR instance
final node = DependencyNodeIR(
  id: 'w1',
  type: DependencyType.widget,
  name: 'MyWidget',
);

// Access node details
print(node.name); // 'MyWidget'
print(node.type); // DependencyType.widget
```

### Key Components

- **Fields**:
  - `id`: A unique identifier for the component (e.g., `'w1'`).
  - `type`: A `DependencyType` enum value indicating the component type (e.g., `widget`, `state`).
  - `name`: The name of the component (e.g., `'MyWidget'`).

- **Constructor**:
  - Requires all fields (`id`, `type`, `name`) for complete node definition.

---

## DependencyType

An enum defining the types of components in the `DependencyGraphIR`.

### Values

- `widget`: Represents a Flutter widget (`StatelessWidget` or `StatefulWidget`).
- `state`: Represents a state class (`State<T>` for `StatefulWidget`).
- `provider`: Represents a state management provider (e.g., `ChangeNotifier`).
- `service`: Represents a service or utility class (e.g., API clients).
- `utility`: Represents other utility components (e.g., helper functions or classes).

---

## DependencyEdgeIR

A Dart class representing an edge in the `DependencyGraphIR`, capturing a relationship between two components.

### Overview

The `DependencyEdgeIR` class models a directed relationship between two components (nodes) in the dependency graph, specifying the source and target components and the nature of their relationship.

### Usage

```dart
// Create a DependencyEdgeIR instance
final edge = DependencyEdgeIR(
  fromId: 'w1',
  toId: 's1',
  relation: DependencyRelation.dependsOn,
);

// Access edge details
print(edge.fromId); // 'w1'
print(edge.relation); // DependencyRelation.dependsOn
```

### Key Components

- **Fields**:
  - `fromId`: The ID of the source component (e.g., `'w1'`).
  - `toId`: The ID of the target component (e.g., `'s1'`).
  - `relation`: A `DependencyRelation` enum value describing the relationship type.

- **Constructor**:
  - Requires all fields (`fromId`, `toId`, `relation`) for complete edge definition.

---

## DependencyRelation

An enum defining the types of relationships between components in the `DependencyGraphIR`.

### Values

- `uses`: The source component uses the target component (e.g., a widget uses a provider).
- `extendsJS`: The source component extends the target component (e.g., a class extends another).
- `implements`: The source component implements the target interface.
- `mixesWith`: The source component includes the target as a mixin.
- `dependsOn`: A generic dependency (e.g., a widget depends on a utility class).

---

### Dependencies

- **IR Schema**: Relies on `WidgetIR`, `StateClassIR`, `FunctionIR`, `RouteIR`, `AnimationIR`, `ProviderIR`, and `ThemeIR` (from `widget_ir.dart` and `statement_ir.dart`) for component representations.
- **No External Packages**: The implementation is self-contained, using Dart's standard library.

### Assumptions and Limitations

- Assumes all referenced IR classes (`WidgetIR`, `StateClassIR`, etc.) are defined elsewhere in the project.
- The `version` field implies potential schema evolution, but no validation is provided in the code.
- The `dependencyGraph` and `fileStructure` fields default to empty structures, which may require explicit initialization in practice.
- The IR is designed for Flutter projects, focusing on Flutter-specific components (widgets, state, providers).

### Notes

- The `FlutterAppIR` is likely the final output of the `ProjectAnalyzer`'s analysis pipeline, aggregating results from multiple phases (dependency resolution, type resolution, IR generation, and linking).
- The `DependencyGraphIR` provides a component-level view of dependencies, complementing the file-level `DependencyGraph` (from `dependency_graph.dart`).
- The `ImportIR` class supports import analysis, which is critical for resolving dependencies and ensuring correct module boundaries.
- The enums (`DependencyType`, `DependencyRelation`) provide a structured way to classify components and relationships, enabling precise analysis and optimization.

---

This documentation provides a comprehensive overview of the `FlutterAppIR`, `ImportIR`, `DependencyGraphIR`, `DependencyNodeIR`, and related enums, detailing their roles in representing a Flutter/Dart project's structure. Let me know if you need further clarification, additional details, or documentation for related components!