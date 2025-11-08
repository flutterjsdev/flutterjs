# IR to JavaScript Conversion - FINAL COMPREHENSIVE PLAN
## Complete IR → JS with All Language Features + Flutter Widgets

---

## YOUR CURRENT STATE
✅ You have: Dart source → IR (DartFile structure)
✅ You have: IR → Binary serialization (.flir files)
❌ You need: IR → JavaScript code generation

---

# COMPLETE ARCHITECTURE

```
INPUT: .flir (serialized DartFile IR)
    ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0: PRE-ANALYSIS (Validation & Understanding)          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 0.1 IR POST-DESERIALIZATION VALIDATOR                       │
│     • Structural integrity check                            │
│     • Semantic validity check                               │
│     • Completeness verification                             │
│     • Binary integrity validation                           │
│     Output: ValidationReport                                │
│                                                              │
│ 0.2 IR TYPE SYSTEM ANALYZER                                 │
│     • Build type table (class name → TypeInfo)              │
│     • Resolve all type references                           │
│     • Handle nullable types (String?)                       │
│     • Handle generics (List<String>)                        │
│     • Infer implicit types (var → concrete)                 │
│     Output: TypeEnvironment                                 │
│                                                              │
│ 0.3 IR SCOPE & BINDING ANALYZER                             │
│     • Build scope chains (global → local)                   │
│     • Map variable → declaration                            │
│     • Analyze closure captures                              │
│     • Track variable lifetimes                              │
│     Output: ScopeModel                                      │
│                                                              │
│ 0.4 IR CONTROL FLOW ANALYZER                                │
│     • Build control flow graph                              │
│     • Detect unreachable code                               │
│     • Analyze loop structures                               │
│     • Track exception flow                                  │
│     Output: ControlFlowGraph                                │
│                                                              │
│ 0.5 FLUTTER WIDGET ANALYSIS                                 │
│     • Widget classification (Stateful/Stateless)            │
│     • Map Dart widgets → JS framework widgets               │
│     • Analyze lifecycle methods                             │
│     • Extract state fields & reactive properties            │
│     • Build widget tree from build()                        │
│     Output: WidgetInfo, LifecycleMapping, StateModel        │
│                                                              │
│ 0.6 COMPREHENSIVE ANALYSIS REPORT                           │
│     Combine all analysis into decision point:               │
│     - Can proceed? (no critical errors)                     │
│     - Confidence score                                      │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
                 [DECISION GATE]
              If issues → Report & Stop
              If OK → Continue to Phase 1
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: IR NORMALIZATION & ENHANCEMENT                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1.1 IR LOWERING ENGINE                                      │
│     • Simplify cascade expressions                          │
│     • Expand null-aware operations (x?.foo() → x != null)   │
│     • Desugar async/await to Promise chains                 │
│     • Desugar generators to iterator protocol               │
│     • Expand collection if/for                              │
│     Output: NormalizedDartFile (simplified IR)              │
│                                                              │
│ 1.2 SEMANTIC ENHANCEMENT PASS                               │
│     • Add resolved type to every expression                 │
│     • Mark which expressions need type checks               │
│     • Mark which need null checks                           │
│     • Identify pure/const expressions                       │
│     • Add closure metadata                                  │
│     • Add async/Promise metadata                            │
│     Output: EnhancedDartFile (IR with metadata)             │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: CODE GENERATION (Core Language Features)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 2.1 EXPRESSION CODE GENERATOR                               │
│     • Literals (string, number, bool, null)                 │
│     • Identifiers & variables                               │
│     • Binary operations (all operators)                     │
│     • Unary operations (!x, -x, +x)                         │
│     • Method calls & function calls                         │
│     • Property access (obj.prop, obj[key])                  │
│     • Collections (List, Map, Set)                          │
│     • Collection literals with if/for                       │
│     • String interpolation ($var, ${expr})                  │
│     • Closures & lambdas (=> expressions)                   │
│     • Ternary & null coalescing (? :, ??)                   │
│     • Type checks & casts (is, is!, as)                     │
│     • Optional chaining (x?.method())                       │
│     • Async operations (await, yield)                       │
│     • Spread operators (...)                                │
│     Output: JavaScript expression strings                   │
│                                                              │
│ 2.2 STATEMENT CODE GENERATOR                                │
│     • Expression statements                                 │
│     • Variable declarations (let, const)                    │
│     • If/else statements                                    │
│     • For loops (traditional, for-of, forEach)              │
│     • While & do-while loops                                │
│     • Switch statements                                     │
│     • Break & continue (with labels)                        │
│     • Return statements                                     │
│     • Block statements                                      │
│     • Try-catch-finally                                     │
│     • Throw statements                                      │
│     • Assert statements                                     │
│     Output: JavaScript statement strings                    │
│                                                              │
│ 2.3 FUNCTION/METHOD CODE GENERATOR                          │
│     • Regular functions                                     │
│     • Arrow functions (=>) with expression bodies           │
│     • Async functions & generators                          │
│     • Getters & setters                                     │
│     • Constructors (regular & factory)                      │
│     • Parameter handling:                                   │
│       - Required parameters                                 │
│       - Optional parameters (default values)                │
│       - Named parameters ({param: value})                   │
│       - Rest parameters (...args)                           │
│     • Generic functions <T>                                 │
│     • Method bodies with local variables                    │
│     Output: JavaScript function strings                     │
│                                                              │
│ 2.4 CLASS CODE GENERATOR                                    │
│     • Regular classes                                       │
│     • Class inheritance (extends)                           │
│     • Static members & methods                              │
│     • Instance fields & properties                          │
│     • Constructors with initializers                        │
│     • All instance methods (CONVERT BODIES)                 │
│     • All static methods (CONVERT BODIES)                   │
│     • Getters & setters                                     │
│     • Abstract classes (error on non-impl)                  │
│     • Generic classes <T>                                   │
│     • Enums (objects with named properties)                 │
│     • Mixins & extensions                                   │
│     • Constants & static fields                             │
│     Output: JavaScript class strings                        │
│                                                              │
│ 2.5 SPECIAL LANGUAGE FEATURES                               │
│     • Async/await → Promise chains                          │
│     • Generators (sync* / async*)                           │
│     • Future/Stream handling                                │
│     • Null safety operator (??)                             │
│     • Pattern matching → if/else chains                     │
│     • Cascade expressions (..)                              │
│     • Default values & named params                         │
│     Output: Proper JS async/generator patterns              │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: FLUTTER-SPECIFIC CODE GENERATION                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 3.1 FLUTTER WIDGET REGISTRY                                 │
│     • Map known widgets (Container, Text, Row, Column, etc) │
│     • Define prop types for each widget                     │
│     • Import/export Flutter.js framework classes            │
│                                                              │
│ 3.2 WIDGET INSTANTIATION GENERATOR                          │
│     • Convert InstanceCreationExpressionIR                  │
│     • Container(...) → new Container({...})                 │
│     • Text(...) → new Text({...})                           │
│     • Handle named arguments as object properties           │
│     • Convert prop values (colors, sizes, alignment)        │
│     • Validate known widget props                           │
│     • Support custom widget classes                         │
│     Output: JavaScript widget instantiations                │
│                                                              │
│ 3.3 BUILD METHOD GENERATOR                                  │
│     • Convert build() method bodies                         │
│     • Extract widget creation logic                         │
│     • Handle conditional rendering (if/else in build)       │
│     • Handle loops creating widgets                         │
│     • Build widget tree from build() expression             │
│     • Generate proper return statements                     │
│     Output: JS build() methods                              │
│                                                              │
│ 3.4 STATEFUL WIDGET GENERATOR                               │
│     • Convert StatefulWidget class                          │
│     • Generate createState() method                         │
│     • Convert State class                                   │
│     • Map lifecycle: initState→ method, dispose→ method     │
│     • Extract state fields & assign to this.state           │
│     • Generate setState() wrapper                           │
│     • Convert all State methods (CONVERT BODIES)            │
│     • Convert build() to render()                           │
│     Output: Complete JS StatefulWidget + State              │
│                                                              │
│ 3.5 STATELESS WIDGET GENERATOR                              │
│     • Convert StatelessWidget class                         │
│     • Generate constructor with props                       │
│     • Convert build() method                                │
│     • Convert all methods (CONVERT BODIES)                  │
│     Output: Complete JS StatelessWidget                     │
│                                                              │
│ 3.6 FLUTTER PROP CONVERTERS                                 │
│     • Color handling (string/enum → hex)                    │
│     • Alignment (enum → CSS/position values)                │
│     • EdgeInsets (constructor → object)                     │
│     • TextStyle (object → CSS-compatible)                   │
│     • BoxConstraints (object properties)                    │
│     • TextAlign, BoxFit, MainAxisAlignment, etc             │
│     Output: Proper Flutter.js framework values              │
│                                                              │
│ 3.7 FLUTTER VALIDATION                                      │
│     • All widgets have JS equivalents                        │
│     • Props match known widget signatures                    │
│     • No unknown prop names                                  │
│     • Required props present                                │
│     Output: Widget validation report                        │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: FILE-LEVEL GENERATION                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 4.1 FILE STRUCTURE GENERATOR                                │
│     • Header comments & warnings                            │
│     • Imports (Framework, helpers, dependencies)            │
│     • Helper function definitions                           │
│     • Type check helpers (isType_X, isType_List)            │
│     • Type conversion helpers (toString, toInt)             │
│     • Null check helpers                                    │
│     • Collections generation (if needed)                    │
│     • Enums & constants (top-level)                         │
│     • Classes in dependency order                           │
│     • Functions (top-level)                                 │
│     • Exports & module definitions                          │
│                                                              │
│ 4.2 DEPENDENCY RESOLUTION                                   │
│     • Build class dependency graph                          │
│     • Determine proper class order                          │
│     • Detect circular dependencies                          │
│     • Generate classes in correct sequence                  │
│                                                              │
│ 4.3 RUNTIME REQUIREMENTS COLLECTOR                          │
│     • Identify needed helper functions                      │
│     • Type checks required                                  │
│     • Collections operations needed                         │
│     • Async helpers (if using async/await)                  │
│     • Generator helpers (if using generators)               │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: OUTPUT VALIDATION & OPTIMIZATION                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 5.1 GENERATED CODE VALIDATOR                                │
│     • JavaScript syntax validation                          │
│     • Semantic checks:                                      │
│       - All variables defined before use                    │
│       - All functions called are defined                    │
│       - Type consistency                                    │
│       - No undefined properties                             │
│     • Runtime checks:                                       │
│       - Required helpers present                            │
│       - All imports available                               │
│     • Output: Validation report with fixes                  │
│                                                              │
│ 5.2 JAVASCRIPT OPTIMIZER                                    │
│     Level 1 (Default):                                      │
│       • Constant folding (1 + 2 → 3)                        │
│       • Dead code elimination                               │
│       • Unused variable removal                             │
│                                                              │
│     Level 2 (Aggressive):                                   │
│       • Common subexpression elimination                    │
│       • Variable inlining                                   │
│       • Unreachable branch removal                          │
│                                                              │
│     Level 3 (Extreme):                                      │
│       • Function inlining                                   │
│       • Method inlining                                     │
│       • Minification                                        │
│                                                              │
│ 5.3 SOURCE MAP GENERATION                                   │
│     • Map JS lines → Dart source                            │
│     • Enable debugging                                      │
│     • Track transformations                                 │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: REPORTING & OUTPUT                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 6.1 CONVERSION REPORT                                       │
│     • Input file stats (classes, functions, lines)          │
│     • Output stats (similar)                                │
│     • Duration & performance metrics                        │
│     • Confidence score                                      │
│     • Issues found (errors, warnings, info)                 │
│     • Suggestions for improvement                           │
│                                                              │
│ 6.2 COVERAGE METRICS                                        │
│     • % of code converted                                   │
│     • % of widgets handled                                  │
│     • Unsupported features list                             │
│                                                              │
│ 6.3 OUTPUT FILES                                            │
│     • .js file (generated JavaScript)                       │
│     • .js.map file (source mapping)                         │
│     • .report.json (machine-readable)                       │
│     • .report.html (human-readable)                         │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
OUTPUT: Complete .js file ready to use in Flutter.js framework
```

