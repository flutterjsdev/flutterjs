// ============================================================================
// PHASE 4: ADVANCED FILE-LEVEL GENERATION WITH ASYNC SAFETY
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'dart:io';
import 'package:flutterjs_gen/src/file_generation/runtime_requirements.dart';
import '../widget_generation/stateless_widget/stateless_widget_js_code_gen.dart';
import '../utils/indenter.dart';
import '../code_generation/enum/enum_code_generator.dart';
import 'import_resolver.dart';
import 'package_manifest.dart';

class FileCodeGen {
  final ExpressionCodeGen exprCodeGen;
  final StatementCodeGen stmtCodeGen;
  final ClassCodeGen classCodeGen;
  final FunctionCodeGen funcCodeGen;
  final FlutterPropConverter propConverter;
  final RuntimeRequirements runtimeRequirements;
  final OutputValidator? outputValidator;
  final JSOptimizer? jsOptimizer;
  final PackageRegistry packageRegistry;

  /// Compilation target: 'web' (Flutter/browser) or 'node' (Node.js).
  /// When 'node', Flutter/material/services imports are skipped entirely.
  final String target;

  late Indenter indenter;

  late Set<String> usedWidgets;
  late Set<String> usedHelpers;
  late Set<String> usedTypes;
  late Set<String> usedFunctions; // ✅ NEW: Track top-level function calls
  late Set<String> definedNames; // ✅ NEW: Track locally defined names
  late Map<String, List<String>> classDependencies;

  late ValidationReport? validationReport;
  late String? optimizedCode;
  final List<String> generationWarnings = [];

  // ✅ NEW: Thread-safe lock for buffer operations
  late final _lock = Mutex();

  FileCodeGen({
    ExpressionCodeGen? exprCodeGen,
    StatementCodeGen? stmtCodeGen,
    ClassCodeGen? classCodeGen,
    FunctionCodeGen? funcCodeGen,
    FlutterPropConverter? propConverter,
    RuntimeRequirements? runtimeRequirements,
    PackageRegistry? packageRegistry,
    this.outputValidator,
    this.jsOptimizer,
    this.target = 'web',
  }) : exprCodeGen = exprCodeGen ?? ExpressionCodeGen(),
       stmtCodeGen = stmtCodeGen ?? StatementCodeGen(),
       classCodeGen = classCodeGen ?? ClassCodeGen(),
       funcCodeGen = funcCodeGen ?? FunctionCodeGen(),
       propConverter = propConverter ?? FlutterPropConverter(),
       runtimeRequirements = runtimeRequirements ?? RuntimeRequirements(),
       packageRegistry = packageRegistry ?? PackageRegistry() {
    indenter = Indenter('  ');
    usedWidgets = {};
    usedHelpers = {};
    usedTypes = {};
    usedFunctions = {};
    definedNames = {};
    classDependencies = {};
  }

  // =========================================================================
  // MAIN GENERATION WITH ASYNC SAFETY
  // =========================================================================
  Future<String> generate(
    DartFile dartFile, {
    bool validate = true,
    bool optimize = false,
    int optimizationLevel = 1,
  }) async {
    try {
      try {
        final f = File('DEBUG_GEN.txt');
        f.writeAsStringSync(
          'FileCodeGen.generate called for ${dartFile.package}/${dartFile.library}\n',
          mode: FileMode.append,
        );
      } catch (_) {}

      if (dartFile.package == 'term_glyph' ||
          (dartFile.library ?? '').contains('term_glyph')) {
        throw 'DEBUG EXCEPTION: PROCESSING TERM_GLYPH';
      }

      // Step 1: Analyze file (can be async)
      await _analyzeFileAsync(dartFile);

      // Step 2: Generate code with proper async/await
      var generatedCode = await _generateCodeAsync(dartFile);

      // Step 3: VALIDATE
      if (validate) {
        generatedCode = await _performValidationAsync(generatedCode, dartFile);
      }

      // Step 4: OPTIMIZE
      if (optimize) {
        generatedCode = await _performOptimizationAsync(
          generatedCode,
          optimizationLevel,
        );
      }

      return generatedCode;
    } catch (e, stack) {
      print('❌ ERROR generating ${dartFile.library}: $e\n$stack');
      return _generateErrorOutput(e);
    }
  }

  // =========================================================================
  // ASYNC FILE ANALYSIS
  // =========================================================================

  Future<void> _analyzeFileAsync(DartFile dartFile) async {
    await _lock.protect(() async {
      usedWidgets.clear();
      usedHelpers.clear();
      usedTypes.clear();
      usedFunctions.clear();
      definedNames.clear();
      classDependencies.clear();
    });

    // Analyze enums
    for (final enumDecl in dartFile.enumDeclarations) {
      await _lock.protect(() async {
        definedNames.add(enumDecl.name);
      });
    }

    // Analyze classes
    for (final cls in dartFile.classDeclarations) {
      await _lock.protect(() async {
        definedNames.add(cls.name);
      });
      await _analyzeClassAsync(cls);
    }

    // Analyze functions
    for (final func in dartFile.functionDeclarations) {
      await _lock.protect(() async {
        definedNames.add(func.name);
      });
      await _analyzeFunctionAsync(func);
    }

    // Analyze variables
    for (final variable in dartFile.variableDeclarations) {
      _analyzeExpression(variable.initializer);
      await _lock.protect(() async {
        definedNames.add(variable.name);
        usedTypes.add(variable.type.displayName());
      });
    }

    // Analyze runtime requirements
    await runtimeRequirements.analyzeAsync(dartFile);
    await _lock.protect(() async {
      usedHelpers.addAll(runtimeRequirements.getRequiredHelpers());
    });
  }

  Future<void> _analyzeClassAsync(ClassDecl cls) async {
    await _lock.protect(() async {
      if (cls.superclass != null) {
        final parentName = cls.superclass!.displayName();
        classDependencies.putIfAbsent(cls.name, () => []).add(parentName);
      }

      for (final iface in cls.interfaces) {
        classDependencies
            .putIfAbsent(cls.name, () => [])
            .add(iface.displayName());
      }

      for (final field in cls.instanceFields) {
        usedTypes.add(field.type.displayName());
        if (field.initializer != null) {
          _analyzeExpression(field.initializer);
        }
      }
    });

    for (final method in cls.methods) {
      if (method.body != null) {
        for (final stmt in method.body!.statements) {
          _analyzeStatement(stmt);
        }
      }
    }
  }

  Future<void> _analyzeFunctionAsync(FunctionDecl func) async {
    await _lock.protect(() async {
      usedTypes.add(func.returnType.displayName());
      for (final param in func.parameters) {
        usedTypes.add(param.type.displayName());
        // Detect widgets/classes used in default parameter values
        if (param.defaultValue != null) {
          _detectWidgetsInExpression(param.defaultValue!);
        }
      }
    });

    if (func.body != null) {
      for (final stmt in func.body!.statements) {
        _analyzeStatement(stmt);
      }
    }
  }

