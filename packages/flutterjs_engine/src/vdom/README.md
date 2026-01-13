# @flutterjs/vdom

**Package**: `@flutterjs/vdom`  
**Description**: Virtual DOM implementation optimized for FlutterJS.

---

## Overview

The Virtual DOM (VDOM) package is responsible for converting the high-level Widget/Element descriptions into actual HTML DOM nodes. It implements a diffing algorithm to minimize DOM manipulations.

## Core Components

### 1. VNode
`vnode.js`: A lightweight JSON representation of a DOM node.
```javascript
{
  tag: 'div',
  props: { className: 'container' },
  children: [...]
}
```

### 2. Renderer
`vnode_renderer.js`: Converts VNodes to actual DOM elements (`document.createElement`).

### 3. Differ (Reconciliation)
`vnode_differ.js`: Compares two VNode trees and produces a list of patches (instructions).

### 4. Patch Applier
`patch_applier.js`: Applies the patches to the real DOM.
- `INSERT`
- `UPDATE`
- `REMOVE`
- `REORDER`

## Server-Side Rendering (SSR)
`ssr_renderer.js`: Implements `renderToString()` for generating HTML on the server.

## Style Conversion
`style_converter.js`: Converts Flutter-like style objects to CSS strings.

## Usage

This package is used by `@flutterjs/runtime` to render its Element tree.
