# FlutterJS File Structure & Organization

## 📁 Complete Directory Structure

```
flutterjs-framework/
│
├── dist/                              # Production-ready builds
│   ├── flutter.js                    # Full framework (45KB)
│   ├── flutter.min.js                # Minified (15KB)
│   ├── flutter.d.ts                  # TypeScript definitions
│   ├── flutter.css                   # Core styles
│   └── flutter.min.css               # Minified styles
│
├── src/                               # Source code
│   │
│   ├── index.js                      # Main export
│   ├── package.json                  # Package metadata
│   │
│   ├── core/
│   │   ├── widget.js                 # Base Widget class
│   │   ├── stateless-widget.js       # StatelessWidget
│   │   ├── stateful-widget.js        # StatefulWidget
│   │   ├── state.js                  # State class
│   │   ├── build-context.js          # BuildContext
│   │   └── element.js                # Element tree
│   │
│   ├── vdom/
│   │   ├── vnode.js                  # Virtual Node
│   │   ├── vnode-builder.js          # VNode utilities
│   │   ├── renderer.js               # HTML renderer
│   │   └── diffing.js                # Virtual DOM diffing
│   │
│   ├── widgets/
│   │   │
│   │   ├── material/
│   │   │   ├── material-app.js       # MaterialApp
│   │   │   ├── cupertino-app.js      # CupertinoApp
│   │   │   ├── scaffold.js           # Scaffold
│   │   │   ├── app-bar.js            # AppBar
│   │   │   ├── bottom-nav-bar.js     # BottomNavigationBar
│   │   │   ├── drawer.js             # Drawer
│   │   │   └── bottom-sheet.js       # BottomSheet
│   │   │
│   │   ├── layout/
│   │   │   ├── container.js          # Container
│   │   │   ├── column.js             # Column
│   │   │   ├── row.js                # Row
│   │   │   ├── stack.js              # Stack
│   │   │   ├── positioned.js         # Positioned
│   │   │   ├── center.js             # Center
│   │   │   ├── padding.js            # Padding
│   │   │   ├── sized-box.js          # SizedBox
│   │   │   ├── flexible.js           # Flexible
│   │   │   ├── expanded.js           # Expanded
│   │   │   ├── wrap.js               # Wrap
│   │   │   ├── align.js              # Align
│   │   │   └── aspect-ratio.js       # AspectRatio
│   │   │
│   │   ├── text/
│   │   │   ├── text.js               # Text widget
│   │   │   ├── rich-text.js          # RichText
│   │   │   ├── text-span.js          # TextSpan
│   │   │   ├── selectable-text.js    # SelectableText
│   │   │   └── text-form-field.js    # TextFormField
│   │   │
│   │   ├── button/
│   │   │   ├── elevated-button.js    # ElevatedButton
│   │   │   ├── text-button.js        # TextButton
│   │   │   ├── outlined-button.js    # OutlinedButton
│   │   │   ├── icon-button.js        # IconButton
│   │   │   ├── floating-action-btn.js# FloatingActionButton
│   │   │   └── button-style.js       # ButtonStyle utilities
│   │   │
│   │   ├── input/
│   │   │   ├── text-field.js         # TextField
│   │   │   ├── form.js               # Form
│   │   │   ├── form-field.js         # FormField
│   │   │   ├── dropdown.js           # DropdownButton
│   │   │   └── search-field.js       # SearchField
│   │   │
│   │   ├── selection/
│   │   │   ├── checkbox.js           # Checkbox
│   │   │   ├── radio.js              # RadioButton
│   │   │   ├── switch.js             # Switch
│   │   │   └── slider.js             # Slider
│   │   │
│   │   ├── media/
│   │   │   ├── icon.js               # Icon
│   │   │   ├── image.js              # Image
│   │   │   ├── network-image.js      # NetworkImage
│   │   │   └── icon-data.js          # IconData
│   │   │
│   │   ├── cards/
│   │   │   ├── card.js               # Card
│   │   │   ├── list-tile.js          # ListTile
│   │   │   ├── list-view.js          # ListView
│   │   │   └── grid-view.js          # GridView
│   │   │
│   │   ├── dialog/
│   │   │   ├── alert-dialog.js       # AlertDialog
│   │   │   ├── dialog.js             # Dialog
│   │   │   ├── simple-dialog.js      # SimpleDialog
│   │   │   ├── cupertino-dialog.js   # CupertinoAlertDialog
│   │   │   └── show-dialog.js        # showDialog utilities
│   │   │
│   │   ├── progress/
│   │   │   ├── circular-progress.js  # CircularProgressIndicator
│   │   │   ├── linear-progress.js    # LinearProgressIndicator
│   │   │   ├── refresh-indicator.js  # RefreshIndicator
│   │   │   └── loading-overlay.js    # LoadingOverlay
│   │   │
│   │   ├── dividers/
│   │   │   ├── divider.js            # Divider
│   │   │   └── vertical-divider.js   # VerticalDivider
│   │   │
│   │   ├── decoration/
│   │   │   ├── box-decoration.js     # BoxDecoration
│   │   │   ├── border-radius.js      # BorderRadius
│   │   │   ├── border.js             # Border
│   │   │   ├── box-shadow.js         # BoxShadow
│   │   │   ├── gradient.js           # Gradient
│   │   │   └── decoration-image.js   # DecorationImage
│   │   │
│   │   └── index.js                  # Widgets barrel export
│   │
│   ├── state/
│   │   ├── state-provider.js         # StateProvider
│   │   ├── change-notifier.js        # ChangeNotifier
│   │   ├── value-notifier.js         # ValueNotifier
│   │   ├── inherited-widget.js       # InheritedWidget
│   │   ├── listenable-builder.js     # ListenableBuilder
│   │   └── index.js                  # State barrel export
│   │
│   ├── theme/
│   │   ├── theme-data.js             # ThemeData
│   │   ├── text-theme.js             # TextTheme
│   │   ├── color-scheme.js           # ColorScheme
│   │   ├── colors.js                 # Material colors
│   │   ├── icons.js                  # Icon definitions
│   │   ├── typography.js             # Typography system
│   │   ├── shapes.js                 # Shape system
│   │   └── index.js                  # Theme barrel export
│   │
│   ├── navigation/
│   │   ├── navigator.js              # Navigator API
│   │   ├── material-page-route.js    # MaterialPageRoute
│   │   ├── cupertino-page-route.js   # CupertinoPageRoute
│   │   ├── route-transition.js       # Transition animations
│   │   ├── route-generator.js        # Route generator
│   │   ├── deep-link-handler.js      # Deep link handling
│   │   └── index.js                  # Navigation barrel export
│   │
│   ├── animation/
│   │   ├── animation-controller.js   # AnimationController
│   │   ├── tween.js                  # Tween
│   │   ├── curved-animation.js       # CurvedAnimation
│   │   ├── curves.js                 # Animation curves
│   │   ├── transitions.js            # Built-in transitions
│   │   └── index.js                  # Animation barrel export
│   │
│   ├── forms/
│   │   ├── form-validator.js         # Form validation
│   │   ├── text-editing-controller.js# TextEditingController
│   │   ├── focus-node.js             # Focus management
│   │   ├── form-state.js             # FormState
│   │   └── index.js                  # Forms barrel export
│   │
│   ├── gestures/
│   │   ├── gesture-detector.js       # GestureDetector
│   │   ├── dismissible.js            # Dismissible
│   │   ├── draggable.js              # Draggable
│   │   ├── long-press.js             # LongPress
│   │   └── index.js                  # Gestures barrel export
│   │
│   ├── context/
│   │   ├── media-query.js            # MediaQuery
│   │   ├── theme.js                  # Theme context
│   │   ├── scaffold-state.js         # ScaffoldState
│   │   ├── navigator-observer.js     # NavigatorObserver
│   │   └── index.js                  # Context barrel export
│   │
│   ├── runtime/
│   │   ├── flutter-js.js             # Core runtime engine
│   │   ├── run-app.js                # runApp() bootstrap
│   │   ├── scheduler.js              # Update scheduler
│   │   ├── error-handler.js          # Error handling
│   │   └── index.js                  # Runtime barrel export
│   │
│   ├── utils/
│   │   ├── edge-insets.js            # EdgeInsets
│   │   ├── alignment.js              # Alignment
│   │   ├── size.js                   # Size
│   │   ├── offset.js                 # Offset
│   │   ├── text-style.js             # TextStyle
│   │   ├── duration.js               # Duration
│   │   ├── clip.js                   # Clip enum
│   │   ├── text-align.js             # TextAlign enum
│   │   ├── main-axis.js              # MainAxisAlignment
│   │   ├── cross-axis.js             # CrossAxisAlignment
│   │   ├── axis.js                   # Axis enum
│   │   ├── border-style.js           # BorderStyle
│   │   ├── box-fit.js                # BoxFit
│   │   └── index.js                  # Utils barrel export
│   │
│   ├── cli/
│   │   ├── cli.js                    # Main CLI handler
│   │   ├── commands/
│   │   │   ├── init.js               # init command
│   │   │   ├── dev.js                # dev command
│   │   │   ├── build.js              # build command
│   │   │   ├── serve.js              # serve command
│   │   │   ├── help.js               # help command
│   │   │   └── version.js            # version command
│   │   ├── dev-server.js             # Development server
│   │   ├── build-system.js           # Build pipeline
│   │   ├── project-generator.js      # Project scaffolding
│   │   ├── templates/
│   │   │   ├── main.js.template      # Main file template
│   │   │   ├── index.html.template   # HTML template
│   │   │   ├── config.js.template    # Config template
│   │   │   └── package.json.template # Package.json template
│   │   └── index.js                  # CLI barrel export
│   │
│   ├── debug/
│   │   ├── devtools.js               # DevTools utilities
│   │   ├── widget-inspector.js       # Widget inspector
│   │   ├── performance-profiler.js   # Performance profiling
│   │   ├── logger.js                 # Logging utilities
│   │   └── index.js                  # Debug barrel export
│   │
│   ├── platform/
│   │   ├── platform.js               # Platform detection
│   │   ├── web-platform.js           # Web platform APIs
│   │   ├── native-bridge.js          # Native integration
│   │   └── index.js                  # Platform barrel export
│   │
│   ├── plugins/
│   │   ├── plugin-system.js          # Plugin system
│   │   ├── shared-preferences.js     # Local storage plugin
│   │   ├── http-client.js            # HTTP plugin
│   │   ├── file-handler.js           # File handling
│   │   └── index.js                  # Plugins barrel export
│   │
│   └── styles/
│       ├── material.css              # Material Design CSS
│       ├── cupertino.css             # iOS Cupertino CSS
│       ├── base.css                  # Base styles
│       ├── utils.css                 # Utility classes
│       ├── animations.css            # Animation keyframes
│       └── tokens.css                # Design tokens
│
├── examples/                          # Example projects
│   ├── counter-app/
│   │   ├── lib/
│   │   │   └── main.js
│   │   ├── index.html
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── todo-app/
│   │   ├── lib/
│   │   │   ├── main.js
│   │   │   ├── screens/
│   │   │   │   ├── home.js
│   │   │   │   ├── add-todo.js
│   │   │   │   └── settings.js
│   │   │   ├── widgets/
│   │   │   │   ├── todo-item.js
│   │   │   │   └── todo-list.js
│   │   │   └── models/
│   │   │       └── todo.js
│   │   ├── index.html
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── weather-app/
│   │   ├── lib/
│   │   │   ├── main.js
│   │   │   ├── screens/
│   │   │   ├── services/
│   │   │   │   └── weather-api.js
│   │   │   └── models/
│   │   ├── index.html
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── ecommerce-app/
│       ├── lib/
│       ├── index.html
│       ├── package.json
│       └── README.md
│
├── tests/                             # Test suite
│   ├── unit/
│   │   ├── widget.test.js
│   │   ├── stateless-widget.test.js
│   │   ├── stateful-widget.test.js
│   │   ├── vnode.test.js
│   │   ├── state.test.js
│   │   └── animation.test.js
│   │
│   ├── integration/
│   │   ├── counter-app.test.js
│   │   ├── form-validation.test.js
│   │   ├── navigation.test.js
│   │   └── state-management.test.js
│   │
│   ├── e2e/
│   │   ├── user-flow.test.js
│   │   └── production-build.test.js
│   │
│   └── test-utils.js                 # Testing utilities
│
├── scripts/                           # Build scripts
│   ├── build.js                      # Build script
│   ├── bundle.js                     # Bundler
│   ├── minify.js                     # Minification
│   ├── obfuscate.js                  # Code obfuscation
│   ├── analyze.js                    # Bundle analysis
│   └── generate-types.js             # TypeScript definitions
│
├── docs/                              # Documentation
│   ├── getting-started.md            # Quick start
│   ├── architecture.md               # Architecture guide
│   ├── widgets.md                    # Widget documentation
│   ├── state-management.md           # State management
│   ├── routing.md                    # Navigation guide
│   ├── theming.md                    # Theme system
│   ├── animations.md                 # Animation guide
│   ├── forms.md                      # Form handling
│   ├── testing.md                    # Testing guide
│   ├── deployment.md                 # Deployment guide
│   ├── api-reference.md              # Complete API docs
│   ├── faq.md                        # FAQ
│   └── examples.md                   # Code examples
│
├── .github/
│   ├── workflows/
│   │   ├── test.yml                 # Test workflow
│   │   ├── build.yml                # Build workflow
│   │   └── deploy.yml               # Deploy workflow
│   └── ISSUE_TEMPLATE.md
│
├── .gitignore                        # Git ignore rules
├── package.json                      # Package metadata
├── README.md                         # Main README
├── CHANGELOG.md                      # Version history
├── CONTRIBUTING.md                   # Contributing guide
├── LICENSE                           # MIT License
└── cli.js                            # CLI entry point (executable)
```

