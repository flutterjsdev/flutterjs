# Analysis of main.fjs Output

Based on the detailed architecture plan provided, here's what the FlutterJS framework would produce when processing **main.fjs**:

---

## 1. Analysis Phase Output

### 1.1 Widget Registry

```json
{
  "widgets": {
    "MyApp": {
      "type": "StatelessWidget",
      "superClass": "StatelessWidget",
      "constructor": {
        "params": [
          { "name": "key", "type": "any|null", "optional": true, "default": "undefined" }
        ]
      },
      "methods": {
        "build": {
          "params": ["context"],
          "paramTypes": ["BuildContext"],
          "returnType": "Widget",
          "hasContext": true
        }
      },
      "lineNumber": 52,
      "imports": ["@flutterjs/material", "@flutterjs/core"]
    },
    
    "MyHomePage": {
      "type": "StatefulWidget",
      "superClass": "StatefulWidget",
      "constructor": {
        "params": [
          { "name": "key", "type": "any|null", "optional": true },
          { "name": "title", "type": "any|null", "optional": false }
        ]
      },
      "properties": [
        { "name": "title", "type": "any|null", "initialValue": "null" }
      ],
      "methods": {
        "createState": {
          "returnType": "State<MyHomePage>",
          "body": "_MyHomePageState()"
        }
      },
      "lineNumber": 65,
      "stateClass": "_MyHomePageState"
    },
    
    "_MyHomePageState": {
      "type": "State",
      "extends": "State<MyHomePage>",
      "constructor": {
        "params": []
      },
      "stateProperties": [
        { "name": "_counter", "type": "number", "initialValue": 0 }
      ],
      "methods": {
        "_incrementCounter": {
          "type": "method",
          "params": [],
          "body": "this.setState(() => _counter++)"
        },
        "build": {
          "type": "lifecycle",
          "params": ["context"],
          "returnType": "Widget",
          "hasContext": true,
          "hasThemeUsage": true,
          "hasNavigatorUsage": false
        }
      },
      "lineNumber": 80
    }
  },
  
  "functions": {
    "main": {
      "type": "function",
      "params": [],
      "body": "runApp(const new MyApp())",
      "isEntryPoint": true,
      "lineNumber": 123
    },
    "buildUserCard": {
      "type": "arrowFunction",
      "params": [
        { "name": "name", "type": "any", "optional": true },
        { "name": "age", "type": "any", "optional": true }
      ],
      "returnType": "Widget",
      "lineNumber": 127
    },
    "buildPriceWidget": {
      "type": "function",
      "params": [
        { "name": "amount", "type": "number", "optional": true }
      ],
      "returnType": "Widget",
      "body": "Container with nested Column",
      "lineNumber": 131
    },
    "appTest": {
      "type": "function",
      "params": [
        { "name": "value", "type": "String|null", "optional": true },
        { "name": "value2", "type": "String|null", "optional": true }
      ],
      "body": "// Empty",
      "lineNumber": 147
    },
    "ex": {
      "type": "function",
      "params": [],
      "body": "appTest({ value2: 'asd', value: 'sdd' })",
      "lineNumber": 152
    }
  }
}
```

### 1.2 Dependency Graph

```
Widget Hierarchy:
MyApp (root)
  └─ MaterialApp
      └─ MyHomePage (home)
          └─ Scaffold
              ├─ AppBar
              │   ├─ Theme.of(context) [requires theme provider]
              │   └─ Text("Flutter Demo Home Page")
              ├─ Center
              │   └─ Column
              │       ├─ Text("You have pushed the button...")
              │       └─ Text(_counter) [state binding]
              └─ FloatingActionButton
                  ├─ onPressed: _incrementCounter [event handler]
                  └─ Icon(Icons.add)

Standalone Functions:
├─ main() [entry point]
├─ buildUserCard(name, age) → Card
├─ buildPriceWidget(amount) → Container
├─ appTest(value, value2) → void
└─ ex() [calls appTest]

External Dependencies:
├─ @flutterjs/material (MaterialApp, Scaffold, AppBar, FloatingActionButton, Icon, Card, Padding, Container, Divider, BoxDecoration, BorderRadius, TextStyle, Colors, EdgeInsets, CrossAxisAlignment, FontWeight)
├─ @flutterjs/core (Widget, State, StatefulWidget, StatelessWidget, BuildContext, Key)
├─ @flutterjs/icons (Icons.add, Icons.*)
└─ @flutterjs/theme (Theme, ThemeData)
```

