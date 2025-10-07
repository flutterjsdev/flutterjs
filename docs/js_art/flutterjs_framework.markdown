# Flutter.js Framework Architecture
## Node.js-Based Full-Stack Framework

### Executive Overview
Flutter.js Framework is a Next.js-inspired full-stack framework that runs Flutter-like code on Node.js, supporting both SSR (Server-Side Rendering) and CSR (Client-Side Rendering) with Flutter's `setState` reactivity model. It uses a Virtual Node (VNode) system to bridge Flutter-style widgets with optimized HTML/CSS output, enabling efficient rendering and hydration.

---

## 1. Core Framework Structure

```
flutterjs-framework/
├── packages/
│   ├── core/                 # Core framework runtime and VNode system
│   ├── router/               # File-based routing system
│   ├── state/                # State management (setState)
│   ├── server/               # SSR engine
│   ├── client/               # Client hydration
│   ├── material/             # Material Design components
│   └── cli/                  # Development tools
├── examples/
└── docs/
```

---

## 2. Framework Packages Breakdown

### 2.1 `@flutterjs/core`
**Purpose:** Core runtime that interprets Flutter-like widgets in JavaScript and manages Virtual Nodes (VNodes) for rendering.

```javascript
// Core widget system
class Widget {
  constructor(props = {}) {
    this.props = props;
    this.context = null;
  }
  
  build(context) {
    throw new Error('build() must be implemented');
  }
  
  render() {
    // Returns HTML string (SSR) or DOM (CSR)
  }
}

class StatelessWidget extends Widget {
  // No internal state
  // Re-renders when props change
}

class StatefulWidget extends Widget {
  constructor(props) {
    super(props);
    this.state = this.createState();
    this._mounted = false;
  }
  
  createState() {
    throw new Error('createState() must be implemented');
  }
  
  setState(updater) {
    if (!this._mounted) return;
    
    const prevState = { ...this.state };
    const newState = typeof updater === 'function' 
      ? updater(prevState) 
      : updater;
    
    this.state = { ...prevState, ...newState };
    this._scheduleUpdate();
  }
  
  _scheduleUpdate() {
    // Batched updates
    if (!this._updateScheduled) {
      this._updateScheduled = true;
      Promise.resolve().then(() => {
        this._updateScheduled = false;
        this._performUpdate();
      });
    }
  }
}
```

**[Added]** **VNode System:** The core includes a Virtual Node (VNode) system that acts as a bridge between Flutter-style widgets and HTML/DOM output. VNodes are lightweight JavaScript objects that represent DOM elements, enabling efficient rendering (to HTML for SSR, to DOM for CSR), diffing for updates, and event handling for hydration.

