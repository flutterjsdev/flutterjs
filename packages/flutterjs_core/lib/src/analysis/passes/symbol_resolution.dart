import 'package:collection/collection.dart';

import '../../ir/declarations/class_decl.dart';
import '../../ir/declarations/dart_file_builder.dart';
import '../../ir/declarations/import_export_stmt.dart';
import '../../ir/types/type_ir.dart';
import '../../ir/diagnostics/analysis_issue.dart';
import '../../ir/diagnostics/issue_category.dart';
import '../../ir/core/source_location.dart';
import 'type_inference_pass.dart';

/// <---------------------------------------------------------------------------->
/// symbol_resolution.dart
/// ----------------------------------------------------------------------------
///
/// Symbol resolution engine for a multi-file Dart/Flutter project analyzer (Pass 2).
///
/// Takes raw declarations and links references to definitions, resolving imports,
/// types, and associations (e.g., StatefulWidget → State). It builds a global
/// symbol table and handles qualified names, prefixes, and relative paths.
///
/// Main class: [SymbolResolutionPass] – performs resolution across all files,
/// producing [ResolutionInfo] with bindings, registries, and issues.
///
/// Features:
/// • Global registry for classes/functions/variables
/// • Import/export resolution (absolute/relative/package URIs)
/// • Widget-State pairing via generics and createState overrides
/// • Provider detection (ChangeNotifier, Bloc, etc.) with type classification
/// • Type reference resolution (simple → fully qualified, with generics)
/// • Built-in type checks and fallback handling
/// • Issue reporting for unresolved symbols/circular imports
///
/// Example:
/// dart /// resolver.resolveAllSymbols(); /// final state = file.resolutionInfo.widgetStateBindings[widgetName]; ///
///
/// Essential for:
/// • Type inference (Pass 3)
/// • Flow analysis (Pass 4)
/// • Cross-file diagnostics (unused imports, dead code)
/// • IDE-like features (go-to-definition, rename refactoring)
///
/// All registries use immutable maps; issues as [AnalysisIssue] with codes/suggestions.
/// <---------------------------------------------------------------------------->
class SymbolResolutionPass {
  /// All DartFiles in project (from Pass 1)
  final Map<String, DartFile> dartFiles;

  /// Project root path for resolving relative imports
  final String projectRoot;

  /// Symbol registry: fully_qualified_name -> Declaration
  final Map<String, Declaration> globalSymbolRegistry = {};

  /// File exports: file_path -> Set<exported_symbol_names>
  final Map<String, Set<String>> fileExports = {};

  /// Widget to State mapping: widget_class_name -> state_class_name
  final Map<String, String> widgetStateBindings = {};

  /// Provider classes: provider_class_name -> ProviderInfo
  final Map<String, ProviderInfo> providerRegistry = {};

  /// Import mappings: (from_file, import_uri, prefix) -> (to_file, imported_symbols)
  final Map<String, ImportResolution> importResolutions = {};

  /// Issues found during resolution
  final List<AnalysisIssue> resolutionIssues = [];

  SymbolResolutionPass({required this.dartFiles, required this.projectRoot});

  /// Execute the complete symbol resolution pass
  void resolveAllSymbols() {
    // Step 1: Build global symbol registry
    _buildGlobalSymbolRegistry();

    // Step 2: Resolve imports and exports
    _resolveImportsAndExports();

    // Step 3: Link widget-state associations
    _linkWidgetStateAssociations();

    // Step 4: Identify and index providers
    _identifyProviders();

    // Step 5: Resolve type references in all declarations
    _resolveTypeReferences();

    // Step 6: Update DartFiles with resolved information
    _updateDartFilesWithResolutions();
  }

  // =========================================================================
  // STEP 1: BUILD GLOBAL SYMBOL REGISTRY
  // =========================================================================

