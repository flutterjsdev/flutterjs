# FlutterJS

<p align="center">
  <strong>Same Flutter Code. Real HTML Output.</strong>
</p>

<p align="center">
  <em>For when your Flutter app needs to be found by Google.</em>
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

### Option 1: npm (Recommended)

```bash
npm install -g flutterjs
```

### Option 2: From Source

```bash
git clone https://github.com/flutterjsdev/flutterjs.git
cd flutterjs/packages/flutterjs_engine
npm install
npm link
```

---

## Quick Start

### 1. Create a New Project

```bash
flutterjs init my-app
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
flutterjs dev
```

Open `http://localhost:3000` — inspect the page to see **real HTML elements**, not canvas!

### 4. Build for Production

```bash
flutterjs build
```

Output is in `dist/` — deploy to any static hosting (Netlify, Vercel, GitHub Pages).

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
flutterjs build --no-minify        # Skip minification
flutterjs build --output ./dist    # Custom output directory
```

---

## Render Modes

### CSR (Client-Side Rendering) — Default

Application renders in the browser. Good for SPAs.

```javascript
// flutter.config.js
module.exports = {
  mode: 'csr'
};
```

### SSR (Server-Side Rendering)

Pre-renders on server. Best for SEO.

```javascript
module.exports = {
  mode: 'ssr'
};
```

### Hybrid

SSR for initial load, CSR for interactions.

```javascript
module.exports = {
  mode: 'hybrid'
};
```

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

Create `flutter.config.js` in your project root:

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

## Roadmap

- [x] Core widget system (StatelessWidget, StatefulWidget)
- [x] Material Design components
- [x] CLI with dev server
- [x] SSR/CSR/Hybrid modes
- [ ] Animation support
- [ ] Full Material 3 theming
- [ ] Route-based code splitting
- [ ] PWA support
- [ ] TypeScript definitions

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone the repo
git clone https://github.com/flutterjsdev/flutterjs.git

# Install dependencies
cd flutterjs/packages/flutterjs_engine
npm install

# Run tests
npm test
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Links

- **GitHub**: [github.com/flutterjsdev/flutterjs](https://github.com/flutterjsdev/flutterjs)
- **Issues**: [Report a bug](https://github.com/flutterjsdev/flutterjs/issues)
- **Discussions**: [Ask questions](https://github.com/flutterjsdev/flutterjs/discussions)

---

<p align="center">
  <strong>FlutterJS</strong><br>
  <em>Write Flutter. Ship the Web.</em>
</p>
