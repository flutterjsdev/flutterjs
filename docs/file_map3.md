# File Map for Dart Project (Extended)

This document provides a comprehensive map of declarations in the additional provided Dart files, including classes, abstract classes, enums, functions/methods, and other notable declarations (e.g., exceptions, typedefs, extensions). Each file is listed with its declarations organized by category in tables for clarity. Declarations are extracted from the code structure, with methods listed under their parent classes where applicable. Private members (starting with `_`) are included only for significant elements like methods in classes.

## 1. dart_file_builder.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `LibraryMetadata`<br>- `DartFile`<br>- `DartFileBuilder` |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `DartFileBuilder`:<br>- `withPackage(String? pkg)`<br>- `withLibrary(String? lib)`<br>- `addImport(ImportStmt import)`<br>- `addImports(List<ImportStmt> imps)`<br>- `addExport(ExportStmt export)`<br>- `addClass(ClassDecl classDecl)`<br>- `addFunction(FunctionDecl func)`<br>- `addVariable(VariableDecl var_)`<br>- `addIssue(AnalysisIssue issue)`<br>- `withMetadata(LibraryMetadata meta)`<br>- `withContentHash(String fileContent)`<br>- `markAnalyzed()`<br>- `build()` |
| **Other** | None |

## 2. variable_decl.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `VariableDecl` (extends `IRNode`)<br>- `LocalVariableDecl` (extends `VariableDecl`)<br>- `FieldDecl` (extends `VariableDecl`)<br>- `AnnotationIR` |
| **Abstract Classes** | None |
| **Enums** | - `VisibilityModifier` (values: `public`, `private`, `protected`, `internal`)<br>- `ParameterKind` (values: `requiredPositional`, `positional`, `requiredNamed`, `named`, `namedPositional`) |
| **Functions/Methods** | In `VariableDecl`:<br>- `get isParameter`<br>- `get isField`<br>- `get isLocal`<br>- `get isMutable`<br>- `toString()` (override)<br>In `FieldDecl`:<br>- `get isComputedProperty`<br>In `AnnotationIR`:<br>- `toString()` (override) |
| **Other** | None |

## 3. class_decl.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `FieldDecl` (extends `IRNode`)<br>- `MethodDecl` (extends `FunctionDecl`)<br>- `ConstructorDecl` (extends `MethodDecl`)<br>- `ClassDecl` (extends `IRNode`)<br>- `EnhancedClassDecl` (extends `ClassDecl`)<br>- `ClassHierarchyUtils` |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `FieldDecl`:<br>- `get isAccessible`<br>- `get isMutable`<br>- `toString()` (override)<br>In `MethodDecl`:<br>- `get isAccessible`<br>- `get isMutable`<br>- `toString()` (override)<br>In `ConstructorDecl`:<br>- `get isFactoryConstructor`<br>- `get isRedirectingConstructor`<br>- `get hasSuperCall`<br>- `toString()` (override)<br>In `ClassDecl`:<br>- `get hasCyclicInheritance`<br>- `get abstractMethods`<br>- `get concreteMethods`<br>- `toString()` (override)<br>In `EnhancedClassDecl`:<br>- `get isDeadCode`<br>- `get inheritanceDepth`<br>In `ClassHierarchyUtils`:<br>- `isSubclassOf(ClassDecl subclass, ClassDecl superclass)`<br>- `implementsClass(ClassDecl impl, ClassDecl iface)`<br>- `getAllMethods(ClassDecl cls, [List<ClassDecl>? hierarchy])`<br>- `findUnimplementedMethods(ClassDecl cls)` |
| **Other** | - `TypeParameterDecl` (extends `IRNode`)<br>- `ConstructorInitializer`<br>- `SuperConstructorCall`<br>- `RedirectedConstructorCall` |

## 4. parameter_decl.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `ParameterDecl` (extends `IRNode`) |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `ParameterDecl`:<br>- `get isOptional`<br>- `toString()` (override) |
| **Other** | None |

