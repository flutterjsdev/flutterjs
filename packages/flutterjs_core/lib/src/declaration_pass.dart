// ============================================================================
// declaration_pass.dart - UPDATED WITH WidgetProducerDetector
// ============================================================================

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/ast.dart' as ast;
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:flutterjs_core/src/analyzer_widget_detection_setup.dart';
import 'package:flutterjs_core/src/ast_ir/ir/statement/statement_widget_analyzer.dart';
import 'package:path/path.dart' as path;

import 'statement_extraction_pass.dart';
import 'ast_ir/ir/expression_ir.dart';
import 'ast_ir/ir/type_ir.dart';
import 'ast_ir/diagnostics/source_location.dart';
import 'ast_ir/dart_file_builder.dart';
import 'ast_ir/class_decl.dart';
import 'ast_ir/function_decl.dart';
import 'ast_ir/function_decl.dart' as cd;
import 'ast_ir/import_export_stmt.dart';
import 'ast_ir/parameter_decl.dart';
import 'ast_ir/variable_decl.dart';

// ============================================================================
// DECLARATION PASS: Main class with WidgetProducerDetector integration
// ============================================================================

class DeclarationPass extends RecursiveAstVisitor<void> {
  // =========================================================================
  // CONFIGURATION
  // =========================================================================

  final String filePath;
  final String fileContent;
  final DartFileBuilder builder;

  // ✅ UPDATED: Changed from VerifiedWidgetDetection to WidgetProducerDetector
  late WidgetProducerDetector? widgetDetector;

  // =========================================================================
  // HELPER COMPONENTS
  // =========================================================================

  late final StatementExtractionPass _statementExtractor;

  // =========================================================================
  // STATE TRACKING
  // =========================================================================

  ClassDeclaration? _currentClass;
  String _currentLibraryName = '';
  final List<String> _scopeStack = [];

  // =========================================================================
  // COLLECTIONS FOR EXTRACTION
  // =========================================================================

  final List<ImportStmt> _imports = [];
  final List<ExportStmt> _exports = [];
  final List<PartStmt> _parts = [];
  PartOfStmt? _partOf;
  final Map<String, VariableDecl> _topLevelVariables = {};
  final List<FunctionDecl> _topLevelFunctions = [];
  final List<ClassDecl> _classes = [];

  // =========================================================================
  // CONSTRUCTOR
  // =========================================================================

  DeclarationPass({
    required this.filePath,
    required this.fileContent,
    required this.builder,
    this.widgetDetector, // ✅ UPDATED: Accept WidgetProducerDetector
  }) {
    _statementExtractor = StatementExtractionPass(
      filePath: filePath,
      fileContent: fileContent,
      builder: builder,
    );
  }

  // =========================================================================
  // MAIN EXTRACTION METHOD
  // =========================================================================

  void extractDeclarations(CompilationUnit unit) {
    print('🔋 [DeclarationPass] Starting extraction for: $filePath');

    unit.accept(this);

    builder
      ..withLibrary(_currentLibraryName)
      ..withContentHash(fileContent);

    for (final import in _imports) {
      builder.addImport(import);
    }

    // Add exports
    for (final export in _exports) {
      builder.addExport(export);
    }

    for (final part in _parts) {
      builder.addPart(part);
    }

    if (_partOf != null) {
      builder.withPartOf(_partOf!);
    }

    for (final variable in _topLevelVariables.values) {
      builder.addVariable(variable);
    }

    for (final function in _topLevelFunctions) {
      builder.addFunction(function);
    }

    for (final classDecl in _classes) {
      builder.addClass(classDecl);
    }

    print('✅ [DeclarationPass] Extraction complete for: $filePath');
  }

  // =========================================================================
  // LIBRARY & METADATA DIRECTIVES
  // =========================================================================

  @override
  void visitLibraryDirective(LibraryDirective node) {
    _currentLibraryName =
        node.name?.components.map((n) => n.name).join('.') ?? '';
    print('📦 [LibraryDirective] Library: $_currentLibraryName');
    super.visitLibraryDirective(node);
  }

  @override
  void visitPartDirective(PartDirective node) {
    final partStmt = PartStmt(
      uri: node.uri.stringValue ?? '',
      sourceLocation: _extractSourceLocation(node, node.offset),
    );
    _parts.add(partStmt);
    print('📄 [PartDirective] Part: ${node.uri.stringValue}');
    super.visitPartDirective(node);
  }

