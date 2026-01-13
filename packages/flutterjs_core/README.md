# FlutterJS Core

**Package**: `flutterjs_core`  
**Role**: Core IR (Intermediate Representation) engine and Dart AST transformation layer

---

## Overview

`flutterjs_core` is **the most important package** in FlutterJS. It's responsible for reading and understanding user Dart code, converting it into an intermediate representation (IR) that can be used for code generation.

> [!IMPORTANT]
> **If you need to change how FlutterJS identifies or handles any widget, you must change it here.**

**What it does:**
1. **Reads Dart AST** - Parses user Flutter/Dart code
2. **Transforms to IR** - Converts AST into structured IR models
3. **Analyzes code** - Type inference, flow analysis, symbol resolution
4. **Validates** - Checks for errors and unsupported patterns
5. **Prepares for code generation** - Provides clean, optimized IR for JavaScript generation

---

## Architecture

```
User Dart Code
     ↓
Dart AST (from analyzer package)
     ↓
┌────────────────────────────────────┐
│  flutterjs_core                    │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Analysis Passes             │ │
│  │  • Declaration extraction    │ │
│  │  • Symbol resolution         │ │
│  │  • Type inference            │ │
│  │  • Flow analysis             │ │
│  │  • Validation                │ │
│  └──────────────────────────────┘ │
│            ↓                       │
│  ┌──────────────────────────────┐ │
│  │  IR Models                   │ │
│  │  • Declarations (class, etc.)│ │
│  │  • Statements (if, for, etc.)│ │
│  │  • Expressions (call, etc.)  │ │
│  │  • Widget IR                 │ │
│  │  • Type IR                   │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
     ↓
Structured IR (ready for code generation)
     ↓
flutterjs_tools (generates JavaScript)
```

---

## Package Structure

```
flutterjs_core/
├── lib/
│   ├── flutterjs_core.dart        # Main entry point
│   ├── ast_it.dart                # AST iteration utilities
│   └── src/
│       ├── analysis/              # Analysis passes
│       │   ├── passes/            # Multi-phase analysis
│       │   │   ├── flow_analysis_pass.dart
│       │   │   ├── symbol_resolution.dart
│       │   │   ├── type_inference_pass.dart
│       │   │   └── validation_pass.dart
│       │   ├── visitors/          # AST visitors
│       │   │   └── declaration_pass.dart
│       │   └── extraction/        # Extract specific constructs
│       │       ├── analyze_flutter_app.dart
│       │       ├── expression_extraction_pass.dart
│       │       └── statement_extraction_pass.dart
│       │
│       └── ir/                    # IR Models
│           ├── core/              # Core IR types
│           ├── declarations/      # Class, method, field IR
│           ├── expressions/       # All expression types
│           ├── statements/        # All statement types
│           ├── types/             # Type system IR
│           ├── flutter/           # Flutter-specific IR
│           ├── widgets/           # Widget IR models
│           └── diagnostics/       # Error reporting
```

---

## Core Components

### 1. Analysis Passes

Located in `lib/src/analysis/passes/`

#### Declaration Pass

Extracts class, method, and field declarations from Dart AST.

```dart
import 'package:flutterjs_core/flutterjs_core.dart';

// Extract widget declarations
final declarationPass = DeclarationPass();
final widgets = declarationPass.extractWidgets(compilationUnit);
```

#### Symbol Resolution

Resolves symbols (class names, method names, variable references).

```dart
final symbolResolver = SymbolResolutionPass();
await symbolResolver.resolve(fileIR, typeRegistry);
```

#### Type Inference

Infers types for expressions and variables.

```dart
final typeInference = TypeInferencePass();
final inferredType = typeInference.inferExpressionType(expression);
```

#### Flow Analysis

Analyzes control flow (if/else, loops, returns).

```dart
final flowAnalysis = FlowAnalysisPass();
final controlFlow = flowAnalysis.analyzeMethod(methodDecl);
```

#### Validation

Validates IR for correctness and compatibility.

```dart
final validation = ValidationPass();
final errors = validation.validate(fileIR);
if (errors.isNotEmpty) {
  // Handle validation errors
}
```

---

### 2. IR (Intermediate Representation) Models

Located in `lib/src/ir/`

#### Declarations IR

Represents class, method, and field declarations:

