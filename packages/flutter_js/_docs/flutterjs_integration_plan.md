# FlutterJS Integration Plan: Missing Features with Existing Architecture

## 🎯 Overview

We'll integrate **5 critical missing features** while preserving your existing:
- ✅ Navigator system (keeps Flutter familiarity)
- ✅ Widget architecture
- ✅ State management
- ✅ Material Design widgets
- ✅ CLI tool

---

## 📋 Integration Architecture

```
┌─────────────────────────────────────────────┐
│        FlutterJS Full-Stack Framework       │
├─────────────────────────────────────────────┤
│                                             │
│  FRONTEND (Client-Side)                    │
│  ├─ Existing: Widget system ✅             │
│  ├─ Existing: Navigator ✅                 │
│  ├─ NEW: SSR Hydration                    │
│  ├─ NEW: SEO Meta Tags                    │
│  └─ NEW: Code Splitting/Lazy Loading      │
│                                             │
│  BACKEND (Server-Side)                     │
│  ├─ NEW: Node.js Server                   │
│  ├─ NEW: SSR Renderer                     │
│  ├─ NEW: API Routes                       │
│  ├─ NEW: Middleware Pipeline              │
│  └─ NEW: Caching Strategy                 │
│                                             │
│  SHARED                                    │
│  ├─ Existing: Widget definitions           │
│  ├─ Existing: Material widgets             │
│  ├─ NEW: Serializable props                │
│  └─ NEW: Route metadata                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔴 PHASE 1: SSR Engine (Weeks 1-3)

### 1.1 Create SSR Renderer

**File: `src/ssr/ssr-renderer.js`**

```javascript
/**
 * Server-Side Rendering Engine
 * Renders Flutter widgets to HTML strings on the server
 */

import { VNode } from '../vdom/vnode.js';
import { BuildContext } from '../core/build-context.js';

export class SSRRenderer {
  /**
   * Render a widget to HTML string (for server)
   * @param {Widget} AppWidget - Root widget class
   * @param {Object} props - Initial props
   * @param {Object} route - Current route info
   * @returns {String} HTML
   */
  static renderToString(AppWidget, props = {}, route = {}) {
    try {
      // Create app instance with props
      const app = new AppWidget(props);
      
      // Build widget tree
      const context = new BuildContext(app);
      const vnode = app.build(context);
      
      if (!vnode) {
        throw new Error('Widget returned null from build()');
      }

      // Convert to HTML
      const html = vnode.toHTML();
      
      return html;
    } catch (error) {
      console.error('SSR Error:', error);
      return this._renderErrorPage(error);
    }
  }

  /**
   * Render full HTML document with hydration
   */
  static renderFullPage(AppWidget, props = {}, route = {}, config = {}) {
    const appHtml = this.renderToString(AppWidget, props, route);
    const initialState = JSON.stringify({ props, route });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title || 'Flutter App'}</title>
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="${config.description || ''}">
  <meta property="og:title" content="${config.title || ''}">
  <meta property="og:description" content="${config.description || ''}">
  <meta property="og:image" content="${config.image || ''}">
  <meta property="og:url" content="${config.url || ''}">
  <meta name="twitter:card" content="summary_large_image">
  
  <!-- Styles -->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #FAFAFA;
    }
  </style>
</head>
<body>
  <div id="root">${appHtml}</div>
  
  <!-- Pass initial state to client for hydration -->
  <script>
    window.__INITIAL_STATE__ = ${initialState};
    window.__HYDRATION__ = true;
  </script>
  
  <!-- Load app with hydration -->
  <script type="module" src="/dist/app-client.js"><\/script>
</body>
</html>`;
  }

  static _renderErrorPage(error) {
    return `
      <div style="padding: 20px; font-family: monospace; color: red;">
        <h1>Error Rendering Page</h1>
        <pre>${error.message}</pre>
      </div>
    `;
  }
}

export default SSRRenderer;
```

### 1.2 Create FlutterJS Server

**File: `src/server/flutter-server.js`**

