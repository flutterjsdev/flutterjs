import 'package:meta/meta.dart';
import '../diagnostics/source_location.dart';
import '../ir/ir_node.dart';
import '../ir/type_ir.dart';


// =============================================================================
// KEY TYPE REPRESENTATION
// =============================================================================

/// Represents the type of Key used in a widget
/// 
/// Keys are used to preserve widget state across rebuilds
/// 
/// Examples:
/// - ValueKey<String>('myKey')
/// - ObjectKey(myObject)
/// - UniqueKey()
/// - GlobalKey<MyWidgetState>()
@immutable
class KeyTypeIR extends IRNode {
  /// Kind of key being used
  final KeyKindIR kind;

  /// For ValueKey: the type of value stored
  final TypeIR? valueType;

  /// For GlobalKey: the widget state type it targets
  final TypeIR? targetStateType;

  /// The actual key value/expression (if statically determinable)
  final String? keyValue;

  /// Whether this key is const
  final bool isConst;

  KeyTypeIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.kind,
    this.valueType,
    this.targetStateType,
    this.keyValue,
    this.isConst = false,
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() {
    switch (kind) {
      case KeyKindIR.valueKey:
        return 'ValueKey<${valueType?.displayName() ?? "dynamic"}>';
      case KeyKindIR.objectKey:
        return 'ObjectKey';
      case KeyKindIR.uniqueKey:
        return 'UniqueKey';
      case KeyKindIR.globalKey:
        return 'GlobalKey<${targetStateType?.displayName() ?? "State"}>';
      case KeyKindIR.pageStorageKey:
        return 'PageStorageKey';
      case KeyKindIR.localKey:
        return 'LocalKey';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'kind': kind.name,
      'valueType': valueType?.toJson(),
      'targetStateType': targetStateType?.toJson(),
      'keyValue': keyValue,
      'isConst': isConst,
      'sourceLocation': sourceLocation.toJson(),
    };
  }

  factory KeyTypeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return KeyTypeIR(
      id: json['id'] as String,
      sourceLocation: sourceLocation,
      kind: KeyKindIR.values.byName(json['kind'] as String? ?? 'valueKey'),
      valueType: json['valueType'] != null
          ? TypeIR.fromJson(json['valueType'] as Map<String, dynamic>)
          : null,
      targetStateType: json['targetStateType'] != null
          ? TypeIR.fromJson(json['targetStateType'] as Map<String, dynamic>)
          : null,
      keyValue: json['keyValue'] as String?,
      isConst: json['isConst'] as bool? ?? false,
    );
  }
}

/// Enum for different key types available in Flutter
enum KeyKindIR {
  valueKey,      // ValueKey<T>(value)
  objectKey,     // ObjectKey(object)
  uniqueKey,     // UniqueKey()
  globalKey,     // GlobalKey<T>()
  pageStorageKey, // PageStorageKey(value)
  localKey,      // LocalKey subclasses
}

// =============================================================================
// ASYNC BUILDER REPRESENTATION
// =============================================================================

/// Represents a FutureBuilder or StreamBuilder widget
/// 
/// These are async widgets that rebuild based on data from Futures/Streams
/// 
/// Examples:
/// - FutureBuilder<String>(future: fetchData(), builder: (context, snapshot) { ... })
/// - StreamBuilder<int>(stream: counter(), builder: (context, snapshot) { ... })
@immutable
class AsyncBuilderIR extends IRNode {
  /// Type of async builder
  final AsyncBuilderKindIR kind;

  /// The Future or Stream expression being awaited
  final String futureOrStreamExpression;

  /// Type of data the Future/Stream yields
  final TypeIR dataType;

  /// Initial data value (optional)
  final String? initialData;

  /// The builder function that constructs UI from AsyncSnapshot
  final String builderExpression;

  /// Whether the async operation can fail
  final bool canFail;

  /// Whether builder handles error states explicitly
  final bool handlesErrors;

  /// Whether builder handles loading state explicitly
  final bool handlesLoading;

  AsyncBuilderIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.kind,
    required this.futureOrStreamExpression,
    required this.dataType,
    this.initialData,
    required this.builderExpression,
    this.canFail = true,
    this.handlesErrors = false,
    this.handlesLoading = false,
  }) : super(id: id, sourceLocation: sourceLocation);

  /// Display name based on kind
  String get builderTypeName =>
      kind == AsyncBuilderKindIR.futureBuilder ? 'FutureBuilder' : 'StreamBuilder';

  @override
  String toShortString() =>
      '$builderTypeName<${dataType.displayName()}>(..., builder: ...)';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'kind': kind.name,
      'futureOrStreamExpression': futureOrStreamExpression,
      'dataType': dataType.toJson(),
      'initialData': initialData,
      'builderExpression': builderExpression,
      'canFail': canFail,
      'handlesErrors': handlesErrors,
      'handlesLoading': handlesLoading,
      'sourceLocation': sourceLocation.toJson(),
    };
  }

  factory AsyncBuilderIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return AsyncBuilderIR(
      id: json['id'] as String,
      sourceLocation: sourceLocation,
      kind: AsyncBuilderKindIR.values.byName(
        json['kind'] as String? ?? 'futureBuilder',
      ),
      futureOrStreamExpression: json['futureOrStreamExpression'] as String,
      dataType: TypeIR.fromJson(json['dataType'] as Map<String, dynamic>),
      initialData: json['initialData'] as String?,
      builderExpression: json['builderExpression'] as String,
      canFail: json['canFail'] as bool? ?? true,
      handlesErrors: json['handlesErrors'] as bool? ?? false,
      handlesLoading: json['handlesLoading'] as bool? ?? false,
    );
  }
}

/// Enum for async builder kinds
enum AsyncBuilderKindIR {
  futureBuilder, // FutureBuilder<T>
  streamBuilder, // StreamBuilder<T>
}

// =============================================================================
// WIDGET NODE REPRESENTATION
// =============================================================================

/// Represents a single node in the widget tree
/// 
/// This is the actual runtime structure of widgets
@immutable
class WidgetNodeIR extends IRNode {
  /// Widget type/class name (e.g., "Container", "Text", "CustomWidget")
  final String widgetType;

  /// Constructor name if named constructor (e.g., "fromJson")
  final String? constructorName;

  /// Properties passed to widget (key-value pairs)
  final Map<String, String> properties;

  /// Child widgets (for single-child widgets)
  final List<WidgetNodeIR> children;

  /// Optional key for this widget
  final KeyTypeIR? key;

  /// Whether this widget is declared with `const`
  final bool isConst;

  /// Depth in tree (root = 0)
  final int treeDepth;

  WidgetNodeIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.widgetType,
    this.constructorName,
    this.properties = const {},
    this.children = const [],
    this.key,
    this.isConst = false,
    this.treeDepth = 0,
  }) : super(id: id, sourceLocation: sourceLocation);

  /// Number of widgets in this subtree (including self)
  int get subtreeSize {
    return 1 + children.fold(0, (sum, child) => sum + child.subtreeSize);
  }

  /// Maximum depth of this subtree
  int get subtreeDepth {
    if (children.isEmpty) return 1;
    return 1 + children.map((c) => c.subtreeDepth).reduce((a, b) => a > b ? a : b);
  }

  @override
  String toShortString() =>
      '${isConst ? 'const ' : ''}$widgetType${constructorName != null ? '.${constructorName!}' : ''}${children.isNotEmpty ? ' [${children.length} children]' : ''}';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'widgetType': widgetType,
      'constructorName': constructorName,
      'properties': properties,
      'children': children.map((c) => c.toJson()).toList(),
      'key': key?.toJson(),
      'isConst': isConst,
      'treeDepth': treeDepth,
      'sourceLocation': sourceLocation.toJson(),
    };
  }

  factory WidgetNodeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return WidgetNodeIR(
      id: json['id'] as String,
      sourceLocation: sourceLocation,
      widgetType: json['widgetType'] as String,
      constructorName: json['constructorName'] as String?,
      properties: Map<String, String>.from(
        json['properties'] as Map<String, dynamic>? ?? {},
      ),
      children: (json['children'] as List<dynamic>? ?? [])
          .map((c) => WidgetNodeIR.fromJson(
            c as Map<String, dynamic>,
            sourceLocation,
          ))
          .toList(),
      key: json['key'] != null
          ? KeyTypeIR.fromJson(
            json['key'] as Map<String, dynamic>,
            sourceLocation,
          )
          : null,
      isConst: json['isConst'] as bool? ?? false,
      treeDepth: json['treeDepth'] as int? ?? 0,
    );
  }
}