---

# DETAILED IMPLEMENTATION SPECS

## PHASE 0: PRE-ANALYSIS

### 0.1 IR Post-Deserialization Validator
```dart
class IRPostDeserializeValidator {
  final DartFile dartFile;
  final List<ValidationError> errors = [];
  
  ValidationReport validate() {
    _checkStructuralIntegrity();    // References valid, no nulls
    _checkSemanticValidity();       // Types match, no cycles
    _checkCompletenessAfterDeser(); // All data present
    _checkBinaryIntegrity();        // Checksums, formats
    return ValidationReport(errors, canProceed: errors.isEmpty);
  }
}
```

### 0.2 IR Type System Analyzer
```dart
class IRTypeSystemAnalyzer {
  final DartFile dartFile;
  final ValidationReport validationReport;
  
  late TypeEnvironment typeEnvironment;
  
  void analyze() {
    _buildTypeTable();        // class → TypeInfo
    _resolveTypeReferences(); // Forward refs → resolved
    _inferImplicitTypes();    // var → concrete
    _validateTypeConsistency();
  }
}
```

### 0.3 IR Scope & Binding Analyzer
```dart
class IRScopeAnalyzer {
  final DartFile dartFile;
  final TypeEnvironment typeEnvironment;
  
  late ScopeModel scopeModel;
  
  void analyze() {
    _buildScopeChain();    // Global → local
    _resolveBindings();    // var → declaration
    _analyzeClosures();    // Capture info
    _analyzeLifetimes();   // Init to last-use
  }
}
```

### 0.4 IR Control Flow Analyzer
```dart
class IRControlFlowAnalyzer {
  final DartFile dartFile;
  final ScopeModel scopeModel;
  
  late ControlFlowGraph cfg;
  
  void analyze() {
    _buildCFG();           // Basic blocks
    _analyzeReachability(); // Dead code
    _analyzeLoops();       // Structure
    _analyzeExceptions();  // Flow
  }
}
```

### 0.5 Flutter Widget Analysis
```dart
class FlutterWidgetAnalyzer {
  final DartFile dartFile;
  
  late Map<String, WidgetInfo> widgetMap;
  late Map<String, LifecycleMapping> lifecycles;
  late Map<String, StateModel> stateModels;
  late Map<String, WidgetTree> buildTrees;
  
  void analyze() {
    _classifyWidgets();
    _mapLifecycles();
    _analyzeState();
    _buildWidgetTrees();
    _validateWidgets();
  }
}
```

---

## PHASE 2: CODE GENERATION

### 2.1 Expression Code Generator
```dart
class ExpressionCodeGen {
  String generate(ExpressionIR expr) {
    // All expression types:
    // Literals, identifiers, binary/unary ops,
    // method calls, property access, conditionals,
    // collections, strings, closures, type checks, async
  }
}
```

**Converts:**
- `42` → `42`
- `'hello'` → `'hello'`
- `true` → `true`
- `null` → `null`
- `x + y` → `x + y`
- `x == y` → `x === y`
- `a ?? b` → `a ?? b`
- `a ?.method()` → `a?.method()`
- `[1, 2, 3]` → `[1, 2, 3]`
- `{'a': 1}` → `{a: 1}`
- `x is String` → `typeof x === 'string'`
- `x as int` → `Number(x)`
- `'Hello $name'` → `` `Hello ${name}` ``
- `await promise` → `await promise`
- `yield value` → `yield value`

### 2.2 Statement Code Generator
```dart
class StatementCodeGen {
  String generate(StatementIR stmt) {
    // if/else, for, while, do-while, switch,
    // try-catch-finally, break, continue, return,
    // block, expression, variable declaration
  }
}
```

**Converts:**
- `if (x > 0) { ... }` → `if (x > 0) { ... }`
- `for (int i = 0; i < 10; i++)` → `for (let i = 0; i < 10; i++)`
- `for (var item in list)` → `for (const item of list)`
- `while (true) { ... }` → `while (true) { ... }`
- `switch (x) { case 1: ... }` → `switch (x) { case 1: ... }`
- `try { } catch (e) { }` → `try { } catch (e) { }`

### 2.3 Function/Method Code Generator
```dart
class FunctionCodeGen {
  String generate(FunctionDecl func) {
    // Regular, arrow, async, generators,
    // constructors, getters/setters, factories,
    // with proper parameter handling
  }
}
```

**Converts:**
- `int add(int a, int b) => a + b;` → `const add = (a, b) => a + b;`
- `void foo({int x = 0}) { }` → `function foo({x = 0} = {}) { }`
- `Future<int> load() async { }` → `async function load() { }`
- `Iterable<int> count() sync* { yield i; }` → `function* count() { yield i; }`

### 2.4 Class Code Generator
```dart
class ClassCodeGen {
  String generate(ClassDecl cls) {
    // Generate complete class with:
    // - Constructor
    // - Fields/properties
    // - Methods (ALL BODIES CONVERTED)
    // - Static members
    // - Getters/setters
    // - Inheritance
  }
}
```

### 2.5 Special Language Features

#### Async/Await → Promises
```dart
// Dart
Future<String> load() async {
  final data = await fetch();
  return data;
}

// JavaScript
async function load() {
  const data = await fetch();
  return data;
}
```

#### Generators
```dart
// Dart - Sync
Iterable<int> count() sync* {
  for (int i = 0; i < 5; i++) yield i;
}

// JavaScript
function* count() {
  for (let i = 0; i < 5; i++) yield i;
}
```

#### Null Safety
```dart
// Dart
String? name = null;
name ?.toUpperCase()
name ?? 'default'

// JavaScript
let name = null;
name?.toUpperCase()
name ?? 'default'
```

#### Pattern Matching → If/Else
```dart
// Dart
switch (shape) {
  case Circle c:
    print(c.radius);
  case Square s:
    print(s.side);
}

// JavaScript
if (shape instanceof Circle) {
  const c = shape;
  console.log(c.radius);
} else if (shape instanceof Square) {
  const s = shape;
  console.log(s.side);
}
```