```javascript
/**
 * FlutterJS Server
 * Node.js server with SSR, API routes, and middleware
 * Integrates with existing Navigator system
 */

import http from 'http';
import url from 'url';
import { SSRRenderer } from '../ssr/ssr-renderer.js';

export class FlutterJSServer {
  constructor(config = {}) {
    this.config = {
      port: 3000,
      host: 'localhost',
      dev: process.env.NODE_ENV !== 'production',
      ...config
    };

    this.pages = new Map();           // Page routes with widgets
    this.apiRoutes = new Map();       // API endpoint handlers
    this.middlewares = [];            // Request middlewares
    this.errorHandlers = [];          // Error handlers
    this.cache = new Map();           // SSR cache for static pages
  }

  /**
   * Register a page route
   * Works with Navigator system
   * 
   * Example:
   * server.registerPage('/products/:id', ProductPage, {
   *   getServerSideProps: async ({ params }) => {
   *     return { product: await getProduct(params.id) };
   *   }
   * });
   */
  registerPage(path, AppComponent, options = {}) {
    this.pages.set(path, {
      component: AppComponent,
      getServerSideProps: options.getServerSideProps,
      getStaticProps: options.getStaticProps,
      revalidate: options.revalidate,
      cacheControl: options.cacheControl || 'public, max-age=3600'
    });

    console.log(`✅ Page: ${path}`);
  }

  /**
   * Register API route
   * 
   * Example:
   * server.registerAPI('GET', '/api/users', async (req, res) => {
   *   res.json(await getUsers());
   * });
   */
  registerAPI(method, path, handler) {
    const key = `${method} ${path}`;
    this.apiRoutes.set(key, handler);
    console.log(`✅ API: ${key}`);
  }

  /**
   * Add middleware (runs before page/api)
   */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Add error handler
   */
  onError(handler) {
    this.errorHandlers.push(handler);
    return this;
  }

  /**
   * Main request handler
   */
  async handleRequest(req, res) {
    try {
      // Execute middlewares
      for (const middleware of this.middlewares) {
        const result = await middleware(req, res);
        if (result === false) return; // Stop chain
      }

      // Parse URL
      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;
      const method = req.method;

      // API routes (priority)
      if (pathname.startsWith('/api/')) {
        return await this.handleAPI(method, pathname, req, res, parsedUrl.query);
      }

      // Page routes (SSR)
      return await this.handlePage(pathname, req, res, parsedUrl.query);

    } catch (error) {
      console.error('Request error:', error);

      // Run error handlers
      for (const handler of this.errorHandlers) {
        await handler(error, req, res);
      }

      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>500 Internal Server Error</h1><pre>${error.message}</pre>`);
    }
  }

  /**
   * Handle page requests (Server-Side Rendering)
   */
  async handlePage(pathname, req, res, query) {
    // Try to match route from Navigator
    const routeMatch = this.matchRoute(pathname);

    if (!routeMatch) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const { pageConfig, params } = routeMatch;

    // Check cache for static pages
    const cacheKey = `page:${pathname}`;
    if (this.cache.has(cacheKey) && pageConfig.cacheControl) {
      const cached = this.cache.get(cacheKey);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': pageConfig.cacheControl
      });
      res.end(cached);
      return;
    }

    // Fetch data using getServerSideProps or getStaticProps
    let props = { params, query };

    if (pageConfig.getServerSideProps) {
      props = await pageConfig.getServerSideProps({ params, query, req });
    } else if (pageConfig.getStaticProps) {
      props = await pageConfig.getStaticProps({ params, query });
    }

    // Render page to HTML using SSR
    const html = SSRRenderer.renderFullPage(
      pageConfig.component,
      props,
      { pathname, params, query },
      {
        title: props.title || 'Flutter App',
        description: props.description || '',
        image: props.image || '',
        url: props.url || `http://${req.headers.host}${pathname}`
      }
    );

    // Cache static pages with revalidation
    if (pageConfig.cacheControl && pageConfig.revalidate) {
      this.cache.set(cacheKey, html);

      // ISR: Regenerate after timeout
      setTimeout(() => {
        this.cache.delete(cacheKey);
        console.log(`🔄 ISR Revalidate: ${pathname}`);
      }, pageConfig.revalidate * 1000);
    }

    // Send response
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': pageConfig.cacheControl
    });
    res.end(html);
  }

  /**
   * Handle API requests
   */
  async handleAPI(method, pathname, req, res, query) {
    // Try direct match first
    const key = `${method} ${pathname}`;
    let handler = this.apiRoutes.get(key);

    // Try dynamic routes like /api/users/:id
    if (!handler) {
      for (const [pattern, h] of this.apiRoutes) {
        if (pattern.startsWith(method)) {
          const routePath = pattern.substring(method.length + 1);
          const params = this.extractParams(routePath, pathname);
          if (params) {
            handler = h;
            req.params = params;
            break;
          }
        }
      }
    }

    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API not found' }));
      return;
    }

    // Parse body for POST/PUT
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      req.body = await this.parseBody(req);
    }

    // Add helper methods
    req.json = async () => JSON.parse(req.body || '{}');
    req.query = query;

    // Set response helpers
    const wrappedRes = new ResponseWrapper(res);

    // Call handler
    try {
      await handler(req, wrappedRes);
    } catch (error) {
      console.error('API Error:', error);
      wrappedRes.status(500).json({ error: error.message });
    }
  }

  /**
   * Match route with dynamic parameters
   * /products/:id matches /products/123 → { id: '123' }
   */
  matchRoute(pathname) {
    for (const [path, pageConfig] of this.pages) {
      const params = this.extractParams(path, pathname);
      if (params !== null) {
        return { pageConfig, params };
      }
    }
    return null;
  }

  /**
   * Extract parameters from URL pattern
   */
  extractParams(pattern, pathname) {
    const patternParts = pattern.split('/').filter(p => p);
    const pathParts = pathname.split('/').filter(p => p);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const key = patternParts[i].substring(1);
        params[key] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }

    return params;
  }

  /**
   * Parse request body
   */
  parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  /**
   * Start the server
   */
  listen(port = this.config.port, callback) {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(port, this.config.host, () => {
      console.log(`
🚀 FlutterJS Server
   http://${this.config.host}:${port}
   Mode: ${this.config.dev ? '🔧 Development' : '📦 Production'}
      `);
      callback?.();
    });

    return server;
  }
}

