import 'package:collection/collection.dart';


import 'ast_ir/class_decl.dart';
import 'ast_ir/dart_file_builder.dart';
import 'ast_ir/function_decl.dart';
import 'ast_ir/ir/expression_ir.dart';
import 'ast_ir/ir/type_ir.dart';
import 'ast_ir/parameter_decl.dart';
import 'ast_ir/state_management/state_management.dart';
import 'ast_ir/variable_decl.dart';
import 'ast_ir/diagnostics/analysis_issue.dart';
import 'ast_ir/diagnostics/issue_category.dart';
import 'ast_ir/diagnostics/source_location.dart';
import 'symbol_resolution.dart';

/// Pass 3: Type Inference
///
/// Input: Resolved declarations from Pass 2 (SymbolResolutionPass)
/// Output: Complete type information for all expressions, no UnresolvedTypeIR remaining
///
/// Responsibilities:
/// 1. Infer expression types bottom-up (literals, binary ops, method calls, etc.)
/// 2. Resolve type parameters and generics
/// 3. Fill in UnresolvedTypeIR with actual inferred types
/// 4. Track type mismatches and incompatibilities
/// 5. Build type compatibility graph
/// 6. Report type errors as analysis issues
class TypeInferencePass {
  /// All DartFiles in project (from Pass 2 with resolutions)
  final Map<String, DartFile> dartFiles;

  /// Global symbol registry from Pass 2
  final Map<String, dynamic> globalSymbols;

  /// Provider registry from Pass 2
  final Map<String, ProviderInfo> providerRegistry;

  /// Type inference cache: expression_id -> inferred_type
  final Map<String, TypeIR> typeCache = {};

  /// Type compatibility graph: type_name -> compatible_types
  final Map<String, Set<String>> typeCompatibilityGraph = {};

  /// Issues found during type inference
  final List<AnalysisIssue> inferenceIssues = [];

  /// Current file being analyzed (for context)
  late DartFile currentFile;

  /// Current scope (for variable type tracking)
  final List<Map<String, TypeIR>> scopeStack = [];

  TypeInferencePass({
    required this.dartFiles,
    required this.globalSymbols,
    required this.providerRegistry,
  });

  /// Execute complete type inference pass
  void inferAllTypes() {
    // Step 1: Build type compatibility graph
    _buildTypeCompatibilityGraph();

    // Step 2: Infer types in all files
    for (final dartFile in dartFiles.values) {
      currentFile = dartFile;
      _inferTypesInFile(dartFile);
    }

    // Step 3: Validate type assignments
    _validateTypeAssignments();

    // Step 4: Update files with inferred types and issues
    _updateFilesWithInferences();
  }

  // =========================================================================
  // STEP 1: BUILD TYPE COMPATIBILITY GRAPH
  // =========================================================================

  void _buildTypeCompatibilityGraph() {
    // Register standard type compatibility rules
    _registerTypeCompatibility('int', 'num');
    _registerTypeCompatibility('double', 'num');
    _registerTypeCompatibility('num', 'Object');
    _registerTypeCompatibility('String', 'Object');
    _registerTypeCompatibility('bool', 'Object');
    _registerTypeCompatibility('List', 'Iterable');
    _registerTypeCompatibility('Map', 'Object');
    _registerTypeCompatibility('Set', 'Iterable');

    // Register Flutter widget hierarchy
    _registerTypeCompatibility('StatelessWidget', 'Widget');
    _registerTypeCompatibility('StatefulWidget', 'Widget');
    _registerTypeCompatibility('Container', 'Widget');
    _registerTypeCompatibility('Row', 'Widget');
    _registerTypeCompatibility('Column', 'Widget');
    _registerTypeCompatibility('Text', 'Widget');

    // Register all user-defined class hierarchies from resolved data
    for (final file in dartFiles.values) {
      for (final classDecl in file.classDeclarations) {
        if (classDecl.superclass != null) {
          final superclassName = _extractTypeName(classDecl.superclass!);
          _registerTypeCompatibility(classDecl.name, superclassName);
        }

        for (final interfaceType in classDecl.interfaces) {
          final interfaceName = _extractTypeName(interfaceType);
          _registerTypeCompatibility(classDecl.name, interfaceName);
        }
      }
    }
  }

