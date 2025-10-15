# Complete IR Generation Plan for Dart Code Analysis

Starting from scratch. This plan assumes no existing implementation and builds a complete system methodically.

---

## Phase 1: Core Data Structures

### 1.1 - Define the Base IR Node Type
**Purpose**: Every piece of information extracted from Dart code should be a node in the IR. These nodes must have common properties.

**What to create**:
- Base `IRNode` class with:
  - Unique identifier (`id`)
  - Source location (`file`, `line`, `column`, `offset`, `length`)
  - Creation timestamp
  - Optional metadata map for extensibility

**Why this first**: Everything else inherits from this. It ensures consistent identity, traceability, and debugging capability across the entire system.

**Deliverable**: A single base class that all other IR classes extend.

---

### 1.2 - Build the Type System
**Purpose**: Type information flows through everything in the IR. Without a complete type system, downstream analysis breaks.

**What to create**:
- `TypeIR` abstract class
- Concrete type classes:
  - `PrimitiveTypeIR` (int, double, bool, String, void, dynamic, Never)
  - `ClassTypeIR` (Flutter widgets, custom classes with optional generics)
  - `FunctionTypeIR` (function signatures with parameter types and return type)
  - `NullableTypeIR` (wrapper for nullable types)
  - `GenericTypeIR` (List<T>, Map<K, V>, etc.)
  - `UnresolvedTypeIR` (for forward references during multi-pass analysis)

**Each type needs**:
- `displayName()` - human-readable form ("List<String>?")
- `isNullable` property
- `isBuiltIn` property
- `genericArguments` list (if applicable)
- Base type without generics (for comparison)

**Why this second**: All expressions, fields, parameters, and return values need types. This is the foundation for all downstream analysis.

**Deliverable**: A type system that can represent any Dart type and supports queries like `isAssignableTo()`, `isSubtypeOf()`.

---

### 1.3 - Create Source Location & Error Reporting
**Purpose**: When analysis finds a problem, you need to report exactly where it is.

**What to create**:
- `SourceLocation` class (file path, line, column, byte offset, length)
- `AnalysisIssue` class with:
  - Severity (error, warning, info, hint)
  - Message (what went wrong)
  - Code (machine-readable issue ID)
  - Location (where in source)
  - Suggestion (how to fix)
  - Related locations (context)

**Why**: Enables IDE integration, error highlighting, and helpful diagnostics.

**Deliverable**: Classes for precise error reporting with source mapping.

---

## Phase 2: Expression & Statement IR

### 2.1 - Define All Expression Types
**Purpose**: Expressions represent computations. You need IR for every kind of expression in Dart.

**What to create** (in categories):

**Literals**:
- `IntLiteralExpr` (value: 42)
- `DoubleLiteralExpr` (value: 3.14)
- `StringLiteralExpr` (value, interpolations)
- `BoolLiteralExpr` (value: true/false)
- `NullLiteralExpr` (null)
- `ListLiteralExpr` (elements list, element type)
- `MapLiteralExpr` (entries, key type, value type)
- `SetLiteralExpr` (elements, element type)

**Variables & Access**:
- `IdentifierExpr` (name, resolved type)
- `PropertyAccessExpr` (target object, property name, nullable-aware flag)
- `IndexAccessExpr` (target collection, index expression)

**Operations**:
- `BinaryOpExpr` (left, operator, right, inferred result type)
- `UnaryOpExpr` (operator, operand)
- `AssignmentExpr` (target, value, is compound flag)
- `ConditionalExpr` (condition ? then : else)

**Function/Method Calls**:
- `FunctionCallExpr` (function name, arguments, named arguments, type arguments)
- `MethodCallExpr` (receiver object, method name, arguments, nullable-aware, is cascade)
- `ConstructorCallExpr` (class name, constructor name, arguments, is const)

**Advanced**:
- `LambdaExpr` (parameters, body, return type)
- `AwaitExpr` (future expression)
- `ThrowExpr` (exception expression)
- `CastExpr` (expression, target type)
- `TypeCheckExpr` (expression, type to check, is negated)

**Common fields for all expressions**:
- `resultType` (what type does this evaluate to?)
- `sourceLocation`
- `isConstant` (can be evaluated at compile time?)

**Why this way**: Each expression type has exactly the fields it needs, no more. This makes serialization, traversal, and analysis straightforward.

**Deliverable**: Complete expression hierarchy covering all Dart expression syntax.

---

### 2.2 - Define All Statement Types
**Purpose**: Statements form the control flow of code.

**What to create**:

**Simple Statements**:
- `ExpressionStmt` (standalone expression like a function call)
- `VariableDeclarationStmt` (var x = value; with type, mutability, late modifier)
- `ReturnStmt` (optional return value)
- `BreakStmt` (optional loop label)
- `ContinueStmt` (optional loop label)
- `ThrowStmt` (exception expression)

**Compound Statements**:
- `BlockStmt` (sequence of statements)
- `IfStmt` (condition, then-block, optional else-block)
- `ForStmt` (init, condition, update, body)
- `ForEachStmt` (variable, iterable, body, is async flag)
- `WhileStmt` (condition, body)
- `DoWhileStmt` (body, condition)
- `SwitchStmt` (expression, cases, default case)
- `SwitchCaseStmt` (patterns/values, statements)
- `TryStmt` (try-block, catch clauses, finally-block)
- `CatchClauseStmt` (exception type, variable name, stack trace variable, body)

**Common fields**:
- `sourceLocation`

