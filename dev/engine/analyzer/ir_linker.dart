// lib/src/analyzer/file_declaration_generator.dart

import 'package:analyzer/dart/ast/ast.dart' as ast;
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';

import '../ir/statement/statement_ir.dart';
import 'analying_project.dart';
import 'analyze_flutter_app.dart';
import 'model/class_model.dart';
import 'model/sate.dart';
import 'type_registry.dart';
import 'dependency_graph.dart';

/// Generates FileDeclaration Declaration from Dart AST
///
/// This visitor traverses the AST and extracts:
/// - Widget declarations (StatelessWidget, StatefulWidget)
/// - State classes
/// - Regular classes
/// - Functions
/// - Imports and exports
class FileDeclarationGenerator extends RecursiveAstVisitor<void> {
  final FileAnalysisContext context;

  // Collected declarations
  final List<WidgetDeclaration> _widgets = [];
  final List<StateClassDeclaration> _stateClasses = [];
  final List<ClassDeclaration> _classes = [];
  final List<FunctionDeclaration> _functions = [];
  final List<ImportDeclaration> _imports = [];
  final List<String> _exports = [];

  String? _libraryName;
  String? _currentClassName;
  bool _inStatefulWidget = false;

  FileDeclarationGenerator(this.context);

  /// Build the final FileDeclaration
  FileDeclaration buildFileDeclaration() {
    return FileDeclaration(
      filePath: context.currentFile,
      widgets: _widgets,
      stateClasses: _stateClasses,
      classes: _classes,
      functions: _functions,
      imports: _imports,
      exports: _exports,
      libraryName: _libraryName,
      location: SourceLocation(line: 0, column: 0, offset: 0),
    );
  }

  // ==========================================================================
  // LIBRARY & IMPORTS
  // ==========================================================================

  @override
  void visitLibraryDirective(ast.LibraryDirective node) {
    _libraryName = node.name2?.toString();
    super.visitLibraryDirective(node);
  }

  @override
  void visitImportDirective(ast.ImportDirective node) {
    final uri = node.uri.stringValue ?? '';
    final prefix = node.prefix?.name ?? '';

    _imports.add(
      ImportDeclaration(
        filePath: context.currentFile,
        uri: uri,
        prefix: prefix,
        isDeferred: node.deferredKeyword != null,
        showCombinators: node.combinators
            .whereType<ast.ShowCombinator>()
            .expand((c) => c.shownNames.map((n) => n.name))
            .toList(),
        hideCombinators: node.combinators
            .whereType<ast.HideCombinator>()
            .expand((c) => c.hiddenNames.map((n) => n.name))
            .toList(),
        location: _getLocation(node),
      ),
    );

    super.visitImportDirective(node);
  }

  @override
  void visitExportDirective(ast.ExportDirective node) {
    final uri = node.uri.stringValue ?? '';
    if (uri.isNotEmpty) {
      _exports.add(uri);
    }
    super.visitExportDirective(node);
  }

  // ==========================================================================
  // CLASS DECLARATIONS
  // ==========================================================================

  @override
  void visitClassDeclaration(ast.ClassDeclaration node) {
    final className = node.name.lexeme;
    _currentClassName = className;

    final extendsClause = node.extendsClause?.superclass.name2.toString();
    final isWidget = _isWidgetClass(extendsClause);
    final isStateful = extendsClause == 'StatefulWidget';

    if (isWidget) {
      _processWidgetClass(node, isStateful);
    } else if (_isStateClass(node)) {
      _processStateClass(node);
    } else {
      _processRegularClass(node);
    }

    _inStatefulWidget = isStateful;
    super.visitClassDeclaration(node);
    _inStatefulWidget = false;
    _currentClassName = null;
  }

  bool _isWidgetClass(String? superClass) {
    return superClass == 'StatelessWidget' ||
        superClass == 'StatefulWidget' ||
        superClass == 'InheritedWidget';
  }

  bool _isStateClass(ast.ClassDeclaration node) {
    final extendsClause = node.extendsClause?.superclass.name2.toString();
    return extendsClause?.startsWith('State<') ?? false;
  }

  void _processWidgetClass(ast.ClassDeclaration node, bool isStateful) {
    final className = node.name.lexeme;
    final superClass = node.extendsClause?.superclass.name2.toString();

    final properties = <WidgetPropertyDeclaration>[];
    final methods = <WidgetMethodDeclaration>[];
    BuildMethodDeclaration? buildMethod;

    // Extract fields
    for (final member in node.members) {
      if (member is ast.FieldDeclaration) {
        for (final variable in member.fields.variables) {
          properties.add(
            WidgetPropertyDeclaration(
              name: variable.name.lexeme,
              type: member.fields.type?.toSource() ?? 'dynamic',
              isFinal: member.fields.isFinal,
              isRequired: _hasRequiredAnnotation(member),
              defaultValue: variable.initializer?.toSource(),
              location: _getLocation(variable),
            ),
          );
        }
      } else if (member is ast.MethodDeclaration) {
        if (member.name.lexeme == 'build') {
          buildMethod = _extractBuildMethod(member);
        } else {
          methods.add(_extractMethod(member));
        }
      }
    }

    _widgets.add(
      WidgetDeclaration(
        id: _generateId(className),
        name: className,
        filePath: context.currentFile,
        type: isStateful
            ? WidgetType.statefulWidget
            : WidgetType.statelessWidget,
        superClass: superClass,
        properties: properties,
        methods: methods,
        buildMethod: buildMethod,
        mixins:
            node.withClause?.mixinTypes
                .map((m) => m.name.toString())
                .toList() ??
            [],
        interfaces:
            node.implementsClause?.interfaces
                .map((i) => i.name.toString())
                .toList() ??
            [],
        isStateful: isStateful,
        stateClassName: isStateful ? '${className}State' : null,
        location: _getLocation(node),
        documentation: node.documentationComment?.toSource(),
      ),
    );
  }