---

## 📦 File Organization Principles

### 1. **Barrel Exports**
Each module has an `index.js` that re-exports all submodules:

```javascript
// src/widgets/index.js
export { Text } from './text/text.js';
export { Container } from './layout/container.js';
export { Column } from './layout/column.js';
export { Row } from './layout/row.js';
export { ElevatedButton } from './button/elevated-button.js';
// ... more widgets
```

**Benefit:** Users can import like this:
```javascript
import { Text, Container, Column } from './flutter.js';
```

### 2. **Module Separation**
Related functionality grouped by feature:

```javascript
// core/          - Widget base classes
// widgets/       - UI components (organized by type)
// state/         - State management
// theme/         - Design system
// navigation/    - Routing
// animation/     - Animations
// forms/         - Form handling
```

### 3. **CLI as Standalone**
The CLI (`cli.js`) is completely separate:

```javascript
// cli.js - Pure Node.js executable
#!/usr/bin/env node

// Can be run directly: ./cli.js init my-app
// Or with node: node cli.js init my-app
```

---

## 🛠️ Build Output Structure

### Production Build

```
dist/
├── flutter.min.js           # Minified + obfuscated (15KB)
├── flutter.js               # Full source (45KB)
├── flutter.d.ts             # TypeScript definitions
├── flutter.min.css          # Minified styles (6KB)
├── flutter.css              # Full CSS (20KB)
├── flutter.min.js.map       # Source map (optional)
└── version.txt              # Version info
```

