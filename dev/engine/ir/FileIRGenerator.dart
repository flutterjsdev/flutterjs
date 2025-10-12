// import 'package:analyzer/dart/ast/ast.dart';
// import 'package:analyzer/dart/ast/visitor.dart';
// import 'package:analyzer/dart/element/element.dart';
// import 'package:analyzer/dart/element/type.dart';

// import 'ir/Expression/expression_ir.dart';
// import '../analyzer/analying_project.dart';

// import '../analyzer/analyze_flutter_app.dart';
// import '../analyzer/type_registry.dart';
// import 'ir/Statement/statement_ir.dart';
// import 'ir/file_ir.dart';
// import 'ir/widget/widget_ir.dart';


// /// Generates FileIR by visiting AST nodes and extracting Flutter components
// /// 
// /// This visitor identifies and converts:
// /// - Widget classes (StatelessWidget, StatefulWidget)
// /// - State classes
// /// - Build methods
// /// - Provider/StateManagement classes
// /// - Helper classes and functions
// class FileIRGenerator extends RecursiveAstVisitor<void> {
//   final FileAnalysisContext context;
  
//   // Collected IR components
//   final List<WidgetIR> _widgets = [];
//   final List<StateClassIR> _stateClasses = [];
//   final List<ClassIR> _classes = [];
//   final List<FunctionIR> _functions = [];
//   final List<ProviderIR> _providers = [];
//   final List<ImportIR> _imports = [];
//   final List<String> _exports = [];
  
//   // Current context tracking
//   ClassDeclaration? _currentClass;
//   MethodDeclaration? _currentMethod;
  
//   FileIRGenerator(this.context);

//   /// Build the complete FileIR after visiting
//   FileIR buildFileIR() {
//     return FileIR(
//       filePath: context.currentFile,
//       imports: _imports,
//       exports: _exports,
//       widgets: _widgets,
//       stateClasses: _stateClasses,
//       classes: _classes,
//       functions: _functions,
//       providers: _providers,
//     );
//   }

//   // ==========================================================================
//   // IMPORTS & EXPORTS
//   // ==========================================================================

//   @override
//   void visitImportDirective(ImportDirective node) {
//     final uri = node.uri.stringValue;
//     if (uri == null) return;
    
//     _imports.add(ImportIR(
//       uri: uri,
//       prefix: node.prefix?.name??"",
//       isDeferred: node.deferredKeyword != null,
//       showCombinators: node.combinators
//           .whereType<ShowCombinator>()
//           .expand((c) => c.shownNames.map((n) => n.name))
//           .toList(),
//       hideCombinators: node.combinators
//           .whereType<HideCombinator>()
//           .expand((c) => c.hiddenNames.map((n) => n.name))
//           .toList(),
//     ));
    
//     super.visitImportDirective(node);
//   }

//   @override
//   void visitExportDirective(ExportDirective node) {
//     final uri = node.uri.stringValue;
//     if (uri != null) {
//       _exports.add(uri);
//     }
//     super.visitExportDirective(node);
//   }

//   // ==========================================================================
//   // CLASS DECLARATIONS
//   // ==========================================================================

//   @override
//   void visitClassDeclaration(ClassDeclaration node) {
//     final previousClass = _currentClass;
//     _currentClass = node;
    
//     final element = node.declaredElement;
//     if (element == null) {
//       super.visitClassDeclaration(node);
//       _currentClass = previousClass;
//       return;
//     }
    
//     final typeInfo = context.typeRegistry.lookupType(element.name);
    
//     // Classify the class type
//     if (typeInfo?.isStatelessWidget ?? false) {
//       _processStatelessWidget(node, element, typeInfo!);
//     } else if (typeInfo?.isStatefulWidget ?? false) {
//       _processStatefulWidget(node, element, typeInfo!);
//     } else if (typeInfo?.isState ?? false) {
//       _processStateClass(node, element, typeInfo!);
//     } else if (_isProvider(element)) {
//       _processProvider(node, element);
//     } else {
//       _processRegularClass(node, element);
//     }
    