  void _processStateClass(ast.ClassDeclaration node) {
    final className = node.name.lexeme;
    final extendsClause = node.extendsClause?.superclass.name.toString();

    // Extract widget name from State<WidgetName>
    final widgetNameMatch = RegExp(
      r'State<(\w+)>',
    ).firstMatch(extendsClause ?? '');
    final widgetName = widgetNameMatch?.group(1) ?? '';

    final stateVariables = <StatePropertyDeclaration>[];
    final methods = <WidgetMethodDeclaration>[];
    InitStateDeclaration? initState;
    DisposeDeclaration? dispose;
    final lifecycleMethods = <LifecycleMethodDeclaration>[];

    // Extract members
    for (final member in node.members) {
      if (member is ast.FieldDeclaration) {
        for (final variable in member.fields.variables) {
          stateVariables.add(
            StatePropertyDeclaration(
              name: variable.name.lexeme,
              type: member.fields.type?.toSource() ?? 'dynamic',
              isMutable: !member.fields.isFinal && !member.fields.isConst,
              initialValue: variable.initializer?.toSource(),
              location: _getLocation(variable),
            ),
          );
        }
      } else if (member is ast.MethodDeclaration) {
        final methodName = member.name.lexeme;

        if (methodName == 'initState') {
          initState = InitStateDeclaration(
            body: _extractStatements(member.body),
            location: _getLocation(member),
          );
        } else if (methodName == 'dispose') {
          dispose = DisposeDeclaration(
            body: _extractStatements(member.body),
            location: _getLocation(member),
          );
        } else if (_isLifecycleMethod(methodName)) {
          lifecycleMethods.add(
            LifecycleMethodDeclaration(
              name: methodName,
              body: _extractStatements(member.body),
              location: _getLocation(member),
            ),
          );
        } else {
          methods.add(_extractMethod(member));
        }
      }
    }

    _stateClasses.add(
      StateClassDeclaration(
        id: _generateId(className),
        name: className,
        widgetName: widgetName,
        filePath: context.currentFile,
        stateVariables: stateVariables,
        methods: methods,
        initState: initState,
        dispose: dispose,
        lifecycleMethods: lifecycleMethods,
        location: _getLocation(node),
      ),
    );
  }

  void _processRegularClass(ast.ClassDeclaration node) {
    final className = node.name.lexeme;
    final superClass = node.extendsClause?.superclass.name2.toString();

    final properties = <StatePropertyDeclaration>[];
    final methods = <WidgetMethodDeclaration>[];

    for (final member in node.members) {
      if (member is ast.FieldDeclaration) {
        for (final variable in member.fields.variables) {
          properties.add(
            StatePropertyDeclaration(
              name: variable.name.lexeme,
              type: member.fields.type?.toSource() ?? 'dynamic',
              isMutable: !member.fields.isFinal,
              initialValue: variable.initializer?.toSource(),
              location: _getLocation(variable),
            ),
          );
        }
      } else if (member is ast.MethodDeclaration) {
        methods.add(_extractMethod(member));
      }
    }

    _classes.add(
      ClassDeclaration(
        id: _generateId(className),
        name: className,
        filePath: context.currentFile,
        superClass: superClass,
        mixins:
            node.withClause?.mixinTypes
                .map((m) => m.name.toString())
                .toList() ??
            [],
        interfaces:
            node.implementsClause?.interfaces
                .map((i) => i.name.toString())
                .toList() ??
            [],
        properties: properties,
        methods: methods,
        location: _getLocation(node),
      ),
    );
  }

  // ==========================================================================
  // FUNCTION DECLARATIONS
  // ==========================================================================