  @override
  void visitPartOfDirective(PartOfDirective node) {
    _partOf = PartOfStmt(
      libraryName:
          node.uri?.stringValue ??
          node.libraryName?.components.map((c) => c.name).join('.') ??
          '',
      sourceLocation: _extractSourceLocation(node, node.offset),
    );
    print('📚 [PartOfDirective] Part of: ${_partOf!.libraryName}');
    super.visitPartOfDirective(node);
  }

  // =========================================================================
  // IMPORT/EXPORT STATEMENTS
  // =========================================================================

  @override
  void visitImportDirective(ImportDirective node) {
    final import = ImportStmt(
      uri: node.uri.stringValue ?? '',
      prefix: node.prefix?.name,
      isDeferred: node.deferredKeyword != null,
      showList: _extractShowCombinators(node),
      hideList: _extractHideCombinators(node),
      sourceLocation: _extractSourceLocation(node, node.offset),
      annotations: _extractAnnotations(node.metadata),
    );
    _imports.add(import);
    print(
      '📥 [Import] ${node.uri.stringValue}${node.prefix != null ? ' as ${node.prefix!.name}' : ''}',
    );
    super.visitImportDirective(node);
  }

  @override
  void visitExportDirective(ExportDirective node) {
    final export = ExportStmt(
      uri: node.uri.stringValue ?? '',
      showList: _extractShowCombinators(node),
      hideList: _extractHideCombinators(node),
      sourceLocation: _extractSourceLocation(node, node.offset),
    );
    _exports.add(export);
    print('📤 [Export] ${node.uri.stringValue}');
    super.visitExportDirective(node);
  }

  // =========================================================================
  // TOP-LEVEL VARIABLE DECLARATIONS
  // =========================================================================

  @override
  void visitTopLevelVariableDeclaration(TopLevelVariableDeclaration node) {
    for (final variable in node.variables.variables) {
      final name = variable.name.lexeme;

      final initializer = variable.initializer != null
          ? _statementExtractor.extractExpression(variable.initializer!)
          : null;

      final varDecl = VariableDecl(
        id: builder.generateId('var', name),
        name: name,
        type: _extractTypeFromAnnotation(
          node.variables.type,
          variable.name.offset,
        ),
        initializer: initializer,
        isFinal: node.variables.isFinal,
        isConst: node.variables.isConst,
        isStatic: false,
        isLate: node.variables.isLate,
        visibility: _getVisibility(name),
        isPrivate: name.startsWith('_'),
        sourceLocation: _extractSourceLocation(node, variable.name.offset),
        annotations: _extractAnnotations(node.metadata),
      );
      _topLevelVariables[name] = varDecl;
    }
    super.visitTopLevelVariableDeclaration(node);
  }

  // =========================================================================
  // TOP-LEVEL FUNCTION DECLARATIONS
  // =========================================================================

