
// import '../Statement/statement_ir.dart';
// import '../file_ir.dart';
// import '../widget/widget_ir.dart';

// class AnnotationIR {
//   final String name;
//   final List<ExpressionIR> arguments;

//   AnnotationIR({
//     required this.name,
//     required this.arguments,
//   });

//   factory AnnotationIR.fromJson(Map<String, dynamic> json) {
//     return AnnotationIR(
//       name: json['name'] as String,
//       arguments: (json['arguments'] as List?)
//           ?.map((a) => ExpressionIR.fromJson(a as Map<String, dynamic>))
//           .toList() ?? [],
//     );
//   }
//   Map<String, dynamic> toJson() {
//     return {
//       'name': name,
//       'arguments': arguments.map((a) => a.toJson()).toList(),
//     };
//   }
// }

// class ParameterIR {
//   final String name;
//   final TypeIR type;
//   final bool isOptional;
//   final bool isNamed;
//   final bool isRequired;
//   final ExpressionIR? defaultValue;

//   ParameterIR({
//     required this.name,
//     required this.type,
//     this.isOptional = false,
//     this.isNamed = false,
//     this.isRequired = false,
//     this.defaultValue,
//   });

//   factory ParameterIR.fromJson(Map<String, dynamic> json) {
//     return ParameterIR(
//       name: json['name'] as String,
//       type: TypeIR.fromJson(json['type'] as Map<String, dynamic>),
//       isOptional: json['isOptional'] as bool? ?? false,
//       isNamed: json['isNamed'] as bool? ?? false,
//       isRequired: json['isRequired'] as bool? ?? false,
//       defaultValue: json['defaultValue'] != null
//           ? ExpressionIR.fromJson(json['defaultValue'] as Map<String, dynamic>)
//           : null,
//     );
//   }
//   Map<String, dynamic> toJson() {
//     return {
//       'name': name,
//       'type': type.toJson(),
//       'isOptional': isOptional,
//       'isNamed': isNamed,
//       'isRequired': isRequired,
//       'defaultValue': defaultValue?.toJson(),
//     };
//   }
// }

// class MethodIR {
//   final String name;
//   final TypeIR? returnType;
//   final List<ParameterIR> parameters;
//   final List<StatementIR> body;
//   final ExpressionIR? returnExpression;
//   final bool isAsync;
//   final bool isGenerator;
//   final bool isStatic;
//   final bool isAbstract;
//   final bool isGetter ;
//   final bool isSetter ;
//   final List<AnnotationIR> annotations;
//   final SourceLocationIR sourceLocation;

//   MethodIR({
//     required this.name,
//     required this.returnType,
//     required this.parameters,
//     required this.body,
//     required this.returnExpression,
//     required this.isAsync,
//     required this.isGenerator,
//     required this.isStatic,
//     required this.isAbstract,
//     required this.annotations,
//     required this.sourceLocation,
//    required this.isGetter ,
//    required this.isSetter ,
//   });
// factory MethodIR.fromJson(Map<String, dynamic> json) {
//     return MethodIR(
//       name: json['name'] as String,
//       returnType: json['returnType'] != null
//           ? TypeIR.fromJson(json['returnType'] as Map<String, dynamic>)
//           : null,
//       parameters: (json['parameters'] as List?)
//           ?.map((p) => ParameterIR.fromJson(p as Map<String, dynamic>))
//           .toList() ?? [],
//       body: (json['body'] as List?)
//           ?.map((s) => StatementIR.fromJson(s as Map<String, dynamic>))
//           .toList() ?? [],
//       returnExpression: json['returnExpression'] != null
//           ? ExpressionIR.fromJson(json['returnExpression'] as Map<String, dynamic>)
//           : null,
//       isAsync: json['isAsync'] as bool? ?? false,
//       isGenerator: json['isGenerator'] as bool? ?? false,
//       isStatic: json['isStatic'] as bool? ?? false,
//       isAbstract: json['isAbstract'] as bool? ?? false,
//       isGetter: json['isGetter'] as bool? ?? false,
//       isSetter: json['isSetter'] as bool? ?? false,
//       annotations: (json['annotations'] as List?)
//           ?.map((a) => AnnotationIR.fromJson(a as Map<String, dynamic>))
//           .toList() ?? [],
//       sourceLocation: SourceLocationIR.fromJson(
//         json['sourceLocation'] as Map<String, dynamic>,
//       ),
//     );
//   }
//   Map<String, dynamic> toJson() {
//     return {
//       'name': name,
//       'returnType': returnType?.toJson(),
//       'parameters': parameters.map((p) => p.toJson()).toList(),
//       'body': body.map((s) => s.toJson()).toList(),
//       'returnExpression': returnExpression?.toJson(),
//       'isAsync': isAsync,
//       'isGenerator': isGenerator,
//       'isStatic': isStatic,
//       'isAbstract': isAbstract,
//       'isGetter': isGetter,
//       'isSetter': isSetter,
//       'annotations': annotations.map((a) => a.toJson()).toList(),
//       'sourceLocation': sourceLocation.toJson(),
//     };
//   }

