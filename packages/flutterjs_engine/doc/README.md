# FlutterJS Engine - Technical Documentation

Technical documentation for the `flutterjs_engine` package.

---

## Documentation Index

### Core Architecture

- **[File Structure](file-structure.md)** - Detailed codebase organization
- **[Architecture Guide](architecture.md)** - System design and modules

### Advanced Features (Planned)

- **[SSR & SEO Plan](ssr-seo-plan.md)** - Integration plan for Server-Side Rendering
- **[Integration Plan](integration-plan.md)** - Full feature integration strategy

---

## Quick Links

- [Package README](../README.md)
- [FlutterJS Core](../../flutterjs_core/README.md)

---

## Runtime vs CLI

This package is unique as it contains both the **Runtime** (client-side code) and **CLI** (server-side build tools).

### Runtime
Located in `src/` (excluding `cli/`). This code is bundled and sent to the browser.
- **Micro-framework**: Custom widget system loosely based on Flutter
- **Virtual DOM**: Lightweight VDOM implementation
- **Renderer**: Semantic HTML renderer

### CLI
Located in `src/cli/`. This code runs on Node.js.
- **Bundler**: Custom bundler (no Webpack/Vite dependency)
- **Dev Server**: Express-like server with WebSocket HMR
- **Minifier**: Custom minification logic

---

## Contributing

### Development Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Run build scripts
   ```bash
   npm run build:all
   ```

3. Link globally
   ```bash
   npm link
   ```