/**
 * Response wrapper with helpers
 */
class ResponseWrapper {
  constructor(res) {
    this.res = res;
    this.statusCode = 200;
    this.headers = { 'Content-Type': 'application/json' };
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(data) {
    this.res.writeHead(this.statusCode, this.headers);
    this.res.end(JSON.stringify(data));
  }

  text(data) {
    this.headers['Content-Type'] = 'text/plain';
    this.res.writeHead(this.statusCode, this.headers);
    this.res.end(data);
  }

  html(data) {
    this.headers['Content-Type'] = 'text/html';
    this.res.writeHead(this.statusCode, this.headers);
    this.res.end(data);
  }

  redirect(path, statusCode = 302) {
    this.res.writeHead(statusCode, { Location: path });
    this.res.end();
  }

  setCookie(name, value, options = {}) {
    let cookie = `${name}=${encodeURIComponent(value)}`;
    if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
    if (options.path) cookie += `; Path=${options.path}`;
    if (options.httpOnly) cookie += '; HttpOnly';
    if (options.secure) cookie += '; Secure';
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
    
    this.headers['Set-Cookie'] = cookie;
    return this;
  }
}

export default FlutterJSServer;
```

### 1.3 Update CLI for SSR

**File: `src/cli/commands/dev.js` (updated)**

```javascript
import FlutterJSServer from '../../server/flutter-server.js';

export async function devCommand(port = 3000) {
  console.log(`\n🚀 Starting FlutterJS SSR dev server\n`);

  // Create server instance
  const server = new FlutterJSServer({
    port,
    dev: true
  });

  // Add logging middleware
  server.use(async (req, res) => {
    console.log(`${req.method} ${req.url}`);
    return true;
  });

  // Register pages from your app
  // Example:
  server.registerPage('/', HomePage, {
    getStaticProps: async () => ({
      title: 'Home',
      description: 'Welcome to FlutterJS'
    })
  });

  server.registerPage('/products/:id', ProductPage, {
    getServerSideProps: async ({ params }) => ({
      title: `Product ${params.id}`,
      product: await fetchProduct(params.id)
    })
  });

  // Register API routes
  server.registerAPI('GET', '/api/users', async (req, res) => {
    const users = await getUsers();
    res.json(users);
  });

  server.registerAPI('GET', '/api/products/:id', async (req, res) => {
    const product = await getProduct(req.params.id);
    res.json(product);
  });

  // Start
  server.listen(port, () => {
    console.log(`✅ Ready on http://localhost:${port}\n`);
  });
}
```

---

## 🟠 PHASE 2: SEO & Meta Tags (Weeks 4-5)

### 2.1 Create SEOHead Component

**File: `src/widgets/seo/seo-head.js`**

```javascript
/**
 * SEOHead Component
 * Manages meta tags dynamically on client and SSR
 * Works seamlessly with SSR rendering
 */

import { StatelessWidget } from '../../core/stateless-widget.js';

export class SEOHead extends StatelessWidget {
  constructor({
    title = 'My App',
    description = '',
    canonical = '',
    image = '',
    url = '',
    type = 'website',
    keywords = '',
    author = '',
    twitterHandle = '',
    robots = 'index, follow'
  } = {}) {
    super();

    this.title = title;
    this.description = description;
    this.canonical = canonical;
    this.image = image;
    this.url = url;
    this.type = type;
    this.keywords = keywords;
    this.author = author;
    this.twitterHandle = twitterHandle;
    this.robots = robots;

    // Update document head on client-side (after hydration)
    if (typeof document !== 'undefined') {
      this.updateHead();
    }
  }