// }

// abstract class ExpressionIR {
//   final String id;
//   final TypeIR resultType;
//   final SourceLocationIR sourceLocation;

//   ExpressionIR({
//     required this.id,
//     required this.resultType,
//     required this.sourceLocation,
//   });

//   factory ExpressionIR.fromJson(Map<String, dynamic> json) {
//     final type = json['expressionType'] as String?;
//     switch (type) {
//       case 'LiteralExpressionIR':
//         return LiteralExpressionIR(
//           id: json['id'] as String,
//           resultType: TypeIR.fromJson(json['resultType'] as Map<String, dynamic>),
//           sourceLocation: SourceLocationIR.fromJson(json['sourceLocation'] as Map<String, dynamic>),
//           value: json['value'],
//           literalType: LiteralType.values.firstWhere(
//             (lt) => lt.name == json['literalType'],
//             orElse: () => LiteralType.nullValue,
//           ),
//         );
//       case 'IdentifierExpressionIR':
//         return IdentifierExpressionIR(
//           id: json['id'] as String,
//           resultType: TypeIR.fromJson(json['resultType'] as Map<String, dynamic>),
//           sourceLocation: SourceLocationIR.fromJson(json['sourceLocation'] as Map<String, dynamic>),
//           name: json['name'] as String,
//           isThisReference: json['isThisReference'] as bool? ?? false,
//           isSuperReference: json['isSuperReference'] as bool? ?? false,
//         );
//       case 'BinaryExpressionIR':
//         return BinaryExpressionIR(
//           id: json['id'] as String,
//           resultType: TypeIR.fromJson(json['resultType'] as Map<String, dynamic>),
//           sourceLocation: SourceLocationIR.fromJson(json['sourceLocation'] as Map<String, dynamic>),
//           left: ExpressionIR.fromJson(json['left'] as Map<String, dynamic>),
//           operator: BinaryOperator.values.firstWhere(
//             (op) => op.name == json['operator'],
//             orElse: () => BinaryOperator.add,
//           ),
//           right: ExpressionIR.fromJson(json['right'] as Map<String, dynamic>),
//         );
//       // Add cases for other expression types...
//       default:
//         throw UnimplementedError('Unknown ExpressionIR type: $type');
//     }
//   }

//   Map<String, dynamic> toJson() {
//     return {
//       'id': id,
//       'resultType': resultType.toJson(),
//       'sourceLocation': sourceLocation.toJson(),
//       'expressionType': runtimeType.toString(),
//     };
//   }
// }

// class LiteralExpressionIR extends ExpressionIR {
//   final dynamic value;
//   final LiteralType literalType;

//   LiteralExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.value,
//     required this.literalType,
//   });
// }

// enum LiteralType {
//   string,
//   integer,
//   double,
//   boolean,
//   nullValue,
//   list,
//   map,
//   set,
// }

// class IdentifierExpressionIR extends ExpressionIR {
//   final String name;
//   final bool isThisReference;
//   final bool isSuperReference;

//   IdentifierExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.name,
//     this.isThisReference = false,
//     this.isSuperReference = false,
//   });
// }

// class BinaryExpressionIR extends ExpressionIR {
//   final ExpressionIR left;
//   final BinaryOperator operator;
//   final ExpressionIR right;

//   BinaryExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.left,
//     required this.operator,
//     required this.right,
//   });
// }

// enum BinaryOperator {
//   add, subtract, multiply, divide, modulo,
//   equals, notEquals, lessThan, lessOrEqual, greaterThan, greaterOrEqual,
//   logicalAnd, logicalOr,
//   bitwiseAnd, bitwiseOr, bitwiseXor,
//   leftShift, rightShift,
//   nullCoalesce,
// }

// class UnaryExpressionIR extends ExpressionIR {
//   final UnaryOperator operator;
//   final ExpressionIR operand;
//   final bool isPrefix;