  void _registerTypeCompatibility(String subtype, String supertype) {
    if (typeCompatibilityGraph[supertype] == null) {
      typeCompatibilityGraph[supertype] = {};
    }
    typeCompatibilityGraph[supertype]!.add(subtype);
  }

  // =========================================================================
  // STEP 2: INFER TYPES IN FILES
  // =========================================================================

  void _inferTypesInFile(DartFile file) {
    // Initialize scope with global symbols
    _pushScope();

    // Infer types in classes
    for (final classDecl in file.classDeclarations) {
      _inferTypesInClass(classDecl);
    }

    // Infer types in functions
    for (final func in file.functionDeclarations) {
      _inferTypesInFunction(func);
    }

    // Infer types in variables
    for (final variable in file.variableDeclarations) {
      _inferVariableType(variable);
    }

    _popScope();
  }

  void _inferTypesInClass(ClassDecl classDecl) {
    _pushScope();

    // Register class fields in scope
    for (final field in classDecl.fields) {
      _addToCurrentScope(field.name, field.type);
    }

    // Infer field initializers
    for (final field in classDecl.fields) {
      if (field.initializer != null) {
        final inferredType = _inferExpressionType(field.initializer!);
        _checkTypeAssignment(field.type, inferredType, field.sourceLocation);
      }
    }

    // Infer types in methods
    for (final method in classDecl.methods) {
      _inferTypesInMethod(method);
    }

    // Infer types in constructors
    for (final constructor in classDecl.constructors) {
      _inferTypesInConstructor(constructor);
    }

    _popScope();
  }

  void _inferTypesInMethod(MethodDecl method) {
    _pushScope();

    // Register parameters in scope
    for (final param in method.parameters) {
      _addToCurrentScope(param.name, param.type);
    }

    _popScope();
  }

  void _inferTypesInFunction(FunctionDecl func) {
    _pushScope();

    // Register parameters
    for (final param in func.parameters) {
      _addToCurrentScope(param.name, param.type);
    }

    _popScope();
  }

  void _inferTypesInConstructor(ConstructorDecl constructor) {
    _pushScope();

    // Register parameters
    for (final param in constructor.parameters) {
      _addToCurrentScope(param.name, param.type);
    }

    _popScope();
  }

  void _inferVariableType(VariableDecl variable) {
    if (variable.initializer != null) {
      final inferredType = _inferExpressionType(variable.initializer!);
      _checkTypeAssignment(
        variable.type,
        inferredType,
        variable.sourceLocation,
      );

      // If variable type is dynamic/unresolved, update it
      if (variable.type is DynamicTypeIR || variable.type is UnresolvedTypeIR) {
        variable.type = inferredType;
      }
    }
  }

  // =========================================================================
  // STEP 3: INFER EXPRESSION TYPES (BOTTOM-UP)
  // =========================================================================

  TypeIR _inferExpressionType(ExpressionIR expr) {
    // Check cache first
    if (typeCache.containsKey(expr.id)) {
      return typeCache[expr.id]!;
    }

    TypeIR inferredType;

    if (expr is LiteralExpressionIR) {
      inferredType = _inferLiteralType(expr);
    } else if (expr is IdentifierExpressionIR) {
      inferredType = _inferIdentifierType(expr);
    } else if (expr is BinaryExpressionIR) {
      inferredType = _inferBinaryExpressionType(expr);
    } else if (expr is MethodCallExpressionIR) {
      inferredType = _inferMethodCallType(expr);
    } else if (expr is PropertyAccessExpressionIR) {
      inferredType = _inferPropertyAccessType(expr);
    } else if (expr is ConditionalExpressionIR) {
      inferredType = _inferConditionalType(expr);
    } else {
      // Unknown expression type
      inferredType = DynamicTypeIR(
        id: '${expr.id}_inferred',
        sourceLocation: expr.sourceLocation,
      );
    }

    // Cache result
    typeCache[expr.id] = inferredType;
    return inferredType;
  }

  TypeIR _inferLiteralType(LiteralExpressionIR expr) {
    switch (expr.literalType) {
      case LiteralType.stringValue:
        return _createStringType();
      case LiteralType.intValue:
        return _createIntType();
      case LiteralType.doubleValue:
        return _createDoubleType();
      case LiteralType.boolValue:
        return _createBoolType();
      case LiteralType.nullValue:
        return _createNullType();
      default:
        return DynamicTypeIR(
          id: '${expr.id}_type',
          sourceLocation: expr.sourceLocation,
        );
    }
  }