  @override
  void visitFunctionDeclaration(ast.FunctionDeclaration node) {
    // Skip if inside a class (already handled)
    if (_currentClassName != null) {
      super.visitFunctionDeclaration(node);
      return;
    }

    final functionName = node.name.lexeme;
    final returnType = node.returnType?.toSource() ?? 'dynamic';

    final parameters =
        node.functionExpression.parameters?.parameters
            .map((p) => _extractParameter(p))
            .toList() ??
        [];

    _functions.add(
      FunctionDeclaration(
        id: _generateId(functionName),
        name: functionName,
        filePath: context.currentFile,
        returnType: returnType,
        parameters: parameters,
        body: _extractStatements(node.functionExpression.body),
        isAsync: node.functionExpression.body.isAsynchronous,
        isGenerator: node.functionExpression.body.isGenerator,
        type: FunctionType.topLevel,
        location: _getLocation(node),
        documentation: node.documentationComment?.toSource(),
      ),
    );

    super.visitFunctionDeclaration(node);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  BuildMethodDeclaration _extractBuildMethod(ast.MethodDeclaration node) {
    final statements = _extractStatements(node.body);

    // Try to extract the return widget expression
    ExpressionDeclaration? returnWidget;
    if (node.body is ast.BlockFunctionBody) {
      final block = node.body as ast.BlockFunctionBody;
      final returnStatement = block.block.statements
          .whereType<ast.ReturnStatement>()
          .firstOrNull;

      if (returnStatement?.expression != null) {
        returnWidget = _convertExpression(returnStatement!.expression!);
      }
    }

    return BuildMethodDeclaration(
      body: statements,
      returnWidget:
          returnWidget ??
          LiteralExpressionDeclaration(
            value: null,
            literalType: LiteralType.nullLiteral,
            location: _getLocation(node),
          ),
      location: _getLocation(node),
    );
  }

  WidgetMethodDeclaration _extractMethod(ast.MethodDeclaration node) {
    final methodName = node.name.lexeme;
    final returnType = node.returnType?.toSource() ?? 'dynamic';

    final parameters =
        node.parameters?.parameters.map((p) => _extractParameter(p)).toList() ??
        [];

    return WidgetMethodDeclaration(
      name: methodName,
      returnType: returnType,
      parameters: parameters,
      body: _extractStatements(node.body),
      location: _getLocation(node),
    );
  }

  ParameterDeclaration _extractParameter(ast.FormalParameter param) {
    String name = '';
    String type = 'dynamic';
    bool isRequired = false;
    bool isNamed = false;
    String? defaultValue;

    if (param is ast.DefaultFormalParameter) {
      final innerParam = param.parameter;
      isRequired = param.isRequired;
      defaultValue = param.defaultValue?.toSource();

      if (innerParam is ast.SimpleFormalParameter) {
        name = innerParam.name?.lexeme ?? '';
        type = innerParam.type?.toSource() ?? 'dynamic';
      } else if (innerParam is ast.FieldFormalParameter) {
        name = innerParam.name.lexeme;
        type = innerParam.type?.toSource() ?? 'dynamic';
      }

      isNamed = param.isNamed;
    } else if (param is ast.SimpleFormalParameter) {
      name = param.name?.lexeme ?? '';
      type = param.type?.toSource() ?? 'dynamic';
    } else if (param is ast.FieldFormalParameter) {
      name = param.name.lexeme;
      type = param.type?.toSource() ?? 'dynamic';
    }

    return ParameterDeclaration(
      name: name,
      type: type,
      isRequired: isRequired,
      isNamed: isNamed,
      defaultValue: defaultValue,
      location: _getLocation(param),
    );
  }

  List<StatementDeclaration> _extractStatements(ast.FunctionBody body) {
    if (body is ast.BlockFunctionBody) {
      return body.block.statements
          .map((stmt) => _convertStatement(stmt))
          .toList();
    } else if (body is ast.ExpressionFunctionBody) {
      return [
        ReturnStatementDeclaration(
          expression: _convertExpression(body.expression),
          location: _getLocation(body),
        ),
      ];
    }
    return [];
  }

  StatementDeclaration _convertStatement(ast.Statement stmt) {
    if (stmt is ast.VariableDeclarationStatement) {
      final variable = stmt.variables.variables.first;
      return VariableDeclarationDeclaration(
        name: variable.name.lexeme,
        variableType: stmt.variables.type?.toSource() ?? 'dynamic',
        initializer: variable.initializer != null
            ? _convertExpression(variable.initializer!)
            : null,
        isFinal: stmt.variables.isFinal,
        isConst: stmt.variables.isConst,
        isLate: stmt.variables.isLate,
        location: _getLocation(stmt),
      );
    } else if (stmt is ast.ReturnStatement) {
      return ReturnStatementDeclaration(
        expression: stmt.expression != null
            ? _convertExpression(stmt.expression!)
            : null,
        location: _getLocation(stmt),
      );
    } else if (stmt is ast.ExpressionStatement) {
      return ExpressionStatementDeclaration(
        expression: _convertExpression(stmt.expression),
        location: _getLocation(stmt),
      );
    } else if (stmt is ast.IfStatement) {
      return IfStatementDeclaration(
        condition: _convertExpression(stmt.expression),
        thenStatement: _convertStatement(stmt.thenStatement),
        elseStatement: stmt.elseStatement != null
            ? _convertStatement(stmt.elseStatement!)
            : null,
        location: _getLocation(stmt),
      );
    } else if (stmt is ast.Block) {
      return BlockStatementDeclaration(
        statements: stmt.statements.map((s) => _convertStatement(s)).toList(),
        location: _getLocation(stmt),
      );
    }

    // Fallback for unsupported statement types
    return ExpressionStatementDeclaration(
      expression: LiteralExpressionDeclaration(
        value: null,
        literalType: LiteralType.nullLiteral,
        location: _getLocation(stmt),
      ),
      location: _getLocation(stmt),
    );
  }

  ExpressionDeclaration _convertExpression(ast.Expression expr) {
    if (expr is ast.StringLiteral) {
      return LiteralExpressionDeclaration(
        value: expr.stringValue,
        literalType: LiteralType.string,
        location: _getLocation(expr),
      );
    } else if (expr is ast.IntegerLiteral) {
      return LiteralExpressionDeclaration(
        value: expr.value,
        literalType: LiteralType.integer,
        location: _getLocation(expr),
      );
    } else if (expr is ast.DoubleLiteral) {
      return LiteralExpressionDeclaration(
        value: expr.value,
        literalType: LiteralType.double,
        location: _getLocation(expr),
      );
    } else if (expr is ast.BooleanLiteral) {
      return LiteralExpressionDeclaration(
        value: expr.value,
        literalType: LiteralType.boolean,
        location: _getLocation(expr),
      );
    } else if (expr is ast.NullLiteral) {
      return LiteralExpressionDeclaration(
        value: null,
        literalType: LiteralType.nullLiteral,
        location: _getLocation(expr),
      );
    } else if (expr is ast.SimpleIdentifier) {
      return IdentifierExpressionDeclaration(
        name: expr.name,
        location: _getLocation(expr),
      );
    } else if (expr is ast.MethodInvocation) {
      return MethodCallDeclaration(
        target: expr.target != null ? _convertExpression(expr.target!) : null,
        methodName: expr.methodName.name,
        arguments: expr.argumentList.arguments
            .where((arg) => arg is! ast.NamedExpression)
            .map((arg) => _convertExpression(arg))
            .toList(),
        namedArguments: Map.fromEntries(
          expr.argumentList.arguments.whereType<ast.NamedExpression>().map(
            (arg) => MapEntry(
              arg.name.label.name,
              _convertExpression(arg.expression),
            ),
          ),
        ),
        location: _getLocation(expr),
      );
    } else if (expr is ast.InstanceCreationExpression) {
      return InstanceCreationDeclaration(
        className: expr.constructorName.type.name2.toString(),
        constructorName: expr.constructorName.name?.name,
        arguments: expr.argumentList.arguments
            .where((arg) => arg is! ast.NamedExpression)
            .map((arg) => _convertExpression(arg))
            .toList(),
        namedArguments: Map.fromEntries(
          expr.argumentList.arguments.whereType<ast.NamedExpression>().map(
            (arg) => MapEntry(
              arg.name.label.name,
              _convertExpression(arg.expression),
            ),
          ),
        ),
        isConst: expr.keyword?.lexeme == 'const',
        location: _getLocation(expr),
      );
    } else if (expr is ast.PropertyAccess) {
      return PropertyAccessDeclaration(
        target: _convertExpression(expr.target!),
        propertyName: expr.propertyName.name,
        isNullAware: expr.operator.lexeme == '?.',
        location: _getLocation(expr),
      );
    } else if (expr is ast.BinaryExpression) {
      return BinaryOperationDeclaration(
        left: _convertExpression(expr.leftOperand),
        operator: expr.operator.lexeme,
        right: _convertExpression(expr.rightOperand),
        location: _getLocation(expr),
      );
    } else if (expr is ast.PrefixExpression) {
      return UnaryOperationDeclaration(
        operator: expr.operator.lexeme,
        operand: _convertExpression(expr.operand),
        isPrefix: true,
        location: _getLocation(expr),
      );
    } else if (expr is ast.ListLiteral) {
      return ListLiteralDeclaration(
        elements: expr.elements
            .whereType<ast.Expression>()
            .map((e) => _convertExpression(e))
            .toList(),
        isConst: expr.constKeyword != null,
        location: _getLocation(expr),
      );
    } else if (expr is ast.ThisExpression) {
      return ThisExpressionDeclaration(location: _getLocation(expr));
    }

    // Fallback for unsupported expressions
    return LiteralExpressionDeclaration(
      value: expr.toSource(),
      literalType: LiteralType.string,
      location: _getLocation(expr),
    );
  }

  bool _hasRequiredAnnotation(ast.FieldDeclaration field) {
    return field.metadata.any(
      (annotation) =>
          annotation.name.name == 'required' ||
          annotation.name.name == 'Required',
    );
  }

  bool _isLifecycleMethod(String methodName) {
    return const [
      'didChangeDependencies',
      'didUpdateWidget',
      'deactivate',
      'reassemble',
    ].contains(methodName);
  }

  SourceLocation _getLocation(ast.AstNode node) {
    final offset = node.offset;
    final length = node.length;
    final compilationUnit = node.thisOrAncestorOfType<ast.CompilationUnit>();
    final lineInfo = compilationUnit?.lineInfo;
    final location = lineInfo?.getLocation(offset);

    return SourceLocation(
      line: location?.lineNumber ?? 0,
      column: location?.columnNumber ?? 0,
      offset: offset,
      length: length,
    );
  }

  String _generateId(String name) {
    return '${context.currentFile}#$name'.hashCode.toRadixString(16);
  }
}

// ==========================================================================
// DECLARATION LINKER
// ==========================================================================

/// Links FileDeclarations into a complete FlutterAppDeclaration
class DeclarationLinker {
  final Map<String, FileDeclaration> fileDeclarations;
  final DependencyGraph dependencyGraph;
  final TypeRegistry typeRegistry;