//   UnaryExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.operator,
//     required this.operand,
//     this.isPrefix = true,
//   });
// }

// enum UnaryOperator {
//   negate,
//   not,
//   bitwiseNot,
//   increment,
//   decrement,
//   nullCheck,
// }

// class MethodCallExpressionIR extends ExpressionIR {
//   final ExpressionIR? target;
//   final String methodName;
//   final List<ExpressionIR> arguments;
//   final Map<String, ExpressionIR> namedArguments;
//   final List<TypeIR> typeArguments;
//   final bool isNullAware;
//   final bool isCascade;

//   MethodCallExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     this.target,
//     required this.methodName,
//     this.arguments = const [],
//     this.namedArguments = const {},
//     this.typeArguments = const [],
//     this.isNullAware = false,
//     this.isCascade = false,
//   });
//   factory MethodCallExpressionIR.fromJson(Map<String, dynamic> json) {
//     return MethodCallExpressionIR(
//       id: json['id'] as String,
//       resultType: TypeIR.fromJson(json['resultType'] as Map<String, dynamic>),
//       sourceLocation: SourceLocationIR.fromJson(json['sourceLocation'] as Map<String, dynamic>),
//       target: json['target'] != null
//           ? ExpressionIR.fromJson(json['target'] as Map<String, dynamic>)
//           : null,
//       methodName: json['methodName'] as String,
//       arguments: (json['arguments'] as List?)
//           ?.map((a) => ExpressionIR.fromJson(a as Map<String, dynamic>))
//           .toList() ?? [],
//       namedArguments: (json['namedArguments'] as Map<String, dynamic>?)?.map(
//             (k, v) => MapEntry(k, ExpressionIR.fromJson(v as Map<String, dynamic>)),
//           ) ?? {},
//       typeArguments: (json['typeArguments'] as List?)
//           ?.map((t) => TypeIR.fromJson(t as Map<String, dynamic>))
//           .toList() ?? [],
//       isNullAware: json['isNullAware'] as bool? ?? false,
//       isCascade: json['isCascade'] as bool? ?? false,
//     );
//   }

//   Map<String, dynamic> toClassJson() {
//     return {
//       ...super.toJson(),
//       'target': target?.toJson(),
//       'methodName': methodName,
//       'arguments': arguments.map((a) => a.toJson()).toList(),
//       'namedArguments': namedArguments.map((k, v) => MapEntry(k, v.toJson())),
//       'typeArguments': typeArguments.map((t) => t.toJson()).toList(),
//       'isNullAware': isNullAware,
//       'isCascade': isCascade,
//     };
//   }
// }

// class PropertyAccessExpressionIR extends ExpressionIR {
//   final ExpressionIR target;
//   final String propertyName;
//   final bool isNullAware;
//   final bool isCascade;

//   PropertyAccessExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.target,
//     required this.propertyName,
//     this.isNullAware = false,
//     this.isCascade = false,
//   });
// }

// class ConditionalExpressionIR extends ExpressionIR {
//   final ExpressionIR condition;
//   final ExpressionIR thenExpression;
//   final ExpressionIR elseExpression;

//   ConditionalExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.condition,
//     required this.thenExpression,
//     required this.elseExpression,
//   });
// }

// class FunctionExpressionIR extends ExpressionIR {
//   final List<ParameterIR> parameters;
//   final StatementIR? body;
//   final ExpressionIR? expressionBody;
//   final bool isAsync;
//   final bool isGenerator;
//   final List<String> capturedVariables;

//   FunctionExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.parameters,
//     this.body,
//     this.expressionBody,
//     this.isAsync = false,
//     this.isGenerator = false,
//     this.capturedVariables = const [],
//   });
//   factory FunctionExpressionIR.fromJson(Map<String, dynamic> json) {
//     return FunctionExpressionIR(
//       id: json['id'] as String,
//       resultType: TypeIR.fromJson(json['resultType'] as Map<String, dynamic>),
//       sourceLocation: SourceLocationIR.fromJson(json['sourceLocation'] as Map<String, dynamic>),
//       parameters: (json['parameters'] as List?)
//           ?.map((p) => ParameterIR.fromJson(p as Map<String, dynamic>))
//           .toList() ?? [],
//       body: json['body'] != null
//           ? StatementIR.fromJson(json['body'] as Map<String, dynamic>)
//           : null,
//       expressionBody: json['expressionBody'] != null
//           ? ExpressionIR.fromJson(json['expressionBody'] as Map<String, dynamic>)
//           : null,
//       isAsync: json['isAsync'] as bool? ?? false,
//       isGenerator: json['isGenerator'] as bool? ?? false,
//       capturedVariables: (json['capturedVariables'] as List?)
//           ?.map((v) => v as String)
//           .toList() ?? [],
//     );
//   }

