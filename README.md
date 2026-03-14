# FlutterJS

<p align="center">
  <strong>Same Flutter Code. Real HTML Output.</strong>
</p>

<p align="center">
  <em>For when your Flutter app needs to be found by Google.</em>
</p>

<p align="center">
  <a href="https://flutterjs.dev"><strong>🌐 flutterjs.dev</strong></a>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#why-flutterjs">Why FlutterJS?</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## The Problem

Flutter Web is amazing for apps, but terrible for the web:

| Flutter Web Issue | Impact |
|-------------------|--------|
| 📦 **2-5+ MB bundle** | Slow initial load, especially on mobile |
| 🔍 **Zero SEO** | Canvas rendering = invisible to Google |
| ♿ **Poor accessibility** | No semantic HTML for screen readers |
| 🐢 **Slow first paint** | WASM/CanvasKit takes time to initialize |

**Your beautiful Flutter app is invisible to search engines.**
---

## The Solution


FlutterJS compiles your Flutter/Dart code to **semantic HTML + CSS + JavaScript** instead of Canvas/WASM.

  <a href="https://github.com/user-attachments/assets/e46c88fb-4bb5-4600-a613-adcdcfd1c159">
    <img src="https://github.com/user-attachments/assets/e46c88fb-4bb5-4600-a613-adcdcfd1c159"
         width="48%" />
  </a>

```
┌─────────────────────────────────────────────────────────┐
│                  YOUR FLUTTER CODE                       │
│                                                         │
│   Scaffold(                                             │
│     appBar: AppBar(title: Text('My App')),              │
│     body: Center(child: Text('Hello World')),           │
│   )                                                     │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
   Flutter Web                      FlutterJS
   ┌─────────────┐               ┌─────────────┐
   │ <canvas>    │               │ <header>    │
   │ (pixels)    │               │ <main>      │
   │ 5 MB        │               │ <h1>        │
   │ No SEO      │               │ 50 KB       │
   └─────────────┘               │ Full SEO ✓  │
                                 └─────────────┘
```

---

## Why FlutterJS?

| Feature | Flutter Web | FlutterJS |
|---------|-------------|-----------|
| **Code Syntax** | Flutter/Dart | Flutter/Dart ✓ |
| **Bundle Size** | 2-5 MB | ~50-100 KB |
| **SEO** | ❌ None | ✓ Full |
| **Google Indexable** | ❌ No | ✓ Yes |
| **Accessibility** | Poor | Good |
| **Initial Load** | 3-8 seconds | <1 second |
| **SSR Support** | ❌ No | ✓ Yes |
| **Output** | Canvas pixels | Real HTML |

---

## Installation

### System Requirements

To develop with or use FlutterJS, you need:

-   **Dart SDK**: `^3.10.0` or higher (Stable).
-   **Node.js**: Required for the JavaScript engine and CLI tools.
-   **NPM**: Package manager for JS dependencies.
-   **Git**: For managing the monorepo and submodules.
-   **Flutter SDK**: (Optional but recommended) For resolving SDK dependencies.

### Option 1: npm (Recommended for users)

```bash
npm install -g flutterjs
```

### Option 2: From Source (For contributors)

```bash
git clone --recursive https://github.com/flutterjsdev/flutterjs.git
cd flutterjs
dart pub global activate --source path .
dart pub get
dart run tool/init.dart
```

---

## Current Status & Progress