  DeclarationLinker({
    required this.fileDeclarations,
    required this.dependencyGraph,
    required this.typeRegistry,
  });

  FlutterAppDeclaration link() {
    final allWidgets = <WidgetDeclaration>[];
    final allStateClasses = <StateClassDeclaration>[];
    final allFunctions = <FunctionDeclaration>[];
    final allProviders = <ProviderDeclaration>[];
    final allImports = <ImportDeclaration>[];

    // Collect all declarations from files
    for (final fileDeclaration in fileDeclarations.values) {
      allWidgets.addAll(fileDeclaration.widgets);
      allStateClasses.addAll(fileDeclaration.stateClasses);
      allFunctions.addAll(fileDeclaration.functions);
      allImports.addAll(fileDeclaration.imports);

      // Identify providers (classes extending ChangeNotifier, etc.)
      for (final classDecl in fileDeclaration.classes) {
        if (_isProviderClass(classDecl)) {
          allProviders.add(_convertToProvider(classDecl));
        }
      }
    }

    // Link stateful widgets with their state classes
    _linkWidgetsWithStates(allWidgets, allStateClasses);

    // Build dependency graph model
    final dependencyGraphModel = _buildDependencyGraphModel(
      allWidgets,
      allStateClasses,
      allProviders,
    );

    return FlutterAppDeclaration(
      version: 1,
      widgets: allWidgets,
      stateClasses: allStateClasses,
      functions: allFunctions,
      routes: [], // TODO: Extract routes from navigation code
      animations: [], // TODO: Extract animations
      providers: allProviders,
      imports: allImports,
      themes: [], // TODO: Extract theme data
      dependencyGraph: dependencyGraphModel,
      fileStructure: _buildFileStructure(),
    );
  }

  void _linkWidgetsWithStates(
    List<WidgetDeclaration> widgets,
    List<StateClassDeclaration> stateClasses,
  ) {
    final stateClassMap = <String, StateClassDeclaration>{};
    for (final state in stateClasses) {
      stateClassMap[state.widgetName] = state;
    }

    // Link each stateful widget with its state
    for (final widget in widgets) {
      if (widget.isStateful && widget.stateClassName != null) {
        final stateClass = stateClassMap[widget.name];

        if (stateClass != null) {
          // Store the state class reference in the widget
          // Note: This requires adding a field to WidgetDeclaration:
          // StateClassDeclaration? linkedStateClass;

          // Since we can't modify the widget object directly (it's likely immutable),
          // we can create a mapping or enhance the widget's metadata
          // For now, the validation in _validateWidgets already checks this relationship

          // Alternative: If WidgetDeclaration is mutable, you could do:
          // widget.linkedStateClass = stateClass;

          // Or create a separate mapping:
          // _widgetStateLinks[widget.id] = stateClass;
        }
      }
    }
  }