//   Map<String, dynamic> toJson() {
//     return {
//       ...super.toJson(),
//       'parameters': parameters.map((p) => p.toJson()).toList(),
//       'body': body?.toJson(),
//       'expressionBody': expressionBody?.toJson(),
//       'isAsync': isAsync,
//       'isGenerator': isGenerator,
//       'capturedVariables': capturedVariables,
//     };
//   }
// }

// class ListExpressionIR extends ExpressionIR {
//   final List<ExpressionIR> elements;
//   final TypeIR elementType;
//   final bool isConst;

//   ListExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.elements,
//     required this.elementType,
//     this.isConst = false,
//   });
// }

// class MapExpressionIR extends ExpressionIR {
//   final List<MapEntryIR> entries;
//   final TypeIR keyType;
//   final TypeIR valueType;
//   final bool isConst;

//   MapExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.entries,
//     required this.keyType,
//     required this.valueType,
//     this.isConst = false,
//   });
// }

// class MapEntryIR {
//   final ExpressionIR key;
//   final ExpressionIR value;

//   MapEntryIR({
//     required this.key,
//     required this.value,
//   });
// }

// class AwaitExpressionIR extends ExpressionIR {
//   final ExpressionIR expression;

//   AwaitExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.expression,
//   });
// }

// class AsExpressionIR extends ExpressionIR {
//   final ExpressionIR expression;
//   final TypeIR targetType;

//   AsExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.expression,
//     required this.targetType,
//   });
// }

// class IsExpressionIR extends ExpressionIR {
//   final ExpressionIR expression;
//   final TypeIR targetType;
//   final bool isNegated;

//   IsExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.expression,
//     required this.targetType,
//     this.isNegated = false,
//   });
// }

// class InterpolatedStringExpressionIR extends ExpressionIR {
//   final List<ExpressionIR> parts;

//   InterpolatedStringExpressionIR({
//     required super.id,
//     required super.resultType,
//     required super.sourceLocation,
//     required this.parts,
//   });
// }


// // ==========================================================================
// // CLASS IR - Regular Dart Classes (non-Widget)
// // ==========================================================================

// /// Represents a regular Dart class (models, utilities, services, etc.)
// /// This is distinct from WidgetIR and StateClassIR
// class ClassIR {
//   /// Unique identifier for this class
//   final String id;
  
//   /// Class name
//   final String name;
  
//   /// Fields/properties of the class
//   final List<FieldIR> fields;
  
//   /// Methods defined in the class
//   final List<MethodIR> methods;
  
//   /// Constructors (can have multiple named constructors)
//   final List<ConstructorIR> constructors;
  
//   /// Default constructor (convenience accessor)
//   final ConstructorIR? constructor;
  
//   /// Superclass name (if extends)
//   final String? superclass;
  
//   /// Implemented interfaces
//   final List<String> interfaces;
  
//   /// Applied mixins
//   final List<String> mixins;
  
//   /// Generic type parameters
//   final List<TypeParameterIR> typeParameters;
  
//   /// Whether this is an abstract class
//   final bool isAbstract;
  
//   /// Whether this is a mixin class
//   final bool isMixin;
  
//   /// Whether this is an enum
//   final bool isEnum;
  
//   /// Enum values (if isEnum is true)
//   final List<EnumValueIR> enumValues;
  
//   /// Class-level annotations (@override, @deprecated, etc.)
//   final List<AnnotationIR> annotations;
  
//   /// Documentation comment
//   final String? documentation;
  
//   /// Source location
//   final SourceLocationIR sourceLocation;
  
//   /// Visibility (public/private)
//   final VisibilityModifier visibility;
  
//   /// Classification of the class
//   final ClassClassification classification;

//   ClassIR({
//     required this.id,
//     required this.name,
//     required this.fields,
//     required this.methods,
//     this.constructors = const [],
//     this.constructor,
//     this.superclass,
//     this.interfaces = const [],
//     this.mixins = const [],
//     this.typeParameters = const [],
//     this.isAbstract = false,
//     this.isMixin = false,
//     this.isEnum = false,
//     this.enumValues = const [],
//     this.annotations = const [],
//     this.documentation,
//     required this.sourceLocation,
//     VisibilityModifier? visibility,
//     ClassClassification? classification,
//   })  : visibility = visibility ?? 
//             (name.startsWith('_') ? VisibilityModifier.private : VisibilityModifier.public),
//         classification = classification ?? ClassClassification.regular;

