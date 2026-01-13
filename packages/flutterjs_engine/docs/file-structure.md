# FlutterJS File Structure

Detailed breakdown of the engine codebase.

## 📁 Directory Structure

```
flutterjs-framework/
├── dist/                              # Production builds
├── src/                               # Source code
│   ├── index.js                      # Main export
│   │
│   ├── core/                         # Core primitives
│   │   ├── widget.js                 # Base Widget
│   │   └── build-context.js          # Context
│   │
│   ├── vdom/                         # Virtual DOM
│   │   ├── vnode.js                  # Virtual Node
│   │   └── diffing.js                # Diff algorithm
│   │
│   ├── widgets/                      # Widget catalog
│   │   ├── material/                 # Material widgets
│   │   ├── layout/                   # Layout widgets
│   │   └── text/                     # Text widgets
│   │
│   ├── state/                        # State management
│   │   └── change-notifier.js        # ChangeNotifier
│   │
│   ├── runtime/                      # Runtime engine
│   │   └── run-app.js                # Bootstrap
│   │
│   └── cli/                          # CLI Tools
│       ├── cli.js                    # Entry point
│       └── dev-server.js             # Dev server
```

## Key Modules

### Core (`src/core/`)
Contains the fundamental building blocks: `Widget`, `Element`, `StatelessWidget`, `StatefulWidget`.

### VDOM (`src/vdom/`)
Implements the rendering engine. `renderer.js` handles converting VNodes to actual DOM elements.

### Widgets (`src/widgets/`)
The standard library of widgets. Organized by category (material, layout, text, etc.).

### CLI (`src/cli/`)
The build system. Contains the logic for `init`, `dev`, and `build` commands.

## Module Loading

The framework uses ES Modules (ESM). The `index.js` in each directory acts as a barrel file, exporting the public API of that module.

Tree-shaking is supported by ensuring side-effect-free imports where possible.
