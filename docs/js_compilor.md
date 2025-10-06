# Flutter.js Framework v3.0 - Enhanced Architecture
## Production-Ready Full-Stack Framework for Flutter-to-JS MPA

---

## Executive Summary

Flutter.js Framework v3.0 is a Next.js-inspired full-stack framework specifically designed to consume Flutter→IR transpiler output and render production-grade Multi-Page Applications with authentic Flutter design fidelity, reactivity, and performance.

**Key Innovation:** This framework serves as the **rendering engine** for your Flutter-to-JS compiler, transforming IR output into optimized HTML/CSS/JS while maintaining Flutter's reactive paradigm and Material/Cupertino design systems.

---

## 1. Framework Architecture Overview

```
flutter-transpiler/          # Your existing compiler
├── parser/                  # Dart AST → IR
├── analyzer/                # Reactivity analysis
└── ir-generator/            # FlatBuffers IR output
    ↓
    ↓ Generates IR
    ↓
flutterjs-framework/         # This framework (NEW)
├── packages/
│   ├── core/                # Widget runtime + Flutter primitives
│   ├── router/              # MPA routing + code splitting
│   ├── state/               # setState + Provider bridge
│   ├── renderer/            # IR → HTML/CSS/JS
│   ├── material/            # Material Design 3 system
│   ├── cupertino/           # iOS design system
│   ├── compiler/            # Production build pipeline
│   └── cli/                 # Developer tools
├── templates/               # HTML templates (MPA mode)
├── runtime/                 # Client-side runtime (<15KB)
└── examples/
```

---

## 2. Core Packages - Detailed Breakdown

### 2.1 `@flutterjs/core` - Flutter Runtime Foundation

**Purpose:** Implements Flutter's widget system and reactive primitives in JavaScript

```javascript
// Base Widget System (Flutter-identical API)
class Widget {
  constructor(props = {}) {
    this.key = props.key;
    this.props = props;
    this._element = null;
  }
  
  createElement() {
    return new Element(this);
  }
  
  build(context) {
    throw new Error('Widget.build() must be implemented');
  }
}

// StatelessWidget - Matches Flutter behavior
class StatelessWidget extends Widget {
  // Rebuilds when parent triggers rebuild
  // No internal state
  
  build(context) {
    throw new Error('StatelessWidget.build() must be implemented');
  }
}

// StatefulWidget - Flutter-identical lifecycle
class StatefulWidget extends Widget {
  createState() {
    throw new Error('StatefulWidget.createState() must be implemented');
  }
  
  createElement() {
    return new StatefulElement(this);
  }
}

// State<T> - Flutter's State class
class State {
  constructor(widget) {
    this.widget = widget;
    this.context = null;
    this._mounted = false;
  }
  
  // Flutter lifecycle methods
  initState() {}
  
  didChangeDependencies() {}
  
  didUpdateWidget(oldWidget) {}
  
  dispose() {}
  
  // THE setState - Flutter's signature API
  setState(fn) {
    if (!this._mounted) {
      console.warn('setState called on unmounted State');
      return;
    }
    
    if (fn) fn();
    
    // Schedule rebuild
    this._element?.markNeedsBuild();
  }
  
  build(context) {
    throw new Error('State.build() must be implemented');
  }
}

// BuildContext - Flutter's context system
class BuildContext {
  constructor(element) {
    this._element = element;
    this._inheritedWidgets = new Map();
  }
  
  // Theme.of(context) equivalent
  dependOnInheritedWidgetOfExactType(type) {
    return this._inheritedWidgets.get(type);
  }
  
  findAncestorStateOfType(type) {
    let ancestor = this._element.parent;
    while (ancestor) {
      if (ancestor.state instanceof type) {
        return ancestor.state;
      }
      ancestor = ancestor.parent;
    }
    return null;
  }
  
  // MediaQuery.of(context)
  get mediaQuery() {
    return this.dependOnInheritedWidgetOfExactType(MediaQuery);
  }
  
  // Theme.of(context)
  get theme() {
    return this.dependOnInheritedWidgetOfExactType(Theme);
  }
}

// Element Tree (Flutter's rendering pipeline)
class Element {
  constructor(widget) {
    this.widget = widget;
    this.parent = null;
    this.children = [];
    this._dirty = false;
    this._renderObject = null;
  }
  
  markNeedsBuild() {
    if (!this._dirty) {
      this._dirty = true;
      scheduleBuildFor(this);
    }
  }
  
  rebuild() {
    this.performRebuild();
  }
  
  performRebuild() {
    const built = this.widget.build(this.context);
    this.updateChild(built);
  }
  
  mount(parent) {
    this.parent = parent;
    this.context = new BuildContext(this);
    this.performRebuild();
  }
  
  unmount() {
    this.children.forEach(child => child.unmount());
    this._renderObject?.dispose();
  }
}

// StatefulElement
class StatefulElement extends Element {
  constructor(widget) {
    super(widget);
    this.state = widget.createState();
    this.state.widget = widget;
    this.state._element = this;
  }
  
  mount(parent) {
    this.state._mounted = true;
    this.state.context = new BuildContext(this);
    this.state.initState();
    super.mount(parent);
  }
  
  performRebuild() {
    const built = this.state.build(this.state.context);
    this.updateChild(built);
  }
  
  unmount() {
    this.state.dispose();
    this.state._mounted = false;
    super.unmount();
  }
}
```