## 5. import_export_stmt.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `ImportStmt`<br>- `ExportStmt`<br>- `PartStmt`<br>- `PartOfStmt` |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `ImportStmt`:<br>- `shows(String name)`<br>- `get showsAll`<br>- `get hasRestrictions`<br>- `get effectiveExposure`<br>- `qualifiedName(String name)`<br>- `toString()` (override)<br>In `ExportStmt`:<br>- `exposes(String name)`<br>- `get exportsAll`<br>- `get hasRestrictions`<br>- `get effectiveExposure`<br>- `toString()` (override)<br>In `PartStmt`:<br>- `toString()` (override)<br>In `PartOfStmt`:<br>- `toString()` (override) |
| **Other** | None |

## 6. function_decl.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `FunctionDecl` (extends `IRNode`)<br>- `MethodDecl` (extends `FunctionDecl`)<br>- `ConstructorDecl` (extends `MethodDecl`)<br>- `AnnotationIR` |
| **Abstract Classes** | None |
| **Enums** | - `VisibilityModifier` (values: `public`, `private`, `protected`, `internal`) |
| **Functions/Methods** | In `FunctionDecl`:<br>- `get isConstructor`<br>- `get isMethod`<br>- `get isTopLevel`<br>- `get isGetterSetter`<br>- `toString()` (override)<br>In `MethodDecl`:<br>- `toString()` (override)<br>In `ConstructorDecl`:<br>- `get hasSuperCall`<br>- `get hasRedirect`<br>- `toString()` (override)<br>In `AnnotationIR`:<br>- `toString()` (override)<br>In `ConstructorInitializer`:<br>- `toString()` (override)<br>In `SuperConstructorCall`:<br>- `toString()` (override)<br>In `RedirectedConstructorCall`:<br>- `toString()` (override) |
| **Other** | - `ConstructorInitializer`<br>- `SuperConstructorCall`<br>- `RedirectedConstructorCall` |

## 7. widget_tree_ir.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `WidgetTreeIR` (extends `IRNode`)<br>- `ConditionalBranchIR` (extends `IRNode`)<br>- `IterationPatternIR` (extends `IRNode`)<br>- `TreeMetricsIR` (extends `IRNode`) |
| **Abstract Classes** | None |
| **Enums** | - `BranchTypeIR` (values: `ternary`, `ifStatement`, `switchCase`, `nullCoalesce`)<br>- `LoopTypeIR` (values: `forLoop`, `forEach`, `mapMethod`, `expandMethod`, `listMap`, `listExpand`, `custom`) |
| **Functions/Methods** | In `WidgetTreeIR`:<br>- `get constWidgetPercentage`<br>- `get isSimpleTree`<br>- `get isDynamicTree`<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `ConditionalBranchIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `IterationPatternIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `TreeMetricsIR`:<br>- `toShortString()` (override)<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory) |
| **Other** | None |

## 8. widget_node_ir.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `WidgetNodeIR` (extends `IRNode`)<br>- `WidgetNodeAnalysisIR` (extends `IRNode`) |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `WidgetNodeIR`:<br>- `get hasChildren`<br>- `get childCount`<br>- `get isLeaf`<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `WidgetNodeAnalysisIR`:<br>- `toShortString()` (override)<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory) |
| **Other** | None |