  updateHead() {
    // Update title
    document.title = this.title;

    // Meta tags to set
    const metaTags = [
      { name: 'description', content: this.description },
      { name: 'keywords', content: this.keywords },
      { name: 'author', content: this.author },
      { name: 'robots', content: this.robots },

      // OpenGraph
      { property: 'og:title', content: this.title },
      { property: 'og:description', content: this.description },
      { property: 'og:image', content: this.image },
      { property: 'og:url', content: this.url },
      { property: 'og:type', content: this.type },

      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: this.title },
      { name: 'twitter:description', content: this.description },
      { name: 'twitter:image', content: this.image },
      ...(this.twitterHandle 
        ? [{ name: 'twitter:creator', content: this.twitterHandle }]
        : []
      )
    ];

    // Update or create meta tags
    metaTags.forEach(({ name, property, content }) => {
      const selector = property 
        ? `meta[property="${property}"]` 
        : `meta[name="${name}"]`;
      
      let tag = document.querySelector(selector);

      if (!tag) {
        tag = document.createElement('meta');
        if (name) tag.name = name;
        if (property) tag.property = property;
        document.head.appendChild(tag);
      }

      tag.content = content;
    });

    // Update canonical link
    if (this.canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = this.canonical;
    }
  }

  build(context) {
    // This is a head-only component
    // Returns nothing for rendering
    return null;
  }

  /**
   * Called by SSR renderer
   * Returns meta tags as HTML strings
   */
  getMetaHTML() {
    const escape = (str) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    return `
      <title>${escape(this.title)}</title>
      <meta name="description" content="${escape(this.description)}">
      ${this.keywords ? `<meta name="keywords" content="${escape(this.keywords)}">` : ''}
      ${this.author ? `<meta name="author" content="${escape(this.author)}">` : ''}
      <meta name="robots" content="${this.robots}">
      
      <!-- OpenGraph -->
      <meta property="og:title" content="${escape(this.title)}">
      <meta property="og:description" content="${escape(this.description)}">
      <meta property="og:image" content="${this.image}">
      <meta property="og:url" content="${this.url}">
      <meta property="og:type" content="${this.type}">
      
      <!-- Twitter Card -->
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${escape(this.title)}">
      <meta name="twitter:description" content="${escape(this.description)}">
      <meta name="twitter:image" content="${this.image}">
      ${this.twitterHandle ? `<meta name="twitter:creator" content="${escape(this.twitterHandle)}">` : ''}
      
      ${this.canonical ? `<link rel="canonical" href="${this.canonical}">` : ''}
    `;
  }
}

export default SEOHead;
```

### 2.2 Update SSR for SEO

**File: `src/ssr/ssr-renderer.js` (add method)**

```javascript
// Add this method to SSRRenderer class:

