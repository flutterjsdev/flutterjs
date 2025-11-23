// ============================================================================
// declaration_pass.dart - COMPLETE & CONNECTED VERSION
// ============================================================================
// Connections:
// ✅ analyzer_widget_detection_setup.dart → VerifiedWidgetDetection
// ✅ statement_extraction_pass.dart → StatementExtractionPass
// ✅ statement_widget_analyzer.dart → StatementWidgetAnalyzer
// ✅ statement_ir.dart → StatementIR, WidgetUsageIR
// ============================================================================

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/ast.dart' as ast;
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:flutterjs_core/src/ast_ir/ir/statement/statement_widget_analyzer.dart';
import 'package:path/path.dart' as path;

// ============================================================================
// IMPORTS: Connect to other components
// ============================================================================

import 'analyzer_widget_detection_setup.dart';

import 'statement_extraction_pass.dart';

import 'ast_ir/ir/expression_ir.dart';
import 'ast_ir/ir/type_ir.dart';
import 'ast_ir/diagnostics/source_location.dart';

// 5️⃣ DECLARATIONS & BUILDERS
import 'ast_ir/dart_file_builder.dart';
import 'ast_ir/class_decl.dart';
import 'ast_ir/function_decl.dart';
import 'ast_ir/function_decl.dart' as cd;
import 'ast_ir/import_export_stmt.dart';
import 'ast_ir/parameter_decl.dart';
import 'ast_ir/variable_decl.dart';

// ============================================================================
// DECLARATION PASS: Main class connecting everything
// ============================================================================

/// 🔴 MAIN CLASS: Extracts declarations and detects widgets
///
/// FLOW:
/// 1. Extract classes, functions, variables from AST
/// 2. Call VerifiedWidgetDetection to identify widgets (via type resolution)
/// 3. Call StatementExtractionPass to convert statements to IR
/// 4. Call StatementWidgetAnalyzer to extract widget usages
/// 5. Attach widget data to statements
class DeclarationPass extends RecursiveAstVisitor<void> {
  // =========================================================================
  // CONFIGURATION
  // =========================================================================

  final String filePath;
  final String fileContent;
  final DartFileBuilder builder;

  // ✅ OPTIONAL: Widget detection (can be null to skip detection)
  final VerifiedWidgetDetection? widgetDetection;

  // =========================================================================
  // HELPER COMPONENTS (created in constructor)
  // =========================================================================

