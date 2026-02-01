// ============================================================================
// Import Analyzer - Symbol Usage Tracking
// ============================================================================
// Analyzes DartFile IR to determine which symbols are actually used from
// each import, enabling minimal named imports in generated JavaScript.
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';

/// Analyzes import usage and tracks which symbols are referenced in code
class ImportAnalyzer {
  final Map<String, Set<String>> _symbolsByImport = {};
  final Map<String, String> _importBySymbol = {};

  final Set<String> _localSymbols = {};

  /// Analyze which symbols are used from each import
  Map<String, Set<String>> analyzeUsedSymbols(DartFile dartFile) {
    _buildSymbolMap(dartFile);
    _collectLocalSymbols(dartFile);

    // Scan all code for symbol usage
    for (final cls in dartFile.classDeclarations) {
      _scanClass(cls);
    }

    for (final func in dartFile.functionDeclarations) {
      _scanFunction(func);
    }

    for (final variable in dartFile.variableDeclarations) {
      _scanVariable(variable);
    }

    return _symbolsByImport;
  }

  void _buildSymbolMap(DartFile dartFile) {
    for (final import in dartFile.imports) {
      final importUri = import.uri;
      _symbolsByImport.putIfAbsent(importUri, () => {});

      // For explicit show list, record which symbols come from this import
      if (import.showList.isNotEmpty) {
        for (final symbol in import.showList) {
          _importBySymbol[symbol] = importUri;
        }
      }
    }
  }

  void _collectLocalSymbols(DartFile dartFile) {
    _localSymbols.clear();
    for (final cls in dartFile.classDeclarations) {
      _localSymbols.add(cls.name);
    }
    for (final func in dartFile.functionDeclarations) {
      _localSymbols.add(func.name);
    }
    for (final variable in dartFile.variableDeclarations) {
      _localSymbols.add(variable.name);
    }
  }

  void _scanClass(ClassDecl cls) {
    // Scan extends/implements
    if (cls.superclass != null) {
      _recordTypeUsage(cls.superclass!);
    }
    for (final interface in cls.interfaces) {
      _recordTypeUsage(interface);
    }
    for (final mixin in cls.mixins) {
      _recordTypeUsage(mixin);
    }

    // Scan constructors
    for (final ctor in cls.constructors) {
      _scanFunction(ctor);
      for (final init in ctor.initializers) {
        _scanExpression(init.value);
      }
    }

    // Scan methods
    for (final method in cls.methods) {
      _scanFunction(method);
    }

    // Scan fields
    for (final field in cls.fields) {
      if (field.initializer != null) {
        _scanExpression(field.initializer!);
      }
      _recordTypeUsage(field.type);
    }
  }

  void _scanFunction(FunctionDecl func) {
    // Scan return type
    if (func.returnType != null) {
      _recordTypeUsage(func.returnType!);
    }

    // Scan parameters
    for (final param in func.parameters) {
      _recordTypeUsage(param.type);
    }

    // Scan body
    if (func.body != null) {
      _scanStatements(func.body!.statements);
    }
  }

  void _scanVariable(VariableDecl variable) {
    _recordTypeUsage(variable.type);
    if (variable.initializer != null) {
      _scanExpression(variable.initializer!);
    }
  }