static extractSEOMeta(AppWidget, props) {
  try {
    const app = new AppWidget(props);
    const context = new BuildContext(app);
    
    // Build widget tree
    const vnode = app.build(context);
    
    // Find SEOHead in tree (recursively)
    const seoHead = this.findComponentInTree(vnode, 'SEOHead');
    
    if (seoHead && seoHead.getMetaHTML) {
      return seoHead.getMetaHTML();
    }
    
    return '';
  } catch (error) {
    console.warn('Error extracting SEO:', error);
    return '';
  }
}

static findComponentInTree(vnode, componentName) {
  if (!vnode) return null;
  
  // Check current component
  if (vnode.component?.name === componentName) {
    return vnode.component;
  }
  
  // Check children
  if (vnode.children && Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      const found = this.findComponentInTree(child, componentName);
      if (found) return found;
    }
  }
  
  return null;
}

// Update renderFullPage to use SEO:
static renderFullPage(AppWidget, props = {}, route = {}, config = {}) {
  const appHtml = this.renderToString(AppWidget, props, route);
  
  // Extract SEO meta tags
  const seoMeta = this.extractSEOMeta(AppWidget, props) || `
    <title>${config.title || 'Flutter App'}</title>
    <meta name="description" content="${config.description || ''}">
  `;

  const initialState = JSON.stringify({ props, route });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO Meta Tags -->
  ${seoMeta}
  
  <!-- Styles -->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #FAFAFA;
    }
  </style>
</head>
<body>
  <div id="root">${appHtml}</div>
  
  <script>
    window.__INITIAL_STATE__ = ${initialState};
    window.__HYDRATION__ = true;
  </script>
  
  <script type="module" src="/dist/app-client.js"><\/script>
</body>
</html>`;
}
```

---

## 🟡 PHASE 3: API Routes (Weeks 6-7)

### 3.1 Example Page with getServerSideProps

**File: `src/pages/products.js`**

```javascript
import { StatefulWidget, State } from '../core/index.js';
import { Column, Text, Container, ElevatedButton } from '../widgets/index.js';
import { SEOHead } from '../widgets/seo/seo-head.js';

export class ProductsPage extends StatefulWidget {
  createState() {
    return new _ProductsPageState();
  }
}

class _ProductsPageState extends State {
  constructor() {
    super();
    this.products = [];
  }

  initState() {
    // SSR will provide products via props
    // No need to fetch again on client
  }

  build(context) {
    return new Column({
      children: [
        new SEOHead({
          title: 'Products',
          description: 'Browse our products',
          url: 'https://example.com/products'
        }),

        new Text('Products', { style: { fontSize: '24px', fontWeight: 'bold' } }),

        ...this.props.products.map(product =>
          new Container({
            padding: 16,
            child: new Column({
              children: [
                new Text(product.name, { style: { fontSize: '18px' } }),
                new Text(`$${product.price}`),
                new ElevatedButton({
                  child: new Text('View'),
                  onPressed: () => {
                    // Navigate using Navigator (your existing system)
                    Navigator.push(context, `/products/${product.id}`);
                  }
                })
              ]
            })
          })
        )
      ]
    });
  }
}

// Server-side data fetching
export async function getServerSideProps({ params, query }) {
  // Fetch from database/API
  const products = await fetch('http://api.example.com/products')
    .then(r => r.json());

  return {
    props: {
      products,
      title: 'Products',
      description: 'Browse our amazing products'
    },
    // Revalidate every 60 seconds (ISR)
    revalidate: 60
  };
}
```

### 3.2 Example API Route

**File: `src/pages/api/products/[id].js`**

```javascript
/**
 * API Route: GET /api/products/:id
 * Returns product details
 */

export default async function handler(req, res) {
  const { id } = req.params;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Fetch product from database
    const product = await getProduct(id);

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Cache response
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Mock database function
async function getProduct(id) {
  const products = {
    '1': { id: 1, name: 'Product 1', price: 99.99, description: '...' },
    '2': { id: 2, name: 'Product 2', price: 149.99, description: '...' }
  };

  return products[id];
}
```

---

## 🟢 PHASE 4: Code Splitting & Lazy Loading (Weeks 8-9)

### 4.1 Create Lazy Component

**File: `src/widgets/lazy.js`**