### 2.2 `@flutterjs/router` - MPA Routing System

**Purpose:** File-based routing optimized for multi-page applications with Flutter navigation patterns

```javascript
// Router Configuration (from IR metadata)
class FlutterRouter {
  constructor(routes) {
    this.routes = routes; // From IR route analysis
    this.currentRoute = null;
    this.history = [];
  }
  
  // Navigator.push equivalent
  push(routeName, arguments) {
    const route = this.routes.get(routeName);
    
    if (!route) {
      throw new Error(`Route "${routeName}" not found`);
    }
    
    // MPA mode: Full page navigation
    if (route.isMPA) {
      window.location.href = this.buildURL(route, arguments);
      return;
    }
    
    // SPA mode: Client-side navigation
    this.history.push(this.currentRoute);
    this.currentRoute = { route, arguments };
    this.render();
    
    // Update browser URL without reload
    window.history.pushState(
      { route: routeName, arguments },
      '',
      this.buildURL(route, arguments)
    );
  }
  
  // Navigator.pop equivalent
  pop(result) {
    if (this.history.length === 0) {
      window.history.back();
      return;
    }
    
    const previous = this.history.pop();
    this.currentRoute = previous;
    this.render();
    window.history.back();
  }
  
  // Named routes (Flutter style)
  generateRoute(settings) {
    const route = this.routes.get(settings.name);
    return new MaterialPageRoute({
      builder: (context) => route.builder(context, settings.arguments),
      settings
    });
  }
}

// Route Structure (from IR)
class RouteDefinition {
  constructor(config) {
    this.name = config.name;           // '/profile'
    this.path = config.path;           // 'app/profile/page.fjs'
    this.builder = config.builder;     // Widget builder function
    this.isMPA = config.isMPA;         // true = separate HTML file
    this.preload = config.preload;     // [] = dependencies to preload
    this.layout = config.layout;       // Shared layout widget
    this.guards = config.guards;       // Route guards (auth, etc.)
  }
}

// MPA Code Splitting
class CodeSplitter {
  splitByRoute(routes) {
    return {
      // Shared across all pages
      shared: {
        runtime: '@flutterjs/runtime.min.js',
        material: '@flutterjs/material.min.css',
        common: 'components/common.min.js'
      },
      
      // Per-route bundles
      pages: routes.map(route => ({
        name: route.name,
        html: `${route.name}.html`,
        js: `${route.name}.bundle.js`,
        css: `${route.name}.styles.css`,
        dependencies: route.preload
      }))
    };
  }
}
```

**File Structure for MPA:**
```
build/
├── index.html                    # Home page
├── profile.html                  # /profile page
├── blog/
│   ├── index.html               # /blog
│   └── [slug].html              # /blog/:slug (template)
├── static/
│   ├── runtime.min.js           # Shared Flutter.js runtime
│   ├── material.min.css         # Material Design tokens
│   ├── chunks/
│   │   ├── home.bundle.js       # Home page logic
│   │   ├── profile.bundle.js    # Profile page logic
│   │   └── blog.bundle.js       # Blog page logic
│   └── assets/
│       ├── images/
│       └── fonts/
└── manifest.json                # Route manifest for preloading
```

### 2.3 `@flutterjs/state` - Flutter State Management

**Purpose:** Implement Flutter's state management patterns (setState, InheritedWidget, Provider)