  TypeIR _inferIdentifierType(IdentifierExpressionIR expr) {
    final name = expr.name;

    // Check current scope
    for (int i = scopeStack.length - 1; i >= 0; i--) {
      if (scopeStack[i].containsKey(name)) {
        return scopeStack[i][name]!;
      }
    }

    // Check global symbols
    final symbol = globalSymbols[name];
    if (symbol is ClassDecl) {
      return SimpleTypeIR(
        id: '${expr.id}_type',
        name: name,
        isNullable: false,
        sourceLocation: expr.sourceLocation,
      );
    }

    // Report unresolved identifier
    _addTypeIssue(
      severity: IssueSeverity.error,
      message: 'Unresolved identifier: $name',
      sourceLocation: expr.sourceLocation,
    );

    return DynamicTypeIR(
      id: '${expr.id}_type',
      sourceLocation: expr.sourceLocation,
    );
  }

  TypeIR _inferBinaryExpressionType(BinaryExpressionIR expr) {
    final leftType = _inferExpressionType(expr.left);
    final rightType = _inferExpressionType(expr.right);

    // Comparison operators always return bool
    if (['==', '!=', '<', '>', '<=', '>='].contains(expr.operator)) {
      return _createBoolType();
    }

    // Logical operators return bool
    if (['&&', '||', '!'].contains(expr.operator)) {
      return _createBoolType();
    }

    // Arithmetic operators
    if (['+', '-', '*', '/', '%', '~/', '^'].contains(expr.operator)) {
      // If either operand is double, result is double
      if (_isDoubleType(leftType) || _isDoubleType(rightType)) {
        return _createDoubleType();
      }

      // If both are int, result is int (except for /)
      if (_isIntType(leftType) && _isIntType(rightType)) {
        return expr.operator == '/' ? _createDoubleType() : _createIntType();
      }

      // For strings, + is concatenation
      if (expr.operator == '+' && _isStringType(leftType)) {
        return _createStringType();
      }

      // Default to dynamic for mixed types
      return DynamicTypeIR(
        id: '${expr.id}_type',
        sourceLocation: expr.sourceLocation,
      );
    }

    // Null coalescing operator returns left type if non-null, right type otherwise
    if (expr.operator == '??') {
      return leftType;
    }

    // Bitwise operators return int
    if (['&', '|', '^', '<<', '>>'].contains(expr.operator)) {
      return _createIntType();
    }

    return DynamicTypeIR(
      id: '${expr.id}_type',
      sourceLocation: expr.sourceLocation,
    );
  }

  TypeIR _inferMethodCallType(MethodCallExpressionIR expr) {
    // If method call has explicit return type, use it
    if (expr.resultType is! DynamicTypeIR) {
      return expr.resultType;
    }

    // Try to infer from target object's method
    if (expr.target != null) {
      final targetType = _inferExpressionType(expr.target!);
      final methodReturnType = _findMethodReturnType(
        targetType,
        expr.methodName,
      );
      if (methodReturnType != null) {
        return methodReturnType;
      }
    }

    // Try to infer from global function
    final globalFunc = globalSymbols[expr.methodName];
    if (globalFunc is FunctionDecl) {
      return globalFunc.returnType;
    }

    // Report unresolved method
    _addTypeIssue(
      severity: IssueSeverity.warning,
      message: 'Cannot infer return type of method: ${expr.methodName}',
      sourceLocation: expr.sourceLocation,
    );

    return DynamicTypeIR(
      id: '${expr.id}_type',
      sourceLocation: expr.sourceLocation,
    );
  }

  TypeIR _inferPropertyAccessType(PropertyAccessExpressionIR expr) {
    final targetType = _inferExpressionType(expr.target);
    final propertyType = _findPropertyType(targetType, expr.propertyName);

    if (propertyType != null) {
      return propertyType;
    }

    _addTypeIssue(
      severity: IssueSeverity.warning,
      message:
          'Cannot find property: ${expr.propertyName} on type ${_extractTypeName(targetType)}',
      sourceLocation: expr.sourceLocation,
    );

    return DynamicTypeIR(
      id: '${expr.id}_type',
      sourceLocation: expr.sourceLocation,
    );
  }

