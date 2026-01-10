# FlutterJS Framework - Complete Integration Guide

## 📋 Overview

FlutterJS is a framework that brings Flutter's reactive widget architecture to the web, outputting clean HTML/CSS/JS that looks like Next.js UIs. This guide covers all the components and how they work together.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   FlutterApp (Runner)                  │
│              Orchestrates entire framework              │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┬──────────────┬──────────────┐
        ▼                 ▼              ▼              ▼
   ┌─────────┐    ┌────────────┐  ┌──────────┐  ┌──────────┐
   │  BUILD  │    │   DIFF     │  │  PATCH   │  │ SCHEDULER│
   │ Widgets │◄──►│ VNode Tree │◄─┤  DOM     │  │ Updates  │
   │   &     │    │ Algorithm  │  │ Efficiently  │ Batching │
   │ State   │    │            │  │          │  │          │
   └─────────┘    └────────────┘  └──────────┘  └──────────┘
        ▲                                              ▲
        │                                              │
        └──────────────────┬─────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │    DOM      │
                    │  Rendering  │
                    └─────────────┘
```

## 📦 File Structure

```
flutterjs/
├── core/
│   ├── widget.js              # Base Widget, Element, StatelessWidget, StatefulWidget
│   ├── state_fixed.js         # ✅ FIXED State class with reactive updates
│   ├── build_context.js       # BuildContext for widget tree access
│   ├── element_identifier.js  # Element identification strategy
│   └── scheduler.js           # Framework scheduler for batching updates
│
├── rendering/
│   ├── vnode.js               # Virtual node representation
│   ├── vnode_renderer.js      # ✅ Converts VNode → DOM
│   └── vnode_differ.js        # ✅ Efficient diffing algorithm
│
├── app/
│   ├── flutter_app.js         # ✅ Main app runner (like runApp)
│   └── example_app.js         # ✅ Complete working examples
│
└── utils/
    └── math.js                # Math utilities
```

## 🔧 Key Components

### 1. **VNodeRenderer** - VNode to DOM Conversion
**File:** `vnode_renderer.js`

Converts VNode tree to actual DOM elements.

```javascript
import { VNodeRenderer } from './vnode_renderer.js';
import { VNode } from './vnode.js';

// Create VNode
const vnode = new VNode({
  tag: 'div',
  props: { className: 'box' },
  children: ['Hello World']
});

// Render to DOM
const domElement = VNodeRenderer.createDOMNode(vnode);
document.body.appendChild(domElement);
```

### 2. **VNodeDiffer** - Virtual DOM Diffing
**File:** `vnode_differ.js`

Compares old and new VNode trees, generates minimal patches.

```javascript
import { VNodeDiffer } from './vnode_differ.js';

const oldVNode = /* ... */;
const newVNode = /* ... */;

// Generate patches
const patches = VNodeDiffer.diff(oldVNode, newVNode);

// Apply patches to DOM
VNodeDiffer.applyPatches(domElement, patches);
```

### 3. **State (FIXED)** - Reactive State Management
**File:** `state_fixed.js`

**Key Fix:** Automatically triggers rebuild when state changes.

```javascript
import { StatefulWidget } from './widget.js';
import { State } from './state_fixed.js';

class CounterState extends State {
  constructor() {
    super();
    this.count = 0;
  }

  initState() {
    // Initialize once
  }

  build(context) {
    return new VNode({
      tag: 'div',
      children: [
        `Count: ${this.count}`,
        new VNode({
          tag: 'button',
          children: ['Increment'],
          events: {
            click: () => {
              // ✅ This automatically triggers rebuild
              this.setState(() => {
                this.count++;
              });
            }
          }
        })
      ]
    });
  }

  dispose() {
    // Clean up
  }
}

class Counter extends StatefulWidget {
  createState() {
    return new CounterState();
  }
}
```

### 4. **FlutterApp** - Application Runner
**File:** `flutter_app.js`

**Like Flutter's `runApp()`**

```javascript
import { runApp } from './flutter_app.js';
import { MyAppWidget } from './example_app.js';

// Method 1: Using runApp helper
const app = runApp(new MyAppWidget(), document.getElementById('root'), {
  debugMode: true,
  enableMetrics: true
});

// Method 2: Using FlutterApp class
import { FlutterApp } from './flutter_app.js';

const app = new FlutterApp(
  new MyAppWidget(),
  document.getElementById('root'),
  {
    debugMode: true,
    enableMetrics: true,
    maxFrameTime: 16.67
  }
);

await app.run();

// Get metrics
app.printMetrics();

// Force rebuild
await app.forceRebuild();
```

## 🔄 Render Cycle (How It Works)

### Step 1: **Widget Tree Building**
```javascript
// Widgets are immutable, config objects
class MyWidget extends StatelessWidget {
  constructor({ title, count }) {
    super();
    this.title = title;
    this.count = count;
  }

  build(context) {
    return new VNode({ /* VNode tree */ });
  }
}
```

### Step 2: **Element Tree Creation**
```javascript
// Elements are mutable instances in the tree
const widget = new MyWidget({ title: 'App', count: 5 });
const element = widget.createElement();  // Creates StatelessElement
element.mount();                         // Mounts to tree
```

### Step 3: **VNode Tree Generation**
```javascript
// performRebuild calls build() which returns VNode tree
const vnode = element.performRebuild();
// Result: { tag: 'div', props: {}, children: [...] }
```

### Step 4: **Diffing**
```javascript
// Compare old VNode with new VNode
const patches = VNodeDiffer.diff(oldVNode, newVNode);
// Result: [{ type: 'UPDATE_PROPS', node, value: {...} }, ...]
```

### Step 5: **Patching DOM**
```javascript
// Apply minimal patches to real DOM
VNodeDiffer.applyPatches(domRoot, patches);
// Only changed parts of DOM are updated
```

## 📊 State Update Flow

```
User clicks button
    ↓
