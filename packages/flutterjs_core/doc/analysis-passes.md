# Analysis Passes

Understanding the multi-phase analysis pipeline in FlutterJS Core.

---

## Overview

FlutterJS Core uses a multi-phase analysis pipeline to convert Dart AST into IR. Each pass builds upon the previous one, gradually transforming raw AST into a clean, validated IR.

```
Phase 1: Declaration Extraction → Classes, methods, fields identified
Phase 2: Symbol Resolution → Names resolved to definitions
Phase 3: Type Inference → Types inferred for expressions
Phase 4: Flow Analysis → Control flow analyzed
Phase 5: Validation → IR validated for correctness
```

---

## Phase 1: Declaration Extraction

**Purpose**: Extract class, method, and field declarations from Dart AST.

**Input**: Dart `CompilationUnit` (AST)  
**Output**: List of `DeclarationIR` objects

### DeclarationPass

Located in: `lib/src/analysis/visitors/declaration_pass.dart`

**What it does:**
- Visits class declarations
- Extracts widget classes (StatelessWidget, StatefulWidget)
- Extracts methods (including build methods)
- Extracts fields and constructors
- Identifies widget trees

**Usage:**

```dart
final declarationPass = DeclarationPass();
final classes = declarationPass.extractClasses(compilationUnit);
final widgets = declarationPass.extractWidgets(compilationUnit);
```

**Key methods:**

```dart
class DeclarationPass extends RecursiveAstVisitor<void> {
  // Visit class declarations
  void visitClassDeclaration(ClassDeclaration node);
  
  // Visit method declarations
  void visitMethodDeclaration(MethodDeclaration node);
  
  // Visit field declarations
  void visitFieldDeclaration(FieldDeclaration node);
  
  // Extract widget from class
  WidgetIR? extractWidget(ClassDeclaration node);
  
  // Extract build method
  MethodDeclIR? extractBuildMethod(ClassDeclaration node);
}
```

---

## Phase 2: Symbol Resolution

**Purpose**: Resolve symbol references to their definitions.

**Input**: IR with unresolved symbols  
**Output**: IR with resolved symbol references

### SymbolResolutionPass

Located in: `lib/src/analysis/passes/symbol_resolution.dart`

**What it does:**
- Builds symbol table for the file
- Resolves class names
- Resolves method references
- Resolves field references
- Handles imports and scoping

**Usage:**

```dart
final symbolResolver = SymbolResolutionPass();
await symbolResolver.resolve(fileIR, typeRegistry);
```

**Symbol Table Structure:**

```dart
class SymbolTable {
  Map<String, ClassDeclIR> classes;
  Map<String, MethodDeclIR> methods;
  Map<String, FieldDeclIR> fields;
  Map<String, ParameterIR> parameters;
  
  // Look up symbol
  Symbol? lookup(String name);
  
  // Add symbol to table
  void define(String name, Symbol symbol);
}
```

**Example:**

```dart
// Before resolution
IdentifierExpressionIR('myVariable')

// After resolution
IdentifierExpressionIR(
  name: 'myVariable',
  resolvedSymbol: FieldSymbol(
    name: 'myVariable',
    type: NamedTypeIR('String'),
    declaringClass: 'MyWidget',
  ),
)
```

---

## Phase 3: Type Inference

**Purpose**: Infer types for expressions and validate type compatibility.

**Input**: IR with resolved symbols  
**Output**: IR with type information

### TypeInferencePass

Located in: `lib/src/analysis/passes/type_inference_pass.dart`

**What it does:**
- Infers expression types
- Validates type assignments
- Handles generic type parameters
- Resolves function return types
- Checks type compatibility

**Usage:**

```dart
final typeInference = TypeInferencePass();
final inferredType = typeInference.inferExpressionType(expression);
```

**Type Inference Rules:**

