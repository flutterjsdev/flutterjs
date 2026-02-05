// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// lib/src/analyzer/file_declaration_generator.dart

import 'package:analyzer/dart/ast/ast.dart' as ast;
import 'package:analyzer/dart/ast/visitor.dart';
import 'analyzing_project.dart';
import 'analyze_flutter_app.dart';
import 'model/analyzer_model.dart';
import 'model/other.dart' as other;
import 'model/state.dart';
import 'model/widget.dart';
import 'type_registry.dart';
import 'dependency_graph.dart';

// lib/src/analyzer/file_declaration_generator.dart

/// Context for analyzing a single file
///
/// This provides the necessary context and utilities for analyzing
/// a single Dart file, including access to:
/// - Type registry for type resolution
/// - Dependency graph for understanding file relationships
class FileAnalysisContext {
  final String currentFile;
  final TypeRegistry typeRegistry;
  final DependencyGraph dependencyGraph;
  final FileAnalysisResult analysisResult;

  FileAnalysisContext({
    required this.currentFile,
    required this.typeRegistry,
    required this.dependencyGraph,
    required this.analysisResult,
  });

  /// Get dependencies of current file
  List<String> getDependencies() {
    return dependencyGraph.getDependencies(currentFile);
  }

  /// Get all dependents (files that depend on this file)
  List<String> getDependents() {
    return dependencyGraph.getDependents(currentFile);
  }

  /// Resolve a type name to its full information
  TypeInfo? resolveType(String typeName) {
    return typeRegistry.lookupType(typeName);
  }

  /// Check if a type is available in current context
  bool isTypeAvailable(String typeName) {
    return typeRegistry.isTypeAvailableIn(
      typeName,
      currentFile,
      analysisResult,
    );
  }
}

/// Simple metadata extracted from a Dart file
///
/// This is NOT IR - just basic information about what's in the file
/// to help with change detection and dependency tracking
class FileMetadata {
  final String filePath;
  final List<String> widgetNames;
  final List<String> stateClassNames;
  final List<String> classNames;
  final List<String> functionNames;
  final List<String> imports;
  final List<String> exports;
  final String? libraryName;

  FileMetadata({
    required this.filePath,
    required this.widgetNames,
    required this.stateClassNames,
    required this.classNames,
    required this.functionNames,
    required this.imports,
    required this.exports,
    this.libraryName,
  });

  /// Get all declaration names (for quick lookup)
  List<String> getAllDeclarations() {
    return [
      ...widgetNames,
      ...stateClassNames,
      ...classNames,
      ...functionNames,
    ];
  }

  @override
  String toString() {
    return 'FileMetadata('
        'widgets: ${widgetNames.length}, '
        'states: ${stateClassNames.length}, '
        'classes: ${classNames.length}, '
        'functions: ${functionNames.length}'
        ')';
  }
}

/// Extracts basic metadata from Dart AST
///
/// This visitor collects only the essential information needed for:
/// 1. Change detection
/// 2. Dependency tracking
/// 3. Type registry population
///
/// NO IR GENERATION - that happens in Phase 2
class FileMetadataExtractor extends RecursiveAstVisitor<void> {
  final String filePath;

  // Collected metadata
  final List<String> _widgetNames = [];
  final List<String> _stateClassNames = [];
  final List<String> _classNames = [];
  final List<String> _functionNames = [];
  final List<String> _imports = [];
  final List<String> _exports = [];

  String? _libraryName;
  String? _currentClassName;

  FileMetadataExtractor(this.filePath);

  /// Build the final metadata
  FileMetadata buildMetadata() {
    return FileMetadata(
      filePath: filePath,
      widgetNames: List.unmodifiable(_widgetNames),
      stateClassNames: List.unmodifiable(_stateClassNames),
      classNames: List.unmodifiable(_classNames),
      functionNames: List.unmodifiable(_functionNames),
      imports: List.unmodifiable(_imports),
      exports: List.unmodifiable(_exports),
      libraryName: _libraryName,
    );
  }

  // ==========================================================================
  // LIBRARY & IMPORTS
  // ==========================================================================

  @override
  void visitLibraryDirective(ast.LibraryDirective node) {
    _libraryName = node.name?.toString();
    super.visitLibraryDirective(node);
  }

  @override
  void visitImportDirective(ast.ImportDirective node) {
    final uri = node.uri.stringValue ?? '';
    if (uri.isNotEmpty) {
      _imports.add(uri);
    }
    super.visitImportDirective(node);
  }

  @override
  void visitExportDirective(ast.ExportDirective node) {
    final uri = node.uri.stringValue ?? '';
    if (uri.isNotEmpty) {
      _exports.add(uri);
    }
    super.visitExportDirective(node);
  }

  // ==========================================================================
  // CLASS DECLARATIONS
  // ==========================================================================

  @override
  void visitClassDeclaration(ast.ClassDeclaration node) {
    final className = node.name.lexeme;
    _currentClassName = className;

    final extendsClause = node.extendsClause?.superclass.name.toString();
    final isWidget = _isWidgetClass(extendsClause);
    final isState = _isStateClass(node);

    if (isWidget) {
      _widgetNames.add(className);
    } else if (isState) {
      _stateClassNames.add(className);
    } else {
      _classNames.add(className);
    }

    super.visitClassDeclaration(node);
    _currentClassName = null;
  }

