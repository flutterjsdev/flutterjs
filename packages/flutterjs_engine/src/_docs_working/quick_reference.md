# FlutterJS Quick Reference Guide

## 🚀 Quick Start (30 seconds)

```html
<!DOCTYPE html>
<html>
<body>
  <div id="app"></div>
  <script type="module">
    import { runApp, StatelessWidget } from './flutter_app.js';
    import { VNode } from './vnode.js';

    class MyApp extends StatelessWidget {
      build(context) {
        return new VNode({
          tag: 'div',
          props: { className: 'app' },
          children: ['Hello FlutterJS!']
        });
      }
    }

    runApp(new MyApp(), document.getElementById('app'));
  </script>
</body>
</html>
```

## 📦 Import Reference

```javascript
// Core
import { Widget, StatelessWidget, StatefulWidget } from './widget.js';
import { State } from './state_fixed.js';
import { BuildContext } from './build_context.js';

// Rendering
import { VNode } from './vnode.js';
import { VNodeRenderer } from './vnode_renderer.js';
import { VNodeDiffer } from './vnode_differ.js';

// App
import { FlutterApp, runApp } from './flutter_app.js';
import { FrameworkScheduler } from './scheduler.js';
```

## 🎯 Creating Widgets

### Stateless Widget (Simple)
```javascript
class MyWidget extends StatelessWidget {
  constructor({ text = 'default' } = {}) {
    super();
    this.text = text;
  }

  build(context) {
    return new VNode({
      tag: 'span',
      children: [this.text]
    });
  }
}
```

### Stateful Widget (Interactive)
```javascript
class MyWidget extends StatefulWidget {
  createState() {
    return new MyState();
  }
}

class MyState extends State {
  constructor() {
    super();
    this.data = 'initial';
  }

  initState() {
    // Run once on mount
  }

  build(context) {
    return new VNode({
      tag: 'button',
      children: [this.data],
      events: {
        click: () => this.setState(() => {
          this.data = 'clicked';
        })
      }
    });
  }

  dispose() {
    // Cleanup
  }
}
```

## 🎨 VNode API

```javascript
new VNode({
  tag: 'div',                    // HTML tag
  key: 'unique-id',              // For list reconciliation
  props: {
    className: 'my-class',       // CSS class
    id: 'my-id',                 // HTML id
    style: { color: 'red' },     // Inline styles
    title: 'tooltip',            // HTML attributes
    'data-custom': 'value'       // Data attributes
  },
  children: [                    // Content
    'text',
    123,
    anotherVNode,
    [nestedArray],
    null,                        // Ignored
    undefined                    // Ignored
  ],
  events: {
    click: (e) => {},            // Event handlers
    onChange: (e) => {},         // camelCase or 'on' prefix
    onKeyDown: (e) => {}
  }
});
```

## 🔄 State Management

```javascript
// Basic setState
this.setState(() => {
  this.count++;
});

// Multiple updates (batched)
this.setState(() => {
  this.a = 1;
  this.b = 2;
  this.c = 3;  // Single rebuild
});

// With callback
this.setState(() => {
  this.value = 10;
}, () => {
  console.log('State updated');
});

// Get current state
const state = this.getState();
```

## 🏗️ Layout Widgets

### Container (Box)
```javascript
new VNode({
  tag: 'div',
  props: {
    style: {
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px'
    }
  },
  children: [/* child */]
});
```

### Column (Vertical Stack)
```javascript
new VNode({
  tag: 'div',
  props: {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  },
  children: [
    child1,
    child2,
    child3
  ]
});
```

### Row (Horizontal Stack)
```javascript
new VNode({
  tag: 'div',
  props: {
    style: {
      display: 'flex',
      flexDirection: 'row',
      gap: '10px'
    }
  },
  children: [child1, child2, child3]
});
```

### ListView (Scrollable List)
```javascript
new VNode({
  tag: 'div',
  props: {
    style: {
      overflowY: 'auto',
      maxHeight: '500px'
    }
  },
  children: items.map((item, i) =>
    new VNode({
      tag: 'div',
      key: i,
      props: { className: 'item' },
      children: [renderItem(item)]
    })
  )
});
```

## 📊 Styling

### Inline Styles
```javascript
new VNode({
  tag: 'div',
  props: {
    style: {
      display: 'flex',
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      fontSize: '16px',
      color: '#333'
    }
  }
});
```

### CSS Classes
```javascript
new VNode({
  tag: 'div',
  props: {
    className: 'my-class another-class'
  }
});
```

### Dynamic Classes
```javascript
const isActive = true;
new VNode({
  tag: 'button',
  props: {
    className: isActive ? 'btn btn-active' : 'btn'
  }
});
```

## 🎯 Event Handling

```javascript
// Click
events: { click: (e) => {} }

// Input change
events: { change: (e) => console.log(e.target.value) }

// Input submit
events: { submit: (e) => e.preventDefault() }

// Keyboard
events: { keyDown: (e) => {} }

// Mouse
events: {
  mouseEnter: (e) => {},
  mouseLeave: (e) => {},
  mouseOver: (e) => {}
}

// Focus
events: {
  focus: (e) => {},
  blur: (e) => {}
}
```