//   // ==========================================================================
//   // CONVENIENCE GETTERS
//   // ==========================================================================

//   /// Get all public fields
//   List<FieldIR> get publicFields => 
//       fields.where((f) => f.visibility == VisibilityModifier.public).toList();

//   /// Get all private fields
//   List<FieldIR> get privateFields => 
//       fields.where((f) => f.visibility == VisibilityModifier.private).toList();

//   /// Get all static fields
//   List<FieldIR> get staticFields => 
//       fields.where((f) => f.isStatic).toList();

//   /// Get all instance fields
//   List<FieldIR> get instanceFields => 
//       fields.where((f) => !f.isStatic).toList();

//   /// Get all const fields
//   List<FieldIR> get constFields => 
//       fields.where((f) => f.isConst).toList();

//   /// Get all final fields
//   List<FieldIR> get finalFields => 
//       fields.where((f) => f.isFinal).toList();

//   /// Get all public methods
//   List<MethodIR> get publicMethods => 
//       methods.where((m) => !m.name.startsWith('_')).toList();

//   /// Get all private methods
//   List<MethodIR> get privateMethods => 
//       methods.where((m) => m.name.startsWith('_')).toList();

//   /// Get all static methods
//   List<MethodIR> get staticMethods => 
//       methods.where((m) => m.isStatic).toList();

//   /// Get all instance methods
//   List<MethodIR> get instanceMethods => 
//       methods.where((m) => !m.isStatic).toList();

//   /// Get all abstract methods
//   List<MethodIR> get abstractMethods => 
//       methods.where((m) => m.isAbstract).toList();

//   /// Get all async methods
//   List<MethodIR> get asyncMethods => 
//       methods.where((m) => m.isAsync).toList();

//   /// Get all getters
//   List<MethodIR> get getters => 
//       methods.where((m) => m.isGetter).toList();

//   /// Get all setters
//   List<MethodIR> get setters => 
//       methods.where((m) => m.isSetter).toList();

//   /// Check if class implements an interface
//   bool implements(String interfaceName) => interfaces.contains(interfaceName);

//   /// Check if class extends a specific class
//   bool extends_(String className) => superclass == className;

//   /// Check if class uses a mixin
//   bool usesMixin(String mixinName) => mixins.contains(mixinName);

//   /// Check if class has a specific annotation
//   bool hasAnnotation(String annotationName) => 
//       annotations.any((a) => a.name == annotationName);

//   /// Get a field by name
//   FieldIR? getField(String name) {
//     try {
//       return fields.firstWhere((f) => f.name == name);
//     } catch (_) {
//       return null;
//     }
//   }

//   /// Get a method by name
//   MethodIR? getMethod(String name) {
//     try {
//       return methods.firstWhere((m) => m.name == name);
//     } catch (_) {
//       return null;
//     }
//   }

//   /// Check if this is a data class (all fields final, has copyWith, etc.)
//   bool get isDataClass {
//     return fields.isNotEmpty &&
//            fields.every((f) => f.isFinal) &&
//            methods.any((m) => m.name == 'copyWith');
//   }

//   /// Check if this is a service class (mostly static methods)
//   bool get isServiceClass {
//     return staticMethods.length > instanceMethods.length;
//   }

//   /// Check if this is an exception class
//   bool get isExceptionClass {
//     return name.endsWith('Exception') || 
//            superclass?.contains('Exception') == true;
//   }

//   // ==========================================================================
//   // SERIALIZATION
//   // ==========================================================================

//   Map<String, dynamic> toJson() {
//     return {
//       'id': id,
//       'name': name,
//       'fields': fields.map((f) => f.toJson()).toList(),
//       'methods': methods.map((m) => m.toJson()).toList(),
//       'constructors': constructors.map((c) => c.toJson()).toList(),
//       'constructor': constructor?.toJson(),
//       'superclass': superclass,
//       'interfaces': interfaces,
//       'mixins': mixins,
//       'typeParameters': typeParameters.map((t) => t.toJson()).toList(),
//       'isAbstract': isAbstract,
//       'isMixin': isMixin,
//       'isEnum': isEnum,
//       'enumValues': enumValues.map((e) => e.toJson()).toList(),
//       'annotations': annotations.map((a) => a.toJson()).toList(),
//       'documentation': documentation,
//       'sourceLocation': sourceLocation.toJson(),
//       'visibility': visibility.name,
//       'classification': classification.name,
//     };
//   }