  bool _isWidgetClass(String? superClass) {
    return superClass == 'StatelessWidget' ||
        superClass == 'StatefulWidget' ||
        superClass == 'InheritedWidget';
  }

  bool _isStateClass(ast.ClassDeclaration node) {
    final extendsClause = node.extendsClause?.superclass.name.toString();
    return extendsClause?.startsWith('State<') ?? false;
  }

  // ==========================================================================
  // FUNCTION DECLARATIONS
  // ==========================================================================

  @override
  void visitFunctionDeclaration(ast.FunctionDeclaration node) {
    // Skip if inside a class (already handled)
    if (_currentClassName != null) {
      super.visitFunctionDeclaration(node);
      return;
    }

    final functionName = node.name.lexeme;
    _functionNames.add(functionName);

    super.visitFunctionDeclaration(node);
  }
}

// ==========================================================================
// ANALYSIS SUMMARY
// ==========================================================================

/// Summary of analysis results for a file
///
/// Contains both the parsed AST and extracted metadata
/// This is what Phase 1 produces and Phase 2 consumes
class FileAnalysisSummary {
  final String filePath;
  final FileAnalysisResult analysisResult;
  final FileMetadata metadata;
  final bool hasErrors;

  FileAnalysisSummary({
    required this.filePath,
    required this.analysisResult,
    required this.metadata,
    required this.hasErrors,
  });

  /// Check if this file needs IR generation
  bool needsIRGeneration(Set<String> changedFiles) {
    return changedFiles.contains(filePath);
  }

  @override
  String toString() {
    return 'FileAnalysisSummary('
        'path: $filePath, '
        'metadata: $metadata, '
        'errors: $hasErrors'
        ')';
  }
}

// ==========================================================================
// FILE ANALYZER
// ==========================================================================

/// Analyzes a single file and produces a summary
///
/// This is the main entry point for Phase 1 file analysis
class FileAnalyzer {
  final FileAnalysisContext context;

  FileAnalyzer(this.context);

  /// Analyze the file and produce a summary
  FileAnalysisSummary analyze() {
    final unit = context.analysisResult.unit;

    // Extract metadata
    final extractor = FileMetadataExtractor(context.currentFile);
    unit.accept(extractor);
    final metadata = extractor.buildMetadata();

    // Check for errors
    final hasErrors = context.analysisResult.hasErrors;

    if (hasErrors) {
      print('  ⚠️  File has ${context.analysisResult.errorList.length} errors');
      for (final error in context.analysisResult.errorList.take(3)) {
        print('     - ${error.message}');
      }
      if (context.analysisResult.errorList.length > 3) {
        print(
          '     ... and ${context.analysisResult.errorList.length - 3} more',
        );
      }
    }

    return FileAnalysisSummary(
      filePath: context.currentFile,
      analysisResult: context.analysisResult,
      metadata: metadata,
      hasErrors: hasErrors,
    );
  }
}

// ==========================================================================
// PROJECT ANALYSIS ORCHESTRATOR
// ==========================================================================

/// Orchestrates the analysis of all files in a project
///
/// This coordinates:
/// 1. Dependency resolution
/// 2. Change detection
/// 3. Type registry population
/// 4. File metadata extraction
class ProjectAnalysisOrchestrator {
  final ProjectAnalyzer projectAnalyzer;

  ProjectAnalysisOrchestrator(this.projectAnalyzer);

  /// Run the complete analysis pipeline
  Future<ProjectAnalysisReport> analyze() async {
    print('\n🔍 Starting Project Analysis Phase 1');
    print('=' * 60);

    // Run the analyzer
    final result = await projectAnalyzer.analyzeProject();

    // Extract file summaries
    final summaries = <String, FileAnalysisSummary>{};
    int processedCount = 0;

    for (final entry in result.parsedUnits.entries) {
      final filePath = entry.key;
      final parsedInfo = entry.value;

      try {
        // Create context
        final context = FileAnalysisContext(
          currentFile: filePath,
          typeRegistry: result.typeRegistry,
          dependencyGraph: result.dependencyGraph,
          analysisResult: parsedInfo.analysisResult,
        );

        // Analyze file
        final analyzer = FileAnalyzer(context);
        final summary = analyzer.analyze();
        summaries[filePath] = summary;

        processedCount++;
        if (processedCount % 20 == 0) {
          print(
            '  Processed $processedCount/${result.parsedUnits.length} files...',
          );
        }
      } catch (e, stackTrace) {
        print('  ❌ Error analyzing $filePath: $e');
        if (projectAnalyzer.enableVerboseLogging) {
          print('     Stack trace: $stackTrace');
        }
      }
    }

    // Create report
    final report = ProjectAnalysisReport(
      analysisResult: result,
      fileSummaries: summaries,
      changedFiles: result.changedFiles,
    );

    _printReport(report);

    return report;
  }

