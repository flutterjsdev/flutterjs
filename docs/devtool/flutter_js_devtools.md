# Flutter.js Hot Reload & DevTools Strategy

## 1. Change Detection & Selective Regeneration

### 1.1 Dependency Graph Approach
During first build, create a **dependency graph** showing which widgets depend on which:

```
main.dart
├── MyApp (StatelessWidget)
│   ├── theme: Theme data
│   └── home: HomePage
│
HomePage (StatefulWidget)
├── counter: int (state var)
├── _buildContent() method
│   ├── Column
│   │   ├── Text (uses counter)
│   │   └── ElevatedButton
│   │       └── onPressed: _increment()
```

### 1.2 Change Analysis
When `lib/main.dart` changes:

```dart
// Original
class HomePage extends StatefulWidget {
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int counter = 0;  // <-- CHANGED
  
  void _increment() {
    setState(() => counter++);
  }
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Count: $counter'),  // <-- This widget depends on counter
        ElevatedButton(
          onPressed: _increment,
          child: Text('Increment'),
        ),
      ],
    );
  }
}
```

**Analysis**:
- `counter` variable changed → affects `Text('Count: $counter')`
- `_increment()` unchanged → ElevatedButton handler unchanged
- `MyApp` unchanged → skip regeneration

**Output**: Only regenerate `_HomePageState` and affected children

### 1.3 Dependency Tracking System

```
DependencyGraph {
  widgets: Map<String, WidgetNode>
  dependencies: Map<String, Set<String>>  // widget -> widgets it depends on
  dependents: Map<String, Set<String>>    // widget -> widgets that depend on it
  stateVars: Map<String, Set<String>>     // state var -> widgets that use it
}
```

When a file changes:
1. Parse the Dart AST
2. Diff against previous AST
3. Find changed classes/functions/variables
4. Traverse dependents graph
5. Only regenerate affected widgets + dependents

## 2. CLI Watcher & Hot Reload Server

### 2.1 CLI Structure
```bash
flutter-js dev --watch
```

**Process**:
```
┌─────────────────────────────────────────────────┐
│ File Watcher (dart files)                      │
└──────────────────┬──────────────────────────────┘
                   │ detects change
                   ▼
┌─────────────────────────────────────────────────┐
│ Change Analyzer                                 │
│ - Parse Dart AST                               │
│ - Diff against previous                        │
│ - Find changed widgets                         │
└──────────────────┬──────────────────────────────┘
                   │ affected widgets list
                   ▼
┌─────────────────────────────────────────────────┐
│ Selective Code Generator                       │
│ - Regenerate only changed widgets              │
│ - Update dependency graph                      │
└──────────────────┬──────────────────────────────┘
                   │ generated JS + metadata
                   ▼
┌─────────────────────────────────────────────────┐
│ Hot Reload Server (WebSocket)                  │
│ - Send changes to browser                      │
│ - Send devtools updates                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼ (WebSocket message)
        ┌──────────────────────┐
        │ Browser Runtime      │
        │ - Apply JS changes   │
        │ - Re-render affected │
        │ - Update UI          │
        └──────────────────────┘
```

### 2.2 CLI Implementation (Pseudocode)

```dart
class FlutterJsDevServer {
  late FileWatcher watcher;
  late WebSocketServer wsServer;
  late DependencyGraph depGraph;
  late CodeGenerator codeGen;
  
  Future<void> start() async {
    // 1. Initial build
    depGraph = await analyzeDependencies('lib/main.dart');
    await fullBuild();
    
    // 2. Start WebSocket server
    wsServer = WebSocketServer(port: 9223);
    wsServer.onConnect = _onBrowserConnect;
    
    // 3. Watch for changes
    watcher = FileWatcher('lib/');
    watcher.onChange = _onFileChange;
    
    print('✓ Dev server running on ws://localhost:9223');
  }
  
  Future<void> _onFileChange(String filePath) async {
    print('📝 Change detected: $filePath');
    
    // Parse new AST
    final newAst = parseFile(filePath);
    final oldAst = previousAsts[filePath];
    
    // Find what changed
    final changes = diffAst(oldAst, newAst);
    
    // Find affected widgets
    final affectedWidgets = depGraph.getAffected(changes.changedItems);
    
    print('🔄 Regenerating: ${affectedWidgets.join(', ')}');
    
    // Selective regeneration
    final generated = await codeGen.regenerate(affectedWidgets);
    
    // Update dependency graph
    depGraph.update(filePath, newAst, affectedWidgets);
    
    // Send to browser
    wsServer.broadcast({
      'type': 'hot_reload',
      'affectedWidgets': affectedWidgets,
      'generatedCode': generated,
      'dependencyGraph': depGraph.toJson(),
    });
  }
}
```

## 3. Browser Runtime Integration

### 3.1 Hot Reload Handler

