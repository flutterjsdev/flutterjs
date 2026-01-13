# FlutterJS Core - Technical Documentation

In-depth technical documentation for the `flutterjs_core` package.

> [!NOTE]
> This documentation is for **contributors and advanced users** working with FlutterJS internals.  
> For general package overview, see the [main README](../README.md).

---

## Overview

`flutterjs_core` is the heart of FlutterJS - it converts Dart Abstract Syntax Trees (AST) into a clean Intermediate Representation (IR) that can be used for JavaScript code generation.

---

## Documentation Index

### Architecture & Design

- **[IR System Overview](ir-system-overview.md)** - Complete IR type system architecture
  - IR design principles
  - Type hierarchy
  - Serialization format
  - Immutability and safety

### Analysis Pipeline

- **[Analysis Passes](analysis-passes.md)** - Multi-phase analysis pipeline
  - Declaration extraction
  - Symbol resolution
  - Type inference
  - Flow analysis
  - Validation

### IR Models

- **[Declaration IR](ir-declarations.md)** - Class, method, field IR models
  - ClassDeclIR
  - MethodDeclIR
  - FieldDeclIR
  - ConstructorDeclIR
  - ParameterIR

- **[Expression IR](ir-expressions.md)** - All expression types
  - Literals
  - Identifiers
  - Method calls
  - Instance creation
  - Binary/unary operations
  - Cascades
  - Collections

- **[Statement IR](ir-statements.md)** - All statement types
  - Variable declarations
  - Control flow (if, for, while)
  - Return statements
  - Blocks

- **[Type IR](ir-types.md)** - Type system representation
  - Named types
  - Generic types
  - Function types
  - Void/Dynamic

- **[Widget IR](ir-widgets.md)** - Flutter widget models
  - WidgetIR
  - StateClassIR
  - BuildMethodIR
  - Widget tree structure

### Guides

- **[Adding Widget Support](guide-adding-widgets.md)** - How to add new widget types
- **[Extending Analysis](guide-extending-analysis.md)** - How to add new analysis passes
- **[Custom Expression Types](guide-custom-expressions.md)** - How to support new expression patterns

---

## Quick Links

- [Package README](../README.md)
- [FlutterJS Architecture](../../../docs/architecture/overview.md)
- [Contributing Guide](../../../docs/contributing/CONTRIBUTING.md)

---

## Component Hierarchy

```
flutterjs_core
├── Analysis Layer
│   ├── Passes (multi-phase)
│   ├── Visitors (AST traversal)
│   └── Extraction (targeted extraction)
│
└── IR Layer
    ├── Core (base types)
    ├── Declarations (structure)
    ├── Expressions (values)
    ├── Statements (logic)
    ├── Types (type system)
    ├── Flutter (Flutter-specific)
    ├── Widgets (widget models)
    └── Diagnostics (errors)
```

---

## Development Workflow

### 1. Understanding User Code

```
User writes:
class MyWidget extends StatelessWidget {
  Widget build(BuildContext context) => Text('Hello');
}

↓ Dart analyzer parses to AST
↓ flutterjs_core processes
↓ Generates IR
↓ flutterjs_tools uses IR
↓ Outputs JavaScript
```

### 2. IR Transformation Pipeline

```
Phase 1: Declaration Pass
├─ Identify widgets (StatelessWidget, StatefulWidget)
├─ Extract class structure
└─ Find build() methods

Phase 2: Symbol Resolution
├─ Resolve class names
├─ Resolve method references
└─ Build symbol table

Phase 3: Type Inference
├─ Infer expression types
├─ Validate type compatibility
└─ Populate type information

Phase 4: Flow Analysis
├─ Analyze control flow
├─ Detect unreachable code
└─ Validate return paths

Phase 5: Validation
├─ Check for unsupported patterns
├─ Validate widget structure
└─ Report errors
```

---

## Best Practices

### For Contributors

1. **Keep IR immutable** - Always create new instances
2. **Add validation** - Validate new IR types in validation pass
3. **Document types** - Add comprehensive DartDoc
4. **Test thoroughly** - Unit tests for every IR type
5. **Consider serialization** - Ensure IR can be serialized

### For Users

1. **Use type inference** - Let the system infer types when possible
2. **Check validation errors** - Always validate IR before code generation
3. **Cache results** - Analysis results can be expensive to compute

---

## Common Patterns

### Traversing IR

```dart
// Visit all expressions in a method
void visitExpressions(MethodDeclIR method) {
  for (final stmt in method.body) {
    if (stmt is ExpressionStmtIR) {
      processExpression(stmt.expression);
    } else if (stmt is ReturnStmtIR) {
      processExpression(stmt.value);
    }
  }
}
```

### Building IR

```dart
// Create a method IR
final methodIR = MethodDeclIR(
  name: 'build',
  returnType: NamedTypeIR('Widget'),
  parameters: [
    ParameterIR(
      name: 'context',
      type: NamedTypeIR('BuildContext'),
    ),
  ],
  body: [
    ReturnStmtIR(
      value: InstanceCreationExpressionIR(
        type: NamedTypeIR('Text'),
        arguments: [LiteralExpressionIR('Hello')],
      ),
    ),
  ],
);
```

---

## Troubleshooting

### IR Generation Fails

1. Check if widget is supported
2. Verify Dart syntax is correct
3. Look for unsupported language features
4. Check validation errors

### Type Inference Issues

1. Add explicit type annotations
2. Check if custom types are registered
3. Verify type parameters are correct

### Serialization Errors

1. Ensure all IR types implement serialization
2. Check string table for missing strings
3. Verify binary format version

---

## Performance Tips

1. **Cache type lookups** - Type resolution can be expensive
2. **Parallel analysis** - Run independent passes in parallel
3. **Incremental processing** - Only reprocess changed files
4. **Lazy evaluation** - Defer expensive operations

---

## See Also

- [Main Package README](../README.md)
- [FlutterJS Analyzer](../../flutterjs_analyzer/README.md)
- [FlutterJS Tools](../../flutterjs_tools/README.md)
