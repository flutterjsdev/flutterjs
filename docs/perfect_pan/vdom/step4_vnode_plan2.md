# Step 4: VNode System & Rendering - Production Plan

## Overview

Step 4 converts analyzed widget code into Virtual DOM (VNode), then renders to HTML/CSS/JS for CSR and SSR.

**Current Status:** Analyzer complete (Step 1-3), core widgets with VNode support exist.

**Goal:** Production-ready VNode system for 8 weeks.

---

## Step 4 Phases (4 phases × 2 weeks each)

### Phase 4.1: VNode Core (Weeks 1-2)

**Deliverable:** Complete VNode class + Builder system

**Files to Create:**
- `src/vnode/vnode.js` - Enhanced VNode class
- `src/vnode/vnode-builder.js` - Widget → VNode converter
- `src/vnode/style-converter.js` - Flutter styles → CSS

**VNode Class Structure:**
```javascript
class VNode {
  constructor({
    tag,                    // 'div', 'button', 'span'
    props = {},            // HTML attributes
    style = {},            // CSS styles
    children = [],         // VNode[] | string[]
    key = null,            // List reconciliation
    ref = null,            // DOM element callback
    events = {},           // {click: fn, ...}
    statefulWidgetId = null,  // State binding
    stateProperty = null,
    isStateBinding = false,
    updateFn = null
  })
  
  toHTML()                // → HTML string (SSR)
  toDOM()                 // → DOM element (CSR)
  hydrate(domElement)     // Attach events to SSR DOM
}
```

**VNodeBuilder Pattern:**
```javascript
class VNodeBuilder {
  static build(widget, context) {
    if (widget instanceof Text) return this.buildText(widget);
    if (widget instanceof Container) return this.buildContainer(widget);
    if (widget instanceof Column) return this.buildColumn(widget);
    // ... dispatcher for all widgets
  }
  
  static buildText(widget) {
    return new VNode({
      tag: 'span',
      props: { className: 'fjs-text' },
      style: this.extractTextStyle(widget),
      children: [widget.data]
    });
  }
  
  // Similar methods for each widget type
}
```

**Widget Converters Map:**
- Text → span
- Button → button
- Container → div
- Column/Row → div (flexbox)
- Center/Align → div (flexbox)
- Scaffold → semantic structure
- AppBar → header
- FloatingActionButton → fixed button
- Icon → svg
- TextField → input
- Card → div with shadow
- ListView → ul/ol
- Checkbox/Radio → input+label
- Image → img

**Props Mapping:**
- EdgeInsets → padding/margin CSS
- Color → hex RGB
- TextStyle → font CSS
- Alignment → flexbox
- BoxDecoration → border/shadow/color

**Tests:**
- ✅ All widget types convert correctly
- ✅ Props/styles mapped accurately
- ✅ Nested structures work
- ✅ Event handlers preserved

**Timeline:** 14 days
- Days 1-2: VNode class design + tests
- Days 3-7: Widget converters (8-10 converters)
- Days 8-10: Style converter + mapping tests
- Days 11-14: Integration test on test.fjs

---

### Phase 4.2: Rendering Pipeline (Weeks 3-4)

**Deliverable:** CSR + SSR renderers + dual-mode detection

**Files to Create:**
- `src/vnode/vnode-renderer.js` - CSR (DOM rendering)
- `src/vnode/ssr-renderer.js` - SSR (HTML string)
- `src/vnode/render-engine.js` - Environment detection

**VNodeRenderer (CSR):**
```javascript
class VNodeRenderer {
  static render(vnode, targetElement) {
    const domNode = this.createDOMNode(vnode);
    targetElement.innerHTML = '';
    targetElement.appendChild(domNode);
    return domNode;
  }
  
  static createDOMNode(vnode) {
    if (typeof vnode === 'string') 
      return document.createTextNode(vnode);
    if (!vnode) 
      return document.createTextNode('');
    
    const el = document.createElement(vnode.tag);
    this.applyProps(el, vnode.props);
    this.applyStyles(el, vnode.style);
    this.applyEvents(el, vnode.events);
    
    vnode.children?.forEach(child => {
      const childNode = this.createDOMNode(child);
      if (childNode) el.appendChild(childNode);
    });
    
    vnode._element = el;
    if (vnode.ref) vnode.ref(el);
    return el;
  }
  
  static applyProps(el, props) { /* set attributes */ }
  static applyStyles(el, styles) { /* set style */ }
  static applyEvents(el, events) { /* addEventListener */ }
}
```