- **`ClassDeclIR`** - Class declaration
- **`MethodDeclIR`** - Method declaration
- **`FieldDeclIR`** - Field declaration
- **`ParameterIR`** - Method parameter
- **`ConstructorDeclIR`** - Constructor declaration

**Example:**
```dart
final classIR = ClassDeclIR(
  name: 'MyWidget',
  superClass: 'StatelessWidget',
  methods: [buildMethod],
  fields: [],
);
```

#### Expressions IR

Represents all expression types:

- **`LiteralExpressionIR`** - String, int, bool, etc.
- **`IdentifierExpressionIR`** - Variable reference
- **`MethodCallExpressionIR`** - Method call
- **`InstanceCreationExpressionIR`** - `new Widget()`
- **`BinaryExpressionIR`** - `a + b`, `x == y`
- **`ConditionalExpressionIR`** - Ternary `a ? b : c`
- **`CascadeExpressionIR`** - Cascade `..child = x`
- **`ListLiteralExpressionIR`** - `[1, 2, 3]`
- **`MapLiteralExpressionIR`** - `{'a': 1}`

#### Statements IR

Represents all statement types:

- **`VariableDeclarationStmtIR`** - Variable declaration
- **`ExpressionStmtIR`** - Expression statement
- **`ReturnStmtIR`** - Return statement
- **`IfStmtIR`** - If/else
- **`ForStmtIR`** - For loop
- **`WhileStmtIR`** - While loop
- **`BlockStmtIR`** - Block `{ ... }`

#### Types IR

Represents Dart type system:

- **`TypeIR`** - Base type representation
- **`NamedTypeIR`** - Named type like `String`, `int`
- **`GenericTypeIR`** - Generic type like `List<T>`
- **`FunctionTypeIR`** - Function type
- **`VoidTypeIR`** - Void type
- **`DynamicTypeIR`** - Dynamic type

#### Widget IR

Represents Flutter widgets:

- **`WidgetIR`** - Widget declaration
- **`StateClassIR`** - State class for StatefulWidget
- **`BuildMethodIR`** - build() method
- **`WidgetTreeIR`** - Widget tree structure

**Example:**
```dart
final widgetIR = WidgetIR(
  name: 'MyWidget',
  type: WidgetType.stateless,
  buildMethod: buildMethodIR,
);
```

---

## How It Works

### 1. Dart AST → IR Conversion

```dart
// Input: Dart AST (from analyzer)
CompilationUnit dartAst = ...;

// Step 1: Extract declarations
final declarationPass = DeclarationPass();
final classes = declarationPass.extractClasses(dartAst);

// Step 2: Extract statements from methods
final stmtPass = StatementExtractionPass();
final statements = stmtPass.extractMethodBody(methodNode);

// Step 3: Extract expressions
final exprPass = ExpressionExtractionPass();
final expressions = exprPass.extractExpressions(statements);

// Result: Clean IR ready for code generation
final fileIR = FileIR(
  classes: classes,
  methods: methods,
  imports: imports,
);
```

### 2. Widget Identification

To identify and convert widgets:

```dart
// Check if class is a widget
bool isWidget(ClassDeclIR cls) {
  return cls.superClass == 'StatelessWidget' ||
         cls.superClass == 'StatefulWidget';
}

// Extract widget tree from build method
final widgetTree = extractWidgetTree(buildMethod);
```

### 3. Type System

The IR includes a complete type system:

```dart
// Represent complex types
final listType = GenericTypeIR(
  baseType: 'List',
  typeArguments: [NamedTypeIR('String')],
);

// Function types
final funcType = FunctionTypeIR(
  returnType: VoidTypeIR(),
  parameters: [NamedTypeIR('int')],
);
```

---

## Usage Examples

### Extract Widget from Dart Code

```dart
import 'package:flutterjs_core/flutterjs_core.dart';

// Parse Dart file
final dartAst = await parseDartFile('lib/main.dart');

// Extract widgets
final declarationPass = DeclarationPass();
final widgets = declarationPass.extractWidgets(dartAst);

for (final widget in widgets) {
  print('Found widget: ${widget.name}');
  print('Type: ${widget.type}');
  print('Build method: ${widget.buildMethod}');
}
```

### Validate IR

```dart
// Validate generated IR
final validationPass = ValidationPass();
final errors = validationPass.validate(fileIR);

if (errors.isNotEmpty) {
  for (final error in errors) {
    print('Error: ${error.message}');
    print('  at ${error.location}');
  }
}
```

### Type Inference

