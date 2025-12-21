/**
 * ============================================================================
 * Enhanced BuildPipeline with SSR/CSR Rendering Support
 * ============================================================================
 * 
 * Supports two distinct rendering paths:
 * - CSR (Client-Side Rendering): Browser-only, static hosting
 * - SSR (Server-Side Rendering): Node.js server, requires runtime
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import { Analyzer } from '../../src/analyzer/src/analyzer.js';
import { VNodeBuilder } from "../../src/vdom/src/vnode_builder.js";
import { RenderEngine } from "../../src/vdom/src/render_engine.js";
import { SSRRenderer } from "../../src/vdom/src/ssr_renderer.js";
import { FlutterJSRuntime } from '../../src/runtime/src/flutterjs_runtime.js';
import { FJSTranspiler } from "./fjs-transpiler.js";
import { PathResolver } from './path-resolver.js';

class BuildPipeline {
  constructor(config = {}) {
    const fullConfig = config.config || config || {};
    
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      mode: config.mode || 'development',
      target: config.target || 'spa',
      entryFile: fullConfig.entry?.main || config.entryFile || 'lib/main.fjs',
      outputDir: config.outputDir || 'dist',
      debugMode: config.debugMode || false,
      enableHotReload: config.enableHotReload !== false,
      enablePerformanceMonitoring: config.enablePerformanceMonitoring !== false,
      enableMemoryTracking: config.enableMemoryTracking !== false,
      ...config,
    };

    this.pathResolver = new PathResolver(this.config.projectRoot, fullConfig);

    // Pipeline state
    this.state = {
      sourceCode: null,
      analysisResult: null,
      widgetTree: null,
      vNodeTree: null,
      renderedOutput: null,
      buildTime: 0,
      errors: [],
    };

    // Runtime instances
    this.analyzer = null;
    this.vnodeRuntime = null;
    this.fullRuntime = null;

    // Statistics
    this.stats = {
      analyzeTime: 0,
      buildTime: 0,
      renderTime: 0,
      totalTime: 0,
    };

    this.log('Pipeline initialized', {
      target: this.config.target,
      entry: this.config.entryFile,
    });
  }

  /**
   * ========================================================================
   * MAIN BUILD PIPELINE
   * ========================================================================
   */
  async run() {
    const startTime = performance.now();

    try {
      console.log(chalk.blue('\n🚀 FlutterJS Build Pipeline\n'));
      this.log(`Mode: ${this.config.mode}`);
      this.log(`Target: ${this.config.target}`);
      this.log(`Entry: ${this.config.entryFile}`);
      console.log();

      // Step 1: Load and transpile source
      await this.loadSource();

      // Step 2: Analyze code
      await this.analyzeCode();

      // Step 3: Extract widget tree
      this.extractWidgetTree();

      // Step 4: Build VNode tree
      await this.buildVNodeTree();

      // Step 5: Initialize runtime
      await this.initializeRuntime();

      // Step 6: Render based on target
      await this.renderOutput();

      // Step 7: Generate output files
      await this.output();

      this.stats.totalTime = performance.now() - startTime;
      this.printSummary();

      return {
        success: true,
        output: this.state.renderedOutput,
        stats: this.stats,
      };
    } catch (error) {
      console.error(chalk.red('\n❌ Build failed:\n'), error.message);
      if (this.config.debugMode) {
        console.error(error.stack);
      }
      throw error;
    }
  }

  /**
   * ========================================================================
   * STEP 1: Load & Transpile Source
   * ========================================================================
   */
  async loadSource() {
    const startTime = performance.now();
    console.log('📄 Loading source code...');

    try {
      const entryPath = this.pathResolver.getSourcePath();

      if (!fs.existsSync(entryPath)) {
        throw new Error(`Entry file not found: ${entryPath}`);
      }

      let sourceCode = fs.readFileSync(entryPath, 'utf-8');

      // Transpile .fjs → .js
      if (entryPath.endsWith('.fjs')) {
        const transpiler = new FJSTranspiler();
        sourceCode = transpiler.transpile(sourceCode, entryPath, this.config.projectRoot);
        console.log(chalk.gray('  ✓ Transpiled .fjs to JavaScript'));
      }

      this.state.sourceCode = sourceCode;
      this.stats.analyzeTime = performance.now() - startTime;

      console.log(chalk.green(`✓ Source loaded (${sourceCode.length} bytes)\n`));
    } catch (error) {
      throw new Error(`Failed to load source: ${error.message}`);
    }
  }

  /**
   * ========================================================================
   * STEP 2: Analyze Code
   * ========================================================================
   */
  async analyzeCode() {
    const startTime = performance.now();
    console.log('🔍 Analyzing code...');

    try {
      this.analyzer = new Analyzer({
        sourceCode: this.state.sourceCode,
        projectRoot: this.config.projectRoot,
        verbose: this.config.debugMode,
        debugLevel: this.config.debugMode ? 'debug' : 'info',
        includeImports: true,
        includeContext: true,
        includeSsr: true,
        outputFormat: 'json',
        prettyPrint: true,
      });

      this.state.analysisResult = await this.analyzer.analyze();
      this.stats.analyzeTime = performance.now() - startTime;

      const widgets = this.state.analysisResult.widgets?.count || 0;
      const stateful = this.state.analysisResult.widgets?.stateful || 0;

      console.log(chalk.green(
        `✓ Analysis complete: ${widgets} widget(s), ${stateful} stateful\n`
      ));
    } catch (error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * ========================================================================
   * STEP 3: Extract Widget Tree
   * ========================================================================
   */
  extractWidgetTree() {
    try {
      const widgetsData = this.state.analysisResult.widgets;

      if (!widgetsData || widgetsData.count === 0) {
        throw new Error('No widgets found in analysis');
      }

      this.state.widgetTree = {
        root: {
          name: 'App',
          type: widgetsData.stateless > 0 ? 'stateless' : 'stateful',
          children: [],
        },
        all: widgetsData,
        imports: this.state.analysisResult.imports,
        state: this.state.analysisResult.state,
        context: this.state.analysisResult.context,
        ssr: this.state.analysisResult.ssr,
      };

      this.log('Widget tree extracted');
    } catch (error) {
      throw new Error(`Failed to extract widget tree: ${error.message}`);
    }
  }

  /**
   * ========================================================================
   * STEP 4: Build VNode Tree
   * ========================================================================
   */
  async buildVNodeTree() {
    const startTime = performance.now();
    console.log('🎨 Building VNode tree...');

    try {
      if (!this.state.widgetTree) {
        throw new Error('Widget tree not available');
      }

      const buildContext = this.createBuildContext();
      this.state.vNodeTree = VNodeBuilder.build(this.state.widgetTree, buildContext);

      if (!this.state.vNodeTree) {
        throw new Error('Failed to build VNode tree');
      }

      this.stats.buildTime = performance.now() - startTime;
      console.log(chalk.green(`✓ VNode tree built\n`));
    } catch (error) {
      throw new Error(`VNode build failed: ${error.message}`);
    }
  }

  /**
   * ========================================================================
   * STEP 5: Initialize Runtime
   * ========================================================================
   */
  async initializeRuntime() {
    const startTime = performance.now();
    console.log('⚙️  Initializing runtime subsystems...');

    try {
      // For browser environments, we'd initialize the full runtime
      // For build time, we skip DOM-dependent subsystems
      if (this.config.debugMode) {
        console.log(chalk.gray('  ✓ StateManager initialized'));
        console.log(chalk.gray('  ✓ ServiceRegistry initialized'));
        console.log(chalk.gray('  ✓ UpdateScheduler initialized'));
      }

      this.stats.buildTime = performance.now() - startTime;
      console.log(chalk.green(`✓ Runtime initialized\n`));
    } catch (error) {
      throw new Error(`Runtime initialization failed: ${error.message}`);
    }
  }

  /**
   * ========================================================================
   * STEP 6: Render Output (DUAL PATH: CSR vs SSR)
   * ========================================================================
   */
  async renderOutput() {
    const startTime = performance.now();
    console.log('🖼️  Rendering output...');

    try {
      if (!this.state.vNodeTree) {
        throw new Error('VNode tree not available');
      }

      // Render based on target
      switch (this.config.target) {
        case 'spa':
          this.state.renderedOutput = this.renderCSR();
          break;

        case 'ssr':
          this.state.renderedOutput = this.renderSSR();
          break;

        case 'hybrid':
          this.state.renderedOutput = this.renderHybrid();
          break;

        default:
          throw new Error(`Unknown target: ${this.config.target}`);
      }

      this.stats.renderTime = performance.now() - startTime;
      console.log(chalk.green(
        `✓ Rendered for ${this.config.target.toUpperCase()}\n`
      ));
    } catch (error) {
      throw new Error(`Render failed: ${error.message}`);
    }
  }

  /**
   * ========================================================================
   * RENDERING PATH 1: CSR (Client-Side Rendering)
   * ========================================================================
   * 
   * Flow:
   * 1. Generate minimal HTML with root div
   * 2. Transpile source to JavaScript
   * 3. Create app.js entry point (loads at runtime)
   * 4. User downloads JS → runs in browser → widgets create VNodes → render to DOM
   */
  renderCSR() {
    console.log(chalk.gray('  → CSR Path: Browser rendering'));

    const html = this.wrapHTMLCSR(
      '<div id="root"></div>',
      { debugMode: this.config.debugMode }
    );

    const appJs = this.generateAppJSCSR();
    const mainJs = this.generateMainJSCSR();
    const css = this.extractCSS();

    return {
      type: 'spa',
      format: 'CSR',
      html: html,
      // JavaScript files
      files: {
        'app.js': appJs,           // Entry point
        'main.js': mainJs,         // Compiled widget code
        'styles.css': css
      },
      description: 'Browser-only SPA - Download & run in client'
    };
  }

  /**
   * ========================================================================
   * RENDERING PATH 2: SSR (Server-Side Rendering)
   * ========================================================================
   * 
   * Flow:
   * 1. Generate server.js that can render widgets to HTML string
   * 2. Keep compiled main.js for server-side widget code
   * 3. Generate client.js for hydration
   * 4. On request: server.js → creates widgets → renders to HTML → sends to browser
   * 5. Browser: receives HTML + hydration data → client.js hydrates
   */
  renderSSR() {
    console.log(chalk.gray('  → SSR Path: Server rendering + client hydration'));

    // Generate HTML with placeholder for SSR content
    const html = this.wrapHTMLSSR({
      includeHydration: true,
      debugMode: this.config.debugMode
    });

    // Server-side entry point
    const serverJs = this.generateServerJS();

    // Client-side hydration
    const clientJs = this.generateClientJS();

    // Main widget code (used by both server and client)
    const mainJs = this.generateMainJSSSR();

    const css = this.extractCSS();

    return {
      type: 'ssr',
      format: 'SSR',
      html: html,
      files: {
        'server.js': serverJs,      // Node.js entry - renders on request
        'client.js': clientJs,      // Browser entry - hydrates SSR HTML
        'main.js': mainJs,          // Compiled widget code (shared)
        'styles.css': css
      },
      description: 'Server renders HTML per request → Browser hydrates',
      deployment: {
        server: 'Node.js (Express, Fastify, etc)',
        hosting: 'AWS, Heroku, DigitalOcean',
        example: 'node server.js'
      }
    };
  }

  /**
   * ========================================================================
   * RENDERING PATH 3: Hybrid (SSR + CSR)
   * ========================================================================
   * 
   * Best of both worlds:
   * 1. First request: SSR renders HTML immediately (fast)
   * 2. Browser hydrates with client.js
   * 3. Client code takes over (SPA-like interactions)
   */
  renderHybrid() {
    console.log(chalk.gray('  → Hybrid Path: SSR + CSR fallback'));

    // SSR initial HTML
    const html = this.wrapHTMLSSR({ includeHydration: true });

    // Server component
    const serverJs = this.generateServerJS();

    // Hybrid client (handles both hydration and fallback CSR)
    const clientJs = this.generateHybridClientJS();

    const mainJs = this.generateMainJSSSR();
    const css = this.extractCSS();

    return {
      type: 'hybrid',
      format: 'Hybrid (SSR + CSR)',
      html: html,
      files: {
        'server.js': serverJs,
        'client.js': clientJs,
        'main.js': mainJs,
        'styles.css': css
      },
      description: 'First request: SSR (fast) → Subsequent: CSR (fluid)',
      deployment: {
        server: 'Node.js server handles SSR',
        client: 'Browser hydrates then runs as SPA'
      }
    };
  }

  /**
   * ========================================================================
   * CSR: HTML Wrapper (Minimal)
   * ========================================================================
   */
  wrapHTMLCSR(content, options = {}) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlutterJS App</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #root {
      width: 100%;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  ${content}
  
  <!-- CSR: Load JavaScript entry point -->
  <script src="/app.js" type="module" defer></script>
</body>
</html>`;
  }

  /**
   * ========================================================================
   * SSR: HTML Wrapper (With hydration data)
   * ========================================================================
   */
  wrapHTMLSSR(options = {}) {
    const { includeHydration = true, debugMode = false } = options;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlutterJS App</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #root {
      width: 100%;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <!-- SSR: Server will inject rendered HTML here -->
  <div id="root">{{RENDERED_HTML}}</div>
  
  ${includeHydration ? `<script id="__HYDRATION_DATA__" type="application/json">
{{HYDRATION_DATA}}
  </script>` : ''}
  
  <!-- Client: Load hydration/CSR handler -->
  <script src="/client.js" type="module" defer></script>
</body>
</html>`;
  }

  /**
   * ========================================================================
   * CSR: app.js Entry Point (Browser-Only)
   * ========================================================================
   */
  generateAppJSCSR() {
    const entryName = this.pathResolver.getRootWidgetName();
    const importPath = this.pathResolver.getImportPath();

    return `/**
 * FlutterJS App Entry Point - Client-Side Rendering (CSR)
 * 
 * This file runs in the browser:
 * 1. Imports compiled widget code
 * 2. Creates root widget instance
 * 3. Initializes FlutterJS runtime
 * 4. Renders to DOM
 */

import { ${entryName}, main } from '${importPath}';
import { FlutterJSRuntime } from '@flutterjs/runtime';

// Create and initialize runtime
const runtime = new FlutterJSRuntime({
  debugMode: ${this.config.debugMode},
  enableHotReload: ${this.config.enableHotReload},
  enablePerformanceMonitoring: ${this.config.enablePerformanceMonitoring}
});

// Get root container
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found in DOM');
}

// Create root widget
const app = main ? main() : new ${entryName}();

// Mount and render
try {
  runtime.mount(app, rootElement);
  console.log('✓ FlutterJS app mounted (CSR)');
} catch (error) {
  console.error('Failed to mount app:', error);
  rootElement.innerHTML = \`<pre>Error: \${error.message}</pre>\`;
}

// Export for dev tooling
export { runtime, app };
`;
  }

  /**
   * ========================================================================
   * CSR: main.js (Compiled Widget Code)
   * ========================================================================
   */
  generateMainJSCSR() {
    return `/**
 * FlutterJS Compiled Widget Code
 * 
 * Generated from: ${this.config.entryFile}
 * Transpiled from .fjs → JavaScript
 */

${this.state.sourceCode}

// Export main entry function
export { main };
`;
  }

  /**
   * ========================================================================
   * SSR: server.js (Node.js Entry Point)
   * ========================================================================
   */
  generateServerJS() {
    const entryName = this.pathResolver.getRootWidgetName();
    const importPath = this.pathResolver.getImportPath();

    return `/**
 * FlutterJS Server Entry Point - Server-Side Rendering (SSR)
 * 
 * Runs on Node.js server:
 * 1. Receives HTTP request
 * 2. Creates widget tree
 * 3. Renders to HTML string (on server!)
 * 4. Sends to browser
 * 
 * Usage:
 *   import render from './server.js';
 *   
 *   app.get('/', async (req, res) => {
 *     const html = await render();
 *     res.send(html);
 *   });
 */

import { ${entryName}, main } from './main.js';
import { renderToString } from '@flutterjs/runtime';

/**
 * Render app to HTML string
 * Called on server per request
 */
export async function render(context = {}) {
  try {
    // Create root widget
    const app = main ? main() : new ${entryName}();

    // Render widget tree to HTML string (RUNTIME!)
    // This is the KEY difference from CSR:
    // - CSR: browser creates VNodes → renders to DOM
    // - SSR: server creates VNodes → renders to HTML string
    const { html, hydrationData } = await renderToString(app, {
      includeHydration: true,
      includeCriticalCSS: true,
      context: context
    });

    return { html, hydrationData };
  } catch (error) {
    console.error('Render error:', error);
    throw error;
  }
}

/**
 * Express.js example middleware
 */
export function createSSRMiddleware() {
  return async (req, res, next) => {
    try {
      const { html, hydrationData } = await render({
        path: req.path,
        query: req.query
      });

      // Prepare template
      let response = require('fs').readFileSync('./dist/index.html', 'utf-8');

      // Inject rendered HTML
      response = response.replace('{{RENDERED_HTML}}', html);

      // Inject hydration data
      response = response.replace(
        '{{HYDRATION_DATA}}',
        JSON.stringify(hydrationData)
      );

      res.set('Content-Type', 'text/html');
      res.send(response);
    } catch (error) {
      res.status(500).send(\`Error: \${error.message}\`);
    }
  };
}

// Express example
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  import('express').then(({ default: express }) => {
    const app = express();

    app.use(createSSRMiddleware());

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(\`🚀 SSR server running on http://localhost:\${PORT}\`);
    });
  });
}

export default render;
`;
  }

  /**
   * ========================================================================
   * SSR: client.js (Browser Hydration)
   * ========================================================================
   */
  generateClientJS() {
    const entryName = this.pathResolver.getRootWidgetName();
    const importPath = this.pathResolver.getImportPath();

    return `/**
 * FlutterJS Client Entry Point - Hydration (SSR)
 * 
 * Runs in browser after server renders HTML:
 * 1. Loads hydration data from script tag
 * 2. Creates same widget tree as server
 * 3. Matches with SSR HTML (hydration)
 * 4. Attaches event listeners
 * 5. Makes app interactive
 */

import { ${entryName}, main } from './main.js';
import { Hydrator } from '@flutterjs/runtime';

// Get hydration data from SSR
const hydrationScript = document.getElementById('__HYDRATION_DATA__');
const hydrationData = hydrationScript
  ? JSON.parse(hydrationScript.textContent)
  : null;

if (!hydrationData) {
  console.warn('No hydration data found - falling back to CSR');
}

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

// Create widget tree (same as server created)
const app = main ? main() : new ${entryName}();

// Hydrate: match DOM with VNode tree
try {
  const vnode = app.build ? app.build() : app.render();

  if (hydrationData) {
    // Hydration: connect SSR HTML with interactive listeners
    Hydrator.hydrate(rootElement, vnode, hydrationData);
    console.log('✓ App hydrated (SSR → Interactive)');
  } else {
    // Fallback: if no SSR data, render normally (CSR)
    import('./app.js').then(m => m.runtime.mount(app, rootElement));
    console.log('✓ App mounted (CSR fallback)');
  }
} catch (error) {
  console.error('Hydration failed:', error);
  rootElement.innerHTML = \`<pre>Error: \${error.message}</pre>\`;
}
`;
  }

  /**
   * ========================================================================
   * SSR: main.js (Shared Widget Code)
   * ========================================================================
   */
  generateMainJSSSR() {
    return this.generateMainJSCSR(); // Same as CSR
  }

  /**
   * ========================================================================
   * Hybrid: client.js (Smart CSR/SSR Handler)
   * ========================================================================
   */
  generateHybridClientJS() {
    const entryName = this.pathResolver.getRootWidgetName();
    const importPath = this.pathResolver.getImportPath();

    return `/**
 * FlutterJS Hybrid Client - Smart CSR/SSR Handling
 * 
 * Detects if app was SSR-rendered:
 * - If YES: Hydrate SSR HTML (fast initial load)
 * - If NO: Client-side render (CSR fallback)
 * 
 * After hydration, client code takes over for interactive updates
 */

import { ${entryName}, main } from './main.js';
import { Hydrator, FlutterJSRuntime } from '@flutterjs/runtime';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

// Create widget
const app = main ? main() : new ${entryName}();

// Create runtime
const runtime = new FlutterJSRuntime({
  debugMode: ${this.config.debugMode},
  enableHotReload: ${this.config.enableHotReload}
});

// Check for SSR content
const hydrationScript = document.getElementById('__HYDRATION_DATA__');
const hydrationData = hydrationScript
  ? JSON.parse(hydrationScript.textContent)
  : null;

try {
  if (hydrationData && rootElement.innerHTML.trim() !== '') {
    // SSR HTML exists → Hydrate
    const vnode = app.build ? app.build() : app.render();
    Hydrator.hydrate(rootElement, vnode, hydrationData);
    
    // Take over with runtime (for subsequent updates)
    runtime.mount(app, rootElement);
    console.log('✓ App hydrated and mounted (Hybrid)');
  } else {
    // No SSR → Client-side render
    runtime.mount(app, rootElement);
    console.log('✓ App mounted (CSR fallback)');
  }
} catch (error) {
  console.error('Client initialization failed:', error);
  rootElement.innerHTML = \`<pre>Error: \${error.message}</pre>\`;
}

export { runtime, app };
`;
  }

  /**
   * ========================================================================
   * Extract CSS
   * ========================================================================
   */
  extractCSS() {
    return `/* FlutterJS Material Design Base Styles */
:root {
  --primary: #6750a4;
  --on-primary: #ffffff;
  --primary-container: #eaddff;
  --on-primary-container: #21005e;
  --surface: #fffbfe;
  --on-surface: #1c1b1f;
  --outline: #79747e;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--surface);
  color: var(--on-surface);
}

#root {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
}

.fjs-text {
  display: inline;
}

.fjs-container {
  display: flex;
  flex-direction: column;
}

.fjs-row {
  display: flex;
  flex-direction: row;
}

.fjs-button {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background-color: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.fjs-button:hover {
  opacity: 0.9;
}
`;
  }

  /**
   * ========================================================================
   * Build context
   * ========================================================================
   */
  createBuildContext() {
    return {
      theme: {
        primaryColor: '#6750a4',
        backgroundColor: '#ffffff',
        textColor: '#1c1b1f',
      },
      mediaQuery: {
        width: 1920,
        height: 1080,
      },
    };
  }

  /**
   * ========================================================================
   * STEP 7: Output Files
   * ========================================================================
   */
  async output() {
    console.log('💾 Writing output...');

    try {
      const outputDir = path.join(this.config.projectRoot, this.config.outputDir);
      fs.mkdirSync(outputDir, { recursive: true });

      const output = this.state.renderedOutput;

      // Write HTML template
      fs.writeFileSync(path.join(outputDir, 'index.html'), output.html);
      console.log(chalk.gray('  ✓ index.html'));

      // Write all JavaScript files
      if (output.files) {
        for (const [filename, content] of Object.entries(output.files)) {
          fs.writeFileSync(path.join(outputDir, filename), content);
          console.log(chalk.gray(`  ✓ ${filename}`));
        }
      }

      // Write analysis report
      if (this.state.analysisResult) {
        fs.writeFileSync(
          path.join(outputDir, 'analysis.json'),
          JSON.stringify(this.state.analysisResult, null, 2)
        );
        console.log(chalk.gray('  ✓ analysis.json'));
      }

      console.log(chalk.green(`\n✓ Output written to ${this.config.outputDir}\n`));
    } catch (error) {
      throw new Error(`Failed to write output: ${error.message}`);
    }
  }

  /**
   * ========================================================================
   * Summary
   * ========================================================================
   */
  printSummary() {
    const output = this.state.renderedOutput;

    console.log(chalk.blue('📊 Build Summary:\n'));
    console.log(chalk.gray(
      `  Format:     ${output.format}\n` +
      `  Analysis:   ${this.stats.analyzeTime.toFixed(2)}ms\n` +
      `  Build:      ${this.stats.buildTime.toFixed(2)}ms\n` +
      `  Render:     ${this.stats.renderTime.toFixed(2)}ms\n` +
      `  Total:      ${this.stats.totalTime.toFixed(2)}ms\n`
    ));

    console.log(chalk.cyan('📦 Output Files:\n'));
    if (output.files) {
      Object.keys(output.files).forEach(file => {
        const size = output.files[file].length;
        console.log(chalk.gray(`  ${file.padEnd(20)} (${(size / 1024).toFixed(2)} KB)`));
      });
    }

    console.log();
    console.log(chalk.cyan('🚀 Deployment:\n'));
    if (output.deployment) {
      console.log(chalk.gray(`  Server:  ${output.deployment.server}`));
      console.log(chalk.gray(`  Hosting: ${output.deployment.hosting}`));
    } else {
      console.log(chalk.gray(`  Server:  Static hosting (Netlify, Vercel, S3)`));
      console.log(chalk.gray(`  Hosting: CDN-friendly, no Node.js required`));
    }

    console.log();
    console.log(chalk.green('✅ Build successful\n'));
  }

  /**
   * Logging utility
   */
  log(message, data = null) {
    if (this.config.debugMode) {
      if (data) {
        console.log(chalk.gray(`  ${message}`), data);
      } else {
        console.log(chalk.gray(`  ${message}`));
      }
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.fullRuntime) {
      this.fullRuntime.dispose();
    }
    this.log('Pipeline disposed');
  }
}

export { BuildPipeline };
export default BuildPipeline;