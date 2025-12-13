# FlutterJS Custom Static Code Analyzer - Planning Document

Based on the requirements in Document 4 and the actual framework code in `main.fjs`, I'll create a comprehensive plan for a **completely custom, zero-dependency AST analyzer**.

---

## 1. Problem Analysis & Framework Understanding

### 1.1 Framework Characteristics (From main.fjs)

**Widget System:**
```javascript
// Stateless Widget
class MyApp extends StatelessWidget {
  constructor({ key = undefined } = {}) { ... }
  build(context = undefined) { return MaterialApp(...); }
}

// Stateful Widget
class MyHomePage extends StatefulWidget {
  title = null;
  constructor({ key = undefined, title } = {}) { ... }
  createState() { return _MyHomePageState(); }
}

// Corresponding State Class
class _MyHomePageState extends State<MyHomePage> {
  _counter = 0;
  _incrementCounter() { this.setState(() => _counter++); }
  build(context = undefined) { return Scaffold(...); }
}
```

**Widget Instantiation (Object Literal Props):**
```javascript
MaterialApp({ 
  title: "Flutter Demo", 
  theme: ThemeData({ colorScheme: .fromSeed(seedColor: Colors.deepPurple) }), 
  home: const new MyHomePage({ title: "Flutter Demo Home Page" }) 
})
```

**Functional Widgets (Arrow Functions):**
```javascript
const buildUserCard = (name = undefined, age = undefined) => 
  Card({ margin: EdgeInsets.all(12), child: Padding(...) })
```

**Entry Point:**
```javascript
function main() {
  runApp(const new MyApp());
}
```

**State Management:**
```javascript
_incrementCounter() {
  this.setState(() => _counter++);
}
```

### 1.2 Key Analysis Challenges

| Challenge | Why It's Hard | Solution Strategy |
|-----------|---------------|-------------------|
| **Generic-like syntax** `State<MyHomePage>` | Looks like TypeScript generics but is framework-specific | Custom lexer for angle brackets in class context |
| **Props as object literals** | Variable nesting, optional syntax | Custom object literal parser + prop shape inference |
| **Arrow function returns** | Single expression return without braces | Detect `=>` followed by widget instantiation |
| **const new pattern** | `const new Widget(...)` unusual syntax | Handle `const` keyword before `new` |
| **Nested widget calls** | Children deeply nested in constructor args | Recursive descent parser for expressions |
| **Missing method bodies** | Some methods have inline implementations | Handle expression-body and block-body methods |
| **this.setState pattern** | Must validate it's only in State classes | Context-aware semantic validation |

---

## 2. Architecture Overview

### 2.1 Four-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                    ANALYZER ORCHESTRATOR                     │
│                  (Main entry point, coords)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬────────────────┐
        ▼                ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   LEXER &    │  │  PARSER &    │  │  WIDGET &    │  │   RUNTIME    │
│ TOKENIZER    │  │  AST BUILDER │  │  DEPENDENCY  │  │   SAFETY     │
│              │  │              │  │   ANALYZER   │  │   DETECTOR   │
│ • Tokenize   │  │ • Parse      │  │              │  │              │
│   source     │  │   classes    │  │ • Identify   │  │ • Validate   │
│ • Classify   │  │ • Parse      │  │   widgets    │  │   setState   │
│   tokens     │  │   methods    │  │ • Build tree │  │ • Check      │
│ • Track      │  │ • Parse      │  │ • Map State  │  │   required   │
│   position   │  │   expressions│  │   to Widget  │  │   features   │
│              │  │ • Handle     │  │ • Extract    │  │ • Flag       │
│              │  │   object lit │  │   props      │  │   anti-      │
│              │  │              │  │ • Infer      │  │   patterns   │
│              │  │              │  │   types      │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        │                │                │                │
        └────────────────┴────────────────┴────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                  ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   METADATA COLLECTOR     │      │   REPORT GENERATOR       │
│                          │      │                          │
│ • Aggregate findings     │      │ • Format JSON output     │
│ • Correlate data         │      │ • Include warnings       │
│ • Build indices          │      │ • Add suggestions        │
│ • Track locations        │      │ • Calc metrics           │
│                          │      │ • Export structure       │
└──────────────────────────┘      └──────────────────────────┘
        │                                  │
        └──────────────────┬───────────────┘
                           ▼
                  ┌──────────────────┐
                  │  ANALYSIS REPORT │
                  │      (JSON)      │
                  └──────────────────┘