  void _printReport(ProjectAnalysisReport report) {
    print('\n📊 Analysis Report');
    print('=' * 60);
    print('Total files analyzed: ${report.fileSummaries.length}');
    print('Changed files: ${report.changedFiles.length}');
    print('Files with errors: ${report.filesWithErrors.length}');
    print('Total widgets: ${report.totalWidgets}');
    print('Total state classes: ${report.totalStateClasses}');
    print('Total classes: ${report.totalClasses}');
    print('Total functions: ${report.totalFunctions}');
    print(
      'Total types in registry: ${report.analysisResult.typeRegistry.typeCount}',
    );

    // Cache statistics
    final stats = report.analysisResult.statistics;
    print('Cache hit rate: ${(stats.cacheHitRate * 100).toStringAsFixed(1)}%');
    print(
      'Average time per file: ${stats.avgTimePerFile.toStringAsFixed(1)}ms',
    );
    print('=' * 60);

    if (report.filesWithErrors.isNotEmpty) {
      print('\n⚠️  Files with errors:');
      for (final file in report.filesWithErrors.take(5)) {
        final filename = file.split('/').last;
        print('  - $filename');
      }
      if (report.filesWithErrors.length > 5) {
        print('  ... and ${report.filesWithErrors.length - 5} more');
      }
    }

    if (report.changedFiles.isNotEmpty) {
      print('\n🔄 Changed files (need IR generation):');
      for (final file in report.changedFiles.take(10)) {
        final filename = file.split('/').last;
        print('  - $filename');
      }
      if (report.changedFiles.length > 10) {
        print('  ... and ${report.changedFiles.length - 10} more');
      }
    }

    print('\n✅ Phase 1 Complete - Ready for IR Generation');
    print('=' * 60);
  }
}

// ==========================================================================
// ANALYSIS REPORT
// ==========================================================================

/// Complete report of Phase 1 analysis
///
/// This is what gets passed to Phase 2 (IR Generation)
class ProjectAnalysisReport {
  final ProjectAnalysisResult analysisResult;
  final Map<String, FileAnalysisSummary> fileSummaries;
  final Set<String> changedFiles;

  ProjectAnalysisReport({
    required this.analysisResult,
    required this.fileSummaries,
    required this.changedFiles,
  });

  /// Get files that need IR generation
  List<String> getFilesNeedingIR() {
    return changedFiles.toList();
  }

  /// Get summary for a specific file
  FileAnalysisSummary? getSummary(String filePath) {
    return fileSummaries[filePath];
  }

  /// Get all files with errors
  List<String> get filesWithErrors {
    return fileSummaries.entries
        .where((e) => e.value.hasErrors)
        .map((e) => e.key)
        .toList();
  }

  /// Statistics
  int get totalWidgets => fileSummaries.values.fold(
    0,
    (sum, s) => sum + s.metadata.widgetNames.length,
  );

  int get totalStateClasses => fileSummaries.values.fold(
    0,
    (sum, s) => sum + s.metadata.stateClassNames.length,
  );

  int get totalClasses => fileSummaries.values.fold(
    0,
    (sum, s) => sum + s.metadata.classNames.length,
  );

  int get totalFunctions => fileSummaries.values.fold(
    0,
    (sum, s) => sum + s.metadata.functionNames.length,
  );

  /// Get all widget names across the project
  List<String> getAllWidgetNames() {
    return fileSummaries.values.expand((s) => s.metadata.widgetNames).toList();
  }

  /// Get all state class names across the project
  List<String> getAllStateClassNames() {
    return fileSummaries.values
        .expand((s) => s.metadata.stateClassNames)
        .toList();
  }

  /// Check if analysis is ready for Phase 2
  bool get isReadyForIRGeneration {
    return filesWithErrors.isEmpty;
  }

  /// Get error summary
  String getErrorSummary() {
    if (filesWithErrors.isEmpty) {
      return 'No errors detected';
    }

    final buffer = StringBuffer();
    buffer.writeln('${filesWithErrors.length} files with errors:');

    for (final file in filesWithErrors.take(5)) {
      final summary = fileSummaries[file];
      if (summary != null) {
        final errorCount = summary.analysisResult.errorList.length;
        buffer.writeln('  - $file: $errorCount errors');
      }
    }

    if (filesWithErrors.length > 5) {
      buffer.writeln('  ... and ${filesWithErrors.length - 5} more');
    }

    return buffer.toString();
  }
}
// ==========================================================================
// DECLARATION LINKER
// ==========================================================================

/// Links FileDeclarations into a complete FlutterAppDeclaration
class DeclarationLinker {
  final Map<String, FileDeclaration> fileDeclarations;
  final DependencyGraph dependencyGraph;
  final TypeRegistry typeRegistry;

  DeclarationLinker({
    required this.fileDeclarations,
    required this.dependencyGraph,
    required this.typeRegistry,
  });