  void _scanStatements(List<StatementIR> statements) {
    for (final stmt in statements) {
      if (stmt is ExpressionStmt) {
        _scanExpression(stmt.expression);
      } else if (stmt is VariableDeclarationStmt) {
        if (stmt.type != null) {
          _recordTypeUsage(stmt.type!);
        }
        if (stmt.initializer != null) {
          _scanExpression(stmt.initializer!);
        }
      } else if (stmt is ReturnStmt) {
        if (stmt.expression != null) {
          _scanExpression(stmt.expression!);
        }
      } else if (stmt is IfStmt) {
        _scanExpression(stmt.condition);
        _scanStatements([stmt.thenBranch]);
        if (stmt.elseBranch != null) {
          _scanStatements([stmt.elseBranch!]);
        }
      } else if (stmt is ForStmt) {
        if (stmt.initialization != null) {
          _scanExpression(stmt.initialization!);
        }
        if (stmt.condition != null) {
          _scanExpression(stmt.condition!);
        }
        for (final updater in stmt.updaters) {
          _scanExpression(updater);
        }
        _scanStatements([stmt.body]);
      } else if (stmt is ForEachStmt) {
        _scanExpression(stmt.iterable);
        if (stmt.loopVariableType != null) {
          _recordTypeUsage(stmt.loopVariableType!);
        }
        _scanStatements([stmt.body]);
      } else if (stmt is WhileStmt) {
        _scanExpression(stmt.condition);
        _scanStatements([stmt.body]);
      } else if (stmt is DoWhileStmt) {
        _scanStatements([stmt.body]);
        _scanExpression(stmt.condition);
      } else if (stmt is BlockStmt) {
        _scanStatements(stmt.statements);
      } else if (stmt is TryStmt) {
        _scanStatements([stmt.tryBlock]);
        for (final clause in stmt.catchClauses) {
          if (clause.exceptionType != null) {
            _recordTypeUsage(clause.exceptionType!);
          }
          _scanStatements([clause.body]);
        }
        if (stmt.finallyBlock != null) {
          _scanStatements([stmt.finallyBlock!]);
        }
      } else if (stmt is SwitchStmt) {
        _scanExpression(stmt.expression);
        for (final caseStmt in stmt.cases) {
          if (caseStmt.patterns != null) {
            for (final p in caseStmt.patterns!) {
              _scanExpression(p);
            }
          }
          _scanStatements(caseStmt.statements);
        }
        if (stmt.defaultCase != null) {
          _scanStatements(stmt.defaultCase!.statements);
        }
      } else if (stmt is ThrowStmt) {
        _scanExpression(stmt.exceptionExpression);
      } else if (stmt is AssertStatementIR) {
        _scanExpression(stmt.condition);
        if (stmt.message != null) {
          _scanExpression(stmt.message!);
        }
      } else if (stmt is YieldStatementIR) {
        _scanExpression(stmt.value);
      } else if (stmt is FunctionDeclarationStatementIR) {
        _scanFunction(stmt.function);
      } else if (stmt is LabeledStatementIR) {
        _scanStatements([stmt.statement]);
      }
    }
  }

  void _scanExpression(ExpressionIR expr) {
    if (expr is ConstructorCallExpressionIR) {
      _recordSymbolUsage(expr.className, libraryUri: expr.resolvedLibraryUri);
      for (final arg in expr.positionalArguments) {
        // Fix: use positionalArguments
        _scanExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _scanExpression(arg);
      }
      // Note: ignoring namedArgumentsDetailed for scan as values are covered
    } else if (expr is InstanceCreationExpressionIR) {
      // Legacy/Alternate IR
      _recordTypeUsage(expr.type);
      for (final arg in expr.arguments) {
        _scanExpression(arg);
      }
      if (expr.namedArguments.isNotEmpty) {
        for (final arg in expr.namedArguments.values) {
          _scanExpression(arg);
        }
      }
    } else if (expr is IdentifierExpressionIR) {
      _recordSymbolUsage(expr.name, libraryUri: expr.resolvedLibraryUri);
    } else if (expr is PropertyAccessExpressionIR) {
      _scanExpression(expr.target);
    } else if (expr is MethodCallExpressionIR) {
      // Check resolved URI for the method (if it's a top-level function call masquerading or static method)
      // Usually methods belong to the target, but if target is null, it's a function call
      if (expr.target == null) {
        _recordSymbolUsage(
          expr.methodName,
          libraryUri: expr.resolvedLibraryUri,
        );
      } else {
        _scanExpression(expr.target!);
      }
      for (final arg in expr.arguments) {
        _scanExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _scanExpression(arg);
      }
    } else if (expr is BinaryExpressionIR) {
      _scanExpression(expr.left);
      _scanExpression(expr.right);
    } else if (expr is UnaryExpressionIR) {
      _scanExpression(expr.operand);
    } else if (expr is ConditionalExpressionIR) {
      _scanExpression(expr.condition);
      _scanExpression(expr.thenExpression);
      _scanExpression(expr.elseExpression);
    } else if (expr is ListExpressionIR) {
      for (final element in expr.elements) {
        _scanExpression(element);
      }
    } else if (expr is MapExpressionIR) {
      for (final element in expr.elements) {
        _scanExpression(element);
      }
    } else if (expr is MapEntryIR) {
      _scanExpression(expr.key);
      _scanExpression(expr.value);
    } else if (expr is LambdaExpr) {
      for (final param in expr.parameters) {
        _recordTypeUsage(param.type);
      }
      if (expr.body != null) {
        _scanExpression(expr.body!);
      }
      if (expr.blockBody != null) {
        _scanStatements(expr.blockBody!);
      }
    } else if (expr is CastExpressionIR) {
      _scanExpression(expr.expression);
      _recordTypeUsage(expr.targetType);
    } else if (expr is TypeCheckExpr) {
      _scanExpression(expr.expression);
      _recordTypeUsage(expr.typeToCheck);
    } else if (expr is IsExpressionIR) {
      _scanExpression(expr.expression);
      _recordTypeUsage(expr.targetType);
    } else if (expr is IndexAccessExpressionIR) {
      _scanExpression(expr.target);
      _scanExpression(expr.index);
    } else if (expr is AssignmentExpressionIR) {
      _scanExpression(expr.target);
      _scanExpression(expr.value);
    } else if (expr is CompoundAssignmentExpressionIR) {
      _scanExpression(expr.target);
      _scanExpression(expr.value);
    } else if (expr is NullCoalescingExpressionIR) {
      _scanExpression(expr.left);
      _scanExpression(expr.right);
    } else if (expr is NullAwareAccessExpressionIR) {
      _scanExpression(expr.target);
    } else if (expr is StringInterpolationExpressionIR) {
      for (final part in expr.parts) {
        if (part.isExpression && part.expression != null) {
          _scanExpression(part.expression!);
        }
      }
    } else if (expr is FunctionCallExpr) {
      _recordSymbolUsage(expr.functionName, libraryUri: expr.resolvedLibraryUri);
      for (final arg in expr.arguments) {
        _scanExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _scanExpression(arg);
      }
      for (final typeArg in expr.typeArguments) {
        _recordTypeUsage(typeArg);
      }
    } else if (expr is ConstructorCallExpr) {
      _recordSymbolUsage(expr.className);
      for (final arg in expr.arguments) {
        _scanExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _scanExpression(arg);
      }
      for (final typeArg in expr.typeArguments) {
        _recordTypeUsage(typeArg);
      }
    } else if (expr is UnknownExpressionIR) {
       _scanUnknownExpression(expr);
    }
  }