  /// ✅ COMPONENT 1: Statement extraction helper
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
    this.widgetDetection, // ✅ Optional widget detection
  }) {
    // ✅ COMPONENT 1: Initialize statement extractor
    _statementExtractor = StatementExtractionPass(
      filePath: filePath,
      fileContent: fileContent,
      builder: builder,
    );
  }

  // =========================================================================
  // MAIN EXTRACTION METHOD
  // =========================================================================

  /// 🎯 Main entry point: Extract all declarations from compilation unit
  ///
  /// PROCESS:
  /// 1. Visit all AST nodes (triggering visitor methods)
  /// 2. Collect all declarations
  /// 3. Add to builder
  void extractDeclarations(CompilationUnit unit) {
    print('📋 [DeclarationPass] Starting extraction for: $filePath');

    // Visit entire AST
    unit.accept(this);

    // Configure builder with file metadata
    builder
      ..withLibrary(_currentLibraryName)
      ..withContentHash(fileContent);

    // Add imports
    for (final import in _imports) {
      builder.addImport(import);
    }

    // Add exports
    for (final export in _exports) {
      builder.addExport(export);
    }

    // Add parts
    for (final part in _parts) {
      builder.addPart(part);
    }

    // Add part of
    if (_partOf != null) {
      builder.withPartOf(_partOf!);
    }

    // Add top-level variables
    for (final variable in _topLevelVariables.values) {
      builder.addVariable(variable);
    }

    // Add top-level functions
    for (final function in _topLevelFunctions) {
      builder.addFunction(function);
    }

    // Add classes
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
        node.name2?.components.map((n) => n.name).join('.') ?? '';
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

      // ✅ Use StatementExtractionPass to extract initializer expression
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
    // ✅ Skip if inside a class (these are methods, not top-level functions)
    if (_currentClass != null) {
      super.visitFunctionDeclaration(node);
      return;
    }

    final funcName = node.name.lexeme;
    print('🔧 [Function] $funcName()');

    // =========================================================================
    // STEP 1: Determine if this is a widget function (BEFORE body analysis)
    // =========================================================================
    bool isWidgetFunc = false;
    String? widgetKind;

    if (widgetDetection != null) {
      final execElement = node.declaredFragment?.element;

      if (execElement != null) {
        isWidgetFunc = VerifiedWidgetDetection.isWidgetFunction(execElement);

        if (isWidgetFunc) {
          widgetKind = VerifiedWidgetDetection.getWidgetKind(execElement);
          print('   ✅ [WIDGET FUNCTION] - Kind: $widgetKind');
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
    // STEP 3: Analyze for widgets if it's a widget function with content
    // =========================================================================
    if (isWidgetFunc && bodyStatements.isNotEmpty) {
      print('   📊 [Analyzing widget function for widget usages]');

      final analyzer = StatementWidgetAnalyzer(
        filePath: filePath,
        fileContent: fileContent,
        builder: builder,
      );

      // This modifies bodyStatements in-place, adding widgetUsages
      analyzer.analyzeStatementsForWidgets(bodyStatements);

      print('   ✅ [Widgets analyzed and attached to statements]');
    } else if (isWidgetFunc && bodyStatements.isEmpty) {
      print('   ⚠️  Widget function with empty body (abstract/external?)');
    }

    // =========================================================================
    // STEP 4: Create FunctionDecl with complete data
    // =========================================================================
    final functionDecl = FunctionDecl(
      id: builder.generateId('func', funcName),
      name: funcName,
      returnType: _extractTypeFromAnnotation(node.returnType, node.name.offset),
      parameters: _extractParameters(node.functionExpression.parameters),
      body:
          bodyStatements, // ✅ Now has widget data attached if it's a widget function
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
    // STEP 5: Mark as widget function if detected
    // =========================================================================
    if (isWidgetFunc) {
      functionDecl.markAsWidgetFunction(isWidgetFun: true);
      if (widgetKind != null) {
        print('   📍 Marked as widget function (kind: $widgetKind)');
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

      // Extract class members
      final fields = _extractClassFields(node);
      final constructors = _extractConstructors(node);
      final methods = _extractMethods(node);

      // Create ClassDecl
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

      // ✅ COMPONENT 2: Check if this is a widget class (via VerifiedWidgetDetection)
      if (widgetDetection != null) {
        final classElement = node.declaredFragment?.element;
        if (classElement != null &&
            VerifiedWidgetDetection.isWidgetClass(classElement)) {
          print('   ✅ [WIDGET CLASS] $className');

          // Get inheritance chain
          final chain = _getInheritanceChain(classElement);

          // Determine widget category
          String category = 'custom';
          final superclassName = classElement.supertype?.element.name;
          if (superclassName == 'StatelessWidget') {
            category = 'stateless';
          } else if (superclassName == 'StatefulWidget') {
            category = 'stateful';
          }

          // Check if has valid build method
          final hasBuild = classElement.methods.any(
            (m) => m.name == 'build' && !m.isStatic,
          );

          // Mark as widget
          classDecl.markAsWidget(
            category: category,
            chain: chain,
            hasBuild: hasBuild,
          );
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

  /// Extract all fields from a class
  List<FieldDecl> _extractClassFields(ClassDeclaration node) {
    final fields = <FieldDecl>[];

    for (final member in node.members) {
      if (member is FieldDeclaration) {
        for (final variable in member.fields.variables) {
          final fieldName = variable.name.lexeme;

          // ✅ Use StatementExtractionPass to extract initializer
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

  /// Extract all constructors from a class
  List<ConstructorDecl> _extractConstructors(ClassDeclaration node) {
    final constructors = <ConstructorDecl>[];

    for (final member in node.members) {
      if (member is ConstructorDeclaration) {
        final constructorName = member.name?.lexeme;

        // ✅ Use StatementExtractionPass to extract constructor body
        final bodyStatements = _statementExtractor.extractBodyStatements(
          member.body,
        );

        final constructorDecl = ConstructorDecl(
          id: builder.generateId(
            'ctor',
            '${node.name.lexeme}.${constructorName ?? 'new'}',
          ),
          name: constructorName ?? '',
          constructorClass: node.name.lexeme,
          constructorName: constructorName,
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
        constructors.add(constructorDecl);
      }
    }

    return constructors;
  }

  /// Extract all methods from a class
  List<MethodDecl> _extractMethods(ClassDeclaration node) {
    final methods = <MethodDecl>[];

    for (final member in node.members) {
      if (member is MethodDeclaration) {
        final methodName = member.name.lexeme;

        // =========================================================================
        // STEP 1: Determine if this is a widget method (BEFORE body analysis)
        // =========================================================================
        bool isWidgetFunc = false;
        String? widgetKind;

        if (widgetDetection != null) {
          final methodElement = member.declaredFragment?.element;

          if (methodElement != null) {
            isWidgetFunc = VerifiedWidgetDetection.isWidgetFunction(
              methodElement,
            );

            if (isWidgetFunc) {
              widgetKind = VerifiedWidgetDetection.getWidgetKind(methodElement);
              print('   ✅ [WIDGET METHOD] $methodName - Kind: $widgetKind');
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
        // STEP 3: Analyze for widgets if it's a widget method with content
        // =========================================================================
        if (isWidgetFunc && bodyStatements.isNotEmpty) {
          print('   📊 [Analyzing $methodName() for widget usages]');

          final analyzer = StatementWidgetAnalyzer(
            filePath: filePath,
            fileContent: fileContent,
            builder: builder,
          );

          // This modifies bodyStatements in-place, adding widgetUsages
          analyzer.analyzeStatementsForWidgets(bodyStatements);

          print('   ✅ [Widgets analyzed and attached]');
        } else if (isWidgetFunc && bodyStatements.isEmpty) {
          // Could be abstract method or method with no implementation
          if (member.isAbstract) {
            print('   ℹ️  Abstract widget method (no body to analyze)');
          } else {
            print('   ⚠️  Widget method with empty body');
          }
        } else if (!member.isAbstract && methodName == 'build') {
          // Special case: build() method that isn't detected as widget
          // This is unusual and might indicate a problem
          print(
            '   ⚠️  Method named "build" but not detected as widget-returning',
          );
        }

        // =========================================================================
        // STEP 4: Create MethodDecl with complete data
        // =========================================================================
        final methodDecl = MethodDecl(
          id: builder.generateId('method', '${node.name.lexeme}.$methodName'),
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
          body:
              bodyStatements, // ✅ Now has widget data attached if it's a widget method
          documentation: _extractDocumentation(member),
          annotations: _extractAnnotations(member.metadata),
          sourceLocation: _extractSourceLocation(member, member.name.offset),
          className: node.name.lexeme,
        );

        // =========================================================================
        // STEP 5: Mark as widget method if detected
        // =========================================================================
        if (isWidgetFunc) {
          methodDecl.markAsWidgetFunction(isWidgetFun: true);
        }

        methods.add(methodDecl);
      }
    }

    return methods;
  }

  // =========================================================================
  // HELPER METHODS: Extractors
  // =========================================================================

  /// Extract show combinators from import/export
  List<String> _extractShowCombinators(NamespaceDirective node) {
    return node.combinators
        .whereType<ShowCombinator>()
        .expand((c) => c.shownNames.map((n) => n.name))
        .toList();
  }

  /// Extract hide combinators from import/export
  List<String> _extractHideCombinators(NamespaceDirective node) {
    return node.combinators
        .whereType<HideCombinator>()
        .expand((c) => c.hiddenNames.map((n) => n.name))
        .toList();
  }

  /// Extract type information from type annotation
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

  /// Extract parameters from a parameter list
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
          // ✅ Use StatementExtractionPass to extract default value
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

  /// Get parameter name from different parameter types
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

  /// Get parameter type annotation from different parameter types
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

  /// Extract type parameters from generic type
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

  /// Extract constructor initializers (field: value)
  List<cd.ConstructorInitializer> _extractConstructorInitializers(
    NodeList<ast.ConstructorInitializer> initializers,
    int offset,
  ) {
    final result = <cd.ConstructorInitializer>[];

    for (final init in initializers) {
      if (init is ConstructorFieldInitializer) {
        // ✅ Use StatementExtractionPass to extract initializer expression
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

  /// Extract superclass from extends clause
  TypeIR? _extractSuperclass(ClassDeclaration node) {
    if (node.extendsClause == null) return null;

    final superclass = node.extendsClause!.superclass;
    return _extractTypeFromAnnotation(superclass, superclass.offset);
  }

  /// Extract interfaces from implements clause
  List<TypeIR> _extractInterfaces(ClassDeclaration node) {
    if (node.implementsClause == null) return [];

    return node.implementsClause!.interfaces.map((iface) {
      return _extractTypeFromAnnotation(iface, iface.offset);
    }).toList();
  }

  /// Extract mixins from with clause
  List<TypeIR> _extractMixins(ClassDeclaration node) {
    if (node.withClause == null) return [];

    return node.withClause!.mixinTypes.map((mixin) {
      return _extractTypeFromAnnotation(mixin, mixin.offset);
    }).toList();
  }

  /// Extract annotations/metadata
  List<AnnotationIR> _extractAnnotations(NodeList<Annotation> metadata) {
    return metadata.map((ann) {
      final args = <ExpressionIR>[];
      final namedArgs = <String, ExpressionIR>{};

      if (ann.arguments != null) {
        for (final arg in ann.arguments!.arguments) {
          if (arg is NamedExpression) {
            // ✅ Use StatementExtractionPass to extract named argument
            namedArgs[arg.name.label.name] = _statementExtractor
                .extractExpression(arg.expression);
          } else {
            // ✅ Use StatementExtractionPass to extract argument
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

  /// Extract documentation comments
  String? _extractDocumentation(AnnotatedNode node) {
    final docComment = node.documentationComment;
    if (docComment == null) return null;

    return docComment.tokens.map((t) => t.lexeme).join('\n');
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /// Determine visibility from name (private if starts with _)
  VisibilityModifier _getVisibility(String name) {
    return name.startsWith('_')
        ? VisibilityModifier.private
        : VisibilityModifier.public;
  }

  /// Check if type is built-in
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

  /// Extract source location with line and column
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

  /// Get inheritance chain: [CustomButton, StatelessWidget, Widget]
  static List<String> _getInheritanceChain(ClassElement classElement) {
    final chain = <String>[];
    var current = classElement.supertype;

    while (current != null) {
      chain.add(current.element.name ?? '');
      current = current.superclass;
    }

    return chain;
  }

  /// Push scope for tracking context
  void _pushScope(String type, String name) {
    _scopeStack.add('$type:$name');
  }

  /// Pop scope
  void _popScope() {
    if (_scopeStack.isNotEmpty) {
      _scopeStack.removeLast();
    }
  }
}

// ============================================================================
// COMPLETE CONNECTIONS DIAGRAM
// ============================================================================

/*
 * 
 * DECLARATION_PASS.dart CONNECTION MAP
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                   DeclarationPass                           │
 * │        (Main orchestrator - connects everything)            │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * ✅ INPUT: CompilationUnit (AST from analyzer)
 * 
 * ┌────────────────────────────────────────────────────────────────┐
 * │ COMPONENT 1: StatementExtractionPass                           │
 * │ ─────────────────────────────────────────────────────────────  │
 * │ Used in:                                                       │
 * │  • extractBodyStatements(FunctionBody) → List<StatementIR>    │
 * │  • extractExpression(Expression) → ExpressionIR               │
 * │                                                                │
 * │ Called in:                                                     │
 * │  • visitFunctionDeclaration → extract function body          │
 * │  • visitClassDeclaration._extractMethods → extract method body│
 * │  • visitClassDeclaration._extractConstructors → ctor body     │
 * │  • _extractClassFields → field initializers                   │
 * │  • _extractParameters → default parameter values              │
 * │  • _extractConstructorInitializers → initializer expressions  │
 * │  • _extractAnnotations → annotation arguments                 │
 * └────────────────────────────────────────────────────────────────┘
 *         ↓ Produces
 *    List<StatementIR>
 *    List<ExpressionIR>
 * 
 * ┌────────────────────────────────────────────────────────────────┐
 * │ COMPONENT 2: VerifiedWidgetDetection                           │
 * │ ─────────────────────────────────────────────────────────────  │
 * │ Used in:                                                       │
 * │  • isWidgetClass(ClassElement) → bool                         │
 * │  • isWidgetFunction(ExecutableElement) → bool                 │
 * │                                                                │
 * │ Called in:                                                     │
 * │  • visitFunctionDeclaration → check if function is widget     │
 * │  • visitClassDeclaration → check if class is widget           │
 * │                                                                │
 * │ Uses Type Resolution (NO hardcoded lists):                    │
 * │  • Walks inheritance chain via element.supertype              │
 * │  • Checks if extends Widget (directly or indirectly)          │
 * │  • Validates build() method exists                            │
 * │  • Resolves return types                                      │
 * └────────────────────────────────────────────────────────────────┘
 *         ↓ Produces
 *    widget: true/false
 *    category: 'stateless' | 'stateful' | 'custom'
 * 
 * ┌────────────────────────────────────────────────────────────────┐
 * │ COMPONENT 3: StatementWidgetAnalyzer                           │
 * │ ─────────────────────────────────────────────────────────────  │
 * │ Used in:                                                       │
 * │  • analyzeStatementsForWidgets(List<StatementIR>) → void      │
 * │                                                                │
 * │ Called in:                                                     │
 * │  • _extractMethods → ONLY for build() method                  │
 * │                                                                │
 * │ Process:                                                       │
 * │  1. Iterates through each statement in body                   │
 * │  2. Calls _extractWidgetsFromStatement(stmt)                  │
 * │  3. Recursively finds all WidgetUsageIR                       │
 * │  4. Attaches widgetUsages to statements                       │
 * │  5. Modifies statements in-place                              │
 * └────────────────────────────────────────────────────────────────┘
 *         ↓ Modifies in-place
 *    bodyStatements[i].widgetUsages = [WidgetUsageIR, ...]
 * 
 * ┌────────────────────────────────────────────────────────────────┐
 * │ COMPONENT 4: StatementIR & WidgetUsageIR                       │
 * │ ─────────────────────────────────────────────────────────────  │
 * │ All statements now have:                                       │
 * │  • widgetUsages: List<WidgetUsageIR>?                         │
 * │  • getWidgetUsages() → List<WidgetUsageIR>                    │
 * │  • hasWidgets() → bool                                        │
 * │                                                                │
 * │ WidgetUsageIR contains:                                        │
 * │  • widgetName: 'Scaffold', 'Text', etc.                       │
 * │  • properties: {appBar: '...', body: '...'}                   │
 * │  • statementType: 'return' | 'variable' | 'property'         │
 * │  • isConditional: true/false                                  │
 * │  • assignedToVariable: 'myWidget'?                            │
 * └────────────────────────────────────────────────────────────────┘
 *         ↓ Produces
 *    Final IR with widget data attached
 * 
 * ┅ ✅ OUTPUT: Complete AST with widget detection
 *    ClassDecl {
 *      isWidget: true
 *      widgetCategory: 'stateless'
 *      methods: [
 *        MethodDecl build() {
 *          body: [
 *            ReturnStmt {
 *              widgetUsages: [
 *                WidgetUsageIR('Scaffold'),
 *                WidgetUsageIR('AppBar'),
 *                ...
 *              ]
 *            }
 *          ]
 *        }
 *      ]
 *    }
 * 
 */
