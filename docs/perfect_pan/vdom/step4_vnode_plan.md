# Step 4: VNode System & Rendering - Production Plan

## Overview

Step 4 converts analyzed widget code into a Virtual DOM (VNode) tree, then renders it to HTML/CSS/JS for both CSR (Client-Side Rendering) and SSR (Server-Side Rendering). This is the **heart of the framework**.

**Current Status:**
- ✅ Step 1-3: Analyzer complete (extracts metadata from main.fjs)
- ✅ Core widgets implemented (Text, Row, Column, Center, Container, etc.) with VNode support
- ❌ Step 4: VNode system needs completion and production hardening

**Goal:** Complete a production-ready VNode system that can:
1. Convert widget output → VNode tree
2. Render to DOM (CSR)
3. Render to HTML string (SSR)
4. Handle state updates efficiently (diffing/patching)
5. Support hydration (SSR → CSR)

---

## Step 4 Breakdown (4 Major Phases)

```
Step 4: VNode System & Rendering
│
├── Phase 4.1: VNode Core System (Weeks 1-2)
│   ├── VNode class enhancement
│   ├── VNode tree creation from widgets
│   ├── Props/style/events serialization
│   └── Basic rendering (DOM + SSR)
│
├── Phase 4.2: Rendering Pipeline (Weeks 3-4)
│   ├── VNodeRenderer (DOM creation)
│   ├── SSR renderer (HTML string)
│   ├── Dual-mode detection
│   └── Asset bundling (CSS, fonts)
│
├── Phase 4.3: Reconciliation & Diffing (Weeks 5-6)
│   ├── VNode differ (old vs new)
│   ├── Patch generation
│   ├── Patch application
│   └── Reconciliation strategy
│
└── Phase 4.4: State & Hydration (Weeks 7-8)
    ├── State binding system
    ├── setState integration
    ├── SSR → CSR hydration
    └── Hydratable metadata generation
```

---

## Phase 4.1: VNode Core System (Weeks 1-2)

### Objective
Solidify and extend the VNode class to handle all Flutter widget properties, then create a system to build VNode trees from widget output.

### 4.1.1 Enhanced VNode Class

**File:** `src/vnode/vnode.js`

**Responsibilities:**
- Store all widget properties (tag, props, children, events, etc.)
- Serialize to HTML (SSR)
- Convert to DOM (CSR)
- Support refs for state binding
- Support keys for list reconciliation

**Structure:**

```javascript
class VNode {
  constructor({
    tag,                    // 'div', 'button', 'span'
    props = {},            // HTML attributes {className, id, data-*}
    style = {},            // CSS styles {color, padding, etc.}
    children = [],         // VNode[] | string[]
    key = null,            // For list reconciliation
    ref = null,            // Callback: (element) => {}
    events = {},           // {click: fn, change: fn, ...}
    
    // Metadata for state binding
    statefulWidgetId = null,  // Which StatefulWidget owns this?
    stateProperty = null,      // Which state property does this display?
    isStateBinding = false,    // Does this node depend on state?
    updateFn = null            // Callback on state change
  })
  
  // Methods:
  toHTML()                // → HTML string (SSR)
  toDOM()                 // → DOM element (CSR)
  hydrate(domElement)     // Attach events to existing DOM
  toString()              // Debug representation
}
```

**Key Methods:**

```javascript
// SSR: VNode → HTML string
toHTML() {
  // Serialize opening tag with props/style
  // Recursively serialize children
  // Serialize closing tag
  // Return complete HTML
}

// CSR: VNode → DOM element
toDOM() {
  // Create DOM element
  // Apply props/styles
  // Attach event listeners
  // Recursively create children
  // Cache element reference
  // Return DOM element
}

// Hydration: Attach events to SSR-rendered DOM
hydrate(domElement) {
  // Attach event listeners to existing DOM
  // Recursively hydrate children
  // Build VNode→DOM mapping
  // Return element
}
```

**Validation:**
- ✅ Create empty VNode
- ✅ VNode with children
- ✅ VNode with events
- ✅ toHTML() produces valid HTML
- ✅ toDOM() produces DOM element
- ✅ hydrate() attaches events

---

### 4.1.2 VNode Builder System

**File:** `src/vnode/vnode-builder.js`

**Purpose:** Convert widget output into VNode tree.

**Process:**