```javascript
// flutter.js runtime
class HotReloadManager {
  constructor(wsUrl = 'ws://localhost:9223') {
    this.ws = new WebSocket(wsUrl);
    this.ws.onmessage = (e) => this.handleHotReload(e.data);
  }
  
  handleHotReload(message) {
    const { type, affectedWidgets, generatedCode } = message;
    
    if (type === 'hot_reload') {
      console.log('🔄 Hot reload:', affectedWidgets);
      
      // 1. Update widget registry with new code
      affectedWidgets.forEach(widgetName => {
        const newWidget = generatedCode[widgetName];
        FlutterJS.widgets.register(widgetName, newWidget);
      });
      
      // 2. Re-render affected widgets
      FlutterJS.reactivity.scheduleRerender(affectedWidgets);
      
      // 3. Update devtools
      this.updateDevTools(message);
      
      console.log('✓ Hot reload complete');
    }
  }
}

// Attach to window for browser access
window.__flutterHotReload = new HotReloadManager();
```

### 3.2 Selective Re-render

```javascript
class ReactivitySystem {
  scheduleRerender(affectedWidgets) {
    // Only re-render what changed + dependents
    affectedWidgets.forEach(widgetName => {
      const instances = this.registry.get(widgetName);
      instances.forEach(instance => {
        this.renderWidget(instance);
        // Notify dependents (parent widgets)
        this.notifyDependents(instance);
      });
    });
  }
}
```

## 4. Browser DevTools Panel

### 4.1 DevTools UI Injection

During dev build, inject a DevTools panel:

```html
<div id="__flutter-devtools" class="devtools-panel">
  <!-- Injected by dev server -->
</div>
```

### 4.2 DevTools Features

```
┌─────────────────────────────────────────┐
│ 🐛 Flutter.js DevTools                  │
├─────────────────────────────────────────┤
│ Tabs:                                   │
│ [Widget Inspector] [Reactivity] [Perf] │
├─────────────────────────────────────────┤
│                                         │
│ WIDGET INSPECTOR                        │
│ ├─ MyApp                               │
│ │  └─ HomePage (StatefulWidget)        │
│ │     ├─ counter: 5 (state)           │
│ │     └─ Column                        │
│ │        ├─ Text: "Count: 5"          │
│ │        └─ ElevatedButton             │
│ │           └─ onPressed: _increment  │
│                                         │
│ PROPERTIES (selected: Text)             │
│ ├─ text: "Count: 5"                    │
│ ├─ style: {size: 16, weight: bold}    │
│ └─ dependencies: [counter state var]  │
│                                         │
│ REACTIVITY GRAPH                        │
│ counter (state) ──┬─→ Text widget     │
│                   └─→ rebuild _HomePageState
│                                         │
│ PERFORMANCE                             │
│ Last rebuild: 2ms                      │
│ Widgets updated: 2                     │
│ Re-renders: 1                          │
│                                         │
└─────────────────────────────────────────┘
```

### 4.3 DevTools Implementation

```javascript
class DevToolsPanel {
  constructor() {
    this.panel = document.getElementById('__flutter-devtools');
    this.selectedWidget = null;
    this.renderTree();
  }
  
  renderTree() {
    const tree = FlutterJS.reactivity.getWidgetTree();
    this.panel.innerHTML = this.buildTreeHtml(tree);
  }
  
  onWidgetClick(widgetName) {
    this.selectedWidget = widgetName;
    this.showProperties(widgetName);
    this.showDependencies(widgetName);
  }
  
  showProperties(widgetName) {
    const widget = FlutterJS.widgets.get(widgetName);
    const props = FlutterJS.reactivity.getProps(widgetName);
    const state = FlutterJS.state.getState(widgetName);
    
    this.renderProperties({
      widget,
      props,
      state,
      dependencies: this.findDependencies(widgetName),
    });
  }
  
  trackRerender(widgetName, reason, duration) {
    // Log for devtools performance tab
    this.performanceLog.push({
      widget: widgetName,
      reason, // 'prop_change', 'state_change', 'parent_rerender'
      duration,
      timestamp: Date.now(),
    });
  }
}

// Auto-inject into dev builds
if (window.__DEV__) {
  window.__devtools = new DevToolsPanel();
  FlutterJS.reactivity.onRerender = (w, r, d) => 
    window.__devtools.trackRerender(w, r, d);
}
```

## 5. Build Outputs

### 5.1 Development Build
```
build/dev/
├── index.html
├── flutter.js (with hot reload + devtools)
├── app.js (full source, readable)
├── styles.css
├── dependency-graph.json (for CLI)
└── source-map.json (widget → source location)
```

### 5.2 Production Build
```
build/prod/
├── index.html (minified)
├── app.min.js (obfuscated, no hot reload)
└── styles.min.css
```

## 6. Workflow Summary

```
1. Developer runs: flutter-js dev
   ↓
2. CLI watches lib/ for changes
   ↓
3. Developer edits lib/main.dart
   ↓
4. CLI detects change
   ↓
5. Analyze dependencies → find affected widgets
   ↓
6. Regenerate only affected widgets + dependents
   ↓
7. Send via WebSocket to browser
   ↓
8. Browser hot reloads (no refresh)
   ↓
9. DevTools updates widget tree & shows changes
   ↓
10. Developer sees changes instantly
```

## 7. Key Benefits

- **Fast iteration**: Only regenerate changed widgets
- **No full page reload**: Hot reload preserves app state
- **Visible dependency chain**: Know exactly what changed
- **Performance insight**: See which widgets re-rendered and why
- **Production ready**: Strip hot reload + devtools for production build