```javascript
// @flutterjs/core/src/vdom/VNode.js
export class VNode {
  constructor({ tag, props = {}, children = [], events = {}, key = null }) {
    this.tag = tag;
    this.props = props;
    this.children = children;
    this.events = events;
    this.key = key;
    this._element = null; // Cached DOM element (client-side)
  }

  toHTML() {
    const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link']);
    const attrs = this._serializeProps();
    const eventAttrs = this._serializeEvents();
    const allAttrs = [attrs, eventAttrs].filter(Boolean).join(' ');
    const openTag = `<${this.tag}${allAttrs ? ' ' + allAttrs : ''}>`;
    
    if (voidTags.has(this.tag)) {
      return openTag;
    }
    
    const childrenHTML = this.children
      .map(child => {
        if (child instanceof VNode) {
          return child.toHTML();
        } else if (child === null || child === undefined) {
          return '';
        } else {
          return this._escapeHTML(String(child));
        }
      })
      .join('');
    
    return `${openTag}${childrenHTML}</${this.tag}>`;
  }

  toDOM() {
    const element = document.createElement(this.tag);
    this._element = element;
    
    Object.entries(this.props).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (key === 'style' && typeof value === 'object') {
        Object.entries(value).forEach(([styleProp, styleValue]) => {
          element.style[styleProp] = styleValue;
        });
      } else if (key === 'class' || key === 'className') {
        element.className = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else {
        element[key] = value;
      }
    });
    
    Object.entries(this.events).forEach(([eventName, handler]) => {
      if (handler) {
        element.addEventListener(eventName, handler);
      }
    });
    
    this.children.forEach(child => {
      if (child instanceof VNode) {
        element.appendChild(child.toDOM());
      } else if (child !== null && child !== undefined) {
        element.appendChild(document.createTextNode(String(child)));
      }
    });
    
    return element;
  }

  hydrate(existingElement) {
    this._element = existingElement;
    
    Object.entries(this.events).forEach(([eventName, handler]) => {
      if (handler) {
        existingElement.addEventListener(eventName, handler);
      }
    });
    
    const childElements = Array.from(existingElement.childNodes);
    let vnodeIndex = 0;
    
    childElements.forEach(childElement => {
      const childVNode = this.children[vnodeIndex];
      if (childVNode instanceof VNode && childElement.nodeType === 1) {
        childVNode.hydrate(childElement);
        vnodeIndex++;
      } else if (childElement.nodeType === 3) {
        vnodeIndex++;
      }
    });
    
    return existingElement;
  }

  _serializeProps() {
    return Object.entries(this.props)
      .map(([key, value]) => {
        if (value === null || value === undefined || value === false) {
          return '';
        }
        if (value === true) {
          return key;
        }
        if (key === 'style' && typeof value === 'object') {
          const styleStr = Object.entries(value)
            .map(([prop, val]) => `${this._camelToKebab(prop)}: ${val}`)
            .join('; ');
          return `style="${this._escapeHTML(styleStr)}"`;
        }
        if (key === 'className') {
          return `class="${this._escapeHTML(value)}"`;
        }
        return `${key}="${this._escapeHTML(String(value))}"`;
      })
      .filter(Boolean)
      .join(' ');
  }

  _serializeEvents() {
    if (Object.keys(this.events).length === 0) return '';
    const eventNames = Object.keys(this.events).join(',');
    return `data-fjs-events="${eventNames}"`;
  }

  _escapeHTML(str) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, char => escapeMap[char]);
  }

  _camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }
}
```

### 2.2 `@flutterjs/router`
**Purpose:** Next.js-style file-based routing

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
└── _components/             # Shared components (not routes)
```

**Router Features:**
- File-based routing (like Next.js App Router)
- Dynamic routes: `[id]`, `[...slug]`
- Nested layouts
- Route groups: `(auth)/login`
- API routes: `api/` folder

### 2.3 `@flutterjs/state`
**Purpose:** Flutter-inspired state management

```javascript
// Global State (like Provider/Riverpod)
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

// Hook-like API
function useProvider(provider) {
  const [value, setValue] = useState(provider.value);
  
  useEffect(() => {
    return provider.subscribe(setValue);
  }, [provider]);
  
  return value;
}

// InheritedWidget equivalent
class InheritedWidget {
  static provide(context, key, value) {
    context._inherited = context._inherited || {};
    context._inherited[key] = value;
  }
  
  static of(context, key) {
    return context._inherited?.[key];
  }
}
```

### 2.4 `@flutterjs/server`
**Purpose:** SSR rendering engine

```javascript
class FlutterJSServer {
  async renderPage(pagePath, params) {
    const PageComponent = await this.loadComponent(pagePath);
    let props = {};
    if (PageComponent.getServerSideProps) {
      props = await PageComponent.getServerSideProps({ params });
    }
    const html = this.renderToHTML(PageComponent, props);
    const hydrationData = this.generateHydrationData(props);
    return { html, hydrationData };
  }
  
  renderToHTML(Component, props) {
    const widget = new Component(props);
    const context = this.createServerContext();
    return widget.build(context).toHTML();
  }
}
```

### 2.5 `@flutterjs/client`
**Purpose:** Client-side hydration and CSR

```javascript
class FlutterJSClient {
  hydrate(rootElement, hydrationData) {
    const serverHTML = rootElement.innerHTML;
    const widget = this.recreateWidgetTree(hydrationData);
    this.attachEventListeners(widget, rootElement);
    this.initializeReactivity(widget);
  }
  
