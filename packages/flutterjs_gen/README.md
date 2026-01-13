# FlutterJS Code Generator

**Package**: `flutterjs_gen`  
**Purpose**: IR to JavaScript code generation engine

---

## Overview

`flutterjs_gen` is the **code generation engine** of FlutterJS. It takes Intermediate Representation (IR) from `flutterjs_core` and generates optimized, production-ready JavaScript code that runs in browsers.

**What it does:**
1. **Converts IR to JavaScript** - Transforms Flutter/Dart IR into browser-compatible JS
2. **Generates widget code** - Creates JavaScript widget classes
3. **Handles state management** - Generates reactive state code
4. **Optimizes output** - Minifies and optimizes generated code
5. **Validates output** - Ensures generated code is correct

---

## Architecture

```
IR (from flutterjs_core)
     ↓
┌────────────────────────────────────┐
│  flutterjs_gen                     │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Code Generators             │ │
│  │  • Class generator           │ │
│  │  • Function generator        │ │
│  │  • Expression generator      │ │
│  │  • Statement generator       │ │
│  │  • Widget generator          │ │
│  └──────────────────────────────┘ │
│            ↓                       │
│  ┌──────────────────────────────┐ │
│  │  Widget Generation           │ │
│  │  • StatelessWidget → JS      │ │
│  │  • StatefulWidget → JS       │ │
│  │  • Build method generation   │ │
│  │  • Property conversion       │ │
│  └──────────────────────────────┘ │
│            ↓                       │
│  ┌──────────────────────────────┐ │
│  │  Optimization & Validation   │ │
│  │  • JS optimizer              │ │
│  │  • Output validator          │ │
│  │  • Code formatter            │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
     ↓
JavaScript Code (ready for browser)
```

---

## Package Structure

```
flutterjs_gen/
├── lib/
│   ├── flutterjs_gen.dart         # Main entry point
│   └── src/
│       ├── code_generation/       # Core code generators
│       │   ├── class/             # Class generation
│       │   ├── function/          # Function generation
│       │   ├── expression/        # Expression generation
│       │   ├── statement/         # Statement generation
│       │   └── special_features/  # Language features
│       │
│       ├── widget_generation/     # Widget-specific generation
│       │   ├── stateless_widget/  # StatelessWidget → JS
│       │   ├── stateful_widget/   # StatefulWidget → JS
│       │   ├── build_method/      # build() method generation
│       │   ├── instantiation/     # Widget instantiation
│       │   └── prop_conversion/   # Property conversion
│       │
│       ├── file_generation/       # File-level generation
│       │   ├── file_code_gen.dart # Complete file generation
│       │   └── runtime_requirements.dart # Runtime imports
│       │
│       ├── validation_optimization/ # Post-generation
│       │   ├── output_validator.dart # Validate JS output
│       │   └── js_optimizer.dart    # Optimize generated JS
│       │
│       ├── pre_req_code_gen/      # Pre-generation setup
│       │   ├── init_project.dart  # Project initialization
│       │   └── service_detection.dart # Detect services
│       │
│       └── utils/                  # Utility functions
│
└── docs/                           # Technical documentation
    ├── ir_to_js_final_plan.md     # Complete implementation plan
    ├── flutterjs_doc_implementation.md # Implementation guide
    └── ...
```

---

## Core Components

### 1. Code Generators

#### ClassCodeGenerator

Generates JavaScript classes from class declarations.

```dart
final classGenerator = ClassCodeGenerator();
final jsCode = classGenerator.generate(classDeclIR);
```

**Generates:**
```javascript
class MyWidget extends StatelessWidget {
  constructor(props) {
    super(props);
    // Generated constructor
  }
  
  // Generated methods
}
```

#### FunctionCodeGenerator

Generates JavaScript functions.

```dart
final funcGenerator = FunctionCodeGenerator();
final jsCode = funcGenerator.generate(functionIR);
```

#### ExpressionCodeGenerator

Converts expressions to JavaScript.

```dart
final exprGenerator = ExpressionCodeGenerator();
final jsExpr = exprGenerator.generate(expressionIR);
```

#### StatementCodeGenerator

Converts statements to JavaScript.

```dart
final stmtGenerator = StatementCodeGenerator();
final jsStmt = stmtGenerator.generate(statementIR);
```

---

### 2. Widget Generation

#### StatelessWidget Generation

Converts Flutter StatelessWidget to JavaScript class.

```dart
final generator = StatelessWidgetJSCodeGen();
final jsCode = generator.generate(widgetIR);
```

**Input (Dart):**
```dart
class MyWidget extends StatelessWidget {
  final String title;
  
  MyWidget({required this.title});
  
  @override
  Widget build(BuildContext context) {
    return Text(title);
  }
}
```

**Output (JavaScript):**
```javascript
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

#### StatefulWidget Generation

Converts Flutter StatefulWidget to JavaScript.

```dart
final generator = StatefulWidgetJSCodeGen();
final jsCode = generator.generate(widgetIR, stateClassIR);
```

**Input (Dart):**
```dart
class Counter extends StatefulWidget {
  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int count = 0;
  
  void increment() {
    setState(() => count++);
  }
  
  @override
  Widget build(BuildContext context) {
    return Text('$count');
  }
}
```

**Output (JavaScript):**
```javascript
class Counter extends StatefulWidget {
  createState() {
    return new _CounterState();
  }
}

class _CounterState extends State {
  constructor() {
    super();
    this.count = 0;
  }
  
  increment() {
    this.setState(() => this.count++);
  }
  
