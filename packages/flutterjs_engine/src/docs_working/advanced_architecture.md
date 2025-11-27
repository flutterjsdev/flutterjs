# Advanced Architecture Guide - SSR, CSR, MPA, SEO

This guide covers production-ready implementations of FlutterJS for different scenarios.

## 🎯 Architecture Patterns

### Pattern 1: Pure CSR (Client-Side Rendering)

**Use Case:** SPA, PWA, no SEO needed (internal tools, dashboards)

```javascript
// app.js (runs in browser)
import { runApp } from './flutter_app.js';
import { MyApp } from './pages/MyApp.js';

const app = runApp(new MyApp(), document.getElementById('root'));
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="app.js"></script>
</body>
</html>
```

**Pros:**
- Simple setup
- No server needed (static hosting)
- Good for internal apps

**Cons:**
- Bad for SEO
- Slow initial load (white screen)
- Not indexable by search engines

---

### Pattern 2: Pure SSR (Server-Side Rendering)

**Use Case:** Websites, blogs, MPA (multi-page apps)

```javascript
// server.js (Node.js with Express)
import express from 'express';
import { SSRRenderer } from './ssr_renderer.js';
import { MyApp } from './pages/MyApp.js';
import { SEOManager } from './seo_manager.js';

const app = express();

app.get('/', (req, res) => {
  SEOManager.init({ baseUrl: 'https://example.com' });
  SEOManager.setPageMeta({
    title: 'Home',
    description: 'Welcome to my site',
    keywords: ['home', 'welcome']
  });

  const html = SSRRenderer.renderToDocument(new MyApp(), {
    title: 'My Site',
    description: 'Welcome to my site'
  });

  res.send(html);
});

app.listen(3000);
```

```html
<!-- Generated HTML (sent from server) -->
<!DOCTYPE html>
<html>
<head>
  <title>Home</title>
  <meta name="description" content="Welcome to my site">
  <meta property="og:title" content="Home">
</head>
<body>
  <div id="root">
    <!-- Full HTML from server rendering -->
    <div class="app">...</div>
  </div>
  <script type="module" src="hydrator.js"></script>
</body>
</html>
```

**Pros:**
- Excellent for SEO
- Fast Time to First Paint (TFP)
- Works without JavaScript
- Great for websites

**Cons:**
- Server needed
- More complex setup
- Higher server load

---

### Pattern 3: Hybrid SSR + Hydration (Best)

**Use Case:** Content sites that need interactivity, e-commerce, blogs with comments

```javascript
// server.js
import express from 'express';
import { SSRRenderer } from './ssr_renderer.js';
import { ProductPage } from './pages/ProductPage.js';

const app = express();

app.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  const product = await fetchProduct(productId);

  // Render on server
  const { html, state } = SSRRenderer.renderWithState(
    new ProductPage({ productId }),
    { product, initialCount: 0 }
  );

  const document = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${product.name}</title>
      <meta name="description" content="${product.description}">
      <meta property="og:image" content="${product.image}">
    </head>
    <body>
      <div id="root">${html}</div>
      ${state}
      <script type="module" src="/client.js"></script>
    </body>
    </html>
  `;

  res.send(document);
});

app.listen(3000);
```

```javascript
// client.js (runs in browser after server HTML loads)
import { Hydrator } from './hydrator.js';
import { ProductPage } from './pages/ProductPage.js';

// Hydrate: attach event listeners to server-rendered HTML
Hydrator.hydrate(document.getElementById('root'), {
  widget: new ProductPage({ productId: 123 }),
  initialState: JSON.parse(
    document.getElementById('__INITIAL_STATE__').textContent
  )
});

// Now app is interactive!
```

**Timeline:**
```
User requests /products/123
    ↓
Server: fetch product → render HTML → send response
    ↓
Browser: receives full HTML (fast!)
    ↓
Display HTML immediately (Fast FCP!)
    ↓
Load client JavaScript
    ↓
Hydrate: attach event listeners
    ↓
App becomes interactive (First Interaction!)
    ↓
Total time: 1-2 seconds (vs 5-10s for CSR)
```

**Pros:**
- Fast initial load (SSR)
- SEO friendly
- Interactive quickly (hydration)
- Search engines see content
- Users see UI immediately

**Cons:**
- More complex
- Server needed
- More testing required

---

### Pattern 4: SSG (Static Site Generation)

**Use Case:** Marketing sites, documentation, blogs

```javascript
// build.js (runs at build time)
import fs from 'fs';
import { SSRRenderer } from './ssr_renderer.js';
import { HomePage } from './pages/HomePage.js';
import { BlogPage } from './pages/BlogPage.js';
import { getAllBlogPosts } from './api/blog.js';

// Build home page
const homePage = SSRRenderer.renderToDocument(new HomePage(), {
  title: 'My Blog'
});
fs.writeFileSync('dist/index.html', homePage);