**SSRRenderer (Server):**
```javascript
class SSRRenderer {
  static render(vnode) {
    return `<!DOCTYPE html>
<html><head>...</head><body>
<div id="root">${this.renderVNode(vnode)}</div>
</body></html>`;
  }
  
  static renderVNode(vnode) {
    if (typeof vnode === 'string') return this.escapeHTML(vnode);
    if (!vnode) return '';
    
    const attrs = this.serializeAttrs(vnode.props, vnode.style);
    const openTag = `<${vnode.tag}${attrs ? ' ' + attrs : ''}>`;
    if (this.isVoidTag(vnode.tag)) return openTag;
    
    const children = (vnode.children || [])
      .map(c => this.renderVNode(c))
      .join('');
    return `${openTag}${children}</${vnode.tag}>`;
  }
}
```

**RenderEngine (Dual-Mode):**
```javascript
class RenderEngine {
  static render(vnode, target, options = {}) {
    const isServer = typeof window === 'undefined';
    return isServer 
      ? SSRRenderer.render(vnode)
      : VNodeRenderer.render(vnode, target);
  }
}
```

**Tests:**
- ✅ CSR renders to valid DOM
- ✅ SSR renders to valid HTML
- ✅ Environment detection works
- ✅ Props/styles apply correctly
- ✅ Events attach in CSR
- ✅ No events in SSR output

**Timeline:** 14 days
- Days 1-4: VNodeRenderer + tests
- Days 5-7: SSRRenderer + HTML validation
- Days 8-10: RenderEngine + dual-mode tests
- Days 11-14: Integration (render test.fjs to HTML)

---

### Phase 4.3: Reconciliation & Diffing (Weeks 5-6)

**Deliverable:** VNode differ + patch system + efficient updates

**Files to Create:**
- `src/vnode/vnode-differ.js` - Diff algorithm
- `src/vnode/patch-applier.js` - Apply patches to DOM
- `src/vnode/update-scheduler.js` - Batch updates with RAF

**VNodeDiffer (Algorithm):**
```javascript
class VNodeDiffer {
  static diff(oldVNode, newVNode, index = 0) {
    const patches = [];
    
    if (!oldVNode && !newVNode) return patches;
    if (!oldVNode && newVNode) 
      return [new Patch(PatchType.CREATE, index, newVNode)];
    if (oldVNode && !newVNode) 
      return [new Patch(PatchType.REMOVE, index, oldVNode)];
    
    if (typeof oldVNode === 'string' || typeof newVNode === 'string') {
      if (oldVNode !== newVNode)
        patches.push(new Patch(PatchType.UPDATE_TEXT, index, oldVNode, newVNode));
      return patches;
    }
    
    if (oldVNode.tag !== newVNode.tag)
      return [new Patch(PatchType.REPLACE, index, oldVNode, newVNode)];
    
    // Same element - diff props/events/children
    patches.push(...this.diffProps(oldVNode, newVNode, index));
    patches.push(...this.diffEvents(oldVNode, newVNode, index));
    patches.push(...this.diffChildren(oldVNode.children, newVNode.children, index));
    
    return patches;
  }
  
  static diffProps(oldVNode, newVNode, index) { /* compare props */ }
  static diffEvents(oldVNode, newVNode, index) { /* compare events */ }
  static diffChildren(oldChildren, newChildren, parentIndex) { /* recursive diff */ }
}

const PatchType = {
  CREATE: 'CREATE',
  REMOVE: 'REMOVE',
  REPLACE: 'REPLACE',
  UPDATE_PROPS: 'UPDATE_PROPS',
  UPDATE_TEXT: 'UPDATE_TEXT',
  UPDATE_EVENTS: 'UPDATE_EVENTS'
};

class Patch {
  constructor(type, index, oldNode, newNode) {
    this.type = type;
    this.index = index;
    this.oldNode = oldNode;
    this.newNode = newNode;
  }
}
```