---

## PHASE 3: FLUTTER-SPECIFIC

### 3.1 Flutter Widget Registry
```dart
class FlutterWidgetRegistry {
  static const dartToJSWidgets = {
    'Container': JSWidgetInfo(jsClass: 'Container', ...),
    'Text': JSWidgetInfo(jsClass: 'Text', ...),
    'Row': JSWidgetInfo(jsClass: 'Row', ...),
    'Column': JSWidgetInfo(jsClass: 'Column', ...),
    'Scaffold': JSWidgetInfo(jsClass: 'Scaffold', ...),
    // ... all known widgets
  };
}
```

### 3.2 Widget Instantiation Generator
```dart
class WidgetInstantiationCodeGen {
  String generateWidgetInstantiation(InstanceCreationExpressionIR expr) {
    // Container(child: Text('Hi'), color: 'blue')
    // →
    // new Container({
    //   child: new Text({data: 'Hi'}),
    //   color: 'blue'
    // })
  }
}
```

### 3.3 Build Method Generator
```dart
class BuildMethodCodeGen {
  String generateBuild(MethodDecl buildMethod) {
    // Extract widget tree
    // Convert all expressions
    // Generate proper return statement
  }
}
```

### 3.4 StatefulWidget Generator
```dart
class StatefulWidgetJSCodeGen {
  String generate() {
    // Generate:
    // 1. Widget class with createState()
    // 2. State class with:
    //    - Constructor (initialize state)
    //    - initState() method
    //    - dispose() method
    //    - setState() wrapper
    //    - All methods (bodies converted)
    //    - build() as main render method
  }
}
```

### 3.5 StatelessWidget Generator
```dart
class StatelessWidgetJSCodeGen {
  String generate() {
    // Generate class with:
    // - Constructor (props)
    // - All methods (bodies converted)
    // - build() method
  }
}
```

### 3.6 Flutter Prop Converters
```dart
class FlutterPropConverter {
  String convertColor(ExpressionIR expr) { /* ... */ }
  String convertAlignment(ExpressionIR expr) { /* ... */ }
  String convertEdgeInsets(ExpressionIR expr) { /* ... */ }
  String convertTextStyle(ExpressionIR expr) { /* ... */ }
  // ... more converters
}
```

---

## PHASE 4: FILE-LEVEL GENERATION

```dart
class FileCodeGen {
  String generate(DartFile dartFile) {
    // 1. Header + imports
    // 2. Helper functions
    // 3. Enums & constants (top-level)
    // 4. Classes (dependency order)
    // 5. Functions (top-level)
    // 6. Exports
  }
}
```

---

## PHASE 5: VALIDATION & OPTIMIZATION

```dart
class OutputValidator {
  ValidationReport validate(String jsCode) {
    _syntaxValidation();   // Valid JS?
    _semanticValidation(); // All vars defined?
    _runtimeValidation();  // Helpers present?
  }
}

class JSOptimizer {
  String optimize(String code, {int level = 1}) {
    // Level 1: const folding, dead code
    // Level 2: CSE, inlining
    // Level 3: method inlining, minify
  }
}
```

---

# IMPLEMENTATION ROADMAP

## Week 1: Validation & Analysis
- [ ] IRPostDeserializeValidator
- [ ] IRTypeSystemAnalyzer
- [ ] IRScopeAnalyzer
- [ ] IRControlFlowAnalyzer
- [ ] Tests for each analyzer

## Week 2: Flutter Analysis
- [ ] FlutterWidgetAnalyzer
- [ ] FlutterWidgetRegistry
- [ ] LifecycleMapper
- [ ] StateAnalyzer
- [ ] BuildTreeAnalyzer

## Week 3-4: Core Language Code Gen
- [ ] ExpressionCodeGen (all expression types)
- [ ] StatementCodeGen (all statement types)
- [ ] FunctionCodeGen (all function types)
- [ ] ClassCodeGen (all class types)
- [ ] Special features (async, generators, patterns)

## Week 5: Flutter Code Gen
- [ ] WidgetInstantiationCodeGen
- [ ] BuildMethodCodeGen
- [ ] StatefulWidgetJSCodeGen
- [ ] StatelessWidgetJSCodeGen
- [ ] FlutterPropConverters

## Week 6: File Generation
- [ ] FileCodeGen
- [ ] DependencyResolver
- [ ] RuntimeRequirementsCollector
- [ ] Helper function generator

## Week 7: Validation & Testing
- [ ] OutputValidator
- [ ] JSOptimizer
- [ ] SourceMapGenerator
- [ ] Integration tests

## Week 8: Polish & Reporting
- [ ] ConversionReport
- [ ] CoverageMetrics
- [ ] HTML report generation
- [ ] Bug fixes

---

# KEY CONVERSION PATTERNS

## Functions & Methods
```
// Regular function
int add(int a, int b) { return a + b; }
→
function add(a, b) { return a + b; }

// Arrow function  
int add(int a, int b) => a + b;
→
const add = (a, b) => a + b;

// Async function
Future<String> load() async { ... }
→
async function load() { ... }

// Generator
Iterable<int> count() sync* { yield i; }
→
function* count() { yield i; }
```

## Classes & Inheritance
```
// Basic class
class Point {
  int x, y;
  Point(this.x, this.y);
}
→
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// Inheritance
class Circle extends Shape { ... }
→
class Circle extends Shape { ... }

// Static members
class Math {
  static const PI = 3.14;
  static double abs(double x) { ... }
}
→
class Math {
  static PI = 3.14;
  static abs(x) { ... }
}
```

## Control Flow
```
// If/else
if (x > 0) { ... } else { ... }
→ (identical)

// For loop
for (int i = 0; i < 10; i++) { ... }
→
for (let i = 0; i < 10; i++) { ... }

// For-each
for (var item in list) { ... }
→
for (const item of list) { ... }

// Switch
switch (x) { case 1: ... }
→ (identical)
```

## Collections
```
// List
[1, 2, 3]
→
[1, 2, 3]

// List with if/for
[if (x > 0) 1, for (int i = 0; i < 5; i++) i]
→
[...(x > 0 ? [1] : []), ...Array.from({length: 5}, (_, i) => i)]

// Map
{'a': 1, 'b': 2}
→
{a: 1, b: 2}

// Set
{1, 2, 3}
→
new Set([1, 2, 3])
```

## String Interpolation
```
// Simple
'Hello $name'
→
`Hello ${name}`

// Expression
'Value: ${x * 2}'
→
`Value: ${x * 2}`
```

## Type System
```
// Type check
x is String
→
typeof x === 'string' || x instanceof String

// Type negation
x is! int
→
!(typeof x === 'number')

// Type cast
x as String
→
x instanceof String ? x : throw new Error('...')

// Null safety
x ?? defaultValue
→
x ?? defaultValue

// Null-aware operator
x?.method()
→
x?.method()
```

## Exception Handling
```
// Try-catch
try {
  riskyOp();
} catch (e) {
  handle(e);
} finally {
  cleanup();
}
→ (identical)

// Multiple catch (Dart)
try {
  op();
} on SpecificException catch (e) {
  handleSpecific(e);
} catch (e) {
  handleGeneric(e);
}
→
try {
  op();
} catch (e) {
  if (e instanceof SpecificException) {
    handleSpecific(e);
  } else {
    handleGeneric(e);
  }
}
```

## Flutter Widgets
```
// Widget instantiation
Container(
  child: Text('Hello'),
  color: 'blue',
  padding: EdgeInsets.all(16)
)
→
new Container({
  child: new Text({data: 'Hello'}),
  color: 'blue',
  padding: new EdgeInsets.all(16)
})

// StatefulWidget + State
class MyWidget extends StatefulWidget {
  @override
  State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  int counter = 0;
  
  @override
  void initState() {
    super.initState();
  }
  
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Count: $counter')
    );
  }
}
→
class MyWidget extends StatefulWidget {
  constructor() {
    super();
  }
  
  createState() {
    return new _MyWidgetState();
  }
}

class _MyWidgetState extends State {
  counter = 0;
  
  initState() {
    super.initState();
  }
  
  build(context) {
    return new Container({
      child: new Text({
        data: `Count: ${this.counter}`
      })
    });
  }
}

// StatelessWidget
class SimpleWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text('Simple');
  }
}
→
class SimpleWidget extends StatelessWidget {
  build(context) {
    return new Text({data: 'Simple'});
  }
}
```

---

# CLASS SPECIFICATIONS

## Phase 0 Classes