## 9. build_method_ir.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `BuildMethodIR` (extends `MethodDecl`)<br>- `WidgetInstantiationIR` (extends `IRNode`)<br>- `ConditionalWidgetIR` (extends `IRNode`)<br>- `LoopWidgetIR` (extends `IRNode`)<br>- `AncestorAccessIR` (extends `IRNode`)<br>- `ProviderReadIR` (extends `IRNode`)<br>- `AsyncBuilderIR` (extends `IRNode`)<br>- `AnimationIR` (extends `IRNode`)<br>- `GestureDetectorIR` (extends `IRNode`)<br>- `StateFieldUsageIR` (extends `IRNode`)<br>- `BuildIssueIR` (extends `IRNode`)<br>- `BuildOptimizationSuggestionIR` (extends `IRNode`) |
| **Abstract Classes** | None |
| **Enums** | - `ConditionalPatternType` (values: `ternary`, `ifStatement`, `switchCase`, `nullCoalesce`)<br>- `LoopTypeIR` (values: `forLoop`, `forEach`, `mapMethod`, `expandMethod`, `listMap`, `custom`)<br>- `AncestorAccessTypeIR` (values: `theme`, `mediaQuery`, `scaffold`, `focusScope`, `navigator`, `inheritedWidget`)<br>- `ProviderAccessTypeIR` (values: `read`, `watch`, `select`)<br>- `AnimationTypeIR` (values: `implicit`, `explicit`, `tween`, `implicit_animated`)<br>- `GestureTypeIR` (values: `tap`, `doubleTap`, `longPress`, `drag`, `scroll`, `hover`, `focus`)<br>- `StateFieldUsageTypeIR` (values: `read`, `write`, `both`, `modified`)<br>- `OptimizationType` (values: `addConstKeyword`, `extractWidgets`, `addRepaintBoundary`, `addKeys`, `cacheInheritedValues`, `memoizeExpensiveWidgets`, `useBuilderPattern`, `splitBuildMethods`)<br>- `OptimizationImpact` (values: `low`, `medium`, `high`)<br>- `BuildIssueTypeIR` (values: `missingConstKeyword`, `missingKeys`, `deepNesting`, `tooManyWidgets`, `unnecessaryRebuilds`, `capturedVariableIssue`, `inefficientPattern`, `performanceWarning`) |
| **Functions/Methods** | In `BuildMethodIR`:<br>- `get constWidgetPercentage`<br>- `get hasDynamicStructure`<br>- `get hasAsyncData`<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `WidgetInstantiationIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `ConditionalWidgetIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `LoopWidgetIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `AncestorAccessIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `ProviderReadIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `AsyncBuilderIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `AnimationIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `GestureDetectorIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `StateFieldUsageIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `BuildIssueIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `BuildOptimizationSuggestionIR`:<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory) |
| **Other** | None |

## 10. key_type_ir.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `KeyTypeIR` (extends `IRNode`)<br>- `FutureTypeIR` (extends `TypeIR`)<br>- `FunctionTypeIR` (extends `TypeIR`)<br>- `GenericTypeIR` (extends `TypeIR`)<br>- `ListTypeIR` (extends `TypeIR`)<br>- `MapTypeIR` (extends `TypeIR`)<br>- `SetTypeIR` (extends `TypeIR`)<br>- `SimpleTypeIR` (extends `TypeIR`)<br>- `DynamicTypeIR` (extends `TypeIR`)<br>- `VoidTypeIR` (extends `TypeIR`)<br>- `NeverTypeIR` (extends `TypeIR`) |
| **Abstract Classes** | None |
| **Enums** | - `KeyKindIR` (values: `valueKey`, `objectKey`, `uniqueKey`, `globalKey`, `pageStorageKey`, `localKey`)<br>- `AsyncBuilderKindIR` (values: `futureBuilder`, `streamBuilder`) |
| **Functions/Methods** | In `KeyTypeIR`:<br>- `toShortString()` (override)<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `TypeIR`:<br>- `displayName()`<br>- `isAssignableTo(TypeIR other)`<br>- `get isBuiltIn`<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>In `FutureTypeIR`:<br>- `displayName()` (override)<br>- `isAssignableTo(TypeIR other)` (override)<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>In `FunctionTypeIR`:<br>- `displayName()` (override)<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>In `GenericTypeIR`:<br>- `displayName()` (override)<br>- `isAssignableTo(TypeIR other)` (override)<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>In `ListTypeIR`:<br>- `displayName()` (override)<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>In `MapTypeIR`:<br>- `displayName()` (override)<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>In `SetTypeIR`:<br>- `displayName()` (override)<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>In `SimpleTypeIR`:<br>- `get isBuiltIn` (override)<br>- `fromJson(Map<String, dynamic> json, SourceLocationIR sourceLocation)` (factory)<br>In `DynamicTypeIR`:<br>- `get isBuiltIn` (override)<br>- `isAssignableTo(TypeIR other)` (override)<br>In `VoidTypeIR`:<br>- `get isBuiltIn` (override)<br>In `NeverTypeIR`:<br>- `get isBuiltIn` (override) |
| **Other** | None |