**Why**: Control flow analysis, dead code detection, reachability analysis all depend on this structure.

**Deliverable**: Statement hierarchy for all Dart control structures.

---

### 2.3 - Create Expression/Statement Traversal
**Purpose**: You'll need to walk these trees to analyze them.

**What to create**:
- `Visitor` abstract class with `visit(ExpressionType)` methods for each expression/statement type
- Concrete visitors:
  - `DepthCalculator` - calculates nesting depth
  - `VariableCollector` - finds all variable references
  - `TypeInferencer` - infers types bottom-up
  - `ConstantFolder` - evaluates compile-time constants
  - `DependencyExtractor` - finds what this code depends on

**Why**: Rather than writing ad-hoc traversal in each analysis, the Visitor pattern enables reusable tree walks.

**Deliverable**: Traversal infrastructure for expression/statement analysis.

---

## Phase 3: Declarations

### 3.1 - Dart File Structure
**Purpose**: A Dart file contains imports, class/function declarations, and metadata.

**What to create**:
- `DartFile` class:
  - `filePath` (full path to .dart file)
  - `package` (package this file belongs to, if any)
  - `imports` (all import statements)
  - `exports` (all export statements)
  - `declarations` (top-level classes, functions, variables)
  - `contentHash` (MD5 of file content for change detection)
  - `analysisIssues` (problems found during analysis)
  - `metadata` (library comments, analyzer directives)

**Why**: This is your entry point. All analysis starts here.

**Deliverable**: A structure representing an entire Dart file and its contents.

---

### 3.2 - Import/Export Statements
**Purpose**: Track what this file depends on.

