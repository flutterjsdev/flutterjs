
// import '../Expression/expression_ir.dart';
// import '../Statement/statement_ir.dart';
// import '../file_ir.dart';

// class WidgetIR {
//   final String id;
//   final String name;
//   final String type; // StatefulWidget, StatelessWidget, etc.
//   final WidgetClassification classification;
//   final bool isStateful;
  
//   // Properties and fields
//   final List<PropertyIR> properties;
//   final List<FieldIR> fields;
//   final ConstructorIR? constructor;
  
//   // Build method
//   final BuildMethodIR? buildMethod;
  
//   // Children and composition
//   final List<WidgetIR> children;
//   final WidgetTreeIR? widgetTree;
  
//   // State and reactivity
//   final ReactivityInfoIR? reactivityInfo;
//   final StateBindingIR? stateBinding;
  
//   // Lifecycle
//   final List<LifecycleMethodIR> lifecycleMethods;
  
//   // Event handlers
//   final List<EventHandlerIR> eventHandlers;
  
//   // Keys
//   final KeyIR? key;
  
//   // Annotations
//   final List<AnnotationIR> annotations;
  
//   // Source location
//   final SourceLocationIR sourceLocation;

//   WidgetIR({
//     required this.id,
//     required this.name,
//     required this.type,
//     required this.classification,
//     required this.isStateful,
//     required this.properties,
//     required this.fields,
//     this.constructor,
//     this.buildMethod,
//     required this.children,
//     this.widgetTree,
//     this.reactivityInfo,
//     this.stateBinding,
//     required this.lifecycleMethods,
//     required this.eventHandlers,
//     this.key,
//     required this.annotations,
//     required this.sourceLocation,
//   });

//   factory WidgetIR.fromJson(Map<String, dynamic> json) {
//     return WidgetIR(
//       id: json['id'] as String,
//       name: json['name'] as String,
//       type: json['type'] as String,
//       classification: WidgetClassification.values.firstWhere(
//         (wc) => wc.name == json['classification'],
//         orElse: () => WidgetClassification.nonUI,
//       ),
//       isStateful: json['isStateful'] as bool? ?? false,
//       properties: (json['properties'] as List<dynamic>?)
//           ?.map((p) => PropertyIR.fromJson(p as Map<String, dynamic>))
//           .toList() ?? [],
//       fields: (json['fields'] as List<dynamic>?)
//           ?.map((f) => FieldIR.fromJson(f as Map<String, dynamic>))
//           .toList() ?? [],
//       constructor: json['constructor'] != null
//           ? ConstructorIR.fromJson(json['constructor'] as Map<String, dynamic>)
//           : null,
//       buildMethod: json['buildMethod'] != null
//           ? BuildMethodIR.fromJson(json['buildMethod'] as Map<String, dynamic>)
//           : null,
//       children: (json['children'] as List<dynamic>?)
//           ?.map((c) => WidgetIR.fromJson(c as Map<String, dynamic>))
//           .toList() ?? [],
//       widgetTree: json['widgetTree'] != null
//           ? WidgetTreeIR.fromJson(json['widgetTree'] as Map<String, dynamic>)
//           : null,
//       reactivityInfo: json['reactivityInfo'] != null
//           ? ReactivityInfoIR.fromJson(
//               json['reactivityInfo'] as Map<String, dynamic>)
//           : null,
//       stateBinding: json['stateBinding'] != null
//           ? StateBindingIR.fromJson(
//               json['stateBinding'] as Map<String, dynamic>)
//           : null,
//       lifecycleMethods: (json['lifecycleMethods'] as List<dynamic>?)
//           ?.map((lm) => LifecycleMethodIR.fromJson(lm as Map<String, dynamic>))
//           .toList() ?? [],
//       eventHandlers: (json['eventHandlers'] as List<dynamic>?)
//           ?.map((eh) => EventHandlerIR.fromJson(eh as Map<String, dynamic>))
//           .toList() ?? [],
//       key: json['key'] != null
//           ? KeyIR.fromJson(json['key'] as Map
//               <String, dynamic>)
//           : null,
//       annotations: (json['annotations'] as List<dynamic>?)
//           ?.map((a) => AnnotationIR.fromJson(a as Map<String, dynamic>))
//           .toList() ?? [],
//       sourceLocation: SourceLocationIR.fromJson(
//           json['sourceLocation'] as Map<String, dynamic>),
//     );
//   }
//     Map<String, dynamic> toJson() {
//     return {  
//       'id': id,
//       'name': name,
//       'type': type,
//       'classification': classification.name,
//       'isStateful': isStateful,
//       'properties': properties.map((p) => p.toJson()).toList(),
//       'fields': fields.map((f) => f.toJson()).toList(),
//       'constructor': constructor?.toJson(),
//       'buildMethod': buildMethod?.toJson(),
//       'children': children.map((c) => c.toJson()).toList(),
//       'widgetTree': widgetTree?.toJson(),
//       'reactivityInfo': reactivityInfo?.toJson(),
//       'stateBinding': stateBinding?.toJson(),
//       'lifecycleMethods': lifecycleMethods.map((lm) => lm.toJson()).toList(),
//       'eventHandlers': eventHandlers.map((eh) => eh.toJson()).toList(),
//       'key': key?.toJson(),
//       'annotations': annotations.map((a) => a.toJson()).toList(),
//       'sourceLocation': sourceLocation.toJson(),
//     };  

