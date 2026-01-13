# VDOM Documentation

Documentation for `@flutterjs/vdom`, the virtual DOM engine powering FlutterJS.

## Contents

- **[Architecture](architecture.md)**: System design, Builder, and SSR pipelines.
- **[Reconciliation](reconciliation.md)**: Diffing algorithm and patch types.
- **[Source Code](../src/)**: Direct link to source files.

## Quick Links
- **[Runtime](../runtime/docs/README.md)**: The higher-level package that uses this VDOM.

## Key Modules

- **`vnode.js`**: The virtual node data structure.
- **`vnode_builder.js`**: Converts Widgets to VNodes.
- **`vnode_differ.js`**: Generates patches between two VNode trees.
- **`patch_applier.js`**: Applies patches to the real DOM.
- **`ssr_renderer.js`**: Generates HTML strings.
- **`hydrator.js`**: Attaches events to SSR HTML.

## Direct Usage (Advanced)

While normally used via `flutterjs`, you can use the VDOM standalone:

```javascript
import { VNode, VNodeRenderer } from '@flutterjs/vdom';

// Create VNodes
const vnode = new VNode({
  tag: 'button',
  props: { className: 'btn' },
  children: ['Click Me'],
  events: {
    click: () => alert('Clicked!')
  }
});

// Render to DOM
const root = document.getElementById('root');
const renderer = new VNodeRenderer();
renderer.render(vnode, root);
```
