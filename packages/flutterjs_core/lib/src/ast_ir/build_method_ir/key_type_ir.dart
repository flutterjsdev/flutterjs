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
  valueKey, // ValueKey<T>(value)
  objectKey, // ObjectKey(object)
  uniqueKey, // UniqueKey()
  globalKey, // GlobalKey<T>()
  pageStorageKey, // PageStorageKey(value)
  localKey, // LocalKey subclasses
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
  String get builderTypeName => kind == AsyncBuilderKindIR.futureBuilder
      ? 'FutureBuilder'
      : 'StreamBuilder';

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
