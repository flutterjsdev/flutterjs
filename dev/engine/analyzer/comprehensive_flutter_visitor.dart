// import 'package:analyzer/dart/analysis/utilities.dart';
// import 'package:analyzer/dart/ast/ast.dart';
// import 'package:analyzer/dart/ast/visitor.dart';
// import 'package:analyzer/dart/element/type.dart';

// import 'flutter_app_ir.dart';

// class ComprehensiveFlutterVisitor extends RecursiveAstVisitor<void> {
//   final FlutterAppIR app = FlutterAppIR(
//     version: 2,
//     widgets: [],
//     functions: [],
//     routes: [],
//     stateClasses: [],
//     animations: [],
//     providers: [],
//     imports: [],
//   );

//   // Context tracking
//   ClassDeclaration? _currentClass;
//   MethodDeclaration? _currentMethod;
//   final List<String> _scope = [];
//   final Map<String, DartType> _typeMap = {};

//   @override
//   void visitImportDirective(ImportDirective node) {
//     app.imports.add(ImportIR(
//       uri: node.uri.stringValue ?? '',
//       prefix: node.prefix?.name ?? '',
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
//   void visitClassDeclaration(ClassDeclaration node) {
//     _currentClass = node;
    
//     if (_isStatefulWidget(node)) {
//       final widget = _extractStatefulWidget(node);
//       app.widgets.add(widget);
//     } else if (_isStatelessWidget(node)) {
//       final widget = _extractStatelessWidget(node);
//       app.widgets.add(widget);
//     } else if (_isStateClass(node)) {
//       final state = _extractStateClass(node);
//       app.stateClasses.add(state);
//     } else if (_isProvider(node)) {
//       final provider = _extractProvider(node);
//       app.providers.add(provider);
//     }
    
//     super.visitClassDeclaration(node);
//     _currentClass = null;
//   }

//   @override
//   void visitMethodDeclaration(MethodDeclaration node) {
//     _currentMethod = node;
    
//     if (node.name.toString() == 'build' && _currentClass != null) {
//       _extractBuildMethod(node);
//     } else if (node.name.toString() == 'initState') {
//       _extractLifecycleMethod(node, LifecycleType.initState);
//     } else if (node.name.toString() == 'dispose') {
//       _extractLifecycleMethod(node, LifecycleType.dispose);
//     } else if (node.name.toString() == 'didUpdateWidget') {
//       _extractLifecycleMethod(node, LifecycleType.didUpdateWidget);
//     } else if (node.name.toString() == 'didChangeDependencies') {
//       _extractLifecycleMethod(node, LifecycleType.didChangeDependencies);
//     }
    
//     super.visitMethodDeclaration(node);
//     _currentMethod = null;
//   }

//   @override
//   void visitMethodInvocation(MethodInvocation node) {
//     final methodName = node.methodName.name;
    
//     // Track setState calls
//     if (methodName == 'setState') {
//       _extractSetStateCall(node);
//     }
    
//     // Track navigation
//     else if (methodName == 'push' || methodName == 'pop' || 
//              methodName == 'pushNamed' || methodName == 'pushReplacement') {
//       _extractNavigationCall(node);
//     }
    
//     // Track Theme/MediaQuery access
//     else if (node.target?.toString() == 'Theme.of' || 
//              node.target?.toString() == 'MediaQuery.of') {
//       _extractContextDependency(node);
//     }
    
//     // Track Provider usage
//     else if (methodName == 'read' || methodName == 'watch' || 
//              methodName == 'select') {
//       _extractProviderUsage(node);
//     }
    
//     super.visitMethodInvocation(node);
//   }

//   @override
//   void visitInstanceCreationExpression(InstanceCreationExpression node) {
//     final typeName = node.constructorName.type.name.toString();
    
//     // Track widget instantiation
//     if (_isFlutterWidget(typeName)) {
//       _extractWidgetInstantiation(node);
//     }
    
//     // Track animation controller creation
//     else if (typeName == 'AnimationController') {
//       _extractAnimationController(node);
//     }
    
//     // Track stream/future builders
//     else if (typeName == 'StreamBuilder' || typeName == 'FutureBuilder') {
//       _extractAsyncBuilder(node);
//     }
    
//     super.visitInstanceCreationExpression(node);
//   }

//   @override
//   void visitFunctionExpression(FunctionExpression node) {
//     _extractCallback(node);
//     super.visitFunctionExpression(node);
//   }

//   @override
//   void visitAwaitExpression(AwaitExpression node) {
//     _extractAsyncOperation(node);
//     super.visitAwaitExpression(node);
//   }

//   // Helper methods implementation...
//   bool _isStatefulWidget(ClassDeclaration node) {
//     return node.extendsClause?.superclass.name2.toString() == 'StatefulWidget';
//   }

//   bool _isStatelessWidget(ClassDeclaration node) {
//     return node.extendsClause?.superclass.name2.toString() == 'StatelessWidget';
//   }

//   bool _isStateClass(ClassDeclaration node) {
//     final extendsClause = node.extendsClause?.superclass.name2.toString();
//     return extendsClause?.startsWith('State<') ?? false;
//   }

//   bool _isProvider(ClassDeclaration node) {
//     final mixins = node.withClause?.mixinTypes2.map((t) => t.name2.toString()) ?? [];
//     return mixins.any((m) => m.contains('ChangeNotifier') || m.contains('Provider'));
//   }

//   bool _isFlutterWidget(String typeName) {
//     const commonWidgets = [
//       'Container', 'Row', 'Column', 'Stack', 'Positioned',
//       'Text', 'Image', 'Icon', 'IconButton', 'ElevatedButton',
//       'Scaffold', 'AppBar', 'BottomNavigationBar', 'Drawer',
//       'ListView', 'GridView', 'SingleChildScrollView',
//       'TextField', 'Form', 'TextFormField',
//       'AnimatedContainer', 'AnimatedOpacity', 'Hero',
//       'GestureDetector', 'InkWell', 'Material',
//     ];
//     return commonWidgets.contains(typeName);
//   }

//   // Extraction methods (shown in next sections)...
// }



// lib/src/analyzer/enhanced_ast_visitor.dart

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:analyzer/dart/element/element.dart';
import '../ir/Expression/expression_ir.dart';
import '../ir/Statement/statement_ir.dart';
import '../ir/ir_schema.dart';
import '../ir/widget/widget_ir.dart';
import 'analying_project.dart';

/// Multi-pass AST visitor that works within FileAnalysisContext
/// 
/// This visitor is designed to work in a multi-pass architecture:
/// 1. Type declarations are already in TypeRegistry
/// 2. Dependencies are already resolved
/// 3. This visitor focuses on generating accurate IR for one file
class EnhancedASTVisitor extends RecursiveAstVisitor<void> {
  final FileAnalysisContext context;
  final FileIRBuilder builder;
  
  // Scope tracking
  final List<ScopeInfo> _scopeStack = [];
  final Map<String, DartType> _localTypes = {};
  
  // Current context
  ClassDeclaration? _currentClass;
  MethodDeclaration? _currentMethod;
  FunctionExpression? _currentFunction;
  
  // Capture tracking for closures
  final Set<String> _capturedVariables = <String>{};
  
  EnhancedASTVisitor(this.context) : builder = FileIRBuilder(context);
  
  FileIR get result => builder.build();

  // ==========================================================================
  // IMPORTS & EXPORTS
  // ==========================================================================
  
  @override
  void visitImportDirective(ImportDirective node) {
    builder.addImport(ImportIR(
      uri: node.uri.stringValue ?? '',
      prefix: node.prefix?.name ?? '',
      isDeferred: node.deferredKeyword != null,
      showCombinators: _extractShowCombinators(node),
      hideCombinators: _extractHideCombinators(node),
    ));
    super.visitImportDirective(node);
  }
  
  @override
  void visitExportDirective(ExportDirective node) {
    builder.addExport(node.uri.stringValue ?? '');
    super.visitExportDirective(node);
  }

  // ==========================================================================
  // CLASS DECLARATIONS
  // ==========================================================================
  
  @override
  void visitClassDeclaration(ClassDeclaration node) {
    _currentClass = node;
    _pushScope(ScopeType.classDecl, node.name.lexeme);
    
    try {
      if (_isStatefulWidget(node)) {
        _extractStatefulWidget(node);
      } else if (_isStatelessWidget(node)) {
        _extractStatelessWidget(node);
      } else if (_isStateClass(node)) {
        _extractStateClass(node);
      } else if (_isProvider(node)) {
        _extractProvider(node);
      } else {
        // Regular class - might be a model, utility, etc.
        _extractRegularClass(node);
      }
      
      super.visitClassDeclaration(node);
    } finally {
      _popScope();
      _currentClass = null;
    }
  }

  // ==========================================================================
  // METHOD DECLARATIONS
  // ==========================================================================
  
  @override
  void visitMethodDeclaration(MethodDeclaration node) {
    _currentMethod = node;
    _pushScope(ScopeType.method, node.name.lexeme);
    
    try {
      final methodName = node.name.lexeme;
      
      if (methodName == 'build' && _isInWidgetClass()) {
        _extractBuildMethod(node);
      } else if (_isLifecycleMethod(methodName)) {
        _extractLifecycleMethod(node, _getLifecycleType(methodName));
      } else if (methodName == 'createState' && _isStatefulWidget(_currentClass!)) {
        // Already handled in widget extraction
      } else {
        // Regular method
        _extractRegularMethod(node);
      }
      
      super.visitMethodDeclaration(node);
    } finally {
      _popScope();
      _currentMethod = null;
    }
  }

  // ==========================================================================
  // METHOD INVOCATIONS - Critical for tracking setState, navigation, etc.
  // ==========================================================================
  
  @override
  void visitMethodInvocation(MethodInvocation node) {
    final methodName = node.methodName.name;
    final target = node.target;
    
    // Track setState calls
    if (methodName == 'setState' && _isInStateClass()) {
      _extractSetStateCall(node);
    }
    
    // Track navigation
    else if (_isNavigationCall(methodName, target)) {
      _extractNavigationCall(node);
    }
    
    // Track Theme/MediaQuery access
    else if (_isContextAccess(methodName, target)) {
      _extractContextDependency(node);
    }
    
    // Track Provider usage
    else if (_isProviderAccess(methodName, target)) {
      _extractProviderUsage(node);
    }
    
    // Track Future/Stream operations
    else if (_isAsyncOperation(methodName, target)) {
      _extractAsyncOperation(node);
    }
    
    super.visitMethodInvocation(node);
  }

  // ==========================================================================
  // INSTANCE CREATION - Widget instantiation, controllers, etc.
  // ==========================================================================
  
  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final typeName = node.constructorName.type.name2.toString();
    
    // Track widget instantiation
    if (_isFlutterWidget(typeName)) {
      _extractWidgetInstantiation(node);
    }
    