  void _scanUnknownExpression(UnknownExpressionIR expr) {
    if (expr.source == null) return;
    final source = expr.source!;

    // 1. Detect Dart 3 Pattern Matching: "case Type("
    // e.g. "response case BaseResponseWithUrl(: final url)"
    final patternRegex = RegExp(r'case\s+([A-Z]\w*)');
    final patternMatches = patternRegex.allMatches(source);
    for (final match in patternMatches) {
      _recordSymbolUsage(match.group(1)!);
    }

    // 2. Detect generic type usages in raw strings: "<Type>"
    final genericRegex = RegExp(r'<([A-Z]\w*)>');
    final genericMatches = genericRegex.allMatches(source);
    for (final match in genericMatches) {
      _recordSymbolUsage(match.group(1)!);
    }

    // 3. Detect static access or constructors: "Type." or "Type("
    // Simple heuristic: Uppercase words
    final wordRegex = RegExp(r'\b([A-Z]\w*)\b');
    final wordMatches = wordRegex.allMatches(source);
    for (final match in wordMatches) {
      final word = match.group(1)!;
      // Filter out likely keywords or non-types (Basic filter)
      if (word != 'Future' && word != 'Stream' && word != 'List' && word != 'Map') {
         _recordSymbolUsage(word);
      }
    }
  } // End _scanUnknownExpression

  void _recordTypeUsage(TypeIR type) {
    if (type is ClassTypeIR) {
      _recordSymbolUsage(type.className, libraryUri: type.libraryUri);
      for (final arg in type.typeArguments) {
        _recordTypeUsage(arg);
      }
      return;
    }

    if (type is FunctionTypeIR) {
      _recordTypeUsage(type.returnType);
      for (final param in type.parameters) {
        _recordTypeUsage(param.type);
      }
      return;
    }

    final typeName = type.displayName();
    // Strip generics: List<String> -> List
    final baseName = typeName.contains('<')
        ? typeName.substring(0, typeName.indexOf('<'))
        : typeName;
    _recordSymbolUsage(baseName);
  }