// Build blog pages (one HTML file per post)
const posts = await getAllBlogPosts();
for (const post of posts) {
  const page = SSRRenderer.renderToDocument(
    new BlogPage({ postId: post.id }),
    {
      title: post.title,
      description: post.excerpt,
      ogImage: post.cover
    }
  );
  fs.writeFileSync(`dist/blog/${post.slug}.html`, page);
}

// Generate sitemap
const sitemap = SEOManager.generateSitemap([
  { url: '/', priority: 1.0 },
  ...posts.map(p => ({ url: `/blog/${p.slug}`, priority: 0.8 }))
]);
fs.writeFileSync('dist/sitemap.xml', sitemap);

console.log(`✅ Built ${posts.length + 1} pages`);
```

**Deployment:**
```bash
npm run build        # Generate all HTML files
# dist/ now contains:
# - index.html
# - blog/post1.html
# - blog/post2.html
# - blog/post3.html
# - sitemap.xml

# Upload to CDN / Static hosting (no server needed!)
```

**Pros:**
- Fastest possible (pure static)
- No server needed
- Perfect SEO
- Scales infinitely
- Cheap hosting (S3, CloudFront, etc.)

**Cons:**
- Can't have dynamic content per request
- Must rebuild for changes
- Not suitable for real-time data

---

### Pattern 5: ISR (Incremental Static Regeneration)

**Use Case:** Hybrid of SSG + dynamic (blogs with frequently changing posts)

```javascript
// server.js (with ISR)
import express from 'express';
import { SSRRenderer } from './ssr_renderer.js';
import { BlogPage } from './pages/BlogPage.js';

const app = express();
const cache = new Map();

app.get('/blog/:slug', async (req, res) => {
  const { slug } = req.params;
  
  // Check cache
  if (cache.has(slug)) {
    const { html, timestamp } = cache.get(slug);
    const age = (Date.now() - timestamp) / 1000;
    
    // Revalidate every 1 hour
    if (age < 3600) {
      res.send(html);
      return;
    }
  }

  // Cache miss or expired: render fresh
  const post = await fetchBlogPost(slug);
  const html = SSRRenderer.renderToDocument(
    new BlogPage({ postId: post.id }),
    {
      title: post.title,
      description: post.excerpt
    }
  );

  // Cache for next 1 hour
  cache.set(slug, { html, timestamp: Date.now() });
  res.send(html);
});

app.listen(3000);
```

**Flow:**
```
Request /blog/my-post
    ↓
Is it cached & fresh? → YES → Return cached HTML (instant!)
    ↓
Is it cached but stale? → Serve stale, regenerate in background
    ↓
Is it new? → Render on server, cache, return
```

**Pros:**
- Static performance for cached pages
- Fresh content when needed
- Scales well
- Can handle dynamic content

**Cons:**
- More complex caching logic
- Server needed for revalidation

---

## 🛠️ Complete Production Setup

### Project Structure

```
my-app/
├── src/
│   ├── pages/
│   │   ├── HomePage.js
│   │   ├── ProductPage.js
│   │   └── BlogPage.js
│   ├── components/
│   │   ├── Header.js
│   │   ├── Footer.js
│   │   └── Navigation.js
│   ├── api/
│   │   ├── products.js
│   │   └── blog.js
│   ├── styles/
│   │   └── main.css
│   └── utils/
│       └── helpers.js
│
├── server/
│   ├── index.js          (Express server)
│   ├── middleware/
│   │   ├── ssr.js        (SSR middleware)
│   │   └── seo.js        (SEO middleware)
│   └── routes/
│       ├── home.js
│       ├── products.js
│       └── blog.js
│
├── build/
│   ├── build.js          (Build script for SSG)
│   └── sitemap.js        (Generate sitemap)
│
├── tests/
│   ├── seo.test.js
│   ├── routing.test.js
│   └── hydration.test.js
│
├── public/
│   ├── favicon.ico
│   └── robots.txt
│
├── package.json
├── tsconfig.json         (if using TypeScript)
└── README.md
```

---

### Server Implementation (Express + SSR)

```javascript
// server/index.js
import express from 'express';
import compression from 'compression';
import { SSRRenderer } from '../src/ssr_renderer.js';
import { SEOManager } from '../src/seo_manager.js';
import { HomePage } from '../src/pages/HomePage.js';
import { ProductPage } from '../src/pages/ProductPage.js';

const app = express();

// Middleware
app.use(compression());
app.use(express.static('public'));

// Initialize SEO
SEOManager.init({
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  defaultTitle: 'My App',
  defaultDescription: 'A FlutterJS application'
});

// Routes
app.get('/', (req, res) => {
  SEOManager.setPageMeta({
    title: 'Home',
    description: 'Welcome to my app'
  });

  const html = SSRRenderer.renderToDocument(new HomePage(), {
    title: 'Home'
  });

  res.send(html);
});