  @override
  void visitFunctionDeclaration(FunctionDeclaration node) {
    if (_currentClass != null) {
      super.visitFunctionDeclaration(node);
      return;
    }

    final funcName = node.name.lexeme;
    print('🔧 [Function] $funcName()');

    // =========================================================================
    // ✅ STEP 1: Widget detection using WidgetProducerDetector
    // =========================================================================
    bool isWidgetFunc = false;
    TypeIR? widgetKind;

    if (widgetDetector != null) {
      final execElement = node.declaredFragment?.element;

      if (execElement != null) {
        // ✅ REPLACED: VerifiedWidgetDetection.isWidgetFunction()
        //              → widgetDetector.producesWidget()
        isWidgetFunc = widgetDetector!.producesWidget(execElement);

        if (isWidgetFunc) {
          // ✅ NEW: Get widget kind from element type (returns TypeIR)
          widgetKind = _getWidgetKind(execElement);
          print('   ✅ [WIDGET FUNCTION] - Kind: ${widgetKind?.displayName()}');
        }
      }
    }

    // =========================================================================
    // STEP 2: Extract body statements
    // =========================================================================
    final bodyStatements = _statementExtractor.extractBodyStatements(
      node.functionExpression.body,
    );

    print('   📦 Body statements: ${bodyStatements.length}');

    // =========================================================================
    // STEP 3: Analyze for widgets if it's a widget function
    // =========================================================================
    if (isWidgetFunc && bodyStatements.isNotEmpty) {
      print('   📊 [Analyzing widget function for widget usages]');

      final analyzer = StatementWidgetAnalyzer(
        filePath: filePath,
        fileContent: fileContent,
        builder: builder,
      );

      analyzer.analyzeStatementsForWidgets(bodyStatements);
      print('   ✅ [Widgets analyzed and attached to statements]');
    } else if (isWidgetFunc && bodyStatements.isEmpty) {
      print('   ⚠️  Widget function with empty body (abstract/external?)');
    }

    // =========================================================================
    // STEP 4: Create FunctionDecl
    // =========================================================================
    final functionDecl = FunctionDecl(
      id: builder.generateId('func', funcName),
      name: funcName,
      returnType: _extractTypeFromAnnotation(node.returnType, node.name.offset),
      parameters: _extractParameters(node.functionExpression.parameters),
      body: bodyStatements,
      isAsync: node.functionExpression.body.isAsynchronous,
      isGenerator: node.functionExpression.body.isGenerator,
      typeParameters: _extractTypeParameters(
        node.functionExpression.typeParameters,
      ),
      documentation: _extractDocumentation(node),
      annotations: _extractAnnotations(node.metadata),
      sourceLocation: _extractSourceLocation(node, node.name.offset),
    );

    // =========================================================================
    // STEP 5: Mark as widget function
    // =========================================================================
    if (isWidgetFunc) {
      functionDecl.markAsWidgetFunction(isWidgetFun: true);
      if (widgetKind != null) {
        print('   🏷️  Marked as widget function (kind: $widgetKind)');
      }
    }

    _topLevelFunctions.add(functionDecl);
    super.visitFunctionDeclaration(node);
  }

  // =========================================================================
  // CLASS DECLARATIONS
  // =========================================================================

  @override
  void visitClassDeclaration(ClassDeclaration node) {
    _currentClass = node;
    _pushScope('class', node.name.lexeme);

    try {
      final className = node.name.lexeme;
      print('🏛️  [Class] $className');

      final fields = _extractClassFields(node);
      final (:methods, :constructors) = _extractMethodsAndConstructors(node);

      final classDecl = ClassDecl(
        id: builder.generateId('class', className),
        name: className,
        superclass: _extractSuperclass(node),
        interfaces: _extractInterfaces(node),
        mixins: _extractMixins(node),
        typeParameters: _extractTypeParameters(node.typeParameters),
        fields: fields,
        methods: methods,
        constructors: constructors,
        isAbstract: node.abstractKeyword != null,
        isFinal: node.finalKeyword != null,
        isSealed: node.sealedKeyword != null,
        documentation: _extractDocumentation(node),
        annotations: _extractAnnotations(node.metadata),
        sourceLocation: _extractSourceLocation(node, node.name.offset),
      );

      // =========================================================================
      // ✅ Widget detection for class using WidgetProducerDetector
      // =========================================================================
      if (widgetDetector != null) {
        final classElement = node.declaredFragment?.element;
        if (classElement != null) {
          // ✅ REPLACED: VerifiedWidgetDetection.isWidgetClass()
          //              → widgetDetector.producesWidget()
          if (widgetDetector!.producesWidget(classElement)) {
            print('   ✅ [WIDGET CLASS] $className');

            final chain = _getInheritanceChain(classElement);
            String category = 'custom';
            final superclassName = classElement.supertype?.element.name;
            
            if (superclassName == 'StatelessWidget') {
              category = 'stateless';
            } else if (superclassName == 'StatefulWidget') {
              category = 'stateful';
            }

            final hasBuild = classElement.methods.any(
              (m) => m.name == 'build' && !m.isStatic,
            );

            classDecl.markAsWidget(
              category: category,
              chain: chain,
              hasBuild: hasBuild,
            );
          }
        }
      }

      _classes.add(classDecl);
      super.visitClassDeclaration(node);
    } finally {
      _popScope();
      _currentClass = null;
    }
  }

  // =========================================================================
  // CLASS MEMBERS EXTRACTION
  // =========================================================================