  void _buildGlobalSymbolRegistry() {
    for (final dartFile in dartFiles.values) {
      final filePackage = _extractPackageFromPath(dartFile.filePath);

      // Register all classes
      for (final classDecl in dartFile.classDeclarations) {
        final qualifiedName = _buildQualifiedName(filePackage, classDecl.name);
        globalSymbolRegistry[qualifiedName] = classDecl;
      }

      // Register all functions
      for (final funcDecl in dartFile.functionDeclarations) {
        final qualifiedName = _buildQualifiedName(filePackage, funcDecl.name);
        globalSymbolRegistry[qualifiedName] = funcDecl;
      }

      // Register all top-level variables
      for (final varDecl in dartFile.variableDeclarations) {
        final qualifiedName = _buildQualifiedName(filePackage, varDecl.name);
        globalSymbolRegistry[qualifiedName] = varDecl;
      }
    }
  }

  // =========================================================================
  // STEP 2: RESOLVE IMPORTS AND EXPORTS
  // =========================================================================

  void _resolveImportsAndExports() {
    for (final dartFile in dartFiles.values) {
      // Resolve imports
      for (final import in dartFile.imports) {
        _resolveImport(dartFile, import);
      }

      // Resolve exports
      for (final export in dartFile.exports) {
        _resolveExport(dartFile, export);
      }
    }
  }

  void _resolveImport(DartFile importer, ImportStmt import) {
    // Convert URI to file path
    final importedFilePath = _resolveImportUri(import.uri, importer.filePath);

    if (importedFilePath == null) {
      _addIssue(
        severity: IssueSeverity.error,
        category: IssueCategory.invalidImport,
        message: 'Cannot resolve import: ${import.uri}',
        sourceLocation: import.sourceLocation,
      );
      return;
    }

    final importedFile = dartFiles[importedFilePath];
    if (importedFile == null) {
      _addIssue(
        severity: IssueSeverity.error,
        category: IssueCategory.invalidImport,
        message: 'Import file not found: $importedFilePath',
        sourceLocation: import.sourceLocation,
      );
      return;
    }

    // Collect imported symbols
    final importedSymbols = <String>{};

    if (import.showList.isNotEmpty) {
      // Explicit show list
      importedSymbols.addAll(import.showList);
    } else if (import.hideList.isNotEmpty) {
      // All symbols except hide list
      _collectAllSymbols(importedFile, importedSymbols);
      importedSymbols.removeAll(import.hideList);
    } else {
      // All symbols
      _collectAllSymbols(importedFile, importedSymbols);
    }

    // Store resolution
    final resolutionKey = _importResolutionKey(
      importer.filePath,
      import.uri,
      import.prefix,
    );

    importResolutions[resolutionKey] = ImportResolution(
      importedFilePath: importedFilePath,
      importedSymbols: importedSymbols,
      prefix: import.prefix,
    );
  }

  void _resolveExport(DartFile exporter, ExportStmt export) {
    final exportedFilePath = _resolveImportUri(export.uri, exporter.filePath);

    if (exportedFilePath == null) {
      _addIssue(
        severity: IssueSeverity.error,
        category: IssueCategory.invalidImport,
        message: 'Cannot resolve export: ${export.uri}',
        sourceLocation: export.sourceLocation,
      );
      return;
    }

    final exportedFile = dartFiles[exportedFilePath];
    if (exportedFile == null) {
      _addIssue(
        severity: IssueSeverity.error,
        category: IssueCategory.invalidImport,
        message: 'Export file not found: $exportedFilePath',
        sourceLocation: export.sourceLocation,
      );
      return;
    }

    // Collect exported symbols
    final symbols = <String>{};

    if (export.showList.isNotEmpty) {
      symbols.addAll(export.showList);
    } else if (export.hideList.isNotEmpty) {
      _collectAllSymbols(exportedFile, symbols);
      symbols.removeAll(export.hideList);
    } else {
      _collectAllSymbols(exportedFile, symbols);
    }

    if (fileExports[exporter.filePath] == null) {
      fileExports[exporter.filePath] = symbols;
    } else {
      fileExports[exporter.filePath]!.addAll(symbols);
    }
  }

  // =========================================================================
  // STEP 3: LINK WIDGET-STATE ASSOCIATIONS
  // =========================================================================