  // =========================================================================
  // ASYNC CODE GENERATION (FIXED: Sequential instead of concurrent)
  // =========================================================================

  Future<String> _generateCodeAsync(DartFile dartFile) async {
    var code = StringBuffer();

    // Generate each section sequentially to avoid buffer corruption
    code.writeln(await _generateHeaderAsync());
    code.writeln();
    code.writeln(await _generateSmartImportsAsync(dartFile));
    code.writeln();

    code.writeln(await _generateRequiredHelpersAsync());
    code.writeln();
    // Enums and classes MUST come before top-level variables and functions
    // so that initializers like `let _users = { "1": new User(...) }` can
    // reference the class without a ReferenceError (JS `class` is not hoisted).
    code.writeln(await _generateEnumsAndConstantsAsync(dartFile));
    code.writeln();
    code.writeln(await _generateClassesAsync(dartFile));
    code.writeln();
    code.writeln(await _generateTopLevelVariablesAsync(dartFile));
    code.writeln();
    code.writeln(await _generateFunctionsAsync(dartFile));
    code.writeln();
    code.writeln(await _generateExportsAsync(dartFile));

    // Auto-invoke main() for entry-point files (target=node, file named main.dart/main.js)
    // Dart's `main()` is the program entry point; in a JS module it must be called explicitly.
    final hasMain = dartFile.functionDeclarations.any((f) => f.name == 'main');
    if (hasMain) {
      code.writeln('\n// Entry point — invoke main() automatically');
      code.writeln('main();');
    }

    return code.toString();
  }

  // =========================================================================
  // ASYNC SECTION GENERATORS
  // =========================================================================

  Future<String> _generateHeaderAsync() async {
    return '''
// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// Generated from Dart IR - Advanced Code Generation (Phase 10)
// WARNING: Do not edit manually - changes will be lost
// Generated at: ${DateTime.now()}
//
// Smart Features Enabled:
// ✓ Intelligent import detection
// ✓ Unused widget filtering
// ✓ Dependency-aware helper generation
// ✓ Type-aware imports
// ✓ Validation & Optimization (Phase 5)
// ============================================================================
''';
  }