  List<FieldDecl> _extractClassFields(ClassDeclaration node) {
    final fields = <FieldDecl>[];

    for (final member in node.members) {
      if (member is FieldDeclaration) {
        for (final variable in member.fields.variables) {
          final fieldName = variable.name.lexeme;

          final initializer = variable.initializer != null
              ? _statementExtractor.extractExpression(variable.initializer!)
              : null;

          final fieldDecl = FieldDecl(
            id: builder.generateId('field', fieldName),
            name: fieldName,
            type: _extractTypeFromAnnotation(
              member.fields.type,
              variable.name.offset,
            ),
            initializer: initializer,
            isFinal: member.fields.isFinal,
            isConst: member.fields.isConst,
            isStatic: member.isStatic,
            isLate: member.fields.isLate,
            visibility: _getVisibility(fieldName),
            sourceLocation: _extractSourceLocation(
              member,
              variable.name.offset,
            ),
            annotations: _extractAnnotations(member.metadata),
            isPrivate: fieldName.startsWith('_'),
          );
          fields.add(fieldDecl);
        }
      }
    }

    return fields;
  }

  ConstructorDecl _extractSingleConstructor(
    ConstructorDeclaration member,
    String className,
  ) {
    final constructorName = member.name?.lexeme ?? '';

    print(
      '   🔨 [Constructor] $className${constructorName.isNotEmpty ? '.$constructorName' : ''}',
    );

    final bodyStatements = _statementExtractor.extractBodyStatements(
      member.body,
    );

    print('      Statements: ${bodyStatements.length}');
    print('      Const: ${member.constKeyword != null}');
    print('      Factory: ${member.factoryKeyword != null}');

    final constructorDecl = ConstructorDecl(
      id: builder.generateId(
        'ctor',
        '$className.${constructorName.isNotEmpty ? constructorName : 'new'}',
      ),
      name: constructorName,
      constructorClass: className,
      constructorName: constructorName.isNotEmpty ? constructorName : null,
      parameters: _extractParameters(member.parameters),
      initializers: _extractConstructorInitializers(
        member.initializers,
        member.offset,
      ),
      isConst: member.constKeyword != null,
      isFactory: member.factoryKeyword != null,
      body: bodyStatements,
      documentation: _extractDocumentation(member),
      annotations: _extractAnnotations(member.metadata),
      sourceLocation: _extractSourceLocation(
        member,
        member.name?.offset ?? member.offset,
      ),
    );

    print(
      '      ✅ Extracted: $className${constructorName.isNotEmpty ? '.$constructorName' : '()'}',
    );

    return constructorDecl;
  }