// }
// }

// enum WidgetClassification {
//   stateless,
//   stateful,
//   inherited,
//   function,
//   nonUI,
//   animated,
//   layout,
//   input,
//   display,
//   navigation,
// }


// enum VisibilityModifier {
//   public,
//   private,
//   protected,
// }

// class ConstructorIR {
//   final String name;
//   final List<ParameterIR> parameters;
//   final List<StatementIR> initializers;
//   final StatementIR? body;
//   final bool isConst;
//   final bool isFactory;

//   ConstructorIR({
//     required this.name,
//     required this.parameters,
//     this.initializers = const [],
//     this.body,
//     this.isConst = false,
//     this.isFactory = false,
//   });
//   factory ConstructorIR.fromJson(Map<String, dynamic> json) {
//     return ConstructorIR(
//       name: json['name'] as String,
//       parameters: (json['parameters'] as List<dynamic>)
//           .map((p) => ParameterIR.fromJson(p as Map<String, dynamic>))
//           .toList(),
//       initializers: (json['initializers'] as List<dynamic>?)
//           ?.map((s) => StatementIR.fromJson(s as Map<String, dynamic>))
//           .toList() ?? [],
//       body: json['body'] != null
//           ? StatementIR.fromJson(json['body'] as Map<String, dynamic>)
//           : null,
//       isConst: json['isConst'] as bool? ?? false,
//       isFactory: json['isFactory'] as bool? ?? false,
//     );
//   }
 
//   Map<String, dynamic> toJson() {
//     return {
//       'name': name,
//       'parameters': parameters.map((p) => p.toJson()).toList(),
//       'initializers': initializers.map((s) => s.toJson()).toList(),
//       'body': body?.toJson(),
//       'isConst': isConst,
//       'isFactory': isFactory,
//     };
//   }

// }

// // class ParameterIR {
// //   final String name;
// //   final TypeIR type;
// //   final ExpressionIR? defaultValue;
// //   final bool isRequired;
// //   final bool isNamed;
// //   final bool isPositional;
// //   final List<AnnotationIR> annotations;

// //   ParameterIR({
// //     required this.name,
// //     required this.type,
// //     this.defaultValue,
// //     this.isRequired = false,
// //     this.isNamed = false,
// //     this.isPositional = true,
// //     this.annotations = const [],
// //   });
// // }

// class BuildMethodIR {
//   final List<ParameterIR> parameters;
//   final ExpressionIR returnExpression;
//   final List<StatementIR> statements;
//   final List<LocalVariableIR> localVariables;
//   final List<String> capturedVariables;
//   final WidgetTreeIR widgetTree;