### Development Build

```
build/dev/
├── flutter.js               # Full source (readable)
├── flutter.css              # Full CSS (readable)
├── source-map.js.map        # Source maps
└── stats.json               # Build stats
```

---

## 📋 Key Files Explained

### `src/index.js` - Main Export

```javascript
// Re-exports everything
export { Widget } from './core/widget.js';
export { StatelessWidget } from './core/stateless-widget.js';
// ... 100+ exports

export default {
  Widget,
  StatelessWidget,
  // ... default exports
  version: '1.0.0'
};
```

### `src/core/widget.js` - Base Widget Class

```javascript
// The foundation of everything
export class Widget {
  constructor(props = {}) {
    this.key = props.key;
    this.props = props;
    this._context = null;
    this._mounted = false;
  }

  build(context) {
    throw new Error('build() must be implemented');
  }
  // ... lifecycle methods
}
```

### `src/widgets/material/material-app.js` - Root Widget

```javascript
// Entry point for Material Design apps
export class MaterialApp extends StatelessWidget {
  constructor({ title, home, theme, routes } = {}) {
    super();
    this.title = title;
    this.home = home;
    this.theme = theme;
    this.routes = routes;
  }

  build(context) {
    // Returns app structure
  }
}
```

### `src/runtime/run-app.js` - Bootstrap Function