  ({List<MethodDecl> methods, List<ConstructorDecl> constructors})
  _extractMethodsAndConstructors(ClassDeclaration node) {
    final methods = <MethodDecl>[];
    final constructors = <ConstructorDecl>[];

    final className = node.name.lexeme;

    // ✅ Extract constructors
    for (final member in node.members) {
      if (member is ConstructorDeclaration) {
        final constructor = _extractSingleConstructor(member, className);
        constructors.add(constructor);
      }
    }

    // ✅ Extract methods
    for (final member in node.members) {
      if (member is MethodDeclaration) {
        final methodName = member.name.lexeme;

        // =========================================================================
        // ✅ STEP 1: Widget detection using WidgetProducerDetector
        // =========================================================================
        bool isWidgetFunc = false;
        TypeIR? widgetKind;

        if (widgetDetector != null) {
          final methodElement = member.declaredFragment?.element;

          if (methodElement != null) {
            // ✅ REPLACED: VerifiedWidgetDetection.isWidgetFunction()
            //              → widgetDetector.producesWidget()
            isWidgetFunc = widgetDetector!.producesWidget(methodElement);

            if (isWidgetFunc) {
              // ✅ NEW: Get widget kind from element type (returns TypeIR)
              widgetKind = _getWidgetKind(methodElement);
              print('   ✅ [WIDGET METHOD] $methodName - Kind: ${widgetKind?.displayName()}');
            }
          }
        }

        // =========================================================================
        // STEP 2: Extract method body statements
        // =========================================================================
        final bodyStatements = _statementExtractor.extractBodyStatements(
          member.body,
        );

        print(
          '   🔍 [Method] $methodName() - isWidget: $isWidgetFunc - statements: ${bodyStatements.length}',
        );

        // =========================================================================
        // STEP 3: Analyze for widgets if it's a widget method
        // =========================================================================
        if (isWidgetFunc && bodyStatements.isNotEmpty) {
          print('   📊 [Analyzing $methodName() for widget usages]');

          final analyzer = StatementWidgetAnalyzer(
            filePath: filePath,
            fileContent: fileContent,
            builder: builder,
          );

          analyzer.analyzeStatementsForWidgets(bodyStatements);
          print('   ✅ [Widgets analyzed and attached]');
        } else if (isWidgetFunc && bodyStatements.isEmpty) {
          if (member.isAbstract) {
            print('   ℹ️  Abstract widget method (no body to analyze)');
          } else {
            print('   ⚠️  Widget method with empty body');
          }
        }

        // =========================================================================
        // STEP 4: Create MethodDecl
        // =========================================================================
        final methodDecl = MethodDecl(
          id: builder.generateId('method', '$className.$methodName'),
          name: methodName,
          returnType: _extractTypeFromAnnotation(
            member.returnType,
            member.name.offset,
          ),
          parameters: _extractParameters(member.parameters),
          isAsync: member.body.isAsynchronous,
          isGenerator: member.body.isGenerator,
          isStatic: member.isStatic,
          isAbstract: member.isAbstract,
          isGetter: member.isGetter,
          isSetter: member.isSetter,
          typeParameters: _extractTypeParameters(member.typeParameters),
          body: bodyStatements,
          documentation: _extractDocumentation(member),
          annotations: _extractAnnotations(member.metadata),
          sourceLocation: _extractSourceLocation(member, member.name.offset),
          className: className,
        );

        // =========================================================================
        // STEP 5: Mark as widget method
        // =========================================================================
        if (isWidgetFunc) {
          methodDecl.markAsWidgetFunction(isWidgetFun: true);
          if (widgetKind != null) {
            methodDecl.returnType = widgetKind;
          }
        }

        methods.add(methodDecl);
      }
    }

    return (methods: methods, constructors: constructors);
  }

  // =========================================================================
  // ✅ NEW HELPER: Get widget kind from element (returns TypeIR)
  // =========================================================================