```javascript
// InheritedWidget (Flutter's context-based state)
class InheritedWidget extends Widget {
  constructor(child, value) {
    super({ child });
    this._value = value;
    this._dependents = new Set();
  }
  
  static of(context, type) {
    const inherited = context.dependOnInheritedWidgetOfExactType(type);
    if (!inherited) {
      throw new Error(`No ${type.name} found in context`);
    }
    return inherited._value;
  }
  
  updateShouldNotify(oldWidget) {
    return this._value !== oldWidget._value;
  }
  
  notifyDependents() {
    this._dependents.forEach(element => element.markNeedsBuild());
  }
}

// Provider pattern (Flutter Provider package equivalent)
class ChangeNotifier {
  constructor() {
    this._listeners = new Set();
  }
  
  addListener(listener) {
    this._listeners.add(listener);
  }
  
  removeListener(listener) {
    this._listeners.delete(listener);
  }
  
  notifyListeners() {
    this._listeners.forEach(listener => listener());
  }
  
  dispose() {
    this._listeners.clear();
  }
}

class ChangeNotifierProvider extends InheritedWidget {
  constructor(create, child) {
    super(child, create());
  }
  
  static of(context, type) {
    return super.of(context, ChangeNotifierProvider);
  }
}

// ValueNotifier (Flutter's simple observable)
class ValueNotifier extends ChangeNotifier {
  constructor(initialValue) {
    super();
    this._value = initialValue;
  }
  
  get value() {
    return this._value;
  }
  
  set value(newValue) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.notifyListeners();
    }
  }
}

// StreamBuilder equivalent
class StreamBuilder extends StatefulWidget {
  constructor({ stream, initialData, builder }) {
    super({ stream, initialData, builder });
  }
  
  createState() {
    return new _StreamBuilderState();
  }
}

class _StreamBuilderState extends State {
  initState() {
    super.initState();
    this._subscription = this.widget.props.stream.listen(
      (data) => this.setState(() => { this._snapshot = data; })
    );
    this._snapshot = this.widget.props.initialData;
  }
  
  dispose() {
    this._subscription?.cancel();
    super.dispose();
  }
  
  build(context) {
    return this.widget.props.builder(context, this._snapshot);
  }
}
```

### 2.4 `@flutterjs/renderer` - IR to HTML/CSS/JS Converter

**Purpose:** Consume IR output and generate production-ready code

```javascript
class IRRenderer {
  constructor(ir, config) {
    this.ir = ir;              // FlatBuffers IR from compiler
    this.config = config;      // Build configuration
    this.cache = new Map();    // Rendering cache
  }
  
  // Main rendering pipeline
  async render() {
    // 1. Analyze IR structure
    const analysis = this.analyzeIR();
    
    // 2. Generate per-route outputs
    const outputs = await Promise.all(
      analysis.routes.map(route => this.renderRoute(route))
    );
    
    // 3. Extract shared components
    const shared = this.extractSharedComponents(analysis);
    
    // 4. Generate runtime bundle
    const runtime = this.generateRuntime(analysis);
    
    return {
      pages: outputs,
      shared,
      runtime,
      manifest: this.generateManifest(analysis)
    };
  }
  
  // Render single route to HTML
  renderRoute(route) {
    const page = {
      html: this.renderHTML(route),
      js: this.renderJavaScript(route),
      css: this.renderCSS(route),
      meta: this.renderMeta(route)
    };
    
    return page;
  }
  
  // Generate HTML with SSR-like structure
  renderHTML(route) {
    const widget = route.widget;
    
    // Stateless widgets → Static HTML
    if (widget.classification === 'STATELESS' && !widget.dependencies.length) {
      return this.renderStaticHTML(widget);
    }
    
    // Stateful widgets → HTML + hydration markers
    return this.renderHydratableHTML(widget);
  }
  
  renderStaticHTML(widget) {
    return `
      <div class="flutter-widget" data-type="${widget.type}">
        ${this.renderChildren(widget.children)}
      </div>
    `;
  }
  
  renderHydratableHTML(widget) {
    return `
      <div 
        class="flutter-widget flutter-stateful" 
        data-widget-id="${widget.id}"
        data-type="${widget.type}"
        data-hydrate="true"
      >
        ${this.renderChildren(widget.children)}
      </div>
      <script type="application/json" data-state="${widget.id}">
        ${JSON.stringify(widget.initialState)}
      </script>
    `;
  }
  
  // Generate JavaScript with reactivity
  renderJavaScript(route) {
    const statefulWidgets = route.widgets.filter(w => w.isStateful);
    
    return `
