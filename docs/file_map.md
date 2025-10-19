# File Map for Dart Project (Further Extended)

This document provides a comprehensive map of declarations in the additional provided Dart files, including classes, abstract classes, enums, functions/methods, and other notable declarations (e.g., exceptions, typedefs, extensions). Each file is listed with its declarations organized by category in tables for clarity. Declarations are extracted from the code structure, with methods listed under their parent classes where applicable. Private members (starting with `_`) are included only for significant elements like methods in classes.

## 1. analysis_issue.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `AnalysisIssue` |
| **Abstract Classes** | None |
| **Enums** | - `IssueSeverity` (values: `error`, `warning`, `info`, `hint`) |
| **Functions/Methods** | In `AnalysisIssue`:<br>- `get displayMessage`<br>- `get displayMessageShort`<br>- `get isCritical`<br>- `toString()` (override)<br>- `== (Object other)` (override)<br>- `get hashCode` (override)<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>- `toJson()` |
| **Other** | None |

## 2. issue_categorizer.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `IssueCategorizer` |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `IssueCategorizer`:<br>- `categorizeByCode(String code, String message)`<br>- `_getFlutterCategory(String code)`<br>- `_categorizeByMessage(String message)` |
| **Other** | Constants: `_syntaxErrorCodes`, `_typeErrorCodes`, `_nullSafetyCodes`, `_unusedCodeCodes`, `_performanceCodes`, `_flutterCodes`, `_codeSmellCodes`, `_conventionCodes` |

## 3. issue_category.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | None |
| **Abstract Classes** | None |
| **Enums** | - `IssueCategory` (many values including `syntaxError`, `typeError`, various `flutter*` categories, etc.) |
| **Functions/Methods** | In `IssueCategory`:<br>- `get displayName`<br>- `get colorHex`<br>- `get isFlutterCategory`<br>- `get isCritical`<br>- `get relatedCategories` |
| **Other** | None |

## 4. source_location.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `SourceLocationIR` (extends `IRNode`) |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `SourceLocationIR`:<br>- `get humanReadable`<br>- `get filePath`<br>- `get endLine`<br>- `get endColumn`<br>- `_countNewlines()`<br>- `get lspRange`<br>- `get rangeString`<br>- `get rangeStringShort`<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>- `toJson()`<br>- `copyWith({String? file, int? line, int? column, int? offset, int? length})`<br>- `contains(SourceLocationIR other)`<br>- `distanceFrom(SourceLocationIR other)`<br>Extension on `SourceLocationIR`:<br>- `get displayString`<br>- `get errorString`<br>- `isNearby(SourceLocationIR other, {int threshold = 10})`<br>- `range(SourceLocationIR start, SourceLocationIR end)` |
| **Other** | None |

## 5. issue_collector.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `IssueCollector` |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `IssueCollector`:<br>- `get issues`<br>- `get duplicates`<br>- `get severityCounts`<br>- `get categoryCounts`<br>- `get total`<br>- `get totalDuplicates`<br>- `get errors`<br>- `get warnings`<br>- `get infos`<br>- `get hints`<br>- `get critical`<br>- `get flutterIssues`<br>- `add(AnalysisIssue issue)`<br>- `addAll(Iterable<AnalysisIssue> issues)`<br>- `addError(String message, String code, SourceLocationIR location, {String? suggestion, List<SourceLocationIR>? relatedLocations, String? documentationUrl})`<br>- `addWarning(String message, String code, SourceLocationIR location, {String? suggestion, List<SourceLocationIR>? relatedLocations, String? documentationUrl})`<br>- `addInfo(String message, String code, SourceLocationIR location, {String? suggestion, List<SourceLocationIR>? relatedLocations, String? documentationUrl})`<br>- `addHint(String message, String code, SourceLocationIR location, {String? suggestion, List<SourceLocationIR>? relatedLocations, String? documentationUrl})`<br>- `getIssuesByCategory(IssueCategory category)`<br>- `getIssuesBySeverity(IssueSeverity severity)`<br>- `getIssuesByFile(String filePath)`<br>- `getIssuesByCode(String code)`<br>- `sort({bool bySeverity = true, bool byCategory = false})`<br>- `clear()`<br>- `merge(IssueCollector other)`<br>- `deduplicate()`<br>- `getStatistics()`<br>- `toJson()`<br>- `generateReport()` |
| **Other** | None |

