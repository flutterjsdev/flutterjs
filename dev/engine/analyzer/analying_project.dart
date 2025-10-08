
import 'package:analyzer/dart/analysis/analysis_context.dart';
import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/file_system/physical_file_system.dart';
import 'package:path/path.dart' as path;
import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';

import '../ir/file_ir.dart';
import 'dependency_graph.dart';
import 'dependency_resolver.dart';
import 'flutter_app_ir.dart';
import 'incremental_cache.dart';
import 'type_registry.dart';

// void main() async {
//   final analyzer = ProjectAnalyzer('/path/to/flutter/project');
  
//   await analyzer.initialize();
  
//   // First run: Full analysis
//   print('First analysis...');
//   var result = await analyzer.analyzeProject();
//   print('Found ${result.fileIRs.length} files');
  
//   // Make a change to one file
//   print('\nMaking a change...');
//   await File('/path/to/flutter/project/lib/widgets/button.dart')
//       .writeAsString('// Modified\n' + content);
  
//   // Second run: Incremental analysis (much faster)
//   print('\nIncremental analysis...');
//   result = await analyzer.analyzeProject();
//   print('Only re-analyzed changed files + dependents');
  
//   // Link into complete app IR
//   final appIR = result.linkIntoAppIR();
  
//   analyzer.dispose();
// }


// lib/src/analyzer/project_analyzer.dart



/// Multi-pass project analyzer that handles large Flutter projects efficiently
class ProjectAnalyzer {
  final String projectPath;
  final String cacheDir;
  
  late AnalysisContextCollection _collection;
  
  // Multi-pass components
  late DependencyResolver _dependencyResolver;
  late TypeRegistry _typeRegistry;
  late IncrementalCache _cache;
  
  ProjectAnalyzer(
    this.projectPath, {
    String? cacheDir,
  }) : cacheDir = cacheDir ?? path.join(projectPath, '.flutter_js_cache');

  /// Initialize the analyzer with dependency resolution
  Future<void> initialize() async {
    _collection = AnalysisContextCollection(
      includedPaths: [path.join(projectPath, 'lib')],
      resourceProvider: PhysicalResourceProvider.INSTANCE,
    );
    
    _dependencyResolver = DependencyResolver(projectPath);
    _typeRegistry = TypeRegistry();
    _cache = IncrementalCache(cacheDir);
    
    await _cache.initialize();
  }

  /// Analyze project with multi-pass approach
  Future<ProjectAnalysisResult> analyzeProject() async {
    print('🔍 Starting multi-pass analysis...');
    
    // PHASE 1: Build dependency graph
    print('📊 Phase 1: Building dependency graph...');
    final dependencyGraph = await _dependencyResolver.buildGraph();
    final analysisOrder = dependencyGraph.topologicalSort();
    print('   ✓ Found ${analysisOrder.length} files');
    
    // PHASE 2: Detect changed files
    print('🔄 Phase 2: Detecting changes...');
    final changedFiles = await _detectChangedFiles(analysisOrder);
    print('   ✓ ${changedFiles.length} files changed');
    
    // PHASE 3: Type resolution pass
    print('🏷️  Phase 3: Resolving types...');
    await _typeResolutionPass(analysisOrder, changedFiles);
    print('   ✓ Type registry populated');
    
    // PHASE 4: Per-file IR generation
    print('🔨 Phase 4: Generating IR...');
    final fileIRs = await _generateFileIRs(analysisOrder, changedFiles);
    print('   ✓ Generated ${fileIRs.length} file IRs');
    
    // PHASE 5: Save cache
    print('💾 Phase 5: Saving cache...');
    await _cache.saveAll(fileIRs);
    
    return ProjectAnalysisResult(
      fileIRs: fileIRs,
      dependencyGraph: dependencyGraph,
      typeRegistry: _typeRegistry,
      analysisOrder: analysisOrder,
    );
  }

  /// Analyze a single file (for incremental builds)
  Future<FileAnalysisResult?> analyzeFile(String filePath) async {
    final context = _getContextForFile(filePath);
    if (context == null) return null;
    
    final session = context.currentSession;
    final result = await session.getResolvedUnit(filePath);
    
    if (result is ResolvedUnitResult) {
      return FileAnalysisResult(
        path: filePath,
        unit: result.unit,
        libraryElement: result.libraryElement,
        errors: result.errors,
        imports: _extractImports(result.unit),
        exports: _extractExports(result.unit),
      );
    }
    
    return null;
  }

  /// PHASE 2: Detect which files have changed
  Future<Set<String>> _detectChangedFiles(List<String> allFiles) async {
    final changedFiles = <String>{};
    
    for (final filePath in allFiles) {
      final currentHash = await _computeFileHash(filePath);
      final cachedHash = await _cache.getFileHash(filePath);
      
      if (currentHash != cachedHash) {
        changedFiles.add(filePath);
        
        // Invalidate dependents
        final dependents = _dependencyResolver.getDependents(filePath);
        changedFiles.addAll(dependents);
      }
    }
    
    return changedFiles;
  }