```dart
// Literals
LiteralExpressionIR(42) → NamedTypeIR('int')
LiteralExpressionIR('hello') → NamedTypeIR('String')
LiteralExpressionIR(true) → NamedTypeIR('bool')

// Binary expressions
BinaryExpressionIR(int + int) → NamedTypeIR('int')
BinaryExpressionIR(String + String) → NamedTypeIR('String')

// Method calls
MethodCallExpressionIR('toString') → NamedTypeIR('String')

// Instance creation
InstanceCreationExpressionIR('Text') → NamedTypeIR('Text')
```

**Type Checking:**

```dart
class TypeInferencePass {
  // Infer type of expression
  TypeIR inferType(ExpressionIR expr);
  
  // Check if types are compatible
  bool isAssignable(TypeIR from, TypeIR to);
  
  // Unify generic types
  TypeIR unifyTypes(TypeIR type1, TypeIR type2);
  
  // Resolve type parameters
  Map<String, TypeIR> resolveTypeParameters(
    GenericTypeIR generic,
    List<TypeIR> typeArgs,
  );
}
```

---

## Phase 4: Flow Analysis

**Purpose**: Analyze control flow and detect unreachable code.

**Input**: IR with type information  
**Output**: IR with flow analysis results

### FlowAnalysisPass

Located in: `lib/src/analysis/passes/flow_analysis_pass.dart`

**What it does:**
- Builds control flow graph (CFG)
- Detects unreachable code
- Validates return statements
- Analyzes variable initialization
- Checks for infinite loops

**Usage:**

```dart
final flowAnalysis = FlowAnalysisPass();
final cfg = flowAnalysis.analyzeMethod(methodDecl);
```

**Control Flow Graph:**

```dart
class ControlFlowGraph {
  List<BasicBlock> blocks;
  BasicBlock entry;
  BasicBlock exit;
  
  // Find all paths from entry to exit
  List<List<BasicBlock>> findAllPaths();
  
  // Detect unreachable blocks
  List<BasicBlock> findUnreachableBlocks();
  
  // Check if all paths return
  bool allPathsReturn();
}
```

**Example Analysis:**

```dart
// Dart code
Widget build(BuildContext context) {
  if (isLoading) {
    return CircularProgressIndicator();
  }
  return Text('Done');
}

// CFG
Entry → If(isLoading)
        ├─ True → Return(CircularProgressIndicator) → Exit
        └─ False → Return(Text('Done')) → Exit

// Analysis result: ✓ All paths return
```

---

## Phase 5: Validation

**Purpose**: Validate IR for correctness and unsupported patterns.

**Input**: Complete IR  
**Output**: List of validation errors

### ValidationPass

Located in: `lib/src/analysis/passes/validation_pass.dart`

**What it does:**
- Checks widget structure
- Validates method signatures
- Detects unsupported patterns
- Ensures type safety
- Reports errors with locations

**Usage:**

```dart
final validationPass = ValidationPass();
final errors = validationPass.validate(fileIR);

for (final error in errors) {
  print('${error.severity}: ${error.message}');
  print('  at ${error.location}');
}
```

**Validation Rules:**

```dart
class ValidationPass {
  // Validate entire file IR
  List<DiagnosticMessage> validate(FileIR fileIR);
  
  // Validate widget structure
  List<DiagnosticMessage> validateWidget(WidgetIR widget);
  
  // Validate method declaration
  List<DiagnosticMessage> validateMethod(MethodDeclIR method);
  
  // Validate expression
  List<DiagnosticMessage> validateExpression(ExpressionIR expr);
  
  // Validate statement
  List<DiagnosticMessage> validateStatement(StatementIR stmt);
}
```

**Common Validations:**

1. **Widget must extend proper base class**
   ```dart
   if (!widget.extendsWidget) {
     error('Class must extend StatelessWidget or StatefulWidget');
   }
   ```

2. **build() method required**
   ```dart
   if (widget.buildMethod == null) {
     error('Widget must have a build() method');
   }
   ```

3. **Return type compatibility**
   ```dart
   if (!isAssignable(returnType, expectedType)) {
     error('Return type mismatch');
   }
   ```