  FlutterAppDeclaration link() {
    final allWidgets = <WidgetDeclaration>[];
    final allStateClasses = <StateClassDeclaration>[];
    final allFunctions = <FunctionDeclaration>[];
    final allProviders = <ProviderDeclaration>[];
    final allImports = <ImportDeclaration>[];

    // Collect all declarations from files
    for (final fileDeclaration in fileDeclarations.values) {
      allWidgets.addAll(fileDeclaration.widgets);
      allStateClasses.addAll(fileDeclaration.stateClasses);
      allFunctions.addAll(fileDeclaration.functions);
      allImports.addAll(fileDeclaration.imports);

      // Identify providers (classes extending ChangeNotifier, etc.)
      for (final classDecl in fileDeclaration.classes) {
        if (_isProviderClass(classDecl)) {
          allProviders.add(_convertToProvider(classDecl));
        }
      }
    }

    // Link stateful widgets with their state classes
    _linkWidgetsWithStates(allWidgets, allStateClasses);

    // Build dependency graph model
    final dependencyGraphModel = _buildDependencyGraphModel(
      allWidgets,
      allStateClasses,
      allProviders,
    );

    return FlutterAppDeclaration(
      version: 1,
      widgets: allWidgets,
      stateClasses: allStateClasses,
      functions: allFunctions,
      routes: [], // TODO: Extract routes from navigation code
      animations: [], // TODO: Extract animations
      providers: allProviders,
      imports: allImports,
      themes: [], // TODO: Extract theme data
      dependencyGraph: dependencyGraphModel,
      fileStructure: _buildFileStructure(),
    );
  }

  void _linkWidgetsWithStates(
    List<WidgetDeclaration> widgets,
    List<StateClassDeclaration> stateClasses,
  ) {
    final stateClassMap = <String, StateClassDeclaration>{};
    for (final state in stateClasses) {
      stateClassMap[state.widgetName] = state;
    }

    // Link each stateful widget with its state
    for (final widget in widgets) {
      if (widget.isStateful && widget.stateClassName != null) {
        final stateClass = stateClassMap[widget.name];

        if (stateClass != null) {
          // Store the state class reference in the widget
          // Note: This requires adding a field to WidgetDeclaration:
          // StateClassDeclaration? linkedStateClass;

          // Since we can't modify the widget object directly (it's likely immutable),
          // we can create a mapping or enhance the widget's metadata
          // For now, the validation in _validateWidgets already checks this relationship

          // Alternative: If WidgetDeclaration is mutable, you could do:
          // widget.linkedStateClass = stateClass;

          // Or create a separate mapping:
          // _widgetStateLinks[widget.id] = stateClass;
        }
      }
    }
  }

  bool _isProviderClass(ClassDeclaration classDecl) {
    return classDecl.superClass == 'ChangeNotifier' ||
        classDecl.superClass == 'ValueNotifier' ||
        classDecl.mixins.contains('ChangeNotifier');
  }

  ProviderDeclaration _convertToProvider(ClassDeclaration classDecl) {
    final methods = classDecl.methods
        .map(
          (m) => other.ProviderMethodDeclaration(
            name: m.name,
            returnType: m.returnType,
            parameters: m.parameters,
            notifiesListeners: _methodNotifiesListeners(m),
          ),
        )
        .toList();

    return ProviderDeclaration(
      id: classDecl.id,
      name: classDecl.name,
      filePath: classDecl.filePath,
      type: _determineProviderType(classDecl),
      valueType: classDecl.name,
      methods: methods,
      state: classDecl.properties,
      location: classDecl.location,
    );
  }

  bool _methodNotifiesListeners(WidgetMethodDeclaration method) {
    // Check if method body contains notifyListeners() call
    return method.body.any(
      (stmt) =>
          stmt is ExpressionStatementDeclaration &&
          stmt.expression is MethodCallDeclaration &&
          (stmt.expression as MethodCallDeclaration).methodName ==
              'notifyListeners',
    );
  }

  ProviderType _determineProviderType(ClassDeclaration classDecl) {
    if (classDecl.superClass == 'ChangeNotifier') {
      return ProviderType.changeNotifier;
    } else if (classDecl.superClass == 'ValueNotifier') {
      return ProviderType.valueNotifier;
    }
    return ProviderType.changeNotifier;
  }