### 1.3 Runtime Requirements Manifest

```json
{
  "runtimeRequirements": {
    "requiresThemeProvider": true,
    "requiresMediaQuery": false,
    "requiresNavigator": false,
    "requiresKeyProvider": false,
    "stateManagement": "local",
    "asyncOperations": false,
    "requiresAnimations": false,
    "requiresGestures": false,
    "contextUsage": {
      "Theme.of": true,
      "MediaQuery.of": false,
      "Navigator.of": false,
      "DefaultFocusTraversal.of": false
    },
    "requiredRuntimes": [
      "@flutterjs/core",
      "@flutterjs/material",
      "@flutterjs/icons",
      "@flutterjs/theme"
    ]
  },
  
  "stateAnalysis": {
    "statefulWidgets": ["MyHomePage"],
    "stateClasses": ["_MyHomePageState"],
    "stateVariables": {
      "_MyHomePageState": [
        { "name": "_counter", "type": "number", "mutable": true }
      ]
    },
    "setStateUsage": [
      {
        "location": "_MyHomePageState._incrementCounter",
        "updateExpression": "() => _counter++"
      }
    ],
    "lifecycleHooks": {
      "_MyHomePageState": ["build"]
    }
  },
  
  "errors": [],
  "warnings": [
    {
      "type": "unused-function",
      "message": "Function 'appTest' is defined but never used",
      "location": "line 147"
    },
    {
      "type": "unused-function",
      "message": "Function 'ex' calls appTest with test values",
      "location": "line 152"
    },
    {
      "type": "unused-function",
      "message": "Function 'buildUserCard' is defined but never used",
      "location": "line 127"
    },
    {
      "type": "unused-function",
      "message": "Function 'buildPriceWidget' is defined but never used",
      "location": "line 131"
    }
  ]
}
```

---

## 2. VNode Generation Output

### 2.1 VNode Tree (Initial State)