### IRPostDeserializeValidator
```dart
class IRPostDeserializeValidator {
  final DartFile dartFile;
  final List<ValidationError> errors = [];
  
  ValidationReport validate() {
    _checkStructuralIntegrity();
    _checkSemanticValidity();
    _checkCompletenessAfterDeser();
    _checkBinaryIntegrity();
    return ValidationReport(
      errors: errors,
      isValid: errors.isEmpty,
      timestamp: DateTime.now(),
    );
  }
  
  void _checkStructuralIntegrity() {
    // 1. All class references are valid
    // 2. All type references exist
    // 3. No null pointers where shouldn't be
    // 4. Method parameters have names and types
    // 5. Classes have names
  }
  
  void _checkSemanticValidity() {
    // 1. No inheritance cycles
    // 2. Abstract methods in abstract classes
    // 3. Type system consistency
    // 4. No unreferenced symbols
  }
  
  void _checkCompletenessAfterDeser() {
    // Verify deserialization didn't lose data
  }
  
  void _checkBinaryIntegrity() {
    // Check contentHash, format version
  }
}
```

### IRTypeSystemAnalyzer
```dart
class IRTypeSystemAnalyzer {
  final DartFile dartFile;
  final ValidationReport validationReport;
  
  late TypeEnvironment typeEnvironment;
  late Map<String, TypeInfo> typeTable;
  late Map<String, GenericInfo> generics;
  
  void analyze() {
    _buildTypeTable();
    _resolveTypeReferences();
    _inferImplicitTypes();
    _validateTypeConsistency();
  }
  
  void _buildTypeTable() {
    // For each ClassDecl:
    // - name, superclass, interfaces, mixins
    // - fields with types
    // - methods with signatures
    // - generic parameters with bounds
    
    for (final cls in dartFile.classDeclarations) {
      typeTable[cls.name] = TypeInfo(
        name: cls.name,
        superclass: cls.superclass?.displayName(),
        fields: cls.instanceFields.map((f) => (f.name, f.type)),
        methods: cls.methods.map((m) => (m.name, m.signature)),
      );
    }
  }
  
  void _resolveTypeReferences() {
    // Convert all type names to resolved TypeIR objects
    // Handle nullable types (String?)
    // Handle generics (List<String>)
  }
  
  void _inferImplicitTypes() {
    // For variables with 'var' keyword
    // Infer from initializer
    // Type narrowing in if-statements
  }
  
  void _validateTypeConsistency() {
    // Report type mismatches
  }
}

class TypeEnvironment {
  final Map<String, TypeInfo> typeTable;
  final Map<String, FunctionSignature> functionSignatures;
  final Map<String, GenericInfo> generics;
  
  TypeInfo? getType(String name) => typeTable[name];
  bool isKnownType(String name) => typeTable.containsKey(name);
}
```

### IRScopeAnalyzer
```dart
class IRScopeAnalyzer {
  final DartFile dartFile;
  final TypeEnvironment typeEnvironment;
  
  late ScopeModel scopeModel;
  late Map<String, Scope> scopeMap;
  late Map<String, VariableBinding> bindings;
  
  void analyze() {
    _buildScopeChain();
    _resolveBindings();
    _analyzeClosures();
    _analyzeLifetimes();
  }
  
  void _buildScopeChain() {
    // FileScope
    //   ├─ ClassScope (for each class)
    //   │   ├─ FieldScope
    //   │   └─ MethodScope (for each method)
    //   │       └─ BlockScope → LocalVarScope → ...
    //   └─ FunctionScope (for each top-level function)
    //       └─ BlockScope → LocalVarScope → ...
  }
  
  void _resolveBindings() {
    // Every identifier → declaration
    // Track which scope it comes from
  }
  
  void _analyzeClosures() {
    // Find nested functions/lambdas
    // What variables do they capture?
    // By reference or by value?
    
    for (final cls in dartFile.classDeclarations) {
      for (final method in cls.methods) {
        _findClosuresInStatement(method.body);
      }
    }
  }
  
  void _analyzeLifetimes() {
    // Variable initialization point
    // Last use point
    // Can it be inlined?
  }
}

class ScopeModel {
  final Map<String, Scope> scopeMap;
  final Map<String, VariableBinding> bindings;
  final Map<String, ClosureInfo> closureCaptures;
}
```

### IRControlFlowAnalyzer
```dart
class IRControlFlowAnalyzer {
  final DartFile dartFile;
  final ScopeModel scopeModel;
  
  late ControlFlowGraph cfg;
  late List<String> unreachableStatements;
  
  void analyze() {
    for (final method in _allMethods()) {
      _buildCFG(method);
    }
    _analyzeReachability();
    _analyzeLoops();
    _analyzeExceptions();
  }
  
  void _buildCFG(MethodDecl method) {
    // Create BasicBlocks
    // Add edges:
    //   - Normal flow (sequential)
    //   - Branch (if-else)
    //   - Loop (while, for)
    //   - Exception (try-catch)
    //   - Return (exit)
  }
  
  void _analyzeReachability() {
    // Mark reachable/unreachable blocks
    // Report dead code
  }
  
  void _analyzeLoops() {
    // Identify loop structures
    // Nested loops
  }
  
  void _analyzeExceptions() {
    // Track exception flow
    // Which exceptions can be thrown where
    // Which are caught
  }
}

class ControlFlowGraph {
  final List<BasicBlock> blocks;
  final Map<String, Set<String>> reachability;
  final List<String> unreachableStatements;
  
  BasicBlock? entryBlock;
  BasicBlock? exitBlock;
}
```

### FlutterWidgetAnalyzer
```dart
class FlutterWidgetAnalyzer {
  final DartFile dartFile;
  final TypeEnvironment typeEnvironment;
  
  late FlutterWidgetClassifier classifier;
  late FlutterLifecycleAnalyzer lifecycleAnalyzer;
  late FlutterStateAnalyzer stateAnalyzer;
  late FlutterBuildTreeAnalyzer buildTreeAnalyzer;
  
  void analyze() {
    _classifyWidgets();
    _mapLifecycleMethodsForStatefulWidgets();
    _analyzeStateFields();
    _buildWidgetTrees();
    _validateStatefulPairs();
  }
  
  void _classifyWidgets() {
    // Identify which classes are:
    // - StatefulWidget
    // - State classes
    // - StatelessWidget
    // - Custom widgets
    // - Regular classes
    
    classifier = FlutterWidgetClassifier(dartFile, typeEnvironment);
    classifier.classify();
  }
  
  void _mapLifecycleMethodsForStatefulWidgets() {
    // For each StatefulWidget's State class:
    // - initState() exists?
    // - dispose() exists?
    // - didUpdateWidget() exists?
    // - build() method
    
    for (final entry in classifier.widgetMap.entries) {
      if (entry.value.type == WidgetType.stateful) {
        lifecycleAnalyzer = FlutterLifecycleAnalyzer(entry.value);
        lifecycleAnalyzer.analyze();
      }
    }
  }
  
  void _analyzeStateFields() {
    // What fields exist in State class?
    // Which are reactive (used in build + modified in setState)?
    // Which are readonly?
    // Which are constants?
    
    for (final entry in classifier.widgetMap.entries) {
      if (entry.value.stateClass != null) {
        stateAnalyzer = FlutterStateAnalyzer(entry.value);
        stateAnalyzer.analyze();
      }
    }
  }
  
  void _buildWidgetTrees() {
    // For each build() method:
    // Extract the widget tree
    // Understand hierarchy
    
    for (final entry in classifier.widgetMap.entries) {
      final buildMethod = entry.value.buildMethod;
      if (buildMethod != null) {
        buildTreeAnalyzer = FlutterBuildTreeAnalyzer(buildMethod);
        buildTreeAnalyzer.analyze();
      }
    }
  }
  
  void _validateStatefulPairs() {
    // Every StatefulWidget must have matching State class
    // Every State class must have corresponding StatefulWidget
    // createState() must return correct State type
  }
}
```

---

## Phase 2 Classes