```
Widget.build(context)
    ↓
Returns: Container, Text, Column, etc.
    ↓
VNodeBuilder processes
    ↓
- Detects widget type
- Extracts visual properties
- Converts event handlers (onPressed → click)
- Processes children recursively
- Attaches metadata
    ↓
Returns: VNode tree
```

**Architecture:**

```javascript
class VNodeBuilder {
  // Convert widget to VNode
  static build(widget, context) {
    // Dispatch to appropriate converter
    if (widget instanceof Text) return this.buildText(widget, context);
    if (widget instanceof Container) return this.buildContainer(widget, context);
    if (widget instanceof Column) return this.buildColumn(widget, context);
    // ... etc for all widgets
  }
  
  // Widget-specific converters
  static buildText(textWidget, context) {
    // Extract text content
    // Extract style (fontSize, color, fontWeight, etc.)
    // Return VNode({ tag: 'span', ... })
  }
  
  static buildContainer(containerWidget, context) {
    // Extract padding, margin, color, decoration
    // Build child recursively
    // Return VNode({ tag: 'div', ... })
  }
  
  static buildColumn(columnWidget, context) {
    // Build all children
    // Apply layout (flex-direction: column)
    // Apply alignment (mainAxisAlignment, crossAxisAlignment)
    // Return VNode({ tag: 'div', style: {display: 'flex'}, ... })
  }
  
  // ... converters for all widgets
}
```

**Widget Converter Registry:**

Create a converter for each widget type:
- **Text** → span/div with text content
- **Button/ElevatedButton** → button element
- **Container** → div with padding/color/decoration
- **Column/Row** → div with flexbox
- **Center/Align** → div with flexbox centering
- **Padding** → div with padding
- **Scaffold** → semantic layout structure
- **AppBar** → header element
- **FloatingActionButton** → fixed button
- **Icon** → svg or icon font
- **Image** → img element
- **TextField** → input element
- **Checkbox/Radio** → input + label
- **ListView/GridView** → ul/ol or grid
- **Card** → div with border-radius and shadow
- **Divider** → hr element
- **SizedBox** → div with fixed dimensions

**Props Mapping (Widget → HTML):**

```javascript
// Padding: EdgeInsets → CSS padding
EdgeInsets.all(16) → padding: '16px'
EdgeInsets.symmetric({h: 8, v: 4}) → padding: '4px 8px'

// Color: Color → CSS backgroundColor
Color(0xFF6750A4) → backgroundColor: '#6750A4'

// TextStyle: Flutter style → CSS
TextStyle({
  fontSize: 18,
  color: Colors.black,
  fontWeight: FontWeight.bold
}) → {
  fontSize: '18px',
  color: '#000000',
  fontWeight: 'bold'
}

// Alignment: Alignment → CSS flexbox
Alignment.center → {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
}

// MainAxisAlignment: MainAxisAlignment → CSS
MainAxisAlignment.spaceEvenly → justifyContent: 'space-evenly'
```

**Event Handler Conversion:**

```javascript
// Flutter event handlers → Browser events
onPressed: () => {} → click: () => {}
onChanged: (v) => {} → change: (e) => {}
onTap: () => {} → click: () => {}
onFocus: () => {} → focus: () => {}
onBlur: () => {} → blur: () => {}
```

**Validation Tests:**

- ✅ Text widget → VNode with span
- ✅ Container with children → nested VNodes
- ✅ Button with onPressed → VNode with click event
- ✅ Column with children → VNode with flex column
- ✅ Deeply nested structure → correct VNode tree
- ✅ All props converted correctly
- ✅ All events mapped correctly

---

### 4.1.3 Style System

**File:** `src/vnode/style-converter.js`

Convert Flutter-style properties to CSS.

**Key Conversions:**