  bool _isProviderClass(ClassDeclaration classDecl) {
    return classDecl.superClass == 'ChangeNotifier' ||
        classDecl.superClass == 'ValueNotifier' ||
        classDecl.mixins.contains('ChangeNotifier');
  }

  ProviderDeclaration _convertToProvider(ClassDeclaration classDecl) {
    final methods = classDecl.methods
        .map(
          (m) => ProviderMethodDeclaration(
            name: m.name,
            returnType: m.returnType,
            parameters: m.parameters,
            notifiesListeners: _methodNotifiesListeners(m),
          ),
        )
        .toList();

    return ProviderDeclaration(
      id: classDecl.id,
      name: classDecl.name,
      filePath: classDecl.filePath,
      type: _determineProviderType(classDecl),
      valueType: classDecl.name,
      methods: methods,
      state: classDecl.properties,
      location: classDecl.location,
    );
  }

  bool _methodNotifiesListeners(WidgetMethodDeclaration method) {
    // Check if method body contains notifyListeners() call
    return method.body.any(
      (stmt) =>
          stmt is ExpressionStatementDeclaration &&
          stmt.expression is MethodCallDeclaration &&
          (stmt.expression as MethodCallDeclaration).methodName ==
              'notifyListeners',
    );
  }

  ProviderType _determineProviderType(ClassDeclaration classDecl) {
    if (classDecl.superClass == 'ChangeNotifier') {
      return ProviderType.changeNotifier;
    } else if (classDecl.superClass == 'ValueNotifier') {
      return ProviderType.valueNotifier;
    }
    return ProviderType.changeNotifier;
  }

  DependencyGraphModel _buildDependencyGraphModel(
    List<WidgetDeclaration> widgets,
    List<StateClassDeclaration> stateClasses,
    List<ProviderDeclaration> providers,
  ) {
    final nodes = <DependencyNode>[];
    final edges = <DependencyEdge>[];
    final nodeMap = <String, DependencyNode>{};

    // Add widget nodes
    for (final widget in widgets) {
      final node = DependencyNode(
        id: widget.id,
        type: DependencyType.widget,
        name: widget.name,
      );
      nodes.add(node);
      nodeMap[widget.id] = node;
    }

    // Add state nodes
    for (final state in stateClasses) {
      final node = DependencyNode(
        id: state.id,
        type: DependencyType.state,
        name: state.name,
      );
      nodes.add(node);
      nodeMap[state.id] = node;
    }

    // Add provider nodes
    for (final provider in providers) {
      final node = DependencyNode(
        id: provider.id,
        type: DependencyType.provider,
        name: provider.name,
      );
      nodes.add(node);
      nodeMap[provider.id] = node;
    }

    // Build edges: Link stateful widgets to their state classes
    for (final widget in widgets) {
      if (widget.isStateful && widget.stateClassName != null) {
        final stateClass = stateClasses.firstWhere(
          (state) => state.widgetName == widget.name,
          orElse: () =>
              stateClasses.first, // fallback (should validate earlier)
        );

        if (stateClass != null) {
          edges.add(
            DependencyEdge(
              fromId: widget.id,
              toId: stateClass.id,
              type: EdgeType.hasState,
              label: 'creates',
            ),
          );
        }
      }
    }

    // Build edges: Widget composition (parent-child relationships)
    for (final widget in widgets) {
      if (widget.buildMethod != null) {
        final childWidgets = _extractChildWidgetReferences(widget.buildMethod!);

        for (final childName in childWidgets) {
          String widgetPath = '';
          final childWidget = widgets.firstWhere(
            (w) => w.name == childName,
            orElse: () {
              widgetPath = widgets.isEmpty
                  ? '<unknown>'
                  : widgets.first.filePath;
              return WidgetDeclaration.empty(widgetPath);
            },
          );

          if (childWidget != WidgetDeclaration.empty(widgetPath)) {
            edges.add(
              DependencyEdge(
                fromId: widget.id,
                toId: childWidget.id,
                type: EdgeType.uses,
                label: 'renders',
              ),
            );
          }
        }
      }
    }

    // Build edges: Provider dependencies (widgets that use providers)
    for (final widget in widgets) {
      final usedProviders = _extractProviderReferences(widget);

      for (final providerName in usedProviders) {
        String providerPath = '';
        final provider = providers.firstWhere(
          (p) => p.name == providerName,
          orElse: () {
            providerPath = providers.isEmpty
                ? '<unknown>'
                : providers.first.filePath;
            return ProviderDeclaration.empty(providerPath);
          },
        );

        if (provider != ProviderDeclaration.empty(providerPath)) {
          edges.add(
            DependencyEdge(
              fromId: widget.id,
              toId: provider.id,
              type: EdgeType.dependsOn,
              label: 'consumes',
            ),
          );
        }
      }
    }

    // Build edges: State class dependencies on providers
    for (final state in stateClasses) {
      final usedProviders = _extractProviderReferencesFromState(state);

      for (final providerName in usedProviders) {
        String providerPath = '';
        final provider = providers.firstWhere(
          (p) => p.name == providerName,
          orElse: () {
            providerPath = providers.isEmpty
                ? '<unknown>'
                : providers.first.filePath;
            return ProviderDeclaration.empty(providerPath);
          },
        );

        if (provider != ProviderDeclaration.empty(providerPath)) {
          edges.add(
            DependencyEdge(
              fromId: state.id,
              toId: provider.id,
              type: EdgeType.dependsOn,
              label: 'observes',
            ),
          );
        }
      }
    }

    return DependencyGraphModel(nodes: nodes, edges: edges);
  }