//   static ClassIR fromJson(Map<String, dynamic> json) {
//     return ClassIR(
//       id: json['id'] as String,
//       name: json['name'] as String,
//       fields: (json['fields'] as List)
//           .map((f) => FieldIR.fromJson(f as Map<String, dynamic>))
//           .toList(),
//       methods: (json['methods'] as List)
//           .map((m) => MethodIR.fromJson(m as Map<String, dynamic>))
//           .toList(),
//       constructors: (json['constructors'] as List)
//           .map((c) => ConstructorIR.fromJson(c as Map<String, dynamic>))
//           .toList(),
//       constructor: json['constructor'] != null
//           ? ConstructorIR.fromJson(json['constructor'] as Map<String, dynamic>)
//           : null,
//       superclass: json['superclass'] as String?,
//       interfaces: (json['interfaces'] as List?)?.cast<String>() ?? [],
//       mixins: (json['mixins'] as List?)?.cast<String>() ?? [],
//       typeParameters: (json['typeParameters'] as List?)
//           ?.map((t) => TypeParameterIR.fromJson(t as Map<String, dynamic>))
//           .toList() ?? [],
//       isAbstract: json['isAbstract'] as bool? ?? false,
//       isMixin: json['isMixin'] as bool? ?? false,
//       isEnum: json['isEnum'] as bool? ?? false,
//       enumValues: (json['enumValues'] as List?)
//           ?.map((e) => EnumValueIR.fromJson(e as Map<String, dynamic>))
//           .toList() ?? [],
//       annotations: (json['annotations'] as List?)
//           ?.map((a) => AnnotationIR.fromJson(a as Map<String, dynamic>))
//           .toList() ?? [],
//       documentation: json['documentation'] as String?,
//       sourceLocation: SourceLocationIR.fromJson(
//         json['sourceLocation'] as Map<String, dynamic>,
//       ),
//       visibility: VisibilityModifier.values.firstWhere(
//         (v) => v.name == json['visibility'],
//         orElse: () => VisibilityModifier.public,
//       ),
//       classification: ClassClassification.values.firstWhere(
//         (c) => c.name == json['classification'],
//         orElse: () => ClassClassification.regular,
//       ),
//     );
//   }

//   @override
//   String toString() {
//     return 'ClassIR(name: $name, fields: ${fields.length}, methods: ${methods.length})';
//   }
// }

// // ==========================================================================
// // CLASS CLASSIFICATION
// // ==========================================================================

// enum ClassClassification {
//   /// Regular class
//   regular,
  
//   /// Data/model class (immutable data holder)
//   dataClass,
  
//   /// Service class (mostly static methods)
//   service,
  
//   /// Repository class (data access)
//   repository,
  
//   /// Controller/Bloc class (state management)
//   controller,
  
//   /// Exception class
//   exception,
  
//   /// Mixin class
//   mixin,
  
//   /// Abstract base class
//   abstractBase,
  
//   /// Extension class
//   extension,
  
//   /// Utility class (all static)
//   utility,
// }

// // ==========================================================================
// // PROPERTY IR - Widget/Class Properties
// // ==========================================================================

// /// Represents a property that can be passed to a widget or class
// /// This is typically derived from constructor parameters
// class PropertyIR {
//   /// Property name
//   final String name;
  
//   /// Property type
//   final TypeIR type;
  
//   /// Whether this property is required
//   final bool isRequired;
  
//   /// Default value (if any)
//   final ExpressionIR? defaultValue;
  
//   /// Documentation comment
//   final String? documentation;
  
//   /// Annotations on this property
//   final List<AnnotationIR> annotations;
  
//   /// Whether this is a callback property (Function type)
//   final bool isCallback;
  
//   /// Whether this property affects the widget tree
//   final bool affectsWidgetTree;
  
//   /// Source location
//   final SourceLocationIR? sourceLocation;

//   PropertyIR({
//     required this.name,
//     required this.type,
//     this.isRequired = false,
//     this.defaultValue,
//     this.documentation,
//     this.annotations = const [],
//     bool? isCallback,
//     this.affectsWidgetTree = true,
//     this.sourceLocation,
//   }) : isCallback = isCallback ?? _isCallbackType(type);

