# FlutterJS Engine & CLI

**Package**: `flutterjs_engine` (npm: `flutterjs`)  
**Purpose**: The JavaScript runtime and Node.js CLI for FlutterJS.

> [!NOTE]
> This package provides the **JavaScript runtime** (widgets, rendering) and the **Node.js CLI** (build, dev server).
> It is different from `flutterjs_core` (Dart compiler) and `flutterjs_tools` (Dart CLI).

---

## 🚀 Features

- **Zero External Dependencies** - Minimal footprint
- **Multiple Render Modes** - SSR, CSR, and Hybrid rendering
- **Development Server** - Hot-reload enabled
- **Production Build** - Minification, obfuscation, tree-shaking
- **Asset Management** - Automatic optimization
- **SEO Ready** - Semantic HTML output

---

## 🔧 Installation

```bash
npm install -g flutterjs
```

---

## 🎯 Quick Start

### 1. Create Project
```bash
flutterjs init my-app
cd my-app
npm install
```

### 2. Run Dev Server
```bash
npm run dev
```
Opens at `http://localhost:3000` with hot reload.

### 3. Build for Production
```bash
npm run build
```

---

## 📖 CLI Commands

### `flutterjs init <name>`
Create a new project with scaffolding.

### `flutterjs dev`
Start development server.
- `--port <port>`: Custom port
- `--open`: Open browser

### `flutterjs build`
Build for production.
- `--mode <ssr|csr|hybrid>`: Render mode
- `--no-minify`: Disable minification

### `flutterjs preview`
Preview production build locally.

---

## ⚙️ Configuration (flutter.config.js)

```javascript
module.exports = {
  mode: 'csr', // 'ssr', 'csr', 'hybrid'
  
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

## 🎨 Render Modes

| Mode | Description | Best For |
|------|-------------|----------|
| **CSR** (Client-Side) | Runs in browser | Dashboards, SPAs |
| **SSR** (Server-Side) | Pre-renders on server | Blogs, Content sites |
| **Hybrid** | SSR + Hydration | E-commerce, Landing pages |

---

## 📂 Project Structure

```
my-app/
├── flutter.config.js    # Configuration
├── src/
│   └── main.fjs        # Application code
├── assets/             # Static files
└── dist/               # Build output
```

---

## 🔗 Architecture

This package contains two main parts:

### 1. Runtime (`src/runtime/`)
The JavaScript framework that runs in the browser.
- Widget system (`Widget`, `StatelessWidget`)
- Rendering engine (`VDOM`, `Diffing`)
- State management (`setState`)

### 2. CLI (`src/cli/`)
The Node.js tools for building and serving.
- Webpack-like bundler (custom implementation)
- Dev server with HMR
- Scaffolding tools

---

## See Also

- [Technical Documentation](docs/README.md)
- [Main FlutterJS Documentation](../../docs/README.md)