//   BuildMethodIR({
//     required this.parameters,
//     required this.returnExpression,
//     this.statements = const [],
//     required this.localVariables,
//     required this.capturedVariables,
//     required this.widgetTree,
//   });
//   factory BuildMethodIR.fromJson(Map<String, dynamic> json) {
//     return BuildMethodIR(
//       parameters: (json['parameters'] as List<dynamic>)
//           .map((p) => ParameterIR.fromJson(p as Map<String, dynamic>))
//           .toList(),
//       returnExpression:
//           ExpressionIR.fromJson(json['returnExpression'] as Map<String, dynamic>),
//       statements: (json['statements'] as List<dynamic>?)
//           ?.map((s) => StatementIR.fromJson(s as Map<String, dynamic>))
//           .toList() ?? [],
//       localVariables: (json['localVariables'] as List<dynamic>)
//           .map((lv) => LocalVariableIR.fromJson(lv as Map<String, dynamic>))
//           .toList(),
//       capturedVariables: (json['capturedVariables'] as List<dynamic>)
//           .map((cv) => cv as String)
//           .toList(),
//       widgetTree: WidgetTreeIR.fromJson(json['widgetTree'] as Map<String, dynamic>),
//     );
//   }
//   Map<String, dynamic> toJson() {
//     return {
//       'parameters': parameters.map((p) => p.toJson()).toList(),
//       'returnExpression': returnExpression.toJson(),
//       'statements': statements.map((s) => s.toJson()).toList(),
//       'localVariables': localVariables.map((lv) => lv.toJson()).toList(),
//       'capturedVariables': capturedVariables,
//       'widgetTree': widgetTree.toJson(),
//     };
//   }
// }

// class LocalVariableIR {
//   final String name;
//   final TypeIR type;
//   final ExpressionIR? initializer;
//   final bool isFinal;
//   final bool isLate;

//   LocalVariableIR({
//     required this.name,
//     required this.type,
//     this.initializer,
//     this.isFinal = false,
//     this.isLate = false,
//   });

//   factory LocalVariableIR.fromJson(Map<String, dynamic> json) {
//     return LocalVariableIR(
//       name: json['name'] as String,
//       type: TypeIR.fromJson(json['type'] as Map<String, dynamic>),
//       initializer: json['initializer'] != null
//           ? ExpressionIR.fromJson(json['initializer'] as Map<String, dynamic>)
//           : null,
//       isFinal: json['isFinal'] as bool? ?? false,
//       isLate: json['isLate'] as bool? ?? false,
//     );
//   }
//   Map<String, dynamic> toJson() {
//     return {
//       'name': name,
//       'type': type.toJson(),
//       'initializer': initializer?.toJson(),
//       'isFinal': isFinal,
//       'isLate': isLate,
//     };
//   }
// }

// class WidgetTreeIR {
//   final WidgetNodeIR root;
//   final List<ConditionalBranchIR> conditionalBranches;
//   final List<IterationIR> iterations;
//   final int depth;
//   final int nodeCount;

//   WidgetTreeIR({
//     required this.root,
//     this.conditionalBranches = const [],
//     this.iterations = const [],
//     required this.depth,
//     required this.nodeCount,
//   });
//   factory WidgetTreeIR.fromJson(Map<String, dynamic> json) {
//     return WidgetTreeIR(
//       root: WidgetNodeIR.fromJson(json['root'] as Map<String, dynamic>),
//       conditionalBranches: (json['conditionalBranches'] as List<dynamic>?)
//           ?.map((cb) => ConditionalBranchIR.fromJson(cb as Map<String, dynamic>))
//           .toList() ?? [],
//       iterations: (json['iterations'] as List<dynamic>?)
//           ?.map((it) => IterationIR.fromJson(it as Map<String, dynamic>))
//           .toList() ?? [],
//       depth: json['depth'] as int,
//       nodeCount: json['nodeCount'] as int,
//     );
//   }
//   Map<String, dynamic> toJson() {
//     return {
//       'root': root.toJson(),
//       'conditionalBranches': conditionalBranches.map((cb) => cb.toJson()).toList(),
//       'iterations': iterations.map((it) => it.toJson()).toList(),
//       'depth': depth,
//       'nodeCount': nodeCount,
//     };
//   }
// }

