# SSR & SEO Integration Plan

Plan for integrating Server-Side Rendering and SEO features.

## Overview

Targeting 5 critical features:
1.  SSR Hydration
2.  SEO Meta Tags
3.  Node.js Server
4.  SSR Renderer
5.  Caching Strategy

## Phase 1: SSR Engine

### SSR Renderer (`src/ssr/ssr-renderer.js`)
- Render widgets to HTML string
- Recursively build widget tree on server
- Serialize initial state for hydration

### FlutterJS Server (`src/server/flutter-server.js`)
- Node.js server to handle requests
- Match routes to widgets
- Execute `getServerSideProps` / `getStaticProps`
- Serve pre-rendered HTML

## Phase 2: SEO & Meta Tags

### SEOHead Component (`src/widgets/seo/seo-head.js`)
- Manages `<head>` tags
- Supports Title, Description, OpenGraph, Twitter Cards
- Updates document title on client-side navigation
- Renders as meta tags during SSR

## Phase 3: Hydration

- Client-side entry point detects `window.__INITIAL_STATE__`
- Rehydrates the widget tree instead of full mount
- Attaches event listeners to existing DOM

## Render Modes

1.  **CSR (Client-Side)**: Standard SPA behavior.
2.  **SSR (Server-Side)**: Full HTML on first load, then hydration.
3.  **Hybrid**: Static generation for some pages, SSR/CSR for others.