  DependencyGraphModel _buildDependencyGraphModel(
    List<WidgetDeclaration> widgets,
    List<StateClassDeclaration> stateClasses,
    List<ProviderDeclaration> providers,
  ) {
    final nodes = <DependencyNode>[];
    final edges = <DependencyEdge>[];
    final nodeMap = <String, DependencyNode>{};

    // Add widget nodes
    for (final widget in widgets) {
      final node = DependencyNode(
        id: widget.id,
        type: DependencyType.widget,
        name: widget.name,
      );
      nodes.add(node);
      nodeMap[widget.id] = node;
    }

    // Add state nodes
    for (final state in stateClasses) {
      final node = DependencyNode(
        id: state.id,
        type: DependencyType.state,
        name: state.name,
      );
      nodes.add(node);
      nodeMap[state.id] = node;
    }

    // Add provider nodes
    for (final provider in providers) {
      final node = DependencyNode(
        id: provider.id,
        type: DependencyType.provider,
        name: provider.name,
      );
      nodes.add(node);
      nodeMap[provider.id] = node;
    }

    // Build edges: Link stateful widgets to their state classes
    for (final widget in widgets) {
      if (widget.isStateful && widget.stateClassName != null) {
        final stateClass = stateClasses.firstWhere(
          (state) => state.widgetName == widget.name,
          orElse: () =>
              stateClasses.first, // fallback (should validate earlier)
        );

        edges.add(
          DependencyEdge(
            fromId: widget.id,
            toId: stateClass.id,
            type: EdgeType.hasState,
            label: 'creates',
          ),
        );
      }
    }

    // Build edges: Widget composition (parent-child relationships)
    for (final widget in widgets) {
      if (widget.buildMethod != null) {
        final childWidgets = _extractChildWidgetReferences(widget.buildMethod!);

        for (final childName in childWidgets) {
          String widgetPath = '';
          final childWidget = widgets.firstWhere(
            (w) => w.name == childName,
            orElse: () {
              widgetPath = widgets.isEmpty
                  ? '<unknown>'
                  : widgets.first.filePath;
              return WidgetDeclaration.empty(widgetPath);
            },
          );

          if (childWidget != WidgetDeclaration.empty(widgetPath)) {
            edges.add(
              DependencyEdge(
                fromId: widget.id,
                toId: childWidget.id,
                type: EdgeType.uses,
                label: 'renders',
              ),
            );
          }
        }
      }
    }

    // Build edges: Provider dependencies (widgets that use providers)
    for (final widget in widgets) {
      final usedProviders = _extractProviderReferences(widget);

      for (final providerName in usedProviders) {
        String providerPath = '';
        final provider = providers.firstWhere(
          (p) => p.name == providerName,
          orElse: () {
            providerPath = providers.isEmpty
                ? '<unknown>'
                : providers.first.filePath;
            return ProviderDeclaration.empty(providerPath);
          },
        );

        if (provider != ProviderDeclaration.empty(providerPath)) {
          edges.add(
            DependencyEdge(
              fromId: widget.id,
              toId: provider.id,
              type: EdgeType.dependsOn,
              label: 'consumes',
            ),
          );
        }
      }
    }

    // Build edges: State class dependencies on providers
    for (final state in stateClasses) {
      final usedProviders = _extractProviderReferencesFromState(state);

      for (final providerName in usedProviders) {
        String providerPath = '';
        final provider = providers.firstWhere(
          (p) => p.name == providerName,
          orElse: () {
            providerPath = providers.isEmpty
                ? '<unknown>'
                : providers.first.filePath;
            return ProviderDeclaration.empty(providerPath);
          },
        );

        if (provider != ProviderDeclaration.empty(providerPath)) {
          edges.add(
            DependencyEdge(
              fromId: state.id,
              toId: provider.id,
              type: EdgeType.dependsOn,
              label: 'observes',
            ),
          );
        }
      }
    }

    return DependencyGraphModel(nodes: nodes, edges: edges);
  }

  Set<String> _extractProviderReferencesFromState(StateClassDeclaration state) {
    final providers = <String>{};

    void scanStatements(List<StatementDeclaration> statements) {
      for (final stmt in statements) {
        if (stmt is VariableDeclarationDeclaration &&
            stmt.initializer != null) {
          if (stmt.initializer is MethodCallDeclaration) {
            final call = stmt.initializer as MethodCallDeclaration;
            if (call.methodName == 'of' ||
                call.methodName == 'read' ||
                call.methodName == 'watch') {
              // Provider detected
            }
          }
        } else if (stmt is BlockStatementDeclaration) {
          scanStatements(stmt.statements);
        }
      }
    }

    if (state.initState != null) {
      scanStatements(state.initState!.body);
    }

    for (final method in state.methods) {
      scanStatements(method.body);
    }

    return providers;
  }

  Set<String> _extractProviderReferences(WidgetDeclaration widget) {
    final providers = <String>{};

    void scanForProviders(List<StatementDeclaration> statements) {
      for (final stmt in statements) {
        if (stmt is VariableDeclarationDeclaration &&
            stmt.initializer != null) {
          if (stmt.initializer is MethodCallDeclaration) {
            final call = stmt.initializer as MethodCallDeclaration;
            // Look for Provider.of<Type>(context) or context.read<Type>()
            if (call.methodName == 'of' &&
                call.target is IdentifierExpressionDeclaration) {
              final target = call.target as IdentifierExpressionDeclaration;
              if (target.name.contains('Provider')) {
                // Extract type from generic if possible
                // This is simplified - real implementation would parse generics
              }
            } else if (call.methodName == 'read' ||
                call.methodName == 'watch') {
              // context.read<ProviderType>()
              // Extract provider type
            }
          }
        } else if (stmt is BlockStatementDeclaration) {
          scanForProviders(stmt.statements);
        }
      }
    }

    if (widget.buildMethod != null) {
      scanForProviders(widget.buildMethod!.body);
    }

    for (final method in widget.methods) {
      scanForProviders(method.body);
    }

    return providers;
  }