  Future<String> _generateSmartImportsAsync(DartFile dartFile) async {
    var code = StringBuffer();

    await _lock.protect(() async {
      // Ensure Icons is imported if Icon is used (safety fallback)
      if (usedWidgets.contains('Icon')) {
        usedWidgets.add('Icons');
      }

      // ✅ NEW: Ensure Theme/Material related classes are imported
      if (usedWidgets.contains('MaterialApp') ||
          usedWidgets.contains('Theme')) {
        usedWidgets.add('ThemeData');
        usedWidgets.add('ColorScheme');
        usedWidgets.add('Colors');
        usedWidgets.add('Theme'); // ✅ Explicitly add Theme
      }

      // ✅ NEW: Ensure Icon/Icons are imported
      if (usedWidgets.contains('Icon') ||
          usedWidgets.contains('Icons') ||
          usedWidgets.contains('FloatingActionButton') ||
          usedWidgets.contains('IconButton')) {
        usedWidgets.add('Icon');
        usedWidgets.add('Icons');
        usedWidgets.add('IconData');
        usedWidgets.add('FloatingActionButton');
      }

      // ✅ NEW: Ensure TextStyle is imported if Text is used
      if (usedWidgets.contains('Text')) {
        usedWidgets.add('TextStyle');
      }

      if (usedWidgets.contains('TextStyle')) {
        usedWidgets.add('TextStyle');
      }

      // -----------------------------------------------------------------------
      // CORE IMPORTS (dart:core -> @flutterjs/dart/core)
      // -----------------------------------------------------------------------
      final coreImports = <String>{};
      final candidatesForCore = <String>{
        ...usedTypes,
        ...usedWidgets,
        ...usedFunctions,
      };

      // Helper to check core symbols
      final resolver = ImportResolver(registry: packageRegistry);

      for (final symbol in candidatesForCore) {
        // Clean symbol string (remove generics, nullability)
        var s = symbol;
        if (s.endsWith('?')) s = s.substring(0, s.length - 1);
        if (s.contains('<')) s = s.substring(0, s.indexOf('<'));

        // Skip ignored types
        if (const {
          'String',
          'int',
          'double',
          'num',
          'bool',
          'void',
          'dynamic',
          'Object',
          'List',
          'Map',
          'Set',
          'Function',
          'null',
        }.contains(s)) {
          continue;
        }

        // Resolves using the shared ImportResolver logic
        if (resolver.resolve(s) == '@flutterjs/dart/core') {
          coreImports.add(s);
        } else if (s == 'Uri') {
          // Uri is a dart:core type — only import if actually used
          coreImports.add(s);
        }
      }

      if (coreImports.isNotEmpty) {
        code.writeln('import {');
        for (final symbol in coreImports.toList()..sort()) {
          code.writeln('  $symbol,');
        }
        code.writeln('} from \'@flutterjs/dart/core\';');
        code.writeln();
      }

      // -----------------------------------------------------------------------
      // UNIFIED MATERIAL IMPORTS  (web target only — skipped for node)
      // -----------------------------------------------------------------------

      // Start empty — only populated if actual material symbols are detected
      final materialImports = <String>{};
      // Always declare servicesImports so later code can reference it safely
      final servicesImports = <String>{};
      if (target == 'node') {
        // Node.js target: skip all Flutter/material/services imports entirely
      } else {
        // Sort widgets to ensure deterministic output
        final sortedWidgets =
            usedWidgets.where((w) => !definedNames.contains(w)).toSet().toList()
              ..sort();

        // Resolver already declared above

        for (final widget in sortedWidgets) {
          // Skip runtime types if they accidentally got into usedWidgets
          if (widget.startsWith('_') || materialImports.contains(widget))
            continue;

          if (widget == 'Uri') continue;
          if (widget == 'Seo') continue;

          // ✅ FIX: Heuristic for local widgets to prevent Material capture
          // Most local pages end in "Page" or "Screen". We must ensure they resolve locally.
          // We explicitly allow 'MaterialPage' as it is a real Material widget.
          if ((widget.endsWith('Page') ||
                  widget.endsWith('Screen') ||
                  widget == 'MyApp') &&
              widget != 'MaterialPage' &&
              widget != 'CupertinoPage') {
            continue;
          }

          // ✅ FIX: Use strict resolution (ImportResolver)
          final resolvedPkg = resolver.resolve(widget);

          // Only add if it resolves to Material or is a known UI widget
          // If it resolves to 'dart:core', it will be SKIPPED here (and handled by coreImports above)
          if (resolvedPkg == '@flutterjs/material') {
            materialImports.add(widget);
          } else if (widget == 'ThemeData' ||
              widget == 'ColorScheme' ||
              widget == 'Colors' ||
              widget == 'Color' ||
              widget == 'MaterialColor' ||
              widget == 'ColorSwatch' ||
              widget == 'Theme' ||
              widget == 'Icon' ||
              widget == 'Icons' ||
              widget == 'IconData' ||
              widget == 'FloatingActionButton' ||
              widget == 'TextStyle' ||
              widget == 'MediaQuery' ||
              widget == 'MediaQueryData' ||
              widget == 'Spacer' ||
              widget == 'TextButtonThemeData' ||
              widget == 'debugPrint') {
            // Fallback for symbols not yet in registry but known to be Material
            materialImports.add(widget);
          }
        }

        if (materialImports.isNotEmpty) {
          // Only add companion symbols that are actually used — avoid spurious imports
          const materialCompanions = {
            'Theme',
            'Colors',
            'Color',
            'MaterialColor',
            'ColorSwatch',
            'Icons',
            'ThemeData',
            'EdgeInsets',
            'BorderRadius',
            'BoxDecoration',
            'TextStyle',
            'BoxShadow',
            'Offset',
            'FontWeight',
            'BoxShape',
            'Alignment',
            'CrossAxisAlignment',
            'MainAxisAlignment',
            'MediaQuery',
            'MediaQueryData',
            'Spacer',
            'TextButtonThemeData',
            'debugPrint',
            'runApp',
            'Widget',
            'State',
            'StatefulWidget',
            'StatelessWidget',
            'BuildContext',
            'Key',
          };
          // Add companions only if used in this file
          for (final c in materialCompanions) {
            if (usedWidgets.contains(c) ||
                usedTypes.contains(c) ||
                usedFunctions.contains(c)) {
              materialImports.add(c);
            }
          }

          code.writeln('import {');
          final sortedImports = materialImports.toList()..sort();
          for (final symbol in sortedImports) {
            code.writeln('  $symbol,');
          }
          code.writeln('} from \'@flutterjs/material\';');
        }

        // -----------------------------------------------------------------------
        // SERVICES IMPORTS (@flutterjs/services)
        // -----------------------------------------------------------------------

        // Ensure explicit service classes are imported
        if (usedWidgets.contains('MethodCall') ||
            usedWidgets.contains('MethodCodec') ||
            usedWidgets.contains('JSONMethodCodec') ||
            usedWidgets.contains('PlatformException') ||
            usedTypes.contains('MethodCall') ||
            usedTypes.contains('MethodCodec') ||
            usedTypes.contains('JSONMethodCodec') ||
            usedTypes.contains('PlatformException')) {
          // Add them if detected
        }
        // Actually we iterate all widgets/types and check resolution

        for (final widget in sortedWidgets) {
          if (widget.startsWith('_') ||
              materialImports.contains(widget) ||
              coreImports.contains(widget))
            continue;

          final resolvedPkg = resolver.resolve(widget);
          if (resolvedPkg == '@flutterjs/services') {
            servicesImports.add(widget);
          }
        }

        // Explicitly check for MethodCodec/JSONMethodCodec which might be variable types/initializers
        // and not in sortedWidgets if they were only in usedTypes or definedNames (wait, definedNames excludes them)
        // We just need to check usedTypes + usedWidgets
        final serviceCandidates = {...usedWidgets, ...usedTypes};
        for (final symbol in serviceCandidates) {
          if (const {
            'MethodCall',
            'MethodCodec',
            'JSONMethodCodec',
            'PlatformException',
          }.contains(symbol)) {
            servicesImports.add(symbol);
          }
        }

        if (servicesImports.isNotEmpty) {
          code.writeln('import {');
          for (final symbol in servicesImports.toList()..sort()) {
            code.writeln('  $symbol,');
          }
          code.writeln(
            '} from \'@flutterjs/services/dist/index.js\';',
          ); // Use specific path or index? index.js is safe.
          code.writeln();
        }
      } // end of web-only material/services block

      // -----------------------------------------------------------------------
      // EXTERNAL PACKAGE IMPORTS (url_launcher, shared_preferences, etc.)
      // -----------------------------------------------------------------------
      final externalImports =
          <String, Set<String>>{}; // packageName -> {symbols}

      // Dart built-in functions that should not be imported as JS symbols
      const dartBuiltinFunctions = {'print', 'identical', 'identityHashCode'};

      for (final func in usedFunctions) {
        if (definedNames.contains(func)) continue;
        if (coreImports.contains(func)) continue;
        if (materialImports.contains(func)) continue;
        if (servicesImports.contains(func)) continue;
        if (dartBuiltinFunctions.contains(func)) continue;

        // Check if this function belongs to an imported external package
        for (final importStmt in dartFile.imports) {
          if (!importStmt.uri.startsWith('package:')) continue;
          if (importStmt.uri.startsWith('package:flutter/')) continue;

          final packageName = importStmt.uri
              .substring('package:'.length)
              .split('/')
              .first;

          // Check if the package registry knows this symbol
          final registryPkg = packageRegistry.findPackageForSymbol(func);
          if (registryPkg == packageName) {
            externalImports
                .putIfAbsent(packageName, () => <String>{})
                .add(func);
            break;
          }
        }
      }

      // Also check usedWidgets/usedTypes for external package classes
      final allExternalCandidates = <String>{...usedWidgets, ...usedTypes};
      for (final symbol in allExternalCandidates) {
        if (definedNames.contains(symbol)) continue;
        if (coreImports.contains(symbol)) continue;
        if (materialImports.contains(symbol)) continue;
        if (servicesImports.contains(symbol)) continue;

        for (final importStmt in dartFile.imports) {
          if (!importStmt.uri.startsWith('package:')) continue;
          if (importStmt.uri.startsWith('package:flutter/')) continue;

          final packageName = importStmt.uri
              .substring('package:'.length)
              .split('/')
              .first;

          final registryPkg = packageRegistry.findPackageForSymbol(symbol);
          if (registryPkg == packageName) {
            externalImports
                .putIfAbsent(packageName, () => <String>{})
                .add(symbol);
            break;
          }
        }
      }

      if (externalImports.isNotEmpty) {
        for (final entry in externalImports.entries) {
          code.writeln('import {');
          for (final symbol in entry.value.toList()..sort()) {
            code.writeln('  $symbol,');
          }
          code.writeln("} from '${entry.key}';");
          code.writeln();
        }
      }

      // -----------------------------------------------------------------------
      // SAME-PACKAGE SIBLING FILE IMPORTS
      // -----------------------------------------------------------------------
      // Detect symbols used from other files in the same package
      final samePackageImports =
          <String, Set<String>>{}; // relativePath -> {symbols}

      final allUsedSymbols = {...usedWidgets, ...usedTypes, ...usedFunctions};

      for (final symbol in allUsedSymbols) {
        // Skip if already handled
        if (definedNames.contains(symbol)) continue;
        if (coreImports.contains(symbol)) continue;
        if (materialImports.contains(symbol)) continue;
        if (servicesImports.contains(symbol)) continue;
        if (dartBuiltinFunctions.contains(symbol)) continue;
        if (externalImports.values.any((set) => set.contains(symbol))) continue;

        // Check if this symbol is defined in another file in the same package
        final symbolDetails = packageRegistry.findSymbolDetails(symbol);
        if (symbolDetails != null) {
          final symbolUri = symbolDetails['uri'] as String?;
          final symbolPath = symbolDetails['path'] as String?;

          if (symbolUri != null && symbolPath != null) {
            // Extract package name from current file
            final currentPackage = dartFile.package;

            // Check if the symbol is from the same package but different file
            if (symbolUri.startsWith('package:$currentPackage/')) {
              // Don't import from the same file
              if (symbolUri != 'package:$currentPackage/${dartFile.library}') {
                // Use the path from exports.json (relative to package root)
                samePackageImports
                    .putIfAbsent(symbolPath, () => <String>{})
                    .add(symbol);
              }
            }
          }
        }
      }

      if (samePackageImports.isNotEmpty) {
        for (final entry in samePackageImports.entries) {
          code.writeln('import {');
          for (final symbol in entry.value.toList()..sort()) {
            code.writeln('  $symbol,');
          }
          code.writeln("} from '${entry.key}';");
          code.writeln();
        }
      }

      // -----------------------------------------------------------------------
      // LOCAL / PACKAGE IMPORTS (Namespace Strategy)
      // -----------------------------------------------------------------------

      final localNamespaces = <String>[];
      int importCounter = 0;

      // Filter for relevant imports (ignore flutter/material/core as they are handled above)
      for (final importStmt in dartFile.imports) {
        final uri = importStmt.uri;

        // DEBUG: Trace import processing
        if (dartFile.filePath.contains('url_launcher_web')) {
          print(
            'DEBUG: [CodeGen] Processing import: $uri for ${dartFile.filePath}',
          );
        }

        // Skip Core libs (handled by SmartImport logic above)
        if (uri.startsWith('dart:') ||
            uri.startsWith('package:flutter/') ||
            uri == 'package:flutterjs/material.dart') {
          if (dartFile.filePath.contains('url_launcher_web')) {
            print('DEBUG: [CodeGen] Skipped CORE import: $uri');
          }
          continue;
        }

        // Skip packages already handled by external named imports
        if (uri.startsWith('package:')) {
          final pkgName = uri.substring('package:'.length).split('/').first;
          if (externalImports.containsKey(pkgName)) {
            continue;
          }
        }

        // Determine JS Path
        String jsPath = uri;

        // Optimize: Try to resolve to a known package first
        // This handles @flutterjs/seo, @flutterjs/material, etc.
        final resolvedPackage = resolver.resolveLibrary(uri);
        bool isBarePackage = false;

        if (resolvedPackage != null) {
          jsPath = resolvedPackage;
          isBarePackage = true;
        } else if (uri.startsWith('package:')) {
          // Convert package:foo/bar.dart -> 'foo' (bare module specifier)
          // The 'package:' prefix is NOT valid in JavaScript imports.
          final withoutPrefix = uri.substring(
            'package:'.length,
          ); // e.g. 'url_launcher/url_launcher.dart'
          final packageName = withoutPrefix
              .split('/')
              .first; // e.g. 'url_launcher'
          jsPath = packageName;
          isBarePackage = true;
        } else {
          // Relative import
          if (jsPath.endsWith('.dart')) {
            jsPath = jsPath.substring(0, jsPath.length - 5) + '.js';
          } else {
            jsPath += '.js';
          }
        }

        // Ensure explicit relative path (e.g. 'models/file.js' -> './models/file.js')
        // Valid for any path that doesn't start with '.', '/', or '@' (scoped packages)
        if (!isBarePackage &&
            !jsPath.startsWith('.') &&
            !jsPath.startsWith('/') &&
            !jsPath.startsWith('@') &&
            !jsPath.startsWith('package:')) {
          jsPath = './$jsPath';
        }

        // ✅ SPECIAL: Prevent UrlLauncherPlatform from importing MethodChannelUrlLauncher OR its own barrel file
        // This breaks the circular dependency at the Import level
        if (definedNames.contains('UrlLauncherPlatform') &&
            (jsPath.contains('method_channel_url_launcher') ||
                jsPath.contains('url_launcher_platform_interface'))) {
          if (dartFile.filePath.contains('url_launcher_web')) {
            print(
              'DEBUG: [CodeGen] Skipped CIRCULAR import: $uri (mapped to $jsPath)',
            );
          }
          continue;
        }

        // Generate Namespace Import
        final namespaceVar = '_import_${importCounter++}';
        localNamespaces.add(namespaceVar);

        if (dartFile.filePath.contains('url_launcher_web')) {
          print('DEBUG: [CodeGen] Generatng import: $uri -> $jsPath');
        }

        if (dartFile.library != null &&
            dartFile.library!.contains('url_launcher_web')) {
          print('DEBUG: [CodeGen] Generatng import: $uri -> $jsPath');
        }

        if (importStmt.prefix != null) {
          code.writeln('import * as ${importStmt.prefix} from \'$jsPath\';');
          localNamespaces.removeLast(); // Don't merge prefixed imports
        } else {
          code.writeln('import * as $namespaceVar from \'$jsPath\';');

          // Apply show/hide filters if present
          if (importStmt.showList.isNotEmpty ||
              importStmt.hideList.isNotEmpty) {
            final show = importStmt.showList.map((s) => "'$s'").toList();
            final hide = importStmt.hideList.map((s) => "'$s'").toList();
            // Overwrite the namespace variable with the filtered version
            // We do this by re-assigning it to a new filtered const if possible,
            // but 'import * as' creates a constant module object.
            // So we create a NEW variable and replace the old one in localNamespaces

            final filteredVar = '${namespaceVar}_filtered';
            code.writeln(
              'const $filteredVar = _filterNamespace($namespaceVar, [${show.join(', ')}], [${hide.join(', ')}]);',
            );

            // Update the list to use the filtered variable instead of the raw import
            localNamespaces.removeLast();
            localNamespaces.add(filteredVar);
          }
        }
      }

      // -----------------------------------------------------------------------
      // RUNTIME SYMBOL RESOLUTION
      // -----------------------------------------------------------------------

      // Merge all unprefixed namespaces to resolve top-level symbols
      if (localNamespaces.isNotEmpty) {
        code.writeln();
        code.writeln('// Merging local imports for symbol resolution');
        code.writeln(
          'const __merged_imports = Object.assign({}, ${localNamespaces.join(", ")});',
        );

        // Filter function for show/hide support
        code.writeln('''
function _filterNamespace(ns, show, hide) {
  let res = Object.assign({}, ns);
  if (show && show.length > 0) {
    const newRes = {};
    show.forEach(k => { if (res[k]) newRes[k] = res[k]; });
    res = newRes;
  }
  if (hide && hide.length > 0) {
    hide.forEach(k => delete res[k]);
  }
  return res;
}
''');

        // Destructure required symbols
        // Symbols that are used but not defined locally and not in core

        // Primitives and basic types to ignore
        const ignoredTypes = {
          'int',
          'double',
          'num',
          'String',
          'bool',
          'void',
          'dynamic',
          'Object',
          'List',
          'Map',
          'Set',
          'Function',
          'null',
        };

        // ✅ NEW ARCHITECTURE: Use ImportExportModel for filtering
        // Fallback to manually-tracked definedNames if model not available
        final model = dartFile.importExportModel;
        final locallyDefined = model?.locallyDefined ?? definedNames;

        // Symbols that need resolution (Used but not defined, not resolved by core)
        final requiredSymbols = <String>{};

        // Collect all potential symbols and strip generics (e.g., List<User> -> List)
        final candidates = <String>{
          ...usedWidgets,
          ...usedTypes,
          ...usedFunctions,
        };
        for (var symbol in candidates) {
          // ✅ FIX: Strip nullability suffix (?)
          if (symbol.endsWith('?')) {
            symbol = symbol.substring(0, symbol.length - 1);
          }

          if (symbol.contains('<')) {
            symbol = symbol.substring(0, symbol.indexOf('<'));
          }
          requiredSymbols.add(symbol);
        }

        // ✅ NEW: Use model data if available, fallback to definedNames
        requiredSymbols.removeAll(locallyDefined);
        requiredSymbols.removeAll(materialImports);
        requiredSymbols.removeAll(coreImports);
        requiredSymbols.removeAll(servicesImports);
        requiredSymbols.removeAll(ignoredTypes);
        requiredSymbols.removeAll(dartBuiltinFunctions);
        requiredSymbols.removeAll(
          externalImports.values.expand((s) => s).toSet(),
        );

        if (requiredSymbols.isNotEmpty) {
          code.writeln('const {');
          for (final symbol in requiredSymbols.toList()..sort()) {
            // Skip Likely noise
            if (symbol.contains('.'))
              continue; // Prefixed usage (Prefix.Symbol)

            // Skip private symbols (starting with _) - they are class members, not imports
            if (symbol.startsWith('_')) continue;

            code.writeln('  $symbol,');
          }
          code.writeln('} = __merged_imports;');
        }
      }
    });

    // -----------------------------------------------------------------------
    // PLUGIN AUTO-REGISTRATION (Hack for url_launcher)
    // -----------------------------------------------------------------------
    bool usesUrlLauncher = false;
    for (final importStmt in dartFile.imports) {
      if (importStmt.uri.contains('url_launcher')) {
        usesUrlLauncher = true;
        break;
      }
    }

    if (usesUrlLauncher) {
      code.writeln();
      code.writeln('// Auto-registration for url_launcher_web');
      code.writeln("import { UrlLauncherPlugin } from 'url_launcher_web';");
      code.writeln(
        "console.log('DEBUG: Attempting to register UrlLauncherPlugin');",
      );
      code.writeln("try {");
      code.writeln("  UrlLauncherPlugin.registerWith();");
      code.writeln(
        "  console.log('DEBUG: UrlLauncherPlugin registered successfully');",
      );
      code.writeln("} catch (e) {");
      code.writeln(
        "  console.warn('Failed to register UrlLauncherPlugin', e);",
      );
      code.writeln("}");
      code.writeln();
    }

    return code.toString();
  }