// Flutter.js Runtime Import
import { StatefulWidget, State, setState } from '@flutterjs/core';
import { MaterialApp } from '@flutterjs/material';

// Generated Widget Classes
${statefulWidgets.map(w => this.generateWidgetClass(w)).join('\n\n')}

// Page initialization
document.addEventListener('DOMContentLoaded', () => {
  FlutterJS.hydrate({
    root: document.getElementById('flutter-root'),
    widgets: [${statefulWidgets.map(w => w.id).join(', ')}],
    routing: ${route.hasNavigation}
  });
});
    `;
  }
  
  // Generate Widget class from IR
  generateWidgetClass(widget) {
    return `
class ${widget.className} extends StatefulWidget {
  createState() {
    return new _${widget.className}State();
  }
}

class _${widget.className}State extends State {
  constructor() {
    super();
    ${this.generateInitialState(widget)}
  }
  
  initState() {
    super.initState();
    ${this.generateInitStateLogic(widget)}
  }
  
  ${this.generateMethods(widget)}
  
  build(context) {
    return ${this.generateBuildMethod(widget)};
  }
}
    `;
  }
  
  // CSS Generation with Material/Cupertino tokens
  renderCSS(route) {
    const theme = route.theme || 'material';
    
    return `
/* Material Design 3 Tokens */
${this.generateDesignTokens(theme)}

/* Widget Styles */
${route.widgets.map(w => this.generateWidgetCSS(w)).join('\n')}

/* Page-specific styles */
${this.generatePageCSS(route)}
    `;
  }
  
  generateDesignTokens(theme) {
    if (theme === 'material') {
      return `
:root {
  /* Material 3 Color System */
  --md-sys-color-primary: rgb(103, 80, 164);
  --md-sys-color-on-primary: rgb(255, 255, 255);
  --md-sys-color-surface: rgb(255, 255, 255);
  
  /* Material 3 Typography */
  --md-sys-typescale-body-large-font: 'Roboto';
  --md-sys-typescale-body-large-size: 16px;
  
  /* Material 3 Elevation */
  --md-sys-elevation-1: 0px 1px 2px rgba(0,0,0,0.3);
  --md-sys-elevation-2: 0px 2px 4px rgba(0,0,0,0.3);
}
      `;
    } else {
      // Cupertino tokens
      return `
:root {
  /* iOS System Colors */
  --cupertino-system-blue: rgb(0, 122, 255);
  --cupertino-system-background: rgb(255, 255, 255);
  
  /* SF Pro Font */
  --cupertino-font-family: -apple-system, BlinkMacSystemFont, 'SF Pro';
}
      `;
    }
  }
}
```

### 2.5 `@flutterjs/material` - Material Design 3 System

**Purpose:** Pixel-perfect Material Design implementation

```javascript
// Material Theme System
class MaterialTheme {
  constructor(config) {
    this.colorScheme = config.colorScheme || ColorScheme.light();
    this.typography = config.typography || Typography.material2021();
    this.useMaterial3 = config.useMaterial3 ?? true;
  }
  
  static of(context) {
    return context.theme;
  }
  
  copyWith(changes) {
    return new MaterialTheme({
      ...this,
      ...changes
    });
  }
}

// Material Widgets (30 core widgets)
class ElevatedButton extends StatelessWidget {
  constructor({ onPressed, child, style }) {
    super({ onPressed, child, style });
  }
  
  build(context) {
    const theme = MaterialTheme.of(context);
    
    return new _ElevatedButtonRenderObject({
      onPressed: this.props.onPressed,
      child: this.props.child,
      backgroundColor: theme.colorScheme.primary,
      foregroundColor: theme.colorScheme.onPrimary,
      elevation: 2,
      ...this.props.style
    });
  }
}

// Render Object (converts to DOM)
class _ElevatedButtonRenderObject {
  toHTML() {
    return `
<button 
  class="flutter-elevated-button"
  style="
    background-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    box-shadow: var(--md-sys-elevation-2);
    border-radius: 20px;
    padding: 10px 24px;
    font: var(--md-sys-typescale-label-large);
  "
  data-flutter-widget="ElevatedButton"
>
  ${this.child.toHTML()}