### ExpressionCodeGen
```dart
class ExpressionCodeGen {
  final TypeEnvironment typeEnvironment;
  final ScopeModel scopeModel;
  final RuntimeRequirements runtimeRequirements;
  final Indenter indenter;
  
  String generate(ExpressionIR expr, {bool wrapInParens = false}) {
    final code = switch (expr) {
      LiteralExpressionIR => _generateLiteral(expr),
      IdentifierExpressionIR => _generateIdentifier(expr),
      BinaryExpressionIR => _generateBinary(expr),
      UnaryExpressionIR => _generateUnary(expr),
      MethodCallExpressionIR => _generateMethodCall(expr),
      PropertyAccessExpressionIR => _generatePropertyAccess(expr),
      ConditionalExpressionIR => _generateConditional(expr),
      ListExpressionIR => _generateList(expr),
      MapExpressionIR => _generateMap(expr),
      SetExpressionIR => _generateSet(expr),
      StringInterpolationExpressionIR => _generateStringInterpolation(expr),
      CastExpressionIR => _generateCast(expr),
      TypeCheckExpressionIR => _generateTypeCheck(expr),
      AwaitExpressionIR => _generateAwait(expr),
      YieldExpressionIR => _generateYield(expr),
      ThrowExpressionIR => _generateThrow(expr),
      ClosureExpressionIR => _generateClosure(expr),
      SpreadExpressionIR => _generateSpread(expr),
      _ => '/* UNKNOWN: ${expr.runtimeType} */',
    };
    
    return wrapInParens ? '($code)' : code;
  }
  
  String _generateLiteral(LiteralExpressionIR expr) {
    return switch (expr.literalType) {
      LiteralType.stringValue => '"${_escapeString(expr.value as String)}"',
      LiteralType.intValue => expr.value.toString(),
      LiteralType.doubleValue => expr.value.toString(),
      LiteralType.boolValue => (expr.value as bool) ? 'true' : 'false',
      LiteralType.nullValue => 'null',
      _ => 'undefined',
    };
  }
  
  String _generateBinary(BinaryExpressionIR expr) {
    final left = generate(expr.left, wrapInParens: true);
    final right = generate(expr.right, wrapInParens: true);
    final op = _mapOperator(expr.operator);
    return '$left $op $right';
  }
  
  String _mapOperator(String op) {
    const mapping = {
      '==': '===',
      '!=': '!==',
      '??': '??',
      '||': '||',
      '&&': '&&',
      // ... others stay the same
    };
    return mapping[op] ?? op;
  }
  
  String _generateMethodCall(MethodCallExpressionIR expr) {
    final target = expr.target != null 
        ? generate(expr.target!, wrapInParens: true)
        : 'this';
    
    final args = expr.arguments
        .map((arg) => generate(arg))
        .join(', ');
    
    return '$target.${expr.methodName}($args)';
  }
  
  String _generateList(ListExpressionIR expr) {
    final elements = expr.elements
        .map((e) => generate(e))
        .join(', ');
    return '[$elements]';
  }
  
  String _generateMap(MapExpressionIR expr) {
    final entries = expr.entries
        .map((e) => '${e.key}: ${generate(e.value)}')
        .join(', ');
    return '{$entries}';
  }
  
  String _generateStringInterpolation(StringInterpolationExpressionIR expr) {
    // 'Hello $name and ${x + 1}'
    // → `Hello ${name} and ${x + 1}`
    
    var result = '`';
    for (final part in expr.parts) {
      if (part is String) {
        result += _escapeTemplateString(part);
      } else if (part is ExpressionIR) {
        result += '\${${generate(part)}}';
      }
    }
    result += '`';
    return result;
  }
  
  String _generateAwait(AwaitExpressionIR expr) {
    final value = generate(expr.expression, wrapInParens: true);
    return 'await $value';
  }
  
  String _generateTypeCheck(TypeCheckExpressionIR expr) {
    final value = generate(expr.expression);
    final type = expr.type.displayName();
    
    if (expr.isNegated) {
      return '!(typeof $value === \'${_jsType(type)}\')';
    } else {
      return 'typeof $value === \'${_jsType(type)}\'';
    }
  }
  
  String _generateCast(CastExpressionIR expr) {
    final value = generate(expr.expression);
    final type = expr.targetType.displayName();
    
    // For known types
    if (type == 'int') return 'Math.floor($value)';
    if (type == 'double') return 'Number($value)';
    if (type == 'String') return 'String($value)';
    
    // Generic cast
    return '($value instanceof $type) ? $value : (() => { throw new Error(...) })()';
  }
}
```

### StatementCodeGen
```dart
class StatementCodeGen {
  final ExpressionCodeGen exprCodeGen;
  final Indenter indenter;
  
  String generate(StatementIR stmt) {
    return switch (stmt) {
      ExpressionStatementIR => _generateExpressionStatement(stmt),
      ReturnStatementIR => _generateReturnStatement(stmt),
      IfStatementIR => _generateIfStatement(stmt),
      ForStatementIR => _generateForStatement(stmt),
      ForInStatementIR => _generateForInStatement(stmt),
      WhileStatementIR => _generateWhileStatement(stmt),
      DoWhileStatementIR => _generateDoWhileStatement(stmt),
      SwitchStatementIR => _generateSwitchStatement(stmt),
      BlockStatementIR => _generateBlockStatement(stmt),
      VariableDeclarationIR => _generateVariableDeclaration(stmt),
      TryStatementIR => _generateTryStatement(stmt),
      ThrowStatementIR => _generateThrowStatement(stmt),
      BreakStatementIR => _generateBreakStatement(stmt),
      ContinueStatementIR => _generateContinueStatement(stmt),
      AssertStatementIR => _generateAssertStatement(stmt),
      _ => '/* UNKNOWN: ${stmt.runtimeType} */',
    };
  }
  
  String _generateIfStatement(IfStatementIR stmt) {
    final cond = exprCodeGen.generate(stmt.condition);
    final then = generate(stmt.thenBranch);
    
    var result = 'if ($cond) ${_wrap(then)}';
    
    if (stmt.elseBranch != null) {
      result += ' else ${_wrap(generate(stmt.elseBranch!))}';
    }
    
    return result;
  }
  
  String _generateForStatement(ForStatementIR stmt) {
    final init = stmt.initialization != null
        ? generate(stmt.initialization as StatementIR)
        : '';
    
    final cond = stmt.condition != null
        ? exprCodeGen.generate(stmt.condition!)
        : '';
    
    final updates = stmt.updaters
        .map(exprCodeGen.generate)
        .join(', ');
    
    final body = generate(stmt.body);
    
    return 'for ($init; $cond; $updates) ${_wrap(body)}';
  }
  
  String _generateForInStatement(ForInStatementIR stmt) {
    final varName = stmt.variable.name;
    final iterable = exprCodeGen.generate(stmt.iterable);
    final body = generate(stmt.body);
    
    return 'for (const $varName of $iterable) ${_wrap(body)}';
  }
  
  String _generateTryStatement(TryStatementIR stmt) {
    var result = 'try ${_wrap(generate(stmt.tryBlock))}';
    
    for (final catchClause in stmt.catchClauses) {
      result += ' catch (${catchClause.exception.name}) ${_wrap(generate(catchClause.body))}';
    }
    
    if (stmt.finallyBlock != null) {
      result += ' finally ${_wrap(generate(stmt.finallyBlock!))}';
    }
    
    return result;
  }
  
  String _wrap(String code) {
    if (code.startsWith('{')) return code;
    return '{ $code }';
  }
}
```

### FunctionCodeGen
```dart
class FunctionCodeGen {
  final ExpressionCodeGen exprCodeGen;
  final StatementCodeGen stmtCodeGen;
  final Indenter indenter;
  
  String generate(FunctionDecl func) {
    final params = _generateParameters(func.parameters);
    
    if (func.body == null) {
      // Abstract or declaration-only
      return 'function ${func.name}($params) { /* TODO */ }';
    }
    
    var code = StringBuffer();
    
    if (func.isAsync) code.write('async ');
    if (func.isGenerator) code.write('function* ');
    if (!func.isGenerator) code.write('function ');
    
    code.write('${func.name}($params) ');
    
    if (func.body is ExpressionIR) {
      // Arrow body
      code.write('=> ${exprCodeGen.generate(func.body as ExpressionIR)}');
    } else {
      // Block body
      code.writeln('{');
      indenter.indent();
      code.write(stmtCodeGen.generate(func.body as StatementIR));
      indenter.dedent();
      code.write('\n}');
    }
    
    return code.toString();
  }
  
  String _generateParameters(List<ParameterDecl> params) {
    // Separate required, optional, named
    final required = params.where((p) => p.isRequired).toList();
    final optional = params.where((p) => p.isOptional && !p.isNamed).toList();
    final named = params.where((p) => p.isNamed).toList();
    
    final parts = <String>[];
    
    // Required
    parts.addAll(required.map((p) => p.name));
    
    // Optional with defaults
    if (optional.isNotEmpty) {
      parts.add(optional
          .map((p) => '${p.name} = ${_defaultValue(p.defaultValue)}')
          .join(', '));
    }
    
    // Named → object destructuring
    if (named.isNotEmpty) {
      final namedStr = named
          .map((p) => '${p.name} = ${_defaultValue(p.defaultValue)}')
          .join(', ');
      parts.add('{ $namedStr } = {}');
    }
    
    return parts.join(', ');
  }
}
```

### ClassCodeGen
```dart
class ClassCodeGen {
  final ExpressionCodeGen exprCodeGen;
  final StatementCodeGen stmtCodeGen;
  final FunctionCodeGen funcCodeGen;
  final Indenter indenter;
  
  String generate(ClassDecl cls) {
    var code = StringBuffer();
    
    // Class header
    code.write('class ${cls.name}');
    if (cls.superclass != null) {
      code.write(' extends ${cls.superclass!.displayName()}');
    }
    code.writeln(' {');
    
    indenter.indent();
    
    // Constructor
    if (cls.constructors.isNotEmpty) {
      code.writeln(_generateConstructor(cls.constructors.first, cls));
      code.writeln();
    }
    
    // Fields (as properties)
    for (final field in cls.instanceFields) {
      if (!field.isFinal) {
        code.writeln('${indenter.get()}${field.name} = null;');
      }
    }
    if (cls.instanceFields.isNotEmpty) code.writeln();
    
    // Instance methods
    for (int i = 0; i < cls.instanceMethods.length; i++) {
      code.writeln(indenter.get() + _generateMethod(cls.instanceMethods[i]));
      if (i < cls.instanceMethods.length - 1) code.writeln();
    }
    
    // Static methods
    for (final method in cls.staticMethods) {
      code.writeln('${indenter.get()}static ${_generateMethod(method)}');
    }
    
    indenter.dedent();
    code.writeln('}');
    
    return code.toString();
  }
  