//   /// Check if a type is a callback/function type
//   static bool _isCallbackType(TypeIR type) {
//     return type is FunctionTypeIR || 
//            type.name.contains('Callback') ||
//            type.name.startsWith('VoidCallback') ||
//            type.name.startsWith('ValueChanged') ||
//            type.name.startsWith('ValueSetter');
//   }

//   /// Check if this property has a default value
//   bool get hasDefaultValue => defaultValue != null;

//   /// Check if this is optional (has default or not required)
//   bool get isOptional => !isRequired || hasDefaultValue;

//   /// Get the property signature (for code generation)
//   String get signature {
//     final buffer = StringBuffer();
    
//     if (isRequired) {
//       buffer.write('required ');
//     }
    
//     buffer.write('${type.name} $name');
    
//     if (defaultValue != null) {
//       buffer.write(' = ${_expressionToString(defaultValue!)}');
//     }
    
//     return buffer.toString();
//   }

//   String _expressionToString(ExpressionIR expr) {
//     if (expr is LiteralExpressionIR) {
//       return expr.value?.toString() ?? 'null';
//     }
//     return 'defaultValue';
//   }

//   Map<String, dynamic> toJson() {
//     return {
//       'name': name,
//       'type': type.toJson(),
//       'isRequired': isRequired,
//       'defaultValue': defaultValue?.toJson(),
//       'documentation': documentation,
//       'annotations': annotations.map((a) => a.toJson()).toList(),
//       'isCallback': isCallback,
//       'affectsWidgetTree': affectsWidgetTree,
//       'sourceLocation': sourceLocation?.toJson(),
//     };
//   }

//   static PropertyIR fromJson(Map<String, dynamic> json) {
//     return PropertyIR(
//       name: json['name'] as String,
//       type: TypeIR.fromJson(json['type'] as Map<String, dynamic>),
//       isRequired: json['isRequired'] as bool? ?? false,
//       defaultValue: json['defaultValue'] != null
//           ? ExpressionIR.fromJson(json['defaultValue'] as Map<String, dynamic>)
//           : null,
//       documentation: json['documentation'] as String?,
//       annotations: (json['annotations'] as List?)
//           ?.map((a) => AnnotationIR.fromJson(a as Map<String, dynamic>))
//           .toList() ?? [],
//       isCallback: json['isCallback'] as bool?,
//       affectsWidgetTree: json['affectsWidgetTree'] as bool? ?? true,
//       sourceLocation: json['sourceLocation'] != null
//           ? SourceLocationIR.fromJson(json['sourceLocation'] as Map<String, dynamic>)
//           : null,
//     );
//   }

//   @override
//   String toString() => signature;
// }

// // ==========================================================================
// // FIELD IR - Class Fields/Variables
// // ==========================================================================

// /// Represents a field in a class or widget
// class FieldIR {
//   /// Field name
//   final String name;
  
//   /// Field type
//   final TypeIR type;
  
//   /// Initial value (if any)
//   final ExpressionIR? initializer;
  
//   /// Whether this field is final
//   final bool isFinal;
  
//   /// Whether this field is const
//   final bool isConst;
  
//   /// Whether this field is static
//   final bool isStatic;
  
//   /// Whether this field is late
//   final bool isLate;
  
//   /// Visibility modifier
//   final VisibilityModifier visibility;
  
//   /// Documentation comment
//   final String? documentation;
  
//   /// Annotations
//   final List<AnnotationIR> annotations;
  
//   /// Source location
//   final SourceLocationIR? sourceLocation;

//   FieldIR({
//     required this.name,
//     required this.type,
//     this.initializer,
//     this.isFinal = false,
//     this.isConst = false,
//     this.isStatic = false,
//     this.isLate = false,
//     VisibilityModifier? visibility,
//     this.documentation,
//     this.annotations = const [],
//     this.sourceLocation,
//   }) : visibility = visibility ?? 
//            (name.startsWith('_') ? VisibilityModifier.private : VisibilityModifier.public);

//   /// Check if this is a mutable field
//   bool get isMutable => !isFinal && !isConst;

//   /// Check if this field is public
//   bool get isPublic => visibility == VisibilityModifier.public;

//   /// Check if this field is private
//   bool get isPrivate => visibility == VisibilityModifier.private;

//   /// Check if this has an initializer
//   bool get hasInitializer => initializer != null;

//   /// Get field declaration (for code generation)
//   String get declaration {
//     final buffer = StringBuffer();
    
//     if (isStatic) buffer.write('static ');
//     if (isLate) buffer.write('late ');
//     if (isFinal) buffer.write('final ');
//     if (isConst) buffer.write('const ');
    