    // Track animation controller creation
    else if (typeName == 'AnimationController') {
      _extractAnimationController(node);
    }
    
    // Track StreamBuilder/FutureBuilder
    else if (typeName == 'StreamBuilder' || typeName == 'FutureBuilder') {
      _extractAsyncBuilder(node);
    }
    
    // Track TextEditingController and other controllers
    else if (_isController(typeName)) {
      _extractController(node);
    }
    
    super.visitInstanceCreationExpression(node);
  }

  // ==========================================================================
  // FUNCTION EXPRESSIONS - Callbacks, builders, etc.
  // ==========================================================================
  
  @override
  void visitFunctionExpression(FunctionExpression node) {
    _currentFunction = node;
    _pushScope(ScopeType.function, '<anonymous>');
    
    // Start tracking captured variables
    final previousCaptured = Set<String>.from(_capturedVariables);
    _capturedVariables.clear();
    
    try {
      final functionIR = _extractFunctionExpression(node);
      
      // Store the function IR in current context
      if (_currentMethod != null) {
        builder.addCallbackToCurrentMethod(functionIR);
      }
      
      super.visitFunctionExpression(node);
    } finally {
      // Restore captured variables
      _capturedVariables.addAll(previousCaptured);
      _popScope();
      _currentFunction = null;
    }
  }

  // ==========================================================================
  // VARIABLE DECLARATIONS - Track local state, fields, etc.
  // ==========================================================================
  
  @override
  void visitFieldDeclaration(FieldDeclaration node) {
    for (final variable in node.fields.variables) {
      final type = node.fields.type?.type;
      if (type != null) {
        _localTypes[variable.name.lexeme] = type;
      }
    }
    super.visitFieldDeclaration(node);
  }
  
  @override
  void visitVariableDeclarationStatement(VariableDeclarationStatement node) {
    for (final variable in node.variables.variables) {
      final type = node.variables.type?.type;
      if (type != null) {
        _localTypes[variable.name.lexeme] = type;
      }
    }
    super.visitVariableDeclarationStatement(node);
  }

  // ==========================================================================
  // IDENTIFIER REFERENCES - Track variable usage for reactivity
  // ==========================================================================
  
  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    // Check if this is a variable reference (not a type, method name, etc.)
    if (_isVariableReference(node)) {
      final name = node.name;
      
      // Track if this variable is from outer scope (captured)
      if (!_isInCurrentScope(name) && _isInFunctionExpression()) {
        _capturedVariables.add(name);
      }
      
      // Track state variable access for reactivity analysis
      if (_isStateVariable(name)) {
        builder.recordStateVariableAccess(name, _extractSourceLocation(node));
      }
    }
    
    super.visitSimpleIdentifier(node);
  }

  // ==========================================================================
  // AWAIT EXPRESSIONS - Async tracking
  // ==========================================================================
  
  @override
  void visitAwaitExpression(AwaitExpression node) {
    final asyncOp = AsyncOperationIR(
      id: builder.generateId('async'),
      type: AsyncType.awaitExpression,
      expression: _extractExpression(node.expression),
      isInAsyncFunction: _isInAsyncFunction(),
      capturedVariables: _capturedVariables.toList(),
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addAsyncOperation(asyncOp);
    super.visitAwaitExpression(node);
  }

  // ==========================================================================
  // CONTROL FLOW - For reactivity and widget tree analysis
  // ==========================================================================
  
  @override
  void visitIfStatement(IfStatement node) {
    // Track conditional branches in build methods
    if (_isInBuildMethod()) {
      builder.recordConditionalBranch(
        condition: _extractExpression(node.expression),
        sourceLocation: _extractSourceLocation(node),
      );
    }
    super.visitIfStatement(node);
  }
  
  @override
  void visitForStatement(ForStatement node) {
    if (_isInBuildMethod()) {
      builder.recordIteration(
        type: IterationType.forLoop,
        sourceLocation: _extractSourceLocation(node),
      );
    }
    super.visitForStatement(node);
  }

  // ==========================================================================
  // WIDGET EXTRACTION METHODS
  // ==========================================================================
  
  void _extractStatelessWidget(ClassDeclaration node) {
    final widgetId = builder.generateId('widget');
    final widgetName = node.name.lexeme;
    
    // Extract fields as properties
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
    
    // Extract event handlers
    final eventHandlers = <EventHandlerIR>[];
    for (final member in node.members) {
      if (member is MethodDeclaration && _isEventHandler(member)) {
        eventHandlers.add(_extractEventHandler(member));
      }
    }
    
    final widget = WidgetIR(
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
      eventHandlers: eventHandlers,
      annotations: _extractAnnotations(node.metadata),
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addWidget(widget);
  }
  
  void _extractStatefulWidget(ClassDeclaration node) {
    final widgetId = builder.generateId('widget');
    final widgetName = node.name.lexeme;
    
    // Extract createState to find associated State class
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
    
    final widget = WidgetIR(
      id: widgetId,
      name: widgetName,
      type: 'StatefulWidget',
      classification: WidgetClassification.stateful,
      isStateful: true,
      properties: _convertFieldsToProperties(fields),
      fields: fields,
      constructor: constructor,
      buildMethod: null, // Build method is in State class
      children: [],
      lifecycleMethods: [],
      eventHandlers: [],
      annotations: _extractAnnotations(node.metadata),
      sourceLocation: _extractSourceLocation(node),
      stateBinding: stateClassName != null
          ? StateBindingIR(
              stateClassName: stateClassName,
              propertyBindings: _inferPropertyBindings(fields, stateClassName),
              callbackBindings: [],
            )
          : null,
    );
    
    builder.addWidget(widget);
  }
  
  void _extractStateClass(ClassDeclaration node) {
    final stateId = builder.generateId('state');
    final stateName = node.name.lexeme;
    
    // Extract widget type from State<WidgetType>
    final widgetType = _extractWidgetTypeFromState(node);
    
    // Separate state fields from regular fields
    final stateFields = <StateFieldIR>[];
    final regularFields = <FieldIR>[];
    
    for (final member in node.members) {
      if (member is FieldDeclaration) {
        final fields = _extractFields(member);
        for (final field in fields) {
          if (_isMutableStateField(field, member)) {
            stateFields.add(_convertToStateField(field));
          } else {
            regularFields.add(field);
          }
        }
      }
    }
    
    // Extract lifecycle methods
    LifecycleMethodIR? initState;
    LifecycleMethodIR? dispose;
    LifecycleMethodIR? didUpdateWidget;
    LifecycleMethodIR? didChangeDependencies;
    
    for (final member in node.members) {
      if (member is MethodDeclaration) {
        switch (member.name.lexeme) {
          case 'initState':
            initState = _extractLifecycleMethodFull(member, LifecycleType.initState);
            break;
          case 'dispose':
            dispose = _extractLifecycleMethodFull(member, LifecycleType.dispose);
            break;
          case 'didUpdateWidget':
            didUpdateWidget = _extractLifecycleMethodFull(member, LifecycleType.didUpdateWidget);
            break;
          case 'didChangeDependencies':
            didChangeDependencies = _extractLifecycleMethodFull(member, LifecycleType.didChangeDependencies);
            break;
        }
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
    
    // Extract controllers
    final controllers = _extractControllers(node);
    
    // Extract mixins
    final mixins = _extractMixins(node);
    
    final state = StateClassIR(
      id: stateId,
      name: stateName,
      widgetType: widgetType,
      stateFields: stateFields,
      regularFields: regularFields,
      initState: initState,
      dispose: dispose,
      didUpdateWidget: didUpdateWidget,
      didChangeDependencies: didChangeDependencies,
      reassemble: null,
      buildMethod: buildMethod!,
      setStateCalls: [], // Filled during method analysis
      controllers: controllers,
      contextDependencies: [], // Filled during method analysis
      mixins: mixins,
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addStateClass(state);
  }
  
  void _extractProvider(ClassDeclaration node) {
    final providerId = builder.generateId('provider');
    final providerName = node.name.lexeme;
    
    // Determine provider type
    final providerType = _determineProviderType(node);
    
    // Extract value type from ChangeNotifier or Provider generics
    final valueType = _extractProviderValueType(node);
    
    final fields = <FieldIR>[];
    final methods = <MethodIR>[];
    
    for (final member in node.members) {
      if (member is FieldDeclaration) {
        fields.addAll(_extractFields(member));
      } else if (member is MethodDeclaration) {
        methods.add(_extractMethodIR(member));
      }
    }
    
    // Find notifyListeners calls
    final notifyListenerCalls = _findNotifyListenerCalls(node);
    
    final provider = ProviderIR(
      id: providerId,
      name: providerName,
      type: providerType,
      valueType: valueType,
      fields: fields,
      methods: methods,
      notifyListenerCalls: notifyListenerCalls,
      extendsChangeNotifier: _extendsChangeNotifier(node),
    );
    
    builder.addProvider(provider);
  }

  // ==========================================================================
  // BUILD METHOD EXTRACTION - Most complex part
  // ==========================================================================
  
  BuildMethodIR _extractBuildMethod(MethodDeclaration node) {
    final localVars = <LocalVariableIR>[];
    final statements = <StatementIR>[];
    
    // Start tracking build method context
    builder.enterBuildMethod();
    
    try {
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
          (node.body as ExpressionFunctionBody).expression,
        );
      } else if (statements.isNotEmpty && statements.last is ReturnStatementIR) {
        returnExpr = (statements.last as ReturnStatementIR).expression;
      }
      
      // Build widget tree from return expression
      final widgetTree = returnExpr != null
          ? _buildWidgetTree(returnExpr)
          : _createEmptyWidgetTree();
      
      return BuildMethodIR(
        parameters: _extractParameters(node.parameters!),
        returnExpression: returnExpr ?? _createNullExpression(),
        statements: statements,
        localVariables: localVars,
        capturedVariables: _capturedVariables.toList(),
        widgetTree: widgetTree,
      );
    } finally {
      builder.exitBuildMethod();
    }
  }

  // ==========================================================================
  // WIDGET TREE BUILDING - Reconstruct the widget hierarchy
  // ==========================================================================
  
  WidgetTreeIR _buildWidgetTree(ExpressionIR expr) {
    if (expr is MethodCallExpressionIR) {
      // This is a widget constructor call
      final widgetType = _extractWidgetTypeName(expr);
      final properties = _extractWidgetProperties(expr);
      final children = _extractWidgetChildren(expr);
      final key = _extractWidgetKey(expr);
      
      final rootNode = WidgetNodeIR(
        id: builder.generateId('node'),
        widgetType: widgetType,
        properties: properties,
        children: children,
        key: key,
        isConst: expr.isConst ?? false,
      );
      
      // Extract conditional branches
      final conditionals = builder.getConditionalBranches();
      
      // Extract iterations
      final iterations = builder.getIterations();
      
      return WidgetTreeIR(
        root: rootNode,
        conditionalBranches: conditionals,
        iterations: iterations,
        depth: _calculateDepth(rootNode),
        nodeCount: _countNodes(rootNode),
      );
    } else if (expr is ConditionalExpressionIR) {
      // Ternary operator: condition ? widget1 : widget2
      final thenTree = _buildWidgetTree(expr.thenExpression);
      final elseTree = _buildWidgetTree(expr.elseExpression);
      
      builder.addConditionalBranch(ConditionalBranchIR(
        condition: expr.condition,
        thenWidget: thenTree.root,
        elseWidget: elseTree.root,
        type: ConditionalType.ternary,
      ));
      
      return thenTree; // Return first branch as primary
    }
    
    return _createEmptyWidgetTree();
  }
  
  String _extractWidgetTypeName(MethodCallExpressionIR expr) {
    // Extract the widget class name from constructor call
    if (expr.target != null && expr.target is IdentifierExpressionIR) {
      return (expr.target as IdentifierExpressionIR).name;
    }
    return expr.methodName;
  }
  
  Map<String, ExpressionIR> _extractWidgetProperties(MethodCallExpressionIR expr) {
    // Named arguments become widget properties
    return expr.namedArguments;
  }
  
  List<WidgetNodeIR> _extractWidgetChildren(MethodCallExpressionIR expr) {
    final children = <WidgetNodeIR>[];
    
    // Look for 'child' or 'children' properties
    final childExpr = expr.namedArguments['child'];
    final childrenExpr = expr.namedArguments['children'];
    
    if (childExpr != null) {
      final childTree = _buildWidgetTree(childExpr);
      children.add(childTree.root);
    } else if (childrenExpr != null && childrenExpr is ListExpressionIR) {
      for (final element in childrenExpr.elements) {
        final childTree = _buildWidgetTree(element);
        children.add(childTree.root);
      }
    }
    
    return children;
  }
  
  KeyIR? _extractWidgetKey(MethodCallExpressionIR expr) {
    final keyExpr = expr.namedArguments['key'];
    if (keyExpr == null) return null;
    
    // Determine key type from constructor
    KeyType keyType = KeyType.valueKey;
    if (keyExpr is MethodCallExpressionIR) {
      switch (keyExpr.methodName) {
        case 'ValueKey':
          keyType = KeyType.valueKey;
          break;
        case 'ObjectKey':
          keyType = KeyType.objectKey;
          break;
        case 'UniqueKey':
          keyType = KeyType.uniqueKey;
          break;
        case 'GlobalKey':
          keyType = KeyType.globalKey;
          break;
      }
    }
    
    return KeyIR(type: keyType, value: keyExpr);
  }

  // ==========================================================================
  // EXPRESSION EXTRACTION - Complete implementation
  // ==========================================================================
  
  ExpressionIR _extractExpression(Expression expr) {
    if (expr is StringLiteral) {
      return _extractStringLiteral(expr);
    } else if (expr is IntegerLiteral) {
      return _extractIntegerLiteral(expr);
    } else if (expr is DoubleLiteral) {
      return _extractDoubleLiteral(expr);
    } else if (expr is BooleanLiteral) {
      return _extractBooleanLiteral(expr);
    } else if (expr is NullLiteral) {
      return _extractNullLiteral(expr);
    } else if (expr is SimpleIdentifier) {
      return _extractIdentifier(expr);
    } else if (expr is BinaryExpression) {
      return _extractBinaryExpression(expr);
    } else if (expr is MethodInvocation) {
      return _extractMethodCall(expr);
    } else if (expr is PropertyAccess) {
      return _extractPropertyAccess(expr);
    } else if (expr is ConditionalExpression) {
      return _extractConditionalExpression(expr);
    } else if (expr is FunctionExpression) {
      return _extractFunctionExpression(expr);
    } else if (expr is ListLiteral) {
      return _extractListLiteral(expr);
    } else if (expr is SetOrMapLiteral) {
      return _extractMapLiteral(expr);
    } else if (expr is AwaitExpression) {
      return _extractAwaitExpression(expr);
    } else if (expr is AsExpression) {
      return _extractAsExpression(expr);
    } else if (expr is IsExpression) {
      return _extractIsExpression(expr);
    } else if (expr is InstanceCreationExpression) {
      return _extractInstanceCreation(expr);
    }
    
    // Fallback for unknown expression types
    return _createNullExpression();
  }
  
  // Specific expression extractors...
  ExpressionIR _extractStringLiteral(StringLiteral expr) {
    return LiteralExpressionIR(
      id: builder.generateId('expr'),
      resultType: _createStringType(),
      sourceLocation: _extractSourceLocation(expr),
      value: expr.stringValue,
      literalType: LiteralType.string,
    );
  }
  
  ExpressionIR _extractBinaryExpression(BinaryExpression expr) {
    return BinaryExpressionIR(
      id: builder.generateId('expr'),
      resultType: _inferBinaryResultType(expr),
      sourceLocation: _extractSourceLocation(expr),
      left: _extractExpression(expr.leftOperand),
      operator: _convertOperator(expr.operator.type),
      right: _extractExpression(expr.rightOperand),
    );
  }
  
  ExpressionIR _extractMethodCall(MethodInvocation expr) {
    return MethodCallExpressionIR(
      id: builder.generateId('expr'),
      resultType: _inferMethodCallType(expr),
      sourceLocation: _extractSourceLocation(expr),
      target: expr.target != null ? _extractExpression(expr.target!) : null,
      methodName: expr.methodName.name,
      arguments: expr.argumentList.arguments
          .where((arg) => arg is! NamedExpression)
          .map((arg) => _extractExpression(arg))
          .toList(),
      namedArguments: Map.fromEntries(
        expr.argumentList.arguments
            .whereType<NamedExpression>()
            .map((arg) => MapEntry(
                  arg.name.label.name,
                  _extractExpression(arg.expression),
                )),
      ),
      typeArguments: expr.typeArguments?.arguments
              .map((type) => _convertType(type.type))
              .toList() ??
          [],
      isNullAware: expr.operator?.type.toString() == '?.',
      isCascade: expr.operator?.type.toString() == '..',
    );
  }

  // ==========================================================================
  // STATEMENT EXTRACTION - Complete implementation
  // ==========================================================================
  
  StatementIR _extractStatement(Statement stmt) {
    if (stmt is Block) {
      return _extractBlockStatement(stmt);
    } else if (stmt is ExpressionStatement) {
      return _extractExpressionStatement(stmt);
    } else if (stmt is VariableDeclarationStatement) {
      return _extractVariableDeclarationStatement(stmt);
    } else if (stmt is IfStatement) {
      return _extractIfStatement(stmt);
    } else if (stmt is ForStatement) {
      return _extractForStatement(stmt);
    } else if (stmt is ForEachStatement) {
      return _extractForEachStatement(stmt);
    } else if (stmt is WhileStatement) {
      return _extractWhileStatement(stmt);
    } else if (stmt is DoStatement) {
      return _extractDoWhileStatement(stmt);
    } else if (stmt is SwitchStatement) {
      return _extractSwitchStatement(stmt);
    } else if (stmt is TryStatement) {
      return _extractTryStatement(stmt);
    } else if (stmt is ReturnStatement) {
      return _extractReturnStatement(stmt);
    } else if (stmt is BreakStatement) {
      return _extractBreakStatement(stmt);
    } else if (stmt is ContinueStatement) {
      return _extractContinueStatement(stmt);
    }
    
    // Fallback
    return ExpressionStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(stmt),
      expression: _createNullExpression(),
    );
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  
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
            .toList() ??
        [];
    return mixins.any((m) => m.contains('ChangeNotifier'));

  }
  // lib/src/analyzer/enhanced_ast_visitor.dart - CONTINUATION

  // ==========================================================================
  // HELPER METHODS (Continued)
  // ==========================================================================
  
  bool _isFlutterWidget(String typeName) {
    const commonWidgets = {
      // Layout
      'Container', 'Row', 'Column', 'Stack', 'Positioned', 'Flex', 'Wrap',
      'Expanded', 'Flexible', 'SizedBox', 'ConstrainedBox', 'AspectRatio',
      'FittedBox', 'FractionallySizedBox', 'LayoutBuilder', 'CustomSingleChildLayout',
      
      // Display
      'Text', 'RichText', 'Image', 'Icon', 'CircleAvatar', 'Placeholder',
      'DecoratedBox', 'Opacity', 'ClipRect', 'ClipRRect', 'ClipOval', 'ClipPath',
      
      // Buttons
      'ElevatedButton', 'TextButton', 'OutlinedButton', 'IconButton', 'FloatingActionButton',
      
      // Scaffold
      'Scaffold', 'AppBar', 'BottomNavigationBar', 'Drawer', 'BottomSheet',
      'SnackBar', 'MaterialBanner', 'TabBar', 'TabBarView',
      
      // Lists
      'ListView', 'GridView', 'SingleChildScrollView', 'CustomScrollView',
      'SliverList', 'SliverGrid', 'ReorderableListView',
      
      // Input
      'TextField', 'TextFormField', 'Form', 'Checkbox', 'Radio', 'Switch',
      'Slider', 'DropdownButton', 'DatePicker', 'TimePicker',
      
      // Animation
      'AnimatedContainer', 'AnimatedOpacity', 'AnimatedPositioned', 'AnimatedSize',
      'Hero', 'FadeTransition', 'SlideTransition', 'ScaleTransition', 'RotationTransition',
      'AnimatedBuilder', 'TweenAnimationBuilder',
      
      // Gesture
      'GestureDetector', 'InkWell', 'Dismissible', 'Draggable', 'DragTarget',
      'LongPressDraggable', 'Listener', 'MouseRegion',
      
      // Other
      'Material', 'Card', 'Chip', 'Divider', 'ListTile', 'ExpansionTile',
      'Padding', 'Center', 'Align', 'SafeArea', 'MediaQuery', 'Theme',
      'Builder', 'LayoutBuilder', 'FutureBuilder', 'StreamBuilder',
    };
    return commonWidgets.contains(typeName);
  }
  
  bool _isController(String typeName) {
    return typeName.endsWith('Controller') || 
           typeName == 'TextEditingController' ||
           typeName == 'AnimationController' ||
           typeName == 'ScrollController' ||
           typeName == 'PageController' ||
           typeName == 'TabController' ||
           typeName == 'VideoPlayerController';
  }
  
  bool _isLifecycleMethod(String methodName) {
    return ['initState', 'dispose', 'didUpdateWidget', 
            'didChangeDependencies', 'reassemble', 'deactivate', 
            'activate'].contains(methodName);
  }
  
  LifecycleType _getLifecycleType(String methodName) {
    switch (methodName) {
      case 'initState':
        return LifecycleType.initState;
      case 'dispose':
        return LifecycleType.dispose;
      case 'didUpdateWidget':
        return LifecycleType.didUpdateWidget;
      case 'didChangeDependencies':
        return LifecycleType.didChangeDependencies;
      case 'reassemble':
        return LifecycleType.reassemble;
      case 'deactivate':
        return LifecycleType.deactivate;
      case 'activate':
        return LifecycleType.activate;
      default:
        return LifecycleType.initState;
    }
  }
  
  bool _isNavigationCall(String methodName, Expression? target) {
    if (target?.toString().contains('Navigator') ?? false) {
      return ['push', 'pop', 'pushNamed', 'pushReplacement', 
              'pushReplacementNamed', 'pushAndRemoveUntil', 
              'popUntil', 'canPop', 'maybePop'].contains(methodName);
    }
    return false;
  }
  
  bool _isContextAccess(String methodName, Expression? target) {
    final targetStr = target?.toString() ?? '';
    return (targetStr.contains('Theme.of') || 
            targetStr.contains('MediaQuery.of') ||
            targetStr.contains('Scaffold.of') ||
            targetStr.contains('FocusScope.of')) &&
           methodName == 'of';
  }
  
  bool _isProviderAccess(String methodName, Expression? target) {
    return ['read', 'watch', 'select'].contains(methodName) &&
           (target?.toString().contains('context') ?? false);
  }
  
  bool _isAsyncOperation(String methodName, Expression? target) {
    return methodName == 'then' || 
           methodName == 'catchError' || 
           methodName == 'whenComplete' ||
           methodName == 'listen' ||
           methodName == 'asyncMap';
  }
  
  bool _isEventHandler(MethodDeclaration method) {
    final name = method.name.lexeme;
    return name.startsWith('_on') || 
           name.startsWith('_handle') ||
           name.startsWith('on') && !_isLifecycleMethod(name);
  }
  
  bool _isInWidgetClass() {
    return _currentClass != null && 
           (_isStatelessWidget(_currentClass!) || 
            _isStatefulWidget(_currentClass!));
  }
  
  bool _isInStateClass() {
    return _currentClass != null && _isStateClass(_currentClass!);
  }
  
  bool _isInBuildMethod() {
    return _currentMethod?.name.lexeme == 'build';
  }
  
  bool _isInFunctionExpression() {
    return _currentFunction != null;
  }
  
  bool _isInAsyncFunction() {
    return _currentMethod?.body.isAsynchronous ?? false;
  }
  
  bool _isVariableReference(SimpleIdentifier node) {
    final parent = node.parent;
    // Not a type annotation, not a method name
    return parent is! TypeAnnotation && 
           parent is! MethodDeclaration &&
           parent is! MethodInvocation ||
           (parent is MethodInvocation && parent.methodName != node);
  }
  
  bool _isInCurrentScope(String name) {
    return _scopeStack.any((scope) => scope.declaredVariables.contains(name));
  }
  
  bool _isStateVariable(String name) {
    if (!_isInStateClass()) return false;
    
    // Check if this is a field in the state class
    for (final member in _currentClass!.members) {
      if (member is FieldDeclaration) {
        for (final variable in member.fields.variables) {
          if (variable.name.lexeme == name && !member.fields.isFinal) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  bool _isMutableStateField(FieldIR field, FieldDeclaration decl) {
    return !field.isFinal && !field.isConst && !field.isStatic;
  }

  // ==========================================================================
  // SCOPE MANAGEMENT
  // ==========================================================================
  
  void _pushScope(ScopeType type, String name) {
    _scopeStack.add(ScopeInfo(
      type: type,
      name: name,
      declaredVariables: <String>{},
    ));
  }
  
  void _popScope() {
    if (_scopeStack.isNotEmpty) {
      _scopeStack.removeLast();
    }
  }
  
  void _addToCurrentScope(String variableName) {
    if (_scopeStack.isNotEmpty) {
      _scopeStack.last.declaredVariables.add(variableName);
    }
  }

  // ==========================================================================
  // EXTRACTION HELPERS
  // ==========================================================================
  
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
  
  List<FieldIR> _extractFields(FieldDeclaration fieldDecl) {
    final fields = <FieldIR>[];
    
    for (final variable in fieldDecl.fields.variables) {
      fields.add(FieldIR(
        name: variable.name.lexeme,
        type: _convertType(fieldDecl.fields.type?.type),
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
      
      _addToCurrentScope(variable.name.lexeme);
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
  
  StatementIR _extractInitializer(ConstructorInitializer init) {
    if (init is ConstructorFieldInitializer) {
      return ExpressionStatementIR(
        id: builder.generateId('stmt'),
        sourceLocation: _extractSourceLocation(init),
        expression: _extractExpression(init.expression),
      );
    } else if (init is SuperConstructorInvocation) {
      return ExpressionStatementIR(
        id: builder.generateId('stmt'),
        sourceLocation: _extractSourceLocation(init),
        expression: MethodCallExpressionIR(
          id: builder.generateId('expr'),
          resultType: VoidTypeIR(id: builder.generateId('type')),
          sourceLocation: _extractSourceLocation(init),
          target: null,
          methodName: 'super',
          arguments: init.argumentList.arguments
              .where((arg) => arg is! NamedExpression)
              .map((arg) => _extractExpression(arg))
              .toList(),
          namedArguments: Map.fromEntries(
            init.argumentList.arguments
                .whereType<NamedExpression>()
                .map((arg) => MapEntry(
                      arg.name.label.name,
                      _extractExpression(arg.expression),
                    )),
          ),
        ),
      );
    }
    
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
      String name;
      DartType? type;
      Expression? defaultValue;
      bool isRequired = false;
      bool isNamed = false;
      bool isPositional = true;
      
      if (param is DefaultFormalParameter) {
        name = param.parameter.name?.lexeme ?? '';
        type = param.parameter.declaredElement?.type;
        defaultValue = param.defaultValue;
        isRequired = param.isRequired;
        isNamed = param.isNamed;
        isPositional = param.isPositional;
      } else {
        name = param.name?.lexeme ?? '';
        type = param.declaredElement?.type;
      }
      
      result.add(ParameterIR(
        name: name,
        type: _convertType(type),
        defaultValue: defaultValue != null 
            ? _extractExpression(defaultValue) 
            : null,
        isRequired: isRequired,
        isNamed: isNamed,
        isPositional: isPositional,
        annotations: _extractAnnotations(param.metadata),
      ));
      
      _addToCurrentScope(name);
    }
    
    return result;
  }
  
  List<LocalVariableIR> _extractLocalVariables(VariableDeclarationStatement stmt) {
    final result = <LocalVariableIR>[];
    
    for (final variable in stmt.variables.variables) {
      result.add(LocalVariableIR(
        name: variable.name.lexeme,
        type: _convertType(stmt.variables.type?.type),
        initializer: variable.initializer != null
            ? _extractExpression(variable.initializer!)
            : null,
        isFinal: stmt.variables.isFinal,
        isLate: stmt.variables.isLate,
      ));
      
      _addToCurrentScope(variable.name.lexeme);
    }
    
    return result;
  }
  
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
    } else if (node.body is BlockFunctionBody) {
      final block = (node.body as BlockFunctionBody).block;
      for (final statement in block.statements) {
        if (statement is ReturnStatement && statement.expression != null) {
          final expr = statement.expression!;
          if (expr is InstanceCreationExpression) {
            return expr.constructorName.type.name2.toString();
          }
        }
      }
    }
    return null;
  }
  
  String _extractWidgetTypeFromState(ClassDeclaration node) {
    final extendsClause = node.extendsClause?.superclass.name2.toString();
    if (extendsClause != null && extendsClause.startsWith('State<')) {
      // Extract generic type: State<MyWidget> -> MyWidget
      final match = RegExp(r'State<(.+)>').firstMatch(extendsClause);
      if (match != null) {
        return match.group(1)!;
      }
    }
    return 'UnknownWidget';
  }
  
  StateFieldIR _convertToStateField(FieldIR field) {
    return StateFieldIR(
      name: field.name,
      type: field.type,
      initializer: field.initializer,
      isMutable: !field.isFinal && !field.isConst,
      isLate: field.isLate,
      affectedBy: [], // Will be filled during analysis
      affects: [],    // Will be filled during analysis
    );
  }
  
  List<PropertyBindingIR> _inferPropertyBindings(
    List<FieldIR> fields,
    String stateClassName,
  ) {
    // Infer which widget properties map to state fields
    final bindings = <PropertyBindingIR>[];
    
    for (final field in fields) {
      if (field.isFinal && !field.name.startsWith('_')) {
        bindings.add(PropertyBindingIR(
          propertyName: field.name,
          stateField: field.name,
          isTwoWay: false,
        ));
      }
    }
    
    return bindings;
  }
  
  ProviderType _determineProviderType(ClassDeclaration node) {
    if (_extendsChangeNotifier(node)) {
      return ProviderType.changeNotifier;
    }
    // Check for other provider types
    return ProviderType.custom;
  }
  
  bool _extendsChangeNotifier(ClassDeclaration node) {
    final extendsClause = node.extendsClause?.superclass.name2.toString();
    return extendsClause == 'ChangeNotifier';
  }
  
  TypeIR _extractProviderValueType(ClassDeclaration node) {
    // For ChangeNotifier, the type is the class itself
    if (_extendsChangeNotifier(node)) {
      return SimpleTypeIR(
        id: builder.generateId('type'),
        name: node.name.lexeme,
        isNullable: false,
      );
    }
    return DynamicTypeIR(id: builder.generateId('type'));
  }
  
  List<ControllerIR> _extractControllers(ClassDeclaration node) {
    final controllers = <ControllerIR>[];
    
    for (final member in node.members) {
      if (member is FieldDeclaration) {
        for (final variable in member.fields.variables) {
          final typeName = member.fields.type?.toString() ?? '';
          if (_isController(typeName)) {
            controllers.add(ControllerIR(
              name: variable.name.lexeme,
              type: _getControllerType(typeName),
              initialization: variable.initializer != null
                  ? _extractExpression(variable.initializer!)
                  : _createNullExpression(),
              isDisposedInDispose: _checkIfDisposed(variable.name.lexeme, node),
              usedIn: [], // Will be filled during method analysis
            ));
          }
        }
      }
    }
    
    return controllers;
  }
  
  ControllerType _getControllerType(String typeName) {
    if (typeName.contains('Animation')) return ControllerType.animation;
    if (typeName.contains('Text')) return ControllerType.text;
    if (typeName.contains('Scroll')) return ControllerType.scroll;
    if (typeName.contains('Page')) return ControllerType.page;
    if (typeName.contains('Tab')) return ControllerType.tab;
    if (typeName.contains('Video')) return ControllerType.video;
    return ControllerType.custom;
  }
  
  bool _checkIfDisposed(String controllerName, ClassDeclaration node) {
    for (final member in node.members) {
      if (member is MethodDeclaration && member.name.lexeme == 'dispose') {
        final body = member.body;
        if (body is BlockFunctionBody) {
          final disposePattern = '$controllerName.dispose()';
          return body.toString().contains(disposePattern);
        }
      }
    }
    return false;
  }
  
  List<MixinIR> _extractMixins(ClassDeclaration node) {
    final mixins = <MixinIR>[];
    final mixinClause = node.withClause;
    
    if (mixinClause != null) {
      for (final mixinType in mixinClause.mixinTypes2) {
        final name = mixinType.name2.toString();
        mixins.add(MixinIR(
          name: name,
          type: _getMixinType(name),
          providedMembers: _inferMixinMembers(name),
        ));
      }
    }
    
    return mixins;
  }
  
  MixinType _getMixinType(String name) {
    if (name.contains('TickerProvider')) {
      return name == 'SingleTickerProviderStateMixin'
          ? MixinType.singleTickerProvider
          : MixinType.tickerProvider;
    }
    if (name.contains('WidgetsBinding')) return MixinType.widgetsBinding;
    if (name.contains('AutomaticKeepAlive')) return MixinType.automaticKeepAlive;
    return MixinType.custom;
  }
  
  List<String> _inferMixinMembers(String mixinName) {
    switch (mixinName) {
      case 'SingleTickerProviderStateMixin':
      case 'TickerProviderStateMixin':
        return ['createTicker', 'dispose'];
      case 'AutomaticKeepAliveClientMixin':
        return ['wantKeepAlive', 'updateKeepAlive'];
      default:
        return [];
    }
  }
  
  List<NotifyListenerCallIR> _findNotifyListenerCalls(ClassDeclaration node) {
    final calls = <NotifyListenerCallIR>[];
    
    for (final member in node.members) {
      if (member is MethodDeclaration) {
        final methodName = member.name.lexeme;
        final body = member.body;
        
        if (body is BlockFunctionBody) {
          for (final statement in body.block.statements) {
            if (statement is ExpressionStatement) {
              final expr = statement.expression;
              if (expr is MethodInvocation && 
                  expr.methodName.name == 'notifyListeners') {
                calls.add(NotifyListenerCallIR(
                  methodName: methodName,
                  modifiedFields: _findModifiedFieldsInMethod(member),
                  sourceLocation: _extractSourceLocation(expr),
                ));
              }
            }
          }
        }
      }
    }
    
    return calls;
  }
  
  List<String> _findModifiedFieldsInMethod(MethodDeclaration method) {
    final modifiedFields = <String>[];
    
    // Simple heuristic: look for assignments to fields
    final body = method.body;
    if (body is BlockFunctionBody) {
      for (final statement in body.block.statements) {
        if (statement is ExpressionStatement) {
          final expr = statement.expression;
          if (expr is AssignmentExpression) {
            final target = expr.leftHandSide;
            if (target is SimpleIdentifier) {
              modifiedFields.add(target.name);
            } else if (target is PropertyAccess) {
              modifiedFields.add(target.propertyName.name);
            }
          }
        }
      }
    }
    
    return modifiedFields;
  }

  // ==========================================================================
  // SPECIALIZED EXTRACTION METHODS
  // ==========================================================================
  
  void _extractSetStateCall(MethodInvocation node) {
    final callback = node.argumentList.arguments.firstOrNull;
    
    if (callback != null) {
      final setStateCall = SetStateCallIR(
        id: builder.generateId('setState'),
        callback: _extractExpression(callback),
        modifiedVariables: _findModifiedVariablesInCallback(callback),
        affectedProperties: [], // Will be filled during analysis
        isAsync: callback.toString().contains('async'),
        sourceLocation: _extractSourceLocation(node),
      );
      
      builder.addSetStateCall(setStateCall);
    }
  }
  
  List<String> _findModifiedVariablesInCallback(Expression callback) {
    final modified = <String>[];
    
    // Simple heuristic: find assignments in callback
    if (callback is FunctionExpression) {
      final body = callback.body;
      if (body is BlockFunctionBody) {
        for (final statement in body.block.statements) {
          if (statement is ExpressionStatement) {
            final expr = statement.expression;
            if (expr is AssignmentExpression) {
              final target = expr.leftHandSide;
              if (target is SimpleIdentifier) {
                modified.add(target.name);
              }
            }
          }
        }
      }
    }
    
    return modified;
  }
  
  void _extractNavigationCall(MethodInvocation node) {
    final methodName = node.methodName.name;
    
    final navCall = NavigationCallIR(
      id: builder.generateId('nav'),
      type: _getNavigationType(methodName),
      routeName: _extractRouteNameFromArgs(node.argumentList),
      arguments: _extractNavigationArguments(node.argumentList),
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addNavigationCall(navCall);
  }
  
  NavigationType _getNavigationType(String methodName) {
    switch (methodName) {
      case 'push': return NavigationType.push;
      case 'pop': return NavigationType.pop;
      case 'pushNamed': return NavigationType.pushNamed;
      case 'pushReplacement': return NavigationType.pushReplacement;
      case 'pushReplacementNamed': return NavigationType.pushReplacementNamed;
      case 'pushAndRemoveUntil': return NavigationType.pushAndRemoveUntil;
      case 'popUntil': return NavigationType.popUntil;
      case 'canPop': return NavigationType.canPop;
      case 'maybePop': return NavigationType.maybePop;
      default: return NavigationType.push;
    }
  }
  
  String? _extractRouteNameFromArgs(ArgumentList args) {
    for (final arg in args.arguments) {
      if (arg is StringLiteral) {
        return arg.stringValue;
      }
    }
    return null;
  }
  
  Map<String, ExpressionIR> _extractNavigationArguments(ArgumentList args) {
    final result = <String, ExpressionIR>{};
    
    for (final arg in args.arguments) {
      if (arg is NamedExpression) {
        result[arg.name.label.name] = _extractExpression(arg.expression);
      }
    }
    
    return result;
  }
  
  void _extractContextDependency(MethodInvocation node) {
    final target = node.target.toString();
    
    ContextDependencyType type;
    if (target.contains('Theme')) {
      type = ContextDependencyType.theme;
    } else if (target.contains('MediaQuery')) {
      type = ContextDependencyType.mediaQuery;
    } else if (target.contains('Scaffold')) {
      type = ContextDependencyType.scaffold;
    } else if (target.contains('FocusScope')) {
      type = ContextDependencyType.focusScope;
    } else {
      type = ContextDependencyType.inheritedWidget;
    }
    
    final dependency = ContextDependencyIR(
      type: type,
      accessPattern: node.toString(),
      accessedProperties: _extractAccessedProperties(node),
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addContextDependency(dependency);
  }
  
  List<String> _extractAccessedProperties(MethodInvocation node) {
    final properties = <String>[];
    
    // Look for property accesses after the of() call
    var current = node.parent;
    while (current is PropertyAccess || current is MethodInvocation) {
      if (current is PropertyAccess) {
        properties.add(current.propertyName.name);
        current = current.parent;
      } else if (current is MethodInvocation) {
        properties.add(current.methodName.name);
        current = current.parent;
      }
    }
    
    return properties;
  }
  
  void _extractProviderUsage(MethodInvocation node) {
    // Implementation for Provider.of, context.read, context.watch
    final usage = ProviderUsageIR(
      accessType: _getProviderAccessType(node.methodName.name),
      providerName: _extractProviderName(node),
      providerType: _inferProviderType(node),
      accessedProperties: [],
      triggersRebuild: node.methodName.name == 'watch',
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addProviderUsage(usage);
  }
  
  ProviderAccessType _getProviderAccessType(String methodName) {
    switch (methodName) {
      case 'watch': return ProviderAccessType.watch;
      case 'read': return ProviderAccessType.read;
      case 'select': return ProviderAccessType.select;
      default: return ProviderAccessType.read;
    }
  }
  
  String _extractProviderName(MethodInvocation node) {
    // Extract provider type from generics or arguments
    if (node.typeArguments != null && node.typeArguments!.arguments.isNotEmpty) {
      return node.typeArguments!.arguments.first.toString();
    }
    return 'UnknownProvider';
  }
  
  TypeIR _inferProviderType(MethodInvocation node) {
    if (node.typeArguments != null && node.typeArguments!.arguments.isNotEmpty) {
      return _convertType(node.typeArguments!.arguments.first.type);
    }
    return DynamicTypeIR(id: builder.generateId('type'));
  }
  
  void _extractAsyncOperation(MethodInvocation node) {
    final asyncOp = AsyncOperationIR(
      id: builder.generateId('async'),
      type: AsyncType.future,
      expression: _extractExpression(node),
      isInAsyncFunction: _isInAsyncFunction(),
      capturedVariables: _capturedVariables.toList(),
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addAsyncOperation(asyncOp);
  }

  void _extractWidgetInstantiation(InstanceCreationExpression node) {
    final typeName = node.constructorName.type.name2.toString();
    final constructorName = node.constructorName.name?.name ?? '';
    
    final instantiation = WidgetInstantiationIR(
      id: builder.generateId('instance'),
      widgetType: typeName,
      constructorName: constructorName,
      arguments: node.argumentList.arguments
          .where((arg) => arg is! NamedExpression)
          .map((arg) => _extractExpression(arg))
          .toList(),
      namedArguments: Map.fromEntries(
        node.argumentList.arguments
            .whereType<NamedExpression>()
            .map((arg) => MapEntry(
                  arg.name.label.name,
                  _extractExpression(arg.expression),
                )),
      ),
      isConst: node.keyword?.type.toString() == 'const',
      sourceLocation: _extractSourceLocation(node),
      usedInBuildMethod: _isInBuildMethod(),
    );
    
    builder.addWidgetInstantiation(instantiation);
  }
  
  void _extractAnimationController(InstanceCreationExpression node) {
    final args = node.argumentList.arguments;
    
    // Extract vsync and duration
    ExpressionIR? vsync;
    ExpressionIR? duration;
    ExpressionIR? lowerBound;
    ExpressionIR? upperBound;
    
    for (final arg in args) {
      if (arg is NamedExpression) {
        final name = arg.name.label.name;
        final value = _extractExpression(arg.expression);
        
        switch (name) {
          case 'vsync':
            vsync = value;
            break;
          case 'duration':
            duration = value;
            break;
          case 'lowerBound':
            lowerBound = value;
            break;
          case 'upperBound':
            upperBound = value;
            break;
        }
      }
    }
    
    final animController = AnimationControllerIR(
      id: builder.generateId('animController'),
      vsync: vsync,
      duration: duration,
      lowerBound: lowerBound,
      upperBound: upperBound,
      isDisposed: false, // Will be determined in lifecycle analysis
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addAnimationController(animController);
  }
  
  void _extractAsyncBuilder(InstanceCreationExpression node) {
    final typeName = node.constructorName.type.name2.toString();
    final args = node.argumentList.arguments;
    
    ExpressionIR? future;
    ExpressionIR? stream;
    ExpressionIR? builder;
    ExpressionIR? initialData;
    
    for (final arg in args) {
      if (arg is NamedExpression) {
        final name = arg.name.label.name;
        final value = _extractExpression(arg.expression);
        
        switch (name) {
          case 'future':
            future = value;
            break;
          case 'stream':
            stream = value;
            break;
          case 'builder':
            builder = value;
            break;
          case 'initialData':
            initialData = value;
            break;
        }
      }
    }
    
    final asyncBuilder = AsyncBuilderIR(
      id: builder.generateId('asyncBuilder'),
      type: typeName == 'FutureBuilder' 
          ? AsyncBuilderType.futureBuilder 
          : AsyncBuilderType.streamBuilder,
      future: future,
      stream: stream,
      builder: builder,
      initialData: initialData,
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addAsyncBuilder(asyncBuilder);
  }
  
  void _extractController(InstanceCreationExpression node) {
    final typeName = node.constructorName.type.name2.toString();
    
    final controller = ControllerIR(
      name: '', // Will be set from variable declaration context
      type: _getControllerType(typeName),
      initialization: _extractExpression(node),
      isDisposedInDispose: false, // Will be determined later
      usedIn: [],
    );
    
    builder.addController(controller);
  }

  // ==========================================================================
  // LIFECYCLE METHOD EXTRACTION
  // ==========================================================================
  
  void _extractLifecycleMethod(MethodDeclaration node, LifecycleType type) {
    final lifecycle = _extractLifecycleMethodFull(node, type);
    builder.addLifecycleMethod(lifecycle);
  }
  
  LifecycleMethodIR _extractLifecycleMethodFull(
    MethodDeclaration node, 
    LifecycleType type,
  ) {
    final statements = <StatementIR>[];
    
    if (node.body is BlockFunctionBody) {
      final block = (node.body as BlockFunctionBody).block;
      for (final statement in block.statements) {
        statements.add(_extractStatement(statement));
      }
    }
    
    // Extract special lifecycle-specific information
    final initializesControllers = type == LifecycleType.initState 
        ? _findControllerInitializations(statements)
        : [];
    
    final disposesControllers = type == LifecycleType.dispose
        ? _findControllerDisposals(statements)
        : [];
    
    final callsSuper = _checksForSuperCall(node);
    
    return LifecycleMethodIR(
      type: type,
      statements: statements,
      callsSuper: callsSuper,
      initializesControllers: initializesControllers,
      disposesControllers: disposesControllers,
      sourceLocation: _extractSourceLocation(node),
    );
  }
  
  List<String> _findControllerInitializations(List<StatementIR> statements) {
    final controllers = <String>[];
    
    for (final stmt in statements) {
      if (stmt is ExpressionStatementIR) {
        final expr = stmt.expression;
        if (expr is AssignmentExpressionIR) {
          final target = expr.left;
          final value = expr.right;
          
          if (target is IdentifierExpressionIR && 
              value is MethodCallExpressionIR) {
            final typeName = value.methodName;
            if (_isController(typeName)) {
              controllers.add(target.name);
            }
          }
        }
      }
    }
    
    return controllers;
  }
  
  List<String> _findControllerDisposals(List<StatementIR> statements) {
    final disposals = <String>[];
    
    for (final stmt in statements) {
      if (stmt is ExpressionStatementIR) {
        final expr = stmt.expression;
        if (expr is MethodCallExpressionIR && expr.methodName == 'dispose') {
          if (expr.target is IdentifierExpressionIR) {
            disposals.add((expr.target as IdentifierExpressionIR).name);
          }
        }
      }
    }
    
    return disposals;
  }
  
  bool _checksForSuperCall(MethodDeclaration node) {
    if (node.body is BlockFunctionBody) {
      final block = (node.body as BlockFunctionBody).block;
      for (final statement in block.statements) {
        if (statement is ExpressionStatement) {
          final expr = statement.expression;
          if (expr is MethodInvocation && 
              expr.target is SuperExpression &&
              expr.methodName.name == node.name.lexeme) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // ==========================================================================
  // REGULAR CLASS/METHOD EXTRACTION
  // ==========================================================================
  
  void _extractRegularClass(ClassDeclaration node) {
    final classId = builder.generateId('class');
    final className = node.name.lexeme;
    
    final fields = <FieldIR>[];
    final methods = <MethodIR>[];
    ConstructorIR? constructor;
    
    for (final member in node.members) {
      if (member is FieldDeclaration) {
        fields.addAll(_extractFields(member));
      } else if (member is MethodDeclaration) {
        methods.add(_extractMethodIR(member));
      } else if (member is ConstructorDeclaration) {
        constructor = _extractConstructor(member);
      }
    }
    
    final classIR = ClassIR(
      id: classId,
      name: className,
      fields: fields,
      methods: methods,
      constructor: constructor,
      superclass: node.extendsClause?.superclass.name2.toString(),
      interfaces: node.implementsClause?.interfaces2
              .map((i) => i.name2.toString())
              .toList() ??
          [],
      mixins: node.withClause?.mixinTypes2
              .map((m) => m.name2.toString())
              .toList() ??
          [],
      isAbstract: node.abstractKeyword != null,
      annotations: _extractAnnotations(node.metadata),
      sourceLocation: _extractSourceLocation(node),
    );
    
    builder.addClass(classIR);
  }
  
  void _extractRegularMethod(MethodDeclaration node) {
    final methodIR = _extractMethodIR(node);
    builder.addMethod(methodIR);
  }
  
  MethodIR _extractMethodIR(MethodDeclaration node) {
    final statements = <StatementIR>[];
    
    if (node.body is BlockFunctionBody) {
      final block = (node.body as BlockFunctionBody).block;
      for (final statement in block.statements) {
        statements.add(_extractStatement(statement));
      }
    }
    
    ExpressionIR? returnExpression;
    if (node.body is ExpressionFunctionBody) {
      returnExpression = _extractExpression(
        (node.body as ExpressionFunctionBody).expression,
      );
    }
    
    return MethodIR(
      name: node.name.lexeme,
      returnType: _convertType(node.returnType?.type),
      parameters: node.parameters != null 
          ? _extractParameters(node.parameters!) 
          : [],
      body: statements,
      returnExpression: returnExpression,
      isAsync: node.body.isAsynchronous,
      isGenerator: node.body.isGenerator,
      isStatic: node.isStatic,
      isAbstract: node.isAbstract,
      annotations: _extractAnnotations(node.metadata),
      sourceLocation: _extractSourceLocation(node),
    );
  }
  
  EventHandlerIR _extractEventHandler(MethodDeclaration node) {
    final methodIR = _extractMethodIR(node);
    
    return EventHandlerIR(
      name: methodIR.name,
      handlerType: _inferHandlerType(methodIR.name),
      parameters: methodIR.parameters,
      body: methodIR.body,
      isAsync: methodIR.isAsync,
      triggersStateChange: _containsSetStateCall(methodIR.body),
      triggersNavigation: _containsNavigationCall(methodIR.body),
      sourceLocation: methodIR.sourceLocation,
    );
  }
  
  EventHandlerType _inferHandlerType(String name) {
    if (name.contains('Tap') || name.contains('Press')) {
      return EventHandlerType.tap;
    } else if (name.contains('Submit')) {
      return EventHandlerType.submit;
    } else if (name.contains('Change')) {
      return EventHandlerType.change;
    } else if (name.contains('Scroll')) {
      return EventHandlerType.scroll;
    } else if (name.contains('Drag')) {
      return EventHandlerType.drag;
    } else if (name.contains('Focus')) {
      return EventHandlerType.focus;
    }
    return EventHandlerType.custom;
  }
  
  bool _containsSetStateCall(List<StatementIR> statements) {
    for (final stmt in statements) {
      if (stmt is ExpressionStatementIR) {
        if (_isSetStateExpression(stmt.expression)) {
          return true;
        }
      }
    }
    return false;
  }
  
  bool _isSetStateExpression(ExpressionIR expr) {
    if (expr is MethodCallExpressionIR) {
      return expr.methodName == 'setState';
    }
    return false;
  }
  
  bool _containsNavigationCall(List<StatementIR> statements) {
    for (final stmt in statements) {
      if (stmt is ExpressionStatementIR) {
        if (_isNavigationExpression(stmt.expression)) {
          return true;
        }
      }
    }
    return false;
  }
  
  bool _isNavigationExpression(ExpressionIR expr) {
    if (expr is MethodCallExpressionIR) {
      return ['push', 'pop', 'pushNamed', 'pushReplacement'].contains(expr.methodName);
    }
    return false;
  }

  // ==========================================================================
  // FUNCTION EXPRESSION EXTRACTION
  // ==========================================================================
  
  FunctionExpressionIR _extractFunctionExpression(FunctionExpression node) {
    final parameters = node.parameters != null 
        ? _extractParameters(node.parameters!) 
        : <ParameterIR>[];
    
    final statements = <StatementIR>[];
    ExpressionIR? returnExpression;
    
    if (node.body is BlockFunctionBody) {
      final block = (node.body as BlockFunctionBody).block;
      for (final statement in block.statements) {
        statements.add(_extractStatement(statement));
      }
    } else if (node.body is ExpressionFunctionBody) {
      returnExpression = _extractExpression(
        (node.body as ExpressionFunctionBody).expression,
      );
    }
    
    return FunctionExpressionIR(
      id: builder.generateId('function'),
      resultType: _inferFunctionReturnType(node),
      sourceLocation: _extractSourceLocation(node),
      parameters: parameters,
      body: statements,
      returnExpression: returnExpression,
      capturedVariables: _capturedVariables.toList(),
      isAsync: node.body.isAsynchronous,
      isGenerator: node.body.isGenerator,
    );
  }

  // ==========================================================================
  // STATEMENT EXTRACTION IMPLEMENTATIONS
  // ==========================================================================
  
  StatementIR _extractBlockStatement(Block node) {
    final statements = node.statements
        .map((stmt) => _extractStatement(stmt))
        .toList();
    
    return BlockStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      statements: statements,
    );
  }
  
  StatementIR _extractExpressionStatement(ExpressionStatement node) {
    return ExpressionStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      expression: _extractExpression(node.expression),
    );
  }
  
  StatementIR _extractVariableDeclarationStatement(VariableDeclarationStatement node) {
    final variables = _extractLocalVariables(node);
    
    return VariableDeclarationStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      variables: variables,
    );
  }
  
  StatementIR _extractIfStatement(IfStatement node) {
    return IfStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      condition: _extractExpression(node.expression),
      thenStatement: _extractStatement(node.thenStatement),
      elseStatement: node.elseStatement != null
          ? _extractStatement(node.elseStatement!)
          : null,
    );
  }
  
  StatementIR _extractForStatement(ForStatement node) {
    final forLoopParts = node.forLoopParts;
    
    ExpressionIR? initialization;
    ExpressionIR? condition;
    List<ExpressionIR> updaters = [];
    
    if (forLoopParts is ForPartsWithDeclarations) {
      // for (var i = 0; ...)
      if (forLoopParts.variables.variables.isNotEmpty) {
        final firstVar = forLoopParts.variables.variables.first;
        if (firstVar.initializer != null) {
          initialization = _extractExpression(firstVar.initializer!);
        }
      }
      if (forLoopParts.condition != null) {
        condition = _extractExpression(forLoopParts.condition!);
      }
      updaters = forLoopParts.updaters
          .map((e) => _extractExpression(e))
          .toList();
    } else if (forLoopParts is ForPartsWithExpression) {
      if (forLoopParts.initialization != null) {
        initialization = _extractExpression(forLoopParts.initialization!);
      }
      if (forLoopParts.condition != null) {
        condition = _extractExpression(forLoopParts.condition!);
      }
      updaters = forLoopParts.updaters
          .map((e) => _extractExpression(e))
          .toList();
    }
    
    return ForStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      initialization: initialization,
      condition: condition,
      updaters: updaters,
      body: _extractStatement(node.body),
    );
  }
  
  StatementIR _extractForEachStatement(ForEachStatement node) {
    return ForEachStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      loopVariable: node.loopVariable.name.lexeme,
      iterable: _extractExpression(node.iterable),
      body: _extractStatement(node.body),
      isAsync: node.awaitKeyword != null,
    );
  }
  
  StatementIR _extractWhileStatement(WhileStatement node) {
    return WhileStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      condition: _extractExpression(node.condition),
      body: _extractStatement(node.body),
    );
  }
  
  StatementIR _extractDoWhileStatement(DoStatement node) {
    return DoWhileStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      body: _extractStatement(node.body),
      condition: _extractExpression(node.condition),
    );
  }
  
  StatementIR _extractSwitchStatement(SwitchStatement node) {
    final cases = node.members.map((member) {
      if (member is SwitchCase) {
        return SwitchCaseIR(
          expression: _extractExpression(member.expression),
          statements: member.statements
              .map((stmt) => _extractStatement(stmt))
              .toList(),
        );
      } else if (member is SwitchDefault) {
        return SwitchCaseIR(
          expression: null,
          statements: member.statements
              .map((stmt) => _extractStatement(stmt))
              .toList(),
        );
      }
      return SwitchCaseIR(expression: null, statements: []);
    }).toList();
    
    return SwitchStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      expression: _extractExpression(node.expression),
      cases: cases,
    );
  }
  
  StatementIR _extractTryStatement(TryStatement node) {
    final catchClauses = node.catchClauses.map((clause) {
      return CatchClauseIR(
        exceptionType: clause.exceptionType != null
            ? _convertType(clause.exceptionType!.type)
            : null,
        exceptionParameter: clause.exceptionParameter?.name,
        stackTraceParameter: clause.stackTraceParameter?.name,
        body: _extractStatement(clause.body),
      );
    }).toList();
    
    return TryStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      body: _extractStatement(node.body),
      catchClauses: catchClauses,
      finallyBlock: node.finallyBlock != null
          ? _extractStatement(node.finallyBlock!)
          : null,
    );
  }
  
  StatementIR _extractReturnStatement(ReturnStatement node) {
    return ReturnStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      expression: node.expression != null
          ? _extractExpression(node.expression!)
          : _createNullExpression(),
    );
  }
  
  StatementIR _extractBreakStatement(BreakStatement node) {
    return BreakStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      label: node.label?.name,
    );
  }
  
  StatementIR _extractContinueStatement(ContinueStatement node) {
    return ContinueStatementIR(
      id: builder.generateId('stmt'),
      sourceLocation: _extractSourceLocation(node),
      label: node.label?.name,
    );
  }

  // ==========================================================================
  // EXPRESSION EXTRACTION IMPLEMENTATIONS (Continued)
  // ==========================================================================
  
  ExpressionIR _extractIntegerLiteral(IntegerLiteral expr) {
    return LiteralExpressionIR(
      id: builder.generateId('expr'),
      resultType: _createIntType(),
      sourceLocation: _extractSourceLocation(expr),
      value: expr.value,
      literalType: LiteralType.integer,
    );
  }
  
  ExpressionIR _extractDoubleLiteral(DoubleLiteral expr) {
    return LiteralExpressionIR(
      id: builder.generateId('expr'),
      resultType: _createDoubleType(),
      sourceLocation: _extractSourceLocation(expr),
      value: expr.value,
      literalType: LiteralType.double,
    );
  }
  
  ExpressionIR _extractBooleanLiteral(BooleanLiteral expr) {
    return LiteralExpressionIR(
      id: builder.generateId('expr'),
      resultType: _createBoolType(),
      sourceLocation: _extractSourceLocation(expr),
      value: expr.value,
      literalType: LiteralType.boolean,
    );
  }
  
  ExpressionIR _extractNullLiteral(NullLiteral expr) {
    return LiteralExpressionIR(
      id: builder.generateId('expr'),
      resultType: _createNullType(),
      sourceLocation: _extractSourceLocation(expr),
      value: null,
      literalType: LiteralType.nullLiteral,
    );
  }
  
  ExpressionIR _extractIdentifier(SimpleIdentifier expr) {
    return IdentifierExpressionIR(
      id: builder.generateId('expr'),
      resultType: _inferIdentifierType(expr),
      sourceLocation: _extractSourceLocation(expr),
      name: expr.name,
      isTypeReference: _isTypeIdentifier(expr),
    );
  }
  
  ExpressionIR _extractPropertyAccess(PropertyAccess expr) {
    return PropertyAccessExpressionIR(
      id: builder.generateId('expr'),
      resultType: _inferPropertyAccessType(expr),
      sourceLocation: _extractSourceLocation(expr),
      target: _extractExpression(expr.target!),
      propertyName: expr.propertyName.name,
      isNullAware: expr.operator.type.toString() == '?.',
    );
  }
  
  ExpressionIR _extractConditionalExpression(ConditionalExpression expr) {
    return ConditionalExpressionIR(
      id: builder.generateId('expr'),
      resultType: _inferConditionalType(expr),
      sourceLocation: _extractSourceLocation(expr),
      condition: _extractExpression(expr.condition),
      thenExpression: _extractExpression(expr.thenExpression),
      elseExpression: _extractExpression(expr.elseExpression),
    );
  }
  
  ExpressionIR _extractListLiteral(ListLiteral expr) {
    return ListExpressionIR(
      id: builder.generateId('expr'),
      resultType: _inferListType(expr),
      sourceLocation: _extractSourceLocation(expr),
      elements: expr.elements.map((e) {
        if (e is Expression) {
          return _extractExpression(e);
        }
        return _createNullExpression();
      }).toList(),
      isConst: expr.constKeyword != null,
    );
  }
  
  ExpressionIR _extractMapLiteral(SetOrMapLiteral expr) {
    if (expr.isMap) {
      final entries = <MapEntryIR>[];
      for (final element in expr.elements) {
        if (element is MapLiteralEntry) {
          entries.add(MapEntryIR(
            key: _extractExpression(element.key),
            value: _extractExpression(element.value),
          ));
        }
      }
      
      return MapExpressionIR(
        id: builder.generateId('expr'),
        resultType: _inferMapType(expr),
        sourceLocation: _extractSourceLocation(expr),
        entries: entries,
        isConst: expr.constKeyword != null,
      );
    } else {
      return SetExpressionIR(
        id: builder.generateId('expr'),
        resultType: _inferSetType(expr),
        sourceLocation: _extractSourceLocation(expr),
        elements: expr.elements.map((e) {
          if (e is Expression) {
            return _extractExpression(e);
          }
          return _createNullExpression();
        }).toList(),
        isConst: expr.constKeyword != null,
      );
    }
  }
  
  ExpressionIR _extractAwaitExpression(AwaitExpression expr) {
    return AwaitExpressionIR(
      id: builder.generateId('expr'),
      resultType: _inferAwaitType(expr),
      sourceLocation: _extractSourceLocation(expr),
      expression: _extractExpression(expr.expression),
    );
  }
  
  ExpressionIR _extractAsExpression(AsExpression expr) {
    return AsExpressionIR(
      id: builder.generateId('expr'),
      resultType: _convertType(expr.type.type),
      sourceLocation: _extractSourceLocation(expr),
      expression: _extractExpression(expr.expression),
      targetType: _convertType(expr.type.type),
    );
  }
  
  ExpressionIR _extractIsExpression(IsExpression expr) {
    return IsExpressionIR(
      id: builder.generateId('expr'),
      resultType: _createBoolType(),
      sourceLocation: _extractSourceLocation(expr),
      expression: _extractExpression(expr.expression),
      testType: _convertType(expr.type.type),
      isNegated: expr.notOperator != null,
    );
  }
  
  ExpressionIR _extractInstanceCreation(InstanceCreationExpression expr) {
    return InstanceCreationExpressionIR(
      id: builder.generateId('expr'),
      resultType: _convertType(expr.constructorName.type.type),
      sourceLocation: _extractSourceLocation(expr),
      typeName: expr.constructorName.type.name2.toString(),
      constructorName: expr.constructorName.name?.name ?? '',
      arguments: expr.argumentList.arguments
          .where((arg) => arg is! NamedExpression)
          .map((arg) => _extractExpression(arg))
          .toList(),
      namedArguments: Map.fromEntries(
        expr.argumentList.arguments
            .whereType<NamedExpression>()
            .map((arg) => MapEntry(
                  arg.name.label.name,
                  _extractExpression(arg.expression),
                )),
      ),
      isConst: expr.keyword?.type.toString() == 'const',
    );
  }

  // ==========================================================================
  // TYPE INFERENCE AND CONVERSION
  // ==========================================================================
  
  TypeIR _convertType(DartType? type) {
    if (type == null) {
      return DynamicTypeIR(id: builder.generateId('type'));
    }
    
    if (type.isDynamic) {
      return DynamicTypeIR(id: builder.generateId('type'));
    } else if (type.isVoid) {
      return VoidTypeIR(id: builder.generateId('type'));
    } else if (type is InterfaceType) {
      return InterfaceTypeIR(
        id: builder.generateId('type'),
        name: type.element2.name,
        typeArguments: type.typeArguments.map(_convertType).toList(),
        isNullable: type.nullabilitySuffix == NullabilitySuffix.question,
      );
    } else if (type is FunctionType) {
      return FunctionTypeIR(
        id: builder.generateId('type'),
        returnType: _convertType(type.returnType),
        parameters: type.parameters.map((param) {
          return ParameterTypeIR(
            name: param.name,
            type: _convertType(param.type),
            isRequired: param.isRequiredPositional || param.isRequiredNamed,
            isNamed: param.isNamed,
          );
        }).toList(),
        isNullable: type.nullabilitySuffix == NullabilitySuffix.question,
      );
    } else if (type is TypeParameterType) {
      return TypeParameterTypeIR(
        id: builder.generateId('type'),
        name: type.element2.name,
        bound: type.bound != null ? _convertType(type.bound) : null,
        isNullable: type.nullabilitySuffix == NullabilitySuffix.question,
      );
    }
    
    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: type.toString(),
      isNullable: type.nullabilitySuffix == NullabilitySuffix.question,
    );
  }
  
  TypeIR _inferIdentifierType(SimpleIdentifier expr) {
    // Try to get type from local types map
    final name = expr.name;
    if (_localTypes.containsKey(name)) {
      return _convertType(_localTypes[name]);
    }
    
    // Try to get from element
    final element = expr.staticElement;
    if (element != null) {
      return _convertType(element.library!.typeSystem.typeOf(expr));
    }
    
    return DynamicTypeIR(id: builder.generateId('type'));
  }
  
TypeIR _inferBinaryResultType(BinaryExpression expr) {
    final operator = expr.operator.type.toString();
    
    // Comparison operators return bool
    if (['==', '!=', '<', '>', '<=', '>='].contains(operator)) {
      return _createBoolType();
    }
    
    // Logical operators return bool
    if (['&&', '||'].contains(operator)) {
      return _createBoolType();
    }
    
    // Try to infer from operand types
    final leftType = expr.leftOperand.staticType;
    final rightType = expr.rightOperand.staticType;
    
    // String concatenation
    if (operator == '+' && leftType?.isDartCoreString == true) {
      return _createStringType();
    }
    
    // Numeric operations - prefer double if either operand is double
    if (['+', '-', '*', '/', '%', '~/', '^', '&', '|', '<<', '>>'].contains(operator)) {
      if (leftType?.isDartCoreDouble == true || rightType?.isDartCoreDouble == true) {
        return _createDoubleType();
      }
      if (leftType?.isDartCoreInt == true || rightType?.isDartCoreInt == true) {
        return operator == '/' ? _createDoubleType() : _createIntType();
      }
      return _createDoubleType(); // Default to double for numeric operations
    }
    
    // Try to use the static type from the expression itself
    if (expr.staticType != null) {
      return _convertType(expr.staticType);
    }
    
    // Fallback to dynamic
    return DynamicTypeIR(id: builder.generateId('type'));
  }
  
  TypeIR _inferMethodCallType(MethodInvocation expr) {
    // Try to get type from static type
    if (expr.staticType != null) {
      return _convertType(expr.staticType);
    }
    
    // Try to infer from method element
    final element = expr.methodName.staticElement;
    if (element is ExecutableElement && element.returnType != null) {
      return _convertType(element.returnType);
    }
    
    return DynamicTypeIR(id: builder.generateId('type'));
  }
  
  TypeIR _inferPropertyAccessType(PropertyAccess expr) {
    if (expr.staticType != null) {
      return _convertType(expr.staticType);
    }
    
    final element = expr.propertyName.staticElement;
    if (element is PropertyAccessorElement && element.returnType != null) {
      return _convertType(element.returnType);
    }
    
    return DynamicTypeIR(id: builder.generateId('type'));
  }
  
  TypeIR _inferConditionalType(ConditionalExpression expr) {
    // The type is the common type of then and else branches
    if (expr.staticType != null) {
      return _convertType(expr.staticType);
    }
    
    // Try to use then expression type
    if (expr.thenExpression.staticType != null) {
      return _convertType(expr.thenExpression.staticType);
    }
    
    return DynamicTypeIR(id: builder.generateId('type'));
  }
  
  TypeIR _inferListType(ListLiteral expr) {
    if (expr.staticType != null) {
      return _convertType(expr.staticType);
    }
    
    // Try to infer from type arguments
    if (expr.typeArguments != null && expr.typeArguments!.arguments.isNotEmpty) {
      final elementType = _convertType(expr.typeArguments!.arguments.first.type);
      return InterfaceTypeIR(
        id: builder.generateId('type'),
        name: 'List',
        typeArguments: [elementType],
        isNullable: false,
      );
    }
    
    return InterfaceTypeIR(
      id: builder.generateId('type'),
      name: 'List',
      typeArguments: [DynamicTypeIR(id: builder.generateId('type'))],
      isNullable: false,
    );
  }
  
  TypeIR _inferMapType(SetOrMapLiteral expr) {
    if (expr.staticType != null) {
      return _convertType(expr.staticType);
    }
    
    // Try to infer from type arguments
    if (expr.typeArguments != null && expr.typeArguments!.arguments.length >= 2) {
      final keyType = _convertType(expr.typeArguments!.arguments[0].type);
      final valueType = _convertType(expr.typeArguments!.arguments[1].type);
      return InterfaceTypeIR(
        id: builder.generateId('type'),
        name: 'Map',
        typeArguments: [keyType, valueType],
        isNullable: false,
      );
    }
    
    return InterfaceTypeIR(
      id: builder.generateId('type'),
      name: 'Map',
      typeArguments: [
        DynamicTypeIR(id: builder.generateId('type')),
        DynamicTypeIR(id: builder.generateId('type')),
      ],
      isNullable: false,
    );
  }
  
  TypeIR _inferSetType(SetOrMapLiteral expr) {
    if (expr.staticType != null) {
      return _convertType(expr.staticType);
    }
    
    // Try to infer from type arguments
    if (expr.typeArguments != null && expr.typeArguments!.arguments.isNotEmpty) {
      final elementType = _convertType(expr.typeArguments!.arguments.first.type);
      return InterfaceTypeIR(
        id: builder.generateId('type'),
        name: 'Set',
        typeArguments: [elementType],
        isNullable: false,
      );
    }
    
    return InterfaceTypeIR(
      id: builder.generateId('type'),
      name: 'Set',
      typeArguments: [DynamicTypeIR(id: builder.generateId('type'))],
      isNullable: false,
    );
  }
  
  TypeIR _inferAwaitType(AwaitExpression expr) {
    // Await unwraps Future<T> to T
    if (expr.expression.staticType != null) {
      final type = expr.expression.staticType!;
      if (type is InterfaceType && type.element2.name == 'Future') {
        if (type.typeArguments.isNotEmpty) {
          return _convertType(type.typeArguments.first);
        }
      }
    }
    
    return DynamicTypeIR(id: builder.generateId('type'));
  }
  
  TypeIR _inferFunctionReturnType(FunctionExpression expr) {
    if (expr.staticType != null && expr.staticType is FunctionType) {
      final funcType = expr.staticType as FunctionType;
      return _convertType(funcType.returnType);
    }
    
    return DynamicTypeIR(id: builder.generateId('type'));
  }
  
  bool _isTypeIdentifier(SimpleIdentifier expr) {
    final parent = expr.parent;
    return parent is TypeAnnotation || 
           parent is ConstructorName ||
           parent is NamedType;
  }

  // ==========================================================================
  // TYPE CREATION HELPERS
  // ==========================================================================
  
  TypeIR _createStringType() {
    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: 'String',
      isNullable: false,
    );
  }
  
  TypeIR _createIntType() {
    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: 'int',
      isNullable: false,
    );
  }
  
  TypeIR _createDoubleType() {
    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: 'double',
      isNullable: false,
    );
  }
  
  TypeIR _createBoolType() {
    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: 'bool',
      isNullable: false,
    );
  }
  
  TypeIR _createNullType() {
    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: 'Null',
      isNullable: true,
    );
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  BinaryOperator _convertOperator(Object operatorType) {
    final opStr = operatorType.toString();
    
    switch (opStr) {
      case '+': return BinaryOperator.add;
      case '-': return BinaryOperator.subtract;
      case '*': return BinaryOperator.multiply;
      case '/': return BinaryOperator.divide;
      case '%': return BinaryOperator.modulo;
      case '~/': return BinaryOperator.modulo;
      case '==': return BinaryOperator.equals;
      case '!=': return BinaryOperator.notEquals;
      case '<': return BinaryOperator.lessThan;
      case '<=': return BinaryOperator.lessOrEqual;
      case '>': return BinaryOperator.greaterThan;
      case '>=': return BinaryOperator.greaterOrEqual;
      case '&&': return BinaryOperator.logicalAnd;
      case '||': return BinaryOperator.logicalOr;
      case '&': return BinaryOperator.bitwiseAnd;
      case '|': return BinaryOperator.bitwiseOr;
      case '^': return BinaryOperator.bitwiseXor;
      case '<<': return BinaryOperator.leftShift;
      case '>>': return BinaryOperator.rightShift;
      case '??': return BinaryOperator.nullCoalesce;
      default: return BinaryOperator.add;
    }
  }
  
  List<AnnotationIR> _extractAnnotations(List<Annotation> metadata) {
    return metadata.map((annotation) {
      return AnnotationIR(
        name: annotation.name.name,
        arguments: annotation.arguments?.arguments
                .map((arg) => _extractExpression(arg))
                .toList() ??
            [],
      );
    }).toList();
  }
  
  SourceLocationIR _extractSourceLocation(AstNode node) {
    final lineInfo = node.root.lineInfo;
    final location = lineInfo?.getLocation(node.offset);
    
    return SourceLocationIR(
      file: context.filePath,
      line: location?.lineNumber ?? 0,
      column: location?.columnNumber ?? 0,
      offset: node.offset,
      length: node.length,
    );
  }
  
  ExpressionIR _createNullExpression() {
    return LiteralExpressionIR(
      id: builder.generateId('expr'),
      resultType: _createNullType(),
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
  
  WidgetTreeIR _createEmptyWidgetTree() {
    return WidgetTreeIR(
      root: WidgetNodeIR(
        id: builder.generateId('node'),
        widgetType: 'Empty',
        properties: {},
        children: [],
        key: null,
        isConst: false,
      ),
      conditionalBranches: [],
      iterations: [],
      depth: 0,
      nodeCount: 0,
    );
  }
  
  int _calculateDepth(WidgetNodeIR node) {
    if (node.children.isEmpty) return 1;
    return 1 + node.children.map(_calculateDepth).reduce((a, b) => a > b ? a : b);
  }
  
  int _countNodes(WidgetNodeIR node) {
    return 1 + node.children.fold<int>(0, (sum, child) => sum + _countNodes(child));
  }
}

// ==========================================================================
// SUPPORTING CLASSES
// ==========================================================================

class ScopeInfo {
  final ScopeType type;
  final String name;
  final Set<String> declaredVariables;
  
  ScopeInfo({
    required this.type,
    required this.name,
    required this.declaredVariables,
  });
}

enum ScopeType {
  classDecl,
  method,
  function,
  block,
}