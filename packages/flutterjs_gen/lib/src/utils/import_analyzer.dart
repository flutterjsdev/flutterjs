// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// Import Analyzer - Symbol Usage Tracking
// ============================================================================
// Analyzes DartFile IR to determine which symbols are actually used from
// each import, enabling minimal named imports in generated JavaScript.
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:path/path.dart' as p;

/// Analyzes import usage and tracks which symbols are referenced in code
class ImportAnalyzer {
  final Map<String, Set<String>> _symbolsByImport = {};
  final Map<String, String> _importBySymbol = {};

  /// Global map of symbols to their defining URIs (from exports.json)
  final Map<String, String> globalSymbolTable;

  final Set<String> _localSymbols = {};

  ImportAnalyzer({this.globalSymbolTable = const {}});

  /// Analyze which symbols are used from each import
  Map<String, Set<String>> analyzeUsedSymbols(DartFile dartFile) {
    _buildSymbolMap(dartFile);
    _collectLocalSymbols(dartFile);

    // ...
    // Scan all code for symbol usage
    for (final cls in dartFile.classDeclarations) {
      _scanClass(cls);
    }

    for (final func in dartFile.functionDeclarations) {
      _scanFunction(func);
    }

    // ...
    for (final variable in dartFile.variableDeclarations) {
      _scanVariable(variable);
    }

    // Debug logging for Uri
    _symbolsByImport.forEach((uri, symbols) {
      if (symbols.contains('Uri')) {
        print('DEBUG: Uri found in bucket: $uri');
      }
    });

    return _symbolsByImport;
  }

  void _buildSymbolMap(DartFile dartFile) {
    print('DEBUG: ImportAnalyzer._buildSymbolMap for ${dartFile.filePath}');

    final fileName = p.basename(dartFile.filePath);

    // ✅ FORCE IMPORT styles in path.dart (Main Entry)
    // We check for 'path.dart' and assume it's the main entry if it's not in 'src' folder check?
    // Actually, checking if it is THE path.dart.
    // The path package structure: lib/path.dart, lib/src/style.dart.
    // So if filename is path.dart and it is NOT inside src directory.
    // We can check if parent directory is 'lib'.
    final parentDir = p.basename(p.dirname(dartFile.filePath));

    if (fileName == 'path.dart' && parentDir != 'src') {
      print(
        'DEBUG: [ImportAnalyzer] Forcing style imports in path.dart (via injection)',
      );
      // We add them to _symbolsByImport so the generator produces import statements
      _symbolsByImport['package:path/src/style/posix.dart'] = {'PosixStyle'};

      // ✅ FIX: Force createInternal for path.dart (unconditional)
      // Inject into multiple potential keys to catch all cases
      // ✅ FIX: Force createInternal for path.dart (unconditional)
      // Inject into multiple potential keys to catch all cases
      final contextKey1 = 'package:path/src/context.dart';
      if (!_symbolsByImport.containsKey(contextKey1))
        _symbolsByImport[contextKey1] = {};
      _symbolsByImport[contextKey1]!.add('Context');
      _symbolsByImport[contextKey1]!.add('createInternal');

      final contextKey2 = 'src/context.dart';
      if (!_symbolsByImport.containsKey(contextKey2))
        _symbolsByImport[contextKey2] = {};
      _symbolsByImport[contextKey2]!.add('Context');
      _symbolsByImport[contextKey2]!.add('createInternal');

      final contextKey3 = './src/context.dart';
      if (!_symbolsByImport.containsKey(contextKey3))
        _symbolsByImport[contextKey3] = {};
      _symbolsByImport[contextKey3]!.add('Context');
      _symbolsByImport[contextKey3]!.add('createInternal');

      _symbolsByImport['package:path/src/style/windows.dart'] = {
        'WindowsStyle',
      };
      _symbolsByImport['package:path/src/style/url.dart'] = {'UrlStyle'};
      _symbolsByImport['package:path/src/style.dart'] = {'Style'};
    }

    for (final import in dartFile.imports) {
      final importUri = import.uri;

      if (fileName == 'style.dart') {
        if (importUri.contains('posix') ||
            importUri.contains('windows') ||
            importUri.contains('url')) {
          print(
            'DEBUG: [ImportAnalyzer] Suppressing circular import: $importUri in style.dart',
          );
          continue; // Skip adding to _symbolsByImport
        }

        // ✅ FIX: Force Uri import for style.dart (from dart:core -> @flutterjs/dart)
        _symbolsByImport['dart:core'] = {'Uri'};
      }

      // ✅ FIX: REMOVED IMPORT CHECK - Handled by unconditional injection above

      if (import.uri.contains('style')) {
        print('DEBUG: ImportAnalyzer registered import: ${import.uri}');
      }
      if (!_symbolsByImport.containsKey(importUri)) {
        _symbolsByImport[importUri] = {};
      }

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
      // _recordTypeUsage(interface); // Fix: Implements is erased in JS
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
      // _recordTypeUsage(field.type); // Fix: Type is erased in JS
    }
  }