```javascript
VNodeTree = {
  tag: 'div',
  props: {
    id: 'flutter-root',
    className: 'fjs-app',
    'data-widget': 'MyApp'
  },
  children: [
    {
      tag: 'div',
      props: {
        className: 'fjs-material-app',
        'data-widget': 'MaterialApp'
      },
      children: [
        {
          tag: 'div',
          props: {
            className: 'fjs-scaffold',
            'data-widget': 'Scaffold',
            'data-widget-id': 'scaffold-1'
          },
          children: [
            // AppBar
            {
              tag: 'header',
              props: {
                className: 'fjs-app-bar',
                style: {
                  backgroundColor: '#f5f5f5' // inversePrimary color
                }
              },
              children: [
                {
                  tag: 'h1',
                  props: { className: 'fjs-app-bar-title' },
                  children: ['Flutter Demo Home Page']
                }
              ]
            },
            
            // Body (Center > Column)
            {
              tag: 'div',
              props: {
                className: 'fjs-center',
                'data-widget': 'Center'
              },
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh'
              },
              children: [
                {
                  tag: 'div',
                  props: {
                    className: 'fjs-column',
                    'data-widget': 'Column'
                  },
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  },
                  children: [
                    {
                      tag: 'span',
                      props: { className: 'fjs-text' },
                      children: ['You have pushed the button this many times:']
                    },
                    {
                      tag: 'span',
                      props: {
                        className: 'fjs-text fjs-headline-medium',
                        'data-widget-id': 'counter-display'
                      },
                      style: {
                        fontSize: '56px',
                        fontWeight: '500'
                      },
                      children: ['0'], // Initial _counter value
                      stateBinding: {
                        widgetId: '_MyHomePageState',
                        stateProperty: '_counter'
                      }
                    }
                  ]
                }
              ]
            },
            
            // FloatingActionButton
            {
              tag: 'button',
              props: {
                className: 'fjs-floating-action-button',
                type: 'button',
                title: 'Increment',
                'data-widget': 'FloatingActionButton',
                'data-widget-id': 'fab-increment'
              },
              style: {
                position: 'fixed',
                bottom: '16px',
                right: '16px',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#6750a4'
              },
              events: {
                click: function() {
                  // Will be bound to _incrementCounter method
                }
              },
              children: [
                {
                  tag: 'svg',
                  props: {
                    className: 'fjs-icon fjs-icon-add',
                    viewBox: '0 0 24 24'
                  },
                  children: [/* SVG paths for + icon */]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 2.2 State Bindings Registry

```json
{
  "stateBindings": {
    "_MyHomePageState": {
      "statePropertyBindings": {
        "_counter": [
          {
            "vnodeId": "counter-display",
            "path": "[0]",
            "updateFn": "(value) => vnodeElement.textContent = String(value)"
          }
        ]
      },
      "eventHandlers": {
        "fab-increment": {
          "event": "click",
          "handler": "_incrementCounter",
          "callback": "() => setState(() => _counter++)"
        }
      },
      "updateSchedule": "on-next-frame"
    }
  }
}
```

---

## 3. Rendering Output

### 3.1 Browser (CSR) - HTML Output

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flutter Demo</title>
  
  <!-- Material Design CSS -->
  <link rel="stylesheet" href="/_flutterjs/material.css">
  <link rel="stylesheet" href="/_flutterjs/icons.css">
  
  <!-- App-specific styles -->
  <style>
    :root {
      --md-sys-color-primary: #6750a4;
      --md-sys-color-on-primary: #ffffff;
      --md-sys-color-primary-container: #eaddff;
      --md-sys-color-on-primary-container: #21005e;
      --md-sys-color-inverse-primary: #d0bcff;
      --md-sys-color-surface: #fffbfe;
      --md-sys-color-on-surface: #1c1b1f;
      --md-sys-typescale-headline-medium-font: 'Roboto';
      --md-sys-typescale-headline-medium-size: 28px;
      --md-sys-typescale-headline-medium-weight: 500;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: var(--md-sys-typescale-body-large-font, 'Roboto');
    }
    
    .fjs-scaffold {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    
    .fjs-app-bar {
      background-color: #f5f5f5;
      padding: 12px 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 100;
    }
    
    .fjs-app-bar-title {
      margin: 0;
      font-size: 20px;
      color: #1c1b1f;
    }
    
    .fjs-center {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
    }
    
    .fjs-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .fjs-floating-action-button {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: #6750a4;
      color: #ffffff;
      border: none;
      box-shadow: 0 3px 6px rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .fjs-floating-action-button:hover {
      box-shadow: 0 5px 10px rgba(0,0,0,0.3);
    }
    
    .fjs-headline-medium {
      font-size: 28px;
      font-weight: 500;
      line-height: 1.2;
    }
  </style>
</head>

<body>
  <div id="flutter-root" class="fjs-app" data-widget="MyApp">
    <div class="fjs-material-app" data-widget="MaterialApp">
      <div class="fjs-scaffold" data-widget="Scaffold" data-widget-id="scaffold-1">
        
        <!-- AppBar -->
        <header class="fjs-app-bar" style="background-color: #f5f5f5;">
          <h1 class="fjs-app-bar-title">Flutter Demo Home Page</h1>
        </header>
        
        <!-- Body -->
        <div class="fjs-center" data-widget="Center">
          <div class="fjs-column" data-widget="Column">
            <span class="fjs-text">You have pushed the button this many times:</span>
            <span 
              class="fjs-text fjs-headline-medium" 
              data-widget-id="counter-display"
              style="font-size: 28px; font-weight: 500;"
            >0</span>
          </div>
        </div>
        
        <!-- FloatingActionButton -->
        <button 
          class="fjs-floating-action-button" 
          type="button" 
          title="Increment"
          data-widget="FloatingActionButton"
          data-widget-id="fab-increment"
        >
          <svg class="fjs-icon fjs-icon-add" viewBox="0 0 24 24" width="24" height="24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
          </svg>
        </button>
        
      </div>
    </div>
  </div>

  <!-- Flutter.js Runtime -->
  <script src="/_flutterjs/runtime.min.js"></script>
  
  <!-- Hydration Data -->
  <script type="application/json" id="__FLUTTERJS_DATA__">
  {
    "version": "1.0",
    "widgets": {
      "MyApp": {
        "type": "StatelessWidget"
      },
      "MyHomePage": {
        "type": "StatefulWidget",
        "stateClass": "_MyHomePageState"
      },
      "_MyHomePageState": {
        "type": "State",
        "initialState": {
          "_counter": 0
        },
        "stateProperties": ["_counter"],
        "methods": {
          "build": "build(context)",
          "_incrementCounter": "_incrementCounter()"
        }
      }
    },
    "stateBindings": {
      "_MyHomePageState": {
        "statePropertyBindings": {
          "_counter": [
            {
              "elementId": "counter-display",
              "updateFn": "(value) => element.textContent = String(value)"
            }
          ]
        },
        "eventHandlers": {
          "fab-increment": {
            "event": "click",
            "methodName": "_incrementCounter"
          }
        }
      }
    },
    "appConfig": {
      "title": "Flutter Demo",
      "entryPoint": "main",
      "rootWidget": "MyApp"
    }
  }
  </script>
  
  <!-- App Bundle -->
  <script type="module">
    import { MyApp, MyHomePage, _MyHomePageState, main } from '/_flutterjs/app.bundle.js';
    
    // Initialize Flutter.js
    FlutterJS.init({
      rootElement: document.getElementById('flutter-root'),
      hydrationData: JSON.parse(document.getElementById('__FLUTTERJS_DATA__').textContent),
      widgets: { MyApp, MyHomePage, _MyHomePageState },
      entryPoint: main
    });
  </script>
</body>

</html>
```