  TypeIR _inferConditionalType(ConditionalExpressionIR expr) {
    final thenType = _inferExpressionType(expr.thenExpression);
    final elseType = _inferExpressionType(expr.elseExpression);

    // If types match, return that type
    if (_typesMatch(thenType, elseType)) {
      return thenType;
    }

    // Find common supertype
    final commonType = _findCommonSupertype(thenType, elseType);
    if (commonType != null) {
      return commonType;
    }

    // Default to dynamic if no common type
    return DynamicTypeIR(
      id: '${expr.id}_type',
      sourceLocation: expr.sourceLocation,
    );
  }

  // =========================================================================
  // STEP 4: VALIDATE TYPE ASSIGNMENTS
  // =========================================================================

  void _validateTypeAssignments() {
    for (final file in dartFiles.values) {
      _validateClassTypeAssignments(file);
      _validateFunctionTypeAssignments(file);
    }
  }

  void _validateClassTypeAssignments(DartFile file) {
    for (final classDecl in file.classDeclarations) {
      for (final field in classDecl.fields) {
        if (field.initializer != null) {
          final inferredType = _inferExpressionType(field.initializer!);
          _checkTypeAssignment(field.type, inferredType, field.sourceLocation);
        }
      }
    }
  }

  void _validateFunctionTypeAssignments(DartFile file) {
    for (final func in file.functionDeclarations) {
      for (final param in func.parameters) {
        if (param.defaultValue != null) {
          final inferredType = _inferExpressionType(param.defaultValue!);
          _checkTypeAssignment(param.type, inferredType, param.sourceLocation);
        }
      }
    }
  }

  void _checkTypeAssignment(
    TypeIR targetType,
    TypeIR sourceType,
    SourceLocationIR location,
  ) {
    if (!_isAssignableTo(sourceType, targetType)) {
      _addTypeIssue(
        severity: IssueSeverity.error,
        message:
            'Type mismatch: ${_extractTypeName(sourceType)} is not assignable to ${_extractTypeName(targetType)}',
        sourceLocation: location,
      );
    }
  }

  // =========================================================================
  // STEP 5: UPDATE FILES WITH INFERENCES
  // =========================================================================

  void _updateFilesWithInferences() {
    for (final file in dartFiles.values) {
      file.typeInferenceInfo = TypeInferenceInfo(
        typeCache: typeCache,
        typeCompatibilityGraph: typeCompatibilityGraph,
        issues: inferenceIssues,
      );
    }
  }

  // =========================================================================
  // TYPE SYSTEM HELPER METHODS
  // =========================================================================

  bool _isAssignableTo(TypeIR source, TypeIR target) {
    if (_typesMatch(source, target)) {
      return true;
    }

    if (source is DynamicTypeIR || target is DynamicTypeIR) {
      return true;
    }

    final sourceName = _extractTypeName(source);
    final targetName = _extractTypeName(target);

    if (typeCompatibilityGraph[targetName]?.contains(sourceName) ?? false) {
      return true;
    }

    if (target.isNullable && source is NullTypeIR) {
      return true;
    }

    return false;
  }

  bool _typesMatch(TypeIR type1, TypeIR type2) {
    final name1 = _extractTypeName(type1);
    final name2 = _extractTypeName(type2);

    if (name1 != name2) return false;
    if (type1.isNullable != type2.isNullable) return false;

    return true;
  }

  TypeIR? _findCommonSupertype(TypeIR type1, TypeIR type2) {
    final name1 = _extractTypeName(type1);
    final name2 = _extractTypeName(type2);

    if (name1 == name2) return type1;

    return SimpleTypeIR(
      id: 'common_type',
      name: 'Object',
      isNullable: type1.isNullable || type2.isNullable,
      sourceLocation: type1.sourceLocation,
    );
  }

  TypeIR? _findMethodReturnType(TypeIR objectType, String methodName) {
    final typeName = _extractTypeName(objectType);

    switch (typeName) {
      case 'List':
      case 'Set':
        if (methodName == 'length') return _createIntType();
        if (methodName == 'isEmpty') return _createBoolType();
        if (methodName == 'isNotEmpty') return _createBoolType();
        break;
      case 'String':
        if (methodName == 'length') return _createIntType();
        if (methodName == 'isEmpty') return _createBoolType();
        if (methodName == 'toUpperCase') return _createStringType();
        if (methodName == 'toLowerCase') return _createStringType();
        break;
    }

    for (final file in dartFiles.values) {
      final classDecl = file.classDeclarations.firstWhereOrNull(
        (c) => c.name == typeName,
      );

      if (classDecl != null) {
        final method = classDecl.methods.firstWhereOrNull(
          (m) => m.name == methodName,
        );

        if (method != null) {
          return method.returnType;
        }
      }
    }

    return null;
  }