  String _generateConstructor(ConstructorDecl ctor, ClassDecl cls) {
    final params = _generateParameters(ctor.parameters);
    
    var code = StringBuffer();
    code.writeln('${indenter.get()}constructor($params) {');
    indenter.indent();
    
    // Field assignments
    for (final field in cls.instanceFields) {
      if (ctor.parameters.any((p) => p.name == field.name)) {
        code.writeln('${indenter.get()}this.${field.name} = ${field.name};');
      }
    }
    
    // Initializer list
    for (final init in ctor.initializers) {
      code.writeln('${indenter.get()}this.${init.fieldName} = ${exprCodeGen.generate(init.expression)};');
    }
    
    // Body
    if (ctor.body != null) {
      code.write(stmtCodeGen.generate(ctor.body!));
    }
    
    indenter.dedent();
    code.writeln('${indenter.get()}}');
    
    return code.toString();
  }
  
  String _generateMethod(MethodDecl method) {
    final params = _generateParameters(method.parameters);
    
    var code = StringBuffer();
    if (method.isAsync) code.write('async ');
    code.write('${method.name}($params) ');
    
    if (method.body != null) {
      code.writeln('{');
      indenter.indent();
      code.write(stmtCodeGen.generate(method.body!));
      indenter.dedent();
      code.write('\n${indenter.get()}}');
    } else {
      code.write('{ /* TODO */ }');
    }
    
    return code.toString();
  }
}
```

---

## Phase 3 Classes

### FlutterWidgetRegistry
```dart
class FlutterWidgetRegistry {
  static const Map<String, JSWidgetInfo> dartToJSWidgets = {
    'Container': JSWidgetInfo(
      jsClass: 'Container',
      file: 'widgets/container.js',
      props: {
        'child': PropType.widget,
        'alignment': PropType.alignment,
        'padding': PropType.edgeInsets,
        'color': PropType.color,
        'width': PropType.double,
        'height': PropType.double,
      },
    ),
    'Text': JSWidgetInfo(
      jsClass: 'Text',
      file: 'widgets/text.js',
      props: {
        'data': PropType.string,
        'style': PropType.textStyle,
        'textAlign': PropType.textAlign,
        'maxLines': PropType.int,
      },
    ),
    'Row': JSWidgetInfo(
      jsClass: 'Row',
      file: 'widgets/flex.js',
      props: {
        'children': PropType.widgetList,
        'mainAxisAlignment': PropType.mainAxisAlignment,
        'crossAxisAlignment': PropType.crossAxisAlignment,
      },
    ),
    'Column': JSWidgetInfo(
      jsClass: 'Column',
      file: 'widgets/flex.js',
      props: {
        'children': PropType.widgetList,
        'mainAxisAlignment': PropType.mainAxisAlignment,
        'crossAxisAlignment': PropType.crossAxisAlignment,
      },
    ),
    // ... more widgets
  };
  
  static JSWidgetInfo? getJSWidget(String dartName) {
    return dartToJSWidgets[dartName];
  }
  
  static bool isKnownWidget(String dartName) {
    return dartToJSWidgets.containsKey(dartName);
  }
}
```

### WidgetInstantiationCodeGen
```dart
class WidgetInstantiationCodeGen {
  final FlutterWidgetRegistry registry;
  final ExpressionCodeGen exprCodeGen;
  final Indenter indenter;
  
  String generateWidgetInstantiation(
    InstanceCreationExpressionIR expr,
  ) {
    final widgetType = expr.type.displayName();
    final jsInfo = registry.getJSWidget(widgetType);
    
    if (jsInfo == null) {
      // Custom widget
      return _generateCustomWidgetInstantiation(expr, widgetType);
    }
    
    // Known Flutter widget
    return _generateKnownWidgetInstantiation(expr, jsInfo);
  }
  
  String _generateKnownWidgetInstantiation(
    InstanceCreationExpressionIR expr,
    JSWidgetInfo jsInfo,
  ) {
    final props = <String, String>{};
    
    for (final entry in expr.namedArguments.entries) {
      final propName = entry.key;
      final propValue = entry.value;
      final propType = jsInfo.props[propName];
      
      final jsValue = _convertPropValue(propValue, propType);
      props[propName] = jsValue;
    }
    
    final propsStr = props.entries
        .map((e) => '${e.key}: ${e.value}')
        .join(', ');
    
    return 'new ${jsInfo.jsClass}({ $propsStr })';
  }
  
  String _convertPropValue(ExpressionIR expr, PropType? expectedType) {
    return switch (expectedType) {
      PropType.widget => _convertWidget(expr),
      PropType.widgetList => _convertWidgetList(expr),
      PropType.color => _convertColor(expr),
      PropType.alignment => _convertAlignment(expr),
      PropType.edgeInsets => _convertEdgeInsets(expr),
      PropType.textStyle => _convertTextStyle(expr),
      _ => exprCodeGen.generate(expr),
    };
  }
  
  String _convertWidget(ExpressionIR expr) {
    if (expr is InstanceCreationExpressionIR) {
      return generateWidgetInstantiation(expr);
    }
    return exprCodeGen.generate(expr);
  }
  
  String _convertWidgetList(ExpressionIR expr) {
    if (expr is ListExpressionIR) {
      final widgets = expr.elements
          .map((e) => generateWidgetInstantiation(e as InstanceCreationExpressionIR))
          .join(', ');
      return '[$widgets]';
    }
    return exprCodeGen.generate(expr);
  }
  
  String _convertColor(ExpressionIR expr) {
    if (expr is PropertyAccessExpressionIR) {
      // Colors.blue → 'blue'
      return "'${expr.propertyName.toLowerCase()}'";
    }
    return exprCodeGen.generate(expr);
  }
  
  String _convertAlignment(ExpressionIR expr) {
    // Alignment.center → Alignment.center
    return exprCodeGen.generate(expr);
  }
  
  String _convertEdgeInsets(ExpressionIR expr) {
    if (expr is MethodCallExpressionIR) {
      final method = expr.methodName;
      final args = expr.arguments.map(exprCodeGen.generate).join(', ');
      return 'new EdgeInsets.$method($args)';
    }
    return exprCodeGen.generate(expr);
  }
  
  String _convertTextStyle(ExpressionIR expr) {
    // TextStyle(...) → new TextStyle({...})
    return exprCodeGen.generate(expr);
  }
}
```

### BuildMethodCodeGen
```dart
class BuildMethodCodeGen {
  final WidgetInstantiationCodeGen widgetInstanGen;
  final StatementCodeGen stmtCodeGen;
  final Indenter indenter;
  
  String generateBuild(MethodDecl buildMethod) {
    var code = StringBuffer();
    code.writeln('build(context) {');
    indenter.indent();
    
    if (buildMethod.body is ReturnStatementIR) {
      final returnStmt = buildMethod.body as ReturnStatementIR;
      if (returnStmt.expression != null) {
        final widgetCode = _generateReturnWidget(returnStmt.expression!);
        code.writeln('${indenter.get()}return $widgetCode;');
      }
    } else if (buildMethod.body is BlockStatementIR) {
      final block = buildMethod.body as BlockStatementIR;
      for (final stmt in block.statements) {
        if (stmt is ReturnStatementIR && stmt.expression != null) {
          final widgetCode = _generateReturnWidget(stmt.expression!);
          code.writeln('${indenter.get()}return $widgetCode;');
        } else {
          code.write(stmtCodeGen.generate(stmt));
        }
      }
    }
    
    indenter.dedent();
    code.writeln('}');
    return code.toString();
  }
  
  String _generateReturnWidget(ExpressionIR expr) {
    if (expr is InstanceCreationExpressionIR) {
      return widgetInstanGen.generateWidgetInstantiation(expr);
    }
    if (expr is ConditionalExpressionIR) {
      // Handle ternary: condition ? trueWidget : falseWidget
      final cond = '(${stmtCodeGen.exprCodeGen.generate(expr.condition)})';
      final trueWidget = _generateReturnWidget(expr.trueBranch);
      final falseWidget = _generateReturnWidget(expr.falseBranch);
      return '$cond ? $trueWidget : $falseWidget';
    }
    // Variable reference, etc.
    return stmtCodeGen.exprCodeGen.generate(expr);
  }
}
```

### StatefulWidgetJSCodeGen
```dart
class StatefulWidgetJSCodeGen {
  final WidgetInfo statefulWidget;
  final WidgetInfo stateClass;
  final LifecycleMapping lifecycleMapping;
  final StateModel stateModel;
  final BuildMethodCodeGen buildMethodGen;
  final FunctionCodeGen funcCodeGen;
  final Indenter indenter;
  
  String generate() {
    var code = StringBuffer();
    
    code.writeln(_generateWidgetClass());
    code.writeln();
    code.writeln(_generateStateClass());
    
    return code.toString();
  }
  
