Below is a well-organized and comprehensive Markdown document that consolidates and rearranges the provided content about the **Flutter.js Framework**. The document retains all the original details, enhances clarity, and structures the information for better readability and navigation. The content is organized into logical sections, with clear headings, subheadings, and formatting to serve as a definitive reference for the Flutter.js Framework architecture and implementation plan.

---

# Flutter.js Framework Documentation

## Vision
Flutter.js is a production-ready, full-stack JavaScript framework inspired by Flutter and Next.js. It enables developers to write Material Design applications using Flutter-like syntax, which compiles to optimized HTML, CSS, and JavaScript. The framework supports Server-Side Rendering (SSR), Static Site Generation (SSG), Client-Side Rendering (CSR), and a hybrid rendering approach, delivering a seamless developer experience (DX) comparable to Next.js while maintaining Flutter’s declarative UI paradigm.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Framework Structure](#core-framework-structure)
3. [Framework Packages](#framework-packages)
   - [Core (`@flutterjs/core`)](#core-flutterjscore)
   - [Material Design (`@flutterjs/material`)](#material-design-flutterjsmaterial)
   - [Router (`@flutterjs/router`)](#router-flutterjsrouter)
   - [State Management (`@flutterjs/state`)](#state-management-flutterjsstate)
   - [Server (`@flutterjs/server`)](#server-flutterjsserver)
   - [Client (`@flutterjs/client`)](#client-flutterjsclient)
   - [Builder (`@flutterjs/builder`)](#builder-flutterjsbuilder)
   - [CLI (`@flutterjs/cli`)](#cli-flutterjscli)
4. [Rendering Strategies](#rendering-strategies)
   - [Server-Side Rendering (SSR)](#server-side-rendering-ssr)
   - [Static Site Generation (SSG)](#static-site-generation-ssg)
   - [Client-Side Rendering (CSR)](#client-side-rendering-csr)
   - [Hybrid (Islands Architecture)](#hybrid-islands-architecture)
5. [State Management Architecture](#state-management-architecture)
   - [Local State (`setState`)](#local-state-setstate)
   - [Global State (Provider-like)](#global-state-provider-like)
   - [Context (InheritedWidget)](#context-inheritedwidget)
6. [Development Server](#development-server)
   - [Dev Server Features](#dev-server-features)
   - [Hot Module Reload (HMR)](#hot-module-reload-hmr)
7. [Build System](#build-system)
   - [Production Build Pipeline](#production-build-pipeline)
   - [Output Structure](#output-structure)
8. [Configuration](#configuration)
9. [CLI Commands](#cli-commands)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Key Decisions](#key-decisions)
12. [Integration with Flutter-to-JS Pipeline](#integration-with-flutter-to-js-pipeline)
13. [Flutter-Style Function Call Syntax](#flutter-style-function-call-syntax)
14. [Success Metrics](#success-metrics)
15. [Next Steps](#next-steps)

---

## Architecture Overview
Flutter.js is designed as a modular, full-stack framework that brings Flutter’s developer experience to JavaScript. It leverages Node.js for server-side capabilities and supports multiple rendering strategies (SSR, SSG, CSR, and hybrid). The framework is built around a Flutter-inspired widget system, Material Design components, and a Next.js-style file-based router.

### Directory Structure
```
flutter.js/
├── packages/
│   ├── core/                 # Widget system and reactivity
│   ├── material/             # Material Design components
│   ├── router/               # File-based routing
│   ├── state/                # State management
│   ├── server/               # SSR engine
│   ├── client/               # Hydration and CSR
│   ├── builder/              # Build system
│   ├── cli/                  # Development tools
├── examples/                 # Sample applications
└── docs/                     # Documentation
```

---

## Core Framework Structure
The framework is organized into packages, each handling a specific aspect of the system. Below is the primary structure:

```
flutterjs-framework/
├── packages/
│   ├── core/                 # Core framework runtime
│   ├── router/               # File-based routing system
│   ├── state/                # State management (setState)
│   ├── server/               # SSR engine
│   ├── client/               # Client hydration
│   └── cli/                  # Development tools
├── examples/
└── docs/
```

---

## Framework Packages

### Core (`@flutterjs/core`)
**Purpose:** Provides the core runtime for interpreting Flutter-like widgets in JavaScript, including the widget system and reactivity model.

#### Key Features:
- **Widget System**: Base `Widget`, `StatelessWidget`, and `StatefulWidget` classes.
- **Reactivity**: Flutter-like `setState` for managing state updates.
- **Virtual DOM**: Efficient diffing for rendering.
- **Lifecycle Hooks**: Matches Flutter’s lifecycle methods (e.g., `initState`, `dispose`).

#### Code Example:
```javascript
class Widget {
  constructor({ key } = {}) {
    this.key = key;
    this._context = null;
    this._mounted = false;
  }
  
  build(context) {
    throw new Error('build() must be implemented');
  }
}

class StatelessWidget extends Widget {
  render() {
    const vnode = this.build(this._context);
    return isServer ? vnode.toHTML() : vnode.toDOM();
  }
}

class StatefulWidget extends Widget {
  constructor(params) {
    super(params);
    this._state = this.createState();
    this._state.widget = this;
  }
  
  createState() {
    throw new Error('createState() must be implemented');
  }
  
  setState(updater) {
    if (!this._mounted) return;
    const newState = typeof updater === 'function' ? updater(this._state) : updater;
    Object.assign(this._state, newState);
    this._scheduleRebuild();
  }
}

class State {
  constructor() {
    this.widget = null;
    this._mounted = false;
  }
  
  initState() {}
  dispose() {}
  
  build(context) {
    throw new Error('build() must be implemented');
  }
  
  setState(updater) {
    this.widget.setState(updater);
  }
}
```

#### Deliverables:
- Widget, StatelessWidget, StatefulWidget classes
- State class with lifecycle methods
- Virtual DOM system (VNode)
- Reactivity scheduler for batched updates
- BuildContext system

---

### Material Design (`@flutterjs/material`)
**Purpose:** Implements Material Design components with Flutter-style parameter-based APIs.

#### Key Features:
- **Parameter-based API**: Uses Flutter-style named parameters instead of JSX.
- **Theme System**: Supports Material Design tokens for consistent styling.
- **Widgets**: Includes layout, text, buttons, and more, organized into tiers for phased implementation.

#### Code Example:
```javascript
function ElevatedButton({ key, onPressed, onLongPress, style, child, autofocus = false, clipBehavior = Clip.none }) {
  return new _ElevatedButton({ key, onPressed, onLongPress, style, child, autofocus, clipBehavior });
}

class _ElevatedButton extends StatelessWidget {
  constructor({ key, onPressed, onLongPress, style, child, autofocus, clipBehavior }) {
    super({ key });
    this.onPressed = onPressed;
    this.onLongPress = onLongPress;
    this.style = style;
    this.child = child;
    this.autofocus = autofocus;
    this.clipBehavior = clipBehavior;
  }
  
  build(context) {
    const theme = Theme.of(context);
    const buttonTheme = theme.elevatedButtonTheme;
    
    return Container({
      child: this.child,
      decoration: BoxDecoration({
        color: this.style?.backgroundColor ?? buttonTheme.backgroundColor,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [
          BoxShadow({
            color: Colors.black.withOpacity(0.2),
            blurRadius: 2,
            offset: Offset(0, 1)
          })
        ]
      }),
      padding: EdgeInsets.symmetric({ horizontal: 16, vertical: 8 }),
      onTap: this.onPressed
    });
  }
}

function Text(data, { key, style, textAlign, maxLines }) {
  return new _Text(data, { key, style, textAlign, maxLines });
}

class _Text extends StatelessWidget {
  constructor(data, { key, style, textAlign, maxLines }) {
    super({ key });
    this.data = data;
    this.style = style;
    this.textAlign = textAlign;
    this.maxLines = maxLines;
  }
  
  build(context) {
    const theme = Theme.of(context);
    const defaultStyle = theme.textTheme.bodyMedium;
    
    return RawText({
      text: this.data,
      style: defaultStyle.merge(this.style),
      textAlign: this.textAlign,
      overflow: this.overflow,
      maxLines: this.maxLines
    });
  }
}
```

#### Material Components (Phased Implementation):
- **Tier 1 (Week 4)**: Container, Text, Column, Row, Stack, Scaffold, AppBar, Center, Padding, SizedBox, ElevatedButton, TextButton, IconButton, Icon, Image
- **Tier 2 (Week 5)**: Card, ListTile, TextField, Checkbox, Switch, FloatingActionButton, BottomNavigationBar, Divider, CircularProgressIndicator, LinearProgressIndicator
- **Tier 3 (Week 6)**: Wrap, Flexible, Expanded, Align, AspectRatio

#### Deliverables:
- Material class library (30 widgets)
- Theme system with Material tokens
- Color, TextStyle, EdgeInsets helpers
- BoxDecoration with shadows/gradients
- Material motion (animations)

---

### Router (`@flutterjs/router`)
**Purpose:** Implements a Next.js-style file-based routing system.

#### File Structure:
```
app/
├── page.fjs                  # / route
├── about/
│   └── page.fjs             # /about route
├── blog/
│   ├── page.fjs             # /blog route
│   └── [slug]/
│       └── page.fjs         # /blog/:slug route
├── layout.fjs               # Root layout
├── (auth)/
│   ├── login/page.fjs       # /login (grouped)
│   └── register/page.fjs    # /register
└── _components/             # Shared components (not routes)
```

#### Key Features:
- File-based routing
- Dynamic routes (`[id]`, `[...slug]`)
- Nested layouts
- Route groups (`(auth)/login`)
- API routes (`api/` folder)
- Navigator for programmatic navigation

#### Code Example:
```javascript
class RouteScanner {
  async scanRoutes(appDir) {
    const routes = [];
    const files = await glob(`${appDir}/**/page.fjs`);
    
    for (const file of files) {
      const route = this.fileToRoute(file);
      const component = await import(file);
      
      routes.push({
        path: route.path,
        component: component.default,
        params: route.params,
        renderMode: component.renderMode || 'ssr'
      });
    }
    
    return routes;
  }
  
  fileToRoute(filepath) {
    let path = filepath
      .replace(/^app/, '')
      .replace(/\/page\.fjs$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1')
      .replace(/\/\([^)]+\)\//g, '/');
    
    return { path: path || '/', params: [] };
  }
}

class Navigator {
  static push(context, route) {
    const router = context._router;
    router.push(route);
  }
  
  static pop(context) {
    const router = context._router;
    router.back();
  }
  
  static pushNamed(context, routeName, { arguments: args }) {
    const router = context._router;
    router.push({ name: routeName, params: args });
  }
}
```

#### Deliverables:
- File-based route scanner
- Dynamic route matching
- Route groups and layouts
- Navigator class (push/pop/pushNamed)
- Browser history integration

---

### State Management (`@flutterjs/state`)
**Purpose:** Provides Flutter-inspired state management with local, global, and context-based approaches.

#### Key Features:
- **Local State**: `setState` for widget-level reactivity.
- **Global State**: Provider-like pattern for app-wide state.
- **Context**: InheritedWidget for passing data down the widget tree.

#### Code Example:
```javascript
// Local State
class Counter extends StatefulWidget {
  createState() {
    return { count: 0 };
  }
  
  _increment() {
    this.setState({ count: this.state.count + 1 });
  }
  
  build(context) {
    return Column({
      children: [
        Text(`Count: ${this.state.count}`),
        ElevatedButton({
          onPressed: () => this._increment(),
          child: Text('Increment')
        })
      ]
    });
  }
}

// Global State (Provider)
class StateProvider {
  constructor(initialValue) {
    this._value = initialValue;
    this._listeners = new Set();
  }
  
  get value() {
    return this._value;
  }
  
  setValue(newValue) {
    this._value = newValue;
    this._notifyListeners();
  }
  
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
  
  _notifyListeners() {
    this._listeners.forEach(listener => listener(this._value));
  }
}

function useProvider(provider) {
  const [value, setValue] = useState(provider.value);
  
  useEffect(() => {
    return provider.subscribe(setValue);
  }, [provider]);
  
  return value;
}

// Context (InheritedWidget)
class InheritedWidget {
  static provide(context, Type, value) {
    context._inherited.set(Type.name, value);
  }
  
  static of(context, Type) {
    return context._inherited.get(Type.name);
  }
}
```

#### Deliverables:
- InheritedWidget system
- ChangeNotifier base class
- Provider/Consumer widgets
- State persistence (localStorage bridge)

---

### Server (`@flutterjs/server`)
**Purpose:** Handles server-side rendering and data fetching.

#### Key Features:
- Renders widget tree to HTML
- Supports `getServerSideProps` for dynamic data
- Generates hydration data for client-side initialization

#### Code Example:
```javascript
class FlutterJSServer {
  async renderRoute(route, req) {
    const { component, params } = route;
    
    let props = {};
    if (component.getServerSideProps) {
      props = await component.getServerSideProps({
        params: params,
        req: req
      });
    }
    
    const widget = new component(props);
    const context = this.createServerContext();
    const vnode = widget.build(context);
    
    const html = vnode.toHTML();
    const hydrationData = {
      props,
      state: this.extractState(widget),
      route: route.path
    };
    
    return { html, hydrationData };
  }
}
```

#### Deliverables:
- SSR renderer (Widget -> HTML)
- Data fetching (`getServerSideProps`)
- Hydration data generation
- Static generation (`getStaticProps`/`getStaticPaths`)

---

### Client (`@flutterjs/client`)
**Purpose:** Manages client-side hydration and CSR.

#### Key Features:
- Hydrates server-rendered HTML
- Attaches event listeners
- Initializes reactivity
- Supports client-side navigation

#### Code Example:
```javascript
class FlutterJSClient {
  hydrate(mountPoint, hydrationData) {
    const widget = this.recreateWidget(hydrationData);
    const serverDOM = mountPoint;
    const clientVNode = widget.build(this.createClientContext());
    
    this.attachEvents(serverDOM, clientVNode);
    this.initReactivity(widget);
  }
  
  attachEvents(dom, vnode) {
    if (vnode.props.onPressed) {
      dom.addEventListener('click', vnode.props.onPressed);
    }
    
    for (let i = 0; i < vnode.children.length; i++) {
      this.attachEvents(dom.children[i], vnode.children[i]);
    }
  }
}
```

#### Deliverables:
- Hydration logic (no re-render)
- Event attachment
- State restoration
- Client-side navigation

---

### Builder (`@flutterjs/builder`)
**Purpose:** Manages the production build pipeline.

#### Key Features:
- Supports SSG, SSR, and CSR builds
- Uses esbuild or rollup for bundling
- Optimizes assets and performs tree-shaking

#### Code Example:
```javascript
class Builder {
  async build(mode = 'production') {
    const routes = await this.scanner.scanRoutes('app/');
    
    for (const route of routes) {
      if (route.renderMode === 'ssg') {
        await this.generateStaticPage(route);
      } else if (route.renderMode === 'ssr') {
        await this.prepareSSRHandler(route);
      } else {
        await this.generateClientPage(route);
      }
    }
    
    await this.bundleClient(mode);
    if (mode === 'production') {
      await this.obfuscate();
      await this.minify();
    }
  }
}
```

#### Deliverables:
- Build pipeline (SSG/SSR/CSR)
- Code bundler (esbuild)
- Asset optimization
- Code obfuscation
- Tree-shaking

---

### CLI (`@flutterjs/cli`)
**Purpose:** Provides development tools and commands.

#### Commands:
```bash
# Development
flutterjs dev               # Start dev server
flutterjs dev --port 4000   # Custom port

# Build
flutterjs build             # Production build
flutterjs build --analyze   # Bundle analysis

# Start production server
flutterjs start             # Start SSR server

# Export static site
flutterjs export            # Generate static HTML

# Type checking
flutterjs check             # Validate widget types

# Testing
flutterjs test              # Run tests
```

#### Deliverables:
- CLI tool (create/dev/build/start)
- Dev server with HMR
- Error overlays
- Hot reload for widgets

---

## Rendering Strategies

### Server-Side Rendering (SSR)
**Use Case**: SEO-critical pages, fast initial load.

#### Flow:
1. Server receives request (e.g., `/blog/flutter-intro`).
2. Runs `getServerSideProps` to fetch data.
3. Renders widget tree to HTML.
4. Sends HTML and hydration JSON to the client.
5. Client hydrates, attaching events and initializing state.

#### Code Example:
```javascript
export class BlogPost extends StatefulWidget {
  static async getServerSideProps({ params }) {
    const post = await fetchPost(params.slug);
    return { post };
  }
  
  createState() {
    return { likes: this.props.post.likes };
  }
  
  build(context) {
    return Scaffold({
      children: [
        Text(this.props.post.title),
        Text(`Likes: ${this.state.likes}`),
        ElevatedButton({
          onPressed: () => this.setState({ likes: this.state.likes + 1 }),
          child: Text('Like')
        })
      ]
    });
  }
}
```

---

### Static Site Generation (SSG)
**Use Case**: Content that doesn't change often.

#### Code Example:
```javascript
export class DocPage extends StatelessWidget {
  static async getStaticProps({ params }) {
    const doc = await fetchDoc(params.topic);
    return { doc };
  }
  
  static async getStaticPaths() {
    const topics = await fetchAllTopics();
    return topics.map(t => ({ params: { topic: t.slug } }));
  }
  
  build(context) {
    return Container({
      child: Markdown(this.props.doc.content)
    });
  }
}
```

#### Build Command:
```bash
flutterjs build
# Generates static HTML files: build/docs/getting-started.html, build/docs/advanced.html
```

---

### Client-Side Rendering (CSR)
**Use Case**: Dynamic, user-specific content.

#### Code Example:
```javascript
'use client';

export class Dashboard extends StatefulWidget {
  createState() {
    return { userData: null, loading: true };
  }
  
  async componentDidMount() {
    const data = await fetchUserData();
    this.setState({ userData: data, loading: false });
  }
  
  build(context) {
    if (this.state.loading) {
      return CircularProgressIndicator();
    }
    
    return Column({
      children: [
        Text(`Welcome, ${this.state.userData.name}`),
        // ... dashboard content
      ]
    });
  }
}
```

---

### Hybrid (Islands Architecture)
**Use Case**: Mostly static content with interactive components.

#### Code Example:
```javascript
export class LandingPage extends StatelessWidget {
  build(context) {
    return Column({
      children: [
        Hero({ title: 'Welcome' }),
        Features(),
        ClientBoundary({
          child: InteractiveDemo()  // Hydrated on client
        })
      ]
    });
  }
}
```

---

## State Management Architecture

### Local State (`setState`)
**Purpose**: Widget-level state management.

#### Code Example:
```javascript
class Counter extends StatefulWidget {
  createState() {
    return { count: 0 };
  }
  
  _increment() {
    this.setState({ count: this.state.count + 1 });
  }
  
  build(context) {
    return Column({
      children: [
        Text(`Count: ${this.state.count}`),
        ElevatedButton({
          onPressed: () => this._increment(),
          child: Text('Increment')
        })
      ]
    });
  }
}
```

---

### Global State (Provider-like)
**Purpose**: App-wide state management.

#### Code Example:
```javascript
export const counterProvider = new StateProvider(0);

class HomePage extends StatefulWidget {
  createState() {
    return { count: counterProvider.value };
  }
  
  componentDidMount() {
    this._unsubscribe = counterProvider.subscribe(value => {
      this.setState({ count: value });
    });
  }
  
  componentWillUnmount() {
    this._unsubscribe();
  }
  
  build(context) {
    return ElevatedButton({
      onPressed: () => counterProvider.setValue(this.state.count + 1),
      child: Text(`Global: ${this.state.count}`)
    });
  }
}
```

---

### Context (InheritedWidget)
**Purpose**: Pass data down the widget tree without prop drilling.

#### Code Example:
```javascript
class ThemeProvider extends InheritedWidget {
  constructor(theme) {
    super();
    this.theme = theme;
  }
  
  static of(context) {
    return context.inheritedWidgets.get('theme').theme;
  }
}

class MyButton extends StatelessWidget {
  build(context) {
    const theme = ThemeProvider.of(context);
    return Container({
      style: { backgroundColor: theme.primaryColor },
      child: this.props.child
    });
  }
}
```

---

## Development Server

### Dev Server Features
**Purpose**: Provides a development environment with hot module reload (HMR) and fast refresh.

#### Code Example:
```javascript
class FlutterJSDevServer {
  constructor(config) {
    this.port = config.port || 3000;
    this.router = new Router();
    this.hmr = new HotModuleReload();
  }
  
  async start() {
    await this.scanRoutes();
    this.server = http.createServer(this.handleRequest.bind(this));
    this.watcher = chokidar.watch('app/**/*.fjs');
    this.watcher.on('change', this.handleFileChange.bind(this));
    this.hmr.start(this.server);
    this.server.listen(this.port);
  }
  
  async handleRequest(req, res) {
    const route = this.router.match(req.url);
    if (route) {
      const { html, data } = await this.renderPage(route);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(this.injectHMR(html, data));
    }
  }
}
```

---

### Hot Module Reload (HMR)
**Purpose**: Enables fast development with live updates.

#### Code Example:
```javascript
class HotModuleReload {
  handleFileChange(filepath) {
    this.clearModuleCache(filepath);
    const Component = this.reimportComponent(filepath);
    this.broadcast({
      type: 'component-update',
      filepath,
      source: Component.toString()
    });
  }
  
  clientHandler() {
    if (typeof window !== 'undefined') {
      const ws = new WebSocket('ws://localhost:3000/__hmr');
      ws.onmessage = (event) => {
        const { type, filepath, source } = JSON.parse(event.data);
        if (type === 'component-update') {
          this.hotReloadComponent(filepath, source);
        }
      };
    }
  }
}
```

---

## Build System

### Production Build Pipeline
**Purpose**: Generates optimized production builds for SSG, SSR, and CSR.

#### Code Example:
```javascript
class FlutterJSBuilder {
  async build(mode = 'production') {
    const routes = await this.scanRoutes();
    for (const route of routes) {
      if (route.getStaticProps) {
        await this.generateStaticPage(route);
      } else if (route.getServerSideProps) {
        await this.generateSSRPage(route);
      } else {
        await this.generateCSRPage(route);
      }
    }
    await this.bundleClientCode();
    await this.optimizeAssets();
    await this.generateManifest();
  }
  
  async bundleClientCode() {
    await esbuild.build({
      entryPoints: ['client/index.js'],
      bundle: true,
      minify: this.mode === 'production',
      splitting: true,
      format: 'esm',
      outdir: 'build/static'
    });
  }
}
```

---

### Output Structure
```
build/
├── static/
│   ├── _flutterjs/
│   │   ├── runtime.js         # Core runtime (12KB)
│   │   ├── router.js          # Client router (4KB)
│   │   └── state.js           # State management (3KB)
│   ├── chunks/
│   │   └── [hash].js          # Code-split chunks
│   └── css/
│       └── main.css           # Compiled styles
├── pages/
│   ├── index.html             # SSG pages
│   └── blog/
│       └── [slug].html
├── server/
│   └── ssr-handler.js         # SSR handler for Node.js
└── manifest.json              # Build manifest
```

---

## Configuration
**Purpose**: Configures the framework’s behavior via `flutterjs.config.js`.

#### Example Configuration:
```javascript
export default {
  output: 'hybrid',  // 'static' | 'server' | 'hybrid'
  rendering: {
    default: 'ssr',
    routes: {
      '/dashboard': 'csr',
      '/blog/*': 'ssg'
    }
  },
  state: {
    provider: 'builtin',
    persist: ['user', 'settings']
  },
  optimization: {
    minify: true,
    treeshake: true,
    codeSplit: true,
    imageDomain: 'cdn.example.com'
  },
  server: {
    port: 3000,
    hmr: true,
    compression: true
  }
};
```

---

## CLI Commands
```bash
# Development
flutterjs dev               # Start dev server
flutterjs dev --port 4000   # Custom port

# Build
flutterjs build             # Production build
flutterjs build --analyze   # Bundle analysis

# Start production server
flutterjs start             # Start SSR server

# Export static site
flutterjs export            # Generate static HTML

# Type checking
flutterjs check             # Validate widget types

# Testing
flutterjs test              # Run tests
```

---

## Implementation Roadmap

### Phase 1: Core Runtime (Weeks 1-3)
- Widget base classes (Stateless, Stateful)
- Basic `setState` reactivity
- Render to HTML string (SSR)
- Render to DOM (CSR)

### Phase 2: Material Design Package (Weeks 4-6)
- Material class library (30 widgets)
- Theme system with Material tokens
- Color, TextStyle, EdgeInsets helpers
- BoxDecoration with shadows/gradients
- Material motion (animations)

### Phase 3: Router (Weeks 7-8)
- File-based routing scanner
- Dynamic route matching
- Route parameters extraction
- Nested layouts

### Phase 4: State Management (Weeks 9-10)
- Global state provider
- Context system
- State persistence
- Devtools integration

### Phase 5: SSR Engine (Weeks 11-12)
- Server-side rendering
- Data fetching (`getServerSideProps`)
- HTML serialization
- Hydration data generation

### Phase 6: Client Hydration (Weeks 13-14)
- DOM hydration logic
- Event attachment
- State initialization
- Client-side navigation

### Phase 7: Build System (Weeks 15-16)
- Production bundler
- Code splitting
- Asset optimization
- Static export

### Phase 8: Dev Tools (Weeks 17-18)
- Dev server with HMR
- Error overlays
- CLI tools
- Configuration system

---

## Key Decisions

### Why Node.js?
- Universal JavaScript for client and server
- Rich ecosystem (build tools, testing)
- Fast startup for SSR
- Edge runtime support (Vercel, Cloudflare)

### Why Not Dart on Server?
- Immature Dart SSR ecosystem
- Node.js offers better edge deployment
- Easier integration with existing tools
- Lower barrier to entry

### Rendering Strategy Philosophy
- **SSR by default**: Best for SEO and initial load
- **SSG when possible**: Pre-render static content
- **CSR for dynamic**: User-specific data
- **Hybrid for optimal**: Mix strategies per route

---

## Integration with Flutter-to-JS Pipeline
Flutter.js serves as the target runtime for a Flutter-to-JS transpiler, enabling Flutter apps to run on the web.

### Pipeline Flow:
```
Flutter App (.dart)
    ↓
Flutter Parser
    ↓
Enhanced IR (FlatBuffers)
    ↓
Transpiler
    ↓
Flutter.js Code (.fjs) ← Uses @flutterjs/material
    ↓
Flutter.js Framework
    ↓
Optimized Web App
```

#### Example Transpilation:
**Input (Flutter):**
```dart
class MyButton extends StatelessWidget {
  final String title;
  final VoidCallback onPressed;
  
  MyButton({required this.title, required this.onPressed});
  
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      child: Text(title),
    );
  }
}
```

**Output (Flutter.js):**
```javascript
import { StatelessWidget, ElevatedButton, Text } from '@flutterjs/material';

class MyButton extends StatelessWidget {
  constructor({ key, title, onPressed }) {
    super({ key });
    this.title = title;
    this.onPressed = onPressed;
  }
  
  build(context) {
    return ElevatedButton({
      onPressed: this.onPressed,
      child: Text(this.title)
    });
  }
}
```

---

## Flutter-Style Function Call Syntax
Flutter.js uses a Flutter-inspired function call syntax instead of JSX, leveraging factory functions to create widget instances.

### Core Implementation:
```javascript
function ElevatedButton({ key, onPressed, style, child }) {
  return new _ElevatedButton({ key, onPressed, style, child });
}

class _ElevatedButton extends StatelessWidget {
  constructor({ key, onPressed, style, child }) {
    super({ key });
    this.onPressed = onPressed;
    this.style = style;
    this.child = child;
  }
  
  build(context) {
    const theme = Theme.of(context);
    
    return Container({
      child: this.child,
      padding: EdgeInsets.symmetric({ horizontal: 16, vertical: 8 }),
      decoration: BoxDecoration({
        color: this.style?.backgroundColor ?? theme.primaryColor,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [
          BoxShadow({
            color: Colors.black.withOpacity(0.2),
            blurRadius: 2,
            offset: Offset(0, 1)
          })
        ]
      }),
      onTap: this.onPressed
    });
  }
}
```

### Why This Works:
1. **Function Calls**: `ElevatedButton({ child: Text('Hello') })` is syntactic sugar for creating a widget instance.
2. **Nested Structures**: Widgets are built inside-out, creating a tree of widget instances.
3. **No Transpilation**: Valid JavaScript with no build step required.
4. **Factory + Class Pattern**: Factory functions provide a clean API, while internal classes handle widget logic.

#### Example Usage:
```javascript
class HomePage extends StatelessWidget {
  build(context) {
    return Scaffold({
      appBar: AppBar({
        title: Text('Flutter.js Demo')
      }),
      body: Center({
        child: ElevatedButton({
          onPressed: () => alert('Hello from Flutter.js!'),
          child: Text('Click Me')
        })
      })
    });
  }
}
```

---

## Success Metrics
- Write Flutter-style code in JavaScript
- Material components visually identical to Flutter
- Seamless SSR/SSG/CSR support
- Bundle size < 50KB (runtime + Material)
- Hot reload in < 100ms
- 95%+ Material Design fidelity
- Production builds fully obfuscated
- SEO score > 90

---

## Next Steps
1. **Week 1**: Implement Widget base classes (`Widget`, `StatelessWidget`, `StatefulWidget`).
2. **Week 2**: Add `setState` reactivity system.
3. **Week 3**: Build Virtual DOM (VNode) system.
4. **Week 4**: Begin Material package with core widgets (Container, Text, Button).

---

This document provides a comprehensive guide to the Flutter.js Framework, covering its architecture, implementation details, and roadmap. It serves as a foundation for building a production-ready platform for Flutter-designed web applications. 🚀

--- 

This Markdown document is structured to be clear, navigable, and comprehensive, retaining all provided content while improving organization. If you prefer an HTML version or have specific formatting requirements, please let me know!