  Set<String> _extractProviderReferencesFromState(StateClassDeclaration state) {
    final providers = <String>{};

    void scanStatements(List<StatementDeclaration> statements) {
      for (final stmt in statements) {
        if (stmt is VariableDeclarationDeclaration &&
            stmt.initializer != null) {
          if (stmt.initializer is MethodCallDeclaration) {
            final call = stmt.initializer as MethodCallDeclaration;
            if (call.methodName == 'of' ||
                call.methodName == 'read' ||
                call.methodName == 'watch') {
              // Provider detected
            }
          }
        } else if (stmt is BlockStatementDeclaration) {
          scanStatements(stmt.statements);
        }
      }
    }

    if (state.initState != null) {
      scanStatements(state.initState!.body);
    }

    for (final method in state.methods) {
      scanStatements(method.body);
    }

    return providers;
  }

  Set<String> _extractProviderReferences(WidgetDeclaration widget) {
    final providers = <String>{};

    void scanForProviders(List<StatementDeclaration> statements) {
      for (final stmt in statements) {
        if (stmt is VariableDeclarationDeclaration &&
            stmt.initializer != null) {
          if (stmt.initializer is MethodCallDeclaration) {
            final call = stmt.initializer as MethodCallDeclaration;
            // Look for Provider.of<Type>(context) or context.read<Type>()
            if (call.methodName == 'of' &&
                call.target is IdentifierExpressionDeclaration) {
              final target = call.target as IdentifierExpressionDeclaration;
              if (target.name.contains('Provider')) {
                // Extract type from generic if possible
                // This is simplified - real implementation would parse generics
              }
            } else if (call.methodName == 'read' ||
                call.methodName == 'watch') {
              // context.read<ProviderType>()
              // Extract provider type
            }
          }
        } else if (stmt is BlockStatementDeclaration) {
          scanForProviders(stmt.statements);
        }
      }
    }

    if (widget.buildMethod != null) {
      scanForProviders(widget.buildMethod!.body);
    }

    for (final method in widget.methods) {
      scanForProviders(method.body);
    }

    return providers;
  }

  Set<String> _extractChildWidgetReferences(
    BuildMethodDeclaration buildMethod,
  ) {
    final childWidgets = <String>{};

    void scanExpression(ExpressionDeclaration expr) {
      if (expr is InstanceCreationDeclaration) {
        // Check if it's a widget instantiation
        if (!expr.className.startsWith('_') &&
            expr.className != 'Container' &&
            expr.className != 'Scaffold') {
          childWidgets.add(expr.className);
        }

        // Scan arguments recursively
        for (final arg in expr.arguments) {
          scanExpression(arg);
        }
        for (final namedArg in expr.namedArguments.values) {
          scanExpression(namedArg);
        }
      } else if (expr is MethodCallDeclaration) {
        if (expr.target != null) {
          scanExpression(expr.target!);
        }
        for (final arg in expr.arguments) {
          scanExpression(arg);
        }
        for (final namedArg in expr.namedArguments.values) {
          scanExpression(namedArg);
        }
      } else if (expr is ListLiteralDeclaration) {
        for (final element in expr.elements) {
          scanExpression(element);
        }
      }
    }

    for (final stmt in buildMethod.body) {
      if (stmt is ReturnStatementDeclaration && stmt.expression != null) {
        scanExpression(stmt.expression!);
      } else if (stmt is ExpressionStatementDeclaration) {
        scanExpression(stmt.expression);
      }
    }

    return childWidgets;
  }

  Map<String, List<String>> _buildFileStructure() {
    final structure = <String, List<String>>{};

    for (final entry in fileDeclarations.entries) {
      final filePath = entry.key;
      final fileDeclaration = entry.value;

      final declarations = <String>[
        ...fileDeclaration.widgets.map((w) => 'Widget:${w.name}'),
        ...fileDeclaration.stateClasses.map((s) => 'State:${s.name}'),
        ...fileDeclaration.classes.map((c) => 'Class:${c.name}'),
        ...fileDeclaration.functions.map((f) => 'Function:${f.name}'),
      ];

      structure[filePath] = declarations;
    }

    return structure;
  }
}

// ==========================================================================
// DECLARATION VALIDATOR
// ==========================================================================

/// Validates the linked FlutterAppDeclaration for errors and inconsistencies
class DeclarationValidator {
  final FlutterAppDeclaration declaration;
  final TypeRegistry typeRegistry;
  final List<ValidationError> _errors = [];
  final List<ValidationWarning> _warnings = [];

  DeclarationValidator(this.declaration, this.typeRegistry);

  ValidationResult validate() {
    _errors.clear();
    _warnings.clear();

    _validateWidgets();
    _validateStateClasses();
    _validateProviders();
    _validateDependencies();
    _validateImports();

    return ValidationResult(
      isValid: _errors.isEmpty,
      errors: List.unmodifiable(_errors),
      warnings: List.unmodifiable(_warnings),
    );
  }

  // ==========================================================================
  // WIDGET VALIDATION
  // ==========================================================================

  void _validateWidgets() {
    final widgetNames = <String>{};

    for (final widget in declaration.widgets) {
      // Check for duplicate widget names
      if (widgetNames.contains(widget.name)) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.duplicateDeclaration,
            message: 'Duplicate widget declaration: ${widget.name}',
            filePath: widget.filePath,
            location: widget.location,
          ),
        );
      }
      widgetNames.add(widget.name);