//     super.visitClassDeclaration(node);
//     _currentClass = previousClass;
//   }

//   // ==========================================================================
//   // WIDGET PROCESSING
//   // ==========================================================================

//   void _processStatelessWidget(
//     ClassDeclaration node,
//     ClassElement element,
//     TypeInfo typeInfo,
//   ) {
//     final buildMethod = _findBuildMethod(node);
    
//     _widgets.add(WidgetIR(
//       name: element.name,
//       type: WidgetType.stateless,
//       filePath: context.currentFile,
//       constructorParams: _extractConstructorParams(node),
//       fields: _extractFields(node),
//       buildMethod: buildMethod != null ? _processBuildMethod(buildMethod) : null,
//       lifecycle: LifecycleIR(methods: []),
//       dependencies: _extractDependencies(node),
//       isConst: _hasConstConstructor(node),
//       documentation: node.documentationComment?.tokens.map((t) => t.lexeme).join('\n'),
//     ));
//   }

//   void _processStatefulWidget(
//     ClassDeclaration node,
//     ClassElement element,
//     TypeInfo typeInfo,
//   ) {
//     final stateType = _extractStateType(element);
    
//     _widgets.add(WidgetIR(
//       name: element.name,
//       type: WidgetType.stateful,
//       filePath: context.currentFile,
//       constructorParams: _extractConstructorParams(node),
//       fields: _extractFields(node),
//       stateClassName: stateType,
//       dependencies: _extractDependencies(node),
//       isConst: _hasConstConstructor(node),
//       documentation: node.documentationComment?.tokens.map((t) => t.lexeme).join('\n'),
//     ));
//   }

//   void _processStateClass(
//     ClassDeclaration node,
//     ClassElement element,
//     TypeInfo typeInfo,
//   ) {
//     final buildMethod = _findBuildMethod(node);
//     final lifecycleMethods = _extractLifecycleMethods(node);
    
//     _stateClasses.add(StateClassIR(
//       name: element.name,
//       widgetClassName: _extractWidgetType(element),
//       filePath: context.currentFile,
//       fields: _extractFields(node),
//       stateFields: _extractStateFields(node),
//       buildMethod: buildMethod != null ? _processBuildMethod(buildMethod) : null,
//       lifecycle: LifecycleIR(methods: lifecycleMethods),
//       controllers: _extractControllers(node),
//       subscriptions: _extractSubscriptions(node),
//       dependencies: _extractDependencies(node),
//     ));
//   }

//   // ==========================================================================
//   // BUILD METHOD PROCESSING
//   // ==========================================================================

//   BuildMethodIR _processBuildMethod(MethodDeclaration method) {
//     final bodyAnalyzer = BuildMethodBodyAnalyzer(context);
//     method.body.accept(bodyAnalyzer);
    
//     return BuildMethodIR(
//       returnType: method.returnType?.toSource() ?? 'Widget',
//       body: bodyAnalyzer.getBodyIR(),
//       widgets: bodyAnalyzer.widgets,
//       conditionals: bodyAnalyzer.conditionals,
//       loops: bodyAnalyzer.loops,
//       localVariables: bodyAnalyzer.localVariables,
//       usedStateFields: bodyAnalyzer.usedStateFields,
//       usedMethods: bodyAnalyzer.usedMethods,
//     );
//   }

//   MethodDeclaration? _findBuildMethod(ClassDeclaration node) {
//     return node.members
//         .whereType<MethodDeclaration>()
//         .firstWhereOrNull((m) => m.name.lexeme == 'build');
//   }

//   // ==========================================================================
//   // PROVIDER PROCESSING
//   // ==========================================================================

//   void _processProvider(ClassDeclaration node, ClassElement element) {
//     final providerType = _detectProviderType(element);
    