## 6. expression_ir.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `ExpressionIR` (extends `IRNode`)<br>- `LiteralExpressionIR` (extends `ExpressionIR`)<br>- `IdentifierExpressionIR` (extends `ExpressionIR`)<br>- `PropertyAccessExpressionIR` (extends `ExpressionIR`)<br>- `IndexAccessExpressionIR` (extends `ExpressionIR`)<br>- `UnaryExpressionIR` (extends `ExpressionIR`)<br>- `CastExpressionIR` (extends `ExpressionIR`) |
| **Abstract Classes** | None |
| **Enums** | - `LiteralType` (values: `integer`, `doubleValue`, `stringValue`, `booleanValue`, `nullValue`, `listValue`, `mapValue`, `setValue`) |
| **Functions/Methods** | In `ExpressionIR`:<br>- `toShortString()`<br>- `contentEquals(IRNode other)` (override)<br>- `toJson()`<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>In `LiteralExpressionIR`:<br>- `toShortString()` (override)<br>- `toJson()` (override)<br>In `IdentifierExpressionIR`:<br>- `toShortString()` (override)<br>- `toJson()` (override)<br>In `PropertyAccessExpressionIR`:<br>- `toShortString()` (override)<br>- `toJson()` (override)<br>In `IndexAccessExpressionIR`:<br>- `toShortString()` (override)<br>- `toJson()` (override)<br>In `UnaryExpressionIR`:<br>- `toShortString()` (override)<br>- `toJson()` (override)<br>In `CastExpressionIR`:<br>- `toShortString()` (override)<br>- `toJson()` (override) |
| **Other** | None |

## 7. ir_node.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `IRNode` |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `IRNode`:<br>- `get debugName`<br>- `toShortString()`<br>- `toString()` (override)<br>- `contentEquals(IRNode other)`<br>In `WidgetIR` (extends `IRNode`):<br>- `toShortString()` (override)<br>- `contentEquals(IRNode other)` (override)<br>- `get documentation` |
| **Other** | None |

## 8. type_ir.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `TypeIR` (extends `IRNode`)<br>- `GenericTypeIR` (extends `TypeIR`)<br>- `TypeParameterIR`<br>- `DynamicTypeIR` (extends `TypeIR`)<br>- `VoidTypeIR` (extends `TypeIR`)<br>- `NeverTypeIR` (extends `TypeIR`) |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `TypeIR`:<br>- `displayName()`<br>- `unwrapNullable()`<br>- `isAssignableTo(TypeIR other)`<br>- `isSubtypeOf(TypeIR other)`<br>- `contentEquals(IRNode other)` (override)<br>- `toShortString()` (override)<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>In `GenericTypeIR`:<br>- `displayName()` (override)<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>- `toJson()` (override)<br>In `TypeParameterIR`:<br>- `fromJson(Map<String, dynamic> json)` (factory)<br>- `== (Object other)` (override)<br>- `toJson()`<br>In `DynamicTypeIR`:<br>- `get isBuiltIn` (override)<br>- `get isGeneric` (override)<br>- `displayName()` (override)<br>In `VoidTypeIR`:<br>- `get isBuiltIn` (override)<br>- `get isGeneric` (override)<br>- `displayName()` (override)<br>In `NeverTypeIR`:<br>- `get isBuiltIn` (override)<br>- `get isGeneric` (override)<br>- `displayName()` (override) |
| **Other** | None |

## 9. statement_ir.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `StatementIR` (extends `IRNode`)<br>- `ExpressionStmt` (extends `StatementIR`)<br>- `VariableDeclarationStmt` (extends `StatementIR`)<br>- `ReturnStmt` (extends `StatementIR`) |
| **Abstract Classes** | None |
| **Enums** | None |
| **Functions/Methods** | In `ExpressionStmt`:<br>- `toShortString()` (override)<br>In `VariableDeclarationStmt`:<br>- `toShortString()` (override)<br>In `ReturnStmt`:<br>- `toShortString()` (override) |
| **Other** | None |

## 10. widget_classification.dart

| Category | Declarations |
|----------|--------------|
| **Classes** | - `WidgetDecl` (extends `ClassDecl`)<br>- `WidgetProperty`<br>- `WidgetPropertyAnalysis` |
| **Abstract Classes** | None |
| **Enums** | - `WidgetType` (values: `stateless`, `stateful`, `inherited`, `stateClass`, `custom`)<br>- `WidgetCategory` (values: `layout`, `display`, `input`, `navigation`, `scrollable`, `async`, `animation`, `gesture`, `scaffold`, `other`)<br>- `PerformanceProfile` (values: `lightweight`, `moderate`, `expensive`, `veryExpensive`)<br>- `ChildHandling` (values: `noChildren`, `singleChild`, `multipleChildren`) |
| **Functions/Methods** | In `WidgetDecl`:<br>- `get isFlutterCore`<br>- `get hasBuildMethod`<br>- `get hasStateClass`<br>- `get hasKeyProperty`<br>- `get commonProperties`<br>- `get performanceProfile`<br>- `get rebuildsFrequently`<br>- `get childHandling`<br>- `toString()` (override)<br>- `fromClassDecl(ClassDecl classDecl, BuildMethodDecl? buildMethod)` (factory)<br>In `WidgetProperty`:<br>- `toString()` (override)<br>In `WidgetPropertyAnalysis`:<br>- `toString()` (override) |
| **Other** | Static methods in enclosing class: `_determineWidgetType(ClassDecl classDecl)`, `_determineWidgetCategory(String widgetName)`, `_determineChildHandling(String widgetName)`, `_determinePerformanceProfile(ClassDecl classDecl, BuildMethodDecl? buildMethod)`, `_predictRebuildsFrequently(String widgetName)`, `_getCommonProperties(String widgetName)` |