      // Validate build method exists
      if (widget.buildMethod == null) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.missingBuildMethod,
            message: 'Widget ${widget.name} is missing build method',
            filePath: widget.filePath,
            location: widget.location,
          ),
        );
      }

      // Validate stateful widget has corresponding state class
      if (widget.isStateful && widget.stateClassName != null) {
        final hasStateClass = declaration.stateClasses.any(
          (state) => state.widgetName == widget.name,
        );

        if (!hasStateClass) {
          _errors.add(
            ValidationError(
              type: ValidationErrorType.missingStateClass,
              message:
                  'Stateful widget ${widget.name} is missing corresponding state class',
              filePath: widget.filePath,
              location: widget.location,
            ),
          );
        }
      }

      // Validate required properties
      for (final property in widget.properties) {
        if (property.isRequired && property.defaultValue != null) {
          _warnings.add(
            ValidationWarning(
              type: ValidationWarningType.redundantDefault,
              message:
                  'Property ${property.name} is marked required but has a default value',
              filePath: widget.filePath,
              location: property.location,
            ),
          );
        }
      }

      // Validate property types exist in type registry
      _validatePropertyTypes(widget);
    }
  }

  void _validatePropertyTypes(WidgetDeclaration widget) {
    for (final property in widget.properties) {
      final cleanType = _cleanTypeName(property.type);

      // Skip validation for built-in Dart and Flutter types
      if (_isBuiltInType(cleanType)) continue;

      // Check if custom type exists in registry
      if (typeRegistry.lookupType(cleanType) == null) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.unknownType,
            message:
                'Property ${property.name} in ${widget.name} has unknown type: ${property.type}',
            filePath: widget.filePath,
            location: property.location,
          ),
        );
      }
    }
  }

  String _cleanTypeName(String type) {
    // Remove nullable markers, generics, and whitespace
    return type.replaceAll('?', '').replaceAll(RegExp(r'<.*>'), '').trim();
  }

  bool _isBuiltInType(String type) {
    const builtInTypes = {
      // Dart core types
      'int', 'double', 'num', 'String', 'bool', 'dynamic', 'void', 'Object',
      'List', 'Map', 'Set', 'Iterable', 'Future', 'Stream', 'Function',

      // Flutter common types
      'Widget', 'BuildContext', 'Key', 'Color', 'TextStyle', 'EdgeInsets',
      'BoxDecoration',
      'Border',
      'BorderRadius',
      'Alignment',
      'MainAxisAlignment',
      'CrossAxisAlignment', 'MainAxisSize', 'Axis', 'TextAlign', 'FontWeight',
      'Curve', 'Duration', 'Size', 'Offset', 'Rect', 'VoidCallback',
      'ValueChanged', 'AsyncCallback', 'AnimationController', 'Animation',
      'TextEditingController', 'ScrollController', 'PageController',
      'FocusNode', 'GlobalKey', 'NavigatorState', 'ScaffoldState',
    };

    return builtInTypes.contains(type);
  }

  // ==========================================================================
  // STATE CLASS VALIDATION
  // ==========================================================================

  void _validateStateClasses() {
    final stateClassNames = <String>{};

    for (final stateClass in declaration.stateClasses) {
      // Check for duplicate state class names
      if (stateClassNames.contains(stateClass.name)) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.duplicateDeclaration,
            message: 'Duplicate state class declaration: ${stateClass.name}',
            filePath: stateClass.filePath,
            location: stateClass.location,
          ),
        );
      }
      stateClassNames.add(stateClass.name);

      // Validate corresponding widget exists
      final hasWidget = declaration.widgets.any(
        (widget) => widget.name == stateClass.widgetName,
      );

      if (!hasWidget && stateClass.widgetName.isNotEmpty) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.orphanedStateClass,
            message:
                'State class ${stateClass.name} references non-existent widget ${stateClass.widgetName}',
            filePath: stateClass.filePath,
            location: stateClass.location,
          ),
        );
      }

      // Validate dispose calls for controllers
      _validateDispose(stateClass);
    }
  }

  void _validateDispose(StateClassDeclaration stateClass) {
    // Find controller properties
    final controllers = stateClass.stateVariables.where(
      (prop) =>
          prop.type.contains('Controller') &&
          !prop.type.startsWith('Animation'),
    );

    if (controllers.isEmpty) return;

    // Check if dispose method exists
    if (stateClass.dispose == null) {
      _warnings.add(
        ValidationWarning(
          type: ValidationWarningType.missingDispose,
          message:
              'State class ${stateClass.name} has controllers but no dispose method',
          filePath: stateClass.filePath,
          location: stateClass.location,
        ),
      );
      return;
    }

    // Check if controllers are disposed
    for (final controller in controllers) {
      final isDisposed = _checkControllerDisposed(
        controller.name,
        stateClass.dispose!.body,
      );

      if (!isDisposed) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.undisposedController,
            message:
                'Controller ${controller.name} in ${stateClass.name} is not disposed',
            filePath: stateClass.filePath,
            location: controller.location,
          ),
        );
      }
    }
  }

  bool _checkControllerDisposed(
    String controllerName,
    List<StatementDeclaration> body,
  ) {
    for (final stmt in body) {
      if (stmt is ExpressionStatementDeclaration) {
        final expr = stmt.expression;
        if (expr is MethodCallDeclaration) {
          if (expr.target is IdentifierExpressionDeclaration) {
            final target = expr.target as IdentifierExpressionDeclaration;
            if (target.name == controllerName && expr.methodName == 'dispose') {
              return true;
            }
          }
        }
      } else if (stmt is BlockStatementDeclaration) {
        if (_checkControllerDisposed(controllerName, stmt.statements)) {
          return true;
        }
      }
    }
    return false;
  }

  // ==========================================================================
  // PROVIDER VALIDATION
  // ==========================================================================

  void _validateProviders() {
    final providerNames = <String>{};

    for (final provider in declaration.providers) {
      // Check for duplicate provider names
      if (providerNames.contains(provider.name)) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.duplicateDeclaration,
            message: 'Duplicate provider declaration: ${provider.name}',
            filePath: provider.filePath,
            location: provider.location,
          ),
        );
      }
      providerNames.add(provider.name);

      // Validate notifyListeners is called after state changes
      for (final method in provider.methods) {
        if (_modifiesState(method) && !method.notifiesListeners) {
          _warnings.add(
            ValidationWarning(
              type: ValidationWarningType.missingNotifyListeners,
              message:
                  'Method ${method.name} in provider ${provider.name} modifies state but does not call notifyListeners()',
              filePath: provider.filePath,
              location: provider.location,
            ),
          );
        }
      }
    }
  }

  bool _modifiesState(ProviderMethodDeclaration method) {
    // Check if method body contains assignments to state variables
    // This is a simplified check
    return method.parameters.isEmpty && method.returnType == 'void';
  }

  // ==========================================================================
  // DEPENDENCY VALIDATION
  // ==========================================================================

  void _validateDependencies() {
    // Check for circular dependencies
    final graph = declaration.dependencyGraph;
    final visited = <String>{};
    final recursionStack = <String>{};

    for (final node in graph.nodes) {
      if (_hasCycle(node.id, graph, visited, recursionStack)) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.circularDependency,
            message: 'Circular dependency detected involving ${node.name}',
            filePath: '',
            location: SourceLocation(line: 0, column: 0, offset: 0, length: 0),
          ),
        );
      }
    }
  }

  bool _hasCycle(
    String nodeId,
    DependencyGraphModel graph,
    Set<String> visited,
    Set<String> recursionStack,
  ) {
    if (recursionStack.contains(nodeId)) {
      return true;
    }

    if (visited.contains(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    final outgoingEdges = graph.edges.where((edge) => edge.fromId == nodeId);
    for (final edge in outgoingEdges) {
      if (_hasCycle(edge.toId, graph, visited, recursionStack)) {
        return true;
      }
    }

    recursionStack.remove(nodeId);
    return false;
  }

  // ==========================================================================
  // IMPORT VALIDATION
  // ==========================================================================

  void _validateImports() {
    final imports = declaration.imports;
    final usedPackages = <String>{};

    for (final import in imports) {
      // Check for duplicate imports
      if (usedPackages.contains(import.uri)) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.duplicateImport,
            message: 'Duplicate import: ${import.uri}',
            filePath: '',
            location: import.location,
          ),
        );
      }
      usedPackages.add(import.uri);

      // Warn about deferred imports (may not be necessary)
      if (import.isDeferred) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.deferredImport,
            message: 'Deferred import detected: ${import.uri}',
            filePath: '',
            location: import.location,
          ),
        );
      }
    }
  }
}
// ==========================================================================
// VALIDATION RESULT TYPES
// ==========================================================================