//     _providers.add(ProviderIR(
//       name: element.name??"",
//       type: providerType,
//       filePath: context.currentFile,
//      // providedType: _extractProvidedType(element),
//       fields: _extractFields(node),
//       methods: _extractMethods(node),
//       dependencies: _extractDependencies(node),
//       isLazy: _isLazyProvider(node),
//       isScoped: _isScopedProvider(node),
//     ));
//   }

//   ProviderType _detectProviderType(ClassElement element) {
//     final superTypes = element.allSupertypes.map((t) => t.element.name).toSet();
    
//     if (superTypes.contains('ChangeNotifier')) return ProviderType.changeNotifier;
//     if (superTypes.contains('ValueNotifier')) return ProviderType.valueNotifier;
//     if (superTypes.contains('StateNotifier')) return ProviderType.stateNotifier;
//     if (superTypes.contains('Bloc')) return ProviderType.bloc;
//     if (superTypes.contains('Cubit')) return ProviderType.cubit;
    
//     return ProviderType.custom;
//   }

//   // ==========================================================================
//   // REGULAR CLASS PROCESSING
//   // ==========================================================================

//   void _processRegularClass(ClassDeclaration node, ClassElement element) {
//     _classes.add(ClassIR(
//       name: element.name,
//       filePath: context.currentFile,
//       isAbstract: element.isAbstract,
//       superClass: element.supertype?.getDisplayString(withNullability: false),
//       interfaces: element.interfaces
//           .map((i) => i.getDisplayString(withNullability: false))
//           .toList(),
//       mixins: element.mixins
//           .map((m) => m.getDisplayString(withNullability: false))
//           .toList(),
//       fields: _extractFields(node),
//       methods: _extractMethods(node),
//       constructors: _extractConstructors(node),
//       typeParameters: element.typeParameters.map((t) => t.name).toList(),
//     ));
//   }

//   // ==========================================================================
//   // FUNCTION DECLARATIONS
//   // ==========================================================================

//   @override
//   void visitFunctionDeclaration(FunctionDeclaration node) {
//     // Only process top-level functions
//     if (_currentClass == null) {
//       final element = node.declaredElement;
//       if (element != null) {
//         _functions.add(FunctionIR(
//           name: element.name,
//           returnType: node.returnType?.toSource() ?? 'dynamic',
//           parameters: _extractFunctionParams(node.functionExpression.parameters),
//           isAsync: node.functionExpression.body.isAsynchronous,
//           isGenerator: node.functionExpression.body.isGenerator,
//           body: node.functionExpression.body.toSource(),
//           documentation: node.documentationComment?.tokens.map((t) => t.lexeme).join('\n'),
//         ));
//       }
//     }
    
//     super.visitFunctionDeclaration(node);
//   }

//   // ==========================================================================
//   // EXTRACTION HELPERS
//   // ==========================================================================

//   List<ParameterIR> _extractConstructorParams(ClassDeclaration node) {
//     final constructor = node.members
//         .whereType<ConstructorDeclaration>()
//         .firstWhereOrNull((c) => c.name == null); // Default constructor
    
//     if (constructor == null) return [];
    
//     return _extractParameters(constructor.parameters);
//   }

//   List<ParameterIR> _extractFunctionParams(FormalParameterList? params) {
//     if (params == null) return [];
//     return _extractParameters(params);
//   }

//   List<ParameterIR> _extractParameters(FormalParameterList params) {
//     return params.parameters.map((param) {
//       return ParameterIR(
//         name: param.name?.lexeme ?? '',
//         type: param is SimpleFormalParameter
//             ? param.type?.toSource() ?? 'dynamic'
//             : 'dynamic',
//         isRequired: param.isRequired,
//         isNamed: param.isNamed,
//         isPositional: param.isPositional,
//         defaultValue: param is DefaultFormalParameter
//             ? param.defaultValue?.toSource()
//             : null,
//         isThis: param is FieldFormalParameter,
//       );
//     }).toList();
//   }

