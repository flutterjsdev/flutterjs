# Runtime Documentation

Documentation for `@flutterjs/runtime`, the engine that powers the FlutterJS component model.

## Contents

- **[Architecture](architecture.md)**: High-level system design.
- **[Lifecycle](lifecycle.md)**: Widget and State lifecycle states.
- **[Element System](../src/element.js)**: Source code for the element tree.

## Quick Start

The runtime is usually hidden behind the `flutterjs` package exports, but understanding it helps with optimization.

```javascript
import { runApp } from '@flutterjs/runtime';
import { MyApp } from './app.js';

runApp(new MyApp());
```

## Key Modules

- **`flutterjs_runtime.js`**: The main class, `runApp` implementation.
- **`element.js`**: `Element`, `StatelessElement`, `StatefulElement`.
- **`state.js`**: `State` class and `setState` batching.
- **`build_context.js`**: Implementation of `BuildContext` api.
