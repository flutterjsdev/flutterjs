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

  /// Analyze which symbols are used from each import
  Map<String, Set<String>> analyzeUsedSymbols(DartFile dartFile) {
    _buildSymbolMap(dartFile);

    // Scan all code for symbol usage
    for (final cls in dartFile.classDeclarations) {
      _scanClass(cls);
    }

    for (final func in dartFile.functionDeclarations) {
      _scanFunction(func);
    }

    return _symbolsByImport;
  }

  void _buildSymbolMap(DartFile dartFile) {
    for (final import in dartFile.imports) {
      final importUri = import.uri;
      _symbolsByImport.putIfAbsent(importUri, () => {});

      // If explicit show list, track those symbols
      if (import.showList.isNotEmpty) {
        for (final symbol in import.showList) {
          _symbolsByImport[importUri]!.add(symbol);
          _importBySymbol[symbol] = importUri;
        }
      }
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

    // Scan constructors
    for (final ctor in cls.constructors) {
      if (ctor.body != null && ctor.body!.statements.isNotEmpty) {
        _scanStatements(ctor.body!.statements);
      }
      for (final init in ctor.initializers) {
        _scanExpression(init.value);
      }
    }

    // Scan methods
    for (final method in cls.methods) {
      if (method.body != null) {
        _scanStatements(method.body!.statements);
      }
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
        _scanStatements([stmt.body]);
      } else if (stmt is WhileStmt) {
        _scanExpression(stmt.condition);
        _scanStatements([stmt.body]);
      } else if (stmt is BlockStmt) {
        _scanStatements(stmt.statements);
      }
    }
  }

  void _scanExpression(ExpressionIR expr) {
    if (expr is InstanceCreationExpressionIR) {
      // new Uuid() -> track "Uuid"
      final typeName = expr.type.displayName();
      _recordSymbolUsage(typeName);
      for (final arg in expr.arguments) {
        _scanExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _scanExpression(arg);
      }
    } else if (expr is IdentifierExpressionIR) {
      _recordSymbolUsage(expr.name);
    } else if (expr is PropertyAccessExpressionIR) {
      _scanExpression(expr.target);
    } else if (expr is MethodCallExpressionIR) {
      if (expr.target != null) {
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
      if (expr.body != null) {
        _scanExpression(expr.body!);
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
      // Function calls don't have a 'function' property in the IR
      // Skip for now
      for (final arg in expr.arguments) {
        _scanExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _scanExpression(arg);
      }
    }
  }

  void _recordTypeUsage(TypeIR type) {
    final typeName = type.displayName();
    // Strip generics: List<String> -> List
    final baseName = typeName.contains('<')
        ? typeName.substring(0, typeName.indexOf('<'))
        : typeName;
    _recordSymbolUsage(baseName);
  }

  void _recordSymbolUsage(String symbolName) {
    // Skip built-in types and primitives
    if (_isBuiltInType(symbolName)) {
      return;
    }

    // Check if this symbol is from an import
    final importUri = _importBySymbol[symbolName];
    if (importUri != null) {
      _symbolsByImport[importUri]!.add(symbolName);
      return;
    }

    // For imports without explicit show list, try to match the symbol
    // This is a heuristic - in practice we'd need proper symbol resolution
    for (final entry in _symbolsByImport.entries) {
      final importUri = entry.key;
      final symbols = entry.value;

      // If this import already has symbols, skip it
      if (symbols.isNotEmpty) {
        continue;
      }

      // Extract package name from URI
      // package:uuid/uuid.dart -> uuid
      if (importUri.startsWith('package:')) {
        final packageName = importUri.substring(8).split('/').first;
        // If symbol name matches or starts with package name, add it
        if (symbolName.toLowerCase().contains(packageName.toLowerCase()) ||
            packageName.toLowerCase().contains(symbolName.toLowerCase())) {
          symbols.add(symbolName);
          _importBySymbol[symbolName] = importUri;
          return;
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
}