//   List<FieldIR> _extractFields(ClassDeclaration node) {
//     return node.members
//         .whereType<FieldDeclaration>()
//         .expand((field) => field.fields.variables.map((variable) {
//               return FieldIR(
//                 name: variable.name.lexeme,
//                 type: field.fields.type?.toSource() ?? 'dynamic',
//                 isFinal: field.fields.isFinal,
//                 isConst: field.fields.isConst,
//                 isStatic: field.isStatic,
//                 isLate: field.fields.isLate,
//                 initializer: variable.initializer?.toSource(),
//               );
//             }))
//         .toList();
//   }

//   List<StateFieldIR> _extractStateFields(ClassDeclaration node) {
//     return _extractFields(node)
//         .where((f) => !f.isFinal && !f.isConst)
//         .map((f) => StateFieldIR(
//               name: f.name,
//               type: f.type,
//               initialValue: f.initializer,
//               isLate: f.isLate,
//             ))
//         .toList();
//   }

//   List<MethodIR> _extractMethods(ClassDeclaration node) {
//     return node.members
//         .whereType<MethodDeclaration>()
//         .where((m) => m.name.lexeme != 'build') // Build method handled separately
//         .map((method) => MethodIR(
//               name: method.name.lexeme,
//               returnType: method.returnType?.toSource() ?? 'dynamic',
//               parameters: _extractParameters(method.parameters!),
//               isAsync: method.body.isAsynchronous,
//               isStatic: method.isStatic,
//               isOverride: _hasOverrideAnnotation(method),
//               body: method.body.toSource(),
//             ))
//         .toList();
//   }

//   List<ConstructorIR> _extractConstructors(ClassDeclaration node) {
//     return node.members
//         .whereType<ConstructorDeclaration>()
//         .map((ctor) => ConstructorIR(
//               name: ctor.name?.lexeme,
//               parameters: _extractParameters(ctor.parameters),
//               isConst: ctor.constKeyword != null,
//               isFactory: ctor.factoryKeyword != null,
//               initializers: ctor.initializers.map((i) => i.toSource()).toList(),
//               body: ctor.body.toSource(),
//             ))
//         .toList();
//   }

//   List<LifecycleMethodIR> _extractLifecycleMethods(ClassDeclaration node) {
//     const lifecycleNames = [
//       'initState',
//       'didChangeDependencies',
//       'didUpdateWidget',
//       'dispose',
//       'deactivate',
//       'reassemble',
//     ];
    
//     return node.members
//         .whereType<MethodDeclaration>()
//         .where((m) => lifecycleNames.contains(m.name.lexeme))
//         .map((method) => LifecycleMethodIR(
//               name: method.name.lexeme,
//               body: method.body.toSource(),
//             ))
//         .toList();
//   }

//   List<ControllerIR> _extractControllers(ClassDeclaration node) {
//     return _extractFields(node)
//         .where((f) => f.type.contains('Controller'))
//         .map((f) => ControllerIR(
//               name: f.name,
//               type: f.type,
//               isLate: f.isLate,
//             ))
//         .toList();
//   }

//   List<String> _extractSubscriptions(ClassDeclaration node) {
//     // Look for StreamSubscription fields
//     return _extractFields(node)
//         .where((f) => f.type.contains('StreamSubscription'))
//         .map((f) => f.name)
//         .toList();
//   }

//   List<String> _extractDependencies(ClassDeclaration node) {
//     final deps = <String>{};
    
//     // Scan for Provider.of, context.watch, etc.
//     final dependencyScanner = DependencyScannerVisitor();
//     node.accept(dependencyScanner);
    
//     return dependencyScanner.dependencies.toList();
//   }

//   // ==========================================================================
//   // HELPER METHODS
//   // ==========================================================================

//   bool _isProvider(ClassElement element) {
//     final superTypes = element.allSupertypes.map((t) => t.element.name).toSet();
//     return superTypes.any((name) => 
//         name.contains('Notifier') || 
//         name.contains('Bloc') || 
//         name.contains('Cubit') ||
//         name == 'InheritedWidget');
//   }