// =============================================================================
// WIDGET TREE REPRESENTATION
// =============================================================================

/// Represents the complete widget tree rendered by a build method
@immutable
class WidgetTreeIR extends IRNode {
  /// Root node of the tree
  final WidgetNodeIR root;

  /// Total number of nodes in this tree
  final int nodeCount;

  /// Maximum nesting depth
  final int depth;

  /// Conditional branches (where tree differs based on conditions)
  final List<String> conditionalBranches;

  /// Iteration patterns (where dynamic children are generated)
  final List<String> iterationPatterns;

  WidgetTreeIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.root,
    this.nodeCount = 0,
    this.depth = 0,
    this.conditionalBranches = const [],
    this.iterationPatterns = const [],
  }) : super(id: id, sourceLocation: sourceLocation);

  @override
  String toShortString() =>
      'WidgetTree [root: ${root.widgetType}, nodes: $nodeCount, depth: $depth]';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'root': root.toJson(),
      'nodeCount': nodeCount,
      'depth': depth,
      'conditionalBranches': conditionalBranches,
      'iterationPatterns': iterationPatterns,
      'sourceLocation': sourceLocation.toJson(),
    };
  }

  factory WidgetTreeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return WidgetTreeIR(
      id: json['id'] as String,
      sourceLocation: sourceLocation,
      root: WidgetNodeIR.fromJson(
        json['root'] as Map<String, dynamic>,
        sourceLocation,
      ),
      nodeCount: json['nodeCount'] as int? ?? 0,
      depth: json['depth'] as int? ?? 0,
      conditionalBranches: List<String>.from(
        json['conditionalBranches'] as List<dynamic>? ?? [],
      ),
      iterationPatterns: List<String>.from(
        json['iterationPatterns'] as List<dynamic>? ?? [],
      ),
    );
  }
}

// =============================================================================
// SIMPLE TYPE REPRESENTATION
// =============================================================================

/// Represents a simple, non-generic type
@immutable
class SimpleTypeIR extends TypeIR {
  const SimpleTypeIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required String name,
    bool isNullable = false,
  }) : super(
    id: id,
    sourceLocation: sourceLocation,
    name: name,
    isNullable: isNullable,
  );

  @override
  bool get isBuiltIn {
    const builtins = {'int', 'double', 'bool', 'String', 'dynamic', 'void', 'Null'};
    return builtins.contains(name);
  }

  factory SimpleTypeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return SimpleTypeIR(
      id: json['id'] as String,
      sourceLocation: sourceLocation,
      name: json['name'] as String,
      isNullable: json['isNullable'] as bool? ?? false,
    );
  }
}

// =============================================================================
// DYNAMIC TYPE REPRESENTATION
// =============================================================================

/// Represents the dynamic type (untyped)
@immutable
class DynamicTypeIR extends TypeIR {
  const DynamicTypeIR({
    required String id,
    required SourceLocationIR sourceLocation,
  }) : super(
    id: id,
    sourceLocation: sourceLocation,
    name: 'dynamic',
    isNullable: true,
  );

  @override
  bool get isBuiltIn => true;

  @override
  bool isAssignableTo(TypeIR other) => true; // dynamic is assignable to everything
}

// =============================================================================
// VOID TYPE REPRESENTATION
// =============================================================================

/// Represents the void type
@immutable
class VoidTypeIR extends TypeIR {
  const VoidTypeIR({
    required String id,
    required SourceLocationIR sourceLocation,
  }) : super(
    id: id,
    sourceLocation: sourceLocation,
    name: 'void',
    isNullable: false,
  );

  @override
  bool get isBuiltIn => true;
}

// =============================================================================
// NEVER TYPE REPRESENTATION
// =============================================================================

/// Represents the Never type (function never returns)
@immutable
class NeverTypeIR extends TypeIR {
  const NeverTypeIR({
    required String id,
    required SourceLocationIR sourceLocation,
  }) : super(
    id: id,
    sourceLocation: sourceLocation,
    name: 'Never',
    isNullable: false,
  );

  @override
  bool get isBuiltIn => true;
}

// =============================================================================
// STATIC HELPER METHODS
// =============================================================================
