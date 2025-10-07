# 🚀 Flutter.js Execution Plan v3.0

**Complete Framework Strategy with Dart Function IR**

**Timeline:** 26 Weeks to MVP  
**Updated:** October 5, 2025  
**Status:** Production Ready

## Table of Contents
- [Executive Summary](#executive-summary)
- [Framework Architecture](#framework-architecture)
- [Phases](#phases)
- [Dart Function IR](#dart-function-ir)
- [Timeline](#timeline)
- [Risk Mitigation](#risk-mitigation)

## 📋 Executive Summary

### Vision
Flutter.js is a complete framework that transpiles Flutter apps to optimized, SEO-friendly HTML/CSS/JS while maintaining 95%+ Material Design fidelity with its own lightweight runtime framework.

### Flutter.js Framework
A purpose-built 15KB runtime that provides Flutter-like reactivity, state management, and component lifecycle without dependencies on React/Vue/Angular.

### Key Differentiators

| **Framework** | **API** | **Runtime Size** | **Material Fidelity** | **SEO** | **Notes** |
|---------------|---------|------------------|----------------------|---------|-----------|
| **Flutter.js** | Pure Flutter API | 15KB | 95%+ | SEO-friendly HTML | No framework lock-in |
| **Flutter Web** | 100% Flutter API | 2.1MB | 100% | Poor SEO, slow load times | Canvas-based rendering |
| **React/Next.js** | React API | 40KB+ | No Material Design | SEO-friendly | Different paradigm |

## 🏗️ Framework Architecture

### Complete Framework Implementation
Not just a transpiler, but a full framework with its own runtime, lifecycle, and component system specifically designed for Flutter concepts.

### Framework Components

#### 1. Core Runtime (flutter.min.js - 15KB)

```javascript
const FlutterJS = {
  // 1. Widget System (3KB)
  widgets: {
    create(config) { /* StatefulWidget equivalent */ },
    register(id, widget) { /* Widget registry */ },
    mount(widget, container) { /* Mount to DOM */ },
    unmount(widget) { /* Cleanup */ }
  },

  // 2. Reactivity System (4KB)
  reactivity: {
    track(widget, prop) { /* Dependency tracking */ },
    trigger(widget, changes) { /* Smart updates */ },
    batch(callback) { /* Batch updates */ },
    diff(oldProps, newProps) { /* Efficient diffing */ }
  },

  // 3. State Management (2KB)
  state: {
    setState(widget, updater) { /* Flutter setState() */ },
    createContext(value) { /* InheritedWidget */ },
    useContext(context) { /* Context consumption */ },
    provide(key, value) { /* Provider pattern */ }
  },

  // 4. Lifecycle Hooks (1KB)
  lifecycle: {
    initState() {},
    didChangeDependencies() {},
    didUpdateWidget(oldWidget) {},
    dispose() {}
  },

  // 5. Navigation System (3KB)
  navigation: {
    push(route, args) { /* Navigator.push */ },
    pop(result) { /* Navigator.pop */ },
    replace(route, args) { /* pushReplacement */ },
    history: [] /* Browser history integration */
  },

  // 6. Theme System (2KB)
  theme: {
    provide(themeData) { /* ThemeData */ },
    of(context) { /* Theme.of(context) */ },
    update(changes) { /* Dynamic theme updates */ },
    dark() { /* Dark mode toggle */ }
  }
};
```

#### 2. Framework Features

| **Feature** | **Flutter Equivalent** | **Size** | **Status** |
|-------------|-----------------------|----------|------------|
| FlutterJS.createWidget() | StatefulWidget | 3KB | Core |
| setState() | State.setState() | 1KB | Core |
| FlutterJS.context | InheritedWidget | 2KB | Core |
| FlutterJS.navigation | Navigator | 3KB | Core |
| FlutterJS.theme | Theme/ThemeData | 2KB | Core |
| FlutterJS.provider | Provider | 2KB | Post-MVP |
| FlutterJS.animation | AnimationController | 2KB | Post-MVP |

#### 3. Component Lifecycle

```mermaid
graph TD
    A[Constructor] --> B[initState()]
    B --> C[build()]
    C --> D[didChangeDependencies()]
    D -->|setState()| C
    C --> E[didUpdateWidget()]
    E -->|setState()| C
    C --> F[dispose()]
```

## 📦 Dart Function IR (NEW)

### Complete Dart-to-JavaScript Function Mapping
Full intermediate representation for all Dart functions, methods, and business logic with proper scope handling and type inference.

### IR Schema for Dart Functions

```javascript
table FunctionDefinition {
  id: string;
  name: string;
  type: FunctionType; // method, getter, setter, constructor, static, async
  
  // Signature
  parameters: [Parameter];
  return_type: TypeRef;
  is_async: bool;
  is_generator: bool; // async*, sync*
  
  // Body Analysis
  body: FunctionBody;
  captures: [VariableRef]; // Closures
  calls: [FunctionCall]; // Dependencies
  
  // Optimization hints
  is_pure: bool;
  side_effects: [SideEffect];
  complexity: int; // For inlining decisions
}

table Parameter {
  name: string;
  type: TypeRef;
  is_required: bool;
  is_named: bool;
  is_positional: bool;
  default_value: Expression?;
}

table FunctionBody {
  type: BodyType; // expression, block, native
  statements: [Statement];
  local_variables: [Variable];
  control_flow: ControlFlowGraph;
}

table Expression {
  type: ExprType; // literal, binary, call, member, etc.
  dart_code: string;
  js_equivalent: string; // Pre-computed JS
  dependencies: [VariableRef];
}

table Statement {
  type: StmtType; // if, for, while, return, etc.
  expressions: [Expression];
  nested_statements: [Statement];
  scope: Scope;
}
```

### Dart-to-JS Function Mapping

#### Example 1: Simple Method

```dart
int calculateTotal(List<int> items) {
  return items.fold(0, (sum, item) => sum + item);
}
```

**IR Representation:**
```json
{
  "id": "func_calculateTotal",
  "name": "calculateTotal",
  "type": "method",
  "parameters": [
    { "name": "items", "type": "List" }
  ],
  "return_type": "int",
  "is_pure": true
}
```

**Generated JavaScript:**
```javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item, 0);
}
```

#### Example 2: Async Function with State

```dart
Future<void> loadUserData() async {
  setState(() {
    isLoading = true;
  });
  
  final user = await api.fetchUser();
  
  setState(() {
    currentUser = user;
    isLoading = false;
  });
}
```

**IR Representation:**
```json
{
  "id": "func_loadUserData",
  "name": "loadUserData",
  "type": "method",
  "is_async": true,
  "calls": [
    { "function": "setState", "context": "widget" },
    { "function": "api.fetchUser", "context": "external" }
  ],
  "side_effects": ["state_mutation", "network_call"]
}
```

**Generated JavaScript:**
```javascript
async function loadUserData() {
  this.setState({ isLoading: true });
  
  const user = await api.fetchUser();
  
  this.setState({
    currentUser: user,
    isLoading: false
  });
}
```

#### Example 3: Closure with Context

```dart
void setupHandlers() {
  int counter = 0;
  
  onIncrement = () {
    setState(() {
      counter++;
      total = counter * multiplier;
    });
  };
}
```

**IR Representation:**
```json
{
  "id": "func_setupHandlers",
  "name": "setupHandlers",
  "body": {
    "local_variables": [
      { "name": "counter", "type": "int", "initial": 0 }
    ],
    "closures": [
      {
        "name": "onIncrement",
        "captures": ["counter"],
        "accesses_state": ["multiplier"]
      }
    ]
  }
}
```

**Generated JavaScript:**
```javascript
function setupHandlers() {
  let counter = 0;
  
  this.onIncrement = () => {
    this.setState({
      counter: ++counter,
      total: counter * this.state.multiplier
    });
  };
}
```

### Dart Type to JavaScript Mapping

| **Dart Type** | **JavaScript Equivalent** | **Runtime Check** | **Notes** |
|---------------|---------------------------|-------------------|-----------|
| int, double | number | Optional | Number type |
| String | string | Optional | Template literals for interpolation |
| bool | boolean | Optional | Direct mapping |
| List<T> | Array<T> | Optional | Array methods map to List methods |
| Map< | | | *Incomplete in original document* |