  String _generateWidgetClass() {
    var code = StringBuffer();
    code.writeln('class ${statefulWidget.declaration.name} extends StatefulWidget {');
    indenter.indent();
    
    // Constructor
    final params = statefulWidget.declaration.constructors.isNotEmpty
        ? statefulWidget.declaration.constructors.first.parameters
        : <ParameterDecl>[];
    
    code.write('${indenter.get()}constructor({');
    for (int i = 0; i < params.length; i++) {
      code.write('${params[i].name}${i < params.length - 1 ? ', ' : ''}');
    }
    code.writeln('} = {}) {');
    indenter.indent();
    code.writeln('${indenter.get()}super();');
    
    for (final param in params) {
      code.writeln('${indenter.get()}this.${param.name} = ${param.name};');
    }
    
    indenter.dedent();
    code.writeln('${indenter.get()}}');
    code.writeln();
    
    // createState()
    code.writeln('${indenter.get()}createState() {');
    indenter.indent();
    code.writeln('${indenter.get()}return new _${statefulWidget.declaration.name}State();');
    indenter.dedent();
    code.writeln('${indenter.get()}}');
    
    indenter.dedent();
    code.writeln('}');
    
    return code.toString();
  }
  
  String _generateStateClass() {
    var code = StringBuffer();
    code.writeln('class _${statefulWidget.declaration.name}State extends State {');
    indenter.indent();
    
    // Constructor
    code.writeln('${indenter.get()}constructor() {');
    indenter.indent();
    code.writeln('${indenter.get()}super();');
    indenter.dedent();
    code.writeln('${indenter.get()}}');
    code.writeln();
    
    // State fields
    for (final field in stateModel.reactiveFields) {
      final fieldDecl = stateClass.declaration.instanceFields
          .firstWhere((f) => f.name == field);
      final initialValue = fieldDecl.initializer != null
          ? '/* TODO: init */'
          : _getDefaultValue(fieldDecl.type);
      code.writeln('${indenter.get()}${field} = $initialValue;');
    }
    if (stateModel.reactiveFields.isNotEmpty) code.writeln();
    
    // initState
    if (lifecycleMapping.initState != null) {
      code.writeln('${indenter.get()}initState() {');
      indenter.indent();
      code.writeln('${indenter.get()}super.initState();');
      code.writeln('${indenter.get()}// TODO: initState body');
      indenter.dedent();
      code.writeln('${indenter.get()}}');
      code.writeln();
    }
    
    // dispose
    if (lifecycleMapping.dispose != null) {
      code.writeln('${indenter.get()}dispose() {');
      indenter.indent();
      code.writeln('${indenter.get()}// TODO: cleanup');
      code.writeln('${indenter.get()}super.dispose();');
      indenter.dedent();
      code.writeln('${indenter.get()}}');
      code.writeln();
    }
    
    // setState wrapper
    code.writeln('''${indenter.get()}setState(callback) {
${indenter.get()}  callback.call(this);
${indenter.get()}  super.setState();
${indenter.get()}}''');
    code.writeln();
    
    // Other methods
    for (final method in stateClass.declaration.instanceMethods) {
      if (method.name != 'build' && 
          method.name != 'initState' && 
          method.name != 'dispose') {
        code.writeln(indenter.get() + funcCodeGen._generateMethod(method));
        code.writeln();
      }
    }
    
    // build() method
    if (lifecycleMapping.build != null) {
      code.writeln(indenter.get() + buildMethodGen.generateBuild(lifecycleMapping.build!));
    }
    
    indenter.dedent();
    code.writeln('}');
    
    return code.toString();
  }
  
  String _getDefaultValue(TypeIR type) {
    final typeName = type.displayName();
    return switch (typeName) {
      'int' => '0',
      'double' => '0.0',
      'String' => '""',
      'bool' => 'false',
      'List' => '[]',
      'Map' => '{}',
      _ => 'null',
    };
  }
}
```

### StatelessWidgetJSCodeGen
```dart
class StatelessWidgetJSCodeGen {
  final WidgetInfo widgetInfo;
  final BuildMethodCodeGen buildMethodGen;
  final FunctionCodeGen funcCodeGen;
  final Indenter indenter;
  
  String generate() {
    var code = StringBuffer();
    code.writeln('class ${widgetInfo.declaration.name} extends StatelessWidget {');
    indenter.indent();
    
    // Constructor
    final ctor = widgetInfo.declaration.constructors.isNotEmpty
        ? widgetInfo.declaration.constructors.first
        : null;
    
    final params = ctor?.parameters ?? <ParameterDecl>[];
    
    code.write('${indenter.get()}constructor({');
    for (int i = 0; i < params.length; i++) {
      code.write('${params[i].name}${i < params.length - 1 ? ', ' : ''}');
    }
    code.writeln('} = {}) {');
    indenter.indent();
    
    code.writeln('${indenter.get()}super();');
    for (final param in params) {
      code.writeln('${indenter.get()}this.${param.name} = ${param.name};');
    }
    
    indenter.dedent();
    code.writeln('${indenter.get()}}');
    code.writeln();
    
    // Methods (except build)
    for (final method in widgetInfo.declaration.instanceMethods) {
      if (method.name != 'build') {
        code.writeln(indenter.get() + funcCodeGen._generateMethod(method));
        code.writeln();
      }
    }
    
    // build() method
    final buildMethod = widgetInfo.declaration.instanceMethods
        .firstWhere((m) => m.name == 'build', orElse: () => null);
    
    if (buildMethod != null) {
      code.writeln(indenter.get() + buildMethodGen.generateBuild(buildMethod));
    }
    
    indenter.dedent();
    code.writeln('}');
    
    return code.toString();
  }
}
```

---

## Phase 4 Classes

### FileCodeGen
```dart
class FileCodeGen {
  final ExpressionCodeGen exprCodeGen;
  final StatementCodeGen stmtCodeGen;
  final ClassCodeGen classCodeGen;
  final FunctionCodeGen funcCodeGen;
  final RuntimeRequirements runtimeRequirements;
  final Indenter indenter;
  
  String generate(DartFile dartFile) {
    var code = StringBuffer();
    
    code.writeln(_generateHeader());
    code.writeln();
    code.writeln(_generateImports());
    code.writeln();
    code.writeln(_generateHelperFunctions());
    code.writeln();
    code.writeln(_generateTopLevelVariables(dartFile));
    code.writeln();
    code.writeln(_generateEnumsAndConstants(dartFile));
    code.writeln();
    code.writeln(_generateClasses(dartFile));
    code.writeln();
    code.writeln(_generateFunctions(dartFile));
    code.writeln();
    code.writeln(_generateExports(dartFile));
    
    return code.toString();
  }
  
  String _generateHeader() {
    return '''
// ============================================================================
// Generated from Dart IR
// WARNING: Do not edit manually - changes will be lost
// Generated at: ${DateTime.now()}
// ============================================================================
''';
  }
  
  String _generateImports() {
    return '''
import Flutter from 'flutter-js-framework';
import {
  Container, Text, Row, Column, Scaffold, AppBar,
  FloatingActionButton, Icon, Center, Padding,
  // ... other widgets
} from 'flutter-js-framework/widgets';
''';
  }
  
  String _generateHelperFunctions() {
    var code = StringBuffer();
    
    for (final helper in runtimeRequirements.getRequiredHelpers()) {
      code.writeln(_generateHelper(helper));
      code.writeln();
    }
    
    return code.toString();
  }
  
  String _generateHelper(String helperName) {
    if (helperName.startsWith('isType_')) {
      final typeName = helperName.replaceFirst('isType_', '');
      return '''
function isType_$typeName(value) {
  return value instanceof $typeName || typeof value === '${_getDartTypeDefaultJS(typeName)}';
}
''';
    }
    
    if (helperName == 'nullCheck') {
      return '''
function nullCheck(value, name) {
  if (value === null || value === undefined) {
    throw new Error(name + ' cannot be null');
  }
  return value;
}
''';
    }
    
    if (helperName == 'boundsCheck') {
      return '''
function boundsCheck(index, length) {
  if (index < 0 || index >= length) {
    throw new RangeError('Index out of bounds');
  }
}
''';
    }
    
    return '';
  }
  
  String _generateTopLevelVariables(DartFile dartFile) {
    var code = StringBuffer();
    
    for (final variable in dartFile.topLevelVariables) {
      final init = variable.initializer != null
          ? ' = ${exprCodeGen.generate(variable.initializer!)}'
          : '';
      code.writeln('${variable.isFinal ? 'const' : 'let'} ${variable.name}$init;');
    }
    
    return code.toString();
  }
  
  String _generateEnumsAndConstants(DartFile dartFile) {
    var code = StringBuffer();
    
    for (final cls in dartFile.classDeclarations) {
      if (_isEnum(cls)) {
        code.writeln(_generateEnum(cls));
        code.writeln();
      }
    }
    
    return code.toString();
  }
  