4. **No unsupported patterns**
   ```dart
   if (expr is UnsupportedExpressionIR) {
     error('Unsupported expression type');
   }
   ```

---

## Pipeline Execution

### Sequential Execution

```dart
// Run passes in order
final fileIR = FileIR();

// Phase 1
final declarationPass = DeclarationPass();
fileIR.classes = declarationPass.extractClasses(ast);

// Phase 2
final symbolPass = SymbolResolutionPass();
await symbolPass.resolve(fileIR, typeRegistry);

// Phase 3
final typePass = TypeInferencePass();
typePass.inferTypes(fileIR);

// Phase 4
final flowPass = FlowAnalysisPass();
flowPass.analyze(fileIR);

// Phase 5
final validationPass = ValidationPass();
final errors = validationPass.validate(fileIR);
```

### Parallel Execution

Some passes can run in parallel:

```dart
// Phases 2 and 3 can run in parallel (with careful ordering)
await Future.wait([
  symbolPass.resolve(fileIR, typeRegistry),
  // Type inference after symbol resolution
]);
```

---

## Custom Passes

### Creating a Custom Pass

```dart
class MyCustomPass {
  Future<void> execute(FileIR fileIR) async {
    // Your custom analysis logic
    for (final widget in fileIR.widgets) {
      if (widget.name.startsWith('_')) {
        // Warn about private widgets
        warnings.add('Private widget: ${widget.name}');
      }
    }
  }
}
```

### Registering Custom Passes

```dart
final pipeline = AnalysisPipeline([
  DeclarationPass(),
  SymbolResolutionPass(),
  TypeInferencePass(),
  MyCustomPass(),  // Add custom pass
  FlowAnalysisPass(),
  ValidationPass(),
]);

await pipeline.execute(ast, fileIR);
```

---

## Error Handling

### Error Severity Levels

```dart
enum DiagnosticSeverity {
  error,    // Must be fixed
  warning,  // Should be fixed
  info,     // Informational
  hint,     // Suggestion
}
```

### Error Reporting

```dart
class DiagnosticMessage {
  final DiagnosticSeverity severity;
  final String message;
  final SourceLocation location;
  final String? suggestion;
  
  DiagnosticMessage({
    required this.severity,
    required this.message,
    required this.location,
    this.suggestion,
  });
}
```

**Example:**

```dart
final error = DiagnosticMessage(
  severity: DiagnosticSeverity.error,
  message: 'build() method must return Widget',
  location: SourceLocation(
    file: 'lib/main.dart',
    line: 15,
    column: 3,
  ),
  suggestion: 'Change return type to Widget',
);
```

---

## Performance Optimization

### Caching

```dart
class CachedTypeInferencePass extends TypeInferencePass {
  final Map<ExpressionIR, TypeIR> _cache = {};
  
  @override
  TypeIR inferType(ExpressionIR expr) {
    return _cache.putIfAbsent(
      expr,
      () => super.inferType(expr),
    );
  }
}
```

### Incremental Analysis

```dart
class IncrementalAnalyzer {
  final Map<String, FileIR> _fileCache = {};
  
  Future<FileIR> analyze(String filePath, CompilationUnit ast) async {
    // Check if file changed
    if (_fileCache.containsKey(filePath)) {
      if (!fileChanged(filePath)) {
        return _fileCache[filePath]!;
      }
    }
    
    // Run analysis
    final fileIR = await runPipeline(ast);
    _fileCache[filePath] = fileIR;
    return fileIR;
  }
}
```

---

## Best Practices

1. **Order matters** - Run passes in correct sequence
2. **Cache results** - Avoid redundant computation
3. **Fail fast** - Stop on critical errors
4. **Provide context** - Include source locations in errors
5. **Be incremental** - Only reanalyze changed files

---

## See Also

- [IR System Overview](ir-system-overview.md)
- [Guide: Extending Analysis](guide-extending-analysis.md)
- [Validation Rules](validation-rules.md)