```javascript
/**
 * Lazy Loading / Code Splitting
 * Load components on demand to reduce initial bundle
 */

import { StatefulWidget, State } from '../core/index.js';
import { CircularProgressIndicator } from './material/circular-progress-indicator.js';
import { Text } from './text/text.js';

export function lazy(importFunc) {
  return class LazyComponent extends StatefulWidget {
    createState() {
      return new _LazyState(importFunc);
    }
  };
}

class _LazyState extends State {
  constructor(importFunc) {
    super();
    this.importFunc = importFunc;
    this.Component = null;
    this.loading = true;
    this.error = null;
  }

  initState() {
    this.loadComponent();
  }

  async loadComponent() {
    try {
      // Dynamic import - code split at build time
      const module = await this.importFunc();
      this.setState({
        Component: module.default || module,
        loading: false
      });
    } catch (error) {
      this.setState({
        error,
        loading: false
      });
    }
  }

  build(context) {
    if (this.loading) {
      return new CircularProgressIndicator();
    }

    if (this.error) {
      return new Text(`Error loading: ${this.error.message}`);
    }

    if (!this.Component) {
      return new Text('Component not available');
    }

    // Render loaded component
    return new this.Component(this.props);
  }
}

export default lazy;
```

### 4.2 Example Usage - Lazy Route

**File: `src/pages/dashboard.js`**

```javascript
import { StatelessWidget } from '../core/index.js';
import { Column, Container } from '../widgets/index.js';
import { lazy } from '../widgets/lazy.js';
import { SEOHead } from '../widgets/seo/seo-head.js';

// Lazy load heavy components
const Analytics = lazy(() => import('./components/analytics.js'));
const Charts = lazy(() => import('./components/charts.js'));
const Reports = lazy(() => import('./components/reports.js'));

export class DashboardPage extends StatelessWidget {
  build(context) {
    return new Column({
      children: [
        new SEOHead({
          title: 'Dashboard',
          description: 'Your analytics dashboard'
        }),

        new Container({
          padding: 16,
          child: new Column({
            children: [
              // These load only when needed
              new Analytics(),    // Code-split #1
              new Charts(),       // Code-split #2
              new Reports()       // Code-split #3
            ]
          })
        })
      ]
    });
  }
}
```

---

## 🔵 PHASE 5: Caching & Performance (Weeks 10-11)

### 5.1 Create Caching Strategy

**File: `src/server/cache-manager.js`**

```javascript
/**
 * Cache Manager
 * Handles SSR caching, ISR, and revalidation
 */

export class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set cache with TTL
   * @param {String} key - Cache key
   * @param {Any} data - Data to cache
   * @param {Number} ttl - Time to live in seconds
   */
  set(key, data, ttl = 3600) {
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store data
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Set expiration
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.invalidate(key);
      }, ttl * 1000);

      this.timers.set(key, timer);
    }
  }

  /**
   * Get cached data
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const age = (Date.now() - entry.timestamp) / 1000;
    if (age > entry.ttl) {
      this.invalidate(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Invalidate cache (for ISR)
   */
  invalidate(key) {
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      entries: this.cache.size,
      memory: JSON.stringify(Array.from(this.cache.values())).length
    };
  }
}

export default CacheManager;
```

### 5.2 Integrate Cache into Server

**File: `src/server/flutter-server.js` (update)**

```javascript
// Add to FlutterJSServer constructor:
import CacheManager from './cache-manager.js';

this.cacheManager = new CacheManager();

// Update handlePage method:
async handlePage(pathname, req, res, query) {
  const routeMatch = this.matchRoute(pathname);

  if (!routeMatch) {
    res.writeHead(404);
    res.end('<h1>404 Not Found</h1>');
    return;
  }

  const { pageConfig, params } = routeMatch;
  const cacheKey = `page:${pathname}`;

  // Check cache first (ISR)
  const cached = this.cacheManager.get(cacheKey);
  if (cached) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': pageConfig.cacheControl,
      'X-Cache': 'HIT'
    });
    res.end(cached);
    return;
  }

  // ... fetch props and render ...

  // Cache the result
  const ttl = pageConfig.revalidate || 3600;
  this.cacheManager.set(cacheKey, html, ttl);

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': pageConfig.cacheControl,
    'X-Cache': 'MISS'
  });
  res.end(html);
}
```