  Future<String> _generateRequiredHelpersAsync() async {
    var code = StringBuffer();

    await _lock.protect(() async {
      if (usedHelpers.isEmpty) {
        return;
      }

      code.writeln('// ===== RUNTIME HELPERS (${usedHelpers.length}) =====\n');

      for (final helper in usedHelpers.toList()..sort()) {
        final helperCode = await _generateHelperAsync(helper);
        if (helperCode.isNotEmpty) {
          code.writeln(helperCode);
          code.writeln();
        }
      }
    });

    return code.toString();
  }

  Future<String> _generateHelperAsync(String helperName) async {
    // All helpers wrapped safely
    if (helperName.startsWith('isType_')) {
      final typeName = helperName.replaceFirst('isType_', '');
      return 'function isType_$typeName(value) { return value instanceof $typeName; }';
    }

    if (helperName == 'nullCheck') {
      return r'''function nullCheck(value, name) {
  if (value === null || value === undefined) throw new Error(`${name} cannot be null`);
  return value;
}''';
    }

    // ✅ FIXED: Complete typeAssertion function - using raw string
    if (helperName == 'typeAssertion') {
      return r'''function typeAssertion(value, expectedType, variableName) {
  if (!(value instanceof expectedType)) {
    throw new TypeError(`${variableName} must be of type ${expectedType.name}`);
  }
  return value;
}''';
    }

    // ✅ NEW: Null assertion operator (!) helper
    if (helperName == 'nullAssert') {
      return r'''function nullAssert(value) {
  if (value === null || value === undefined) {
    throw new Error("Null check operator '!' used on a null value");
  }
  return value;
}''';
    }

    if (helperName == 'boundsCheck') {
      return '''function boundsCheck(index, length) {
  if (index < 0 || index >= length) {
    throw new RangeError('Index out of bounds');
  }
}''';
    }

    if (helperName == 'listCast') {
      return '''function listCast(list, expectedType) {
  return list.map(item => {
    if (!(item instanceof expectedType)) {
      throw new TypeError(`Item must be of type \${expectedType.name}`);
    }
    return item;
  });
}''';
    }

    if (helperName == 'mapCast') {
      return '''function mapCast(map, expectedKeyType, expectedValueType) {
  const result = new Map();
  for (const [key, value] of map) {
    if (!(key instanceof expectedKeyType)) {
      throw new TypeError(`Key must be of type \${expectedKeyType.name}`);
    }
    if (!(value instanceof expectedValueType)) {
      throw new TypeError(`Value must be of type \${expectedValueType.name}`);
    }
    result.set(key, value);
  }
  return result;
}''';
    }

    return '';
  }