```javascript
// Mounts app to DOM
export function runApp(AppWidget) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mount(AppWidget);
    });
  } else {
    mount(AppWidget);
  }

  function mount(AppClass) {
    const app = new AppClass();
    app.mount('#root');
  }
}
```

### `cli.js` - CLI Entry Point

```javascript
#!/usr/bin/env node

// Standalone executable
// Usage: ./cli.js init my-app
// Usage: ./cli.js dev --port 5000

import { FlutterJSCLI } from './src/cli/cli.js';

const cli = new FlutterJSCLI();
const args = process.argv.slice(2);
cli.run(args);
```

---

## 🔗 Import Patterns

### From Browser

```javascript
// Direct ES module import
import FlutterJS from './dist/flutter.js';

// Or specific imports
import { Text, Container, Column } from './dist/flutter.js';

// Usage in HTML
<script type="module">
  import { runApp, MaterialApp } from './dist/flutter.js';
  // ... your code
</script>
```

### From Node.js / CLI

```javascript
// CLI tool usage
import { FlutterJSCLI } from './src/cli/cli.js';

const cli = new FlutterJSCLI();
await cli.init('my-app');
```

### From Examples

```javascript
// In example projects
import {
  StatelessWidget,
  Text,
  Container,
  MaterialApp,
  runApp
} from '../dist/flutter.js';

class MyApp extends StatelessWidget {
  build(context) {
    return new MaterialApp({
      home: new Container({
        child: new Text('Hello!')
      })
    });
  }
}

runApp(MyApp);
```