app.get('/products/:id', async (req, res) => {
  const productId = req.params.id;
  
  try {
    const product = await fetchProduct(productId);
    
    SEOManager.setPageMeta({
      title: product.name,
      description: product.description,
      ogImage: product.image
    });

    const { html, state } = SSRRenderer.renderWithState(
      new ProductPage({ productId }),
      { product }
    );

    const document = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${product.name}</title>
        <meta name="description" content="${product.description}">
        <meta property="og:title" content="${product.name}">
        <meta property="og:image" content="${product.image}">
        <link rel="canonical" href="${process.env.BASE_URL}/products/${productId}">
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div id="root">${html}</div>
        ${state}
        <script type="module" src="/client.js"></script>
      </body>
      </html>
    `;

    res.send(document);
  } catch (error) {
    res.status(404).send('Product not found');
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Server error');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
```

---

### Client-Side Hydration

```javascript
// public/client.js
import { Hydrator } from '../src/hydrator.js';
import { Router } from '../src/router.js';
import { HomePage } from '../src/pages/HomePage.js';
import { ProductPage } from '../src/pages/ProductPage.js';

// Setup router
const router = new Router({ mode: 'history', base: '/' });

router.register([
  {
    path: '/',
    component: HomePage,
    meta: { title: 'Home' }
  },
  {
    path: '/products/:id',
    component: ProductPage,
    meta: { title: 'Product' }
  }
]);

// Hydrate existing HTML
Hydrator.hydrate(document.getElementById('root'), {
  debugMode: process.env.NODE_ENV === 'development'
});

// Start router for client-side navigation
router.start();
```

---

## 📊 Performance Comparison

### CSR (Client-Side Rendering Only)
```
Time    Event
─────   ──────────────────────
0ms     User requests page
200ms   HTML received (empty)
500ms   JS bundle downloaded
800ms   JS executed
1200ms  React/widget tree built
1500ms  DOM rendered
2000ms  Interactive

Initial Paint: 1500ms
Time to Interactive: 2000ms
SEO: ❌ Bad (search engine sees no content)
```

### SSR (Server-Side Rendering)
```
Time    Event
─────   ──────────────────────
0ms     User requests page
100ms   HTML with content received
200ms   Display HTML (first paint!)
400ms   JS bundle downloaded
600ms   JS executed
700ms   Hydrated (interactive!)

Initial Paint: 200ms ⚡ 7x faster!
Time to Interactive: 700ms ⚡ 3x faster!
SEO: ✅ Perfect (search engine sees full HTML)
```

### SSG (Pre-rendered Static)
```
Time    Event
─────   ──────────────────────
0ms     User requests page (from CDN)
30ms    Pre-rendered HTML received
40ms    Display HTML (instant!)
100ms   JS bundle downloaded
200ms   JS executed
250ms   Hydrated (interactive!)

Initial Paint: 40ms ⚡ 37x faster!
Time to Interactive: 250ms ⚡ 8x faster!
SEO: ✅ Perfect
Hosting: ✅ Super cheap (CDN)
```

---

## 🚀 Deployment Guide

### Option 1: Vercel (Best for SSR)
```bash
vercel deploy
# Automatically detects FlutterJS app
# Handles SSR, caching, CDN
```

### Option 2: AWS (Scalable)
```bash
# Lambda for SSR
# CloudFront for CDN
# S3 for static files

sam build
sam deploy
```

### Option 3: Docker (Self-hosted)
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server/index.js"]
```

```bash
docker build -t my-app .
docker run -p 3000:3000 my-app
```

### Option 4: Static Hosting (SSG Only)
```bash
npm run build        # Build to dist/
# Upload dist/ to:
# - Netlify
# - GitHub Pages
# - AWS S3 + CloudFront
# - Cloudflare Pages
```

---

## ✅ Checklist for Production

### SEO
- [ ] Meta tags set correctly
- [ ] Open Graph tags present
- [ ] Sitemap generated
- [ ] robots.txt created
- [ ] Canonical URLs set
- [ ] Structured data added
- [ ] Alt text on images
- [ ] Readable content structure

### Performance
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1s
- [ ] Time to Interactive < 3s
- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] Caching headers set
- [ ] Compression enabled
- [ ] CDN configured

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] SEO tests pass
- [ ] Mobile responsive
- [ ] Works without JS
- [ ] Analytics working
- [ ] Error tracking setup
- [ ] Load testing done

---

## 🎯 Decision Matrix

| Use Case | Recommended | Why |
|----------|-------------|-----|
| Dashboard/Internal tool | CSR | Simple, no SEO needed |
| Blog/Marketing site | SSG | Fast, no server needed |
| E-commerce | SSR + ISR | Dynamic content, SEO |
| Content site with real-time | SSR | Full control, dynamic |
| SPA with some SEO pages | Hybrid | Mix of SSR + CSR |
| High-traffic site | SSG + CDN | Maximum performance |

---

## 🔗 Quick Links

- [SSRRenderer API](./ssr_renderer.js)
- [Hydrator API](./hydrator.js)
- [SEOManager API](./seo_manager.js)
- [Router API](./router.js)
- [FlutterApp API](./flutter_app.js)

Done! You now have production-ready SSR, CSR, and MPA support! 🚀