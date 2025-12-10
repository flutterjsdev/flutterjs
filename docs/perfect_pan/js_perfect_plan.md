# FlutterJS Framework - JavaScript Section Architecture Plan

## Executive Summary

The JavaScript section of FlutterJS serves as the **rendering engine and runtime** that consumes Dart-to-JS transpiled code and produces browser-ready applications. This plan outlines how to build a modular, scalable system that analyzes converted code, manages dependencies, converts Virtual Nodes (VNodes) to HTML/CSS, and prepares the foundation for NPM package integration.

---

## Table of Contents

1. [High-Level Architecture Overview](#1-high-level-architecture-overview)
2. [Phase-by-Phase Implementation Strategy](#2-phase-by-phase-implementation-strategy)
3. [Code Analysis System](#3-code-analysis-system)
4. [Virtual Node (VNode) Conversion System](#4-virtual-node-vnode-conversion-system)
5. [Runtime Context Management](#5-runtime-context-management)
6. [NPM Package Integration Strategy](#6-npm-package-integration-strategy)
7. [Development Workflow](#7-development-workflow)
8. [Validation & Testing Strategy](#8-validation--testing-strategy)
9. [Pitfalls & Best Practices](#9-pitfalls--best-practices)
10. [Detailed Phased Rollout](#10-detailed-phased-rollout)
11. [Reference Files Usage](#11-reference-files-usage)
12. [Success Metrics](#12-success-metrics)

---

## 1. High-Level Architecture Overview

### 1.1 System Components

The JavaScript section consists of **four interconnected layers**:

```
┌─────────────────────────────────────────────────────────┐
│  USER APPLICATION LAYER                                 │
│  (test.fjs - Converted Dart Classes, Functions)        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  CODE ANALYSIS LAYER                                    │
│  ├─ AST Parser (Extract classes, methods, deps)        │
│  ├─ Dependency Analyzer (Widget tree, imports)         │
│  ├─ Type Inference (Implicit type relationships)       │
│  └─ Runtime Requirements Detector (BuildContext, etc.) │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  VIRTUAL NODE (VNODE) SYSTEM LAYER                      │
│  ├─ VNode Creation from Widget Output                  │
│  ├─ VNode Diffing (for updates)                        │
│  ├─ VNode Rendering (HTML/CSS generation)             │
│  └─ Hydration System (SSR ↔ CSR bridge)               │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  RUNTIME & OUTPUT LAYER                                 │
│  ├─ Build Context Provider                             │
│  ├─ Event System (onClick, onChange, etc.)             │
│  ├─ State Management Bridge                            │
│  ├─ Dependency Injector                                │
│  └─ Multi-Target Output (Browser HTML, Node SSR, etc.) │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
test.fjs (Transpiled Dart-to-JS)
    ↓
Code Analyzer
    ├─ Extract class definitions
    ├─ Identify widget hierarchy
    ├─ Detect dependencies (imports, external packages)
    ├─ Extract lifecycle methods (build, initState, etc.)
    └─ Generate metadata (runtime requirements)
    ↓
Metadata Output
    ├─ Widget registry
    ├─ Dependency graph
    ├─ Runtime requirements
    └─ Build configuration
    ↓
VNode Builder
    ├─ Execute widget.build() methods
    ├─ Convert Flutter-style output to VNode tree
    └─ Attach event handlers & state bindings
    ↓
Renderer (Multiple Targets)
    ├─ Browser: HTML/CSS/JS bundle
    ├─ Node.js: SSR-ready string
    ├─ Static: Pre-rendered HTML files
    └─ Development: DevTools-compatible output
    ↓
Output (HTML, CSS, JS, Manifest)
```

### 1.3 Core Responsibilities

| Layer | Responsibility | Input | Output |
|-------|----------------|-------|--------|
| **Analysis** | Parse & extract metadata | test.fjs | Widget registry, dependency graph |
| **VNode System** | Build reactive widget tree | Metadata + widget.build() | VNode tree |
| **Renderer** | Convert VNode to target format | VNode tree | HTML/CSS/JS |
| **Runtime** | Provide execution environment | HTML + JS bundle | Interactive app |

---

## 2. Phase-by-Phase Implementation Strategy

### 2.1 MVP Phase (Weeks 1-4): Foundation

**Goal:** Build the core pipeline to analyze and render a single widget correctly.

**Deliverables:**
- Code analyzer that parses test.fjs
- VNode creation system for basic widgets
- Single-target renderer (Browser HTML)
- Basic runtime context provider

**Scope:**
- Analyze **stateless widgets** only
- Handle **basic material widgets**: Text, Container, Column, Row, Button
- No state management (setState) yet
- No routing or complex navigation

**Validation:**
- Parse test.fjs without errors
- Generate HTML output that visually matches expected Flutter widget
- HTML renders correctly in browser

---

### 2.2 Phase 2 (Weeks 5-8): Stateful & Reactivity

**Goal:** Add state management and widget updates.

**Deliverables:**
- StatefulWidget analysis and state extraction
- setState system with dependency tracking
- Event handler binding (onPressed, onChange, etc.)
- Diffing algorithm for efficient updates

**Scope:**
- Support **stateful widgets**
- Implement **local state** (widget-level setState)
- Handle **lifecycle methods** (initState, dispose, didUpdateWidget)
- Event binding and callback propagation

**Validation:**
- Counter widget (increment/decrement)
- Form widget (input + submit)
- Widget update without full re-render

---

### 2.3 Phase 3 (Weeks 9-12): Advanced Features

**Goal:** Add context, global state, and multi-target rendering.

**Deliverables:**
- BuildContext system with inherited widgets
- Global state provider (Provider-like pattern)
- SSR rendering mode (Node.js string output)
- Code splitting and lazy loading

**Scope:**
- **InheritedWidget** support
- **ChangeNotifier** pattern for global state
- **SSR mode** for server-side rendering
- **Hydration** for seamless CSR ↔ SSR transition

**Validation:**
- Theme provider injection across widget tree
- Global state updates affect multiple widgets
- SSR output matches CSR HTML structure
- Hydration restores state correctly

---

### 2.4 Phase 4 (Weeks 13-16): NPM & Production

**Goal:** Integrate NPM packages and finalize production build pipeline.

**Deliverables:**
- NPM package wrapper system
- Custom resolver for @flutterjs/ packages
- Production build pipeline (minify, obfuscate, code split)
- Package manifest generation

**Scope:**
- Support **custom NPM packages** with Flutter wrappers
- **Tree-shaking** for unused widgets
- **Asset bundling** (images, fonts, CSS)
- **Performance optimization** (bundle size < 50KB)

**Validation:**
- Third-party package integration without conflicts
- Bundle size target met
- Production build fully functional

---

## 3. Code Analysis System

### 3.1 Analysis Architecture

The code analyzer is the **first critical component** that reads converted code and extracts metadata for downstream systems.

#### 3.1.1 Three-Stage Analysis Pipeline

```
Stage 1: Tokenization & Parsing
├─ Read test.fjs source code
├─ Tokenize into meaningful units
├─ Build Abstract Syntax Tree (AST)
└─ Validate syntax

Stage 2: Semantic Analysis
├─ Extract class definitions
├─ Identify inheritance chains
├─ Detect method overrides
├─ Map constructor parameters
└─ Analyze method bodies

Stage 3: Dependency & Metadata Extraction
├─ Identify imports and external dependencies
├─ Build widget hierarchy graph
├─ Extract lifecycle method references
├─ Detect runtime requirements (BuildContext, Theme, etc.)
├─ Identify state properties and their types
└─ Generate execution plan (build order, initialization)
```

### 3.2 AST Parsing Approach

**Do not rely on language-specific parsers (e.g., Babel for JSX).** Instead, build a **custom tokenizer + parser** optimized for FlutterJS syntax.

#### 3.2.1 Tokenization Strategy

**Input:** Raw JavaScript source code (test.fjs)

**Process:**
1. **Lexical Analysis**
   - Identify tokens: keywords, identifiers, operators, literals
   - Track position for error reporting
   - Preserve whitespace/comments metadata

2. **Token Classification**
   - Keywords: `class`, `function`, `extends`, `import`, `export`
   - Identifiers: class/variable/method names
   - Operators: `=`, `=>`, `?`, `.`
   - Literals: strings, numbers, template literals
   - Delimiters: `{`, `}`, `(`, `)`, `[`, `]`

3. **Context-Aware Grouping**
   - Group related tokens (e.g., `import { A, B } from 'path'`)
   - Identify block boundaries (scopes)
   - Handle nested structures (classes within classes)

#### 3.2.2 AST Construction

**AST Node Structure:**

```
{
  type: 'Program',
  body: [
    {
      type: 'ClassDeclaration',
      id: { name: 'MyButton' },
      superClass: { name: 'StatelessWidget' },
      body: [
        {
          type: 'MethodDefinition',
          key: { name: 'constructor' },
          params: [{ name: 'props', type: 'object' }],
          body: [...],
          decorators: []
        },
        {
          type: 'MethodDefinition',
          key: { name: 'build' },
          params: [{ name: 'context', type: 'BuildContext' }],
          body: [...],
          returnType: 'Widget'
        }
      ]
    }
  ]
}
```

**Key Advantages:**
- **Language-agnostic**: Not tied to JSX or TypeScript features
- **Extensible**: Easy to add Flutter-specific syntax later
- **Optimized**: Only parse features relevant to FlutterJS
- **Debuggable**: Clear node types for error messages

#### 3.2.3 Parsing Without External Libraries

**Recommended Approach: Recursive Descent Parser**

```
Parser Structure:
├─ parseProgram()
│  └─ Loop through statements until EOF
│
├─ parseStatement()
│  ├─ parseImport()
│  ├─ parseExport()
│  ├─ parseClassDeclaration()
│  ├─ parseFunctionDeclaration()
│  └─ parseVariableDeclaration()
│
├─ parseClassDeclaration()
│  ├─ Capture class name & superclass
│  ├─ Parse class body
│  │  ├─ parseConstructor()
│  │  ├─ parseMethod()
│  │  └─ parseProperty()
│  └─ Return AST node
│
├─ parseExpression()
│  ├─ parseAssignment()
│  ├─ parseTernary()
│  ├─ parseLogicalOr()
│  └─ ... (precedence hierarchy)
│
└─ Utility Functions
   ├─ peek() - Look at current token
   ├─ consume() - Accept and move to next
   ├─ match() - Check if current matches pattern
   └─ error() - Report parsing error
```

**Why This Approach:**
- **No external dependencies**: Lighter, faster execution
- **Full control**: Can customize error messages, optimization
- **Educational**: Easy to maintain and extend
- **Performance**: Streaming parser (no full AST required upfront)

### 3.3 Semantic Analysis: Extracting Metadata

Once AST is built, extract meaningful information:

#### 3.3.1 Widget Registry Construction

**Purpose:** Create a catalog of all widget classes and their properties.

**Information Extracted:**
- **Class Identity**: Name, superclass (StatelessWidget, StatefulWidget, State)
- **Constructor Signature**: Parameter names, types, defaults
- **Methods**: build(), initState(), dispose(), didUpdateWidget()
- **Properties**: State variables, fields
- **Decorators**: Custom metadata (@immutable, @deprecated)

**Output Structure:**
```
WidgetRegistry = {
  'MyButton': {
    type: 'StatelessWidget',
    constructor: {
      params: [
        { name: 'key', type: 'Key', optional: true },
        { name: 'onPressed', type: 'Function', required: true },
        { name: 'child', type: 'Widget', required: true }
      ]
    },
    methods: {
      'build': {
        params: ['context'],
        returnType: 'Widget',
        body: [/* AST nodes */]
      }
    },
    imports: ['@flutterjs/material', '@flutterjs/core']
  },
  'MyApp': { ... }
}
```

#### 3.3.2 Dependency Graph Construction

**Purpose:** Map which widgets depend on which others, and which external packages are needed.

**Information Tracked:**
1. **Widget Dependencies**
   - MyButton uses Text, Container (child widgets)
   - HomePage uses MyButton, AppBar

2. **Package Dependencies**
   - Imports from @flutterjs/material
   - Imports from @flutterjs/core
   - External NPM packages

3. **Type Dependencies**
   - BuildContext required for build()
   - ThemeData accessed via Theme.of()
   - MediaQuery for responsive layout

**Output:** Directed graph representing dependency relationships

```
MyApp → [MaterialApp, HomePage]
HomePage → [Scaffold, AppBar, MyButton, ElevatedButton]
MyButton → [Container, Text, GestureDetector]

External Dependencies:
├─ @flutterjs/material (Container, Text, ElevatedButton)
├─ @flutterjs/core (Widget, BuildContext, State)
└─ @flutterjs/icons (Icon)
```

#### 3.3.3 Runtime Requirements Detection

**Purpose:** Identify what runtime infrastructure must be available when executing code.

**Detection Strategy:**

1. **Scan for BuildContext Usage**
   - Calls to `Theme.of(context)` → Need theme provider
   - Calls to `MediaQuery.of(context)` → Need media query provider
   - Calls to `Navigator.of(context)` → Need router

2. **Detect State Management Patterns**
   - `this.setState()` calls → Need setState implementation
   - `ChangeNotifier` usage → Need listener system
   - `InheritedWidget.of()` → Need context injection

3. **Identify Async Operations**
   - `async`/`await` → Need promise handling
   - `Future` references → Need async bridging
   - API calls → May need interceptors

4. **Detect Navigation Requirements**
   - `Navigator.push()` → Need routing system
   - Route names referenced → Need route definitions
   - Page transitions → May need animation support

**Output: Runtime Requirements Manifest**

```json
{
  "requiresThemeProvider": true,
  "requiresMediaQuery": true,
  "requiresNavigator": false,
  "stateManagement": "local",
  "asyncOperations": false,
  "requiredRuntimes": [
    "@flutterjs/core",
    "@flutterjs/material",
    "@flutterjs/theme"
  ]
}
```

### 3.4 Code Analysis Output Structure

The analyzer produces a **comprehensive metadata package**:

```
AnalysisResult = {
  // Source information
  source: 'test.fjs',
  timestamp: '2025-12-10T...',
  
  // AST and parsing
  ast: {...},
  parseErrors: [],
  
  // Extracted metadata
  widgets: WidgetRegistry,
  classes: { ... all classes },
  functions: { ... all top-level functions },
  
  // Dependency information
  dependencyGraph: {...},
  externalDependencies: [
    '@flutterjs/material',
    '@flutterjs/core'
  ],
  
  // Runtime requirements
  runtimeRequirements: {...},
  
  // Execution plan
  executionPlan: {
    initializationOrder: ['Material App', 'HomePage', ...],
    rootWidget: 'MyApp',
    buildOrder: [...]
  },
  
  // Quality metrics
  metrics: {
    totalClasses: 5,
    totalMethods: 12,
    externalDependencies: 2,
    complexity: 'medium'
  }
}
```

### 3.5 Error Handling & Validation

**Analyzer should robustly handle:**

1. **Syntax Errors**
   - Missing braces, parentheses
   - Invalid class definitions
   - Report with line number and context

2. **Semantic Errors**
   - Undefined classes or methods
   - Type mismatches (if doing type checking)
   - Missing required parameters

3. **Runtime Errors**
   - Circular dependencies
   - Missing packages
   - Incompatible widget versions

**Strategy:** Three-tier error reporting
- **Errors**: Stop processing (invalid syntax)
- **Warnings**: Continue but flag issues (missing dependencies)
- **Info**: Suggestions for optimization

---

## 4. Virtual Node (VNode) System

### 4.1 VNode Architecture & Purpose

VNodes are **lightweight JavaScript objects** representing DOM elements. They serve as an intermediary between Flutter-style widget code and actual HTML/CSS output.

#### 4.1.1 VNode Structure

```
VNode = {
  // Identity & Type
  tag: 'div',                    // HTML tag or custom widget
  key: 'unique-key-123',         // For reconciliation in lists
  type: 'element' | 'component' | 'text',
  
  // Properties & Styling
  props: {
    className: 'button-primary',
    id: 'my-button',
    'data-testid': 'submit-btn',
    'data-widget': 'ElevatedButton'
  },
  style: {
    backgroundColor: '#6750a4',
    padding: '12px 24px',
    borderRadius: '4px'
  },
  
  // Children (nested VNodes)
  children: [
    { tag: 'span', children: ['Click me'] }
  ],
  
  // Event Handlers
  events: {
    click: (event) => { ... },
    mouseenter: (event) => { ... }
  },
  
  // Metadata for rendering
  ref: null,                     // DOM reference after rendering
  renderAsString: false,         // For SSR
  
  // State & Reactivity
  statefulWidgetId: 'counter-123',  // Link to state manager
  stateUpdateFn: () => {...}        // Callback for setState
}
```

#### 4.1.2 Why VNodes Over Direct HTML?

| Aspect | Direct HTML | VNodes |
|--------|-------------|--------|
| **Creation** | Slow (DOM API) | Fast (JS objects) |
| **Diffing** | N/A | Efficient comparison |
| **Updates** | Full re-render | Partial/surgical updates |
| **SSR** | Requires template | String serialization easy |
| **CSR** | Direct manipulation | Abstracted from DOM |
| **Testing** | Difficult | Simple comparison |

### 4.2 VNode Creation Process

#### 4.2.1 From Widget to VNode

**Flow:**

```
Widget.build(context)
    ↓
Returns: Container, Text, ElevatedButton, etc.
    ↓
VNode Builder intercepts
    ↓
Converts to VNode:
    - Extracts visual properties (style, className)
    - Converts event handlers (onPressed → click)
    - Processes children recursively
    - Attaches metadata (stateful widget ID, etc.)
    ↓
Returns: VNode tree
```

#### 4.2.2 Conversion Rules: Flutter → VNode

**Stateless Widgets:**

```
Input: Text('Hello')
Output: {
  tag: 'span',
  props: { className: 'fjs-text' },
  children: ['Hello']
}

Input: Icon(Icons.settings)
Output: {
  tag: 'svg',
  props: {
    className: 'fjs-icon fjs-icon-settings',
    viewBox: '0 0 24 24'
  },
  children: [/* SVG paths */]
}
```

**Layout Widgets:**

```
Input: Container({
  padding: EdgeInsets.all(16),
  backgroundColor: Colors.blue,
  child: Text('Hello')
})

Output: {
  tag: 'div',
  props: {
    className: 'fjs-container'
  },
  style: {
    padding: '16px',
    backgroundColor: '#2196F3'
  },
  children: [
    { tag: 'span', children: ['Hello'] }
  ]
}
```

**Interactive Widgets:**

```
Input: ElevatedButton({
  onPressed: () => { ... },
  child: Text('Click')
})

Output: {
  tag: 'button',
  props: {
    className: 'fjs-elevated-button',
    type: 'button'
  },
  events: {
    click: (e) => { ... }
  },
  children: [
    { tag: 'span', children: ['Click'] }
  ]
}
```

### 4.3 VNode Rendering (Creation & Serialization)

#### 4.3.1 Browser Rendering (CSR)

**VNode → DOM Element**

```
Process:
1. Traverse VNode tree (depth-first)
2. For each VNode:
   - Create DOM element (document.createElement)
   - Apply props (className, id, data-*)
   - Apply styles (element.style or inline)
   - Attach event listeners (addEventListener)
   - Recursively render children
   - Cache reference (vnode.ref)
3. Return root DOM element
4. Mount to container (appendChild)
```

**Key Optimizations:**
- **DocumentFragment**: Batch DOM operations
- **Event Delegation**: Attach listeners at root, not each element
- **Virtual Scroll**: Only render visible items (large lists)

#### 4.3.2 String Rendering (SSR)

**VNode → HTML String**

```
Process:
1. Traverse VNode tree (depth-first)
2. For each VNode:
   - Serialize opening tag: <div className="..." style="...">
   - Serialize children (text + recursive)
   - Serialize closing tag: </div>
   - Skip event listeners (attach on client)
3. Concatenate all strings
4. Return complete HTML document
```

**Key Optimizations:**
- **Template literals**: Efficient string building
- **No event handlers**: Clients don't need them yet
- **Critical CSS inlining**: Speed up initial render

#### 4.3.3 Dual-Mode Rendering Detection

**Strategy:** Analyze execution environment

```
Rendering Mode Selection:
├─ Browser (client-side)
│  └─ Use DOM API (CSR rendering)
├─ Node.js (server-side)
│  └─ Use string concatenation (SSR rendering)
└─ Hybrid
   ├─ Initial HTML on server
   └─ Hydration on client
```

### 4.4 VNode Diffing & Reconciliation

#### 4.4.1 Diffing Algorithm

**Purpose:** Minimize DOM updates by comparing old and new VNode trees.

**Algorithm: Simple Diff**

```
diff(oldVNode, newVNode):
  1. Check if nodes have same tag
     ├─ Different tag → REPLACE
     └─ Same tag → continue
  
  2. Check if properties changed
     ├─ Compare className, id, data-* attributes
     ├─ Compare style properties
     └─ Build property patch list
  
  3. Check if event handlers changed
     ├─ Remove old listeners
     └─ Attach new listeners
  
  4. Recursively diff children
     ├─ Compare by key if present
     ├─ Fallback to position-based matching
     └─ Detect insertions, deletions, moves
  
  5. Return patch list
```

#### 4.4.2 Patch Application

**Patch Types:**

```
PatchType = {
  REPLACE: 'replace node',
  UPDATE_PROPS: 'update attributes',
  UPDATE_STYLE: 'update inline styles',
  UPDATE_EVENTS: 'update event listeners',
  INSERT_CHILD: 'add child',
  REMOVE_CHILD: 'delete child',
  MOVE_CHILD: 'reorder child'
}

Example Patches:
[
  { type: 'UPDATE_PROPS', path: '[0].props.className', value: 'new-class' },
  { type: 'UPDATE_STYLE', path: '[0].style.color', value: '#ff0000' },
  { type: 'INSERT_CHILD', path: '[1]', node: newVNode },
  { type: 'REMOVE_CHILD', path: '[2]' }
]
```

**Application Process:**

```
applyPatches(domRoot, patches):
  1. For each patch:
     - Resolve DOM element by path
     - Apply mutation (update attribute, add child, etc.)
     - Update cached VNode reference
  
  2. Batch updates using:
     - DocumentFragment for insertions
     - requestAnimationFrame for smooth updates
  
  3. Trigger CSS transitions if applicable
```

### 4.5 VNode Hydration (SSR ↔ CSR Bridge)

#### 4.5.1 Hydration Process

**Problem:** Server renders HTML, client needs to attach JavaScript without re-rendering.

**Solution: Hydration**

```
Server (Node.js):
1. Parse widget code
2. Execute widget.build()
3. Create VNode tree
4. Serialize to HTML string
5. Generate hydration metadata
6. Send to browser

Client (Browser):
1. Receive HTML + metadata
2. Recreate VNode tree from metadata
3. Match existing DOM to VNode
4. Attach event listeners
5. Initialize state
6. Ready for interaction
```

#### 4.5.2 Hydration Metadata

**Server sends with HTML:**

```json
{
  "version": "1.0",
  "widgets": {
    "root": {
      "id": "app-root",
      "type": "MyApp",
      "statefulWidgets": {
        "counter-123": {
          "widgetType": "Counter",
          "initialState": { "count": 0 },
          "stateProperties": ["count"]
        }
      },
      "eventHandlers": {
        "btn-increment": "onClick"
      }
    }
  },
  "routes": {
    "current": "/",
    "history": []
  }
}
```

**Client uses metadata to:**
- Locate stateful widgets in DOM
- Restore state objects
- Attach event listener callbacks
- Initialize router state

---

## 5. Runtime Context Management

### 5.1 BuildContext System

#### 5.1.1 Purpose

BuildContext is Flutter's mechanism for widgets to access framework services (theme, navigation, media query, etc.). The JS implementation must provide equivalent functionality.

#### 5.1.2 Context Architecture

```
BuildContext {
  // Access to ancestor widgets
  findAncestorWidgetOfExactType(Type)
  findAncestorStateOfType(Type)
  
  // Access to framework services
  theme()              → Theme data
  mediaQuery()         → Screen size, orientation
  navigator()          → Routing & navigation
  scoped()             → Get scoped values
  
  // Dependency injection
  inheritedWidgets     → Map of InheritedWidget values
  
  // Metadata
  widget               → Current widget reference
  state                → Current state reference
  mounted              → Boolean: is widget active?
}
```

#### 5.1.3 Context Provider Hierarchy

```
Root (App Container)
├─ MaterialApp Context
│  ├─ Theme Provider
│  ├─ Navigator Provider
│  ├─ MediaQuery Provider
│  └─ Localization Provider
│
├─ Page 1 Context
│  ├─ Inherited Theme
│  ├─ Inherited Navigator
│  └─ Custom Scoped Values
│
└─ Page 2 Context
   └─ ...
```

**Key Principle:** Contexts are **hierarchical**. Child widgets inherit from parents.

### 5.2 Dependency Injection System

#### 5.2.1 Service Registration

**Services** are framework utilities (Theme, Router, MediaQuery) that widgets access via BuildContext.

**Registration Strategy:**

```
During initialization:
1. Create service instances (Theme, Router, MediaQuery)
2. Register in DI container
3. Wrap app root with context providers
4. Make available to all widgets via context.service()

Services to provide:
├─ Theme (Material Design tokens)
├─ Navigator (routing & history)
├─ MediaQuery (responsive info)
├─ LocalizationDelegate (i18n)
├─ ModalRoute (dialog/modal handling)
└─ Custom services (user-defined)
```

#### 5.2.2 Service Access Pattern

**From Widget:**

```javascript
// Theme.of(context) pattern
class MyButton extends StatelessWidget {
  build(context) {
    const theme = context.theme();
    return Container({
      backgroundColor: theme.primaryColor,
      child: Text('Click me')
    });
  }
}

// Custom service pattern
const myService = context.scoped('myService');
```

### 5.3 State Management Bridge

#### 5.3.1 setState Integration

**Challenge:** JavaScript doesn't have Flutter's `setState` magic. Must simulate:

```
Flutter behavior:
this.setState(() {
  this._count++;  // State updated synchronously
  // Widget automatically rebuilds
});

JavaScript simulation:
this.setState({ count: this.state.count + 1 });
// Internally:
//   1. Update state object
//   2. Mark widget as dirty
//   3. Schedule rebuild
//   4. Execute build() again
//   5. Diff & update DOM
```

#### 5.3.2 State Reactivity Tracking

**System must track:**

1. **Which variables are state?**
   - Analyze constructor: `this.state = { ... }`
   - Track in widget registry

2. **When state changes?**
   - Intercept setState calls
   - Schedule rebuild

3. **What depends on this state?**
   - Build dependency graph
   - Rebuild only affected widgets

4. **Update efficiently?**
   - Don't re-render entire tree
   - Use VNode diffing
   - Update only changed DOM nodes

#### 5.3.3 State Management Patterns

**Local State (setState):**
- Per-widget state
- Managed by State class
- Triggers widget rebuild

**Global State (Provider pattern):**
- Shared across widgets
- ChangeNotifier pattern
- Listeners subscribe & rebuild

**Context-based State (InheritedWidget):**
- Passed down tree
- No drilling through intermediate widgets
- Automatic propagation

### 5.4 Lifecycle Management

#### 5.4.1 Widget Lifecycle

```
Widget Lifecycle:
1. Constructor → Object created
2. createElement() → Element instance created
3. mount() → Added to tree
4. initState() [StatefulWidget only]
5. build() → Build widget tree
6. didUpdateWidget() [if parent props change]
7. setState() → Trigger rebuild
8. deactivate() → Removed from tree (temporary)
9. dispose() → Cleanup & removal

Hooks to implement:
├─ initState(): Initialize state, setup listeners
├─ didUpdateWidget(oldWidget): Handle parent prop changes
├─ didChangeDependencies(): React to inherited widget changes
├─ build(context): Create widget tree
└─ dispose(): Clean up (listeners, timers, etc.)
```

#### 5.4.2 Lifecycle Enforcement

**Analyzer must detect:**
- Lifecycle method definitions
- When they're called
- Proper cleanup (dispose pairs with initState)

**Runtime must enforce:**
- Execute in correct order
- Error if lifecycle methods called out of sequence
- Warn on missing cleanup

---

## 6. NPM Package Integration Strategy

### 6.1 Package Resolution System

#### 6.1.1 Three-Tier Package Resolution

```
Package Resolution Hierarchy:

Tier 1: @flutterjs/* Built-in Packages
├─ @flutterjs/core
├─ @flutterjs/material
├─ @flutterjs/icons
└─ @flutterjs/cupertino

Tier 2: Official Wrapped Packages
├─ @flutterjs/http (wrapped: npm:axios)
├─ @flutterjs/shared-preferences (wrapped: npm:store.js)
├─ @flutterjs/firebase (wrapped: npm:firebase)
└─ @flutterjs/provider (wrapped: npm:zustand)

Tier 3: Community / Custom Packages
├─ @user/my-component
├─ @org/custom-widget
└─ Any standard NPM package
```

**Resolution Order:**
1. Check if imported package is built-in (@flutterjs/*)
2. Check if official wrapper exists
3. Fallback to direct NPM import

#### 6.1.2 Custom Wrapper System

**Problem:** Direct NPM packages aren't Flutter-aware. Wrappers adapt them.

**Wrapper Pattern:**

```
Example: @flutterjs/http (wraps axios)

File: packages/http/index.js
export class Client {
  static get(url) {
    // Wraps axios.get()
    // Returns Future<Response>
  }
  
  static post(url, body) {
    // Wraps axios.post()
  }
}

Usage in app:
import { Client } from '@flutterjs/http';

class MyWidget extends StatefulWidget {
  async fetchData() {
    const response = await Client.get('/api/data');
    // Returns Flutter-style Response
  }
}
```

**Wrapper Responsibilities:**
- Transform NPM API → Flutter-like API
- Handle errors Flutter-style
- Return Futures instead of Promises (in concept)
- Provide type info for analyzer

### 6.2 Dependency Resolution at Build Time

#### 6.2.1 Build-Time Analysis

**When building (flutterjs build):**

```
1. Code analyzer identifies all imports
2. Categorize imports:
   ├─ Built-in (@flutterjs/*)
   ├─ Wrapped official packages
   ├─ Direct NPM packages
   └─ Local modules
3. Check package.json for versions
4. Validate compatibility
5. Generate resolution map
```

**Resolution Map Output:**

```json
{
  "resolutions": {
    "@flutterjs/material": {
      "type": "builtin",
      "version": "1.0.0",
      "path": "./packages/material"
    },
    "@flutterjs/http": {
      "type": "wrapped",
      "version": "1.2.0",
      "wraps": "axios@^0.27.0",
      "path": "./packages/http"
    },
    "lodash": {
      "type": "direct-npm",
      "version": "^4.17.21",
      "external": true
    }
  }
}
```

#### 6.2.2 Package Tree Generation

**Create dependency tree for:**
- Code splitting (which chunks need which packages)
- Tree-shaking (which exports are used)
- Bundle size analysis (weight of each package)

```
Package Tree:
MyApp
├─ @flutterjs/material (30KB)
│  ├─ @flutterjs/core (12KB)
│  └─ @flutterjs/icons (8KB)
├─ @flutterjs/http (3KB)
│  └─ axios (external, 13KB)
└─ @flutterjs/provider (5KB)
   └─ zustand (external, 4KB)

Total: ~75KB (unminified)
```

### 6.3 Custom Package Creation Guide

#### 6.3.1 Package Structure

```
my-flutter-package/
├─ package.json
│  {
│    "name": "@myorg/my-component",
│    "version": "1.0.0",
│    "flutterjs": {
│      "wrapper": true,
│      "targets": ["material", "cupertino"],
│      "exports": ["MyComponent", "MyTheme"]
│    }
│  }
├─ lib/
│  ├─ index.js          # Main export
│  ├─ MyComponent.js    # Flutter-style widget
│  └─ MyTheme.js        # Theme provider
├─ example/
│  └─ main.fjs          # Usage example
└─ README.md
```

#### 6.3.2 Package Metadata

**flutterjs field in package.json:**

```json
{
  "flutterjs": {
    "wrapper": false,                    // true if wraps npm pkg
    "wraps": "original-npm-package",     // if wrapper=true
    "targets": ["material", "cupertino"],// Design systems supported
    "version": "1.0",
    "exports": {
      "MyComponent": "./lib/MyComponent.js",
      "MyTheme": "./lib/MyTheme.js"
    },
    "dependencies": {
      "@flutterjs/core": "^1.0.0",
      "@flutterjs/material": "^1.0.0"
    },
    "peerDependencies": {
      "@flutterjs/core": "^1.0.0"
    }
  }
}
```

### 6.4 Package Validation & Compatibility

#### 6.4.1 Validation Checklist

Before using a package, verify:

```
1. Package Metadata
   ├─ Has valid package.json
   ├─ "flutterjs" field present
   └─ Version is compatible

2. Export Compatibility
   ├─ All exports are Flutter-style widgets
   ├─ No conflicting names
   └─ Clear documentation

3. Dependency Compatibility
   ├─ Required @flutterjs packages available
   ├─ No version conflicts
   └─ No circular dependencies

4. API Surface
   ├─ No browser-only APIs (in SSR mode)
   ├─ No Node.js-only APIs (in CSR mode)
   └─ Async handling is Dart-like (Futures)
```

#### 6.4.2 Conflict Resolution

**When packages conflict:**

```
Scenario: Two packages export same widget name
Imports:
├─ @org/buttons exports ElevatedButton
└─ @other/buttons exports ElevatedButton

Solution:
import { ElevatedButton as OrgButton } from '@org/buttons';
import { ElevatedButton as OtherButton } from '@other/buttons';

Build system detects & warns:
"⚠️  Ambiguous export: 'ElevatedButton' from 2 packages.
    Using @org/buttons by default.
    To use other, import as: import { ElevatedButton as OtherButton }"
```

---

## 7. Development Workflow

### 7.1 Development Server Architecture

#### 7.1.1 Dev Server Responsibilities

```
Dev Server Pipeline:

User runs: flutterjs dev
    ↓
1. Code Analysis
   └─ Parse test.fjs → Extract metadata
   
2. Module Watching
   └─ Watch for file changes
   
3. Hot Module Reload (HMR)
   ├─ Detect changed files
   ├─ Re-analyze if needed
   └─ Push changes to browser via WebSocket
   
4. Development Server (HTTP)
   ├─ Serve HTML with injected scripts
   ├─ Inject HMR client
   ├─ Handle API requests
   └─ Serve static assets
   
5. Browser
   ├─ Load HTML
   ├─ Connect to HMR WebSocket
   ├─ Receive updates
   └─ Hot reload without full refresh
```

#### 7.1.2 HMR (Hot Module Reload)

**Goal:** Update code in browser without full page reload.

**How it works:**

```
1. Developer changes a widget's build() method
2. File watcher detects change
3. Dev server:
   - Re-analyzes code
   - Detects affected widgets
   - Sends update to browser via WebSocket
4. Browser HMR client:
   - Receives update
   - Re-executes build() for affected widgets
   - Runs diffing algorithm
   - Updates DOM (only what changed)
   - Preserves state & scroll position
5. Developer sees instant result
```

**What persists during HMR:**
- Component state (setState values)
- Routing state (current page/route)
- Scroll position
- Open modals/dialogs

**What resets:**
- Timer-based state
- External API calls
- Event listeners (attached)

### 7.2 Debugging & Inspection Tools

#### 7.2.1 DevTools-Compatible Output

**Support inspecting:**

```
1. Widget Tree Inspector
   └─ Show hierarchy of widgets in app
   └─ Click to inspect widget properties

2. State Inspector
   └─ View state of each StatefulWidget
   └─ See state change history

3. Performance Profiler
   └─ Widget build times
   └─ VNode diffing time
   └─ DOM update time

4. Event Tracing
   └─ See which events fired
   └─ Trace which widgets received events

5. Error Boundaries
   └─ Catch errors at widget level
   └─ Show error overlay in dev mode
```

#### 7.2.2 Error Reporting

**When errors occur:**

```
Error Overlay Display:
┌─────────────────────────────────┐
│ Build Error in HomePage         │
├─────────────────────────────────┤
│ TypeError: Cannot read           │
│ property 'items' of undefined    │
│                                 │
│ File: lib/pages/HomePage.dart   │
│ Line: 42, Column: 18            │
│                                 │
│ Stack Trace:                    │
│ HomePage.build()                │
│   → Column.build()              │
│   → ListView.build()            │
│                                 │
│ [Dismiss] [Show Sources]        │
└─────────────────────────────────┘

Includes:
- Clear error message
- File and line number
- Widget tree at error point
- Suggested fixes
- Link to source code
```

---

## 8. Validation & Testing Strategy

### 8.1 Analysis Validation

#### 8.1.1 Test Cases for Analyzer

**Test the analyzer against:**

1. **Simple Widgets**
   ```javascript
   // test.fjs snippet
   class SimpleText extends StatelessWidget {
     build(context) {
       return Text('Hello');
     }
   }
   ```
   - Verify: Parses correctly, extracts class, identifies build method

2. **Complex Hierarchies**
   ```javascript
   class HomePage extends StatefulWidget {
     createState() {
       return new _HomePageState();
     }
   }
   
   class _HomePageState extends State {
     initState() { ... }
     build(context) { ... }
   }
   ```
   - Verify: Links State to StatefulWidget, detects lifecycle

3. **External Dependencies**
   ```javascript
   import { ElevatedButton, Text } from '@flutterjs/material';
   import { Client } from '@flutterjs/http';
   ```
   - Verify: Extracts imports, builds dependency list

4. **Error Cases**
   - Missing build() method
   - Invalid class syntax
   - Circular imports

#### 8.1.2 Analyzer Output Verification

**Validate analysis metadata:**

```
CheckListof Analysis Correctness:
├─ Widget registry completeness
│  └─ All classes found? All methods found?
├─ Dependency accuracy
│  └─ Import paths correct? External deps found?
├─ Runtime requirements
│  └─ BuildContext uses detected? Lifecycle identified?
├─ Error reporting
│  └─ Line numbers accurate? Messages clear?
└─ Performance
   └─ Parse time < 1s? Memory usage reasonable?
```

### 8.2 VNode System Validation

#### 8.2.1 VNode Creation Tests

**Test scenarios:**

```
Test Suite: VNode Creation

1. Simple Text Widget
   Input: Text('Hello')
   Expected: { tag: 'span', children: ['Hello'], ... }
   Verify: Tag, children, props

2. Layout Widget
   Input: Container({ padding: EdgeInsets.all(16), child: Text('Hi') })
   Expected: { tag: 'div', style: { padding: '16px' }, children: [...] }
   Verify: Nesting, style application

3. Interactive Widget
   Input: ElevatedButton({ onPressed: () => {...}, child: Text('Click') })
   Expected: { tag: 'button', events: { click: fn }, children: [...] }
   Verify: Event handler attachment

4. Complex Tree
   Input: Scaffold({ appBar: AppBar(...), body: Column([...]) })
   Expected: Nested VNode tree matching structure
   Verify: Recursive conversion, proper nesting
```

#### 8.2.2 VNode Rendering Tests

**Test both modes:**

```
CSR (Browser):
1. Create VNode tree
2. Render to DOM (document.createElement)
3. Inspect: element.classList, element.style, listeners attached?
4. Verify: Visual appearance matches Flutter widget

SSR (Server):
1. Create VNode tree
2. Render to HTML string
3. Verify: Valid HTML, all props serialized, no event handlers
4. Send to browser, hydrate, verify CSR version matches
```

#### 8.2.3 Diffing Tests

**Test reconciliation:**

```
Scenario: State change triggers rebuild
1. Initial state: count = 0
2. User clicks button
3. setState({ count: 1 })
4. Widget rebuilds
5. VNode tree changes
6. Diff old vs new VNode
7. Apply patches to DOM
8. Verify: Only text node updated, no full re-render

Metrics:
├─ Patch count: Should be minimal (1-2 for state changes)
├─ DOM mutations: Only affected nodes updated
├─ Re-renders: Count reductions for performance
└─ Correctness: Output still renders correctly
```

### 8.3 Runtime Integration Tests

#### 8.3.1 E2E Tests

**Full workflow tests:**

```
Test Suite: End-to-End

1. Counter App
   - Load app
   - Click increment button
   - Verify count incremented
   - Click decrement button
   - Verify count decremented
   - Refresh page, verify state persisted (if needed)

2. Form Widget
   - Enter text in TextField
   - Click submit
   - Verify onSubmit callback fired
   - Show success message

3. Navigation
   - Load home page
   - Navigate to detail page
   - Go back
   - Verify correct page shown
   - Verify state preserved

4. Theming
   - Load app with light theme
   - Change to dark theme
   - Verify colors updated
   - Verify persisted across navigation
```

#### 8.3.2 Performance Tests

**Benchmark critical paths:**

```
Metrics to Track:

1. Initial Load
   ├─ HTML download time
   ├─ JS parse time
   ├─ Widget tree build time
   └─ First Paint (should be < 2s)

2. State Updates
   ├─ setState execution time
   ├─ Diffing time
   ├─ DOM update time
   └─ Frame rate (should be 60 FPS)

3. Navigation
   ├─ Route change time
   ├─ Widget unmount time
   ├─ New widget mount time
   └─ Perceived responsiveness

Targets:
├─ Parse app code: < 500ms
├─ Initial render: < 1s
├─ setState: < 16ms (for 60 FPS)
├─ Bundle size: < 50KB (core + material)
└─ Memory footprint: < 10MB
```

### 8.4 Browser Compatibility

#### 8.4.1 Target Browsers

```
Support matrix:
├─ Chrome/Edge 90+
├─ Firefox 88+
├─ Safari 14+
├─ Mobile browsers (iOS Safari 14+, Chrome Android)
└─ Fallback for older browsers (graceful degradation)

Features to verify:
├─ ES6+ syntax (if transpiling, what version?)
├─ CSS Grid/Flexbox
├─ RequestAnimationFrame
├─ WeakMap (for caching)
├─ Symbol (for private properties)
├─ Proxy (for state reactivity)
└─ Promise/async-await
```

---

## 9. Pitfalls & Best Practices

### 9.1 Common Pitfalls to Avoid

#### 9.1.1 Analysis Phase Pitfalls

| Pitfall | Impact | Mitigation |
|---------|--------|-----------|
| **Over-parsing** | Slow startup, memory bloat | Parse only necessary nodes, use streaming |
| **AST complexity** | Hard to maintain, extend | Keep AST simple, add metadata separately |
| **Circular imports** | Infinite loops | Detect cycles early, report error |
| **Missing error reporting** | Silent failures, confusion | Always report with line/column info |
| **Type inference errors** | Incorrect metadata, runtime bugs | Skip complex typing, focus on structure |

#### 9.1.2 VNode System Pitfalls

| Pitfall | Impact | Mitigation |
|---------|--------|-----------|
| **Inefficient diffing** | Slow updates, jank | Use keys for lists, implement smart diffing |
| **Memory leaks** | Growing memory over time | Cleanup event listeners, cached refs |
| **Over-rendering** | High CPU, battery drain | Only diff changed subtrees |
| **SSR/CSR mismatch** | Hydration errors | Serialize & verify state exactly |
| **Event delegation issues** | Events not firing, conflicts | Use event capturing, avoid bubbling conflicts |

#### 9.1.3 Runtime Integration Pitfalls

| Pitfall | Impact | Mitigation |
|---------|--------|-----------|
| **Context pollution** | Widgets accessing wrong services | Use scoped providers, clear separation |
| **State race conditions** | Inconsistent state, bugs | Use locking, serialize state changes |
| **Memory leaks in HMR** | Growing memory in dev mode | Cleanup old modules, refs before reload |
| **Package version conflicts** | Broken dependencies | Lock versions, test compatibility |
| **Missing cleanup** | Listeners pile up, memory leaks | Enforce dispose pattern, warnings |

### 9.2 Best Practices

#### 9.2.1 Code Organization

**Structure:**

```
flutterjs-framework/
├─ analyzer/
│  ├─ tokenizer.js
│  ├─ parser.js
│  ├─ semantic-analyzer.js
│  └─ metadata-extractor.js
├─ vnode/
│  ├─ vnode.js
│  ├─ builder.js
│  ├─ renderer.js
│  └─ differ.js
├─ runtime/
│  ├─ context.js
│  ├─ state-manager.js
│  ├─ event-system.js
│  └─ lifecycle.js
├─ builder/
│  ├─ webpack-config.js
│  ├─ optimizer.js
│  └─ output-generator.js
└─ tests/
   ├─ analyzer.test.js
   ├─ vnode.test.js
   └─ e2e.test.js
```

**Principles:**
- **Single Responsibility**: Each file has one purpose
- **Clear Boundaries**: Modules have clear inputs/outputs
- **Minimal Dependencies**: Between-module coupling minimized
- **Testability**: Each component independently testable

#### 9.2.2 Error Handling

**All components should:**

```
1. Validate inputs
   └─ Type check, null check, range check

2. Report errors clearly
   ├─ Line number (if applicable)
   ├─ Context (which widget, which file)
   ├─ Actionable message (how to fix)
   └─ Stack trace (for debugging)

3. Fail gracefully
   ├─ Don't crash entire app
   ├─ Isolate errors to component
   ├─ Provide fallback if possible
   └─ Offer recovery mechanism

4. Log appropriately
   ├─ Errors: Critical issues
   ├─ Warnings: Suboptimal patterns
   ├─ Info: Milestones, progress
   └─ Debug: Detailed traces (dev mode only)
```

#### 9.2.3 Performance Guidelines

**Analyzer:**
- Parse code incrementally (don't load entire file into memory)
- Cache metadata (don't re-analyze unchanged files)
- Use lazy evaluation (only compute when needed)

**VNode System:**
- Minimize diff operations (batch updates)
- Use object pooling for temporary VNode objects
- Implement virtual scrolling for long lists

**Runtime:**
- Lazy-load packages (code splitting)
- Debounce/throttle frequent updates
- Use WeakMap for caching to avoid memory leaks

#### 9.2.4 Testing Philosophy

```
Testing Pyramid:

        △ E2E Tests (5%)
       / \
      /   \ Integration Tests (15%)
     /     \
    /       \ Unit Tests (80%)
   /_________\

Principle: Many fast, cheap tests at bottom; fewer slow tests at top
```

**Test Coverage Goals:**
- **Unit tests**: 80%+ of critical code (analyzer, differ, renderer)
- **Integration tests**: 30%+ (analyzer → vnode → renderer)
- **E2E tests**: 10%+ (full workflows: counter, form, navigation)

---

## 10. Detailed Phased Rollout

### 10.1 Phase 1: MVP (Weeks 1-4)

#### Objectives
- Establish core architecture
- Build working analyzer for simple widgets
- Render basic VNode tree to HTML
- Verify with test.fjs

#### Deliverables

**Week 1: Analysis Foundation**
- [ ] Tokenizer implementation
- [ ] Simple recursive descent parser
- [ ] Basic AST generation
- [ ] Widget registry extraction
- [ ] Test: Parse simple widget classes

**Week 2: Semantic Analysis**
- [ ] Dependency graph builder
- [ ] Import extraction
- [ ] Lifecycle method detection
- [ ] Runtime requirements detector
- [ ] Test: Analyze test.fjs successfully

**Week 3: VNode System**
- [ ] VNode data structure
- [ ] VNode builder from widget output
- [ ] HTML renderer (serialize to string)
- [ ] Basic styling support
- [ ] Test: Render Text, Container, Button to HTML

**Week 4: Integration & Testing**
- [ ] Wire analyzer → builder → renderer
- [ ] flutterjs build command (basic)
- [ ] Output HTML file
- [ ] Manual browser test
- [ ] Performance baseline

#### Success Criteria
- test.fjs parses without errors
- Stateless widgets render to HTML
- Output HTML is valid and displays correctly
- Build completes in < 5 seconds

---

### 10.2 Phase 2: Reactivity (Weeks 5-8)

#### Objectives
- Implement state management
- Add event handling
- Build diffing algorithm
- Support StatefulWidget

#### Deliverables

**Week 5: State Management**
- [ ] State object creation
- [ ] setState implementation
- [ ] State proxy for change detection
- [ ] Dependency tracking
- [ ] Test: Counter widget state changes

**Week 6: Event System**
- [ ] Event handler registration
- [ ] onClick, onChanged, onTap bindings
- [ ] Event delegation setup
- [ ] Callback propagation
- [ ] Test: Button click triggers callback

**Week 7: Diffing & Reconciliation**
- [ ] VNode diff algorithm
- [ ] Patch generation
- [ ] Patch application to DOM
- [ ] Memory cleanup
- [ ] Test: State change updates only affected DOM

**Week 8: CSR Rendering**
- [ ] DOM rendering (vs string)
- [ ] Event listener attachment
- [ ] Hydration logic (SSR → CSR bridge)
- [ ] Integration testing
- [ ] Test: Full stateful widget lifecycle

#### Success Criteria
- StatefulWidget builds and renders
- setState triggers efficient updates
- Events fire and update state
- No memory leaks on updates
- 60 FPS animation performance

---

### 10.3 Phase 3: Advanced Features (Weeks 9-12)

#### Objectives
- BuildContext system
- Global state
- Lifecycle hooks
- SSR mode

#### Deliverables

**Week 9: BuildContext & Services**
- [ ] BuildContext implementation
- [ ] Service registration (Theme, Navigator, MediaQuery)
- [ ] Context provider hierarchy
- [ ] Dependency injection system
- [ ] Test: Widget accesses theme via context

**Week 10: Global State**
- [ ] ChangeNotifier implementation
- [ ] Provider pattern
- [ ] InheritedWidget support
- [ ] State subscription system
- [ ] Test: Global state affects multiple widgets

**Week 11: Lifecycle & Cleanup**
- [ ] Full lifecycle method support (initState, dispose, didUpdate, etc.)
- [ ] Error boundary catching
- [ ] Proper cleanup on unmount
- [ ] Memory profiling
- [ ] Test: No leaks over long sessions

**Week 12: SSR Mode**
- [ ] Node.js rendering path
- [ ] HTML string generation
- [ ] Hydration metadata generation
- [ ] Server-side async handling
- [ ] Test: SSR output + hydration matches CSR

#### Success Criteria
- BuildContext provides all needed services
- Global state works across widget tree
- All lifecycle methods called correctly
- SSR and CSR produce identical output
- Hydration works seamlessly

---

### 10.4 Phase 4: Production Ready (Weeks 13-16)

#### Objectives
- NPM package integration
- Build optimization
- Production pipeline
- DevTools support

#### Deliverables

**Week 13: Package System**
- [ ] Package metadata parsing
- [ ] Resolution map generation
- [ ] Wrapper implementation system
- [ ] Package validation
- [ ] Test: Import @flutterjs/* packages successfully

**Week 14: Build Optimization**
- [ ] Minification
- [ ] Tree-shaking (unused code removal)
- [ ] Code splitting
- [ ] Asset optimization
- [ ] Test: Bundle size < 50KB

**Week 15: Production Pipeline**
- [ ] flutterjs build --production mode
- [ ] Obfuscation
- [ ] Source maps generation
- [ ] Manifest generation
- [ ] Static export mode
- [ ] Test: Production build fully functional

**Week 16: DevTools & Polish**
- [ ] HMR system for dev mode
- [ ] Error overlay
- [ ] DevTools integration
- [ ] CLI improvements
- [ ] Documentation
- [ ] Test: Full dev workflow end-to-end

#### Success Criteria
- All NPM packages integrate smoothly
- Production bundle size < 50KB (core + material)
- Hot reload works < 200ms
- All Material widgets available
- DevTools show widget tree correctly

---

## 11. Reference Files Usage

### 11.1 Which Reference Files to Use

| File | Phase | Use For | Notes |
|------|-------|---------|-------|
| **FlutterApp.js** | 2-3 | App initialization, runApp() pattern | Has good lifecycle; refactor for clarity |
| **build_context.js** | 3 | BuildContext implementation | Good structure; add service accessors |
| **widget.js** | 1-2 | Widget base classes | Covers StatelessWidget, StatefulWidget well; simplify |
| **vnode.js** | 2 | VNode structure & methods | Good toHTML/toDOM pattern; add diffing |
| **build.js** | 4 | Build pipeline | Good for reference; rewrite for modular approach |
| **config.js** | 4 | Configuration handling | Use as pattern for flutterjs.config.js |
| **flutterjs_framework.md** | Planning | Architecture docs | Excellent high-level overview |
| **js_compilor.md** | Planning | Advanced features | Reference for Phase 3-4 features |
| **js_final_plan.md** | Planning | Full scope | Use as master reference |
| **test.fjs** | 1+ | Test data | Use to validate analyzer at each phase |
| **runtime.js** | 3 | Runtime engine | Good for core runtime; refactor into modules |

### 11.2 Strategic Refactoring

**Do NOT copy-paste.** Instead:

1. **Study the design pattern**
   - Understand the intent
   - Note the architecture
   - Identify strengths/weaknesses

2. **Identify reusable components**
   - Widget base classes ✓
   - VNode structure ✓
   - Build context pattern ✓

3. **Improve upon original**
   - Cleaner error handling
   - Better modularity
   - More comprehensive testing

4. **Rewrite from scratch** (sometimes better than refactoring)
   - If original has deep coupling
   - If original uses anti-patterns
   - If architecture doesn't fit new phase

### 11.3 Test Files Strategy

**Use test.fjs as:**
- **Validation input**: Feed to analyzer, ensure it parses
- **Render target**: Build VNodes, render to HTML
- **Integration test**: Full pipeline verification
- **Performance baseline**: Measure parse/render times

**Create test-specific files:**
- Simple widgets (single Text, single Button)
- Stateful widgets (Counter, Form)
- Complex hierarchies (nested Columns/Rows)
- Real-world patterns (Scaffold with AppBar)

---

## 12. Success Metrics

### 12.1 Functional Metrics

| Metric | Target | Validation |
|--------|--------|-----------|
| **Parse success rate** | 100% of valid .fjs files | Analyzer handles test.fjs |
| **Widget render accuracy** | 95%+ match Flutter output | Visual comparison |
| **State management** | Correct setState behavior | Counter widget works |
| **Event handling** | All Flutter events supported | Button click, input change, etc. |
| **Lifecycle execution** | Correct order, all hooks | initState → build → dispose |
| **BuildContext services** | Theme, Navigator, MediaQuery work | Widget accesses context correctly |
| **SSR/CSR match** | Identical output both modes | Hydration works perfectly |
| **Package integration** | Import @flutterjs/* packages | External packages load and work |

### 12.2 Performance Metrics

| Metric | Target | Baseline |
|--------|--------|----------|
| **Analysis time** | < 1 second | 0.5s for test.fjs |
| **Build time** | < 5 seconds | 2-3s with optimization |
| **setState latency** | < 16ms | Maintain 60 FPS |
| **Memory footprint** | < 10MB | Lean runtime |
| **Bundle size** | < 50KB (core+material) | 30KB core + 20KB material |
| **Initial load** | < 2 seconds | Including HTML download |
| **HMR update** | < 200ms | Instant feedback |

### 12.3 Quality Metrics

| Metric | Target |
|--------|--------|
| **Test coverage** | 80%+ unit, 30%+ integration |
| **Error messages** | Clear, actionable, with context |
| **Code documentation** | JSDoc for public APIs |
| **Browser compatibility** | Chrome, Firefox, Safari 14+ |
| **Accessibility** | WCAG AA compliance |
| **Type safety** | JSDoc types, no runtime type errors |

---

## Conclusion

This plan provides a structured roadmap for building the JavaScript section of FlutterJS, from foundational analysis to production-ready output. By following the phased approach and leveraging the reference materials wisely, you'll create a robust, scalable framework that bridges Flutter's design paradigm with JavaScript's ecosystem.

**Key Takeaways:**

1. **Modular Architecture**: Analyzer → VNode System → Renderer → Runtime
2. **Custom Tooling**: Build a tailored AST parser, not relying on generic language tools
3. **Phased Implementation**: MVP first, then add features incrementally
4. **Comprehensive Testing**: Unit → Integration → E2E pyramid
5. **Smart Package Integration**: Wrappers adapt NPM packages to Flutter patterns
6. **Performance Focus**: Optimize from day one (diffing, bundle size, startup)

Start with **Phase 1**, validate with test.fjs, iterate, and expand methodically. Good luck! 🚀