```javascript
class StyleConverter {
  // EdgeInsets → padding/margin
  static edgeInsetsToPadding(insets) {
    return `${insets.top}px ${insets.right}px ${insets.bottom}px ${insets.left}px`;
  }
  
  // Color → hex
  static colorToCss(color) {
    // Handle Color(0xFFFFFFFF) format
    // Handle named colors (Colors.red, etc.)
    // Handle opacity
  }
  
  // TextStyle → font CSS
  static textStyleToCss(textStyle) {
    return {
      fontSize: `${textStyle.fontSize}px`,
      color: this.colorToCss(textStyle.color),
      fontWeight: textStyle.fontWeight || 'normal',
      fontStyle: textStyle.fontStyle || 'normal',
      letterSpacing: textStyle.letterSpacing ? `${textStyle.letterSpacing}px` : 'normal'
    };
  }
  
  // BoxShadow → CSS shadow
  static boxShadowToCss(shadow) {
    return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blurRadius}px ${shadow.color}`;
  }
  
  // BorderRadius → CSS
  static borderRadiusToCss(radius) {
    if (radius.all) return `${radius.all}px`;
    return `${radius.topLeft}px ${radius.topRight}px ${radius.bottomRight}px ${radius.bottomLeft}px`;
  }
}
```

**Material Design Theme Variables:**

Create CSS custom properties (variables) for Material Design:

```css
:root {
  --md-sys-color-primary: #6750a4;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #eaddff;
  --md-sys-color-on-primary-container: #21005e;
  --md-sys-color-surface: #fffbfe;
  --md-sys-color-on-surface: #1c1b1f;
  --md-sys-color-outline: #79747e;
  --md-sys-color-outline-variant: #cac7cf;
  
  --md-typescale-headline-large-font: 'Roboto';
  --md-typescale-headline-large-size: 32px;
  --md-typescale-headline-large-weight: 400;
  --md-typescale-headline-large-line-height: 40px;
  
  /* ... more variables ... */
}
```

**Validation:**
- ✅ All Flutter colors convert to valid hex
- ✅ All EdgeInsets convert to CSS padding
- ✅ All TextStyle convert to valid CSS
- ✅ Theme variables applied correctly

---

## Phase 4.2: Rendering Pipeline (Weeks 3-4)

### Objective
Build complete rendering pipeline for both CSR and SSR modes.

### 4.2.1 VNodeRenderer (CSR)

**File:** `src/vnode/vnode-renderer.js`

Convert VNode tree → DOM elements.

**Key Methods:**

```javascript
class VNodeRenderer {
  // Main entry point
  static render(vnode, targetElement) {
    const domElement = this.createDOMNode(vnode);
    targetElement.innerHTML = '';
    targetElement.appendChild(domElement);
    return domElement;
  }
  