---

## 📋 Project Structure After Integration

```
flutterjs-framework/
├── src/
│   ├── core/                    (existing)
│   │   ├── widget.js
│   │   ├── stateless-widget.js
│   │   ├── stateful-widget.js
│   │   └── build-context.js
│   │
│   ├── vdom/                    (existing)
│   │   ├── vnode.js
│   │   └── renderer.js
│   │
│   ├── widgets/                 (existing + new)
│   │   ├── layout/
│   │   ├── material/
│   │   ├── button/
│   │   ├── seo/                 ✨ NEW
│   │   │   └── seo-head.js
│   │   └── lazy.js              ✨ NEW
│   │
│   ├── server/                  ✨ NEW
│   │   ├── flutter-server.js
│   │   ├── cache-manager.js
│   │   └── middleware/
│   │       └── auth.js
│   │
│   ├── ssr/                     ✨ NEW
│   │   └── ssr-renderer.js
│   │
│   ├── pages/                   ✨ NEW
│   │   ├── index.js
│   │   ├── products.js
│   │   ├── products/[id].js
│   │   └── api/
│   │       ├── users.js
│   │       └── products/[id].js
│   │
│   ├── cli/
│   │   └── commands/
│   │       └── dev.js           (updated)
│   │
│   └── index.js                 (existing)
│
├── dist/                        (build output)
│   ├── flutter.js
│   ├── flutter.min.js
│   └── app-client.js
│
├── docs/
│   ├── SSR-GUIDE.md            ✨ NEW
│   ├── API-ROUTES.md           ✨ NEW
│   ├── SEO-GUIDE.md            ✨ NEW
│   └── LAZY-LOADING.md         ✨ NEW
│
└── examples/
    ├── ssr-app/                ✨ NEW
    ├── api-server/             ✨ NEW
    └── full-stack/             ✨ NEW
```

---

## 🚀 Complete Setup Example

**File: `example-app.js`**

```javascript
/**
 * Complete FlutterJS Full-Stack Example
 * Shows SSR, API routes, SEO, and code splitting
 */

import FlutterJSServer from './src/server/flutter-server.js';
import { HomePage } from './src/pages/index.js';
import { ProductsPage } from './src/pages/products.js';
import { ProductDetailPage } from './src/pages/products/[id].js';

// Create server
const server = new FlutterJSServer({
  port: 3000,
  dev: true
});

// Middleware
server.use(async (req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  return true; // Continue
});

// Pages with SSR + SEO
server.registerPage('/', HomePage, {
  getStaticProps: async () => ({
    title: 'Home - FlutterJS',
    description: 'Welcome to FlutterJS full-stack framework'
  })
});

server.registerPage('/products', ProductsPage, {
  getServerSideProps: async ({ query }) => ({
    products: await fetchProducts(query.sort),
    title: 'Products',
    description: 'Browse our products'
  }),
  revalidate: 60 // ISR: revalidate every 60 seconds
});

server.registerPage('/products/:id', ProductDetailPage, {
  getServerSideProps: async ({ params }) => ({
    product: await fetchProduct(params.id),
    title: `Product ${params.id}`,
    description: 'Product details'
  }),
  cacheControl: 'public, max-age=3600'
});

// API Routes
server.registerAPI('GET', '/api/products', async (req, res) => {
  const products = await fetchAllProducts();
  res.json(products);
});

server.registerAPI('GET', '/api/products/:id', async (req, res) => {
  const product = await fetchProduct(req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json(product);
});

server.registerAPI('POST', '/api/products', async (req, res) => {
  const body = await req.json();
  const product = await createProduct(body);
  res.status(201).json(product);
});

// Error handling
server.onError(async (error, req, res) => {
  console.error('❌ Error:', error.message);
});

// Start
server.listen(3000, () => {
  console.log('Ready for production! 🚀');
});

// Mock functions
async function fetchProducts(sort) {
  return [
    { id: 1, name: 'Product 1', price: 99.99 },
    { id: 2, name: 'Product 2', price: 149.99 }
  ];
}

async function fetchProduct(id) {
  return { id, name: `Product ${id}`, price: 99.99 };
}

async function fetchAllProducts() {
  return await fetchProducts();
}

async function createProduct(data) {
  return { id: 3, ...data };
}
```