  build(context) {
    return Text({ text: String(this.count) });
  }
}
```

#### Build Method Generation

Specialized generation for build() methods.

```dart
final generator = BuildMethodCodeGen();
final jsCode = generator.generate(buildMethodIR);
```

---

### 3. Property Conversion

Converts Flutter widget properties to JavaScript equivalents.

```dart
final converter = FlutterPropConverters();

// Convert EdgeInsets
final padding = converter.convertEdgeInsets(edgeInsetsIR);
// EdgeInsets.all(16) → { all: 16 }

// Convert Color
final color = converter.convertColor(colorIR);
// Colors.blue → { value: 0xFF2196F3 }
```

---

### 4. Optimization & Validation

#### JS Optimizer

Optimizes generated JavaScript code.

```dart
final optimizer = JSOptimizer();
final optimizedCode = optimizer.optimize(generatedJS);
```

**Optimizations:**
- Dead code elimination
- Constant folding
- Variable inlining
- Minification

#### Output Validator

Validates generated JavaScript.

```dart
final validator = OutputValidator();
final errors = validator.validate(generatedJS);
```

**Checks:**
- Syntax validity
- Reference resolution
- Type consistency
- Runtime requirements

---

## Usage

### Basic Code Generation

```dart
import 'package:flutterjs_gen/flutterjs_gen.dart';

// Generate from file IR
final fileGenerator = FileCodeGen();
final jsCode = fileGenerator.generate(fileIR);

// Write to file
await File('output.js').writeAsString(jsCode);
```

### Widget-Specific Generation

```dart
// Generate StatelessWidget
final statelessGen = StatelessWidgetJSCodeGen();
final widgetJS = statelessGen.generate(widgetIR);

// Generate StatefulWidget
final statefulGen = StatefulWidgetJSCodeGen();
final statefulJS = statefulGen.generate(widgetIR, stateIR);
```

### With Optimization

```dart
// Generate code
final generator = FileCodeGen();
final rawJS = generator.generate(fileIR);

// Optimize
final optimizer = JSOptimizer();
final optimizedJS = optimizer.optimize(rawJS);

// Validate
final validator = OutputValidator();
final errors = validator.validate(optimizedJS);

if (errors.isEmpty) {
  await File('output.min.js').writeAsString(optimizedJS);
}
```

---

## Generated Code Structure

### Complete File Output

```javascript
// Auto-generated by FlutterJS
import { StatelessWidget, StatefulWidget, State } from '@flutterjs/runtime';
import { Text, Container, Column, Row } from '@flutterjs/material';

class MyApp extends StatelessWidget {
  build(context) {
    return Container({
      child: Text({ text: 'Hello FlutterJS' })
    });
  }
}

export { MyApp };
```

---

## Integration

### With Analyzer

```dart
// 1. Analyze
final analyzer = ProjectAnalyzer(projectPath);
final analysisResult = await analyzer.analyzeProject();

// 2. Generate code
final generator = FileCodeGen();
for (final fileIR in analysisResult.parsedUnits.values) {
  final jsCode = generator.generate(fileIR);
  await writeOutput(jsCode);
}
```

### With CLI

The CLI (`flutterjs_tools`) uses this package internally:

```bash
flutterjs run --to-js
```

Internally:
```dart
// CLI calls generator
final generator = FileCodeGen();
final jsCode = generator.generate(fileIR);
```

---

## Advanced Features

### Special Language Features

Handles Dart-specific features:

```dart
final specialGen = SpecialLanguageFeaturesGen();

// Cascade operator
// obj..method1()..method2()
final cascadeJS = specialGen.generateCascade(cascadeIR);

// Null safety
// value?.property
final nullSafeJS = specialGen.generateNullAware(nullAwareIR);
```

### Runtime Requirements

Detects and includes necessary runtime imports:

```dart
final runtimeReq = RuntimeRequirements();
runtimeReq.detectRequirements(fileIR);

final imports = runtimeReq.generateImports();
// import { StatefulWidget, State } from '@flutterjs/runtime';
// import { Text } from '@flutterjs/material';
```

---

## Diagnostics

Track code generation issues:

```dart
final diagnostic = ModelToJSDiagnostic();

// Log warnings
diagnostic.warn('Unsupported widget type', location: sourceLocation);

// Log errors
diagnostic.error('Cannot generate code', location: sourceLocation);

// Get all issues
final issues = diagnostic.getAllIssues();
```

---

## Best Practices

1. **Validate IR first** - Ensure IR is valid before generation
2. **Optimize for production** - Always optimize production builds
3. **Check diagnostics** - Review warnings and errors
4. **Test generated code** - Run tests on generated JavaScript
5. **Source maps** - Generate source maps for debugging

---

## Performance

### Code Generation Speed

- **Average**: ~50-100 files/second
- **Large projects**: ~5-10 seconds for 500 files
- **Optimization**: Adds ~20-30% overhead

### Output Size

- **Unoptimized**: ~2-3x source size
- **Optimized**: ~1-1.5x source size
- **Minified**: ~0.8-1x source size

---

## Troubleshooting

### "Cannot generate widget"

Check if widget is supported in `widget_generation/`.

### "Invalid IR"

Run validation pass before code generation.

### "Missing runtime imports"

Ensure `RuntimeRequirements` detects all requirements.

---

## See Also

- [FlutterJS Core](../flutterjs_core/README.md) - IR models
- [FlutterJS Tools](../flutterjs_tools/README.md) - CLI integration
- [Technical Documentation](docs/README.md) - Detailed docs
- [Implementation Plan](docs/ir_to_js_final_plan.md) - Complete plan
