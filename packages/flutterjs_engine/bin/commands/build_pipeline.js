/**
 * ============================================================================
 * FlutterJS Build Pipeline - Unified Integration
 * ============================================================================
 * 
 * Orchestrates the complete build flow with integrated systems:
 * 1. Code Analysis (Analyzer)
 * 2. VNode Building (VNodeBuilder)
 * 3. Runtime Initialization (FlutterJSRuntime)
 * 4. Rendering (VNodeRenderer/SSRRenderer)
 * 5. Output Generation
 * 
 * Combines:
 * - analyzer.js - Code analysis pipeline
 * - runtime_index.js - VNode and rendering system
 * - flutterjs_runtime.js - Complete runtime subsystems
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Import integrated systems
import { Analyzer } from '../../src/analyzer/src/analyzer.js';
import { VNodeRuntime, renderToString } from '../../src/vdom/src/runtime_index.js';
import {RenderEngine} from "../../src/vdom/src/render_engine.js";
import {VNodeBuilder} from "../../src/vdom/src/vnode_builder.js";
import { FlutterJSRuntime, } from '../../src/runtime/src/flutterjs_runtime.js';

// ============================================================================
// BUILD PIPELINE CLASS
// ============================================================================

class BuildPipeline {
  constructor(config = {}) {
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      mode: config.mode || 'development', // development, production
      target: config.target || 'spa', // spa, ssr, hybrid, static
      entryFile: config.entryFile || 'lib/main.fjs',
      outputDir: config.outputDir || 'dist',
      debugMode: config.debugMode || false,
      enableHotReload: config.enableHotReload !== false,
      enablePerformanceMonitoring: config.enablePerformanceMonitoring !== false,
      enableMemoryTracking: config.enableMemoryTracking !== false,
      ...config,
    };

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

    this.log('Pipeline initialized with config:', this.config);
  }

  /**
   * Run complete pipeline
   */
  async run() {
    const startTime = performance.now();

    try {
      console.log(chalk.blue('\n🚀 FlutterJS Build Pipeline\n'));
      this.log(`Mode: ${this.config.mode}`);
      this.log(`Target: ${this.config.target}`);
      this.log(`Entry: ${this.config.entryFile}`);
      console.log();

      // Step 1: Load source code
      await this.loadSource();

      // Step 2: Analyze code using integrated Analyzer
      await this.analyzeCode();

      // Step 3: Build widget tree from analysis
      this.extractWidgetTree();

      // Step 4: Build VNode tree using VNodeBuilder
      await this.buildVNodeTree();

      // Step 5: Initialize runtime subsystems
      await this.initializeRuntime();

      // Step 6: Render output based on target
      await this.renderOutput();

      // Step 7: Output results to files
      await this.output();

      this.stats.totalTime = performance.now() - startTime;

      this.printSummary();

      return {
        success: true,
        output: this.state.renderedOutput,
        stats: this.stats,
        analysis: this.state.analysisResult,
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
   * STEP 1: Load source code
   */
  async loadSource() {
    const startTime = performance.now();
    console.log('📄 Loading source code...');

    try {
      const entryPath = path.join(this.config.projectRoot, this.config.entryFile);

      if (!fs.existsSync(entryPath)) {
        throw new Error(`Entry file not found: ${this.config.entryFile}`);
      }

      this.state.sourceCode = fs.readFileSync(entryPath, 'utf-8');

      this.stats.analyzeTime = performance.now() - startTime;
      console.log(chalk.green(`✓ Source loaded (${this.state.sourceCode.length} bytes)\n`));
    } catch (error) {
      throw new Error(`Failed to load source: ${error.message}`);
    }
  }

  /**
   * STEP 2: Analyze code using integrated Analyzer
   * Runs full analysis pipeline: Phase 1, 2, 3
   */
  async analyzeCode() {
    const startTime = performance.now();
    console.log('🔍 Analyzing code...');

    try {
      // Create analyzer instance with integrated logger
      this.analyzer = new Analyzer({
        sourceCode: this.state.sourceCode,
        projectRoot: this.config.projectRoot,
        verbose: this.config.debugMode,
        debugLevel: this.config.debugMode ? 'debug' : 'info',
        // Enable all analysis phases
        includeImports: true,
        includeContext: true,
        includeSsr: true,
        outputFormat: 'json',
        prettyPrint: true,
      });

      // Run complete analysis pipeline
      this.state.analysisResult = await this.analyzer.analyze();

      this.stats.analyzeTime = performance.now() - startTime;

      // Print analysis summary
      const widgets = this.state.analysisResult.widgets?.count || 0;
      const imports = this.state.analysisResult.imports?.total || 0;
      const stateful = this.state.analysisResult.widgets?.stateful || 0;

      console.log(
        chalk.green(
          `✓ Analysis complete: ${widgets} widget(s), ` +
          `${stateful} stateful, ${imports} import(s)\n`
        )
      );
    } catch (error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * STEP 3: Extract widget tree from analysis results
   */
  extractWidgetTree() {
    const logger = this.config.debugMode ? console : { log: () => { }, warn: () => { } };

    try {
      // Get root widget from analysis results
      const widgetsData = this.state.analysisResult.widgets;

      if (!widgetsData || widgetsData.count === 0) {
        throw new Error('No widgets found in analysis');
      }

      // Create widget tree object from analysis
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

      logger.log('✓ Widget tree extracted from analysis');
    } catch (error) {
      throw new Error(`Failed to extract widget tree: ${error.message}`);
    }
  }

  /**
   * STEP 4: Build VNode tree using integrated VNodeBuilder
   */
  async buildVNodeTree() {
    const startTime = performance.now();
    console.log('🎨 Building VNode tree...');

    try {
      if (!this.state.widgetTree) {
        throw new Error('Widget tree not available');
      }

      // Create build context with runtime services
      const buildContext = this.createBuildContext();

      // Use VNodeBuilder from runtime_index.js
      // VNodeBuilder.build() converts widget tree to VNode tree
      this.state.vNodeTree = VNodeBuilder.build(
        this.state.widgetTree,
        buildContext
      );

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
   * STEP 5: Initialize runtime subsystems
   * Sets up FlutterJSRuntime with all subsystems
   */
  async initializeRuntime() {
    const startTime = performance.now();
    console.log('⚙️  Initializing runtime subsystems...');

    try {
      // Create full runtime instance (flutterjs_runtime.js)
      this.fullRuntime = new FlutterJSRuntime({
        debugMode: this.config.debugMode,
        enableHotReload: this.config.enableHotReload,
        enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
        enableMemoryTracking: this.config.enableMemoryTracking,
        routing: true,
        analytics: false,
      });

      // Initialize all subsystems
      this.fullRuntime.initialize({
        rootElement: typeof window !== 'undefined' ? document.getElementById('root') : null,
      });

      // Create VNode runtime for rendering
      this.vnodeRuntime = new VNodeRuntime();

      if (this.config.debugMode) {
        console.log('✓ RuntimeEngine initialized');
        console.log('✓ EventSystem initialized');
        console.log('✓ GestureManager initialized');
        console.log('✓ FocusManager initialized');
        console.log('✓ StateManager initialized');
        console.log('✓ MemoryManager initialized');
        console.log('✓ ServiceRegistry initialized');
      }

      console.log(chalk.green(`✓ Runtime subsystems initialized\n`));
    } catch (error) {
      throw new Error(`Runtime initialization failed: ${error.message}`);
    }
  }

  /**
   * STEP 6: Render output based on target
   */
  async renderOutput() {
    const startTime = performance.now();
    console.log('🖼️  Rendering output...');

    try {
      if (!this.state.vNodeTree) {
        throw new Error('VNode tree not available');
      }

      // Render based on target using integrated renderers
      switch (this.config.target) {
        case 'spa':
          this.state.renderedOutput = this.renderSPA();
          break;

        case 'ssr':
          this.state.renderedOutput = this.renderSSR();
          break;

        case 'hybrid':
          this.state.renderedOutput = this.renderHybrid();
          break;

        case 'static':
          this.state.renderedOutput = this.renderStatic();
          break;

        default:
          throw new Error(`Unknown target: ${this.config.target}`);
      }

      this.stats.renderTime = performance.now() - startTime;
      console.log(chalk.green(`✓ Rendered for ${this.config.target.toUpperCase()}\n`));
    } catch (error) {
      throw new Error(`Render failed: ${error.message}`);
    }
  }

  /**
   * Render Single Page Application
   */
  renderSPA() {
    // Convert VNode to HTML string
    const vNodeHTML = RenderEngine.renderServer(this.state.vNodeTree);

    return {
      type: 'spa',
      html: this.wrapHTML(vNodeHTML),
      js: this.generateSPAJS(),
      css: this.extractCSS(),
    };
  }

  /**
   * Render Server-Side Rendering
   */
  renderSSR() {
    // Use integrated renderToString from runtime_index.js
    const htmlContent = renderToString(
      this.state.widgetTree,
      {
        title: 'FlutterJS App',
        includeHydration: true,
        includeCriticalCSS: true,
      }
    );

    return {
      type: 'ssr',
      html: htmlContent,
      serverJs: this.generateServerJS(),
      clientJs: this.generateHydrationJS(),
      css: this.extractCSS(),
    };
  }

  /**
   * Render Hybrid (SSR + CSR)
   */
  renderHybrid() {
    // First render as SSR
    const ssrHTML = renderToString(
      this.state.widgetTree,
      { includeHydration: true }
    );

    return {
      type: 'hybrid',
      html: ssrHTML,
      serverJs: this.generateServerJS(),
      clientJs: this.generateHybridJS(),
      css: this.extractCSS(),
    };
  }

  /**
   * Render Static Site Generation
   */
  renderStatic() {
    const vNodeHTML = RenderEngine.renderServer(this.state.vNodeTree);

    return {
      type: 'static',
      html: this.wrapHTML(vNodeHTML),
      routes: this.extractRoutes(),
      css: this.extractCSS(),
    };
  }

  /**
   * Create build context with all runtime services
   */
  createBuildContext() {
    return {
      // Theme service
      theme: {
        primaryColor: '#6750a4',
        backgroundColor: '#ffffff',
        textColor: '#1c1b1f',
      },

      // MediaQuery service
      mediaQuery: {
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      },

      // Navigator (routing)
      navigator: {
        push: (route) => console.log(`Navigate to: ${route}`),
        pop: () => console.log('Navigate back'),
      },

      // Runtime reference
      runtime: this.fullRuntime,
    };
  }

  /**
   * Wrap VNode HTML in complete HTML document
   */
  wrapHTML(content, hydrationData = null) {
    const hydrationScript = hydrationData
      ? `<script id="__HYDRATION_DATA__" type="application/json">${JSON.stringify(hydrationData)}</script>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="FlutterJS Application">
  <title>FlutterJS App</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root">${content}</div>
  ${hydrationScript}
  <script src="/app.js"></script>
</body>
</html>`;
  }

  /**
   * Generate SPA JavaScript bundle
   */
  generateSPAJS() {
    return `
// FlutterJS Runtime - SPA Mode
import { runApp, FlutterJSRuntime } from '@flutterjs/runtime';
import { MyApp } from './lib/main.fjs';

// Initialize and run app
const app = new MyApp();
runApp(app, { 
  target: '#root',
  mode: 'csr',
  enableHotReload: ${this.config.enableHotReload},
  enablePerformanceTracking: true
});

// Export for dev server
export { app };
    `.trim();
  }

  /**
   * Generate server-side JavaScript
   */
  generateServerJS() {
    return `
// FlutterJS Server-Side Rendering Entry Point
import { renderToString } from '@flutterjs/runtime';
import { MyApp } from './lib/main.fjs';

export async function render(context = {}) {
  const app = new MyApp();
  return renderToString(app, {
    title: 'FlutterJS App',
    includeHydration: true,
    includeCriticalCSS: true,
    context
  });
}

export default render;
    `.trim();
  }

  /**
   * Generate hydration JavaScript
   */
  generateHydrationJS() {
    return `
// FlutterJS Hydration Client
import { hydrate, FlutterJSRuntime } from '@flutterjs/runtime';
import { MyApp } from './lib/main.fjs';

// Get hydration data
const hydrationScript = document.getElementById('__HYDRATION_DATA__');
const hydrationData = hydrationScript 
  ? JSON.parse(hydrationScript.textContent) 
  : null;

// Create runtime and hydrate
const runtime = new FlutterJSRuntime({
  debugMode: ${this.config.debugMode},
  enableHotReload: ${this.config.enableHotReload}
});

const app = new MyApp();
runtime.runApp(app, {
  target: '#root',
  mode: 'auto',
  enableHotReload: ${this.config.enableHotReload}
});
    `.trim();
  }

  /**
   * Generate hybrid JavaScript
   */
  generateHybridJS() {
    return `
// FlutterJS Hybrid Rendering (SSR + CSR)
import { hydrate, runApp, FlutterJSRuntime } from '@flutterjs/runtime';
import { MyApp } from './lib/main.fjs';

const runtime = new FlutterJSRuntime({
  debugMode: ${this.config.debugMode},
  enableHotReload: ${this.config.enableHotReload}
});

const app = new MyApp();

// Check if SSR content exists
const hydrationScript = document.getElementById('__HYDRATION_DATA__');

if (hydrationScript) {
  // SSR content exists, hydrate it
  const hydrationData = JSON.parse(hydrationScript.textContent);
  runtime.runApp(app, {
    target: '#root',
    mode: 'auto',
    enableHotReload: ${this.config.enableHotReload}
  });
} else {
  // No SSR content, client-side render
  runtime.runApp(app, {
    target: '#root',
    mode: 'csr',
    enableHotReload: ${this.config.enableHotReload}
  });
}
    `.trim();
  }

  /**
   * Extract CSS from analysis and theme
   */
  extractCSS() {
    return `
/* FlutterJS Material Design Styles */
:root {
  --primary-color: #6750a4;
  --on-primary: #ffffff;
  --primary-container: #eaddff;
  --on-primary-container: #21005e;
  --surface: #fffbfe;
  --on-surface: #1c1b1f;
  --outline: #79747e;
  --outline-variant: #cac7cf;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--surface);
  color: var(--on-surface);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

#root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

/* Widget base styles */
.flutter-widget {
  display: flex;
  flex-direction: column;
}

.flutter-text {
  font-size: 14px;
  font-weight: 400;
}

.flutter-button {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background-color: var(--primary-color);
  color: var(--on-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.flutter-button:hover {
  opacity: 0.9;
}

.flutter-button:active {
  transform: scale(0.98);
}
    `.trim();
  }

  /**
   * Extract routes from analysis
   */
  extractRoutes() {
    const routes = this.state.analysisResult?.context?.inheritedWidgets || [];

    return [
      { path: '/', component: 'HomePage' },
      { path: '/about', component: 'AboutPage' },
      ...routes.map((route, idx) => ({
        path: `/${route.name.toLowerCase()}`,
        component: route.name,
      })),
    ];
  }

  /**
   * STEP 7: Output results to files
   */
  async output() {
    console.log('💾 Writing output...');

    try {
      const outputDir = path.join(this.config.projectRoot, this.config.outputDir);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const output = this.state.renderedOutput;

      // Write HTML
      fs.writeFileSync(path.join(outputDir, 'index.html'), output.html);

      // Write CSS
      if (output.css) {
        fs.writeFileSync(path.join(outputDir, 'styles.css'), output.css);
      }

      // Write JavaScript files
      if (output.js) {
        fs.writeFileSync(path.join(outputDir, 'app.js'), output.js);
      }

      if (output.serverJs) {
        fs.writeFileSync(path.join(outputDir, 'server.js'), output.serverJs);
      }

      if (output.clientJs) {
        fs.writeFileSync(path.join(outputDir, 'client.js'), output.clientJs);
      }

      // Write routes if applicable
      if (output.routes) {
        fs.writeFileSync(
          path.join(outputDir, 'routes.json'),
          JSON.stringify(output.routes, null, 2)
        );
      }

      // Write analysis report
      if (this.state.analysisResult.report) {
        fs.writeFileSync(
          path.join(outputDir, 'analysis.json'),
          this.state.analysisResult.report
        );
      }

      console.log(chalk.green(`✓ Output written to ${this.config.outputDir}\n`));
    } catch (error) {
      throw new Error(`Failed to write output: ${error.message}`);
    }
  }

  /**
   * Print build summary
   */
  printSummary() {
    console.log(chalk.blue('📊 Build Summary:\n'));
    console.log(
      chalk.gray(
        `  Analysis:   ${this.stats.analyzeTime.toFixed(2)}ms\n` +
        `  VNode:      ${this.stats.buildTime.toFixed(2)}ms\n` +
        `  Render:     ${this.stats.renderTime.toFixed(2)}ms\n` +
        `  Total:      ${this.stats.totalTime.toFixed(2)}ms\n`
      )
    );

    if (this.fullRuntime) {
      const runtimeStats = this.fullRuntime.getStats();
      console.log(chalk.gray(`  Init Time:  ${runtimeStats.initTime.toFixed(2)}ms\n`));
    }

    console.log(chalk.green('✅ Build successful\n'));
  }

  /**
   * Cleanup and dispose
   */
  dispose() {
    if (this.fullRuntime) {
      this.fullRuntime.dispose();
    }
    if (this.vnodeRuntime) {
      this.vnodeRuntime.destroy();
    }
    this.log('Pipeline disposed');
  }

  /**
   * Log utility
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
}

// ============================================================================
// EXPORTS
// ============================================================================

export { BuildPipeline };
export default BuildPipeline;