# FlutterJS Project Handover

## 🌟 Project Vision
**FlutterJS** is an experimental framework that brings the Flutter development experience to the web without the heavy runtime cost of CanvasKit or Wasm. Instead of drawing pixels to a canvas, **FlutterJS transpiles Dart code into idiomatic, readable JavaScript** that manipulates the DOM directly using a lightweight Virtual DOM (VNode) system.

**Goal**: Write Dart (Widgets, State, Logic) -> Run as optimized HTML/CSS/JS.

## 🏗️ System Architecture

The project consists of three main layers that work together to transform Dart code into a running web application:

### 1. The Compiler (Dart Side)
Located in `packages/flutterjs_tools` and `packages/flutterjs_gen`.
*   **Role**: Analyzes Dart source code, extracts an Intermediate Representation (IR), and transpiles it to JavaScript.
*   **Key Logic**:
    *   `IRGenerator`: Parses Dart code to understand classes, builds methods, and widget structures.
    *   `JSCodeGenerator`: Converts the IR into valid ES Module JavaScript.
    *   **Expression Handling**: Handles complex Dart concepts like `throw` expressions, `as` casts, and `??` operators during transpilation.

### 2. The Engine (Node.js Side)
Located in `packages/flutterjs_engine`.
*   **Role**: Orchestrates the build process, manages dependencies, and serves the application.
*   **Key Components**:
    *   **Build Pipeline**: Analyzing, Transforming, and Generating outputs.
    *   **Dev Server**: Express-based server with Hot Module Replacement (HMR) support.
    *   **Asset Generation**: Creates `index.html`, `app.js`, and `styles.css`.

### 3. The Runtime (Browser Side)
Located in `packages/flutterjs_runtime`, `packages/flutterjs_widgets`, `packages/flutterjs_material`, etc.
*   **Role**: The JavaScript libraries that run in the browser.
*   **Key Concepts**:
    *   **VNode System**: A lightweight virtual DOM implementation.
    *   **Widget Tree**: Replicates Flutter's widget tree structure (Stateless/Stateful).
    *   **Reconciliation**: Diffs VNodes to update the real DOM efficiently.

## 📂 Repository Structure

```text
flutterjs/
├── bin/                    # Global CLI entry point (flutterjs.dart)
├── examples/               # Test applications
│   ├── counter/            # The canonical "Hello World"
│   └── pub_test_app/       # Complex dependency integration tests
├── packages/
│   ├── flutterjs_tools/    # Main Dart CLI & Transpiler logic
│   ├── flutterjs_engine/   # Node.js Build System & Dev Server
│   ├── flutterjs_gen/      # IR Generation & Code Gen utilities
│   ├── flutterjs_runtime/  # Core JS Runtime (runApp, setState)
│   ├── flutterjs_widgets/  # Base Widget implementations
│   ├── flutterjs_material/ # Material Design components
│   └── flutterjs_analyzer/ # JS-based Analysis tools
```

## 🚀 Workflows & Usage

### Standard Development Cycle
1.  **Write Dart**: User writes standard Flutter code in `lib/`.
2.  **Run CLI**: `dart bin/flutterjs.dart run --to-js --serve`.
3.  **Transpilation**:
    *   CLI compiles Dart -> `.js` (ESM) in `build/flutterjs/src/`.
    *   CLI generates `flutterjs.config.js`.
4.  **Serving**:
    *   Engine starts, reads config.
    *   Generates `app.js` (bootstrap) and `index.html`.
    *   Serves assets via localhost.

### Build Implementation Details
*   **Direct JS Generation**: We now generate `.js` files directly (no intermediate `.fjs`).
*   **Entry Point**: The system defaults to `src/main.js`.
*   **Config**: `flutterjs.config.js` controls the engine's behavior.

## 📍 Current Technical Status

### ✅ What Works
*   **Direct JS Transpilation**: `.dart` files are successfully converted to `.js` ES Modules.
*   **Expression Support**: `throw`, `as`, `is`, `??` are correctly handled in JS.
*   **Basic Widgets**: `Container`, `Column`, `Row`, `Text`, `Scaffold`, `AppBar`, `FloatingActionButton`.
*   **State Management**: `setState` triggers re-renders via the VNode system.
*   **Dev Server**: Starts, serves assets, and supports HMR signals.
*   **Package Support**: Can compile dependencies like `collection` (with some caveats on complex exports).

### 🚧 Works in Progress / Limitations
*   **Layout System**: Flex layout (Row/Column) is basic CSS-based; complex main/cross axis behavior may need tuning.
*   **Dart Core Polyfills**: `dart:core` mapping is partial. Missing advanced `Map`, `Set`, or `List` methods might cause runtime errors.
*   **Complex Dependencies**: Packages with heavy use of `dart:io` or `dart:isolate` will fail.

## 🐛 Known Issues / Debugging Tips
1.  **"Entry file not found"**: Usually means `flutterjs.config.js` is stale (pointing to `.fjs`). **Fix**: Delete the config file and re-run the build.
2.  **Engine Version Mismatch**: If `dart run` fails to start the server, it might be running a stale `flutterjs-win.exe`. **Fix**: Ensure `engine_bridge.dart` is prioritizing `packages/flutterjs_engine/bin/index.js` (Node source).
3.  **Port Conflicts**: If the CLI crashes, the Node server might stay persistent. **Fix**: Kill the `node` process manually.
3.  **Missing Imports**: If generated JS is missing imports, check `file_code_gen.dart` in `flutterjs_gen`.

## 🔮 Roadmap
1.  **Complete Runtime Polyfills**: Solidify `@flutterjs/dart` to fully emulate Dart's core library behavior.
2.  **Layout System V2**: Implement a more robust layout solver for `Stack`, `Positioned`, and advanced Flex scenarios.
3.  **Production Minification**: Hook up `terser` or `esbuild` in the engine for production builds (`flutterjs build`).