  void _linkWidgetStateAssociations() {
    for (final dartFile in dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        // Check if StatefulWidget
        if (_isStatefulWidget(classDecl)) {
          final stateName = _findStateName(classDecl);
          if (stateName != null) {
            widgetStateBindings[classDecl.name] = stateName;
          }
        }
      }
    }
  }

  bool _isStatefulWidget(ClassDecl classDecl) {
    if (classDecl.superclass == null) return false;

    final superclassName = _extractTypeName(classDecl.superclass!);
    return superclassName == 'StatefulWidget' ||
        _isSubclassOf(superclassName, 'StatefulWidget');
  }

  String? _findStateName(ClassDecl widget) {
    // Look for createState method that returns State<WidgetName>
    for (final method in widget.methods) {
      if (method.name == 'createState') {
        // Extract return type or infer from return statement
        if (method.returnType is SimpleTypeIR) {
          final typeName = (method.returnType as SimpleTypeIR).name;
          // Usually State<WidgetName>, extract WidgetName
          final match = RegExp(r'State<(\w+)>').firstMatch(typeName);
          if (match != null) {
            return match.group(1);
          }
        }
      }
    }

    return null;
  }

  // =========================================================================
  // STEP 4: IDENTIFY PROVIDERS
  // =========================================================================

  void _identifyProviders() {
    for (final dartFile in dartFiles.values) {
      for (final classDecl in dartFile.classDeclarations) {
        if (_isChangeNotifier(classDecl)) {
          providerRegistry[classDecl.name] = ProviderInfo(
            className: classDecl.name,
            type: ProviderTypeState.changeNotifier,

            filePath: dartFile.filePath,
            declaration: classDecl,
          );
        } else if (_isProvider(classDecl)) {
          providerRegistry[classDecl.name] = ProviderInfo(
            className: classDecl.name,
            type: ProviderTypeState.stateNotifier,
            filePath: dartFile.filePath,
            declaration: classDecl,
          );
        }
      }
    }
  }

  bool _isChangeNotifier(ClassDecl classDecl) {
    if (classDecl.superclass == null) return false;

    final superclassName = _extractTypeName(classDecl.superclass!);
    return superclassName == 'ChangeNotifier' ||
        _isSubclassOf(superclassName, 'ChangeNotifier');
  }

  bool _isProvider(ClassDecl classDecl) {
    if (classDecl.mixins.isEmpty) return false;

    for (final mixin in classDecl.mixins) {
      final mixinName = _extractTypeName(mixin);
      if (mixinName.contains('ChangeNotifier') ||
          mixinName.contains('StateNotifier')) {
        return true;
      }
    }

    return false;
  }

  // =========================================================================
  // STEP 5: RESOLVE TYPE REFERENCES
  // =========================================================================

  void _resolveTypeReferences() {
    for (final dartFile in dartFiles.values) {
      // Resolve types in classes
      for (final classDecl in dartFile.classDeclarations) {
        if (classDecl.superclass != null) {
          classDecl.superclass = _resolveTypeReference(
            classDecl.superclass!,
            dartFile,
          );
        }

        for (int i = 0; i < classDecl.interfaces.length; i++) {
          classDecl.interfaces[i] = _resolveTypeReference(
            classDecl.interfaces[i],
            dartFile,
          );
        }

        for (int i = 0; i < classDecl.mixins.length; i++) {
          classDecl.mixins[i] = _resolveTypeReference(
            classDecl.mixins[i],
            dartFile,
          );
        }

        // Resolve field types
        for (final field in classDecl.fields) {
          field.type = _resolveTypeReference(field.type, dartFile);
        }

        // Resolve method types and parameters
        for (final method in classDecl.methods) {
          method.returnType = _resolveTypeReference(
            method.returnType,
            dartFile,
          );
          for (final param in method.parameters) {
            param.type = _resolveTypeReference(param.type, dartFile);
          }
        }
      }

      // Resolve types in functions
      for (final func in dartFile.functionDeclarations) {
        func.returnType = _resolveTypeReference(func.returnType, dartFile);
        for (final param in func.parameters) {
          param.type = _resolveTypeReference(param.type, dartFile);
        }
      }

      // Resolve types in variables
      for (final variable in dartFile.variableDeclarations) {
        variable.type = _resolveTypeReference(variable.type, dartFile);
      }
    }
  }

  TypeIR _resolveTypeReference(TypeIR type, DartFile context) {
    // If already resolved, return as-is
    if (type is! SimpleTypeIR ||
        type.name == 'dynamic' ||
        type.name == 'void') {
      return type;
    }

    // Try to resolve the type name
    final typeName = type.name;

    // Check if it's a built-in type
    if (_isBuiltInType(typeName)) {
      return type;
    }

    // Try to find in context file
    final localDeclaration = _findSymbolInFile(typeName, context);
    if (localDeclaration != null) {
      return type; // Type name is already correct
    }

    // Try to find through imports
    final importedDeclaration = _findSymbolThroughImports(typeName, context);
    if (importedDeclaration != null) {
      return type; // Type is resolvable
    }

    // Report unresolved type
    _addIssue(
      severity: IssueSeverity.warning,
      category: IssueCategory.unresolvedType,
      message: 'Unresolved type reference: $typeName',
      sourceLocation: type.sourceLocation,
    );

    return type;
  }

  // =========================================================================
  // STEP 6: UPDATE DARTFILES WITH RESOLUTIONS
  // =========================================================================

  void _updateDartFilesWithResolutions() {
    for (final dartFile in dartFiles.values) {
      // Add resolution metadata to each file
      dartFile.resolutionInfo = ResolutionInfo(
        importResolutions: importResolutions,
        widgetStateBindings: widgetStateBindings,
        providerRegistry: providerRegistry,
        resolvedSymbols: globalSymbolRegistry,
        issues: resolutionIssues,
      );
    }
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  String? _resolveImportUri(String uri, String fromFilePath) {
    // Handle package: imports
    if (uri.startsWith('package:')) {
      final packageName = uri.split('/').first.replaceFirst('package:', '');
      final relativePath = uri.split('/').skip(1).join('/');
      return '$projectRoot/packages/$packageName/lib/$relativePath';
    }

    // Handle relative imports
    if (uri.startsWith('./') || uri.startsWith('../')) {
      final baseDir = _getDirectory(fromFilePath);
      final normalizedPath = _normalizePath(baseDir, uri);
      return normalizedPath;
    }

    // Handle absolute imports (dart:, flutter:, etc.)
    if (uri.startsWith('dart:') || uri.startsWith('flutter:')) {
      // These are built-in libraries, not in project
      return null;
    }

    return null;
  }

  Declaration? _findSymbolInFile(String symbolName, DartFile file) {
    // Check classes
    for (final classDecl in file.classDeclarations) {
      if (classDecl.name == symbolName) {
        return classDecl;
      }
    }

    // Check functions
    for (final func in file.functionDeclarations) {
      if (func.name == symbolName) {
        return func;
      }
    }

    // Check variables
    for (final variable in file.variableDeclarations) {
      if (variable.name == symbolName) {
        return variable;
      }
    }

    return null;
  }

  Declaration? _findSymbolThroughImports(String symbolName, DartFile file) {
    for (final import in file.imports) {
      final resolutionKey = _importResolutionKey(
        file.filePath,
        import.uri,
        import.prefix,
      );

      final resolution = importResolutions[resolutionKey];
      if (resolution != null &&
          resolution.importedSymbols.contains(symbolName)) {
        final importedFile = dartFiles[resolution.importedFilePath];
        if (importedFile != null) {
          return _findSymbolInFile(symbolName, importedFile);
        }
      }
    }

    return null;
  }

  bool _isSubclassOf(String? className, String targetClass) {
    if (className == null) return false;
    if (className == targetClass) return true;

    // Find class declaration
    for (final file in dartFiles.values) {
      final classDecl = file.classDeclarations.firstWhereOrNull(
        (c) => c.name == className,
      );

      if (classDecl?.superclass != null) {
        final superName = _extractTypeName(classDecl!.superclass!);
        if (_isSubclassOf(superName, targetClass)) {
          return true;
        }
      }
    }

    return false;
  }

  void _collectAllSymbols(DartFile file, Set<String> symbols) {
    for (final classDecl in file.classDeclarations) {
      symbols.add(classDecl.name);
    }
    for (final func in file.functionDeclarations) {
      symbols.add(func.name);
    }
    for (final variable in file.variableDeclarations) {
      symbols.add(variable.name);
    }
  }

  String _importResolutionKey(String fromFile, String uri, String? prefix) {
    return '$fromFile|$uri|${prefix ?? "default"}';
  }

  String _buildQualifiedName(String? package, String symbolName) {
    if (package != null) {
      return '$package::$symbolName';
    }
    return symbolName;
  }

  String? _extractPackageFromPath(String filePath) {
    // Extract package name from file path
    // Example: /path/to/my_app/lib/main.dart -> my_app
    final parts = filePath.split('/');
    final libIndex = parts.indexOf('lib');
    if (libIndex > 0) {
      return parts[libIndex - 1];
    }
    return null;
  }

  String _extractTypeName(TypeIR type) {
    if (type is SimpleTypeIR) {
      return type.name;
    }
    return type.toString();
  }

  bool _isBuiltInType(String typeName) {
    const builtIns = {
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
      'Iterable',
      'Comparable',
    };
    return builtIns.contains(typeName);
  }

  String _getDirectory(String filePath) {
    final lastSlash = filePath.lastIndexOf('/');
    return lastSlash >= 0 ? filePath.substring(0, lastSlash) : '';
  }

  String _normalizePath(String baseDir, String relativePath) {
    final parts = [...baseDir.split('/'), ...relativePath.split('/')];
    final normalized = <String>[];

    for (final part in parts) {
      if (part == '..') {
        if (normalized.isNotEmpty) {
          normalized.removeLast();
        }
      } else if (part != '.' && part.isNotEmpty) {
        normalized.add(part);
      }
    }

    return normalized.join('/');
  }

  void _addIssue({
    required IssueSeverity severity,
    required IssueCategory category,
    required String message,
    required SourceLocationIR sourceLocation,
  }) {
    // Generate unique issue ID
    final issueId =
        'issue_${resolutionIssues.length}_${DateTime.now().millisecondsSinceEpoch}';

    // Generate issue code from category
    final issueCode = _generateIssueCode(category, severity);

    resolutionIssues.add(
      AnalysisIssue(
        id: issueId,
        code: issueCode,
        severity: severity,
        category: category,
        message: message,
        sourceLocation: sourceLocation,
      ),
    );
  }

  String _generateIssueCode(IssueCategory category, IssueSeverity severity) {
    final categoryPrefix = category.name.toUpperCase().substring(0, 3);
    final severityPrefix = severity.name.toUpperCase().substring(0, 1);
    return '$categoryPrefix$severityPrefix${resolutionIssues.length.toString().padLeft(4, '0')}';
  }
}