```dart
// Infer types for expressions
final typeInference = TypeInferencePass();

for (final expr in expressions) {
  final type = typeInference.inferType(expr);
  print('${expr} has type ${type}');
}
```

---

## Modifying Widget Detection Logic

**To add support for a new widget or pattern:**

1. **Update Declaration Pass** (`lib/src/analysis/visitors/declaration_pass.dart`)
   - Add logic to identify the new pattern

2. **Create/Update IR Model** (`lib/src/ir/widgets/` or `lib/src/ir/flutter/`)
   - Define IR representation for the new widget

3. **Update Extraction** (`lib/src/analysis/extraction/`)
   - Extract specific properties or patterns

4. **Update Validation** (`lib/src/analysis/passes/validation_pass.dart`)
   - Add validation rules for the new pattern

**Example - Adding custom widget support:**

```dart
// 1. In declaration_pass.dart
if (node.superClass?.name == 'MyCustomWidget') {
  final customWidgetIR = CustomWidgetIR(
    name: node.name,
    // Extract custom properties...
  );
  widgets.add(customWidgetIR);
}

// 2. Create custom_widget_ir.dart
class CustomWidgetIR extends WidgetIR {
  final String customProperty;
  
  CustomWidgetIR({
    required String name,
    required this.customProperty,
  }) : super(name: name, type: WidgetType.custom);
}

// 3. In validation_pass.dart
if (widget is CustomWidgetIR) {
  if (widget.customProperty.isEmpty) {
    errors.add('CustomWidget requires customProperty');
  }
}
```

---

## IR Serialization

The IR can be serialized to binary format for efficient storage and transmission.

**Located in**: (implied from binary format mentions)

```dart
// Serialize IR to binary
final bytes = serializeIR(fileIR);

// Deserialize IR from binary
final fileIR = deserializeIR(bytes);
```

**Note**: The README mentions a bug fix related to string table serialization - this is part of the binary IR format.

---

## Diagnostics

The core package includes diagnostic support:

```dart
// Create diagnostic message
final diagnostic = DiagnosticMessage(
  severity: DiagnosticSeverity.error,
  message: 'Unsupported widget type',
  location: SourceLocation(
    file: 'lib/main.dart',
    line: 42,
    column: 10,
  ),
);

// Report to user
diagnosticReporter.report(diagnostic);
```

---

## Development

### Adding New Expression Types

1. Create IR class in `lib/src/ir/expressions/`
2. Update `ExpressionExtractionPass`
3. Add serialization support
4. Update validation

### Adding New Statement Types

1. Create IR class in `lib/src/ir/statements/`
2. Update `StatementExtractionPass`
3. Add flow analysis support
4. Update validation

### Testing

```bash
cd packages/flutterjs_core
dart test
```

---

## Integration with Other Packages

**`flutterjs_core` is used by:**

- **`flutterjs_analyzer`** - Uses IR for analysis results
- **`flutterjs_tools`** - Uses IR for JavaScript code generation
- **Dart CLI** - Uses analysis passes to process user code

**`flutterjs_core` depends on:**

- `analyzer` - Dart AST parsing
- Flutter SDK types (for widget identification)

---

## Performance Considerations

1. **IR is immutable** - Create new instances instead of modifying
2. **Lazy evaluation** - Some passes analyze on-demand
3. **Caching** - Type inference results can be cached
4. **Parallel processing** - Analysis passes can run in parallel where possible

---

## Troubleshooting

### "Unsupported widget type"

The widget isn't recognized by the declaration pass. Add support in `declaration_pass.dart`.

### "Type inference failed"

The type system can't determine the type. Add explicit type annotations in Dart code or enhance type inference logic.

### "Validation errors"

Check `validation_pass.dart` for specific rules. Some Flutter patterns may not be supported yet.

---

## Future Enhancements

- [ ] Support for more Dart language features (records, patterns, etc.)
- [ ] Improved type inference for complex generics
- [ ] Better error messages with suggestions
- [ ] Performance optimizations for large files
- [ ] Support for Flutter packages beyond material

---

## See Also

- [FlutterJS Analyzer](../flutterjs_analyzer/README.md) - Uses this for analysis
- [FlutterJS Tools](../flutterjs_tools/README.md) - Uses IR for code generation
- [Architecture Overview](../../docs/architecture/overview.md) - System design
- [Contributing Guide](../../docs/contributing/CONTRIBUTING.md) - How to contribute