**PatchApplier:**
```javascript
class PatchApplier {
  static apply(rootElement, patches) {
    patches.forEach(patch => {
      const el = this.findElement(rootElement, patch.index);
      if (!el) return;
      
      switch (patch.type) {
        case PatchType.CREATE:
          this.create(el, patch); break;
        case PatchType.REMOVE:
          this.remove(el, patch); break;
        case PatchType.REPLACE:
          this.replace(el, patch); break;
        case PatchType.UPDATE_PROPS:
          this.updateProps(el, patch); break;
        case PatchType.UPDATE_TEXT:
          this.updateText(el, patch); break;
        case PatchType.UPDATE_EVENTS:
          this.updateEvents(el, patch); break;
      }
    });
  }
  
  static findElement(root, index) {
    // Navigate by index path: "0.1.2"
  }
}

class UpdateScheduler {
  static schedule(callback) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        callback();
        resolve();
      });
    });
  }
}
```

**Key-Based Reconciliation:**
- Match VNodes with keys for efficient reordering
- Fallback to position-based matching if no keys
- Preserve DOM state (scroll, input values, etc.)

**Tests:**
- ✅ Diff identical VNodes → no patches
- ✅ Text change → UPDATE_TEXT
- ✅ Prop change → UPDATE_PROPS
- ✅ Different tags → REPLACE
- ✅ Child added/removed → CREATE/REMOVE
- ✅ Keyed lists reorder correctly
- ✅ Patches applied correctly to DOM

**Timeline:** 14 days
- Days 1-4: VNodeDiffer algorithm + tests
- Days 5-8: PatchApplier + apply tests
- Days 9-11: UpdateScheduler + batching
- Days 12-14: Integration test (state updates)

---

### Phase 4.4: State & Hydration (Weeks 7-8)

**Deliverable:** State binding + SSR→CSR hydration + complete integration

**Files to Create:**
- `src/vnode/state-binding.js` - VNode ↔ state mapping
- `src/vnode/hydrator.js` - SSR→CSR bridge
- `src/runtime/index.js` - Runtime integration

**StateBinding:**
```javascript
class StateBinding {
  constructor(widgetId, property, vnode) {
    this.widgetId = widgetId;
    this.property = property;
    this.vnode = vnode;
    this.element = null;
  }
  
  updateDOM(newValue) {
    if (!this.element) return;
    if (this.vnode.tag === 'span' || this.vnode.tag === 'div')
      this.element.textContent = String(newValue);
    else if (this.vnode.tag === 'input')
      this.element.value = String(newValue);
  }
}

class StateBindingRegistry {
  constructor() {
    this.bindings = new Map(); // widgetId → [StateBinding]
  }
  
  register(binding) {
    if (!this.bindings.has(binding.widgetId))
      this.bindings.set(binding.widgetId, []);
    this.bindings.get(binding.widgetId).push(binding);
  }
  
  updateState(widgetId, properties) {
    const bindings = this.bindings.get(widgetId) || [];
    bindings.forEach(b => b.updateDOM(properties[b.property]));
  }
}
```

**setState Integration:**
```javascript
// In State class
setState(newState) {
  Object.assign(this.state, newState);
  
  const newVNode = this.build(this.context);
  const patches = VNodeDiffer.diff(this._oldVNode, newVNode);
  
  UpdateScheduler.schedule(() => {
    PatchApplier.apply(this._rootElement, patches);
  });
  
  this._stateBindingRegistry.updateState(this.widgetId, this.state);
  this._oldVNode = newVNode;
}
```

**Hydrator (SSR→CSR):**
```javascript
class Hydrator {
  static hydrate(rootElement, hydrationData) {
    // Recreate VNode tree from metadata
    const vnodeTree = this.recreateTree(hydrationData.widgets);
    
    // Match existing DOM to VNode
    this.attachToDOM(rootElement, vnodeTree);
    
    // Attach event listeners
    this.attachEvents(rootElement, hydrationData.events);
    
    // Initialize state
    this.initializeState(hydrationData.state);
    
    return vnodeTree;
  }
  
  static generateHydrationData(vnodeTree) {
    return {
      version: '1.0',
      widgets: this.extractWidgets(vnodeTree),
      events: this.extractEventHandlers(vnodeTree),
      state: this.extractState(vnodeTree),
      stateBindings: this.extractStateBindings(vnodeTree)
    };
  }
}
```

**Complete Flow:**

Server:
1. Parse main.fjs → metadata
2. Execute MyApp.build() → VNode tree
3. Render to HTML string
4. Generate hydrationData
5. Send: HTML + hydrationData + runtime.js