  /// PHASE 3: Type resolution pass
  Future<void> _typeResolutionPass(
    List<String> filesInOrder,
    Set<String> changedFiles,
  ) async {
    for (final filePath in filesInOrder) {
      // Skip if not changed and already in registry
      if (!changedFiles.contains(filePath) && 
          _typeRegistry.hasTypesForFile(filePath)) {
        continue;
      }
      
      final result = await analyzeFile(filePath);
      if (result == null) continue;
      
      // Extract only type declarations
      final typeVisitor = TypeDeclarationVisitor(filePath, _typeRegistry);
      result.unit.visitChildren(typeVisitor);
    }
  }

  /// PHASE 4: Generate IR for each file
  Future<Map<String, FileIR>> _generateFileIRs(
    List<String> filesInOrder,
    Set<String> changedFiles,
  ) async {
    final fileIRs = <String, FileIR>{};
    
    for (final filePath in filesInOrder) {
      // Use cache if file hasn't changed
      if (!changedFiles.contains(filePath)) {
        final cached = await _cache.getFileIR(filePath);
        if (cached != null) {
          fileIRs[filePath] = cached;
          continue;
        }
      }
      
      // Generate new IR
      final result = await analyzeFile(filePath);
      if (result == null) continue;
      
      final analysisContext = FileAnalysisContext(
        currentFile: filePath,
        typeRegistry: _typeRegistry,
        dependencyGraph: _dependencyResolver.graph,
      );
      
      final visitor = FileIRGenerator(analysisContext);
      result.unit.visitChildren(visitor);
      
      final fileIR = visitor.buildFileIR();
      fileIRs[filePath] = fileIR;
      
      // Update hash
      await _cache.setFileHash(
        filePath,
        await _computeFileHash(filePath),
      );
    }
    
    return fileIRs;
  }

  /// Get analysis context for a specific file
  AnalysisContext? _getContextForFile(String filePath) {
    for (final context in _collection.contexts) {
      if (context.contextRoot.isAnalyzed(filePath)) {
        return context;
      }
    }
    return null;
  }

  /// Compute hash of file content
  Future<String> _computeFileHash(String filePath) async {
    final file = File(filePath);
    final content = await file.readAsBytes();
    return md5.convert(content).toString();
  }

  /// Extract imports from compilation unit
  List<ImportInfo> _extractImports(CompilationUnit unit) {
    return unit.directives
        .whereType<ImportDirective>()
        .map((import) => ImportInfo(
              uri: import.uri.stringValue ?? '',
              prefix: import.prefix?.name ?? '',
              isDeferred: import.deferredKeyword != null,
            ))
        .toList();
  }

  /// Extract exports from compilation unit
  List<String> _extractExports(CompilationUnit unit) {
    return unit.directives
        .whereType<ExportDirective>()
        .map((export) => export.uri.stringValue ?? '')
        .toList();
  }

  /// Clean up resources
  void dispose() {
    _cache.dispose();
  }
}

/// Result of analyzing the entire project
class ProjectAnalysisResult {
  final Map<String, FileIR> fileIRs;
  final DependencyGraph dependencyGraph;
  final TypeRegistry typeRegistry;
  final List<String> analysisOrder;

  ProjectAnalysisResult({
    required this.fileIRs,
    required this.dependencyGraph,
    required this.typeRegistry,
    required this.analysisOrder,
  });

  /// Link all file IRs into a complete app IR
  FlutterAppIR linkIntoAppIR() {
    final linker = IRLinker(
      fileIRs: fileIRs,
      dependencyGraph: dependencyGraph,
      typeRegistry: typeRegistry,
    );
    return linker.link();
  }
}

/// Result of analyzing a single file
class FileAnalysisResult {
  final String path;
  final CompilationUnit unit;
  final LibraryElement libraryElement;
  final List<AnalysisError> errors;
  final List<ImportInfo> imports;
  final List<String> exports;

  FileAnalysisResult({
    required this.path,
    required this.unit,
    required this.libraryElement,
    required this.errors,
    required this.imports,
    required this.exports,
  });

  bool get hasErrors => errors.any((e) => e.severity == Severity.error);
}

/// Import information
class ImportInfo {
  final String uri;
  final String prefix;
  final bool isDeferred;

  ImportInfo({
    required this.uri,
    this.prefix = '',
    this.isDeferred = false,
  });
}

/// Context for analyzing a single file
class FileAnalysisContext {
  final String currentFile;
  final TypeRegistry typeRegistry;
  final DependencyGraph dependencyGraph;

  FileAnalysisContext({
    required this.currentFile,
    required this.typeRegistry,
    required this.dependencyGraph,
  });

  /// Get dependencies of current file
  List<String> getDependencies() {
    return dependencyGraph.getDependencies(currentFile);
  }

  /// Resolve a type name to its full information
  TypeInfo? resolveType(String typeName) {
    return typeRegistry.lookupType(typeName);
  }
}