class ValidationResult {
  final bool isValid;
  final List<ValidationError> errors;
  final List<ValidationWarning> warnings;

  ValidationResult({
    required this.isValid,
    required this.errors,
    required this.warnings,
  });

  bool get hasWarnings => warnings.isNotEmpty;

  @override
  String toString() {
    final buffer = StringBuffer();
    buffer.writeln('Validation Result: ${isValid ? "VALID" : "INVALID"}');

    if (errors.isNotEmpty) {
      buffer.writeln('\nErrors (${errors.length}):');
      for (final error in errors) {
        buffer.writeln('  - $error');
      }
    }

    if (warnings.isNotEmpty) {
      buffer.writeln('\nWarnings (${warnings.length}):');
      for (final warning in warnings) {
        buffer.writeln('  - $warning');
      }
    }

    return buffer.toString();
  }
}

class ValidationError {
  final ValidationErrorType type;
  final String message;
  final String filePath;
  final SourceLocation location;

  ValidationError({
    required this.type,
    required this.message,
    required this.filePath,
    required this.location,
  });

  @override
  String toString() =>
      '[$type] $message at $filePath:${location.line}:${location.column}';
}

class ValidationWarning {
  final ValidationWarningType type;
  final String message;
  final String filePath;
  final SourceLocation location;

  ValidationWarning({
    required this.type,
    required this.message,
    required this.filePath,
    required this.location,
  });

  @override
  String toString() =>
      '[$type] $message at $filePath:${location.line}:${location.column}';
}

enum ValidationErrorType {
  duplicateDeclaration,
  missingBuildMethod,
  missingStateClass,
  circularDependency,
  invalidType,
  missingRequiredParameter,
}

enum ValidationWarningType {
  redundantDefault,
  orphanedStateClass,
  missingDispose,
  undisposedController,
  missingNotifyListeners,
  duplicateImport,
  deferredImport,
  unusedImport,
  unknownType,
}

enum EdgeType { hasState, uses, dependsOn, renders }

class DependencyEdge {
  final String fromId;
  final String toId;
  final EdgeType type;
  final String label;

  DependencyEdge({
    required this.fromId,
    required this.toId,
    required this.type,
    required this.label,
  });
}

class RouteDeclaration {
  final String id;
  final String path;
  final String? widgetName;
  final SourceLocation location;

  RouteDeclaration({
    required this.id,
    required this.path,
    this.widgetName,
    required this.location,
  });
}

enum AnimationType { controller, tween, implicit }

class AnimationDeclaration {
  final String id;
  final String name;
  final String? controllerName;
  final String? duration;
  final String? curve;
  final AnimationType type;
  final String filePath;
  final SourceLocation location;

  AnimationDeclaration({
    required this.id,
    required this.name,
    this.controllerName,
    this.duration,
    this.curve,
    required this.type,
    required this.filePath,
    required this.location,
  });
}

class ThemeDeclaration {
  final String id;
  final String name;
  final String? primaryColor;
  final String? accentColor;
  final String? brightness;
  final String? fontFamily;
  final SourceLocation location;

  ThemeDeclaration({
    required this.id,
    required this.name,
    this.primaryColor,
    this.accentColor,
    this.brightness,
    this.fontFamily,
    required this.location,
  });
}