  render(Component, props, mountPoint) {
    const widget = new Component(props);
    const context = this.createClientContext();
    const dom = widget.build(context).toDOM();
    mountPoint.appendChild(dom);
  }
}
```

**[Added]** **2.6 `@flutterjs/material`**
**Purpose:** Material Design components implemented in JavaScript, outputting optimized HTML/CSS without Flutter transpilation.

**Architecture Overview:**
```
Flutter.js Material Components
    ↓
Factory Functions (Container, Column, etc.)
    ↓
Widget Classes (build methods)
    ↓
Virtual DOM (VNode)
    ↓
Renderer (toHTML/toDOM)
    ↓
Optimized HTML + CSS
```

**Example: Column Component**

```javascript
// @flutterjs/material/src/layout/Column.js
import { MultiChildWidget } from '@flutterjs/core';
import { VNode } from '@flutterjs/core/vdom';

export function Column({ 
  key, 
  children = [], 
  mainAxisAlignment = 'start',
  crossAxisAlignment = 'center',
  mainAxisSize = 'max'
}) {
  return new _Column({ key, children, mainAxisAlignment, crossAxisAlignment, mainAxisSize });
}

class _Column extends MultiChildWidget {
  constructor({ key, children, mainAxisAlignment, crossAxisAlignment, mainAxisSize }) {
    super({ key });
    this.children = children;
    this.mainAxisAlignment = mainAxisAlignment;
    this.crossAxisAlignment = crossAxisAlignment;
    this.mainAxisSize = mainAxisSize;
  }

  build(context) {
    const cssClass = this._generateCssClass();
    return new VNode({
      tag: 'div',
      props: {
        class: cssClass,
        'data-widget': 'Column'
      },
      children: this.children.map(child => 
        child instanceof Widget ? child.build(context) : child
      )
    });
  }

  _generateCssClass() {
    const classes = ['fjs-column'];
    const alignMap = {
      'start': 'flex-start',
      'end': 'flex-end',
      'center': 'center',
      'spaceBetween': 'space-between',
      'spaceAround': 'space-around',
      'spaceEvenly': 'space-evenly'
    };
    classes.push(`fjs-main-${this.mainAxisAlignment}`);
    classes.push(`fjs-cross-${this.crossAxisAlignment}`);
    return classes.join(' ');
  }
}
```

**Generated CSS (Compile-time)**

```css
/* @flutterjs/material/dist/material.css */
.fjs-column {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.fjs-main-start { justify-content: flex-start; }
.fjs-main-end { justify-content: flex-end; }
.fjs-main-center { justify-content: center; }
.fjs-main-spaceBetween { justify-content: space-between; }
.fjs-main-spaceAround { justify-content: space-around; }
.fjs-main-spaceEvenly { justify-content: space-evenly; }

.fjs-cross-start { align-items: flex-start; }
.fjs-cross-end { align-items: flex-end; }
.fjs-cross-center { align-items: center; }
.fjs-cross-stretch { align-items: stretch; }
```

**Example: ElevatedButton Component**

```javascript
// @flutterjs/material/src/components/ElevatedButton.js
import { StatelessWidget } from '@flutterjs/core';
import { VNode } from '@flutterjs/core/vdom';
import { Theme } from '../theme/Theme';

export function ElevatedButton({ 
  key, 
  onPressed, 
  child, 
  style 
}) {
  return new _ElevatedButton({ key, onPressed, child, style });
}

class _ElevatedButton extends StatelessWidget {
  constructor({ key, onPressed, child, style }) {
    super({ key });
    this.onPressed = onPressed;
    this.child = child;
    this.style = style;
  }

  build(context) {
    const theme = Theme.of(context);
    const disabled = !this.onPressed;
    const inlineStyle = this._computeStyle(theme);
    
    return new VNode({
      tag: 'button',
      props: {
        class: `fjs-elevated-button ${disabled ? 'fjs-disabled' : ''}`,
        style: inlineStyle,
        disabled: disabled,
        type: 'button',
        'data-widget': 'ElevatedButton'
      },
      children: [this.child],
      events: {
        click: this.onPressed
      }
    });
  }

  _computeStyle(theme) {
    if (!this.style) return '';
    const styles = [];
    if (this.style.backgroundColor) {
      styles.push(`background-color: ${this.style.backgroundColor}`);
    }
    if (this.style.foregroundColor) {
      styles.push(`color: ${this.style.foregroundColor}`);
    }
    return styles.join('; ');
  }
}
```

**Generated CSS for ElevatedButton**

```css
/* @flutterjs/material/dist/material.css */
.fjs-elevated-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-family: var(--md-sys-typescale-label-large-font);
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: var(--md-sys-typescale-label-large-weight);
  box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fjs-elevated-button:hover {
  box-shadow: 0 2px 4px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.15);
  background-color: var(--md-sys-color-primary-hover);
}

