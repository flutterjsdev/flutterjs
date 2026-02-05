# FlutterJS Code Generator - Technical Documentation

Comprehensive technical documentation for the `flutterjs_gen` package.

> [!NOTE]  
> For general package overview, see the [main README](../README.md).

---

## Documentation Index

### Core Documents

- **[IR to JS Final Plan](ir_to_js_final_plan.md)** - Complete implementation plan
  - 6-phase conversion architecture
  - Detailed implementation specs
  - Week-by-week roadmap
  - Conversion patterns
  - **Start here** for understanding the complete system

- **[Implementation Guide](flutterjs_doc_implementation.md)** - Step-by-step implementation
  - Code generation strategies
  - Widget mapping
  - State management conversion
  - Best practices

- **[System Structure](flutterjs_doc_structure.md)** - Architecture overview
  - Package organization
  - Component breakdown
  - Integration points

- **[System Summary](flutterjs_doc_summary.md)** - Quick reference
  - Key concepts
  - Component summary
  - Usage patterns

### Development Resources

- **[Comment Guidelines](flutterjs_comment_guidelines.md)** - Documentation standards
- **[CLI Core](flutterjs_doc_cli_core.dart)** - Command-line interface
- **[Deliverables Checklist](flutterjs_doc_deliverables_checklist.md)** - Implementation checklist

### Examples & References

- **[Features Showcase](flutterjs_doc_features_showcase.html)** - Feature demonstrations
- **[System Diagram](flutterjs_doc_system_diagram.mermaid)** - Visual architecture
- **[Material 3 CSS Reference](flutterjs_material3_css_reference.css)** - Styling reference
- **[Primary Button Example](flutterjs_primary_button_html.html)** - HTML generation example
- **[YAML Configuration](flutterjs_yaml_example.txt)** - Config examples
- **[Pubspec Reference](flutterjs_doc_pubspec.txt)** - Package dependencies

---

## Quick Start

### Understanding the System

1. **Read the [IR to JS Final Plan](ir_to_js_final_plan.md)** first - This is the complete blueprint
2. **Review [System Structure](flutterjs_doc_structure.md)** - Understand the package organization
3. **Study [Implementation Guide](flutterjs_doc_implementation.md)** - Learn implementation details

### Key Concepts

#### Phase 0: Pre-Analysis
- IR validation after deserialization
- Type system analysis
- Scope and binding resolution
- Control flow analysis
- Flutter widget identification

#### Phase 1: IR Normalization
- IR lowering (simplification)
- Semantic enhancement
- Metadata addition

#### Phase 2: Core Code Generation
- Expression generation
- Statement generation
- Function/method generation
- Class generation
- Special language features (async, generators, etc.)

#### Phase 3: Flutter-Specific Generation
- Widget instantiation
- Build method conversion
- StatefulWidget generation
- StatelessWidget generation
- Property conversion

#### Phase 4: File-Level Generation
- Import management
- Dependency ordering
- Runtime requirements

#### Phase 5: Optimization & Validation
- JS optimization
- Output validation
- Source map generation

#### Phase 6: Reporting
- Conversion metrics
- Coverage reporting
- Diagnostic output

---

## Architecture Overview

```
IR (from flutterjs_core)
    ↓
┌──────────────────────────────────────────────┐
│ Phase 0: Pre-Analysis                       │
│  • Validation                                │
│  • Type analysis                             │
│  • Scope resolution                          │
│  • Widget detection                          │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ Phase 1: Normalization                       │
│  • IR lowering                               │
│  • Enhancement                               │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ Phase 2-3: Code Generation                   │
│  • Core language features                    │
│  • Flutter widgets                           │
└──────────────┬───────────────────────────────┘
               ↓
┌──────────────────────────────────────────────┐
│ Phase 4-5: File Assembly & Optimization      │
│  • File structure                            │
│  • Optimization                              │
│  • Validation                                │
└──────────────┬───────────────────────────────┘
               ↓
JavaScript Output
```

---

## Package Structure