---

## 📊 Integration Timeline

### Week 1-3: SSR Engine ✅
- [x] SSRRenderer class
- [x] FlutterJSServer with routing
- [x] Basic SSR support
- [x] CLI dev command

### Week 4-5: SEO System ✅
- [x] SEOHead component
- [x] Meta tag extraction
- [x] OpenGraph support
- [x] Twitter cards

### Week 6-7: API Routes ✅
- [x] API route handling
- [x] Request/response wrappers
- [x] Dynamic parameters
- [x] Error handling

### Week 8-9: Code Splitting ✅
- [x] Lazy component wrapper
- [x] Dynamic imports
- [x] Loading states
- [x] Error boundaries

### Week 10-11: Caching ✅
- [x] Cache manager
- [x] ISR (Incremental Static Regeneration)
- [x] TTL support
- [x] Performance monitoring

### Week 12+: Polish
- [ ] Build system integration
- [ ] Production deployment
- [ ] Documentation
- [ ] Examples

---

## ✅ How Features Connect

### 1. **SSR ↔ Navigator**
```javascript
// Your existing Navigator still works!
// SSR just pre-renders the initial page

Navigator.push(context, '/products/123');
// On server: Renders HTML
// On client: Navigator handles navigation
```

### 2. **API Routes ↔ Widgets**
```javascript
// Widgets fetch from your API routes
class ProductDetailPage extends StatefulWidget {
  initState() {
    // Fetch from /api/products/:id
    fetch(`/api/products/${this.productId}`)
      .then(r => r.json())
      .then(product => this.setState({ product }));
  }
}
```

### 3. **SEOHead ↔ SSR**
```javascript
// SEOHead renders meta tags on server
// On client, updates dynamically via Navigator

// In page component:
return new Column({
  children: [
    new SEOHead({ title: 'Products' }),
    // Page content
  ]
});
// SSR extracts and renders SEOHead meta tags
```

### 4. **Lazy ↔ Code Splitting**
```javascript
// Lazy components are automatically code-split
const HeavyChart = lazy(() => import('./chart.js'));

// Initial bundle: lightweight
// When HeavyChart renders: loads chart code
```

### 5. **Cache ↔ ISR**
```javascript
// Configure ISR in page
export async function getServerSideProps() {
  return {
    props: data,
    revalidate: 60  // Cache for 60s
  };
}

// Server automatically revalidates after 60s
```

---

## 🎯 Benefits After Integration

| Feature | Benefit | Use Case |
|---------|---------|----------|
| **SSR** | SEO-friendly, faster first load | Public websites, blogs |
| **SEO Meta Tags** | Social sharing, search engines | Product pages, articles |
| **API Routes** | Backend without separate server | CRUD operations, webhooks |
| **Code Splitting** | Smaller initial bundle | Large applications |
| **Caching/ISR** | Fast serving, fresh content | High-traffic sites |

---

## 🔧 Migration Checklist

- [ ] Add SSR renderer (`src/ssr/ssr-renderer.js`)
- [ ] Create server (`src/server/flutter-server.js`)
- [ ] Create cache manager (`src/server/cache-manager.js`)
- [ ] Add SEOHead widget (`src/widgets/seo/seo-head.js`)
- [ ] Add lazy function (`src/widgets/lazy.js`)
- [ ] Create pages directory (`src/pages/`)
- [ ] Create API routes (`src/pages/api/`)
- [ ] Update CLI dev command
- [ ] Update build system
- [ ] Add tests
- [ ] Write documentation
- [ ] Create examples

---

## 🎉 Result

You now have a **full-stack framework** that:

✅ **Renders on server** (SSR) for SEO  
✅ **Has built-in API routes** (no separate backend needed)  
✅ **Manages SEO tags** (OpenGraph, Twitter cards)  
✅ **Code splits automatically** (lazy loading)  
✅ **Caches intelligently** (ISR)  
✅ **Keeps Navigator system** (familiar API)  
✅ **Works with existing widgets** (no breaking changes)  

**Perfect for production apps! 🚀**