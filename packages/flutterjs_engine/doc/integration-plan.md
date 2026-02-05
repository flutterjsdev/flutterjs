# FlutterJS Integration & Features Plan

A comprehensive roadmap for integrating missing features and achieving full framework parity.

## 🎯 Architecture Overview

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
└─────────────────────────────────────────────┘
```

## 🗓️ Phase 1: Server-Side Rendering (Weeks 1-3)

### 1.1 SSR Renderer (`src/ssr/`)
Create a renderer that outputs HTML strings instead of DOM nodes.
- **Input**: Widget Tree
- **Output**: HTML String + Initial State JSON
- **Mechanism**: `renderToString(Widget)`

### 1.2 Node.js Server (`src/server/`)
A custom server (built on `http`) to handle requests.
- Route matching against Navigator routes.
- Data fetching interfaces (`getServerSideProps`).
- Serving static assets.

## 🗓️ Phase 2: SEO & Meta Tags (Weeks 4-5)

### 2.1 SEOHead Widget
A `StatelessWidget` that doesn't render DOM, but modifies `<head>`.
```javascript
SEOHead({
  title: 'My Page',
  meta: { description: '...' }
})
```

### 2.2 Meta Tag Manager
- **Client**: Updates `document.title` and `<meta>` tags on route change.
- **Server**: Injects tags into the initial HTML template.

## 🗓️ Phase 3: Advanced Hydration (Week 6)

### 3.1 State Serialization
Mechanism to serialize `Widget` state and `props` to JSON.
- Needs to handle circular references and specialized objects.

### 3.2 Client Re-hydration
- Read `window.__INITIAL_STATE__`.
- Initialize Widget tree with this state.
- "Attach" to existing DOM nodes instead of creating new ones.

## 🗓️ Phase 4: Developer Experience (Week 7-8)

### 4.1 HMR (Hot Module Replacement)
Improve the current hot reload to preserve state during code updates.

### 4.2 DevTools Integration
Connect to `flutterjs_dev_tools` for widget inspection and performance profiling.

## Feature Checklist

- [ ] SSR Renderer Logic
- [ ] Node.js Server Implementation
- [ ] `SEOHead` Widget
- [ ] Hydration Logic
- [ ] `getServerSideProps` Data Fetching
- [ ] Route-based Code Splitting
- [ ] Service Worker / PWA Support
