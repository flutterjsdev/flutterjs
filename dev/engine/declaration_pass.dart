import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/ast.dart' as ast;
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:path/path.dart' as path;
import 'package:crypto/crypto.dart';
import 'dart:convert';

import 'new_ast_IR/class_decl.dart';
import 'new_ast_IR/dart_file_builder.dart';
import 'new_ast_IR/diagnostics/source_location.dart';
import 'new_ast_IR/function_decl.dart';
import 'new_ast_IR/function_decl.dart' as cd;
import 'new_ast_IR/import_export_stmt.dart';
import 'new_ast_IR/ir/expression_ir.dart';
import 'new_ast_IR/ir/type_ir.dart';
import 'new_ast_IR/parameter_decl.dart';
import 'new_ast_IR/variable_decl.dart';

/// Pass 1: Declaration Discovery
///
/// Extracts all declarations from raw Dart AST without resolving references.
/// This creates the basic structure - DartFile with all classes, functions,
/// imports, variables, etc. populated.
///
/// Later passes (Pass 2+) will resolve references, infer types, build graphs.
class DeclarationPass extends RecursiveAstVisitor<void> {
  final String filePath;
  final String fileContent;
  final DartFileBuilder builder;

  // Context tracking
  ClassDeclaration? _currentClass;
  String _currentLibraryName = '';
  final List<String> _scopeStack = [];

  // Collections for extraction
  final List<ImportStmt> _imports = [];
  final List<ExportStmt> _exports = [];
  final List<PartStmt> _parts = [];
  PartOfStmt? _partOf;
  final Map<String, VariableDecl> _topLevelVariables = {};
  final List<FunctionDecl> _topLevelFunctions = [];
  final List<ClassDecl> _classes = [];
  final List<AnnotationIR> _annotations = [];

  DeclarationPass({
    required this.filePath,
    required this.fileContent,
    required this.builder,
  });

  // =========================================================================
  // MAIN EXTRACTION METHOD
  // =========================================================================

  /// Extract all declarations from the compilation unit
  void extractDeclarations(CompilationUnit unit) {
    // Visit the entire AST
    unit.accept(this);

    // Add all collected declarations to builder
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
  }

  // =========================================================================
  // LIBRARY & METADATA DIRECTIVES
  // =========================================================================

  @override
  void visitLibraryDirective(LibraryDirective node) {
    _currentLibraryName =
        node.name2?.components.map((n) => n.name).join('.') ?? '';
    super.visitLibraryDirective(node);
  }

  @override
  void visitPartDirective(PartDirective node) {
    final partStmt = PartStmt(
      uri: node.uri.stringValue ?? '',
      sourceLocation: _extractSourceLocation(node, node.offset),
    );
    _parts.add(partStmt);
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
    super.visitExportDirective(node);
  }

  // =========================================================================
  // TOP-LEVEL VARIABLE DECLARATIONS
  // =========================================================================

  @override
  void visitTopLevelVariableDeclaration(TopLevelVariableDeclaration node) {
    for (final variable in node.variables.variables) {
      final name = variable.name.lexeme;
      final varDecl = VariableDecl(
        id: builder.generateId('var', name),
        name: name,
        type: _extractTypeFromAnnotation(
          node.variables.type,
          variable.name.offset,
        ),
        initializer: variable.initializer != null
            ? _extractInitializerExpression(variable.initializer!)
            : null,
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
    // Skip if inside a class (method)
    if (_currentClass != null) {
      super.visitFunctionDeclaration(node);
      return;
    }

    final funcName = node.name.lexeme;
    final functionDecl = FunctionDecl(
      id: builder.generateId('func', funcName),
      name: funcName,
      returnType: _extractTypeFromAnnotation(node.returnType, node.name.offset),
      parameters: _extractParameters(node.functionExpression.parameters),
      isAsync: node.functionExpression.body.isAsynchronous,
      isGenerator: node.functionExpression.body.isGenerator,
      typeParameters: _extractTypeParameters(
        node.functionExpression.typeParameters,
      ),
      documentation: _extractDocumentation(node),
      annotations: _extractAnnotations(node.metadata),
      sourceLocation: _extractSourceLocation(node, node.name.offset),
    );
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

      // Extract fields
      final fields = _extractClassFields(node);

      // Extract constructors
      final constructors = _extractConstructors(node);

      // Extract methods
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
          final fieldDecl = FieldDecl(
            id: builder.generateId('field', fieldName),
            name: fieldName,
            type: _extractTypeFromAnnotation(
              member.fields.type,
              variable.name.offset,
            ),
            initializer: variable.initializer != null
                ? _extractInitializerExpression(variable.initializer!)
                : null,
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

  List<ConstructorDecl> _extractConstructors(ClassDeclaration node) {
    final constructors = <ConstructorDecl>[];

    for (final member in node.members) {
      if (member is ConstructorDeclaration) {
        final constructorName = member.name?.lexeme;
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

  List<MethodDecl> _extractMethods(ClassDeclaration node) {
    final methods = <MethodDecl>[];

    for (final member in node.members) {
      if (member is MethodDeclaration) {
        final methodName = member.name.lexeme;
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
          documentation: _extractDocumentation(member),
          annotations: _extractAnnotations(member.metadata),
          sourceLocation: _extractSourceLocation(member, member.name.offset),
          className: node.name.lexeme,
        );
        methods.add(methodDecl);
      }
    }

    return methods;
  }

  // =========================================================================
  // HELPER EXTRACTION METHODS
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

    // Handle nullable marker
    final baseTypeName = typeName.replaceAll('?', '').trim();

    // Check for built-in types
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
          defaultValue = _extractInitializerExpression(param.defaultValue!);
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
            value: _extractInitializerExpression(init.expression),
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
            namedArgs[arg.name.label.name] = _extractInitializerExpression(
              arg.expression,
            );
          } else {
            args.add(_extractInitializerExpression(arg));
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

  ExpressionIR _extractInitializerExpression(Expression expr) {
    final sourceLoc = _extractSourceLocation(expr, expr.offset);
    final typeId = builder.generateId('type');

    // For now, create a simple literal with the string representation
    // Pass 3 will parse this properly
    return LiteralExpressionIR(
      id: builder.generateId('expr'),
      resultType: DynamicTypeIR(id: typeId, sourceLocation: sourceLoc),
      sourceLocation: sourceLoc,
      value: expr.toString(),
      literalType: LiteralType.stringValue,
    );
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

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

  // SourceLocationIR _extractSourceLocation(AstNode node, int startOffset) {
  //   final lineInfo = node.root.lineInfo;
  //   final location = lineInfo?.getLocation(startOffset);

  //   return SourceLocationIR(
  //     id: builder.generateId('loc'),
  //     file: filePath,
  //     line: location?.lineNumber ?? 0,
  //     column: location?.columnNumber ?? 0,
  //     offset: startOffset,
  //     length: node.length,
  //   );
  // }
  SourceLocationIR _extractSourceLocation(AstNode node, int startOffset) {
    // Calculate line and column from offset and file content
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

  String _computeContentHash(String content) {
    // Normalize whitespace for consistent hashing
    final normalized = content
        .replaceAll('\r\n', '\n')
        .split('\n')
        .map((line) => line.trimRight())
        .join('\n')
        .trim();

    return md5.convert(utf8.encode(normalized)).toString();
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