**What to create**:
- `ImportStmt`:
  - `uri` (what's imported: 'package:flutter/material.dart')
  - `prefix` (as name, if any)
  - `isDeferred` (deferred loading)
  - `showList` (names explicitly imported)
  - `hideList` (names explicitly excluded)
  - `sourceLocation`
  
- `ExportStmt`:
  - Same fields as ImportStmt (re-exports subset of file's contents)

**Why**: Imports define what symbols are available. Exports define what this file offers to others. Critical for dependency analysis.

**Deliverable**: Complete import/export representation.

---

### 3.3 - Variable Declarations
**Purpose**: Top-level variables and their initialization.

**What to create**:
- `VariableDecl`:
  - `name`
  - `type` (TypeIR)
  - `initializer` (optional ExpressionIR)
  - `isFinal` / `isConst` / `isLate`
  - `documentation` (comment above)
  - `sourceLocation`

**Why**: Variables affect analysis (what state exists?), and const values enable optimization.

**Deliverable**: Variable declaration representation.

---

### 3.4 - Function Declarations
**Purpose**: Top-level functions and methods.

**What to create**:
- `FunctionDecl`:
  - `name`
  - `returnType` (TypeIR)
  - `parameters` (list of ParameterDecl)
  - `body` (BlockStmt or ExpressionStmt for arrow functions)
  - `isAsync` / `isGenerator`
  - `typeParameters` (for generics: <T, U>)
  - `documentation`
  - `sourceLocation`

- `ParameterDecl`:
  - `name`
  - `type` (TypeIR)
  - `isRequired` / `isNamed` / `isPositional`
  - `defaultValue` (optional ExpressionIR)
  - `annotations` (e.g., @required)

**Why**: Functions are the basic execution units. You need to know their signatures for call analysis.

**Deliverable**: Function and parameter declarations.

---

### 3.5 - Class Declarations
**Purpose**: The most complex declaration type.

**What to create**:
- `ClassDecl`:
  - `name`
  - `superclass` (TypeIR, if any)
  - `interfaces` (List<TypeIR>)
  - `mixins` (List<TypeIR>)
  - `typeParameters`
  - `fields` (List<FieldDecl>)
  - `methods` (List<MethodDecl>)
  - `constructors` (List<ConstructorDecl>)
  - `isAbstract`
  - `documentation`
  - `sourceLocation`

- `FieldDecl`:
  - `name`
  - `type`
  - `initializer`
  - `isFinal` / `isStatic` / `isLate`
  - `sourceLocation`

- `MethodDecl` (extends FunctionDecl):
  - All of FunctionDecl plus:
  - `isStatic` / `isAbstract`
  - `isGetter` / `isSetter`

- `ConstructorDecl`:
  - `name` (optional, for named constructors)
  - `parameters`
  - `initializers` (field init expressions)
  - `body`
  - `isConst` / `isFactory`
  - `sourceLocation`

**Why**: Classes contain state (fields) and behavior (methods). Flutter analysis heavily depends on class structure.

**Deliverable**: Complete class hierarchy representation.

---

## Phase 4: Flutter-Specific IR

### 4.1 - Widget Classification
**Purpose**: Not all classes are widgets. Need to identify and mark them.

**What to create**:
- `WidgetDecl` (extends ClassDecl):
  - `isStateless` flag
  - `isStateful` flag
  - `isBuildMethod` (bool, for the build() method)
  - `buildReturnType` (usually Widget)
  - Widget-specific metadata

**Identification logic**:
- If extends StatelessWidget → isStateless = true
- If extends StatefulWidget → isStateful = true
- Otherwise: not a widget (still a ClassDecl, but not WidgetDecl)

**Why**: Flutter analysis requires distinguishing widgets from regular classes.

**Deliverable**: Widget identification and classification.

---

### 4.2 - State Class Representation
**Purpose**: StatefulWidget has associated State class. Need to link them.

**What to create**:
- `StateDecl` (extends ClassDecl):
  - `linkedWidget` (reference to StatefulWidget it belongs to)
  - `stateFields` (mutable fields that trigger rebuilds)
  - `regularFields` (immutable or non-state fields)
  - `initState` (initialization lifecycle method)
  - `dispose` (cleanup lifecycle method)
  - `didUpdateWidget` / `didChangeDependencies` / `reassemble`
  - `buildMethod` (the build() method)
  - `setStateCalls` (all calls to setState in this class)

**Why**: State analysis is central to Flutter app behavior. You need detailed state tracking.

**Deliverable**: Complete State class representation.

---

### 4.3 - Build Method Analysis
**Purpose**: The build method defines what UI is rendered.

**What to create**:
- `BuildMethod` (extends MethodDecl):
  - `returnedWidget` (the Widget returned by build, or null if void)
  - `instantiatedWidgets` (all widgets created in build)
  - `conditionalWidgets` (widgets in if/else branches)
  - `loopWidgets` (widgets in for/forEach loops)
  - `constWidgets` (count of const-declared widgets)
  - `ancestorReads` (calls to Theme.of, MediaQuery.of, etc.)
  - `providerReads` (context.read<T>, context.watch<T>)
  - `futureBuilders` / `streamBuilders` (async widgets)
  - `rebuildTriggers` (which state fields cause this to rebuild when changed)

**Why**: Build method is where widgets connect to state. This analysis finds performance issues.

**Deliverable**: Detailed build method representation.

---

### 4.4 - Widget Tree Representation
**Purpose**: The actual tree of widgets in the UI.

**What to create**:
- `WidgetNode`:
  - `id` (unique within a build)
  - `widgetType` (e.g., "Container")
  - `properties` (Map<String, ExpressionIR>: property name → value expression)
  - `children` (List<WidgetNode>)
  - `key` (if widget has a key, what is it?)
  - `isConst`
  - `sourceLocation`

- `WidgetTree`:
  - `root` (top WidgetNode)
  - `depth` (max nesting depth)
  - `totalNodeCount` (count of all nodes)
  - `conditionalBranches` (where does tree differ based on conditions?)
  - `iterationPatterns` (where do dynamic children exist?)

**Why**: The widget tree is the UI. Understanding its structure enables layout analysis, key validation, optimization suggestions.

**Deliverable**: Representation of actual widget hierarchies.

---

## Phase 5: State & Reactivity Analysis

### 5.1 - State Field Tracking
**Purpose**: Which fields matter for UI?

**What to create**:
- `StateFieldAnalysis`:
  - `field` (FieldDecl)
  - `isAccessedInBuild` (does build() read this field?)
  - `accessLocations` (all line numbers where it's read in build)
  - `setStateCallsModifying` (which setState() calls modify this?)
  - `triggersRebuild` (if modified, does UI actually change?)
  - `initializationPath` (where/how is this initialized?)
  - `disposalPath` (if controller/stream, how is it cleaned up?)

**Why**: Identifies unused fields, unnecessary rebuilds, memory leaks.

**Deliverable**: Detailed state field analysis.

---

### 5.2 - Rebuild Trigger Graph
**Purpose**: Model dependencies: state change → rebuild.

**What to create**:
- `RebuildTriggerGraph`:
  - Nodes: (StateField, BuildMethod) pairs
  - Edges: "when this state field changes, build this build method"
  - Properties: Each edge has a "cost" (frequency/complexity)

**Analysis queries**:
- "What state changes cause this widget to rebuild?"
- "Which widgets rebuild when field X changes?"
- "Are there unnecessary rebuilds?"
- "Which rebuilds are expensive?"

**Why**: Performance analysis. Flutter apps often suffer from excessive rebuilds.

**Deliverable**: Graph for rebuild analysis and optimization.

---

### 5.3 - Lifecycle Method Tracking
**Purpose**: What happens when?

**What to create**:
- `LifecycleAnalysis`:
  - `initStateOperations` (what runs when State initializes)
  - `disposeOperations` (what runs on cleanup)
  - `didUpdateWidgetOperations` (parent changed)
  - `didChangeDependenciesOperations` (inherited widget changed)
  - `orderingIssues` (e.g., accessing not-yet-initialized controller)
  - `missingDisposals` (created in init but not cleaned up)

**Why**: Lifecycle bugs cause crashes and memory leaks.

**Deliverable**: Lifecycle method analysis for correctness checking.

---

## Phase 6: Provider/State Management

### 6.1 - Provider Detection
**Purpose**: Identify state management classes (ChangeNotifier, Bloc, etc.).

**What to create**:
- `ProviderClassDecl` (extends ClassDecl):
  - `providerType` (changeNotifier, bloc, cubit, inherited, etc.)
  - `stateType` (what type of data does it manage?)
  - `notifyListenerCalls` (all notifyListeners() calls)
  - `fieldMutations` (which fields change state?)
  - `consumedByWidgets` (which widgets read this provider?)
  - `consumptionPattern` (read once, watch continuously?)

**Why**: Provider analysis enables optimization and dependency visualization.

**Deliverable**: Provider class identification and analysis.

---

### 6.2 - Provider Consumption Tracking
**Purpose**: Model which widgets depend on which providers.

**What to create**:
- `ProviderConsumption`:
  - `provider` (ProviderClassDecl)
  - `consumer` (WidgetDecl)
  - `accessPattern` (context.read, context.watch, Consumer widget)
  - `frequency` (read every build, read once, etc.)
  - `sourceLocation`

**Analysis**:
- Build dependency graph: providers → widgets
- Find redundant reads (read multiple times, could read once)
- Find cascade effects (one provider change cascades to many widgets)

**Why**: Understand state flow through the app.

**Deliverable**: Provider consumption analysis.

---

## Phase 7: Multi-Pass Analysis Architecture

### 7.1 - Pass 1: Declaration Discovery
**Input**: Raw Dart AST from analyzer package  
**Output**: All declarations extracted (classes, functions, imports, etc.)

**What to create**:
- `DeclarationPass` visitor
- Populates DartFile with all declarations
- No symbol resolution yet (references may be unresolved)

**Why**: Build the basic structure first, linking comes later.

---

### 7.2 - Pass 2: Symbol Resolution
**Input**: DartFile from Pass 1, all files in project  
**Output**: All references resolved to their declarations

**What to create**:
- `SymbolResolutionPass`
- Resolves imports to actual files/symbols
- Links widget types to StatefulWidget associations
- Links provider references to actual classes
- Reports unresolved symbols as issues

**Why**: Without this, you can't navigate from widget to state, or find where a variable comes from.

---

### 7.3 - Pass 3: Type Inference
**Input**: Resolved declarations from Pass 2  
**Output**: Complete type information for all expressions

**What to create**:
- `TypeInferencePass`
- Infers expression types bottom-up
- Fills in UnresolvedTypeIR with actual types
- Reports type mismatches

**Why**: Type information enables analysis (is this widget stateful or stateless? Is this value a Future?).

---

### 7.4 - Pass 4: Flow Analysis
**Input**: Typed declarations from Pass 3  
**Output**: Rebuild graphs, state field access, control flow

**What to create**:
- `FlowAnalysisPass`
- Builds rebuild trigger graphs
- Traces state field access in build methods
- Tracks lifecycle execution
- Identifies unreachable code, unused fields

**Why**: Performance and correctness issues are in the flow, not just syntax.

---

### 7.5 - Pass 5: Validation & Diagnostics
**Input**: Complete analysis from Pass 4  
**Output**: List of issues with severity/suggestions

**What to create**:
- `ValidationPass`
- Checks for common errors (setState in build, missing dispose, etc.)
- Checks for performance anti-patterns (unnecessary rebuilds, etc.)
- Checks for unused code (dead imports, unused fields, etc.)
- Generates AnalysisIssue objects

**Why**: Produce actionable diagnostics for developers.

---

## Phase 8: Serialization

Looking at your existing `binary_ir_writer.dart` and `binary_ir_reader.dart`, they implement a functional binary format but have incomplete coverage. Here's the complete specification to make them production-ready.

### 8.1 - Binary Format Architecture

#### Overall Structure

```
[HEADER (8 bytes)]
[STRING_TABLE (variable)]
[IR_DATA (variable)]
[CHECKSUM (8 bytes, optional)]
```

#### 8.1.1 - Header (8 bytes)

**Bytes 0-3: Magic Number** (4 bytes, little-endian uint32)
- Value: `0x464C4952` ("FLIR" in ASCII = Flutter IR)
- Purpose: Identifies this as a Flutter IR binary file
- Validation: First check when reading

**Bytes 4-5: Format Version** (2 bytes, little-endian uint16)
- Current: `1`
- Purpose: Enables format evolution (version 2, 3 later with breaking changes)
- Backward compatibility: Readers should handle older versions or reject with clear error

**Bytes 6-7: Flags** (2 bytes, little-endian uint16)
- Bit 0: `hasChecksum` (1 = file has checksum at end)
- Bit 1: `compressed` (1 = data is gzip-compressed after string table)
- Bit 2: `includeDebugInfo` (1 = includes optional debug information)
- Bits 3-15: Reserved for future use

**Total header size**: Always 8 bytes

#### 8.1.2 - String Table (variable size)

**Purpose**: Deduplicates strings to reduce file size. Many IR nodes have repeated strings (type names, widget names, etc.).

**Structure**:
```
[STRING_COUNT (4 bytes, uint32)]
[STRING_1]
[STRING_2]
...
[STRING_N]
```

**Each string format**:
```
[LENGTH (2 bytes, uint16)]    // Number of UTF-8 bytes
[UTF-8_BYTES (variable)]      // Actual string data
```

**Why this design**:
- String references in IR data are just 4-byte indices into this table
- A repeated string like "Widget" stored once, referenced many times saves space
- UTF-8 encoding handles all Unicode (including emoji, if needed)
- 2-byte length limit = max 65,535 bytes per string (sufficient for any reasonable identifier)

**Example**:
```
String table count: 3
  Index 0: "Container" (9 bytes)
  Index 1: "Widget" (6 bytes)
  Index 2: "build" (5 bytes)

Later in IR data, reference to "Container" = write uint32(0)
Reference to "Widget" = write uint32(1)
```

#### 8.1.3 - IR Data Section

**DartFile IR structure** (from top-level down):

```
[FILE_PATH_REF (4 bytes)]           // String table index
[CONTENT_HASH_REF (4 bytes)]        // String table index
[METADATA]
  [DOCUMENTATION_REF or NULL]       // Optional string
  [LIBRARY_NAME_REF or NULL]
  [PART_OF_REF or NULL]
  [PARTS_COUNT (4 bytes)]
    [PART_REF (4 bytes)] × count
  [ANNOTATIONS_COUNT (4 bytes)]
    [ANNOTATION] × count
  [ANALYZED_AT (8 bytes, uint64)]   // Milliseconds since epoch
  [ANALYZER_VERSION_REF (4 bytes)]
[WIDGETS_COUNT (4 bytes)]
  [WIDGET] × count
[STATE_CLASSES_COUNT (4 bytes)]
  [STATE_CLASS] × count
[CLASSES_COUNT (4 bytes)]
  [CLASS] × count
[FUNCTIONS_COUNT (4 bytes)]
  [FUNCTION] × count
[PROVIDERS_COUNT (4 bytes)]
  [PROVIDER] × count
[IMPORTS_COUNT (4 bytes)]
  [IMPORT] × count
[EXPORTS_COUNT (4 bytes)]
  [EXPORT_REF (4 bytes)] × count
[DEPENDENCIES_COUNT (4 bytes)]
  [DEPENDENCY_REF (4 bytes)] × count
[DEPENDENTS_COUNT (4 bytes)]
  [DEPENDENT_REF (4 bytes)] × count
[ISSUES_COUNT (4 bytes)]
  [ANALYSIS_ISSUE] × count
```

#### 8.1.4 - Type Serialization

**Simple Type**:
```
[TYPE_NAME_REF (4 bytes)]     // String table ref
[IS_NULLABLE (1 byte)]        // 0 or 1
```

**For future complex types** (when adding generics):
```
[TYPE_KIND (1 byte)]          // 0=simple, 1=generic, 2=function, etc.
[TYPE_SPECIFIC_DATA (variable)]
```

Currently all types are simple. Design allows expansion.

#### 8.1.5 - Expression Serialization

**Pattern** (used for all expressions):
```
[EXPRESSION_TYPE (1 byte)]    // Discriminator (see BinaryConstants)
[TYPE_SPECIFIC_DATA (variable)]
```

**Expression type discriminators** (from BinaryConstants):
- 0x01: Literal
- 0x02: Identifier
- 0x03: Binary operation
- 0x04: Method call
- 0x05: Property access
- 0x06: Conditional (ternary)
- 0x07: List literal
- 0x08: Map literal
- Future: 0x09-0xFF for more types

**Literal expression data** (after type byte):
```
[ID_REF (4 bytes)]
[RESULT_TYPE]
[SOURCE_LOCATION]
[LITERAL_TYPE (1 byte)]       // 0=string, 1=int, 2=double, 3=bool, 4=null
[VALUE_SPECIFIC]
  if string: [STRING_REF (4 bytes)]
  if int: [INT64 (8 bytes)]
  if double: [FLOAT64 (8 bytes)]
  if bool: [BOOL (1 byte)]
  if null: (no data)
```

#### 8.1.6 - Source Location Serialization

**Format**:
```
[FILE_REF (4 bytes)]          // String table ref
[LINE (4 bytes)]              // 1-based
[COLUMN (4 bytes)]            // 1-based
[OFFSET (4 bytes)]            // 0-based byte offset
[LENGTH (4 bytes)]            // Number of bytes
```

**Total**: 20 bytes per source location

**Why these fields**:
- `file` + `line` + `column`: Sufficient to point to exact position in IDE
- `offset` + `length`: Sufficient to extract exact text from file
- All 4-byte fields for alignment/performance

#### 8.1.7 - Optional Fields Pattern

**For nullable fields**:
```
[IS_PRESENT (1 byte)]         // 0 = null, 1 = present
if IS_PRESENT:
  [FIELD_DATA (variable)]
```

**Examples**:
- Optional string: 1 byte (flag) + [4 bytes for ref if present]
- Optional statement: 1 byte + [variable data if present]

#### 8.1.8 - Array/Collection Serialization

**Pattern**:
```
[COUNT (4 bytes)]             // Number of items
[ITEM_1]
[ITEM_2]
...
[ITEM_N]
```

**Map pattern**:
```
[ENTRY_COUNT (4 bytes)]
[KEY_1]
[VALUE_1]
[KEY_2]
[VALUE_2]
...
```

#### 8.1.9 - Content Hash

**Purpose**: Detect when source file changed, invalidating the cache.

**When reading**:
1. Load IR binary
2. Extract `contentHash` field from FileIR
3. Recompute hash of original `.dart` file (MD5 or SHA256)
4. If hashes don't match: file changed, re-analyze

**Computation**:
```dart
// In Dart
import 'dart:convert';
import 'package:crypto/crypto.dart';

String computeContentHash(String fileContent) {
  return md5.convert(utf8.encode(fileContent)).toString();
}
```

**Why MD5**: Fast, sufficient for change detection (not cryptographic use)

### 8.2 - Complete Writer Implementation Requirements

Your `binary_ir_writer.dart` is ~90% complete. Here's what's missing:

#### 8.2.1 - Missing Expression Type Writers

**Add to `_writeExpression()` switch**:

```dart
// Currently missing:
else if (expr is AssignmentExpressionIR) {
  _writeByte(0x09);  // NEW TYPE
  _writeAssignmentExpression(expr);
} 
else if (expr is CastExpressionIR) {
  _writeByte(0x0A);
  _writeCastExpression(expr);
}
else if (expr is TypeCheckExpressionIR) {
  _writeByte(0x0B);
  _writeTypeCheckExpression(expr);
}
else if (expr is LambdaExpressionIR) {
  _writeByte(0x0C);
  _writeLambdaExpression(expr);
}
else if (expr is AwaitExpressionIR) {
  _writeByte(0x0D);
  _writeAwaitExpression(expr);
}
else if (expr is ThrowExpressionIR) {
  _writeByte(0x0E);
  _writeThrowExpression(expr);
}
else if (expr is IndexAccessExpressionIR) {
  _writeByte(0x0F);
  _writeIndexAccessExpression(expr);
}
```

**Implement each writer following existing patterns** (e.g., `_writeBinaryExpression`).

#### 8.2.2 - Missing Statement Type Writers

**Add to `_writeStatement()` switch**:

```dart
// Currently missing:
else if (stmt is WhileStatementIR) {
  _writeByte(0x10);  // NEW TYPE (BinaryConstants.STMT_WHILE)
  _writeWhileStatement(stmt);
}
else if (stmt is DoWhileStatementIR) {
  _writeByte(0x11);
  _writeDoWhileStatement(stmt);
}
else if (stmt is SwitchStatementIR) {
  _writeByte(0x12);
  _writeSwitchStatement(stmt);
}
else if (stmt is TryStatementIR) {
  _writeByte(0x13);
  _writeTryStatement(stmt);
}
else if (stmt is ForEachStatementIR) {
  _writeByte(0x14);
  _writeForEachStatement(stmt);
}
else if (stmt is ThrowStatementIR) {
  _writeByte(0x15);
  _writeThrowStatement(stmt);
}
else if (stmt is BreakStatementIR) {
  _writeByte(0x16);
  _writeBreakStatement(stmt);
}
else if (stmt is ContinueStatementIR) {
  _writeByte(0x17);
  _writeContinueStatement(stmt);
}
```

#### 8.2.3 - String Collection from Missing Types

**Add to `_collectStringsFromExpression()`**:

```dart
else if (expr is AssignmentExpressionIR) {
  _collectStringsFromExpression(expr.target);
  _collectStringsFromExpression(expr.value);
}
else if (expr is LambdaExpressionIR) {
  for (var param in expr.parameters) {
    _addString(param.name);
    _addString(param.type.name);
  }
  if (expr.body != null) _collectStringsFromExpression(expr.body!);
}
// ... etc for all new expression types
```

#### 8.2.4 - Validation Before Writing

**Add at start of `writeFileIR()`**:

```dart
Uint8List writeFileIR(FileIR fileIR) {
  // Validate before writing
  final validationErrors = _validateFileIR(fileIR);
  if (validationErrors.isNotEmpty) {
    throw Exception('Cannot serialize invalid FileIR:\n${validationErrors.join('\n')}');
  }

  _buffer.clear();
  // ... rest of method
}

List<String> _validateFileIR(FileIR fileIR) {
  final errors = <String>[];
  
  if (fileIR.filePath.isEmpty) {
    errors.add('FileIR.filePath is empty');
  }
  if (fileIR.contentHash.isEmpty) {
    errors.add('FileIR.contentHash is empty');
  }
  
  // Check all strings are reasonable length
  for (final widget in fileIR.widgets) {
    if (widget.name.isEmpty) errors.add('Widget has empty name');
    if (widget.sourceLocation.file.isEmpty) {
      errors.add('Widget ${widget.name} missing source location');
    }
  }
  
  // ... check other collections similarly
  
  return errors;
}
```

#### 8.2.5 - Checksums (Optional, Recommended)

**Add method**:

```dart
void _writeChecksum(Uint8List data) {
  // Compute SHA256 of everything written so far
  final digest = sha256.convert(data);
  _buffer.add(digest.bytes); // 32 bytes
}

// At end of writeFileIR(), if header has checksum flag:
final currentData = _buffer.toBytes();
_writeChecksum(currentData);
```

### 8.3 - Complete Reader Implementation Requirements

Your `binary_ir_reader.dart` is ~90% complete. Here's what's missing:

#### 8.3.1 - Missing Expression Type Readers

**Add to `_readExpression()` switch**:

```dart
case 0x09:  // ASSIGNMENT
  return _readAssignmentExpression();
case 0x0A:  // CAST
  return _readCastExpression();
case 0x0B:  // TYPE_CHECK
  return _readTypeCheckExpression();
case 0x0C:  // LAMBDA
  return _readLambdaExpression();
case 0x0D:  // AWAIT
  return _readAwaitExpression();
case 0x0E:  // THROW
  return _readThrowExpression();
case 0x0F:  // INDEX_ACCESS
  return _readIndexAccessExpression();
```

**Implement each reader** (inverse of writers).

#### 8.3.2 - Missing Statement Type Readers

**Add to `_readStatement()` switch**:

```dart
case 0x10:  // WHILE
  return _readWhileStatement();
case 0x11:  // DO_WHILE
  return _readDoWhileStatement();
case 0x12:  // SWITCH
  return _readSwitchStatement();
case 0x13:  // TRY
  return _readTryStatement();
case 0x14:  // FOR_EACH
  return _readForEachStatement();
case 0x15:  // THROW
  return _readThrowStatement();
case 0x16:  // BREAK
  return _readBreakStatement();
case 0x17:  // CONTINUE
  return _readContinueStatement();
```

#### 8.3.3 - Error Recovery

**Enhance `_readExpression()` with fallback**:

```dart
default:
  throw SerializationException(
    'Unknown expression type: 0x${exprType.toRadixString(16)} at offset $_offset',
    offset: _offset,
  );
```

**Create custom exception**:

```dart
class SerializationException implements Exception {
  final String message;
  final int offset;
  
  SerializationException(this.message, {required this.offset});
  
  @override
  String toString() => 'SerializationException at offset $offset: $message';
}
```

#### 8.3.4 - Checksum Validation

**Add method**:

```dart
void _validateChecksum(Uint8List allBytes, Uint8List checksumFromFile) {
  // Re-read header to see if checksum flag is set
  final flags = _readUint16();  // From offset 6
  if ((flags & 0x0001) == 0) return;  // No checksum
  
  // Read everything except the checksum itself
  final dataWithoutChecksum = allBytes.sublist(0, allBytes.length - 32);
  final computedChecksum = sha256.convert(dataWithoutChecksum).bytes;
  
  if (!_bytesEqual(computedChecksum, checksumFromFile)) {
    throw SerializationException(
      'Checksum mismatch: file corrupted',
      offset: allBytes.length - 32,
    );
  }
}
```

#### 8.3.5 - Bounds Checking

**Add throughout reading**:

```dart
String _readStringRef() {
  final index = _readUint32();
  if (index >= _stringTable.length) {
    throw SerializationException(
      'String reference $index out of bounds (table size: ${_stringTable.length})',
      offset: _offset - 4,
    );
  }
  return _stringTable[index];
}

T? _readOptional<T>(T Function() reader) {
  if (_offset >= _data.lengthInBytes) {
    throw SerializationException(
      'Unexpected end of data while reading optional field',
      offset: _offset,
    );
  }
  
  if (_readBool()) {
    return reader();
  }
  return null;
}
```

### 8.4 - Binary Constants Definition

**Create `binary_constants.dart`** (currently referenced but incomplete):

```dart
class BinaryConstants {
  // Header
  static const int MAGIC_NUMBER = 0x464C4952; // "FLIR"
  static const int FORMAT_VERSION = 1;
  
  // Expression type codes
  static const int EXPR_LITERAL = 0x01;
  static const int EXPR_IDENTIFIER = 0x02;
  static const int EXPR_BINARY = 0x03;
  static const int EXPR_METHOD_CALL = 0x04;
  static const int EXPR_PROPERTY_ACCESS = 0x05;
  static const int EXPR_CONDITIONAL = 0x06;
  static const int EXPR_LIST = 0x07;
  static const int EXPR_MAP = 0x08;
  static const int EXPR_ASSIGNMENT = 0x09;
  static const int EXPR_CAST = 0x0A;
  static const int EXPR_TYPE_CHECK = 0x0B;
  static const int EXPR_LAMBDA = 0x0C;
  static const int EXPR_AWAIT = 0x0D;
  static const int EXPR_THROW = 0x0E;
  static const int EXPR_INDEX_ACCESS = 0x0F;
  
  // Statement type codes
  static const int STMT_EXPRESSION = 0x00;
  static const int STMT_VAR_DECL = 0x01;
  static const int STMT_IF = 0x02;
  static const int STMT_FOR = 0x03;
  static const int STMT_RETURN = 0x04;
  static const int STMT_BLOCK = 0x05;
  static const int STMT_WHILE = 0x10;
  static const int STMT_DO_WHILE = 0x11;
  static const int STMT_SWITCH = 0x12;
  static const int STMT_TRY = 0x13;
  static const int STMT_FOR_EACH = 0x14;
  static const int STMT_THROW = 0x15;
  static const int STMT_BREAK = 0x16;
  static const int STMT_CONTINUE = 0x17;
  
  // Header flags (byte 6-7)
  static const int FLAG_HAS_CHECKSUM = 0x0001;
  static const int FLAG_COMPRESSED = 0x0002;
  static const int FLAG_DEBUG_INFO = 0x0004;
}
```

### 8.5 - Testing Strategy

#### 8.5.1 - Round-Trip Tests

For every IR type, test:

```dart
test('FileIR round-trip serialization', () {
  // Create a complete FileIR with all types
  final original = FileIR(
    filePath: 'lib/main.dart',
    contentHash: 'abc123',
    // ... populate all fields
  );
  
  // Serialize
  final writer = BinaryIRWriter();
  final bytes = writer.writeFileIR(original);
  
  // Deserialize
  final reader = BinaryIRReader();
  final restored = reader.readFileIR(bytes);
  
  // Compare
  expect(restored.filePath, equals(original.filePath));
  expect(restored.contentHash, equals(original.contentHash));
  expect(restored.widgets.length, equals(original.widgets.length));
  // ... check all fields
});
```

#### 8.5.2 - Corruption Detection

```dart
test('Detects corrupted binary data', () {
  final bytes = writer.writeFileIR(originalIR);
  
  // Corrupt a byte in the middle
  bytes[bytes.length ~/ 2] ^= 0xFF;
  
  // Should throw or return with checksum error
  expect(
    () => reader.readFileIR(bytes),
    throwsException,
  );
});
```

#### 8.5.3 - Version Compatibility

```dart
test('Rejects incompatible format version', () {
  final bytes = writer.writeFileIR(originalIR);
  
  // Change version byte
  final mutableBytes = BytesBuilder()..add(bytes);
  mutableBytes[4] = 99; // Invalid version
  
  expect(
    () => reader.readFileIR(mutableBytes.toBytes()),
    throwsException,
  );
});
```

### 8.6 - JSON Fallback Implementation

#### 8.6.1 - toJson() Pattern

Every IR class needs:

```dart
class WidgetIR {
  // ... fields ...
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'classification': classification.name,  // Enum to string
      'isStateful': isStateful,
      'properties': properties.map((p) => p.toJson()).toList(),
      'fields': fields.map((f) => f.toJson()).toList(),
      'constructor': constructor?.toJson(),
      'buildMethod': buildMethod?.toJson(),
      'children': children.map((c) => c.toJson()).toList(),
      // ... etc for all fields
    };
  }
}
```

#### 8.6.2 - fromJson() Pattern

```dart
class WidgetIR {
  static WidgetIR fromJson(Map<String, dynamic> json) {
    return WidgetIR(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      classification: WidgetClassification.values.byName(json['classification'] as String),
      isStateful: json['isStateful'] as bool,
      properties: (json['properties'] as List)
          .map((p) => PropertyIR.fromJson(p as Map<String, dynamic>))
          .toList(),
      // ... etc
    );
  }
}
```

#### 8.6.3 - Round-Trip JSON Test

```dart
test('JSON round-trip preserves data', () {
  final original = createCompleteFileIR();
  final json = original.toJson();
  final restored = FileIR.fromJson(json);
  
  expect(restored.filePath, equals(original.filePath));
  expect(restored.widgets.length, equals(original.widgets.length));
  // ... verify all nested structures
});
```

### 8.7 - File Size Optimization

#### Why Binary is Better Than JSON

**Example**: Single `Container` widget

**JSON**:
```json
{
  "id": "widget_Container_1234567890",
  "name": "Container",
  "type": "Container",
  "sourceLocation": {
    "file": "lib/screens/home.dart",
    "line": 42,
    "column": 8,
    "offset": 1204,
    "length": 150
  }
}
```
**Size**: ~250 bytes

**Binary** (with string table):
```
String table:
  [0] "widget_Container_1234567890"
  [1] "Container"
  [2] "lib/screens/home.dart"

Widget data:
  ID ref: 0x00000000
  Name ref: 0x00000001
  Type ref: 0x00000001
  Source location: [ref 0x00000002, line, column, offset, length]
```
**Size**: ~40 bytes

**Savings**: 84% smaller with binary!

### 8.8 - Implementation Checklist

- [ ] Add all missing expression type codes to BinaryConstants
- [ ] Add all missing statement type codes to BinaryConstants
- [ ] Implement `_writeAssignmentExpression()` and `_readAssignmentExpression()`
- [ ] Implement `_writeCastExpression()` and `_readCastExpression()`
- [ ] Implement `_writeTypeCheckExpression()` and `_readTypeCheckExpression()`
- [ ] Implement all other missing expression writers/readers
- [ ] Implement all missing statement writers/readers
- [ ] Add validation to `writeFileIR()` before serializing
- [ ] Add checksum computation (optional but recommended)
- [ ] Add error recovery in reader (bounds checking, custom exceptions)
- [ ] Implement `toJson()` on all IR classes
- [ ] Implement `fromJson()` on all IR classes
- [ ] Write round-trip tests (binary and JSON)
- [ ] Write corruption detection tests
- [ ] Write version compatibility tests
- [ ] Benchmark binary vs JSON file sizes
- [ ] Document format specification (this plan)

---

## Phase 9: Integration Points

### 9.1 - Analyzer Integration
**Purpose**: Connect to `dart:analyzer` package.

**What to create**:
- `DartAnalysisDriver` class that:
  - Loads .dart files
  - Parses with `package:analyzer`
  - Converts AST to IR
  - Runs all 5 passes
  - Returns DartFile IR objects

**Why**: Bridges gap between raw AST and your IR.

**Deliverable**: Main entry point for analysis.

---

### 9.2 - Project-Level Analysis
**Purpose**: Analyze entire Flutter project, not just one file.

**What to create**:
- `ProjectAnalyzer`:
  - Takes pubspec.yaml path
  - Finds all .dart files in project
  - Analyzes each file
  - Links between files (imports, exports)
  - Builds whole-project dependency graphs
  - Generates project-level diagnostics

**Why**: Most useful analysis requires seeing whole project.

**Deliverable**: Project-level analysis capability.

---

## Implementation Sequence

1. **Phase 1** (Core Data) - 1-2 days
2. **Phase 2** (Expressions/Statements) - 2-3 days
3. **Phase 3** (Declarations) - 2 days
4. **Phase 4** (Flutter-Specific) - 2-3 days
5. **Phase 5** (State & Reactivity) - 3 days
6. **Phase 6** (Providers) - 2 days
7. **Phase 7** (Multi-Pass) - 3-4 days (the most complex)
8. **Phase 8** (Serialization) - 2 days
9. **Phase 9** (Integration) - 2 days

**Total**: ~22-24 days for complete, testable implementation.

---

## Key Design Principles

1. **One concern per class**: `IntLiteralExpr` only represents integer literals, nothing more.

2. **Immutability**: Once an IR node is created, don't modify it. This enables caching and concurrent analysis.

3. **Complete information**: Every IR node must have enough information to reconstruct the original code or report diagnostics. No "will be filled later" placeholders.

4. **Error recovery**: If parsing or analysis fails, still produce partial IR with issues marked, rather than crashing.

5. **Visitor pattern for traversal**: Every tree walk uses a Visitor, not ad-hoc recursion.

6. **Type safety**: Use generics and sealed types where possible (Dart's type system allows this).

7. **Source tracing**: Every piece of information knows where it came from (sourceLocation) for error reporting.

---

This plan is complete, detailed, and ready to implement methodically.