  // Create single DOM node from VNode
  static createDOMNode(vnode) {
    if (typeof vnode === 'string') return document.createTextNode(vnode);
    if (!vnode) return document.createTextNode('');
    if (!(vnode instanceof VNode)) return document.createTextNode(String(vnode));
    
    // Create element
    const element = document.createElement(vnode.tag);
    
    // Apply props/styles
    this.applyProps(element, vnode.props);
    this.applyStyles(element, vnode.style);
    
    // Attach events
    this.applyEvents(element, vnode.events);
    
    // Add children
    if (vnode.children && Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        const childNode = this.createDOMNode(child);
        if (childNode) element.appendChild(childNode);
      });
    }
    
    // Cache VNode reference
    element._vnode = vnode;
    vnode._element = element;
    
    // Call ref callback
    if (typeof vnode.ref === 'function') {
      vnode.ref(element);
    }
    
    return element;
  }
  
  // Apply props to element
  static applyProps(element, props) {
    if (!props) return;
    
    Object.entries(props).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      if (key === 'className') {
        element.className = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else {
        try {
          element[key] = value;
        } catch {
          element.setAttribute(key, String(value));
        }
      }
    });
  }
  
  // Apply styles to element
  static applyStyles(element, styles) {
    if (!styles || typeof styles !== 'object') return;
    
    Object.entries(styles).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        element.style[key] = value;
      }
    });
  }
  
  // Attach event listeners
  static applyEvents(element, events) {
    if (!events) return;
    
    Object.entries(events).forEach(([eventName, handler]) => {
      if (typeof handler !== 'function') return;
      
      // Remove 'on' prefix (onClick → click)
      const name = eventName.replace(/^on/, '').toLowerCase();
      element.addEventListener(name, handler);
    });
  }
}
```

**Validation:**
- ✅ Simple VNode renders to DOM
- ✅ Nested VNodes render recursively
- ✅ Props applied correctly
- ✅ Styles applied correctly
- ✅ Events attached correctly
- ✅ Ref callbacks called

---

### 4.2.2 SSRRenderer (Server-Side)

**File:** `src/vnode/ssr-renderer.js`

Convert VNode tree → HTML string (for server rendering).

**Key Methods:**

```javascript
class SSRRenderer {
  // Main entry point
  static render(vnode, options = {}) {
    const html = this.renderVNode(vnode, options);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${options.criticalCSS || ''}</style>
</head>
<body>
  <div id="root">${html}</div>
  <script id="hydration-data" type="application/json">${JSON.stringify(options.hydrationData || {})}</script>
  <script src="runtime.js"><\/script>
</body>
</html>`;
  }
  
  // Render single VNode to HTML string
  static renderVNode(vnode, options) {
    if (typeof vnode === 'string') {
      return this.escapeHTML(vnode);
    }
    
    if (!vnode || !(vnode instanceof VNode)) {
      return '';
    }
    
    // Build opening tag
    const attrs = this.serializeAttrs(vnode.props, vnode.style);
    const openTag = `<${vnode.tag}${attrs ? ' ' + attrs : ''}>`;
    
    // Self-closing tags
    if (this.isVoidTag(vnode.tag)) {
      return openTag;
    }
    
    // Render children
    const childrenHTML = (vnode.children || [])
      .map(child => this.renderVNode(child, options))
      .join('');
    
    return `${openTag}${childrenHTML}</${vnode.tag}>`;
  }
  
  // Serialize props to HTML attributes
  static serializeAttrs(props, styles) {
    const attrs = [];
    
    // Props
    if (props) {
      Object.entries(props).forEach(([key, value]) => {
        if (value === null || value === undefined || value === false) return;
        if (value === true) attrs.push(key);
        else attrs.push(`${key}="${this.escapeAttribute(String(value))}"`);
      });
    }
    
    // Inline styles
    if (styles && typeof styles === 'object') {
      const styleStr = Object.entries(styles)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
      attrs.push(`style="${this.escapeAttribute(styleStr)}"`);
    }
    
    return attrs.join(' ');
  }
  
  // Check if tag is self-closing
  static isVoidTag(tag) {
    return ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tag);
  }
  
  // Escape HTML special characters
  static escapeHTML(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, c => map[c]);
  }
  
  static escapeAttribute(str) {
    return this.escapeHTML(str);
  }
}
```

**Critical CSS Extraction:**

Extract only CSS needed for initial render (avoid render-blocking):

```javascript
class CriticalCSSExtractor {
  static extract(vnode, allStyles) {
    // Analyze VNode tree
    // Find all classes and IDs used
    // Extract only relevant CSS rules
    // Return as string
  }
}
```

**Validation:**
- ✅ Simple VNode renders to HTML string
- ✅ Nested VNodes render correctly
- ✅ HTML is valid and properly escaped
- ✅ Self-closing tags handled
- ✅ Props serialized correctly
- ✅ Styles serialized correctly
- ✅ No event handlers in output

---

### 4.2.3 Dual-Mode Detection

**File:** `src/vnode/render-engine.js`

Automatically detect environment and use correct renderer.

```javascript
class RenderEngine {
  static render(vnode, target, options = {}) {
    // Detect environment
    const isServer = typeof window === 'undefined';
    const isClient = typeof window !== 'undefined';
    
    if (isServer) {
      // SSR mode
      return SSRRenderer.render(vnode, {
        ...options,
        criticalCSS: this.extractCriticalCSS(vnode),
        hydrationData: this.generateHydrationData(vnode)
      });
    }
    
    if (isClient) {
      // CSR mode
      return VNodeRenderer.render(vnode, target);
    }
  }
  
  static generateHydrationData(vnode) {
    // Generate metadata for client-side hydration
    return {
      version: '1.0',
      widgets: this.extractWidgets(vnode),
      stateBindings: this.extractStateBindings(vnode),
      eventHandlers: this.extractEventHandlers(vnode)
    };
  }
}
```

**Validation:**
- ✅ Server environment detected correctly
- ✅ Client environment detected correctly
- ✅ Correct renderer used for each environment

---

## Phase 4.3: Reconciliation & Diffing (Weeks 5-6)

### Objective
Implement efficient diffing algorithm to minimize DOM updates.

### 4.3.1 VNode Differ

**File:** `src/vnode/vnode-differ.js`

Compare old and new VNode trees, generate patches.

**Algorithm:**

```javascript
class VNodeDiffer {
  static diff(oldVNode, newVNode, index = 0) {
    const patches = [];
    
    // Both null → no change
    if (!oldVNode && !newVNode) {
      return patches;
    }
    
    // New node → CREATE
    if (!oldVNode && newVNode) {
      patches.push(new Patch(PatchType.CREATE, index, newVNode));
      return patches;
    }
    
    // Node removed → REMOVE
    if (oldVNode && !newVNode) {
      patches.push(new Patch(PatchType.REMOVE, index, oldVNode));
      return patches;
    }
    
    // Text nodes changed → UPDATE_TEXT
    if (typeof oldVNode === 'string' || typeof newVNode === 'string') {
      if (oldVNode !== newVNode) {
        patches.push(new Patch(PatchType.UPDATE_TEXT, index, oldVNode, newVNode));
      }
      return patches;
    }
    
    // VNodes with different tags → REPLACE
    if (oldVNode.tag !== newVNode.tag) {
      patches.push(new Patch(PatchType.REPLACE, index, oldVNode, newVNode));
      return patches;
    }
    
    // Same element type → check children and props
    patches.push(...this.diffProps(oldVNode, newVNode, index));
    patches.push(...this.diffEvents(oldVNode, newVNode, index));
    patches.push(...this.diffChildren(oldVNode.children, newVNode.children, index));
    
    return patches;
  }
  
  static diffProps(oldVNode, newVNode, index) {
    // Compare props objects
    // Return UPDATE_PROPS patches if different
  }
  
  static diffEvents(oldVNode, newVNode, index) {
    // Compare event handlers
    // Return UPDATE_EVENTS patches if different
  }
  
  static diffChildren(oldChildren = [], newChildren = [], parentIndex) {
    // Diff children arrays
    // Handle keyed reconciliation if keys present
    // Return patches for each child
  }
}
```

**Patch System:**

```javascript
const PatchType = {
  CREATE: 'CREATE',           // New node
  REMOVE: 'REMOVE',           // Delete node
  REPLACE: 'REPLACE',         // Replace with different node
  UPDATE_PROPS: 'UPDATE_PROPS',  // Props changed
  UPDATE_TEXT: 'UPDATE_TEXT',    // Text content changed
  UPDATE_EVENTS: 'UPDATE_EVENTS', // Event handlers changed
  REORDER: 'REORDER'          // Children reordered
};

class Patch {
  constructor(type, index, oldVNode, newVNode) {
    this.type = type;
    this.index = index;        // Position in tree
    this.oldVNode = oldVNode;
    this.newVNode = newVNode;
  }
}
```

**Key-Based Reconciliation:**

Handle list items with keys for efficient reordering:

```javascript
// With keys, renderer knows which items moved
<Column>
  {items.map(item => Text({key: item.id, text: item.name}))}
</Column>

// Old: [Text({key: '1'}), Text({key: '2'}), Text({key: '3'})]
// New: [Text({key: '2'}), Text({key: '1'}), Text({key: '3'})]
// Diff recognizes reordering, not replace
```

**Validation:**
- ✅ Identical vnodes → no patches
- ✅ Text change → UPDATE_TEXT patch
- ✅ Prop change → UPDATE_PROPS patch
- ✅ Different tags → REPLACE patch
- ✅ Child added → CREATE patch
- ✅ Child removed → REMOVE patch
- ✅ Keyed reconciliation works

---

### 4.3.2 Patch Application

**File:** `src/vnode/patch-applier.js`

Apply patches to actual DOM.

```javascript
class PatchApplier {
  static apply(domElement, patches) {
    patches.forEach(patch => {
      const targetElement = this.findElement(domElement, patch.index);
      
      if (!targetElement) {
        console.warn(`Element not found at ${patch.index}`);
        return;
      }
      
      switch (patch.type) {
        case PatchType.CREATE:
          this.applyCreate(targetElement, patch);
          break;
        case PatchType.REMOVE:
          this.applyRemove(targetElement, patch);
          break;
        case PatchType.REPLACE:
          this.applyReplace(targetElement, patch);
          break;
        case PatchType.UPDATE_PROPS:
          this.applyUpdateProps(targetElement, patch);
          break;
        case PatchType.UPDATE_TEXT:
          this.applyUpdateText(targetElement, patch);
          break;
        case PatchType.UPDATE_EVENTS:
          this.applyUpdateEvents(targetElement, patch);
          break;
      }
    });
  }
  
  static findElement(root, index) {
    // Navigate DOM tree by index path
    // Format: "0.1.2" = root's 0th child's 1st child's 2nd child
  }
  
  static applyCreate(parent, patch) {
    // Create new DOM element from VNode
    // Insert at correct position
  }
  
  static applyRemove(parent, patch) {
    // Remove child from DOM
  }
  
  static applyReplace(parent, patch) {
    // Replace child with new node
  }
  
  // ... etc
}
```

**Batching Updates:**

Use `requestAnimationFrame` for smooth updates:

```javascript
class UpdateScheduler {
  static schedule(updates) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        updates.forEach(update => {
          PatchApplier.apply(update.element, update.patches);
        });
        resolve();
      });
    });
  }
}
```

**Validation:**
- ✅ Single patch applied correctly
- ✅ Multiple patches applied in order
- ✅ DOM ends in correct state
- ✅ Events still attached after update
- ✅ No memory leaks (old refs cleaned)

---

## Phase 4.4: State & Hydration (Weeks 7-8)

### Objective
Integrate state management and handle SSR→CSR transition.

### 4.4.1 State Binding System

**File:** `src/vnode/state-binding.js`

Link VNode properties to state values.

```javascript
class StateBinding {
  constructor(statefulWidgetId, stateProperty, vnode) {
    this.statefulWidgetId = statefulWidgetId;
    this.stateProperty = stateProperty;
    this.vnode = vnode;
    this.domElement = null;
  }
  
  // Update DOM when state changes
  updateDOM(newValue) {
    if (!this.domElement) return;
    
    // Different update strategies based on binding type
    if (this.vnode.tag === 'span' || this.vnode.tag === 'div') {
      // Text content binding
      this.domElement.textContent = String(newValue);
    } else if (this.vnode.tag === 'input') {
      // Input value binding
      this.domElement.value = String(newValue);
    } else if (this.vnode.tag === 'img') {
      // Image src binding
      this.domElement.src = String(newValue);
    }
  }
}

class StateBindingRegistry {
  constructor() {
    this.bindings = new Map(); // statefulWidgetId → [StateBinding]
  }
  
  register(binding) {
    if (!this.bindings.has(binding.statefulWidgetId)) {
      this.bindings.set(binding.statefulWidgetId, []);
    }
    this.bindings.get(binding.statefulWidgetId).push(binding);
  }
  
  // Called when state changes
  updateState(statefulWidgetId, stateProperty, newValue) {
    const bindings = this.bindings.get(statefulWidgetId) || [];
    
    bindings
      .filter(b => b.stateProperty === stateProperty)
      .forEach(b => b.updateDOM(newValue));
  }
}
```

**Integration with setState:**

When `setState` is called, update DOM via bindings:

```javascript
// In StatefulWidget/State class
setState(newState) {
  // Update internal state
  Object.assign(this.state, newState);
  
  // Rebuild VNode tree
  const newVNode = this.build(this.context);
  
  // Diff with old VNode
  const patches = VNodeDiffer.diff(this._oldVNode, newVNode);
  
  // Apply patches to DOM
  PatchApplier.apply(this._rootElement, patches);
  
  // Update state bindings
  this._stateBindingRegistry.updateState(
    this.widgetId,
    Object.keys(newState),
    Object.values(newState)
  );
  
  // Store for next diff
  this._oldVNode = newVNode;
}
```

**Validation:**
- ✅ State changes trigger DOM update
- ✅ Only affected nodes updated
- ✅ State values reflected in DOM
- ✅ Multiple bindings work correctly

---

### 4.4.2 Hydration System

**File:** `src/vnode/hydrator.js`

Attach JavaScript to SSR-rendered HTML.

**Process:**

```
Server renders: <div id="root">...HTML...</div>
Server sends: hydrationData = {widgets, events, state}
Client receives: HTML + hydrationData + runtime.js
Client hydrates:
  1. Find matching DOM elements
  2. Recreate VNode tree from hydrationData
  3. Attach event listeners
  4. Initialize state
  5. Ready for user interaction
```

**Implementation:**

```javascript
class Hydrator {
  static hydrate(rootElement, hydrationData) {
    // Recreate VNode tree from metadata
    const vnodeTree = this.recreateVNodeTree(hydrationData.widgets);
    
    // Attach event listeners to existing