Client:
1. Receive HTML (already rendered)
2. Mount to #root
3. Load runtime.js
4. Parse hydrationData
5. Hydrate (attach events, init state)
6. Ready for interaction

**Tests:**
- ✅ State changes trigger updates
- ✅ Only affected VNodes updated
- ✅ SSR HTML renders correctly
- ✅ Hydration attaches events
- ✅ Hydration restores state
- ✅ CSR updates work after hydration
- ✅ No memory leaks

**Timeline:** 14 days
- Days 1-3: StateBinding + integration
- Days 4-7: Hydrator + metadata generation
- Days 8-10: Full SSR→CSR flow
- Days 11-14: Full integration test (end-to-end with test.fjs)

---

## Implementation Checklist

### Phase 4.1
- [ ] VNode class (constructor, toHTML, toDOM, hydrate)
- [ ] Widget converters (8-10 widgets)
- [ ] Style converter (colors, spacing, fonts)
- [ ] VNodeBuilder dispatcher
- [ ] Unit tests (50+ test cases)
- [ ] Integration test on simple widget

### Phase 4.2
- [ ] VNodeRenderer.createDOMNode()
- [ ] VNodeRenderer.applyProps/Styles/Events()
- [ ] SSRRenderer.render/renderVNode()
- [ ] RenderEngine.render() with environment detection
- [ ] Unit tests (30+ test cases)
- [ ] Integration test (render to DOM and to HTML)

### Phase 4.3
- [ ] VNodeDiffer.diff() algorithm
- [ ] PatchApplier.apply() with all patch types
- [ ] UpdateScheduler with RAF batching
- [ ] Key-based reconciliation
- [ ] Unit tests (40+ test cases)
- [ ] Integration test (state change triggers correct update)

### Phase 4.4
- [ ] StateBinding registry
- [ ] setState() integration with diffing
- [ ] Hydrator.hydrate() with event attachment
- [ ] Hydrator.generateHydrationData()
- [ ] Full SSR→CSR flow
- [ ] Unit tests (30+ test cases)
- [ ] End-to-end test (test.fjs rendered SSR, hydrated, state updated)

---

## Success Criteria

**By end of Week 2 (Phase 4.1):**
- ✅ All 8-10 widgets convert to VNode correctly
- ✅ All props/styles mapped accurately
- ✅ VNode tree visually correct for test.fjs

**By end of Week 4 (Phase 4.2):**
- ✅ test.fjs renders to valid DOM in browser
- ✅ test.fjs renders to valid HTML string
- ✅ HTML in browser matches SSR output

**By end of Week 6 (Phase 4.3):**
- ✅ State changes trigger minimal DOM updates
- ✅ Counter widget increments without full re-render
- ✅ 60 FPS maintained on updates

**By end of Week 8 (Phase 4.4):**
- ✅ test.fjs renders on server
- ✅ SSR HTML hydrates correctly on client
- ✅ Full end-to-end: server render → hydrate → interactive

---

## Testing Strategy

**Unit Tests:** 150+ test cases
- VNode creation and serialization
- Widget conversion accuracy
- Style mapping correctness
- Rendering (DOM and HTML)
- Diffing algorithm
- Patch application
- State binding
- Hydration

**Integration Tests:** 20+ scenarios
- Simple widget (Text) → full render
- Nested widgets (Column) → correct DOM tree
- Events (Button click) → handler called
- State (Counter) → update without full re-render
- SSR + Hydration → interactive

**E2E Tests:** test.fjs scenarios
- Load and render
- Click button, counter increments
- UI updates correctly
- No memory leaks
- 60 FPS performance

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Diffing complexity | Wrong updates | Extensive test coverage, simple algorithm first |
| SSR/CSR mismatch | Hydration errors | Generate metadata precisely, validate matching |
| Memory leaks | Growing footprint | Cleanup old refs, test long sessions |
| Props mapping incomplete | Missing styles | Complete widget inventory, test each |
| Performance regression | Jank on updates | Benchmark each phase, optimize patches |

---

## Output Artifacts

By end of Step 4, you'll have:

1. **src/vnode/** - Complete VNode system (4 phases)
2. **src/runtime/** - Runtime integration
3. **examples/** - Working examples (counter, form, etc.)
4. **tests/** - 150+ unit + integration tests
5. **docs/vnode-guide.md** - Implementation guide
6. **Performance benchmarks** - Metrics for each phase