  TypeIR? _findPropertyType(TypeIR objectType, String propertyName) {
    final typeName = _extractTypeName(objectType);

    for (final file in dartFiles.values) {
      final classDecl = file.classDeclarations.firstWhereOrNull(
        (c) => c.name == typeName,
      );

      if (classDecl != null) {
        final field = classDecl.fields.firstWhereOrNull(
          (f) => f.name == propertyName,
        );

        if (field != null) {
          return field.type;
        }
      }
    }

    return null;
  }

  // =========================================================================
  // TYPE CREATION HELPERS
  // =========================================================================

  TypeIR _createStringType() => SimpleTypeIR(
    id: 'type_string',
    name: 'String',
    isNullable: false,
    sourceLocation: SourceLocationIR(
      id: 'loc_builtin',
      file: 'builtin',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    ),
  );

  TypeIR _createIntType() => SimpleTypeIR(
    id: 'type_int',
    name: 'int',
    isNullable: false,
    sourceLocation: SourceLocationIR(
      id: 'loc_builtin',
      file: 'builtin',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    ),
  );

  TypeIR _createDoubleType() => SimpleTypeIR(
    id: 'type_double',
    name: 'double',
    isNullable: false,
    sourceLocation: SourceLocationIR(
      id: 'loc_builtin',
      file: 'builtin',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    ),
  );

  TypeIR _createBoolType() => SimpleTypeIR(
    id: 'type_bool',
    name: 'bool',
    isNullable: false,
    sourceLocation: SourceLocationIR(
      id: 'loc_builtin',
      file: 'builtin',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    ),
  );

  TypeIR _createNullType() => SimpleTypeIR(
    id: 'type_null',
    name: 'Null',
    isNullable: true,
    sourceLocation: SourceLocationIR(
      id: 'loc_builtin',
      file: 'builtin',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    ),
  );

  TypeIR _createDynamicType() => DynamicTypeIR(
    id: 'type_dynamic',
    sourceLocation: SourceLocationIR(
      id: 'loc_builtin',
      file: 'builtin',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    ),
  );

  TypeIR _createListType(TypeIR elementType) => SimpleTypeIR(
    id: 'type_list',
    name: 'List<${_extractTypeName(elementType)}>',
    isNullable: false,
    sourceLocation: elementType.sourceLocation,
  );

  TypeIR _createMapType(TypeIR keyType, TypeIR valueType) => SimpleTypeIR(
    id: 'type_map',
    name: 'Map<${_extractTypeName(keyType)},${_extractTypeName(valueType)}>',
    isNullable: false,
    sourceLocation: keyType.sourceLocation,
  );

  TypeIR _createSetType(TypeIR elementType) => SimpleTypeIR(
    id: 'type_set',
    name: 'Set<${_extractTypeName(elementType)}>',
    isNullable: false,
    sourceLocation: elementType.sourceLocation,
  );

  // =========================================================================
  // TYPE CHECKING UTILITIES
  // =========================================================================

  bool _isStringType(TypeIR type) => _extractTypeName(type) == 'String';
  bool _isIntType(TypeIR type) => _extractTypeName(type) == 'int';
  bool _isDoubleType(TypeIR type) => _extractTypeName(type) == 'double';
  bool _isBoolType(TypeIR type) => _extractTypeName(type) == 'bool';

  String _extractTypeName(TypeIR type) {
    if (type is SimpleTypeIR) return type.name;
    if (type is DynamicTypeIR) return 'dynamic';
    if (type is VoidTypeIR) return 'void';
    if (type is NeverTypeIR) return 'Never';
    if (type is NullTypeIR) return 'Null';
    return 'dynamic';
  }

  // =========================================================================
  // SCOPE MANAGEMENT
  // =========================================================================

  void _pushScope() {
    scopeStack.add({});
  }

  void _popScope() {
    if (scopeStack.isNotEmpty) {
      scopeStack.removeLast();
    }
  }