.fjs-elevated-button:active {
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.fjs-elevated-button.fjs-disabled {
  background-color: rgba(0,0,0,0.12);
  color: rgba(0,0,0,0.38);
  box-shadow: none;
  cursor: default;
}
```

---

## 3. Rendering Strategies

### 3.1 SSR (Server-Side Rendering)
**Use Case:** SEO-critical pages, initial fast load

```javascript
// app/blog/[slug]/page.fjs
export class BlogPost extends StatefulWidget {
  static async getServerSideProps({ params }) {
    const post = await fetchPost(params.slug);
    return { post };
  }
  
  createState() {
    return {
      likes: this.props.post.likes
    };
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

**Flow:**
1. Server receives request for `/blog/flutter-intro`
2. Server runs `getServerSideProps` to fetch data
3. Server renders widget tree to HTML string via VNodes
4. Server sends HTML + hydration JSON
5. Client hydrates: attaches events, initializes state

**[Added]** **Generated SSR Output**

```html
<div class="fjs-scaffold" data-widget="Scaffold">
  <span class="fjs-text">Blog Title</span>
  <span class="fjs-text">Likes: 0</span>
  <button 
    class="fjs-elevated-button" 
    type="button" 
    data-widget="ElevatedButton" 
    data-fjs-events="click">
    <span class="fjs-text">Like</span>
  </button>
</div>
<link rel="stylesheet" href="/_flutterjs/material.css">
<script type="module" src="/_flutterjs/runtime.js"></script>
<script type="application/json" id="__FLUTTERJS_DATA__">
  {"route":"/blog/flutter-intro","events":{"button[data-fjs-events='click']":"handleClick"}}
</script>
```

### 3.2 SSG (Static Site Generation)
**Use Case:** Content that doesn't change often

```javascript
// app/docs/[topic]/page.fjs
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

**Build-time generation:**
```bash
$ flutterjs build
# Generates static HTML files for all paths
# build/docs/getting-started.html
# build/docs/advanced.html
```

### 3.3 CSR (Client-Side Rendering)
**Use Case:** Dynamic, user-specific content

```javascript
// app/dashboard/page.fjs
'use client';

export class Dashboard extends StatefulWidget {
  createState() {
    return {
      userData: null,
      loading: true
    };
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

### 3.4 Hybrid (Islands Architecture)
**Use Case:** Mostly static with interactive components

```javascript
// app/landing/page.fjs
export class LandingPage extends StatelessWidget {
  build(context) {
    return Column({
      children: [
        Hero({ title: 'Welcome' }),
        Features(),
        ClientBoundary({
          child: InteractiveDemo()
        })
      ]
    });
  }
}
```

---

## 4. State Management Architecture

### 4.1 Local State (setState)

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

### 4.2 Global State (Provider-like)

```javascript
// state/counterProvider.js
export const counterProvider = new StateProvider(0);

// app/page.fjs
import { counterProvider } from '../state/counterProvider';

class HomePage extends StatefulWidget {
  createState() {
    return {
      count: counterProvider.value
    };
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

### 4.3 Context (InheritedWidget)

```javascript
// Theme provider
class ThemeProvider extends InheritedWidget {
  constructor(theme) {
    super();
    this.theme = theme;
  }
  
  static of(context) {
    return context.inheritedWidgets.get('theme').theme;
  }
}

// Usage
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

## 5. Development Server Architecture

### 5.1 Dev Server Features

```javascript
// packages/cli/dev-server.js
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

### 5.2 Hot Module Reload (HMR)

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

## 6. Build System

### 6.1 Production Build Pipeline

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

### 6.2 Output Structure

```
build/
├── static/
│   ├── _flutterjs/
│   │   ├── runtime.js         # Core runtime (12KB)
│   │   ├── router.js          # Client router (4KB)
│   │   ├── state.js           # State management (3KB)
│   │   └── material.css       # Material Design styles
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

## 7. Configuration

### 7.1 `flutterjs.config.js`

```javascript
export default {
  output: 'hybrid',
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

## 8. CLI Commands

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

## 9. Implementation Roadmap

### Phase 1: Core Runtime (Week 1-3)
- [ ] Widget base classes (Stateless, Stateful)
- [ ] VNode system for rendering
- [ ] Basic setState reactivity
- [ ] Render to HTML string (SSR)
- [ ] Render to DOM (CSR)

### Phase 2: Router (Week 4-5)
- [ ] File-based routing scanner
- [ ] Dynamic route matching
- [ ] Route parameters extraction
- [ ] Nested layouts

### Phase 3: SSR Engine (Week 6-7)
- [ ] Server-side rendering
- [ ] Data fetching (getServerSideProps)
- [ ] HTML serialization
- [ ] Hydration data generation

### Phase 4: Client Hydration (Week 8-9)
- [ ] DOM hydration logic
- [ ] Event attachment
- [ ] State initialization
- [ ] Client-side navigation

### Phase 5: Material Components (Week 10-11)
- [ ] Implement core Material components (Column, Container, ElevatedButton)
- [ ] Pre-compile Material CSS
- [ ] Theme system integration
- [ ] Accessibility support

### Phase 6: State Management (Week 12-13)
- [ ] Global state provider
- [ ] Context system
- [ ] State persistence
- [ ] Devtools integration

### Phase 7: Build System (Week 14-15)
- [ ] Production bundler
- [ ] Code splitting
- [ ] Asset optimization
- [ ] Static export

### Phase 8: Dev Experience (Week 16-17)
- [ ] Dev server with HMR
- [ ] Error overlays
- [ ] CLI tools
- [ ] Configuration system

---

## 10. Key Decisions

### Why Node.js?
- Universal JavaScript (same code client/server)
- Rich ecosystem (build tools, testing)
- Fast startup for SSR
- Edge runtime support (Vercel, Cloudflare)

### Why Not Dart on Server?
- Dart SSR ecosystem is immature
- Node.js has better edge deployment
- Easier integration with existing tools
- Lower barrier to entry

### Why Native JS Components?
- Avoids complex Flutter-to-JS transpilation
- Produces clean, optimized HTML/CSS
- Simplifies SSR and hydration
- Leverages web standards (Flexbox, CSS)

### Rendering Strategy Philosophy
- **SSR by default**: Best for SEO and initial load
- **SSG when possible**: Pre-render static content
- **CSR for dynamic**: User-specific data
- **Hybrid for optimal**: Mix strategies per route

---

## 11. Next Steps

1. **Implement Core Runtime**: Build Widget, StatelessWidget, StatefulWidget, and VNode classes
2. **Define Material Components**: Create Column, Container, ElevatedButton in JavaScript
3. **Implement Basic Routing**: File-based scanner and matcher
4. **Add SSR**: Server-side HTML rendering via VNodes
5. **Build Dev Server**: HMR and fast refresh
6. **Test with Real Apps**: Validate against Flutter apps converted to IR

Ready to build the framework that will consume your Flutter → IR → Flutter.js pipeline! 🚀