// =========================================================================
// SUPPORTING TYPES
// =========================================================================

typedef Declaration = dynamic; // ClassDecl, FunctionDecl, or VariableDecl

class ImportResolution {
  final String importedFilePath;
  final Set<String> importedSymbols;
  final String? prefix;

  ImportResolution({
    required this.importedFilePath,
    required this.importedSymbols,
    this.prefix,
  });
}

enum ProviderTypeState { changeNotifier, stateNotifier, riverpod, bloc, custom }

class ResolutionInfo {
  final Map<String, ImportResolution> importResolutions;
  final Map<String, String> widgetStateBindings;
  final Map<String, ProviderInfo> providerRegistry;
  final Map<String, Declaration> resolvedSymbols;
  final List<AnalysisIssue> issues;

  ResolutionInfo({
    required this.importResolutions,
    required this.widgetStateBindings,
    required this.providerRegistry,
    required this.resolvedSymbols,
    required this.issues,
  });
}

// Extension to DartFile to hold resolution info
extension DartFileResolution on DartFile {
  static final _resolutionData = <String, ResolutionInfo>{};

  ResolutionInfo? get resolutionInfo => _resolutionData[filePath];
  set resolutionInfo(ResolutionInfo? value) {
    if (value != null) {
      _resolutionData[filePath] = value;
    } else {
      _resolutionData.remove(filePath);
    }
  }
}
