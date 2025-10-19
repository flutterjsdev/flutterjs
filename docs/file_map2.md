# File Map for Dart Project

This document provides a comprehensive map of declarations in the provided Dart files, including classes, abstract classes, enums, functions/methods, and other notable declarations (e.g., exceptions, typedefs, extensions). Each file is listed with its declarations organized by category in tables for clarity. Declarations are extracted from the code structure, with methods listed under their parent classes where applicable. Private members (starting with `_`) are included only for significant elements like methods in classes.

## 1. dependency_resolver.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `DependencyResolver` |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `DependencyResolver`:<br>- `buildGraph()`<br>- `_analyzeFileDependencies(String filePath)`<br>- `_extractImportsFromContent(String content)`<br>- `_resolveImportPath(String importUri, String currentFile)`<br>- `_resolvePackageImport(String importUri)`<br>- `_resolveRelativeImport(String importUri, String currentFile)`<br>- `_shouldExcludeFile(String filePath)`<br>- `_matchesPattern(String filePath, String pattern)`<br>- `_getCurrentPackageName()`<br>- `_listDartFiles(Directory dir)`<br>- `getDependencies(String filePath)`<br>- `getDependents(String filePath)`<br>- `getAllDependents(String filePath)`<br>- `hasCircularDependencies()`<br>- `getCircularDependencies()`<br>- `_log(String message)`<br>- `_logWarning(String message)`<br>- `_logError(String message)` |
| **Other** | None |

## 2. incremental_cache.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `AnalysisCache` |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `AnalysisCache`:<br>- `initialize()`<br>- `getFileHash(String filePath)`<br>- `setFileHash(String filePath, String hash)`<br>- `getFileModTime(String filePath)`<br>- `setFileModTime(String filePath, int modTime)`<br>- `saveMetadata(Map<String, dynamic> metadata)`<br>- `getMetadata()`<br>- `_scheduleSave()`<br>- `_forceSave()`<br>- `_loadHashIndex()`<br>- `_saveHashIndex()`<br>- `_loadModTimeIndex()`<br>- `_saveModTimeIndex()`<br>- `_loadMetadata()`<br>- `_saveMetadata()`<br>- `clear()`<br>- `prune(Set<String> existingFiles)`<br>- `getStatistics()`<br>- `_estimateCacheSize()`<br>- `dispose()` |
| **Other** | None |

## 3. type_registry.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `TypeRegistry`<br>- `TypeInfo` |
| **Abstract Classes** | None |
| **Enums** | - `TypeKind` (values: `class_`, `abstractClass`, `mixin`, `enum_`, `typedef`, `extension`) |
| **Functions/Methods** | In `TypeRegistry`:<br>- `registerType(TypeInfo typeInfo)`<br>- `lookupType(String typeName)`<br>- `hasTypesForFile(String filePath)`<br>- `getTypesInFile(String filePath)`<br>- `removeTypesForFile(String filePath)`<br>- `getAllTypeNames()`<br>- `getTypesWhere(bool Function(TypeInfo) predicate)`<br>- `getWidgets()`<br>- `getStatefulWidgets()`<br>- `getStateClasses()`<br>- `isTypeAvailableIn(String typeName, String filePath, FileAnalysisResult analysisResult)`<br>- `_resolveImport(ImportInfo import, String currentFile)`<br>- `_resolvePackageImport(String uri)`<br>- `_resolveRelativeImport(String uri, String currentFile)`<br>- `_extractProjectPath(String filePath)`<br>- `_getPackageName(String projectPath)`<br>- `clear()`<br>- `getStatistics()`<br>In `TypeInfo`:<br>- `toString()` (override) |
| **Other** | None |

## 4. TypeDeclarationVisitor.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `TypeDeclarationVisitor` (extends `RecursiveAstVisitor<void>`) |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `TypeDeclarationVisitor`:<br>- `visitClassDeclaration(ClassDeclaration node)`<br>- `visitMixinDeclaration(MixinDeclaration node)`<br>- `visitEnumDeclaration(EnumDeclaration node)`<br>- `visitGenericTypeAlias(GenericTypeAlias node)`<br>- `visitExtensionDeclaration(ExtensionDeclaration node)`<br>- `_isWidget(ClassElement element)`<br>- `_isStatefulWidget(ClassElement element)`<br>- `_isStatelessWidget(ClassElement element)`<br>- `_isState(ClassElement element)`<br>- `_extendsOrImplements(ClassElement element, String typeName)` |
| **Other** | None |

## 5. analyze_flutter_app.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `FlutterAppDeclaration`<br>- `DependencyGraphModel`<br>- `DependencyNode` |
| **Abstract Classes** | None |
| **Enums** | - `DependencyType` (values: `widget`, `state`, `provider`, `service`, `utility`)<br>- `DependencyRelation` (values: `uses`, `extendsJS`, `implements`, `mixesWith`, `dependsOn`) |
| **Functions/Methods** | None |
| **Other** | None |