```
flutterjs_gen/
├── lib/src/
│   ├── code_generation/      # Core code generators
│   │   ├── class/
│   │   ├── function/
│   │   ├── expression/
│   │   ├── statement/
│   │   └── special_features/
│   │
│   ├── widget_generation/    # Flutter widget generators
│   │   ├── stateless_widget/
│   │   ├── stateful_widget/
│   │   ├── build_method/
│   │   ├── instantiation/
│   │   └── prop_conversion/
│   │
│   ├── file_generation/      # File-level generation
│   ├── validation_optimization/ # Post-generation
│   ├── pre_req_code_gen/     # Pre-generation setup
│   └── utils/                # Utilities
│
└── docs/                     # This documentation
```

---

## Code Generation Patterns

### Core Language Features

**Expressions:**
```dart
// Dart IR
BinaryExpressionIR(
  left: IdentifierExpressionIR('x'),
  operator: '+',
  right: IdentifierExpressionIR('y'),
)

// JavaScript Output
x + y
```

**Async/Await:**
```dart
// Dart IR
AsyncMethodIR(...)

// JavaScript Output
async function methodName() {
  const data = await fetch();
  return data;
}
```

### Flutter Widgets

**StatelessWidget:**
```dart
// Dart
class MyWidget extends StatelessWidget {
  final String title;
  Widget build(BuildContext context) {
    return Text(title);
  }
}

// JavaScript
class MyWidget extends StatelessWidget {
  constructor({ title }) {
    super();
    this.title = title;
  }
  build(context) {
    return Text({ text: this.title });
  }
}
```

**StatefulWidget:**
```dart
// Dart
class Counter extends StatefulWidget {...}
class _CounterState extends State<Counter> {
  int count = 0;
  void increment() { setState(() => count++); }
  Widget build(BuildContext context) { return Text('$count'); }
}

// JavaScript
class Counter extends StatefulWidget {
  createState() { return new _CounterState(); }
}
class _CounterState extends State {
  constructor() { super(); this.count = 0; }
  increment() { this.setState(() => this.count++); }
  build(context) { return Text({ text: String(this.count) }); }
}
```

---

## Best Practices

### For Code Generation

1. **Validate IR first** - Always validate before generating
2. **Generate in phases** - Follow the 6-phase architecture
3. **Preserve source locations** - For debugging
4. **Optimize last** - Generate correct code first, optimize later
5. **Test incrementally** - Test each generator independently

### For Contributors

1. **Follow the plan** - Reference [IR to JS Final Plan](ir_to_js_final_plan.md)
2. **Document patterns** - Add examples for new patterns
3. **Write tests** - Test each generator thoroughly
4. **Update docs** - Keep documentation in sync

---

## Common Patterns

### Adding New Expression Type

1. Identify the IR type
2. Add to `ExpressionCodeGenerator`
3. Handle in `generate()` method
4. Add tests
5. Update documentation

### Adding New Widget Support

1. Add to widget registry
2. Create property converters
3. Add instantiation logic
4. Test generation
5. Document widget mapping

---

## Troubleshooting

### "Unsupported IR type"

Check if the IR type is handled in the appropriate generator:
- Expression → `ExpressionCodeGenerator`
- Statement → `StatementCodeGenerator`
- Widget → Widget generators

### "Invalid JavaScript output"

Run through `OutputValidator` to identify issues:
```dart
final validator = OutputValidator();
final errors = validator.validate(jsCode);
```

### "Missing runtime imports"

Use `RuntimeRequirements` to detect needed imports:
```dart
final runtime = RuntimeRequirements();
runtime.detectRequirements(fileIR);
final imports = runtime.generateImports();
```

---

## Performance Tips

1. **Cache type information** - Type resolution is expensive
2. **Reuse generators** - Don't create new instances
3. **Batch file operations** - Write all files at once
4. **Use streaming** - For large outputs

---

## See Also

- [Package README](../README.md) - General overview
- [FlutterJS Core](../../flutterjs_core/README.md) - IR models
- [FlutterJS Tools](../../flutterjs_tools/README.md) - CLI integration
- [Main Documentation](../../../docs/README.md) - Project documentation
