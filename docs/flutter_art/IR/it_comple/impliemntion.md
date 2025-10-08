# Flutter.js Transpiler: Complete Implementation Guide

## Table of Contents
1. [Project Setup](#project-setup)
2. [Phase 1: Dart Analyzer Integration](#phase-1-dart-analyzer-integration)
3. [Phase 2: AST to IR Conversion](#phase-2-ast-to-ir-conversion)
4. [Phase 3: Binary Format Implementation](#phase-3-binary-format-implementation)
5. [Phase 4: IR Optimization](#phase-4-ir-optimization)
6. [Phase 5: JavaScript Code Generation](#phase-5-javascript-code-generation)
7. [Phase 6: Runtime Library](#phase-6-runtime-library)
8. [Testing Strategy](#testing-strategy)
9. [Performance Benchmarks](#performance-benchmarks)

---

## Project Setup

### Directory Structure

```
flutter_js/
├── lib/
│   ├── src/
│   │   ├── analyzer/           # Dart analyzer integration
│   │   │   ├── ast_visitor.dart
│   │   │   ├── type_resolver.dart
│   │   │   └── scope_analyzer.dart
│   │   ├── ir/                 # IR data structures
│   │   │   ├── ir_schema.dart
│   │   │   ├── ir_builder.dart
│   │   │   └── ir_validator.dart
│   │   ├── binary/             # Binary format
│   │   │   ├── binary_writer.dart
│   │   │   ├── binary_reader.dart
│   │   │   └── binary_constants.dart
│   │   ├── optimizer/          # IR optimization
│   │   │   ├── dead_code_eliminator.dart
│   │   │   ├── constant_folder.dart
│   │   │   └── tree_shaker.dart
│   │   ├── codegen/            # JavaScript generation
│   │   │   ├── js_generator.dart
│   │   │   ├── react_component_generator.dart
│   │   │   └── css_generator.dart
│   │   └── runtime/            # Runtime support
│   │       ├── flutter_runtime.js
│   │       └── widget_registry.js
│   └── flutter_js.dart
├── test/
│   ├── fixtures/               # Test Flutter apps
│   ├── unit/
│   └── integration/
├── examples/
│   ├── counter_app/
│   ├── todo_list/
│   └── complex_ui/
├── pubspec.yaml
└── README.md
```

### Dependencies (pubspec.yaml)

```yaml
name: flutter_js
description: Flutter to JavaScript transpiler with binary IR
version: 1.0.0

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  analyzer: ^6.2.0
  path: ^1.8.3
  meta: ^1.9.1
  collection: ^1.17.2

dev_dependencies:
  test: ^1.24.0
  lints: ^3.0.0
  mockito: ^5.4.0
```

---

## Phase 1: Dart Analyzer Integration

### Step 1.1: Project Analysis Setup

```dart
// lib/src/analyzer/project_analyzer.dart

import 'package:analyzer/dart/analysis/analysis_context.dart';
import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/file_system/physical_file_system.dart';
import 'package:path/path.dart' as path;

class ProjectAnalyzer {
  final String projectPath;
  late AnalysisContextCollection _collection;
  
  ProjectAnalyzer(this.projectPath);
  
  Future<void> initialize() async {
    _collection = AnalysisContextCollection(
      includedPaths: [path.join(projectPath, 'lib')],
      resourceProvider: PhysicalResourceProvider.INSTANCE,
    );
  }
  
  Future<List<AnalyzedFile>> analyzeAllFiles() async {
    final results = <AnalyzedFile>[];
    
    for (final context in _collection.contexts) {
      for (final filePath in context.contextRoot.analyzedFiles()) {
        if (filePath.endsWith('.dart')) {
          final result = await _analyzeFile(context, filePath);
          if (result != null) {
            results.add(result);
          }
        }
      }
    }
    
    return results;
  }
  
  Future<AnalyzedFile?> _analyzeFile(
    AnalysisContext context,
    String filePath,
  ) async {
    final session = context.currentSession;
    final result = await session.getResolvedUnit(filePath);
    
    if (result is ResolvedUnitResult) {
      return AnalyzedFile(
        path: filePath,
        unit: result.unit,
        libraryElement: result.libraryElement,
        errors: result.errors,
      );
    }
    
    return null;
  }
}

class AnalyzedFile {
  final String path;
  final CompilationUnit unit;
  final LibraryElement libraryElement;
  final List<AnalysisError> errors;
  
  AnalyzedFile({
    required this.path,
    required this.unit,
    required this.libraryElement,
    required this.errors,
  });
  
  bool get hasErrors => errors.any((e) => e.severity == Severity.error);
}
```

### Step 1.2: Enhanced AST Visitor

```dart
// lib/src/analyzer/flutter_ast_visitor.dart

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/type.dart';
import '../ir/ir_schema.dart';

class FlutterASTVisitor extends RecursiveAstVisitor<void> {
  final IRBuilder _builder = IRBuilder();
  
  // Context stack for tracking current scope
  final List<ASTContext> _contextStack = [];
  
  // Type tracking
  final Map<String, DartType> _typeMap = {};
  
  FlutterAppIR get result => _builder.build();
  
  @override
  void visitImportDirective(ImportDirective node) {
    _builder.addImport(ImportIR(
      uri: node.uri.stringValue ?? '',
      prefix: node.prefix?.name ?? '',
      isDeferred: node.deferredKeyword != null,
      showCombinators: _extractShowCombinators(node),
      hideCombinators: _extractHideCombinators(node),
    ));
    super.visitImportDirective(node);
  }
  
  @override
  void visitClassDeclaration(ClassDeclaration node) {
    final className = node.name.lexeme;
    _contextStack.add(ASTContext(type: ContextType.classDecl, name: className));
    
    try {
      if (_isStatefulWidget(node)) {
        _extractStatefulWidget(node);
      } else if (_isStatelessWidget(node)) {
        _extractStatelessWidget(node);
      } else if (_isStateClass(node)) {
        _extractStateClass(node);
      } else if (_isProvider(node)) {
        _extractProvider(node);
      }
      
      super.visitClassDeclaration(node);
    } finally {
      _contextStack.removeLast();
    }
  }
  
  @override
  void visitMethodDeclaration(MethodDeclaration node) {
    final methodName = node.name.lexeme;
    _contextStack.add(ASTContext(type: ContextType.method, name: methodName));
    
    try {
      if (methodName == 'build' && _isInWidgetClass()) {
        _extractBuildMethod(node);
      } else if (_isLifecycleMethod(methodName)) {
        _extractLifecycleMethod(node);
      }
      
      super.visitMethodDeclaration(node);
    } finally {
      _contextStack.removeLast();
    }
  }
  
  @override
  void visitMethodInvocation(MethodInvocation node) {
    final methodName = node.methodName.name;
    
    // Track important method calls
    if (methodName == 'setState') {
      _extractSetStateCall(node);
    } else if (_isNavigationCall(methodName)) {
      _extractNavigationCall(node);
    } else if (_isProviderAccess(node)) {
      _extractProviderUsage(node);
    }
    
    super.visitMethodInvocation(node);
  }
  
  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final typeName = node.constructorName.type.name2.toString();
    
    if (_isFlutterWidget(typeName)) {
      _extractWidgetInstantiation(node);
    } else if (typeName == 'AnimationController') {
      _extractAnimationController(node);
    }
    
    super.visitInstanceCreationExpression(node);
  }
  
  // Helper methods
  
  bool _isStatefulWidget(ClassDeclaration node) {
    final superclass = node.extendsClause?.superclass.name2.toString();
    return superclass == 'StatefulWidget';
  }
  
  bool _isStatelessWidget(ClassDeclaration node) {
    final superclass = node.extendsClause?.superclass.name2.toString();
    return superclass == 'StatelessWidget';
  }
  
  bool _isStateClass(ClassDeclaration node) {
    final superclass = node.extendsClause?.superclass.name2.toString();
    return superclass?.startsWith('State<') ?? false;
  }
  
  bool _isProvider(ClassDeclaration node) {
    final mixins = node.withClause?.mixinTypes2
        .map((t) => t.name2.toString())
        .toList() ?? [];
    return mixins.any((m) => m.contains('ChangeNotifier'));
  }
  
  bool _isFlutterWidget(String typeName) {
    // Check against known Flutter widgets
    return _knownWidgets.contains(typeName);
  }
  
  bool _isLifecycleMethod(String name) {
    return ['initState', 'dispose', 'didUpdateWidget', 
            'didChangeDependencies', 'reassemble'].contains(name);
  }
  
  bool _isNavigationCall(String name) {
    return ['push', 'pop', 'pushNamed', 'pushReplacement'].contains(name);
  }
  
  bool _isProviderAccess(MethodInvocation node) {
    return ['read', 'watch', 'select'].contains(node.methodName.name);
  }
  
  bool _isInWidgetClass() {
    return _contextStack.any((c) => c.type == ContextType.classDecl);
  }
  
  // Extraction methods (implementation in next section)
  void _extractStatefulWidget(ClassDeclaration node) { /* ... */ }
  void _extractStatelessWidget(ClassDeclaration node) { /* ... */ }
  void _extractStateClass(ClassDeclaration node) { /* ... */ }
  void _extractProvider(ClassDeclaration node) { /* ... */ }
  void _extractBuildMethod(MethodDeclaration node) { /* ... */ }
  void _extractLifecycleMethod(MethodDeclaration node) { /* ... */ }
  void _extractSetStateCall(MethodInvocation node) { /* ... */ }
  void _extractNavigationCall(MethodInvocation node) { /* ... */ }
  void _extractProviderUsage(MethodInvocation node) { /* ... */ }
  void _extractWidgetInstantiation(InstanceCreationExpression node) { /* ... */ }
  void _extractAnimationController(InstanceCreationExpression node) { /* ... */ }
  
  List<String> _extractShowCombinators(ImportDirective node) {
    return node.combinators
        .whereType<ShowCombinator>()
        .expand((c) => c.shownNames.map((n) => n.name))
        .toList();
  }
  
  List<String> _extractHideCombinators(ImportDirective node) {
    return node.combinators
        .whereType<HideCombinator>()
        .expand((c) => c.hiddenNames.map((n) => n.name))
        .toList();
  }
  
  static const Set<String> _knownWidgets = {
    'Container', 'Row', 'Column', 'Stack', 'Positioned',
    'Text', 'RichText', 'Image', 'Icon', 'IconButton',
    'ElevatedButton', 'TextButton', 'OutlinedButton',
    'Scaffold', 'AppBar', 'BottomNavigationBar', 'Drawer',
    'ListView', 'GridView', 'SingleChildScrollView',
    'TextField', 'TextFormField', 'Form',
    'AnimatedContainer', 'AnimatedOpacity', 'Hero',
    'GestureDetector', 'InkWell', 'Material',
    'Padding', 'Center', 'Align', 'SizedBox',
  };
}

enum ContextType {
  classDecl,
  method,
  function,
  callback,
}

class ASTContext {
  final ContextType type;
  final String name;
  final Map<String, dynamic> metadata;
  
  ASTContext({
    required this.type,
    required this.name,
    this.metadata = const {},
  });
}
```

---

## Phase 2: AST to IR Conversion

### Step 2.1: IR Builder

```dart
// lib/src/ir/ir_builder.dart

import 'ir_schema.dart';

class IRBuilder {
  final List<WidgetIR> _widgets = [];
  final List<StateClassIR> _stateClasses = [];
  final List<FunctionIR> _functions = [];
  final List<RouteIR> _routes = [];
  final List<AnimationIR> _animations = [];
  final List<ProviderIR> _providers = [];
  final List<ImportIR> _imports = [];
  final List<ThemeIR> _themes = [];
  
  int _idCounter = 0;
  
  String generateId(String prefix) => '${prefix}_${_idCounter++}';
  
  void addWidget(WidgetIR widget) => _widgets.add(widget);
  void addStateClass(StateClassIR state) => _stateClasses.add(state);
  void addFunction(FunctionIR func) => _functions.add(func);
  void addRoute(RouteIR route) => _routes.add(route);
  void addAnimation(AnimationIR animation) => _animations.add(animation);
  void addProvider(ProviderIR provider) => _providers.add(provider);
  void addImport(ImportIR import) => _imports.add(import);
  void addTheme(ThemeIR theme) => _themes.add(theme);
  
  FlutterAppIR build() {
    return FlutterAppIR(
      version: 2,
      widgets: _widgets,
      stateClasses: _stateClasses,
      functions: _functions,
      routes: _routes,
      animations: _animations,
      providers: _providers,
      imports: _imports,
      themes: _themes,
      dependencyGraph: _buildDependencyGraph(),
    );
  }
  
  DependencyGraphIR _buildDependencyGraph() {
    final nodes = <DependencyNodeIR>[];
    final edges = <DependencyEdgeIR>[];
    
    // Build nodes from widgets, states, providers
    for (final widget in _widgets) {
      nodes.add(DependencyNodeIR(
        id: widget.id,
        type: DependencyType.widget,
        name: widget.name,
      ));
    }
    
    for (final state in _stateClasses) {
      nodes.add(DependencyNodeIR(
        id: state.id,
        type: DependencyType.state,
        name: state.name,
      ));
      
      // Add edge from widget to state
      final widgetId = _findWidgetIdForState(state.widgetType);
      if (widgetId != null) {
        edges.add(DependencyEdgeIR(
          fromId: widgetId,
          toId: state.id,
          relation: DependencyRelation.uses,
        ));
      }
    }
    
    // Add provider dependencies
    for (final provider in _providers) {
      nodes.add(DependencyNodeIR(
        id: provider.id,
        type: DependencyType.provider,
        name: provider.name,
      ));
    }
    
    return DependencyGraphIR(nodes: nodes, edges: edges);
  }
  
  String? _findWidgetIdForState(String widgetType) {
    return _widgets
        .where((w) => w.name == widgetType)
        .firstOrNull
        ?.id;
  }
}
```

### Step 2.2: Widget Extraction

```dart
// lib/src/analyzer/widget_extractor.dart

import 'package:analyzer/dart/ast/ast.dart';
import '../ir/ir_schema.dart';

class WidgetExtractor {
  final IRBuilder builder;
  
  WidgetExtractor(this.builder);
  
  WidgetIR extractStatelessWidget(ClassDeclaration node) {
    final widgetId = builder.generateId('widget');
    final widgetName = node.name.lexeme;
    
    // Extract fields
    final fields = <FieldIR>[];
    for (final member in node.members) {
      if (member is FieldDeclaration) {
        fields.addAll(_extractFields(member));
      }
    }
    
    // Extract constructor
    ConstructorIR? constructor;
    for (final member in node.members) {
      if (member is ConstructorDeclaration) {
        constructor = _extractConstructor(member);
        break;
      }
    }
    
    // Extract build method
    BuildMethodIR? buildMethod;
    for (final member in node.members) {
      if (member is MethodDeclaration && member.name.lexeme == 'build') {
        buildMethod = _extractBuildMethod(member);
        break;
      }
    }
    
    return WidgetIR(
      id: widgetId,
      name: widgetName,
      type: 'StatelessWidget',
      classification: WidgetClassification.stateless,
      isStateful: false,
      properties: _convertFieldsToProperties(fields),
      fields: fields,
      constructor: constructor,
      buildMethod: buildMethod,
      children: [],
      lifecycleMethods: [],
      eventHandlers: [],
      annotations: _extractAnnotations(node.metadata),
      sourceLocation: _extractSourceLocation(node),
    );
  }
  
  WidgetIR extractStatefulWidget(ClassDeclaration node) {
    final widgetId = builder.generateId('widget');
    final widgetName = node.name.lexeme;
    
    // Extract createState method to find state class
    String? stateClassName;
    for (final member in node.members) {
      if (member is MethodDeclaration && member.name.lexeme == 'createState') {
        stateClassName = _extractStateClassName(member);
        break;
      }
    }
    
    final fields = <FieldIR>[];
    for (final member in node.members) {
      if (member is FieldDeclaration) {
        fields.addAll(_extractFields(member));
      }
    }
    
    ConstructorIR? constructor;
    for (final member in node.members) {
      if (member is ConstructorDeclaration) {
        constructor = _extractConstructor(member);
        break;
      }
    }
    
    return WidgetIR(
      id: widgetId,
      name: widgetName,
      type: 'StatefulWidget',
      classification: WidgetClassification.stateful,
      isStateful: true,
      properties: _convertFieldsToProperties(fields),
      fields: fields,
      constructor: constructor,
      buildMethod: null, // Build method is in state class
      children: [],
      lifecycleMethods: [],
      eventHandlers: [],
      annotations: _extractAnnotations(node.metadata),
      sourceLocation: _extractSourceLocation(node),
      stateBinding: stateClassName != null 
          ? StateBindingIR(
              stateClassName: stateClassName,
              propertyBindings: [],
              callbackBindings: [],
            )
          : null,
    );
  }
  
  List<FieldIR> _extractFields(FieldDeclaration fieldDecl) {
    final fields = <FieldIR>[];
    
    for (final variable in fieldDecl.fields.variables) {
      fields.add(FieldIR(
        name: variable.name.lexeme,
        type: _extractType(fieldDecl.fields.type),
        initializer: variable.initializer != null
            ? _extractExpression(variable.initializer!)
            : null,
        isFinal: fieldDecl.fields.isFinal,
        isConst: fieldDecl.fields.isConst,
        isStatic: fieldDecl.isStatic,
        isLate: fieldDecl.fields.isLate,
        visibility: variable.name.lexeme.startsWith('_')
            ? VisibilityModifier.private
            : VisibilityModifier.public,
      ));
    }
    
    return fields;
  }
  
  ConstructorIR _extractConstructor(ConstructorDeclaration node) {
    return ConstructorIR(
      name: node.name?.lexeme ?? '',
      parameters: _extractParameters(node.parameters),
      initializers: node.initializers
          .map((init) => _extractInitializer(init))
          .toList(),
      body: node.body is BlockFunctionBody
          ? _extractStatement((node.body as BlockFunctionBody).block)
          : null,
      isConst: node.constKeyword != null,
      isFactory: node.factoryKeyword != null,
    );
  }
  
  BuildMethodIR _extractBuildMethod(MethodDeclaration node) {
    final localVars = <LocalVariableIR>[];
    final statements = <StatementIR>[];
    
    // Extract method body
    if (node.body is BlockFunctionBody) {
      final block = (node.body as BlockFunctionBody).block;
      for (final statement in block.statements) {
        if (statement is VariableDeclarationStatement) {
          localVars.addAll(_extractLocalVariables(statement));
        }
        statements.add(_extractStatement(statement));
      }
    }
    
    // Extract return expression
    ExpressionIR? returnExpr;
    if (node.body is ExpressionFunctionBody) {
      returnExpr = _extractExpression(
        (node.body as ExpressionFunctionBody).expression
      );
    } else if (statements.isNotEmpty && 
               statements.last is ReturnStatementIR) {
      returnExpr = (statements.last as ReturnStatementIR).expression;
    }
    
    // Build widget tree from return expression
    final widgetTree = returnExpr != null
        ? _buildWidgetTree(returnExpr)
        : WidgetTreeIR(
            root: WidgetNodeIR(
              id: builder.generateId('node'),
              widgetType: 'Unknown',
              properties: {},
            ),
            depth: 0,
            nodeCount: 0,
          );
    
    return BuildMethodIR(
      parameters: _extractParameters(node.parameters!),
      returnExpression: returnExpr ?? _createNullExpression(),
      statements: statements,
      localVariables: localVars,
      capturedVariables: _findCapturedVariables(node),
      widgetTree: widgetTree,
    );
  }
  
  WidgetTreeIR _buildWidgetTree(ExpressionIR expr) {
    if (expr is MethodCallExpressionIR) {
      final widgetType = _extractWidgetTypeName(expr);
      final properties = _extractWidgetProperties(expr);
      final children = _extractWidgetChildren(expr);
      
      final rootNode = WidgetNodeIR(
        id: builder.generateId('node'),
        widgetType: widgetType,
        properties: properties,
        children: children,
      );
      
      return WidgetTreeIR(
        root: rootNode,
        depth: _calculateDepth(rootNode),
        nodeCount: _countNodes(rootNode),
      );
    }
    
    // Handle other expression types...
    return WidgetTreeIR(
      root: WidgetNodeIR(
        id: builder.generateId('node'),
        widgetType: 'Unknown',
        properties: {},
      ),
      depth: 0,
      nodeCount: 0,
    );
  }
  
  // Helper methods
  
  List<PropertyIR> _convertFieldsToProperties(List<FieldIR> fields) {
    return fields
        .where((f) => !f.name.startsWith('_'))
        .map((f) => PropertyIR(
          name: f.name,
          type: f.type,
          isRequired: f.isFinal && f.initializer == null,
          defaultValue: f.initializer,
        ))
        .toList();
  }
  
  String? _extractStateClassName(MethodDeclaration node) {
    if (node.body is ExpressionFunctionBody) {
      final expr = (node.body as ExpressionFunctionBody).expression;
      if (expr is InstanceCreationExpression) {
        return expr.constructorName.type.name2.toString();
      }
    }
    return null;
  }
  
  TypeIR _extractType(TypeAnnotation? typeAnnotation) {
    if (typeAnnotation == null) {
      return DynamicTypeIR(id: builder.generateId('type'));
    }
    
    // Implement type extraction logic
    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: typeAnnotation.toString(),
      isNullable: typeAnnotation.question != null,
    );
  }
  
  ExpressionIR _extractExpression(Expression expr) {
    // Implement expression extraction (detailed in next section)
    return LiteralExpressionIR(
      id: builder.generateId('expr'),
      resultType: DynamicTypeIR(id: builder.generateId('type')),
      sourceLocation: _extractSourceLocation(expr),
      value: null,
      literalType: LiteralType.nullValue,
    );
  }
  
  StatementIR _extractStatement(Statement stmt) {
    // Implement statement extraction
    return ExpressionStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(stmt),
      expression: _createNullExpression(),
    );
  }
  
  StatementIR _extractInitializer(ConstructorInitializer init) {
    // Implement initializer extraction
    return ExpressionStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: SourceLocationIR(
        file: '',
        line: 0,
        column: 0,
        offset: 0,
        length: 0,
      ),
      expression: _createNullExpression(),
    );
  }
  
  List<ParameterIR> _extractParameters(FormalParameterList params) {
    final result = <ParameterIR>[];
    
    for (final param in params.parameters) {
      if (param is DefaultFormalParameter) {
        result.add(ParameterIR(
          name: param.name!.lexeme,
          type: _extractType(param.parameter.declaredElement?.type as TypeAnnotation?),
          defaultValue: param.defaultValue != null
              ? _extractExpression(param.defaultValue!)
              : null,
          isRequired: param.isRequired,
          isNamed: param.isNamed,
          isPositional: param.isPositional,
        ));
      }
    }
    
    return result;
  }
  
  List<LocalVariableIR> _extractLocalVariables(
    VariableDeclarationStatement stmt
  ) {
    final result = <LocalVariableIR>[];
    
    for (final variable in stmt.variables.variables) {
      result.add(LocalVariableIR(
        name: variable.name.lexeme,
        type: _extractType(stmt.variables.type),
        initializer: variable.initializer != null
            ? _extractExpression(variable.initializer!)
            : null,
        isFinal: stmt.variables.isFinal,
        isLate: stmt.variables.isLate,
      ));
    }
    
    return result;
  }
  
  List<String> _findCapturedVariables(MethodDeclaration node) {
    // Analyze which variables from outer scope are used
    final captured = <String>[];
    // Implementation would traverse the AST and track variable references
    return captured;
  }
  
  String _extractWidgetTypeName(MethodCallExpressionIR expr) {
    // Extract widget constructor name
    return 'Widget';
  }
  
  Map<String, ExpressionIR> _extractWidgetProperties(
    MethodCallExpressionIR expr
  ) {
    // Extract named parameters as widget properties
    return {};
  }
  
  List<WidgetNodeIR> _extractWidgetChildren(MethodCallExpressionIR expr) {
    // Extract child/children properties
    return [];
  }
  
  int _calculateDepth(WidgetNodeIR node) {
    if (node.children.isEmpty) return 1;
    return 1 + node.children.map(_calculateDepth).reduce((a, b) => a > b ? a : b);
  }
  
  int _countNodes(WidgetNodeIR node) {
    return 1 + node.children.fold(0, (sum, child) => sum + _countNodes(child));
  }
  
  List<AnnotationIR> _extractAnnotations(List<Annotation> metadata) {
    return metadata.map((ann) => AnnotationIR(
      name: ann.name.toString(),
      arguments: {},
    )).toList();
  }
  
  SourceLocationIR _extractSourceLocation(AstNode node) {
    return SourceLocationIR(
      file: node.root.toString(),
      line: node.offset,
      column: 0,
      offset: node.offset,
      length: node.length,
    );
  }
  
ExpressionIR _createNullExpression() {
    return LiteralExpressionIR(
        id: builder.generateId('expr'),
        resultType: DynamicTypeIR(id: builder.generateId('type')),
        sourceLocation: SourceLocationIR(
            file: '',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
        ),
        value: null,
        literalType: LiteralType.nullValue,
    );
}