  String _generateClasses(DartFile dartFile) {
    var code = StringBuffer();
    
    // Sort by dependency
    final sorted = _sortByDependency(dartFile.classDeclarations);
    
    for (int i = 0; i < sorted.length; i++) {
      code.writeln(classCodeGen.generate(sorted[i]));
      if (i < sorted.length - 1) code.writeln();
    }
    
    return code.toString();
  }
  
  String _generateFunctions(DartFile dartFile) {
    var code = StringBuffer();
    
    for (int i = 0; i < dartFile.functionDeclarations.length; i++) {
      code.writeln(funcCodeGen.generate(dartFile.functionDeclarations[i]));
      if (i < dartFile.functionDeclarations.length - 1) code.writeln();
    }
    
    return code.toString();
  }
  
  String _generateExports(DartFile dartFile) {
    var code = StringBuffer();
    code.writeln('export {');
    
    // Export all classes
    for (final cls in dartFile.classDeclarations) {
      code.writeln('  ${cls.name},');
    }
    
    // Export all functions
    for (final func in dartFile.functionDeclarations) {
      code.writeln('  ${func.name},');
    }
    
    code.writeln('};');
    return code.toString();
  }
  
  List<ClassDecl> _sortByDependency(List<ClassDecl> classes) {
    // Topological sort based on inheritance
    // Parent classes before child classes
    final sorted = <ClassDecl>[];
    final visited = <String>{};
    
    void visit(ClassDecl cls) {
      if (visited.contains(cls.name)) return;
      visited.add(cls.name);
      
      if (cls.superclass != null) {
        final parent = classes.firstWhere(
          (c) => c.name == cls.superclass!.displayName(),
          orElse: () => null,
        );
        if (parent != null) visit(parent);
      }
      
      sorted.add(cls);
    }
    
    for (final cls in classes) {
      visit(cls);
    }
    
    return sorted;
  }
}
```

---

## Phase 5 Classes

### OutputValidator
```dart
class OutputValidator {
  final String jsCode;
  final List<ValidationError> errors = [];
  
  ValidationReport validate() {
    _syntaxValidation();
    _semanticValidation();
    _runtimeValidation();
    _styleValidation();
    
    return ValidationReport(
      errors: errors,
      isValid: errors.isEmpty,
      warningCount: errors.where((e) => e.severity == ErrorSeverity.warning).length,
    );
  }
  
  void _syntaxValidation() {
    // Check for matching braces, quotes, semicolons
    // Can use regex or a simple parser
  }
  
  void _semanticValidation() {
    // All used variables defined before use
    // All called functions are defined
    // Proper scope usage
  }
  
  void _runtimeValidation() {
    // All required helpers present
    // All imports available
    // Framework classes can be instantiated
  }
  
  void _styleValidation() {
    // Consistent formatting
    // Proper indentation
    // Code conventions
  }
}
```

### JSOptimizer
```dart
class JSOptimizer {
  String code;
  
  String optimize({int level = 1}) {
    if (level >= 1) {
      code = _constantFolding(code);
      code = _deadCodeElimination(code);
    }
    
    if (level >= 2) {
      code = _commonSubexpressionElimination(code);
      code = _variableInlining(code);
    }
    
    if (level >= 3) {
      code = _methodInlining(code);
      code = _minify(code);
    }
    
    return code;
  }
  
  String _constantFolding(String code) {
    // 1 + 2 → 3
    // 'hello' + ' world' → 'hello world'
    return code; // Placeholder
  }
  
  String _deadCodeElimination(String code) {
    // Remove unreachable code
    // Remove unused variables
    return code; // Placeholder
  }
  
  String _commonSubexpressionElimination(String code) {
    // Identify repeated expressions
    // Store in temp variable
    return code; // Placeholder
  }
}
```

---

# COMPLETE INTEGRATION FLOW

```
1. Load .flir file
   ↓
2. Deserialize to DartFile IR
   ↓
3. [PHASE 0] PRE-ANALYSIS
   ├─ IRPostDeserializeValidator → ValidationReport
   ├─ IRTypeSystemAnalyzer → TypeEnvironment
   ├─ IRScopeAnalyzer → ScopeModel
   ├─ IRControlFlowAnalyzer → ControlFlowGraph
   └─ FlutterWidgetAnalyzer → WidgetMap, Lifecycles, States
   ↓
   [DECISION] Can proceed? → If NO: Exit with report
   ↓
4. [PHASE 1] NORMALIZATION
   ├─ IR Lowering → Simplified IR
   └─ Semantic Enhancement → Annotated IR
   ↓
5. [PHASE 2] CODE GENERATION
   ├─ ExpressionCodeGen → JavaScript expressions
   ├─ StatementCodeGen → JavaScript statements
   ├─ FunctionCodeGen → JavaScript functions
   └─ ClassCodeGen → JavaScript classes
   ↓
6. [PHASE 3] FLUTTER GENERATION
   ├─ WidgetInstantiationCodeGen → Widget constructors
   ├─ BuildMethodCodeGen → build() methods
   ├─ StatefulWidgetJSCodeGen → Stateful components
   └─ StatelessWidgetJSCodeGen → Stateless components
   ↓
7. [PHASE 4] FILE GENERATION
   ├─ FileCodeGen → Complete JS file structure
   ├─ DependencyResolver → Class order
   └─ RuntimeRequirementsCollector → Helpers needed
   ↓
8. [PHASE 5] VALIDATION & OPTIMIZATION
   ├─ OutputValidator → Check generated code
   ├─ JSOptimizer → Optimize code
   └─ SourceMapGenerator → Debug info
   ↓
9. [PHASE 6] REPORTING
   ├─ ConversionReport → Summary
   ├─ CoverageMetrics → Stats
   └─ Output files (.js, .map, .report)
   ↓
10. OUTPUT: Complete .js file ready for Flutter.js framework
```

---

# MASTER IMPLEMENTATION CHECKLIST

## Phase 0: Validation (Week 1)
- [ ] IRPostDeserializeValidator
  - [ ] Structural integrity checks
  - [ ] Semantic validity checks
  - [ ] Completeness verification
  - [ ] Binary integrity validation
  - [ ] Unit tests

- [ ] IRTypeSystemAnalyzer
  - [ ] Type table builder
  - [ ] Type reference resolver
  - [ ] Implicit type inference
  - [ ] Type consistency validation
  - [ ] Unit tests

- [ ] IRScopeAnalyzer
  - [ ] Scope chain builder
  - [ ] Binding resolver
  - [ ] Closure analyzer
  - [ ] Lifetime analyzer
  - [ ] Unit tests

- [ ] IRControlFlowAnalyzer
  - [ ] CFG builder
  - [ ] Reachability analyzer
  - [ ] Loop detector
  - [ ] Exception flow analyzer
  - [ ] Unit tests

- [ ] FlutterWidgetAnalyzer
  - [ ] Widget classifier
  - [ ] Lifecycle mapper
  - [ ] State analyzer
  - [ ] Build tree builder
  - [ ] Validation
  - [ ] Unit tests

## Phase 2: Core Code Gen (Weeks 2-3)
- [ ] ExpressionCodeGen (All 20+ expression types)
- [ ] StatementCodeGen (All 10+ statement types)
- [ ] FunctionCodeGen (All function variations)
- [ ] ClassCodeGen (All class variations)
- [ ] Special features (async, generators, patterns)
- [ ] Integration tests

## Phase 3: Flutter Code Gen (Week 4)
- [ ] FlutterWidgetRegistry
- [ ] WidgetInstantiationCodeGen
- [ ] BuildMethodCodeGen
- [ ] StatefulWidgetJSCodeGen
- [ ] StatelessWidgetJSCodeGen
- [ ] Flutter prop converters
- [ ] Integration tests

## Phase 4: File Gen (Week 5)
- [ ] FileCodeGen (complete structure)
- [ ] Dependency resolver
- [ ] Runtime requirements collector
- [ ] Helper generators
- [ ] Integration tests

## Phase 5: Validation (Week 6)
- [ ] OutputValidator
- [ ] JSOptimizer (3 levels)
- [ ] SourceMapGenerator
- [ ] Integration tests

## Phase 6: Reporting (Week 7)
- [ ] ConversionReport
- [ ] CoverageMetrics
- [ ] Report generators (JSON, HTML)
- [ ] Final integration tests

---

# SUCCESS CRITERIA

✅ **Phase 0**: All IR nodes validated, typed, scoped, and analyzed
✅ **Phase 2**: All Dart language features convert to JS
✅ **Phase 3**: All Flutter widgets convert to framework classes
✅ **Phase 4**: Complete .js files generated with correct structure
✅ **Phase 5**: Generated code validates and optimizes correctly
✅ **Phase 6**: Clear reports with high confidence scores
✅ **Output**: Ready-to-run JavaScript files in Flutter.js framework

---

# ESTIMATED EFFORT

- **Phase 0**: 1-2 weeks (foundational)
- **Phase 2**: 2-3 weeks (core language)
- **Phase 3**: 1 week (Flutter-specific)
- **Phase 4**: 1 week (file generation)
- **Phase 5-6**: 1-2 weeks (validation & polish)

**Total: 7-10 weeks for complete implementation**