//     buffer.write('${type.name} $name');
    
//     if (initializer != null) {
//       buffer.write(' = ${_initializerToString()}');
//     }
    
//     return buffer.toString();
//   }

//   String _initializerToString() {
//     if (initializer is LiteralExpressionIR) {
//       return (initializer as LiteralExpressionIR).value?.toString() ?? 'null';
//     }
//     return 'initializer';
//   }

//   Map<String, dynamic> toJson() {
//     return {
//       'name': name,
//       'type': type.toJson(),
//       'initializer': initializer?.toJson(),
//       'isFinal': isFinal,
//       'isConst': isConst,
//       'isStatic': isStatic,
//       'isLate': isLate,
//       'visibility': visibility.name,
//       'documentation': documentation,
//       'annotations': annotations.map((a) => a.toJson()).toList(),
//       'sourceLocation': sourceLocation?.toJson(),
//     };
//   }

//   static FieldIR fromJson(Map<String, dynamic> json) {
//     return FieldIR(
//       name: json['name'] as String,
//       type: TypeIR.fromJson(json['type'] as Map<String, dynamic>),
//       initializer: json['initializer'] != null
//           ? ExpressionIR.fromJson(json['initializer'] as Map<String, dynamic>)
//           : null,
//       isFinal: json['isFinal'] as bool? ?? false,
//       isConst: json['isConst'] as bool? ?? false,
//       isStatic: json['isStatic'] as bool? ?? false,
//       isLate: json['isLate'] as bool? ?? false,
//       visibility: VisibilityModifier.values.firstWhere(
//         (v) => v.name == json['visibility'],
//         orElse: () => VisibilityModifier.public,
//       ),
//       documentation: json['documentation'] as String?,
//       annotations: (json['annotations'] as List?)
//           ?.map((a) => AnnotationIR.fromJson(a as Map<String, dynamic>))
//           .toList() ?? [],
//       sourceLocation: json['sourceLocation'] != null
//           ? SourceLocationIR.fromJson(json['sourceLocation'] as Map<String, dynamic>)
//           : null,
//     );
//   }

//   @override
//   String toString() => declaration;
// }

// // ==========================================================================
// // VISIBILITY MODIFIER
// // ==========================================================================

// enum VisibilityModifier {
//   public,
//   private,
//   protected, // For future use
// }

// // ==========================================================================
// // ENUM VALUE IR
// // ==========================================================================

// /// Represents an enum value
// class EnumValueIR {
//   final String name;
//   final int index;
//   final List<ExpressionIR> arguments;
//   final String? documentation;

//   EnumValueIR({
//     required this.name,
//     required this.index,
//     this.arguments = const [],
//     this.documentation,
//   });

//   Map<String, dynamic> toJson() => {
//     'name': name,
//     'index': index,
//     'arguments': arguments.map((a) => a.toJson()).toList(),
//     'documentation': documentation,
//   };

//   static EnumValueIR fromJson(Map<String, dynamic> json) {
//     return EnumValueIR(
//       name: json['name'] as String,
//       index: json['index'] as int,
//       arguments: (json['arguments'] as List?)
//           ?.map((a) => ExpressionIR.fromJson(a as Map<String, dynamic>))
//           .toList() ?? [],
//       documentation: json['documentation'] as String?,
//     );
//   }
// }

// // ==========================================================================
// // TYPE PARAMETER IR
// // ==========================================================================

// /// Represents a generic type parameter (e.g., T in List<T>)
// class TypeParameterIR {
//   final String name;
//   final TypeIR? bound;
//   final TypeIR? defaultType;

//   TypeParameterIR({
//     required this.name,
//     this.bound,
//     this.defaultType,
//   });

//   Map<String, dynamic> toJson() => {
//     'name': name,
//     'bound': bound?.toJson(),
//     'defaultType': defaultType?.toJson(),
//   };

//   static TypeParameterIR fromJson(Map<String, dynamic> json) {
//     return TypeParameterIR(
//       name: json['name'] as String,
//       bound: json['bound'] != null
//           ? TypeIR.fromJson(json['bound'] as Map<String, dynamic>)
//           : null,
//       defaultType: json['defaultType'] != null
//           ? TypeIR.fromJson(json['defaultType'] as Map<String, dynamic>)
//           : null,
//     );
//   }

//   @override
//   String toString() {
//     if (bound != null) {
//       return '$name extends ${bound!.name}';
//     }
//     return name;
//   }
// }