Event handler called
    ↓
setState(updateFn) called
    ↓
Update queued (batched)
    ↓
Microtask processes queue
    ↓
State updated
    ↓
element.markNeedsBuild() called
    ↓
Scheduler queues rebuild
    ↓
Next frame: build() called
    ↓
VNode tree generated
    ↓
Diff with previous
    ↓
Patches applied to DOM
    ↓
UI updates
```

## 🎯 How setState Works (Fixed Version)

**Old (Broken):**
```javascript
setState(callback) {
  this.state = { ...this.state, ...updates };
  callback();  // ❌ Doesn't trigger rebuild
}
```

**New (Fixed):**
```javascript
setState(updateFn, callback) {
  // Queue update
  this._stateUpdateQueue.push({ update: updateFn, callback });
  
  // Batch updates with microtask
  this._processStateUpdates(); // Uses Promise.resolve()
  
  // Inside _processStateUpdates:
  // 1. Apply all queued updates
  // 2. Call element.markNeedsBuild() ✅ KEY FIX
  // 3. Scheduler queues rebuild
  // 4. Next frame: performRebuild() called
  // 5. VNode tree regenerated
  // 6. DOM patched
}
```

## 🎨 Creating Widgets

### Stateless Widget (Pure Function)
```javascript
class Greeting extends StatelessWidget {
  constructor({ name = 'World' } = {}) {
    super();
    this.name = name;
  }

  build(context) {
    return new VNode({
      tag: 'h1',
      props: { className: 'greeting' },
      children: [`Hello, ${this.name}!`]
    });
  }
}

// Usage
const greeting = new Greeting({ name: 'Flutter' });
```

### Stateful Widget (With Mutable State)
```javascript
class Timer extends StatefulWidget {
  createState() {
    return new TimerState();
  }
}

class TimerState extends State {
  constructor() {
    super();
    this.seconds = 0;
    this.intervalId = null;
  }

  initState() {
    this.intervalId = setInterval(() => {
      this.setState(() => {
        this.seconds++;
      });
    }, 1000);
  }

  dispose() {
    clearInterval(this.intervalId);
    super.dispose();
  }

  build(context) {
    return new VNode({
      tag: 'div',
      children: [
        new VNode({
          tag: 'p',
          children: [`Elapsed: ${this.seconds}s`]
        })
      ]
    });
  }
}
```

## 🚀 Complete Example

```javascript
// Create an HTML file
<!DOCTYPE html>
<html>
<head>
  <title>FlutterJS App</title>
  <style>
    body { font-family: system-ui; }
    #root { padding: 20px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import { runApp } from './flutter_app.js';
    import { MyApp } from './example_app.js';

    runApp(new MyApp(), document.getElementById('root'), {
      debugMode: true
    });
  </script>
</body>
</html>
```

## 🔍 Debugging

### Enable Debug Mode
```javascript
const app = new FlutterApp(widget, element, { debugMode: true });
```

### Print Metrics
```javascript
app.printMetrics();
// Output:
// 📊 FlutterJS Application Metrics
// Render Cycles: 42
// Average Render Time: 2.35ms
// ...
```

### Frame Scheduler Debug
```javascript
FrameworkScheduler.setDebugMode(true);
FrameworkScheduler.debugPrint();
```

## ✅ Checklist: What's Fixed

- ✅ **setState** now properly triggers rebuild (batched with microtasks)
- ✅ **VNodeRenderer** converts VNode tree to DOM
- ✅ **VNodeDiffer** provides efficient reconciliation
- ✅ **FlutterApp** orchestrates render cycle
- ✅ **Lazy evaluation** - build() called only when needed
- ✅ **Batched updates** - multiple setState() in same frame = 1 rebuild
- ✅ **Reactive** - State changes automatically update UI
- ✅ **Performance** - Only dirty elements rebuild

## 📈 Performance Tips

1. **Use Keys for Lists**
   ```javascript
   new VNode({
     tag: 'div',
     key: uniqueId,  // Helps differ identify elements
     children: [...]
   })
   ```

2. **Immutable Props**
   - Widgets should be immutable
   - Pass fresh data to children

3. **Lazy Loading**
   - Only build visible items in ListView

4. **Batch Updates**
   ```javascript
   this.setState(() => {
     this.a = 1;
     this.b = 2;
     this.c = 3;  // Single rebuild, not 3
   });
   ```

## 🐛 Common Issues & Solutions

**Issue:** setState not updating UI
- **Solution:** Make sure element is mounted with `element.mount(parent)`

**Issue:** Infinite rebuild loop
- **Solution:** Don't call setState() in build() - use initState() instead

**Issue:** Memory leaks
- **Solution:** Always call dispose() and clean up in dispose()

**Issue:** Slow renders
- **Solution:** Enable debugMode and check FrameworkScheduler.debugPrint()

## 📚 More Resources

- Flutter Architecture: https://flutter.dev/docs/resources/architectural-overview
- React Reconciliation: https://reactjs.org/docs/reconciliation.html
- Virtual DOM Concept: https://en.wikipedia.org/wiki/Virtual_DOM

## 📝 Summary

FlutterJS brings Flutter's reactive architecture to the web:

| Concept | Flutter | FlutterJS |
|---------|---------|-----------|
| App entry | `runApp()` | `runApp()` |
| Widgets | Immutable | Immutable |
| Elements | Mutable tree | Mutable tree |
| State | `setState()` | `setState()` |
| Rebuild | Auto on setState | Auto on setState ✅ |
| Output | Native | HTML/CSS/JS ✅ |
| Looks like | Material Design | Next.js UI ✅ |

Now you have a fully working reactive framework! 🎉