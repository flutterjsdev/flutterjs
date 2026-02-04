import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/ast.dart' as ast;
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/analysis/extraction/component_registry.dart';
import 'package:flutterjs_core/src/analysis/visitors/analyzer_widget_detection_setup.dart';
import 'package:flutterjs_core/src/analysis/extraction/statement_widget_analyzer.dart';
import 'package:flutterjs_core/src/analysis/extraction/flutter_component_system.dart'
    show FlutterComponent;
import 'package:flutterjs_core/src/analysis/extraction/symmetric_function_extraction.dart'
    show PureFunctionExtractor;

import '../extraction/component_extractor.dart';
import '../extraction/statement_extraction_pass.dart';

import '../../ir/declarations/function_decl.dart' as cd;

/// <---------------------------------------------------------------------------->
/// declaration_pass.dart
/// ----------------------------------------------------------------------------
///
/// Initial AST traversal and declaration extraction for a Flutter/Dart analyzer (Pass 1).
///
/// Visits the AST to collect top-level declarations (classes, functions, variables,
/// imports/exports/parts) and builds an intermediate representation ([DartFileBuilder]).
/// Integrates widget detection and component extraction for Flutter-specific insights.
///
/// Core class: [DeclarationPass] – a [RecursiveAstVisitor] that populates collections
/// for classes, functions, etc., and extracts components via [ComponentExtractor].
///
/// Key features:
/// • Handles all declaration types with metadata (annotations, docs, visibility)
/// • Widget detection via [WidgetProducerDetector] for classes/functions
/// • Symmetric function extraction for pure/impure classification
/// • Component system for Flutter widgets (constructors, properties, children)
/// • Scope tracking and inheritance chain resolution
/// • Built-in type checks and source location mapping
///
/// Usage:
/// dart /// final pass = DeclarationPass(...); /// compilationUnit.accept(pass); /// final dartFile = pass.buildDartFile(); ///
///
/// Outputs feed into:
/// • Symbol resolution (Pass 2)
/// • Type inference (Pass 3)
/// • Widget tree analysis and validation
/// • Component-based diagnostics (missing props, empty children)
///
/// Includes extensions for convenience (e.g., [ForStatementHelper]) and rich debugging.
/// <---------------------------------------------------------------------------->

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
  late final PureFunctionExtractor pureFunctionExtractor;

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
  // ✓ NEW: COMPONENT SYSTEM FIELDS
  // =========================================================================

  late EnhancedComponentExtractor componentExtractor;
  late EnhancedComponentRegistry componentRegistry;

  /// Store extracted components by function ID
  final Map<String, List<FlutterComponent>> functionComponents = {};

  /// Store extracted components by class ID
  final Map<String, List<FlutterComponent>> classComponents = {};
  // =========================================================================
  // CONSTRUCTOR
  // =========================================================================

  final bool verbose;

  DeclarationPass({
    required this.filePath,
    required this.fileContent,
    required this.builder,
    this.widgetDetector, // ✅ UPDATED: Accept WidgetProducerDetector
    this.verbose = false,
  }) {
    _statementExtractor = StatementExtractionPass(
      filePath: filePath,
      fileContent: fileContent,
      builder: builder,
    );
    // ✓ INITIALIZE COMPONENT SYSTEM
    _initializeComponentSystem();
  }

  void _log(String message) {
    if (verbose) print(message);
  }

  // =========================================================================
  // ✓ NEW: Component System Initialization
  // =========================================================================

  void _initializeComponentSystem() {
    _log('🔧 [ComponentSystem] Initializing for: $filePath');

    // Create registry
    componentRegistry = EnhancedComponentRegistry();

    // Register AST adapter if detector available
    if (widgetDetector != null) {
      registerASTAdapter(
        componentRegistry,
        widgetDetector!,
        filePath,
        fileContent,
      );
      _log('   ✓ AST adapter registered');
    }

    // Create extractor
    componentExtractor = EnhancedComponentExtractor(
      id: builder.generateId('component_extractor'),
      filePath: filePath,
      fileContent: fileContent,
      registry: componentRegistry,
    );

    pureFunctionExtractor = PureFunctionExtractor(
      filePath: filePath,
      fileContent: fileContent,
      builder: builder,
      id: builder.generateId('pure_extractor'),
    );

    _log('   ✓ Component system ready');
  }

  // =========================================================================
  // MAIN EXTRACTION METHOD
  // =========================================================================

  void extractDeclarations(CompilationUnit unit) {
    _log('🔋 [DeclarationPass] Starting extraction for: $filePath');

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

    _log('✅ [DeclarationPass] Extraction complete for: $filePath');
  }

  // =========================================================================
  // LIBRARY & METADATA DIRECTIVES
  // =========================================================================

  @override
  void visitLibraryDirective(LibraryDirective node) {
    _currentLibraryName =
        node.name?.components.map((n) => n.name).join('.') ?? '';
    _log('📦 [LibraryDirective] Library: $_currentLibraryName');
    super.visitLibraryDirective(node);
  }

  @override
  void visitPartDirective(PartDirective node) {
    final partStmt = PartStmt(
      uri: node.uri.stringValue ?? '',
      sourceLocation: _extractSourceLocation(node, node.offset),
    );
    _parts.add(partStmt);
    _log('📄 [PartDirective] Part: ${node.uri.stringValue}');
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
    _log('📚 [PartOfDirective] Part of: ${_partOf!.libraryName}');
    super.visitPartOfDirective(node);
  }

  // =========================================================================
  // IMPORT/EXPORT STATEMENTS
  // =========================================================================

  @override
  void visitImportDirective(ImportDirective node) {
    final uri = node.uri.stringValue ?? '';

    final import = ImportStmt(
      uri: uri,
      prefix: node.prefix?.name,
      isDeferred: node.deferredKeyword != null,
      showList: _extractShowCombinators(node),
      hideList: _extractHideCombinators(node),
      sourceLocation: _extractSourceLocation(node, node.offset),
      annotations: _extractAnnotations(node.metadata),
      configurations: _extractConfigurations(node.configurations),
    );
    _imports.add(import);
    _log(
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
      configurations: _extractConfigurations(node.configurations),
    );
    _exports.add(export);
    _log('📤 [Export] ${node.uri.stringValue}');
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

  // ============================================================================
  // PRODUCTION-GRADE SYMMETRIC FUNCTION VISITOR
  // ============================================================================
  // Handles both widget and pure functions with identical depth and quality
  // ============================================================================

  @override
  void visitFunctionDeclaration(FunctionDeclaration node) {
    // Skip methods (handled in visitClassDeclaration)
    if (_currentClass != null) {
      super.visitFunctionDeclaration(node);
      return;
    }

    final funcName = node.name.lexeme;
    final funcId = builder.generateId('func', funcName);

    _log('🔧 [Function] $funcName()');

    try {
      // =========================================================================
      // PHASE 1: Determine function type (Widget vs Pure)
      // =========================================================================

      bool isWidgetFunc = false;
      TypeIR? widgetKind;

      if (widgetDetector != null) {
        final execElement = node.declaredFragment?.element;

        if (execElement != null) {
          isWidgetFunc = widgetDetector!.producesWidget(execElement);

          if (isWidgetFunc) {
            widgetKind = _getWidgetKind(execElement);
            _log('   ✅ [WIDGET FUNCTION] - Kind: ${widgetKind?.displayName()}');
          }
        }
      }

      // =========================================================================
      // PHASE 2: Extract body statements AND expressions
      // =========================================================================

      final bodyStatements = _statementExtractor.extractBodyStatements(
        node.functionExpression.body,
      );

      _log('   📦 Body statements: ${bodyStatements.length}');

      // =========================================================================
      // PHASE 4: Create FunctionBody with extraction data
      // =========================================================================

      final functionBody = FunctionBodyIR(
        statements: bodyStatements,
        id: builder.generateId('func_body', funcName),
        sourceLocation: _extractSourceLocation(node, node.name.offset),
      );

      // =========================================================================
      // PHASE 5: Create FunctionDecl with FunctionBody
      // =========================================================================

      final functionDecl = FunctionDecl(
        id: funcId,
        name: funcName,
        returnType: _extractTypeFromAnnotation(
          node.returnType,
          node.name.offset,
        ),
        parameters: _extractParameters(node.functionExpression.parameters),
        body: functionBody,
        isAsync: node.functionExpression.body.isAsynchronous,
        isGenerator: node.functionExpression.body.isGenerator,
        typeParameters: _extractTypeParameters(
          node.functionExpression.typeParameters,
        ),
        documentation: _extractDocumentation(node),
        annotations: _extractAnnotations(node.metadata),
        sourceLocation: _extractSourceLocation(node, node.name.offset),
        isGetter: node.isGetter,
        isSetter: node.isSetter,
        isTopLevel: true,
        owningClassName: null,
      );

      // =========================================================================
      // PHASE 8: Widget analysis (if applicable)
      // =========================================================================

      if (isWidgetFunc && bodyStatements.isNotEmpty) {
        _log('   📊 [WidgetAnalyzer] Analyzing widget function...');

        final analyzer = StatementWidgetAnalyzer(
          filePath: filePath,
          fileContent: fileContent,
          builder: builder,
        );

        analyzer.analyzeStatementsForWidgets(bodyStatements);
        _log('   ✅ [Widgets analyzed and attached to statements]');
      }

      // =========================================================================
      // FINAL: Add to top-level functions collection
      // =========================================================================

      _topLevelFunctions.add(functionDecl);
      _log('   ✅ [Added to top-level functions]');
    } catch (e, st) {
      _log('   ❌ Error processing function: $e');
      _log('   Stack: $st');

      // Error recovery with empty FunctionBody
      final fallbackBody = FunctionBodyIR(
        statements: [],

        id: builder.generateId('func_body', funcName),
        sourceLocation: _extractSourceLocation(node, node.name.offset),
      );

      final fallbackDecl = FunctionDecl(
        id: funcId,
        name: funcName,
        returnType: _extractTypeFromAnnotation(
          node.returnType,
          node.name.offset,
        ),
        parameters: _extractParameters(node.functionExpression.parameters),
        body: fallbackBody,
        sourceLocation: _extractSourceLocation(node, node.name.offset),
      );

      fallbackDecl.metadata['extractionError'] = e.toString();
      fallbackDecl.metadata['stackTrace'] = st.toString();

      _topLevelFunctions.add(fallbackDecl);
    }

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
      _log('🏛️  [Class] $className');

      final fields = _extractClassFields(node);
      final (:methods, :constructors) = _extractMethodsAndConstructors(node);
      final classComponents = <FlutterComponent>[];

      // =========================================================================
      // Analyze widget methods and extract components
      // =========================================================================

      for (final method in methods) {
        // Check if this is a widget method
        final isWidgetMethod =
            method.isWidgetFunction == true ||
            method.metadata['isWidgetMethod'] == true;

        if (isWidgetMethod) {
          _log(
            '   📊 [ComponentSystem] Analyzing widget method: ${method.name}',
          );

          // ✅ NEW: Access FunctionBody and its extraction data
          if (method.body != null) {
            final functionBody = method.body!;

            if (functionBody.statements.isNotEmpty) {
              _log('      ℹ️  No extraction data, analyzing statements...');

              for (final stmt in functionBody.statements) {
                if (stmt is ReturnStmt && stmt.expression != null) {
                  try {
                    final component = componentExtractor.extract(
                      stmt.expression,
                      hint: 'method_return',
                    );

                    classComponents.add(component);
                    _log('      ✅ ${component.describe()}');
                  } catch (e) {
                    _log('      ❌ Failed to extract component: $e');
                  }
                }
              }
            } else {
              _log('      ℹ️  Method has no statements to analyze');
            }
          } else {
            _log('      ℹ️  Method body is null (abstract/external)');
          }
        }
      }

      // =========================================================================
      // Store class components
      // =========================================================================

      if (classComponents.isNotEmpty) {
        final classId = builder.generateId('class', className);
        this.classComponents[classId] = classComponents;
        _log('   ✅ Stored ${classComponents.length} components for $className');
      }

      // =========================================================================
      // Create ClassDecl
      // =========================================================================

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
      // Widget detection for class using WidgetProducerDetector
      // =========================================================================

      if (widgetDetector != null) {
        final classElement = node.declaredFragment?.element;
        if (classElement != null) {
          if (widgetDetector!.producesWidget(classElement)) {
            _log('   ✅ [WIDGET CLASS] $className');

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

            // ✅ Attach extracted components to class metadata
            if (classComponents.isNotEmpty) {
              classDecl.metadata['widgetComponents'] = classComponents;
              classDecl.metadata['componentCount'] = classComponents.length;
            }
          }
        }
      }

      _classes.add(classDecl);
      super.visitClassDeclaration(node);
    } catch (e, st) {
      _log('   ❌ Error processing class: $e');
      _log('   Stack: $st');

      // Error recovery - still add class but mark it
      final fallbackClassDecl = ClassDecl(
        id: builder.generateId('class', node.name.lexeme),
        name: node.name.lexeme,
        fields: [],
        methods: [],
        constructors: [],
        sourceLocation: _extractSourceLocation(node, node.name.offset),
      );

      fallbackClassDecl.metadata['extractionError'] = e.toString();
      _classes.add(fallbackClassDecl);
    } finally {
      _popScope();
      _currentClass = null;
    }
  }

  @override
  void visitExtensionTypeDeclaration(ExtensionTypeDeclaration node) {
    _pushScope('extension_type', node.name.lexeme);

    try {
      final typeName = node.name.lexeme;
      _log('🏛️  [ExtensionType] $typeName');

      final fields = <FieldDecl>[];
      // Representation field
      final rep = node.representation;
      final fieldName = rep.fieldName.lexeme;
      final fieldDecl = FieldDecl(
        id: builder.generateId('field', '${typeName}_$fieldName'),
        name: fieldName,
        type: _extractTypeFromAnnotation(rep.fieldType, rep.fieldName.offset),
        isFinal: true,
        isStatic: false,
        sourceLocation: _extractSourceLocation(rep, rep.fieldName.offset),
      );
      fields.add(fieldDecl);

      final methods = <MethodDecl>[];
      final constructors = <ConstructorDecl>[];

      for (final member in node.members) {
        if (member is MethodDeclaration) {
          final method = _extractSingleMethod(member, typeName);
          methods.add(method);
        } else if (member is ConstructorDeclaration) {
          final constructor = _extractSingleConstructor(member, typeName);
          constructors.add(constructor);
        }
      }

      final classDecl = ClassDecl(
        id: builder.generateId('class', typeName),
        name: typeName,
        fields: fields,
        methods: methods,
        constructors: constructors,
        documentation: _extractDocumentation(node),
        annotations: _extractAnnotations(node.metadata),
        sourceLocation: _extractSourceLocation(node, node.name.offset),
      );

      classDecl.metadata['isExtensionType'] = true;

      _classes.add(classDecl);
      super.visitExtensionTypeDeclaration(node);
    } catch (e, st) {
      _log('   ❌ Error processing extension type: $e');
      _log('   Stack: $st');
    } finally {
      _popScope();
    }
  }

  /// Export all extracted components
  Map<String, dynamic> exportComponents() {
    return {
      'functions': functionComponents,
      'classes': classComponents,
      'totalFunctions': functionComponents.length,
      'totalClasses': classComponents.length,
    };
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

    _log(
      '   🔨 [Constructor] $className${constructorName.isNotEmpty ? '.$constructorName' : ''}',
    );

    final bodyStatements = _statementExtractor.extractBodyStatements(
      member.body,
    );

    _log('      Statements: ${bodyStatements.length}');
    _log('      Const: ${member.constKeyword != null}');
    _log('      Factory: ${member.factoryKeyword != null}');

    // Create FunctionBody for constructor
    final constructorBody = FunctionBodyIR(
      id: builder.generateId(
        'ctor_body',
        '$className.${constructorName.isNotEmpty ? constructorName : 'new'}',
      ),
      sourceLocation: _extractSourceLocation(
        member,
        member.name?.offset ?? member.offset,
      ),
      statements: bodyStatements,
    );

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
      body: constructorBody,
      documentation: _extractDocumentation(member),
      annotations: _extractAnnotations(member.metadata),
      sourceLocation: _extractSourceLocation(
        member,
        member.name?.offset ?? member.offset,
      ),
    );

    _log(
      '      ✅ Extracted: $className${constructorName.isNotEmpty ? '.$constructorName' : '()'}',
    );

    return constructorDecl;
  }

  ({List<MethodDecl> methods, List<ConstructorDecl> constructors})
  _extractMethodsAndConstructors(ClassDeclaration node) {
    final methods = <MethodDecl>[];
    final constructors = <ConstructorDecl>[];
    final className = node.name.lexeme;

    // Extract constructors
    for (final member in node.members) {
      if (member is ConstructorDeclaration) {
        final constructor = _extractSingleConstructor(member, className);
        constructors.add(constructor);
      }
    }

    // Extract methods with full symmetric extraction
    for (final member in node.members) {
      if (member is! MethodDeclaration) continue;
      final method = _extractSingleMethod(member, className);
      methods.add(method);
    }

    return (methods: methods, constructors: constructors);
  }

  MethodDecl _extractSingleMethod(MethodDeclaration member, String className) {
    final methodName = member.name.lexeme;
    final methodId = builder.generateId('method', '$className.$methodName');

    _log('🔧 [Method] $methodName() in class $className');
    final extractionStartTime = DateTime.now();

    try {
      // PHASE 1: Determine if this is a widget-producing method
      bool isWidgetFunc = false;
      TypeIR? widgetKind;

      if (widgetDetector != null) {
        final methodElement = member.declaredFragment?.element;
        if (methodElement != null) {
          isWidgetFunc = widgetDetector!.producesWidget(methodElement);
          if (isWidgetFunc) {
            widgetKind = _getWidgetKind(methodElement);
            _log(
              '   ✅ [WIDGET METHOD] $methodName - Kind: ${widgetKind?.displayName()}',
            );
          }
        }
      }

      // PHASE 2: Extract body statements AND expressions
      final bodyStatements = _statementExtractor.extractBodyStatements(
        member.body,
      );

      final bodyExpressions = _statementExtractor.extractBodyExpressions(
        member.body,
      );

      _log('   📦 Body statements: ${bodyStatements.length}');
      _log('   📦 Body expressions: ${bodyExpressions.length}');

      // PHASE 4: Create FunctionBody with extraction data
      final methodBody = FunctionBodyIR(
        id: builder.generateId('ctor_body', '$className.$methodName.body'),
        sourceLocation: _extractSourceLocation(member, member.name.offset),
        statements: bodyStatements,
      );

      // PHASE 5: Create MethodDecl with FunctionBody
      final methodDecl = MethodDecl(
        id: methodId,
        name: methodName,
        returnType: _extractTypeFromAnnotation(
          member.returnType,
          member.name.offset,
        ),
        parameters: _extractParameters(member.parameters),
        body: methodBody,
        isAsync: member.body.isAsynchronous,
        isGenerator: member.body.isGenerator,
        isStatic: member.isStatic,
        isAbstract: member.isAbstract,
        isGetter: member.isGetter,
        isSetter: member.isSetter,
        typeParameters: _extractTypeParameters(member.typeParameters),
        documentation: _extractDocumentation(member),
        annotations: _extractAnnotations(member.metadata),
        sourceLocation: _extractSourceLocation(member, member.name.offset),
        className: className,
      );

      // PHASE 6: Mark as widget and attach metadata
      if (isWidgetFunc) {
        methodDecl.markAsWidgetFunction(isWidgetFun: true);
        if (widgetKind != null) {
          methodDecl.metadata['widgetKind'] = widgetKind;
        }
      }

      final durationMs =
          DateTime.now().difference(extractionStartTime).inMilliseconds;
      _log('   ⏱️  Extraction time: ${durationMs}ms');

      return methodDecl;
    } catch (e, stack) {
      // Error recovery
      final fallbackBody = FunctionBodyIR(
        statements: [],
        id: builder.generateId('ctor_body', '$className.$methodName.body'),
        sourceLocation: _extractSourceLocation(member, member.name.offset),
      );

      final fallbackDecl = MethodDecl(
        id: methodId,
        name: methodName,
        returnType: _extractTypeFromAnnotation(
          member.returnType,
          member.name.offset,
        ),
        parameters: _extractParameters(member.parameters),
        body: fallbackBody,
        isAsync: member.body.isAsynchronous,
        isGenerator: member.body.isGenerator,
        isStatic: member.isStatic,
        isAbstract: member.isAbstract,
        isGetter: member.isGetter,
        isSetter: member.isSetter,
        typeParameters: _extractTypeParameters(member.typeParameters),
        documentation: _extractDocumentation(member),
        annotations: _extractAnnotations(member.metadata),
        sourceLocation: _extractSourceLocation(member, member.name.offset),
        className: className,
      );

      fallbackDecl.metadata['extractionError'] = e.toString();
      return fallbackDecl;
    }
  }

  @override
  void visitEnumDeclaration(EnumDeclaration node) {
    _pushScope('enum', node.name.lexeme);

    try {
      final enumName = node.name.lexeme;
      _log('🏛️  [Enum] $enumName');

      final fields = <FieldDecl>[];

      // Add constants as static fields
      for (final constant in node.constants) {
        final fieldDecl = FieldDecl(
          id: builder.generateId('field', '${enumName}_${constant.name.lexeme}'),
          name: constant.name.lexeme,
          type: SimpleTypeIR(
            id: builder.generateId('type'),
            name: enumName,
            sourceLocation: _extractSourceLocation(constant, constant.name.offset),
          ),
          isStatic: true,
          isFinal: true,
          sourceLocation: _extractSourceLocation(constant, constant.name.offset),
        );
        fields.add(fieldDecl);
      }

      for (final member in node.members) {
        if (member is FieldDeclaration) {
          for (final variable in member.fields.variables) {
            final fieldName = variable.name.lexeme;
            final fieldDecl = FieldDecl(
              id: builder.generateId('field', '${enumName}_$fieldName'),
              name: fieldName,
              type: _extractTypeFromAnnotation(member.fields.type, variable.name.offset),
              isStatic: member.isStatic,
              isFinal: member.fields.isFinal,
              sourceLocation: _extractSourceLocation(
                member,
                variable.name.offset,
              ),
            );
            fields.add(fieldDecl);
          }
        }
      }

      final methods = <MethodDecl>[];
      final constructors = <ConstructorDecl>[];

      for (final member in node.members) {
        if (member is MethodDeclaration) {
          final method = _extractSingleMethod(member, enumName);
          methods.add(method);
        } else if (member is ConstructorDeclaration) {
          final constructor = _extractSingleConstructor(member, enumName);
          constructors.add(constructor);
        }
      }

      final classDecl = ClassDecl(
        id: builder.generateId('class', enumName),
        name: enumName,
        fields: fields,
        methods: methods,
        constructors: constructors,
        documentation: _extractDocumentation(node),
        annotations: _extractAnnotations(node.metadata),
        sourceLocation: _extractSourceLocation(node, node.name.offset),
      );

      classDecl.metadata['isEnum'] = true;

      _classes.add(classDecl);
      super.visitEnumDeclaration(node);
    } catch (e, st) {
      _log('   ❌ Error processing enum: $e');
      _log('   Stack: $st');
    } finally {
      _popScope();
    }
  }

  @override
  void visitMixinDeclaration(MixinDeclaration node) {
    _pushScope('mixin', node.name.lexeme);

    try {
      final mixinName = node.name.lexeme;
      _log('🏛️  [Mixin] $mixinName');

      final fields = _extractMixinFields(node);
      final methods = _extractMixinMethods(node);

      final classDecl = ClassDecl(
        id: builder.generateId('class', mixinName),
        name: mixinName,
        fields: fields,
        methods: methods,
        isMixin: true,
        documentation: _extractDocumentation(node),
        annotations: _extractAnnotations(node.metadata),
        sourceLocation: _extractSourceLocation(node, node.name.offset),
      );

      _classes.add(classDecl);
      super.visitMixinDeclaration(node);
    } catch (e, st) {
      _log('   ❌ Error processing mixin: $e');
      _log('   Stack: $st');
    } finally {
      _popScope();
    }
  }

  List<FieldDecl> _extractMixinFields(MixinDeclaration node) {
    final fields = <FieldDecl>[];
    for (final member in node.members) {
      if (member is FieldDeclaration) {
        for (final variable in member.fields.variables) {
          final fieldName = variable.name.lexeme;
          final fieldDecl = FieldDecl(
            id: builder.generateId('field', '${node.name.lexeme}_$fieldName'),
            name: fieldName,
            type: _extractTypeFromAnnotation(member.fields.type, variable.name.offset),
            isStatic: member.isStatic,
            isFinal: member.fields.isFinal,
            sourceLocation: _extractSourceLocation(
              member,
              variable.name.offset,
            ),
          );
          fields.add(fieldDecl);
        }
      }
    }
    return fields;
  }

  List<MethodDecl> _extractMixinMethods(MixinDeclaration node) {
    final methods = <MethodDecl>[];
    for (final member in node.members) {
      if (member is MethodDeclaration) {
        final method = _extractSingleMethod(member, node.name.lexeme);
        methods.add(method);
      }
    }
    return methods;
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
        length: element.name?.length ?? 0,
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
      ParameterOrigin origin = ParameterOrigin.normal; // ✅ Default

      // =========================================================================
      // Case 1: DefaultFormalParameter (wrapper - check inner param)
      // =========================================================================
      if (param is DefaultFormalParameter) {
        final wrappedParam = param.parameter;
        name = _getParameterName(wrappedParam) ?? '';
        type = _extractTypeFromParameter(wrappedParam);
        origin = _getParameterOrigin(wrappedParam); // ✅ Get origin from wrapped

        if (param.defaultValue != null) {
          try {
            defaultValue = _statementExtractor.extractExpression(
              param.defaultValue!,
            );
          } catch (e) {
            print('⚠️  Failed to extract default value: $e');
          }
        }

        isRequired = param.isRequired;
        isNamed = param.isNamed;
        isPositional = param.isPositional;
      }
      // =========================================================================
      // Case 2: SimpleFormalParameter (normal: int x, String name)
      // =========================================================================
      else if (param is SimpleFormalParameter) {
        name = param.name?.lexeme ?? '';
        type = _extractTypeFromAnnotation(param.type, param.offset);
        origin = ParameterOrigin.normal; // ✅ Explicitly normal
      }
      // =========================================================================
      // Case 3: FieldFormalParameter (this.x, this.name)
      // =========================================================================
      else if (param is FieldFormalParameter) {
        name = param.name.lexeme;
        type = _extractTypeFromAnnotation(param.type, param.offset);
        origin = ParameterOrigin.field; // ✅ This field
      }
      // =========================================================================
      // Case 4: FunctionTypedFormalParameter (callback parameter)
      // =========================================================================
      else if (param is FunctionTypedFormalParameter) {
        name = param.name.lexeme;
        type = _extractTypeFromAnnotation(param.returnType, param.offset);
        origin = ParameterOrigin.normal; // ✅ Normal (function type)
      }
      // =========================================================================
      // Case 5: SuperFormalParameter (super.x, super.name) - Dart 2.17+
      // =========================================================================
      else if (param is SuperFormalParameter) {
        name = param.name.lexeme;
        type = _extractTypeFromAnnotation(param.type, param.offset);
        origin = ParameterOrigin.superParam; // ✅ Super parameter
      }
      // =========================================================================
      // Case 6: Unknown parameters
      // =========================================================================
      else {
        print('⚠️  Unknown parameter type: ${param.runtimeType}');
        continue;
      }

      // =========================================================================
      // Create ParameterDecl with origin tracking
      // =========================================================================
      if (name.isNotEmpty) {
        final paramDecl = ParameterDecl(
          id: builder.generateId('param', name),
          name: name,
          type: type,
          defaultValue: defaultValue,
          isRequired: isRequired,
          isNamed: isNamed,
          isPositional: isPositional,
          sourceLocation: _extractSourceLocation(param, param.offset),
          annotations: _extractAnnotations(param.metadata),
          origin: origin, // ✅ Set origin
        );
        parameters.add(paramDecl);
      }
    }

    return parameters;
  }

  ParameterOrigin _getParameterOrigin(NormalFormalParameter param) {
    // ✅ NEW: Determine where parameter comes from

    if (param is FieldFormalParameter) {
      return ParameterOrigin.field; // this.x
    }

    if (param is SuperFormalParameter) {
      return ParameterOrigin.superParam; // super.x
    }

    return ParameterOrigin.normal; // Regular parameter
  }

  TypeIR _extractTypeFromParameter(NormalFormalParameter param) {
    if (param is SimpleFormalParameter) {
      return _extractTypeFromAnnotation(param.type, param.offset);
    } else if (param is FieldFormalParameter) {
      return _extractTypeFromAnnotation(param.type, param.offset);
    } else if (param is FunctionTypedFormalParameter) {
      return _extractTypeFromAnnotation(param.returnType, param.offset);
    } else if (param is SuperFormalParameter) {
      return _extractTypeFromAnnotation(param.type, param.offset); // ✅ ADD THIS
    }

    return DynamicTypeIR(
      id: builder.generateId('type'),
      sourceLocation: _extractSourceLocation(param, param.offset),
    );
  }

  String? _getParameterName(NormalFormalParameter param) {
    if (param is SimpleFormalParameter) return param.name?.lexeme;
    if (param is FieldFormalParameter) return param.name.lexeme;
    if (param is FunctionTypedFormalParameter) return param.name.lexeme;
    if (param is SuperFormalParameter) return param.name.lexeme; // ✅ ADD THIS
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

      return TypeParameterDecl(
        sourceLocation: _extractSourceLocation(tp, tp.offset),
        id: builder.generateId('typeparam', tp.name.lexeme),

        name: tp.name.lexeme,
        bound: bound,
      );
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
            namedArgs[arg.name.label.name] = _statementExtractor
                .extractExpression(arg.expression);
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

  List<ImportConfiguration> _extractConfigurations(
    NodeList<Configuration> configurations,
  ) {
    return configurations.map((config) {
      return ImportConfiguration(
        name: config.name.toSource(),
        value: config.value?.toSource() ?? 'true',
        uri: config.uri.stringValue ?? '',
      );
    }).toList();
  }
}