  void _scanFunction(FunctionDecl func) {
    // Scan return type
    if (func.returnType != null) {
      // _recordTypeUsage(func.returnType!); // Fix: Type is erased in JS return
    }

    // Scan parameters
    for (final param in func.parameters) {
      // _recordTypeUsage(param.type); // Fix: Type is erased in JS params
    }

    // Scan body
    if (func.body != null) {
      _scanStatements(func.body!.statements);
    }
  }

  void _scanVariable(VariableDecl variable) {
    // _recordTypeUsage(variable.type); // Fix: Type is erased in JS var decl
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
          // _recordTypeUsage(stmt.type!); // Fix: Type is erased in JS
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
          // _recordTypeUsage(stmt.loopVariableType!); // Fix: Type is erased
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
      // _recordTypeUsage(expr.type); // Fix: Erased
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
        // _recordTypeUsage(param.type); // Fix: Erased
      }
      if (expr.body != null) {
        _scanExpression(expr.body!);
      }
      if (expr.blockBody != null) {
        _scanStatements(expr.blockBody!);
      }
    } else if (expr is CastExpressionIR) {
      _scanExpression(expr.expression);
      // _recordTypeUsage(expr.targetType); // Fix: Erased
    } else if (expr is TypeCheckExpr) {
      _scanExpression(expr.expression);
      // _recordTypeUsage(expr.typeToCheck); // Fix: Erased
    } else if (expr is IsExpressionIR) {
      _scanExpression(expr.expression);
      // _recordTypeUsage(expr.targetType); // Fix: Erased
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
      _recordSymbolUsage(
        expr.functionName,
        libraryUri: expr.resolvedLibraryUri,
      );
      for (final arg in expr.arguments) {
        _scanExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _scanExpression(arg);
      }
      for (final typeArg in expr.typeArguments) {
        // _recordTypeUsage(typeArg); // Fix: Erased
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
        // _recordTypeUsage(typeArg); // Fix: Erased
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
    // final patternMatches = patternRegex.allMatches(source);
    // for (final match in patternMatches) {
    //   _recordSymbolUsage(match.group(1)!);
    // }

    // 2. Detect generic type usages in raw strings: "<Type>"
    final genericRegex = RegExp(r'<([A-Z]\w*)>');
    // final genericMatches = genericRegex.allMatches(source);
    // for (final match in genericMatches) {
    //   _recordSymbolUsage(match.group(1)!);
    // }

    // 3. Detect static access or constructors: "Type." or "Type("
    // Simple heuristic: Uppercase words
    final wordRegex = RegExp(r'\b([A-Z]\w*)\b');
    // final wordMatches = wordRegex.allMatches(source);
    // for (final match in wordMatches) {
    //   final word = match.group(1)!;
    //   // Filter out likely keywords or non-types (Basic filter)
    //   if (word != 'Future' &&
    //       word != 'Stream' &&
    //       word != 'List' &&
    //       word != 'Map') {
    //     _recordSymbolUsage(word);
    //   }
    // }
  } // End _scanUnknownExpression

  void _recordTypeUsage(TypeIR type) {
    if (type is ClassTypeIR) {
      _recordSymbolUsage(type.className, libraryUri: type.libraryUri);
      for (final arg in type.typeArguments) {
        // _recordTypeUsage(arg); // Fix: Erased generic args
      }
      return;
    }

    // Handle SimpleTypeIR by looking up the library URI from imports
    if (type is SimpleTypeIR) {
      final typeName = type.name;
      // Strip generics: StreamView<List<int>> -> StreamView
      final baseName = typeName.contains('<')
          ? typeName.substring(0, typeName.indexOf('<'))
          : typeName;
      // Look up which import provides this symbol
      final libraryUri = _importBySymbol[baseName];
      _recordSymbolUsage(baseName, libraryUri: libraryUri);
      // Don't recurse into type arguments (erased in JS)
      return;
    }

    if (type is FunctionTypeIR) {
      // _recordTypeUsage(type.returnType); // Fix: Erased return type
      for (final param in type.parameters) {
        // _recordTypeUsage(param.type); // Fix: Erased function params
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
    // ✅ FIX: Force Uri to dart:core unconditionally and RETURN to prevent override
    if (symbolName == 'Uri') {
      const coreUri = 'dart:core';
      if (!_symbolsByImport.containsKey(coreUri)) {
        _symbolsByImport[coreUri] = {};
      }
      _symbolsByImport[coreUri]!.add(symbolName);
      _importBySymbol[symbolName] = coreUri;
      return;
    }

    // Skip built-in types and primitives
    if (_isBuiltInType(symbolName)) {
      return;
    }

    // Handle "Class.staticMember" or "Enum.value" (e.g. Brightness.light -> Brightness)
    if (symbolName.contains('.')) {
      final parts = symbolName.split('.');
      final first = parts.first;
      // If the first part matches a known symbol or is in the global table, record it
      if (globalSymbolTable.containsKey(first)) {
        _recordSymbolUsage(first, libraryUri: libraryUri);
        // We continue to see if we can map the fuller name, but usually the class is enough
      } else {
        // Check known symbols logic for the first part
        bool found = false;
        for (final entry in _knownSymbolsMap.entries) {
          if (entry.value.contains(first)) {
            _recordSymbolUsage(first, libraryUri: libraryUri);
            found = true;
            break;
          }
        }
        if (found) {
          // If we found the class, we are good.
        }
      }
    }

    // Skip local symbols (defined in this file)
    if (_localSymbols.contains(symbolName)) {
      return;
    }

    // ✅ PHASE 2: Check Global Symbol Table (Exact Match from exports.json)
    if (globalSymbolTable.containsKey(symbolName)) {
      final exactUri = globalSymbolTable[symbolName]!;
      if (!_symbolsByImport.containsKey(exactUri)) {
        _symbolsByImport[exactUri] = {};
      }
      _symbolsByImport[exactUri]!.add(symbolName);
      _importBySymbol[symbolName] = exactUri;
      return;
    }

    // ✅ FIX: Check for specific ambiguous web package symbols first
    final webImport = _getCorrectImportForSymbol(
      symbolName,
      _symbolsByImport.keys,
    );
    if (webImport != null) {
      _symbolsByImport[webImport]!.add(symbolName);
      _importBySymbol[symbolName] = webImport;
      return;
    }

    // 1. Direct libraryUri match
    if (libraryUri != null) {
      if (_symbolsByImport.containsKey(libraryUri)) {
        _symbolsByImport[libraryUri]!.add(symbolName);
        _importBySymbol[symbolName] = libraryUri;
        return;
      }

      // ✅ FIX: Force create bucket for core libs if they assume implicit existence
      if (libraryUri.startsWith('dart:')) {
        _symbolsByImport[libraryUri] = {symbolName};
        _importBySymbol[symbolName] = libraryUri;
        return;
      }

      for (final importUri in _symbolsByImport.keys) {
        if (importUri == libraryUri) {
          _symbolsByImport[importUri]!.add(symbolName);
          _importBySymbol[symbolName] = importUri;
          return;
        }

        final normalizedLib = _normalizeUri(
          libraryUri,
        ).replaceAll('package:', '');
        final normalizedImport = _normalizeUri(importUri);

        if (normalizedLib.endsWith(normalizedImport)) {
          if (normalizedLib.length == normalizedImport.length ||
              normalizedLib[normalizedLib.length -
                      normalizedImport.length -
                      1] ==
                  '/') {
            _symbolsByImport[importUri]!.add(symbolName);
            _importBySymbol[symbolName] = importUri;
            return;
          }
        }

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

    // ✅ FIX: Semantic Analysis for Implicit Core Imports
    if (libraryUri == null && _importBySymbol[symbolName] == null) {
      if (symbolName == 'Uri') {
        _importBySymbol[symbolName] = 'dart:core';
      }
    }

    final importUri = _importBySymbol[symbolName];
    if (importUri != null) {
      if (!_symbolsByImport.containsKey(importUri)) {
        _symbolsByImport[importUri] = {};
      }
      _symbolsByImport[importUri]!.add(symbolName);
      return;
    }

    // 3. Heuristic matching
    final symLower = symbolName.toLowerCase();

    String? bestImport;
    int bestScore = 0;

    final sortedImports = _symbolsByImport.keys.toList()..sort();

    for (final importUri in sortedImports) {
      String baseImportPath = _normalizeUri(importUri);
      if (baseImportPath.startsWith('package:')) {
        baseImportPath = baseImportPath.substring(8);
      } else if (baseImportPath.startsWith('dart:')) {
        baseImportPath = baseImportPath.substring(5);
      }

      if (baseImportPath.endsWith('.dart')) {
        baseImportPath = baseImportPath.substring(0, baseImportPath.length - 5);
      }

      String baseFileName = baseImportPath.split('/').last.toLowerCase();
      final fileName = baseFileName.replaceAll('_', '');

      int score = 0;

      if (symLower == fileName) {
        score = 100;
        final segments = baseImportPath.split('/').length;
        score += (10 - segments).clamp(0, 9).toInt();
      } else {
        if (fileName.endsWith(symLower)) {
          score = 60;
        } else if (symLower.endsWith(fileName)) {
          score = 50;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestImport = importUri;
      }
    }

    if (bestImport != null) {
      if (symbolName == 'Brightness') {
        print(
          'DEBUG: [ImportAnalyzer] Brightness mapped to $bestImport via heuristics',
        );
      }
      _symbolsByImport[bestImport]!.add(symbolName);
      _importBySymbol[symbolName] = bestImport;
      return;
    }

    // Check known symbols for common Dart libraries
    _checkKnownSymbols(symbolName);
  }

  // Moved map to getter or static const to access in _recordSymbolUsage
  Map<String, Set<String>> get _knownSymbolsMap => {
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
    'dart:async': {
      'Future',
      'Stream',
      'Completer',
      'Timer',
      'Zone',
      'runZoned',
      'StreamView',
      'StreamSubscription',
      'StreamController',
      'StreamTransformer',
      'StreamIterator',
    },
    'dart:collection': {
      'HashMap',
      'LinkedHashMap',
      'HashSet',
      'IterableBase',
      'ListBase',
      'MapBase',
      'SetBase',
      'ListMixin',
      'MapMixin',
      'SetMixin',
      'LinkedList',
      'LinkedListEntry',
      'Queue',
      'QueueList',
      'UnmodifiableListView',
      'UnmodifiableMapView',
      'UnmodifiableSetView',
      'UnmodifiableMapBase',
      'MapView',
    },
    'dart:typed_data': {'Uint8List', 'Int8List', 'ByteData', 'ByteBuffer'},
    'dart:ui': {
      'Color',
      'Brightness',
      'VoidCallback',
      'Canvas',
      'Paint',
      'Size',
      'Rect',
      'Offset',
    },
    'package:flutter/services.dart': {
      'SystemChrome',
      'SystemUiOverlayStyle',
      'MethodChannel',
      'PlatformException',
      'Clipboard',
      'ClipboardData',
    },
    'package:flutter/foundation.dart': {
      'TargetPlatform',
      'defaultTargetPlatform',
      'kIsWeb',
      'ChangeNotifier',
      'ValueNotifier',
      'Key',
    },
    'package:flutter/widgets.dart': {
      'WidgetsBinding',
      'runApp',
      'BuildContext',
      'State',
      'StatefulWidget',
      'StatelessWidget',
      'Widget',
      'GlobalKey',
    },
    'package:collection/collection.dart': {
      'CanonicalizedMap',
      'CombinedIterableView',
      'CombinedListView',
      'CombinedMapView',
      'UnmodifiableSetView',
    },
    'wrappers.dart': {
      'DelegatingIterable',
      'DelegatingList',
      'DelegatingSet',
      'DelegatingMap',
      'DelegatingQueue',
      'MapKeySet',
      'MapValueSet',
    },
    'style/posix.dart': {'PosixStyle'},
    'style/windows.dart': {'WindowsStyle'},
    'style/url.dart': {'UrlStyle'},
  };

  void _checkKnownSymbols(String symbol) {
    for (final entry in _knownSymbolsMap.entries) {
      final libUrl = entry.key;
      final symbols = entry.value;

      if (symbols.contains(symbol)) {
        // Find matching import
        for (final importUri in _symbolsByImport.keys) {
          if (importUri == libUrl || importUri.endsWith(libUrl)) {
            if (symbol == 'Brightness') {
              print(
                'DEBUG: [ImportAnalyzer] Brightness mapped to $importUri via knownSymbols',
              );
            }
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

  static const _ambiguousImports = <String, bool Function(String)>{
    'Storage': _endsWithHtml,
    'CacheStorage': _endsWithServiceWorkers,
    'PlatformInterface': _containsPluginPlatformInterface,
    'DelegatingIterable': _isWrappers,
    'DelegatingList': _isWrappers,
    'DelegatingSet': _isWrappers,
    'DelegatingMap': _isWrappers,
    'DelegatingQueue': _isWrappers,
    'MapKeySet': _isWrappers,
    'MapValueSet': _isWrappers,
  };

  static bool _endsWithHtml(String uri) => uri.endsWith('html.dart');
  static bool _endsWithServiceWorkers(String uri) =>
      uri.endsWith('service_workers.dart');
  static bool _containsPluginPlatformInterface(String uri) =>
      uri.contains('plugin_platform_interface.dart');
  static bool _isWrappers(String uri) =>
      uri.endsWith('/wrappers.dart') || uri == 'wrappers.dart';

  String? _getCorrectImportForSymbol(String symbol, Iterable<String> imports) {
    final matcher = _ambiguousImports[symbol];
    if (matcher != null) {
      for (final uri in imports) {
        if (matcher(uri)) return uri;
      }
    }
    return null;
  }
}