---

## 📊 File Size Breakdown

```
Total Framework: ~45KB (source)
├── core/          3KB   (Widget system)
├── vdom/          5KB   (Virtual DOM)
├── widgets/       25KB  (Material widgets)
├── state/         2KB   (State management)
├── theme/         3KB   (Theme system)
├── navigation/    2KB   (Routing)
├── animation/     2KB   (Animations)
└── runtime/       3KB   (Runtime engine)

Production: ~15KB (minified + gzipped)
```

---

## 🚀 Module Loading Order

When you import from FlutterJS:

```
1. index.js (main entry point)
   ↓
2. core/index.js (base classes)
   ↓
3. vdom/index.js (virtual DOM)
   ↓
4. widgets/index.js (all widgets)
   ↓
5. theme/index.js (design system)
   ↓
6. ... other modules
```

**Only loaded code is included** - tree shaking removes unused modules.

---

## 💾 How to Use This Structure

### For Development

```bash
# Develop source
cd src/

# Edit widgets
edit widgets/button/elevated-button.js

# Run tests
npm test

# Build dist
npm run build
```

### For End Users

```bash
# Use the CLI
./cli.js init my-app

# Develop app
cd my-app/
./cli.js dev

# Deploy
./cli.js build
```

### For Extending

```javascript
// Create custom widget
import { StatelessWidget } from '../dist/flutter.js';

export class MyCustomButton extends StatelessWidget {
  build(context) {
    // Your widget
  }
}
```

---

## 🎯 Summary

- **Modular design** - Each feature in separate folder
- **Barrel exports** - Import from single `index.js`
- **CLI standalone** - Works without npm
- **Tree-shakeable** - Only used code in final build
- **Well-organized** - Easy to navigate and extend
- **Scalable** - Can add 100+ widgets easily
- **Production-ready** - Everything needed for deployment

This structure is perfect for a **pure JavaScript framework** that doesn't require Node.js as a dependency! 🚀