</button>
    `;
  }
  
  toDOM() {
    const button = document.createElement('button');
    button.className = 'flutter-elevated-button';
    // Apply Material tokens...
    return button;
  }
}
```

### 2.6 `@flutterjs/compiler` - Production Build Pipeline

**Purpose:** Compile IR → Optimized production builds

```javascript
class FlutterCompiler {
  constructor(config) {
    this.mode = config.mode || 'production'; // 'development' | 'production'
    this.target = config.target || 'mpa';    // 'mpa' | 'spa'
    this.obfuscate = config.obfuscate ?? true;
  }
  
  async compile(irPath) {
    // 1. Load and parse IR
    const ir = await this.loadIR(irPath);
    
    // 2. Render to HTML/CSS/JS
    const renderer = new IRRenderer(ir, this.config);
    const output = await renderer.render();
    
    // 3. Optimize
    const optimized = await this.optimize(output);
    
    // 4. Bundle
    const bundled = await this.bundle(optimized);
    
    // 5. Write to disk
    await this.writeOutput(bundled);
    
    return {
      size: this.calculateSize(bundled),
      files: bundled.manifest
    };
  }
  
  async optimize(output) {
    if (this.mode === 'production') {
      return {
        html: await this.minifyHTML(output.pages),
        css: await this.optimizeCSS(output.shared.css),
        js: await this.optimizeJS(output.pages, output.runtime)
      };
    }
    return output;
  }
  
  async optimizeJS(pages, runtime) {
    const optimizer = new JavaScriptOptimizer({
      minify: true,
      treeshake: true,
      mangleProps: this.obfuscate,
      deadCodeElimination: true
    });
    
    return {
      runtime: await optimizer.optimize(runtime),
      pages: await Promise.all(pages.map(p => optimizer.optimize(p.js)))
    };
  }
  
  async bundle(optimized) {
    // Code splitting strategy
    const splitter = new CodeSplitter();
    
    return {
      pages: optimized.html,
      chunks: splitter.split(optimized.js),
      styles: this.extractCriticalCSS(optimized.css),
      manifest: this.generateManifest(optimized)
    };
  }
}
```

---

## 3. Integration with Your Flutter→JS Compiler

### 3.1 IR Handoff Point

```javascript
// Your compiler generates:
{
  "version": "1.0",
  "routes": [
    {
      "name": "/",
      "widgets": [/* ... IR widget nodes */],
      "layout": "MaterialApp",
      "isMPA": true
    }
  ],
  "theme": {/* Material theme config */},
  "dependencies": [/* Provider, services, etc. */]
}

// Flutter.js Framework consumes:
const framework = new FlutterJSFramework(irOutput);
await framework.build({
  mode: 'production',
  target: 'mpa',
  obfuscate: true
});
```

### 3.2 Build Pipeline Integration

```bash
# Your workflow:
1. flutter-to-js compile lib/main.dart
   ↓ Generates: build/ir/app.ir.json

2. flutterjs-framework build build/ir/app.ir.json
   ↓ Generates: dist/
   
3. flutterjs-framework serve dist/ --port 3000
   ↓ Development server with HMR
```

---

## 4. Framework Configuration

### `flutterjs.config.js`

```javascript
export default {
  // Framework mode
  framework: {
    version: '3.0',
    runtime: 'minimal'  // 'minimal' | 'full'
  },
  
  // Build target
  build: {
    target: 'mpa',           // 'mpa' | 'spa' | 'hybrid'
    mode: 'production',      // 'development' | 'production'
    outDir: 'dist',
    obfuscate: true,
    sourceMap: false
  },
  
  // Rendering strategy per route
  routes: {
    '/': { strategy: 'ssg', prerender: true },
    '/blog/*': { strategy: 'ssg' },
    '/dashboard': { strategy: 'ssr', cache: 60 },
    '/profile': { strategy: 'csr' }
  },
  
  // Material/Cupertino
  design: {
    system: 'material',      // 'material' | 'cupertino' | 'both'
    material: {
      useMaterial3: true,
      theme: 'light',        // 'light' | 'dark' | 'auto'
      primaryColor: '#6750A4'
    },
    cupertino: {
      brightness: 'light'
    }
  },
  
  // Optimization
  optimization: {
    minify: true,
    treeshake: true,
    codeSplit: true,
    criticalCSS: true,
    inlineSmallAssets: true,  // < 10KB
    imageOptimization: true,
    fontSubsetting: true
  },
  
  // State management
  state: {
    persist: ['user', 'cart'], // LocalStorage persistence
    hydration: 'auto'          // 'auto' | 'manual'
  },
  
  // Server (for SSR/dev)
  server: {
    port: 3000,
    hmr: true,
    compression: true,
    staticFiles: 'public',
    cache: {
      strategy: 'stale-while-revalidate',
      maxAge: 3600
    }
  },
  
  // PWA (optional)
  pwa: {
    enabled: false,
    manifest: './manifest.json',
    serviceWorker: true
  }
};
```