  Future<String> _generateTopLevelVariablesAsync(DartFile dartFile) async {
    var code = StringBuffer();

    if (dartFile.variableDeclarations.isEmpty) {
      return '';
    }

    code.writeln('// ===== TOP-LEVEL VARIABLES =====\n');

    for (final variable in dartFile.variableDeclarations) {
      String init = '';

      if (variable.initializer != null) {
        final result = propConverter.convertProperty(
          variable.name,
          variable.initializer!,
          variable.type.displayName(),
        );
        init = ' = ${result.code}';
      }

      final keyword = variable.isConst ? 'const' : 'let';
      code.writeln('$keyword ${variable.name}$init;');
    }

    code.writeln();
    return code.toString();
  }

  Future<String> _generateEnumsAndConstantsAsync(DartFile dartFile) async {
    var code = StringBuffer();

    // Generate enums using the new EnumDecl IR
    if (dartFile.enumDeclarations.isEmpty) {
      return '';
    }

    code.writeln('// ===== ENUMS =====\n');

    final enumCodeGen = EnumCodeGen();
    for (int i = 0; i < dartFile.enumDeclarations.length; i++) {
      final enumDecl = dartFile.enumDeclarations[i];
      code.write(enumCodeGen.generateEnum(enumDecl));

      if (i < dartFile.enumDeclarations.length - 1) {
        code.writeln();
      }
    }

    code.writeln();
    return code.toString();
  }