  void _addToCurrentScope(String name, TypeIR type) {
    if (scopeStack.isNotEmpty) {
      scopeStack.last[name] = type;
    }
  }

  // =========================================================================
  // ISSUE REPORTING
  // =========================================================================

  void _addTypeIssue({
    required IssueSeverity severity,
    required String message,
    required SourceLocationIR sourceLocation,
  }) {
    final issueId =
        'type_issue_${inferenceIssues.length}_${DateTime.now().millisecondsSinceEpoch}';
    final issueCode = _generateTypeIssueCode(severity);

    inferenceIssues.add(
      AnalysisIssue(
        id: issueId,
        code: issueCode,
        severity: severity,
        category: IssueCategory.typeError,
        message: message,
        sourceLocation: sourceLocation,
      ),
    );
  }

  String _generateTypeIssueCode(IssueSeverity severity) {
    final severityCode = severity == IssueSeverity.error ? 'E' : 'W';
    return 'TYP$severityCode${inferenceIssues.length.toString().padLeft(4, '0')}';
  }
}

// =========================================================================
// SUPPORTING TYPES
// =========================================================================

class ProviderInfo {
  final String className;
  final ProviderTypeState type;
  final String filePath;
  final ClassDecl declaration;

  ProviderInfo({
    required this.className,
    required this.type,
    required this.filePath,
    required this.declaration,
  });
}

class TypeInferenceInfo {
  /// Cache of inferred types: expression_id -> inferred_type
  final Map<String, TypeIR> typeCache;

  /// Type compatibility relationships
  final Map<String, Set<String>> typeCompatibilityGraph;

  /// Issues found during type inference
  final List<AnalysisIssue> issues;

  TypeInferenceInfo({
    required this.typeCache,
    required this.typeCompatibilityGraph,
    required this.issues,
  });
}

/// Custom type IR classes for type inference
class NullTypeIR extends TypeIR {
  const NullTypeIR({required super.id, required super.sourceLocation})
    : super(name: 'Null', isNullable: true);
}

class NeverTypeIR extends TypeIR {
  const NeverTypeIR({required super.id, required super.sourceLocation})
    : super(name: 'Never', isNullable: false);
}

class UnresolvedTypeIR extends TypeIR {
  final String unresolvedName;

  const UnresolvedTypeIR({
    required super.id,
    required this.unresolvedName,
    required super.sourceLocation,
  }) : super(name: unresolvedName, isNullable: false);
}

class FutureTypeIR extends TypeIR {
  final TypeIR wrappedType;

  const FutureTypeIR({
    required super.id,
    required this.wrappedType,
    required super.sourceLocation,
  }) : super(name: 'Future<>', isNullable: false);
  @override
  String get name => 'Future<${wrappedType.name}>';
}

class StreamTypeIR extends TypeIR {
  final TypeIR wrappedType;

  const StreamTypeIR({
    required super.id,
    required this.wrappedType,
    required super.sourceLocation,
  }) : super(
         name: 'Stream<dynamic>', // Temporary placeholder
         isNullable: false,
       );

  @override
  String get name => 'Stream<${wrappedType.name}>';
}

class FunctionTypeIR extends TypeIR {
  final TypeIR returnType;
  final List<TypeIR> parameterTypes;

  const FunctionTypeIR({
    required super.id,
    required this.returnType,
    required this.parameterTypes,
    required super.sourceLocation,
  }) : super(name: 'Function', isNullable: false);
}

class GenericTypeIR extends TypeIR {
  final String baseTypeName;
  final List<TypeIR> typeArguments;

  const GenericTypeIR({
    required super.id,
    required this.baseTypeName,
    required this.typeArguments,
    required super.sourceLocation,
  }) : super(name: '$baseTypeName<', isNullable: false);

  @override
  String get name =>
      '$baseTypeName<${typeArguments.map((t) => t.name).join(', ')}>';
}

// Extension to DartFile to hold type inference info
extension DartFileTypeInference on DartFile {
  static final _typeInferenceData = <String, TypeInferenceInfo>{};

  TypeInferenceInfo? get typeInferenceInfo => _typeInferenceData[filePath];
  set typeInferenceInfo(TypeInferenceInfo? value) {
    if (value != null) {
      _typeInferenceData[filePath] = value;
    } else {
      _typeInferenceData.remove(filePath);
    }
  }
}
