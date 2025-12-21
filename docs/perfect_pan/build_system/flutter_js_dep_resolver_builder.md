# FlutterJS Dependency Resolver & Build System

## Executive Summary

This document details **Step 6 & 7** - the missing bridge between analyzer output and runtime execution:

- **Step 6**: Dependency Resolver - Locate and collect all support files
- **Step 7**: Code Builder - Transform and bundle everything into executable code

Currently, when you write `main.fjs` with `Container`, `Center`, `Scaffold`, the system doesn't know where these come from or how to make them work. This plan fixes that.

---

## Table of Contents

1. [Problem Analysis](#1-problem-analysis)
2. [Dependency Resolver Architecture](#2-dependency-resolver-architecture)
3. [Package Collection System](#3-package-collection-system)
4. [Code Transformation Pipeline](#4-code-transformation-pipeline)
5. [Build Process](#5-build-process)
6. [Development Mode (.dev folder)](#6-development-mode-dev-folder)
7. [Implementation Steps](#7-implementation-steps)

---

## 1. Problem Analysis

### 1.1 Current Gap

```
❌ WHAT'S MISSING:

main.fjs
  import Container from '@flutterjs/material'
  class MyApp extends StatelessWidget {
    build() {
      return Container({ child: Text('Hello') })
    }
  }
         ↓
   Analyzer extracts metadata
         ↓
   ??? HOW DOES Container ACTUALLY WORK ???
         ↓
   HTML DOM element on page


✅ WHAT WE NEED:

main.fjs
  import Container from '@flutterjs/material'
         ↓
Dependency Resolver finds:
  • @flutterjs/material package
  • Container.js implementation
  • All its dependencies (EdgeInsets, BoxDecoration, etc.)
  • All transitive dependencies
         ↓
Code Builder transforms:
  • ES6 imports → bundled modules
  • Widget constructors → factory functions
  • widget.build() → VNode generation
  • setState → state management hooks
         ↓
Bundle includes:
  • Runtime engine
  • All widget implementations
  • Helper utilities
  • Styles & assets
         ↓
Server serves in .dev/ folder
  • Runtime: runtime.js
  • App: app.js
  • Styles: styles.css
  • Supporting files: container.js, center.js, etc.
         ↓
Browser loads and executes
```

### 1.2 Concrete Example Flow

**Input: main.fjs**
```javascript
import { Container, Center, Text } from '@flutterjs/material';
import { Scaffold, AppBar } from '@flutterjs/material';

class MyApp extends StatelessWidget {
  build(context) {
    return Scaffold({
      appBar: AppBar({ title: Text('Hello') }),
      body: Center({
        child: Container({
          color: Colors.blue,
          child: Text('World')
        })
      })
    });
  }
}
```

**What needs to happen:**

```
1. ANALYZE
   • Detect imports: Container, Center, Text, Scaffold, AppBar, Colors
   • Detect widget: MyApp (StatelessWidget)
   • Detect all build() method references

2. RESOLVE DEPENDENCIES
   • @flutterjs/material → /node_modules/@flutterjs/material/
   • Container → /packages/material/container.js
   • Center → /packages/material/center.js
   • Text → /packages/material/text.js
   • Scaffold → /packages/material/scaffold.js
   • AppBar → /packages/material/app_bar.js
   • Colors → /packages/material/colors.js
   • And all THEIR dependencies (EdgeInsets, BoxDecoration, etc.)

3. COLLECT FILES
   • Copy all .js files to .dev/lib/
   • Include in bundle
   • Create index that imports everything

4. TRANSFORM CODE
   • Rewrite imports to use bundled paths
   • Transform widget instantiation
   • Add lifecycle hooks
   • Inject state management

5. BUILD BUNDLE
   • .dev/runtime.js - Core runtime
   • .dev/app.js - Transpiled user code
   • .dev/lib/ - All support files
   • .dev/styles.css - Compiled styles

6. SERVER SERVES
   When dev server runs:
   • Serves .dev/index.html
   • Injects app.js script
   • Client loads and runs
```

---

## 2. Dependency Resolver Architecture

### 2.1 Resolver System

```javascript
class DependencyResolver {
  constructor(config) {
    this.config = config;
    this.projectRoot = config.projectRoot;
    this.cache = new Map();           // Already resolved
    this.graph = new Map();            // Dependency graph
    this.resolved = new Set();         // Processed modules
    this.pending = new Set();          // To process
  }

  /**
   * Main entry point - resolve all imports
   */
  async resolveAll(importStatements, entryFile) {
    this.pending = new Set(importStatements.map(imp => imp.source));
    
    // BFS to resolve all dependencies
    while (this.pending.size > 0) {
      const current = this.pending.values().next().value;
      this.pending.delete(current);
      
      if (this.resolved.has(current)) continue;
      
      await this.resolveOne(current);
      this.resolved.add(current);
    }
    
    return this.buildResolutionMap();
  }

  /**
   * Resolve a single import statement
   */
  async resolveOne(importSource) {
    // Check cache first
    if (this.cache.has(importSource)) {
      return this.cache.get(importSource);
    }

    let resolution;

    // Categorize: builtin, wrapped, or npm
    if (importSource.startsWith('@flutterjs/')) {
      resolution = await this.resolveBuiltin(importSource);
    } else {
      resolution = await this.resolveNPM(importSource);
    }

    this.cache.set(importSource, resolution);
    
    // Queue any new dependencies
    if (resolution.dependencies) {
      for (const dep of resolution.dependencies) {
        if (!this.resolved.has(dep)) {
          this.pending.add(dep);
        }
      }
    }

    return resolution;
  }

  /**
   * Resolve @flutterjs/* builtin packages
   */
  async resolveBuiltin(packageName) {
    // @flutterjs/material → @flutterjs/core, @flutterjs/icons, etc.
    const packagePath = this.getBuiltinPackagePath(packageName);
    
    const manifest = await this.readPackageManifest(packagePath);
    
    return {
      type: 'builtin',
      name: packageName,
      path: packagePath,
      main: manifest.main,
      exports: manifest.exports,
      dependencies: manifest.dependencies || [],
      files: await this.listPackageFiles(packagePath)
    };
  }

  /**
   * Resolve npm packages
   */
  async resolveNPM(packageName) {
    const packagePath = this.getNPMPackagePath(packageName);
    
    if (!fs.existsSync(packagePath)) {
      throw new Error(`Package not found: ${packageName}\n` +
        `Looked in: ${packagePath}\n` +
        `Install with: npm install ${packageName}`);
    }

    const manifest = await this.readPackageManifest(packagePath);
    
    return {
      type: 'npm',
      name: packageName,
      path: packagePath,
      main: manifest.main || 'index.js',
      exports: manifest.exports || {},
      dependencies: manifest.dependencies || [],
      files: await this.listPackageFiles(packagePath)
    };
  }

  /**
   * Read package.json
   */
  async readPackageManifest(packagePath) {
    const packageJsonPath = path.join(packagePath, 'package.json');
    const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get all files in package
   */
  async listPackageFiles(packagePath) {
    const files = [];
    
    async function traverse(dir) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;  // Skip hidden and node_modules
        }
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
          files.push({
            path: fullPath,
            relative: path.relative(packagePath, fullPath)
          });
        } else if (entry.isDirectory()) {
          await traverse(fullPath);
        }
      }
    }
    
    await traverse(packagePath);
    return files;
  }

  /**
   * Get path to builtin package
   */
  getBuiltinPackagePath(packageName) {
    // @flutterjs/material → ./packages/material/
    const name = packageName.replace('@flutterjs/', '');
    return path.join(
      path.dirname(import.meta.url),
      '../../packages',
      name
    );
  }

  /**
   * Get path to npm package
   */
  getNPMPackagePath(packageName) {
    return path.join(this.projectRoot, 'node_modules', packageName);
  }

  /**
   * Build complete resolution map
   */
  buildResolutionMap() {
    const map = new Map();
    
    for (const [source, resolution] of this.cache) {
      map.set(source, {
        type: resolution.type,
        path: resolution.path,
        files: resolution.files,
        exports: resolution.exports,
        main: resolution.main
      });
    }
    
    return map;
  }

  /**
   * Get all files to include in bundle
   */
  getAllFiles() {
    const allFiles = [];
    
    for (const resolution of this.cache.values()) {
      allFiles.push(...resolution.files);
    }
    
    // Remove duplicates
    const uniqueMap = new Map();
    for (const file of allFiles) {
      uniqueMap.set(file.path, file);
    }
    
    return Array.from(uniqueMap.values());
  }
}
```

### 2.2 Resolution Map Output

```javascript
ResolutionMap = {
  '@flutterjs/material': {
    type: 'builtin',
    path: '/packages/material/',
    files: [
      { path: '/packages/material/container.js', relative: 'container.js' },
      { path: '/packages/material/center.js', relative: 'center.js' },
      { path: '/packages/material/text.js', relative: 'text.js' },
      // ... more files
    ],
    exports: {
      'Container': 'container.js',
      'Center': 'center.js',
      'Text': 'text.js'
    }
  },
  '@flutterjs/core': {
    type: 'builtin',
    path: '/packages/core/',
    files: [ /* ... */ ],
    exports: { /* ... */ }
  }
}
```

---

## 3. Package Collection System

### 3.1 File Collector

```javascript
class PackageCollector {
  constructor(config) {
    this.config = config;
    this.targetDir = path.join(config.projectRoot, '.dev', 'lib');
    this.collected = new Set();
  }

  /**
   * Collect all needed files
   */
  async collect(resolutionMap) {
    console.log('📦 Collecting package files...\n');

    // Ensure target directory exists
    await fs.promises.mkdir(this.targetDir, { recursive: true });

    const copied = [];

    // Process each resolved package
    for (const [packageName, resolution] of resolutionMap) {
      console.log(`  Processing ${packageName}...`);

      for (const file of resolution.files) {
        // Skip if already collected
        if (this.collected.has(file.path)) {
          continue;
        }

        const destPath = path.join(this.targetDir, file.relative);
        
        // Create destination directory
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

        // Copy file
        await fs.promises.copyFile(file.path, destPath);

        this.collected.add(file.path);
        copied.push({
          source: file.path,
          dest: destPath,
          package: packageName,
          relative: file.relative
        });

        console.log(`    ✓ ${file.relative}`);
      }
    }

    console.log(`\n✅ Collected ${copied.length} files\n`);

    return copied;
  }

  /**
   * Create index.js that exports all
   */
  async createIndex(resolutionMap) {
    let indexContent = '// Auto-generated index\n\n';

    // Import all packages
    for (const [packageName, resolution] of resolutionMap) {
      // Import main module
      const mainFile = resolution.main || 'index.js';
      const mainPath = `./${path.basename(path.dirname(mainFile))}/${mainFile}`;
      
      indexContent += `// From ${packageName}\n`;
      
      // Import each export
      for (const [exportName, exportFile] of Object.entries(resolution.exports)) {
        const relativePath = `./${exportFile}`;
        indexContent += `export { ${exportName} } from '${relativePath}';\n`;
      }
      
      indexContent += '\n';
    }

    const indexPath = path.join(this.targetDir, 'index.js');
    await fs.promises.writeFile(indexPath, indexContent, 'utf-8');
    
    console.log(`✓ Created ${indexPath}\n`);
  }
}
```

### 3.2 File Structure After Collection

```
.dev/
├── lib/
│   ├── index.js              # Auto-generated, exports all
│   ├── container.js          # From @flutterjs/material
│   ├── center.js             # From @flutterjs/material
│   ├── text.js               # From @flutterjs/material
│   ├── scaffold.js           # From @flutterjs/material
│   ├── app_bar.js            # From @flutterjs/material
│   ├── widget.js             # From @flutterjs/core
│   ├── stateless_widget.js   # From @flutterjs/core
│   └── ... (all other files)
├── app.js                    # Compiled user code
├── runtime.js                # Runtime engine
├── styles.css                # Styles
└── index.html                # Entry point
```

---

## 4. Code Transformation Pipeline

### 4.1 Import Rewriting

```javascript
class ImportRewriter {
  constructor(resolutionMap) {
    this.resolutionMap = resolutionMap;
  }

  /**
   * Rewrite imports in user code
   */
  rewrite(sourceCode) {
    let transformed = sourceCode;

    // Find all import statements
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    
    const replacements = [];
    let match;

    while ((match = importRegex.exec(sourceCode)) !== null) {
      const imports = match[1].trim();
      const source = match[2].trim();
      
      // Only rewrite @flutterjs imports
      if (!source.startsWith('@flutterjs/')) {
        continue;
      }

      const resolution = this.resolutionMap.get(source);
      if (!resolution) {
        throw new Error(`Cannot resolve: ${source}`);
      }

      // Build new import statement
      const importSpecifiers = imports.split(',').map(s => s.trim());
      const newImports = [];

      for (const spec of importSpecifiers) {
        const [name, alias] = spec.includes(' as ') 
          ? spec.split(' as ').map(s => s.trim())
          : [spec, spec];

        // Find which file exports this
        const exportFile = this.findExportFile(source, name);
        if (!exportFile) {
          throw new Error(`${source} does not export ${name}`);
        }

        // Create relative import
        const relPath = exportFile.replace('.js', '');
        newImports.push(`import { ${name}${alias !== name ? ` as ${alias}` : ''} } from './lib/${relPath}.js'`);
      }

      // Replace entire import block
      const oldImport = match[0];
      const newImport = newImports.join(';\n') + ';';
      
      replacements.push({ old: oldImport, new: newImport });
    }

    // Apply replacements
    for (const { old, new: newVal } of replacements) {
      transformed = transformed.replace(old, newVal);
    }

    return transformed;
  }

  /**
   * Find which file exports a symbol
   */
  findExportFile(packageName, exportName) {
    const resolution = this.resolutionMap.get(packageName);
    if (!resolution) return null;

    // Look in exports map
    for (const [name, file] of Object.entries(resolution.exports)) {
      if (name === exportName) {
        return file;
      }
    }

    return null;
  }
}
```

### 4.2 Code Transformation

```javascript
class CodeTransformer {
  constructor(analysis, resolutionMap) {
    this.analysis = analysis;
    this.resolutionMap = resolutionMap;
  }

  /**
   * Transform widget code for runtime
   */
  transform(sourceCode) {
    let code = sourceCode;

    // Step 1: Rewrite imports
    const importer = new ImportRewriter(this.resolutionMap);
    code = importer.rewrite(code);

    // Step 2: Transform widget constructors
    code = this.transformWidgetConstructors(code);

    // Step 3: Transform setState calls
    code = this.transformSetState(code);

    // Step 4: Add lifecycle hooks
    code = this.addLifecycleHooks(code);

    // Step 5: Add exports
    code = this.ensureExports(code);

    return code;
  }

  /**
   * Transform widget instantiation
   * new Container({...}) → createContainer({...})
   */
  transformWidgetConstructors(code) {
    // Find all 'new ClassName({...})' patterns
    const pattern = /new\s+(\w+)\s*\(\s*{/g;
    
    return code.replace(pattern, (match, className) => {
      // Keep it as-is for now, but add metadata
      return `new ${className}({`;
    });
  }

  /**
   * Transform setState calls
   */
  transformSetState(code) {
    const pattern = /this\.setState\(\s*\(\)\s*=>\s*({[^}]+})\s*\)/g;
    
    return code.replace(pattern, (match, stateChange) => {
      // Mark for state tracking
      return `this.__setState(${stateChange})`;
    });
  }

  /**
   * Add lifecycle hooks
   */
  addLifecycleHooks(code) {
    // Add lifecycle tracking to StatefulWidget classes
    let transformed = code;

    for (const [name, widget] of this.analysis.widgets) {
      if (widget.type !== 'stateful') continue;

      // Inject state tracking
      const pattern = new RegExp(
        `class ${widget.stateClass}\\s+extends\\s+State\\s+{`,
        'g'
      );

      transformed = transformed.replace(pattern, (match) => {
        return match + `
  __stateUpdates = [];
  __setState(changes) {
    Object.assign(this, changes);
    this.__stateUpdates.push(changes);
  }
        `;
      });
    }

    return transformed;
  }

  /**
   * Ensure proper exports
   */
  ensureExports(code) {
    // Get all top-level classes and functions
    const classPattern = /class\s+(\w+)/g;
    const functionPattern = /function\s+(\w+)/g;

    const exported = new Set();
    let match;

    while ((match = classPattern.exec(code)) !== null) {
      exported.add(match[1]);
    }

    classPattern.lastIndex = 0;

    while ((match = functionPattern.exec(code)) !== null) {
      exported.add(match[1]);
    }

    // Add export statement if missing
    if (!code.includes('export {')) {
      const exportList = Array.from(exported).join(', ');
      code += `\n\nexport { ${exportList} };\n`;
    }

    return code;
  }
}
```

---

## 5. Build Process

### 5.1 Complete Build Pipeline

```javascript
class BuildPipeline {
  constructor(config) {
    this.config = config;
    this.projectRoot = config.projectRoot;
  }

  /**
   * Execute complete build
   */
  async build(entryFile) {
    console.log('🚀 Starting build process...\n');

    try {
      // Step 1: Analyze
      console.log('1️⃣  Analyzing code...');
      const analysis = await this.analyzeCode(entryFile);

      // Step 2: Resolve dependencies
      console.log('\n2️⃣  Resolving dependencies...');
      const resolver = new DependencyResolver(this.config);
      const resolutionMap = await resolver.resolveAll(
        analysis.imports,
        entryFile
      );

      // Step 3: Collect files
      console.log('\n3️⃣  Collecting package files...');
      const collector = new PackageCollector(this.config);
      const collected = await collector.collect(resolutionMap);
      await collector.createIndex(resolutionMap);

      // Step 4: Read source code
      console.log('\n4️⃣  Reading source code...');
      const sourceCode = await fs.promises.readFile(entryFile, 'utf-8');

      // Step 5: Transform code
      console.log('\n5️⃣  Transforming code...');
      const transformer = new CodeTransformer(analysis, resolutionMap);
      const transformedCode = transformer.transform(sourceCode);

      // Step 6: Write output
      console.log('\n6️⃣  Writing output files...');
      await this.writeOutput(transformedCode, analysis);

      // Step 7: Generate HTML
      console.log('\n7️⃣  Generating HTML...');
      await this.generateHTML();

      console.log('\n✅ Build successful!\n');
      console.log(`📂 Output: .dev/\n`);

      return {
        success: true,
        analysis,
        resolutionMap,
        collected
      };

    } catch (error) {
      console.error('\n❌ Build failed:\n', error.message);
      throw error;
    }
  }

  /**
   * Analyze code
   */
  async analyzeCode(entryFile) {
    const analyzer = new FlutterJSAnalyzer();
    const code = await fs.promises.readFile(entryFile, 'utf-8');
    return analyzer.analyze(code);
  }

  /**
   * Write output files
   */
  async writeOutput(transformedCode, analysis) {
    const devDir = path.join(this.projectRoot, '.dev');
    
    // Create directories
    await fs.promises.mkdir(devDir, { recursive: true });
    await fs.promises.mkdir(path.join(devDir, 'lib'), { recursive: true });

    // Write compiled app code
    const appPath = path.join(devDir, 'app.js');
    await fs.promises.writeFile(appPath, transformedCode, 'utf-8');
    console.log(`  ✓ ${appPath}`);

    // Write runtime
    const runtimeSrc = path.join(
      path.dirname(import.meta.url),
      '../../runtime/runtime.js'
    );
    const runtimeDest = path.join(devDir, 'runtime.js');
    await fs.promises.copyFile(runtimeSrc, runtimeDest);
    console.log(`  ✓ ${runtimeDest}`);

    // Write styles
    const stylesSrc = path.join(
      path.dirname(import.meta.url),
      '../../styles/index.css'
    );
    const stylesDest = path.join(devDir, 'styles.css');
    await fs.promises.copyFile(stylesSrc, stylesDest);
    console.log(`  ✓ ${stylesDest}`);
  }

  /**
   * Generate HTML entry point
   */
  async generateHTML() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlutterJS App</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    #root {
      width: 100%;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="/runtime.js" defer></script>
  <script src="/app.js" type="module" defer></script>
</body>
</html>
    `;

    const htmlPath = path.join(this.projectRoot, '.dev', 'index.html');
    await fs.promises.writeFile(htmlPath, html, 'utf-8');
    console.log(`  ✓ ${htmlPath}`);
  }
}
```

---

## 6. Development Mode (.dev folder)

### 6.1 Dev Server Integration

```javascript
// In dev server initialization

class DevServer {
  async start() {
    // Build before serving
    const builder = new BuildPipeline(this.config);
    await builder.build(this.config.entryFile);

    // Now all files are in .dev/
    const devDir = path.join(this.projectRoot, '.dev');

    // Watch for changes
    if (this.config.watch) {
      chokidar.watch(this.config.entryFile).on('change', async () => {
        console.log('\n🔄 File changed, rebuilding...\n');
        try {
          await builder.build(this.config.entryFile);
          this.notifyClients('rebuild-complete');
        } catch (error) {
          console.error('Rebuild failed:', error.message);
          this.notifyClients('rebuild-failed', error);
        }
      });
    }

    // Serve .dev directory
    app.use(express.static(devDir));

    // Start server
    app.listen(this.port, () => {
      console.log(`✅ Dev server at http://localhost:${this.port}`);
      console.log(`📂 Serving from: ${devDir}\n`);
    });
  }
}
```

### 6.2 Files Served to Browser

```
Browser requests: http://localhost:3000/

Server serves from: .dev/

Available files:
├── index.html
├── app.js (with all imports rewritten to ./lib/)
├── runtime.js
├── styles.css
└── lib/
    ├── container.js
    ├── center.js
    ├── text.js
    ├── scaffold.js
    ├── app_bar.js
    ├── widget.js
    ├── ... (all support files)
```

**index.html loads:**
```html
<script src="/app.js" type="module"></script>
```

**app.js contains:**
```javascript
import { Container, Center, Text } from './lib/container.js';
import { Scaffold, AppBar } from './lib/scaffold.js';
// ... etc

class MyApp extends StatelessWidget {
  build(context) {
    return Container({ ... });
  }
}

export { MyApp };
```

**Browser executes:**
- Loads app.js
- app.js imports from ./lib/
- All dependencies available locally
- Runtime engine executes
- Widgets render to DOM

---

## 7. Implementation Steps

### Phase 1: Dependency Resolver (Days 1-2)

```javascript
// cli/build/dependency-resolver.js
class DependencyResolver {
  async resolveAll(imports) { ... }
  async resolveOne(source) { ... }
  async resolveBuiltin(name) { ... }
}

// cli/build/package-collector.js
class PackageCollector {
  async collect(resolutionMap) { ... }
}
```

### Phase 2: Code Transformer (Days 3-4)

```javascript
// cli/build/import-rewriter.js
class ImportRewriter {
  rewrite(code) { ... }
}

// cli/build/code-transformer.js
class CodeTransformer {
  transform(code) { ... }
}
```

### Phase 3: Build Pipeline (Days 5-6)

```javascript
// cli/build/build-pipeline.js
class BuildPipeline {
  async build(entryFile) { ... }
  async writeOutput(code) { ... }
  async generateHTML() { ... }
}
```

### Phase 4: Integration (Days 7-8)

```javascript
// Integrate with DevServer
// Integrate with CLI: flutterjs dev
// Add watch mode
// Add hot reload support
```

---

## Summary

This **Step 6 & 7** completes the missing link:

✅ **Dependency Resolution**: Find all needed files from packages

✅ **Package Collection**: Copy support files to .dev/lib/

✅ **Code Transformation**: Rewrite imports, add metadata

✅ **Build Process**: Complete pipeline from .fjs to .dev/

✅ **Dev Server Integration**: Auto-builds when you run `flutterjs dev`

✅ **Browser Execution**: All files available at ./lib/ paths

Now when user writes `Container`, the system:
1. Finds it in `@flutterjs/material`
2. Collects `container.js` to `.dev/lib/`
3. Rewrites imports to use `./lib/container.js`
4. Server serves all files
5. Browser loads and executes everything

**No more missing dependencies!**