  Future<String> _generateClassesAsync(DartFile dartFile) async {
    var code = StringBuffer();

    if (dartFile.classDeclarations.isEmpty) {
      return '';
    }

    code.writeln('// ===== CLASSES =====\n');

    final sorted = _sortByDependency(dartFile.classDeclarations);

    for (int i = 0; i < sorted.length; i++) {
      try {
        code.writeln(await classCodeGen.generate(sorted[i]));
        if (i < sorted.length - 1) {
          code.writeln();
        }
      } catch (e) {
        code.writeln('// ERROR: Failed to generate class ${sorted[i].name}');
      }
    }

    code.writeln();
    return code.toString();
  }

  Future<String> _generateFunctionsAsync(DartFile dartFile) async {
    var code = StringBuffer();

    if (dartFile.functionDeclarations.isEmpty) {
      return '';
    }

    code.writeln('// ===== FUNCTIONS =====\n');

    // Group functions by name to detect getter/setter pairs
    final funcsByName = <String, List<FunctionDecl>>{};
    for (var f in dartFile.functionDeclarations) {
      // Normalize name: setters might have '=' suffix in IR
      if (f.name.contains('ascii')) {
        // Reverted debug throw
      }
      var key = f.name;
      if (f.isSetter && key.endsWith('=')) {
        key = key.substring(0, key.length - 1);
      }
      funcsByName.putIfAbsent(key, () => []).add(f);
    }

    for (var name in funcsByName.keys) {
      final group = funcsByName[name]!;

      // Check for getter/setter pair
      FunctionDecl? getter;
      FunctionDecl? setter;

      for (var f in group) {
        if (f.isGetter) getter = f;
        if (f.isSetter) setter = f;
      }

      if (group.length == 2 && getter != null && setter != null) {
        // Handle getter/setter pair
        try {
          code.writeln(await _generateMergedGetterSetter(getter, setter));
          code.writeln();
        } catch (e) {
          code.writeln(
            '// ERROR: Failed to generate getter/setter pair for $name: $e',
          );
        }
      } else {
        // Handle normally (single functions or non-pairs)
        for (var i = 0; i < group.length; i++) {
          try {
            code.writeln(await funcCodeGen.generate(group[i]));
            code.writeln();
          } catch (e) {
            code.writeln(
              '// ERROR: Failed to generate function ${group[i].name}',
            );
          }
        }
      }
    }

    code.writeln();
    return code.toString();
  }

  Future<String> _generateMergedGetterSetter(
    FunctionDecl getter,
    FunctionDecl setter,
  ) async {
    final buffer = StringBuffer();
    final name = getter.name;
    final safeName = exprCodeGen.safeIdentifier(name);

    // Generate unified function
    // const name = (value = undefined) => { ... }
    buffer.writeln('const $safeName = (value = undefined) => {');
    indenter.indent();

    // Setter Block
    buffer.writeln(indenter.line('if (value !== undefined) {'));
    indenter.indent();

    // Map setter parameter to 'value'
    if (setter.parameters.isNotEmpty) {
      final paramName = setter.parameters.first.name;
      // Define the expected parameter variable just in case body uses it
      if (paramName != 'value') {
        buffer.writeln(indenter.line('let $paramName = value;'));
      }
    }

    if (setter.body != null) {
      for (final stmt in setter.body!.statements) {
        buffer.writeln(
          stmtCodeGen.generateWithContext(stmt, functionContext: setter),
        );
      }
    }
    // Return the value to behave like an assignment expression if needed,
    // though Dart setters return void. JS assignment returns value.
    buffer.writeln(indenter.line('return value;'));

    indenter.dedent();
    buffer.writeln(indenter.line('} else {'));

    // Getter Block
    indenter.indent();
    if (getter.body != null) {
      for (final stmt in getter.body!.statements) {
        buffer.writeln(
          stmtCodeGen.generateWithContext(stmt, functionContext: getter),
        );
      }
    }
    indenter.dedent();
    buffer.writeln(indenter.line('}')); // Close else

    indenter.dedent();
    buffer.writeln('};'); // Close function

    return buffer.toString();
  }

  Future<String> _generateExportsAsync(DartFile dartFile) async {
    var code = StringBuffer();

    code.writeln('// ===== EXPORTS =====\n');
    code.writeln('export {');

    for (final cls in dartFile.classDeclarations) {
      // Skip private classes (starting with _) - they are not publicly accessible
      if (cls.name.startsWith('_')) continue;
      code.writeln('  ${cls.name},');
    }

    for (final func in dartFile.functionDeclarations) {
      // Skip private functions (starting with _)
      if (func.name.startsWith('_')) continue;
      code.writeln('  ${func.name},');
    }

    for (final variable in dartFile.variableDeclarations) {
      // Skip private variables (starting with _)
      if (variable.name.startsWith('_')) continue;
      code.writeln('  ${variable.name},');
    }

    code.writeln('};');

    return code.toString();
  }

  // =========================================================================
  // VALIDATION & OPTIMIZATION (ASYNC)
  // =========================================================================

  Future<String> _performValidationAsync(
    String jsCode,
    DartFile dartFile,
  ) async {
    final validator = outputValidator ?? OutputValidator(jsCode);
    validationReport = await validator.validate();
    if (validationReport!.hasCriticalIssues) {
      generationWarnings.add(
        '⚠️  CRITICAL VALIDATION ISSUES FOUND: ${validationReport!.errorCount} errors',
      );

      for (final error in validationReport!.errors) {
        if (error.severity == ErrorSeverity.fatal ||
            error.severity == ErrorSeverity.error) {
          generationWarnings.add('  ❌ ${error.message}');
        }
      }

      return _wrapWithValidationErrors(jsCode, validationReport!);
    }

    for (final error in validationReport!.errors) {
      if (error.severity == ErrorSeverity.warning) {
        generationWarnings.add('  ⚠️  ${error.message}');
      }
    }

    return jsCode;
  }

