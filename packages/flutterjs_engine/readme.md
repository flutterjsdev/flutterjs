# FlutterJS Engine

<p align="center">
  <strong>Same Flutter Code. Real HTML Output.</strong>
</p>

<p align="center">
  <em>For when your Flutter app needs to be found by Google.</em>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-green.svg)](https://nodejs.org)
[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://www.npmjs.com/package/flutterjs)

---

## The Problem with Flutter Web

| Issue | Reality |
|-------|---------|
| 📦 **Huge bundles** | 2-5+ MB for basic apps |
| 🔍 **No SEO** | Canvas = invisible to Google |
| 🐢 **Slow load** | WASM initialization takes seconds |
| ♿ **Poor a11y** | No semantic HTML |

---

## The FlutterJS Solution

Compile your Flutter/Dart code to **semantic HTML + CSS + JavaScript** instead of Canvas/WASM.

| Metric | Flutter Web | FlutterJS |
|--------|-------------|-----------|
| Code | Dart/Flutter | Dart/Flutter ✓ |
| Output | Canvas pixels | Real HTML |
| Bundle | 2-5 MB | ~50-100 KB |
| SEO | ❌ None | ✓ Full |
| Load Time | 3-8s | <1s |
| SSR | ❌ No | ✓ Yes |

---

## Quick Start

### Installation

```bash
npm install -g flutterjs
```

### Create Project

```bash
flutterjs init my-app
cd my-app
```

### Write Flutter Code

```dart
// src/main.dart
import 'package:flutter/material.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('FlutterJS')),
        body: Center(child: Text('Hello World!')),
      ),
    );
  }
}
```

### Run

```bash
flutterjs dev       # Dev server at localhost:3000
flutterjs build     # Production build
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `flutterjs init <name>` | Create new project |
| `flutterjs dev` | Development server |
| `flutterjs build` | Production build |
| `flutterjs preview` | Preview production build |

### Build Modes

```bash
flutterjs build --mode ssr      # Server-side rendering
flutterjs build --mode csr      # Client-side rendering
flutterjs build --mode hybrid   # Best of both
```

---

## Configuration

```javascript
// flutter.config.js
module.exports = {
  mode: 'csr',  // 'ssr' | 'csr' | 'hybrid'
  
  build: {
    output: 'dist',
    minify: true,
  },
  
  server: {
    port: 3000,
    hot: true,
  }
};
```

---

## Project Structure

```
my-app/
├── flutter.config.js
├── src/
│   └── main.dart
├── assets/
├── .flutter_js/
└── dist/
```

---

## Supported Widgets

- **Layout**: Container, Row, Column, Stack, Center, Padding, SizedBox
- **Material**: Scaffold, AppBar, ElevatedButton, Text, Icon, Card
- **State**: StatefulWidget, setState, InheritedWidget

---

## Who Should Use FlutterJS?

✅ **Use FlutterJS for:**
- SEO-critical sites (blogs, e-commerce)
- Low-bandwidth markets
- Performance-critical landing pages
- Accessible web apps

❌ **Use Flutter Web for:**
- Complex apps (games, graphics)
- Internal tools (SEO doesn't matter)

---

## Links

- **GitHub**: [flutterjsdev/flutterjs](https://github.com/flutterjsdev/flutterjs)
- **Issues**: [Report bugs](https://github.com/flutterjsdev/flutterjs/issues)

---

<p align="center">
  <strong>Write Flutter. Ship the Web.</strong>
</p>