  Set<String> _extractChildWidgetReferences(
    BuildMethodDeclaration buildMethod,
  ) {
    final childWidgets = <String>{};

    void scanExpression(ExpressionDeclaration expr) {
      if (expr is InstanceCreationDeclaration) {
        // Check if it's a widget instantiation
        if (!expr.className.startsWith('_') &&
            expr.className != 'Container' &&
            expr.className != 'Scaffold') {
          childWidgets.add(expr.className);
        }

        // Scan arguments recursively
        for (final arg in expr.arguments) {
          scanExpression(arg);
        }
        for (final namedArg in expr.namedArguments.values) {
          scanExpression(namedArg);
        }
      } else if (expr is MethodCallDeclaration) {
        if (expr.target != null) {
          scanExpression(expr.target!);
        }
        for (final arg in expr.arguments) {
          scanExpression(arg);
        }
        for (final namedArg in expr.namedArguments.values) {
          scanExpression(namedArg);
        }
      } else if (expr is ListLiteralDeclaration) {
        for (final element in expr.elements) {
          scanExpression(element);
        }
      }
    }

    for (final stmt in buildMethod.body) {
      if (stmt is ReturnStatementDeclaration && stmt.expression != null) {
        scanExpression(stmt.expression!);
      } else if (stmt is ExpressionStatementDeclaration) {
        scanExpression(stmt.expression);
      }
    }

    return childWidgets;
  }

  Map<String, List<String>> _buildFileStructure() {
    final structure = <String, List<String>>{};

    for (final entry in fileDeclarations.entries) {
      final filePath = entry.key;
      final fileDeclaration = entry.value;

      final declarations = <String>[
        ...fileDeclaration.widgets.map((w) => 'Widget:${w.name}'),
        ...fileDeclaration.stateClasses.map((s) => 'State:${s.name}'),
        ...fileDeclaration.classes.map((c) => 'Class:${c.name}'),
        ...fileDeclaration.functions.map((f) => 'Function:${f.name}'),
      ];

      structure[filePath] = declarations;
    }

    return structure;
  }
}

// ==========================================================================
// DECLARATION VALIDATOR
// ==========================================================================

/// Validates the linked FlutterAppDeclaration for errors and inconsistencies
class DeclarationValidator {
  final FlutterAppDeclaration declaration;
  final TypeRegistry typeRegistry;
  final List<ValidationError> _errors = [];
  final List<ValidationWarning> _warnings = [];

  DeclarationValidator(this.declaration, this.typeRegistry);

  ValidationResult validate() {
    _errors.clear();
    _warnings.clear();

    _validateWidgets();
    _validateStateClasses();
    _validateProviders();
    _validateDependencies();
    _validateImports();

    return ValidationResult(
      isValid: _errors.isEmpty,
      errors: List.unmodifiable(_errors),
      warnings: List.unmodifiable(_warnings),
    );
  }

  // ==========================================================================
  // WIDGET VALIDATION
  // ==========================================================================