### 3.2 Server (SSR) - HTML String Output

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Flutter Demo">
  <title>Flutter Demo</title>
  
  <!-- Critical CSS (inlined) -->
  <style>
    :root {
      --md-sys-color-primary: #6750a4;
      --md-sys-color-on-primary: #ffffff;
      --md-sys-color-inverse-primary: #d0bcff;
      --md-sys-color-surface: #fffbfe;
      --md-sys-color-on-surface: #1c1b1f;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: 'Roboto', sans-serif;
      background: #fffbfe;
      color: #1c1b1f;
    }
    
    .fjs-scaffold { display: flex; flex-direction: column; min-height: 100vh; }
    .fjs-app-bar { background-color: #f5f5f5; padding: 12px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .fjs-app-bar-title { margin: 0; font-size: 20px; }
    .fjs-center { display: flex; align-items: center; justify-content: center; flex: 1; }
    .fjs-column { display: flex; flex-direction: column; gap: 16px; }
    .fjs-floating-action-button { position: fixed; bottom: 16px; right: 16px; width: 56px; height: 56px; border-radius: 50%; background-color: #6750a4; color: #ffffff; border: none; box-shadow: 0 3px 6px rgba(0,0,0,0.2); cursor: pointer; }
    .fjs-headline-medium { font-size: 28px; font-weight: 500; }
  </style>
</head>

<body>
  <div id="flutter-root" class="fjs-app" data-widget="MyApp">
    <div class="fjs-material-app" data-widget="MaterialApp">
      <div class="fjs-scaffold" data-widget="Scaffold" data-widget-id="scaffold-1">
        <header class="fjs-app-bar" style="background-color: #f5f5f5;">
          <h1 class="fjs-app-bar-title">Flutter Demo Home Page</h1>
        </header>
        <div class="fjs-center" data-widget="Center">
          <div class="fjs-column" data-widget="Column">
            <span class="fjs-text">You have pushed the button this many times:</span>
            <span class="fjs-text fjs-headline-medium" data-widget-id="counter-display" style="font-size: 28px; font-weight: 500;">0</span>
          </div>
        </div>
        <button class="fjs-floating-action-button" type="button" title="Increment" data-widget="FloatingActionButton" data-widget-id="fab-increment">
          <svg class="fjs-icon fjs-icon-add" viewBox="0 0 24 24" width="24" height="24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Non-critical CSS loaded asynchronously -->
  <link rel="stylesheet" href="/_flutterjs/material.css" media="print" onload="this.media='all'">
  
  <!-- Hydration Data -->
  <script id="__FLUTTERJS_DATA__" type="application/json">
  {"version":"1.0","widgets":{"MyApp":{"type":"StatelessWidget"},"MyHomePage":{"type":"StatefulWidget","stateClass":"_MyHomePageState"},"_MyHomePageState":{"type":"State","initialState":{"_counter":0}}},"stateBindings":{"_MyHomePageState":{"statePropertyBindings":{"_counter":[{"elementId":"counter-display"}]},"eventHandlers":{"fab-increment":{"event":"click","methodName":"_incrementCounter"}}}}}
  </script>
  
  <!-- Runtime Script -->
  <script src="/_flutterjs/runtime.min.js" defer></script>
  
  <!-- App Bundle -->
  <script src="/_flutterjs/app.bundle.js" type="module" defer></script>

</body>

</html>
```

---

## 4. Build Output Files

### 4.1 Directory Structure

```
build/
├─ index.html                          # Main HTML (SSR-ready + CSR)
├─ manifest.json                       # Build metadata
├─ static/
│  ├─ _flutterjs/
│  │  ├─ runtime.min.js               # Core runtime (~12KB)
│  │  ├─ runtime.min.js.map           # Source map
│  │  ├─ material.css                 # Material Design styles (~20KB)
│  │  ├─ icons.css                    # Icon styles (~5KB)
│  │  └─ material.css.map
│  ├─ app.bundle.js                   # Transpiled app code (~3KB)
│  ├─ app.bundle.js.map
│  └─ chunks/
│     └─ [no code splitting needed - single page]
└─ assets/
   └─ [none in this example]
```

### 4.2 Build Manifest

```json
{
  "buildDate": "2025-12-10T10:30:45Z",
  "version": "1.0.0",
  "mode": "production",
  "target": "mpa",
  
  "files": {
    "html": {
      "index.html": {
        "size": "8.2 KB",
        "gzipped": "2.1 KB",
        "widgets": ["MyApp", "MyHomePage", "_MyHomePageState"]
      }
    },
    "javascript": {
      "runtime.min.js": {
        "size": "12.4 KB",
        "gzipped": "4.2 KB",
        "purpose": "Flutter.js core runtime"
      },
      "app.bundle.js": {
        "size": "3.1 KB",
        "gzipped": "1.2 KB",
        "widgets": ["MyApp", "MyHomePage", "_MyHomePageState"],
        "functions": ["main", "buildUserCard", "buildPriceWidget", "appTest", "ex"],
        "unusedExports": ["buildUserCard", "buildPriceWidget", "appTest", "ex"]
      }
    },
    "css": {
      "material.css": {
        "size": "20.8 KB",
        "gzipped": "5.3 KB",
        "purpose": "Material Design system"
      },
      "icons.css": {
        "size": "5.2 KB",
        "gzipped": "1.4 KB",
        "purpose": "Icon font"
      }
    }
  },
  
  "summary": {
    "totalSize": "49.7 KB",
    "totalGzipped": "13.2 KB",
    "pageLoadTime": "~800ms (3G)",
    "entryPoint": "main",
    "rootWidget": "MyApp",
    "statefulWidgets": ["MyHomePage"],
    "requiredRuntimes": [
      "@flutterjs/core",
      "@flutterjs/material",
      "@flutterjs/icons"
    ]
  },
  
  "optimizations": {
    "minified": true,
    "obfuscated": true,
    "treeshaken": true,
    "criticalCSSInlined": true,
    "assetsOptimized": true,
    "unusedFunctionsRemoved": true,
    "removedExports": [
      "buildUserCard",
      "buildPriceWidget",
      "appTest",
      "ex"
    ]
  },
  
  "performance": {
    "bundleSize": "13.2 KB (gzipped)",
    "parseTime": "45ms",
    "renderTime": "120ms",
    "interactiveTime": "850ms"
  },
  
  "warnings": [
    {
      "type": "unused-export",
      "message": "Export 'buildUserCard' is defined but never used in the app",
      "severity": "info",
      "removed": true
    },
    {
      "type": "unused-export",
      "message": "Export 'buildPriceWidget' is defined but never used",
      "severity": "info",
      "removed": true
    },
    {
      "type": "unused-export",
      "message": "Export 'appTest' is defined but never used",
      "severity": "info",
      "removed": true
    },
    {
      "type": "unused-export",
      "message": "Export 'ex' is defined but never used",
      "severity": "info",
      "removed": true
    }
  ]
}
```

---

## 5. Runtime Behavior (Browser Interaction)

### 5.1 Initial Load Sequence

```
1. HTML loads in browser
2. Critical CSS renders (inline)
3. Static HTML displayed
4. Non-critical CSS loads async
5. runtime.min.js executes:
   ├─ Initializes state system
   ├─ Registers widgets
   ├─ Sets up event system
   └─ Parses hydration data
6. app.bundle.js loads:
   ├─ Registers MyApp, MyHomePage, _MyHomePageState
   ├─ Hydrates _counter state = 0
   ├─ Attaches event listeners
   │  └─ FAB button → _incrementCounter
   └─ Ready for interaction
7. Page interactive (LCP + TTI)
```

### 5.2 State Update Flow

**User clicks FAB button:**

```
1. Click event fires on <button data-widget-id="fab-increment">
2. Event handler executes: _incrementCounter()
3. Inside _incrementCounter():
   this.setState(() => _counter++)
4. setState system:
   ├─ Detects _counter changed (0 → 1)
   ├─ Marks widget as dirty
   └─ Schedules rebuild on next frame
5. requestAnimationFrame callback:
   ├─ Executes build() method
   ├─ New VNode tree generated (with _counter = 1)
   ├─ Diff algorithm compares old vs new
   │  └─ Detects: Counter text changed from "0" to "1"
   ├─ Applies minimal patch:
   │  └─ element#counter-display.textContent = "1"
   └─ DOM updated (no full re-render)
6. User sees counter incremented instantly
```

### 5.3 Subsequent Clicks

**Each click follows same flow:**

```
Click 2: 1 → 2
Click 3: 2 → 3
... and so on

Performance:
├─ setState time: ~2ms
├─ Build time: ~5ms
├─ Diff time: ~1ms
├─ Patch application: ~1ms
├─ Total update: ~9ms (well under 16ms target for 60 FPS)
└─ Frame rate: Smooth 60 FPS maintained
```

---

## 6. Summary Output

### 6.1 Console Output During Build

```
$ flutterjs build

[FlutterJS] Starting build process...
[Analysis] Parsing main.fjs... ✓ (45ms)
[Analysis] Found 3 classes (1 StatelessWidget, 1 StatefulWidget, 1 State)
[Analysis] Found 5 functions (1 entry point)
[Analysis] Found 3 unused exports (buildUserCard, buildPriceWidget, appTest)
[Metadata] Widget registry generated ✓
[Metadata] Dependency graph built ✓
[VNode] Converting widgets to VNodes... ✓ (12ms)