✅ **CI/CD Stabilized**: Full automation with GitHub Actions, supporting recursive submodules and workspace resolution.
✅ **Ecosystem Launch**: First official package [`flutterjs_seo`](https://pub.dev/packages/flutterjs_seo) is now live on pub.dev.
✅ **Modern Dart Support**: Fully compatible with Dart 3.10+ features including dot shorthand and records.
✅ **Monorepo Readiness**: Standardized workspace structure across all 20+ packages.
✅ **SPA Navigation Fixed**: `State.setState()` now correctly propagates dirty-marking through the ancestor element chain, fixing all page-level navigation.
✅ **TextField `onChanged` Fixed**: `TextField(onChanged: ...)` — the Flutter-standard parameter — now correctly wires callbacks from compiled Dart code.
✅ **Color System Fixed**: `Color` constructor handles `MaterialColor` subclasses (e.g. `Colors.indigo`) without throwing.
✅ **FlutterJS Website Example**: Complete multi-page website with SPA routing, responsive nav, blog, and contact form — runnable in one command.

---

## Quick Start

### 1. Create a New Project

```bash
flutter create my-app
cd my-app
```

### 2. Write Flutter Code

```dart
// src/main.dart
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('FlutterJS App')),
        body: Center(
          child: Text('Hello from FlutterJS!'),
        ),
      ),
    );
  }
}
```

### 3. Run Development Server

```bash
flutterjs run --to-js --serve
```

Open `http://localhost:3000` — inspect the page to see **real HTML elements**, not canvas!

### 4. Build for Production

```bash
# Build your application
flutterjs build
```

This creates a `dist/` directory with:
- `index.html` (Entry point)
- `assets/` (Static resources)
- `main.js` (Compiled app)
- `vercel.json` (Deployment config)

### 5. Deploy to Vercel

Since `flutterjs build` automatically generates `vercel.json`, deployment is zero-config:

```bash
# Using Vercel CLI
vercel deploy
```

Or connect your GitHub repository to Vercel—it will automatically detect the output.

---

## Deployment

### Vercel (Recommended)
Deployment is **zero-config** and optimized for cleanliness (no duplicate `node_modules`).

1. **Build**:
   ```bash
   flutterjs build
   ```
   *(Creates `dist/` with app files, keeps dependencies in root)*

2. **Deploy**:
   ```bash
   cd ./build/flutterjs
   vercel deploy --prod
   ```

The build automatically generates `vercel.json` and `.vercelignore` to ensure:
-   **Routing**: SPAs work correctly (all routes → `index.html`)
-   **Dependencies**: `node_modules` are uploaded efficiently
-   **Cleanliness**: Your project remains unpolluted

### Other Providers
You can deploy the contents of `build/flutterjs/dist/` to any static host (Netlify, GitHub Pages, Firebase Hosting).
*Note: Ensure your provider handles SPA routing (redirect 404s to index.html).*

---

## How It Works

FlutterJS intercepts `kIsWeb` platform checks and routes web-specific code through a lightweight JavaScript runtime instead of Flutter's Canvas/WASM engine.

```dart
// Your existing Flutter code
if (kIsWeb) {
  // FlutterJS handles this path
  // Converts to semantic HTML + CSS
}
```

### Architecture

```
Flutter/Dart Source
        │
        ▼
┌───────────────────┐
│  FlutterJS Parser │  ← Analyzes Dart AST
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   Code Generator  │  ← Transforms to JavaScript
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   JS Runtime      │  ← VNode/VDOM engine
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   HTML + CSS      │  ← Semantic, SEO-friendly output
└───────────────────┘
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `flutterjs init <name>` | Create new project |
| `flutterjs dev` | Start dev server with hot reload |
| `flutterjs build` | Production build with minification |
| `flutterjs preview` | Preview production build |
| `flutterjs --help` | Show all commands |

### Build Options

```bash
flutterjs build --mode ssr         # Server-side rendering
flutterjs build --mode csr         # Client-side rendering (default)
flutterjs build --mode hybrid      # Best of both
flutterjs build -O 0               # Debug build (No optimization / No minification)
flutterjs build -O 3               # Production build (Aggressive optimization)
flutterjs build --output ./dist    # Custom output directory
```

---

## Render Modes

### CSR (Client-Side Rendering) — Default

Application renders in the browser. Good for SPAs.

### CSR (Client-Side Rendering) — Default

Application renders entirely in the browser using JavaScript.
- **Best for**: Dynamic web apps, Dashboards, Admin panels.
- **CLI**: `flutterjs run --target spa` (or just `flutterjs run`)
- **Config**: `mode: 'csr'`

### SSR (Server-Side Rendering)

Pre-renders HTML on the server (build time) and hydrates on the client.
- **Best for**: Marketing sites, Blogs, SEO-critical content.
- **CLI**: `flutterjs run --target ssr`
- **Config**: `mode: 'ssr'`
- **How it works**:
    1. Build generates a pre-rendered `index.html`.
    2. Client downloads HTML (instant paint).
    3. Client hydrates (attaches event listeners).

### Hybrid (Coming Soon)

A mix of Static Site Generation (SSG) and SPA.
- **Best for**: Large sites with mixed content.
- **CLI**: `flutterjs run --target hybrid`
- **Config**: `mode: 'hybrid'`
- **Note**: Currently experimental. Use SSR for best SEO results.

---

## Supported Widgets

FlutterJS supports the most commonly used Flutter widgets:

### Layout
- `Container`, `Center`, `Padding`, `SizedBox`
- `Row`, `Column`, `Stack`, `Positioned`
- `Expanded`, `Flexible`, `Spacer`

### Material
- `Scaffold`, `AppBar`, `Drawer`
- `ElevatedButton`, `TextButton`, `IconButton`, `FloatingActionButton`
- `Text`, `Icon`, `Image`
- `Card`, `Divider`
- `TextField`, `Checkbox`, `Switch`

### Navigation
- `Navigator`, `MaterialPageRoute`

### State Management
- `StatefulWidget`, `setState()`
- `InheritedWidget`

*More widgets are being added regularly.*

---

## Who Should Use FlutterJS?

✅ **Use FlutterJS if:**
- Your Flutter app needs SEO (blogs, e-commerce, marketing sites)
- You're targeting low-bandwidth users (smaller bundles matter)
- You need Google to index your content
- You want semantic HTML for accessibility
- First-load performance is critical

❌ **Stick with Flutter Web if:**
- You're building a complex app (games, graphics-heavy)
- SEO doesn't matter (internal tools, dashboards)
- You need every Flutter widget/feature

---

## Performance

| Metric | Flutter Web | FlutterJS |
|--------|-------------|-----------|
| Bundle Size | 2-5 MB | ~50-100 KB |
| First Paint | 3-8s | <1s |
| Time to Interactive | 5-10s | <2s |
| Lighthouse SEO | 0-30 | 90-100 |

---

## Configuration

Create `flutterjs.config.js` in your project root:

```javascript
module.exports = {
  // Rendering mode
  mode: 'csr', // 'ssr' | 'csr' | 'hybrid'
  
  // Build settings
  build: {
    output: 'dist',
    minify: true,
    sourcemap: false,
  },
  
  // Dev server
  server: {
    port: 3000,
    hot: true,
  },
  
  // Optimization
  optimization: {
    treeshake: true,
    splitChunks: true,
  }
};
```

---

## Project Structure

```
my-app/
├── flutter.config.js      # Configuration
├── package.json
├── src/
│   └── main.dart          # Your Flutter code
├── assets/                # Static files (images, fonts)
├── .flutter_js/           # Generated code (auto)
└── dist/                  # Production build (generated)
```

---

## Dart CLI Pipeline

FlutterJS includes a powerful **Dart CLI** that analyzes your Flutter/Dart code and converts it to optimized JavaScript.

### Running the Dart CLI

```bash
# Navigate to your Flutter project
cd examples/counter

# Run the full pipeline: Analysis → IR → JavaScript
dart run path/to/flutterjs/bin/flutterjs.dart run --to-js

# With dev server (starts after conversion)
dart run path/to/flutterjs/bin/flutterjs.dart run --to-js --serve

# With custom port
dart run path/to/flutterjs/bin/flutterjs.dart run --to-js --serve --server-port 4000
```

### Pipeline Phases

The Dart CLI executes a multi-phase pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 0: Setup & Initialization                                │
│  • Validate project directory                                   │
│  • Initialize Dart analyzer                                     │
│  • Create output directories                                    │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 1: Static Analysis                                       │
│  • Parse Dart AST                                               │
│  • Build dependency graph                                       │
│  • Detect changed files (incremental)                           │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 2: IR Generation (5 Passes)                              │
│  • Pass 1: Declaration Discovery                                │
│  • Pass 2: Symbol Resolution                                    │
│  • Pass 3: Type Inference                                       │
│  • Pass 4: Control-Flow Analysis                                │
│  • Pass 5: Validation & Diagnostics                             │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 3: IR Serialization                                      │
│  • Generate binary IR files                                     │
│  • Save conversion reports                                      │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 4-6: JavaScript Conversion                               │
│  • Convert IR to JavaScript                                     │
│  • Validate generated code                                      │
│  • Optimize (levels 0-3)                                        │
│  • Write .fjs files                                             │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 7: Dev Server (--serve flag)                             │
│  • Spawn flutterjs.exe dev server                              │
│  • Open browser automatically                                   │
│  • Hot reload on file changes                                   │
└─────────────────────────────────────────────────────────────────┘
```

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--project, -p` | Path to Flutter project root | `.` |
| `--source, -s` | Source directory relative to project | `lib` |
| `--to-js` | Convert IR to JavaScript | `false` |
| `--serve` | Start dev server after conversion | `false` |
| `--server-port` | Dev server port | `3000` |
| `--open-browser` | Open browser automatically | `true` |
| `--js-optimization-level` | Optimization level (0-3) | `1` |
| `--validate-output` | Validate generated JavaScript | `true` |
| `--incremental` | Only reprocess changed files | `true` |
| `--parallel` | Enable parallel processing | `true` |
| `--verbose, -v` | Show detailed logs | `false` |

---

## Engine Bridge Architecture

FlutterJS uses a **bridge architecture** to connect the Dart CLI with the JavaScript runtime engine.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Dart CLI (flutterjs.dart)                                      │
│                                                                 │
│  • Analyzes Dart/Flutter code                                   │
│  • Generates IR (Intermediate Representation)                   │
│  • Converts IR to .fjs JavaScript files                         │
│                                                                 │
│  After conversion (when --serve is used):                       │
│                     │                                           │
│                     ▼ Process.start()                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  flutterjs.exe dev --port 3000                          │   │
│  │                                                          │   │
│  │  • Serves .fjs files via Express.js                      │   │
│  │  • Hot Module Replacement (HMR)                          │   │
│  │  • WebSocket for live updates                            │   │
│  │  • Opens browser automatically                           │   │
│  └─────────────────────────────────────────────────────────┘    │
│                     │                                           │
│                     ▼                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Browser: http://localhost:3000                          │   │
│  │                                                          │   │
│  │  • FlutterJS Runtime loads                               │   │
│  │  • Widgets render to semantic HTML                       │   │
│  │  • State management works                                │   │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Platform Binaries

The engine bridge automatically detects your platform and uses the appropriate binary:

| Platform | Binary |
|----------|--------|
| Windows | `flutterjs.exe` |
| macOS | `flutterjs-macos` |
| Linux | `flutterjs-linux` |

Binaries are located in: `packages/flutterjs_engine/dist/`

### Building Engine Binaries

```bash
cd packages/flutterjs_engine

# Build for current platform
npm run build:windows  # Windows
npm run build:macos    # macOS
npm run build:linux    # Linux

# Build for all platforms
npm run build:all
```

### Future: IPC Mode (Coming Soon)

The bridge is designed to evolve to a full IPC (Inter-Process Communication) mode:

```dart
// Future IPC implementation
Process.start('flutterjs.exe', ['dev', '--ipc']);
// stdin:  {"method": "reload", "files": ["main.fjs"]}
// stdout: {"status": "ok", "reloadedCount": 1}
```

### ✅ Unified Project Structure

The Dart CLI now automatically generates a proper JS project structure in `build/flutterjs/`:

```
your-flutter-project/
├── lib/
│   └── main.dart              ← Your Flutter/Dart source code
│
└── build/
    ├── reports/               ← Dart CLI reports (analysis, conversion)
    │   ├── conversion_report.json
    │   └── summary_report.json
    │
    └── flutterjs/             ← Generated JS project (where JS CLI runs)
        ├── flutterjs.config.js  ← Auto-generated config
        ├── package.json         ← Auto-generated manifest
        ├── src/                 ← Generated .fjs files
        │   └── main.fjs
        └── public/              ← Generated HTML
            └── index.html
```

**How It Works:**

1. **Dart CLI** runs from your project root (`examples/counter`)
2. **Dart CLI** analyzes `lib/main.dart` and converts it to `build/flutterjs/src/main.fjs`
3. **Dart CLI** auto-generates `flutterjs.config.js`, `package.json`, and `public/index.html`
4. **JS CLI** runs from `build/flutterjs/` (the generated JS project)
5. **Browser** opens and your app is running!

---

## Example: Counter App

### 1. Navigate to the example

```bash
cd examples/counter
```

### 2. Run the full pipeline with dev server

```bash
dart run ../../bin/flutterjs.dart run --to-js --serve
```

### 3. Output

```
┌────────────────────────────────────────────────────────────────┐
│    FLUTTER IR TO JAVASCRIPT CONVERSION PIPELINE (Phases 0-6)  │
└────────────────────────────────────────────────────────────────┘
Project:  C:\path\to\flutterjs\examples\counter
Source:   C:\path\to\flutterjs\examples\counter\lib
Build:    C:\path\to\flutterjs\examples\counter\build\flutterjs

PHASE 1: Analyzing project...
  Files for conversion: 2

PHASE 2: Generating IR...
  ✅ main.dart processed

PHASES 4-6: Converting IR to JavaScript...
  ✅ Generated: 1 files

� Setting up FlutterJS project...
   ✅ JS project initialized

�🚀 Starting FlutterJS Dev Server...
✅ Dev Server running at http://localhost:3000
   📁 Project root: C:\path\to\flutterjs\examples\counter\build\flutterjs
   📁 Source files: C:\path\to\flutterjs\examples\counter\build\flutterjs\src

⏳ Server(s) running. Press "q" or Ctrl+C to stop.
   🌐 Dev Server: http://localhost:3000
```

---

## Roadmap

- [x] Core widget system (StatelessWidget, StatefulWidget)
- [x] Material Design components
- [x] CLI with dev server
- [x] SSR/CSR/Hybrid modes
- [x] Dart CLI Pipeline (Analysis → IR → JS)
- [x] Engine Bridge (Dart CLI ↔ JS Runtime)
- [x] Incremental compilation
- [x] DevTools IR Viewer
- [x] Dart Core Libraries (`dart:math`, `dart:async`, `dart:convert`, etc.)
- [ ] Animation support
- [ ] Full Material 3 theming
- [ ] Route-based code splitting
- [ ] PWA support
- [ ] TypeScript definitions
- [ ] IPC mode for tighter CLI-Engine integration

---

## Known Limitations

### Method Tear-offs (Callback Context)
Currently, passing methods directly as callbacks (tear-offs) may causing binding issues where `this` becomes undefined.
**Workaround:** Wrap callbacks in a lambda to preserve context.

```dart
// ❌ Avoid (may fail based on transpiler version)
onPressed: _incrementCounter

// ✅ Recommended
onPressed: () => _incrementCounter()
```

---

## Initialization

To set up the project for development (both Dart and JavaScript packages), run the following command from the root directory:

```bash
# 1. Get Dart dependencies
dart pub get

# 2. Initialize project (installs JS dependencies)
dart run tool/init.dart
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone the repo
git clone https://github.com/flutterjsdev/flutterjs.git

# Set up the project (Follow 'Initialization' steps above)
# 1. dart pub get
# 2. dart run tool/init.dart
```

---

## License

BSD 3-Clause "New" or "Revised" License — see [LICENSE](LICENSE) for details.

---

## Links

- **Website**: [flutterjs.dev](https://flutterjs.dev)
- **GitHub**: [github.com/flutterjsdev/flutterjs](https://github.com/flutterjsdev/flutterjs)
- **Issues**: [Report a bug](https://github.com/flutterjsdev/flutterjs/issues)
- **Discussions**: [Ask questions](https://github.com/flutterjsdev/flutterjs/discussions)

---

<p align="center">
  <strong>FlutterJS</strong><br>
  <em>Write Flutter. Ship the Web.</em>
</p>