```

---

## 3. Layer 1: Lexer & Tokenizer

### 3.1 Lexer Architecture

**Purpose:** Convert raw source string → stream of meaningful tokens

**Responsibilities:**
1. Break source into tokens
2. Classify token type
3. Track position (line, column) for error reporting
4. Handle multi-line constructs
5. Preserve significant whitespace/comments metadata

### 3.2 Token Types

```
Fundamental Types:
├── KEYWORD
│   ├── class, extends, new, return, const, function
│   ├── this, static, async, await, if, else, for, while
│   └── import, export, from, as
├── IDENTIFIER
│   ├── ClassName, methodName, variableName
│   └── Tracks length, case pattern
├── LITERAL
│   ├── STRING ("...", '...', `...`)
│   ├── NUMBER (123, 45.67, -890)
│   ├── BOOLEAN (true, false)
│   └── NULL, UNDEFINED
├── OPERATOR
│   ├── ASSIGNMENT (=, +=, -=)
│   ├── COMPARISON (===, ==, !==, !=, <, >, <=, >=)
│   ├── LOGICAL (&&, ||, !)
│   ├── ARITHMETIC (+, -, *, /, %)
│   └── SPECIAL (=>, ?.., ?:)
├── PUNCTUATION
│   ├── BRACE_OPEN ({), BRACE_CLOSE (})
│   ├── PAREN_OPEN ((), PAREN_CLOSE ())
│   ├── BRACKET_OPEN ([), BRACKET_CLOSE (])
│   ├── SEMICOLON (;), COMMA (,), COLON (:), DOT (.)
│   └── ANGLE_OPEN (<), ANGLE_CLOSE (>)
├── COMMENT
│   ├── SINGLE_LINE (//)
│   └── MULTI_LINE (/* */)
├── WHITESPACE
│   └── NEWLINE, SPACE, TAB
└── EOF
    └── End of file marker
```

### 3.3 Lexer State Machine

**Simple state machine:**
```
START
  ├─ See letter/_ → IDENTIFIER
  ├─ See digit → NUMBER
  ├─ See quote → STRING
  ├─ See / → Check next char
  │   ├─ / → COMMENT_SINGLE_LINE
  │   ├─ * → COMMENT_MULTI_LINE
  │   └─ else → OPERATOR (/)
  ├─ See known operators/punctuation → OPERATOR/PUNCTUATION
  ├─ See whitespace → WHITESPACE
  └─ See EOF → EOF
```

### 3.4 Lexer Error Handling

**Strategy:**
- Unterminated strings → error with position
- Invalid escape sequences → warning
- Unusual character sequences → might skip or flag

---

## 4. Layer 2: Parser & AST Builder

### 4.1 Parser Design

**Approach:** Recursive Descent Parser (hand-rolled, no external tool)

**Why RDP?**
- Full control over grammar
- Easy to customize for framework patterns
- Minimal memory overhead
- Can emit errors with exact position

### 4.2 Grammar Structure (Simplified BNF-like)

```
Program
  → (ImportDeclaration | ClassDeclaration | FunctionDeclaration)*

ClassDeclaration
  → 'class' Identifier ('extends' Identifier)? '{' ClassBody '}'

ClassBody
  → (FieldDeclaration | MethodDeclaration)*

FieldDeclaration
  → Identifier ('=' Expression)? ';'?

MethodDeclaration
  → Identifier '(' ParameterList ')' ('{' Statement* '}' | '=>' Expression)

Statement
  → Expression ';'?
  | 'return' Expression ';'?
  | 'if' '(' Expression ')' Statement
  | '{' Statement* '}'
  | Declaration

Expression
  → ConditionalExpression

ConditionalExpression
  → LogicalOrExpression ('?' Expression ':' Expression)?

LogicalOrExpression
  → LogicalAndExpression ('||' LogicalAndExpression)*

LogicalAndExpression
  → EqualityExpression ('&&' EqualityExpression)*

EqualityExpression
  → RelationalExpression (('===' | '!==' | '==' | '!=') RelationalExpression)*

RelationalExpression
  → AdditiveExpression (('<' | '>' | '<=' | '>=') AdditiveExpression)*

AdditiveExpression
  → MultiplicativeExpression (('+' | '-') MultiplicativeExpression)*

MultiplicativeExpression
  → UnaryExpression (('*' | '/' | '%') UnaryExpression)*

UnaryExpression
  → ('!' | '-' | '+' | 'typeof' | 'await')? PostfixExpression

PostfixExpression
  → CallExpression

CallExpression
  → PrimaryExpression (CallSuffix)*

CallSuffix
  → '(' ArgumentList ')' | '[' Expression ']' | '.' Identifier

PrimaryExpression
  → 'new' Identifier '[' Identifier ']'? '(' ObjectLiteral? ')'  // new MyWidget({...})
  → 'const' 'new' Identifier '(' ObjectLiteral? ')'             // const new MyWidget({...})
  → Identifier '(' ObjectLiteral? ')'                           // functionCall({...})
  → Identifier '=>' Expression                                  // arrow function
  → Identifier '=>' '{' Statement* '}'
  → ObjectLiteral
  → ArrayLiteral
  → 'function' Identifier? '(' ParameterList ')' '{' Statement* '}'
  → '(' Expression ')'
  → Identifier
  → Literal

ObjectLiteral
  → '{' (Property (',' Property)* ','?)? '}'

Property
  → Identifier ':' Expression
  | '[' Expression ']' ':' Expression
  | Identifier                                                   // shorthand

ArrayLiteral
  → '[' (Expression (',' Expression)* ','?)? ']'

ParameterList
  → (Parameter (',' Parameter)* ','?)?

Parameter
  → Identifier ('=' Expression)?

ImportDeclaration
  → 'import' Identifier 'from' StringLiteral
  → 'import' '{' IdentifierList '}' 'from' StringLiteral
  → 'import' * 'as' Identifier 'from' StringLiteral
```

### 4.3 AST Node Types

**Core AST Nodes:**

```
class ASTNode {
  type: string;          // e.g., 'ClassDeclaration', 'MethodDeclaration'
  location: {
    file: string;
    line: number;
    column: number;
  };
}

class Program extends ASTNode {
  body: (ImportDeclaration | ClassDeclaration | FunctionDeclaration)[];
}

class ClassDeclaration extends ASTNode {
  id: Identifier;
  superClass: Identifier | null;
  body: ClassBody;
  isGeneric: boolean;      // e.g., State<MyWidget>
  genericParam: string | null;
}

class ClassBody extends ASTNode {
  fields: FieldDeclaration[];
  methods: MethodDeclaration[];
}

class FieldDeclaration extends ASTNode {
  key: Identifier;
  type: string | null;     // inferred
  initialValue: Expression | null;
}

class MethodDeclaration extends ASTNode {
  key: Identifier;
  params: Parameter[];
  returnType: string | null;
  body: BlockStatement | Expression;  // block or arrow-body
  isOverride: boolean;
  isStatic: boolean;
}

class Parameter extends ASTNode {
  name: Identifier;
  type: string | null;
  optional: boolean;
  defaultValue: Expression | null;
}

class FunctionDeclaration extends ASTNode {
  id: Identifier | null;
  params: Parameter[];
  body: BlockStatement | Expression;
  isAsync: boolean;
}

class NewExpression extends ASTNode {
  callee: Identifier;
  arguments: (Expression | ObjectLiteral)[];
  isConst: boolean;        // 'const new' pattern
  genericParam: string | null;  // e.g., State<MyWidget>
}

class CallExpression extends ASTNode {
  callee: Identifier | MemberExpression;
  arguments: Expression[];
}

class ObjectLiteral extends ASTNode {
  properties: Property[];
}

class Property extends ASTNode {
  key: Identifier | StringLiteral | ComputedKey;
  value: Expression;
  shorthand: boolean;
}

class Identifier extends ASTNode {
  name: string;
}

class Literal extends ASTNode {
  value: any;              // string, number, boolean, null, undefined
  raw: string;
}

class BlockStatement extends ASTNode {
  body: Statement[];
}

class ReturnStatement extends ASTNode {
  argument: Expression | null;
}

class ExpressionStatement extends ASTNode {
  expression: Expression;
}

class ArrowFunctionExpression extends ASTNode {
  params: Parameter[];
  body: BlockStatement | Expression;
  isAsync: boolean;
}

class ImportDeclaration extends ASTNode {
  specifiers: ImportSpecifier[];
  source: Literal;
}

class ImportSpecifier extends ASTNode {
  imported: Identifier;
  local: Identifier;
}
```

### 4.4 Parser Utilities & Methods

```
class Parser {
  // Token management
  peek(offset = 0): Token
  consume(): Token
  expect(type: string | string[]): Token
  match(...types: string[]): boolean
  
  // Parsing coordination
  parseProgram(): Program
  parseTopLevel(): ImportDeclaration | ClassDeclaration | FunctionDeclaration
  
  // Class parsing
  parseClassDeclaration(): ClassDeclaration
  parseClassBody(): ClassBody
  parseFieldDeclaration(): FieldDeclaration
  parseMethodDeclaration(): MethodDeclaration
  
  // Expression parsing (precedence climbing)
  parseExpression(): Expression
  parseConditionalExpression(): Expression
  parseLogicalOrExpression(): Expression
  parseLogicalAndExpression(): Expression
  parseEqualityExpression(): Expression
  parseRelationalExpression(): Expression
  parseAdditiveExpression(): Expression
  parseMultiplicativeExpression(): Expression
  parseUnaryExpression(): Expression
  parsePostfixExpression(): Expression
  parseCallExpression(): Expression
  parsePrimaryExpression(): Expression
  
  // Object & Array
  parseObjectLiteral(): ObjectLiteral
  parseArrayLiteral(): ArrayLiteral
  parseProperty(): Property
  
  // Statements
  parseStatement(): Statement
  parseBlockStatement(): BlockStatement
  parseReturnStatement(): ReturnStatement
  
  // Parameters
  parseParameterList(): Parameter[]
  parseParameter(): Parameter
  
  // Utilities
  parseIdentifier(): Identifier
  parseLiteral(): Literal
  parseGenericParam(): string | null  // for State<MyWidget>
  
  // Error handling
  error(message: string, token?: Token): void
  warn(message: string, token?: Token): void
}
```

---

## 5. Layer 3: Widget & Dependency Analyzer

### 5.1 Widget Detection Strategy

**Stateless Widget:**
```javascript
class MyButton extends StatelessWidget {
  build(context) { ... }
}
```
→ Detect: `extends StatelessWidget`

**Stateful Widget:**
```javascript
class MyCounter extends StatefulWidget {
  createState() { return new _MyCounterState(); }
}
```
→ Detect: `extends StatefulWidget`, paired with `State` class

**State Class:**
```javascript
class _MyCounterState extends State<MyCounter> {
  build(context) { ... }
}
```
→ Detect: `extends State<SomeWidget>`

**Functional Widget (Direct Function Return):**
```javascript
function MyCard(props) {
  return new Card({ child: ... });
}

const MyButton = (props) => new Button({ ... });
```
→ Detect: Function that returns widget

**Widget Instantiation Pattern:**
```javascript
new Container({ child: new Text("Hello") })
const new MyApp({ title: "Demo" })
MaterialApp({ theme: ThemeData(...) })
```
→ Detect: `new` keyword + Identifier + `(ObjectLiteral)`

### 5.2 Widget Analyzer Architecture

```
class WidgetAnalyzer {
  // Widget detection
  detectWidgets(ast: Program): Widget[]
  detectStatelessWidget(classDef: ClassDeclaration): StatelessWidget
  detectStatefulWidget(classDef: ClassDeclaration): StatefulWidget
  detectStateClass(classDef: ClassDeclaration): StateClass
  detectFunctionalWidget(funcDef: FunctionDeclaration): FunctionalWidget
  
  // Pairing & linking
  linkStatefulToState(stateful: StatefulWidget, state: StateClass): void
  resolveStateType(genericParam: string): StateClass | null
  
  // Widget tree building
  buildWidgetTree(rootWidget: Widget): WidgetNode
  traverseWidgetHierarchy(method: MethodDeclaration): WidgetNode[]
  extractChildrenFromObjectLiteral(obj: ObjectLiteral): Widget[]
  extractChildFromObjectLiteral(obj: ObjectLiteral): Widget | null
  
  // Prop inference
  inferPropsFromConstructor(classDecl: ClassDeclaration): PropInterface
  inferPropsFromFunctionParams(funcDecl: FunctionDeclaration): PropInterface
  inferPropertyType(initialValue: Expression | null): string
  
  // Root widget detection
  findRunAppCall(ast: Program): Widget | null
  extractWidgetFromCall(call: CallExpression): Widget | null
  
  // Helper methods
  isWidgetClass(classDef: ClassDeclaration): boolean
  isWidgetCall(expr: CallExpression | NewExpression): boolean
  getWidgetName(expr: CallExpression | NewExpression): string
}

class Widget {
  name: string;
  type: 'stateless' | 'stateful' | 'state' | 'functional';
  location: Location;
  superClass: string;
  constructorParams: Parameter[];
  methods: { [methodName]: MethodMetadata };
  inferredProps: PropInterface;
  children: Widget[];
  parentWidget: Widget | null;
}

class StatelessWidget extends Widget {
  type = 'stateless';
  buildMethod: MethodMetadata;
}

class StatefulWidget extends Widget {
  type = 'stateful';
  createStateMethod: MethodMetadata;
  linkedState: StateClass | null;
}

class StateClass extends Widget {
  type = 'state';
  linkedStatefulWidget: StatefulWidget | null;
  stateFields: StateField[];
  buildMethod: MethodMetadata;
  initStateMethod: MethodMetadata | null;
  didUpdateMethod: MethodMetadata | null;
}

class FunctionalWidget extends Widget {
  type = 'functional';
  functionDeclaration: FunctionDeclaration;
  returnedWidget: Widget | null;
}

class WidgetNode {
  widget: Widget;
  depth: number;
  children: WidgetNode[];
  parent: WidgetNode | null;
}

class PropInterface {
  [propName]: PropDefinition;
}

class PropDefinition {
  type: string;          // inferred: 'string', 'number', 'Widget', 'Function', etc.
  required: boolean;
  defaultValue: any;
  usedIn: string[];       // which widget classes use this prop
}

class StateField {
  name: string;
  type: string;          // inferred
  initialValue: Expression | null;
  isMutable: boolean;
}

class MethodMetadata {
  name: string;
  location: Location;
  params: Parameter[];
  returnType: string | null;
  body: BlockStatement | Expression;
  callsSetState: boolean;
  accessesContext: boolean;
  accessesWidget: boolean;
}
```

---

## 6. Layer 4: Runtime Safety Detector

### 6.1 Safety Checks

**setState Validation:**
- Must be called only inside State classes
- Must be used correctly: `this.setState(() => { ... })`
- Should not be called before mounted
- Should handle state updates synchronously

**Constructor Validation:**
- Widget constructors called with `new` keyword
- Props object literal contains only declared properties
- Required props are provided
- Type compatibility (child should be Widget, children should be Widget[])

**Lifecycle Validation:**
- initState called before build
- dispose called when widget unmounts
- No state mutations outside setState

**Context Usage:**
- context parameter passed to build()
- Theme.of(context) only called inside widgets with context
- BuildContext only used in build and event handlers

**Anti-patterns:**
- Missing keys in lists
- child and children both specified
- setState in render (will loop)
- Missing return in build()

### 6.2 Safety Detector Architecture

```
class RuntimeSafetyDetector {
  // setState checks
  validateSetState(ast: Program): Safety Issue[]
  validateSetStateContext(call: CallExpression): Issue | null
  validateSetStateUsage(call: CallExpression): Issue | null
  
  // Constructor checks
  validateConstructors(ast: Program): Issue[]
  validateWidgetInstantiation(expr: NewExpression): Issue[]
  validatePropsObject(obj: ObjectLiteral, expectedProps: PropInterface): Issue[]
  
  // Lifecycle checks
  validateLifecycle(stateClass: StateClass): Issue[]
  validateInitStateOrder(stateClass: StateClass): Issue[]
  validateDisposeCleanup(stateClass: StateClass): Issue[]
  
  // Context checks
  validateContextUsage(ast: Program): Issue[]
  validateContextParameter(method: MethodDeclaration): Issue[]
  validateThemeOfContext(call: CallExpression): Issue[]
  
  // Anti-pattern detection
  detectMissingKeys(widget: Widget): Issue[]
  detectChildChildrenConflict(obj: ObjectLiteral): Issue[]
  detectSetStateInRender(stateClass: StateClass): Issue[]
  detectMissingReturn(method: MethodDeclaration): Issue[]
  
  // Helper methods
  isInStateClass(location: Location, ast: Program): boolean
  findEnclosingStateClass(location: Location, ast: Program): StateClass | null
  getContextAvailability(method: MethodDeclaration): boolean
}

class Issue {
  type: 'error' | 'warning' | 'info';
  code: string;            // e.g., 'SETSTATE_OUTSIDE_STATE'
  message: string;
  location: Location;
  suggestion: string;      // how to fix it
  severity: number;        // 0-100
}

class SafetyReport {
  totalIssues: number;
  errors: Issue[];
  warnings: Issue[];
  info: Issue[];
  summary: string;
}
```

---

## 7. Metadata Collector & Report Generator

### 7.1 Metadata Collector

```
class MetadataCollector {
  // Aggregation
  collectAllMetadata(
    ast: Program,
    widgets: Widget[],
    tree: WidgetNode,
    issues: Issue[]
  ): AnalysisMetadata
  
  // Indexing
  buildWidgetIndex(widgets: Widget[]): Map<string, Widget>
  buildLocationIndex(ast: Program): Map<string, ASTNode[]>
  
  // Statistics
  calculateMetrics(metadata: AnalysisMetadata): AnalysisMetrics
  
  // Correlation
  linkIssueToWidget(issue: Issue, metadata: AnalysisMetadata): void
  linkIssueToMethod(issue: Issue, metadata: AnalysisMetadata): void
}

class AnalysisMetadata {
  source: {
    file: string;
    lines: number;
    timestamp: string;
  };
  
  widgets: {
    total: number;
    stateless: number;
    stateful: number;
    functional: number;
    stateClasses: number;
  };
  
  widgetRegistry: Map<string, Widget>;
  widgetTree: WidgetNode;
  rootWidget: Widget | null;
  
  state: {
    totalStateFields: number;
    stateFieldsByClass: Map<string, StateField[]>;
  };
  
  props: {
    totalUniquePropNames: Set<string>;
    propsByWidget: Map<string, PropInterface>;
    inferredTypes: Map<string, string>;
  };
  
  imports: ImportDeclaration[];
  externalDependencies: Set<string>;
  
  functions: FunctionDeclaration[];
  
  issues: SafetyReport;
}

class AnalysisMetrics {
  complexity: {
    widgetDepth: number;
    maxChildrenCount: number;
    averagePropsPerWidget: number;
  };
  
  stats: {
    totalLines: number;
    linesOfWidgetCode: number;
    reusableWidgets: number;
    singleUseWidgets: number;
  };
  
  health: {
    errorCount: number;
    warningCount: number;
    healthScore: number;  // 0-100
  };
}
```

### 7.2 Report Generator

```
class ReportGenerator {
  // Report generation
  generateReport(metadata: AnalysisMetadata): AnalysisReport
  
  // JSON export
  toJSON(metadata: AnalysisMetadata): object
  toPrettyJSON(metadata: AnalysisMetadata): string
  
  // Human-readable output
  toMarkdown(metadata: AnalysisMetadata): string
  toConsoleOutput(metadata: AnalysisMetadata): string
  
  // Structured sections
  generateSummarySection(metadata: AnalysisMetadata): object
  generateWidgetsSection(metadata: AnalysisMetadata): object
  generateTreeSection(metadata: AnalysisMetadata): object
  generatePropsSection(metadata: AnalysisMetadata): object
  generateIssuesSection(metadata: AnalysisMetadata): object
  generateMetricsSection(metadata: AnalysisMetadata): object
}

class AnalysisReport {
  summary: {
    file: string;
    timestamp: string;
    totalWidgets: number;
    rootWidget: string;
    criticalIssues: number;
    warnings: number;
  };
  
  widgets: Widget[];
  tree: WidgetNode;
  
  props: {
    [widgetName]: PropInterface;
  };
  
  state: {
    [stateClassName]: StateField[];
  };
  
  imports: ImportDeclaration[];
  
  issues: {
    errors: Issue[];
    warnings: Issue[];
    info: Issue[];
  };
  
  metrics: AnalysisMetrics;
}
```

---

## 8. Configuration & Customization

### 8.1 Analyzer Configuration

```
class AnalyzerConfig {
  // Framework-specific settings
  framework: {
    widgetBaseClass: string;           // 'Widget'
    statelessBaseClass: string;         // 'StatelessWidget'
    statefulBaseClass: string;          // 'StatefulWidget'
    stateBaseClass: string;             // 'State'
    buildContextClass: string;          // 'BuildContext'
    buildMethodName: string;            // 'build'
    createStateMethodName: string;      // 'createState'
    setStateMethodName: string;         // 'setState'
    runAppFunctionName: string;         // 'runApp'
  };
  
  // Analysis options
  analysis: {
    detectUnusedWidgets: boolean;
    detectUnusedFunctions: boolean;
    infer TypesAggressively: boolean;
    validateLifecycle: boolean;
    validateSetState: boolean;
    validateContext: boolean;
    detectAntiPatterns: boolean;
  };
  
  // Output options
  output: {
    format: 'json' | 'markdown' | 'console';
    includeMetrics: boolean;
    includeTree: boolean;
    includeSuggestions: boolean;
    maxIssuesToReport: number;
  };
  
  // Advanced
  advanced: {
    parseComments: boolean;
    trackCallChains: boolean;
    inferGenerics: boolean;
    strictMode: boolean;
  };
}
```

---

## 9. Data Flow Diagram

```
Source Code (main.fjs)
    │
    ▼
┌─────────────────┐
│ LEXER/TOKENIZER │
└────────┬────────┘
         │ (Token Stream)
         ▼
┌─────────────────┐
│     PARSER      │
└────────┬────────┘
         │ (AST)
         ▼
    ┌────┴────┬────────────┬──────────┐
    │          │            │          │
    ▼          ▼            ▼          ▼
┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
│WIDGET  │ │DEPEND. │ │RUNTIME  │ │METADATA  │
│ANALYZER│ │ANALYZER│ │SAFETY   │ │COLLECTOR │
└────┬───┘ └────┬───┘ └────┬────┘ └────┬─────┘
     │          │          │            │
     └──────────┴──────────┴────────────┘
                    │
                    ▼
          ┌──────────────────┐
          │ METADATA OBJECT  │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │REPORT GENERATOR  │
          └────────┬─────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
    ┌────────┐          ┌──────────┐
    │ JSON   │          │ Markdown │
    │ Report │          │ Report   │
    └────────┘          └──────────┘
```

---

## 10. Class Definitions (High-Level)

### 10.1 Core Parser Classes

```javascript
// Layer 1: Lexer
class Lexer {
  constructor(source, config = {})
  tokenize()
  // methods as defined in 4.4
}

class Token {
  constructor(type, value, position)
  // getters for line, column, etc.
}

// Layer 2: Parser
class Parser {
  constructor(tokens, config = {})
  parse()
  // methods as defined in 4.4
}

// Layer 3: Widget Analyzer
class WidgetAnalyzer {
  constructor(ast, config = {})
  analyze()
  // methods as defined in 5.2
}

// Layer 4: Runtime Safety
class RuntimeSafetyDetector {
  constructor(ast, widgets, config = {})
  detect()
  // methods as defined in 6.2
}

// Metadata & Reporting
class MetadataCollector {
  constructor(ast, widgets, issues, config = {})
  collect()
}

class ReportGenerator {
  constructor(metadata, config = {})
  generate()
}

// Orchestrator
class FlutterJSAnalyzer {
  constructor(sourceCode, config = AnalyzerConfig.default())
  analyze()
  getReport()
}
```

### 10.2 Data Classes

```javascript
// AST Nodes (as defined in 4.3)
class ASTNode { }
class Program extends ASTNode { }
class ClassDeclaration extends ASTNode { }
// ... others

// Widget classes (as defined in 5.2)
class Widget { }
class StatelessWidget extends Widget { }
class StatefulWidget extends Widget { }
class StateClass extends Widget { }
class FunctionalWidget extends Widget { }
class WidgetNode { }

// Property/Config classes
class PropInterface { }
class PropDefinition { }
class StateField { }
class MethodMetadata { }

// Issue/Report classes
class Issue { }
class SafetyReport { }
class AnalysisMetadata { }
class AnalysisMetrics { }
class AnalysisReport { }

// Configuration
class AnalyzerConfig { }
```

---

## 11. Example Analysis Workflow (Pseudocode)

```javascript
// Step 1: Initialize with config
const config = new AnalyzerConfig.default();
const analyzer = new FlutterJSAnalyzer(sourceCode, config);

// Step 2: Lexing
const lexer = new Lexer(sourceCode, config);
const tokens = lexer.tokenize();
// → [Token(KEYWORD, 'import'), Token(IDENTIFIER, 'Flutter'), ...]

// Step 3: Parsing
const parser = new Parser(tokens, config);
const ast = parser.parse();
// → Program { body: [ImportDeclaration, ClassDeclaration, ...] }

// Step 4: Widget Analysis
const widgetAnalyzer = new WidgetAnalyzer(ast, config);
const widgets = widgetAnalyzer.analyze();
const tree = widgetAnalyzer.buildWidgetTree(rootWidget);
// → [Widget{ name: 'MyApp', type: 'stateless', ... }, ...]
// → WidgetNode { widget: MyApp, children: [WidgetNode, ...] }

// Step 5: Runtime Safety Check
const safetyDetector = new RuntimeSafetyDetector(ast, widgets, config);
const issues = safetyDetector.detect();
// → [Issue{ type: 'error', code: 'SETSTATE_OUTSIDE_STATE', ... }, ...]

// Step 6: Metadata Collection
const collector = new MetadataCollector(ast, widgets, tree, issues, config);
const metadata = collector.collect();
// → AnalysisMetadata { widgets: {...}, props: {...}, issues: {...} }

// Step 7: Report Generation
const reportGen = new ReportGenerator(metadata, config);
const report = reportGen.generate();
// → AnalysisReport { summary: {...}, widgets: [...], issues: {...} }

// Step 8: Export
console.log(reportGen.toJSON());
// or
fs.writeFileSync('analysis-report.json', reportGen.toPrettyJSON());
```

---

## 12. Implementation Roadmap

### Phase A: Foundation (Lexer + Parser)
- [ ] Token types & classification
- [ ] Lexer state machine
- [ ] Recursive descent parser
- [ ] AST node classes
- [ ] Basic error reporting

### Phase B: Widget Analysis
- [ ] Widget detection logic
- [ ] Stateful/Stateless pairing
- [ ] Widget tree building
- [ ] Prop inference
- [ ] Root widget detection

### Phase C: Runtime Safety
- [ ] setState validation
- [ ] Constructor validation
- [ ] Lifecycle checks
- [ ] Context validation
- [ ] Anti-pattern detection

### Phase D: Reporting
- [ ] Metadata collection
- [ ] Statistics calculation
- [ ] JSON export
- [ ] Markdown/console output
- [ ] Configuration system

---

## 13. Key Design Decisions & Justifications

| Decision | Reasoning |
|----------|-----------|
| **Recursive Descent Parser** | Full control, no external deps, easy to customize for framework |
| **Simplified Grammar** | Only parse what's relevant to framework; skip JS spec edge cases |
| **Separated Layers** | Each layer has single responsibility; easy to test & maintain |
| **Position Tracking** | Report errors with line/column for better DX |
| **Configuration Object** | Allow customization of base class names, methods, etc. |
| **Widget Tree as Separate Structure** | Simpler analysis than trying to infer from AST alone |
| **Issue Codes** | Consistent, easy to grep, can be documented |
| **Multiple Output Formats** | JSON for tools, Markdown for reports, console for dev |

---

## 14. Success Criteria

✅ **Complete** analyzer must:
- Parse main.fjs without errors
- Detect all 3 widget classes (MyApp, MyHomePage, _MyHomePageState)
- Correctly pair MyHomePage with _MyHomePageState
- Build accurate widget tree (MyApp → MaterialApp → MyHomePage → Scaffold → ...)
- Infer props from constructors
- Detect 4 unused functions (buildUserCard, buildPriceWidget, appTest, ex)
- Flag all setState usage (one valid in _MyHomePageState)
- Report zero false positives
- Generate comprehensive JSON report

---

## 15. Testing Strategy

```
Unit Tests:
├── Lexer
│   ├── Token classification
│   ├── String/number/comment handling
│   └── Error recovery
├── Parser
│   ├── Class declaration parsing
│   ├── Method/field parsing
│   ├── Expression precedence
│   └── Object literal parsing
├── Widget Analyzer
│   ├── Widget detection
│   ├── Stateful pairing
│   ├── Tree building
│   └── Prop inference
└── Runtime Safety
    ├── setState validation
    ├── Constructor validation
    ├── Lifecycle checks
    └── Anti-pattern detection

Integration Tests:
├── main.fjs → Full analysis
├── Complex widget trees
├── Circular dependencies
└── Edge cases

E2E Tests:
├── CLI workflow
├── Report generation
├── Multiple file input
└── Configuration handling
```

---

## Summary

This plan creates a **completely custom, zero-dependency analyzer** that:

1. **Tokenizes** source without relying on external parsers
2. **Parses** using hand-rolled recursive descent
3. **Analyzes** widgets and dependencies with framework-specific logic
4. **Validates** runtime safety with comprehensive checks
5. **Reports** findings in structured, actionable JSON

The modular design allows phased implementation and comprehensive testing, while the configuration system enables adaptation to framework changes.