  void _validateWidgets() {
    final widgetNames = <String>{};

    for (final widget in declaration.widgets) {
      // Check for duplicate widget names
      if (widgetNames.contains(widget.name)) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.duplicateDeclaration,
            message: 'Duplicate widget declaration: ${widget.name}',
            filePath: widget.filePath,
            location: widget.location,
          ),
        );
      }
      widgetNames.add(widget.name);

      // Validate build method exists
      if (widget.buildMethod == null) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.missingBuildMethod,
            message: 'Widget ${widget.name} is missing build method',
            filePath: widget.filePath,
            location: widget.location,
          ),
        );
      }

      // Validate stateful widget has corresponding state class
      if (widget.isStateful && widget.stateClassName != null) {
        final hasStateClass = declaration.stateClasses.any(
          (state) => state.widgetName == widget.name,
        );

        if (!hasStateClass) {
          _errors.add(
            ValidationError(
              type: ValidationErrorType.missingStateClass,
              message:
                  'Stateful widget ${widget.name} is missing corresponding state class',
              filePath: widget.filePath,
              location: widget.location,
            ),
          );
        }
      }

      // Validate required properties
      for (final property in widget.properties) {
        if (property.isRequired && property.defaultValue != null) {
          _warnings.add(
            ValidationWarning(
              type: ValidationWarningType.redundantDefault,
              message:
                  'Property ${property.name} is marked required but has a default value',
              filePath: widget.filePath,
              location: property.location,
            ),
          );
        }
      }

      // Validate property types exist in type registry
      _validatePropertyTypes(widget);
    }
  }

  void _validatePropertyTypes(WidgetDeclaration widget) {
    for (final property in widget.properties) {
      final cleanType = _cleanTypeName(property.type);

      // Skip validation for built-in Dart and Flutter types
      if (_isBuiltInType(cleanType)) continue;

      // Check if custom type exists in registry
      if (typeRegistry.lookupType(cleanType) == null) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.unknownType,
            message:
                'Property ${property.name} in ${widget.name} has unknown type: ${property.type}',
            filePath: widget.filePath,
            location: property.location,
          ),
        );
      }
    }
  }

  String _cleanTypeName(String type) {
    // Remove nullable markers, generics, and whitespace
    return type.replaceAll('?', '').replaceAll(RegExp(r'<.*>'), '').trim();
  }

  bool _isBuiltInType(String type) {
    const builtInTypes = {
      // Dart core types
      'int', 'double', 'num', 'String', 'bool', 'dynamic', 'void', 'Object',
      'List', 'Map', 'Set', 'Iterable', 'Future', 'Stream', 'Function',

      // Flutter common types
      'Widget', 'BuildContext', 'Key', 'Color', 'TextStyle', 'EdgeInsets',
      'BoxDecoration',
      'Border',
      'BorderRadius',
      'Alignment',
      'MainAxisAlignment',
      'CrossAxisAlignment', 'MainAxisSize', 'Axis', 'TextAlign', 'FontWeight',
      'Curve', 'Duration', 'Size', 'Offset', 'Rect', 'VoidCallback',
      'ValueChanged', 'AsyncCallback', 'AnimationController', 'Animation',
      'TextEditingController', 'ScrollController', 'PageController',
      'FocusNode', 'GlobalKey', 'NavigatorState', 'ScaffoldState',
    };

    return builtInTypes.contains(type);
  }

  // ==========================================================================
  // STATE CLASS VALIDATION
  // ==========================================================================

  void _validateStateClasses() {
    final stateClassNames = <String>{};

    for (final stateClass in declaration.stateClasses) {
      // Check for duplicate state class names
      if (stateClassNames.contains(stateClass.name)) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.duplicateDeclaration,
            message: 'Duplicate state class declaration: ${stateClass.name}',
            filePath: stateClass.filePath,
            location: stateClass.location,
          ),
        );
      }
      stateClassNames.add(stateClass.name);

      // Validate corresponding widget exists
      final hasWidget = declaration.widgets.any(
        (widget) => widget.name == stateClass.widgetName,
      );

      if (!hasWidget && stateClass.widgetName.isNotEmpty) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.orphanedStateClass,
            message:
                'State class ${stateClass.name} references non-existent widget ${stateClass.widgetName}',
            filePath: stateClass.filePath,
            location: stateClass.location,
          ),
        );
      }

      // Validate dispose calls for controllers
      _validateDispose(stateClass);
    }
  }

  void _validateDispose(StateClassDeclaration stateClass) {
    // Find controller properties
    final controllers = stateClass.stateVariables.where(
      (prop) =>
          prop.type.contains('Controller') &&
          !prop.type.startsWith('Animation'),
    );

    if (controllers.isEmpty) return;

    // Check if dispose method exists
    if (stateClass.dispose == null) {
      _warnings.add(
        ValidationWarning(
          type: ValidationWarningType.missingDispose,
          message:
              'State class ${stateClass.name} has controllers but no dispose method',
          filePath: stateClass.filePath,
          location: stateClass.location,
        ),
      );
      return;
    }

    // Check if controllers are disposed
    for (final controller in controllers) {
      final isDisposed = _checkControllerDisposed(
        controller.name,
        stateClass.dispose!.body,
      );

      if (!isDisposed) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.undisposedController,
            message:
                'Controller ${controller.name} in ${stateClass.name} is not disposed',
            filePath: stateClass.filePath,
            location: controller.location,
          ),
        );
      }
    }
  }

  bool _checkControllerDisposed(
    String controllerName,
    List<StatementDeclaration> body,
  ) {
    for (final stmt in body) {
      if (stmt is ExpressionStatementDeclaration) {
        final expr = stmt.expression;
        if (expr is MethodCallDeclaration) {
          if (expr.target is IdentifierExpressionDeclaration) {
            final target = expr.target as IdentifierExpressionDeclaration;
            if (target.name == controllerName && expr.methodName == 'dispose') {
              return true;
            }
          }
        }
      } else if (stmt is BlockStatementDeclaration) {
        if (_checkControllerDisposed(controllerName, stmt.statements)) {
          return true;
        }
      }
    }
    return false;
  }

  // ==========================================================================
  // PROVIDER VALIDATION
  // ==========================================================================

  void _validateProviders() {
    final providerNames = <String>{};

    for (final provider in declaration.providers) {
      // Check for duplicate provider names
      if (providerNames.contains(provider.name)) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.duplicateDeclaration,
            message: 'Duplicate provider declaration: ${provider.name}',
            filePath: provider.filePath,
            location: provider.location,
          ),
        );
      }
      providerNames.add(provider.name);

      // Validate notifyListeners is called after state changes
      for (final method in provider.methods) {
        if (_modifiesState(method) && !method.notifiesListeners) {
          _warnings.add(
            ValidationWarning(
              type: ValidationWarningType.missingNotifyListeners,
              message:
                  'Method ${method.name} in provider ${provider.name} modifies state but does not call notifyListeners()',
              filePath: provider.filePath,
              location: provider.location,
            ),
          );
        }
      }
    }
  }

  bool _modifiesState(other.ProviderMethodDeclaration method) {
    // Check if method body contains assignments to state variables
    // This is a simplified check
    return method.parameters.isEmpty && method.returnType == 'void';
  }

  // ==========================================================================
  // DEPENDENCY VALIDATION
  // ==========================================================================

  void _validateDependencies() {
    // Check for circular dependencies
    final graph = declaration.dependencyGraph;
    final visited = <String>{};
    final recursionStack = <String>{};

    for (final node in graph.nodes) {
      if (_hasCycle(node.id, graph, visited, recursionStack)) {
        _errors.add(
          ValidationError(
            type: ValidationErrorType.circularDependency,
            message: 'Circular dependency detected involving ${node.name}',
            filePath: '',
            location: SourceLocation(line: 0, column: 0, offset: 0, length: 0),
          ),
        );
      }
    }
  }

  bool _hasCycle(
    String nodeId,
    DependencyGraphModel graph,
    Set<String> visited,
    Set<String> recursionStack,
  ) {
    if (recursionStack.contains(nodeId)) {
      return true;
    }

    if (visited.contains(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    final outgoingEdges = graph.edges.where((edge) => edge.fromId == nodeId);
    for (final edge in outgoingEdges) {
      if (_hasCycle(edge.toId, graph, visited, recursionStack)) {
        return true;
      }
    }

    recursionStack.remove(nodeId);
    return false;
  }

  // ==========================================================================
  // IMPORT VALIDATION
  // ==========================================================================

  void _validateImports() {
    final imports = declaration.imports;
    final usedPackages = <String>{};

    for (final import in imports) {
      // Check for duplicate imports
      if (usedPackages.contains(import.uri)) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.duplicateImport,
            message: 'Duplicate import: ${import.uri}',
            filePath: '',
            location: import.location,
          ),
        );
      }
      usedPackages.add(import.uri);

      // Warn about deferred imports (may not be necessary)
      if (import.isDeferred) {
        _warnings.add(
          ValidationWarning(
            type: ValidationWarningType.deferredImport,
            message: 'Deferred import detected: ${import.uri}',
            filePath: '',
            location: import.location,
          ),
        );
      }
    }
  }
}
// ==========================================================================
// VALIDATION RESULT TYPES
// ==========================================================================