  Future<String> _performOptimizationAsync(
    String jsCode,
    int level, {
    bool dryRun = false,
    bool preserveComments = false,
  }) async {
    if (level < 1 || level > 3) {
      generationWarnings.add(
        'Warning: Invalid optimization level $level, using level 1',
      );
      level = 1;
    }

    try {
      final optimizer = JSOptimizer(jsCode);

      // DRY RUN MODE: Show what would be optimized without actually doing it
      if (dryRun) {
        final analysis = optimizer.optimize(
          level: level,
          dryRun: true,
          preserveComments_: preserveComments,
        );
        generationWarnings.add('DRY RUN (Level $level): No changes applied');
        return analysis;
      }

      // ACTUAL OPTIMIZATION
      final optimizedCode = optimizer.optimize(
        level: level,
        dryRun: false,
        preserveComments_: preserveComments,
      );

      final reduction = jsCode.length - optimizedCode.length;
      final reductionPercent = jsCode.length > 0
          ? (reduction / jsCode.length * 100).toStringAsFixed(2)
          : '0.00';

      // Warn if optimization resulted in minimal gains
      if (reduction < 50) {
        generationWarnings.add(
          'Note: Minimal optimization gains (Level $level): -$reduction bytes',
        );
      } else {
        generationWarnings.add(
          'Code optimized (Level $level): -$reduction bytes ($reductionPercent%)',
        );
      }

      // Log all applied optimizations
      for (final log in optimizer.optimizationLog) {
        generationWarnings.add('  → $log');
      }

      if (level == 3) {
        final header =
            '''
// ============================================================================
// CODE MINIFIED & OPTIMIZED (Level 3)
// Original: ${jsCode.length} bytes → Optimized: ${optimizedCode.length} bytes
// Reduction: $reduction bytes ($reductionPercent%)
// Note: Comments with "KEEP:" directive are preserved
// ============================================================================\n''';
        return header + optimizedCode;
      }

      if (level == 2) {
        final header =
            '''
// Optimized (Level 2): $reductionPercent% reduction
\n''';
        return header + optimizedCode;
      }

      return optimizedCode;
    } catch (e, stackTrace) {
      generationWarnings.add('Optimization failed: $e');
      generationWarnings.add('Stack trace: $stackTrace');
      return jsCode; // Graceful fallback
    }
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  void _analyzeStatement(StatementIR stmt) {
    if (stmt is BlockStmt) {
      for (final s in stmt.statements) _analyzeStatement(s);
    } else if (stmt is IfStmt) {
      _analyzeExpression(stmt.condition);
      _analyzeStatement(stmt.thenBranch);
      if (stmt.elseBranch != null) _analyzeStatement(stmt.elseBranch!);
    } else if (stmt is ReturnStmt) {
      if (stmt.expression != null) _analyzeExpression(stmt.expression);
    } else if (stmt is ExpressionStmt) {
      _analyzeExpression(stmt.expression);
    } else if (stmt is VariableDeclarationStmt) {
      if (stmt.initializer != null) {
        _analyzeExpression(stmt.initializer!);
      }
    } else if (stmt is ForStmt) {
      if (stmt.initialization != null && stmt.initialization is StatementIR) {
        _analyzeStatement(stmt.initialization as StatementIR);
      } else if (stmt.initialization is ExpressionIR) {
        _analyzeExpression(stmt.initialization as ExpressionIR);
      }
      if (stmt.condition != null) _analyzeExpression(stmt.condition);
      for (final u in stmt.updaters) _analyzeExpression(u);
      _analyzeStatement(stmt.body);
    } else if (stmt is ForEachStmt) {
      _analyzeExpression(stmt.iterable);
      _analyzeStatement(stmt.body);
    } else if (stmt is WhileStmt) {
      _analyzeExpression(stmt.condition);
      _analyzeStatement(stmt.body);
    } else if (stmt is SwitchStmt) {
      _analyzeExpression(stmt.expression);
      for (final c in stmt.cases) {
        for (final s in c.statements) _analyzeStatement(s);
      }
      if (stmt.defaultCase != null) {
        for (final s in stmt.defaultCase!.statements) _analyzeStatement(s);
      }
    } else if (stmt is TryStmt) {
      _analyzeStatement(stmt.tryBlock);
      for (final clause in stmt.catchClauses) {
        _analyzeStatement(clause.body);
      }
      if (stmt.finallyBlock != null) {
        _analyzeStatement(stmt.finallyBlock!);
      }
    }
  }

  void _analyzeExpression(ExpressionIR? expr) {
    if (expr == null) return;

    if (expr is TypeCheckExpr) {
      usedTypes.add(expr.typeToCheck.displayName());
    } else if (expr is CastExpressionIR) {
      usedTypes.add(expr.targetType.displayName());
    }

    // Always detect widgets in any expression
    _detectWidgetsInExpression(expr);
  }

  void _detectWidgetsInExpression(ExpressionIR expr) {
    void addWidget(String name) {
      if (name.isEmpty) return;
      final rootName = name.split('.').first;
      // Heuristic: Class names are capitalized
      if (rootName.isNotEmpty && rootName[0].toUpperCase() == rootName[0]) {
        usedWidgets.add(rootName);
      }
    }

    if (expr is InstanceCreationExpressionIR) {
      addWidget(expr.type.displayName());

      for (final arg in expr.arguments) {
        _detectWidgetsInExpression(arg);
      }

      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is ConstructorCallExpressionIR) {
      // Handle ConstructorCallExpressionIR (used for Text, TextStyle, SizedBox, etc.)
      addWidget(expr.className);

      for (final arg in expr.positionalArguments) {
        _detectWidgetsInExpression(arg);
      }

      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is MethodCallExpressionIR) {
      // Detect widget constructors by capitalized method name
      if (expr.methodName.isNotEmpty) {
        addWidget(expr.methodName);

        // ✅ FIX: Detect top-level function calls (lowercase)
        // Only if target is null (implicit this or top-level)
        if (expr.target == null &&
            expr.methodName.isNotEmpty &&
            expr.methodName[0].toLowerCase() == expr.methodName[0]) {
          usedFunctions.add(expr.methodName);
        }
      }

      // For static method calls like Navigator.of(), detect the class name
      if (expr.target != null) {
        // If target is an identifier (e.g., Navigator in Navigator.of()), add it
        if (expr.target is IdentifierExpressionIR) {
          final targetName = (expr.target as IdentifierExpressionIR).name;
          addWidget(targetName);
        }
        _detectWidgetsInExpression(expr.target!);
      }

      for (final arg in expr.arguments) {
        _detectWidgetsInExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is ListExpressionIR) {
      for (final elem in expr.elements) {
        _detectWidgetsInExpression(elem);
      }
    } else if (expr is MapExpressionIR) {
      // ✅ FIX: Handle Map Literals (e.g. routes: {'/': ...})
      for (final element in expr.elements) {
        if (element is MapEntryIR) {
          _detectWidgetsInExpression(element.key);
          _detectWidgetsInExpression(element.value);
        } else {
          _detectWidgetsInExpression(element);
        }
      }
    } else if (expr is SetExpressionIR) {
      // ✅ FIX: Handle Set Literals
      for (final elem in expr.elements) {
        _detectWidgetsInExpression(elem);
      }
    } else if (expr is ConditionalExpressionIR) {
      _detectWidgetsInExpression(expr.thenExpression);
      _detectWidgetsInExpression(expr.elseExpression);
    } else if (expr is FunctionCallExpr) {
      // Handle free function calls like launchUrl(), debugPrint()
      if (expr.functionName.isNotEmpty) {
        addWidget(expr.functionName);
        // Detect top-level function calls (camelCase)
        if (expr.functionName[0].toLowerCase() == expr.functionName[0]) {
          usedFunctions.add(expr.functionName);
        }
      }
      for (final arg in expr.arguments) {
        _detectWidgetsInExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is MethodCallExpr) {
      if (expr.methodName.isNotEmpty) {
        addWidget(expr.methodName);
        if (expr.receiver == null &&
            expr.methodName[0].toLowerCase() == expr.methodName[0]) {
          usedFunctions.add(expr.methodName);
        }
      }
      if (expr.receiver != null) {
        _detectWidgetsInExpression(expr.receiver!);
      }
      for (final arg in expr.arguments) {
        _detectWidgetsInExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is ConstructorCallExpr) {
      addWidget(expr.className);
      for (final arg in expr.arguments) {
        _detectWidgetsInExpression(arg);
      }
      for (final arg in expr.namedArguments.values) {
        _detectWidgetsInExpression(arg);
      }
    } else if (expr is AwaitExpr) {
      _detectWidgetsInExpression(expr.futureExpression);
    } else if (expr is BinaryExpressionIR) {
      _detectWidgetsInExpression(expr.left);
      _detectWidgetsInExpression(expr.right);
    } else if (expr is UnaryExpressionIR) {
      _detectWidgetsInExpression(expr.operand);
    } else if (expr is ParenthesizedExpressionIR) {
      _detectWidgetsInExpression(expr.innerExpression);
    } else if (expr is PropertyAccessExpressionIR) {
      if (expr.target is IdentifierExpressionIR) {
        final targetName = (expr.target as IdentifierExpressionIR).name;
        addWidget(targetName);
      }
    } else if (expr is IdentifierExpressionIR) {
      addWidget(expr.name);
    } else if (expr is CascadeExpressionIR) {
      // Scan the cascade target and all cascade sections for symbol usage
      _detectWidgetsInExpression(expr.target);
      for (final section in expr.cascadeSections) {
        _detectWidgetsInExpression(section);
      }
    } else if (expr is FunctionExpressionIR) {
      // Analyze lambda/function bodies for widget usage
      if (expr.body != null) {
        for (final stmt in expr.body!.statements) {
          _analyzeStatement(stmt);
        }
      }
    }
  }

  bool _isEnum(ClassDecl cls) {
    return cls.instanceMethods.isEmpty &&
        cls.instanceFields.isEmpty &&
        cls.staticFields.isNotEmpty;
  }

  List<ClassDecl> _sortByDependency(List<ClassDecl> classes) {
    final sorted = <ClassDecl>[];
    final visited = <String>{};

    void visit(ClassDecl cls) {
      if (visited.contains(cls.name)) return;
      visited.add(cls.name);

      if (cls.superclass != null) {
        final parentName = cls.superclass!.displayName();
        final parent = classes.firstWhereOrNull((c) => c.name == parentName);
        if (parent != null) visit(parent);
      }

      for (final iface in cls.interfaces) {
        final ifaceName = iface.displayName();
        final ifaceClass = classes.firstWhereOrNull((c) => c.name == ifaceName);
        if (ifaceClass != null) visit(ifaceClass);
      }

      sorted.add(cls);
    }

    for (final cls in classes) {
      visit(cls);
    }

    return sorted;
  }

  String _wrapWithValidationErrors(String jsCode, ValidationReport report) {
    var code = StringBuffer();

    code.writeln(
      '// ============================================================================',
    );
    code.writeln('// ⚠️  VALIDATION ERRORS - Review before using');
    code.writeln(
      '// ============================================================================',
    );
    code.writeln('// Status: ${report.isValid ? "✅ VALID" : "❌ INVALID"}');
    code.writeln('// Issues: ${report.totalIssues}');
    code.writeln('//');

    for (final error in report.errors.where(
      (e) =>
          e.severity == ErrorSeverity.fatal ||
          e.severity == ErrorSeverity.error,
    )) {
      code.writeln('// ERROR: ${error.message}');
      if (error.suggestion != null) {
        code.writeln('// 💡 ${error.suggestion}');
      }
    }

    code.writeln(
      '// ============================================================================\n',
    );
    code.writeln(jsCode);

    return code.toString();
  }

  String _generateErrorOutput(Object error) {
    return '''
// ============================================================================
// ERROR: Failed to generate file
// ============================================================================
// Error: $error
//
// Checklist:
// ✗ Valid DartFile IR structure
// ✗ All dependent code generators initialized
// ✗ No circular dependencies
''';
  }

  Future<String> generateReportAsync(DartFile dartFile) async {
    final buffer = StringBuffer();

    buffer.writeln(
      '\n╔════════════════════════════════════════════════════════════════╗',
    );
    buffer.writeln(
      '║        FILE GENERATION REPORT (Phase 4 + Phase 5)             ║',
    );
    buffer.writeln(
      '╚════════════════════════════════════════════════════════════════╝\n',
    );

    buffer.writeln('📊 Input Statistics:');
    buffer.writeln('  Classes: ${dartFile.classDeclarations.length}');
    buffer.writeln('  Functions: ${dartFile.functionDeclarations.length}');
    buffer.writeln('  Variables: ${dartFile.variableDeclarations.length}\n');

    buffer.writeln('🔍 Smart Detection:');
    buffer.writeln('  Widgets Used: ${usedWidgets.length}');
    if (usedWidgets.isNotEmpty) {
      buffer.writeln('    - ${usedWidgets.toList().join(", ")}');
    }
    buffer.writeln('  Helpers Required: ${usedHelpers.length}');
    buffer.writeln('  Functions Used: ${usedFunctions.length}');
    buffer.writeln('  Types Used: ${usedTypes.length}\n');

    if (validationReport != null) {
      buffer.writeln('✅ Validation Report (Phase 5):');
      buffer.writeln(
        '  Status: ${validationReport!.isValid ? "✅ PASSED" : "❌ FAILED"}',
      );
      buffer.writeln('  Issues: ${validationReport!.totalIssues}');
      buffer.writeln(
        '  Duration: ${validationReport!.duration.inMilliseconds}ms\n',
      );
    }

    if (generationWarnings.isNotEmpty) {
      buffer.writeln('⚠️  Generation Messages:');
      for (final warning in generationWarnings) {
        buffer.writeln('  $warning');
      }
      buffer.writeln();
    }

    buffer.writeln('✓ Generated Sections:');
    buffer.writeln('  ✓ Smart Imports');
    buffer.writeln('  ✓ Helper Functions');
    buffer.writeln('  ✓ Variables');
    buffer.writeln('  ✓ Enums');
    buffer.writeln('  ✓ Classes');
    buffer.writeln('  ✓ Functions');
    buffer.writeln('  ✓ Exports');

    return buffer.toString();
  }
}

// ============================================================================
// SIMPLE MUTEX FOR THREAD SAFETY
// ============================================================================

class Mutex {
  bool _locked = false;

  Future<T> protect<T>(Future<T> Function() callback) async {
    while (_locked) {
      await Future.delayed(Duration(milliseconds: 1));
    }

    _locked = true;
    try {
      return await callback();
    } finally {
      _locked = false;
    }
  }
}
