# Strategic Plan: Bridging FlutterJS Framework and User Applications

Based on your analysis, the core challenge is: **How to connect the FlutterJS SDK (framework code) with user application code (main.fjs), so imports resolve correctly and widgets render properly.**

This is a **module resolution and connection architecture** problem. Let me outline a comprehensive strategy.

---

## 1. The Core Problem

```
Current State:
┌─────────────────────┐
│   FlutterJS SDK     │
│  (Container.js,     │
│   Text.js, etc.)    │
└─────────────────────┘
        ↓ (no connection)
┌─────────────────────┐
│   User App          │
│   (main.fjs)        │
│   imports Container │
│   (unresolved!)     │
└─────────────────────┘

Needed:
import { Container, Text, Column } from '@flutterjs/material';
        ↓
        Resolves to SDK files
        ↓
        Widgets available in app
```

---

## 2. Multi-Layered Resolution Strategy

### 2.1 Three-Tier Import Resolution System

```
┌──────────────────────────────────────────────────────┐
│  IMPORT RESOLUTION HIERARCHY                         │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Tier 1: Package Manifest (package.json)            │
│  ├─ Define @flutterjs/* packages                    │
│  ├─ Version constraints                             │
│  └─ Entry points (main, exports)                    │
│       ↓                                              │
│  Tier 2: Custom Module Resolver                     │
│  ├─ Intercept 'import' statements                   │
│  ├─ Map to SDK locations                            │
│  ├─ Handle aliases (@flutterjs/*)                   │
│  └─ Validate package versions                       │
│       ↓                                              │
│  Tier 3: Runtime Binding                            │
│  ├─ Attach resolved modules to global scope         │
│  ├─ Make widgets available in app context           │
│  └─ Enable hot-reloading                            │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 3. Implementation Strategy: Module Resolution

### 3.1 Package.json Structure (SDK)

**Location: `@flutterjs/material/package.json`**

```json
{
  "name": "@flutterjs/material",
  "version": "1.0.0",
  "description": "Material Design widgets for FlutterJS",
  
  "main": "./lib/index.js",
  
  "exports": {
    ".": "./lib/index.js",
    "./container": "./lib/widgets/container.js",
    "./text": "./lib/widgets/text.js",
    "./column": "./lib/widgets/column.js",
    "./row": "./lib/widgets/row.js",
    "./scaffold": "./lib/widgets/scaffold.js",
    "./app-bar": "./lib/widgets/app-bar.js",
    "./button": "./lib/widgets/button.js",
    "./icons": "./lib/icons/index.js"
  },
  
  "flutterjs": {
    "package": "@flutterjs/material",
    "widgets": [
      "Container",
      "Text",
      "Column",
      "Row",
      "Center",
      "Padding",
      "Scaffold",
      "AppBar",
      "ElevatedButton",
      "FloatingActionButton",
      "Icon"
    ],
    "exports": {
      "Container": "./lib/widgets/container.js",
      "Text": "./lib/widgets/text.js",
      "Column": "./lib/widgets/column.js",
      "Row": "./lib/widgets/row.js",
      "Scaffold": "./lib/widgets/scaffold.js",
      "AppBar": "./lib/widgets/app-bar.js",
      "ElevatedButton": "./lib/widgets/button.js",
      "FloatingActionButton": "./lib/widgets/fab.js",
      "Icon": "./lib/icons/icon.js"
    }
  }
}
```

### 3.2 Custom Module Resolver

**Purpose: Intercept and resolve import statements during code analysis/build**

**Architecture:**

```javascript
class ModuleResolver {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.sdkRoot = this.findSDKRoot();
    this.cache = new Map();
    this.resolutionMap = new Map();
  }

  // Main resolution function
  resolve(importPath, fromFile) {
    // 1. Check cache
    const cacheKey = `${fromFile}:${importPath}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let resolved;

    // 2. Try different resolution strategies
    if (importPath.startsWith('@flutterjs/')) {
      resolved = this.resolveFlutterPackage(importPath);
    } else if (importPath.startsWith('.')) {
      resolved = this.resolveRelative(importPath, fromFile);
    } else if (importPath.startsWith('#')) {
      resolved = this.resolveAlias(importPath);
    } else {
      resolved = this.resolveNodeModules(importPath);
    }

    // 3. Cache and return
    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  resolveFlutterPackage(importPath) {
    // @flutterjs/material → /path/to/sdk/packages/material/
    const [scope, packageName] = importPath.split('/');
    
    const packagePath = `${this.sdkRoot}/packages/${packageName}`;
    const packageJson = require(`${packagePath}/package.json`);
    
    return {
      type: 'flutterjs-package',
      path: packagePath,
      entry: `${packagePath}/${packageJson.main}`,
      exports: packageJson.flutterjs.exports,
      widgets: packageJson.flutterjs.widgets,
      resolved: true
    };
  }

  resolveRelative(importPath, fromFile) {
    // ./container → resolve relative to fromFile
    const dirname = path.dirname(fromFile);
    const resolvedPath = path.resolve(dirname, importPath);
    
    return {
      type: 'relative',
      path: resolvedPath,
      resolved: fs.existsSync(resolvedPath)
    };
  }

  resolveAlias(importPath) {
    // #shared/components → projects/shared/components
    const parts = importPath.split('/');
    const aliasName = parts[0].slice(1);
    
    // Look up in alias configuration
    const aliasConfig = this.loadAliasConfig();
    const aliasPath = aliasConfig[aliasName];
    
    if (aliasPath) {
      return {
        type: 'alias',
        path: path.resolve(this.projectRoot, aliasPath, ...parts.slice(1)),
        resolved: true
      };
    }
  }

  resolveNodeModules(importPath) {
    // axios → node_modules/axios
    const modulePath = require.resolve(importPath);
    
    return {
      type: 'npm',
      path: modulePath,
      resolved: true
    };
  }
}
```

### 3.3 Import Statement Analysis & Transformation

**During code analysis, detect imports and transform them:**

```javascript
class ImportTransformer {
  constructor(resolver) {
    this.resolver = resolver;
    this.imports = new Map();
  }

  analyzeImports(code, filePath) {
    // Pattern: import { A, B, C } from 'path'
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    const results = [];

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const specifiers = match[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
      
      const sourcePath = match[2];

      // Resolve import
      const resolution = this.resolver.resolve(sourcePath, filePath);

      if (resolution.resolved) {
        results.push({
          specifiers,
          sourcePath,
          resolved: resolution,
          line: code.substring(0, match.index).split('\n').length - 1
        });
      } else {
        results.push({
          specifiers,
          sourcePath,
          resolved: null,
          error: `Cannot resolve '${sourcePath}'`,
          line: code.substring(0, match.index).split('\n').length - 1
        });
      }
    }

    return results;
  }

  buildDependencyGraph(importAnalysis) {
    // Map of: main.fjs → [@flutterjs/material, @flutterjs/icons, ...]
    const graph = new Map();

    for (const analysis of importAnalysis) {
      if (analysis.resolved) {
        if (!graph.has(analysis.resolved.path)) {
          graph.set(analysis.resolved.path, {
            exports: analysis.resolved.exports || {},
            widgets: analysis.resolved.widgets || [],
            specifiers: analysis.specifiers
          });
        }
      }
    }

    return graph;
  }
}
```

---

## 4. Build-Time Connection System

### 4.1 Build Process Integration

**When user runs `flutterjs build main.fjs`:**

```
Step 1: Analyze main.fjs
  ├─ Parse code
  ├─ Extract imports: import { Container, Text } from '@flutterjs/material'
  └─ Analyze dependencies

Step 2: Resolve Imports
  ├─ Look up @flutterjs/material in SDK
  ├─ Find Container.js, Text.js locations
  ├─ Validate versions
  └─ Build resolution map

Step 3: Generate Resolution Map
  ├─ Create mapping:
  │  {
  │    '@flutterjs/material': {
  │      'Container': '/sdk/packages/material/lib/widgets/container.js',
  │      'Text': '/sdk/packages/material/lib/widgets/text.js',
  │      ...
  │    }
  │  }
  └─ Inject into runtime

Step 4: Bundle
  ├─ Include main.fjs code
  ├─ Include referenced SDK modules
  ├─ Include resolution map
  └─ Generate output HTML/JS

Step 5: Runtime Loading
  ├─ Load HTML in browser
  ├─ Execute resolution map setup
  ├─ Load main.fjs
  ├─ Imports now resolve to SDK modules
  └─ Widgets available and functional
```

### 4.2 Resolution Map Generation

**Generated during build, embedded in output:**

```javascript
// Generated by build system
// File: build/resolution-map.js

const FlutterJSResolutionMap = {
  '@flutterjs/material': {
    'Container': window.__FLUTTERJS_WIDGETS__['Container'],
    'Text': window.__FLUTTERJS_WIDGETS__['Text'],
    'Column': window.__FLUTTERJS_WIDGETS__['Column'],
    'Row': window.__FLUTTERJS_WIDGETS__['Row'],
    'Scaffold': window.__FLUTTERJS_WIDGETS__['Scaffold'],
    'AppBar': window.__FLUTTERJS_WIDGETS__['AppBar'],
    'ElevatedButton': window.__FLUTTERJS_WIDGETS__['ElevatedButton'],
    'FloatingActionButton': window.__FLUTTERJS_WIDGETS__['FloatingActionButton'],
    'Icon': window.__FLUTTERJS_WIDGETS__['Icon'],
    'Colors': window.__FLUTTERJS_THEME__['Colors'],
    'EdgeInsets': window.__FLUTTERJS_THEME__['EdgeInsets'],
    'TextStyle': window.__FLUTTERJS_THEME__['TextStyle'],
  },
  '@flutterjs/core': {
    'Widget': window.__FLUTTERJS_CORE__['Widget'],
    'StatelessWidget': window.__FLUTTERJS_CORE__['StatelessWidget'],
    'StatefulWidget': window.__FLUTTERJS_CORE__['StatefulWidget'],
    'State': window.__FLUTTERJS_CORE__['State'],
    'BuildContext': window.__FLUTTERJS_CORE__['BuildContext'],
  }
};

// Register in global scope
window.__FLUTTERJS_RESOLUTION__ = FlutterJSResolutionMap;
```

### 4.3 Runtime Import Injection

**Modified main.fjs after build (pseudo-code):**

```javascript
// Original (before build):
// import { Container, Text } from '@flutterjs/material';

// After build transformation:
const { Container, Text } = window.__FLUTTERJS_RESOLUTION__['@flutterjs/material'];

class MyApp extends StatelessWidget {
  build(context) {
    return new Container({
      // ... props
      child: new Text('Hello')
    });
  }
}
```

---

## 5. Development Mode: Hot Module Replacement

### 5.1 Dev Server Module Resolution

**When running `flutterjs dev main.fjs`:**

```javascript
class DevModuleResolver {
  constructor(projectRoot, sdkRoot) {
    this.projectRoot = projectRoot;
    this.sdkRoot = sdkRoot;
    this.fileWatcher = new FileWatcher();
  }

  serve() {
    // 1. Start HTTP server
    // 2. Watch SDK files
    // 3. Watch app files
    // 4. On change: re-resolve, notify client
  }

  handleImportRequest(importPath, fromFile) {
    // /api/resolve/@flutterjs/material/Container
    // Returns:
    // {
    //   code: <Container.js source>,
    //   path: /sdk/packages/material/lib/widgets/container.js,
    //   cached: false
    // }

    const resolution = this.resolver.resolve(importPath, fromFile);
    
    if (resolution.resolved) {
      const source = fs.readFileSync(resolution.path, 'utf8');
      
      return {
        success: true,
        code: source,
        path: resolution.path,
        cached: false
      };
    } else {
      return {
        success: false,
        error: `Cannot resolve ${importPath}`
      };
    }
  }

  notifyClientOfChanges(changedFiles) {
    // WebSocket message to client:
    // {
    //   type: 'module-update',
    //   modules: ['/sdk/packages/material/lib/widgets/container.js'],
    //   action: 'reload'
    // }
    
    // Client reloads modules and re-renders
  }
}
```

### 5.2 Client-Side Module Loading (Dev Mode)

**In browser during development:**

```javascript
class ClientModuleLoader {
  constructor() {
    this.modules = new Map();
    this.pendingUpdates = [];
    this.socket = new WebSocket('ws://localhost:3000/hmr');
  }

  async loadModule(importPath) {
    // Cache check
    if (this.modules.has(importPath)) {
      return this.modules.get(importPath);
    }

    // Fetch from dev server
    const response = await fetch(`/api/resolve/${encodeURIComponent(importPath)}`);
    const { code, path } = await response.json();

    // Evaluate in module context
    const moduleContext = {};
    const wrappedCode = `
      (function() {
        const module = { exports: {} };
        const exports = module.exports;
        
        ${code}
        
        return module.exports;
      }).call(this)
    `;

    const moduleExports = eval(wrappedCode);
    this.modules.set(importPath, moduleExports);

    return moduleExports;
  }

  onHMRUpdate(changedModules) {
    // 1. Clear affected modules from cache
    changedModules.forEach(mod => this.modules.delete(mod));

    // 2. Reload app
    // This triggers re-execution of main.fjs
    // which re-imports modules, getting fresh versions

    window.__FLUTTERJS__.reloadApp();
  }
}
```

---

## 6. File Structure & Organization

### 6.1 SDK File Structure (on disk)

```
flutterjs-sdk/
├── packages/
│   ├── core/
│   │   ├── lib/
│   │   │   ├── index.js                    # Export all
│   │   │   ├── widget.js                   # Widget base class
│   │   │   ├── state.js                    # State class
│   │   │   ├── build-context.js            # BuildContext
│   │   │   └── ...
│   │   ├── package.json                    # With exports + flutterjs metadata
│   │   └── README.md
│   │
│   ├── material/
│   │   ├── lib/
│   │   │   ├── index.js                    # Main export (re-exports all widgets)
│   │   │   ├── widgets/
│   │   │   │   ├── container.js
│   │   │   │   ├── text.js
│   │   │   │   ├── column.js
│   │   │   │   ├── row.js
│   │   │   │   ├── scaffold.js
│   │   │   │   ├── app-bar.js
│   │   │   │   ├── button.js
│   │   │   │   ├── fab.js
│   │   │   │   └── ...
│   │   │   ├── theme/
│   │   │   │   ├── colors.js
│   │   │   │   ├── text-style.js
│   │   │   │   ├── edge-insets.js
│   │   │   │   └── ...
│   │   │   └── icons/
│   │   │       ├── icons.js
│   │   │       └── ...
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── icons/
│       ├── lib/
│       │   └── icons.js
│       ├── package.json
│       └── README.md
│
├── runtime/
│   ├── vdom-renderer.js
│   ├── state-manager.js
│   ├── event-system.js
│   ├── build-context-provider.js
│   └── ...
│
└── tools/
    ├── build.js                            # Build command
    ├── dev.js                              # Dev server
    ├── analyzer.js                         # Code analyzer
    ├── module-resolver.js                  # Resolution logic
    └── ...
```

### 6.2 User Project File Structure

```
my-flutter-app/
├── src/
│   ├── main.fjs
│   ├── pages/
│   │   ├── home.fjs
│   │   └── detail.fjs
│   └── widgets/
│       └── custom-button.fjs
│
├── flutterjs.config.js
├── package.json
└── build/
    ├── index.html
    ├── main.bundle.js
    ├── resolution-map.js
    └── ...
```

### 6.3 flutterjs.config.js (Project Configuration)

```javascript
module.exports = {
  // Entry point
  entryPoint: './src/main.fjs',

  // SDK location (auto-detected or manual)
  sdkPath: require.resolve('@flutterjs/sdk'),

  // Package aliases
  alias: {
    '@': './src',
    '#shared': '../shared-lib/src',
    '#components': './src/widgets'
  },

  // Build options
  build: {
    target: 'browser', // or 'node-ssr', 'static'
    minify: true,
    sourceMap: true,
    bundleSize: { warning: 50, error: 100 } // KB
  },

  // Dev server options
  dev: {
    port: 3000,
    hmr: true,
    autoOpen: true
  },

  // Package resolution
  packages: {
    '@flutterjs/material': { version: '^1.0.0' },
    '@flutterjs/core': { version: '^1.0.0' },
    '@flutterjs/icons': { version: '^1.0.0' }
  }
};
```

---

## 7. Import Resolution Workflow (Step-by-Step)

### 7.1 Static Analysis Phase (Build Time)

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: Read main.fjs                                   │
└─────────────────────────────────────────────────────────┘
                         ↓
Code:
import { Container, Text } from '@flutterjs/material';
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Parse with Analyzer                             │
└─────────────────────────────────────────────────────────┘
                         ↓
Extracted:
{
  imports: [
    { 
      specifiers: ['Container', 'Text'],
      source: '@flutterjs/material'
    }
  ]
}
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Resolve Imports with ModuleResolver             │
└─────────────────────────────────────────────────────────┘
                         ↓
Resolution Map Created:
{
  '@flutterjs/material': {
    'Container': '/sdk/packages/material/lib/widgets/container.js',
    'Text': '/sdk/packages/material/lib/widgets/text.js'
  }
}
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: Validate & Check Versions                       │
└─────────────────────────────────────────────────────────┘
                         ↓
Validation Result:
✓ Container exists
✓ Text exists
✓ Version 1.0.0 compatible
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Step 5: Inject into Build Output                        │
└─────────────────────────────────────────────────────────┘
                         ↓
Output HTML includes:
1. resolution-map.js (mapping defined)
2. widget-bundle.js (Container, Text code)
3. main-app.js (main.fjs transformed)
```

### 7.2 Runtime Binding Phase (Browser Execution)

```
┌──────────────────────────────────────────────────────────┐
│ Step 1: Browser loads index.html                         │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Step 2: Execute widget-bundle.js                         │
│ (Defines classes globally)                              │
└──────────────────────────────────────────────────────────┘
                         ↓
Global State:
window.__FLUTTERJS_WIDGETS__ = {
  'Container': class Container { ... },
  'Text': class Text { ... }
}
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Step 3: Execute resolution-map.js                        │
│ (Creates resolution map)                                 │
└──────────────────────────────────────────────────────────┘
                         ↓
Global State:
window.__FLUTTERJS_RESOLUTION__ = {
  '@flutterjs/material': {
    'Container': window.__FLUTTERJS_WIDGETS__['Container'],
    'Text': window.__FLUTTERJS_WIDGETS__['Text']
  }
}
                         ↓
┌──────────────────────────────────────────────────────────┐
│ Step 4: Execute main-app.js                              │
│ (App code with transformed imports)                      │
└──────────────────────────────────────────────────────────┘
                         ↓
Code Executes:
const { Container, Text } = 
  window.__FLUTTERJS_RESOLUTION__['@flutterjs/material'];

class MyApp extends StatelessWidget {
  build(context) {
    return new Container({
      child: new Text('Hello')
    });
  }
}
                         ↓
Result: ✓ Imports resolved, widgets available, app runs
```

---

## 8. Enhanced Features: Smarter Connection Methods

### 8.1 Automatic Import Resolution in VS Code

**VS Code Extension Enhancement:**

```javascript
// In extension.js (vscode plugin)

class ImportAutoResolver {
  constructor(analyzer, resolver) {
    this.analyzer = analyzer;
    this.resolver = resolver;
  }

  // On user hovers over widget name
  async provideHover(document, position, token) {
    const word = getWordAtPosition(document, position);
    
    // Check if it's a Flutter widget
    if (this.analyzer.flutterWidgets[word]) {
      const widget = this.analyzer.flutterWidgets[word];
      
      // Try to resolve it
      const resolution = this.resolver.resolve(widget.package, document.uri.fsPath);
      
      return new vscode.Hover([
        new vscode.MarkdownString(`**${word}** - Flutter Widget`),
        new vscode.MarkdownString(`📦 From: \`${widget.package}\``),
        new vscode.MarkdownString(
          `[Click to import](command:flutterjs.autoImport?${encodeURIComponent(
            JSON.stringify({ widget, package: widget.package })
          )})`
        ),
      ]);
    }
  }

  // On user clicks "Click to import"
  async autoImport(widget, packageName) {
    // 1. Check if already imported
    // 2. If not, add import statement
    // 3. If yes, just add to existing import
    // 4. Validate import works
    // 5. Show success message
  }
}
```

**When user clicks "Click to import":**
1. ✅ Auto-adds import statement to top of file
2. ✅ Validates SDK can provide that widget
3. ✅ Shows inline error if resolution fails
4. ✅ Offers "Install missing package" if needed

### 8.2 Intelligent Build System

**The build system should:**

```javascript
class IntelligentBuilder {
  async build(entryPoint, config) {
    // Phase 1: Analysis
    const code = fs.readFileSync(entryPoint, 'utf8');
    const analysis = this.analyzer.analyze(code, entryPoint);
    
    // Phase 2: Smart Resolution
    const unresolvedImports = analysis.imports.filter(imp => !imp.resolved);
    
    if (unresolvedImports.length > 0) {
      console.log('⚠️ Unresolved imports:');
      
      for (const imp of unresolvedImports) {
        // Try to auto-resolve
        const suggestion = await this.suggestResolution(imp);
        
        if (suggestion) {
          console.log(`   ${imp.source} → auto-resolved to ${suggestion.package}`);
          // Auto-add to package.json
          this.addToPackageJson(suggestion.package);
        } else {
          console.error(`   ${imp.source} → CANNOT RESOLVE`);
          // Fail build with helpful message
          throw new Error(`
            Cannot resolve import: '${imp.source}'
            
            Did you mean:
            ${this.suggestAlternatives(imp.source).map(alt => `  - ${alt}`).join('\n')}
            
            Or install missing package:
            npm install ${this.guessPackageName(imp.source)}
          `);
        }
      }
    }
    
    // Phase 3: Build
    return this.generateOutput(analysis, code, config);
  }

  suggestResolution(unresolved) {
    // Smart fuzzy matching
    // If app imports 'Container' but source is '@flutterjs/widgets'
    // Suggest '@flutterjs/material' instead
    
    const fuzzyMatches = this.fuzzyMatch(
      unresolved.specifiers,
      Object.keys(this.analyzer.flutterWidgets)
    );
    
    if (fuzzyMatches.length > 0) {
      // Find package that contains these widgets
      const bestPackage = this.findBestPackage(fuzzyMatches);
      return { package: bestPackage };
    }
  }
}
```

### 8.3 Error Messages with Solutions

**When import fails:**

```
❌ Build Error: Cannot resolve import

  Location: src/main.fjs:2
  
  import { Container, Text } from '@flutterjs/widgets';
                                   ^^^^^^^^^^^^^^^^^
  
  Error: Package '@flutterjs/widgets' not found
  
  ℹ️ Did you mean one of these?
     • @flutterjs/material    (has Container, Text, Column, Row, ...)
     • @flutterjs/cupertino   (iOS-style widgets)
     • @flutterjs/core        (base classes only)
  
  💡 Fix suggestion:
     Change import to:
     import { Container, Text } from '@flutterjs/material';
     
  📦 Or install the package:
     npm install @flutterjs/material
  
  🔗 Documentation:
     https://docs.flutterjs.dev/packages/material
```

---

## 9. Multi-Step Connection Verification

### 9.1 Connection Health Check

**Built-in command: `flutterjs check`**

```bash
$ flutterjs check

Checking FlutterJS Setup...

✓ SDK found at /path/to/node_modules/@flutterjs/sdk
  └─ Version: 1.0.0
  └─ Packages: 5 (@flutterjs/core, @flutterjs/material, ...)

✓ Project configuration found
  └─ Entry point: src/main.fjs
  └─ Target: browser

✓ Dependencies resolved
  └─ @flutterjs/material (1.0.0)
    └─ Exports: 42 widgets
    └─ Used in app: Container, Text, Column, Row (4/42)

✓ Imports verified
  └─ main.fjs imports: @flutterjs/material
    └─ Container ✓ available
    └─ Text ✓ available
    └─ Column ✓ available
    └─ Row ✓ available

✓ Runtime binding test
  └─ Resolution map generation: OK
  └─ Module loading: OK
  └─ Widget instantiation: OK

✓ Build test
  └─ Build successful (8.2 KB bundle)
  └─ All imports resolved

Everything looks good! ✨
```

### 9.2 Live Connection Monitor (Dev Mode)

**During development: `flutterjs dev --verbose`**

```
Dev Server Started: http://localhost:3000
Resolution Mode: Dynamic (live)
HMR Enabled: true

Watching files...
  • src/main.fjs
  • sdk/packages/material/lib/widgets/
  
[08:42:15] Loading app...
[08:42:15] → Analyzing main.fjs
[08:42:15] → Found 4 imports
[08:42:15] → Resolving @flutterjs/material
[08:42:15]   ✓ Container resolved
[08:42:15]   ✓ Text resolved  
[08:42:15]   ✓ Column resolved
[08:42:15]   ✓ Row resolved
[08:42:15] → Building resolution map
[08:42:15] ✓ App ready at http://localhost:3000

[08:42:23] Modified: src/main.fjs
[08:42:23] → Re-analyzing
[08:42:23] → Imports unchanged
[08:42:23] → Reloading module...
[08:42:24] ✓ Hot reload complete

[08:42:45] Modified: sdk/packages/material/lib/widgets/container.js
[08:42:45] → SDK change detected
[08:42:45] → Container widget updated
[08:42:45] → App rebuild triggered
[08:42:45] ✓ Hot reload complete
```

---

## 10. Fallback & Recovery Mechanisms

### 10.1 Graceful Degradation

```javascript
class RobustResolver {
  resolve(importPath, fromFile) {
    try {
      // Try primary resolution
      return this.primaryResolve(importPath);
    } catch (primaryError) {
      console.warn(`Primary resolution failed for ${importPath}`);
      
      try {
        // Try fallback resolution (looser matching)
        return this.fallbackResolve(importPath);
      } catch (fallbackError) {
        console.error(`All resolution attempts failed for ${importPath}`);
        
        // Return stub that shows helpful error at runtime
        return {
          type: 'stub-error',
          name: importPath,
          error: `Cannot resolve '${importPath}'`,
          suggestions: this.suggestAlternatives(importPath)
        };
      }
    }
  }
}
```

### 10.2 Runtime Error Overlay

**If import fails at runtime (browser):**

```html
<div class="flutter-error-overlay">
  <div class="error-header">
    <h1>❌ Import Resolution Error</h1>
  </div>
  
  <div class="error-body">
    <p><strong>Cannot resolve:</strong> @flutterjs/widgets</p>
    
    <p><strong>Location:</strong> main.fjs:2</p>
    
    <p><strong>Status:</strong> Package not installed or not found</p>
    
    <div class="suggestions">
      <h3>Suggested fixes:</h3>
      <ul>
        <li>Did you mean <code>@flutterjs/material</code>?</li>
        <li>Or install: <code>npm install @flutterjs/widgets</code></li>
        <li>Check package.json dependencies</li>
      </ul>
    </div>
    
    <div class="actions">
      <button onclick="location.reload()">Retry</button>
      <button onclick="console.clear()">Clear Error</button>
    </div>
  </div>
</div>
```

---

## 11. Summary: Connection Architecture

| Layer | Technology | Responsibility |
|-------|-----------|-----------------|
| **SDK Definition** | package.json + exports | Define what's available |
| **Analysis** | AST Parser + Analyzer | Extract imports from app |
| **Resolution** | ModuleResolver | Map imports → SDK files |
| **Validation** | Validator | Check versions, existence |
| **Build** | Builder | Generate resolution map + bundle |
| **Runtime** | Resolution Map Injection | Make widgets available globally |
| **Development** | Dev Server + HMR | Live updates + hot reload |
| **Error Handling** | Error Reporter + Suggestions | Helpful messages + fixes |

**The Connection Flow:**

```
SDK Widgets (Container.js, Text.js, ...)
    ↓ (defined in package.json)
User imports (main.fjs)
    ↓ (analyzed by analyzer)
Import statements
    ↓ (resolved by module resolver)
Resolution Map
    ↓ (embedded in build output)
Browser loads HTML
    ↓ (injects resolution map)
main.fjs executes
    ↓ (imports resolve from map)
Widgets available
    ↓ (build context uses them)
App renders
```

This approach ensures **zero friction** between SDK and app—once imports resolve, everything works seamlessly.