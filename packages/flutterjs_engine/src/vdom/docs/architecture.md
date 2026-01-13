# VDOM Architecture

The `@flutterjs/vdom` package implements a lightweight Virtual DOM specifically optimized for Flutter's widget model.

## Core Components

```mermaid
graph TD
    Widget[Flutter Widget] --> Builder[VNodeBuilder]
    Builder --> VNode[VNode Tree]
    VNode --> Differ[VNodeDiffer]
    Differ --> Patches[Patch List]
    Patches --> Patcher[PatchApplier]
    Patcher --> DOM[Real DOM]
    
    subgraph SSR
    VNode --> SSR[SSRRenderer]
    SSR --> HTML[HTML String]
    HTML --> Client[Client Browser]
    Client --> Hydrator[Hydrator]
    end
```

### 1. VNode System (`vnode.js`)
The fundamental unit of the UI. Unlike React's Fiber or Preact's VNode, our VNodes are designed to hold Flutter-specific metadata.
- **`tag`**: HTML tag name.
- **`props`**: HTML attributes.
- **`style`**: CSS styles object.
- **`events`**: Event listeners (stripped during SSR, re-attached during hydration).
- **`metadata`**: Debug info like `widgetType`, `statefulWidgetId`.

### 2. The Build Process (`vnode_builder.js`)
Converts a high-level Widget tree into a low-level VNode tree.
- Handles `StatefulWidget` lifecycle (createState, mount).
- Recursively builds `StatelessWidget`.
- Manages `InheritedWidget` context.
- Provides detailed error reporting with build stacks (e.g., `MyApp → HomePage → Container`).

### 3. Rendering Pipelines

#### Client-Side Rendering (CSR)
1.  **Build**: `VNodeBuilder` creates a fresh VNode tree.
2.  **Diff**: `VNodeDiffer` compares it with the previous tree.
3.  **Patch**: `PatchApplier` updates only the changed parts of the DOM.

#### Server-Side Rendering (SSR)
1.  **Render**: `SSRRenderer` traverses the VNode tree and outputs an HTML string.
2.  **Hydrate**: `Hydrator` on the client matches the existing DOM with a new VNode tree and attaches event listeners without re-rendering.

### 4. Indexing System
The `PatchApplier` uses a dot-notation indexing system to locate nodes efficiently without keeping references to every single DOM node.
- `0`: First child of root.
- `0.1`: Second child of the first child.
- `2.0.4`: Fifth child of the first child of the third child.