## 🔍 BuildContext API

```javascript
build(context) {
  // Find ancestor widget
  const parent = context.findAncestorWidgetOfExactType(ParentWidget);
  
  // Find ancestor state
  const parentState = context.findAncestorStateOfType(ParentState);
  
  // Visit ancestors
  context.visitAncestorElements((ancestor) => {
    console.log(ancestor.widget);
    return true; // continue
  });
  
  // Visit children
  context.visitChildElements((child) => {
    console.log(child.widget);
  });
  
  // Widget tree path
  const path = context.getWidgetPath();
  
  // Request rebuild
  context.requestRebuild();
  
  // Debug info
  const info = context.describeContext();
}
```

## 📈 App Configuration

```javascript
const app = new FlutterApp(
  rootWidget,
  targetElement,
  {
    debugMode: false,          // Enable debug logging
    enableMetrics: true,       // Collect performance metrics
    enableHotReload: false,    // Enable hot reload (dev only)
    maxFrameTime: 16.67        // Target 60 FPS
  }
);

await app.run();

// Metrics
app.printMetrics();
const metrics = app.getMetrics();

// Control
await app.forceRebuild();
app.setDebugMode(true);
app.stop();
```

## 🧪 Lifecycle Hooks

```javascript
class MyState extends State {
  constructor() {
    super();
    // Initialize properties here (not state)
    this.data = [];
  }

  initState() {
    // Called once on mount
    // Load data, setup listeners
  }

  didChangeDependencies() {
    // Called after initState and when dependencies change
  }

  didUpdateWidget(oldWidget) {
    // Called when widget configuration changed
  }

  deactivate() {
    // Called when widget is hidden (not removed)
    // Pause expensive operations
  }

  activate() {
    // Called when widget is shown again after deactivate
  }

  dispose() {
    // Called when widget is removed
    // Clean up: timers, listeners, streams
    super.dispose();
  }

  build(context) {
    // Return UI
  }
}
```

## 🐛 Debugging

```javascript
// Enable debug mode
app.setDebugMode(true);

// Print metrics
app.printMetrics();

// Get metrics
const metrics = app.getMetrics();
console.log(metrics.averageRenderTime);

// Scheduler debug
FrameworkScheduler.setDebugMode(true);
FrameworkScheduler.debugPrint();
FrameworkScheduler.getMetrics();

// Element info
element.getElementId();
element.getWidgetPath();
element.debugInfo();

// Context info
context.describeContext();
context.getWidgetPath();
context.getDiagnosticsTree();
```

## ⚠️ Common Mistakes

### ❌ Wrong: setState in constructor
```javascript
constructor() {
  super();
  this.setState(() => { /* won't work */ });
}
```

### ✅ Right: setState in event or method
```javascript
build(context) {
  return new VNode({
    tag: 'button',
    events: {
      click: () => this.setState(() => { /* works */ })
    }
  });
}
```

### ❌ Wrong: Mutate state without setState
```javascript
this.count++; // ❌ UI won't update
```

### ✅ Right: Use setState
```javascript
this.setState(() => {
  this.count++; // ✅ UI updates
});
```

### ❌ Wrong: setState after dispose
```javascript
dispose() {
  setTimeout(() => {
    this.setState(() => {}); // ❌ Error
  }, 1000);
}
```

### ✅ Right: Check mounted
```javascript
dispose() {
  this._cleanup = () => {
    if (this.mounted) {
      this.setState(() => {});
    }
  };
}
```

### ❌ Wrong: Create widgets in build
```javascript
build(context) {
  // ❌ New instance every render
  return new MyWidget({ data: this.data });
}
```

### ✅ Right: Reuse widget instances
```javascript
class MyState extends State {
  widget = null;

  initState() {
    this.widget = new MyWidget({ data: this.data });
  }

  build(context) {
    // Update widget props instead
    this.widget.data = this.data;
    return this.widget;
  }
}
```

## 📋 Performance Tips

1. **Use keys in lists**
   ```javascript
   key: itemId  // Helps differ track elements
   ```

2. **Immutable widgets**
   ```javascript
   class MyWidget extends StatelessWidget {
     // No mutable state
   }
   ```

3. **Batch updates**
   ```javascript
   this.setState(() => {
     this.a = 1;
     this.b = 2;  // Single rebuild
   });
   ```

4. **Lazy render children**
   ```javascript
   build(context) {
     return onlyVisibleItems.map(item =>
       item.build(context)
     );
   }
   ```

5. **Monitor with metrics**
   ```javascript
   app.printMetrics();
   ```

## 🎓 Learning Path

1. **Start:** Create simple StatelessWidget
2. **Add interactivity:** Use StatefulWidget
3. **Manage state:** Use setState()
4. **Build layouts:** Combine widgets
5. **Handle events:** Add event listeners
6. **Debug:** Enable debug mode
7. **Optimize:** Use metrics and profiler

Happy coding! 🚀