  void _recordSymbolUsage(String symbolName, {String? libraryUri}) {
    // Skip built-in types and primitives
    if (_isBuiltInType(symbolName)) {
      return;
    }

    // Skip local symbols (defined in this file)
    if (_localSymbols.contains(symbolName)) {
      return;
    }

    // 1. Direct libraryUri match
    if (libraryUri != null) {
      if (_symbolsByImport.containsKey(libraryUri)) {
        _symbolsByImport[libraryUri]!.add(symbolName);
        _importBySymbol[symbolName] = libraryUri;
        return;
      }
      // Try to find a matching import (e.g. relative vs package)
      for (final importUri in _symbolsByImport.keys) {
        // 1. Exact or suffix match
        if (importUri == libraryUri ||
            (importUri.startsWith('package:') &&
                libraryUri.startsWith('package:') &&
                importUri == libraryUri) ||
            libraryUri.endsWith(importUri) ||
            importUri.endsWith(libraryUri)) {
          _symbolsByImport[importUri]!.add(symbolName);
          _importBySymbol[symbolName] = importUri;
          return;
        }

        // 2. Package-level match (e.g. package:http/src/client.dart -> package:http/http.dart)
        if (importUri.startsWith('package:') &&
            libraryUri.startsWith('package:')) {
          final importPkg = _getPackageName(importUri);
          final libPkg = _getPackageName(libraryUri);
          if (importPkg != null && importPkg == libPkg) {
            _symbolsByImport[importUri]!.add(symbolName);
            _importBySymbol[symbolName] = importUri;
            return;
          }
        }
      }
    }

    // 2. Check if this symbol is already mapped
    final importUri = _importBySymbol[symbolName];
    if (importUri != null) {
      _symbolsByImport[importUri]!.add(symbolName);
      return;
    }

    // 3. Heuristic matching
    final symLower = symbolName.toLowerCase();

    // Priority 1: Exact filename match (e.g. 'Client' matches '.../client.dart')
    for (final entry in _symbolsByImport.entries) {
      final importUri = entry.key;
      final fileName = importUri.split('/').last.split('.').first.toLowerCase();
      if (symLower == fileName) {
        entry.value.add(symbolName);
        _importBySymbol[symbolName] = importUri;
        return;
      }
    }

    // Priority 2: Partial path match (for things like 'BaseResponse' matching 'src/response.dart')
    for (final entry in _symbolsByImport.entries) {
      final importUri = entry.key;
      final symbols = entry.value;

      String matchPath = _normalizeUri(importUri);
      if (matchPath.startsWith('package:')) {
        matchPath = matchPath.substring(8);
      } else if (matchPath.startsWith('dart:')) {
        matchPath = matchPath.substring(5);
      }

      if (matchPath.endsWith('.dart')) {
        matchPath = matchPath.substring(0, matchPath.length - 5);
      }

      final parts = matchPath.toLowerCase().split(RegExp(r'[/_]'));
      for (final part in parts) {
        if (part.isNotEmpty &&
            (symLower.contains(part) || part.contains(symLower))) {
          symbols.add(symbolName);
          _importBySymbol[symbolName] = importUri;
          return;
        }
      }
    }

    // Check known symbols for common Dart libraries
    _checkKnownSymbols(symbolName);
  }

  void _checkKnownSymbols(String symbol) {
    const knownSymbols = {
      'dart:convert': {
        'jsonDecode',
        'jsonEncode',
        'utf8',
        'base64',
        'Latin1',
        'Codec',
        'Converter',
        'Encoding',
      },
      'dart:math': {
        'Random',
        'Point',
        'Rectangle',
        'max',
        'min',
        'sqrt',
        'sin',
        'cos',
        'pi',
        'e',
      },
      'dart:async': {'Future', 'Stream', 'Completer', 'Timer', 'Zone'},
      'dart:typed_data': {'Uint8List', 'Int8List', 'ByteData', 'ByteBuffer'},
    };

    for (final entry in knownSymbols.entries) {
      final libUrl = entry.key;
      final symbols = entry.value;

      if (symbols.contains(symbol)) {
        // Find matching import
        for (final importUri in _symbolsByImport.keys) {
          if (importUri == libUrl || importUri.endsWith(libUrl)) {
            _symbolsByImport[importUri]!.add(symbol);
            _importBySymbol[symbol] = importUri;
            return;
          }
        }
      }
    }
  }

  bool _isBuiltInType(String typeName) {
    const builtInTypes = {
      'void',
      'dynamic',
      'Object',
      'int',
      'double',
      'num',
      'bool',
      'String',
      'List',
      'Map',
      'Set',
      'Iterable',
      'Iterator',
      'Future',
      'Stream',
      'Function',
      'Symbol',
      'Type',
      'Null',
      'Never',
    };
    return builtInTypes.contains(typeName);
  }

  String _normalizeUri(String uri) {
    if (uri.startsWith('./')) return uri.substring(2);
    return uri;
  }

  String? _getPackageName(String uri) {
    if (!uri.startsWith('package:')) return null;
    final parts = uri.split('/');
    // return 'package:name'
    return parts.first;
  }
}