  TypeIR? _getWidgetKind(Element? element) {
    if (element == null) return null;

    if (element is! ExecutableElement) {
      return SimpleTypeIR(
        id: builder.generateId('type'),
        name: 'function',
        sourceLocation: SourceLocationIR(
          id: builder.generateId('loc'),
          file: filePath,
          line: 0,
          column: 0,
          offset: 0,
          length: 0,
        ),
      );
    }

    final returnType = element.returnType;
    String? kindName;

    // Check return type
    if (_typeNameIs(returnType, 'StatelessWidget')) {
      kindName = 'stateless';
    } else if (_typeNameIs(returnType, 'StatefulWidget')) {
      kindName = 'stateful';
    } else if (_typeNameIs(returnType, 'State')) {
      kindName = 'state';
    } else if (_typeNameIs(returnType, 'Widget')) {
      kindName = 'widget';
    }

    // Check for container types
    if (kindName == null && returnType is InterfaceType) {
      if (returnType.element.name == 'List') {
        kindName = 'list_of_widgets';
      } else if (returnType.element.name == 'Future') {
        kindName = 'future_widget';
      }
    }

    // Name-based heuristics
    if (kindName == null) {
      final name = element.name.toString().toLowerCase();
      if (name.contains('build')) {
        kindName = 'builder';
      } else if (name.contains('render')) {
        kindName = 'renderer';
      } else if (name.contains('create')) {
        kindName = 'factory';
      } else {
        kindName = 'custom';
      }
    }

    // Return as SimpleTypeIR
    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: kindName,
      sourceLocation: SourceLocationIR(
        id: builder.generateId('loc'),
        file: filePath,
        line: 0,
        column: 0,
        offset: element.id,
        length: element.name?.length??0,
      ),
    );
  }

  /// ✅ NEW HELPER: Check if type name matches
  bool _typeNameIs(DartType? type, String name) {
    if (type == null) return false;

    if (type is TypeParameterType) {
      return _typeNameIs(type.bound, name);
    }

    if (type is! InterfaceType) return false;

    if (type.element.name == name) return true;

    // Check supertype hierarchy
    try {
      return type.element.allSupertypes.any((t) => t.element.name == name);
    } catch (_) {
      return false;
    }
  }

  // =========================================================================
  // REMAINING HELPER METHODS (unchanged)
  // =========================================================================

  List<String> _extractShowCombinators(NamespaceDirective node) {
    return node.combinators
        .whereType<ShowCombinator>()
        .expand((c) => c.shownNames.map((n) => n.name))
        .toList();
  }

  List<String> _extractHideCombinators(NamespaceDirective node) {
    return node.combinators
        .whereType<HideCombinator>()
        .expand((c) => c.hiddenNames.map((n) => n.name))
        .toList();
  }

  TypeIR _extractTypeFromAnnotation(
    TypeAnnotation? typeAnnotation,
    int offset,
  ) {
    final sourceLoc = SourceLocationIR(
      id: builder.generateId('loc'),
      file: filePath,
      line: 0,
      column: 0,
      offset: offset,
      length: typeAnnotation?.length ?? 0,
    );

    if (typeAnnotation == null) {
      return DynamicTypeIR(
        id: builder.generateId('type'),
        sourceLocation: sourceLoc,
      );
    }

    final typeName = typeAnnotation.toString();
    final isNullable = typeAnnotation.question != null;
    final baseTypeName = typeName.replaceAll('?', '').trim();

    if (_isBuiltInType(baseTypeName)) {
      if (baseTypeName == 'void') {
        return VoidTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
        );
      }
      if (baseTypeName == 'dynamic') {
        return DynamicTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
        );
      }
      if (baseTypeName == 'Never') {
        return NeverTypeIR(
          id: builder.generateId('type'),
          sourceLocation: sourceLoc,
        );
      }
    }

    return SimpleTypeIR(
      id: builder.generateId('type'),
      name: baseTypeName,
      isNullable: isNullable,
      sourceLocation: sourceLoc,
    );
  }

  List<ParameterDecl> _extractParameters(FormalParameterList? paramList) {
    if (paramList == null) return [];

    final parameters = <ParameterDecl>[];

    for (final param in paramList.parameters) {
      String name = '';
      TypeIR? type;
      ExpressionIR? defaultValue;
      bool isRequired = false;
      bool isNamed = false;
      bool isPositional = true;

      if (param is DefaultFormalParameter) {
        final simpleFormalParam = param.parameter;
        name = _getParameterName(simpleFormalParam) ?? '';
        type = _extractTypeFromAnnotation(
          _getParameterType(simpleFormalParam),
          param.offset,
        );
        if (param.defaultValue != null) {
          defaultValue = _statementExtractor.extractExpression(
            param.defaultValue!,
          );
        }
        isRequired = param.isRequired;
        isNamed = param.isNamed;
        isPositional = param.isPositional;
      } else if (param is SimpleFormalParameter) {
        name = param.name?.lexeme ?? '';
        type = _extractTypeFromAnnotation(param.type, param.offset);
      } else if (param is FieldFormalParameter) {
        name = param.name.lexeme;
        type = _extractTypeFromAnnotation(param.type, param.offset);
      } else if (param is FunctionTypedFormalParameter) {
        name = param.name.lexeme;
        type = _extractTypeFromAnnotation(param.returnType, param.offset);
      }

      if (name.isNotEmpty) {
        final paramDecl = ParameterDecl(
          id: builder.generateId('param', name),
          name: name,
          type:
              type ??
              DynamicTypeIR(
                id: builder.generateId('type'),
                sourceLocation: _extractSourceLocation(param, param.offset),
              ),
          defaultValue: defaultValue,
          isRequired: isRequired,
          isNamed: isNamed,
          isPositional: isPositional,
          sourceLocation: _extractSourceLocation(param, param.offset),
          annotations: _extractAnnotations(param.metadata),
        );
        parameters.add(paramDecl);
      }
    }

    return parameters;
  }

  String? _getParameterName(NormalFormalParameter param) {
    if (param is SimpleFormalParameter) {
      return param.name?.lexeme;
    } else if (param is FieldFormalParameter) {
      return param.name.lexeme;
    } else if (param is FunctionTypedFormalParameter) {
      return param.name.lexeme;
    }
    return null;
  }

  TypeAnnotation? _getParameterType(NormalFormalParameter param) {
    if (param is SimpleFormalParameter) {
      return param.type;
    } else if (param is FieldFormalParameter) {
      return param.type;
    } else if (param is FunctionTypedFormalParameter) {
      return param.returnType;
    }
    return null;
  }

  List<TypeParameterDecl> _extractTypeParameters(
    TypeParameterList? typeParams,
  ) {
    if (typeParams == null) return [];

    return typeParams.typeParameters.map((tp) {
      TypeIR? bound;
      if (tp.bound != null) {
        bound = _extractTypeFromAnnotation(tp.bound, tp.offset);
      }

      return TypeParameterDecl(name: tp.name.lexeme, bound: bound);
    }).toList();
  }

  List<cd.ConstructorInitializer> _extractConstructorInitializers(
    NodeList<ast.ConstructorInitializer> initializers,
    int offset,
  ) {
    final result = <cd.ConstructorInitializer>[];

    for (final init in initializers) {
      if (init is ConstructorFieldInitializer) {
        result.add(
          cd.ConstructorInitializer(
            fieldName: init.fieldName.name,
            value: _statementExtractor.extractExpression(init.expression),
            sourceLocation: _extractSourceLocation(init, init.offset),
          ),
        );
      }
    }

    return result;
  }

  TypeIR? _extractSuperclass(ClassDeclaration node) {
    if (node.extendsClause == null) return null;

    final superclass = node.extendsClause!.superclass;
    return _extractTypeFromAnnotation(superclass, superclass.offset);
  }

  List<TypeIR> _extractInterfaces(ClassDeclaration node) {
    if (node.implementsClause == null) return [];

    return node.implementsClause!.interfaces.map((iface) {
      return _extractTypeFromAnnotation(iface, iface.offset);
    }).toList();
  }

  List<TypeIR> _extractMixins(ClassDeclaration node) {
    if (node.withClause == null) return [];

    return node.withClause!.mixinTypes.map((mixin) {
      return _extractTypeFromAnnotation(mixin, mixin.offset);
    }).toList();
  }

  List<AnnotationIR> _extractAnnotations(NodeList<Annotation> metadata) {
    return metadata.map((ann) {
      final args = <ExpressionIR>[];
      final namedArgs = <String, ExpressionIR>{};

      if (ann.arguments != null) {
        for (final arg in ann.arguments!.arguments) {
          if (arg is NamedExpression) {
            namedArgs[arg.name.label.name] =
                _statementExtractor.extractExpression(arg.expression);
          } else {
            args.add(_statementExtractor.extractExpression(arg));
          }
        }
      }

      return AnnotationIR(
        name: ann.name.toString(),
        arguments: args,
        namedArguments: namedArgs,
        sourceLocation: _extractSourceLocation(ann, ann.offset),
      );
    }).toList();
  }

  String? _extractDocumentation(AnnotatedNode node) {
    final docComment = node.documentationComment;
    if (docComment == null) return null;

    return docComment.tokens.map((t) => t.lexeme).join('\n');
  }

  VisibilityModifier _getVisibility(String name) {
    return name.startsWith('_')
        ? VisibilityModifier.private
        : VisibilityModifier.public;
  }

  bool _isBuiltInType(String typeName) {
    final builtIns = {
      'int',
      'double',
      'bool',
      'String',
      'List',
      'Map',
      'Set',
      'dynamic',
      'void',
      'Future',
      'Stream',
      'Widget',
      'State',
      'StatefulWidget',
      'StatelessWidget',
      'BuildContext',
      'Null',
      'Never',
      'num',
      'Object',
    };
    return builtIns.contains(typeName);
  }

  SourceLocationIR _extractSourceLocation(AstNode node, int startOffset) {
    int line = 1;
    int column = 1;

    for (int i = 0; i < startOffset && i < fileContent.length; i++) {
      if (fileContent[i] == '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }

    return SourceLocationIR(
      id: builder.generateId('loc'),
      file: filePath,
      line: line,
      column: column,
      offset: startOffset,
      length: node.length,
    );
  }

  static List<String> _getInheritanceChain(ClassElement classElement) {
    final chain = <String>[];
    var current = classElement.supertype;

    while (current != null) {
      chain.add(current.element.name ?? '');
      current = current.superclass;
    }

    return chain;
  }

  void _pushScope(String type, String name) {
    _scopeStack.add('$type:$name');
  }

  void _popScope() {
    if (_scopeStack.isNotEmpty) {
      _scopeStack.removeLast();
    }
  }
}