class ValidationResult {
  final bool isValid;
  final List<ValidationError> errors;
  final List<ValidationWarning> warnings;

  ValidationResult({
    required this.isValid,
    required this.errors,
    required this.warnings,
  });

  bool get hasWarnings => warnings.isNotEmpty;

  @override
  String toString() {
    final buffer = StringBuffer();
    buffer.writeln('Validation Result: ${isValid ? "VALID" : "INVALID"}');

    if (errors.isNotEmpty) {
      buffer.writeln('\nErrors (${errors.length}):');
      for (final error in errors) {
        buffer.writeln('  - $error');
      }
    }

    if (warnings.isNotEmpty) {
      buffer.writeln('\nWarnings (${warnings.length}):');
      for (final warning in warnings) {
        buffer.writeln('  - $warning');
      }
    }

    return buffer.toString();
  }
}

class ValidationError {
  final ValidationErrorType type;
  final String message;
  final String filePath;
  final SourceLocation location;

  ValidationError({
    required this.type,
    required this.message,
    required this.filePath,
    required this.location,
  });

  @override
  String toString() =>
      '[$type] $message at $filePath:${location.line}:${location.column}';
}

class ValidationWarning {
  final ValidationWarningType type;
  final String message;
  final String filePath;
  final SourceLocation location;

  ValidationWarning({
    required this.type,
    required this.message,
    required this.filePath,
    required this.location,
  });

  @override
  String toString() =>
      '[$type] $message at $filePath:${location.line}:${location.column}';
}

enum ValidationErrorType {
  duplicateDeclaration,
  missingBuildMethod,
  missingStateClass,
  circularDependency,
  invalidType,
  missingRequiredParameter,
}

enum ValidationWarningType {
  redundantDefault,
  orphanedStateClass,
  missingDispose,
  undisposedController,
  missingNotifyListeners,
  duplicateImport,
  deferredImport,
  unusedImport,
  unknownType,
}

enum EdgeType { hasState, uses, dependsOn, renders }

class DependencyEdge {
  final String fromId;
  final String toId;
  final EdgeType type;
  final String label;

  DependencyEdge({
    required this.fromId,
    required this.toId,
    required this.type,
    required this.label,
  });
}

class RouteDeclaration {
  final String id;
  final String path;
  final String? widgetName;
  final SourceLocation location;

  RouteDeclaration({
    required this.id,
    required this.path,
    this.widgetName,
    required this.location,
  });
}

enum AnimationType { controller, tween, implicit }

class AnimationDeclaration {
  final String id;
  final String name;
  final String? controllerName;
  final String? duration;
  final String? curve;
  final AnimationType type;
  final String filePath;
  final SourceLocation location;

  AnimationDeclaration({
    required this.id,
    required this.name,
    this.controllerName,
    this.duration,
    this.curve,
    required this.type,
    required this.filePath,
    required this.location,
  });
}

class ThemeDeclaration {
  final String id;
  final String name;
  final String? primaryColor;
  final String? accentColor;
  final String? brightness;
  final String? fontFamily;
  final SourceLocation location;

  ThemeDeclaration({
    required this.id,
    required this.name,
    this.primaryColor,
    this.accentColor,
    this.brightness,
    this.fontFamily,
    required this.location,
  });
}