//   bool _hasConstConstructor(ClassDeclaration node) {
//     return node.members
//         .whereType<ConstructorDeclaration>()
//         .any((c) => c.constKeyword != null);
//   }

//   bool _hasOverrideAnnotation(MethodDeclaration method) {
//     return method.metadata.any((a) => a.name.name == 'override');
//   }

//   String? _extractStateType(ClassElement element) {
//     // Look for createState method return type
//     final createState = element.methods.firstWhereOrNull(
//       (m) => m.name == 'createState',
//     );
    
//     return createState?.returnType.getDisplayString(withNullability: false);
//   }

//   String? _extractWidgetType(ClassElement stateElement) {
//     // State<WidgetType> - extract WidgetType
//     final supertype = stateElement.supertype;
//     if (supertype != null && supertype.element.name == 'State') {
//       final typeArgs = supertype.typeArguments;
//       if (typeArgs.isNotEmpty) {
//         return typeArgs.first.getDisplayString(withNullability: false);
//       }
//     }
//     return null;
//   }

//   String? _extractProvidedType(ClassElement element) {
//     // For ChangeNotifier, ValueNotifier<T>, etc.
//     for (final supertype in element.allSupertypes) {
//       if (supertype.typeArguments.isNotEmpty) {
//         return supertype.typeArguments.first.getDisplayString(withNullability: false);
//       }
//     }
//     return null;
//   }

//   bool _isLazyProvider(ClassDeclaration node) {
//     return node.metadata.any((a) => a.name.name == 'lazy');
//   }

//   bool _isScopedProvider(ClassDeclaration node) {
//     return node.metadata.any((a) => a.name.name == 'scoped');
//   }
// }

// /// Helper visitor to analyze build method body in detail
// class BuildMethodBodyAnalyzer extends RecursiveAstVisitor<void> {
//   final FileAnalysisContext context;
  
//   final List<WidgetInstantiationIR> widgets = [];
//   final List<ConditionalIR> conditionals = [];
//   final List<LoopIR> loops = [];
//   final List<String> localVariables = [];
//   final List<String> usedStateFields = [];
//   final List<String> usedMethods = [];
  
//   BuildMethodBodyAnalyzer(this.context);
  
//   String getBodyIR() {
//     // Return simplified/structured representation
//     return '/* Build body IR */';
//   }
  
//   @override
//   void visitInstanceCreationExpression(InstanceCreationExpression node) {
//     // Track widget instantiations
//     final type = node.staticType?.getDisplayString(withNullability: false);
//     if (type != null && context.typeRegistry.isTypeAvailableIn(type, context.currentFile)) {
//       final typeInfo = context.typeRegistry.lookupType(type);
//       if (typeInfo?.isWidget ?? false) {
//         widgets.add(WidgetInstantiationIR(
//           widgetType: type,
//           arguments: _extractArguments(node.argumentList),
//           isConst: node.keyword?.lexeme == 'const',
//         ));
//       }
//     }
//     super.visitInstanceCreationExpression(node);
//   }
  
//   List<ArgumentIR> _extractArguments(ArgumentList args) {
//     return args.arguments.map((arg) => ArgumentIR(
//       name: arg is NamedExpression ? arg.name.label.name : null,
//       value: arg.toSource(),
//     )).toList();
//   }
// }

// /// Helper visitor to find dependencies
// class DependencyScannerVisitor extends RecursiveAstVisitor<void> {
//   final Set<String> dependencies = {};
  
//   @override
//   void visitMethodInvocation(MethodInvocation node) {
//     // Look for Provider.of, context.watch, context.read, etc.
//     final methodName = node.methodName.name;
//     if (methodName == 'of' || methodName == 'watch' || methodName == 'read') {
//       final typeArgs = node.typeArguments?.arguments;
//       if (typeArgs != null && typeArgs.isNotEmpty) {
//         dependencies.add(typeArgs.first.toSource());
//       }
//     }
//     super.visitMethodInvocation(node);
//   }
// }