// class ConditionalBranchIR {
//   final ExpressionIR condition;
//   final WidgetNodeIR thenWidget;
//   final WidgetNodeIR? elseWidget;
//   final ConditionalType type;

//   ConditionalBranchIR({
//     required this.condition,
//     required this.thenWidget,
//     this.elseWidget,
//     required this.type,
//   });
//   factory ConditionalBranchIR.fromJson(Map<String, dynamic> json) {
//     return ConditionalBranchIR(
//       condition: ExpressionIR.fromJson(json['condition'] as Map<String, dynamic>),
//       thenWidget: WidgetNodeIR.fromJson(json['thenWidget'] as Map<String, dynamic>),
//       elseWidget: json['elseWidget'] != null
//           ? WidgetNodeIR.fromJson(json['elseWidget'] as Map<String, dynamic>)
//           : null,
//       type: ConditionalType.values.firstWhere(
//         (ct) => ct.name == json['type'],
//         orElse: () => ConditionalType.ifStatement,
//       ),
//     );
//   }
//   Map<String, dynamic> toJson() {
//     return {
//       'condition': condition.toJson(),
//       'thenWidget': thenWidget.toJson(),
//       'elseWidget': elseWidget?.toJson(),
//       'type': type.name,
//     };
//   }
// }

// enum ConditionalType {
//   ternary,
//   ifStatement,
//   switchCase,
// }

// class IterationIR {
//   final String iteratorVariable;
//   final ExpressionIR iterable;
//   final WidgetNodeIR itemBuilder;
//   final IterationType type;
//   final ExpressionIR? filter;

//   IterationIR({
//     required this.iteratorVariable,
//     required this.iterable,
//     required this.itemBuilder,
//     required this.type,
//     this.filter,
//   });

//   factory IterationIR.fromJson(Map<String, dynamic> json) {
//     return IterationIR(
//       iteratorVariable: json['iteratorVariable'] as String,
//       iterable: ExpressionIR.fromJson(json['iterable'] as Map<String, dynamic>),
//       itemBuilder: WidgetNodeIR.fromJson(json['itemBuilder'] as Map<String, dynamic>),
//       type: IterationType.values.firstWhere(
//         (it) => it.name == json['type'],
//         orElse: () => IterationType.forEach,
//       ),
//       filter: json['filter'] != null
//           ? ExpressionIR.fromJson(json['filter'] as Map<String, dynamic>)
//           : null,
//     );
//   }

//   Map<String, dynamic> toJson() {
//     return {
//       'iteratorVariable': iteratorVariable,
//       'iterable': iterable.toJson(),
//       'itemBuilder': itemBuilder.toJson(),
//       'type': type.name,
//       'filter': filter?.toJson(),
//     };
//   }
// }

// enum IterationType {
//   map,
//   forEach,
//   listGenerate,
//   builder,
// }

// class KeyIR {
//   final KeyType type;
//   final ExpressionIR value;

//   KeyIR({
//     required this.type,
//     required this.value,
//   });
//   factory KeyIR.fromJson(Map<String, dynamic> json) {
//     return KeyIR(
//       type: KeyType.values.firstWhere(
//         (kt) => kt.name == json['type'],
//         orElse: () => KeyType.valueKey,
//       ),
//       value: ExpressionIR.fromJson(json['value'] as Map<String, dynamic>),
//     );
//   }
//   Map<String, dynamic> toJson() {
//     return {
//       'type': type.name,
//       'value': value.toJson(),
//     };
//   }
// }

// enum KeyType {
//   valueKey,
//   objectKey,
//   uniqueKey,
//   globalKey,
//   pageStorageKey,
// }