---

## 5. Enhanced Features Beyond Original Plan

### 5.1 Flutter-Style Navigation Guards

```javascript
// Route guard system (Flutter Navigator observers)
class AuthGuard extends NavigatorObserver {
  async canActivate(route, context) {
    const user = await AuthService.getCurrentUser();
    if (!user && route.requiresAuth) {
      Navigator.pushNamed(context, '/login');
      return false;
    }
    return true;
  }
}

// Usage in routes
const routes = {
  '/dashboard': {
    builder: (context) => DashboardPage(),
    guards: [new AuthGuard()],
    requiresAuth: true
  }
};
```

### 5.2 Flutter DevTools Integration

```javascript
// Debug mode features
class FlutterDevTools {
  // Widget inspector (like Flutter DevTools)
  inspectWidget(element) {
    return {
      type: element.widget.runtimeType,
      props: element.widget.props,
      state: element.state?._state,
      children: element.children.map(c => this.inspectWidget(c))
    };
  }
  
  // Performance profiling
  profileBuild(widget) {
    const start = performance.now();
    const result = widget.build(context);
    const duration = performance.now() - start;
    
    console.log(`Build time for ${widget.runtimeType}: ${duration}ms`);
    return result;
  }
  
  // Hot reload
  hotReload(widgetPath) {
    // Re-import and swap widget class
    const newWidget = this.reimport(widgetPath);
    this.swapWidget(oldWidget, newWidget);
    this.triggerRebuild();
  }
}
```

### 5.3 Flutter Test Compatibility

```javascript
// Widget testing (Flutter's testWidgets equivalent)
describe('CounterWidget', () => {
  testWidget('increments counter on button press', (tester) => {
    await tester.pumpWidget(CounterWidget());
    
    expect(tester.find.text('0')).toExist();
    
    await tester.tap(tester.find.byType(ElevatedButton));
    await tester.pump();
    
    expect(tester.find.text('1')).toExist();
  });
});
```

### 5.4 Material Motion System

```javascript
// Flutter's animation framework
class AnimationController {
  constructor({ duration, vsync }) {
    this.duration = duration;
    this._value = 0;
    this._listeners = new Set();
  }
  
  forward() {
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      this._value = Math.min(elapsed / this.duration, 1.0);
      this._listeners.forEach(cb => cb(this._value));
      
      if (this._value < 1.0) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }
  
  addListener(callback) {
    this._listeners.add(callback);
  }
}

// Material motion specs
const MaterialMotion = {
  // Duration
  short1: 50,
  short2: 100,
  medium1: 250,
  medium2: 300,
  long1: 400,
  long2: 500,
  
  // Easing curves
  emphasized: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  
  // Apply to CSS
  toCSSTransition(property, duration = 'medium1') {
    return `${property} ${this[duration]}ms ${this.standard}`;
  }
};
```

### 5.5 Accessibility (Flutter Semantics)

```javascript
// Semantics widget equivalent
class Semantics extends StatelessWidget {
  constructor({ label, hint, button, child }) {
    super({ label, hint, button, child });
  }
  
  build(context) {
    return new SemanticsRenderObject({
      role: this.props.button ? 'button' : 'region',
      ariaLabel: this.props.label,
      ariaDescription: this.props.hint,
      child: this.props.child
    });
  }
}

// Output
<div 
  role="button"
  aria-label="Add to cart"
  aria-description="Adds the selected item to your shopping cart"
  tabindex="0"
>
  ${child}
</div>
```

---

## 6. Development Workflow

### 6.1 CLI Commands

```bash
# Initialize new project
flutterjs init my-app --template material

# Development server
flutterjs dev
  --port 3000
  --open
  --hmr

# Build for production
flutterjs build
  --mode production
  --target mpa
  --obfuscate
  --analyze

# Analyze bundle
```