## 6. dependency_graph.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `DependencyGraph` |
| **Abstract Classes** | - `CircularDependencyException` (implements `Exception`) |
| **Enums** | None |
| **Functions/Methods** | In `DependencyGraph`:<br>- `addNode(String filePath)`<br>- `addEdge(String from, String to)`<br>- `detectCycles()`<br>- `getTransitiveDependents(String filePath)`<br>- `getDependencies(String filePath)`<br>- `getDependents(String filePath)`<br>- `topologicalSort({bool throwOnCycle = true})`<br>- `hasCircularDependencies()`<br>In `CircularDependencyException`:<br>- `toString()` (override) |
| **Other** | None |

## 7. analying_project.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `ProjectAnalyzer`<br>- `ProjectAnalysisResult`<br>- `FileAnalysisResult`<br>- `ImportInfo`<br>- `AnalysisProgress`<br>- `AnalysisStatistics`<br>- `ParsedFileInfo` |
| **Abstract Classes** | None |
| **Enums** | - `AnalysisPhase` (values: `starting`, `dependencyResolution`, `changeDetection`, `typeResolution`, `caching`, `complete`, `error`) |
| **Functions/Methods** | In `ProjectAnalyzer`:<br>- `initialize()`<br>- `_validateProjectStructure()`<br>- `analyzeProject()`<br>- `analyzeFile(String filePath)`<br>- `_getContextForFile(String filePath)`<br>- `_getImportInfo(Directive directive)`<br>- `_getImportCombinators(NamespaceDirective directive)`<br>- `_extractImports(List<Directive> directives)`<br>- `_extractExports(List<Directive> directives)`<br>- `_extractParts(List<Directive> directives)`<br>- `_getErrors(ResolvedUnitResult result)`<br>- `_phase1_BuildDependencyGraph()`<br>- `_phase2_DetectChangedFiles(List<String> analysisOrder)`<br>- `_phase3_ParseAndResolveTypes(List<String> analysisOrder, Set<String> changedFiles)`<br>- `_processFile(String filePath)`<br>- `_phase4_CacheAnalysisResults(List<ParsedFileInfo> parsedFiles)`<br>- `_notifyProgress(AnalysisPhase phase, int current, int total, String message)`<br>- `_logStatistics(AnalysisStatistics stats)`<br>- `_log(String message)`<br>- `_logError(String message, dynamic e, StackTrace stackTrace)`<br>- `_computeFileHash(String filePath)`<br>- `_isFileChanged(String filePath, String? cachedHash)`<br>- `_getModTime(String filePath)`<br>- `_shouldSkipFile(String filePath)`<br>In `ImportInfo`:<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>- `toJson()`<br>In `AnalysisStatistics`:<br>- `toJson()`<br>- `toString()` (override) |
| **Other** | Getters (e.g., `hasErrors` in `FileAnalysisResult`, `progress` in `AnalysisProgress`) |

## 8. ir_linker.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `FileAnalysisContext`<br>- `FileMetadata`<br>- `FileMetadataExtractor` (extends `RecursiveAstVisitor<void>`) |
| **Abstract Classes** | - `DeclarationValidator`<br>- `ValidationResult`<br>- `ValidationError`<br>- `ValidationWarning`<br>- `DependencyEdge`<br>- `RouteDeclaration`<br>- `AnimationDeclaration`<br>- `ThemeDeclaration` |
| **Enums** | - `ValidationErrorType` (values: `duplicateDeclaration`, `missingBuildMethod`, `missingStateClass`, `circularDependency`, `invalidType`, `missingRequiredParameter`)<br>- `ValidationWarningType` (values: `redundantDefault`, `orphanedStateClass`, `missingDispose`, `undisposedController`, `missingNotifyListeners`, `duplicateImport`, `deferredImport`, `unusedImport`, `unknownType`)<br>- `EdgeType` (values: `hasState`, `uses`, `dependsOn`, `renders`)<br>- `AnimationType` (values: `controller`, `tween`, `implicit`) |
| **Functions/Methods** | In `FileMetadataExtractor`:<br>- `buildMetadata()`<br>- `visitLibraryDirective(LibraryDirective node)`<br>- `visitImportDirective(ImportDirective node)`<br>- `visitExportDirective(ExportDirective node)`<br>- `visitClassDeclaration(ClassDeclaration node)`<br>- `visitFunctionDeclaration(FunctionDeclaration node)`<br>- `_isWidgetClass(String? superClass)`<br>- `_isStateClass(ClassDeclaration node)`<br>In `FileAnalysisSummary`:<br>- `needsIRGeneration(Set<String> changedFiles)`<br>In `DeclarationValidator`:<br>- `validate()`<br>- `_validateWidgets()`<br>- `_validateStateClasses()`<br>- `_validateProviders()`<br>- `_modifiesState(ProviderMethodDeclaration method)`<br>- `_validateDependencies()`<br>- `_hasCycle(String nodeId, DependencyGraphModel graph, Set<String> visited, Set<String> recursionStack)`<br>- `_validateImports()`<br>In `ValidationResult`, `ValidationError`, `ValidationWarning`:<br>- `toString()` (overrides) |
| **Other** | Getters (e.g., `getAllDeclarations()` in `FileMetadata`, `hasWarnings` in `ValidationResult`) |